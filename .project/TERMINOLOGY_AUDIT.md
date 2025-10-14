# TERMINOLOGY AUDIT

**Date**: 2025-10-14
**Purpose**: Identify and reconcile ALL terminology before dashboard updates

---

## THE PROBLEM

The APML mixes **two layers of terminology**:
1. **Technical/Architecture layer**: "amino acids", "VFS", "UUID", "provenance"
2. **Domain/Business layer**: "SEED_PAIR", "LEGO_PAIR", "LEGO_BASKET"

The dashboard currently uses BOTH inconsistently, confusing users.

---

## WHAT'S IN THE APML (Current State)

### Variable Registry Section (Lines 200-224)

**"Amino Acids" Metaphor**:
```
PURPOSE: Immutable components with deterministic UUIDs
DEFINITION: Each phase output is an "amino acid"
```

**VFS Directory Structure**:
```
amino_acids/translations/
amino_acids/legos/
amino_acids/legos_deduplicated/
amino_acids/baskets/
amino_acids/introductions/
```

### In Phase Prompts (Throughout Document)

**SEED_PAIR** (appears 11 times):
- Line 614: "NOTE it for SEED_PAIR revision"
- Line 655: "search ALL other SEED_PAIRS in batch"
- Line 869: "Break each SEED_PAIR into LEGO chunks"
- Line 1036: "Read ALL SEED_PAIRS from: SEED_PAIRS_COMPLETE.json"
- Line 1759: "SeedVisualizer.vue (seed pair visualization)"

**lego_pairs** (appears 3 times):
- Line 811: `"lego_pairs": [`
- Line 1074: `"lego_pairs": [`

**LEGO basket** (appears ~20 times):
- Line 1306: "LEGO #1: NO vocabulary available = empty basket"
- Line 1376: "20 LEGOs per basket"
- Line 1588: "All LEGOs assigned to baskets"

---

## USER'S STATED TERMINOLOGY

From user quote: "there are really only 3 things I'm interested in":

1. **SEED_PAIRS** - Phase 1 translations (canonical → target + known)
2. **LEGO_PAIRS** - Phase 3 extracted teaching units
3. **LEGO_BASKETS** - Phase 5 lesson groupings

---

## TERMINOLOGY RECONCILIATION

### Layer 1: Domain Concepts (USER-FACING)
**What users/Claude should see and use:**

| **Concept** | **Singular** | **Plural** | **Phase** | **Definition** |
|-------------|--------------|------------|-----------|----------------|
| Translation | SEED_PAIR | SEED_PAIRS | Phase 1 | Pedagogically optimized translation of a canonical seed into target + known languages |
| Teaching Unit | LEGO_PAIR | LEGO_PAIRS | Phase 3 | Forward-deterministic teaching phrase extracted from SEED_PAIR |
| Lesson Group | LEGO_BASKET | LEGO_BASKETS | Phase 5 | Collection of ~20 LEGO_PAIRS with practice phrases |

### Layer 2: Technical Architecture (INTERNAL)
**Implementation details (stay in code, not in UI):**

| **Concept** | **Purpose** | **Where Used** |
|-------------|-------------|----------------|
| Amino Acid | Immutable component with deterministic UUID | VFS storage, provenance system |
| VFS | Virtual File System for organized storage | Directory structure |
| UUID | Content-addressed identifier | File naming |
| Provenance | S{seed}L{position} birth-parent tracking | LEGO metadata |

---

## INCONSISTENCIES FOUND

### 1. APML Variable Registry (Lines 205-210)
**Problem**: Uses "amino acids" as the primary concept definition
**Should Be**: Amino acids are an implementation detail, not the domain concept

### 2. Directory Structure (Lines 217-221)
**Current**: `amino_acids/translations/`, `amino_acids/legos/`, `amino_acids/baskets/`
**Dashboard Shows**: User sees "Translations", "LEGOs", "Baskets"
**Should Show**: User sees "SEED_PAIRS", "LEGO_PAIRS", "LEGO_BASKETS"

### 3. API Response Field Names
**Current**: `course.amino_acids.translations`, `course.amino_acids.legos_deduplicated`
**Should Be**: `course.seed_pairs`, `course.lego_pairs`, `course.lego_baskets`

### 4. Mixed Usage in Prompts
**Current**: Prompts use "SEED_PAIR" but output says "translation amino acids"
**Should Be**: Consistent domain terminology throughout

---

## QUESTIONS FOR USER

### 1. Is the 3-concept model complete?

**You said**: "there are really only 3 things I'm interested in: SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS"

