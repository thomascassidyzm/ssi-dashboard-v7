# Seeds 643 and 659 — the missing question marks, fixed estate-wide

**2026-08-20. Applied to the live database. Tom's ruling, same day: "yes, fix".**

Two shared English seeds are questions and had never carried a question mark:

- Seed 643 — "Do you want sir" → **"Do you want sir?"**
- Seed 659 — "Could you all say that" → **"Could you all say that?"**

Because the house convention is that a course's punctuation mirrors the English, every course
that followed the convention was faithfully mirroring a typo. Spotted in the Irish-Ulster
block-7 build report (`docs/gle-ul/block-7-seeds-577-668-report-2026-08-20.md`, line 94).

## What changed

| Leg | Table | Rows |
|---|---|---|
| A | `course_seeds` — English known side, seeds 643/659, every `%_for_eng` course | **156** |
| B | `course_practice_phrases` — rows whose known text IS the whole sentence, build/use only | **25** |
| C | `canonical_seeds` — `source_text` for S0643 / S0659 | **2** |

Total 183 rows. One character appended to each; nothing else about any string changed.

Script: `tools/course-optimization/fix-seed-punctuation-643-659-2026-08-20.cjs`
(dry run by default, `APPLY=1` to write, per-row before-state assertion, per-row JSON logs
in this directory).

### Reconciliation, re-queried independently of the script's own logs

- `%_for_eng` seed rows at 643/659 ending in `?` — **156**; still unpunctuated — **0**.
- Whole-sentence practice-phrase rows ending in `?` — **33** (the 25 fixed plus 8 that already
  had it); still unpunctuated — **0**.
- `canonical_seeds` rows ending in `?` — **2**.
- Non-English known sides at these seed numbers — **94 rows, untouched**, as ruled.
- Every one of the 183 rows re-read individually after the write: **183/183 match the planned
  value, 0 unverified**.

Idempotency proved by running the apply a second time: 0 candidates, identical reconciliation.
(That second run overwrote the original applied log with its own zero-row result; the applied
log in this directory was rebuilt by re-reading all 183 rows live, and the script now writes a
no-op re-run to a separate filename so it cannot happen again.)

## Leg C is the part that stops this coming back

`canonical_seeds.source_text` is what `initializeCourseSeeds()` copies from when a brand-new
course is created (`services/course-builder/routes/seed-complete.cjs:308`). Fixing the 156
course rows without fixing the canonical row would have re-seeded the typo into every course
built from tomorrow onwards. Both canonical rows now carry the question mark.

## The intake-normalisation check — the question mark survives

`stripBookendPunctuation()` (`services/course-builder/lib/text-normalization.cjs:125`) removes a
trailing **full stop only** and explicitly keeps `!` and `?`. Nothing on the intake path strips a
question mark from stored text. Corroborated by the estate: 8,506 `%_for_eng` seeds and 77,916
English audio rows already carry one. **No stripper found; the fix will not evaporate.**

## Audio — nothing generated, nothing queued

The question mark changes the written English, not what was spoken; the recorded known-side audio
was always a question. The learner path resolves audio by **id** (`known_audio_id` on
`course_legos` / `course_practice_phrases`, served by
`ssi-learning-app/api/courses/[code]/cycles.ts`), which punctuation cannot touch.

There is one legacy text-keyed lookup (`lookupAudioLazy`, `useScriptCache.ts:668`, and the same
shape in `CourseExplorer.vue`) that matches `text.toLowerCase().trim()` against
`course_audio.text_normalized` — and `text_normalized` has punctuation stripped. That lookup
therefore already fails to match **77,726 English clips whose text ends in a question mark**, so
these two sentences are joining the ordinary majority rather than creating a new dangle. No TTS
was run and no audio pass was queued.

## `course_round_index` — a useful negative

The materialised view carries no text at all. Its definition is
`SELECT course_code, row_number() … AS round_index, lego_id, seed_number, lego_index FROM
course_legos WHERE is_new AND lego_id IS NOT NULL`. Nothing to refresh; the learner-facing text
is read live from the tables that were edited.

## Left alone, deliberately

Target text everywhere; non-English known sides at the same seed numbers (94 rows); capitalisation;
commas and vocatives ("Do you want, sir?"); empty known_text rows; `phrase_role='component'` rows.

## For Tom — four one-word questions

1. **Capitalisation split.** 56 courses store "Do you want sir?" and 22 store "do you want sir?"
   at the same seed; same split at 659. Tom ruled on punctuation, not case. Recommendation:
   **lowercase** — it matches how the practice-phrase table already stores every one of these
   sentences, and `stripBookendPunctuation` lowercases the first character by design. Do it as its
   own pass?
2. **Empty known_text.** Four rows, not two — `eng_for_spa` and `por_for_aze`, both seeds each.
   No text was invented. Recommendation: **fill** them from canonical, in a separate job.
3. **Fourteen LEGO rows** in `course_legos` still carry these sentences as a whole-sentence LEGO
   known text without the question mark (ara, ara_lb, deu, fra, hak, ita, kor, por, por_br). They
   were outside the ruling's scope. Recommendation: **fix** — same one-character edit, same
   argument, and their target sides already vary (por_for_eng's target reads "o senhor quer?").
4. **Target-side inconsistency.** Some targets already punctuate as questions and some do not —
   e.g. `por_for_eng` 643 target is "o senhor quer?" while `deu_for_eng` is "wollen Sie, mein
   Herr". I have no view on whether that should be harmonised per language; genuinely a
   language-by-language call, not one I can make from the data.
