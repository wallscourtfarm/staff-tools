// ============================================================
// WFA Writing Tracker — Apps Script Backend
// ============================================================
// Deploy as Web App: Execute as Me, Anyone can access.
// If the script is bound to the spreadsheet, leave SPREADSHEET_ID blank.
// If standalone, paste the Sheet ID below.
// ============================================================

const SPREADSHEET_ID = ''; // blank = use active/bound spreadsheet

const SHEET_HEADERS = {
  classes:     ['class_id','year_group','class_name','teacher_name','academic_year','active'],
  pupils:      ['pupil_id','name','year_group','class_id','working_at_level','active','added_date','notes',
                 'admission_no','upn','sex','pp','sen','eal'],
  assessments: ['assess_id','pupil_id','skill_id','academic_year','term','score','assessed_date','assessed_by'],
  config:      ['key','value']
};

// ── Entry points ──────────────────────────────────────────────

// Shared light token (same scheme as shared-sync/sync-script.gs). Token comes
// in the query string, never headers, because the client omits Content-Type on
// POSTs to avoid the Apps Script CORS preflight.
function tokenOK(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!((e || {}).parameter || {}).token &&
    e.parameter.token === expected;
}

function denied_() {
  return json_({ error: 'unauthorised' });
}

function doGet(e) {
  try {
    if (!tokenOK(e)) return denied_();
    initSheets_();
    return json_(handleGet_(e.parameter || {}));
  } catch (err) {
    return json_({ error: err.message });
  }
}

function doPost(e) {
  try {
    if (!tokenOK(e)) return denied_();
    initSheets_();
    const data = JSON.parse(e.postData.contents);
    return json_(handlePost_(data));
  } catch (err) {
    return json_({ error: err.message });
  }
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Routing ───────────────────────────────────────────────────

function handleGet_(p) {
  switch (p.action) {
    case 'getClasses':      return getClasses_(p);
    case 'getPupils':       return getPupils_(p);
    case 'getAssessments':  return getAssessments_(p);
    case 'getPupilHistory': return getPupilHistory_(p);
    case 'getConfig':       return getConfig_();
    case 'ping':            return { ok: true, ts: new Date().toISOString() };
    default:                return { error: 'Unknown GET action: ' + p.action };
  }
}

function handlePost_(d) {
  switch (d.action) {
    case 'saveScore':   return saveScore_(d);
    case 'saveScores':  return saveScores_(d);
    case 'addPupil':    return addPupil_(d);
    case 'updatePupil': return updatePupil_(d);
    case 'addClass':    return addClass_(d);
    case 'updateClass': return updateClass_(d);
    case 'setConfig':   return setConfig_(d);
    default:            return { error: 'Unknown POST action: ' + d.action };
  }
}

// ── Sheet helpers ─────────────────────────────────────────────

function ss_() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function initSheets_() {
  const spreadsheet = ss_();
  for (const [name, headers] of Object.entries(SHEET_HEADERS)) {
    const existing = spreadsheet.getSheetByName(name);
    if (!existing) {
      const sh = spreadsheet.insertSheet(name);
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    } else {
      ensureColumns_(existing, headers);
    }
  }
  // Force class_name column to plain text so values like "6E1" aren't auto-converted to 60.
  const classesSheet = spreadsheet.getSheetByName('classes');
  if (classesSheet && classesSheet.getLastRow() > 0) {
    const classNameCol = SHEET_HEADERS.classes.indexOf('class_name') + 1;
    classesSheet.getRange(2, classNameCol, classesSheet.getMaxRows() - 1, 1).setNumberFormat('@');
  }
  // Seed default config if empty
  const cfg = spreadsheet.getSheetByName('config');
  if (cfg.getLastRow() < 2) {
    cfg.appendRow(['academic_year', '2025-26']);
  }
}

// Adds any missing columns to an existing sheet without disturbing existing data.
function ensureColumns_(sheet, expectedHeaders) {
  const lastCol = sheet.getLastColumn();
  const actual = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const missing = expectedHeaders.filter(h => !actual.includes(h));
  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

function sheetData_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];
  return vals.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRow_(name, matchFn) {
  const sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return null;
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];
  for (let i = 1; i < vals.length; i++) {
    const obj = {};
    headers.forEach((h, j) => { obj[h] = vals[i][j]; });
    if (matchFn(obj)) return { rowNum: i + 1, data: obj, sheet: sh, headers };
  }
  return null;
}

