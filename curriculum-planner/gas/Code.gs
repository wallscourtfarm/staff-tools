// WFA 39 Week Curriculum Planner — backend
// Deploy as: Execute as Me · Who has access: Anyone
// Each year group's data is stored as a Script Property keyed wfa_cp_Y1 … wfa_cp_Y6

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';

  if (action === 'load') {
    const all = PropertiesService.getScriptProperties().getProperties();
    const out = {};
    Object.keys(all).forEach(function(k) {
      if (k.indexOf('wfa_cp_') === 0) {
        try { out[k] = JSON.parse(all[k]); } catch(_) {}
      }
    });
    return json({ ok: true, data: out });
  }

  return json({ ok: true, msg: 'WFA Curriculum Planner backend' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (!body.key || body.key.indexOf('wfa_cp_') !== 0) {
      return json({ ok: false, error: 'invalid key' });
    }
    PropertiesService.getScriptProperties()
      .setProperty(body.key, JSON.stringify(body.data));
    return json({ ok: true });
  } catch(err) {
    return json({ ok: false, error: err.message });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
