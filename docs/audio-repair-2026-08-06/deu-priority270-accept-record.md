# deu_for_eng — the 270 priority repairs are live

**2026-08-06, 08:00–08:20Z.** Tom listened to the morning spot-check page, passed the batch, and
this is the accept that put it on the learner path. Everything below is measured, not projected.

> **Tom's verdict, verbatim in substance:** broadly excellent, all clearly audible; a couple carry
> a tiny residual click *during* the voice (not after it), less noticeable than before — accepted
> as-is.

---

## What landed

| | |
|---|---|
| Candidates proposed overnight (04:58Z) | **270** of 272 targets |
| **Accepted onto the learner path** | **154** |
| Aborted on drift — *already repaired and live* | **116** |
| Failed | **0** |
| Median audio restored on the 154 | **+168 ms** (range −144 ms to +912 ms) |
| Still flagged by the detector afterwards | **0 of 270** |

**The 116 aborts are not a shortfall.** Each one is a clip the tier-1-4 campaign (PID 2174446,
still running) had already repaired and accepted between 04:58Z and 08:05Z. The accept's
before-state assertion refused to overwrite a clip whose bytes had moved since a human heard them —
which is the rule working, not failing. Those 116 were re-measured at their current live revision
and all 116 are clean. **All 270 priority clips are healthy right now.** The 154 got there through
Tom's ear pass; the 116 got there through the campaign's machine-verified pass minutes earlier.

Roles across the 270: 95 presentation, 62 target2, 57 target1, 56 known.

Nothing was overwritten in place. Every accept swapped at the same `course_audio` id, bumped
`audio_revision`, and retained the superseded S3 object; every foreign key pointing at the row is
untouched (the accept log records the link census per clip).

---

## Verification — three independent passes

**1. The real player path, 12-clip sample, both revisions.** Fetched as a learner fetches, from
`https://staging.saysomethingin.app/api/audio/<id>.v<rev>`. All 24 requests: HTTP 200,
`content-type: audio/mpeg`. Decoded duration matched the accepted `duration_ms` **exactly** on all
12 new revisions. The superseded revision still serves its own original bytes at its own URL — the
per-clip versioned URL contract holds in both directions, so nothing that cached the old clip is
being served the new one, and vice versa.

**2. The canonical detector, re-run over all 270 live clips.** Not the bucket — the bytes were
pulled through the player URL at each clip's *current* revision and decoded, so a broken link or a
stale revision would have surfaced as a failure rather than as a clean measurement of the wrong
object. Tool: `services/audio-intelligence/tiers/tier2-edge-shape.cjs` via `tailVerdict`.

```
accepted:       154 clips,   0 still flagged,   0 errored
aborted-drift:  116 clips,   0 still flagged,   0 errored
```

**3. Veracity.** All 270 candidates passed the transcript check at CER 0 before they were ever
offered to Tom's ear.

Logs, all committed next to this file:
`deu-priority272-propose-applied-log.json` · `deu-priority270-accept-applied-log.json` ·
`deu-priority270-post-accept-detector.json` · `deu-priority270-accept-run.log`

---

## The three loose ends

### 1. `f1576f8c` "Wort" — already fixed, no action needed

One of the two overnight propose failures. The campaign repaired it independently at 06:xxZ; it is
live at revision 2 and measures clean (0.271 dB/ms, live noise floor). Closed.

### 2. `24e6f11f` "mein" — a learner is still hearing a trimmed clip. **Open gap.**

The other propose failure, and it is not a fluke. The clip is genuinely damaged — the detector is
unambiguous: *the last 29 dB fall in 10 ms (2.901 dB/ms; a render allowed to finish measures under
0.7), and 86.9% of the silence after it is exact digital zero — the shape of a trim, not an
ending.* It is live at revision 1, unrepaired.

The blocker is the **phonology gate**: whisper language-ID hears the rendered German word "mein"
as English and refuses the replacement, three attempts in a row.

**This is systemic, not a one-off.** The overnight campaign log carries **131 refusals across 40
distinct German texts, and every one is `'en' instead of 'de'`** — never any other language. All
of them short: *mein, Wort, weniger, perfekt, Moment, sind, seit, habe, fast, dein, bevor du
anfängst*. Each burns three renders and produces nothing. The gate looks miscalibrated below some
clip duration, and the veracity check passing at CER 0 on all 270 candidates suggests the
transcript is trustworthy exactly where the language guess is not.

I did not fix it here — changing a gate that exists to catch wrong-language renders is not a
boring change, and getting it wrong is worse than the bug. **A worker is on it**
(`e5da2785`, opus, this worktree), briefed to measure the duration/accuracy curve on the 384
never-trimmed control renders first, implement only if the evidence is clean, prove the gate still
catches a real wrong-language render, and then repair "mein" as the single authorised clip.

### 3. `ba27d32f` "Buch" — the failed rollback was bookkeeping only. **Fixed.**

The overnight log's `ROLLBACK FAILED … row may point at the candidate object` reads alarming. It
was not. A transient `TypeError: fetch failed` hit the **post-swap link census** — a reporting
step — after the mutation had already landed. Verified state at 08:20Z:

- `course_audio`: revision 2, `duration_ms` 720, pointing at the candidate object ✓
- history row 459: complete, with correct previous/new keys and durations ✓
- all four denormalised duration holders (3 × `course_practice_phrases`, 1 × `course_legos`):
  synced to 720 ms ✓
- live through the player path: HTTP 200, audio/mpeg, decodes to exactly 0.720 s ✓

The **only** residue was the candidate row left at `status='pending'` with `decided_by` null — which
would have let a future accept re-swap the clip to the same object for no reason. Stamped it
`accepted` with the original actor, timestamp and reason, plus a note recording the repair.

Then swept for the same fault estate-wide on this course: **0 other un-stamped accepts** (44
pending candidates, none of which the live row points at). The three sibling clips in the same
fetch-blip batch (`9ae5d1ab`, `a4d27e9c`, `7c681fd4`, `7844d1a3`) failed at *reading* the clip,
before any mutation — no residue by construction.

---

## Logged for the audio-intelligence engine, not for today

Tom's residual mid-voice click is a **fifth defect class that none of tiers 1-4 can see**: it costs
no duration (tier 1 blind), sits inside the speech rather than at the ending (tier 2 blind, and it
scored every one of these clips clean correctly), is too short to move a VAD boundary (tier 3
blind), and ASR survives it at CER 0 (tier 4 blind).

Written up with the 15-clip probe population, the ~2-positives-in-15 falsifiability note, and the
inference from "less noticeable than before" that it originates in the mastering chain rather than
the provider — appended to
`docs/audio-intelligence/HANDOFF-to-audio-intelligence-engine.md`, where the engine job will find
it. **Logged, not scheduled.** It qualifies nothing about this accept; Tom passed these clips
knowing about it.

---

## Coordination

The tier-1-4 campaign (PID 2174446) ran throughout and was never touched. The two jobs write to the
same rows by design, and the drift assertion is what makes that safe: 116 collisions, 116 clean
refusals, zero double-writes, zero corruption. The dispatched phonology-gate worker is fenced to a
single clip id and forbidden from touching the campaign or its checkpoint.
