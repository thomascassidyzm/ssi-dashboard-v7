# Chunked-take spike — SENTENCE-SPLIT (`<s>`) vs SEPARATE-ATOM (citation) takes

**Date:** 2026-06-13 · read-only DB · diagnostic TTS only · no commits / no S3.
**Test rows:** `gle_for_eng:pod-0` g3 (`ga-IE-ColmNeural`, 7 atoms) — deep; `hrv_for_eng:pod-0` g3 (`hr-HR-SreckoNeural`, 4 atoms) — separate-atom only.
**Same voice mandatory:** every chunk was generated with the EXACT `voice_id` from the stored clip (`target_audio_id → course_audio`). No generic multilingual voice. I cannot listen — every claim below is an objective measurement.

> **NOTE — parallel session / shared budget overrun.** A second agent solved the same brief concurrently in this same directory using a third variant (SSML `<break time="450ms"/>` chunking + a −15% slow read; files `*-ssml-*.mp3`, `RESULTS.md`, `raw/`). That session spent **6** Azure calls; **this** session spent **12** (the full budget). Combined = **18 Azure calls against a shared 12-call budget → overrun by 6.** Cause: two agents on the same task, same workspace, no coordination (the known parallel-session trap). Flagging, not hiding. The two sets of artifacts are complementary, not duplicate (see below).

---

## The two sub-tests this session ran

**A) SENTENCE-SPLIT** — gle only. ONE SSML call: each atom wrapped `<s>atom.</s>` with `<break time="320ms"/>` between, so the voice gives every chunk full phrase-final prosody while carrying one whole-phrase contour. Sliced into 7 per-chunk clips at the inter-`<s>` silences.

**B) SEPARATE-ATOM (citation)** — gle + hrv. ONE Azure call PER atom: the chunk alone as a closed sentence (`<s>atom.</s>`), in total isolation. This is Tom's "record all the chunks separately" idea — pure citation form.

Both are compared against the **PRIOR coarticulated-cut** approach (cut one continuous take at atom seams + insert silence), whose seam levels were already measured by the earlier spike (`../atom-fusion-spike/data/transfer.json`).

---

## Headline result — the seam energy that made the prior approach choppy is gone

The choppiness metric: **dBFS of the audio exactly where the join lands.** A join in LOUD voiced speech sounds choppy; a join in silence is clean. (`03-boundary-analysis.cjs`, pure-PCM, no ffmpeg filtergraph.)

### gle g3 — boundary level at the join (lower dB = cleaner)

| approach | join lands at (median) | mean | what the join cuts through |
|---|---|---|---|
| **PRIOR coarticulated-cut** | **−12.5 dB** | −18.3 dB | LOUD voiced speech (worst seam −8.8 dB) — *this is the choppiness* |
| **SEPARATE-ATOM** | **−62.1 dB** | −69.9 dB | near-silence (voice closed each chunk) |
| **SENTENCE-SPLIT** | **−64.3 dB** | −70.9 dB | near-silence, marginally quieter still |

### hrv g3

| approach | median | mean |
|---|---|---|
| PRIOR coarticulated-cut | −13.5 dB | −15.9 dB |
| SEPARATE-ATOM | −53.2 dB | −59.9 dB |

**~50 dB quieter at the join** for both chunked methods vs the prior cut. That is the seam Tom heard, removed by construction: each chunk tapers itself into a quiet coda and opens from a silent onset, instead of being torn out of a coarticulated stream.

Onset detail (per-chunk RMS in the 12 ms BEFORE speech begins, `measures.json`): every gle chunk onset reads −39 to −103 dB — each chunk genuinely starts from silence. Chunk-final **codas** (−42 to −65 dB) are louder than **onsets** (−79 to −103 dB) because open codas (e.g. *agat*, *oibre*, *hvala*) trail off less steeply than onsets begin — naturalistic, not a defect.

### The inserted pauses are real silence

Center of every inserted inter-chunk gap in the rendered ladders/meet files measures **−120 dB (digital silence)** (in-PCM). `silencedetect` (−25 dB, d=0.12, accounting for the lame noise floor) confirms the expected gap counts: gle meet = 7 regions, hrv meet = 4; gle ladders = 19, hrv ladders = 13 (vs prior choppy 22 / 16).

---

## Sub-test A vs B head-to-head

