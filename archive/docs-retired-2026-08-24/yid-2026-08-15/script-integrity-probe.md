# yid_for_eng — Hebrew-script integrity probe

**2026-08-15. READ-ONLY probe. No course data touched, no TTS generated.** All 668 `course_seeds` rows for `course_code='yid_for_eng'` were read; `target_text` is Yiddish (Hebrew script), `known_text` is English.

Scratch work: `.a74-scratch/yid-script-integrity/` (analyze.cjs, roundtrip.cjs, analysis.json, roundtrip_result.json, postgrest_compare2.json). Reproducible with `node scripts/yid-build/q.cjs` + the scripts in that directory.

---

## 1. Unicode normalisation form

**Verdict: all 668 rows are already both NFC and NFD simultaneously — normalisation is a no-op across the entire corpus.**

```
nfcCount (unchanged by NFC): 668 / 668
nfdCount (unchanged by NFD): 668 / 668
neither (changed by both):     0
rows changed by NFC:            0
rows changed by NFD:            0
```

Why both forms agree: the corpus stores Yiddish points as **decomposed base-letter + combining-mark sequences** (e.g. `א‎` U+05D0 alef followed by `ַ` patah), and **zero** occurrences of the precomposed Alphabetic Presentation Forms block (U+FB1D–U+FB4F — pasekh alef, komets alef, dagesh letters, vov with holam, yud with hiriq, double-yud with pasekh, fey with rafe, etc.) were found anywhere in the 668 strings:

```
presentationFormUsage: []   (0 occurrences of any FB1D-FB4F codepoint)
```

I verified this isn't a JS `normalize()` quirk: tested directly that `'אַ'.normalize('NFC')` and `.normalize('NFD')` **both** yield the decomposed pair `אַ` — Hebrew presentation forms are canonical-decomposable but excluded from NFC recomposition (Unicode CompositionExclusions), so a corpus using only the decomposed spelling is stable under both NFC and NFD. Concretely: **NFC would not change any string, NFD would not change any string.** No before/after example exists because there is nothing to show — every string is a fixed point of both transforms.

Base+combining-point pairs actually in use, by letter (count = number of times that letter+point pair occurs across the corpus):

| pair | count |
|---|---|
| א + patah (U+05B7) | 822 |
| א + qamats (U+05B8) | 1045 |
| פ + rafe (U+05BF) | 377 |
| פ + dagesh (U+05BC) | 124 |
| ו + dagesh (U+05BC) | 49 |
| כ + dagesh (U+05BC) | 16 |
| י + hiriq (U+05B4) | 13 |
| ש + sin-dot (U+05C2) | 6 |
| ב + rafe (U+05BF) | 5 |
| ת + dagesh (U+05BC) | 5 |

(Four more letter+maqaf adjacencies — ר/ף/ם/ג each followed by U+05BE — were also caught by the base+combining-mark scan; maqaf is a spacing punctuation mark, not a diacritic that composes/decomposes with the preceding letter, so these are not normalisation-relevant and are covered under §4 instead.)

**Practical implication for future tooling:** any code path that calls `.normalize('NFC')` or `.normalize('NFD')` on this course's `target_text` is safe and idempotent today. But do not assume future authored content will stay presentation-form-free — if an editor or paste ever introduces an FB1D–FB4F character, it will NOT be silently fixed by NFC (composition-excluded), so a validation step (reject/flag any codepoint in FB1D–FB4F) would be the correct guard, not a blind `.normalize()` call.

---

## 2. Round-trip

**Verdict: byte-for-byte survival confirmed on both paths tested.**

**Path A — direct parameterised pg write/read (tested).** Built `yid_roundtrip_probe` (created, populated, read back, dropped — `course_seeds` never touched), inserted all 668 `target_text` values via `$1`-parameterised `INSERT`, read them back, and compared SHA-256 of the UTF-8 bytes before vs. after for every row.

```
rows tested: 668
mismatches: 0
```

