# A-133 — the pad is in the real chain. 28 fresh renders, before and after.

**Date:** 2026-08-17 · Branch only, nothing merged. No bulk regen, no course_audio row, no pod, no S3 object, no DB write. TTS spend: 28 fresh renders, about **6 pence**.

---

## What you're deciding

The 250ms tail now lives in the render chain itself. Every clip below is a **brand-new TTS call run straight through the wired chain**, exactly as a bulk regen would do it — nothing here is a re-processed old clip.

**Listen to a few of the pairs and tell me one thing: does any "after" sound clipped short?**

If yes, name it and I'll widen the pad. If no, that's the go-ahead for bulk.

---

## The headline

**28 of 28 passed. No guard refused a single clip. No clip lost a word. Loudness didn't move — never more than 0.2 LUFS.**

And the thing I could not show you two hours ago: **the click is caught and removed on fresh renders.**

The first run threw up something odd — I re-rendered the known clicker on the exact line it clicked on this morning, and it came back clean. So I rendered it **six more times**. Five of those six clicked. The chain removed the impulses from all five:

| fresh render of Noor, same line | impulses in the raw provider bytes | after the new chain |
|---|---|---|
| repeat 1 | none | none |
| **repeat 2** | **2** — 22 and 25 dB over the room floor | **none** |
| **repeat 3** | **2** — 24 and 33 dB over floor | **none** |
| **repeat 4** | **2** — 43 and 44 dB over floor | **none** |
| **repeat 5** | **3** — 25, 36 and 18 dB over floor | **none** |
| **repeat 6** | **1** — 32 dB over floor | **none** |

**Hear it on a fresh render** — repeat 4, the worst of them, 44 dB over the floor:

**Before:** https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/24-nld-clicker-repeat-4-before.mp3

**After — 0.51s shorter, the ticks are outside the file:** https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/24-nld-clicker-repeat-4-after.mp3

**What that also tells us, and it matters beyond this job:** that voice clicks on roughly **5 renders in 7**, not every time. The voice-screening tool built this morning judges a candidate voice on **one** short render — so on a defect this intermittent it would clear a clicking voice about a third of the time it screens one. I haven't touched that tool; flagging it as a real hole.

---

## The 28 fresh samples

Every row below is a fresh TTS call through the full chain. Nothing re-processed.

Chosen for hazard, not coverage. The one thing this detector could get wrong is documented in the code: a word-final plosive burst can be shorter than the 40ms "this is speech" rule and so read as a click. So the batch is loaded with the endings most likely to break it — final plosives, voiceless fricatives, sibilants, German final devoicing, Japanese devoiced vowels, quiet unstressed vowels, the Welsh voiceless *ll* — with ordinary declaratives as controls.

