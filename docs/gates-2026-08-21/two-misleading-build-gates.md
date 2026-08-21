# Two build gates that were teaching workers to work around them

**21 August 2026 · tooling fix, no course content touched · branch `fix/two-build-gates-2026-08-21`**

Both defects were found by the workers building the Connemara Irish course. In both
cases the *output* was fine and the *gate* was wrong, which is the expensive kind:
the worker cannot tell whether to fix the line or fight the tool.

---

## Defect 1 — containment rejected one Irish mutation and accepted the other

In Irish, Welsh, Scottish Gaelic and Breton the first consonant of a word changes in
certain grammatical contexts. Irish has two such changes:

- **lenition** puts an *h* after the first letter: `bean` → `bh`ean
- **eclipsis** puts a letter in *front*: `bean` → `mb`ean

Either way it is the same word. The containment gate — "every practice phrase must
contain the LEGO you are teaching" — did a plain text search for the LEGO inside the
phrase. And a plain text search is arbitrary about mutations:

| LEGO | phrase | old verdict | why |
|---|---|---|---|
| `bean` | an **mb**ean | ✅ accepted | eclipsis prefixes, so "bean" is still literally in there |
| `bean` | an **bh**ean | ❌ rejected | lenition splits it: b‑h‑e‑a‑n does not contain b‑e‑a‑n |
| `cat` | an **gc**at | ✅ accepted | |
| `cat` | an **ch**at | ❌ rejected | |
| `fear` | an **bhf**ear | ✅ accepted | |
| `fear` | an **fh**ear | ❌ rejected | |

Same grammar, opposite verdicts, and no way for the worker to predict which. There was
also a second containment path (word-by-word, used for German-style word order) that
rejected **both** — so the same phrase could pass or fail depending on which route
through the builder it took.

**What it does now.** Both containment paths ask the same question: *is this word the
LEGO, or a grammatically mutated form of it?* The mutation table is not new — the phrase
decomposer has had one since Tom's ruling that "mutations are NOT errors, you can't
introduce every mutated form as its own LEGO". It has been lifted into a shared module
(`services/course-builder/lib/initial-mutations.cjs`) so the decomposer and the gate now
agree on what counts as the same word. Only Irish, Welsh, Scottish Gaelic and Breton are
affected; every other language behaves exactly as before, byte for byte.

Verified against the real failing cases: all six Irish forms above now pass, both paths.
A phrase that genuinely doesn't contain the LEGO (`bean` vs "an fhear") is still rejected.

## Defect 2 — the duplicate check threw away the question mark

Before comparing two lines the deduplicator stripped trailing punctuation. So

> "Lernst du Deutsch" and "Lernst du Deutsch**?**"

were the same line, and one of them was **silently dropped** at write time. A statement
and the question built from it are two different teaching items.

The stripping was there for a real reason — a trailing full stop, a stray comma, a
trailing space are noise, and a course shouldn't hold two copies of a line because one
author typed a period. That tolerance is kept. What changed is that punctuation which
changes the *meaning* now survives: a final question mark or exclamation mark is part of
the line's identity.

| pair | old | now |
|---|---|---|
| "I want" / "I want." | same | same |
| "I want" / "i want ," | same | same |
| "An bhfuil tú go maith?" / "…go maith??" | same | same |
| "Tá tú ag dul." / "Tá tú ag dul?" | **same** | **different** |
| "Cén iontas" / "Cén iontas!" | **same** | **different** |

Question marks written differently across scripts (`?`, `？`, `؟`, the Greek `;`) all fold
to one mark, so noisy typing still dedups.

---

## Blast radius — measured, not estimated

Every gate here runs on every course. So both fixes were run against **all 751,457
practice-phrase rows across 118 courses**, comparing the old verdict with the new one
row by row. Script and method: `docs/gates-2026-08-21/gate-blast-radius.cjs`.

### Containment

