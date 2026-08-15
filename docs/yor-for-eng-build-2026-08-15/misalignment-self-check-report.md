# yor_for_eng — known/target misalignment self-check

**Headline: I found no instance of the estate defect class in my own output — and I can show the check that proves it on the target side, plus the one place it cannot prove anything.**

Scope: the 31 LEGOs and their 74 components written to `yor_for_eng` this session. The check reads the **live rows back out of Postgres**, so it tests what was actually stored, not what my authoring file claims. Tool: `docs/yor-for-eng-build-2026-08-15/misalignment-self-check.cjs` (committed, re-runnable, needs no Yoruba).

Recording-script work is dropped per Kai's correction. No audio was generated at any point; `course_audio` for this course is still the one pre-existing `welcome` row.

---

## Result table

| Check | What it proves | Flags | Real defects |
|---|---|---|---|
| **A** | Component targets reassemble their LEGO target exactly | **0** | **0** |
| **B** | Component knowns reassemble their LEGO known | 11 | **0** — see §B, this check is not valid |
| **C** | Seed TARGET exactly covered, no gap, no double-claim | **0** | **0** |
| **D** | Seed KNOWN exactly covered, no gap, no double-claim | 3 | **3** (minor, known-side) |
| **E** | Same known → different targets | 2 | **0** (was 4, 2 fixed) |
| **F** | Same target → different knowns | 4 | **0** (was 5, 1 fixed) |

**Estate defect class (a side borrowed from a sibling LEGO in the same seed): 0 instances.**

---

## A + C — the target side is mechanically clean

These two together are the real proof, and they need no language knowledge.

**Check A** takes each M-LEGO's components and concatenates their targets in order. If a component had been sliced off the wrong word, the concatenation would not rebuild the LEGO. **All 31 LEGOs / 74 components reassemble exactly.** Diacritic-exact — nothing stripped.

**Check C** takes each seed sentence and asks whether its LEGOs *exactly cover* it, in surface order, **each LEGO used at most once**. That is the direct test for double-claiming and for a LEGO pointing at the wrong piece. It allows LEGOs taught in earlier seeds into the pool, because a seed only declares its *new* LEGOs — but every one of the seed's **own** LEGOs must still be consumed. **All 10 seeds cover exactly. Nothing claimed twice, nothing left pointing at a piece that isn't there, no missing target-side LEGO.**

Together these close off the estate signature on the target side: a piece cannot have been borrowed from a neighbouring LEGO, because every piece is accounted for exactly once and every component rebuilds its own parent.

---

## B — this check is invalid, and that is itself the finding

11 flags, and **all 11 are artefacts of my check being wrong about what a component is.** Component knowns are **per-target-word glosses in target order**, not a segmentation of the English. So:

- `S0006L02` "a word" → `ọ̀rọ̀ kan`, components `word→ọ̀rọ̀`, `a→kan`. Concatenated: *"word a"*. Yoruba postposes `kan`; the glosses follow the **Yoruba** order, not the English.
- `S0003L01` "how to speak" → `bí mo ṣe máa sọ`, five Yoruba words glossed *"how I do will speak"*. The English has no counterpart structure at all.
- `S0002L01` *"i am trying"* vs *"I'm trying"* — contraction only.

I am reporting this rather than deleting it because it exposes the important limitation:

> **The known side cannot be verified mechanically.** Component glosses are not a segmentation of the known sentence, so no arithmetic check can catch a gloss that points at the wrong word. Checks A and C secure the target side completely; the known side rests on checks E/F and on human review. **That is precisely where the estate defect would hide and stay invisible.**

If the estate scan is relying on a reassembly check for its known side, it will have the same blind spot.

---

## D — 3 genuine known-side defects (mine, minor)

Real, and I would not have found them without this check.

1. **Seed 3** — known *"how to speak **as often as** possible"*. My LEGOs gloss `often` and `as possible`. **The first "as" is covered by nothing.** A learner assembling from the taught pieces produces *"often as possible"*.
2. **Seed 7** — known *"to try **as hard as** I can today"*. Same shape: `hard` + `as I can` leaves the first "as" uncovered.
3. **Seed 5** — LEGO known is *"**to** practise speaking"* but the seed sentence reads *"I'm going to practise speaking"*. The leading "to" is in my gloss and not in the sentence.

