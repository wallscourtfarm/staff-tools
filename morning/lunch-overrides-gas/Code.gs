// WFA Lunch Overrides — central, date-keyed lunch menu overrides & day-swaps
// for the morning display boards (year1-beech ... year6-elm, eyfs-oak).
//
// Storage: ScriptProperties, one JSON blob under LUNCH_DATA:
//   { overrides: { 'YYYY-MM-DD': [meal1, meal2] }, swaps: { 'YYYY-MM-DD': 'YYYY-MM-DD' } }
// Swaps are stored both ways (A->B and B->A) so either date looks itself up directly.
// Anything dated before today is pruned automatically on every request — that is
// what gives "reverts back to normal the next day" for free, with no manual cleanup.
//
// doGet  -> returns the current { overrides, swaps } JSON. Called by every board.
// doPost -> admin actions: setOverride, clearOverride, setSwap, clearSwap.
//           Body must be JSON, but sent with Content-Type: text/plain from the
//           browser to avoid a CORS preflight (Apps Script web apps don't handle
//           OPTIONS requests) — see menu-admin/index.html.

var PROP_KEY = 'LUNCH_DATA';
var TZ = 'Europe/London';

function getData_() {
  var raw = PropertiesService.getScriptProperties().getProperty(PROP_KEY);
  if (!raw) return { overrides: {}, swaps: {} };
  try {
    var d = JSON.parse(raw);
    if (!d.overrides) d.overrides = {};
    if (!d.swaps) d.swaps = {};
    return d;
  } catch (e) {
    return { overrides: {}, swaps: {} };
  }
}

function saveData_(data) {
  PropertiesService.getScriptProperties().setProperty(PROP_KEY, JSON.stringify(data));
}

function todayStr_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function pruneOld_(data) {
  var cutoff = todayStr_();
  Object.keys(data.overrides).forEach(function (d) {
    if (d < cutoff) delete data.overrides[d];
  });
  Object.keys(data.swaps).forEach(function (d) {
    if (d < cutoff) delete data.swaps[d];
  });
}

function clearSwapDate_(data, date) {
  if (data.swaps[date]) {
    var other = data.swaps[date];
    delete data.swaps[date];
    delete data.swaps[other];
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var data = getData_();
  pruneOld_(data);
  saveData_(data);
  return json_(data);
}

function doPost(e) {
  var data = getData_();
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad json' });
  }
  var action = body.action;

  if (action === 'setOverride') {
    if (!body.date) return json_({ ok: false, error: 'missing date' });
    data.overrides[body.date] = [body.meal1 || '', body.meal2 || ''];
  } else if (action === 'clearOverride') {
    delete data.overrides[body.date];
  } else if (action === 'setSwap') {
    if (!body.dateA || !body.dateB || body.dateA === body.dateB) {
      return json_({ ok: false, error: 'need two distinct dates' });
    }
    clearSwapDate_(data, body.dateA);
    clearSwapDate_(data, body.dateB);
    data.swaps[body.dateA] = body.dateB;
    data.swaps[body.dateB] = body.dateA;
  } else if (action === 'clearSwap') {
    clearSwapDate_(data, body.date);
  } else {
    return json_({ ok: false, error: 'unknown action' });
  }

  pruneOld_(data);
  saveData_(data);
  return json_({ ok: true, data: data });
}
