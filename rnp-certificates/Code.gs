// RNP Certificate Tracker — Apps Script Web App
var SHEET_ID = '1A0pjyjX2lYVlruAKJYmn3j36GoSzIol6kt6u8qI44D0';
var SHEET_NAME = 'Tracking';

// Shared light token (same scheme as shared-sync). Token arrives in the query
// string, never headers, to avoid the Apps Script CORS preflight.
function tokenOK(e) {
  var expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!(e && e.parameter && e.parameter.token && e.parameter.token === expected);
}

function denied() {
  return ContentService.createTextOutput(JSON.stringify({ok: false, error: 'unauthorised'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Key', 'Last Name', 'First Name', 'Milestones Issued', 'Last Updated']);
    sheet.getRange(1,1,1,5).setFontWeight('bold');
    sheet.getRange(1, 4, sheet.getMaxRows(), 1).setNumberFormat('@');
  }
  return sheet;
}

function getRowMap(sheet) {
  var data = sheet.getDataRange().getValues();
  var rowMap = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) rowMap[String(data[i][0])] = i + 1;
  }
  return rowMap;
}

// GET — returns all issued tracking data, or handles action=update to save a single pupil's milestones
function doGet(e) {
  try {
    if (!tokenOK(e)) return denied();
    var sheet = getSheet();

    // action=update: save a single pupil record sent as URL params (avoids POST redirect issue)
    if (e.parameter && e.parameter.action === 'update') {
      var key  = e.parameter.key || '';
      var msStr = e.parameter.ms  || '';
      var parts = key.split('|');
      var rowMap = getRowMap(sheet);
      var now = new Date().toISOString().slice(0, 10);
      if (rowMap[key]) {
        var msCell = sheet.getRange(rowMap[key], 4);
        msCell.setNumberFormat('@');
        msCell.setValue(msStr);
        sheet.getRange(rowMap[key], 5).setValue(now);
      } else {
        sheet.appendRow([key, parts[0] || '', parts[1] || '', msStr, now]);
        // Force text on the milestones cell in the new row
        var newRow = sheet.getLastRow();
        sheet.getRange(newRow, 4).setNumberFormat('@');
      }
      return ContentService
        .createTextOutput(JSON.stringify({ok: true}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default: return all tracking data
    var data = sheet.getDataRange().getValues();
    var issued = {};
    for (var i = 1; i < data.length; i++) {
      var k = data[i][0];
      var milestones = data[i][3] ? String(data[i][3]).split(',').map(Number).filter(Boolean) : [];
      if (k) issued[k] = milestones;
    }
    return ContentService
      .createTextOutput(JSON.stringify({ok: true, issued: issued}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ok: false, error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Cleans up any rows where milestones were stored as a number (e.g. 50100 instead of "50,100")
// Run once manually from the Apps Script editor after deploying this fix
function fixBadData() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var validMilestones = [50, 100, 150, 200, 250, 300];
  for (var i = 1; i < data.length; i++) {
    var raw = data[i][3];
    if (raw === '' || raw === null) continue;
    var str = String(raw);
    // If no comma and it's a big number, it was stored numerically — reconstruct
    if (str.indexOf(',') === -1 && str.length > 3) {
      // e.g. "50100" → find which valid milestones are substrings
      var found = validMilestones.filter(function(m) {
        return str.indexOf(String(m)) !== -1;
      });
      if (found.length) {
        var fixed = found.sort(function(a,b){return a-b;}).join(',');
        var cell = sheet.getRange(i + 1, 4);
        cell.setNumberFormat('@');
        cell.setValue(fixed);
        Logger.log('Fixed row ' + (i+1) + ': ' + str + ' → ' + fixed);
      }
    } else {
      // Ensure existing text cells are also forced to text format
      sheet.getRange(i + 1, 4).setNumberFormat('@');
    }
  }
  Logger.log('fixBadData complete');
}

// doPost kept for reference but not used by the frontend (redirect converts POST to GET)
// POST redirect converts to GET on Apps Script, so the frontend's bulk save
// POST lands here; forward the token so the gate still passes.
function doPost(e) {
  return doGet({parameter: {action: 'noop', token: (e && e.parameter && e.parameter.token) || ''}});
}
