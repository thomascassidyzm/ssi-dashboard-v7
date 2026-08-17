# Kannada script byte-forensics — kan_for_eng

Verification only. No writes made to `course_seeds`, `course_legos`, or any other table. No audio generated. No commits made. All scratch scripts and outputs live under `.a108-kan/forensics-*`.

**Note on a moving baseline:** the brief stated kan_for_eng has 0 LEGOs. A concurrent worker in this same shared directory (leftover files `seeds-01-12.cjs`, `validate.cjs`, `kan-lib.cjs` predate this session) was actively inserting LEGOs into `course_legos` for kan_for_eng *during* this investigation — `course_legos` went from 0 to 22 rows between the start of this session and 21:55:58 UTC, timestamped by `created_at`. This was not caused by any query in this report (all queries against `course_seeds`/`course_legos` in this work were `SELECT`-only — see the three scripts below). All 668-seed analysis below concerns `course_seeds.target_text`, which that concurrent worker does not touch.

---

## 1. Normalisation form + codepoint inventory (668 `course_seeds.target_text`)

Script: `.a108-kan/forensics-01-normalize.cjs`, full output: `.a108-kan/forensics-01-output.json`

- **NFC: 668 / 668. NFD: 0. Neither: 0.**
- Every one of the 668 stored strings is already precomposed NFC.

**Codepoint inventory** (all 668 strings, full counts in the JSON):
- ASCII: space (3453), `,` (19), `.` (542), `?` (109) — no other ASCII appears.
- Kannada block (U+0C80–U+0CFF): 47 distinct codepoints used, spanning independent vowels (U+0C85–U+0C93), consonants (U+0C95–U+0CB9), vowel signs (U+0CBE–U+0CCC), virama U+0CCD (2074 occurrences — the most frequent codepoint after space), anusvara U+0C82 (641), visarga U+0C83 (3). No codepoint from the Kannada block is absent from a plausible modern-Kannada inventory; nothing looks corrupted.
- **Codepoints outside Kannada block + ASCII space/punctuation: only U+200C (ZWNJ, 13 occurrences — see §2).** Zero other outliers. **Suspicious-seed count: 0.**

## 2. ZWJ / ZWNJ

Same script/output as §1.

- **ZWJ (U+200D): 0 occurrences.**
- **ZWNJ (U+200C): 13 occurrences**, in 13 distinct seeds: 118, 156, 184, 198, 199, 221, 445, 461, 511, 560, 570, 635, 636.
- **NFC does not alter any of these 13 seeds** (0/13 changed).
- **NFD *does* alter 11 of the 13** — but the decomposition stays entirely inside the Kannada block. E.g. seed 156: U+0CC0 (vowel sign ೀ) → U+0CBF U+0CD5, U+0CC7 (ೇ) → U+0CC6 U+0CD5. Verified programmatically across the whole 668-seed set: **zero Kannada codepoints in this corpus decompose into anything in U+0300–U+036F** (the combining-diacritics block some tools strip — see §4). So even where NFD changes byte sequence, it does not touch the range this codebase's diacritic-stripping code targets.

## 3. Round-trip through the write path

Script: `.a108-kan/forensics-02-roundtrip.cjs`, output: `.a108-kan/forensics-02-output.json`

- **Safe round-trip executed:** all 668 `target_text` values read from `course_seeds`, written to a scratch file (`.a108-kan/forensics-02-scratch.txt`, UTF-8, deleted after the run), read back, and compared via `Buffer.from(s,'utf8').toString('hex')`.
  - **668 / 668 byte-identical. 0 mismatches.**
