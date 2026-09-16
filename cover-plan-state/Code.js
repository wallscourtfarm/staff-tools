// WFA Release Plan State — weekSlots/cellNotes/sportsSchedule key-value store.
// (Holds the release plan: which staff are released from class each session
// and who covers for them. Renamed in comments only, 13.09.26 — "release
// plan" is the correct framing, not "cover plan"; the storage key, token,
// and deployment are unchanged so no caller needs updating.)
//
// Found 11.09.26 with NO authentication at all on either verb — anyone with
// this URL could read or silently overwrite the entire live release-plan
// state for the year with a single request. Every other WFA Apps Script
// backend has at least a deterrent shared token; this one had nothing.
//
// TOKEN is the same value already public in every staff-tools client HTML
// file as SHARED_TOKEN (and already committed to this public repo) — this
// is a deterrent against casual/accidental/scraped access, not real access
// control, matching the documented security model of every sibling script
// in this codebase (see feedback_apps_script_deploy_anyone_anonymous /
// project_staff_hub_security_audit_critical in Claude's memory). Hardcoded
// directly here rather than as a Script Property so this fix needs no
// manual provisioning step to take effect.
//
// Only 3 real callers as of 11.09.26 (verified by grepping every local
// repo for this deployment's URL): cover-plan/planner.html and
// supply-admin.html (read + write, direct), and wfa-data's
// backend/routers/cover_state.py (read-only Railway proxy, on behalf of
// the other 6 tools that read this data — teaching-schedule, fab-rota,
// lunch-cover, slt-schedule, lunch-leaders, booking). All 3 updated to
// send the token in the same push that added this check.
//
// Backups added 15.09.26. This store had NO history of any kind — unlike
// every sibling backend that's a Google Sheet (reading-tracker, fab-rota
// have both been recovered from Sheets version history after real data-loss
// incidents), this one was a single Script Property with nothing behind it.
// Every write still snapshots the value it's about to replace into a small
// rolling buffer BEFORE overwriting the live value (below) — a fast, no-UI
// undo lever.
//
// Live state moved off PropertiesService onto a dedicated Google Sheet
// 16.09.26, for real, Google-maintained version history as a second,
// independent layer of protection (the ring buffer only protects against
// bugs in THIS script's own write path — this protects against everything
// else too, e.g. someone directly editing Script Properties). Deliberately
// a NEW, dedicated spreadsheet rather than reusing the busy "WFA Planning
// Data" hub sheet, which already has documented contention problems from
// other tools hammering it (see project_shared_gateway_apps_script_ceiling
// in Claude's memory) — this sheet has no other traffic. Sharing is left at
// its private-by-default setting (not "anyone with link"); the script can
// still read/write it because it always executes as the deploying account
// regardless of the sheet's sharing settings, same model as fab-rota's
// existing Sheets-backed state. The backup ring buffer stays on
// PropertiesService — it's small metadata, not the primary record.

var STATE_SHEET_ID = '1DBO1GERb_BRq-cnn1rousFtkVn9ajFnurzqitgknelc';
var STATE_TAB_NAME = 'CoverPlanState';

var TOKEN = '050d7ae1a6b52eafa7d19b80c844dea8d20d1f678274fe05';

// Ring buffer sized to stay well inside Apps Script's PropertiesService
// quota (500KB total, 9KB per value) even as the live state grows — 40
// slots at up to ~9KB each is 360KB, leaving headroom under the 500KB
// total. Widened from 20 to 40 (15.09.26) after the first real recovery
// test: the backup taken immediately before a bad save is always safe
// until BACKUP_COUNT more saves happen after it, so this is really "how
// many edits can land before someone notices and restores", not a time
// window — 40 gives real same-day margin even during a busy editing
// session.
var BACKUP_COUNT = 40;
var BACKUP_PREFIX = 'wfa_planner_v1_bak_';
var BACKUP_CURSOR_KEY = 'wfa_planner_v1_bak_cursor';

function checkToken(e) {
  return e && e.parameter && e.parameter.token === TOKEN;
}

function errorJson(msg) {
  return ContentService.createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStateSheet_() {
  var ss = SpreadsheetApp.openById(STATE_SHEET_ID);
  var sh = ss.getSheetByName(STATE_TAB_NAME);
  if (!sh) sh = ss.insertSheet(STATE_TAB_NAME);
  return sh;
}

function readState_() {
  var val = getStateSheet_().getRange('A1').getValue();
  return val ? String(val) : null;
}

function writeState_(text) {
  getStateSheet_().getRange('A1').setValue(text);
}

// Run this manually from the Apps Script editor (select it in the function
// dropdown, click Run) the first time this file is deployed after adding
// Sheets access — that's the only way Google lets a script owner grant a
// new permission, and it must happen before deploying so the live web app
// never serves a "needs authorisation" error to a real caller. No-op after
// that; not called by doGet/doPost. Deliberately no trailing underscore —
// Apps Script hides "private" (trailing-underscore) functions from the
// editor's manual-run dropdown, which would defeat the point of this one.
function authorizeSheetsAccess() {
  return getStateSheet_().getName();
}

// Snapshot the state about to be overwritten. No-op the first time this
// script ever runs (nothing live yet to lose).
function backupCurrentState(props, current) {
  if (!current) return;
  var cursor = parseInt(props.getProperty(BACKUP_CURSOR_KEY) || '0', 10);
  props.setProperty(BACKUP_PREFIX + cursor, JSON.stringify({ ts: new Date().toISOString(), data: current }));
  props.setProperty(BACKUP_CURSOR_KEY, String((cursor + 1) % BACKUP_COUNT));
}

function listBackups(props) {
  var out = [];
  for (var i = 0; i < BACKUP_COUNT; i++) {
    var raw = props.getProperty(BACKUP_PREFIX + i);
    if (!raw) continue;
    try {
      var b = JSON.parse(raw);
      out.push({ index: i, ts: b.ts, size: (b.data || '').length });
    } catch (err) { /* skip a corrupt slot rather than failing the whole list */ }
  }
  out.sort(function (a, b) { return a.ts < b.ts ? -1 : (a.ts > b.ts ? 1 : 0); });
  return out;
}

function doGet(e) {
  if (!checkToken(e)) return errorJson('unauthorised');
  var props = PropertiesService.getScriptProperties();

  if (e.parameter.action === 'listBackups') {
    return json({ backups: listBackups(props) });
  }

  var data = readState_();
  return ContentService.createTextOutput(data || 'null')
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!checkToken(e)) return errorJson('unauthorised');
  var props = PropertiesService.getScriptProperties();

  if (e.parameter.action === 'restoreBackup') {
    var idx = parseInt(e.parameter.index, 10);
    var raw = props.getProperty(BACKUP_PREFIX + idx);
    if (!raw) return errorJson('no backup at index ' + idx);
    var backup = JSON.parse(raw);
    // Keep the pre-restore state recoverable too, in case the wrong index gets restored.
    backupCurrentState(props, readState_());
    writeState_(backup.data);
    return json({ ok: true, restoredFrom: backup.ts });
  }

  backupCurrentState(props, readState_());
  writeState_(e.postData.contents);
  return json({ ok: true });
}
