// ============================================================
// WFA RTP Tracker — Apps Script Backend
// ============================================================
// Ready to Progress (NCETM) maths security tracker.
// Deploy as Web App: Execute as Me, Anyone can access.
// Script is bound to its own spreadsheet — SPREADSHEET_ID left blank.
// ============================================================

const SPREADSHEET_ID = ''; // blank = use active/bound spreadsheet

const SHEET_HEADERS = {
  classes:     ['class_id','year_group','class_name','teacher_name','academic_year','active','tutor_group'],
  pupils:      ['pupil_id','name','year_group','class_id','active','added_date','upn','sex','pp','sen','eal'],
  criteria:    ['code','strand','year_group','order','description','weight','active'],
  assessments: ['assess_id','pupil_id','code','rating','academic_year','assessed_date','assessed_by'],
  taught:      ['class_id','code','academic_year','taught_date','marked_by'],
  config:      ['key','value']
};

// The 78 DfE/NCETM Ready to Progress criteria across all 6 strands and
// years 1-6. Seeded into the `criteria` sheet once on first init, then
// owned by the sheet (weight is editable there via setCriterionWeight_;
// re-running initSheets_ never overwrites an existing row).
const CRITERIA_SEED = [
  {code:'1NPV–1', strand:'Number and Place Value', year:1, order:1, desc:'Count within 100, forwards and backwards, starting with any number.'},
  {code:'1NPV–2', strand:'Number and Place Value', year:1, order:2, desc:'Reason about the location of numbers to 20 within the linear number system, including comparing using < > and ='},
  {code:'2NPV–1', strand:'Number and Place Value', year:2, order:3, desc:'Recognise the place value of each digit in two-digit numbers, and compose and decompose two-digit numbers using standard and non-standard partitioning.'},
  {code:'3NPV–1', strand:'Number and Place Value', year:3, order:4, desc:'Know that 10 tens are equivalent to 1 hundred, and that 100 is 10 times the size of 10; apply this to identify and work out how many 10s there are in other three-digit multiples of 10.'},
  {code:'3NPV–2', strand:'Number and Place Value', year:3, order:5, desc:'Recognise the place value of each digit in three-digit numbers, and compose and decompose three-digit numbers using standard and non-standard partitioning.'},
  {code:'3NPV–3', strand:'Number and Place Value', year:3, order:6, desc:'Reason about the location of any three-digit number in the linear number system, including identifying the previous and next multiple of 100 and 10.'},
  {code:'3NPV–4', strand:'Number and Place Value', year:3, order:7, desc:'Divide 100 into 2, 4, 5 and 10 equal parts, and read scales/number lines marked in multiples of 100 with 2, 4, 5 and 10 equal parts.'},
  {code:'4NPV–1', strand:'Number and Place Value', year:4, order:8, desc:'Know that 10 hundreds are equivalent to 1 thousand, and that 1,000 is 10 times the size of 100; apply this to identify and work out how many 100s there are in other four-digit multiples of 100.'},
  {code:'4NPV–2', strand:'Number and Place Value', year:4, order:9, desc:'Recognise the place value of each digit in four-digit numbers, and compose and decompose four-digit numbers using standard and non-standard partitioning.'},
  {code:'4NPV–3', strand:'Number and Place Value', year:4, order:10, desc:'Reason about the location of any four-digit number in the linear number system, including identifying the previous and next multiple of 1,000 and 100, and rounding to the nearest of each.'},
  {code:'4NPV–4', strand:'Number and Place Value', year:4, order:11, desc:'Divide 1,000 into 2, 4, 5 and 10 equal parts, and read scales/number lines marked in multiples of 1,000 with 2, 4, 5 and 10 equal parts.'},
  {code:'5NPV–1', strand:'Number and Place Value', year:5, order:12, desc:'Know that 10 tenths are equivalent to 1 one, and that 1 is 10 times the size of 0.1. Know that 100 hundredths are equivalent to 1 one, and that 1 is 100 times the size of 0.01. Know that 10 hundredths are equivalent to 1 tenth, and that 0.1 is 10 times the size of 0.01.'},
  {code:'5NPV–2', strand:'Number and Place Value', year:5, order:13, desc:'Recognise the place value of each digit in numbers with up to 2 decimal places, and compose and decompose numbers with up to 2 decimal places using standard and non-standard partitioning.'},
  {code:'5NPV–3', strand:'Number and Place Value', year:5, order:14, desc:'Reason about the location of any number with up to 2 decimals places in the linear number system, including identifying the previous and next multiple of 1 and 0.1 and rounding to the nearest of each.'},
  {code:'5NPV–4', strand:'Number and Place Value', year:5, order:15, desc:'Divide 1 into 2, 4, 5 and 10 equal parts, and read scales/number lines marked in units of 1 with 2, 4, 5 and 10 equal parts.'},
  {code:'5NPV–5', strand:'Number and Place Value', year:5, order:16, desc:'Convert between units of measure, including using common decimals and fractions.'},
  {code:'6NPV–1', strand:'Number and Place Value', year:6, order:17, desc:'Understand the relationship between powers of 10 from 1 hundredth to 10 million, and use this to make a given number 10, 100, 1,000, 1 tenth, 1 hundredth or 1 thousandth times the size (multiply and divide by 10, 100 and 1,000).'},
  {code:'6NPV–2', strand:'Number and Place Value', year:6, order:18, desc:'Recognise the place value of each digit in numbers up to 10 million, including decimal fractions, and compose and decompose numbers up to 10 million using standard and non-standard partitioning.'},
  {code:'6NPV–3', strand:'Number and Place Value', year:6, order:19, desc:'Reason about the location of any number up to 10 million, including decimal fractions, in the linear number system, and round numbers, as appropriate, including in contexts.'},
  {code:'6NPV–4', strand:'Number and Place Value', year:6, order:20, desc:'Divide powers of 10, from 1 hundredth to 10 million, into 2, 4, 5 and 10 equal parts, and read scales/number lines with labelled intervals divided into 2, 4, 5 and 10 equal parts.'},
  {code:'1NF–1', strand:'Number Facts', year:1, order:21, desc:'Develop fluency in addition and subtraction facts within 10.'},
  {code:'1NF–2', strand:'Number Facts', year:1, order:22, desc:'Count forwards and backwards in multiples of 2, 5 and 10, up to 10 multiples, beginning with any multiple, and count forwards and backwards through the odd numbers.'},
  {code:'2NF–1', strand:'Number Facts', year:2, order:23, desc:'Secure fluency in addition and subtraction facts within 10, through continued practice.'},
  {code:'3NF–1', strand:'Number Facts', year:3, order:24, desc:'Secure fluency in addition and subtraction facts that bridge 10, through continued practice.'},
  {code:'3NF–2', strand:'Number Facts', year:3, order:25, desc:'Recall multiplication facts, and corresponding division facts, in the 10, 5, 2, 4 and 8 multiplication tables, and recognise products in these multiplication tables as multiples of the corresponding number.'},
  {code:'3NF–3', strand:'Number Facts', year:3, order:26, desc:'Apply place-value knowledge to known additive and multiplicative number facts (scaling facts by 10).'},
  {code:'4NF–1', strand:'Number Facts', year:4, order:27, desc:'Recall multiplication and division facts up to 12 × 12, and recognise products in multiplication tables as multiples of the corresponding number.'},
  {code:'4NF–2', strand:'Number Facts', year:4, order:28, desc:'Solve division problems, with two-digit dividends and one-digit divisors, that involve remainders, and interpret remainders appropriately according to the context.'},
  {code:'4NF–3', strand:'Number Facts', year:4, order:29, desc:'Apply place-value knowledge to known additive and multiplicative number facts (scaling facts by 100)'},
  {code:'5NF–1', strand:'Number Facts', year:5, order:30, desc:'Secure fluency in multiplication table facts, and corresponding division facts, through continued practice.'},
  {code:'5NF–2', strand:'Number Facts', year:5, order:31, desc:'Apply place-value knowledge to known additive and multiplicative number facts (scaling facts by 1 tenth or 1 hundredth).'},
  {code:'1AS–1', strand:'Addition and Subtraction', year:1, order:32, desc:'Compose numbers to 10 from 2 parts, and partition numbers to 10 into parts, including recognising odd and even numbers.'},
  {code:'1AS–2', strand:'Addition and Subtraction', year:1, order:33, desc:'Read, write and interpret equations containing addition ( ), subtraction ( ) and equals ( ) symbols, and relate additive expressions and equations to real-life contexts.'},
  {code:'2AS–1', strand:'Addition and Subtraction', year:2, order:34, desc:'Add and subtract across 10.'},
  {code:'2AS–2', strand:'Addition and Subtraction', year:2, order:35, desc:'Recognise the subtraction structure of ‘difference’ and answer questions of the form, “How many more…?”.'},
  {code:'2AS–3', strand:'Addition and Subtraction', year:2, order:36, desc:'Add and subtract within 100 by applying related one-digit addition and subtraction facts: add and subtract only ones or only tens to/from a two-digit number.'},
  {code:'2AS–4', strand:'Addition and Subtraction', year:2, order:37, desc:'Add and subtract within 100 by applying related one-digit addition and subtraction facts: add and subtract any 2 two-digit numbers.'},
  {code:'3AS–1', strand:'Addition and Subtraction', year:3, order:38, desc:'Calculate complements to 100.'},
  {code:'3AS–2', strand:'Addition and Subtraction', year:3, order:39, desc:'Add and subtract up to three-digit numbers using columnar methods.'},
  {code:'3AS–3', strand:'Addition and Subtraction', year:3, order:40, desc:'Manipulate the additive relationship: Understand the inverse relationship between addition and subtraction, and how both relate to the part–part–whole structure. Understand and use the commutative property of addition, and understand the related property for subtraction.'},
  {code:'6AS/MD–1', strand:'Addition and Subtraction', year:6, order:41, desc:'Understand that 2 numbers can be related additively or multiplicatively, and quantify additive and multiplicative relationships (multiplicative relationships restricted to multiplication by a whole number).'},
  {code:'6AS/MD–2', strand:'Addition and Subtraction', year:6, order:42, desc:'Use a given additive or multiplicative calculation to derive or complete a related calculation, using arithmetic properties, inverse relationships, and place-value understanding.'},
  {code:'6AS/MD–3', strand:'Addition and Subtraction', year:6, order:43, desc:'Solve problems involving ratio relationships.'},
  {code:'6AS/MD–4', strand:'Addition and Subtraction', year:6, order:44, desc:'Solve problems with 2 unknowns.'},
  {code:'2MD–1', strand:'Multiplication and Division', year:2, order:45, desc:'Recognise repeated addition contexts, representing them with multiplication equations and calculating the product, within the 2, 5 and 10 multiplication tables.'},
  {code:'2MD–2', strand:'Multiplication and Division', year:2, order:46, desc:'Relate grouping problems where the number of groups is unknown to multiplication equations with a missing factor, and to division equations (quotitive division).'},
  {code:'3MD–1', strand:'Multiplication and Division', year:3, order:47, desc:'Apply known multiplication and division facts to solve contextual problems with different structures, including quotitive and partitive division.'},
  {code:'4MD–1', strand:'Multiplication and Division', year:4, order:48, desc:'Multiply and divide whole numbers by 10 and 100 (keeping to whole number quotients); understand this as equivalent to making a number 10 or 100 times the size.'},
  {code:'4MD–2', strand:'Multiplication and Division', year:4, order:49, desc:'Manipulate multiplication and division equations, and understand and apply the commutative property of multiplication.'},
  {code:'4MD–3', strand:'Multiplication and Division', year:4, order:50, desc:'Understand and apply the distributive property of multiplication.'},
  {code:'5MD–1', strand:'Multiplication and Division', year:5, order:51, desc:'Multiply and divide numbers by 10 and 100; understand this as equivalent to making a number 10 or 100 times the size, or 1 tenth or 1 hundredth times the size.'},
  {code:'5MD–2', strand:'Multiplication and Division', year:5, order:52, desc:'Find factors and multiples of positive whole numbers, including common factors and common multiples, and express a given number as a product of 2 or 3 factors.'},
  {code:'5MD–3', strand:'Multiplication and Division', year:5, order:53, desc:'Multiply any whole number with up to 4 digits by any one-digit number using a formal written method.'},
  {code:'5MD–4', strand:'Multiplication and Division', year:5, order:54, desc:'Divide a number with up to 4 digits by a one-digit number using a formal written method, and interpret remainders appropriately for the context.'},
  {code:'3F–1', strand:'Fractions', year:3, order:55, desc:'Interpret and write proper fractions to represent 1 or several parts of a whole that is divided into equal parts.'},
  {code:'3F–2', strand:'Fractions', year:3, order:56, desc:'Find unit fractions of quantities using known division facts (multiplication tables fluency).'},
  {code:'3F–3', strand:'Fractions', year:3, order:57, desc:'Reason about the location of any fraction within 1 in the linear number system.'},
  {code:'3F–4', strand:'Fractions', year:3, order:58, desc:'Add and subtract fractions with the same denominator, within 1.'},
  {code:'4F–1', strand:'Fractions', year:4, order:59, desc:'Reason about the location of mixed numbers in the linear number system.'},
  {code:'4F–2', strand:'Fractions', year:4, order:60, desc:'Convert mixed numbers to improper fractions and vice versa.'},
  {code:'4F–3', strand:'Fractions', year:4, order:61, desc:'Add and subtract improper and mixed fractions with the same denominator, including bridging whole numbers.'},
  {code:'5F–1', strand:'Fractions', year:5, order:62, desc:'Find non-unit fractions of quantities.'},
  {code:'5F–2', strand:'Fractions', year:5, order:63, desc:'Find equivalent fractions and understand that they have the same value and the same position in the linear number system.'},
  {code:'5F–3', strand:'Fractions', year:5, order:64, desc:'Recall decimal fraction equivalents for 1/2, 1/4, 1/5, 1/10 and for multiples of these proper fractions.'},
  {code:'6F–1', strand:'Fractions', year:6, order:65, desc:'Recognise when fractions can be simplified, and use common factors to simplify fractions.'},
  {code:'6F–2', strand:'Fractions', year:6, order:66, desc:'Express fractions in a common denomination and use this to compare fractions that are similar in value.'},
  {code:'6F–3', strand:'Fractions', year:6, order:67, desc:'Compare fractions with different denominators, including fractions greater than 1, using reasoning, and choose between reasoning and common denomination as a comparison strategy.'},
  {code:'1G–1', strand:'Geometry', year:1, order:68, desc:'Recognise common 2D and 3D shapes presented in different orientations, and know that rectangles, triangles, cuboids and pyramids are not always similar to one another.'},
  {code:'1G–2', strand:'Geometry', year:1, order:69, desc:'Compose 2D and 3D shapes from smaller shapes to match an example, including manipulating shapes to place them in particular orientations.'},
  {code:'2G–1', strand:'Geometry', year:2, order:70, desc:'Use precise language to describe the properties of 2D and 3D shapes, and compare shapes by reasoning about similarities and differences in properties.'},
  {code:'3G–1', strand:'Geometry', year:3, order:71, desc:'Recognise right angles as a property of shape or a description of a turn, and identify right angles in 2D shapes presented in different orientations.'},
  {code:'3G–2', strand:'Geometry', year:3, order:72, desc:'Draw polygons by joining marked points, and identify parallel and perpendicular sides.'},
  {code:'4G–1', strand:'Geometry', year:4, order:73, desc:'Draw polygons, specified by coordinates in the first quadrant, and translate within the first quadrant.'},
  {code:'4G–2', strand:'Geometry', year:4, order:74, desc:'Identify regular polygons, including equilateral triangles and squares, as those in which the side-lengths are equal and the angles are equal. Find the perimeter of regular and irregular polygons.'},
  {code:'4G–3', strand:'Geometry', year:4, order:75, desc:'Identify line symmetry in 2D shapes presented in different orientations. Reflect shapes in a line of symmetry and complete a symmetric figure or pattern with respect to a specified line of symmetry.'},
  {code:'5G–1', strand:'Geometry', year:5, order:76, desc:'Compare angles, estimate and measure angles in degrees (°) and draw angles of a given size.'},
  {code:'5G–2', strand:'Geometry', year:5, order:77, desc:'Compare areas and calculate the area of rectangles (including squares) using standard units.'},
  {code:'6G–1', strand:'Geometry', year:6, order:78, desc:'Draw, compose, and decompose shapes according to given properties, including dimensions, angles and area, and solve related problems.'}
];

