# A-93 part 2 — splitting Kai's three long Autocue takes (2026-08-07)

On 2026-08-07 three Autocue uploads arrived as single long blobs instead of
per-phrase takes. Part 1 (the VAD fix) is landing separately. This is the
recovery of the audio that was already captured.

**Result: 20 takes recovered and attached — a complete set for both courses.
The third blob is deliberately left unattached as superseded. Nothing was
deleted; the three original blobs stay in S3 untouched.**

---

## 1. What actually happened in the session

Not "one long read that needs cutting into many phrases". The truth is more
specific, and it is what makes the split safe.

Nine separate recording sessions ran that day, each with its own
`scriptSessionId`, and **each produced exactly one upload**. The recording
script for both courses is exactly **10 items — 5 phrases, each read twice
(natural then slow)**.

The blobs' S3 metadata says where the studio was when the blob was finally
flushed:

| blob | course | phraseIndex | cadence | duration |
|---|---|---|---|---|
| `2A1472AC` | deu_at_for_eng | 4 | slow | 72 465 ms |
| `E79EFD14` | deu_at_for_eng | 4 | slow | 53 615 ms |
| `5014B196` | fin_for_eng | 4 | slow | 57 121 ms |

`phraseIndex 4 / slow` is **the last item of a 10-item script**. So each long
blob is one complete pass through the whole script: items 0…9, start to finish.

Why the studio still advanced with the VAD stuck: `advanceToNext()` is called
only on segment capture (`AutocueStudio.vue:371`), but `navigatePhrase()` is
wired to next/prev buttons and arrow keys (`AutocueStudio.vue:165-166, 431-435`).
Kai advanced the prompts by hand while the recorder sat on "Speaking…". The
blob flushed once, at `stopFlow()`, when he ended the session.

The five short takes from the same day are all `phraseIndex 0 / natural` — the
first item of their own session, captured before the VAD wedged.

## 2. How the split was done

Using the canonical engine in `services/audio-intelligence/` — `decode.cjs`,
`envelope.cjs`, `tiers/vad.cjs`. No hand-rolled heuristic.

Note: `tiers/speech-span.cjs` named in the brief does not exist; the tiers are
`duration.cjs`, `energy.cjs`, `vad.cjs`. `vad.analyse()` returns the `segments`
array, which is the splitting primitive.

Method:
1. VAD at a 300 ms bridge → atomic voiced runs.
2. Sub-350 ms blips ignored when *choosing* boundaries (clicks, breaths), then
   re-absorbed into a take so no speech onset is lost.
3. **The count is known to be 10**, so take the 9 largest inter-run gaps as the
   boundaries and cut at each gap's midpoint. Count-anchored, not
   threshold-guessed.

The boundaries are not marginal:

| blob | smallest gap kept as a boundary | largest gap rejected |
|---|---|---|
| `E79EFD14` | 1.66 s | 0.67 s |
| `5014B196` | 1.43 s | 0.91 s |

### Cross-checks (three, all independent)

