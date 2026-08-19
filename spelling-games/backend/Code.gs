// Wallscourt Farm Academy — Spelling Games score backend
//
// Bound to a Google Sheet. Creates a "Scores" tab on first use with columns:
//   Timestamp | PupilId | PupilName | Game | RuleId | Score | Accuracy | BestStreak
//
// One row is appended per finished round. Reads never mutate the sheet, so
// GET requests are safe to call as often as the game likes.
//
// GET  ?action=leaderboard&game=spelling-pop&rule=tch-short-vowel&top=10
//        → { leaderboard: [ {pupilId, pupilName, score, accuracy, date}, ... ] }
//        Best single score per pupil, for this game (+ rule if given), highest first.
//        Omit `rule` for an all-time leaderboard across every week's rule.
//
// GET  ?action=history&pupilId=AM72&game=spelling-pop
//        → { history: [ {timestamp, score, accuracy, ruleId}, ... ] }
//        Every round that pupil has played, most recent first.
//
// POST body (Content-Type: text/plain, JSON-encoded) — one finished round:
//        { pupilId, pupilName, game, ruleId, score, accuracy, bestStreak }
//        → { status: 'ok' }
//
// Note: like the other WFA staff-tools sync scripts, this trusts whatever the
// client sends — there's no server-side check that pupilId is a real pupil.
// Fine for an internal classroom tool; don't point anything sensitive at it.

const SHEET_NAME = 'Scores';
const HEADERS = ['Timestamp', 'PupilId', 'PupilName', 'Game', 'RuleId', 'Score', 'Accuracy', 'BestStreak'];

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    if (params.action === 'leaderboard') return json({ leaderboard: getLeaderboard(params) });
    if (params.action === 'history') return json({ history: getHistory(params) });
    return json({ error: 'unknown action — use ?action=leaderboard or ?action=history' });
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!body.pupilId || !body.game || typeof body.score !== 'number') {
      return json({ status: 'error', message: 'missing pupilId, game or score' });
    }
    appendScore(body);
    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendScore(body) {
  getSheet().appendRow([
    new Date().toISOString(),
    String(body.pupilId).slice(0, 40),
    String(body.pupilName || '').slice(0, 60),
    String(body.game || '').slice(0, 40),
    String(body.ruleId || '').slice(0, 60),
    Number(body.score) || 0,
    Number(body.accuracy) || 0,
    Number(body.bestStreak) || 0
  ]);
}

function readAllRows() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values.map(r => ({
    timestamp: r[0], pupilId: r[1], pupilName: r[2], game: r[3],
    ruleId: r[4], score: r[5], accuracy: r[6], bestStreak: r[7]
  }));
}

function getLeaderboard(params) {
  const game = params.game || '';
  const rule = params.rule || '';
  const top = Math.min(parseInt(params.top, 10) || 10, 50);

  const rows = readAllRows().filter(r =>
    (!game || r.game === game) && (!rule || r.ruleId === rule)
  );

  // Keep each pupil's single best score for this game/rule.
  const bestByPupil = {};
  rows.forEach(r => {
    const cur = bestByPupil[r.pupilId];
    if (!cur || r.score > cur.score) bestByPupil[r.pupilId] = r;
  });

  return Object.values(bestByPupil)
    .sort((a, b) => b.score - a.score)
    .slice(0, top)
    .map(r => ({ pupilId: r.pupilId, pupilName: r.pupilName, score: r.score, accuracy: r.accuracy, date: r.timestamp }));
}

function getHistory(params) {
  const pupilId = params.pupilId;
  if (!pupilId) return [];
  const game = params.game || '';
  return readAllRows()
    .filter(r => r.pupilId === pupilId && (!game || r.game === game))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
