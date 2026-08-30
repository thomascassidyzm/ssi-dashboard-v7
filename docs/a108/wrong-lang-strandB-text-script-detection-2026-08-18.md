# Wrong-language sweep — Strand B: text-side script detection

**Scope:** every TEXT string estate-wide written in a script that cannot belong to the course's
target or known language. READ-ONLY: 0 database writes, 0 audio generated, £0 spent.
**Not this strand:** audio-link mismatches (slot → clip of the wrong language) — strand A owns that.

---

## Headline

| | count |
|---|---|
| Strings scanned | **4,759,361** across 4 tables, 9 columns, 146 courses |
| Raw detector hits | 11,949 |
| Discarded (one punctuation character) | **11,559** |
| **HIGH confidence** | **298** |
| **BORDERLINE** | **92** |

**The Breton incident does not reproduce on the text side.** `bre_for_fra` — 630 legos, 668 seeds,
5,926 phrases, 97 audio rows — has **zero** text-script hits. The Japanese word reached that learner
through the audio link, not through corrupted text. Strand A's angle is the right one for that card.

**But the class exists, in a different shape.** Three real defect classes, below.

---

## Calibration (run before any counting)

**1. Unit tests — 28/28 pass, 0 fail** (`scripts/wrong-lang/strandB/calib-unit.cjs`)
Includes the discriminating pairs: `ありがとう` flags in a `fra` course and is silent in `jpn`;
`안녕하세요` flags in `jpn`, silent in `kor`; `ಕನ್ನಡ` silent in `kan`, flags in `tel`;
`తెలుగు` flags in `kan`. Romaji/pinyin (`xie xie ni`), Latin abbreviations in a Thai course
(`OK, e.g. TV`), halfwidth katakana, and punctuation-only strings all behave as specified.

**2. Negative control, Latin-script courses — 0 hits.**
`spa_for_eng`, `fra_for_eng`, `nld_for_eng`: **257,500 strings, 0 hits.**

**3. Negative control, non-Latin courses.** `rus_for_eng`: 0. `tha_for_eng`: 2 borderline, both the
same metalinguistic gloss `"a lot more than (with ๆ)"` — an English known-text citing a Thai
character on purpose. `jpn_for_eng`: 1 HIGH + 5 BORDERLINE, all genuine component side-swaps
(listed below). The detector is **not** firing on ordinary Japanese/Russian/Thai content.

**4. Planted positive, through the real pipeline** (`scripts/wrong-lang/strandB/calib-plant.cjs`).
Real `bre_for_fra` rows pulled from the DB, one field overwritten **in memory only** (no writes),
then pushed through the identical field-selection / allowed-script / detect logic the estate scan uses.
- baseline, unmutated: **0 hits** (expected 0)
- planted: **7/7 detected** — kana, han, hangul, Cyrillic, Thai, Hebrew, Devanagari,
  across `known_text`, `target_text`, and `components[].target`.

So: the detector fires on a true wrong-script case in all three field shapes, and stays silent
on clean courses in both Latin and non-Latin scripts.

---

## Discard bucket: 11,559 — and it is exactly one character

Audited character-by-character (`discard-audit.cjs`). The **entire** discard bucket is
**U+0964 DEVANAGARI DANDA `।`** — and nothing else. Distinct discarded characters: **1**.

**Grounds:** the danda is the shared sentence-final punctuation of the Indic orthographies. It lives
in the Devanagari Unicode block but carries no language identity — Bengali, Kannada, Nepali, Marathi
and Gujarati all use it. Example: `"এটা একটা চ্যালেঞ্জ হওয়ার কথা।"` in `eng_for_ben` is
correct Bengali with correct punctuation. Discarding it is safe; no other character was discarded,
so nothing real is hiding in this bucket.

---

## HIGH-confidence findings, by defect class

### Class 1 — SIDE-SWAP: `eng_for_tam` component tiles are inverted (250 fields / 90 legos)

`eng_for_tam` is `known=tam / target=eng`. In 90 of its 828 legos-with-components, the
`components` jsonb has known and target **the wrong way round**.

