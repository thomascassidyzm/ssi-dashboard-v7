# ZUT Expansion Plan — strip-induced conflicts, all courses (2026-06-25)

**PLAN ONLY — no DB writes.** Goal: resolve the 176 ZUT conflicts where the learner sees one English gloss but must produce different targets (the parenthetical grammar label was the only thing telling them apart). Per `methodology-zut-resolution`: carry the distinction in **natural context**, expand **both sides**, keep vocab introduced, tile into the seed, give enough context to know *which* to say.

Source data (refreshed on current DB): `scripts/experiments/weekend-scan/ZUT-EXPANSION-INPUT.md` + `temp/weekend-scan-2026-06-19/zut-expansion-input.json`.

## Scale (176 strip-induced conflicts)
| course | conflicts | | course | conflicts |
|---|---|---|---|---|
| deu | 52 | | spa | 8 |
| kor | 51 | | por | 8 |
| ara | 23 | | zho | 7 |
| fra | 21 | | ita | 6 |
| | | | jpn | 0 |

(slash 120 + raw-synonym 34 handled separately — not this plan.)

## Resolution taxonomy — six sub-patterns, each a different fix

### A. Person cue → EXPAND with the pronoun (cleanest, do first)
The two targets differ only by **person/number**, and the seed already supplies the subject — just lift it into the gloss.
- deu `should (1pl)`→sollten ⟹ **"we should"→sollten** (seed: "maybe **we** should open the door"). `should`→soll stays.
- deu `wanted (past)`→wollten (3pl) ⟹ **"they wanted"→wollten** (seed: "if **they** wanted to").
- ara `ready (plural nom)`→مُسْتَعِدّونَ ⟹ **"you all ready"→مُسْتَعِدّونَ** (seed: "are **you all** ready?").
- spa `to wake up (oneself)`→despertarse vs despertarnos ⟹ **"to wake up"→despertarse / "for us to wake up"→despertarnos** (reflexive person).
Checks: pronoun already taught; expansion tiles the seed; disambiguates by explicit subject. **Lowest risk.**

### B. Perfect/aspect → EXPAND with the auxiliary
One member is a past participle used in a compound (perfect).
- deu `wanted (past part.)`→gewollt ⟹ **"have wanted"→gewollt** (seed: "we'**ve** often wanted", haben…gewollt). Distinguishes from simple-past `wanted`→wollte.
- spa `they had (past perfect)`→habían ⟹ **"they had [done]"→habían** as the perfect auxiliary, vs `they had`→tenían (possess).

### C. Bare case particle → **DECISION NEEDED** (is_new=false vs expand)
Targets differ only by a grammatical case ending/particle the English can't carry: kor object `을`/subject `이`/`가`, deu dative plural `-n`, ara nom/acc endings.
- kor `sir`→선생님 / `sir (object)`→선생님**을** / `sir (honorific)`→선생님**과**(=with).
- deu `children`→Kinder / `children (dative pl.)`→Kinder**n**.
- ara `long`→طَويلاً / `long (nominative)`→طَويلٌ.
**Two options — your call:**
  - **C1 is_new=false** (recommended for pure case markers 을/이/가/를, dative -n): the noun is taught **once**; the case ending attaches via the case/particle *construction* taught separately. No new vocab, so reuse — these aren't really "new LEGOs."
  - **C2 expand with the governor** where the particle has an English equivalent: kor `과`=with ⟹ **"with sir"→선생님과**. Works for prepositional particles, not for bare object/subject markers.
