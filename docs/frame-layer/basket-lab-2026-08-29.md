# The basket lab — what changed, and the five things that need one word from you

2026-08-29. Branch `lab/basket-lab`, not merged. Live at **https://watson-1.tail4968cb.ts.net:8461/lab**, grid at **/lab/grid**.

## What it is now

The seed is how you *navigate* to a basket; the basket is what you *judge*. So it is the **basket lab**: the branch, the directory, the page, the prose. `/lab` still works — it is the address you have bookmarked — and `/basket-lab` redirects to it.

Three things are new.

**Generate on demand.** A button on every basket and every grid cell posts a job and returns immediately. The page polls and fills in. At most **two** generations run at once; a third says QUEUED and means it. A failed cell says why, with the generator's own last lines. The candidate JSON file is the cache, so a cell that has one renders instantly; **regenerate archives the old set beside it** rather than overwriting, because your verdicts are pinned to a candidate stamp.

**The grid.** Pick courses and seeds, get a column per language and a row per seed. Down a row it is the same seed realised in different pairs. It already shows something: seed 599 is **ATOMISATION** in Spanish and **LEXICAL ONLY** in French — same seed, different pressure per pair.

**Taste versus measurement, said out loud.** Every column tells you which it is. You can taste the English known side everywhere. The target side is tastable only in the pairs on a list; everything else is marked INSTRUMENT-ONLY, tinted, and says in words that the target side there is measured, not tasted.

## Components are an admission layer

Your ruling is implemented. Two kinds of admission: a **LEGO admission creates a learning event** — a basket, floors, practice. A **component admission extends the available vocabulary** and nothing else.

- Component rows are now read for availability and for atomisation, and still ignored when computing what a seed teaches.
- **ATOMISATION** is the fifth verdict. Seed 599 now derives as ATOMISATION with its evidence: `habría` was bundled inside `lo habría hecho` at seed 152, and becoming a LEGO with a basket of its own is the learning event.
- Availability is **per basket**: everything through seed N-1, plus the LEGOs of this seed that come before this one, plus their components. LEGO 1 gets none of its siblings; LEGO 4 gets all three.
- FRAME is scored against `min(phrase count, frames this course has attested)`, so a thin basket at seed 12 and a thin basket at seed 600 read the same. Where the pool is rich — every late seed — it is the old behaviour exactly.

One correction to the brief: `hubieras` is **not** an atomisation. It has never appeared anywhere earlier in spa_for_eng, in any LEGO or any component — it is genuinely new material. `habría` is the promotion, and it is the one the LEGO-only diff was missing.

## Two shared tallies found and fixed

The grid exposed both immediately.

1. **The diversity weights leaned to SPLIT for every course.** SPLIT is spa_for_eng's expensive mapping class. deu_for_eng's is INVERSION and zho_for_eng's is DETERMINISTIC. Read per course now.
2. **The split matchers are twelve Spanish morphology regexes and were applied to every course.** A French seed simply never matched, so the lab said "no split in play" — absence dressed as an answer, in the axis with the heaviest weight and the only floor set to 1.00. Matchers are keyed by target language now, and a pair with none reports its splits as **UNREADABLE**, not absent.

Frame attestation was also being read from `english-pattern-inventory.json`'s `first_seed`, which carries `"course": "spa_for_eng"` in its own header. It is now computed from each course's own prior seeds. The known side is not one canonical set across the estate: seed 1 has 116 distinct known texts across 130 courses, and cym_for_yor's known side is Welsh.

## Five defaults I took — overrule any of them in a word

1. **Which pairs you can taste on the target side.** Defaulted to `spa_for_eng, fra_for_eng, deu_for_eng, cym_for_eng`. Everything else is instrument-only. Editable at the bottom of the grid page; the list lives in `labs/basket-lab/taste-languages.json`.
2. **Concurrency capped at 2.** This box also carries the Command Surface. Three at once did hold one in the queue and load peaked at 3.7 of 4 cores.
3. **The grid defaults to 2 courses x 2 seeds** — `spa_for_eng, fra_for_eng` at `599, 600` — rather than anything that invites nine simultaneous passes on a first click.
4. **A per-basket "regenerate" button rewrites the whole seed.** The generator's unit is the seed's prompt and I did not split it; the button says so.
5. **Cells show baskets as PASS/FAIL per LEGO, not full phrase lists.** They are never averaged and no seed composite is shown on the grid. Open a cell for the deep view where you judge phrases.

## What is unchanged, deliberately

`spa_for_eng-599.json` and `spa_for_eng-600.json` were **not** regenerated — your existing verdicts point at their stamps. They are the last sets under the old rules. The three new ones (`spa`, `fra`, `deu` at seed 12) are the first under the new ones.

The three held generator improvements — recency-weighted neighbour pool, frame tally ranked by deficit, within-basket ordering — were not touched.