**Path B — PostgREST / supabase-js read path (tested).** Found the real config: `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `.env` (`services/supabase-client.cjs` is the app's client). Queried `GET {SUPABASE_URL}/rest/v1/course_seeds?course_code=eq.yid_for_eng&select=seed_number,target_text` with the anon key over HTTPS and compared SHA-256 digests against the pg-direct read for all 668 rows.

```
first attempt: 15 mismatches, all a single Hebrew letter replaced by two U+FFFD
```
This looked alarming but was a bug in my *test harness*, not the data: I concatenated streamed `res.on('data', ...)` Buffer chunks with `+=` (string concatenation), which calls `Buffer.toString('utf8')` per chunk — if an HTTP chunk boundary falls inside a Hebrew letter's 2-byte UTF-8 encoding, each half decodes independently to a replacement character, producing exactly the two-U+FFFD pattern seen (confirmed against 15 different seeds, all same signature). Rewriting the harness to `Buffer.concat()` all chunks and decode once:

```
rows returned via PostgREST: 668
mismatches vs pg-direct: 0
```

**Paths tested:** direct pg parameterised round-trip (scratch table); PostgREST REST API read (anon key, same key/path the dashboard's `supabase-client.cjs` uses).
**Paths NOT tested — explicit gap:** the actual `ssi-learning-app` Vercel API routes (`round-map.ts`, `cycles`, etc.) and the player's `supabase-js` client library specifically (I used raw HTTPS against the PostgREST endpoint the JS client wraps, not the `@supabase/supabase-js` package itself, and I did not exercise the learning-app's own request/response code). I did not have a way to invoke the learning-app's live request path from this probe without running that app; I did not attempt to start it. If byte-exact confirmation through the actual learner-facing code path (not just the underlying REST protocol it's built on) is required, that is unverified.

---

## 3. Bidirectional-text hazards

**Verdict: 174 of 668 rows (26%) contain bidi-weak/neutral punctuation. Zero rows mix Latin letters, ASCII digits, or Hebrew-script digits into the Hebrew script. Zero explicit bidi control characters, zero stray U+200B/U+FEFF found anywhere in the corpus.**

```
rows with Latin letters:           0
rows with ASCII digits:            0
rows with Hebrew-script digits:    0
rows with bidi-weak/neutral punct: 174   (question mark 111, comma 78 across 73 rows, period 2)
rows with explicit bidi controls (U+200E/F, U+202A-E, U+2066-9): 0
rows with stray U+200B or U+FEFF:  0
```

Breakdown of the 174:
- **111 rows** end in `?` (U+003F) — always the last character (sentence-final question).
- **73 rows** contain `,` (U+002C) — always **mid-sentence** (0 rows have a trailing comma); 78 total comma occurrences means a few rows have two.
- **2 rows** contain `.` (U+002E) — seed 82 (`...דיר. פֿאַר...` — mid-string, sentence break inside a two-sentence seed) and seed 141 (`...פּראָבלעם. אַלץ...`).

Codepoint-by-codepoint dumps for the 2 period cases and a comma/question sample are in `analysis.json` → `q3.bidiCandidates[].codepoints`; full list of all 174 seed numbers is in that same file (omitted here for length — every one of them is pure Hebrew-script words plus one of `?`/`,`/`.`, nothing else).

**Bidi Algorithm reasoning (by hand, UAX#9):** every flagged string's *first strong character* is a Hebrew letter (strong-RTL, bidi class R), so under P2/P3 the paragraph embedding level resolves to RTL even with no explicit `dir="rtl"` container. None of the 174 strings contain a strong-LTR character (no Latin, no digit — digits are ET/EN-class strong-ish but there are none present here), so there is no embedded opposite-direction run to trigger the reordering hazards that make bidi genuinely dangerous (W-rules resolving European/Arabic numbers, N-rules placing neutrals between opposite-direction runs). For a homogeneous-RTL string, rule N1/N2 resolves every neutral (comma, period, question mark, parentheses — though none of the latter occur here) to the surrounding strong direction, i.e. RTL, and a correctly RTL-rendering surface will therefore place the punctuation glyph at the **visual left edge**, matching what a Yiddish reader expects at the "end" (rightmost-start, leftmost-end) of the sentence. **Conclusion: all 174 hazards are cosmetic, not misleading** — provided the rendering surface either sets `dir="rtl"` explicitly or lets the UBA auto-detect the paragraph direction from the first strong character (which is Hebrew in all 668 rows, so auto-detection would never misfire here). No mixed-script string exists in this corpus, so the actually-dangerous case (a Latin word or digit embedded in Hebrew text, which *would* need explicit bidi isolates to avoid genuine reordering) does not occur in the 668 seeds.

**Gap:** I did not test actual rendering in a browser/player surface — this is Unicode Bidi Algorithm reasoning applied by hand against the raw codepoints, not an observed screenshot. If the player ever renders `target_text` inside an LTR-default container without `dir="auto"`/`dir="rtl"`, that would be a rendering-layer risk independent of the text itself; I did not check the player's CSS/markup for this course, which is outside this probe's DB-only scope.

---

## 4. Invisible / suspicious characters

**Verdict: one flagged codepoint, and it is a legitimate Yiddish letter, not a defect. No non-breaking spaces, no double spaces, no leading/trailing whitespace, no BOM/ZWSP, no bidi controls found.**

Full codepoint census (all distinct codepoints across all 668 `target_text`, with counts):

| codepoint | char | count | class |
|---|---|---|---|
| U+0020 | (space) | 4956 | ASCII space |
| U+05D9 | י | 2743 | Hebrew letter |
| U+05D0 | א | 2592 | Hebrew letter |
| U+05D5 | ו | 2374 | Hebrew letter |
| U+05E2 | ע | 2284 | Hebrew letter |
| U+05D8 | ט | 1421 | Hebrew letter |
| U+05DF | ן | 1290 | Hebrew letter |
| U+05E8 | ר | 1276 | Hebrew letter |
| U+05B7 | ַ (patah) | 1073 | Hebrew point |
| U+05B8 | ָ (qamats) | 1045 | Hebrew point |
| U+05D6 | ז | 870 | Hebrew letter |
| U+05E0 | נ | 832 | Hebrew letter |
| U+05D2 | ג | 782 | Hebrew letter |
| U+05DC | ל | 702 | Hebrew letter |
| U+05D3 | ד | 675 | Hebrew letter |
| U+05E1 | ס | 651 | Hebrew letter |
| U+05DA | ך | 520 | Hebrew letter |
| U+05E4 | פ | 501 | Hebrew letter |
| U+05DE | מ | 479 | Hebrew letter |
| U+05D1 | ב | 469 | Hebrew letter |
| U+05D4 | ה | 415 | Hebrew letter |
| U+05BF | ֿ (rafe) | 382 | Hebrew point |
| U+05E9 | ש | 375 | Hebrew letter |
| U+05E7 | ק | 372 | Hebrew letter |
| U+05E6 | צ | 292 | Hebrew letter |
| **U+05F2** | **ײ (Yiddish double-yud)** | **251** | **Hebrew ligature block (U+05F0–05F4) — legitimate Yiddish letter, mis-flagged by my classifier's Hebrew-letter range which only covered U+05D0–05EA; not a defect** |
| U+05BC | ּ (dagesh) | 194 | Hebrew point |
| U+05DB | כ | 166 | Hebrew letter |
| U+05DD | ם | 137 | Hebrew letter |
| U+003F | ? | 111 | ASCII punctuation |
| U+002C | , | 78 | ASCII punctuation |
| U+05E3 | ף | 59 | Hebrew letter |
| U+05E5 | ץ | 29 | Hebrew letter |
| U+05EA | ת | 22 | Hebrew letter |
| U+05D7 | ח | 15 | Hebrew letter |
| U+05B4 | ִ (hiriq) | 13 | Hebrew point |
| U+05BE | ־ (maqaf) | 8 | Hebrew maqaf |
| U+05C2 | ׂ (sin dot) | 6 | Hebrew point |
| U+002E | . | 2 | ASCII punctuation |

That is the **entire** codepoint inventory — 38 distinct codepoints across 668 rows, nothing else. Explicit checks, all negative:

- **Non-breaking space (U+00A0):** 0 occurrences.
- **Double spaces:** 0 rows.
- **Leading/trailing whitespace:** 0 rows.
- **Zero-width space (U+200B) / BOM (U+FEFF):** 0 occurrences.
- **Hebrew geresh (U+05F3) / gershayim (U+05F4):** 0 occurrences — the corpus never needs an apostrophe-like or acronym-quote mark.
- **ASCII apostrophe (U+0027) / ASCII double-quote (U+0022):** 0 occurrences — so there is no geresh-vs-ASCII-apostrophe inconsistency to report; the corpus simply doesn't use either.
- **Maqaf (U+05BE) vs ASCII hyphen (U+002D):** maqaf used 8 times (seeds 214, 237, 463, 464, 467, 573, 574, 592 — all compound-word joins like `סוף־וואָך`, `צימער־נומער`, `פּאַרקיר־פּלאַץ`); **ASCII hyphen never appears (0 occurrences)** — so maqaf usage is 100% consistent, no mixed convention.
- **Parentheses:** 0 occurrences — no mirroring hazard to evaluate.

**One real inconsistency-adjacent note, not a defect:** U+05F2 (double-yud, tsvey yudn) is a distinct Unicode codepoint from the visually similar two-letter sequence `יי` (yud + yud, U+05D9 U+05D9). I did not find any row using the digraph sequence instead of the ligature codepoint — worth a second-pass check if orthographic consistency between courses is ever audited, but that's outside this probe's read (I only confirmed presence/absence of U+05F2 itself, not cross-checked every `יי`-looking sequence letter-by-letter for which encoding it actually uses; that would need a targeted grep, which I did not run — explicit gap if that finer distinction is needed).

---

## 5. Word segmentation sanity

**Verdict: no cross-script mixed tokens exist anywhere in the corpus.**

```
mixed Hebrew+non-Hebrew tokens: 0
```

Token-count distribution (whitespace-delimited tokens per `target_text`, 668 rows):

| tokens | rows | tokens | rows | tokens | rows |
|---|---|---|---|---|---|
| 1 | 3 | 8 | 83 | 15 | 6 |
| 2 | 8 | 9 | 108 | 16 | 3 |
| 3 | 13 | 10 | 78 | 17 | 2 |
| 4 | 40 | 11 | 62 | 18 | 1 |
| 5 | 47 | 12 | 40 | 20 | 1 |
| 6 | 74 | 13 | 27 | | |
| 7 | 60 | 14 | 12 | | |

min 1, max 20, mean 8.42 tokens/row.

Top 30 tokens by frequency (note: punctuation-adjacent tokens like `נישט?` are counted separately from bare `נישט` since this is a pure whitespace split, per the question's instructions):

| token | count | token | count | token | count |
|---|---|---|---|---|---|
| איך | 306 | האָב | 92 | דעם | 51 |
| נישט | 170 | ער | 75 | דער | 50 |
| איז | 129 | האָט | 75 | געווען | 50 |
| עס | 129 | זיי | 73 | די | 50 |
| צו | 127 | זי | 69 | אין | 49 |
| אַז | 123 | דו | 67 | קען | 48 |
| וואָס | 115 | דאָס | 59 | האָבן | 43 |
| אַ | 100 | ווי | 58 | מיט | 41 |
| מיר | 98 | געוואָלט | 56 | געזאָגט | 38 |
| זיך | 92 | וואָלט | 54 | וויל | 36 |

All top-30 tokens are pure Hebrew-script (letters + points only, no attached punctuation in this particular list — the punctuation-bearing variants like `נישט?`/`אַ דאַנק,` are distinct tokens and individually rarer, so they didn't crack the top 30).

---

## Summary of gaps (explicit)

1. **Learning-app / supabase-js client path not exercised** (§2) — tested the underlying PostgREST REST endpoint with the same anon key the app uses, and confirmed byte-identical to pg-direct, but did not run the actual `ssi-learning-app` Vercel routes or the `@supabase/supabase-js` package code itself.
2. **No live rendering check** (§3) — bidi-hazard conclusions are hand-applied Unicode Bidi Algorithm reasoning against raw codepoints, not a screenshot of the player rendering these 174 strings.
3. **Digraph-vs-ligature yud audit not run** (§4) — confirmed presence of U+05F2 (251×) but did not exhaustively check whether any row uses the `יי` two-yud sequence where a ligature was intended, or vice versa.

Everything else in the 5 questions was directly measured against the live 668-row `course_seeds` table for `course_code='yid_for_eng'`, with exact counts and reproducible scripts under `.a74-scratch/yid-script-integrity/`.

**No commits.** This was a read-only probe; `course_seeds` was never written to (the only write was the transient `yid_roundtrip_probe` scratch table, created and dropped within `roundtrip.cjs`). No branch, no merge, no deployment — nothing to land.
