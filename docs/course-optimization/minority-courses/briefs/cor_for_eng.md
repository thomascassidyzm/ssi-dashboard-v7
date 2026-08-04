# Cornish (`cor_for_eng`) — Opus handoff brief

**Status:** Seeds 1–10 locked. All ten survived independent re-verification with zero changes; every content chunk is grounded in a verbatim attestation (SSi's original Cornish vocab list for most; Wiktionary mutation tables; Bible/Sherlock/Exeter texts for the rest). Fable-tier was sufficient for accuracy and mutation-correctness. **The binding gate before audio is a fluent revived-Cornish speaker check** on 3–4 register/naturalness calls (`fatel wra`, `dell allav`, `mar venowgh dell yllir`, `a er`) — no LLM tier can close those. Biggest ongoing risk for Opus: orthography drift between sources (Cornish is a *revived* language with competing spelling standards) and the two homographic `mar`s with opposite mutations.

---

## Orthography

**Standard: SWF (Standard Written Form / Furv Skrifys Savonek), Middle-Cornish-leaning main forms.** This is what kw.wikipedia and the Akademi Kernewek dictionary (cornishdictionary.org.uk) use, and it matches the original SSi Cornish course vocab. It is the official standard of the Cornish Language Partnership since 2008.

**Hard rules:**
- Verify every new spelling against the **Akademi Kernewek dictionary (cornishdictionary.org.uk)** first, Wiktionary (which labels SWF) second, kw.wikipedia third. If a source doesn't say which orthography it uses, assume it may be Kernewek Kemmyn or Late Cornish and do not copy it.
- **Rejects — never use:** Kernewek Kemmyn spellings (e.g. *hwath* vs SWF conventions differ per word — check each), Unified Cornish, Late Cornish / Modern Cornish colloquial spellings (*kowsel/cows* for this course's 'speak' slot), and any Welsh-analogy spelling (*arall* — SWF is **aral**, pl **erel**).
- Fixed exemplars already locked: `kewsel` (speak), `dyski` (learn), `aral` (other), `esov` (long-form bos 1sg), `Kernewek` (capital K), `neppyth` (something), `hedhyw` (today), `nebonan` (someone).
- Attestation beats generation: prefer a form seen verbatim in the SSi Cornish vocab list, An Bibel Kernewek, or the Akademi dictionary over anything you would produce from Welsh/Breton analogy. If you can't attest it, mark it low-confidence.

---

## Core grammar the builder needs

**Word order — the one unbreakable rule:** a Cornish main clause **never starts with a finite verb**. Default declarative shape is *fronted subject + particle `a` + soft-mutated verb*:

| Pattern | Example | Meaning |
|---|---|---|
| SUBJ + a + V(soft) 3sg | `my a vynn` | I want |
| SUBJ + a + gul(soft) 3sg + VN | `my a wra praktisya` | I'm going to practise |
| SUBJ + a + V(soft) pres-fut | `my a gews` | I speak (habitual) |

Note: after fronted `my a`, the verb is **3sg** form (mynn, wra, gews), not 1sg. The 1sg inflected forms (`vynnav`, `allav`, `kallav`) appear only in embedded/relative/conjunction contexts (`an pyth a vynnav`, `dell allav`, `mar kallav`).

**Progressive (long-form bos):** `yth esov vy ow/owth + VN` = "I am X-ing". `owth` before vowel- or h-initial VN (`owth assaya`), `ow` elsewhere. Long form (`esov`) is for progressive/locational only.

**Predicate with adjective/identity (short-form bos):** `ov` — negative `ny + ov`, but `nyns` before a vowel: `nyns ov vy sur` = "I'm not sure". Never use `esov` with an adjective predicate; never use `ov` with `ow + VN`.

**The four mutation systems** (only soft and hard appear in seeds 1–10; mixed appears in gotcha 9):

| Mutation | Triggered by (in this course so far) | Effects to know |
|---|---|---|
| **Soft (2nd)** | particle `a`; adverb `mar` 'as/so'; `dell` 'as/than'; prep `a` 'of' | k→g, p→b, t→d, g→**∅ (deletes!)**, b→v, m→v, d→dh: mynn→vynn, gwra→wra, kews→gews, kales→gales, menowgh→venowgh, **ger→er, gallav→allav, gyllir→yllir** |
| **Hard (4th)** | conjunction `mar` 'if/whether' | g→k, b→p, d→t: gallav→**kallav** (cf. attested `mar pleg`) |
| **Mixed (5th)** | `yn` adverbializer | m→f: menowgh→**fenowgh** (`yn fenowgh` = often) |
| **Breathed (3rd)** | not yet used in seeds 1–10 | k→h, p→f, t→th — check Akademi table when a trigger (e.g. `ow`, `hy` 'her') first appears |

**Other structural facts:**
- **No indefinite article.** "a word" = bare noun. Definite article `an`; contracts after prep `a` → `a'n`.
- **Adjective follows noun:** `nebonan aral`, `lavar dien`.
- Verbal nouns chain bare (no 'to'): `mynn kewsel`, `wra assaya displegya`, `assaya dyski` (bare-VN after assaya matches SSi course usage; native question 4 pending).
- Headless "how to X" = `fatel wra + VN` (course idiom, mirrors SSi's attested `fatel wra y wul`).
- Headless relative "what (= the thing that)" = `an pyth a + V`: `an pyth a vynnav leverel`.
- Indirect question "if/whether" = `mar` + **hard**: `mar kallav`.
- Equative "as X as Y-can" = `mar` + ADJ/ADV(**soft**) + `dell` + V(**soft**): `mar gales dell allav`, `mar venowgh dell yllir` (impersonal `yllir` = "one can").

---

## LOCKED DECISIONS (contracts Opus must NOT break)

ZUT contracts — one known prompt → exactly one target form, course-wide:

- [ ] **"I want (to)"** → `my a vynn` — never `my a garsa` (reserve *a garsa* for a future "I would like" if introduced; do not conflate)
- [ ] **"I'm going to"** → `my a wra` — never `my a vynn` (want ≠ going-to; ZUT separation is deliberate)
- [ ] **"I'm trying (to)"** → `yth esov vy owth assaya` (+ bare VN)
- [ ] **"to try"** (after another verb) → `assaya`
- [ ] **"to speak"** → `kewsel` — never `cows/kowsel`
- [ ] **"I speak" (habitual)** → `my a gews`
- [ ] **"to say"** → `leverel`
- [ ] **"to learn"** → `dyski`
- [ ] **"to practise"** → `praktisya`
- [ ] **"to remember"** → `perthi kov (a)` — `kovhe` is the fallback ONLY if the native check rejects `a er` in seed 6; do not mix both
- [ ] **"to explain"** → `displegya` (`styrya` deliberately left free/unused)
- [ ] **"how to X"** → `fatel wra + VN` (seeds 3/4 pattern; pending native sign-off but ZUT-locked meanwhile)
- [ ] **"what I …" (headless rel.)** → `an pyth a + 1sg verb` (pronoun-less variant is the course form; `…a vynnav vy…` is valid fuller shape, pick ONE after native answer to Q6 and stick to it)
- [ ] **"if/whether"** (indirect Q) → `mar` + HARD mutation
- [ ] **"as ADJ/ADV as …"** → `mar` + soft + `dell` + soft
- [ ] **Register/"you" default:** singular informal — "with you" → `genes`. Plural/formal `genowgh` is a separate LEGO, introduce only when the English prompt disambiguates (e.g. "with you all").
- [ ] **Fixed vocabulary:** now → `lemmyn` · a little → `nebes` (not *boghes*) · word → `ger` · sentence → `lavar` · something → `neppyth` · someone else → `nebonan aral` · today → `hedhyw` · sure → `sur` · whole → `dien` (postposed) · in Cornish → `yn Kernewek` · Cornish (obj.) → `Kernewek`
- [ ] **Orthography:** SWF main forms only (see Orthography section)
- [ ] **`can`** → `galloes`: fronted `my a yll`; embedded 1sg `allav` (after dell, soft) / `kallav` (after mar 'if', hard); impersonal `yllir` (after dell, soft, from `gyllir`)

---

## The 10 reference seeds

| n | English | Target | Gloss | Conf. |
|---|---|---|---|---|
| 1 | I want to speak Cornish with you now | my a vynn kewsel Kernewek genes lemmyn | I PRT want(3sg.soft) speak(VN) Cornish with-you(sg) now | high |
| 2 | I'm trying to learn | yth esov vy owth assaya dyski | PRT am(1sg.long) I PROG try(VN) learn(VN) | high |
| 3 | how to speak as often as possible | fatel wra kewsel mar venowgh dell yllir | how do(3sg) speak(VN) as often(soft) as can(IMPERS.soft) | med-high |
| 4 | how to say something in Cornish | fatel wra leverel neppyth yn Kernewek | how do(3sg) say(VN) something in Cornish | high |
| 5 | I'm going to practise speaking with someone else | my a wra praktisya kewsel gans nebonan aral | I PRT do(3sg.soft) practise(VN) speak(VN) with someone other | med-high |
| 6 | I'm trying to remember a word | yth esov vy owth assaya perthi kov a er | PRT am(1sg) I PROG try(VN) bear(VN) memory of word(soft) | medium |
| 7 | I want to try as hard as I can today | my a vynn assaya mar gales dell allav hedhyw | I PRT want(3sg) try(VN) as hard(soft) as can(1sg.soft) today | medium |
| 8 | I'm going to try to explain what I mean | my a wra assaya displegya an pyth a vynnav leverel | I PRT do(3sg) try(VN) explain(VN) the-thing REL want(1sg) say(VN) | med-high |
| 9 | I speak a little Cornish now | my a gews nebes Kernewek lemmyn | I PRT speak(3sg.soft) a-little Cornish now | high |
| 10 | I'm not sure if I can remember the whole sentence | nyns ov vy sur mar kallav perthi kov a'n lavar dien | NEG am(1sg) I sure if can(1sg.hard) bear(VN) memory of-the sentence whole | high |

Rule-carrying notes: **3 vs 7** — impersonal `dell yllir` ("as possible") vs personal `dell allav` ("as I can") are distinct, never merge. **6** — soft mutation deletes g: `a er` from `a + ger`, regular but near-invisible. **9** — present-future `a gews` for habitual, contrast with progressive `yth esov` in 2/6. **10** — `nyns` (not `ny`) before vowel-initial `ov`; short-form bos with adjective `sur`; `mar` + HARD `kallav`. **8** — "what I mean" translation-chosen as "what I want to say" (sound SSi choice; keep it).

---

## Worked decompositions

Copy these patterns exactly. A sealed chunk = the particle/mutation inside it breaks if split; never present its pieces separately.

**Seed 1** — `my a vynn kewsel Kernewek genes lemmyn`

| # | Known | Target | Notes |
|---|---|---|---|
| 1 | I want | `my a vynn` | **SEALED**: subject + particle `a` + soft-mutated `vynn` (< mynn). Splitting exposes `a` and a mutated form that mean nothing alone. |
| 2 | to speak | `kewsel` | bare VN; no 'to' word on target side |
| 3 | Cornish | `Kernewek` | |
| 4 | with you | `genes` | inflected preposition — one word, one LEGO; never split into 'with' + 'you' |
| 5 | now | `lemmyn` | |

**Seed 2** — `yth esov vy owth assaya dyski`

| # | Known | Target | Notes |
|---|---|---|---|
| 1 | I'm trying | `yth esov vy owth assaya` | **SEALED**: `yth` (pre-vocalic particle) + long-form `esov` + `vy` + `owth` (pre-vocalic allomorph of `ow`) + `assaya`. Both allomorphies live inside this chunk; splitting would strand `yth`/`owth`. |
| 2 | to learn | `dyski` | bare VN after assaya (contract; native Q4 pending) |

**Seed 10** — `nyns ov vy sur mar kallav perthi kov a'n lavar dien`

| # | Known | Target | Notes |
|---|---|---|---|
| 1 | I'm not sure | `nyns ov vy sur` | **SEALED**: `nyns` allomorph exists only before vowel-initial `ov`; short-form bos + adjective is one grammatical fact |
| 2 | if I can | `mar kallav` | **SEALED**: conjunction `mar` + HARD-mutated `kallav` (< gallav). This is a DIFFERENT LEGO from equative `mar` + soft (seed 7 `mar gales`) — never unify them. |
| 3 | remember | `perthi kov a` | idiom "bear memory of"; the `a` (of) belongs to the chunk |
| 4 | the sentence | `'n lavar` | **SEAM WARNING**: `a + an → a'n` — the contraction happens at the join with chunk 3. In decomposition present "remember" = `perthi kov a` and "the sentence" = `an lavar`, with the assembled surface `a'n lavar`; the audio/string must use the contracted form. |
| 5 | whole | `dien` | adjective follows noun |

---

## Gotchas

1. **Two homographic `mar`s, OPPOSITE mutations.** Adverb 'as/so' + SOFT: `mar venowgh`, `mar gales`, `mar dha`. Conjunction 'if/whether' + HARD: `mar kallav`, `mar pleg`. Separate LEGOs, separate audio, always.
2. **SWF only.** `aral` not *arall*; `kewsel` not *cows/kowsel*; `dyski`. Check cornishdictionary.org.uk. Orthography drift between sources is the #1 silent error in a revived language.
3. **Soft mutation DELETES g.** ger→`er`, gallav→`allav`, gyllir→`yllir`. Mutated forms become vowel-initial and look like different lemmas — decomposition, TTS text and string-matching must expect this.
4. **Never verb-initial main clauses.** Correct: `my a vynn …`. The verb-initial calque from the gloss is the classic plausible-wrong output.
5. **ow/owth allomorphy.** `owth` before vowel/h (`owth assaya`), `ow` elsewhere (`ow studhya`). The progressive chunk must carry the right allomorph per following VN.
6. **Long vs short bos.** Progressive/locational = long (`yth esov vy ow…`); adjective/identity predicate = short (`nyns ov vy sur`). Mixing looks fine to a non-speaker and is ungrammatical.
7. **`fatel wra + VN`** is the course idiom for headless "how to" (attested `fatel wra y wul` in SSi's own vocab). ZUT-consistent across seeds 3/4, but it is course dialect as much as textbook grammar — native sign-off required before treating as canon.
8. **Articles.** No indefinite article (a word = `ger`, mutated `er`); `a + an → a'n`. English 'a/the' in prompts must not spawn spurious target words.
9. **Three surface forms of `menowgh`.** Equative `mar venowgh` (soft); standalone adverbial 'often' = `yn fenowgh` (yn + MIXED, m→f) — NOT *venowgh*. Watch when 'often' appears alone in later seeds.
10. **Attestation beats intuition.** Prefer verbatim forms from the SSi Cornish vocab, An Bibel Kernewek, or the Akademi dictionary over anything derived from Welsh/Breton analogy.

---

## Native-check questions

Must be resolved by a fluent revived-Cornish speaker **before audio**:

1. Seeds 3/4: is `fatel wra kewsel / fatel wra leverel` natural for headless "how to speak / how to say" (mirroring SSi's `fatel wra y wul`), or would you phrase it differently (e.g. `fatel dhe gewsel`)?
2. Seed 7: after equative `dell`, is indicative `dell allav` normal in today's revived Cornish, or is the subjunctive expected (historical texts show `mar scon del thyffyf`)?
3. Seed 3: is `mar venowgh dell yllir` how you'd actually say "as often as possible", or is another idiom usual (`mar venowgh dell yw possybyl`, `kemmys dell yllir`)?
4. Seeds 2/6: does `assaya` take a bare VN (`owth assaya dyski`) or do you prefer `assaya dhe + VN`?
5. Seed 6: is `perthi kov a er` (soft-mutated ger) acceptable in speech, or does near-invisible `a er` need recasting (`kovhe ger`, or unmutated by analogy)?
6. Seed 8: `an pyth a vynnav leverel` vs fuller `an pyth a vynnav vy leverel` — which is more natural? And `displegya` vs `styrya` for "explain" here?
7. Seed 10: confirm `nyns ov vy sur mar kallav…` — word order, short-form `ov` with `sur`, and `mar` (rather than `a`) as the everyday indirect-question "if".
8. General: seeds pin to SWF main forms — lean SWF/Middle throughout (`kewsel`, `esov`), or nudge any items toward Late/colloquial variants for spoken naturalness?
9. (New, for Opus to carry forward) When negated fronted-subject sentences appear ("I don't want…"), confirm the everyday shape (`ny vynnav (vy)…` vs other orderings) before locking a "I don't want" LEGO — negation forces verb-first with `ny/nyns` and 1sg inflection, a different shape from the affirmative contract.
10. (New) `genes` vs `genes jy` and `vy`-dropping generally: how much subject/echo-pronoun does natural speech carry? Pick one policy for audio consistency.

---

## Instructions to Opus for continuing (seeds 11+)

**Workflow per new seed:**
1. Apply translation-choice BEFORE decomposition (per `synonym-choice-architecture.md`): if the English contains a locked known-side phrase ("I want to", "I'm trying to", "how to", "if I can", "as X as…"), the target chunk is already decided by the contracts checklist — reuse it verbatim, mutations included. Do not re-derive.
2. For any NEW content word: look it up in the Akademi Kernewek dictionary (cornishdictionary.org.uk) for the SWF form, cross-check Wiktionary for the mutation class (soft/breathed/hard/mixed columns). Record the mutation row in your notes — you will need it the first time the word follows `a`, `mar`, `dell`, `yn`, or the article.
3. Build the clause with a fronted constituent + `a` + soft verb (or the progressive/`fatel wra` frames). If you catch yourself writing a finite verb first in a main clause, stop — that's gotcha 4.
4. Check every mutation seam explicitly: particle `a` (soft), prep `a` 'of' (soft, g-deletion), `mar`-as (soft), `mar`-if (HARD), `dell` (soft), `yn` adverbializer (MIXED), `a + an → a'n`. Write the gloss with the mutation annotated, as in the reference seeds.
5. Confidence discipline: `high` only when every chunk is attested verbatim somewhere citable; `medium` when a form is dictionary-derived but the construction is unattested; anything where you combined two rules yourself and found no attested parallel → `medium` at best, plus a note naming the specific doubt.

**Where Cornish is thin — flag, don't invent:**
- Any tense/mood beyond what's established (present-future `a gews`, progressive `yth esov`, periphrastic future `a wra`, `mar kallav`). Preterite, imperfect, conditional (`a garsa` territory), subjunctive, imperatives: derive from the Akademi conjugation tables only, mark medium, and add a native-check question. Never conjugate by Welsh/Breton analogy.
- Negation, questions (interrogative particle `a`), object pronouns/infixed pronouns, possessives with their mutations (e.g. `ow` 'my' + breathed): each is a new mutation-bearing system — first occurrence of each gets a native-check question, not a silent guess.
- Idioms and phrasal verbs: if you can't find the expression attested (SSi vocab, Bibel Kernewek, Akademi examples), recast the English into something you CAN attest (the seed-8 "what I mean" → "what I want to say" move) and note the translation choice.
- If two sources disagree on a spelling, the Akademi dictionary wins; note the variant you rejected.

**Never do:** merge the two `mar`s; swap `my a vynn`/`my a wra`; introduce `styrya`, `kovhe`, `boghes`, `genowgh`, or `a garsa` without a new, distinct known-side prompt (ZUT); start a main clause with a finite verb; trust a spelling you didn't check against SWF; generate audio or treat the pending native-check items as settled.

**On compaction/resume:** recover the true frontier via `/course-resume` or `GET /api/resume/cor_for_eng`; re-read this brief in full before authoring the next seed.