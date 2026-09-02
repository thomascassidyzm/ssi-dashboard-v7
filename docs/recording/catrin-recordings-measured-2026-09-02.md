# Catrin's recordings, measured — usable as they are

*2026-09-02, read-only measurement pass on `human_catrinlliar_cym_n`. No audio modified, normalised or touched.*

## Verdict

**Usable as they are.** Catrin's clips are quiet-but-clean — the classic rescuable pattern — except they don't even need rescuing: the mastering chain already lands them within a whisker of the −16 LUFS target, and the raw noise floor sits 50+ dB below the speech, essentially matching Tom's own known-good phone reference recorded tonight. Nothing needs re-recording. The hardware explanation (Blue Snowball, decent SNR) holds up under measurement — it is not crowding out a stale-profile finding, because there is no stale-profile finding here: her capture device string shows `capture:voice` throughout, the same profile job #96 made the default tonight.

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

## The two reference points, from tonight's session

| | Tom's phone (`capture:voice`, post-fix, "worked amazingly") | Tom's desktop (`capture:dry`, broken profile) | Catrin (live 56) |
|---|---|---|---|
| Raw peak median | −1.6 dBFS | −18.2 dBFS | −4.7 dBFS |
| Noise floor median | −76.7 dBFS | −60.3 dBFS | −80.1 dBFS |
| SNR median | 49.8 dB | 22.1 dB | 55.2 dB |
| Gain needed to −16 LUFS | +5.1 dB | +18.5 dB | +5.5 dB |

Catrin's clips sit **on par with — if anything slightly cleaner than — Tom's own known-good phone take from tonight**, and nowhere near his known-bad desktop reference. Note Tom's phone reference has a loud AC unit running in the background (his own description), so his floor is not a silent-room baseline; Catrin still comes out quieter-floored than that population. The hardware hypothesis (Snowball → decent SNR) is confirmed by the number, not merely assumed.

## What normalisation would do (not run — nothing needs it)

Since the live population needs only **+1.5 to +10.5 dB** of gain to reach −16 LUFS — far short of anything that would drag the floor up audibly — a single-pass `loudnorm` (the same chain already mastering her clips) is more than sufficient. Given the mastered files already measure at −16.3 LUFS median, **this has effectively already happened**: there's no separate rescue step to plan, run, or approve. If Tom wants a belt-and-braces re-master pass anyway, it would move noise floor from ~−80 dBFS raw to roughly the ~−75 dBFS already seen in her existing mastered files — no audible change expected.

## What I could not measure / gaps

- None on the audio side: 100% raw-archive coverage, 100% measurement success (0 ffmpeg errors across 122 Catrin files + 36 Tom reference files).
- The "38 vs 56" reconciliation above is a plain report of a mismatch, not a resolved one — flagging rather than guessing which count Tom meant.

## Method note (for anyone re-running this)

Two real bugs were found and fixed while building this measurement, both in the noise-floor extraction, not in Catrin's audio:
1. A regex mis-paired `silencedetect`'s start/end timestamps whenever ffmpeg emitted a leading `silence_start: -0.00xx` (a small negative offset at true zero), shifting every pairing by one and picking the wrong segment as "longest silence."
2. Container-level `-ss` seeking (both before and after `-i`) landed on the wrong audio content entirely for these webm/opus files — an `atrim` filter (post-decode, sample-accurate) was required to get consistent, cross-checked numbers.
Both were caught by cross-checking a manual 100ms RMS-envelope scan against the tool's own output before trusting any number in this report.

---
No commits beyond this document.
