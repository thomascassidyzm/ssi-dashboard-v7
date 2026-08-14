# pdc_for_eng — `welle`→`wolle` and `ganz`→`ganze`, applied 2026-08-14

Course `pdc_for_eng`, live Supabase. Authorised by Kai, 2026-08-14.
Before-images: `docs/pdc-welle-ganze-2026-08-14-before-images.json` (293 phrase rows, 2 LEGO cards, 6 seed rows, the whole `courses` guidance blob).

## What the defects actually are

Doug's redo notes (`seed_redo_snapshots`) are the authority:

| seed | Doug's note | date |
|---|---|---|
| 14 | change ganz to ganze | 2026-08-12 |
| 15 | Change ganz to ganze when it follows die or der | 2026-08-12 |
| 16 | change ganz to ganze if it follows der or die | 2026-08-13 |
| 17 | replace ganz with ganze following der or die | 2026-08-13 |
| 18 | replace welle with wolle | 2026-08-13 |
| 19 | replace ganz with ganze | 2026-08-13 |

Doug then **approved** seeds 14 and 18 in their corrected form. Seed 18 post-redo is the calibration
standard used throughout: `mir wolle`, `eb mir mariye zerickkumme wolle`, `der ganze Daag`.

## `welle` — three different words, only one is a defect

387 phrase rows carried `welle`. They are not one thing:

1. **Finite plural of "want"** (`mir welle`, `as Leit ... welle`) — Doug's defect. **239 rows → `wolle`.**
2. **Non-finite after an auxiliary** (`ich hab dich sehne welle`) — Kai deliberately set this form
   in his 2026-08-11 list, item 127 (`hab sehne wolle` → `hab sehne welle`). **138 rows LEFT ALONE.**
3. **The interrogative determiner "which"** (`welle Buch`, `welle vun deine Freind`) — a different
   word entirely. **10 rows LEFT ALONE.**

## `ganz` after `der`/`die`

53 phrase rows (`die ganz` 31, `der ganz` 22) → `die ganze` / `der ganze`.
Adverbial `ganz` with no preceding article (seed 544, `hot ganz recht ghatt`) untouched.

## Rows written

| what | count |
|---|---|
| practice phrases, `welle` → `wolle` (finite plural only) | 239 |
| practice phrases, `der/die ganz` → `der/die ganze` | 53 |
| component tile `S0010L02C02` `ganz` → `ganze` | 1 |
| LEGO cards `S0010L02`, `S0069L03` (target_text + components) | 2 |
| seed rows 10, 36, 69, 398, 399, 400 | 6 |
| `courses.quality_rules` + `courses.translation_analysis` | 1 |

No approval state was touched. Seed 10 remains `approved`/`released`.

## Stored guidance — the regeneration source

The guidance taught the paradigm as `will/witt/will/welle/welle/welle` and
`witt/welle`, i.e. it told the generator the plural was `welle`. Corrected to `wolle`, the
non-finite `hab ... welle` explicitly preserved, and a new `quality_rules.pdc_house_rules` array
added holding all three rules in plain prose with the seed numbers Doug corrected.

## Audio

`course_audio` for `pdc_for_eng` holds exactly **1 row** (role `welcome`). Zero phrase, LEGO or seed
rows carry an audio link. **No clip is affected and no TTS is required.**

## Left alone deliberately — for Kai

- **`Sentence` itself.** The scout called `die ganz Sentence` a half-English phrase. Doug never
  flagged the word; Kai's own 2026-08-11 list keeps it at item 10; and the course borrows English
  nouns elsewhere (`Movie`, `Football`, `Bus`). Only `ganz`→`ganze` was applied. Card `S0010L02`
  now reads `die ganze Sentence`.
- **Non-finite `welle` vs `wolle` is inconsistent in the corpus** — 138 rows use `welle` after an
  auxiliary, 46 already use `wolle` (e.g. `mir hen heere wolle`, seed 71). Kai's own list is split
  the same way: item 127 `hab sehne welle` against items 178/201 `hab wolle`/`hen wisse wolle`.
  Needs a ruling; nothing was normalised.
- **`Welle dihr?` (seeds 643, 658)** — 2nd person plural polite. Same paradigm, but Doug never
  ruled on this pronoun and it is a politeness form. Untouched.
- **`Weller vun selle Bletz` (seed 492)** — the "which" word. Untouched.
- **Kai's list item 69 conflict.** Kai's 2026-08-11 wording is `der ganz Nammidaag`; Doug's later
  rule makes it `der ganze Nammidaag`. Doug's rule applied, as it is later and he is the checker.

## Reversal

For every row in the before-images file, restore `target_text` (and `components` for the two LEGO
cards, `quality_rules`/`translation_analysis` for the course row) to the captured value.
