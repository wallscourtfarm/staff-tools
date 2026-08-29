// WFA Staff Tools — Shared Sync
// Handles state for multiple tools via a `key` URL parameter, plus a shared
// pupil-roster API (`getPupils`) over the hub planning sheet's Pupils tab.
// GET  ?key=wfa_slt  → returns stored JSON for that tool
// POST ?key=wfa_slt  with JSON body → stores JSON for that tool
// GET  ?action=getPupils&token=…&yeargroup=Y4 → roster rows from hub Pupils tab
//
// Tools using this endpoint:
//   wfa_slt  — SLT Schedule
//   wfa_lc   — Lunch Cover Rota
//   wfa_ll   — Lunchtime Leaders

// hub planning workbook (same sheet all staff tools read via gviz)
const HUB_SHEET_ID = '1XsP5yEGnf8sJyXk8iEXqHEtw-NtCsMUFZLaHW4TWNhw';
const PUPILS_TAB = 'Pupils';

function props() {
  return PropertiesService.getScriptProperties();
}

// Token gate. Token arrives in the query string (not a header) because client
// fetches deliberately omit Content-Type to avoid the Apps Script CORS
// preflight, and bulk-sync client POSTs opaque {key:value} maps. The token is
// a light deterrence against scrapers and accidental overwrites — it ships in
// the public HTML, like the staff PIN, so it is not a strong secret. Set the
// SHARED_TOKEN Script Property to a random value later to raise the bar
// (clients must then be redeployed with the new constant).
function tokenOK(e) {
  const want = props().getProperty('SHARED_TOKEN') || '2013';
  return ((e.parameter || {}).token || '') === want;
}

function doGet(e) {
  try {
    if (!tokenOK(e)) return json({ error: 'unauthorised' });
    const p = e.parameter || {};
    if (p.action === 'getPupils') return json(getPupils(p));
    if (p.action === 'checkPin') return json(checkPin(p));
    const key = p.key;
    if (!key) return json({ error: 'missing key' });
    const data = props().getProperty(key);
    return ContentService.createTextOutput(data || '{}')
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    if (!tokenOK(e)) return json({ error: 'unauthorised' });
    const p = e.parameter || {};
    if (p.action === 'seedPupils') return seedPupils(e);
    const key = p.key;
    if (!key) return json({ error: 'missing key' });
    props().setProperty(key, e.postData.contents);
    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

// Pupils tab headers: id, first, last, class, yeargroup, sex, eal, pp, sen
// Optional `yeargroup`/`class` filters arrive as query params.
function getPupils(p) {
  const ss = SpreadsheetApp.openById(HUB_SHEET_ID);
  const sh = ss.getSheetByName(PUPILS_TAB);
  if (!sh) return { pupils: [], hint: PUPILS_TAB + ' tab missing from hub sheet' };
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return { pupils: [] };
  const hdr = rows[0].map(function (h) { return String(h).toLowerCase(); });
  const ix = function (name) { return hdr.indexOf(name); };
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[ix('first')] && !r[ix('last')]) continue;
    const pupil = {
      id: String(r[ix('id')] || ''),
      first: String(r[ix('first')] || ''),
      last: String(r[ix('last')] || ''),
      class: String(r[ix('class')] || ''),
      yearGroup: String(r[ix('yeargroup')] || ''),
      sex: String(r[ix('sex')] || ''),
      eal: r[ix('eal')] === true || String(r[ix('eal')]).toUpperCase() === 'Y',
      pp: r[ix('pp')] === true || String(r[ix('pp')]).toUpperCase() === 'Y',
      sen: String(r[ix('sen')] || '') || null
    };
    if (p.yeargroup && pupil.yearGroup !== p.yeargroup) continue;
    if (p.class && pupil.class !== p.class) continue;
    out.push(pupil);
  }
  return { pupils: out };
}

function seedPupils(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const pupils = body.pupils || [];
    const ss = SpreadsheetApp.openById(HUB_SHEET_ID);
    let sh = ss.getSheetByName(PUPILS_TAB);
    if (!sh) sh = ss.insertSheet(PUPILS_TAB);
    const rows = [
      ['id', 'first', 'last', 'class', 'yeargroup', 'sex', 'eal', 'pp', 'sen']
    ];
    pupils.forEach(function (p) {
      rows.push([
        p.id || '', p.first || '', p.last || '',
        p.class || '', p.yearGroup || p.yeargroup || '',
        p.sex || '', p.eal ? 'Y' : 'N', p.pp ? 'Y' : 'N',
        p.sen || ''
      ]);
    });
    sh.clearContents();
    sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
    return json({ status: 'ok', count: pupils.length });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

// One staff PIN for all tools. Set the STAFF_PIN Script Property to change it
// everywhere at once (client fallback is '2013' while offline). Light check —
// the shared token above is the real gate; this exists so staff PINs can be
// rotated in one place instead of per-tool.
function checkPin(p) {
  const want = props().getProperty('STAFF_PIN') || '2013';
  return { ok: ((p || {}).pin || '') === want };
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
