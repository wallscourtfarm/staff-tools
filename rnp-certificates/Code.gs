// RNP Certificate Tracker — Apps Script Web App
var SHEET_ID = '1A0pjyjX2lYVlruAKJYmn3j36GoSzIol6kt6u8qI44D0';
var SHEET_NAME = 'Tracking';

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Key', 'Last Name', 'First Name', 'Milestones Issued', 'Last Updated']);
    sheet.getRange(1,1,1,5).setFontWeight('bold');
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
    var sheet = getSheet();

    // action=update: save a single pupil record sent as URL params (avoids POST redirect issue)
    if (e.parameter && e.parameter.action === 'update') {
      var key  = e.parameter.key || '';
      var msStr = e.parameter.ms  || '';
      var parts = key.split('|');
      var rowMap = getRowMap(sheet);
      var now = new Date().toISOString().slice(0, 10);
      if (rowMap[key]) {
        sheet.getRange(rowMap[key], 4).setValue(msStr);
        sheet.getRange(rowMap[key], 5).setValue(now);
      } else {
        sheet.appendRow([key, parts[0] || '', parts[1] || '', msStr, now]);
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

// doPost kept for reference but not used by the frontend (redirect converts POST to GET)
function doPost(e) {
  return doGet({parameter: {action: 'noop'}});
}
