// Teaching Schedule — Cross-device sync via Google Apps Script
// Deploy as a web app, then paste the URL into index.html's SYNC_URL constant.

const PREFIX = 'ts_'; // property key prefix to avoid collisions

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'save' && payload.weekKey) {
      const yg = payload.yearGroup || 'Y4';
      const key = PREFIX + yg + '_' + payload.weekKey;
      PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(payload.data));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
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
    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}