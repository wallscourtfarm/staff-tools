/* Questions built on the pictures added 28.11.26 (Innes chose "add all of them" in the pictures doc):
 * conversion graph, shape-value puzzles, cube models on isometric paper, protractor over an angle,
 * price lists / menus / receipts, multiplication grid. See src/GENERATORS.md for the rules.
 */
(function () {
  const { F, D } = RP;
  const add = RP.add;
  const pounds = p => F.n(p / 100, 2);
  const A_ = { Toast: 'some toast', Apple: 'an apple', Juice: 'a juice', Milk: 'a carton of milk', Water: 'a bottle of water' };
  const aan = nm => A_[nm] || 'a ' + nm.toLowerCase();

  /* ---------- conversion graphs ---------- */
  // k = num/den; every x on an x-minor gridline gives a y on a y-minor gridline
  const GRAPHS = [
    { a: 'miles', b: 'kilometres', au: 'miles', bu: 'km', num: 8, den: 5, xmax: 50, xstep: 10, xminor: 5, ymax: 80, ystep: 20, yminor: 4 },
    { a: 'pounds (£)', b: 'euros (€)', au: '£', bu: '€', pre: true, num: 6, den: 5, xmax: 50, xstep: 10, xminor: 5, ymax: 60, ystep: 10, yminor: 2 },
    { a: 'inches', b: 'centimetres', au: 'inches', bu: 'cm', num: 5, den: 2, xmax: 20, xstep: 4, xminor: 2, ymax: 50, ystep: 10, yminor: 5 },
  ];
  const amt = (g, side, v) => side === 'a' ? (g.pre ? `£${F.n(v)}` : `${F.n(v)} ${g.au}`) : (g.pre ? `€${F.n(v)}` : `${F.n(v)} ${g.bu}`);
  const graph = (g, reads, A) => D.convGraph({ xmax: g.xmax, ymax: g.ymax, xstep: g.xstep, ystep: g.ystep, xminor: g.xminor, yminor: g.yminor, k: g.num / g.den, xlab: g.a, ylab: g.b, reads }, A);

  add({
    id: 'Y6_NC_13.convgraph', topics: ['Y6_NC_13'], level: 2,
    make(R) {
      const g = R.pick(GRAPHS);
      const steps = g.xmax / g.xminor, i = R.int(1, steps - 1);
      const x = i * g.xminor, y = x * g.num / g.den;
      if (!Number.isInteger(y) || x % g.xstep === 0 && R.chance(0.6)) return null;
      const fwd = R.chance(0.6);
      const ans = fwd ? y : x;
      return {
        marks: 1, answer: fwd ? amt(g, 'b', y) : amt(g, 'a', x), guide: 'Accept the number without the unit.',
        check: () => y * g.den === x * g.num && y % g.yminor === 0,
        body: A => `<p>This graph converts between ${g.a.replace(/ \(.*/, '')} and ${g.b.replace(/ \(.*/, '')}.</p>${graph(g, [{ x }], A)}<p>Use the graph to convert <b>${fwd ? amt(g, 'a', x) : amt(g, 'b', y)}</b> to ${fwd ? g.b.replace(/ \(.*/, '') : g.a.replace(/ \(.*/, '')}.</p>${A.box(F.n(ans), g.pre ? { pre: fwd ? '€' : '£' } : { unit: fwd ? g.bu : g.au })}`,
      };
    },
  });
  add({
    id: 'Y6_NC_21.convgraph-beyond', topics: ['Y6_NC_21', 'Y6_NC_13'], level: 3,
    make(R) {
      const g = R.pick(GRAPHS);
      const x0 = R.int(1, g.xmax / g.xminor - 1) * g.xminor, m = R.pick([4, 5, 10]);
      const x = x0 * m, y = x * g.num / g.den, y0 = x0 * g.num / g.den;
      if (!Number.isInteger(y0) || x <= g.xmax) return null;
      return {
        marks: 2, method: true, answer: amt(g, 'b', y), guide: `Award 1 mark for reading ${amt(g, 'a', x0)} = ${amt(g, 'b', y0)} (or another correct pair) and scaling.`,
        check: () => y === y0 * m && y * g.den === x * g.num,
        body: A => `<p>This graph converts between ${g.a.replace(/ \(.*/, '')} and ${g.b.replace(/ \(.*/, '')}.</p>${graph(g, [{ x: x0 }], A)}<p>The graph does not go as far as <b>${amt(g, 'a', x)}</b>.</p><p>Use the graph to convert <b>${amt(g, 'a', x)}</b> to ${g.b.replace(/ \(.*/, '')}.</p>${A.work(`${amt(g, 'a', x0)} = ${amt(g, 'b', y0)}, ${F.times} ${m}: ${amt(g, 'a', x)} = ${amt(g, 'b', y)}`, 22)}${A.box(F.n(y), g.pre ? { pre: '€' } : { unit: g.bu })}`,
      };
    },
  });

  /* ---------- shape-value puzzles ---------- */
  const KINDS = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
  const S = k => D.sym(k, 6);
  const eq = (terms, total) => `<div class="sent c">${terms.map(S).join(' + ')} &nbsp;=&nbsp; ${F.n(total)}</div>`;

  add({
    id: 'Y6_011.symbols', topics: ['Y6_011'], level: 3,
    make(R) {
      const [p, q] = R.sample(KINDS, 2), a = R.int(3, 24), b = R.intNot(3, 24, [a]);
      const n = R.int(2, 3), t1 = n * a + b, t2 = a + b;
      return {
        marks: 2, answer: `${S(p)} = ${a}, ${S(q)} = ${b}`, guide: 'Award 1 mark for one value correct, or both values that fit only one of the number sentences.',
        check: () => t1 - t2 === (n - 1) * a && t2 - a === b,
        body: A => `<p>Each shape stands for a number.</p>${eq([...Array(n).fill(p), q], t1)}${eq([p, q], t2)}<p>Work out the value of each shape.</p><div class="sent c">${S(p)} = ${A.blank(a, 16)} &nbsp;&nbsp;&nbsp; ${S(q)} = ${A.blank(b, 16)}</div>`,
      };
    },
  });
  add({
    id: 'Y6_NC_11.symbols-chain', topics: ['Y6_NC_11'], level: 2,
    make(R) {
      const [p, q] = R.sample(KINDS, 2), n = R.int(2, 4), a = R.int(4, 25), b = R.int(3, 40);
      const t1 = n * a, t2 = a + b;
      if (b === a) return null;
      return {
        marks: 1, answer: F.n(b),
        check: () => t2 - t1 / n === b,
        body: A => `<p>Each shape stands for a number.</p>${eq(Array(n).fill(p), t1)}${eq([p, q], t2)}<p>What number does ${S(q)} stand for?</p>${A.box(F.n(b))}`,
      };
    },
  });

  /* ---------- cube models ---------- */
  const cuboid = (a, b, c) => { const out = []; for (let z = 0; z < c; z++) for (let y = 0; y < b; y++) for (let x = 0; x < a; x++) out.push([x, y, z]); return out; };

  add({
    id: 'Y6_NC_16.cubes-cuboid', topics: ['Y6_NC_16'], level: 2,
    make(R) {
      const a = R.int(2, 5), b = R.int(2, 4), c = R.int(2, 4), cm = cuboid(a, b, c), v = a * b * c;
      if (a === b && b === c) return null;
      return {
        marks: 1, answer: `${v} cm³`, guide: 'Accept the number without the unit.',
        check: () => cm.length === v,
        body: A => `<p>This cuboid is made from 1 cm cubes.</p>${D.cubes({ cubes: cm, s: 6.5 })}<p>What is its volume?</p>${A.box(F.n(v), { unit: 'cm³' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_18.cubes-complete', topics: ['Y5_NC_18'], level: 2,
    make(R) {
      // a wall one cube deep, stepped down from left to right; how many more cubes make it a cuboid?
      const w = R.int(3, 5), H = R.int(2, 4);
      const hs = [...Array(w)].map((_, i) => Math.max(1, H - R.int(0, Math.min(i, H - 1))));
      hs.sort((u, v) => v - u); hs[0] = H;
      const have = [], miss = [];
      hs.forEach((h, x) => { for (let z = 0; z < H; z++) (z < h ? have : miss).push([x, 0, z]); });
      if (miss.length < 2) return null;
      const who = R.name();
      return {
        marks: 1, answer: F.n(miss.length),
        check: () => have.length + miss.length === w * H && hs.reduce((s, h) => s + H - h, 0) === miss.length,
        body: A => `<p>${who} builds this shape from cubes.</p>${D.cubes({ cubes: have, ans: miss, s: 7 }, A)}<p>How many more cubes are needed to make it into a cuboid ${w} cubes long and ${H} cubes high?</p>${A.box(F.n(miss.length), { unit: 'cubes' })}`,
      };
    },
  });
  add({
    id: 'Y5_NC_23.cubes-count', topics: ['Y5_NC_23', 'Y5_NC_18'], level: 1,
    make(R) {
      // one layer of cubes (every cube can be seen), L or T shaped footprint
      const a = R.int(3, 5), b = R.int(2, 4), cs = [];
      const cut = R.int(1, a - 1), keep = R.pick(['L', 'T']);
      for (let y = 0; y < b; y++) for (let x = 0; x < a; x++) {
        if (keep === 'L' && y > 0 && x >= cut) continue;
        if (keep === 'T' && y > 0 && (x === 0 || x === a - 1) && a > 2) continue;
        cs.push([x, y, 0]);
      }
      const z2 = R.chance(0.5) ? [[0, 0, 1]] : [];
      const all = cs.concat(z2), n = all.length;
      if (n < 4) return null;
      return {
        marks: 1, answer: F.n(n),
        check: () => new Set(all.map(p => p.join())).size === n,
        body: A => `<p>This model is made from cubes. There are no hidden cubes.</p>${D.cubes({ cubes: all, s: 7.5 })}<p>How many cubes are in the model?</p>${A.box(F.n(n), { unit: 'cubes' })}`,
      };
    },
  });

  /* ---------- protractor ---------- */
  const PROT = 'new_d_n8bvzswy_4_mwtc1a4g';
  add({
    id: PROT + '.protractor', topics: [PROT], level: 2,
    make(R) {
      const deg = R.int(3, 33) * 5, side = R.pick(['right', 'left']);
      if (deg === 90) return null;
      return {
        marks: 1, answer: `${deg}°`, guide: `Do not accept ${180 - deg}° (the other scale).`,
        check: () => deg > 0 && deg < 180 && deg % 5 === 0,
        body: A => `<p>A protractor is placed on this angle.</p>${D.protractor({ deg, side })}<p>What is the size of the angle?</p>${A.box(F.n(deg), { unit: '°' })}`,
      };
    },
  });
  add({
    id: 'Y5_018.protractor-mistake', topics: ['Y5_018', PROT], level: 2,
    make(R) {
      const deg = R.chance(0.5) ? R.int(4, 14) * 5 : R.int(22, 32) * 5, side = R.pick(['right', 'left']), who = R.name();
      const wrong = 180 - deg, kind = deg < 90 ? 'acute' : 'obtuse', kindW = deg < 90 ? 'less' : 'more';
      return {
        marks: 1, answer: `${deg}°; read the wrong scale`,
        guide: `Accept an explanation that ${who} read the wrong scale, or that the angle is ${kind} so it must be ${kindW} than 90°. The correct size (${deg}°) on its own is not enough.`,
        check: () => wrong + deg === 180 && (deg < 90) === (wrong > 90),
        body: A => `${D.protractor({ deg, side })}<p>${who} says, “This angle is ${wrong}°.”</p><p>Explain the mistake ${who} has made.</p>${A.explain(`${who} read the wrong scale. The angle is ${kind}, so it is ${kindW} than 90°. It is ${deg}°.`, 2)}`,
      };
    },
  });

  /* ---------- price lists, menus, receipts ---------- */
  const CAFE = [['Toast', 45, 95], ['Apple', 25, 60], ['Cookie', 35, 85], ['Juice', 55, 99], ['Muffin', 70, 140], ['Yoghurt', 40, 90], ['Milk', 30, 70], ['Flapjack', 50, 120], ['Banana', 20, 50], ['Water', 35, 80]];
  const SHOP = [['Pencil', 35, 90], ['Ruler', 60, 150], ['Rubber', 25, 75], ['Notebook', 120, 350], ['Glue stick', 95, 240], ['Pen', 80, 199], ['Sharpener', 45, 120], ['Folder', 150, 399]];
  const price = (R, lo, hi) => R.int(lo / 5, hi / 5) * 5;
  const pickItems = (R, list, n) => R.sample(list, n).map(([nm, lo, hi]) => [nm, price(R, lo, hi)]);

  add({
    id: 'Y3_NC_09.menu-change', topics: ['Y3_NC_09'], level: 3,
    make(R) {
      const items = pickItems(R, CAFE, 5), who = R.name();
      const [i, j] = R.sample([0, 1, 2, 3, 4], 2), cost = items[i][1] + items[j][1];
      const paid = cost < 200 ? 200 : 500, ch = paid - cost;
      if (cost % 100 === 0) return null;
      return {
        marks: 2, method: true, answer: F.money(ch, ch < 100), guide: `Award 1 mark for the total cost ${F.money(cost, cost < 100)}.`,
        check: () => ch + items[j][1] + items[i][1] === paid,
        body: A => `${D.priceList({ title: 'School café', items })}<p>${who} buys ${aan(items[i][0])} and ${aan(items[j][0])}.</p><p>${who} pays with a ${F.money(paid).replace('.00', '')} coin. How much change does ${who} get?</p>${A.work(`${F.money(items[i][1], true)} + ${F.money(items[j][1], true)} = ${F.money(cost, cost < 100)}, ${F.money(paid)} ${F.minus} ${F.money(cost, cost < 100)} = ${F.money(ch, ch < 100)}`, 24)}${ch < 100 ? A.box(F.n(ch), { unit: 'p' }) : A.box(pounds(ch), { pre: '£' })}`,
      };
    },
  });
  add({
    id: 'Y4_NC_18.receipt-missing', topics: ['Y4_NC_18'], level: 2,
    make(R) {
      const rows = pickItems(R, SHOP, 3).map(([n, p]) => [n, 1, p]), k = R.int(0, 2);
      const total = rows.reduce((s, r) => s + r[2], 0), miss = rows[k][2];
      const shown = rows.map((r, i) => i === k ? [r[0], 1, { a: miss }] : r);
      return {
        marks: 1, answer: F.money(miss),
        check: () => total - rows.filter((_, i) => i !== k).reduce((s, r) => s + r[2], 0) === miss,
        body: A => `<p>Part of this receipt is missing.</p>${D.receipt({ shop: 'Corner Shop', rows: shown, total }, A)}<p>Write the missing price.</p>`,
      };
    },
  });
  add({
    id: 'Y5_NC_19.receipt-complete', topics: ['Y5_NC_19'], level: 3,
    make(R) {
      const items = pickItems(R, SHOP, 4);
      const pickd = R.sample([0, 1, 2, 3], 2), q = [R.int(2, 4), R.int(2, 5)];
      const lines = pickd.map((i, n) => [items[i][0], q[n], items[i][1] * q[n]]);
      const total = lines[0][2] + lines[1][2], paid = total < 1000 ? 1000 : 2000, ch = paid - total;
      if (ch <= 0) return null;
      return {
        marks: 2, answer: `${F.money(lines[0][2])}, ${F.money(lines[1][2])}, ${F.money(total)}, ${F.money(ch)}`,
        guide: 'Award 2 marks for all four correct. Award 1 mark for three correct, or for later values that follow correctly from one wrong value.',
        check: () => ch + total === paid && lines.every((l, n) => l[2] / q[n] === items[pickd[n]][1]),
        body: A => `${D.priceList({ title: 'Stationery prices', items, pence: false })}<p>Complete the receipt.</p>${D.receipt({ shop: 'Stationery Shop', rows: lines.map(([n, k, p]) => [n, k, { a: p }]), total: { a: total }, paid, change: { a: ch } }, A)}`,
      };
    },
  });

  /* ---------- multiplication grid ---------- */
  const tgrid = (A, cols, rows, cell) => A.table(rows.map((r, i) => [r.h, ...cols.map((c, j) => cell(i, j))]), { head: [F.times, ...cols.map(c => c.h)], rowHead: true, cls: 'tgrid' });

  add({
    id: 'Y3_009.tgrid', topics: ['Y3_009'], level: 1,
    make(R) {
      const rs = R.sample([2, 4, 5, 8, 10], 3), cs = R.sample([2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
      if (!rs.some(r => [4, 8].includes(r))) return null;
      const blanks = R.sample([...Array(9).keys()], 3);
      const ans = blanks.sort((a, b) => a - b).map(b => rs[Math.floor(b / 3)] * cs[b % 3]);
      return {
        marks: 1, answer: ans.join(', '), guide: 'All three needed.',
        check: () => blanks.every((b, n) => ans[n] / cs[b % 3] === rs[Math.floor(b / 3)]),
        body: A => `<p>Complete the multiplication grid.</p>${tgrid(A, cs.map(h => ({ h })), rs.map(h => ({ h })), (i, j) => blanks.includes(i * 3 + j) ? { a: rs[i] * cs[j] } : rs[i] * cs[j])}`,
      };
    },
  });
  add({
    id: 'Y4_008.tgrid-headers', topics: ['Y4_008'], level: 2,
    make(R) {
      const rs = R.sample([3, 4, 6, 7, 8, 9, 11, 12], 3), cs = R.sample([3, 4, 5, 6, 7, 8, 9, 12], 3);
      const mi = R.int(0, 2), mj = R.int(0, 2);
      const others = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== mi && j !== mj) others.push([i, j]);
      const [oi, oj] = R.pick(others);
      const hidden = (i, j) => (i === mi && j === mj) || (i === oi && j === oj);
      const ans = [rs[mi], cs[mj], rs[mi] * cs[mj], rs[oi] * cs[oj]];
      return {
        marks: 2, answer: ans.join(', '), guide: 'Award 2 marks for all four correct, 1 mark for two or three correct.',
        check: () => cs.some((c, j) => j !== mj && rs[mi] * c / c === rs[mi]) && rs.some((r, i) => i !== mi && !hidden(i, mj)),
        body: A => `<p>Write the missing numbers in this multiplication grid.</p>${A.table(rs.map((r, i) => [i === mi ? { a: r } : r, ...cs.map((c, j) => hidden(i, j) ? { a: r * c } : r * c)]), { head: [F.times, ...cs.map((c, j) => j === mj ? { a: c } : c)], rowHead: true, cls: 'tgrid' })}`,
      };
    },
  });
})();
