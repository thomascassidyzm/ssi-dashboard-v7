# Echogarden vs Azure — atom-fusion offset validation

> Follow-up to `REPORT.md`. The prior spike's winner (re-synthesize with Azure
> and transfer the word-boundary offsets) is **off the table**: Tom directs we
> avoid Azure, production TTS is xAI, and xAI returns **no timings**. We need an
> aligner that works on *any* audio — human or any TTS voice. This evaluates
> **echogarden** (npm, JS-native, DTW against an eSpeak-ng synthesized
> reference — fully local, voice-independent), the candidate flagged in
> REPORT.md row "echogarden (npm) … DTW quality to be validated", against the
> Azure word-boundary ground truth captured for the same 4 pod clips.

## Install feasibility — GREEN

```
npm install -g echogarden        # 255 packages, 17s, exit 0
echogarden align <audio> <txt> <out.json> --language=<ga|hr> --engine=dtw
```

- **No blockers.** Installed clean on Node v22.15.0. The DTW engine needs no
  model download beyond eSpeak-ng, which was already present — first alignment
  ran in ~290 ms, no network fetch stalled.
- **Irish (ga) AND Croatian (hr) both work** out of the box — DTW synthesizes an
  eSpeak-ng reference (both are eSpeak languages) and time-warps the real audio
  onto it. This is the decisive advantage over whisper.cpp, which cannot do
  Irish at all (`unknown language 'ga'`).
- **Voice-independent by construction**: DTW never recognizes; it aligns a known
  transcript. So it works identically on xAI clips, human recordings, any voice.
- **Deterministic**: re-running gle g3 produced bit-identical word offsets
  (max delta 0 ms). Good for reproducible batch alignment.
- DTW words came back **1:1 with the transcript on all 4 clips** (no count
  mismatch, every word text matched) — no misrecognition, no zero-length words,
  unlike the whisper.cpp probe in REPORT.md.

## Method

Aligned each ORIGINAL mastered pod clip (`audio/<stem>.mp3` — the frame the
Azure ground truth is valid for at shift 0, per `03-transfer`) against its
transcript. Flattened the echogarden timeline (`segment→sentence→word→token→
phone`) to word entries, mapped words→atoms with the **same mapper** as
`02-azure-boundaries.cjs` (`mapBoundariesToAtoms`), and measured |Δ| vs Azure:

- per **word** start/end (54 words across 4 clips)
- per **atom seam** — the cut points that actually matter for fusion (30 seams)

Scripts: `06-echogarden-analyze.cjs` (alignment → error tables → `data/echogarden.json`),
`07-echogarden-ladder.cjs` (PCM fusion ladders from echogarden offsets).

## Error vs Azure ground truth (RAW echogarden offsets, ms)

### Per-clip seam error (the fusion-relevant metric)

| clip | voice | seams | seam mean | seam p90 | seam max |
|---|---|---|---|---|---|
| gle g3 | ga-IE-ColmNeural | 6 | **135** | 232 | **232** |
| gle g4 | ga-IE-OrlaNeural | 10 | **95** | 164 | **201** |
| hrv g3 | hr-HR-SreckoNeural | 3 | **90** | 102 | **102** |
| hrv g4 | hr-HR-GabrijelaNeural | 11 | **78** | 110 | **167** |

### Pooled (all 4 clips)

| metric | mean | p90 | max | n |
|---|---|---|---|---|
| word start \|Δ\| | **120** | 187 | **460** | 54 |
| word end \|Δ\| | 107 | 185 | 459 | 54 |
| word all \|Δ\| | 113 | 187 | 460 | 108 |
| **atom seam \|Δ\|** | **96** | 164 | **232** | 30 |

## Verdict — NO. Echogarden is NOT within ~50 ms of Azure.

Raw echogarden seam error is **mean 96 ms, p90 164 ms, max 232 ms** — roughly
**2× the ~50 ms bar at the mean and ~4–5× at the tail.** Word-level start error
reaches **460 ms**. It is clearly better than the whisper.cpp DTW probe
(mean |Δstart| 166–264 ms, max 530–563 ms in REPORT.md) and never
misrecognized, but it does not approach the precision the Azure-transfer path
delivers (which is exact by construction, shift 0 ms).

So as a **drop-in replacement for Azure-grade offsets, echogarden fails the
50 ms test.**

## The interesting part: the error is mostly a *constant late bias*

The deltas are **almost all positive** — echogarden plants seams systematically
*later* than Azure (the eSpeak reference's phone durations don't match the real
voice, and DTW lags the true onset):

