# Why the API clips don't sound like your dashboard ones — listen and decide

**2026-08-27.** Four Pod 1 English lines, eleven ways of asking Cartesia for them. Your ear picks the winner.

## First, the honest gap

**None of your own dashboard-made clips exist anywhere on this machine.** I looked in your home directory, the evidence shelf, the clone-source pack and the course voice config. The clone-source pack is your *own recorded voice*, not a dashboard render, so it can't serve as the reference. Everything below is best-guess parameter matching rather than matching a known-good target.

**If you can export one dashboard clip of any of these four lines and drop it anywhere in your home directory, I can put it at the top of this grid and the guessing stops.** That would be worth more than everything else here.

## What I found before rendering a single clip

I read our live production call, then fetched the current Cartesia docs. Three things have drifted apart.

**We are two model generations behind.** Our code asks for `sonic-3`. Cartesia's API now defaults to **`sonic-3.6`**, which their own docs call "our fastest, most natural text-to-speech model". `sonic-3.5` and `sonic-3.6` are both live on your account right now — I checked. The dashboard will be giving you the newest model; our courses are getting a two-generation-old one. **This is my prime suspect.**

**We ask for a much smaller file than the default.** Cartesia's default output is **44,100 Hz**. We ask for **24,000 Hz** MP3. That halves the audio bandwidth before anything else happens.

**Our British-English steer may be doing nothing at all.** The docs say `locale` requires Sonic 3.6 or newer. We send `locale: "en-GB"` *together with* `sonic-3`. The API accepts it without complaint, so nothing in our logs would ever tell us it was ignored — but on the documentation's own terms it should not be taking effect.

And one thing that isn't a Cartesia setting at all: **everything on the course goes through our own mastering stage afterwards**, which lifts the volume by 3 to 13 dB and squashes the peaks. Your dashboard clips have none of that. That is in the grid too.

## Listen — the four that matter

Start here. All clips below are peak-matched so you're judging character, not volume.

### The short line — "I'm James. Pleased to meet you."

This is where the differences are biggest, and it's the length the courses drill at.

**What's on the course right now**
https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-A.mp3

**The same request, but nothing of ours done to it afterwards**
https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-B.mp3

**Today's voice model, Cartesia's own settings, full-quality audio** ← my pick
https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-I.mp3

**Today's voice model, but squeezed back into our small course file**
https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-K.mp3

### The long line — "I think that's normal. Learning a new language is difficult…"

**What's on the course right now**
https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-A.mp3

**The same request, nothing of ours done to it**
https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-B.mp3

**Today's voice model, Cartesia's own settings, full quality** ← my pick
https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-I.mp3

**Today's voice model, squeezed into our small course file**
https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-K.mp3

## The full grid

Four lines, eleven variants each. Lines: **1** "I'm very well, thank you. Are you going to work?" · **2** "I'm James. Pleased to meet you." · **3** "One every four to six hours, no more than eight in a day." · **4** "I think that's normal. Learning a new language is difficult. But it's so much fun when you start to have conversations, isn't it?"

| In plain words | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| **What's on the course right now** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-A.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-A.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-A.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-A.mp3) |
| **Same request, nothing of ours done to it** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-B.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-B.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-B.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-B.mp3) |
| **That exact take, put through our polish** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-B2.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-B2.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-B2.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-B2.mp3) |
| **Our settings, but full-quality audio** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-C.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-C.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-C.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-C.mp3) |
| **Pace left entirely free** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-E.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-E.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-E.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-E.mp3) |
| **Told plain English rather than British English** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-F.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-F.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-F.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-F.mp3) |
| **The in-between model, our pacing** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-D.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-D.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-D.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-D.mp3) |
| **The in-between model, nothing steered at all** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-G.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-G.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-G.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-G.mp3) |
| **The old model, for contrast** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-H.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-H.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-H.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-H.mp3) |
| **Today's model, Cartesia's own settings** ← my pick | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-I.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-I.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-I.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-I.mp3) |
| **Today's model, our pacing pinned** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-J.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-J.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-J.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-J.mp3) |
| **Today's model, squeezed into our small course file** | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L1-K.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L2-K.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L3-K.mp3) | [▶](https://watson-1.tail4968cb.ts.net/evidence/cartesia-dashboard-gap-2026-08-27/listen/L4-K.mp3) |

**How to listen fairly.** Every clip has had one plain volume change applied, nothing else, so their loudest moments match. The two rows that went through our polish will still sound a shade fuller — that is our limiter, not a better voice. Judge the character.

## The one number that surprised me

Today's model is **far steadier on short lines**, which is exactly where our courses live.

| | Our current model, `sonic-3` | Today's model, `sonic-3.6` |
|---|---|---|
| Short line, as it came off the API | **−30.8** LUFS, peaks at −9.3 | **−21.6** LUFS, peaks at −4.2 |
| Across all four lines | −20.7 to −30.8, a **10 dB** spread | −20.7 to −22.6, a **2 dB** spread |
| Lift our mastering had to add | up to **13 dB** | around **2 dB** |

That 13 dB of lift is the "hissy mastering" mechanism: it amplifies room tone and sibilance along with the voice, and it only has to work that hard because the old model hands us something very quiet and very peaky. **Moving to `sonic-3.6` would largely dissolve the Pod 1 loudness defect at source rather than fixing it in the mastering stage.**

## What I'd change, and what I wouldn't

**My read: it's the model version first, the file format second, and our mastering third.**

1. **Move production from `sonic-3` to `sonic-3.6`.** Newest model, Cartesia's own default, and it measurably fixes the short-line inconsistency and the loudness shortfall. It also makes our `en-GB` steer actually take effect, which on the docs' account it currently does not.
2. **Raise the output format** from 24 kHz / 128 kbps MP3 to Cartesia's 44.1 kHz default. Compare the "today's model" row against the "squeezed into our small course file" row — that pair isolates it on its own.
3. **Consider dropping `speed: 1.0`.** We pin it to control take-to-take wander on short text, and that was a measured win. But it is not what the dashboard sends, and "pace left entirely free" is in the grid so you can hear whether the control costs anything.
4. **I would not touch the mastering stage yet.** Compare "same request, nothing of ours done to it" against "that exact take, put through our polish" — same take, so any difference is purely ours. If those sound the same to you, our processing is exonerated and the whole answer is upstream.

**None of this is applied to anything.** No course audio was touched, no production default changed. Forty-four sample clips and a recommendation, waiting on your ear.

---

*Parameter dump, for the record. Production sends: `model_id: sonic-3`, `generation_config: {speed: 1.0}`, `locale: en-GB`, `output_format: {mp3, 24000 Hz, 128 kbps}`, header `Cartesia-Version: 2026-08-14`, then our own end-of-speech trim → −16 LUFS gain → true-peak limiter. Cartesia's documented defaults: `model_id: sonic-3.6`, `speed: 1`, `volume: 1`, `normalization: auto`, `output_format: {44100 Hz, 128 kbps}`. Fields we have never sent: `generation_config.volume` (tested on 2026-08-27, did not help), `generation_config.emotion` (50+ values, untested), `normalization`, `pronunciation_dict_id`. Full render manifest and loudness measurements: `evidence/cartesia-dashboard-gap-2026-08-27/manifest.json` and `levels.tsv`.*