// The hub — same shared-sync deployment every other WFA tool reads.
// HUB_TOKEN is its own Script Property (separate from SHARED_TOKEN, which
// gates requests INTO this tool's own backend). Falls back to the hub's
// current live token (see feedback/project memory: 08.09.26 rotation) so a
// fresh deploy works without a manual Script Property step.
const HUB_URL = 'https://script.google.com/macros/s/AKfycbxHg89VK1uqbWAJcqruqJFjEaavdWN74eB1KS-U_cMr75oVsBVZSi2X38l018oOYW7-4w/exec';
function hubToken_() {
  return PropertiesService.getScriptProperties().getProperty('HUB_TOKEN') || '050d7ae1a6b52eafa7d19b80c844dea8d20d1f678274fe05';
}

// ── Entry points ──────────────────────────────────────────────

function tokenOK(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '2013';
  return !!((e || {}).parameter || {}).token && e.parameter.token === expected;
}

function denied_() {
  return json_({ error: 'unauthorised' });
}

// Added 18.09.26 — initSheets_() ran its full 6-sheet header/format check on
// EVERY request, including a plain `ping`, with no gating at all — pure
// self-inflicted overhead, not concurrency-driven, since it's a schema check
// that only actually needs to run again after this file is redeployed. A
// short cache flag skips it on every request but the first in the window.
const INIT_CACHE_KEY = 'rtp_init_done_v1';
const INIT_CACHE_TTL_SECONDS = 300;

