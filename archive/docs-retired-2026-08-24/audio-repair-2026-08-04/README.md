# Estate-wide silent-clip repair — 2026-08-04

What this directory holds, what was actually done, and what is still broken.

Companion: `stub-forensics-22/FINDINGS.md` is the forensic half — it explains
what the 2026-06-16 date recurrence really was and identifies a third artefact
class. Read it before trusting any "clean" verdict in this estate.

---

## The defect

A long xAI TTS batch degrades and begins answering with empty or truncated
HTTP 200 bodies. `response.ok` passes them, the mastering chain launders them
into well-formed MP3s, and `duration_ms` is computed FROM those laundered
files — so the DB row and the S3 object agree perfectly and every consistency
check in the estate passes. Nothing could see it.

The de-hiss pass reported "142,973 files, 0 failures". That was an honest
statement about exceptions thrown, and said nothing about whether any file
contained audio.

## Three artefact classes, not one

They share a duration signature and nothing else. Any tool that only asks
"is it silent?" passes two of the three.

| Class | Looks like | Found in |
|---|---|---|
| **Silent stub** | ~2,016 bytes, 144/168/192 ms, −91 dB | tel, kan, ben, hin, zho, mar |
| **Truncated** | audible, normal level, a fraction of the sentence | hrv (all 9), mar |
| **Near-silent** | full byte size, real signal, 10–30 dB under healthy | the 06-16 batch |

The third class was invisible to the gate until today. `kor_for_eng` stored a
whole Korean sentence as 336 ms at −43.3 dB and reported `suspect` forever,
because the thresholds (−60 dB mean / −45 dB peak) were calibrated on the
−91 dB artefact.

## What was repaired

Seven courses (German excluded — a separate, concurrently-running job owns it):

| course | audit | gate: confirmed / suspect | repaired | after (fixed gate) |
|---|---:|---|---:|---|
| hrv_for_eng | 9 | 0 / 80 | 13 | 0 confirmed, 0 near-silent |
| eng_for_tel | 10 | 9 / 3 | 11 | 0 confirmed, 0 near-silent |
| eng_for_kan | 22 | 19 / 6 | 22 | 0 confirmed, 0 near-silent |
| eng_for_mar | 13 | 12 / 116 | 116 | 0 confirmed, 0 near-silent |
| zho_for_hin | 135 | 135 / 76 | 207 | 0 confirmed, 0 near-silent |
| eng_for_hin | 108 | 100 / 121 | 128 | 0 confirmed, 0 near-silent |
| eng_for_ben | 162 | 149 / 51 | 194 | 0 confirmed, 0 near-silent |

Plus 21 proven-defective stragglers across 16 more courses (Task 3).

**Total: 712 clips re-rendered. Measured spend 9,393 characters = $0.14.**

Two courses are worth reading twice. **hrv_for_eng had zero silent clips** —
all 9 were truncation, and all 9 were role=`known`. **eng_for_ben's 149
confirmed are all `known` too.** No amount of ear-checking target audio would
have found either.

## What is still broken

- **1 `presentation`-role clip** (eng_for_tel) is unrepaired and that is
  correct. `repair-silent-clips.cjs` refuses the role on purpose:
  `lego_introductions.presentation_audio_id` is CASCADE, so minting a new id
  would destroy authored content. It needs a non-destructive path.
- **3 clips hard-error in the tail gate** after 3 repair passes (2 hrv, 1 ben).
  That is issue #18's mechanism — the soft resurgence/rise rules over-rejecting
  a breathy voice — not a defect in the clip. Do not force them.
- **14 hrv rows carry legacy ElevenLabs voice ids** on rows now routed to xAI,
  which 404s. Unrenderable without a voice-mapping ruling. None is a proven
  defect; the loudness probe passes them all.
- **The duration floor is structurally blind.** A defective clip was measured at
  624 ms — above the floor, invisible to the screen that found everything else.
  A default (non-`--deep`) gate report is NOT proof of a clean course.

## Why a repair mints a new audio id

Audio is served `Cache-Control: immutable, max-age=31536000` and the player
caches offline blobs keyed by audio id. Fresh bytes under an existing id would
never reach a device that already cached the silence. So the tool mints a new
id, re-points every foreign key, and updates the denormalised
`target1_duration_ms` / `target2_duration_ms` columns — the stale 144 ms in
those columns is what collapses the inter-cycle pause, which is the second
symptom that was actually audible.

## Files

- `<course>-gate.json` / `.txt` — the read-only gate run that produced each repair list
- `<course>-repair.txt` — the repair run itself, per clip
- `<course>-gate-verify.*` — re-verification on the FIXED gate (see below)
- `stragglers/` — the 21 Task 3 clips, split per course, with runs and verification
- `stub-forensics-22/` — the forensic pass on the 2026-06-16 question
- `measured-spend.txt` — output of `tools/course-optimization/repair-cost.cjs`

## A warning about earlier numbers

The gate had two real bugs, fixed in `a16889c3` partway through this work:

1. **Pagination dropped rows.** `loadClips` paged 1,000 at a time ordered by a
   non-unique `created_at`, so Postgres had no stable order across pages and
   rows silently vanished at page boundaries. The row count stayed correct,
   which is what hid it. **Any "0 confirmed" produced before that commit is not
   reproducible.** Every course in the table above was re-verified on the fixed
   tool.
2. **No near-silence tier.** See the three-classes table.

The repair tool had one too, fixed in `12e96bd0`: it sent the xAI options shape
to every provider, so azure-voiced rows failed with "Azure subscription key is
required" no matter how well the box was provisioned. That misdiagnosed itself
as a missing secret — it was never an env gap, the key was simply never passed.
