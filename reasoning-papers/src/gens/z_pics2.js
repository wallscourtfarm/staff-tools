/* Questions on the second set of pictures added 28.11.26 (Innes: "add these" in the pictures doc):
 * digital clock, calendar page, Venn and Carroll diagrams. See src/GENERATORS.md for the rules.
 */
(function () {
  const { F, D } = RP;
  const add = RP.add;
  const ord = d => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');

  /* ---------- digital clock ---------- */
  add({
    id: 'Y4_NC_19.digital-write', topics: ['Y4_NC_19'], level: 2,
    make(R) {
      const h = R.int(13, 22), m = R.int(0, 11) * 5;
      const part = h < 17 ? 'in the afternoon' : 'in the evening';
      return {
        marks: 1, answer: F.t24(h, m),
        check: () => (h - 12) * 60 + m === ((h % 12) * 60 + m),
        body: A => `<p>The clock shows a time ${part}.</p>${D.clock({ h: h - 12, m, size: 34 }, A)}<p>Write this time on the 24-hour digital clock.</p>${D.digital({ h, m, mode: '24', ans: true }, A)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_11.digital-duration', topics: ['Y3_NC_11'], level: 2,
    make(R) {
      const h = R.int(8, 18), m1 = R.int(0, 9) * 5, len = R.int(3, 14) * 5;
      const t2 = h * 60 + m1 + len, h2 = Math.floor(t2 / 60), m2 = t2 % 60;
      if (h2 > 19) return null;
      const what = R.pick(['A swimming lesson', 'A film', 'A football match', 'A cooking class', 'A piano lesson']);
      return {
        marks: 1, answer: `${len} minutes`,
        check: () => (h2 - h) * 60 + (m2 - m1) === len,
        body: A => `<p>${what} starts and ends at these times.</p>${D.row([{ fig: D.digital({ h, m: m1, mode: '12', ampm: true }), cap: 'Starts' }, { fig: D.digital({ h: h2, m: m2, mode: '12', ampm: true }), cap: 'Ends' }], 14)}<p>How many minutes does it last?</p>${A.box(F.n(len), { unit: 'minutes' })}`,
      };
    },
  });
  add({
    id: 'new_d_afe4i7p9_5_mwt9fuwx.digital-fast', topics: ['new_d_afe4i7p9_5_mwt9fuwx'], level: 3,
    make(R) {
      const h = R.int(6, 21), m = R.int(0, 59), off = R.int(7, 48), fast = R.chance(0.5);
      const real = h * 60 + m + (fast ? -off : off);
      if (real < 0 || real >= 24 * 60) return null;
      const rh = Math.floor(real / 60), rm = real % 60;
      if (rh === h) return null;   // make it cross an hour
      return {
        marks: 1, answer: F.t24(rh, rm),
        check: () => Math.abs((rh * 60 + rm) - (h * 60 + m)) === off,
        body: A => `<p>This clock is <b>${off} minutes ${fast ? 'fast' : 'slow'}</b>.</p>${D.digital({ h, m, mode: '24' })}<p>What is the real time?</p>${D.digital({ h: rh, m: rm, mode: '24', ans: true }, A)}`,
      };
    },
  });

  /* ---------- calendar ---------- */
  const cal = (R) => { const year = R.int(2026, 2029), month = R.int(0, 11); return { year, month, n: D.daysIn(year, month) }; };

  add({
    id: 'Y1_NC_11.calendar-day', topics: ['Y1_NC_11'], level: 1,
    make(R) {
      const { year, month, n } = cal(R), d = R.int(1, n), wd = D.DAYS[D.dow(year, month, d)];
      return {
        marks: 1, answer: wd,
        check: () => new Date(Date.UTC(year, month, d)).toUTCString().startsWith(wd.slice(0, 3)),
        body: A => `<p>Here is a calendar.</p>${D.calendar({ year, month, ring: [d] })}<p>What day of the week is the circled date?</p>${A.line(wd, 50)}`,
      };
    },
  });
  add({
    id: 'Y3_NC_12.calendar-month', topics: ['Y3_NC_12'], level: 2,
    make(R) {
      // the last day of the month shown, then: what day is the 1st of the next month?
      const { year, month, n } = cal(R);
      const nextFirst = D.DAYS[(D.dow(year, month, n) + 1) % 7], next = D.MONTHS[(month + 1) % 12];
      return {
        marks: 1, answer: nextFirst,
        check: () => D.DAYS[D.dow(month === 11 ? year + 1 : year, (month + 1) % 12, 1)] === nextFirst,
        body: A => `${D.calendar({ year, month })}<p>What day of the week will the 1st of ${next} be?</p>${A.line(nextFirst, 50)}`,
      };
    },
  });
  add({
    id: 'Y4_NC_20.calendar-weeks', topics: ['Y4_NC_20'], level: 2,
    make(R) {
      const { year, month, n } = cal(R), who = R.name();
      const w = R.int(1, 3), dd = R.int(0, 6), gap = w * 7 + dd, d1 = R.int(1, n - gap), d2 = d1 + gap;
      if (d1 < 1) return null;
      const what = R.pick(['school trip', 'party', 'swimming gala', 'visit to the dentist', 'football tournament']);
      return {
        marks: 1, answer: `${D.DAYS[D.dow(year, month, d2)]} ${ord(d2)} ${D.MONTHS[month]}`, guide: 'Accept the date without the day.',
        check: () => (D.dow(year, month, d2) - D.dow(year, month, d1) + 7) % 7 === dd % 7,
        body: A => `${D.calendar({ year, month, ring: [d1] })}<p>${who} circles the ${ord(d1)} of ${D.MONTHS[month]}.</p><p>${who} has a ${what} <b>${F.pl(w, 'week')}${dd ? ' and ' + F.pl(dd, 'day') : ''}</b> after the circled date.</p><p>What is the date of the ${what}?</p>${A.box(ord(d2), { unit: D.MONTHS[month], w: 22 })}`,
      };
    },
  });

  /* ---------- Venn diagrams ---------- */
  const sortVenn = (nums, p, q) => {
    const o = { a: [], both: [], b: [], none: [] };
    nums.forEach(v => (p(v) && q(v) ? o.both : p(v) ? o.a : q(v) ? o.b : o.none).push(v));
    return o;
  };
  const vennAns = (o, la, lb) => [['Both', o.both], [la + ' only', o.a], [lb + ' only', o.b], ['Neither', o.none]].filter(r => r[1].length).map(r => `${r[0]}: ${r[1].join(', ')}`).join('; ');

  add({
    id: 'Y5_012.venn-multiples', topics: ['Y5_012'], level: 2,
    make(R) {
      const [x, y] = R.pick([[3, 4], [4, 6], [3, 5], [5, 6], [6, 8], [4, 5], [2, 7]]);
      const p = v => v % x === 0, q = v => v % y === 0;
      const pool = []; for (let v = 6; v <= 60; v++) pool.push(v);
      const pick = t => R.sample(pool.filter(t), 2);
      const nums = [...pick(v => p(v) && q(v)).slice(0, 1), ...pick(v => p(v) && !q(v)), ...pick(v => q(v) && !p(v)), ...pick(v => !p(v) && !q(v)).slice(0, 1)];
      if (new Set(nums).size !== 6) return null;
      const o = sortVenn(nums, p, q), la = `multiples of ${x}`, lb = `multiples of ${y}`, list = R.shuffle(nums.slice());
      return {
        marks: 1, answer: vennAns(o, la, lb), guide: 'All six numbers must be in the correct place.',
        check: () => o.both.every(v => v % F.lcm(x, y) === 0) && o.a.length + o.b.length + o.both.length + o.none.length === 6,
        body: A => `<p>Write each number in the correct place on the Venn diagram.</p><div class="sent c">${list.join(', &nbsp; ')}</div>${D.venn({ labels: [la, lb], ...o, ans: true }, A)}`,
      };
    },
  });
  add({
    id: 'Y6_NC_04.venn-factors', topics: ['Y6_NC_04'], level: 2,
    make(R) {
      const [x, y] = R.pick([[24, 36], [18, 30], [20, 30], [16, 24], [12, 30], [24, 40], [28, 42]]);
      const fx = v => x % v === 0, fy = v => y % v === 0;
      const facs = []; for (let v = 1; v <= Math.max(x, y); v++) if (fx(v) || fy(v)) facs.push(v);
      const both = facs.filter(v => fx(v) && fy(v) && v > 1), onlyA = facs.filter(v => fx(v) && !fy(v)), onlyB = facs.filter(v => fy(v) && !fx(v));
      if (both.length < 2 || !onlyA.length || !onlyB.length) return null;
      const nums = [...R.sample(both, 2), ...R.sample(onlyA, Math.min(2, onlyA.length)), ...R.sample(onlyB, Math.min(2, onlyB.length))];
      const extra = R.pick([7, 9, 11, 13, 25, 27].filter(v => !fx(v) && !fy(v)));
      nums.push(extra);
      const o = sortVenn(nums, fx, fy), la = `factors of ${x}`, lb = `factors of ${y}`, list = R.shuffle(nums.slice());
      return {
        marks: 1, answer: vennAns(o, la, lb), guide: 'All numbers must be in the correct place.',
        check: () => o.both.every(v => F.gcd(x, y) % v === 0),
        body: A => `<p>Write each number in the correct place on the Venn diagram.</p><div class="sent c">${list.join(', &nbsp; ')}</div>${D.venn({ labels: [la, lb], ...o, ans: true }, A)}`,
      };
    },
  });

  /* ---------- Carroll diagrams ---------- */
  add({
    id: 'Y2_NC_06.carroll-numbers', topics: ['Y2_NC_06'], level: 2,
    make(R) {
      const cut = R.pick([20, 25, 30, 40]);
      const nums = R.ints(6, 5, 60);
      const even = v => v % 2 === 0, big = v => v > cut;
      if (![[1, 1], [1, 0], [0, 1], [0, 0]].every(([e, b]) => nums.some(v => even(v) === !!e && big(v) === !!b))) return null;
      const cells = [[nums.filter(v => even(v) && big(v)), nums.filter(v => even(v) && !big(v))], [nums.filter(v => !even(v) && big(v)), nums.filter(v => !even(v) && !big(v))]];
      return {
        marks: 1, answer: `even, more than ${cut}: ${cells[0][0].join(', ')}; even, not: ${cells[0][1].join(', ')}; odd, more than ${cut}: ${cells[1][0].join(', ')}; odd, not: ${cells[1][1].join(', ')}`, guide: 'All six numbers must be in the correct place.',
        check: () => cells.flat(2).length === 6 && cells[1].flat().every(v => v % 2 === 1),
        body: A => `<p>Write each number in the correct place in the sorting table.</p><div class="sent c">${nums.join(', &nbsp; ')}</div>${D.carroll({ cols: [`more than ${cut}`, `not more than ${cut}`], rows: ['even', 'odd'], cells, ans: true }, A)}`,
      };
    },
  });
  const SHAPES = [
    ['square', [[0, 0], [18, 0], [18, 18], [0, 18]]],
    ['rectangle', [[0, 0], [28, 0], [28, 14], [0, 14]]],
    ['right-angled triangle', [[0, 0], [0, 20], [24, 20]]],
    ['parallelogram', [[7, 0], [29, 0], [22, 16], [0, 16]]],
    ['kite', [[11, 0], [22, 9], [11, 25], [0, 9]]],
    ['right-angled trapezium', [[0, 0], [16, 0], [27, 16], [0, 16]]],
    ['regular pentagon', D.regular(5, 12)],
    ['house pentagon', [[0, 9], [11, 0], [22, 9], [22, 23], [0, 23]]],
    ['regular hexagon', D.regular(6, 12)],
    ['isosceles triangle', [[10, 0], [20, 22], [0, 22]]],
    ['rhombus', [[12, 0], [24, 9], [12, 18], [0, 9]]],
  ];
  const hasRight = pts => pts.some((v, i) => { const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length]; return Math.abs((a[0] - v[0]) * (b[0] - v[0]) + (a[1] - v[1]) * (b[1] - v[1])) < 1e-6; });
  add({
    id: 'Y4_018.carroll-shapes', topics: ['Y4_018'], level: 2,
    make(R) {
      const sh = R.sample(SHAPES, 5), L = ['A', 'B', 'C', 'D', 'E'];
      const quad = s => s[1].length === 4;
      const cells = [[[], []], [[], []]];
      sh.forEach((s, i) => cells[hasRight(s[1]) ? 0 : 1][quad(s) ? 0 : 1].push(L[i]));
      if (cells.flat().filter(c => c.length).length < 3) return null;
      return {
        marks: 1, answer: `right angle, quadrilateral: ${cells[0][0].join(', ') || 'none'}; right angle, not: ${cells[0][1].join(', ') || 'none'}; no right angle, quadrilateral: ${cells[1][0].join(', ') || 'none'}; no right angle, not: ${cells[1][1].join(', ') || 'none'}`,
        guide: 'All five letters must be in the correct place.',
        check: () => sh.every((s, i) => cells.flat().some(c => c.includes(L[i]))) && cells[1].flat().every(l => !hasRight(sh[L.indexOf(l)][1])),
        body: A => `${D.row(sh.map((s, i) => ({ fig: D.shape({ pts: s[1], pad: 3 }), cap: L[i] })), 6)}<p>Write the letter of each shape in the correct place.</p>${D.carroll({ cols: ['quadrilateral', 'not a quadrilateral'], rows: ['has a right angle', 'has no right angle'], cells, ans: true }, A)}`,
      };
    },
  });
})();
