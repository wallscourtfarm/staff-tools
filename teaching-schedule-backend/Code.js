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

// Reads a key straight back after writing it and compares — the only way to
// actually know a save reached the Sheet, rather than trusting that "no
// exception was thrown" means it worked. Returns null on success, or an
// error string. Added 18.09.26 after a cover-plan-state incident showed a
// save can fail with no write ever happening and no client-visible signal
// of it — see cover-plan-state/Code.js for the full story.
function verifyWrite_(key, expected) {
  const actual = readByKey_(key);
  if (actual !== expected) {
    return 'write verification failed: Sheet does not contain what was just written for key ' + key;
  }
  return null;
}

function listKeys_() {
  const sh = getStateSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 1) return [];
  return sh.getRange(1, 1, lastRow, 1).getValues().map(r => r[0]).filter(k => k);
}

// ── Response cache ───────────────────────────────────────────────────────
// Added 18.09.26 — `load` opened the Spreadsheet fresh on every call, same
// shape as the cover-plan-state slowness bug (this tool polls it heavily
// across classroom devices). Cache the exact response text per key so a
// repeat read within the TTL never touches Sheets; every write updates the
// cache immediately so a poller right after a save still sees the new value.
const CACHE_PREFIX = 'tscache_';
const CACHE_TTL_SECONDS = 20;

function getCachedResponse_(key) {
  const hit = CacheService.getScriptCache().get(CACHE_PREFIX + key);
  return hit !== null ? hit : null;
}