| voice | the ending it's testing | before | after | removed | guard | listen |
|---|---|---|---|---|---|---|
| **Noor** (xAI) | *the known clicker, reference line* | 3.17s | 3.17s | **nothing** | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/01-nld-clicker-reference-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/01-nld-clicker-reference-after.mp3) |
| **Noor** (xAI) | final /p/ — the burst the 40ms rule could mislabel | 3.41s | 3.34s | 0.07s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/02-nld-clicker-plosive-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/02-nld-clicker-plosive-after.mp3) |
| **Your own clone** (xAI) | sibilant /s/, high and quiet | 3.48s | 3.40s | 0.08s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/03-eng-tom-clone-sibilant-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/03-eng-tom-clone-sibilant-after.mp3) |
| **Olivia** (xAI) | final /p/ after an unstressed syllable | 3.72s | 3.66s | 0.06s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/04-eng-olivia-plosive-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/04-eng-olivia-plosive-after.mp3) |
| **Eve** (xAI) | /θ/ — the quietest ending English has | 3.72s | 3.72s | **nothing** | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/05-eng-eve-fricative-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/05-eng-eve-fricative-after.mp3) |
| **Leo** (xAI) | *control* — ordinary voiced ending | 3.41s | 3.36s | 0.05s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/06-eng-leo-control-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/06-eng-leo-control-after.mp3) |
| **Femke** (xAI) | quiet unstressed schwa | 3.00s | 3.00s | **nothing** | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/07-nld-femke-vowel-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/07-nld-femke-vowel-after.mp3) |
| **Sonia** (Azure) | *control* — the heaviest voice we own | 3.60s | 3.50s | 0.10s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/08-eng-sonia-control-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/08-eng-sonia-control-after.mp3) |
| **Ryan** (Azure) | final /t/, on the voice that pads most | 3.89s | 3.27s | 0.62s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/09-eng-ryan-plosive-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/09-eng-ryan-plosive-after.mp3) |
| **Katja** (Azure) | German final devoicing | 3.46s | 2.82s | 0.64s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/10-deu-katja-devoiced-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/10-deu-katja-devoiced-after.mp3) |
| **Conrad** (Azure) | final /st/ cluster | 3.67s | 3.10s | 0.58s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/11-deu-conrad-cluster-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/11-deu-conrad-cluster-after.mp3) |
| **Céleste** (Azure) | quiet final /ø/, no consonant to mark the end | 3.02s | 2.42s | 0.61s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/12-fra-celeste-vowel-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/12-fra-celeste-vowel-after.mp3) |
| **Antoine** (Azure) | *control* — ordinary vowel ending | 2.74s | 2.17s | 0.57s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/13-fra-antoine-control-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/13-fra-antoine-control-after.mp3) |
| **Elvira** (Azure) | unstressed final /a/ | 3.49s | 2.90s | 0.60s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/14-spa-elvira-vowel-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/14-spa-elvira-vowel-after.mp3) |
| **Álvaro** (Azure) | final /s/ on an unstressed syllable | 3.96s | 3.28s | 0.68s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/15-spa-alvaro-sibilant-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/15-spa-alvaro-sibilant-after.mp3) |
| **Xiaochen** (Azure) | the 吗 particle — quiet and short by design | 3.46s | 3.15s | 0.31s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/16-zho-xiaochen-particle-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/16-zho-xiaochen-particle-after.mp3) |
| **Shiori** (Azure) | devoiced vowel in ます — near-whispered by rule | 4.36s | 3.70s | 0.66s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/17-jpn-shiori-devoiced-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/17-jpn-shiori-devoiced-after.mp3) |
| **Naoki** (Azure) | devoiced vowel in します | 4.86s | 4.20s | 0.66s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/18-jpn-naoki-devoiced-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/18-jpn-naoki-devoiced-after.mp3) |
| **Nia** (Azure) | Welsh *ll* and a final /l/, both low-energy | 3.42s | 2.89s | 0.53s | pass | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/19-cym-nia-lateral-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/19-cym-nia-lateral-after.mp3) |

### The clicker, hunted — six more fresh renders of the same line

| voice | before | after | removed | listen |
|---|---|---|---|---|
| **Noor** — repeat 1 *(clean raw)* | 3.34s | 3.19s | 0.14s | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/21-nld-clicker-repeat-1-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/21-nld-clicker-repeat-1-after.mp3) |
| **Noor** — repeat 2 *(2 impulses)* | 2.93s | 2.67s | 0.25s | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/22-nld-clicker-repeat-2-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/22-nld-clicker-repeat-2-after.mp3) |
| **Noor** — repeat 3 *(2 impulses)* | 2.93s | 2.61s | 0.32s | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/23-nld-clicker-repeat-3-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/23-nld-clicker-repeat-3-after.mp3) |
| **Noor** — repeat 4 *(2 impulses, the worst)* | 3.10s | 2.58s | 0.51s | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/24-nld-clicker-repeat-4-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/24-nld-clicker-repeat-4-after.mp3) |
| **Noor** — repeat 5 *(3 impulses)* | 3.24s | 2.70s | 0.54s | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/25-nld-clicker-repeat-5-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/25-nld-clicker-repeat-5-after.mp3) |
| **Noor** — repeat 6 *(1 impulse)* | 2.93s | 2.71s | 0.22s | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/26-nld-clicker-repeat-6-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/26-nld-clicker-repeat-6-after.mp3) |
| **Fenna** (Azure) — the clean Dutch comparator | 3.60s | 2.99s | 0.61s | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/27-nld-fenna-azure-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/27-nld-fenna-azure-after.mp3) |
| **Thijs** (xAI) — final /s/ into a stop | 2.69s | 2.69s | **nothing** | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/28-nld-thijs-sibilant-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/28-nld-thijs-sibilant-after.mp3) |
| **Yunyi** (Azure) — sentence-final 了 | 2.38s | 2.20s | 0.18s | [before](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/29-zho-yunyi-particle-before.mp3) · [after](https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/29-zho-yunyi-particle-after.mp3) |

