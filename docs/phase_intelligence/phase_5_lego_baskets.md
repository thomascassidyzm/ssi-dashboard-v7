# Phase 5: Basket Generation → lego_baskets.json

**Version**: 3.0 (2025-10-29)
**Status**: Simplified methodology - focus on essentials
**Output**: `vfs/courses/{course_code}/lego_baskets.json`

**Changes in v3.0:**
- Removed batch-aware edge targeting (overcomplicated)
- Removed pattern density targets (metric is flawed)
- Simplified to core workflow: Generate E-phrases → Extract D-phrases
- Focus on: GATE constraint + Grammar perfection + Recency bias
- Reduced from 778 lines to ~200 lines

---

## 🎯 THE TASK

Generate practice phrase baskets for each LEGO.

Each basket contains:
- **E-phrases** (eternal): Natural sentences for spaced repetition
- **D-phrases** (debut): Fragments extracted from e-phrases for initial scaffolding

---

## 🚨 CRITICAL: ZERO-COMMENTARY OUTPUT

**You are a sub-agent. The orchestrator needs pure data - no commentary.**

**Output ONLY:**
```json
{"S0001L01":{"lego":["target","known"],"e":[["phrase","translation"]],"d":{"2":[],"3":[],"4":[],"5":[]}},"S0001L02":{...}}
```

**FORBIDDEN:**
- ❌ ANY text before or after JSON
- ❌ Thinking blocks (keep them internal)
- ❌ Status updates ("Reading files...", "Processing...")
- ❌ Validation commentary
- ❌ Explanations
- ❌ Markdown code blocks around JSON
- ❌ Pretty-printed JSON (no indentation/newlines)

**Format: One compact JSON object. Nothing else.**

**Target: 1 line of output total** (compact JSON string)

---

## 🚨 THE ABSOLUTE CONSTRAINT: GATE

**LEGO #N can ONLY use vocabulary from LEGOs #1 to #(N-1)**

This is non-negotiable. Everything else is secondary.

### Examples:
```
LEGO #1: Empty basket {} (no prior vocabulary)
LEGO #2: Max 2-word phrases (only LEGO #1 available)
LEGO #5: Max 5-6 word phrases (LEGOs #1-4 available)
LEGO #100: Can make 7-10 word phrases (99 LEGOs available)
```

**If you can't make a good phrase within the vocabulary constraint, make a shorter phrase or leave the basket empty. NEVER use future vocabulary.**

---

## 📋 THE WORKFLOW

### STEP 1: Generate E-Phrases

