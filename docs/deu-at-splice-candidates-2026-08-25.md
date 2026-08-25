# Four phrases, 117 splice candidates — built from Sascha's own recordings

**Course:** `deu_at_for_eng`. **Recordist:** Sascha, who uses they/them.
**The page (this is the one URL):**
<https://watson-1.tail4968cb.ts.net/evidence/deu-at-splice-candidates-2026-08-25/index.html>

Kai rejected four phrases in seeds 1–9 — **“i wü”**, **“i wü reden”**, **“reden”** and
**“i wü iatz mit dir Deitsch reden”** — and asked for many options for each, cut from the
most complete phrases available, with variety in where the cut falls and how long a gap
sits between glued pieces. **No audio was generated. Every millisecond of every candidate
is audio Sascha already recorded.**

## What is on the page

| phrase | candidates | different carrier lines | how they were made |
|---|---|---|---|
| i wü | 48 | 13 | 9 cut at Sascha's own pauses · 34 cut whole out of a longer line · 5 glued |
| reden | 27 | 9 | all cut whole out of a longer line |
| i wü reden | 20 | 6 | all two pieces glued |
| i wü iatz mit dir Deitsch reden | 22 | 7 | 12 two pieces · 10 three pieces |

**117 candidates from 19 different carrier lines**, out of 167 usable takes.
Padding spread: 50 tight · 38 medium · 29 wide. Join spread: 10 butt-joined · 10
crossfaded · 9 at 50 ms · 9 at 110 ms · 9 at 190 ms.

Every candidate says on the page what it was made from and how, so a star can become a
rule: *"the tight cuts sound clipped"*, *"the crossfades are the only joins I can't hear"*,
*"only the ones cut at a real pause work"* are all answerable from the labels.

## The four axes, and why the fourth exists

Kai named three — source, padding, join gap. The material handed us a fourth:

1. **Source phrase** — the same words cut out of 19 different utterances.
2. **Padding** — tight / medium / wide, meaning how much of the real silence beside the
   word is kept.
3. **Join gap** — none, a 40 ms crossfade, 50 / 110 / 190 ms.
4. **What kind of edge the cut landed on**, which is labelled on every candidate:
   - **cut at Sascha's own pauses** — on a *slow* read the take carries
     `chunks_string`, the chunking the autocue asked them to pause between, e.g.
     `i wü|iatz|wos|auf Deitsch|sogn`. **“i wü” is literally one of those chunks.** Where
     the pauses in the audio come out at exactly the chunk count, the cut lands in a pause
     Sascha actually made — the best edge available anywhere in this material.
   - **in silence** — there was a real gap beside the word and the cut is inside it.
   - **mid flow** — the words run together with no pause at all, so the cut is inside
     connected speech. These are the ones most likely to sound wrong, and they are marked.

## What the timings are, and what they are not

whisper-cli gave word timings, and **it renders Austrian dialect into Standard German** —
“i wü” comes back as “ich will”. So the transcript was used for **where the words are and
never for what they say**. The prompted line from `recording_provenance` is the truth about
the words.

Two things that fell out of that, worth knowing:

- **whisper's own word gaps are useless for padding.** With `-ml 1 -sow` each word's end
  *is* the next word's start, so every inter-word gap it reports is zero — cutting on those
  numbers would have made tight, medium and wide into three identical clips. The cut points
  are therefore found in the waveform: a 10 ms RMS envelope, thresholded **relative to each
  clip's own speech level** (an absolute dB gate reads a quiet take as silence).
- **Alignment refuses rather than guesses.** Where the prompted word count and the whisper
  word count disagree and no unique anchor exists, that take simply offers no span. A
  guessed boundary is a click in Kai's ear.

## What was deliberately not built

19 entries, all named in `candidates.json` and shown on the page under *"How this was
built, and what was left out"*:

- carrier lines beyond the 12 kept per phrase — variety of *line* was preferred over more
  cuts of the same line;
- cuts that held too little voice to be the word at all — a whisper misalignment, dropped
  with its reason rather than left for Kai to waste a tap on;
- slow takes whose audible pauses do not match their own chunk map at any threshold: the
  count is the gate and it refuses rather than redistributing boundaries.

**A note about the rejected takes themselves.** whisper decodes Sascha's take of
“i wü iatz mit dir Deitsch reden” as *“blabla blabla”* and their take of “i wü reden” as
*“Baba”*. Whisper is not a judge of Austrian and this is not a verdict — but it is
consistent with Kai's ear, and it is why those four had to be rebuilt rather than re-cut.

## Where these would go, if Kai picks

All four phrases are **already bound to nothing** — the human takes were unlinked before
today, so learners currently hear the Azure voice on them. A pick would replace Azure on
**14 slots**: “i wü” 1 lego + 3 phrases · “reden” 1 lego + 6 phrases · “i wü reden”
1 phrase · “i wü iatz mit dir Deitsch reden” 1 seed + 1 phrase. Nothing is broken in a
learner's ear today, so there is no clock on this decision.

## The tools

- `tools/deu-at-splice/build-manifest.cjs` — assembles the source manifest (takes, S3
  coursecode read from each object's own metadata, pause maps, word timings).
- `tools/deu-at-splice/build-candidates.cjs` — the cutting and gluing.
- `tools/deu-at-splice/deploy.cjs` — copies the page to the evidence host, refusing any
  non-ASCII filename because the evidence server 404s those.
- `tools/deu-at-splice/page/index.html` — the page: 390 px first, nothing preloaded, one
  tap to play, one tap to star, stars survive a reload, and *Send my picks* exports them.

It is the 2026-08-24 splice bench's next iteration, not a third page — same visual
language, same primitives — and it does not overlap the take chooser on :8450, which
judges takes that already exist rather than clips that do not exist yet.
