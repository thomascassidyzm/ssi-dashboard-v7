# Croatian Pod 1 — one listen needed: do these read as a man and a woman?

2026-08-24. This is a **taste call, not a bug report.** Everything measurable has been
measured; what's left needs your ear and nothing else.

## The question

`hrv_for_eng` Pod 1 is cast with `hr-HR-SreckoNeural` (declared male) and
`hr-HR-GabrijelaNeural` (declared female). Measured on the served bytes, the two voices
are **clearly two different speakers** — but their **pitch ranges overlap almost
completely**, which no other course in the fleet does.

Play one of each. If they read as a man and a woman, there is nothing to fix and I'll
close this. If Srecko doesn't read as male to you, the fix is a different Croatian voice,
which means a re-render and your trigger.

**Srecko — cast as the MALE voice**

https://watson-1.tail4968cb.ts.net/evidence/hrv-voice-contrast-2026-08-24/Srecko-cast-MALE-1.mp3

https://watson-1.tail4968cb.ts.net/evidence/hrv-voice-contrast-2026-08-24/Srecko-cast-MALE-2.mp3

**Gabrijela — cast as the FEMALE voice**

https://watson-1.tail4968cb.ts.net/evidence/hrv-voice-contrast-2026-08-24/Gabrijela-cast-FEMALE-1.mp3

https://watson-1.tail4968cb.ts.net/evidence/hrv-voice-contrast-2026-08-24/Gabrijela-cast-FEMALE-2.mp3

## What the measurement says

Six longest clips per voice, all dense enough to trust (184–386 voiced frames each —
not short-clip noise). Median F0 over voiced frames:

| Gabrijela (cast female) | Srecko (cast male) |
|---:|---:|
| 156.9 Hz | 145.5 Hz |
| 160.0 Hz | 150.9 Hz |
| 160.0 Hz | 163.3 Hz |
| 163.3 Hz | 163.3 Hz |
| 166.7 Hz | 166.7 Hz |
| 166.7 Hz | 177.8 Hz |

Gabrijela spans 157–167 Hz, Srecko spans 146–178 Hz. **They sit on top of each other.**
A typical course in this fleet separates cleanly — Italian is Ara 182–243 Hz against Enzo
99–119 Hz; German is 232 Hz against 105 Hz.

**But they are unambiguously two different speakers.** MFCC timbre distances: within
Gabrijela 1.2–4.5, within Srecko 1.3–3.1, **between them 5.9–7.3** — a textbook clean
split, with no overlap at all between the within- and between-group distances. So this is
not "one voice doing both parts". Two people, similar pitch.

That is why it needs your ear rather than more measurement: a low-pitched woman and a
high-pitched man still read as two people, and whether that lands is a taste judgement no
F0 threshold can make.

## Why this surfaced

Worker #282's fleet census flagged `hrv_for_eng` as AMBIGUOUS and recommended a full
231-clip census plus a human listen-through. **I do not think the full census is worth
running.** The overlap it found is real and I reproduced it on better data, but a census
of 231 clips would only restate what six clips per voice already show conclusively — the
ranges overlap. The open question was never *how much* they overlap; it's whether the
result sounds right, which is one listen, not 231 measurements.

## What this is NOT

- **Not the Italian defect.** That was split-clip arrays inherited positionally from a
  retired pod, since repaired. Croatian carries that defect too and it is being repaired
  separately under the same gated tool.
- **Not the Swedish flag.** #282 also reported ~15% of Swedish "Alice" clips rendering
  male (102–118 Hz). I re-measured all four flagged clips against six controls from the
  same pod: the flagged clips measure **176–182 Hz**, the controls **174–211 Hz**. Same
  voice, same range. Those readings were octave/subharmonic errors from an F0 estimator
  searching below the voice's true range. **There is no Swedish defect and no re-render is
  needed.** The same artefact produced #279's single Italian outlier (scene 19 sentence 6,
  reported at 109.9 Hz, re-measured at 165.0 Hz).

## The ask

One listen, one sentence: do Srecko and Gabrijela read as a man and a woman? If yes I
close it. If no, I'll bring you a voice swap to approve.