function ensureInitialized_() {
  const cache = CacheService.getScriptCache();
  if (cache.get(INIT_CACHE_KEY) !== null) return;
  initSheets_();
  try { cache.put(INIT_CACHE_KEY, '1', INIT_CACHE_TTL_SECONDS); } catch (err) { /* ignore */ }
}

function doGet(e) {
  try {
    if (!tokenOK(e)) return denied_();
    ensureInitialized_();
    return json_(handleGet_(e.parameter || {}));
  } catch (err) {
    return json_({ error: err.message });
  }
}

function doPost(e) {
  try {
    if (!tokenOK(e)) return denied_();
    ensureInitialized_();
    const data = JSON.parse(e.postData.contents);
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(20000);
    } catch (lockErr) {
      return json_({ error: 'locked, try again' });
    }
    try {
      return json_(handlePost_(data));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ error: err.message });
  }
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Routing ───────────────────────────────────────────────────

function handleGet_(p) {
  switch (p.action) {
    case 'getClasses':      return getClasses_(p);
    case 'getPupils':       return getPupils_(p);
    case 'getCriteria':     return getCriteria_();
    case 'getAssessments':  return getAssessments_(p);
    case 'getPupilProfile': return getPupilProfile_(p);
    case 'getCohortStats':  return getCohortStats_(p);
    case 'getTaught':       return { codes: [...getTaughtSet_(p.class_id)] };
    case 'getConfig':       return getConfig_();
    case 'ping':            return { ok: true, ts: new Date().toISOString(), codeVersion: 'rtp-2' };
    default:                return { error: 'Unknown GET action: ' + p.action };
  }
}