| | rows |
|---|---|
| newly **fail** anywhere on the estate | **0** |
| newly **pass** — text-search path | 265 |
| newly **pass** — word path | 356 |

Nothing gets newly flagged. Nothing that passes today stops passing. The newly-passing
rows are all Celtic and all real mutations:

| course | newly pass (text / word) | example |
|---|---|---|
| cym_s_for_eng | 163 / 217 | LEGO `mab` in "mae gyda ni **fab**" |
| cym_n_for_eng | 101 / 138 | LEGO `pump` in "mae'r hynaf yn **b**ump rŵan" |
| cym_anthem_for_jpn | 1 / 1 | LEGO `rhyddid` in "dros **r**yddid" |

**Finding worth noting: Irish scores zero.** Not one existing `gle_for_eng` row is a
mutated form. Welsh content has hundreds. That is the gate's fingerprint — Irish builders
have been steering around mutations rather than writing natural Irish, which is exactly
the behaviour this fix is meant to stop.

**No course depends on the buggy behaviour.** The Welsh rows above are already in the
database; they were getting in through the looser route while the stricter route would
have rejected them. After the fix both routes accept them.

**Residual risk, stated plainly.** Forward-mutation can in principle over-accept a short
word: Welsh `ci` (dog) mutates to `chi`, which is also the word "you". A phrase containing
"chi" would count as containing `ci`. This is inherent to the approach the decomposer
already uses estate-wide, and the alternative (de-mutation) is many-to-one and worse.
Not seen in any of the 751k rows measured.

### Duplicates

| | rows |
|---|---|
| existing pairs the old rule collapsed and the new rule keeps apart | **204** across 37 courses |
| …of which are inside a single LEGO | 174 |
| existing rows the new rule collapses that the old rule kept apart | **7** |

The 204 are the defect in the wild — real statement/question pairs that any rebuild would
have silently dropped one half of:

| course | pairs | example |
|---|---|---|
| fra_for_eng | 43 | "quand as-tu commencé" / "quand as-tu commencé ?" |
| ita_for_eng | 36 | "quando hai cominciato a parlare" / "…parlare?" |
| kor_for_eng | 27 | "집에 갈 준비됐어요" / "집에 갈 준비됐어요?" |
| por_for_eng | 23 | |
| **gle_for_eng** | 14 | "an bhfuil tú réidh le dul abhaile" / "…abhaile?" |
| deu_for_eng | 8 | "Lernst du Deutsch" / "Lernst du Deutsch?" |
| 31 further courses | 1–6 each | |

The **7 in the other direction** are the one tightening in this change, all in
character-based courses: the old rule only knew Latin punctuation, so it never recognised
the CJK full stop `。` as noise. All seven are a line and the identical line with a
trailing `。` — jpn_for_eng ×3, nan_for_eng ×3, hak_for_eng ×1 (e.g. "全然分からない" /
"全然分からない。"). Those genuinely are duplicates and collapsing them is correct, but it
means seven existing rows would be deduped away on a rebuild of those three courses. Flagged
here rather than acted on: **no course content was edited by this job.**

---

## Gaps and things deliberately not done

- **The vocabulary tiling gate was not touched.** It splits a phrase into known chunks and
  is just as mutation-blind as containment was. It was outside this brief; it is a real
  follow-up.
- **No course content was edited.** The 7 CJK duplicates and the zero Irish mutation rows
  are reported, not fixed.
- One test file (`PodLab.casting.test.js`) fails intermittently under the full parallel
  suite and passes in isolation, on this branch **and** on clean `main`. Not caused by
  this change.

## Gates run

- `node tools/check-service-syntax.cjs` — 99 files parse, OK
- `npx vitest run` — full suite. Same 5 failures as clean `origin/main`
  (clip-identity migration snapshot ×1, LearningJourneyAudioFlags ×4), plus the flaky
  PodLab test above. 7 new unit tests added for these two fixes, all passing.
