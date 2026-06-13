# Chunked-take spike — SSML `<break>` chunking vs cut-and-insert-silence

**Date:** 2026-06-13 · **Mode:** read-only DB, diagnostic TTS only (6 of 12 approved Azure calls), no commits/S3.
**Test rows:** `gle_for_eng:pod-0` g3 (`ga-IE-ColmNeural`) and `hrv_for_eng:pod-0` g3 (`hr-HR-SreckoNeural`).
**Same voice mandatory:** both takes were generated with the EXACT `voice_id` from the stored clip's `target_audio_id → course_audio` — no generic multilingual voice. I cannot listen; every claim below is an objective measurement.

## The question

Prior approach cut a continuous natural take at atom boundaries and INSERTED silence → choppy, worst on the tiniest chunks, because the voice had coarticulated each word into the next and pulling them apart exposed a seam that was never a seam.

Fix to test: generate audio ALREADY chunked at synthesis time (SSML `<break time="450ms"/>` at each atom seam) so each chunk is a prosodic unit the voice itself closed and reopened.

## Answer: YES — SSML-break gives clean prosodic chunks. Recommend it.

Two measurements settle it.

### 1. Every break is REAL silence (not a quiet spot in coarticulated speech)

`silencedetect` on the generous-break takes finds exactly one interior silence per atom seam (gle: 6 seams → 6 silences; hrv: 3 → 3), each flooring at **−120 dB** (digital silence; still detected as deep silence even at a strict −50 dB threshold). The continuous control and the natural stored take have only **2** interior silences each — the comma and the sentence-final period — confirming the breaks created genuine new silence at the *word-only* seams the voice would otherwise have run straight through.

### 2. The voice CLOSES each chunk like a phrase end (the actual win)

Energy-falloff (linear fit over the 200 ms before each break) + pitch (autocorrelation F0):

| course | seams CLOSED by energy taper | F0-fall at seam | notes |
|---|---|---|---|
| gle g3 | **5 / 6** | 5 / 6 | the voice tapered each chunk to silence with a steep negative slope (−5 to −12 dB/100 ms) and a 10–28 dB fall |
| hrv g3 | **3 / 3** | 3 / 3 | all three chunks closed cleanly |

This is the structural difference from cut-and-insert: the voice produced phrase-final prosody **before** the silence, rather than us imposing silence into the middle of a coarticulated stream.

### 3. Direct proof the choppiness is gone: slice-edge energy

Slices cut at the centre of each generated pause vs the prior continuous-take slices (same phrases, prior `atom-fusion-spike/out/<stem>/`):

| | chunked-take (this spike) | continuous-take (prior choppy) |
|---|---|---|
| gle g3 mean slice head / tail | **−90.3 / −90.3 dB** | −35.9 / **−15.7 dB** |
| hrv g3 mean slice head / tail | **−88.8 / −90.3 dB** | −54.8 / **−15.9 dB** |

Every chunked-take slice begins and ends in real silence (~−90 dB). The prior slices' edges sit at −9 to −30 dB — they were cut **through speech**. That ~75 dB gap at the cut edge IS the seam Tom heard as choppy. The chunked take removes it by construction.

## Caveats (heard-by-ear items to confirm)

- **One weak seam, gle g3 seam 5 `tú` → `ag dul`:** the only `open(energy)` seam (positive slope; the voice held energy through the short stressed pronoun "tú" mid-question). The break is still real silence, but the chunk wasn't tapered. Tiny-chunk pronouns are the residual risk.
- **gle seam 2 `go maith,` → `go raibh`:** energy closed but F0 *rose* (+22 Hz) — Irish continuation/list intonation across the comma. A deliberate prosodic shape, not a coarticulation cut, but not a terminal fall either.
- **Question contour:** both phrases end in "?". Each chunk is read with declarative-ish falling F0 (the question rise lives inside the final word), so the chunked sequence loses the global question melody. The natural take behaves the same way at its pauses, so this is not a regression — but a chunked question will sound like statements-then-a-question, as expected.
- **Slow variant (`<prosody rate="-15%">`):** identical seam structure, ~12 % longer, same closures. A deliberate reading does not change the verdict; it's available as a tone/clarity option, not a fix for anything.

