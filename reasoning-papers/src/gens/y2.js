/* Year 2 question generators (KS1 level). Topic ids from src/topics.json. See src/GENERATORS.md.
 * Uses the KS1 picture helpers RP.KS1 made in y1.js (files load in name order).
 */
(function () {
  const { F, D } = RP;
  const add = RP.add;
  const K = RP.KS1;
  if (!K) throw new Error('y2.js needs y1.js (RP.KS1) to load first');
  const circ = K.circ;

  // evaluate one side of a simple number sentence: "7 + 5", "20 ÷ 5", "36"
  const ev = s => {
    const m = s.trim().match(/^(\d+)\s*([+−×÷])\s*(\d+)$/);
    if (!m) return +s;
    const a = +m[1], b = +m[3];
    return m[2] === '+' ? a + b : m[2] === '−' ? a - b : m[2] === '×' ? a * b : a / b;
  };
  const isTrue = s => { const [l, r] = s.split('='); return Math.abs(ev(l) - ev(r)) < 1e-9; };
  const track = (vals, hide, A) => A.table([vals.map((v, i) => hide.includes(i) ? { a: v } : v)]);

  // column layout for addition / subtraction (2-digit). cells: [[digit|{a:digit}|'' ...] per row], op on row 2
  function column(rows, op, A) {
    const cell = c => (c && typeof c === 'object') ? `<td class="tcell-a" style="min-width:10mm">${A.red(c.a)}</td>` : `<td style="min-width:10mm">${c}</td>`;
    const nb = '<td style="border:0;min-width:6mm"></td>';
    return `<table class="qt" style="border:0"><tr>${nb}<th>T</th><th>O</th></tr>`
      + rows.map((r, i) => `<tr>${i === 1 ? `<td style="border:0;font-size:14pt"><b>${op}</b></td>` : nb}${r.map(cell).join('')}</tr>`).join('') + `</table>`;
  }
  const dg = n => [Math.floor(n / 10), n % 10];

  /* ================= Y2_004 place value in 2-digit numbers ================= */
  add({
    id: 'Y2_004.blocks', topics: ['Y2_004'], level: 1,
    make(R) {
      const t = R.int(1, 9), o = R.int(0, 9), n = 10 * t + o, form = R.int(0, 1);
      if (n < 12) return null;
      const fig = K.blocks(t, o);
      return {
        marks: 1, answer: form ? `${t} tens and ${o} ones` : F.n(n),
        check: () => K.count(fig, 'ten') === t && K.count(fig, 'one') === o,
        body: A => `${fig}` + (form ? `<p>Complete the sentence.</p><div class="sent c">${A.blank(t)} tens and ${A.blank(o)} ones make ${n}</div>`
          : `<p>Each stick is 10 and each cube is 1. What number is shown?</p>${A.box(n, { w: 20 })}`),
      };
    },
  });
  add({
    id: 'Y2_004.partition', topics: ['Y2_004'], level: 2,
    make(R) {
      const t = R.int(2, 9), o = R.int(1, 9), n = 10 * t + o, f = R.int(0, 3);
      const parts = [[10 * t, o], [10 * t, o], [10 * (t - 1), o + 10], [10 * (t - 1), o + 10]][f];
      const hide = f % 2;
      return {
        marks: 1, answer: F.n(parts[hide]),
        check: () => parts[0] + parts[1] === n,
        body: A => `<p>Write the missing number.</p><div class="sent c">${n} = ${hide === 0 ? A.blank(parts[0]) : parts[0]} + ${hide === 1 ? A.blank(parts[1]) : parts[1]}</div>`,
      };
    },
  });
  add({
    id: 'Y2_004.circle', topics: ['Y2_004'], level: 1,
    make(R) {
      const [t, o] = R.ints(2, 1, 9), n = 10 * t + o;
      if (R.chance(0.5)) {
        const opts = R.shuffle([n, 10 * o + t, 10 * t, t + o === n ? n + 1 : t + o]);
        if (new Set(opts).size < 4) return null;
        return {
          marks: 1, answer: F.n(n),
          check: () => Math.floor(opts[opts.indexOf(n)] / 10) === t && n % 10 === o,
          body: A => `<p>Circle the number that has <b>${t} tens</b> and <b>${o} ones</b>.</p>${A.circle(opts, opts.indexOf(n))}`,
        };
      }
      const which = R.int(0, 1), d = [t, o][which], val = which ? o : 10 * t;
      const opts = R.shuffle([d, d * 10, d * 10 + d === n ? d + 10 : d * 10 + d].filter((v, i, a) => a.indexOf(v) === i));
      return {
        marks: 1, answer: F.n(val),
        check: () => (which ? n % 10 : n - n % 10) === val,
        body: A => `<p>What is the value of the <b>${d}</b> in <b>${n}</b>? Circle one.</p>${A.circle(opts, opts.indexOf(val))}`,
      };
    },
  });

  /* ================= Y2_005 facts within 10 ================= */
  add({
    id: 'Y2_005.missing', topics: ['Y2_005'], level: 1,
    make(R) {
      const c = R.int(5, 10), a = R.int(1, c - 1), b = c - a, f = R.int(0, 4);
      const ans = [a, c, b, a, c][f];
      return {
        marks: 1, answer: F.n(ans),
        check: () => a + b === c,
        body: A => {
          const s = [`${A.blank(a)} + ${b} = ${c}`, `${A.blank(c)} ${F.minus} ${a} = ${b}`, `${c} = ${a} + ${A.blank(b)}`, `${b} = ${c} ${F.minus} ${A.blank(a)}`, `${A.blank(c)} = ${b} + ${a}`][f];
          return `<p>Write the missing number.</p><div class="sent c">${s}</div>`;
        },
      };
    },
  });
  add({
    id: 'Y2_005.balance', topics: ['Y2_005'], level: 2,
    make(R) {
      const s = R.int(5, 10), a = R.int(1, s - 1), b = s - a, d = R.intNot(1, s - 1, [a, b]), x = s - d;
      return {
        marks: 1, answer: F.n(x),
        check: () => a + b - d === x && x > 0,
        body: A => `<p>Write the missing number to make both sides equal.</p><div class="sent c">${a} + ${b} = ${A.blank(x)} + ${d}</div>`,
      };
    },
  });
  add({
    id: 'Y2_005.true', topics: ['Y2_005'], level: 2,
    make(R) {
      const one = ok => {
        const c = R.int(4, 10), a = R.int(1, c - 1), b = c - a, f = R.int(0, 2), w = ok ? 0 : R.pick([-1, 1]);
        return [`${c + w} = ${a} + ${b}`, `${c} ${F.minus} ${a} = ${b + w}`, `${a} + ${b} = ${c + w}`][f];
      };
      const items = R.shuffle([one(true), one(true), one(false), one(false)]);
      if (new Set(items).size < 4) return null;
      const right = items.map((s, i) => isTrue(s) ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => items[i]).join(' and '),
        check: () => right.length === 2,
        body: A => `<p>Tick the <b>two</b> number sentences that are true.</p>${A.tick(items, right, { col: true })}`,
      };
    },
  });

  /* ================= Y2_006 add and subtract across 10 ================= */
  add({
    id: 'Y2_006.cross', topics: ['Y2_006'], level: 1,
    make(R) {
      const f = R.int(0, 3);
      let a, b, ans, op;
      if (f === 0) { a = R.int(5, 9); b = R.int(11 - a, 9); ans = a + b; op = '+'; }
      else if (f === 1) { a = R.int(11, 17); b = R.int(a - 9, 9); ans = a - b; op = F.minus; }
      else if (f === 2) { const x = R.int(4, 9); a = R.int(1, 8) * 10 + x; b = R.int(11 - x, 9); ans = a + b; op = '+'; }
      else { const x = R.int(0, 7); a = R.int(2, 9) * 10 + x; b = R.int(x + 1, 9); ans = a - b; op = F.minus; }
      const crossed = Math.floor(a / 10) !== Math.floor(ans / 10);
      return {
        marks: 1, answer: F.n(ans),
        check: () => crossed && (op === '+' ? ans - b === a : ans + b === a),
        body: A => `<div class="sent c">${a} ${op} ${b} = ${A.blank(ans, 18)}</div>`,
      };
    },
  });
  add({
    id: 'Y2_006.bridge', topics: ['Y2_006'], level: 2,
    make(R) {
      const two = R.chance(0.5), u = R.int(5, 9), a = two ? R.int(1, 7) * 10 + u : u;
      const x = 10 - u, b = R.int(x + 1, 9), y = b - x, ans = a + b;
      return {
        marks: 1, answer: `${y} and ${ans}`,
        guide: 'Both numbers must be correct.',
        check: () => (a + x) % 10 === 0 && x + y === b && ans - b === a,
        body: A => `<p>Use the number bond to 10 to help. Write the missing numbers.</p><div class="sent c">${a} + ${b} = ${a} + ${x} + ${A.blank(y)} = ${A.blank(ans, 18)}</div>`,
      };
    },
  });
  add({
    id: 'Y2_006.story', topics: ['Y2_006'], level: 2,
    make(R) {
      const who = R.name(), x = R.int(0, 6), a = R.int(1, 4) * 10 + x, b = R.int(x + 1, 9), ans = a - b;
      const th = R.pick(['stickers', 'sweets', 'marbles', 'cards', 'beads']);
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans + b === a,
        body: A => `<p>${who} has <b>${a}</b> ${th}.</p><p>${who} gives away <b>${b}</b> ${th}.</p><p>How many ${th} are left?</p>${A.box(ans, { w: 20 })}`,
      };
    },
  });

  /* ================= Y2_007 difference, "how many more?" ================= */
  add({
    id: 'Y2_007.towers', topics: ['Y2_007'], level: 1,
    make(R) {
      const [a, b] = R.ints(2, 2, 13), [n1, n2] = R.names(2);
      if (Math.abs(a - b) < 2) return null;
      const fig = K.towers([a, b], [n1, n2], 4.8, 20);
      const big = a > b ? 0 : 1, d = Math.abs(a - b), names = [n1, n2];
      const cnt = i => (fig.match(new RegExp(`data-t="${i}"`, 'g')) || []).length;
      return {
        marks: 1, answer: F.n(d),
        check: () => cnt(big) - cnt(1 - big) === d,
        body: A => `<p>${n1} and ${n2} build towers of cubes.</p>${fig}<p>How many more cubes are in ${names[big]}'s tower than in ${names[1 - big]}'s tower?</p>${A.box(d, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y2_007.word', topics: ['Y2_007'], level: 2,
    make(R) {
      const [n1, n2] = R.names(2), a = R.int(12, 60), b = a + R.int(3, 30);
      if (b > 99) return null;
      const th = R.pick(['marbles', 'stickers', 'shells', 'conkers', 'stamps']), f = R.int(0, 1);
      return {
        marks: 1, answer: F.n(b - a),
        check: () => a + (b - a) === b,
        body: A => f ? `<p>${n1} has <b>${a}</b> ${th}.</p><p>${n2} has <b>${b}</b> ${th}.</p><p>How many more ${th} does ${n2} have than ${n1}?</p>${A.box(b - a, { w: 20 })}`
          : `<p>What is the difference between <b>${b}</b> and <b>${a}</b>?</p>${A.box(b - a, { w: 20 })}`,
      };
    },
  });

  /* ================= Y2_008 add or subtract ones or tens ================= */
  add({
    id: 'Y2_008.tens-ones', topics: ['Y2_008'], level: 1,
    make(R) {
      const n = R.int(21, 79), f = R.int(0, 3);
      const d = f < 2 ? R.int(1, 5) * 10 : R.int(1, 9);
      const ans = f % 2 ? n - d : n + d;
      if (ans < 1 || ans > 99) return null;
      return {
        marks: 1, answer: F.n(ans),
        check: () => (f % 2 ? ans + d : ans - d) === n,
        body: A => `<div class="sent c">${n} ${f % 2 ? F.minus : '+'} ${d} = ${A.blank(ans, 18)}</div>`,
      };
    },
  });
  add({
    id: 'Y2_008.use-fact', topics: ['Y2_008'], level: 2,
    make(R) {
      const sub = R.chance(0.5), a = R.int(1, 6), b = R.int(1, 9 - a), c = a + b, t = R.int(2, 8);
      const facts = sub ? [`${c} ${F.minus} ${a} = ${b}`, `${c * 10} ${F.minus} ${a * 10} = `, `${t * 10 + c} ${F.minus} ${a} = `, b * 10, t * 10 + b]
        : [`${a} + ${b} = ${c}`, `${a * 10} + ${b * 10} = `, `${t * 10 + a} + ${b} = `, c * 10, t * 10 + c];
      return {
        marks: 1, answer: `${facts[3]} and ${facts[4]}`,
        guide: 'Both must be correct.',
        check: () => sub ? facts[3] + a * 10 === c * 10 && facts[4] + a === t * 10 + c : facts[3] - b * 10 === a * 10 && facts[4] - b === t * 10 + a,
        body: A => `<p>Use this fact:</p><div class="sent c"><b>${facts[0]}</b></div><p>Write the missing numbers.</p><div class="sent c">${facts[1]}${A.blank(facts[3], 18)}</div><div class="sent c">${facts[2]}${A.blank(facts[4], 18)}</div>`,
      };
    },
  });
  add({
    id: 'Y2_008.explain', topics: ['Y2_008'], level: 2,
    make(R) {
      const who = R.name(), n = R.int(21, 88), sub = R.chance(0.4);
      if (n % 10 === 0 || (sub && n % 10 === 0)) return null;
      const right = sub ? n - 10 : n + 10, wrong = sub ? n - 1 : n + 1;
      const s = `${n} ${sub ? F.minus : '+'} 10 = ${wrong}`;
      return {
        marks: 1, answer: `No, it is ${right}`,
        guide: `Accept any clear reason, e.g. "${who} ${sub ? 'took away' : 'added'} 1, not 10" or "the tens digit should change".`,
        check: () => Math.abs(right - n) === 10 && right !== wrong,
        body: A => `<p>${who} says:</p><div class="sent c"><b>${s}</b></div><p>Is ${who} right? Explain how you know.</p>${A.explain(`No. ${n} ${sub ? F.minus : '+'} 10 = ${right}. ${who} ${sub ? 'took away' : 'added'} 1 instead of 10.`, 2)}`,
      };
    },
  });

  /* ================= Y2_009 add and subtract two 2-digit numbers ================= */
  add({
    id: 'Y2_009.calc', topics: ['Y2_009'], level: 1,
    make(R) {
      const f = R.int(0, 2), a = R.int(12, 68), b = R.int(11, 45);
      let s, ans;
      if (f === 0) { if (a + b > 99) return null; ans = a + b; s = A => `${a} + ${b} = ${A.blank(ans, 18)}`; }
      else if (f === 1) { const c = a + b; if (c > 99) return null; ans = b; s = A => `${c} ${F.minus} ${a} = ${A.blank(ans, 18)}`; }
      else { const c = a + b; if (c > 99) return null; ans = b; s = A => `${a} + ${A.blank(ans, 18)} = ${c}`; }
      return {
        marks: 1, answer: F.n(ans),
        check: () => f === 0 ? ans - b === a : ans + a === a + b,
        body: A => `<p>Write the missing number.</p><div class="sent c">${s(A)}</div>`,
      };
    },
  });
  add({
    id: 'Y2_009.word', topics: ['Y2_009'], level: 3,
    make(R) {
      const sub = R.chance(0.5), a = R.int(24, 75), b = R.int(12, 48);
      if (!sub && a + b > 99) return null;
      if (sub && b >= a - 5) return null;
      const ans = sub ? a - b : a + b;
      const [l1, l2, q, unit] = R.pick(sub
        ? [[`There are ${a} children in the hall.`, `${b} children go out to play.`, 'How many children are still in the hall?', 'children'],
          [`A baker makes ${a} buns.`, `She sells ${b} buns.`, 'How many buns are left?', 'buns']]
        : [[`A farmer has ${a} sheep in one field`, `and ${b} sheep in another field.`, 'How many sheep does the farmer have altogether?', 'sheep'],
          [`${R.name()} reads ${a} pages on Monday`, `and ${b} pages on Tuesday.`, 'How many pages are read altogether?', 'pages']]);
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: 'Award 1 mark for a correct method with one slip.',
        check: () => sub ? ans + b === a : ans - a === b,
        body: A => `<p>${l1} ${l2}</p><p>${q}</p>${A.work(`${a} ${sub ? F.minus : '+'} ${b} = ${ans}`, 28)}${A.box(ans, { unit, w: 22 })}`,
      };
    },
  });

  /* ================= written method: add two 2-digit numbers ================= */
  const WA = 'new_d_n8bvzswy_6_mwuw8e4i';
  add({
    id: WA + '.column', topics: [WA], level: 2,
    make(R) {
      const a = R.int(13, 68), b = R.int(12, 48), s = a + b;
      if (s > 99) return null;
      if (a % 10 + b % 10 < 10 && R.chance(0.7)) return null; // mostly with an exchange
      const [a1, a0] = dg(a), [b1, b0] = dg(b), [s1, s0] = dg(s);
      const carry = a0 + b0 >= 10 ? 1 : 0;
      return {
        marks: 1, answer: F.n(s),
        check: () => (a0 + b0) % 10 === s0 && a1 + b1 + carry === s1,
        body: A => `<p>Use the column method to work out ${a} + ${b}.</p>${column([[a1, a0], [b1, b0], [{ a: s1 }, { a: s0 }]], '+', A)}`,
      };
    },
  });
  add({
    id: WA + '.missing', topics: [WA], level: 3,
    make(R) {
      const a = R.int(13, 68), b = R.int(12, 39), s = a + b;
      if (s > 99) return null;
      const [a1, a0] = dg(a), [b1, b0] = dg(b), [s1, s0] = dg(s);
      const ha = R.int(0, 1), hb = 1 - ha;
      const ra = [a1, a0].map((d, i) => i === ha ? { a: d } : d), rb = [b1, b0].map((d, i) => i === hb ? { a: d } : d);
      return {
        marks: 1, answer: `${[a1, a0][ha]} and ${[b1, b0][hb]}`,
        guide: 'Both digits must be correct.',
        check: () => (10 * a1 + a0) + (10 * b1 + b0) === 10 * s1 + s0,
        body: A => `<p>Write the missing digits to make this addition correct.</p>${column([ra, rb, [`<b>${s1}</b>`, `<b>${s0}</b>`]], '+', A)}`,
      };
    },
  });
  add({
    id: WA + '.mistake', topics: [WA], level: 2,
    make(R) {
      const who = R.name(), a = R.int(14, 58), b = R.int(13, 38), s = a + b;
      if (s > 99 || a % 10 + b % 10 < 10) return null;
      const wrong = s - 10;   // forgot the ten that was exchanged
      const [a1, a0] = dg(a), [b1, b0] = dg(b), [w1, w0] = dg(wrong);
      return {
        marks: 1, answer: F.n(s),
        check: () => s - b === a && wrong !== s,
        body: A => `<p>${who} worked out ${a} + ${b} like this.</p>${column([[a1, a0], [b1, b0], [w1, w0]], '+', A)}<p>${who} has made a mistake. What is the correct answer?</p>${A.box(s, { w: 20 })}`,
      };
    },
  });

  /* ================= written method: subtract a 2-digit number ================= */
  const WS = 'new_d_n8bvzswy_7_mwuwbak7';
  add({
    id: WS + '.column', topics: [WS], level: 2,
    make(R) {
      const a = R.int(31, 98), b = R.int(12, a - 10), d = a - b;
      if (d < 10) return null;
      if (a % 10 >= b % 10 && R.chance(0.65)) return null; // mostly with an exchange
      const [a1, a0] = dg(a), [b1, b0] = dg(b), [d1, d0] = dg(d);
      const ex = a0 < b0 ? 1 : 0;
      return {
        marks: 1, answer: F.n(d),
        check: () => (a0 + 10 * ex - b0) === d0 && a1 - ex - b1 === d1,
        body: A => `<p>Use the column method to work out ${a} ${F.minus} ${b}.</p>${column([[a1, a0], [b1, b0], [{ a: d1 }, { a: d0 }]], F.minus, A)}`,
      };
    },
  });
  add({
    id: WS + '.mistake', topics: [WS], level: 2,
    make(R) {
      const who = R.name(), a = R.int(31, 95), b = R.int(12, a - 12), d = a - b;
      const [a1, a0] = dg(a), [b1, b0] = dg(b);
      if (a0 >= b0) return null;
      const w0 = b0 - a0, w1 = a1 - b1, wrong = 10 * w1 + w0;   // took the smaller digit from the larger
      return {
        marks: 1, answer: F.n(d),
        guide: `${who} took ${a0} from ${b0} instead of exchanging a ten.`,
        check: () => d + b === a && wrong !== d,
        body: A => `<p>${who} worked out ${a} ${F.minus} ${b} like this.</p>${column([[a1, a0], [b1, b0], [w1, w0]], F.minus, A)}<p>${who} has made a mistake. What is the correct answer?</p>${A.box(d, { w: 20 })}`,
      };
    },
  });

  /* ================= Y2_010 repeated addition as multiplication ================= */
  add({
    id: 'Y2_010.repeat', topics: ['Y2_010'], level: 1,
    make(R) {
      const s = R.pick([2, 5, 10]), k = R.int(2, s === 10 ? 5 : 6), tot = s * k;
      const fig = D.groups({ groups: k, per: s });
      return {
        marks: 1, answer: `${k} ${F.times} ${s} = ${tot}`,
        guide: `Accept ${s} ${F.times} ${k} = ${tot}.`,
        check: () => K.count(fig, 'cnt') === tot,
        body: A => `${fig}<p>Complete the addition and the multiplication.</p><div class="sent c">${Array(k).fill(s).join(' + ')} = ${A.blank(tot, 16)}</div><div class="sent c">${A.blank(k)} ${F.times} ${A.blank(s)} = ${A.blank(tot, 16)}</div>`,
      };
    },
  });
  add({
    id: 'Y2_010.match', topics: ['Y2_010'], level: 2,
    make(R) {
      const items = R.shuffle([[2, R.int(3, 5)], [5, R.int(2, 4)], [10, R.int(2, 4)]]);
      const left = items.map(([s, k]) => Array(k).fill(s).join(' + '));
      const rightE = R.shuffle(items.map(([s, k]) => `${k} ${F.times} ${s}`));
      const pairs = items.map(([s, k], i) => [i, rightE.indexOf(`${k} ${F.times} ${s}`)]);
      return {
        marks: 1, answer: items.map(([s, k], i) => `${left[i]} = ${k} ${F.times} ${s}`).join('; '),
        guide: 'All three lines must be correct.',
        check: () => pairs.every(([i, j]) => left[i].split(' + ').reduce((a, b) => a + +b, 0) === ev(rightE[j])),
        body: A => `<p>Draw lines to match each addition to the multiplication with the same answer.</p>${A.match(left, rightE, pairs)}`,
      };
    },
  });

  /* ================= Y2_011 how many groups? ================= */
  add({
    id: 'Y2_011.word', topics: ['Y2_011'], level: 2,
    make(R) {
      const s = R.pick([2, 5, 10]), k = R.int(3, 10), n = s * k;
      const [th, box] = R.pick([['eggs', 'boxes'], ['pencils', 'packs'], ['socks', 'bags'], ['cakes', 'trays'], ['children', 'teams']]);
      const f = R.int(0, 1);
      return {
        marks: 1, answer: F.n(k),
        check: () => k * s === n,
        body: A => `<p>There are <b>${n}</b> ${th}. They are put into ${box} of <b>${s}</b>.</p><p>How many ${box} are needed?</p>` + (f ? A.box(k, { unit: box, w: 20 })
          : `<div class="sent c">${A.blank(k)} ${F.times} ${s} = ${n}</div>`),
      };
    },
  });
  add({
    id: 'Y2_011.picture', topics: ['Y2_011'], level: 1,
    make(R) {
      const s = R.pick([2, 5, 10]), k = R.int(2, s === 10 ? 3 : 6), n = s * k, kind = R.pick(K.KINDS);
      const fig = K.objs(n, kind, { cols: 10, s: 6.5 });
      return {
        marks: 1, answer: F.n(k),
        check: () => K.count(fig) / s === k,
        body: A => `<p>Here are ${n} ${K.PL[kind]}.</p>${fig}<p>Put them into groups of ${s}. How many groups are there?</p><div class="sent c">${n} ${F.div} ${s} = ${A.blank(k)}</div>`,
      };
    },
  });

  /* ================= fractions as equal parts ================= */
  const FE = 'new_d_n8bvzswy_8_mwuwda97';
  add({
    id: FE + '.equal', topics: [FE], level: 2,
    make(R) {
      const v = () => R.chance(0.4);
      const good = [() => { const k = R.int(2, 4); return K.strips(Array(k).fill(1 / k), -1, v()); }, () => D.fractionCircle({ parts: R.pick([3, 4]), shaded: 0 }), () => D.rectParts({ rows: 2, cols: 2, shaded: 0, cell: 9 })];
      const bad = [() => K.strips(R.pick([[0.3, 0.7], [0.2, 0.3, 0.5], [0.15, 0.25, 0.25, 0.35]]), -1, v()), () => K.strips([0.5, 0.25, 0.25], -1, v()), () => K.strips([0.4, 0.6], -1, v())];
      const nGood = R.int(1, 2);
      const items = R.shuffle([...R.sample(good, nGood).map(g => ({ svg: g(), ok: true })), ...R.sample(bad, 4 - nGood).map(b => ({ svg: b(), ok: false }))]);
      const right = items.map((it, i) => it.ok ? i : -1).filter(i => i >= 0);
      // check: widths of strips are all equal exactly for the right ones
      const equal = s => { const ws = [...s.matchAll(/<rect [^>]*width="([\d.]+)" height="([\d.]+)"/g)].map(m => +m[1] * +m[2]); return ws.length === 0 || Math.max(...ws) - Math.min(...ws) < 0.05; };
      return {
        marks: 1, answer: right.map(i => K.LET[i]).join(' and '),
        check: () => items.every((it, i) => equal(it.svg) === right.includes(i)),
        body: A => `<p>Tick the shape${nGood > 1 ? 's' : ''} split into <b>equal</b> parts. (There ${nGood > 1 ? `are ${nGood}` : 'is 1'}.)</p>${A.tick(items.map((it, i) => K.lab(it.svg, K.LET[i])), right)}`,
      };
    },
  });
  add({
    id: FE + '.name', topics: [FE], level: 1,
    make(R) {
      const d = R.int(2, 4), kind = R.int(0, 2);
      let fig;
      if (kind === 0) fig = D.fractionBar({ parts: d, shaded: [R.int(0, d - 1)], width: 80 });
      else if (kind === 1) fig = D.fractionCircle({ parts: d, shaded: 1 });
      else { const sh = R.int(0, d - 1); let s = ''; for (let i = 0; i < d; i++) s += circ(6 + i * 12, 6, 5, i === sh ? 'shaded' : 'cnt'); fig = D.svg(d * 12, 12, s); }
      const nSh = (fig.match(/class="shaded"/g) || []).length, nAll = (fig.match(/class="(shaded|bx|cnt)"/g) || []).length;
      return {
        marks: 1, answer: F.frac(1, d),
        check: () => nSh === 1 && nAll === d,
        body: A => `<p>What fraction of the ${kind === 2 ? 'set' : 'shape'} is shaded?</p>${fig}${A.box(F.frac(1, d), { w: 18 })}`,
      };
    },
  });

  /* ================= Y2_012 properties of 2D and 3D shapes ================= */
  const OCT = D.regular(8, 0.5, 22.5);
  add({
    id: 'Y2_012.sides', topics: ['Y2_012'], level: 1,
    make(R) {
      const nm = R.pick(['triangle', 'rectangle', 'pentagon', 'hexagon', 'square', 'octagon']);
      let f;
      if (nm === 'octagon') { const pts = OCT.map(([x, y]) => [1 + x * 22, 1 + y * 22]); f = { svg: D.svg(24, 24, D.poly(pts, 'shape')), pts }; }
      else f = K.shape2d(nm, R, 22);
      const n = f.pts.length, what = R.pick(['sides', 'vertices (corners)']);
      return {
        marks: 1, answer: F.n(n),
        check: () => n === (nm === 'octagon' ? 8 : K.SIDES[nm]),
        body: A => `<p>How many <b>${what}</b> does this shape have?</p>${f.svg}${A.box(n, { w: 20 })}`,
      };
    },
  });
  const SOLIDS = { cube: ['cube', 6, 12, 8], cuboid: ['cuboid', 6, 12, 8], sqpyramid: ['square-based pyramid', 5, 8, 5], tripyramid: ['triangle-based pyramid', 4, 6, 4], triprism: ['triangular prism', 5, 9, 6] };
  add({
    id: 'Y2_012.solid', topics: ['Y2_012'], level: 2,
    make(R) {
      const s = R.pick(Object.keys(SOLIDS)), [nm, fa, ed, ve] = SOLIDS[s], w = R.int(0, 2);
      const ans = [fa, ed, ve][w], word = ['faces', 'edges', 'vertices'][w];
      return {
        marks: 1, answer: F.n(ans),
        check: () => fa - ed + ve === 2,
        body: A => `<p>This is a <b>${nm}</b>.</p>${D.solid(s, 26)}<p>How many <b>${word}</b> does it have?</p>${A.box(ans, { w: 20 })}`,
      };
    },
  });
  const RIDDLES = [
    ['I have 6 square faces.', 'cube', '3d'], ['I have 1 square face and 4 triangle faces.', 'pyramid', '3d'],
    ['I have 2 flat circle faces and 1 curved surface.', 'cylinder', '3d'], ['I have no flat faces. I can roll in any direction.', 'sphere', '3d'],
    ['I have 1 flat circle face, 1 curved surface and a point.', 'cone', '3d'], ['I have 2 triangle faces and 3 rectangle faces.', 'triangular prism', '3d'],
    ['I have 5 straight sides and 5 vertices.', 'pentagon', '2d'], ['I have 6 straight sides and 6 vertices.', 'hexagon', '2d'],
    ['I have 3 straight sides and 3 vertices.', 'triangle', '2d'], ['I have 1 curved side and no vertices.', 'circle', '2d'],
    ['I have 8 straight sides and 8 vertices.', 'octagon', '2d'], ['I have 4 equal sides and 4 right angles.', 'square', '2d'],
  ];
  add({
    id: 'Y2_012.riddle', topics: ['Y2_012'], level: 2,
    make(R) {
      const [txt, nm, kind] = R.pick(RIDDLES);
      const pool = RIDDLES.filter(r => r[2] === kind && r[1] !== nm).map(r => r[1]);
      const opts = R.shuffle([nm, ...R.sample(pool, 3)]);
      return {
        marks: 1, answer: nm,
        check: () => opts.filter(o => o === nm).length === 1,
        body: A => `<p>Read the clue. Circle the shape.</p><div class="sent c"><i>${txt}</i></div>${A.circle(opts, opts.indexOf(nm))}`,
      };
    },
  });

  /* ================= Y2_NC_01 count in 2s, 3s, 5s from 0 and in tens from any number ================= */
  add({
    id: 'Y2_NC_01.seq', topics: ['Y2_NC_01'], level: 1,
    make(R) {
      const tens = R.chance(0.35), st = tens ? 10 : R.pick([2, 3, 5]);
      const start = tens ? R.intNot(1, 49, [10, 20, 30, 40]) : R.int(0, 6) * st;
      const vals = [...Array(6).keys()].map(i => start + i * st);
      const hide = R.sample([2, 3, 4, 5], 2).sort();
      return {
        marks: 1, answer: hide.map(i => vals[i]).join(', '),
        check: () => vals.every((v, i) => i === 0 || v - vals[i - 1] === st) && (tens || vals.every(v => v % st === 0)),
        body: A => `<p>Count in ${tens ? 'tens' : st + 's'}. Write the missing numbers.</p>${track(vals, hide, A)}`,
      };
    },
  });
  add({
    id: 'Y2_NC_01.will-say', topics: ['Y2_NC_01'], level: 2,
    make(R) {
      const who = R.name(), tens = R.chance(0.3);
      let opts, right, desc;
      if (tens) {
        const s = R.int(1, 9); desc = `in tens from ${s}`;
        const yes = s + 10 * R.int(2, 8);
        opts = R.shuffle([yes, ...R.sample([s + 1, s * 10, yes + 1, yes - 2, yes + 5].filter(v => v > 0 && (v - s) % 10 !== 0), 3)]);
        right = opts.indexOf(yes);
      } else {
        const st = R.pick([2, 3, 5]); desc = `in ${st}s from 0`;
        const yes = st * R.int(4, 12);
        opts = R.shuffle([yes, ...R.sample([...Array(40).keys()].map(i => i + 7).filter(v => v % st !== 0), 3)]);
        right = opts.indexOf(yes);
      }
      const says = v => { if (tens) { let x = opts[right] % 10; while (x < v) x += 10; return x === v; } const st = +desc.match(/\d+/)[0]; let x = 0; while (x < v) x += st; return x === v; };
      return {
        marks: 1, answer: F.n(opts[right]),
        check: () => opts.filter(says).length === 1 && says(opts[right]),
        body: A => `<p>${who} counts ${desc}.</p><p>Circle the number ${who} will say.</p>${A.circle(opts, right)}`,
      };
    },
  });

  /* ================= Y2_NC_02 numbers to 100 in numerals and words ================= */
  add({
    id: 'Y2_NC_02.to-words', topics: ['Y2_NC_02'], level: 1,
    make(R) {
      const n = R.int(21, 99), w = K.words(n);
      return {
        marks: 1, answer: w,
        guide: 'Spelling must be correct. Accept without the hyphen.',
        check: () => K.fromWords(w) === n,
        body: A => `<p>Write this number in words.</p><div class="sent c"><b>${n}</b></div>${A.line(w, 80)}`,
      };
    },
  });
  add({
    id: 'Y2_NC_02.to-num', topics: ['Y2_NC_02'], level: 1,
    make(R) {
      const n = R.int(13, 100), w = K.words(n);
      return {
        marks: 1, answer: F.n(n),
        check: () => K.fromWords(w) === n,
        body: A => `<p>Write <b>${w}</b> in numerals (digits).</p>${A.box(n, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y2_NC_02.match', topics: ['Y2_NC_02'], level: 2,
    make(R) {
      const [t, o] = R.ints(2, 2, 9), ns = R.shuffle([10 * t + o, 10 * o + t, 10 * t + (o === 9 ? 1 : o + 1)]);
      if (new Set(ns).size < 3) return null;
      const left = ns.map(K.words), right = R.shuffle(ns);
      const pairs = ns.map((n, i) => [i, right.indexOf(n)]);
      return {
        marks: 1, answer: ns.map(n => `${K.words(n)} = ${n}`).join(', '),
        guide: 'All three lines must be correct.',
        check: () => pairs.every(([i, j]) => K.fromWords(left[i]) === right[j]),
        body: A => `<p>Draw lines to match each word to its number.</p>${A.match(left, right, pairs)}`,
      };
    },
  });

  /* ================= Y2_NC_03 compare and order numbers to 100 ================= */
  add({
    id: 'Y2_NC_03.sign', topics: ['Y2_NC_03'], level: 1,
    make(R) {
      const f = R.int(0, 2);
      let l, r, ls;
      if (f === 0) { const [t, o] = R.ints(2, 1, 9); l = 10 * t + o; r = 10 * o + t; ls = String(l); }
      else if (f === 1) { [l, r] = R.ints(2, 10, 99); ls = String(l); }
      else { const t = R.int(1, 9), o = R.int(1, 9); l = 10 * t + o; ls = `${10 * t} + ${o}`; r = R.chance(0.5) ? l : l + R.pick([-10, 10, -1, 1]); }
      const sign = l < r ? '&lt;' : l > r ? '&gt;' : '=';
      return {
        marks: 1, answer: sign,
        check: () => ev(ls) === l && (sign === '=' ? l - r === 0 : (sign === '&lt;') === (r - l > 0)),
        body: A => `<p>Write <b>&lt;</b>, <b>&gt;</b> or <b>=</b> to make this correct.</p><div class="sent c">${ls} ${A.blank(sign, 12)} ${r}</div>`,
      };
    },
  });
  add({
    id: 'Y2_NC_03.order', topics: ['Y2_NC_03'], level: 2,
    make(R) {
      const t = R.int(2, 8), ns = R.shuffle([10 * t + R.int(1, 9), R.int(1, 9) * 10 + t, ...R.ints(2, 10, 99)]);
      if (new Set(ns).size < 4) return null;
      const big = R.chance(0.4), ord = ns.slice().sort((a, b) => big ? b - a : a - b);
      return {
        marks: 1, answer: ord.join(', '),
        check: () => ord.every((v, i) => ns.filter(x => big ? x > v : x < v).length === i),
        body: A => `<p>Write these numbers in order. Start with the <b>${big ? 'largest' : 'smallest'}</b>.</p><div class="sent c">${ns.join(' &nbsp;&nbsp; ')}</div>${A.boxes(ord.map(v => [v]), { w: 16 })}`,
      };
    },
  });

  /* ================= Y2_NC_04 add three one-digit numbers ================= */
  add({
    id: 'Y2_NC_04.three', topics: ['Y2_NC_04'], level: 1,
    make(R) {
      const [a, b, c] = [R.int(1, 9), R.int(1, 9), R.int(1, 9)], s = a + b + c, f = R.int(0, 2);
      return {
        marks: 1, answer: F.n([s, b, s][f]),
        check: () => s - c - b === a,
        body: A => `<p>Write the missing number.</p><div class="sent c">${[`${a} + ${b} + ${c} = ${A.blank(s)}`, `${a} + ${A.blank(b)} + ${c} = ${s}`, `${A.blank(s)} = ${c} + ${a} + ${b}`][f]}</div>`,
      };
    },
  });
  add({
    id: 'Y2_NC_04.dice', topics: ['Y2_NC_04'], level: 1,
    make(R) {
      const who = R.name(), ns = [R.int(1, 6), R.int(1, 6), R.int(1, 6)], s = ns[0] + ns[1] + ns[2];
      const figs = ns.map(n => K.dice(n, 14));
      return {
        marks: 1, answer: F.n(s),
        check: () => figs.reduce((a, f) => a + K.count(f, 'fillk dd'), 0) === s,
        body: A => `<p>${who} rolls three dice.</p>${D.row(figs, 6)}<p>What is the total?</p>${A.box(s, { w: 20 })}`,
      };
    },
  });

  /* ================= Y2_NC_05 order of addition and subtraction; inverse ================= */
  add({
    id: 'Y2_NC_05.true', topics: ['Y2_NC_05'], level: 2,
    make(R) {
      const [a, b] = R.ints(2, 3, 19), [x, y] = [Math.max(a, b), Math.min(a, b)];
      const T = [`${a} + ${b} = ${b} + ${a}`, `${x + y} ${F.minus} ${y} = ${x}`, `${x} ${F.minus} ${y} = ${x + y} ${F.minus} ${y + y}`];
      const Fs = [`${x} ${F.minus} ${y} = ${y} ${F.minus} ${x}`, `${x + y} ${F.minus} ${x} = ${x}`, `${a} + ${b} = ${a} ${F.minus} ${b}`];
      const items = R.shuffle([...R.sample(T.slice(0, 2), 2), ...R.sample(Fs, 2)]);
      const right = items.map((s, i) => isTrue(s) ? i : -1).filter(i => i >= 0);
      if (new Set(items).size < 4) return null;
      return {
        marks: 1, answer: right.map(i => items[i]).join(' and '),
        guide: 'Both ticks needed, and no others.',
        check: () => right.length === 2,
        body: A => `<p>Tick the <b>two</b> number sentences that are true.</p>${A.tick(items, right, { col: true })}`,
      };
    },
  });
  add({
    id: 'Y2_NC_05.inverse', topics: ['Y2_NC_05'], level: 2,
    make(R) {
      const a = R.int(14, 58), b = R.int(12, 39), c = a + b, f = R.int(0, 2);
      if (c > 99) return null;
      const ans = [a, b, c][f];
      return {
        marks: 1, answer: F.n(ans),
        check: () => c - b === a && c - a === b,
        body: A => `<p>Use this fact:</p><div class="sent c"><b>${a} + ${b} = ${c}</b></div><p>Write the missing number.</p><div class="sent c">${[`${c} ${F.minus} ${b} = ${A.blank(a, 16)}`, `${c} ${F.minus} ${A.blank(b, 16)} = ${a}`, `${A.blank(c, 16)} ${F.minus} ${a} = ${b}`][f]}</div>`,
      };
    },
  });

  /* ================= Y2_NC_06 odd and even ================= */
  add({
    id: 'Y2_NC_06.circle', topics: ['Y2_NC_06'], level: 1,
    make(R) {
      const even = R.chance(0.5);
      const ns = R.ints(5, 11, 99).sort((a, b) => a - b);
      const right = ns.map((n, i) => (n % 2 === 0) === even ? i : -1).filter(i => i >= 0);
      if (right.length !== 2) return null;
      return {
        marks: 1, answer: right.map(i => ns[i]).join(' and '),
        check: () => right.every(i => [0, 2, 4, 6, 8].includes(ns[i] % 10) === even),
        body: A => `<p>Circle the <b>two ${even ? 'even' : 'odd'}</b> numbers.</p>${A.circle(ns, right)}`,
      };
    },
  });
  add({
    id: 'Y2_NC_06.explain', topics: ['Y2_NC_06'], level: 2,
    make(R) {
      const who = R.name(), wrongWay = R.chance(0.6);
      let n, claim, ok;
      if (wrongWay) {
        // claim uses the tens digit: always wrong here
        const t = R.int(1, 9), o = R.pick(t % 2 ? [0, 2, 4, 6, 8] : [1, 3, 5, 7, 9]); n = 10 * t + o;
        claim = `${n} is ${t % 2 ? 'odd' : 'even'} because ${t} is ${t % 2 ? 'odd' : 'even'}.`; ok = false;
      } else {
        n = R.int(11, 99); const e = n % 2 === 0;
        claim = `${n} is ${e ? 'even' : 'odd'} because it ends in ${n % 10}.`; ok = true;
      }
      return {
        marks: 1, answer: ok ? 'Yes' : 'No',
        guide: ok ? `Yes: the ones digit ${n % 10} is ${n % 2 ? 'odd' : 'even'}.` : `No: ${n} ends in ${n % 10}, so it is ${n % 2 ? 'odd' : 'even'}. The ones digit tells you, not the tens.`,
        check: () => ok === (claim.includes(n % 2 === 0 ? 'is even' : 'is odd')),
        body: A => `<p>${who} says:</p><div class="sent c"><b>${claim}</b></div><p>Is ${who} right? Circle Yes or No.</p>${A.circle(['Yes', 'No'], ok ? 0 : 1)}<p>Explain how you know.</p>${A.explain(ok ? `It ends in ${n % 10}, which is ${n % 2 ? 'odd' : 'even'}.` : `${n} ends in ${n % 10}, so it is ${n % 2 ? 'odd' : 'even'}.`, 1)}`,
      };
    },
  });

  /* ================= Y2_NC_07 multiplication and division sentences ================= */
  add({
    id: 'Y2_NC_07.missing', topics: ['Y2_NC_07'], level: 1,
    make(R) {
      const t = R.pick([2, 5, 10]), k = R.int(2, 12), p = t * k, f = R.int(0, 4);
      const ans = [p, k, k, t, k][f];
      return {
        marks: 1, answer: F.n(ans),
        check: () => p / t === k,
        body: A => `<p>Write the missing number.</p><div class="sent c">${[`${k} ${F.times} ${t} = ${A.blank(p, 16)}`, `${A.blank(k)} ${F.times} ${t} = ${p}`, `${p} ${F.div} ${t} = ${A.blank(k)}`, `${p} ${F.div} ${A.blank(t)} = ${k}`, `${p} = ${t} ${F.times} ${A.blank(k)}`][f]}</div>`,
      };
    },
  });
  add({
    id: 'Y2_NC_07.array', topics: ['Y2_NC_07'], level: 2,
    make(R) {
      const rows = R.int(2, 5), cols = R.pick([2, 5, 10]), n = rows * cols;
      if (rows === cols) return null;
      const fig = D.array({ rows, cols, gap: 6.5 });
      return {
        marks: 1, answer: `${rows} ${F.times} ${cols} = ${n} and ${cols} ${F.times} ${rows} = ${n}`,
        guide: 'Accept the two sentences in either order.',
        check: () => K.count(fig, 'cnt') === n,
        body: A => `${fig}<p>Write <b>two</b> different multiplication sentences for this array.</p><div class="sent c">${A.blank(rows)} ${F.times} ${A.blank(cols)} = ${A.blank(n, 16)}</div><div class="sent c">${A.blank(cols)} ${F.times} ${A.blank(rows)} = ${A.blank(n, 16)}</div>`,
      };
    },
  });
  add({
    id: 'Y2_NC_07.true', topics: ['Y2_NC_07'], level: 2,
    make(R) {
      const t = R.pick([2, 5, 10]), k = R.intNot(2, 10, [t]), p = t * k;
      const T = [`${k} ${F.times} ${t} = ${t} ${F.times} ${k}`, `${p} ${F.div} ${t} = ${k}`, `${p} = ${t} ${F.times} ${k}`];
      const Fs = [`${p} ${F.div} ${t} = ${t} ${F.div} ${p}`, `${k} ${F.times} ${t} = ${p + t}`, `${p} ${F.div} ${k} = ${k}`];
      const items = R.shuffle([...R.sample(T, 2), ...R.sample(Fs, 2)]);
      const right = items.map((s, i) => isTrue(s) ? i : -1).filter(i => i >= 0);
      if (new Set(items).size < 4) return null;
      return {
        marks: 1, answer: right.map(i => items[i]).join(' and '),
        check: () => right.length === 2,
        body: A => `<p>Tick the <b>two</b> number sentences that are true.</p>${A.tick(items, right, { col: true })}`,
      };
    },
  });

  /* ================= Y2_NC_08 1/3, 1/4, 2/4, 3/4 ================= */
  const FRACS = [[1, 2], [1, 3], [1, 4], [2, 4], [3, 4]];
  add({
    id: 'Y2_NC_08.of', topics: ['Y2_NC_08'], level: 1,
    make(R) {
      const [n, d] = R.pick(FRACS), k = R.int(2, d === 4 ? 6 : 8), w = d * k, ans = n * k;
      const ctx = R.pick(['', 'cm', 'p']);
      return {
        marks: 1, answer: F.n(ans) + (ctx === 'cm' ? ' cm' : ctx === 'p' ? 'p' : ''),
        check: () => ans * d === w * n,
        body: A => `<p>Work out</p><div class="sent c">${F.frac(n, d)} of ${w}${ctx === 'cm' ? ' cm' : ctx} = ${A.blank(ans, 16)}${ctx === 'cm' ? '&nbsp;cm' : ctx === 'p' ? 'p' : ''}</div>`,
      };
    },
  });
  add({
    id: 'Y2_NC_08.shaded', topics: ['Y2_NC_08'], level: 1,
    make(R) {
      const [n, d] = R.pick([[1, 3], [2, 3], [1, 4], [3, 4], [2, 4]]), kind = R.int(0, 2);
      let fig;
      if (kind === 0) fig = D.fractionBar({ parts: d, shaded: R.sample([...Array(d).keys()], n), width: 84 });
      else if (kind === 1) fig = D.fractionCircle({ parts: d, shaded: n });
      else fig = d === 4 ? D.rectParts({ rows: 2, cols: 2, shaded: R.sample([0, 1, 2, 3], n), cell: 11 }) : D.fractionBar({ parts: d, shaded: R.sample([0, 1, 2], n), width: 66, height: 18 });
      const sh = (fig.match(/class="shaded"/g) || []).length, all = (fig.match(/class="(shaded|bx)"/g) || []).length;
      return {
        marks: 1, answer: F.frac(n, d),
        guide: n === 2 && d === 4 ? `Accept ${F.frac(1, 2)}.` : '',
        check: () => sh === n && all === d,
        body: A => `<p>What fraction of this shape is shaded?</p>${fig}${A.box(F.frac(n, d), { w: 18 })}`,
      };
    },
  });
  add({
    id: 'Y2_NC_08.shade-set', topics: ['Y2_NC_08'], level: 2,
    make(R) {
      const [n, d] = R.pick([[1, 3], [2, 3], [1, 4], [3, 4], [2, 4]]), k = R.int(2, 4), w = d * k, ans = n * k;
      const cols = w <= 12 ? (d === 3 ? 6 : 4) : 6;
      const fig = show => { let s = ''; for (let i = 0; i < w; i++) s += `<g class="ob">${circ(5 + (i % cols) * 9, 5 + Math.floor(i / cols) * 9, 3.4, show && i < ans ? 'ansf' : 'cnt')}</g>`; return D.svg(cols * 9 + 2, Math.ceil(w / cols) * 9 + 2, s); };
      return {
        marks: 1, answer: `${ans} circles shaded`,
        guide: 'Any ' + ans + ' circles.',
        check: () => K.count(fig(false)) * n / d === ans,
        body: A => `<p>Shade <b>${F.frac(n, d)}</b> of these circles.</p>${fig(A.show)}`,
      };
    },
  });

  /* ================= Y2_NC_09 2/4 = 1/2 ================= */
  add({
    id: 'Y2_NC_09.tick-half', topics: ['Y2_NC_09'], level: 2,
    make(R) {
      const opts = R.shuffle([
        { svg: D.rectParts({ rows: 2, cols: 2, shaded: R.sample([0, 1, 2, 3], 2), cell: 9 }), h: true },
        { svg: D.fractionCircle({ parts: 4, shaded: R.pick([1, 3]) }), h: false },
        R.chance(0.5) ? { svg: D.fractionBar({ parts: 2, shaded: [R.int(0, 1)], width: 34 }), h: true } : { svg: D.fractionBar({ parts: 4, shaded: R.sample([0, 1, 2, 3], 2), width: 40 }), h: true },
        { svg: D.fractionBar({ parts: 3, shaded: [R.int(0, 2)], width: 36 }), h: false },
      ]);
      const right = opts.map((o, i) => o.h ? i : -1).filter(i => i >= 0);
      const frac = s => (s.match(/class="shaded"/g) || []).length / (s.match(/class="(shaded|bx)"/g) || []).length;
      return {
        marks: 1, answer: right.map(i => K.LET[i]).join(' and '),
        check: () => opts.every((o, i) => (Math.abs(frac(o.svg) - 0.5) < 1e-9) === right.includes(i)),
        body: A => `<p>Tick the <b>two</b> shapes that have <b>half</b> shaded.</p>${A.tick(opts.map((o, i) => K.lab(o.svg, K.LET[i])), right)}`,
      };
    },
  });
  add({
    id: 'Y2_NC_09.both', topics: ['Y2_NC_09'], level: 2,
    make(R) {
      const who = R.name(), n = 4 * R.int(2, 10), h = n / 2;
      return {
        marks: 1, answer: `${h} and ${h}`,
        guide: 'Both must be correct.',
        check: () => (n / 4) * 2 === h && n / 2 === h,
        body: A => `<p>${who} says, “${F.frac(2, 4)} of ${n} is the same as ${F.frac(1, 2)} of ${n}.”</p><p>Work out both to check.</p><div class="sent c">${F.frac(2, 4)} of ${n} = ${A.blank(h)} &nbsp;&nbsp;&nbsp; ${F.frac(1, 2)} of ${n} = ${A.blank(h)}</div>`,
      };
    },
  });

  /* ================= Y2_NC_10 standard units; reading scales ================= */
  add({
    id: 'Y2_NC_10.scale', topics: ['Y2_NC_10'], level: 2,
    make(R) {
      if (R.chance(0.45)) {
        const [max, major, minor] = R.pick([[30, 10, 2], [40, 10, 5], [20, 5, 1], [40, 10, 2]]);
        const v = R.int(1, max / minor - 1) * minor;
        if (v % major === 0) return null;
        return {
          marks: 1, answer: `${v} °C`,
          check: () => v % minor === 0 && v > 0 && v < max,
          body: A => `<p>What temperature does the thermometer show?</p>${D.scale({ max, major, minor, level: v, unit: '°C', kind: 'thermo', height: 60 }, A)}${A.box(v, { unit: '°C', w: 20 })}`,
        };
      }
      const [max, major, minor] = R.pick([[500, 100, 50], [1000, 200, 100], [100, 20, 10], [50, 10, 5]]);
      const v = R.int(1, max / minor - 1) * minor;
      if (v % major === 0 && R.chance(0.7)) return null;
      return {
        marks: 1, answer: `${F.n(v)} ml`,
        check: () => v % minor === 0 && v < max,
        body: A => `<p>How much water is in the jug?</p>${D.scale({ max, major, minor, level: v, unit: 'ml', height: 60 }, A)}${A.box(v, { unit: 'ml', w: 22 })}`,
      };
    },
  });
  const UNITS = [['the length of a pencil', 'cm', 'm'], ['the length of a football pitch', 'm', 'cm'], ['the mass of an apple', 'g', 'kg'],
    ['the mass of a dog', 'kg', 'g'], ['the water in a cup', 'ml', 'l'], ['the water in a bath', 'l', 'ml'], ['how hot it is outside', '°C', ''],
    ['the length of a ladybird', 'cm', 'm'], ['the mass of a feather', 'g', 'kg'], ['the mass of a bag of potatoes', 'kg', 'g'], ['a spoonful of medicine', 'ml', 'l']];
  add({
    id: 'Y2_NC_10.units', topics: ['Y2_NC_10'], level: 1,
    make(R) {
      const [what, u, twin] = R.pick(UNITS);
      const kinds = [['cm', 'm'], ['g', 'kg'], ['ml', 'l'], ['°C']];
      const others = kinds.filter(k => !k.includes(u)).flat();
      const opts = R.shuffle([u, ...(twin ? [twin] : []), ...R.sample(others, twin ? 2 : 3)]);
      return {
        marks: 1, answer: u,
        check: () => opts.filter(o => kinds.find(k => k.includes(u)).includes(o)).length === (twin ? 2 : 1) && opts.includes(u),
        body: A => `<p>Circle the best unit to measure <b>${what}</b>.</p>${A.circle(opts, opts.indexOf(u))}`,
      };
    },
  });
  add({
    id: 'Y2_NC_10.ruler', topics: ['Y2_NC_10'], level: 2,
    make(R) {
      const from = R.int(1, 4), len = R.int(3, 13 - from), thing = R.pick(['ribbon', 'worm', 'stick', 'crayon', 'straw']);
      return {
        marks: 1, answer: `${len} cm`,
        guide: 'The object does not start at 0.',
        check: () => from + len <= 14 && len > 0,
        body: A => `<p>How long is the ${thing}?</p>${D.ruler({ cm: 14, from, len }, A)}${A.box(len, { unit: 'cm', w: 20 })}`,
      };
    },
  });

  /* ================= Y2_NC_11 compare and order measures ================= */
  add({
    id: 'Y2_NC_11.sign', topics: ['Y2_NC_11'], level: 1,
    make(R) {
      const f = R.int(0, 2);
      let l, r, lv, rv;
      if (f === 0) { const u = R.pick(['cm', 'kg', 'g', 'ml', 'l', 'm']); const [a, b] = R.chance(0.5) ? (() => { const [t, o] = R.ints(2, 1, 9); return [10 * t + o, 10 * o + t]; })() : R.ints(2, 2, 99); l = `${a} ${u}`; r = `${b} ${u}`; lv = a; rv = b; }
      else { const m = R.int(1, 3); const cm = R.chance(0.4) ? 100 * m : R.int(5, 35) * 10; l = `${m} m`; r = `${cm} cm`; lv = 100 * m; rv = cm; if (f === 2) { [l, r] = [r, l]; [lv, rv] = [rv, lv]; } }
      const sign = lv < rv ? '&lt;' : lv > rv ? '&gt;' : '=';
      return {
        marks: 1, answer: sign,
        guide: f ? '1 m = 100 cm.' : '',
        check: () => (sign === '=') === (lv === rv) && (sign !== '&lt;' || rv - lv > 0),
        body: A => `<p>Write <b>&lt;</b>, <b>&gt;</b> or <b>=</b> to make this correct.</p><div class="sent c">${l} ${A.blank(sign, 12)} ${r}</div>`,
      };
    },
  });
  add({
    id: 'Y2_NC_11.order', topics: ['Y2_NC_11'], level: 2,
    make(R) {
      const [what, unit, lo, hi, small, big, qual] = R.pick([
        ['are measured', 'cm', 95, 140, 'shortest', 'tallest', 'Height'],
        ['weigh their parcels', 'g', 120, 900, 'lightest', 'heaviest', 'Mass'],
        ['fill their water bottles', 'ml', 150, 750, 'least', 'most', 'Water']]);
      const names = R.names(4), vals = R.ints(4, lo, hi);
      const up = R.chance(0.6), ord = names.map((n, i) => [n, vals[i]]).sort((a, b) => up ? a[1] - b[1] : b[1] - a[1]);
      return {
        marks: 1, answer: ord.map(o => o[0]).join(', '),
        check: () => ord.every(([, v], i) => vals.filter(x => up ? x < v : x > v).length === i),
        body: A => `<p>Four children ${what}.</p>${A.table(names.map((n, i) => [n, `${vals[i]} ${unit}`]), { head: ['Name', qual] })}<p>Write the names in order. Start with the <b>${up ? small : big}</b>.</p>${A.boxes(ord.map(o => [o[0]]), { w: 22 })}`,
      };
    },
  });

  /* ================= Y2_NC_12 £ and p; combine coins ================= */
  add({
    id: 'Y2_NC_12.total', topics: ['Y2_NC_12'], level: 1,
    make(R) {
      const pounds = R.chance(0.3);
      const cs = pounds ? [...Array(R.int(2, 4))].map(() => R.pick([100, 200, 500, 1000])).sort((a, b) => b - a)
        : [...Array(R.int(3, 5))].map(() => R.pick([1, 2, 5, 10, 20, 50])).sort((a, b) => b - a);
      const tot = cs.reduce((a, b) => a + b, 0);
      if (!pounds && tot >= 100) return null;
      const fig = D.coins(cs);
      return {
        marks: 1, answer: pounds ? `£${tot / 100}` : `${tot}p`,
        check: () => K.coinSum(fig) === tot,
        body: A => `<p>How much money is there altogether?</p>${fig}${pounds ? A.box(tot / 100, { pre: '£', w: 20 }) : A.box(tot, { unit: 'p', w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y2_NC_12.which', topics: ['Y2_NC_12'], level: 2,
    make(R) {
      const sets = [0, 1, 2].map(() => [...Array(R.int(2, 4))].map(() => R.pick([1, 2, 5, 10, 20, 50])).sort((a, b) => b - a));
      const tots = sets.map(s => s.reduce((a, b) => a + b, 0));
      if (new Set(tots).size < 3 || Math.max(...tots) >= 100) return null;
      const right = R.int(0, 2), N = tots[right];
      const figs = sets.map(s => D.coins(s));
      return {
        marks: 1, answer: K.LET[right],
        check: () => figs.filter(f => K.coinSum(f) === N).length === 1,
        body: A => `<p>Tick the purse that has exactly <b>${N}p</b>.</p>${A.tick(figs.map((f, i) => K.lab(f, K.LET[i])), right, { col: true })}`,
      };
    },
  });

  /* ================= Y2_NC_13 money problems and change ================= */
  add({
    id: 'Y2_NC_13.change', topics: ['Y2_NC_13'], level: 2,
    make(R) {
      const who = R.name(), pay = R.pick([50, 100, 100]), p = R.int(pay === 50 ? 12 : 21, pay - 5), ch = pay - p;
      const thing = R.pick(['a pencil', 'a rubber', 'a lolly', 'a comic', 'a ball', 'a notebook']);
      return {
        marks: 1, answer: ch + 'p',
        check: () => p + ch === pay,
        body: A => `<p>${who} buys ${thing} for <b>${p}p</b>.</p><p>${who} pays with ${pay === 50 ? 'a 50p coin' : 'a £1 coin'}.</p><p>How much change does ${who} get?</p>${A.box(ch, { unit: 'p', w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y2_NC_13.shop', topics: ['Y2_NC_13'], level: 3,
    make(R) {
      const who = R.name(), items = R.sample(['apple', 'banana', 'juice', 'biscuit', 'yoghurt', 'pear'], 4), prices = R.ints(4, 8, 45);
      const [i, j] = R.sample([0, 1, 2, 3], 2), cost = prices[i] + prices[j], ch = 100 - cost;
      if (cost >= 100) return null;
      return {
        marks: 2, method: true, answer: ch + 'p',
        guide: `Award 1 mark for ${cost}p (the cost) or a correct method with one slip.`,
        check: () => ch + prices[j] + prices[i] === 100,
        body: A => `${A.table(items.map((it, k) => [it, prices[k] + 'p']), { head: ['Item', 'Price'] })}<p>${who} buys one <b>${items[i]}</b> and one <b>${items[j]}</b>.</p><p>${who} pays with a £1 coin. How much change does ${who} get?</p>${A.work(`${prices[i]}p + ${prices[j]}p = ${cost}p, 100p ${F.minus} ${cost}p = ${ch}p`, 24)}${A.box(ch, { unit: 'p', w: 20 })}`,
      };
    },
  });

  /* ================= Y2_NC_14 time to five minutes ================= */
  const say5 = (h, m) => m === 0 ? `${h} o'clock` : m === 15 ? `quarter past ${h}` : m === 30 ? `half past ${h}` : m === 45 ? `quarter to ${h % 12 + 1}`
    : m < 30 ? `${m} minutes past ${h}` : `${60 - m} minutes to ${h % 12 + 1}`;
  const unsay = s => {
    let m;
    if ((m = s.match(/^(\d+) o'clock$/))) return [+m[1], 0];
    if ((m = s.match(/^quarter past (\d+)$/))) return [+m[1], 15];
    if ((m = s.match(/^half past (\d+)$/))) return [+m[1], 30];
    if ((m = s.match(/^quarter to (\d+)$/))) return [(+m[1] + 10) % 12 + 1, 45];
    if ((m = s.match(/^(\d+) minutes past (\d+)$/))) return [+m[2], +m[1]];
    if ((m = s.match(/^(\d+) minutes to (\d+)$/))) return [(+m[2] + 10) % 12 + 1, 60 - +m[1]];
    return null;
  };
  add({
    id: 'Y2_NC_14.read', topics: ['Y2_NC_14'], level: 1,
    make(R) {
      const h = R.int(1, 12), m = R.int(1, 11) * 5, s = say5(h, m);
      return {
        marks: 1, answer: s,
        guide: `Accept ${h}:${String(m).padStart(2, '0')} or "${s.replace(' minutes', '')}".`,
        check: () => { const b = unsay(s); return b && b[0] === h && b[1] === m; },
        body: A => `<p>What time does the clock show?</p>${D.clock({ h, m, size: 40 }, A)}${A.box(s, { w: 58 })}`,
      };
    },
  });
  add({
    id: 'Y2_NC_14.draw', topics: ['Y2_NC_14'], level: 2,
    make(R) {
      const h = R.int(1, 12), m = R.int(1, 11) * 5, s = say5(h, m);
      return {
        marks: 1, answer: s,
        guide: 'Both hands must be correct. The hour hand may point at or just past the hour.',
        check: () => { const b = unsay(s); return b && b[0] === h && b[1] === m; },
        body: A => `<p>Draw the hands on the clock to show <b>${s}</b>.</p>${D.clock({ h, m, ans: true, size: 42 }, A)}`,
      };
    },
  });
  add({
    id: 'Y2_NC_14.tick', topics: ['Y2_NC_14'], level: 2,
    make(R) {
      const h = R.int(1, 12), m = R.pick([15, 45]);
      const times = R.shuffle([[h, m], [h, 60 - m], [h % 12 + 1, m]]);
      const right = times.findIndex(t => t[0] === h && t[1] === m);
      return {
        marks: 1, answer: K.LET[right],
        check: () => new Set(times.map(t => say5(t[0], t[1]))).size === 3,
        body: A => `<p>Tick the clock that shows <b>${say5(h, m)}</b>.</p>${A.tick(times.map((t, i) => K.lab(D.clock({ h: t[0], m: t[1], size: 34 }, A), K.LET[i])), right)}`,
      };
    },
  });

  /* ================= Y2_NC_15 minutes in an hour, hours in a day; compare intervals ================= */
  const TFACTS = [['1 hour = ', ' minutes', 60, 1, 60], ['half an hour = ', ' minutes', 30, 0.5, 60], ['1 day = ', ' hours', 24, 1, 24], ['2 hours = ', ' minutes', 120, 2, 60],
    ['a quarter of an hour = ', ' minutes', 15, 0.25, 60], ['3 hours = ', ' minutes', 180, 3, 60], ['2 days = ', ' hours', 48, 2, 24], ['1 week = ', ' days', 7, 1, 7]];
  add({
    id: 'Y2_NC_15.facts', topics: ['Y2_NC_15'], level: 1, minVariety: 7,
    make(R) {
      const [a, b, x, qty, size] = R.pick(TFACTS);
      return {
        marks: 1, answer: F.n(x) + b,
        check: () => qty * size === x,
        body: A => `<p>Write the missing number.</p><div class="sent c">${a}${A.blank(x, 16)}${b}</div>`,
      };
    },
  });
  const DUR = [[15, '15 minutes'], [20, '20 minutes'], [25, '25 minutes'], [30, 'half an hour'], [35, '35 minutes'], [40, '40 minutes'],
    [45, '45 minutes'], [50, '50 minutes'], [60, '1 hour'], [90, 'an hour and a half'], [120, '2 hours']];
  add({
    id: 'Y2_NC_15.longer', topics: ['Y2_NC_15'], level: 2,
    make(R) {
      const [n1, n2] = R.names(2), [d1, d2] = R.sample(DUR, 2), act = R.pick(['reading', 'playing outside', 'at the park', 'painting', 'swimming']);
      const long = R.chance(0.6), win = (d1[0] > d2[0]) === long ? 0 : 1;
      return {
        marks: 1, answer: [n1, n2][win],
        check: () => (long ? Math.max : Math.min)(d1[0], d2[0]) === [d1, d2][win][0],
        body: A => `<p>${n1} spends <b>${d1[1]}</b> ${act}.</p><p>${n2} spends <b>${d2[1]}</b> ${act}.</p><p>Who spends <b>${long ? 'longer' : 'less time'}</b> ${act}? Circle the name.</p>${A.circle([n1, n2], win)}`,
      };
    },
  });
  add({
    id: 'Y2_NC_15.order', topics: ['Y2_NC_15'], level: 2,
    make(R) {
      const ds = R.sample(DUR, 3), ord = ds.slice().sort((a, b) => a[0] - b[0]);
      if (ds.every((d, i) => d === ord[i])) return null;
      return {
        marks: 1, answer: ord.map(d => d[1]).join(', '),
        check: () => ord.every((d, i) => ds.filter(x => x[0] < d[0]).length === i),
        body: A => `<p>Write these times in order. Start with the <b>shortest</b>.</p><div class="sent c">${ds.map(d => d[1]).join(' &nbsp; &nbsp; ')}</div>${A.boxes(ord.map(d => [d[1]]), { w: 36 })}`,
      };
    },
  });

  /* ================= Y2_NC_16 pictograms, tally charts, block diagrams, tables ================= */
  const DATA = [['Fruit', ['apple', 'banana', 'pear', 'grapes']], ['Pets', ['cat', 'dog', 'fish', 'rabbit']], ['Colours', ['red', 'blue', 'green', 'yellow']],
    ['Sports', ['football', 'tennis', 'netball', 'running']], ['Weather', ['sunny', 'rainy', 'cloudy', 'windy']]];
  add({
    id: 'Y2_NC_16.tally', topics: ['Y2_NC_16'], level: 1,
    make(R) {
      const [title, cats] = R.pick(DATA), vals = R.ints(4, 3, 17), i = R.int(0, 3);
      const tallies = vals.map(v => K.tally(v));
      return {
        marks: 1, answer: F.n(vals[i]),
        check: () => (tallies[i].match(/<line/g) || []).length === vals[i],
        body: A => `<p>This tally chart shows the children's favourite ${title.toLowerCase()}.</p>${A.table(cats.map((c, k) => [c, tallies[k]]), { head: [title, 'Tally'] })}<p>How many children chose <b>${cats[i]}</b>?</p>${A.box(vals[i], { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y2_NC_16.picto', topics: ['Y2_NC_16'], level: 2,
    make(R) {
      const [title, cats] = R.pick(DATA), vals = R.ints(4, 1, 10).map(v => v * 2 - (R.chance(0.25) ? 1 : 0));
      const i = R.int(0, 3), draw = R.chance(0.5);
      if (draw && vals[i] < 5) return null;
      const rows = cats.map((c, k) => [c, vals[k], draw && k === i]);
      const v = vals[i], sym = `${Math.floor(v / 2)} whole circle${Math.floor(v / 2) === 1 ? '' : 's'}${v % 2 ? ' and a half circle' : ''}`;
      return {
        marks: 1, answer: draw ? sym : F.n(v),
        guide: draw ? 'Accept any clear symbols of the right number.' : '',
        check: () => Math.floor(v / 2) * 2 + v % 2 === v && v > 0,
        body: A => `<p>This pictogram shows the children's favourite ${title.toLowerCase()}.</p>${D.pictogram({ rows, per: 2, unit: 'child' }, A).replace('2 childs', '2 children')}`
          + (draw ? `<p><b>${v}</b> children chose ${cats[i]}. Draw this on the pictogram.</p>` : `<p>How many children chose <b>${cats[i]}</b>?</p>${A.box(v, { w: 20 })}`),
      };
    },
  });
  add({
    id: 'Y2_NC_16.block', topics: ['Y2_NC_16'], level: 2,
    make(R) {
      const [title, cats] = R.pick(DATA), vals = R.ints(4, 1, 9), [i, j] = R.sample([0, 1, 2, 3], 2).sort();
      const caps = cats.map(c => c[0].toUpperCase() + c.slice(1));
      return {
        marks: 1, answer: `${caps[i]} ${vals[i]}, ${caps[j]} ${vals[j]}`,
        guide: 'Both numbers must be correct.',
        check: () => { const fig = D.barChart({ cats: caps, vals, step: 1, max: 10, width: 110, height: 50 }); const hs = [...fig.matchAll(/height="([\d.]+)" class="bar"/g)].map(m => Math.round(+m[1] / 5)); return hs[i] === vals[i] && hs[j] === vals[j]; },
        body: A => `<p>This block diagram shows the children's favourite ${title.toLowerCase()}.</p>${D.barChart({ cats: caps, vals, step: 1, max: 10, ylab: 'Children', width: 110, height: 50 }, A)}<p>Complete the table.</p>${A.table(caps.map((c, k) => [c, k === i || k === j ? { a: vals[k] } : vals[k]]), { head: [title, 'Number of children'] })}`,
      };
    },
  });

  /* ================= Y2_NC_17 counting, totalling, comparing data ================= */
  add({
    id: 'Y2_NC_17.more', topics: ['Y2_NC_17'], level: 2,
    make(R) {
      const [title, cats] = R.pick(DATA), vals = R.ints(4, 1, 9).map(v => v * 2), [i, j] = R.sample([0, 1, 2, 3], 2);
      const caps = cats.map(c => c[0].toUpperCase() + c.slice(1));
      const [b, s] = vals[i] > vals[j] ? [i, j] : [j, i], d = vals[b] - vals[s];
      return {
        marks: 1, answer: F.n(d),
        check: () => vals[s] + d === vals[b],
        body: A => `<p>This bar chart shows the children's favourite ${title.toLowerCase()}.</p>${D.barChart({ cats: caps, vals, step: 2, max: 20, ylab: 'Children', width: 110, height: 55 }, A)}<p>How many more children chose <b>${caps[b]}</b> than <b>${caps[s]}</b>?</p>${A.box(d, { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y2_NC_17.total', topics: ['Y2_NC_17'], level: 2,
    make(R) {
      const [title, cats] = R.pick(DATA), vals = R.ints(4, 2, 12), f = R.int(0, 1);
      const tot = vals.reduce((a, b) => a + b, 0);
      const caps = cats.map(c => c[0].toUpperCase() + c.slice(1));
      const least = vals.indexOf(Math.min(...vals));
      return {
        marks: 1, answer: f ? caps[least] : F.n(tot),
        check: () => f ? vals.every((v, k) => k === least || v > vals[least]) : tot - vals[0] - vals[1] - vals[2] === vals[3],
        body: A => `<p>The table shows the children's favourite ${title.toLowerCase()}.</p>${A.table(caps.map((c, k) => [c, vals[k]]), { head: [title, 'Number of children'] })}`
          + (f ? `<p>Which was the <b>least</b> popular? Circle one.</p>${A.circle(caps, least)}` : `<p>How many children are there altogether?</p>${A.box(tot, { w: 20 })}`),
      };
    },
  });

  /* ================= Y2_NC_18 2D shapes on the faces of 3D shapes ================= */
  const FACES = { cube: { square: 6 }, cuboid: { rectangle: 6 }, cylinder: { circle: 2 }, cone: { circle: 1 }, sqpyramid: { square: 1, triangle: 4 }, tripyramid: { triangle: 4 }, triprism: { triangle: 2, rectangle: 3 } };
  const FACECOUNT = { cube: 6, cuboid: 6, cylinder: 2, cone: 1, sqpyramid: 5, tripyramid: 4, triprism: 5 };
  const SNAME = { cube: 'cube', cuboid: 'cuboid', cylinder: 'cylinder', cone: 'cone', sqpyramid: 'square-based pyramid', tripyramid: 'triangle-based pyramid', triprism: 'triangular prism' };
  const icon = nm => {
    const p = { square: [[1, 1], [13, 1], [13, 13], [1, 13]], rectangle: [[1, 3], [17, 3], [17, 11], [1, 11]], triangle: [[1, 13], [15, 13], [8, 1]] }[nm];
    return nm === 'circle' ? D.svg(16, 16, circ(8, 8, 6.5, 'shape')) : D.svg(Math.max(...p.map(q => q[0])) + 1, 15, D.poly(p, 'shape'));
  };
  add({
    id: 'Y2_NC_18.faces', topics: ['Y2_NC_18'], level: 2, minVariety: 7,
    make(R) {
      const s = R.pick(Object.keys(FACES)), shapes = ['square', 'rectangle', 'triangle', 'circle'];
      const right = shapes.map((n, i) => FACES[s][n] ? i : -1).filter(i => i >= 0);
      const k = right.length;
      return {
        marks: 1, answer: right.map(i => shapes[i]).join(' and '),
        guide: k > 1 ? 'Both ticks needed, and no others.' : '',
        check: () => Object.values(FACES[s]).reduce((a, b) => a + b, 0) === FACECOUNT[s] && k >= 1,
        body: A => `<p>This is a <b>${SNAME[s]}</b>.</p>${D.solid(s, 26)}<p>Tick the shape${k > 1 ? 's' : ''} of its ${s === 'cylinder' || s === 'cone' ? 'flat ' : ''}faces. (Tick ${k}.)</p>${A.tick(shapes.map(n => K.lab(icon(n), n)), right)}`,
      };
    },
  });
  const DESC = s => Object.entries(FACES[s]).map(([n, c]) => `${c} ${n}${c > 1 ? 's' : ''}`).join(' and ');
  add({
    id: 'Y2_NC_18.which', topics: ['Y2_NC_18'], level: 2,
    make(R) {
      const s = R.pick(['cube', 'sqpyramid', 'tripyramid', 'triprism', 'cylinder', 'cuboid']), who = R.name();
      const opts = R.shuffle([s, ...R.sample(Object.keys(FACES).filter(x => x !== s && DESC(x) !== DESC(s)), 2)]);
      const right = opts.indexOf(s);
      return {
        marks: 1, answer: SNAME[s],
        check: () => opts.filter(o => DESC(o) === DESC(s)).length === 1,
        body: A => `<p>${who} draws round every ${s === 'cylinder' ? 'flat ' : ''}face of a 3D shape.</p><p>${who} draws <b>${DESC(s)}</b>.</p><p>Which 3D shape is it? Tick one.</p>${A.tick(opts.map((o, i) => K.lab(D.solid(o, 22), K.LET[i])), right)}`,
      };
    },
  });

  /* ================= Y2_NC_19 position, movement and turns ================= */
  const TURN2 = [[1, 'a quarter turn clockwise'], [3, 'a quarter turn anticlockwise'], [2, 'a half turn'], [3, 'a three-quarter turn clockwise'],
    [1, 'a three-quarter turn anticlockwise'], [1, 'clockwise through 1 right angle'], [2, 'clockwise through 2 right angles'], [1, 'anticlockwise through 3 right angles'], [3, 'anticlockwise through 1 right angle']];
  const DIRW = ['up', 'right', 'down', 'left'];
  add({
    id: 'Y2_NC_19.turn', topics: ['Y2_NC_19'], level: 2,
    make(R) {
      const s = R.int(0, 3), [k, w] = R.pick(TURN2), end = (s + k) % 4;
      const deg = (w.includes('anticlockwise') ? -1 : 1) * (w.includes('half') ? 180 : w.includes('three') ? 270 : w.includes('right angle') ? 90 * +w.match(/(\d) right/)[1] : 90);
      return {
        marks: 1, answer: `${K.LET[end]} (pointing ${DIRW[end]})`,
        check: () => (((s * 90 + deg) % 360) + 360) % 360 / 90 === end,
        body: A => `<p>This arrow is pointing ${DIRW[s]}.</p>${K.arrow(s, 14)}<p>It turns <b>${w}</b>. Tick where it points now.</p>${A.tick([0, 1, 2, 3].map(d => K.lab(K.arrow(d, 12), K.LET[d])), end)}`,
      };
    },
  });
  add({
    id: 'Y2_NC_19.route', topics: ['Y2_NC_19'], level: 2,
    make(R) {
      const C = 5, Rw = 4, c = 13;
      const cells = R.sample([...Array(C * Rw).keys()], 6);
      const start = cells[0], kinds = ['ball', 'apple', 'flower', 'heart', 'fish'], place = cells.slice(1);
      const tgt = R.int(0, 4);
      const sx = start % C, sy = Math.floor(start / C), tx = place[tgt] % C, ty = Math.floor(place[tgt] / C);
      const dx = tx - sx, dy = ty - sy;
      if (dx === 0 || dy === 0) return null;
      let s = '';
      for (let y = 0; y < Rw; y++) for (let x = 0; x < C; x++) s += D.box(1 + x * c, 1 + y * c, c, c);
      s += K.pic('star', 1 + sx * c + c / 2, 1 + sy * c + c / 2, 9, 'shaded');
      place.forEach((p, i) => s += K.pic(kinds[i], 1 + (p % C) * c + c / 2, 1 + Math.floor(p / C) * c + c / 2, 9));
      const ins = `${Math.abs(dx)} square${Math.abs(dx) > 1 ? 's' : ''} ${dx > 0 ? 'right' : 'left'} and ${Math.abs(dy)} square${Math.abs(dy) > 1 ? 's' : ''} ${dy > 0 ? 'down' : 'up'}`;
      return {
        marks: 1, answer: `the ${kinds[tgt]}`,
        guide: 'Accept the name or a drawing of the picture.',
        check: () => { let x = sx, y = sy; for (let i = 0; i < Math.abs(dx); i++) x += Math.sign(dx); for (let i = 0; i < Math.abs(dy); i++) y += Math.sign(dy); return place.indexOf(y * C + x) === tgt; },
        body: A => `${D.svg(C * c + 2, Rw * c + 2, s)}<p>Start on the grey star. Move <b>${ins}</b>.</p><p>Which picture do you land on?</p>${A.line(kinds[tgt], 40)}`,
      };
    },
  });

  /* ================= Y2_NC_20 patterns and sequences of shapes ================= */
  const PSH = {
    circle: (x, y) => circ(x, y, 4, 'cnt'), square: (x, y) => D.box(x - 4, y - 4, 8, 8, 'shaded'),
    triangle: (x, y) => D.poly([[x - 4.5, y + 4], [x + 4.5, y + 4], [x, y - 4.5]], 'shape'), star: (x, y) => K.pic('star', x, y, 9, 'cnt'),
  };
  const patFig = (seq, q) => D.svg(seq.length * 11 + (q ? 11 : 0) + 2, 12, seq.map((n, i) => PSH[n](6 + i * 11, 6)).join('') + (q ? D.txt(6 + seq.length * 11, 7.5, '?', { size: 6, bold: true }) : ''));
  add({
    id: 'Y2_NC_20.next', topics: ['Y2_NC_20'], level: 2,
    make(R) {
      const L = R.int(2, 3), unit = R.sample(Object.keys(PSH), L);
      if (L === 3 && R.chance(0.3)) unit[2] = unit[0];   // e.g. circle, square, circle
      const shown = R.int(6, 8), seq = [...Array(shown).keys()].map(i => unit[i % L]);
      const far = R.chance(0.4), pos = far ? R.int(10, 15) : shown + 1, ans = unit[(pos - 1) % L];
      const opts = [...new Set(Object.keys(PSH))];
      return {
        marks: 1, answer: ans,
        check: () => seq.every((n, i) => n === seq[i % L]) && ans === seq[(pos - 1) % L],
        body: A => `<p>Here is a repeating pattern.</p>${patFig(seq, !far)}<p>${far ? `What will the <b>${pos}th</b> shape be?` : 'What comes next?'} Circle one.</p>${A.circle(opts.map(o => K.lab(patFig([o], false), o)), opts.indexOf(ans))}`,
      };
    },
  });
  add({
    id: 'Y2_NC_20.grow', topics: ['Y2_NC_20'], level: 2,
    make(R) {
      const a = R.int(1, 3), st = R.int(1, 3), p = R.pick([4, 5]), ans = a + st * (p - 1);
      if (a === 1 && st === 1) return null;
      const hs = [a, a + st, a + 2 * st];
      const fig = K.towers(hs, ['1', '2', '3'], 5, 14);
      const cnt = i => (fig.match(new RegExp(`data-t="${i}"`, 'g')) || []).length;
      return {
        marks: 1, answer: F.n(ans),
        check: () => cnt(2) + (cnt(1) - cnt(0)) * (p - 3) === ans,
        body: A => `<p>Here is a growing pattern of squares.</p>${fig}<p>How many squares will there be in pattern <b>${p}</b>?</p>${A.box(ans, { w: 20 })}`,
      };
    },
  });
})();
