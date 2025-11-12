# Phase 3 Pattern Library
## Cross-Language LEGO Decomposition Patterns

**Generated:** 2025-10-15
**Languages Analyzed:** Italian, Spanish, French, Mandarin
**Seeds Analyzed:** 30 per language (120 total)
**Patterns Documented:** 18

---

## 1. Modal + Infinitive Pattern

**When to Apply:** Sentences with modal verbs (want, can, should, would like) + infinitive verb

**FD Issue if NOT chunked:** Bare modal verb may require subject pronoun for FD
**Solution:** Include subject pronoun with modal as one LEGO

**Examples:**

**Italian:**
- `Voglio` / `I want` (S0001L01)
- `Vorrei` / `I'd like` (S0011L01)
- Chunks modal verb WITH first-person marker

**Spanish:**
- `Quiero` / `I want` (S0001L01)
- `Me gustaría` / `I'd like` (S0011L01)
- First-person conjugation makes it FD

**French:**
- `Je veux` / `I want` (S0001L01)
- `J'aimerais` / `I'd like` (S0011L01)
- MUST include subject pronoun `Je` for FD

**Mandarin:**
- `我想` / `I want` (S0001L01)
- `我要` / `I'm going to` (S0005L01)
- MUST include subject `我` (I) for FD

**Cross-Language Consistency:** ✓ All four languages follow this pattern

**Key Principle:** Romance languages with null-subject (Italian/Spanish) CAN drop pronouns, but chunking WITH conjugated verb ensures FD. French and Mandarin REQUIRE explicit subjects.

---

## 2. Progressive Aspect (I'm -ing)

**When to Apply:** Progressive/continuous aspect constructions

**FD Issue if NOT chunked:** Bare gerund fails FD ("speaking" could be multiple forms)
**Solution:** CHUNK UP to include auxiliary + progressive marker + verb

**Examples:**

**Italian:**
- `Sto cercando di imparare` / `I'm trying to learn` (S0002L01)
- `Sto cercando di ricordare` / `I'm trying to remember` (S0006L01)
- Formula: `Sto` (I am) + `cercando` (trying) + `di` (to) + infinitive

**Spanish:**
- `Estoy tratando de aprender` / `I'm trying to learn` (S0002L01)
- `Estoy tratando de recordar` / `I'm trying to remember` (S0006L01)
- Formula: `Estoy` (I am) + `tratando` (trying) + `de` (to) + infinitive

**French:**
- `J'essaie d'apprendre` / `I'm trying to learn` (S0002L01)
- `J'essaie de me souvenir` / `I'm trying to remember` (S0006L01)
- Formula: `J'essaie` (I try/am trying) + `de` (to) + infinitive
- Note: French uses simple present for progressive

**Mandarin:**
- `我在试着学` / `I'm trying to learn` (S0002L01)
- `我在试着想起` / `I'm trying to remember` (S0006L01)
- Formula: `我在` (I am) + `试着` (trying) + verb

**Why This Works:** Entire progressive construction is FD as a unit, whereas components alone would be ambiguous.

---

## 3. Future Construction (Going to / Will)

**When to Apply:** Future tense or "going to" constructions

**FD Issue if NOT chunked:** "going" alone fails FD (progressive vs. future)
**Solution:** Include future marker with auxiliary as single LEGO

**Examples:**

**Italian:**
- `Sto per` / `I'm going to` (S0005L01, S0008L01, S0023L01)
- Fixed expression meaning imminent future

**Spanish:**
- `Voy a` / `I'm going to` (S0005L01, S0008L01, S0023L01)
- Periphrastic future: `ir` (to go) + `a` + infinitive

**French:**
- `Je vais` / `I'm going to` (S0005L01, S0008L01, S0023L01)
- Periphrastic future: `aller` (to go) + infinitive

**Mandarin:**
- `我要` / `I'm going to` (S0005L01)
- `快要` / `about to` (S0023L01)
- Uses modal auxiliaries for future

**Glue Word Note:** Italian `Sto per` and Spanish `Voy a` END with glue words (`per`, `a`), but this is acceptable because they're fixed idiomatic future markers, not compositional phrases.

---

## 4. Prepositional Phrase Composition

**When to Apply:** Preposition + noun phrase

**FD Issue if separated:** Standalone preposition violates IRON RULE
**Solution:** Always keep preposition WITH its object as composite LEGO

**Examples:**

