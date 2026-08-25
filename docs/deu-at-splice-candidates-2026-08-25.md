# Four phrases, 281 splice candidates — cut without a transcript

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

## “None of them say mit” — and why he was right

Kai, 2026-08-25, on the second half: *"none of the second half ones say mit (they sound very
good otherwise) — but they all say 'dir Deitsch reden'."*

Correct, and it is **the material, not the cut.** Once the rejected take is excluded as a
source, exactly one carrier line ends in “mit dir Deitsch reden”: *“i wer mit dir Deitsch
reden”*. Measured, its speech runs are **380–1090 · 1330–1730 · 2030–2220 · 2350–2510 ·
2680–3180** — five runs for six words, and the first of them is *“i wer mit”*. **“mit” is
fused into the opening run.** There is no silence in front of it, so no honest cut of that
half exists, and the tool now **refuses to offer that group at all** rather than shipping
three clips that quietly start at “dir”.

What does exist: **“mit dir” cuts cleanly** off the front of the two “mit dir reden” takes,
where it starts the line. So the phrase is finished in **three pieces instead of two**, and
the middle piece is the missing word.

## Finished on top of his own pick

Rather than hand the halves back, the phrase is now assembled **on the “i wü iatz” Kai
already picked**: his clip is piece one and the reference level, with a measured “mit dir”
and a measured “Deitsch reden” after it — **30 versions**, varying only the join, since the
words themselves are settled.

Decoded as a check, these come back as *“Ich will jetzt mit dir Deutsch reden”* — the whole
line, in the reading he chose.

## The long phrase, in two halves

Kai, 2026-08-25: *"the long phrase didn't work out. Let me pick the two parts separately."*

Glued whole, the join is one decision buried inside seven words. Split, each half is judged
on its own and the two winners are glued afterwards. **Two ways to divide it are offered**,
because the recordings are lopsided:

| piece | candidates | pairs with |
|---|---|---|
| i wü iatz | 31 | mit dir + Deitsch reden |
| mit dir | 3 | the two either side of it |
| i wü iatz mit dir | 6 | Deitsch reden |
| Deitsch reden | 36 | i wü iatz mit dir |
| **the whole line, on his pick** | **30** | — ready-made |

“mit dir Deitsch reden” **was offered and has been withdrawn** — see above. The page says on
each group which one it pairs with. **A half is only ever ONE measured cut** — gluing a half
out of two takes would hide a second join inside the thing being judged.

## Kai's picks are pinned, because one was already lost

The first five picks came in at 22:14–22:58. By then the tool had been rewritten, and
`i-wue-w37-lead` — picked at 22:14 — no longer existed: the rebuild had pruned it. **A pick
is the most valuable object in this tool; it is the only judgement in it.** So:

- picks are saved to `picks-kai.json` and carried into every subsequent build, from
  `recovered/` if the current build no longer produces them;
- they appear as their own group at the top of the page;
- if one cannot be carried forward, it is reported out loud rather than quietly dropped.

The lost one was rebuilt from the same carrier line with the same settings, **but the
cutting algorithm changed in between, so it is not guaranteed to be the same audio.** It
carries a note on the page asking Kai to confirm it by ear. Underlying hazard worth knowing:
**candidate ids are not stable across rebuilds** — they come from a counter, so adding a
phrase shifts later ids. The pinning is what makes a pick survive that.

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
