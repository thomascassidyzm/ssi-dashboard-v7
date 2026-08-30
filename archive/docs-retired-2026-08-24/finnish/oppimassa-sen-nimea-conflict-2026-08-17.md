# "oppimassa sen nimeä" — seed 21, fin_for_eng

## ANSWER: it needs context. Do not leave it as a bare fragment.

Kai's tree asks: earlier only, later only, or both? **Both.**

- `-massa` itself is clean: **seed 21 is the first `-massa/-mässä` form in the whole course.** Nothing earlier.
- But the *fragment* is conflicted from **one seed earlier** and again from **seed 64 onward**. Two different learners, two different correct Finnish answers.

---

## The two conflicts

### 1. EARLIER — seed 20, adjacent. Case clash on the same words.

Both of these are `build` rows, both drilled, and in Finnish *his* and *her* are the same word:

| seed | prompt | answer |
|---|---|---|
| 20 | his name | **sen nimen** |
| 21 | her name | **sen nimeä** |

The learner is handed `sen nimen` for "his name" in seed 20, then in seed 21 the fragment **"learning his name"** wants `oppimassa sen nimeä`. Composing the two cards they actually hold gives them **✗ oppimassa sen nimen**. The partitive is governed by `oppimassa`, and a bare fragment is precisely the context that hides that government.

Seed 20 also drills `to learn his name → oppia sen nimen` — genitive — one seed before `oppimassa … nimeä`.

### 2. LATER — seed 64 onward. "learning X" is taught as `-minen`.

| seed | prompt | answer |
|---|---|---|
| 64 (LEGO L1) | learning Finnish | **suomen oppiminen** |
| 64–137 | 20 phrase rows | `suomen oppiminen on kiinnostavaa`, `suomen oppiminen ei oo helppoa`, … |

Genitive + `oppiminen` is the course's own pattern for the English shape *"learning ⟨noun⟩"*. A learner past seed 64, given the bare prompt **"learning his name"**, will reasonably say:

> **sen nimen oppiminen**

Correct Finnish. Built entirely from cards the course gave them (`sen nimen`, s20 L2 + the `-minen` pattern, s64). Nothing in the bare English prompt rules it out.

### A third, structural point
Seed 21's LEGO L2 is **"you're learning" → "sä oot oppimassa"**. There is no drilled card for bare *"learning" → "oppimassa"* — that mapping exists only on a `component` row, and components are never played to the learner (`cycles.ts:779` selects `build`/`practice`/`use` only; there is a test named `componentsNeverIntroduced`). So the fragment rests on a mapping the learner never hears.

---

## Where `oppimassa` / `-massa` actually appears

| form | first seed | n | note |
|---|---|---|---|
| **oppimassa** | **21** | 29 | first `-massa` in the course |
| muutamassa | 253 | 9 | |
| tapahtumassa | 348 | 13 | |
| maailmassa | 377 | 10 | |
| kulmassa | 395 | 9 | |
| leikkimässä | 547 | 14 | |

`oppimassa` after seed 21: s47, s51, s59, s90, s597, s636 — all inside full clauses (`kun sä oot oppimassa`, `että sä oot oppimassa`). Seed 21 p14 is the **only bare-fragment use in the course**.

Other Finnish renderings of English *learn/learning*: `oppia` (s2+), `oppinut` (s33+), `oppiminen` (s64+), `mä opin / me opitaan` (s101, s109). `oppimaan`, `opiskella`, `opetella` — **0 occurrences anywhere**.

---

## Proposed wording

Replace the bare fragment with the next rung of the build ladder that seed 21 already implies:

> **you're learning his name** → **sä oot oppimassa sen nimeä**

Why this is the minimum:
- It adds only `sä oot` — exactly LEGO L2 as the learner was taught it (`you're learning → sä oot oppimassa`), so it's a clean L2+L3 combination rather than a slice of L2.
- `sä oot` makes the progressive reading forced. `oppiminen` is a noun and cannot take a subject pronoun + copula, so the seed-64 answer is ruled out by the prompt itself.
- Zero collisions: *"you're learning ⟨X⟩"* maps to `sä oot oppimassa ⟨X⟩` at s21, s47, s59 and s90 — no exceptions in the course.
- Seed 21 already drills `you're learning → sä oot oppimassa` at p4 and `why are you learning his name? → miksi sä oot oppimassa sen nimeä?` at p13. The fragment currently sits at **p14, after the complete question** — a regression in the ladder. The replacement belongs before p13, not after it.

If you'd rather delete than replace: p13 already covers the same production, and dropping p14 loses nothing.

---

## Second opinion: the builder's own ZUT gate

Ran `checkPhraseZUT` from `services/course-builder/lib/validation.cjs` — the actual function the submit path calls — over all 52 seed-21 phrases, backwards (its normal `.lt(seed)` behaviour) and forwards.

| | raw hits | confirmed |
|---|---|---|
| backward (seeds < 21) | 2 | **0** |
| forward (seeds > 21) | 15 | **0** |
| the fragment alone, both directions | 0 | **0** |

**Raw 17 → confirmed 0.** Every one of the 17 existing rows it collided against is a `phrase_role = 'component'` row — never played to a learner — and every one is a legitimate case inflection (`you → sä/sun/sulle/sulta/sua/sulla/sut/te/teitä`, `are → oot/on/oo/olette`, `her → sen/siltä/sille`). None is a conflict.

**The gate returns 0 on the fragment itself, in both directions, and it is wrong to.** It compares identical English strings only; both real conflicts here are between *different* English prompts ("learning his name" vs "his name", vs "learning Finnish"). ZUT cannot see them by construction. This is the checker's blind spot, not a clean bill of health.

---

## Calibration

Before trusting any count:

- **Seed 20 "his name" phrases: found 11.** Matches the known figure exactly.
- **Whole-course prompts with >1 Finnish answer: found 200** exact / **202** punctuation-normalised, against the reported 203. Same signal, 1–3 apart — a normalisation difference in the original count, not a coverage gap. *Reported as a gap: I could not reproduce 203 under any of six normalisations tried.*
- Corpus actually swept: **14,053 phrase rows, 1,425 LEGO cards, 668 seed rows.**
- **ASCII trap:** caught in my own work. `/sen (nime\w*)/` captured `nimeä` as `nime` and silently merged the two cases. All censuses were re-run with `\p{L}\p{M}` + NFC. The false split was in the tool, not the data.

**Scope:** investigation only. No course data changed. Read-only queries throughout.
