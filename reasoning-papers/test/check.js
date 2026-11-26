#!/usr/bin/env node
/* Self-check for every question generator.
 *   node test/check.js            all generators, 300 seeds each
 *   node test/check.js Y3_        only generators whose id starts with Y3_
 *   node test/check.js --show ID  print one generated question (paper and scheme HTML)
 * Fails (exit 1) on: an exception, a failed self-check, NaN/undefined/[object in the HTML,
 * unbalanced tags, no visible answer on the mark scheme, a missing answer for the answer table,
 * too little variety, or a topic id that is not in src/topics.json.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.RP = require(path.join(ROOT, 'src/engine.js'));
require(path.join(ROOT, 'src/draw.js'));
const genDir = path.join(ROOT, 'src/gens');
for (const f of fs.readdirSync(genDir).filter(f => f.endsWith('.js')).sort()) require(path.join(genDir, f));
const TOPICS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/topics.json'), 'utf8'));
RP.TOPICS = TOPICS;
const ALL = {}; Object.values(TOPICS).flat().forEach(t => ALL[t.id] = t);

const args = process.argv.slice(2);
if (args[0] === '--show') {
  const g = RP.byId[args[1]]; if (!g) { console.error('no generator ' + args[1]); process.exit(1); }
  const q = RP.make(g, +(args[2] || 1));
  console.log(q.html(false)); console.log('\n--- scheme ---\n'); console.log(q.html(true)); console.log('\nanswer:', q.answer, '\nmarks:', q.marks);
  process.exit(0);
}
const prefix = args[0] || '';
const N = 300;
let bad = 0;
const fail = (g, msg) => { bad++; console.log(`FAIL ${g.id}: ${msg}`); };
function balanced(h) {
  for (const t of ['div', 'span', 'svg', 'table', 'tr', 'td', 'th', 'p', 'b', 'text', 'tspan', 'ul', 'ol', 'li', 'sup', 'sub']) {
    const o = (h.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length, c = (h.match(new RegExp(`</${t}>`, 'g')) || []).length;
    if (o !== c) return `<${t}> opened ${o} closed ${c}`;
  }
  return null;
}
const gens = RP.gens.filter(g => g.id.startsWith(prefix));
for (const g of gens) {
  for (const t of g.topics) if (!ALL[t]) fail(g, 'unknown topic ' + t);
  const seen = new Set();
  let ok = true;
  for (let s = 1; s <= N && ok; s++) {
    let q;
    try { q = RP.make(g, s * 7 + 3); } catch (e) { fail(g, `seed ${s * 7 + 3}: ${e.message}`); ok = false; break; }
    let p, a;
    try { p = q.html(false); a = q.html(true); } catch (e) { fail(g, `render seed ${q.seed}: ${e.message}`); ok = false; break; }
    for (const [nm, h] of [['paper', p], ['scheme', a]]) {
      const m = h.match(/NaN|undefined|Infinity|\[object|null(?![a-z])/);
      if (m) { fail(g, `${nm} has "${m[0]}" (seed ${q.seed}): …${h.slice(Math.max(0, m.index - 60), m.index + 30)}…`); ok = false; }
      const b = balanced(h); if (b) { fail(g, `${nm} ${b} (seed ${q.seed})`); ok = false; }
    }
    if (q.html(false) !== p || q.html(true) !== a) { fail(g, `paper/scheme not the same each time it is drawn: random used inside body() (seed ${q.seed})`); ok = false; }
    if (p === a) { fail(g, `mark scheme shows no answer (seed ${q.seed})`); ok = false; }
    if (q.answer === undefined || q.answer === '') { fail(g, `no answer text (seed ${q.seed})`); ok = false; }
    if (![1, 2, 3].includes(q.marks)) { fail(g, 'marks ' + q.marks); ok = false; }
    if (/av">\s*<\/span>/.test(a)) { fail(g, `empty answer in scheme (seed ${q.seed})`); ok = false; }
    seen.add(p);
  }
  if (ok && seen.size < Math.min(8, g.minVariety || 8)) fail(g, `only ${seen.size} different questions in ${N}`);
}
// whole papers for each year with everything ticked
if (!prefix) for (const y of ['Y3', 'Y4', 'Y5', 'Y6']) {
  const ids = []; for (const yy of Object.keys(TOPICS)) if (yy <= y) TOPICS[yy].forEach(t => ids.push(t.id));
  for (let s = 1; s <= 20; s++) {
    try {
      const qs = RP.buildPaper(ids, RP.LENGTHS.full, s, { year: y });
      if (s === 1) { const own = qs.filter(q => TOPICS[y].some(t => t.id === q.topic)).length; console.log(`  ${y} paper: ${qs.length} questions, ${own} from ${y} topics`); }
      const m = qs.reduce((a, q) => a + q.marks, 0);
      if (qs.length && (m < 30 || m > 36)) { bad++; console.log(`FAIL paper ${y} seed ${s}: ${m} marks`); }
    } catch (e) { bad++; console.log(`FAIL paper ${y} seed ${s}: ${e.message}`); }
  }
}
const covered = Object.keys(ALL).filter(id => RP.byTopic[id]);
console.log(`${gens.length} generators checked, ${bad} problems. Topics with questions: ${covered.length} of ${Object.keys(ALL).length}.`);
for (const y of Object.keys(TOPICS)) console.log(`  ${y}: ${TOPICS[y].filter(t => RP.byTopic[t.id]).length}/${TOPICS[y].length}`);
process.exit(bad ? 1 : 0);
