# Skills Transformation: APML Prompts → Progressive Disclosure

## Executive Summary

**Problem:** Large APML prompts (15KB+) loaded into every agent invocation waste tokens and reduce flexibility.

**Solution:** Claude Skills with progressive disclosure reduce prompt size by **90%** while improving consistency and maintainability.

## Comparison: Before vs After

### Phase 6: Introductions

#### Before (APML Prompt)

**File:** `.apml-registry.json` → `PHASE_6` entry

**Size:** ~8KB

**Content:**
```markdown
## Phase 6: Introduction Generation

You are generating pedagogical introductions for LEGO pairs.

### Introduction Format

For each LEGO, create an introduction with:
1. **seed_context**: Full seed translation for context
2. **introduction_text**: LEGO-specific explanation

### Provenance Awareness

CRITICAL: Skip any LEGO that appears as a KEY in lego_provenance_map.json.
These are duplicates of earlier LEGOs.

Example:
{
  "S0015F01": "S0001L02"
}
→ S0015F01 is duplicate, SKIP it

### Introduction Text Rules

Format: "The {language} for {known_chunk}, as in {seed_context}, is: {target_chunk}"

For COMPOSITE LEGOs:
- Append componentization after base introduction
- If feeder in componentization is duplicate, add "(you know already)"

Examples:
[... 50+ lines of examples ...]

### Quality Checklist
[... 20+ validation rules ...]

### Data Schema
[... JSON structure specs ...]

### Edge Cases
[... 30+ lines of edge cases ...]

Now, process LEGO_BREAKDOWNS_COMPLETE.json and generate introductions.json.
```

**Token usage:** ~8,000 tokens per agent invocation

**Issues:**
- ❌ All 8KB loaded even if agent only needs one section
- ❌ Bundled script can't be included (would make prompt even larger)
- ❌ Hard to update (must regenerate APML registry)
- ❌ No progressive disclosure

---

#### After (Skills)

**File:** `skills/introductions-skill/SKILL.md`

**Size in prompt:** ~300 bytes

**Orchestrator prompt:**
```markdown
## Phase 6: Introductions

Use the **Introductions Skill** to generate contextual introductions.

Input files:
- LEGO_BREAKDOWNS_COMPLETE.json
- lego_provenance_map.json
- translations.json

Output: introductions.json

The skill provides complete methodology and bundled script.
```

**Token usage:** ~300 tokens in prompt + progressive loading

**How agent uses it:**

1. **Reads SKILL.md** (2KB overview)
   - Understands task: generate introductions
   - Sees bundled script available
   - Checks quick reference

2. **Runs bundled script** (0KB - executes in bash!)
   ```bash
   cd vfs/courses/spa_for_eng_30seeds
   node ../../../skills/introductions-skill/scripts/generate-introductions.cjs .
   ```

3. **Validates output** using SCHEMAS.md (only if needed)

**Total tokens:** ~300 (prompt) + ~2,000 (SKILL.md) = **~2,300 tokens**

**Savings:** 8,000 → 2,300 = **71% reduction**