Correct (738 legos), `S0001L01`: `[{"known":"நான்","target":"I"},{"known":"விரும்பு","target":"want"}]`
Broken (90 legos), `S0164L01`: `[{"known":"interesting","target":"சுவாரஸ்யமான"},{"known":"book","target":"புத்தகம்"}]`

The parent row is **fine** in every one of the 90 — `known_text` is Tamil, `target_text` is English;
verified 0/90 have Tamil in `target_text`. Only the components jsonb is inverted. Components are
displayed to the learner as tiles, so this is learner-visible: a Tamil speaker is shown the Tamil
word in the slot where the English answer belongs.

Seeds affected (85 seeds, contiguous-ish from 159): 159–199, 201–210, 212, 213, 217, 218, 222–230,
232, 233, 235, 236, 240–242, 245, 246, 262, 264, 266, 277, 281, 284, 287, 290, 293, 294, 299, 300.
Full lego_id list in `hits.json`.

### Class 2 — SIDE-SWAP: `nep_for_eng` known side is Nepali, not English (14 strings)

`known=eng / target=nep`, yet `known_text == target_text`, both Nepali — the English gloss is absent.

| table | seed | id | known_text |
|---|---|---|---|
| course_legos | 93 | S0093L01 | `अब` |
| course_legos | 93 | S0093L03 | `भयो` |
| course_legos | 94 | S0094L01 | `यही` |
| course_legos | 94 | S0094L02 | `एक` |
| course_legos | 94 | S0094L05 | `हो` |
| course_legos | 110 | S0110L02 | `हौं,` |
| course_practice_phrases | 93 | — | `भयो`, `अब` |
| course_practice_phrases | 94 | — | `हो`, `एक`, `यही` |
| course_practice_phrases | 110 | — | `हौं,`, `friends हौं,`, `we are friends हौं,` |

The seed-110 phrases are the clearest tell: `"we are friends हौं,"` is half-translated.

### Class 3 — SIDE-SWAP: scattered singles

| course | table.column | seed | id | script | string |
|---|---|---|---|---|---|
| eng_for_jpn `[jpn/eng]` | legos.components[0].target | 12 | S0012L04 | kana | `したくありません` |
| eng_for_jpn | legos.components[0].target | 11 | S0011L04 | kana | `なりたい` |
| eng_for_jpn | legos.components[0].target | 11 | S0011L02 | kana | `〜たら` |
| eng_for_jpn | legos.components[0].target | 72 | S0072L01 | kana | `doing (from やる, to do)` |
| eng_for_jpn | phrases.target_text | 72 | — | kana | `doing (from やる, to do)` |
| jpn_for_eng `[eng/jpn]` | legos.components[1].known | 206 | S0206L01 | kana | `する` |
| kor_for_eng `[eng/kor]` | legos.components[0].known | 334 | S0334L03 | hangul | `안게` |
| tel_for_eng `[eng/tel]` | legos.known_text | 334 | S0334L01 | telugu | `the kitten (accusative -ని)` |
| tel_for_eng | legos.known_text | 152 | S0152L02 | telugu | `differently (with -లా)` |

The two `tel_for_eng` and the `eng_for_jpn` seed-72 rows are **deliberate metalinguistic glosses**
(an English known-text citing the target form in a parenthesis) — real script mixing, but authored,
not corruption. They belong to the known "parenthetical baked into known_text" class, not this sweep.
The bare ones (`したくありません`, `なりたい`, `〜たら`, `する`, `안게`) are untranslated cells.

### Class 4 — ALIEN SCRIPT / MOJIBAKE in `course_audio.text` (the TTS spoke these)

This is the column the brief flagged, and it is the worst-looking one. These strings are what the
synthesiser was actually handed.

**`hye_for_eng` (Armenian) — 17 clips, Cyrillic and Arabic letters spliced into Armenian words:**

