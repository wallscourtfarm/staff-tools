// WFA Staff Tools — Shared Sync
// Handles state for multiple tools via a `key` URL parameter, plus a shared
// pupil-roster API (`getPupils`) over the hub planning sheet's Pupils tab.
// GET  ?key=wfa_slt  → returns stored JSON for that tool
// POST ?key=wfa_slt  with JSON body → stores JSON for that tool
// GET  ?action=getPupils&token=…&yeargroup=Y4 → roster rows from hub Pupils tab
//
// Tools using this endpoint:
//   wfa_slt  — SLT Schedule
//   wfa_lc   — Lunch Cover Rota
//   wfa_ll   — Lunchtime Leaders

// hub planning workbook (same sheet all staff tools read via gviz)
const HUB_SHEET_ID = '1XsP5yEGnf8sJyXk8iEXqHEtw-NtCsMUFZLaHW4TWNhw';
const PUPILS_TAB = 'Pupils';

function props() {
  return PropertiesService.getScriptProperties();
}

// Token gate. Token arrives in the query string (not a header) because client
// fetches deliberately omit Content-Type to avoid the Apps Script CORS
// preflight, and bulk-sync client POSTs opaque {key:value} maps. The token is
// a light deterrence against scrapers and accidental overwrites — it ships in
// the public HTML, like the staff PIN, so it is not a strong secret. Set the
// SHARED_TOKEN Script Property to a random value later to raise the bar
// (clients must then be redeployed with the new constant).
function tokenOK(e) {
  const want = props().getProperty('SHARED_TOKEN') || '2013';
  return ((e.parameter || {}).token || '') === want;
}

