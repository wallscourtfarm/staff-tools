// ════════════════════════════════════════════════
// WFA Reading Challenge — Apps Script Backend
// Deploy as Web App: Execute as Me, Access Anyone
// ════════════════════════════════════════════════

const SS = SpreadsheetApp.openById('1l8ZNNUd4jdXeVisB7ZEhz7N8ipW7GL4UQh6fWD9_XGY');

// So the browser never needs a child's own PP/EAL flag: the Children sheet
// no longer stores them at all (migrated 13.09.26) and computeDemographics_
// fetches them live from the canonical roster hub, joins by name, and
// returns only group totals.
const HUB_ROSTER_URL = 'https://script.google.com/macros/s/AKfycbxHg89VK1uqbWAJcqruqJFjEaavdWN74eB1KS-U_cMr75oVsBVZSi2X38l018oOYW7-4w/exec';
const HUB_TOKEN = PropertiesService.getScriptProperties().getProperty('HUB_TOKEN') || ''; // Script Property, never in the code

function nameKey_(name) {
  return String(name || '').trim().toLowerCase();
}

function fetchRosterFlags_() {
  const res = UrlFetchApp.fetch(HUB_ROSTER_URL + '?action=getPupils&token=' + HUB_TOKEN, { muteHttpExceptions: true });
  const d = JSON.parse(res.getContentText());
  const byName = {};
  (d.pupils || []).forEach(function (p) {
    byName[nameKey_(p.first + ' ' + p.last)] = { eal: !!p.eal, pp: !!p.pp, sen: p.sen || null };
  });
  return byName;
}

// Light shared token (see shared-sync/sync-script.gs). Set the SHARED_TOKEN
// Script Property to raise the bar; default matches the shipped client.
function tokenOK(e) {
  const want = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return (((e || {}).parameter || {}).token || '') === want;
}

// alreadyLocked is true only when doPost calls this having already taken the
// script lock — see dispatch()/getAllCached_() for why that matters.
function doGet(e, alreadyLocked) {
  try {
    if (!tokenOK(e)) return outJson_({ error: 'unauthorised' });
    const params = e.parameter;
    let payload = {};
    if (params.payload) {
      payload = JSON.parse(params.payload);
      if (!payload.action && params.action) payload.action = params.action;
    } else {
      payload = Object.assign({}, params);
      if (!payload.action) payload.action = 'getAll';
    }
    const result = dispatch(payload, !!alreadyLocked);
    return outJson_(result);
  } catch(err) {
    return outJson_({ error: err.message });
  }
}

function outJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// POST bodies (used by the certificates tool for markIssued and importData)
// carry JSON in e.postData.body — doGet above only reads query parameters, so
// merge any JSON body over the query params before dispatching.
// Every write action here (checkout/returnBook/setCopyStatus/etc.) reads all
// rows, looks a key up, then appendRow's or setValue's based on that lookup —
// with no lock, two concurrent requests (two devices checking books out at
// once) can both read before either writes, so both decide a row is "new"
// and append duplicates, or one silently loses an update. Serializing every
// POST closes that gap (reads via plain GET are unaffected and stay fast).
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return outJson_({ error: 'locked, try again' });
  }
  try {
    const body = (e && e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
    const result = doGet({ parameter: Object.assign({}, (e && e.parameter) || {}, body) }, true);
    // Cheap and always-safe: clear the getAll cache after every POST so the
    // next read (this device's own, or anyone else's) isn't served a stale
    // pre-write snapshot. Harmless no-op when the action was itself a read.
    invalidateGetAllCache_();
    return result;
  } catch(err) {
    return outJson_({ error: err.message });
  } finally {
    lock.releaseLock();
  }
}

// alreadyLocked (see doGet) is threaded through to getAllCached_ so it never
// tries to take the script lock a second time from inside doPost's own hold
// of it — LockService is not reentrant within one execution, so that would
// deadlock for the full waitLock timeout (found and fixed live in
// shared-sync/sync-script.gs the same day — see its readMasterPupilsUncached_
// comment for the full story).
// ── Write verification (19.09.26 reliability sweep) ──────────────────────
// The other staff-tools backends touched in that sweep all learned the same
// lesson: a bare {ok:true} after setValue/appendRow only means "no exception
// was thrown", not that the Sheet actually holds the new value. These wrap
// the pupil/staff-facing single-record writes below (checkout, return, add/
// update book, copy status, cover override, copy counts, quiz attempts) so
// a silent Sheets-side failure comes back as a real error instead of a
// false "ok:true" — the shared client-side sync code already retries on an
// {"error":...} response. Bulk import/admin actions (importChildren,
// importBooks, bulkImportReads, clearData) are left as-is: lower frequency,
// already visible when they fail, and a per-row verify would meaningfully
// slow down imports of hundreds of rows.
const WRITE_BACKUP_CAP = 100;

