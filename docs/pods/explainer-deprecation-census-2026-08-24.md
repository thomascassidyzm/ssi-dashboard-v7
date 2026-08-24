# Pod explainers — deprecation census (2026-08-24)

> **Tom's ruling, verbatim (2026-08-24):** *"Explainers do not exist anymore. We don't do
> them. Learners never hear them in app. Let's deprecate them completely."*

Deprecate = **stop producing, stop showing, stop reporting**. It is NOT delete-history.
No `DELETE`, no `UPDATE … SET explainer_* = NULL`, no dropped columns, no removed S3
objects, no migrations. Every existing clip and row stays exactly where it is.

This document is the map made BEFORE any code was cut, so the diff can be audited against
it.

---

## 0. Three unrelated things are called "explainer" in this repo

| Family | What it is | Verdict |
|---|---|---|
| **A. Pod-sentence explainer narration** | `listening_pod_sentences.explainer_text / explainer_decomposition / explainer_audio_id`; `course_audio.role='pod_explainer'`; the Haiku text generator, the xAI narration render, the `comp:<chunk>+<gloss>` composite | **IN SCOPE — this is what Tom deprecated** |
| **B. Popty DOCS explanation pack** | `src/explainer/`, `src/components/explainer/`, `tools/explainer/compile.mjs`, `GET /api/explainer/pack`, `POST /api/explainer/refresh`, `.github/workflows/explainer-check.yml` | **OUT OF SCOPE — untouched.** Popty's own how-this-works docs for operators. Nothing to do with pod narration. |
| **C. Stage-0 atom ladder** | `pod_legos.explainer_audio_id`, the `[atom] …` / `· <gloss>` clips (also stored under `course_audio.role='pod_explainer'`), `algorithm_config['stage0'].tiers[0].key = 'explainer'`, `src/lib/podEngine/stage0Sequence.ts`, `podStageComposition.ts`, `src/views/ListeningConfig.vue`, `src/views/admin/PodLab.vue`, `api/pod-content.js`, `tools/persist-stage0-pod0.cjs`, `tools/build-shared-known-store.cjs`, `tools/render-residue-atoms.cjs`, `tools/breakdown-flat.cjs`, `tools/verify-breakdown.cjs` | **OUT OF SCOPE — reported, not cut. See §4.** |

Family C shares the `pod_explainer` `course_audio` role with family A, which is the single
most dangerous confusion in this job: a blind sweep on the role string cuts a live system.

---

## 1. Where family A is GENERATED (the producers)

| Path | Role |
|---|---|
| `services/pod-explainer-generator.cjs` (462 ln) | Haiku call per sentence → `explainer_decomposition` + `explainer_text`. Explainer-only file. |
| `services/pod-explainer-composite.cjs` (377 ln) | Splices `[chunk · target voice][means x′ · known voice]…` into one mastered clip; uploads; links `explainer_audio_id`. Voice id `comp:<chunk>+<gloss>`. Explainer-only file. |
| `services/run-pod-explainer-batch.cjs` (533 ln) | Overnight CLI: text pass + xAI TTS audio pass (voice `gfzdpspr5fdp`, role `pod_explainer`). Explainer-only file. |
| `services/production-api.cjs` `GET /api/admin/pod-explainer-audit` (~13014) | Coverage census by explainer state. |
| `services/production-api.cjs` `POST /api/admin/pod-explainer-generate` (~13096) | Batch text generation via `podExplainer.generateForBatch`. |
| `services/production-api.cjs` `POST /api/admin/pods/:courseCode/generate-explainer-audio` (~4707) | **Spends TTS money**: xAI render → `course_audio` role `pod_explainer` → writes `explainer_audio_id`. |
| `services/pod-bulk-migrate.cjs` | Carries explainer columns through pod migrations. |
| `services/phases/phase8-audio-v13.cjs` | No explainer leg of its own; exports `canonicalClipVoiceId` etc. that the composite consumes, plus explainer commentary. |

## 2. Where family A is STORED

- `listening_pod_sentences.explainer_text` — **13,993 rows non-null** (live count, 2026-08-24)
- `listening_pod_sentences.explainer_audio_id` — **4,580 rows non-null**
- `listening_pod_sentences.explainer_decomposition`
- `pod_legos.explainer_audio_id` — **family C**, not family A
- `course_audio` where `role='pod_explainer'` — **50,834 rows** (mixed families A and C)

All of the above stay. Columns keep their data; nothing is nulled or dropped.

## 3. Where family A is SURFACED and REPORTED

**Popty admin UI**
- `src/views/PodDetailView.vue` — the whole Stage-1 explainer panel: coverage counts,
  Generate / Regenerate-all / Generate-explainer-audio buttons (calls both endpoints
  above), inline `explainer_text` note, explainer play button.
