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

var KEY = 'wfa_planner_v1';
var TOKEN = '050d7ae1a6b52eafa7d19b80c844dea8d20d1f678274fe05';

function checkToken(e) {
  return e && e.parameter && e.parameter.token === TOKEN;
}

function doGet(e) {
  if (!checkToken(e)) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorised' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var data = PropertiesService.getScriptProperties().getProperty(KEY);
  return ContentService.createTextOutput(data || 'null')
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!checkToken(e)) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorised' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  PropertiesService.getScriptProperties().setProperty(KEY, e.postData.contents);
  return ContentService.createTextOutput('{"ok":true}')
    .setMimeType(ContentService.MimeType.JSON);
}
