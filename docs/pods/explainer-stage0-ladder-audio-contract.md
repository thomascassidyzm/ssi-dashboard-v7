# Stage-0 Explainer Ladder — Audio Contract (pipeline ↔ app)

*2026-06-12 — written for the app-delivery agent, after Tom's question about
whether explainer atoms are persisted. Pipeline side: `ssi-dashboard-v7-clean`
(`services/pod-explainer-generator.cjs`, `services/pod-explainer-composite.cjs`).
App side: `usePodLapScheduler.ts` in ssi-learning-app.*

## The goal (Tom's design)

Maximum granularity the first time a learner meets a sentence, decreasing as
they hear it again, until it lands at phrase level. Stage 0 runs one rung per
pod-round:

| Rung | Content | New audio needed? |
|------|---------|-------------------|
| 0:1 | atoms + glosses, occasional explanation/tail ("Ideš means you're going, na posao means to work") | yes (baked composite) |
| 0:2 | same atoms, bare drill ("Ideš — you're going; na posao — to work") | yes (same pieces, re-spliced) |
| 0:3 | adjacent parts merged, max 2, authored glosses ("Gehst du — are you going") | yes (merged spans are new TTS; rest reused) |
| 0:4 | whole clause + natural translation | **no** — row's existing `target_audio_id` + `known_audio_id` |
| 0:5 | repeat of 0:4 | **no** |

The app's `podStageFor()` already returns `{ stage, iter }` — rung selection is
`iter` within Stage 0. No new scheduler concepts.

## Current state of persistence (the factual answer)

- **Atom pieces are NOT persisted.** `renderPiece()` writes each TTS piece
  (target chunk in the character's cast voice, "means …" gloss in the known
  voice, silence gaps) to a **temp dir**, the splicer consumes them, and the
  temp dir is deleted in a `finally`. They never touch S3 or `course_audio`.
- **Only the baked composite** is mastered, uploaded, inserted into
  `course_audio` (role `pod_explainer`) and linked via
  `listening_pod_sentences.explainer_audio_id`.
- **No timing map exists** — nothing records where each atom sits inside the
  baked clip.

So today the app can only fetch whole baked explainers. Anything finer is a
pipeline change. Three options were considered:

## Option A — bake one clip per rung (RECOMMENDED)

Pipeline renders each rung's narration as its own composite clip, exactly like
today's explainer but three times per sentence (0:1, 0:2, 0:3; 0:4/0:5 reuse
existing row audio).

- **Why this wins:** pacing is mastering-grade, not player-grade. Getting the
  chunk→gloss gap right took edge-trimming Azure's ~140ms/~870ms lead/tail
  padding, exact lavfi silence pieces, per-piece loudnorm, and splice-duration
  verification (see commits `fddd66ec`, `67e40842`). The app's own audio
  doctrine budgets ~50ms of jitter per file handoff on mobile Safari — fine
  inside a 4s cycle pause, ~25% slop per joint against a 180ms authored gap.
  Baked clips play identically everywhere, offline caching stays 1 file per
  (sentence × rung), and "one audioId per slot, complete or it doesn't play"
  stays true (no runtime text/audio desync class).
- **Cost:** TTS is per unique *piece* and pieces dedupe in the render cache
  across rungs, so the extra rungs are mostly re-splicing: ~3 new clips per
  sentence, ~380 clips/course, a few MB. Rungs 0:4/0:5 are free.
- **Contract:** `listening_pod_sentences` grows a rung-keyed map, e.g.
  `explainer_audio jsonb = {"r1": uuid, "r2": uuid, "r3": uuid}`, with the
  legacy `explainer_audio_id` kept as an alias of `r1` during transition.
  App picks the id by `iter`; falls back per the existing missing-explainer
  rule (play `known_audio_id` instead) when a rung id is null.

## Option B — persist atoms as `course_audio` rows, app stitches at runtime

Trivially possible pipeline-side (the pieces exist at render time — persist
them with a role like `pod_explainer_piece` instead of deleting). NOT
recommended for playback: gap jitter as above, 6–10× cache entries per
sentence, and the app re-acquires an audio-assembly responsibility the Cycle
refactor deliberately removed. **Do this additively later if and only if the
app needs atom interactivity (tap-to-replay an atom).**

## Option C — timing map inside the baked clip (cheap add-on to A)

At splice time the pipeline knows every piece's exact duration. Emitting
`[{atomIdx, startMs, endMs}, …]` per rung into the same jsonb costs nothing
and gives the app **atom-level text highlighting in perfect sync** without
assembling audio. (It does NOT substitute for per-rung clips: rung narrations
differ in content and order, and seek-segment playback has the same jitter
problem as stitching.)

## Recommended package

**A + C:** per-rung baked clips, rung-keyed jsonb with ids + timing maps,
`explainer_audio_id` aliased to r1, app selects by `{stage, iter}`, rungs 4/5
resolve to the row's existing target/known audio. Option B stays on the shelf
until an interactivity feature asks for it.

## Status / sequencing

Atom-level scripts (rung 0:1 content) for hrv + gle are regenerated and under
Tom's review; voicing is gated on a sample-listen. The per-rung schema +
composite changes (render N narrations per sentence, emit timing maps) are the
next pipeline build after the granularity text is ratified. Until then the
app-side fallback (no explainer audio → play translation) carries Stage 1.
