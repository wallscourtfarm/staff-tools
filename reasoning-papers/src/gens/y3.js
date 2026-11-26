/* Year 3 question generators. Topic ids from src/topics.json. See src/GENERATORS.md. */
(function () {
  const { F, D } = RP;
  const add = RP.add;

  // Y3_004 Know 10 tens = 1 hundred; how many tens in multiples of 10 up to 990
  add({
    id: 'Y3_004.tens-in', topics: ['Y3_004'], level: 1,
    make(R) {
      const n = R.int(11, 99) * 10;
      const tens = n / 10;
      const form = R.int(0, 1);
      return {
        marks: 1, answer: F.n(tens),
        check: () => tens * 10 === n && Number.isInteger(tens),
        body: A => form === 0
          ? `<p>How many tens are there in <b>${F.n(n)}</b>?</p>${A.box(tens)}`
          : `<p>Write the missing number.</p><div class="sent c">${F.n(n)} = ${A.blank(tens, 16)} tens</div>`,
      };
    },
  });
  add({
    id: 'Y3_004.counters', topics: ['Y3_004'], level: 2,
    make(R) {
      const tens = R.int(12, 40), n = tens * 10;
      const who = R.name();
      return {
        marks: 1, answer: F.n(tens),
        check: () => tens * 10 === n,
        body: A => `<p>${who} has some 10p coins. They are worth <b>${F.n(n)}p</b> altogether.</p><p>How many 10p coins does ${who} have?</p>${A.box(tens, { unit: 'coins' })}`,
      };
    },
  });

  // Y3_005 place value of each digit in 3-digit numbers; standard and non-standard partitioning
  add({
    id: 'Y3_005.partition', topics: ['Y3_005'], level: 1,
    make(R) {
      const h = R.int(1, 9), t = R.int(1, 9), o = R.int(1, 9), n = h * 100 + t * 10 + o;
      const hide = R.int(0, 2);
      const parts = [h * 100, t * 10, o];
      return {
        marks: 1, answer: F.n(parts[hide]),
        check: () => parts[0] + parts[1] + parts[2] === n,
        body: A => `<p>Write the missing number.</p><div class="sent c">${F.n(n)} = ${parts.map((p, i) => i === hide ? A.blank(p, 16) : F.n(p)).join(' + ')}</div>`,
      };
    },
  });
  add({
    id: 'Y3_005.nonstandard', topics: ['Y3_005'], level: 2,
    make(R) {
      const h = R.int(2, 9), t = R.int(0, 7), o = R.int(1, 9), n = h * 100 + t * 10 + o;
      // non-standard: (h-1) hundreds + (t+10) tens + o
      const a = (h - 1) * 100, b = (t + 10) * 10, who = R.name();
      return {
        marks: 1, answer: F.n(b),
        check: () => a + b + o === n && b > 90,
        body: A => `<p>${who} partitions ${F.n(n)} like this.</p><div class="sent c">${F.n(n)} = ${F.n(a)} + ${A.blank(b, 16)} + ${o}</div><p>What is the missing number?</p>`,
      };
    },
  });
  add({
    id: 'Y3_005.digit-value', topics: ['Y3_005'], level: 1,
    make(R) {
      const ds = R.ints(3, 1, 9), n = ds[0] * 100 + ds[1] * 10 + ds[2];
      const k = R.int(0, 2), val = ds[k] * [100, 10, 1][k];
      const opts = R.shuffle([ds[k], ds[k] * 10, ds[k] * 100]);
      return {
        marks: 1, answer: F.n(val),
        check: () => opts.includes(val),
        body: A => `<p>What is the value of the digit <b>${ds[k]}</b> in ${F.n(n)}?</p><p>Circle your answer.</p>${A.circle(opts, opts.indexOf(val))}`,
      };
    },
  });

  // Y3_006 place a 3-digit number on a number line; multiples of 10 and 100 either side
  add({
    id: 'Y3_006.arrow', topics: ['Y3_006'], level: 2,
    make(R) {
      const start = R.int(1, 8) * 100, v = start + R.int(1, 9) * 10;
      return {
        marks: 1, answer: F.n(v),
        check: () => v > start && v < start + 100,
        body: A => `<p>What number is the arrow pointing to?</p>${D.numberLine({ min: start, max: start + 100, minor: 10, major: 100, marks: [{ v, box: true }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y3_006.either-side', topics: ['Y3_006'], level: 2,
    make(R) {
      let n = R.int(101, 989); if (n % 10 === 0) n += 3;
      const lo = Math.floor(n / 10) * 10, hi = lo + 10, h0 = Math.floor(n / 100) * 100, h1 = h0 + 100;
      const asTens = R.chance(0.5);
      const [a, b, what] = asTens ? [lo, hi, 'multiples of 10'] : [h0, h1, 'multiples of 100'];
      return {
        marks: 1, answer: `${F.n(a)} and ${F.n(b)}`,
        check: () => a < n && n < b,
        body: A => `<p>Write the ${what} that come just before and just after ${F.n(n)}.</p><div class="sent c">${A.blank(a, 18)} &lt; ${F.n(n)} &lt; ${A.blank(b, 18)}</div>`,
      };
    },
  });

  // Y3_007 split 100 into 2,4,5,10 equal parts; read scales in 50s, 25s, 20s, 10s
  add({
    id: 'Y3_007.scale', topics: ['Y3_007'], level: 2,
    make(R) {
      const step = R.pick([50, 25, 20, 10]), parts = 100 / step;
      const max = R.pick(step === 10 ? [100, 200] : step === 20 ? [100, 200, 300] : [100, 200, 300, 500]);
      const k = R.int(1, max / step - 1), v = k * step;
      if (v % 100 === 0) return null;
      const kind = R.pick(['jug', 'line']);
      return {
        marks: 1, answer: kind === 'jug' ? F.n(v) + ' ml' : F.n(v),
        check: () => v % step === 0 && v < max && parts === Math.round(parts),
        body: A => kind === 'jug'
          ? `<p>How much water is in the jug?</p>${D.scale({ max, major: 100, minor: step, level: v, unit: 'ml', height: 62 }, A)}${A.box(v, { unit: 'ml' })}`
          : `<p>What number is the arrow pointing to?</p>${D.numberLine({ min: 0, max, minor: step, major: 100, marks: [{ v, box: true }] }, A)}`,
      };
    },
  });
  add({
    id: 'Y3_007.parts', topics: ['Y3_007'], level: 1, minVariety: 4,
    make(R) {
      const parts = R.pick([2, 4, 5, 10]), step = 100 / parts;
      return {
        marks: 1, answer: F.n(step),
        check: () => step * parts === 100,
        body: A => `<p>This line from 0 to 100 is split into ${parts} equal parts.</p>${D.numberLine({ min: 0, max: 100, minor: step, major: 100, labels: 'ends' }, A)}<p>What is each part worth?</p>${A.box(step)}`,
      };
    },
  });

  // Y3_009 2,4,5,8,10 times tables and division facts; multiples
  add({
    id: 'Y3_009.missing', topics: ['Y3_009'], level: 1,
    make(R) {
      const t = R.pick([2, 4, 5, 8, 10]), k = R.int(2, 12), p = t * k;
      const f = R.int(0, 3);
      return {
        marks: 1, answer: F.n(k),
        check: () => t * k === p,
        body: A => {
          const b = A.blank(k);
          const s = [`${b} ${F.times} ${t} = ${p}`, `${t} ${F.times} ${b} = ${p}`, `${p} ${F.div} ${t} = ${b}`, `${p} ${F.div} ${b} = ${t}`][f];
          return `<p>Write the missing number.</p><div class="sent c">${s}</div>`;
        },
      };
    },
  });
  add({
    id: 'Y3_009.multiples', topics: ['Y3_009'], level: 2,
    make(R) {
      const t = R.pick([4, 5, 8]);
      const yes = R.sample([...Array(12).keys()].map(i => (i + 2) * t).filter(x => x < 100), 2);
      const no = R.sample([...Array(60).keys()].map(i => i + 11).filter(x => x % t !== 0 && !(t === 8 && x % 4 === 0 && R.f() < 0.5)), 3);
      const opts = R.shuffle([...yes, ...no]);
      const right = opts.map((x, i) => x % t === 0 ? i : -1).filter(i => i >= 0);
      return {
        marks: 1, answer: right.map(i => opts[i]).join(' and '),
        check: () => right.length === 2,
        body: A => `<p>Tick the <b>two</b> numbers that are multiples of ${t}.</p>${A.tick(opts, right)}`,
      };
    },
  });

  // Y3_011 complements to 100
  add({
    id: 'Y3_011.complement', topics: ['Y3_011'], level: 1,
    make(R) {
      const a = R.int(11, 89), b = 100 - a;
      if (a % 10 === 0) return null;
      const form = R.int(0, 1);
      return {
        marks: 1, answer: F.n(b),
        check: () => a + b === 100,
        body: A => form ? `<p>Write the missing number.</p><div class="sent c">${a} + ${A.blank(b)} = 100</div>`
          : `<p>Write the missing number.</p><div class="sent c">100 ${F.minus} ${A.blank(b)} = ${a}</div>`,
      };
    },
  });
  add({
    id: 'Y3_011.money', topics: ['Y3_011'], level: 2,
    make(R) {
      const p = R.int(12, 88); if (p % 5 && R.chance(0.5)) return null;
      const who = R.name(), thing = R.pick(['an apple', 'a pencil', 'a rubber', 'a bookmark', 'a ruler']);
      return {
        marks: 1, answer: (100 - p) + 'p',
        check: () => p + (100 - p) === 100,
        body: A => `<p>${who} buys ${thing} for <b>${p}p</b> and pays with a £1 coin.</p><p>How much change does ${who} get?</p>${A.box(100 - p, { unit: 'p' })}`,
      };
    },
  });

  // Y3_012 add and subtract up to three-digit numbers (column methods), in context, 2 marks
  add({
    id: 'Y3_012.word', topics: ['Y3_012'], level: 3,
    make(R) {
      const sub = R.chance(0.5);
      let a = R.int(250, 899), b = R.int(120, 480);
      if (!sub && a + b > 999) return null;
      if (sub && b >= a) return null;
      const ans = sub ? a - b : a + b;
      const ctxs = sub
        ? [[`A school has ${F.n(a)} books in the library.`, `${F.n(b)} books are lent out.`, 'How many books are left in the library?', 'books'],
          [`A farmer has ${F.n(a)} eggs.`, `She sells ${F.n(b)} of them.`, 'How many eggs does she have left?', 'eggs']]
        : [[`On Monday ${F.n(a)} people visit a museum.`, `On Tuesday ${F.n(b)} people visit.`, 'How many people visit altogether?', 'people'],
          [`A shop sells ${F.n(a)} drinks in the morning`, `and ${F.n(b)} drinks in the afternoon.`, 'How many drinks does it sell altogether?', 'drinks']];
      const [l1, l2, qn, unit] = R.pick(ctxs);
      return {
        marks: 2, method: true, answer: F.n(ans),
        check: () => (sub ? ans + b === a : ans - b === a),
        body: A => `<p>${l1} ${l2}</p><p>${qn}</p>${A.work(`${F.n(a)} ${sub ? F.minus : '+'} ${F.n(b)} = ${F.n(ans)}`, 30)}${A.box(ans, { unit })}`,
      };
    },
  });
  add({
    id: 'Y3_012.missing-digits', topics: ['Y3_012'], level: 3,
    make(R) {
      const a = R.int(214, 589), b = R.int(113, 399), s = a + b;
      if (s > 999) return null;
      const ad = String(a).split('').map(Number), bd = String(b).split('').map(Number), sd = String(s).split('').map(Number);
      const hideA = R.int(0, 2), hideB = R.intNot(0, 2, [hideA]);
      const cell = (d, hide, A) => hide ? `<td class="cd">${A.blank(d, 9)}</td>` : `<td class="cd">${d}</td>`;
      return {
        marks: 1, answer: `${ad[hideA]} and ${bd[hideB]}`,
        check: () => +ad.join('') + +bd.join('') === +sd.join(''),
        body: A => `<p>Write the missing digits to make this addition correct.</p>
          <table class="qt" style="border:0"><tr><td style="border:0"></td>${ad.map((d, i) => cell(d, i === hideA, A)).join('')}</tr>
          <tr><td style="border:0">+</td>${bd.map((d, i) => cell(d, i === hideB, A)).join('')}</tr>
          <tr><td style="border:0"></td>${sd.map(d => `<td class="cd"><b>${d}</b></td>`).join('')}</tr></table>`,
      };
    },
  });

  // Y3_016 unit fractions of amounts using division facts
  add({
    id: 'Y3_016.of-amount', topics: ['Y3_016'], level: 1,
    make(R) {
      const d = R.pick([2, 3, 4, 5, 8, 10]), k = R.int(2, 10), n = d * k;
      return {
        marks: 1, answer: F.n(k),
        check: () => n / d === k,
        body: A => `<p>Work out</p><div class="sent c">${F.frac(1, d)} of ${n} = ${A.blank(k)}</div>`,
      };
    },
  });
  add({
    id: 'Y3_016.context', topics: ['Y3_016'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6]), k = R.int(3, 9), n = d * k, who = R.name();
      const thing = R.pick([['sweets', 'are red'], ['marbles', 'are blue'], ['stickers', 'are stars'], ['cards', 'are gold']]);
      return {
        marks: 1, answer: F.n(k),
        check: () => k * d === n,
        body: A => `<p>${who} has ${n} ${thing[0]}.</p><p>${F.frac(1, d)} of them ${thing[1]}.</p><p>How many ${thing[0]} ${thing[1]}?</p>${A.box(k)}`,
      };
    },
  });

  // Y3_017 place fractions between 0 and 1 on a number line
  add({
    id: 'Y3_017.arrow', topics: ['Y3_017'], level: 2,
    make(R) {
      const d = R.pick([3, 4, 5, 6, 8, 10]), n = R.int(1, d - 1);
      const fmt = v => v === 0 ? '0' : v === 1 ? '1' : '';
      return {
        marks: 1, answer: F.frac(n, d),
        check: () => n > 0 && n < d,
        body: A => `<p>What fraction is the arrow pointing to?</p>${D.numberLine({ min: 0, max: 1, minor: 1 / d, major: 1, labels: 'ends', fmt, marks: [{ v: n / d }] }, A)}${A.box(F.frac(n, d), { w: 20 })}`,
      };
    },
  });
  add({
    id: 'Y3_017.draw', topics: ['Y3_017'], level: 2,
    make(R) {
      const d = R.pick([4, 5, 8, 10]), n = R.int(1, d - 1);
      const fmt = v => v === 0 ? '0' : v === 1 ? '1' : '';
      return {
        marks: 1, answer: `Arrow at ${n}/${d}`,
        check: () => n < d,
        body: A => `<p>Draw an arrow to show where ${F.frac(n, d)} goes on this number line.</p>${D.numberLine({ min: 0, max: 1, minor: 1 / d, major: 1, labels: 'ends', fmt, marks: [{ v: n / d, ans: true }] }, A)}`,
        guide: 'Accept an arrow or a clear mark at the right place.',
      };
    },
  });

  // Y3_019 right angles in shapes, any orientation
  add({
    id: 'Y3_019.how-many', topics: ['Y3_019'], level: 2,
    make(R) {
      // shapes on a grid with a known number of right angles
      const shapes = [
        { pts: [[0, 0], [4, 0], [4, 3], [0, 3]], r: 4, name: 'rectangle' },
        { pts: [[0, 0], [4, 0], [0, 3]], r: 1 },
        { pts: [[0, 0], [5, 0], [5, 2], [2, 2], [2, 4], [0, 4]], r: 5 },
        { pts: [[0, 0], [4, 0], [3, 3], [1, 3]], r: 0 },
        { pts: [[0, 0], [3, 0], [3, 3], [0, 4]], r: 2 },
        { pts: [[1, 0], [3, 0], [4, 2], [2, 4], [0, 2]], r: 1 },
        { pts: [[0, 0], [2, 0], [2, 2], [4, 2], [4, 4], [0, 4]], r: 5 },
      ];
      const sh = R.pick(shapes);
      // rotate by 0/90 and maybe 45-degree-free shift
      const rot = R.int(0, 1);
      const pts = sh.pts.map(([x, y]) => rot ? [y + 1, 5 - x] : [x + 1, y + 1]);
      return {
        marks: 1, answer: F.n(sh.r),
        check: () => sh.r === countRight(sh.pts),
        body: A => `<p>How many right angles does this shape have?</p>${D.grid({ cols: 7, rows: 6, cell: 6, dots: true, polys: [{ pts }] }, A)}${A.box(sh.r)}`,
      };
    },
  });
  // interior right angles (a reflex corner of 270 degrees does not count)
  function countRight(pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
    let k = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length], v = pts[i], b = pts[(i + 1) % pts.length];
      const dot = (a[0] - v[0]) * (b[0] - v[0]) + (a[1] - v[1]) * (b[1] - v[1]);
      const cross = (v[0] - a[0]) * (b[1] - v[1]) - (v[1] - a[1]) * (b[0] - v[0]);
      if (dot === 0 && cross * area > 0) k++;   // convex corner
    }
    return k;
  }
  add({
    id: 'Y3_019.turns', topics: ['Y3_019'], level: 1,
    make(R) {
      const dirs = ['north', 'east', 'south', 'west'];
      const s = R.int(0, 3), k = R.int(1, 3), cw = R.chance(0.5);
      const end = (s + (cw ? k : 4 - k)) % 4;
      const turns = { 1: 'a quarter turn', 2: 'a half turn', 3: 'three quarter turns' }, who = R.name();
      return {
        marks: 1, answer: dirs[end],
        check: () => end >= 0 && end < 4,
        body: A => `<p>${who} is facing <b>${dirs[s]}</b>.</p><p>They make ${turns[k]} <b>${cw ? 'clockwise' : 'anticlockwise'}</b>.</p><p>Which way are they facing now?</p>${A.line(dirs[end], 40)}`,
      };
    },
  });

  // Y3_NC_10 time on an analogue clock (incl. Roman numerals)
  add({
    id: 'Y3_NC_10.read', topics: ['Y3_NC_10'], level: 1,
    make(R) {
      const h = R.int(1, 12), m = R.int(0, 11) * 5, roman = R.chance(0.35);
      const words = m === 0 ? `${h} o'clock` : null;
      const dig = `${h}:${String(m).padStart(2, '0')}`;
      return {
        marks: 1, answer: dig,
        check: () => m < 60 && h <= 12,
        body: A => `<p>What time does the clock show?</p>${D.clock({ h, m, roman, size: 44 }, A)}${A.box(dig, { w: 28 })}`,
        guide: `Accept the time in words${words ? ` (${words})` : ''}.`,
      };
    },
  });
  add({
    id: 'Y3_NC_10.draw', topics: ['Y3_NC_10'], level: 2,
    make(R) {
      const h = R.int(1, 12), m = R.pick([15, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55]);
      const say = m === 15 ? `quarter past ${h}` : m === 30 ? `half past ${h}` : m === 45 ? `quarter to ${h % 12 + 1}` : m < 30 ? `${m} minutes past ${h}` : `${60 - m} minutes to ${h % 12 + 1}`;
      return {
        marks: 1, answer: `${h}:${String(m).padStart(2, '0')}`,
        check: () => m % 5 === 0,
        body: A => `<p>Draw the hands on the clock to show <b>${say}</b>.</p>${D.clock({ h, m, ans: true, size: 42 }, A)}`,
        guide: 'Both hands must be correct. The hour hand may point at or just past the hour.',
      };
    },
  });

  // Y3_NC_13/14 bar charts: read and answer one- and two-step questions
  add({
    id: 'Y3_NC_14.bar', topics: ['Y3_NC_13', 'Y3_NC_14'], level: 2,
    make(R) {
      const sets = [['the favourite pets of some children', ['Cat', 'Dog', 'Fish', 'Rabbit'], 'Number of children', 'chose'],
        ['the favourite fruit of some children', ['Apple', 'Banana', 'Pear', 'Grape'], 'Number of children', 'chose'],
        ['the weather in a town over some days', ['Sun', 'Rain', 'Cloud', 'Snow'], 'Number of days', 'had']];
      const [intro, cats, ylab, verb] = R.pick(sets);
      const step = R.pick([2, 5, 10]);
      const vals = cats.map(() => R.int(1, 9) * step);
      if (new Set(vals).size < 4) return null;
      const max = Math.max(...vals) + step;
      const i = R.int(0, 3), j = R.intNot(0, 3, [i]);
      const form = R.int(0, 1);
      const ans = form ? Math.abs(vals[i] - vals[j]) : vals[i] + vals[j];
      const big = vals[i] > vals[j] ? i : j, small = big === i ? j : i;
      return {
        marks: 1, answer: F.n(ans),
        check: () => ans === (form ? vals[big] - vals[small] : vals[i] + vals[j]),
        body: A => `<p>This bar chart shows ${intro}.</p>${D.barChart({ cats, vals, step, max: Math.ceil(max / step) * step, ylab }, A)}
          <p>${verb === 'had' ? (form ? `How many more days had <b>${cats[big].toLowerCase()}</b> than <b>${cats[small].toLowerCase()}</b>?` : `How many days had <b>${cats[i].toLowerCase()}</b> or <b>${cats[j].toLowerCase()}</b> altogether?`)
            : (form ? `How many more children chose <b>${cats[big]}</b> than <b>${cats[small]}</b>?` : `How many children chose <b>${cats[i]}</b> or <b>${cats[j]}</b> altogether?`)}</p>${A.box(ans)}`,
      };
    },
  });
})();
