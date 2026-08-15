# yor_for_eng — Yoruba for English speakers: text-side build

**Status: partially built, and deliberately stopped at the calibration boundary.** No audio of any kind was generated — the course's audio count is still the single pre-existing `welcome` row it had before I started.

---

## 1. Step Zero: substantial Yoruba content already existed

I checked the live database before building anything. **It is not an empty course.**

| Layer | State before I started |
|---|---|
| `course_seeds` | **668 seeds, all with Yoruba `target_text`** — created 2026-06-02, all `status=draft`, `approved_at` NULL on every row |
| `courses.translation_analysis` | Present, 2,284 chars — a real methodology-aware analysis covering all 668 seeds (register choice, golden keys, ZUT concerns, problem verbs) |
| `course_legos` | **0** |
| `course_practice_phrases` | **0** |
| `course_audio` | 1 row (a `welcome` clip) |

A repo doc from 2026-08-06 (`docs/paid-english-courses-status-2026-08-06.md:121`) independently corroborates this: *"Not started — 668 translated seeds, 0 legos, 0 phrases, 0 audio. Decomposition has never run."* There is also a sibling `cym_for_yor` (Welsh for Yoruba speakers) with 668 seeds, which I did not touch.

**Recommendation: EXTEND, do not restart.** The translation layer is real work, done to the methodology, and throwing it away would be the duplication the brief warned against. The decomposition layer is genuinely absent, so that is where I built. I did not modify a single existing seed row.

One inconsistency worth knowing: `courses.seed_count` says **305** while 668 seed rows exist, and the course-builder's own `/api/resume` targets **seeds 1-305**. So the intended course length is 305, with 668 translated seeds banked. Nobody should assume 668 is the build target without checking with you.

---

## 2. What got built

Golden calibration seeds **1-10**, submitted through the real course-builder API (`POST /api/seed/complete`), which ran its own tiling / ZUT / vocab / phrase-structure gates on every submission. All ten returned HTTP 200 with no errors.

| | Count |
|---|---|
| Seeds decomposed | **10** (of the 305 target) |
| LEGOs written | **31** |
| Practice phrases written | **248** — 72 BUILD, 114 USE, 62 auto-generated component rows |
| Audio generated | **0** |

**This is 10 of 305 seeds — roughly 3%.** I stopped there on purpose, and I want to be blunt about why rather than dress it up as completion:

The `calibrate` skill in this repo describes golden decomposition as **an interactive human-in-the-loop step** ("Human present — this is interactive, not autonomous"). Its output is the canonical reference every later build agent copies. Neither you nor I speaks Yoruba. Generating 305 seeds of unreviewable Yoruba decomposition — each one multiplying an unverified translation into ~25 more unverified phrases — would produce roughly 7,500 phrases that nobody on the project can check, and would bake any systematic error into the whole course. The methodology rail in `CLAUDE.md` is explicit: *work slowly, quality over throughput.* Ten seeds is the unit a Yoruba speaker can actually sit down and rule on. Once they do, the rest can run fast against a calibration that's known-good.

---

## 3. Diacritic round-trip evidence

I wrote real rows through the real API and read them straight back out of Postgres, comparing **byte for byte** (hex).

**Result: 28 of 31 LEGO targets byte-identical. 3 differed — and the difference is ASCII only.**

```
✗ S5L1   sent: "Mo máa"   4d 6f 20 6d c3a1 61
         read: "mo máa"   6d 6f 20 6d c3a1 61
                ^^ 4d→6d  =  'M' → 'm'
✗ S8L1   sent: "Mo máa gbìyànjú"   4d6f206dc3a161206762c3ac79c3a06e6ac3ba
         read: "mo máa gbìyànjú"   6d6f206dc3a161206762c3ac79c3a06e6ac3ba
✗ S9L1   sent: "Mo sọ"    4d 6f 20 73 e1bb8d
         read: "mo sọ"    6d 6f 20 73 e1bb8d
```

Every one of the three is the leading capital `M` lowercased to `m` by `stripBookendPunctuation` — documented, intentional behaviour applied to all courses. **The Yoruba-bearing bytes are identical in all three.** `c3a1` (á) survives. `e1bb8d` (ọ) survives. Zero diacritic loss across the whole write path.

Across all 279 Yoruba strings written (31 LEGOs + 248 phrases):

- **All NFC-normalised**, none pure-NFD, no mixed composition
- **Zero** zero-width, non-breaking-space, BOM or other invisible characters
- Character inventory: `à á è é ì í ò ó ù ú ń ǹ ṣ ẹ ọ` plus standalone combining `U+0300` (grave, ×102) and `U+0301` (acute, ×79)

**One subtlety that matters and is easy to miss:** Yoruba text in NFC *still contains combining marks*. There is no precomposed Unicode codepoint for a dot-below vowel carrying a tone mark, so `ẹ́` is necessarily `U+1EB9 + U+0301` — two codepoints — even in fully-normalised NFC. That is why 181 bare combining marks appear above and it is **correct**, not corruption. It also means any code that "normalises" by stripping combining marks destroys the tone on exactly the most common Yoruba vowels while leaving `á` and `í` untouched — a corruption that would look partial and random rather than obviously broken.

