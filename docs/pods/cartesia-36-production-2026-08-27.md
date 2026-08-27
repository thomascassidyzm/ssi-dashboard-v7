# sonic-3.6 is now what the courses render on

**2026-08-27.** Your ear picked it off the grid; it is wired, tested and verified against the live API. Three things changed, one of them by staying exactly as it was.

## Hear it first

The short line is where the courses live, and it is where the two models are furthest apart. Both of these came off the API tonight, through the real production call, at the real production file size. Nothing has been done to either one — no volume matching, no mastering, no polish. What you hear is what the pipeline now hands to the next stage.

**Before — `sonic-3`, what every Cartesia clip on the course was rendered with**

https://watson-1.tail4968cb.ts.net/evidence/cartesia-36-production-2026-08-27/short-before-sonic-3.mp3

**After — `sonic-3.6`, what it renders with from now on**

https://watson-1.tail4968cb.ts.net/evidence/cartesia-36-production-2026-08-27/short-after-sonic-3.6.mp3

The old one is nearly ten decibels quieter. That is the whole hissy-Pod-1 mechanism in one pair of clips: our mastering was having to shout at a whisper, and it amplified the room with the voice.

| Short line, straight off the API, at our small file size | `sonic-3` | `sonic-3.6` |
|---|---|---|
| Integrated loudness | −31.5 LUFS | **−21.7 LUFS** |
| True peak | −16.0 dBFS | **−3.4 dBFS** |
| Lift our mastering must add to reach −16 | ~15 dB | **~5 dB** |

Same voice, same words, same settings, same night.

## What changed

**1. The model moved.** `sonic-3` → `sonic-3.6`, as one named constant that every Cartesia render in the estate reads. It is Cartesia's own default now too, but it stays an explicit pin rather than being left to float — a floating default is a voice that can change under a course without anyone asking it to.

**2. The file did NOT get bigger, on purpose.** You heard zero difference between full-quality and compressed, so the small file wins: 24 kHz, 128 kbps MP3, staying exactly where it was against Cartesia's 44.1 kHz default. That is now written into the code as a decision with your ruling attached, not as an oversight waiting for a tidy-up — and there is a test that fails if someone raises it "for quality". Concretely, tonight's short line came out **31.5 kB on sonic-3.6** where the same line at 44.1 kHz would be roughly double, across every clip of every course, forever.

**3. The British-English steer is resolved.** On `sonic-3` nobody could say whether `locale: en-GB` did anything — Cartesia's API reference says locale needs 3.6 or newer, the API accepts it silently either way, and no log would ever have told us. On 3.6 that ambiguity is gone at the documentation end: it is a supported parameter and we are sending it to a model that supports it. So `en-GB` stays, and it now means something.

While resolving it I found a real hole one layer up and closed it. The preview path was quietly manufacturing `locale: 'auto'` whenever a voice config simply hadn't said which language it wanted. Underneath, the render code deliberately treats a *missing* steer as a hard failure and an *explicit* `auto` as a warned, deliberate choice — so that fallback was converting a stop sign into a console line nobody reads. It now passes nothing when nothing was configured, and the hard failure fires as designed. That matters more on 3.6 than it did on 3, because the steer actually shapes the phonology: an English-dominant clone handed a Spanish line with nothing said about language reads it in English and writes a perfectly correct-looking row behind it.

## What I could not prove, stated plainly

**I could not measure the locale steer working.** I tried: French text rendered on sonic-3.6, three takes steered `fr-FR` and three steered `en-GB`, decoded by a language detector. The result leans the right way — the correctly-steered takes read as French, the wrongly-steered ones as English — but at three takes a side, with no seed parameter to hold anything still, that is corroboration and not a measurement. Cartesia gives no way to observe which steer it applied. The documentation is now unambiguous and the code does the right thing; the live proof is a gap, and I would rather name it than dress it up.

The two unknowns from the grid doc are still unknowns: what `play.cartesia.ai` actually applies when you click generate, and whether our pinned `Cartesia-Version: 2026-08-14` header suppresses anything shipped since. Both are questions for Cartesia support, not for guesswork.

## Verification

Not a dry run. Eighteen real renders through `ttsService.generate(..., 'cartesia', ...)` — the exact function Phase 8 calls, with the exact production defaults — all returning 24 kHz / 128 kbps MP3 on `sonic-3.6` with `locale: en-GB` accepted. 29 unit tests green across the two touched services, including new ones that pin the model, the small format and the no-invented-steer rule.

**No course audio was touched.** Cartesia is forward-only: this changes what gets rendered next, never what already exists.

## The one thing that is now yours

There are **91 live Cartesia clips**, all of them the `spa_for_eng` Pod 1 known track, all rendered this evening on `sonic-3` at the loudness you just heard. They are the exact set your ear complained about. Re-rendering them on 3.6 is 91 short clips — cheap, quick, and make-before-break, so nothing goes silent. It is a spend and a content change, so it is your call, not mine.

Everything else is done.
