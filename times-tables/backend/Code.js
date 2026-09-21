// ============================================================
// WFA Times Tables — MTC Results Backend
// ============================================================
// Stores per-child results from the Multiplication Tables Check (MTC)
// practice test in times-tables/index.html's "Teacher mode", so results
// survive a shared iPad being handed to the next child.
// Deploy as Web App: Execute as Me, Anyone can access (anonymous).
// Script is bound to its own spreadsheet — SPREADSHEET_ID left blank.
// ============================================================

const SPREADSHEET_ID = ''; // blank = use active/bound spreadsheet
const SHEET_NAME = 'Results';
const HEADERS = ['timestamp', 'child_name', 'score', 'total', 'percent', 'answers_json', 'year_group'];

function tokenOK(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN');
  return !!expected && !!((e || {}).parameter || {}).token && e.parameter.token === expected;
}

function sheet_() {
  const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function denied_() {
  return json_({ error: 'unauthorised' });
}

function doPost(e) {
  if (!tokenOK(e)) return denied_();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.childName || typeof data.score !== 'number' || typeof data.total !== 'number') {
      return json_({ error: 'missing required fields' });
    }

    const sh = sheet_();
    const percent = data.total > 0 ? Math.round((data.score / data.total) * 100) : 0;
    sh.appendRow([
      new Date().toISOString(),
      String(data.childName).trim().slice(0, 100),
      data.score,
      data.total,
      percent,
      JSON.stringify(data.answers || []),
      String(data.yearGroup || '').trim().slice(0, 20)
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (!tokenOK(e)) return denied_();

  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    try { obj.answers_json = JSON.parse(obj.answers_json || '[]'); } catch (err) { obj.answers_json = []; }
    return obj;
  });
  rows.reverse(); // most recent first

  return json_({ ok: true, results: rows });
}