function truthy_(v) {
  return v !== false && v !== 'FALSE' && v !== 'false' && v !== '';
}

// ── Classes ───────────────────────────────────────────────────

function getClasses_(p) {
  const year = p.academic_year || getConfig_().academic_year;
  return sheetData_('classes')
    .filter(c => truthy_(c.active))
    .filter(c => !year || c.academic_year === year);
}

function addClass_(d) {
  const sh = ss_().getSheetByName('classes');
  const id = Utilities.getUuid().substring(0, 8);
  const nextRow = sh.getLastRow() + 1;
  const classNameCol = SHEET_HEADERS.classes.indexOf('class_name') + 1;
  // Set text format before writing to prevent scientific notation auto-conversion (e.g. "6E1" → 60)
  sh.getRange(nextRow, classNameCol).setNumberFormat('@');
  sh.getRange(nextRow, 1, 1, SHEET_HEADERS.classes.length)
    .setValues([[id, d.year_group, d.class_name, d.teacher_name || '', d.academic_year, true]]);
  return { success: true, class_id: id };
}

function updateClass_(d) {
  const found = findRow_('classes', r => r.class_id === d.class_id);
  if (!found) return { error: 'Class not found' };
  const { rowNum, sheet, headers } = found;
  ['class_name','teacher_name','active'].forEach(f => {
    if (d[f] !== undefined) {
      const cell = sheet.getRange(rowNum, headers.indexOf(f) + 1);
      if (f === 'class_name') cell.setNumberFormat('@');
      cell.setValue(d[f]);
    }
  });
  return { success: true };
}

// ── Pupils ────────────────────────────────────────────────────

function getPupils_(p) {
  let pupils = sheetData_('pupils').filter(r => truthy_(r.active));
  if (p.class_id) pupils = pupils.filter(r => r.class_id === p.class_id);
  return pupils.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

// Builds a row aligned to the actual sheet headers, so new columns
// can be added without breaking existing rows.
function buildPupilRow_(sh, id, d) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return headers.map(h => {
    switch (h) {
      case 'pupil_id':        return id;
      case 'name':            return d.name || '';
      case 'year_group':      return d.year_group || '';
      case 'class_id':        return d.class_id || '';
      case 'working_at_level':return d.working_at_level || d.year_group || '';
      case 'active':          return true;
      case 'added_date':      return new Date().toISOString();
      case 'notes':           return d.notes || '';
      case 'admission_no':    return d.admission_no || '';
      case 'upn':             return d.upn || '';
      case 'sex':             return d.sex || '';
      case 'pp':              return d.pp || '';
      case 'sen':             return d.sen || '';
      case 'eal':             return d.eal || '';
      default:                return '';
    }
  });
}

function addPupil_(d) {
  const sh = ss_().getSheetByName('pupils');
  const id = Utilities.getUuid().substring(0, 8);
  sh.appendRow(buildPupilRow_(sh, id, d));
  return { success: true, pupil_id: id };
}

function updatePupil_(d) {
  const found = findRow_('pupils', r => r.pupil_id === d.pupil_id);
  if (!found) return { error: 'Pupil not found' };
  const { rowNum, sheet, headers } = found;
  ['name','class_id','working_at_level','active','notes','year_group',
   'admission_no','upn','sex','pp','sen','eal'].forEach(f => {
    if (d[f] !== undefined) {
      const col = headers.indexOf(f);
      if (col >= 0) sheet.getRange(rowNum, col + 1).setValue(d[f]);
    }
  });
  return { success: true };
}

// ── Assessments ───────────────────────────────────────────────

