# Four phrases, 259 splice candidates — from Sascha's natural seed 1–9 takes

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
| i wü | 122 | 22 | cut whole out of a longer line, or glued · 39 with added lead-in |
| reden | 45 | 15 | all cut whole out of a longer line |
| i wü reden | 46 | 9 | all two pieces glued · 13 with added lead-in |
| i wü iatz mit dir Deitsch reden | 46 | 7 | two and three pieces · 23 with added lead-in |

**259 candidates from 31 different carrier lines**, out of 150 natural seed 1–9 takes.
Padding roughly a third each of tight / medium / wide; joins evenly spread across no gap,
crossfade, 50 / 110 / 190 ms.

Every candidate says on the page what it was made from and how, so a star can become a
rule: *"the tight cuts sound clipped"*, *"the crossfades are the only joins I can't hear"*,
*"only the ones cut at a real pause work"* are all answerable from the labels.

## Natural seed 1–9 takes only

Kai's ruling of 2026-08-25: *"don't use slow takes, use the natural seed 1-9 takes. They
won't all cut perfectly, but that's why we're making many different versions, hoping one is
good for each phrase."*

So the **15 slow reads are excluded**, along with the 2 natural takes above seed 9. The slow
reads cut beautifully — they carry a pause map, and “i wü” is literally one of its chunks —
and they are out anyway, because a slow read is a **different performance**: not the pace or
the stress a learner hears in the course. Cutting mid-flow out of a natural read is harder
and fails more often, and the answer to that is **more versions, not easier material** —
which is why this set is 232 rather than 133, from 31 carrier lines rather than 19.

**Every source is verified natural and at seed 9 or below: 0 violations.**

## The four axes, and why the fourth exists

Kai named three — source, padding, join gap. The material handed us a fourth:

1. **Source phrase** — the same words cut out of 31 different utterances.
2. **Padding** — tight / medium / wide, meaning how much of the real silence beside the
   word is kept.
3. **Join gap** — none, a 40 ms crossfade, 50 / 110 / 190 ms.
4. **What kind of edge the cut landed on**, which is labelled on every candidate:
   - **in silence** — Sascha left a real gap beside the word and the cut is inside it.
     These are the good ones, and on a natural read they are the minority.
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

## What an independent audit of the clips found (job #642, sonnet)

Every one of the 232 was measured — duration, the margin between the speech and each edge
judged against that clip's own speech level, how much of it is actually voiced, level steps
at the joins, digital clipping. **No clip is digitally clipped. One was near-empty.** Two
findings changed the set:

**1. Padding predicts truncation, monotonically — but only at the END of a clip.**
Truncation at the start: tight 54%, medium 30%, wide 13%; at the end: 74% / 43% / 19%. So
"tight" is not a cosmetic difference. But the deeper finding is that **padding only ever
moves the trailing edge** — there is nothing at the front for it to widen into.

**2. Added lead-in silence is the only thing that fixes a front edge — and it works.**
Where it was offered it was 9/9 clean; where it was not, the front truncated regardless of
the padding tier. The mastered take simply begins on the word. So the build now offers it
**on every padding tier and on the glued clips too**, which is what took the set from 232 to
259.

**3. The seven-word phrase failed 45 out of 45, and it was three source takes doing it.**
40 of the 45 drew their first piece from one of three recordings that begin flat on the word
with no lead-in at all. No padding or join setting can reach that. Those now have 23 added
lead-in variants — the fix aimed exactly where the audit pointed. If Kai still rejects them
all by ear, the audit's own recommendation stands: **that phrase wants a re-record with real
silence around it**, and three or four takes is all it would take.

**Joins: no true clicks anywhere in the set — zero.** What reads as a click on a butt splice
is a momentary drop toward digital silence: 63% of butt joins, 25% of crossfades, and the
50/110/190 ms gaps measure within ±20 ms of their labels, so the mechanism is doing what it
says. A crossfade genuinely helps and does not cure it.

**What measurement still cannot tell us:** "broken" here means a threshold — speech within
15 ms of an edge — and a mid-flow cut is truncated *by definition*, because the word really
does continue. Adding silence there would not mend it; only a different source take would.
So the 63%-broken figure is a map of where to look, not a verdict on what sounds acceptable.
Kai's ear is still the instrument, which is the whole point of the page.

**One caveat on the audit's own numbers:** it measured the 232-clip set, and 27 lead-in
clips have been added since. Those 232 are unchanged and still on the page.

## What was deliberately not built

19 entries, all named in `candidates.json` and shown on the page under *"How this was
built, and what was left out"*:

- carrier lines beyond the 20 kept per phrase — variety of *line* was preferred over more
  cuts of the same line;
- cuts that held too little voice to be the word at all — a whisper misalignment, dropped
  with its reason rather than left for Kai to waste a tap on;
- everything slow, and everything above seed 9, by Kai's rule.

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
  tap to play, one tap to pick, picks survive a reload, and *Send my picks* exports them.
  `deploy.cjs` also prunes clips a rebuild has dropped, so nothing orphaned is left looking
  current.

It is the 2026-08-24 splice bench's next iteration, not a third page — same visual
language, same primitives — and it does not overlap the take chooser on :8450, which
judges takes that already exist rather than clips that do not exist yet.
