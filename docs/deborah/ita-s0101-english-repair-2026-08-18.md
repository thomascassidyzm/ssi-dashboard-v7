# Italian S0101 — the wrong English is gone, live now

**Live in production.** All five cards in seed 101 of `ita_for_eng` now show English that matches their Italian. Five new English clips, rendered in the course's own voice (Sonia), each transcribed back and checked before it was accepted.

**Actual spend: about $0.0015** — 382 characters of Azure neural TTS (10 renders: two takes of each of the five lines, five shipped). The $1.43 you authorised was not this job's bill; see *A correction on the number* below.

---

## Before and after

Every one of the five used to read **"I'm excited about this work"**, all five sharing one single recording. The Italian was always right.

| Italian (unchanged) | Was | Now | Hear it |
|---|---|---|---|
| mi piace scoprire cosa vuole dire | I'm excited about this work | **I'm enjoying finding out what it means** | [play](https://ssi-learning-app.vercel.app/api/audio/b7ef5973-6cc1-4276-9650-8424c7c30e2a?f=.mp3) |
| mi piace scoprire quando sei pronto | I'm excited about this work | **I'm enjoying finding out when you're ready** | [play](https://ssi-learning-app.vercel.app/api/audio/4e41a00f-0519-4012-b828-37961fe14702?f=.mp3) |
| mi piace scoprire dove sei | I'm excited about this work | **I'm enjoying finding out where you are** | [play](https://ssi-learning-app.vercel.app/api/audio/66ebb1aa-3e8d-4d88-8bdf-7b560c63e7e5?f=.mp3) |
| mi piace scoprire cosa vuoi | I'm excited about this work | **I'm enjoying finding out what you want** | [play](https://ssi-learning-app.vercel.app/api/audio/034d4c31-16be-4dc7-aee0-2df7abf2085e?f=.mp3) |
| mi piace imparare questa lingua | I'm excited about this work | **I'm enjoying learning this language** | [play](https://ssi-learning-app.vercel.app/api/audio/fd4d76c9-194b-4315-abf8-4457ca218809?f=.mp3) |

The wording is the prior diagnosis's own suggestion, unchanged. It also turns out to be exactly the house pattern already in that round — its neighbours read "I'm enjoying finding out more", "…about this", "…that", "…how to do it".

Deborah's second worry is closed as a side effect: "excited" now appears nowhere in the course before round 309, where *entusiasta* is actually taught.

## What I checked before spending

- **The live database first.** All five rows were still wrong, still pointing at the same one clip. Nobody had touched them.
- **No collision.** None of the five new English strings is already used in the course for a different Italian sentence.
- **Voice.** The course config nominates a different voice (xAI "Eve") from the one this part of the course is actually spoken in. Every one of the 88 English prompts in seeds 100–102 is Azure Sonia. I rendered Sonia, so the five cards sound like their neighbours rather than like a stranger dropped into the middle of the round.

## What I checked after

- **Each clip, before accepting it**: transcribed back word-for-word; length 2.5–2.8s; level −16.5 dB mean, peak −5.6 dB (no clipping); ~0.17s lead-in and ~0.35s tail, with the last word ending well inside the audio — no truncation, no artefacts. Two takes of each were rendered; Azure was byte-identical both times, so there was no marginal take to reject.
- **Live, through the app's own read path**: the round window the player calls now returns the corrected English against the correct Italian, with zero occurrences of "excited".
- **Live, on the served bytes**: all five new clips fetch 200 through the learner audio endpoint and transcribe correctly. The five Italian clips and both presentation clips for the seed still fetch 200 — nothing went silent or stale.

## Presentations

Nothing to fix. The presentations mirror the LEGO, and the LEGO text was never wrong — only the practice-phrase English was. The narration for this round already says *"The Italian for: 'language', as in — 'I'm enjoying learning this language', is:"*, which is the corrected sentence, not the old one. Both presentation clips verified alive.

## The audit trail

Ten writes, all logged: five `course_audio` inserts (new clips), and five phrase rows updated. The content audit log holds all five before-images, and the audio link ledger records each relink as `relinked-same-voice` — old clip → new clip, with both texts. The old "I'm excited about this work" clip is now referenced by nothing; it was left in place, not deleted.

**No audio pass was queued.** There is a pending, Tom-approved pod-0 request on this course, and queueing overwrites it. The audio for this change is already rendered and verified, so there is no backlog to request.

## A correction on the number, and one gap

**The $1.43 does not belong to this defect.** I found the prior work: a read-only diagnosis of exactly these five rows, which prepared the English replacements above and applied nothing. It never costed a re-render. The $1.43 is a different job's bill — 2,413 renders across 19 courses of silent slots, estate-wide. So there was no prepared cost estimate for this job to spend against; I costed it myself at $0.0015 and it came in there. Nothing about the authorisation is in doubt; the figure attached to it was.

**Gap:** round 254 is behind the subscription gate, so I could not drive the fully authenticated learner route end to end. I verified against the exact database function that route calls, plus the ungated audio endpoint for the bytes. That is the read path minus the paywall check, not a signed-in session.

**Left open, as the prior diagnosis flagged it:** on *mi piace scoprire quando sei pronto*, the female Italian clip sounds to a machine transcriber like *pronta* where the text says *pronto*. Machine transcription is unreliable on a final unstressed vowel. Untouched by this pass — one listen from you settles it.
