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
}