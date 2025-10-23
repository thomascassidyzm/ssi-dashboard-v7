# Phase 3 Extraction Reasoning - Seeds S0001-S0010

**Extractor**: Sonnet 4.5
**Validation**: 100% FD pass rate (13 feeders, 0 violations)
**Strategy**: Apply composability rules + FD requirements explicitly

---

## S0001: "Voglio parlare italiano con te adesso."

**Applied Rules**:
- R2 (Modal+Infinitive Split): "Voglio" | "parlare"
- R3 (Preposition+Object Split): "con" | "te"
- R10 (Temporal Adverb Float): "adesso"
- R1 (High Composability Expose): All chunks score ≥8

**Extraction**:
1. "Voglio" (BASE) - Modal verb, combines with many infinitives
2. "parlare" (BASE) - Infinitive, combines with many modals/contexts
3. "italiano" (BASE) - Language name, natural object
4. "con" (BASE) - Preposition, rich edges (can combine with many pronouns/nouns)
5. "te" (BASE) - Pronoun, follows prepositions
6. "adesso" (BASE) - Temporal adverb, attaches to many sentence types

**FD Check**: All pass ✓
**Composability Benefit**: 6 pieces → maximum recombinatory power
- "Voglio parlare" / "Voglio imparare" / "Voglio provare"
- "parlare italiano" / "dire italiano"
- "con te" / "con me" / "con qualcun altro"

---

## S0002: "Sto provando a imparare."

**Applied Rules**:
- R7 (Gerund Particle Split): "Sto" | "provando"
- BUT: "Sto provando" is IDIOMATIC construction → Create COMPOSITE with FEEDERS
- R3 (Preposition): "a" separate
- R1 (High Composability): All ≥9

**Extraction**:
1. "Sto" (FEEDER) - Auxiliary, can combine with many gerunds
2. "provando" (FEEDER) - Gerund, follows auxiliary
3. "Sto provando" (COMPOSITE) - Idiomatic "I'm trying" unit
4. "a" (BASE) - Infinitive marker
5. "imparare" (BASE) - Infinitive

**FD Check**:
- "Sto" / "I'm" → ✓ PASSES (present continuous auxiliary)
- "provando" / "trying" → ✓ PASSES (gerund form unambiguous for "trying")

**Why COMPOSITE?**:
- "Sto provando" is learned as UNIT (cognitive load management)
- Feeders teach components FIRST
- Then composite shows combination
- Learner already knows both parts when they see the whole

---

## S0003: "come parlare il più spesso possibile."

**Applied Rules**:
- R1 (High Composability): "come", "parlare", "spesso" all separate
- "il più possibile" = SUPERLATIVE CONSTRUCTION → Composite with feeders

**Extraction**:
1. "come" (BASE) - Interrogative/relative, high composability
2. "parlare" (BASE) - Infinitive (seen before in S0001)
3. "il più" (FEEDER) - Superlative marker
4. "possibile" (FEEDER) - "possible"
5. "il più possibile" (COMPOSITE) - "as much as possible" construction
6. "spesso" (BASE) - Adverb, modifiable by superlative

**FD Check**:
- "il più" / "the most" → ✓ PASSES (definite article + superlative)
- "possibile" / "possible" → ✓ PASSES

**Pattern Recognition**: "il più [ADJ] possibile" is reusable pattern
- "il più velocemente possibile" (as quickly as possible)
- "il più a lungo possibile" (as long as possible)

---

## S0004: "come dire qualcosa in italiano"

**Applied Rules**:
- R1: All high composability items separate
- R6: "in italiano" as compound (preposition+language bonded)

**Extraction**:
1. "come" (BASE) - Seen in S0003
2. "dire" (BASE) - Infinitive "to say"
3. "qualcosa" (BASE) - Indefinite pronoun
4. "in italiano" (BASE) - Prepositional phrase, treated as unit

