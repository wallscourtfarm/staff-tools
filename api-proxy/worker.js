// WFA API proxy — runs on staff.wallscourt-farm-academy.co.uk/_api/*
//
// Staff pages call /_api/... on their own site instead of carrying a token in
// the page. This Worker checks the caller is logged in through Cloudflare
// Access (the CF_Authorization cookie, verified here: signature, expiry,
// issuer, and that it was issued for one of the staff tools), then forwards the
// request to the WFA API with the private hub token added.
//
// - `token` missing or "__hub__"  -> replaced with the private hub token.
// - any other `token` value       -> passed through untouched (per-tool tokens).
// - not logged in / wrong app     -> 401, never forwarded.
//
// Secrets/vars (set on the Worker, never in this repo): HUB_TOKEN, TEAM,
// AUDS (comma-separated Access app AUD tags), API_ORIGIN.

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/_api/')) return new Response('Not found', { status: 404 });
    if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
    // Forces a same-origin request: a cross-site page cannot add this header
    // without a CORS preflight, which this Worker never approves.
    if (request.headers.get('X-WFA-Proxy') !== '1') return json({ error: 'bad request' }, 400);

    let user = null;
    try {
      user = await verifyAccessJwt(cookie(request, 'CF_Authorization'), env);
    } catch (e) {
      user = null;
    }
    if (!user) return json({ error: 'sign-in expired', code: 'no_session' }, 401);

    // Lets a page ask how long the login has left, so it can warn before it lapses.
    if (url.pathname === '/_api/_session') return json({ ok: true, exp: user.exp, now: Math.floor(Date.now() / 1000) });

    const target = new URL(env.API_ORIGIN + url.pathname.slice('/_api'.length));
    url.searchParams.forEach((v, k) => target.searchParams.append(k, v));
    const t = target.searchParams.get('token');
    if (t === null || t === '' || t === '__hub__') target.searchParams.set('token', env.HUB_TOKEN);

    const headers = new Headers();
    const ct = request.headers.get('Content-Type');
    if (ct) headers.set('Content-Type', ct);
    headers.set('Accept', request.headers.get('Accept') || 'application/json');
    headers.set('X-WFA-User', user.email);

    const init = { method: request.method, headers };
    if (request.method === 'POST') init.body = await request.arrayBuffer();
    const upstream = await fetch(target.toString(), init);

    const out = new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
    out.headers.set('Cache-Control', 'no-store');
    out.headers.delete('Access-Control-Allow-Origin');
    return out;
  },
};
