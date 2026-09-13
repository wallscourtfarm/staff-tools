const SHEET_ID = '1XsP5yEGnf8sJyXk8iEXqHEtw-NtCsMUFZLaHW4TWNhw';
  const TAB_NAME = 'FABState';

  // Shared light token (same scheme as every other WFA tool's own
  // backend) — a deterrent, not real access control, but this endpoint
  // previously had none at all.
  function tokenOK_(e) {
    const want = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
    return !!(e && e.parameter && e.parameter.token && e.parameter.token === want);
  }

  function doGet(e) {
    if (!tokenOK_(e)) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorised' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
    const val = sheet ? sheet.getRange('A1').getValue() : '';
    return ContentService.createTextOutput(val || '{}')
      .setMimeType(ContentService.MimeType.JSON);
  }

  function doPost(e) {
    if (!tokenOK_(e)) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorised' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const sheet = getOrCreateTab();
    sheet.getRange('A1').setValue(e.postData.contents);
    return ContentService.createTextOutput('ok')
      .setMimeType(ContentService.MimeType.TEXT);
  }
                                                            
  function getOrCreateTab() {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(TAB_NAME);                                                                       
    if (!sheet) sheet = ss.insertSheet(TAB_NAME);
    return sheet;                                                                                                  
  }