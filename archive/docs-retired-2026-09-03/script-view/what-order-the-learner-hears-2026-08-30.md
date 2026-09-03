# What order the learner actually hears phrases in

*2026-08-30. Read from the code and from both live systems, not from any document.*

## The blunt answer first

**No — the Script View does not render through the path that serves a learner. It never has.** It runs its
own, separate generator, written to imitate the learner's one and kept in step by hand. That is why the page
says "Generated in 5919ms": every time you open it, it walks the whole course from scratch.

The file admits it in its own opening lines: *"dashboard mirror of the learner app. Parallel implementation …
no shared code — keep the two in sync by hand."*

So there are two implementations of the journey, and the only thing keeping them honest is somebody
remembering to change both.

## The good news, and it is genuinely good

**On phrase order, the two agree today.** Both sort shortest-first by target syllables. Nobody has drifted.
The position-order sort that started this — the one you were told the generator uses — is real, but it is in
two *other* places:

- the **bootstrap endpoint** that plays a learner's first cycles before the full walk takes over, and
- the **bundle generator**, which is built but **not yet switched on** — no part of the learner app calls it.

## The three orderings, plainly

**1. What the Script View shows you.** Shortest-first, by counted syllables of the target phrase, BUILD
phrases then USE phrases, capped at seven. Then the spaced-review block, drawn round-robin.

**2. What a learner is actually served.** Two producers, in sequence:

- *For the first few seconds*, the server endpoint `/cycles` hands out the opening round so audio starts
  instantly. It sorts **by database position**, and its own comment says so outright: *"this endpoint keeps
  DB position order."*
- *Then the full course walk takes over* in the browser and produces everything after that. It sorts
  **shortest-first**, the same rule the Script View uses.

So a learner meets a short stretch of position-ordered material at the very start of a course, then
shortest-first for the rest of it. The Script View shows shortest-first throughout, so it is right about the
long run and silently wrong about the opening.

**3. What the methodology says.** Not silent — explicit. `ralph-methodology.md`, Round Structure:

> "**Practice** — all BUILD phrases first (shortest-first by syllable count), then USE phrases fill remaining
> slots, **capped at 7 total**"

Shortest-first is doctrine, not convention. The Script View and the main walk obey it; the bootstrap endpoint
does not, and the un-switched-on bundle generator does not either.

## Seen side by side — spa_for_eng, the first three rounds

The Script View (left) and what the live bootstrap endpoint actually hands out (right):

| | Script View | Live `/cycles` bootstrap |
|---|---|---|
| Round 1 | intro, debut — *I want / quiero* | same |
| Round 2 | intro, debut, build — *I want to speak* | same three, **plus a USE and three spaced-review cycles** |
| Round 3 | intro, debut, 2 builds, 1 review, 1 consolidate | (bootstrap has moved on to S0002L01) |

Round 2 is the real divergence, and it is not about sorting: the bootstrap gives round 2 a review block of
three cycles — all three the *same* phrase, because that LEGO's basket only holds one — where the Script View
shows none and puts the first review in round 3. Whatever a learner hears in round 2, the Script View is not
showing it to you.

## What this means for the shortest-first ruling

The sort you were asked to rule on is not, today, a disagreement between the review tool and the main walk.
It is a question about **the opening seconds of a course** and about **the bundle generator before it goes
live**. Both of those are position-ordered against a methodology that says shortest-first.

## The exact places, for whoever fixes it

| Thing | File | Where |
|---|---|---|
| The Script View's own generator | `services/learning-script-generator.cjs` (Popty) | `byPhraseLength` at 1057, applied 1290 & 1321 |
| The endpoint it calls | `services/production-api.cjs` (Popty) | 8440 |
| The live learner walk | `packages/player-vue/src/providers/generateLearningScript.ts` | sort via `capPhrasesByLength`, `useAlgorithmConfig.ts:833` |
| The bootstrap endpoint | `api/courses/[code]/cycles.ts` | position order, comment at 59-62 |
| The bundle generator (built, not live) | `packages/core/src/script/generateScript.ts` | `a.position - b.position`, 158-166 |
| The methodology | `ralph-methodology.md` | Round Structure, line 270 |
