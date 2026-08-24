# Enzo is quieter — measured, and fixed

Your ear was right, and it was right about something the estate's loudness meter physically cannot
see. Two separate things are going on. One I have fixed. The other is a taste call and it is yours.

---

## The headline

I measured all **904 clips of Italian Pod 1**, fetched from the live learner URL — the actual bytes
your phone receives, not a local re-render.

**On the standard meter, Enzo is 0.5 dB quieter than Ara.** That is nothing. Nobody could hear it.

**On a phone speaker, Enzo is 3.9 dB quieter than Ara, 4.6 dB quieter than Olivia and 4.9 dB
quieter than the English Tom voice.** That is a lot, and it is what you heard.

The reason both sentences are true: a phone speaker reproduces almost nothing below 500 Hz. Strip
that band out and every voice loses some loudness — but Enzo loses **9.1 dB** where everyone else
loses about **5**. His voice keeps an unusual share of its energy down in the bass, exactly where a
phone throws it away.

| voice | full-band LUFS | phone-band LUFS | lost to the phone |
|---|---|---|---|
| Tom (English) | −15.8 | −21.4 | 5.6 dB |
| Olivia (English) | −16.9 | −21.7 | 4.8 dB |
| Ara | −16.8 | −22.4 | 5.6 dB |
| **Enzo** | **−17.2** | **−26.3** | **9.1 dB** |

Every loudness gate in the estate measures the second column. You were listening to the third.

---

## Hear it

The exchange is Pod 1, scene 22 — Ara asks, Enzo answers.

**Ara, as she is live now:**

https://watson-1.tail4968cb.ts.net/loudness-2026-08-24/1-ara-live.mp3

**Enzo answering her, as he is live now** — this is the drop you heard:

https://watson-1.tail4968cb.ts.net/loudness-2026-08-24/2-enzo-live.mp3

**The same Enzo line, re-mastered through the fixed chain** (−19.0 → −15.9 LUFS):

https://watson-1.tail4968cb.ts.net/loudness-2026-08-24/3-enzo-fixed.mp3

**The same line again, re-mastered AND lifted above 500 Hz** — this is the one that matches Ara on
a phone, and it is the taste call:

https://watson-1.tail4968cb.ts.net/loudness-2026-08-24/4-enzo-fixed-plus-tilt.mp3

Listen to the first two back to back on the phone speaker, then the first and the last. Nothing here
is live; every one of these is a preview file.

---

## What was actually broken in the mastering

You said the process "now seems pretty good" and it is — but it never checked its own work.

`normalizeAudioClean` measured the clip going **in**, worked out one gain, applied it, then ran the
true-peak limiter. The limiter pulls gain back out of a peaky voice. Nothing ever measured what came
**out**, so the shortfall was invisible to every gate and every report we have.

Measured on your live bytes: **the single pass lands 0.5 to 2.5 dB short of target — and it lands
shorter the more gain it had to apply.** So a voice that arrives quiet from the provider gets
punished twice. Enzo arrives quiet. The whole pod sits near −17 LUFS against a −15.5 target, and
**416 of the 904 clips are outside the declared band.**

**The fix**: the chain now measures its own output and corrects the gain, up to three passes,
stopping when it is inside 0.5 dB or when the limiter proves to be the floor. Each pass re-renders
from the original with a better gain number, so the file that ships has still been through exactly
one gain stage, one limiter and one fade. **No compressor came back** — your 2026-07-29 hiss ruling
is untouched — and nothing was added to the chain. It just aims properly now.

---

## Proof on the sample

110 clips re-mastered from the existing bytes — scenes 1, 4, 11 and 15–22, the ones you were in.
Zero TTS, zero spend, nothing live touched.

| | before | after |
|---|---|---|
| Ara, median | −16.8 | **−15.8** |
| Enzo, median | −17.6 | **−15.9** |
| **Enzo-vs-Ara gap, full band** | **0.8 dB** | **0.1 dB** |
| **Enzo-vs-Ara gap, on a phone** | **4.05 dB** | **2.4 dB** |
| clips reaching target | — | **110 of 110** |

The phone gap improves too — from 4.05 to 2.4 dB — because Enzo needed the most gain and so gained
the most. But it does **not** close, and it never will from a gain stage: the remaining 2.4 dB is
spectral, not level.

---

## The one decision for you

**Do you want Enzo lifted above 500 Hz so he matches the others on a phone?**

A +5 dB shelf above 500 Hz brings the phone gap from 2.4 dB to **0.05 dB** — the fourth clip above.
It costs nothing and it is reversible. What it does is change his timbre slightly: a little less
chest, a little more presence. On headphones he will sound marginally brighter than he does today.

That is a taste question about a voice, so it is yours and I have not applied it anywhere.

- **A — yes, lift him.** I add a per-voice tilt to the render chain and it applies to future renders.
- **B — no, leave his timbre alone.** The loudness fix stands on its own and Enzo stays about 2 dB
  down on a phone.
- **C — not sure, let me listen again.**

**And a second, separate question**: the pipeline fix only affects **future** renders. Everything
already rendered — Italian Pod 1 included — is still at −17. Re-mastering the existing estate costs
no money (it is a re-process of bytes we already hold, not a re-render), but it is thousands of
clips and it must go make-before-break, so it is your call, not mine. **Re-master the existing
estate too, or leave it?**

---

## What landed, and what did not

**Landed** — on `fix/loudness-similarity-voices`, not merged, not deployed:

- `tools/audio/measure-loudness-by-voice.cjs` — measures loudness **per voice** on served bytes and
  reports the gaps between voices. The estate could measure "is this clip near target"; it could not
  measure "does this voice match that one", which is the question you asked. 14 tests.
- `services/audio-processor.cjs` — the closed-loop normaliser, plus the pure convergence decision
  it is built on. 10 tests.
- `services/phases/phase8-audio-v13.cjs` — wired at `masterAudio`, the one entry point every render
  path goes through, and it now records the achieved loudness and its verdict instead of discarding
  the measurement.
- `tools/audio/remaster-sample-preview.cjs` — the sample re-master that produced the numbers above.

**Not done, deliberately**: no live bytes were touched, nothing was deleted, no TTS was generated,
and no pod text or casting was changed.

**One thing I should flag**: the loudness *gate* the brief asked me to wire up turned out to be
wired already — `gate-stack.cjs` has loudness as a refusing tier. What was missing was the
render-time half, and that is what I added.

**A gap in the evidence, stated honestly**: the phone-speaker measurement is a 500 Hz high-pass
model, not a measurement of your actual handset. It is crude. It is also the only measurement that
agreed with your ear, and the direction and rough size are solid — but if you want the number to
three decimal places, that would need a real device measurement.