function doGet(e) {
  try {
    if (!tokenOK(e)) return json({ error: 'unauthorised' });
    const p = e.parameter || {};
    if (p.action === 'getPupils') return json(getPupils(p));
    if (p.action === 'getClasses') return json(getClasses(p));
    if (p.action === 'checkPin') return json(checkPin(p));
    const key = p.key;
    if (!key) return json({ error: 'missing key' });
    const data = props().getProperty(key);
    return ContentService.createTextOutput(data || '{}')
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    if (!tokenOK(e)) return json({ error: 'unauthorised' });
    const p = e.parameter || {};
    if (p.action === 'seedPupils') return seedPupils(e);
    const key = p.key;
    if (!key) return json({ error: 'missing key' });
    props().setProperty(key, e.postData.contents);
    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

// ── Canonical pupil roster ──────────────────────────────────────────────────
//
// Source of truth: the WFA Pupil Tracker master sheet ("pupils" tab), written
// by that app's Import Pupils page from Bromcom CSV exports, keyed by UPN.
// Upload a new Bromcom export there and every tracker sees it immediately —
// nothing else to run. The old hub Pupils tab is kept only as a fallback.
//
// Output shape (per pupil):
//   id        — the UPN (canonical identifier; unique per pupil)
//   upn       — same value, explicit
//   first/last/class/yearGroup/sex
//   eal/pp/fsm/lac — booleans
//   sen       — sen_status ('' when none)
//   source    — 'bromcom' or 'hub' (diagnostics)
//
// Filters: ?yeargroup=Y4 and ?class=4CK.

const MASTER_SHEET_ID = '1NMY0KUGGnReVV-pGPCBp2UIjhc8OylIkGrFTAoiGZqM';
const MASTER_PUPILS_TAB = 'pupils';
const MASTER_CLASSES_TAB = 'classes';

function truthy(val) {
  const s = String(val === true ? 'Y' : val || '').trim().toUpperCase();
  return s === 'Y' || s === 'YES' || s === 'TRUE' || s === '1';
}

function getPupils(p) {
  // Prefer the Bromcom-fed master sheet; fall back to the legacy hub tab.
  try {
    const pupils = readMasterPupils();
    if (pupils.length) return filterPupils(pupils, p, 'bromcom');
  } catch (err) {
    console.warn('master pupils read failed: ' + err.message);
  }
  return filterPupils(readHubPupils(), p, 'hub');
}

function filterPupils(all, p, source) {
  const out = [];
  for (let i = 0; i < all.length; i++) {
    const pupil = all[i];
    if (p.yeargroup && pupil.yearGroup !== p.yeargroup) continue;
    if (p.class && pupil.class !== p.class) continue;
    out.push(Object.assign({}, pupil, { source: source }));
  }
  return { pupils: out };
}

// ── Class mapping (Bromcom code ↔ display name) ────────────────────────────
//
// The "classes" tab of the master sheet is the single source of truth:
//   tutor_group   — the permanent Bromcom tutor-group code (e.g. 5H2)
//   display_name  — the teacher-facing name shown in every tool (e.g. 5IM)
//   academic_year — e.g. 2026-27
//   teacher_initials — current teacher's initials (e.g. IM)
//
// When a teacher changes, edit display_name (+teacher_initials) here and
// every tool follows. Bromcom codes are stable and never need editing.

function readClassMap() {
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sh = ss.getSheetByName(MASTER_CLASSES_TAB);
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return [];
  const hdr = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const ix = function (name) { return hdr.indexOf(name); };
  const map = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const code = String(r[ix('tutor_group')] || '').trim();
    if (!code) continue;
    const display = String(r[ix('display_name')] || '').trim() || code;
    map[code] = {
      code: code,
      display: display,
      teacherInitials: String(r[ix('teacher_initials')] || '').trim(),
      academicYear: String(r[ix('academic_year')] || '').trim()
    };
  }
  return map;
}

function getClasses(p) {
  const year = (p || {}).academic_year || '';
  const map = readClassMap();
  let rows = Object.keys(map).map(function (code) { return map[code]; });
  if (year) rows = rows.filter(function (c) { return c.academicYear === year; });
  return { classes: rows };
}

/** One-off seed: rewrite the classes tab with the 2026-27 Bromcom-code map. */
function seedClassMap() {
  const SEED = [
    ['tutor_group', 'display_name', 'academic_year', 'teacher_initials'],
    ['1B1', '1JS', '2026-27', 'JS'],
    ['1B2', '1ER', '2026-27', 'ER'],
    ['2W1', '2JH', '2026-27', 'JH'],
    ['2W2', '2MY', '2026-27', 'MY'],
    ['3A1', '3JW', '2026-27', 'JW'],
    ['3A2', '3WU', '2026-27', 'WU'],
    ['4M1', '4CC', '2026-27', 'CC'],
    ['4M2', '4RB', '2026-27', 'RB'],
    ['5H1', '5LS', '2026-27', 'LS'],
    ['5H2', '5IM', '2026-27', 'IM'],
    ['6E1', '6JM', '2026-27', 'JM'],
    ['6E2', '6SD', '2026-27', 'SD']
  ];
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sh = ss.getSheetByName(MASTER_CLASSES_TAB) || ss.insertSheet(MASTER_CLASSES_TAB);
  sh.clearContents();
  // Force text format BEFORE writing so '6E1' is not parsed as 6.00E+01
  sh.getRange(1, 1, SEED.length, SEED[0].length).setNumberFormat('@');
  sh.getRange(1, 1, SEED.length, SEED[0].length).setValues(SEED);
  sh.getRange(1, 1, 1, SEED[0].length).setFontWeight('bold');
  return { status: 'ok', rows: SEED.length - 1 };
}

/** One-off: re-key the pupils tab tutor_group from display names to Bromcom
 *  codes (idempotent — rows already carrying real codes are left alone). */
function rekeyPupilsToCodes() {
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sh = ss.getSheetByName(MASTER_PUPILS_TAB);
  if (!sh) throw new Error(MASTER_PUPILS_TAB + ' tab missing from master sheet');
  const map = readClassMap();
  // display name → code
  const byDisplay = {};
  Object.keys(map).forEach(function (code) { byDisplay[map[code].display] = code; });
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) throw new Error('no pupil rows');
  const hdr = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const col = hdr.indexOf('tutor_group') + 1;
  if (!col) throw new Error('tutor_group column missing');
  let changed = 0, unchanged = 0, unmatched = [];
  for (let i = 2; i <= rows.length; i++) {
    const v = String(rows[i - 1][col - 1] || '').trim();
    if (!v) continue;
    if (map[v]) { unchanged++; continue; }          // already a Bromcom code
    if (byDisplay[v]) {                             // display name → code
      sh.getRange(i, col).setNumberFormat('@');
      sh.getRange(i, col).setValue(byDisplay[v]);
      changed++;
    } else {
      unmatched.push(v);
    }
  }
  return { status: 'ok', changed: changed, unchanged: unchanged, unmatched: unmatched };
}

