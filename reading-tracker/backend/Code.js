const SHEET_NAME = 'TrackerData';

// Shared light token (same scheme as shared-sync/sync-script.gs). Token comes
// in the query string, never headers, because clients omit Content-Type on
// these fetches to avoid CORS preflights.
function tokenOK(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!(e && e.parameter && e.parameter.token && e.parameter.token === expected);
}

// Teacher "backdoor" PIN (logo triple-tap on the tracker) — scoped to this
// tool only, deliberately separate from shared-sync's STAFF_PIN. The page is
// already behind Cloudflare Access, so this PIN's job is just to stop a pupil
// on a shared classroom device wandering into edit mode, not to gate access
// on its own. Value lives in this project's own Script Properties.
function checkPin_(e) {
  const want = PropertiesService.getScriptProperties().getProperty('TEACHER_PIN');
  const pin = (e && e.parameter && e.parameter.pin) || '';
  const ok = !!want && pin === want;
  return ContentService.createTextOutput(JSON.stringify({ ok: ok }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!tokenOK(e)) {
    return ContentService.createTextOutput('{"error":"unauthorised"}')
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter && e.parameter.action === 'checkPin') {
    return checkPin_(e);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput('{}').setMimeType(ContentService.MimeType.JSON);
  const data = sheet.getDataRange().getValues();
  const result = {};
  for (const row of data) {
    if (row[0]) result[String(row[0])] = String(row[1]);
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!tokenOK(e)) {
    return ContentService.createTextOutput('{"error":"unauthorised"}')
      .setMimeType(ContentService.MimeType.JSON);
  }
  // Multiple laptops can POST within the same second, so without a lock two
  // concurrent doPost calls could both decide a key is "new" and append
  // duplicate rows for it (doGet then returns whichever duplicate happens
  // to sit lower in the sheet), or one write could simply overwrite the
  // other's. Serializing here closes that gap.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return ContentService.createTextOutput('{"error":"locked, try again"}')
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    const payload = JSON.parse(e.postData.contents);
    // The sheet has ~8000 rows and keeps growing — pulling every row's key
    // AND value into memory (getDataRange().getValues()) just to look up a
    // handful of keys was measured at 10+ seconds per write while holding
    // the lock above, which is most of why syncing felt slow and why a slow
    // write could get starved out by another device's write queued behind
    // the same lock. TextFinder searches column A server-side instead, so a
    // typical write (a handful of keys) no longer pays for the whole
    // sheet's size.
    const lastRow = sheet.getLastRow();
    const keyCol = lastRow > 0 ? sheet.getRange(1, 1, lastRow, 1) : null;
    for (const [key, value] of Object.entries(payload)) {
      const found = keyCol ? keyCol.createTextFinder(key).matchEntireCell(true).matchCase(true).findNext() : null;
      if (found) {
        sheet.getRange(found.getRow(), 2).setValue(value);
      } else {
        sheet.appendRow([key, value]);
      }
    }
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}