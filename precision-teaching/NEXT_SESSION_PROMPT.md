# Precision Teaching — next session starting prompt

Paste this whole file as your opening message in a fresh Claude Code session
to pick this tool back up.

## What this is

A Streamlit app (`precision-teaching/app.py` + `data.py`, in the `staff-tools`
repo) implementing **precision teaching**: a pupil practises a small, tightly
defined set of items (a "step" in a "skill ladder") until they hit a fluency
aim (correct-per-minute, timed), then moves to the next step. It's not
maths-specific by design — the data model already spans multiple subjects.

**Status: dormant, not linked from any live site, not deployed anywhere.**
Deliberately not surfaced in the staff hub nav or given a Cloudflare Access
app — it isn't ready for that yet (see "What's actually missing" below).
Only reachable by running it locally: `.claude/launch.json` has a
`precision-teaching` config (`streamlit run app.py --server.port 8850`);
open it with the Claude Code preview tool, or run it yourself.

## What already exists (don't rebuild this)

`data/skill-ladders.json` (in the private data repo — see below) already
has ladders across three subjects, not just times tables:

- **maths**: Number Bonds, Times Tables, Doubles & Halves, Addition Facts
- **phonics**: Phonics GPCs
- **spellings**: Common Exception Words (Y1), Common Exception Words (Y2),
  Spelling Rules (Y1/Y2/Y4)

So two of the three examples Innes gave when this came up (grapheme-phoneme
correspondences, common exception words) are **already modelled** — just
never used/tested for real, since the only real usage on record was the
Times Tables ladder with one Y4 class. "Recognising shapes" is genuinely new.

The app already has tabs for Dashboard / Pupils / Skill Ladders / Probe Entry
/ Progress / Print Grids, and "Today's Activity" already distinguishes
"Maths sheets to print" / "Phonics (adult needed)" / "Spelling checks due" —
i.e. the UI already expects multi-subject use, at least partially.

**First real task for this session: actually read `app.py` end-to-end and
work out how much of the phonics/spelling path is real vs. untested/stubbed
before assuming what needs building.** Don't take this file's word for it.

## Data & privacy (already handled, just know the shape)

Pupil data (names, per-pupil skill progress) lives in its own **private**
repo — `wallscourtfarm/precision-teaching-data` — nested inside
`precision-teaching/private-data/` as a plain git checkout with its own
`.git` (see `data.py`'s `REPO_DIR`/`_git_auth_url()`). The app's own code
stays in the public `staff-tools` repo; only the data repo is private.
This was fixed 13.09.26 (previously pupil names were committed straight
into the public repo on every use — moved out, old public history purged).

The last real cohort's data (a Y4 class practising times tables, ~24
pupils) was deliberately wiped 13.09.26 at Innes's request — stale (6+
months old, those children have moved up a year). `pupils.json` is
currently `{"pupils": []}`. `skill-ladders.json` (the reusable ladder/step
definitions, not pupil data) was left untouched.

Real first names are used in the UI ("Hi Izzy! 👋") and in git commit
messages when the app auto-saves — Innes has explicitly said this is fine
(the class-code-only `lastName` already means no real surname is stored,
and the data repo is private). Don't "fix" this without asking — it was a
deliberate decision, not an oversight.

## What's actually missing before this could go live

Not yet investigated this session — for whoever picks this up:
- Whether the phonics/spelling probe-taking flow is fully built or partial/stub.
- Whether "shape recognition" (or other non-verbal/visual skill types) fits
  the existing ladder/step/probe model or needs a new item type.
- Deployment: this has never been hosted anywhere. Decide where (Railway,
  same as wfa-data/wfa-app?) and whether it needs its own Cloudflare Access
  app once it's actually ready for staff to use for real.
- The `GITHUB_TOKEN`/Streamlit-secrets auth path in `data.py` for its git
  push — confirm it still works from wherever this ends up hosted.

## Don't do

- Don't add this to the staff hub's navigation or give it a live URL until
  the above is actually resolved — Innes was explicit that it should stay
  unlinked from live sites for now.
- Don't rebuild the multi-subject ladder structure from scratch — it exists,
  go read it first.
