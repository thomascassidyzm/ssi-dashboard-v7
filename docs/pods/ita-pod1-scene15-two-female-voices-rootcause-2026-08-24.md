# ita_for_eng Pod 1 scene 15 — why there are two female voices

Root-cause finding, 2026-08-24. Tom heard the defect live at 10:53Z.
Read-only investigation: nothing was written, rendered, or deleted.

---

## The answer in one paragraph

Scene 15's **whole-turn clips are fine**. The defect is in the **split-clip arrays**, which
the flip gate never looks at. Every scene-15 row on the live pod carries a
`sentence_audio_ids` array that is **byte-identical to the same (scene, sentence) slot in the
retired `ita_for_eng:pod-0-retired-2026-08-22`**, while its `target_audio_id` was correctly
recast. The split arrays were copied **positionally** from pod-0 into pod-1 and never
re-derived. Between the two pods the scene running order changed — the "practising Italian
with a friend" conversation that was **pod-0 scene 15** is now **pod-1 scene 22** — so
scene 15's split clips now play a completely different conversation. Pod-0's cast female was
**Eve**; pod-1's recast female is **Ara**. The whole-turn clips were re-voiced to Ara, the
split clips are still Eve. That is the two different female voices, back to back.

---

## What a learner actually gets

Live `ita_for_eng:pod-1`, scene 15, sentence 1:

| slot | text | voice |
|---|---|---|
| `target_audio_id` (whole turn) | `Quanto costa?` | Ara (f) — correct |
| `sentence_audio_ids[1]` | `Le dispiacerebbe se provassi a praticare l'italiano con lei?` | Eve (f) — wrong conversation |
| `sentence_audio_ids[2]` | `Non sto imparando da molto tempo, e mi sento ancora un po' nervoso di parlare con altre persone.` | Eve (f) — wrong conversation |

This is not only an audio defect. Per
`packages/player-vue/src/composables/podSentenceSplit.ts`, when a row has two or more split
clips the player uses them for **both the audio and the on-screen text** — `targetText` is
read from the clip's own `course_audio.text`. So the learner both hears and reads the wrong
conversation. `Quanto costa?` is a single short sentence and should never have had a
two-clip split at all.

The English side is off-cast too. Scene 15's known-side split clips carry
`en-GB-SoniaNeural` (Azure) and `leo` — **neither voice is in the pod-1 cast**, which is
`bedd6226` (Olivia, f) and `gfzdpspr5fdp` (Tom, m).

## Why the flip gate said zero off-cast

`tools/pods/pod-cast-gate.cjs` measures the **stored cast map** plus the two whole-turn
columns. A `listening_pod_sentences` row has **six** audio slots — `target_audio_id`,
`known_audio_id`, `sentence_audio_ids`, `sentence_known_audio_ids`, `takeg_audio_ids`,
`explainer_audio_id`. The gate reads two of the six. It counted two voices and went green.
The metadata was not lying; the gate was looking at the wrong columns.

## Evidence

**Inheritance, proven by direct comparison.** For all 11 scene-15 rows,
`sentence_audio_ids` is identical to the retired pod-0's same slot, while `target_audio_id`
differs on all 11 (i.e. the main clips *were* recast, the split arrays were not). Across
the 141 pod-1 rows that have a pod-0 counterpart, **91 inherited their split arrays**.
Scenes 16-22 have no pod-0 counterpart.

**Served bytes, scene 15** (fetched from the S3 objects the serving path resolves to;
median F0 over voiced frames, autocorrelation):

- Italian whole-turn: Ara ×10 at **182-243 Hz** (one speaker by MFCC clustering), Enzo ×1 at **104 Hz**.
- English whole-turn: Olivia ×10 at **176-267 Hz**, Tom ×1 at **110 Hz**.
- Eve split clips: **167-200 Hz** — female, sitting right on top of Ara's range.

So the whole-turn tracks are correctly one male + one female per language. The second
female enters only through the split clips.

**Not a stale-bytes problem.** All 11 scene-15 objects have an S3 `LastModified` roughly 40
seconds after their `course_audio.created_at` — render-upload lag, not an in-place
overwrite. Worker #139's shared-clip hazard is real but is **not** what happened here.

## Blast radius — first measurement, not yet the answer

A crude substring test (does a split clip's text appear inside its own row's `target_text`?)
across all 21 live pod-1 courses flags **914 of 4,917 split clips, 18.6%**:

| course | split clips | flagged | course | split clips | flagged |
|---|---:|---:|---|---:|---:|
| isl_for_eng | 239 | 90 (37.7%) | por_for_eng | 239 | 46 (19.2%) |
| nld_for_eng | 236 | 75 (31.8%) | hin_for_eng | 232 | 20 (8.6%) |
| swe_for_eng | 233 | 60 (25.8%) | kor_for_eng | 246 | 19 (7.7%) |
| fra_ca_for_eng | 239 | 59 (24.7%) | ara_eg_for_eng | 222 | 16 (7.2%) |
| hrv_for_eng | 231 | 56 (24.2%) | ara_for_eng | 222 | 15 (6.8%) |
| spa_for_eng | 239 | 54 (22.6%) | **ita_for_eng** | **239** | **51 (21.3%)** |
| fra_for_eng | 225 | 53 (23.6%) | deu_for_eng | 202 | 42 (20.8%) |
| por_br_for_eng | 237 | 53 (22.4%) | eus_for_eng | 239 | 57 (23.8%) |
| ron_for_eng | 239 | 50 (20.9%) | gle_for_eng | 239 | 49 (20.5%) |
| spa_mx_for_eng | 238 | 49 (20.6%) | jpn / zho | — | see caveat |

**Caveat, stated explicitly:** this test strips non-Latin script, so the 0% it reports for
`jpn_for_eng` and `zho_for_eng` is an artifact, not a clean bill of health. It also flags
*inheritance*, which is only harmful where the scene order actually changed. Treat the
table as a starting point. Worker #282 is producing the real per-course mismatch count with
a script-safe method.

## The fix, and what it does not need

Nulling `sentence_audio_ids` / `sentence_known_audio_ids` on an affected row makes
`podSentenceSplit` fall back to the whole-turn clip — which is already correctly cast and
correct in content. **That needs no TTS and no new audio.** The cost is the per-sentence
split experience on turns that genuinely are multi-sentence; those want a re-split of the
existing whole-turn clip, which is audio processing, not generation.

Two things must be settled before anything is written to live rows, and both are with
worker #281:

1. whether nulling a split array counts as a content change under
   `docs/pods/pod-migration-protocol.md` (progress is filed under a sentence's slot, so this
   turns on whether slot identity changes — it appears not to, but that needs proving from
   the protocol and the `learner_pod_state` schema, not assuming);
2. which tool did the positional copy, so the bug is fixed where it lives rather than
   patched per course. `tools/pods/clone-pod.cjs`, `pod-switchover.cjs` and
   `pod1-percall-recast.cjs` are the candidates.

## Gaps

- My MFCC-mean timbre method separates male from female robustly but **could not**
  independently confirm that Eve and Ara are different speakers — their distances overlap
  the within-speaker spread. The claim that they are two distinct female voices rests on
  their being different `voice_id`s from different renders, plus Tom's ear. Worker #279 is
  redoing this with a proper speaker embedding.
- I measured the whole of scene 15 by bytes and the rest of the course by metadata only.
- I pulled bytes from the S3 objects the serving path resolves to, not through the learner
  URL itself (Popty is not running locally and the learner route needs entitlement).
  Workers #279 and #281 are covering the learner path.