**Decision**: Why "in italiano" as single LEGO?
- "in" alone has many meanings (location, time, manner)
- "in italiano" is COMPLETE unit = "in Italian" (language context)
- Bonding gives learner usable chunk immediately
- FD passes: "in Italian" → "in italiano" ✓

---

## S0005: "Sto per praticare a parlare con qualcun altro."

**Applied Rules**:
- "Sto per" = NEAR FUTURE construction → Composite with feeders
- R2: Modal structures split from infinitives
- R3: Prepositions split

**Extraction**:
1. "Sto" (FEEDER) - Auxiliary (seen in S0002)
2. "per" (FEEDER) - Particle "going to"
3. "Sto per" (COMPOSITE) - "I'm going to" construction
4. "praticare" (BASE) - Infinitive "to practise"
5. "a" (BASE) - Infinitive marker (seen before)
6. "parlare" (BASE) - Infinitive (seen multiple times)
7. "con" (BASE) - Preposition (seen in S0001)
8. "qualcun altro" (BASE) - "someone else" as unit

**FD Check**:
- "Sto" / "I'm" → ✓ PASSES
- "per" / "going to" → ✓ PASSES (in "sto per" context)

**Note**: "Sto per" vs "Sto provando" - both near future constructions with same feeder "Sto"

---

## S0006: "Sto provando a ricordare una parola."

**Applied Rules**:
- REUSE "Sto provando" composite from S0002
- R6: "una parola" as article+noun unit

**Extraction**:
1. "Sto" (FEEDER) - Reused
2. "provando" (FEEDER) - Reused
3. "Sto provando" (COMPOSITE) - Reused pattern
4. "a" (BASE) - Reused
5. "ricordare" (BASE) - "to remember"
6. "una parola" (BASE) - "a word" bonded article+noun

**FD Check**: All pass ✓

**Decision**: "una parola" vs extracting "un/una" + "parola"
- Article alone ("una") → FD FAILS (gender ambiguity: "a" → "un"? "una"?)
- "una parola" → FD PASSES ("a word" → "una parola" in this context)
- R6 (Article+Noun Bond): Keep together

---

## S0007: "Voglio provare più forte che posso oggi."

**Applied Rules**:
- R2: Modal+Infinitive split
- "più forte che posso" = COMPARATIVE IDIOM → Keep as BASE unit

**Extraction**:
1. "Voglio" (BASE) - Reused from S0001
2. "provare" (BASE) - "to try"
3. "più forte che posso" (BASE) - "as hard as I can" idiom
4. "oggi" (BASE) - "today" temporal

**Decision**: Why "più forte che posso" as single unit?
- Idiomatic comparative construction
- Breaking down creates non-FD pieces:
  - "più forte" / "harder"? "stronger"? Context-dependent
  - "che posso" / "that I can" - fragment
- Keep bonded as per R5 (Low Composability Bond)

---

## S0008: "Sto per provare a spiegare cosa intendo."

**Applied Rules**:
- Reuse "Sto per" composite from S0005
- R1: All high composability separate

**Extraction**:
1. "Sto" (FEEDER) - Reused
2. "per" (FEEDER) - Reused
3. "Sto per" (COMPOSITE) - Reused
4. "provare" (BASE) - Reused from S0007
5. "a" (BASE) - Reused
6. "spiegare" (BASE) - "to explain"
7. "cosa" (BASE) - "what"
8. "intendo" (BASE) - "I mean"

**FD Check**: All pass ✓
**Pattern Recognition**: "Sto per" + infinitive chain

---

## S0009: "Parlo un po' di italiano adesso."

**Applied Rules**:
- R1: High composability items separate
- "un po'" = QUANTIFIER IDIOM → Keep as BASE

**Extraction**:
1. "Parlo" (BASE) - "I speak" conjugated verb
2. "un po'" (BASE) - "a little" idiomatic quantifier
3. "di" (BASE) - "of" partitive preposition
4. "italiano" (BASE) - Reused
5. "adesso" (BASE) - Reused from S0001

