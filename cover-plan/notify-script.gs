// ── WFA Release Schedule — Google Apps Script ──────────────────────────────────────
//
// ── GOOGLE SHEET SETUP (do these steps in order) ─────────────────────────────
//
//   STEP 1 — Set locale to UK (do this before entering any data)
//     File → Settings → Locale → United Kingdom → Save settings
//     Reload the sheet after saving.
//
//   STEP 2 — Create five tabs
//     Rename the first tab: right-click → Rename → type: Plan
//     Add tabs: Events, Weeks, Staff, Recurring
//
//   STEP 3 — Set up Column A (Date)
//     Select column A → Format → Number → Date
//     Enter dates as DD/MM/YYYY (e.g. 14/04/2026)
//
//   STEP 4 — Set up Column B (Day — auto-fills from date)
//     Select column B → Format → Number → Automatic
//     In cell B2 enter this formula, then drag it down the column:
//       =IF(A2="","",CHOOSE(WEEKDAY(A2,2),"Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"))
//
//   STEP 5 — Add column headers in Row 1 of each tab:
//
//     Plan tab:
//       A: Date  B: Day  C: Term/Week  D: Session  E: Teacher Out  F: Class
//       G: Cover Staff  H: Reason  I: Notes  J: Time  K: Time From  L: Time To  M: Type  N: Source
//       Type: leave blank for cover arrangements. Set to "Lesson" for sessions where the teacher
//       is present and teaching (e.g. PE) — these show without a cover staff line in the viewer.
//       (Source is set automatically by the Generate function — do not edit it manually)
//
//     Events tab:
//       A: Start Date  B: End Date  C: Event  D: Notes
//       (End Date can be left blank for single-day events)
//
//     Staff tab:
//       A: Name  B: Role  C: Year Group  D: Status  E: Notes
//       Status is normally blank. Set to "Illness" for long-term absence.
//
//     Weeks tab:
//       A: Week Start  B: Term  C: Week
//       One row per teaching week — Week Start must be the Monday of that week.
//       Example:
//         20/04/2026 | 5 | 1
//         27/04/2026 | 5 | 2
//
//     Recurring tab:
//       A: Day  B: Session  C: Teacher Out  D: Cover Staff  E: Reason  F: Notes
//       G: Time From  H: Time To  I: Type
//       Type: leave blank for cover. Set to "Lesson" for teacher-led sessions (e.g. PE).
//       One row per recurring arrangement. Day must be exactly:
//         Monday  Tuesday  Wednesday  Thursday  Friday
//
//   STEP 6 — Make the sheet publicly readable
//     Click Share → Change to "Anyone with the link" → Viewer → Done
//
//   STEP 7 — Note your Sheet ID
//     It's the long string in the URL between /d/ and /edit
//     You'll paste this into the release schedule viewer to connect it.
//
//   STEP 8 — Add this Apps Script
//     Extensions → Apps Script → delete existing code → paste this file → Save
//     Click Run → onOpen once to grant permissions (approve the popup)
//     Reload your sheet — a "Release Schedule" menu appears in the toolbar
//
// ── COLUMN REFERENCE ──────────────────────────────────────────────────────────
//
//   Date        DD/MM/YYYY  (column formatted as Date)
//   Day         Auto-filled by formula (column formatted as Automatic)
//   Session     Must be exactly:  Before School  AM  Lunch  PM  After School
//               Leave blank to mark as All Day (appears in both AM and PM in the viewer)
//   Teacher Out First name of staff member who is out of class
//               Use "All Staff" for whole-school events (staff meetings, FLC, PAC)
//   Class       Optional — leave blank (viewer looks up year group from Staff tab automatically)
//   Cover Staff Who is covering. Leave blank if TBC.
//   Reason      Must be exactly:  PPA  Leadership  Phase Lead  Training  ECT1  ECT2  RA
//               Sports  Trip  Illness  Staff Meeting  FLC  PAC  CLF Conference  Supervision  Other
//               RA = Raising Attainment  |  FLC = Family Learning Conference  |  PAC = Primary Academy Collaboration
//   Time        Optional — legacy free text field. Use Time From / Time To instead.
//   Time From   Optional — start time, e.g. 09:15
//   Time To     Optional — end time, e.g. 11:00
//   Notes       Optional free text
//   Source      Set automatically. "Recurring" = generated from Recurring tab. Do not edit.
//
// ── USAGE ─────────────────────────────────────────────────────────────────────
//
//   Weeks tab: populate the entire year's teaching weeks at the start of the year.
//     Having all terms in the tab is fine — Generate and Regenerate only ever
//     act on the term you specify.
//
//   At the start of each term:
//     Release Schedule → Generate Term Schedule
//     Select which term to generate. Rows are added to the Plan tab for every
//     teaching week in that term based on the Recurring tab.
//
//   If the recurring pattern changes mid-term:
//     Update the Recurring tab, then:
//     Release Schedule → Regenerate from Week...
//     Enter the week label (e.g. T5W3). Auto-generated rows from that week to
//     the end of the current term are replaced; manually added rows are preserved.
//     Future terms are not affected.
//
//   When you finish updating the plan, click:
//     Release Schedule → Publish & Notify Staff
//     This emails everyone on NOTIFICATION_EMAILS with today's summary.
//
//   To update the email list: edit NOTIFICATION_EMAILS below and save.
//
// ─────────────────────────────────────────────────────────────────────────────

