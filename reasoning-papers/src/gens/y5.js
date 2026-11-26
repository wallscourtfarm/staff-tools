/* Year 5 question generators. Topic ids from src/topics.json (Y5). See src/GENERATORS.md.
 * Work is done in whole numbers (tenths, hundredths, thousandths, pence, grams) and divided only to display.
 */
(function () {
  const { F, D } = RP;
  const add = RP.add;

  /* ---------- local helpers ---------- */
  // number shown from a whole count of 10^-dp units, e.g. dec(237, 2) = 2.37
  const dec = (k, dp) => F.n(k / Math.pow(10, dp));
  // read a displayed number back (commas and proper minus allowed)
  const num = s => +String(s).replace(/,/g, '').replace('−', '-');
  const isPrime = n => { if (n < 2) return false; for (let k = 2; k * k <= n; k++) if (n % k === 0) return false; return true; };
  const simp = (n, d) => { const g = F.gcd(n, d); return [n / g, d / g]; };
  // fraction n/d as HTML: simplified, improper shown as a mixed number, whole numbers plain
  function fr(n, d, keep) {
    if (!keep) [n, d] = simp(n, d);
    if (n % d === 0) return F.n(n / d);
    const w = Math.floor(n / d), r = n % d;
    return w ? F.mixed(w, r, d) : F.frac(r, d);
  }
  // fraction as plain text for answers (e.g. 2 1/4)
  function frT(n, d) {
    [n, d] = simp(n, d);
    if (n % d === 0) return F.n(n / d);
    const w = Math.floor(n / d), r = n % d;
    return w ? F.mixed(w, r, d) : F.frac(r, d);
  }
  const sameFrac = (a, b, c, d) => a * d === b * c;
  const lt = '&lt;', gt = '&gt;';
  const cmpSym = (a, b) => a < b ? lt : a > b ? gt : '=';

  // number in words (British: "and"), up to 1,000,000
  const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const u100 = x => x < 20 ? ONES[x] : TENS[Math.floor(x / 10)] + (x % 10 ? '-' + ONES[x % 10] : '');
  const u1000 = x => { const h = Math.floor(x / 100), r = x % 100; return (h ? ONES[h] + ' hundred' : '') + (h && r ? ' and ' : '') + (r ? u100(r) : ''); };
  function words(n) {
    if (n === 1000000) return 'one million';
    const th = Math.floor(n / 1000), r = n % 1000;
    let s = th ? u1000(th) + ' thousand' : '';
    if (r) s += (th ? (r < 100 ? ' and ' : ', ') : '') + u1000(r);
    return s;
  }
  // words back to a number (used by check())
  function unwords(s) {
    const map = {}; ONES.forEach((w, i) => { if (w) map[w] = i; }); TENS.forEach((w, i) => { if (w) map[w] = i * 10; });
    let total = 0, cur = 0;
    for (const t of s.replace(/,/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean)) {
      if (t === 'and') continue;
      if (t === 'hundred') cur *= 100;
      else if (t === 'thousand') { total += cur * 1000; cur = 0; }
      else if (t === 'million') { total += cur * 1000000; cur = 0; }
      else cur += map[t];
    }
    return total + cur;
  }
  // Roman numerals back to a number (used by check())
  function unroman(s) {
    const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let t = 0;
    for (let i = 0; i < s.length; i++) { const a = v[s[i]], b = v[s[i + 1]] || 0; t += a < b ? -a : a; }
    return t;
  }
  // polygon area (shoelace) and perimeter for grid points
  const area = pts => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const perim = pts => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);

  /* ======================= Number and place value ======================= */

  // Y5_004 tenths and hundredths; each place is 10 times the one to its right
  add({
    id: 'Y5_004.convert', topics: ['Y5_004'], level: 1,
    make(R) {
      const f = R.int(0, 4);
      let left, right, ans, val; // val: value of the given side in hundredths, ans in its unit
      if (f === 0) { const k = R.intNot(11, 79, [20, 30, 40, 50, 60, 70]); ans = k; left = dec(k, 1); right = 'tenths'; val = k * 10; return mk(left, right, ans, () => ans * 10 === val); }
      if (f === 1) { let k = R.int(101, 499); if (k % 10 === 0) k += 3; ans = k; left = dec(k, 2); right = 'hundredths'; val = k; return mk(left, right, ans, () => Math.round(num(left) * 100) === ans); }
      if (f === 2) { const a = R.int(2, 9); ans = a * 10; left = `${a} tenths`; right = 'hundredths'; return mk(left, right, ans, () => ans / 10 === a); }
      if (f === 3) { const b = R.int(2, 9) * 10; ans = b / 10; left = `${b} hundredths`; right = 'tenths'; return mk(left, right, ans, () => ans * 10 === b); }
      const k = R.int(11, 69); if (k % 10 === 0) return null;
      ans = k; left = `${dec(k, 2)}`; right = 'hundredths'; return mk(left, right, ans, () => Math.round(num(left) * 100) === k);
      function mk(l, r, a, chk) {
        return {
          marks: 1, answer: F.n(a), check: chk,
          body: A => `<p>Write the missing number.</p><div class="sent c">${l} = ${A.blank(a, 16)} ${r}</div>`,
        };
      }
    },
  });
  add({
    id: 'Y5_004.times-bigger', topics: ['Y5_004'], level: 2,
    make(R) {
      const d = R.int(1, 9);
      const others = R.sample([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => x !== d), 4);
      // places: 0 tens, 1 ones, 2 tenths, 3 hundredths
      const i = R.int(0, 2), j = i + R.int(1, Math.min(2, 3 - i));
      const dig = others.slice(); dig[i] = d; dig[j] = d;
      const s = `${dig[0]}${dig[1]}.${dig[2]}${dig[3]}`;
      const worth = k => d * Math.pow(10, 3 - k);   // in hundredths
      const ans = worth(i) / worth(j);
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans * worth(j) === worth(i) && s.split('').filter(c => c === String(d)).length === 2,
        body: A => `<p>Look at the number <b>${s}</b>.</p><p>How many times greater is the value of the first digit ${d} than the value of the second digit ${d}?</p>${A.box(ans, { unit: 'times' })}`,
      };
    },
  });
  add({
    id: 'Y5_004.true-false', topics: ['Y5_004'], level: 2,
    make(R) {
      // each maker returns [text, lhs, rhs] in hundredths
      const makers = [
        t => { const a = R.int(2, 9); return t ? [`${a} tenths = ${a * 10} hundredths`, a * 10, a * 10] : [`${a} tenths = ${a} hundredths`, a * 10, a]; },
        t => { const b = R.intNot(11, 99, [20, 30, 40, 50, 60, 70, 80, 90]); return t ? [`${b} hundredths = ${dec(b, 2)}`, b, b] : [`${b} hundredths = ${dec(b, 1)}`, b, b * 10]; },
        t => t ? [R.pick(['10 tenths = 1', '100 hundredths = 1']), 100, 100] : [R.pick(['100 tenths = 1', '10 hundredths = 1']), R.pick([1000, 10]), 100],
        t => { const a = R.int(2, 9); return t ? [`${dec(a, 1)} = ${a} tenths`, a * 10, a * 10] : [`${dec(a, 1)} = ${a} hundredths`, a * 10, a]; },
        t => { const a = R.int(2, 9); return t ? [`${a * 10} hundredths = ${a} tenths`, a * 10, a * 10] : [`${a} hundredths = ${a} tenths`, a, a * 10]; },
      ];
      const pick = R.sample([0, 1, 2, 3, 4], 4), truth = R.shuffle([true, true, false, false]);
      const st = pick.map((k, i) => makers[k](truth[i]));
      const right = truth.map((t, i) => t ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => st[i][0]).join('; '),
        check: () => st.every((s, i) => (s[1] === s[2]) === truth[i]),
        body: A => `<p>Tick the <b>two</b> statements that are true.</p>${A.tick(st.map(s => s[0]), right, { col: true })}`,
      };
    },
  });

  // Y5_005 value of each digit (2 dp); standard and non-standard partitioning
  add({
    id: 'Y5_005.digit-value', topics: ['Y5_005'], level: 1,
    make(R) {
      const ds = R.ints(4, 1, 9), N = ds[0] * 1000 + ds[1] * 100 + ds[2] * 10 + ds[3];  // hundredths
      const k = R.int(0, 3), d = ds[k];
      const val = [d * 1000, d * 100, d * 10, d][k];
      const opts = R.shuffle([d * 1000, d * 100, d * 10, d]);
      const s = dec(N, 2);
      return {
        marks: 1, answer: dec(val, 2),
        check: () => s.replace('.', '')[k] === String(d) && opts.includes(val),
        body: A => `<p>What is the value of the digit <b>${d}</b> in <b>${s}</b>?</p><p>Circle your answer.</p>${A.circle(opts.map(o => dec(o, 2)), opts.indexOf(val))}`,
      };
    },
  });
  add({
    id: 'Y5_005.partition', topics: ['Y5_005'], level: 1,
    make(R) {
      const t = R.int(1, 9), o = R.int(1, 9), a = R.int(1, 9), b = R.int(1, 9);
      const parts = [t * 1000, o * 100, a * 10, b], N = parts.reduce((x, y) => x + y, 0);
      const hide = R.int(1, 3);
      return {
        marks: 1, answer: dec(parts[hide], 2),
        check: () => Math.round(num(dec(N, 2)) * 100) === parts[0] + parts[1] + parts[2] + parts[3],
        body: A => `<p>Write the missing number.</p><div class="sent c">${dec(N, 2)} = ${parts.map((p, i) => i === hide ? A.blank(dec(p, 2), 16) : dec(p, 2)).join(' + ')}</div>`,
      };
    },
  });
  add({
    id: 'Y5_005.non-standard', topics: ['Y5_005'], level: 2,
    make(R) {
      const who = R.name();
      const o = R.int(2, 9), a = R.int(2, 9), b = R.int(1, 9), N = o * 100 + a * 10 + b;
      const f = R.int(0, 2);
      const known = [[(o - 1) * 100, b], [o * 100, (a - 1) * 10], [(o - 1) * 100, a * 10]][f];
      const miss = N - known[0] - known[1];
      const shown = [dec(known[0], 2), dec(known[1], 2)];
      return {
        marks: 1, answer: dec(miss, 2),
        check: () => miss > 0 && Math.round((num(shown[0]) + num(shown[1]) + miss / 100) * 100) === N,
        body: A => `<p>${who} partitions ${dec(N, 2)} like this.</p><div class="sent c">${dec(N, 2)} = ${shown[0]} + ${A.blank(dec(miss, 2), 16)} + ${shown[1]}</div><p>Write the missing number.</p>`,
      };
    },
  });

  // Y5_006 number lines to 2 dp; whole numbers and tenths either side; rounding
  add({
    id: 'Y5_006.arrow', topics: ['Y5_006'], level: 2,
    make(R) {
      const fine = R.chance(0.5);
      let lo, V; // lo in hundredths
      if (!fine) { lo = R.int(0, 9) * 100; V = lo + R.int(1, 9) * 10; }
      else { lo = R.int(0, 9) * 100 + R.int(0, 9) * 10; V = lo + R.int(1, 9); }
      const span = fine ? 10 : 100;
      return {
        marks: 1, answer: dec(V, 2),
        check: () => V > lo && V < lo + span,
        body: A => `<p>What number is the arrow pointing to?</p>${D.numberLine({ min: lo / 100, max: (lo + span) / 100, minor: span / 1000, major: span / 100, labels: 'major', fmt: v => F.n(v), width: 150, marks: [{ v: V / 100, box: true, ansText: dec(V, 2) }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y5_006.round', topics: ['Y5_006'], level: 2,
    make(R) {
      const N = R.int(101, 2999);   // hundredths
      const a = Math.floor(N / 10) % 10, b = N % 10;
      if (b === 0 || b === 5) return null;
      const whole = Math.round(N / 100), tenth = Math.round(N / 10);
      if (tenth % 10 === 0) return null;
      return {
        marks: 1, answer: `${F.n(whole)} and ${dec(tenth, 1)}`,
        guide: 'Both needed for the mark.',
        check: () => Math.abs(N - whole * 100) < 50 && Math.abs(N - tenth * 10) < 5 && a >= 0,
        body: A => `<p>Round <b>${dec(N, 2)}</b></p>${A.table([['to the nearest whole number', { a: F.n(whole) }], ['to the nearest tenth', { a: dec(tenth, 1) }]])}`,
      };
    },
  });
  add({
    id: 'Y5_006.either-side', topics: ['Y5_006'], level: 1,
    make(R) {
      const N = R.int(101, 999); if (N % 10 === 0) return null;
      const tenths = R.chance(0.5);
      const lo = tenths ? Math.floor(N / 10) * 10 : Math.floor(N / 100) * 100, hi = lo + (tenths ? 10 : 100);
      const f = v => tenths ? dec(v / 10, 1) : F.n(v / 100);
      return {
        marks: 1, answer: `${f(lo)} and ${f(hi)}`,
        check: () => lo < N && N < hi,
        body: A => `<p>Write the ${tenths ? 'tenths' : 'whole numbers'} that come just before and just after <b>${dec(N, 2)}</b>.</p><div class="sent c">${A.blank(f(lo), 18)} &lt; ${dec(N, 2)} &lt; ${A.blank(f(hi), 18)}</div>`,
      };
    },
  });

  // Y5_007 split 1 into 2, 4, 5, 10 parts; read scales in 0.5, 0.25, 0.2, 0.1
  add({
    id: 'Y5_007.line', topics: ['Y5_007'], level: 2,
    make(R) {
      const k = R.pick([2, 4, 5, 10]), M = R.int(1, 3) + (k === 10 ? 0 : 1);
      const j = R.int(1, M * k - 1); if (j % k === 0) return null;
      const V = j * 100 / k;   // hundredths
      return {
        marks: 1, answer: dec(V, 2),
        check: () => Number.isInteger(V) && V * k === j * 100,
        body: A => `<p>What number is the arrow pointing to?</p>${D.numberLine({ min: 0, max: M, minor: 1 / k, major: 1, labels: 'major', width: 150, marks: [{ v: V / 100, box: true, ansText: dec(V, 2) }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y5_007.jug', topics: ['Y5_007'], level: 2,
    make(R) {
      const k = R.pick([4, 5, 10]), max = R.pick([1, 2]);
      const j = R.int(1, max * k - 1); if (j % k === 0) return null;
      const V = j * 100 / k;
      return {
        marks: 1, answer: dec(V, 2) + ' litres',
        check: () => Math.abs(V / 100 * k - j) < 1e-9,
        body: A => `<p>How much water is in the jug?</p>${D.scale({ max, major: 1, minor: 1 / k, level: V / 100, unit: 'litres', height: 50 }, A)}${A.box(dec(V, 2), { unit: 'litres' })}`,
      };
    },
  });
  add({
    id: 'Y5_007.parts', topics: ['Y5_007'], level: 1,
    make(R) {
      const k = R.pick([2, 4, 5, 10]), step = 100 / k, f = R.int(0, 2);
      const ans = f === 2 ? k : dec(step, 2);
      return {
        marks: 1, answer: F.n(f === 2 ? k : step / 100),
        check: () => step * k === 100,
        body: A => [`<p>1 is split into ${k} equal parts. Write the size of each part as a decimal.</p>${A.box(ans, { w: 24 })}`,
          `<p>Write the missing number.</p><div class="sent c">${k} ${F.times} ${A.blank(ans, 16)} = 1</div>`,
          `<p>How many lots of <b>${dec(step, 2)}</b> make 1?</p>${A.box(ans, { w: 24 })}`][f],
      };
    },
  });

  /* ======================= Number facts ======================= */

  // Y5_009 all multiplication facts in ×, ÷ and fraction calculations
  add({
    id: 'Y5_009.missing', topics: ['Y5_009'], level: 1,
    make(R) {
      const t = R.pick([6, 7, 8, 9, 11, 12]), k = R.int(3, 12), p = t * k, f = R.int(0, 4);
      return {
        marks: 1, answer: F.n(f === 4 ? k : k),
        check: () => p / t === k,
        body: A => {
          const b = A.blank(k);
          const s = [`${b} ${F.times} ${t} = ${p}`, `${t} ${F.times} ${b} = ${p}`, `${p} ${F.div} ${t} = ${b}`, `${p} ${F.div} ${b} = ${t}`, `${F.frac(1, t)} of ${p} = ${b}`][f];
          return `<p>Write the missing number.</p><div class="sent c">${s}</div>`;
        },
      };
    },
  });
  add({
    id: 'Y5_009.compare', topics: ['Y5_009'], level: 2,
    make(R) {
      const a = R.int(3, 12), b = R.int(3, 12), c = R.intNot(3, 12, [a, b]);
      const d = Math.max(2, Math.min(12, Math.round(a * b / c) + R.int(-1, 1)));
      if (Math.abs(a * b - c * d) > 8 || d === a || d === b) return null;
      const s = cmpSym(a * b, c * d);
      return {
        marks: 1, answer: s,
        check: () => (s === '=') === (a * b === c * d) && (s === lt) === (a * b < c * d),
        body: A => `<p>Write &lt;, &gt; or = to make this correct.</p><div class="sent c">${a} ${F.times} ${b} ${A.blank(s, 12)} ${c} ${F.times} ${d}</div>`,
      };
    },
  });
  add({
    id: 'Y5_009.word', topics: ['Y5_009'], level: 2,
    make(R) {
      const t = R.pick([6, 7, 8, 9, 12]), k = R.int(4, 12), n = t * k;
      const [l1, q, unit] = R.pick([
        [`Eggs are packed in boxes of ${t}.`, `How many boxes are needed for ${n} eggs?`, 'boxes'],
        [`Chairs are put out in rows of ${t}.`, `How many rows are needed for ${n} chairs?`, 'rows'],
        [`A pack has ${t} pencils.`, `How many packs make ${n} pencils?`, 'packs'],
        [`A minibus seats ${t} people.`, `How many minibuses are needed for ${n} people if every seat is full?`, 'minibuses'],
      ]);
      return {
        marks: 1, answer: F.n(k),
        check: () => k * t === n,
        body: A => `<p>${l1}</p><p>${q}</p>${A.box(k, { unit })}`,
      };
    },
  });

  // Y5_010 known facts with tenths and hundredths
  add({
    id: 'Y5_010.calc', topics: ['Y5_010'], level: 1,
    make(R) {
      const a = R.int(2, 9), b = R.int(3, 9), f = R.int(0, 3);
      const dp = f % 2 === 0 ? 1 : 2, p = a * b;
      let left, ans;
      if (f < 2) { left = `${dec(a, dp)} ${F.times} ${b}`; ans = dec(p, dp); }
      else { left = `${dec(p, dp)} ${F.div} ${b}`; ans = dec(a, dp); }
      return {
        marks: 1, answer: ans,
        check: () => f < 2 ? Math.round(num(ans) * 100) === p * (dp === 1 ? 10 : 1) : Math.round(num(ans) * b * Math.pow(10, dp)) === p,
        body: A => `<p>Work out</p><div class="sent c">${left} = ${A.blank(ans, 18)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_010.use-fact', topics: ['Y5_010'], level: 2,
    make(R) {
      const who = R.name();
      const a = R.int(3, 9), b = R.int(3, 9), p = a * b;
      const q1 = dec(p, 1), q2 = dec(a, 2);
      return {
        marks: 2, answer: `(a) ${q1} (b) ${q2}`, guide: '1 mark for each part.',
        check: () => Math.round(num(q1) * 10) === a * b && Math.round(num(q2) * 100 * b) === p,
        body: A => `<p>${who} knows that <b>${a} ${F.times} ${b} = ${p}</b>.</p><p>Use this fact to work out:</p>
          ${A.part('a', `<div class="sent">${dec(a, 1)} ${F.times} ${b} = ${A.blank(q1, 18)}</div>`)}
          ${A.part('b', `<div class="sent">${dec(p, 2)} ${F.div} ${b} = ${A.blank(q2, 18)}</div>`)}`,
      };
    },
  });
  add({
    id: 'Y5_010.mistake', topics: ['Y5_010'], level: 2,
    make(R) {
      const a = R.int(2, 9), b = R.int(3, 9), p = a * b, who = R.name();
      if (p < 10) return null;
      const right = dec(p, 1), wrong = dec(p, 2);
      return {
        marks: 1, answer: right,
        guide: `Accept an explanation that ${dec(a, 1)} is ${a} tenths, so the answer is ${p} tenths = ${right}.`,
        check: () => Math.round(num(right) * 10) === a * b && right !== wrong,
        body: A => `<p>${who} says,</p><div class="sent c">${dec(a, 1)} ${F.times} ${b} = ${wrong}</div><p>Explain the mistake and write the correct answer.</p>${A.explain(`${dec(a, 1)} is ${a} tenths. ${a} tenths ${F.times} ${b} = ${p} tenths, which is ${right}, not ${wrong}.`, 3)}`,
      };
    },
  });

  // Y5_011 multiply and divide by 10 and 100, including decimal answers
  add({
    id: 'Y5_011.calc', topics: ['Y5_011'], level: 1,
    make(R) {
      const f = R.pick([10, 100]), mul = R.chance(0.5);
      let s;   // start in hundredths
      if (mul) s = R.pick([R.int(11, 99) * 10, R.int(101, 999)]);
      else s = R.pick([R.int(11, 99) * 100, R.int(101, 999) * 100, R.int(11, 99) * 10]);
      const r = mul ? s * f : s / f;
      if (!Number.isInteger(r) || r === s) return null;
      if (!mul && r % 1 !== 0) return null;
      const op = mul ? F.times : F.div;
      const missStart = R.chance(0.3);
      return {
        marks: 1, answer: missStart ? dec(s, 2) : dec(r, 2),
        check: () => mul ? r / f === s : r * f === s,
        body: A => `<p>Write the missing number.</p><div class="sent c">${missStart ? A.blank(dec(s, 2), 20) : dec(s, 2)} ${op} ${f} = ${missStart ? dec(r, 2) : A.blank(dec(r, 2), 20)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_011.machine', topics: ['Y5_011'], level: 2,
    make(R) {
      const ops = R.pick([[[F.times, 10], [F.div, 100]], [[F.div, 10], [F.times, 100]], [[F.div, 100], [F.times, 10]], [[F.div, 10], [F.div, 10]], [[F.times, 100], [F.div, 1000]]]);
      let s = R.int(12, 999) * 10;  // thousandths
      let v = s;
      for (const [o, k] of ops) v = o === F.times ? v * k : v / k;
      if (!Number.isInteger(v) || v % 10 !== 0 || v === s) return null;
      const back = R.chance(0.4);
      const show = x => dec(x, 3);
      const cell = t => `<span style="display:inline-block;border:.4mm solid #000;padding:1.5mm 3mm;margin:0 1mm">${t}</span>`;
      return {
        marks: 1, answer: back ? show(s) : show(v),
        check: () => { let w = v; for (const [o, k] of ops.slice().reverse()) w = o === F.times ? w / k : w * k; return Math.abs(w - s) < 1e-9; },
        body: A => `<p>Here is a function machine.</p><div class="sent c">${back ? A.blank(show(s), 20) : show(s)} → ${cell(ops[0].join(' '))} → ${cell(ops[1].join(' '))} → ${back ? show(v) : A.blank(show(v), 20)}</div><p>Write the missing number.</p>`,
      };
    },
  });
  add({
    id: 'Y5_011.word', topics: ['Y5_011'], level: 2,
    make(R) {
      const f = R.int(0, 2);
      if (f === 0) {
        const w = R.int(21, 99) * 10, n = R.pick([10, 100]);   // w grams for n sheets, answer w/n g
        const t10 = w * 10 / n, ans = t10 / 10;
        return { marks: 1, answer: F.n(ans) + ' g', check: () => Number.isInteger(t10) && t10 * n === w * 10,
          body: A => `<p>${F.n(n)} sheets of card weigh <b>${F.n(w)} g</b> altogether.</p><p>Each sheet weighs the same. How much does one sheet weigh?</p>${A.box(F.n(ans), { unit: 'g' })}` };
      }
      if (f === 1) {
        const p = R.int(12, 95) * 10;   // pence for 10 pens
        const each = p / 10;
        return { marks: 1, answer: F.money(each, true), check: () => each * 10 === p,
          body: A => `<p>A box of 10 pens costs <b>${F.money(p)}</b>.</p><p>How much does one pen cost?</p>${A.box(F.money(each, true), { w: 28 })}`, guide: `Accept ${F.money(each)}.` };
      }
      const c = R.int(23, 99), tot = c * 100;
      return { marks: 1, answer: F.money(tot), check: () => tot / 100 === c,
        body: A => `<p>One stamp costs <b>${c}p</b>.</p><p>How much do 100 stamps cost? Give your answer in pounds.</p>${A.box(F.money(tot), { w: 28 })}` };
    },
  });

  // Y5_012 factors, multiples, primes
  add({
    id: 'Y5_012.factors', topics: ['Y5_012'], level: 2,
    make(R) {
      const N = R.pick([24, 30, 36, 40, 42, 48, 54, 56, 60, 72, 84, 90]);
      const fs = [], nf = [];
      for (let k = 2; k < N; k++) (N % k === 0 ? fs : nf).push(k);
      const yes = R.sample(fs.filter(k => k <= 30), 3), no = R.sample(nf.filter(k => k <= 30 && k > 3), 3);
      const opts = R.shuffle([...yes, ...no]);
      const right = opts.map((x, i) => N % x === 0 ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => opts[i]).sort((a, b) => a - b).join(', '),
        check: () => right.length === 3 && right.every(i => yes.includes(opts[i])),
        body: A => `<p>Circle all the factors of <b>${N}</b>.</p>${A.circle(opts, right)}`,
        guide: 'All three needed, and no others.',
      };
    },
  });
  add({
    id: 'Y5_012.common-multiple', topics: ['Y5_012'], level: 2,
    make(R) {
      const [a, b] = R.pick([[3, 4], [4, 6], [2, 5], [3, 5], [4, 5], [6, 8], [3, 8], [6, 9], [4, 10], [6, 4]]);
      const l = F.lcm(a, b), m = l * R.int(2, 6);
      const L = m - R.int(1, l - 1), H = m + R.int(1, l - 1);
      const found = []; for (let x = L + 1; x < H; x++) if (x % a === 0 && x % b === 0) found.push(x);
      return {
        marks: 1, answer: F.n(m),
        check: () => found.length === 1 && found[0] === m,
        body: A => `<p>Write a number between <b>${L}</b> and <b>${H}</b> that is a multiple of <b>${a}</b> and a multiple of <b>${b}</b>.</p>${A.box(m)}`,
      };
    },
  });
  add({
    id: 'Y5_012.primes', topics: ['Y5_012'], level: 2,
    make(R) {
      const primes = [23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79];
      const odd = [21, 27, 33, 39, 49, 51, 57, 63, 69, 25, 35, 45, 55, 65, 77, 81, 87, 91];
      const opts = R.shuffle([...R.sample(primes, 2), ...R.sample(odd, 3)]);
      const right = opts.map((x, i) => isPrime(x) ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => opts[i]).join(' and '),
        check: () => right.length === 2,
        body: A => `<p>Tick the <b>two</b> prime numbers.</p>${A.tick(opts, right)}`,
      };
    },
  });

  // Y5_NC_01 read, write, order, compare numbers to 1,000,000; count in powers of 10
  add({
    id: 'Y5_NC_01.words', topics: ['Y5_NC_01'], level: 1,
    make(R) {
      const big = R.chance(0.6);
      const ds = big ? [R.int(1, 9), R.int(0, 9), R.int(0, 9), R.int(0, 9), R.int(0, 9), R.int(0, 9)] : [R.int(1, 9), R.int(0, 9), R.int(0, 9), R.int(0, 9), R.int(0, 9)];
      // put in at least one zero
      ds[R.int(1, ds.length - 1)] = 0;
      const n = +ds.join('');
      const w = words(n);
      return {
        marks: 1, answer: F.n(n),
        check: () => unwords(w) === n,
        body: A => `<p>Write this number in digits.</p><p><b>${w[0].toUpperCase() + w.slice(1)}</b></p>${A.box(F.n(n), { w: 40 })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_01.order', topics: ['Y5_NC_01'], level: 2,
    make(R) {
      const base = R.int(10, 99) * 10000, ds = R.ints(4, 0, 9);
      const perms = [];
      for (let k = 0; k < 40 && perms.length < 4; k++) { const v = base + +R.shuffle(ds).join(''); if (!perms.includes(v)) perms.push(v); }
      const nums = perms;
      if (nums.length < 4) return null;
      const sorted = nums.slice().sort((a, b) => a - b), shown = R.shuffle(nums);
      const ans = sorted.map(x => F.n(x)).join('; ');
      return {
        marks: 1, answer: ans,
        check: () => sorted.map(x => String(x).padStart(7, '0')).every((s, i, a) => i === 0 || a[i - 1] < s),
        body: A => `<p>Write these numbers in order, starting with the smallest.</p><div class="sent c">${shown.map(x => F.n(x)).join('&nbsp;&nbsp;&nbsp;&nbsp;')}</div>${A.line(ans, 120)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_01.more-less', topics: ['Y5_NC_01'], level: 1,
    make(R) {
      const p = R.pick([1000, 10000, 100000]), more = R.chance(0.5);
      let n = R.int(120000, 880000);
      // make the step cross a boundary: the digit in place p is 9 (more) or 0 (less)
      const dig = Math.floor(n / p) % 10;
      n += ((more ? 9 : 0) - dig) * p;
      if (p === 100000 && more) n -= 100000 * 0;  // 9xx,xxx + 100,000 < 1,000,000 is fine
      const ans = more ? n + p : n - p;
      if (ans <= 0 || ans >= 1000000) return null;
      return {
        marks: 1, answer: F.n(ans),
        check: () => (more ? ans - n : n - ans) === p,
        body: A => `<p>What is <b>${F.n(p)} ${more ? 'more' : 'less'}</b> than ${F.n(n)}?</p>${A.box(F.n(ans), { w: 36 })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_01.sequence', topics: ['Y5_NC_01'], level: 2,
    make(R) {
      const step = R.pick([1000, 10000, 100000]), up = R.chance(0.6);
      const start = R.int(10, 99) * (step / 10) + R.int(0, step / 10 - 1);
      let terms = [0, 1, 2, 3, 4].map(i => start + (up ? i : -i) * step + (up ? 0 : 5 * step));
      if (terms.some(t => t <= 0 || t >= 1000000)) return null;
      const miss = R.sample([1, 2, 3, 4], 2).sort();
      return {
        marks: 1, answer: miss.map(i => F.n(terms[i])).join(' and '),
        check: () => terms.every((t, i) => i === 0 || Math.abs(t - terms[i - 1]) === step),
        body: A => `<p>Write the missing numbers in this sequence.</p><div class="sent c">${terms.map((t, i) => miss.includes(i) ? A.blank(F.n(t), 24) : F.n(t)).join(',&nbsp;&nbsp;')}</div>`,
      };
    },
  });

  // Y5_NC_02 negative numbers in context
  add({
    id: 'Y5_NC_02.thermometer', topics: ['Y5_NC_02'], level: 1,
    make(R) {
      const minor = R.pick([1, 2]), min = -10, max = R.pick([10, 20]);
      const t = R.int(-9, 6) * (minor === 2 ? 1 : 1);
      if (t % minor !== 0 || t === 0 || t > 0 && R.chance(0.6)) return null;
      return {
        marks: 1, answer: F.n(t) + ' °C',
        check: () => t >= min && t <= max && t % minor === 0,
        body: A => `<p>What temperature does the thermometer show?</p>${D.scale({ min, max, major: 5, minor, level: t, kind: 'thermo', unit: '°C', height: 44 }, A)}${A.box(F.n(t), { unit: '°C' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_02.difference', topics: ['Y5_NC_02'], level: 2,
    make(R) {
      const f = R.int(0, 2), place = R.pick(['Oslo', 'a mountain town', 'the school field', 'Moscow', 'a garden']);
      if (f === 0) {
        const lo = -R.int(2, 12), hi = R.int(2, 15), ans = hi - lo;
        return { marks: 1, answer: ans + ' degrees', check: () => lo + ans === hi,
          body: A => `<p>At midnight the temperature in ${place} was <b>${F.n(lo)} °C</b>.</p><p>At midday it was <b>${F.n(hi)} °C</b>.</p><p>How many degrees warmer was it at midday?</p>${A.box(ans, { unit: 'degrees' })}` };
      }
      const s = R.int(2, 9), fall = R.int(s + 2, s + 12), ans = s - fall;
      if (f === 1) return { marks: 1, answer: F.n(ans) + ' °C', check: () => ans + fall === s && ans < 0,
        body: A => `<p>The temperature in ${place} is <b>${s} °C</b>.</p><p>It falls by <b>${fall}</b> degrees.</p><p>What is the temperature now?</p>${A.box(F.n(ans), { unit: '°C' })}` };
      const rise = R.int(3, 14), from = -R.int(2, 12), to = from + rise;
      if (to === 0) return null;
      return { marks: 1, answer: F.n(to) + ' °C', check: () => to - rise === from,
        body: A => `<p>The temperature in ${place} is <b>${F.n(from)} °C</b>.</p><p>It rises by <b>${rise}</b> degrees.</p><p>What is the temperature now?</p>${A.box(F.n(to), { unit: '°C' })}` };
    },
  });
  add({
    id: 'Y5_NC_02.sequence', topics: ['Y5_NC_02'], level: 2,
    make(R) {
      const step = R.int(2, 7), start = R.int(3, 4 * step);
      const terms = [0, 1, 2, 3, 4, 5].map(i => start - i * step);
      if (terms[5] >= 0 || terms[2] < 0 && terms[1] < 0) return null;
      const miss = [3, 4];
      if (terms[3] >= 0 && terms[4] >= 0) return null;
      return {
        marks: 1, answer: miss.map(i => F.n(terms[i])).join(' and '),
        check: () => terms.every((t, i) => i === 0 || terms[i - 1] - t === step),
        body: A => `<p>The numbers in this sequence go down by the same amount each time.</p><p>Write the missing numbers.</p><div class="sent c">${terms.map((t, i) => miss.includes(i) ? A.blank(F.n(t), 16) : F.n(t)).join(',&nbsp;&nbsp;')}</div>`,
      };
    },
  });

  // Y5_NC_03 rounding to 10 ... 100,000
  const PLACES = [10, 100, 1000, 10000, 100000];
  add({
    id: 'Y5_NC_03.round', topics: ['Y5_NC_03'], level: 1,
    make(R) {
      const p = R.pick(PLACES), n = R.int(100001, 989999);
      if (n % p === 0 || n % p === p / 2) return null;
      const ans = Math.round(n / p) * p;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans % p === 0 && Math.abs(n - ans) < p / 2,
        body: A => `<p>Round <b>${F.n(n)}</b> to the nearest ${F.n(p)}.</p>${A.box(F.n(ans), { w: 36 })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_03.table', topics: ['Y5_NC_03'], level: 2,
    make(R) {
      const n = R.int(10001, 989999), ps = R.pick([[100, 1000, 10000], [10, 1000, 100000], [10, 100, 10000], [1000, 10000, 100000]]);
      if (ps.some(p => n % p === 0 || n % p === p / 2)) return null;
      const ans = ps.map(p => Math.round(n / p) * p);
      if (ans.some(a => a === 0)) return null;
      return {
        marks: 1, answer: ans.map(a => F.n(a)).join('; '), guide: 'All three needed for the mark.',
        check: () => ans.every((a, i) => a % ps[i] === 0 && Math.abs(n - a) < ps[i] / 2),
        body: A => `<p>Complete the table.</p>${A.table([[F.n(n), ...ans.map(a => ({ a: F.n(a) }))]], { head: ['Number', ...ps.map(p => `to the nearest ${F.n(p)}`)] })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_03.smallest', topics: ['Y5_NC_03'], level: 3,
    make(R) {
      const who = R.name();
      const p = R.pick([100, 1000, 10000]), X = R.int(12, 95) * p * (p === 10000 ? 1 : 1);
      if (X >= 1000000 || X % (p * 10) === 0) return null;
      const small = R.chance(0.6);
      const ans = small ? X - p / 2 : X + p / 2 - 1;
      const rnd = v => Math.round(v / p) * p;
      return {
        marks: 1, answer: F.n(ans),
        check: () => rnd(ans) === X && rnd(small ? ans - 1 : ans + 1) !== X,
        body: A => `<p>${who} thinks of a whole number.</p><p>Rounded to the nearest ${F.n(p)}, it is <b>${F.n(X)}</b>.</p><p>What is the <b>${small ? 'smallest' : 'largest'}</b> number it could be?</p>${A.box(F.n(ans), { w: 36 })}`,
      };
    },
  });

  // Y5_NC_04 Roman numerals to 1,000 (M), including years
  add({
    id: 'Y5_NC_04.read', topics: ['Y5_NC_04'], level: 1,
    make(R) {
      const year = R.chance(0.5), n = year ? R.int(1066, 1999) : R.int(40, 999);
      const r = F.roman(n);
      if (r.length < 4) return null;
      return {
        marks: 1, answer: String(n),
        check: () => unroman(r) === n,
        body: A => year ? `<p>A building has this date carved on it.</p><div class="sent c"><b>${r}</b></div><p>Write the year in numbers.</p>${A.box(String(n))}`
          : `<p>Write this Roman numeral as a number.</p><div class="sent c"><b>${r}</b></div>${A.box(String(n))}`,
      };
    },
  });
  add({
    id: 'Y5_NC_04.write', topics: ['Y5_NC_04'], level: 2,
    make(R) {
      const n = R.int(14, 999), r = F.roman(n);
      if (!/(IV|IX|XL|XC|CD|CM)/.test(r)) return null;
      return {
        marks: 1, answer: r,
        check: () => unroman(r) === n,
        body: A => `<p>Write <b>${n}</b> in Roman numerals.</p>${A.box(r, { w: 40 })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_04.greater', topics: ['Y5_NC_04'], level: 2,
    make(R) {
      const a = R.int(40, 999), b = R.int(40, 999);
      if (a === b || Math.abs(a - b) > 150) return null;
      const ra = F.roman(a), rb = F.roman(b);
      if (ra.length === rb.length) return null;
      const opts = [ra, rb], right = a > b ? 0 : 1;
      return {
        marks: 1, answer: opts[right],
        check: () => (unroman(opts[right]) > unroman(opts[1 - right])),
        body: A => `<p>Circle the Roman numeral that has the greater value.</p>${A.circle(opts, right)}`,
      };
    },
  });

  /* ======================= Multiplication and division ======================= */

  // Y5_013 4-digit × 1-digit, short multiplication
  add({
    id: 'Y5_013.calc', topics: ['Y5_013'], level: 1,
    make(R) {
      const a = R.int(1012, 4999), d = R.int(3, 9), ans = a * d;
      if (a % 10 === 0) return null;
      const byPlace = String(a).split('').reverse().reduce((s, c, i) => s + +c * Math.pow(10, i) * d, 0);
      return {
        marks: 1, answer: F.n(ans),
        check: () => byPlace === ans,
        body: A => `<p>Work out</p><div class="sent c">${F.n(a)} ${F.times} ${d} = ${A.blank(F.n(ans), 28)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_013.word', topics: ['Y5_013'], level: 3,
    make(R) {
      const who = R.name();
      const a = R.int(1105, 2875), d = R.int(3, 8), ans = a * d;
      const [t, unit] = R.pick([
        [`A theatre has <b>${F.n(a)}</b> seats. Every seat is sold for <b>${d}</b> shows.</p><p>How many tickets are sold altogether?`, 'tickets'],
        [`A lorry carries <b>${F.n(a)} kg</b> of sand on each trip. It makes <b>${d}</b> trips.</p><p>How much sand does it carry altogether?`, 'kg'],
        [`A cinema sells <b>${F.n(a)}</b> tickets each day for <b>${d}</b> days.</p><p>How many tickets does it sell altogether?`, 'tickets'],
        [`A bike race is <b>${F.n(a)} m</b> long. ${who} rides it <b>${d}</b> times.</p><p>How far does ${who} ride altogether?`, 'm'],
      ]);
      return {
        marks: 2, method: true, answer: F.n(ans), guide: 'Award 1 mark for a correct method with one arithmetic error.',
        check: () => ans / d === a,
        body: A => `<p>${t}</p>${A.work(`${F.n(a)} ${F.times} ${d} = ${F.n(ans)}`, 30)}${A.box(F.n(ans), { unit, w: 34 })}`,
      };
    },
  });
  add({
    id: 'Y5_013.missing-digit', topics: ['Y5_013'], level: 3,
    make(R) {
      const a = R.int(1102, 2499), d = R.int(3, 9), p = a * d;
      const s = String(a), k = R.int(1, 3), digit = +s[k];
      const fits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => +(s.slice(0, k) + x + s.slice(k + 1)) * d === p);
      const shown = A => s.split('').map((c, i) => i === k ? A.blank(digit, 9) : c).map((c, i) => i === 1 ? ',' + c : c).join('');
      return {
        marks: 1, answer: String(digit),
        check: () => fits.length === 1 && fits[0] === digit,
        body: A => `<p>Write the missing digit.</p><div class="sent c">${shown(A)} ${F.times} ${d} = ${F.n(p)}</div>`,
      };
    },
  });

  // Y5_014 short division, remainders in context
  add({
    id: 'Y5_014.calc', topics: ['Y5_014'], level: 1,
    make(R) {
      const d = R.int(3, 9), q = R.int(212, Math.floor(9999 / d)), n = q * d;
      if (n < 1000) return null;
      return {
        marks: 1, answer: F.n(q),
        check: () => q * d === n,
        body: A => `<p>Work out</p><div class="sent c">${F.n(n)} ${F.div} ${d} = ${A.blank(F.n(q), 24)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_014.remainder', topics: ['Y5_014'], level: 2,
    make(R) {
      const d = R.int(3, 9), q = R.int(112, Math.floor(9000 / d)), r = R.int(1, d - 1), n = q * d + r;
      return {
        marks: 1, answer: `${F.n(q)} r ${r}`,
        check: () => Math.floor(n / d) === q && n % d === r,
        body: A => `<p>Work out</p><div class="sent c">${F.n(n)} ${F.div} ${d} = ${A.blank(F.n(q), 22)} remainder ${A.blank(r, 10)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_014.context', topics: ['Y5_014'], level: 3,
    make(R) {
      const d = R.int(4, 9), q = R.int(110, 900), r = R.int(1, d - 1), n = q * d + r;
      const up = R.chance(0.5);
      const ans = up ? q + 1 : q;
      const t = up
        ? R.pick([[`<b>${F.n(n)}</b> people are going on a trip. Each minibus holds <b>${d}</b> people.</p><p>How many minibuses are needed?`, 'minibuses'],
          [`A baker makes <b>${F.n(n)}</b> rolls. A bag holds <b>${d}</b> rolls.</p><p>How many bags are needed to hold all the rolls?`, 'bags']])
        : R.pick([[`A ribbon is <b>${F.n(n)} cm</b> long. It is cut into pieces <b>${d} cm</b> long.</p><p>How many whole pieces can be cut?`, 'pieces'],
          [`A farmer has <b>${F.n(n)}</b> eggs. She packs them in boxes of <b>${d}</b>.</p><p>How many boxes can she fill?`, 'boxes']]);
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: `Award 1 mark for ${F.n(n)} ${F.div} ${d} = ${F.n(q)} r ${r} with the remainder not used correctly.`,
        check: () => (up ? (ans - 1) * d < n && ans * d >= n : ans * d <= n && (ans + 1) * d > n),
        body: A => `<p>${t[0]}</p>${A.work(`${F.n(n)} ${F.div} ${d} = ${F.n(q)} r ${r}, so ${up ? `${F.n(q)} + 1 = ${F.n(ans)}` : F.n(ans)}`, 30)}${A.box(F.n(ans), { unit: t[1] })}`,
      };
    },
  });

  // new_d_n8bvzswy_3_mwtbupcg long multiplication: 4-digit × 2-digit
  const LM = 'new_d_n8bvzswy_3_mwtbupcg';
  add({
    id: LM + '.calc', topics: [LM], level: 3,
    make(R) {
      const a = R.int(1023, 4987), b = R.int(12, 39);
      if (b % 10 === 0 || b % 11 === 0) return null;
      const t = Math.floor(b / 10) * 10, u = b % 10, ans = a * b;
      return {
        marks: 2, method: true, answer: F.n(ans), guide: 'Award 1 mark for a correct long multiplication method with no more than one arithmetic error.',
        check: () => a * t + a * u === ans && ans / b === a,
        body: A => `<p>Work out</p><div class="sent c">${F.n(a)} ${F.times} ${b}</div>${A.work(`${F.n(a)} ${F.times} ${u} = ${F.n(a * u)}<br>${F.n(a)} ${F.times} ${t} = ${F.n(a * t)}<br>${F.n(a * u)} + ${F.n(a * t)} = ${F.n(ans)}`, 40)}${A.box(F.n(ans), { w: 36 })}`,
      };
    },
  });
  add({
    id: LM + '.word', topics: [LM], level: 3,
    make(R) {
      const a = R.int(1025, 3950), b = R.int(14, 48);
      if (b % 10 === 0) return null;
      const ans = a * b;
      const [t, unit] = R.pick([
        [`A factory makes <b>${F.n(a)}</b> bottles every hour. It works for <b>${b}</b> hours.</p><p>How many bottles does it make?`, 'bottles'],
        [`A stadium has <b>${F.n(a)}</b> seats. All the seats are sold for <b>${b}</b> matches.</p><p>How many tickets are sold altogether?`, 'tickets'],
        [`Each box of paper has <b>${F.n(a)}</b> sheets. A school buys <b>${b}</b> boxes.</p><p>How many sheets is that altogether?`, 'sheets'],
      ]);
      return {
        marks: 2, method: true, answer: F.n(ans), guide: 'Award 1 mark for a correct method with one arithmetic error.',
        check: () => ans / a === b,
        body: A => `<p>${t}</p>${A.work(`${F.n(a)} ${F.times} ${b} = ${F.n(ans)}`, 38)}${A.box(F.n(ans), { unit, w: 36 })}`,
      };
    },
  });
  add({
    id: LM + '.partial', topics: [LM], level: 3,
    make(R) {
      const who = R.name();
      const a = R.int(1102, 3998), t = R.int(1, 4), u = R.int(2, 9), b = t * 10 + u;
      const p1 = a * u, p2 = a * t * 10, tot = p1 + p2;
      const row = (op, c) => `<tr><td style="border:0;text-align:right;width:8mm">${op}</td><td style="border:0;text-align:right">${c}</td></tr>`;
      return {
        marks: 2, answer: `${F.n(p1)}, ${F.n(p2)}, ${F.n(tot)}`, guide: 'Award 1 mark for both middle rows correct.',
        check: () => tot === a * b && tot % b === 0,
        body: A => `<p>${who} is working out ${F.n(a)} ${F.times} ${b} using long multiplication.</p><p>Write the missing numbers.</p>
          <table class="qt" style="border:0;font-size:13pt">${row('', F.n(a))}${row(F.times, F.n(b))}${row('', A.blank(F.n(p1), 26))}${row('+', A.blank(F.n(p2), 26))}${row('', A.blank(F.n(tot), 26))}</table>`,
      };
    },
  });

  /* ======================= Fractions ======================= */

  // Y5_015 non-unit fractions of amounts
  add({
    id: 'Y5_015.calc', topics: ['Y5_015'], level: 1,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8, 9, 10, 12]), n = R.int(2, d - 1);
      if (F.gcd(n, d) !== 1) return null;
      const k = R.int(3, 12), amt = d * k, ans = n * k;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans * d === n * amt,
        body: A => `<p>Work out</p><div class="sent c">${F.frac(n, d)} of ${amt} = ${A.blank(ans)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_015.word', topics: ['Y5_015'], level: 3,
    make(R) {
      const who = R.name();
      const d = R.pick([3, 4, 5, 6, 8, 10]), n = R.int(2, d - 1);
      if (F.gcd(n, d) !== 1) return null;
      const k = R.int(4, 15), amt = d * k, part = n * k, ans = amt - part;
      const [l1, l2, q, unit] = R.pick([
        [`A farmer has ${amt} sheep.`, `${F.frac(n, d)} of the sheep are black.`, 'How many sheep are <b>not</b> black?', 'sheep'],
        [`There are ${amt} children in a choir.`, `${F.frac(n, d)} of them are in Year 5.`, 'How many children in the choir are <b>not</b> in Year 5?', 'children'],
        [`${who} has ${amt} stickers.`, `${who} gives away ${F.frac(n, d)} of them.`, `How many stickers does ${who} have left?`, 'stickers'],
      ]);
      return {
        marks: 2, method: true, answer: F.n(ans), guide: `Award 1 mark for finding ${F.frac(n, d)} of ${amt} = ${part}.`,
        check: () => ans * d === (d - n) * amt,
        body: A => `<p>${l1} ${l2}</p><p>${q}</p>${A.work(`${amt} ${F.div} ${d} = ${k}, ${k} ${F.times} ${n} = ${part}, ${amt} ${F.minus} ${part} = ${ans}`, 30)}${A.box(ans, { unit })}`,
      };
    },
  });
  add({
    id: 'Y5_015.inverse', topics: ['Y5_015'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8]), n = R.int(2, d - 1);
      if (F.gcd(n, d) !== 1) return null;
      const k = R.int(3, 12), whole = d * k, part = n * k;
      return {
        marks: 1, answer: F.n(whole),
        check: () => whole / d * n === part,
        body: A => `<p>${F.frac(n, d)} of a number is <b>${part}</b>.</p><p>What is the number?</p>${A.box(whole)}`,
      };
    },
  });

  // Y5_016 equivalent fractions
  add({
    id: 'Y5_016.missing', topics: ['Y5_016'], level: 1,
    make(R) {
      const b = R.int(2, 9), a = R.int(1, b - 1);
      if (F.gcd(a, b) !== 1) return null;
      const m = R.int(2, 8), f = R.int(0, 3);
      const vals = [a, b, a * m, b * m];
      const ans = vals[f];
      const cell = (i, A) => i === f ? A.blank(vals[i], 9) : vals[i];
      return {
        marks: 1, answer: F.n(ans),
        check: () => sameFrac(a, b, a * m, b * m) && ans === vals[f],
        body: A => `<p>Write the missing number.</p><div class="sent c">${F.frac(cell(0, A), cell(1, A))} = ${F.frac(cell(2, A), cell(3, A))}</div>`,
      };
    },
  });
  add({
    id: 'Y5_016.odd-one-out', topics: ['Y5_016'], level: 2,
    make(R) {
      const b = R.int(2, 6), a = R.int(1, b - 1);
      if (F.gcd(a, b) !== 1) return null;
      const ms = R.ints(3, 1, 6), md = R.pick(ms.filter(x => x > 1).concat([2]));
      const decoy = R.chance(0.5) ? [a * md + 1, b * md] : [a * md, b * md + 1];
      if (sameFrac(decoy[0], decoy[1], a, b) || decoy[0] >= decoy[1]) return null;
      const opts = R.shuffle([...ms.map(m => [a * m, b * m]), decoy]);
      const right = opts.indexOf(decoy);
      return {
        marks: 1, answer: F.frac(decoy[0], decoy[1]),
        check: () => opts.filter(o => sameFrac(o[0], o[1], a, b)).length === 3 && !sameFrac(opts[right][0], opts[right][1], a, b),
        body: A => `<p>Three of these fractions are equivalent. Circle the one that is <b>not</b>.</p>${A.circle(opts.map(o => F.frac(o[0], o[1])), right)}`,
      };
    },
  });
  add({
    id: 'Y5_016.bars', topics: ['Y5_016'], level: 2,
    make(R) {
      const b = R.int(2, 5), a = R.int(1, b - 1), m = R.int(2, b <= 3 ? 4 : 3), ans = a * m;
      return {
        marks: 1, answer: F.n(ans),
        check: () => sameFrac(a, b, ans, b * m),
        body: A => `<p>The first bar has ${F.frac(a, b)} shaded.</p>${D.fractionBar({ parts: b, shaded: a, width: 120 })}<p>How many parts of this bar must be shaded to show the same fraction?</p>${D.fractionBar({ parts: b * m, shaded: 0, width: 120 })}${A.box(ans, { unit: 'parts' })}`,
      };
    },
  });

  // Y5_017 decimal equivalents of halves, quarters, fifths, tenths
  const FD = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10]];
  const hund = (n, d) => n * 100 / d;
  add({
    id: 'Y5_017.convert', topics: ['Y5_017'], level: 1,
    make(R) {
      const [n, d] = R.pick(FD), h = hund(n, d), toDec = R.chance(0.5);
      return {
        marks: 1, answer: toDec ? dec(h, 2) : F.n(n),
        check: () => Math.round(num(dec(h, 2)) * d * 100) === n * 100,
        body: A => toDec ? `<p>Write the fraction as a decimal.</p><div class="sent c">${F.frac(n, d)} = ${A.blank(dec(h, 2), 18)}</div>`
          : `<p>Write the missing number.</p><div class="sent c">${dec(h, 2)} = ${F.frac(A.blank(n, 9), d)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_017.match', topics: ['Y5_017'], level: 1,
    make(R) {
      const ps = R.sample(FD, 4), right = R.shuffle([0, 1, 2, 3]);
      const decs = right.map(i => dec(hund(...ps[i]), 2));
      const pairs = ps.map((p, i) => [i, right.indexOf(i)]);
      return {
        marks: 1, answer: ps.map(p => `${p[0]}/${p[1]} = ${dec(hund(...p), 2)}`).join(', '),
        check: () => pairs.every(([l, r]) => Math.round(num(decs[r]) * ps[l][1] * 100) === ps[l][0] * 100),
        body: A => `<p>Draw lines to match each fraction to its decimal.</p>${A.match(ps.map(p => F.frac(p[0], p[1])), decs, pairs)}`,
      };
    },
  });
  add({
    id: 'Y5_017.greatest', topics: ['Y5_017'], level: 2,
    make(R) {
      const fs = R.sample(FD, 2), ds = R.ints(2, 11, 95);
      const vals = [...fs.map(p => hund(...p)), ...ds];
      if (new Set(vals).size < 4) return null;
      const items = R.shuffle([...fs.map(p => ({ t: F.frac(p[0], p[1]), v: hund(...p) })), ...ds.map(x => ({ t: dec(x, 2), v: x }))]);
      const big = R.chance(0.5);
      const best = items.reduce((b, it, i) => (big ? it.v > items[b].v : it.v < items[b].v) ? i : b, 0);
      return {
        marks: 1, answer: items[best].t,
        check: () => items.every(it => big ? it.v <= items[best].v : it.v >= items[best].v),
        body: A => `<p>Circle the <b>${big ? 'greatest' : 'smallest'}</b> number.</p>${A.circle(items.map(it => it.t), best)}`,
      };
    },
  });

  // new_d_jfakw8p7_1_mwt91rg3 add and subtract fractions with different denominators
  const FAS = 'new_d_jfakw8p7_1_mwt91rg3';
  function relFracs(R) {   // a/b and c/d with d a multiple of b
    const b = R.int(2, 6), m = R.int(2, b <= 3 ? 4 : 3), d = b * m;
    const a = R.int(1, b - 1), c = R.int(1, d - 1);
    if (F.gcd(a, b) !== 1 || F.gcd(c, d) !== 1) return null;
    return { a, b, c, d, m };
  }
  const fracGuide = 'Accept any equivalent fraction, or an equivalent mixed number.';
  add({
    id: FAS + '.add', topics: [FAS], level: 1,
    make(R) {
      const q = relFracs(R); if (!q) return null;
      const { a, b, c, d, m } = q, top = a * m + c;
      const flip = R.chance(0.5);
      return {
        marks: 1, answer: frT(top, d), guide: fracGuide,
        check: () => sameFrac(top, d, a * d + c * b, b * d),
        body: A => `<p>Work out</p><div class="sent c">${flip ? F.frac(c, d) + ' + ' + F.frac(a, b) : F.frac(a, b) + ' + ' + F.frac(c, d)} = ${A.blank(fr(top, d), 18)}</div>`,
      };
    },
  });
  add({
    id: FAS + '.subtract', topics: [FAS], level: 1,
    make(R) {
      const q = relFracs(R); if (!q) return null;
      const { a, b, c, d, m } = q;
      const big = a * m > c;
      const top = big ? a * m - c : c - a * m;
      if (top <= 0) return null;
      return {
        marks: 1, answer: frT(top, d), guide: fracGuide,
        check: () => big ? sameFrac(top + c, d, a, b) : sameFrac(c - top, d, a, b),
        body: A => `<p>Work out</p><div class="sent c">${big ? F.frac(a, b) + ` ${F.minus} ` + F.frac(c, d) : F.frac(c, d) + ` ${F.minus} ` + F.frac(a, b)} = ${A.blank(fr(top, d), 18)}</div>`,
      };
    },
  });
  add({
    id: FAS + '.missing', topics: [FAS], level: 2,
    make(R) {
      const q = relFracs(R); if (!q) return null;
      const { a, b, d, m } = q;
      if (d - 1 - a * m < 1) return null;
      const x = R.int(1, d - 1 - a * m), e = a * m + x;
      return {
        marks: 1, answer: F.n(x),
        check: () => sameFrac(e - x, d, a, b),
        body: A => `<p>Write the missing number.</p><div class="sent c">${F.frac(a, b)} + ${F.frac(A.blank(x, 9), d)} = ${F.frac(e, d)}</div>`,
      };
    },
  });
  add({
    id: FAS + '.word', topics: [FAS], level: 3,
    make(R) {
      const q = relFracs(R); if (!q) return null;
      const { a, b, c, d, m } = q, used = a * m + c, left = d - used;
      if (left <= 0) return null;
      const [p, q2] = R.names(2);
      const [thing, v1, v2] = R.pick([['a pizza', 'eats', 'eats'], ['a cake', 'eats', 'eats'], ['a bottle of juice', 'drinks', 'drinks'], ['a garden', 'plants carrots in', 'plants beans in']]);
      return {
        marks: 2, method: true, answer: frT(left, d), guide: fracGuide + ` Award 1 mark for ${F.frac(used, d)} used.`,
        check: () => sameFrac(left + used, d, 1, 1) && sameFrac(used - c, d, a, b),
        body: A => `<p>${p} ${v1} ${F.frac(a, b)} of ${thing}.</p><p>${q2} ${v2} ${F.frac(c, d)} of the same ${thing.split(' ').slice(1).join(' ')}.</p><p>What fraction of the ${thing.split(' ').slice(1).join(' ')} is left?</p>${A.work(`${F.frac(a, b)} = ${F.frac(a * m, d)}, ${F.frac(a * m, d)} + ${F.frac(c, d)} = ${F.frac(used, d)}, 1 ${F.minus} ${F.frac(used, d)} = ${F.frac(left, d)}`, 30)}${A.box(fr(left, d), { w: 22 })}`,
      };
    },
  });

  // mixed numbers: helpers. A mixed number is kept as an improper numerator over a denominator.
  function mixedPair(R, needExchange) {
    const d1 = R.pick([2, 3, 4, 5, 6, 8]), m = R.pick(d1 <= 4 ? [1, 2, 3] : [1, 2]), d2 = d1 * m;
    if (d2 > 12) return null;
    const n1 = R.int(1, d1 - 1), n2 = R.int(1, d2 - 1);
    if (F.gcd(n1, d1) !== 1 || F.gcd(n2, d2) !== 1) return null;
    const w1 = R.int(1, 4), w2 = R.int(1, 3);
    return { w1, n1, d1, w2, n2, d2, m, D: d2, top1: (w1 * d1 + n1) * m, top2: w2 * d2 + n2 };
  }
  const MA = 'new_d_jfakw8p7_2_mwt92zzm';
  add({
    id: MA + '.calc', topics: [MA], level: 2,
    make(R) {
      const q = mixedPair(R); if (!q) return null;
      const tot = q.top1 + q.top2, flip = R.chance(0.4);
      const x = F.mixed(q.w1, q.n1, q.d1), y = F.mixed(q.w2, q.n2, q.d2);
      return {
        marks: 1, answer: frT(tot, q.D), guide: 'Accept an equivalent mixed number or improper fraction.',
        check: () => sameFrac(tot, q.D, (q.w1 + q.w2) * q.D + q.n1 * q.m + q.n2, q.D),
        body: A => `<p>Work out</p><div class="sent c">${flip ? y + ' + ' + x : x + ' + ' + y} = ${A.blank(fr(tot, q.D), 22)}</div>`,
      };
    },
  });
  add({
    id: MA + '.word', topics: [MA], level: 3,
    make(R) {
      const who = R.name();
      const q = mixedPair(R); if (!q) return null;
      const tot = q.top1 + q.top2;
      if ((q.n1 * q.m + q.n2) <= q.D) return null;   // the fractions make more than a whole: an exchange is needed
      const [u, ctx] = R.pick([['m', [`${who} has two pieces of ribbon.`, 'One piece is', 'The other is', 'What is the total length of ribbon?']],
        ['km', [`${who} walks to the park and then to the shop.`, 'The walk to the park is', 'The walk to the shop is', `How far does ${who} walk altogether?`]],
        ['litres', ['Two jugs of water are poured into a bowl.', 'One jug holds', 'The other holds', 'How much water is in the bowl?']]]);
      return {
        marks: 2, method: true, answer: frT(tot, q.D) + ' ' + u, guide: 'Accept an equivalent mixed number or improper fraction. Award 1 mark for a correct method with one error.',
        check: () => sameFrac(tot - q.top2, q.D, q.w1 * q.d1 + q.n1, q.d1),
        body: A => `<p>${ctx[0]}</p><p>${ctx[1]} ${F.mixed(q.w1, q.n1, q.d1)} ${u}. ${ctx[2]} ${F.mixed(q.w2, q.n2, q.d2)} ${u}.</p><p>${ctx[3]}</p>${A.work(`${q.w1} + ${q.w2} = ${q.w1 + q.w2}, ${F.frac(q.n1 * q.m, q.D)} + ${F.frac(q.n2, q.D)} = ${F.frac(q.n1 * q.m + q.n2, q.D)}, total ${fr(tot, q.D)}`, 30)}${A.box(fr(tot, q.D), { unit: u, w: 26 })}`,
      };
    },
  });
  add({
    id: MA + '.make-whole', topics: [MA], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8, 10]), n = R.int(1, d - 1), w = R.int(1, 4), W = w + R.int(2, 4);
      if (F.gcd(n, d) !== 1) return null;
      const missTop = W * d - (w * d + n);
      return {
        marks: 1, answer: frT(missTop, d), guide: 'Accept an equivalent mixed number or improper fraction.',
        check: () => (w * d + n + missTop) % d === 0 && (w * d + n + missTop) / d === W,
        body: A => `<p>Write the missing number.</p><div class="sent c">${F.mixed(w, n, d)} + ${A.blank(fr(missTop, d), 22)} = ${W}</div>`,
      };
    },
  });

  // new_d_n8bvzswy_5_mwtc8jz9 subtract mixed numbers
  const MS = 'new_d_n8bvzswy_5_mwtc8jz9';
  function mixedSub(R, exchange) {
    const q = mixedPair(R); if (!q) return null;
    const w1 = q.w1 + 2, top1 = (w1 * q.d1 + q.n1) * q.m;   // make the first number the larger
    const frac1 = q.n1 * q.m, needs = frac1 < q.n2;
    if (needs !== exchange) return null;
    const diff = top1 - q.top2;
    if (diff <= 0) return null;
    return Object.assign(q, { w1, top1, diff });
  }
  add({
    id: MS + '.calc', topics: [MS], level: 2,
    make(R) {
      const q = mixedSub(R, false); if (!q) return null;
      return {
        marks: 1, answer: frT(q.diff, q.D), guide: 'Accept an equivalent mixed number or improper fraction.',
        check: () => sameFrac(q.diff + q.top2, q.D, q.w1 * q.d1 + q.n1, q.d1),
        body: A => `<p>Work out</p><div class="sent c">${F.mixed(q.w1, q.n1, q.d1)} ${F.minus} ${F.mixed(q.w2, q.n2, q.d2)} = ${A.blank(fr(q.diff, q.D), 22)}</div>`,
      };
    },
  });
  add({
    id: MS + '.exchange', topics: [MS], level: 2,
    make(R) {
      const q = mixedSub(R, true); if (!q) return null;
      return {
        marks: 1, answer: frT(q.diff, q.D), guide: 'Accept an equivalent mixed number or improper fraction.',
        check: () => sameFrac(q.diff + q.top2, q.D, q.w1 * q.d1 + q.n1, q.d1),
        body: A => `<p>Work out</p><div class="sent c">${F.mixed(q.w1, q.n1, q.d1)} ${F.minus} ${F.mixed(q.w2, q.n2, q.d2)} = ${A.blank(fr(q.diff, q.D), 22)}</div>`,
      };
    },
  });
  add({
    id: MS + '.word', topics: [MS], level: 3,
    make(R) {
      const q = mixedSub(R, R.chance(0.7)); if (!q) return null;
      const [u, l1, l2, qn] = R.pick([
        ['litres', 'A jug of water holds', 'litres are poured out.', 'How much water is left in the jug?'],
        ['m', 'A plank of wood is', 'm is cut off.', 'How long is the plank now?'],
        ['kg', 'A bag of rice holds', 'kg of rice is used.', 'How much rice is left in the bag?'],
      ]);
      return {
        marks: 2, method: true, answer: frT(q.diff, q.D) + ' ' + u, guide: 'Accept an equivalent mixed number or improper fraction. Award 1 mark for a correct method with one error.',
        check: () => sameFrac(q.diff + q.top2, q.D, q.w1 * q.d1 + q.n1, q.d1),
        body: A => `<p>${l1} ${F.mixed(q.w1, q.n1, q.d1)} ${u}.</p><p>${F.mixed(q.w2, q.n2, q.d2)} ${l2}</p><p>${qn}</p>${A.work(`${fr(q.top1, q.D, true)} ${F.minus} ${fr(q.top2, q.D, true)} = ${fr(q.diff, q.D)}`, 30)}${A.box(fr(q.diff, q.D), { unit: u, w: 26 })}`,
      };
    },
  });

  // Y5_NC_10 compare and order fractions with related denominators
  add({
    id: 'Y5_NC_10.compare', topics: ['Y5_NC_10'], level: 1,
    make(R) {
      const b = R.int(2, 6), m = R.int(2, 4), d = b * m, a = R.int(1, b - 1);
      const c = Math.max(1, Math.min(d - 1, a * m + R.int(-2, 2)));
      if (F.gcd(a, b) !== 1) return null;
      const s = cmpSym(a * d, c * b), flip = R.chance(0.5);
      const ss = flip ? cmpSym(c * b, a * d) : s;
      return {
        marks: 1, answer: ss,
        check: () => (s === '=') === sameFrac(a, b, c, d),
        body: A => `<p>Write &lt;, &gt; or = to make this correct.</p><div class="sent c">${flip ? F.frac(c, d) : F.frac(a, b)} ${A.blank(ss, 12)} ${flip ? F.frac(a, b) : F.frac(c, d)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_NC_10.order', topics: ['Y5_NC_10'], level: 2,
    make(R) {
      const b = R.pick([2, 3, 4, 5]), dens = R.pick([[b, b * 2, b * 4], [b, b * 2, b * 3], [b, b * 3, b * 2]]);
      if (dens.some(x => x > 20)) return null;
      const L = dens.reduce((x, y) => F.lcm(x, y));
      const fs = dens.map(d => { const n = R.int(1, d - 1); return [n, d]; });
      if (fs.some(([n, d]) => F.gcd(n, d) !== 1)) return null;
      const vals = fs.map(([n, d]) => n * L / d);
      if (new Set(vals).size < 3) return null;
      const order = [0, 1, 2].sort((i, j) => vals[i] - vals[j]);
      const shown = R.shuffle([0, 1, 2]);
      const ans = order.map(i => F.frac(...fs[i])).join(', ');
      return {
        marks: 1, answer: ans,
        check: () => fs[order[0]][0] * fs[order[1]][1] < fs[order[1]][0] * fs[order[0]][1] && fs[order[1]][0] * fs[order[2]][1] < fs[order[2]][0] * fs[order[1]][1],
        body: A => `<p>Write these fractions in order, starting with the smallest.</p><div class="sent c">${shown.map(i => F.frac(...fs[i])).join('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}</div>${A.line(ans, 80)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_10.between', topics: ['Y5_NC_10'], level: 2,
    make(R) {
      const d = R.int(3, 6), a = R.int(1, d - 2), D2 = 2 * d, ans = 2 * a + 1;
      const lo = simp(a, d), hi = simp(a + 1, d);
      const found = []; for (let n = 1; n < D2; n++) if (n * d > a * D2 && n * d < (a + 1) * D2) found.push(n);
      return {
        marks: 1, answer: F.frac(ans, D2),
        check: () => found.length === 1 && found[0] === ans,
        body: A => `<p>Write a fraction with a denominator of <b>${D2}</b> that is greater than ${F.frac(...lo)} and less than ${F.frac(...hi)}.</p><div class="sent c">${F.frac(lo[0], lo[1])} &lt; ${F.frac(A.blank(ans, 9), D2)} &lt; ${F.frac(hi[0], hi[1])}</div>`,
      };
    },
  });

  // Y5_NC_11 multiply proper fractions and mixed numbers by whole numbers
  add({
    id: 'Y5_NC_11.fraction', topics: ['Y5_NC_11'], level: 1,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8, 10]), n = R.int(1, d - 1), k = R.int(2, 9);
      if (F.gcd(n, d) !== 1 || (n * k) % d === 0) return null;
      const top = n * k;
      return {
        marks: 1, answer: frT(top, d), guide: 'Accept an equivalent improper fraction or mixed number.',
        check: () => sameFrac(top, d * k, n, d),
        body: A => `<p>Work out</p><div class="sent c">${F.frac(n, d)} ${F.times} ${k} = ${A.blank(fr(top, d), 22)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_NC_11.mixed', topics: ['Y5_NC_11'], level: 2,
    make(R) {
      const d = R.pick([2, 3, 4, 5, 6, 8]), n = R.int(1, d - 1), w = R.int(1, 4), k = R.int(2, 6);
      if (F.gcd(n, d) !== 1) return null;
      const top = (w * d + n) * k;
      return {
        marks: 1, answer: frT(top, d), guide: 'Accept an equivalent improper fraction or mixed number.',
        check: () => sameFrac(top, d, w * k * d + n * k, d),
        body: A => `<p>Work out</p><div class="sent c">${F.mixed(w, n, d)} ${F.times} ${k} = ${A.blank(fr(top, d), 22)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_NC_11.word', topics: ['Y5_NC_11'], level: 2,
    make(R) {
      const who = R.name();
      const d = R.pick([4, 5, 8, 10]), n = R.int(1, d - 1), k = R.int(3, 9);
      if (F.gcd(n, d) !== 1 || (n * k) % d === 0) return null;
      const top = n * k;
      const [l1, u] = R.pick([[`Each bottle holds ${F.frac(n, d)} litre of juice.</p><p>How much juice is in ${k} bottles?`, 'litres'],
        [`${who} runs ${F.frac(n, d)} km every day.</p><p>How far does ${who} run in ${k} days?`, 'km'],
        [`A recipe uses ${F.frac(n, d)} kg of flour for one cake.</p><p>How much flour is needed for ${k} cakes?`, 'kg']]);
      return {
        marks: 1, answer: frT(top, d) + ' ' + u, guide: 'Accept an equivalent improper fraction or mixed number.',
        check: () => sameFrac(top, k, n, d) ? true : sameFrac(top / k, d, n, d),
        body: A => `<p>${l1}</p>${A.box(fr(top, d), { unit: u, w: 24 })}`,
      };
    },
  });

  // Y5_NC_12 decimals as fractions, including thousandths
  add({
    id: 'Y5_NC_12.to-fraction', topics: ['Y5_NC_12'], level: 1,
    make(R) {
      const dp = R.pick([2, 3, 3]), den = Math.pow(10, dp);
      const k = dp === 2 ? R.int(11, 99) : R.pick([R.int(101, 999), R.int(11, 99), R.int(1, 9)]);
      if (k % 10 === 0) return null;
      const missDen = R.chance(0.3);
      return {
        marks: 1, answer: missDen ? F.n(den) : F.n(k),
        check: () => Math.round(num(dec(k, dp)) * den) === k,
        body: A => `<p>Write the missing number.</p><div class="sent c">${dec(k, dp)} = ${missDen ? F.frac(k, A.blank(F.n(den), 14)) : F.frac(A.blank(k, 12), F.n(den))}</div>`,
      };
    },
  });
  add({
    id: 'Y5_NC_12.circle', topics: ['Y5_NC_12'], level: 2,
    make(R) {
      const dp = R.pick([2, 3]), den = Math.pow(10, dp), k = R.int(11, 99);
      if (k % 10 === 0) return null;
      const opts = R.shuffle([dec(k, 1), dec(k, 2), dec(k, 3), dec(k, 4)]);
      const right = opts.indexOf(dec(k, dp));
      return {
        marks: 1, answer: dec(k, dp),
        check: () => Math.round(num(opts[right]) * den) === k,
        body: A => `<p>Circle the decimal that is equal to ${F.frac(k, F.n(den))}.</p>${A.circle(opts, right)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_12.parts', topics: ['Y5_NC_12'], level: 2,
    make(R) {
      const a = R.int(1, 9), b = R.int(0, 9), c = R.int(1, 9), k = a * 100 + b * 10 + c;
      return {
        marks: 1, answer: dec(k, 3),
        check: () => Math.round(num(dec(k, 3)) * 1000) === a * 100 + b * 10 + c,
        body: A => `<p>Write the missing number as a decimal.</p><div class="sent c">${F.frac(a, 10)} + ${F.frac(b, 100)} + ${F.frac(c, 1000)} = ${A.blank(dec(k, 3), 22)}</div>`,
      };
    },
  });

  // Y5_NC_13 read, write, order, compare, round numbers with up to 3 dp
  add({
    id: 'Y5_NC_13.order', topics: ['Y5_NC_13'], level: 2,
    make(R) {
      const a = R.int(1, 9), b = R.intNot(1, 9, [a]);
      const w = R.int(0, 3);
      const cand = [a * 100 + b * 10, a * 100 + b, b * 10 + a, a * 100, a * 10 + b, b * 100 + a * 10].map(x => w * 1000 + x);
      const vals = R.sample([...new Set(cand)], 4);
      if (vals.length < 4) return null;
      const sorted = vals.slice().sort((x, y) => x - y);
      const ans = sorted.map(v => dec(v, 3)).join(', ');
      return {
        marks: 1, answer: ans,
        check: () => sorted.every((v, i) => i === 0 || num(dec(sorted[i - 1], 3)) < num(dec(v, 3))),
        body: A => `<p>Write these numbers in order, starting with the smallest.</p><div class="sent c">${vals.map(v => dec(v, 3)).join('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}</div>${A.line(ans, 100)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_13.compare', topics: ['Y5_NC_13'], level: 1,
    make(R) {
      const t = R.int(1, 9), x = t * 100, y = x - R.int(1, 30);
      const w = R.int(0, 5);
      const p = w * 1000 + x, q = w * 1000 + y, flip = R.chance(0.5);
      const L = flip ? q : p, Rr = flip ? p : q, s = cmpSym(L, Rr);
      return {
        marks: 1, answer: s,
        check: () => (s === gt) === (num(dec(L, 3)) > num(dec(Rr, 3))),
        body: A => `<p>Write &lt; or &gt; to make this correct.</p><div class="sent c">${dec(L, 3)} ${A.blank(s, 12)} ${dec(Rr, 3)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_NC_13.round', topics: ['Y5_NC_13'], level: 2,
    make(R) {
      const N = R.int(1001, 19999);   // thousandths
      if (N % 10 === 0 || N % 100 === 50 || N % 1000 === 500) return null;
      const whole = Math.round(N / 1000), tenth = Math.round(N / 100);
      if (tenth % 10 === 0) return null;
      return {
        marks: 1, answer: `${F.n(whole)} and ${dec(tenth, 1)}`, guide: 'Both needed for the mark.',
        check: () => Math.abs(N - whole * 1000) < 500 && Math.abs(N - tenth * 100) < 50,
        body: A => `<p>Round <b>${dec(N, 3)}</b></p>${A.table([['to the nearest whole number', { a: F.n(whole) }], ['to one decimal place', { a: dec(tenth, 1) }]])}`,
      };
    },
  });

  // Y5_NC_14 per cent, as a fraction out of 100 and as a decimal
  add({
    id: 'Y5_NC_14.hundred-square', topics: ['Y5_NC_14'], level: 1,
    make(R) {
      const k = R.int(12, 88), un = R.chance(0.35), ans = un ? 100 - k : k;
      if (k % 10 === 0) return null;
      return {
        marks: 1, answer: ans + '%',
        check: () => (un ? 100 - ans : ans) === k,
        body: A => `<p>This grid has 100 squares.</p>${D.rectParts({ rows: 10, cols: 10, cell: 4.5, shaded: k })}<p>What percentage of the grid is <b>${un ? 'not shaded' : 'shaded'}</b>?</p>${A.box(ans, { unit: '%' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_14.table', topics: ['Y5_NC_14'], level: 2,
    make(R) {
      const k = R.int(3, 97), g = R.int(0, 2);
      if (k % 10 === 0) return null;
      const cells = [`${k}%`, F.frac(k, 100), dec(k, 2)];
      return {
        marks: 1, answer: cells.filter((c, i) => i !== g).join(' and '), guide: 'Both needed. Accept an equivalent fraction.',
        check: () => Math.round(num(dec(k, 2)) * 100) === k,
        body: A => `<p>Complete the table.</p>${A.table([cells.map((c, i) => i === g ? c : { a: c })], { head: ['Percentage', 'Fraction', 'Decimal'] })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_14.rest', topics: ['Y5_NC_14'], level: 2,
    make(R) {
      const a = R.int(11, 55), b = R.int(8, 40), c = 100 - a - b;
      if (c < 5 || a % 5 === 0 && b % 5 === 0) return null;
      const [what, x, y, z] = R.pick([['fruit', 'apples', 'pears', 'bananas'], ['way to travel to school', 'walk', 'go by car', 'cycle'], ['sport', 'football', 'netball', 'swimming']]);
      return {
        marks: 1, answer: c + '%',
        check: () => a + b + c === 100,
        body: A => `<p>Some children choose their favourite ${what}.</p><p>${a}% choose <b>${x}</b> and ${b}% choose <b>${y}</b>.</p><p>The rest choose <b>${z}</b>. What percentage choose ${z}?</p>${A.box(c, { unit: '%' })}`,
      };
    },
  });

  // Y5_NC_15 problems with 1/2, 1/4, 1/5, 2/5, 4/5 and tenths/25ths as percentages
  const PCF = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10], [9, 10], [3, 25], [8, 25], [14, 25], [21, 25]];
  add({
    id: 'Y5_NC_15.convert', topics: ['Y5_NC_15'], level: 1,
    make(R) {
      const [n, d] = R.pick(PCF), p = n * 100 / d, back = R.chance(0.3);
      return {
        marks: 1, answer: back ? F.n(n) : p + '%',
        check: () => p * d === n * 100,
        body: A => back ? `<p>Write the missing number.</p><div class="sent c">${p}% = ${F.frac(A.blank(n, 9), d)}</div>`
          : `<p>Write ${F.frac(n, d)} as a percentage.</p>${A.box(p, { unit: '%' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_15.of-amount', topics: ['Y5_NC_15'], level: 2,
    make(R) {
      const p = R.pick([10, 20, 25, 40, 50, 60, 75, 80]), amt = R.int(2, 30) * (p % 20 === 0 ? 5 : p === 25 || p === 75 ? 4 : 10);
      const ans = amt * p / 100;
      if (!Number.isInteger(ans) || amt < 20) return null;
      const money = R.chance(0.4);
      return {
        marks: 1, answer: money ? F.money(ans * 100) : F.n(ans),
        check: () => ans * 100 === amt * p,
        body: A => money ? `<p>A coat costs <b>£${amt}</b>. In a sale the price is reduced by <b>${p}%</b>.</p><p>How much money is taken off the price?</p>${A.box(ans, { pre: '£' })}`
          : `<p>Work out</p><div class="sent c">${p}% of ${amt} = ${A.blank(ans)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_NC_15.scores', topics: ['Y5_NC_15'], level: 2,
    make(R) {
      const [a, b] = R.names(2), x = R.int(11, 24), pA = x * 4, pB = pA + R.pick([-8, -6, -4, 4, 6, 8]);
      if (pB >= 100 || pB <= 30) return null;
      const win = pA > pB ? a : b;
      return {
        marks: 1, answer: win,
        guide: `Explanation must compare like with like, e.g. ${x} out of 25 = ${pA}%, which is ${pA > pB ? 'more' : 'less'} than ${pB}%.`,
        check: () => (x / 25 > pB / 100) === (win === a),
        body: A => `<p>${a} scores <b>${x} out of 25</b> in a test.</p><p>${b} scores <b>${pB}%</b> in the same test.</p><p>Who has the higher score? Explain how you know.</p>${A.explain(`${win}. ${x} out of 25 is ${x} ${F.times} 4 = ${pA} out of 100, which is ${pA}%. ${pA}% is ${pA > pB ? 'more' : 'less'} than ${pB}%.`, 3)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_15.discount', topics: ['Y5_NC_15'], level: 3,
    make(R) {
      const price = R.int(4, 30) * 20;   // pounds, divisible by 4, 5 and 10
      const [f, p] = R.pick([[[1, 4], 20], [[1, 5], 25], [[1, 2], 40], [[2, 5], 25], [[1, 4], 30], [[1, 10], 20]]);
      const offA = price * f[0] / f[1], offB = price * p / 100;
      if (offA === offB) return null;
      const cheap = offA > offB ? 'A' : 'B', diff = Math.abs(offA - offB);
      return {
        marks: 2, method: true, answer: `Shop ${cheap}, by £${diff}`, guide: 'Award 1 mark for finding both sale prices or both amounts taken off.',
        check: () => (price - offA < price - offB) === (cheap === 'A') && diff * 100 === Math.abs(price * f[0] * 100 / f[1] - price * p),
        body: A => `<p>A bike costs <b>£${price}</b> in two shops.</p><p>Shop A takes ${F.frac(f[0], f[1])} off the price. Shop B takes ${p}% off the price.</p><p>Which shop is cheaper, and by how much?</p>${A.work(`A: £${price} ${F.minus} £${offA} = £${price - offA}; B: £${price} ${F.minus} £${offB} = £${price - offB}`, 28)}${A.boxes([[cheap, '', 'Shop'], [diff, '', 'cheaper by £']], { w: 18 })}`,
      };
    },
  });

  /* ======================= Addition and subtraction ======================= */

  // Y5_NC_05 add and subtract numbers with more than 4 digits
  add({
    id: 'Y5_NC_05.calc', topics: ['Y5_NC_05'], level: 1,
    make(R) {
      const sub = R.chance(0.5);
      const a = R.int(21000, 785000), b = R.int(10500, sub ? a - 1000 : 950000 - a);
      if (b < 10000) return null;
      const ans = sub ? a - b : a + b;
      return {
        marks: 1, answer: F.n(ans),
        check: () => sub ? ans + b === a : ans - a === b,
        body: A => `<p>Work out</p><div class="sent c">${F.n(a)} ${sub ? F.minus : '+'} ${F.n(b)} = ${A.blank(F.n(ans), 30)}</div>`,
      };
    },
  });
  add({
    id: 'Y5_NC_05.missing-digits', topics: ['Y5_NC_05'], level: 3,
    make(R) {
      const a = R.int(21000, 59999), b = R.int(12000, 39999), s = a + b;
      const as = String(a), bs = String(b), ss = String(s);
      if (ss.length !== 5) return null;
      const i = R.int(0, 4), j = R.intNot(0, 4, [i]);
      const pa = Math.pow(10, 4 - i), pb = Math.pow(10, 4 - j);
      const restA = a - +as[i] * pa, restB = b - +bs[j] * pb;
      let sols = 0;
      for (let x = 0; x <= 9; x++) for (let y = 0; y <= 9; y++) if (restA + x * pa + restB + y * pb === s && !(i === 0 && x === 0) && !(j === 0 && y === 0)) sols++;
      const cell = (d, hide, A) => `<td class="cd" style="border:0;width:8mm">${hide ? A.blank(d, 8) : d}</td>`;
      return {
        marks: 1, answer: `${as[i]} and ${bs[j]}`, guide: 'Both digits needed.',
        check: () => sols === 1,
        body: A => `<p>Write the missing digits to make this addition correct.</p>
          <table class="qt" style="border:0;font-size:14pt"><tr><td style="border:0"></td>${as.split('').map((d, k) => cell(d, k === i, A)).join('')}</tr>
          <tr><td style="border:0">+</td>${bs.split('').map((d, k) => cell(d, k === j, A)).join('')}</tr>
          <tr><td style="border:0"></td>${ss.split('').map(d => `<td class="cd" style="border:0;border-top:.4mm solid #000;border-bottom:.4mm solid #000"><b>${d}</b></td>`).join('')}</tr></table>`,
      };
    },
  });
  add({
    id: 'Y5_NC_05.word', topics: ['Y5_NC_05'], level: 3,
    make(R) {
      const f = R.int(0, 2);
      if (f === 0) {
        const a = R.int(120000, 480000), b = a + R.int(12000, 95000), ans = b - a;
        const town = R.pick(['Ashford', 'Bramley', 'Corfield', 'Dunmore', 'Elmbridge']);
        return { marks: 2, method: true, answer: F.n(ans), guide: 'Award 1 mark for a correct method with one arithmetic error.',
          check: () => a + ans === b,
          body: A => `<p>In 2010, <b>${F.n(a)}</b> people lived in ${town}.</p><p>In 2020, <b>${F.n(b)}</b> people lived there.</p><p>How many more people lived in ${town} in 2020 than in 2010?</p>${A.work(`${F.n(b)} ${F.minus} ${F.n(a)} = ${F.n(ans)}`, 28)}${A.box(F.n(ans), { w: 34 })}` };
      }
      if (f === 1) {
        const target = R.int(5, 9) * 10000, got = R.int(21000, target - 5000), ans = target - got;
        return { marks: 2, method: true, answer: '£' + F.n(ans), guide: 'Award 1 mark for a correct method with one arithmetic error.',
          check: () => got + ans === target,
          body: A => `<p>A charity wants to raise <b>£${F.n(target)}</b>.</p><p>So far it has raised <b>£${F.n(got)}</b>.</p><p>How much more money does it need to raise?</p>${A.work(`£${F.n(target)} ${F.minus} £${F.n(got)} = £${F.n(ans)}`, 28)}${A.box(F.n(ans), { pre: '£', w: 30 })}` };
      }
      const a = R.int(15000, 64000), b = R.int(15000, 64000), ans = a + b;
      return { marks: 2, method: true, answer: F.n(ans), guide: 'Award 1 mark for a correct method with one arithmetic error.',
        check: () => ans - b === a,
        body: A => `<p>A football club sold <b>${F.n(a)}</b> tickets in August and <b>${F.n(b)}</b> tickets in September.</p><p>How many tickets did it sell in the two months altogether?</p>${A.work(`${F.n(a)} + ${F.n(b)} = ${F.n(ans)}`, 28)}${A.box(F.n(ans), { w: 34 })}` };
    },
  });

  // Y5_NC_06 rounding to estimate and check; multi-step problems
  add({
    id: 'Y5_NC_06.estimate', topics: ['Y5_NC_06'], level: 1,
    make(R) {
      const sub = R.chance(0.5);
      const A1 = R.int(3, 9), B1 = R.int(1, A1 - 1);
      const a = A1 * 1000 + R.int(-140, 140), b = B1 * 1000 + R.int(-140, 140);
      const est = sub ? (A1 - B1) * 1000 : (A1 + B1) * 1000;
      if (est <= 0) return null;
      const opts = R.shuffle([est, est + 1000, est - 1000, est * 10].filter(x => x > 0));
      if (opts.length < 4) return null;
      const right = opts.indexOf(est);
      return {
        marks: 1, answer: F.n(est),
        check: () => Math.abs((sub ? a - b : a + b) - est) < 500 && Math.round(a / 1000) * 1000 === A1 * 1000,
        body: A => `<p>Circle the best estimate for</p><div class="sent c">${F.n(a)} ${sub ? F.minus : '+'} ${F.n(b)}</div>${A.circle(opts.map(o => F.n(o)), right)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_06.check', topics: ['Y5_NC_06'], level: 2,
    make(R) {
      const sub = R.chance(0.5), who = R.name();
      const a = R.int(41, 89) * 100 + R.int(1, 99), b = R.int(12, 38) * 100 + R.int(1, 99);
      const ans = sub ? a - b : a + b, wrong = ans + R.pick([-1000, 1000]);
      const ra = Math.round(a / 1000) * 1000, rb = Math.round(b / 1000) * 1000, est = sub ? ra - rb : ra + rb;
      if (Math.abs(wrong - est) < 800) return null;
      return {
        marks: 1, answer: `Estimate ${F.n(ra)} ${sub ? F.minus : '+'} ${F.n(rb)} = ${F.n(est)}`,
        guide: `Accept any correct rounding that shows the answer should be about ${F.n(est)}, not about ${F.n(Math.round(wrong / 1000) * 1000)}.`,
        check: () => Math.abs(ans - est) < Math.abs(wrong - est) && (sub ? ans + b === a : ans - b === a),
        body: A => `<p>${who} works out</p><div class="sent c">${F.n(a)} ${sub ? F.minus : '+'} ${F.n(b)} = ${F.n(wrong)}</div><p>Use rounding to explain why ${who}'s answer must be wrong.</p>${A.explain(`${F.n(a)} rounds to ${F.n(ra)} and ${F.n(b)} rounds to ${F.n(rb)}. ${F.n(ra)} ${sub ? F.minus : '+'} ${F.n(rb)} = ${F.n(est)}, so the answer should be close to ${F.n(est)}, not ${F.n(wrong)}.`, 3)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_06.multi-step', topics: ['Y5_NC_06'], level: 3,
    make(R) {
      const f = R.int(0, 1);
      if (f === 0) {
        const n = R.int(2400, 6800), a = R.int(600, 1900), b = R.int(400, 1500), ans = n - a - b;
        if (ans < 200) return null;
        return { marks: 2, method: true, answer: F.n(ans), guide: `Award 1 mark for ${F.n(a)} + ${F.n(b)} = ${F.n(a + b)} or a correct first subtraction.`,
          check: () => ans + b + a === n,
          body: A => `<p>A shop has <b>${F.n(n)}</b> cans of drink.</p><p>It sells <b>${F.n(a)}</b> cans on Monday and <b>${F.n(b)}</b> cans on Tuesday.</p><p>How many cans are left?</p>${A.work(`${F.n(a)} + ${F.n(b)} = ${F.n(a + b)}, ${F.n(n)} ${F.minus} ${F.n(a + b)} = ${F.n(ans)}`, 28)}${A.box(F.n(ans), { unit: 'cans' })}` };
      }
      const T = R.int(4, 9) * 1000, a = R.int(900, 2400), b = R.int(700, 1900), ans = T - a - b;
      if (ans < 200) return null;
      return { marks: 2, method: true, answer: '£' + F.n(ans), guide: `Award 1 mark for £${F.n(a)} + £${F.n(b)} = £${F.n(a + b)}.`,
        check: () => a + b + ans === T,
        body: A => `<p>A school wants to raise <b>£${F.n(T)}</b> for new books.</p><p>The summer fair raises <b>£${F.n(a)}</b> and a sponsored walk raises <b>£${F.n(b)}</b>.</p><p>How much more does the school need to raise?</p>${A.work(`£${F.n(a)} + £${F.n(b)} = £${F.n(a + b)}, £${F.n(T)} ${F.minus} £${F.n(a + b)} = £${F.n(ans)}`, 28)}${A.box(F.n(ans), { pre: '£' })}` };
    },
  });

  /* ======================= Multiplication and division (NC) ======================= */

  // Y5_NC_07 square and cube numbers, notation
  const sq = x => `${x}<sup>2</sup>`, cu = x => `${x}<sup>3</sup>`;
  add({
    id: 'Y5_NC_07.calc', topics: ['Y5_NC_07'], level: 1,
    make(R) {
      const f = R.int(0, 2);
      if (f === 0) { const n = R.int(3, 12), ans = n * n; return { marks: 1, answer: F.n(ans), check: () => Math.sqrt(ans) === n, body: A => `<p>Work out</p><div class="sent c">${sq(n)} = ${A.blank(ans, 18)}</div>` }; }
      if (f === 1) { const n = R.int(2, 6), ans = n * n * n; return { marks: 1, answer: F.n(ans), check: () => ans / n / n === n, body: A => `<p>Work out</p><div class="sent c">${cu(n)} = ${A.blank(ans, 18)}</div>` }; }
      const n = R.int(4, 12), s = n * n;
      return { marks: 1, answer: F.n(n), check: () => s / n === n, body: A => `<p>Write the missing number.</p><div class="sent c">${A.blank(n, 14)}<sup>2</sup> = ${s}</div>` };
    },
  });
  add({
    id: 'Y5_NC_07.tick-squares', topics: ['Y5_NC_07'], level: 2,
    make(R) {
      const cube = R.chance(0.35);
      const yes = cube ? R.sample([8, 27, 64, 125], 2) : R.sample([16, 25, 36, 49, 64, 81, 100, 121, 144], 2);
      const pool = cube ? [9, 12, 16, 18, 24, 30, 36, 49, 81, 100, 32, 60] : [12, 18, 24, 27, 32, 40, 45, 48, 50, 60, 72, 90, 99, 125];
      const no = R.sample(pool.filter(x => !yes.includes(x)), 3);
      const opts = R.shuffle([...yes, ...no]);
      const isIt = x => { const r = Math.round(cube ? Math.cbrt(x) : Math.sqrt(x)); return (cube ? r * r * r : r * r) === x; };
      const right = opts.map((x, i) => isIt(x) ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => opts[i]).join(' and '),
        check: () => right.length === 2,
        body: A => `<p>Tick the <b>two ${cube ? 'cube' : 'square'}</b> numbers.</p>${A.tick(opts, right)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_07.expression', topics: ['Y5_NC_07'], level: 2,
    make(R) {
      const a = R.int(2, 9), b = R.int(2, 4), f = R.int(0, 1);
      if (f === 0) {
        const ans = a * a + b * b * b;
        return { marks: 1, answer: F.n(ans), check: () => ans - Math.pow(b, 3) === Math.pow(a, 2), body: A => `<p>Work out</p><div class="sent c">${sq(a)} + ${cu(b)} = ${A.blank(ans, 18)}</div>` };
      }
      const x = a * a, y = b * b * b;
      if (x === y) return null;
      const opts = [sq(a), cu(b)], right = x > y ? 0 : 1;
      return { marks: 1, answer: opts[right], check: () => Math.pow(a, 2) !== Math.pow(b, 3) && ((Math.pow(a, 2) > Math.pow(b, 3)) === (right === 0)),
        body: A => `<p>Circle the greater number.</p>${A.circle(opts, right)}` };
    },
  });

  // Y5_NC_08 prime numbers to 19, prime factors, composite numbers
  const P19 = [2, 3, 5, 7, 11, 13, 17, 19];
  add({
    id: 'Y5_NC_08.prime-product', topics: ['Y5_NC_08'], level: 2,
    make(R) {
      const [p, q] = R.sample(P19, 2).sort((x, y) => x - y), N = p * q;
      if (N > 100) return null;
      const pairs = []; for (const x of P19) for (const y of P19) if (x < y && x * y === N) pairs.push([x, y]);
      return {
        marks: 1, answer: `${p} and ${q}`, guide: 'Accept the two numbers in either order.',
        check: () => pairs.length === 1 && pairs[0][0] === p && isPrime(p) && isPrime(q),
        body: A => `<p>Write two <b>prime</b> numbers that multiply to make <b>${N}</b>.</p><div class="sent c">${A.blank(p, 14)} ${F.times} ${A.blank(q, 14)} = ${N}</div>`,
      };
    },
  });
  add({
    id: 'Y5_NC_08.composite', topics: ['Y5_NC_08'], level: 2,
    make(R) {
      const want = R.pick(['composite', 'prime']);
      const ps = R.sample(P19.filter(x => x > 2), 3), cs = R.sample([4, 6, 8, 9, 10, 12, 14, 15, 16, 18], 3);
      const opts = R.shuffle([...ps, ...cs]);
      const right = opts.map((x, i) => (want === 'prime') === isPrime(x) ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => opts[i]).sort((a, b) => a - b).join(', '), guide: 'All three needed, and no others.',
        check: () => right.length === 3,
        body: A => `<p>Circle all the <b>${want}</b> numbers.</p>${A.circle(opts, right)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_08.explain', topics: ['Y5_NC_08'], level: 2,
    make(R) {
      const who = R.name(), N = R.pick([9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 57, 11, 13, 17, 19, 23, 29, 31, 37]);
      const prime = isPrime(N);
      let f = 0; if (!prime) for (let k = 3; k < N; k++) if (N % k === 0) { f = k; break; }
      return {
        marks: 1, answer: prime ? 'Yes' : 'No',
        guide: prime ? `Must say ${N} has only two factors, 1 and ${N}.` : `Must show a factor other than 1 and ${N}, e.g. ${f} ${F.times} ${N / f} = ${N}.`,
        check: () => prime === [...Array(N - 2).keys()].every(k => N % (k + 2) !== 0),
        body: A => `<p>${who} says, "<b>${N}</b> is a prime number."</p><p>Is ${who} correct? Tick one.</p>${A.tick(['Yes', 'No'], prime ? 0 : 1)}<p>Explain how you know.</p>${A.explain(prime ? `${N} has only two factors: 1 and ${N}.` : `${N} = ${f} ${F.times} ${N / f}, so it has more than two factors.`, 2)}`,
      };
    },
  });

  // Y5_NC_09 scaling by simple fractions; simple rates
  add({
    id: 'Y5_NC_09.recipe', topics: ['Y5_NC_09'], level: 3,
    make(R) {
      const [p, q] = R.pick([[4, 6], [4, 10], [6, 9], [4, 2], [6, 3], [8, 12], [2, 5]]);
      const ings = [['flour', 'g', R.int(4, 12) * 50], ['butter', 'g', R.int(2, 8) * 25], ['milk', 'ml', R.int(2, 8) * 50], ['sugar', 'g', R.int(2, 6) * 20]];
      const use = R.sample(ings, 3);
      const k = R.int(0, 2), [ing, u, amt] = use[k], ans = amt * q / p;
      if (use.some(x => (x[2] * q) % p !== 0)) return null;
      return {
        marks: 2, method: true, answer: F.n(ans) + ' ' + u, guide: `Award 1 mark for finding the amount for ${p / F.gcd(p, q) === p ? 1 : F.gcd(p, q)} ${F.gcd(p, q) === 1 ? 'person' : 'people'} or another correct step.`,
        check: () => ans * p === amt * q,
        body: A => `<p>Here is a recipe for pancakes for <b>${p} people</b>.</p>${A.table(use.map(x => [x[0], F.n(x[2]) + ' ' + x[1]]))}<p>How much <b>${ing}</b> is needed to make pancakes for <b>${q} people</b>?</p>${A.work(`${F.n(amt)} ${F.div} ${p} ${F.times} ${q} = ${F.n(ans)}`, 24)}${A.box(F.n(ans), { unit: u })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_09.rate', topics: ['Y5_NC_09'], level: 2,
    make(R) {
      const f = R.int(0, 2);
      if (f === 0) { const r = R.int(4, 12), t = R.int(6, 15), tot = r * t;
        return { marks: 1, answer: t + ' minutes', check: () => tot / r === t,
          body: A => `<p>A tap fills a tank with <b>${r} litres</b> of water every minute.</p><p>How many minutes does it take to fill a tank that holds <b>${tot} litres</b>?</p>${A.box(t, { unit: 'minutes' })}` }; }
      if (f === 1) { const r = R.pick([15, 20, 25, 30, 35, 40]), t = R.int(3, 12), tot = r * t;
        return { marks: 1, answer: F.n(tot) + ' pages', check: () => tot / t === r,
          body: A => `<p>A printer prints <b>${r} pages</b> every minute.</p><p>How many pages does it print in <b>${t} minutes</b>?</p>${A.box(F.n(tot), { unit: 'pages' })}` }; }
      const per = R.int(4, 9), km = R.int(2, 9) * 50, ans = per * km / 100;
      if (!Number.isInteger(ans)) return null;
      return { marks: 1, answer: ans + ' litres', check: () => ans * 100 === per * km,
        body: A => `<p>A car uses <b>${per} litres</b> of fuel for every 100 km.</p><p>How much fuel does it use to travel <b>${km} km</b>?</p>${A.box(ans, { unit: 'litres' })}` };
    },
  });
  add({
    id: 'Y5_NC_09.times-as', topics: ['Y5_NC_09'], level: 2,
    make(R) {
      const f = R.int(0, 1);
      if (f === 0) {
        const d = R.pick([2, 3, 4, 5]), n = R.int(1, d - 1), k = R.int(6, 25), H = d * k, ans = n * k;
        if (F.gcd(n, d) !== 1) return null;
        return { marks: 1, answer: ans + ' m', check: () => ans * d === H * n,
          body: A => `<p>Tower A is <b>${H} m</b> tall.</p><p>Tower B is ${F.frac(n, d)} of the height of Tower A.</p><p>How tall is Tower B?</p>${A.box(ans, { unit: 'm' })}` };
      }
      const k = R.int(3, 8), L = R.int(4, 15), ans = k * L, rev = R.chance(0.5);
      return { marks: 1, answer: (rev ? L : ans) + ' cm', check: () => ans / k === L,
        body: A => rev ? `<p>A blue ribbon is <b>${ans} cm</b> long.</p><p>It is ${k} times as long as a red ribbon.</p><p>How long is the red ribbon?</p>${A.box(L, { unit: 'cm' })}`
          : `<p>A red ribbon is <b>${L} cm</b> long.</p><p>A blue ribbon is ${k} times as long as the red ribbon.</p><p>How long is the blue ribbon?</p>${A.box(ans, { unit: 'cm' })}` };
    },
  });

  /* ======================= Measures, money, time ======================= */

  // Y5_008 convert between units, including simple decimals and fractions
  const UNITS = [['km', 'm', 1000], ['kg', 'g', 1000], ['litres', 'ml', 1000], ['m', 'cm', 100], ['cm', 'mm', 10]];
  add({
    id: 'Y5_008.convert', topics: ['Y5_008'], level: 1,
    make(R) {
      const [big, small, k] = R.pick(UNITS), f = R.int(0, 2);
      if (f === 2 && k === 10) return null;
      let v;   // amount in the small unit
      if (f === 2) { const [n, d] = R.pick([[1, 2], [1, 4], [3, 4], [1, 10], [3, 10], [1, 5], [2, 5]]); v = k * n / d; if (!Number.isInteger(v)) return null;
        return { marks: 1, answer: F.n(v) + ' ' + small, check: () => v * d === n * k,
          body: A => `<p>Write the missing number.</p><div class="sent c">${F.frac(n, d)} ${big === 'litres' ? 'litre' : big} = ${A.blank(F.n(v), 20)} ${small}</div>` }; }
      v = k === 10 ? R.int(11, 99) : k === 100 ? R.int(101, 999) : R.pick([R.int(11, 99) * 50, R.int(101, 999) * 10, R.int(1001, 9999)]);
      if (v % k === 0) return null;
      const dp = Math.round(Math.log10(k)), bigText = dec(v, dp);
      const toSmall = f === 0;
      return {
        marks: 1, answer: toSmall ? F.n(v) + ' ' + small : bigText + ' ' + big,
        check: () => Math.round(num(bigText) * k) === v,
        body: A => `<p>Write the missing number.</p><div class="sent c">${toSmall ? `${bigText} ${big} = ${A.blank(F.n(v), 22)} ${small}` : `${F.n(v)} ${small} = ${A.blank(bigText, 22)} ${big}`}</div>`,
      };
    },
  });
  add({
    id: 'Y5_008.greatest', topics: ['Y5_008'], level: 2,
    make(R) {
      const [big, small, k] = R.pick(UNITS.slice(0, 3));
      const base = R.int(1, 3) * k;
      const vals = R.ints(4, -4, 4).map(x => base + x * k / 20 + R.pick([0, k / 100]));
      if (new Set(vals).size < 4 || vals.some(v => v <= 0)) return null;
      const show = vals.map((v, i) => i % 2 === 0 ? `${dec(v * 1000 / k, 3)} ${big}` : `${F.n(v)} ${small}`);
      const heavy = R.chance(0.5);
      const best = vals.indexOf(heavy ? Math.max(...vals) : Math.min(...vals));
      const word = { kg: ['heaviest', 'lightest'], km: ['longest', 'shortest'], litres: ['greatest amount', 'smallest amount'] }[big][heavy ? 0 : 1];
      return {
        marks: 1, answer: show[best],
        check: () => show.every((s, i) => { const m = s.endsWith(' ' + small) ? num(s.split(' ')[0]) : num(s.split(' ')[0]) * k; return heavy ? m <= vals[best] + 1e-9 : m >= vals[best] - 1e-9; }),
        body: A => `<p>Circle the <b>${word}</b>.</p>${A.circle(show, best)}`,
      };
    },
  });
  add({
    id: 'Y5_008.word', topics: ['Y5_008'], level: 3,
    make(R) {
      const who = R.name();
      const f = R.int(0, 1);
      if (f === 0) {
        const L = R.int(2, 3), g = R.int(4, 9) * 25, n = R.int(3, 6), ans = L * 1000 - g * n;
        if (ans <= 0) return null;
        return { marks: 2, method: true, answer: F.n(ans) + ' ml', guide: `Accept ${dec(ans, 3)} litres. Award 1 mark for ${n} ${F.times} ${g} = ${F.n(g * n)} ml.`,
          check: () => ans + n * g === L * 1000,
          body: A => `<p>A jug holds <b>${L} litres</b> of juice.</p><p>${who} pours <b>${n}</b> glasses of juice. Each glass holds <b>${g} ml</b>.</p><p>How much juice is left in the jug? Give your answer in millilitres.</p>${A.work(`${n} ${F.times} ${g} = ${F.n(n * g)} ml, ${F.n(L * 1000)} ${F.minus} ${F.n(n * g)} = ${F.n(ans)} ml`, 26)}${A.box(F.n(ans), { unit: 'ml' })}` };
      }
      const L = R.int(3, 6), p = R.int(15, 45) * 5, n = R.int(2, 4), cm = L * 100 - p * n;
      if (cm <= 0) return null;
      return { marks: 2, method: true, answer: F.n(cm) + ' cm', guide: `Accept ${dec(cm, 2)} m. Award 1 mark for ${n} ${F.times} ${p} = ${F.n(p * n)} cm.`,
        check: () => cm + n * p === L * 100,
        body: A => `<p>A roll of ribbon is <b>${L} m</b> long.</p><p>${who} cuts off <b>${n}</b> pieces. Each piece is <b>${p} cm</b> long.</p><p>How much ribbon is left? Give your answer in centimetres.</p>${A.work(`${n} ${F.times} ${p} = ${F.n(n * p)} cm, ${L * 100} ${F.minus} ${F.n(n * p)} = ${F.n(cm)} cm`, 26)}${A.box(F.n(cm), { unit: 'cm' })}` };
    },
  });

  // Y5_NC_16 approximate equivalents: inches, pounds, pints
  add({
    id: 'Y5_NC_16.convert', topics: ['Y5_NC_16'], level: 2,
    make(R) {
      const f = R.int(0, 3);
      if (f === 0) { const n = R.int(2, 20), t = n * 25;   // tenths of a cm
        return { marks: 1, answer: dec(t, 1) + ' cm', check: () => t / 25 === n,
          body: A => `<p>1 inch is about <b>2.5 cm</b>.</p><p>About how many centimetres is <b>${n} inches</b>?</p>${A.box(dec(t, 1), { unit: 'cm' })}` }; }
      if (f === 1) { const n = R.int(2, 16), cm = n * 5, ins = cm * 2 / 5;
        return { marks: 1, answer: F.n(ins) + ' inches', check: () => ins * 25 === cm * 10,
          body: A => `<p>1 inch is about <b>2.5 cm</b>.</p><p>A pencil is <b>${cm} cm</b> long. About how many inches is that?</p>${A.box(ins, { unit: 'inches' })}` }; }
      if (f === 2) { const n = R.int(2, 12), t = n * 22;
        return { marks: 1, answer: dec(t, 1) + ' pounds', check: () => t / 22 === n,
          body: A => `<p>1 kg is about <b>2.2 pounds</b>.</p><p>A bag of potatoes weighs <b>${n} kg</b>. About how many pounds is that?</p>${A.box(dec(t, 1), { unit: 'pounds' })}` }; }
      const n = R.int(2, 8), ml = n * 570;
      return { marks: 1, answer: F.n(ml) + ' ml', check: () => ml / 570 === n,
        body: A => `<p>1 pint is about <b>570 ml</b>.</p><p>A jug holds <b>${n} pints</b> of milk. About how many millilitres is that?</p>${A.box(F.n(ml), { unit: 'ml' })}` };
    },
  });
  add({
    id: 'Y5_NC_16.compare', topics: ['Y5_NC_16'], level: 2,
    make(R) {
      const f = R.int(0, 2);
      let a, b, fact, ta, tb;   // compared in the metric unit (tenths)
      if (f === 0) { const n = R.int(4, 20), c = n * 25 + R.pick([-1, 1]) * R.int(3, 12) * 5; a = n * 25; b = c; fact = '1 inch is about 2.5 cm.'; ta = `${n} inches`; tb = `${dec(c, 1)} cm`; }
      else if (f === 1) { const n = R.int(2, 10), k = n * 22 + R.pick([-1, 1]) * R.int(2, 8) * 5; a = n * 22; b = k; fact = '1 kg is about 2.2 pounds.'; ta = `${dec(k, 1)} pounds`; tb = `${n} kg`; [a, b] = [k, n * 22]; }
      else { const n = R.int(2, 8), ml = n * 570 + R.pick([-1, 1]) * R.int(1, 3) * 100; a = n * 570; b = ml; fact = '1 pint is about 570 ml.'; ta = `${n} pints`; tb = `${dec(ml, 3)} litres`; }
      if (a === b || b <= 0) return null;
      const right = a > b ? 0 : 1, word = f === 0 ? 'longer' : f === 1 ? 'heavier' : 'more';
      return {
        marks: 1, answer: [ta, tb][right],
        check: () => (a > b) === (right === 0),
        body: A => `<p>${fact}</p><p>Circle the one that is <b>${word}</b>.</p>${A.circle([ta, tb], right)}`,
      };
    },
  });

  // Y5_NC_18 estimate volume and capacity
  const CAP = [['a mug', 300], ['a can of drink', 330], ['a bucket', 10000], ['a bath', 150000], ['a watering can', 5000], ['a teapot', 1000], ['a kitchen sink', 20000], ['a glass', 200], ['a large bottle of water', 2000], ['a paddling pool', 400000]];
  const fmtCap = ml => ml >= 1000 ? `${F.n(ml / 1000)} ${ml === 1000 ? 'litre' : 'litres'}` : `${F.n(ml)} ml`;
  add({
    id: 'Y5_NC_18.estimate', topics: ['Y5_NC_18'], level: 1,
    make(R) {
      const [thing, ml] = R.pick(CAP), sh = R.int(0, 2);
      const opts = [ml / 100, ml / 10, ml, ml * 10].map(x => x * Math.pow(10, sh - 1) / Math.pow(10, sh - 1));
      if (opts.some(o => o < 1 || !Number.isInteger(o))) return null;
      const right = opts.indexOf(ml);
      return {
        marks: 1, answer: fmtCap(ml),
        check: () => opts.filter(o => o === ml).length === 1,
        body: A => `<p>Circle the best estimate for the capacity of <b>${thing}</b>.</p>${A.circle(opts.map(fmtCap), right)}`,
      };
    },
  });
  // cuboid made of 1 cm cubes, oblique drawing (front face true size)
  function cubeCuboid(l, w, h, c = 7) {
    const dx = c * 0.5, dy = c * 0.4, ox = 2, oy = 2 + w * dy;
    let s = '';
    for (let i = 0; i < l; i++) for (let j = 0; j < h; j++) s += D.box(ox + i * c, oy + j * c, c, c, 'solid');
    for (let i = 0; i < l; i++) for (let k = 0; k < w; k++) {
      const x = ox + i * c + k * dx, y = oy - k * dy;
      s += D.poly([[x, y], [x + c, y], [x + c + dx, y - dy], [x + dx, y - dy]], 'solid');
    }
    for (let k = 0; k < w; k++) for (let j = 0; j < h; j++) {
      const x = ox + l * c + k * dx, y = oy + j * c - k * dy;
      s += D.poly([[x, y], [x + dx, y - dy], [x + dx, y - dy + c], [x, y + c]], 'solid');
    }
    return D.svg(ox + l * c + w * dx + 2, oy + h * c + 2, s);
  }
  add({
    id: 'Y5_NC_18.cubes', topics: ['Y5_NC_18'], level: 2,
    make(R) {
      const l = R.int(2, 5), w = R.int(2, 3), h = R.int(1, 3), vol = l * w * h;
      let count = 0; for (let k = 0; k < h; k++) for (let j = 0; j < w; j++) for (let i = 0; i < l; i++) count++;
      return {
        marks: 1, answer: vol + ' cm³',
        check: () => count === vol,
        body: A => `<p>This cuboid is made from centimetre cubes.</p>${cubeCuboid(l, w, h)}<p>What is the volume of the cuboid?</p>${A.box(vol, { unit: 'cm³' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_18.cups', topics: ['Y5_NC_18'], level: 2,
    make(R) {
      const [big, L] = R.pick([['bucket', R.int(5, 12)], ['tank', R.int(10, 30)], ['large pan', R.int(2, 6)]]);
      const c = R.pick([100, 200, 250, 500]), ans = L * 1000 / c;
      if (!Number.isInteger(ans)) return null;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans * c === L * 1000,
        body: A => `<p>A ${big} holds about <b>${L} litres</b> of water.</p><p>A cup holds about <b>${c} ml</b>.</p><p>About how many cups of water would fill the ${big}?</p>${A.box(ans, { unit: 'cups' })}`,
      };
    },
  });

  // Y5_NC_19 money problems with all four operations
  add({
    id: 'Y5_NC_19.change', topics: ['Y5_NC_19'], level: 3,
    make(R) {
      const who = R.name();
      const k = R.int(2, 4), a = R.int(95, 450), b = R.int(120, 690), note = R.pick([1000, 2000]);
      const cost = k * a + b, ch = note - cost;
      if (ch <= 0 || a % 5 === 0 && b % 5 === 0) return null;
      const [x, y] = R.pick([['notebooks', 'a pen'], ['drinks', 'a sandwich'], ['tickets', 'a programme'], ['packets of seeds', 'a plant pot']]);
      return {
        marks: 2, method: true, answer: F.money(ch), guide: `Award 1 mark for the total cost ${F.money(cost)}.`,
        check: () => ch + b + k * a === note,
        body: A => `<p>${who} buys <b>${k}</b> ${x} that cost <b>${F.money(a)}</b> each and ${y} that costs <b>${F.money(b)}</b>.</p><p>${who} pays with a <b>${F.money(note).replace('.00', '')}</b> note. How much change does ${who} get?</p>${A.work(`${k} ${F.times} ${F.money(a)} = ${F.money(k * a)}, + ${F.money(b)} = ${F.money(cost)}, ${F.money(note)} ${F.minus} ${F.money(cost)} = ${F.money(ch)}`, 28)}${A.box(dec(ch, 2), { pre: '£' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_19.scaling', topics: ['Y5_NC_19'], level: 3,
    make(R) {
      const u = R.int(120, 990), n1 = R.int(3, 5), n2 = R.intNot(2, 9, [n1]);
      if (u % 10 === 0 && R.chance(0.5)) return null;
      const t1 = u * n1, t2 = u * n2;
      const thing = R.pick(['cinema tickets', 'train tickets', 'swimming passes', 'museum tickets']);
      return {
        marks: 2, method: true, answer: F.money(t2), guide: `Award 1 mark for the cost of one: ${F.money(u)}.`,
        check: () => t2 / n2 === t1 / n1,
        body: A => `<p><b>${n1}</b> ${thing} cost <b>${F.money(t1)}</b>.</p><p>How much do <b>${n2}</b> ${thing} cost?</p>${A.work(`${F.money(t1)} ${F.div} ${n1} = ${F.money(u)}, ${F.money(u)} ${F.times} ${n2} = ${F.money(t2)}`, 26)}${A.box(dec(t2, 2), { pre: '£' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_19.best-buy', topics: ['Y5_NC_19'], level: 2,
    make(R) {
      const a = R.pick([4, 5, 6]), b = R.pick([8, 10, 12]), ua = R.int(25, 60), ub = ua + R.pick([-1, 1]) * R.int(2, 6);
      if (b % a === 0 && b / a === 2 && false) return null;
      const pa = a * ua, pb = b * ub;
      const win = ua < ub ? 'A' : 'B';
      return {
        marks: 1, answer: `Pack ${win}`,
        guide: `Explanation must compare the price of one item (${ua}p and ${ub}p) or the price of the same number of items.`,
        check: () => (pa / a < pb / b) === (win === 'A') && pa % a === 0 && pb % b === 0,
        body: A => `<p>A shop sells pencils in two packs.</p>${A.table([['Pack A', `${a} pencils`, F.money(pa)], ['Pack B', `${b} pencils`, F.money(pb)]])}<p>Which pack is better value? Explain how you know.</p>${A.explain(`Pack ${win}. In Pack A one pencil costs ${F.money(pa)} ${F.div} ${a} = ${ua}p. In Pack B one pencil costs ${F.money(pb)} ${F.div} ${b} = ${ub}p.`, 3)}`,
      };
    },
  });

  // Y5_NC_20 converting between units of time
  add({
    id: 'Y5_NC_20.convert', topics: ['Y5_NC_20'], level: 1,
    make(R) {
      const who = R.name();
      const f = R.int(0, 4);
      if (f === 0) { const h = R.int(2, 6), m = R.int(5, 55), ans = h * 60 + m;
        return { marks: 1, answer: ans + ' minutes', check: () => Math.floor(ans / 60) === h && ans % 60 === m,
          body: A => `<p>Write the missing number.</p><div class="sent c">${h} hours ${m} minutes = ${A.blank(ans, 18)} minutes</div>` }; }
      if (f === 1) { const t = R.int(130, 420); if (t % 60 === 0) return null; const h = Math.floor(t / 60), m = t % 60;
        return { marks: 1, answer: `${h} hours ${m} minutes`, check: () => h * 60 + m === t,
          body: A => `<p>Write the missing numbers.</p><div class="sent c">${t} minutes = ${A.blank(h, 12)} hours ${A.blank(m, 12)} minutes</div>` }; }
      if (f === 2) { const t = R.int(70, 400); if (t % 60 === 0) return null; const m = Math.floor(t / 60), s = t % 60;
        return { marks: 1, answer: `${m} minutes ${s} seconds`, check: () => m * 60 + s === t,
          body: A => `<p>Write the missing numbers.</p><div class="sent c">${t} seconds = ${A.blank(m, 12)} minutes ${A.blank(s, 12)} seconds</div>` }; }
      if (f === 3) { const w = R.int(3, 12), d = R.int(1, 6), ans = w * 7 + d;
        return { marks: 1, answer: ans + ' days', check: () => (ans - d) / 7 === w,
          body: A => `<p>Write the missing number.</p><div class="sent c">${w} weeks and ${d} ${d === 1 ? 'day' : 'days'} = ${A.blank(ans, 16)} days</div>` }; }
      const y = R.int(2, 9), mo = R.int(1, 11), ans = y * 12 + mo;
      return { marks: 1, answer: ans + ' months', check: () => Math.floor(ans / 12) === y,
        body: A => `<p>${who} is ${y} years and ${mo} ${mo === 1 ? 'month' : 'months'} old.</p><p>How old is that in months?</p>${A.box(ans, { unit: 'months' })}` };
    },
  });
  add({
    id: 'Y5_NC_20.end-time', topics: ['Y5_NC_20'], level: 2,
    make(R) {
      const h = R.int(9, 19), m = R.int(0, 11) * 5, dur = R.int(14, 40) * 5;
      const end = h * 60 + m + dur, eh = Math.floor(end / 60), em = end % 60;
      if (eh > 23) return null;
      const back = R.chance(0.4);
      const ev = R.pick(['A film', 'A football match', 'A school trip', 'A concert']);
      return {
        marks: 1, answer: back ? `${dur} minutes` : F.t24(eh, em),
        guide: back ? `Accept ${Math.floor(dur / 60)} hours ${dur % 60} minutes.` : `Accept ${F.t12(eh, em)}.`,
        check: () => (eh * 60 + em) - (h * 60 + m) === dur,
        body: A => back ? `<p>${ev} starts at <b>${F.t24(h, m)}</b> and ends at <b>${F.t24(eh, em)}</b>.</p><p>How many minutes does it last?</p>${A.box(dur, { unit: 'minutes' })}`
          : `<p>${ev} starts at <b>${F.t24(h, m)}</b>. It lasts <b>${dur} minutes</b>.</p><p>What time does it end?</p>${A.box(F.t24(eh, em), { w: 28 })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_20.compare', topics: ['Y5_NC_20'], level: 2,
    make(R) {
      const m = R.int(2, 6), q = R.pick([[1, 4], [1, 2], [3, 4]]), secA = m * 60 + 60 * q[0] / q[1];
      const secB = secA + R.pick([-1, 1]) * R.int(1, 5) * 5;
      const opts = [`${F.mixed(m, q[0], q[1])} minutes`, `${secB} seconds`], right = secA > secB ? 0 : 1;
      return {
        marks: 1, answer: opts[right], guide: `${F.mixed(m, q[0], q[1])} minutes = ${secA} seconds.`,
        check: () => secA !== secB && (secA > secB) === (right === 0),
        body: A => `<p>Circle the <b>longer</b> time.</p>${A.circle(opts, right)}`,
      };
    },
  });

  /* ======================= Geometry ======================= */

  // Y5_018 compare and estimate angles
  const angType = d => d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : 'reflex';
  add({
    id: 'Y5_018.estimate', topics: ['Y5_018'], level: 1,
    make(R) {
      const deg = R.int(3, 34) * 5;
      if (deg % 10 === 5 || deg === 90) return null;
      const others = R.sample([10, 20, 30, 40, 50, 60, 70, 80, 100, 110, 120, 130, 140, 150, 160, 170, 200, 250, 300].filter(x => Math.abs(x - deg) >= 40), 3);
      const opts = [deg, ...others].sort((a, b) => a - b), right = opts.indexOf(deg), rot = R.int(0, 7) * 45;
      return {
        marks: 1, answer: deg + '°',
        check: () => opts.every((o, i) => i === right || Math.abs(o - deg) >= 40),
        body: A => `<p>Circle the best estimate for the size of this angle.</p>${D.angle({ deg, rot, len: 22 })}${A.circle(opts.map(o => o + '°'), right)}`,
      };
    },
  });
  add({
    id: 'Y5_018.which-type', topics: ['Y5_018'], level: 1,
    make(R) {
      const degs = R.shuffle([R.int(4, 16) * 5, R.int(20, 33) * 5, R.int(39, 66) * 5]);
      const want = R.pick(['acute', 'obtuse', 'reflex']);
      const right = degs.findIndex(d => angType(d) === want);
      const L = ['A', 'B', 'C'];
      const figs = degs.map((d, i) => ({ fig: D.angle({ deg: d, rot: R.int(0, 11) * 30, len: 15 }), cap: L[i] }));
      return {
        marks: 1, answer: L[right],
        check: () => degs.filter(d => angType(d) === want).length === 1,
        body: A => `<p>Which angle is <b>${want}</b>? Circle its letter.</p>${D.row(figs, 10)}${A.circle(L, right)}`,
      };
    },
  });
  add({
    id: 'Y5_018.order', topics: ['Y5_018'], level: 2,
    make(R) {
      const base = R.pick([[25, 85], [95, 170]]);
      const degs = R.ints(3, base[0] / 5, base[1] / 5).map(x => x * 5);
      const s = degs.slice().sort((a, b) => a - b);
      if (s[1] - s[0] < 15 || s[2] - s[1] < 15) return null;
      const L = ['A', 'B', 'C'];
      const figs = degs.map((d, i) => ({ fig: D.angle({ deg: d, rot: R.int(0, 11) * 30, len: 15 }), cap: L[i] }));
      const ans = s.map(d => L[degs.indexOf(d)]).join(', ');
      return {
        marks: 1, answer: ans,
        check: () => ans.split(', ').every((l, i, a) => i === 0 || degs[L.indexOf(a[i - 1])] < degs[L.indexOf(l)]),
        body: A => `<p>Write the letters of these angles in order of size, starting with the <b>smallest</b>.</p>${D.row(figs, 10)}${A.line(ans, 50)}`,
      };
    },
  });

  // new_d_n8bvzswy_4_mwtc1a4g measure and draw angles in degrees (printed true size)
  const MA2 = 'new_d_n8bvzswy_4_mwtc1a4g';
  add({
    id: MA2 + '.measure', topics: [MA2], level: 2,
    make(R) {
      const deg = R.int(4, 33) * 5;
      if (deg === 90) return null;
      const rot = R.int(0, 23) * 15;
      return {
        marks: 1, answer: deg + '°', guide: `Accept ${deg - 2}° to ${deg + 2}°.`,
        check: () => deg > 0 && deg < 180 && angType(deg) !== 'right',
        body: A => `<p>Measure the size of this angle. Use a protractor.</p>${D.angle({ deg, rot, len: 40 })}${A.box(deg, { unit: '°' })}`,
      };
    },
  });
  // a base arm from P; the scheme draws the second arm in red
  function drawAngleTask(deg, A) {
    const L = 48, L2 = 42, a = deg * Math.PI / 180;
    const left = Math.max(0, -Math.cos(a) * L2) + 8, top = Math.sin(a) * L2 + 6;
    const P = [left, top];
    let s = D.line(P[0], P[1], P[0] + L, P[1], 'arm') + `<circle cx="${D.r2(P[0])}" cy="${D.r2(P[1])}" r="0.8" class="fillk"/>` + D.txt(P[0] - 1, P[1] + 5, 'P', { size: 3.8, bold: true });
    if (A.show) s += D.line(P[0], P[1], P[0] + Math.cos(a) * L2, P[1] - Math.sin(a) * L2, 'ansl');
    return D.svg(left + L + 4, top + 8, s);
  }
  add({
    id: MA2 + '.draw', topics: [MA2], level: 2,
    make(R) {
      const deg = R.int(5, 33) * 5;
      if (deg === 90 || deg === 180) return null;
      return {
        marks: 1, answer: `Angle of ${deg}° drawn at P`, guide: `Accept ${deg - 2}° to ${deg + 2}°. The angle must be measured from the line, at P.`,
        check: () => Math.abs(Math.cos(deg * Math.PI / 180)) < 1,
        body: A => `<p>Use a protractor. Draw an angle of <b>${deg}°</b> at point P, using the line below as one arm.</p>${drawAngleTask(deg, A)}`,
      };
    },
  });
  add({
    id: MA2 + '.triangle', topics: [MA2], level: 2,
    make(R) {
      const deg = R.int(7, 23) * 5;
      if (deg === 90) return null;
      const rot = R.pick([0, 0, 15, -15, 30]), a0 = rot * Math.PI / 180, a1 = (rot + deg) * Math.PI / 180;
      const L1 = R.int(42, 52), L2 = R.int(34, 44);
      const pts = [[0, 0], [L1 * Math.cos(a0), -L1 * Math.sin(a0)], [L2 * Math.cos(a1), -L2 * Math.sin(a1)]];
      const ang = () => { const u = pts[1], v = pts[2]; return Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v)) * 180 / Math.PI; };
      return {
        marks: 1, answer: deg + '°', guide: `Accept ${deg - 2}° to ${deg + 2}°.`,
        check: () => Math.abs(ang() - deg) < 1e-6,
        body: A => `<p>Measure angle <b>a</b> in this triangle. Use a protractor.</p>${D.shape({ pts, angles: [{ i: 0, text: 'a' }] })}${A.box(deg, { unit: '°' })}`,
      };
    },
  });

  // L-shape used for area, perimeter and missing sides (units; y down)
  function lShape(R, lo, hi) {
    const W = R.int(lo, hi), H = R.int(lo, hi), cw = R.int(2, W - 2), ch = R.int(2, H - 2);
    const pts = [[0, 0], [W, 0], [W, H - ch], [W - cw, H - ch], [W - cw, H], [0, H]];
    return { W, H, cw, ch, pts, area: W * H - cw * ch };
  }
  function lFig(q, k, labels) {
    return D.shape({ pts: q.pts.map(p => [p[0] * k, p[1] * k]), labels, right: [0, 1, 2, 4, 5], cls: 'shape' });
  }

  // Y5_019 compare areas; area of rectangles, squares and composite rectilinear shapes
  function cellsShape(R) {   // rectangle with a notch on one edge, as cells
    const W = R.int(4, 7), H = R.int(3, 5), nw = R.int(1, W - 2), nh = R.int(1, H - 1), nx = R.int(0, W - nw);
    const cells = [];
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (!(x >= nx && x < nx + nw && y >= H - nh)) cells.push([x, y]);
    const edge = nx === 0 || nx + nw === W;
    return { W, H, nw, nh, nx, cells, edge };
  }
  const cellPolys = (cells, ox, oy) => cells.map(([x, y]) => ({ pts: [[x + ox, y + oy], [x + ox + 1, y + oy], [x + ox + 1, y + oy + 1], [x + ox, y + oy + 1]] }));
  function boundary(cells) {
    const has = new Set(cells.map(c => c.join(',')));
    let e = 0; for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!has.has((x + dx) + ',' + (y + dy))) e++;
    return e;
  }
  add({
    id: 'Y5_019.count', topics: ['Y5_019'], level: 1,
    make(R) {
      const s = cellsShape(R), ar = s.cells.length;
      return {
        marks: 1, answer: ar + ' cm²',
        check: () => ar === s.W * s.H - s.nw * s.nh,
        body: A => `<p>Each square on the grid is 1 square centimetre.</p><p>What is the area of the shaded shape?</p>${D.grid({ cols: s.W + 2, rows: s.H + 2, cell: 6, polys: cellPolys(s.cells, 1, 1) }, A)}${A.box(ar, { unit: 'cm²' })}`,
      };
    },
  });
  add({
    id: 'Y5_019.rectangle', topics: ['Y5_019'], level: 1,
    make(R) {
      const l = R.int(6, 25), w = R.int(3, 12), u = R.pick(['cm', 'm']), back = R.chance(0.35);
      if (l <= w) return null;
      const ar = l * w, k = Math.min(4, 90 / l, 40 / w);
      const pts = [[0, 0], [l * k, 0], [l * k, w * k], [0, w * k]];
      return {
        marks: 1, answer: back ? `${w} ${u}` : `${ar} ${u}²`,
        check: () => ar / l === w,
        body: A => back ? `<p>The area of this rectangle is <b>${ar} ${u}²</b>.</p>${D.shape({ pts, labels: [`${l} ${u}`, '?', '', ''], right: [0, 1, 2, 3] })}<p>What is the length of the missing side?</p>${A.box(w, { unit: u })}`
          : `<p>What is the area of this rectangle?</p>${D.shape({ pts, labels: [`${l} ${u}`, `${w} ${u}`, '', ''], right: [0, 1, 2, 3] })}${A.box(ar, { unit: u + '²' })}`,
      };
    },
  });
  add({
    id: 'Y5_019.composite', topics: ['Y5_019'], level: 3,
    make(R) {
      const q = lShape(R, 6, 16), u = R.pick(['cm', 'm']);
      const k = Math.min(4, 70 / q.W, 28 / q.H);
      const labels = [`${q.W} ${u}`, `${q.H - q.ch} ${u}`, '', '', `${q.W - q.cw} ${u}`, `${q.H} ${u}`];
      return {
        marks: 2, method: true, answer: `${q.area} ${u}²`, guide: 'Award 1 mark for a correct method (splitting into rectangles, or the large rectangle take away the missing corner) with one error.',
        check: () => area(q.pts) === q.area && q.W * (q.H - q.ch) + (q.W - q.cw) * q.ch === q.area,
        body: A => `<p>This shape is made from rectangles. All the corners are right angles. Work out the area of the shape.</p>${lFig(q, k, labels)}${A.work(`${q.W} ${F.times} ${q.H - q.ch} = ${q.W * (q.H - q.ch)}, ${q.W - q.cw} ${F.times} ${q.ch} = ${(q.W - q.cw) * q.ch}, total ${q.area}`, 18)}${A.box(q.area, { unit: u + '²' })}`,
      };
    },
  });
  add({
    id: 'Y5_019.compare', topics: ['Y5_019'], level: 2,
    make(R) {
      const a = cellsShape(R), b = cellsShape(R);
      const ar = a.cells.length, br = b.cells.length;
      if (ar === br || Math.abs(ar - br) > 6 || a.W + b.W > 14) return null;
      const big = ar > br ? 'A' : 'B', diff = Math.abs(ar - br);
      const polys = [...cellPolys(a.cells, 1, 1), ...cellPolys(b.cells, a.W + 3, 1)];
      const rows = Math.max(a.H, b.H) + 2;
      return {
        marks: 1, answer: `${big}, by ${diff} squares`, guide: 'Both parts needed.',
        check: () => (boundary(a.cells) > 0) && (a.W * a.H - a.nw * a.nh > b.W * b.H - b.nw * b.nh) === (big === 'A'),
        body: A => `<p>Here are two shapes on a squared grid. Shape A is on the left and shape B is on the right.</p>${D.grid({ cols: a.W + b.W + 4, rows, cell: 6, polys }, A)}<p>Which shape has the larger area, and by how many squares?</p>${A.boxes([[big, '', 'Shape'], [diff, 'squares', 'by']], { w: 16 })}`,
      };
    },
  });

  // Y5_NC_17 perimeter of composite rectilinear shapes in cm and m
  add({
    id: 'Y5_NC_17.composite', topics: ['Y5_NC_17'], level: 3,
    make(R) {
      const q = lShape(R, 6, 18), u = R.pick(['cm', 'm']);
      const k = Math.min(4, 70 / q.W, 28 / q.H), P = 2 * (q.W + q.H);
      const labels = [`${q.W} ${u}`, `${q.H - q.ch} ${u}`, `${q.cw} ${u}`, `${q.ch} ${u}`, `${q.W - q.cw} ${u}`, `${q.H} ${u}`];
      const hide = R.sample([2, 3], 1)[0];
      const lab = labels.map((t, i) => i === hide ? '' : t);
      return {
        marks: 2, method: true, answer: `${P} ${u}`, guide: 'Award 1 mark for finding the missing length or adding all six sides with one error.',
        check: () => Math.abs(perim(q.pts) - P) < 1e-9,
        body: A => `<p>All the corners of this shape are right angles. What is the perimeter of the shape?</p>${lFig(q, k, lab)}${A.work(`missing side = ${hide === 2 ? `${q.W} ${F.minus} ${q.W - q.cw} = ${q.cw}` : `${q.H} ${F.minus} ${q.H - q.ch} = ${q.ch}`}; perimeter = ${labels.map(t => t.split(' ')[0]).join(' + ')} = ${P}`, 18)}${A.box(P, { unit: u })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_17.grid', topics: ['Y5_NC_17'], level: 2,
    make(R) {
      const s = cellsShape(R), P = boundary(s.cells);
      return {
        marks: 1, answer: P + ' cm',
        check: () => P === 2 * (s.W + s.H) + (s.edge ? 0 : 2 * s.nh),
        body: A => `<p>Each square on the grid is 1 cm long.</p><p>What is the perimeter of the shaded shape?</p>${D.grid({ cols: s.W + 2, rows: s.H + 2, cell: 6, polys: cellPolys(s.cells, 1, 1) }, A)}${A.box(P, { unit: 'cm' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_17.mixed-units', topics: ['Y5_NC_17'], level: 2,
    make(R) {
      const lm = R.int(11, 39), wc = R.int(25, 95);   // length in tenths of a metre, width in cm
      if (lm % 10 === 0 || wc % 5 !== 0) return null;
      const P = 2 * (lm * 10 + wc);
      return {
        marks: 1, answer: P + ' cm', guide: `Accept ${dec(P, 2)} m.`,
        check: () => P / 2 - wc === lm * 10,
        body: A => `<p>A rectangular table top is <b>${dec(lm, 1)} m</b> long and <b>${wc} cm</b> wide.</p><p>What is its perimeter in centimetres?</p>${A.box(P, { unit: 'cm' })}`,
      };
    },
  });

  // Y5_NC_23 3D shapes from 2D drawings
  const SOLIDS = { cube: ['cube', 6, 12, 8], cuboid: ['cuboid', 6, 12, 8], sqpyramid: ['square-based pyramid', 5, 8, 5], tripyramid: ['triangular-based pyramid', 4, 6, 4], triprism: ['triangular prism', 5, 9, 6] };
  add({
    id: 'Y5_NC_23.name', topics: ['Y5_NC_23'], level: 1,
    make(R) {
      const key = R.pick(['cube', 'cuboid', 'sqpyramid', 'tripyramid', 'triprism', 'cylinder', 'cone']);
      const names = { cube: 'cube', cuboid: 'cuboid', sqpyramid: 'square-based pyramid', tripyramid: 'triangular-based pyramid', triprism: 'triangular prism', cylinder: 'cylinder', cone: 'cone' };
      const opts = R.shuffle([names[key], ...R.sample(Object.values(names).filter(n => n !== names[key]), 3)]);
      const right = opts.indexOf(names[key]);
      return {
        marks: 1, answer: names[key],
        check: () => opts.filter(o => o === names[key]).length === 1,
        body: A => `<p>Tick the name of this 3-D shape.</p>${D.solid(key, 30)}${A.tick(opts, right, { col: true })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_23.properties', topics: ['Y5_NC_23'], level: 2,
    make(R) {
      const key = R.pick(Object.keys(SOLIDS)), [nm, Fc, E, V] = SOLIDS[key];
      const hide = R.sample([0, 1, 2], 2);
      const vals = [Fc, E, V];
      return {
        marks: 1, answer: hide.sort().map(i => `${['faces', 'edges', 'vertices'][i]} ${vals[i]}`).join(', '), guide: 'Both needed for the mark.',
        check: () => Fc + V - E === 2,
        body: A => `<p>Here is a drawing of a <b>${nm}</b>.</p>${D.solid(key, 30)}<p>Complete the table.</p>${A.table([vals.map((v, i) => hide.includes(i) ? { a: v } : v)], { head: ['Faces', 'Edges', 'Vertices'] })}`,
      };
    },
  });
  // cube nets: does the net fold into a cube? (roll a cube over the cells)
  function foldsToCube(cells) {
    const key = c => c[0] + ',' + c[1], set = new Map(cells.map(c => [key(c), c]));
    const mv = { e: ([x, y, z]) => [z, y, -x], w: ([x, y, z]) => [-z, y, x], n: ([x, y, z]) => [x, z, -y], s: ([x, y, z]) => [x, -z, y] };
    const st = new Map([[key(cells[0]), [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]]]), q = [cells[0]], bottoms = [];
    while (q.length) {
      const c = q.shift(), o = st.get(key(c));
      bottoms.push(o.findIndex(v => v[0] === 0 && v[1] === 0 && v[2] === -1));
      for (const [dx, dy, d] of [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 'n'], [0, -1, 's']]) {
        const k = (c[0] + dx) + ',' + (c[1] + dy);
        if (set.has(k) && !st.has(k)) { st.set(k, o.map(mv[d])); q.push(set.get(k)); }
      }
    }
    return bottoms.length === 6 && new Set(bottoms).size === 6;
  }
  const ROW4 = [[0, 1], [1, 1], [2, 1], [3, 1]];
  const NETS_OK = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]].map(([a, b]) => [...ROW4, [a, 2], [b, 0]])
    .concat([[[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]], [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]]]);
  const NETS_BAD = [[...ROW4, [0, 2], [1, 2]], [...ROW4, [0, 2], [2, 2]], [...ROW4, [1, 2], [3, 2]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [1, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [2, 3]]];
  function netFig(cells, flip) {
    const c = 6, pts = cells.map(([x, y]) => flip ? [y, x] : [x, y]);
    const W = Math.max(...pts.map(p => p[0])) + 1, H = Math.max(...pts.map(p => p[1])) + 1;
    return D.svg(W * c + 2, H * c + 2, pts.map(([x, y]) => D.box(1 + x * c, 1 + (H - 1 - y) * c, c, c, 'solid')).join(''));
  }
  add({
    id: 'Y5_NC_23.net', topics: ['Y5_NC_23'], level: 2,
    make(R) {
      const good = R.pick(NETS_OK), bad = R.sample(NETS_BAD, 2);
      const nets = R.shuffle([good, ...bad]), right = nets.indexOf(good), L = ['A', 'B', 'C'];
      const figs = nets.map((n, i) => ({ fig: netFig(n, R.chance(0.5)), cap: L[i] }));
      return {
        marks: 1, answer: L[right],
        check: () => nets.filter(foldsToCube).length === 1 && foldsToCube(nets[right]),
        body: A => `<p>Which of these nets will fold to make a cube? Circle its letter.</p>${D.row(figs, 10)}${A.circle(L, right)}`,
      };
    },
  });

  // Y5_NC_24 angles at a point (360°), on a straight line (180°), multiples of 90°
  // rays from a centre: dirs in degrees (anticlockwise from east); labels for the gap after each ray
  function rays(dirs, labels, o = {}) {
    const L = o.len || 30, parts = [], pts = [[0, 0]];
    const P = (a, r) => [Math.cos(a * Math.PI / 180) * r, -Math.sin(a * Math.PI / 180) * r];
    if (o.line) { parts.push(['line', [-L - 4, 0], [L + 4, 0]]); pts.push([-L - 4, 0], [L + 4, 0]); }
    for (const d of dirs) { const e = P(d, L); parts.push(['line', [0, 0], e]); pts.push(e); }
    labels.forEach((t, i) => {
      if (!t) return;
      const a0 = dirs[i], a1 = i + 1 < dirs.length ? dirs[i + 1] : (o.line ? 180 : dirs[0] + 360);
      const rr = (a1 - a0) < 40 ? 17 : 12, m = P((a0 + a1) / 2, rr);
      parts.push(['txt', m, t]); pts.push([m[0] - 4, m[1] - 4], [m[0] + 4, m[1] + 3]);
      if (o.right && o.right.includes(i)) parts.push(['right', a0, a1]);
    });
    const minx = Math.min(...pts.map(p => p[0])) - 3, miny = Math.min(...pts.map(p => p[1])) - 3;
    const maxx = Math.max(...pts.map(p => p[0])) + 3, maxy = Math.max(...pts.map(p => p[1])) + 3;
    const X = p => [p[0] - minx, p[1] - miny];
    let s = '';
    for (const q of parts) {
      if (q[0] === 'line') s += D.line(...X(q[1]), ...X(q[2]), 'arm');
      else if (q[0] === 'txt') { const [x, y] = X(q[1]); s += D.txt(x, y + 1.3, q[2], { size: 3.8 }); }
      else { const k = 4, a = P(q[1], k), b = P(q[2], k); s += D.pline([X(a), X([a[0] + b[0], a[1] + b[1]]), X(b)], 'thin'); }
    }
    return D.svg(maxx - minx, maxy - miny, s);
  }
  add({
    id: 'Y5_NC_24.line', topics: ['Y5_NC_24'], level: 1,
    make(R) {
      const three = R.chance(0.4);
      const a = R.int(5, 30) * 5, b = three ? R.int(4, 20) * 5 : 0, x = 180 - a - b;
      if (x < 20 || a === 90 || x === 90) return null;
      const order = three ? R.shuffle([[a, a + '°'], [b, b + '°'], [x, 'x']]) : R.shuffle([[a, a + '°'], [x, 'x']]);
      const dirs = [0]; let acc = 0;
      for (let i = 0; i < order.length - 1; i++) { acc += order[i][0]; dirs.push(acc); }
      return {
        marks: 1, answer: x + '°',
        check: () => order.reduce((s, o) => s + o[0], 0) === 180,
        body: A => `<p>This diagram shows angles on a straight line. It is not drawn accurately.</p>${rays(dirs, order.map(o => o[1]), { line: true, len: 34 })}<p>Work out the size of angle <b>x</b>.</p>${A.box(x, { unit: '°' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_24.point', topics: ['Y5_NC_24'], level: 2,
    make(R) {
      const n = R.int(3, 4);
      const parts = R.ints(n - 1, 8, 30).map(v => v * 5);
      const x = 360 - parts.reduce((s, v) => s + v, 0);
      if (x < 30 || x > 200 || parts.includes(90)) return null;
      const order = R.shuffle([...parts.map(p => [p, p + '°']), [x, 'x']]);
      const start = R.int(0, 11) * 30, dirs = [];
      let acc = start; for (const o of order) { dirs.push(acc); acc += o[0]; }
      return {
        marks: 1, answer: x + '°',
        check: () => order.reduce((s, o) => s + o[0], 0) === 360,
        body: A => `<p>This diagram shows angles around a point. It is not drawn accurately.</p>${rays(dirs, order.map(o => o[1]), { len: 24 })}<p>Work out the size of angle <b>x</b>.</p>${A.box(x, { unit: '°' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_24.right-angle', topics: ['Y5_NC_24'], level: 1,
    make(R) {
      const who = R.name();
      const f = R.int(0, 1);
      if (f === 0) {
        const a = R.int(3, 15) * 5, x = 90 - a, flip = R.chance(0.5);
        if (a === x) return null;
        return { marks: 1, answer: x + '°', check: () => a + x === 90,
          body: A => `<p>A right angle is split into two angles. The diagram is not drawn accurately.</p>${rays([0, flip ? x : a, 90], flip ? ['x', a + '°', ''] : [a + '°', 'x', ''], { len: 30, right: [] })}<p>Work out the size of angle <b>x</b>.</p>${A.box(x, { unit: '°' })}` };
      }
      const k = R.int(1, 3), cw = R.chance(0.5), dirsN = ['north', 'east', 'south', 'west'], s = R.int(0, 3);
      const end = (s + (cw ? k : 4 - k)) % 4, deg = 90 * k;
      return { marks: 1, answer: dirsN[end], check: () => deg % 90 === 0 && (s + (cw ? deg / 90 : 4 - deg / 90)) % 4 === end,
        body: A => `<p>${who} is facing <b>${dirsN[s]}</b>.</p><p>${who} turns <b>${deg}°</b> ${cw ? 'clockwise' : 'anticlockwise'}.</p><p>Which direction is ${who} facing now?</p>${A.line(dirsN[end], 40)}` };
    },
  });

  // Y5_NC_25 properties of rectangles: missing lengths and angles
  add({
    id: 'Y5_NC_25.missing-sides', topics: ['Y5_NC_25'], level: 2,
    make(R) {
      const q = lShape(R, 6, 16), u = 'cm';
      const k = Math.min(4, 70 / q.W, 28 / q.H);
      const labels = [`${q.W} ${u}`, `${q.H - q.ch} ${u}`, 'a', 'b', `${q.W - q.cw} ${u}`, `${q.H} ${u}`];
      return {
        marks: 1, answer: `a = ${q.cw} cm, b = ${q.ch} cm`, guide: 'Both needed for the mark.',
        check: () => (q.W - q.cw) + q.cw === q.W && (q.H - q.ch) + q.ch === q.H && Math.abs(perim(q.pts) - 2 * (q.W + q.H)) < 1e-9,
        body: A => `<p>This shape is made from rectangles. It is not drawn accurately.</p>${lFig(q, k, labels)}<p>Work out the lengths <b>a</b> and <b>b</b>.</p>${A.boxes([[q.cw, 'cm', 'a ='], [q.ch, 'cm', 'b =']], { w: 16 })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_25.diagonal', topics: ['Y5_NC_25'], level: 2,
    make(R) {
      const w = R.int(55, 80), h = R.int(24, 36);
      const a = Math.round(Math.atan2(h, w) * 180 / Math.PI);  // angle at the corner between the long side and the diagonal
      const x = 90 - a;
      const pts = [[0, 0], [w, 0], [w, h], [0, h]];
      let s = D.shape({ pts, right: [0, 1, 2, 3] });
      // diagonal and labels drawn over the same frame (D.shape pads by 9)
      const p = 9;
      const extra = D.line(p, p + h, p + w, p, 'arm') + D.txt(p + w - 3.5, p + 10, 'x', { size: 3.8 }) + D.txt(p + 15, p + h - 2, a + '°', { size: 3.6 });
      s = s.replace('</svg>', extra + '</svg>');
      return {
        marks: 1, answer: x + '°', guide: 'The diagram is not drawn accurately.',
        check: () => a + x === 90 && x !== a,
        body: A => `<p>This rectangle has a straight line drawn from one corner to another. It is not drawn accurately.</p>${s}<p>Work out the size of angle <b>x</b>.</p>${A.box(x, { unit: '°' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_25.perimeter', topics: ['Y5_NC_25'], level: 2,
    make(R) {
      const l = R.int(8, 30), w = R.int(3, l - 2), P = 2 * (l + w), sqr = R.chance(0.25);
      if (sqr) { const s = R.int(6, 25);
        return { marks: 1, answer: s + ' cm', check: () => s + s + s + s === 4 * s,
          body: A => `<p>A square has a perimeter of <b>${4 * s} cm</b>.</p><p>How long is each side?</p>${A.box(s, { unit: 'cm' })}` }; }
      return {
        marks: 1, answer: w + ' cm',
        check: () => l + w + l + w === P,
        body: A => `<p>A rectangle has a perimeter of <b>${P} cm</b>.</p><p>Its length is <b>${l} cm</b>. What is its width?</p>${A.box(w, { unit: 'cm' })}`,
      };
    },
  });

  // Y5_NC_26 regular and irregular polygons
  const POLY = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 8: 'octagon' };
  function isRegular(pts) {
    const n = pts.length, side = i => Math.hypot(pts[(i + 1) % n][0] - pts[i][0], pts[(i + 1) % n][1] - pts[i][1]);
    const ang = i => { const a = pts[(i + n - 1) % n], v = pts[i], b = pts[(i + 1) % n]; const u1 = [a[0] - v[0], a[1] - v[1]], u2 = [b[0] - v[0], b[1] - v[1]]; return Math.acos((u1[0] * u2[0] + u1[1] * u2[1]) / Math.hypot(...u1) / Math.hypot(...u2)); };
    const s0 = side(0), a0 = ang(0);
    return [...Array(n).keys()].every(i => Math.abs(side(i) - s0) < 1e-6 && Math.abs(ang(i) - a0) < 1e-6);
  }
  function irregular(R, n) {
    const kind = R.int(0, 1);
    if (n === 4 && kind === 0) { const s = R.int(8, 11); return [[0, s * 0.6], [s * 1.3, 0], [s * 2.6, s * 0.6], [s * 1.3, s * 1.2]]; }   // rhombus
    if (n === 4) return [[0, 0], [24, 0], [24, 13], [0, 13]];   // rectangle
    return D.regular(n, 11, R.int(0, 3) * 15).map(([x, y]) => [x * 1.45, y]);   // stretched
  }
  add({
    id: 'Y5_NC_26.which', topics: ['Y5_NC_26'], level: 2,
    make(R) {
      const ns = R.sample([3, 4, 5, 6, 8], 4), regs = R.sample([0, 1, 2, 3], 2);
      const shapes = ns.map((n, i) => regs.includes(i) ? D.regular(n, 11, n === 4 ? 45 : 0) : irregular(R, n));
      const L = ['A', 'B', 'C', 'D'];
      const right = shapes.map((p, i) => isRegular(p) ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => L[i]).join(' and '), guide: 'Both needed, and no others.',
        check: () => right.length === 2 && right.every(i => regs.includes(i)),
        body: A => `<p>Circle the letters of the <b>two</b> regular polygons.</p>${D.row(shapes.map((p, i) => ({ fig: D.shape({ pts: p, pad: 3 }), cap: L[i] })), 8)}${A.circle(L, right)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_26.explain', topics: ['Y5_NC_26'], level: 2,
    make(R) {
      const kind = R.int(0, 2), who = R.name();
      let pts, fig, why;
      if (kind === 0) { const s = R.int(15, 19); pts = [[0, s * 0.6], [s * 1.3, 0], [s * 2.6, s * 0.6], [s * 1.3, s * 1.2]]; fig = D.shape({ pts, ticks: [1, 1, 1, 1] }); why = 'All the sides are equal, but the angles are not all equal.'; }
      else if (kind === 1) { const w = R.int(36, 50), h = R.int(16, 26); pts = [[0, 0], [w, 0], [w, h], [0, h]]; fig = D.shape({ pts, right: [0, 1, 2, 3] }); why = 'All the angles are right angles, but the sides are not all equal.'; }
      else { pts = D.regular(6, 14, 0).map(([x, y]) => [x * 1.5, y]); fig = D.shape({ pts }); why = 'The sides are not all equal and the angles are not all equal.'; }
      const name = kind === 2 ? 'hexagon' : 'quadrilateral';
      return {
        marks: 1, answer: 'Not regular', guide: `Must say that the sides are not all equal${kind === 2 ? ' or' : ' / '} the angles are not all equal (as fits the shape). ${why}`,
        check: () => !isRegular(pts),
        body: A => `<p>${who} says, "This ${name} is a regular polygon."</p>${fig}<p>Explain why ${who} is wrong.</p>${A.explain(why, 2)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_26.perimeter', topics: ['Y5_NC_26'], level: 2,
    make(R) {
      const [n, nm] = R.pick([[3, 'triangle'], [5, 'pentagon'], [6, 'hexagon'], [8, 'octagon'], [10, 'decagon']]), s = R.int(3, 15), P = n * s;
      const back = R.chance(0.5);
      return {
        marks: 1, answer: back ? s + ' cm' : P + ' cm',
        check: () => P / n === s,
        body: A => back ? `<p>A <b>regular ${nm}</b> has a perimeter of <b>${P} cm</b>.</p><p>How long is each side?</p>${A.box(s, { unit: 'cm' })}`
          : `<p>Each side of a <b>regular ${nm}</b> is <b>${s} cm</b> long.</p><p>What is its perimeter?</p>${A.box(P, { unit: 'cm' })}`,
      };
    },
  });

  // Y5_NC_27 reflection and translation
  const SHAPES = [[[0, 0], [2, 0], [2, 2], [0, 2]], [[0, 0], [3, 0], [0, 2]], [[0, 0], [2, 0], [2, 1], [1, 1], [1, 3], [0, 3]], [[0, 0], [3, 0], [3, 1], [0, 2]], [[0, 0], [2, 0], [3, 2], [1, 2]]];
  add({
    id: 'Y5_NC_27.translate', topics: ['Y5_NC_27'], level: 2,
    make(R) {
      const sh = R.pick(SHAPES), ox = R.int(1, 5), oy = R.int(1, 5);
      const pts = sh.map(([x, y]) => [x + ox, y + oy]);
      const dx = R.intNot(-4, 4, [0]), dy = R.intNot(-3, 3, [0]);
      const np = pts.map(([x, y]) => [x + dx, y + dy]);
      if (np.some(([x, y]) => x < 0 || y < 0 || x > 9 || y > 9)) return null;
      const k = R.int(0, pts.length - 1), [ax, ay] = np[k];
      const desc = `${Math.abs(dx)} ${Math.abs(dx) === 1 ? 'square' : 'squares'} ${dx > 0 ? 'right' : 'left'} and ${Math.abs(dy)} ${Math.abs(dy) === 1 ? 'square' : 'squares'} ${dy > 0 ? 'up' : 'down'}`;
      return {
        marks: 1, answer: `(${ax}, ${ay})`,
        check: () => ax - pts[k][0] === dx && ay - pts[k][1] === dy,
        body: A => `<p>The shape is translated <b>${desc}</b>.</p>${D.grid({ cols: 10, rows: 10, cell: 4.5, axes: true, polys: [{ pts }, { pts: np, ans: true }], pts: [{ x: pts[k][0], y: pts[k][1], label: 'A' }] }, A)}<p>What are the coordinates of point A after the translation?</p>${A.box(`(${ax}, ${ay})`, { w: 30 })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_27.reflect', topics: ['Y5_NC_27'], level: 2,
    make(R) {
      const sh = R.pick(SHAPES.slice(1)), vert = R.chance(0.5), m = 6;
      const w = Math.max(...sh.map(p => p[0])), h = Math.max(...sh.map(p => p[1]));
      const gap = R.int(0, 2), off = R.int(0, (vert ? 9 : 11) - (vert ? h : w));
      // shape on the low side of the mirror line at m
      const pts = sh.map(([x, y]) => vert ? [m - gap - w + x, off + y] : [off + x, m - gap - h + y]);
      const ref = pts.map(([x, y]) => vert ? [2 * m - x, y] : [x, 2 * m - y]);
      if (pts.concat(ref).some(([x, y]) => x < 0 || y < 0 || x > 12 || y > 12)) return null;
      return {
        marks: 1, answer: 'Reflection drawn', guide: 'All vertices must be correct, within a small tolerance.',
        check: () => ref.every((p, i) => vert ? (p[0] - m === m - pts[i][0] && p[1] === pts[i][1]) : (p[1] - m === m - pts[i][1] && p[0] === pts[i][0])),
        body: A => `<p>Draw the reflection of the shape in the mirror line.</p>${D.grid({ cols: 12, rows: 12, cell: 5, polys: [{ pts }, { pts: ref, ans: true }], mirror: vert ? { x1: m, y1: 0, x2: m, y2: 12 } : { x1: 0, y1: m, x2: 12, y2: m } }, A)}`,
      };
    },
  });
  add({
    id: 'Y5_NC_27.describe', topics: ['Y5_NC_27'], level: 2,
    make(R) {
      const sh = R.pick(SHAPES), ox = R.int(0, 6), oy = R.int(0, 6);
      const dx = R.intNot(-6, 6, [0]), dy = R.intNot(-5, 5, [0]);
      const a = sh.map(([x, y]) => [x + ox, y + oy]), b = a.map(([x, y]) => [x + dx, y + dy]);
      if (b.some(([x, y]) => x < 0 || y < 0 || x > 11 || y > 9)) return null;
      const box = p => { const xs = p.map(q => q[0]), ys = p.map(q => q[1]); return [Math.max(...xs), Math.min(...xs), Math.max(...ys), Math.min(...ys)]; };
      const ba = box(a), bb = box(b);
      if (!(ba[0] < bb[1] || bb[0] < ba[1] || ba[2] < bb[3] || bb[2] < ba[3])) return null;   // shapes must not overlap
      const desc = `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}, ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`;
      return {
        marks: 1, answer: desc, guide: 'Both the left/right and the up/down parts are needed.',
        check: () => b.every((p, i) => p[0] - a[i][0] === dx && p[1] - a[i][1] === dy),
        body: A => `<p>Shape A is translated to shape B.</p>${D.grid({ cols: 12, rows: 10, cell: 5, polys: [{ pts: a, label: 'A' }, { pts: b, label: 'B' }] }, A)}<p>Complete the sentence.</p><div class="sent c">Shape A moves ${A.blank(Math.abs(dx), 10)} squares ${A.blank(dx > 0 ? 'right' : 'left', 16)} and ${A.blank(Math.abs(dy), 10)} squares ${A.blank(dy > 0 ? 'up' : 'down', 16)}.</div>`,
      };
    },
  });

  /* ======================= Statistics ======================= */

  // Y5_NC_21 line graphs: comparison, sum and difference
  const LG = [
    { title: 'Temperature in a garden', ylab: 'Temperature (°C)', xs: ['8 am', '9 am', '10 am', '11 am', '12 noon', '1 pm'], step: 5, unit: '°C', what: 'temperature', lo: 2, hi: 28 },
    { title: 'Height of a sunflower', ylab: 'Height (cm)', xs: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'], step: 20, unit: 'cm', what: 'height of the sunflower', lo: 10, hi: 150, up: true },
    { title: 'Ice creams sold at a kiosk', ylab: 'Number sold', xs: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], step: 50, unit: 'ice creams', what: 'number of ice creams sold', lo: 20, hi: 380 },
  ];
  function lgData(R, force) {
    const c = force || R.pick(LG), minor = c.step / 2, max = c.step * Math.ceil(c.hi / c.step);
    let ys = c.xs.map(() => R.int(Math.ceil(c.lo / minor), Math.floor(c.hi / minor)) * minor);
    if (c.up) ys = ys.sort((a, b) => a - b);
    if (new Set(ys).size < ys.length) return null;
    return { c, ys, max, minor };
  }
  const lgFig = g => D.lineGraph({ xs: g.c.xs, ys: g.ys, min: 0, max: g.max, step: g.c.step, minor: g.minor, ylab: g.c.ylab, title: g.c.title, width: 120, height: 40 });
  add({
    id: 'Y5_NC_21.difference', topics: ['Y5_NC_21'], level: 2,
    make(R) {
      const g = lgData(R); if (!g) return null;
      const i = R.int(0, 5), j = R.intNot(0, 5, [i]);
      const [hi, lo] = g.ys[i] > g.ys[j] ? [i, j] : [j, i], d = g.ys[hi] - g.ys[lo];
      return {
        marks: 1, answer: `${F.n(d)} ${g.c.unit}`,
        check: () => g.ys[lo] + d === g.ys[hi],
        body: A => `${lgFig(g)}<p>How much greater was the ${g.c.what} ${g.c.days ? 'on' : 'at'} <b>${(g.c.days || g.c.xs)[hi]}</b> than ${g.c.days ? 'on' : 'at'} <b>${(g.c.days || g.c.xs)[lo]}</b>?</p>${A.box(F.n(d), { unit: g.c.unit })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_21.biggest-rise', topics: ['Y5_NC_21'], level: 2,
    make(R) {
      const g = lgData(R); if (!g) return null;
      const rises = g.ys.slice(1).map((y, i) => y - g.ys[i]);
      const best = Math.max(...rises);
      if (best <= 0 || rises.filter(r => r === best).length !== 1) return null;
      const k = rises.indexOf(best);
      return {
        marks: 1, answer: `${(g.c.days || g.c.xs)[k]} and ${(g.c.days || g.c.xs)[k + 1]}`,
        check: () => rises.every((r, i) => i === k || r < g.ys[k + 1] - g.ys[k]),
        body: A => `${lgFig(g)}<p>Between which two ${g.c.days ? 'days' : g.c.xs[0].startsWith('Week') ? 'weeks' : 'times'} did the ${g.c.what} go up the most?</p>${A.boxes([[(g.c.days || g.c.xs)[k], '', ''], [(g.c.days || g.c.xs)[k + 1], '', 'and']], { w: 26 })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_21.sum', topics: ['Y5_NC_21'], level: 2,
    make(R) {
      const g = lgData(R, LG[2]); if (!g) return null;
      const ks = R.sample([0, 1, 2, 3, 4, 5], R.int(2, 3)).sort();
      const tot = ks.reduce((s, k) => s + g.ys[k], 0);
      return {
        marks: 1, answer: F.n(tot),
        check: () => tot - ks.slice(1).reduce((s, k) => s + g.ys[k], 0) === g.ys[ks[0]],
        body: A => `${lgFig(g)}<p>How many ice creams were sold on ${ks.map(k => '<b>' + g.c.days[k] + '</b>').join(ks.length === 3 ? ', ' : ' and ').replace(/, (?=[^,]*$)/, ' and ')} altogether?</p>${A.box(F.n(tot), { unit: 'ice creams' })}`,
      };
    },
  });

  // Y5_NC_22 tables and timetables
  function timetable(R) {
    const stops = R.pick([['Bus station', 'Park Road', 'High Street', 'Hospital'], ['Station', 'Library', 'Market', 'Leisure centre'], ['School', 'Church', 'Shops', 'Beach']]);
    const gaps = [R.int(4, 15), R.int(5, 18), R.int(6, 20)];
    const first = R.int(7 * 12, 10 * 12) * 5, every = R.pick([20, 25, 30, 35, 40]);
    const buses = [0, 1, 2, 3].map(b => { let t = first + b * every; return [t, t += gaps[0], t += gaps[1], t += gaps[2]]; });
    return { stops, buses };
  }
  const tm = t => F.t24(Math.floor(t / 60), t % 60);
  add({
    id: 'Y5_NC_22.timetable', topics: ['Y5_NC_22'], level: 2,
    make(R) {
      const T = timetable(R), f = R.int(0, 2), who = R.name();
      const tbl = A => A.table(T.stops.map((s, i) => [s, ...T.buses.map(b => tm(b[i]))]), { rowHead: true });
      if (f === 0) {
        const b = R.int(0, 3), i = R.int(0, 1), j = R.int(i + 2, 3), d = T.buses[b][j] - T.buses[b][i];
        return { marks: 1, answer: d + ' minutes', check: () => T.buses[b][i] + d === T.buses[b][j],
          body: A => `<p>Here is part of a bus timetable.</p>${tbl(A)}<p>How long does the bus that leaves ${T.stops[i]} at <b>${tm(T.buses[b][i])}</b> take to get to ${T.stops[j]}?</p>${A.box(d, { unit: 'minutes' })}` };
      }
      if (f === 1) {
        const i = R.int(0, 2), b = R.int(1, 3), arrive = T.buses[b][i] - R.int(2, T.buses[b][i] - T.buses[b - 1][i] - 1);
        const next = T.buses.find(x => x[i] >= arrive);
        return { marks: 1, answer: tm(next[i]), check: () => next[i] >= arrive && T.buses.every(x => x[i] < arrive || x[i] >= next[i]),
          body: A => `<p>Here is part of a bus timetable.</p>${tbl(A)}<p>${who} gets to <b>${T.stops[i]}</b> at <b>${tm(arrive)}</b>.</p><p>What time is the next bus from ${T.stops[i]}?</p>${A.box(tm(next[i]), { w: 26 })}` };
      }
      const j = R.int(2, 3), b = R.int(1, 3), need = T.buses[b][j] + R.int(1, T.buses[1][j] - T.buses[0][j] - 1);
      const ok = T.buses.filter(x => x[j] <= need), latest = ok[ok.length - 1];
      return { marks: 1, answer: tm(latest[0]), check: () => latest[j] <= need && T.buses.every(x => x[j] > need || x[0] <= latest[0]),
        body: A => `<p>Here is part of a bus timetable.</p>${tbl(A)}<p>${who} needs to be at <b>${T.stops[j]}</b> by <b>${tm(need)}</b>.</p><p>What is the latest bus ${who} can catch from ${T.stops[0]}?</p>${A.box(tm(latest[0]), { w: 26 })}` };
    },
  });
  add({
    id: 'Y5_NC_22.two-way', topics: ['Y5_NC_22'], level: 3,
    make(R) {
      const [rows, cols, what] = R.pick([[['Year 5', 'Year 6'], ['Walk', 'Car', 'Bus'], 'how some children travel to school'], [['Club A', 'Club B'], ['Football', 'Netball', 'Swimming'], 'the favourite sports of some children'], [['Class A', 'Class B'], ['Dog', 'Cat', 'Fish'], 'the pets some children have']]);
      const v = rows.map(() => cols.map(() => R.int(4, 29)));
      const rt = v.map(r => r.reduce((a, b) => a + b, 0)), ct = cols.map((_, j) => v[0][j] + v[1][j]), T = rt[0] + rt[1];
      const grid = [...v.map((r, i) => [...r, rt[i]]), [...ct, T]];
      const hide = R.sample([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [0, 3], [2, 1], [2, 3]], 2);
      if (hide[0][0] === hide[1][0] && hide[0][0] === 2) return null;
      const isH = (i, j) => hide.some(h => h[0] === i && h[1] === j);
      return {
        marks: 2, answer: hide.map(([i, j]) => F.n(grid[i][j])).join(' and '), guide: '1 mark for each correct number.',
        check: () => grid.every((r, i) => i === 2 || r[3] === r[0] + r[1] + r[2]) && grid[2].every((t, j) => t === grid[0][j] + grid[1][j]),
        body: A => `<p>The table shows ${what}. Complete the table.</p>${A.table(grid.map((r, i) => [[...rows, 'Total'][i], ...r.map((c, j) => isH(i, j) ? { a: c } : c)]), { head: ['', ...cols, 'Total'], rowHead: true })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_22.read', topics: ['Y5_NC_22'], level: 2,
    make(R) {
      const who = R.name();
      const towns = R.sample(['Ashby', 'Brook', 'Cole', 'Dene', 'Eston'], 4);
      const d = {}; towns.forEach((a, i) => towns.forEach((b, j) => { if (i < j) d[a + b] = d[b + a] = R.int(12, 95); }));
      const route = R.sample(towns, 3);
      const tot = d[route[0] + route[1]] + d[route[1] + route[2]];
      const rows = towns.map((a, i) => [a, ...towns.map((b, j) => i === j ? '—' : d[a + b])]);
      return {
        marks: 1, answer: tot + ' km',
        check: () => tot - d[route[1] + route[0]] === d[route[2] + route[1]],
        body: A => `<p>The table shows the distances in kilometres between some towns.</p>${A.table(rows, { head: ['', ...towns], rowHead: true })}<p>${who} drives from <b>${route[0]}</b> to <b>${route[1]}</b>, then from ${route[1]} to <b>${route[2]}</b>.</p><p>How far does ${who} drive altogether?</p>${A.box(tot, { unit: 'km' })}`,
      };
    },
  });
})();
