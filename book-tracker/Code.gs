// ════════════════════════════════════════════════
// WFA Reading Challenge — Apps Script Backend
// Deploy as Web App: Execute as Me, Access Anyone
// ════════════════════════════════════════════════

const SS = SpreadsheetApp.openById('1l8ZNNUd4jdXeVisB7ZEhz7N8ipW7GL4UQh6fWD9_XGY');

// Light shared token (see shared-sync/sync-script.gs). Set the SHARED_TOKEN
// Script Property to raise the bar; default matches the shipped client.
function tokenOK(e) {
  const want = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return (((e || {}).parameter || {}).token || '') === want;
}

function doGet(e) {
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
    const result = dispatch(payload);
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
    return doGet({ parameter: Object.assign({}, (e && e.parameter) || {}, body) });
  } catch(err) {
    return outJson_({ error: err.message });
  } finally {
    lock.releaseLock();
  }
}

function dispatch(p) {
  switch(p.action) {
    case 'getAll':           return getAll();
    case 'checkout':         return checkout(p);
    case 'returnBook':       return returnBook(p);
    case 'addBook':          return addBook(p);
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
  sh.appendRow([
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
  const iPP  = childHdr.indexOf('pp');
  const iEAL = childHdr.indexOf('eal');
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
      pp:              String(row[iPP]  || ''),
      eal:             String(row[iEAL] || ''),
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

  return {
    children: Object.values(children),
    books:    Object.values(books),
    coverOverrides,
    certIssues: getCertsIssued().certIssues,
    passedCheckouts: getPassedCheckoutIds()
  };
}

// checkoutIds that already have a passing QuizAttempts row (pass or staff
// override) — lets the return flow skip re-quizzing a book whose quiz was
// already passed at home via the reading-quiz QR page.
function getPassedCheckoutIds() {
  const sh = SS.getSheetByName('QuizAttempts');
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  const hdr = rows[0].map(h => String(h).trim().toLowerCase());
  const iCo = hdr.indexOf('checkoutid'), iPass = hdr.indexOf('passed');
  const seen = new Set();
  for (let r = 1; r < rows.length; r++) {
    const co = String(rows[r][iCo] || '');
    const passed = rows[r][iPass] === true || String(rows[r][iPass]).toUpperCase() === 'TRUE';
    if (co && passed) seen.add(co);
  }
  return Array.from(seen);
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
  sheet.appendRow([id, p.childId, p.bookId, p.copyNum, date, '', false, false]);
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
      coSheet.getRange(r + 1, iRt + 1).setValue(date);
      coSheet.getRange(r + 1, iCm + 1).setValue(p.completed === true);

      if (p.completed) {
        const childId = String(rows[r][iCh]);
        const chRows  = chSheet.getDataRange().getValues();
        const chHdr   = chRows[0].map(h => String(h).trim().toLowerCase());
        const ciId    = chHdr.indexOf('id');
        const ciTR    = chHdr.indexOf('totalreads');
        for (let cr = 1; cr < chRows.length; cr++) {
          if (String(chRows[cr][ciId]) === childId) {
            chSheet.getRange(cr + 1, ciTR + 1).setValue(Number(chRows[cr][ciTR] || 0) + 1);
            break;
          }
        }
      }
      return { ok: true };
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
  sheet.appendRow([id, p.title, p.author || '', p.phase || 'LKS2', p.copies || 1]);
  return { ok: true, id };
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
      coSheet.getRange(r + 1, iLst + 1).setValue(p.lost === true);
      return { ok: true };
    }
  }
  if (p.lost) {
    const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    coSheet.appendRow(['CO' + Date.now(), '', p.bookId, p.copyNum, date, '', false, true]);
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
      if (p.url) sheet.getRange(r + 1, 2).setValue(p.url);
      else sheet.deleteRow(r + 1);
      return { ok: true };
    }
  }
  if (p.url) sheet.appendRow([p.bookId, p.url]);
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
    if (counts[id] !== undefined) sheet.getRange(r + 1, iCo + 1).setValue(Number(counts[id]));
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
    sheet.appendRow([id, c.name, c.yearGroup, c.class || '', c.pp || '', c.eal || '', c.gender || '', c.totalReads || 0]);
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
    'Children': ['id','name','yearGroup','class','pp','eal','gender','totalReads','lks2Reads'],
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
