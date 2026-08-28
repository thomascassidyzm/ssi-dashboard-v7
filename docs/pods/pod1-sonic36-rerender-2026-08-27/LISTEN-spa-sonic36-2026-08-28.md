# The 91 you flagged, re-rendered on sonic-3.6

**2026-08-28.** All 91 spa_for_eng Pod 1 English lines — your clone, the known track — are now
rendered on `sonic-3.6` and live. 91 of 91 swapped, zero failures, nothing deleted, no slot silent
at any point. Every clip was decoded by whisper and had to come back English before it was allowed
anywhere near a learner: 91 of 91 did, lowest confidence 0.94.

**Then the measurement went somewhere you should see, because it does not say what we expected it
to say.** The headline from last night — −31.5 LUFS on sonic-3 against −21.7 on sonic-3.6 — was one
short line. On your real Pod 1 lines it does not replicate at that size, and what a learner actually
hears did not get louder at all. Detail below the listening.

## Hear it

Six pairs. Both sides are the real mastered clip that was, and is, in the slot — not raw API output,
not a test line. Same words, same voice, same settings; only the model moved.

**"Good morning, Sarah!" — the first line of the pod**

Before, sonic-3
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC01-S001-before.mp3

After, sonic-3.6
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC01-S001-after.mp3

**"19. 20. 21. Wednesday. Thursday." — a drill line, where the two models are furthest apart at
source (−33.5 → −26.1 raw)**

Before
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC12-S010-before.mp3

After
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC12-S010-after.mp3

**"I'd like a black coffee, please." — the quietest clip in the pod after the pass, −17.7 LUFS**

Before
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC07-S002-before.mp3

After
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC07-S002-after.mp3

**"This is a lovely city. What do you do?"**

Before
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC06-S007-before.mp3

After
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC06-S007-after.mp3

**"Sunscreen is down there on your right…" — a long line**

Before
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC10-S006-before.mp3

After
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC10-S006-after.mp3

**"Wonderful. Is it possible for us to have a late check-out?" — included because this is one of the
lines where sonic-3.6 came off the API QUIETER than sonic-3, not louder**

Before
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC11-S009-before.mp3

After
https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/spa_for_eng_pod-1_SC11-S009-after.mp3

All 91 pairs are at `https://watson-1.tail4968cb.ts.net/evidence/pod1-sonic36-2026-08-28/` as
`spa_for_eng_pod-1_SC<scene>-S<sentence>-{before,after}.mp3`.

## What the numbers say

**What a learner hears did not get louder, and never could have.** `masterAudio` normalises every
clip to −16 LUFS, so a before/after on the delivered audio can only ever show that both hit target.
All 91, measured:

| Mastered clip, what plays in the pod | sonic-3 (before) | sonic-3.6 (after) |
|---|---|---|
| Median loudness | −16.5 LUFS | −16.4 LUFS |
| Range | −18.0 to −16.2 | −17.7 to −16.1 |
| More than 1 dB under target | 4 of 91 | 2 of 91 |

**The gap lives in the raw bytes, and it is about a third the size the one-line test suggested.**
The old raw audio was never stored, so the only honest way to pair the models on real course lines
was to render the same twelve Pod 1 lines on both, now, and measure both. Nothing from that probe
was published; it exists to answer this question.

| Raw off the API, 12 real Pod 1 lines, same text both sides | sonic-3 | sonic-3.6 |
|---|---|---|
| Median loudness | −24.5 LUFS | −23.1 LUFS |
| Range | −33.5 to −20.2 | −26.1 to −16.9 |
| Median improvement | | **+3.0 dB** |
| Lines that got LOUDER on 3.6 | | 9 of 12 |

Against the claimed +9.8 dB. Three of the twelve went the other way by 0.4–2.4 dB. Across the real
91, sonic-3.6 delivers a raw median of −22.5 LUFS with a range of −30.4 to −19.3 — better than the
−32 to −40 the earlier 50-clip battery recorded for sonic-3, but nothing like a flat 10 dB lift.

**Where the improvement actually concentrates is short lines.** The six shortest of the twelve
gained a median +4.2 dB, the six longest +1.8 dB, and the three biggest single gains (+7.4, +7.0,
+5.1) are all lines of 41 characters or fewer. That fits: the −31.5 figure came off a short line,
and short lines are exactly where sonic-3 fell off a cliff. It is also where your courses live.

**Stated plainly: at six takes a side, with no seed parameter in the API and a measured take-to-take
wander on short phrases, the length split is corroboration and not a measurement.** The +3.0 dB
median across twelve paired lines is solid; the per-length breakdown leans the right way and no
further.

## So what did the money buy

Less reaching. Mastering had ~3 dB less to lift on a typical line and considerably less on a short
one, and the clips that could not be dragged to target at all dropped from 4 to 2. That is the
mechanism behind the hiss you heard — the chain amplifying room tone along with the voice — and it
is genuinely reduced, just not by ten decibels.

Beyond that it bought sonic-3.6 itself, which is the model your ear picked off the listening grid
yesterday. Whether these 91 sound better is not a number I can produce. That is what the pairs above
are for.

## How it was done, and what it costs to undo

Make-before-break, per slot, at the S3 object rather than the link. These 91 clips were already on
your Cartesia clone, so only the model changed — and `course_audio` is unique on
(course, text, language, role, voice), which means the new render physically cannot land in a new
row. The production `force` path handles that by overwriting the row at render time, which publishes
an unverified clip to a learner. So this pass rendered and mastered into memory, decoded the bytes
with whisper, measured them, uploaded to a **new** S3 key, and only then moved the row's pointer with
one guarded UPDATE. A failure at any step before that leaves the learner on the old clip.

**Nothing was deleted.** All 91 superseded S3 objects are still in the bucket, verified present
after the run. Rollback is one UPDATE per slot back to the key recorded in
`docs/pods/pod1-sonic36-rerender-2026-08-27/spa_for_eng-applied-log.jsonl`.

Verification: 91/91 pod links still point at their own row and every row serves its new key; 10
clips pulled back down from S3 after the swap and decoded — all English, all word-for-word correct;
the veracity gate sampled 10 of the 91 in-flight and passed all 10.

## One thing worth knowing for next time

Six lines — the number-and-colour and month drill lines like "October. November. December." — could
not be confirmed English by the text language gate. They are barely English *prose*, so the trigram
model has almost nothing to score, and it correctly said "I cannot decide" rather than guessing.
Rather than widen the band, which would weaken that gate for every future pod, this pass escalated
those six to the waveform: whisper decoded the clip already live in each slot, and all six came back
English at p ≥ 0.95. The new clips then had to pass the same test again before publishing. Escalating
a hold to the audio, instead of loosening the text rule, is the pattern worth keeping.