This is the **known-language-control** question (WORKLIST #1) — it decides ~half of deu/kor/ara.

### D. Gender agreement → EXPAND with the noun/subject (or treat as agreement)
Targets differ by gender concord with their referent.
- ara `ready (done)`→جاهِزَةٌ (fem, coffee) vs `ready`→مُسْتَعِدٌّ (masc, person) ⟹ also a **lexical** split (see F): جاهز="done/ready (thing)", مستعد="ready/prepared (person)".
- spa/fra `new (fem.)`→nueva/nouvelle: expand with the noun (`a new car`) so the gender is forced by context, per the mio-amico/mia-amica rule.

### E. Tense/mood with NO person cue → RENAME to the real sense, or flag Deborah
English "should / was / could" is genuinely ambiguous; no clean context fix.
- spa `they could (preterite)`→pudieron ⟹ **rename "they were able to / they managed to"** (completed) vs `they could`→podrían (hypothetical). *(ripples to the seed gloss — note it.)*
- spa `it was (ser)`→era (imperfect/description) vs `it was`→fue (completed) ⟹ **HARD** — ser imperfect/preterite is subtle; **flag for Deborah** rather than guess.
- deu `should`→soll (present) vs `should (3sg past)`→sollte ⟹ rename/flag.

### F. Lexical (genuinely different words, mislabeled) → RENAME known to distinguish
- ara `ready (done)`→جاهز vs `ready`→مستعد ⟹ "done"/"ready".
- (overlaps D where gender + word both differ.)

## "Non-ZUT removals worth expanding too" (your note)
The build team added a parenthetical because the form was *uncertain enough to need explaining*. So the **grammar-singletons** (label stripped in pass 1, no ZUT) are candidates for the same expansion treatment where the label carried real info:
- deu `bought (past part.)`→gekauft ⟹ consider **"have bought"→gekauft** so the perfect aspect is visible, not just "bought".
- kor `madam (subject)`→여사님이 (singleton) ⟹ same case-particle decision as C.
These aren't ZUTs (no collision) so they're lower priority, but expanding them makes the prompt teach *when* to use the form. Recommend doing them **after** the ZUT set, using the same A–F strategies.

## Decisions I need from you
1. **Case-particle policy (C):** is_new=false (reuse the noun, particle via construction) vs expand-with-governor? This is the biggest lever (covers a large share of deu/kor/ara).
2. **Tense/mood hard cases (E):** route the subtle ones (ser era/fue, soll/sollte) to **Deborah**, or do you want me to propose renames for your review?
3. **Scope:** ZUT set (176) only now, or also the grammar-singleton expansions in the same pass?

## How I'll produce the full per-conflict spec (on your go)
Per language, for every conflict: sub-pattern → proposed known+target for each member → tiling check (expansion reconstructs the seed) → vocab-introduced check → no-new-ZUT check. Latin courses (spa/fra/ita/por/deu) I can do directly; for kor/ara/zho I'll verify each target form against the seed so known and target stay matched. Output: a per-course table you approve before any DB write.

---

## REFINEMENT (2026-06-25, after Kai's review)

**Principles (corrected):**
- **Expand BOTH sides to the seed's actual person**, not a generic gloss. e.g. deu `wanted (past part.)`→gewollt, seed "we've often wanted" ⟹ known **"we have wanted"** → target **"wir haben … gewollt"** (the aux + participle, both sides). `wanted`→wollte, seed "I wanted" ⟹ **"I wanted"→"ich wollte"**; `wanted (past)`→wollten, seed "they wanted" ⟹ **"they wanted"→"sie wollten"**.
- **Gender via the agreeing noun, both sides** (my "a new car" example was wrong — `nueva`≠"a new car"). To split `new (fem.)`→nueva from a masc `new`, expand to a phrase whose noun forces the gender: known **"a new house"** → target **"una casa nueva"** (casa fem → nueva); masc stays with a masc noun. Never expand only the English.
- **Mislabeled words: read the seed AND the LEGO's practice phrases before renaming** — confirm the actual sense in use.

**The easy/tricky/hard split (this is the real shape):**

**EASY — person differs and the pronoun is adjacent/in the seed → expand to that person, both sides.** Do these first, low risk:
- deu `wanted` wollte/wollten/gewollt → "I wanted"/"they wanted"/"we have wanted"; `should (1pl)`→sollten → "we should"; `had to`→mussten (seed "we had to leave") → "we had to"; `will (2pl)`→werdet → "you'll all"; `thought` dachte/dachten/gedacht → "I thought"/"they thought"/"have thought"; `would have` hätten/hätte → "we would have"/"she would have".

**TRICKY — the disambiguator is FAR from the lego, or is a noun not a pronoun, or is a clause-governor → think closely (can't just bolt a pronoun on):**
- **Far governor (subjunctive/mood triggered elsewhere):** fra `it is`→c'est vs `it is (subj)`→ce soit — the subjunctive is forced by "I don't **think** it's…" upstream, not next to the lego. ara `they want`→يريدون vs `(subjunctive)`→يريدوا — same, particle/negation triggers it. Bolting context onto the lego won't tile; may need the *governing* LEGO to carry it, or accept these as construction-driven (introduce the trigger).
- **Noun subject / different nature:** spa `they had`→tenían (possess) vs `(past perfect)`→habían (perfect **auxiliary**, seed subject "the children had broken it"). Not a person fix — it's possess-verb vs perfect-aux. Rename to the sense: "they had [it]" vs "they **had broken**…" framing.

**HARD — same person, only tense/mood differs; English can't carry it cleanly → rename to the real sense, or route to Deborah:**
- spa `they could`→podrían (would-be-able) vs `(preterite)`→pudieron (managed to); `we could` podríamos/podíamos; `it was` era/fue (ser imperfect vs preterite — **Deborah**). deu `should` soll(present)/sollte(past-Konj); `could` konnte/könnte.

**FORM-BASED (kor especially) — nominalizer / connective / modifier / attributive, not person:** kor `to win` 이길(modifier)/이기게(causative); `to drink` 마시고(and)/마실(attributive); `waiting` 기다리는게/기다리는. These are the **case-particle/known-control** decision (C), not expansions.

**MISLABELED-LEXICAL — genuinely different word, gloss wrong → verify against phrases then rename:** deu `thought/found`→fand (that's *finden* = find/found, not denken); ara `you can` يمكنك (possible-for-you) vs تستطيع (be-able).

**Revised recommendation:** do EASY now (clean, high-confidence, both-sides person expansion). Bring TRICKY + HARD + LEXICAL to you/Deborah per-item. FORM-BASED rolls into the case-particle decision (C). I'll still produce the full per-conflict spec with tiling/vocab/no-new-ZUT checks before any write.

---

## REFINEMENT 2 — no ellipsis / split-target expansions (Kai, 2026-06-25)

**Hard rule:** an expansion is only valid if the target is a **contiguous chunk**. If carrying the distinction would require a discontinuous target (a gap/ellipsis), it is NOT a clean LEGO — **leave it out, look at it together.**

This pulls these OUT of "easy" into the joint-review pile:
- **German perfect** (aux … participle): `wanted (past part.)`→gewollt, `thought (past part.)`→gedacht, `bought (past part.)`→gekauft, etc. "have wanted" would map to `haben … gewollt` (split) — not allowed.
- **German separable verbs** and **verb-final subclauses** where adding the subject separates it from the finite verb.
- Anything else where the natural target is discontinuous.

**Truly-easy set (what remains, contiguous target only):**
- Person differs AND the target is a single contiguous chunk: e.g. deu simple-tense where subject+finite verb are adjacent (`they wanted`→sie wollten, `we should`→wir sollten, `we had to`→wir mussten); Romance person differences where the conjugated verb already encodes the person as one word (`I could`/`we could`). For pro-drop targets (spa/ita/por/ara) the person lives in the verb ending — expand the **known** with the pronoun; the one-word target already carries it (no redundant pronoun added).
- NOTE: Romance `they could` podrían/pudieron etc. are NOT person-easy — both are "they", differing by mood → that's the HARD tense/mood pile, not easy.

**Status: hold everything for the joint look** — Kai wants to review the split / tricky / hard sets together before any spec or write.
