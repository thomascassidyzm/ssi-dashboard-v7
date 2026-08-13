# The mapping reaches the learner — on M-LEGOs, which are the only ones that can be split

*2026-08-13. Live on popty.app and saysomethingin.app.*

**See it: [the two cases, on the real page](https://watson-1.tail4968cb.ts.net/evidence/intro-mapping-tiles-2026-08-13/index.html)**

---

## Your two test cases

**`gogoratzen saiatzen ari naiz` (M-LEGO)** — has the glyph, is mappable, and renders tile by tile:
Basque in its own order, each tile carrying the literal known chunk. *remember · trying to · I'm*.
Wrong English, on purpose.

**`a word = hitz bat` (A-LEGO)** — no glyph, and renders as one unsplit tile with "a word" under it.
The editor's original refusal was right all along.

## The count

Live Popty API, eus_for_eng, first 50 rounds: 894 rows, 23 carry a mapping, all 23 are M-LEGO
intros. Nothing on build, review, consolidate, debut, or any A-LEGO.

## One thing you should know: reverting wasn't enough

I had made A-LEGO intros mappable earlier today. Taking that back restores the old rule — *no
components, so nothing to derive, so no glyph* — and that rule only LOOKS like yours.

Measured estate-wide: **72 A-LEGOs carry components anyway, and 16 of those have a multi-word
target.** Under the components test they get a glyph they must never have — afr S0113L01 "why can't
I", ita S0288L01 "to most people", ita S0289L03 "I wonder if", and 13 more. That hole predates
yesterday's feature entirely.

So mappability is now gated on the **declared type**, which is what actually records splittability:
M only, everywhere. The glyph is gone from the viewer, and the save endpoint refuses a non-M lego
row, so a stray call can't author one behind the UI's back. The learner side refuses too, in both
cycle producers — a row authored before the rule landed can never reach a learner as pieces.

## What I put back

`hitz bat` briefly carried a mapping I authored while the brief still called for it. It has been
cleared. **No A-LEGO estate-wide carries a mapping now.**

The M-LEGO's mapping stands: I cut *I'm trying to remember* as **remember / trying to / I'm**. That
is my segmentation, not your ruling — a few taps in the editor changes it.

## The re-sourcing stands, unchanged

Authored mapping is the primary feed for tile display wherever one exists on an M-LEGO.
Componentisation is the fallback wherever none has been authored. Nothing special-cased in the
assembler; A-LEGOs render as one tile because that is what they are.

## Still worth your eye

That M-LEGO could not be mapped correctly at all until I widened one guard. Its components
(`gogoratu`, `nahian ari naiz`) **do not occur in its own target text**, so the row's starting gloss
words were "to remember" + "wishing to" while its known text reads "I'm trying to remember" — every
correct literal build was rejected as an invented word. The row's own known text is now equally
acceptable. The guard's purpose is intact: no word may be invented or re-translated.

Those stale components are a content question, not a display one, and I have not touched them.

## What I did not do

No TTS, no audio, no re-rendering. No bulk backfill — one eus_for_eng row carries an authored
mapping; every other intro in the estate falls back to componentisation exactly as before. No course
text edited.
