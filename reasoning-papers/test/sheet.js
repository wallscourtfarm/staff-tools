#!/usr/bin/env node
/* Make test/sheet.html: every generator (or those whose id starts with the prefix given), two
 * versions each, paper on the left and mark scheme on the right, for checking by eye.
 *   node test/sheet.js Y4_     then open test/sheet-Y4.html (served from the staff-tools folder) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.RP = require(path.join(ROOT, 'src/engine.js'));
require(path.join(ROOT, 'src/draw.js'));
const genDir = path.join(ROOT, 'src/gens');
for (const f of fs.readdirSync(genDir).filter(f => f.endsWith('.js')).sort()) require(path.join(genDir, f));
const prefix = process.argv[2] || '';
const css = fs.readFileSync(path.join(ROOT, 'src/app.css'), 'utf8');
let h = `<!DOCTYPE html><meta charset="utf-8"><title>Generator sheet</title><style>${css}
body{overflow:auto;background:#e9eef2;font-family:Arial} .pair{display:flex;gap:6mm;margin:4mm} .pair .page{height:auto;padding:4mm 8mm;width:200mm}
h3{margin:8mm 4mm 0;font-family:Nunito}</style><body>`;
for (const g of RP.gens.filter(g => g.id.startsWith(prefix))) {
  for (const s of [11, 29]) {
    let q; try { q = RP.make(g, s); } catch (e) { h += `<h3>${g.id} ERROR ${e.message}</h3>`; continue; }
    const one = show => `<div class="page"><div class="q"><div class="qn">${s === 11 ? 1 : 2}</div><div class="qb">${q.html(show)}</div><div class="qm">${q.marks} mark${q.marks > 1 ? 's' : ''}</div>${show ? `<div class="guide">Answer: <b>${q.answer}</b> ${q.guide || ''}</div>` : ''}</div></div>`;
    h += `<h3>${g.id} (level ${g.level}) seed ${s}</h3><div class="pair">${one(false)}${one(true)}</div>`;
  }
}
const out = 'sheet-' + (prefix.replace(/[^A-Za-z0-9]/g, '') || 'all') + '.html';
fs.writeFileSync(path.join(__dirname, out), h + '</body>');
console.log('test/' + out + ' written');
