/* Reasoning Papers: core engine.
 * Question generators register with RP.add(); a paper is a list of generated questions.
 * No AI and no network: every number is made here from a seeded random source, and every
 * generator checks its own answer (check()). See src/GENERATORS.md for how to write one.
 */
var RP = (typeof RP !== 'undefined') ? RP : {};
RP.gens = [];
RP.byTopic = {};
RP.byId = {};

/* ---------- seeded random ---------- */
RP.rng = function (seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const R = {
    f,
    int: (lo, hi) => lo + Math.floor(f() * (hi - lo + 1)),
    pick: arr => arr[Math.floor(f() * arr.length)],
    chance: p => f() < p,
    shuffle: arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
    sample: (arr, n) => R.shuffle(arr).slice(0, n),
    // whole number in [lo,hi] that is not in the list `not`
    intNot: (lo, hi, not) => { for (let k = 0; k < 200; k++) { const v = R.int(lo, hi); if (!not.includes(v)) return v; } throw new Error('intNot: no value'); },
    // distinct whole numbers
    ints: (n, lo, hi) => { const s = new Set(); let k = 0; while (s.size < n) { s.add(R.int(lo, hi)); if (++k > 5000) throw new Error('ints: range too small'); } return [...s]; },
    name: () => R.pick(RP.NAMES),
    names: n => R.sample(RP.NAMES, n),
    seed: () => Math.floor(f() * 2147483647),
  };
  return R;
};

// Mixed names, one per culture/gender spread; no real pupils.
RP.NAMES = ['Amir', 'Ben', 'Chloe', 'Dev', 'Ella', 'Femi', 'Grace', 'Hassan', 'Isla', 'Jack', 'Kemi', 'Leo',
  'Maya', 'Noah', 'Olu', 'Priya', 'Ravi', 'Sara', 'Tom', 'Uma', 'Yusuf', 'Zara', 'Ada', 'Kai', 'Lily', 'Omar',
  'Rosa', 'Sam', 'Tia', 'Wei', 'Aisha', 'Finn', 'Jamal', 'Mei', 'Nadia', 'Oscar'];

/* ---------- number formatting (SATs conventions) ---------- */
const MINUS = '−';
RP.F = {
  // whole numbers with commas from 1,000; decimals as given (pass dp to fix places)
  n(x, dp) {
    if (typeof x !== 'number' || !isFinite(x)) throw new Error('F.n: not a number: ' + x);
    const neg = x < 0; x = Math.abs(x);
    let s = (dp === undefined) ? String(+x.toFixed(10)) : x.toFixed(dp);
    let [i, d] = s.split('.');
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? MINUS : '') + i + (d ? '.' + d : '');
  },
  // fraction (stacked). n, d may be numbers or strings (e.g. an answer box)
  frac: (n, d) => `<span class="fr"><span>${n}</span><span>${d}</span></span>`,
  mixed: (w, n, d) => `<span class="mx">${w}${RP.F.frac(n, d)}</span>`,
  // money from pence: £3.45, or 45p when under £1 and short is true
  money(p, short) {
    p = Math.round(p);
    if (short && Math.abs(p) < 100) return p + 'p';
    return '£' + RP.F.n(p / 100, 2);
  },
  pounds: p => RP.F.money(p, false),
  // 24-hour digital time hh:mm
  t24: (h, m) => String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'),
  // 12-hour time with am/pm, e.g. 3:05 pm
  t12: (h, m) => ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' am' : ' pm'),
  minus: MINUS,
  times: '×',
  div: '÷',
  roman(n) {
    const r = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = ''; for (const [v, c] of r) while (n >= v) { s += c; n -= v; } return s;
  },
  // plural helper: pl(3,'apple') -> '3 apples'
  pl: (k, w, ws) => `${RP.F.n(k)} ${k === 1 ? w : (ws || w + 's')}`,
  gcd: (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; },
};
RP.F.lcm = (a, b) => a / RP.F.gcd(a, b) * b;

