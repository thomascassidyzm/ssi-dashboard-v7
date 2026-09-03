# Why the Austrian German script keeps asking for one word at a time

21 August 2026. Analysis only — nothing was changed. The tool is exactly as
Sascha left it.

---

## The short answer

**Because more than half the Austrian German building blocks *are* one word.**
734 of the 1,248 distinct things the course teaches are a single word. A slow read exists
to harvest those blocks one by one, and a block can only be harvested if the
reader stops around it. So a one-word block produces a one-word piece. That is
the machine working, not the machine misbehaving.

**Your components hunch is wrong, and I checked it hard.** Every single one of
the 703 one-word pieces in today's script is a *whole* teaching unit. Not one is
a fragment of a bigger unit. The tool physically cannot cut inside a unit — it
only ever cuts at unit edges. So there are no components being recorded to skip.

**What is true is one layer further back.** 193 of those one-word units are words
that *also* appear inside a longer unit of the same course — *uns*, *wos*,
*reden*, *Zeit*, *gehn*. Somebody entered them as their own teaching unit when
the course was written. The splintering is written into the course, not created
by the recording tool.

---

## The thing you should read before anything else

The tool says **"100% coverage, 0 extra items."** That is not true, and it is the
most important thing on this page.

"Covered" currently means *the words appear somewhere in what will be recorded*.
It does not mean *we can get that block out again as its own piece of audio*.
Those are different things, because audio can only be cut at the pause points.

For Austrian German today:

| | |
|---|---|
| Blocks the tool says are covered | **1,248 of 1,248** |
| Blocks actually cut out as their own piece | **846** |
| Blocks that exist in a line but can never be separated out | **402** |

So the real number is **68%**, not 100%. And nothing tells anybody. The morning's
fix made this worse without saying so: it was 278 missing before, it is 402 now —
that is what the "+124 extra items" in this morning's note actually is, except
the tool never adds those items to the script. It just stops mentioning them.

**Whatever you decide below, those 402 need to be asked for.** That is not a
preference, it is the gap between what the course teaches and what will exist as
audio.

---

## Your first question: are the Austrian units smaller than the German ones?

Slightly. Not nearly enough to explain anything.

| | Standard German | Austrian German |
|---|---|---|
| Teaching units | 1,395 | 1,253 |
| Average words per unit | 2.01 | **1.70** |
| Units that are one single word | 53% | **59%** |
| One-word pieces its script produces | 2,281 | 2,253 |

Austrian units are about 13% shorter. But look at the last row: **standard German
produces virtually the same script.** If we recorded standard German by hand
tomorrow it would hand the reader the same pile of one-word lines. This is not an
Austrian problem and it is not a bad build — so I'd rather you didn't spend any
worry there.

Two real differences did show up, and they are additive:

- **Austrian words are genuinely shorter.** Across the course sentences, 3.9
  letters per word against 4.6 for standard German — *hot* for *hat*, *gsogt*
  for *gesagt*, *i* for *ich*. This is why the fragments *looked* so much worse
  than the count alone suggests. A stop around *des* reads as absurd in a way a
  stop around *vergessen* does not.
- **Austrian was split more finely.** 58% of its units are single-idea units
  against 52% for standard German, and it was built in one three-day pass in
  July, months after standard German's build finished. Different pass, slightly
  finer habit.

**Verdict on the hypothesis: mostly no.** The units are a little smaller, the
words are noticeably shorter, but standard German has the same shape. Nothing
about Austrian German needs fixing.

---

## Your second question: is it recording components?

No. Zero of 703. I looked for three separate things and found only the first:

| What the one-word piece is | Count |
|---|---|
| A whole teaching unit in its own right | **703** |
| A leftover word belonging to no unit | 0 |
| A piece of a bigger unit | **0** |

The reason the second and third are zero is structural, not lucky. The tool tiles
each line with the longest unit that fits at each point, then absorbs any orphan
word into its neighbour. There is no step anywhere that can cut a unit in half.

---

## Your third question, which I'll ask for you: then why does it feel wrong?

Because the pause is doing two jobs and only one of them is visible.

To the reader, a pause is punctuation — it says "this belongs together." To the
tool, a pause is a pair of scissors — it is the only place audio can be cut, and
therefore the only way a block gets banked for re-use. Every time we make the
read more natural we take away a pair of scissors.

That is the whole trade, and it is why the numbers move the way they do.

There is one genuinely free win hiding in it, though. **226 of today's 703
one-word pieces are repeats** — the same unit isolated again in a later line,
when it was already banked the first time. *wolln* is stopped around eight
separate times. A block only needs banking once.

---

## Four options, measured on the real script

Times include everything: the natural read, the slow read, and the separate items
needed to reach genuine 100%.

| | One-word stops | Separate items | Really covered | Total time |
|---|---|---|---|---|
| **Today, as the tool asks** | 703 | 0 | **68%** ✗ | 108 min |
| **Today, done honestly** | 703 | 402 | 100% | 181 min |
| **Free de-duplication** | **516** | 402 | 100% | **180 min** |
| Your idea, components only | 398 | 592 | 100% | 214 min |
| Your idea, in full | **27** | 967 | 100% | 278 min |

The free de-duplication row is the one I'd point at. It removes 187 one-word
stops — a quarter of them — for nothing. Not a compromise, not a trade: those
stops are banking a block that is already banked elsewhere in the script.
Coverage is bit-for-bit identical, 846 blocks either way.

