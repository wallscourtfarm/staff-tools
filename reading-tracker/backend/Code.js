const SHEET_NAME = 'TrackerData';

// Shared light token (same scheme as shared-sync/sync-script.gs). Token comes
// in the query string, never headers, because clients omit Content-Type on
// these fetches to avoid CORS preflights.
function tokenOK(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!(e && e.parameter && e.parameter.token && e.parameter.token === expected);
}

function doGet(e) {
  if (!tokenOK(e)) {
    return ContentService.createTextOutput('{"error":"unauthorised"}')
      .setMimeType(ContentService.MimeType.JSON);
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
  // Multiple laptops can POST within the same second, and this sheet is now
  // large enough that a read-modify-write cycle (read all rows, look up or
  // append) takes several seconds — without a lock, two concurrent doPost
  // calls both read the sheet before either has written, so they can both
  // decide a key is "new" and append duplicate rows for it (doGet then
  // returns whichever duplicate happens to sit lower in the sheet), or one
  // write can simply overwrite the other's. Serializing here closes that gap.
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
    const data = sheet.getLastRow() > 0 ? sheet.getDataRange().getValues() : [];
    const rowMap = {};
    for (let i = 0; i < data.length; i++) {
      if (data[i][0]) rowMap[String(data[i][0])] = i + 1;
    }
    for (const [key, value] of Object.entries(payload)) {
      if (rowMap[key]) {
        sheet.getRange(rowMap[key], 2).setValue(value);
      } else {
        sheet.appendRow([key, value]);
      }
    }
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}