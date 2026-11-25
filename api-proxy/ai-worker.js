// WFA AI proxy — runs on staff.wallscourt-farm-academy.co.uk/_api/ai/*
//
// Staff tools that write questions with Claude (Arithmetic Generator's
// reasoning paper, SATs Reasoning, GPS Reasoning) call POST /_api/ai/claude on
// their own site. This Worker checks the caller is signed in through
// Cloudflare Access (the CF_Authorization cookie, verified exactly as
// wfa-api-proxy does), then calls the Anthropic API with the key held here.
//
// Why it exists (25.11.26): the tools used to call app.*/api/claude
// cross-site. app.* is behind Cloudflare Access and the wfa-app access gate
// (30.10.26), so those calls were refused and the tools showed "Failed to
// fetch". Same-site calls under /_api carry the staff login with them.
//
// Request body: {system?, messages, max_tokens?}. Any `model` sent by a page is
// ignored: the model is chosen here. Reply: {ok, text, model} or {ok:false, error}.
//
// Secrets/vars (set on the Worker, never in this repo): ANTHROPIC_API_KEY,
// TEAM, AUDS (comma-separated Access app AUD tags, same list as wfa-api-proxy).

const MODEL = 'claude-opus-5-5';
const MAX_BODY_BYTES = 200 * 1024;
const CERT_TTL_MS = 60 * 60 * 1000;
let certCache = { at: 0, keys: {} };

const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function getKey(kid, team) {
  const fresh = Date.now() - certCache.at < CERT_TTL_MS;
  if (fresh && certCache.keys[kid]) return certCache.keys[kid];
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('certs unavailable');
  const { keys } = await res.json();
  const next = {};
  for (const jwk of keys) {
    next[jwk.kid] = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  }
  certCache = { at: Date.now(), keys: next };
  return next[kid] || null;
}

async function verifyAccessJwt(jwt, env) {
  const parts = (jwt || '').split('.');
  if (parts.length !== 3) return null;
  const header = JSON.parse(new TextDecoder().decode(b64u(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64u(parts[1])));
  if (header.alg !== 'RS256' || !header.kid) return null;
  const key = await getKey(header.kid, env.TEAM);
  if (!key) return null;
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return null;
  if (payload.nbf && payload.nbf > now + 60) return null;
  if (payload.iss !== `https://${env.TEAM}`) return null;
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const allowed = env.AUDS.split(',').map((s) => s.trim()).filter(Boolean);
  if (!auds.some((a) => allowed.includes(a))) return null;
  if (!payload.email) return null; // a person, not a service token
  return payload;
}

function cookie(request, name) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}

function cleanMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) return null;
  const out = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null;
    if (typeof m.content !== 'string' && !Array.isArray(m.content)) return null;
    out.push({ role: m.role, content: m.content });
  }
  // Prefill (a final assistant turn) is refused by current models.
  if (out[out.length - 1].role !== 'user') return null;
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/_api/ai/claude') return json({ ok: false, error: 'not found' }, 404);
    if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
    // Same-origin only: a cross-site page cannot add this header without a
    // CORS preflight, which this Worker never approves.
    if (request.headers.get('X-WFA-Proxy') !== '1') return json({ ok: false, error: 'bad request' }, 400);

    let user = null;
    try {
      user = await verifyAccessJwt(cookie(request, 'CF_Authorization'), env);
    } catch (e) {
      user = null;
    }
    if (!user) return json({ ok: false, error: 'You are not signed in to the staff site. Open staff.wallscourt-farm-academy.co.uk, sign in, then try again.', code: 'no_session' }, 401);

    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_BODY_BYTES) return json({ ok: false, error: 'request too large' }, 413);
    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(raw));
    } catch (e) {
      return json({ ok: false, error: 'bad request' }, 400);
    }
    const messages = cleanMessages(body.messages);
    if (!messages) return json({ ok: false, error: 'bad request' }, 400);

    const req = {
      model: MODEL,
      // Thinking counts towards max_tokens, so never below 16000.
      max_tokens: Math.min(Math.max(parseInt(body.max_tokens, 10) || 0, 16000), 32000),
      // Maths answers must be right: think it through.
      output_config: { effort: 'high' },
      fallbacks: 'default',
      messages,
    };
    if (typeof body.system === 'string' && body.system) req.system = body.system;

    let upstream;
    try {
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2026-10-21',
          'anthropic-beta': 'server-side-fallback-2026-07-01',
        },
        body: JSON.stringify(req),
      });
    } catch (e) {
      return json({ ok: false, error: 'Could not reach the AI service. Try again in a minute.' }, 502);
    }

    let data = null;
    try {
      data = await upstream.json();
    } catch (e) {
      data = null;
    }
    if (!upstream.ok || !data) {
      const status = upstream.status;
      const msg =
        status === 429 || status === 529
          ? 'The AI service is busy. Try again in a minute.'
          : 'The AI service returned an error (' + status + '). Try again, and tell Innes if it keeps happening.';
      console.log('anthropic error', status, user.email, data && data.error && data.error.type);
      return json({ ok: false, error: msg }, 502);
    }
    if (data.stop_reason === 'refusal') return json({ ok: false, error: 'The AI declined this request. Try different settings.' }, 200);

    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (data.stop_reason === 'max_tokens') return json({ ok: false, error: 'The AI ran out of room. Try fewer questions.' }, 200);
    console.log('ok', user.email, data.model, data.usage && data.usage.output_tokens);
    return json({ ok: true, text, model: data.model });
  },
};
