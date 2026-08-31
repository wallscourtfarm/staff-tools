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
    if (p.action === 'importPupils') return importPupils(e);
    if (p.action === 'updateClasses') return updateClasses(e);
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

// POST ?action=updateClasses&token=… with a raw JSON body:
//   { classes: [{ code, display, teacher_initials }] }
// Sets display_name/teacher_initials for EXISTING tutor_group codes only —
// never creates or deletes a row. Codes are permanent Bromcom identifiers
// and only ever enter this tab via importPupils (a fresh code seen in an
// import); this action just renames how a known code is shown.
function updateClasses(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  const incoming = body.classes || [];
  if (!incoming.length) return json({ status: 'error', message: 'classes array is empty' });

  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sh = ss.getSheetByName(MASTER_CLASSES_TAB);
  if (!sh) return json({ status: 'error', message: MASTER_CLASSES_TAB + ' tab missing' });

  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return json({ status: 'error', message: 'no class rows to update' });
  const hdr = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const ix = function (name) { return hdr.indexOf(name); };
  const codeIx = ix('tutor_group'), dispIx = ix('display_name'), tiIx = ix('teacher_initials');
  if (codeIx < 0) return json({ status: 'error', message: 'tutor_group column missing' });

  const rowByCode = {};
  for (let i = 1; i < rows.length; i++) {
    const code = String(rows[i][codeIx] || '').trim();
    if (code) rowByCode[code] = i;
  }

  let updated = 0, unknownCodes = [];
  incoming.forEach(function (c) {
    const code = String(c.code || '').trim();
    if (!code || !rowByCode.hasOwnProperty(code)) { if (code) unknownCodes.push(code); return; }
    const i = rowByCode[code];
    const newDisplay = String(c.display || '').trim() || code;
    const newTi = String(c.teacher_initials || '').trim();
    const changed = String(rows[i][dispIx] || '') !== newDisplay ||
      (tiIx >= 0 && String(rows[i][tiIx] || '') !== newTi);
    if (!changed) return;
    const range = sh.getRange(i + 1, 1, 1, hdr.length);
    range.setNumberFormat('@');
    const rowVals = rows[i].slice();
    rowVals[dispIx] = newDisplay;
    if (tiIx >= 0) rowVals[tiIx] = newTi;
    range.setValues([rowVals]);
    updated++;
  });

  return json({ status: 'ok', updated: updated, unknownCodes: unknownCodes });
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
      sen: String(r[ix('sen_status')] || '').trim(),
      senType: String(r[ix('sen_type')] || '').trim(),
      serviceChild: truthy(r[ix('is_service_child')]),
      disadvantaged: truthy(r[ix('is_disadvantaged')])
    });
  }
  return out;
}

// ── Bromcom import (single front door — see roster-import tool) ───────────
//
// POST ?action=importPupils&token=… with a raw JSON body (no Content-Type):
//   { pupils: [{upn, first_name, last_name, year_group, tutor_group, sex,
//               is_pp, is_fsm, is_sen, sen_status, sen_type, is_lac, is_eal,
//               is_service_child, is_disadvantaged, status}],
//     classes: [{code, display, academic_year}] }
//
// Upserts by UPN into MASTER_PUPILS_TAB / MASTER_CLASSES_TAB of this same
// spreadsheet (the one the WFA Pupil Tracker's own Attainment tabs live in,
// and the one every getPupils/getClasses caller already reads live — so
// nothing downstream needs to change to see a new import).
//
// Never touches clf_vul / wfa_vul / target — those are maintained separately
// in the Tracker's own Setup screen and must survive every Bromcom import.
// Never deletes a row. A pupil missing from the payload entirely is left
// untouched and counted in notInPayload; only an explicit status:'left' row
// marks a leaver. Safety valve: aborts (writes nothing) if the payload's
// active-pupil count is under 80% of the sheet's current active count —
// guards against a partial/corrupt export being applied by accident.

const PROTECTED_PUPIL_COLUMNS = ['clf_vul', 'wfa_vul', 'target'];
const PUPIL_TEXT_COLUMNS = ['upn', 'tutor_group', 'year_group'];

