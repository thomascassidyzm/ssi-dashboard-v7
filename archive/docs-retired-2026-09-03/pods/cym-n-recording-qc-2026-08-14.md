# Aran's Welsh north recordings — technical QC, 2026-08-14

Read-only pass. Every number below was measured from the actual bytes fetched from S3, not read
from `course_audio` metadata. Nothing was written to any course or pod table; no TTS, no
regeneration, no re-linking, no deletion.

**Listening page (tap to play, works on a phone):**
https://watson-1.tail4968cb.ts.net/evidence/cym-n-aran-recordings-2026-08-14/index.html

---

## Headline

1. **The 2026-08-10 batch has NOT caught the 834-byte fate.** All 61 of Aran's newest Welsh takes
   decode, carry real audio, and sit inside a tight and consistent level band. That is the good news
   the question was asking for.
2. **All 111 of his Welsh takes are technically clean** — every one decodes, none is silent, none
   has a dead tail, and the levels are more consistent than most TTS output on this estate.
3. **The 26 dead files are exactly the same 26 English clips as on 2026-08-11 — no more, no fewer.**
   All still exactly 834 bytes, all still undecodable, 23 still attached to live pod lines. The
   defect has not spread and has not been repaired.
4. **Nothing has been recorded since 2026-08-10 17:01 UTC.** The estate is unchanged from the
   2026-08-11 investigation: 137 clips, same voices, same dates, same counts.
5. **Three clips out of 111 are worth your ear specifically** — two peak at full scale, one is a
   0.3 s take. All three are on the listening page, unlabelled, in scene order.

---

## 1. What is there, from the live database

137 clips at `voice_id LIKE 'human_aran%'` on `cym_n_for_eng`, 132 attached to
`cym_n_for_eng:pod-0-unrecorded`, 5 orphaned.

| Voice | Role | Date | Clips | Attached |
|---|---|---|---|---|
| `human_aran_cym_n` | known (English) | 2026-06-15 | 26 | 23 |
| `human_aran_cym_n` | target1 (Welsh) | 2026-06-15 | 4 | 4 |
| `human_aran_cym_n` | target1 (Welsh) | 2026-06-16 | 4 | 4 |
| `human_aran_cym_n` | target1 (Welsh) | **2026-08-10** | **61** | 61 |
| `human_aran_cym_n_2` | target1 (Welsh) | 2026-06-15 | 24 | 22 |
| `human_aran_cym_n_2` | target1 (Welsh) | 2026-06-16 | 18 | 18 |

**Welsh: 111. English: 26.**

**Delta since 2026-08-11: none.** Max `created_at` on any human cym clip is
`2026-08-10 17:01:41 UTC`. Aran has not recorded anything in the three days since that
investigation, so this is a QC pass on the same estate, not on new work.

One correction to the 2026-08-11 doc's arithmetic, which counted only clips reachable through
`target_audio_id`/`known_audio_id`: the 22 clips dated 2026-06-16 reach their pod lines through
`sentence_audio_ids` (11 chunked lines), so the Welsh total is **111 attached-or-orphan clips, not
87**. Same underlying files, wider net.

**Widened once, as asked.** There is no non-pod human Welsh north audio: every
`human_aran_*` clip has `lego_id IS NULL` and none is attached to a lego or practice phrase.
The only other `origin='human'` Welsh rows are 74 legacy `voice_id='human_recording'`
English instruction/encouragement narration imported 2026-01-04 with `mastered/` S3 keys —
old SSi app narration, not Aran's Welsh pod work, and out of scope here.

## 2. Technical results — all 137 clips

Fetched from `ssi-audio-stage`, measured with ffprobe and ffmpeg (`astats`, `volumedetect`,
`silencedetect`). No whisper: the question was audio quality, not textual accuracy.

**111 of 137 decode. 26 do not. Every one of the 26 is an English known-side clip.**

### 2.1 The Welsh takes — clean

| Cohort | n | Peak dBFS (median) | RMS dBFS (median) | Duration | Format |
|---|---|---|---|---|---|
| `human_aran_cym_n` 2026-06-15 | 4 | −1.5 | −16.7 | 0.6–5.1 s | 44.1 kHz mono 128 kbps |
| `human_aran_cym_n` 2026-06-16 | 4 | −1.8 | −18.6 | 0.6–4.5 s | 44.1 kHz mono 192 kbps |
| **`human_aran_cym_n` 2026-08-10** | **61** | **−1.5** | **−16.2** | **0.3–12.4 s** | **44.1 kHz mono 128 kbps** |
| `human_aran_cym_n_2` 2026-06-15 | 24 | −1.6 | −18.3 | 0.8–10.2 s | mixed, see below |
| `human_aran_cym_n_2` 2026-06-16 | 18 | −3.0 | −18.5 | 0.5–2.5 s | mixed, see below |