| audio_id | role | offenders | text |
|---|---|---|---|
| `279965a1-cf95-4776-bc6c-6d242248bf03` | target1 | cyrillic `отто` | `Իսկ ես՝ ռիզотто։ Սկզբում՝ փոքրիկ կանաչ աղցան։` |
| `8a44c6b1-08d9-4230-9cc7-c4095e260de6` | target1 | cyrillic `тт` | `Այո, սաղմոնն ու ռիզոттоն երկուսն էլ առանց գլյուտենի են։ …` |
| `cf726fd1-fc49-4bb7-8bd3-64058df30b08` | target1 | cyrillic `тт` | (same text) |
| `f95910ab-f566-4f0e-b97f-217f8876b70e` | target1 | cyrillic `тт` | (same text, truncated) |
| `5087b58b-315d-4d72-bee3-edf901f96dbf` | target1 | cyrillic `отто` | `Իսկ ես՝ ռիզотто։ ` |
| `0d67291a-9f09-4107-ad73-fc77e069558c` | target1 | cyrillic | `Ես kхash կvercnem։ Лавашoв, խndrеm։` |
| `2b606338-7b0a-42c4-bb0f-290e46d503dd` | target1 | cyrillic | `Խոrovats կա, դоlma, մանты, կhash, և բանջarեղenի կorma։` |
| `4007c949-2609-4795-a01e-291434a0a63a` | target1 | cyrillic | `Ինձ դolma։ Եte սեղանի համar մekдolma էլ avelaцreq։` |
| `b62005eb-d0ed-4b0e-ac0d-37c723e571be` | pod | cyrillic | `"Խоровats կա". means there's khorovats. "դolma". means dolma. …` |
| `a71409bd-b1f3-4942-b758-97000e247f50` | target1 | arabic `اف` | `Պարզապես երկու սուրճ, խնդրեմ։ Ինձ՝ կافeinaz։` |
| `a348da6b-e3fe-41e3-8de1-f35404a953b6` | target1 | arabic `اف` | (same text) |
| `86bca2a7-6b7f-4dca-9856-27bdba86466e` | target1 | arabic `اف` | `Ինձ՝ կافeinaz։` |
| `62ce0630-953a-4461-a367-796c51a522cf` | target1 | arabic `اف` | `Պարզապես երկու սուրճ, խնդրեմ։, Ինձ՝ կافeinaz։` |
| `8bda92ab-224b-4f36-8998-852743602e85` | target1 | arabic `ار` | `Իհارikե։ Ահա՝ իմ անձնագիրը։` |
| `318aefd4-d8cc-4460-ac0b-00f5e843bd3a` | target1 | arabic `ار` | `Իհارikե։ ` |

Note these strings are also mixing **Latin** into Armenian (`կafeinaz`, `Խոrovats`, `մekдolma`,
`kхash`). This matches the recorded `hye_for_eng` corruption class — the text is garbage, so
re-rendering it would only re-speak the garbage. **Fixing the text is the prerequisite, not the audio.**

**`tur_for_eng` — Cyrillic `асалард` inside a Turkish verb (3 rows, one string):**
- `course_seeds.target_text`, seed **557**, `S0557`: `Keşke bu kadar yüksek sesle müzik çalmасалардı.`
- `course_audio` `8f706291-5c62-46c1-8fa7-dde2d3e37934` (target1) and
  `9107e985-ae80-4ad1-95c8-d4596d6c0bcd` (target2) — same string, already spoken.

**`swa_for_eng` — `course_seeds.target_text`, seed 372, `S0372`:**
`Je, uliона alichokuwa akijaribu kuunda?` — Cyrillic `она` inside the Swahili `uliona`.

**`eng_for_sin` — Sinhala with Telugu/Devanagari `మమ`/`मम` where Sinhala `මම` belongs (4 clips):**
`85312a61-…`, `0502f1d4-…` (telugu), `d33b16a6-…`, `63e1a35a-…` (devanagari) — all role `known`.

**`eng_for_kan` — Kannada with Telugu vowel signs (2 HIGH + 8 borderline):**
`5fbfb70c-…`, `e45c9497-…` — `ಅವಳు`/`ಹೇಳಿದಳు` carry Telugu `ు` instead of Kannada `ು`.
This is the already-recorded Kannada Telugu-vowel corruption; these rows are still live.