These are **incomplete known-side decomposition, not false pairings** — the category Kai called less dangerous but still a defect. Cause is real: the English `as X as Y` frame has no Yoruba counterpart (`lóòrèkóòrè tó bá ṣeé ṣe` is 2 chunks for 4 English words), so my glosses approximated. **Not fixed** — the honest fix is to re-gloss `as possible` → `as ... as possible` and `hard` → `as hard as`, which changes what the learner is prompted with, and I would rather a Yoruba speaker rule on the pairing first (question 6 and question 4 in the speakers list).

---

## E + F — 9 contradictions found, 3 fixed, 6 adjudicated as genuine

This is the language-free self-contradiction test. It flagged 9. I went through every one.

**3 were real errors in my own glossing, and I fixed them** (targeted `UPDATE` on `course_legos.components`; no `target_text` touched, so no audio-link trigger fired — and no audio exists anyway):

| Fixed | Was | Now | Why |
|---|---|---|---|
| `S0010L04` | `pé` → **"if"** | `pé` → **"that"** | `pé` is the complementiser *that*. Glossing it "if" was wrong, and it was propping up the already-suspect *"I'm not sure if"* reading. |
| `S0005L01` | `máa` → "going to" | `máa` → **"will"** | Glossed "will" in every other place. Inconsistent. |
| `S0001L03` | `Yorùbá` → "Yoruba" | `Yorùbá` → **"Yoruba (name)"** | The same English word glossed both the whole chunk (`èdè Yorùbá`) and one piece of it. |

**The remaining 6 are genuine facts about the two languages, not slice errors:**

- `I` → **mo** vs **mi** — Yoruba flips the subject pronoun under negation. Seed 10's sentence *literally contains both*: `Mi ò rò pé **mo** lè...`. Each LEGO claims its own occurrence — proven by check C, which covers that sentence exactly with no double-claim. **This is the exact case that looks like the estate defect and isn't**, and it is why "I" is never taught as a standalone LEGO.
- `sọ` → "speak" vs "say" · `bí` → "how" vs "as" · `as` → `tó` vs `bí` — genuine polysemy in one direction or the other.
- `gbìyànjú` → "trying" vs "try" — English inflection of one verb.
- `bí mo ṣe máa sọ` → "how to speak" vs "how to say" — consequence of `sọ` covering both; already speaker question 9.

**The distinguishing signature matters.** The estate defect pairs a known with a target that *belongs to a neighbouring LEGO in the same seed*, and the course contradicts itself by pairing those two correctly elsewhere. Every contradiction above is the opposite: one language drawing a distinction the other doesn't, consistently, with each LEGO holding its own piece of the sentence. None is a swap.

---

## What this says about the shared tool

On this language pair, in this slice, **the decomposition machinery did not produce the defect.** I would not generalise beyond that: 31 LEGOs is a small sample, Yoruba/English is a fresh pair, and — importantly — **I authored these decompositions by hand against the methodology rather than letting a generator slice them**, so this is weaker evidence about the automated path than a bulk-generated course would be.

The finding I would take seriously estate-wide is the §B one: **the known side is not mechanically checkable by reassembly**, so a scan that clears a course on target-side arithmetic has not cleared its known side at all.

---

## One finding I am keeping from the cancelled work

While the recording deliverable was live I traced the audio-ingest path, and the result stands on its own as an estate finding: **no mode of `POST /api/production/:courseCode/recording/upload` can attach externally-recorded audio to a course row that has no `course_audio` row yet.** Regeneration mode 404s without a pre-existing row (`production-api.cjs:4491-4508`); pod mode commits against `listening_pod_sentences` only; script mode writes an S3 object and a `recording_provenance` row and **never a `course_audio` row** — `course_audio` is touched twice in the whole handler, both inside the regeneration branch. There is no multipart route and no bulk-import tool. Since the only thing that mints content audio rows is the TTS path, **a course banked as text has no way in for human audio until someone mints those rows.**

Not acting on it, not designing around it — just not losing it.

---

## Numbers

- 31 LEGOs, 74 components, 10 seeds checked against live rows
- **0** estate-class misalignments · **0** target-side coverage defects · **0** double-claims · **0** missing target LEGOs
- **3** known-side coverage defects (minor, unfixed, documented)
- **9** self-contradictions → **3** fixed, **6** adjudicated genuine
- **248** practice phrases still pass the untaught-word rule: **0** violations (re-run after the gloss fixes)
- Diacritic round-trip unchanged: **28/31** byte-identical, 3 differing only by ASCII leading-capital lowercasing
