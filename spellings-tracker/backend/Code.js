// WFA Spellings Tracker — Google Apps Script
// Deploy as web app (Execute as: Me, Access: Anyone with link)
// Sheet tabs needed: Pupils, Weeks, Results, Config
//
// Every row-based tab is year-group-scoped: the first column is
// "yearGroup", and a save only ever replaces that year group's own rows,
// leaving every other year group's rows in the same tab untouched. Older
// rows written before this existed have no yearGroup column at all — they
// are treated as implicitly 'Y5' (the only year group this backend ever
// stored before today) wherever they're read, and get normalised to the
// new format automatically the next time ANY year group is saved, so
// there's no separate migration step to run.

const SS_ID = '15MMgd9FT8xuK0DNUqxDj4YTWZC3zpbf91QzHhDkxEUE';
const LEGACY_YEAR_GROUP = 'Y5'; // the only year group this backend ever stored before this file existed

// Shared light token (same scheme as shared-sync/sync-script.gs). Token comes
// in the query string, never headers, because the client omits Content-Type on
// POSTs to avoid the Apps Script CORS preflight.
function tokenOK(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!((e || {}).parameter || {}).token &&
    e.parameter.token === expected;
}

function denied() {
  return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorised' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  return SpreadsheetApp.openById(SS_ID);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ── Year-group-scoped tab helpers ────────────────────────────────────────────
// A tab is "legacy" if its header's first cell isn't literally "yearGroup" —
// meaning every existing row in it predates this scoping and is implicitly
// LEGACY_YEAR_GROUP.
function readTabRaw_(ss, tabName) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return { sheet: null, header: [], rows: [], legacy: false };
  const all = sheet.getDataRange().getValues();
  if (!all.length) return { sheet: sheet, header: [], rows: [], legacy: false };
  const header = all[0].map(String);
  const legacy = header[0] !== 'yearGroup';
  return { sheet: sheet, header: header, rows: all.slice(1), legacy: legacy };
}

// Rows belonging to a specific year group, with the yearGroup column
// stripped back off — i.e. exactly the shape the tab had before scoping.
function rowsForYear_(ss, tabName, yearGroup) {
  const t = readTabRaw_(ss, tabName);
  if (!t.rows.length) return [];
  const out = [];
  t.rows.forEach(function (row) {
    const dataRow = t.legacy ? row : row.slice(1);
    if (!dataRow[0]) return; // blank row (no id/key in the first data column)
    const rowYg = t.legacy ? LEGACY_YEAR_GROUP : String(row[0] || LEGACY_YEAR_GROUP);
    if (rowYg !== yearGroup) return;
    out.push(dataRow);
  });
  return out;
}

// Every row in the tab across ALL year groups, as {yearGroup, row} pairs
// with the yearGroup column already stripped from `row` — used by the
// aggregate action, which needs to see every year group at once.
function allRowsAcrossYears_(ss, tabName) {
  const t = readTabRaw_(ss, tabName);
  if (!t.rows.length) return [];
  const out = [];
  t.rows.forEach(function (row) {
    const isBlank = row.every(function (v) { return v === '' || v === null; });
    if (isBlank) return;
    const rowYg = t.legacy ? LEGACY_YEAR_GROUP : String(row[0] || LEGACY_YEAR_GROUP);
    out.push({ yearGroup: rowYg, row: t.legacy ? row : row.slice(1) });
  });
  return out;
}

// Replace one year group's rows in a tab, preserving every other year
// group's rows exactly (normalising any legacy rows to the new format in
// the same pass — this is the one-time migration, applied lazily).
function writeYearScoped_(ss, tabName, dataHeader, yearGroup, newDataRows) {
  const t = readTabRaw_(ss, tabName);
  const keptRows = [];
  t.rows.forEach(function (row) {
    const isBlank = row.every(function (v) { return v === '' || v === null; });
    if (isBlank) return;
    const rowYg = t.legacy ? LEGACY_YEAR_GROUP : String(row[0] || LEGACY_YEAR_GROUP);
    if (rowYg === yearGroup) return; // being replaced below
    const dataRow = t.legacy ? row : row.slice(1);
    keptRows.push([rowYg].concat(dataRow));
  });
  const newRows = newDataRows.map(function (r) { return [yearGroup].concat(r); });
  const header = ['yearGroup'].concat(dataHeader);
  const allRows = [header].concat(keptRows, newRows);
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);
  sheet.clearContents();
  if (allRows.length) sheet.getRange(1, 1, allRows.length, header.length).setValues(allRows);
}

// ── GET handler ──────────────────────────────────────────────────────────────
function doGet(e) {
  if (!tokenOK(e)) return denied();
  const action = (e.parameter.action || 'loadAll');
  if (action === 'loadAll') return loadAll(e.parameter.yearGroup || LEGACY_YEAR_GROUP);
  if (action === 'getGroupStats') {
    try { return json_(getGroupStats_()); }
    catch (err) { return json_({ error: String(err), stack: err.stack || '' }); }
  }
  return json_({ error: 'Unknown action' });
}

