var KEY = 'wfa_planner_v1';

function doGet(e) {
  var data = PropertiesService.getScriptProperties().getProperty(KEY);
  return ContentService.createTextOutput(data || 'null')
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  PropertiesService.getScriptProperties().setProperty(KEY, e.postData.contents);
  return ContentService.createTextOutput('{"ok":true}')
    .setMimeType(ContentService.MimeType.JSON);
}