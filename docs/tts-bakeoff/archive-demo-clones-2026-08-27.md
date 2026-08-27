# Aran — a clone of your English voice, for you to hear

**2026-08-27. Rebuilt.** The first attempt was made from the wrong source and has been deleted; this is built from pure English. Detail at the bottom.

**Aran: this is a demo, and it is yours to refuse.** We built a voice clone from your existing SSi English recordings to see whether it is good enough to carry English instruction. **Nothing will be published or used in any course in your voice unless you say yes.** If you would rather we did not, that is the end of it — no explanation needed.

No new recording was made and nothing was asked of you.

**Welsh does not come into it at all.** Cartesia does not do Welsh, and Welsh stays human-recorded by standing rule. This is only about English — and, as it turns out, the source needs to be *only* English too.

---

## The recording it was built from

23.3 seconds of your own English, taken from an **instruction** clip — continuous spoken English, no target-language content anywhere in it:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-v2/aran-source-english.mp3

## The clone, saying things you have never said

**A longer passage:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-v2/aran-long.mp3

**A teaching line:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-v2/aran-teach.mp3

**Questions:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-v2/aran-question.mp3

**Short drill lines:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-v2/aran-short.mp3

---

## What you should listen for, honestly

Two things worth saying plainly rather than leaving you to discover them:

- **It wanders on short phrases.** Ask for the same three words twice and they can come back at noticeably different speeds — measured at up to double, on the shortest lines. Longer passages are much steadier. The short drill clip is where you will hear it if it is there.
- **This is an instant clone from 23 seconds.** There is a "Pro" version trained on 30+ minutes that would likely hold steadier, and there are roughly 115 minutes of your English already in the archive if it is ever wanted. Nothing has been trained — that would be a separate conversation and a separate yes from you.

## The three answers that would help

1. **Yes / no / not yet** — on using a clone of your English voice at all.
2. If yes: **is this one good enough**, or does it need the longer-trained version?
3. Anything specific that sounds wrong — "this clip, this bit" beats a general impression.

---

## What went wrong the first time, and why it is fixed

**The first clone was built from a `presentation` clip whose text was:** *"The Welsh for: 'to improve', as in — 'I'm going to try to improve', is:"* — an English lead-in that hands over to a Welsh word. Welsh phonemes in the reference audio bleed into an English clone; the clone inherits whatever it is shown.

That clip was selected on the strength of a report describing it as pure-English single-speaker audio, and **the report was believed without anyone reading the clip's own text.** That is the whole of the mistake. The text was one query away and would have shown the Welsh immediately.

**The rebuild is selected differently.** The source is an `instruction` clip — a clip type that is by construction pure spoken English with no target-language content — and its full text was read and checked before anything was built, along with a scan for non-English characters across every candidate.

- **New clone: `aran_english_002`** — `5dbda845-90c5-477f-a6fd-f842e00a0d15`. Source `mastered/CEAD2396-9CFE-2486-8F4E-503EE038D2CE.mp3`, `human_recording` / `instruction` / `eng`, trimmed 0–23.28s on a natural pause, otherwise unmodified.
- **Old clone: `aran_english_001` deleted** — `d318a91c…` returns 404, and its demo clips and contaminated source file are removed from the evidence directory. It is superseded, not merely relabelled.

**Notes for Tom:** Catrin's clone remains deleted and unneeded — every clip attributed to her is Welsh. No PVC training started, no slot spent.