---

## 4. Tone safety: what I checked in the code, not just in my own output

Tone changes meaning in Yoruba, so I audited every normalisation function the build path touches rather than assuming. The results are mixed, and one of them is a live hazard you should know about.

I proved the hazard first. `normalizeForZUT()` in `services/course-builder/lib/text-normalization.cjs` does NFD then strips `U+0300–U+036F`. That range contains Yoruba's tone marks **and** the combining dot-below. Run on real Yoruba minimal sets:

```
oko (farm) / ọkọ (husband) / ọkọ̀ (vehicle) / òkò (stone)   → all "oko"      4 words → 1
igba (200) / ìgbà (time) / igbá (calabash) / ìgbá (garden egg) → all "igba"  4 words → 1
ọwọ́ (hand) / ọwọ̀ (respect) / owó (money) / owo (business)  → all "owo"      4 words → 1
ṣe (to do) / se (to cook)                                    → both "se"     2 words → 1
```

Where that function is applied decides whether it's harmless or harmful:

**✅ The active build path is tone-safe.** `POST /api/seed/complete` (`seed-complete.cjs`) never applies `normalizeForZUT` to Yoruba. It uses `normalizePhrase` (lowercase + trailing punctuation only) and `normalizeForContainment` (explicitly documented to *keep* accents). Verified: `validation.cjs` imports `normalizeForZUT` but never calls it.

**✅ Collision detection is tone-safe by design.** `drafts.cjs` keys its map on `normalizeForZUT(known_text)` — the *English* side, where diacritic-stripping is harmless — and compares the Yoruba targets with `normalizeForStorage`, which preserves diacritics. There's even a comment at `drafts.cjs:143` saying exactly why.

**✅ The untaught-word gate is tone-strict.** `checkVocabViolations` tiles phrases using `normalizeForContainment`, which preserves tone marks and dot-below. A phrase using `ọkọ̀` when only `ọkọ` was taught is correctly rejected as untaught. This is the strongest single property here, and it's the gate that matters most.

**⚠️ Two places do apply `normalizeForZUT` to the Yoruba side. Neither is on the path I used, but both are real:**

1. `services/course-builder/routes/v2.cjs:162` — the submitted-vs-canonical `target_text` guard compares tone-stripped forms. For Yoruba this makes the guard **lenient**: an agent could submit a target with wrong or missing tone marks and the mismatch check would wave it through. (`v2.cjs` is not the route serving `/api/seed/complete`.)
2. `tools/course-optimization/regenerate-stamped-builds.cjs:121,125,210` — uses `normalizeForZUT(target)` as a **phrase dedupe key**. Two Yoruba phrases differing only in tone would be treated as the same phrase and one silently dropped. If that tool is ever pointed at `yor_for_eng`, it will quietly delete correct content.

**What I did about it in my own output:** every dedupe and same-phrase decision I made compares diacritic-exact strings. Nothing was merged on a stripped form. The proof is live in the data — this pair sits in the course right now, stored as two distinct words:

```
strip="ko"  →  kọ́ ×25  (learn, high tone)   vs   kọ ×17  (practise, mid tone)
```

They are different verbs. Seed 2 teaches `láti kọ́` and seed 5 teaches `kọ sísọ`, and a diacritic-blind dedupe would have collapsed them into one LEGO and silently taught the wrong verb 17 times. I also deliberately declined to teach bare `kọ` as its own LEGO for this reason — see the speaker questions.

---

## 5. Untaught-word check

Checked **as I built**, not after, using the server's own `checkVocabViolations` in a local harness that replicates exactly how `seed-complete.cjs` accumulates vocabulary (LEGO targets + M-LEGO component targets, added in `idx` order, snapshotted before each LEGO's own phrases are tested).

**Result: 0 violations across all 248 stored phrases** — including the 62 component rows the server generated itself.

It caught real errors while I worked, which is the point:

- Seed 1 L2 — with only two chunks taught, my BUILD and USE phrases were forced to be the identical sentence. Fixed by making BUILD a fragment (`fẹ́ láti sọ`).
- Seed 6 L1 and Seed 8 L2 — a USE phrase used the bare verb (`Mo máa rántí nǹkan`) instead of the LEGO being taught (`láti rántí`), so it didn't contain its own LEGO. Both rewritten.

I also **reordered LEGO introduction within two seeds** so the rule could be satisfied honestly rather than by weakening phrases. In seed 4, `nǹkan` ("something") is introduced before `bí mo ṣe máa sọ` ("how to say") so that "how to say" has an object to combine with. In seed 10, the negative frame `Mi ò rò pé` is introduced **last** so its practice phrases have a complete clause to embed. Both are recorded as `lego_order_note` on the seed.

**ZUT check on the 31 written LEGOs: 0 violations** — every known prompt maps to exactly one diacritic-exact target form. One review item, not a defect: `bí mo ṣe máa sọ` is the target for both "how to speak" (seed 3) and "how to say" (seed 4), because Yoruba `sọ` covers both. That is question 2 below.

---

## 6. Points that need a Yoruba speaker

