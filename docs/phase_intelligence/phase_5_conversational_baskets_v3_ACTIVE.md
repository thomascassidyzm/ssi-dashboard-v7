# Phase 5 Intelligence: LEGO Basket Generation v3.0 (ACTIVE)

**Version**: 3.0 (ACTIVE - Human-Corrected)
**Status**: Production Ready
**Purpose**: Generate high-quality practice phrase baskets with strict GATE compliance

---

## Core Specifications

### Target Output
- **10 excellent phrases per LEGO** (may generate 12-13 to select best 10)
- **Source**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/lego_pairs.json`
- **Output**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/baskets/lego_baskets_s00XX.json`
- **Format**: Match S0011.json structure exactly

### Phrase Distribution (per 10 phrases)
- **2 short** (1-2 LEGOs) - building blocks, **fragments OK**
- **2 quite short** (3 LEGOs) - simple patterns, complete thoughts
- **2 longer** (4-5 LEGOs) - pattern combinations, complete thoughts
- **4 long** (6+ LEGOs, avg 7-10 words) - conversational gold ⭐

---

## The Three Sacred Rules

### 1. GATE COMPLIANCE (Exact Forms Only)

**CRITICAL**: Every Spanish word must be the EXACT form taught in LEGOs.

**❌ NO conjugations allowed**:
- If "hablar" was taught, only use "hablar"
- If "estoy" was taught, you CANNOT use "está" or "están"
- If "quiero" was taught, you CANNOT use "quiere" or "quieres"

**How to build your whitelist**:
1. Extract exact Spanish text from ALL taught LEGOs (S0001 through current SEED)
2. Split multi-word LEGOs into individual words
3. Include ONLY those exact forms

**Example**:
```
Taught LEGOs through S0002:
- "quiero" (I want)
- "hablar" (to speak)
- "español" (Spanish)
- "contigo" (with you)
- "ahora" (now)
- "estoy intentando" (I'm trying)
- "aprender" (to learn)

Whitelist: [quiero, hablar, español, contigo, ahora, estoy, intentando, aprender]

✓ "Quiero hablar español" (all exact forms)
✓ "Estoy intentando aprender" (all exact forms)
❌ "Quieres hablar español" (quieres not taught)
❌ "Estás intentando aprender" (estás not taught)
```

**Zero tolerance**: One untaught form = reject phrase immediately.

---

### 2. COMPLETENESS (Context Dependent)

**First 2 phrases (short, 1-2 LEGOs)**: Fragments OK
- Purpose: Show learner how new LEGO fits in
- Examples: "to speak", "Spanish", "with you"

**Remaining 8 phrases**: Must be complete standalone thoughts
- Must make sense without additional context
- No incomplete constructions

**Examples**:
```
❌ "to be able to" (incomplete - to be able to WHAT?)
✓ "I want to be able to speak" (complete thought)

❌ "después de que" (incomplete - requires verb clause)
✓ "después de que termines" (complete construction)

✓ "I'd like to speak Spanish with you now" (complete)
```

---

### 3. NATURALNESS (Would-Say Test)

**Would a real person actually say this?**

- Natural grammar and word order
- Not clunky or forced
- Something useful in conversation
- Quality over quantity - better 8 great phrases than 10 with 2 weak ones

**Examples**:
```
❌ "I want Spanish" (unnatural, low value)
✓ "I want to learn Spanish" (natural, useful)

❌ "español quiero hablar" (unnatural word order)
✓ "quiero hablar español" (natural word order)
```

---

## Conjunction Guidelines

**CRITICAL**: Conjunctions are only available WHEN they've been taught as LEGOs.

- They're just words like any other - no special treatment
- Once available, use naturally: 2-4 phrases per 10 (20-40%)
- Don't overdo - no forced conjunctions in every phrase
- Common conjunctions: si, y, pero, porque, cuando

**GATE Violation Example - MUST REMOVE**:
```
At S0010, only "si" has been taught as a conjunction.

❌ "I want to try but I'm not sure" (pero not taught yet - GATE VIOLATION)
❌ "I'm going to try today but I'm not sure" (pero not taught yet - GATE VIOLATION)

✓ "I want to try if I can" (si is available)
✓ "I'm not sure if I can speak" (si is available)
```