function getWriteBackupSheet_() {
  let sh = SS.getSheetByName('WriteBackupLog');
  if (!sh) sh = SS.insertSheet('WriteBackupLog');
  return sh;
}

// Snapshots the row/cell about to be overwritten. Never called for a plain
// append (checkout, addBook, submitQuizAttempt) — nothing existing is at
// risk there. Wrapped in try/catch on principle: a failed backup must never
// block the real write that follows it.
function backupPreviousValue_(sheetName, a1Notation, previousValue) {
  try {
    const sh = getWriteBackupSheet_();
    sh.appendRow([new Date().toISOString(), sheetName, a1Notation, previousValue]);
    const lastRow = sh.getLastRow();
    if (lastRow > WRITE_BACKUP_CAP) sh.deleteRows(1, lastRow - WRITE_BACKUP_CAP);
  } catch (err) {
    // Never let a failed backup block the real write.
  }
}

function valueMatches_(actual, expected) {
  return actual === expected || String(actual) === String(expected);
}

// setValue, then read straight back and compare — the only way to know the
// write actually reached the Sheet. Throws on mismatch, which doPost's
// existing try/catch already turns into {"error": ...} for the client.
function setValueVerified_(sheetName, range, value, previousValue) {
  if (previousValue !== undefined) backupPreviousValue_(sheetName, range.getA1Notation(), previousValue);
  range.setValue(value);
  const actual = range.getValue();
  if (!valueMatches_(actual, value)) {
    throw new Error('write verification failed: ' + sheetName + '!' + range.getA1Notation() + ' does not contain what was just written');
  }
}

// appendRow, then read the row straight back and compare every cell.
// Returns the appended row number.
function appendRowVerified_(sheet, sheetName, values) {
  sheet.appendRow(values);
  const lastRow = sheet.getLastRow();
  const actual = sheet.getRange(lastRow, 1, 1, values.length).getValues()[0];
  for (let i = 0; i < values.length; i++) {
    if (!valueMatches_(actual[i], values[i])) {
      throw new Error('write verification failed: ' + sheetName + ' row ' + lastRow + ' does not match what was sent');
    }
  }
  return lastRow;
}

function dispatch(p, alreadyLocked) {
  switch(p.action) {
    case 'getAll':           return getAllCached_(alreadyLocked);
    case 'checkout':         return checkout(p);
    case 'returnBook':       return returnBook(p);
    case 'addBook':          return addBook(p);
    case 'updateBook':       return updateBook(p);
    case 'setup':            return setup();
    case 'setCopyStatus':    return setCopyStatus(p);
    case 'setCoverOverride': return setCoverOverride(p);
    case 'saveCopyCounts':   return saveCopyCounts(p);
    case 'importChildren':   return importChildren(p);
    case 'importData':       return p.children ? importChildren({ children: p.children }) : importBooks({ books: p.books });
    case 'importBooks':      return importBooks(p);
    case 'bulkImportReads':  return bulkImportReads(p);
    case 'clearData':        return clearData(p);
    case 'certsIssued':      return getCertsIssued();
    case 'markIssued':       return markCertsIssued(p);
    case 'rawSheet':         return rawSheet(p);
    case 'fixSchema':        return fixSchema();
    case 'testWrite':        return testWrite(p);
    case 'submitQuizAttempt': return submitQuizAttempt(p);
    case 'getQuizCandidates': return getQuizCandidates(p);
    default: return { error: 'Unknown action: ' + p.action };
  }
}

// ════════════════════════════════════════════════
// QUIZ ATTEMPT LOGGING
// ════════════════════════════════════════════════
// QuizAttempts headers: id, childId, bookId, checkoutId, score, total,
// passed, override, overrideBy, overrideReason, timestamp.
// Every attempt is logged — pass, fail, or staff override — for audit:
// which child passed which book's quiz, failed attempts, and who signed
// off any override and why. Called via doPost (POST) so it goes through
// the same LockService lock as other writes.
function submitQuizAttempt(p) {
  const sh = SS.getSheetByName('QuizAttempts') || SS.insertSheet('QuizAttempts');
  if (sh.getLastRow() === 0) sh.appendRow(['id', 'childId', 'bookId', 'checkoutId', 'score', 'total', 'passed', 'override', 'overrideBy', 'overrideReason', 'timestamp']);
  appendRowVerified_(sh, 'QuizAttempts', [
    'QA' + Date.now(),
    String(p.childId || ''),
    String(p.bookId || ''),
    String(p.checkoutId || ''),
    (p.score === null || p.score === undefined) ? '' : Number(p.score),
    Number(p.total || 5),
    p.passed === true,
    p.override === true,
    String(p.overrideBy || ''),
    String(p.overrideReason || ''),
    new Date().toISOString()
  ]);
  return { ok: true };
}