function getAssessments_(p) {
  const pupils = getPupils_({ class_id: p.class_id });
  const pupilIds = new Set(pupils.map(r => r.pupil_id));
  const year = p.academic_year || getConfig_().academic_year;

  // Build flat map: {pupil_id: {skill_id: score}} — last row per (pupil, skill) wins
  const assessments = {};
  for (const a of sheetData_('assessments')) {
    if (!pupilIds.has(a.pupil_id) || a.academic_year !== year) continue;
    if (!assessments[a.pupil_id]) assessments[a.pupil_id] = {};
    assessments[a.pupil_id][a.skill_id] = String(a.score);
  }

  return { pupils, assessments };
}

function getPupilHistory_(p) {
  const pupilId = p.pupil_id;
  const rows = sheetData_('assessments').filter(a => a.pupil_id === pupilId);

  // Group: {academic_year: {skill_id: score}} — last row per (year, skill) wins
  const history = {};
  for (const a of rows) {
    if (!history[a.academic_year]) history[a.academic_year] = {};
    history[a.academic_year][a.skill_id] = String(a.score);
  }

  const pupil = sheetData_('pupils').find(r => r.pupil_id === pupilId) || null;
  return { pupil, history };
}

// ── Score saving ──────────────────────────────────────────────

function saveScore_(d) {
  upsert_(d.pupil_id, d.skill_id, d.academic_year, d.score, d.assessed_by || '');
  return { success: true };
}

function saveScores_(d) {
  // Batch upsert — load all rows once, build index, then update or append.
  const { scores, assessed_by } = d;
  const sh = ss_().getSheetByName('assessments');
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];

  const col = name => headers.indexOf(name); // returns 0-based index

  // Build index keyed by pupil+skill+year — last row per key wins (overwrites earlier terms)
  const idx = {}; // compositeKey -> 1-based row number
  for (let i = 1; i < vals.length; i++) {
    const key = `${vals[i][col('pupil_id')]}|${vals[i][col('skill_id')]}|${vals[i][col('academic_year')]}`;
    idx[key] = i + 1;
  }

  const now = new Date().toISOString();
  const toAppend = [];
  let updated = 0;

  for (const s of scores) {
    const key = `${s.pupil_id}|${s.skill_id}|${s.academic_year}`;
    if (idx[key]) {
      sh.getRange(idx[key], col('score') + 1).setValue(s.score);
      sh.getRange(idx[key], col('assessed_date') + 1).setValue(now);
      if (assessed_by) sh.getRange(idx[key], col('assessed_by') + 1).setValue(assessed_by);
      updated++;
    } else {
      toAppend.push([Utilities.getUuid().substring(0,8), s.pupil_id, s.skill_id, s.academic_year, '', s.score, now, assessed_by || '']);
    }
  }

  if (toAppend.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, headers.length).setValues(toAppend);
  }

  return { success: true, updated, inserted: toAppend.length };
}

function upsert_(pupil_id, skill_id, academic_year, score, assessed_by) {
  const sh = ss_().getSheetByName('assessments');
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];
  const col = name => headers.indexOf(name);
  const now = new Date().toISOString();

  // Scan from bottom so we find the most-recently inserted row for this (pupil, skill, year)
  for (let i = vals.length - 1; i >= 1; i--) {
    if (vals[i][col('pupil_id')] === pupil_id &&
        vals[i][col('skill_id')] === skill_id &&
        vals[i][col('academic_year')] === academic_year) {
      sh.getRange(i + 1, col('score') + 1).setValue(score);
      sh.getRange(i + 1, col('assessed_date') + 1).setValue(now);
      if (assessed_by) sh.getRange(i + 1, col('assessed_by') + 1).setValue(assessed_by);
      return;
    }
  }

  sh.appendRow([Utilities.getUuid().substring(0,8), pupil_id, skill_id, academic_year, '', score, now, assessed_by || '']);
}

// ── Config ────────────────────────────────────────────────────

function getConfig_() {
  const cfg = {};
  sheetData_('config').forEach(r => { cfg[r.key] = r.value; });
  return cfg;
}

function setConfig_(d) {
  const found = findRow_('config', r => r.key === d.key);
  if (found) {
    found.sheet.getRange(found.rowNum, found.headers.indexOf('value') + 1).setValue(d.value);
  } else {
    ss_().getSheetByName('config').appendRow([d.key, d.value]);
  }
  return { success: true };
}