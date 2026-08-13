# The mapping editor, verified on the live site

**Verdict: it works on popty.app right now.** 17 of 17 checks passed in a real
browser against the deployed site and the live watson-1 backend. The row that was
edited has been put back exactly as it was found.

**[Open the walkthrough — six frames, one scroll](https://watson-1.tail4968cb.ts.net/evidence/mapping-editor-2026-08-12/index.html)**

## What was driven

A real Chromium session: logged in to `https://popty.app`, opened the Basque
course script viewer, found the `hitz bat` area (Round 18, LEGO `S0006L02`),
opened the mapping, split a chunk, nudged a gloss word across the break,
reloaded the whole site to prove it persisted, then restored the row.

Nothing here is a local build. The deployed JS chunk served by popty.app
contains the editor's own markup, and the build stamp in the corner of the page
reads `c249be9b` — the exact commit. The `known_gloss_segments` migration is
applied on the production database on both tables.

## The checks

| | Check | Result |
|---|---|---|
| 1 | The "check mapping" glyph is on the live page | 253 of 283 rows |
| 2 | Rows with nothing to align show no glyph | 30 rows correctly have none |
| 3 | The `hitz bat` row is findable | `hitz bat ikasi nahi dut` |
| 4 | That row carries the glyph | yes |
| 5 | The row does not get deeper when the mapping opens | 52.0px → 52.0px |
| 6 | No other row moves or resizes | 283 measured, 0 moved, 0 resized |
| 7 | The target line is the row's own sentence, in TARGET order | `hitz bat ikasi nahi dut` |
| 8 | The literal gloss sits beneath it | `a word · to learn · I want` |
| 9 | The row's exact starting state was captured for restore | `eus_for_eng:S0006L02B02` |
| 10 | A multi-word chunk offers a split control | 2 split points |
| 11 | Tapping inside a chunk splits it | 3 → 4 chunks |
| 12 | The split saves against the live API and says so | "Saved" |
| 13 | Nudging never moves a target word | confirmed |
| 14 | Nudging moves a gloss word across the break | `a`,`word` → `a word`,`·` |
| 15 | The new cut survives a full reload of the live site | confirmed |
| 16 | The row is back exactly as it was found | confirmed — see the gap below |
| 17 | The existing row controls are all still there | 263 pencils, 283 plays, 20 rounds |

The course is back to zero human-segmented rows on both tables, which is exactly
the state it was in before this run. No text, no audio and no other row was
touched.

## Two things to know before pointing Deborah at it

**The bare `hitz bat` row itself has no glyph.** The row Deborah actually
reported — the INTRO/LEGO row reading `a word → hitz bat` — shows no mapping
glyph on the live site. That is the code behaving as designed, not a fault:
`hitz bat` is an A-LEGO with no components stored, so there is no faithful
segmentation to derive and the build deliberately refuses to guess one rather
than invent a split. The alignment a learner actually sees comes from the phrase
rows underneath it, and those all have the glyph. So the fix she wants to make
is one row down from the row she pointed at. Worth one sentence to her, or she
will tap the row she reported and find nothing there.

**There is no way to un-segment a row.** The save endpoint refuses
`segments: null` with `segments must be a non-empty array`. That means a row
which no human has ever segmented cannot be returned to that state through the
UI or the API — once anyone opens it and taps once, it is permanently marked as
hand-segmented, even if they immediately undo the change. It is harmless to a
learner (the stored cut and the derived cut render identically) but it is a
one-way door, and it is why this run's restore had to be finished with a direct
database write rather than through the same gate the UI uses. If Deborah is
going to explore, she should be able to back out. Small fix; worth doing before
she starts.

## Gap in this report

No screen recording. Playwright captured one, but the surface that serves this
page has no video content type in its static map and its document renderer
embeds audio but not images or video — so the walkthrough is the six sequential
frames linked above, which is the alternative the brief allowed. The raw video
exists on watson-1 but cannot be served to a phone without a change to the
surface.

## The frames individually

- [1 — find the row](https://watson-1.tail4968cb.ts.net/evidence/mapping-editor-2026-08-12/01-found-the-row.png)
- [2 — tap the glyph, two lines appear](https://watson-1.tail4968cb.ts.net/evidence/mapping-editor-2026-08-12/02-mapping-open.png)
- [3 — split a chunk, saved](https://watson-1.tail4968cb.ts.net/evidence/mapping-editor-2026-08-12/03-after-split.png)
- [4 — nudge a gloss word across the break](https://watson-1.tail4968cb.ts.net/evidence/mapping-editor-2026-08-12/04-after-nudge.png)
- [5 — still there after a full reload](https://watson-1.tail4968cb.ts.net/evidence/mapping-editor-2026-08-12/05-persisted-after-reload.png)
- [6 — restored, byte-identical to frame 2](https://watson-1.tail4968cb.ts.net/evidence/mapping-editor-2026-08-12/06-restored.png)