// ════════════════════════════════════════════════
// CERTIFICATE ISSUE TRACKING
// ════════════════════════════════════════════════
// CertIssues headers: childId, milestone, issuedOn (DD/MM/YYYY), issuedBy
function markCertsIssued(p) {
  const sh = SS.getSheetByName('CertIssues') || SS.insertSheet('CertIssues');
  if (sh.getLastRow() === 0) sh.appendRow(['childId', 'milestone', 'issuedOn', 'issuedBy']);
  const by = String(p.issuedBy || '');
  const items = p.items || [];
  items.forEach(it => {
    sh.appendRow([String(it.childId || ''), String(it.ms || ''), new Date().toLocaleDateString('en-GB'), by]);
  });
  return { ok: true, count: items.length };
}

function getCertsIssued() {
  const sh = SS.getSheetByName('CertIssues');
  if (!sh) return { ok: true, certIssues: [] };
  const rows = sh.getDataRange().getValues();
  const hdr = rows[0].map(h => String(h).trim().toLowerCase());
  const iId = hdr.indexOf('childid'), iMs = hdr.indexOf('milestone'), iOn = hdr.indexOf('issuedon');
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row[iId]) continue;
    out.push({ childId: String(row[iId]), ms: String(row[iMs] || ''), issuedOn: String(row[iOn] || '') });
  }
  return { ok: true, certIssues: out };
}

// ── Full-dump cache ──────────────────────────────────────────────────────
// getAll() opened 5 sheets fresh (plus a live UrlFetchApp roster call) on
// every plain doGet, same shape as the cover-plan-state slowness bug —
// added 18.09.26. The response measures ~137KB as JSON, over CacheService's
// 100KB per-key cap, so it's split across numbered chunks under one TTL —
// same pattern already proven in reading-tracker/backend/Code.js.
const GETALL_CACHE_TTL_SECONDS = 15;
const GETALL_CHUNK_SIZE = 90000;
const GETALL_META_KEY = 'bt_getall_meta';

function readCachedGetAllChunks_(cache) {
  const meta = cache.get(GETALL_META_KEY);
  if (meta === null) return null;
  const n = Number(meta);
  const keys = [];
  for (let i = 0; i < n; i++) keys.push('bt_getall_' + i);
  const got = cache.getAll(keys);
  let combined = '';
  for (let i = 0; i < n; i++) {
    const chunk = got['bt_getall_' + i];
    if (chunk === undefined) return null; // partial expiry — treat as a miss
    combined += chunk;
  }
  return combined;
}

function invalidateGetAllCache_() {
  CacheService.getScriptCache().remove(GETALL_META_KEY);
}

// alreadyLocked: true when the caller (doPost) already holds the script
// lock — skip taking a second one (see the dispatch() comment above).
function getAllCached_(alreadyLocked) {
  const cache = CacheService.getScriptCache();
  const hit = readCachedGetAllChunks_(cache);
  if (hit !== null) return JSON.parse(hit);

  function computeAndCache() {
    const recheck = readCachedGetAllChunks_(cache);
    if (recheck !== null) return JSON.parse(recheck);
    const result = getAll();
    const json = JSON.stringify(result);
    const cacheValues = {};
    let n = 0;
    for (let i = 0; i < json.length; i += GETALL_CHUNK_SIZE) {
      cacheValues['bt_getall_' + n] = json.slice(i, i + GETALL_CHUNK_SIZE);
      n++;
    }
    cacheValues[GETALL_META_KEY] = String(n);
    cache.putAll(cacheValues, GETALL_CACHE_TTL_SECONDS);
    return result;
  }

  if (alreadyLocked) return computeAndCache();

  // A cold cache still means every concurrent request misses at the same
  // instant and would otherwise all hit the sheets together — the exact
  // contention this exists to avoid. The lock serializes just the actual
  // read: one request reads and populates the cache, the rest wait briefly
  // then get it from cache instead of piling on too.
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return computeAndCache();
  } finally {
    lock.releaseLock();
  }
}

