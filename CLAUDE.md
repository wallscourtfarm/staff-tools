# staff-tools

Staff-facing school tools for Wallscourt Farm Academy: single-page HTML tools, one folder per tool (for example `cover-plan`, `booking`, `precision-teaching`).

- Many sessions edit this repo. Stage only the files you changed.
- Before changing a tool that is live, check the version on the live page matches the local file.

## Working across devices (read first)

- **GitHub is the source of truth for this repo.** Work from the repository, not from a folder on one particular computer. Don't assume paths like `~/Library/CloudStorage` or `~/Desktop` exist.
- **Before editing:** run `git fetch`, `git log -5` and `git status`. Other Claude sessions may be editing the same repo at the same time.
- **Never commit** passwords, API keys, tokens, pupil names, UPNs or any pupil-identifying data. Remote URLs must not contain tokens.
- **Visible version number.** Every HTML tool shows a version in its footer or header: `DD.MM.YYx` (whole school) or `YN-DD.MM.YYx` (one year group). Bump it in the file on every push and state the new version when you report the push.
- **Reference data** (term dates, staff, pupils, curriculum plan) comes from the WFA database, never a Google Sheet or Apps Script.
- **Systems reference:** `docs/SYSTEM.md` in the private `wallscourtfarm/wfa-data` repo.
- **Files that aren't code** (decks, PDFs, school documents) live in OneDrive, not here.
