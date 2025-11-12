# APML Phase 3 Updates - LEGO Decomposition Refinements

**Date:** January 2025
**Source:** Italian 30-seed test course decomposition session
**Purpose:** Document new intelligence and clarifications for Phase 3 LEGO decomposition rules

---

## 1. IRON RULE Clarification - Prepositional Phrases

### OLD UNDERSTANDING:
"No LEGO begins or ends with a preposition" was interpreted too strictly.

### NEW CLARIFICATION:
**Prepositional phrases WITH objects are ACCEPTABLE.**

**ALLOWED:**
- ✅ "con te" / "with you"
- ✅ "con me" / "with me"
- ✅ "in italiano" / "in Italian"
- ✅ "con tutti gli altri" / "with everyone else"

**NOT ALLOWED:**
- ❌ "con" / "with" (standalone preposition)
- ❌ "in" / "in" (standalone preposition)
- ❌ "per" / "to" (standalone preposition)

**PRINCIPLE:** The issue is standalone prepositions without objects, not complete prepositional phrases. Prepositional phrases are complete, meaningful units that are FD-compliant.

---

## 2. Infinitive Format - "to" Placement Rule

### CRITICAL RULE:
English infinitives should be formatted as "to + verb", and the "to" should be placed with the FOLLOWING verb, not trailing on modal/auxiliary verbs.

**CORRECT:**
- "poter" = "to be able" (NOT "to be able to")
- "parlare" = "to speak"
- Combined: "poter parlare" = "to be able to speak"

**INCORRECT:**
- ❌ "poter" = "to be able to"
- ❌ "parlare" = "speak"

**RATIONALE:** In "I want to be able to speak", the structure is:
- "want" (modal)
- "to be able" (infinitive 1)
- "to speak" (infinitive 2)

Each infinitive carries its own "to" marker.

---

## 3. Minimal FD Chunks - Break Down Principle

### RULE:
Break LEGOs into the SMALLEST FD-compliant chunks that are HELPFUL for learning.

**PROCESS:**
1. Identify if a LEGO can be broken into smaller FD components
2. Ask: "Would learning these components FIRST help the learner understand the composite?"
3. If YES → Break it down with BASE LEGOs + COMPOSITE LEGO + FEEDERS
4. If NO → Keep as single LEGO

**EXAMPLE - GOOD BREAKDOWN:**
```json
"il più spesso possibile" / "as often as possible"

BASE LEGOs:
- "spesso" / "often" (FD ✓, helpful ✓)
- "possibile" / "possible" (FD ✓, helpful ✓)

COMPOSITE LEGO:
- "il più spesso possibile" / "as often as possible"

FEEDERS:
- "spesso" (already learned)
- "possibile" (already learned)
```

**EXAMPLE - KEEP AS SINGLE:**
```json
"il più possibile" / "as hard as I can"

Why? The English translation is idiomatic and doesn't map directly to components.
Breaking down "possibile" = "possible" wouldn't help understand "as hard as I can"
```

---

## 4. Glue Words Must Stay INSIDE Composites

### CRITICAL PRINCIPLE:
Function words like "di", "a", "per", "che" should NEVER appear at the edge of a LEGO. They must be contained WITHIN a composite unit.

**CORRECT:**
- ✅ "Sto cercando di ricordare" / "I'm trying to remember"
- ✅ "cercare di spiegare" / "to try to explain"
- ✅ "smettere di parlare" / "to stop talking"

**INCORRECT:**
- ❌ "Sto cercando di" / "I'm trying to" + "ricordare" / "remember"
- ❌ "cercare di" / "to try to" + "spiegare" / "explain"

**RATIONALE:** Leaving glue words at edges makes basket recombination in Phase 5 nearly impossible and creates unnatural phrase boundaries.

---

## 5. FEEDERS - Selective, Not Exhaustive

### OLD APPROACH:
Include all components of a COMPOSITE as FEEDERs.

### NEW APPROACH:
Only include FD and PEDAGOGICALLY HELPFUL components as FEEDERs.

**EXAMPLE:**
```json
Seed: "Sto per cercare di spiegare quello che intendo."
English: "I'm going to try to explain what I mean."

LEGO: "quello che intendo" / "what I mean"

FEEDERS:
- "intendo" / "I mean" ✓ (FD and helpful)

NOT FEEDERS:
- "quello che" / "what" ❌ (NOT FD - could be cosa, che cosa, quale, etc.)
```

