# INFLECT applied — the excited family now agrees with its subject

**Course:** fin_for_eng · **Date:** 2026-08-19 · **Ruling:** Kai, 2026-08-19 — INFLECT
**Background:** /d/774dee6e

## What changed

**16 rows** now carry a possessive suffix that agrees with the person of the sentence.
Estimate was ~15. The excited family was **exactly 15** — but 14 of those were fixable
and **2 extra rows in the worried family had the identical defect**, so 16 shipped.
The delta is explained below.

### Excited family — `innoissaan` → `innoissani` (14 rows)

| Seed | Row | Known | Before | After |
|---|---|---|---|---|
| 122 | seed | it's starting to feel easier and I'm excited about how it's going | …mä oon **innoissaan** siitä, miten se menee | …mä oon **innoissani** siitä, miten se menee |
| 122 | lego L3 | I'm excited | mä oon **innoissaan** | mä oon **innoissani** |
| 122 | L3 p2 *component* | excited | **innoissaan** | **innoissani** |
| 122 | L3 p3 | I'm excited | mä oon **innoissaan** | mä oon **innoissani** |
| 122 | L3 p4 | I'm excited about it | mä oon **innoissaan** siitä | mä oon **innoissani** siitä |
| 122 | L3 p5 | I'm really excited | mä oon tosi **innoissaan** | mä oon tosi **innoissani** |
| 122 | L3 p6 | I'm really excited about it | mä oon tosi **innoissaan** siitä | mä oon tosi **innoissani** siitä |
| 122 | L3 p7 | I'm excited that I'm learning Finnish | mä oon **innoissaan** siitä, että mä opin suomea | mä oon **innoissani** siitä, että mä opin suomea |
| 122 | L3 p8 | I'm excited this evening | mä oon **innoissaan** tänä iltana | mä oon **innoissani** tänä iltana |
| 122 | L3 p9 | I'm really excited about it now | mä oon tosi **innoissaan** siitä nyt | mä oon tosi **innoissani** siitä nyt |
| 122 | L3 p10 | I'm excited about what we're doing | mä oon **innoissaan** siitä, mitä me tehdään | mä oon **innoissani** siitä, mitä me tehdään |
| 122 | L4 p6 | it's starting to feel easier and I'm excited… | …mä oon **innoissaan** siitä… | …mä oon **innoissani** siitä… |
| 249 | L1 p12 | I'm excited because you help me | mä oon **innoissaan**, koska sä autat mua | mä oon **innoissani**, koska sä autat mua |
| 574 | L1 p10 | I'm excited that the holidays are soon | mä oon **innoissaan**, että lomat on pian | mä oon **innoissani**, että lomat on pian |

### Worried family — 2 rows had the same defect (beyond the brief)

Seed 270 teaches `huolissani` correctly. Two later rows contradict it with a
first-person subject on the levelled form — the exact disease the ruling cures,
in the family the ruling used as its *correct* exemplar. Both sit after seed 270,
so `huolissani` is already taught and the fix introduces nothing new.

| Seed | Row | Known | Before | After |
|---|---|---|---|---|
| 343 | L2 p5 | i'm worried about the economy | mä oon **huolissaan** taloudesta | mä oon **huolissani** taloudesta |
| 421 | L2 p9 | i'm worried because he's getting weak | mä oon **huolissaan**, koska se heikkenee | mä oon **huolissani**, koska se heikkenee |

## The course already agreed with Kai

The hunt turned up a **third** member of the family nobody mentioned:
**seed 139 teaches `pahoillani` — "I'm sorry" — 26 rows, all first person, all correctly
inflected.** It predates seed 270 by 131 seeds.

So the real picture was never "two families disagree". It was **three families inflect
and one didn't**: `pahoillani` (139), `huolissani` (270), `huolissaan` (343, correctly
third-person) — against `innoissaan` (122). Seed 122 was the sole outlier, and it was
also the **earliest**, so it was setting the learner's first impression of the pattern
and then being silently contradicted 17 seeds later. INFLECT was the right call.