- Also re-queried the same 668 rows from a second independent `pg` connection and hex-compared against the first fetch: **0 mismatches** — rules out drift from the driver itself across repeated reads.
- **Explicit gap:** I did **not** invoke `POST /api/seed/preflight` live. I confirmed by reading its source (`services/course-builder/routes/preflight.cjs`) that the route performs **zero database writes** — it only parses markdown (`markdown-parser.cjs`, which itself has zero `require()` calls — a pure string parser, no DB/network access) and calls `scoreUsePhrases`, which fires a real Claude Haiku call via `services/shared/claude-cli.cjs`. Since that's a live, costed LLM call and the brief authorizes verification only, I chose not to fire it without explicit approval. So: **the preflight route is confirmed by static code-read to write nothing to the DB, but the "did Kannada survive an actual HTTP round-trip through this route" question is not empirically tested** — that's the honest gap. The direct DB round-trip above (§3, executed) is the strongest evidence available without incurring cost or writing content.

## 4. Normalisation / diacritic-stripping code audit

- `grep -rn '\.normalize(' services/ tools/` found 18 call sites. The ones that strip combining marks after NFD (pattern `.normalize('NFD').replace(/[̀-ͯ]/g, '')`, i.e. U+0300–U+036F) are: `services/audio-veracity.cjs:258`, `tools/sweep-wrong-language-crosscourse.cjs:90`, `tools/verify-regen-batch.cjs:15` (NFKD variant), `tools/audio-word-loss-scan.cjs:72` (NFKD).
- **Claim verified, not assumed:** Kannada's dependent vowel signs and virama live at U+0CBE–U+0CCD, and I confirmed programmatically (script above) that **no Kannada codepoint in this 668-seed corpus canonically decomposes into the U+0300–U+036F range** — decomposition targets stay inside the Kannada block (e.g. U+0CC0 → U+0CBF + U+0CD5). So **none of these four U+0300–U+036F strips damage Kannada text**, on this corpus and as a general property of Kannada's Unicode decomposition mappings (not merely absence-of-evidence — the decomposition targets are structurally Kannada-block codepoints, not Latin combining diacritics).
- Other `.normalize()` calls found are plain `NFC` calls (`pod-lego-extractor.cjs`, `run-pod-explainer-batch.cjs`, `pod-explainer-composite.cjs`, `breakdown-fine.cjs`, `insert-ellipsis-seams.cjs`, `detect-known-audio-collisions.cjs`, `write-pod0-drafts.cjs`, `pod0-recording-diff.cjs`) or plain `NFD`/`NFKD` calls not followed by a combining-mark strip (`text-normalization.cjs`, `chunking.cjs`, `splice-legos.cjs`, `generate-recording-script.cjs`, `segment-audio.cjs`, `persist-stage0-pod0.cjs`) — none of these damage Kannada either, since plain NFC/NFD round-trips are lossless for any well-formed Unicode string (this is a Unicode guarantee, not something specific to Kannada).
- **`grep` for `/[^\x00-\x7F]/`-style ASCII-only filters in `services/` and `tools/`: 0 hits.** No code strips non-ASCII bytes anywhere in these two directories.
- **`canonicalLanguage('kan')` returns `'kan'`** — tested live by requiring `services/shared/clip-identity.cjs` and calling it directly. `kan` is **not** one of the nine codes the memory `clip-identity-rejects-nine-course-languages.md` names as throwing (pdc/hak/lmo/nan/rgn/vec/sme/roh/yid) — confirmed current, not assumed from memory.

## 5. kan_for_eng vs eng_for_kan corpus comparison

Script: `.a108-kan/forensics-03-compare.cjs`, output: `.a108-kan/forensics-03-output.json`

