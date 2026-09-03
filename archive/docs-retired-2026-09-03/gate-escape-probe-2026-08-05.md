# Gate escape probe — 2026-08-05

**Question:** is any clip rendered *under* the veracity gate (`services/audio-veracity.cjs`) actually bad? Read-only investigation — no TTS, no re-renders, no DB writes, no deletions.

**Method:** `tools/physical-tail-probe.cjs` (commit `cf7bb21d`) — fetches the real S3 object, decodes with ffprobe/ffmpeg, compares RMS over the final 50ms against whole-clip RMS. `tailRatioDb >= -6` = `ABRUPT_CUT` (tail energy hasn't decayed — the file stops mid-signal). This is a **tail-shape test only** — see Blind spots below.

I ran a **full census** of every gate-era row in both courses (not a sample — every single one), plus a stratified pre-gate control matched by role+voice_id, at 2× the gate-era bucket size (min 20, cap 60 per bucket). "Gate era" = `course_audio.created_at >= 2026-08-04T23:00:00Z`.

I hit the fan-out depth ceiling dispatching workers for this (already at depth 1), so I ran all five probe passes myself, sequentially, in this session — not sampled down for it, the full population still got covered.

## Headline result

**One candidate gate escape bucket found: `target2` / voice `xai_leo` in `fra_for_eng`, 2 clips out of 668, both abrupt tail cuts. Nothing else in the gate era, in either course, in any other role/voice, failed the probe.**

## Failure rates — gate era vs pre-gate control

| Set | Course | Probed | ABRUPT_CUT | Rate |
|---|---|---:|---:|---:|
| Gate era (full census) | fra_for_eng | 1,222 | 2 | 0.16% |
| Gate era (full census) | deu_for_eng | 191 | 0 | 0% |
| **Gate era total** | | **1,413** | **2** | **0.14%** |
| Pre-gate control (stratified, matched role+voice) | fra_for_eng | 220 | 0 | 0% |
| Pre-gate control (stratified, matched role+voice) | deu_for_eng | 180 | 0 | 0% |
| **Pre-gate control total** | | **400** | **0** | **0%** |

Zero probe failures to decode/fetch across all 1,813 clips — every S3 object resolved and decoded cleanly.

## Gate-era breakdown by role × voice (full census)

| Course | Role | Voice | n | ABRUPT_CUT |
|---|---|---|---:|---:|
| fra_for_eng | bookend_listen_intro | eve | 1 | 0 |
| fra_for_eng | bookend_listen_outro | eve | 1 | 0 |
| fra_for_eng | known | eve | 141 | 0 |
| fra_for_eng | known | xai_eve | 400 | 0 |
| fra_for_eng | presentation | eve | 5 | 0 |
| fra_for_eng | target1 | eve | 2 | 0 |
| fra_for_eng | target1 | xai_eve | 4 | 0 |
| fra_for_eng | **target2** | **xai_leo** | **668** | **2** |
| deu_for_eng | known | eve | 68 | 0 |
| deu_for_eng | target1 | ara | 40 | 0 |
| deu_for_eng | target2 | leo | 83 | 0 |

No pre-gate control clip was matchable for `bookend_listen_intro`/`bookend_listen_outro`/`presentation` at voice `eve` in fra (that voice/role combo doesn't exist pre-gate — `presentation` pre-gate is voiced `xai_eve`, not `eve`) — those 7 gate-era rows have no direct control comparison; noted as a gap, not papered over.

## The 2 gate-era failures — full detail, listen files attached

Both are French `target2` (leo voice), both fresh, both mp3s downloaded locally so you can listen directly rather than trusting a number.

### 1. `7c0decf5-c867-4e13-8b5c-d5a29e30ee68`
- Course: `fra_for_eng`, role `target2`, voice `xai_leo`
- Text: **"ils veulent être prêts"**
- Created: `2026-08-05T04:46:59.354Z` (gate era)
- S3 key: `mastered/7C0DECF5-C867-4E13-8B5C-D5A29E30EE68.mp3`
- URL: https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/7C0DECF5-C867-4E13-8B5C-D5A29E30EE68.mp3
- Local file (downloaded this session): `scripts/gate-escape-probe-2026-08-05/listen/7c0decf5-ils-veulent-etre-prets.mp3`
- Probe: duration 1.200s, bodyDb -15.61, tailDb -21.57, **tailRatioDb -5.97dB** (threshold is -6dB — this clip is 0.03dB inside the cut zone, effectively right on the line)

### 2. `cb1f2166-5f52-4dda-be1c-3a3036cd9eff`
- Course: `fra_for_eng`, role `target2`, voice `xai_leo`
- Text: **"l'église est laide maintenant"**
- Created: `2026-08-05T05:49:56.870Z` (gate era)
- S3 key: `mastered/CB1F2166-5F52-4DDA-BE1C-3A3036CD9EFF.mp3`
- URL: https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/CB1F2166-5F52-4DDA-BE1C-3A3036CD9EFF.mp3
- Local file: `scripts/gate-escape-probe-2026-08-05/listen/cb1f2166-eglise-est-laide.mp3`
- Probe: duration 1.584s, bodyDb -15.32, tailDb -19.92, **tailRatioDb -4.60dB** — this one is more clearly over the line, not a borderline case.

**A third clip is worth flagging even though it didn't cross the threshold**: `0e7854cb-23cc-4c66-8de4-e25ad38f6667`, same course/role/voice (`fra_for_eng` target2 xai_leo), text "je vais expliquer", created `2026-08-05T05:22:47.311Z`, tailRatioDb **-8.73dB** — natural_decay by the -6dB rule, but the next-closest-to-cut clip in the entire 1,813-clip sample by a wide margin (next nearest was -11.47dB, in the pre-gate control). All three near/over-threshold clips in this whole probe are the same bucket: gate-era fra target2/xai_leo.

**Read on this:** 3 of 668 gate-era `target2`/`xai_leo` clips (0.45%) sit at or past the edge of a clean tail — small in absolute count, but it's the only bucket in the entire probe (gate-era or control) that produced any near-threshold clustering at all. If Tom listens to the two ABRUPT_CUT files and confirms they're audibly bad, this reads as a real, narrow gate escape specific to that voice/role combination, not a course-wide gate failure — the other ~1,745 gate-era and control clips across every other role/voice combination were clean.

## Blind spots — what this probe structurally cannot see

Stated plainly, not softened:

1. **Tail-only.** It measures the last 50ms against the whole-clip RMS. A clip that stops mid-word right at the very end is what it catches. A clip missing a word in the *middle*, a wrong word substitution, a mispronunciation, a wrong LEGO being spoken, or a cut at the *start* of the clip are all completely invisible to it.
2. **A missing word that happens to end on an already-decayed sound** (e.g. a trailing unstressed syllable) will pass as `natural_decay` even though content is missing — the tool's own header calls this out explicitly.
3. **Says nothing about pronunciation, accent, or naturalness** — a fluent, complete, correctly-decaying clip that a native speaker would call wrong is invisible to this test by design.
4. **-6dB is a single global threshold** across every voice/role/language. A voice with a naturally more percussive or less-decayed word-final consonant (works differently in French vs German, differently again per TTS voice) could sit closer to the line as a matter of that voice's normal timbre, not as a defect — I have not separately validated the threshold per voice, only used it as given.
5. On (5) below: this probe also cannot detect the **tiny clicks** Tom describes by ear — see next section.

**Best honest guess at what fraction of "bad" Tom might hear falls outside this probe's reach:** most of it. This tool is a narrow corroborating check for one specific and comparatively rare failure mode (hard mid-signal cut). Missing words, wrong words, and mispronunciation — which is what "bad" usually means when a human listens — are categorically outside what tail-RMS comparison can see. The two confirmed hits here are real physical evidence of *something*, but the probe cannot tell you whether the much larger volume of "bad" Tom heard on the Recently-Rendered page (already explained separately as 97.5% pre-gate clips surfaced by a filter that isn't filtering) share any relationship to what these 2 clips show.

## On the "tiny clicks" observation (padding question — reported, not fixed)

Looked for a distinct near-threshold cluster that might correspond to audible-but-not-gate-failing clicks: across all 1,813 clips probed, the `tailRatioDb` distribution is a smooth, roughly log-normal-shaped continuum from -320dB up to the two failures at -5/-6dB — there is **no separate bump or secondary cluster** sitting just below the -6dB cutoff that would suggest a wider population of near-miss clicks being systematically masked by the threshold. Only 3 clips in the entire sample (all three the same fra target2/xai_leo bucket, listed above) landed in the -12dB to -6dB band at all.

This is weak evidence either way on the padding question: it doesn't show a hidden population of near-clicks that slightly more tail padding would catch, but it also doesn't rule it out — a *click* proper (a short high-frequency transient at a splice boundary) may not move a 50ms-window RMS number much even when audible, since RMS averages energy rather than detecting transients. If Tom wants that question answered properly it needs a different measurement (e.g. peak/transient detection in a narrow window right at the boundary), not this tool.

## Data and artifacts

- Full probe outputs (raw JSON, all 1,813 rows): `scripts/gate-escape-probe-2026-08-05/{fra,deu}-gate-results.json`, `{fra,deu}-control-results.json` (gitignored `scripts/` — local to this box)
- Downloaded audio for the 2 failures: `scripts/gate-escape-probe-2026-08-05/listen/`
- ID lists used: `scripts/gate-escape-probe-2026-08-05/*-ids.json`

---

**Landing line:** no commits — this was a read-only investigation, no code or content changed, nothing pushed, nothing merged, nothing deployed.
