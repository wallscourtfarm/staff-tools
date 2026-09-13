// WFA Planning Data — Activity Exceptions
//
// Bound to the WFA Planning Data hub sheet. The only thing anything still
// calls here is teaching-schedule's EXCEPTIONS_URL, for its "add an
// exception" / "list exceptions" feature (found 13.09.26: teaching-schedule
// is the sole real caller, confirmed by grepping every local repo for this
// deployment's URL). Everything else this project used to do — the old
// Release Schedule sheet-setup docs, the release-schedule "publish &
// notify staff" emailer, and an even older PlannerState get/set — has
// been superseded by cover-plan's own dedicated, git-tracked scripts
// (notify-script.gs and cover-plan-state) and is removed here rather than
// left as dead, confusing weight on the pupil-data hub sheet.
//
// teaching-schedule calls both actions with a plain fetch(url + '?' +
// params) — i.e. a GET, params in the query string, no POST body — even
// for "addException". doGet handles both; doPost mirrors the same two
// actions (reading params from either the query string or a JSON body)
// in case anything ever calls this with a real POST.
//
// Shared light token (same scheme as every other WFA tool's own backend) —
// a deterrent, not real access control, but this endpoint previously had
// none at all.
function tokenOK_(e) {
  const want = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!(e && e.parameter && e.parameter.token && e.parameter.token === want);
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getExceptionsSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ActivityExceptions');
}

function getExceptions_() {
  const sheet = getExceptionsSheet_();
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    })
    .filter(r => r.Date && r.Staff && r.Activity);
}

function addException_(date, staff, activity, session) {
  let sheet = getExceptionsSheet_();
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('ActivityExceptions');
    sheet.appendRow(['Date', 'Staff', 'Activity', 'Session']);
  }
  sheet.appendRow([date, staff, activity, session || '']);
}

// Reads action params from the query string first (what every real caller
// actually sends), falling back to a JSON POST body if there is one.
function paramsFor_(e) {
  if (e && e.parameter && e.parameter.action) return e.parameter;
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents) || {}; } catch (_) { return {}; }
  }
  return (e && e.parameter) || {};
}

function handle_(e) {
  if (!tokenOK_(e)) return jsonResponse_({ error: 'unauthorised' });
  const p = paramsFor_(e);
  if (p.action === 'exceptions') {
    return jsonResponse_({ exceptions: getExceptions_() });
  }
  if (p.action === 'addException') {
    addException_(p.date, p.staff, p.activity, p.session);
    return jsonResponse_({ success: true });
  }
  return jsonResponse_({ status: 'ok' });
}

function doGet(e) {
  return handle_(e);
}

function doPost(e) {
  return handle_(e);
}
