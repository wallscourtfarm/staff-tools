const SHEET_NAME = 'TrackerData';

// Shared light token (same scheme as shared-sync/sync-script.gs). Token comes
// in the query string, never headers, because clients omit Content-Type on
// these fetches to avoid CORS preflights.
function tokenOK(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!(e && e.parameter && e.parameter.token && e.parameter.token === expected);
}

// Teacher "backdoor" PIN (logo triple-tap on the tracker) — scoped to this
// tool only, deliberately separate from shared-sync's STAFF_PIN. The page is
// already behind Cloudflare Access, so this PIN's job is just to stop a pupil
// on a shared classroom device wandering into edit mode, not to gate access
// on its own. Value lives in this project's own Script Properties.
function checkPin_(e) {
  const want = PropertiesService.getScriptProperties().getProperty('TEACHER_PIN');
  const pin = (e && e.parameter && e.parameter.pin) || '';
  const ok = !!want && pin === want;
  return ContentService.createTextOutput(JSON.stringify({ ok: ok }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GROUP STATS (server-side aggregation) ───────────────────
// So the browser never needs a pupil's own EAL/PP/SEN flag to show
// group-level reading stats — only the finished totals leave this
// backend. The canonical flags are fetched here, combined with this
// tool's own score data, and discarded once the aggregate is computed.
const HUB_ROSTER_URL = 'https://script.google.com/macros/s/AKfycbxHg89VK1uqbWAJcqruqJFjEaavdWN74eB1KS-U_cMr75oVsBVZSi2X38l018oOYW7-4w/exec';
const HUB_TOKEN = '050d7ae1a6b52eafa7d19b80c844dea8d20d1f678274fe05';
const RT_YEAR_GROUPS = ['Y3', 'Y4', 'Y5', 'Y6'];
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6'];
const TW = { 'Term 1': 8, 'Term 2': 8, 'Term 3': 8, 'Term 4': 8, 'Term 5': 6, 'Term 6': 7 };

function fetchRosterFlags_() {
  const res = UrlFetchApp.fetch(HUB_ROSTER_URL + '?action=getPupils&token=' + HUB_TOKEN, { muteHttpExceptions: true });
  const d = JSON.parse(res.getContentText());
  const byYr = {};
  (d.pupils || []).forEach(function (p) {
    const yg = p.yearGroup || '';
    if (RT_YEAR_GROUPS.indexOf(yg) < 0) return;
    const cls = p.class || '';
    const key = p.first + ' ' + p.last;
    byYr[yg] = byYr[yg] || {};
    byYr[yg][cls] = byYr[yg][cls] || {};
    byYr[yg][cls][key] = { eal: !!p.eal, pp: !!p.pp, sen: p.sen || null };
  });
  return byYr;
}

// { yr: { cls: { term: { pupilKey: { week: value } } } } } — parsed straight
// from this tool's own rt2:yr:cls:term:pupil:week rows.
function readScoreTree_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const tree = {};
  if (!sheet) return tree;
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    const key = String(data[i][0] || '');
    if (key.indexOf('rt2:') !== 0) continue;
    const parts = key.split(':');
    if (parts.length < 6) continue;
    const yr = parts[1], cls = parts[2], term = parts[3], pupil = parts[4], week = parts[5];
    const raw = data[i][1];
    if (raw === '' || raw === null || raw === undefined) continue;
    const val = Number(raw);
    if (isNaN(val)) continue;
    tree[yr] = tree[yr] || {};
    tree[yr][cls] = tree[yr][cls] || {};
    tree[yr][cls][term] = tree[yr][cls][term] || {};
    tree[yr][cls][term][pupil] = tree[yr][cls][term][pupil] || {};
    tree[yr][cls][term][pupil][week] = val;
  }
  return tree;
}

function pupilTermTotals_(scores, yr, cls, term) {
  const nw = TW[term] || 8;
  const byPupil = ((scores[yr] || {})[cls] || {})[term] || {};
  const out = {};
  Object.keys(byPupil).forEach(function (pupilKey) {
    let tot = 0;
    for (let w = 0; w < nw; w++) {
      const v = byPupil[pupilKey][String(w)];
      if (v !== undefined && v !== null) tot += v;
    }
    out[pupilKey] = tot;
  });
  return out;
}

function pupilWeekValue_(scores, yr, cls, term, pupilKey, weekIdx) {
  const byPupil = ((scores[yr] || {})[cls] || {})[term] || {};
  const v = (byPupil[pupilKey] || {})[String(weekIdx)];
  return (v === undefined || v === null) ? 0 : v;
}

// School + per-year-group totals (this week / this term / all terms),
// broken down by PP/EAL/SEN — powers the main dashboard and the
// year-group summary cards. Never returns a per-pupil row.
function getDashboardStats_(e) {
  const term = e.parameter.term || 'Term 1';
  const weekIdx = (parseInt(e.parameter.week, 10) || 1) - 1;
  const roster = fetchRosterFlags_();
  const scores = readScoreTree_();
  const FLAGS = ['pp', 'eal', 'sen'];
  const termIdx = TERMS.indexOf(term);

  const years = {};
  RT_YEAR_GROUPS.forEach(function (yr) {
    const classes = Object.keys(roster[yr] || {});
    let yrWeek = 0, yrYearTotal = 0;
    let nEAL = 0, nPP = 0, nSEN = 0;
    const byTermGroup = {
      pp: TERMS.map(function () { return 0; }),
      eal: TERMS.map(function () { return 0; }),
      sen: TERMS.map(function () { return 0; })
    };
    const classPills = [];

    classes.forEach(function (cls) {
      const pupils = roster[yr][cls] || {};
      Object.keys(pupils).forEach(function (pk) {
        if (pupils[pk].eal) nEAL++;
        if (pupils[pk].pp) nPP++;
        if (pupils[pk].sen) nSEN++;
      });

      TERMS.forEach(function (t, ti) {
        const totals = pupilTermTotals_(scores, yr, cls, t);
        let classTermTot = 0;
        Object.keys(totals).forEach(function (pk) {
          const tot = totals[pk];
          classTermTot += tot;
          const f = pupils[pk];
          if (f) {
            if (f.pp) byTermGroup.pp[ti] += tot;
            if (f.eal) byTermGroup.eal[ti] += tot;
            if (f.sen) byTermGroup.sen[ti] += tot;
          }
        });
        yrYearTotal += classTermTot;
        if (t === term) classPills.push({ name: cls, term: classTermTot });
      });

      Object.keys(pupils).forEach(function (pk) {
        yrWeek += pupilWeekValue_(scores, yr, cls, term, pk, weekIdx);
      });
    });

    const yrTermTotal = classPills.reduce(function (s, c) { return s + c.term; }, 0);
    years[yr] = {
      week: yrWeek, term: yrTermTotal, year: yrYearTotal,
      classes: classPills, nEAL: nEAL, nPP: nPP, nSEN: nSEN,
      byTermGroup: byTermGroup
    };
  });

  const school = { week: 0, term: 0, year: 0, byGroupWeek: {}, byGroupTerm: {}, byGroupYear: {} };
  FLAGS.forEach(function (f) { school.byGroupWeek[f] = 0; school.byGroupTerm[f] = 0; school.byGroupYear[f] = 0; });
  RT_YEAR_GROUPS.forEach(function (yr) {
    const yd = years[yr];
    if (!yd) return;
    school.week += yd.week; school.term += yd.term; school.year += yd.year;
    FLAGS.forEach(function (f) {
      school.byGroupTerm[f] += yd.byTermGroup[f][termIdx] || 0;
      school.byGroupYear[f] += yd.byTermGroup[f].reduce(function (a, b) { return a + b; }, 0);
    });
  });
  RT_YEAR_GROUPS.forEach(function (yr) {
    Object.keys(roster[yr] || {}).forEach(function (cls) {
      const pupils = roster[yr][cls] || {};
      Object.keys(pupils).forEach(function (pk) {
        const v = pupilWeekValue_(scores, yr, cls, term, pk, weekIdx);
        if (!v) return;
        const f = pupils[pk];
        if (f.pp) school.byGroupWeek.pp += v;
        if (f.eal) school.byGroupWeek.eal += v;
        if (f.sen) school.byGroupWeek.sen += v;
      });
    });
  });

  return { school: school, years: years };
}

// One class+term's average reads by PP/EAL/SEN — powers the stats
// modal's group-averages bars. Never returns a per-pupil row.
function getClassGroupStats_(e) {
  const yr = e.parameter.yr, cls = e.parameter.cls, term = e.parameter.term || 'Term 1';
  const roster = fetchRosterFlags_();
  const scores = readScoreTree_();
  const pupils = ((roster[yr] || {})[cls]) || {};
  const totals = pupilTermTotals_(scores, yr, cls, term);
  const g = { eal: { s: 0, n: 0 }, pp: { s: 0, n: 0 }, sen: { s: 0, n: 0 } };
  Object.keys(totals).forEach(function (pk) {
    const f = pupils[pk];
    if (!f) return;
    const tot = totals[pk];
    if (f.eal) { g.eal.s += tot; g.eal.n++; }
    if (f.pp) { g.pp.s += tot; g.pp.n++; }
    if (f.sen) { g.sen.s += tot; g.sen.n++; }
  });
  return g;
}

function doGet(e) {
  if (!tokenOK(e)) {
    return ContentService.createTextOutput('{"error":"unauthorised"}')
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter && e.parameter.action === 'checkPin') {
    return checkPin_(e);
  }
  if (e.parameter && e.parameter.action === 'getDashboardStats') {
    try {
      return ContentService.createTextOutput(JSON.stringify(getDashboardStats_(e)))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: String(err), stack: err.stack || '' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  if (e.parameter && e.parameter.action === 'getClassGroupStats') {
    try {
      return ContentService.createTextOutput(JSON.stringify(getClassGroupStats_(e)))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: String(err), stack: err.stack || '' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput('{}').setMimeType(ContentService.MimeType.JSON);
  const data = sheet.getDataRange().getValues();
  const result = {};
  for (const row of data) {
    if (row[0]) result[String(row[0])] = String(row[1]);
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!tokenOK(e)) {
    return ContentService.createTextOutput('{"error":"unauthorised"}')
      .setMimeType(ContentService.MimeType.JSON);
  }
  // Multiple laptops can POST within the same second, so without a lock two
  // concurrent doPost calls could both decide a key is "new" and append
  // duplicate rows for it (doGet then returns whichever duplicate happens
  // to sit lower in the sheet), or one write could simply overwrite the
  // other's. Serializing here closes that gap.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return ContentService.createTextOutput('{"error":"locked, try again"}')
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    const payload = JSON.parse(e.postData.contents);
    // The sheet has ~8000 rows and keeps growing — pulling every row's key
    // AND value into memory (getDataRange().getValues()) just to look up a
    // handful of keys was measured at 10+ seconds per write while holding
    // the lock above, which is most of why syncing felt slow and why a slow
    // write could get starved out by another device's write queued behind
    // the same lock. TextFinder searches column A server-side instead, so a
    // typical write (a handful of keys) no longer pays for the whole
    // sheet's size.
    const lastRow = sheet.getLastRow();
    const keyCol = lastRow > 0 ? sheet.getRange(1, 1, lastRow, 1) : null;
    for (const [key, entry] of Object.entries(payload)) {
      // Every write carries the timestamp of the moment it was actually
      // made (set client-side when the user's edit happens, not when the
      // network request fires) as {v, t}. A key already holding a newer
      // timestamp than this write can never be overwritten by it, no
      // matter which device, which race, or which stale/zombie browser tab
      // it comes from — this is what makes "a value reverts to an older
      // one" structurally impossible instead of just unlikely. A bare
      // (non-{v,t}) value is treated as t=0, the lowest priority: it's
      // either a client from before this safeguard shipped, or a
      // low-confidence backfill (see autoMigrateRenamedClasses), and it can
      // only land on a key nothing has written a real timestamp to yet.
      const hasTs = entry && typeof entry === 'object' && 'v' in entry;
      const value = hasTs ? entry.v : entry;
      const ts = hasTs ? (Number(entry.t) || 0) : 0;
      const found = keyCol ? keyCol.createTextFinder(key).matchEntireCell(true).matchCase(true).findNext() : null;
      if (found) {
        const existingTs = Number(sheet.getRange(found.getRow(), 3).getValue()) || 0;
        if (ts < existingTs) continue;
        sheet.getRange(found.getRow(), 2, 1, 2).setValues([[value, ts]]);
      } else {
        sheet.appendRow([key, value, ts]);
      }
    }
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}