## Two rows RAISED, not shipped — I need a decision

The second-person possessive **`-si` appears nowhere in this course** (zero hits for
`*ssasi*` and `*llasi*` across all 14,123 phrases). Two rows have a *second-person*
subject on the levelled form. Fixing them correctly needs `-si`, which the learner has
never been given — so shipping them would break the untaught-vocabulary rule.

| Seed | Row | Known | Now | Would need |
|---|---|---|---|---|
| 128 | L1 p10 | you're excited about it | sä oot **innoissaan** siitä | sä oot **innoissasi** siitä |
| 385 | L1 p8 | were you worried about it? | olitko sä **huolissaan** siitä? | olitko sä **huolissasi** siitä? |

These are now the only surviving inconsistency, and they matter: after this pass a
learner meets `innoissani` at 122 and then `innoissaan` at 128, six seeds later.
Options, your call:

1. **Teach `-si`.** Add it properly at seed 128 (which is already a "sä oot + adjective"
   drill). Completes the paradigm; costs one new teaching point.
2. **Rephrase both away from the second person** — e.g. seed 128 p10 becomes another
   taught adjective in the same `sä oot` frame. Cheapest, loses two phrases.
3. **Leave them.** Not recommended — it relocates the original defect rather than
   curing it.

## One more sibling, out of scope

`tosissaan` ("serious", seed 482, 12 rows) is levelled the same way across *every*
person: `mä en oo tosissaan`, `ootko sä tosissaan?`, `ne on tosissaan`. It is a
different lexeme and is more strongly frozen in colloquial Finnish than the others,
so I have **not** touched it. It is the same question as seed 122 and deserves the
same ruling. Flagging, not acting.

## Audio

**None. Nothing generated, nothing deleted, nothing unlinked.**

fin_for_eng has **313 audio clips, all of them English known-side** — 0 target clips,
0 presentation clips. Every one of the 53 family rows had NULL on all four audio
columns before and after. No clip anywhere in the course contains any of these words.
Because only Finnish `target_text` changed and the English known side is untouched,
no existing clip is invalidated.

The presentations-mirror-the-lego rule is therefore satisfied vacuously — there is no
presentation clip for the seed 122 lego to mirror. Nothing was flagged for
re-recording, because there is nothing recorded.

**Spend: £0.00.**

## Method

Detector calibrated on both known cases first: it finds seed 122 and leaves all 15
seed-270 rows alone. It enumerates every `STEM + (ssa|lla) + POSSESSIVE` token in the
whole corpus rather than searching for words I already expected, then checks each
against the person of its clause.

Every affected row was checked — none sampled. 668 seeds, 1,425 legos, 14,123 phrases
read in full. **53 rows** in the construction class: 16 changed, 35 verified already
correct, 2 raised.

False positives found and excluded, with reasons:

- **`ollaan` (60 rows)** — `me ollaan` is the impersonal verb form "we are". Not a
  possessive at all.
- **`kanssanne` (17 rows, seeds 639/642)** — `teidän kanssanne`, formal "with you".
  A real possessive, but it already agrees with `teidän`. Correct as-is.
- **`tosissaan` (12 rows)** — real, but a different lexeme; raised above, not counted.

One bug in my own detector, caught before it did damage: JavaScript's `\b` is
ASCII-only and never fires next to `ä`/`ö`, so the first person-detector silently
returned "undetermined" for every row containing `mä` or `sä` — it would have missed
seeds 249, 343, 421 and 574 entirely and reported a clean 12. Rewritten with explicit
Unicode boundaries; the row count went 12 → 16.

## Verification

Re-read live from the database after writing, not from my own edit log:

- 53 family rows re-read; **0** first-person-subject rows still carry `-aan`.
- `innoissaan` now survives at **seed 128 only** — the raised row.
- `huolissaan` survives only on third-person subjects, plus seed 385 — the other raised row.
- All changed rows still have NULL audio on every column.
- Seed 122 version 15 → 16; `approved_at` is NULL, so it re-enters the approval queue
  as intended. (It was already NULL beforehand — this seed was never approved.)
