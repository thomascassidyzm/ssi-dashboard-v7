# SSi Course Production Skills

## Overview

This directory contains **Claude Skills** that encapsulate the pedagogical methodology for SSi course production. Skills use **progressive disclosure** to provide only the information needed at each step, dramatically reducing context usage while maintaining perfect consistency.

## Why Skills?

### Current Approach (APML Prompts)

**Problem:** Large prompts loaded into every agent invocation

```
Phase 3 APML Prompt: ~15KB
- LEGO classification rules
- FD validation logic
- Componentization guidelines
- Quality heuristics
- Data schemas
- Examples
- Edge cases
```

Every time an agent runs Phase 3, it loads **all 15KB** into context.

For 668 seeds with multiple agents:
- **15KB × 50 agents = 750KB** of redundant prompt loading
- **~300K tokens wasted** on prompt repetition

### Skills Approach

**Solution:** Progressive disclosure with filesystem-based methodology

```
Phase 3 Skill Invocation: ~200 bytes

"Use the LEGO Extraction Skill to process translations.json
 for course: spa_for_eng_668seeds"
```

Agent loads only what it needs:
- **SKILL.md** (overview) → 2KB
- **CLASSIFICATION.md** (when deciding BASE/COMPOSITE) → 5KB
- **FD_VALIDATION.md** (when validating) → 4KB
- **COMPONENTIZATION.md** (when writing explanations) → 3KB

**Total loaded: ~14KB** (same as before)

**But now:**
- ✅ Loaded progressively (not all at once)
- ✅ Shared across agents (filesystem-based)
- ✅ Bundled scripts run **without loading into context**
- ✅ Easy to update (edit skill, not APML registry)

**For 668 seeds:**
- **~50KB total** (vs 750KB before)
- **~90% reduction in prompt tokens**

## Available Skills

### 1. introductions-skill

**Status:** ✅ Complete prototype

**Purpose:** Generate pedagogical introductions for LEGO pairs

**Structure:**
```
introductions-skill/
├── SKILL.md                          # Main skill definition
├── GENERATION_LOGIC.md               # Detailed methodology
├── schemas/SCHEMAS.md                # JSON structure specs
├── examples/EXAMPLES.md              # Annotated good/bad examples
└── scripts/generate-introductions.cjs # Executable script (bundled)
```

**Key Benefit:** Existing `generate-introductions.cjs` script can be **bundled** and executed directly without loading into context.

**Usage in orchestrator prompt:**
```markdown
## Phase 6: Introductions

Use the Introductions Skill to generate contextual introductions.

Input files:
- LEGO_BREAKDOWNS_COMPLETE.json
- lego_provenance_map.json
- translations.json

Output: introductions.json

The skill provides complete methodology and bundled script.
```

**Token savings:** ~8KB → ~300 bytes (96% reduction)

---

### 2. lego-extraction-skill

**Status:** ✅ Core structure complete

**Purpose:** Extract BASE/COMPOSITE/FEEDER LEGOs with FD validation

**Structure:**
```
lego-extraction-skill/
├── SKILL.md                     # Main skill definition
├── rules/
│   ├── CLASSIFICATION.md        # BASE/COMPOSITE/FEEDER decision tree
│   ├── FD_VALIDATION.md         # Forward-derivation test
│   ├── COMPONENTIZATION.md      # How to explain COMPOSITE breakdown
│   └── QUALITY_HEURISTICS.md    # 6 quality filters (TODO)
├── schemas/
│   └── SCHEMAS.md               # JSON structure specs (TODO)
└── examples/
    ├── EXAMPLES.md              # Annotated examples (TODO)
    └── EDGE_CASES.md            # Tricky cases and solutions (TODO)
```

**Key Benefit:** Most complex phase becomes progressively disclosed - agent loads rules only when needed.