// ════════════════════════════════════════════════
// GET ALL
// ════════════════════════════════════════════════
function getAll() {
  const childSheet    = SS.getSheetByName('Children');
  const bookSheet     = SS.getSheetByName('Books');
  const checkoutSheet = SS.getSheetByName('Checkouts');
  const coverSheet    = SS.getSheetByName('CoverOverrides');
  const readsSheet    = SS.getSheetByName('Reads');

  // ── Children ──
  const childRows = childSheet.getDataRange().getValues();
  const childHdr  = childRows[0].map(h => String(h).trim().toLowerCase());
  const iId  = childHdr.indexOf('id');
  const iNm  = childHdr.indexOf('name');
  const iYr  = childHdr.indexOf('yeargroup');
  const iCl  = childHdr.indexOf('class');
  const iGen = childHdr.indexOf('gender');
  const iTR  = childHdr.indexOf('totalreads');
  const iLR  = childHdr.indexOf('lks2reads');

  const children = {};
  for (let r = 1; r < childRows.length; r++) {
    const row = childRows[r];
    if (!row[iId]) continue;
    const id = String(row[iId]);
    children[id] = {
      id,
      name:            String(row[iNm]  || ''),
      yearGroup:       String(row[iYr]  || ''),
      class:           String(row[iCl]  || ''),
      gender:          String(row[iGen] || ''),
      totalReads:      Number(row[iTR]  || 0),
      lks2Reads:       iLR >= 0 ? Number(row[iLR] || 0) : 0,
      booksRead:       [],
      activeCheckouts: []
    };
  }

  // ── Reads (book titles per child) ──
  if (readsSheet) {
    const readsRows = readsSheet.getDataRange().getValues();
    const rHdr = readsRows[0].map(h => String(h).trim().toLowerCase());
    const rCId = rHdr.indexOf('childid');
    const rBk  = rHdr.indexOf('booktitle');
    const rDt  = rHdr.indexOf('dateread');
    for (let r = 1; r < readsRows.length; r++) {
      const row = readsRows[r];
      if (!row[rCId]) continue;
      const cid = String(row[rCId]);
      if (children[cid]) {
        children[cid].booksRead.push({
          title:    String(row[rBk] || ''),
          dateRead: String(row[rDt] || '')
        });
      }
    }
  }

  // ── Books ──
  const bookRows = bookSheet.getDataRange().getValues();
  const bHdr = bookRows[0].map(h => String(h).trim().toLowerCase());
  const bId = bHdr.indexOf('id');
  const bTi = bHdr.indexOf('title');
  const bAu = bHdr.indexOf('author');
  const bPh = bHdr.indexOf('phase');
  const bCo = bHdr.indexOf('copies');

  const books = {};
  for (let r = 1; r < bookRows.length; r++) {
    const row = bookRows[r];
    if (!row[bId]) continue;
    const id = String(row[bId]);
    books[id] = {
      id,
      title:        String(row[bTi] || ''),
      author:       String(row[bAu] || ''),
      phase:        String(row[bPh] || ''),
      totalCopies:  Number(row[bCo] || 1),
      copies:       [],
      available:    0,
      totalBorrows: 0
    };
  }

  Object.values(books).forEach(b => {
    for (let i = 1; i <= b.totalCopies; i++) {
      b.copies.push({ copyNum: i, available: true, lost: false, childId: null, checkoutId: null, checkoutDate: null });
    }
    b.available = b.totalCopies;
  });

  // ── Checkouts ──
  const coRows = checkoutSheet ? checkoutSheet.getDataRange().getValues() : [];
  const cHdr   = coRows.length ? coRows[0].map(h => String(h).trim().toLowerCase()) : [];
  const cId  = cHdr.indexOf('id');
  const cCh  = cHdr.indexOf('childid');
  const cBk  = cHdr.indexOf('bookid');
  const cCp  = cHdr.indexOf('copynum');
  const cDt  = cHdr.indexOf('checkoutdate');
  const cRt  = cHdr.indexOf('returndate');
  const cCm  = cHdr.indexOf('completed');
  const cLst = cHdr.indexOf('lost');

  for (let r = 1; r < coRows.length; r++) {
    const row = coRows[r];
    if (!row[cId]) continue;
    const checkoutId   = String(row[cId]);
    const childId      = String(row[cCh]);
    const bookId       = String(row[cBk]);
    const copyNum      = Number(row[cCp]);
    const checkoutDate = String(row[cDt] || '');
    const returnDate   = String(row[cRt] || '');
    const completed    = row[cCm] === true || String(row[cCm]).toUpperCase() === 'TRUE';
    const lost         = row[cLst] === true || String(row[cLst]).toUpperCase() === 'TRUE';

    if (returnDate) {
      if (books[bookId]) books[bookId].totalBorrows++;
      continue;
    }

    const book = books[bookId];
    if (book) {
      const copy = book.copies.find(c => c.copyNum === copyNum);
      if (copy && !lost) {
        copy.available    = false;
        copy.childId      = childId;
        copy.checkoutId   = checkoutId;
        copy.checkoutDate = checkoutDate;
        book.available    = Math.max(0, book.available - 1);
      }
      if (!lost) book.totalBorrows++;
    }

    if (children[childId]) {
      children[childId].activeCheckouts.push({ checkoutId, bookId, copyNum, checkoutDate });
    }
  }

  // ── Cover overrides ──
  const coverOverrides = {};
  if (coverSheet) {
    const cvRows = coverSheet.getDataRange().getValues();
    for (let r = 1; r < cvRows.length; r++) {
      if (cvRows[r][0] && cvRows[r][1]) coverOverrides[String(cvRows[r][0])] = String(cvRows[r][1]);
    }
  }

  const childList = Object.values(children);
  const demographics = computeDemographics_(childList);
  // PP/EAL are fetched live inside computeDemographics_ and never attached
  // to a child object at all — nothing to strip before this goes to the
  // browser.

  return {
    children: childList,
    demographics: demographics,
    books:    Object.values(books),
    coverOverrides,
    certIssues: getCertsIssued().certIssues,
    homeQuizScores: getHomeQuizScores()
  };
}