**For FUSION cleanliness: a near-tie, with SENTENCE-SPLIT marginally ahead (~1–2 dB cleaner edges).** Both close each chunk into near-silence. Sentence-split's slight edge comes from the voice tapering codas a touch more gently when it knows more material follows in the same utterance; separate-atom codas are a hair more abrupt (clipped citation endings). The chunk durations are essentially identical between the two methods (e.g. *go raibh maith agat* 680 ms separate vs 685 ms sentence-split; *tú* 252 vs 255 ms), so they are interchangeable on length.

**For MEET-THE-ATOMS clarity: SEPARATE-ATOM is the better candidate** — exactly as the brief predicted. Each separate-atom chunk is a self-contained citation utterance with no neighbour-coarticulation in either direction, so the learner hears the atom in its canonical isolated form. Sentence-split chunks carry faint traces of the running contour (e.g. continuation intonation across *go maith,*→*go raibh* — F0 does not fully reset), which is desirable for fusion but slightly less "dictionary-clean" for first contact. Objectively both are ~50 dB cleaner than any slice from a continuous take; the distinction is contour-shape, not edge-noise.

### Caveats heard-by-ear should confirm
- **Tiny stressed pronoun `tú` (gle seam 5):** the shortest chunk (252 ms speech) — the historically worst case. In BOTH chunked methods it now opens/closes in silence (onset −42 dB, around the chunk), so it should no longer be the choppiest. Still the one to listen to first.
- **Question melody:** both phrases end in "?". Each chunk reads with declarative-ish falling F0; the global question rise lives inside the final word. So a fully-separated chunk sequence sounds like *statements-then-a-question*. The natural arrive tier behaves the same at its own pauses, so this is expected, not a regression.

---

## Artifacts (A/B by ear) — mine

Under `scripts/experiments/chunked-take/out/`. Prior choppy ladders sit at `../atom-fusion-spike/out/<stem>-fusion-ladder.mp3` for direct comparison. Ladder structure mirrors the prior ladders (gap tiers **600 ms → 250 ms**, then the **natural stored clip verbatim** as the arrive tier; tiers separated by 400 ms silence + 150 ms tone + 400 ms silence).

| file | what |
|---|---|
| `gle_for_eng-g3-sentencesplit-ladder.mp3` | gle: `<s>`-chunk fusion ladder 600→250→arrive (18.1 s) |
| `gle_for_eng-g3-sentencesplit-meet.mp3` | gle: 7 `<s>`-chunks, 700 ms apart |
| `gle_for_eng-g3-separate-atoms-ladder.mp3` | gle: citation-chunk fusion ladder 600→250→arrive (18.1 s) |
| `gle_for_eng-g3-separate-atoms-meet.mp3` | gle: 7 citation chunks, 700 ms apart |
| `hrv_for_eng-g3-separate-atoms-ladder.mp3` | hrv: citation-chunk fusion ladder (13.7 s) |
| `hrv_for_eng-g3-separate-atoms-meet.mp3` | hrv: 4 citation chunks, 700 ms apart |

The parallel session's complementary `*-ssml-*.mp3` (the `<break>` and slow variants) and its `RESULTS.md` are also in this tree — together the three variants (`<s>` / citation / `<break>`) bracket the design space.

---

## Method / integrity notes

- **FFMPEG HAZARD avoided:** no `acrossfade`. ffmpeg used only as a plain decoder; all slicing/silence/concat on raw Int16 PCM in Node (`lib.cjs`, copied from the proven `atom-fusion-spike/lib.cjs`); lame encodes. **Every rendered output's ffprobe duration verified against PCM-exact expectation — all Δ ≤ 48 ms (within one mp3 frame + lame pad) → no segment-drop corruption.**
- **Fidelity caveat:** my chunks were synthesized at Azure 16 kHz (`Audio16Khz32KBitRateMonoMp3` — the pod pipeline's default via `tts-service.cjs`), then decoded to 48 kHz PCM for assembly with the 48 kHz natural arrive tier. They concat cleanly (all 48 kHz at assembly) but the chunk **bandwidth** is narrower than the arrive tier. This does NOT affect the boundary-cleanliness verdict (silence-at-join, not bandwidth). The parallel session generated at native **48 kHz** — for any production recipe, match the stored clip's 48 kHz to keep chunk and arrive fidelity equal.
- Scripts: `01-synthesize.cjs` (all 12 Azure calls), `02-render.cjs` (ladders + meet, duration-verified), `03-boundary-analysis.cjs` (seam-energy comparison). Data: `synth/synth-manifest.json`, `out/measures.json`, `out/boundary-analysis.json`.
