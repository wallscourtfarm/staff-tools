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

  // Found 19.09.26, live repeat of the 18.09.26 cover-plan-state incident:
  // this had no lock, no backup, and no write-verification at all — just
  // setValue() then an unconditional 'ok', with the client not even reading
  // the response. A rejected/interrupted write was indistinguishable from a
  // real save. Mirrors shared-sync/sync-script.gs's doPost pattern.
  function doPost(e) {
    if (!tokenOK_(e)) {
      return json_({ error: 'unauthorised' });
    }
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(20000);
    } catch (err) {
      return json_({ status: 'error', message: 'locked, try again' });
    }
    try {
      const sheet = getOrCreateTab();
      const range = sheet.getRange('A1');
      backupFabState_(String(range.getValue() || ''));
      range.setValue(e.postData.contents);
      const actual = String(sheet.getRange('A1').getValue() || '');
      if (actual !== e.postData.contents) {
        CacheService.getScriptCache().remove(CACHE_KEY);
        return json_({ status: 'error', message: 'write verification failed: sheet does not contain what was just written' });
      }
      try { CacheService.getScriptCache().put(CACHE_KEY, e.postData.contents, CACHE_TTL_SECONDS); } catch (err) { /* too large — skip */ }
      return json_({ status: 'ok' });
    } finally {
      lock.releaseLock();
    }
  }

  function json_(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Sheets cell (50,000 chars/cell) — no PropertiesService 9KB ceiling to
  // hit, unlike the original cover-plan-state bug. Same ring-buffer shape as
  // shared-sync's backupSyncKey_.
  const BACKUP_TAB_NAME = 'FABStateBackups';
  const BACKUP_COUNT = 100;
  function backupFabState_(current) {
    if (!current) return; // nothing to lose yet
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      let sh = ss.getSheetByName(BACKUP_TAB_NAME);
      if (!sh) sh = ss.insertSheet(BACKUP_TAB_NAME);
      let pretty;
      try { pretty = JSON.stringify(JSON.parse(current), null, 2); } catch (err) { pretty = current; }
      sh.appendRow([new Date().toISOString(), pretty]);
      const lastRow = sh.getLastRow();
      if (lastRow > BACKUP_COUNT) sh.deleteRows(1, lastRow - BACKUP_COUNT);
    } catch (err) { /* never let a failed backup block the real write */ }
  }

  function getOrCreateTab() {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(TAB_NAME);
    if (!sheet) sheet = ss.insertSheet(TAB_NAME);
    return sheet;
  }