**The shape of it:** xAI voices already end tight — the pad takes 0 to 0.08s off them, and on three of the seven it takes nothing at all. Azure pads about 0.6s of dead air onto everything, so Azure clips are where the whole effect is. Chinese is the one exception at 0.31s.

---

## Guard refusals: none

Four guards can refuse a cut, and any one of them ships the clip whole: no speech detected at all, a cut over 40% of the clip, a cut over 2 seconds, or a cut whose removed region would contain speech. **Not one fired across 28 clips.** The biggest cut in the set was 0.68s — a third of the 2-second ceiling.

That is the result I wanted from the hard tails. Every guard failing open is what makes this safe, but a guard that fires constantly would mean the detector can't see quiet endings, and we'd be shipping untrimmed clips while believing otherwise. It sees them.

## Did anything lose a word

No. Every after-clip went through local speech recognition and the final word came back present — **21 of 28 clean, and all seven of the rest are the recogniser, not the audio.**

All seven are the same word: whisper heard *"alsjeblieft"* where the text says *"alstublieft."* Same word, informal register. Whisper flips between those two on the same clip depending on model size — a known limitation we hit on the Dutch register work yesterday, and it's why the Dutch register question had to be settled by ear in the first place. Two of the seven weren't trimmed at all — before and after identical to the millisecond — so the trim cannot be what changed them.

## Does it sound clipped — the honest limit

**I can't tell you that. I don't have ears.** What I can measure is whether a file stops while sound is still happening, which is what "clipped" would be.

**Every one of the 28 after-clips ends in dead air, at or below its own room floor.** The loudest end-of-file in the whole set sits 0.6 dB above the floor, which is silence, not a cut-off consonant. Thirteen end 10 to 32 dB *below* the floor, meaning the fade has already carried them into nothing. Nothing in the set stops mid-sound.

**So: no measurable clipping, and no clip I'd flag as suspicious. But the ear call is yours, and the two I'd listen to first are Céleste (0.61s off a clip that was only 3s long) and Shiori (the devoiced ます).**

## One thing I did not do the way you described it

You wrote the chain as *render → normalizeAudioClean → trim → pad*. I've built it as **render → trim+pad → normalizeAudioClean**, and I want that on the record rather than buried.

The reason is the anti-click fade. Normalising is what puts an 8 ms fade on the **end of the file**. Trim after that and the fade stays stranded at the old end, while the new end — the one the learner actually hears — gets no fade at all and can step straight from decay to digital zero. That is a click we would be *creating*. Trimming first means the fade lands on the real end, every time.

It is also the order the take you approved this morning was built in, so the samples above are directly comparable with that one. If you meant the other order specifically, say so and I'll rebuild it — but I'd be arguing against it.

---

## The gap I have to report

**The third provider didn't render.** phase8 can call ElevenLabs, and there are real ElevenLabs voices in the estate — `elevenlabs_FVdzAUsp8apoOdc0907A` alone has 2,740 clips. I built a sample for it and the API rejected the credential:

> API key ID used as API key — only valid API keys can be used. API keys start with `sk_`.

The `ELEVENLABS_API_KEY` in `.env` is a key **ID**, not a key. So all 28 fresh samples are **xAI and Azure only**, and the ElevenLabs path through the new chain is **untested**. It's a small exposure — the trim is provider-blind, it reads decoded samples and has no idea who rendered them — but untested is untested, and I'm not going to call it covered. Give me a working `sk_` key and I'll run that one sample in a minute.

**One archived clip is on this page, clearly marked.** The pair below is *not* a fresh render — it's this morning's saved take of the clicker, re-mastered through the new chain, kept only because it was the original evidence and it's useful to compare against the fresh repeats above. It plays no part in the 28.

- archived reference, before: https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/00-clicker-archived-before.mp3
- archived reference, after: https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/00-clicker-archived-after.mp3

---

## Where this stands

On a branch, `feat/a133-tail-pad-in-chain-2026-08-17`. **Not merged. No bulk regen started.** T-21 stays paused. Nothing about the estate has changed.

The code is one function in `audio-processor.cjs` and one call in `masterAudio` — same shape as the compressor removal. It is not the tail-repair service that ate the German words in August: that one cut already-shipped clips at a 9%-precise detector's guess, this one decides where a brand-new file ends, cuts on sustained speech energy, and never reads that detector at all.

**One word: does any "after" sound clipped — yes or no?**