// Group counts + average totalReads for PP/non-PP and EAL/non-EAL — fetched
// live from the roster hub and joined by name (the Children sheet no longer
// stores its own copy of these flags at all), computed once here so the
// dashboard never needs a child's own flag.
function computeDemographics_(childList) {
  const roster = fetchRosterFlags_();
  function group(pred) {
    const matched = childList.filter(pred);
    const n = matched.length;
    const avg = n ? matched.reduce(function (s, c) { return s + (c.totalReads || 0); }, 0) / n : 0;
    return { n: n, avgReads: Math.round(avg * 10) / 10 };
  }
  const isPP = function (c) { const f = roster[nameKey_(c.name)]; return !!(f && f.pp); };
  const isEAL = function (c) { const f = roster[nameKey_(c.name)]; return !!(f && f.eal); };
  return {
    pp:    group(isPP),
    nonPp: group(function (c) { return !isPP(c); }),
    eal:    group(isEAL),
    nonEal: group(function (c) { return !isEAL(c); })
  };
}

// checkoutId -> {checkoutId, score, total} for the latest real (non-override)
// QuizAttempts row on that checkout — lets the return flow skip re-quizzing
// a book whose reading check was already taken at home via the QR page, and
// shows staff the score so they can judge whether it's worth a conversation.
// Not a pass/fail gate: any score here still completes the read.
function getHomeQuizScores() {
  const sh = SS.getSheetByName('QuizAttempts');
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  const hdr = rows[0].map(h => String(h).trim().toLowerCase());
  const iCo = hdr.indexOf('checkoutid'), iSc = hdr.indexOf('score'),
        iTo = hdr.indexOf('total'), iOv = hdr.indexOf('override');
  const byCheckout = {};
  for (let r = 1; r < rows.length; r++) {
    const co = String(rows[r][iCo] || '');
    const isOverride = rows[r][iOv] === true || String(rows[r][iOv]).toUpperCase() === 'TRUE';
    const scoreRaw = rows[r][iSc];
    if (!co || isOverride || scoreRaw === '' || scoreRaw === null || scoreRaw === undefined) continue;
    byCheckout[co] = { checkoutId: co, score: Number(scoreRaw), total: Number(rows[r][iTo] || 5) };
  }
  return Object.values(byCheckout);
}

// ════════════════════════════════════════════════
// QUIZ CANDIDATES — for the pupil-facing reading-quiz QR page. Given a
// bookId, returns only the children who CURRENTLY have that exact book
// checked out (narrow fields: no PP/EAL/gender) — a child can only ever
// discover names of other children holding the same book, never the full
// roster, and can't be quizzed for a book they don't actually have.
// ════════════════════════════════════════════════
function getQuizCandidates(p) {
  const bookId = String(p.bookId || '');
  if (!bookId) return { error: 'bookId required' };

  const bookSheet = SS.getSheetByName('Books');
  const bRows = bookSheet.getDataRange().getValues();
  const bHdr  = bRows[0].map(h => String(h).trim().toLowerCase());
  const bId = bHdr.indexOf('id'), bTi = bHdr.indexOf('title');
  let bookTitle = null;
  for (let r = 1; r < bRows.length; r++) {
    if (String(bRows[r][bId]) === bookId) { bookTitle = String(bRows[r][bTi] || ''); break; }
  }
  if (bookTitle === null) return { error: 'Unknown book' };

  const coSheet = SS.getSheetByName('Checkouts');
  const coRows  = coSheet ? coSheet.getDataRange().getValues() : [];
  const coHdr   = coRows.length ? coRows[0].map(h => String(h).trim().toLowerCase()) : [];
  const cBk = coHdr.indexOf('bookid'), cCh = coHdr.indexOf('childid'), cRt = coHdr.indexOf('returndate'), cId = coHdr.indexOf('id');
  const checkoutByChild = {};
  for (let r = 1; r < coRows.length; r++) {
    const row = coRows[r];
    if (String(row[cBk]) !== bookId || row[cRt]) continue; // wrong book, or already returned
    checkoutByChild[String(row[cCh])] = String(row[cId]);
  }
  const wanted = Object.keys(checkoutByChild);
  if (!wanted.length) return { ok: true, bookTitle, candidates: [] };

  const chSheet = SS.getSheetByName('Children');
  const chRows  = chSheet.getDataRange().getValues();
  const chHdr   = chRows[0].map(h => String(h).trim().toLowerCase());
  const iId = chHdr.indexOf('id'), iNm = chHdr.indexOf('name'), iYr = chHdr.indexOf('yeargroup'), iCl = chHdr.indexOf('class');
  const wantedSet = new Set(wanted);
  const candidates = [];
  for (let r = 1; r < chRows.length; r++) {
    const id = String(chRows[r][iId]);
    if (!wantedSet.has(id)) continue;
    candidates.push({
      childId: id,
      name: String(chRows[r][iNm] || ''),
      yearGroup: String(chRows[r][iYr] || ''),
      class: String(chRows[r][iCl] || ''),
      checkoutId: checkoutByChild[id]
    });
  }
  return { ok: true, bookTitle, candidates };
}

