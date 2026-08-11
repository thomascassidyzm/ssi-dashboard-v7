# Concat vs whole — what already exists as playable audio (read-only scout, 2026-08-11)

Question: for how many phrases does BOTH a **concatenated / spliced** version AND a
**whole-phrase single-take** recording of the **same text in the same voice** exist today?

Short answer: **spliced audio is real and live at scale — 26,433 clips. But the strict pair
you asked for (same text, same voice, one spliced + one whole) does not exist anywhere.
Zero. What does exist is 136 same-text pairs where the voices differ, and ~14,000 phrases
whose pieces exist as separate clips in the same voice, ready to be glued in the browser.**

Nothing was generated, nothing was written. All counts are from a live DB read and
paginated S3 listings on 2026-08-11.

---

## 1. YES — real concatenated audio exists today

Two independent sources, both verified.

**(a) The pod explainer composites — 26,433 clips, live, in `course_audio`.**
`services/pod-explainer-composite.cjs` renders each narration piece separately (target
chunk in the target voice, gloss in the known voice, silences via lavfi), splices them
with crossfade through `spliceSegmentsToFile`, masters the result, and stores it as one
ordinary `mastered/{UUID}.mp3` row. The giveaway is the voice tag: `voice_id` starts with
`comp:` (line 259, `comp:${chunkVoice}+${knownVoice}`).

| voice_id | clips |
|---|---|
| `comp:leo` | 23,387 |
| `comp:xai_leo` | 2,715 |
| `comp:ga-IE-OrlaNeural+en-GB-SoniaNeural`, `comp:ga-IE-ColmNeural+en-GB-SoniaNeural`, … | the rest |
| **total `comp:` clips (24 distinct tags)** | **26,433** |

All are `role='pod_explainer'`. No `pod_fine_known` or `pod_take_g` clip is a composite.

**(b) Two orphan demo splices in S3** — `demo-splices/demo1_light.mp3` (122,923 bytes) and
`demo1_tight.mp3` (76,529 bytes), 2026-01-19. Made offline, no generating script in the
repo, not referenced by any `course_audio` row. The `demo1/2/3.mp3` siblings they replaced
were deleted (docs/DECISIONS.md:82). Historical curiosity, not usable data.

**The voice-engine splicer (`services/voice-engine/splicer.cjs`) has never run in
production.** Verified three ways:
- `segments/` prefix: **0 objects** in `ssi-audio-stage` and in `ssiborg-assets`, with full
  pagination (the un-paginated first page is misleading — `ssi-audio-stage` has ~1,000 flat
  root-level keys that hide the `CommonPrefixes` list on page 1).
- No `manifest.json` anywhere under `segments/`, so no splice ledger was ever written.
- No `course_audio` row and no `course_audio_revisions` row has an s3_key under `segments/`
  (key prefixes present: `mastered/` 2,561,153, `repair-candidates/` 1,287, `pending/` 50,
  `mastered-v2/` 26).

---

## 2. The strict pair you asked for: **zero**

Same course + same text + same voice, one spliced and one whole, both playable: **0 rows.**

Two reasons, and the first is structural:

- `course_audio` carries `UNIQUE (course_code, text_normalized, language, role, voice_id)`.
  A splice and a whole take of the same text in the same voice **cannot both exist** as
  rows — the second write upserts over the first. Any such pair could only survive as
  history in `course_audio_revisions`, and no revision row involves a splice: the 51,467
  revisions are all `mastered/`→`mastered/` TTS rebuilds (`reuse-first-rebuild` 50,010,
  `regen-*` 132) and `repair-candidates/` traffic. The old S3 objects behind them are also
  the *previous TTS render*, not a splice.
- The composites' text is a synthetic narration script (`"X". gloss. "X". "X".`), so it has
  no natural whole-take twin anyway.

**This is the gap. If you want a same-voice concat/whole pair, one has to be made — and
making it means generating audio, which was out of scope for this pass.**

## 2b. What *does* exist: 136 same-text pairs, different voices

`docs/concat-vs-whole-2026-08-11/A-concat-vs-whole-same-text-pairs.json` (first 100 of 136).

For 136 explainer narrations the **identical text** exists twice: once as a genuine
multi-piece splice, and once as a single whole TTS render of the entire narration in one
call. The voices differ, which is the honest caveat.

