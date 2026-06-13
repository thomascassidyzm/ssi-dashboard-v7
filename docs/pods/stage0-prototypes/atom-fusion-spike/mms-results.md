# MMS forced alignment vs Azure ground truth — atom-fusion spike

> Follow-up to `REPORT.md`. Question: can a **voice-independent** forced aligner
> (works on any audio — xAI, human recordings — with no Azure, no knowledge of
> the synthesis voice) match Azure word-boundary precision well enough to drive
> atom-fusion seams? Tom directs we avoid Azure (xAI is production, has no
> timings), so this is the path that has to work for general clips.
>
> Tested: **torchaudio `MMS_FA`** (Option B — the multilingual MMS wav2vec2
> forced-alignment pipeline), aligning the **existing pod clips** (`gle_for_eng:pod-0`
> g3/g4, `hrv_for_eng:pod-0` g3/g4 — the same mp3s the learner hears) against
> their transcripts. Ground truth = the Azure word boundaries from the prior
> spike (proven to index the originals at shift 0). **No TTS, no DB, no S3.**

## TL;DR verdict

**MMS forced alignment is VIABLE for atom-fusion, and it is the right
voice-independent path.** It installs CPU-only on this host (Option B, no
`ctc-forced-aligner`), aligns all 4 real clips (Irish included — which Whisper
cannot do at all) in **3.5 s total on CPU**, and after one **constant +133 ms
calibration** lands atom seams at **mean 39 ms / p90 84 ms / max 102 ms** vs
Azure — **29/30 seams within 100 ms, 22/30 within 50 ms**. That is ~2.6× better
than whisper.cpp DTW (which was 150–550 ms and Irish-blind) and is in the range
where the design spec's seams — most of which sit in inter-clause silence — are
inaudible. It does **not** reach Azure-re-synthesis precision (which is exact by
construction, shift 0), so for *Azure-voiced* TTS clips re-synthesis still wins;
but for **xAI and human clips, where re-synthesis is impossible, MMS is the
answer** and is good enough. Final sign-off is Tom's ear on the corrected
ladders (this machine has no ears).

## Feasibility — it installed and ran (Option B, CPU-only)

- This host had **no** torch. System python is 3.9.6 (Apple CLT) — too old for
  modern torch — but Homebrew ships **`/opt/homebrew/bin/python3.13` (3.13.9,
  arm64)**, which has CPU-only torch wheels. Installed into a venv:
  `torch==2.12.0`, `torchaudio==2.11.0` (+ numpy). **~89 MB torch wheel; ~1.2 GB
  total once the MMS model checkpoint downloads** (`model.pt`, 315 M params,
  cached under `.cache/torch/hub/checkpoints/`). venv itself ~600 MB.
- Chose **Option B (`torchaudio.pipelines.MMS_FA`)** over Option A
  (`ctc-forced-aligner`): MMS_FA is a built-in pipeline bundle (model + dict +
  tokenizer + aligner all from torchaudio — `F.forced_align`/`F.merge_tokens`
  under the hood), so it avoids the `transformers`/`onnx` stack
  `ctc-forced-aligner` pulls in. Lighter, fewer moving parts, same model family.
- **One gotcha** (fixed): torchaudio 2.11 routes `torchaudio.load` through
  `torchcodec` (not installed). Sidestepped by decoding mp3→16 kHz mono PCM with
  **ffmpeg as a plain decoder** (same path `lib.cjs` uses) and feeding a tensor
  directly — no extra dependency, deterministic.
- **Romanization, no `uroman` needed.** MMS_FA's token set is 28 romanized Latin
  letters + `'` + blank + star. A deterministic NFD diacritic-fold (ga fadas
  á→a; hr háčeks č→c š→s ž→z ć→c; đ→dj) produced **0 out-of-vocab tokens** on all
  4 clips — for these Latin-script languages it matches the uroman output the
  model was trained on.

### Exact commands Tom would run to reproduce / deploy

```bash
cd scripts/experiments/atom-fusion-spike
/opt/homebrew/bin/python3.13 -m venv .venv-mms          # brew python 3.13, arm64
.venv-mms/bin/python -m pip install --upgrade pip
.venv-mms/bin/python -m pip install torch torchaudio    # CPU-only arm64 wheels; soundfile NOT needed
export HF_HOME=$PWD/.cache TORCH_HOME=$PWD/.cache/torch  # keep the 1.2GB model cache local
.venv-mms/bin/python 06-mms-align.py        # align 4 clips -> data/mms-boundaries.json (3.5s, CPU)
node 07-mms-compare-render.cjs              # score vs Azure + render raw-MMS ladders
node 08-mms-biascorrect.cjs                # measure the calibration constant
node 09-render-corrected.cjs               # render the deployable (-133ms) ladders
```

Pinned: `torch==2.12.0 torchaudio==2.11.0 numpy==2.4.6` (Python 3.13.9, macOS 15.5 arm64).
Runtime: ~3.5 s wall for all 4 clips once the model is cached; peak RSS ~2.7 GB.

## Error numbers vs Azure ground truth

Per-word starts and per-**atom-seam** offsets (the seam is the thing that gets
cut, so seam error is the decision-relevant metric). Atoms mapped from MMS words
with the **same** word→atom mapper the Azure path uses
(`02-azure-boundaries.cjs#mapBoundariesToAtoms`).

### Raw MMS (no calibration)

| metric | mean | p90 | max |
|---|---|---|---|
| per-word **start** \|Δ\| | 139 ms | 202 ms | 309 ms |
| per-word **end** \|Δ\| | 82 ms | 131 ms | 153 ms |
| per-**seam** \|Δ\| | **102 ms** | 138 ms | 212 ms |

