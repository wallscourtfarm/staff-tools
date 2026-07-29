// SLT Schedule — Cross-device sync via Google Apps Script
// Deploy as a web app (Execute as: Me, Access: Anyone), then paste the URL
// into index.html's SYNC_URL constant.

const SLT_KEY = 'wfa_slt_state';

function doPost(e) {
  try {
    PropertiesService.getScriptProperties().setProperty(SLT_KEY, e.postData.contents);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const data = PropertiesService.getScriptProperties().getProperty(SLT_KEY);
    return ContentService.createTextOutput(data || '{}')
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput('{}')
      .setMimeType(ContentService.MimeType.JSON);
  }
}