**Usage in orchestrator prompt:**
```markdown
## Phase 3: LEGO Extraction

Use the LEGO Extraction Skill to process translations.json.

For each seed:
1. Extract pedagogically valuable chunks
2. Classify as BASE, COMPOSITE, or FEEDER
3. Validate forward-derivation
4. Generate componentization for COMPOSITE LEGOs

The skill provides complete decision tree and validation logic.
```

**Token savings:** ~15KB → ~400 bytes (97% reduction)

---

### 3. basket-generation-skill

**Status:** 📋 Planned

**Purpose:** Generate practice baskets with d-phrases and e-phrases

**Planned Structure:**
```
basket-generation-skill/
├── SKILL.md
├── D_PHRASE_LOGIC.md
├── E_PHRASE_LOGIC.md
├── SCHEMAS.md
└── examples/EXAMPLES.md
```

---

### 4. basket-deduplication-skill

**Status:** 📋 Planned

**Purpose:** Deduplicate baskets and create provenance map

**Planned Structure:**
```
basket-deduplication-skill/
├── SKILL.md
├── DEDUPLICATION_LOGIC.md
├── PROVENANCE_MAPPING.md
└── schemas/SCHEMAS.md
```

---

### 5. pedagogical-translation-skill

**Status:** 📋 Planned

**Purpose:** Translate seeds using 6 pedagogical heuristics

**Planned Structure:**
```
pedagogical-translation-skill/
├── SKILL.md
├── HEURISTICS.md (6 translation principles)
├── EXAMPLES.md
└── schemas/SCHEMAS.md
```

## Progressive Disclosure in Action

### Example: Agent Processing Phase 3

**Step 1: Agent reads SKILL.md**
```markdown
# LEGO Extraction Skill

Purpose: Extract BASE/COMPOSITE/FEEDER LEGOs

Quick Reference:
- BASE: Atomic, indivisible
- COMPOSITE: Multi-part, breaks down
- FEEDER: Component of COMPOSITE

See CLASSIFICATION.md for decision tree
```

**Agent thinks:** "I need to classify this chunk. Let me read CLASSIFICATION.md"

---

**Step 2: Agent reads CLASSIFICATION.md**
```markdown
# Classification Rules

Decision Tree:
1. Can it be broken down? → YES: COMPOSITE, NO: BASE
2. Do components have pedagogical value? → YES: Extract feeders
3. See FD_VALIDATION.md for validation logic
```

**Agent thinks:** "This looks like COMPOSITE. Let me validate FD."

---

**Step 3: Agent reads FD_VALIDATION.md**
```markdown
# Forward-Derivation Validation

Test: Does known naturally derive from target?
1. "Estoy intentando" → "I'm trying" ✅
2. "I'm trying" is natural English ✅
3. Passes FD ✅

See COMPONENTIZATION.md for how to explain breakdown
```

**Agent thinks:** "FD passes. Now I need componentization."

---

**Step 4: Agent reads COMPONENTIZATION.md**
```markdown
# Componentization Guide

Format: {known} = {target}, where {k1} = {t1} and {k2} = {t2}

Example:
"I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
```

**Agent thinks:** "Got it. I can now write the LEGO."

---

**Total loaded:** ~14KB (only what was needed)

**Without Skills:** Would load all 15KB upfront, even if not all sections are needed

## How to Use Skills in Orchestrator Prompts

### Before (APML Registry)

```markdown
## Phase 3: LEGO Extraction

You are extracting pedagogically optimal LEGO pairs from translations.

CLASSIFICATION RULES:
- BASE LEGO: atomic, indivisible chunk
  - Single word or fixed expression
  - Cannot be meaningfully broken down
  - Examples: "Hola" → "Hello", "la" → "the"

- COMPOSITE LEGO: multi-part chunk
  - Contains multiple meaningful components
  - Each component has pedagogical value
  - Examples: "Estoy intentando" → "I'm trying"
  - MUST include componentization field
  - MUST extract FEEDERs

- FEEDER: component of COMPOSITE
  - Extracted from COMPOSITE parent
  - Has parent_lego_id
  - Examples: "Estoy" → "I'm" (from S0002L01)

FORWARD-DERIVATION VALIDATION:
[... 3KB of FD rules ...]

COMPONENTIZATION GUIDELINES:
[... 2KB of componentization examples ...]

QUALITY HEURISTICS:
[... 4KB of quality rules ...]

DATA SCHEMA:
[... 2KB of JSON specs ...]

EXAMPLES:
[... 5KB of examples ...]

Now, process translations.json...
```