/* ---------- answer helpers: one set for the paper, one for the mark scheme ---------- */
RP.answerKit = function (show) {
  const F = RP.F;
  const v = x => (typeof x === 'number') ? F.n(x) : String(x);
  const red = x => show ? `<span class="av">${v(x)}</span>` : '';
  const A = {
    show,
    red,
    v,
    // An SVG fragment drawn only on the mark scheme
    svg: frag => show ? frag : '',
    // Answer box on its own row at the right: A.box(42, {unit:'cm', pre:'£', w:30})
    box(x, o = {}) {
      const w = o.w || 32;
      const pre = o.pre ? `<span class="au">${o.pre}</span>` : '';
      const unit = o.unit ? `<span class="au">${o.unit}</span>` : '';
      const lab = o.label ? `<span class="al">${o.label}</span>` : '';
      return `<div class="ar">${lab}${pre}<span class="ab" style="min-width:${w}mm">${red(x)}</span>${unit}</div>`;
    },
    // Several boxes in one row, e.g. A.boxes([[3,'tens'],[4,'ones']])
    boxes(list, o = {}) {
      return `<div class="ar">` + list.map(([x, after, before]) =>
        `${before ? `<span class="au">${before}</span>` : ''}<span class="ab" style="min-width:${o.w || 20}mm">${red(x)}</span>${after ? `<span class="au">${after}</span>` : ''}`
      ).join('<span class="gap"></span>') + `</div>`;
    },
    // Small box inside a sentence or number sentence: 24 × A.blank(3) = 72
    blank: (x, w) => `<span class="ab in" style="min-width:${w || 14}mm">${red(x)}</span>`,
    // Answer line (for words)
    line: (x, w) => `<div class="ar"><span class="aline" style="min-width:${w || 60}mm">${red(x)}</span></div>`,
    // Tick one (or more) box: A.tick(['a','b','c'], [1])
    tick(opts, right, o = {}) {
      right = [].concat(right);
      return `<div class="ticks ${o.col ? 'col' : ''}">` + opts.map((t, i) =>
        `<span class="tk"><span class="tl">${v(t)}</span><span class="tb">${show && right.includes(i) ? '<span class="av">✓</span>' : ''}</span></span>`
      ).join('') + `</div>`;
    },
    // Circle the right option(s)
    circle(opts, right, o = {}) {
      right = [].concat(right);
      return `<div class="circles">` + opts.map((t, i) =>
        `<span class="co ${show && right.includes(i) ? 'ring' : ''}">${v(t)}</span>`
      ).join('') + `</div>`;
    },
    // Lines to write an explanation; the scheme shows an example answer
    explain(example, lines = 3) {
      let s = `<div class="expl">`;
      for (let i = 0; i < lines; i++) s += `<div class="el">${i === 0 && show ? `<span class="av">${example}</span>` : ''}</div>`;
      return s + `</div>`;
    },
    // Working-out box for 2-mark questions; the scheme shows the method
    work(method, h = 38) {
      return `<div class="work" style="min-height:${h}mm"><span class="wl">Show your method</span>${show && method ? `<div class="av wm">${method}</div>` : ''}</div>`;
    },
    // Box for working, without the label (e.g. for a drawing)
    space: h => `<div class="space" style="height:${h || 20}mm"></div>`,
    // Table: rows of cells; a cell {a: value} is an answer cell
    table(rows, o = {}) {
      const cell = (c, th) => {
        const tag = th ? 'th' : 'td';
        if (c && typeof c === 'object' && 'a' in c) return `<${tag} class="tcell-a">${red(c.a)}</${tag}>`;
        return `<${tag}>${c === undefined || c === null ? '' : v(c)}</${tag}>`;
      };
      const head = o.head ? `<tr>${o.head.map(c => cell(c, true)).join('')}</tr>` : '';
      return `<table class="qt ${o.cls || ''}">${head}${rows.map(r => `<tr>${r.map((c, i) => cell(c, o.rowHead && i === 0)).join('')}</tr>`).join('')}</table>`;
    },
    // Draw lines to match: left items, right items, pairs [[li, ri], ...]
    match(left, right, pairs) {
      const W = 150, rowH = 13, n = Math.max(left.length, right.length), H = n * rowH + 4;
      const yl = i => 6 + i * rowH + (n - left.length) * rowH / 2;
      const yr = i => 6 + i * rowH + (n - right.length) * rowH / 2;
      let s = `<div class="match"><div class="mcol">` + left.map(t => `<div class="mi">${v(t)}</div>`).join('') + `</div>`;
      s += `<svg viewBox="0 0 60 ${H}" style="width:40mm;height:${H * 0.75}mm" preserveAspectRatio="none">`;
      left.forEach((_, i) => s += `<circle cx="4" cy="${yl(i) + 2}" r="1.6"/>`);
      right.forEach((_, i) => s += `<circle cx="56" cy="${yr(i) + 2}" r="1.6"/>`);
      if (show) pairs.forEach(([a, b]) => s += `<line x1="4" y1="${yl(a) + 2}" x2="56" y2="${yr(b) + 2}" class="ansl"/>`);
      s += `</svg><div class="mcol">` + right.map(t => `<div class="mi">${v(t)}</div>`).join('') + `</div></div>`;
      return s;
    },
    // Two-part question label
    part: (letter, html) => `<div class="part"><b>${letter}</b><div>${html}</div></div>`,
  };
  return A;
};

/* ---------- registry ---------- */
RP.add = function (g) {
  for (const k of ['id', 'topics', 'make']) if (!g[k]) throw new Error('generator missing ' + k + ': ' + (g.id || '?'));
  if (RP.byId[g.id]) throw new Error('duplicate generator id ' + g.id);
  g.level = g.level || 1;
  RP.gens.push(g);
  RP.byId[g.id] = g;
  for (const t of g.topics) (RP.byTopic[t] = RP.byTopic[t] || []).push(g);
};

