# Setting up Google Sheet Sync

## 1. Create the Google Sheet

1. Go to [sheets.new](https://sheets.new) and create a new blank spreadsheet
2. Name it **WFA Spellings Tracker**
3. Create four tabs (click the + at the bottom):

### Pupils tab
First row (headers):
| id | firstName | lastName | class | pairId | ttSet | ssUser | ssPassword | masteredWords | failedWords |

Then add a row for each pupil, e.g.:
| ch01 | Aaliyah | Rehman | WU | 14 | 9 | aaliyahr67 | funman25 | | |

- **masteredWords**: comma-separated list of words the pupil spells correctly (e.g. `strength, grammar, calendar`)
- **failedWords**: comma-separated list of words the pupil got wrong (e.g. `believe, separate`)
- Leave mastery columns blank for new pupils — the tool will fill them as you mark tests

### Weeks tab
First row (headers):
| id | label | ruleId |

Example row: `w1 | Term 5 Week 1 | y4s1`

### Results tab
First row (headers):
| id | pupilId | date | score | total | w1 | w2 | w3 | w4 | w5 | w6 | w7 | w8 | w9 | w10 | c1 | c2 | c3 | c4 | c5 | c6 | c7 | c8 | c9 | c10 |

- w1–w10: the word
- c1–c10: Y or N

### Config tab
First row (headers):
| key | value |

Example rows:
```
currentWeek | w1
adaptedPupils | ch05,ch23
hlMaths | Complete page 42
hlReading | Read chapters 3-4
hlMathsAdapted | Complete page 30
hlReadingAdapted | Read chapters 1-2
wordBank | strength,grammar,calendar,women
```

4. Make the Sheet publicly accessible:
   - Click **Share** (top right)
   - Change to **Anyone with the link**
   - Permission: **Viewer** is fine (the Apps Script handles writes)

5. Copy the **Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit`

---

## 2. Deploy the Apps Script

1. Open your Google Sheet, click **Extensions > Apps Script**
2. Delete any code in `Code.gs`
3. Paste the entire contents of `sync-script/Code.gs`
4. Replace `PASTE_YOUR_SHEET_ID_HERE` with your actual Sheet ID
5. Click **Deploy > New deployment**
6. Click the gear icon next to "Select type" and choose **Web app**
7. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
8. Click **Deploy** and authorize when prompted
9. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/.../exec`)

---

## 3. Connect the HTML tool

Open `index.html` and find these two lines near the top of the script:

```js
const SHEET_ID   = ''; // Paste your Sheet ID here
const SYNC_URL   = ''; // Paste your Apps Script web app URL here
```

Paste in your values:

```js
const SHEET_ID   = '1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';
const SYNC_URL   = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Save and open the file in a browser. You should see **"Synced"** in the header.

---

## 4. First-time data push

If you already have pupil data in the tool (from localStorage):

1. Open the **Data** tab
2. Click **Push to Sheet** — this writes all current data to the Sheet
3. Verify in the Google Sheet that the Pupils tab now has all 60 pupils

If starting fresh:
1. Click **Load Real Pupil Data** on the Dashboard
2. This saves to localStorage AND pushes to the Sheet automatically

---

## Troubleshooting

- **"Sync failed"** in header: Check that the Sheet ID and SYNC_URL are correct, and the Apps Script is deployed as "Anyone"
- **"Local only"** in header: SHEET_ID or SYNC_URL is empty — the tool works fine from localStorage, just without sync
- **CORS errors**: The Apps Script web app handles CORS automatically. If you see CORS errors, make sure you deployed as "Web app" not "API executable"
- **Data not appearing in Sheet**: Click **Push to Sheet** on the Data tab to force a write