**What to do when you catch a GATE violation**:
1. Remove the phrase immediately
2. Replace with a GATE-compliant alternative
3. Update phrase_distribution to reflect the change
4. Maintain the target of 8-10 excellent phrases per LEGO

**Example**:
```
If "si" and "y" have been taught:
✓ "I want to speak Spanish and learn English"
✓ "I'm trying to learn if I can"

If "pero" has NOT been taught yet:
❌ "I want to speak but I can't" (pero not available)
✓ "I want to speak with someone else" (no conjunction needed)
```

---

## Pattern & Vocabulary Priority

### Focus on 5 Previous SEEDs
- Prioritize patterns from the 5 previous SEEDs
- Prioritize vocabulary from the 5 previous SEEDs
- This keeps topics/patterns/vocab fresh as course progresses
- Makes S0001 feel different from S0100

### Don't Overdo Anything
- No single pattern in every phrase
- No single expression type dominating
- Natural variety matters
- Distribute pattern usage across basket

---

## Final LEGO Special Rule

**Last phrase of final LEGO must be the complete seed sentence**

This confirms the full seed is achievable with taught LEGOs only.

---

## Validation Protocol

### For Each Phrase, Check:

1. **✅ GATE Compliance**
   - Tokenize Spanish phrase into words
   - Check EVERY word = exact form from taught LEGOs
   - Reject if ANY word is untaught

2. **✅ Completeness**
   - First 2 phrases: Fragments OK
   - Remaining phrases: Must be standalone thoughts
   - No incomplete constructions

3. **✅ Naturalness**
   - Would someone actually say this?
   - Natural grammar and word order?
   - Useful in conversation?

4. **✅ Variety**
   - Not overdoing any pattern/expression type?
   - Good distribution across phrase types?

5. **✅ Recency**
   - Prioritizing vocab from 5 previous SEEDs?
   - Using recent patterns?

---

## Output Format

