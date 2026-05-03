// Activity Exceptions - Google Apps Script Web App
// Handles storing and retrieving individual day activity exceptions

const SHEET_ID = '1XsP5yEGnf8sJyXk8iEXqHEtw-NtCsMUFZLaHW4TWNhw';
const EXCEPTIONS_TAB = 'ActivityExceptions';

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(EXCEPTIONS_TAB);
    if (!sheet) {
      return jsonResponse({ error: 'ActivityExceptions tab not found' }, 404);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return jsonResponse({ exceptions: [] });
    }

    const headers = data[0];
    const exceptions = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    }).filter(r => r.Date && r.Staff && r.Activity);

    return jsonResponse({ exceptions });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { date, staff, activity, session } = payload;

    if (!date || !staff || !activity) {
      return jsonResponse({ error: 'Missing required fields: date, staff, activity' }, 400);
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(EXCEPTIONS_TAB);
    if (!sheet) {
      return jsonResponse({ error: 'ActivityExceptions tab not found' }, 404);
    }

    // Check if headers exist, if not create them
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers[0]) {
      sheet.getRange(1, 1, 1, 4).setValues([['Date', 'Staff', 'Activity', 'Session']]);
    }

    // Append the exception
    sheet.appendRow([date, staff, activity, session || '']);

    return jsonResponse({ success: true, exception: { date, staff, activity, session } });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function jsonResponse(data, code = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setStatusCode(code);
}