# Reasoning Papers

Printed KS2 SATs-style maths reasoning papers (Years 3-6) with a mark scheme, made in the browser.
Teachers tick the topics they have taught (the agreed RTP statements plus the rest of the National
Curriculum, any year up to the paper's year); the page builds a paper of 10, 20 or 35 marks.
No AI, no network calls, no pupil data: every question comes from a generator with a seeded random
source and checks its own answer.

- `index.html` is BUILT: `python3 build.py <version>` joins `src/` into one page. Edit `src/`, not index.html.
- Topic lists: `src/topics.json`, rebuilt with `python3 build.py --topics <dir>` from `rtp_final.json`
  and `curriculum_extra.json` (made in ~/Desktop/claude_code/reasoning-papers by merge_statements.py,
  apply_review.py and curriculum_extra.py).
- Question generators: `src/gens/y1.js` ... `y6.js` (`y3b.js` adds to Year 3). How to write one: `src/GENERATORS.md`.
- Tests: `node test/check.js` (every generator, 300 versions each, plus whole papers) must pass before a push.
  `node test/sheet.js Y4_` writes `test/sheet-Y4.html` to look at by eye (not committed).
- `?test=Y4&seed=5&view=scheme` ticks every topic up to Y4 without saving (for print tests).