This is the deliverable that matters most, and it is not a failure list — it's the set of judgements I refused to fake. Nothing below should be recorded until a speaker rules on it.

**On the existing translations (these affect the 668-seed corpus, not just my 10):**

1. **Seed 10 is a probable meaning error.** Known: *"I'm not sure if I can remember the whole sentence"*. Target: *"Mi ò rò pé mo lè rántí gbogbo gbólóhùn náà"*, which back-translates as **"I don't think that I can remember..."** — a stronger, different claim than "I'm not sure if". If confirmed, the seed target needs re-translating, and my LEGO `"I'm not sure if" → "Mi ò rò pé"` plus its component gloss `sure → rò` (rò is closer to *think*) both need rebuilding.
2. **`Mo fẹ́ láti` vs `Mo fẹ́` + bare verb.** The corpus uses both (seed 1: `Mo fẹ́ láti sọ`; seed 17: `Ó fẹ́ mọ`). I split this as `"I want" → Mo fẹ́` + `"to speak" → láti sọ`. When is `láti` obligatory after `fẹ́`? If it's optional, the split is fine; if it's conditioned by the following verb, the split generates wrong Yoruba.
3. **Is `kọ́` (learn) vs `kọ` (practise) the correct assignment** in seeds 2 and 5? The whole tone-distinction argument above rests on the corpus having got these two right.
4. **Register.** The corpus is consistently 2sg familiar (`o` / `rẹ`). For a community course whose learners will likely address elders, is familiar-throughout right, or should some material teach the respectful `ẹ`?

**On my decompositions:**

5. **`bí mo ṣe máa sọ` for "how to speak" / "how to say".** Two concerns: (a) is one target for both knowns acceptable? (b) The Yoruba embeds a 1sg subject `mo`, so this literally means "how **I** speak". Teaching it as English "how to speak" will break the moment a learner needs it with another subject. Should the known side be "how I speak" instead?
6. **Placement of `gidigidi` ("hard").** I generated `Mo ń gbìyànjú gidigidi láti sọ èdè Yorùbá`. Is the intensifier correctly placed before the `láti` clause, or must it be clause-final? This affects 10 phrases.
7. **`kọ sísọ` taking an object** — is `kọ sísọ èdè Yorùbá` ("practise speaking Yoruba") grammatical? Used in 8 phrases.
8. **`ohun tí mo túmọ̀ sí` ("what I mean").** I split it `what → ohun tí`, `I → mo`, `mean → túmọ̀ sí`. Is `túmọ̀ sí` a split verb whose `sí` must sit clause-finally? If so, my component gloss is misleading even though the whole chunk is correct.
9. **`tó bá ṣeé ṣe` for "as possible".** I split `lóòrèkóòrè` ("often") from `tó bá ṣeé ṣe` so "often" is reusable. Does `tó bá ṣeé ṣe` stand as a natural unit, or only in the fixed phrase `lóòrèkóòrè tó bá ṣeé ṣe`?
10. **`díẹ̀` placement.** `èdè Yorùbá díẹ̀` for "a little Yoruba" — postposed. Correct in all the recombinations I generated?
11. **`sọ èdè Yorùbá` vs `sọ ní èdè Yorùbá`.** Seed 1 has no `ní`, seed 4 does. Is that a real distinction ("speak Yoruba" vs "say something *in* Yoruba"), or an inconsistency in the corpus?
12. **`Mi ò rò pé mo sọ èdè Yorùbá`** (seed 10 BUILD) — is a bare non-progressive verb grammatical inside that embedded clause?

---

## 7. Explicit gaps

- **295 of 305 target seeds are not decomposed.** Seeds 11-305 have translated text and nothing else. This is the bulk of the remaining work and it is deliberately not done — see §2.
- **No Yoruba speaker has reviewed anything**, including the 668 pre-existing translations, which have sat at `status=draft` / `approved_at=NULL` since June. My 10 seeds inherit whatever is wrong with them.
- **The 668-seed corpus has not been audited end-to-end.** I dispatched sub-worker **#632** (sonnet, read-only) to sweep all 668 targets for Unicode integrity, corpus-wide tone minimal pairs, ZUT collisions and translation-fidelity red flags. **It had not reported back when I wrote this**, so none of its findings are in here. Its report will land in my conversation and I'll pass it on.
- **`courses.seed_count` (305) contradicts the row count (668)** and I have not resolved which is authoritative — that's your call.
- I could not poll the worker's status via the surface API (`/api/jobs/632` returns `not found`); I'm relying on the automatic report-back.

---

## 8. Recommended next step

Put §6 in front of a Yoruba speaker. It is twelve questions and should take one sitting. Questions 1-4 are worth the most: they are about the **existing 668 translations**, so a wrong answer there is a defect inherited by every seed anyone builds afterwards — and question 1 looks like a genuine error sitting in seed 10 today.

Once those are settled, seeds 1-10 become a trustworthy calibration and the remaining 295 can be built against it at speed. Building them before that just multiplies whatever is wrong.

---

*No audio was generated at any point in this job. The `course_audio` count for `yor_for_eng` is 1, exactly as it was before — the pre-existing `welcome` clip.*
