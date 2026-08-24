# Deletion plan: 27 wrong-voice German introduction clips

**2026-08-05 · worker `f4f12360` · watson-1 · every number below is a live query, not an inference**
**STATUS: PLAN ONLY. Nothing has been deleted. This needs one sentence from Tom.**

CLAUDE.md forbids deleting generated assets without a deletion plan and approval. This is the plan.

---

## What they are

`deu_for_eng` carries 27 `presentation` rows — lego introductions — that are on the **wrong voice**:

| property | value |
|---|---|
| count | **27** |
| voice | `en-GB-SoniaNeural` — an **Azure** voice. The course's configured presentation voice is `eve` (xAI) |
| `duration_ms` | **NULL** on all 27 |
| created | **2026-08-03**, all 27 in one batch |
| `s3_key` | present on all 27 |

They are the entire population of German `presentation` rows with a null duration.

## Why deleting them is lossless — proven, not assumed

Two independent checks, both live.

**1. Nothing references them.** The repair engine's own header enumerates every table that links to
`course_audio` (`tools/repair-silent-clips.cjs:37-43`). All fourteen referencing columns were
checked against the 27 ids:

| table.column | references |
|---|---:|
| `course_legos.{known,target1,target2}_audio_id` | 0 / 0 / 0 |
| `course_practice_phrases.{known,target1,target2}_audio_id` | 0 / 0 / 0 |
| `course_seeds.{known,target1,target2}_audio_id` | 0 / 0 / 0 |
| `listening_pod_sentences.{known,target}_audio_id` | 0 / 0 |
| `course_audio_envelope.audio_id` | 0 |
| `lego_introductions.presentation_audio_id` | **0** |
| `lego_introductions.audio_uuid` | **0** |
| **total** | **0** |

**2. Every one has a healthy sibling on the right voice.** For each of the 27 texts, a different
`presentation` row with the same text exists and has a real duration: 28 siblings, **27 on
`xai_eve`** and 1 on `eve` — the correct configured voice in both cases. **15 of those siblings are
the row actually wired into `lego_introductions`**, so the learner path is already being served by
the correct clip.

### This corrects the earlier record
`deu-status.md` reported these as "15 duplicates and 12 orphans with no `lego_id`". That reading
came from querying `lego_introductions.audio_id`, **a column that does not exist** — the real
columns are `presentation_audio_id` and `audio_uuid`. Re-run against the real schema, the answer is
cleaner: **all 27 are unreferenced, and all 27 have a correct-voice sibling.** The 15/12 split is
not a property of the Sonia rows at all — it is how many of their *siblings* are wired into
`lego_introductions`.

## Why this is safe when `presentation` deletion is normally refused

The standing refusal is real and correct: deleting a `presentation` row CASCADEs into
`lego_introductions` and destroys authored content, which is why `SKIP_ROLE`
(`tools/audio-veracity-repair.cjs:112`, `tools/repair-silent-clips.cjs:121,208-212`) exists.

That hazard is a cascade through a **live foreign key**. These 27 rows have **no foreign key
pointing at them from any table**, so there is nothing for a delete to cascade into. The refusal is
a blanket rule for the general case; this is the specific case where its stated reason does not
apply — and it was checked rather than argued.

## The plan, if Tom says yes

1. Snapshot all 27 rows (all columns, including `s3_key`) to
   `docs/overnight-audio-2026-08-05/deleted-deu-sonia-presentation-2026-08-05.json` — so the delete
   is reversible from the record plus the S3 objects.
2. Re-assert immediately before each delete that the row still has `duration_ms IS NULL`,
   `voice_id = 'en-GB-SoniaNeural'` and **zero references** across all fourteen columns. Abort the
   whole run on any drift.
3. Delete the 27 `course_audio` rows only. **Leave the S3 objects in place** — they cost almost
   nothing, and keeping them makes the operation genuinely undoable.
4. Re-run the reference check and confirm 0 rows remain with `role='presentation'` and
   `duration_ms IS NULL`.
5. No course version bump and no revalidation: nothing that reaches a learner changes, because
   nothing pointed at these rows.

Not run tonight. Approval is Tom's, and nothing about this is urgent — Beuno is unaffected either
way (see below).

## Does this affect Beuno today? No.

The 15 identifiable siblings belong to legos at seeds S0091 and beyond — every one past seed 90,
far outside the seeds 1–30 opening stretch Beuno tests. This is a tidiness defect in the estate, not
a deadline defect.

## The one-sentence decision

> **Delete the 27 Azure-Sonia German introduction rows?** They are on the wrong voice, have no
> duration, are referenced by nothing at all, and every one already has a correct `xai_eve` sibling
> — so the delete is provably lossless and the S3 audio would be kept. **Recommendation: yes.**

