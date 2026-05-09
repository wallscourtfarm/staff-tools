/**
 * Fix DayTimings sheet: populate the YearGroup column with correct values.
 * Run this once in the Google Sheet's Apps Script editor.
 *
 * INSTRUCTIONS:
 * 1. Open the DayTimings Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this script
 * 4. Run the fixDayTimings function
 * 5. Check the sheet to verify the YearGroup column was updated correctly
 */
function fixDayTimings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DayTimings');
  if (!sheet) {
    throw new Error('DayTimings sheet not found');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find column indices
  const yearGroupCol = headers.indexOf('YearGroup');
  const idCol = headers.indexOf('ID');

  if (yearGroupCol === -1 || idCol === -1) {
    throw new Error('YearGroup or ID column not found');
  }

  // The correct YearGroup values for each row, identified by ID and Time
  // Key format: "ID|Time" → YearGroup value
  const corrections = {
    's1|09:00-10:15': 'R',
    's1|09:00-10:30': '1,2,3',
    's1|09:00-10:45': '4,5,6',
    'LRSnack|10:30-10:45': 'R',
    'LRSnack|10:15-10:30': '',  // keep as-is (Y1 and Y2 have their own rows)
    'FAB|10:30-10:45': '1,2,3',
    'FAB|10:45-11:00': '4,5,6',
    's2|10:45-11:35': 'R',
    's2|11:00-12:15': '5,6',
    'wash|11:35-11:40': 'R',
    'lunch|11:40-12:45': 'R',
    'reg-pm|12:45-12:50': 'R',
    's3|12:50-15:00': 'R',
  };

  let updated = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = String(row[idCol]).trim();
    const time = String(row[headers.indexOf('Time')]).trim();
    const currentYG = String(row[yearGroupCol]).trim();

    // Only update rows that currently have blank YearGroup
    if (currentYG !== '') continue;

    const key = `${id}|${time}`;
    if (corrections.hasOwnProperty(key)) {
      const newValue = corrections[key];
      sheet.getRange(i + 1, yearGroupCol + 1).setValue(newValue);
      updated++;
    }
  }

  SpreadsheetApp.getUi().alert(`Updated ${updated} cells in the YearGroup column.`);
}