## Recommended recipe

1. **Generate with SSML `<break time="450ms"/>` at each atom seam**, punctuation preserved inside each chunk (so the voice still hears comma/period boundaries; the break is additional). Same voice as the stored clip. 450 ms is generous enough to guarantee a clean close without sounding like a hard stop after trimming.
2. **Serve the wide unit by trimming the generated pause, never by cutting speech.** Centre-trim each silence to the target width:
   - **arrive / fastest:** the existing natural stored clip, verbatim (coarticulated, fluent).
   - **~100 ms:** lightly separated.
   - **~250 ms:** clearly separated.
   - **~500 ms (or full 450 ms+):** maximally separated, each chunk standing alone.
   Trimming silence is safe and sample-exact; speech is untouched.
3. **For "meet the atoms," slice at the centre of each generated pause** — these slices are ~75 dB cleaner at the edges than slices from a continuous take.
4. Keep the per-language voice; do not substitute a multilingual voice.

## Artifacts (A/B by ear)

All under `scripts/experiments/chunked-take/`. The prior choppy ladders sit beside these at `../atom-fusion-spike/out/<stem>-fusion-ladder.mp3` for direct comparison.

| file | what |
|---|---|
| `out/gle_for_eng-g3-ssml-ladder.mp3` | gle: 500 → 250 → 100 ms trimmed-pause tiers → natural arrive tier (24.2 s) |
| `out/gle_for_eng-g3-ssml-slow-ladder.mp3` | same, from the −15 % slow take |
| `out/gle_for_eng-g3-ssml-atoms.mp3` | gle: meet-the-atoms, 7 chunk slices 700 ms apart |
| `out/gle_for_eng-g3/atom-NN-*.mp3` | gle: individual chunk slices |
| `out/hrv_for_eng-g3-ssml-ladder.mp3` | hrv: 500/250/100 → natural (19.5 s) |
| `out/hrv_for_eng-g3-ssml-slow-ladder.mp3` | hrv: slow variant |
| `out/hrv_for_eng-g3-ssml-atoms.mp3` | hrv: meet-the-atoms, 4 chunk slices |
| `out/hrv_for_eng-g3/atom-NN-*.mp3` | hrv: individual chunk slices |
| `raw/<stem>-ssml-break450.mp3` | the generous-break take (wide source) |
| `raw/<stem>-ssml-break450-slow.mp3` | the −15 % slow take |
| `raw/<stem>-ssml-continuous.mp3` | no-break control (coarticulation baseline) |

(Other files in `out/` prefixed `-sentencesplit-` / `-separate-atoms-` and `measures.json` are from a parallel session, not this spike.)

## Method notes / integrity

- 48 kHz mono throughout (`Audio48Khz96KBitRateMonoMp3` from Azure) = native rate of the stored clips, so chunked and natural takes A/B at the same fidelity.
- ffmpeg used only as a decoder and for `silencedetect` (a measurement filter) — **no `acrossfade`**, per the known ffmpeg 7.1.1 segment-drop hazard. All editing on raw Int16 PCM in Node via `atom-fusion-spike/lib.cjs`; lame encodes; every rendered output's ffprobe duration verified against the PCM-exact expectation (all Δ ≤ 46 ms = within one mp3 frame + lame pad → no corruption).
- Scripts: `01-synth-ssml.cjs` (generate), `02-analyze.cjs` (silence + RMS), `03-prosody.cjs` (energy falloff + F0), `04-render.cjs` (ladders + atoms), `05-verify.cjs` (tier widths + edge cleanliness). Data in `data/{synth,analysis,prosody}.json`.