```json
{
  "version": "curated_v6_molecular_lego",
  "seed": "S0011",
  "course_direction": "Spanish for English speakers",
  "mapping": "KNOWN (English) → TARGET (Spanish)",
  "seed_pair": {
    "known": "I'd like to be able to speak after you finish.",
    "target": "Me gustaría poder hablar después de que termines."
  },
  "patterns_introduced": "P04, P10",
  "cumulative_patterns": ["P01", "P02", "P03", "P04", "P05", "P06", "P10", "P12", "P18"],
  "cumulative_legos": 33,
  "curation_metadata": {
    "curated_at": "2025-11-06T00:00:00.000Z",
    "curated_by": "Claude Code - Human-guided molecular LEGO optimization",
    "changes_from_v5": [
      "Reduced from 4 to 3 lessons (L03+L04 merged)",
      "Reduced from 15 to 10 phrases per lesson",
      "Removed GATE violations (saber, mejor, es posible)",
      "Applied FD test principle: 'después de que' incomplete standalone",
      "Optimal distribution: 2 short, 2 quite short, 2 longer, 4 long"
    ]
  },

  "S0011L01": {
    "lego": ["I'd like", "Me gustaría"],
    "type": "C",
    "available_legos": 31,
    "available_patterns": ["P01", "P02", "P03", "P05", "P06", "P12", "P18"],
    "practice_phrases": [
      ["I'd like", "Me gustaría", "P04", 1],
      ["I'd like to speak", "Me gustaría hablar", "P04", 2],
      ["I'd like to learn Spanish", "Me gustaría aprender español", "P04", 3],
      ["I'd like to speak if I can", "Me gustaría hablar si puedo", "P04", 4],
      ["I'd like to speak Spanish with you now", "Me gustaría hablar español contigo ahora", "P04", 5],
      ["I want to explain what I'd like to learn", "Quiero explicar lo que me gustaría aprender", "P01", 5],
      ["I'd like to remember the whole sentence if I can", "Me gustaría recordar toda la oración si puedo", "P04", 6],
      ["I'm not sure if I'd like to speak now", "No estoy seguro si me gustaría hablar ahora", "P06", 5],
      ["how to explain what I'd like to try", "cómo explicar lo que me gustaría intentar", "P12", 5],
      ["I'm going to try to explain what I'd like", "Voy a intentar explicar lo que me gustaría", "P03", 5]
    ],
    "phrase_distribution": {
      "really_short_1_2": 2,
      "quite_short_3": 1,
      "longer_4_5": 3,
      "long_6_plus": 4
    },
    "pattern_coverage": "P01, P02, P03, P04, P06, P12",
    "gate_compliance": "STRICT - All words from S0001-S0010 LEGOs only"
  },

  "S0011L02": {
    "lego": ["to be able to", "poder"],
    "type": "B",
    "available_legos": 32,
    "available_patterns": ["P01", "P02", "P03", "P04", "P05", "P06", "P12", "P18"],
    "practice_phrases": [
      ["to be able to", "poder", null, 1],
      ["to be able to speak", "poder hablar", null, 2],
      ["to be able to speak Spanish", "poder hablar español", null, 3],
      ["to be able to speak if I can", "poder hablar si puedo", null, 4],
      ["I'd like to be able to speak", "Me gustaría poder hablar", null, 4],
      ["I'd like to be able to speak Spanish", "Me gustaría poder hablar español", null, 5],
      ["I'd like to be able to practise with you", "Me gustaría poder practicar contigo", null, 5],
      ["I'd like to be able to speak Spanish with you", "Me gustaría poder hablar español contigo", null, 6],
      ["I'd like to be able to speak with you now", "Me gustaría poder hablar contigo ahora", null, 6],
      ["I'd like to be able to practise Spanish with you now", "Me gustaría poder practicar español contigo ahora", null, 7]
    ],
    "phrase_distribution": {
      "really_short_1_2": 2,
      "quite_short_3": 1,
      "longer_4_5": 3,
      "long_6_plus": 4
    },
    "pattern_coverage": "null (Type B basket)",
    "gate_compliance": "STRICT - All words from S0001-S0011L01 LEGOs only"
  },

  "S0011L03": {
    "lego": ["after you finish", "después de que termines"],
    "type": "C",
    "lego_type": "MOLECULAR",
    "molecular_rationale": "PHASE 3 FD TEST: 'después de que' alone is grammatically incomplete (requires verb clause). Fails 'Is this ambiguous standalone?' test. Made BIGGER to include 'termines' for functional completeness.",
    "available_legos": 33,
    "available_patterns": ["P01", "P02", "P03", "P04", "P05", "P06", "P12", "P18"],
    "practice_phrases": [
      ["after you finish", "después de que termines", "P10", 1],
      ["to speak after you finish", "hablar después de que termines", null, 2],
      ["I'd like to speak after you finish", "Me gustaría hablar después de que termines", null, 3],
      ["to be able to speak after you finish", "poder hablar después de que termines", null, 3],
      ["I'd like to be able to speak after you finish.", "Me gustaría poder hablar después de que termines.", "P04", 4],
      ["I'd like to speak with you after you finish", "Me gustaría hablar contigo después de que termines", null, 4],
      ["I'd like to be able to speak with you after you finish", "Me gustaría poder hablar contigo después de que termines", null, 5],
      ["I'd like to be able to speak Spanish after you finish", "Me gustaría poder hablar español después de que termines", null, 5],
      ["I'd like to be able to speak a little more after you finish", "Me gustaría poder hablar un poco más después de que termines", null, 6],
      ["I want to be able to speak Spanish after you finish", "Quiero poder hablar español después de que termines", "P01", 5]
    ],
    "phrase_distribution": {
      "really_short_1_2": 2,
      "quite_short_3": 2,
      "longer_4_5": 2,
      "long_6_plus": 4
    },
    "pattern_coverage": "P01, P04, P10 (subjunctive mood)",
    "full_seed_included": "YES - phrase 5: 'I'd like to be able to speak after you finish.'",
    "gate_compliance": "STRICT - All words from S0001-S0011L02 LEGOs only. NOTE: 'terminar' introduced in this LEGO as part of molecular unit.",
    "note": "All phrases are now grammatically complete - no incomplete 'después de que' fragments"
  }
}

```

**Each phrase**: `[English, Spanish, [LEGO_IDs_used], count]`

---

## Workflow

