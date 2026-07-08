// ============================================================
// WFA Reading Challenge Tracker — Google Apps Script Backend
// Paste this entire file into your Apps Script project,
// then deploy as a Web App (Execute as: Me, Access: Anyone).
// ============================================================

// Set this to your Google Spreadsheet ID (from the URL)
// e.g. https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
const SPREADSHEET_ID = '1l8ZNNUd4jdXeVisB7ZEhz7N8ipW7GL4UQh6fWD9_XGY';

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

// ============================================================
// HTTP handler — all requests come in as GET with a ?payload=
// (avoids CORS preflight issues)
// ============================================================
function doGet(e) {
  try {
    const raw = e.parameter.payload;
    const payload = raw ? JSON.parse(decodeURIComponent(raw)) : {};
    const action = payload.action || 'ping';
    let result;

    switch (action) {
      case 'ping':           result = { ok: true }; break;
      case 'setup':          result = setup(); break;
      case 'getAll':         result = getAllData(); break;
      case 'checkout':       result = checkout(payload); break;
      case 'returnBook':     result = returnBook(payload); break;
      case 'addChild':       result = addChild(payload); break;
      case 'addBook':        result = addBook(payload); break;
      case 'importData':     result = importData(payload); break;
      case 'importCheckouts':       result = importCheckouts(payload); break;
      case 'setCopyStatus':         result = setCopyStatus(payload); break;
      case 'setCoverOverride':      result = setCoverOverride(payload); break;
      case 'bulkSetCoverOverrides': result = bulkSetCoverOverrides(payload); break;
      default:           result = { error: 'Unknown action: ' + action };
    }

    return output(result);
  } catch (err) {
    return output({ error: err.toString() });
  }
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Setup — creates the three sheets with headers
// ============================================================
function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const defs = [
    { name: 'Children',  headers: ['ChildID', 'Name', 'YearGroup', 'Class'] },
    { name: 'Books',     headers: ['BookID', 'Title', 'Author', 'Phase', 'TotalCopies', 'LostCopies'] },
    { name: 'Checkouts',      headers: ['CheckoutID', 'ChildID', 'BookID', 'CopyNum', 'CheckoutDate', 'ReturnDate', 'Completed'] },
    { name: 'CoverOverrides', headers: ['BookID', 'CoverURL'] },
  ];

  defs.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) sheet = ss.insertSheet(def.name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(def.headers);
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#1798d3').setFontColor('white');
      sheet.setFrozenRows(1);
    }
  });

  return { ok: true };
}

// ============================================================
// Read all data in one call to minimise round-trips
// ============================================================
function getAllData() {
  const childRows    = getSheet('Children').getDataRange().getValues();
  const bookRows     = getSheet('Books').getDataRange().getValues();
  const checkoutRows = getSheet('Checkouts').getDataRange().getValues();

  // Cover overrides
  const coverSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('CoverOverrides');
  const coverOverrides = {};
  if (coverSheet) {
    coverSheet.getDataRange().getValues().slice(1).forEach(r => {
      if (r[0] && r[1]) coverOverrides[String(r[0])] = String(r[1]);
    });
  }

  // Build lookup maps from checkout history
  const readsByChild   = {};  // childId → completed count
  const activeByChild  = {};  // childId → [{checkoutId, bookId, copyNum, checkoutDate}]
  const activeByBookCopy = {}; // "bookId_copyNum" → {childId, checkoutId, checkoutDate}

  checkoutRows.slice(1).forEach(r => {
    const [id, childId, bookId, copyNum, checkoutDate, returnDate, completed] = r;
    if (completed === 'Y') {
      readsByChild[childId] = (readsByChild[childId] || 0) + 1;
    }
    if (!returnDate) {
      if (!activeByChild[childId]) activeByChild[childId] = [];
      activeByChild[childId].push({
        checkoutId: String(id),
        bookId: String(bookId),
        copyNum: Number(copyNum),
        checkoutDate: String(checkoutDate),
      });
      activeByBookCopy[`${bookId}_${copyNum}`] = {
        childId: String(childId),
        checkoutId: String(id),
        checkoutDate: String(checkoutDate),
      };
    }
  });

  const children = childRows.slice(1).map(r => ({
    id:             String(r[0]),
    name:           String(r[1]),
    yearGroup:      String(r[2]),
    class:          String(r[3] || ''),
    totalReads:     readsByChild[String(r[0])] || 0,
    activeCheckouts: activeByChild[String(r[0])] || [],
  }));

  const books = bookRows.slice(1).map(r => {
    const bookId      = String(r[0]);
    const totalCopies = Number(r[4]) || 1;
    // LostCopies column stores comma-separated copy numbers, e.g. "1,3"
    const lostSet = new Set(String(r[5] || '').split(',').map(s => s.trim()).filter(Boolean).map(Number));
    const copies = [];
    for (let i = 1; i <= totalCopies; i++) {
      const key  = `${bookId}_${i}`;
      const co   = activeByBookCopy[key];
      const lost = lostSet.has(i);
      copies.push({
        copyNum:      i,
        available:    !co && !lost,
        lost,
        childId:      co ? co.childId : null,
        checkoutId:   co ? co.checkoutId : null,
        checkoutDate: co ? co.checkoutDate : null,
      });
    }
    return {
      id:          bookId,
      title:       String(r[1]),
      author:      String(r[2] || ''),
      phase:       String(r[3]),
      totalCopies,
      copies,
      available:   copies.filter(c => c.available).length,
    };
  });

  return { children, books, coverOverrides };
}