// ── CONFIG — edit these ───────────────────────────────────────────────────────

const VIEWER_URL = 'https://imcl75.github.io/wfa/cover-plan/';

// All staff who should receive the notification email.
const NOTIFICATION_EMAILS = [
  // Class teachers
  'jess@wallscourt.clf.school',
  'sarah@wallscourt.clf.school',
  'eloise@wallscourt.clf.school',
  'ellie@wallscourt.clf.school',
  'jo@wallscourt.clf.school',
  'millie@wallscourt.clf.school',
  'jamie@wallscourt.clf.school',
  'reuben@wallscourt.clf.school',
  'innes@wallscourt.clf.school',
  'william@wallscourt.clf.school',
  'laura@wallscourt.clf.school',
  'lutz-mae@wallscourt.clf.school',
  'jon@wallscourt.clf.school',
  'sally@wallscourt.clf.school',
  // Teaching partners
  'alasdair@wallscourt.clf.school',
  'chelsea@wallscourt.clf.school',
  'catherine@wallscourt.clf.school',
  'kerry@wallscourt.clf.school',
  'theresa@wallscourt.clf.school',
  'emmaj@wallscourt.clf.school',
  'hettie@wallscourt.clf.school',
  'sam@wallscourt.clf.school',
  // Regular cover
  'ellen@wallscourt.clf.school',
  'leyla@wallscourt.clf.school',
];

// ── MENU ─────────────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Release Schedule')
    .addItem('Publish & Notify Staff', 'publishAndNotify')
    .addSeparator()
    .addItem('Generate Term Schedule', 'generateTermSchedule')
    .addItem('Regenerate from Week…', 'regenerateFromWeek')
    .addSeparator()
    .addItem('View in browser', 'openViewer')
    .addToUi();
}

// ── GENERATE TERM SCHEDULE ────────────────────────────────────────────────────

const DAY_OFFSETS = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };

// Builds a Plan row array using the actual column header positions in the sheet,
// so the column order in the sheet doesn't matter.
function makePlanRow(planHeaders, fields) {
  const row = new Array(planHeaders.length).fill('');
  Object.entries(fields).forEach(([col, val]) => {
    const idx = planHeaders.indexOf(col);
    if (idx >= 0) row[idx] = val;
  });
  return row;
}

function readRecurring(recurringSheet) {
  const data    = recurringSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idx = name => headers.indexOf(name);
  return data.slice(1)
    .filter(r => r[idx('Day')] && r[idx('Teacher Out')])
    .map(r => ({
      day:       String(r[idx('Day')]          || '').trim(),
      session:   String(r[idx('Session')]      || '').trim(),
      teacherOut:String(r[idx('Teacher Out')]  || '').trim(),
      coverStaff:String(r[idx('Cover Staff')]  || '').trim(),
      reason:    String(r[idx('Reason')]       || '').trim(),
      notes:     String(r[idx('Notes')]        || '').trim(),
      timeFrom:  String(r[idx('Time From')]    || '').trim(),
      timeTo:    String(r[idx('Time To')]      || '').trim(),
      type:      String(r[idx('Type')]         || '').trim(),
    }));
}

