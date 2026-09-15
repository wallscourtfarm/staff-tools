// Teaching Schedule — Cross-device sync via Google Apps Script
// Deploy as a web app, then paste the URL into index.html's SYNC_URL constant.

const PREFIX = 'ts_'; // property key prefix to avoid collisions

// Shared light token (same scheme as every other WFA tool's own backend) —
// a deterrent, not real access control, but this endpoint previously had
// none at all.
function tokenOK_(e) {
  const want = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!(e && e.parameter && e.parameter.token && e.parameter.token === want);
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
      backupBeforeWrite_(props, key);
      props.setProperty(key, JSON.stringify(payload.data));
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
      const raw = PropertiesService.getScriptProperties().getProperty(key);
      const data = raw ? JSON.parse(raw) : null;
      return ContentService.createTextOutput(JSON.stringify({ data }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // List all stored weeks (for debugging)
    if (action === 'list') {
      const props = PropertiesService.getScriptProperties().getProperties();
      const weeks = Object.keys(props).filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length));
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
// slots as if they were real saved weeks.
const BACKUP_PREFIX = 'bak_ts_';
const BACKUP_COUNT = 30;
const BACKUP_CURSOR_KEY = 'bak_ts_cursor';

function backupBeforeWrite_(props, key) {
  const current = props.getProperty(key);
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
  backupBeforeWrite_(props, backup.key); // keep the pre-restore state recoverable too
  props.setProperty(backup.key, backup.data);
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', restoredKey: backup.key, restoredFrom: backup.ts }))
    .setMimeType(ContentService.MimeType.JSON);
}