**Reachability:** of the audio rows flagged here, **15 are linked into learner-facing slots**
(3 in `course_legos`, 2 in `course_seeds`, 10 in `course_practice_phrases`). The remainder are
unlinked clips.

---

## BORDERLINE (92) — listed, not claimed

- **50 HOMOGLYPH/MOJIBAKE**, one or two alien characters inside an otherwise native word.
  Biggest: `eus_for_spa` 24 (Cyrillic `а` in `esnatzeа` — one seed, `S…` target_text + 7 phrases
  + 16 clips, all the same corrupted word). Then `cym_n_for_eng` 6 (`hеr`, `problеm` with Cyrillic
  `е` — 4 clips already spoken), `swa_for_eng` 4 (`nilichо`), `est_for_eng` 1
  (`selle naljakа loo`), `eng_for_kan` 10, `hye_for_eng` 3.
  These are **real text corruption** and worth fixing — they are borderline only for *this* sweep's
  question (they are not wrong-*language* content, they are single-character contamination).
- **42 SIDE-SWAP**, dominated by authored metalinguistic glosses: `fas_for_eng` 25
  (`"you know (2sg present of دانستن)"` — English known-text citing the Persian infinitive,
  legitimate), `jpn_for_eng` 5 (`の` as a component known — arguably correct for a particle),
  `eng_for_jpn` 5, `zho_for_eng` 3 (`儿` as a component known), `tel_for_eng` 2, `tha_for_eng` 2.

Full records for all 92 in `hits.json`.

---

## EXPLICIT GAPS

1. **The method is blind on 69 of 146 courses.** Where known and target share an identical script
   repertoire, script detection has *zero* discriminative power. A Spanish word in a French course,
   or an `eng_for_tam`-style component inversion in a Latin/Latin pair, is **invisible** to this
   strand. `bre_for_fra` — the incident course — is one of the 69. Full list in `hits.json`.
   **The `eng_for_tam` inversion was only findable because Tamil is not Latin; the same bug in
   `eng_for_spa` would have produced 0 hits.** A lexicon/language-ID pass is needed to close this.
2. **Columns not scanned** (outside the brief's list, flagged rather than silently skipped):
   `*.target_text_roman` (Latin by design — pure noise), `course_audio.text_normalized`,
   `course_audio.text_stripped`, `*.known_gloss_segments`, `course_practice_phrases.decomposition`.
3. **`zzz` language side**: `zzz_test_for_eng`, `zzz_test2_for_eng` — 2 fields skipped, no real language.
4. **Empty corpora, not scan misses.** 27 courses have 0 `course_legos` rows, 19 have 0
   `course_seeds`, 28 have 0 `course_practice_phrases`, 12 have 0 `course_audio` text. Verified:
   scanned row totals equal the full table counts exactly (94,792 / 82,477 / 832,467 / 2,565,615),
   and spot-checked by direct count — e.g. `ind_for_eng` genuinely has 0 audio rows,
   `jpn_for_zho` has 1 audio row with empty text. Corpus absence, not corruption.
5. **Whether a flagged clip is currently audible** was checked only as slot linkage (15 linked).
   S3 liveness was not probed.

---

## Artefacts

- Machine-readable hit list: **`scripts/wrong-lang/strandB/hits.json`** (325 KB — all 298 HIGH +
  92 BORDERLINE with course_code, table, column, seed_number, lego_id/seed_id/audio_id, the offending
  string, the offending characters, script names, defect class, and the calibration + gap metadata).
- Detector: `scripts/wrong-lang/strandB/detect.cjs` (25 script blocks, language→script table for 74 languages)
- Scanner: `scripts/wrong-lang/strandB/scanText.cjs` (cursor-based, read-only)
- Calibration: `calib-unit.cjs`, `calib-plant.cjs`, `calib-live.cjs`, `pos.cjs`
- Discard audit: `discard-audit.cjs` · Coverage/gaps: `gaps.cjs`, `emptycheck.cjs`

*(`scripts/` is gitignored — these are workspace artefacts, not committed.)*
