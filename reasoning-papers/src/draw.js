/* Reasoning Papers: drawing kit. Every function returns an SVG (or HTML) string.
 * SVG units are millimetres on the printed page: width 150 means 150 mm wide.
 * Pass the answer kit A as the last argument where a drawing shows an answer: parts marked
 * `ans` are drawn in red only on the mark scheme (A.show true).
 */
var RP = (typeof RP !== 'undefined') ? RP : require('./engine.js');
RP.D = (function () {
  const F = RP.F;
  const r2 = x => Math.round(x * 100) / 100;
  const svg = (w, h, inner, cls = '') =>
    `<svg class="fig ${cls}" viewBox="0 0 ${r2(w)} ${r2(h)}" style="width:${r2(w)}mm;height:${r2(h)}mm" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  const txt = (x, y, s, o = {}) =>
    `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size || 4}" text-anchor="${o.anchor || 'middle'}"${o.bold ? ' font-weight="bold"' : ''}${o.cls ? ` class="${o.cls}"` : ''}${o.rot ? ` transform="rotate(${o.rot} ${r2(x)} ${r2(y)})"` : ''}>${s}</text>`;
  const line = (x1, y1, x2, y2, cls = '') => `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}"${cls ? ` class="${cls}"` : ''}/>`;
  const poly = (pts, cls = '') => `<polygon points="${pts.map(p => r2(p[0]) + ',' + r2(p[1])).join(' ')}"${cls ? ` class="${cls}"` : ''}/>`;
  const pline = (pts, cls = '') => `<polyline points="${pts.map(p => r2(p[0]) + ',' + r2(p[1])).join(' ')}"${cls ? ` class="${cls}"` : ''}/>`;
  const box = (x, y, w, h, cls = 'bx') => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" class="${cls}"/>`;
  const arrowDown = (x, y1, y2, cls = '') => line(x, y1, x, y2, cls) + poly([[x - 1.4, y2 - 2.4], [x + 1.4, y2 - 2.4], [x, y2]], cls ? cls + ' fillc' : 'fillk');
  const arrowUp = (x, y1, y2, cls = '') => line(x, y1, x, y2, cls) + poly([[x - 1.4, y2 + 2.4], [x + 1.4, y2 + 2.4], [x, y2]], cls ? cls + ' fillc' : 'fillk');

  /* Number line.
   * o = {min, max, minor, major, labels:'major'|'ends'|[values], width, fmt,
   *      marks:[{v, box:true|false, text, ans:true, below:true}] }
   *  - mark with box: an arrow points at v with an empty box above it (answer v in red on the scheme)
   *  - mark with text: an arrow and a printed label
   *  - mark with ans:true and no box: an arrow drawn only on the scheme ("draw an arrow to show ...")
   *  - labelBoxes:[values]: a tick label replaced by an empty box (the answer goes in it)
   */
  function numberLine(o, A) {
    const W = o.width || 150, pad = 8, L = W - 2 * pad;
    const top = o.marks && o.marks.some(m => !m.below) ? 18 : 4;
    const yl = top + 4, H = yl + 12 + (o.marks && o.marks.some(m => m.below) ? 14 : 0);
    const fmt = o.fmt || (v => F.n(v));
    const X = v => pad + (v - o.min) / (o.max - o.min) * L;
    let s = line(pad - 3, yl, W - pad + 3, yl, 'nl');
    const nMinor = Math.round((o.max - o.min) / o.minor);
    const perMajor = Math.round(o.major / o.minor);
    for (let i = 0; i <= nMinor; i++) {
      const v = o.min + i * o.minor, x = X(v), big = i % perMajor === 0;
      s += line(x, yl - (big ? 3 : 1.8), x, yl + (big ? 3 : 1.8));
    }
    let labs = [];
    if (o.labels === 'ends') labs = [o.min, o.max];
    else if (Array.isArray(o.labels)) labs = o.labels;
    else for (let i = 0; i <= nMinor; i += perMajor) labs.push(o.min + i * o.minor);
    const lb = o.labelBoxes || [];
    for (const v of labs) if (!lb.some(b => Math.abs(b - v) < 1e-9)) s += txt(X(v), yl + 8, fmt(+v.toFixed(6)), { size: 3.6 });
    for (const v of lb) { s += box(X(v) - 7, yl + 4.2, 14, 6.5); if (A && A.show) s += txt(X(v), yl + 9.2, fmt(+v.toFixed(6)), { size: 3.6, cls: 'ans', bold: true }); }
    for (const m of (o.marks || [])) {
      const x = X(m.v);
      if (m.below) {
        if (m.ans && !(A && A.show)) continue;
        s += arrowUp(x, yl + 13, yl + 1.5, m.ans ? 'ansl' : '');
        if (m.text !== undefined) s += txt(x, yl + 18, m.text, { size: 3.6, cls: m.ans ? 'ans' : '' });
        continue;
      }
      if (m.ans && !m.box && !(A && A.show)) continue;
      s += arrowDown(x, top - 5, yl - 1.5, m.ans && !m.box ? 'ansl' : '');
      if (m.box) {
        s += box(x - 8, top - 13, 16, 7.5);
        if (A && A.show) s += txt(x, top - 7.6, m.ansText !== undefined ? m.ansText : fmt(+m.v.toFixed(6)), { size: 3.6, cls: 'ans', bold: true });
      } else if (m.text !== undefined) s += txt(x, top - 7, m.text, { size: 3.6, cls: m.ans ? 'ans' : '' });
    }
    return svg(W, H, s);
  }

  /* Vertical scale (jug, thermometer, measuring cylinder).
   * o = {max, min=0, major, minor, level, unit, fmt, height=60, kind:'jug'|'thermo', ansLevel:bool}
   * level is the liquid level (or reading). ansLevel: level drawn only on the scheme (pupil draws it).
   */
  function scale(o, A) {
    const min = o.min || 0, H0 = o.height || 60, top = 6, bot = top + H0, W = 46;
    const fmt = o.fmt || (v => F.n(v));
    const Y = v => bot - (v - min) / (o.max - min) * H0;
    let s = '';
    const x0 = 14, x1 = 32;
    const showLevel = o.level !== undefined && (!o.ansLevel || (A && A.show));
    if (o.kind === 'thermo') {
      s += `<rect x="${x0 + 6}" y="${top - 3}" width="6" height="${H0 + 5}" rx="3" class="glass"/>`;
      s += `<circle cx="${x0 + 9}" cy="${bot + 5}" r="5" class="${o.ansLevel ? 'ansf' : 'liq'}"/>`;
      if (showLevel) s += box(x0 + 7.5, Y(o.level), 3, bot + 2 - Y(o.level), o.ansLevel ? 'ansf' : 'liq');
    } else {
      if (showLevel) s += box(x0, Y(o.level), x1 - x0, bot - Y(o.level), o.ansLevel ? 'ansf' : 'liq');
      s += pline([[x0, top - 4], [x0, bot], [x1, bot], [x1, top - 4]], 'glassl');
    }
    const n = Math.round((o.max - min) / o.minor), per = Math.round(o.major / o.minor);
    const xt = o.kind === 'thermo' ? x0 + 12 : x1;
    for (let i = 0; i <= n; i++) {
      const v = min + i * o.minor, y = Y(v), big = i % per === 0;
      s += line(xt, y, xt + (big ? 4 : 2.2), y);
      if (big) s += txt(xt + 5.5, y + 1.3, fmt(+v.toFixed(6)), { size: 3.4, anchor: 'start' });
    }
    if (o.unit) s += txt(xt + 5.5, top - 4, o.unit, { size: 3.4, anchor: 'start' });
    return svg(W + 8, bot + (o.kind === 'thermo' ? 12 : 4), s);
  }

  /* Squared grid / coordinate grid.
   * o = {cols, rows, cell=6, axes:false, numbers:true, polys:[{pts, cls, label, ans}],
   *      pts:[{x,y,label,ans}], mirror:{x1,y1,x2,y2}, dots:false (dotty paper), segs:[{a:[x,y],b:[x,y],ans}]}
   * Grid units, origin bottom-left, y upwards.
   */
  function grid(o, A) {
    const c = o.cell || 6, ox = o.axes ? 9 : 2, oy = 2;
    const W = ox + o.cols * c + 6, H = oy + o.rows * c + (o.axes ? 9 : 2);
    const P = (x, y) => [ox + x * c, oy + (o.rows - y) * c];
    const show = A && A.show;
    let s = '';
    if (o.dots) {
      for (let x = 0; x <= o.cols; x++) for (let y = 0; y <= o.rows; y++) { const [px, py] = P(x, y); s += `<circle cx="${r2(px)}" cy="${r2(py)}" r="0.55" class="dot"/>`; }
    } else {
      for (let x = 0; x <= o.cols; x++) s += line(...P(x, 0), ...P(x, o.rows), 'gl');
      for (let y = 0; y <= o.rows; y++) s += line(...P(0, y), ...P(o.cols, y), 'gl');
    }
    if (o.axes) {
      s += line(...P(0, 0), ...P(o.cols + 0.6, 0), 'axis') + line(...P(0, 0), ...P(0, o.rows + 0.6), 'axis');
      if (o.numbers !== false) {
        for (let x = 0; x <= o.cols; x += (o.every || 1)) s += txt(P(x, 0)[0], P(x, 0)[1] + 4.5, x, { size: 3.2 });
        for (let y = 1; y <= o.rows; y += (o.every || 1)) s += txt(P(0, y)[0] - 2.5, P(0, y)[1] + 1.2, y, { size: 3.2, anchor: 'end' });
      }
      s += txt(P(o.cols + 0.9, 0)[0], P(0, 0)[1] + 1.3, 'x', { size: 3.6, anchor: 'start' }) + txt(P(0, o.rows + 1)[0], P(0, o.rows + 1)[1] + 2, 'y', { size: 3.6 });
    }
    if (o.mirror) { const m = o.mirror; s += line(...P(m.x1, m.y1), ...P(m.x2, m.y2), 'mirror'); }
    for (const p of (o.polys || [])) {
      if (p.ans && !show) continue;
      s += poly(p.pts.map(q => P(q[0], q[1])), p.ans ? 'ansp' : (p.cls || 'shape'));
      if (p.label) { const cx = p.pts.reduce((a, q) => a + q[0], 0) / p.pts.length, cy = p.pts.reduce((a, q) => a + q[1], 0) / p.pts.length; s += txt(P(cx, cy)[0], P(cx, cy)[1] + 1.4, p.label, { size: 4, bold: true, cls: p.ans ? 'ans' : '' }); }
    }
    for (const g of (o.segs || [])) { if (g.ans && !show) continue; s += line(...P(...g.a), ...P(...g.b), g.ans ? 'ansl' : 'seg'); }
    for (const p of (o.pts || [])) {
      if (p.ans && !show) continue;
      const [px, py] = P(p.x, p.y);
      s += line(px - 1.3, py - 1.3, px + 1.3, py + 1.3, p.ans ? 'ansl' : 'cross') + line(px - 1.3, py + 1.3, px + 1.3, py - 1.3, p.ans ? 'ansl' : 'cross');
      if (p.label) s += txt(px + 2, py - 1.6, p.label, { size: 3.8, anchor: 'start', bold: true, cls: p.ans ? 'ans' : '' });
    }
    return svg(W, H, s);
  }

  /* Analogue clock. o = {h, m, roman:false, hands:true, ans:false (hands only on scheme), size=40} */
  function clock(o, A) {
    const S = o.size || 40, R = S / 2 - 1, cx = S / 2, cy = S / 2;
    let s = `<circle cx="${cx}" cy="${cy}" r="${R}" class="face"/>`;
    const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 60; i++) {
      const a = i * 6 * Math.PI / 180, big = i % 5 === 0;
      s += line(cx + Math.sin(a) * (R - (big ? 2.6 : 1.3)), cy - Math.cos(a) * (R - (big ? 2.6 : 1.3)), cx + Math.sin(a) * R, cy - Math.cos(a) * R, big ? 'tk2' : 'tk1');
    }
    for (let i = 0; i < 12; i++) {
      const a = i * 30 * Math.PI / 180, rr = R - 6.2;
      s += txt(cx + Math.sin(a) * rr, cy - Math.cos(a) * rr + 1.2, o.roman ? romans[i] : (i || 12), { size: Math.min(o.roman ? 3 : 3.8, S * (o.roman ? 0.07 : 0.095)) });
    }
    const drawHands = o.hands !== false && (!o.ans || (A && A.show));
    if (drawHands) {
      const mA = o.m * 6 * Math.PI / 180, hA = ((o.h % 12) * 30 + o.m * 0.5) * Math.PI / 180;
      const cl = o.ans ? 'ansl hand' : 'hand';
      s += line(cx, cy, cx + Math.sin(hA) * R * 0.5, cy - Math.cos(hA) * R * 0.5, cl + ' hh');
      s += line(cx, cy, cx + Math.sin(mA) * R * 0.8, cy - Math.cos(mA) * R * 0.8, cl);
    }
    s += `<circle cx="${cx}" cy="${cy}" r="0.9" class="fillk"/>`;
    return svg(S, S, s);
  }

  /* Bar chart. o = {cats, vals, step, max, ylab, xlab, title, ans:[i] (bars drawn only on scheme),
   *   horizontal:false, width=130, height=60, gridEvery:step} */
  function barChart(o, A) {
    const show = A && A.show;
    const W = o.width || 130, Hc = o.height || 60, left = 16, top = 6, bottom = 14;
    const n = o.cats.length, max = o.max, bw = (W - left - 4) / n;
    const Y = v => top + Hc - v / max * Hc;
    let s = '';
    const minor = o.minor || o.step;
    for (let v = 0; v <= max + 1e-9; v += minor) {
      const isMaj = Math.abs(v / o.step - Math.round(v / o.step)) < 1e-9;
      s += line(left, Y(v), W - 4, Y(v), isMaj ? 'gl' : 'gl2');
      if (isMaj) s += txt(left - 2, Y(v) + 1.2, F.n(+v.toFixed(6)), { size: 3.2, anchor: 'end' });
    }
    o.cats.forEach((c, i) => {
      const x = left + i * bw + bw * 0.18, w = bw * 0.64;
      const isAns = (o.ans || []).includes(i);
      if (!isAns || show) s += box(x, Y(o.vals[i]), w, Y(0) - Y(o.vals[i]), isAns ? 'ansf' : 'bar');
      s += txt(left + i * bw + bw / 2, top + Hc + 5, c, { size: 3.2 });
    });
    s += line(left, top, left, Y(0), 'axis') + line(left, Y(0), W - 4, Y(0), 'axis');
    if (o.ylab) s += txt(4, top + Hc / 2, o.ylab, { size: 3.2, rot: -90 });
    if (o.xlab) s += txt(left + (W - left) / 2, top + Hc + 11, o.xlab, { size: 3.2 });
    return (o.title ? `<div class="figt">${o.title}</div>` : '') + svg(W, top + Hc + bottom, s);
  }

  /* Line graph. o = {xs (labels), ys, max, step, ylab, xlab, title, width, height} */
  function lineGraph(o) {
    const W = o.width || 130, Hc = o.height || 60, left = 16, top = 6, bottom = 14;
    const n = o.xs.length, dx = (W - left - 8) / (n - 1);
    const Y = v => top + Hc - (v - (o.min || 0)) / (o.max - (o.min || 0)) * Hc;
    let s = '';
    const minor = o.minor || o.step;
    for (let v = (o.min || 0); v <= o.max + 1e-9; v += minor) {
      const isMaj = Math.abs((v - (o.min || 0)) / o.step - Math.round((v - (o.min || 0)) / o.step)) < 1e-9;
      s += line(left, Y(v), W - 4, Y(v), isMaj ? 'gl' : 'gl2');
      if (isMaj) s += txt(left - 2, Y(v) + 1.2, F.n(+v.toFixed(6)), { size: 3.2, anchor: 'end' });
    }
    o.xs.forEach((x, i) => { s += line(left + 4 + i * dx, top, left + 4 + i * dx, Y(o.min || 0), 'gl2') + txt(left + 4 + i * dx, top + Hc + 5, x, { size: 3.2 }); });
    s += line(left, top, left, Y(o.min || 0), 'axis') + line(left, Y(o.min || 0), W - 4, Y(o.min || 0), 'axis');
    s += pline(o.ys.map((v, i) => [left + 4 + i * dx, Y(v)]), 'graph');
    o.ys.forEach((v, i) => s += `<circle cx="${r2(left + 4 + i * dx)}" cy="${r2(Y(v))}" r="0.9" class="fillk"/>`);
    if (o.ylab) s += txt(4, top + Hc / 2, o.ylab, { size: 3.2, rot: -90 });
    if (o.xlab) s += txt(left + (W - left) / 2, top + Hc + 11, o.xlab, { size: 3.2 });
    return (o.title ? `<div class="figt">${o.title}</div>` : '') + svg(W, top + Hc + bottom, s);
  }

  /* Pictogram (HTML). o = {rows:[[label, count]], per (value of one symbol), unit, sym:'●'|'circle'} */
  function pictogram(o, A) {
    const show = A && A.show;
    const icon = (frac, ans) => {
      // frac 1, 0.5, 0.25, 0.75 of a circle symbol
      const r = 3, c = 3.5;
      let p = frac >= 1 ? `<circle cx="${c}" cy="${c}" r="${r}" class="${ans ? 'ansf' : 'sym'}"/>`
        : `<path d="${sector(c, c, r, frac)}" class="${ans ? 'ansf' : 'sym'}"/><circle cx="${c}" cy="${c}" r="${r}" class="symo"/>`;
      return `<svg viewBox="0 0 7 7" style="width:7mm;height:7mm">${p}</svg>`;
    };
    const rows = o.rows.map(([lab, val, ans]) => {
      let k = val / o.per, s = '';
      if (!ans || show) { while (k >= 1 - 1e-9) { s += icon(1, ans); k -= 1; } if (k > 1e-9) s += icon(k, ans); }
      return `<tr><th>${lab}</th><td class="pics">${s}</td></tr>`;
    }).join('');
    return `<table class="picto">${rows}</table><div class="key">Key: ${icon(1)} = ${F.pl(o.per, o.unit || 'item', o.units || (o.unit === 'child' ? 'children' : o.unit === 'person' ? 'people' : undefined))}</div>`;
  }
  function sector(cx, cy, r, frac) {
    // pie slice from 12 o'clock, clockwise
    const a = frac * 2 * Math.PI, x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
    return `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${r2(x)},${r2(y)} Z`;
  }

  /* Pie chart. o = {parts:[[label, value]], r=22, ans:false} */
  function pie(o) {
    const r = o.r || 22, cx = r + 2, cy = r + 2, tot = o.parts.reduce((a, p) => a + p[1], 0);
    let s = '', acc = 0;
    o.parts.forEach(([lab, val], i) => {
      const a0 = acc / tot * 2 * Math.PI; acc += val; const a1 = acc / tot * 2 * Math.PI;
      const p0 = [cx + r * Math.sin(a0), cy - r * Math.cos(a0)], p1 = [cx + r * Math.sin(a1), cy - r * Math.cos(a1)];
      s += `<path d="M${cx},${cy} L${r2(p0[0])},${r2(p0[1])} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${r2(p1[0])},${r2(p1[1])} Z" class="pie p${i % 6}"/>`;
      const am = (a0 + a1) / 2;
      s += txt(cx + r * 0.62 * Math.sin(am), cy - r * 0.62 * Math.cos(am) + 1.2, lab, { size: 3.2 });
    });
    return svg(2 * r + 4, 2 * r + 4, s);
  }

  /* Fraction bar: parts equal sections, `shaded` count (or array of indexes). */
  function fractionBar(o) {
    const W = o.width || 100, H = o.height || 10, w = W / o.parts;
    let s = '';
    const sh = Array.isArray(o.shaded) ? o.shaded : [...Array(o.shaded || 0).keys()];
    for (let i = 0; i < o.parts; i++) s += box(1 + i * w, 1, w, H, sh.includes(i) ? 'shaded' : 'bx');
    return svg(W + 2, H + 2, s);
  }
  /* Fraction circle: parts equal sectors, shaded count */
  function fractionCircle(o) {
    const r = o.r || 14, c = r + 1;
    let s = '';
    for (let i = 0; i < o.parts; i++) {
      const a0 = i / o.parts * 2 * Math.PI, a1 = (i + 1) / o.parts * 2 * Math.PI;
      const p0 = [c + r * Math.sin(a0), c - r * Math.cos(a0)], p1 = [c + r * Math.sin(a1), c - r * Math.cos(a1)];
      s += `<path d="M${c},${c} L${r2(p0[0])},${r2(p0[1])} A${r},${r} 0 0 1 ${r2(p1[0])},${r2(p1[1])} Z" class="${i < (o.shaded || 0) ? 'shaded' : 'bx'}"/>`;
    }
    if (o.parts === 1) s = `<circle cx="${c}" cy="${c}" r="${r}" class="${o.shaded ? 'shaded' : 'bx'}"/>`;
    return svg(2 * c, 2 * c, s);
  }
  /* Shape split into equal parts: rectangle grid rows×cols, shaded count */
  function rectParts(o) {
    const c = o.cell || 9;
    let s = '', k = 0;
    const sh = Array.isArray(o.shaded) ? o.shaded : null;
    for (let y = 0; y < o.rows; y++) for (let x = 0; x < o.cols; x++, k++) s += box(1 + x * c, 1 + y * c, c, c, (sh ? sh.includes(k) : k < (o.shaded || 0)) ? 'shaded' : 'bx');
    return svg(o.cols * c + 2, o.rows * c + 2, s);
  }

  /* Polygon with optional side labels, right-angle marks and equal-side ticks.
   * o = {pts:[[x,y] mm, y down], labels:[text per side i (pts[i]->pts[i+1])], right:[vertex idx], ticks:[count per side],
   *      angles:[{i, text}], cls, scale=1, pad=8}
   */
  function shape(o) {
    const sc = o.scale || 1, pad = o.pad || 12;
    const xs = o.pts.map(p => p[0] * sc), ys = o.pts.map(p => p[1] * sc);
    const minx = Math.min(...xs), miny = Math.min(...ys);
    const P = o.pts.map(p => [p[0] * sc - minx + pad, p[1] * sc - miny + pad]);
    const W = Math.max(...xs) - minx + 2 * pad, H = Math.max(...ys) - miny + 2 * pad;
    const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length;
    let s = poly(P, o.cls || 'shape');
    const n = P.length;
    (o.labels || []).forEach((t, i) => {
      if (t === null || t === undefined || t === '') return;
      const a = P[i], b = P[(i + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const L = Math.hypot(nx, ny); nx /= L; ny /= L;
      if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
      // keep the label clear of the side: wider labels need more room beside a steep side
      const len = String(t).replace(/<[^>]*>/g, '').length, off = 2.2 + Math.abs(nx) * (len * 1.0 + 0.6) + Math.abs(ny) * 2.2;
      s += txt(mx + nx * off, my + ny * off + 1.3, t, { size: 3.6 });
    });
    (o.ticks || []).forEach((k, i) => {
      if (!k) return;
      const a = P[i], b = P[(i + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const dx = (b[0] - a[0]), dy = (b[1] - a[1]), L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      for (let j = 0; j < k; j++) { const off = (j - (k - 1) / 2) * 1.4; s += line(mx + ux * off - uy * 1.6, my + uy * off + ux * 1.6, mx + ux * off + uy * 1.6, my + uy * off - ux * 1.6); }
    });
    (o.right || []).forEach(i => {
      const v = P[i], a = P[(i + n - 1) % n], b = P[(i + 1) % n], k = 3;
      const ua = [(a[0] - v[0]) / Math.hypot(a[0] - v[0], a[1] - v[1]), (a[1] - v[1]) / Math.hypot(a[0] - v[0], a[1] - v[1])];
      const ub = [(b[0] - v[0]) / Math.hypot(b[0] - v[0], b[1] - v[1]), (b[1] - v[1]) / Math.hypot(b[0] - v[0], b[1] - v[1])];
      s += pline([[v[0] + ua[0] * k, v[1] + ua[1] * k], [v[0] + ua[0] * k + ub[0] * k, v[1] + ua[1] * k + ub[1] * k], [v[0] + ub[0] * k, v[1] + ub[1] * k]], 'thin');
    });
    (o.angles || []).forEach(({ i, text, cls }) => {
      const v = P[i], a = P[(i + n - 1) % n], b = P[(i + 1) % n];
      const ang = t => Math.atan2(t[1] - v[1], t[0] - v[0]);
      let a0 = ang(a), a1 = ang(b); let d = a1 - a0; while (d <= -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI;
      const rr = 5, am = a0 + d / 2;
      s += `<path d="M${r2(v[0] + rr * Math.cos(a0))},${r2(v[1] + rr * Math.sin(a0))} A${rr},${rr} 0 0 ${d > 0 ? 1 : 0} ${r2(v[0] + rr * Math.cos(a1))},${r2(v[1] + rr * Math.sin(a1))}" class="thin"/>`;
      s += txt(v[0] + 9 * Math.cos(am), v[1] + 9 * Math.sin(am) + 1.3, text, { size: 3.4, cls: cls || '' });
    });
    (o.vlabels || []).forEach((t, i) => {
      if (!t) return; const v = P[i]; let dx = v[0] - cx, dy = v[1] - cy; const L = Math.hypot(dx, dy) || 1;
      s += txt(v[0] + dx / L * 4, v[1] + dy / L * 4 + 1.3, t, { size: 3.6, bold: true });
    });
    return svg(W, H, s);
  }
  // regular polygon points (mm, y down), radius r, rotation deg
  function regular(n, r, rot = 0) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (rot + i * 360 / n - 90) * Math.PI / 180; pts.push([r + r * Math.cos(a), r + r * Math.sin(a)]); }
    return pts;
  }

  /* Angle: two arms from a vertex. o = {deg, rot=0 (direction of first arm, degrees anticlockwise from east),
   *   len=30, label, arc:true} Printed at true size, so it can be measured with a protractor. */
  function angle(o) {
    const L = o.len || 32, rot = (o.rot || 0) * Math.PI / 180, d = o.deg * Math.PI / 180;
    const pts = [[0, 0], [L * Math.cos(rot), -L * Math.sin(rot)], [L * Math.cos(rot + d), -L * Math.sin(rot + d)]];
    const minx = Math.min(...pts.map(p => p[0])) - 6, miny = Math.min(...pts.map(p => p[1])) - 6;
    const Q = pts.map(p => [p[0] - minx, p[1] - miny]);
    const W = Math.max(...pts.map(p => p[0])) - minx + 6, H = Math.max(...pts.map(p => p[1])) - miny + 6;
    let s = line(...Q[0], ...Q[1], 'arm') + line(...Q[0], ...Q[2], 'arm');
    if (o.arc !== false) {
      const rr = o.deg > 150 ? 6 : 8;
      const p0 = [Q[0][0] + rr * Math.cos(rot), Q[0][1] - rr * Math.sin(rot)], p1 = [Q[0][0] + rr * Math.cos(rot + d), Q[0][1] - rr * Math.sin(rot + d)];
      s += `<path d="M${r2(p0[0])},${r2(p0[1])} A${rr},${rr} 0 ${o.deg > 180 ? 1 : 0} 0 ${r2(p1[0])},${r2(p1[1])}" class="thin"/>`;
      if (o.label) s += txt(Q[0][0] + (rr + 4.5) * Math.cos(rot + d / 2), Q[0][1] - (rr + 4.5) * Math.sin(rot + d / 2) + 1.3, o.label, { size: 3.8 });
    }
    return svg(W, H, s);
  }

  /* Array of dots rows × cols */
  function array(o) {
    const g = o.gap || 6;
    let s = '';
    for (let y = 0; y < o.rows; y++) for (let x = 0; x < o.cols; x++) s += `<circle cx="${4 + x * g}" cy="${4 + y * g}" r="${g * 0.32}" class="${o.cls || 'cnt'}"/>`;
    return svg(o.cols * g + 2, o.rows * g + 2, s);
  }
  /* Groups of objects (e.g. 4 groups of 3 dots in circles) */
  function groups(o) {
    const per = o.per, k = o.groups, cols = Math.ceil(Math.sqrt(per)), rows = Math.ceil(per / cols), g = 4.6;
    const gw = cols * g + 6, gh = rows * g + 6;
    let s = '';
    for (let i = 0; i < k; i++) {
      const ox = 1 + i * (gw + 3);
      s += `<rect x="${ox}" y="1" width="${gw}" height="${gh}" rx="${Math.min(gw, gh) / 2}" class="grp"/>`;
      for (let j = 0; j < per; j++) s += `<circle cx="${r2(ox + 3 + g / 2 + (j % cols) * g)}" cy="${r2(4 + g / 2 + Math.floor(j / cols) * g)}" r="1.5" class="cnt"/>`;
    }
    return svg(k * (gw + 3) + 2, gh + 2, s);
  }

  /* Part-whole model: whole on top, parts below. Values or {a: answer} for an answer box. */
  function partWhole(o, A) {
    const show = A && A.show;
    const parts = o.parts, n = parts.length, W = Math.max(70, n * 30), r = 9;
    const cell = (x, y, v) => {
      if (v && typeof v === 'object' && 'a' in v) return `<circle cx="${x}" cy="${y}" r="${r}" class="bx"/>` + (show ? txt(x, y + 1.4, F.n(v.a), { size: 4, cls: 'ans', bold: true }) : '');
      return `<circle cx="${x}" cy="${y}" r="${r}" class="bx"/>` + txt(x, y + 1.4, typeof v === 'number' ? F.n(v) : v, { size: 4 });
    };
    const wx = W / 2, wy = r + 2;
    let s = '';
    parts.forEach((p, i) => { const px = W / (n + 1) * (i + 1), py = wy + 26; s += line(wx, wy + r, px, py - r); });
    s += cell(wx, wy, o.whole);
    parts.forEach((p, i) => s += cell(W / (n + 1) * (i + 1), wy + 26, p));
    return svg(W, wy + 26 + r + 2, s);
  }

  /* Bar model. o = {whole: value|'?'|{a}, parts:[value|'?'|{a}], widths:[relative], width=120} */
  function barModel(o, A) {
    const show = A && A.show, W = o.width || 120, H = 10;
    const ws = o.widths || o.parts.map(() => 1), tot = ws.reduce((a, b) => a + b, 0);
    const lab = (v) => (v && typeof v === 'object' && 'a' in v) ? (show ? `<tspan class="ans" font-weight="bold">${F.n(v.a)}</tspan>` : '') : (typeof v === 'number' ? F.n(v) : v);
    let s = box(1, 1, W, H) + txt(1 + W / 2, 1 + H / 2 + 1.4, lab(o.whole), { size: 4 });
    let x = 1;
    o.parts.forEach((p, i) => { const w = W * ws[i] / tot; s += box(x, 1 + H + 2, w, H) + txt(x + w / 2, 1 + H + 2 + H / 2 + 1.4, lab(p), { size: 4 }); x += w; });
    return svg(W + 2, 2 * H + 4, s);
  }

  /* Coins and notes. list of pence values. */
  function coins(list) {
    let s = '', x = 1;
    const name = p => p >= 100 ? '£' + (p / 100) : p + 'p';
    for (const p of list) {
      if (p >= 500) { s += `<rect x="${x}" y="2" width="26" height="14" rx="1.5" class="note"/>` + txt(x + 13, 10.5, name(p), { size: 4.2, bold: true }); x += 29; continue; }
      const r = { 1: 4.2, 2: 5.2, 5: 3.8, 10: 5, 20: 4.6, 50: 5.6, 100: 5, 200: 5.8 }[p] || 5;
      const seven = p === 20 || p === 50;
      if (seven) { const pts = []; for (let i = 0; i < 7; i++) { const a = i * 2 * Math.PI / 7 - Math.PI / 2; pts.push([x + r + r * Math.cos(a), 9 + r * Math.sin(a)]); } s += poly(pts, 'coin'); }
      else s += `<circle cx="${x + r}" cy="9" r="${r}" class="coin ${p >= 100 ? 'gold' : ''}"/>`;
      s += txt(x + r, 10.3, name(p), { size: p >= 100 ? 3.2 : 3.3, bold: true });
      x += 2 * r + 3;
    }
    return svg(x, 18, s);
  }

  /* Ruler with an object above it. o = {cm=10, from=0, len (cm, to 0.1), mm:true} */
  function ruler(o, A) {
    const k = 10, cm = o.cm || 10, W = cm * k + 16, x0 = 5;
    let s = '';
    if (o.len !== undefined) s += `<rect x="${x0 + (o.from || 0) * k}" y="3" width="${r2(o.len * k)}" height="5" rx="1" class="obj"/>`;
    s += box(x0 - 3, 10, cm * k + 13, 12, 'rul');
    for (let i = 0; i <= cm * 10; i++) {
      const x = x0 + i, big = i % 10 === 0, mid = i % 5 === 0;
      if (!o.mm && !big && !mid) continue;
      s += line(x, 10, x, 10 + (big ? 4.5 : mid ? 3.2 : 2), 'thin');
      if (big) s += txt(x, 19.5, i / 10, { size: 3 });
    }
    s += txt(x0 + cm * k + 5, 19.5, 'cm', { size: 2.8, anchor: 'start' });
    return svg(W, 24, s);
  }

  /* 3D shapes (line drawings). name: cube, cuboid, cylinder, cone, sphere, sqpyramid, tripyramid, triprism */
  function solid(name, size = 28) {
    const s0 = size;
    let s = '';
    const hid = 'hidden';
    if (name === 'cube' || name === 'cuboid') {
      const w = name === 'cube' ? s0 * 0.7 : s0, h = s0 * 0.7, d = s0 * 0.3;
      const P = [[2, d + 2], [2 + w, d + 2], [2 + w, d + 2 + h], [2, d + 2 + h]];
      s += poly(P, 'solid') + poly([[2, d + 2], [2 + d, 2], [2 + d + w, 2], [2 + w, d + 2]], 'solid') + poly([[2 + w, d + 2], [2 + d + w, 2], [2 + d + w, 2 + h], [2 + w, d + 2 + h]], 'solid');
      s += line(2 + d, 2, 2 + d, 2 + h, hid) + line(2 + d, 2 + h, 2 + d + w, 2 + h, hid) + line(2 + d, 2 + h, 2, d + 2 + h, hid);
      return svg(w + d + 4, h + d + 4, s);
    }
    if (name === 'cylinder') {
      const w = s0 * 0.7, h = s0, e = w * 0.18;
      s += `<ellipse cx="${2 + w / 2}" cy="${2 + e}" rx="${w / 2}" ry="${e}" class="solid"/>` + line(2, 2 + e, 2, 2 + e + h) + line(2 + w, 2 + e, 2 + w, 2 + e + h);
      s += `<path d="M2,${2 + e + h} A${w / 2},${e} 0 0 0 ${2 + w},${2 + e + h}" class="thin"/><path d="M2,${2 + e + h} A${w / 2},${e} 0 0 1 ${2 + w},${2 + e + h}" class="${hid}"/>`;
      return svg(w + 4, h + 2 * e + 4, s);
    }
    if (name === 'cone') {
      const w = s0 * 0.8, h = s0, e = w * 0.16;
      s += line(2 + w / 2, 2, 2, 2 + h) + line(2 + w / 2, 2, 2 + w, 2 + h);
      s += `<path d="M2,${2 + h} A${w / 2},${e} 0 0 0 ${2 + w},${2 + h}" class="thin"/><path d="M2,${2 + h} A${w / 2},${e} 0 0 1 ${2 + w},${2 + h}" class="${hid}"/>`;
      return svg(w + 4, h + e + 4, s);
    }
    if (name === 'sphere') {
      const r = s0 * 0.45;
      s += `<circle cx="${r + 2}" cy="${r + 2}" r="${r}" class="solid"/><path d="M2,${r + 2} A${r},${r * 0.25} 0 0 0 ${2 + 2 * r},${r + 2}" class="thin"/><path d="M2,${r + 2} A${r},${r * 0.25} 0 0 1 ${2 + 2 * r},${r + 2}" class="${hid}"/>`;
      return svg(2 * r + 4, 2 * r + 4, s);
    }
    if (name === 'sqpyramid') {
      const w = s0, h = s0 * 0.9, d = s0 * 0.3, apex = [2 + w / 2 + d / 2, 2];
      const b = [[2, 2 + h], [2 + w, 2 + h], [2 + w + d, 2 + h - d], [2 + d, 2 + h - d]];
      s += pline([b[3], b[0], b[1], b[2]], 'thin') + line(...b[2], ...b[3], hid) + line(...apex, ...b[0]) + line(...apex, ...b[1]) + line(...apex, ...b[2]) + line(...apex, ...b[3], hid);
      return svg(w + d + 4, h + 4, s);
    }
    if (name === 'tripyramid') {
      const w = s0, h = s0 * 0.9, apex = [2 + w * 0.45, 2];
      const b = [[2, 2 + h], [2 + w, 2 + h], [2 + w * 0.62, 2 + h - s0 * 0.25]];
      s += line(...b[0], ...b[1]) + line(...b[1], ...b[2], hid) + line(...b[2], ...b[0], hid) + line(...apex, ...b[0]) + line(...apex, ...b[1]) + line(...apex, ...b[2], hid);
      return svg(w + 4, h + 4, s);
    }
    if (name === 'triprism') {
      const w = s0 * 0.6, h = s0 * 0.55, L = s0 * 0.8, dx = L * 0.75, dy = L * 0.3;
      const f = [[2, 2 + h + dy], [2 + w, 2 + h + dy], [2 + w / 2, 2 + dy]];
      const g = f.map(p => [p[0] + dx, p[1] - dy]);
      s += poly(f, 'solid') + line(...f[1], ...g[1]) + line(...f[2], ...g[2]) + line(...g[1], ...g[2]) + line(...f[0], ...g[0], hid) + line(...g[0], ...g[1], hid) + line(...g[0], ...g[2], hid);
      return svg(w + dx + 4, h + dy + 4, s);
    }
    throw new Error('solid: unknown ' + name);
  }

  // place several figures side by side with captions
  /* Conversion graph: a straight line through 0 (y = x * k).
   * o = {xmax, ymax, xstep, ystep, xminor, yminor, k, xlab, ylab, width, height,
   *      reads:[{x}|{y}] } — each read is drawn (on the scheme only) as red dashed guide lines
   *      from the given axis value to the line and across to the other axis. */
  function convGraph(o, A) {
    const W = o.width || 120, Hc = o.height || 70, left = 16, top = 5, bottom = 15, right = 6;
    const Wc = W - left - right;
    const X = v => left + v / o.xmax * Wc, Y = v => top + Hc - v / o.ymax * Hc;
    let s = '';
    const xm = o.xminor || o.xstep, ym = o.yminor || o.ystep;
    for (let v = 0; v <= o.ymax + 1e-9; v += ym) {
      const maj = Math.abs(v / o.ystep - Math.round(v / o.ystep)) < 1e-9;
      s += line(left, Y(v), left + Wc, Y(v), maj ? 'gl' : 'gl2');
      if (maj) s += txt(left - 1.8, Y(v) + 1.2, F.n(+v.toFixed(6)), { size: 3.2, anchor: 'end' });
    }
    for (let v = 0; v <= o.xmax + 1e-9; v += xm) {
      const maj = Math.abs(v / o.xstep - Math.round(v / o.xstep)) < 1e-9;
      s += line(X(v), top, X(v), top + Hc, maj ? 'gl' : 'gl2');
      if (maj) s += txt(X(v), top + Hc + 4.5, F.n(+v.toFixed(6)), { size: 3.2 });
    }
    s += line(left, top, left, top + Hc, 'axis') + line(left, top + Hc, left + Wc, top + Hc, 'axis');
    const xe = Math.min(o.xmax, o.ymax / o.k);
    s += line(X(0), Y(0), X(xe), Y(xe * o.k), 'graph');
    if (A && A.show) for (const r of (o.reads || [])) {
      const x = r.x !== undefined ? r.x : r.y / o.k, y = x * o.k;
      s += line(X(x), Y(0), X(x), Y(y), 'ansl dash') + line(X(x), Y(y), X(0), Y(y), 'ansl dash');
    }
    if (o.ylab) s += txt(4, top + Hc / 2, o.ylab, { size: 3.4, rot: -90 });
    if (o.xlab) s += txt(left + Wc / 2, top + Hc + 11, o.xlab, { size: 3.4 });
    return svg(W, top + Hc + bottom, s);
  }

  /* Symbol for shape-value puzzles, as inline SVG the size of a digit.
   * kind: 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'diamond' */
  function sym(kind, size = 5) {
    const c = 5, shapes = {
      circle: `<circle cx="5" cy="5" r="4.2" class="symf"/>`,
      square: `<rect x="1" y="1" width="8" height="8" class="symf"/>`,
      triangle: `<polygon points="5,0.7 9.5,9.2 0.5,9.2" class="symf"/>`,
      diamond: `<polygon points="5,0.4 9.6,5 5,9.6 0.4,5" class="symf"/>`,
      star: `<polygon points="${[...Array(10)].map((_, i) => { const r = i % 2 ? 2 : 4.8, a = -Math.PI / 2 + i * Math.PI / 5; return r2(c + r * Math.cos(a)) + ',' + r2(c + 0.3 + r * Math.sin(a)); }).join(' ')}" class="symf"/>`,
      heart: `<path d="M5,9.2 C1,6.2 0.3,4.4 0.8,2.9 C1.5,0.6 4.2,0.5 5,2.6 C5.8,0.5 8.5,0.6 9.2,2.9 C9.7,4.4 9,6.2 5,9.2 Z" class="symf"/>`,
    };
    return `<svg class="symi" viewBox="0 0 10 10" style="width:${size}mm;height:${size}mm">${shapes[kind]}</svg>`;
  }

  /* Model made of unit cubes, drawn on isometric dotty paper.
   * o = {cubes:[[x, y, z], ...] (whole numbers, z up), s (mm per cube edge), dots (true: iso dot paper),
   *      ans:[[x,y,z]] cubes drawn only on the scheme, in red outline} */
  function cubes(o, A) {
    const s = o.s || 7, c = Math.cos(Math.PI / 6) * s, h = s / 2;
    const all = o.cubes.map(p => ({ p, ans: false })).concat(A && A.show ? (o.ans || []).map(p => ({ p, ans: true })) : []);
    const P = (x, y, z) => [(x - y) * c, (x + y) * h - z * s];
    let pts = [];
    for (const { p: [x, y, z] } of all) for (const d of [[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]]) pts.push(P(x + d[0], y + d[1], z + d[2]));
    const pad = 4, minx = Math.min(...pts.map(q => q[0])) - pad, miny = Math.min(...pts.map(q => q[1])) - pad;
    const maxx = Math.max(...pts.map(q => q[0])) + pad, maxy = Math.max(...pts.map(q => q[1])) + pad;
    const Q = (x, y, z) => { const q = P(x, y, z); return [q[0] - minx, q[1] - miny]; };
    let out = '';
    if (o.dots !== false) {
      // isometric dot paper: every cube corner is a lattice point (i*c, j*h) with i + j even
      const i0 = Math.floor(minx / c), i1 = Math.ceil(maxx / c), j0 = Math.floor(miny / h), j1 = Math.ceil(maxy / h);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if ((i + j) % 2) continue;
        const x = i * c - minx, y = j * h - miny;
        if (x >= -0.01 && x <= maxx - minx + 0.01 && y >= -0.01 && y <= maxy - miny + 0.01) out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="0.35" class="dot"/>`;
      }
    }
    const order = all.slice().sort((a, b) => (a.p[0] + a.p[1] + a.p[2]) - (b.p[0] + b.p[1] + b.p[2]) || a.p[2] - b.p[2]);
    for (const { p: [x, y, z], ans } of order) {
      const k = ans ? ' ansc' : '';
      out += poly([Q(x, y, z + 1), Q(x + 1, y, z + 1), Q(x + 1, y + 1, z + 1), Q(x, y + 1, z + 1)], 'ctop' + k);
      out += poly([Q(x + 1, y, z), Q(x + 1, y + 1, z), Q(x + 1, y + 1, z + 1), Q(x + 1, y, z + 1)], 'cright' + k);
      out += poly([Q(x, y + 1, z), Q(x + 1, y + 1, z), Q(x + 1, y + 1, z + 1), Q(x, y + 1, z + 1)], 'cleft' + k);
    }
    return svg(maxx - minx, maxy - miny, out);
  }

  /* Protractor laid over an angle, centre on the vertex. o = {deg, side:'right'|'left', r}
   * side 'right': one arm along the right-hand baseline (read the inner scale, 0 on the right);
   * side 'left': one arm along the left-hand baseline (read the outer scale, 0 on the left). */
  function protractor(o) {
    const R = o.r || 44, cx = R + 12, cy = R + 9, arm = R + 10;
    let s = `<path d="M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy} Z" class="prot"/>`;
    s += `<path d="M${cx - R + 9},${cy} A${R - 9},${R - 9} 0 0 1 ${cx + R - 9},${cy}" class="thin"/>`;
    for (let a = 0; a <= 180; a++) {
      const t = a * Math.PI / 180, L = a % 10 === 0 ? 4 : a % 5 === 0 ? 2.8 : 1.6;
      const co = Math.cos(t), si = Math.sin(t);
      s += line(cx - R * co, cy - R * si, cx - (R - L) * co, cy - (R - L) * si, 'tk1');
      if (a % 10 === 0) {
        s += txt(cx - (R - 6.3) * co, cy - (R - 6.3) * si + 0.9, a, { size: 2.4, rot: a - 90 });          // outer scale, 0 at the left
        s += txt(cx - (R - 11.5) * co, cy - (R - 11.5) * si + 0.9, 180 - a, { size: 2.2, rot: a - 90 });  // inner scale, 0 at the right
      }
    }
    s += line(cx - R, cy, cx + R, cy, 'thin') + `<circle cx="${cx}" cy="${cy}" r="0.8" class="fillk"/>` + line(cx, cy - 3, cx, cy, 'thin');
    // the angle: base arm and turned arm
    const base = o.side === 'left' ? Math.PI : 0, turn = o.side === 'left' ? Math.PI - o.deg * Math.PI / 180 : o.deg * Math.PI / 180;
    s += line(cx, cy, cx + arm * Math.cos(base), cy - arm * Math.sin(base), 'arm2');
    s += line(cx, cy, cx + arm * Math.cos(turn), cy - arm * Math.sin(turn), 'arm2');
    return svg(2 * cx, cy + 4, s);
  }

  /* Price list / menu card (HTML). o = {title, items:[[name, pence]], note} */
  function priceList(o) {
    return `<div class="menu"><div class="mt">${o.title}</div>` + o.items.map(([n, p]) => `<div class="mrw"><span>${n}</span><span class="ld"></span><span>${F.money(p, p < 100 && o.pence !== false)}</span></div>`).join('') + (o.note ? `<div class="mnote">${o.note}</div>` : '') + `</div>`;
  }

  /* Shop receipt (HTML). o = {shop, rows:[[name, qty, pence|{a}]], total: pence|{a}, paid, change: pence|{a}}; {a: pence} = answer box */
  function receipt(o, A) {
    const val = v => v && typeof v === 'object' ? A.blank(F.money(v.a), 18) : F.money(v);
    let s = `<div class="rcpt"><div class="rh">${o.shop}</div>`;
    for (const [n, q, p] of o.rows) s += `<div class="rr"><span>${q > 1 ? q + ' ' + F.times + ' ' : ''}${n}</span><span>${val(p)}</span></div>`;
    s += `<div class="rr rt"><span>Total</span><span>${val(o.total)}</span></div>`;
    if (o.paid !== undefined) s += `<div class="rr"><span>Paid</span><span>${F.money(o.paid)}</span></div><div class="rr"><span>Change</span><span>${val(o.change)}</span></div>`;
    return s + `</div>`;
  }

  /* Digital clock (seven-segment). o = {h, m, mode:'24'|'12', ampm:true (12-hour: show am/pm), ans:true (digits only on the scheme), size}
   * mode '24': 07:05 · mode '12': 7:05 with optional am/pm. */
  function digital(o, A) {
    const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
    const k = (o.size || 1), w = 7 * k, hh = 12 * k, t = 1.25 * k, gap = 2.4 * k;
    const show = !o.ans || (A && A.show), cls = o.ans ? 'segA' : 'seg';
    const h = o.mode === '12' ? ((o.h % 12) || 12) : o.h;
    const hs = o.mode === '12' ? String(h).padStart(2, ' ') : String(h).padStart(2, '0'), ms = String(o.m).padStart(2, '0');
    const digit = (x, y, ch) => {
      if (ch === ' ' || !show) return '';
      const on = SEG[ch], r = [];
      const H = (yy) => `<rect x="${r2(x + t * 0.7)}" y="${r2(yy)}" width="${r2(w - 1.4 * t)}" height="${r2(t)}" rx="${r2(t / 2)}" class="${cls}"/>`;
      const V = (xx, yy) => `<rect x="${r2(xx)}" y="${r2(yy)}" width="${r2(t)}" height="${r2(hh / 2 - t * 0.9)}" rx="${r2(t / 2)}" class="${cls}"/>`;
      if (on.includes('a')) r.push(H(y));
      if (on.includes('g')) r.push(H(y + hh / 2 - t / 2));
      if (on.includes('d')) r.push(H(y + hh - t));
      if (on.includes('f')) r.push(V(x, y + t * 0.55));
      if (on.includes('b')) r.push(V(x + w - t, y + t * 0.55));
      if (on.includes('e')) r.push(V(x, y + hh / 2 + t * 0.35));
      if (on.includes('c')) r.push(V(x + w - t, y + hh / 2 + t * 0.35));
      return r.join('');
    };
    const px = 6 * k, py = 5 * k, colon = 3.6 * k, extra = o.mode === '12' && o.ampm ? 9 * k : 0;
    const W = 2 * px + 4 * w + 2 * gap + colon + gap + extra, Hh = 2 * py + hh;
    let s = `<rect x="0.5" y="0.5" width="${r2(W - 1)}" height="${r2(Hh - 1)}" rx="${r2(2.5 * k)}" class="dclk"/>`;
    s += `<rect x="${r2(px * 0.55)}" y="${r2(py * 0.55)}" width="${r2(W - px * 1.1)}" height="${r2(Hh - py * 1.1)}" rx="${r2(1.2 * k)}" class="dscr"/>`;
    let x = px;
    s += digit(x, py, hs[0]); x += w + gap; s += digit(x, py, hs[1]); x += w + gap * 0.6;
    if (show) s += `<circle cx="${r2(x + colon / 2)}" cy="${r2(py + hh * 0.3)}" r="${r2(t * 0.6)}" class="${cls}"/><circle cx="${r2(x + colon / 2)}" cy="${r2(py + hh * 0.7)}" r="${r2(t * 0.6)}" class="${cls}"/>`;
    x += colon + gap * 0.6;
    s += digit(x, py, ms[0]); x += w + gap; s += digit(x, py, ms[1]); x += w + gap;
    if (extra && show) s += txt(x + 2.5 * k, py + hh - 0.5, o.h < 12 ? 'am' : 'pm', { size: 3.6 * k, bold: true, cls: o.ans ? 'ans' : '' });
    return svg(W, Hh, s);
  }

  /* Calendar page (HTML), weeks start on Monday. o = {year, month (0-11), ring:[days circled], cross:[days crossed]} */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dow = (y, m, d) => (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7;   // 0 = Monday
  function calendar(o) {
    const n = daysIn(o.year, o.month), first = dow(o.year, o.month, 1);
    let s = `<table class="cal"><caption>${MONTHS[o.month]} ${o.year}</caption><tr>${DAYS.map(d => `<th>${d.slice(0, 3)}</th>`).join('')}</tr><tr>`;
    for (let i = 0; i < first; i++) s += '<td></td>';
    for (let d = 1; d <= n; d++) {
      const c = (first + d - 1) % 7;
      if (c === 0 && d > 1) s += '</tr><tr>';
      const cl = (o.ring || []).includes(d) ? ' class="ring"' : (o.cross || []).includes(d) ? ' class="xd"' : '';
      s += `<td${cl}><span>${d}</span></td>`;
    }
    const last = (first + n - 1) % 7;
    for (let i = last + 1; i < 7; i++) s += '<td></td>';
    return s + '</tr></table>';
  }

  /* Venn diagram with two circles inside a box. o = {labels:[a, b], a:[], both:[], b:[], none:[], ans:true (all items are answers)}
   * Items listed per region; when o.ans, the items show only on the scheme, in red. */
  function venn(o, A) {
    const W = 140, H = 70, r = 27, c1 = [50, 38], c2 = [90, 38];
    const show = !o.ans || (A && A.show), cls = o.ans ? 'ans' : '';
    let s = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" class="vbox"/>`;
    s += `<circle cx="${c1[0]}" cy="${c1[1]}" r="${r}" class="vc"/><circle cx="${c2[0]}" cy="${c2[1]}" r="${r}" class="vc"/>`;
    s += txt(c1[0] - 8, 7.5, o.labels[0], { size: 3.5, bold: true }) + txt(c2[0] + 8, 7.5, o.labels[1], { size: 3.5, bold: true });
    const col = (x, items) => {
      const k = items.length, sp = Math.min(7, 40 / Math.max(k, 1));
      return items.map((v, i) => txt(x, 38 + (i - (k - 1) / 2) * sp + 1.4, v, { size: 4.2, cls })).join('');
    };
    if (show) {
      s += col(c1[0] - 13, o.a || []) + col(70, o.both || []) + col(c2[0] + 13, o.b || []);
      const corners = [[10, 60], [130, 60], [10, 14], [130, 14], [70, 66.5]];
      (o.none || []).forEach((v, i) => s += txt(corners[i][0], corners[i][1], v, { size: 4.2, cls }));
    }
    return svg(W, H, s);
  }

  /* Carroll diagram (HTML). o = {cols:[c1, c2], rows:[r1, r2], cells:[[[..],[..]],[[..],[..]]], ans:true} */
  function carroll(o, A) {
    const show = !o.ans || (A && A.show);
    const cell = items => `<td>${show ? items.map(v => o.ans ? `<span class="av">${v}</span>` : v).join(', ') : ''}</td>`;
    return `<table class="qt carroll"><tr><th></th><th>${o.cols[0]}</th><th>${o.cols[1]}</th></tr>` +
      o.rows.map((rw, i) => `<tr><th>${rw}</th>${cell(o.cells[i][0])}${cell(o.cells[i][1])}</tr>`).join('') + `</table>`;
  }

  /* Weighing scales with a round dial (a 300° gauge, min at bottom left, max at bottom right).
   * o = {max, min=0, major, minor, value, unit, fmt, ans:true (pointer only on the scheme: "draw the pointer"), r} */
  function dial(o, A) {
    const r = o.r || 25, min = o.min || 0, cx = r + 9, cy = r + 17, fmt = o.fmt || (v => F.n(v));
    const ang = v => (-150 + 300 * (v - min) / (o.max - min)) * Math.PI / 180;
    const at = (v, rr) => [cx + rr * Math.sin(ang(v)), cy - rr * Math.cos(ang(v))];
    let s = `<rect x="${r2(cx - r - 7)}" y="9" width="${r2(2 * r + 14)}" height="${r2(2 * r + 15)}" rx="5" class="sbody"/>`;
    s += `<rect x="${r2(cx - r - 3)}" y="2" width="${r2(2 * r + 6)}" height="4" rx="1.5" class="sbody"/>` + line(cx, 6, cx, 9, 'thin');
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" class="face"/>`;
    const n = Math.round((o.max - min) / o.minor), per = Math.round(o.major / o.minor);
    for (let i = 0; i <= n; i++) {
      const v = min + i * o.minor, big = i % per === 0, a = at(v, r - 0.6), b = at(v, r - (big ? 4 : 2.4));
      s += line(a[0], a[1], b[0], b[1], big ? 'tk2' : 'tk1');
      if (big) { const t = at(v, r - 7.6); s += txt(t[0], t[1] + 1.1, fmt(+v.toFixed(6)), { size: 3 }); }
    }
    if (o.unit) s += txt(cx, cy + r * 0.55, o.unit, { size: 3.6, bold: true });
    if (!o.ans || (A && A.show)) {
      const p = at(o.value, r - 3.2), cls = o.ans ? 'ansl' : 'hand';
      s += line(cx, cy, p[0], p[1], cls);
    }
    s += `<circle cx="${cx}" cy="${cy}" r="1.3" class="fillk"/>`;
    return svg(2 * cx, cy + r + 8, s);
  }

  function row(items, gap = 8) {
    return `<div class="figrow" style="gap:${gap}mm">` + items.map(it => typeof it === 'string' ? `<div class="fi">${it}</div>` : `<div class="fi">${it.fig}<div class="cap">${it.cap || ''}</div></div>`).join('') + `</div>`;
  }

  return { svg, txt, line, poly, pline, box, numberLine, scale, grid, clock, barChart, lineGraph, pictogram, pie, fractionBar, fractionCircle, rectParts, shape, regular, angle, array, groups, partWhole, barModel, coins, ruler, solid, row, r2, convGraph, sym, cubes, protractor, priceList, receipt, digital, calendar, venn, carroll, dial, MONTHS, DAYS, daysIn, dow };
})();
if (typeof module !== 'undefined') module.exports = RP;