- **Order and content.** Whisper (medium) transcription of each blob follows the
  generated script's phrase order exactly. Austrian dialect prompts come back as
  standard German (`i wü iatz wos auf Deitsch sogn` → "Ich will jetzt etwas auf
  Deutsch sagen") — semantically exact.
- **Natural/slow shape.** In all 10 pairs the slow read is longer than its
  natural twin, as it must be.
- **Chunk counts.** `chunksString` predicts how many voiced runs a slow read
  should break into. Finnish matches exactly: p0 4/4, p1 4/4, p2 3/3, p3 5/5,
  p4 2/2. This is the strongest confirmation — it was not used to build the
  grouping.

### On the brief's "14 segments" anchor

The brief expected ~14 segments for `2A1472AC` at 800 ms. The canonical VAD
gives **10** at 800 ms. Both readings are right about the audio and the
difference is explainable: `ffmpeg silencedetect` uses a fixed −40 dB gate and
finds 23 silences (→ 24 utterances), while the VAD's gate is *adaptive* —
noise floor −66.6 dB + 12 dB margin = −54.6 dB — so it hears breaths and lip
noise as voiced and bridges more. Neither count is the take count. The take
count is 10 because the script has 10 items, and that is what the split is
anchored to.

## 3. What was attached

20 takes, via the real upload path — `POST /api/production/:courseCode/recording/upload`
in script mode (`services/production-api.cjs:4394`), exactly as the studio posts
a normal single take. The server mints the uuid, masters the audio, PUTs
`mastered/{uuid}.mp3`, and writes the `recording_provenance` row.

**How a script-mode take is "attached".** It is not linked to a phrase row.
Script mode deliberately writes no `course_audio` row at upload time (only
regeneration and pod mode do). A script-mode take is *input to the voice-engine
aligner*: `recording_provenance` → `services/voice-engine/provenance-adapter.cjs`
→ `align.cjs`/`splicer.cjs` → per-LEGO clips. Its `chunks_string` pause map is
the aligner's required input, so every recovered take carries the correct one
from the script.

### deu_at_for_eng — from `E79EFD14` (10 takes)

| item | phrase | cadence | window | text |
|---|---|---|---|---|
| 0 | 0 | natural | 0.00–5.18 | i wü iatz wos auf Deitsch sogn |
| 1 | 0 | slow | 5.72–12.14 | i wü iatz wos auf Deitsch sogn |
| 2 | 1 | natural | 12.26–16.00 | i wer mit wem aundern reden übn |
| 3 | 1 | slow | 16.46–22.75 | i wer mit wem aundern reden übn |
| 4 | 2 | natural | 23.48–26.13 | i versuch zum lernen, wia ma redt |
| 5 | 2 | slow | 26.51–32.01 | i versuch zum lernen, wia ma redt |
| 6 | 3 | natural | 32.53–35.65 | i wü mit dir lernen, wia ma wos sogt |
| 7 | 3 | slow | 36.21–43.37 | i wü mit dir lernen, wia ma wos sogt |
| 8 | 4 | natural | 43.98–48.34 | wia ma so oft wia möglich redt |
| 9 | 4 | slow | 48.69–53.61 | wia ma so oft wia möglich redt |

### fin_for_eng — from `5014B196` (10 takes)

| item | phrase | cadence | window | text |
|---|---|---|---|---|
| 0 | 0 | natural | 0.00–3.41 | mä haluun puhua suomea niin usein kuin mahdollista |
| 1 | 0 | slow | 7.74–14.86 | mä haluun puhua suomea niin usein kuin mahdollista |
| 2 | 1 | natural | 16.16–19.16 | miten sanoa jotain suomeksi |
| 3 | 1 | slow | 20.03–25.50 | miten sanoa jotain suomeksi |
| 4 | 2 | natural | 26.02–29.71 | Mä aion harjoitella puhumista jonkun muun kanssa |
| 5 | 2 | slow | 30.35–36.55 | Mä aion harjoitella puhumista jonkun muun kanssa |
| 6 | 3 | natural | 37.39–40.63 | mä yritän puhua suomea sun kanssa nyt |
| 7 | 3 | slow | 41.35–47.88 | mä yritän puhua suomea sun kanssa nyt |
| 8 | 4 | natural | 49.20–51.05 | Mä yritän oppia |
| 9 | 4 | slow | 51.91–57.12 | Mä yritän oppia |

## 4. Explicit gaps — what was NOT attached

### `2A1472AC` — all 72 seconds left unattached, on purpose

It covers the *same five deu_at_for_eng phrases* as `E79EFD14`, recorded two
minutes earlier, and it is a messy read. It contains, beyond the script:

- "Oh, next." at ~7.0–7.9 s — Kai talking to the studio, not a take.
- 8.7–13.5 s — ~4.8 s of voiced audio Whisper will not caption at all.
- 49.5–53.6 s — "Du hast schon den Rekord, ja? Keine Worte." — off-script
  conversation in the room.
- 55.5–59.1 s — a false start ("Ich will mit dir lernen.") before the retake.

Seven of its ten items could probably be cut cleanly. But `E79EFD14` is a clean,
complete, later read of the identical five phrases, so cutting `2A1472AC` buys
nothing and risks attaching chatter or a false start as a take. **Superseded,
left whole.** If the deu_at audio is ever judged unusable, this blob is still
there and this section is the map for cutting it.

### Not verified

- **Whether the 2026-08-07 gap-only script equals today's.** The expected list
  was regenerated today. It is very likely identical — `gapOnly=true` and
  `gapOnly=false` currently return the same 5 phrases, and
  "already coverable by existing human recordings: 0/17" means nothing recorded
  so far has narrowed it. But the script was not captured on the day, so this is
  inference from a stable input, not a recording of what Kai saw.
- **Double loudness normalisation.** The source blobs were already mastered to
  −16 LUFS on upload; re-uploading the cut segments masters them again. It is
  the same target so it is near-idempotent, and it is what the real path does to
  any take — but it is a second pass, not zero.

## 5. One thing worth your eye (pre-existing, not caused by this recovery)

Every `deu_at_for_eng` take from that day — the five short ones, the three blobs,
and now the ten recovered ones — is stamped `voice_id = de-AT-IngridNeural`.
That is an **Azure TTS voice**. The upload path resolves `voice_id` server-side
from `voice_config.voices.target1`, and that slot still holds a TTS voice because
no human voice has been assigned to it yet. So Kai's human recordings are being
filed under a synthetic voice id.

`fin_for_eng` is fine — its takes resolve to `ara`.

This predates the recovery (`76AD1FE6`, recorded before any of the long blobs,
has the same stamp), so nothing here made it worse. But assigning a human voice
to `deu_at_for_eng` target1 is probably wanted before this audio is spliced.

## 6. Logs

- `docs/audio-repair-2026-08-07/a93-take-split-dryrun-log.json`
- `docs/audio-repair-2026-08-07/a93-take-split-applied-log.json`

Both carry, per take: source blob, cut window, voiced-run count, phrase
identity, `chunksString`, and the new server-minted uuid and S3 key.