function _today() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _boolStr(v) {
  return (v === true || v === 'True' || v === 'true') ? 'True' : 'False';
}

function _currentAcademicYear() {
  const d = new Date();
  const y = d.getFullYear();
  // UK school year rolls over in September
  const startYear = d.getMonth() >= 8 ? y : y - 1;
  return startYear + '-' + String(startYear + 1).slice(2);
}

function importPupils(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  const incoming = body.pupils || [];
  const incomingClasses = body.classes || [];

  if (!incoming.length) {
    return json({ status: 'error', message: 'pupils array is empty' });
  }

  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sh = ss.getSheetByName(MASTER_PUPILS_TAB);
  if (!sh) return json({ status: 'error', message: MASTER_PUPILS_TAB + ' tab missing' });

  const allRows = sh.getDataRange().getValues();
  const hdr = allRows[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const ix = function (name) { return hdr.indexOf(name); };
  const upnIx = ix('upn');
  const statusIx = ix('status');
  if (upnIx < 0) return json({ status: 'error', message: 'upn column missing' });

  // ── Validate + safety valve (before any writes) ──────────────────────────
  let rejectedNoUpn = 0;
  const clean = [];
  incoming.forEach(function (p) {
    const upn = String(p.upn || '').trim();
    if (!upn) { rejectedNoUpn++; return; }
    clean.push(Object.assign({}, p, { upn: upn }));
  });

  const payloadActiveCount = clean.filter(function (p) {
    return String(p.status || 'active').trim().toLowerCase() !== 'left';
  }).length;

  let existingActiveCount = 0;
  const existingByUpn = {};
  for (let i = 1; i < allRows.length; i++) {
    const upn = String(allRows[i][upnIx] || '').trim();
    if (!upn) continue;
    existingByUpn[upn] = i; // row index into allRows (0-based; sheet row = i+1)
    const status = String(allRows[i][statusIx] || '').trim().toLowerCase();
    if (!status || status === 'active') existingActiveCount++;
  }

  if (existingActiveCount > 0 && payloadActiveCount < 0.8 * existingActiveCount) {
    return json({
      status: 'aborted',
      reason: 'payload active count (' + payloadActiveCount + ') is under 80% of ' +
        'current active count (' + existingActiveCount + ') — looks like a partial export',
      safetyValve: true
    });
  }

  // ── Compute changes ───────────────────────────────────────────────────────
  const MUTABLE = [
    'first_name', 'last_name', 'year_group', 'tutor_group', 'sex',
    'is_pp', 'is_fsm', 'is_sen', 'sen_status', 'sen_type',
    'is_lac', 'is_eal', 'is_service_child', 'is_disadvantaged', 'status'
  ];
  const BOOL_FIELDS = ['is_pp', 'is_fsm', 'is_sen', 'is_lac', 'is_eal',
    'is_service_child', 'is_disadvantaged'];

  const today = _today();
  const seenUpns = {};
  let added = 0, updated = 0, unchanged = 0, leftMarked = 0;
  const rowUpdates = []; // {rowIndex0, values}
  const newRows = [];

  clean.forEach(function (p) {
    seenUpns[p.upn] = true;
    const wasStatus = existingByUpn.hasOwnProperty(p.upn)
      ? String(allRows[existingByUpn[p.upn]][statusIx] || '').trim().toLowerCase()
      : null;

    if (existingByUpn.hasOwnProperty(p.upn)) {
      const rowIx = existingByUpn[p.upn];
      const existingRow = allRows[rowIx];
      const newRow = existingRow.slice();
      let changed = false;
      MUTABLE.forEach(function (field) {
        const col = ix(field);
        if (col < 0) return;
        let val = p[field];
        if (BOOL_FIELDS.indexOf(field) >= 0) val = _boolStr(val);
        else if (field === 'status') val = String(val || 'active').trim().toLowerCase();
        else val = String(val === undefined || val === null ? '' : val).trim();
        if (String(existingRow[col]) !== val) changed = true;
        newRow[col] = val;
      });
      if (changed) {
        const duIx = ix('date_updated');
        const lsIx = ix('last_seen_in_import');
        if (duIx >= 0) newRow[duIx] = today;
        if (lsIx >= 0) newRow[lsIx] = today;
        rowUpdates.push({ rowIndex0: rowIx, values: newRow });
        const newStatus = String(p.status || 'active').trim().toLowerCase();
        if (newStatus === 'left' && wasStatus !== 'left') leftMarked++;
        else updated++;
      } else {
        unchanged++;
      }
    } else {
      const newRow = hdr.map(function () { return ''; });
      MUTABLE.forEach(function (field) {
        const col = ix(field);
        if (col < 0) return;
        let val = p[field];
        if (BOOL_FIELDS.indexOf(field) >= 0) val = _boolStr(val);
        else if (field === 'status') val = String(val || 'active').trim().toLowerCase();
        else val = String(val === undefined || val === null ? '' : val).trim();
        newRow[col] = val;
      });
      const upIx = ix('upn'); if (upIx >= 0) newRow[upIx] = p.upn;
      const daIx = ix('date_added'); if (daIx >= 0) newRow[daIx] = today;
      const duIx2 = ix('date_updated'); if (duIx2 >= 0) newRow[duIx2] = today;
      const lsIx2 = ix('last_seen_in_import'); if (lsIx2 >= 0) newRow[lsIx2] = today;
      newRows.push(newRow);
      added++;
    }
  });

  // Pupils in the sheet as active but absent from this payload entirely —
  // report only, never touch (flag-don't-delete).
  let notInPayload = 0;
  Object.keys(existingByUpn).forEach(function (upn) {
    if (seenUpns[upn]) return;
    const status = String(allRows[existingByUpn[upn]][statusIx] || '').trim().toLowerCase();
    if (!status || status === 'active') notInPayload++;
  });

  // ── Write phase ────────────────────────────────────────────────────────
  rowUpdates.forEach(function (u) {
    const range = sh.getRange(u.rowIndex0 + 1, 1, 1, hdr.length);
    range.setNumberFormat('@');
    range.setValues([u.values]);
  });
  if (newRows.length) {
    const startRow = sh.getLastRow() + 1;
    const range = sh.getRange(startRow, 1, newRows.length, hdr.length);
    range.setNumberFormat('@');
    range.setValues(newRows);
  }

  // ── Classes upsert — insert brand-new codes only, never touch existing ──
  let classesAdded = 0;
  if (incomingClasses.length) {
    const csh = ss.getSheetByName(MASTER_CLASSES_TAB);
    if (csh) {
      const crows = csh.getDataRange().getValues();
      const chdr = crows[0].map(function (h) { return String(h).trim().toLowerCase(); });
      const cix = function (name) { return chdr.indexOf(name); };
      const knownCodes = {};
      for (let i = 1; i < crows.length; i++) {
        const code = String(crows[i][cix('tutor_group')] || '').trim();
        if (code) knownCodes[code] = true;
      }
      const newClassRows = [];
      incomingClasses.forEach(function (c) {
        const code = String(c.code || '').trim();
        if (!code || knownCodes[code]) return;
        knownCodes[code] = true;
        const row = chdr.map(function () { return ''; });
        const tgIx = cix('tutor_group'); if (tgIx >= 0) row[tgIx] = code;
        const dnIx = cix('display_name'); if (dnIx >= 0) row[dnIx] = c.display || code;
        const ayIx = cix('academic_year'); if (ayIx >= 0) row[ayIx] = c.academic_year || _currentAcademicYear();
        newClassRows.push(row);
      });
      if (newClassRows.length) {
        const startRow = csh.getLastRow() + 1;
        const range = csh.getRange(startRow, 1, newClassRows.length, chdr.length);
        range.setNumberFormat('@');
        range.setValues(newClassRows);
        classesAdded = newClassRows.length;
      }
    }
  }

  return json({
    status: 'ok',
    added: added,
    updated: updated,
    leftMarked: leftMarked,
    unchanged: unchanged,
    notInPayload: notInPayload,
    rejectedNoUpn: rejectedNoUpn,
    classesAdded: classesAdded,
    safetyValve: false
  });
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
