# Phase 5 v2.0 Demo: Generate Phrases for S0011L01

**Following**: `docs/phase_intelligence/phase_5_conversational_baskets_v2_PROPOSED.md`

---

## Context

**Current LEGO**: S0011L01
- LEGO: ["I'd like", "Me gustaría"]
- Type: C (Composite)

**Seed**: S0011
- Target: "Me gustaría poder hablar después de que termines."
- Known: "I'd like to be able to speak after you finish."

**Available Patterns**: P01, P02, P03, P04, P05, P06, P12, P18

**Available Conjunctions** (through S0010): si (if)

**Is Final LEGO**: No

---

## STEP 0: VOCABULARY WHITELIST

**Source**: All taught LEGOs through S0010

**Allowed Spanish Words** (97 words):
```
Estoy, Estoy intentando, Hablo, No, No estoy seguro, Quiero, Voy, Voy a,
a, ahora, algo, alguien, alguien más, aprende, aprendemos, aprenden,
aprender, aprendes, aprendido, aprendiendo, aprendo, como, contigo, cómo,
de, decir, duro, en, en español, español, estoy, explica, explicado,
explicamos, explican, explicando, explicar, explicas, explico,
frecuentemente, habla, hablado, hablamos, hablan, hablando, hablar,
hablar algo, hablas, hablo, hoy, intenta, intentado, intentamos, intentan,
intentando, intentar, intentas, intento, la, lo, lo más frecuentemente
posible, lo que quiero decir, más, oración, palabra, poco, posible,
practica, practicado, practicamos, practican, practicando, practicar,
practicas, practico, pueda, puedo, que, quiero, recordado, recordamos,
recordando, recordar, recuerda, recuerdan, recuerdas, recuerdo, seguro,
si, tan, tan duro como pueda, toda, toda la oración, un, un poco de
español, una, una palabra
```

**CRITICAL**: The target LEGO "Me gustaría" is NEW (not in whitelist yet). This is OK - it's the LEGO being taught. All OTHER Spanish words must be from the whitelist.

---

## Your Task

Generate **20 candidate phrases** for LEGO "I'd like" / "Me gustaría" following the Phase 5 v2.0 protocol.

Then validate each phrase through STEPS 2-4, and select the best 15.

---

## Output Format

Please provide your output in this structure:

### STEP 1: GENERATE 20 CANDIDATES

```json
[
  ["known phrase", "target phrase", "pattern_or_null", lego_count],
  ...
]
```

### STEP 2: GATE VALIDATION

For each phrase, show:
```
Phrase X: "English" → "Spanish"
Spanish words: [word1, word2, word3, ...]
Check: word1 ✓, word2 ✓, word3 ❌ (NOT IN WHITELIST - REJECT)
Result: PASS/REJECT
```

Summary: X phrases pass GATE compliance

### STEP 3: COMPLETENESS VALIDATION

For each GATE-compliant phrase:
```
Phrase X: "English" → "Spanish"
English complete? yes/no
Spanish complete? yes/no
Result: PASS/REJECT
```

Summary: X phrases pass completeness

### STEP 4: GRAMMAR VALIDATION

For each complete phrase:
```
Phrase X: "English" → "Spanish"
Grammar check: [any issues?]
Natural Spanish? yes/no
Result: PASS/REJECT
```

Summary: X phrases pass grammar

### STEP 5: FINAL SELECTION

Select best 15 from validated phrases:

```json
[
  ["known phrase", "target phrase", "pattern_or_null", lego_count],
  ...15 phrases total...
]
```

Distribution check:
- 1-2 LEGOs: X phrases
- 3-4 LEGOs: X phrases
- 5+ LEGOs: X phrases ⭐

Conjunction usage: X/15 (X%)

---

## Requirements Reminder

1. **Conversational**: At least 7-8 phrases with 5+ LEGOs
2. **Conjunctions**: Use "si" in 40%+ of phrases (6+ out of 15)
3. **GATE Compliance**: Every Spanish word (except "Me gustaría") must be in whitelist
4. **Completeness**: All phrases must be complete thoughts
5. **Grammar**: Natural Spanish constructions

---

## Begin Generation

Please generate 20 candidate phrases, then validate through STEPS 2-4, and select the best 15.
