// WFA Spellings Tracker — Google Apps Script
// Deploy as web app (Execute as: Me, Access: Anyone with link)
// Sheet tabs needed: Pupils, Weeks, Results, Config

const SS_ID = '15MMgd9FT8xuK0DNUqxDj4YTWZC3zpbf91QzHhDkxEUE';

function getSheet() {
  return SpreadsheetApp.openById(SS_ID);
}

// ── GET handler ──────────────────────────────────────────────────────────────
function doGet(e) {
  const action = (e.parameter.action || 'loadAll');
  if (action === 'loadAll') return loadAll();
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST handler ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'saveAll';

    if (action === 'saveAll') return saveAll(data);
    if (action === 'savePupils') return saveTab('Pupils', buildPupilRows(data.pupils));
    if (action === 'saveResults') return saveTab('Results', buildResultRows(data.assessments));

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Load all tabs ────────────────────────────────────────────────────────────
function loadAll() {
  const ss = getSheet();
  const out = { pupils: [], weeks: [], results: [], config: {} };

  // Pupils tab
  try {
    const pRows = ss.getSheetByName('Pupils').getDataRange().getValues();
    if (pRows.length > 1) {
      const hdr = pRows[0].map(String);
      out.pupils = pRows.slice(1).filter(r => r[0]).map(r => {
        const obj = {};
        hdr.forEach((h, i) => { if (h) obj[h] = r[i]; });
        // Reconstruct mastery object from masteredWords column
        obj.mastery = {};
        if (obj.masteredWords) {
          String(obj.masteredWords).split(',').forEach(w => {
            const word = w.trim().toLowerCase();
            if (word) obj.mastery[word] = true;
          });
        }
        // Reconstruct failed words from failedWords column
        if (obj.failedWords) {
          String(obj.failedWords).split(',').forEach(w => {
            const word = w.trim().toLowerCase();
            if (word) obj.mastery[word] = false;
          });
        }
        delete obj.masteredWords;
        delete obj.failedWords;
        // Coerce types
        obj.pairId = obj.pairId === '' || obj.pairId === null ? null : Number(obj.pairId);
        if (isNaN(obj.pairId)) obj.pairId = null;
        return obj;
      });
    }
  } catch (e) { out.pupils = []; }

  // Weeks tab
  try {
    const wRows = ss.getSheetByName('Weeks').getDataRange().getValues();
    if (wRows.length > 1) {
      const hdr = wRows[0].map(String);
      out.weeks = wRows.slice(1).filter(r => r[0]).map(r => {
        const obj = {};
        hdr.forEach((h, i) => { if (h) obj[h] = r[i]; });
        return obj;
      });
    }
  } catch (e) { out.weeks = []; }

  // Results tab
  try {
    const rRows = ss.getSheetByName('Results').getDataRange().getValues();
    if (rRows.length > 1) {
      const hdr = rRows[0].map(String);
      out.results = rRows.slice(1).filter(r => r[0]).map(r => {
        const obj = {};
        hdr.forEach((h, i) => { if (h) obj[h] = r[i]; });
        // Reconstruct words array from w1-w10 / c1-c10 columns
        obj.words = [];
        for (let n = 1; n <= 10; n++) {
          const w = obj['w' + n];
          const c = obj['c' + n];
          if (w) {
            obj.words.push({
              word: String(w),
              correct: c === 'Y' || c === true || c === 1,
              response: ''
            });
          }
        }
        // Clean up flat columns
        for (let n = 1; n <= 10; n++) {
          delete obj['w' + n];
          delete obj['c' + n];
        }
        obj.score = Number(obj.score) || 0;
        obj.total = Number(obj.total) || 0;
        return obj;
      });
    }
  } catch (e) { out.results = []; }

  // Config tab
  try {
    const cRows = ss.getSheetByName('Config').getDataRange().getValues();
    if (cRows.length > 1) {
      const hdr = cRows[0].map(String);
      for (let i = 1; i < cRows.length; i++) {
        const key = cRows[i][0];
        const val = cRows[i][1];
        if (key) out.config[String(key)] = val;
      }
    }
  } catch (e) {}

  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Save all tabs ────────────────────────────────────────────────────────────
function saveAll(data) {
  const ss = getSheet();

  // Pupils
  if (data.pupils) {
    writeTab(ss, 'Pupils', buildPupilRows(data.pupils));
  }

  // Weeks
  if (data.weeks) {
    const rows = [['id', 'label', 'ruleId', 'revisionRuleId']];
    data.weeks.forEach(w => rows.push([w.id, w.label || '', w.ruleId || '', w.revisionRuleId || '']));
    writeTab(ss, 'Weeks', rows);
  }

  // Results
  if (data.assessments) {
    writeTab(ss, 'Results', buildResultRows(data.assessments));
  }

  // Config
  if (data.config) {
    const rows = [['key', 'value']];
    Object.keys(data.config).forEach(k => rows.push([k, String(data.config[k])]));
    writeTab(ss, 'Config', rows);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Build pupil rows (flatten mastery into mastered/failed word lists) ───────
function buildPupilRows(pupils) {
  const rows = [['id', 'firstName', 'lastName', 'class', 'pairId', 'tableNum', 'ttSet', 'ssUser', 'ssPassword', 'masteredWords', 'failedWords']];
  pupils.forEach(p => {
    const mastered = [];
    const failed = [];
    if (p.mastery) {
      Object.keys(p.mastery).forEach(w => {
        if (p.mastery[w] === true) mastered.push(w);
        else if (p.mastery[w] === false) failed.push(w);
      });
    }
    rows.push([
      p.id, p.firstName, p.lastName, p.class,
      p.pairId === null || p.pairId === undefined ? '' : p.pairId,
      p.tableNum === null || p.tableNum === undefined ? '' : p.tableNum,
      p.ttSet || '', p.ssUser || '', p.ssPassword || '',
      mastered.join(', '),
      failed.join(', ')
    ]);
  });
  return rows;
}

// ── Build result rows (flatten words into w1-w10 / c1-c10 columns) ───────────
function buildResultRows(assessments) {
  const rows = [['id', 'pupilId', 'date', 'score', 'total',
    'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10',
    'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10']];
  assessments.forEach(a => {
    const r = [a.id, a.pupilId, a.date, a.score, a.total];
    for (let n = 0; n < 10; n++) {
      const w = a.words && a.words[n] ? a.words[n] : null;
      r.push(w ? w.word : '');
    }
    for (let n = 0; n < 10; n++) {
      const w = a.words && a.words[n] ? a.words[n] : null;
      r.push(w ? (w.correct ? 'Y' : 'N') : '');
    }
    rows.push(r);
  });
  return rows;
}

// ── Write rows to a tab (clear first, then write) ────────────────────────────
function writeTab(ss, tabName, rows) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);
  sheet.clearContents();
  const range = sheet.getRange(1, 1, rows.length, rows[0].length);
  range.setValues(rows);
}

// ── Save a single tab (for partial saves) ────────────────────────────────────
function saveTab(tabName, rows) {
  const ss = getSheet();
  writeTab(ss, tabName, rows);
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}