# Cartesia on short phrases — the test that killed ElevenLabs

**2026-08-27.** You liked Cartesia's long-form clip. This is the harder question, and the one that ended ElevenLabs: **on short phrases, does the same text come back the same way twice?** A course drills short LEGOs and asks a learner to compare takes. A voice that wanders between takes teaches wobble.

**The finding, before the evidence: it wanders, and it is real wander, not padding.** Fifty-nine clips, every call HTTP 200, no failures. Nothing is running at volume — this is the sample the policy asks for.

---

## 1. Take-to-take consistency — 8 phrases, 5 takes each

Every one of the 40 takes came back **byte-different**. There is no seed parameter on Cartesia's TTS endpoint, so identical input never produces identical output by design.

Duration is the crude proxy for wander. The first column is the raw file; the second strips leading and trailing silence, which is the honest number — silence is trimmable, speech rate is not.

| Phrase | Lang | Raw spread | **Speech-only spread** | Speech min–max |
|---|---|---|---|---|
| todo el día | es | 88% | **104%** | 0.48–0.98s |
| va a funcionar | es | 59% | **68%** | 0.60–1.01s |
| è una buona idea | it | 81% | **54%** | 0.90–1.39s |
| difficilmente | it | 48% | **31%** | 0.58–0.76s |
| fácilmente | es | 20% | **22%** | 0.64–0.79s |
| es una buena idea | es | 48% | **21%** | 0.92–1.12s |
| tutto il giorno | it | 24% | **17%** | 0.66–0.77s |
| perro | es | 57% | **15%** | 0.35–0.40s |

Median speech-only spread: **~26%**. The worst case is not marginal — *"todo el día"* takes twice as long on one take as another, three words, same text, same voice, same settings.

**Note the pattern, because it is the useful part.** The single word and the longest chunk are the steadiest. The two-to-three-word LEGOs are the worst. That is precisely the length the course lives at.

### Hear the worst case — "todo el día", five takes, nothing changed between them

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-lego1-t1.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-lego1-t2.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-lego1-t3.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-lego1-t4.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-lego1-t5.mp3

### And the best case — "perro", five takes

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-pair-t1.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-pair-t2.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-pair-t3.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-pair-t4.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spa-pair-t5.mp3

**Your ear decides what the numbers cannot.** A 15% spread on "perro" may be inaudible and fine. A 104% spread on "todo el día" may still be acceptable if every take is *well* spoken — variation is not the same as badness. Listen to the first five and ask: would a learner drilling this LEGO notice they were hearing a different performance each time?

---

## 2. The one knob that helps — `generation_config.speed`

There is no seed, but there is a speed control (0.6–1.5×). Pinning it to 1.0 on the worst phrase, five fresh takes:

| | Speech-only spread |
|---|---|
| "todo el día", default | **104%** |
| "todo el día", `speed: 1.0` pinned | **38%** |

**It roughly halves the wander. It does not remove it.** Same five takes, speed pinned — compare against the set above:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spd-lego1-t1.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spd-lego1-t2.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spd-lego1-t3.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spd-lego1-t4.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/spd-lego1-t5.mp3

Stated honestly: five takes per condition is a small sample, and these are two separate runs. The direction is clear; the exact figure is not precise.

---

## 3. Does `language` actually pin pronunciation? Yes — and use `locale`, not `language`

The test: words that are real in more than one language, generated once each way. Sub-second clips, and the difference should be obvious the moment you play them.

**"van"** — Spanish *they go* vs English *van*:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/loc-van-esES.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/loc-van-enGB.mp3

**"pie"** — Spanish *foot* (two syllables) vs English *pie*:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/loc-pie-esES.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/loc-pie-enGB.mp3

**"come"** — Italian *how* vs English *come*:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/pin-come-it.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/pin-come-en.mp3

**"sole"** — Italian *sun* vs English *sole*:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/pin-sole-it.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/determinism/pin-sole-en.mp3

The durations move in the right direction every time — "van" runs 0.60s as Spanish against 0.86s as English, "pie" 0.73s Spanish against 0.55s English — which is what you would expect if the language tag is genuinely reaching the model rather than being ignored. But duration is not pronunciation, and **only your ear confirms the vowels are right.** That is the actual check here.

**One thing for our pipeline, from their docs verbatim:** *"Prefer `locale` when you can. `language` only accepts base ISO codes like `en`."* So we should be sending `es-ES` / `es-MX` / `it-IT`, not `es` / `it` — which also gives us the es-ES against es-MX distinction the Spanish course already makes. Both worked in this test; the locale form is the one to build on.

---

## 4. What this costs and what it does not decide

Fifty-nine clips, all sub-two-seconds — a few hundred credits out of the Startup plan's 1.25M. No bulk generation has run, and none will until you have listened.

**What this does not tell you.** Whether the wander is audible enough to matter is a taste call and it is yours. Whether xAI or Chatterbox wander *less* on the same phrases is unmeasured — I tested the front-runner against the failure mode that killed ElevenLabs, not all three against each other. If you want the three-way consistency comparison, say so and it is a straightforward next run.

**My read, for what it is worth.** The wander is real and it concentrates exactly at LEGO length, which is the worst possible place for it. Speed-pinning halves it and costs nothing. That is probably enough to proceed with, *if* your ear says the takes are each well spoken — because a course can live with variation between takes far more easily than it can live with a bad take. What it cannot live with is a phrase that sounds hurried one day and laboured the next in the same lesson.
