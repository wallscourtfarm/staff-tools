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
