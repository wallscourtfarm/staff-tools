/* ════════════════════════════════════════════════════════════════
   Wallscourt Farm Academy — Spelling Pop demo roster (PROOF OF CONCEPT)
   Five made-up pupils standing in for a real class list.

   Each pupil gets:
     id   — short code used both as the QR code's "?u=" value and as
             something they can type by hand if a device has no camera
     name — shown on screen once they're identified
     pin  — 4-digit PIN, printed on their card, given out by the teacher
     year — Y2–Y6, picks which year group's word lists they see

   In a real deployment this file would be generated from the class
   list already held in the Spelling Assessment tool, with PINs
   randomly generated once per pupil and never shown again outside
   their printed card.
   ════════════════════════════════════════════════════════════════ */
const ROSTER = [
  { id: "AM72", name: "Amelia", pin: "4821", year: "Y5" },
  { id: "NH19", name: "Noah",   pin: "1937", year: "Y5" },
  { id: "FR66", name: "Freya",  pin: "6650", year: "Y5" },
  { id: "RH33", name: "Rohan",  pin: "3308", year: "Y5" },
  { id: "IS91", name: "Isla",   pin: "9142", year: "Y5" }
];

/* The week currently being taught — the one thing to change here each
   week when printing new cards. Every pupil's card uses this same
   term/week, each within their own year group above. */
const CURRENT_WEEK = { term: "T1", week: "W1" };

/* Where the game itself lives, relative to this file's folder. */
const GAME_URL = "index.html";