- **Levels are consistent.** RMS across all 111 sits between −22.6 and −12.5 dBFS; peaks cluster
  around −1.5 dBFS. Nothing is too quiet to use.
- **No clip is silent, and no clip has a dead tail.** Maximum trailing silence anywhere is 217 ms;
  maximum leading silence 379 ms. Not one clip exceeds 500 ms at either end. This is the check that
  would have caught tail-silencing damage that a duration census reports as clean — it is negative.
- **Measured duration agrees with `course_audio.duration_ms` on every clip that has one.** 22 clips
  (the 2026-06-16 chunked takes) have `file_size_bytes IS NULL` in the DB — a bookkeeping gap only;
  the bytes are there and correct.

### 2.2 Two capture paths on `human_aran_cym_n_2`

15 of the 42 `_cym_n_2` clips are **48 kHz** (8 at 96 kbps, 7 at 192 kbps); the other 27 are
44.1 kHz like everything else. That split is a different device or capture chain in the June
sessions. It is not a defect on its own — but both of the full-scale-peak clips below are in the
48 kHz/96 kbps group, which is what makes it worth naming. The 2026-08-10 batch is uniform
44.1 kHz mono 128 kbps throughout, i.e. one settled path.

### 2.3 The three clips worth your ear

| Clip | Line | What the numbers say |
|---|---|---|
| `fb18a170` SC07-S007, Customer 2, 2026-06-15 | *Ga i ddau goffi gwyn a dau goffi du ac un o'r rheina, os gwelwch yn dda?* | Peak **+1.35 dBFS**, 259 samples at full scale — over the ceiling |
| `9db45f84` SC07-S009, Customer 2, 2026-06-15 | *Ydw, ga i wydraid o ddŵr hefyd, os gwelwch yn dda.* | Peak **0.04 dBFS**, 286 samples at full scale |
| `2d713b15` SC13-S006, Tourist, 2026-08-10 | *A wedyn?* | 323 ms — the shortest take in the estate |

The first two are genuine clipping and both are attached to live pod lines. Whether the distortion
is audible is exactly the call your ear should make — they are on the listening page in scene order,
unlabelled. The 0.3 s take is a two-word line, so short is probably just short; it is there because
it is the only clip anywhere near the `MIN_TAKE_MS = 100` floor and you should hear that it is real.

**The other 108 Welsh clips carry no technical flag of any kind.**

### 2.4 The 26 dead English files — unchanged, unrepaired

Every `role='known'` clip is exactly **834 bytes**, ffprobe: *"Invalid data found when processing
input"* — a bare MP3 header with no audio frames. **23 are attached to live pod lines.** Same 26
files, same size, same failure as 2026-08-11: this is the 2026-08-06 trim-filter bug
(`silenceremove` at −40 dB eating a silent take, ffmpeg exiting 0, lame writing a header). The
guard at `services/production-api.cjs:4552-4572` (`MIN_TAKE_MS = 100`, 422 before the S3 PUT) would
refuse these today, but it cannot retroactively fix what is already stored.

Full ids in `cym-n-recording-qc-2026-08-14-levels.json` alongside this document.

**No Welsh clip is anywhere near 834 bytes** — the smallest is 6,268 bytes and it decodes.

## 3. My honest read

The Welsh recordings look sound, and the newest session looks like the best one. The 2026-08-10
batch is 61 for 61 clean, uniform in format, and tight in level — one settled mic and room, one
consistent performance. If your ear agrees with the numbers, that batch can stand as-is.

The June sessions are more mixed: two capture paths, a wider level spread, and the only two clipped
clips in the estate, both in the same 48 kHz/96 kbps scene-7 group. That is a session problem, not
an Aran problem, and it is two clips.

The one thing the numbers cannot tell you is whether the takes are *good* — pace, warmth, whether he
sounds like he means it. That is your ear, and that is what the page is for.

## 4. What I did not check, and why

- **Textual accuracy.** No whisper run: the question was audio quality, and word-level whisper QC is
  a known cohort problem on this estate. If a clip on the page sounds like the wrong line, that is a
  follow-up worth running deliberately, scoped to the clips you name.
- **The 145 still-unrecorded lines.** Out of scope; this pass judges what exists.
- **cym_s (Southern Welsh).** Still 0 audio, 104 drafts. Out of scope — you said north.
- **Whether the 834-byte clips were ever good.** No S3 version history check; unchanged gap from
  2026-08-11.

## 5. Reproducing this

- `tools/audio-levels-check.cjs <manifest.json> <outdir>` — the sweep. Fetches from S3 and measures
  decodability, duration, peak/RMS dBFS, clipped samples, lead/tail silence, and format. Reusable on
  any clip set; committed for the next recorder QC.
- `docs/pods/cym-n-recording-qc-2026-08-14-levels.json` — all 137 clips with both the DB's claimed
  metadata and the measured truth, per clip.