function handlePost_(d) {
  switch (d.action) {
    case 'saveRating':          return saveRating_(d);
    case 'saveRatings':         return saveRatings_(d);
    case 'setCriterionWeight':  return setCriterionWeight_(d);
    case 'setTaught':           return setTaught_(d);
    case 'setTaughtBulk':       return setTaughtBulk_(d);
    case 'setConfig':           return setConfig_(d);
    case 'syncRoster':          return syncRosterFromHub_(!!d.dryRun);
    default:                    return { error: 'Unknown POST action: ' + d.action };
  }
}

// ── Sheet helpers ─────────────────────────────────────────────

function ss_() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function initSheets_() {
  const spreadsheet = ss_();
  for (const [name, headers] of Object.entries(SHEET_HEADERS)) {
    const existing = spreadsheet.getSheetByName(name);
    if (!existing) {
      const sh = spreadsheet.insertSheet(name);
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    } else {
      ensureColumns_(existing, headers);
    }
  }
  // Force text formats so ID/code columns aren't auto-converted to numbers
  // (all-digit hex UUIDs -> sci-notation floats; "4M1" style codes too).
  const TEXT_COLUMNS = [
    ['classes', 'class_id'],
    ['classes', 'class_name'],
    ['classes', 'tutor_group'],
    ['pupils', 'pupil_id'],
    ['pupils', 'class_id'],
    ['pupils', 'upn'],
    ['criteria', 'code'],
    ['assessments', 'assess_id'],
    ['assessments', 'pupil_id'],
    ['assessments', 'code'],
    ['taught', 'class_id'],
    ['taught', 'code']
  ];
  for (const [name, header] of TEXT_COLUMNS) {
    const sh = spreadsheet.getSheetByName(name);
    if (!sh || sh.getMaxRows() < 2) continue;
    const headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
    const col = headers.indexOf(header) + 1;
    if (col > 0) sh.getRange(2, col, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  }
  // Seed default config if empty
  const cfg = spreadsheet.getSheetByName('config');
  if (cfg.getLastRow() < 2) {
    cfg.appendRow(['academic_year', '2025-26']);
  }
  // Seed the 78 RTP criteria once — never overwrites an existing row, so a
  // teacher's weight edits survive every re-init.
  const csh = spreadsheet.getSheetByName('criteria');
  if (csh.getLastRow() < 2) {
    const rows = CRITERIA_SEED.map(c => [c.code, c.strand, 'Y' + c.year, c.order, c.desc, 1, true]);
    const startRow = csh.getLastRow() + 1;
    csh.getRange(startRow, 1, rows.length, SHEET_HEADERS.criteria.length).setValues(rows);
    csh.getRange(startRow, SHEET_HEADERS.criteria.indexOf('code') + 1, rows.length, 1).setNumberFormat('@');
  }
}

function ensureColumns_(sheet, expectedHeaders) {
  const lastCol = sheet.getLastColumn();
  const actual = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const missing = expectedHeaders.filter(h => !actual.includes(h));
  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

function sheetData_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];
  return vals.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function truthy_(v) {
  return v !== false && v !== 'FALSE' && v !== 'false' && v !== '';
}

// ── Config ────────────────────────────────────────────────────

function getConfig_() {
  const rows = sheetData_('config');
  const cfg = {};
  rows.forEach(r => { cfg[r.key] = r.value; });
  if (!cfg.academic_year) cfg.academic_year = '2025-26';
  return cfg;
}

function setConfig_(d) {
  const sh = ss_().getSheetByName('config');
  const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0] === d.key) {
      sh.getRange(i + 1, 2).setValue(d.value);
      return { success: true };
    }
  }
  sh.appendRow([d.key, d.value]);
  return { success: true };
}

// ── Classes ───────────────────────────────────────────────────