// ============================================================
// Mutations
// ============================================================
function checkout(data) {
  const { childId, bookId, copyNum } = data;
  const id  = 'CO' + new Date().getTime();
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  getSheet('Checkouts').appendRow([id, childId, bookId, Number(copyNum), now, '', '']);
  return { ok: true, checkoutId: id };
}

function returnBook(data) {
  const { checkoutId, completed } = data;
  const sheet = getSheet('Checkouts');
  const rows  = sheet.getDataRange().getValues();
  const now   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== String(checkoutId)) continue;

    sheet.getRange(i + 1, 6).setValue(now);
    sheet.getRange(i + 1, 7).setValue(completed ? 'Y' : 'N');

    if (!completed) return { ok: true, milestone: null };

    // Count reads for this child (include this one)
    const childId    = String(rows[i][1]);
    const totalReads = rows.slice(1).filter(r => String(r[1]) === childId && r[6] === 'Y').length + 1;
    const milestone  = [5, 10, 15, 20, 25].includes(totalReads) ? totalReads : null;
    return { ok: true, milestone };
  }

  return { error: 'Checkout not found' };
}

function addChild(data) {
  const id = 'CH' + new Date().getTime();
  getSheet('Children').appendRow([id, data.name, data.yearGroup, data.class || '']);
  return { ok: true, id };
}

function addBook(data) {
  const id = 'BK' + new Date().getTime();
  getSheet('Books').appendRow([id, data.title, data.author || '', data.phase, Number(data.copies) || 1]);
  return { ok: true, id };
}

// Toggle a copy's lost/found status
function setCopyStatus(data) {
  const { bookId, copyNum, lost } = data;
  const sheet = getSheet('Books');
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== String(bookId)) continue;

    const current = String(rows[i][5] || '').split(',').map(s => s.trim()).filter(Boolean).map(Number);
    let updated;
    if (lost) {
      updated = [...new Set([...current, Number(copyNum)])];
    } else {
      updated = current.filter(n => n !== Number(copyNum));
    }
    sheet.getRange(i + 1, 6).setValue(updated.join(','));
    return { ok: true };
  }
  return { error: 'Book not found' };
}

function importData(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let childCount = 0;
  let bookCount  = 0;

  if (data.children && data.children.length) {
    const sheet = ss.getSheetByName('Children');
    data.children.forEach((c, i) => {
      const id = 'CH' + new Date().getTime() + i;
      sheet.appendRow([id, c.name, c.yearGroup, c.class || '']);
    });
    childCount = data.children.length;
  }

  if (data.books && data.books.length) {
    const sheet = ss.getSheetByName('Books');
    data.books.forEach((b, i) => {
      const id = 'BK' + new Date().getTime() + i;
      sheet.appendRow([id, b.title, b.author || '', b.phase, Number(b.copies) || 1]);
    });
    bookCount = data.books.length;
  }

  return { ok: true, children: childCount, books: bookCount };
}

function importCheckouts(data) {
  if (!data.rows || !data.rows.length) return { ok: true, count: 0 };
  const sheet = getSheet('Checkouts');
  sheet.getRange(sheet.getLastRow() + 1, 1, data.rows.length, 7).setValues(data.rows);
  return { ok: true, count: data.rows.length };
}

function setCoverOverride(data) {
  const { bookId, url } = data;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('CoverOverrides');
  if (!sheet) {
    sheet = ss.insertSheet('CoverOverrides');
    sheet.appendRow(['BookID', 'CoverURL']);
    sheet.getRange(1,1,1,2).setFontWeight('bold').setBackground('#1798d3').setFontColor('white');
    sheet.setFrozenRows(1);
  }
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(bookId)) {
      if (url) { sheet.getRange(i + 1, 2).setValue(url); }
      else { sheet.deleteRow(i + 1); }
      return { ok: true };
    }
  }
  if (url) sheet.appendRow([bookId, url]);
  return { ok: true };
}

function bulkSetCoverOverrides(data) {
  const overrides = data.overrides || {};
  const keys = Object.keys(overrides);
  if (!keys.length) return { ok: true, count: 0 };
  keys.forEach(bookId => setCoverOverride({ bookId, url: overrides[bookId] }));
  return { ok: true, count: keys.length };
}