**But the APML also has**:
- Phase 0: Corpus Intelligence
- Phase 2: FCFS Intelligence
- Phase 3.5: LEGO Graph
- Phase 4: Deduplication
- Phase 6: Introductions

**Question**: Are these 3 additional outputs important to track, or are they just intermediate artifacts?

### 2. Should "Introductions" be renamed?

**Current**: Phase 6 outputs are called "Introductions"
**Pattern suggests**: Should these be "LEGO_INTROS" or similar?

### 3. What about the INPUT (canonical seeds)?

**Current**: Input file is `canonical_seeds.json` (668 seeds)
**Should this be**: `CANONICAL_SEED_PAIRS.json`? Or just "seeds"?

### 4. Singular vs Plural?

**Your usage**: "SEED_PAIRS" (plural), "LEGO_PAIRS" (plural), "LEGO_BASKETS" (plural)

**Question**: When referring to one item, do we say:
- "a SEED_PAIR" (keeps plural form)
- "a SEED PAIR" (singular form)
- "SEED_PAIR #42" (keeps underscore)

### 5. Should "amino acids" stay in the APML at all?

**Option A**: Remove entirely - just an implementation detail, not needed in spec
**Option B**: Keep but clearly label as "technical layer" vs "domain layer"
**Option C**: Your preference?

---

## PROPOSED TERMINOLOGY STANDARD

### For APML Specification:

**Domain Concepts Section** (what users think about):
```yaml
SEED_PAIR:
  DEFINITION: Pedagogically optimized translation of canonical seed
  FORMAT: { canonical, target, known, metadata }
  PHASE: Phase 1
  COUNT: 668 per course

LEGO_PAIR:
  DEFINITION: Forward-deterministic teaching unit
  FORMAT: { target, known, provenance, metadata }
  PHASE: Phase 3
  COUNT: ~2000-3000 per course

LEGO_BASKET:
  DEFINITION: Lesson grouping of ~20 LEGO_PAIRS with practice phrases
  FORMAT: { lego_manifest[], e_phrases[], d_phrases[] }
  PHASE: Phase 5
  COUNT: ~100-150 per course
```

**Technical Architecture Section** (implementation details):
```yaml
STORAGE:
  VFS_ROOT: vfs/courses/{course_code}/
  DIRECTORIES:
    - amino_acids/translations/ (stores SEED_PAIRS as immutable JSON)
    - amino_acids/legos_deduplicated/ (stores LEGO_PAIRS as immutable JSON)
    - amino_acids/baskets/ (stores LEGO_BASKETS as immutable JSON)

IMMUTABILITY: All outputs are "amino acids" - content-addressed, immutable components
UUID_GENERATION: hash(content + metadata) ensures deterministic IDs
PROVENANCE: S{seed}L{position} tracks birth-parent relationships
```

### For Dashboard UI:

**Labels to Show**:
- "SEED_PAIRS: 668"
- "LEGO_PAIRS: 2341"
- "LEGO_BASKETS: 120"

**Labels to NEVER Show**:
- ~~"Amino Acids"~~ (implementation detail)
- ~~"Translations"~~ (ambiguous)
- ~~"LEGOs"~~ (informal)
- ~~"Baskets"~~ (unclear what it contains)

---

## RECOMMENDED ACTIONS

**IF user confirms the 3-concept model**:

1. **Update APML Variable Registry** (lines 200-224)
   - Move "Amino Acids" to "Technical Architecture" section
   - Add "Domain Concepts" section with SEED_PAIR, LEGO_PAIR, LEGO_BASKET

2. **Create Glossary** in APML
   - Clear definitions of all 3 concepts
   - Examples for each
   - Relationship diagram

3. **Update API Responses**
   - Add computed fields: `seed_pairs`, `lego_pairs`, `lego_baskets`
   - Keep internal `amino_acids` structure for storage

4. **Update Dashboard UI**
   - CourseBrowser.vue: Use SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS
   - CourseEditor.vue: Use domain terminology
   - All visualizers: Use domain terminology

5. **Update Phase Prompts**
   - Consistent use of SEED_PAIR (not "translation")
   - Consistent use of LEGO_PAIR (not "lego" or "teaching phrase")
   - Consistent use of LEGO_BASKET (not "basket" or "lesson")

---

## AWAITING USER CONFIRMATION

**Please confirm or correct**:
1. ✅ The 3 core concepts are: SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS
2. ❓ Introductions, Intelligence, Graph - track these or ignore?
3. ❓ Singular form: "SEED_PAIR #42" or "SEED PAIR #42"?
4. ❓ Should "amino acids" stay in APML as technical layer?
5. ❓ Any other concepts missing from your mental model?

Once confirmed, I'll create a complete glossary and update plan.