Your idea in full does work and it does keep 100% coverage. It costs about
**+97 minutes** over doing today honestly, and it nearly triples the number of
things read in isolation. There is one softener: I costed separate items at two
passes each, as the campaign does today. A single word arguably needs one clear
read, not a fast one and a slow one. Halve that and your full idea lands at about
189 minutes rather than 278. That is a decision about whether an isolated word
needs a natural-speed pass at all — worth asking, and it applies to every option
on the table.

---

## Real lines, as they read today and under each option

`|` is where Sascha is asked to stop. These are actual lines from the current
script, in the order they appear.

**"she said that she can't spend much time with the group"**
- Today — `sie hot | gsogt, dass s' | ned viel | Zeit mit da | Gruppn | verbringen | kann`
- De-duplicated — `sie hot | gsogt, dass s' | ned viel | Zeit mit da Gruppn | verbringen | kann`
- Your idea — `sie hot | gsogt, dass s' | ned viel Zeit mit da Gruppn | verbringen kann`
  *(then reads separately: Gruppn, verbringen)*

**"that man has just started to practise speaking"**
- Today — `der Monn do hot | grod | erst | mitm | reden übn | angfangt`
- De-duplicated — `der Monn do hot grod | erst | mitm | reden übn | angfangt`
- Your idea — `der Monn do hot grod erst | mitm reden übn angfangt`
  *(then reads separately: grod, erst, mitm, angfangt)*

**"if I'd known then what I know now I'd have waited"** — the worst line in the script
- Today — `wenn i | damols | gwusst | hätt, | wos i | iatz | woaß, | hätt i | gwart`
- De-duplicated — `wenn i | damols | gwusst hätt, | wos i iatz | woaß, | hätt i | gwart`
- Your idea — `wenn i damols gwusst hätt, | wos i iatz woaß, | hätt i gwart`
  *(then reads separately: damols, hätt, iatz, woaß, gwart)*

**"will they be able to drive us home after the meal?"**
- Today — `wern s' uns | noch'm | Essn | hoam | foahrn | kennan?`
- De-duplicated — `wern s' uns noch'm Essn | hoam | foahrn | kennan?`
- Your idea — `wern s' uns noch'm Essn hoam | foahrn kennan?`
  *(then reads separately: noch'm, Essn, hoam, foahrn)*

**"I met someone last night who works with your brother"**
- Today — `i hob | gestern auf d'Nocht wen | troffn, | der wos | mit deim | Bruada | arbeit`
- De-duplicated — unchanged (every stop here is banking a block for the first time)
- Your idea — `i hob | gestern auf d'Nocht wen troffn, | der wos | mit deim Bruada arbeit`
  *(then reads separately: troffn, Bruada, arbeit)*

**"because I think that it's a good thing to make mistakes"**
- Today — `weil i glaub, | dass es | wos Guats is, | wenn ma Fehler mocht`
- All three options — identical. Nothing to fix on this line, and about a fifth
  of the script already reads like this.

---

## Does your mechanism already exist, and can it take components?

**Yes to both.** The tool already has a separate-items list — it hands each one to
the reader twice, natural then slow, with no internal pause marks, and the
recording is filed and becomes a usable clip by exactly the same route a spliced
piece does. It is showing zero items for Austrian German only because the
coverage test is the wrong test, not because the mechanism is missing.

And nothing anywhere checks that a separate item is a whole teaching unit. Items
are matched by their text, never by an identity number, so an arbitrary word
would travel the whole path without a single objection.

Two honest caveats:

- The list is **generated, not authored**. There is no screen or list where
  someone adds a word to it. Making it carry the extra items is a code change,
  small but real.
- A word read separately is banked as a clip straight away, which is what the
  402 need. But for it to be re-used *inside* spliced audio, the splicer has to
  ask for that exact piece — and today it only asks for pieces the tiler
  produces. Extra separate items are therefore genuinely useful; they are just
  not automatically wired into splicing.

**Is anything already recorded invalidated? No.** I checked every slow take on
this course: 40 of 40 carry their own pause map from the day they were recorded,
and that is what the aligner reads. Changing where the pauses fall in future
scripts cannot reach backwards into Sascha's existing takes.

---

## What I'd do

Take the free de-duplication, and don't take the full switch — but **do add the
402 missing items regardless of which you pick**, because that is the only thing
on this page that is currently costing coverage.

---

## Gaps — what I could not establish

- **Nobody has listened to anything.** This is all measurement. Whether a
  separately-read word actually splices as well as a chunk cut from a phrase is
  an ear question and it is unanswered.
- **The two-pass cost for separate items is an assumption inherited from the
  earlier calibration** (about 11 seconds per item). I have shown both that and a
  one-pass figure, but nobody has timed a real separate-item session, so all
  separate-item minutes on this page are modelled, not observed.
- **Only Austrian and standard German were measured.** Every other course
  recorded by hand has the same tool and, on this evidence, likely the same
  shape — unmeasured.
- **One front end unchecked.** The recordist tutorial pages are not part of the
  live code and I did not examine how they would present a separate item.
- **The de-duplication figure of 187 assumes lines are recorded in script
  order.** If a session is cut short, a block whose only stop was later in the
  script would be missed — the same exposure the script already has today, but
  worth naming.