### Generation Process
1. **Read lego_pairs.json** for current SEED
2. **Build whitelist** from all taught LEGOs (exact forms only)
3. **Generate 12-13 candidate phrases** per LEGO
4. **Validate each phrase** against all criteria
5. **Select best 10** based on distribution/naturalness
6. **Save to baskets folder**
7. **Sanity check every 5 SEEDs** with user

### Quality over Speed
- Work slowly and deliberately
- Generate extra if helpful, select best 10
- Save after each SEED
- Better to have fewer excellent phrases than many mediocre ones

---

## Key Differences from v2.0

### ❌ v2.0 Error: Conjugations Allowed
**v2.0**: "Add conjugation variants: hablar → hablo, habla, hablas..."
**v3.0 Fix**: Only EXACT forms taught - no conjugations, no derivations

### ❌ v2.0 Error: No Fragments Ever
**v2.0**: "No fragments - complete thoughts only"
**v3.0 Fix**: First 2 phrases (short) CAN be fragments to show LEGO fit

### ❌ v2.0 Error: Conjunctions Always Available
**v2.0**: Listed conjunctions as if always available
**v3.0 Fix**: Conjunctions only available after taught as LEGOs

### ❌ v2.0 Error: Target 15 Phrases
**v2.0**: Generate 15 phrases per LEGO
**v3.0 Fix**: Generate 10 phrases per LEGO (may draft 12-13, select best 10)

### ✅ v2.0 Kept: Validation Rigor
- Word-by-word GATE checking
- Completeness validation
- Grammar checking
- Quality focus

---

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Using Conjugations
```
Taught: "quiero" (I want)
❌ Generated: "Quieres hablar" (quieres not taught)
✓ Correct: Only use "quiero"
```

### ❌ Pitfall 2: Using Untaught Conjunctions
```
Only "si" taught
❌ Generated: "Quiero hablar pero..." (pero not taught)
✓ Correct: Wait until pero is taught as a LEGO
```

### ❌ Pitfall 3: Forcing Completeness on Short Phrases
```
First 2 phrases (1-2 LEGOs)
❌ Rejecting: "to speak" (thinking it's incomplete)
✓ Correct: Fragments OK for first 2 short phrases
```

### ❌ Pitfall 4: Overdoing One Pattern
```
❌ All 10 phrases use P01 "Quiero..."
✓ Vary patterns: P01, P02, P03, null, etc.
```

### ❌ Pitfall 5: Ignoring Recency Priority
```
At SEED S0050:
❌ Only using S0001-S0005 vocabulary
✓ Prioritize S0045-S0050 (5 previous SEEDs)
```

---

## Success Criteria

A successful basket achieves:

- ✅ **100% GATE compliance** - all exact forms from taught LEGOs
- ✅ **Proper completeness** - fragments OK for first 2, complete thoughts for rest
- ✅ **100% natural Spanish** - grammar, word order, conversational
- ✅ **Good distribution** - 2 short, 2 quite short, 2 longer, 4 long
- ✅ **Natural conjunctions** - 20-40% when conjunctions available
- ✅ **Pattern variety** - not overdoing any single pattern
- ✅ **Recency priority** - emphasizing 5 previous SEEDs
- ✅ **Final seed included** - if final LEGO

**This is "top dollar content" quality.**

---

## Final Checklist (Before Saving)

- [ ] Whitelist built from exact taught forms only (no conjugations)
- [ ] Generated 10-13 candidate phrases per LEGO
- [ ] Validated GATE compliance (exact word-by-word match)
- [ ] Validated completeness (fragments OK for first 2 only)
- [ ] Validated naturalness (would-say test)
- [ ] Validated grammar (natural Spanish constructions)
- [ ] Selected best 10 phrases
- [ ] Distribution: 2 short, 2 quite short, 2 longer, 4 long
- [ ] Conjunction usage: 20-40% (if conjunctions available)
- [ ] Pattern variety: not overdoing any single pattern
- [ ] Recency: prioritizing 5 previous SEEDs
- [ ] If final LEGO: Full seed sentence included
- [ ] Saved to correct path in baskets folder

**Only save if ALL checkboxes checked ✅**

---

**End of Phase 5 v3.0 (ACTIVE)**
