# Glued audio: what it actually is in this estate

Read-only investigation, 2026-08-11. Repos: `ssi-dashboard-v7-clean` (Popty) and `ssi-learning-app`.
No code changed, no DB writes. DB statements below are `SELECT` only.

---

## The one-line answer

**Glued audio is a build-time server operation in Popty that produces one ordinary MP3 and one
ordinary `course_audio` row.** It is not a playback-time behaviour, and the learning app has no
concept of it whatever. So swapping in a volunteer's whole-phrase recording is a **row-level
supersede** — a normal clip swap — **not a change of shape.**

With one catch that matters more than the answer itself: **nothing in the data marks a clip as
glued.** A glued clip and a real whole-phrase recording are the same row shape, same `origin`, same
key prefix. There is no flag for "this is a placeholder". See §5.

And a second: **zero glued clips exist in production today.** The code is written and unit-tested;
it has never registered a clip. See §3.

---

## 1. Where the gluing code is

`services/voice-engine/splicer.cjs` is the glue. Its own header states the rule
(`splicer.cjs:1-19`):

> normalize each segment → crossfade concat → encode via the ffmpeg→lame pipe (the iOS-safe
> encoder — NEVER ffmpeg's mp3 muxer)

- `buildSplicePlan()` (`splicer.cjs:47`) is pure and decides *which* phrases get glued.
- `spliceSegmentsToFile()` (`splicer.cjs:217`) does the audio. Note `splicer.cjs:206-215`: the
  crossfade chain was **retired** because ffmpeg 7's threaded CLI silently drops whole segments;
  the live path is the plain `concat` demuxer (`splicer.cjs:259-266`) with a duration verify after.
  `crossfadeConcatToLame` (`splicer.cjs:156`) is kept for reference only.
- Two hard rules baked in (`splicer.cjs:11-18`): a recorded whole-phrase take **always** beats
  splicing that phrase, and voice is a hard partition — segments from two voices are never mixed
  into one phrase.

The inputs it glues are **chunks cut out of human recording takes**, not TTS LEGO clips. Chunk
boundaries come from `services/voice-engine/align.cjs` — `alignSlowGapTake()` (`align.cjs:193`)
runs ffmpeg `silencedetect` on the slow-gapped read and `cutSegments()` (`align.cjs:280`) writes
per-chunk MP3s into an S3 manifest. Those chunk MP3s are **not** `course_audio` rows; they are
splice inputs only.

### The rest of the estate cuts, it does not glue

Most of what greps as "splice" runs the other direction:

- `services/phases/phase8-audio-v13.cjs:5860` `POST /splice-components/:courseCode` — cuts a
  component *out of* a parent M-LEGO clip using `word_boundaries`, writes a row with
  `voice_id: 'spliced'` (`:6079`).
- Take G / fusion-drill chunks (`ssi-learning-app` `packages/core/src/pods/fusionDrill.ts:18`) —
  "contiguous ms slices of the sentence's Take G render". Again cutting.

### One standalone CLI that glues but touches nothing

`tools/recording-optimizer/splice-legos.cjs` — "Concatenates extracted LEGO audio segments into new
phrases with crossfade" (`:1-18`). It reads a directory of MP3s and writes MP3s to another
directory. **No Supabase, no S3, no `course_audio`** — verified by grep. It is a bench tool.

---

## 2. What a glued clip is, as data

`services/voice-engine/synthesis-job.cjs:425-441` is the whole answer:

```js
const audioId = crypto.randomUUID().toUpperCase()
const s3Key = `mastered/${audioId}.mp3`        // live serving prefix — same as every other clip
...
const insertedId = await db.upsertHumanCourseAudio(deps.supabase, {
  courseCode, text: item.text, language, role: slot.role,
  voiceId: job.voiceId, s3Key, durationMs,
})
```

`db.cjs:146-166` writes it as `origin: 'human'`, upserting on
`(course_code, text_normalized, language, role, voice_id)`.

So: **one uuid, one `mastered/{uuid}.mp3`, one `course_audio` row, indistinguishable from any other
clip.** It reaches the phrase by the ordinary FK link pass, `db.cjs:175` →
`link_all_audio_ids`, which sets `course_practice_phrases.target1_audio_id` / `target2_audio_id`.

The only trace that it was glued is a `recording_provenance` row with
`recorded_by: 'voice-engine'` and `quality_notes` JSON carrying `method: 'spliced'`
(`provenance-adapter.cjs:132-148`). That is a side ledger with **no FK** to `course_audio`.

**The 2026 design spec is not what got built.** `docs/AUDIO_SPLICING_SPEC.md:410-470` proposes
`recording_sessions`, `phrase_segments`, `word_boundaries`, `lego_library` and `spliced_audio`
tables. Live DB check:

```
 spliced_audio | lego_library | recording_sessions
---------------+--------------+--------------------
        (null) |       (null) |             (null)
```

None of them exist. The implementation went via `course_audio` + an S3 segment manifest instead.

---

## 3. Does glued audio exist today? No.

Live DB, 2026-08-11:

| Probe | Result |
|---|---|
| `course_audio` by origin | `tts` 2,520,478 · `human` 42,038 |
| `course_audio where voice_id='spliced'` (phase8 cutter) | **0** |
| `recording_provenance where recorded_by='voice-engine'` (the glue's own ledger) | **0** |
| `recording_provenance` grouped by `method` | 274 rows, all `method` null or `discarded` — **no `spliced`** |

**The splicer has never registered a clip in production.** The code is real, has unit tests, and is
wired into `synthesis-job.cjs`; it has not run to a successful write.

### Correcting a claim in yesterday's scoping doc

`docs/autocue-scoping-2026-08-10/whole-phrase-record-option-scoping.md` §1.6 reads:

> Measured on the live DB for `cym_n_for_eng`: 4,997 practice phrases and 633 new LEGOs, against
> 19,853 human `course_audio` rows… Everything beyond those few hundred exists because chunks were
> cut out of slow-aligned takes and re-spliced.

The count is right; the inference is wrong. Breaking `cym_n_for_eng`'s human rows down by voice:

| voice_id | rows |
|---|---|
| `legacy_import` | 19,061 |
| `human` | 641 |
| `human_aran_cym_n` | 95 |
| `human_recording` | 74 |
| `human_aran_cym_n_2` | 42 |
| `Aran` | 1 |

19,061 of them are a **legacy import** (all stamped 2026-01-04), not splices. The multiplier the
optimiser is designed to deliver has not happened yet on any course.

---

## 4. The client: one clip per utterance, always. No sequences.

The learning app has no code that plays several clips as one phrase, and no fallback from a missing
whole-phrase clip to per-LEGO clips.

**The data shape forbids it.** `packages/core/src/script/playerTypes.ts:19-20` — a `Cycle` carries
three single strings, not arrays:

```ts
known:  { text: string; audioUrl: string }
target: { text: string; textNative?: string; voice1Url: string; voice2Url: string }
```

Built at `packages/core/src/script/generateScript.ts:649-655` from one audio id each
(`audioUrl(o.target1.id)`, `audioUrl(o.target2.id)`), where `audioUrl` defaults to
`` `/api/audio/${id}` `` (`generateScript.ts:676`).

**The player plays exactly one file per phase.** `packages/player-vue/src/playback/SimplePlayer.ts`
has three symmetrical branches — prompt (`:1151-1159`), voice1 (`:1168-1177`), voice2
(`:1184-1196`). Each does `resolveUrl(<single url>)` → `playAudio(url)`. When the url is missing:

```
console.warn(`[SimplePlayer] No voice1 audio for "…" → "…", skipping`)   // :1174
this.onAudioEnded()
```

It warns and skips. **There is no per-LEGO fallback anywhere.** Explicit gap: the "if the phrase has
no whole-phrase clip, play its LEGO clips back to back" behaviour does not exist in any form.

**No Web Audio joining either.** No buffer concatenation, no MediaSource splicing, no gapless queue
— `AudioCache` (`packages/player-vue/src/cache/AudioCache.ts`) hands back one blob url per id.

**And `decomposePhrase` is text, not audio.** `packages/player-vue/src/utils/decomposePhrase.ts:1-12`
is a fallback tile-renderer for on-screen LEGO blocks when the backend ships no `decomposition`
array. Its consumer is `LearningPlayer.vue:2589`. It never touches audio.

The API side matches: `api/courses/[code]/cycles.ts:76-79` selects
`known_audio_id / target1_audio_id / target2_audio_id / presentation_audio_id` — four nullable
scalar FKs per row. Nothing plural, no fallback logic.

---

## 5. So: supersede or shape change?

**Row-level supersede.** A volunteer's whole-phrase recording replaces a glued clip exactly the way
a re-render replaces a bad TTS clip. Nothing in the player changes, nothing chooses between shapes,
no new data model. That is the good news and it is solid.

The real problems are elsewhere, and Kai should have all four before he ships:

**(a) Nothing marks a clip as glued.** Both a glued clip and a volunteer's whole take are written by
the same function with `origin: 'human'` and the real speaker's `voice_id` (`db.cjs:146-166`). There
is no `method`, no `is_placeholder`, no flag. `recording_provenance` knows, but it has no FK and
nothing reads it for this. **Consequence: no query can list "which clips are still placeholders",
and no serve-time rule can prefer the real recording.** If glued audio ships as a beta placeholder,
this column is the thing to add first — it is what makes progressive replacement measurable.

**(b) `prefer-take-over-splice` is build-time only.** The rule at `splicer.cjs:11-13` is enforced by
`buildSplicePlan` excluding phrases that already have a whole take (`splicer.cjs:74-78`). It is a
*planning* filter inside one synthesis job. It does **not** run at serve time, and it does not
retroactively demote a splice when a real take arrives later.

**(c) A later recording may not overwrite — it may sit alongside.** The upsert key is
`(course_code, text_normalized, language, role, voice_id)` (`db.cjs:160`). Same voice, same text →
overwrite, clean. **Different `voice_id`** — a different volunteer than the one whose chunks were
glued — → a **second row**, and which one the learner hears is then decided by `link_all_audio_ids`,
which `db.cjs:171` describes plainly: *"The RPC itself still links arbitrarily (it's DDL,
untouchable); the pre-pass is what guarantees human-first."* The pre-pass prefers human over TTS. It
cannot prefer real-human over glued-human, because (a) — they look identical.

**(d) Gluing needs a slow-gapped human session first.** The splicer's inputs are chunks cut from
aligned takes (`align.cjs:212-213` *requires* a slow take and throws without it). There is **no
supported path that glues a phrase out of existing TTS LEGO clips into a `course_audio` row** —
`splice-legos.cjs` does that shape offline to local files and writes nothing. If Kai's beta plan
means "glue the TTS LEGO clips we already have", that tool does not exist. If it means "record a
few hundred phrases from a volunteer, cut and re-glue them into thousands", that is exactly what
`voice-engine` is for — and it has never yet completed a run.

---

## 6. Existing docs on this

- `docs/AUDIO_SPLICING_SPEC.md` — the 628-line design spec. Motivation is exactly Kai's:
  minority languages with no TTS, "record ~50 phrases → generate 500+ variations", and
  `:609` *"For minority language communities with one volunteer voice artist, this is the
  difference between possible and impossible."* Its §Architecture weighs runtime concat (Option B)
  against pre-built MP3s (Option A) and recommends the hybrid — **the built system took Option A
  for delivery**, which is why the client knows nothing about gluing.
- `docs/autocue-scoping-2026-08-10/whole-phrase-record-option-scoping.md` — yesterday's scoping of
  Kai's "stop making me read everything twice" request. Excellent on the recorder and the pruning
  trap in §1.7; its §1.6 volume claim is corrected in §3 above.
- **No doc anywhere uses "glued audio" as a term**, and no doc describes the beta-placeholder →
  progressive-replacement plan. Grep across both repos' `docs/` for `glued|concatenat|stitch|
  placeholder|volunteer` returns only unrelated hits (Marathi "glued tags" are a *phrasing* defect,
  not audio). **Explicit gap: the plan Kai is describing is not written down anywhere.**

---

## Explicit gaps

- **No per-LEGO playback fallback exists** in the learning app, in any form. Stated positively
  because it is the load-bearing negative result.
- **No "is glued" marker** on `course_audio`. §5(a).
- **No serve-time preference** for a real take over a splice. §5(b).
- **No TTS-LEGO → glued-phrase pipeline** that writes to the DB. §5(d).
- **Splicer never verified live.** All findings about what it *would* write are read from the code
  plus its unit tests; I could not observe a single glued row because none exists. I did not run a
  synthesis job (that would be a write).
- **Presentation clips** — the 2026-08-10 scoping already flagged that no voice-engine path mints
  `role='presentation'` audio; I did not re-trace it.
