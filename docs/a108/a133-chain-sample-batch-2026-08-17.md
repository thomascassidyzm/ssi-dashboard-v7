# A-133 — the pad is in the real chain. 19 samples, before and after.

**Date:** 2026-08-17 · Branch only, nothing merged. No bulk regen, no course_audio row, no pod, no S3 object, no DB write. TTS spend: 19 short renders, about **4 pence**.

---

## What you're deciding

The 250ms tail now lives in the render chain itself — `masterAudio` calls it on every clip, so this is the audio the estate would actually produce. Everything below came out of that chain, not out of a probe.

**Listen to a few of the pairs and tell me one thing: does any "after" sound clipped short?**

If yes, name it and I'll widen the pad. If no, that's the go-ahead for bulk.

---

## The headline, and one honest caveat

**19 of 19 passed. No guard refused a single clip. No clip lost a word. Loudness didn't move — never more than 0.1 LUFS.**

The caveat, up front because it changes what this batch can prove: **not one of the 19 fresh renders contained a click.** Including the known clicker voice, on the exact line it clicked on this morning. I rendered Noor saying "Ik wil graag een glas bitter, alstublieft" again — same voice, same words — and this time the provider handed back a clean take with only 246ms of dead air on it, so the pad removed **nothing**.

So the click is not a property of that voice that fires every time. It's intermittent, render by render. That means this batch demonstrates the pad is *safe*; it can't demonstrate it *removes a click*, because there was no click to remove.

Here is the proof that it does, from this morning's archived take of the same voice and line, run through the new wired chain. Two impulses in the file before, none after:

**Before — the two ticks a quarter-second after the voice stops:**
https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/00-clicker-archived-before.mp3

**After — the new chain. 553ms shorter, the ticks are outside the file:**
https://watson-1.tail4968cb.ts.net/evidence/a133-chain-sample-batch-2026-08-17/00-clicker-archived-after.mp3

---

## The 19 samples

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

**The shape of it:** xAI voices already end tight — the pad takes 0 to 0.08s off them, and on three of the seven it takes nothing at all. Azure pads about 0.6s of dead air onto everything, so Azure clips are where the whole effect is. Chinese is the one exception at 0.31s.

---

## Guard refusals: none

Four guards can refuse a cut, and any one of them ships the clip whole: no speech detected at all, a cut over 40% of the clip, a cut over 2 seconds, or a cut whose removed region would contain speech. **Not one fired across 19 clips.** The biggest cut in the set was 0.68s — a third of the 2-second ceiling.

That is the result I wanted from the hard tails. Every guard failing open is what makes this safe, but a guard that fires constantly would mean the detector can't see quiet endings, and we'd be shipping untrimmed clips while believing otherwise. It sees them.

## Did anything lose a word

No. Every after-clip went through local speech recognition and the final word came back present — **18 of 19 clean, and the 19th is the recogniser, not the audio.**

That one is sample 1: whisper heard *"alsjeblieft"* where the text says *"alstublieft."* Same word, informal register. Whisper flips between those two on the same clip depending on model size — a known limitation we hit on the Dutch register work yesterday. And it can't be a trim artefact anyway: **that clip was not trimmed.** Before and after are the same 3.17 seconds.

## Does it sound clipped — the honest limit

**I can't tell you that. I don't have ears.** What I can measure is whether a file stops while sound is still happening, which is what "clipped" would be.

Every one of the 19 after-clips ends in dead air, at or within 0.6 dB of its own room floor — the loudest end-of-file in the set is Noor's plosive line at 0.6 dB above floor, which is silence, not a cut-off consonant. Eleven of them end 10 to 23 dB *below* the floor, meaning the fade has already taken them into nothing. Nothing in the set stops mid-sound.

**So: no measurable clipping, and no clip I'd flag as suspicious. But the ear call is yours, and the two I'd listen to first are Céleste (0.61s off a clip that was only 3s long) and Shiori (the devoiced ます).**

---

## The gap I have to report

**The third provider didn't render.** phase8 can call ElevenLabs, and there are real ElevenLabs voices in the estate — `elevenlabs_FVdzAUsp8apoOdc0907A` alone has 2,740 clips. I built a sample for it and the API rejected the credential:

> API key ID used as API key — only valid API keys can be used. API keys start with `sk_`.

The `ELEVENLABS_API_KEY` in `.env` is a key **ID**, not a key. So this batch covers **xAI and Azure only**, and the ElevenLabs path through the new chain is **untested**. It's a small exposure — the trim is provider-blind, it reads decoded samples and has no idea who rendered them — but untested is untested, and I'm not going to call it covered. Give me a working `sk_` key and I'll run that one sample in a minute.

---

## Where this stands

On a branch, `feat/a133-tail-pad-in-chain-2026-08-17`. **Not merged. No bulk regen started.** T-21 stays paused. Nothing about the estate has changed.

The code is one function in `audio-processor.cjs` and one call in `masterAudio` — same shape as the compressor removal. It is not the tail-repair service that ate the German words in August: that one cut already-shipped clips at a 9%-precise detector's guess, this one decides where a brand-new file ends, cuts on sustained speech energy, and never reads that detector at all.

**One word: does any "after" sound clipped — yes or no?**
