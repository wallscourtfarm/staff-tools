# api-proxy

Cloudflare Worker `wfa-api-proxy`, routed at `staff.wallscourt-farm-academy.co.uk/_api/*`.

Staff pages call `/_api/...` instead of holding a token. The Worker verifies the caller's
Cloudflare Access login (CF_Authorization cookie), then forwards to the WFA API with the
private hub token. `token=__hub__` (or no token) is swapped for the real one; any other
token value passes through unchanged (per-tool tokens).

- Pages must send the header `X-WFA-Proxy: 1` (same-origin only).
- Secrets/config live on the Worker, never here: `HUB_TOKEN`, `TEAM`, `AUDS`, `API_ORIGIN`.
- An Access app "API proxy (Worker checks the login)" bypasses Access for `/_api` so the
  cookie reaches the Worker whichever tool the page belongs to.
- Deploy: see memory `project_hub_token_rotation_25_09_26` (uploaded via the Cloudflare API).

- **Changing Worker settings:** the settings PATCH (`/workers/scripts/wfa-api-proxy/settings`) REPLACES the whole
  binding list. Send every binding (plain text with its value, `HUB_TOKEN` as `{"type":"inherit"}`), or `TEAM` and
  `API_ORIGIN` are deleted and every staff tool fails (happened 28.10.26 for a few minutes; fixed by re-sending them).
  Every new Access app whose page calls `/_api` needs its AUD added to `AUDS`: see `scripts/add_3in3_unlock_to_worker.py`.
