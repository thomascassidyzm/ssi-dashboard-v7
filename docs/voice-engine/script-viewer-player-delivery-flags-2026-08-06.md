# Script Viewer: the intended course, with the gaps flagged in place

**2026-08-06. Display only — nothing generated, published or gated changes.**

Script View still shows the **full intended course**, exactly as before. It now
**annotates** every row and every round the live player cannot deliver today,
without hiding a single one.

## What a reviewer now sees

- **On a row** — an amber chip, `⚠ audio missing`, naming which voice is absent:
  *prompt*, *voice 1*, *voice 2*. Hovering says why the player skips it.
- **Where a review points at a LEGO the player never introduces** — `⚠ review
  unreachable`. The review can't fire, because the LEGO it reviews was dropped.
- **On a round** — `⚠ player skips this round — voice 2 audio missing`. This is
  the big one: a LEGO short of any one of its three voices makes the player drop
  the **whole round**, not the cycle.
- **Where earlier gaps have shifted the numbering** — a quiet `player: R47` next
  to R48, so the number a producer quotes matches the number a learner sees.
- **In the stats bar** — `Player can't deliver: 29, in 1 dropped round`.
- **The green tick now means the player can deliver the row**, not merely that
  Popty's preview has something to play. A row missing only its second target
  voice used to show green while the player dropped its entire round.

Nothing is filtered. "As the learner hears it" stays off by default, untouched —
this is additive annotation, and deciding a course isn't ready to ship stays a
human call at the approval gate.

## Verified against the live database

Read-only, against the courses in the 6 August systematic diff. The flags match
that investigation row for row:

| course | what the annotation flags | matches the investigation |
|---|---|---|
| `fra_for_eng` | 1 dropped round at **R46** (`S0015L01`, no voice 2); the 14 rounds after it renumbered | yes — "shifts by 1 from round 47, S0015L01 lacks its second target voice" |
| `ara_lb_for_eng` | **776** dropped rounds, first at **R639** (`S0301L01`, no audio at all) | yes — player plays 638 rounds and ends; 776 rounds invisible |
| `deu_for_eng` | **4** flagged phrase rows in rounds 401-460 | yes — 4 |
| `ita_for_eng` | **9** flagged phrase rows in rounds 401-460 | yes — 9 |

Example flagged rows, live: *"a while ago we talked about something different"*
(deu, no prompt audio); *"can you come at six o'clock?"* (ita, no audio at all);
*"he's going to meet me tomorrow afternoon"* (ara_lb).

## Cost

The check rides the generator's existing course-wide pass — no extra queries, no
per-row lookups. A 1,400-round course costs no more to open than it did before.

## Independent of the in-flight player fix

The flags read the data, not the player's behaviour. When the separate fix makes
a missing-audio LEGO degrade gracefully instead of dropping its whole round, the
round-level flag simply stops being the interesting one and the per-row flags
carry on doing their job. Nothing here needs revisiting.

## Tests

Nine rendered-DOM cases (`LearningJourneyAudioFlags.test.js`): the flagged row is
still rendered; the round header names the missing voice; the tick follows the
player rather than the preview; a fully-voiced course flags nothing. Plus
generator unit cases for each reason a row can be undeliverable, and one
end-to-end case that punches the `fra_for_eng` hole into a fixture course and
asserts the round is shown, flagged, and everything after it renumbered.
