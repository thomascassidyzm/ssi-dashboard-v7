# A-108 — what the database actually says

Measured against the live DB on 2026-08-14, before any edit. Every count below is a query
result, not an estimate.

## Headline: the annotation limb of A-108 has no work in it

**Zero of the 4,852 staged draft lines carry an annotation of any kind.**

The detector covered eight mark classes, not just the obvious one — ASCII slash, Unicode
slash (`⁄ ∕`), round parens (ASCII and full-width), square brackets (ASCII and full-width),
braces, angle/guillemet, backslash, and the `-(` dash-paren form Latvian uses. All eight
return 0 across every draft row.

The brief's premise — that a T-V and annotation defect runs across 4,161 staged pod
translations — does not hold for annotations. Those 4,161 lines are the output of the
translation job run by workers #485–#496, and they landed clean. **Every annotation defect
in the estate is in older, released, audio-backed content.**

## The released-audio set is bigger than the brief, and one course was missed

79 rows carry annotations. All are `target_text_draft = false`. 75 have audio behind them,
resolving to **39 distinct clips**:

| Course | Rows | Distinct clips | Course status | Visibility |
|---|---|---|---|---|
| pol_for_eng | 49 | 25 | beta | public |
| lav_for_eng | 12 | 6 | beta | public |
| por_for_eng | 12 | 6 | **released / live** | public |
| ara_for_eng | 2 | 2 | beta | beta |
| spa_for_eng | 4 | 0 (no audio) | released / live | public |

Two corrections to the brief's "34 lines in three released courses":

1. **`lav_for_eng` was missed entirely** — 6 more clips, 12 rows, publicly visible.
   Latvian uses a `(-usi)` / `(-a)` dash-paren form (`neesmu mācījies(-usies)`) that a
   plain slash detector does not catch. That is why it was invisible.
2. **Only `por_for_eng` is actually `released`/`live`.** `pol`, `lav` and `ara` are `beta`.
   `pol` and `lav` are public-visibility beta, so learners can still reach them.

The row count is inflated by `pod-0-unrecorded` duplicate pods pointing at the same clips —
35 of the 75 rows are duplicates. The work is 39 clips, not 75 lines.

## Re-rendering is not a cost decision

All 39 clips are `origin = tts`. **Zero are human recordings.** Total input is 3,725
characters, about 4.5 minutes of audio. At neural-TTS rates that is single-digit pennies.
The gate here is Tom's approval and make-before-break verification, not money.

**Gap:** none of the 39 clips has ever been whisper-checked (`veracity_checked_at` is null
on all of them), so what they actually say is unverified. Worker #538 is transcribing them.

## The gender question resolves itself

Rule 2 keys on the voice. `listening_pods.speakers` carries a `gender` per speaker role and
it is **100% populated — 973 entries across 42 draft pods, zero gaps.**

Eight courses carry `gender: 'n'` on the Learner: `ara`, `ara_eg`, `hin`, `ita`, `pol`,
`por`, `por_br`, `spa_mx`. That overlaps almost exactly with the annotation-defect courses,
and it is the root cause — a translator handed a genderless speaker writes `cansado/a`.

But the `gender` field is stale metadata. The **actual cast voices** for all eight are
`eve`, `ara`, or `1b12d5daee6b` (Aleksandra). Checked against 120 explicitly-gendered cast
entries elsewhere in the estate, those three voice IDs are **female, with zero male
assignments**. So under Tom's rule as written — "if the voice saying the line is a woman,
cansada" — **all eight resolve to feminine.** `pewny/pewna` → `pewna`, `nervoso/a` →
`nervosa`, `cansado/a` → `cansada`. No decision needed from Tom.

## The register limb inverts

Tom's rule 3 has two halves, and the estate fails the *second* one, not the first.

Too-formal (V in a peer scene) is nearly absent — **20 candidate lines estate-wide**, and
several are false positives by construction: Hindi `आप` is the neutral-polite default,
Basque `zu` is the standard form (`hi` being intimate and rare), Welsh `chi` is plural as
well as polite.

Too-informal (T in a service scene) is the real defect, and it runs by whole language.
Spot-checked and confirmed wrong:

- **Dutch** — `Heb je eten?`, `wil je de menukaart?`, `als je die hebt` to a barista.
  Dutch service convention is `u` / `alstublieft`.
- **Romanian** — `Ai mâncare?`, `vrei meniul?`, `te rog`, `îmi poți recomanda` to a barista
  and a pharmacist. Romanian service convention is `dumneavoastră` / `vă rog`.

The exposure is roughly 1,200 service-scene draft lines across 42 courses. A previous agent
repaired `ukr`, `pol` and `fra` on exactly this fault and had `hye`/`est`/`lav` in flight;
the remaining ~30 languages were never checked against the confirmed rule.

## The scene canon that decides every call

All pods share a 22-scene structure:

| Scenes | Cast | Register |
|---|---|---|
| 2, 3, 7–14 | Barista, Bartender, Waiter, Receptionist, Pharmacist, Assistant, Driver, Local/Tourist, Passenger, fellow Customers | service / stranger → **V** |
| 1, 4, 5, 6, 22 | Neighbour, Friend, Anna/James, Sarah | peer → **T** |
| 15–21 | Learner + Narrator, solo practice | per line |

Scenes 15–21 hold the bulk — 73 lines per course, 3,129 `Learner` lines estate-wide.

## Sibling variants

Lines byte-identical to their parent course, measured: `spa_mx` 201, `ara_eg` 89, `por_br`
71, `fra_ca` 43, `deu_at` 14, `ara_sy` 11. The brief's figure of 229 does not reconcile to
any grouping I can measure; reporting what I counted rather than fitting to it. Workers are
instructed to fix these in place under each variant's own norms and never to copy parent
text across.
