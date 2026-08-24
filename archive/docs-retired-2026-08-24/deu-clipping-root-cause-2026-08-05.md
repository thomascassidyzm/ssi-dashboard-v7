# deu_for_eng clipping — the exact mechanism

**2026-08-05. Phase 2 (root cause) only. Read-only: no TTS, no re-renders, no DB writes, no deletions.**
Tom played the first 10 minutes of the live `deu_for_eng` course and reports words cut off.

---

## The mechanism, in one paragraph

One function removes audio in the German TTS pipeline: `repairTailDefect` in
`services/audio-processor.cjs:686`. It listens to the last 400 ms of every clip and, if the
envelope dips and then rises again, calls that a click and **deletes everything from that dip to
the end of the file**, replacing it with 100 ms of silence. On German that dip-then-rise shape is
not a click — it is a normal word ending (final consonant release, the clone voice's breath), so
the "click" it deletes is the last word. Two safety catches were supposed to stop this. One is a
whisper transcription check that holds the clip if the trim eats a word; on this Linux box
`whisper-cli` lives in `~/.local/bin`, which was not on the render process's PATH, so the check
returned "could not verify" and the code treats that as permission to proceed — the German repair
run of 2026-08-04 says so in its own log, and it cut 449 German clips that day. The other catch
only blocks a trim that throws away more than half the file, which losing a final word does not.
Nothing downstream caught it either: the veracity gate leaves no record — `veracity_checked_at`
is NULL on all 2,544,755 rows in `course_audio`, estate-wide — so "was this clip checked?" can
only be guessed from its age, and every one of the 384 clips in seeds 1–5 is older than the gate.
Production stopped doing this at **2026-08-05 15:40:03Z**, when the render service restarted with
`TAIL_REPAIR_MODE=flag`; everything Tom heard was made before that.

---

## 1. WHERE the audio is removed

### The path a `deu_for_eng` clip takes

| step | file:line | what it does to the samples |
|---|---|---|
| TTS render | `services/phases/phase8-audio-v13.cjs:2163, 2671, 4046, 4254, 4555, 4954, 5826` → `masterAudio(rawAudioBuffer, textForTTS)` | — |
| master | `phase8-audio-v13.cjs:996` `masterAudio` | — |
| loudness | `phase8-audio-v13.cjs:1006` → `audioProcessor.normalizeAudio` (`audio-processor.cjs:741`) — chain `PRE_COMPRESS, volume, TRUE_PEAK_LIMIT, ANTI_CLICK_FADE` (`audio-processor.cjs:298, 308, 309`) | **removes nothing.** 8 ms fade in + 8 ms fade out, no trim, no pad |
| **tail gate** | `phase8-audio-v13.cjs:1017` → `audioProcessor.repairTailDefect(masteredPath, tempDir, {text: ttsText, minKeepSec: 0.2})` (`audio-processor.cjs:686`) | **this is the only code in the TTS path that deletes audio** |
| the cut | `audio-processor.cjs:713-716` | `atrim=end=${cutAt},asetpts=PTS-STARTPTS, areverse,afade=t=in:st=0:d=0.008,areverse, apad=pad_dur=0.1` |
| ship | `phase8-audio-v13.cjs:1022` `fs.move(tail.outPath, masteredPath)` → S3 `mastered/<UUID>.mp3` | trimmed file becomes the object learners hear |

`cutAt` is `det.trimSec` from `detectTailClick` (`audio-processor.cjs:377`) — the **start of the
quiet gap before the supposed click**. Everything after it is discarded; `apad=pad_dur=0.1` puts
100 ms of silence back. There is no upper bound on how much is discarded other than the guards in §3.

### How much it removes — measured on the live clips

I ran the **production detector** (`ssi-dashboard-v7-clean-prod/services/audio-processor.cjs`,
`detectTailClick`) over all 384 clips currently linked into `deu_for_eng` seeds 1–5, downloaded
from S3. Read-only; `TAIL_REPAIR_MODE=flag`, nothing mutated.

```
clips probed: 384    detector FIRES on: 28  (7.3%)
by rule:  resurgence 14,  rise 14,  burst 0
speech it would remove:  min 78ms   median 314ms   p90 380ms   max 400ms
guard analysis (MIN_KEEP=0.5, minKeepSec=0.2):
   blocked by the 50% keep-fraction guard:  5
   hard-error on minKeepSec 0.2:            0
   WOULD SHIP A TRIM (whisper absent):     23     median 298ms removed, max 390ms
```

On the short LEGO clips that is most of the word:

| clip | role/voice | duration | would cut | keeps | rule |
|---|---|---:|---:|---:|---|
| `9ff686ed` "jetzt" | target2/leo | 720 ms | **400 ms** | 44% | resurgence −9.9 dB |
| `b638c679` "jetzt" | target1/ara | 720 ms | **376 ms** | 48% | resurgence −5.4 dB |
| `29aa1ea3` "Deutsch" | target2/leo | 672 ms | **370 ms** | 45% | resurgence −3.9 dB |
| `17994a74` "auf" | target2/leo | 600 ms | **326 ms** | 46% | rise −9.5 dB |
| `76ee0381` "Ich werde auf Deutsch sprechen" | target2/leo | 1728 ms | **380 ms** | 78% | rise −6.2 dB |
| `fc637823` "to practise speaking" | known/eve | 1392 ms | **390 ms** | 72% | resurgence −3.4 dB |
| `bf16a08e` "I want to practise with you" | known/eve | 1464 ms | **342 ms** | 77% | resurgence −1.9 dB |

380 ms off the end of *"Ich werde auf Deutsch sprechen"* is the word **sprechen**.

### Direct evidence it actually happened, not just could

`/tmp/deu-repair-run.log` — `tools/repair-silent-clips.cjs deu_for_eng --only all`, 1,107 clips,
2026-08-04 (file mtime `2026-08-04 13:30:24`):

```
masterAudio "repaired in N pass(es)"  (audio deleted):   449
masterAudio "shipped untouched"       (held):            282
new clips minted by the run:                           1,082
trim points:  min 0.28s   median 0.61s   max 2.074s
```

**449 German clips were trimmed by this mechanism in a single run on 2026-08-04.** 20 of the 1,082
clips that run minted are linked into seeds 1–5 today (target2 ×10, target1 ×5, known ×5) — e.g.
`29aa1ea3` "Deutsch", `9ff686ed` "jetzt", `17994a74` "auf", `103d8c4f` "ich will mit dir sprechen".

Similar runs the same day: `fra-bulk-repair2.log` 198 repaired, `revoice-run2.log` 175,
`fra-bulk-repair-run1.log` 99, `revoice-full.log` 38.

### Trigger conditions

`detectTailClick` in `'phrase'` mode (anything without `[pause]`/`…`, `audio-processor.cjs:373`)
runs three rules over the last 400 ms, all relative to the clip's own peak:
- **burst** — short isolated run above −20 dB after a ≥20 ms gap;
- **resurgence** — envelope drops below −34 dB for ≥20 ms, then anything above −26 dB;
- **rise** — after the last window above −12 dB, a ≥8 dB climb off the running minimum that stays below −9 dB.

`resurgence` and `rise` account for **28/28** of the German fires. Both describe "quiet, then
sound again" — which is exactly a German word-final plosive release or the xAI clone's breath at
the end of an utterance. The rules were calibrated on Italian clone-voice exhale bursts
(`docs/audio-sweeps/tail-click-v2-sweep-2026-07-24.md`); nothing in them is German-aware.

---

## 2. Start-of-clip vs end-of-clip — NOT two mechanisms

**There is no leading trim in the TTS path.** The only silence-removal-at-the-start code in the
repo is `audio-processor.cjs:1087-1090`:

```
silenceremove=start_periods=1:start_threshold=-40dB:start_duration=0.1, areverse,
silenceremove=..., areverse
```

inside `processRecordingBuffer`. Its **only caller** is `services/production-api.cjs:4440`,
`POST /api/production/:courseCode/recording/upload` — the human RecordRoom take path. No TTS clip
reaches it. `ANTI_CLICK_FADE` (`audio-processor.cjs:298`) applies an 8 ms fade-in and 8 ms
fade-out; a fade attenuates, it does not delete.

Measured on all 384 seed 1–5 clips (10 ms→1 ms frame RMS, −35 dB relative to each clip's own peak):

| | min | p5 | median | max |
|---|---:|---:|---:|---:|
| leading room (file start → first speech) | **47 ms** | 49 ms | 116 ms | 189 ms |
| trailing room (last speech → file end) | 20 ms | 82 ms | 105 ms | 289 ms |

Clips with leading room < 30 ms: **0**. Clips with leading room < 10 ms: **0**. No German clip in
the learner's first five seeds begins mid-signal.

**So: end-of-clip is the mechanism; start-of-clip is not a second mechanism in the audio files.**
If Tom hears something wrong at the *start*, the remaining candidates are (a) an 8 ms fade across a
word-initial plosive, or (b) player-side playback. **EXPLICIT GAP:** I checked the learning-app
player only by targeted grep (`ssi-learning-app/packages/core/src`, `apps/player-vue/src` for
`word_boundaries`, `currentTime`, `fadeOut`, sub-range playback) and found no evidence of range
playback or trimming — that is a grep, not an audit of the player's scheduling.

### A fingerprint from the earlier probe that does NOT replicate

`docs/amputation-tts-probe-2026-08-04.md` uses "trailing room == 100 ms" as the signature of
`apad=pad_dur=0.1`. On this population it does not discriminate: trailing room is a smooth cluster
centred at 103–105 ms (top exact values 104 ms ×43, 103 ms ×41, 105 ms ×29) and **262 of 384 clips
have a digitally-silent tail (final-50 ms RMS < −85 dBFS) regardless**, as do 337 of 384 at the
head. ~100 ms of near-silent room at both ends is simply how these renders come out. Do not use
the 100 ms tail as a per-clip damage test on this course.

---

## 3. WHY unchecked audio reached production — the escape route

Four independent failures, in the order they let a clip through.

### (a) The whisper amputation guard was inert — proven, not inferred

`verifyTrimKeepsText` (`audio-processor.cjs:568`) returns **`null`** when whisper cannot be
resolved (`:569` guard, `:604` catch). `repairTailDefect:697-698` reads it as

```js
const v0 = await verifyTrimKeepsText(inputPath, det.trimSec, text, language);
if (v0 && !v0.ok) return { defect: det, action: 'held', verify: v0 };
```

`null` is falsy — **absent whisper means proceed with the cut.**

Before `d5ad9f2c` (2026-08-05T01:24:59Z) `WHISPER_BIN` resolved to `/opt/homebrew/bin/whisper-cli`
(a macOS path) or the bare command `whisper-cli`, looked up with `command -v`. On watson-1
`whisper-cli` is at `~/.local/bin/whisper-cli`, and that directory was **not** on the PATH the
render process inherited.

**Proof 1 — the run's own log.** `/tmp/deu-repair-run.log`, in the same run that logged the 449 repairs:

```
[TTS] xAI phonology gate unavailable (whisper-cli or model missing) — non-English xAI renders unchecked for language drift
```

**Proof 2 — A/B on the pre-fix code, same clip, same trim point:**

```
PRE-FIX code (d5ad9f2c^), PATH WITHOUT ~/.local/bin -> verifyTrimKeepsText: null
PRE-FIX code (d5ad9f2c^), PATH WITH    ~/.local/bin -> verifyTrimKeepsText: {ok: false}
```

`ok: false` means *the guard would have held that clip*. The only difference is one directory on PATH.

### (b) The model-free guard is too loose to catch a lost final word

`AMPUTATION_MIN_KEEP_FRACTION = 0.5` (`audio-processor.cjs:661`, landed `f8c380bd`
2026-08-04T11:50:02Z — after most of these clips existed) blocks a trim only if it keeps **less
than half** the file. Losing the last word of a five-word phrase keeps ~78%. In the live census it
blocked 5 of 28 fires and let 23 through.

### (c) The veracity gate leaves no record — so "checked" is inferred from age

```
course_audio, estate-wide:   2,544,755 rows   veracity_checked_at NOT NULL: 0
deu_for_eng:                    47,266 rows   measured: 0
deu_for_eng seeds 1-5:             384 rows   measured: 0
```

Nothing in `services/` or `tools/` writes `veracity_checked_at`, `veracity_pass` or
`veracity_checker` (grep across the repo: zero writers). `services/audio-veracity.cjs` is a
**pre-publish, in-process** gate — `veracity.renderChecked(...)` at `phase8-audio-v13.cjs:2180,
2678, 4959` blocks a bad render before the write and counts it in a run summary, then the counters
die with the process. There is no per-clip durable verdict anywhere. That is exactly ledger
`003157ac-d73a-484d-b7c3-40e9cc774966`'s 1,413 clips whose status was inferred from age: age is
the only signal that exists.

### (d) The first five seeds are pre-gate, and were never measured

`deu_for_eng` seeds 1–5, every `course_audio` row reachable from `course_seeds`/`course_legos`/
`course_practice_phrases` (474 slot references → 404 distinct ids → **384 rows found**):

| | count |
|---|---:|
| pre-gate (`created_at` < 2026-08-04T23:00Z) — **never measured, status inferred from age** | **367** |
| gate-era (≥ 2026-08-04T23:00Z) | 17 |
| created before the `TAIL_REPAIR_MODE=flag` deploy (2026-08-05T15:40:03Z) | **384 (all of them)** |
| ever measured (`veracity_checked_at`) | **0** |

By creation day: 2026-01-17 ×55, 01-29 ×28, 02-02 ×2, 02-15 ×10, 02-16 ×62, 02-24 ×141,
03-10 ×2, 03-12 ×23, 04-01 ×6, 04-16 ×6, 08-03 ×2, 08-04 ×30, 08-05 ×17.
By role×voice: known/eve 121, target1/ara 122, target2/leo 122, presentation/eve 19.

**Answer to the question as asked: yes.** 367 of 384 first-five-seed clips are pre-gate; all 384
were created before the fix was live; none has ever been measured by a real gate.

Whole course for context: 47,266 clips — 47,075 pre-gate, 191 gate-era, 0 measured.

### (e) Also found: 20 dangling links

20 `course_practice_phrases.presentation_audio_id` values in seeds 1–5 point at a `course_audio`
row that does not exist. Those slots are silent, not clipped. Reported, not touched.

---

## 4. Is undeployed work implicated? — No, and the working tree is BEHIND, not ahead

- **Production runs from a different checkout**: `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod`,
  branch `main` @ `04ef27d3`, working tree clean. Live PIDs 1104576 (`production-api.cjs`) and
  1104585 (`phase8-audio-v13.cjs`), both started **2026-08-05T15:40:03Z**, both with
  `TAIL_REPAIR_MODE=flag` and `PATH=/home/tomcassidy/.local/bin:...` in their environment.
- **The prod code already has the fix**: `ssi-dashboard-v7-clean-prod/services/audio-processor.cjs:689`
  `const TAIL_REPAIR_MODE = process.env.TAIL_REPAIR_MODE || 'flag'` (`4c5bbf90`, 2026-08-05T02:04:39Z),
  plus the `~/.local/bin` PATH pin and `LAME_BIN` (`d5ad9f2c`, 2026-08-05T01:24:59Z).
- **The uncommitted working tree on `fix/audio-finish-the-job-2026-08-05` is an earlier draft of the
  same fix, superseded.** Its `audio-processor.cjs` still reads `|| 'repair'` (line 684). Its
  `production-api.cjs` changes (missing-vs-unlinked counts, refusing unprocessed recording uploads,
  `maxSeed`/`role` on the recording script) are dashboard and RecordRoom changes — **none of them
  touches the clipping path.** So: no, undeployed work is not implicated; committing this tree as-is
  would *regress* the default back to `repair`.
- **EXPLICIT GAP:** I cannot establish retroactively when `TAIL_REPAIR_MODE=flag` first took effect
  on a *running* render process. `phase8-audio-v13.cjs` is not under pm2 (only `orchestrator` and
  `production-api` are), its log carries no mode banner before the 15:40:03Z restart, and the prod
  checkout's `audio-processor.cjs` mtime (2026-08-05T02:06:24Z) only says when the file landed, not
  when a process picked it up. The safe reading: renders before 2026-08-05T15:40:03Z are suspect.

---

## 5. Method, tools, and what this does not cover

- DB: `pg` against `.env.psql` (`scripts/deu-clip-rootcause-q2.cjs`, `-q3.cjs`).
- Physical: every seed 1–5 object fetched from `ssi-audio-stage`, decoded to s16le 48k mono,
  10 ms and 1 ms frame RMS, speech threshold −35 dB relative to each clip's own peak
  (`scripts/deu-clip-rootcause/measure.cjs`, `fine.cjs`). 384/384 decoded, 0 errors, 0 silent.
- Detector census: the production module itself (`scripts/deu-clip-rootcause/detect.cjs`).
- Guard A/B: `git show d5ad9f2c^:services/audio-processor.cjs` run under two PATHs.
- All artefacts under `scripts/deu-clip-rootcause/` (gitignored, local to watson-1).

**Not covered:**
1. **Mispronunciation and wrong-word** — outside every instrument used here, and
   `services/audio-veracity.cjs` says so about itself (validated on silence and truncation only).
2. **Whether each of the 449 logged repairs is audibly bad.** The log proves the cut happened and
   how deep; it does not prove every one removed a word.
3. **Per-clip attribution for clips created before 2026-07-23** (when `repairTailDefect` first
   existed): 337 of the 384 seed 1–5 clips predate it, and `tools/declick-tail.cjs` mints a **new
   id and new `created_at`** on repair (`declick-tail.cjs:126-131`), so an old `created_at` is
   reasonable evidence a clip was never repaired — but S3 `LastModified` was not captured for these
   objects (they were already cached locally when I added the header capture), so I could not
   cross-check object write times. Gap, stated.
4. **Player-side playback** — targeted grep only, see §2.
5. **A whisper word-retention sweep over all 384 shipped clips** was started and is still running at
   time of writing; it is sharing this box with a live render and is not included here. The
   mechanism above rests on the code path, the detector census and the run logs, none of which
   depend on it.
