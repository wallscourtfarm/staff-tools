# Writing question generators

Reasoning Papers makes printed KS2-style maths reasoning papers with no AI and no network.
Each **topic** (an agreed RTP statement or a National Curriculum topic, listed in `src/topics.json`)
has 2 to 4 **generators**. A generator makes one question with fresh numbers from a seeded random
source, draws it for the paper, draws it again with the answer in red for the mark scheme, and
checks its own answer.

Files: `src/engine.js` (registry, random, formatting, answer kit), `src/draw.js` (figures),
`src/gens/*.js` (generators, one or more files per year), `test/check.js` (self-check),
`build.py` (makes the single `index.html`). Do not edit engine.js, draw.js or app.*; put any helper
you need inside your own generator file.

## Rules for the questions (from Innes, the class teacher)

- **KS2 SATs style** (papers 2 and 3, reasoning): short plain sentences; "Write the missing number.",
  "Circle ...", "Tick ...", "Explain how you know.", "Show your method." Original questions only: never
  copy a real SATs question. UK spelling and money (£, p), metric units.
- **Pitched at the topic's year.** A Year 3 topic gets Year 3 numbers even on a Year 5 paper.
- **Variety of formats per topic**: a quick 1-mark fluency item, a reasoning item (explain, true/false,
  spot the mistake, which is greater, odd one out), and where it fits a 2-mark multi-step word problem
  with "Show your method".
- **One clear right answer** (or a clearly listed set). Avoid edge cases that make the marking unclear:
  rounding exactly halfway unless that is the point, answers of 0, numbers that make the question trivial.
- Answers are **computed**, never typed in. `check()` must verify the answer a *different* way
  (e.g. add back for a subtraction, multiply back for a division, count grid squares for an area).
- Names from `R.name()` (a mixed list). No real pupils, no pupil data.
- Things that cannot be done on paper (count aloud, build with cubes) get a paper version
  (count objects in a picture, which shape can be made from these pieces), or are left out and reported.

## Generator shape

```js
RP.add({
  id: 'Y4_011.times-100',          // '<topic id>.<short name>', unique
  topics: ['Y4_011'],              // topic ids it assesses (usually one)
  level: 1,                        // 1 quick fluency, 2 one-step reasoning, 3 multi-step / 2 marks (papers run easy to hard)
  minVariety: 8,                   // optional: lower only if the question genuinely has few versions
  make(R, ctx) {                   // R = seeded random kit; return null to ask for another try
    const n = R.int(12, 99), ans = n * 100;
    return {
      marks: 1,                    // 1 or 2 (2 = method mark given: set method: true and use A.work)
      answer: F.n(ans),            // short text/HTML for the mark scheme answer table (required)
      guide: 'Accept 4,500 or 4500.', // optional extra marking guidance
      check: () => ans / 100 === n,
      body: A => `<p>Write the missing number.</p><div class="sent c">${n} ${F.times} 100 = ${A.blank(ans, 18)}</div>`,
    };
  },
});
```

`body(A)` is called twice: `A.show` false for the paper, true for the mark scheme. Use the `A` helpers
for everything that is an answer, so the scheme shows it in red and the paper shows an empty box.

### Random kit `R`
`R.int(lo, hi)` inclusive · `R.pick(arr)` · `R.chance(p)` · `R.shuffle(arr)` · `R.sample(arr, n)` ·
`R.ints(n, lo, hi)` distinct · `R.intNot(lo, hi, notList)` · `R.name()` · `R.names(n)` · `R.f()` 0..1

### Formatting `F` (= `RP.F`)
`F.n(x, dp?)` numbers with commas from 1,000 and a proper minus sign; pass dp to fix decimal places
(`F.n(3.5, 2)` = `3.50`). Work in whole numbers (pence, tenths, mm) and divide only to display.
`F.frac(n, d)` stacked fraction · `F.mixed(w, n, d)` · `F.money(pence)` → `£3.45` (`F.money(45, true)` → `45p`) ·
`F.t24(h, m)` `F.t12(h, m)` · `F.times` `F.div` `F.minus` · `F.roman(n)` · `F.pl(k, 'apple')` · `F.gcd` `F.lcm`.

