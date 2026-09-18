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
// Live state moved off PropertiesService onto a dedicated Google Sheet
// 16.09.26, for real, Google-maintained version history. Deliberately a
// NEW, dedicated spreadsheet rather than reusing the busy "WFA Planning
// Data" hub sheet, which already has documented contention problems from
// other tools hammering it (see project_shared_gateway_apps_script_ceiling
// in Claude's memory) — this sheet has no other traffic. Sharing is left at
// its private-by-default setting (not "anyone with link"); the script can
// still read/write it because it always executes as the deploying account
// regardless of the sheet's sharing settings, same model as fab-rota's
// existing Sheets-backed state.
//
// REWRITTEN 18.09.26 after a real data-loss incident: the backup ring
// buffer (added 15.09.26) stayed on PropertiesService as "just metadata,
// low risk" even after the main-store Sheets migration — and PropertiesService
// caps each value at 9KB. Once the live state grew past that (today, ~18KB),
// EVERY backup attempt threw "Argument too large", and because that ran
// BEFORE the real write, every single save silently failed for over 5
// hours — including a real edit (a teacher's Wednesday/Friday absence) that
// was never recovered, because nothing captured it anywhere before the
// write it was part of ever happened. Three structural changes fix the
// whole failure class, not just this one bug:
//   1. Backups now live on THIS SAME SHEET (a second tab, CoverPlanBackups)
//      instead of PropertiesService — a Sheets cell holds up to 50,000
//      characters, so there is no realistic size ceiling to hit again.
//   2. A write is verified by reading it back immediately after — if the
//      Sheet doesn't reflect what was just sent, the client gets a real
//      error instead of a false "ok: true". No more silent failures, ever,
//      regardless of what future bug might cause one.
//   3. An incoming save is validated to actually look like release-plan
//      state (has a weekSlots object) before it's allowed to overwrite the
//      live store — this is what let a stray `{"action":"listBackups"}`
//      test payload wipe the real data during today's incident; a
//      malformed body is now rejected outright instead of accepted.

var STATE_SHEET_ID = '1DBO1GERb_BRq-cnn1rousFtkVn9ajFnurzqitgknelc';
var STATE_TAB_NAME = 'CoverPlanState';
var BACKUP_TAB_NAME = 'CoverPlanBackups';

var TOKEN = '050d7ae1a6b52eafa7d19b80c844dea8d20d1f678274fe05';

// CacheService fronting the Sheet read, added 18.09.26 — this single
// deployment backs planner.html + supply-admin.html directly plus 6 more
// tools via wfa-data's Railway proxy (see file header above), and every
// doGet was opening the Spreadsheet fresh with no caching at all. Under
// concurrent load from that many pollers, Apps Script serializes the
// executions and requests were measured queuing up to 19s and timing out
// past clients' fetch timeouts (same "gateway ceiling" pattern already
// fixed on spelling-games and reading-tracker — see
// project_shared_gateway_apps_script_ceiling in Claude's memory). A short
// TTL is enough to absorb a burst of simultaneous reads with one Sheet hit
// instead of N. Every write updates the cache immediately (not just on
// expiry) so a poller right after a save still sees the new value rather
// than a stale cached one.
var CACHE_KEY = 'coverPlanState_v1';
var CACHE_TTL_SECONDS = 20;

function getCachedState_() {
  var hit = CacheService.getScriptCache().get(CACHE_KEY);
  return hit !== null ? hit : null;
}

function setCachedState_(text) {
  // CacheService caps values at 100KB; live state is ~18KB as of 18.09.26.
  // If it ever grows past the cap, just skip caching that write rather than
  // erroring the whole request — the Sheet read is still the source of truth.
  try { CacheService.getScriptCache().put(CACHE_KEY, text, CACHE_TTL_SECONDS); }
  catch (err) { /* value too large for the cache — fall through uncached */ }
}

function clearCachedState_() {
  try { CacheService.getScriptCache().remove(CACHE_KEY); } catch (err) { /* ignore */ }
}

// Kept generous — Sheets rows cost nothing like PropertiesService's 9KB/500KB
// quota did, so there's no reason to keep this tight.
var BACKUP_COUNT = 100;

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

function getBackupSheet_() {
  var ss = SpreadsheetApp.openById(STATE_SHEET_ID);
  var sh = ss.getSheetByName(BACKUP_TAB_NAME);
  if (!sh) sh = ss.insertSheet(BACKUP_TAB_NAME);
  return sh;
}

function readState_() {
  var val = getStateSheet_().getRange('A1').getValue();
  return val ? String(val) : null;
}

