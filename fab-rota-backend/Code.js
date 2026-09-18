const SHEET_ID = '1XsP5yEGnf8sJyXk8iEXqHEtw-NtCsMUFZLaHW4TWNhw';
  const TAB_NAME = 'FABState';

  // Shared light token (same scheme as every other WFA tool's own
  // backend) — a deterrent, not real access control, but this endpoint
  // previously had none at all.
  function tokenOK_(e) {
    const want = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
    return !!(e && e.parameter && e.parameter.token && e.parameter.token === want);
  }

  // Added 18.09.26 — every doGet opened the Spreadsheet fresh, same shape as
  // the cover-plan-state slowness bug this mirrors. State here is small (a
  // single cell) so a short cache is cheap; every write updates it
  // immediately so a poller right after a save still sees the new value.
  const CACHE_KEY = 'fab_state_v1';
  const CACHE_TTL_SECONDS = 20;

  function doGet(e) {
    if (!tokenOK_(e)) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorised' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const cached = CacheService.getScriptCache().get(CACHE_KEY);
    if (cached !== null) {
      return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
    const val = sheet ? sheet.getRange('A1').getValue() : '';
    const out = val || '{}';
    try { CacheService.getScriptCache().put(CACHE_KEY, out, CACHE_TTL_SECONDS); } catch (err) { /* too large — skip */ }
    return ContentService.createTextOutput(out)
      .setMimeType(ContentService.MimeType.JSON);
  }

  function doPost(e) {
    if (!tokenOK_(e)) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorised' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const sheet = getOrCreateTab();
    sheet.getRange('A1').setValue(e.postData.contents);
    try { CacheService.getScriptCache().put(CACHE_KEY, e.postData.contents, CACHE_TTL_SECONDS); } catch (err) { /* too large — skip */ }
    return ContentService.createTextOutput('ok')
      .setMimeType(ContentService.MimeType.TEXT);
  }
                                                            
  function getOrCreateTab() {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(TAB_NAME);                                                                       
    if (!sheet) sheet = ss.insertSheet(TAB_NAME);
    return sheet;                                                                                                  
  }