function generateTermSchedule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const recurringSheet = ss.getSheetByName('Recurring');
  const weeksSheet     = ss.getSheetByName('Weeks');
  const planSheet      = ss.getSheetByName('Plan');

  if (!recurringSheet) { ui.alert('No Recurring tab found.'); return; }
  if (!weeksSheet)     { ui.alert('No Weeks tab found.'); return; }
  if (!planSheet)      { ui.alert('No Plan tab found.'); return; }

  // Read Plan headers (determines column positions for writing)
  const planHeaders = planSheet.getRange(1, 1, 1, planSheet.getLastColumn())
    .getValues()[0].map(h => String(h).trim());

  // Read Weeks tab
  const weeksData  = weeksSheet.getDataRange().getValues();
  const wkHeaders  = weeksData[0].map(h => String(h).trim());
  const wkStartIdx = wkHeaders.indexOf('Week Start');
  const wkTermIdx  = wkHeaders.indexOf('Term');
  const wkWeekIdx  = wkHeaders.indexOf('Week');

  const allTerms = [...new Set(
    weeksData.slice(1)
      .filter(r => r[wkTermIdx] !== '' && r[wkTermIdx] !== null)
      .map(r => Number(r[wkTermIdx]))
  )].sort();

  if (allTerms.length === 0) { ui.alert('No terms found in the Weeks tab.'); return; }

  const response = ui.prompt(
    'Generate Term Schedule',
    `Available terms: ${allTerms.join(', ')}\n\nEnter the term number to generate:`,
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const termNum = parseInt(response.getResponseText().trim());
  if (isNaN(termNum) || !allTerms.includes(termNum)) {
    ui.alert(`Term ${termNum} not found in the Weeks tab.`); return;
  }

  const termWeeks = weeksData.slice(1)
    .filter(r => Number(r[wkTermIdx]) === termNum && r[wkStartIdx])
    .map(r => ({
      start: r[wkStartIdx] instanceof Date ? r[wkStartIdx] : new Date(r[wkStartIdx]),
      week:  Number(r[wkWeekIdx]),
    }));

  if (termWeeks.length === 0) { ui.alert(`No weeks found for Term ${termNum}.`); return; }

  const recurRows = readRecurring(recurringSheet);
  if (recurRows.length === 0) { ui.alert('No entries in the Recurring tab.'); return; }

  // Build duplicate-check set from existing Plan rows
  const planData = planSheet.getDataRange().getValues();
  const ph = planData[0].map(h => String(h).trim());
  const tz = Session.getScriptTimeZone();
  const existingKeys = new Set(
    planData.slice(1).map(r => {
      const d = r[ph.indexOf('Date')];
      const ds = d instanceof Date ? Utilities.formatDate(d, tz, 'dd/MM/yyyy') : String(d).trim();
      return `${ds}|${String(r[ph.indexOf('Teacher Out')]).trim()}|${String(r[ph.indexOf('Session')]).trim()}`;
    })
  );

  const newRows = [];
  let skipped = 0;

  termWeeks.forEach(week => {
    recurRows.forEach(r => {
      const offset = DAY_OFFSETS[r.day];
      if (offset === undefined) return;

      const date = new Date(week.start);
      date.setDate(date.getDate() + offset);
      const dateStr = Utilities.formatDate(date, tz, 'dd/MM/yyyy');

      const key = `${dateStr}|${r.teacherOut}|${r.session}`;
      if (existingKeys.has(key)) { skipped++; return; }
      existingKeys.add(key);

      newRows.push(makePlanRow(planHeaders, {
        'Date':        dateStr,
        'Day':         r.day,
        'Term/Week':   `T${termNum}W${week.week}`,
        'Session':     r.session,
        'Teacher Out': r.teacherOut,
        'Cover Staff': r.coverStaff,
        'Reason':      r.reason,
        'Notes':       r.notes,
        'Time From':   r.timeFrom,
        'Time To':     r.timeTo,
        'Type':        r.type,
        'Source':      'Recurring',
      }));
    });
  });

  if (newRows.length === 0) {
    ui.alert(`Nothing to add — all entries already exist.\n(${skipped} skipped)`);
    return;
  }

  newRows.sort((a, b) => {
    const pd = s => { const [d,m,y] = s.split('/'); return new Date(y, m-1, d); };
    const di = planHeaders.indexOf('Date');
    const ti = planHeaders.indexOf('Teacher Out');
    return pd(a[di]) - pd(b[di]) || String(a[ti]).localeCompare(String(b[ti]));
  });

  const lastRow = planSheet.getLastRow();
  planSheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  try {
    const dateColNum = planHeaders.indexOf('Date') + 1;
    planSheet.getRange(lastRow + 1, dateColNum, newRows.length, 1).setNumberFormat('dd/mm/yyyy');
  } catch(e) {
    // Ignore — happens when the sheet is formatted as a Table (typed columns block format changes)
  }

  ui.alert(
    `✓ Generated ${newRows.length} entries for Term ${termNum} (${termWeeks.length} weeks).` +
    (skipped ? `\n${skipped} entries skipped (already existed).` : '')
  );
}