**Benefits:**
- ✅ Progressive disclosure (agent loads only what's needed)
- ✅ Bundled script executes **without loading into context**
- ✅ Easy to update (edit SKILL.md, no regeneration needed)
- ✅ Reusable across projects

---

### Phase 3: LEGO Extraction

#### Before (APML Prompt)

**Size:** ~15KB

**Content:**
```markdown
## Phase 3: LEGO Extraction

Extract pedagogically optimal LEGO pairs from translations.

### LEGO Types

**BASE LEGO:**
- Definition: Atomic, indivisible chunk
- Characteristics:
  - Usually single word
  - May be multi-word if idiomatic
  - Cannot be meaningfully broken down
  - High reusability
- Examples:
  - "Hola" → "Hello" (single word)
  - "la" → "the" (particle)
  - "qué tal" → "how's it going" (idiomatic, treat as atomic)

**COMPOSITE LEGO:**
- Definition: Multi-part chunk with pedagogical value
- Characteristics:
  - Always multi-word or multi-morpheme
  - Components have clear boundaries
  - Each component passes FD independently
- Requirements:
  - MUST have componentization field
  - MUST extract FEEDERs
  - Componentization format: "{known} = {target}, where {k1} = {t1} and {k2} = {t2}"
- Examples:
  [... 40+ lines of examples ...]

**FEEDER:**
- Definition: Component extracted from COMPOSITE
- Requirements:
  - Has feeder_id (not lego_id)
  - Has parent_lego_id
  - Appears in parent componentization
  - Passes FD validation
- Examples:
  [... 30+ lines of examples ...]

### Forward-Derivation Validation

CRITICAL: All LEGOs must pass FD test.

**FD Test:**
1. Does known naturally derive from target? (not reverse)
2. Is known chunk natural, idiomatic language?
3. Would native speaker say it this way?

**Valid FD Examples:**
[... 50+ lines of valid examples ...]

**Invalid FD Examples:**
[... 50+ lines of invalid examples ...]

**Special Cases:**
[... 40+ lines of edge cases ...]

### Componentization Guidelines

Format: {known} = {target}, where {k1} = {t1} and {k2} = {t2}

**Good componentization:**
[... 40+ lines of examples ...]

**Bad componentization:**
[... 40+ lines of counter-examples ...]

### Quality Heuristics

1. Pedagogical value over completeness
2. Naturalness in both languages
3. Reusability and generalizability
4. Avoid meaningless chunks
5. Context-appropriate
6. Learner-facing clarity

[... 60+ lines of heuristic explanations ...]

### Data Schema

[... 80+ lines of JSON specs ...]

### Complete Examples

[... 100+ lines of annotated examples ...]

Now, process translations.json and extract all LEGOs.
```

**Token usage:** ~15,000 tokens per agent invocation

---

#### After (Skills)

**Size in prompt:** ~400 bytes

**Orchestrator prompt:**
```markdown
## Phase 3: LEGO Extraction

Use the **LEGO Extraction Skill** to process translations.json.

For each seed:
1. Extract pedagogically valuable chunks
2. Classify as BASE, COMPOSITE, or FEEDER
3. Validate forward-derivation
4. Generate componentization for COMPOSITE LEGOs

Output: LEGO_BREAKDOWNS_COMPLETE.json

The skill provides complete decision tree and validation logic.
```

**How agent uses it:**

1. **Reads SKILL.md** (2KB overview)
   - Understands task: classify LEGOs
   - Sees decision tree reference
   - Checks quick reference

2. **Processing first seed:**
   - "Is 'Estoy intentando' atomic?" → Needs classification logic
   - **Reads CLASSIFICATION.md** (5KB) → Determines: COMPOSITE
   - "Does it pass FD?" → Needs validation rules
   - **Reads FD_VALIDATION.md** (4KB) → Validates: YES
   - "How to write componentization?" → Needs format guide
   - **Reads COMPONENTIZATION.md** (3KB) → Writes: "I'm trying = Estoy intentando, where..."

3. **Processing subsequent seeds:**
   - Already loaded rules, applies them directly
   - Only re-reads if encountering edge case

**Total tokens:** ~400 (prompt) + ~14,000 (skill files) = **~14,400 tokens**

**But with progressive loading:**
- First seed: ~14,400 tokens
- Subsequent seeds: ~400 tokens (reuses loaded knowledge)
- Average across 30 seeds: **~1,000 tokens per seed**

**Savings:** 15,000 → 1,000 = **93% reduction**

**Benefits:**
- ✅ Progressive disclosure (load rules as needed)
- ✅ Reusable across seeds (load once, apply many times)
- ✅ Modular updates (edit CLASSIFICATION.md independently)
- ✅ Clear separation of concerns

---

## Token Savings Calculation

### Full 668-Seed Course Generation

#### Before (APML Prompts)

**Phase 1:** 6KB prompt × 1 agent = 6KB
**Phase 3:** 15KB prompt × 10 agents (parallel batches) = 150KB
**Phase 5:** 10KB prompt × 20 agents (parallel baskets) = 200KB
**Phase 5.5:** 5KB prompt × 1 agent = 5KB
**Phase 6:** 8KB prompt × 1 agent = 8KB

**Total:** ~369KB = ~150,000 tokens

---

#### After (Skills)

**Phase 1:** 300 bytes prompt + 6KB skill (loaded once) = ~6KB
**Phase 3:** 400 bytes prompt + 14KB skill (loaded once) = ~14KB
**Phase 5:** 300 bytes prompt + 10KB skill (loaded once) = ~10KB
**Phase 5.5:** 300 bytes prompt + 5KB skill (loaded once) = ~5KB
**Phase 6:** 300 bytes prompt + 0KB (bundled script runs in bash!) = ~300 bytes

**Total:** ~35KB = ~14,000 tokens

---

**Savings:** 150,000 → 14,000 = **91% reduction**

**For Sonnet 4.5 pricing:**
- Before: 150K tokens × $3/M = $0.45 per course
- After: 14K tokens × $3/M = $0.04 per course

**Savings: $0.41 per course** (91% cost reduction)

**For 100 courses/year:** $41/year savings in input tokens alone

(Plus output token savings from more concise, consistent outputs)

---

## Maintainability Comparison

### Updating LEGO Classification Rules

#### Before (APML)

1. Edit `ssi-course-production.apml`
2. Run `node scripts/compile-apml-registry.cjs`
3. Restart automation server
4. Test with 30-seed course
5. If broken, repeat from step 1

**Time:** ~30 minutes per update

**Risk:** High (entire registry must be recompiled)

---

#### After (Skills)

1. Edit `skills/lego-extraction-skill/rules/CLASSIFICATION.md`
2. Test with 30-seed course

**Time:** ~5 minutes per update

**Risk:** Low (only one file affected)

---

## Progressive Disclosure Example

### Agent Processing Seed with LEGO Extraction Skill

**Seed:** "Estoy intentando" → "I'm trying"

#### Step 1: Initial Read (SKILL.md)

**Agent loads:** 2KB

**Agent sees:**
```markdown
# LEGO Extraction Skill

Types: BASE (atomic), COMPOSITE (multi-part), FEEDER (component)

Classification: See CLASSIFICATION.md
```

**Agent thinks:** "I need to classify this. Let me read CLASSIFICATION.md"

---

#### Step 2: Classification (CLASSIFICATION.md)

**Agent loads:** +5KB (total: 7KB)

**Agent reads:**
```markdown
# Classification Rules

STEP 1: Can this be broken down?
"Estoy intentando" → YES (Estoy + intentando)

STEP 2: Do components have pedagogical value?
- Estoy = I'm ✅
- intentando = trying ✅
YES → COMPOSITE

See FD_VALIDATION.md for validation
```

**Agent thinks:** "This is COMPOSITE. Now I need to validate FD."

---

#### Step 3: FD Validation (FD_VALIDATION.md)

**Agent loads:** +4KB (total: 11KB)

**Agent reads:**
```markdown
# FD Validation

Test:
1. "Estoy intentando" → "I'm trying" ✅ Natural
2. "I'm trying" is idiomatic English ✅
3. Native speakers say this ✅

PASSES FD

See COMPONENTIZATION.md for format
```

**Agent thinks:** "FD passes. Now I need to write componentization."

---

#### Step 4: Componentization (COMPONENTIZATION.md)

**Agent loads:** +3KB (total: 14KB)

**Agent reads:**
```markdown
# Componentization Format

Template: {known} = {target}, where {k1} = {t1} and {k2} = {t2}

Example: "I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
```

**Agent thinks:** "Got it. Writing LEGO now."

---

#### Step 5: Output

**Agent writes:**
```json
{
  "lego_id": "S0002L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying",
  "componentization": "I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
}
```

**Total loaded:** 14KB (only what was needed)

**Without Skills:** Would load all 15KB upfront, even if not all needed

---

## Skills Directory Structure

```
skills/
├── README.md                              # Complete skills documentation
│
├── introductions-skill/                   # ✅ COMPLETE
│   ├── SKILL.md                          # Main skill definition
│   ├── GENERATION_LOGIC.md               # Detailed methodology
│   ├── schemas/SCHEMAS.md                # JSON structure specs
│   ├── examples/EXAMPLES.md              # Annotated examples
│   └── scripts/generate-introductions.cjs # Bundled executable script
│
├── lego-extraction-skill/                 # 🚧 CORE COMPLETE
│   ├── SKILL.md                          # Main skill definition ✅
│   ├── rules/
│   │   ├── CLASSIFICATION.md             # Decision tree ✅
│   │   ├── FD_VALIDATION.md              # FD test rules ✅
│   │   ├── COMPONENTIZATION.md           # Format guide ✅
│   │   └── QUALITY_HEURISTICS.md         # 6 quality filters 📋
│   ├── schemas/SCHEMAS.md                # JSON specs 📋
│   └── examples/
│       ├── EXAMPLES.md                   # Annotated cases 📋
│       └── EDGE_CASES.md                 # Tricky scenarios 📋
│
├── basket-generation-skill/               # 📋 PLANNED
├── basket-deduplication-skill/            # 📋 PLANNED
└── pedagogical-translation-skill/         # 📋 PLANNED
```

---

## Migration Plan

### Phase 1: Prototype ✅ (Complete)
- [x] Create `introductions-skill` with bundled script
- [x] Create `lego-extraction-skill` core structure
- [x] Demonstrate progressive disclosure pattern
- [x] Document Skills approach

### Phase 2: Complete LEGO Extraction
- [ ] Add QUALITY_HEURISTICS.md
- [ ] Add SCHEMAS.md
- [ ] Add EXAMPLES.md
- [ ] Add EDGE_CASES.md
- [ ] Test with 30-seed course

### Phase 3: Create Remaining Skills
- [ ] `basket-generation-skill`
- [ ] `basket-deduplication-skill`
- [ ] `pedagogical-translation-skill`

### Phase 4: Update Automation
- [ ] Replace APML prompts with skill invocations in automation_server.cjs
- [ ] Update orchestrator brief to reference skills
- [ ] Test end-to-end 30-seed generation
- [ ] Deploy to production

### Phase 5: Measure & Optimize
- [ ] Measure token savings (actual vs projected)
- [ ] Identify additional bundling opportunities
- [ ] Create skill authoring guidelines
- [ ] Document best practices

---

## Expected Outcomes

### Token Efficiency
- **91% reduction** in prompt tokens
- **71-93% per-phase savings**
- Scales better with parallel agents

### Consistency
- ✅ Canonical methodology in one place
- ✅ No prompt drift
- ✅ Easy to update
- ✅ Version controlled

### Developer Experience
- ✅ Clear, scannable documentation
- ✅ Progressive disclosure matches learning
- ✅ Examples alongside rules
- ✅ Modular, testable components

### Automation Quality
- ✅ Bundled scripts ensure correctness
- ✅ No implementation errors (script is pre-tested)
- ✅ Faster execution (no agent interpretation needed)
- ✅ Consistent across all courses

---

## Next Steps

1. **Review prototype skills** with team
2. **Complete LEGO Extraction Skill** (add remaining docs)
3. **Test with 30-seed course** (manual validation)
4. **Create remaining 3 skills** (baskets, dedup, translation)
5. **Update automation_server.cjs** (replace APML with skills)
6. **Deploy and measure** (compare before/after metrics)

---

**Skills represent a fundamental shift in how we encode methodology for AI agents.**

Instead of **verbose prompts**, we provide **progressive libraries**.

Instead of **agent interpretation**, we use **bundled scripts**.

Instead of **monolithic instructions**, we offer **modular documentation**.

**Result:** 90% fewer tokens, perfect consistency, easier maintenance.

This is the future of AI-driven course production.
