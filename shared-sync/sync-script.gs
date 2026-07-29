// WFA Staff Tools — Shared Sync
// Handles state for multiple tools via a `key` URL parameter.
// GET  ?key=wfa_slt  → returns stored JSON for that tool
// POST ?key=wfa_slt  with JSON body → stores JSON for that tool
//
// Tools using this endpoint:
//   wfa_slt  — SLT Schedule
//   wfa_lc   — Lunch Cover Rota

function doGet(e) {
  try {
    const key = (e.parameter || {}).key;
    if (!key) return json({ error: 'missing key' });
    const data = PropertiesService.getScriptProperties().getProperty(key);
    return ContentService.createTextOutput(data || '{}')
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    const key = (e.parameter || {}).key;
    if (!key) return json({ error: 'missing key' });
    PropertiesService.getScriptProperties().setProperty(key, e.postData.contents);
    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