function getClasses_(p) {
  const year = p.academic_year || getConfig_().academic_year;
  return sheetData_('classes')
    .filter(c => truthy_(c.active))
    .filter(c => !year || c.academic_year === year);
}

// ── Pupils ────────────────────────────────────────────────────

// PP/SEN/EAL stay in the sheet for future cohort breakdowns but never
// leave this backend on a per-pupil basis (same convention as writing-tracker).
function stripPupilFlags_(pupils) {
  return pupils.map(function (p) {
    const copy = Object.assign({}, p);
    delete copy.pp; delete copy.sen; delete copy.eal;
    return copy;
  });
}

function getPupils_(p) {
  let pupils = sheetData_('pupils').filter(r => truthy_(r.active));
  if (p.class_id) pupils = pupils.filter(r => String(r.class_id) === String(p.class_id));
  if (p.year_group) pupils = pupils.filter(r => String(r.year_group) === String(p.year_group));
  pupils = pupils.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return stripPupilFlags_(pupils);
}

// ── Criteria ──────────────────────────────────────────────────

function getCriteria_() {
  return sheetData_('criteria')
    .filter(c => truthy_(c.active))
    .map(c => ({ code: c.code, strand: c.strand, year_group: c.year_group, order: Number(c.order), description: c.description, weight: Number(c.weight) || 1 }))
    .sort((a, b) => a.order - b.order);
}

function setCriterionWeight_(d) {
  const sh = ss_().getSheetByName('criteria');
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];
  const codeCol = headers.indexOf('code');
  const weightCol = headers.indexOf('weight');
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][codeCol]) === String(d.code)) {
      sh.getRange(i + 1, weightCol + 1).setValue(Number(d.weight) || 1);
      return { success: true };
    }
  }
  return { error: 'Criterion not found: ' + d.code };
}

// ── Taught coverage ──────────────────────────────────────────
//
// A criterion counting toward a pupil's score is a curriculum decision
// ("has this class actually been taught it yet"), separate from whether it
// has been individually rated. Kept per class (two classes in the same
// year group can be at different points), one row per (class, code) =
// taught; absence = not yet taught.

function getTaughtSet_(classId) {
  if (!classId) return new Set();
  const year = getConfig_().academic_year;
  const set = new Set();
  sheetData_('taught').forEach(r => {
    if (String(r.class_id) === String(classId) && r.academic_year === year) set.add(r.code);
  });
  return set;
}

function setTaught_(d) {
  const academicYear = d.academic_year || getConfig_().academic_year;
  const sh = ss_().getSheetByName('taught');
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];
  const col = name => headers.indexOf(name);

  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][col('class_id')]) === String(d.class_id) &&
        vals[i][col('code')] === d.code &&
        vals[i][col('academic_year')] === academicYear) {
      if (!d.taught) sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  if (d.taught) {
    const nextRow = sh.getLastRow() + 1;
    sh.getRange(nextRow, col('class_id') + 1).setNumberFormat('@');
    sh.getRange(nextRow, col('code') + 1).setNumberFormat('@');
    sh.getRange(nextRow, 1, 1, headers.length)
      .setValues([[d.class_id, d.code, academicYear, new Date().toISOString(), d.marked_by || '']]);
  }
  return { success: true };
}

// Bulk mark/unmark many criteria taught at once for one class — the normal
// workflow (e.g. "we've now finished the Y1 Number Facts unit") rather than
// clicking 78 rows one at a time.
function setTaughtBulk_(d) {
  const academicYear = d.academic_year || getConfig_().academic_year;
  const sh = ss_().getSheetByName('taught');
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];
  const col = name => headers.indexOf(name);
  const codes = d.codes || [];

  const existingRowByCode = {};
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][col('class_id')]) === String(d.class_id) && vals[i][col('academic_year')] === academicYear) {
      existingRowByCode[vals[i][col('code')]] = i + 1;
    }
  }

  if (d.taught) {
    const toAppend = codes
      .filter(code => !existingRowByCode[code])
      .map(code => [d.class_id, code, academicYear, new Date().toISOString(), d.marked_by || '']);
    if (toAppend.length) {
      const nextRow = sh.getLastRow() + 1;
      sh.getRange(nextRow, col('class_id') + 1, toAppend.length, 1).setNumberFormat('@');
      sh.getRange(nextRow, col('code') + 1, toAppend.length, 1).setNumberFormat('@');
      sh.getRange(nextRow, 1, toAppend.length, headers.length).setValues(toAppend);
    }
    return { success: true, added: toAppend.length };
  }

  const rowsToDelete = codes.filter(c => existingRowByCode[c]).map(c => existingRowByCode[c]).sort((a, b) => b - a);
  rowsToDelete.forEach(r => sh.deleteRow(r));
  return { success: true, removed: rowsToDelete.length };
}

// ── Assessments / ratings ────────────────────────────────────

// {pupils, criteria, taught, assessments: {pupil_id: {code: rating}}} for one class.
function getAssessments_(p) {
  const pupils = getPupils_({ class_id: p.class_id });
  const pupilIds = new Set(pupils.map(r => r.pupil_id));
  const year = p.academic_year || getConfig_().academic_year;

  const assessments = {};
  for (const a of sheetData_('assessments')) {
    if (!pupilIds.has(a.pupil_id) || a.academic_year !== year) continue;
    if (!assessments[a.pupil_id]) assessments[a.pupil_id] = {};
    if (a.rating !== '' && a.rating !== null && a.rating !== undefined) {
      assessments[a.pupil_id][a.code] = String(a.rating);
    }
  }

  return { pupils, criteria: getCriteria_(), assessments, taught: [...getTaughtSet_(p.class_id)] };
}

