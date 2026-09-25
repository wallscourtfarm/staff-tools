const SHEET_NAME = 'TrackerData';

// Shared light token (same scheme as shared-sync/sync-script.gs). Token comes
// in the query string, never headers, because clients omit Content-Type on
// these fetches to avoid CORS preflights.
function tokenOK(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!(e && e.parameter && e.parameter.token && e.parameter.token === expected);
}

// ── Full-dump cache ──────────────────────────────────────────────────────
// TrackerData has grown to ~3,750+ rows (~240KB as JSON) — every plain
// doGet (what every client's pullFromCloud() calls each sync) used to
// re-scan the whole sheet with no caching at all, and under real classroom
// concurrency this was measured taking 30-50s per request (13.09.26,
// matching the same request-serialization ceiling already fixed for
// shared-sync and spelling-games on 11.09.26 — see those for the pattern
// this mirrors). CacheService caps a single value at 100KB, so the ~240KB
// payload is split across numbered chunks under one TTL.
const FULL_DUMP_CACHE_TTL_SECONDS = 20;
const FULL_DUMP_CHUNK_SIZE = 90000;
const FULL_DUMP_META_KEY = 'rt_dump_meta';

function readCachedChunks_(cache) {
  const meta = cache.get(FULL_DUMP_META_KEY);
  if (meta === null) return null;
  const n = Number(meta);
  const keys = [];
  for (let i = 0; i < n; i++) keys.push('rt_dump_' + i);
  const got = cache.getAll(keys);
  let combined = '';
  for (let i = 0; i < n; i++) {
    const chunk = got['rt_dump_' + i];
    if (chunk === undefined) return null; // partial expiry — treat as a miss
    combined += chunk;
  }
  return combined;
}

function getCachedFullDump_() {
  const cache = CacheService.getScriptCache();
  const hit = readCachedChunks_(cache);
  if (hit !== null) return hit;

  // A cold cache still means every concurrent request misses at the same
  // instant and would otherwise all hit the sheet together — the exact
  // contention this exists to avoid. The lock serializes just the actual
  // sheet read: one request reads and populates the cache, the rest wait
  // briefly then get it from cache instead of piling onto the sheet too.
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const recheck = readCachedChunks_(cache);
    if (recheck !== null) return recheck;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return '{}';
    const data = sheet.getDataRange().getValues();
    const result = {};
    for (const row of data) {
      if (row[0]) result[String(row[0])] = String(row[1]);
    }
    const json = JSON.stringify(result);

    const cacheValues = {};
    let n = 0;
    for (let i = 0; i < json.length; i += FULL_DUMP_CHUNK_SIZE) {
      cacheValues['rt_dump_' + n] = json.slice(i, i + FULL_DUMP_CHUNK_SIZE);
      n++;
    }
    cacheValues[FULL_DUMP_META_KEY] = String(n);
    cache.putAll(cacheValues, FULL_DUMP_CACHE_TTL_SECONDS);

    return json;
  } finally {
    lock.releaseLock();
  }
}

// Called after any real write so the writer's own next pull isn't served a
// stale cached dump for up to FULL_DUMP_CACHE_TTL_SECONDS — cheap to clear
// the meta key alone; orphaned chunk entries just expire on their own TTL.
function invalidateFullDumpCache_() {
  CacheService.getScriptCache().remove(FULL_DUMP_META_KEY);
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
const HUB_TOKEN = PropertiesService.getScriptProperties().getProperty('HUB_TOKEN') || ''; // Script Property, never in the code
const RT_YEAR_GROUPS = ['Y3', 'Y4', 'Y5', 'Y6'];
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6'];
const TW = { 'Term 1': 8, 'Term 2': 8, 'Term 3': 8, 'Term 4': 8, 'Term 5': 6, 'Term 6': 7 };

// Added 18.09.26 — a plain UrlFetchApp round-trip to shared-sync on every
// single call from getDashboardStats_/getClassGroupStats_/getPupilTermTotals_,
// even though the roster only changes via a termly admin import. Short cache
// avoids paying the network round-trip 3x whenever the stats modal opens
// (dashboard + class breakdown + term totals typically fire together).
const ROSTER_FLAGS_CACHE_TTL_SECONDS = 30;
function fetchRosterFlags_() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'rt_rosterFlags_v1';
  const cached = cache.get(cacheKey);
  if (cached !== null) return JSON.parse(cached);
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
  try { cache.put(cacheKey, JSON.stringify(byYr), ROSTER_FLAGS_CACHE_TTL_SECONDS); } catch (err) { /* too large — skip */ }
  return byYr;
}

