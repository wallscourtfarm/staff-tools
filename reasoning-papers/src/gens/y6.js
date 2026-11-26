/* Year 6 question generators. Topic ids from src/topics.json (Y6). See src/GENERATORS.md.
 * Numbers are kept as whole numbers internally (thousandths, pence, grams) and only divided for display.
 */
(function () {
  const { F, D } = RP;
  const add = RP.add;

  /* ---------- local helpers ---------- */
  const p10 = e => e >= 0 ? Math.pow(10, e) : 1 / Math.pow(10, -e);
  // integer m with k decimal places, shown trimmed: dz(375, 2) = 3.75
  const dz = (m, k) => F.n(m / Math.pow(10, k));
  // fixed places: dk(370, 2) = 3.70
  const dk = (m, k) => F.n(m / Math.pow(10, k), k);
  const gcd = F.gcd;
  const simp = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
  // fraction for display: whole numbers plain, improper as mixed
  const fr = (n, d, mixed = true) => {
    [n, d] = simp(n, d);
    if (d === 1) return F.n(n);
    if (mixed && n > d) return F.mixed(Math.floor(n / d), n % d, d);
    return F.frac(n, d);
  };
  // fraction answer boxes: numerator and denominator boxes stacked
  const fbox = (A, n, d) => F.frac(A.blank(n, 10), A.blank(d, 10));
  const sym = (a, b) => a < b ? '&lt;' : a > b ? '&gt;' : '=';
  const sum = a => a.reduce((s, x) => s + x, 0);
  const note = '<p class="nts" style="font-size:9pt;margin:0">Not to scale</p>';

  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function w3(n) {
    const h = Math.floor(n / 100), r = n % 100, s = [];
    if (h) s.push(ONES[h] + ' hundred');
    if (r) { const t = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : ''); s.push(h ? 'and ' + t : t); }
    return s.join(' ');
  }
  function words(n) {
    const m = Math.floor(n / 1e6), th = Math.floor(n / 1000) % 1000, r = n % 1000, parts = [];
    if (m) parts.push(w3(m) + ' million');
    if (th) parts.push(w3(th) + ' thousand');
    if (r) parts.push(r < 100 && (m || th) ? 'and ' + w3(r) : w3(r));
    return parts.join(', ');
  }
  // round whole number n to nearest `place`
  const roundTo = (n, place) => Math.round(n / place) * place;

  // polygon area (shoelace) and perimeter for grid shapes
  const polyArea = pts => Math.abs(sum(pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return p[0] * q[1] - q[0] * p[1]; }))) / 2;
  const polyPerim = pts => sum(pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); }));

  /* Four-quadrant coordinate grid (D.grid only draws the first quadrant).
   * o = {min, max (same for x and y), cell, pts:[{x,y,label,ans}], polys:[{pts, label, ans}], every} */
  function grid4(o, A) {
    const c = o.cell || 5, lo = o.min, hi = o.max, pad = 7, show = A && A.show;
    const n = hi - lo, W = n * c + 2 * pad, H = n * c + 2 * pad;
    const P = (x, y) => [pad + (x - lo) * c, pad + (hi - y) * c];
    let s = '';
    for (let i = lo; i <= hi; i++) { s += D.line(...P(i, lo), ...P(i, hi), 'gl') + D.line(...P(lo, i), ...P(hi, i), 'gl'); }
    s += D.line(...P(lo - 0.4, 0), ...P(hi + 0.4, 0), 'axis') + D.line(...P(0, lo - 0.4), ...P(0, hi + 0.4), 'axis');
    const ev = o.every || 1;
    for (let i = lo; i <= hi; i++) {
      if (i === 0 || i % ev) continue;
      s += D.txt(P(i, 0)[0], P(i, 0)[1] + 3.4, F.n(i), { size: 2.4 });
      s += D.txt(P(0, i)[0] - 1, P(0, i)[1] + 0.9, F.n(i), { size: 2.4, anchor: 'end' });
    }
    s += D.txt(P(0, 0)[0] - 1, P(0, 0)[1] + 3.4, '0', { size: 2.4, anchor: 'end' });
    s += D.txt(P(hi + 0.4, 0)[0] + 1.5, P(hi, 0)[1] + 1.3, 'x', { size: 3.6, anchor: 'start' });
    s += D.txt(P(0, hi)[0], P(0, hi + 0.4)[1] - 1.5, 'y', { size: 3.6 });
    for (const p of (o.polys || [])) {
      if (p.ans && !show) continue;
      s += D.poly(p.pts.map(q => P(q[0], q[1])), p.ans ? 'ansp' : 'shape');
      if (p.label) {
        const cx = sum(p.pts.map(q => q[0])) / p.pts.length, cy = sum(p.pts.map(q => q[1])) / p.pts.length;
        s += D.txt(P(cx, cy)[0], P(cx, cy)[1] + 1.4, p.label, { size: 3.8, bold: true, cls: p.ans ? 'ans' : '' });
      }
    }
    for (const p of (o.pts || [])) {
      if (p.ans && !show) continue;
      const [px, py] = P(p.x, p.y), cl = p.ans ? 'ansl' : 'cross';
      s += D.line(px - 1.2, py - 1.2, px + 1.2, py + 1.2, cl) + D.line(px - 1.2, py + 1.2, px + 1.2, py - 1.2, cl);
      if (p.label) s += D.txt(px + 1.8, py - 1.5, p.label, { size: 3.6, anchor: 'start', bold: true, cls: p.ans ? 'ans' : '' });
    }
    return D.svg(W, H, s);
  }
  const co = (x, y) => `(${F.n(x)}, ${F.n(y)})`;

  /* =====================================================================
   * NUMBER AND PLACE VALUE
   * ===================================================================== */
  const PLACE = { '-3': 'thousandths', '-2': 'hundredths', '-1': 'tenths', 0: 'ones', 1: 'tens', 2: 'hundreds', 3: 'thousands',
    4: 'ten thousands', 5: 'hundred thousands', 6: 'millions' };

  // Y6_004 relationship between powers of 10 from 0.01 to 10 million
  add({
    id: 'Y6_004.times-size', topics: ['Y6_004'], level: 1,
    make(R) {
      const e1 = R.int(-2, 6), e2 = e1 + R.int(1, 4);
      if (e2 > 7) return null;
      const big = p10(e2), small = p10(e1), k = Math.pow(10, e2 - e1);
      const form = R.int(0, 1);
      return {
        marks: 1, answer: F.n(k),
        check: () => Math.abs(small * k / big - 1) < 1e-9,
        body: A => form
          ? `<p>Write the missing number.</p><div class="sent c">${F.n(big)} is ${A.blank(k, 22)} times the size of ${F.n(small)}</div>`
          : `<p>Write the missing number.</p><div class="sent c">${F.n(small)} ${F.times} ${A.blank(k, 22)} = ${F.n(big)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_004.how-many', topics: ['Y6_004'], level: 2,
    make(R) {
      const e1 = R.int(-2, 4), e2 = e1 + R.int(1, 4);
      if (e2 > 7 || e1 === 0) return null;
      const k = Math.pow(10, e2 - e1);
      return {
        marks: 1, answer: F.n(k),
        check: () => Math.abs(k * p10(e1) - p10(e2)) < 1e-9 * p10(e2),
        body: A => `<p>How many <b>${PLACE[e1]}</b> are there in <b>${F.n(p10(e2))}</b>?</p>${A.box(k, { w: 36 })}`,
      };
    },
  });
  add({
    id: 'Y6_004.true-one', topics: ['Y6_004'], level: 2,
    make(R) {
      const st = [];
      const seen = new Set();
      for (let i = 0; i < 4; i++) {
        let a, b;
        do { b = R.int(-2, 5); a = b + R.int(1, 3); } while (a > 7 || seen.has(a * 20 + b));
        seen.add(a * 20 + b);
        const right = Math.pow(10, a - b);
        const k = i === 0 ? right : (R.chance(0.5) || a - b === 1 ? right * 10 : right / 10);
        st.push({ a, b, k, ok: k === right });
      }
      const opts = R.shuffle(st);
      const ri = opts.findIndex(s => s.ok);
      return {
        marks: 1, answer: `${F.n(p10(opts[ri].a))} is ${F.n(opts[ri].k)} times the size of ${F.n(p10(opts[ri].b))}`,
        check: () => opts.filter(s => Math.abs(p10(s.b) * s.k / p10(s.a) - 1) < 1e-9).length === 1,
        body: A => `<p>Tick the statement that is <b>true</b>.</p>${A.tick(opts.map(s => `${F.n(p10(s.a))} is ${F.n(s.k)} times the size of ${F.n(p10(s.b))}`), ri, { col: true })}`,
      };
    },
  });

  // Y6_005 value of each digit up to 10 million and in decimals; partitioning
  add({
    id: 'Y6_005.digit-value', topics: ['Y6_005'], level: 1,
    make(R) {
      const dec = R.chance(0.4);
      const nd = dec ? R.int(4, 5) + 2 : 7;
      const ds = R.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], nd);
      if (ds[0] === 0) return null;
      const M = +ds.join('');
      const sh = dec ? 2 : 0;          // decimal places
      const i = R.int(0, nd - 1), d = ds[i];
      if (d === 0) return null;
      const pos = nd - 1 - i - sh;       // power of ten of that digit
      const val = d * p10(pos);
      return {
        marks: 1, answer: F.n(val),
        check: () => Math.floor(M / Math.pow(10, nd - 1 - i)) % 10 === d && Math.abs(val * Math.pow(10, sh) - d * Math.pow(10, nd - 1 - i)) < 1e-6,
        body: A => `<p>What is the value of the digit <b>${d}</b> in this number?</p><div class="sent c">${dk(M, sh)}</div>${A.box(F.n(val), { w: 36 })}`,
      };
    },
  });
  add({
    id: 'Y6_005.partition', topics: ['Y6_005'], level: 2,
    make(R) {
      const m = R.int(2, 9), h = R.int(1, 9), rest = R.int(10, 99) * 1000 + R.int(1, 999);
      const n = m * 1e6 + h * 1e5 + rest;
      const nonstd = R.chance(0.5);
      const a = nonstd ? (m - 1) * 1e6 : m * 1e6, b = nonstd ? (h + 10) * 1e5 : h * 1e5;
      return {
        marks: 1, answer: F.n(b),
        check: () => n - a - rest === b,
        body: A => `<p>Write the missing number.</p><div class="sent c">${F.n(n)} = ${F.n(a)} + ${A.blank(F.n(b), 26)} + ${F.n(rest)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_005.decimal-partition', topics: ['Y6_005'], level: 2,
    make(R) {
      const w = R.int(2, 9), t = R.int(1, 9), h = R.int(1, 9), th = R.int(1, 9);
      const N = w * 1000 + t * 100 + h * 10 + th;     // thousandths
      const form = R.int(0, 2);
      let parts, hide, ans;
      if (form === 0) { parts = [w * 1000, t * 100, h * 10, th]; hide = R.int(1, 3); ans = parts[hide]; }
      else if (form === 1) { parts = [(w - 1) * 1000, 1000 + t * 100, h * 10 + th]; hide = 1; ans = parts[1]; }
      else { parts = [w * 1000, (t - 1) * 100, 100 + h * 10 + th]; if (t === 1) return null; hide = 2; ans = parts[2]; }
      return {
        marks: 1, answer: dz(ans, 3),
        check: () => sum(parts) === N && parts[hide] === ans,
        body: A => `<p>Write the missing number.</p><div class="sent c">${dz(N, 3)} = ${parts.map((p, i) => i === hide ? A.blank(dz(p, 3), 18) : dz(p, 3)).join(' + ')}</div>`,
      };
    },
  });
  add({
    id: 'Y6_005.words', topics: ['Y6_005'], level: 1,
    make(R) {
      const m = R.int(1, 9), th = R.pick([0, R.int(1, 999), R.int(10, 99), R.int(100, 999)]), r = R.pick([R.int(1, 99), R.int(100, 999), R.int(1, 9) * 100]);
      const n = m * 1e6 + th * 1000 + r;
      return {
        marks: 1, answer: F.n(n),
        check: () => Math.floor(n / 1e6) === m && n % 1000 === r,
        body: A => `<p>Write this number in digits.</p><p style="text-align:center"><i>${words(n)}</i></p>${A.box(F.n(n), { w: 40 })}`,
      };
    },
  });

  // Y6_006 place numbers on a number line; rounding, including in context
  add({
    id: 'Y6_006.arrow', topics: ['Y6_006'], level: 2,
    make(R) {
      const kind = R.int(0, 2), parts = R.pick([10, 5, 4]);
      let scale, range, start;   // integer units; value = int / scale
      if (kind === 0) { scale = 1; range = R.pick([100000, 1000000]); start = R.int(1, 9) * range; }
      else if (kind === 1) { scale = 1; range = R.pick([1000, 10000]); start = R.int(100, 999) * range; if (start + range > 1e7) return null; }
      else { scale = 1000; range = R.pick([100, 1000]); start = R.int(1, 99) * range; }
      const minor = range / parts;
      if (minor !== Math.round(minor)) return null;
      const j = R.int(1, parts - 1), v = start + j * minor;
      const val = v / scale;
      return {
        marks: 1, answer: F.n(val),
        check: () => (v - start) % minor === 0 && v > start && v < start + range,
        body: A => `<p>What number is the arrow pointing to?</p>${D.numberLine({ min: start / scale, max: (start + range) / scale, minor: minor / scale, major: range / scale, labels: 'ends', width: 140, marks: [{ v: val, box: true, ansText: F.n(val) }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y6_006.round', topics: ['Y6_006'], level: 1,
    make(R) {
      if (R.chance(0.6)) {
        const n = R.int(1000000, 9999999), place = R.pick([1000, 10000, 100000, 1000000]);
        if (n % place === place / 2 || n % place === 0) return null;
        const ans = roundTo(n, place);
        return {
          marks: 1, answer: F.n(ans),
          check: () => Math.abs(ans - n) < place / 2 && ans % place === 0,
          body: A => `<p>Round <b>${F.n(n)}</b> to the nearest ${F.n(place)}.</p>${A.box(F.n(ans), { w: 36 })}`,
        };
      }
      const N = R.int(1001, 99999); if (N % 10 === 0) return null;     // thousandths
      const dp = R.int(0, 2), unit = Math.pow(10, 3 - dp);
      if (N % unit === unit / 2) return null;
      const ans = Math.round(N / unit) * unit;
      if (dp > 0 && (ans / unit) % 10 === 0) return null;             // keep answers like 4.70 out
      const what = ['the nearest whole number', 'one decimal place', 'two decimal places'][dp];
      return {
        marks: 1, answer: dk(ans / unit, dp),
        check: () => Math.abs(ans - N) < unit / 2,
        body: A => `<p>Round <b>${dz(N, 3)}</b> to ${what}.</p>${A.box(dk(ans / unit, dp), { w: 30 })}`,
      };
    },
  });
  add({
    id: 'Y6_006.round-range', topics: ['Y6_006'], level: 3,
    make(R) {
      const place = R.pick([100, 1000, 10000]), Rv = R.int(12, 989) * place;
      const smallest = R.chance(0.5);
      const ans = smallest ? Rv - place / 2 : Rv + place / 2 - 1;
      const thing = R.pick([['people at a festival', 'people'], ['visitors to a museum this year', 'visitors'], ['books sold by a shop last month', 'books']]);
      return {
        marks: 1, answer: F.n(ans),
        check: () => roundTo(ans, place) === Rv && roundTo(smallest ? ans - 1 : ans + 1, place) !== Rv,
        body: A => `<p>The number of ${thing[0]}, rounded to the nearest ${F.n(place)}, is <b>${F.n(Rv)}</b>.</p><p>What is the <b>${smallest ? 'smallest' : 'largest'}</b> number of ${thing[1]} there could have been?</p>${A.box(F.n(ans), { w: 36 })}`,
      };
    },
  });
  add({
    id: 'Y6_006.which-place', topics: ['Y6_006'], level: 2,
    make(R) {
      const n = R.int(110000, 9899999);
      const places = [100, 1000, 10000, 100000];
      const pi = R.int(0, 3), place = places[pi], head = roundTo(n, place);
      if (places.filter(p => roundTo(n, p) === head).length !== 1 || n % place === place / 2 || head === n) return null;
      const thing = R.pick(['people live in a region', 'cars were made by a factory last year', 'people watched a film online']);
      return {
        marks: 1, answer: `nearest ${F.n(place)}`,
        check: () => Math.abs(head - n) <= place / 2 && places.indexOf(place) === pi,
        body: A => `<p>A report says that about <b>${F.n(head)}</b> ${thing}.</p><p>The exact number is <b>${F.n(n)}</b>.</p><p>Tick the place it was rounded to.</p>${A.tick(places.map(p => 'nearest ' + F.n(p)), pi)}`,
      };
    },
  });

  // Y6_007 split a power of 10 into 2, 4, 5 or 10 equal parts; read scales
  add({
    id: 'Y6_007.scale', topics: ['Y6_007'], level: 2,
    make(R) {
      const parts = R.pick([2, 4, 5, 10]), e = R.int(parts === 4 ? -1 : -2, 6);
      {
        const P = Math.pow(10, e + 4);               // in units of 0.0001
        const minor = P / parts, m = e >= 0 ? R.int(0, 9) : 0;
        const j = R.int(1, parts - 1), v = m * P + j * minor;
        const val = v / 10000;
        return {
          marks: 1, answer: F.n(val),
          check: () => v * parts % P === (m * P * parts + j * P) % P && Math.abs(val * 10000 - v) < 1e-6,
          body: A => `<p>What number is the arrow pointing to?</p>${D.numberLine({ min: m * P / 10000, max: (m + 1) * P / 10000, minor: minor / 10000, major: P / 10000, labels: 'ends', width: 140, marks: [{ v: val, box: true, ansText: F.n(val) }] }, A)}`,
        };
      }
    },
  });
  add({
    id: 'Y6_007.parts', topics: ['Y6_007'], level: 1,
    make(R) {
      const parts = R.pick([2, 4, 5, 10]), e = R.int(parts === 4 ? -1 : -2, 7);
      const P = Math.pow(10, e + 4), each = P / parts;
      const form = R.int(0, 1);
      return {
        marks: 1, answer: F.n(each / 10000),
        check: () => each * parts === P,
        body: A => form
          ? `<p><b>${F.n(P / 10000)}</b> is split into ${parts} equal parts.</p><p>What is each part worth?</p>${A.box(F.n(each / 10000), { w: 32 })}`
          : `<p>Write the missing number.</p><div class="sent c">${A.blank(F.n(each / 10000), 22)} ${F.times} ${parts} = ${F.n(P / 10000)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_007.jug', topics: ['Y6_007'], level: 2,
    make(R) {
      const parts = R.pick([2, 4, 5, 10]), max = R.pick([1, 2]);
      const minor = 1000 / parts;                   // ml
      const k = R.int(1, max * parts - 1), lev = k * minor;
      if (lev % 1000 === 0) return null;
      return {
        marks: 1, answer: `${F.n(lev / 1000)} litres`,
        guide: `Accept ${F.n(lev)} ml.`,
        check: () => lev / minor === k && lev < max * 1000,
        body: A => `<p>How much water is in the jug? Give your answer in litres.</p>${D.scale({ max, major: 1, minor: minor / 1000, level: lev / 1000, unit: 'litres', height: 50 }, A)}${A.box(F.n(lev / 1000), { unit: 'litres' })}`,
      };
    },
  });

  // new_d_n8bvzswy_11_mwux59o2 multiply and divide by 10, 100, 1,000 (times the size)
  const PV10 = 'new_d_n8bvzswy_11_mwux59o2';
  // value in thousandths X; multiply by 10^p (p may be negative); null if more than 3 dp
  const shift = (X, p) => p >= 0 ? X * Math.pow(10, p) : (X % Math.pow(10, -p) ? -1 : X / Math.pow(10, -p));
  add({
    id: PV10 + '.calc', topics: [PV10], level: 1,
    make(R) {
      const k = R.int(0, 3), m = R.int(2, 9999); if (m % 10 === 0) return null;
      const X = m * Math.pow(10, 3 - k);
      const p = R.int(1, 3), mul = R.chance(0.5), by = Math.pow(10, p);
      const Y = shift(X, mul ? p : -p);
      if (Y < 0 || Y > 1e10) return null;
      const form = R.int(0, 1);
      return {
        marks: 1, answer: dz(form ? by : Y, form ? 0 : 3),
        check: () => shift(Y, mul ? -p : p) === X,
        body: A => form
          ? `<p>Write the missing number.</p><div class="sent c">${dz(X, 3)} ${mul ? F.times : F.div} ${A.blank(F.n(by), 18)} = ${dz(Y, 3)}</div>`
          : `<p>Work out</p><div class="sent c">${dz(X, 3)} ${mul ? F.times : F.div} ${F.n(by)} = ${A.blank(dz(Y, 3), 26)}</div>`,
      };
    },
  });
  add({
    id: PV10 + '.size', topics: [PV10], level: 2,
    make(R) {
      const k = R.int(0, 2), m = R.int(2, 999); if (m % 10 === 0) return null;
      const X = m * Math.pow(10, 3 - k);
      const opts = [[1, '10 times'], [2, '100 times'], [3, '1,000 times'], [-1, 'one tenth of'], [-2, 'one hundredth of'], [-3, 'one thousandth of']];
      const [p, say] = R.pick(opts);
      const Y = shift(X, p);
      if (Y < 0) return null;
      return {
        marks: 1, answer: dz(Y, 3),
        check: () => shift(Y, -p) === X,
        body: A => `<p>What number is <b>${say}</b> the size of <b>${dz(X, 3)}</b>?</p>${A.box(dz(Y, 3), { w: 32 })}`,
      };
    },
  });
  add({
    id: PV10 + '.mistake', topics: [PV10], level: 2,
    make(R) {
      const who = R.name(), w = R.int(1, 99), t = R.int(1, 9);
      const div = R.chance(0.5);
      const X = (w * 10 + t) * 100;                       // thousandths, one decimal place
      const right = div ? X / 10 : X * 10;
      const wrong = div ? `${w}.0${t}` : `${F.n(w)}.${t}0`;
      return {
        marks: 1, answer: dz(right, 3),
        guide: div ? `Must show that dividing by 10 makes every digit move one place to the right, so the answer is ${dz(right, 3)}.`
          : `Must show that multiplying by 10 makes every digit move one place to the left, so the answer is ${dz(right, 3)}. Adding a zero after the decimal point does not change the number.`,
        check: () => (div ? right * 10 : right / 10) === X,
        body: A => `<p>${who} says,</p><p style="text-align:center"><i>"${div ? `To divide by 10 I put a zero after the decimal point, so ${dz(X, 3)} ${F.div} 10 = ${wrong}"` : `To multiply by 10 I add a zero, so ${dz(X, 3)} ${F.times} 10 = ${wrong}"`}</i></p><p>Explain why ${who} is wrong.</p>${A.explain(`${dz(X, 3)} ${div ? F.div : F.times} 10 = ${dz(right, 3)}. The digits move one place ${div ? 'right' : 'left'}.`, 2)}`,
      };
    },
  });

  /* =====================================================================
   * ADDITION, SUBTRACTION, MULTIPLICATION, DIVISION
   * ===================================================================== */

  // Y6_008 describe how 2 numbers are related by addition or multiplication
  add({
    id: 'Y6_008.relate', topics: ['Y6_008'], level: 1,
    make(R) {
      const b = R.int(4, 25), k = R.int(3, 9), a = k * b;
      return {
        marks: 1, answer: `${F.n(a - b)} more; ${k} times`,
        guide: 'Both must be correct for the mark.',
        check: () => b + (a - b) === a && a / k === b,
        body: A => `<p>Complete the sentences.</p><div class="sent c">${a} is ${A.blank(a - b, 16)} more than ${b}</div><div class="sent c">${a} is ${A.blank(k, 16)} times the size of ${b}</div>`,
      };
    },
  });
  add({
    id: 'Y6_008.context', topics: ['Y6_008'], level: 2,
    make(R) {
      const [x, y] = R.names(2), b = R.int(6, 48), k = R.int(2, 6), a = k * b;
      const thing = R.pick(['stickers', 'marbles', 'football cards', 'shells', 'beads']);
      const form = R.int(0, 1);
      const ans = form ? a - b : a + b;
      return {
        marks: 1, answer: F.n(ans),
        check: () => form ? ans + b === k * b : ans - b === k * b,
        body: A => `<p>${x} has <b>${k} times as many</b> ${thing} as ${y}.</p><p>${y} has ${b} ${thing}.</p><p>${form ? `How many more ${thing} does ${x} have than ${y}?` : `How many ${thing} do they have altogether?`}</p>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y6_008.true-one', topics: ['Y6_008'], level: 2,
    make(R) {
      const b = R.int(4, 15), k = R.int(3, 8), a = k * b, d = a - b;
      if (d === k || b * (k - 1) === k) return null;
      const st = R.shuffle([
        [`${a} is ${k} times the size of ${b}`, true],
        [`${a} is ${k} more than ${b}`, false],
        [`${b} is ${k} times the size of ${a}`, false],
        [`${a} is ${d} times the size of ${b}`, false],
      ]);
      const ri = st.findIndex(s => s[1]);
      return {
        marks: 1, answer: st[ri][0],
        check: () => b * k === a && b + k !== a && a * k !== b && b * d !== a,
        body: A => `<p>Tick the statement that is <b>true</b>.</p>${A.tick(st.map(s => s[0]), ri, { col: true })}`,
      };
    },
  });

  // Y6_009 use a known calculation to work out related ones
  add({
    id: 'Y6_009.derive', topics: ['Y6_009'], level: 1,
    make(R) {
      const a = R.int(12, 89), b = R.int(3, 9), c = a * b;
      if (a % 10 === 0) return null;
      // [question text, answer in tenths]
      const fam = [
        [a, '*', b * 10, c * 100],
        [a / 10, '*', b, c],
        [a * 10, '*', b * 10, c * 1000],
        [c * 10, '/', b, a * 100],
        [c / 10, '/', b, a],
        [c, '/', b / 10, a * 100],
        [a, '*', b + 1, (c + a) * 10],
      ];
      const [x, op, y, t] = R.pick(fam);
      const q = `${F.n(x)} ${op === '*' ? F.times : F.div} ${F.n(y)}`;
      return {
        marks: 1, answer: dz(t, 1),
        check: () => Math.abs((op === '*' ? x * y : x / y) - t / 10) < 1e-9,
        body: A => `<p>${F.n(a)} ${F.times} ${b} = ${F.n(c)}</p><p>Use this fact to work out:</p><div class="sent c">${q} = ${A.blank(dz(t, 1), 24)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_009.which-equal', topics: ['Y6_009'], level: 2,
    make(R) {
      const a = R.int(13, 79), b = R.int(12, 48), c = a * b;
      if (a % 10 === 0 || b % 10 === 0) return null;
      // each option: [text, value in hundredths]
      const right = [`${dz(a, 1)} ${F.times} ${b * 10}`, c * 100];
      const wrong = R.sample([
        [`${dz(a, 1)} ${F.times} ${b}`, c * 10],
        [`${a} ${F.times} ${b * 10}`, c * 1000],
        [`${a * 10} ${F.times} ${b * 10}`, c * 10000],
        [`${dz(a, 1)} ${F.times} ${dz(b, 1)}`, c],
      ], 3);
      const opts = R.shuffle([right, ...wrong]);
      const ri = opts.indexOf(right);
      return {
        marks: 1, answer: right[0],
        check: () => opts.filter(o => o[1] === c * 100).length === 1,
        body: A => `<p>${F.n(a)} ${F.times} ${b} = ${F.n(c)}</p><p>Circle the calculation that has the same answer.</p>${A.circle(opts.map(o => o[0]), ri)}`,
      };
    },
  });
  add({
    id: 'Y6_009.one-more', topics: ['Y6_009'], level: 2,
    make(R) {
      const who = R.name(), a = R.int(14, 68), b = R.int(12, 39), c = a * b;
      const up = R.chance(0.5), nb = up ? b + 1 : b - 1, ans = up ? c + a : c - a;
      return {
        marks: 1, answer: F.n(ans),
        guide: `${up ? 'Add' : 'Subtract'} one more ${a}: ${F.n(c)} ${up ? '+' : F.minus} ${a} = ${F.n(ans)}.`,
        check: () => a * nb === ans,
        body: A => `<p>${who} knows that ${a} ${F.times} ${b} = ${F.n(c)}.</p><p>Use this fact to work out ${a} ${F.times} ${nb}.</p>${A.box(F.n(ans))}`,
      };
    },
  });

  // new_d_afe4i7p9_6_mwt9hhe3 4-digit × 2-digit, compact column multiplication
  const LM = 'new_d_afe4i7p9_6_mwt9hhe3';
  add({
    id: LM + '.calc', topics: [LM], level: 3,
    make(R) {
      const a = R.int(1012, 9876), b = R.int(13, 89);
      if (b % 10 === 0 || a % 10 === 0) return null;
      const ans = a * b;
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: 'Award 1 mark for a correct method with no more than one arithmetic error.',
        check: () => ans / b === a && a * (b % 10) + a * (b - b % 10) === ans,
        body: A => `<p>Work out</p><div class="sent c">${F.n(a)} ${F.times} ${b}</div>${A.work(`${F.n(a)} ${F.times} ${b % 10} = ${F.n(a * (b % 10))}<br>${F.n(a)} ${F.times} ${b - b % 10} = ${F.n(a * (b - b % 10))}<br>${F.n(a * (b % 10))} + ${F.n(a * (b - b % 10))} = ${F.n(ans)}`, 34)}${A.box(F.n(ans), { w: 36 })}`,
      };
    },
  });
  add({
    id: LM + '.word', topics: [LM], level: 3,
    make(R) {
      const ctxs = [
        () => { const a = R.int(1150, 4890), b = R.int(12, 28); return [a, b, `A theatre has <b>${F.n(a)}</b> seats. Every seat is sold for <b>${b}</b> shows.`, 'How many tickets are sold altogether?', 'tickets']; },
        () => { const a = R.int(1205, 3990), b = R.int(14, 52); return [a, b, `A factory makes <b>${F.n(a)}</b> bottles each day.`, `How many bottles does it make in <b>${b}</b> days?`, 'bottles']; },
        () => { const a = R.int(1025, 2480), b = R.int(15, 35); return [a, b, `A school pays <b>£${F.n(a)}</b> each month for its buses.`, `How much does it pay in <b>${b}</b> months?`, '']; },
      ];
      const [a, b, l1, l2, unit] = R.pick(ctxs)();
      if (b % 10 === 0) return null;
      const ans = a * b;
      return {
        marks: 2, method: true, answer: unit ? F.n(ans) : '£' + F.n(ans),
        guide: 'Award 1 mark for a correct method with no more than one arithmetic error.',
        check: () => ans % a === 0 && ans / a === b,
        body: A => `<p>${l1}</p><p>${l2}</p>${A.work(`${F.n(a)} ${F.times} ${b} = ${F.n(ans)}`, 30)}${unit ? A.box(F.n(ans), { unit, w: 36 }) : A.box(F.n(ans), { pre: '£', w: 36 })}`,
      };
    },
  });
  add({
    id: LM + '.mistake', topics: [LM], level: 3,
    make(R) {
      const who = R.name(), a = R.int(1102, 4321), t = R.int(1, 4), o = R.int(2, 9), b = t * 10 + o;
      const p1 = a * o, p2 = a * t, wrong = p1 + p2, ans = a * b;
      return {
        marks: 2, answer: F.n(ans),
        guide: `(a) 1 mark: ${who} multiplied by ${t} instead of ${t * 10} (forgot the zero / place value). (b) 1 mark: ${F.n(ans)}.`,
        check: () => p1 + p2 * 10 === ans && ans !== wrong,
        body: A => `<p>${who} worked out ${F.n(a)} ${F.times} ${b} like this.</p>
          <table class="qt" style="border:0"><tr><td style="border:0;text-align:right">${F.n(a)} ${F.times} ${o} =</td><td style="border:0;text-align:right">${F.n(p1)}</td></tr><tr><td style="border:0;text-align:right">${F.n(a)} ${F.times} ${t} =</td><td style="border:0;text-align:right">${F.n(p2)}</td></tr><tr><td style="border:0;text-align:right">total =</td><td style="border:0;text-align:right">${F.n(wrong)}</td></tr></table>
          ${A.part('a', `Explain the mistake ${who} has made.${A.explain(`${who} worked out ${F.n(a)} ${F.times} ${t} but should have worked out ${F.n(a)} ${F.times} ${t * 10} = ${F.n(p2 * 10)}.`, 2)}`)}
          ${A.part('b', `What is the correct answer?${A.box(F.n(ans), { w: 34 })}`)}`,
      };
    },
  });
  add({
    id: LM + '.estimate', topics: [LM], level: 2,
    make(R) {
      const A0 = R.int(2, 9) * 1000, B0 = R.int(2, 9) * 10;
      const a = A0 + R.pick([-1, 1]) * R.int(3, 40), b = B0 + R.pick([-1, 1]);
      const est = A0 * B0;
      const opts = R.shuffle([est, est / 10, est * 10, (A0 + 1000) * B0]);
      return {
        marks: 1, answer: F.n(est),
        check: () => Math.abs(a * b - est) < Math.abs(a * b - opts.filter(x => x !== est).reduce((m, x) => Math.abs(a * b - x) < Math.abs(a * b - m) ? x : m, opts.find(x => x !== est))),
        body: A => `<p>Circle the best estimate for</p><div class="sent c">${F.n(a)} ${F.times} ${b}</div>${A.circle(opts.map(x => F.n(x)), opts.indexOf(est))}`,
      };
    },
  });

  // new_d_afe4i7p9_7_mwt9ixue long division by a 2-digit number
  const LD = 'new_d_afe4i7p9_7_mwt9ixue';
  add({
    id: LD + '.calc', topics: [LD], level: 3,
    make(R) {
      const d = R.int(13, 48), q = R.int(105, 899); if (d % 10 === 0) return null;
      const n = d * q;
      if (n > 99999 || n < 1000) return null;
      return {
        marks: 2, method: true, answer: F.n(q),
        guide: 'Award 1 mark for a correct long division method with no more than one arithmetic error.',
        check: () => q * d === n && n % d === 0,
        body: A => `<p>Use long division to work out</p><div class="sent c">${F.n(n)} ${F.div} ${d}</div>${A.work(`${F.n(n)} ${F.div} ${d} = ${F.n(q)}<br>(check: ${F.n(q)} ${F.times} ${d} = ${F.n(n)})`, 36)}${A.box(F.n(q))}`,
      };
    },
  });
  add({
    id: LD + '.coaches', topics: [LD], level: 3,
    make(R) {
      const d = R.int(24, 57), q = R.int(8, 35), r = R.int(3, d - 3), n = d * q + r;
      const c = R.pick([['pupils', 'coaches', 'Each coach holds', 'How many coaches are needed?', true],
        ['eggs', 'boxes', 'Each box holds', 'How many boxes can be filled?', false],
        ['people', 'tables', 'Each table seats', 'How many tables are needed so that everyone has a seat?', true],
        ['sweets', 'bags', 'Each bag holds', 'How many bags can be completely filled?', false]]);
      const ans = c[4] ? q + 1 : q;
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: `${F.n(n)} ${F.div} ${d} = ${q} r ${r}. Award 1 mark for ${c[4] ? `${q} r ${r} or ${q}` : `${q} r ${r} or ${q + 1}`} shown with a correct method.`,
        check: () => d * q + r === n && r > 0 && r < d,
        body: A => `<p>There are <b>${F.n(n)}</b> ${c[0]}.</p><p>${c[2]} <b>${d}</b> ${c[0]}.</p><p>${c[3]}</p>${A.work(`${F.n(n)} ${F.div} ${d} = ${q} r ${r}, so ${ans} ${c[1]}`, 30)}${A.box(ans, { unit: c[1] })}`,
      };
    },
  });
  add({
    id: LD + '.missing', topics: [LD], level: 2,
    make(R) {
      const d = R.int(12, 49), q = R.int(105, 650); if (d % 10 === 0) return null;
      const n = d * q, form = R.int(0, 1);
      return {
        marks: 1, answer: F.n(form ? n : d),
        check: () => n / q === d,
        body: A => form
          ? `<p>Write the missing number.</p><div class="sent c">${A.blank(F.n(n), 24)} ${F.div} ${d} = ${q}</div>`
          : `<p>Write the missing number.</p><div class="sent c">${F.n(n)} ${F.div} ${A.blank(d, 16)} = ${q}</div>`,
      };
    },
  });


  /* =====================================================================
   * FRACTIONS, DECIMALS AND PERCENTAGES
   * ===================================================================== */
  // random simplest proper fraction with denominator from list
  const properFrac = (R, dens) => { for (let k = 0; k < 50; k++) { const d = R.pick(dens), n = R.int(1, d - 1); if (gcd(n, d) === 1) return [n, d]; } return [1, R.pick(dens)]; };

  // Y6_012 simplify fractions using common factors
  add({
    id: 'Y6_012.simplify', topics: ['Y6_012'], level: 1,
    make(R) {
      const [n, d] = properFrac(R, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const k = R.int(2, 9);
      if (d * k > 120) return null;
      return {
        marks: 1, answer: F.frac(n, d),
        check: () => gcd(n, d) === 1 && (n * k) * d === (d * k) * n,
        body: A => `<p>Write ${F.frac(n * k, d * k)} in its simplest form.</p><div class="sent c">${F.frac(n * k, d * k)} = ${fbox(A, n, d)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_012.not-equal', topics: ['Y6_012'], level: 2,
    make(R) {
      const [n, d] = properFrac(R, [3, 4, 5, 6, 7, 8, 9, 10]);
      const ks = R.ints(4, 2, 9);
      const opts = ks.slice(0, 3).map(k => [n * k, d * k]);
      const k = ks[3], wrong = [n * k + R.pick([-1, 1]), d * k];
      if (wrong[0] <= 0 || wrong[0] >= wrong[1]) return null;
      opts.push(wrong);
      const sh = R.shuffle(opts), wi = sh.indexOf(wrong);
      return {
        marks: 1, answer: F.frac(wrong[0], wrong[1]),
        check: () => sh.filter(f => f[0] * d !== f[1] * n).length === 1 && wrong[0] * d !== wrong[1] * n,
        body: A => `<p>Three of these fractions are equal to ${F.frac(n, d)}.</p><p>Circle the fraction that is <b>not</b> equal to ${F.frac(n, d)}.</p>${A.circle(sh.map(f => F.frac(f[0], f[1])), wi)}`,
      };
    },
  });
  add({
    id: 'Y6_012.odd-explain', topics: ['Y6_012'], level: 2,
    make(R) {
      const who = R.name(), k = R.pick([3, 5, 7]);
      const [n, d] = properFrac(R, [3, 5, 7, 9, 11, 13]);
      if (n % 2 === 0 || d === k || n === k) return null;
      const N = n * k, Dd = d * k;
      if (Dd > 100) return null;
      return {
        marks: 1, answer: `No. ${F.frac(N, Dd)} = ${F.frac(n, d)}`,
        guide: `Accept an explanation that ${N} and ${Dd} have a common factor of ${k}, or showing ${F.frac(N, Dd)} = ${F.frac(n, d)}.`,
        check: () => N % 2 === 1 && Dd % 2 === 1 && gcd(N, Dd) === k,
        body: A => `<p>${who} says,</p><p style="text-align:center"><i>"${F.frac(N, Dd)} cannot be simplified because ${N} and ${Dd} are both odd numbers."</i></p><p>Explain why ${who} is wrong.</p>${A.explain(`${N} and ${Dd} can both be divided by ${k}, so ${F.frac(N, Dd)} = ${F.frac(n, d)}.`, 2)}`,
      };
    },
  });

  // close fractions: a/b and c/d, different denominators, small gap over a common denominator
  function closePair(R) {
    for (let t = 0; t < 200; t++) {
      const b = R.int(3, 12), d = R.intNot(3, 12, [b]), L = F.lcm(b, d);
      if (L > 60 || L === Math.max(b, d)) continue;
      const a = R.int(1, b - 1), c = R.int(1, d - 1);
      if (gcd(a, b) !== 1 || gcd(c, d) !== 1) continue;
      const diff = Math.abs(a * (L / b) - c * (L / d));
      if (diff >= 1 && diff <= 2) return { a, b, c, d, L };
    }
    return null;
  }
  // Y6_013 common denominators to compare fractions close in value
  add({
    id: 'Y6_013.compare', topics: ['Y6_013'], level: 1,
    make(R) {
      const p = closePair(R); if (!p) return null;
      const { a, b, c, d } = p, s = sym(a * d, c * b);
      return {
        marks: 1, answer: s,
        check: () => (a / b < c / d) === (s === '&lt;') && a * d !== c * b,
        body: A => `<p>Write &lt; or &gt; to make this correct.</p><div class="sent c">${F.frac(a, b)} ${A.blank(s, 12)} ${F.frac(c, d)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_013.rewrite', topics: ['Y6_013'], level: 3,
    make(R) {
      const p = closePair(R); if (!p) return null;
      const { a, b, c, d, L } = p, n1 = a * L / b, n2 = c * L / d;
      const gi = n1 > n2 ? 0 : 1;
      return {
        marks: 2, answer: `${F.frac(n1, L)} and ${F.frac(n2, L)}; ${gi ? F.frac(c, d) : F.frac(a, b)}`,
        guide: '1 mark for (a) both numerators, 1 mark for (b).',
        check: () => n1 * b === a * L && n2 * d === c * L && (gi === 0) === (a / b > c / d),
        body: A => `${A.part('a', `Write the missing numerators.<div class="sent c">${F.frac(a, b)} = ${F.frac(A.blank(n1, 10), L)} &nbsp; &nbsp; ${F.frac(c, d)} = ${F.frac(A.blank(n2, 10), L)}</div>`)}
          ${A.part('b', `Circle the greater fraction.${A.circle([F.frac(a, b), F.frac(c, d)], gi)}`)}`,
      };
    },
  });
  add({
    id: 'Y6_013.order', topics: ['Y6_013'], level: 2,
    make(R) {
      const L = R.pick([24, 30, 36, 40]);
      const divs = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 20].filter(x => L % x === 0 && x < L);
      let fs = null;
      for (let t = 0; t < 100 && !fs; t++) {
        const ds = R.sample(divs, 3), tgt = 0.2 + R.f() * 0.6;
        const cand = ds.map(d => { const ok = []; for (let n = 1; n < d; n++) if (gcd(n, d) === 1 && Math.abs(n / d - tgt) < 0.17) ok.push(n); return ok.length ? (n => [n, d, n * L / d])(R.pick(ok)) : null; });
        if (cand.some(c => !c)) continue;
        if (new Set(cand.map(c => c[2])).size < 3 || cand.filter(c => c[0] > 1).length < 2) continue;
        fs = cand;
      }
      if (!fs) return null;
      const sorted = fs.slice().sort((x, y) => x[2] - y[2]);
      return {
        marks: 1, answer: sorted.map(f => F.frac(f[0], f[1])).join(', '),
        check: () => sorted[0][0] / sorted[0][1] < sorted[1][0] / sorted[1][1] && sorted[1][0] / sorted[1][1] < sorted[2][0] / sorted[2][1],
        body: A => `<p>Write these fractions in order, starting with the <b>smallest</b>.</p><div class="sent c">${fs.map(f => F.frac(f[0], f[1])).join(' &nbsp; &nbsp; ')}</div>${A.boxes(sorted.map(f => [F.frac(f[0], f[1])]), { w: 16 })}`,
      };
    },
  });

  // Y6_014 compare fractions (including above 1) by reasoning
  add({
    id: 'Y6_014.greater', topics: ['Y6_014'], level: 2,
    make(R) {
      const kind = R.int(0, 2);
      let f1, f2;
      if (kind === 0) { const n = R.int(2, 7), a = R.int(n + 1, 13), b = R.intNot(n + 1, 13, [a]); f1 = [n, a]; f2 = [n, b]; }
      else if (kind === 1) { const a = R.int(4, 12), b = R.intNot(4, 12, [a]); f1 = [a - 1, a]; f2 = [b - 1, b]; }
      else { const w = R.int(1, 3), a = R.int(3, 9), b = R.intNot(3, 9, [a]); f1 = [w * a + 1, a]; f2 = [w * b + 1, b]; }
      if (gcd(f1[0], f1[1]) !== 1 || gcd(f2[0], f2[1]) !== 1) return null;
      const gi = f1[0] * f2[1] > f2[0] * f1[1] ? 0 : 1;
      const opts = [f1, f2];
      const why = ['Same numerator: the smaller denominator means bigger parts.', 'Both are one part less than 1; the part missing is smaller for the larger denominator.', `Both are ${Math.floor(f1[0] / f1[1])} and one part; the part is bigger for the smaller denominator.`][kind];
      return {
        marks: 1, answer: F.frac(opts[gi][0], opts[gi][1]),
        guide: why,
        check: () => opts[gi][0] / opts[gi][1] > opts[1 - gi][0] / opts[1 - gi][1],
        body: A => `<p>Circle the greater fraction.</p>${A.circle(opts.map(f => F.frac(f[0], f[1])), gi)}<p>Explain how you know.</p>${A.explain(why, 2)}`,
      };
    },
  });
  add({
    id: 'Y6_014.half', topics: ['Y6_014'], level: 2,
    make(R) {
      const fs = [];
      const seen = new Set();
      for (let t = 0; t < 100 && fs.length < 5; t++) {
        const d = R.int(3, 15), n = R.int(1, d - 1);
        if (2 * n === d || gcd(n, d) !== 1 || seen.has(n / d)) continue;
        seen.add(n / d); fs.push([n, d]);
      }
      if (fs.length < 5) return null;
      const right = fs.map((f, i) => 2 * f[0] > f[1] ? i : -1).filter(i => i >= 0);
      if (right.length < 1 || right.length > 3) return null;
      return {
        marks: 1, answer: right.map(i => F.frac(fs[i][0], fs[i][1])).join(', '),
        guide: 'All the correct fractions and no others must be ticked.',
        check: () => right.every(i => fs[i][0] / fs[i][1] > 0.5) && fs.filter(f => f[0] / f[1] > 0.5).length === right.length,
        body: A => `<p>Tick <b>all</b> the fractions that are greater than ${F.frac(1, 2)}.</p>${A.tick(fs.map(f => F.frac(f[0], f[1])), right)}`,
      };
    },
  });
  add({
    id: 'Y6_014.improper', topics: ['Y6_014'], level: 2,
    make(R) {
      const w = R.int(1, 4), a = R.int(3, 9), n = R.int(1, a - 1), b = R.intNot(2, 9, [a]), m = R.int(1, b - 1);
      if (gcd(n, a) !== 1 || gcd(m, b) !== 1) return null;
      const v1 = (w * a + n) / a, w2 = R.pick([w, w, w + 1, w - 1]);
      if (w2 < 1) return null;
      const v2 = w2 + m / b;
      if (Math.abs(v1 - v2) < 1e-9) return null;
      const opts = [F.frac(w * a + n, a), F.mixed(w2, m, b)];
      const gi = v1 > v2 ? 0 : 1;
      return {
        marks: 1, answer: opts[gi],
        guide: `${F.frac(w * a + n, a)} = ${F.mixed(w, n, a)}`,
        check: () => (w * a + n) * b > (w2 * b + m) * a === (gi === 0),
        body: A => `<p>Circle the greater number.</p>${A.circle(opts, gi)}`,
      };
    },
  });

  // new_d_afe4i7p9_1_mwt90ef5 common denominators to calculate with fractions
  const CD = 'new_d_afe4i7p9_1_mwt90ef5';
  add({
    id: CD + '.add-sub', topics: [CD], level: 1,
    make(R) {
      const [a, b] = properFrac(R, [2, 3, 4, 5, 6, 8, 10, 12]), [c, d] = properFrac(R, [2, 3, 4, 5, 6, 8, 10, 12]);
      if (b === d || F.lcm(b, d) > 40) return null;
      const plus = R.chance(0.5);
      const L = F.lcm(b, d), num = plus ? a * L / b + c * L / d : a * L / b - c * L / d;
      if (num <= 0) return null;
      const [n, dd] = simp(num, L);
      return {
        marks: 1, answer: fr(n, dd), guide: n > dd ? `Accept ${F.frac(n, dd)} or equivalent fractions.` : 'Accept equivalent fractions.',
        check: () => Math.abs((plus ? a / b + c / d : a / b - c / d) - n / dd) < 1e-9,
        body: A => `<p>Work out</p><div class="sent c">${F.frac(a, b)} ${plus ? '+' : F.minus} ${F.frac(c, d)} = ${A.blank(fr(n, dd), 18)}</div>`,
      };
    },
  });
  add({
    id: CD + '.mixed', topics: [CD], level: 2,
    make(R) {
      const [a, b] = properFrac(R, [3, 4, 5, 6, 8, 10, 12]), [c, d] = properFrac(R, [2, 3, 4, 5, 6, 8]);
      if (b === d || F.lcm(b, d) > 24) return null;
      const w1 = R.int(3, 7), w2 = R.int(1, w1 - 1), L = F.lcm(b, d);
      const plus = R.chance(0.4);
      const N1 = w1 * L + a * L / b, N2 = w2 * L + c * L / d, num = plus ? N1 + N2 : N1 - N2;
      if (num <= 0) return null;
      const [n, dd] = simp(num, L);
      if (dd === 1) return null;
      return {
        marks: 1, answer: fr(n, dd), guide: `Accept ${F.frac(n, dd)} or equivalent.`,
        check: () => Math.abs((plus ? (w1 + a / b) + (w2 + c / d) : (w1 + a / b) - (w2 + c / d)) - n / dd) < 1e-9,
        body: A => `<p>Work out</p><div class="sent c">${F.mixed(w1, a, b)} ${plus ? '+' : F.minus} ${F.mixed(w2, c, d)} = ${A.blank(fr(n, dd), 20)}</div>`,
      };
    },
  });
  add({
    id: CD + '.left', topics: [CD], level: 3,
    make(R) {
      const [x, y] = R.names(2);
      const [a, b] = properFrac(R, [3, 4, 5, 6, 8]), [c, d] = properFrac(R, [3, 4, 5, 6, 8, 10]);
      if (b === d) return null;
      const L = F.lcm(b, d), used = a * L / b + c * L / d;
      if (used >= L || L > 40) return null;
      const [n, dd] = simp(L - used, L);
      const thing = R.pick([['a cake', 'eats'], ['a pizza', 'eats'], ['a bottle of juice', 'drinks'], ['a bag of flour', 'uses']]);
      return {
        marks: 2, method: true, answer: F.frac(n, dd),
        guide: 'Accept equivalent fractions. Award 1 mark for a correct method, e.g. finding a common denominator and subtracting from 1.',
        check: () => Math.abs(1 - a / b - c / d - n / dd) < 1e-9,
        body: A => `<p>${x} ${thing[1]} ${F.frac(a, b)} of ${thing[0]}.</p><p>${y} ${thing[1]} ${F.frac(c, d)} of the same ${thing[0].replace(/^a (bag of |bottle of )?/, '$1').replace(/^an? /, '')}.</p><p>What fraction is left?</p>${A.work(`${F.frac(a * L / b, L)} + ${F.frac(c * L / d, L)} = ${F.frac(used, L)}<br>1 ${F.minus} ${F.frac(used, L)} = ${F.frac(L - used, L)}`, 30)}${A.box(F.frac(n, dd), { w: 22 })}`,
      };
    },
  });
  add({
    id: CD + '.missing', topics: [CD], level: 2,
    make(R) {
      const [a, b] = properFrac(R, [2, 3, 4, 5, 6]), [c, d] = properFrac(R, [4, 6, 8, 10, 12]);
      if (b === d) return null;
      const L = F.lcm(b, d), num = c * L / d - a * L / b;
      if (num <= 0 || L > 30) return null;
      const [n, dd] = simp(num, L);
      return {
        marks: 1, answer: F.frac(n, dd), guide: 'Accept equivalent fractions.',
        check: () => Math.abs(a / b + n / dd - c / d) < 1e-9,
        body: A => `<p>Write the missing fraction.</p><div class="sent c">${F.frac(a, b)} + ${fbox(A, n, dd)} = ${F.frac(c, d)}</div>`,
      };
    },
  });

  // new_d_afe4i7p9_2_mwt94swa percentages of amounts
  const PC = 'new_d_afe4i7p9_2_mwt94swa';
  add({
    id: PC + '.of', topics: [PC], level: 1,
    make(R) {
      const p = R.pick([10, 20, 25, 30, 40, 60, 70, 75, 80, 90, 5, 15, 35, 45, 1, 2, 12, 65]);
      const n = R.int(2, 90) * R.pick([10, 20, 4, 5]);
      if (p * n % 100 || n < 20 || n > 900) return null;
      const ans = p * n / 100;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans * 100 / p === n,
        body: A => `<p>Work out</p><div class="sent c">${p}% of ${F.n(n)} = ${A.blank(F.n(ans), 18)}</div>`,
      };
    },
  });
  add({
    id: PC + '.sale', topics: [PC], level: 3,
    make(R) {
      const who = R.name(), p = R.pick([10, 20, 25, 30, 40, 15, 5]), price = R.int(8, 60) * R.pick([100, 200, 400, 500]);
      if (price * p % 100 || price > 25000) return null;
      const off = price * p / 100, ans = price - off;
      const thing = R.pick(['coat', 'bike', 'tent', 'scooter', 'guitar', 'pair of trainers']);
      return {
        marks: 2, method: true, answer: F.money(ans),
        guide: `Award 1 mark for finding ${p}% (${F.money(off)}) or for a correct method with one error.`,
        check: () => ans * 100 === price * (100 - p),
        body: A => `<p>A ${thing} costs <b>${F.money(price)}</b>.</p><p>In a sale the price is reduced by <b>${p}%</b>.</p><p>${who} buys the ${thing} in the sale. How much does ${who} pay?</p>${A.work(`${p}% of ${F.money(price)} = ${F.money(off)}<br>${F.money(price)} ${F.minus} ${F.money(off)} = ${F.money(ans)}`, 28)}${A.box(F.n(ans / 100, 2), { pre: '£' })}`,
      };
    },
  });
  add({
    id: PC + '.greater', topics: [PC], level: 2,
    make(R) {
      const ps = [10, 20, 25, 30, 40, 50, 60, 75, 5, 15];
      const mk = () => { const p = R.pick(ps), n = R.int(2, 60) * 20; return [p, n, p * n / 100]; };
      const x = mk(), y = mk();
      if (x[2] === y[2] || x[0] === y[0] || x[1] === y[1] || !Number.isInteger(x[2]) || !Number.isInteger(y[2])) return null;
      const gi = x[2] > y[2] ? 0 : 1;
      return {
        marks: 1, answer: `${[x, y][gi][0]}% of ${F.n([x, y][gi][1])}`,
        guide: `${x[0]}% of ${F.n(x[1])} = ${F.n(x[2])}; ${y[0]}% of ${F.n(y[1])} = ${F.n(y[2])}.`,
        check: () => (x[0] * x[1] > y[0] * y[1]) === (gi === 0),
        body: A => `<p>Which is greater? Circle it.</p>${A.circle([`${x[0]}% of ${F.n(x[1])}`, `${y[0]}% of ${F.n(y[1])}`], gi)}`,
      };
    },
  });
  add({
    id: PC + '.reverse', topics: [PC], level: 2,
    make(R) {
      const p = R.pick([10, 20, 25, 50, 5, 75, 40]), n = R.int(4, 80) * 10;
      const x = p * n / 100;
      if (!Number.isInteger(x)) return null;
      return {
        marks: 1, answer: F.n(n),
        check: () => n * p === x * 100,
        body: A => `<p><b>${p}%</b> of a number is <b>${F.n(x)}</b>.</p><p>What is the number?</p>${A.box(F.n(n))}`,
      };
    },
  });

  // new_d_afe4i7p9_3_mwt95bye compare fractions, decimals and percentages (values in thousandths)
  const FDP = 'new_d_afe4i7p9_3_mwt95bye';
  const fdpItem = (R, type) => {
    if (type === 'f') { for (let t = 0; t < 50; t++) { const d = R.pick([2, 4, 5, 8, 10, 20, 25, 50]), n = R.int(1, d - 1); if (gcd(n, d) === 1) return { v: n * 1000 / d, s: F.frac(n, d) }; } }
    if (type === 'p') { const p = R.int(1, 99); return { v: p * 10, s: p + '%' }; }
    const dp = R.int(1, 3), u = Math.pow(10, 3 - dp), m = R.int(1, Math.pow(10, dp) - 1);
    if (m % 10 === 0 && dp > 1) return fdpItem(R, 'd');
    return { v: m * u, s: dz(m * u, 3) };
  };
  add({
    id: FDP + '.order', topics: [FDP], level: 2,
    make(R) {
      const items = R.shuffle([fdpItem(R, 'f'), fdpItem(R, 'p'), fdpItem(R, 'd'), fdpItem(R, R.pick(['d', 'f']))]);
      const vs = items.map(i => i.v).sort((a, b) => a - b);
      for (let i = 1; i < 4; i++) if (vs[i] - vs[i - 1] < 10) return null;
      if (vs[3] - vs[0] > 500) return null;
      const sorted = items.slice().sort((a, b) => a.v - b.v);
      return {
        marks: 1, answer: sorted.map(i => i.s).join(', '),
        check: () => sorted.every((x, i) => i === 0 || x.v > sorted[i - 1].v),
        body: A => `<p>Write these in order, starting with the <b>smallest</b>.</p><div class="sent c">${items.map(i => i.s).join(' &nbsp; &nbsp; ')}</div>${A.boxes(sorted.map(i => [i.s]), { w: 18 })}`,
      };
    },
  });
  add({
    id: FDP + '.symbol', topics: [FDP], level: 1,
    make(R) {
      const [t1, t2] = R.sample(['f', 'p', 'd'], 2);
      const x = fdpItem(R, t1);
      let y = fdpItem(R, t2);
      if (R.chance(0.2) && t2 === 'p' && x.v % 10 === 0) y = { v: x.v, s: x.v / 10 + '%' };
      if (Math.abs(x.v - y.v) > 150) return null;
      const s = sym(x.v, y.v);
      return {
        marks: 1, answer: s,
        check: () => (s === '=') === (x.v === y.v) && (s === '&lt;') === (x.v < y.v),
        body: A => `<p>Write &lt;, &gt; or = to make this correct.</p><div class="sent c">${x.s} ${A.blank(s, 12)} ${y.s}</div>`,
      };
    },
  });
  add({
    id: FDP + '.odd-one', topics: [FDP], level: 2,
    make(R) {
      // three equal forms and one near-miss (the common mistake of reading the digits)
      const pairs = [[1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 2], [1, 8], [3, 8], [7, 10], [3, 10], [9, 20], [7, 20], [3, 25]];
      const [n, d] = R.pick(pairs), v = n * 1000 / d;
      const near = +(`${n}${d}`) * Math.pow(10, 3 - String(n).length - String(d).length);
      if (near === v || near >= 1000 || near <= 0) return null;
      const eq = [F.frac(n, d), dz(v, 3), F.n(v / 10) + '%'];
      const wrongs = [dz(near, 3), F.n(near / 10) + '%'];
      const w = R.pick(wrongs);
      const opts = R.shuffle([...eq, w]), wi = opts.indexOf(w);
      return {
        marks: 1, answer: w,
        check: () => near !== v && Math.abs(v * d - n * 1000) < 1e-9,
        body: A => `<p>Circle the one that is <b>not</b> equal to the others.</p>${A.circle(opts, wi)}`,
      };
    },
  });
  add({
    id: FDP + '.match', topics: [FDP], level: 1,
    make(R) {
      const pairs = R.sample([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [1, 25], [1, 50]], 4);
      const left = pairs.map(p => F.frac(p[0], p[1]));
      const vals = pairs.map(p => p[0] * 100 / p[1]);
      const pct = R.chance(0.5);
      const order = R.shuffle([0, 1, 2, 3]);
      const right = order.map(i => pct ? F.n(vals[i]) + '%' : dz(vals[i] * 10, 3));
      return {
        marks: 1, answer: pairs.map((p, i) => `${p[0]}/${p[1]} = ${pct ? F.n(vals[i]) + '%' : dz(vals[i] * 10, 3)}`).join('; '),
        guide: 'All four lines must be correct.',
        check: () => pairs.every((p, i) => Math.abs(vals[i] / 100 - p[0] / p[1]) < 1e-9),
        body: A => `<p>Draw lines to match each fraction to the equal ${pct ? 'percentage' : 'decimal'}.</p>${A.match(left, right, pairs.map((_, i) => [i, order.indexOf(i)]))}`,
      };
    },
  });

  /* =====================================================================
   * RATIO AND PROPORTION
   * ===================================================================== */
  const ratioPair = R => { for (let t = 0; t < 50; t++) { const a = R.int(1, 7), b = R.int(2, 9); if (a !== b && gcd(a, b) === 1) return [a, b]; } return [2, 3]; };

  // Y6_010 problems involving ratio
  add({
    id: 'Y6_010.share', topics: ['Y6_010'], level: 2,
    make(R) {
      const [x, y] = R.names(2), [a, b] = ratioPair(R), k = R.int(3, 15), T = (a + b) * k;
      const money = R.chance(0.5);
      const big = a > b ? x : y, ans = Math.max(a, b) * k;
      return {
        marks: 1, answer: money ? '£' + F.n(ans) : F.n(ans),
        check: () => ans + Math.min(a, b) * k === T && ans / Math.max(a, b) === T / (a + b),
        body: A => `<p>${x} and ${y} share ${money ? '£' + F.n(T) : F.n(T) + ' sweets'} in the ratio <b>${a} : ${b}</b>.</p><p>How ${money ? 'much money' : 'many sweets'} does ${big} get?</p>${money ? A.box(F.n(ans), { pre: '£' }) : A.box(F.n(ans))}`,
      };
    },
  });
  add({
    id: 'Y6_010.for-every', topics: ['Y6_010'], level: 2,
    make(R) {
      const [a, b] = ratioPair(R), k = R.int(3, 12);
      if (a < 2) return null;
      const c = R.pick([['red beads', 'blue beads', 'On a necklace'], ['oak trees', 'beech trees', 'In a wood'], ['adults', 'children', 'On a school trip'], ['bags of crisps', 'apples', 'At a picnic']]);
      const form = R.int(0, 1);
      const ans = form ? a * k + b * k : a * k;
      return {
        marks: 1, answer: F.n(ans),
        check: () => form ? ans / (a + b) === k : ans * b === a * (b * k),
        body: A => `<p>${c[2]}, for every <b>${a}</b> ${c[0]} there are <b>${b}</b> ${c[1]}.</p><p>There are <b>${b * k}</b> ${c[1]}.</p><p>${form ? `How many ${c[0]} and ${c[1]} are there altogether?` : `How many ${c[0]} are there?`}</p>${A.box(F.n(ans))}`,
      };
    },
  });
  add({
    id: 'Y6_010.total', topics: ['Y6_010'], level: 3,
    make(R) {
      const [a, b] = ratioPair(R), k = R.int(3, 9), boys = a * k, girls = b * k;
      const diff = R.chance(0.5);
      const known = diff ? Math.abs(girls - boys) : boys;
      if (diff && a === b) return null;
      const more = girls > boys ? 'girls' : 'boys';
      return {
        marks: 2, method: true, answer: F.n(boys + girls),
        guide: `Award 1 mark for finding one part (${k}) or for a correct method with one error.`,
        check: () => (boys + girls) === (a + b) * (diff ? known / Math.abs(b - a) : known / a),
        body: A => `<p>In a school club the ratio of boys to girls is <b>${a} : ${b}</b>.</p><p>${diff ? `There are <b>${known}</b> more ${more} than ${more === 'girls' ? 'boys' : 'girls'}.` : `There are <b>${boys}</b> boys.`}</p><p>How many children are in the club altogether?</p>${A.work(`one part = ${diff ? `${known} ${F.div} ${Math.abs(b - a)}` : `${boys} ${F.div} ${a}`} = ${k}<br>${a + b} parts = ${a + b} ${F.times} ${k} = ${boys + girls}`, 28)}${A.box(boys + girls, { unit: 'children' })}`,
      };
    },
  });
  add({
    id: 'Y6_010.fraction', topics: ['Y6_010'], level: 2,
    make(R) {
      const [a, b] = ratioPair(R);
      if (a < 2) return null;
      const c = R.pick([['cats', 'dogs', 'animals', 'At a rescue centre'], ['red cars', 'white cars', 'cars', 'In a car park'], ['apples', 'pears', 'pieces of fruit', 'In a fruit box']]);
      const which = R.int(0, 1), num = which ? b : a;
      const [n, d] = simp(num, a + b);
      return {
        marks: 1, answer: F.frac(n, d),
        check: () => n * (a + b) === num * d,
        body: A => `<p>${c[3]}, for every <b>${a}</b> ${c[0]} there are <b>${b}</b> ${c[1]}. There are no other ${c[2]}.</p><p>What fraction of the ${c[2]} are ${c[which]}?</p><div class="sent c">${fbox(A, n, d)}</div>`,
      };
    },
  });

  // Y6_NC_07 missing values using multiplication and division facts (proportion)
  add({
    id: 'Y6_NC_07.recipe', topics: ['Y6_NC_07'], level: 3,
    make(R) {
      const n = R.pick([2, 3, 4, 6]), m = R.pick([3, 5, 6, 8, 9, 10, 12]);
      if (m === n || (m * 10) % n) return null;
      const ings = [['flour', 'g', R.int(4, 12) * 25], ['butter', 'g', R.int(2, 8) * 25], ['sugar', 'g', R.int(2, 8) * 25], ['milk', 'ml', R.int(2, 10) * 50]];
      const list = ings.map(([nm, u, v]) => [nm, u, v * n / R.pick([1, 1])]);
      const i = R.int(0, 3), [nm, u, base] = list[i];
      const ans = base * m / n;
      if (!Number.isInteger(ans) || !Number.isInteger(base / n)) return null;
      return {
        marks: 2, method: true, answer: `${F.n(ans)} ${u}`,
        guide: `Award 1 mark for finding the amount for 1 person (${F.n(base / n)} ${u}) or a correct method.`,
        check: () => ans * n === base * m,
        body: A => `<p>Here is a recipe for pancakes for <b>${n} people</b>.</p>${A.table(list.map(r => [r[0], `${F.n(r[2])} ${r[1]}`]))}<p>How much ${nm} is needed for <b>${m} people</b>?</p>${A.work(`${F.n(base)} ${F.div} ${n} = ${F.n(base / n)}<br>${F.n(base / n)} ${F.times} ${m} = ${F.n(ans)}`, 20)}${A.box(F.n(ans), { unit: u })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_07.unitary', topics: ['Y6_NC_07'], level: 2,
    make(R) {
      const k = R.int(3, 8), j = R.intNot(2, 12, [k]), unit = R.int(12, 95) * 5;
      const total = k * unit, ans = j * unit;
      const thing = R.pick(['cinema tickets', 'notebooks', 'packs of pens', 'swimming passes', 'bottles of juice']);
      return {
        marks: 1, answer: F.money(ans),
        check: () => ans * k === total * j,
        body: A => `<p><b>${k}</b> ${thing} cost <b>${F.money(total)}</b>.</p><p>How much do <b>${j}</b> ${thing} cost?</p>${A.box(F.n(ans / 100, 2), { pre: '£' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_07.table', topics: ['Y6_NC_07'], level: 2,
    make(R) {
      const per = R.int(3, 12), xs = R.ints(3, 2, 15).sort((a, b) => a - b);
      const ys = xs.map(x => x * per);
      const c = R.pick([['Number of boxes', 'Number of cakes'], ['Number of packs', 'Number of cards'], ['Number of tables', 'Number of chairs']]);
      const h1 = R.int(1, 2);               // hide one y and one x
      const h2 = h1 === 1 ? 2 : 1;
      return {
        marks: 1, answer: `${ys[h1]} and ${xs[h2]}`,
        guide: 'Both values must be correct.',
        check: () => ys[h1] / xs[h1] === ys[0] / xs[0] && ys[h2] % per === 0,
        body: A => `<p>The table shows how two amounts are related.</p><p>Write the missing numbers.</p>${A.table([[c[0], ...xs.map((x, i) => i === h2 ? { a: x } : x)], [c[1], ...ys.map((y, i) => i === h1 ? { a: y } : y)]], { rowHead: true })}`,
      };
    },
  });

  // Y6_NC_08 similar shapes and scale factors
  add({
    id: 'Y6_NC_08.rect', topics: ['Y6_NC_08'], level: 2,
    make(R) {
      const w = R.int(2, 6), h = R.intNot(2, 8, [w]), k = R.int(2, 5);
      const askW = R.chance(0.5);
      const ans = askW ? w * k : h * k;
      const uA = Math.min(4, 24 / Math.max(w, h)), uB = Math.min(uA * 1.7, 40 / Math.max(w, h));
      const sA = D.shape({ pts: [[0, 0], [w * uA, 0], [w * uA, h * uA], [0, h * uA]], labels: [`${w} cm`, `${h} cm`] });
      const sB = D.shape({ pts: [[0, 0], [w * uB, 0], [w * uB, h * uB], [0, h * uB]], labels: [askW ? '?' : `${w * k} cm`, askW ? `${h * k} cm` : '?'] });
      return {
        marks: 1, answer: `${ans} cm`,
        check: () => (askW ? ans / w === (h * k) / h : ans / h === (w * k) / w),
        body: A => `<p>Rectangle B is an enlargement of rectangle A.</p>${D.row([{ fig: sA, cap: 'A' }, { fig: sB, cap: 'B' }], 14)}${note}<p>What is the length marked <b>?</b></p>${A.box(ans, { unit: 'cm' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_08.grid', topics: ['Y6_NC_08'], level: 2,
    make(R) {
      const shapes = [[[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]], [[0, 0], [3, 0], [3, 1], [0, 1]], [[0, 0], [2, 0], [2, 2], [0, 2]], [[0, 0], [2, 0], [0, 2]], [[0, 0], [3, 0], [3, 2], [0, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [0, 2]], [[0, 0], [3, 0], [0, 2]], [[0, 0], [2, 0], [2, 1], [0, 1]]];
      const base = R.pick(shapes), k = R.pick([2, 3]);
      const bw = Math.max(...base.map(p => p[0])), bh = Math.max(...base.map(p => p[1]));
      if (bw * k > 7 || bh * k > 7) return null;
      const ox = 1, oy = R.int(1, 8 - bh * k);
      const A0 = base.map(p => [p[0] + ox, p[1] + oy]);
      const bx = ox + bw + 2;
      const B0 = base.map(p => [p[0] * k + bx, p[1] * k + oy]);
      if (bx + bw * k > 16) return null;
      return {
        marks: 1, answer: `Enlargement, scale factor ${k}`,
        guide: 'Accept the enlarged shape drawn anywhere on the grid, the right way round.',
        check: () => polyArea(B0) === polyArea(A0) * k * k,
        body: A => `<p>Draw an enlargement of this shape with scale factor <b>${k}</b>.</p>${D.grid({ cols: 17, rows: 9, cell: 6, polys: [{ pts: A0 }, { pts: B0, ans: true }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_08.triangle', topics: ['Y6_NC_08'], level: 3,
    make(R) {
      const s = R.ints(3, 3, 9).sort((a, b) => a - b);
      if (s[0] + s[1] <= s[2]) return null;
      const k = R.int(2, 4), known = s[0] * k, ask = R.int(1, 2), ans = s[ask] * k;
      return {
        marks: 1, answer: `${ans} cm`,
        check: () => ans / s[ask] === known / s[0],
        body: A => `<p>A triangle has sides of <b>${s[0]} cm</b>, <b>${s[1]} cm</b> and <b>${s[2]} cm</b>.</p><p>It is enlarged. The shortest side of the new triangle is <b>${known} cm</b>.</p><p>How long is the <b>${ask === 2 ? 'longest' : 'middle'}</b> side of the new triangle?</p>${A.box(ans, { unit: 'cm' })}`,
      };
    },
  });

  // Y6_NC_09 unequal sharing and grouping
  add({
    id: 'Y6_NC_09.times', topics: ['Y6_NC_09'], level: 2,
    make(R) {
      const [x, y] = R.names(2), k = R.int(2, 5), b = R.int(6, 40), T = b * (k + 1);
      const thing = R.pick(['stickers', 'conkers', 'marbles', 'points']);
      return {
        marks: 1, answer: F.n(k * b),
        check: () => k * b + b === T,
        body: A => `<p>${x} and ${y} have <b>${T}</b> ${thing} altogether.</p><p>${x} has <b>${['', '', 'twice', 'three times', 'four times', 'five times'][k]}</b> as many ${thing} as ${y}.</p><p>How many ${thing} does ${x} have?</p>${A.box(k * b)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_09.more', topics: ['Y6_NC_09'], level: 2,
    make(R) {
      const [x, y] = R.names(2), small = R.int(12, 80), d = R.int(5, 40), T = small * 2 + d;
      const money = R.chance(0.5), askBig = R.chance(0.5);
      const ans = askBig ? small + d : small;
      const fmt = v => money ? '£' + F.n(v) : F.n(v);
      return {
        marks: 1, answer: fmt(ans),
        check: () => (askBig ? ans + (ans - d) : ans + ans + d) === T,
        body: A => `<p>${x} and ${y} have ${money ? `<b>£${F.n(T)}</b>` : `<b>${T}</b> cards`} altogether.</p><p>${x} has ${money ? `<b>£${d}</b>` : `<b>${d}</b>`} more than ${y}.</p><p>How ${money ? 'much' : 'many cards'} does <b>${askBig ? x : y}</b> have?</p>${money ? A.box(F.n(ans), { pre: '£' }) : A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_09.three', topics: ['Y6_NC_09'], level: 3,
    make(R) {
      const [x, y, z] = R.names(3), a = R.int(4, 25), kb = R.int(2, 3), kc = R.int(kb + 1, 5);
      const T = a * (1 + kb + kc);
      const word = ['', '', 'twice', 'three times', 'four times', 'five times'];
      const ask = R.int(0, 2), ans = [a, a * kb, a * kc][ask];
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: `Award 1 mark for finding that ${x} has ${a} (${T} ${F.div} ${1 + kb + kc}) or a correct method.`,
        check: () => a + a * kb + a * kc === T,
        body: A => `<p>${x}, ${y} and ${z} collect <b>${T}</b> shells.</p><p>${y} collects ${word[kb]} as many as ${x}.</p><p>${z} collects ${word[kc]} as many as ${x}.</p><p>How many shells does <b>${[x, y, z][ask]}</b> collect?</p>${A.work(`${1 + kb + kc} equal parts: ${T} ${F.div} ${1 + kb + kc} = ${a}${ask ? `<br>${a} ${F.times} ${[1, kb, kc][ask]} = ${ans}` : ''}`, 26)}${A.box(ans)}`,
      };
    },
  });

  /* =====================================================================
   * ALGEBRA
   * ===================================================================== */
  // Y6_011 problems with two unknowns
  add({
    id: 'Y6_011.sum-diff', topics: ['Y6_011'], level: 2,
    make(R) {
      const a = R.int(8, 45), b = R.int(3, a - 2), S = a + b, Dd = a - b;
      return {
        marks: 1, answer: `▲ = ${a}, ● = ${b}`, guide: 'Both values must be correct.',
        check: () => (S + Dd) / 2 === a && (S - Dd) / 2 === b,
        body: A => `<p>▲ and ● stand for two numbers.</p><div class="sent c">▲ + ● = ${S}</div><div class="sent c">▲ ${F.minus} ● = ${Dd}</div><p>What are the two numbers?</p>${A.boxes([[a, '', '▲ ='], [b, '', '● =']], { w: 16 })}`,
      };
    },
  });
  add({
    id: 'Y6_011.shop', topics: ['Y6_011'], level: 3,
    make(R) {
      const k = R.int(2, 3), x = R.int(15, 90) * 5, y = R.int(20, 120) * 5;
      const c = R.pick([['pens', 'pen', 'ruler'], ['apples', 'apple', 'banana'], ['pencils', 'pencil', 'notebook'], ['cookies', 'cookie', 'drink']]);
      const t1 = k * x + y, t2 = x + y;
      const ask = R.int(0, 1), ans = ask ? y : x;
      return {
        marks: 2, method: true, answer: F.money(ans),
        guide: `Award 1 mark for finding the difference ${F.money(t1 - t2)} is the cost of ${k - 1} ${k - 1 === 1 ? c[1] : c[0]}, or a correct method.`,
        check: () => (t1 - t2) / (k - 1) === x && t2 - x === y,
        body: A => `<p><b>${k}</b> ${c[0]} and <b>1</b> ${c[2]} cost <b>${F.money(t1)}</b>.</p><p><b>1</b> ${c[1]} and <b>1</b> ${c[2]} cost <b>${F.money(t2)}</b>.</p><p>How much does <b>1 ${ask ? c[2] : c[1]}</b> cost?</p>${A.work(`${k - 1} ${k - 1 === 1 ? c[1] : c[0]} = ${F.money(t1)} ${F.minus} ${F.money(t2)} = ${F.money(t1 - t2)}${k === 3 ? `<br>1 ${c[1]} = ${F.money(x)}` : ''}${ask ? `<br>1 ${c[2]} = ${F.money(t2)} ${F.minus} ${F.money(x)} = ${F.money(y)}` : ''}`, 28)}${A.box(F.money(ans))}`,
      };
    },
  });
  add({
    id: 'Y6_011.times', topics: ['Y6_011'], level: 2,
    make(R) {
      const b = R.int(3, 20), k = R.int(2, 6), a = k * b;
      const sumForm = R.chance(0.5), T = sumForm ? a + b : a - b;
      const ask = R.int(0, 1);
      return {
        marks: 1, answer: ask ? `● = ${b}` : `▲ = ${a}`,
        check: () => (sumForm ? T / (k + 1) : T / (k - 1)) === b,
        body: A => `<div class="sent c">▲ = ${k} ${F.times} ●</div><div class="sent c">▲ ${sumForm ? '+' : F.minus} ● = ${T}</div><p>Work out the value of <b>${ask ? '●' : '▲'}</b>.</p>${A.boxes([[ask ? b : a, '', ask ? '● =' : '▲ =']], { w: 16 })}`,
      };
    },
  });

  // Y6_NC_10 simple formulae; linear number sequences
  add({
    id: 'Y6_NC_10.formula', topics: ['Y6_NC_10'], level: 1,
    make(R) {
      const a = R.int(2, 9), b = R.int(3, 30), x = R.int(3, 15), minus = R.chance(0.3);
      const y = minus ? a * x - b : a * x + b;
      if (y <= 0) return null;
      const L = R.pick(['y', 'p', 'c', 't']), X = R.pick(['n', 'x', 'k', 'm']);
      return {
        marks: 1, answer: F.n(y),
        check: () => (minus ? (y + b) : (y - b)) / a === x,
        body: A => `<p>Here is a formula.</p><div class="sent c"><i>${L}</i> = ${a}<i>${X}</i> ${minus ? F.minus : '+'} ${b}</div><p>Work out the value of <i>${L}</i> when <i>${X}</i> = ${x}.</p>${A.box(y)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_10.hire', topics: ['Y6_NC_10'], level: 2,
    make(R) {
      const fixed = R.int(2, 12) * 5, per = R.int(3, 15), h = R.int(2, 9), T = fixed + per * h;
      const c = R.pick([['a bouncy castle', 'hours'], ['a bike', 'hours'], ['a boat', 'hours'], ['a hall', 'hours']]);
      const who = R.name();
      return {
        marks: 1, answer: `${h} hours`,
        check: () => fixed + per * h === T && (T - fixed) % per === 0,
        body: A => `<p>The cost of hiring ${c[0]} is worked out with this formula.</p><div class="sent c">cost = £${fixed} + £${per} for each hour</div><p>${who} pays <b>£${T}</b>.</p><p>For how many hours did ${who} hire ${c[0]}?</p>${A.box(h, { unit: 'hours' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_10.sequence', topics: ['Y6_NC_10'], level: 2,
    make(R) {
      const dec = R.chance(0.4);
      const sc = dec ? 10 : 1;
      const d = dec ? R.pick([-1, 1]) * R.int(2, 9) * (R.chance(0.5) ? 5 : 1) : R.pick([-1, 1]) * R.int(3, 25);
      const a = dec ? R.int(-20, 60) : R.int(-30, 90);
      const terms = [0, 1, 2, 3, 4].map(i => a + i * d);
      if (!dec && !terms.some(t => t < 0) && R.chance(0.5)) return null;
      const hide = R.sample([1, 2, 3], 2).sort();
      const fmtT = t => dec ? F.n(t / sc, 1) : F.n(t);
      return {
        marks: 1, answer: hide.map(i => fmtT(terms[i])).join(' and '), guide: 'Both numbers must be correct.',
        check: () => terms.every((t, i) => i === 0 || t - terms[i - 1] === d) && terms[4] - terms[0] === 4 * d,
        body: A => `<p>The numbers in this sequence go up or down by the same amount each time.</p><p>Write the missing numbers.</p><div class="sent c">${terms.map((t, i) => hide.includes(i) ? A.blank(fmtT(t), 18) : fmtT(t)).join(', &nbsp;')}</div>`,
      };
    },
  });
  add({
    id: 'Y6_NC_10.nth', topics: ['Y6_NC_10'], level: 2,
    make(R) {
      const a = R.int(1, 20), d = R.int(2, 9), n = R.pick([10, 12, 15, 20, 25, 50, 100]);
      const ans = a + (n - 1) * d;
      return {
        marks: 1, answer: F.n(ans),
        check: () => (ans - a) / d === n - 1,
        body: A => `<p>Here are the first four terms of a sequence.</p><div class="sent c">${[0, 1, 2, 3].map(i => a + i * d).join(', &nbsp;')}, &nbsp;…</div><p>The sequence continues in the same way. What is the <b>${n}th</b> term?</p>${A.box(ans)}`,
      };
    },
  });

  // Y6_NC_11 express missing number problems algebraically
  add({
    id: 'Y6_NC_11.solve', topics: ['Y6_NC_11'], level: 1,
    make(R) {
      const a = R.int(2, 9), n = R.int(2, 15), b = R.int(2, 40), minus = R.chance(0.4);
      const c = minus ? a * n - b : a * n + b;
      if (c <= 0) return null;
      const v = R.pick(['n', 'x', 'y', 'a']);
      return {
        marks: 1, answer: `${v} = ${n}`,
        check: () => (minus ? a * n - b : a * n + b) === c,
        body: A => `<div class="sent c">${a}<i>${v}</i> ${minus ? F.minus : '+'} ${b} = ${c}</div><p>What is the value of <i>${v}</i>?</p>${A.boxes([[n, '', `<i>${v}</i> =`]], { w: 16 })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_11.expression', topics: ['Y6_NC_11'], level: 2,
    make(R) {
      const k = R.int(2, 6), m = R.int(5, 30), v = R.pick(['p', 'n', 'c']);
      const c = R.pick([['A pencil costs', 'pence', 'A pen costs', 'more than a pencil', 'pens'], ['A small bag holds', 'sweets', 'A big bag holds', 'more sweets than a small bag', 'big bags']]);
      const opts = [`${k}<i>${v}</i> + ${m}`, `${k}(<i>${v}</i> + ${m})`, `<i>${v}</i> + ${k * m}`, `${k}<i>${v}</i> + ${m}<i>${v}</i>`];
      const sh = R.shuffle([0, 1, 2, 3]), ri = sh.indexOf(1);
      // check: with v = 7 only the right expression equals k(v+m)
      const t = 7, vals = [k * t + m, k * (t + m), t + k * m, k * t + m * t];
      return {
        marks: 1, answer: opts[1],
        check: () => vals.filter(x => x === k * (t + m)).length === 1,
        body: A => `<p>${c[0]} <i>${v}</i> ${c[1]}.</p><p>${c[2]} ${m} ${c[3]}.</p><p>Circle the expression for the total in <b>${k}</b> ${c[4]}.</p>${A.circle(sh.map(i => opts[i]), ri)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_11.substitute', topics: ['Y6_NC_11'], level: 1,
    make(R) {
      const a = R.int(2, 12), b = R.intNot(2, 12, [a]), p = R.int(2, 6), q = R.int(2, 5);
      const forms = [[`${p}<i>a</i> + ${q}<i>b</i>`, p * a + q * b], [`${p}<i>a</i> ${F.minus} ${q}<i>b</i>`, p * a - q * b], [`${p}(<i>a</i> + <i>b</i>)`, p * (a + b)], [`<i>a</i><i>b</i> ${F.minus} ${q}`, a * b - q]];
      const [e, ans] = R.pick(forms);
      if (ans <= 0) return null;
      return {
        marks: 1, answer: F.n(ans),
        check: () => Number.isInteger(ans) && forms.some(f => f[1] === ans),
        body: A => `<p><i>a</i> = ${a} and <i>b</i> = ${b}</p><p>Work out the value of</p><div class="sent c">${e}</div>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_11.think', topics: ['Y6_NC_11'], level: 2,
    make(R) {
      const who = R.name(), n = R.int(3, 25), k = R.int(2, 9), b = R.int(3, 30), minus = R.chance(0.5);
      const out = minus ? n * k - b : n * k + b;
      if (out <= 0) return null;
      return {
        marks: 1, answer: F.n(n),
        check: () => (minus ? (out + b) / k : (out - b) / k) === n,
        body: A => `<p>${who} thinks of a number.</p><p>${who} multiplies it by <b>${k}</b>, then ${minus ? 'subtracts' : 'adds'} <b>${b}</b>.</p><p>The answer is <b>${out}</b>.</p><p>What number did ${who} think of?</p>${A.box(n)}`,
      };
    },
  });

  // Y6_NC_12 list all possibilities for combinations of two variables
  add({
    id: 'Y6_NC_12.pairs', topics: ['Y6_NC_12'], level: 3,
    make(R) {
      let pairs, rule;
      if (R.chance(0.5)) {
        const N = R.pick([12, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48]);
        pairs = []; for (let a = 1; a * a < N; a++) if (N % a === 0) pairs.push([a, N / a]);
        rule = `<i>a</i> ${F.times} <i>b</i> = ${N}`;
        if (pairs.length < 3 || pairs.length > 5) return null;
        return finish(`<i>a</i> is smaller than <i>b</i>.`, (a, b) => a * b === N && a < b);
      }
      const p = R.int(2, 5), q = R.intNot(2, 6, [p]), N = R.int(15, 40);
      pairs = []; for (let a = 1; p * a < N; a++) if ((N - p * a) % q === 0) pairs.push([a, (N - p * a) / q]);
      rule = `${p}<i>a</i> + ${q}<i>b</i> = ${N}`;
      if (pairs.length < 2 || pairs.length > 5) return null;
      return finish('', (a, b) => p * a + q * b === N);
      function finish(extra, ok) {
        return {
          marks: 2, answer: pairs.map(x => `a = ${x[0]}, b = ${x[1]}`).join('; '),
          guide: 'Award 2 marks for all pairs and no wrong pairs; 1 mark for at least two correct pairs.',
          check: () => pairs.every(x => ok(x[0], x[1]) && x[1] > 0),
          body: A => `<p><i>a</i> and <i>b</i> are whole numbers greater than 0. ${extra}</p><div class="sent c">${rule}</div><p>Write <b>all</b> the possible pairs of values for <i>a</i> and <i>b</i>.</p>${A.table(pairs.map(x => [{ a: x[0] }, { a: x[1] }]), { head: ['<i>a</i>', '<i>b</i>'] })}`,
        };
      }
    },
  });
  add({
    id: 'Y6_NC_12.meals', topics: ['Y6_NC_12'], level: 2,
    make(R) {
      const s = R.int(2, 5), m = R.int(2, 6), three = R.chance(0.4), d = three ? R.int(2, 4) : 1;
      const ans = s * m * d;
      const c = R.pick([['starters', 'main courses', 'puddings', 'A café lets you choose a meal.', 'meals'], ['tops', 'pairs of shorts', 'hats', `${R.name()} is choosing a PE kit.`, 'kits'], ['types of bread', 'fillings', 'sauces', 'A sandwich shop lets you choose your sandwich.', 'sandwiches']]);
      return {
        marks: 1, answer: F.n(ans),
        check: () => { let k = 0; for (let i = 0; i < s; i++) for (let j = 0; j < m; j++) for (let l = 0; l < d; l++) k++; return k === ans; },
        body: A => `<p>${c[3]}</p><p>There are <b>${s}</b> ${c[0]}${three ? ',' : ' and'} <b>${m}</b> ${c[1]}${three ? ` and <b>${d}</b> ${c[2]}` : ''}.</p><p>You choose one of each. How many different ${c[4]} are possible?</p>${A.box(ans)}`,
      };
    },
  });


  /* =====================================================================
   * NUMBER: NEGATIVES, DIVISION, ORDER OF OPERATIONS, FACTORS
   * ===================================================================== */
  // Y6_NC_01 negative numbers in context; intervals across zero
  add({
    id: 'Y6_NC_01.rise', topics: ['Y6_NC_01'], level: 1,
    make(R) {
      const t1 = -R.int(2, 15), t2 = R.int(-1, 14);
      if (t2 === 0 || t2 <= t1) return null;
      const place = R.pick(['a town in Scotland', 'a mountain village', 'a city in Canada', 'a farm']);
      const ans = t2 - t1;
      return {
        marks: 1, answer: `${ans}°C`,
        check: () => t1 + ans === t2,
        body: A => `<p>At 6 am the temperature in ${place} was <b>${F.n(t1)}°C</b>.</p><p>At 2 pm it was <b>${F.n(t2)}°C</b>.</p><p>By how many degrees did the temperature rise?</p>${A.box(ans, { unit: '°C' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_01.fall', topics: ['Y6_NC_01'], level: 2,
    make(R) {
      const t = R.int(-8, 9), d = R.int(5, 18), ans = t - d;
      if (ans >= 0 || t === 0) return null;
      return {
        marks: 1, answer: `${F.n(ans)}°C`,
        check: () => ans + d === t && ans < 0,
        body: A => `<p>The temperature is <b>${F.n(t)}°C</b>.</p><p>It falls by <b>${d} degrees</b>.</p><p>What is the temperature now?</p>${A.box(F.n(ans), { unit: '°C' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_01.thermo', topics: ['Y6_NC_01'], level: 1,
    make(R) {
      const minor = R.pick([1, 2]), lev = R.int(-9, 9) * minor;
      if (lev >= 0 || lev % 10 === 0) return null;
      return {
        marks: 1, answer: `${F.n(lev)}°C`,
        check: () => lev % minor === 0 && lev < 0,
        body: A => `<p>What temperature does the thermometer show?</p>${D.scale({ kind: 'thermo', min: -20, max: 20, major: 10, minor, level: lev, unit: '°C', height: 50 }, A)}${A.box(F.n(lev), { unit: '°C' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_01.sequence', topics: ['Y6_NC_01'], level: 2,
    make(R) {
      const d = R.int(3, 9), a = R.int(2, 3 * d);
      const terms = [0, 1, 2, 3, 4, 5].map(i => a - i * d);
      if (terms[5] > -3) return null;
      const hide = [3, 4, 5].filter(i => terms[i] < 0).slice(-2);
      if (hide.length < 2) return null;
      return {
        marks: 1, answer: hide.map(i => F.n(terms[i])).join(' and '), guide: 'Both must be correct.',
        check: () => terms[5] === a - 5 * d,
        body: A => `<p>This sequence goes down by <b>${d}</b> each time.</p><p>Write the missing numbers.</p><div class="sent c">${terms.map((t, i) => hide.includes(i) ? A.blank(F.n(t), 16) : F.n(t)).join(', &nbsp;')}</div>`,
      };
    },
  });

  // Y6_NC_02 short division by a 2-digit number
  add({
    id: 'Y6_NC_02.calc', topics: ['Y6_NC_02'], level: 1,
    make(R) {
      const d = R.pick([11, 12, 15, 25, 13, 14, 16]), q = R.int(84, 830), n = d * q;
      if (n < 1000 || n > 9999) return null;
      return {
        marks: 1, answer: F.n(q),
        check: () => q * d === n,
        body: A => `<p>Work out</p><div class="sent c">${F.n(n)} ${F.div} ${d} = ${A.blank(q, 20)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_NC_02.boxes', topics: ['Y6_NC_02'], level: 3,
    make(R) {
      const d = R.pick([12, 15, 16, 24, 25]), q = R.int(45, 380), n = d * q;
      if (n > 9999 || n < 1000) return null;
      const c = R.pick([['eggs', 'boxes'], ['pencils', 'packs'], ['tins of beans', 'trays'], ['cakes', 'boxes']]);
      return {
        marks: 2, method: true, answer: F.n(q),
        guide: 'Award 1 mark for a correct division method with one arithmetic error.',
        check: () => q * d === n,
        body: A => `<p>A factory packs <b>${F.n(n)}</b> ${c[0]} into ${c[1]} of <b>${d}</b>.</p><p>How many ${c[1]} does it fill?</p>${A.work(`${F.n(n)} ${F.div} ${d} = ${F.n(q)}`, 28)}${A.box(q, { unit: c[1] })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_02.remainder', topics: ['Y6_NC_02'], level: 2,
    make(R) {
      const d = R.pick([12, 15, 11, 25]), q = R.int(84, 600), r = R.int(1, d - 1), n = d * q + r;
      if (n > 9999 || n < 1000) return null;
      return {
        marks: 1, answer: `${q} r ${r}`, guide: 'Accept answers with the remainder as a fraction or decimal if correct.',
        check: () => q * d + r === n && r < d,
        body: A => `<p>Work out ${F.n(n)} ${F.div} ${d}.</p><p>Give your answer with a remainder.</p>${A.boxes([[q, 'r'], [r]], { w: 18 })}`,
      };
    },
  });

  // Y6_NC_03 order of operations; estimating to check
  add({
    id: 'Y6_NC_03.calc', topics: ['Y6_NC_03'], level: 1,
    make(R) {
      const a = R.int(3, 40), b = R.int(2, 12), c = R.int(2, 9);
      const forms = [
        [`${a} + ${b} ${F.times} ${c}`, a + b * c, () => a + b * c - a === b * c],
        [`${a + b * c} ${F.minus} ${b} ${F.times} ${c}`, a, () => a + b * c === (a + b * c)],
        [`(${a} + ${b}) ${F.times} ${c}`, (a + b) * c, () => ((a + b) * c) / c === a + b],
        [`${a * c} ${F.div} ${c} + ${b}`, a + b, () => a * c / c === a],
        [`${b} ${F.times} ${c} ${F.minus} ${a}`, b * c - a, () => b * c - a + a === b * c],
        [`${a} + ${b * c} ${F.div} ${c}`, a + b, () => b * c / c === b],
      ];
      const [q, ans, chk] = R.pick(forms);
      if (ans <= 0) return null;
      return {
        marks: 1, answer: F.n(ans),
        check: chk,
        body: A => `<p>Work out</p><div class="sent c">${q} = ${A.blank(F.n(ans), 18)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_NC_03.brackets', topics: ['Y6_NC_03'], level: 2,
    make(R) {
      const a = R.int(2, 12), b = R.int(2, 12), c = R.int(2, 9);
      const forms = [
        [`${a} + ${b} ${F.times} ${c}`, (a + b) * c, `(${a} + ${b}) ${F.times} ${c}`, a + b * c],
        [`${a} ${F.times} ${b} + ${c}`, a * (b + c), `${a} ${F.times} (${b} + ${c})`, a * b + c],
        [`${a + b + c} ${F.minus} ${b} ${F.times} ${c}`, (a + c) * c, `(${a + b + c} ${F.minus} ${b}) ${F.times} ${c}`, a + b + c - b * c],
      ];
      const [e, T, ansE, noBr] = R.pick(forms);
      if (T === noBr) return null;
      return {
        marks: 1, answer: ansE,
        check: () => T !== noBr && T > 0,
        body: A => `<p>Write brackets to make this calculation correct.</p><div class="sent c">${e} = ${F.n(T)}</div>${A.show ? `<div class="sent c">${A.red(ansE)}</div>` : ''}`,
      };
    },
  });
  add({
    id: 'Y6_NC_03.estimate', topics: ['Y6_NC_03'], level: 2,
    make(R) {
      const div = R.chance(0.5);
      let q, est, opts, exact;
      if (div) {
        const B0 = R.pick([20, 30, 40, 50, 60, 70, 80]), Q0 = R.int(3, 19) * 10, A0 = B0 * Q0;
        const a = A0 + R.int(-30, 30), b = B0 + R.pick([-1, 1]);
        q = `${F.n(a)} ${F.div} ${b}`; est = Q0; exact = a / b; opts = [Q0, Q0 * 10, Q0 / 10, Q0 + 100];
        if (!Number.isInteger(Q0 / 10)) return null;
      } else {
        const A0 = R.int(2, 9) * 100, B0 = R.int(2, 9) * 10;
        const a = A0 + R.pick([-1, 1]) * R.int(1, 9), b = B0 + R.pick([-1, 1]);
        q = `${F.n(a)} ${F.times} ${b}`; est = A0 * B0; exact = a * b; opts = [est, est * 10, est / 10, est + A0 * 10];
      }
      if (new Set(opts).size < 4) return null;
      const sh = R.shuffle(opts);
      return {
        marks: 1, answer: F.n(est),
        check: () => sh.every(x => x === est || Math.abs(x - exact) > Math.abs(est - exact)),
        body: A => `<p>Circle the best estimate for</p><div class="sent c">${q}</div>${A.circle(sh.map(x => F.n(x)), sh.indexOf(est))}`,
      };
    },
  });
  add({
    id: 'Y6_NC_03.explain', topics: ['Y6_NC_03'], level: 2,
    make(R) {
      const who = R.name(), a = R.int(3, 20), b = R.int(2, 9), c = R.int(2, 9);
      const wrong = (a + b) * c, right = a + b * c;
      return {
        marks: 1, answer: `No, ${right}`,
        guide: `Accept an explanation that the multiplication must be done first: ${b} ${F.times} ${c} = ${b * c}, then ${a} + ${b * c} = ${right}.`,
        check: () => right - a === b * c && wrong !== right,
        body: A => `<p>${who} says,</p><p style="text-align:center"><i>"${a} + ${b} ${F.times} ${c} = ${wrong}"</i></p><p>Is ${who} correct? Explain how you know.</p>${A.explain(`No. Multiply first: ${b} ${F.times} ${c} = ${b * c}, so the answer is ${a} + ${b * c} = ${right}.`, 2)}`,
      };
    },
  });

  // Y6_NC_04 common factors, common multiples, primes
  const isPrime = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  add({
    id: 'Y6_NC_04.primes', topics: ['Y6_NC_04'], level: 1,
    make(R) {
      const ps = [], cs = [];
      for (let n = 21; n < 100; n++) { if (isPrime(n)) ps.push(n); else if (n % 2 && n % 5) cs.push(n); }
      const opts = R.shuffle([...R.sample(ps, 2), ...R.sample(cs, 3)]);
      const right = opts.map((x, i) => isPrime(x) ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => opts[i]).join(' and '), guide: 'Both must be ticked, and no others.',
        check: () => right.length === 2 && opts.filter(x => { for (let d = 2; d < x; d++) if (x % d === 0) return false; return true; }).length === 2,
        body: A => `<p>Tick the <b>two</b> prime numbers.</p>${A.tick(opts, right)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_04.hcf', topics: ['Y6_NC_04'], level: 2,
    make(R) {
      const h = R.int(3, 16), p = R.int(2, 7), q = R.intNot(2, 9, [p]);
      if (gcd(p, q) !== 1) return null;
      const a = h * p, b = h * q;
      if (a > 120 || b > 120) return null;
      return {
        marks: 1, answer: F.n(h),
        check: () => a % h === 0 && b % h === 0 && [...Array(120).keys()].filter(k => k > h && a % k === 0 && b % k === 0).length === 0,
        body: A => `<p>What is the <b>highest common factor</b> of ${a} and ${b}?</p>${A.box(h)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_04.buses', topics: ['Y6_NC_04'], level: 2,
    make(R) {
      const [p, q] = R.sample([4, 6, 8, 9, 10, 12, 15, 20], 2);
      const L = F.lcm(p, q);
      if (L === Math.max(p, q) || L > 90) return null;
      const h = R.int(7, 10), t = h * 60 + L;
      return {
        marks: 1, answer: F.t12(Math.floor(t / 60), t % 60),
        check: () => L % p === 0 && L % q === 0 && [...Array(L).keys()].filter(k => k > 0 && k % p === 0 && k % q === 0).length === 0,
        body: A => `<p>Bus A leaves the bus station every <b>${p} minutes</b>.</p><p>Bus B leaves every <b>${q} minutes</b>.</p><p>They both leave at <b>${F.t12(h, 0)}</b>.</p><p>When is the next time they both leave together?</p>${A.box(F.t12(Math.floor(t / 60), t % 60), { w: 30 })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_04.wrong', topics: ['Y6_NC_04'], level: 2,
    make(R) {
      const who = R.name();
      const st = R.pick([
        ['All odd numbers are prime numbers.', R.pick([9, 15, 21, 25, 27]), x => x % 2 === 1 && !isPrime(x), 'an odd number that is not prime'],
        ['All prime numbers are odd.', 2, x => isPrime(x) && x % 2 === 0, 'the even prime number'],
        ['Every multiple of 3 is odd.', R.pick([6, 12, 18, 24]), x => x % 3 === 0 && x % 2 === 0, 'an even multiple of 3'],
        ['Square numbers always have an even number of factors.', R.pick([4, 9, 16, 25]), x => Math.sqrt(x) % 1 === 0, 'any square number'],
        ['A number with exactly 4 factors must be even.', R.pick([15, 21, 33, 35]), x => x % 2 === 1 && [...Array(x + 1).keys()].filter(k => k && x % k === 0).length === 4, 'an odd number with 4 factors'],
      ]);
      return {
        marks: 1, answer: `e.g. ${st[1]}`, guide: `Accept ${st[3]}.`,
        check: () => st[2](st[1]),
        body: A => `<p>${who} says,</p><p style="text-align:center"><i>"${st[0]}"</i></p><p>Write a number to show that ${who} is wrong.</p>${A.box(st[1])}`,
      };
    },
  });

  // Y6_NC_05 multiply proper fractions; divide proper fractions by whole numbers
  add({
    id: 'Y6_NC_05.mult', topics: ['Y6_NC_05'], level: 1,
    make(R) {
      const [a, b] = properFrac(R, [2, 3, 4, 5, 6, 7, 8]), [c, d] = properFrac(R, [2, 3, 4, 5, 6, 7, 8, 9]);
      const [n, dd] = simp(a * c, b * d);
      return {
        marks: 1, answer: F.frac(n, dd), guide: 'Accept equivalent fractions.',
        check: () => Math.abs(a / b * (c / d) - n / dd) < 1e-12 && gcd(n, dd) === 1,
        body: A => `<p>Work out</p><div class="sent c">${F.frac(a, b)} ${F.times} ${F.frac(c, d)} = ${fbox(A, n, dd)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_NC_05.div', topics: ['Y6_NC_05'], level: 1,
    make(R) {
      const [a, b] = properFrac(R, [2, 3, 4, 5, 6, 7, 8, 9, 10]), k = R.int(2, 6);
      const [n, dd] = simp(a, b * k);
      return {
        marks: 1, answer: F.frac(n, dd), guide: 'Accept equivalent fractions.',
        check: () => Math.abs(n / dd * k - a / b) < 1e-12,
        body: A => `<p>Work out</p><div class="sent c">${F.frac(a, b)} ${F.div} ${k} = ${fbox(A, n, dd)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_NC_05.context', topics: ['Y6_NC_05'], level: 2,
    make(R) {
      if (R.chance(0.5)) {
        const [a, b] = properFrac(R, [2, 3, 4, 5, 6]), k = R.int(2, 5), who = R.name();
        const [n, dd] = simp(a, b * k);
        const thing = R.pick(['pizza', 'cake', 'chocolate bar', 'pie']);
        return {
          marks: 1, answer: F.frac(n, dd), guide: 'Accept equivalent fractions.',
          check: () => Math.abs(n / dd * k - a / b) < 1e-12,
          body: A => `<p>${who} has ${F.frac(a, b)} of a ${thing} left.</p><p>${who} shares it equally between <b>${k}</b> people.</p><p>What fraction of the whole ${thing} does each person get?</p><div class="sent c">${fbox(A, n, dd)}</div>`,
        };
      }
      const [a, b] = properFrac(R, [2, 3, 4, 5, 8]), [c, d] = properFrac(R, [2, 3, 4, 5]);
      const [n, dd] = simp(a * c, b * d);
      return {
        marks: 1, answer: F.frac(n, dd), guide: 'Accept equivalent fractions.',
        check: () => n * b * d === a * c * dd,
        body: A => `<p>${F.frac(a, b)} of a garden is grass.</p><p>${F.frac(c, d)} of the grass has daisies in it.</p><p>What fraction of the <b>whole garden</b> has daisies?</p><div class="sent c">${fbox(A, n, dd)}</div>`,
      };
    },
  });

  // Y6_NC_06 fraction to decimal; multiply and divide decimals by whole numbers
  add({
    id: 'Y6_NC_06.f2d', topics: ['Y6_NC_06'], level: 1,
    make(R) {
      const [n, d] = properFrac(R, [4, 5, 8, 20, 25, 40, 50]);
      const th = n * 1000 / d;
      if (!Number.isInteger(th)) return null;
      return {
        marks: 1, answer: dz(th, 3),
        check: () => th * d === n * 1000,
        body: A => `<p>Write ${F.frac(n, d)} as a decimal.</p>${A.box(dz(th, 3))}`,
      };
    },
  });
  add({
    id: 'Y6_NC_06.mult', topics: ['Y6_NC_06'], level: 1,
    make(R) {
      const dp = R.int(1, 2), X = R.int(11, dp === 1 ? 99 : 999), k = R.int(3, 9);
      if (X % 10 === 0) return null;
      const div = R.chance(0.5), Y = X * k;
      return {
        marks: 1, answer: dz(div ? X : Y, dp),
        check: () => div ? Y / k === X : Y / X === k,
        body: A => div
          ? `<p>Work out</p><div class="sent c">${dz(Y, dp)} ${F.div} ${k} = ${A.blank(dz(X, dp), 20)}</div>`
          : `<p>Work out</p><div class="sent c">${dz(X, dp)} ${F.times} ${k} = ${A.blank(dz(Y, dp), 20)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_NC_06.money', topics: ['Y6_NC_06'], level: 3,
    make(R) {
      const k = R.int(3, 9), each = R.int(105, 899), total = k * each, who = R.name();
      const thing = R.pick(['notebooks', 'tickets', 'sandwiches', 'paintbrushes', 'pots of paint']);
      const change = R.chance(0.5), note = 1000, ch = note - each;
      return {
        marks: 2, method: true, answer: change ? F.money(ch) : F.money(each),
        guide: 'Award 1 mark for a correct method with one arithmetic error.',
        check: () => each * k === total && (each + ch) === note,
        body: A => change
          ? `<p><b>${k}</b> ${thing} cost <b>${F.money(total)}</b> altogether. Each one costs the same.</p><p>${who} buys <b>one</b> and pays with a £10 note.</p><p>How much change does ${who} get?</p>${A.work(`${F.money(total)} ${F.div} ${k} = ${F.money(each)}<br>£10.00 ${F.minus} ${F.money(each)} = ${F.money(ch)}`, 26)}${A.box(F.n(ch / 100, 2), { pre: '£' })}`
          : `<p>${who} buys <b>${k}</b> ${thing} for <b>${F.money(total)}</b>.</p><p>Each one costs the same.</p><p>How much does one cost?</p>${A.work(`${F.money(total)} ${F.div} ${k} = ${F.money(each)}`, 26)}${A.box(F.n(each / 100, 2), { pre: '£' })}`,
      };
    },
  });

  /* =====================================================================
   * MEASURES
   * ===================================================================== */
  // Y6_NC_13 convert units up to 3 decimal places; miles and km
  add({
    id: 'Y6_NC_13.convert', topics: ['Y6_NC_13'], level: 1,
    make(R) {
      const u = R.pick([['kg', 'g', 1000], ['litres', 'ml', 1000], ['km', 'm', 1000], ['m', 'cm', 100], ['cm', 'mm', 10], ['m', 'mm', 1000]]);
      const [big, small, f] = u;
      const S = R.int(3, 9999) * (f === 10 ? 1 : R.pick([1, 1, 5, 10]));
      if (S % f === 0 || S / f > 50) return null;
      const dp = Math.log10(f);
      const toSmall = R.chance(0.5);
      const bigV = dz(S, dp);
      return {
        marks: 1, answer: toSmall ? `${F.n(S)} ${small}` : `${bigV} ${big}`,
        check: () => Math.round(parseFloat(bigV.replace(/,/g, '')) * f) === S,
        body: A => toSmall
          ? `<p>Write the missing number.</p><div class="sent c">${bigV} ${big} = ${A.blank(F.n(S), 22)} ${small}</div>`
          : `<p>Write the missing number.</p><div class="sent c">${F.n(S)} ${small} = ${A.blank(bigV, 22)} ${big}</div>`,
      };
    },
  });
  add({
    id: 'Y6_NC_13.miles', topics: ['Y6_NC_13'], level: 2,
    make(R) {
      const k = R.int(2, 25), miles = 5 * k, km = 8 * k, toKm = R.chance(0.5);
      const who = R.name();
      return {
        marks: 1, answer: toKm ? `${km} km` : `${miles} miles`,
        check: () => miles / 5 === km / 8,
        body: A => `<p>5 miles is about 8 km.</p><p>${toKm ? `${who} cycles <b>${miles} miles</b>. About how many kilometres is that?` : `${who} drives <b>${km} km</b>. About how many miles is that?`}</p>${A.box(toKm ? km : miles, { unit: toKm ? 'km' : 'miles' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_13.jug', topics: ['Y6_NC_13'], level: 3,
    make(R) {
      const cap = R.pick([1500, 2000, 1750, 2250, 1250, 2500]), g = R.int(12, 45) * 5, k = R.int(2, 5);
      const left = cap - g * k;
      if (left <= 50) return null;
      const who = R.name();
      return {
        marks: 2, method: true, answer: `${F.n(left)} ml`, guide: `Award 1 mark for ${k} ${F.times} ${g} = ${F.n(g * k)} ml or for a correct method with one error. Accept ${dz(left, 3)} litres.`,
        check: () => left + g * k === cap,
        body: A => `<p>A bottle holds <b>${dz(cap, 3)} litres</b> of water.</p><p>${who} pours <b>${k}</b> glasses of water from the full bottle. Each glass holds <b>${g} ml</b>.</p><p>How much water is left in the bottle? Give your answer in millilitres.</p>${A.work(`${k} ${F.times} ${g} = ${F.n(g * k)} ml<br>${F.n(cap)} ${F.minus} ${F.n(g * k)} = ${F.n(left)} ml`, 26)}${A.box(F.n(left), { unit: 'ml' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_13.order', topics: ['Y6_NC_13'], level: 2,
    make(R) {
      const big = R.pick([['kg', 'g'], ['km', 'm'], ['litres', 'ml']]);
      const base = R.int(1, 4) * 1000;
      const vals = R.ints(4, base - 300, base + 300).map(v => Math.round(v / 5) * 5);
      if (new Set(vals).size < 4) return null;
      const items = vals.map((v, i) => i % 2 ? { v, s: `${F.n(v)} ${big[1]}` } : { v, s: `${dz(v, 3)} ${big[0]}` });
      const sorted = items.slice().sort((a, b) => a.v - b.v);
      return {
        marks: 1, answer: sorted.map(i => i.s).join(', '),
        check: () => sorted.every((x, i) => i === 0 || x.v > sorted[i - 1].v),
        body: A => `<p>Write these in order, starting with the <b>smallest</b>.</p><div class="sent c">${items.map(i => i.s).join(' &nbsp; &nbsp; ')}</div>${A.boxes(sorted.map(i => [i.s]), { w: 24 })}`,
      };
    },
  });


  // Y6_NC_14 same area, different perimeters (and the other way round)
  const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  add({
    id: 'Y6_NC_14.compare', topics: ['Y6_NC_14'], level: 2,
    make(R) {
      const w1 = R.int(2, 6), h1 = R.int(2, 5), mode = R.int(0, 2);
      let B;
      if (mode === 0) {
        const pairs = []; for (let a = 1; a <= 7; a++) if ((w1 * h1) % a === 0 && (w1 * h1) / a <= 6 && a !== w1 && a !== h1) pairs.push([a, w1 * h1 / a]);
        if (!pairs.length) return null; const [a, b] = R.pick(pairs); B = rectPts(w1 + 3, 1, a, b);
      } else if (mode === 1) {
        const a = R.intNot(1, 7, [w1, h1]), b = w1 + h1 - a;
        if (b < 1 || b > 6 || a === h1) return null; B = rectPts(w1 + 3, 1, a, b);
      } else {
        const x = w1 + 3; B = [[x, 1], [x + w1, 1], [x + w1, 1 + h1 - 1], [x + w1 - 1, h1], [x + w1 - 1, 1 + h1], [x, 1 + h1]];
      }
      const A0 = rectPts(1, 1, w1, h1);
      if (Math.max(...B.map(p => p[0])) > 15) return null;
      const sa = polyArea(A0) === polyArea(B), sp = Math.abs(polyPerim(A0) - polyPerim(B)) < 1e-9;
      if (sa && sp) return null;
      const st = ['They have the same area and the same perimeter.', 'They have the same area but different perimeters.', 'They have different areas but the same perimeter.', 'They have different areas and different perimeters.'];
      const ri = sa ? 1 : sp ? 2 : 3;
      return {
        marks: 1, answer: st[ri],
        check: () => mode === 0 ? ri === 1 : ri === 2,
        body: A => `<p>Here are two shapes on a square grid.</p>${D.grid({ cols: 16, rows: 7, cell: 5, polys: [{ pts: A0, label: 'A' }, { pts: B, label: 'B' }] }, A)}<p>Tick the statement that is true.</p>${A.tick(st, ri, { col: true })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_14.extreme', topics: ['Y6_NC_14'], level: 2,
    make(R) {
      const N = R.pick([12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 48]), big = R.chance(0.5);
      const pairs = []; for (let a = 1; a * a <= N; a++) if (N % a === 0) pairs.push([a, N / a]);
      const per = pairs.map(([a, b]) => 2 * (a + b));
      const ans = big ? Math.max(...per) : Math.min(...per);
      return {
        marks: 1, answer: `${ans} cm`,
        check: () => big ? ans === 2 * (1 + N) : pairs.some(([a, b]) => 2 * (a + b) === ans) && per.every(p => p >= ans),
        body: A => `<p>A rectangle has an area of <b>${N} cm²</b>.</p><p>The length and width are both whole numbers of centimetres.</p><p>What is the <b>${big ? 'greatest' : 'smallest'}</b> possible perimeter?</p>${A.box(ans, { unit: 'cm' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_14.counter', topics: ['Y6_NC_14'], level: 3,
    make(R) {
      const who = R.name(), same = R.pick(['area', 'perimeter']);
      if (same === 'area') {
        const N = R.pick([12, 16, 18, 20, 24, 30, 36]);
        const pairs = []; for (let a = 1; a * a <= N; a++) if (N % a === 0) pairs.push([a, N / a]);
        const [p, q] = R.sample(pairs, 2);
        return {
          marks: 1, answer: `e.g. ${p[0]} cm by ${p[1]} cm and ${q[0]} cm by ${q[1]} cm`,
          guide: 'Accept any two rectangles with the same area and different perimeters, with both areas and perimeters correct.',
          check: () => p[0] * p[1] === q[0] * q[1] && p[0] + p[1] !== q[0] + q[1],
          body: A => `<p>${who} says,</p><p style="text-align:center"><i>"If two rectangles have the same area, they must have the same perimeter."</i></p><p>Give an example to show that ${who} is wrong.</p>${A.explain(`${p[0]} cm by ${p[1]} cm: area ${N} cm², perimeter ${2 * (p[0] + p[1])} cm. ${q[0]} cm by ${q[1]} cm: area ${N} cm², perimeter ${2 * (q[0] + q[1])} cm.`, 3)}`,
        };
      }
      const S = R.int(6, 12), a = R.int(1, Math.floor(S / 2) - 1), b = R.intNot(a + 1, Math.floor(S / 2), [S - a]);
      if (b === S - b || a === S - a) return null;
      return {
        marks: 1, answer: `e.g. ${a} cm by ${S - a} cm and ${b} cm by ${S - b} cm`,
        guide: 'Accept any two rectangles with the same perimeter and different areas, with both areas and perimeters correct.',
        check: () => a * (S - a) !== b * (S - b),
        body: A => `<p>${who} says,</p><p style="text-align:center"><i>"If two rectangles have the same perimeter, they must have the same area."</i></p><p>Give an example to show that ${who} is wrong.</p>${A.explain(`${a} cm by ${S - a} cm: perimeter ${2 * S} cm, area ${a * (S - a)} cm². ${b} cm by ${S - b} cm: perimeter ${2 * S} cm, area ${b * (S - b)} cm².`, 3)}`,
      };
    },
  });

  // Y6_NC_15 area of parallelograms and triangles
  // figure with a dashed perpendicular height. kind 'tri' or 'para'; units in cm, drawn to fit
  function heightFig(kind, b, h, off, lab) {
    const u = Math.min(60 / (b + Math.max(0, off)), 38 / h, 7), pad = 9;
    const minx = Math.min(0, off);
    const X = x => pad + (x - minx) * u, Y = y => pad + (h - y) * u;
    const pts = kind === 'tri' ? [[0, 0], [b, 0], [off, h]] : [[0, 0], [b, 0], [b + off, h], [off, h]];
    let s = D.poly(pts.map(p => [X(p[0]), Y(p[1])]), 'shape');
    if (off < 0 || off > b) s += D.line(X(off < 0 ? off : b), Y(0), X(off < 0 ? 0 : off), Y(0), 'hidden');
    s += D.line(X(off), Y(h), X(off), Y(0), 'hidden');
    const k = 2.4, dir = off > b / 2 && kind === 'tri' ? -1 : 1;
    s += D.pline([[X(off) + dir * k, Y(0)], [X(off) + dir * k, Y(0) - k], [X(off), Y(0) - k]], 'thin');
    s += D.txt((X(0) + X(b)) / 2, Y(0) + 5, lab.b, { size: 3.6 });
    s += D.txt(X(off) + dir * 1.8, (Y(0) + Y(h)) / 2 + 1.2, lab.h, { size: 3.6, anchor: dir > 0 ? 'start' : 'end' });
    if (lab.s) s += D.txt((X(0) + X(off)) / 2 - 2, (Y(0) + Y(h)) / 2, lab.s, { size: 3.6, anchor: 'end' });
    const W = (Math.max(b, b + (kind === 'para' ? off : 0), off) - minx) * u + 2 * pad + 6, H = h * u + 2 * pad;
    return D.svg(W, H, s);
  }
  add({
    id: 'Y6_NC_15.triangle', topics: ['Y6_NC_15'], level: 2,
    make(R) {
      const b = R.int(4, 16), h = R.int(3, 12);
      if (b * h % 2) return null;
      const off = R.int(-2, b + 2), ans = b * h / 2;
      return {
        marks: 1, answer: `${ans} cm²`,
        check: () => polyArea([[0, 0], [b, 0], [off, h]]) === ans,
        body: A => `<p>Work out the area of this triangle.</p>${heightFig('tri', b, h, off, { b: `${b} cm`, h: `${h} cm` })}${note}${A.box(ans, { unit: 'cm²' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_15.parallelogram', topics: ['Y6_NC_15'], level: 2,
    make(R) {
      const [off, h, sl] = R.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [4, 3, 5], [8, 6, 10], [9, 12, 15], [12, 5, 13]]);
      const b = R.int(Math.max(5, off), 16), ans = b * h;
      return {
        marks: 1, answer: `${ans} cm²`,
        check: () => polyArea([[0, 0], [b, 0], [b + off, h], [off, h]]) === ans && off * off + h * h === sl * sl,
        body: A => `<p>Work out the area of this parallelogram.</p>${heightFig('para', b, h, off, { b: `${b} cm`, h: `${h} cm`, s: `${sl} cm` })}${note}${A.box(ans, { unit: 'cm²' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_15.grid', topics: ['Y6_NC_15'], level: 1,
    make(R) {
      const b = R.int(3, 9), h = R.int(2, 6), x0 = R.int(1, 10 - b), ax = R.int(1, 11), para = R.chance(0.4);
      if (b * h % 2 && !para) return null;
      let pts;
      if (para) { const o = R.int(1, 3); if (x0 + b + o > 12) return null; pts = [[x0, 1], [x0 + b, 1], [x0 + b + o, 1 + h], [x0 + o, 1 + h]]; }
      else pts = [[x0, 1], [x0 + b, 1], [ax, 1 + h]];
      const ans = para ? b * h : b * h / 2;
      return {
        marks: 1, answer: `${ans} squares`,
        check: () => polyArea(pts) === ans,
        body: A => `<p>This ${para ? 'parallelogram' : 'triangle'} is drawn on a grid of 1 cm squares.</p>${D.grid({ cols: 12, rows: 8, cell: 6, polys: [{ pts }] }, A)}<p>What is its area?</p>${A.box(ans, { unit: 'cm²' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_15.reverse', topics: ['Y6_NC_15'], level: 3,
    make(R) {
      const tri = R.chance(0.5), b = R.int(4, 15), h = R.int(3, 12);
      if (tri && b * h % 2) return null;
      const area = tri ? b * h / 2 : b * h, askH = R.chance(0.5);
      const ans = askH ? h : b;
      return {
        marks: 1, answer: `${ans} cm`,
        check: () => (tri ? 2 * area : area) / (askH ? b : h) === ans,
        body: A => `<p>A ${tri ? 'triangle' : 'parallelogram'} has an area of <b>${area} cm²</b>.</p><p>Its ${askH ? `base is <b>${b} cm</b>` : `perpendicular height is <b>${h} cm</b>`}.</p><p>What is its ${askH ? 'perpendicular height' : 'base'}?</p>${A.box(ans, { unit: 'cm' })}`,
      };
    },
  });

  // Y6_NC_16 volume of cubes and cuboids
  function cuboidFig(l, w, h, o = {}) {
    const u = o.u || Math.min(9, 60 / (l + 0.45 * w), 42 / (h + 0.35 * w)), dx = 0.45 * u, dy = 0.35 * u, pad = 8;
    const ox = pad + 6, oy = pad + w * dy + h * u;
    const fp = [[ox, oy], [ox + l * u, oy], [ox + l * u, oy - h * u], [ox, oy - h * u]];
    const tp = [[ox, oy - h * u], [ox + l * u, oy - h * u], [ox + l * u + w * dx, oy - h * u - w * dy], [ox + w * dx, oy - h * u - w * dy]];
    const rp = [[ox + l * u, oy], [ox + l * u + w * dx, oy - w * dy], [ox + l * u + w * dx, oy - h * u - w * dy], [ox + l * u, oy - h * u]];
    let s = D.poly(fp, 'solid') + D.poly(tp, 'solid') + D.poly(rp, 'solid');
    if (o.cubes) {
      for (let i = 1; i < l; i++) s += D.line(ox + i * u, oy, ox + i * u, oy - h * u, 'thin') + D.line(ox + i * u, oy - h * u, ox + i * u + w * dx, oy - h * u - w * dy, 'thin');
      for (let j = 1; j < h; j++) s += D.line(ox, oy - j * u, ox + l * u, oy - j * u, 'thin') + D.line(ox + l * u, oy - j * u, ox + l * u + w * dx, oy - j * u - w * dy, 'thin');
      for (let k = 1; k < w; k++) s += D.line(ox + k * dx, oy - h * u - k * dy, ox + l * u + k * dx, oy - h * u - k * dy, 'thin') + D.line(ox + l * u + k * dx, oy - k * dy, ox + l * u + k * dx, oy - h * u - k * dy, 'thin');
    }
    if (o.lab) {
      s += D.txt(ox + l * u / 2, oy + 5, o.lab[0], { size: 3.6 });
      s += D.txt(ox + l * u + w * dx / 2 + 2, oy - w * dy / 2 + 3, o.lab[1], { size: 3.6, anchor: 'start' });
      s += D.txt(ox - 2, oy - h * u / 2 + 1.2, o.lab[2], { size: 3.6, anchor: 'end' });
    }
    const W = ox + l * u + w * dx + pad + (o.lab ? 14 : 0), H = oy + pad;
    return D.svg(W + (o.lab ? 6 : 0), H, o.lab ? `<g transform="translate(6,0)">${s}</g>` : s);
  }
  add({
    id: 'Y6_NC_16.cuboid', topics: ['Y6_NC_16'], level: 1,
    make(R) {
      const l = R.int(3, 15), w = R.int(2, 9), h = R.int(2, 10), unit = R.pick(['cm', 'cm', 'm']);
      if (unit === 'm' && l * w * h > 300) return null;
      const ans = l * w * h;
      return {
        marks: 1, answer: `${F.n(ans)} ${unit}³`,
        check: () => ans / (l * w) === h,
        body: A => `<p>Work out the volume of this cuboid.</p>${cuboidFig(Math.min(l, 9), Math.min(w, 6), Math.min(h, 6), { lab: [`${l} ${unit}`, `${w} ${unit}`, `${h} ${unit}`] })}${note}${A.box(F.n(ans), { unit: unit + '³' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_16.cubes', topics: ['Y6_NC_16'], level: 1,
    make(R) {
      const l = R.int(2, 6), w = R.int(2, 4), h = R.int(2, 4), ans = l * w * h;
      return {
        marks: 1, answer: `${ans} cm³`,
        check: () => { let k = 0; for (let i = 0; i < l; i++) for (let j = 0; j < w; j++) for (let m = 0; m < h; m++) k++; return k === ans; },
        body: A => `<p>This cuboid is made from 1 cm cubes.</p>${cuboidFig(l, w, h, { cubes: true, u: 7 })}<p>What is its volume?</p>${A.box(ans, { unit: 'cm³' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_16.missing', topics: ['Y6_NC_16'], level: 2,
    make(R) {
      const l = R.int(3, 12), w = R.int(2, 8), h = R.int(2, 10), V = l * w * h;
      const thing = R.pick(['box', 'fish tank', 'tin', 'container']);
      return {
        marks: 1, answer: `${h} cm`,
        check: () => V % (l * w) === 0 && V / l / w === h,
        body: A => `<p>A ${thing} is a cuboid with a volume of <b>${F.n(V)} cm³</b>.</p><p>It is <b>${l} cm</b> long and <b>${w} cm</b> wide.</p><p>How tall is it?</p>${A.box(h, { unit: 'cm' })}`,
      };
    },
  });

  // Y6_NC_17 3D shapes and nets
  const SOLIDS = { cube: ['cube', 6, 12, 8], cuboid: ['cuboid', 6, 12, 8], sqpyramid: ['square-based pyramid', 5, 8, 5], tripyramid: ['triangular-based pyramid', 4, 6, 4], triprism: ['triangular prism', 5, 9, 6] };
  add({
    id: 'Y6_NC_17.properties', topics: ['Y6_NC_17'], level: 1,
    make(R) {
      const key = R.pick(Object.keys(SOLIDS)), [nm, f, e, v] = SOLIDS[key];
      const form = R.int(0, 3);
      const props = [['faces', f], ['edges', e], ['vertices', v]];
      return {
        marks: 1, answer: form === 3 ? `faces ${f}, edges ${e}, vertices ${v}` : F.n(props[form][1]),
        guide: form === 3 ? 'All three must be correct.' : '',
        check: () => f - e + v === 2,
        body: A => form === 3
          ? `<p>Here is a ${nm}.</p>${D.solid(key, 30)}<p>Complete the table.</p>${A.table([['Faces', { a: f }], ['Edges', { a: e }], ['Vertices', { a: v }]], { rowHead: true })}`
          : `<p>Here is a ${nm}.</p>${D.solid(key, 30)}<p>How many <b>${props[form][0]}</b> does it have?</p>${A.box(props[form][1])}`,
      };
    },
  });
  // net drawings (mm, y down)
  function netFig(kind, R) {
    let s = '';
    const sq = (x, y, w, h) => { s += D.box(x, y, w, h, 'bx'); };
    const tri = pts => { s += D.poly(pts, 'bx'); };
    if (kind === 'cube') {
      const c = 10, top = R.int(0, 3), bot = R.int(0, 3);
      for (let i = 0; i < 4; i++) sq(2 + i * c, 2 + c, c, c);
      sq(2 + top * c, 2, c, c); sq(2 + bot * c, 2 + 2 * c, c, c);
      return D.svg(4 + 4 * c, 4 + 3 * c, s);
    }
    if (kind === 'cuboid') {
      const a = R.int(14, 20), b = R.int(8, 12), c = R.int(5, 8);
      let x = 2; for (const w of [c, a, c, a]) { sq(x, 2 + c, w, b); x += w; }
      sq(2 + c, 2, a, c); sq(2 + c, 2 + c + b, a, c);
      return D.svg(4 + 2 * a + 2 * c, 4 + 2 * c + b, s);
    }
    if (kind === 'triprism') {
      const t = 12, L = R.int(18, 26), hh = t * Math.sqrt(3) / 2;
      for (let i = 0; i < 3; i++) sq(2 + hh, 2 + i * t, L, t);
      tri([[2 + hh, 2 + t], [2 + hh, 2 + 2 * t], [2, 2 + 1.5 * t]]);
      tri([[2 + hh + L, 2 + t], [2 + hh + L, 2 + 2 * t], [2 + 2 * hh + L, 2 + 1.5 * t]]);
      return D.svg(4 + 2 * hh + L, 4 + 3 * t, s);
    }
    if (kind === 'sqpyramid') {
      const c = 14, hh = R.int(11, 15), o = 2 + hh;
      sq(o, o, c, c);
      tri([[o, o], [o + c, o], [o + c / 2, o - hh]]); tri([[o, o + c], [o + c, o + c], [o + c / 2, o + c + hh]]);
      tri([[o, o], [o, o + c], [o - hh, o + c / 2]]); tri([[o + c, o], [o + c, o + c], [o + c + hh, o + c / 2]]);
      return D.svg(2 * o + c, 2 * o + c, s);
    }
    // tetrahedron: big triangle split into 4
    const L = 32, H = L * Math.sqrt(3) / 2, P = [[2, 2 + H], [2 + L, 2 + H], [2 + L / 2, 2]];
    const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const M = [m(P[0], P[1]), m(P[1], P[2]), m(P[2], P[0])];
    tri([P[0], M[0], M[2]]); tri([M[0], P[1], M[1]]); tri([M[2], M[1], P[2]]); tri(M);
    return D.svg(4 + L, 4 + H, s);
  }
  const NETNAME = { cube: 'cube', cuboid: 'cuboid', triprism: 'triangular prism', sqpyramid: 'square-based pyramid', tetra: 'triangular-based pyramid' };
  add({
    id: 'Y6_NC_17.net-name', topics: ['Y6_NC_17'], level: 2,
    make(R) {
      const kind = R.pick(Object.keys(NETNAME));
      const fig = netFig(kind, R);
      const opts = R.shuffle(Object.values(NETNAME)).slice(0, 4);
      if (!opts.includes(NETNAME[kind])) opts[R.int(0, 3)] = NETNAME[kind];
      const faces = { cube: 6, cuboid: 6, triprism: 5, sqpyramid: 5, tetra: 4 }[kind];
      return {
        marks: 1, answer: NETNAME[kind],
        check: () => (fig.match(/<(rect|polygon) /g) || []).length === faces,
        body: A => `<p>Here is the net of a 3D shape.</p>${fig}<p>Circle the name of the shape it makes.</p>${A.circle(opts, opts.indexOf(NETNAME[kind]))}`,
      };
    },
  });
  // roll a cube over the net: a real net puts a different face on every square
  function foldsToCube(cells) {
    const key = c => c[0] + ',' + c[1], set = new Set(cells.map(key));
    const start = { U: 'U', D: 'D', N: 'N', S: 'S', E: 'E', W: 'W' };
    const seen = new Map([[key(cells[0]), start]]), q = [cells[0]];
    const roll = (o, d) => d === 'E' ? { ...o, D: o.E, E: o.U, U: o.W, W: o.D } : d === 'W' ? { ...o, D: o.W, W: o.U, U: o.E, E: o.D }
      : d === 'N' ? { ...o, D: o.N, N: o.U, U: o.S, S: o.D } : { ...o, D: o.S, S: o.U, U: o.N, N: o.D };
    while (q.length) {
      const c = q.shift(), o = seen.get(key(c));
      for (const [d, dx, dy] of [['E', 1, 0], ['W', -1, 0], ['N', 0, -1], ['S', 0, 1]]) {
        const n = [c[0] + dx, c[1] + dy];
        if (set.has(key(n)) && !seen.has(key(n))) { seen.set(key(n), roll(o, d)); q.push(n); }
      }
    }
    return seen.size === 6 && new Set([...seen.values()].map(o => o.D)).size === 6;
  }
  const CUBE_NETS = [[[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [0, 2]], [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [1, 2]], [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [3, 2]], [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [1, 2]], [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [2, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [1, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]]];
  const NOT_NETS = [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1]], [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [1, 0]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [1, 0], [1, 2], [1, 3], [0, 0]].slice(0, 6), [[0, 0], [1, 0], [1, 1], [2, 1], [2, 0], [3, 1]],
    [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [2, 0]], [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 3]].map(c => c)].filter(c => c.length === 6 && !foldsToCube(c));
  const cellFig = cells => {
    const c = 8, mx = Math.max(...cells.map(p => p[0])), my = Math.max(...cells.map(p => p[1]));
    return D.svg((mx + 1) * c + 4, (my + 1) * c + 4, cells.map(p => D.box(2 + p[0] * c, 2 + p[1] * c, c, c, 'bx')).join(''));
  };
  add({
    id: 'Y6_NC_17.cube-net', topics: ['Y6_NC_17'], level: 2,
    make(R) {
      const good = R.pick(CUBE_NETS), bad = R.sample(NOT_NETS, 2);
      const flip = c => R.chance(0.5) ? c : c.map(p => [Math.max(...c.map(q => q[0])) - p[0], p[1]]);
      const opts = R.shuffle([flip(good), ...bad.map(flip)]);
      const ri = opts.findIndex(o => foldsToCube(o));
      return {
        marks: 1, answer: 'ABC'[ri],
        check: () => opts.filter(o => foldsToCube(o)).length === 1 && ri >= 0,
        body: A => `<p>Which of these is the net of a cube?</p>${D.row(opts.map((o, i) => ({ fig: cellFig(o), cap: 'ABC'[i] })), 10)}<p>Tick one.</p>${A.tick(['A', 'B', 'C'], ri)}`,
      };
    },
  });

  // Y6_NC_18 unknown angles in triangles, quadrilaterals, regular polygons; vertically opposite angles
  const rad = d => d * Math.PI / 180;
  add({
    id: 'Y6_NC_18.triangle', topics: ['Y6_NC_18'], level: 1,
    make(R) {
      const a = R.int(30, 95), b = R.int(30, 95), c = 180 - a - b;
      if (c < 25) return null;
      const Lb = 42, AC = Lb * Math.sin(rad(b)) / Math.sin(rad(c));
      const pts = [[0, 0], [Lb, 0], [AC * Math.cos(rad(a)), -AC * Math.sin(rad(a))]];
      const x = R.int(0, 2), vals = [a, b, c];
      return {
        marks: 1, answer: `${vals[x]}°`,
        check: () => vals[x] === 180 - vals.filter((_, i) => i !== x).reduce((p, q) => p + q, 0),
        body: A => `<p>Work out the size of angle <i>x</i>.</p>${D.shape({ pts, angles: vals.map((v, i) => ({ i, text: i === x ? '<tspan font-style="italic">x</tspan>' : v + '°' })) })}${note}${A.box(vals[x], { unit: '°' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_18.quad', topics: ['Y6_NC_18'], level: 2,
    make(R) {
      const ang = [R.int(60, 130), R.int(60, 130), R.int(60, 130)];
      ang.push(360 - ang[0] - ang[1] - ang[2]);
      if (ang[3] < 55 || ang[3] > 150) return null;
      const [A1, B1, C1] = ang, s0 = 48, s1 = R.int(28, 42);
      const P1 = [s0, 0], t12 = rad(180 - B1), P2 = [P1[0] + s1 * Math.cos(t12), P1[1] + s1 * Math.sin(t12)];
      const d1 = [Math.cos(rad(360 - B1 - C1)), Math.sin(rad(360 - B1 - C1))], d2 = [Math.cos(rad(A1)), Math.sin(rad(A1))];
      // P2 + t d1 = u d2
      const det = d1[0] * (-d2[1]) - d1[1] * (-d2[0]);
      if (Math.abs(det) < 1e-6) return null;
      const t = ((-P2[0]) * (-d2[1]) - (-P2[1]) * (-d2[0])) / det, u = (d1[0] * (-P2[1]) - d1[1] * (-P2[0])) / det;
      if (t < 24 || u < 24) return null;
      const P3 = [u * d2[0], u * d2[1]];
      const pts = [[0, 0], P1, P2, P3].map(p => [p[0], -p[1]]);
      if (Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0])) > 75 || Math.max(...pts.map(p => -p[1])) > 44) return null;
      const x = R.int(0, 3);
      return {
        marks: 1, answer: `${ang[x]}°`,
        check: () => ang[x] === 360 - ang.filter((_, i) => i !== x).reduce((p, q) => p + q, 0),
        body: A => `<p>Work out the size of angle <i>x</i>.</p>${D.shape({ pts, angles: ang.map((v, i) => ({ i, text: i === x ? '<tspan font-style="italic">x</tspan>' : v + '°' })) })}${note}${A.box(ang[x], { unit: '°' })}`,
      };
    },
  });
  function crossFig(a, rot, labs) {
    const c = 27, L = 24;
    let s = '';
    for (const th of [rot, rot + a]) s += D.line(c - L * Math.cos(rad(th)), c + L * Math.sin(rad(th)), c + L * Math.cos(rad(th)), c - L * Math.sin(rad(th)), 'arm');
    const secs = [[rot, rot + a], [rot + a, rot + 180], [rot + 180, rot + 180 + a], [rot + 180 + a, rot + 360]];
    secs.forEach(([t0, t1], i) => {
      if (!labs[i]) return;
      const rr = 6, p0 = [c + rr * Math.cos(rad(t0)), c - rr * Math.sin(rad(t0))], p1 = [c + rr * Math.cos(rad(t1)), c - rr * Math.sin(rad(t1))];
      s += `<path d="M${D.r2(p0[0])},${D.r2(p0[1])} A${rr},${rr} 0 0 0 ${D.r2(p1[0])},${D.r2(p1[1])}" class="thin"/>`;
      const m = (t0 + t1) / 2;
      s += D.txt(c + 11 * Math.cos(rad(m)), c - 11 * Math.sin(rad(m)) + 1.3, labs[i], { size: 3.6 });
    });
    return D.svg(2 * c, 2 * c, s);
  }
  add({
    id: 'Y6_NC_18.lines', topics: ['Y6_NC_18'], level: 2,
    make(R) {
      const a = R.int(35, 145); if (a > 78 && a < 102) return null;
      const rot = R.int(0, 30), opp = R.chance(0.5);
      const labs = ['', '', '', '']; const k = R.int(0, 3);
      labs[k] = a + '°';
      const xi = opp ? (k + 2) % 4 : (k + 1) % 4;
      labs[xi] = '<tspan font-style="italic">x</tspan>';
      const fa = k % 2 ? 180 - a : a, secA = [fa, 180 - fa, fa, 180 - fa], ans = secA[xi];
      return {
        marks: 1, answer: `${ans}°`,
        guide: opp ? 'Vertically opposite angles are equal.' : 'Angles on a straight line add up to 180°.',
        check: () => secA[k] === a && (opp ? ans === a : ans + a === 180),
        body: A => `<p>Two straight lines cross.</p>${crossFig(fa, rot, labs)}${note}<p>Work out the size of angle <i>x</i>.</p>${A.box(ans, { unit: '°' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_18.regular', topics: ['Y6_NC_18'], level: 2,
    make(R) {
      const n = R.pick([5, 6, 8, 9, 10, 12]), names = { 5: 'pentagon', 6: 'hexagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon', 12: 'dodecagon' };
      const inner = (n - 2) * 180 / n, ext = R.chance(0.3), rot = R.int(0, 1) * 180 / n;
      const ans = ext ? 180 - inner : inner;
      return {
        marks: 1, answer: `${ans}°`,
        check: () => ext ? ans * n === 360 : (180 - ans) * n === 360,
        body: A => `<p>This is a regular ${names[n]}.</p>${D.shape({ pts: D.regular(n, 20, rot), angles: ext ? [] : [{ i: 0, text: '<tspan font-style="italic">x</tspan>' }] })}<p>${ext ? `What is the size of each <b>exterior</b> angle?` : `What is the size of angle <i>x</i>?`}</p>${A.box(ans, { unit: '°' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_18.isosceles', topics: ['Y6_NC_18'], level: 2,
    make(R) {
      const top = R.int(30, 110); if (top % 2) return null;
      const base = (180 - top) / 2, giveTop = R.chance(0.5);
      const ans = giveTop ? base : top;
      const H = 22 / Math.tan(rad(top / 2));
      if (H > 60 || H < 10) return null;
      const pts = [[0, H], [44, H], [22, 0]];
      return {
        marks: 1, answer: `${ans}°`,
        check: () => top + 2 * base === 180,
        body: A => `<p>This is an isosceles triangle.</p>${D.shape({ pts, ticks: [0, 1, 1], angles: giveTop ? [{ i: 2, text: top + '°' }, { i: 0, text: '<tspan font-style="italic">x</tspan>' }] : [{ i: 1, text: base + '°' }, { i: 2, text: '<tspan font-style="italic">x</tspan>' }] })}${note}<p>Work out the size of angle <i>x</i>.</p>${A.box(ans, { unit: '°' })}`,
      };
    },
  });

  // Y6_NC_19 parts of a circle; diameter is twice the radius
  // label beside a line through (mx, my) at angle t (radians): above a flat line, right of a steep one
  function lineLab(mx, my, t, text) {
    if (Math.abs(Math.sin(t)) < 0.3) return D.txt(mx, my - 1.8, text, { size: 3.6 });
    if (Math.abs(Math.cos(t)) < 0.3) return D.txt(mx + 1.8, my + 1.2, text, { size: 3.6, anchor: 'start' });
    const px = Math.sin(t), py = Math.cos(t), sg = px > 0 ? 1 : -1;
    return D.txt(mx + sg * px * 3, my + sg * py * 3 + 1.2, text, { size: 3.6, anchor: 'start' });
  }
  function circleFig(o) {
    const r = 17, c = r + 9;
    let s = `<circle cx="${c}" cy="${c}" r="${r}" class="bx"/><circle cx="${c}" cy="${c}" r="0.8" class="fillk"/>`;
    if (o.rad !== undefined) { const t = rad(o.rad); s += D.line(c, c, c + r * Math.cos(t), c - r * Math.sin(t), 'arm'); if (o.radL) s += lineLab(c + r * 0.5 * Math.cos(t), c - r * 0.5 * Math.sin(t), t, o.radL); }
    if (o.dia !== undefined) { const t = rad(o.dia); s += D.line(c - r * Math.cos(t), c + r * Math.sin(t), c + r * Math.cos(t), c - r * Math.sin(t), 'arm'); if (o.diaL) s += lineLab(c + r * 0.5 * Math.cos(t), c - r * 0.5 * Math.sin(t), t, o.diaL); }
    if (o.circL) { const t = rad(o.circ); s += D.line(c + (r + 1) * Math.cos(t), c - (r + 1) * Math.sin(t), c + (r + 5) * Math.cos(t), c - (r + 5) * Math.sin(t), 'thin') + D.txt(c + (r + 8) * Math.cos(t), c - (r + 8) * Math.sin(t) + 1.3, o.circL, { size: 3.8, bold: true }); }
    return D.svg(2 * c, 2 * c, s);
  }
  add({
    id: 'Y6_NC_19.radius', topics: ['Y6_NC_19'], level: 1,
    make(R) {
      const half = R.chance(0.3), r10 = half ? R.int(2, 12) * 10 + 5 : R.int(2, 15) * 10;
      const toD = R.chance(0.5), d10 = 2 * r10;
      const ang = R.int(0, 3) * 90;
      return {
        marks: 1, answer: `${toD ? dz(d10, 1) : dz(r10, 1)} cm`,
        check: () => d10 / r10 === 2,
        body: A => `<p>The ${toD ? 'radius' : 'diameter'} of this circle is <b>${toD ? dz(r10, 1) : dz(d10, 1)} cm</b>.</p>${circleFig(toD ? { rad: ang, radL: dz(r10, 1) + ' cm' } : { dia: ang, diaL: dz(d10, 1) + ' cm' })}${note}<p>What is the ${toD ? 'diameter' : 'radius'}?</p>${A.box(toD ? dz(d10, 1) : dz(r10, 1), { unit: 'cm' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_19.name', topics: ['Y6_NC_19'], level: 1,
    make(R) {
      const L = R.shuffle(['A', 'B', 'C']), ask = R.int(0, 2), parts = ['radius', 'diameter', 'circumference'];
      const ra = R.int(0, 3) * 90 + 45, da = R.pick([0, 90, 180]), ca = R.pick([110, 160, 200, 250, 290, 340]);
      if (Math.abs(((ra - ca) % 360 + 360) % 360) < 30) return null;
      return {
        marks: 1, answer: parts[ask],
        check: () => new Set(L).size === 3 && parts.length === 3,
        body: A => `<p>Here is a circle.</p>${circleFig({ rad: ra, radL: L[0], dia: da, diaL: L[1], circ: ca, circL: L[2] })}<p>What is the name of the part of the circle labelled <b>${L[ask]}</b>?</p>${A.line(parts[ask], 50)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_19.row', topics: ['Y6_NC_19'], level: 3,
    make(R) {
      const n = R.int(2, 4), r = R.int(2, 9), askP = R.chance(0.5);
      const len = 2 * r * n, wid = 2 * r, ans = askP ? 2 * (len + wid) : len;
      const c = 10, W = n * 2 * c + 4;
      let s = D.box(2, 2, n * 2 * c, 2 * c, 'bx');
      for (let i = 0; i < n; i++) s += `<circle cx="${2 + c + i * 2 * c}" cy="${2 + c}" r="${c}" class="bx"/><circle cx="${2 + c + i * 2 * c}" cy="${2 + c}" r="0.6" class="fillk"/>`;
      s += D.line(2 + c, 2 + c, 2 + 2 * c, 2 + c, 'arm') + D.txt(2 + 1.5 * c, 2 + c - 1.5, `${r} cm`, { size: 3.2 });
      return {
        marks: 2, method: true, answer: `${ans} cm`,
        guide: `Award 1 mark for the length ${len} cm (or the width ${wid} cm) found with a correct method.`,
        check: () => len === n * 2 * r && (askP ? ans === 4 * r * n + 4 * r : true),
        body: A => `<p>${n === 2 ? 'Two' : n === 3 ? 'Three' : 'Four'} identical circles fit exactly inside a rectangle.</p>${D.svg(W, 2 * c + 4, s)}${note}<p>The radius of each circle is <b>${r} cm</b>.</p><p>What is the ${askP ? 'perimeter' : 'length'} of the rectangle?</p>${A.work(`diameter = ${2 * r} cm<br>length = ${n} ${F.times} ${2 * r} = ${len} cm${askP ? `<br>perimeter = ${len} + ${wid} + ${len} + ${wid} = ${ans} cm` : ''}`, 26)}${A.box(ans, { unit: 'cm' })}`,
      };
    },
  });

  /* =====================================================================
   * GEOMETRY: SHAPES, POSITION AND DIRECTION
   * ===================================================================== */
  // Y6_015 draw and split shapes from given properties; related problems
  add({
    id: 'Y6_015.draw-rect', topics: ['Y6_015'], level: 2,
    make(R) {
      const w = R.int(2, 8), h = R.int(2, 6);
      if (w === h) return null;
      const area = w * h, P = 2 * (w + h);
      const sols = []; for (let a = 1; a <= area; a++) if (area % a === 0 && 2 * (a + area / a) === P) sols.push(a);
      return {
        marks: 1, answer: `${Math.max(w, h)} by ${Math.min(w, h)} rectangle`,
        guide: 'Accept the rectangle drawn anywhere on the grid, either way round.',
        check: () => sols.length === 2 && sols.includes(w) && sols.includes(h),
        body: A => `<p>Draw a rectangle on the grid with an area of <b>${area} squares</b> and a perimeter of <b>${P} units</b>.</p>${D.grid({ cols: 12, rows: 8, cell: 6, dots: false, polys: [{ pts: rectPts(1, 1, w, h), ans: true }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y6_015.squares', topics: ['Y6_015'], level: 3,
    make(R) {
      const n = R.int(2, 5), sd = R.int(2, 9), P = 2 * sd * (n + 1), askArea = R.chance(0.5);
      const ans = askArea ? sd * sd : sd;
      const c = 12;
      let sv = D.box(2, 2, n * c, c, 'shape');
      for (let i = 1; i < n; i++) sv += D.line(2 + i * c, 2, 2 + i * c, 2 + c, 'seg');
      return {
        marks: 2, method: true, answer: askArea ? `${ans} cm²` : `${ans} cm`,
        guide: `Award 1 mark for a correct method, e.g. ${P} ${F.div} ${2 * (n + 1)} = ${sd}.`,
        check: () => P / (2 * n + 2) === sd,
        body: A => `<p>This rectangle is made from ${n} identical squares.</p>${D.svg(n * c + 4, c + 4, sv)}<p>The perimeter of the rectangle is <b>${P} cm</b>.</p><p>What is the ${askArea ? 'area of one square' : 'side length of one square'}?</p>${A.work(`perimeter = ${2 * (n + 1)} sides of a square<br>${P} ${F.div} ${2 * (n + 1)} = ${sd} cm${askArea ? `<br>${sd} ${F.times} ${sd} = ${sd * sd} cm²` : ''}`, 26)}${A.box(ans, { unit: askArea ? 'cm²' : 'cm' })}`,
      };
    },
  });
  add({
    id: 'Y6_015.compound', topics: ['Y6_015'], level: 3,
    make(R) {
      const W = R.int(8, 16), H = R.int(6, 12), w = R.int(2, W - 3), h = R.int(2, H - 3);
      const askArea = R.chance(0.6);
      const ans = askArea ? W * H - w * h : 2 * (W + H);
      const u = Math.min(52 / W, 32 / H);
      const pts = [[0, H], [W, H], [W, h], [W - w, h], [W - w, 0], [0, 0]].map(p => [p[0] * u, p[1] * u]);
      const P = [[0, 0], [W, 0], [W, H - h], [W - w, H - h], [W - w, H], [0, H]];
      return {
        marks: 2, method: true, answer: askArea ? `${ans} cm²` : `${ans} cm`,
        guide: askArea ? `Award 1 mark for a correct method, e.g. ${W} ${F.times} ${H} ${F.minus} ${w} ${F.times} ${h}, or splitting into two rectangles.` : `Award 1 mark for finding both missing lengths (${w} cm and ${h} cm).`,
        check: () => askArea ? polyArea(P) === ans : polyPerim(P) === ans,
        body: A => `<p>Here is a shape made from rectangles.</p>${D.shape({ pts, labels: [`${W} cm`, `${H - h} cm`, '', '', `${W - w} cm`, `${H} cm`] })}${note}<p>Work out the ${askArea ? 'area' : 'perimeter'} of the shape.</p>${A.work(askArea ? `${W} ${F.times} ${H} = ${W * H}<br>missing corner ${w} ${F.times} ${h} = ${w * h}<br>${W * H} ${F.minus} ${w * h} = ${ans}` : `missing sides: ${W} ${F.minus} ${W - w} = ${w}, ${H} ${F.minus} ${H - h} = ${h}<br>${W} + ${H - h} + ${w} + ${h} + ${W - w} + ${H} = ${ans}`, 26)}${A.box(ans, { unit: askArea ? 'cm²' : 'cm' })}`,
      };
    },
  });

  // new_d_afe4i7p9_4_mwt9atwl reflect and translate shapes
  const RT = 'new_d_afe4i7p9_4_mwt9atwl';
  const SMALL = [[[0, 0], [2, 0], [0, 2]], [[0, 0], [3, 0], [3, 1], [1, 2]], [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]], [[0, 0], [1, 0], [3, 2], [0, 2]], [[0, 0], [2, 0], [1, 3]], [[0, 0], [3, 0], [2, 2], [0, 1]], [[0, 1], [2, 0], [3, 2]]];
  add({
    id: RT + '.reflect-draw', topics: [RT], level: 2,
    make(R) {
      const base = R.pick(SMALL), vert = R.chance(0.6);
      const bw = Math.max(...base.map(p => p[0])), bh = Math.max(...base.map(p => p[1]));
      let pts, img, grid;
      if (vert) {
        const ox = R.int(6 - bw - 2, 6 - bw), oy = R.int(1, 7 - bh);
        pts = base.map(p => [p[0] + ox, p[1] + oy]); img = pts.map(p => [12 - p[0], p[1]]);
        grid = { cols: 12, rows: 8, mirror: { x1: 6, y1: 0, x2: 6, y2: 8 } };
      } else {
        const ox = R.int(1, 11 - bw), oy = R.int(4, 7 - bh);
        if (oy < 4) return null;
        pts = base.map(p => [p[0] + ox, p[1] + oy]); img = pts.map(p => [p[0], 8 - p[1]]);
        grid = { cols: 12, rows: 8, mirror: { x1: 0, y1: 4, x2: 12, y2: 4 } };
      }
      if (pts.some(p => p[0] < 0 || p[1] < 0) || img.some(p => p[0] < 0 || p[1] < 0)) return null;
      return {
        marks: 1, answer: 'Reflection drawn', guide: 'All vertices must be correct, within 2 mm.',
        check: () => polyArea(img) === polyArea(pts) && img.every((p, i) => vert ? p[0] + pts[i][0] === 12 : p[1] + pts[i][1] === 8),
        body: A => `<p>Draw the reflection of the shape in the mirror line.</p>${D.grid({ ...grid, cell: 6, polys: [{ pts }, { pts: img, ans: true }] }, A)}`,
      };
    },
  });
  add({
    id: RT + '.reflect-axis', topics: [RT], level: 2,
    make(R) {
      const base = R.pick(SMALL), axis = R.pick(['x', 'y']);
      const sx = R.pick([-1, 1]), sy = R.pick([-1, 1]);
      const ox = sx > 0 ? R.int(1, 3) : -R.int(4, 6), oy = sy > 0 ? R.int(1, 3) : -R.int(4, 6);
      const pts = base.map(p => [p[0] + ox, p[1] + oy]);
      if (pts.some(p => Math.abs(p[0]) > 6 || Math.abs(p[1]) > 6 || p[0] === 0 || p[1] === 0)) return null;
      const img = pts.map(p => axis === 'x' ? [p[0], -p[1]] : [-p[0], p[1]]);
      const v = pts[0], iv = img[0];
      return {
        marks: 1, answer: co(iv[0], iv[1]),
        check: () => axis === 'x' ? iv[1] + v[1] === 0 && iv[0] === v[0] : iv[0] + v[0] === 0 && iv[1] === v[1],
        body: A => `<p>The shape is reflected in the <b>${axis}-axis</b>.</p>${grid4({ min: -6, max: 6, cell: 4.5, polys: [{ pts }, { pts: img, ans: true }], pts: [{ x: v[0], y: v[1], label: 'A' }] }, A)}<p>Write the coordinates of the new position of vertex A.</p>${A.box(co(iv[0], iv[1]), { w: 30 })}`,
      };
    },
  });
  add({
    id: RT + '.translate', topics: [RT], level: 2,
    make(R) {
      const base = R.pick(SMALL), ox = R.int(-6, 3), oy = R.int(-6, 3);
      const dx = R.intNot(-6, 6, [0]), dy = R.intNot(-6, 6, [0]);
      const pts = base.map(p => [p[0] + ox, p[1] + oy]), img = pts.map(p => [p[0] + dx, p[1] + dy]);
      if ([...pts, ...img].some(p => Math.abs(p[0]) > 6 || Math.abs(p[1]) > 6)) return null;
      if (!pts.concat(img).some(p => p[0] < 0) || !pts.concat(img).some(p => p[1] < 0)) return null;
      const v = pts[0], iv = img[0];
      const say = `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'} and ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`;
      return {
        marks: 1, answer: co(iv[0], iv[1]),
        check: () => iv[0] - v[0] === dx && iv[1] - v[1] === dy,
        body: A => `<p>The shape is translated <b>${say}</b>.</p>${grid4({ min: -6, max: 6, cell: 4.5, polys: [{ pts }, { pts: img, ans: true }], pts: [{ x: v[0], y: v[1], label: 'A' }] }, A)}<p>Write the coordinates of the new position of vertex A.</p>${A.box(co(iv[0], iv[1]), { w: 30 })}`,
      };
    },
  });
  add({
    id: RT + '.describe', topics: [RT], level: 2,
    make(R) {
      const base = R.pick(SMALL), ox = R.int(0, 9), oy = R.int(0, 5);
      const dx = R.intNot(-6, 6, [0]), dy = R.intNot(-4, 4, [0]);
      const pts = base.map(p => [p[0] + ox, p[1] + oy]), img = pts.map(p => [p[0] + dx, p[1] + dy]);
      if ([...pts, ...img].some(p => p[0] < 0 || p[0] > 13 || p[1] < 0 || p[1] > 8)) return null;
      const say = `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}, ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`;
      return {
        marks: 1, answer: say, guide: 'Both parts of the translation must be correct. Accept them in either order.',
        check: () => img.every((p, i) => p[0] - pts[i][0] === dx && p[1] - pts[i][1] === dy),
        body: A => `<p>Shape A has been translated to shape B.</p>${D.grid({ cols: 13, rows: 8, cell: 6, polys: [{ pts, label: 'A' }, { pts: img, label: 'B', cls: 'shaded' }] }, A)}<p>Describe the translation.</p>${A.boxes([[Math.abs(dx), `squares ${dx > 0 ? 'right' : 'left'}`], [Math.abs(dy), `squares ${dy > 0 ? 'up' : 'down'}`]], { w: 12 })}`,
      };
    },
  });

  // Y6_NC_20 positions on the full coordinate grid
  add({
    id: 'Y6_NC_20.read', topics: ['Y6_NC_20'], level: 1,
    make(R) {
      const x = R.intNot(-6, 6, [0]), y = R.intNot(-6, 6, [0]);
      if (x > 0 && y > 0) return null;
      const x2 = R.intNot(-6, 6, [0, x]), y2 = R.intNot(-6, 6, [0, y]);
      const [l1, l2] = R.sample(['A', 'B', 'P', 'Q', 'K', 'M'], 2);
      return {
        marks: 1, answer: co(x, y),
        check: () => !(x > 0 && y > 0) && x !== x2,
        body: A => `<p>Write the coordinates of point <b>${l1}</b>.</p>${grid4({ min: -6, max: 6, cell: 4.5, pts: [{ x, y, label: l1 }, { x: x2, y: y2, label: l2 }] }, A)}${A.box(co(x, y), { w: 30 })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_20.plot', topics: ['Y6_NC_20'], level: 1,
    make(R) {
      const x = R.intNot(-6, 6, [0]), y = R.intNot(-6, 6, [0]);
      if (x > 0 && y > 0) return null;
      return {
        marks: 1, answer: `Point plotted at ${co(x, y)}`, guide: 'Accept a cross or dot at the correct point.',
        check: () => Math.abs(x) <= 6 && Math.abs(y) <= 6,
        body: A => `<p>Plot the point <b>${co(x, y)}</b> on the grid. Label it <b>P</b>.</p>${grid4({ min: -6, max: 6, cell: 4.5, pts: [{ x, y, label: 'P', ans: true }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_20.fourth', topics: ['Y6_NC_20'], level: 2,
    make(R) {
      const x1 = R.int(-8, 2), y1 = R.int(-8, 2), w = R.int(3, 8), h = R.int(2, 7);
      const V = [[x1, y1], [x1 + w, y1], [x1 + w, y1 + h], [x1, y1 + h]];
      if (!V.some(p => p[0] < 0) || !V.some(p => p[1] < 0) || V.some(p => p[0] === 0 || p[1] === 0)) return null;
      const miss = R.int(0, 3), sq = w === h;
      const given = V.map((p, i) => i).filter(i => i !== miss);
      const L = ['A', 'B', 'C', 'D'];
      return {
        marks: 1, answer: co(...V[miss]),
        check: () => { const o = V[(miss + 2) % 4], a = V[(miss + 1) % 4], b = V[(miss + 3) % 4]; return a[0] + b[0] - o[0] === V[miss][0] && a[1] + b[1] - o[1] === V[miss][1]; },
        body: A => `<p>ABCD is a ${sq ? 'square' : 'rectangle'}.</p><p>${given.map(i => `${L[i]} is ${co(...V[i])}`).join('. &nbsp; ')}.</p><p>What are the coordinates of <b>${L[miss]}</b>?</p>${A.box(co(...V[miss]), { w: 30 })}`,
      };
    },
  });

  /* =====================================================================
   * TIME
   * ===================================================================== */
  const TIME = 'new_d_afe4i7p9_5_mwt9fuwx';
  add({
    id: TIME + '.duration', topics: [TIME], level: 2,
    make(R) {
      const t1 = R.int(6 * 12, 19 * 12) * 5, d = R.int(25, 230), t2 = t1 + d;
      if (d % 5 === 0 && R.chance(0.5)) return null;
      const c = R.pick([['A train leaves', 'It arrives'], ['A film starts', 'It finishes'], ['A coach leaves', 'It arrives']]);
      return {
        marks: 1, answer: `${Math.floor(d / 60)} hours ${d % 60} minutes`, guide: `Accept ${d} minutes.`,
        check: () => t1 + Math.floor(d / 60) * 60 + d % 60 === t2,
        body: A => `<p>${c[0]} at <b>${F.t24(Math.floor(t1 / 60), t1 % 60)}</b>.</p><p>${c[1]} at <b>${F.t24(Math.floor(t2 / 60), t2 % 60)}</b>.</p><p>How long does it take?</p>${A.boxes([[Math.floor(d / 60), 'hours'], [d % 60, 'minutes']], { w: 14 })}`,
      };
    },
  });
  add({
    id: TIME + '.convert', topics: [TIME], level: 1,
    make(R) {
      const h = R.int(0, 23), m = R.int(0, 59), to24 = R.chance(0.5);
      if (h === 12 && m === 0) return null;
      return {
        marks: 1, answer: to24 ? F.t24(h, m) : F.t12(h, m),
        check: () => { const [, hh, mm, ap] = F.t12(h, m).match(/^(\d+):(\d+) (am|pm)$/); return (+hh % 12 + (ap === 'pm' ? 12 : 0)) * 60 + +mm === h * 60 + m && F.t24(h, m) === String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); },
        body: A => to24
          ? `<p>Write <b>${F.t12(h, m)}</b> using the 24-hour clock.</p>${A.box(F.t24(h, m), { w: 26 })}`
          : `<p>Write <b>${F.t24(h, m)}</b> using the 12-hour clock with am or pm.</p>${A.box(F.t12(h, m), { w: 30 })}`,
      };
    },
  });
  add({
    id: TIME + '.later', topics: [TIME], level: 2,
    make(R) {
      const h = R.int(1, 8), m = R.int(0, 11) * 5, add_ = R.pick([25, 35, 40, 45, 50, 55, 65, 75, 85, 95, 110, 125]);
      const t = (h + 12) * 60 + m + add_;
      return {
        marks: 1, answer: F.t24(Math.floor(t / 60), t % 60),
        check: () => t - add_ === (h + 12) * 60 + m && Math.floor(t / 60) < 24,
        body: A => `<p>This clock shows a time in the <b>afternoon</b>.</p>${D.clock({ h, m, size: 36 }, A)}<p>What time will it be <b>${add_} minutes</b> later? Give your answer using the 24-hour clock.</p>${A.box(F.t24(Math.floor(t / 60), t % 60), { w: 26 })}`,
      };
    },
  });
  add({
    id: TIME + '.units', topics: [TIME], level: 1,
    make(R) {
      const forms = [
        () => { const q = R.int(1, 3), w = R.int(1, 7); return [`${F.mixed(w, q, 4)} hours`, 'minutes', w * 60 + q * 15, () => (w * 60 + q * 15) / 15 === w * 4 + q]; },
        () => { const m = R.int(3, 12); return [`${m} minutes`, 'seconds', m * 60, () => m * 60 / 60 === m]; },
        () => { const d = R.int(2, 7); return [`${d} days`, 'hours', d * 24, () => d * 24 / 24 === d]; },
        () => { const w = R.int(3, 12); return [`${w} weeks`, 'days', w * 7, () => w * 7 / 7 === w]; },
        () => { const s = R.int(2, 9) * 60 + R.int(1, 5) * 10; return [`${F.n(s)} seconds`, 'minutes and seconds', `${Math.floor(s / 60)} minutes ${s % 60} seconds`, () => Math.floor(s / 60) * 60 + s % 60 === s]; },
      ];
      const [q, u, ans, chk] = R.pick(forms)();
      return {
        marks: 1, answer: typeof ans === 'number' ? `${F.n(ans)} ${u}` : ans,
        check: chk,
        body: A => `<p>How many ${u} are there in <b>${q}</b>?</p>${A.box(typeof ans === 'number' ? F.n(ans) : ans, { w: typeof ans === 'number' ? 28 : 50, unit: typeof ans === 'number' ? u : '' })}`,
      };
    },
  });
  add({
    id: TIME + '.timetable', topics: [TIME], level: 2,
    make(R) {
      const stops = R.pick([['Bus station', 'Market', 'Library', 'Park'], ['Station', 'Hospital', 'School', 'Beach']]);
      const gaps = [R.int(6, 14), R.int(8, 18), R.int(5, 12)];
      const first = R.int(7 * 12, 9 * 12) * 5, every = R.pick([20, 25, 30, 35, 40]);
      const buses = [0, 1, 2, 3].map(k => { let t = first + k * every; return [t, t + gaps[0], t + gaps[0] + gaps[1], t + gaps[0] + gaps[1] + gaps[2]]; });
      const fmt = t => F.t24(Math.floor(t / 60), t % 60);
      const arrive = buses[1][0] + R.int(1, every - 1);
      const k = buses.findIndex(b => b[0] >= arrive), to = R.int(2, 3);
      if (k < 0) return null;
      const ans = buses[k][to], who = R.name();
      return {
        marks: 1, answer: fmt(ans),
        check: () => buses[k][0] >= arrive && buses[k - 1][0] < arrive,
        body: A => `<p>Here is part of a bus timetable.</p>${A.table(stops.map((s, i) => [s, ...buses.map(b => fmt(b[i]))]), { rowHead: true })}<p>${who} gets to the <b>${stops[0]}</b> at <b>${fmt(arrive)}</b> and catches the next bus.</p><p>What time does ${who} arrive at the <b>${stops[to]}</b>?</p>${A.box(fmt(ans), { w: 26 })}`,
      };
    },
  });

  /* =====================================================================
   * STATISTICS
   * ===================================================================== */
  // Y6_NC_21 pie charts and line graphs
  add({
    id: 'Y6_NC_21.pie-percent', topics: ['Y6_NC_21'], level: 2,
    make(R) {
      const cats = R.pick([['Apple', 'Banana', 'Pear', 'Grape'], ['Dog', 'Cat', 'Fish', 'Rabbit'], ['Red', 'Blue', 'Green', 'Yellow']]);
      const n = R.int(3, 4);
      const ps = []; let left = 100;
      for (let i = 0; i < n - 1; i++) { const p = R.int(3, 9) * 5; ps.push(p); left -= p; }
      if (left < 15 || left > 50) return null;
      ps.push(left);
      const T = R.pick([40, 60, 80, 120, 160, 200, 240, 300, 400]);
      const i = R.int(0, n - 1);
      if (T * ps[i] % 100) return null;
      const ans = T * ps[i] / 100;
      const what = cats[0] === 'Apple' ? 'chose their favourite fruit' : cats[0] === 'Dog' ? 'chose their favourite pet' : 'chose their favourite colour';
      return {
        marks: 1, answer: F.n(ans),
        check: () => sum(ps) === 100 && ans * 100 === T * ps[i],
        body: A => `<p>The pie chart shows how <b>${T}</b> children ${what}.</p>${D.pie({ parts: ps.map((p, j) => [`${cats[j]} ${p}%`, p]), r: 28 })}<p>How many children chose <b>${cats[i]}</b>?</p>${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_21.pie-angle', topics: ['Y6_NC_21'], level: 3,
    make(R) {
      const [what, cats] = R.pick([['sport', ['Football', 'Netball', 'Tennis', 'Swimming']], ['food', ['Pizza', 'Pasta', 'Curry', 'Salad']], ['type of music', ['Rock', 'Pop', 'Jazz', 'Rap']]]);
      const angs = R.pick([[180, 90, 60, 30], [120, 120, 90, 30], [150, 90, 60, 60], [90, 90, 120, 60], [135, 90, 90, 45], [72, 144, 108, 36], [100, 80, 120, 60]]);
      const parts = R.shuffle(angs.map((a, j) => [cats[j], a]));
      const T = R.pick([36, 72, 90, 120, 180, 60, 240, 720]);
      const i = R.int(0, 3), [c, a] = parts[i];
      if (T * a % 360) return null;
      const ans = T * a / 360;
      return {
        marks: 2, method: true, answer: F.n(ans),
        guide: `Award 1 mark for a correct method, e.g. ${a} ${F.div} 360 ${F.times} ${T}.`,
        check: () => sum(parts.map(p => p[1])) === 360 && ans * 360 === T * a,
        body: A => `<p><b>${T}</b> people were asked to choose their favourite ${what}. The pie chart shows the results.</p>${D.pie({ parts, r: 21 })}<p>The angle for <b>${c}</b> is <b>${a}°</b>. How many people chose ${c}?</p>${A.work(`${a}° out of 360°: ${F.frac(a, 360)} of ${T} = ${ans}`, 18)}${A.box(ans)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_21.line-diff', topics: ['Y6_NC_21'], level: 2,
    make(R) {
      const xs = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
      const ys = []; let t = R.int(2, 10);
      for (let i = 0; i < 6; i++) { ys.push(t); t += i < 3 ? R.int(1, 6) : -R.int(1, 5); }
      if (Math.min(...ys) < 0 || Math.max(...ys) > 25) return null;
      const i = R.int(0, 5), j = R.intNot(0, 5, [i]);
      if (ys[i] === ys[j]) return null;
      const hi = ys[i] > ys[j] ? i : j, lo = hi === i ? j : i, ans = ys[hi] - ys[lo];
      return {
        marks: 1, answer: `${ans}°C`,
        check: () => ys[lo] + ans === ys[hi],
        body: A => `<p>The graph shows the temperature in a garden during one day.</p>${D.lineGraph({ xs, ys, min: 0, max: 25, step: 5, minor: 1, ylab: 'Temperature (°C)', xlab: 'Time', width: 130, height: 50 })}<p>How much warmer was it at <b>${xs[hi]}</b> than at <b>${xs[lo]}</b>?</p>${A.box(ans, { unit: '°C' })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_21.line-most', topics: ['Y6_NC_21'], level: 2,
    make(R) {
      const xs = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const ys = R.ints(6, 2, 18).map(v => v * 5);
      const rises = ys.slice(1).map((v, i) => v - ys[i]);
      const mx = Math.max(...rises);
      if (mx <= 0 || rises.filter(r => r === mx).length !== 1) return null;
      const k = rises.indexOf(mx);
      return {
        marks: 1, answer: `${xs[k]} and ${xs[k + 1]}`,
        check: () => rises.every(r => r <= ys[k + 1] - ys[k]),
        body: A => `<p>The graph shows the number of visitors to a shop each day.</p>${D.lineGraph({ xs, ys, min: 0, max: 100, step: 20, minor: 5, ylab: 'Visitors', xlab: 'Day', width: 130, height: 50 })}<p>Between which two days did the number of visitors go up the most?</p>${A.boxes([[xs[k], 'and'], [xs[k + 1]]], { w: 18 })}`,
      };
    },
  });

  // Y6_NC_22 the mean as an average
  add({
    id: 'Y6_NC_22.mean', topics: ['Y6_NC_22'], level: 1,
    make(R) {
      const n = R.int(3, 6), m = R.int(5, 60);
      const xs = []; for (let i = 0; i < n - 1; i++) xs.push(m + R.int(-Math.min(m - 1, 15), 15));
      const last = n * m - sum(xs);
      if (last < 1 || last > m + 25) return null;
      xs.push(last);
      const sh = R.shuffle(xs);
      return {
        marks: 1, answer: F.n(m),
        check: () => sum(sh) / sh.length === m,
        body: A => `<p>Work out the <b>mean</b> of these numbers.</p><div class="sent c">${sh.join(', &nbsp;')}</div>${A.box(m)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_22.missing', topics: ['Y6_NC_22'], level: 3,
    make(R) {
      const who = R.name(), n = R.int(4, 6), m = R.int(12, 40);
      const xs = []; for (let i = 0; i < n - 1; i++) xs.push(m + R.int(-10, 10));
      const last = n * m - sum(xs);
      if (last < 1 || last > 60) return null;
      return {
        marks: 2, method: true, answer: F.n(last),
        guide: `Award 1 mark for finding the total ${n * m} (${n} ${F.times} ${m}) or a correct method.`,
        check: () => (sum(xs) + last) / n === m,
        body: A => `<p>${who} played ${n} games. The mean score was <b>${m}</b>.</p><p>Here are the scores for ${n - 1} of the games.</p><div class="sent c">${xs.join(', &nbsp;')}</div><p>What did ${who} score in the other game?</p>${A.work(`total = ${n} ${F.times} ${m} = ${n * m}<br>${n * m} ${F.minus} ${sum(xs)} = ${last}`, 26)}${A.box(last)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_22.table', topics: ['Y6_NC_22'], level: 2,
    make(R) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const m = R.int(10, 45) * R.pick([1, 2]);
      const xs = days.slice(0, 4).map(() => m + R.int(-9, 9));
      const last = 5 * m - sum(xs);
      if (last < 1) return null;
      xs.push(last);
      const thing = R.pick(['books borrowed from the library', 'pupils who walked to school', 'cakes sold at a café', 'letters posted']);
      return {
        marks: 1, answer: F.n(m),
        check: () => sum(xs) === 5 * m,
        body: A => `<p>The table shows the number of ${thing} each day.</p>${A.table(days.map((d, i) => [d, xs[i]]), { head: ['Day', 'Number'] })}<p>What is the mean number per day?</p>${A.box(m)}`,
      };
    },
  });

})();
