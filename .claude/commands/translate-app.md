# App Translation Orchestrator

Use this skill to translate UI strings for the SaySomethingin (SSi) language-learning mobile app.

**Usage:**
- `/translate-app <lang>` — fill gaps in an existing language (or create the file if it doesn't exist)
- `/translate-app <lang1>,<lang2>,...` — multi-language fill
- `/translate-app --new <lang>` — generate a full translation file for a new language from scratch
- `/translate-app --keys key1,key2,...` — add specific keys to all known languages
- `/translate-app --keys-from <file> --langs <list>` — translate keys listed in a file to the listed languages
- Spreadsheet path defaults to `~/Downloads/SSI-Translations.xlsx` if Allion has shared a fresh gap audit

The skill orchestrates parallel Opus agents — one per target language. You don't translate yourself; you set up the work and the agents do it.

---

## Where things live

- **Translation files**: `~/Documents/GitHub/course-configs/Translations/{lang}.json` (one per language; ~17 currently exist)
- **Allion's gap-audit spreadsheet** (when fresh): `~/Downloads/SSI-Translations.xlsx`
- **Working dir**: `/tmp/ssi-xlsx/` — batch files, output JSONs, intermediate state. Wipe and recreate per run.
- **EN source of truth**: `course-configs/Translations/en.json` (always). If a key isn't there, we don't translate — see "Parked: missing in EN" below.

---

## Workflow

### Step 1: parse intent

Three distinct modes — figure out which one applies from the user's message:

| Mode | Trigger | Output |
|------|---------|--------|
| **gap-fill** | `/translate-app fr` (lang already has a JSON) | Fill missing keys for that lang |
| **new-language** | `/translate-app --new hi` (lang has no JSON yet) | Create full file from EN source |
| **add-keys** | `/translate-app --keys foo,bar,baz` | Translate those keys for every existing lang |

If ambiguous, ask the user once before proceeding. Don't assume.

### Step 2: build the batch files

Set up a clean working dir:

```bash
rm -rf /tmp/ssi-xlsx && mkdir -p /tmp/ssi-xlsx/batches /tmp/ssi-xlsx/output
```

**For gap-fill mode** — diff existing JSON against EN, list missing keys with EN values:

```javascript
const fs = require('fs');
const en = JSON.parse(fs.readFileSync(EN_JSON, 'utf8'));
const target = JSON.parse(fs.readFileSync(TARGET_JSON, 'utf8'));
const missing = Object.keys(en).filter(k => !target[k] && en[k] !== 'MISSING' && en[k] !== '');
```

If the user has the Allion spreadsheet handy, prefer that — it captures Allion's authoritative gap list. Parse with the script at `scripts/experiments/parse-translations-xlsx.cjs` (create if missing — see "Spreadsheet parser" below).

**For new-language mode** — every key with an EN value goes into the batch.

**For add-keys mode** — only the user-specified keys, with EN values pulled from `en.json`.

Write per-language batch files to `/tmp/ssi-xlsx/batches/{LANG}.txt`:
```
key1
  EN: english source value

key2
  EN: english source value
```

### Step 3: park keys missing in EN

**Never invent EN.** If the user-specified keys (or gap-fill set) include keys with no EN value, write them to `/tmp/ssi-xlsx/batches/_PARKED_missing_in_EN.txt` and skip translating. Tell the user at the end: "These need EN source from product/Allion before I can translate."

### Step 4: spawn parallel Opus agents — one per language

Use the Agent tool with `model: opus`, `run_in_background: true`. Each prompt:

```
You are translating UI strings from English to {LANG_NAME} ({lang}) for the
SaySomethingin (SSi) language-learning mobile app. Production app.

Read first:
1. ~/Documents/GitHub/course-configs/Translations/{lang}.json (if it exists — for tone)
2. /tmp/ssi-xlsx/batches/{LANG}.txt — keys to translate, with EN source. {N} entries.

Style rules:
- {language-specific notes from the cheat-sheet below}
- Brand "SaySomethingin" stays in English. App Store / Google Play / Google /
  Apple / Facebook stay in English.
- Variable placeholders in {curly_braces} (e.g. {variableSubscription_price1},
  {amount}, {currency}, {belt_color}) — preserve EXACTLY as in EN source.
- Don't flag source typos (Contentt, ?., stray quotes) — translate the clean
  intended meaning silently. Per feedback_translate_keep_typos.

Output: write JSON to /tmp/ssi-xlsx/output/{LANG}.json shaped as
{"key": "translation", ...}. All N keys present, no empties, no MISSING markers,
all {vars} preserved.

Report at end: count done, output path. Skip per-key annotations.
```

Spawn ALL languages in parallel. Don't serialise.

### Step 5: validate outputs

Once all agents complete, verify each output:

```javascript
const expected = batchKeys; // from the batch file
const got = Object.keys(JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8')));
// 1. count match
// 2. no empty values
// 3. no "MISSING" string values
// 4. every {var} placeholder in EN source appears in translation
```

If any agent failed validation, re-run that language only.

### Step 6: report

Tell the user:
- ✓ langs that completed cleanly + total cell count
- ⚠ langs that need re-running (with reasons)
- 📋 keys parked because EN was missing
- Output paths

**Don't merge into the course-configs JSON files automatically.** Kai or Ivan does the merge after review. The skill outputs to `/tmp/ssi-xlsx/output/` for them to inspect.

### Step 7: log to memory

Update `memory/active-projects.md` with the run summary (silently — per `feedback_log_proactively.md`).

---

## Per-language style cheat-sheet

Match register, formality, and script. **Read the existing JSON file first** if it exists — the file's actual conventions outrank this table.

| Lang | Code | Register / form | Script | Notes |
|------|------|----------------|--------|-------|
| Arabic (MSA) | `ar` | Formal MSA, الفصحى | RTL | Use `؟` and `،`. Latin for brand, App Store, Google Play |
| Bengali | `bn` | Formal **আপনি** | Bangla | Tech loanwords transliterated (লগইন, অ্যাপ) |
| Welsh | `cy` | **North Walian** colloquial: efo, rŵan, dwi, fo, fedra i, gen i | Latin | Welsh anthem = `Hen Wlad Fy Nhadau`. NW dialect for SSi team. |
| German | `de` | Standard, formal Sie if existing file uses it | Latin | |
| Greek | `ell` | (no JSON yet) Standard formal | Greek | |
| English | `en` | n/a (source) | Latin | |
| Spanish | `es` | Informal **tú** (matches es.json) | Latin | Castilian forms (e.g. `ordenador` not `computadora`) |
| Basque | `eu` | Standard Euskara Batua | Latin | Agglutinated forms — don't reduce to bare nouns |
| Persian/Farsi | `fas` | (no JSON yet) Formal آپ-equivalent | RTL | |
| Finnish | `fi` | Informal sinä-form (sinuttelu) | Latin | Compound nouns common, match concision |
| French | `fr` | **vous** (matches fr.json) | Latin | Space before `!` and `?` |
| Irish | `ga` | Caighdeán Oifigiúil | Latin | **Brevity preferred** (e.g. shorter forms over compound names) |
| Gujarati | `gu` | Formal **તમે** | Gujarati | Tech loanwords transliterated |
| Hindi | `hi` | Formal **आप** | Devanagari | Tech loanwords (लॉगिन, ऐप, पासवर्ड) |
| Italian | `it` | Polite Lei or informal tu — match existing | Latin | |
| Japanese | `ja` | Polite です/ます | mixed | Brand katakana for tech (アプリ, ログイン), brand name `SaySomethinginアプリ` pattern |
| Korean | `ko` | -습니다 / -주세요 polite | Hangul | |
| Dutch | `nl` | Formal u or informal je — match existing | Latin | |
| Punjabi (East) | `pa` | Formal **ਤੁਸੀਂ** | Gurmukhi | Indian Punjabi (not Shahmukhi) |
| Polish | `pl` | (no JSON yet) Formal Pan/Pani | Latin | |
| Portuguese | `pt` | **Brazilian** (matches pt.json: aplicativo, Marrom, você) | Latin | Don't switch to European mid-file |
| Sinhala | `si` | Formal written | Sinhala | |
| Tamil | `ta` | Formal written | Tamil | Heavy inflection; keep correct verb endings |
| Turkish | `tr` | (no JSON yet) Formal siz | Latin | |
| Urdu | `ur` | Formal **آپ** | Nastaliq RTL | `؟`, `،` punctuation |
| Mandarin | `cmn` / `zho` | Polite **您** | Simplified Han | Confirm Simplified vs Traditional from existing file |
| Yoruba | `yor` | Formal **ẹ**-form (plural-of-respect) | Latin + tone marks | Don't drop diacritics (ẹ ọ ṣ + acute/grave) |

For dialect/regional variant labels (Mexican, Brazilian, Canadian, Austrian, Egyptian, Syrian, Lebanese, Standard, Castilian, European), see the variant translations stored under `languagemxvariant`, `languagebrvariant`, `languagecavariant`, etc. in each file.

---

## Spreadsheet parser

If Allion (or anyone) shares a fresh gap-audit xlsx, parse it without needing pip installs (xlsx is just a zip):

```bash
cd /tmp/ssi-xlsx && unzip -q "$XLSX_PATH"
```

Then a Python script using stdlib `xml.etree.ElementTree` reads `xl/sharedStrings.xml` and `xl/worksheets/sheet1.xml`. See `scripts/experiments/parse-translations-xlsx.cjs` (create on first run if missing — model after the script that produced `/tmp/ssi-xlsx/parsed.json` on 2026-04-27).

Columns to expect: `Key`, `EN Value`, `ES Value`, ..., `Status`. Rows where any column == `MISSING` are gaps.

---

## What this skill does NOT do

- Does not modify the course-configs JSON files directly. Output goes to `/tmp/ssi-xlsx/output/` for human review and merge.
- Does not invent EN source values. Keys with `EN MISSING` get parked.
- Does not flag every source typo. Per `feedback_translate_keep_typos.md`, the agents translate the clean intended meaning silently and call out anything genuinely unresolvable at the end of their report.
- Does not run sequentially. All languages spawn in parallel.

---

## Reference run

The 2026-04-27 run translated **3,350 cells across 19 languages** in three waves (6 + 7 + 6 parallel Opus agents). Outputs landed at `/tmp/ssi-xlsx/output/{LANG}.json`. Total wall-clock under 5 minutes per wave. Use that run as a template for cost estimation.
