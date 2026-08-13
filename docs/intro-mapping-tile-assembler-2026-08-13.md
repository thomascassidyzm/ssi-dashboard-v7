# The mapping now reaches the learner — and `hitz bat` can be mapped at all

*2026-08-13. Both ends of your correction, live on popty.app and saysomethingin.app.*

**See it: [before and after, on the real page](https://watson-1.tail4968cb.ts.net/evidence/intro-mapping-tiles-2026-08-13/index.html)**

---

## What you asked for, and what it does now

**Only intros get the glyph.** Measured on the live API for eus_for_eng: 894 rows in the first 50
rounds, 50 carry a mapping, and all 50 are intros. Build, review, consolidate and debut carry none.

**Every intro is a candidate, including `a word = hitz bat`.** It has been saved through the real
editor endpoint: `hitz` → *word*, `bat` → *a*.

**The mapping feeds the tile assembler.** `gogoratzen saiatzen ari naiz` no longer renders as one
block with one natural English sentence under it. It renders tile by tile, Basque in its own order,
each tile carrying the literal known chunk that maps to it — *remember · trying to · I'm*. Wrong
English, on purpose.

## How it was done — your instruction, followed

You said: work with the existing mechanism, not around it or in place of it. So nothing was
special-cased in the assembler. It is still keyed on componentisation, and componentisation still
glosses every row nobody has mapped. What changed is that a better SOURCE now reaches it:

- the intro's authored mapping is authoritative **wherever one exists**;
- componentisation is the fallback **everywhere else**, untouched and unbypassed.

The mapping had genuinely never reached the player at all. It is stored on
`course_legos.known_gloss_segments`, and no learner code path read that column — the database
function that feeds the player did not even return it. Authoring a mapping changed nothing anyone
could see. That is now wired end to end.

A mapping that no longer covers its own target text is dropped rather than rendered. Authored
against an older wording, it would put the wrong English under the right Basque, which is worse than
no gloss — so that row simply falls back to componentisation.

## Two things worth your eye

**1. I authored the two mappings myself, and they are a demo, not a ruling.** To show the mechanism
working I had to put something in it. On `gogoratzen saiatzen ari naiz` I cut *I'm trying to
remember* as **remember / trying to / I'm**. On `hitz bat`, **word / a**. Both are live to learners
now. If either is wrong to your ear, the editor changes it in a few taps.

**2. That M-LEGO could not be mapped correctly at all until I widened one guard.** The editor lets
you move the existing gloss words around but never invent one — right rule. The problem is where the
starting words came from. `gogoratzen saiatzen ari naiz` declares components `gogoratu` and `nahian
ari naiz`, and **neither of those occurs in its own target text**. So the row's starting gloss was
"to remember" + "wishing to", while its known text reads "I'm trying to remember". The only words on
offer were words the sentence does not contain, and every correct literal build was rejected as an
invented word. The row's own known text is now equally acceptable — that is what is actually being
segmented. The guard's purpose is intact: every word must come from that row.

Those stale components are a content question, not a display one, and I have not touched them.

## Debut rows — the call I made

Your word was "INTROS", and the glyph is on `intro` only. The debut row shows the same LEGO from the
same database row, so authoring on the intro already governs how the debut renders — a second glyph
would have said the same thing twice. Say the word if you want it on both.

## What I did not do

- No TTS, no audio, no re-rendering. Display only.
- No bulk backfill. Only two eus_for_eng rows carry an authored mapping; every other intro in the
  estate falls back to componentisation exactly as before. A course-wide or estate-wide mapping pass
  is your call, not something to fold into this.
- No course text edited.

## One gap, stated plainly

I verified the Popty side on the served bytes and on the live API rather than by screenshotting the
Script Viewer: the deployed bundle carries the intro-only guard, and the live API returns a mapping
on 50 intros and `null` on the other 844 rows. The save path was exercised for real, twice. I did
not capture a picture of the glyph itself.
