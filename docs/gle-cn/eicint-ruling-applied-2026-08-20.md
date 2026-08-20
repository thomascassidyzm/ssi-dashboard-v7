# The dialect form wins — eicínt applied, and the rail tested on four more pairs

**20 August 2026.** `gle_cn_for_eng` (Connemara Irish for English speakers).
**Zero TTS. Zero audio rows before, zero after. £0.00 spend.**
Course is `draft` / `not_available` — no learner can reach any of it. `gle_for_eng`, the
released Irish course, was **not touched**.

## The ruling

Kai, 2026-08-20 21:33Z, as a **standing rail** and not a one-row answer:

> A dialect as it is actually spoken — look at the Finnish and the Austrian for example.
> If they Google the word, they will likely find discussion about the form.

Where a dialect form and a standard form compete, **the dialect form wins**. The objection
that a learner cannot look the word up in a standard dictionary is explicitly rejected.

This overturns the recommendation in the 20 August open-calls document, which kept standard
`éigin` on exactly that lookup argument. The evidence in that document was already on the
other side; the rail moves the policy line to match it.

## 1. eicínt — what was there, and what moved

**True exposure: 63 rows**, not the 59 previously reported. The earlier figure counted
2 teaching tiles + 57 practice phrases and omitted the **4 seed sentences**.

| where | rows | occurrences |
|---|---|---|
| seed sentences (4, 5, 30, 32) | 4 | 4 |
| teaching tiles (seed 4 lego 1, seed 5 lego 3) | 2 | 4 (sentence + word-tiles) |
| practice phrases (seeds 4–12) | 57 | 58 |
| **total** | **63** | **66** |

**Every one of the 66 occurrences was checked to be the indefinite adjective** — each is
preceded by `rud ` or `duine `. The write refused to run unless that held, precisely so it
could not touch a homograph. There is no `ar éigin` ("barely") and no `b'éigin` ("had to")
anywhere in this course, so the two lexemes that contaminated the corpus count are not a
risk here.

Mutation was not a factor: `éigin`/`eicínt` is vowel-initial, invariant, and never lenited,
eclipsed or inflected in any of these 66 positions. Nothing was blind-replaced.

### Which variant, and why

**`eicínt`**, everywhere, one form.

Ó Curnáin lists eleven attested Connemara variants. Counted across all four volumes today:

| variant | count |
|---|---|
| **eicínt** | **158** |
| eicín | 46 |
| eicíneach | 8 |
| icín | 7 |
| cínt | 5 |
| eicínteach / eichín | 2 each |

And in the two collocations this course actually uses:
`rud eicínt` **53** : `rud eicín` 3 — `duine eicínt` **12** : `duine eicín` 10.

`eicínt` is the dominant written variant, it is the form Kai named, and the final -t is
the one the dialect pronounces. One form, used consistently, in every row.

### The evidence, re-counted independently

Not taken from the earlier document — counted again today from the four extracted volumes,
with word boundaries and homographs separated by hand:

| | count |
|---|---|
| eicínt family (Connemara "some") | **239** |
| éigin raw | 55 |
| — of which `ar éigin` "barely" | 30 |
| — of which `b'éigin` / `béigin` "had to" | 1 (+ several in the 24 below) |
| — of which Ó Curnáin's own metalanguage *about* the form | most of the remaining 24 |
| — **genuine indefinite `éigin` in running Connemara** | **1**, and it is inside a written letter |

And the thing that is stronger than any count: Ó Curnáin's index entry reads
`eicín, eicíneach, … cínt, éigin*, a., some` — his asterisk means **non-attested**. The
describer of this dialect states in his own notation that `éigin` is not a form of it.

## 2. The rail applied to four more pairs

Each pair was re-counted from the corpus myself before anything was decided, then checked
against the course.

| pair | Connemara | standard | verdict | rows moved |
|---|---|---|---|---|
| eicínt / éigin | 239 | 1 | **applied** | **63** |
| aríst / arís | 179 | 19 | attested — **no exposure in the course** | 0 |
| chuile / gach uile | 403 | 44 | attested — **course already correct** | 0 |
| céard / cad | 324 | 24 | attested — **course already correct** | 0 |
| tá muid / táimid | 34 | **0** | attested — **course already correct** | 0 |

All four survive an independent check; the direction is not in doubt in any of them. Three
were already right: the course uses `chuile` (seed 16), `céard` (3 seeds, 2 tiles, 35 phrases)
and `tá muid` (seed 18), and contains not one `gach uile`, `cad` or `táimid`. The fourth,
`aríst`/`arís`, has **zero occurrences of either form** anywhere in the 668 seeds — nothing
to change, and a note for whoever writes the seed where "again" first appears: it is `aríst`.

So the rail cost 63 rows today. The other four pairs cost nothing because the course had
already been built the way the rail now says to build it.

## 3. Consistency

- The form debuts at **seed 4**, on a tile marked new, with its own component intro tile
  `something → rud eicínt`. Seed 5 adds `someone else → duine eicínt eile`. Both intro
  tiles now carry the dialect form, so the learner meets `eicínt` the first time and never
  meets `éigin` at all.
- Every downstream practice phrase in seeds 4–12 matches the tile it is built from.
- Seeds 30 and 32 are translated but not yet decomposed; both were corrected, so the
  decomposition that comes later will inherit the right form.
- **No presentation carries the old form.** Presentation text in this course is derived
  from the tile, and there is no separate stored presentation text; every
  `presentation_audio_id` in the course is empty.
- The audio text field could not hide a defect here: **this course has zero audio rows.**

## 4. What was not touched, and why

- **`gle_for_eng`**, the released standard-Irish course — out of scope by instruction and
  correctly so; it should keep standard spellings.
- **56 redo-snapshot rows** for this course still contain `éigin`. They are dated
  before-images kept deliberately as backups; rewriting history inside a backup would
  destroy the thing it exists to preserve.
- **No TTS was called, no clip generated, replaced or deleted.** Zero audio rows before,
  zero after.
- No progress migration arises: the course is draft, not available, with no learner on it.

## 5. Concurrency

Job #515 was applying the `amárach → amáireach` ruling to this same course at the same time.
**Its changes were already in place before I wrote** — 2 seeds, 1 tile and 8 practice phrases
carrying `amáireach`, with zero `amárach` remaining — and **all eleven are still intact
after my write**. Row-level patches on disjoint fields; the verification pass confirmed that
nothing outside my own 65 fields changed.