// ════════════════════════════════════════════════
// CHECKOUT
// ════════════════════════════════════════════════
function checkout(p) {
  const sheet = SS.getSheetByName('Checkouts');
  const id    = 'CO' + Date.now();
  const date  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  appendRowVerified_(sheet, 'Checkouts', [id, p.childId, p.bookId, p.copyNum, date, '', false, false]);
  return { ok: true, checkoutId: id };
}

// ════════════════════════════════════════════════
// RETURN
// ════════════════════════════════════════════════
function returnBook(p) {
  const coSheet = SS.getSheetByName('Checkouts');
  const chSheet = SS.getSheetByName('Children');
  const rows    = coSheet.getDataRange().getValues();
  const hdr     = rows[0].map(h => String(h).trim().toLowerCase());
  const iId     = hdr.indexOf('id');
  const iRt     = hdr.indexOf('returndate');
  const iCm     = hdr.indexOf('completed');
  const iCh     = hdr.indexOf('childid');

  for (let r = 1; r < rows.length; r++) {
    if (String(rows[r][iId]) === String(p.checkoutId)) {
      const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
      setValueVerified_('Checkouts', coSheet.getRange(r + 1, iRt + 1), date, rows[r][iRt]);
      setValueVerified_('Checkouts', coSheet.getRange(r + 1, iCm + 1), p.completed === true, rows[r][iCm]);

      let milestone = null;
      if (p.completed) {
        const childId = String(rows[r][iCh]);
        const chRows  = chSheet.getDataRange().getValues();
        const chHdr   = chRows[0].map(h => String(h).trim().toLowerCase());
        const ciId    = chHdr.indexOf('id');
        const ciTR    = chHdr.indexOf('totalreads');
        for (let cr = 1; cr < chRows.length; cr++) {
          if (String(chRows[cr][ciId]) === childId) {
            const newTotal = Number(chRows[cr][ciTR] || 0) + 1;
            setValueVerified_('Children', chSheet.getRange(cr + 1, ciTR + 1), newTotal, chRows[cr][ciTR]);
            if ([5, 10, 15, 20, 25].indexOf(newTotal) !== -1) milestone = newTotal;
            break;
          }
        }
      }
      return { ok: true, milestone: milestone };
    }
  }
  return { error: 'Checkout not found' };
}

// ════════════════════════════════════════════════
// ADD CHILD
// ════════════════════════════════════════════════
// Children only ever enter via importChildren/importData, called from
// syncHubRoster (hub-sourced, additive-only — see index.html). No
// addChild/updateChild/deleteChild here: identity comes from Bromcom only.

// ════════════════════════════════════════════════
// ADD BOOK
// ════════════════════════════════════════════════
function addBook(p) {
  const sheet = SS.getSheetByName('Books');
  const id    = 'BK' + Date.now();
  appendRowVerified_(sheet, 'Books', [id, p.title, p.author || '', p.phase || 'LKS2', p.copies || 1]);
  return { ok: true, id };
}

// Fixes a book's title/author/phase/copies without touching its id (and
// therefore without touching QUIZ_DATA, Checkouts, or QuizAttempts, which
// are all keyed by id). Pass only the fields you want changed.
function updateBook(p) {
  const bookId = String(p.bookId || '');
  if (!bookId) return { error: 'bookId required' };
  const sheet = SS.getSheetByName('Books');
  const rows  = sheet.getDataRange().getValues();
  const hdr   = rows[0].map(h => String(h).trim().toLowerCase());
  const iId = hdr.indexOf('id'), iTi = hdr.indexOf('title'), iAu = hdr.indexOf('author'),
        iPh = hdr.indexOf('phase'), iCo = hdr.indexOf('copies');
  for (let r = 1; r < rows.length; r++) {
    if (String(rows[r][iId]) !== bookId) continue;
    if (p.title  !== undefined) setValueVerified_('Books', sheet.getRange(r + 1, iTi + 1), p.title, rows[r][iTi]);
    if (p.author !== undefined) setValueVerified_('Books', sheet.getRange(r + 1, iAu + 1), p.author, rows[r][iAu]);
    if (p.phase  !== undefined) setValueVerified_('Books', sheet.getRange(r + 1, iPh + 1), p.phase, rows[r][iPh]);
    if (p.copies !== undefined) setValueVerified_('Books', sheet.getRange(r + 1, iCo + 1), Number(p.copies), rows[r][iCo]);
    return { ok: true };
  }
  return { error: 'Book not found' };
}

