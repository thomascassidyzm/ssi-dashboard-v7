# A-120 — Syrian Arabic Learner recast female

**Date:** 2026-08-16
**Course:** `ara_sy_for_eng`, pod `pod-0`
**Ruling (Tom, 2026-08-16, plate A-120):** "A120 - yes - recast female"
**Branch:** `fix/a120-ara-sy-learner-female-2026-08-16`

## Why

The Syrian Arabic Learner persona was cast on Azure's **male** Syrian voice (Laith) with
`gender: "m"`. Across the 66 courses with a pod, the Learner is female in 63; both other Arabic
siblings give her a female voice. Because she was cast male, the A-108 Indo-Iranian/Semitic
annotation pass correctly rewrote nine Learner lines from feminine to masculine agreement — and
flagged in its own report (`docs/a108/indo-iranian-semitic-report.md`) that if the intent was a
female persona, the fix was to recast the voice and revert those nine rows. Tom has now ruled
exactly that way.

## What changed

### 1+2. Cast and gender declaration (one atomic JSONB write)

| | Before | After |
|---|---|---|
| `gender` | `m` | `f` |
| `target.name` | Laith | أماني |
| `target.voice_id` | `ar-SY-LaithNeural` | `ar-SY-AmanyNeural` |
| `target.locale` | `ar-SY` | `ar-SY` (unchanged) |
| `target.provider` | `azure` | `azure` (unchanged) |
| `known` | Tom, xai, `gfzdpspr5fdp` | **unchanged** |
| `variants` | `["Learner"]` | **unchanged** |

Amany is already cast on six other characters in this same pod (Anna, Barista, Customer 2,
Customer 3, Receptionist, Sarah), so no voice pool changed and nothing new was introduced. The
shape copied is Sarah's exactly.

**Known side deliberately left as Tom's clone.** The Learner's English lines are already rendered
on `gfzdpspr5fdp` and that audio is live. Changing the known voice would strand real rendered
learner-facing audio — the make-before-break violation the estate has standing doctrine against.
If Tom wants the English side female too, that is a one-word overrule and a separate, audio-aware
job.

### 3. Nine masculine text edits reverted

Each restored to the `before` value recorded in `docs/a108/indo-iranian-semitic-applied-log.json` —
a restoration of a recorded prior value, not a re-authoring.

| Sentence id | Restored to (feminine) |
|---|---|
| `…:SC15-S010` | آسفة، ما فيني احكي كتير سريع. |
| `…:SC16-S002` | حكيت شوي سريع، فما أنا متأكدة إذا فهمت. |
| `…:SC16-S010` | آسفة، ما معي كاش. |
| `…:SC18-S007` | هاد صح؟ أنا محقة؟ |
| `…:SC18-S008` | أنا غلطانة بهالموضوع؟ |
| `…:SC18-S009` | آسفة، ابني ضيع تذكرته. |
| `…:SC19-S002` | هاد بيخليني قلقانة شوي. |
| `…:SC19-S003` | لما تحكي سريع، بحس حالي غبية. |
| `…:SC22-S001` | ما رح تمانع إذا حاولت احكي عربي سوري معك؟ … وبعدني حاسة حالي شوي متوترة … |

`target_text_draft` left `true` on all nine — these remain unproofread drafts and nothing in this
job changes that.

## Proofs taken before applying

- **Zero audio cost.** All nine rows had `target_audio_id IS NULL` — no Arabic audio has ever been
  rendered for them, so nothing needed regenerating or deleting. `known_audio_id` is non-null on all
  nine (English audio exists) and was not touched.
- **Zero learner progress.** `SELECT count(*) FROM learner_pod_state WHERE sentence_id LIKE
  'ara_sy_for_eng:%'` returned **0**, measured in the same session immediately before the write.
  Combined with the absence of Arabic audio, no learner can ever have heard these lines, so the
  content-change migration protocol (`docs/pods/pod-migration-protocol.md`, plate A-111) resolves to
  a genuine no-op here. No migration tool was run.
- **Drift assertions.** The pod write was conditioned on `Learner.target.voice_id =
  'ar-SY-LaithNeural' AND gender = 'm'`; each sentence write was conditioned on its exact id, its
  current text equalling the A-108 `after` value, and `target_audio_id IS NULL`. Zero rows aborted.

## Post-apply verification (fresh live query, not the script's return value)

- `speakers->'Learner'` reads `gender: "f"`, target `ar-SY-AmanyNeural` / أماني / `ar-SY` / azure;
  `known` byte-identical to before.
- Whole-JSONB diff of the 23-speaker `speakers` object, before vs live after: **`Learner` is the
  only key that differs.** Speaker count 23 → 23.
- All nine `target_text` values match the A-108 `before` strings; `target_text_draft` still `true`;
  `target_audio_id` still null; `known_audio_id` still non-null.
- No row outside the nine and no pod outside `ara_sy_for_eng` was written — every statement was
  id-scoped. `course_audio` was never queried for write; no clip created, relinked or deleted.

## Logs

- `docs/pods/a120-ara-sy-learner-recast-dryrun-log.json`
- `docs/pods/a120-ara-sy-learner-recast-applied-log.json`

Apply script: `scripts/a120-ara-sy-learner-recast.cjs` (gitignored workspace; `DRY_RUN=1` default).

## Notes, no action taken

- **Catalan and Hebrew** still declare a male Learner (`cat_for_eng` on `ca-ES-EnricNeural`,
  `heb_for_eng` on `he-IL-AvriNeural`). They were not ruled on and were not touched. They plausibly
  want the same ruling — a decision for Tom, not this job. Note each of those two courses returned
  two pod rows in the check, which is worth a look by whoever picks that item up.
- `spa_for_eng` also currently reads a male Learner on a non-Azure voice id (`yis75yfp`); the
  Spanish pool-locale fix is live work owned elsewhere, so it was left alone.
- **Known live bug, not fixed here:** `tools/pod-sync.cjs`'s `langKey()` collapses `ara_sy` to
  `ara`, casting Syrian Arabic off the Saudi/MSA pool; `tools/pod-recast.cjs` documents this and
  works around it with `remapExactPool()`. Neither tool was run or edited — both are dirty in the
  working tree under another worker. This job's change was a targeted single-speaker JSONB edit, so
  the bug did not bear on it.
