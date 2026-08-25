# Four phrases, 170 splice candidates — cut without a transcript

**Course:** `deu_at_for_eng`. **Recordist:** Sascha, who uses they/them.
**The page (this is the one URL):**
<https://watson-1.tail4968cb.ts.net/evidence/deu-at-splice-candidates-2026-08-25/index.html>

Kai rejected four phrases in seeds 1–9 — **“i wü”**, **“i wü reden”**, **“reden”** and
**“i wü iatz mit dir Deitsch reden”**. **No audio was generated. Every millisecond of every
candidate is audio Sascha already recorded**, cut from their natural seed 1–9 takes.

## Kai heard the bug before any measurement did

> *"most of the reden ones just say 're', many of the i wü ones say 'i'"* — 2026-08-25

He was right, and the cause was the tool's foundation. Every cut until then was placed on
**whisper's word offsets**, and on this material those offsets are wrong by whole words. On
the take of “i wü iatz reden”, whisper puts “reden” at 1810 ms; the word does not begin
until **2490 ms**. Cut on that number and you get the end of the previous word. Decoding the
clips confirmed it: candidates meant to say “reden” said *“und dann”* and *“dem anderen”*.

**So whisper is gone from the cutting entirely.** Every boundary now comes from one of two
things that cannot be wrong that way:

- **the start and end of the take itself** — the first word of a recording begins where the
  speech begins, the last word ends where it ends. No alignment needed; exact.
- **the gaps Sascha left** — between those, a cut lands on a boundary *between* speech runs,
  never inside one. Word-internal closures (the *d* in *reden*) are bridged, because a word
  is not over just because the signal went quiet.

That is why every piece is now a **prefix or a suffix of a real line**: 84 takes begin with
“i wü” and 46 end with “reden”, so the words we need sit against an edge that can be
measured. Where no gap falls inside the plausible window, the take is **refused** rather
than stretched to the next gap along — "they won't all cut perfectly" means using the ones
that do.

## What that changed, in numbers

| phrase | candidates | shortest | median | was, before the fix |
|---|---|---|---|---|
| i wü | 47 | 0.80s | 0.99s | 0.26s — a fragment |
| reden | 42 | 0.53s | 0.75s | **0.18s — "re"** |
| i wü reden | 40 | 1.35s | 1.72s | 0.88s |
| i wü iatz mit dir Deitsch reden | 41 | 3.06s | 3.44s | 2.89s |

Sascha's own pace, measured across 60 of their natural takes, is **523 ms per word**. Every
group now sits where its word count says it should, and the sub-word fragments are
structurally impossible rather than merely unlikely: a piece of *k* words must last at least
*k* × 350 ms, which is just under the 25th percentile of their own delivery. Measured, a cut
that contains both syllables of “i wü” runs ≥ 780 ms and one that contains only “i” runs
≤ 615 ms — the floor lands between them.

**Every candidate now shows its own duration on the page**, and each group shows its typical
length, so a wrong one costs Kai a glance instead of a tap.

## Two readings, both offered

“i wü” is two very short words. In most takes they are spoken as one continuous run; in some
there is a gap between them. Nothing can tell from duration alone which gap is the right one
to cut at, so **both are built and both are labelled** ("1 run of speech" / "2 runs"). That
is the whole principle here: where the material is ambiguous, Kai gets versions, not a guess.

## Still honest about what is left

- **Some candidates are still wrong.** A spot decode of the current set has most saying the
  right thing, but not all — one “reden” came back as *“zum Reden”*, one cut a hair into the
  preceding word. They are a minority now rather than the majority, and no measurement can
  finish this job: Kai's ear is the filter, which is what the page is for.
- **The four rejected takes are excluded as sources.** They were being cut from themselves —
  whisper decodes them as *“blabla blabla”* and *“Baba”*, which is consistent with why Kai
  rejected them.
- **whisper is still used for one thing**: checking the finished clips after the fact, as an
  advisory. It is not trusted for what the audio says, only used to spot gross errors.

## The axes Kai asked for

**Source** — 31 different carrier lines. **Padding** — tight / medium / wide, how much of
the real silence beside the cut is kept. **Join** — no gap, a 40 ms crossfade, 50 / 110 /
190 ms. Every candidate says on the page what it was made from and how, so a pick becomes a
rule.

## Where these would go, if Kai picks

All four phrases are **already bound to nothing** — the human takes were unlinked before
today, so learners hear the Azure voice on them now. A pick would replace Azure on
**14 slots**: “i wü” 1 lego + 3 phrases · “reden” 1 lego + 6 phrases · “i wü reden”
1 phrase · “i wü iatz mit dir Deitsch reden” 1 seed + 1 phrase. Nothing is broken in a
learner's ear today, so there is no clock on this decision.

## The tools

- `tools/deu-at-splice/build-manifest.cjs` — the source manifest (takes, each object's own
  S3 coursecode, durations).
- `tools/deu-at-splice/build-candidates.cjs` — the measuring, cutting and gluing.
- `tools/deu-at-splice/deploy.cjs` — copies the page to the evidence host, prunes clips a
  rebuild dropped, and refuses non-ASCII filenames because the evidence server 404s those.
- `tools/deu-at-splice/page/index.html` — 390 px first, nothing preloaded, one tap to play,
  one tap to pick, picks survive a reload, *Send my picks* exports them.
