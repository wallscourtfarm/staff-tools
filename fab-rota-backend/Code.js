const SHEET_ID = '1XsP5yEGnf8sJyXk8iEXqHEtw-NtCsMUFZLaHW4TWNhw';                                                 
  const TAB_NAME = 'FABState';                                                                                     
                                                                                                                   
  function doGet() {                                                                                               
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);                                      
    const val = sheet ? sheet.getRange('A1').getValue() : '';                                                      
    return ContentService.createTextOutput(val || '{}')
      .setMimeType(ContentService.MimeType.JSON);                                                                  
  }                                                         
                                                                                                                   
  function doPost(e) {                                      
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