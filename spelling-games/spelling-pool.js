/* ════════════════════════════════════════════════════════════════
   Wallscourt Farm Academy — Spelling Games shared word-pool helpers

   Turns LESSONS (lessons-data.js) into what a game actually needs:
   a year + week picker, the union of every word taught that week
   (not just one lesson's 5), the rule text to show, and a plausible
   "wrong" spelling for each word so games like Spelling Pop can ask
   "which one is right?" without a hand-authored word list.

   Any game on the site can include this file + lessons-data.js and
   get the same picker/pool behaviour for free.
   ════════════════════════════════════════════════════════════════ */

const TERM_LABELS = { T1: "Term 1", T2: "Term 2", T3: "Term 3", T4: "Term 4", T5: "Term 5", T6: "Term 6" };

function spGetYears() {
  return [...new Set(LESSONS.map(l => l.year))].sort();
}

function spGetWeeksForYear(year) {
  const seen = new Set();
  const out = [];
  LESSONS.filter(l => l.year === year).forEach(l => {
    const key = l.term + l.week;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ term: l.term, week: l.week, label: `${TERM_LABELS[l.term] || l.term} — Week ${l.week.replace("W", "")}` });
    }
  });
  out.sort((a, b) => a.term === b.term
    ? parseInt(a.week.slice(1), 10) - parseInt(b.week.slice(1), 10)
    : a.term.localeCompare(b.term));
  return out;
}

function spGetWeekLessons(year, term, week) {
  return LESSONS.filter(l => l.year === year && l.term === term && l.week === week)
    .sort((a, b) => a.weekLesson - b.weekLesson);
}

/**
 * The full word pool + distinct rules for a year/term/week, combining every
 * lesson that week — the "Mix (choose from all lessons)" behaviour already
 * used by the Home Learning picker in the Spelling Assessment tool.
 */
function spGetWeekPool(year, term, week) {
  const lessons = spGetWeekLessons(year, term, week);
  const words = [...new Set(lessons.flatMap(l => (l.hlWords || []).map(w => w.toLowerCase())))];

  const rules = [];
  const seen = new Set();
  lessons.forEach(l => {
    if (!l.explanation) return;
    const key = l.focus + "|" + l.explanation;
    if (seen.has(key)) return;
    seen.add(key);
    rules.push({ focus: l.focus, explanation: l.explanation, exampleWords: l.hlWords || [] });
  });

  return { year, term, week, lessons, words, rules };
}

/* ── Heuristic "wrong spelling" generator ──
   There's no hand-authored list of common errors in the source data, so
   this guesses a plausible near-miss: known rule-shaped patterns first
   (the same families that show up across the curriculum — -tch/-ch,
   doubled consonants, silent letters, -dge/-ge, -ies), then a generic
   single-letter drop as a fallback for anything else. It's a heuristic,
   not a verified list — worth a quick glance before using with a class,
   the same way you'd skim any auto-generated resource. */
function spGuessWrongSpelling(word) {
  const w = String(word).toLowerCase();
  const patterns = [
    { test: /tch/, apply: s => s.replace("tch", "ch") },
    { test: /dge/, apply: s => s.replace("dge", "ge") },
    { test: /^kn/, apply: s => s.slice(1) },
    { test: /^gn/, apply: s => s.slice(1) },
    { test: /^wr/, apply: s => s.replace(/^wr/, "r") },
    { test: /ies$/, apply: s => s.replace(/ies$/, "ys") },
    { test: /ck/, apply: s => s.replace("ck", "k") },
    { test: /ph/, apply: s => s.replace("ph", "f") },
    { test: /([a-z])\1/, apply: s => s.replace(/([a-z])\1/, "$1") }
  ];
  for (const p of patterns) {
    if (p.test.test(w)) {
      const out = p.apply(w);
      if (out && out !== w) return out;
    }
  }
  // Generic fallback: drop one interior letter.
  if (w.length > 3) {
    const i = 1 + Math.floor(Math.random() * (w.length - 2));
    return w.slice(0, i) + w.slice(i + 1);
  }
  return w + w.slice(-1); // last resort for very short words
}

function spBuildWordPairs(words) {
  return words
    .map(w => ({ correct: w, wrong: spGuessWrongSpelling(w) }))
    .filter(p => p.wrong && p.wrong !== p.correct);
}
