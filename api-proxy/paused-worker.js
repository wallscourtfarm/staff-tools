// wfa-paused — shown instead of WFA tools while they are paused.
// Switched on by adding Cloudflare Worker routes that point at this script;
// switched off by deleting those routes. Holds no data and no secrets.
const VERSION = "12.11.26a";

const PAGE = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tool paused</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
<style>
:root{--blue:#1798d3;--ink:#0a0101;--bg:#f4f8fb}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:var(--bg);color:var(--ink);font-family:Nunito,system-ui,sans-serif;padding:16px}
.card{background:#fff;max-width:520px;width:100%;border-radius:18px;padding:32px 28px;
  box-shadow:0 6px 24px rgba(10,1,1,.08);border-top:8px solid var(--blue);text-align:center}
h1{font-size:1.6rem;margin:0 0 12px;font-weight:800}
p{font-size:1.05rem;line-height:1.5;margin:0 0 10px}
.v{margin-top:22px;font-size:.8rem;color:#777}
</style></head><body>
<main class="card">
<h1>This tool is paused</h1>
<p>Wallscourt Farm Academy's online tools are paused for now.</p>
<p>No information has been lost. Everything will be back when the tools return.</p>
<p class="v">${VERSION}</p>
</main></body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const wantsJson =
      url.hostname.startsWith("api.") ||
      url.pathname.startsWith("/_api/") ||
      (request.headers.get("accept") || "").includes("application/json") &&
        !(request.headers.get("accept") || "").includes("text/html");
    const headers = { "cache-control": "no-store", "retry-after": "86400" };
    if (wantsJson) {
      return new Response(JSON.stringify({ status: "paused", message: "WFA tools are paused" }), {
        status: 503, headers: { ...headers, "content-type": "application/json" },
      });
    }
    return new Response(PAGE, {
      status: 503, headers: { ...headers, "content-type": "text/html; charset=utf-8" },
    });
  },
};
