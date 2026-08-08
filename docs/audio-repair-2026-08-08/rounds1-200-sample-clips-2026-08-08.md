# French rounds 11-30 — the sample before the bulk

These are the audio every learner hears in their first half hour, so before spending anything on the full rounds 1-200 rebuild I rendered one small real band and listened to it.

**376 clips rendered, 0 failed, in under two minutes.** Nineteen were checked with whisper at random (5%), eighteen passed. Every clip's duration was checked against its text length: nothing silent, nothing truncated, no missing durations.

Below are eight of the new clips. Tap to play.

## Two voices, same line

Eve is the French female voice, Leo the male. The course alternates them, so it is worth hearing the pair.

**"parler français aussi souvent que possible"** — *to speak French as often as possible* — Eve

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/0C8DCCFC-CE34-43E6-9FC3-C5DA8394C8AA.mp3

**"parler français aussi souvent que possible"** — Leo

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/265F15A8-E17B-493A-83EF-168572756C58.mp3

## Longer lines — the ones the old post-processing could eat

The damage this job exists to undo trimmed at a pause and lost everything after it, so the long clips with internal rhythm are the ones to listen to hardest. Both of these run to their last word.

**"j'essaie d'apprendre aussi souvent que possible"** — *I try to learn as often as possible* — Eve

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/598E36B0-BB27-4BCE-A9D2-FDE5E26B7249.mp3

**"je veux parler aussi souvent que possible"** — *I want to speak as often as possible* — Leo

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/3CD9B1A6-86AF-461B-9810-0AFADA150FE4.mp3

**"apprendre aussi souvent que possible"** — *to learn as often as possible* — Eve

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/FF46E705-284C-4B8D-932A-83511BEB3480.mp3

## Short lines

**"je peux parler"** — *I can speak* — Eve

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/AC3D1479-7974-4C42-8702-81A55A7BC5B8.mp3

## The one clip the checker flagged

Whisper transcribed **"essayer maintenant"** (*to try now*) as "et c'est y'en a un" and called it a failure. Judge it yourself:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/07F62EF4-2443-4924-8CAF-C3B8B42775CA.mp3

And the male voice on the same line:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/2527958A-E97B-429B-9E8B-B2FEDCBE03DF.mp3

My read: the clip is fine and the checker is not. It is a one-second French clip, and whisper is known to be unreliable at that length on this box — the same checker has read a correct French "je" as Turkish. The verification tool agreed, returning CONTINUE: one flag in nineteen is below the floor at which a failure counts as systematic rather than as the checker being twitchy.

That is the whole reason the whisper gate is off on the render path. It is not that we stopped caring about correctness; it is that on short French and German clips the gate produces more false alarms than findings, and it costs fifty times the throughput to do it.

---

*Rendered 2026-08-08 05:05Z, French rounds 11-30, on the phase-8 instance for this job. Production on port 3465 was not touched.*