### Answer kit `A`
| helper | use |
|---|---|
| `A.box(x, {unit, pre, w, label})` | answer box at the right on its own row (`w` in mm, default 32) |
| `A.boxes([[x, after, before], ...], {w})` | several boxes in one row |
| `A.blank(x, w)` | box inside a sentence or number sentence |
| `A.line(x, w)` | answer line for a word |
| `A.tick(options, rightIdx\|[idx], {col})` | tick box(es) |
| `A.circle(options, rightIdx\|[idx])` | circle the answer(s) |
| `A.explain(exampleAnswer, lines)` | lines to explain; the scheme shows the example. Add a `guide` saying what to accept |
| `A.work(methodText, heightMm)` | "Show your method" box (2-mark questions) |
| `A.table(rows, {head, rowHead})` | table; a cell `{a: value}` is an answer cell |
| `A.match(left, right, pairs)` | draw lines to match |
| `A.part('a', html)` | (a)/(b) parts |
| `A.svg(fragment)` / `A.red(x)` | something shown only on the scheme |

Layout: put number sentences in `<div class="sent c">…</div>` (centred, large). Paragraphs in `<p>`.
The question area is about **150 mm wide**; keep a question under about **90 mm tall**.

### Drawing kit `D` (= `RP.D`), SVG in millimetres; pass `A` so answers draw in red on the scheme
- `D.numberLine({min, max, minor, major, labels:'major'|'ends'|[values], fmt, width,
  marks:[{v, box:true}|{v, text}|{v, ans:true}|{v, below:true, text}], labelBoxes:[v]}, A)`:
  `box` = arrow with an answer box above; `ans` = arrow drawn only on the scheme ("draw an arrow").
- `D.scale({max, min, major, minor, level, unit, kind:'jug'|'thermo', ansLevel, height, fmt}, A)` jug / thermometer.
- `D.grid({cols, rows, cell, axes, numbers, every, dots, polys:[{pts, label, ans}], pts:[{x, y, label, ans}],
  segs:[{a, b, ans}], mirror:{x1, y1, x2, y2}}, A)` squared or dotty grid, coordinate grid (grid units, y up).
- `D.clock({h, m, roman, ans, size}, A)` (`ans: true` = hands only on the scheme).
- `D.barChart({cats, vals, step, max, minor, ylab, xlab, title, ans:[i], width, height}, A)`.
- `D.lineGraph({xs, ys, min, max, step, minor, ylab, xlab, title})` · `D.pictogram({rows:[[label, value, ans?]], per, unit}, A)` · `D.pie({parts:[[label, value]]})`.
- `D.fractionBar({parts, shaded})` · `D.fractionCircle({parts, shaded})` · `D.rectParts({rows, cols, shaded})`.
- `D.shape({pts (mm, y down), labels:[side text], right:[vertex], ticks:[n per side], angles:[{i, text}], vlabels})`,
  `D.regular(n, r, rot)` points for a regular polygon.
- `D.angle({deg, rot, len, label})` true size, so it can be measured with a protractor.
- `D.array({rows, cols})` · `D.groups({groups, per})` · `D.partWhole({whole, parts}, A)` · `D.barModel({whole, parts, widths}, A)`
  (a value `{a: x}` is an answer) · `D.coins([pence...])` · `D.ruler({cm, from, len, mm}, A)` ·
  `D.solid('cube'|'cuboid'|'cylinder'|'cone'|'sphere'|'sqpyramid'|'tripyramid'|'triprism', size)` ·
  `D.row([fig | {fig, cap}], gapMm)` figures side by side with captions.
- Low level: `D.svg(w, h, inner)`, `D.txt(x, y, s, {size, anchor, bold, cls:'ans'})`, `D.line`, `D.poly`,
  `D.pline`, `D.box`. In SVG use class `ans` (text), `ansl` (line), `ansf` (filled), `ansp` (shape) for
  answer parts, and only add them when `A.show` is true.

## Checking

`node test/check.js Y4_` runs every generator whose id starts with `Y4_` 300 times and fails on an
exception, a failed `check()`, `NaN`/`undefined` in the HTML, unbalanced tags, a scheme that shows no
answer, a missing `answer`, or too little variety. `node test/check.js --show <id> <seed>` prints one. `node test/sheet.js Y4_` writes `test/sheet-Y4.html` (paper and scheme side by side for every generator) to look at in a browser.
Run `python3 build.py <version>` to make `index.html`, and open it to look at the paper and the scheme.