// One pupil's full RTP profile: every criterion's current rating, plus a
// weighted security score (see weightedScore_ below).
function getPupilProfile_(p) {
  const pupilId = p.pupil_id;
  const pupilRaw = sheetData_('pupils').find(r => r.pupil_id === pupilId) || null;
  const pupil = pupilRaw ? stripPupilFlags_([pupilRaw])[0] : null;
  const year = p.academic_year || getConfig_().academic_year;

  const ratings = {};
  for (const a of sheetData_('assessments')) {
    if (a.pupil_id !== pupilId || a.academic_year !== year) continue;
    if (a.rating !== '' && a.rating !== null && a.rating !== undefined) {
      ratings[a.code] = Number(a.rating);
    }
  }

  const criteria = getCriteria_();
  const taughtSet = pupilRaw ? getTaughtSet_(pupilRaw.class_id) : new Set();
  const overall = weightedScore_(criteria, ratings, taughtSet);
  const byStrand = {};
  const strands = [...new Set(criteria.map(c => c.strand))];
  strands.forEach(s => {
    byStrand[s] = weightedScore_(criteria.filter(c => c.strand === s), ratings, taughtSet);
  });

  return { pupil, ratings, criteria, taught: [...taughtSet], overallScore: overall, strandScores: byStrand };
}

// Weighted security score, out of 100 — scoped to criteria actually TAUGHT
// to this pupil's class (see getTaughtSet_ above), not merely rated. A
// taught-but-unrated criterion still counts in the denominator (as 0
// credit), so the score can't look inflated just because only one or two
// things have been individually assessed so far while the rest of the unit
// has already been covered.
//
// Each rating gives partial credit rather than all-or-nothing, matching the
// sheet's own rating definitions (1 = little/no security, 2 = some
// security, 3 = secure): credit = (rating-1)/2, i.e. 1->0%, 2->50%, 3->100%.
// So a 2 on a heavily-weighted priority skill can lift the score more than
// a 3 on an unweighted one — reflecting real partial progress, not just a
// secure/not-secure cliff edge.
function weightedScore_(criteria, ratings, taughtSet) {
  const taught = criteria.filter(c => taughtSet.has(c.code));
  if (!taught.length) return { pct: null, taughtCount: 0, ratedCount: 0, totalCount: criteria.length };
  let taughtWeight = 0, creditWeight = 0, ratedCount = 0;
  taught.forEach(c => {
    taughtWeight += c.weight;
    const r = ratings[c.code];
    if (r !== undefined) {
      ratedCount++;
      creditWeight += c.weight * ((r - 1) / 2);
    }
  });
  return {
    pct: Math.round((creditWeight / taughtWeight) * 1000) / 10,
    taughtCount: taught.length,
    ratedCount,
    totalCount: criteria.length
  };
}

// Per-criterion cohort breakdown for a class or a whole year group —
// % of assessed pupils rated 3 (secure), plus the class's overall weighted
// security score. Powers the cohort dashboard / gap-finding view. Each
// pupil's score is scoped to their OWN class's taught set (a "whole year
// group" scope can span two classes at different points in the curriculum).
function getCohortStats_(p) {
  const pupils = getPupils_({ class_id: p.class_id, year_group: p.year_group });
  const pupilIds = new Set(pupils.map(r => r.pupil_id));
  const year = p.academic_year || getConfig_().academic_year;
  const criteria = getCriteria_();

  const classIds = [...new Set(pupils.map(pu => pu.class_id))];
  const taughtByClass = {};
  classIds.forEach(cid => { taughtByClass[cid] = getTaughtSet_(cid); });

  const byCode = {}; // code -> [ratings]
  criteria.forEach(c => { byCode[c.code] = []; });

  const ratingsByPupil = {};
  for (const a of sheetData_('assessments')) {
    if (!pupilIds.has(a.pupil_id) || a.academic_year !== year) continue;
    if (a.rating === '' || a.rating === null || a.rating === undefined) continue;
    const r = Number(a.rating);
    if (byCode[a.code]) byCode[a.code].push(r);
    if (!ratingsByPupil[a.pupil_id]) ratingsByPupil[a.pupil_id] = {};
    ratingsByPupil[a.pupil_id][a.code] = r;
  }

  const criteriaStats = criteria.map(c => {
    const ratings = byCode[c.code];
    const secure = ratings.filter(r => r === 3).length;
    const taughtCount = pupils.filter(pu => (taughtByClass[pu.class_id] || new Set()).has(c.code)).length;
    return {
      code: c.code, strand: c.strand, year_group: c.year_group, weight: c.weight, description: c.description,
      assessedCount: ratings.length,
      taughtCount,
      pupilCount: pupils.length,
      pctSecure: ratings.length ? Math.round((secure / ratings.length) * 1000) / 10 : null
    };
  });

  const pupilScores = pupils.map(pu => ({
    pupil_id: pu.pupil_id,
    name: pu.name,
    score: weightedScore_(criteria, ratingsByPupil[pu.pupil_id] || {}, taughtByClass[pu.class_id] || new Set())
  }));

  const assessedPupilScores = pupilScores.filter(ps => ps.score.pct !== null);
  const cohortAvg = assessedPupilScores.length
    ? Math.round((assessedPupilScores.reduce((s, ps) => s + ps.score.pct, 0) / assessedPupilScores.length) * 10) / 10
    : null;

  return { pupilCount: pupils.length, criteriaStats, pupilScores, cohortAvgScore: cohortAvg };
}

function saveRating_(d) {
  upsertRating_(d.pupil_id, d.code, d.academic_year || getConfig_().academic_year, d.rating, d.assessed_by || '');
  return { success: true };
}

