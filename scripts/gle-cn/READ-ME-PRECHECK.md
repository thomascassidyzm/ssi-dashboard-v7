# USE THE PRE-CHECKER. DO NOT REBUILD ONE.

Two local pre-checkers already exist. They call the **course-builder's own validation library**,
so a clean run locally means `/api/seed/complete` will not reject you. They cut per-seed time
from ~55 minutes to 10-15.

    node scripts/gle-cn/scratch-d1/precheck.cjs  <yourseed>.md
    node scripts/gle-cn/scratch-d2/preflight.cjs <yourseed>.md [more.md ...]

Between them they reproduce every hard gate: tiling, target vocabulary, lego word-containment,
**3 BUILD / 5 USE phrase counts**, BUILD anti-template, known-side controlled language, syllable
cap, length ratio, and ZUT.

> "Between them" used to be load-bearing and unstated: the **8-syllable LEGO cap** was in
> `preflight.cjs` only, so a worker who ran `precheck.cjs` alone got a clean local pass and a
> `lego_too_large` rejection from the server — the exact round trip these tools exist to prevent.
> Found on seed 202, 21 Aug. `precheck.cjs` now checks the cap too, so **either tool alone is
> sufficient**. Long relative clauses are where this bites.

RUN ONE BEFORE EVERY POST. A rejection you could have caught offline is a minute of night wasted.
The only gate neither can pre-empt is phrase-level ZUT against a phrase another worker lands
between your check and your POST — that one holds out a phrase rather than failing the seed.

---

## THE PALETTE — read this before you write a single phrase (added 2026-08-21, band 74-102 coordinator)

`vocab.cjs` prints a *word* list and it will mislead you. The gate is not words, it is **whole
taught chunks**. Every practice target must tile from lego targets/components already introduced,
and every English prompt must be built from those chunks' **own known glosses** — "more",
"starting", "difficult", "yesterday", "morning", "said" are all *unknown glosses* at seed 74 even
though `vocab.cjs` lists them.

Print the real palette for your seed with:

    node scripts/gle-cn/w-D2/chunks.cjs <seed>

It prints every `"known" -> "target"` pair introduced before that seed, plus a flat chunk list.
**Write only from that.** Three traps it saves you from:

- **Lenition breaks containment.** A lego target `tuiscint` is NOT contained in `a thuiscint`.
  Use the bare form the lego teaches.
- **BUILD comma-tag.** A BUILD line that is the bare lego plus a trailing tag of <=18 characters
  after a comma is rejected as a template stamp. Make the tail substantial or drop the comma.
- **Earlier legos of your own seed are available to later legos, never the reverse.**

## Two things the pre-checker will reject that are not obvious (added by the 194-218 band, 21 Aug)

**1. The known side is EXACT-FORM.** The gate reads LEGO and COMPONENT glosses only — not seed or
phrase English — and allows no inflection: `looking` being introduced does NOT make `look` legal,
`work` does not license `works`, and `yesterday`/`tonight` are simply not in the course yet. So the
English word list printed by `vocab.cjs` is WIDER than what the gate accepts, and writing from it
gets you rejected. Print the list the gate actually uses:

    node scripts/gle-cn/w-D194/glosses.cjs <seed> [substring]

**2. Phrase targets tile from WHOLE taught chunks, never from loose words.** A chunk is an entire
lego target or an entire prior seed target. `tá mé`, `tá sé`, `níl mé`, `an bhfuil tú` are chunks;
bare `tá`, `níl sé`, `agam`, `é` are NOT, so `tá an t-airgead ar an mbord` and `níl an t-airgead
agam` are both untileable however ordinary they look. Test candidates in bulk BEFORE you write the
markdown — `tile.cjs` can only see chunks already banked, so it false-fails every phrase built on
the seed's own new legos; this one takes them as `--add`:

    node scripts/gle-cn/w-D194/tt.cjs <seed> --add "<lego target>" ... -- "<candidate>" ...

## The `[n]` bracket is NOT a syllable count to the server (found by the 123-127 band, 21 Aug)

The build brief calls the bracket on a USE line "the target syllable count", and `sylmd.cjs` stamps
a syllable estimate into it. **The server reads it as a quality score.** `markdown-parser.cjs` puts
a single bracketed value into BOTH `known_score` and `target_score`, and `phrase-structure.cjs`
then **rejects any USE phrase scoring under 5** with the message *"broken English"*.

So the field is quietly doing two jobs, and they disagree:

- Nothing downstream consumes the syllable reading, so a too-HIGH number is harmless — which is why
  no seed has been bitten yet. Every phrase built so far scores well above 5 by accident of length.
- A genuinely SHORT, perfectly good USE line — four syllables — gets stamped `[4]` by `sylmd.cjs`
  and is then **rejected as broken English**. The rejection message will send you off rewriting
  correct English that was never the problem.

**If a USE line is rejected for a low score, check the bracket before you touch the sentence.**
Raising the number is legitimate: it is a quality score, and a short natural sentence is not a
low-quality one. Do not lengthen good English to satisfy a syllable estimate the server never asked
for.