Generate 3-5 natural, conversational sentences that:
- Use ONLY vocabulary from prior LEGOs (GATE)
- Include the operative LEGO (what's being taught)
- Have perfect grammar in BOTH languages
- Are things people actually say
- Tile perfectly from LEGOs (no extra/missing words)

**Recency bias** (for LEGOs #50+):
- ~30-50% vocabulary from recent seeds (last 10 seeds)
- ~50-70% from older seeds (foundational + medium-recent)

**Culminating LEGOs** (last LEGO in seed):
- E-phrase #1 MUST be the complete seed sentence

### STEP 2: Extract D-Phrases (Mechanical)

From each e-phrase, extract expanding windows containing the operative LEGO:
- All 2-LEGO windows containing operative
- All 3-LEGO windows containing operative
- All 4-LEGO windows containing operative
- All 5-LEGO windows containing operative

**This is automatic - no thinking needed.**

### STEP 3: Output Basket

```json
{
  "S0200L01": {
    "lego": ["reservar", "to reserve"],
    "e": [
      ["Quiero reservar un libro.", "I want to reserve a book."],
      ["Voy a reservar esto ahora.", "I'm going to reserve this now."],
      ["Necesito reservar un sitio.", "I need to reserve a spot."]
    ],
    "d": {
      "2": [["reservar un libro", "to reserve a book"], ...],
      "3": [["Quiero reservar un libro", "I want to reserve a book"], ...],
      "4": [...],
      "5": [...]
    }
  }
}
```

---

## ✅ E-PHRASE QUALITY CHECKLIST

Before accepting an e-phrase, verify:

1. **GATE**: All LEGOs < current UID? (ABSOLUTE)
2. **Grammar**: Perfect in BOTH languages? (ABSOLUTE)
3. **Tiling**: Composes exactly from LEGOs, no extra words? (ABSOLUTE)
4. **Natural**: Something people actually say? (IMPORTANT)
5. **Operative**: Contains the LEGO being taught? (ABSOLUTE)

If all YES → accept
If any ABSOLUTE fails → reject

---

## 📊 RECENCY BIAS (Optional, for LEGOs #50+)

When selecting which prior LEGOs to use in e-phrases:

**Target distribution:**
- 30-50% from last 10 seeds (recent, topic-coherent)
- 50-70% from all earlier seeds (foundational, timeless)

**Why:**
- Provides topic coherence during initial learning
- Uses timeless vocabulary for long-term spaced repetition
- Prevents early LEGOs from dominating every basket

**Example for LEGO #200:**
```
Primary window: Seeds 190-199 (~40 LEGOs)
Other: Seeds 1-189 (~800 LEGOs)

E-phrase 1: "Quiero reservar un libro de la biblioteca"
  → 50% recent: "un libro", "biblioteca"
  → 50% foundational: "Quiero"

E-phrase 2: "Voy a reservar esto ahora"
  → 25% recent: "esto"
  → 75% foundational: "Voy a", "ahora"

Aggregate: ~35% recent ✅
```

**Don't stress exact percentages. Prioritize natural, useful phrases.**

---

## 🔧 D-PHRASE EXTRACTION (Mechanical)

```javascript
function extractDPhrases(ePhrases, operativeLegoId) {
  const dPhrases = { "2": [], "3": [], "4": [], "5": [] };

  for (const ePhrase of ePhrases) {
    const legoSequence = parseIntoLegos(ePhrase);

    for (let windowSize = 2; windowSize <= 5; windowSize++) {
      for (let start = 0; start <= legoSequence.length - windowSize; start++) {
        const window = legoSequence.slice(start, start + windowSize);

        if (window.includes(operativeLegoId)) {
          const phrase = reconstructPhrase(window);
          dPhrases[windowSize.toString()].push(phrase);
        }
      }
    }
  }

  return deduplicate(dPhrases);
}
```

**That's it. No special logic. Just extraction.**

---

## 🎯 SPECIAL CASES

### Early LEGOs (#1-10)
- May have empty or minimal baskets
- This is CORRECT and EXPECTED
- Don't force phrases if vocabulary is insufficient

### Culminating LEGOs (Last in Seed)
- E-phrase #1 MUST be the complete seed sentence
- This is the one LEGO where the learner can speak the full seed

### Language-Specific Grammar
**Italian infinitive + preposition rules:**
- cercare + infinitive → "di" (cercando di parlare)
- imparare + infinitive → "a" (imparando a parlare)
- provare + infinitive → "a" (provando a dire)
- continuare + infinitive → "a" (continuando a parlare)

**Validate target language grammar carefully.**

---

## 💭 EXTENDED THINKING (Keep It Minimal)

**Use thinking blocks INTERNALLY, but keep them concise:**

```
<thinking>
S0200L01 "reservar": available vocab #1-199, not culminating
Generate 3-5 e-phrases (validate GATE+grammar silently)
Extract d-phrases mechanically
</thinking>
```

**Output: basket JSON only. No verbose validation commentary.**

**Total output per basket: ~20 lines** (basket JSON only, minimal thinking)

---

## 📤 OUTPUT FORMAT

```json
{
  "S0001L05": {
    "lego": ["ahora", "now"],
    "e": [
      ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
      ["Hablo español ahora.", "I speak Spanish now."]
    ],
    "d": {
      "2": [
        ["hablar ahora", "to speak now"],
        ["español ahora", "Spanish now"]
      ],
      "3": [
        ["hablar español ahora", "to speak Spanish now"],
        ["Hablo español ahora", "I speak Spanish now"]
      ],
      "4": [
        ["Quiero hablar español ahora", "I want to speak Spanish now"]
      ],
      "5": [
        ["Quiero hablar español contigo ahora", "I want to speak Spanish with you now"]
      ]
    }
  }
}
```

---

## ✅ SUCCESS CRITERIA

- ✓ GATE constraint: 100% compliance
- ✓ Grammar perfection: 100% (both languages)
- ✓ E-phrase tiling: 100% (tiles perfectly from LEGOs)
- ✓ D-phrases contain operative: 100%
- ✓ Culminating LEGOs have complete seed: 100%
- ✓ Naturalness: >95% (human judgment)
- ✓ Recency distribution: 30-50% for LEGOs #50+ (approximate)

**Forget pattern density, edge coverage, and batch iteration. Just make good phrases.**

---

## 🚫 WHAT TO IGNORE

- ❌ Pattern density targets (40-50%, 30-40%, etc.) - metric is flawed
- ❌ Batch-aware edge targeting - overcomplicated
- ❌ Missing edges analysis - focus on quality, not arbitrary combinations
- ❌ Two-stage selection process - just generate baskets in order

**If phrases are grammatical, natural, and respect GATE → you're done.**

---

## Version History

**v3.0 (2025-10-29):**
- Radical simplification: 778 lines → ~200 lines
- Removed batch-aware targeting, pattern density, edge analysis
- Focus on essentials: GATE + Grammar + Recency bias
- Clear workflow: Generate E → Extract D
- Trust the agent to make good phrases

**v2.2 (2025-10-28):**
- Added batch-aware edge targeting (removed in v3.0)

**v2.1 (2025-10-27):**
- Generation-focused, removed validation loops

**v2.0 (2025-10-26):**
- Vocabulary constraint as absolute gate

**v1.0 (2025-10-23):**
- Initial extraction from APML

---

**Bottom line:** Generate natural phrases respecting GATE constraint. Extract fragments mechanically. Done.