// ════════════════════════════════════════════════
// SET COPY STATUS
// ════════════════════════════════════════════════
function setCopyStatus(p) {
  const coSheet = SS.getSheetByName('Checkouts');
  const rows    = coSheet.getDataRange().getValues();
  const hdr     = rows[0].map(h => String(h).trim().toLowerCase());
  const iBk     = hdr.indexOf('bookid');
  const iCp     = hdr.indexOf('copynum');
  const iLst    = hdr.indexOf('lost');
  const iRt     = hdr.indexOf('returndate');
  for (let r = 1; r < rows.length; r++) {
    if (String(rows[r][iBk]) === String(p.bookId) && Number(rows[r][iCp]) === Number(p.copyNum) && !rows[r][iRt]) {
      setValueVerified_('Checkouts', coSheet.getRange(r + 1, iLst + 1), p.lost === true, rows[r][iLst]);
      return { ok: true };
    }
  }
  if (p.lost) {
    const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    appendRowVerified_(coSheet, 'Checkouts', ['CO' + Date.now(), '', p.bookId, p.copyNum, date, '', false, true]);
  }
  return { ok: true };
}

// ════════════════════════════════════════════════
// COVER OVERRIDE
// ════════════════════════════════════════════════
function setCoverOverride(p) {
  const sheet = SS.getSheetByName('CoverOverrides');
  const rows  = sheet.getDataRange().getValues();
  for (let r = 1; r < rows.length; r++) {
    if (String(rows[r][0]) === String(p.bookId)) {
      if (p.url) {
        setValueVerified_('CoverOverrides', sheet.getRange(r + 1, 2), p.url, rows[r][1]);
      } else {
        backupPreviousValue_('CoverOverrides', 'row ' + (r + 1) + ' (' + p.bookId + ')', rows[r][1]);
        sheet.deleteRow(r + 1);
        const stillThere = sheet.getDataRange().getValues().some(function (row) { return String(row[0]) === String(p.bookId); });
        if (stillThere) throw new Error('write verification failed: CoverOverrides row for ' + p.bookId + ' was not removed');
      }
      return { ok: true };
    }
  }
  if (p.url) appendRowVerified_(sheet, 'CoverOverrides', [p.bookId, p.url]);
  return { ok: true };
}

// ════════════════════════════════════════════════
// SAVE COPY COUNTS
// ════════════════════════════════════════════════
function saveCopyCounts(p) {
  const sheet  = SS.getSheetByName('Books');
  const rows   = sheet.getDataRange().getValues();
  const hdr    = rows[0].map(h => String(h).trim().toLowerCase());
  const iId    = hdr.indexOf('id');
  const iCo    = hdr.indexOf('copies');
  const counts = p.counts || {};
  for (let r = 1; r < rows.length; r++) {
    const id = String(rows[r][iId]);
    if (counts[id] !== undefined) setValueVerified_('Books', sheet.getRange(r + 1, iCo + 1), Number(counts[id]), rows[r][iCo]);
  }
  return { ok: true };
}

// ════════════════════════════════════════════════
// IMPORT CHILDREN (bulk)
// ════════════════════════════════════════════════
function importChildren(p) {
  const sheet = SS.getSheetByName('Children');
  let added = 0;
  (p.children || []).forEach(c => {
    const id = 'CH' + Date.now() + Math.floor(Math.random() * 9999);
    sheet.appendRow([id, c.name, c.yearGroup, c.class || '', c.gender || '', c.totalReads || 0]);
    added++;
    Utilities.sleep(10);
  });
  return { ok: true, added };
}

// ════════════════════════════════════════════════
// IMPORT BOOKS (bulk)
// ════════════════════════════════════════════════
function importBooks(p) {
  const sheet = SS.getSheetByName('Books');
  let added = 0;
  (p.books || []).forEach(b => {
    const id = 'BK' + Date.now() + Math.floor(Math.random() * 9999);
    sheet.appendRow([id, b.title, b.author || '', b.phase || 'LKS2', b.copies || 1]);
    added++;
    Utilities.sleep(10);
  });
  return { ok: true, added };
}