**Total: ~15KB loaded into every agent**

---

### After (Skills)

```markdown
## Phase 3: LEGO Extraction

Use the **LEGO Extraction Skill** to process translations.json.

Course: ${courseCode}
Input: translations.json
Output: LEGO_BREAKDOWNS_COMPLETE.json

The skill provides:
- BASE/COMPOSITE/FEEDER classification logic
- Forward-derivation validation rules
- Componentization guidelines
- Quality heuristics
- Complete schemas and examples

Process each seed and extract all pedagogically valuable LEGOs.
```

**Total: ~400 bytes in prompt**

Agent loads skill files progressively as needed.

## Bundled Scripts: The Killer Feature

### Example: Phase 6 Introductions

**Without Skills:**
```markdown
## Phase 6: Introductions

Generate introductions for each LEGO.

For each LEGO in LEGO_BREAKDOWNS_COMPLETE.json:
1. Check if it's in provenance map (skip if duplicate)
2. Get seed context from translations.json
3. Generate introduction_text:
   - Format: "The {lang} for {known}, as in {context}, is: {target}"
   - If COMPOSITE, append componentization
   - If feeder mentioned in componentization is duplicate, add "(you know already)"
4. Write to introductions.json

[... 5KB of detailed logic, examples, edge cases ...]

Now implement this...
```

Agent must **read logic, understand it, implement it** (slow, error-prone)

---

**With Skills + Bundled Script:**

```markdown
## Phase 6: Introductions

Use the **Introductions Skill**.

The skill includes a bundled script at:
`skills/introductions-skill/scripts/generate-introductions.cjs`

Run:
```bash
cd vfs/courses/${courseCode}
node ../../../skills/introductions-skill/scripts/generate-introductions.cjs .
```

The script handles all logic:
- Provenance awareness
- Seed context extraction
- Componentization inclusion
- "you know already" annotations

Verify output quality using skill's validation checklist.
```

**Agent:** Runs script directly (fast, consistent, correct)

**Bundled script is NOT loaded into context** - it executes in bash!

## Skills Filesystem Structure

```
skills/
├── README.md (this file)
│
├── introductions-skill/              ✅ COMPLETE
│   ├── SKILL.md
│   ├── GENERATION_LOGIC.md
│   ├── schemas/SCHEMAS.md
│   ├── examples/EXAMPLES.md
│   └── scripts/generate-introductions.cjs
│
├── lego-extraction-skill/            🚧 IN PROGRESS
│   ├── SKILL.md                      ✅
│   ├── rules/
│   │   ├── CLASSIFICATION.md         ✅
│   │   ├── FD_VALIDATION.md          ✅
│   │   ├── COMPONENTIZATION.md       ✅
│   │   └── QUALITY_HEURISTICS.md     📋 TODO
│   ├── schemas/SCHEMAS.md            📋 TODO
│   └── examples/
│       ├── EXAMPLES.md               📋 TODO
│       └── EDGE_CASES.md             📋 TODO
│
├── basket-generation-skill/          📋 PLANNED
├── basket-deduplication-skill/       📋 PLANNED
└── pedagogical-translation-skill/    📋 PLANNED
```

## Benefits Summary

### 1. Token Efficiency
- **90% reduction** in prompt size
- Prompts: 15KB → 400 bytes
- Progressive disclosure loads only what's needed
- Bundled scripts execute without loading into context