// ── POST handler ─────────────────────────────────────────────────────────────
function doPost(e) {
  if (!tokenOK(e)) return denied();
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'saveAll';
    const yearGroup = data.yearGroup || LEGACY_YEAR_GROUP;

    if (action === 'saveAll') return saveAll(yearGroup, data);
    if (action === 'savePupils') return saveTab_('Pupils', ['id', 'firstName', 'lastName', 'class', 'pairId', 'ttSet', 'ssUser', 'ssPassword', 'masteredWords', 'failedWords'], yearGroup, buildPupilRows(data.pupils));
    if (action === 'saveResults') return saveTab_('Results', resultsHeader_(), yearGroup, buildResultRows(data.assessments));

    return json_({ error: 'Unknown action' });
  } catch (err) {
    return json_({ error: err.message });
  }
}

function resultsHeader_() {
  return ['id', 'pupilId', 'date', 'score', 'total',
    'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10',
    'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];
}

// ── Load one year group's tabs ───────────────────────────────────────────────
function loadAll(yearGroup) {
  const ss = getSheet();
  const out = { pupils: [], weeks: [], results: [], config: {} };

  try {
    const pHdr = ['id', 'firstName', 'lastName', 'class', 'pairId', 'ttSet', 'ssUser', 'ssPassword', 'masteredWords', 'failedWords'];
    out.pupils = rowsForYear_(ss, 'Pupils', yearGroup).map(function (row) {
      const obj = {};
      pHdr.forEach(function (h, i) { obj[h] = row[i]; });
      obj.mastery = {};
      if (obj.masteredWords) String(obj.masteredWords).split(',').forEach(function (w) {
        const word = w.trim().toLowerCase(); if (word) obj.mastery[word] = true;
      });
      if (obj.failedWords) String(obj.failedWords).split(',').forEach(function (w) {
        const word = w.trim().toLowerCase(); if (word) obj.mastery[word] = false;
      });
      delete obj.masteredWords; delete obj.failedWords;
      obj.pairId = obj.pairId === '' || obj.pairId === null ? null : Number(obj.pairId);
      if (isNaN(obj.pairId)) obj.pairId = null;
      return obj;
    });
  } catch (e) { out.pupils = []; }

  try {
    const wHdr = ['id', 'label', 'ruleId'];
    out.weeks = rowsForYear_(ss, 'Weeks', yearGroup).map(function (row) {
      const obj = {}; wHdr.forEach(function (h, i) { obj[h] = row[i]; }); return obj;
    });
  } catch (e) { out.weeks = []; }

  try {
    const rHdr = resultsHeader_();
    out.results = rowsForYear_(ss, 'Results', yearGroup).map(function (row) {
      const obj = {}; rHdr.forEach(function (h, i) { obj[h] = row[i]; });
      obj.words = [];
      for (let n = 1; n <= 10; n++) {
        const w = obj['w' + n], c = obj['c' + n];
        if (w) obj.words.push({ word: String(w), correct: c === 'Y' || c === true || c === 1, response: '' });
      }
      for (let n = 1; n <= 10; n++) { delete obj['w' + n]; delete obj['c' + n]; }
      obj.score = Number(obj.score) || 0;
      obj.total = Number(obj.total) || 0;
      return obj;
    });
  } catch (e) { out.results = []; }

  try {
    const cHdr = ['key', 'value'];
    rowsForYear_(ss, 'Config', yearGroup).forEach(function (row) {
      const key = row[0];
      if (key) out.config[String(key)] = row[1];
    });
  } catch (e) {}

  return json_(out);
}

// ── Save one year group's tabs ───────────────────────────────────────────────
function saveAll(yearGroup, data) {
  if (data.pupils) {
    writeYearScoped_(getSheet(), 'Pupils', ['id', 'firstName', 'lastName', 'class', 'pairId', 'ttSet', 'ssUser', 'ssPassword', 'masteredWords', 'failedWords'], yearGroup, buildPupilRows(data.pupils));
  }
  if (data.weeks) {
    const rows = data.weeks.map(function (w) { return [w.id, w.label || '', w.ruleId || '']; });
    writeYearScoped_(getSheet(), 'Weeks', ['id', 'label', 'ruleId'], yearGroup, rows);
  }
  if (data.assessments) {
    writeYearScoped_(getSheet(), 'Results', resultsHeader_(), yearGroup, buildResultRows(data.assessments));
  }
  if (data.config) {
    const rows = Object.keys(data.config).map(function (k) { return [k, String(data.config[k])]; });
    writeYearScoped_(getSheet(), 'Config', ['key', 'value'], yearGroup, rows);
  }
  return json_({ status: 'ok' });
}

function saveTab_(tabName, dataHeader, yearGroup, rows) {
  writeYearScoped_(getSheet(), tabName, dataHeader, yearGroup, rows);
  return json_({ status: 'ok' });
}

// ── Build pupil rows (flatten mastery into mastered/failed word lists) ───────
function buildPupilRows(pupils) {
  return pupils.map(function (p) {
    const mastered = [], failed = [];
    if (p.mastery) Object.keys(p.mastery).forEach(function (w) {
      if (p.mastery[w] === true) mastered.push(w);
      else if (p.mastery[w] === false) failed.push(w);
    });
    return [
      p.id, p.firstName, p.lastName, p.class,
      p.pairId === null || p.pairId === undefined ? '' : p.pairId,
      p.ttSet || '', p.ssUser || '', p.ssPassword || '',
      mastered.join(', '), failed.join(', ')
    ];
  });
}

// ── Build result rows (flatten words into w1-w10 / c1-c10 columns) ───────────
function buildResultRows(assessments) {
  return assessments.map(function (a) {
    const r = [a.id, a.pupilId, a.date, a.score, a.total];
    for (let n = 0; n < 10; n++) { const w = a.words && a.words[n] ? a.words[n] : null; r.push(w ? w.word : ''); }
    for (let n = 0; n < 10; n++) { const w = a.words && a.words[n] ? a.words[n] : null; r.push(w ? (w.correct ? 'Y' : 'N') : ''); }
    return r;
  });
}

// ── GROUP STATS (server-side aggregation) ───────────────────────────────────
// So the browser never needs a pupil's own EAL/PP/SEN flag to show
// group-level spelling stats — only the finished totals leave this
// backend. The canonical flags are fetched here, combined with this
// tool's own results across every year group, and discarded once the
// aggregate is computed.
const HUB_ROSTER_URL = 'https://script.google.com/macros/s/AKfycbxHg89VK1uqbWAJcqruqJFjEaavdWN74eB1KS-U_cMr75oVsBVZSi2X38l018oOYW7-4w/exec';
const HUB_TOKEN = '050d7ae1a6b52eafa7d19b80c844dea8d20d1f678274fe05';

function nameKey_(first, last) {
  return String(first || '').trim().toLowerCase() + ' ' + String(last || '').trim().toLowerCase();
}

function fetchRosterFlags_() {
  const res = UrlFetchApp.fetch(HUB_ROSTER_URL + '?action=getPupils&token=' + HUB_TOKEN, { muteHttpExceptions: true });
  const d = JSON.parse(res.getContentText());
  const byName = {};
  (d.pupils || []).forEach(function (p) {
    byName[nameKey_(p.first, p.last)] = { eal: !!p.eal, pp: !!p.pp, sen: p.sen || null };
  });
  return byName;
}

function pctBucket_() {
  return { s: 0, n: 0 };
}

function addPct_(bucket, score, total) {
  if (!total) return;
  bucket.s += (score / total) * 100;
  bucket.n++;
}

function finishBucket_(b) {
  return { n: b.n, avgPct: b.n ? Math.round((b.s / b.n) * 10) / 10 : null };
}

function getGroupStats_() {
  const ss = getSheet();
  const roster = fetchRosterFlags_();

  // pupilId -> name, across every year group's Pupils rows
  const pHdr = ['id', 'firstName', 'lastName', 'class', 'pairId', 'ttSet', 'ssUser', 'ssPassword', 'masteredWords', 'failedWords'];
  const nameByPupilId = {};
  allRowsAcrossYears_(ss, 'Pupils').forEach(function (entry) {
    const obj = {}; pHdr.forEach(function (h, i) { obj[h] = entry.row[i]; });
    if (obj.id) nameByPupilId[String(obj.id)] = nameKey_(obj.firstName, obj.lastName);
  });

  // average % score by PP/EAL/SEN (and each complement) across every
  // year group's Results rows
  const rHdr = resultsHeader_();
  const g = {
    pp: pctBucket_(), nonPp: pctBucket_(),
    eal: pctBucket_(), nonEal: pctBucket_(),
    sen: pctBucket_(), nonSen: pctBucket_()
  };
  allRowsAcrossYears_(ss, 'Results').forEach(function (entry) {
    const obj = {}; rHdr.forEach(function (h, i) { obj[h] = entry.row[i]; });
    const name = nameByPupilId[String(obj.pupilId)];
    if (!name) return;
    const flags = roster[name];
    if (!flags) return;
    const score = Number(obj.score) || 0;
    const total = Number(obj.total) || 0;
    addPct_(flags.pp ? g.pp : g.nonPp, score, total);
    addPct_(flags.eal ? g.eal : g.nonEal, score, total);
    addPct_(flags.sen ? g.sen : g.nonSen, score, total);
  });

  return {
    pp: finishBucket_(g.pp), nonPp: finishBucket_(g.nonPp),
    eal: finishBucket_(g.eal), nonEal: finishBucket_(g.nonEal),
    sen: finishBucket_(g.sen), nonSen: finishBucket_(g.nonSen)
  };
}
