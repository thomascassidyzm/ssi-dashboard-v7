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