function setCachedResponse_(key, text) {
  try { CacheService.getScriptCache().put(CACHE_PREFIX + key, text, CACHE_TTL_SECONDS); }
  catch (err) { /* value too large for the cache — fall through uncached */ }
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
  // Added 18.09.26 — writeByKey_ is read-then-write (findRow_ then
  // appendRow/setValue) against a shared Sheet, and multiple devices can
  // save the same (yearGroup, weekKey) close together. Without a lock, two
  // concurrent doPost calls for a brand-new key could both see findRow_
  // return -1 and both appendRow, leaving a duplicate row whose second copy
  // silently stops being read. Same fix already applied to
  // cover-plan-state/resource-booking-backend/shared-sync.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'locked, try again' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'save' && payload.weekKey) {
      const yg = payload.yearGroup || 'Y4';
      const key = PREFIX + yg + '_' + payload.weekKey;
      const newValue = JSON.stringify(payload.data);
      backupBeforeWrite_(key, readByKey_(key));
      writeByKey_(key, newValue);
      const writeErr = verifyWrite_(key, newValue);
      if (writeErr) {
        CacheService.getScriptCache().remove(CACHE_PREFIX + key);
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: writeErr }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      setCachedResponse_(key, JSON.stringify({ data: payload.data }));
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
  } finally {
    lock.releaseLock();
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
      const cached = getCachedResponse_(key);
      if (cached !== null) {
        return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
      }
      const raw = readByKey_(key);
      const data = raw ? JSON.parse(raw) : null;
      const out = JSON.stringify({ data });
      setCachedResponse_(key, out);
      return ContentService.createTextOutput(out)
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
// Added 15.09.26 after cover-plan-state's first data-wipe incident — this
// store had the same no-history exposure. Records the previous value of
// whichever week/yearGroup key is about to be overwritten, so any bad save
// (this bug class or a future one) is recoverable via
// listBackups/restoreBackup.
//
// REWRITTEN 18.09.26 — this ring buffer originally stayed on
// PropertiesService as "just metadata, low risk" even after the 16.09.26
// Sheets migration. That exact reasoning, applied to cover-plan-state,
// caused a real multi-hour silent save failure on 18.09.26 once its state
// grew past PropertiesService's 9KB-per-value cap: a backup step run BEFORE
// the real write threw, and the whole write was lost with no error
// surfaced anywhere. This store's payloads are much smaller per key
// (checked live: a few KB) so the immediate risk was lower, but the failure
// class is identical and would be just as silent when it eventually hit.
// Moved onto a dedicated Sheet tab (TeachingScheduleBackups) instead — a
// Sheets cell holds up to 50,000 characters, so there's no realistic size
// ceiling left to hit. See cover-plan-state/Code.js for the full incident
// writeup.
const BACKUP_TAB_NAME = 'TeachingScheduleBackups';
const BACKUP_COUNT = 100; // generous — Sheets rows are cheap, unlike PropertiesService's 9KB/500KB quota

function getBackupSheet_() {
  const ss = SpreadsheetApp.openById(STATE_SHEET_ID);
  let sh = ss.getSheetByName(BACKUP_TAB_NAME);
  if (!sh) sh = ss.insertSheet(BACKUP_TAB_NAME);
  return sh;
}

// Pretty-prints JSON for storage in a backup row — asked for 18.09.26 after
// a real data-loss incident on cover-plan-state, when Innes had to actually
// look at what was in these rows and found one giant unindented line
// unreadable. Falls back to the raw string on any parse failure (should
// never happen, but a backup step must never throw). Restoring reverses
// this (compactBackupData_) so the LIVE cell never carries the extra
// whitespace — only the backup history does.
function prettyPrintForBackup_(text) {
  try { return JSON.stringify(JSON.parse(text), null, 2); }
  catch (err) { return text; }
}

function compactBackupData_(text) {
  try { return JSON.stringify(JSON.parse(text)); }
  catch (err) { return text; }
}

function backupBeforeWrite_(key, current) {
  if (!current) return; // nothing to lose yet for this key
  try {
    const sh = getBackupSheet_();
    sh.appendRow([new Date().toISOString(), key, prettyPrintForBackup_(current)]);
    const lastRow = sh.getLastRow();
    if (lastRow > BACKUP_COUNT) sh.deleteRows(1, lastRow - BACKUP_COUNT);
  } catch (err) { /* never let a failed backup block the real write */ }
}

function listBackups_() {
  const sh = getBackupSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 1) return [];
  const rows = sh.getRange(1, 1, lastRow, 3).getValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const ts = rows[i][0], key = rows[i][1], data = rows[i][2];
    if (!ts) continue;
    // size is the compact (restored) length, so it means the same thing as
    // the live state's own size, not the pretty-printed row's length.
    out.push({ row: i + 1, ts: (ts instanceof Date) ? ts.toISOString() : String(ts), key: String(key || ''), size: compactBackupData_(String(data || '')).length });
  }
  out.sort((a, b) => a.ts < b.ts ? 1 : (a.ts > b.ts ? -1 : 0)); // newest first
  return out;
}

function readBackupRow_(rowNum) {
  const sh = getBackupSheet_();
  if (rowNum < 1 || rowNum > sh.getLastRow()) return null;
  const vals = sh.getRange(rowNum, 1, 1, 3).getValues()[0];
  if (!vals[0]) return null;
  return { ts: (vals[0] instanceof Date) ? vals[0].toISOString() : String(vals[0]), key: String(vals[1] || ''), data: String(vals[2] || '') };
}

function restoreBackup_(rowNum) {
  const backup = readBackupRow_(parseInt(rowNum, 10));
  if (!backup) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'no backup at row ' + rowNum }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // Backup rows are stored pretty-printed — compact back down before
  // writing so the live cell never carries that extra whitespace.
  const restoreData = compactBackupData_(backup.data);
  backupBeforeWrite_(backup.key, readByKey_(backup.key)); // keep the pre-restore state recoverable too
  writeByKey_(backup.key, restoreData);
  const writeErr = verifyWrite_(backup.key, restoreData);
  if (writeErr) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: writeErr }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  setCachedResponse_(backup.key, JSON.stringify({ data: restoreData ? JSON.parse(restoreData) : null }));
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', restoredKey: backup.key, restoredFrom: backup.ts }))
    .setMimeType(ContentService.MimeType.JSON);
}