- signed seam delta: **mean +96, median +88, min −7, max +232** (sd 53)
- signed word-start delta: mean +119, median +102, min −25, max +460

Subtracting the bias collapses the residual dramatically:

| correction | residual seam mean | residual seam max |
|---|---|---|
| per-clip median bias (≈85–117 ms) | **36** | **115** |
| single global −88 ms constant | 39 | 144 |

So **the *shape* of echogarden's alignment is good to ~35 ms; it is the absolute
zero-point that is off by a near-constant ~90 ms.** That is a real lever — but it
does NOT rescue the 50 ms verdict for the Azure-free use case, because:

1. The bias is only knowable *by comparing against Azure*, which is exactly the
   ground truth we won't have in production. A blind global −90 ms constant
   still leaves residual max 144 ms (hrv g3's true bias 88 vs gle g3's 117).
2. Even bias-corrected, the residual **max is still 115 ms** — over the bar at
   the tail, where the audible clipping lives.

## Listen — A/B ladders (same construction, only seams differ)

For each clip, `07-echogarden-ladder.cjs` cut the original take at echogarden's
seams into the identical 3-tier ladder (gaps 600 → 250 → 0 ms, tone separators,
0 ms tier = take verbatim) used by the Azure ladders, so the **only** difference
is seam position:

| echogarden (this work) | Azure (prior spike) |
|---|---|
| `out/gle_for_eng-g3-fusion-ladder-ECHOGARDEN.mp3` | `out/gle_for_eng-g3-fusion-ladder.mp3` |
| `out/gle_for_eng-g4-fusion-ladder-ECHOGARDEN.mp3` | `out/gle_for_eng-g4-fusion-ladder.mp3` |
| `out/hrv_for_eng-g3-fusion-ladder-ECHOGARDEN.mp3` | `out/hrv_for_eng-g3-fusion-ladder.mp3` |
| `out/hrv_for_eng-g4-fusion-ladder-ECHOGARDEN.mp3` | `out/hrv_for_eng-g4-fusion-ladder.mp3` |

(Also `out/hrv_for_eng-g3-fusion-ladder-WHISPER.mp3` from the earlier whisper
probe, for a three-way listen.) All ECHOGARDEN ladders were PCM-rendered (no
acrossfade) and ffprobe duration-verified — every output within the ~28–42 ms
lame frame pad of the PCM-exact expectation, no segment drops. **What you'll
hear:** because echogarden seams land ~90 ms late, the 600/250 ms tiers tend to
cut a touch *into the next atom's onset* (especially gle g3, the +117 ms clip) —
the inserted gap arrives slightly after the natural word edge. Tom's ear on
whether that's tolerable for the cosmetic meet-the-atoms tiers is the
acceptance gate (this machine has no ears).

## Bottom line / recommendation

- **Echogarden is the right *kind* of tool** — local, voice-independent,
  ga+hr+(any eSpeak language), deterministic, trivial install, no
  misrecognition. It is the credible Azure-free / xAI-compatible aligner and
  clearly beats whisper.cpp.
- **But its raw precision (~96 ms mean / 232 ms max seam error) is NOT within
  ~50 ms of Azure**, so it cannot blindly replace the Azure-transfer path for
  invisible fusion seams at wide gaps.
- **Where it is viable today**: (a) the **0 ms / verbatim** tier needs no offsets
  at all; (b) the cosmetic *meet-the-atoms* cuts may tolerate ~90 ms if Tom's
  ear approves the ladders; (c) **human recordings** (the spec's future norm)
  have NO Azure alternative — echogarden is the only option on the table and is
  far better than nothing.
- **If pursued, two precision upgrades to try before concluding** (not done
  here — out of this spike's scope): the **`dtw-ra`** engine (DTW + recognition
  assist) and **`whisper`** align engine (guides Whisper to the known
  transcript — would need the ga-unsupported caveat checked), both of which
  target exactly this onset-lag bias. The ~90 ms constant-bias finding suggests
  a per-voice or per-language calibration constant could also be measured *once*
  against a held-out Azure reference and applied blindly thereafter — but that
  reintroduces an Azure dependency at calibration time.

## Artifacts

- `06-echogarden-analyze.cjs`, `07-echogarden-ladder.cjs` (re-runnable)
- `echogarden/transcripts/*.txt`, `echogarden/timelines/*.json` (DTW output)
- `data/echogarden.json` (full per-word + per-seam error tables)
- `out/<stem>-fusion-ladder-ECHOGARDEN.mp3` (4 ladders, duration-verified)