**Italian:**
- `con te` / `with you` (S0001L04)
- `con qualcun altro` / `with someone else` (S0005L07)
- NEVER: `con` / `with` as standalone LEGO

**Spanish:**
- `contigo` / `with you` (S0001L04) - fused form
- `con otra persona` / `with someone else` (S0005L05)
- NEVER: `con` / `with` as standalone LEGO

**French:**
- `avec toi` / `with you` (S0001L04)
- `avec quelqu'un d'autre` / `with someone else` (S0005L05)
- NEVER: `avec` / `with` as standalone LEGO

**Mandarin:**
- `跟你` / `with you` (S0001L02)
- `跟别人` / `with someone else` (S0005L02)
- Preposition `跟` always paired with object

**IRON RULE:** Standalone prepositions (`di`, `a`, `con`, `avec`, `de`, `en`) are FORBIDDEN.

---

## 5. Hierarchical Build-Up (Composite LEGOs)

**When to Apply:** Complex phrases that build from simpler components

**Purpose:** Show learners HOW composites are constructed
**Structure:** Include both BASE components AND composite that combines them

**Example from Italian S0005:**
- L04: `qualcuno` / `someone` (BASE)
- L05: `altro` / `else` (BASE)
- L06: `qualcun altro` / `someone else` (COMPOSITE of L04 + L05)
- L07: `con qualcun altro` / `with someone else` (COMPOSITE of preposition + L06)

**Tiling Consideration:** Only BASE LEGOs tile the original sentence. Composite LEGOs are pedagogical FEEDERS showing build-up.

**Cross-Language Variance:**
- Italian: Often includes full hierarchical build-up
- Spanish/French: Sometimes use simpler flat structures
- Mandarin: Minimal hierarchical LEGOs (cleaner structure)

---

## 6. Superlative/Comparative Patterns

**When to Apply:** "as...as possible", "as much as", etc.

**FD Issue if decomposed:** Components fail FD individually
**Solution:** Keep entire expression as single LEGO

**Examples:**

**Italian:**
- `il più spesso possibile` / `as often as possible` (S0003L05)
- `il più possibile` / `as hard as I can` (S0007L03)

**Spanish:**
- `lo más a menudo posible` / `as often as possible` (S0003L05)
- `lo más posible` / `as hard as I can` (S0007L03)

**French:**
- `le plus souvent possible` / `as often as possible` (S0003L05)
- `le plus possible` / `as hard as I can` (S0007L03)

**Mandarin:**
- `尽量` / `as much as possible` (S0003L02, S0007L03)
- More concise than Romance languages

**Pattern:** Romance languages use article + `plus/más` + adverb/adjective + `possible/posible`

---

## 7. Negation Patterns

**When to Apply:** Negative constructions

**FD Requirement:** Include negation with verb for context

**Examples:**

**Italian:**
- `non voglio` / `I don't want` (S0019L01)
- `Non sono sicuro` / `I'm not sure` (S0010L01)
- `Non vorrei` / `I wouldn't like` (S0012L01)

**Spanish:**
- `no quiero` / `I don't want` (S0019L01)
- `No estoy seguro` / `I'm not sure` (S0010L01)
- `No me gustaría` / `I wouldn't like` (S0012L01)

**French:**
- `je ne veux pas` / `I don't want` (S0019L01)
- `Je ne suis pas sûr` / `I'm not sure` (S0010L01)
- `Je n'aimerais pas` / `I wouldn't like` (S0012L01)
- Note: French uses two-part negation `ne...pas`

**Mandarin:**
- `我不想` / `I don't want` (S0012L01, S0019L01)
- `不确定` / `not sure` (S0010F02)
- Simple prefix negation with `不`

---

## 8. Question Words + Subject

**When to Apply:** Questions with interrogatives

**Examples:**

**Italian:**
- `Perché` / `Why` (S0021L01, S0022L01)
- Standalone question word acceptable

**Spanish:**
- `Por qué` / `Why` (S0021L01)
- Two-word construction

**French:**
- `Pourquoi` / `Why` (S0021L01)
- Single-word interrogative

**Mandarin:**
- `你为什么` / `Why are you` (S0021L01)
- Includes subject `你` (you) with interrogative

**Pattern Variance:** Acceptable to have question word as standalone LEGO in Romance languages, but Mandarin tends to chunk with subject.

---

## 9. Reflexive Verb Constructions

**When to Apply:** Verbs with reflexive pronouns

**Examples:**