function saveRatings_(d) {
  const { ratings, assessed_by } = d;
  const academic_year = d.academic_year || getConfig_().academic_year;
  const sh = ss_().getSheetByName('assessments');
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];
  const col = name => headers.indexOf(name);

  const idx = {};
  for (let i = 1; i < vals.length; i++) {
    const key = `${vals[i][col('pupil_id')]}|${vals[i][col('code')]}|${vals[i][col('academic_year')]}`;
    idx[key] = i + 1;
  }

  const now = new Date().toISOString();
  const toAppend = [];
  let updated = 0;

  for (const r of ratings) {
    const key = `${r.pupil_id}|${r.code}|${academic_year}`;
    if (idx[key]) {
      sh.getRange(idx[key], col('rating') + 1).setValue(r.rating);
      sh.getRange(idx[key], col('assessed_date') + 1).setValue(now);
      if (assessed_by) sh.getRange(idx[key], col('assessed_by') + 1).setValue(assessed_by);
      updated++;
    } else {
      toAppend.push([Utilities.getUuid().substring(0, 8), r.pupil_id, r.code, r.rating, academic_year, now, assessed_by || '']);
    }
  }

  if (toAppend.length > 0) {
    const nextRow = sh.getLastRow() + 1;
    ['assess_id', 'pupil_id', 'code'].forEach(h => {
      const c = col(h) + 1;
      if (c > 0) sh.getRange(nextRow, c, toAppend.length, 1).setNumberFormat('@');
    });
    // toAppend rows are already built in header order: assess_id,pupil_id,code,rating,academic_year,assessed_date,assessed_by
    sh.getRange(nextRow, 1, toAppend.length, headers.length).setValues(toAppend);
  }

  return { success: true, updated, inserted: toAppend.length };
}

function upsertRating_(pupil_id, code, academic_year, rating, assessed_by) {
  const sh = ss_().getSheetByName('assessments');
  const vals = sh.getDataRange().getValues();
  const headers = vals[0];
  const col = name => headers.indexOf(name);
  const now = new Date().toISOString();

  for (let i = vals.length - 1; i >= 1; i--) {
    if (vals[i][col('pupil_id')] === pupil_id &&
        vals[i][col('code')] === code &&
        vals[i][col('academic_year')] === academic_year) {
      sh.getRange(i + 1, col('rating') + 1).setValue(rating);
      sh.getRange(i + 1, col('assessed_date') + 1).setValue(now);
      if (assessed_by) sh.getRange(i + 1, col('assessed_by') + 1).setValue(assessed_by);
      return;
    }
  }

  const nextRow = sh.getLastRow() + 1;
  ['assess_id', 'pupil_id', 'code'].forEach(h => {
    const c = col(h) + 1;
    if (c > 0) sh.getRange(nextRow, c).setNumberFormat('@');
  });
  sh.getRange(nextRow, 1, 1, headers.length)
    .setValues([[Utilities.getUuid().substring(0, 8), pupil_id, code, rating, academic_year, now, assessed_by || '']]);
}

// ── Roster sync (Bromcom, via the hub) ─────────────────────────
//
// Modelled on writing-tracker's syncRosterFromHub_ (see roster-unification
// spec + its own Code.js) — same precedence, same safety valve, same
// never-delete rule. Classes match on tutor_group; pupils match on upn,
// falling back to canonical-name match. dryRun computes and returns the
// full change report without writing.

function canonical_(n) {
  return String(n || '').toLowerCase().replace(/[^a-z ]/g, '')
    .split(/\s+/).filter(t => t.length > 1).join('');
}

function codeToYearGroup_(code) {
  const m = String(code || '').match(/^(\d)/);
  return m ? 'Y' + m[1] : '';
}

