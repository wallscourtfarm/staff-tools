/* Year 1 question generators (KS1 level: simple words, pictures, counting).
 * Topic ids from src/topics.json. See src/GENERATORS.md.
 * The KS1 picture helpers below are shared as RP.KS1 (y2.js uses them; files load in name order).
 */
(function () {
  const { F, D } = RP;
  const add = RP.add;
  const r2 = D.r2;

  /* ================= KS1 picture helpers ================= */
  const K = RP.KS1 = {};
  K.KINDS = ['star', 'ball', 'apple', 'flower', 'heart', 'fish'];
  K.PL = { star: 'stars', ball: 'balls', apple: 'apples', flower: 'flowers', heart: 'hearts', fish: 'fish' };
  const circ = (x, y, r, cls) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}" class="${cls}"/>`;
  K.circ = circ;

  // One simple line-art object centred on (x, y), about s mm across. Wrapped in <g class="ob"> for counting.
  K.pic = function (kind, x, y, s, cls) {
    cls = cls || 'cnt';
    const r = s / 2;
    let g = '';
    if (kind === 'star') {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
      g = D.poly(pts, cls);
    } else if (kind === 'ball') {
      g = circ(x, y, r * 0.85, cls) + `<path d="M${r2(x - r * 0.85)},${r2(y)} Q${r2(x)},${r2(y + r * 0.7)} ${r2(x + r * 0.85)},${r2(y)}"/>`;
    } else if (kind === 'apple') {
      g = circ(x, y + r * 0.12, r * 0.78, cls) + D.line(x, y - r * 0.6, x + r * 0.12, y - r, 'thin')
        + `<path d="M${r2(x + r * 0.1)},${r2(y - r * 0.75)} q${r2(r * 0.35)},${r2(-r * 0.35)} ${r2(r * 0.65)},${r2(-r * 0.1)} q${r2(-r * 0.3)},${r2(r * 0.3)} ${r2(-r * 0.65)},${r2(r * 0.1)} Z" class="${cls}"/>`;
    } else if (kind === 'flower') {
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; g += circ(x + r * 0.55 * Math.cos(a), y + r * 0.55 * Math.sin(a), r * 0.38, cls); }
      g += circ(x, y, r * 0.26, 'shaded');
    } else if (kind === 'heart') {
      g = `<path d="M${r2(x)},${r2(y + r * 0.85)} C${r2(x - r * 1.25)},${r2(y - r * 0.05)} ${r2(x - r * 0.6)},${r2(y - r * 1.05)} ${r2(x)},${r2(y - r * 0.4)} C${r2(x + r * 0.6)},${r2(y - r * 1.05)} ${r2(x + r * 1.25)},${r2(y - r * 0.05)} ${r2(x)},${r2(y + r * 0.85)} Z" class="${cls}"/>`;
    } else if (kind === 'fish') {
      g = D.poly([[x + r * 0.45, y], [x + r, y - r * 0.5], [x + r, y + r * 0.5]], cls)
        + `<ellipse cx="${r2(x - r * 0.12)}" cy="${r2(y)}" rx="${r2(r * 0.68)}" ry="${r2(r * 0.45)}" class="${cls}"/>` + circ(x - r * 0.45, y - r * 0.08, r * 0.08, 'fillk');
    } else throw new Error('pic: unknown ' + kind);
    return `<g class="ob">${g}</g>`;
  };
  // count marked things in an SVG string
  K.count = (s, cls) => (s.match(new RegExp(`class="${cls || 'ob'}"`, 'g')) || []).length;

  // n objects in rows (cols per row), or scattered on a loose grid when o.R is given.
  // o.shade: how many (from the start) are drawn shaded; o.s size; o.cols
  K.objs = function (n, kind, o = {}) {
    const s = o.s || 8, g = o.gap || s + 2.6;
    let pos;
    if (o.R) {
      const C = o.cols || 6, rows = Math.ceil(n / C) + 1;
      const cells = o.R.sample([...Array(C * rows).keys()], n).sort((a, b) => a - b);
      pos = cells.map(c => [c % C, Math.floor(c / C), (o.R.f() - 0.5) * 2.2, (o.R.f() - 0.5) * 2.2]);
    } else {
      const C = o.cols || 5;
      pos = [...Array(n).keys()].map(i => [i % C, Math.floor(i / C), 0, 0]);
    }
    const minr = Math.min(...pos.map(p => p[1]));
    pos.forEach(p => p[1] -= minr);
    const nc = Math.max(...pos.map(p => p[0])) + 1, nr = Math.max(...pos.map(p => p[1])) + 1;
    let inner = '';
    pos.forEach((p, i) => { inner += K.pic(kind, 2 + g / 2 + p[0] * g + p[2], 2 + g / 2 + p[1] * g + p[3], s, i < (o.shade || 0) ? 'shaded' : 'cnt'); });
    return D.svg(nc * g + 4, nr * g + 4, inner);
  };

  // dice face (standard dot patterns 1 to 6) as an SVG fragment at (x, y), side s
  const PIPS = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]],
    5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.27, .22], [.73, .22], [.27, .5], [.73, .5], [.27, .78], [.73, .78]] };
  K.diceAt = (n, x, y, s, frame = true) => (frame ? `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(s)}" height="${r2(s)}" rx="${r2(s * 0.15)}" class="bx"/>` : '')
    + PIPS[n].map(([a, b]) => circ(x + a * s, y + b * s, s * 0.085, 'fillk dd')).join('');
  K.dice = (n, s = 16) => D.svg(s + 2, s + 2, K.diceAt(n, 1, 1, s));
  // domino: two halves
  K.domino = (a, b, s = 15) => D.svg(2 * s + 2, s + 2, `<rect x="1" y="1" width="${2 * s}" height="${s}" rx="2" class="bx"/>` + D.line(1 + s, 2.5, 1 + s, s - 0.5) + K.diceAt(a, 1, 1, s, false) + K.diceAt(b, 1 + s, 1, s, false));

  // a card of n dots: 'dice' pattern, 'line' (a row), or 'scatter' (R needed)
  K.dotCard = function (n, how, R, s = 20) {
    let inner = `<rect x="1" y="1" width="${s}" height="${s}" rx="2" class="bx"/>`;
    if (how === 'dice') inner += K.diceAt(n, 1, 1, s, false);
    else if (how === 'line') { const g = (s - 4) / n; for (let i = 0; i < n; i++) inner += circ(3 + g / 2 + i * g, 1 + s / 2, Math.min(1.6, g * 0.3), 'fillk dd'); }
    else {
      const cells = R.sample([...Array(9).keys()], n);
      for (const c of cells) inner += circ(1 + s * (0.2 + 0.3 * (c % 3)) + (R.f() - 0.5) * 2, 1 + s * (0.2 + 0.3 * Math.floor(c / 3)) + (R.f() - 0.5) * 2, 1.6, 'fillk dd');
    }
    return D.svg(s + 2, s + 2, inner);
  };

  // ten frame with n counters (filled along the top row first)
  K.tenFrame = function (n, c = 9) {
    let s = '';
    for (let i = 0; i < 10; i++) {
      const x = 1 + (i % 5) * c, y = 1 + Math.floor(i / 5) * c;
      s += D.box(x, y, c, c);
      if (i < n) s += `<g class="ob">${circ(x + c / 2, y + c / 2, c * 0.33, 'shaded')}</g>`;
    }
    return D.svg(5 * c + 2, 2 * c + 2, s);
  };

  // tens rods and ones cubes
  K.blocks = function (t, o) {
    const u = 3.6;
    let s = '', x = 1;
    for (let i = 0; i < t; i++) {
      let r = D.box(x, 1, u, 10 * u, 'cnt');
      for (let j = 1; j < 10; j++) r += D.line(x, 1 + j * u, x + u, 1 + j * u, 'thin');
      s += `<g class="ten">${r}</g>`; x += u + 2.2;
    }
    x += 3;
    for (let j = 0; j < o; j++) s += `<g class="one">${D.box(x + (j % 2) * (u + 1.2), 1 + 10 * u - (Math.floor(j / 2) + 1) * (u + 1.2) + 1.2, u, u, 'cnt')}</g>`;
    const W = x + (o ? 2 * u + 3 : 0) + 1;
    return D.svg(Math.max(W, 10), 10 * u + 2, s);
  };

  // towers of cubes, bottoms level, labels underneath. Each cube is <g class="ob" data-t="i">
  K.towers = function (hs, labels, c = 5.5, gap = 14) {
    const top = 2, H = Math.max(...hs) * c;
    let s = '';
    hs.forEach((h, i) => {
      const x = 4 + i * (c + gap);
      for (let j = 0; j < h; j++) s += `<g class="ob" data-t="${i}">${D.box(x, top + H - (j + 1) * c, c, c, 'cnt')}</g>`;
      if (labels) s += D.txt(x + c / 2, top + H + 5, labels[i], { size: 3.6, bold: true });
    });
    return D.svg(8 + hs.length * (c + gap) - gap, top + H + (labels ? 8 : 2), s);
  };

  // 2D shapes in different orientations and proportions (same name, different look)
  const reg = (n, rot) => D.regular(n, 0.5, rot);
  K.SHAPES = {
    triangle: [[[0, 1], [1, 1], [0.5, 0.13]], [[0, 0], [0, 1], [0.8, 1]], [[0.3, 1], [0.7, 1], [0.5, 0]], [[0, 1], [1, 1], [0.85, 0.15]]],
    square: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
    rectangle: [[[0, 0], [1, 0], [1, 0.5], [0, 0.5]], [[0, 0], [0.4, 0], [0.4, 1], [0, 1]], [[0, 0], [1, 0], [1, 0.62], [0, 0.62]]],
    pentagon: [reg(5, 0), [[0, 0.4], [0.5, 0], [1, 0.4], [1, 1], [0, 1]], [[0, 0], [1, 0], [1, 0.6], [0.5, 1], [0, 0.6]]],
    hexagon: [reg(6, 0), reg(6, 30), [[0, 0.3], [0.4, 0], [1, 0], [1, 0.7], [0.6, 1], [0, 1]]],
    circle: ['circle'],
  };
  K.SIDES = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6, circle: 0 };
  // returns {svg, pts} with the shape turned and scaled into a size box
  K.shape2d = function (name, R, size = 22, rot) {
    const t = R.pick(K.SHAPES[name]);
    if (t === 'circle') return { svg: D.svg(size + 2, size + 2, circ(1 + size / 2, 1 + size / 2, size / 2 * 0.9, 'shape')), pts: [] };
    const a = (rot !== undefined ? rot : R.pick([0, 0, 20, 45, 90, 160, 200, 290])) * Math.PI / 180;
    const cx = t.reduce((s, p) => s + p[0], 0) / t.length, cy = t.reduce((s, p) => s + p[1], 0) / t.length;
    let pts = t.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), k = size / Math.max(w, h);
    pts = pts.map(([x, y]) => [1 + (x - Math.min(...xs)) * k, 1 + (y - Math.min(...ys)) * k]);
    return { svg: D.svg(w * k + 2, h * k + 2, D.poly(pts, 'shape')), pts };
  };
  K.sideLens = pts => pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });

  // an arrow pointing up (0), right (1), down (2) or left (3)
  K.arrow = (dir, s = 14) => D.svg(s + 2, s + 2, `<g transform="rotate(${dir * 90} ${1 + s / 2} ${1 + s / 2})">` +
    D.poly([[.5, .06], [.88, .45], [.63, .45], [.63, .94], [.37, .94], [.37, .45], [.12, .45]].map(([x, y]) => [1 + x * s, 1 + y * s]), 'shape') + `</g>`);

  // a figure with a letter under it (for "circle/tick the shape" questions)
  K.lab = (fig, L) => `<span style="display:inline-flex;flex-direction:column;align-items:center">${fig}<b>${L}</b></span>`;
  K.LET = ['A', 'B', 'C', 'D', 'E', 'F'];

  // numbers in words
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  K.words = n => n < 20 ? ONES[n] : n === 100 ? 'one hundred' : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  K.fromWords = w => {
    if (w === 'one hundred') return 100;
    if (ONES.includes(w)) return ONES.indexOf(w);
    const [a, b] = w.split('-');
    return TENS.indexOf(a) * 10 + (b ? ONES.indexOf(b) : 0);
  };

  // tally marks: groups of five (four lines and a line across)
  K.tally = function (n) {
    let s = '', x = 2;
    for (let g = 0; g < Math.ceil(n / 5); g++) {
      const k = Math.min(5, n - g * 5);
      for (let i = 0; i < Math.min(k, 4); i++) s += D.line(x + i * 2.2, 1.5, x + i * 2.2, 8.5, 'seg');
      if (k === 5) s += D.line(x - 1.2, 7.5, x + 3 * 2.2 + 1.2, 2.5, 'seg');
      x += 4 * 2.2 + 3.5;
    }
    return D.svg(Math.max(x, 6), 10, s);
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  K.DAYS = DAYS; K.MONTHS = MONTHS;
  const area = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  K.area = area;
  const sentList = list => list.length === 2 ? list.join(' and ') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  K.and = sentList;

  /* ================= Y1_001 recognise numbers to 10; count objects within 10 ================= */
  add({
    id: 'Y1_001.count', topics: ['Y1_001'], level: 1,
    make(R) {
      const n = R.int(3, 10), kind = R.pick(K.KINDS);
      const fig = K.objs(n, kind, R.chance(0.5) ? { R } : { cols: 5 });
      return {
        marks: 1, answer: F.n(n),
        check: () => K.count(fig) === n,
        body: A => `<p>How many ${K.PL[kind]} are there?</p>${fig}${A.box(n, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_001.which-box', topics: ['Y1_001'], level: 1,
    make(R) {
      const n = R.int(4, 10), kind = R.pick(K.KINDS);
      const others = R.sample([n - 2, n - 1, n + 1].filter(x => x >= 2 && x <= 10), 2);
      if (others.length < 2) return null;
      const ns = R.shuffle([n, ...others]);
      const figs = ns.map(k => K.objs(k, kind, { R, cols: 4, s: 6 }));
      const right = ns.indexOf(n);
      return {
        marks: 1, answer: `Group ${K.LET[right]}`,
        check: () => figs.filter(f => K.count(f) === n).length === 1 && K.count(figs[right]) === n,
        body: A => `<p>Tick the group that has <b>${K.words(n)}</b> ${K.PL[kind]}.</p>${A.tick(figs.map((f, i) => K.lab(f, K.LET[i])), right)}`,
      };
    },
  });

  /* ================= Y1_003 subitise up to 5 ================= */
  add({
    id: 'Y1_003.dice', topics: ['Y1_003'], level: 1,
    make(R) {
      const ns = [R.int(1, 5), R.int(1, 5), R.int(1, 6)];
      if (new Set(ns).size < 3) return null;
      const figs = ns.map(n => K.dice(n, 15));
      return {
        marks: 1, answer: ns.join(', '),
        guide: 'All three must be correct.',
        check: () => figs.every((f, i) => K.count(f, 'fillk dd') === ns[i]),
        body: A => `<p>Write how many dots are on each dice.</p>${A.table([figs, ns.map(n => ({ a: n }))])}`,
      };
    },
  });
  add({
    id: 'Y1_003.same', topics: ['Y1_003'], level: 2,
    make(R) {
      const n = R.int(2, 5);
      const others = R.sample([n - 1, n + 1, n + 2].filter(x => x >= 1 && x <= 6), 2);
      const [h1, h2] = R.sample(['dice', 'line', 'scatter'], 2);
      const cards = R.shuffle([[n, h1], [n, h2], [others[0], R.pick(['dice', 'scatter'])], [others[1], R.pick(['dice', 'line', 'scatter'])]]);
      const figs = cards.map(([k, h]) => K.dotCard(k, h, R));
      const right = cards.map((c, i) => c[0] === n ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: `${K.LET[right[0]]} and ${K.LET[right[1]]}`,
        check: () => right.length === 2 && K.count(figs[right[0]], 'fillk dd') === K.count(figs[right[1]], 'fillk dd') && figs.filter(f => K.count(f, 'fillk dd') === n).length === 2,
        body: A => `<p>Tick the <b>two</b> cards that have the same number of dots.</p>${A.tick(figs.map((f, i) => K.lab(f, K.LET[i])), right)}`,
      };
    },
  });

  /* ================= Y1_004 compare amounts: more, fewer, the same ================= */
  add({
    id: 'Y1_004.more', topics: ['Y1_004'], level: 1,
    make(R) {
      const [a, b] = R.ints(2, 2, 10), [n1, n2] = R.names(2), kind = R.pick(K.KINDS);
      const more = R.chance(0.5);
      const f1 = K.objs(a, kind, { cols: 10, s: 7 }), f2 = K.objs(b, kind, { cols: 10, s: 7 });
      const win = more ? (a > b ? 0 : 1) : (a < b ? 0 : 1);
      return {
        marks: 1, answer: [n1, n2][win],
        check: () => (more ? Math.max : Math.min)(K.count(f1), K.count(f2)) === [K.count(f1), K.count(f2)][win],
        body: A => `<p>${n1} and ${n2} have some ${K.PL[kind]}.</p>${A.table([[n1, f1], [n2, f2]], { rowHead: true })}<p>Who has <b>${more ? 'more' : 'fewer'}</b> ${K.PL[kind]}? Circle the name.</p>${A.circle([n1, n2], win)}`,
      };
    },
  });
  add({
    id: 'Y1_004.same', topics: ['Y1_004'], level: 2,
    make(R) {
      const a = R.int(4, 10), b = R.int(1, a - 1), kind = R.pick(K.KINDS);
      const fa = K.objs(a, kind, { cols: 5, s: 7 }), fb = K.objs(b, kind, { cols: 5, s: 7 });
      return {
        marks: 1, answer: F.n(a - b),
        check: () => K.count(fb) + (a - b) === K.count(fa),
        body: A => `${D.row([{ fig: fa, cap: 'Group A' }, { fig: fb, cap: 'Group B' }], 16)}<p>How many more ${K.PL[kind]} must go in group B so that both groups have <b>the same</b>?</p>${A.box(a - b, { w: 20 })}`,
      };
    },
  });

  /* ================= Y1_005 count in ones from any number ================= */
  add({
    id: 'Y1_005.track', topics: ['Y1_005'], level: 1,
    make(R) {
      const back = R.chance(0.35), s = back ? R.int(12, 45) : R.int(3, 40);
      const vals = [...Array(6).keys()].map(i => back ? s - i : s + i);
      const hide = R.sample([2, 3, 4, 5], 2).sort();
      return {
        marks: 1, answer: hide.map(i => vals[i]).join(', '),
        check: () => vals.every((v, i) => i === 0 || Math.abs(v - vals[i - 1]) === 1),
        body: A => `<p>${back ? 'Count back in ones.' : 'Count on in ones.'} Write the missing numbers.</p>${A.table([vals.map((v, i) => hide.includes(i) ? { a: v } : v)])}`,
      };
    },
  });
  add({
    id: 'Y1_005.missed', topics: ['Y1_005'], level: 2,
    make(R) {
      const who = R.name(), back = R.chance(0.35), s = back ? R.int(12, 40) : R.int(4, 35);
      const all = [...Array(6).keys()].map(i => back ? s - i : s + i);
      const miss = R.int(1, 4), said = all.filter((_, i) => i !== miss);
      const ans = all[miss];
      const tot = all.reduce((a, b) => a + b, 0) - said.reduce((a, b) => a + b, 0);
      return {
        marks: 1, answer: F.n(ans),
        check: () => tot === ans,
        body: A => `<p>${who} counts ${back ? 'back' : 'on'} in ones from ${s}.</p><div class="sent c">${said.join(', &nbsp;')}</div><p>${who} has missed out a number. Which number?</p>${A.box(ans, { w: 20 })}`,
      };
    },
  });

  /* ================= Y1_006 numbers to 20 on a number line; compare ================= */
  add({
    id: 'Y1_006.arrow', topics: ['Y1_006'], level: 1,
    make(R) {
      const v = R.int(1, 19);
      if (v % 5 === 0) return null;
      const labs = R.chance(0.5) ? 'major' : [0, 10, 20];
      return {
        marks: 1, answer: F.n(v),
        check: () => v > 0 && v < 20 && v % 5 !== 0,
        body: A => `<p>What number is the arrow pointing to?</p>${D.numberLine({ min: 0, max: 20, minor: 1, major: 5, labels: labs, width: 140, marks: [{ v, box: true }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y1_006.order', topics: ['Y1_006'], level: 2,
    make(R) {
      const ns = R.ints(R.pick([3, 4]), 1, 20), big = R.chance(0.4);
      const ord = ns.slice().sort((a, b) => big ? b - a : a - b);
      return {
        marks: 1, answer: ord.join(', '),
        check: () => ord.every((v, i) => ns.filter(x => big ? x > v : x < v).length === i),
        body: A => `<p>Write these numbers in order. Start with the <b>${big ? 'largest' : 'smallest'}</b>.</p><div class="sent c">${ns.join(' &nbsp;&nbsp; ')}</div>${D.numberLine({ min: 0, max: 20, minor: 1, major: 5, width: 140 }, A)}${A.boxes(ord.map(v => [v]), { w: 16 })}`,
      };
    },
  });

  /* ================= Y1_002 number facts up to 5 ================= */
  function cupPicture(v) {
    let s = '';
    for (let i = 0; i < v; i++) s += `<g class="ob">${circ(6 + i * 9, 14, 3.5, 'cnt')}</g>`;
    const x = 6 + v * 9 + 2;
    s += D.poly([[x, 20], [x + 20, 20], [x + 16.5, 3], [x + 3.5, 3]], 'shape') + D.line(x - 1, 20, x + 21, 20);
    return D.svg(x + 24, 22, s);
  }
  add({
    id: 'Y1_002.cup', topics: ['Y1_002'], level: 2,
    make(R) {
      const t = R.int(3, 5), v = R.int(1, t - 1), h = t - v;
      const fig = cupPicture(v);
      return {
        marks: 1, answer: F.n(h),
        check: () => K.count(fig) + h === t,
        body: A => `<p>There are <b>${t}</b> counters altogether.</p><p>Some are hidden under the cup.</p>${fig}<p>How many counters are under the cup?</p>${A.box(h, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_002.facts', topics: ['Y1_002'], level: 1,
    make(R) {
      const c = R.int(2, 5), a = R.int(1, c - 1), b = c - a, f = R.int(0, 3);
      const ans = [c, b, a, b][f];
      return {
        marks: 1, answer: F.n(ans),
        check: () => a + b === c && ans > 0,
        body: A => {
          const s = [`${a} + ${b} = ${A.blank(c)}`, `${a} + ${A.blank(b)} = ${c}`, `${A.blank(a)} + ${b} = ${c}`, `${c} ${F.minus} ${a} = ${A.blank(b)}`][f];
          return `<p>Write the missing number.</p><div class="sent c">${s}</div>`;
        },
      };
    },
  });

  /* ================= Y1_007 addition and subtraction facts within 10 ================= */
  add({
    id: 'Y1_007.fact', topics: ['Y1_007'], level: 1,
    make(R) {
      const c = R.int(4, 10), a = R.int(1, c - 1), b = c - a, f = R.int(0, 5);
      const ans = [c, b, a, b, a, c][f];
      return {
        marks: 1, answer: F.n(ans),
        check: () => c - b === a,
        body: A => {
          const s = [`${a} + ${b} = ${A.blank(c)}`, `${a} + ${A.blank(b)} = ${c}`, `${A.blank(a)} + ${b} = ${c}`,
            `${c} ${F.minus} ${a} = ${A.blank(b)}`, `${c} ${F.minus} ${A.blank(a)} = ${b}`, `${A.blank(c)} ${F.minus} ${a} = ${b}`][f];
          return `<p>Write the missing number.</p><div class="sent c">${s}</div>`;
        },
      };
    },
  });
  add({
    id: 'Y1_007.story', topics: ['Y1_007'], level: 2,
    make(R) {
      const who = R.name(), sub = R.chance(0.5);
      const c = R.int(5, 10), a = R.int(2, c - 2), b = c - a;
      const th = R.pick(['sweets', 'stickers', 'marbles', 'shells', 'cards']);
      const ans = sub ? b : c;
      const story = sub
        ? `<p>${who} has <b>${c}</b> ${th}.</p><p>${who} gives <b>${a}</b> ${th} to a friend.</p><p>How many ${th} does ${who} have now?</p>`
        : `<p>${who} has <b>${a}</b> ${th}.</p><p>${who} gets <b>${b}</b> more ${th}.</p><p>How many ${th} does ${who} have now?</p>`;
      return {
        marks: 1, answer: F.n(ans),
        check: () => sub ? ans + a === c : ans - b === a,
        body: A => `${story}${A.box(ans, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_007.true', topics: ['Y1_007'], level: 2,
    make(R) {
      const make1 = ok => {
        const c = R.int(3, 10), a = R.int(1, c - 1), sub = R.chance(0.5);
        const shown = ok ? (sub ? c - a : c) : (sub ? c - a + R.pick([-1, 1]) : c + R.pick([-1, 1]));
        return { s: sub ? `${c} ${F.minus} ${a} = ${shown}` : `${a} + ${c - a} = ${shown}`, ok: (sub ? c - a : c) === shown };
      };
      const items = R.shuffle([make1(true), make1(true), make1(false), make1(false)]);
      if (new Set(items.map(i => i.s)).size < 4) return null;
      const right = items.map((x, i) => x.ok ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => items[i].s).join(' and '),
        check: () => right.length === 2 && items.every(it => {
          const m = it.s.match(/(\d+) (.) (\d+) = (\d+)/); const v = m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3];
          return (v === +m[4]) === it.ok;
        }),
        body: A => `<p>Tick the <b>two</b> number sentences that are correct.</p>${A.tick(items.map(i => i.s), right, { col: true })}`,
      };
    },
  });

  /* ================= Y1_008 count in 2s, 5s and 10s; count in odd numbers ================= */
  add({
    id: 'Y1_008.seq', topics: ['Y1_008'], level: 1,
    make(R) {
      const st = R.pick([2, 5, 10]), k0 = R.int(0, 5), back = R.chance(0.2);
      let vals = [...Array(6).keys()].map(i => (k0 + i) * st);
      if (back) vals = vals.reverse();
      const hide = R.sample([2, 3, 4, 5], 2).sort();
      return {
        marks: 1, answer: hide.map(i => vals[i]).join(', '),
        check: () => vals.every((v, i) => i === 0 || Math.abs(v - vals[i - 1]) === st) && vals.every(v => v % st === 0),
        body: A => `<p>Count ${back ? 'back' : ''} in ${st}s. Write the missing numbers.</p>${A.table([vals.map((v, i) => hide.includes(i) ? { a: v } : v)])}`,
      };
    },
  });
  add({
    id: 'Y1_008.odd', topics: ['Y1_008'], level: 2,
    make(R) {
      const who = R.name(), s = R.int(0, 6) * 2 + 1, vals = [...Array(5).keys()].map(i => s + 2 * i);
      const hide = R.sample([1, 2, 3, 4], 2).sort();
      return {
        marks: 1, answer: hide.map(i => vals[i]).join(', '),
        check: () => vals.every(v => v % 2 === 1) && vals[4] - vals[0] === 8,
        body: A => `<p>${who} counts in odd numbers. Write the missing numbers.</p>${A.table([vals.map((v, i) => hide.includes(i) ? { a: v } : v)])}`,
      };
    },
  });
  add({
    id: 'Y1_008.groups', topics: ['Y1_008'], level: 1,
    make(R) {
      const per = R.pick([2, 5, 10]), k = R.int(per === 10 ? 2 : 3, per === 10 ? 5 : 8), tot = per * k;
      const fig = D.groups({ groups: k, per });
      return {
        marks: 1, answer: F.n(tot),
        check: () => K.count(fig, 'cnt') === tot,
        body: A => `<p>Count in ${per}s. How many dots are there altogether?</p>${fig}${A.box(tot, { w: 20 })}`,
      };
    },
  });

  /* ================= doubles within 10 ================= */
  const DBL = 'new_d_0feya92m_1_mwt8ysyr';
  add({
    id: DBL + '.domino', topics: [DBL], level: 1, minVariety: 6,
    make(R) {
      const d = R.int(1, 5), fig = K.domino(d, d), half = R.chance(0.4);
      return {
        marks: 1, answer: F.n(half ? d : 2 * d),
        check: () => K.count(fig, 'fillk dd') === 2 * d,
        body: A => half
          ? `<p>This domino has the same number of dots on each side.</p>${fig}<p>Write the missing number.</p><div class="sent c">double ${A.blank(d)} = ${2 * d}</div>`
          : `<p>This domino has the same number of dots on each side.</p>${fig}<p>Write the missing number.</p><div class="sent c">double ${d} = ${A.blank(2 * d)}</div>`,
      };
    },
  });
  add({
    id: DBL + '.which', topics: [DBL], level: 2,
    make(R) {
      const d = R.int(2, 5), tick = R.chance(0.5);
      if (tick) {
        // tick the sentence that is a double
        const items = R.shuffle([[d, d], [d, d + 1], [d - 1, d + 1], [d + 1, d - 1 > 0 ? d - 1 : d + 2]]);
        const opts = items.map(([a, b]) => `${a} + ${b} = ${a + b}`);
        const right = items.findIndex(([a, b]) => a === b);
        if (new Set(opts).size < 4) return null;
        return {
          marks: 1, answer: opts[right],
          check: () => items.filter(([a, b]) => a === b).length === 1,
          body: A => `<p>Tick the number sentence that is a <b>double</b>.</p>${A.tick(opts, right)}`,
        };
      }
      const opts = R.shuffle([...new Set([2 * d, d + 2 === 2 * d ? d + 3 : d + 2, d + 1, 2 * d + 1])]);
      if (opts.length < 4) return null;
      const right = opts.indexOf(2 * d);
      return {
        marks: 1, answer: F.n(2 * d),
        check: () => opts[right] / 2 === d,
        body: A => `<p>Circle the number that is <b>double ${d}</b>.</p>${A.circle(opts, right)}`,
      };
    },
  });

  /* ================= some number bonds to 10 ================= */
  const B10 = 'new_d_0feya92m_2_mwt90v9g';
  add({
    id: B10 + '.frame', topics: [B10], level: 1,
    make(R) {
      const n = R.int(1, 9), fig = K.tenFrame(n), form = R.int(0, 1);
      return {
        marks: 1, answer: F.n(10 - n),
        check: () => K.count(fig) + (10 - n) === 10,
        body: A => form
          ? `<p>How many more counters are needed to fill the ten frame?</p>${fig}${A.box(10 - n, { w: 20 })}`
          : `${fig}<p>Write the missing number.</p><div class="sent c">${n} + ${A.blank(10 - n)} = 10</div>`,
      };
    },
  });
  add({
    id: B10 + '.match', topics: [B10], level: 2,
    make(R) {
      const left = R.sample([1, 2, 3, 4, 6, 7, 8, 9], 3);
      if (left.some(a => left.includes(10 - a))) return null;
      const right = R.shuffle(left.map(a => 10 - a));
      const pairs = left.map((a, i) => [i, right.indexOf(10 - a)]);
      return {
        marks: 1, answer: left.map(a => `${a} and ${10 - a}`).join(', '),
        guide: 'All three lines must be correct.',
        check: () => pairs.every(([i, j]) => left[i] + right[j] === 10),
        body: A => `<p>Draw lines to join the pairs that make <b>10</b>.</p>${A.match(left, right, pairs)}`,
      };
    },
  });

  /* ================= odd and even numbers to 10 ================= */
  const OE = 'new_d_0feya92m_3_mwt9542n';
  add({
    id: OE + '.circle', topics: [OE], level: 1,
    make(R) {
      const ns = R.ints(5, 1, 10).sort((a, b) => a - b), even = R.chance(0.5);
      const right = ns.map((n, i) => (n % 2 === 0) === even ? i : -1).filter(i => i >= 0);
      if (right.length < 1 || right.length > 3) return null;
      return {
        marks: 1, answer: right.map(i => ns[i]).join(', '),
        check: () => right.every(i => Number.isInteger(ns[i] / 2) === even),
        body: A => `<p>Circle all the <b>${even ? 'even' : 'odd'}</b> numbers.</p>${A.circle(ns, right)}`,
      };
    },
  });
  add({
    id: OE + '.pairs', topics: [OE], level: 2,
    make(R) {
      const n = R.int(3, 10), kind = R.pick(K.KINDS);
      // drawn in pairs: two rows, so an odd number leaves one without a partner
      let s = '';
      for (let i = 0; i < n; i++) s += K.pic(kind, 6 + Math.floor(i / 2) * 11, 6 + (i % 2) * 10, 8);
      const fig = D.svg(Math.ceil(n / 2) * 11 + 2, 22, s);
      const odd = n % 2 === 1;
      return {
        marks: 1, answer: odd ? 'odd' : 'even',
        check: () => (K.count(fig) % 2 === 1) === odd,
        body: A => `<p>Here are ${n} ${K.PL[kind]} in pairs.</p>${fig}<p>Is ${n} an odd or an even number? Circle one.</p>${A.circle(['odd', 'even'], odd ? 0 : 1)}`,
      };
    },
  });

  /* ================= Y1_009 make numbers to 10 from two parts ================= */
  add({
    id: 'Y1_009.partwhole', topics: ['Y1_009'], level: 1,
    make(R) {
      const w = R.int(4, 10), a = R.int(1, w - 1), b = w - a, hide = R.int(0, 2);
      const ans = [w, a, b][hide];
      return {
        marks: 1, answer: F.n(ans),
        check: () => a + b === w,
        body: A => `<p>Write the missing number.</p>${D.partWhole({ whole: hide === 0 ? { a: w } : w, parts: [hide === 1 ? { a } : a, hide === 2 ? { a: b } : b] }, A)}`,
      };
    },
  });
  add({
    id: 'Y1_009.counters', topics: ['Y1_009'], level: 2,
    make(R) {
      const w = R.int(4, 10), g = R.int(1, w - 1), wh = w - g;
      let s = '';
      for (let i = 0; i < w; i++) s += `<g class="ob">${circ(5 + i * 9, 5, 3.6, i < g ? 'shaded' : 'cnt')}</g>`;
      const fig = D.svg(w * 9 + 2, 10, s);
      return {
        marks: 1, answer: `${g} + ${wh} = ${w}`,
        check: () => K.count(fig) === w && (fig.match(/class="shaded"/g) || []).length === g,
        body: A => `<p>There are ${w} counters. Some are grey and some are white.</p>${fig}<p>Complete the number sentence.</p><div class="sent c">${A.blank(g)} grey + ${A.blank(wh)} white = ${A.blank(w)}</div>`,
      };
    },
  });

  /* ================= Y1_010 read, write and explain number sentences ================= */
  const STORY = [
    [(a, b) => `There are ${a} ducks on a pond. ${b} more ducks come.`, (c, a) => `There are ${c} ducks on a pond. ${a} ducks fly away.`],
    [(a, b) => `${a} children are on a bus. ${b} more children get on.`, (c, a) => `${c} children are on a bus. ${a} children get off.`],
    [(a, b) => `There are ${a} cakes on a plate. Mum puts ${b} more on.`, (c, a) => `There are ${c} cakes on a plate. ${a} cakes are eaten.`],
    [(a, b) => `${a} birds sit on a fence. ${b} more birds land.`, (c, a) => `${c} birds sit on a fence. ${a} birds fly off.`],
  ];
  add({
    id: 'Y1_010.match', topics: ['Y1_010'], level: 2,
    make(R) {
      const sub = R.chance(0.5), st = R.pick(STORY);
      const c = R.int(5, 10), a = R.int(2, c - 2), b = c - a;
      let opts;
      if (sub) opts = [`${c} ${F.minus} ${a} = ${b}`, `${c} + ${a} = ${c + a}`, `${c} ${F.minus} ${a} = ${b + 1}`];
      else opts = [`${a} + ${b} = ${c}`, `${a} ${F.minus} ${b} = ${a - b}`, `${a} + ${b} = ${c + 1}`];
      if (!sub && a <= b) opts[1] = `${c} + ${b} = ${c + b}`;
      const order = R.shuffle([0, 1, 2]), shown = order.map(i => opts[i]), right = order.indexOf(0);
      return {
        marks: 1, answer: opts[0],
        check: () => (sub ? c - a === b : a + b === c) && new Set(shown).size === 3,
        body: A => `<p>${sub ? st[1](c, a) : st[0](a, b)}</p><p>Tick the number sentence that matches the story.</p>${A.tick(shown, right, { col: true })}`,
      };
    },
  });
  add({
    id: 'Y1_010.write', topics: ['Y1_010'], level: 2,
    make(R) {
      const sub = R.chance(0.5), st = R.pick(STORY);
      const c = R.int(5, 10), a = R.int(2, c - 2), b = c - a;
      const x = sub ? c : a, y = sub ? a : b, z = sub ? b : c;
      return {
        marks: 1, answer: `${x} ${sub ? F.minus : '+'} ${y} = ${z}`,
        guide: sub ? '' : `Accept ${y} + ${x} = ${z}.`,
        check: () => sub ? z + y === x : z - y === x,
        body: A => `<p>${sub ? st[1](c, a) : st[0](a, b)}</p><p>Write a number sentence to show this story.</p><div class="sent c">${A.blank(x)} ${A.blank(sub ? F.minus : '+', 10)} ${A.blank(y)} = ${A.blank(z)}</div>`,
      };
    },
  });
  add({
    id: 'Y1_010.explain', topics: ['Y1_010'], level: 2,
    make(R) {
      const who = R.name(), sub = R.chance(0.5);
      const c = R.int(5, 10), a = R.int(1, c - 1), b = c - a;
      const wrong = (sub ? b : c) + R.pick([-1, 1]);
      const s = sub ? `${c} ${F.minus} ${a} = ${wrong}` : `${a} + ${b} = ${wrong}`;
      const right = sub ? `${c} ${F.minus} ${a} = ${b}` : `${a} + ${b} = ${c}`;
      return {
        marks: 1, answer: `No. ${right}`,
        guide: `Accept any clear reason, e.g. the right answer is ${sub ? b : c}, or counting on/back shown.`,
        check: () => wrong !== (sub ? c - a : a + b),
        body: A => `<p>${who} says:</p><div class="sent c"><b>${s}</b></div><p>Is ${who} right? Explain how you know.</p>${A.explain(`No. ${right}, not ${wrong}.`, 2)}`,
      };
    },
  });

  /* ================= Y1_011 all number bonds for 10 ================= */
  add({
    id: 'Y1_011.missing', topics: ['Y1_011'], level: 1,
    make(R) {
      const k = R.int(1, 9), f = R.int(0, 4), m = 10 - k;
      return {
        marks: 1, answer: F.n(m),
        check: () => k + m === 10,
        body: A => {
          const s = [`${k} + ${A.blank(m)} = 10`, `${A.blank(m)} + ${k} = 10`, `10 ${F.minus} ${k} = ${A.blank(m)}`, `10 ${F.minus} ${A.blank(m)} = ${k}`, `10 = ${k} + ${A.blank(m)}`][f];
          return `<p>Write the missing number.</p><div class="sent c">${s}</div>`;
        },
      };
    },
  });
  add({
    id: 'Y1_011.odd-one', topics: ['Y1_011'], level: 2,
    make(R) {
      const ks = R.ints(4, 1, 9);
      const bad = R.int(0, 3), off = R.pick([-1, 1]);
      const pairs = ks.map((k, i) => [k, 10 - k + (i === bad ? off : 0)]);
      if (pairs.some(p => p[1] < 1 || p[1] > 10)) return null;
      const opts = pairs.map(([a, b]) => `${a} and ${b}`);
      return {
        marks: 1, answer: opts[bad],
        check: () => pairs.filter(([a, b]) => a + b !== 10).length === 1 && pairs[bad][0] + pairs[bad][1] !== 10,
        body: A => `<p>Three of these pairs make 10. Tick the pair that does <b>not</b> make 10.</p>${A.tick(opts, bad)}`,
      };
    },
  });

  /* ================= Y1_012 recognise 2D and 3D shapes ================= */
  add({
    id: 'Y1_012.circle2d', topics: ['Y1_012'], level: 1,
    make(R) {
      const target = R.pick(['triangle', 'square', 'rectangle', 'circle', 'pentagon', 'hexagon']);
      const pool = Object.keys(K.SHAPES).filter(n => n !== target && !(target === 'rectangle' && n === 'square'));
      const nT = target === 'circle' ? 1 : 2;
      const names = R.shuffle([...Array(nT).fill(target), ...R.sample(pool, 4 - nT)]);
      const figs = names.map(n => K.shape2d(n, R, 18));
      const right = names.map((n, i) => n === target ? i : -1).filter(i => i >= 0);
      const isT = (n, f) => target === 'circle' ? f.pts.length === 0
        : f.pts.length === K.SIDES[target] && (target === 'square' ? Math.max(...K.sideLens(f.pts)) - Math.min(...K.sideLens(f.pts)) < 1e-6
          : target === 'rectangle' ? Math.max(...K.sideLens(f.pts)) - Math.min(...K.sideLens(f.pts)) > 1 : true);
      return {
        marks: 1, answer: right.map(i => K.LET[i]).join(', '),
        guide: `All the ${target}s and nothing else.`,
        check: () => figs.every((f, i) => isT(names[i], f) === right.includes(i)),
        body: A => `<p>Circle all the <b>${target}s</b>.</p>${A.circle(figs.map((f, i) => K.lab(f.svg, K.LET[i])), right)}`,
      };
    },
  });
  const SOLID_NAMES = { cube: 'cube', cuboid: 'cuboid', cylinder: 'cylinder', cone: 'cone', sphere: 'sphere', sqpyramid: 'pyramid', tripyramid: 'pyramid' };
  add({
    id: 'Y1_012.name3d', topics: ['Y1_012'], level: 1,
    make(R) {
      const s = R.pick(Object.keys(SOLID_NAMES)), nm = SOLID_NAMES[s];
      const pool = ['cube', 'cuboid', 'cylinder', 'cone', 'sphere', 'pyramid'].filter(n => n !== nm && !(nm === 'cube' && n === 'cuboid'));
      const opts = R.shuffle([nm, ...R.sample(pool, 3)]);
      return {
        marks: 1, answer: nm,
        check: () => opts.filter(o => o === nm).length === 1,
        body: A => `<p>What is the name of this 3D shape? Circle one.</p>${D.solid(s, 26)}${A.circle(opts, opts.indexOf(nm))}`,
      };
    },
  });
  add({
    id: 'Y1_012.same-name', topics: ['Y1_012'], level: 2,
    make(R) {
      const nm = R.pick(['triangle', 'rectangle', 'hexagon', 'pentagon', 'square']), same = R.chance(0.6);
      const other = R.pick(Object.keys(K.SHAPES).filter(n => n !== nm && n !== 'circle' && !(nm === 'rectangle' && n === 'square') && !(nm === 'square' && n === 'rectangle')));
      const f1 = K.shape2d(nm, R, 20, 0), f2 = K.shape2d(same ? nm : other, R, 22, R.pick([45, 90, 160, 200]));
      const who = R.name();
      const sides = K.SIDES[nm];
      const ok = f2.pts.length === sides;
      return {
        marks: 1, answer: same ? 'Yes' : 'No',
        guide: same ? `Yes: both have ${sides} straight sides (${nm === 'square' ? 'all the same length' : 'a shape can be turned or stretched'}).` : `No: shape B has ${K.SIDES[other]} sides, so it is a ${other}.`,
        check: () => ok === same,
        body: A => `${D.row([{ fig: f1.svg, cap: 'A' }, { fig: f2.svg, cap: 'B' }], 20)}<p>${who} says, “Both of these shapes are ${nm}s.”</p><p>Is ${who} right? Circle Yes or No.</p>${A.circle(['Yes', 'No'], same ? 0 : 1)}<p>Explain how you know.</p>${A.explain(same ? `Both shapes have ${sides} sides.` : `B has ${K.SIDES[other]} sides, not ${sides}.`, 1)}`,
      };
    },
  });

  /* ================= Y1_013 make shapes from smaller shapes ================= */
  const PIECES = {
    sq: [[0, 0], [1, 0], [1, 1], [0, 1]], tri: [[0, 0], [1, 1], [0, 1]], half: [[0, 0], [1, 0], [1, 0.5], [0, 0.5]],
    rect2: [[0, 0], [2, 0], [2, 1], [0, 1]], bigtri: [[0, 0], [2, 2], [0, 2]], sq2: [[0, 0], [2, 0], [2, 2], [0, 2]],
    roof: [[0, 1], [1, 0], [2, 1]], rt12: [[0, 0], [1, 2], [0, 2]],
  };
  const SQ2 = [[0, 0], [2, 0], [2, 2], [0, 2]];
  const TARGETS = [
    { pts: [[0, 0], [2, 0], [2, 1], [0, 1]], pair: ['sq', 'sq'] },
    { pts: SQ2, pair: ['rect2', 'rect2'] },
    { pts: SQ2, pair: ['bigtri', 'bigtri'] },
    { pts: [[0, 0], [3, 0], [3, 1], [0, 1]], pair: ['sq', 'rect2'] },
    { pts: [[0, 1], [1, 0], [2, 1], [2, 3], [0, 3]], pair: ['sq2', 'roof'] },
    { pts: [[1, 0], [2, 2], [0, 2]], pair: ['rt12', 'rt12'] },
    { pts: [[0, 0], [1, 0], [1, 1], [0, 1]], pair: ['tri', 'tri'] },
    { pts: [[0, 0], [1, 0], [1, 1], [0, 1]], pair: ['half', 'half'] },
    { pts: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [0, 2]], pair: ['sq', 'rect2'] },
  ];
  const U = 8;
  const pairFig = pr => {
    let s = '', x = 1;
    const hs = pr.map(p => Math.max(...PIECES[p].map(q => q[1])));
    const H = Math.max(...hs) * U;
    pr.forEach((p, i) => {
      const pts = PIECES[p], w = Math.max(...pts.map(q => q[0]));
      s += D.poly(pts.map(([a, b]) => [x + a * U, 1 + H - hs[i] * U + b * U]), 'shape');
      x += w * U + 4;
    });
    return D.svg(x - 3, H + 2, s);
  };
  add({
    id: 'Y1_013.pieces', topics: ['Y1_013'], level: 2,
    make(R) {
      const t = R.pick(TARGETS), tA = area(t.pts), who = R.name();
      const names = Object.keys(PIECES), allPairs = [];
      for (let i = 0; i < names.length; i++) for (let j = i; j < names.length; j++) allPairs.push([names[i], names[j]]);
      const pa = pr => area(PIECES[pr[0]]) + area(PIECES[pr[1]]);
      const wrong = R.sample(allPairs.filter(pr => Math.abs(pa(pr) - tA) > 1e-9 && pa(pr) <= 6), 2);
      const opts = R.shuffle([t.pair, ...wrong]), right = opts.indexOf(t.pair);
      const w = Math.max(...t.pts.map(p => p[0])), h = Math.max(...t.pts.map(p => p[1]));
      const tf = D.svg(w * U + 2, h * U + 2, D.poly(t.pts.map(([a, b]) => [1 + a * U, 1 + b * U]), 'shape'));
      return {
        marks: 1, answer: `Pieces ${K.LET[right]}`,
        check: () => opts.filter(pr => Math.abs(pa(pr) - tA) < 1e-9).length === 1 && Math.abs(pa(opts[right]) - tA) < 1e-9,
        body: A => `<p>${who} wants to make this shape.</p>${tf}<p>Tick the two pieces that fit together to make it. You may turn the pieces.</p>${A.tick(opts.map((pr, i) => K.lab(pairFig(pr), K.LET[i])), right)}`,
      };
    },
  });
  add({
    id: 'Y1_013.count', topics: ['Y1_013'], level: 2,
    make(R) {
      const k = R.int(4, 7), cells = [[0, 0]], who = R.name(), pro = R.chance(0.5) ? 'she' : 'he';
      let guard = 0;
      while (cells.length < k && guard++ < 200) {
        const [x, y] = R.pick(cells), [dx, dy] = R.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        const nx = x + dx, ny = y + dy;
        if (nx < -3 || nx > 3 || ny < -1 || ny > 1 || cells.some(c => c[0] === nx && c[1] === ny)) continue;
        cells.push([nx, ny]);
      }
      if (cells.length < k) return null;
      const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
      const split = cells.map(() => R.chance(0.45));
      const nTriCells = split.filter(Boolean).length, sq = k - nTriCells, tri = 2 * nTriCells;
      if (!sq || !tri) return null;
      const c = 10;
      let s = '';
      cells.forEach(([x, y], i) => {
        const X = 1 + (x - mx) * c, Y = 1 + (y - my) * c;
        if (!split[i]) s += D.poly([[X, Y], [X + c, Y], [X + c, Y + c], [X, Y + c]], 'cnt');
        else if (R.chance(0.5)) s += D.poly([[X, Y], [X + c, Y], [X + c, Y + c]], 'cnt') + D.poly([[X, Y], [X + c, Y + c], [X, Y + c]], 'cnt');
        else s += D.poly([[X, Y], [X + c, Y], [X, Y + c]], 'cnt') + D.poly([[X + c, Y], [X + c, Y + c], [X, Y + c]], 'cnt');
      });
      const W = (Math.max(...cells.map(q => q[0])) - mx + 1) * c, H = (Math.max(...cells.map(q => q[1])) - my + 1) * c;
      const fig = D.svg(W + 2, H + 2, s);
      const polys = (fig.match(/points="[^"]*"/g) || []).map(p => p.split(' ').length);
      return {
        marks: 1, answer: `${sq} squares and ${tri} triangles`,
        guide: 'Both numbers must be correct.',
        check: () => polys.filter(n => n === 4).length === sq && polys.filter(n => n === 3).length === tri,
        body: A => `<p>${who} made this shape from small squares and triangles.</p>${fig}<p>How many of each did ${pro} use?</p>${A.boxes([[sq, 'squares'], [tri, 'triangles']], { w: 16 })}`,
      };
    },
  });

  /* ================= Y1_NC_01 count to and across 100 ================= */
  add({
    id: 'Y1_NC_01.track', topics: ['Y1_NC_01'], level: 1,
    make(R) {
      const back = R.chance(0.4), cross = R.pick([R.int(2, 10) * 10, 100]);
      const off = R.int(1, 4);
      const s = back ? cross + off : cross - off;
      const vals = [...Array(6).keys()].map(i => back ? s - i : s + i);
      const hide = R.sample([1, 2, 3, 4, 5], 2).sort();
      return {
        marks: 1, answer: hide.map(i => vals[i]).join(', '),
        check: () => vals.includes(cross) && vals.every((v, i) => i === 0 || Math.abs(v - vals[i - 1]) === 1),
        body: A => `<p>Count ${back ? 'back' : 'on'} in ones. Write the missing numbers.</p>${A.table([vals.map((v, i) => hide.includes(i) ? { a: v } : v)])}`,
      };
    },
  });
  add({
    id: 'Y1_NC_01.square', topics: ['Y1_NC_01'], level: 2,
    make(R) {
      const c = R.int(1, 8) * 10 + R.int(2, 9);
      const nb = [c - 10, c - 1, c + 1, c + 10], hide = R.sample([0, 1, 2, 3], 2);
      const td = (i) => hide.includes(i) ? A => `<td class="tcell-a">${A.red(nb[i])}</td>` : () => `<td>${nb[i]}</td>`;
      const e = '<td style="border:0"></td>';
      return {
        marks: 1, answer: hide.sort().map(i => nb[i]).join(' and '),
        check: () => Math.ceil((c - 1) / 10) === Math.ceil(c / 10) && Math.ceil((c + 1) / 10) === Math.ceil(c / 10) && (c + 10) % 10 === (c - 10 + 100) % 10,
        body: A => `<p>This is part of a 100 square. Write the missing numbers.</p><table class="qt"><tr>${e}${td(0)(A)}${e}</tr><tr>${td(1)(A)}<td><b>${c}</b></td>${td(2)(A)}</tr><tr>${e}${td(3)(A)}${e}</tr></table>`,
      };
    },
  });

  /* ================= Y1_NC_02 read and write numbers ================= */
  add({
    id: 'Y1_NC_02.words', topics: ['Y1_NC_02'], level: 1,
    make(R) {
      const n = R.int(3, 20), toW = R.chance(0.5), w = K.words(n);
      return {
        marks: 1, answer: toW ? w : F.n(n),
        guide: toW ? 'Spelling must be correct.' : '',
        check: () => K.fromWords(w) === n,
        body: A => toW ? `<p>Write this number in words.</p><div class="sent c"><b>${n}</b></div>${A.line(w, 60)}`
          : `<p>Write this number in numerals (digits).</p><div class="sent c"><b>${w}</b></div>${A.box(n, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_NC_02.blocks', topics: ['Y1_NC_02'], level: 1,
    make(R) {
      const t = R.int(1, 9), o = R.int(0, 9), n = 10 * t + o;
      const fig = K.blocks(t, o);
      return {
        marks: 1, answer: F.n(n),
        check: () => K.count(fig, 'ten') * 10 + K.count(fig, 'one') === n,
        body: A => `<p>Each stick is worth 10 and each cube is worth 1.</p>${fig}<p>What number is shown?</p>${A.box(n, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_NC_02.match', topics: ['Y1_NC_02'], level: 2,
    make(R) {
      const ns = R.ints(3, 2, 20), left = ns.map(K.words), right = R.shuffle(ns);
      const pairs = ns.map((n, i) => [i, right.indexOf(n)]);
      return {
        marks: 1, answer: ns.map(n => `${K.words(n)} = ${n}`).join(', '),
        guide: 'All three lines must be correct.',
        check: () => pairs.every(([i, j]) => K.fromWords(left[i]) === right[j]),
        body: A => `<p>Draw lines to match each word to its number.</p>${A.match(left, right, pairs)}`,
      };
    },
  });

  /* ================= Y1_NC_03 one more and one less ================= */
  add({
    id: 'Y1_NC_03.one', topics: ['Y1_NC_03'], level: 1,
    make(R) {
      const more = R.chance(0.5);
      const n = R.chance(0.4) ? R.int(1, 9) * 10 + (more ? 9 : 0) : R.int(5, 98);
      const ans = more ? n + 1 : n - 1;
      return {
        marks: 1, answer: F.n(ans),
        check: () => more ? ans - n === 1 : n - ans === 1,
        body: A => `<p>What is one ${more ? 'more' : 'less'} than <b>${n}</b>?</p>${A.box(ans, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_NC_03.table', topics: ['Y1_NC_03'], level: 2,
    make(R) {
      const rows = R.ints(2, 3, 98).map(n => {
        const give = R.int(0, 2), r = [n - 1, n, n + 1];
        return r.map((v, i) => i === give ? v : { a: v });
      });
      const ansList = rows.flatMap(r => r.filter(c => typeof c === 'object').map(c => c.a));
      return {
        marks: 1, answer: ansList.join(', '),
        guide: 'All four numbers must be correct.',
        check: () => rows.every(r => { const v = r.map(c => typeof c === 'object' ? c.a : c); return v[1] - v[0] === 1 && v[2] - v[1] === 1; }),
        body: A => `<p>Complete the table.</p>${A.table(rows, { head: ['1 less', 'Number', '1 more'] })}`,
      };
    },
  });

  /* ================= Y1_NC_04 equal to, more than, less than, most, least ================= */
  add({
    id: 'Y1_NC_04.towers', topics: ['Y1_NC_04'], level: 1,
    make(R) {
      const hs = R.ints(3, 2, 10), names = R.names(3), most = R.chance(0.5);
      const fig = K.towers(hs, names);
      const win = hs.indexOf(most ? Math.max(...hs) : Math.min(...hs));
      const cnt = i => (fig.match(new RegExp(`data-t="${i}"`, 'g')) || []).length;
      return {
        marks: 1, answer: names[win],
        check: () => [0, 1, 2].every(i => i === win || (most ? cnt(i) < cnt(win) : cnt(i) > cnt(win))),
        body: A => `<p>Three children make towers of cubes.</p>${fig}<p>Whose tower has the <b>${most ? 'most' : 'fewest'}</b> cubes? Circle the name.</p>${A.circle(names, win)}`,
      };
    },
  });
  add({
    id: 'Y1_NC_04.words', topics: ['Y1_NC_04'], level: 2,
    make(R) {
      const f = R.int(0, 2);
      let lhs, l, r;
      if (f === 2) { const a = R.int(1, 9), b = R.int(1, 9); l = a + b; r = R.chance(0.4) ? l : R.intNot(2, 18, [l]); lhs = `${a} + ${b}`; }
      else { [l, r] = R.ints(2, 1, 20); lhs = String(l); }
      const opts = ['more than', 'less than', 'equal to'];
      const right = l > r ? 0 : l < r ? 1 : 2;
      return {
        marks: 1, answer: opts[right],
        check: () => Math.sign(l - r) === [1, -1, 0][right],
        body: A => `<p>Circle the words that make this sentence correct.</p><div class="sent c"><b>${lhs}</b> &nbsp;is&nbsp; ${A.circle(opts, right)} <b>${r}</b></div>`,
      };
    },
  });

  /* ================= Y1_NC_05 one-step multiplication and division with pictures ================= */
  add({
    id: 'Y1_NC_05.groups', topics: ['Y1_NC_05'], level: 1,
    make(R) {
      const per = R.pick([2, 3, 4, 5, 10]), k = R.int(2, per === 10 ? 3 : 5), tot = per * k;
      const fig = D.groups({ groups: k, per });
      const th = R.pick([['plates', 'cakes'], ['bags', 'sweets'], ['boxes', 'pens'], ['nests', 'eggs']]);
      return {
        marks: 1, answer: F.n(tot),
        check: () => K.count(fig, 'cnt') === tot,
        body: A => `<p>There are ${k} ${th[0]}. Each has ${per} ${th[1]}.</p>${fig}<p>How many ${th[1]} are there altogether?</p>${A.box(tot, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_NC_05.share', topics: ['Y1_NC_05'], level: 2,
    make(R) {
      const k = R.int(2, 4), p = R.int(2, 5), n = k * p, kind = R.pick(K.KINDS), who = R.name();
      const things = K.objs(n, kind, { cols: n > 10 ? 10 : n, s: 6.5 });
      let pl = '';
      for (let i = 0; i < k; i++) pl += `<ellipse cx="${14 + i * 30}" cy="9" rx="13" ry="7" class="cnt"/><ellipse cx="${14 + i * 30}" cy="9" rx="9" ry="4.5" class="grp"/>`;
      const plates = D.svg(k * 30, 18, pl);
      return {
        marks: 1, answer: F.n(p),
        check: () => p * k === K.count(things),
        body: A => `<p>${who} shares these ${n} ${K.PL[kind]} equally onto ${k} plates.</p>${things}${plates}<p>How many ${K.PL[kind]} go on each plate?</p>${A.box(p, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_NC_05.array', topics: ['Y1_NC_05'], level: 1,
    make(R) {
      const rows = R.int(2, 4), cols = R.pick([2, 3, 4, 5, 10]), tot = rows * cols;
      const fig = D.array({ rows, cols, gap: 7 });
      return {
        marks: 1, answer: F.n(tot),
        check: () => K.count(fig, 'cnt') === tot,
        body: A => `<p>There are ${rows} rows of ${cols} counters.</p>${fig}<p>How many counters are there altogether?</p>${A.box(tot, { w: 20 })}`,
      };
    },
  });

  /* ================= Y1_NC_06 a half and a quarter ================= */
  // rectangle split into strips of the given widths (fractions of the whole), one strip shaded
  K.strips = function (ws, shadeIdx, vertical, W = 26, H = 16) {
    if (vertical) [W, H] = [H, W];
    let s = '', p = 0;
    ws.forEach((w, i) => {
      const cls = [].concat(shadeIdx).includes(i) ? 'shaded' : 'bx';
      s += vertical ? D.box(1, 1 + p * H, W, w * H, cls) : D.box(1 + p * W, 1, w * W, H, cls);
      p += w;
    });
    return D.svg(W + 2, H + 2, s);
  };
  const diagHalf = () => D.svg(20, 20, D.poly([[1, 1], [19, 1], [19, 19]], 'shaded') + D.poly([[1, 1], [19, 19], [1, 19]], 'bx'));
  add({
    id: 'Y1_NC_06.shapes', topics: ['Y1_NC_06'], level: 2,
    make(R) {
      const half = R.chance(0.55), tgt = half ? 0.5 : 0.25;
      const v = () => R.chance(0.4);
      const good = half
        ? [() => ({ svg: K.strips([0.5, 0.5], R.int(0, 1), v()), f: 0.5 }), () => ({ svg: D.fractionCircle({ parts: 2, shaded: 1 }), f: 0.5 }), () => ({ svg: diagHalf(), f: 0.5 })]
        : [() => ({ svg: K.strips([0.25, 0.25, 0.25, 0.25], R.int(0, 3), v()), f: 0.25 }), () => ({ svg: D.rectParts({ rows: 2, cols: 2, shaded: [R.int(0, 3)], cell: 9 }), f: 0.25 }), () => ({ svg: D.fractionCircle({ parts: 4, shaded: 1 }), f: 0.25 })];
      const bad = half
        ? [() => { const w = R.pick([[0.3, 0.7], [0.7, 0.3], [0.35, 0.65]]), i = R.int(0, 1); return { svg: K.strips(w, i, v()), f: w[i] }; },
          () => ({ svg: K.strips([0.25, 0.25, 0.25, 0.25], R.int(0, 3), v()), f: 0.25 }),
          () => ({ svg: K.strips([1 / 3, 1 / 3, 1 / 3], R.int(0, 2), v()), f: 1 / 3 })]
        : [() => { const w = R.shuffle([0.1, 0.2, 0.3, 0.4]), i = R.int(0, 3); return { svg: K.strips(w, i, v()), f: w[i] }; },
          () => ({ svg: K.strips([0.5, 0.5], R.int(0, 1), v()), f: 0.5 }),
          () => ({ svg: K.strips([1 / 3, 1 / 3, 1 / 3], R.int(0, 2), v()), f: 1 / 3 })];
      const nGood = R.int(1, 2);
      const items = R.shuffle([...R.sample(good, nGood).map(g => g()), ...R.sample(bad, 4 - nGood).map(b => b())]);
      const right = items.map((it, i) => Math.abs(it.f - tgt) < 1e-9 ? i : -1).filter(i => i >= 0);
      const shadedCount = items.map(it => (it.svg.match(/class="shaded"/g) || []).length);
      return {
        marks: 1, answer: right.map(i => K.LET[i]).join(' and '),
        guide: `Tick only the shape${nGood > 1 ? 's' : ''} with ${half ? 'a half' : 'a quarter'} shaded (equal parts).`,
        check: () => right.length === nGood && shadedCount.every(c => c === 1),
        body: A => `<p>Tick the shape${nGood > 1 ? 's' : ''} that ${nGood > 1 ? 'have' : 'has'} <b>${half ? 'one half' : 'one quarter'}</b> shaded.</p><p>(${nGood > 1 ? `There are ${nGood}.` : 'There is 1.'})</p>${A.tick(items.map((it, i) => K.lab(it.svg, K.LET[i])), right)}`,
      };
    },
  });
  add({
    id: 'Y1_NC_06.amount', topics: ['Y1_NC_06'], level: 1,
    make(R) {
      const half = R.chance(0.6), d = half ? 2 : 4, k = R.int(2, half ? 8 : 4), n = d * k, kind = R.pick(K.KINDS);
      const fig = K.objs(n, kind, { cols: half ? (n > 10 ? 8 : n) : 4, s: 6.5 });
      return {
        marks: 1, answer: F.n(k),
        check: () => K.count(fig) === k * d,
        body: A => `<p>Here are ${n} ${K.PL[kind]}.</p>${fig}<p>What is <b>${half ? 'half' : 'a quarter'}</b> of ${n}?</p>${A.box(k, { w: 20 })}`,
      };
    },
  });

  /* ================= Y1_NC_07 compare lengths, heights, mass, capacity ================= */
  add({
    id: 'Y1_NC_07.pencils', topics: ['Y1_NC_07'], level: 1,
    make(R) {
      const n = R.pick([3, 4]), lens = R.ints(n, 5, 14).map(x => x * 8), long = R.chance(0.5);
      let s = '';
      lens.forEach((L, i) => {
        const y = 3 + i * 10;
        s += D.txt(4, y + 3.6, K.LET[i], { size: 4, bold: true }) + `<rect x="10" y="${y}" width="${L - 6}" height="5" class="obj"/>` + D.poly([[10 + L - 6, y], [10 + L, y + 2.5], [10 + L - 6, y + 5]], 'cnt');
      });
      const fig = D.svg(130, n * 10 + 4, s);
      const win = lens.indexOf(long ? Math.max(...lens) : Math.min(...lens));
      return {
        marks: 1, answer: K.LET[win],
        check: () => lens.every((L, i) => i === win || (long ? L < lens[win] : L > lens[win])),
        body: A => `<p>Here are some pencils.</p>${fig}<p>Which pencil is the <b>${long ? 'longest' : 'shortest'}</b>? Circle the letter.</p>${A.circle(K.LET.slice(0, n), win)}`,
      };
    },
  });
  const THINGS = ['feather', 'leaf', 'pencil', 'apple', 'book', 'shoe', 'brick'];
  function balance(l, r, leftDown) {
    const cx = 55, cy = 26, L = 38, t = 0.14 * (leftDown ? 1 : -1);
    const ex = [cx - L * Math.cos(t), cx + L * Math.cos(t)], ey = [cy + L * Math.sin(t), cy - L * Math.sin(t)];
    let s = D.poly([[cx, cy], [cx - 7, 48], [cx + 7, 48]], 'shape') + D.line(cx - L * Math.cos(t), ey[0], cx + L * Math.cos(t), ey[1], 'seg');
    [l, r].forEach((w, i) => {
      const x = ex[i], py = ey[i] + 12;
      s += D.line(x, ey[i], x - 11, py) + D.line(x, ey[i], x + 11, py) + D.line(x - 12, py, x + 12, py, 'seg');
      s += D.box(x - 10, py - 8, 20, 8, 'cnt') + D.txt(x, py - 2.6, w, { size: 3.4 });
    });
    return D.svg(110, 50, s);
  }
  add({
    id: 'Y1_NC_07.balance', topics: ['Y1_NC_07'], level: 2,
    make(R) {
      const [i, j] = R.ints(2, 0, THINGS.length - 1), left = R.chance(0.5);
      const [l, r] = left ? [THINGS[i], THINGS[j]] : [THINGS[j], THINGS[i]];
      const heavy = THINGS[Math.max(i, j)], light = THINGS[Math.min(i, j)];
      const leftDown = THINGS.indexOf(l) > THINGS.indexOf(r);
      const askHeavy = R.chance(0.6);
      const ans = askHeavy ? heavy : light;
      return {
        marks: 1, answer: `the ${ans}`,
        check: () => (leftDown ? l : r) === heavy,
        body: A => `<p>Look at the balance.</p>${balance(l, r, leftDown)}<p>Which is <b>${askHeavy ? 'heavier' : 'lighter'}</b>? Circle one.</p>${A.circle([l, r], [l, r].indexOf(ans))}`,
      };
    },
  });
  const LEVELS = [[0, 'empty'], [1, 'full'], [0.5, 'half full'], [0.85, 'nearly full'], [0.15, 'nearly empty']];
  add({
    id: 'Y1_NC_07.jugs', topics: ['Y1_NC_07'], level: 1,
    make(R) {
      const set = R.sample(LEVELS, 4), tgt = R.pick(set);
      const fig = lv => { const H = 26, W = 16; return D.svg(W + 4, H + 4, (lv ? D.box(2, 2 + H * (1 - lv), W, H * lv, 'liq') : '') + D.pline([[2, 1], [2, 2 + H], [2 + W, 2 + H], [2 + W, 1]], 'glassl')); };
      const right = set.indexOf(tgt);
      return {
        marks: 1, answer: K.LET[right],
        check: () => set.filter(s => s[0] === tgt[0]).length === 1,
        body: A => `<p>Tick the glass that is <b>${tgt[1]}</b>.</p>${A.tick(set.map((s, i) => K.lab(fig(s[0]), K.LET[i])), right)}`,
      };
    },
  });

  /* ================= Y1_NC_08 measure with non-standard and standard units ================= */
  add({
    id: 'Y1_NC_08.cubes', topics: ['Y1_NC_08'], level: 1,
    make(R) {
      const k = R.int(3, 12), c = 8, L = k * c;
      const thing = R.pick(['pencil', 'crayon', 'straw']), who = R.name();
      let s = `<rect x="2" y="2" width="${L - 6}" height="5" class="obj"/>` + D.poly([[2 + L - 6, 2], [2 + L, 4.5], [2 + L - 6, 7]], 'cnt');
      for (let i = 0; i < k; i++) s += `<g class="ob">${D.box(2 + i * c, 10, c, c, 'cnt')}</g>`;
      const fig = D.svg(L + 6, 20, s);
      return {
        marks: 1, answer: `${k} cubes`,
        check: () => K.count(fig) * c === L,
        body: A => `<p>${who} measures a ${thing} with cubes.</p>${fig}<p>How many cubes long is the ${thing}?</p>${A.box(k, { unit: 'cubes', w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_NC_08.ruler', topics: ['Y1_NC_08'], level: 2,
    make(R) {
      const len = R.int(2, 11), thing = R.pick(['ribbon', 'worm', 'stick', 'crayon']);
      return {
        marks: 1, answer: `${len} cm`,
        check: () => len >= 2 && len <= 12,
        body: A => `<p>How long is the ${thing}?</p>${D.ruler({ cm: 12, from: 0, len }, A)}${A.box(len, { unit: 'cm', w: 20 })}`,
      };
    },
  });

  /* ================= Y1_NC_09 coins and notes ================= */
  const coinSum = fig => (fig.match(/>(\d+)p</g) || []).reduce((a, m) => a + +m.slice(1, -2), 0) + (fig.match(/>£(\d+)</g) || []).reduce((a, m) => a + 100 * +m.slice(2, -1), 0);
  K.coinSum = coinSum;
  add({
    id: 'Y1_NC_09.total', topics: ['Y1_NC_09'], level: 1,
    make(R) {
      const k = R.int(2, 4), cs = [...Array(k)].map(() => R.pick([1, 2, 5, 10, 10, 5, 2, 20])).sort((a, b) => b - a);
      const tot = cs.reduce((a, b) => a + b, 0);
      if (tot > 30) return null;
      const fig = D.coins(cs);
      return {
        marks: 1, answer: tot + 'p',
        check: () => coinSum(fig) === tot,
        body: A => `<p>How much money is there altogether?</p>${fig}${A.box(tot, { unit: 'p', w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y1_NC_09.most', topics: ['Y1_NC_09'], level: 2,
    make(R) {
      const names = R.names(3), sets = names.map(() => [...Array(R.int(1, 3))].map(() => R.pick([1, 2, 5, 10, 20])).sort((a, b) => b - a));
      const tots = sets.map(s => s.reduce((a, b) => a + b, 0)), most = R.chance(0.6);
      const best = most ? Math.max(...tots) : Math.min(...tots);
      if (tots.filter(t => t === best).length > 1) return null;
      const figs = sets.map(s => D.coins(s)), win = tots.indexOf(best);
      return {
        marks: 1, answer: names[win],
        check: () => figs.every((f, i) => i === win || (most ? coinSum(f) < coinSum(figs[win]) : coinSum(f) > coinSum(figs[win]))),
        body: A => `<p>Three children have some coins.</p>${A.table(names.map((n, i) => [n, figs[i]]), { rowHead: true })}<p>Who has the <b>${most ? 'most' : 'least'}</b> money? Circle the name.</p>${A.circle(names, win)}`,
      };
    },
  });

  /* ================= Y1_NC_10 order events in time ================= */
  const EVENTS = [['wake up', 'eat breakfast', 'go to school'], ['get up', 'eat lunch', 'go to bed'], ['plant a seed', 'water the seed', 'a flower grows'],
    ['mix the cake', 'bake the cake', 'eat the cake'], ['put on socks', 'put on shoes', 'go outside'], ['morning', 'afternoon', 'evening'],
    ['yesterday', 'today', 'tomorrow'], ['run the bath', 'get in the bath', 'dry yourself'], ['buy a ticket', 'watch the film', 'go home']];
  add({
    id: 'Y1_NC_10.order', topics: ['Y1_NC_10'], level: 1,
    make(R) {
      const ev = R.pick(EVENTS), sh = R.shuffle([0, 1, 2]);
      if (sh.every((v, i) => v === i)) return null;
      return {
        marks: 1, answer: sh.map(i => `${ev[i]} ${i + 1}`).join(', '),
        guide: 'All three must be correct.',
        check: () => sh.map(i => ev.indexOf(ev[i])).sort().join() === '0,1,2',
        body: A => `<p>Write <b>1</b>, <b>2</b> and <b>3</b> to show the order these happen in.</p>${A.table(sh.map(i => [ev[i], { a: i + 1 }]))}`,
      };
    },
  });
  const TIME_SENT = [['We eat breakfast in the', ['morning', 'evening'], 0, '.'], ['We go to bed at', ['night', 'lunchtime'], 0, '.'],
    ['The sun comes up in the', ['morning', 'evening'], 0, '.'], ['We eat breakfast', ['before', 'after'], 0, 'lunch.'],
    ['We put on our socks', ['before', 'after'], 0, 'our shoes.'], ['We dry ourselves', ['before', 'after'], 1, 'a bath.'],
    ['The stars come out at', ['night', 'lunchtime'], 0, '.'], ['We eat dinner', ['before', 'after'], 1, 'breakfast.']];
  add({
    id: 'Y1_NC_10.word', topics: ['Y1_NC_10'], level: 2,
    make(R) {
      let pre, opts, right, post, check;
      if (R.chance(0.5)) {
        const d = R.int(0, 6), tom = R.chance(0.5), ans = K.DAYS[(d + (tom ? 1 : 6)) % 7], wr = K.DAYS[(d + (tom ? 6 : 1)) % 7];
        pre = `Today is ${K.DAYS[d]}. ${tom ? 'Tomorrow will be' : 'Yesterday was'}`; post = '.';
        opts = R.shuffle([ans, wr]); right = opts.indexOf(ans);
        check = () => Math.abs(K.DAYS.indexOf(ans) - d) % 5 === 1;
      } else {
        const t = R.pick(TIME_SENT); pre = t[0]; post = t[3];
        const flip = R.chance(0.5); opts = flip ? [t[1][1], t[1][0]] : t[1]; right = flip ? 1 - t[2] : t[2];
        check = () => opts[right] === t[1][t[2]];
      }
      return {
        marks: 1, answer: opts[right],
        check,
        body: A => `<p>Circle the correct word.</p><div class="sent c">${pre} ${A.circle(opts, right)} ${post === '.' ? '' : post}</div>`,
      };
    },
  });

  /* ================= Y1_NC_11 days of the week and months ================= */
  add({
    id: 'Y1_NC_11.days', topics: ['Y1_NC_11'], level: 1,
    make(R) {
      const d = R.int(0, 6), f = R.int(0, 3), step = [1, -1, 1, -1][f];
      const ans = K.DAYS[(d + step + 7) % 7];
      const q = [`Which day comes <b>after</b> ${K.DAYS[d]}?`, `Which day comes <b>before</b> ${K.DAYS[d]}?`,
        `Today is ${K.DAYS[d]}. What day will it be <b>tomorrow</b>?`, `Today is ${K.DAYS[d]}. What day was it <b>yesterday</b>?`][f];
      return {
        marks: 1, answer: ans,
        check: () => (K.DAYS.indexOf(ans) - step + 7) % 7 === d,
        body: A => `<p>${q}</p>${A.line(ans, 50)}`,
      };
    },
  });
  add({
    id: 'Y1_NC_11.months', topics: ['Y1_NC_11'], level: 2,
    make(R) {
      const s = R.int(0, 11), hide = R.int(1, 3);
      const ms = [0, 1, 2, 3].map(i => K.MONTHS[(s + i) % 12]);
      return {
        marks: 1, answer: ms[hide],
        check: () => (K.MONTHS.indexOf(ms[hide]) - K.MONTHS.indexOf(ms[hide - 1]) + 12) % 12 === 1,
        body: A => `<p>These months are in order. Write the missing month.</p><div class="sent c">${ms.map((m, i) => i === hide ? A.blank(m, 34) : m).join(', &nbsp;')}</div>`,
      };
    },
  });

  /* ================= Y1_NC_12 o'clock and half past ================= */
  const say1 = (h, m) => m === 0 ? `${h} o'clock` : `half past ${h}`;
  add({
    id: 'Y1_NC_12.read', topics: ['Y1_NC_12'], level: 1,
    make(R) {
      const h = R.int(1, 12), m = R.pick([0, 30]);
      return {
        marks: 1, answer: say1(h, m),
        guide: `Accept ${h}:${m ? '30' : '00'}.`,
        check: () => m === 0 || m === 30,
        body: A => `<p>What time does the clock show?</p>${D.clock({ h, m, size: 38 }, A)}${A.box(say1(h, m), { w: 46 })}`,
      };
    },
  });
  add({
    id: 'Y1_NC_12.draw', topics: ['Y1_NC_12'], level: 2,
    make(R) {
      const h = R.int(1, 12), m = R.pick([0, 30]);
      return {
        marks: 1, answer: say1(h, m),
        guide: 'Both hands must be correct. For half past, the hour hand is halfway to the next number.',
        check: () => (m === 30) === say1(h, m).startsWith('half'),
        body: A => `<p>Draw the hands on the clock to show <b>${say1(h, m)}</b>.</p>${D.clock({ h, m, ans: true, size: 42 }, A)}`,
      };
    },
  });
  add({
    id: 'Y1_NC_12.tick', topics: ['Y1_NC_12'], level: 2,
    make(R) {
      const h = R.int(1, 12), m = R.pick([0, 30]);
      const times = R.shuffle([[h, m], [h, 30 - m], m === 30 ? [h % 12 + 1, 30] : [h % 12 + 1, 0]]);
      const right = times.findIndex(t => t[0] === h && t[1] === m);
      return {
        marks: 1, answer: K.LET[right],
        check: () => new Set(times.map(t => t[0] * 60 + t[1])).size === 3,
        body: A => `<p>Tick the clock that shows <b>${say1(h, m)}</b>.</p>${A.tick(times.map((t, i) => K.lab(D.clock({ h: t[0], m: t[1], size: 34 }, A), K.LET[i])), right)}`,
      };
    },
  });

  /* ================= Y1_NC_13 position, direction, turns ================= */
  add({
    id: 'Y1_NC_13.grid', topics: ['Y1_NC_13'], level: 1,
    make(R) {
      const ks = R.shuffle(K.KINDS), c = 16;
      const at = (x, y) => ks[y * 3 + x];
      const x = R.int(0, 2), y = R.int(0, 1);
      const dirs = [['to the left of', -1, 0], ['to the right of', 1, 0], ['above', 0, -1], ['below', 0, 1]].filter(([, dx, dy]) => x + dx >= 0 && x + dx <= 2 && y + dy >= 0 && y + dy <= 1);
      const [w, dx, dy] = R.pick(dirs), ans = at(x + dx, y + dy);
      let s = '';
      for (let i = 0; i < 6; i++) { const gx = i % 3, gy = Math.floor(i / 3); s += D.box(1 + gx * c, 1 + gy * c, c, c) + K.pic(ks[i], 1 + gx * c + c / 2, 1 + gy * c + c / 2, 10); }
      return {
        marks: 1, answer: `the ${ans}`,
        check: () => ks.indexOf(ans) === (y + dy) * 3 + (x + dx) && ans !== at(x, y),
        body: A => `${D.svg(3 * c + 2, 2 * c + 2, s)}<p>Which picture is <b>${w}</b> the ${at(x, y)}?</p>${A.line(ans, 40)}`,
        guide: 'Accept the name or a drawing of the picture.',
      };
    },
  });
  const TURN1 = [[1, 'a quarter turn clockwise'], [2, 'a half turn'], [3, 'a three-quarter turn clockwise'], [4, 'a whole turn']];
  const DIRW = ['up', 'right', 'down', 'left'];
  add({
    id: 'Y1_NC_13.turn', topics: ['Y1_NC_13'], level: 2,
    make(R) {
      const s = R.int(0, 3), [k, w] = R.pick(TURN1), end = (s + k) % 4;
      return {
        marks: 1, answer: `${K.LET[end]} (pointing ${DIRW[end]})`,
        check: () => ((s * 90 + k * 90) % 360) / 90 === end,
        body: A => `<p>This arrow is pointing ${DIRW[s]}.</p>${K.arrow(s, 14)}<p>It makes <b>${w}</b>. Tick where it points now.</p>${A.tick([0, 1, 2, 3].map(d => K.lab(K.arrow(d, 12), K.LET[d])), end)}`,
      };
    },
  });
})();