// ── REGENERATE FROM WEEK ──────────────────────────────────────────────────────

function regenerateFromWeek() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const planSheet      = ss.getSheetByName('Plan');
  const weeksSheet     = ss.getSheetByName('Weeks');
  const recurringSheet = ss.getSheetByName('Recurring');

  if (!planSheet || !weeksSheet || !recurringSheet) {
    ui.alert('Plan, Weeks, and Recurring tabs are all required.');
    return;
  }

  // Read Weeks tab — build a list of all weeks with their term labels
  const weeksData = weeksSheet.getDataRange().getValues();
  const wkHeaders = weeksData[0].map(h => String(h).trim());
  const wkStartIdx = wkHeaders.indexOf('Week Start');
  const wkTermIdx  = wkHeaders.indexOf('Term');
  const wkWeekIdx  = wkHeaders.indexOf('Week');

  const allWeeks = weeksData.slice(1)
    .filter(r => r[wkStartIdx])
    .map(r => ({
      start: r[wkStartIdx] instanceof Date ? r[wkStartIdx] : new Date(r[wkStartIdx]),
      term:  Number(r[wkTermIdx]),
      week:  Number(r[wkWeekIdx]),
    }))
    .sort((a, b) => a.start - b.start);

  if (allWeeks.length === 0) { ui.alert('No weeks found in the Weeks tab.'); return; }

  // Build a readable list for the prompt
  const weekList = allWeeks
    .map(w => `T${w.term}W${w.week} (${Utilities.formatDate(w.start, Session.getScriptTimeZone(), 'dd/MM/yyyy')})`)
    .join('\n');

  const response = ui.prompt(
    'Regenerate from Week…',
    `Enter the week label to regenerate from (e.g. T5W3).\nAll auto-generated entries from that week onwards will be replaced.\n\n${weekList}`,
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const input = response.getResponseText().trim().toUpperCase();
  const match = input.match(/^T(\d+)W(\d+)$/);
  if (!match) { ui.alert('Please enter a week label in the format T5W3.'); return; }

  const fromTerm = parseInt(match[1]);
  const fromWeek = parseInt(match[2]);
  const fromEntry = allWeeks.find(w => w.term === fromTerm && w.week === fromWeek);
  if (!fromEntry) { ui.alert(`${input} not found in the Weeks tab.`); return; }

  const fromDate = fromEntry.start;
  const tz = Session.getScriptTimeZone();

  // Delete all Source=Recurring rows with date >= fromDate
  const planData    = planSheet.getDataRange().getValues();
  const planHeaders = planData[0].map(h => String(h).trim());
  const pDateIdx    = planHeaders.indexOf('Date');
  const pSourceIdx  = planHeaders.indexOf('Source');

  if (pSourceIdx === -1) {
    ui.alert('No Source column found in the Plan tab. Please add "Source" as a column header (column M) and try again.');
    return;
  }

  // Collect rows to delete (in reverse order so indices stay valid)
  const rowsToDelete = [];
  planData.slice(1).forEach((r, i) => {
    if (String(r[pSourceIdx]).trim() !== 'Recurring') return;
    const d = r[pDateIdx];
    const rowDate = d instanceof Date ? d : (() => { const [day,m,y] = String(d).split('/'); return new Date(y,m-1,day); })();
    if (rowDate >= fromDate) rowsToDelete.push(i + 2); // +2: 1-indexed + header row
  });

  if (rowsToDelete.length === 0) {
    ui.alert(`No auto-generated entries found from ${input} onwards. Nothing deleted.`);
  } else {
    // Delete from bottom up
    rowsToDelete.reverse().forEach(rowNum => planSheet.deleteRow(rowNum));
  }

  // Now regenerate from fromDate onwards
  // Get all weeks from this week onwards in the same term
  const weeksToGen = allWeeks.filter(w =>
    w.term === fromTerm && w.week >= fromWeek
  );

  // Group by term for generateTermSchedule-style generation
  // Re-read plan (rows may have been deleted)
  const planData2    = planSheet.getDataRange().getValues();
  const planHeaders2 = planData2[0].map(h => String(h).trim());
  const pDateIdx2    = planHeaders2.indexOf('Date');
  const pOutIdx2     = planHeaders2.indexOf('Teacher Out');
  const pSessIdx2    = planHeaders2.indexOf('Session');

  const existingKeys = new Set(
    planData2.slice(1).map(r => {
      const d = r[pDateIdx2];
      const ds = d instanceof Date ? Utilities.formatDate(d, tz, 'dd/MM/yyyy') : String(d).trim();
      return `${ds}|${String(r[pOutIdx2]).trim()}|${String(r[pSessIdx2]).trim()}`;
    })
  );

  // Read Recurring tab (column-name-aware)
  const recurRows = readRecurring(recurringSheet);

  const newRows = [];
  let skipped = 0;

  weeksToGen.forEach(week => {
    recurRows.forEach(r => {
      const offset = DAY_OFFSETS[r.day];
      if (offset === undefined) return;

      const date = new Date(week.start);
      date.setDate(date.getDate() + offset);
      const dateStr = Utilities.formatDate(date, tz, 'dd/MM/yyyy');

      const key = `${dateStr}|${r.teacherOut}|${r.session}`;
      if (existingKeys.has(key)) { skipped++; return; }
      existingKeys.add(key);

      newRows.push(makePlanRow(planHeaders2, {
        'Date':        dateStr,
        'Day':         r.day,
        'Term/Week':   `T${week.term}W${week.week}`,
        'Session':     r.session,
        'Teacher Out': r.teacherOut,
        'Cover Staff': r.coverStaff,
        'Reason':      r.reason,
        'Notes':       r.notes,
        'Time From':   r.timeFrom,
        'Time To':     r.timeTo,
        'Type':        r.type,
        'Source':      'Recurring',
      }));
    });
  });

  if (newRows.length > 0) {
    newRows.sort((a, b) => {
      const pd = s => { const [d,m,y] = s.split('/'); return new Date(y, m-1, d); };
      const di = planHeaders2.indexOf('Date');
      const ti = planHeaders2.indexOf('Teacher Out');
      return pd(a[di]) - pd(b[di]) || String(a[ti]).localeCompare(String(b[ti]));
    });
    const lastRow = planSheet.getLastRow();
    planSheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    try {
      const dateColNum = planHeaders2.indexOf('Date') + 1;
      planSheet.getRange(lastRow + 1, dateColNum, newRows.length, 1).setNumberFormat('dd/mm/yyyy');
    } catch(e) {
      // Ignore — happens when the sheet is formatted as a Table (typed columns block format changes)
    }
  }

  ui.alert(
    `✓ Regenerated from ${input}.\n` +
    `  Deleted: ${rowsToDelete.length} old entries\n` +
    `  Added:   ${newRows.length} new entries` +
    (skipped ? `\n  Skipped: ${skipped} (already existed)` : '')
  );
}