function readMasterPupils() {
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sh = ss.getSheetByName(MASTER_PUPILS_TAB);
  if (!sh) throw new Error(MASTER_PUPILS_TAB + ' tab missing from master sheet');
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return [];
  const hdr = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const ix = function (name) { return hdr.indexOf(name); };
  // Bromcom code → display name (best effort; unmapped codes pass through)
  let cmap = {};
  try {
    const cm = readClassMap();
    Object.keys(cm).forEach(function (code) { cmap[code.toUpperCase()] = cm[code].display; });
  } catch (err) { /* mapping tab missing — serve raw codes */ }
  const display = function (code) {
    code = String(code || '').trim();
    return cmap[code.toUpperCase()] || code;
  };
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const upn = String(r[ix('upn')] || '').trim();
    if (!upn) continue; // import rejects UPN-less rows too
    // status: active | check_leaver | left. Blank (legacy rows) counts as active.
    const status = String(r[ix('status')] || '').trim().toLowerCase();
    if (status && status !== 'active') continue;
    const rawCode = String(r[ix('tutor_group')] || '').trim();
    out.push({
      id: upn,
      upn: upn,
      first: String(r[ix('first_name')] || '').trim(),
      last: String(r[ix('last_name')] || '').trim(),
      code: rawCode,                              // permanent Bromcom code
      class: display(rawCode),                    // teacher-facing display name
      yearGroup: String(r[ix('year_group')] || '').trim(),
      sex: String(r[ix('sex')] || '').trim(),
      eal: truthy(r[ix('is_eal')]),
      pp: truthy(r[ix('is_pp')]),
      fsm: truthy(r[ix('is_fsm')]),
      lac: truthy(r[ix('is_lac')]),
      sen: String(r[ix('sen_status')] || '').trim()
    });
  }
  return out;
}

// Legacy source: hub planning workbook's Pupils tab
// (headers: id, first, last, class, yeargroup, sex, eal, pp, sen).
function readHubPupils() {
  const ss = SpreadsheetApp.openById(HUB_SHEET_ID);
  const sh = ss.getSheetByName(PUPILS_TAB);
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return [];
  const hdr = rows[0].map(function (h) { return String(h).toLowerCase(); });
  const ix = function (name) { return hdr.indexOf(name); };
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[ix('first')] && !r[ix('last')]) continue;
    out.push({
      id: String(r[ix('id')] || ''),
      upn: String(r[ix('id')] || ''),
      first: String(r[ix('first')] || ''),
      last: String(r[ix('last')] || ''),
      class: String(r[ix('class')] || ''),
      yearGroup: String(r[ix('yeargroup')] || ''),
      sex: String(r[ix('sex')] || ''),
      eal: truthy(r[ix('eal')]),
      pp: truthy(r[ix('pp')]),
      fsm: false,
      lac: false,
      sen: String(r[ix('sen')] || '')
    });
  }
  return out;
}

function seedPupils(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const pupils = body.pupils || [];
    const ss = SpreadsheetApp.openById(HUB_SHEET_ID);
    let sh = ss.getSheetByName(PUPILS_TAB);
    if (!sh) sh = ss.insertSheet(PUPILS_TAB);
    const rows = [
      ['id', 'first', 'last', 'class', 'yeargroup', 'sex', 'eal', 'pp', 'sen']
    ];
    pupils.forEach(function (p) {
      rows.push([
        p.id || '', p.first || '', p.last || '',
        p.class || '', p.yearGroup || p.yeargroup || '',
        p.sex || '', p.eal ? 'Y' : 'N', p.pp ? 'Y' : 'N',
        p.sen || ''
      ]);
    });
    sh.clearContents();
    sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
    return json({ status: 'ok', count: pupils.length });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

// One staff PIN for all tools. Set the STAFF_PIN Script Property to change it
// everywhere at once (client fallback is '2013' while offline). Light check —
// the shared token above is the real gate; this exists so staff PINs can be
// rotated in one place instead of per-tool.
function checkPin(p) {
  const want = props().getProperty('STAFF_PIN') || '2013';
  return { ok: ((p || {}).pin || '') === want };
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