### 2. Perfect Consistency
- Canonical methodology in one place
- All agents use exact same rules
- Update skill → all courses benefit
- No prompt drift across phases

### 3. Maintainability
- Edit CLASSIFICATION.md → all LEGO extraction updated
- No need to regenerate APML registry
- Version control on methodology
- Clear documentation structure

### 4. Modularity
- Each skill is self-contained
- Easy to test individual skills
- Can be used independently
- Composable for complex workflows

### 5. Developer Experience
- Clear, scannable documentation
- Progressive disclosure matches learning curve
- Examples alongside rules
- Schemas separate from logic

## Migration Path

### Phase 1: Prototype Skills ✅ (Current)
- [x] Create `introductions-skill` (complete)
- [x] Create `lego-extraction-skill` (core structure)
- [x] Demonstrate progressive disclosure pattern

### Phase 2: Complete LEGO Extraction Skill
- [ ] Add QUALITY_HEURISTICS.md
- [ ] Add SCHEMAS.md
- [ ] Add EXAMPLES.md with annotated good/bad cases
- [ ] Add EDGE_CASES.md for tricky scenarios

### Phase 3: Create Remaining Skills
- [ ] `basket-generation-skill`
- [ ] `basket-deduplication-skill`
- [ ] `pedagogical-translation-skill`

### Phase 4: Update Automation Server
- [ ] Replace APML prompts with skill invocations
- [ ] Update orchestrator brief to reference skills
- [ ] Test end-to-end with 30-seed course
- [ ] Deploy to production

### Phase 5: Optimization
- [ ] Bundle more scripts where applicable
- [ ] Add validation scripts to skills
- [ ] Create skill testing framework
- [ ] Document skill authoring guidelines

## Testing Skills

### Manual Test: Introductions Skill

```bash
# 1. Navigate to test course
cd vfs/courses/spa_for_eng_30seeds

# 2. Run bundled script
node ../../../skills/introductions-skill/scripts/generate-introductions.cjs .

# 3. Verify output
cat introductions.json | jq '.introductions | length'
# Should show: 105 (Spanish 30-seed course)

# 4. Check quality
node ../../../skills/introductions-skill/scripts/validate-introductions.cjs introductions.json
```

### Agent Test: LEGO Extraction Skill

```markdown
Claude, use the LEGO Extraction Skill to process this translation:

Seed: "Estoy intentando" → "I'm trying"

Extract all LEGOs and validate FD.
```

Expected output:
```json
{
  "lego_pairs": [
    {
      "lego_id": "S0002L01",
      "lego_type": "COMPOSITE",
      "target_chunk": "Estoy intentando",
      "known_chunk": "I'm trying",
      "componentization": "I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
    }
  ],
  "feeder_pairs": [
    {
      "feeder_id": "S0002F01",
      "target_chunk": "Estoy",
      "known_chunk": "I'm",
      "parent_lego_id": "S0002L01"
    },
    {
      "feeder_id": "S0002F02",
      "target_chunk": "intentando",
      "known_chunk": "trying",
      "parent_lego_id": "S0002L01"
    }
  ]
}
```

## Next Steps

1. **Review prototype skills** - Ensure structure and content quality
2. **Complete LEGO Extraction Skill** - Add remaining documentation
3. **Create basket skills** - Follow same pattern
4. **Update automation_server.cjs** - Replace APML prompts with skill invocations
5. **Test end-to-end** - Run 30-seed course generation with skills
6. **Deploy to production** - Update v7.6 pipeline

## Questions?

- How do skills affect agent performance? → Progressive disclosure is faster
- Can skills be shared across projects? → Yes, they're filesystem-based
- How do we version skills? → Git-based versioning like any code
- What about skill updates mid-generation? → Filesystem ensures consistency
- Can skills call other skills? → Yes, via references in SKILL.md

---

**Skills = Canonical Methodology + Progressive Disclosure + Bundled Execution**

This is the future of SSi course production automation.
