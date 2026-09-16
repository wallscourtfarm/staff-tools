// Teaching Schedule — Cross-device sync via Google Apps Script
// Deploy as a web app, then paste the URL into index.html's SYNC_URL constant.

const PREFIX = 'ts_'; // key prefix to avoid collisions with other rows/keys

// Shared light token (same scheme as every other WFA tool's own backend) —
// a deterrent, not real access control, but this endpoint previously had
// none at all.
function tokenOK_(e) {
  const want = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!(e && e.parameter && e.parameter.token && e.parameter.token === want);
}

// ── State storage ────────────────────────────────────────────────────────
// Moved off PropertiesService onto a dedicated Google Sheet 16.09.26, for
// real Google-maintained version history — same reasoning and same sheet as
// cover-plan-state's migration (see that project's Code.js for the full
// story). One row per (yearGroup, weekKey) key, column A = key, column B =
// JSON value. The backup ring buffer below stays on PropertiesService —
// it's small metadata, not the primary record.
const STATE_SHEET_ID = '1DBO1GERb_BRq-cnn1rousFtkVn9ajFnurzqitgknelc';
const STATE_TAB_NAME = 'TeachingSchedule';

function getStateSheet_() {
  const ss = SpreadsheetApp.openById(STATE_SHEET_ID);
  let sh = ss.getSheetByName(STATE_TAB_NAME);
  if (!sh) sh = ss.insertSheet(STATE_TAB_NAME);
  return sh;
}

function findRow_(sh, key) {
  const lastRow = sh.getLastRow();
  if (lastRow < 1) return -1;
  const keys = sh.getRange(1, 1, lastRow, 1).getValues();
  for (let i = 0; i < keys.length; i++) {
    if (keys[i][0] === key) return i + 1;
  }
  return -1;
}

function readByKey_(key) {
  const sh = getStateSheet_();
  const row = findRow_(sh, key);
  if (row === -1) return null;
  const val = sh.getRange(row, 2).getValue();
  return val ? String(val) : null;
}

function writeByKey_(key, text) {
  const sh = getStateSheet_();
  const row = findRow_(sh, key);
  if (row === -1) sh.appendRow([key, text]);
  else sh.getRange(row, 2).setValue(text);
}

function listKeys_() {
  const sh = getStateSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 1) return [];
  return sh.getRange(1, 1, lastRow, 1).getValues().map(r => r[0]).filter(k => k);
}

// Run this manually from the Apps Script editor (select it in the function
// dropdown, click Run) before deploying any version that uses SpreadsheetApp
// for the first time — that's the only way Google lets a script owner grant
// a new permission, and it must happen before deploying so the live web app
// never serves a "needs authorisation" error to a real caller. No-op after
// that; not called by doGet/doPost. Deliberately no trailing underscore —
// Apps Script hides "private" (trailing-underscore) functions from the
// editor's manual-run dropdown.
function authorizeSheetsAccess() {
  return getStateSheet_().getName();
}

function doPost(e) {
  if (!tokenOK_(e)) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'unauthorised' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'save' && payload.weekKey) {
      const yg = payload.yearGroup || 'Y4';
      const key = PREFIX + yg + '_' + payload.weekKey;
      const props = PropertiesService.getScriptProperties();
      backupBeforeWrite_(props, key, readByKey_(key));
      writeByKey_(key, JSON.stringify(payload.data));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (payload.action === 'restoreBackup' && payload.index !== undefined) {
      return restoreBackup_(payload.index);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (!tokenOK_(e)) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'unauthorised' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const action = e.parameter.action;
    if (action === 'load' && e.parameter.weekKey) {
      const yg = e.parameter.yearGroup || 'Y4';
      const key = PREFIX + yg + '_' + e.parameter.weekKey;
      const raw = readByKey_(key);
      const data = raw ? JSON.parse(raw) : null;
      return ContentService.createTextOutput(JSON.stringify({ data }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // List all stored weeks (for debugging)
    if (action === 'list') {
      const weeks = listKeys_().filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length));
      return ContentService.createTextOutput(JSON.stringify({ weeks }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'listBackups') {
      return ContentService.createTextOutput(JSON.stringify({ backups: listBackups_() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Backups ──────────────────────────────────────────────────────────────
// Added 15.09.26 after cover-plan-state's data-wipe incident (see that
// project's Code.js for the full story) — this store had the same no-history
// exposure. One global ring buffer records the previous value of whichever
// week/yearGroup key is about to be overwritten, so any bad save (this bug
// class or a future one) is recoverable via listBackups/restoreBackup.
// BACKUP_PREFIX deliberately does NOT start with PREFIX ('ts_'), so the
// `list` debug action above (which matches on PREFIX) never shows backup
// slots as if they were real saved weeks. Stays on PropertiesService even
// after the 16.09.26 Sheets migration — it's small metadata, and the Sheet
// itself is now the primary durability layer; this ring buffer is just the
// fast, no-UI undo lever on top.
const BACKUP_PREFIX = 'bak_ts_';
const BACKUP_COUNT = 30;
const BACKUP_CURSOR_KEY = 'bak_ts_cursor';

function backupBeforeWrite_(props, key, current) {
  if (!current) return; // nothing to lose yet for this key
  const cursor = parseInt(props.getProperty(BACKUP_CURSOR_KEY) || '0', 10);
  props.setProperty(BACKUP_PREFIX + cursor, JSON.stringify({ ts: new Date().toISOString(), key: key, data: current }));
  props.setProperty(BACKUP_CURSOR_KEY, String((cursor + 1) % BACKUP_COUNT));
}

function listBackups_() {
  const props = PropertiesService.getScriptProperties();
  const out = [];
  for (let i = 0; i < BACKUP_COUNT; i++) {
    const raw = props.getProperty(BACKUP_PREFIX + i);
    if (!raw) continue;
    try {
      const b = JSON.parse(raw);
      out.push({ index: i, ts: b.ts, key: b.key, size: (b.data || '').length });
    } catch (e) { /* skip a corrupt slot rather than failing the whole list */ }
  }
  out.sort(function (a, b) { return a.ts < b.ts ? -1 : (a.ts > b.ts ? 1 : 0); });
  return out;
}

function restoreBackup_(index) {
  const props = PropertiesService.getScriptProperties();
  const idx = parseInt(index, 10);
  const raw = props.getProperty(BACKUP_PREFIX + idx);
  if (!raw) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'no backup at index ' + idx }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const backup = JSON.parse(raw);
  backupBeforeWrite_(props, backup.key, readByKey_(backup.key)); // keep the pre-restore state recoverable too
  writeByKey_(backup.key, backup.data);
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', restoredKey: backup.key, restoredFrom: backup.ts }))
    .setMimeType(ContentService.MimeType.JSON);
}
