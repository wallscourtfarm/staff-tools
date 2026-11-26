/* Year 3 question generators, part 2.
 * Covers the Year 3 topics that src/gens/y3.js does not, and adds another format for some that it does.
 * Topic ids from src/topics.json. See src/GENERATORS.md.
 */
(function () {
  const { F, D } = RP;
  const add = RP.add;
  const fr = F.frac;
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pad2 = m => String(m).padStart(2, '0');
  const SP = ',&nbsp;&nbsp;&nbsp;';

  /* ---------------- local helpers ---------------- */

  // True/False table. rows: [[statement, isTrue]]
  const tfTable = (A, rows) => A.table(rows.map(([s, t]) => [s, t ? { a: '✓' } : '', t ? '' : { a: '✓' }]), { head: ['', 'True', 'False'] });
  const tfAnswer = rows => rows.map(([, t]) => (t ? 'True' : 'False')).join(', ');
  // k items from a pool of [text, bool, ...] with at least one true and one false
  function mixed(R, pool, k) {
    for (let i = 0; i < 60; i++) { const s = R.sample(pool, k); if (s.some(x => x[1]) && s.some(x => !x[1])) return s; }
    return null;
  }
  // a sequence with some terms replaced by answer boxes
  const seq = (A, terms, hide, w) => terms.map((t, i) => (hide.includes(i) ? A.blank(t, w || 16) : F.n(t))).join(SP);
  // two things side by side (figure on the left, text or working on the right)
  const side = (l, r) => `<div style="display:flex;gap:5mm;align-items:flex-start;margin-top:2mm"><div style="flex:0 0 auto">${l}</div><div style="flex:1">${r}</div></div>`;
  const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);

  // equal parts in a rows x cols rectangle; `shaded` on paper and scheme, `ans` shaded only on the scheme
  function cells(o, A) {
    const c = o.cell || 10, cw = o.cw || c;
    let s = '', k = 0;
    for (let y = 0; y < o.rows; y++) for (let x = 0; x < o.cols; x++, k++) {
      const cls = (o.shaded || []).includes(k) ? 'shaded' : ((o.ans || []).includes(k) && A && A.show) ? 'ansf' : 'bx';
      s += D.box(1 + x * cw, 1 + y * c, cw, c, cls);
    }
    return D.svg(o.cols * cw + 2, o.rows * c + 2, s);
  }

  // squared or dotty grid (grid units, y up) with polygons, segments, dots and vertex letters
  function gridFig(o, A) {
    const c = o.cell || 6, pad = o.pad || 6, show = A && A.show;
    const W = o.cols * c + 2 * pad, H = o.rows * c + 2 * pad;
    const P = (x, y) => [pad + x * c, pad + (o.rows - y) * c];
    let s = '';
    if (o.dots) {
      for (let x = 0; x <= o.cols; x++) for (let y = 0; y <= o.rows; y++) { const [px, py] = P(x, y); s += `<circle cx="${D.r2(px)}" cy="${D.r2(py)}" r="0.55" class="dot"/>`; }
    } else {
      for (let x = 0; x <= o.cols; x++) s += D.line(...P(x, 0), ...P(x, o.rows), 'gl');
      for (let y = 0; y <= o.rows; y++) s += D.line(...P(0, y), ...P(o.cols, y), 'gl');
    }
    for (const p of o.polys || []) { if (p.ans && !show) continue; s += D.poly(p.pts.map(q => P(q[0], q[1])), p.ans ? 'ansp' : 'shape'); }
    for (const p of o.marks || []) { const [px, py] = P(p[0], p[1]); s += `<circle cx="${D.r2(px)}" cy="${D.r2(py)}" r="0.95" class="fillk"/>`; }
    if (o.vlabels) {
      const { pts, names } = o.vlabels;
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      pts.forEach((q, i) => {
        const dx = q[0] - cx, dy = q[1] - cy, L = Math.hypot(dx, dy) || 1, [px, py] = P(q[0], q[1]);
        s += D.txt(px + dx / L * 3.6, py - dy / L * 3.6 + 1.4, names[i], { size: 3.8, bold: true });
      });
    }
    return D.svg(W, H, s);
  }

  // interior right angles of a polygon (grid points); a reflex corner does not count
  function countRight(pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
    let k = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length], v = pts[i], b = pts[(i + 1) % pts.length];
      const dot = (a[0] - v[0]) * (b[0] - v[0]) + (a[1] - v[1]) * (b[1] - v[1]);
      const cross = (v[0] - a[0]) * (b[1] - v[1]) - (v[1] - a[1]) * (b[0] - v[0]);
      if (dot === 0 && cross * area > 0) k++;
    }
    return k;
  }
  const convex = pts => {
    const n = pts.length; let sg = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], c = pts[(i + 2) % n];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (cr === 0) return false;
      if (sg && Math.sign(cr) !== sg) return false;
      sg = Math.sign(cr);
    }
    return true;
  };
  // rotate grid points by q quarter turns and move them back to x, y >= 0
  function turn(pts, q) {
    let p = pts.map(a => a.slice());
    for (let i = 0; i < q; i++) p = p.map(([x, y]) => [-y, x]);
    const mx = Math.min(...p.map(a => a[0])), my = Math.min(...p.map(a => a[1]));
    return p.map(([x, y]) => [x - mx, y - my]);
  }

  // tally marks for n (groups of five) as an SVG; returns [svg, strokes drawn]
  function tally(n) {
    let s = '', x = 1, strokes = 0;
    for (let g = 0; g < Math.ceil(n / 5); g++) {
      const k = Math.min(5, n - g * 5), x0 = x;
      for (let j = 0; j < Math.min(k, 4); j++) { s += D.line(x, 1, x, 7.5); x += 2; strokes++; }
      if (k === 5) { s += D.line(x0 - 1, 6.5, x - 1, 2); strokes++; }
      x += 2.5;
    }
    return [D.svg(Math.max(x, 4), 8.5, s), strokes];
  }

  // four small angles in a row, letters underneath
  function angleRow(list) {
    const cw = 34, ch = 33, L = 13, rr = 4;
    let s = '';
    list.forEach((o, i) => {
      const cx = i * cw + cw / 2, cy = 14.5, r = o.rot * Math.PI / 180, d = o.deg * Math.PI / 180;
      const p1 = [cx + L * Math.cos(r), cy - L * Math.sin(r)], p2 = [cx + L * Math.cos(r + d), cy - L * Math.sin(r + d)];
      s += D.line(cx, cy, ...p1, 'arm') + D.line(cx, cy, ...p2, 'arm');
      const a0 = [cx + rr * Math.cos(r), cy - rr * Math.sin(r)], a1 = [cx + rr * Math.cos(r + d), cy - rr * Math.sin(r + d)];
      s += `<path d="M${D.r2(a0[0])},${D.r2(a0[1])} A${rr},${rr} 0 0 0 ${D.r2(a1[0])},${D.r2(a1[1])}" class="thin"/>`;
      s += D.txt(cx, ch - 1, o.lab, { size: 4, bold: true });
    });
    return D.svg(list.length * cw, ch, s);
  }

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const FNAME = { 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths', 7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 11: 'elevenths', 12: 'twelfths' };

  /* ================= Number and place value ================= */

  // Y3_004 how many tens: explain a common mistake
  add({
    id: 'Y3_004.explain', topics: ['Y3_004'], level: 2,
    make(R) {
      const tens = R.int(12, 99), n = tens * 10, claim = tens % 10, who = R.name();
      const said = claim === 1 ? 'is 1 ten' : `are ${claim} tens`;
      return {
        marks: 1, answer: `No: there are ${tens} tens`,
        guide: `Award the mark for "no" with a reason, e.g. ${F.n(n)} is ${tens} tens because ${tens} ${F.times} 10 = ${F.n(n)}.`,
        check: () => n / 10 === tens && claim !== tens && Math.floor(n / 100) * 10 + claim === tens,
        body: A => `<p>${who} says,</p><div class="sent c">"There ${said} in ${F.n(n)}."</div><p>Is ${who} correct? Explain how you know.</p>${A.explain(`No. ${F.n(n)} is ${tens} tens, because ${tens} ${F.times} 10 = ${F.n(n)}.`, 2)}`,
      };
    },
  });

  // Y3_006 draw an arrow at a 3-digit number
  add({
    id: 'Y3_006.draw-arrow', topics: ['Y3_006'], level: 2,
    make(R) {
      const start = R.int(1, 8) * 100, half = R.chance(0.5);
      const t = half ? R.int(0, 9) : R.int(1, 9), n = start + t * 10 + (half ? 5 : 0);
      return {
        marks: 1, answer: `Arrow at ${F.n(n)}`,
        guide: half ? `The arrow should be halfway between the marks for ${F.n(n - 5)} and ${F.n(n + 5)}.` : `The arrow should point at the ${ordinal(t)} small mark after ${F.n(start)}.`,
        check: () => n > start && n < start + 100 && (n - start) % 5 === 0 && Math.floor(n / 100) * 100 === start,
        body: A => `<p>Draw an arrow to show where <b>${F.n(n)}</b> goes on this number line.</p>${D.numberLine({ width: 148, min: start, max: start + 100, minor: 10, major: 100, marks: [{ v: n, ans: true }] }, A)}`,
      };
    },
  });

  // Y3_007 missing labels on a scale in 10s, 20s or 25s
  add({
    id: 'Y3_007.labels', topics: ['Y3_007'], level: 2,
    make(R) {
      const step = R.pick([10, 20, 25]), base = R.int(0, 8) * 100, parts = 100 / step;
      const ks = R.ints(2, 1, parts - 1).sort((a, b) => a - b);
      if (ks[1] - ks[0] < 2) return null;
      const vs = ks.map(k => base + k * step);
      return {
        marks: 1, answer: vs.map(v => F.n(v)).join(' and '),
        guide: 'Both numbers needed for the mark.',
        check: () => vs.every(v => (v - base) % step === 0 && v > base && v < base + 100) && parts * step === 100,
        body: A => `<p>This number line is split into ${parts} equal parts.</p><p>Write the missing numbers in the boxes.</p>${D.numberLine({ width: 148, min: base, max: base + 100, minor: step, major: 100, labels: [base, base + 100], labelBoxes: vs }, A)}`,
      };
    },
  });

  // Y3_NC_01 10 or 100 more or less
  add({
    id: 'Y3_NC_01.more-less', topics: ['Y3_NC_01'], level: 1,
    make(R) {
      const [delta, word] = R.pick([[10, 'more'], [-10, 'less'], [100, 'more'], [-100, 'less']]);
      let n = R.int(120, 880);
      if (R.chance(0.4)) {
        if (delta === 10) n = Math.floor(n / 100) * 100 + 90 + R.int(1, 9);
        if (delta === -10) n = Math.floor(n / 100) * 100 + R.int(1, 9);
      }
      if (delta === -100 && n < 200) return null;
      const ans = n + delta, form = R.int(0, 1), big = Math.abs(delta) === 100;
      return {
        marks: 1, answer: F.n(ans),
        check: () => big ? (ans % 100 === n % 100 && Math.floor(ans / 100) - Math.floor(n / 100) === delta / 100)
          : (ans % 10 === n % 10 && Math.floor(ans / 10) - Math.floor(n / 10) === delta / 10),
        body: A => form ? `<p>Write the number that is <b>${Math.abs(delta)} ${word}</b> than ${F.n(n)}.</p>${A.box(ans)}`
          : `<p>Write the missing number.</p><div class="sent c">${Math.abs(delta)} ${word} than ${F.n(n)} is ${A.blank(ans, 18)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_NC_01.count-50s', topics: ['Y3_NC_01'], level: 1,
    make(R) {
      const step = R.pick([50, 50, 100]), up = R.chance(0.65);
      const k0 = step === 50 ? R.int(0, 14) : R.int(0, 5);
      const terms = range(0, 4).map(i => (k0 + i) * step);
      if (!up) terms.reverse();
      const hide = R.sample([0, 1, 2, 3, 4], 2).sort((a, b) => a - b);
      return {
        marks: 1, answer: hide.map(i => F.n(terms[i])).join(' and '),
        guide: 'Both numbers needed for the mark.',
        check: () => terms.every((t, i) => t % 50 === 0 && (i === 0 || Math.abs(t - terms[i - 1]) === step)),
        body: A => `<p>Write the missing numbers in this sequence.</p><div class="sent c">${seq(A, terms, hide, 18)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_NC_01.mistake', topics: ['Y3_NC_01'], level: 2,
    make(R) {
      const [size, word] = R.pick([[10, 'more'], [10, 'less'], [100, 'more'], [100, 'less']]);
      const n = R.int(210, 789), tensD = Math.floor(n / 10) % 10;
      if (tensD === 0 || tensD === 9) return null;
      const sign = word === 'more' ? 1 : -1, right = n + sign * size, other = size === 10 ? 100 : 10;
      const ok = R.chance(0.25), claim = ok ? right : n + sign * other, who = R.name();
      const place = s => s === 10 ? 'tens' : 'hundreds';
      return {
        marks: 1, answer: ok ? 'Yes' : `No: it is ${F.n(right)}`,
        guide: ok ? 'Award the mark for "yes" with a reason.' : `Award the mark for "no" with the correct number ${F.n(right)} or a clear reason.`,
        check: () => (right - n) === sign * size && ok === (claim === right) && String(right).length === 3,
        body: A => `<p>${who} says,</p><div class="sent c">"${size} ${word} than ${F.n(n)} is ${F.n(claim)}."</div><p>Is ${who} correct? Explain how you know.</p>${A.explain(ok
          ? `Yes. Only the ${place(size)} digit changes, so it is ${F.n(right)}.`
          : `No. It is ${F.n(right)}. ${who} changed the ${place(other)} digit.`, 2)}`,
      };
    },
  });

  // Y3_NC_02 compare and order numbers to 1,000
  add({
    id: 'Y3_NC_02.symbol', topics: ['Y3_NC_02'], level: 1,
    make(R) {
      const h = R.int(1, 9);
      const a = h * 100 + R.int(0, 99);
      let b;
      if (R.chance(0.3)) { const d = String(a).split(''); b = +[d[0], d[2], d[1]].join(''); }
      else b = (R.chance(0.6) ? h : R.int(1, 9)) * 100 + R.int(0, 99);
      if (a === b || b < 100) return null;
      const sym = a < b ? '&lt;' : '&gt;';
      return {
        marks: 1, answer: sym,
        check: () => (String(a) < String(b)) === (sym === '&lt;'),
        body: A => `<p>Write &lt; or &gt; to make this correct.</p><div class="sent c">${F.n(a)} ${A.blank(sym, 12)} ${F.n(b)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_NC_02.order', topics: ['Y3_NC_02'], level: 2,
    make(R) {
      const [x, y, z] = R.ints(3, 1, 9);
      const perms = [[x, y, z], [x, z, y], [y, x, z], [y, z, x], [z, x, y], [z, y, x]].map(p => +p.join(''));
      const nums = R.sample(perms, 4), desc = R.chance(0.3);
      const order = nums.slice().sort((a, b) => desc ? b - a : a - b);
      return {
        marks: 1, answer: order.map(v => F.n(v)).join(', '),
        guide: 'All four in the correct order for the mark.',
        check: () => order.every((v, i) => i === 0 || (desc ? String(order[i - 1]) > String(v) : String(order[i - 1]) < String(v))),
        body: A => `<p>Write these numbers in order, starting with the <b>${desc ? 'largest' : 'smallest'}</b>.</p><div class="sent c">${nums.map(v => F.n(v)).join(SP)}</div>${A.boxes(order.map(v => [v]), { w: 18 })}`,
      };
    },
  });
  add({
    id: 'Y3_NC_02.digit-cards', topics: ['Y3_NC_02'], level: 2,
    make(R) {
      const zero = R.chance(0.35);
      const ds = R.shuffle(zero ? [0, ...R.ints(2, 1, 9)] : R.ints(3, 1, 9));
      const want = R.pick(['largest', 'smallest']);
      const up = ds.slice().sort((a, b) => a - b);
      let ans;
      if (want === 'largest') ans = +up.slice().reverse().join('');
      else { const u = up.slice(); if (u[0] === 0) [u[0], u[1]] = [u[1], u[0]]; ans = +u.join(''); }
      const card = d => `<span style="display:inline-block;border:.45mm solid #000;border-radius:1.5mm;padding:1.5mm 3.5mm;margin:0 2mm;font-size:16pt;font-weight:bold">${d}</span>`;
      return {
        marks: 1, answer: F.n(ans),
        check: () => {
          const all = [];
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++)
            if (i !== j && j !== k && i !== k && ds[i] !== 0) all.push(ds[i] * 100 + ds[j] * 10 + ds[k]);
          return ans === (want === 'largest' ? Math.max(...all) : Math.min(...all));
        },
        body: A => `<p>Here are three digit cards.</p><div class="sent c">${ds.map(card).join('')}</div><p>Use each card once to make the <b>${want}</b> 3-digit number you can.</p>${A.box(ans)}`,
      };
    },
  });

  /* ================= Number facts ================= */

  // Y3_008 addition and subtraction facts that cross 10
  add({
    id: 'Y3_008.missing', topics: ['Y3_008'], level: 1,
    make(R) {
      const a = R.int(2, 9), b = R.int(Math.max(2, 11 - a), 9), s = a + b, f = R.int(0, 4);
      const forms = [
        [A => `${a} + ${b} = ${A.blank(s)}`, s],
        [A => `${a} + ${A.blank(b)} = ${s}`, b],
        [A => `${A.blank(a)} + ${b} = ${s}`, a],
        [A => `${s} ${F.minus} ${a} = ${A.blank(b)}`, b],
        [A => `${s} ${F.minus} ${A.blank(b)} = ${a}`, b],
      ];
      return {
        marks: 1, answer: F.n(forms[f][1]),
        check: () => s >= 11 && s - b === a && a < 10 && b < 10,
        body: A => `<p>Write the missing number.</p><div class="sent c">${forms[f][0](A)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_008.mistake', topics: ['Y3_008'], level: 2,
    make(R) {
      const sub = R.chance(0.6);
      let a, b, r;
      if (sub) { a = R.int(11, 18); b = R.int(Math.max(2, a - 9), 9); r = a - b; }
      else { a = R.int(3, 9); b = R.int(Math.max(2, 11 - a), 9); r = a + b; }
      const ok = R.chance(0.25), claim = ok ? r : r + R.pick([-1, 1]), who = R.name();
      const op = sub ? F.minus : '+';
      const back = sub ? `${r} + ${b} = ${a}` : `${r} ${F.minus} ${b} = ${a}`;
      return {
        marks: 1, answer: ok ? 'Yes' : `No: ${a} ${op} ${b} = ${r}`,
        guide: ok ? `Award the mark for "yes" with a reason, e.g. ${back}.` : `Award the mark for "no" with the correct answer ${r}, or a check such as ${back}.`,
        check: () => (sub ? r + b === a : r - b === a) && (claim === r) === ok,
        body: A => `<p>${who} says,</p><div class="sent c">${a} ${op} ${b} = ${claim}</div><p>Is ${who} correct? Explain how you know.</p>${A.explain(ok ? `Yes, because ${back}.` : `No. ${a} ${op} ${b} = ${r}, because ${back}.`, 2)}`,
      };
    },
  });
  add({
    id: 'Y3_008.word', topics: ['Y3_008'], level: 3,
    make(R) {
      const a = R.int(5, 9), b = R.int(11 - a, 9), s1 = a + b, c = R.int(s1 % 10 + 1, 9), end = s1 - c;
      const [who, who2] = R.names(2), th = R.pick(['stickers', 'marbles', 'shells', 'cards', 'beads']);
      return {
        marks: 2, method: true, answer: F.n(end),
        guide: `Award 1 mark for ${a} + ${b} = ${s1} with a later slip.`,
        check: () => end + c - b === a && s1 > 10 && end > 0,
        body: A => `<p>${who} has ${a} ${th}.</p><p>${who2} gives ${who} ${b} more ${th}.</p><p>Then ${who} gives away ${c} ${th}.</p><p>How many ${th} does ${who} have now?</p>${A.work(`${a} + ${b} = ${s1}<br>${s1} ${F.minus} ${c} = ${end}`, 28)}${A.box(end)}`,
      };
    },
  });

  // Y3_009 times tables in a two-step problem
  add({
    id: 'Y3_009.word', topics: ['Y3_009'], level: 3,
    make(R) {
      const t = R.pick([2, 4, 5, 8, 10]), k = R.int(3, 10), tot = t * k;
      const e = R.int(2, Math.min(tot - 2, 19)), left = tot - e, who = R.name();
      const ctx = R.pick([
        [`Cakes are sold in boxes of ${t}.`, `${who} buys ${k} boxes of cakes.`, `${e} cakes are eaten at a party.`, 'How many cakes are left?'],
        [`Pens come in packs of ${t}.`, `${who} buys ${k} packs of pens.`, `${who} gives away ${e} pens.`, `How many pens does ${who} have left?`],
        [`Eggs are packed in boxes of ${t}.`, `A farmer fills ${k} boxes.`, `${e} of the eggs are sold.`, 'How many eggs are not sold?'],
      ]);
      return {
        marks: 2, method: true, answer: F.n(left),
        guide: `Award 1 mark for ${k} ${F.times} ${t} = ${tot} with a later slip.`,
        check: () => left + e === t * k && (tot / t) === k,
        body: A => `<p>${ctx[0]}</p><p>${ctx[1]}</p><p>${ctx[2]}</p><p>${ctx[3]}</p>${A.work(`${k} ${F.times} ${t} = ${tot}<br>${tot} ${F.minus} ${e} = ${left}`, 28)}${A.box(left)}`,
      };
    },
  });

  // Y3_010 facts 10 times bigger
  add({
    id: 'Y3_010.ten-times', topics: ['Y3_010'], level: 1,
    make(R) {
      const op = R.int(0, 2);
      let fact, big, ans, chk;
      if (op === 0) { const a = R.int(2, 9), b = R.int(2, 9); fact = `${a} + ${b} = ${a + b}`; big = `${a * 10} + ${b * 10}`; ans = (a + b) * 10; chk = () => ans - b * 10 === a * 10; }
      else if (op === 1) { const s = R.int(11, 18), b = R.int(s - 9, 9), d = s - b; fact = `${s} ${F.minus} ${b} = ${d}`; big = `${s * 10} ${F.minus} ${b * 10}`; ans = d * 10; chk = () => ans + b * 10 === s * 10; }
      else {
        const t = R.pick([2, 3, 4, 5, 8]), k = R.int(3, 9);
        fact = `${t} ${F.times} ${k} = ${t * k}`;
        big = R.chance(0.5) ? `${t * 10} ${F.times} ${k}` : `${t} ${F.times} ${k * 10}`;
        ans = t * k * 10; chk = () => ans / 10 / k === t;
      }
      return {
        marks: 1, answer: F.n(ans), check: chk,
        body: A => `<div class="sent c">${fact}</div><p>Use this fact to work out</p><div class="sent c">${big} = ${A.blank(ans, 18)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_010.missing', topics: ['Y3_010'], level: 2,
    make(R) {
      const t = R.pick([2, 3, 4, 5, 8]), k = R.int(2, 9), p = t * k * 10, f = R.int(0, 2);
      const forms = [
        [A => `${t} ${F.times} ${A.blank(k * 10)} = ${p}`, k * 10],
        [A => `${p} ${F.div} ${t} = ${A.blank(k * 10)}`, k * 10],
        [A => `${t * 10} ${F.times} ${A.blank(k)} = ${p}`, k],
      ];
      return {
        marks: 1, answer: F.n(forms[f][1]),
        check: () => p / t === k * 10 && p % (t * 10) === 0,
        body: A => `<p>Write the missing number.</p><div class="sent c">${forms[f][0](A)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_010.mistake', topics: ['Y3_010'], level: 2,
    make(R) {
      const kind = R.int(0, 2), who = R.name();
      let small, big, right, wrong, ex;
      if (kind === 0) {
        const a = R.int(2, 9), b = R.int(2, 9);
        small = `${a} + ${b} = ${a + b}`; big = `${a * 10} + ${b * 10}`; right = (a + b) * 10; wrong = a + b;
        ex = `${big} = ${F.n(right)}. ${a} tens + ${b} tens = ${a + b} tens, which is ${F.n(right)}, not ${wrong}.`;
      } else if (kind === 1) {
        const a = R.int(3, 9), b = R.int(1, a - 1);
        small = `${a} ${F.minus} ${b} = ${a - b}`; big = `${a * 10} ${F.minus} ${b * 10}`; right = (a - b) * 10; wrong = a - b;
        ex = `${big} = ${F.n(right)}. ${a} tens ${F.minus} ${b} tens = ${a - b} ${a - b === 1 ? "ten" : "tens"}, which is ${F.n(right)}, not ${wrong}.`;
      } else {
        const t = R.pick([2, 3, 4, 5, 8]), k = R.int(3, 9);
        small = `${t} ${F.times} ${k} = ${t * k}`; big = `${t * 10} ${F.times} ${k}`; right = t * k * 10; wrong = t * k * 100;
        ex = `${big} = ${F.n(right)}. ${t} tens ${F.times} ${k} = ${t * k} tens, which is ${F.n(right)}, not ${F.n(wrong)}.`;
      }
      return {
        marks: 1, answer: `${big} = ${F.n(right)}`,
        guide: `Award the mark for an explanation that gives the correct answer ${F.n(right)} or explains that the answer is ten times bigger than the known fact.`,
        check: () => right !== wrong && (kind === 2 ? right * 10 === wrong : right === wrong * 10),
        body: A => `<p>${who} knows that ${small}.</p><p>${who} says,</p><div class="sent c">${big} = ${F.n(wrong)}</div><p>Explain the mistake ${who} has made.</p>${A.explain(ex, 2)}`,
      };
    },
  });
  add({
    id: 'Y3_010.word', topics: ['Y3_010'], level: 3,
    make(R) {
      const price = R.pick([20, 30, 40, 50, 60]), qty = R.int(2, 6), total = price * qty;
      const pay = [100, 200, 500].find(p => p > total);
      if (!pay || total > 400) return null;
      const change = pay - total, who = R.name();
      const payText = { 100: 'a £1 coin', 200: 'a £2 coin', 500: 'a £5 note' }[pay];
      const item = R.pick(['cakes', 'apples', 'pencils', 'badges', 'rubbers', 'bookmarks']);
      return {
        marks: 2, method: true, answer: F.money(change, true),
        guide: `${change >= 100 ? `Accept ${change}p. ` : ''}Award 1 mark for ${qty} ${F.times} ${price}p = ${total}p with a later slip.`,
        check: () => (pay - change) / qty === price && change > 0,
        body: A => `<p>${cap(item)} cost ${price}p each.</p><p>${who} buys ${qty} ${item} and pays with ${payText}.</p><p>How much change does ${who} get?</p>${A.work(`${qty} ${F.times} ${price}p = ${total}p<br>${F.money(pay)} ${F.minus} ${F.money(total, true)} = ${F.money(change, true)}`, 28)}${A.box(F.money(change, true))}`,
      };
    },
  });

  // new_d_gyjsomge_2_mwtavua1: 2, 5 and 10 times tables and division facts, multiples
  const T2510 = 'new_d_gyjsomge_2_mwtavua1';
  add({
    id: T2510 + '.facts', topics: [T2510], level: 1,
    make(R) {
      const t = R.pick([2, 5, 10]), k = R.int(2, 12), p = t * k, f = R.int(0, 3);
      const forms = [
        [A => `${t} ${F.times} ${k} = ${A.blank(p)}`, p],
        [A => `${p} ${F.div} ${t} = ${A.blank(k)}`, k],
        [A => `${A.blank(k)} ${F.times} ${t} = ${p}`, k],
        [A => `${p} ${F.div} ${A.blank(t)} = ${k}`, t],
      ];
      return {
        marks: 1, answer: F.n(forms[f][1]),
        check: () => p / k === t && p % t === 0,
        body: A => `<p>Write the missing number.</p><div class="sent c">${forms[f][0](A)}</div>`,
      };
    },
  });
  add({
    id: T2510 + '.true-false', topics: [T2510], level: 2,
    make(R) {
      const nTrue = R.int(1, 2), rows = [], used = [];
      for (let i = 0; i < 3; i++) {
        const t = R.pick([2, 5, 10]), truth = i < nTrue;
        let n;
        for (let g = 0; g < 50; g++) {
          n = truth ? t * R.int(3, t === 2 ? 49 : t === 5 ? 19 : 9) : R.int(11, 99);
          if (!used.includes(n) && (n % t === 0) === truth) break;
        }
        if (used.includes(n) || (n % t === 0) !== truth) return null;
        used.push(n);
        rows.push([`${n} is a multiple of ${t}.`, truth, n, t]);
      }
      const sh = R.shuffle(rows);
      const lastDigit = { 2: [0, 2, 4, 6, 8], 5: [0, 5], 10: [0] };
      return {
        marks: 1, answer: tfAnswer(sh), guide: 'All three correct for the mark.',
        check: () => sh.every(([, tr, n, t]) => lastDigit[t].includes(n % 10) === tr),
        body: A => `<p>Tick <b>True</b> or <b>False</b> for each sentence.</p>${tfTable(A, sh)}`,
      };
    },
  });
  add({
    id: T2510 + '.teams', topics: [T2510], level: 3,
    make(R) {
      const t = R.pick([2, 5, 10]), k = R.int(3, 10), n = t * k, m = R.pick([2, 5, 10]), ans = k * m;
      if (t === 10 && k > 9) return null;
      const what = R.pick([['teams of', 'Each team needs', 'cones', 'How many cones are needed?'], ['groups of', 'Each group gets', 'pencils', 'How many pencils are given out?']]);
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: `Award 1 mark for finding ${k} ${what[0].split(' ')[0]} (${n} ${F.div} ${t}) with a later slip.`,
        check: () => ans / m * t === n,
        body: A => `<p>There are ${n} children in a hall.</p><p>They get into ${what[0]} ${t}.</p><p>${what[1]} ${m} ${what[2]}.</p><p>${what[3]}</p>${A.work(`${n} ${F.div} ${t} = ${k}<br>${k} ${F.times} ${m} = ${ans}`, 28)}${A.box(ans)}`,
      };
    },
  });

  // new_d_n8bvzswy_9_mwuwlh5c: count in multiples of 3 and 6
  const T36 = 'new_d_n8bvzswy_9_mwuwlh5c';
  add({
    id: T36 + '.sequence', topics: [T36], level: 1,
    make(R) {
      const step = R.pick([3, 6]), k0 = R.int(0, step === 3 ? 8 : 6), up = R.chance(0.7), who = R.name();
      const terms = range(0, 4).map(i => (k0 + i) * step);
      if (!up) terms.reverse();
      const hide = R.sample([0, 1, 2, 3, 4], 2).sort((a, b) => a - b);
      return {
        marks: 1, answer: hide.map(i => F.n(terms[i])).join(' and '), guide: 'Both numbers needed for the mark.',
        check: () => terms.every((t, i) => t % step === 0 && (i === 0 || Math.abs(t - terms[i - 1]) === step)),
        body: A => `<p>${who} counts ${up ? 'up' : 'back'} in ${step}s.</p><p>Write the missing numbers.</p><div class="sent c">${seq(A, terms, hide)}</div>`,
      };
    },
  });
  add({
    id: T36 + '.will-say', topics: [T36], level: 2,
    make(R) {
      const step = R.pick([3, 6]), yes = R.chance(0.5), who = R.name();
      let n;
      if (yes) n = step * R.int(step === 3 ? 9 : 5, 12);
      else { n = R.int(20, 70); if (n % step === 0) return null; }
      const below = Math.floor(n / step) * step, above = below + step;
      const digitSum = String(n).split('').reduce((a, d) => a + +d, 0);
      return {
        marks: 1, answer: yes ? `Yes (${n / step} ${F.times} ${step} = ${n})` : `No (${below}, ${above})`,
        guide: `Award the mark for "${yes ? 'yes' : 'no'}" with a reason.`,
        check: () => yes === (digitSum % 3 === 0 && (step === 3 || n % 2 === 0)),
        body: A => `<p>${who} counts in ${step}s from 0.</p><p>Will ${who} say the number <b>${n}</b>?</p>${A.circle(['Yes', 'No'], yes ? 0 : 1)}<p>Explain how you know.</p>${A.explain(yes ? `Yes. ${n / step} ${F.times} ${step} = ${n}, so ${n} is in the count.` : `No. The count goes ${below}, ${above}, so it jumps over ${n}.`, 2)}`,
      };
    },
  });
  add({
    id: T36 + '.number-line', topics: [T36], level: 2,
    make(R) {
      const step = R.pick([3, 6]), k = R.int(2, 9), v = k * step;
      return {
        marks: 1, answer: F.n(v),
        check: () => v / step === k && v < 10 * step,
        body: A => `<p>This number line goes up in ${step}s.</p><p>What number is the arrow pointing to?</p>${D.numberLine({ width: 148, min: 0, max: 10 * step, minor: step, major: 10 * step, labels: [0, step, 10 * step], marks: [{ v, box: true }] }, A)}`,
      };
    },
  });

  /* ================= Addition and subtraction ================= */

  // Y3_011 complements to 100: spot the mistake
  add({
    id: 'Y3_011.mistake', topics: ['Y3_011'], level: 2,
    make(R) {
      const t1 = R.int(1, 8), o1 = R.int(1, 9), n = 10 * t1 + o1, right = 100 - n, wrong = (10 - t1) * 10 + (10 - o1), who = R.name();
      return {
        marks: 1, answer: `No: ${n} + ${right} = 100`,
        guide: `Award the mark for "no" with a reason, e.g. the total is 110, or ${n} + ${right} = 100.`,
        check: () => n + wrong === 110 && n + right === 100,
        body: A => `<p>${who} says these two numbers add to make 100.</p><div class="sent c">${n} &nbsp;and&nbsp; ${wrong}</div><p>Is ${who} correct? Explain how you know.</p>${A.explain(`No. ${n} + ${wrong} = 110. ${n} + ${right} = 100.`, 2)}`,
      };
    },
  });

  // Y3_012 column addition and subtraction (calculation)
  add({
    id: 'Y3_012.column', topics: ['Y3_012'], level: 1,
    make(R) {
      const sub = R.chance(0.5), a = R.int(234, 899), b = R.int(115, 599);
      const dg = (x, p) => Math.floor(x / p) % 10;
      if (sub) { if (b >= a - 50) return null; if (!(dg(a, 1) < dg(b, 1) || dg(a, 10) < dg(b, 10))) return null; }
      else { if (a + b > 999) return null; if (!(dg(a, 1) + dg(b, 1) >= 10 || dg(a, 10) + dg(b, 10) >= 10)) return null; }
      const ans = sub ? a - b : a + b;
      return {
        marks: 1, answer: F.n(ans),
        check: () => sub ? ans + b === a : ans - b === a,
        body: A => `<p>Work out</p><div class="sent c">${F.n(a)} ${sub ? F.minus : '+'} ${F.n(b)} = ${A.blank(ans, 22)}</div>`,
      };
    },
  });

  // Y3_013 addition and subtraction as inverses; part-whole; order
  add({
    id: 'Y3_013.part-whole', topics: ['Y3_013'], level: 1,
    make(R) {
      const p1 = R.int(120, 560), p2 = R.int(110, 430), W = p1 + p2;
      if (W > 999) return null;
      const hide = R.int(0, 2), val = [W, p1, p2][hide];
      const cell = (i, x) => (i === hide ? { a: x } : x);
      return {
        marks: 1, answer: F.n(val),
        check: () => W - p1 === p2 && val === (hide === 0 ? p2 + p1 : hide === 1 ? W - p2 : W - p1),
        body: A => `<p>Write the missing number in this part–whole model.</p>${D.partWhole({ whole: cell(0, W), parts: [cell(1, p1), cell(2, p2)] }, A)}`,
      };
    },
  });
  add({
    id: 'Y3_013.true-false', topics: ['Y3_013'], level: 2,
    make(R) {
      const p1 = R.int(21, 79), p2 = R.intNot(11, 69, [p1]), W = p1 + p2, m = F.minus;
      // [text, true?, left value, right value]
      const pool = [
        [`${p1} + ${p2} = ${p2} + ${p1}`, true, p1 + p2, p2 + p1],
        [`${W} ${m} ${p2} = ${p1}`, true, W - p2, p1],
        [`${p2} + ${p1} = ${W}`, true, p2 + p1, W],
        [`${W} ${m} ${p1} = ${p2}`, true, W - p1, p2],
        [`${p1} ${m} ${p2} = ${p2} ${m} ${p1}`, false, p1 - p2, p2 - p1],
        [`${W} ${m} ${p1} = ${W} ${m} ${p2}`, false, W - p1, W - p2],
        [`${p1} + ${W} = ${p2}`, false, p1 + W, p2],
      ];
      const rows = mixed(R, pool, 3);
      if (!rows) return null;
      return {
        marks: 1, answer: tfAnswer(rows), guide: 'All three correct for the mark.',
        check: () => rows.every(r => (r[2] === r[3]) === r[1]),
        body: A => `<p>Here is a part–whole model.</p>${D.row([D.partWhole({ whole: W, parts: [p1, p2] }), tfTable(A, rows)], 6)}<p>Tick <b>True</b> or <b>False</b> for each number sentence.</p>`,
      };
    },
  });
  add({
    id: 'Y3_013.inverse', topics: ['Y3_013'], level: 2,
    make(R) {
      const a = R.int(120, 560), b = R.int(110, 430), W = a + b, who = R.name();
      if (W > 999) return null;
      if (R.chance(0.5)) {
        return {
          marks: 1, answer: `${F.n(a)} + ${F.n(b)} = ${F.n(W)}`, guide: `Accept ${F.n(b)} + ${F.n(a)} = ${F.n(W)}.`,
          check: () => W - b === a && b + a === W,
          body: A => `<p>${who} works out</p><div class="sent c">${F.n(W)} ${F.minus} ${F.n(b)} = ${F.n(a)}</div><p>Write an <b>addition</b> ${who} could do to check this answer.</p>${A.box(`${F.n(a)} + ${F.n(b)} = ${F.n(W)}`, { w: 60 })}`,
        };
      }
      const f = R.int(0, 1);
      return {
        marks: 1, answer: F.n(f ? b : a),
        check: () => W - (f ? a : b) === (f ? b : a),
        body: A => `<div class="sent c">${F.n(a)} + ${F.n(b)} = ${F.n(W)}</div><p>Use this fact to complete</p><div class="sent c">${f ? `${F.n(W)} ${F.minus} ${A.blank(b, 18)} = ${F.n(a)}` : `${F.n(W)} ${F.minus} ${F.n(b)} = ${A.blank(a, 18)}`}</div>`,
      };
    },
  });

  /* ================= Multiplication and division ================= */

  // Y3_014 sharing and grouping in context
  add({
    id: 'Y3_014.share-group', topics: ['Y3_014'], level: 1,
    make(R) {
      const d = R.pick([2, 3, 4, 5, 8, 10]), k = R.int(2, 10), n = d * k, who = R.name(), form = R.int(0, 2);
      const th = R.pick(['sweets', 'stickers', 'grapes', 'cards', 'marbles']);
      const text = [
        `<p>${who} shares ${n} ${th} equally between ${d} friends.</p><p>How many ${th} does each friend get?</p>`,
        `<p>${n} children get into teams of ${d}.</p><p>How many teams are there?</p>`,
        `<p>${who} puts ${n} ${th} into bags. Each bag holds ${d} ${th}.</p><p>How many bags does ${who} fill?</p>`,
      ][form];
      return {
        marks: 1, answer: F.n(k),
        check: () => k * d === n,
        body: A => `${text}${A.box(k)}`,
      };
    },
  });
  add({
    id: 'Y3_014.picture', topics: ['Y3_014'], level: 1,
    make(R) {
      const g = R.int(2, 5), p = R.int(2, 6), n = g * p;
      return {
        marks: 1, answer: `${g} ${F.times} ${p} = ${n}`,
        guide: `Accept ${p} ${F.times} ${g} = ${n}. All three numbers needed for the mark.`,
        check: () => n / p === g && n % g === 0,
        body: A => `<p>Complete the multiplication for this picture.</p>${D.groups({ groups: g, per: p })}<div class="sent c">${A.blank(g)} ${F.times} ${A.blank(p)} = ${A.blank(n)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_014.word', topics: ['Y3_014'], level: 3,
    make(R) {
      const who = R.name();
      if (R.chance(0.5)) {
        const x = R.int(2, 5), y = R.pick([3, 4, 5, 6, 8, 10]), tot = x * y;
        if (tot > 60) return null;
        if (tot < 12) return null;
        const zs = [2, 3, 4, 5, 6, 8, 10].filter(z => z !== x && z !== y && tot % z === 0 && tot / z >= 2 && tot / z !== y);
        if (!zs.length) return null;
        const z = R.pick(zs), ans = tot / z;
        return {
          marks: 2, method: true, answer: F.n(ans),
          guide: `Award 1 mark for ${x} ${F.times} ${y} = ${tot} with a later slip.`,
          check: () => ans * z === x * y,
          body: A => `<p>${who} buys ${x} packs of stickers. Each pack has ${y} stickers.</p><p>${who} shares all the stickers equally between ${z} friends.</p><p>How many stickers does each friend get?</p>${A.work(`${x} ${F.times} ${y} = ${tot}<br>${tot} ${F.div} ${z} = ${ans}`, 28)}${A.box(ans)}`,
        };
      }
      const s = R.pick([4, 5, 6]), t = R.int(3, 8), e = R.int(2, 9), ans = s * t - e;
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: `Award 1 mark for ${t} ${F.times} ${s} = ${s * t} with a later slip.`,
        check: () => ans + e === s * t,
        body: A => `<p>Each table in a classroom has ${s} seats.</p><p>There are ${t} tables. ${e} seats are empty.</p><p>How many children are sitting down?</p>${A.work(`${t} ${F.times} ${s} = ${s * t}<br>${s * t} ${F.minus} ${e} = ${ans}`, 28)}${A.box(ans)}`,
      };
    },
  });

  // Y3_NC_03 2-digit x 1-digit
  add({
    id: 'Y3_NC_03.calc', topics: ['Y3_NC_03'], level: 1,
    make(R) {
      const b = R.pick([2, 3, 4, 5, 8]), a = R.int(12, b >= 5 ? 49 : 99), ans = a * b;
      if (a % 10 === 0) return null;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans % b === 0 && ans / b === a,
        body: A => `<p>Work out</p><div class="sent c">${a} ${F.times} ${b} = ${A.blank(ans, 20)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_NC_03.mistake', topics: ['Y3_NC_03'], level: 2,
    make(R) {
      const b = R.pick([3, 4, 5, 8]), t = R.int(1, b <= 4 ? 9 : 4), o = R.int(2, 9), a = 10 * t + o, who = R.name();
      const err = R.int(0, 2);
      const s0 = err === 0 ? t * b : t * 10 * b;
      const s1 = err === 1 ? o * b + R.pick([-b, b]) : o * b;
      const s2 = err === 2 ? s0 + s1 + R.pick([-10, 10]) : s0 + s1;
      const ans = a * b;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans === t * 10 * b + o * b && s2 !== ans,
        body: A => `<p>${who} works out ${a} ${F.times} ${b} like this.</p><div style="text-align:center;font-size:13pt;line-height:1.7">${t * 10} ${F.times} ${b} = ${F.n(s0)}<br>${o} ${F.times} ${b} = ${F.n(s1)}<br>${F.n(s0)} + ${F.n(s1)} = ${F.n(s2)}</div><p>${who} has made a mistake. What is the correct answer to ${a} ${F.times} ${b}?</p>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_03.word', topics: ['Y3_NC_03'], level: 3,
    make(R) {
      const form = R.int(0, 1);
      if (form === 0) {
        const s = R.int(21, 49), k = R.int(2, 4), e = R.int(2, 15), ans = s * k - e;
        return {
          marks: 2, method: true, answer: F.n(ans),
          guide: `Award 1 mark for ${s} ${F.times} ${k} = ${s * k} with a later slip.`,
          check: () => ans + e === s * k,
          body: A => `<p>A coach has ${s} seats.</p><p>${k} coaches go on a school trip. ${e} seats are empty.</p><p>How many people go on the trip?</p>${A.work(`${s} ${F.times} ${k} = ${s * k}<br>${s * k} ${F.minus} ${e} = ${ans}`, 28)}${A.box(ans)}`,
        };
      }
      const s = R.int(12, 48), k = R.int(3, 8), tot = s * k;
      if (tot > 400 || s % 10 === 0) return null;
      const e = R.int(10, Math.min(tot - 10, 90)), ans = tot - e;
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: `Award 1 mark for ${s} ${F.times} ${k} = ${tot} with a later slip.`,
        check: () => ans + e === s * k,
        body: A => `<p>A box holds ${s} pencils.</p><p>A school buys ${k} boxes. The teachers give out ${e} pencils.</p><p>How many pencils are left?</p>${A.work(`${s} ${F.times} ${k} = ${tot}<br>${tot} ${F.minus} ${e} = ${ans}`, 28)}${A.box(ans)}`,
      };
    },
  });

  /* ================= Fractions ================= */

  // Y3_015 read and write fractions of a shape
  const GRIDS = [[2, 2], [2, 3], [2, 4], [3, 3], [2, 5], [3, 4]];
  function partsFig(R, kind, o, A) {
    // returns {d, fig(A)} for a bar, circle or rectangle grid
    if (kind === 'bar') { const d = o.d || R.int(3, 10); return { d, fig: A2 => cells({ rows: 1, cols: d, cw: 96 / d, cell: 12, shaded: o.shaded, ans: o.ans }, A2) }; }
    const [r, c] = o.rc || R.pick(GRIDS);
    return { d: r * c, fig: A2 => cells({ rows: r, cols: c, cell: 11, shaded: o.shaded, ans: o.ans }, A2) };
  }
  add({
    id: 'Y3_015.name', topics: ['Y3_015'], level: 1,
    make(R) {
      const kind = R.pick(['bar', 'circle', 'grid']), not = R.chance(0.3);
      let d, n, fig, count;
      if (kind === 'circle') {
        d = R.pick([3, 4, 5, 6, 8]); n = R.int(1, d - 1); count = n;
        fig = D.fractionCircle({ parts: d, shaded: n, r: 16 });
      } else {
        const rc = R.pick(GRIDS);
        d = kind === 'bar' ? R.int(3, 10) : rc[0] * rc[1];
        n = R.int(1, d - 1);
        const shaded = R.sample(range(0, d - 1), n); count = shaded.length;
        fig = kind === 'bar' ? cells({ rows: 1, cols: d, cw: 96 / d, cell: 12, shaded }) : cells({ rows: rc[0], cols: rc[1], cell: 11, shaded });
      }
      const an = not ? d - n : n;
      return {
        marks: 1, answer: fr(an, d), guide: 'Accept an equivalent fraction.',
        check: () => count === n && an + (not ? n : d - n) === d && an > 0 && an < d,
        body: A => `<p>What fraction of this shape is ${not ? '<b>not</b> shaded' : 'shaded'}?</p>${fig}${A.box(fr(an, d), { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y3_015.shade', topics: ['Y3_015'], level: 2,
    make(R) {
      const kind = R.pick(['bar', 'grid']);
      const rc = R.pick(GRIDS), d = kind === 'bar' ? R.int(3, 10) : rc[0] * rc[1], n = R.int(2, d - 1);
      const ans = range(0, n - 1);
      const fig = A => kind === 'bar' ? cells({ rows: 1, cols: d, cw: 96 / d, cell: 12, ans }, A) : cells({ rows: rc[0], cols: rc[1], cell: 11, ans }, A);
      return {
        marks: 1, answer: `Any ${n} parts shaded`, guide: `Any ${n} of the ${d} equal parts may be shaded.`,
        check: () => ans.length === n && n < d,
        body: A => `<p>Shade ${fr(n, d)} of this shape.</p>${fig(A)}`,
      };
    },
  });
  add({
    id: 'Y3_015.equal-parts', topics: ['Y3_015'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5]), equal = R.chance(1 / 3), who = R.name();
      const ws = equal ? Array(d).fill(1) : range(1, d).map(() => R.pick([1, 2, 3]));
      if (!equal && new Set(ws).size === 1) return null;
      const tot = ws.reduce((a, b) => a + b, 0), si = R.int(0, d - 1);
      if (!equal && ws[si] * d === tot) return null;
      let s = '', x = 1;
      ws.forEach((w, i) => { const pw = 96 * w / tot; s += D.box(x, 1, pw, 16, i === si ? 'shaded' : 'bx'); x += pw; });
      const fig = D.svg(98, 18, s);
      return {
        marks: 1, answer: equal ? 'Yes' : 'No: the parts are not equal',
        guide: equal ? 'Award the mark for "yes" with a reason about equal parts.' : 'Award the mark for "no" with a reason: the parts are not equal (or not the same size).',
        check: () => equal === ws.every(w => w === ws[0]) && (equal || ws[si] * d !== tot),
        body: A => `<p>${who} says ${fr(1, d)} of this shape is shaded.</p>${fig}<p>Is ${who} correct? Explain how you know.</p>${A.explain(equal ? `Yes. The shape is split into ${d} equal parts and 1 part is shaded.` : `No. The shape is split into ${d} parts, but the parts are not equal.`, 2)}`,
      };
    },
  });

  // Y3_016 unit fractions of amounts: compare, and a two-step problem
  add({
    id: 'Y3_016.greater', topics: ['Y3_016'], level: 2,
    make(R) {
      const [a, b] = R.sample([2, 3, 4, 5, 10], 2), x = a * R.int(2, 10), y = b * R.int(2, 10);
      const vx = x / a, vy = y / b;
      if (vx === vy) return null;
      const opts = [`${fr(1, a)} of ${x}`, `${fr(1, b)} of ${y}`], idx = vx > vy ? 0 : 1;
      return {
        marks: 1, answer: `${opts[idx]} (${Math.max(vx, vy)})`,
        check: () => (x * b > y * a) === (idx === 0),
        body: A => `<p>Circle the amount that is <b>greater</b>.</p>${A.circle(opts, idx)}`,
      };
    },
  });
  add({
    id: 'Y3_016.left', topics: ['Y3_016'], level: 3,
    make(R) {
      const [a, b] = R.sample([2, 3, 4, 5, 10], 2), l = F.lcm(a, b);
      const n = l * R.int(1, Math.floor(60 / l));
      if (n < 12) return null;
      const ga = n / a, gb = n / b, left = n - ga - gb;
      if (left <= 0) return null;
      const [who, w1, w2] = R.names(3);
      return {
        marks: 2, method: true, answer: F.n(left),
        guide: `Award 1 mark for finding ${ga} and ${gb} with a later slip.`,
        check: () => left + ga + gb === n && ga * a === n && gb * b === n,
        body: A => `<p>${who} has ${n} stickers.</p><p>${who} gives ${fr(1, a)} of the stickers to ${w1} and ${fr(1, b)} of the stickers to ${w2}.</p><p>How many stickers does ${who} have left?</p>${A.work(`${fr(1, a)} of ${n} = ${ga}, ${fr(1, b)} of ${n} = ${gb}<br>${n} ${F.minus} ${ga} ${F.minus} ${gb} = ${left}`, 28)}${A.box(left)}`,
      };
    },
  });

  // Y3_017 missing fractions on a number line
  add({
    id: 'Y3_017.label-boxes', topics: ['Y3_017'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8, 10]), ks = R.ints(2, 1, d - 1).sort((a, b) => a - b);
      if (d >= 8 && ks[1] - ks[0] < 2) return null;
      const fmt = v => (v === 0 ? '0' : v === 1 ? '1' : `${Math.round(v * d)}/${d}`);
      return {
        marks: 1, answer: ks.map(k => fr(k, d)).join(' and '), guide: 'Both fractions needed for the mark.',
        check: () => ks.every(k => k > 0 && k < d) && ks[0] !== ks[1],
        body: A => `<p>This number line from 0 to 1 is split into ${d} equal parts.</p><p>Write the missing fractions in the boxes.</p>${D.numberLine({ width: 148, min: 0, max: 1, minor: 1 / d, major: 1, labels: 'ends', fmt, labelBoxes: ks.map(k => k / d) }, A)}`,
      };
    },
  });

  // Y3_018 add and subtract fractions with the same denominator, within 1
  add({
    id: 'Y3_018.calc', topics: ['Y3_018'], level: 1,
    make(R) {
      const d = R.int(3, 12), a = R.int(1, d - 2), b = R.int(1, d - 1 - a), s = a + b, sub = R.chance(0.4);
      return {
        marks: 1, answer: fr(sub ? a : s, d),
        check: () => s < d && s - b === a,
        body: A => `<p>Write the missing number.</p><div class="sent c">${sub ? `${fr(s, d)} ${F.minus} ${fr(b, d)} = ${fr(A.blank(a, 9), d)}` : `${fr(a, d)} + ${fr(b, d)} = ${fr(A.blank(s, 9), d)}`}</div>`,
      };
    },
  });
  add({
    id: 'Y3_018.missing', topics: ['Y3_018'], level: 2,
    make(R) {
      const d = R.int(4, 12), a = R.int(1, d - 2), b = R.int(1, d - 1 - a), s = a + b, f = R.int(0, 2);
      const forms = [
        [A => `${fr(a, d)} + ${fr(A.blank(b, 9), d)} = ${fr(s, d)}`, b, () => a + b === s],
        [A => `1 ${F.minus} ${fr(a, d)} = ${fr(A.blank(d - a, 9), d)}`, d - a, () => (d - a) + a === d],
        [A => `${fr(s, d)} ${F.minus} ${fr(A.blank(b, 9), d)} = ${fr(a, d)}`, b, () => s - b === a],
      ];
      return {
        marks: 1, answer: fr(forms[f][1], d),
        check: () => forms[f][2]() && s < d,
        body: A => `<p>Write the missing number.</p><div class="sent c">${forms[f][0](A)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_018.mistake', topics: ['Y3_018'], level: 2,
    make(R) {
      const d = R.int(3, 10), a = R.int(1, d - 2), b = R.int(1, d - 1 - a), s = a + b, who = R.name();
      return {
        marks: 1, answer: `No: ${fr(a, d)} + ${fr(b, d)} = ${fr(s, d)}`,
        guide: `Award the mark for "no" with the correct answer ${s}/${d}, or a reason such as "you do not add the denominators".`,
        check: () => s < d && s * d !== s * 2 * d,
        body: A => `<p>${who} says,</p><div class="sent c">${fr(a, d)} + ${fr(b, d)} = ${fr(s, 2 * d)}</div><p>Is ${who} correct? Explain how you know.</p>${A.explain(`No. It is ${s}/${d}. They are still ${FNAME[d]}, so add only the numerators.`, 2)}`,
      };
    },
  });
  add({
    id: 'Y3_018.word', topics: ['Y3_018'], level: 3,
    make(R) {
      const d = R.pick([5, 6, 8, 10, 12]), a = R.int(1, d - 3), b = R.int(1, d - a - 1), left = d - a - b;
      const [w1, w2] = R.names(2);
      return {
        marks: 2, method: true, answer: fr(left, d),
        guide: `Accept an equivalent fraction. Award 1 mark for ${a + b}/${d} eaten with a later slip.`,
        check: () => left + a + b === d && left > 0,
        body: A => `<p>A pizza is cut into ${d} equal slices.</p><p>${w1} eats ${fr(a, d)} of the pizza. ${w2} eats ${fr(b, d)} of the pizza.</p><p>What fraction of the pizza is left?</p>${A.work(`${fr(a, d)} + ${fr(b, d)} = ${fr(a + b, d)}&nbsp;&nbsp; 1 ${F.minus} ${fr(a + b, d)} = ${fr(left, d)}`, 28)}${A.box(fr(left, d), { w: 20 })}`,
      };
    },
  });

  // Y3_NC_04 tenths
  add({
    id: 'Y3_NC_04.count', topics: ['Y3_NC_04'], level: 1,
    make(R) {
      const up = R.chance(0.6), s = up ? R.int(1, 5) : R.int(5, 9);
      const terms = range(0, 4).map(i => (up ? s + i : s - i));
      const hide = R.sample([0, 1, 2, 3, 4], 2).sort((a, b) => a - b);
      return {
        marks: 1, answer: hide.map(i => fr(terms[i], 10)).join(' and '), guide: 'Both needed for the mark.',
        check: () => terms.every((t, i) => t >= 1 && t <= 9 && (i === 0 || Math.abs(t - terms[i - 1]) === 1)),
        body: A => `<p>Count ${up ? 'up' : 'back'} in tenths. Write the missing fractions.</p><div class="sent c">${terms.map((t, i) => (hide.includes(i) ? fr(A.blank(t, 9), 10) : fr(t, 10))).join(SP)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_NC_04.tenths', topics: ['Y3_NC_04'], level: 1,
    make(R) {
      const n = R.int(1, 9), form = R.int(0, 1), who = R.name();
      const an = form ? 10 - n : n;
      return {
        marks: 1, answer: fr(an, 10),
        check: () => form ? an + n === 10 : an === n,
        body: A => form
          ? `<p>A cake is cut into 10 equal pieces.</p><p>${who} eats ${F.pl(n, 'piece')}.</p><p>What fraction of the cake is left?</p>${A.box(fr(an, 10), { w: 20 })}`
          : `<p>What fraction of this bar is shaded?</p>${D.fractionBar({ parts: 10, shaded: n, width: 110, height: 11 })}${A.box(fr(an, 10), { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y3_NC_04.number-line', topics: ['Y3_NC_04'], level: 2,
    make(R) {
      const n = R.int(1, 9);
      const fmt = v => (v === 0 ? '0' : v === 1 ? '1' : `${Math.round(v * 10)}/10`);
      return {
        marks: 1, answer: fr(n, 10),
        check: () => Math.round((n / 10) * 10) === n,
        body: A => `<p>This number line is split into tenths.</p><p>What fraction is the arrow pointing to?</p>${D.numberLine({ width: 148, min: 0, max: 1, minor: 0.1, major: 1, labels: 'ends', fmt, marks: [{ v: n / 10, box: true }] }, A)}`,
      };
    },
  });

  // Y3_NC_05 equivalent fractions
  add({
    id: 'Y3_NC_05.missing', topics: ['Y3_NC_05'], level: 1,
    make(R) {
      const [a, b] = R.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [1, 6]]);
      const kmax = Math.floor(12 / b);
      if (kmax < 2) return null;
      const k = R.int(2, kmax), A2 = a * k, B2 = b * k, f = R.int(0, 1);
      return {
        marks: 1, answer: F.n(f ? B2 : A2),
        check: () => a * B2 === A2 * b,
        body: A => `<p>Write the missing number.</p><div class="sent c">${fr(a, b)} = ${f ? fr(A2, A.blank(B2, 9)) : fr(A.blank(A2, 9), B2)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_NC_05.shade', topics: ['Y3_NC_05'], level: 2,
    make(R) {
      const [a, b] = R.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5]]);
      const kmax = Math.floor(12 / b), k = R.int(2, Math.max(2, kmax));
      const A2 = a * k, B2 = b * k;
      if (B2 > 12) return null;
      const top = cells({ rows: 1, cols: b, cw: 96 / b, cell: 11, shaded: range(0, a - 1) });
      return {
        marks: 1, answer: `${A2} parts shaded; ${fr(A2, B2)}`,
        guide: `Award the mark for any ${A2} parts shaded and the numerator ${A2}.`,
        check: () => A2 * b === a * B2 && A2 < B2,
        body: A => `<p>The top bar shows ${fr(a, b)} shaded.</p>${top}${cells({ rows: 1, cols: B2, cw: 96 / B2, cell: 11, ans: range(0, A2 - 1) }, A)}<p>Shade the bottom bar to show a fraction equal to ${fr(a, b)}. Then complete the fraction.</p><div class="sent c">${fr(a, b)} = ${fr(A.blank(A2, 9), B2)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_NC_05.odd-one-out', topics: ['Y3_NC_05'], level: 2,
    make(R) {
      const [a, b] = R.pick([[1, 2], [1, 3], [2, 3], [1, 4]]);
      const eq = range(1, Math.floor(12 / b)).map(k => [a * k, b * k]);
      const same = R.sample(eq, 3), base = R.pick(eq);
      const wrong = [base[0] + R.pick([-1, 1]), base[1]];
      if (wrong[0] < 1 || wrong[0] >= wrong[1] || wrong[0] * b === a * wrong[1]) return null;
      const opts = R.shuffle([...same, wrong]), idx = opts.indexOf(wrong);
      return {
        marks: 1, answer: fr(wrong[0], wrong[1]),
        check: () => opts.filter(([n, d]) => n * b === a * d).length === 3 && opts[idx][0] * b !== a * opts[idx][1],
        body: A => `<p>Three of these fractions are equal.</p><p>Circle the fraction that is <b>not</b> equal to the others.</p>${A.circle(opts.map(([n, d]) => fr(n, d)), idx)}`,
      };
    },
  });

  // Y3_NC_06 compare and order fractions
  add({
    id: 'Y3_NC_06.symbol', topics: ['Y3_NC_06'], level: 1,
    make(R) {
      let p, q;
      if (R.chance(0.5)) { const [x, y] = R.ints(2, 2, 12); p = [1, x]; q = [1, y]; }
      else { const d = R.int(3, 12), [x, y] = R.ints(2, 1, d - 1); p = [x, d]; q = [y, d]; }
      const gt = p[0] / p[1] > q[0] / q[1], sym = gt ? '&gt;' : '&lt;';
      return {
        marks: 1, answer: sym,
        check: () => (p[0] * q[1] > q[0] * p[1]) === gt,
        body: A => `<p>Write &lt; or &gt; to make this correct.</p><div class="sent c">${fr(...p)} ${A.blank(sym, 12)} ${fr(...q)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_NC_06.explain', topics: ['Y3_NC_06'], level: 2,
    make(R) {
      const a = R.int(2, 6), b = R.int(a + 1, 12), who = R.name();
      return {
        marks: 1, answer: `No: ${fr(1, a)} is greater`,
        guide: 'Award the mark for "no" with a reason, e.g. the more equal parts a whole is split into, the smaller each part is. A correct diagram is enough.',
        check: () => 1 * b > 1 * a && 1 / a > 1 / b,
        body: A => `<p>${who} says,</p><div class="sent c">"${fr(1, b)} is greater than ${fr(1, a)} because ${b} is greater than ${a}."</div><p>Is ${who} correct? Explain how you know.</p>${A.explain(`No. 1/${a} is greater. More equal parts means each part is smaller.`, 2)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_06.order', topics: ['Y3_NC_06'], level: 2,
    make(R) {
      let fs;
      if (R.chance(0.5)) fs = R.ints(3, 2, 12).map(d => [1, d]);
      else { const d = R.int(5, 12); fs = R.ints(3, 1, d - 1).map(n => [n, d]); }
      const desc = R.chance(0.35);
      const order = fs.slice().sort((x, y) => desc ? y[0] / y[1] - x[0] / x[1] : x[0] / x[1] - y[0] / y[1]);
      return {
        marks: 1, answer: order.map(f => fr(...f)).join(', '), guide: 'All three in the correct order for the mark.',
        check: () => order.every((f, i) => i === 0 || (desc ? order[i - 1][0] * f[1] > f[0] * order[i - 1][1] : order[i - 1][0] * f[1] < f[0] * order[i - 1][1])),
        body: A => `<p>Write these fractions in order, starting with the <b>${desc ? 'greatest' : 'smallest'}</b>.</p><div class="sent c">${fs.map(f => fr(...f)).join(SP)}</div>${A.boxes(order.map(f => [fr(...f)]), { w: 16 })}`,
      };
    },
  });

  /* ================= Geometry ================= */

  // Y3_019 which shape has exactly N right angles
  const RA_SHAPES = [
    { pts: [[0, 0], [4, 0], [4, 3], [0, 3]], r: 4 },
    { pts: [[0, 0], [4, 0], [0, 3]], r: 1 },
    { pts: [[0, 0], [4, 0], [4, 2], [2, 2], [2, 3], [0, 3]], r: 5 },
    { pts: [[0, 0], [4, 0], [3, 3], [1, 3]], r: 0 },
    { pts: [[0, 0], [4, 0], [4, 3], [1, 3]], r: 2 },
    { pts: [[0, 0], [2, 0], [4, 2], [2, 4], [0, 2]], r: 3 },
    { pts: [[0, 0], [4, 0], [2, 3]], r: 0 },
    { pts: [[0, 1], [2, 0], [4, 1], [4, 3], [0, 3]], r: 2 },
  ];
  add({
    id: 'Y3_019.tick-shape', topics: ['Y3_019'], level: 2,
    make(R) {
      const three = R.sample(RA_SHAPES, 3);
      if (new Set(three.map(s => s.r)).size < 3) return null;
      const t = R.int(0, 2), N = three[t].r;
      const figs = three.map((s, i) => ({ fig: D.grid({ cols: 5, rows: 5, cell: 6, dots: true, polys: [{ pts: turn(s.pts, R.int(0, 3)).map(([x, y]) => [x + 0, y + 1]) }] }), cap: 'ABC'[i] }));
      return {
        marks: 1, answer: 'ABC'[t],
        check: () => three.every(s => countRight(s.pts) === s.r) && three.filter(s => s.r === N).length === 1,
        body: A => `<p>Tick the shape that has exactly <b>${N === 1 ? 'one right angle' : `${N} right angles`}</b>.</p>${D.row(figs, 6)}${A.tick(['A', 'B', 'C'], t)}`,
      };
    },
  });

  // Y3_020 polygons from points; parallel and perpendicular sides
  const POLY_T = [
    [[0, 0], [4, 0], [1, 3]], [[0, 1], [4, 0], [3, 4]], [[1, 0], [4, 2], [0, 4]],
    [[0, 0], [4, 0], [5, 3], [1, 3]], [[1, 0], [4, 1], [3, 4], [0, 3]], [[0, 0], [5, 0], [3, 3], [1, 3]], [[2, 0], [4, 2], [2, 5], [0, 2]],
    [[1, 0], [4, 0], [5, 3], [2, 5], [0, 3]], [[0, 1], [3, 0], [5, 2], [4, 5], [1, 4]],
    [[1, 0], [4, 0], [5, 2], [4, 4], [1, 4], [0, 2]], [[2, 0], [4, 1], [4, 3], [2, 4], [0, 3], [0, 1]],
  ];
  const PNAME = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon' };
  add({
    id: 'Y3_020.join-points', topics: ['Y3_020'], level: 1,
    make(R) {
      const base = R.pick(POLY_T), q = R.int(0, 3), p0 = turn(base, q);
      const mx = Math.max(...p0.map(p => p[0])), my = Math.max(...p0.map(p => p[1]));
      const dx = R.int(0, 6 - mx), dy = R.int(0, 6 - my);
      if (dx < 0 || dy < 0) return null;
      const pts = p0.map(([x, y]) => [x + dx, y + dy]), names = 'ABCDEF'.slice(0, pts.length).split('');
      const name = PNAME[pts.length];
      return {
        marks: 1, answer: name,
        guide: pts.length === 4 ? 'Also accept a correct more exact name (for example square, kite, trapezium or parallelogram).' : '',
        check: () => convex(pts) && new Set(pts.map(p => p.join(','))).size === pts.length && name === ['triangle', 'quadrilateral', 'pentagon', 'hexagon'][pts.length - 3],
        body: A => `<p>Join the points in order: ${names.join(', ')}, then back to A.</p>${gridFig({ cols: 6, rows: 6, cell: 7, dots: true, marks: pts, vlabels: { pts, names }, polys: [{ pts, ans: true }] }, A)}<p>What is the name of the shape you have made?</p>${A.line(name, 50)}`,
      };
    },
  });
  const PP_SHAPES = [
    [[0, 0], [5, 0], [5, 3], [2, 3]],
    [[0, 0], [6, 0], [4, 3], [2, 3]],
    [[0, 0], [4, 0], [6, 3], [2, 3]],
    [[0, 0], [5, 0], [0, 4]],
    [[2, 0], [4, 2], [2, 5], [0, 2]],
    [[0, 0], [5, 0], [5, 3], [0, 3]],
    [[0, 0], [4, 0], [6, 3], [0, 3]],
  ];
  function ppSetup(R) {
    const p0 = turn(R.pick(PP_SHAPES), R.int(0, 3));
    const mx = Math.max(...p0.map(p => p[0])), my = Math.max(...p0.map(p => p[1]));
    const dx = R.int(0, Math.max(0, 6 - mx)), dy = R.int(0, Math.max(0, 6 - my));
    const pts = p0.map(([x, y]) => [x + dx, y + dy]), n = pts.length;
    const L = 'ABCD'.slice(0, n).split('');
    const vec = i => [pts[(i + 1) % n][0] - pts[i][0], pts[(i + 1) % n][1] - pts[i][1]];
    const sname = i => L[i] + L[(i + 1) % n];
    const par = (i, j) => { const a = vec(i), b = vec(j); return a[0] * b[1] === a[1] * b[0]; };
    const perp = (i, j) => { const a = vec(i), b = vec(j); return a[0] * b[0] + a[1] * b[1] === 0; };
    // a second way: compare directions as angles (degrees, 0 to 180)
    const dir = i => { const [x, y] = vec(i); let d = Math.atan2(y, x) * 180 / Math.PI; while (d < 0) d += 180; return Math.round(d * 1000) / 1000 % 180; };
    const fig = A => gridFig({ cols: Math.max(6, mx + dx), rows: Math.max(6, my + dy), cell: 6.5, polys: [{ pts }], vlabels: { pts, names: L } }, A);
    return { pts, n, sname, par, perp, dir, fig };
  }
  add({
    id: 'Y3_020.which-side', topics: ['Y3_020'], level: 2,
    make(R) {
      const S = ppSetup(R), i = R.int(0, S.n - 1), rel = R.pick(['parallel', 'perpendicular']);
      const js = range(0, S.n - 1).filter(j => j !== i && (rel === 'parallel' ? S.par(i, j) : S.perp(i, j)));
      if (js.length !== 1) return null;
      const j = js[0], ans = S.sname(j), back = ans.split('').reverse().join('');
      return {
        marks: 1, answer: `${ans}`, guide: `Accept ${back}.`,
        check: () => { const d = Math.abs(S.dir(i) - S.dir(j)); return rel === 'parallel' ? (d < 0.01 || d > 179.99) : Math.abs(d - 90) < 0.01; },
        body: A => `<p>Look at this shape.</p>${S.fig(A)}<p>Which side is <b>${rel}</b> to side ${S.sname(i)}?</p>${A.box(ans, { w: 22, label: 'Side' })}`,
      };
    },
  });
  add({
    id: 'Y3_020.true-false', topics: ['Y3_020'], level: 2,
    make(R) {
      const S = ppSetup(R), pool = [];
      for (let i = 0; i < S.n; i++) for (let j = i + 1; j < S.n; j++) {
        const adj = j === i + 1 || (i === 0 && j === S.n - 1);
        if (adj) pool.push([`${S.sname(i)} is perpendicular to ${S.sname(j)}.`, S.perp(i, j), i, j, 'perp']);
        else pool.push([`${S.sname(i)} is parallel to ${S.sname(j)}.`, S.par(i, j), i, j, 'par']);
      }
      const rows = mixed(R, pool, 3);
      if (!rows) return null;
      return {
        marks: 1, answer: tfAnswer(rows), guide: 'All three correct for the mark.',
        check: () => rows.every(([, t, i, j, k]) => { const d = Math.abs(S.dir(i) - S.dir(j)); return t === (k === 'par' ? (d < 0.01 || d > 179.99) : Math.abs(d - 90) < 0.01); }),
        body: A => `<p>Look at the sides of this shape.</p>${D.row([S.fig(A), tfTable(A, rows)], 6)}<p>Tick <b>True</b> or <b>False</b> for each sentence.</p>`,
      };
    },
  });

  // Y3_NC_15 3D shapes
  const SOLIDS = {
    cube: { name: 'cube', f: 6, e: 12, v: 8 },
    cuboid: { name: 'cuboid', f: 6, e: 12, v: 8 },
    sqpyramid: { name: 'square-based pyramid', f: 5, e: 8, v: 5 },
    tripyramid: { name: 'triangle-based pyramid', f: 4, e: 6, v: 4 },
    triprism: { name: 'triangular prism', f: 5, e: 9, v: 6 },
    cylinder: { name: 'cylinder' }, cone: { name: 'cone' }, sphere: { name: 'sphere' },
  };
  const POLYH = ['cube', 'cuboid', 'sqpyramid', 'tripyramid', 'triprism'];
  const solidFig = (k, size, deg) => `<div style="display:flex;justify-content:center;margin:${deg % 180 ? 6 : 2}mm 0"><div style="transform:rotate(${deg}deg)">${D.solid(k, size)}</div></div>`;
  add({
    id: 'Y3_NC_15.name', topics: ['Y3_NC_15'], level: 1,
    make(R) {
      const k = R.pick(Object.keys(SOLIDS)), size = R.pick([26, 30, 34]), deg = k === 'sphere' ? 0 : R.pick([0, 0, 90, 180, 270]);
      const nm = SOLIDS[k].name;
      return {
        marks: 1, answer: nm,
        guide: k === 'tripyramid' ? 'Accept tetrahedron or triangular-based pyramid.' : k === 'sqpyramid' ? 'Accept square pyramid.' : k === 'cube' ? 'Do not accept square.' : k === 'sphere' ? 'Do not accept circle.' : '',
        check: () => typeof nm === 'string' && nm.length > 3 && (!SOLIDS[k].f || SOLIDS[k].v - SOLIDS[k].e + SOLIDS[k].f === 2),
        body: A => `<p>What is the name of this 3D shape?</p>${solidFig(k, size, deg)}${A.line(nm, 60)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_15.count', topics: ['Y3_NC_15'], level: 2,
    make(R) {
      const k = R.pick(POLYH), s = SOLIDS[k], what = R.pick(['faces', 'edges', 'vertices']);
      const ans = { faces: s.f, edges: s.e, vertices: s.v }[what];
      return {
        marks: 1, answer: F.n(ans),
        check: () => s.v - s.e + s.f === 2 && ans > 0,
        body: A => `<p>Here is a ${s.name}.</p>${solidFig(k, 30, 0)}<p>How many <b>${what}</b> does it have?</p>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_15.what-am-i', topics: ['Y3_NC_15'], level: 2,
    make(R) {
      const k = R.pick(POLYH), s = SOLIDS[k], twin = k === 'cube' ? 'cuboid' : k === 'cuboid' ? 'cube' : null;
      const others = R.sample(Object.keys(SOLIDS).filter(x => x !== k && x !== twin), 3);
      const opts = R.shuffle([k, ...others]), idx = opts.indexOf(k);
      const extra = k === 'cube' ? ' All of my faces are squares.' : k === 'cuboid' ? ' Some of my faces are rectangles that are not squares.' : '';
      return {
        marks: 1, answer: s.name,
        check: () => opts.filter(o => SOLIDS[o].f === s.f && SOLIDS[o].e === s.e && SOLIDS[o].v === s.v).length === 1,
        body: A => `<p>I am a 3D shape. I have ${s.f} faces, ${s.e} edges and ${s.v} vertices.${extra}</p><p>Circle my name.</p>${A.circle(opts.map(o => SOLIDS[o].name), idx)}`,
      };
    },
  });

  // Y3_NC_16 angles compared with a right angle; horizontal and vertical lines
  const angDeg = (R, kind) => kind === 'less' ? 5 * R.int(5, 14) : kind === 'greater' ? 5 * R.int(22, 33) : 90;
  add({
    id: 'Y3_NC_16.compare', topics: ['Y3_NC_16'], level: 1,
    make(R) {
      const kind = R.pick(['less', 'less', 'greater', 'greater', 'right']), deg = angDeg(R, kind), rot = 15 * R.int(0, 23);
      const idx = kind === 'less' ? 0 : kind === 'right' ? 1 : 2;
      return {
        marks: 1, answer: ['less than a right angle', 'a right angle', 'greater than a right angle'][idx],
        check: () => idx === Math.sign(deg - 90) + 1,
        body: A => `<p>Look at this angle.</p>${side(D.angle({ deg, rot, len: 22 }), `<p>Tick the sentence that is true.</p>${A.tick(['It is less than a right angle.', 'It is a right angle.', 'It is greater than a right angle.'], idx, { col: true })}`)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_16.which-angles', topics: ['Y3_NC_16'], level: 2,
    make(R) {
      const want = R.pick(['greater', 'less']), other = want === 'greater' ? 'less' : 'greater';
      const kinds = R.shuffle([want, want, other, other]);
      const list = kinds.map((k, i) => ({ deg: angDeg(R, k), rot: 15 * R.int(0, 23), lab: 'ABCD'[i] }));
      const idx = range(0, 3).filter(i => kinds[i] === want);
      return {
        marks: 1, answer: idx.map(i => 'ABCD'[i]).join(' and '), guide: 'Both letters, and no others, for the mark.',
        check: () => idx.length === 2 && idx.every(i => (want === 'greater') === (list[i].deg > 90)) && list.every(a => a.deg !== 90),
        body: A => `<p>Circle the letters of the <b>two</b> angles that are <b>${want} than a right angle</b>.</p>${angleRow(list)}${A.circle(['A', 'B', 'C', 'D'], idx)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_16.lines', topics: ['Y3_NC_16'], level: 2,
    make(R) {
      const want = R.pick(['horizontal', 'vertical']), other = want === 'horizontal' ? 'vertical' : 'horizontal';
      const kinds = R.shuffle([want, want, other, other, 'slant', 'slant']);
      const cw = 22, ch = 26, L = 8;
      let s = '';
      const ends = kinds.map((k, i) => {
        const cx = i * cw + cw / 2, cy = 11;
        const a = k === 'horizontal' ? 0 : k === 'vertical' ? 90 : R.pick([30, 45, 60, 120, 135, 150]);
        const dx = Math.round(L * Math.cos(a * Math.PI / 180) * 100) / 100, dy = Math.round(L * Math.sin(a * Math.PI / 180) * 100) / 100;
        s += D.line(cx - dx, cy - dy, cx + dx, cy + dy, 'seg') + D.txt(cx, ch - 1, 'ABCDEF'[i], { size: 4, bold: true });
        return [dx, dy];
      });
      const fig = D.svg(6 * cw, ch, s);
      const idx = range(0, 5).filter(i => kinds[i] === want);
      return {
        marks: 1, answer: idx.map(i => 'ABCDEF'[i]).join(' and '), guide: 'Both letters, and no others, for the mark.',
        check: () => idx.length === 2 && ends.filter(([dx, dy]) => want === 'horizontal' ? Math.abs(dy) < 1e-9 : Math.abs(dx) < 1e-9).length === 2,
        body: A => `<p>Circle the letters of the <b>two ${want}</b> lines.</p>${fig}${A.circle('ABCDEF'.split(''), idx)}`,
      };
    },
  });

  /* ================= Measures and money ================= */

  // Y3_NC_07 measure, compare, add and subtract lengths, mass and capacity
  add({
    id: 'Y3_NC_07.ruler', topics: ['Y3_NC_07'], level: 1,
    make(R) {
      const from = R.pick([0, 0, 1, 2]), len = R.int(25, 95);
      if (from * 10 + len > 115) return null;
      const obj = R.pick(['ribbon', 'straw', 'strip of paper', 'piece of string']);
      return {
        marks: 1, answer: `${len} mm`,
        guide: len % 10 ? `Accept ${Math.floor(len / 10)} cm ${len % 10} mm.` : `Accept ${len / 10} cm.`,
        check: () => Math.floor(len / 10) * 10 + (len % 10) === len && from * 10 + len <= 120,
        body: A => `<p>How long is the ${obj}? Give your answer in millimetres.</p>${D.ruler({ cm: 12, from, len: len / 10, mm: true })}${A.box(len, { unit: 'mm' })}`,
      };
    },
  });
  add({
    id: 'Y3_NC_07.add-sub', topics: ['Y3_NC_07'], level: 2,
    make(R) {
      const who = R.name(), k = R.int(0, 5);
      let a, b, ans, unit, text, sub;
      if (k === 0) { a = R.int(45, 95); b = R.int(12, a - 15); sub = true; unit = 'cm'; text = `A ribbon is ${a} cm long. ${who} cuts off ${b} cm.</p><p>How long is the ribbon now?`; }
      else if (k === 1) { a = R.int(18, 60); b = R.int(6, 35); sub = false; unit = 'cm'; text = `A sunflower is ${a} cm tall. It grows ${b} cm more.</p><p>How tall is the sunflower now?`; }
      else if (k === 2) { a = 10 * R.int(40, 95); b = 10 * R.int(12, a / 10 - 8); sub = true; unit = 'g'; text = `A bag has ${F.n(a)} g of flour in it. ${who} uses ${F.n(b)} g to make a cake.</p><p>How much flour is left?`; }
      else if (k === 3) { a = 5 * R.int(30, 120); b = 5 * R.int(20, 70); sub = false; unit = 'g'; text = `A parcel weighs ${F.n(a)} g. ${who} puts in a book that weighs ${F.n(b)} g.</p><p>How much does the parcel weigh now?`; }
      else if (k === 4) { a = 10 * R.int(40, 95); b = 10 * R.int(12, a / 10 - 8); sub = true; unit = 'ml'; text = `A jug has ${F.n(a)} ml of juice in it. ${who} pours out ${F.n(b)} ml.</p><p>How much juice is left in the jug?`; }
      else { a = 10 * R.int(15, 60); b = 10 * R.int(10, 35); sub = false; unit = 'ml'; text = `A bottle has ${F.n(a)} ml of water in it. ${who} adds ${F.n(b)} ml more.</p><p>How much water is in the bottle now?`; }
      ans = sub ? a - b : a + b;
      if (ans > 999 || ans <= 0) return null;
      return {
        marks: 1, answer: `${F.n(ans)} ${unit}`,
        check: () => sub ? ans + b === a : ans - b === a,
        body: A => `<p>${text}</p>${A.box(ans, { unit })}`,
      };
    },
  });
  add({
    id: 'Y3_NC_07.word', topics: ['Y3_NC_07'], level: 3,
    make(R) {
      const who = R.name();
      if (R.chance(0.5)) {
        const n = R.int(2, 4), g = R.pick([100, 125, 150, 200, 250]), left = 1000 - n * g;
        if (left <= 0) return null;
        return {
          marks: 2, method: true, answer: `${F.n(left)} ml`,
          guide: `Award 1 mark for ${n} ${F.times} ${g} = ${n * g} with a later slip.`,
          check: () => left + n * g === 1000,
          body: A => `<p>A bottle holds 1 litre (1,000 ml) of water.</p><p>${who} fills ${n} glasses from the bottle. Each glass holds ${g} ml.</p><p>How much water is left in the bottle?</p>${A.work(`${n} ${F.times} ${g} = ${n * g}<br>1,000 ${F.minus} ${n * g} = ${left}`, 28)}${A.box(left, { unit: 'ml' })}`,
        };
      }
      const n = R.int(2, 4), p = R.int(12, 30), left = 100 - n * p;
      if (left <= 0) return null;
      return {
        marks: 2, method: true, answer: `${left} cm`,
        guide: `Award 1 mark for ${n} ${F.times} ${p} = ${n * p} with a later slip.`,
        check: () => left + n * p === 100,
        body: A => `<p>A piece of string is 1 metre (100 cm) long.</p><p>${who} cuts off ${n} pieces. Each piece is ${p} cm long.</p><p>How much string is left?</p>${A.work(`${n} ${F.times} ${p} = ${n * p}<br>100 ${F.minus} ${n * p} = ${left}`, 28)}${A.box(left, { unit: 'cm' })}`,
      };
    },
  });

  // Y3_NC_08 perimeter
  add({
    id: 'Y3_NC_08.grid', topics: ['Y3_NC_08'], level: 1,
    make(R) {
      const w = R.int(2, 6), h = R.int(2, 4), L = R.chance(0.5);
      const c1 = L ? R.int(1, w - 1) : 0, c2 = L ? R.int(1, h - 1) : 0;
      const pts = (L ? [[0, 0], [w, 0], [w, h - c2], [w - c1, h - c2], [w - c1, h], [0, h]] : [[0, 0], [w, 0], [w, h], [0, h]]).map(([x, y]) => [x + 1, y + 1]);
      const per = 2 * (w + h);
      // second way: count the unit edges round the squares inside the shape
      const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !(x >= w - c1 && y >= h - c2 && L);
      let edges = 0;
      for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (inside(x, y)) for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inside(x + ex, y + ey)) edges++;
      return {
        marks: 1, answer: `${per} cm`,
        check: () => edges === per,
        body: A => `<p>This shape is drawn on a grid of 1 cm squares.</p>${D.grid({ cols: w + 2, rows: h + 2, cell: 7, polys: [{ pts }] }, A)}<p>What is the perimeter of the shape?</p>${A.box(per, { unit: 'cm' })}`,
      };
    },
  });
  add({
    id: 'Y3_NC_08.labelled', topics: ['Y3_NC_08'], level: 1,
    make(R) {
      const kind = R.pick(['L', 'tri', 'trap']);
      let sc = 6;
      let up, right = [], formula;
      if (kind === 'L') {
        // notch 3 high (less than half the height) and at least 3 wide, so its two labels sit apart and outside the shape
        const w = R.int(7, 10), h = 7, c1 = R.int(3, Math.floor(w / 2)), c2 = 3;
        sc = 7;
        up = [[0, 0], [w, 0], [w, h - c2], [w - c1, h - c2], [w - c1, h], [0, h]]; formula = 2 * (w + h);
      } else if (kind === 'tri') {
        const k = R.int(1, 2), [a, b] = R.chance(0.5) ? [3 * k, 4 * k] : [4 * k, 3 * k];
        up = [[0, 0], [a, 0], [0, b]]; right = [0]; formula = 12 * k;
      } else {
        const t = R.int(2, 6), b = t + 3;
        up = [[0, 0], [b, 0], [t, 4], [0, 4]]; right = [0, 3]; formula = b + t + 9;
      }
      const maxY = Math.max(...up.map(p => p[1]));
      const pts = up.map(([x, y]) => [x * sc, (maxY - y) * sc]);
      const lens = up.map((p, i) => { const q = up[(i + 1) % up.length]; return Math.round(Math.hypot(q[0] - p[0], q[1] - p[1])); });
      const per = lens.reduce((a, b) => a + b, 0);
      return {
        marks: 1, answer: `${per} cm`,
        check: () => per === formula && up.every((p, i) => { const q = up[(i + 1) % up.length]; return Math.abs(Math.hypot(q[0] - p[0], q[1] - p[1]) - lens[i]) < 1e-9; }),
        body: A => `<p>What is the perimeter of this shape?</p>${side(D.shape({ pts, labels: lens.map(l => `${l} cm`), right }), A.box(per, { unit: 'cm' }))}`,
      };
    },
  });
  add({
    id: 'Y3_NC_08.missing-side', topics: ['Y3_NC_08'], level: 3,
    make(R) {
      const l = R.int(5, 12), w = R.int(2, l - 1), P = 2 * (l + w);
      const fig = D.shape({ pts: [[0, 0], [60, 0], [60, 30], [0, 30]], labels: [`${l} cm`, '?'], right: [0, 1, 2, 3] });
      return {
        marks: 2, method: true, answer: `${w} cm`,
        guide: `Award 1 mark for ${P} ${F.minus} ${2 * l} = ${2 * w} with a later slip.`,
        check: () => 2 * l + 2 * w === P && (P / 2 - l) === w,
        body: A => `<p>The perimeter of this rectangle is ${P} cm.</p><p>What is the length of the side marked <b>?</b></p>${side(fig, A.work(`${P} ${F.minus} ${l} ${F.minus} ${l} = ${2 * w}<br>${2 * w} ${F.div} 2 = ${w}`, 28) + A.box(w, { unit: 'cm' }))}`,
      };
    },
  });

  // Y3_NC_09 money
  add({
    id: 'Y3_NC_09.coins', topics: ['Y3_NC_09'], level: 1,
    make(R) {
      const list = R.sample([1, 2, 5, 10, 20, 50, 100, 200], R.int(3, 5));
      if (R.chance(0.4)) list.push(R.pick(list));
      if (R.chance(0.15)) list.push(500);
      list.sort((a, b) => b - a);
      if (new Set(list).size < 2) return null;
      const total = list.reduce((a, b) => a + b, 0);
      const counted = [500, 200, 100, 50, 20, 10, 5, 2, 1].reduce((s, d) => s + d * list.filter(x => x === d).length, 0);
      return {
        marks: 1, answer: F.money(total, true),
        guide: total >= 100 ? `Accept ${total}p.` : `Accept £0.${pad2(total)}.`,
        check: () => counted === total,
        body: A => `<p>How much money is here altogether?</p>${D.coins(list)}${A.box(F.money(total, true))}`,
      };
    },
  });
  add({
    id: 'Y3_NC_09.change', topics: ['Y3_NC_09'], level: 2,
    make(R) {
      const pay = R.pick([200, 500, 1000]);
      const price = 5 * R.int(pay === 200 ? 7 : pay === 500 ? 24 : 70, pay / 5 - 1), change = pay - price, who = R.name();
      const item = R.pick(['a book', 'a toy car', 'a board game', 'a kite', 'a lunchbox', 'a football']);
      const payText = { 200: 'a £2 coin', 500: 'a £5 note', 1000: 'a £10 note' }[pay];
      return {
        marks: 1, answer: F.money(change, true),
        guide: change >= 100 ? `Accept ${change}p.` : '',
        check: () => price + change === pay && change > 0,
        body: A => `<p>${who} buys ${item} for ${F.money(price, true)}.</p><p>${who} pays with ${payText}.</p><p>How much change does ${who} get?</p>${A.box(F.money(change, true))}`,
      };
    },
  });
  add({
    id: 'Y3_NC_09.shop', topics: ['Y3_NC_09'], level: 3,
    make(R) {
      const items = R.sample([['pen', 'pens'], ['ruler', 'rulers'], ['notebook', 'notebooks'], ['rubber', 'rubbers'], ['glue stick', 'glue sticks'], ['sharpener', 'sharpeners']], 4);
      const prices = R.ints(4, 5, 50).map(x => x * 5);
      const [i, j] = R.sample([0, 1, 2, 3], 2), total = 2 * prices[i] + prices[j];
      if (total >= 500) return null;
      const change = 500 - total, who = R.name();
      const table = A => A.table(items.map((it, k) => [cap(it[0]), F.money(prices[k], true)]), { head: ['Item', 'Price'] });
      return {
        marks: 2, method: true, answer: F.money(change, true),
        guide: `${change >= 100 ? `Accept ${change}p. ` : ''}Award 1 mark for the total cost ${F.money(total, true)} with a later slip.`,
        check: () => change + prices[i] + prices[i] + prices[j] === 500,
        body: A => `<p>${who} buys 2 ${items[i][1]} and 1 ${items[j][0]}. ${who} pays with a £5 note.</p><p>How much change does ${who} get?</p>${side(table(A), A.work(`${F.money(prices[i], true)} + ${F.money(prices[i], true)} + ${F.money(prices[j], true)} = ${F.money(total, true)}<br>£5.00 ${F.minus} ${F.money(total)} = ${F.money(change, true)}`, 30) + A.box(F.money(change, true)))}`,
      };
    },
  });

  /* ================= Time ================= */

  // Y3_NC_10 12-hour and 24-hour times
  add({
    id: 'Y3_NC_10.clock-24h', topics: ['Y3_NC_10'], level: 1,
    make(R) {
      const to24 = R.chance(0.5), pm = R.chance(0.6), h12 = R.int(1, 11), m = 5 * R.int(0, 11), h24 = pm ? h12 + 12 : h12;
      return {
        marks: 1, answer: to24 ? F.t24(h24, m) : F.t12(h24, m),
        guide: to24 ? '' : 'am or pm must be correct.',
        check: () => ((h24 % 12) || 12) === h12 && (h24 >= 12) === pm,
        body: A => to24 ? `<p>Write <b>${F.t12(h24, m)}</b> as a 24-hour clock time.</p>${A.box(F.t24(h24, m), { w: 28 })}`
          : `<p>Write <b>${F.t24(h24, m)}</b> as a 12-hour clock time. Use am or pm.</p>${A.box(F.t12(h24, m), { w: 34 })}`,
      };
    },
  });

  // Y3_NC_11 nearest minute, am and pm, durations, comparing times
  add({
    id: 'Y3_NC_11.nearest-minute', topics: ['Y3_NC_11'], level: 1,
    make(R) {
      const h = R.int(1, 12), m = R.intNot(1, 59, range(0, 11).map(i => i * 5));
      const say = m < 30 ? `${F.pl(m, 'minute')} past ${h}` : `${F.pl(60 - m, 'minute')} to ${h % 12 + 1}`;
      return {
        marks: 1, answer: `${h}:${pad2(m)}`, guide: `Accept ${say}.`,
        check: () => m % 5 !== 0 && (h * 60 + m) % 60 === m,
        body: A => `<p>What time does this clock show?</p>${D.clock({ h, m, size: 46 }, A)}${A.box(`${h}:${pad2(m)}`, { w: 28 })}`,
      };
    },
  });
  add({
    id: 'Y3_NC_11.am-pm', topics: ['Y3_NC_11'], level: 1,
    make(R) {
      const acts = [['eats breakfast', [6, 7, 8]], ['goes to bed', [19, 20, 21]], ['eats lunch', [12]], ['has tea', [17, 18]],
        ['wakes up', [6, 7]], ['gets to school', [8]], ['walks home from school', [15]], ['has a morning snack', [10]], ['goes to a football club after school', [16]]];
      const [act, hs] = R.pick(acts), h24 = R.pick(hs), m = R.pick([0, 10, 15, 20, 30, 40, 45, 50]), who = R.name();
      const ans = h24 < 12 ? 'am' : 'pm';
      return {
        marks: 1, answer: ans,
        check: () => F.t12(h24, m).endsWith(ans),
        body: A => `<p>${who} ${act} at <b>${(h24 % 12) || 12}:${pad2(m)}</b>.</p><p>Is this time am or pm? Circle one.</p>${A.circle(['am', 'pm'], ans === 'am' ? 0 : 1)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_11.duration', topics: ['Y3_NC_11'], level: 2,
    make(R) {
      const sh = R.int(13, 16), sm = 5 * R.int(0, 11), dur = 5 * R.int(3, 19);
      const start = sh * 60 + sm, end = start + dur, eh = Math.floor(end / 60), em = end % 60;
      const askEnd = R.chance(0.5), ev = R.pick(['A film', 'A football match', 'A swimming lesson', 'A school play', 'A party']);
      const durText = dur < 60 ? `${dur} minutes` : dur === 60 ? '1 hour' : `1 hour ${dur - 60} minutes`;
      const m2 = sm + dur, h2 = sh + Math.floor(m2 / 60);
      return {
        marks: 1, answer: askEnd ? F.t12(eh, em) : `${dur} minutes`,
        guide: askEnd ? '' : (dur > 60 ? `Accept ${durText}.` : ''),
        check: () => eh === h2 && em === m2 % 60,
        body: A => askEnd
          ? `<p>${ev} starts at ${F.t12(sh, sm)}.</p><p>It lasts ${durText}.</p><p>What time does it finish?</p>${A.box(F.t12(eh, em), { w: 34 })}`
          : `<p>${ev} starts at ${F.t12(sh, sm)} and finishes at ${F.t12(eh, em)}.</p><p>How long does it last?</p>${A.box(dur, { unit: 'minutes' })}`,
      };
    },
  });
  add({
    id: 'Y3_NC_11.fastest', topics: ['Y3_NC_11'], level: 2,
    make(R) {
      const names = R.names(3), secs = R.ints(3, 62, 118), forms = R.shuffle([0, 1, R.int(0, 1)]);
      const want = R.pick(['fastest', 'slowest']);
      const best = want === 'fastest' ? Math.min(...secs) : Math.max(...secs), idx = secs.indexOf(best);
      const show = i => forms[i] ? `1 minute ${secs[i] - 60} seconds` : `${secs[i]} seconds`;
      // second way: read the times back from what is printed
      const back = i => forms[i] ? 60 + (secs[i] - 60) : secs[i];
      return {
        marks: 1, answer: names[idx],
        check: () => range(0, 2).every(i => i === idx || (want === 'fastest' ? back(i) > back(idx) : back(i) < back(idx))),
        body: A => `<p>Three children run a race. Here are their times.</p>${A.table(names.map((n, i) => [n, show(i)]), { head: ['Name', 'Time'] })}<p>Who was the <b>${want}</b>?</p>${A.line(names[idx], 40)}`,
      };
    },
  });

  // Y3_NC_12 seconds in a minute, days in months and years
  add({
    id: 'Y3_NC_12.convert', topics: ['Y3_NC_12'], level: 1,
    make(R) {
      const f = R.int(0, 3), n = R.int(2, 5), s = 5 * R.int(1, 11);
      const forms = [
        [A => `${n} minutes = ${A.blank(60 * n, 16)} seconds`, 60 * n, () => (60 * n) / 60 === n],
        [A => `${60 * n} seconds = ${A.blank(n)} minutes`, n, () => n * 60 === 60 * n],
        [A => `1 minute ${s} seconds = ${A.blank(60 + s, 16)} seconds`, 60 + s, () => (60 + s) - 60 === s],
        [A => `${n} weeks = ${A.blank(7 * n)} days`, 7 * n, () => (7 * n) / 7 === n],
      ];
      return {
        marks: 1, answer: F.n(forms[f][1]), check: forms[f][2],
        body: A => `<p>Write the missing number.</p><div class="sent c">${forms[f][0](A)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_NC_12.month-days', topics: ['Y3_NC_12'], level: 1,
    make(R) {
      const m = R.int(0, 11), leap = m === 1 ? R.chance(0.5) : false, days = MDAYS[m] + (leap ? 1 : 0);
      const extra = m === 1 ? (leap ? ' in a leap year' : ' in a year that is not a leap year') : '';
      return {
        marks: 1, answer: `${days} days`,
        check: () => new Date(leap ? 2024 : 2025, m + 1, 0).getDate() === days,
        body: A => `<p>How many days are there in <b>${MONTHS[m]}</b>${extra}?</p>${A.box(days, { unit: 'days' })}`,
      };
    },
  });
  add({
    id: 'Y3_NC_12.true-false', topics: ['Y3_NC_12'], level: 2,
    make(R) {
      const k = R.int(2, 5), m = R.intNot(0, 11, [1]), tm = R.chance(0.5), claim = tm ? MDAYS[m] : (MDAYS[m] === 31 ? 30 : 31);
      const pool = [
        [`There are 60 seconds in 1 minute.`, true, () => 60 === 1 * 60],
        [`There are 100 seconds in 1 minute.`, false, () => 100 === 60],
        [`${k} minutes = ${60 * k} seconds`, true, () => 60 * k === k * 60],
        [`${k} minutes = ${100 * k} seconds`, false, () => 100 * k === k * 60],
        [`${MONTHS[m]} has ${claim} days.`, tm, () => new Date(2025, m + 1, 0).getDate() === claim],
        [`A leap year has 366 days.`, true, () => (new Date(2025, 0, 1) - new Date(2024, 0, 1)) / 864e5 === 366],
        [`A year that is not a leap year has 366 days.`, false, () => (new Date(2026, 0, 1) - new Date(2025, 0, 1)) / 864e5 === 366],
        [`February has 29 days in a leap year.`, true, () => new Date(2024, 2, 0).getDate() === 29],
        [`February has 30 days in a leap year.`, false, () => new Date(2024, 2, 0).getDate() === 30],
      ];
      const rows = mixed(R, pool, 3);
      if (!rows) return null;
      return {
        marks: 1, answer: tfAnswer(rows), guide: 'All three correct for the mark.',
        check: () => rows.every(r => r[2]() === r[1]),
        body: A => `<p>Tick <b>True</b> or <b>False</b> for each sentence.</p>${tfTable(A, rows)}`,
      };
    },
  });

  /* ================= Statistics ================= */

  // draw.js pictogram keys use F.pl(per, unit), which only adds "s" ("childs"), so the keys count pupils, pets or books
  const PICTO_SETS = [
    { title: 'the favourite fruit of some pupils', cats: ['Apple', 'Banana', 'Pear', 'Grapes'], unit: 'pupil', q: c => `How many pupils chose <b>${c}</b>?`, more: (a, b) => `How many more pupils chose <b>${a}</b> than <b>${b}</b>?` },
    { title: 'the pets owned by pupils in a class', cats: ['Cat', 'Dog', 'Hamster', 'Rabbit'], unit: 'pet', q: c => `How many <b>${c.toLowerCase()}s</b> are there?`, more: (a, b) => `How many more <b>${a.toLowerCase()}s</b> are there than <b>${b.toLowerCase()}s</b>?` },
    { title: 'how many books a class read each day', cats: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], unit: 'book', q: c => `How many books were read on <b>${c}</b>?`, more: (a, b) => `How many more books were read on <b>${a}</b> than on <b>${b}</b>?` },
    { title: 'how some pupils travel to school', cats: ['Walk', 'Car', 'Bus', 'Bike'], unit: 'pupil', q: c => `How many pupils ${c === 'Walk' ? '<b>walk</b> to school' : `travel by <b>${c.toLowerCase()}</b>`}?`, more: (a, b) => `How many more pupils chose <b>${a}</b> than chose <b>${b}</b>?` },
  ];
  function pictoData(R) {
    const set = R.pick(PICTO_SETS), per = R.pick([2, 4, 10]), half = per / 2;
    const vals = R.ints(4, 1, 9).map(k => k * half);
    if (!vals.some(v => v % per !== 0)) return null;
    return { set, per, half, vals };
  }
  add({
    id: 'Y3_NC_13.pictogram', topics: ['Y3_NC_13'], level: 1,
    make(R) {
      const P = pictoData(R);
      if (!P) return null;
      const i = R.int(0, 3), ans = P.vals[i];
      return {
        marks: 1, answer: F.n(ans),
        check: () => (Math.floor(ans / P.per) + (ans % P.per ? 0.5 : 0)) * P.per === ans,
        body: A => `<p>This pictogram shows ${P.set.title}.</p>${D.pictogram({ rows: P.set.cats.map((c, k) => [c, P.vals[k]]), per: P.per, unit: P.set.unit }, A)}<p>${P.set.q(P.set.cats[i])}</p>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_13.draw-bar', topics: ['Y3_NC_13'], level: 2,
    make(R) {
      const [cats, label] = R.pick([[['Red', 'Blue', 'Green', 'Yellow'], 'Colour'], [['Cat', 'Dog', 'Fish', 'Rabbit'], 'Pet'], [['Football', 'Netball', 'Tennis', 'Swimming'], 'Sport']]);
      const step = R.pick([2, 5, 10]), vals = R.ints(4, 1, 9).map(k => k * step), i = R.int(0, 3);
      const max = (Math.max(...vals) + step);
      const table = A => A.table(cats.map((c, k) => [c, vals[k]]), { head: [label, 'Children'] });
      return {
        marks: 1, answer: `Bar for ${cats[i]} drawn to ${vals[i]}`, guide: `The bar must reach ${vals[i]} (within half a small square).`,
        check: () => vals[i] % step === 0 && vals[i] < max,
        body: A => `<p>The table shows the favourite ${label.toLowerCase()} of some children.</p><p>Use the table to draw the missing bar for <b>${cats[i]}</b>.</p>${D.row([table(A), D.barChart({ cats, vals, step, max, ylab: 'Children', width: 92, height: 46, ans: [i] }, A)], 5)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_13.tally', topics: ['Y3_NC_13'], level: 2,
    make(R) {
      const [cats, label, what] = R.pick([[['Red', 'Blue', 'Green', 'Yellow'], 'Colour', 'their favourite colour'], [['Walk', 'Car', 'Bus', 'Bike'], 'Travel', 'how they travel to school'], [['Sunny', 'Rainy', 'Cloudy', 'Windy'], 'Weather', 'the weather each day for a month']]);
      const ns = R.ints(4, 3, 18), i = R.int(0, 3);
      const tl = ns.map(tally);
      return {
        marks: 1, answer: F.n(ns[i]),
        check: () => tl[i][1] === ns[i] + 0 && tl.every((t, k) => t[1] === ns[k]),
        body: A => `<p>Some children recorded ${what} in a tally chart.</p><p>Write the missing number in the table.</p>${A.table(cats.map((c, k) => [c, tl[k][0], k === i ? { a: ns[k] } : ns[k]]), { head: [label, 'Tally', 'Total'] })}`,
      };
    },
  });

  // Y3_NC_14 one- and two-step questions from charts and tables
  add({
    id: 'Y3_NC_14.pictogram', topics: ['Y3_NC_14'], level: 2,
    make(R) {
      const P = pictoData(R);
      if (!P) return null;
      const [i, j] = R.sample([0, 1, 2, 3], 2), big = P.vals[i] > P.vals[j] ? i : j, small = big === i ? j : i;
      const ans = P.vals[big] - P.vals[small];
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans + P.vals[small] === P.vals[big] && ans > 0,
        body: A => `<p>This pictogram shows ${P.set.title}.</p>${D.pictogram({ rows: P.set.cats.map((c, k) => [c, P.vals[k]]), per: P.per, unit: P.set.unit }, A)}<p>${P.set.more(P.set.cats[big], P.set.cats[small])}</p>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_14.table', topics: ['Y3_NC_14'], level: 2,
    make(R) {
      const cls = ['Oak', 'Ash', 'Elm'], boys = R.ints(3, 9, 17), girls = R.ints(3, 9, 17), tot = boys.map((b, k) => b + girls[k]);
      const form = R.int(0, 1), [x, y] = R.sample([0, 1, 2], 2);
      if (form === 1 && tot[x] === tot[y]) return null;
      const big = tot[x] > tot[y] ? x : y, small = big === x ? y : x;
      const ans = form === 0 ? tot[x] + tot[y] : tot[big] - tot[small];
      const q = form === 0 ? `How many children are in <b>${cls[x]}</b> class and <b>${cls[y]}</b> class altogether?`
        : `How many more children are in <b>${cls[big]}</b> class than in <b>${cls[small]}</b> class?`;
      return {
        marks: 1, answer: F.n(ans),
        check: () => form === 0 ? ans === boys[x] + boys[y] + girls[x] + girls[y] : ans === (boys[big] - boys[small]) + (girls[big] - girls[small]),
        body: A => `<p>The table shows the number of boys and girls in three classes.</p>${A.table(cls.map((c, k) => [c, boys[k], girls[k]]), { head: ['Class', 'Boys', 'Girls'] })}<p>${q}</p>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_14.bar-two-step', topics: ['Y3_NC_14'], level: 3,
    make(R) {
      const [cats, what] = R.pick([[['Cat', 'Dog', 'Fish', 'Rabbit'], 'pet'], [['Apple', 'Banana', 'Pear', 'Grape'], 'fruit'], [['Red', 'Blue', 'Green', 'Pink'], 'colour']]);
      const step = R.pick([2, 5, 10]), vals = R.ints(4, 1, 9).map(k => k * step);
      const [x, y, z] = R.sample([0, 1, 2, 3], 3), ans = vals[x] + vals[y] - vals[z];
      if (ans <= 0) return null;
      const max = Math.max(...vals) + step;
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: `Award 1 mark for ${vals[x]} + ${vals[y]} = ${vals[x] + vals[y]} with a later slip.`,
        check: () => ans + vals[z] - vals[y] === vals[x],
        body: A => `<p>This bar chart shows the favourite ${what} of some children.</p><p>How many more children chose <b>${cats[x]}</b> or <b>${cats[y]}</b> than chose <b>${cats[z]}</b>?</p>${side(D.barChart({ cats, vals, step, max, ylab: 'Number of children', width: 88, height: 46 }, A), A.work(`${vals[x]} + ${vals[y]} = ${vals[x] + vals[y]}<br>${vals[x] + vals[y]} ${F.minus} ${vals[z]} = ${ans}`, 36) + A.box(ans))}`,
      };
    },
  });
})();