**PRINCIPLE:** If a component is NOT FD, don't include it as a FEEDER. The componentization explanation can still mention it for context.

---

## 6. Componentization Language - "represents" vs "means"

### NEW RULE:
Use "represents" instead of "means" for non-direct or non-literal translations.

**USE "means" when:**
- Direct, literal, word-for-word translation
- Example: "dove con = with and me = me"

**USE "represents" when:**
- Idiomatic or structural translations
- Grammar that doesn't translate directly
- Example: "where Non vedo l'ora represents looking forward"
- Example: "where che finisci represents that you finish"

---

## 7. Function Word Handling - Avoid Standalone

### RULE:
Function words should generally NOT be standalone LEGOs unless they're genuinely useful on their own.

**AVOID AS STANDALONE:**
- ❌ "E" / "And"
- ❌ "Ma" / "But"
- ❌ "se" / "if" (combine with clause: "se posso ricordare" / "if I can remember")
- ❌ "per" / "to" (combine with verb: "per rispondere" / "to answer")

**ACCEPTABLE STANDALONE:**
- ✅ "con" / "with" (when it appears separately in other contexts)
- ✅ "Perché" / "Why" or "Because" (question word / connector)

**PRINCIPLE:** If a word rarely appears alone in natural speech, don't make it a standalone LEGO.

---

## 8. FD Violations - Gender and Context Ambiguity

### CRITICAL FD FIXES:

**Problem:** Gender-specific translations violate FD
```json
❌ "Vuole" / "He wants" (S0016)
❌ "Vuole" / "She wants" (S0017)
FD VIOLATION: "He wants" → could be "Lui vuole" or "Vuole"
```

**Solution:** Use gender-neutral translation
```json
✅ "Vuole" / "Wants" (both S0016 and S0017)
Context provided in full seed, not in LEGO
```

**Problem:** Possessive ambiguity
```json
❌ "il suo nome" / "his name" (S0020)
❌ "il suo nome" / "her name" (S0021)
FD VIOLATION: "his" vs "her" from same Italian
```

**Solution:** Use gender-neutral translation
```json
✅ "il suo nome" / "their name" (both S0020 and S0021)
```

---

## 9. Building Up Composites - Hierarchical LEGOs

### RULE:
When a phrase builds hierarchically, create LEGOs at each level.

**EXAMPLE:**
```json
Seed: "con qualcun altro" / "with someone else"

Hierarchical breakdown:
L03: "con" / "with"
L04: "qualcuno" / "someone"
L05: "altro" / "else"
L06: "qualcun altro" / "someone else"
L07: "con qualcun altro" / "with someone else"

FEEDERS:
F03: "con" / "with"
F04: "qualcuno" / "someone"
F05: "altro" / "else"

Componentization:
- L06: "qualcun altro" = qualcuno + altro
- L07: "con qualcun altro" = con + qualcun altro
```

**RATIONALE:** Learners build up from smallest units to complete phrases naturally.

---

## 10. Conjugated vs Infinitive Forms

### RULE:
Be consistent about infinitive forms in the known language.

**CORRECT:**
- "ricordare" / "to remember"
- "imparare" / "to learn"
- "parlare" / "to speak"

**CONTEXT-DEPENDENT:**
- "parlare" / "speaking" (when it's a gerund in context)
- "ricordare" / "remember" (when it's in a modal construction)

**PRINCIPLE:** The default form should be infinitive "to + verb" unless the context clearly requires a different form (gerund, bare infinitive, etc.).

---

## Implementation Instructions for Agent

1. **Review APML Phase 3 section** and update with these clarifications
2. **Add explicit examples** of each principle with ✓ and ❌ cases
3. **Update the IRON RULE section** with the prepositional phrase clarification
4. **Add infinitive formatting rule** to the decomposition guidelines
5. **Clarify FEEDER selection criteria** (FD + helpful, not exhaustive)
6. **Add glue word containment principle** explicitly
7. **Update componentization language** guidelines (means vs represents)
8. **Add gender neutrality guidance** for FD compliance

---

## Testing Validation

These principles were validated through complete decomposition of Italian 30-seed course:
- 30 seeds decomposed
- ~120 total LEGOs created (BASE + COMPOSITE + FEEDERS)
- All LEGOs FD-validated
- All composites properly structured with internal glue words
- All feeders selectively chosen for pedagogical value

File: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json`