---

## EXECUTED — 2026-08-05

**Scope actually approved and run: 15 of the 27, not all 27.** Tom's answer to Watson
("yes delete") was to a narrower framing than this document's "27" recommendation — Watson had
asked specifically about the 15 rows "that each have a correct replacement sitting right next to
them" (i.e. whose sibling is the row actually wired into `lego_introductions`), and told Tom the
other 12 were being investigated separately, read-only, out of this scope. This execution honours
that narrower approval. The remaining 12 (the ones with a same-text sibling but where that sibling
is NOT the wired row) were left completely untouched.

**Deriving the 15, deterministically.** Query: among the 27 `en-GB-SoniaNeural` `deu_for_eng`
`presentation` rows with `duration_ms IS NULL`, find every same-`text_normalized` sibling
`presentation` row, and keep the Sonia row only if one of its siblings is referenced by
`lego_introductions.presentation_audio_id` or `lego_introductions.audio_uuid`. This produced
**exactly 15 rows** — matching Tom's approval count, so the run proceeded.

**Pre-delete verification (Tom's condition).** Before deleting anything, each of the 15 replacement
siblings was fetched from S3 by its real `s3_key` and decoded with the repo's whisper-based
veracity check (`services/audio-veracity.cjs`, reused unmodified) — not just a non-null
`duration_ms` check. **15/15 passed** (`pass: true`, CER range 0–0.18, all well under threshold).
Full results: `scripts/deu-sonia-deletion/verification-results.json`.

**Snapshot.** All 15 full rows (every column, including `s3_key`) were written to
`docs/overnight-audio-2026-08-05/deleted-deu-sonia-presentation-2026-08-05.json` and committed
*before* the delete ran.

**Delete.** DRY_RUN pass first (`scripts/deu-sonia-deletion/02-snapshot-and-delete.cjs`), then live.
Immediately before each delete the row was re-asserted to still have `duration_ms IS NULL`,
`voice_id = 'en-GB-SoniaNeural'`, and zero references across all fourteen linking columns
(`tools/repair-silent-clips.cjs:37-43` enumeration). No drift found. **15/15 `course_audio` rows
deleted. Zero skipped.** S3 objects were never touched — no S3 delete call was made anywhere in
this run.

**Post-delete verification.**
- `role='presentation' AND duration_ms IS NULL` residue: **12** — exactly the untouched orphans, as
  expected.
- References to the 15 deleted ids across all fourteen linking columns: **0**.
- The 15 deleted ids in `course_audio`: **0** (confirmed gone).
- The 15 wired sibling rows: all **15 still present**, all `voice_id='xai_eve'`, all
  `duration_ms > 0`, all **still wired** into `lego_introductions` — the learner path is
  unaffected and was re-confirmed live in Supabase.

**Genuine gap found, reported honestly, not papered over.** Re-checking the 15 deleted rows' own
`s3_key`s afterwards (as a "did we actually keep the audio" sanity check) found that **none of them
resolve** — `GetObjectCommand` returns `NoSuchKey` (404) for all 15, at their `pending/<uuid>.mp3`
keys. This was checked for a permissions artefact first: the identical credentials successfully
fetched and decoded a `mastered/` sibling object in the verification step above, so this is a real
absence, not an access problem. **This is not something this run caused** — no S3 delete was ever
issued, and the objects were checked read-only before any DB delete happened. The `pending/` prefix
(versus the `mastered/` prefix the healthy siblings use) suggests these 15 rows were themselves
stubs from a batch job whose TTS render/upload never completed — consistent with `duration_ms` being
NULL on them from creation. Net effect: the DB rows are gone and nothing pointed at them, so nothing
learner-facing changes either way, but the "audio is kept in S3 for reversibility" premise did not
actually hold for these rows because there was no audio in S3 to keep. Flagging for Tom rather than
treating the plan's stated safety net as verified when it wasn't.

**Not touched, not re-opened:** the other 12 Sonia rows (siblings not wired into
`lego_introductions`). Investigation of those is out of this job's scope per Tom's explicit
instruction.

**One paragraph for Tom on the 12, marked as a question, not an action taken:** this plan document's
own live re-run found all 27 unreferenced and all 27 backed by a correct-voice sibling — the 15/12
split is only about which sibling happens to be wired into `lego_introductions`, not about whether
the Sonia row itself is safe to delete. If the other investigation converges on the same "no FK,
healthy sibling exists" conclusion for the 12, the case for deleting them looks structurally
identical to the 15 just done. That is an observation, not a recommendation to act — it's Tom's call
whether "sibling wired into lego_introductions" was the intended safety bar or just the visible
proxy for it.