// { yr: { cls: { term: { pupilKey: { week: value } } } } } — parsed straight
// from this tool's own rt2:yr:cls:term:pupil:week rows.
//
// Added 18.09.26 — this used to run its own getDataRange().getValues() scan
// of the ~3,750-row TrackerData sheet, on top of the *same sheet* already
// being read and chunk-cached by getCachedFullDump_() for the plain doGet
// path. Building the tree from that existing cached dump instead means the
// three stats endpoints (getDashboardStats/getClassGroupStats/
// getPupilTermTotals) never scan the sheet themselves at all.
function readScoreTree_() {
  const flat = JSON.parse(getCachedFullDump_());
  const tree = {};
  Object.keys(flat).forEach(function (key) {
    if (key.indexOf('rt2:') !== 0) return;
    const parts = key.split(':');
    if (parts.length < 6) return;
    const yr = parts[1], cls = parts[2], term = parts[3], pupil = parts[4], week = parts[5];
    const raw = flat[key];
    if (raw === '' || raw === null || raw === undefined) return;
    const val = Number(raw);
    if (isNaN(val)) return;
    tree[yr] = tree[yr] || {};
    tree[yr][cls] = tree[yr][cls] || {};
    tree[yr][cls][term] = tree[yr][cls][term] || {};
    tree[yr][cls][term][pupil] = tree[yr][cls][term][pupil] || {};
    tree[yr][cls][term][pupil][week] = val;
  });
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

// One class+term's average reads by PP/EAL/SEN, both for the whole term
// and for one specific week — powers the stats modal's group-averages
// bars (term) and its this-week breakdown. Never returns a per-pupil row.
function getClassGroupStats_(e) {
  const yr = e.parameter.yr, cls = e.parameter.cls, term = e.parameter.term || 'Term 1';
  const weekIdx = (parseInt(e.parameter.week, 10) || 1) - 1;
  const roster = fetchRosterFlags_();
  const scores = readScoreTree_();
  const pupils = ((roster[yr] || {})[cls]) || {};
  const totals = pupilTermTotals_(scores, yr, cls, term);
  const mkGroup = function () { return { eal: { s: 0, n: 0 }, pp: { s: 0, n: 0 }, sen: { s: 0, n: 0 } }; };
  const termG = mkGroup(), weekG = mkGroup();
  Object.keys(totals).forEach(function (pk) {
    const f = pupils[pk];
    if (!f) return;
    const tot = totals[pk];
    const wv = pupilWeekValue_(scores, yr, cls, term, pk, weekIdx);
    if (f.eal) { termG.eal.s += tot; termG.eal.n++; weekG.eal.s += wv; weekG.eal.n++; }
    if (f.pp) { termG.pp.s += tot; termG.pp.n++; weekG.pp.s += wv; weekG.pp.n++; }
    if (f.sen) { termG.sen.s += tot; termG.sen.n++; weekG.sen.s += wv; weekG.sen.n++; }
  });
  return { term: termG, week: weekG };
}

// Per-pupil term totals for a whole year group, keyed by class then pupil
// name — the one place this backend deliberately returns a per-pupil
// figure (a score only, never PP/EAL/SEN), for an external aggregator
// (the DOOYA tracker) to pull and join against its own UPN-keyed roster by
// name. Every other endpoint here stays aggregate-only on purpose; this is
// a narrow, additive exception scoped to one year group's term totals.
function getPupilTermTotals_(e) {
  const yr = e.parameter.yr;
  const term = e.parameter.term || 'Term 1';
  if (!yr) return { error: 'yr parameter required' };
  const roster = fetchRosterFlags_();
  const scores = readScoreTree_();
  const classes = Object.keys(roster[yr] || {});
  const out = {};
  classes.forEach(function (cls) {
    out[cls] = pupilTermTotals_(scores, yr, cls, term);
  });
  return { yr: yr, term: term, classes: out };
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
  if (e.parameter && e.parameter.action === 'getPupilTermTotals') {
    try {
      return ContentService.createTextOutput(JSON.stringify(getPupilTermTotals_(e)))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: String(err), stack: err.stack || '' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(getCachedFullDump_())
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Write verification (19.09.26 reliability sweep) ─────────────────────
// Every other tool touched in the sweep learned the same lesson: "no
// exception was thrown" is not proof a write actually reached the Sheet.
// These wrap doPost's row writes so a silent Sheets-side failure comes
// back to the client as a real {"error":...} — which flushSync() in
// index.html already knows how to detect and retry (see its res.text()
// check) — instead of being reported "✓ Synced" when nothing landed.
var BACKUP_COUNT = 100;

function getBackupSheet_(ss) {
  var sh = ss.getSheetByName('TrackerBackupLog');
  if (!sh) sh = ss.insertSheet('TrackerBackupLog');
  return sh;
}

// Snapshots the row about to be overwritten, never the appended (new) case
// — there's nothing existing to lose there. Wrapped in try/catch on
// principle: a backup step must never block the real write that follows.
function backupPreviousRow_(ss, key, previousValue, previousTs) {
  try {
    var sh = getBackupSheet_(ss);
    sh.appendRow([new Date().toISOString(), key, previousValue, previousTs]);
    var lastRow = sh.getLastRow();
    if (lastRow > BACKUP_COUNT) sh.deleteRows(1, lastRow - BACKUP_COUNT);
  } catch (err) {
    // Never let a failed backup block the real write.
  }
}

function rowMatches_(sheet, row, expected) {
  var actual = sheet.getRange(row, 1, 1, expected.length).getValues()[0];
  for (var i = 0; i < expected.length; i++) {
    if (String(actual[i]) !== String(expected[i])) return false;
  }
  return true;
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
    const failedKeys = [];
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
        const row = found.getRow();
        const prevRow = sheet.getRange(row, 1, 1, 3).getValues()[0];
        const existingTs = Number(prevRow[2]) || 0;
        if (ts < existingTs) continue;
        backupPreviousRow_(ss, key, prevRow[1], prevRow[2]);
        sheet.getRange(row, 2, 1, 2).setValues([[value, ts]]);
        if (!rowMatches_(sheet, row, [key, value, ts])) failedKeys.push(key);
      } else {
        sheet.appendRow([key, value, ts]);
        if (!rowMatches_(sheet, sheet.getLastRow(), [key, value, ts])) failedKeys.push(key);
      }
    }
    if (Object.keys(payload).length) invalidateFullDumpCache_();
    if (failedKeys.length) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'write verification failed for: ' + failedKeys.join(', ') }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}