// ════════════════════════════════════════════════
// BULK IMPORT READS
// p.reads = [{childId, bookTitle, dateRead}]
// p.updateTotals = {childId: count}
// ════════════════════════════════════════════════
function bulkImportReads(p) {
  let readsSheet = SS.getSheetByName('Reads');
  if (!readsSheet) {
    readsSheet = SS.insertSheet('Reads');
    readsSheet.appendRow(['childId', 'bookTitle', 'dateRead']);
  }
  const items = p.reads || [];
  items.forEach(item => {
    readsSheet.appendRow([item.childId, item.bookTitle, item.dateRead || '']);
  });

  if (p.updateTotals) {
    const chSheet = SS.getSheetByName('Children');
    const chRows  = chSheet.getDataRange().getValues();
    const chHdr   = chRows[0].map(h => String(h).trim().toLowerCase());
    const ciId    = chHdr.indexOf('id');
    const ciTR    = chHdr.indexOf('totalreads');
    const totals  = p.updateTotals;
    for (let r = 1; r < chRows.length; r++) {
      const cid = String(chRows[r][ciId]);
      if (totals[cid] !== undefined) chSheet.getRange(r + 1, ciTR + 1).setValue(totals[cid]);
    }
  }
  return { ok: true, added: items.length };
}

// ════════════════════════════════════════════════
// SETUP (first time)
// ════════════════════════════════════════════════
function setup() {
  const schemas = {
    'Children':       ['id','name','yearGroup','class','pp','eal','gender','totalReads','lks2Reads'],
    'Books':          ['id','title','author','phase','copies'],
    'Checkouts':      ['id','childId','bookId','copyNum','checkoutDate','returnDate','completed','lost'],
    'CoverOverrides': ['bookId','url'],
    'Reads':          ['childId','bookTitle','dateRead']
  };
  Object.entries(schemas).forEach(([name, headers]) => {
    let s = SS.getSheetByName(name);
    if (!s) s = SS.insertSheet(name);
    const lastCol = s.getLastColumn();
    if (lastCol === 0) {
      s.appendRow(headers);
    } else {
      const existing = s.getRange(1, 1, 1, lastCol).getValues()[0]
        .map(h => String(h).trim().toLowerCase());
      headers.forEach(h => {
        if (!existing.includes(h.toLowerCase())) {
          const nc = s.getLastColumn();
          s.getRange(1, nc + 1).setValue(h);
          SpreadsheetApp.flush();
        }
      });
    }
  });
  return { ok: true, message: 'Setup complete — sheets ready' };
}

// ════════════════════════════════════════════════
// CLEAR DATA — wipe data rows (keep headers) from sheets
// p.sheets = ['Children','Reads'] etc., default = both
// ════════════════════════════════════════════════
function fixSchema() {
  const fixes = {
    'Children': ['id','name','yearGroup','class','gender','totalReads','lks2Reads'],
    'Books':    ['id','title','author','phase','copies'],
    'Reads':    ['childId','bookTitle','dateRead'],
    'Checkouts':['id','childId','bookId','copyNum','checkoutDate','returnDate','completed','lost'],
    'CoverOverrides': ['bookId','url']
  };
  const result = {};
  Object.entries(fixes).forEach(([name, hdr]) => {
    const s = SS.getSheetByName(name);
    if (!s) { result[name] = 'not found'; return; }
    s.getRange(1, 1, 1, hdr.length).setValues([hdr]);
    const lastCol = s.getLastColumn();
    if (lastCol > hdr.length) s.deleteColumns(hdr.length + 1, lastCol - hdr.length);
    result[name] = { ok: true, lastRow: s.getLastRow() };
  });
  return { ok: true, result };
}

function testWrite(p) {
  const s = SS.getSheetByName('Children');
  const cell = s.getRange(2, 8);
  const before = cell.getValue();
  cell.setValue(99);
  SpreadsheetApp.flush();
  const after = cell.getValue();
  return { before, after, ssId: SS.getId() };
}

function rawSheet(p) {
  const s = SS.getSheetByName(p.sheet || 'Children');
  if (!s) return { error: 'sheet not found' };
  const lastRow = s.getLastRow(), lastCol = s.getLastColumn();
  const rows = lastRow > 0 ? s.getRange(1, 1, Math.min(lastRow, 5), lastCol).getValues() : [];
  return { lastRow, lastCol, rows };
}

function clearData(p) {
  // Children never gets wiped here — that sheet only ever changes via
  // importChildren/importData from the Bromcom-sourced hub roster.
  const requested = (p.sheets && p.sheets.length) ? p.sheets : ['Reads'];
  const targets = requested.filter(name => name !== 'Children');
  const cleared = {};
  targets.forEach(name => {
    const s = SS.getSheetByName(name);
    if (!s) return;
    const lastRow = s.getLastRow();
    if (lastRow > 1) {
      s.deleteRows(2, lastRow - 1);
    }
    cleared[name] = lastRow - 1;
  });
  return { ok: true, cleared };
}