// Make one question. Returns {gen, seed, marks, html(show), answer, guide, topic}
RP.make = function (gen, seed, ctx) {
  for (let tries = 0; tries < 40; tries++) {
    const R = RP.rng(seed + tries * 7919);
    const q = gen.make(R, ctx || {});
    if (q === null) continue;           // generator asked for another try
    if (!q.check || !q.check()) throw new Error('self-check failed: ' + gen.id + ' seed ' + seed);
    const marks = q.marks || 1;
    return {
      gen, seed: seed + tries * 7919, marks, topic: gen.topics[0],
      html: show => q.body(RP.answerKit(show)),
      answer: q.answer,     // short answer text for the mark-scheme table (optional; HTML allowed)
      guide: q.guide || '', // extra marking guidance
      method: !!q.method,   // 2-mark questions where a method mark is given
    };
  }
  throw new Error('generator kept refusing: ' + gen.id);
};

/* ---------- building a paper ---------- */
RP.LENGTHS = { short: 10, standard: 20, full: 35 };

// topics: statement ids ticked; target: marks wanted
RP.buildPaper = function (topics, target, seed, ctx) {
  const R = RP.rng(seed);
  const pool = topics.filter(t => RP.byTopic[t] && RP.byTopic[t].length);
  if (!pool.length) return [];
  const uses = {};   // generator id -> times used
  // The paper's own year comes up twice as often as earlier years' topics when both are ticked.
  if (!RP._topicYear && RP.TOPICS) { RP._topicYear = {}; for (const y in RP.TOPICS) RP.TOPICS[y].forEach(t => RP._topicYear[t.id] = y); }
  const ty = id => (RP._topicYear || {})[id];
  const cur = R.shuffle(pool.filter(t => ctx && ty(t) === ctx.year)), old = R.shuffle(pool.filter(t => !(ctx && ty(t) === ctx.year)));
  let order = [];
  if (cur.length && old.length) { for (let i = 0, j = 0; order.length < 600;) { order.push(cur[i++ % cur.length], cur[i++ % cur.length], old[j++ % old.length]); } }
  else order = cur.length ? cur : old;
  const qs = [];
  // the same question type may come up again (new numbers) only when few types are ticked
  const nGens = new Set(pool.flatMap(t => RP.byTopic[t].map(g => g.id))).size;
  const maxUse = Math.min(4, Math.max(1, Math.ceil(target / nGens / 1.3)));
  let marks = 0, step = 0;
  while (marks < target && step < 500) {
    const t = order[step % order.length];
    const round = Math.floor(step / pool.length);
    step++;
    const gens = RP.byTopic[t].filter(g => (uses[g.id] || 0) <= round);
    const cands = gens.length ? gens : RP.byTopic[t];
    const least = Math.min(...cands.map(g => uses[g.id] || 0));
    const g = R.pick(cands.filter(g => (uses[g.id] || 0) === least));
    if ((uses[g.id] || 0) >= maxUse) {
      // every generator for every ticked topic used up: stop with a shorter paper
      if (pool.every(tp => RP.byTopic[tp].every(x => (uses[x.id] || 0) >= maxUse))) break;
      continue;
    }
    let q = RP.make(g, R.seed(), ctx);
    // never the same question twice on one paper
    for (let k = 0; k < 6 && qs.some(x => x.gen === g && x.html(false) === q.html(false)); k++) q = RP.make(g, R.seed(), ctx);
    if (qs.some(x => x.gen === g && x.html(false) === q.html(false))) { uses[g.id] = maxUse; continue; }
    q.topic = t;
    // a 2-mark question would overshoot a short paper by more than 1: try a 1-mark one instead
    if (marks + q.marks > target + 1 && q.marks > 1) { uses[g.id] = (uses[g.id] || 0) + 1; continue; }
    uses[g.id] = (uses[g.id] || 0) + 1;
    qs.push(q);
    marks += q.marks;
  }
  // SATs-like order: easier first. Level, then 1-mark before 2-mark, random inside.
  const key = q => q.gen.level * 10 + q.marks + R.f() * 0.9;
  const keyed = qs.map(q => [key(q), q]).sort((a, b) => a[0] - b[0]);
  return keyed.map(x => x[1]);
};

// Replace one question with another for the same topic (a different generator if there is one)
RP.swap = function (q, seed, ctx, used) {
  const R = RP.rng(seed);
  const gens = RP.byTopic[q.topic] || [q.gen];
  const others = gens.filter(g => g !== q.gen && !(used || []).includes(g.id));
  const g = others.length ? R.pick(others) : q.gen;
  const nq = RP.make(g, R.seed(), ctx);
  nq.topic = q.topic;
  return nq;
};

if (typeof module !== 'undefined') module.exports = RP;
