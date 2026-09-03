# spa_for_eng bare-LEGO BUILD repair — gate closed, 35-phrase sample staged

2026-08-26. Two code fixes landed on `main`; 35 sample repairs generated and rendered
to audio; **nothing written to `course_seeds`, `course_legos` or `course_practice_phrases`.**

Listening page (35 repairs, before/after, both course voices):
https://watson-1.tail4968cb.ts.net/evidence/spa-bare-lego-repair-sample-2026-08-26/index.html

---

## 1. The gate — what was still open, and what closed it

A BUILD phrase whose target IS its LEGO's target is never played. Intro and debut both
render the bare LEGO straight from `course_legos`, and the round generator claims that
phrase id whether or not a row exists. `ralph-methodology.md` is explicit: a BUILD phrase
is the new LEGO plugged into PRIOR vocabulary, never the LEGO alone.

On 2026-08-06 (`ad9b41b0`) the course-builder routes learned to drop these before writing.
A write-path census run today (job #901, read-only) enumerated every live writer of
`phrase_role='build'` rows and found the ban held on some roads and not others.

**Guarded already, verified by reading the guard ahead of each insert** — not inferred from
a commit message: `v2.cjs` submit, `seed-complete.cjs` (three insert sites), `drafts.cjs`
(two), `build.cjs` USE backfill. Undo paths (`edit-cascade` rollback, `redo-snapshot`) cannot
manufacture a new bare row. `golden.cjs` and `seed-translate.cjs` are unmounted dead code —
`seed-translate.cjs` has no guard, so re-mounting it would reopen this gap.

**Two live writers were open. Both are now closed:**

| # | Writer | What was wrong | Fix |
|---|---|---|---|
| 1 | `services/course-data-service.cjs` `savePracticePhrase` — the writer the phase3 basket pipeline uses | No bare-LEGO guard at all. `POST /upload-basket` could write bare rows, and its culminating seed-sentence row was bare **by construction** on any one-LEGO seed. | `5efebc968` — guard at the writer: refuse and return null. LEGO target from `options.primaryLegoTarget` when the caller has it, else one cached read per (course, seed, lego). A failed lookup **abstains** rather than blocks. phase3 also filters with `partitionBareLegoPhrases` *before* assigning positions so survivors stay contiguous. |
| 2 | `services/production-api.cjs` `POST /api/production/:courseCode/audio-pipeline/fix-orphan-legos` | "Fixed" an orphan LEGO by writing its own target out as a BUILD row. Every row it produced was bare by construction, so the orphan count went to zero while the learner still heard nothing. | `2f02c0d36` — it now **reports**. A LEGO with no phrases needs phrases authored through `/api/v2/phrases/:courseCode` or `/api/seed/complete`, both of which validate vocab, containment and ZUT. The UI button changed from "Fix N orphans" to "List N orphans" and surfaces the message; on a zero-write response it would otherwise have done nothing silently. |

**No early-seed exception was broken.** The floor *ramp* (`checkBuildUsePhrases`, seeds 1-3)
relaxes how MANY phrases a LEGO needs; it never licensed what may be written as one. Even
LEGO 1 of a course — the one LEGO with nothing prior to weave into — gets its bare debut from
`course_legos`, so a bare row for it is still a row nobody hears. Every pre-existing guard in
the estate already drops bare rows unconditionally; the new guards match.

**Tests.** 8 new tests (`services/course-data-service-bare-lego.test.cjs`) covering: refusal,
case/punctuation normalisation, a real phrase writing normally, a phrase that merely *contains*
the LEGO, lookup-when-not-supplied, the cache (a whole basket costs one read), abstention on a
failed lookup, and no S1L1 exception. The existing 756 bare-LEGO and recombination tests stay
green. `npx vitest run services/course-builder services/course-data-service` → 244/247 files
pass; the 3 failures are pre-existing and live in stale `scripts/main197/` and `.worktrees/`
copies, not the live tree.

**Before removing the `fix-orphan-legos` write**, the census confirmed zero rows in the estate
carry that route's signature (`metadata IS NULL`, position 1, id ending `B01`) — it never fired
against production data, so nothing needs cleaning up behind it.

## 2. The rows are historical debris, not an ongoing leak

Census (job #901), bare BUILD rows defined as normalised `target_text` equality between the
phrase and its own LEGO:

- **spa_for_eng: 1,247** across 1,206 distinct LEGOs. Created 2026-02 (225), 03 (382),
  04 (3), 05 (628), 07 (9). **All predate the 2026-08-06 fix.**
- **Estate-wide: 67,374**, spanning 2025-12 to 2026-08. Worst: hak_for_eng 2,256,
  mar_for_eng 1,676, kor_for_eng 1,611, fra_for_eng 1,595, por_for_eng 1,570,
  ita_for_eng 1,565. spa_for_eng is 10th.
- **Rows created after the 2026-08-06 fix, any course: exactly one.**
  `fin_for_eng:S0053L02B05`, 2026-08-17, from a one-off scratch script
  (`.a74-scratch/fin-hisher-apply/apply.cjs`) applying an approved his/her expansion.
  Finnish `sen` does not distinguish gender, so the "her" variant collides with the LEGO's
  own target. Genuine content on the known side; a bare row on the target side. Not repo code,
  already ran, will not run again.

`created_at` never moves on UPDATE (confirmed against version-159 rows), so the histogram is a
write-time signal, not an update-time one.

**Consequence for scope:** this is a French problem, an Italian problem, a Korean problem and a
Hakka problem before it is a Spanish one. spa_for_eng is 1.9% of the estate-wide count. The gate
fix protects all of them from here; the repair does not.

## 3. The sample

35 repairs across the course — 11 early (seeds 1-137), 12 middle (151-406), 12 late (431-631).
Generated by three workers (jobs #902/#903/#904) from a context pack per LEGO: the bare row,
its sibling BUILD and USE phrases, and its prior-vocabulary inventory. One LEGO was correctly
**skipped**: `S0001L01`, LEGO 1 of the course, whose bare debut is legitimate.

Constraints applied: whole-chunk vocabulary from previously-taught LEGOs only, exact taught
Spanish wording reused (ZUT), containment of the LEGO's exact target, tier-1 clunkiness on the
known side, varied partners across the set, British English.

Full before/after with audio: the listening page linked above.
Raw JSON: `sample-all.json` in the job scratch; markdown tables in each worker's report.

## 4. Spend

**$0.0103.** 1,293 Spanish characters × 2 course voices = 2,586 characters, Azure Standard
neural at the documented $4/1,000,000 (`services/audio-generation-planner.cjs:24`). Rendered
through `tools/tts-bakeoff/run-bakeoff.cjs` (dry-run first, then `--live`), which writes plain
files and touches no course row. Against the $20 cap: **0.05% used.**

The clips are static files on the evidence server. **No `course_audio` rows were inserted, no
S3 upload, no `audio_pass_request` queued** — a queue entry is fulfilled by phase8 `/generate`
across the whole course, which would be an unapproved bulk spend, and no content has changed
yet to justify one. That is the correct end-step *after* an apply, not before.

### One gap, stated plainly

`AZURE_TTS_KEY` / `AZURE_TTS_REGION` — the names the bake-off harness reads — are **placeholders**
in the repo-root `.env` (`your_azure_region_here`). The live credentials are under
`AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION`, which every service in `services/` uses. The first
live run failed 35/35 with "fetch failed" and spent nothing; it succeeded once the names were
mapped at the shell. The harness's own docs claim the keys are "sitting right there" in `.env`.
Worth reconciling before the bake-off's phase 2 trusts that claim.

## 5. Not done, deliberately

- No live row touched. No promotion. No flag flipped.
- The remaining ~2,900 phrases are not generated — that waits on a quality ruling.
- No audio-pass queued for spa_for_eng (see above).

---

# Addendum — independent verification, and what it turned up

Job #906 (sonnet, adversarial, read-only) re-checked all 35 against the live DB rather
than the sampled packs the authors saw. Every one of its checkable claims replicates.

## The sample: 30/35 clean, 5 quarantined

| Check | Result |
|---|---|
| Containment (`checkWordContainment`) | **35/35 pass** |
| ZUT, production direction | **35/35 pass** — and the checker was sanity-tested first: it surfaces 324 real ZUT collisions already present in the live corpus, so a clean sweep here is a result, not a no-op |
| Spanish correctness, read by hand | **35/35 correct and idiomatic** |
| Clunkiness | 35/35 tier 1; one borderline (`S0217L03`, "a glass" with no "of X"), which the author had already flagged |
| **Vocabulary / forward reference** | **30/35 pass, 5 fail** |

The five: `S0077L01`, `S0121L02`, `S0184L03`, `S0258L01`, `S0600L01`.

Reproduced independently with a new tool, `tools/course-optimization/check-repair-phrases.cjs`,
which replays the live submit gate's own DP tiling (`checkVocabViolations`) against vocabulary
scoped strictly before each phrase's `(seed_number, lego_index)`. Same five, no others.

**One is a clean forward reference.** `S0600L01` uses *habríamos*, introduced at **S612L01** —
12 seeds later. Verified directly: the only LEGOs containing it are S612L01 ("we would have")
and S613L01. Not a judgment call.

**Four are one root cause, and it is not carelessness.** *me*, *te* and *la* are **never taught
as free atoms** in this course — 0 standalone LEGOs each, appearing only bundled inside 33, 20
and 82 larger chunks respectively. Before seed 77 the learner has *me gustaría*, *Me gusta*,
*me siento* — never a movable *me*. So "Me sorprende cómo entiendes…" cannot be tiled: every
word is taught, the span is not.

## The finding nobody was looking for: the live course does the same thing

The authors defended *me sorprende* by citing the course's own sibling row `S0077L01B03`. They
were right that it exists — and that is the problem. Checking every row of that LEGO against
the gate:

```
S0077L01B01  "Sorprende"                                    ok   (the bare-LEGO defect)
S0077L01B03  "Me sorprende"                                 FAILS
S0077L01B04  "Me sorprende cómo"                            FAILS
S0077L01U04  "Me sorprende lo mucho que he aprendido ya"    FAILS
… 8 more, all FAIL
```

Ten of that LEGO's eleven rows fail. The one that passes is the bare-LEGO defect.

Widening: a systematic 400-row sample of **existing live** spa_for_eng BUILD and USE rows
(every ~25th row across the whole course) — **76 fail the same gate, 19.0%.**

So the sample authors were not sloppy. They pattern-matched faithfully onto live course content,
and roughly a fifth of that content uses material the learner has not been given. These rows
predate the gate or arrived by a path that does not run it; they could not be submitted through
`/api/seed/complete` today.

For `S0077L01` specifically the likeliest reading is that **the LEGO's own target is wrong**:
it is glossed "it surprises" → *sorprende*, while ten of its eleven phrases teach *me sorprende*.
If the LEGO should be "it surprises me" → *me sorprende*, then nine of those ten rows become
legal at a stroke and the repair for this LEGO is a different, larger job than adding a BUILD
phrase. **That is a decomposition question, not a phrase question, and it is not mine to rule on.**

## Selection-query gap

The repair batch targets one bare row per LEGO — the `B01` slot. Course-wide the real
population, verified directly, is:

| role | rows |
|---|---|
| build | 1,247 |
| use | 10 |
| component | 4 |
| **total** | **1,261** across **1,208** LEGOs |

**48 LEGOs carry more than one bare row.** Three of the 35 sampled LEGOs (`S0121L02`,
`S0258L01`, `S0525L01`) have an untouched second one, including `S0258L01U01` in a USE role —
arguably worse, since USE rows enter spaced repetition and are reviewed forever. Fix the
selection query once rather than rediscovering this LEGO by LEGO.

## What changed as a result

`tools/course-optimization/check-repair-phrases.cjs` — read-only, never writes a row, exit 1 on
any failure so it can gate a generation loop. It reports a forward reference ("*habríamos* —
taught at S612L1, AFTER this phrase") separately from a chunk-boundary break ("every word is
taught earlier, but this span cannot be tiled from taught chunks"), because the two need
different fixes and one label for both would send someone hunting for a typo that isn't there.

Nothing was written to the database. The five failing phrases are quarantined, not applied.
