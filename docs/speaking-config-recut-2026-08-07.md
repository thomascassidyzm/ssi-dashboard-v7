# The Speaking page, re-cut onto knobs a teacher can reason about

2026-08-07 · branch `feat/speaking-config-recut-2026-08-07` · not merged

> "The speaking lab needs to be simplified because I think it's too complicated
> from last look, and I think the parameterization should be on things like the
> syllable cap, as measured in the known language." — Tom, 2026-08-07

The previous pass made every mode parameter editable. That is what made it too
complicated: a wall of fields named after their storage keys, several of which
did nothing. This pass keeps the exposure and re-cuts it.

---

## The page is now four questions

1. **How much repetition** — once or twice per phrase; which cycles get the
   second play; and, separately, how many *different* phrases a round holds.
2. **How long a phrase can be** — the known-language syllable filter, the round
   window it applies over, and the character-share cap.
3. **How much time the learner gets** — the pause curve, the live chart and the
   "Hear it" bench, working exactly as they did.
4. **Which phrases get filtered at all** — new-phrase practice is never
   shortened.

Every length knob now states **its own unit and its own side of the pair** in
its own label. The old "Maximum phrase syllables — absolute ceiling" said
neither, and by the time it shipped it was counting the side the player no
longer reads.

One mode switch at the top drives the whole page. It used to have three, and it
was never obvious they moved together.

## What was cut, and what happened to it

Removed from the visible surface, not merely restyled: `maxPhraseSyllables`,
`playback_speed`, `spaced_rep_fraction`, `debut_phrases_fraction`,
`skip_voice2`, and the four legacy knee-model pause keys. They now appear once,
**read-only**, in a collapsed "Advanced and legacy" block that says plainly that
none of them affect playback — so a value found in Supabase has somewhere to
explain itself, without inviting an afternoon of tuning it.

**Nothing was deleted from a live row.** An unread key in a jsonb row shared
with the player is harmless; deleting the wrong one is not.

## Popty's script generator now counts the same side as the player

Popty was applying an absolute **target**-syllable ceiling to the whole script.
The player stopped doing that hours after it shipped, so Script View was
describing a course the learner does not get. Popty now does what the player
does: a **known**-language syllable filter, on review and consolidate pulls
only, in force for the first hundred rounds and then lifted, never applied to
new-phrase practice, and with a shortest-in-basket fallback so no LEGO ever
loses a review for want of a short phrase.

**Verified live on `fra_for_eng`, 60 rounds, learner view:**

| | Fast | Easy |
|---|---|---|
| Longest review/consolidate prompt | 17 known syllables | **15** |
| Prompts over the 15-syllable filter | 3 | **0** |
| Longest new-phrase prompt | 14 | 14 — *unfiltered in both* |
| Review + consolidate cycles | 603 | **603** — *nothing lost* |
| Rounds with no review at all | 3 | 3 |

And the two behaviours that make it safe:

- **It lifts.** Rounds 111–170 on the same course: 840 pulls, 13 of them over
  15 syllables. Past round 100 the whole basket is back in play.
- **It is loudly inert, never wrong.** On `eng_for_kan`, whose known language
  has no syllable counter, the generator built 12 rounds and 152 items without
  throwing, and logged that the filter is inert and why.

The two syllable counters — Popty's `tools/lib/syllable-counters.cjs` and the
learning app's `packages/core/src/text/syllables.ts` — were compared on **4,000
real English prompts** pulled from the estate. **Zero disagreements.**

## Tests

- `services/learning-modes.test.cjs` — 41 pass. The suites for the retired
  target-side ceiling were **deliberately deleted** and replaced.
- `services/learning-script-generator.test.cjs`, `api/algorithm-config.test.js`,
  `tools/lib/syllable-counters.test.cjs` — 74 pass.
- Full `vitest run`: 1,197 pass, 5 fail. Every failure is in
  `tools/audio-link-reconcile.test.js`, `src/views/admin/PodLab.casting.test.js`
  and the Playwright e2e specs — files byte-identical to `origin/main` and
  untouched here.
- `vite build` clean.

---

## Four things for you

**1. Easy is very probably not doubling right now.** The live `easy_mode` row
was rewritten to the newer contract (`phraseRepeatCount: 2`), but the player
code that reads that key is still on the unmerged branch
`claude/easy-phrase-syllable-cap`. What is on `dev` reads the older
`doublePhraseCycles`, and the row no longer has that key — so it reads as off.
*Recommendation: merge that branch. One word: **merge**.*

**2. Script View still shows Easy rounds at single length.** I brought Popty in
line on the syllable filter, which is what was asked for; I did not mirror the
cycle-doubling, so Script View understates an Easy round by about half.
*Recommendation: I do it next, as its own pass. One word: **yes**.*

**3. I moved the global round shape behind a disclosure.** It is one shape for
every course and every learner, so the common edit is the mode and the
dangerous edit now takes one deliberate click. This is my call, not yours.
*Say **inline** if you want it back out in the open.*

**4. Not merged, so not deployed.** popty.app deploys from `main`; this is on
`feat/speaking-config-recut-2026-08-07`. *Recommendation: merge it. One word:
**merge**.*

## Defaults I chose where the conversation left a gap

Each is a default, not a question — overturn any with one word.

- **Repetition is a two-option switch**, "Once" / "Twice, back to back", not a
  number. There is no way to ask for three, and the note next to it says why in
  your own words.
- **Which cycles get the second play** is three plain toggles: new-phrase
  practice, reviews, consolidation. Intro and the bare LEGO are absent and
  cannot be added.
- **Fast shows the same four sections as Easy**, with its filters reading "no
  filter" rather than hidden, so the two modes read side by side.
- **Blank still means inherit, and now stays blank.** The round-shape override
  boxes use a raw input rather than the shared number field, because that field
  coerces with `Number()` and `Number('')` is `0` — clearing a box would have
  written an override meaning "none at all" instead of inheriting.
- **No new backfills.** Every knob added on 2026-08-07 is read through a
  computed that supplies the player's own default for display and writes only
  when edited. A backfill mutates the draft on load, which is what made a saved
  row look permanently unsaved when it gained a key.

## One loose thread, noted not fixed

`services/learning-modes.test.cjs` still carries an `EASY_CONFIG` fixture with
the retired 14/4/24/6 phrase-count inflation. It is a fixture for the
*layering* rule, not an assertion about the live row — and the live row now
carries an empty override, exactly as "just double" requires — but the numbers
will read oddly to the next person. Left alone rather than swept into an
unrelated commit.
