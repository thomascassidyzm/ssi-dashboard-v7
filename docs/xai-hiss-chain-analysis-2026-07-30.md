# xAI hiss: raw render vs mastering chain — stage-by-stage analysis

**Date:** 2026-07-29
**Question (Tom):** Is the xAI "tape hiss" in the raw renders, or is our post-processing (compressor 8:1 below −24 dB + make-up gain) making a quiet bed audible? If raw is clean, the honest fix is in the chain, and the denoise is a band-aid on every future voice.

## Method
`scripts/hiss-chain-probe.cjs` generates ONE short raw xAI `eve` render + an Azure `Sonia` control (same English text: *"Okay. So, let me think about that for a moment before we carry on."*), then measures the noise floor RAW and cumulatively through each real mastering stage (constants copied from `audio-processor.cjs`). Floor = astats **RMS trough** (quietest ~20 ms window = the between-word bed).

## Result

| stage | xAI eve — RMS trough | Azure Sonia (control) |
|---|---|---|
| 0 raw (pre-master) | **−79.0 dB** | **−inf (digital silence)** |
| 1 + compressor | −79.0 | −inf |
| 2 + make-up gain | −62.6 (gain **+16.5 dB**) | −128.9 (gain **+14.9 dB**) |
| 3 + true-peak limiter | −67.0 | −133.7 |
| 4 + fades (**SHIPPED**) | **−67.0** | **−133.7** |
| 5 denoise-first (the FIX) | **−inf** | −inf |

## Conclusion
1. **The hiss originates in xAI's raw render.** Raw xAI carries a ~−79 dB broadband bed in the gaps; Azure raw is truly silent. That is the source difference.
2. **Our chain amplifies but does not create it.** Both voices get near-identical make-up gain (+16.5 vs +14.9 dB — legitimate loudness normalization; xAI renders quiet at −26 dB RMS). That lifts xAI's −79 bed to an audible ~−67; it lifts Azure's silence to a still-inaudible −133. Same chain, same gain → the 66 dB output gap is entirely from the raw source, not differential treatment.
3. **Therefore the denoise (`afftdn=nf=-25:nt=w`, pre-compression) is the correct fix**, not a band-aid. "Fix the chain" isn't available — the +16.5 dB is real loudness normalization we can't drop without shipping quiet audio, and it would only reduce the hiss by that gain, leaving the −79 dB source bed.
4. **Not applied to every voice.** The fix is gated to `provider==='xai'` — Azure/ElevenLabs (clean raw) pass through untouched (row 5 Azure vs row 4 confirms nothing to remove there).

## Speech-smearing check (afftdn on already-mastered mp3s)
Independent band energy, real reprocessed pair (hissy original vs live denoised):
- speech core (300–3400 Hz): **−0.56 dB** (preserved)
- consonant band (3.4–8 kHz): **−1.70 dB** (mild; hiss/consonant overlap here)
- full: −0.54 dB

No meaningful speech smearing. Reprocessed clips are safe in front of learners; originals retained for rollback (`temp/hiss-reprocess/*-done-*.jsonl` + `s3://<bucket>/backups/hiss-reprocess-logs-2026-07-29/`).

Sample files (raw + every stage, both voices): `temp/hiss-chain-probe/`.
