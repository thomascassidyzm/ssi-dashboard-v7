# A-119 — the slash-form clips are rendered and live

**37 of the 38 broken clips are fixed and serving.** Polish, Portuguese, Latvian and Arabic
learners no longer hear "Pan/Pani", "impressionado/a", "pārsteigts(-a)" or "عايز/عايزة" read
aloud as two words. One Latvian clip is parked and needs your ear — it is the only thing in
this job that is not finished.

**Hear it:** [before and after, worst first](/evidence/a119-slash-form-2026-08-16/index.html)
— three pairs, tap to play. The third pair is the parked one.

Total spend: **$0.053** — 3,292 characters of TTS.

---

## What landed

| Course | Rows | Clips fixed | How |
|---|---|---|---|
| pol_for_eng | 47 | 25 | 24 re-rendered, 1 relinked |
| por_for_eng | 12 | 6 | re-rendered |
| lav_for_eng | 10 | 5 | re-rendered |
| ara_for_eng | 2 | 1 | re-rendered (the other was relinked on 14 Aug) |
| spa_for_eng | 4 | 0 | text-only, verified — no audio ever existed |

**72 pod rows** now have audio that says exactly what their text says. Every clip kept its own
cast voice — the tool re-resolves the voice from the pod cast and refuses the clip if it does
not match what was already there, so nothing was quietly recast.

Nothing was deleted. Every superseded clip is still on S3, and every swap is recorded in
`course_audio_revisions` with your approval quoted verbatim, so any of this can be put back.

## The one that needs you

**lav_for_eng, the Learner saying she is glad** — `priecīgs(-a)` should become `priecīga`.

I rendered it, and it passed every check except the one that proves the masculine ending is
gone. whisper hears `priecīgi` — which is neither `priecīga` nor `priecīgs`, sitting exactly
one letter from each — so the check genuinely cannot tell the two apart. I escalated to the
bigger whisper model rather than lowering the bar, after first proving on the OLD clip that the
bigger model can hear this contrast at all. It still hears `priecīgi`. That is a real limit of
the machine on Latvian's final-vowel gender contrast, the same wall the Icelandic clips hit a
fortnight ago.

So I left it alone. **The old clip is still what learners hear.** The candidate render is made
and waiting. It is the last pair on the evidence page — if it says *priecīga* to you, say so and
I will swap it in.

## What surprised me, and what I did about it

The first full pass rendered 27 clips and **refused 9**. Every one of those nine was good
audio failing a bad check, and each refusal left the live clip untouched — which is exactly
what make-before-break is for. Three separate blind spots, all in my own verification:

1. **Arabic can't be checked by spelling distance.** `عايز` is literally contained inside
   `عايزة`, so any correct rendering of the feminine form looks one letter away from the
   masculine one. I replaced distance with *counting*: the corrected line says that sound once,
   the broken line said it twice. On the re-run it heard it exactly once — a positive result,
   not a shrug.

2. **whisper runs Latvian words together.** `gatava sākt` came back as one blob, `gatavasak`,
   equally far from the right answer and the wrong one. Fixed by scoring both candidates the
   same forgiving way; it then read 0 from the correct form and 1 from the superseded one.

3. **Clip length proves nothing on the xAI voices.** I had assumed removing a word always makes
   a clip shorter. True for the Azure voices. Not true for xAI, which has no speed control and
   simply speaks at a different pace each time — one Polish clip came back *longer* with seven
   words than the old one had been with eight. Six perfectly good clips were being rejected for
   a property of the voice engine.

I fixed the instruments rather than loosening the gates, and re-tested each against deliberately
broken audio first — all three still reject a clip that really does say both genders. Then eight
of the nine passed.

**A note on what the old audio actually said.** The plate summary said 38 of 39 clips already
spoke the right form. The opposite was true: the recordings show the synthesiser reading both
words out loud — "jak się pan pani ma", "obrigada-a", "fico cansado a". One exception worth
knowing: on some Latvian lines Azure silently *skipped* the bracketed ending, so those clips were
not saying both genders — they were confidently saying the wrong one. Either way they needed
replacing.

## Two things I checked and did not touch

- **The Arabic Barista is cast with a male voice** though the role is written as female. The line
  is "what would *you* like?", so the ending follows the customer, not the speaker — it does not
  affect this fix. Flagging it rather than quietly re-deciding your cast.
- **The Thai gap has closed.** The speakers previously reported as having no cast entry all
  resolve to real voices now; none falls back to the default male voice.

## Deliberately left alone

The wider estate still has parenthetical and slash text on tens of thousands of *non-pod* rows
(Hindi 1,326, Swahili 1,231, Nepali 1,169 — a mix of genuine breaches and false alarms). That was
never part of A-119 and it is a much bigger job. It needs its own decision from you.
