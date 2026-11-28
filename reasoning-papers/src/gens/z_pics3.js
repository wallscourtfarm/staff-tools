/* Questions on weighing scales with a round dial (added 28.11.26, Innes: "add" in the pictures doc). */
(function () {
  const { F, D } = RP;
  const add = RP.add;
  // dials: [max, major, minor, unit]; values sit on a minor tick
  const pickVal = (R, max, minor, notMajor) => {
    const k = R.int(1, Math.round(max / minor) - 1), v = k * minor;
    return v;
  };

  add({
    id: 'Y2_NC_10.dial', topics: ['Y2_NC_10'], level: 1,
    make(R) {
      const [max, major, minor, unit] = R.pick([[10, 1, 1, 'kg'], [20, 5, 1, 'kg'], [20, 2, 1, 'kg'], [500, 100, 10, 'g']]);
      const v = pickVal(R, max, minor);
      if (v % major === 0 && R.chance(0.7)) return null;
      const what = R.pick(['bag of potatoes', 'parcel', 'box of books', 'pumpkin', 'bag of flour']);
      return {
        marks: 1, answer: `${v} ${unit}`,
        check: () => v % minor === 0 && v > 0 && v < max,
        body: A => `<p>A ${what} is on the scales.</p>${D.dial({ max, major, minor, value: v, unit }, A)}<p>How heavy is the ${what}?</p>${A.box(F.n(v), { unit })}`,
      };
    },
  });
  add({
    id: 'Y3_007.dial', topics: ['Y3_007'], level: 2,
    make(R) {
      const minor = R.pick([50, 25, 20, 10]), max = minor === 25 ? 400 : 500;
      const v = pickVal(R, max, minor);
      if (v % 100 === 0) return null;
      return {
        marks: 1, answer: `${v} g`,
        check: () => (v / minor) * minor === v && Math.round(100 / minor) * minor === 100,
        body: A => `<p>What mass do the scales show?</p>${D.dial({ max, major: 100, minor, value: v, unit: 'g' }, A)}${A.box(F.n(v), { unit: 'g' })}`,
      };
    },
  });
  add({
    id: 'Y4_007.dial', topics: ['Y4_007', 'Y4_NC_16'], level: 2,
    make(R) {
      const minor = R.pick([500, 250, 200, 100]), max = minor === 250 ? 4000 : 5000;
      const v = pickVal(R, max, minor);
      if (v % 1000 === 0) return null;
      return {
        marks: 1, answer: `${F.n(v)} g`, guide: `Accept ${F.n(v / 1000)} kg.`,
        check: () => v % minor === 0 && Math.round(1000 / minor) * minor === 1000,
        body: A => `<p>The scales are marked in kilograms.</p>${D.dial({ max, major: 1000, minor, value: v, unit: 'kg', fmt: x => F.n(x / 1000) }, A)}<p>How many <b>grams</b> do the scales show?</p>${A.box(F.n(v), { unit: 'g' })}`,
      };
    },
  });
  add({
    id: 'Y5_007.dial', topics: ['Y5_007'], level: 2,
    make(R) {
      // work in hundredths of a kg
      const minor = R.pick([50, 25, 20, 10]), max = minor === 25 ? 400 : 500;
      const v = pickVal(R, max, minor);
      if (v % 100 === 0) return null;
      return {
        marks: 1, answer: `${F.n(v / 100)} kg`, guide: `Accept ${F.n(v * 10)} g.`,
        check: () => v % minor === 0,
        body: A => `<p>What mass do the scales show? Give your answer in kilograms.</p>${D.dial({ max, major: 100, minor, value: v, unit: 'kg', fmt: x => F.n(x / 100) }, A)}${A.box(F.n(v / 100), { unit: 'kg' })}`,
      };
    },
  });
  add({
    id: 'Y3_NC_07.dial-difference', topics: ['Y3_NC_07'], level: 3,
    make(R) {
      const minor = R.pick([20, 25, 50]), max = 1000, major = minor === 25 ? 250 : 200;
      const a = pickVal(R, max, minor), b = pickVal(R, max, minor);
      if (Math.abs(a - b) < 100 || a % major === 0 || b % major === 0) return null;
      const [n1, n2] = R.pick([['apples', 'pears'], ['the red parcel', 'the blue parcel'], ['the cheese', 'the butter'], ['the carrots', 'the onions']]);
      const big = a > b ? n1 : n2, diff = Math.abs(a - b);
      return {
        marks: 2, method: true, answer: `${diff} g`, guide: `Award 1 mark for reading both scales correctly (${a} g and ${b} g).`,
        check: () => Math.max(a, b) - Math.min(a, b) === diff,
        body: A => `${D.row([{ fig: D.dial({ max, major, minor, value: a, unit: 'g', r: 23 }), cap: n1.replace(/^the /, '') }, { fig: D.dial({ max, major, minor, value: b, unit: 'g', r: 23 }), cap: n2.replace(/^the /, '') }], 10)}<p>How much heavier is ${big} than ${big === n1 ? n2 : n1}?</p>${A.work(`${Math.max(a, b)} g ${F.minus} ${Math.min(a, b)} g = ${diff} g`, 20)}${A.box(F.n(diff), { unit: 'g' })}`,
      };
    },
  });
})();