function syncRosterFromHub_(dryRun) {
  const token = hubToken_();
  const hubClasses = JSON.parse(UrlFetchApp.fetch(HUB_URL + '?action=getClasses&token=' + token).getContentText()).classes || [];
  const hubPupilsResp = JSON.parse(UrlFetchApp.fetch(HUB_URL + '?action=getPupils&token=' + token).getContentText());
  if (hubPupilsResp.error) return { error: 'Hub error: ' + hubPupilsResp.error };
  const hubPupils = hubPupilsResp.pupils || [];
  if (!hubPupils.length) return { error: 'Hub returned no pupils — aborting, nothing written' };

  const result = {
    dryRun: !!dryRun,
    classesAdded: 0, classesUpdated: 0, classesDeactivated: [],
    pupilsAdded: 0, pupilsUpdated: 0, pupilsDeactivated: 0,
    upnAttached: 0, unmatched: [], aborted: false, reason: ''
  };

  const academicYear = getConfig_().academic_year;

  // ── Classes (keyed on tutor_group) ──────────────────────────
  const csh = ss_().getSheetByName('classes');
  const cvals = csh.getDataRange().getValues();
  const chdr = cvals[0];
  const cIx = h => chdr.indexOf(h);
  const tgCol = cIx('tutor_group'), cnCol = cIx('class_name'), tnCol = cIx('teacher_name'),
        ygCol = cIx('year_group'), ayCol = cIx('academic_year'), caCol = cIx('active'), cidCol = cIx('class_id');

  const classRowByTg = {};
  for (let i = 1; i < cvals.length; i++) {
    const tg = String(cvals[i][tgCol] || '').trim();
    if (tg) classRowByTg[tg] = i + 1;
  }

  const classIdByTg = {};
  const seenTg = {};

  hubClasses.forEach(hc => {
    const tg = String(hc.code || '').trim();
    if (!tg) return;
    seenTg[tg] = true;
    const display = String(hc.display || tg).trim();
    const teacher = String(hc.teacherInitials || '').trim();
    const yg = codeToYearGroup_(tg);

    let rowNum = classRowByTg[tg];
    if (rowNum) {
      const row = cvals[rowNum - 1];
      classIdByTg[tg] = String(row[cidCol]);
      const changed = String(row[cnCol] || '') !== display || String(row[tnCol] || '') !== teacher || !truthy_(row[caCol]);
      if (changed && !dryRun) {
        csh.getRange(rowNum, cnCol + 1).setValue(display);
        csh.getRange(rowNum, tnCol + 1).setValue(teacher);
        csh.getRange(rowNum, caCol + 1).setValue(true);
      }
      if (changed) result.classesUpdated++;
    } else {
      const newId = 'c' + Utilities.getUuid().substring(0, 8);
      classIdByTg[tg] = newId;
      result.classesAdded++;
      if (!dryRun) {
        const nextRow = csh.getLastRow() + 1;
        csh.getRange(nextRow, cidCol + 1).setNumberFormat('@');
        csh.getRange(nextRow, tgCol + 1).setNumberFormat('@');
        csh.getRange(nextRow, 1, 1, chdr.length).setValues([
          chdr.map(h => {
            switch (h) {
              case 'class_id': return newId;
              case 'year_group': return yg;
              case 'class_name': return display;
              case 'teacher_name': return teacher;
              case 'academic_year': return academicYear;
              case 'active': return true;
              case 'tutor_group': return tg;
              default: return '';
            }
          })
        ]);
      }
    }
  });

  // Deactivate classes no longer live on the hub
  for (let i = 1; i < cvals.length; i++) {
    const tg = String(cvals[i][tgCol] || '').trim();
    if (tg && !seenTg[tg] && truthy_(cvals[i][caCol])) {
      result.classesDeactivated.push(tg);
      if (!dryRun) csh.getRange(i + 1, caCol + 1).setValue(false);
    }
  }

  // ── Pupils (keyed on upn, fallback canonical name) ──────────
  const psh = ss_().getSheetByName('pupils');
  const pvals = psh.getDataRange().getValues();
  const phdr = pvals[0];
  const pIx = h => phdr.indexOf(h);
  const upnCol = pIx('upn'), nameCol = pIx('name'), ygCol2 = pIx('year_group'), cidCol2 = pIx('class_id'),
        actCol = pIx('active'), addCol = pIx('added_date'), pidCol = pIx('pupil_id'), sexCol = pIx('sex'),
        ppCol = pIx('pp'), senCol = pIx('sen'), ealCol = pIx('eal');

  const rowByUpn = {}, rowByCanonical = {};
  for (let i = 1; i < pvals.length; i++) {
    const upn = String(pvals[i][upnCol] || '').trim();
    if (upn) rowByUpn[upn] = i + 1;
    const canon = canonical_(pvals[i][nameCol]);
    if (canon && !rowByCanonical[canon]) rowByCanonical[canon] = i + 1;
  }

  const seenUpn = {};
  hubPupils.forEach(hp => {
    const upn = String(hp.upn || '').trim();
    const name = [hp.first, hp.last].filter(Boolean).join(' ').trim();
    const classId = classIdByTg[String(hp.code || '').trim()] || '';
    const yg = hp.yearGroup || codeToYearGroup_(hp.code);
    if (!upn || !name) { result.unmatched.push(name || upn || '(blank)'); return; }
    seenUpn[upn] = true;

    let rowNum = rowByUpn[upn];
    let attachedUpn = false;
    if (!rowNum) {
      const canon = canonical_(name);
      const candidate = rowByCanonical[canon];
      if (candidate && !String(pvals[candidate - 1][upnCol] || '').trim()) {
        rowNum = candidate;
        attachedUpn = true;
      }
    }

    if (rowNum) {
      const row = pvals[rowNum - 1];
      const changed = String(row[nameCol] || '') !== name || String(row[cidCol2] || '') !== classId ||
                       String(row[ygCol2] || '') !== yg || !truthy_(row[actCol]) || attachedUpn;
      if (changed) {
        result.pupilsUpdated++;
        if (attachedUpn) result.upnAttached++;
        if (!dryRun) {
          psh.getRange(rowNum, nameCol + 1).setValue(name);
          psh.getRange(rowNum, cidCol2 + 1).setValue(classId);
          psh.getRange(rowNum, ygCol2 + 1).setValue(yg);
          psh.getRange(rowNum, actCol + 1).setValue(true);
          if (attachedUpn) psh.getRange(rowNum, upnCol + 1).setValue(upn);
          if (sexCol >= 0) psh.getRange(rowNum, sexCol + 1).setValue(hp.sex || '');
          if (ppCol >= 0) psh.getRange(rowNum, ppCol + 1).setValue(!!hp.pp);
          if (senCol >= 0) psh.getRange(rowNum, senCol + 1).setValue(hp.sen || '');
          if (ealCol >= 0) psh.getRange(rowNum, ealCol + 1).setValue(!!hp.eal);
        }
      }
    } else {
      result.pupilsAdded++;
      if (!dryRun) {
        const newId = 'p' + Utilities.getUuid().substring(0, 8);
        const nextRow = psh.getLastRow() + 1;
        psh.getRange(nextRow, pidCol + 1).setNumberFormat('@');
        psh.getRange(nextRow, cidCol2 + 1).setNumberFormat('@');
        psh.getRange(nextRow, upnCol + 1).setNumberFormat('@');
        psh.getRange(nextRow, 1, 1, phdr.length).setValues([
          phdr.map(h => {
            switch (h) {
              case 'pupil_id': return newId;
              case 'name': return name;
              case 'year_group': return yg;
              case 'class_id': return classId;
              case 'active': return true;
              case 'added_date': return new Date().toISOString();
              case 'upn': return upn;
              case 'sex': return hp.sex || '';
              case 'pp': return !!hp.pp;
              case 'sen': return hp.sen || '';
              case 'eal': return !!hp.eal;
              default: return '';
            }
          })
        ]);
      }
    }
  });

  // Safety valve: never mass-deactivate off a partial hub export.
  const activePupilRows = pvals.slice(1).filter(r => truthy_(r[actCol]));
  if (hubPupils.length < activePupilRows.length * 0.8) {
    result.aborted = true;
    result.reason = 'hub roster (' + hubPupils.length + ') below 80% of current active pupils (' + activePupilRows.length + ') — no deactivations applied';
  } else {
    for (let i = 1; i < pvals.length; i++) {
      const upn = String(pvals[i][upnCol] || '').trim();
      if (upn && !seenUpn[upn] && truthy_(pvals[i][actCol])) {
        result.pupilsDeactivated++;
        if (!dryRun) psh.getRange(i + 1, actCol + 1).setValue(false);
      }
    }
  }

  return result;
}
