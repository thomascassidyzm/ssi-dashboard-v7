# Stage 0 arc demo — Irish pod-0 g3

One listenable MP3 of the full 5-exposure "Stage 0" introduction ramp for ONE
Irish sentence, so the founder can hear the arc end to end.

- **Sentence:** `gle_for_eng:pod-0` global_order 3 (speaker: Neighbour)
  - target: `Táim go maith, go raibh maith agat. An bhfuil tú ag dul chun oibre?`
  - known: `I'm very well, thank you. Are you going to work?`
- **Output:** `~/Desktop/explainer-audio-demo/Irish-g3-stage0-arc.mp3`
- **Build:** `node scripts/experiments/stage0-arc/build-arc.cjs` (READ-ONLY DB, no writes/commits)

## Atoms (from `explainer_decomposition`, in order)
1. `Táim go maith` = I'm very well
2. `go raibh maith agat` = thank you
3. `An bhfuil tú ag dul` = are you going
4. `chun oibre` = to work

Construction tail in `explainer_text`: **none** (no `— so / — literally` clause),
so 0:1 has no spoken tail. The code honours a tail if one is ever added.

## Voices (copied from the production composite conventions)
- **Cast / target (chunk) voice** = `ga-IE-ColmNeural` (Azure) — the sentence's
  existing target clip voice (`target_audio_id → course_audio.voice_id`). Used
  for ALL target/chunk audio, including the fused pair/group targets.
- **Known / gloss / translation / marker / cue voice** = `en-GB-SoniaNeural` (Azure).
- Every TTS piece is edge-trimmed (`EDGE_TRIM_FILTER`, silenceremove keeping 40ms
  each side) and re-encoded through the same `ffmpeg→lame` path (48k mono CBR)
  the composite uses. S3 clips are re-encoded to the common format only (no
  edge-trim — they're already mastered with clean edges).

## Gaps (ms) — match the composite's pacing
- target → meaning (within a unit): **240**
- between the two repeats inside 0:1's doubled pair: **360**
- between successive units in a tier: **620**
- between tiers: **900**
- pair fusion gap (0:3, drawing two atoms together): **140**
- whole-sentence chunk fusion gap (0:4): **70**

## Per-tier piece sequence
Each tier is preceded by a spoken marker in the known voice ("Exposure one"…
"Exposure five"), then a 240ms gap, then the tier body. 900ms sits between tiers.

- **0:1 — Explainer (atoms).** marker · cue "Breaking it down..." · 620 · then for
  EACH atom: `target · 240 · gloss · 360 · target · 240 · gloss` (the pair heard
  twice); 620 between atoms. No tail (none present).
- **0:2 — Translation drill (no cue, no notes).** For EACH atom:
  `target · 240 · gloss · 240 · target · 240 · target`; 620 between atoms.
- **0:3 — Pairs.** Two fused pairs: (Táim go maith + go raibh maith agat) and
  (An bhfuil tú ag dul + chun oibre). pair_target = the two atoms' cast pieces
  concatenated with a 140ms gap. Per pair:
  `pair_target · 240 · pair_translation · 240 · pair_target · 240 · pair_target`;
  620 between the two pairs.
- **0:4 — Whole, chunked.** grp_target = all four atom cast pieces concatenated
  with a 70ms gap. `grp_target · 240 · sentence_translation · 240 · grp_target ·
  240 · grp_target`. `sentence_translation` = the sentence's EXISTING known clip
  from S3 (`known_audio_id`, voiced by xAI `leo`).
- **0:5 — Whole, seamless.** `sentence_target · 240 · sentence_translation · 240 ·
  sentence_target · 240 · sentence_target`. `sentence_target` = the sentence's
  EXISTING natural target take from S3 (`target_audio_id`, `ga-IE-ColmNeural`).

## Choices the founder should confirm (tunable here)
- **pair_translation wording (0:3):** "I'm very well, thank you" and "are you
  going to work". These are the natural English of each fused pair (lower-cased
  the second to read as a continuation). Constants near the top of `build-arc.cjs`.
- **Fusion gaps:** 140ms (pair) and 70ms (whole-sentence chunking) — chosen to
  "draw together" without sounding spliced. Easy to nudge.
- **Markers:** literally "Exposure one"…"Exposure five" in Sonia's voice. These
  are scaffolding to make the arc legible in one listen — a real Stage-0 player
  would NOT speak them; drop or reword freely.
- **0:1 cue:** "Breaking it down..." — same as the production composite cue.
- **0:4 / 0:5 translation clip voice mismatch:** the sentence's existing
  `known_audio` clip is voiced by xAI `leo` (NOT Sonia), so 0:4 and 0:5's
  translation lines are in a different voice from the freshly-rendered glosses in
  0:1–0:3. That's faithful to "use the existing clip" but the founder may prefer
  re-rendering the sentence translation in Sonia for a consistent known voice.

## ffmpeg hazard handling
The brief's warning (ffmpeg 7.1.1 threaded `acrossfade` nondeterministically
drops segments) is avoided entirely: NO acrossfade anywhere. The whole arc is a
SINGLE flat concat-demuxer join of 137 leaf pieces (one re-encode). Fused groups
are expanded into their leaf pieces inline.

**Verification:** measured in the PCM/sample domain (decode to raw s16le, count
bytes) — not container metadata, which carries per-file MP3 encoder padding. Sum
of leaf parts = 89806ms; final file true PCM = 89793ms → 13ms drift (one MP3
frame), so no segments were dropped. (An earlier nested-concat build showed a
spurious 576ms metadata "shortfall" that was pure MP3-padding accumulation, NOT
lost audio — confirmed by a 3×1s-silence control: 3 files reporting 1032ms each
concatenate to 3024ms with zero audio lost.)

## Run result
- total: 89.79s (true PCM) / 89.83s (container)
- per-tier body durations (true PCM): 0:1 22.28s · 0:2 18.53s · 0:3 16.51s ·
  0:4 14.67s · 0:5 17.81s
- Azure TTS calls: 16 (budget ≤20). Distinct pieces: 4 cast atoms (Colm) + 4 atom
  glosses + 2 pair translations + "Breaking it down..." + 5 exposure markers, all
  cached by (voice, text).
- Output container: 48kHz mono MP3, LAME3.100 header, no ID3v2 (iOS-safe; passes
  `audio-processor.checkMp3Format`). Full decode = no errors.