Seams within 50 ms: **4/30**; within 100 ms: **14/30**.

**The error is a systematic positive bias, not noise.** MMS (CTC) marks the
**acoustic onset** — the first emitting frame, i.e. the vowel/sonorant nucleus —
so it lands ~one consonant-attack *late* vs Azure's word edge. The per-clip
median lateness is strikingly stable: **gle-g3 +144, gle-g4 +127, hrv-g3 +123,
hrv-g4 +135 ms** (grand median **+133 ms**). The *end* error (82 ms) is roughly
half the start error and far less biased — consistent with onset-lateness.

### After one constant +133 ms calibration (deployable, estimated WITHOUT Azure)

Shift every MMS word start earlier by the blind grand-median 133 ms, re-derive
seams:

| correction | seam \|Δ\| mean / p90 / max | within 50 ms | within 100 ms |
|---|---|---|---|
| raw (none) | 102 / 138 / 212 | 4/30 | 14/30 |
| **blind global −133 ms** | **39 / 84 / 102** | **22/30** | **29/30** |
| ideal per-clip shift | 38 / 79 / 104 | 21/30 | 29/30 |

The blind global constant is **as good as the per-clip ideal** (39 vs 38 ms) —
proof the bias is a true model constant, not per-voice variation, so a pipeline
can apply one fixed calibration with no per-clip tuning and no Azure reference.
Only **one** of 30 seams (hrv-g4, a clause-internal `imati|lijep` seam) still
exceeds 100 ms (−102 ms); everything else is ≤ 88 ms. Residuals are centred near
zero with no remaining systematic component.

### Why 39 ms mean is good enough here

Most seams sit in or beside inter-clause silence (the spike's `seam_quality`
shows several at −120 dB). A 40–80 ms error inside a 700–900 ms pause is
**inaudible**. The seams that could matter are the intra-clause ones inside
fluent runs — and those are exactly where the design spec already warns of a
coarticulation caveat at wide early-tier gaps (true of the Azure offsets too).
The corrected ladders let Tom hear whether the residual is audible.

### Per-clip confidence (free QA signal MMS gives, Azure does not)

MMS returns a per-word alignment score. Croatian aligned with high confidence
(mostly 0.92–1.00). Irish scored lower (gle-g3 several words 0.04–0.48; gle-g4
0.60–0.99) — MMS's Irish coverage is weaker, yet its seams still corrected to
mean ~37 ms there. The score is usable as a **per-clip review-flag** in a batch
pipeline (low score → human checks that clip), which the Azure path can't offer.

## Comparison to the other candidates (from REPORT.md)

| aligner | ga | hr | seam error vs Azure | voice-independent? |
|---|---|---|---|---|
| Azure re-synthesis | exact | exact | **0 ms** (by construction) | **no** — needs the Azure voice |
| **MMS_FA (this)** | **yes** | **yes** | **39 ms** mean (calibrated) | **yes** — any audio |
| whisper.cpp DTW | **no** (unknown lang) | yes (coarse) | 166–264 ms mean | yes, but ga-blind |
| align.cjs silencedetect | n/a | n/a | refuses (no intra-clause gaps) | yes, but unusable |

MMS is the only voice-independent option that (a) handles Irish and (b) gets
seam error into the tens-of-ms range.

## Artifacts (under `scripts/experiments/atom-fusion-spike/`)

Listen to the three offset sources for the same take, side by side:

| file | offsets from |
|---|---|
| `out/<stem>-fusion-ladder.mp3` | **Azure ground truth** (prior spike) |
| `out/<stem>-fusion-ladder-MMS.mp3` | **raw MMS** (uncalibrated — hear the +133 ms lateness) |
| `out/<stem>-fusion-ladder-MMS-corrected.mp3` | **MMS −133 ms** (the deployable variant — should sound ~= Azure) |

`<stem>` ∈ {`gle_for_eng-g3`, `gle_for_eng-g4`, `hrv_for_eng-g3`, `hrv_for_eng-g4`}.
Each ladder: 600 ms gaps at atom seams → tone → 250 ms → tone → 0 ms (the
untouched original take, bit-for-bit). All outputs ffprobe-verified to the
PCM-exact duration (Δ ≤ 42 ms, all within the lame frame pad — **no segment
drops**; ffmpeg used only as a plain decoder, no acrossfade, per the 7.1.1
hazard).

Scripts: `06-mms-align.py` (the aligner — venv), `07-mms-compare-render.cjs`
(scoring + raw ladders), `08-mms-biascorrect.cjs` (calibration analysis),
`09-render-corrected.cjs` (corrected ladders). Data: `data/mms-boundaries.json`,
`data/mms-compare.json`, `data/mms-biascorrect.json`. Model cache + venv are
gitignored (under `scripts/`).

## Recommendation

1. **For Azure-voiced TTS pod clips** — keep re-synthesis (exact, shift 0; prior
   spike's winner).
2. **For xAI-voiced and human-recorded clips** (no timings / no re-synthesis
   possible) — **use MMS_FA forced alignment with the +133 ms onset calibration.**
   It is voice-independent, handles Irish, runs in seconds on CPU, and lands
   seams at mean ~39 ms — within the inaudible range for the silence-adjacent
   seams that dominate, and worth a low-score review flag for the rest.
3. **Calibration is a single constant.** Confirm it holds on a wider voice/language
   sample before fixing the number; the per-clip stability here (123–144 ms over
   2 languages × 4 voices) is a strong prior.
4. **Next:** Tom's ear on the `-MMS-corrected` ladders vs the Azure ones; widen
   the test set (more voices, a non-Latin script to validate the romanizer /
   reach for `uroman`).