**French:**
- `me souvenir` / `to remember` (S0006F02, S0010F06)
- `me sentir` / `feeling` (S0026L02)
- Reflexive pronoun integral to verb meaning

**Spanish:**
- `sentir` / `feeling` (S0026L02)
- Some verbs can be reflexive or non-reflexive

**Italian:**
- `sentirmi` / `feeling` (S0026L02)
- Reflexive pronoun attached as suffix in infinitive

**Key Principle:** Reflexive pronoun should be included with verb when meaning changes (e.g., "souvenir" without "se" doesn't mean "remember" in French).

---

## 10. Verb + Preposition + Infinitive

**When to Apply:** Common construction where verb requires specific preposition before infinitive

**FD Requirement:** Include preposition with verb phrase

**Examples:**

**Italian:**
- `praticare a parlare` / `to practice speaking` (S0005L02)
- `cercare di spiegare` / `to try to explain` (S0008L02)
- `cominciare a parlare` / `to start talking` (S0023L02, S0028L02)

**Spanish:**
- `practicar a hablar` / `to practice speaking` (S0005L02)
- `tratar de explicar` / `to try to explain` (S0008L02)
- `empezar a hablar` / `to start talking` (S0023L02, S0028L02)

**French:**
- `m'entraîner à parler` / `to practice speaking` (S0005L02)
- `essayer d'expliquer` / `to try to explain` (S0008L02)
- `commencer à parler` / `to start talking` (S0023L02, S0028L02)

**Glue Word Containment:** The preposition (`a`/`à`, `di`/`de`) is INSIDE the verb phrase composite, not at edge.

---

## 11. Conditional/Subjunctive Clauses

**When to Apply:** "After you finish", "before I have to go", etc.

**FD Requirement:** Include entire subordinate clause

**Examples:**

**Italian:**
- `dopo che finisci` / `after you finish` (S0011L04)
- `prima che io debba andare` / `before I have to go` (S0025L02)

**Spanish:**
- `después de que termines` / `after you finish` (S0011L04)
- `antes de que tenga que irme` / `before I have to go` (S0025L02)

**French:**
- `après que tu aies fini` / `after you finish` (S0011L04)
- `avant que je doive partir` / `before I have to go` (S0025L02)

**Mandarin:**
- `在你说完之后` / `after you finish` (S0011L03)
- `在我得走之前` / `before I have to go` (S0025L02)

**Why CHUNK UP:** Temporal clauses require specific moods/tenses that only make sense as complete unit.

---

## 12. "What I mean" / "What's going to happen" Constructions

**When to Apply:** Embedded questions or relative clauses

**FD Requirement:** Keep entire clause together

**Examples:**

**Italian:**
- `quello che intendo` / `what I mean` (S0008L03)
- `cosa succederà` / `what's going to happen` (S0012L03)

**Spanish:**
- `lo que quiero decir` / `what I mean` (S0008L03)
- `qué va a pasar` / `what's going to happen` (S0012L03)

**French:**
- `ce que je veux dire` / `what I mean` (S0008L03)
- `ce qui va se passer` / `what's going to happen` (S0012L03)

**Mandarin:**
- `我的意思` / `what I mean` (S0008L03)
- `明天会发生什么` / `what's going to happen tomorrow` (S0012L03)

**Pattern:** These are idiomatic constructions that must remain intact for FD.

---

## 13. Time Expressions

**When to Apply:** Temporal adverbs and phrases

**Generally:** Can be standalone LEGOs (FD-compliant)

**Examples:**

**All Languages:**
- `now` / `maintenant` / `ahora` / `adesso` / `现在`
- `today` / `aujourd'hui` / `hoy` / `oggi` / `今天`
- `tomorrow` / `demain` / `mañana` / `domani` / `明天`
- `yesterday` / `hier` / `ayer` / `ieri` / `昨天`

**Acceptable as Standalone:** Time words are semantically complete and FD-compliant.

---

## 14. Degree Adverbs

**When to Apply:** "very", "too much", "easily", etc.

**Examples:**

**Italian:**
- `molto bene` / `very well` (S0013L03)
- `troppo tempo` / `too much time` (S0027L03)
- `facilmente` / `easily` (S0024L02)

**Spanish:**
- `muy bien` / `very well` (S0013L03)
- `demasiado tiempo` / `too much time` (S0027L03)
- `fácilmente` / `easily` (S0024L02)

**French:**
- `très bien` / `very well` (S0013L03)
- `trop de temps` / `too much time` (S0027L03)
- `facilement` / `easily` (S0024L02)

**Pattern:** Adverb + adjective pairs are kept together when they form set expressions.

---

## 15. "As soon as" Temporal Constructions

**When to Apply:** "as soon as you can", "as soon as possible"

**Examples:**

**Italian:**
- `appena` / `as soon as` (S0028L03, S0029L03)
- Single-word adverb

**Spanish:**
- `en cuanto` / `as soon as` (S0028L03, S0029L03)
- Two-word construction

**French:**
- `dès que` / `as soon as` (S0028L03, S0029L04)
- Two-word construction

**Mandarin:**
- `一有机会就` / `as soon as you can` (S0028L03, S0029L03)
- Complex idiomatic construction

**FD Principle:** Spanish and French keep `en cuanto` / `dès que` as units. Mandarin's version is more complex and requires entire phrase.

---

## 16. Verb + Complement Patterns

**When to Apply:** Verbs that take specific complements

**Examples:**

**All Languages:**
- "I speak" + language: Language is separate LEGO
  - S0009: `Je parle` / `Hablo` / `Parlo` + `français` / `español` / `italiano`

- "to say" + something:
  - S0004: `dire` / `decir` / `dire` / `说` + `qualcosa` / `algo` / `quelque chose` / `什么`

**Pattern:** Verb and direct object can be separate when object is substitutable.

---

## 17. Idiomatic Expressions (Fixed)

**When to Apply:** Expressions that must be learned as units

**Examples:**

**All Languages:**
- Looking forward to: Idiomatic, must be chunked
  - Italian: `Non vedo l'ora di parlare` / `I'm looking forward to speaking` (S0029L01)
  - Spanish: `Estoy deseando hablar` / `I'm looking forward to speaking` (S0029L01)
  - French: `J'ai hâte de parler` / `I'm looking forward to speaking` (S0029L01)
  - Mandarin: `我期待` / `I'm looking forward to` (S0029L01)

**Pattern:** These don't translate literally - they're culturally specific idioms.

---

## 18. Gender-Neutral Third Person

**When to Apply:** Third-person conjugations without explicit subject

**Critical for FD:** Must use gender-neutral English translation

**Examples:**

**Italian:**
- `Vuole` / `Wants` (S0016L01, S0017L01)
- NOT "He wants" or "She wants"

**Spanish:**
- `Quiere` / `Wants` (S0016L01, S0017L01)
- NOT "He wants" or "She wants"

**French:**
- `Veut` / `Wants` (S0016L01, S0017L01)
- NOT "He wants" or "She wants"

**FD_LOOP Test:**
- ✓ "Wants" → `Vuole` → "Wants" (IDENTICAL)
- ✗ "He wants" → `Vuole` → "Wants" (FAIL - gender lost)

**CRITICAL PRINCIPLE:** Romance third-person conjugations are gender-neutral. English translation MUST be gender-neutral or FD_LOOP fails.

---

## Pattern Application Summary

### By Language Family

**Romance Languages (Italian, Spanish, French):**
- Modal + infinitive: Subject pronoun required for French; optional for Italian/Spanish
- Progressive aspect: Use periphrastic constructions
- Future: All use "going to" periphrastic future
- Prepositions: MUST be with objects (IRON RULE)
- High structural consistency across the three languages

**Sino-Tibetan (Mandarin):**
- Subject pronouns always required for FD
- Aspect markers integral to verb phrases
- More compact expressions than Romance languages
- Different topicalization patterns
- Minimal hierarchical build-up in LEGO structure

### Critical Success Factors

1. **FD_LOOP First:** If it fails target → known → target, CHUNK UP
2. **IRON RULE Absolute:** No standalone prepositions/articles/conjunctions
3. **Glue Words Contained:** Inside composites, never at meaningful edges
4. **Gender Neutral:** Third-person must translate without gender specificity
5. **Cross-Language Consistency:** Similar structures should decompose similarly in Romance languages

---

## Recommendations for Future Seeds

1. **Test FD_LOOP early:** Before finalizing LEGO breakdown, verify every LEGO passes the loop test
2. **Check Romance parallels:** If Italian, Spanish, French diverge significantly, investigate why
3. **Document CHUNK UP decisions:** When chunking up, note why in componentization
4. **Hierarchy vs. Tiling:** Clearly mark which LEGOs tile (BASE) vs. show pedagogy (COMPOSITE)
5. **Mandarin independence:** Don't force Mandarin to match Romance patterns - respect language-specific structures