**Decision**: "un po'" as single unit?
- "un po'" is idiomatic = "a little"
- Breaking: "un" = "a" (FD FAILS - gender ambiguity)
- Breaking: "po'" = fragment, meaningless alone
- Keep bonded per R5 + composability analysis

---

## S0010: "Non sono sicuro se posso ricordare tutta la frase."

**Applied Rules**:
- R9 (Negation Exposure): "Non" could split, BUT...
- "Non sono sicuro" = FIXED EXPRESSION → Composite with feeders
- R6: "tutta la frase" = article+noun+modifier unit

**Extraction**:
1. "Non" (FEEDER) - Negation particle
2. "sono" (FEEDER) - "I am"
3. "sicuro" (FEEDER) - "sure"
4. "Non sono sicuro" (COMPOSITE) - "I'm not sure" expression
5. "se" (BASE) - "if" conjunction
6. "posso" (BASE) - "I can" modal
7. "ricordare" (BASE) - Reused from S0006
8. "tutta la frase" (BASE) - "the whole sentence" complete noun phrase

**FD Check**:
- "Non" / "Not" → ✓ PASSES (negation particle)
- "sono" / "I am" → ✓ PASSES
- "sicuro" / "sure" → ✓ PASSES

**Decision**: "tutta la frase" as single unit?
- "tutta" alone = "whole" (FD FAILS - gender: tutto/tutta)
- "la" alone = "the" (FD FAILS - gender: il/la/lo/l'/i/gli/le)
- "frase" alone = "sentence" (LOW composability without article)
- "la frase" = better, but we have modifier "tutta"
- "tutta la frase" = COMPLETE noun phrase, natural unit
- Keep bonded per R6

---

## SUMMARY OF EXTRACTION DECISIONS

### Composites Created (4 patterns):
1. **"Sto provando"** - Continuous trying construction (S0002, S0006)
2. **"il più possibile"** - Superlative construction (S0003)
3. **"Sto per"** - Near future construction (S0005, S0008)
4. **"Non sono sicuro"** - Negative certainty expression (S0010)

### Bonded Units (Article+Noun / Idioms):
- "in italiano" - Prepositional phrase
- "qualcun altro" - "someone else" compound
- "una parola" - Article+noun
- "più forte che posso" - Comparative idiom
- "un po'" - Quantifier idiom
- "tutta la frase" - Complete noun phrase

### High-Frequency Reusable LEGOs:
- "Voglio" (S0001, S0007) - Modal
- "parlare" (S0001, S0003, S0005) - Infinitive
- "italiano" (S0001, S0004, S0009) - Language
- "con" (S0001, S0005) - Preposition
- "a" (S0002, S0005, S0006, S0008) - Infinitive marker
- "adesso" (S0001, S0009) - Temporal
- "Sto" (S0002, S0005, S0006, S0008) - Auxiliary

---

## VALIDATION RESULTS

**FD Compliance**: 100% (13 feeders, 0 violations)

**Feeders that pass FD**:
- ✓ "Sto" / "I'm"
- ✓ "provando" / "trying"
- ✓ "il più" / "the most"
- ✓ "possibile" / "possible"
- ✓ "per" / "going to" (in "sto per" context)
- ✓ "Non" / "Not"
- ✓ "sono" / "I am"
- ✓ "sicuro" / "sure"

**No FD violations** - all feeders can function as teaching units.

---

## KEY LEARNINGS

1. **Composability rules work**: Applied systematically, resulted in 100% FD compliance
2. **Article+noun bonding essential**: Prevents gender ambiguity in Italian
3. **Idiomatic constructions**: "Sto provando", "Sto per", "un po'" kept as units
4. **Reusability emerges**: High-composability items (Voglio, parlare, con, a) appear multiple times
5. **Feeder-first ordering**: Feeders teach components before composites appear

---

**Next Steps**:
1. Scale to next 10 seeds (S0011-S0020)
2. Continue documenting decisions
3. Build prompt from this reasoning for Haiku test
4. Compare Haiku vs Sonnet quality on same seeds