| course | concat side | whole side | pairs | avg text len |
|---|---|---|---|---|
| gle_for_eng | `comp:ga-IE-OrlaNeural+en-GB-SoniaNeural` | `gfzdpspr5fdp` (Tom's clone) | 80 | 145 chars |
| gle_for_eng | `comp:ga-IE-ColmNeural+en-GB-SoniaNeural` | `gfzdpspr5fdp` | 56 | 135 chars |
| fra_for_eng | `comp:leo` | `eve` | 1 | 41 chars |

Plus 719 shorter degenerate fragments ("means, good") excluded from the file.

S3 verified: 40/40 objects HeadObject-present for the first 20 pairs, 24 KB – 157 KB, none
trivial.

---

## 3. Pieces + whole in the SAME voice — the browser-side stand-in

This is the usable answer. Nothing needs generating: the pieces are already separate
playable objects, so a browser can play them back-to-back as the concat side and the whole
clip as the take side.

### 3a. Human, Aran, Welsh — 11 phrases, pieces literally carved from the whole take

`B-human-aran-pieces-and-whole.json`. On 2026-06-15 Aran recorded whole pod utterances;
on 2026-06-16 a pass cut them into clause pieces and registered each as its own
`course_audio` row (no `recording_provenance` row — that is how you spot them). Same
larynx, same session, same microphone. This is the cleanest comparison material on the
estate.

Example: whole `Na, mae'n ddrwg gen i, dw i'n brysur fory. Ond gawn ni siarad ddydd
Sadwrn. Wela i chdi bryd hynny.` (6,024 ms) vs three pieces of 2,544 + 1,992 + 1,560 ms.

Six phrases in `human_aran_cym_n_2`, two in `human_aran_cym_n`, three more listed in the
file. 57/57 S3 objects verified present, 38 KB – 73 KB each.

### 3b. TTS/legacy, LEGO-tiled — 13,997 phrases across just 5 courses

`C-lego-tiled-pieces-and-whole-sample100.json` (a 100-row sample, spread across
course/voice).

Method: for each phrase clip, greedy max-munch tiling of its text using only LEGO clips
(`course_legos.target1_audio_id`) that exist **in the same course and the same voice**.
A hit means every piece needed is already a playable object.

| course \| voice | tileable phrases |
|---|---|
| cym_n_for_eng \| legacy_import | 3,616 |
| deu_for_eng \| ara | 3,251 |
| fra_for_eng \| eve | 2,726 |
| spa_for_eng \| azure_es-ES-ElviraNeural | 1,275 |
| ita_for_eng \| it-IT-ElsaNeural | 1,099 |
| ita_for_eng \| azure_it-IT-ElsaNeural | 1,070 |
| spa_for_eng \| es-ES-ElviraNeural | 895 |
| fra_for_eng \| xai_eve | 62 |
| others | 3 |
| **total (5 courses scanned)** | **13,997** |

That is five courses out of the estate. 77,128 LEGOs estate-wide have target audio, so the
true number is several times this — I scanned five to keep the pass cheap and honest.

`cym_n_for_eng | legacy_import` is the pick of the bunch: legacy *human* Welsh recordings
on both sides, 3,616 phrases.

---

## 4. How a browser gets these clips

Both verified live with curl on 2026-08-11.

**Direct S3, public-read, no signing:**
`https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/{s3_key}` — e.g.
`https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/0040E425-5BEB-4640-9F1C-53E04ABED0F1.mp3`
→ HTTP 206 on a Range request. Note the UUID in the key is **upper-case**; the
`course_audio.id` is lower-case and is a *different* UUID from the key's. Used by
`src/views/production/UserFeedback.vue:313`.

**The app proxy, by audio id:**
`https://saysomethingin.app/api/audio/{audio_id}?courseId={course_code}` → HTTP 200,
`audio/mpeg`. Used by `src/views/admin/PodLab.vue:29`, `ListeningConfig.vue:249`,
`VadLab.vue:42`; served by `ssi-learning-app/api/audio/[audioId].ts`, with a bulk
sibling at `api/audio/batch-urls.ts`.

**Does the player concatenate at runtime today? No.** The player's Web Audio usage is
decode-to-WAV for offline/lock-screen playback (`packages/player-vue/src/cache/wav.ts`,
`resolvePlaybackUrl.ts`) and an iOS session keepalive
(`composables/useAudioSessionKeepalive.ts`). Clips are played one per `<audio>` element in
a phase sequence — nothing glues buffers into a single utterance. So gluing pieces
client-side would be new code, but the bytes are all there and publicly fetchable.

---

## Explicit gaps

- **No same-voice concat/whole pair exists.** Making one requires generating audio; this
  pass was read-only, so it was not done.
- Section 3b scanned 5 courses, not the estate. The 13,997 is a floor, not a total.
- I did not open the audio to confirm the 3a pieces are bit-identical excerpts of the whole
  take — the inference is from timestamps (whole 06-15, pieces 06-16), missing provenance
  rows, and exact clause-text containment. Confirming it needs waveform comparison.
- `ssiborg-assets` and `ssi-audio-stage` were listed in full; the other 36 buckets on the
  account were not walked (they are web/wp/logs/media buckets with no `mastered/` or
  `segments/` role in the audio path).

## Files

| File | What |
|---|---|
| `A-concat-vs-whole-same-text-pairs.json` | 100 of 136 same-text concat/whole pairs, voices differ |
| `B-human-aran-pieces-and-whole.json` | 11 human Welsh whole-takes + their carved pieces, same voice |
| `C-lego-tiled-pieces-and-whole-sample100.json` | 100-row sample of the 13,997 LEGO-tileable phrases, same voice |
