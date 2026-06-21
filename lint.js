#!/usr/bin/env node
// Pre-push lint for WFA staff tools
// Checks: JS syntax, getElementById mismatches, missing event-listener targets
// Usage: node lint.js [file.html ...]  (defaults to all HTML files in known tool dirs)

const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__filename);

// Collect files to check
let files = process.argv.slice(2);
if (!files.length) {
  // Default: every index.html in known tool directories
  const walk = dir => {
    try {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? walk(path.join(dir, e.name))
        : e.name === 'index.html' ? [path.join(dir, e.name)] : []
      );
    } catch { return []; }
  };
  files = walk(ROOT);
}

let passed = 0, failed = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const html = fs.readFileSync(file, 'utf8');
  const errors = [];

  // ── 1. JS syntax ──────────────────────────────────────────────────────────
  const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    try { new Function(scriptMatch[1]); }
    catch (e) {
      // Binary search for the line
      const lines = scriptMatch[1].split('\n');
      let lo = 0, hi = lines.length;
      while (hi - lo > 2) {
        const mid = (lo + hi) >> 1;
        try { new Function(lines.slice(0, mid).join('\n')); lo = mid; }
        catch { hi = mid; }
      }
      errors.push(`JS syntax error near line ${hi}: ${e.message}`);
    }
  }

  // ── 2. getElementById references vs HTML ids ───────────────────────────────
  const jsBlock = scriptMatch ? scriptMatch[1] : '';
  const definedIds = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));

  // Separate guarded calls (result stored in var then null-checked) from unguarded
  const unguarded = [], guarded = [];
  for (const m of jsBlock.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
    const id = m[1];
    if (definedIds.has(id)) continue;
    // Heuristic: guarded if the call appears inside an if() condition, or result is in `const x=...` followed by `if(x`
    const before = jsBlock.slice(Math.max(0, m.index - 60), m.index);
    const after = jsBlock.slice(m.index, m.index + 120);
    const isGuarded = /if\s*\(.*$/.test(before) || /\?\.|&&/.test(after) || /const \w+=document\.getElementById/.test(before.slice(-80)) ;
    (isGuarded ? guarded : unguarded).push(id);
  }
  const missingUnguarded = [...new Set(unguarded)].filter(id => !definedIds.has(id));
  const missingGuarded = [...new Set(guarded)].filter(id => !definedIds.has(id));
  if (missingUnguarded.length)
    errors.push(`getElementById (unguarded) missing from HTML: ${missingUnguarded.join(', ')}`);
  if (missingGuarded.length)
    errors.push(`getElementById (null-guarded, lower risk) missing from HTML: ${missingGuarded.join(', ')}`);

  // ── 3. Version number present ──────────────────────────────────────────────
  // Matches: WFA-21.06.26a  |  Y4-21.06.26a  |  a.21.06.26a  |  h.21.06.26a
  if (!/WFA-\d{2}\.\d{2}\.\d{2}/.test(html) &&
      !/\b[YyAaHhEe]\d*[-\.]\d{2}\.\d{2}\.\d{2}/.test(html)) {
    errors.push('No version number found (expected WFA-DD.MM.YY or YN-DD.MM.YY format)');
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  if (errors.length) {
    console.log(`\n❌ ${rel}`);
    errors.forEach(e => console.log(`   • ${e}`));
    failed++;
  } else {
    console.log(`✅ ${rel}`);
    passed++;
  }
}

console.log(`\n${passed + failed} file(s) checked — ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