- `src/views/PodScriptsView.vue` (~290–294) — "▶ Explainer" clip button.
- `src/lib/podPlayQueue.js` — `explainer` queue entry (**not on `origin/main` at census
  time**; job #381's rebuild; handle whichever state lands).
- `src/components/PodCastPanel.vue` — `__explainer__` cast row; counts
  `knownLines + explainerLines` into its workload estimate.
- `src/utils/podRecordingPlan.js`, `src/views/RecordRoom.vue`,
  `src/components/production/autocue/PodLongTakeStudio.vue` — explainer kind in the
  recording plan.

**Voice engine (the `__explainer__` entanglement — see §5)**
- `services/voice-engine/pods-cast.cjs` — `EXPLAINER_SPEAKER = '__explainer__'`
- `services/voice-engine/pods-plan.cjs` — explainer recording queue + `counts.explainer`
- `services/voice-engine/pods-coverage.cjs` — `KINDS` includes `'explainer'`
- `services/voice-engine/pods-registration.cjs` — `explainer → 'pod_explainer'` role map
- `services/voice-engine/pods-router.cjs` — `explainerWorkload`, explainer inventory,
  explainer text-edit patch path

**Gates / audits / tools**
- `tools/pods/pod-cast-gate.cjs` — checks `explainer_audio_id`, reports as a **permanent
  warning** (`explainerBlocking` flag)
- `tools/pods/relink-off-cast-explainer-clips.cjs` — explainer-only repair tool
- `tools/pod-state-report.cjs`, `tools/pod-voice-coverage.cjs`,
  `tools/pods/verify-pod-audio-fidelity.cjs`, `tools/audit-chunk-audio-coverage.cjs`,
  `tools/audio-gender-lint.cjs` — explainer legs

## 4. Family C — Stage-0 atom ladder: REPORTED, NOT CUT

Evidence it is a different, live system:
- `algorithm_config['listening']` (the stage playlists learners actually run) contains **no
  `explainer` role** — verified live 2026-08-24. That is the mechanical confirmation of
  Tom's "learners never hear them in app" for family A.
- `algorithm_config['stage0']` DOES carry a tier keyed `explainer`, model
  `whole-part-whole-v1`, last written by **thomas.cassidy+ssi@gmail.com on 2026-06-27**
  from the Stage-0 tuner's Save button. That is the per-atom breakdown ladder, not the
  per-sentence narration.
- `src/views/admin/PodLab.vue` says in a comment: *"separate whole-sentence explainer stage
  removed (the explainer lives ONLY in Stage 0)"*.
- It is served to learners through `api/pod-content.js` at popty.app.

So "explainer" in family C is a **tier name for the atom breakdown**, sharing a word and a
`course_audio.role` with the deprecated narration track. Cutting it would break a system
Tom tuned himself eight weeks ago. Per the commission's standing default —
*"anything genuinely ambiguous: do not delete it, report it"* — family C is left running
and flagged for Tom in the final report.

**Consequence to state plainly:** after this pass there is still one reachable TTS path
that writes `course_audio.role='pod_explainer'` — `tools/render-residue-atoms.cjs` and
`tools/build-shared-known-store.cjs`, both family C. No family-A path remains.

## 5. The `__explainer__` entanglement

`services/voice-engine/pods-cast.cjs`: `EXPLAINER_SPEAKER = '__explainer__'` is one cast
entry covering **both** known-language pod lines (alive; Tom was listening to them today)
**and** explainer narration (deprecated). The cast key is NOT ripped out. Only the
`explainer_text` workload is removed from the plan, the counts, the coverage and the
registration role map. The known leg stays whole.

---

---

## 6. RESULT — what the cut actually did

Verified at branch tip, not asserted:

- **No file in the repo references** `pod-explainer-generator`, `pod-explainer-composite`
  or `run-pod-explainer-batch` — all three deleted.
- **No code path constructs a `comp:` composite voice id.** `canonicalClipVoiceId` still
  *parses* one, which is correct: existing composite clips keep their identity. Every
  caller in the tree passes a single voice id.
- **No code writes `explainer_audio_id` or `explainer_text` on an existing row.** The only
  writes left are `pod-dialogue-generator.cjs` inserting `null` on brand-new pod rows,
  and the family-C Stage-0 tools writing `pod_legos.explainer_audio_id`.
- **`tools/pods/relink-off-cast-explainer-clips.cjs` is deleted** — that was a live
  `--apply` DB write path.
- **`pod-cast-gate.cjs` no longer checks or reports `explainer_audio_id`**; the
  `explainerBlocking` option is gone. Its tests were flipped to assert total silence.
- **Surviving `role='pod_explainer'` writers are all family C**: `breakdown-flat.cjs`,
  `build-shared-known-store.cjs`, `persist-stage0-pod0.cjs`, `render-residue-atoms.cjs`.
  Expected and documented in §4.

**Gates.** Syntax gate: 109 files parse. Voice-engine: 22 files, 260 tests, 0 failed.
Full suite on this branch: 16 failed / 2,656 passed. Full suite on `origin/main` at the
same moment: 16 failed / 2,657 passed. Same failure count, same failure set bar one file
(`PodLab.casting.test.js`) that passes 22/22 in isolation and only trips under parallel
load. **Zero regressions from this branch.**

## 7. CONSEQUENCE FOR TOM — Stage-0 runs off a frozen corpus

`services/pod-lego-extractor.cjs` builds the live Stage-0 atom inventory by folding
`listening_pod_sentences.explainer_decomposition` — the chunk/gloss pairs the now-deleted
generator produced. Existing pods are unaffected. A NEW course or pod gets no atom
inventory, because nothing can make more decompositions.

Three options, unactioned, Tom's call:
- **A. Leave it frozen** — right if Stage-0 is itself on the way out.
- **B. A decomposition-only generator** — the chunk/gloss pass, no narration text, no TTS,
  no `explainer_text`, no audio. Cheap, no money path. **Recommended if Stage-0 stays.**
- **C. Rebuild Stage-0's inventory from its own source** rather than borrowing a
  deprecated track's field. Cleanest, most work, a design job not a cleanup one.

## 8. FINDING — the learning app (out of scope, no edit made)

`ssi-learning-app` still carries `1: ['ps', 'explainer', 'ps']` in
`DEFAULT_STAGE_PLAYLIST` in `packages/player-vue/src/composables/usePodLapScheduler.ts`,
on both `origin/main` and `origin/dev`. Its own header states the live `algorithm_config`
has no explainer slot in any of its nine stages — which this pass verified directly
against the DB. So it is a **dead default that reaches no learner**, consistent with Tom's
ruling. Worth tidying in that repo; deliberately not edited here.

---

*Census taken before any edit. §6-§8 added at completion.*
