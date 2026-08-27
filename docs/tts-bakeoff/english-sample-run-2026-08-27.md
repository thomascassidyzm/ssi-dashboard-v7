# Your English, 50 LEGOs, through the real pipeline

**2026-08-27.** 50 English known-side prompts from `zho_for_eng`, rendered in your Cartesia clone `tom_001` **through Popty's actual production chain** — not an ad-hoc loop. Cost: 424 characters ≈ 0.4K credits.

**The Mandarin clips are gone.** You were right that they tested nothing — your voice never speaks the target language; native voices do. The whole `sampling-run` directory is deleted rather than quarantined, so there is no junk to wade through and nothing that could later be mistaken for a result.

---

## What "the real pipeline" means here, precisely

Each clip went through the same three stages a production clip does, with the same code:

1. **`ttsService.generateWithRetry`** — via `buildTTSConfig`, so the Cartesia branch, the locale steer and the pinned speed all come from the config seam rather than from my script.
2. **`phase8.masterAudio`** — the real mastering chain: loudness normalisation to −16 LUFS, silence trim, end-of-speech tail handling.
3. **`audio-veracity.renderChecked`** — the pre-publish STT gate, which decodes the mastered audio with whisper and re-renders anything that fails.

**Only the publish step was omitted**: no `mastered/` S3 key, no `course_audio` row, nothing relinked. So this is the production pipeline measured, with the catalogue untouched.

---

## The result: words perfect, loudness not

**The words are flawless.** All 50 passed the whisper veracity gate **first time** — zero re-renders, zero quarantines. Whatever else is true, the clone says what it is given.

**The loudness does not hold, and this is the consistency answer you were after.**

| | |
|---|---|
| Target | **−16.0 LUFS** |
| Delivered | median **−16.5**, mean −16.7, range **−18.7 to −16.0** |
| Within 1 dB of target | **37 of 50** |
| **More than 1 dB quiet** | **13 of 50** |

The mastering stage said why, repeatedly and in plain words:

> *"loudness did NOT converge — −39.9 → −18.7 LUFS against a −16 target after 1 pass: next gain 26.6 dB exceeds the 20 dB ceiling — input is too quiet to lift cleanly"*

**Cartesia hands back audio at roughly −32 to −40 LUFS**, and `masterAudio` will not apply more than 20 dB of gain. So a quarter of the clips arrive at the learner up to 2.7 dB below everything around them. In a course this is audible as clips that feel like they drop in level — exactly the inconsistency Popty's batching is supposed to prevent, and it is the vendor's output level, not the pipeline's fault.

**The likely fix is cheap and untested**: Cartesia's `generation_config` takes a **`volume`** control alongside `speed`. Raising it should land the raw audio inside the 20 dB window and let mastering converge. I have not changed it, because that is a config decision on a live provider branch and this run existed to find the problem, not to quietly patch it. **Say the word and I will test it on ten clips.**

## Listen — the first 15

All 50 are the English prompts a learner actually hears in his voice. Loudness shown because it is where the pipeline flagged trouble; the target is −16.

**01 — "I want"**  *(S0001L01, 0.98s)*  ⚠️ -17.3 LUFS, more than 1 dB under target

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/01.mp3

**02 — "a little"**  *(S0009L02, 0.58s)*  ⚠️ -17.7 LUFS, more than 1 dB under target

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/02.mp3

**03 — "to come back"**  *(S0016L04, 1.22s)*  -16.5 LUFS

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/03.mp3

**04 — "might"**  *(S0024L02, 0.62s)*  -16.3 LUFS

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/04.mp3

**05 — "how long"**  *(S0033L01, 0.79s)*  -16.3 LUFS

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/05.mp3

**06 — "to need"**  *(S0044L02, 0.77s)*  -16.5 LUFS

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/06.mp3

**07 — "to put into"**  *(S0053L03, 1.08s)*  -16.5 LUFS

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/07.mp3

**08 — "difficult"**  *(S0066L02, 1.18s)*  ⚠️ -18.1 LUFS, more than 1 dB under target

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/08.mp3

**09 — "understand clearly"**  *(S0078L01, 1.08s)*  -16.4 LUFS

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/09.mp3

**10 — "answer in time"**  *(S0091L02, 1.32s)*  -16.3 LUFS

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/10.mp3

**11 — "why"**  *(S0099L02, 0.89s)*  ⚠️ -17.3 LUFS, more than 1 dB under target

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/11.mp3

**12 — "worse"**  *(S0114L01, 0.77s)*  -16.5 LUFS

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/12.mp3

**13 — "that was a surprise"**  *(S0130L02, 1.27s)*  -16.4 LUFS

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/13.mp3

**14 — "kind"**  *(S0147L02, 0.72s)*  ⚠️ -17.2 LUFS, more than 1 dB under target

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/14.mp3

**15 — "book"**  *(S0161L03, 0.77s)*  ⚠️ -17.8 LUFS, more than 1 dB under target

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/15.mp3


## The remaining 35

Links rather than players so the page opens on a phone. ⚠️ marks the ones the mastering stage could not lift to target.

[16 have to take](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/16.mp3) · [17 teacher](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/17.mp3) · [18 weekend](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/18.mp3) · [⚠️ 19 to practise](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/19.mp3) · [20 already learn a lot](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/20.mp3) · [21 you mean](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/21.mp3) · [22 time left](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/22.mp3) · [23 seem](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/23.mp3) · [24 room](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/24.mp3) · [⚠️ 25 company](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/25.mp3) · [26 several days ago](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/26.mp3) · [27 field](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/27.mp3) · [⚠️ 28 wednesday](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/28.mp3) · [29 towards the bus](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/29.mp3) · [30 thursday](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/30.mp3) · [31 community](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/31.mp3) · [32 to reduce](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/32.mp3) · [33 to see off](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/33.mp3) · [34 during](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/34.mp3) · [35 to consider](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/35.mp3) · [36 eyes](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/36.mp3) · [⚠️ 37 to plan](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/37.mp3) · [38 to move away](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/38.mp3) · [39 unable](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/39.mp3) · [40 hands](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/40.mp3) · [⚠️ 41 but](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/41.mp3) · [42 also](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/42.mp3) · [43 loud](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/43.mp3) · [44 to decide](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/44.mp3) · [45 feeling](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/45.mp3) · [⚠️ 46 toys](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/46.mp3) · [⚠️ 47 early](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/47.mp3) · [48 mistake](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/48.mp3) · [49 would like](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/49.mp3) · [50 manner particle de](https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/english-sample/50.mp3)

---

## What this does and does not settle

**Settles:** the clone survives the real pipeline, the STT gate passes it unanimously, and the one systematic defect is a measurable level shortfall with a named cause and a candidate fix.

**Does not settle:** whether it *sounds* like you across 50 clips in a row. That is your ear, and it is the reason this page has players rather than a table. Listen for whether clip 07 sounds like the same person as clip 43 — take-to-take consistency was the weakness the determinism run found, and 50 in a row is the first time it can be heard at course scale.

Sampling rule: every 23rd LEGO in course order across all 1,190. No cherry-picking. Every `lego_id`, duration, veracity verdict and attempt count is in the committed manifest.
