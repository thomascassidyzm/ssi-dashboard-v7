# Catrin's recordings, measured — usable as they are

*2026-09-02, read-only measurement pass on `human_catrinlliar_cym_n`. No audio modified, normalised or touched.*

## Verdict

**Usable as they are.** Judged on her own absolute numbers against the −16 LUFS mastering target and the fixed reference figures in `capture-profile-voice-vs-dry-2026-08-22.md`: Catrin's clips are quiet-but-clean, and the mastering chain already lands them within a whisker of −16 LUFS with a noise floor 50+ dB below the speech. Nothing needs re-recording. The hardware explanation (Blue Snowball, decent SNR) holds up under measurement — it is not crowding out a stale-profile finding, because there is no stale-profile finding here: her capture device string shows `capture:voice` throughout, the same profile job #96 made the default tonight.

**Correction to the original brief:** Tom's zzz clips from tonight were a process-workflow test recorded in a loud room with the AC running, not a fidelity reference — his own words. They are used below for exactly one thing, and one thing only: confirming which capture profile fired, by raw peak level. They are never a quality baseline, here or anywhere downstream.

## What the database actually holds

Tom said 38 existing recordings. The database holds **61 `recording_provenance` rows** for `human_catrinlliar_cym_n`, all from one session on 2026-08-23, all in `cym_n_for_eng:pod-0`. Of those:
- **56 are live** (current, not superseded) — 56 distinct sentences, no duplicates.
- **5 are superseded-and-marked-bad** — genuine empty-room takes (the recorder captured silence between lines while AGC pumped the room up to voice level), caught by Tom "by ear" that same night, already redone by Catrin in the same session. They are history, not a pending problem.

That doesn't cleanly reconcile to "38" — it's plausible 38 was Tom's recollection or came from a different count (e.g. lines with audio linked at the time he looked), but the DB's own answer is 56 live takes across 61 total provenance rows. Reporting it plainly rather than forcing a match.

Every one of the 61 rows has a `raw_s3_key` — **no gap here**: 100% of her takes have an archived raw original alongside the mastered clip, so every measurement below is on the actual microphone capture, not a reconstruction from the mastered file.

## Her distribution — the live 56 takes, raw archived originals

| Measure | Min | Median | Max | Mean |
|---|---|---|---|---|
| Raw peak (dBFS) | −9.8 | **−4.7** | 0.0 | −4.7 |
| Raw RMS (dBFS) | −29.2 | −25.5 | −21.9 | −25.6 |
| Raw integrated loudness (LUFS) | −26.5 | −21.5 | −17.5 | −21.7 |
| **Noise floor (dBFS, measured in genuine silence)** | −89.1 | **−80.1** | −75.3 | −80.5 |
| **Signal-to-noise ratio (dB)** | 47.9 | **55.2** | 64.0 | 54.9 |
| Gain needed to reach −16 LUFS | +1.5 | **+5.5** | +10.5 | +5.7 |

**Shape: tight and unimodal, not bimodal.** The floor spans only 14 dB across all 56 clips (−89 to −75), and every single one has an SNR above 47.8 dB — there is no clip anywhere near the danger zone. This is one clean population, not two populations pretending to be one. Nothing in the live 56 is an outlier worth naming — the two genuinely bad-floor clips in the corpus (−56.6 dB and −53.5 dB floor, both clipped at 0 dBFS peak) are the two already-superseded empty-room takes mentioned above; they sit outside the live population and Catrin has already fixed them by re-recording, before tonight.

**After mastering**, her clips land at a median **−16.3 LUFS** (mean −16.6) against the −16 target — already on the mark — with the floor still sitting at a median **−75.1 dBFS**, comfortably inaudible.

## Judged against the absolute yardsticks

The only fixed reference points available are the two populations in `capture-profile-voice-vs-dry-2026-08-22.md` (a different, earlier population — Tom's own dry vs AGC-on takes, 2026-08-22) and the −16 LUFS mastering target itself:

| Measure | Dry/broken population (yardstick) | AGC-on/healthy population (yardstick) | **Catrin (live 56, median)** |
|---|---|---|---|
| Raw peak | −28.5 dBFS mean | −4.0 dBFS mean | **−4.7 dBFS** |
| Noise floor | ~−88 dBFS | −80 to −131 dBFS | **−80.1 dBFS** |
| Gain needed to −16 LUFS | +30.6 dB | +7.5 dB | **+5.5 dB** |
| Resulting mastered LUFS | −26.2 (10 dB short) | −17.8 (near target) | **−16.3 (on target)** |

Catrin's numbers sit inside the healthy/AGC-on population's range on every measure, and her mastered loudness lands closer to target than either reference population did. This is a clean, absolute verdict — not a comparison to anyone's take from tonight.

## Capture-profile confirmation (level signature only, not a quality reference)

Tom's zzz clips from tonight are a process fixture — recorded in a loud room with the AC running, testing the workflow, not the audio. Their noise floor is meaningless (it's the AC) and they must never be used as a quality baseline anywhere downstream. The only thing they're good for: confirming which capture profile actually fired, by raw peak level.

| | Tom's zzz `capture:voice` (post-fix) | Tom's zzz `capture:dry` (broken) |
|---|---|---|
| Raw peak, measured median | −1.6 dBFS | −18.2 dBFS |

That matches the stated signature (≈−2.5 dBFS for voice, ≈−18.9 dBFS for dry) closely enough to confirm the fix is doing what it says — a level check, not a fidelity comparison. Catrin's own `recording_device` string reads `capture:voice` on every one of her 61 rows, independently confirming she was on the healthy profile throughout, without needing to lean on his numbers at all.

## What normalisation would do (not run — nothing needs it)

Since the live population needs only **+1.5 to +10.5 dB** of gain to reach −16 LUFS — far short of anything that would drag the floor up audibly — a single-pass `loudnorm` (the same chain already mastering her clips) is more than sufficient. Given the mastered files already measure at −16.3 LUFS median, **this has effectively already happened**: there's no separate rescue step to plan, run, or approve. If Tom wants a belt-and-braces re-master pass anyway, it would move noise floor from ~−80 dBFS raw to roughly the ~−75 dBFS already seen in her existing mastered files — no audible change expected.

## What I could not measure / gaps

- None on the audio side: 100% raw-archive coverage, 100% measurement success (0 ffmpeg errors across 122 Catrin files + 36 Tom zzz fixture files).
- The "38 vs 56" reconciliation above is a plain report of a mismatch, not a resolved one — flagging rather than guessing which count Tom meant.

## Standing note for anything downstream

**The zzz test clips (`human_tom_zzz`, `zzz_test2_for_eng`) must never be used as reference audio or a quality baseline, anywhere.** They are process fixtures for exercising the recording workflow — recorded in a loud room with the AC running — not audio Tom was trying to make sound good. The one legitimate use, demonstrated above, is confirming which capture profile fired via raw peak level; that is a level signature, not a fidelity judgement.

## Method note (for anyone re-running this)

Two real bugs were found and fixed while building this measurement, both in the noise-floor extraction, not in Catrin's audio:
1. A regex mis-paired `silencedetect`'s start/end timestamps whenever ffmpeg emitted a leading `silence_start: -0.00xx` (a small negative offset at true zero), shifting every pairing by one and picking the wrong segment as "longest silence."
2. Container-level `-ss` seeking (both before and after `-i`) landed on the wrong audio content entirely for these webm/opus files — an `atrim` filter (post-decode, sample-accurate) was required to get consistent, cross-checked numbers.
Both were caught by cross-checking a manual 100ms RMS-envelope scan against the tool's own output before trusting any number in this report.

---
No commits beyond this document.
