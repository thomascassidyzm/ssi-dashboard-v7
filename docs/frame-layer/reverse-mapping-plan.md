# eng_for_X reverse mapping — the plan (step 2 of 7)

One page, committed before the main document, per the commission. 2026-08-30.

## The two pairs

- **eng_for_spa** — the easy control. The forward table (`pair-mapping-classes.md`) is complete
  for spa_for_eng, all 12 splits have live minimal pairs, and the eng_for_spa course exists with
  618 LEGOs over seeds 1–300 to measure against.
- **eng_for_zho** — the hard case, Tom's default and mine. Erasure-becomes-admission bites hardest
  here (articles, tense, plurality, do-support — none marked on the Chinese known side), the
  seed-600 evidence in `frame-zut.md` is already zho, and the course exists with 502 LEGOs over
  seeds 1–300. jpn is used only as corroborating contrast where already attested (register).

## Measured facts already in hand (pulled live tonight, 2026-08-30)

- All six courses carry 668 seeds; the three eng_for_X LEGO layers stop at **seed 300**
  (618 spa / 502 zho / 719 jpn legos).
- **The eng_for_X courses are not mirrors.** English (target) side ≈ the canonical English seed
  set: 648/668 (spa), 608/668 (zho), 654/668 (jpn) match the forward course's known side after
  normalisation. The KNOWN sides were independently authored: only 139/668 (spa), 192/668 (zho),
  **9/668 (jpn)** match the forward course's target text. eng_for_jpn's known side is polite
  register throughout where jpn_for_eng's target is plain. The known-side-as-teaching-instrument
  ruling is already operating per direction in the live data.
- `extract-patterns.cjs eng_for_spa` does **not** transfer: only P20 fires (it matches a literal
  `?`). The English frame regexes are on the wrong side of the table, as suspected in the brief.

## Provisional reverse classes (to be tested against the LEGO layers, not asserted)

Reading the four classes backwards, keyed by what the NEW known side gives the learner:

1. **DETERMINISTIC** stays deterministic only where the mapping is bijective — to be checked,
   not assumed.
2. Forward **SPLIT** → reverse **CONVERGENCE**: two known forms, one English frame. ZUT is
   one-directional, so this class is *cheap* in reverse — the entire expensive class of
   spa_for_eng should evaporate in eng_for_spa. If the measurement confirms it, that is the
   headline asymmetry.
3. Forward **INVERSION** → reverse **INVERSION**: the shape still mirrors, but the walk is the
   other way; cost to be assessed on real cuts, not assumed symmetric.
4. Forward **ERASURE** → the reverse class Tom is pointing at, provisionally two sub-cases which
   the evidence must separate:
   - trigger recoverable from elsewhere in the known sentence or its morphology → a reverse
     SPLIT after **re-cutting** (podré → "I'll be able to");
   - trigger nowhere in the known language at all → the **unnamed class**: frame-ZUT
     unsatisfiable by any cut, satisfiable only by differentiating the known-side prompt itself.
     Name to be chosen once the attested examples are on the table.

## What gets measured (steps 3–4)

Against the live eng_for_spa and eng_for_zho LEGO layers and seeds:
- same known text cut two different ways (reverse-ZUT divergence, with lego_id and live text);
- one known chunk mapping to two or more English forms;
- minted material: English machinery in targets/components with no known-side counterpart
  (articles, do-support, tense, plurality);
- where the independently-authored known side already differentiates (the tratando/intentando
  case at eng_for_spa seed 2).

Deliverables: `reverse-mapping-classes.md` + `.json` (default names, flagged for report), the
unnamed class defined as sharply as the four existing ones, the cut-cost statement, and a reverse
frame-ZUT rule in checkable form.