function writeState_(text) {
  getStateSheet_().getRange('A1').setValue(text);
}

// Reads the value straight back after a write and compares it to what was
// sent — the only way to actually know a save reached the Sheet, rather
// than trusting that "no exception was thrown" means it worked. Returns
// null on success, or an error string to surface to the client.
function verifyWrite_(expected) {
  var actual = readState_();
  if (actual !== expected) {
    return 'write verification failed: Sheet does not contain what was just written';
  }
  return null;
}

// A real release-plan state is always a JSON object with a weekSlots
// object in it — every genuine save from planner.html/supply-admin.html
// has this shape. Rejecting anything else outright is what would have
// stopped the 18.09.26 incident, where a stray test payload
// (`{"action":"listBackups"}`) had no weekSlots at all and still silently
// overwrote the real data because nothing checked its shape first.
function isValidState_(text) {
  if (!text) return false;
  var obj;
  try { obj = JSON.parse(text); } catch (err) { return false; }
  return !!(obj && typeof obj === 'object' && obj.weekSlots && typeof obj.weekSlots === 'object');
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
  return getStateSheet_().getName() + ', ' + getBackupSheet_().getName();
}

// Snapshot the state about to be overwritten. No-op the first time this
// script ever runs (nothing live yet to lose). Appends a timestamped row to
// the CoverPlanBackups tab rather than a PropertiesService slot — a Sheets
// cell holds up to 50,000 characters, so there is no realistic size ceiling
// to hit here, unlike the 9KB-per-value PropertiesService cap that caused
// the 18.09.26 incident. Still wrapped in try/catch on principle: a backup
// step must NEVER be able to block the real write that follows it,
// regardless of what kind of failure it hits.
function backupCurrentState(current) {
  if (!current) return;
  try {
    var sh = getBackupSheet_();
    sh.appendRow([new Date().toISOString(), current]);
    var lastRow = sh.getLastRow();
    if (lastRow > BACKUP_COUNT) {
      sh.deleteRows(1, lastRow - BACKUP_COUNT);
    }
  } catch (err) {
    // Never let a failed backup block the real write.
  }
}

function listBackups() {
  var sh = getBackupSheet_();
  var lastRow = sh.getLastRow();
  if (lastRow < 1) return [];
  var rows = sh.getRange(1, 1, lastRow, 2).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var ts = rows[i][0], data = rows[i][1];
    if (!ts) continue;
    out.push({ row: i + 1, ts: (ts instanceof Date) ? ts.toISOString() : String(ts), size: String(data || '').length });
  }
  out.sort(function (a, b) { return a.ts < b.ts ? 1 : (a.ts > b.ts ? -1 : 0); }); // newest first
  return out;
}

function readBackupRow_(rowNum) {
  var sh = getBackupSheet_();
  if (rowNum < 1 || rowNum > sh.getLastRow()) return null;
  var vals = sh.getRange(rowNum, 1, 1, 2).getValues()[0];
  if (!vals[0]) return null;
  return { ts: (vals[0] instanceof Date) ? vals[0].toISOString() : String(vals[0]), data: String(vals[1] || '') };
}

function doGet(e) {
  if (!checkToken(e)) return errorJson('unauthorised');

  if (e.parameter.action === 'listBackups') {
    return json({ backups: listBackups() });
  }

  var cached = getCachedState_();
  if (cached !== null) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }

  var data = readState_();
  var out = data || 'null';
  setCachedState_(out);
  return ContentService.createTextOutput(out)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!checkToken(e)) return errorJson('unauthorised');

  if (e.parameter.action === 'restoreBackup') {
    var rowNum = parseInt(e.parameter.index, 10);
    var backup = readBackupRow_(rowNum);
    if (!backup) return errorJson('no backup at row ' + rowNum);
    // Keep the pre-restore state recoverable too, in case the wrong row gets restored.
    backupCurrentState(readState_());
    writeState_(backup.data);
    var restoreErr = verifyWrite_(backup.data);
    if (restoreErr) return errorJson(restoreErr);
    setCachedState_(backup.data);
    return json({ ok: true, restoredFrom: backup.ts });
  }

  var incoming = e.postData.contents;
  if (!isValidState_(incoming)) {
    return errorJson('rejected: payload does not look like valid release-plan state (missing weekSlots)');
  }

  backupCurrentState(readState_());
  writeState_(incoming);
  var writeErr = verifyWrite_(incoming);
  if (writeErr) {
    clearCachedState_(); // don't serve a cached value that may now disagree with the Sheet
    return errorJson(writeErr);
  }
  setCachedState_(incoming);
  return json({ ok: true });
}
