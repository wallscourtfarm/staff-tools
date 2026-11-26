/* Year 4 question generators. Topic ids from src/topics.json (all 44 Y4 topics). See src/GENERATORS.md. */
(function () {
  const { F, D } = RP;
  const add = RP.add;

  /* ---------- local helpers ---------- */
  const sent = s => `<div class="sent c">${s}</div>`;
  const P = s => `<p>${s}</p>`;
  // k in tenths (dp 1) or hundredths (dp 2) shown as a decimal, trailing zeros dropped unless fix
  const dec = (k, dp, fix) => fix ? F.n(k / Math.pow(10, dp), dp) : F.n(+(k / Math.pow(10, dp)).toFixed(dp));
  const yesNo = (A, yes) => A.tick(['Yes', 'No'], yes ? 0 : 1);
  const trueFalse = (A, t) => A.tick(['True', 'False'], t ? 0 : 1);
  const coord = (x, y) => `(${x}, ${y})`;
  const coordBlanks = (A, x, y) => sent(`( ${A.blank(x, 12)} , ${A.blank(y, 12)} )`);
  const LT = '&lt;', GT = '&gt;';
  const cmpSym = (a, b) => a < b ? LT : a > b ? GT : '=';
  const seqHtml = (A, terms, hide, w) => terms.map((t, i) => hide.includes(i) ? A.blank(F.n(t), w || 16) : F.n(t)).join(',&nbsp;');
  const rotPts = (pts, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]); };
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  // interior angles (degrees) of a convex polygon
  const angles = pts => pts.map((v, i) => {
    const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
    const u = [a[0] - v[0], a[1] - v[1]], w = [b[0] - v[0], b[1] - v[1]];
    return Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w))))) * 180 / Math.PI;
  });
  // number of lines of symmetry of a polygon, found by testing reflections (a different way from the table)
  function symCount(pts) {
    const n = pts.length, c = [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
    const cands = [];
    for (let i = 0; i < n; i++) { cands.push(pts[i]); const q = pts[(i + 1) % n]; cands.push([(pts[i][0] + q[0]) / 2, (pts[i][1] + q[1]) / 2]); }
    const dirs = new Set();
    for (const p of cands) {
      let dx = p[0] - c[0], dy = p[1] - c[1]; const L = Math.hypot(dx, dy); if (L < 1e-6) continue; dx /= L; dy /= L;
      const refl = pts.map(([x, y]) => { const vx = x - c[0], vy = y - c[1], d = vx * dx + vy * dy; return [c[0] + 2 * d * dx - vx, c[1] + 2 * d * dy - vy]; });
      if (refl.every(r => pts.some(q => dist(r, q) < 1e-4))) { let ang = Math.atan2(dy, dx) * 180 / Math.PI; ang = ((ang % 180) + 180) % 180; dirs.add(Math.round(ang) % 180); }
    }
    return dirs.size;
  }
  const POLY_NAMES = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon' };
  const REG_NAMES = { 3: 'equilateral triangle', 4: 'square', 5: 'regular pentagon', 6: 'regular hexagon', 7: 'regular heptagon', 8: 'regular octagon' };

  /* =====================================================================
   * Number and place value
   * ===================================================================== */

  // Y4_004 10 hundreds = 1 thousand; how many hundreds in multiples of 100
  add({
    id: 'Y4_004.hundreds-in', topics: ['Y4_004'], level: 1,
    make(R) {
      const k = R.int(11, 99), n = k * 100, form = R.int(0, 2);
      const ans = form === 2 ? n : k;
      return {
        marks: 1, answer: F.n(ans),
        check: () => Math.floor(n / 1000) * 10 + Math.floor((n % 1000) / 100) === k,
        body: A => form === 0 ? `<p>How many hundreds are there in <b>${F.n(n)}</b>?</p>${A.box(k)}`
          : form === 1 ? `<p>Write the missing number.</p>${sent(`${F.n(n)} = ${A.blank(k, 16)} hundreds`)}`
            : `<p>Write the missing number.</p>${sent(`${k} hundreds = ${A.blank(F.n(n), 22)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_004.boxes', topics: ['Y4_004'], level: 2,
    make(R) {
      const k = R.int(12, 89), n = k * 100;
      const c = R.pick([
        [`Pencils come in boxes of 100.`, `A school needs <b>${F.n(n)}</b> pencils.`, 'How many boxes does the school need?', 'boxes'],
        [`A bank gives out £100 notes.`, `${R.name()} takes out <b>£${F.n(n)}</b>.`, 'How many £100 notes is that?', 'notes'],
        [`Paper clips come in bags of 100.`, `A shop has <b>${F.n(n)}</b> paper clips in bags.`, 'How many bags is that?', 'bags'],
      ]);
      return {
        marks: 1, answer: F.n(k),
        check: () => k * 100 === n,
        body: A => `<p>${c[0]} ${c[1]}</p><p>${c[2]}</p>${A.box(k, { unit: c[3] })}`,
      };
    },
  });
  add({
    id: 'Y4_004.claim', topics: ['Y4_004'], level: 2,
    make(R) {
      const th = R.int(2, 9), h = R.int(0, 9), n = th * 1000 + h * 100, k = th * 10 + h;
      const right = R.chance(0.4), claim = right ? k : (h === 0 ? th : h);
      if (!right && claim === k) return null;
      const who = R.name();
      const why = `10 hundreds make 1,000, so ${F.n(th * 1000)} is ${th * 10} hundreds${h ? `, and ${th * 10} + ${h} = ${k}` : ''}. ${F.n(n)} has ${k} hundreds.`;
      return {
        marks: 1, answer: right ? 'Yes, with a reason' : `No: it has ${k} hundreds`,
        guide: `The mark needs ${right ? 'Yes' : 'No'} and a reason, e.g. that 10 hundreds = 1,000.`,
        check: () => (claim * 100 === n) === right,
        body: A => `<p>${who} says, “There are <b>${claim}</b> hundreds in ${F.n(n)}.”</p><p>Is ${who} correct? Explain how you know.</p>${yesNo(A, right)}${A.explain((right ? 'Yes. ' : 'No. ') + why, 2)}`,
      };
    },
  });

  // Y4_005 value of each digit in a 4-digit number; standard and non-standard partitioning
  add({
    id: 'Y4_005.partition', topics: ['Y4_005'], level: 1,
    make(R) {
      const d = [R.int(1, 9), R.int(1, 9), R.int(1, 9), R.int(1, 9)], n = d[0] * 1000 + d[1] * 100 + d[2] * 10 + d[3];
      const parts = [d[0] * 1000, d[1] * 100, d[2] * 10, d[3]], hide = R.int(0, 3);
      return {
        marks: 1, answer: F.n(parts[hide]),
        check: () => String(n) === d.join(''),
        body: A => `<p>Write the missing number.</p>${sent(`${F.n(n)} = ${parts.map((p, i) => i === hide ? A.blank(F.n(p), 18) : F.n(p)).join(' + ')}`)}`,
      };
    },
  });
  add({
    id: 'Y4_005.nonstandard', topics: ['Y4_005'], level: 2,
    make(R) {
      const who0 = R.name();
      const th = R.int(2, 9), h = R.int(0, 8), t = R.int(0, 8), o = R.int(1, 9), n = th * 1000 + h * 100 + t * 10 + o;
      const form = R.int(0, 1);
      // form 0: thousands split; form 1: hundreds split
      if (form === 1 && h < 2) return null;
      const parts = form === 0 ? [(th - 1) * 1000, (h + 10) * 100, t * 10 + o] : [th * 1000, (h - 1) * 100, (t + 10) * 10, o];
      const hide = form === 0 ? 1 : 2, ans = parts[hide];
      return {
        marks: 1, answer: F.n(ans),
        check: () => parts.reduce((a, b) => a + b, 0) === n,
        body: A => `<p>${who0} partitions ${F.n(n)} like this.</p>${sent(`${F.n(n)} = ${parts.map((p, i) => i === hide ? A.blank(F.n(p), 18) : F.n(p)).join(' + ')}`)}<p>Write the missing number.</p>`,
      };
    },
  });
  add({
    id: 'Y4_005.digit-value', topics: ['Y4_005'], level: 1,
    make(R) {
      const ds = R.ints(4, 1, 9), n = +ds.join(''), k = R.int(0, 3), val = ds[k] * Math.pow(10, 3 - k);
      const opts = R.shuffle([ds[k], ds[k] * 10, ds[k] * 100, ds[k] * 1000]);
      return {
        marks: 1, answer: F.n(val),
        check: () => Math.floor(n / Math.pow(10, 3 - k)) % 10 === ds[k],
        body: A => `<p>What is the value of the digit <b>${ds[k]}</b> in ${F.n(n)}?</p><p>Circle your answer.</p>${A.circle(opts.map(x => F.n(x)), opts.indexOf(val))}`,
      };
    },
  });
  add({
    id: 'Y4_005.build', topics: ['Y4_005'], level: 2,
    make(R) {
      const th = R.int(1, 7), extraH = R.chance(0.5);
      const h = extraH ? R.int(10, 19) : R.int(0, 9), t = extraH ? R.int(0, 9) : R.int(10, 19), o = R.int(0, 9);
      const n = th * 1000 + h * 100 + t * 10 + o;
      return {
        marks: 1, answer: F.n(n),
        check: () => { let s = o; s += t * 10; s += h * 100; s += th * 1000; return s === n && n < 10000; },
        body: A => `<p>A number is made of</p>${sent(`${th} thousands, ${h} hundreds, ${t} tens and ${o} ones.`)}<p>What is the number?</p>${A.box(F.n(n))}`,
      };
    },
  });

  // Y4_006 4-digit numbers on a number line; multiples of 100 and 1,000 either side; rounding
  add({
    id: 'Y4_006.arrow', topics: ['Y4_006'], level: 2,
    make(R) {
      const big = R.chance(0.5);
      let min, max, minor, major, v;
      if (big) { min = R.int(1, 8) * 1000; max = min + 1000; minor = 100; major = 500; v = min + R.intNot(1, 9, [5]) * 100; }
      else { min = R.int(10, 98) * 100; max = min + 100; minor = 10; major = 50; v = min + R.intNot(1, 9, [5]) * 10; }
      return {
        marks: 1, answer: F.n(v),
        check: () => v > min && v < max && (v - min) % minor === 0,
        body: A => `<p>What number is the arrow pointing to?</p>${D.numberLine({ min, max, minor, major, labels: 'ends', width: 140, marks: [{ v, box: true }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y4_006.either-side', topics: ['Y4_006'], level: 1,
    make(R) {
      const n = R.int(1001, 9899); if (n % 100 === 0) return null;
      const thou = R.chance(0.5), u = thou ? 1000 : 100;
      const lo = Math.floor(n / u) * u, hi = lo + u;
      return {
        marks: 1, answer: `${F.n(lo)} and ${F.n(hi)}`,
        check: () => lo < n && n < hi && lo % u === 0 && hi - lo === u,
        body: A => `<p>Write the multiples of ${F.n(u)} that come just before and just after ${F.n(n)}.</p>${sent(`${A.blank(F.n(lo), 20)} &lt; ${F.n(n)} &lt; ${A.blank(F.n(hi), 20)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_006.round', topics: ['Y4_006'], level: 2,
    make(R) {
      const n = R.int(1010, 9890);
      if (n % 100 === 50 || n % 1000 === 500 || n % 100 === 0) return null;
      const r100 = Math.round(n / 100) * 100, r1000 = Math.round(n / 1000) * 1000;
      return {
        marks: 1, answer: `${F.n(r100)} and ${F.n(r1000)}`, guide: 'Both needed for the mark.',
        check: () => Math.abs(n - r100) < 50 && r100 % 100 === 0 && Math.abs(n - r1000) < 500 && r1000 % 1000 === 0,
        body: A => `<p>Round ${F.n(n)} to the nearest 100 and to the nearest 1,000.</p>${A.table([[F.n(n), { a: F.n(r100) }, { a: F.n(r1000) }]], { head: ['Number', 'to the nearest 100', 'to the nearest 1,000'] })}`,
      };
    },
  });

  // Y4_007 split 1,000 into 2, 4, 5 or 10 equal parts; read scales in 500s, 250s, 200s, 100s
  add({
    id: 'Y4_007.scale', topics: ['Y4_007'], level: 2,
    make(R) {
      const step = R.pick([500, 250, 200, 100]);
      const max = step === 500 ? R.pick([2000, 3000]) : step === 100 ? 1000 : R.pick([1000, 2000]);
      const v = R.int(1, max / step - 1) * step;
      if (v % 1000 === 0) return null;
      const kind = R.pick(['jug', 'line', 'line']);
      return {
        marks: 1, answer: kind === 'jug' ? F.n(v) + ' ml' : F.n(v),
        check: () => v % step === 0 && v < max && (1000 / step) % 1 === 0,
        body: A => kind === 'jug'
          ? `<p>How much water is in the jug?</p>${D.scale({ max, major: 1000, minor: step, level: v, unit: 'ml', height: 50 }, A)}${A.box(F.n(v), { unit: 'ml' })}`
          : `<p>What number is the arrow pointing to?</p>${D.numberLine({ min: 0, max, minor: step, major: 1000, width: 140, marks: [{ v, box: true }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y4_007.parts', topics: ['Y4_007'], level: 1,
    make(R) {
      const parts = R.pick([2, 4, 5, 10]), each = 1000 / parts, c = R.int(0, 2), who = R.name();
      return {
        marks: 1, answer: F.n(each) + ['', ' g', ' ml'][c],
        check: () => each * parts === 1000,
        body: A => c === 0
          ? `<p>This line from 0 to 1,000 is split into ${parts} equal parts.</p>${D.numberLine({ min: 0, max: 1000, minor: each, major: 1000, width: 130 }, A)}<p>What is each part worth?</p>${A.box(F.n(each))}`
          : c === 1 ? `<p>${who} shares 1 kg of flour equally into <b>${parts}</b> bags.</p><p>How many grams are in each bag?</p>${A.box(F.n(each), { unit: 'g' })}`
            : `<p>${who} pours 1 litre of water equally into <b>${parts}</b> glasses.</p><p>How many millilitres are in each glass?</p>${A.box(F.n(each), { unit: 'ml' })}`,
      };
    },
  });
  add({
    id: 'Y4_007.how-many', topics: ['Y4_007'], level: 2,
    make(R) {
      const step = R.pick([500, 250, 200, 100]), tot = R.pick([1000, 2000, 3000]), k = tot / step, form = R.int(0, 2);
      return {
        marks: 1, answer: F.n(k),
        check: () => step * k === tot,
        body: A => form === 0 ? `<p>Write the missing number.</p>${sent(`${F.n(tot)} ${F.div} ${F.n(step)} = ${A.blank(k)}`)}`
          : form === 1 ? `<p>Write the missing number.</p>${sent(`${A.blank(k)} ${F.times} ${F.n(step)} = ${F.n(tot)}`)}`
            : `<p>A cup holds ${F.n(step)} ml.</p><p>How many cups of water fill a ${F.n(tot)} ml jug?</p>${A.box(k, { unit: 'cups' })}`,
      };
    },
  });

  /* =====================================================================
   * Number facts
   * ===================================================================== */

  // shared: missing number in a multiplication / division fact for the tables given
  function missingFact(R, tables) {
    const t = R.pick(tables), k = R.int(2, 12), p = t * k, f = R.int(0, 3);
    return {
      marks: 1, answer: F.n(f === 3 ? t : k),
      check: () => p / t === k && p % t === 0,
      body: A => {
        const b = A.blank(f === 3 ? t : k);
        const s = [`${b} ${F.times} ${t} = ${p}`, `${t} ${F.times} ${b} = ${p}`, `${p} ${F.div} ${t} = ${b}`, `${p} ${F.div} ${k} = ${b}`][f];
        return `<p>Write the missing number.</p>${sent(s)}`;
      },
    };
  }

  // Y4_008 all multiplication and division facts to 12 × 12; multiples
  add({ id: 'Y4_008.missing', topics: ['Y4_008'], level: 1, make: R => missingFact(R, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) });
  add({
    id: 'Y4_008.multiples', topics: ['Y4_008'], level: 2,
    make(R) {
      const t = R.pick([6, 7, 8, 9, 11, 12]);
      const yes = R.sample([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(k => k * t), 2);
      const no = [];
      for (let k = 0; no.length < 3 && k < 100; k++) {
        const x = R.int(3, 12) * t + R.pick([-3, -2, -1, 1, 2, 3]);
        if (x % t !== 0 && !no.includes(x) && !yes.includes(x)) no.push(x);
      }
      if (no.length < 3) return null;
      const opts = R.shuffle([...yes, ...no]);
      const right = opts.map((x, i) => x % t === 0 ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => opts[i]).join(' and '), guide: 'Both needed, and no others ticked.',
        check: () => right.length === 2 && right.every(i => Number.isInteger(opts[i] / t)),
        body: A => `<p>Tick the <b>two</b> numbers that are multiples of ${t}.</p>${A.tick(opts, right)}`,
      };
    },
  });
  add({
    id: 'Y4_008.word', topics: ['Y4_008'], level: 3,
    make(R) {
      const form = R.int(0, 2);
      if (form === 0) {
        const r = R.int(6, 12), c = R.int(6, 12), tot = r * c, x = R.int(Math.ceil(tot / 3), tot - 5), ans = tot - x;
        return {
          marks: 2, method: true, answer: F.n(ans),
          check: () => ans + x === r * c && ans > 0,
          body: A => `<p>A hall has <b>${r}</b> rows of chairs. There are <b>${c}</b> chairs in each row.</p><p>${F.n(x)} people sit down, one on each chair.</p><p>How many chairs are empty?</p>${A.work(`${r} ${F.times} ${c} = ${tot}<br>${tot} ${F.minus} ${x} = ${ans}`, 30)}${A.box(ans, { unit: 'chairs' })}`,
        };
      }
      const per = form === 1 ? R.pick([6, 12]) : R.pick([8, 9, 11]), b = R.int(4, 12), e = R.int(2, per - 1), ans = per * b + e;
      const ctx = form === 1 ? [`Eggs are packed in boxes of ${per}.`, `A farmer fills <b>${b}</b> boxes and has <b>${e}</b> eggs left over.`, 'How many eggs did the farmer have?', 'eggs']
        : [`Stickers come in sheets of ${per}.`, `${R.name()} has <b>${b}</b> full sheets and <b>${e}</b> loose stickers.`, 'How many stickers is that altogether?', 'stickers'];
      return {
        marks: 2, method: true, answer: F.n(ans),
        check: () => (ans - e) / per === b,
        body: A => `<p>${ctx[0]}</p><p>${ctx[1]}</p><p>${ctx[2]}</p>${A.work(`${b} ${F.times} ${per} = ${b * per}<br>${b * per} + ${e} = ${ans}`, 30)}${A.box(ans, { unit: ctx[3] })}`,
      };
    },
  });

  // Y4_010 known facts to work out facts 100 times bigger
  add({
    id: 'Y4_010.missing', topics: ['Y4_010'], level: 1,
    make(R) {
      const a = R.int(2, 12), b = R.int(2, 9), p = a * b, form = R.int(0, 4);
      const cases = [
        [`${F.n(a * 100)} ${F.times} ${b} = `, p * 100, 1],
        [`${b} ${F.times} ${F.n(a * 100)} = `, p * 100, 1],
        [`${F.n(p * 100)} ${F.div} ${b} = `, a * 100, 1],
        [`${F.times} ${b} = ${F.n(p * 100)}`, a * 100, 0],
        [`${F.n(p * 100)} ${F.div} ${F.n(a * 100)} = `, b, 1],
      ];
      const [s, ans, after] = cases[form];
      return {
        marks: 1, answer: F.n(ans),
        check: () => [ans / b === a * 100, ans / (a * 100) === b, ans * b === p * 100, ans * b === p * 100, ans * a * 100 === p * 100][form],
        body: A => `<p>Write the missing number.</p>${sent(after ? s + A.blank(F.n(ans), 20) : A.blank(F.n(ans), 20) + ' ' + s)}`,
      };
    },
  });
  add({
    id: 'Y4_010.use-fact', topics: ['Y4_010'], level: 2,
    make(R) {
      const a = R.int(3, 9), b = R.int(3, 9), p = a * b, target = p * 100;
      const right = R.pick([[a * 100, b], [a, b * 100], [a * 10, b * 10]]);
      const wrongs = R.sample([[a * 10, b], [a, b * 10], [a * 100, b * 10], [a * 10, b * 100], [a * 1000, b], [a * 100, b * 100]], 3);
      const opts = R.shuffle([right, ...wrongs]);
      const vals = opts.map(([x, y]) => x * y);
      const idx = vals.map((v, i) => v === target ? i : -1).filter(i => i >= 0);
      if (idx.length !== 1) return null;
      return {
        marks: 1, answer: `${F.n(opts[idx[0]][0])} ${F.times} ${F.n(opts[idx[0]][1])}`,
        check: () => vals[idx[0]] / 100 === a * b,
        body: A => `${sent(`${a} ${F.times} ${b} = ${p}`)}<p>Use this fact. Circle the calculation that equals <b>${F.n(target)}</b>.</p>${A.circle(opts.map(([x, y]) => `${F.n(x)} ${F.times} ${F.n(y)}`), idx[0])}`,
      };
    },
  });
  add({
    id: 'Y4_010.claim', topics: ['Y4_010'], level: 2,
    make(R) {
      const a = R.int(2, 9), b = R.int(3, 9), p = a * b, who = R.name();
      const kind = R.int(0, 2), claim = [p * 100, p * 10, p * 1000][kind], right = kind === 0;
      const ex = `${a} ${F.times} ${b} = ${p}, and ${F.n(a * 100)} is 100 times ${a}, so the answer is 100 times ${p}, which is ${F.n(p * 100)}.`;
      return {
        marks: 1, answer: right ? 'Yes, with a reason' : `No: it is ${F.n(p * 100)}`,
        guide: `The mark needs ${right ? 'Yes' : 'No'} and a reason linked to ${a} ${F.times} ${b} = ${p} being 100 times smaller.`,
        check: () => (claim === a * 100 * b) === right,
        body: A => `<p>${who} says,</p>${sent(`${F.n(a * 100)} ${F.times} ${b} = ${F.n(claim)}`)}<p>Is ${who} correct? Explain how you know.</p>${yesNo(A, right)}${A.explain((right ? 'Yes. ' : 'No. ') + ex, 2)}`,
      };
    },
  });

  // new_d_n8bvzswy_10_mwuwr70v the 11 and 12 times tables
  const T1112 = 'new_d_n8bvzswy_10_mwuwr70v';
  add({ id: T1112 + '.missing', topics: [T1112], level: 1, make: R => missingFact(R, [11, 12]) });
  add({
    id: T1112 + '.sequence', topics: [T1112], level: 1,
    make(R) {
      const who0 = R.name();
      const t = R.pick([11, 12]), k0 = R.int(1, 7), down = R.chance(0.35);
      let terms = [0, 1, 2, 3, 4, 5].map(i => (k0 + i) * t); if (down) terms = terms.reverse();
      const hide = R.sample([1, 2, 3, 4, 5], 2).sort((x, y) => x - y);
      return {
        marks: 1, answer: hide.map(i => F.n(terms[i])).join(' and '), guide: 'Both needed.',
        check: () => terms.every((x, i) => i === 0 || Math.abs(x - terms[i - 1]) === t),
        body: A => `<p>${who0} counts in ${t}s. Write the missing numbers.</p>${sent(seqHtml(A, terms, hide, 14))}`,
      };
    },
  });
  add({
    id: T1112 + '.word', topics: [T1112], level: 2,
    make(R) {
      const c = R.pick([
        [12, 'Eggs are sold in boxes of 12.', 'eggs', 'boxes'],
        [12, 'There are 12 pencils in a pack.', 'pencils', 'packs'],
        [11, 'A football team has 11 players.', 'players', 'teams'],
        [12, 'There are 12 months in a year.', 'months', 'years'],
      ]);
      const [t, intro, thing, grp] = c, k = R.int(3, 12), mult = R.chance(0.5);
      const ans = mult ? t * k : k;
      return {
        marks: 1, answer: F.n(ans),
        check: () => mult ? ans / t === k : ans * t === t * k,
        body: A => mult ? `<p>${intro}</p><p>How many ${thing} are there in <b>${k}</b> ${grp}?</p>${A.box(ans, { unit: thing })}`
          : `<p>${intro}</p><p>How many ${grp} make <b>${t * k}</b> ${thing}?</p>${A.box(ans, { unit: grp })}`,
      };
    },
  });

  // new_d_n8bvzswy_1_mwtaspor the 3 and 6 times tables
  const T36 = 'new_d_n8bvzswy_1_mwtaspor';
  add({ id: T36 + '.missing', topics: [T36], level: 1, make: R => missingFact(R, [3, 6]) });
  add({
    id: T36 + '.double', topics: [T36], level: 2,
    make(R) {
      const k = R.int(3, 12), up = R.chance(0.6);
      const given = up ? `3 ${F.times} ${k} = ${3 * k}` : `6 ${F.times} ${k} = ${6 * k}`;
      const ans = up ? 6 * k : 3 * k;
      return {
        marks: 1, answer: F.n(ans),
        check: () => up ? ans === 2 * (3 * k) : ans * 2 === 6 * k,
        body: A => `${sent(given)}<p>Use this fact to work out</p>${sent(`${up ? 6 : 3} ${F.times} ${k} = ${A.blank(ans)}`)}`,
        guide: `${up ? 'Double' : 'Halve'} ${up ? 3 * k : 6 * k}.`,
      };
    },
  });
  add({
    id: T36 + '.word', topics: [T36], level: 2,
    make(R) {
      const who0 = R.name();
      const c = R.pick([
        [3, 'A tricycle has 3 wheels.', 'wheels', 'tricycles', 'on'],
        [6, 'Yoghurts come in packs of 6.', 'yoghurts', 'packs', 'in'],
        [6, 'A box holds 6 cakes.', 'cakes', 'boxes', 'in'],
        [3, 'Tennis balls are sold in tubes of 3.', 'tennis balls', 'tubes', 'in'],
      ]);
      const [t, intro, thing, grp, prep] = c, k = R.int(4, 12), mult = R.chance(0.5), ans = mult ? t * k : k;
      return {
        marks: 1, answer: F.n(ans),
        check: () => mult ? ans % t === 0 && ans / t === k : ans * t === t * k,
        body: A => mult ? `<p>${intro}</p><p>How many ${thing} are there ${prep} <b>${k}</b> ${grp}?</p>${A.box(ans, { unit: thing })}`
          : `<p>${intro}</p><p>${who0} counts <b>${t * k}</b> ${thing}.</p><p>How many ${grp} is that?</p>${A.box(ans, { unit: grp })}`,
      };
    },
  });

  // new_d_n8bvzswy_2_mwtatg2a the 7 and 9 times tables
  const T79 = 'new_d_n8bvzswy_2_mwtatg2a';
  add({ id: T79 + '.missing', topics: [T79], level: 1, make: R => missingFact(R, [7, 9]) });
  add({
    id: T79 + '.mistake', topics: [T79], level: 2,
    make(R) {
      const who0 = R.name();
      const t = R.pick([7, 9]), k0 = R.int(1, 6);
      const terms = [0, 1, 2, 3, 4, 5].map(i => (k0 + i) * t);
      const bad = R.int(1, 5), wrong = terms[bad] + R.pick([-2, -1, 1, 2]);
      if (wrong % t === 0) return null;
      const shown = terms.slice(); shown[bad] = wrong;
      return {
        marks: 1, answer: `${wrong} (it should be ${terms[bad]})`,
        check: () => shown.filter(x => x % t !== 0).length === 1 && shown[bad] % t !== 0,
        body: A => `<p>${who0} writes part of the ${t} times table.</p><p>One number is wrong. Circle it.</p>${A.circle(shown, bad)}`,
      };
    },
  });
  add({
    id: T79 + '.word', topics: [T79], level: 2,
    make(R) {
      const c = R.pick([
        [7, 'There are 7 days in a week.', 'days', 'weeks'],
        [9, 'A rounders team has 9 players.', 'players', 'teams'],
        [7, 'A pack has 7 pencils.', 'pencils', 'packs'],
        [9, 'Stickers come in sheets of 9.', 'stickers', 'sheets'],
      ]);
      const [t, intro, thing, grp] = c, k = R.int(3, 12), mult = R.chance(0.5), ans = mult ? t * k : k;
      return {
        marks: 1, answer: F.n(ans),
        check: () => mult ? ans / t === k : ans * t === t * k,
        body: A => mult ? `<p>${intro}</p><p>How many ${thing} are there in <b>${k}</b> ${grp}?</p>${A.box(ans, { unit: thing })}`
          : `<p>${intro}</p><p>How many ${grp} are there in <b>${t * k}</b> ${thing}?</p>${A.box(ans, { unit: grp })}`,
      };
    },
  });

  /* =====================================================================
   * Multiplication and division
   * ===================================================================== */

  // Y4_009 divide 2-digit by 1-digit with remainders; what the remainder means
  add({
    id: 'Y4_009.remainder', topics: ['Y4_009'], level: 1,
    make(R) {
      const d = R.int(3, 9), q = R.int(3, Math.floor(98 / d)), r = R.int(1, d - 1), n = q * d + r;
      if (n < 20 || n > 99) return null;
      return {
        marks: 1, answer: `${q} r ${r}`, guide: 'Both numbers needed.',
        check: () => Math.floor(n / d) === q && n % d === r,
        body: A => `<p>Write the missing numbers.</p>${sent(`${n} ${F.div} ${d} = ${A.blank(q)} remainder ${A.blank(r)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_009.context', topics: ['Y4_009'], level: 2,
    make(R) {
      const d = R.int(3, 9), n = R.int(25, 99); if (n % d === 0) return null;
      const who = R.name();
      const cs = [
        ['up', `<b>${n}</b> children are going on a trip. Each minibus can carry <b>${d}</b> children.`, 'How many minibuses are needed?', 'minibuses'],
        ['up', `${who} has <b>${n}</b> photos. Each page of an album holds <b>${d}</b> photos.`, `How many pages does ${who} need for all the photos?`, 'pages'],
        ['down', `${who} has <b>${n}</b> cm of ribbon. She cuts it into pieces <b>${d}</b> cm long.`, 'How many whole pieces can she cut?', 'pieces'],
        ['down', `Pens cost <b>${d}p</b> each. ${who} has <b>${n}p</b>.`, `How many pens can ${who} buy?`, 'pens'],
      ];
      const [way, l1, qn, unit] = R.pick(cs);
      const ans = way === 'up' ? Math.ceil(n / d) : Math.floor(n / d);
      return {
        marks: 1, answer: F.n(ans),
        check: () => way === 'up' ? ans * d >= n && (ans - 1) * d < n : ans * d <= n && (ans + 1) * d > n,
        body: A => `<p>${l1}</p><p>${qn}</p>${A.box(ans, { unit })}`,
        guide: way === 'up' ? `${n} ${F.div} ${d} = ${Math.floor(n / d)} r ${n % d}, so round up.` : `${n} ${F.div} ${d} = ${Math.floor(n / d)} r ${n % d}; the remainder is not enough for another one.`,
      };
    },
  });
  add({
    id: 'Y4_009.share', topics: ['Y4_009'], level: 3,
    make(R) {
      const bags = R.int(2, 4), per = R.int(11, 24), tot = bags * per, d = R.int(3, 9);
      if (tot > 99 || tot % d === 0) return null;
      const q = Math.floor(tot / d), r = tot % d, who = R.name();
      return {
        marks: 2, method: true, answer: `${q} each, ${r} left over`, guide: 'Award 1 mark for finding the total of ' + tot + '.',
        check: () => q * d + r === bags * per && r < d && r > 0,
        body: A => `<p>${who} has <b>${bags}</b> bags of marbles. Each bag has <b>${per}</b> marbles.</p><p>${who} shares all the marbles equally between <b>${d}</b> friends.</p><p>How many marbles does each friend get? How many are left over?</p>${A.work(`${bags} ${F.times} ${per} = ${tot}<br>${tot} ${F.div} ${d} = ${q} r ${r}`, 30)}${A.boxes([[q, 'each'], [r, 'left over']])}`,
      };
    },
  });

  // Y4_011 multiply and divide whole numbers by 10 and 100
  add({
    id: 'Y4_011.missing', topics: ['Y4_011'], level: 1,
    make(R) {
      const form = R.int(0, 4);
      const n = form === 1 || form === 3 ? R.int(12, 99) : R.int(12, 999);
      const cases = [
        [`${F.n(n)} ${F.times} 10 = `, n * 10, 1],
        [`${F.n(n)} ${F.times} 100 = `, n * 100, 1],
        [`${F.n(n * 10)} ${F.div} 10 = `, n, 1],
        [`${F.n(n * 100)} ${F.div} 100 = `, n, 1],
        [`${F.n(n)} ${F.times} `, R.pick([10, 100]), 2],
      ];
      const [s, ans, kind] = cases[form];
      return {
        marks: 1, answer: F.n(ans),
        check: () => [ans / 10 === n, ans / 100 === n, ans * 10 === n * 10, ans * 100 === n * 100, ans === 10 || ans === 100][form],
        body: A => `<p>Write the missing number.</p>${sent(kind === 2 ? `${s}${A.blank(F.n(ans), 16)} = ${F.n(n * ans)}` : s + A.blank(F.n(ans), 22))}`,
      };
    },
  });
  add({
    id: 'Y4_011.machine', topics: ['Y4_011'], level: 2,
    make(R) {
      const ops = R.pick([['×', 10, '×', 10], ['×', 100, '÷', 10], ['×', 10, '×', 100], ['÷', 10, '×', 100], ['÷', 100, '×', 10], ['×', 10, '÷', 100]]);
      const apply = (x, o, k) => o === '×' ? x * k : x / k;
      const back = (x, o, k) => o === '×' ? x / k : x * k;
      let input = R.int(2, 99);
      if (ops[0] === '÷') input = R.int(2, 99) * ops[1];
      const mid = apply(input, ops[0], ops[1]), out = apply(mid, ops[2], ops[3]);
      if (!Number.isInteger(mid) || !Number.isInteger(out) || out > 99999) return null;
      const askOut = R.chance(0.6), ans = askOut ? out : input;
      const opb = (o, k) => `<span style="display:inline-block;border:.4mm solid #000;border-radius:2mm;padding:1.5mm 3mm;margin:0 1mm">${o === '×' ? F.times : F.div} ${k}</span>`;
      return {
        marks: 1, answer: F.n(ans),
        check: () => back(back(out, ops[2], ops[3]), ops[0], ops[1]) === input,
        body: A => `<p>Here is a function machine.</p>${sent(`${askOut ? `<b>${F.n(input)}</b>` : A.blank(F.n(input), 18)} → ${opb(ops[0], ops[1])} → ${opb(ops[2], ops[3])} → ${askOut ? A.blank(F.n(out), 22) : `<b>${F.n(out)}</b>`}`)}<p>Write the missing ${askOut ? 'output' : 'input'}.</p>`,
      };
    },
  });
  add({
    id: 'Y4_011.compare', topics: ['Y4_011'], level: 2,
    make(R) {
      const a = R.int(12, 89), v1 = a * 100, v2 = (a + R.pick([-1, 0, 1])) * 100;
      const expr = v => {
        const f = R.int(0, 3);
        if (f === 0) return `${F.n(v / 100)} ${F.times} 100`;
        if (f === 1) return `${F.n(v / 10)} ${F.times} 10`;
        if (f === 2) return `${F.n(v * 10)} ${F.div} 10`;
        return `${F.n(v * 100)} ${F.div} 100`;
      };
      const e1 = expr(v1), e2 = expr(v2);
      if (e1 === e2) return null;
      const sym = cmpSym(v1, v2);
      return {
        marks: 1, answer: sym,
        check: () => (sym === '=') === (v1 === v2) && (sym === LT) === (v1 < v2),
        body: A => `<p>Write &lt;, &gt; or = to make this correct.</p>${sent(`${e1} ${A.blank(sym, 12)} ${e2}`)}`,
      };
    },
  });

  // Y4_012 rearrange multiplication and division sentences; commutativity
  add({
    id: 'Y4_012.family', topics: ['Y4_012'], level: 1,
    make(R) {
      const [a, b] = R.ints(2, 3, 12), p = a * b;
      const pool = [
        [`${p} ${F.div} ${a} = `, b, 1], [`${p} ${F.div} ${b} = `, a, 1], [`${b} ${F.times} ${a} = `, p, 1],
        [` ${F.div} ${a} = ${b}`, p, 0], [`${p} ${F.div} `, a, 2],
      ];
      const [f1, f2] = R.sample(pool, 2);
      const line = (f, A) => f[2] === 1 ? f[0] + A.blank(f[1]) : f[2] === 0 ? A.blank(f[1]) + f[0] : `${f[0]}${A.blank(f[1])} = ${p / f[1]}`;
      return {
        marks: 1, answer: `${f1[1]} and ${f2[1]}`, guide: 'Both needed.',
        check: () => [f1, f2].every(f => f[1] === a || f[1] === b || f[1] === p) && a * b === p,
        body: A => `${sent(`${a} ${F.times} ${b} = ${p}`)}<p>Use this fact to write the missing numbers.</p>${sent(line(f1, A))}${sent(line(f2, A))}`,
      };
    },
  });
  add({
    id: 'Y4_012.not-correct', topics: ['Y4_012'], level: 2,
    make(R) {
      const [a, b] = R.ints(2, 3, 12), p = a * b;
      const T = F.times, Dv = F.div;
      const trues = [[`${a} ${T} ${b} = ${b} ${T} ${a}`, a * b === b * a], [`${p} ${Dv} ${a} = ${b}`, p / a === b], [`${p} = ${b} ${T} ${a}`, p === b * a], [`${p} ${Dv} ${b} = ${a}`, p / b === a]];
      const falses = [[`${a} ${Dv} ${p} = ${b}`, a / p === b], [`${p} ${Dv} ${a} = ${a} ${Dv} ${p}`, p / a === a / p], [`${b} ${Dv} ${p} = ${a}`, b / p === a], [`${p} ${Dv} ${b} = ${b} ${Dv} ${p}`, p / b === b / p]];
      const opts = R.shuffle([...R.sample(trues, 3), R.pick(falses)]);
      const idx = opts.findIndex(o => !o[1]);
      return {
        marks: 1, answer: opts[idx][0],
        check: () => opts.filter(o => !o[1]).length === 1,
        body: A => `<p>Tick the number sentence that is <b>not</b> correct.</p>${A.tick(opts.map(o => o[0]), idx, { col: true })}`,
      };
    },
  });
  add({
    id: 'Y4_012.three', topics: ['Y4_012'], level: 1,
    make(R) {
      const [a, b, c] = R.ints(3, 2, 9), p = a * b * c;
      const order = R.pick([[2, 1, 0], [1, 0, 2], [2, 0, 1], [0, 2, 1]]), vals = [a, b, c], hide = R.int(0, 2);
      return {
        marks: 1, answer: F.n(vals[order[hide]]),
        check: () => order.map(i => vals[i]).reduce((x, y) => x * y, 1) === p,
        body: A => `${sent(`${a} ${F.times} ${b} ${F.times} ${c} = ${p}`)}<p>Write the missing number.</p>${sent(order.map((i, k) => k === hide ? A.blank(vals[i]) : vals[i]).join(` ${F.times} `) + ` = ${p}`)}`,
      };
    },
  });

  // Y4_013 distributive law
  add({
    id: 'Y4_013.split', topics: ['Y4_013'], level: 1,
    make(R) {
      const a = R.int(3, 9), t = R.int(1, 4), o = R.int(1, 9), n = t * 10 + o, form = R.int(0, 2);
      const tt = a * t * 10, oo = a * o, ans = a * n;
      const T = F.times;
      return {
        marks: 1, answer: form === 0 ? F.n(o) : form === 1 ? `${tt} and ${oo}` : F.n(ans),
        check: () => tt + oo === a * n && (ans - oo) / a === t * 10,
        body: A => `<p>Write the missing number${form === 1 ? 's' : ''}.</p>` + (form === 0 ? sent(`${a} ${T} ${n} = ${a} ${T} ${t * 10} + ${a} ${T} ${A.blank(o)}`)
          : form === 1 ? sent(`${a} ${T} ${n} = ${A.blank(tt, 16)} + ${A.blank(oo, 16)}`) + `<p style="text-align:center">(${a} ${T} ${t * 10}) + (${a} ${T} ${o})</p>`
            : sent(`${a} ${T} ${n} = ${a} ${T} ${t * 10} + ${a} ${T} ${o} = ${A.blank(F.n(ans), 18)}`)),
      };
    },
  });
  add({
    id: 'Y4_013.mistake', topics: ['Y4_013'], level: 2,
    make(R) {
      const a = R.int(3, 9), t = R.int(1, 6), o = R.int(2, 9), n = t * 10 + o, who = R.name();
      let X = a * t * 10, Y = a * o; const kind = R.int(0, 2);
      if (kind === 0) X = a * t; else if (kind === 1) Y = a * o + R.pick([-a, a]);
      let Z = X + Y; if (kind === 2) Z = X + Y + R.pick([-10, 10]);
      const ans = a * n;
      if (Z === ans) return null;
      const T = F.times;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans === (a * t * 10) + (a * o) && ans / n === a,
        body: A => `<p>${who} works out ${a} ${T} ${n} like this.</p><div class="sent c" style="flex-direction:column">${a} ${T} ${t * 10} = ${F.n(X)}<br>${a} ${T} ${o} = ${F.n(Y)}<br>${F.n(X)} + ${F.n(Y)} = ${F.n(Z)}</div><p>${who} has made a mistake. What is the correct answer to ${a} ${T} ${n}?</p>${A.box(F.n(ans))}`,
      };
    },
  });
  add({
    id: 'Y4_013.word', topics: ['Y4_013'], level: 3,
    make(R) {
      const c = R.int(12, 49), n = R.int(3, 9), tot = c * n, pay = tot < 200 ? 200 : tot < 500 ? 500 : 1000;
      if (tot % 10 === 0 || c % 10 === 0) return null;
      const change = pay - tot, t = Math.floor(c / 10) * 10, o = c % 10;
      return {
        marks: 2, method: true, answer: '£' + F.n(change),
        check: () => change + n * t + n * o === pay,
        body: A => `<p>A school trip costs <b>£${c}</b> for each child.</p><p><b>${n}</b> children go on the trip. The school pays with <b>£${F.n(pay)}</b>.</p><p>How much change should the school get?</p>${A.work(`${n} ${F.times} ${t} = ${n * t}, ${n} ${F.times} ${o} = ${n * o}<br>${n * t} + ${n * o} = ${tot}<br>${F.n(pay)} ${F.minus} ${tot} = ${change}`, 32)}${A.box(F.n(change), { pre: '£' })}`,
      };
    },
  });

  /* =====================================================================
   * Fractions (mixed numbers)
   * ===================================================================== */
  const mixedBlanks = (A, w, n, d) => `<span class="mx">${A.blank(w, 10)}${F.frac(A.blank(n, 9), d)}</span>`;

  // Y4_014 mixed numbers on a number line
  add({
    id: 'Y4_014.arrow', topics: ['Y4_014'], level: 2,
    make(R) {
      const d = R.pick([2, 3, 4, 5, 8, 10]), min = R.int(0, 3), span = d >= 8 ? 2 : 3, max = min + span;
      const w = R.int(Math.max(1, min), max - 1), n = R.int(1, d - 1);
      const labels = []; for (let i = min; i <= max; i++) labels.push(i);
      return {
        marks: 1, answer: F.mixed(w, n, d),
        check: () => w * d + n > min * d && w * d + n < max * d,
        body: A => `<p>What number is the arrow pointing to? Write it as a mixed number.</p>${D.numberLine({ min, max, minor: 1 / d, major: 1, labels, width: 140, marks: [{ v: w + n / d }] }, A)}${A.box(F.mixed(w, n, d), { w: 24 })}`,
      };
    },
  });
  add({
    id: 'Y4_014.draw', topics: ['Y4_014'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8, 10]), min = R.int(0, 2), max = min + 3;
      const w = R.int(Math.max(1, min), max - 1), n = R.int(1, d - 1);
      const labels = []; for (let i = min; i <= max; i++) labels.push(i);
      return {
        marks: 1, answer: `Arrow at ${F.mixed(w, n, d)}`, guide: 'Accept an arrow or a clear mark at the right place.',
        check: () => (w + n / d) > min && (w + n / d) < max,
        body: A => `<p>Draw an arrow to show where ${F.mixed(w, n, d)} goes on this number line.</p>${D.numberLine({ min, max, minor: 1 / d, major: 1, labels, width: 140, marks: [{ v: w + n / d, ans: true }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y4_014.closest', topics: ['Y4_014'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8, 10]), w = R.int(1, 9), n = R.int(1, d - 1);
      if (2 * n === d) return null;
      const form = R.int(0, 1), p = w * d + n;
      const near = 2 * n < d ? w : w + 1;
      return {
        marks: 1, answer: form === 0 ? F.n(near) : `${w} and ${w + 1}`,
        check: () => Math.abs(p - near * d) < d / 2 && w * d < p && p < (w + 1) * d,
        body: A => form === 0 ? `<p>Which whole number is ${F.mixed(w, n, d)} closest to?</p>${A.box(near)}`
          : `<p>${F.frac(p, d)} lies between two whole numbers next to each other.</p><p>Write them in the boxes.</p>${sent(`${A.blank(w)} &lt; ${F.frac(p, d)} &lt; ${A.blank(w + 1)}`)}`,
      };
    },
  });

  // Y4_015 mixed numbers and improper fractions
  add({
    id: 'Y4_015.to-improper', topics: ['Y4_015'], level: 1,
    make(R) {
      const d = R.int(2, 10), w = R.int(1, 5), n = R.int(1, d - 1), p = w * d + n;
      return {
        marks: 1, answer: F.frac(p, d),
        check: () => Math.floor(p / d) === w && p % d === n,
        body: A => `<p>Write the missing number.</p>${sent(`${F.mixed(w, n, d)} = ${F.frac(A.blank(p, 10), d)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_015.to-mixed', topics: ['Y4_015'], level: 1,
    make(R) {
      const d = R.int(2, 10), w = R.int(1, 5), n = R.int(1, d - 1), p = w * d + n;
      return {
        marks: 1, answer: F.mixed(w, n, d),
        check: () => w * d + n === p && n < d,
        body: A => `<p>Write ${F.frac(p, d)} as a mixed number.</p>${sent(`${F.frac(p, d)} = ${mixedBlanks(A, w, n, d)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_015.circle', topics: ['Y4_015'], level: 2,
    make(R) {
      const d = R.int(3, 9), w = R.int(2, 5), n = R.int(1, d - 1), p = w * d + n;
      const wrong = [...new Set([w + n, w * n + d, w * d - n, (w + 1) * d + n, n * d + w])].filter(x => x > 0 && x !== p);
      if (wrong.length < 3) return null;
      const opts = R.shuffle([p, ...R.sample(wrong, 3)]);
      return {
        marks: 1, answer: F.frac(p, d),
        check: () => opts.filter(x => x === p).length === 1 && Math.floor(p / d) === w,
        body: A => `<p>Circle the fraction that is equal to ${F.mixed(w, n, d)}.</p>${A.circle(opts.map(x => F.frac(x, d)), opts.indexOf(p))}`,
      };
    },
  });
  add({
    id: 'Y4_015.pictures', topics: ['Y4_015'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8]), w = R.int(1, 3), n = R.int(1, d - 1), p = w * d + n, asMixed = R.chance(0.4);
      const figs = []; for (let i = 0; i < w; i++) figs.push(D.fractionCircle({ parts: d, shaded: d, r: 12 }));
      figs.push(D.fractionCircle({ parts: d, shaded: n, r: 12 }));
      return {
        marks: 1, answer: asMixed ? F.mixed(w, n, d) : F.frac(p, d),
        check: () => (w * d + n) === p,
        body: A => `<p>Each circle is one whole.</p>${D.row(figs, 5)}<p>Write the shaded amount as ${asMixed ? 'a mixed number' : 'an improper fraction'}.</p>${sent(asMixed ? mixedBlanks(A, w, n, d) : F.frac(A.blank(p, 10), A.blank(d, 10)))}`,
      };
    },
  });

  // Y4_016 add and subtract mixed numbers / improper fractions with the same denominator
  add({
    id: 'Y4_016.add', topics: ['Y4_016'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 7, 8, 10]), n1 = R.int(1, d - 1), n2 = R.int(1, d - 1);
      if (n1 + n2 <= d) return null;
      const form = R.int(0, 2), w1 = R.int(1, 4), w2 = form === 1 ? R.int(1, 3) : 0;
      const p1 = w1 * d + n1, p2 = w2 * d + n2, S = p1 + p2, W = Math.floor(S / d), N = S % d;
      const left = form === 2 ? F.frac(p1, d) : F.mixed(w1, n1, d), right = form === 1 ? F.mixed(w2, n2, d) : F.frac(n2, d);
      return {
        marks: 1, answer: F.mixed(W, N, d), guide: `Accept ${F.frac(S, d)}.`,
        check: () => W === w1 + w2 + 1 && N === n1 + n2 - d,
        body: A => `<p>Work out. Write your answer as a mixed number.</p>${sent(`${left} + ${right} = ${mixedBlanks(A, W, N, d)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_016.sub', topics: ['Y4_016'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 7, 8, 10]), form = R.int(0, 2), w1 = R.int(2, 5);
      let n1 = R.int(1, d - 2), n2 = R.int(n1 + 1, d - 1);
      if (form === 2) n1 = 0;
      const w2 = form === 1 ? R.int(1, w1 - 1) : 0;
      const p1 = w1 * d + n1, p2 = w2 * d + n2, S = p1 - p2, W = Math.floor(S / d), N = S % d;
      if (S <= 0 || N === 0) return null;
      const left = form === 2 ? F.n(w1) : F.mixed(w1, n1, d), right = form === 1 ? F.mixed(w2, n2, d) : F.frac(n2, d);
      return {
        marks: 1, answer: W ? F.mixed(W, N, d) : F.frac(N, d), guide: `Accept ${F.frac(S, d)}.`,
        check: () => S + p2 === p1 && W * d + N === S,
        body: A => `<p>Work out. Write your answer as a mixed number.</p>${sent(`${left} ${F.minus} ${right} = ${mixedBlanks(A, W, N, d)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_016.word', topics: ['Y4_016'], level: 3,
    make(R) {
      const d = R.pick([4, 5, 8, 10]), who = R.name(), W = R.int(4, 7);
      const a = R.int(d + 1, 2 * d - 1), b = R.int(d + 1, 2 * d - 1), left = W * d - a - b;
      if (left <= 0 || left % d === 0 || (a % d) + (b % d) <= d) return null;
      const LW = Math.floor(left / d), LN = left % d, mx = p => F.mixed(Math.floor(p / d), p % d, d);
      return {
        marks: 2, method: true, answer: (LW ? F.mixed(LW, LN, d) : F.frac(LN, d)) + ' km', guide: `Accept ${F.frac(left, d)} km. Award 1 mark for adding to get ${mx(a + b)} km.`,
        check: () => left + a + b === W * d && LW * d + LN === left,
        body: A => `<p>${who} is walking <b>${W} km</b>.</p><p>${who} walks ${mx(a)} km before lunch and ${mx(b)} km after lunch.</p><p>How much further does ${who} have to walk?</p>${A.work(`${mx(a)} + ${mx(b)} = ${mx(a + b)}<br>${W} ${F.minus} ${mx(a + b)} = ${LW ? mx(left) : F.frac(LN, d)}`, 34)}<div class="ar">${mixedBlanks(A, LW, LN, d)}<span class="au">km</span></div>`,
      };
    },
  });

  /* =====================================================================
   * Geometry
   * ===================================================================== */

  // Y4_017 coordinates in the first quadrant; plotting and translating
  function randTri(R, max) {
    for (let k = 0; k < 100; k++) {
      const p = [[R.int(1, max), R.int(1, max)], [R.int(1, max), R.int(1, max)], [R.int(1, max), R.int(1, max)]];
      const area = Math.abs((p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1])) / 2;
      if (area >= 3) return p;
    }
    return [[1, 1], [4, 1], [1, 4]];
  }
  add({
    id: 'Y4_017.read', topics: ['Y4_017'], level: 1,
    make(R) {
      const pts = randTri(R, 7), names = ['A', 'B', 'C'], k = R.int(0, 2), [x, y] = pts[k];
      return {
        marks: 1, answer: coord(x, y), guide: 'Both numbers in the right order.',
        check: () => pts.filter(p => p[0] === x && p[1] === y).length === 1,
        body: A => `<p>Triangle ABC is drawn on the grid.</p>${D.grid({ cols: 8, rows: 8, cell: 5.5, axes: true, polys: [{ pts }], pts: pts.map((p, i) => ({ x: p[0], y: p[1], label: names[i] })) }, A)}<p>What are the coordinates of point <b>${names[k]}</b>?</p>${coordBlanks(A, x, y)}`,
      };
    },
  });
  add({
    id: 'Y4_017.translate', topics: ['Y4_017'], level: 2,
    make(R) {
      const pts = randTri(R, 6), dx = R.intNot(-4, 4, [0]), dy = R.int(-4, 4);
      const moved = pts.map(([x, y]) => [x + dx, y + dy]);
      if (moved.some(([x, y]) => x < 0 || x > 9 || y < 0 || y > 8)) return null;
      const k = R.int(0, 2), names = ['A', 'B', 'C'], [x, y] = moved[k];
      const desc = `<b>${Math.abs(dx)} ${Math.abs(dx) === 1 ? 'square' : 'squares'} ${dx > 0 ? 'right' : 'left'}</b>` + (dy ? ` and <b>${Math.abs(dy)} ${Math.abs(dy) === 1 ? 'square' : 'squares'} ${dy > 0 ? 'up' : 'down'}</b>` : '');
      return {
        marks: 1, answer: coord(x, y),
        check: () => x - pts[k][0] === dx && y - pts[k][1] === dy,
        body: A => `<p>Triangle ABC is translated ${desc}.</p>${D.grid({ cols: 9, rows: 8, cell: 5.5, axes: true, polys: [{ pts }, { pts: moved, ans: true }], pts: pts.map((p, i) => ({ x: p[0], y: p[1], label: names[i] })) }, A)}<p>What are the new coordinates of point <b>${names[k]}</b>?</p>${coordBlanks(A, x, y)}`,
      };
    },
  });
  add({
    id: 'Y4_017.fourth', topics: ['Y4_017'], level: 2,
    make(R) {
      const [x1, x2] = R.ints(2, 1, 7).sort((a, b) => a - b), [y1, y2] = R.ints(2, 1, 7).sort((a, b) => a - b);
      if (x2 - x1 < 2 || y2 - y1 < 2) return null;
      const corners = R.shuffle([[x1, y1], [x2, y1], [x2, y2], [x1, y2]].map((p, i) => ({ p, i })));
      const hidden = corners[0];
      // the three shown in order round the rectangle, so B is the corner opposite the hidden one
      const order = [0, 1, 2, 3].map(j => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]][(hidden.i + 1 + j) % 4]);
      const [A0, B0, C0, D0] = order;
      const names = ['A', 'B', 'C'];
      return {
        marks: 1, answer: coord(D0[0], D0[1]),
        check: () => D0[0] === A0[0] + C0[0] - B0[0] && D0[1] === A0[1] + C0[1] - B0[1],
        body: A => `<p>A, B and C are three corners of a rectangle.</p>${D.grid({ cols: 8, rows: 8, cell: 5.5, axes: true, segs: [{ a: A0, b: B0 }, { a: B0, b: C0 }, { a: C0, b: D0, ans: true }, { a: D0, b: A0, ans: true }], pts: [...[A0, B0, C0].map((p, i) => ({ x: p[0], y: p[1], label: names[i] })), { x: D0[0], y: D0[1], label: 'D', ans: true }] }, A)}<p>What are the coordinates of the fourth corner, D?</p>${coordBlanks(A, D0[0], D0[1])}`,
      };
    },
  });

  // Y4_018 properties of polygons; regular polygons
  add({
    id: 'Y4_018.name', topics: ['Y4_018'], level: 1,
    make(R) {
      const n = R.int(3, 8), form = R.int(0, 1), rot = R.int(0, 7) * 10;
      const pts = D.regular(n, 15, rot);
      return {
        marks: 1, answer: form === 0 ? REG_NAMES[n] : F.n(n),
        guide: form === 0 ? (n === 3 ? 'Accept triangle.' : n === 4 ? 'Accept regular quadrilateral.' : `Accept ${POLY_NAMES[n]}.`) : '',
        check: () => pts.length === n && angles(pts).every(a => Math.abs(a - 180 * (n - 2) / n) < 1e-6),
        body: A => form === 0 ? `<p>This is a regular polygon. What is its name?</p>${D.shape({ pts, ticks: pts.map(() => 1) })}${A.line(REG_NAMES[n], 55)}`
          : `<p>How many sides does a ${REG_NAMES[n]} have?</p>${A.box(n, { unit: 'sides' })}`,
      };
    },
  });
  add({
    id: 'Y4_018.which-regular', topics: ['Y4_018'], level: 2,
    make(R) {
      const n = R.int(3, 8), reg = { pts: D.regular(n, 13, R.int(0, 5) * 10), ticks: Array(n).fill(1) };
      const irr = [
        { pts: [[0, 0], [30, 0], [30, 16], [0, 16]], right: [0, 1, 2, 3], ticks: [1, 2, 1, 2] },
        { pts: [[0, 12], [14, 0], [28, 12], [14, 24]], ticks: [1, 1, 1, 1] },
        { pts: [[0, 26], [12, 0], [24, 26]], ticks: [1, 1, 0] },
        { pts: [[0, 8], [10, 0], [26, 4], [24, 22], [6, 24]] },
        { pts: [[0, 10], [10, 0], [20, 10], [10, 28]], ticks: [1, 1, 2, 2] },
        { pts: [[0, 10], [9, 0], [27, 0], [36, 10], [27, 20], [9, 20]] },
        { pts: [[0, 22], [8, 0], [26, 0], [34, 22]], ticks: [1, 0, 1, 0] },
      ];
      const shapes = R.shuffle([reg, ...R.sample(irr, 3)]), idx = shapes.indexOf(reg);
      const letters = ['A', 'B', 'C', 'D'];
      return {
        marks: 1, answer: letters[idx],
        check: () => shapes.filter(s => { const L = s.pts.map((p, i) => dist(p, s.pts[(i + 1) % s.pts.length])); const g = angles(s.pts); return Math.max(...L) - Math.min(...L) < 1e-6 && Math.max(...g) - Math.min(...g) < 1e-6; }).length === 1,
        body: A => `<p>Equal sides are marked with dashes. Tick the shape that is a <b>regular</b> polygon.</p>${D.row(shapes.map((s, i) => ({ fig: D.shape({ ...s, pad: 3, scale: 0.72 }), cap: letters[i] })), 6)}${A.tick(letters, idx)}`,
      };
    },
  });
  add({
    id: 'Y4_018.true-false', topics: ['Y4_018'], level: 2,
    make(R) {
      const n = R.int(5, 8), nm = POLY_NAMES[n], k = R.intNot(3, 9, [n]);
      const st = R.pick([
        [`A rectangle is a regular polygon.`, false, 'A rectangle has four equal angles, but its sides are not all equal.'],
        [`A rhombus with no right angles is a regular polygon.`, false, 'Its four sides are equal, but its angles are not all equal.'],
        [`A square is a regular polygon.`, true, 'A square has four equal sides and four equal angles.'],
        [`An equilateral triangle is a regular polygon.`, true, 'It has three equal sides and three equal angles.'],
        [`A regular ${nm} has ${n} equal sides.`, true, `A ${nm} has ${n} sides, and in a regular polygon all the sides are equal.`],
        [`A regular ${nm} has ${k} equal angles.`, false, `A ${nm} has ${n} sides and ${n} angles, not ${k}.`],
        [`A shape with ${n} equal sides is always a regular ${nm}.`, false, `Its angles must be equal too. A shape can have equal sides but different angles.`],
        [`Every polygon with ${n} sides is called a ${nm}.`, true, `A ${nm} is any polygon with ${n} straight sides.`],
      ]);
      return {
        marks: 1, answer: st[1] ? 'True, with a reason' : 'False, with a reason', guide: 'The mark needs the right choice and a reason.',
        check: () => typeof st[1] === 'boolean' && k !== n,
        body: A => `<p>Is this statement true or false?</p>${sent(st[0])}${trueFalse(A, st[1])}<p>Explain how you know.</p>${A.explain(st[2], 2)}`,
      };
    },
  });

  // Y4_019 lines of symmetry, reflection, complete symmetric figures
  add({
    id: 'Y4_019.complete', topics: ['Y4_019'], level: 2,
    make(R) {
      const m = 4, k = R.int(2, 3), ys = R.ints(k + 2, 0, 8).sort((a, b) => a - b);
      const half = ys.map((y, i) => (i === 0 || i === ys.length - 1) ? [m, y] : [R.int(0, 3), y]);
      const vert = R.chance(0.5);
      const pt = p => vert ? p : [p[1], p[0]];
      const segs = [], ans = [];
      for (let i = 0; i < half.length - 1; i++) {
        segs.push({ a: pt(half[i]), b: pt(half[i + 1]) });
        ans.push({ a: pt([2 * m - half[i][0], half[i][1]]), b: pt([2 * m - half[i + 1][0], half[i + 1][1]]), ans: true });
      }
      const mirror = vert ? { x1: m, y1: -0.3, x2: m, y2: 8.3 } : { x1: -0.3, y1: m, x2: 8.3, y2: m };
      return {
        marks: 1, answer: 'Reflected half drawn', guide: 'All lines must be correct, within 2 mm.',
        check: () => ans.every((s, i) => s.a[vert ? 0 : 1] + segs[i].a[vert ? 0 : 1] === 2 * m),
        body: A => `<p>Complete the shape so that it is symmetrical about the dashed mirror line.</p>${D.grid({ cols: 8, rows: 8, cell: 7, mirror, segs: [...segs, ...ans] }, A)}`,
      };
    },
  });
  add({
    id: 'Y4_019.lines', topics: ['Y4_019'], level: 2,
    make(R) {
      const shapes = [
        ['square', [[0, 0], [24, 0], [24, 24], [0, 24]], 4, { right: [0, 1, 2, 3], ticks: [1, 1, 1, 1] }],
        ['rectangle', [[0, 0], [34, 0], [34, 18], [0, 18]], 2, { right: [0, 1, 2, 3], ticks: [1, 2, 1, 2] }],
        ['rhombus', [[0, 14], [12, 0], [24, 14], [12, 28]], 2, { ticks: [1, 1, 1, 1] }],
        ['kite', [[0, 10], [12, 0], [24, 10], [12, 32]], 1, { ticks: [1, 1, 2, 2] }],
        ['isosceles triangle', [[0, 30], [13, 0], [26, 30]], 1, { ticks: [1, 1, 0] }],
        ['equilateral triangle', D.regular(3, 16, 0), 3, { ticks: [1, 1, 1] }],
        ['regular pentagon', D.regular(5, 15, 0), 5, { ticks: [1, 1, 1, 1, 1] }],
        ['regular hexagon', D.regular(6, 15, 0), 6, { ticks: [1, 1, 1, 1, 1, 1] }],
        ['trapezium', [[0, 20], [8, 0], [26, 0], [34, 20]], 1, { ticks: [1, 0, 1, 0] }],
      ];
      const [nm, base, lines, extra] = R.pick(shapes), rot = R.int(0, 11) * 15;
      const pts = rotPts(base, rot);
      return {
        marks: 1, answer: F.n(lines),
        check: () => symCount(pts) === lines,
        body: A => `<p>How many lines of symmetry does this shape have?</p>${D.shape({ pts, ...extra })}${A.box(lines)}`,
      };
    },
  });
  add({
    id: 'Y4_019.reflect', topics: ['Y4_019'], level: 2,
    make(R) {
      const m = 5, vert = R.chance(0.5);
      const shapes = [[[0, 0], [2, 0], [0, 2]], [[0, 0], [3, 0], [3, 1], [0, 1]], [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]], [[0, 0], [1, 0], [2, 2], [0, 2]], [[0, 0], [3, 0], [1, 2]]];
      const sh = R.pick(shapes), ox = R.int(0, 1), gap = R.int(0, 1), oy = R.int(1, 6);
      const w = Math.max(...sh.map(p => p[0]));
      // shape to the left of the mirror line x = m (or below y = m when horizontal)
      const base = R.chance(0.5) ? sh.map(([x, y]) => [w - x, y]) : sh;
      const local = base.map(([x, y]) => [m - gap - ox - w + x, y + oy]);
      if (local.some(([x, y]) => x < 0 || x > m || y < 0 || y > 9)) return null;
      const refl = local.map(([x, y]) => [2 * m - x, y]);
      const pt = p => vert ? p : [p[1], p[0]];
      const mirror = vert ? { x1: m, y1: -0.3, x2: m, y2: 9.3 } : { x1: -0.3, y1: m, x2: 9.3, y2: m };
      return {
        marks: 1, answer: 'Reflection drawn', guide: 'All corners must be on the right grid points.',
        check: () => refl.every((p, i) => p[0] - m === m - local[i][0]),
        body: A => `<p>Draw the reflection of the shape in the dashed mirror line.</p>${D.grid({ cols: 10, rows: 9, cell: 6, mirror, polys: [{ pts: local.map(pt) }, { pts: refl.map(pt), ans: true }] }, A)}`,
      };
    },
  });

  // new_d_wug7dgn3_1_mwuwv9x9 perimeter of regular and irregular polygons
  const PER = 'new_d_wug7dgn3_1_mwuwv9x9';
  add({
    id: PER + '.regular', topics: [PER], level: 1,
    make(R) {
      const n = R.int(3, 8), s = R.int(2, 15), P0 = n * s, back = R.chance(0.35), pts = D.regular(n, 16, R.int(0, 3) * 15);
      const labels = pts.map((_, i) => i === 0 && !back ? `${s} cm` : '');
      return {
        marks: 1, answer: back ? `${s} cm` : `${P0} cm`,
        check: () => P0 / n === s,
        body: A => back ? `<p>A ${REG_NAMES[n]} has a perimeter of <b>${P0} cm</b>.</p><p>How long is one side?</p>${A.box(s, { unit: 'cm' })}`
          : `<p>This is a ${REG_NAMES[n]}.</p>${D.shape({ pts, labels, ticks: pts.map(() => 1) })}<p>What is its perimeter?</p>${A.box(P0, { unit: 'cm' })}`,
      };
    },
  });
  add({
    id: PER + '.irregular', topics: [PER], level: 2,
    make(R) {
      const nSides = R.int(3, 5), r = R.int(16, 22);
      const base = [];
      const angs = R.ints(nSides, 0, 11).sort((a, b) => a - b).map(a => a * 30 + R.int(-8, 8));
      for (const a of angs) { const rr = r * (0.75 + R.f() * 0.25); base.push([rr * Math.cos(a * Math.PI / 180), rr * Math.sin(a * Math.PI / 180)]); }
      const L = base.map((p, i) => dist(p, base[(i + 1) % nSides]));
      if (Math.min(...L) < 9) return null;
      const unit = R.pick(['cm', 'm']), sc = R.pick([2, 3, 4]);
      const lens = L.map(l => Math.max(2, Math.round(l / sc)));
      const tot = lens.reduce((a, b) => a + b, 0), miss = R.chance(0.4), mi = R.int(0, nSides - 1);
      const labels = lens.map((l, i) => miss && i === mi ? '?' : `${l} ${unit}`);
      return {
        marks: 1, answer: miss ? `${lens[mi]} ${unit}` : `${tot} ${unit}`,
        check: () => tot - lens.filter((_, i) => i !== mi).reduce((a, b) => a + b, 0) === lens[mi],
        body: A => `${miss ? `<p>The perimeter of this shape is <b>${tot} ${unit}</b>.</p>` : ''}${D.shape({ pts: base, labels })}<p style="text-align:center;font-size:10pt">Not drawn to scale</p><p>${miss ? 'Work out the length of the side marked ?' : 'What is the perimeter of this shape?'}</p>${A.box(miss ? lens[mi] : tot, { unit })}`,
      };
    },
  });
  add({
    id: PER + '.rectilinear', topics: [PER], level: 3,
    make(R) {
      const W = R.int(8, 16), H = R.int(6, 12), a = R.int(2, W - 3), b = R.int(2, H - 3), k = 3.2;
      // sides in order: bottom W, right H-b, notch a (horizontal), notch b (vertical), top W-a, left H
      const ptsU = [[0, 0], [W, 0], [W, H - b], [W - a, H - b], [W - a, H], [0, H]];
      const pts = ptsU.map(([x, y]) => [x * k, (H - y) * k]);
      const sides = [W, H - b, a, b, W - a, H];
      const hideH = R.pick([0, 2, 4]), hideV = R.pick([1, 3, 5]);
      const labels = sides.map((s, i) => i === hideH || i === hideV ? '' : `${s} cm`);
      const per = 2 * (W + H);
      return {
        marks: 2, method: true, answer: `${per} cm`, guide: `Award 1 mark for finding both missing sides (${sides[hideH]} cm and ${sides[hideV]} cm).`,
        check: () => sides.reduce((s, x) => s + x, 0) === per,
        body: A => `<p>All the corners of this shape are right angles.</p>${D.shape({ pts, labels, scale: 0.9 })}<p>What is the perimeter of the shape?</p>${A.work(`Missing sides: ${sides[hideH]} cm and ${sides[hideV]} cm<br>${sides.join(' + ')} = ${per}`, 22)}${A.box(per, { unit: 'cm' })}`,
      };
    },
  });

  /* =====================================================================
   * National Curriculum topics: number and place value
   * ===================================================================== */

  // Y4_NC_01 count in 6, 7, 9, 25 and 1,000; 1,000 more or less
  add({
    id: 'Y4_NC_01.sequence', topics: ['Y4_NC_01'], level: 1,
    make(R) {
      const step = R.pick([6, 7, 9, 25, 1000]), down = R.chance(0.4);
      const start = step === 1000 ? R.int(102, 4999) : step === 25 ? R.int(1, 30) * 25 : R.int(1, 8) * step;
      let terms = [0, 1, 2, 3, 4, 5].map(i => start + i * step); if (down) terms = terms.reverse();
      const hide = R.sample([1, 2, 3, 4, 5], 2).sort((a, b) => a - b);
      return {
        marks: 1, answer: hide.map(i => F.n(terms[i])).join(' and '), guide: 'Both needed.',
        check: () => terms.every((x, i) => i === 0 || Math.abs(x - terms[i - 1]) === step),
        body: A => `<p>Write the missing numbers in this sequence.</p>${sent(seqHtml(A, terms, hide, step === 1000 ? 20 : 15))}`,
      };
    },
  });
  add({
    id: 'Y4_NC_01.thousand', topics: ['Y4_NC_01'], level: 1,
    make(R) {
      const n = R.int(1050, 9800), form = R.int(0, 2);
      const ans = form === 0 ? n + 1000 : n - 1000;
      return {
        marks: 1, answer: F.n(ans),
        check: () => form === 0 ? ans - 1000 === n : ans + 1000 === n,
        body: A => form === 0 ? `<p>What is 1,000 more than <b>${F.n(n)}</b>?</p>${A.box(F.n(ans))}`
          : form === 1 ? `<p>What is 1,000 less than <b>${F.n(n)}</b>?</p>${A.box(F.n(ans))}`
            : `<p>Write the missing number.</p>${sent(`${A.blank(F.n(ans), 20)} + 1,000 = ${F.n(n)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_01.will-say', topics: ['Y4_NC_01'], level: 2,
    make(R) {
      const who = R.name(), yes = R.chance(0.5), kind = R.int(0, 1);
      if (kind === 0) {
        const n = yes ? R.int(9, 39) * 25 : R.int(9, 39) * 25 + R.pick([5, 10, 15, -5, -10]);
        const end = String(n).slice(-2);
        return {
          marks: 1, answer: yes ? 'Yes, with a reason' : 'No, with a reason', guide: 'The mark needs the right choice and a reason.',
          check: () => (n % 25 === 0) === yes,
          body: A => `<p>${who} counts in 25s from 0.</p><p>Will ${who} say the number <b>${F.n(n)}</b>?</p>${yesNo(A, yes)}<p>Explain how you know.</p>${A.explain(yes ? `Yes. ${F.n(n)} = 25 ${F.times} ${n / 25}. Multiples of 25 end in 00, 25, 50 or 75.` : `No. Multiples of 25 end in 00, 25, 50 or 75, but ${F.n(n)} ends in ${end}.`, 2)}`,
        };
      }
      const s = R.int(101, 999), n = yes ? s + R.int(2, 8) * 1000 : s + R.int(2, 8) * 1000 + R.pick([10, 100, -10, -100]);
      return {
        marks: 1, answer: yes ? 'Yes, with a reason' : 'No, with a reason', guide: 'The mark needs the right choice and a reason.',
        check: () => ((n - s) % 1000 === 0) === yes,
        body: A => `<p>${who} counts on in 1,000s from <b>${F.n(s)}</b>.</p><p>Will ${who} say the number <b>${F.n(n)}</b>?</p>${yesNo(A, yes)}<p>Explain how you know.</p>${A.explain(yes ? `Yes. Counting in 1,000s only changes the thousands digit, and ${F.n(n)} ends in ${String(s).padStart(3, '0')}.` : `No. Counting in 1,000s only changes the thousands digit, so every number ends in ${String(s).padStart(3, '0')}.`, 2)}`,
      };
    },
  });

  // Y4_NC_02 count backwards through zero; negative numbers
  add({
    id: 'Y4_NC_02.sequence', topics: ['Y4_NC_02'], level: 1,
    make(R) {
      const who0 = R.name();
      const step = R.int(1, 5), start = R.int(1, 3) * step + R.int(0, step - 1);
      const terms = [0, 1, 2, 3, 4, 5, 6].map(i => start - i * step);
      if (terms[6] >= 0) return null;
      const negIdx = terms.map((t, i) => t < 0 ? i : -1).filter(i => i > 0);
      const hide = [...new Set([R.pick(negIdx), R.int(1, 6)])].sort((a, b) => a - b);
      if (hide.length < 2) return null;
      return {
        marks: 1, answer: hide.map(i => F.n(terms[i])).join(' and '), guide: 'Both needed. Negative numbers need the minus sign.',
        check: () => terms.every((x, i) => i === 0 || terms[i - 1] - x === step),
        body: A => `<p>${who0} counts back in ${step}s. Write the missing numbers.</p>${sent(seqHtml(A, terms, hide, 13))}`,
      };
    },
  });
  add({
    id: 'Y4_NC_02.thermometer', topics: ['Y4_NC_02'], level: 2,
    make(R) {
      const form = R.int(0, 1);
      if (form === 0) {
        const t = R.intNot(-9, 8, [0]) * 2;
        if (t > 0 && R.chance(0.6)) return null;
        return {
          marks: 1, answer: `${F.n(t)} °C`,
          check: () => t % 2 === 0 && t >= -18 && t <= 16,
          body: A => `<p>What temperature does the thermometer show?</p>${D.scale({ min: -20, max: 20, major: 10, minor: 2, level: t, kind: 'thermo', unit: '°C', height: 50 }, A)}${A.box(F.n(t), { unit: '°C' })}`,
        };
      }
      const t = R.int(1, 9), f = R.int(t + 1, t + 9), ans = t - f, place = R.pick(['In the morning', 'At midnight', 'At 6 pm']);
      return {
        marks: 1, answer: `${F.n(ans)} °C`,
        check: () => ans + f === t && ans < 0,
        body: A => `<p>${place} the temperature is <b>${t} °C</b>.</p><p>By the next hour it has fallen by <b>${f} degrees</b>.</p><p>What is the temperature now?</p>${A.box(F.n(ans), { unit: '°C' })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_02.line', topics: ['Y4_NC_02'], level: 1,
    make(R) {
      const wide = R.chance(0.5), min = wide ? -20 : -10, max = wide ? 0 : 10;
      const v = R.int(min + 1, -1); if (v % 5 === 0) return null;
      return {
        marks: 1, answer: F.n(v),
        check: () => v < 0 && v > min,
        body: A => `<p>What number is the arrow pointing to?</p>${D.numberLine({ min, max, minor: 1, major: 5, width: 140, marks: [{ v, box: true }] }, A)}`,
      };
    },
  });

  // Y4_NC_03 compare and order numbers beyond 1,000; rounding to 10, 100, 1,000
  add({
    id: 'Y4_NC_03.order', topics: ['Y4_NC_03'], level: 2,
    make(R) {
      const ds = R.ints(4, 1, 9), set = new Set();
      for (let k = 0; set.size < 4 && k < 200; k++) set.add(+R.shuffle(ds).join(''));
      if (set.size < 4) return null;
      const nums = [...set], sorted = nums.slice().sort((a, b) => a - b);
      return {
        marks: 1, answer: sorted.map(n => F.n(n)).join(', '),
        check: () => sorted.every((x, i) => i === 0 || String(sorted[i - 1]) < String(x)),
        body: A => `<p>Write these numbers in order, starting with the <b>smallest</b>.</p>${sent(nums.map(n => F.n(n)).join('&nbsp;&nbsp;&nbsp;&nbsp;'))}${A.boxes(sorted.map(n => [F.n(n)]), { w: 22 })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_03.compare', topics: ['Y4_NC_03'], level: 1,
    make(R) {
      const a = R.int(1000, 9999), pos = R.int(1, 3), da = String(a).split('').map(Number), db = da.slice();
      db[pos] = R.intNot(0, 9, [da[pos]]); for (let i = pos + 1; i < 4; i++) db[i] = R.int(0, 9);
      const b = +db.join('');
      const big = R.chance(0.3) ? b * 10 + R.int(0, 9) : b;
      const sym = cmpSym(a, big);
      return {
        marks: 1, answer: sym,
        check: () => (sym === LT) === (String(a).length < String(big).length || (String(a).length === String(big).length && String(a) < String(big))),
        body: A => `<p>Write &lt; or &gt; to make this correct.</p>${sent(`${F.n(a)} ${A.blank(sym, 12)} ${F.n(big)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_03.round-tick', topics: ['Y4_NC_03'], level: 2,
    make(R) {
      const u = R.pick([10, 100, 1000]), X = u === 1000 ? R.int(2, 8) * 1000 : u === 100 ? R.int(12, 98) * 100 : R.int(102, 998) * 10;
      const h = u / 2, ins = [], outs = [];
      for (let k = 0; k < 200 && (ins.length < 2 || outs.length < 3); k++) {
        const din = R.int(-h + 1, h - 1), dout = R.pick([-1, 1]) * R.int(h + 1, Math.round(1.6 * u));
        if (din !== 0 && ins.length < 2 && !ins.includes(X + din)) ins.push(X + din);
        if (outs.length < 3 && !outs.includes(X + dout) && (X + dout) % u !== 0) outs.push(X + dout);
      }
      if (ins.length < 2 || outs.length < 3) return null;
      const opts = R.shuffle([...ins, ...outs]);
      const right = opts.map((x, i) => Math.round(x / u) * u === X ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => F.n(opts[i])).join(' and '), guide: 'Both needed, and no others ticked.',
        check: () => right.length === 2 && right.every(i => Math.abs(opts[i] - X) < h),
        body: A => `<p>Tick the <b>two</b> numbers that round to <b>${F.n(X)}</b> when rounded to the nearest ${F.n(u)}.</p>${A.tick(opts.map(x => F.n(x)), right)}`,
      };
    },
  });

  // Y4_NC_04 Roman numerals to 100
  add({
    id: 'Y4_NC_04.read', topics: ['Y4_NC_04'], level: 1,
    make(R) {
      const n = R.int(11, 100);
      return {
        marks: 1, answer: F.n(n),
        check: () => F.roman(n).length > 0 && n >= 1 && n <= 100,
        body: A => `<p>Write this Roman numeral as a number.</p>${sent(`<b>${F.roman(n)}</b>`)}${A.box(n)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_04.write', topics: ['Y4_NC_04'], level: 1,
    make(R) {
      const n = R.pick([R.int(11, 100), R.pick([4, 9, 14, 19, 24, 29, 39, 40, 44, 49, 54, 59, 64, 69, 74, 79, 84, 89, 90, 94, 99])]);
      const rom = F.roman(n);
      const val = { I: 1, V: 5, X: 10, L: 50, C: 100 };
      return {
        marks: 1, answer: rom,
        check: () => { let s = 0; for (let i = 0; i < rom.length; i++) { const v = val[rom[i]], nx = val[rom[i + 1]] || 0; s += v < nx ? -v : v; } return s === n; },
        body: A => `<p>Write <b>${n}</b> in Roman numerals.</p>${A.line(rom, 40)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_04.circle', topics: ['Y4_NC_04'], level: 2,
    make(R) {
      const form = R.int(0, 1);
      if (form === 0) {
        const n = R.int(14, 90), others = [n + R.pick([-1, 1]), n + R.pick([-10, 10]), n + R.pick([-9, 9, -5, 5, 4, -4])];
        const vals = [n, ...others];
        if (new Set(vals).size < 4 || vals.some(v => v < 1 || v > 100)) return null;
        const opts = R.shuffle(vals);
        return {
          marks: 1, answer: F.roman(n),
          check: () => opts.map(F.roman).filter(r => r === F.roman(n)).length === 1,
          body: A => `<p>Circle the Roman numeral for <b>${n}</b>.</p>${A.circle(opts.map(F.roman), opts.indexOf(n))}`,
        };
      }
      const vals = R.ints(4, 11, 99), big = Math.max(...vals);
      return {
        marks: 1, answer: F.roman(big),
        check: () => vals.filter(v => v >= big).length === 1,
        body: A => `<p>Circle the <b>greatest</b> number.</p>${A.circle(vals.map(F.roman), vals.indexOf(big))}`,
      };
    },
  });

  /* =====================================================================
   * Addition and subtraction
   * ===================================================================== */

  // Y4_NC_05 column addition and subtraction up to 4 digits
  add({
    id: 'Y4_NC_05.column', topics: ['Y4_NC_05'], level: 1,
    make(R) {
      const sub = R.chance(0.5);
      const a = R.int(2000, 9499), b = R.int(1100, sub ? a - 500 : 9999 - a);
      if (b < 1000) return null;
      const ans = sub ? a - b : a + b;
      if (ans > 9999 || ans <= 0) return null;
      return {
        marks: 1, answer: F.n(ans),
        check: () => sub ? ans + b === a : ans - a === b,
        body: A => `<p>Work out</p>${sent(`${F.n(a)} ${sub ? F.minus : '+'} ${F.n(b)} = ${A.blank(F.n(ans), 22)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_05.missing-digits', topics: ['Y4_NC_05'], level: 2,
    make(R) {
      const sub = R.chance(0.5);
      const a = R.int(1200, 6999), b = R.int(1100, 2999), s = a + b;
      if (s > 9999) return null;
      // addition: rows a, b, s (hide in a and b). subtraction: rows s, b, a (hide in b and a)
      const rows = sub ? [s, b, a] : [a, b, s], hideRows = sub ? [1, 2] : [0, 1];
      const i1 = R.int(0, 3), i2 = R.intNot(0, 3, [i1]), hides = [[hideRows[0], i1], [hideRows[1], i2]];
      const dg = rows.map(n => String(n).split('').map(Number));
      const hidden = hides.map(([r, i]) => dg[r][i]);
      const cs = 'style="width:9mm;height:9mm;text-align:center;font-size:14pt;border:0;padding:0"';
      const cs2 = cs.replace('padding:0', 'padding:0;border-top:.5mm solid #000');
      const cell = (r, i, A) => `<td ${r === 2 ? cs2 : cs}>${hides.some(([hr, hi]) => hr === r && hi === i) ? A.blank(dg[r][i], 8) : dg[r][i]}</td>`;
      return {
        marks: 1, answer: `${hidden[0]} and ${hidden[1]}`, guide: 'Both digits needed.',
        check: () => sub ? +dg[0].join('') - +dg[1].join('') === +dg[2].join('') : +dg[0].join('') + +dg[1].join('') === +dg[2].join(''),
        body: A => `<p>Write the missing digits to make this ${sub ? 'subtraction' : 'addition'} correct.</p>
          <table style="margin:2mm auto;border-collapse:collapse"><tr><td ${cs}></td>${[0, 1, 2, 3].map(i => cell(0, i, A)).join('')}</tr>
          <tr><td ${cs}>${sub ? F.minus : '+'}</td>${[0, 1, 2, 3].map(i => cell(1, i, A)).join('')}</tr>
          <tr><td ${cs2}></td>${[0, 1, 2, 3].map(i => cell(2, i, A)).join('')}</tr></table>`,
      };
    },
  });
  add({
    id: 'Y4_NC_05.word', topics: ['Y4_NC_05'], level: 3,
    make(R) {
      const form = R.int(0, 2);
      if (form === 0) {
        const T = R.pick([5000, 6000, 8000, 10000]), a = R.int(1200, 3500), b = R.int(1100, 3200), need = T - a - b;
        if (need < 150 || need % 10 === 0) return null;
        return {
          marks: 2, method: true, answer: '£' + F.n(need),
          check: () => need + b + a === T,
          body: A => `<p>A school wants to raise <b>£${F.n(T)}</b> for a new playground.</p><p>It raises <b>£${F.n(a)}</b> in the autumn and <b>£${F.n(b)}</b> in the spring.</p><p>How much more money does it need?</p>${A.work(`${F.n(a)} + ${F.n(b)} = ${F.n(a + b)}<br>${F.n(T)} ${F.minus} ${F.n(a + b)} = ${F.n(need)}`, 30)}${A.box(F.n(need), { pre: '£' })}`,
        };
      }
      if (form === 1) {
        const S = R.int(16, 45) * 100, a = R.int(Math.floor(S * 0.5), S - 120), b = R.int(Math.floor(S * 0.5), S - 120), empty = 2 * S - a - b;
        return {
          marks: 2, method: true, answer: F.n(empty),
          check: () => (S - a) + (S - b) === empty,
          body: A => `<p>A theatre has <b>${F.n(S)}</b> seats.</p><p>On Friday <b>${F.n(a)}</b> seats are sold. On Saturday <b>${F.n(b)}</b> seats are sold.</p><p>How many seats are <b>not</b> sold over the two nights?</p>${A.work(`${F.n(S)} ${F.minus} ${F.n(a)} = ${F.n(S - a)}<br>${F.n(S)} ${F.minus} ${F.n(b)} = ${F.n(S - b)}<br>${F.n(S - a)} + ${F.n(S - b)} = ${F.n(empty)}`, 32)}${A.box(F.n(empty), { unit: 'seats' })}`,
        };
      }
      const start = R.int(1200, 4800), trip = R.int(1050, 2400), end = start + 2 * trip;
      if (end > 9999) return null;
      return {
        marks: 2, method: true, answer: F.n(end) + ' km',
        check: () => end - trip - trip === start,
        body: A => `<p>A car has travelled <b>${F.n(start)} km</b>.</p><p>It makes a journey of <b>${F.n(trip)} km</b> and then drives the same way back.</p><p>How far has the car travelled now?</p>${A.work(`${F.n(trip)} + ${F.n(trip)} = ${F.n(2 * trip)}<br>${F.n(start)} + ${F.n(2 * trip)} = ${F.n(end)}`, 30)}${A.box(F.n(end), { unit: 'km' })}`,
      };
    },
  });

  // Y4_NC_06 estimate; use the inverse to check
  add({
    id: 'Y4_NC_06.estimate', topics: ['Y4_NC_06'], level: 1,
    make(R) {
      const u = R.pick([100, 100, 1000]), sub = R.chance(0.4);
      const a = R.int(2100, 8900), b = R.int(1100, sub ? a - 600 : 9500 - a);
      if (b < 1000 || a % u === u / 2 || b % u === u / 2 || a % u === 0 || b % u === 0) return null;
      const ra = Math.round(a / u) * u, rb = Math.round(b / u) * u, est = sub ? ra - rb : ra + rb;
      const alt = x => x - (x % u) + ((x % u) > u / 2 ? u : 0);
      if (est <= 0) return null;
      return {
        marks: 1, answer: F.n(est),
        check: () => est === (sub ? alt(a) - alt(b) : alt(a) + alt(b)),
        body: A => `<p>Round each number to the nearest ${F.n(u)} to estimate the answer.</p>${sent(`${F.n(a)} ${sub ? F.minus : '+'} ${F.n(b)}`)}${A.box(F.n(est), { label: 'Estimate' })}`,
        guide: `${F.n(ra)} ${sub ? F.minus : '+'} ${F.n(rb)} = ${F.n(est)}.`,
      };
    },
  });
  add({
    id: 'Y4_NC_06.inverse', topics: ['Y4_NC_06'], level: 2,
    make(R) {
      const a = R.int(3000, 9500), b = R.int(1100, a - 800), c = a - b, sub = R.chance(0.5), who = R.name();
      const shown = sub ? `${F.n(a)} ${F.minus} ${F.n(b)} = ${F.n(c)}` : `${F.n(c)} + ${F.n(b)} = ${F.n(a)}`;
      const opts = sub
        ? [[`${F.n(c)} + ${F.n(b)}`, c + b === a], [`${F.n(a)} + ${F.n(b)}`, false], [`${F.n(c)} ${F.minus} ${F.n(b)}`, false], [`${F.n(b)} ${F.minus} ${F.n(c)}`, false]]
        : [[`${F.n(a)} ${F.minus} ${F.n(b)}`, a - b === c], [`${F.n(a)} + ${F.n(b)}`, false], [`${F.n(c)} ${F.minus} ${F.n(b)}`, false], [`${F.n(c)} + ${F.n(a)}`, false]];
      const sh = R.shuffle(opts), idx = sh.findIndex(o => o[1]);
      return {
        marks: 1, answer: sh[idx][0],
        check: () => sh.filter(o => o[1]).length === 1 && c + b === a,
        body: A => `<p>${who} works out</p>${sent(shown)}<p>Tick the calculation ${who} could use to check the answer.</p>${A.tick(sh.map(o => o[0]), idx, { col: true })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_06.wrong', topics: ['Y4_NC_06'], level: 2,
    make(R) {
      const a = R.int(3000, 9500), b = R.int(1100, a - 800), c = a - b, wrong = c + R.pick([100, -100, 10, -10, 1000]), who = R.name();
      if (wrong <= 0) return null;
      return {
        marks: 1, answer: 'Explanation using addition', guide: `Accept an explanation that adds ${F.n(wrong)} + ${F.n(b)} (or ${F.n(b)} + ${F.n(wrong)}) and shows it is not ${F.n(a)}.`,
        check: () => wrong + b !== a && c + b === a,
        body: A => `<p>${who} says,</p>${sent(`${F.n(a)} ${F.minus} ${F.n(b)} = ${F.n(wrong)}`)}<p>Use the inverse operation to show that ${who} is wrong.</p>${A.explain(`${F.n(wrong)} + ${F.n(b)} = ${F.n(wrong + b)}, which is not ${F.n(a)}, so ${who} is wrong.`, 3)}`,
      };
    },
  });

  /* =====================================================================
   * Multiplication and division (NC)
   * ===================================================================== */

  // Y4_NC_07 formal written multiplication, 2- and 3-digit by 1-digit
  add({
    id: 'Y4_NC_07.calc', topics: ['Y4_NC_07'], level: 1,
    make(R) {
      const a = R.chance(0.5) ? R.int(23, 98) : R.int(112, 899), d = R.int(3, 9), ans = a * d;
      if (a % 10 === 0) return null;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans / d === a,
        body: A => `<p>Work out</p>${sent(`${F.n(a)} ${F.times} ${d} = ${A.blank(F.n(ans), 22)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_07.missing-digit', topics: ['Y4_NC_07'], level: 2,
    make(R) {
      const a = R.int(112, 899), d = R.int(3, 9), p = a * d, k = R.int(0, 2), dg = String(a).split('').map(Number);
      return {
        marks: 1, answer: F.n(dg[k]),
        check: () => Math.floor(p / d / Math.pow(10, 2 - k)) % 10 === dg[k],
        body: A => `<p>Write the missing digit.</p>${sent(`${dg.map((x, i) => i === k ? A.blank(x, 10) : x).join('')} ${F.times} ${d} = ${F.n(p)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_07.word', topics: ['Y4_NC_07'], level: 3,
    make(R) {
      const form = R.int(0, 1);
      if (form === 0) {
        const per = R.int(124, 365), n = R.int(3, 8), tot = per * n, g = R.int(Math.floor(tot / 3), tot - 50), left = tot - g;
        return {
          marks: 2, method: true, answer: F.n(left),
          check: () => left + g === n * per,
          body: A => `<p>A box holds <b>${per}</b> pencils.</p><p>A school buys <b>${n}</b> boxes. It gives out <b>${F.n(g)}</b> pencils.</p><p>How many pencils are left?</p>${A.work(`${per} ${F.times} ${n} = ${F.n(tot)}<br>${F.n(tot)} ${F.minus} ${F.n(g)} = ${F.n(left)}`, 30)}${A.box(F.n(left), { unit: 'pencils' })}`,
        };
      }
      const c = R.int(105, 245), n = R.int(3, 4), tot = c * n, pay = 1000, ch = pay - tot;
      if (ch <= 0) return null;
      return {
        marks: 2, method: true, answer: '£' + F.n(ch),
        check: () => ch + n * c === pay,
        body: A => `<p>A holiday costs <b>£${c}</b> for each person.</p><p><b>${n}</b> people go on the holiday. They pay with <b>£1,000</b>.</p><p>How much change do they get?</p>${A.work(`${c} ${F.times} ${n} = ${F.n(tot)}<br>1,000 ${F.minus} ${F.n(tot)} = ${F.n(ch)}`, 30)}${A.box(F.n(ch), { pre: '£' })}`,
      };
    },
  });

  // Y4_NC_08 multiply three numbers; factor pairs
  add({
    id: 'Y4_NC_08.three', topics: ['Y4_NC_08'], level: 1,
    make(R) {
      const nice = R.chance(0.5), a = nice ? R.pick([2, 5]) : R.int(2, 6), b = R.int(3, 9), c = nice ? (a === 2 ? 5 : 2) : R.int(2, 5);
      const ord = R.shuffle([a, b, c]), ans = a * b * c;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans / ord[2] === ord[0] * ord[1],
        body: A => `<p>Work out</p>${sent(`${ord.join(` ${F.times} `)} = ${A.blank(F.n(ans), 18)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_08.pairs', topics: ['Y4_NC_08'], level: 2,
    make(R) {
      const n = R.pick([12, 18, 20, 24, 28, 30, 32, 36, 40, 42, 48, 60]);
      const pairs = []; for (let f = 1; f * f <= n; f++) if (n % f === 0) pairs.push([f, n / f]);
      if (pairs.length < 3) return null;
      const hide = R.sample(pairs.map((_, i) => i), 2).sort((a, b) => a - b);
      return {
        marks: 1, answer: hide.map(i => pairs[i][1]).join(' and '), guide: 'Both needed.',
        check: () => pairs.every(([x, y]) => x * y === n),
        body: A => `<p>Complete the factor pairs of <b>${n}</b>.</p>${pairs.map(([x, y], i) => sent(`${x} ${F.times} ${hide.includes(i) ? A.blank(y) : y} = ${n}`)).join('')}`,
      };
    },
  });
  add({
    id: 'Y4_NC_08.not-factor', topics: ['Y4_NC_08'], level: 2,
    make(R) {
      const n = R.pick([24, 30, 36, 40, 42, 48, 56, 60, 72]);
      const fs = []; for (let f = 2; f < n; f++) if (n % f === 0) fs.push(f);
      const nons = []; for (let f = 3; f <= Math.min(n / 2, 20); f++) if (n % f !== 0) nons.push(f);
      if (fs.length < 3 || !nons.length) return null;
      const non = R.pick(nons), opts = R.shuffle([...R.sample(fs.filter(f => f <= 20), 3), non]);
      if (opts.length < 4 || new Set(opts).size < 4) return null;
      return {
        marks: 1, answer: F.n(non),
        check: () => opts.filter(x => n % x !== 0).length === 1,
        body: A => `<p>Circle the number that is <b>not</b> a factor of ${n}.</p>${A.circle(opts, opts.indexOf(non))}`,
      };
    },
  });

  // Y4_NC_09 scaling and correspondence problems
  add({
    id: 'Y4_NC_09.outfits', topics: ['Y4_NC_09'], level: 2,
    make(R) {
      const c = R.pick([['hats', 'scarves', 'one hat and one scarf', 'outfits'], ['kinds of bread', 'fillings', 'one kind of bread and one filling', 'sandwiches'], ['ice cream flavours', 'kinds of cone', 'one flavour and one cone', 'ice creams'], ['T-shirts', 'pairs of shorts', 'one T-shirt and one pair of shorts', 'outfits']]);
      const a = R.int(2, 6), b = R.int(3, 8), tot = a * b, rev = R.chance(0.4), who = R.name();
      let count = 0; for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) count++;
      return {
        marks: 1, answer: F.n(rev ? b : tot),
        check: () => count === tot && tot / a === b,
        body: A => rev ? `<p>${who} has <b>${a}</b> ${c[0]} and some ${c[1]}.</p><p>${who} can make <b>${tot}</b> different ${c[3]}, each using ${c[2]}.</p><p>How many ${c[1]} does ${who} have?</p>${A.box(b)}`
          : `<p>${who} has <b>${a}</b> ${c[0]} and <b>${b}</b> ${c[1]}.</p><p>Each ${c[3].replace(/s$/, '')} uses ${c[2]}.</p><p>How many different ${c[3]} can ${who} make?</p>${A.box(tot)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_09.scaling', topics: ['Y4_NC_09'], level: 2,
    make(R) {
      const form = R.int(0, 2), k = R.int(2, 6), who = R.name();
      if (form === 0) {
        const p = R.pick([2, 3, 4]), e = R.int(2, 5), ans = e * k;
        return {
          marks: 1, answer: F.n(ans),
          check: () => ans / e === (p * k) / p,
          body: A => `<p>A recipe for <b>${p}</b> people uses <b>${e}</b> eggs.</p><p>How many eggs are needed for <b>${p * k}</b> people?</p>${A.box(ans, { unit: 'eggs' })}`,
        };
      }
      if (form === 1) {
        const x = R.int(4, 15), ans = x * k;
        return {
          marks: 1, answer: `${ans} cm`,
          check: () => ans / k === x,
          body: A => `<p>A red ribbon is <b>${x} cm</b> long.</p><p>A blue ribbon is <b>${k} times</b> as long as the red ribbon.</p><p>How long is the blue ribbon?</p>${A.box(ans, { unit: 'cm' })}`,
        };
      }
      const x = R.int(4, 12), big = x * k, other = R.name();
      if (other === who) return null;
      return {
        marks: 1, answer: F.n(x),
        check: () => x * k === big,
        body: A => `<p>${who} has <b>${big}</b> stickers.</p><p>${who} has <b>${k} times</b> as many stickers as ${other}.</p><p>How many stickers does ${other} have?</p>${A.box(x, { unit: 'stickers' })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_09.word', topics: ['Y4_NC_09'], level: 3,
    make(R) {
      const s = R.int(4, 9), k = R.int(3, 6), b = R.int(2, 5), big = s * k, tot = big * b;
      return {
        marks: 2, method: true, answer: F.n(tot),
        check: () => tot / b / k === s,
        body: A => `<p>A small box holds <b>${s}</b> pens.</p><p>A big box holds <b>${k} times</b> as many pens as a small box.</p><p>How many pens are there in <b>${b}</b> big boxes?</p>${A.work(`${s} ${F.times} ${k} = ${big}<br>${big} ${F.times} ${b} = ${tot}`, 28)}${A.box(tot, { unit: 'pens' })}`,
      };
    },
  });

  /* =====================================================================
   * Fractions and decimals (NC)
   * ===================================================================== */

  // Y4_NC_10 families of equivalent fractions
  const SIMPLE = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6], [3, 8], [5, 8], [7, 10], [3, 10]];
  add({
    id: 'Y4_NC_10.missing', topics: ['Y4_NC_10'], level: 1,
    make(R) {
      const [n, d] = R.pick(SIMPLE), k = R.int(2, 6), form = R.int(0, 2);
      const ans = form === 0 ? n * k : form === 1 ? d * k : n;
      return {
        marks: 1, answer: F.n(ans),
        check: () => (form === 0 ? ans * d === n * d * k : form === 1 ? n * ans === n * k * d : ans * d * k === n * k * d),
        body: A => `<p>Write the missing number.</p>${sent(form === 0 ? `${F.frac(n, d)} = ${F.frac(A.blank(ans, 10), d * k)}` : form === 1 ? `${F.frac(n, d)} = ${F.frac(n * k, A.blank(ans, 10))}` : `${F.frac(A.blank(ans, 10), d)} = ${F.frac(n * k, d * k)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_10.odd-one-out', topics: ['Y4_NC_10'], level: 2,
    make(R) {
      const [n, d] = R.pick(SIMPLE), ks = R.ints(3, 1, 6);
      const eq = ks.map(k => [n * k, d * k]), k2 = R.int(2, 6), fake = R.chance(0.5) ? [n * k2 + 1, d * k2] : [n * k2, d * k2 + 1];
      if (eq.some(([a, b]) => a === fake[0] && b === fake[1])) return null;
      const opts = R.shuffle([...eq, fake]), idx = opts.indexOf(fake);
      return {
        marks: 1, answer: F.frac(fake[0], fake[1]),
        check: () => opts.filter(([a, b]) => a * d !== b * n).length === 1 && fake[0] * d !== fake[1] * n,
        body: A => `<p>Three of these fractions are equivalent. Circle the one that is <b>not</b>.</p>${A.circle(opts.map(([a, b]) => F.frac(a, b)), idx)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_10.bars', topics: ['Y4_NC_10'], level: 2,
    make(R) {
      const [n, d] = R.pick(SIMPLE.filter(([, d]) => d <= 6)), k = R.int(2, d <= 3 ? 4 : 2), N = n * k, Dd = d * k;
      return {
        marks: 1, answer: F.frac(N, Dd), guide: 'Both numbers needed.',
        check: () => N * d === Dd * n,
        body: A => `<p>The two bars are the same length. The same amount is shaded.</p>${D.fractionBar({ parts: d, shaded: n, width: 108 })}${D.fractionBar({ parts: Dd, shaded: N, width: 108 })}<p>Write the missing numbers.</p>${sent(`${F.frac(n, d)} = ${F.frac(A.blank(N, 10), A.blank(Dd, 10))}`)}`,
      };
    },
  });

  // Y4_NC_11 count in hundredths; hundredths from dividing by 100
  add({
    id: 'Y4_NC_11.sequence', topics: ['Y4_NC_11'], level: 1,
    make(R) {
      const who0 = R.name();
      const start = R.int(2, 93), asFrac = R.chance(0.3), down = R.chance(0.3);
      let terms = [0, 1, 2, 3, 4, 5].map(i => start + i); if (down) terms = terms.reverse();
      const hide = R.sample([1, 2, 3, 4, 5], 2).sort((a, b) => a - b);
      const show = (t, A, h) => asFrac ? F.frac(h ? A.blank(t, 9) : t, 100) : (h ? A.blank(dec(t, 2, true), 15) : dec(t, 2, true));
      return {
        marks: 1, answer: hide.map(i => asFrac ? F.frac(terms[i], 100) : dec(terms[i], 2, true)).join(' and '), guide: 'Both needed.',
        check: () => terms.every((x, i) => i === 0 || Math.abs(x - terms[i - 1]) === 1),
        body: A => `<p>${who0} counts in hundredths. Write the missing numbers.</p>${sent(terms.map((t, i) => show(t, A, hide.includes(i))).join(',&nbsp; '))}`,
      };
    },
  });
  add({
    id: 'Y4_NC_11.grid', topics: ['Y4_NC_11'], level: 1,
    make(R) {
      const k = R.int(5, 95); if (k % 10 === 0) return null;
      const asDec = R.chance(0.5);
      return {
        marks: 1, answer: asDec ? dec(k, 2, true) : F.frac(k, 100),
        check: () => Math.floor(k / 10) * 10 + (k % 10) === k && k < 100,
        body: A => `<p>The large square is split into 100 equal parts.</p>${D.rectParts({ rows: 10, cols: 10, cell: 4.6, shaded: k })}<p>What ${asDec ? 'decimal' : 'fraction'} of the square is shaded?</p>${sent(asDec ? A.blank(dec(k, 2, true), 18) : F.frac(A.blank(k, 10), 100))}`,
      };
    },
  });
  add({
    id: 'Y4_NC_11.convert', topics: ['Y4_NC_11'], level: 2,
    make(R) {
      const who0 = R.name();
      const form = R.int(0, 3);
      if (form === 0) {
        const t = R.int(1, 9);
        return { marks: 1, answer: F.n(t * 10), check: () => t * 10 / 100 === t / 10, body: A => `<p>How many hundredths are there in <b>${dec(t, 1)}</b>?</p>${A.box(t * 10, { unit: 'hundredths' })}` };
      }
      const k = R.int(3, 97); if (k % 10 === 0) return null;
      const asStr = '0.' + String(k).padStart(2, '0');
      if (form === 1) return { marks: 1, answer: F.frac(k, 100), check: () => dec(k, 2, true) === asStr, body: A => `<p>Write the missing number.</p>${sent(`${dec(k, 2, true)} = ${F.frac(A.blank(k, 10), 100)}`)}` };
      if (form === 2) return { marks: 1, answer: dec(k, 2, true), check: () => dec(k, 2, true) === asStr, body: A => `<p>Write ${F.frac(k, 100)} as a decimal.</p>${A.box(dec(k, 2, true))}` };
      return { marks: 1, answer: dec(k, 2, true), check: () => k / 100 < 1, body: A => `<p>A metre stick is divided into 100 equal parts.</p><p>${who0} colours <b>${k}</b> of the parts.</p><p>What decimal of the stick is coloured?</p>${A.box(dec(k, 2, true))}` };
    },
  });

  // Y4_NC_12 decimal equivalents of tenths, hundredths, 1/4, 1/2, 3/4
  function fracPool(R) {
    // [html fraction, value in hundredths]
    const t = R.int(1, 9), h = R.intNot(1, 99, [25, 50, 75, 10, 20, 30, 40, 60, 70, 80, 90]);
    return [[F.frac(1, 4), 25, 1, 4], [F.frac(1, 2), 50, 1, 2], [F.frac(3, 4), 75, 3, 4], [F.frac(t, 10), t * 10, t, 10], [F.frac(h, 100), h, h, 100]];
  }
  add({
    id: 'Y4_NC_12.write', topics: ['Y4_NC_12'], level: 1,
    make(R) {
      const [fr, v, num, den] = R.pick(fracPool(R)), toDec = R.chance(0.6);
      return {
        marks: 1, answer: toDec ? dec(v, 2) : F.frac(num, den),
        check: () => num * 100 === v * den,
        body: A => toDec ? `<p>Write ${fr} as a decimal.</p>${A.box(dec(v, 2))}` : `<p>Write the missing number.</p>${sent(`${dec(v, 2)} = ${F.frac(A.blank(num, 10), den)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_12.match', topics: ['Y4_NC_12'], level: 2,
    make(R) {
      const pick = R.sample(fracPool(R), 4);
      if (new Set(pick.map(p => p[1])).size < 4) return null;
      const right = R.shuffle(pick.map(p => p[1]));
      return {
        marks: 1, answer: pick.map(p => `${p[0]} = ${dec(p[1], 2)}`).join(', '), guide: 'All four lines correct.',
        check: () => pick.every(p => right.includes(p[1])),
        body: A => `<p>Draw lines to match each fraction to the equal decimal.</p>${A.match(pick.map(p => p[0]), right.map(v => dec(v, 2)), pick.map((p, i) => [i, right.indexOf(p[1])]))}`,
      };
    },
  });
  add({
    id: 'Y4_NC_12.compare', topics: ['Y4_NC_12'], level: 2,
    make(R) {
      const [fr, fv] = R.pick(fracPool(R).slice(0, 4)), dv = fv + R.pick([-1, 1]) * R.int(2, 20);
      if (dv <= 0 || dv >= 100 || dv === fv) return null;
      const opts = R.shuffle([[fr, fv], [dec(dv, 2), dv]]), big = opts[0][1] > opts[1][1] ? 0 : 1;
      return {
        marks: 1, answer: opts[big][0],
        check: () => opts[big][1] === Math.max(fv, dv),
        body: A => `<p>Circle the <b>greater</b> number.</p>${A.circle(opts.map(o => o[0]), big)}`,
      };
    },
  });

  // Y4_NC_13 divide 1- and 2-digit numbers by 10 and 100
  add({
    id: 'Y4_NC_13.missing', topics: ['Y4_NC_13'], level: 1,
    make(R) {
      const n = R.int(1, 99), form = R.int(0, 3), by = R.pick([10, 100]);
      if (n % 10 === 0) return null;
      const q = n / by, qs = F.n(q);
      const cases = [
        [`${n} ${F.div} 10 = `, F.n(n / 10), 1], [`${n} ${F.div} 100 = `, F.n(n / 100), 1],
        [` ${F.div} ${by} = ${qs}`, F.n(n), 0], [`${n} ${F.div} `, F.n(by), 2],
      ];
      const [s, ans, kind] = cases[form];
      return {
        marks: 1, answer: ans,
        check: () => [Math.round(n / 10 * 10) === n, Math.round(n / 100 * 100) === n, Math.round(q * by) === n, Math.round(q * by) === n][form] && !/e/.test(ans),
        body: A => `<p>Write the missing number.</p>${sent(kind === 1 ? s + A.blank(ans, 18) : kind === 0 ? A.blank(ans, 16) + s : `${s}${A.blank(ans, 16)} = ${qs}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_13.context', topics: ['Y4_NC_13'], level: 2,
    make(R) {
      const form = R.int(0, 1), who = R.name();
      if (form === 0) {
        const n = R.int(11, 99); if (n % 10 === 0) return null;
        return {
          marks: 1, answer: `${dec(n, 2)} g`,
          check: () => Math.abs(n / 100 * 100 - n) < 1e-9 && n / 100 < 1,
          body: A => `<p>A pack of <b>100</b> identical stickers weighs <b>${n} g</b>.</p><p>How much does one sticker weigh?</p>${A.box(dec(n, 2), { unit: 'g' })}`,
        };
      }
      const n = R.int(11, 99); if (n % 10 === 0) return null;
      return {
        marks: 1, answer: `${dec(n, 1)} cm`,
        check: () => Math.abs(n / 10 * 10 - n) < 1e-9,
        body: A => `<p>${who} has a ribbon <b>${n} cm</b> long.</p><p>${who} cuts it into <b>10</b> equal pieces.</p><p>How long is each piece?</p>${A.box(dec(n, 1), { unit: 'cm' })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_13.claim', topics: ['Y4_NC_13'], level: 2,
    make(R) {
      const n = R.int(2, 99), by = R.pick([10, 100]), who = R.name(); if (n % 10 === 0) return null;
      const right = R.chance(0.35), wrongBy = by === 100 ? 10 : 100, claim = right ? n / by : n / wrongBy;
      const why = `Dividing by ${by} makes a number ${by} times smaller. The digits move ${by === 10 ? 'one place' : 'two places'} to the right, so ${n} ${F.div} ${by} = ${F.n(n / by)}.`;
      return {
        marks: 1, answer: right ? 'Yes, with a reason' : `No: it is ${F.n(n / by)}`, guide: 'The mark needs the right choice and a reason.',
        check: () => (Math.abs(claim * by - n) < 1e-9) === right,
        body: A => `<p>${who} says,</p>${sent(`${n} ${F.div} ${by} = ${F.n(claim)}`)}<p>Is ${who} correct? Explain how you know.</p>${yesNo(A, right)}${A.explain((right ? 'Yes. ' : 'No. ') + why, 2)}`,
      };
    },
  });

  // Y4_NC_14 round 1-dp decimals to the nearest whole; compare decimals to 2 dp
  add({
    id: 'Y4_NC_14.round', topics: ['Y4_NC_14'], level: 1,
    make(R) {
      const x = R.int(11, 199); if (x % 10 === 5 || x % 10 === 0) return null;
      const ans = Math.round(x / 10), c = R.pick([['', '', ''], ['A pumpkin weighs ', 'kg', ''], ['A plank is ', 'm', ' long'], ['A bottle holds ', 'litres', '']]);
      return {
        marks: 1, answer: F.n(ans) + (c[1] ? ' ' + c[1] : ''),
        check: () => Math.abs(ans * 10 - x) < 5,
        body: A => c[0] ? `<p>${c[0]}<b>${dec(x, 1)} ${c[1]}</b>${c[2]}.</p><p>Round this to the nearest whole ${c[1] === 'kg' ? 'kilogram' : c[1] === 'm' ? 'metre' : 'litre'}.</p>${A.box(ans, { unit: c[1] })}`
          : `<p>Round <b>${dec(x, 1)}</b> to the nearest whole number.</p>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_14.compare', topics: ['Y4_NC_14'], level: 1,
    make(R) {
      const w = R.int(0, 9), t = R.int(1, 8), u = R.int(1, 9), kind = R.int(0, 2);
      let a, b;
      if (kind === 0) { a = w * 100 + t * 10; b = w * 100 + (t - 1) * 10 + u; }          // 3.5 and 3.45
      else if (kind === 1) { a = w * 100 + t * 10 + u; b = w * 100 + t * 10 + R.intNot(1, 9, [u]); }
      else { a = w * 100 + u; b = w * 100 + t * 10; }                                   // 3.07 and 3.4
      if (a === b) return null;
      const sw = R.chance(0.5); if (sw) [a, b] = [b, a];
      const show = v => v % 10 === 0 ? dec(v / 10, 1, true) : dec(v, 2, true);
      const sym = cmpSym(a, b);
      return {
        marks: 1, answer: sym,
        check: () => (sym === LT) === (parseFloat(show(a)) < parseFloat(show(b))),
        body: A => `<p>Write &lt; or &gt; to make this correct.</p>${sent(`${show(a)} ${A.blank(sym, 12)} ${show(b)}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_14.order', topics: ['Y4_NC_14'], level: 2,
    make(R) {
      const w = R.int(0, 9), [t, u] = R.ints(2, 1, 9);
      const cand = [...new Set([10 * t, 10 * t + u, 10 * u, 10 * u + t, t, u])].map(x => w * 100 + x);
      if (cand.length < 4) return null;
      const vals = R.sample(cand, 4), sorted = vals.slice().sort((a, b) => a - b);
      const show = v => v % 10 === 0 ? dec(v / 10, 1, true) : dec(v, 2, true);
      return {
        marks: 1, answer: sorted.map(show).join(', '),
        check: () => sorted.every((x, i) => i === 0 || parseFloat(show(sorted[i - 1])) < parseFloat(show(x))),
        body: A => `<p>Write these numbers in order, starting with the <b>smallest</b>.</p>${sent(vals.map(show).join('&nbsp;&nbsp;&nbsp;&nbsp;'))}${A.boxes(sorted.map(v => [show(v)]), { w: 20 })}`,
      };
    },
  });

  // Y4_NC_15 fractions of amounts, including non-unit fractions
  add({
    id: 'Y4_NC_15.of-amount', topics: ['Y4_NC_15'], level: 1,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8, 10]), n = R.int(2, d - 1), k = R.int(2, 12), x = d * k, ans = n * k;
      if (F.gcd(n, d) !== 1) return null;
      const u = R.pick([['', ''], ['£', ''], ['', ' kg'], ['', ' cm']]);
      return {
        marks: 1, answer: u[0] + F.n(ans) + u[1],
        check: () => ans * d === n * x,
        body: A => `<p>Work out</p>${sent(`${F.frac(n, d)} of ${u[0]}${x}${u[1]} = ${u[0]}${A.blank(ans)}${u[1]}`)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_15.reverse', topics: ['Y4_NC_15'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8, 10]), n = R.int(2, d - 1), k = R.int(3, 12), whole = d * k, form = R.int(0, 1);
      if (F.gcd(n, d) !== 1) return null;
      return {
        marks: 1, answer: form === 0 ? F.n(n * k) : F.n(whole),
        check: () => form === 0 ? (n * k) / n * d === whole : whole / d * n === n * k,
        body: A => form === 0 ? `${sent(`${F.frac(1, d)} of a number is ${k}`)}<p>What is ${F.frac(n, d)} of the number?</p>${A.box(n * k)}`
          : `${sent(`${F.frac(n, d)} of a number is ${n * k}`)}<p>What is the number?</p>${A.box(whole)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_15.word', topics: ['Y4_NC_15'], level: 3,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8]), n = R.int(2, d - 1), k = R.int(3, 9), x = d * k, used = n * k, left = x - used, who = R.name();
      if (F.gcd(n, d) !== 1) return null;
      const money = R.chance(0.5);
      return {
        marks: 2, method: true, answer: money ? '£' + left : F.n(left), guide: `Award 1 mark for finding ${F.frac(n, d)} of ${x} = ${used}.`,
        check: () => left === (d - n) * k,
        body: A => money
          ? `<p>${who} has <b>£${x}</b>.</p><p>${who} spends ${F.frac(n, d)} of the money on a new game.</p><p>How much money does ${who} have left?</p>${A.work(`${x} ${F.div} ${d} = ${k}, ${k} ${F.times} ${n} = ${used}<br>${x} ${F.minus} ${used} = ${left}`, 30)}${A.box(left, { pre: '£' })}`
          : `<p>There are <b>${x}</b> children in a club.</p><p>${F.frac(n, d)} of them walk to the club.</p><p>How many children do <b>not</b> walk?</p>${A.work(`${x} ${F.div} ${d} = ${k}, ${k} ${F.times} ${n} = ${used}<br>${x} ${F.minus} ${used} = ${left}`, 30)}${A.box(left, { unit: 'children' })}`,
      };
    },
  });

  /* =====================================================================
   * Measures, money and time
   * ===================================================================== */
  const UNITS = [['km', 'm', 1000], ['kg', 'g', 1000], ['l', 'ml', 1000], ['m', 'cm', 100], ['cm', 'mm', 10]];

  // Y4_NC_16 convert between units
  add({
    id: 'Y4_NC_16.convert', topics: ['Y4_NC_16'], level: 1,
    make(R) {
      const [big, small, f] = R.pick(UNITS), form = R.int(0, 2);
      if (form === 0) {
        const tenths = R.int(11, 95), v = tenths * f / 10;   // e.g. 2.5 km
        if (!Number.isInteger(v)) return null;
        return { marks: 1, answer: `${F.n(v)} ${small}`, check: () => v / f * 10 === tenths, body: A => `<p>Write the missing number.</p>${sent(`${dec(tenths, 1)} ${big} = ${A.blank(F.n(v), 20)} ${small}`)}` };
      }
      if (form === 1) {
        const w = R.int(2, 9), v = w * f;
        return { marks: 1, answer: `${w} ${big}`, check: () => v / w === f, body: A => `<p>Write the missing number.</p>${sent(`${F.n(v)} ${small} = ${A.blank(w)} ${big}`)}` };
      }
      const w = R.int(1, 8), r = R.int(1, f - 1), v = w * f + r;
      if (f === 1000 && r % 10 !== 0 && R.chance(0.7)) return null;
      return { marks: 1, answer: `${F.n(v)} ${small}`, check: () => Math.floor(v / f) === w && v % f === r, body: A => `<p>Write the missing number.</p>${sent(`${w} ${big} ${F.n(r)} ${small} = ${A.blank(F.n(v), 20)} ${small}`)}` };
    },
  });
  add({
    id: 'Y4_NC_16.compare', topics: ['Y4_NC_16'], level: 2,
    make(R) {
      const [big, small, f, word] = R.pick([['kg', 'g', 1000, 'heaviest'], ['km', 'm', 1000, 'longest'], ['l', 'ml', 1000, 'greatest']]);
      const w = R.int(1, 4), [a, b] = R.ints(2, 1, 9);
      const offs = [...new Set([100 * a, 10 * a, 100 * a + 10 * b, 100 * b + 10 * a, 100 * a + b])];
      if (offs.length < 4) return null;
      const vals = R.sample(offs, 4).map(o => w * f + o);
      const show = v => { const o = v % f; if (o % 100 === 0 && R.chance(0.6)) return `${dec(v / 100, 1)} ${big}`; return R.chance(0.5) ? `${F.n(v)} ${small}` : `${w} ${big} ${o} ${small}`; };
      const shown = vals.map(show), mx = Math.max(...vals);
      const toBase = s => { const m = s.match(/^([\d.,]+) (\S+)(?: ([\d,]+) \S+)?$/); const x = parseFloat(m[1].replace(/,/g, '')); return m[3] ? x * f + +m[3] : (m[2] === big ? Math.round(x * f) : x); };
      return {
        marks: 1, answer: shown[vals.indexOf(mx)],
        check: () => shown.map(toBase).every((x, i) => x === vals[i]) && vals.filter(v => v === mx).length === 1,
        body: A => `<p>Circle the <b>${word}</b> amount.</p>${A.circle(shown, vals.indexOf(mx))}`,
      };
    },
  });
  add({
    id: 'Y4_NC_16.word', topics: ['Y4_NC_16'], level: 3,
    make(R) {
      const form = R.int(0, 1), who = R.name();
      if (form === 0) {
        const L = R.pick([10, 15, 20]), g = R.int(2, 5), c = R.pick([150, 200, 250, 300, 350]), left = L * 100 - g * c;
        if (left <= 0) return null;
        return {
          marks: 2, method: true, answer: `${F.n(left)} ml`, guide: `Award 1 mark for ${dec(L, 1)} l = ${F.n(L * 100)} ml or for ${g} ${F.times} ${c} = ${g * c}.`,
          check: () => left + g * c === L / 10 * 1000,
          body: A => `<p>A bottle holds <b>${dec(L, 1)} litres</b> of juice.</p><p>${who} pours <b>${g}</b> glasses of juice. Each glass holds <b>${c} ml</b>.</p><p>How much juice is left in the bottle, in millilitres?</p>${A.work(`${dec(L, 1)} l = ${F.n(L * 100)} ml<br>${g} ${F.times} ${c} = ${g * c}<br>${F.n(L * 100)} ${F.minus} ${g * c} = ${F.n(left)}`, 30)}${A.box(F.n(left), { unit: 'ml' })}`,
        };
      }
      const km = R.int(3, 6), a = R.int(8, 19) * 100, b = R.int(6, 15) * 100 + R.pick([0, 50]), left = km * 1000 - a - b;
      if (left <= 0) return null;
      return {
        marks: 2, method: true, answer: `${F.n(left)} m`,
        check: () => left + a + b === km * 1000,
        body: A => `<p>A race is <b>${km} km</b> long.</p><p>${who} runs <b>${F.n(a)} m</b>, then walks <b>${F.n(b)} m</b>.</p><p>How many metres does ${who} still have to go?</p>${A.work(`${km} km = ${F.n(km * 1000)} m<br>${F.n(a)} + ${F.n(b)} = ${F.n(a + b)}<br>${F.n(km * 1000)} ${F.minus} ${F.n(a + b)} = ${F.n(left)}`, 30)}${A.box(F.n(left), { unit: 'm' })}`,
      };
    },
  });

  // Y4_NC_17 area of rectilinear shapes by counting squares
  function skyline(R, maxW, maxH, x0) {
    const w = R.int(3, maxW), cells = [];
    let lo = R.int(0, 1), hi = lo + R.int(1, maxH - 1);
    for (let i = 0; i < w; i++) {
      if (i) { const nlo = Math.max(0, Math.min(lo + R.int(-1, 1), maxH - 2)); let nhi = Math.min(maxH, Math.max(nlo + 1, hi + R.int(-2, 2))); if (nhi <= lo) nhi = lo + 1; if (nlo >= hi) return null; lo = nlo; hi = Math.max(nhi, lo + 1); }
      for (let y = lo; y < hi; y++) cells.push([x0 + i, y]);
    }
    return cells;
  }
  const cellPolys = (cells, ans) => cells.map(([x, y]) => ({ pts: [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], ans }));
  add({
    id: 'Y4_NC_17.count', topics: ['Y4_NC_17'], level: 1,
    make(R) {
      const cells = skyline(R, 7, 6, 1);
      if (!cells || cells.length < 7) return null;
      const set = new Set(cells.map(c => c.join(',')));
      return {
        marks: 1, answer: `${cells.length} squares`,
        check: () => set.size === cells.length,
        body: A => `<p>The shape is drawn on a grid of squares.</p>${D.grid({ cols: 9, rows: 7, cell: 6, polys: cellPolys(cells) }, A)}<p>What is the area of the shape?</p>${A.box(cells.length, { unit: 'squares' })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_17.compare', topics: ['Y4_NC_17'], level: 2,
    make(R) {
      const c1 = skyline(R, 5, 6, 1), c2 = skyline(R, 5, 6, 1);
      if (!c1 || !c2 || c1.length === c2.length || c1.length < 6 || c2.length < 6) return null;
      const big = c1.length > c2.length ? 0 : 1, diff = Math.abs(c1.length - c2.length);
      return {
        marks: 1, answer: `${['A', 'B'][big]}, by ${diff}`, guide: 'Both parts needed.',
        check: () => diff === Math.max(c1.length, c2.length) - Math.min(c1.length, c2.length),
        body: A => `${D.row([{ fig: D.grid({ cols: 7, rows: 6, cell: 5, polys: cellPolys(c1) }, A), cap: 'A' }, { fig: D.grid({ cols: 7, rows: 6, cell: 5, polys: cellPolys(c2) }, A), cap: 'B' }], 8)}<p>Which shape has the larger area? Circle it.</p>${A.circle(['A', 'B'], big)}<p>How many more squares does it cover?</p>${A.box(diff, { unit: 'squares' })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_17.draw', topics: ['Y4_NC_17'], level: 2,
    make(R) {
      const n = R.pick([6, 8, 10, 12, 14, 15, 16, 18, 20, 24]);
      const fits = []; for (let a = 1; a <= 10; a++) if (n % a === 0 && n / a <= 6) fits.push([a, n / a]);
      const good = fits.filter(([a, b]) => a > 1 && b > 1);
      if (!good.length) return null;
      const [a, b] = R.pick(good);
      return {
        marks: 1, answer: `A rectangle of ${n} squares, e.g. ${a} by ${b}`, guide: `Accept any rectangle with an area of ${n} squares: ${fits.map(([x, y]) => `${x} by ${y}`).join(', ')}.`,
        check: () => a * b === n && fits.every(([x, y]) => x * y === n),
        body: A => `<p>Draw a rectangle with an area of <b>${n} squares</b> on the grid.</p>${D.grid({ cols: 10, rows: 6, cell: 6, polys: [{ pts: [[1, 0], [1 + a, 0], [1 + a, b], [1, b]], ans: true }] }, A)}`,
      };
    },
  });

  // Y4_NC_18 money in £ and p
  add({
    id: 'Y4_NC_18.convert', topics: ['Y4_NC_18'], level: 1,
    make(R) {
      const p = R.pick([R.int(101, 999), R.int(1, 9) * 100 + R.int(1, 9), R.int(1, 9) * 100 + R.int(1, 9) * 10]), toP = R.chance(0.5);
      return {
        marks: 1, answer: toP ? `${p}p` : F.money(p),
        check: () => Math.round(parseFloat(F.money(p).slice(1)) * 100) === p,
        body: A => toP ? `<p>Write the missing number.</p>${sent(`${F.money(p)} = ${A.blank(p, 16)} p`)}` : `<p>Write the missing number.</p>${sent(`${p}p = £${A.blank(F.n(p / 100, 2), 18)}`)}`,
      };
    },
  });
  const MENU = [['sandwich', 'sandwiches'], ['drink', 'drinks'], ['apple', 'apples'], ['cake', 'cakes'], ['bag of crisps', 'bags of crisps'], ['yoghurt', 'yoghurts']];
  add({
    id: 'Y4_NC_18.change', topics: ['Y4_NC_18'], level: 3,
    make(R) {
      const items = R.sample(MENU, 3), prices = items.map(() => R.int(19, 89) * 5 + R.pick([0, 4])), who = R.name();
      const [i, j] = R.ints(2, 0, 2), qi = R.int(1, 3), qj = R.int(1, 2), tot = qi * prices[i] + qj * prices[j];
      const pay = tot < 1000 ? 1000 : 2000, ch = pay - tot;
      if (ch <= 0) return null;
      const say = (q, k) => q === 1 ? `a ${items[k][0]}` : `${q} ${items[k][1]}`;
      return {
        marks: 2, method: true, answer: F.money(ch), guide: `Award 1 mark for the total ${F.money(tot)}.`,
        check: () => ch + qi * prices[i] + qj * prices[j] === pay,
        body: A => `${A.table([items.map((_, k) => F.money(prices[k]))], { head: items.map(it => it[0]) })}<p>${who} buys ${say(qi, i)} and ${say(qj, j)}. ${who} pays with a <b>£${pay / 100}</b> note.</p><p>How much change does ${who} get?</p>${A.work(`${qi} ${F.times} ${F.money(prices[i])} + ${qj} ${F.times} ${F.money(prices[j])} = ${F.money(tot)}<br>${F.money(pay)} ${F.minus} ${F.money(tot)} = ${F.money(ch)}`, 28)}${A.box(F.n(ch / 100, 2), { pre: '£' })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_18.estimate', topics: ['Y4_NC_18'], level: 2,
    make(R) {
      const who0 = R.name();
      const ps = [0, 1, 2].map(() => R.int(1, 9) * 100 + R.pick([R.int(1, 30), R.int(70, 99)]));
      const est = ps.reduce((s, p) => s + Math.round(p / 100), 0);
      return {
        marks: 1, answer: `£${est}`, guide: `${ps.map(p => '£' + Math.round(p / 100)).join(' + ')}.`,
        check: () => est === ps.reduce((s, p) => s + Math.floor((p + 50) / 100), 0),
        body: A => `<p>${who0} buys three things that cost</p>${sent(ps.map(p => F.money(p)).join(',&nbsp;&nbsp;'))}<p>Round each price to the nearest pound to estimate the total cost.</p>${A.box(est, { pre: '£', label: 'Estimate' })}`,
      };
    },
  });

  // Y4_NC_19 analogue and digital, 12- and 24-hour clocks
  const say12 = (h, m) => F.t12(h, m);
  add({
    id: 'Y4_NC_19.to24', topics: ['Y4_NC_19'], level: 1,
    make(R) {
      const h = R.int(0, 23), m = R.int(0, 11) * 5 + R.pick([0, 0, 2, 3]), to24 = R.chance(0.6);
      if (m > 59) return null;
      const a24 = F.t24(h, m), a12 = say12(h, m);
      return {
        marks: 1, answer: to24 ? a24 : a12, guide: to24 ? '' : 'Accept the time written another correct way, e.g. in words with am or pm.',
        check: () => { const pm = a12.endsWith('pm'); const hh = +a12.split(':')[0] % 12 + (pm ? 12 : 0); return hh === h && +a24.slice(0, 2) === h; },
        body: A => to24 ? `<p>Write <b>${a12}</b> as a 24-hour clock time.</p>${A.box(a24, { w: 28 })}` : `<p>Write <b>${a24}</b> as a 12-hour clock time using am or pm.</p>${A.box(a12, { w: 32 })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_19.clock', topics: ['Y4_NC_19'], level: 2,
    make(R) {
      const roman0 = R.chance(0.25);
      const h12 = R.int(1, 11), m = R.int(0, 11) * 5, part = R.pick([['in the morning', 0], ['in the afternoon', 12], ['in the evening', 12]]);
      if (part[0] === 'in the afternoon' && h12 > 5) return null;
      if (part[0] === 'in the evening' && h12 < 6) return null;
      const h = h12 + part[1], ans = F.t24(h, m);
      return {
        marks: 1, answer: ans,
        check: () => (h % 12) === h12 && (h >= 12) === (part[1] === 12),
        body: A => `<p>The clock shows a time ${part[0]}.</p>${D.clock({ h: h12, m, roman: roman0, size: 38 }, A)}<p>Write the time as a 24-hour digital time.</p>${A.box(ans, { w: 28 })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_19.match', topics: ['Y4_NC_19'], level: 2,
    make(R) {
      const m = R.int(0, 11) * 5, h1 = R.int(1, 11), h2 = R.intNot(1, 11, [h1]);
      const times = R.shuffle([[h1, m], [h1 + 12, m], [h2 + 12, m], [R.chance(0.5) ? h2 : 12, m]]);
      if (new Set(times.map(t => t[0])).size < 4) return null;
      const right = R.shuffle(times.slice());
      return {
        marks: 1, answer: times.map(([h, mm]) => `${say12(h, mm)} = ${F.t24(h, mm)}`).join(', '), guide: 'All four lines correct.',
        check: () => times.every(([h, mm]) => { const s = say12(h, mm); return (+s.split(':')[0] % 12) + (s.endsWith('pm') ? 12 : 0) === h; }),
        body: A => `<p>Draw lines to match each time to the same time on a 24-hour clock.</p>${A.match(times.map(([h, mm]) => say12(h, mm)), right.map(([h, mm]) => F.t24(h, mm)), times.map((t, i) => [i, right.indexOf(t)]))}`,
      };
    },
  });

  // Y4_NC_20 convert between units of time
  add({
    id: 'Y4_NC_20.convert', topics: ['Y4_NC_20'], level: 1,
    make(R) {
      const c = R.pick([['hours', 'minutes', 60], ['minutes', 'seconds', 60], ['years', 'months', 12], ['weeks', 'days', 7], ['days', 'hours', 24]]);
      const [big, small, f] = c, form = R.int(0, 2), w = R.int(2, 9), r = R.int(1, f - 1);
      if (form === 0) return { marks: 1, answer: `${w * f} ${small}`, check: () => (w * f) / f === w, body: A => `<p>Write the missing number.</p>${sent(`${w} ${big} = ${A.blank(w * f, 16)} ${small}`)}` };
      if (form === 1) return { marks: 1, answer: `${w * f + r} ${small}`, check: () => Math.floor((w * f + r) / f) === w, body: A => `<p>Write the missing number.</p>${sent(`${w} ${big} ${r} ${small} = ${A.blank(w * f + r, 16)} ${small}`)}` };
      const v = w * f + r;
      return { marks: 1, answer: `${w} ${big} ${r} ${small}`, guide: 'Both needed.', check: () => w * f + r === v && r < f, body: A => `<p>Write the missing numbers.</p>${sent(`${v} ${small} = ${A.blank(w)} ${big} ${A.blank(r)} ${small}`)}` };
    },
  });
  add({
    id: 'Y4_NC_20.compare', topics: ['Y4_NC_20'], level: 2,
    make(R) {
      const [big, small, word] = R.pick([['minutes', 'seconds', 'longest'], ['hours', 'minutes', 'longest'], ['minutes', 'seconds', 'shortest'], ['hours', 'minutes', 'shortest']]);
      const w = R.int(1, 4), offs = R.ints(3, 1, 11).map(x => x * 5), vals = [w * 60, ...offs.map(o => w * 60 + o)];
      const shownV = R.shuffle(vals);
      const show = v => v % 60 === 0 ? `${v / 60} ${v === 60 ? big.replace(/s$/, '') : big}` : R.chance(0.5) ? `${v} ${small}` : `${Math.floor(v / 60)} ${Math.floor(v / 60) === 1 ? big.replace(/s$/, '') : big} ${v % 60} ${small}`;
      const shown = shownV.map(show), tgt = word === 'longest' ? Math.max(...vals) : Math.min(...vals), idx = shownV.indexOf(tgt);
      return {
        marks: 1, answer: shown[idx],
        check: () => new Set(vals).size === 4 && shownV.filter(v => v === tgt).length === 1,
        body: A => `<p>Circle the <b>${word}</b> time.</p>${A.circle(shown, idx)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_20.word', topics: ['Y4_NC_20'], level: 3,
    make(R) {
      const per = R.int(15, 45), days = R.pick([5, 7]), tot = per * days, h = Math.floor(tot / 60), m = tot % 60, who = R.name();
      if (m === 0 || h === 0) return null;
      return {
        marks: 2, method: true, answer: `${h} hours ${m} minutes`, guide: `Award 1 mark for ${tot} minutes.`,
        check: () => h * 60 + m === days * per,
        body: A => `<p>${who} practises the piano for <b>${per} minutes</b> every day for ${days === 7 ? 'a week' : '5 days'}.</p><p>How long is that altogether in hours and minutes?</p>${A.work(`${per} ${F.times} ${days} = ${tot} minutes<br>${tot} minutes = ${h} hours ${m} minutes`, 28)}${A.boxes([[h, 'hours'], [m, 'minutes']])}`,
      };
    },
  });

  /* =====================================================================
   * Statistics
   * ===================================================================== */
  const CHARTS = [
    ['favourite sports of some children', ['Football', 'Netball', 'Tennis', 'Swim', 'Cricket'], 'Children', 'chose'],
    ['number of books read by each class', ['Oak', 'Ash', 'Elm', 'Pine', 'Birch'], 'Books', 'read'],
    ['cars that went past the school each day', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'Cars', 'on'],
  ];
  function chartData(R, steps) {
    const [title, cats0, ylab, verb] = R.pick(CHARTS), n = R.int(4, 5), cats = cats0.slice(0, n);
    const [step, minor] = R.pick(steps);
    const vals = cats.map(() => R.int(1, Math.floor(5.5 * step / minor)) * minor);
    if (new Set(vals).size < n) return null;
    const max = Math.ceil((Math.max(...vals) + 1) / step) * step;
    return { title, cats, ylab, verb, step, minor, vals, max };
  }
  const q4 = (d, i) => d.verb === 'on' ? `How many cars went past on <b>${d.cats[i]}</b>?` : d.verb === 'read' ? `How many books did <b>${d.cats[i]}</b> class read?` : `How many children chose <b>${d.cats[i]}</b>?`;

  // Y4_NC_21 read and present data: bar charts and time graphs
  add({
    id: 'Y4_NC_21.bar-read', topics: ['Y4_NC_21'], level: 1,
    make(R) {
      const d = chartData(R, [[10, 5], [20, 5], [20, 10], [50, 25], [100, 25]]); if (!d) return null;
      const offGrid = d.vals.map((v, i) => v % d.step ? i : -1).filter(i => i >= 0);
      if (!offGrid.length) return null;
      const i = R.pick(offGrid);
      return {
        marks: 1, answer: F.n(d.vals[i]),
        check: () => d.vals[i] % d.minor === 0 && d.vals[i] <= d.max,
        body: A => `<p>This bar chart shows the ${d.title}.</p>${D.barChart({ cats: d.cats, vals: d.vals, step: d.step, minor: d.minor, max: d.max, ylab: d.ylab, width: 130, height: 48 }, A)}<p>${q4(d, i)}</p>${A.box(d.vals[i])}`,
      };
    },
  });
  add({
    id: 'Y4_NC_21.bar-draw', topics: ['Y4_NC_21'], level: 2,
    make(R) {
      const d = chartData(R, [[10, 5], [20, 5], [4, 2], [2, 1]]); if (!d) return null;
      const i = R.int(0, d.cats.length - 1);
      return {
        marks: 1, answer: `Bar for ${d.cats[i]} drawn to ${F.n(d.vals[i])}`, guide: 'Accept a bar within 1 mm of the correct height.',
        check: () => d.vals[i] <= d.max && d.vals.length === d.cats.length,
        body: A => `<p>The table shows the ${d.title}.</p><p>Use the table to draw the missing bar for <b>${d.cats[i]}</b>.</p>${D.row([A.table(d.cats.map((c, k) => [c, F.n(d.vals[k])]), { head: ['', d.ylab] }), D.barChart({ cats: d.cats, vals: d.vals, step: d.step, minor: d.minor, max: d.max, ylab: d.ylab, width: 100, height: 50, ans: [i] }, A)], 6)}`,
      };
    },
  });
  function tempGraph(R) {
    const xs = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
    let t = R.int(3, 10); const ys = [];
    const peak = R.int(3, 5);
    for (let i = 0; i < xs.length; i++) { ys.push(t); t += i < peak ? R.int(1, 4) : -R.int(0, 3); }
    if (Math.max(...ys) > 20 || Math.min(...ys) < 1) return null;
    return { xs, ys, max: 20, step: 5, minor: 1 };
  }
  add({
    id: 'Y4_NC_21.time-graph', topics: ['Y4_NC_21'], level: 1,
    make(R) {
      const g = tempGraph(R); if (!g) return null;
      const form = R.int(0, 1);
      if (form === 0) {
        const i = R.int(0, 6);
        return {
          marks: 1, answer: `${g.ys[i]} °C`,
          check: () => g.ys[i] >= 1 && g.ys[i] <= 20,
          body: A => `<p>This graph shows the temperature in a playground one day.</p>${D.lineGraph({ xs: g.xs, ys: g.ys, min: 0, max: g.max, step: g.step, minor: g.minor, ylab: 'Temperature (°C)', xlab: 'Time', width: 130, height: 44 })}<p>What was the temperature at <b>${g.xs[i]}</b>?</p>${A.box(g.ys[i], { unit: '°C' })}`,
        };
      }
      const mx = Math.max(...g.ys); if (g.ys.filter(y => y === mx).length !== 1) return null;
      const i = g.ys.indexOf(mx);
      return {
        marks: 1, answer: g.xs[i],
        check: () => g.ys.every(y => y <= g.ys[i]),
        body: A => `<p>This graph shows the temperature in a playground one day.</p>${D.lineGraph({ xs: g.xs, ys: g.ys, min: 0, max: g.max, step: g.step, minor: g.minor, ylab: 'Temperature (°C)', xlab: 'Time', width: 130, height: 44 })}<p>At what time was the temperature highest?</p>${A.box(g.xs[i], { w: 26 })}`,
      };
    },
  });

  // Y4_NC_22 comparison, sum and difference problems with charts, tables and graphs
  add({
    id: 'Y4_NC_22.bar-diff', topics: ['Y4_NC_22'], level: 2,
    make(R) {
      const d = chartData(R, [[10, 5], [20, 10], [50, 25], [100, 50], [20, 5]]); if (!d) return null;
      const [i, j, k] = R.ints(3, 0, d.cats.length - 1), form = R.int(0, 1);
      const ans = form === 0 ? Math.abs(d.vals[i] - d.vals[j]) : d.vals[i] + d.vals[j] + d.vals[k];
      const big = d.vals[i] > d.vals[j] ? i : j, small = big === i ? j : i;
      const what = d.verb === 'on' ? 'cars went past' : d.verb === 'read' ? 'books were read' : 'children chose';
      return {
        marks: 1, answer: F.n(ans),
        check: () => form === 0 ? ans + d.vals[small] === d.vals[big] : ans - d.vals[i] - d.vals[j] === d.vals[k],
        body: A => `<p>This bar chart shows the ${d.title}.</p>${D.barChart({ cats: d.cats, vals: d.vals, step: d.step, minor: d.minor, max: d.max, ylab: d.ylab, width: 130, height: 48 }, A)}<p>${form === 0
          ? (d.verb === 'on' ? `How many more cars went past on <b>${d.cats[big]}</b> than on <b>${d.cats[small]}</b>?` : d.verb === 'read' ? `How many more books did <b>${d.cats[big]}</b> read than <b>${d.cats[small]}</b>?` : `How many more children chose <b>${d.cats[big]}</b> than <b>${d.cats[small]}</b>?`)
          : `How many ${what} ${d.verb === 'on' ? 'on' : ''} <b>${d.cats[i]}</b>, <b>${d.cats[j]}</b> and <b>${d.cats[k]}</b> altogether?`.replace('  ', ' ')}</p>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_22.table', topics: ['Y4_NC_22'], level: 3,
    make(R) {
      const place = R.pick(['a museum', 'a zoo', 'a castle', 'a science centre']);
      const v = [[R.int(120, 480), R.int(150, 520)], [R.int(110, 460), R.int(140, 500)]];
      const t0 = v[0][0] + v[0][1], t1 = v[1][0] + v[1][1];
      if (t0 === t1) return null;
      const big = t0 > t1 ? 0 : 1, days = ['Saturday', 'Sunday'], diff = Math.abs(t0 - t1);
      return {
        marks: 2, method: true, answer: F.n(diff), guide: `Award 1 mark for both totals (${F.n(t0)} and ${F.n(t1)}).`,
        check: () => diff === (v[big][0] + v[big][1]) - (v[1 - big][0] + v[1 - big][1]),
        body: A => `<p>The table shows the number of visitors to ${place} one weekend.</p>${A.table([[days[0], v[0][0], v[0][1]], [days[1], v[1][0], v[1][1]]], { head: ['', 'Adults', 'Children'], rowHead: true })}<p>How many more visitors were there on <b>${days[big]}</b> than on <b>${days[1 - big]}</b>?</p>${A.work(`${v[0][0]} + ${v[0][1]} = ${F.n(t0)}<br>${v[1][0]} + ${v[1][1]} = ${F.n(t1)}<br>${F.n(Math.max(t0, t1))} ${F.minus} ${F.n(Math.min(t0, t1))} = ${diff}`, 30)}${A.box(diff, { unit: 'visitors' })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_22.graph-diff', topics: ['Y4_NC_22'], level: 2,
    make(R) {
      const g = tempGraph(R); if (!g) return null;
      const [i, j] = R.ints(2, 0, 6).sort((a, b) => a - b);
      if (g.ys[i] === g.ys[j]) return null;
      const diff = Math.abs(g.ys[j] - g.ys[i]), rose = g.ys[j] > g.ys[i];
      return {
        marks: 1, answer: `${diff} °C`,
        check: () => (rose ? g.ys[i] + diff : g.ys[i] - diff) === g.ys[j],
        body: A => `<p>This graph shows the temperature in a playground one day.</p>${D.lineGraph({ xs: g.xs, ys: g.ys, min: 0, max: g.max, step: g.step, minor: g.minor, ylab: 'Temperature (°C)', xlab: 'Time', width: 130, height: 44 })}<p>How many degrees did the temperature <b>${rose ? 'rise' : 'fall'}</b> between ${g.xs[i]} and ${g.xs[j]}?</p>${A.box(diff, { unit: '°C' })}`,
      };
    },
  });

  /* =====================================================================
   * Geometry (NC)
   * ===================================================================== */

  // Y4_NC_23 compare and classify shapes; quadrilaterals and triangles
  const QUADS = [
    ['square', [[0, 0], [26, 0], [26, 26], [0, 26]], { right: [0, 1, 2, 3], ticks: [1, 1, 1, 1] }],
    ['rectangle', [[0, 0], [36, 0], [36, 20], [0, 20]], { right: [0, 1, 2, 3], ticks: [1, 2, 1, 2] }],
    ['rhombus', [[0, 0], [26, 0], [36, 24], [10, 24]], { ticks: [1, 1, 1, 1] }],
    ['parallelogram', [[0, 0], [36, 0], [46, 20], [10, 20]], { ticks: [1, 2, 1, 2] }],
    ['trapezium', [[0, 22], [10, 0], [28, 0], [42, 22]]],
    ['kite', [[0, 12], [14, 0], [28, 12], [14, 36]], { ticks: [1, 1, 2, 2] }],
  ];
  add({
    id: 'Y4_NC_23.name-quad', topics: ['Y4_NC_23'], level: 2,
    make(R) {
      const [nm, base, extra] = R.pick(QUADS), rot = nm === 'trapezium' ? R.pick([0, 90, 180, 270]) : R.int(0, 11) * 30 + R.pick([0, 10, 20]);
      const pts = rotPts(base, rot), L = pts.map((p, i) => dist(p, pts[(i + 1) % 4])), g = angles(pts);
      const allEq = Math.max(...L) - Math.min(...L) < 1e-6, allRight = g.every(a => Math.abs(a - 90) < 1e-6);
      const kind = allEq && allRight ? 'square' : allRight ? 'rectangle' : allEq ? 'rhombus'
        : Math.abs(L[0] - L[2]) < 1e-6 && Math.abs(L[1] - L[3]) < 1e-6 ? 'parallelogram'
          : (Math.abs(L[0] - L[1]) < 1e-6 && Math.abs(L[2] - L[3]) < 1e-6) ? 'kite' : 'trapezium';
      return {
        marks: 1, answer: nm, guide: 'Equal sides are marked with dashes. Right angles are marked.',
        check: () => kind === nm,
        body: A => `<p>Equal sides are marked with dashes. Right angles are marked with a small square.</p>${D.shape({ pts, ...(extra || {}) })}<p>What is the name of this quadrilateral?</p>${A.line(nm, 50)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_23.name-tri', topics: ['Y4_NC_23'], level: 2,
    make(R) {
      const kind = R.int(0, 2);
      let a, b, c;
      if (kind === 0) { a = b = c = R.int(4, 12); }
      else if (kind === 1) { a = R.int(5, 12); c = R.intNot(3, 2 * a - 2, [a]); b = a; }
      else { [a, b, c] = R.ints(3, 4, 14); }
      if (a + b <= c || a + c <= b || b + c <= a) return null;
      // A = (0,0), B = (c, 0), C from side lengths (BC = a, CA = b)
      const x = (b * b + c * c - a * a) / (2 * c), y = Math.sqrt(b * b - x * x);
      if (!(y > 0.35 * c)) return null;
      const sc = 34 / Math.max(a, b, c);
      const pts = rotPts([[0, 0], [c * sc, 0], [x * sc, -y * sc]], R.int(0, 11) * 30);
      const names = ['equilateral', 'isosceles', 'scalene'];
      const L = pts.map((p, i) => dist(p, pts[(i + 1) % 3]) / sc), eq = [[0, 1], [1, 2], [0, 2]].filter(([i, j]) => Math.abs(L[i] - L[j]) < 1e-6).length;
      return {
        marks: 1, answer: names[kind],
        check: () => (eq === 3 ? 0 : eq === 1 ? 1 : 2) === kind,
        body: A => `<p>Here is a triangle.</p>${D.shape({ pts, labels: [`${c} cm`, `${a} cm`, `${b} cm`] })}<p>What type of triangle is it? Circle one.</p>${A.circle(names, kind)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_23.property', topics: ['Y4_NC_23'], level: 2,
    make(R) {
      const who0 = R.name();
      const quads = ['square', 'rectangle', 'rhombus', 'parallelogram', 'trapezium', 'kite'];
      const props = [
        ['four equal sides and four right angles', 'square', quads],
        ['four equal sides but no right angles', 'rhombus', quads],
        ['four right angles, but its sides are not all equal', 'rectangle', quads],
        ['only one pair of parallel sides', 'trapezium', quads],
        ['two pairs of equal sides next to each other, and no parallel sides', 'kite', quads],
        ['two pairs of parallel sides, no right angles and sides that are not all equal', 'parallelogram', quads],
        ['three equal sides', 'equilateral triangle', ['equilateral triangle', 'isosceles triangle', 'scalene triangle', 'right-angled triangle']],
        ['no equal sides', 'scalene triangle', ['equilateral triangle', 'isosceles triangle', 'scalene triangle']],
        ['exactly two equal sides', 'isosceles triangle', ['equilateral triangle', 'isosceles triangle', 'scalene triangle']],
      ];
      const [p, ans, pool] = R.pick(props);
      const opts = R.shuffle([ans, ...R.sample(pool.filter(x => x !== ans), Math.min(3, pool.length - 1))]);
      return {
        marks: 1, answer: ans,
        check: () => opts.filter(o => o === ans).length === 1 && (ans === 'square') === (p.startsWith('four equal sides and four')),
        body: A => `<p>${who0} is thinking of a shape. It has <b>${p}</b>.</p><p>Circle the shape.</p>${A.circle(opts, opts.indexOf(ans))}`,
      };
    },
  });

  // Y4_NC_24 acute and obtuse angles; order angles up to two right angles
  add({
    id: 'Y4_NC_24.classify', topics: ['Y4_NC_24'], level: 1,
    make(R) {
      const acute = R.chance(0.5), deg = acute ? R.int(20, 65) : R.int(115, 165), rot = R.int(0, 8) * 10;
      const ans = acute ? 0 : 2;
      return {
        marks: 1, answer: ['acute', 'right angle', 'obtuse'][ans],
        check: () => (deg < 90) === (ans === 0) && Math.abs(deg - 90) >= 25,
        body: A => `<p>Is this angle acute, obtuse or a right angle? Circle one.</p>${D.angle({ deg, rot, len: 30 })}${A.circle(['acute', 'right angle', 'obtuse'], ans)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_24.order', topics: ['Y4_NC_24'], level: 2,
    make(R) {
      const degs = R.ints(3, 2, 17).map(x => x * 10);
      const sorted = degs.slice().sort((a, b) => a - b);
      if (sorted[1] - sorted[0] < 20 || sorted[2] - sorted[1] < 20) return null;
      const letters = ['A', 'B', 'C'], order = sorted.map(d => letters[degs.indexOf(d)]);
      const lens = degs.map(() => R.int(12, 17)), rots = degs.map(() => R.int(0, 4) * 10);
      return {
        marks: 1, answer: order.join(', '),
        check: () => order.every((l, i) => i === 0 || degs[letters.indexOf(order[i - 1])] < degs[letters.indexOf(l)]),
        body: A => `${D.row(degs.map((d, i) => ({ fig: D.angle({ deg: d, rot: rots[i], len: lens[i] }), cap: letters[i] })), 6)}<p>Write the angles in order of size, starting with the <b>smallest</b>.</p>${A.boxes(order.map(l => [l]), { w: 14 })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_24.in-shape', topics: ['Y4_NC_24'], level: 2,
    make(R) {
      const pts = []; for (let i = 0; i < 4; i++) pts.push([R.int(0, 7), R.int(0, 5)]);
      // order by angle around the centre so the quadrilateral is simple
      const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4;
      pts.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
      // convex, no repeated points
      for (let i = 0; i < 4; i++) {
        const a = pts[i], b = pts[(i + 1) % 4], c = pts[(i + 2) % 4];
        const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
        if (cr <= 0) return null;
      }
      const g = angles(pts);
      if (g.some(a => a < 30 || (Math.abs(a - 90) < 15 && Math.abs(a - 90) > 1e-6))) return null;
      const askObtuse = R.chance(0.5), cnt = g.filter(a => askObtuse ? a > 90 + 1e-6 : a < 90 - 1e-6).length;
      if (cnt === 0) return null;
      const mm = pts.map(([x, y]) => [x * 9, (5 - y) * 9]);
      const right = g.map((a, i) => Math.abs(a - 90) < 1e-6 ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: F.n(cnt),
        check: () => Math.abs(g.reduce((s, a) => s + a, 0) - 360) < 1e-6,
        body: A => `<p>Right angles are marked with a small square.</p>${D.shape({ pts: mm, right })}<p>How many <b>${askObtuse ? 'obtuse' : 'acute'}</b> angles are inside this shape?</p>${A.box(cnt)}`,
      };
    },
  });
})();