// ── PUBLISH & NOTIFY ──────────────────────────────────────────────────────────

function publishAndNotify() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();

  let config = ss.getSheetByName('Config');
  if (!config) {
    config = ss.insertSheet('Config');
    config.getRange('A1:B1').setValues([['Last Updated', '']]);
  }
  config.getRange('B1').setValue(now);

  const plan    = ss.getSheetByName('Plan');
  const today   = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const summary = buildTodaySummary(plan, today);

  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'EEEE d MMMM yyyy');
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');

  const subject = `Release schedule updated — ${dateStr}`;

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#222;">
      <div style="background:#1798d3;height:8px;border-radius:6px 6px 0 0;"></div>
      <div style="border:1px solid #ddd;border-top:none;padding:20px 22px;border-radius:0 0 6px 6px;">
        <h1 style="font-size:16px;margin:0 0 2px;color:#1798d3;">Wallscourt Farm Academy</h1>
        <p style="font-size:13px;color:#64748b;margin:0 0 18px;">Release schedule updated at ${timeStr} on ${dateStr}</p>
        ${summary}
        <div style="margin-top:20px;">
          <a href="${VIEWER_URL}" style="background:#1798d3;color:white;padding:10px 20px;
            border-radius:4px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">
            View full release schedule →
          </a>
        </div>
        <p style="margin-top:16px;font-size:11px;color:#999;">
          This is an automated notification from the WFA Release Schedule.
          The schedule updates automatically every 3 minutes — just refresh the page.
        </p>
      </div>
    </div>`;

  MailApp.sendEmail({
    to:       NOTIFICATION_EMAILS.join(','),
    subject:  subject,
    htmlBody: htmlBody,
    body:     `Release schedule updated at ${timeStr}. View it here: ${VIEWER_URL}`,
  });

  SpreadsheetApp.getUi().alert(
    `✓ Schedule published\n\nNotification sent to ${NOTIFICATION_EMAILS.length} staff members.`
  );
}

function buildTodaySummary(planSheet, todayStr) {
  if (!planSheet) return '<p style="color:#888;">No Plan sheet found.</p>';

  const data    = planSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const dateIdx  = headers.indexOf('Date');
  const sessIdx  = headers.indexOf('Session');
  const outIdx   = headers.indexOf('Teacher Out');
  const coverIdx = headers.indexOf('Cover Staff');
  const reasonIdx= headers.indexOf('Reason');

  const tz = Session.getScriptTimeZone();
  const todayRows = data.slice(1).filter(row => {
    const d = row[dateIdx];
    if (!d) return false;
    const formatted = d instanceof Date
      ? Utilities.formatDate(d, tz, 'dd/MM/yyyy')
      : String(d).trim();
    return formatted === todayStr;
  });

  if (todayRows.length === 0) return '<p style="color:#64748b;font-size:13px;">No cover arrangements for today.</p>';

  const sessions = ['Before School', 'AM', 'Lunch', 'PM', 'After School'];
  let html = '<p style="font-size:13px;color:#334155;margin:0 0 12px;"><strong>Today\'s arrangements:</strong></p>';

  sessions.forEach(session => {
    const rows = todayRows.filter(r => String(r[sessIdx]).trim() === session);
    if (rows.length === 0) return;
    html += `<p style="font-size:11px;font-weight:bold;color:#64748b;margin:10px 0 5px;text-transform:uppercase;letter-spacing:0.05em;">${session}</p>`;
    rows.forEach(r => {
      const out    = r[outIdx]    || '?';
      const cover  = r[coverIdx]  || 'TBC';
      const reason = r[reasonIdx] || '';
      html += `<div style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;margin-bottom:5px;font-size:13px;">
        <strong>${out}</strong> → <span style="color:#1798d3;font-weight:bold;">${cover}</span>
        ${reason ? `<span style="font-size:11px;color:#64748b;margin-left:6px;">${reason}</span>` : ''}
      </div>`;
    });
  });

  return html;
}

function openViewer() {
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('${VIEWER_URL}','_blank');google.script.host.close();<\/script>`
  ).setWidth(10).setHeight(10);
  SpreadsheetApp.getUi().showModalDialog(html, 'Opening…');
}