- Both courses have 668 seeds; all 668 seed numbers exist in both.
- **English skeleton** (`kan_for_eng.known_text` vs `eng_for_kan.target_text`, exact string compare): **646 / 668 identical (96.7%), 22 differ.** Differing seeds: 1, 4, 9, 13, 14, 15, 22, 33, 64, 160, 283, 285, 286, 297, 639, 642, 648, 656, 657, 661, 662, 663.
- **Kannada string** (`kan_for_eng.target_text` vs `eng_for_kan.known_text`, byte compare): **105 / 668 byte-identical (15.7%), 563 differ (84.3%).** The two Kannada corpora are overwhelmingly *not* shared text — despite sharing almost all of their English skeletons, translators made independent word choices in the large majority of seeds.
- **ನಿನ್ನ (informal "your") vs ನಿಮ್ಮ (formal "your") — quantified across all 668 seeds of each course:**
  - kan_for_eng: ನಿನ್ನ in **40** seeds, ನಿಮ್ಮ in **4** seeds.
  - eng_for_kan: ನಿನ್ನ in **8** seeds, ನಿಮ್ಮ in **37** seeds.
  - The two courses are near-inverses on this register choice: kan_for_eng leans informal (40 vs 4), eng_for_kan leans formal (37 vs 8).
- **-ಸ್ತಿದ್ದೀನಿ (informal "I am -ing") vs -ಸ್ತಿದ್ದೇನೆ (standard "I am -ing") — quantified across all 668 seeds of each course:**
  - kan_for_eng: informal ೀನಿ-form in **6** seeds, standard ೇನೆ-form in **0** seeds.
  - eng_for_kan: informal ೀನಿ-form in **0** seeds, standard ೇನೆ-form in **5** seeds.
  - Same pattern, smaller sample: kan_for_eng uses the informal present-continuous where it appears at all; eng_for_kan uses the standard form.
- Together these two flagged splits touch at most ~44 + ~11 = well under half of the 563 seeds where the Kannada differs — most of the 563-seed divergence is other independent translation-choice variance, not just register/verb-form splits.

---

## Summary of every number claimed

| Check | Result |
|---|---|
| NFC / NFD / neither (668 seeds) | 668 / 0 / 0 |
| Codepoints outside Kannada block + ASCII | 0 (excl. ZWNJ) |
| Suspicious seeds | 0 |
| ZWJ (U+200D) count | 0 |
| ZWNJ (U+200C) count | 13, in 13 seeds |
| ZWNJ-bearing seeds changed by NFC | 0 / 13 |
| ZWNJ-bearing seeds changed by NFD | 11 / 13 (stays inside Kannada block) |
| Round-trip byte mismatches (668 rows, DB→file→DB-shaped) | 0 |
| Round-trip mismatches, two independent pg reads | 0 |
| U+0300–U+036F strips found in services/tools | 4 (audio-veracity, sweep-wrong-language, verify-regen-batch, audio-word-loss-scan) |
| Of those, damage Kannada | 0 (decompositions never land in U+0300–U+036F) |
| ASCII-only filters (`[^\x00-\x7F]`) found | 0 |
| `canonicalLanguage('kan')` | accepted → `'kan'` |
| eng_for_kan seeds | 668, all matched to kan_for_eng |
| English skeleton identical | 646 / 668 (22 differ) |
| Kannada byte-identical across courses | 105 / 668 (563 differ) |
| ನಿನ್ನ / ನಿಮ್ಮ split (kan_for_eng) | 40 / 4 |
| ನಿನ್ನ / ನಿಮ್ಮ split (eng_for_kan) | 8 / 37 |
| ೀನಿ / ೇನೆ split (kan_for_eng) | 6 / 0 |
| ೀನಿ / ೇನೆ split (eng_for_kan) | 0 / 5 |

## Explicit gaps

1. **Preflight HTTP round-trip not empirically fired.** Confirmed by static code-read that `/api/seed/preflight` writes nothing to the DB, but did not invoke it live because it triggers a real (costed) Claude Haiku call, which is outside this verification-only brief's scope without separate approval. The direct DB→file→DB byte round-trip (§3) is the empirical evidence in its place.
2. **course_legos for kan_for_eng is not stably 0** — a concurrent worker inserted 22 rows into it during this session (see note at top). This report's §1/§2/§3 findings are about `course_seeds.target_text` only, which is unaffected by that concurrent activity; if LEGO-level byte fidelity is wanted, it needs a fresh check against whatever `course_legos` state exists when read.

**No commits made. No course content written. No audio generated. This is a read-only investigation; nothing to land.**
