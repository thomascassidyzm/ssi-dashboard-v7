# LEGO_BASKET Generation Instructions for Claude Code Web

## Mission
Generate practice phrase baskets (LEGO_BASKETs) for Spanish language learning course seeds S0001-S0030.

## CRITICAL ORIENTATION
**KNOWN → TARGET = English → Spanish**

All LEGOs and practice phrases MUST follow this structure:
```json
["English (known)", "Spanish (target)"]
```

Learner sees **English** prompt → produces **Spanish** response.

---

## Input Files Available

1. **spa_for_eng_30_seed_pairs.json** - All 668 seed pairs
2. **lego_extraction_s0001-s0010_HANDCRAFTED_v1.json** - Handcrafted LEGO extractions for S0001-S0010
3. **lego_extraction_s0011-s0020_HANDCRAFTED_v1.json** - Handcrafted LEGO extractions for S0011-S0020

---

## Output Requirements

Generate one JSON file per seed:
- `lego_baskets_s0001.json`
- `lego_baskets_s0002.json`
- ... through ...
- `lego_baskets_s0030.json`

---

## LEGO_BASKET Schema

```json
{
  "version": "generative_v1",
  "seed": "S0001",
  "course_direction": "Spanish for English speakers",
  "mapping": "KNOWN (English) → TARGET (Spanish)",
  "seed_pair": {
    "known": "I want to speak Spanish with you now.",
    "target": "Quiero hablar español contigo ahora."
  },
  "pattern_introduced": "P01: Quiero + infinitive",
  "cumulative_patterns": ["P01"],
  "cumulative_legos": 5,

  "S0001L01": {
    "lego": ["I want", "Quiero"],
    "type": "B",
    "available_legos": 3,
    "available_patterns": ["P01"],
    "practice_phrases": [
      ["I want", "Quiero", null, 1],
      ["I want to speak", "Quiero hablar", "P01", 2],
      ["I want to speak Spanish", "Quiero hablar español", "P01", 3],
      ["I want to speak Spanish with you", "Quiero hablar español contigo", "P01", 4]
    ]
  }
}
```

### Practice Phrase Format
Each phrase: `[english, spanish, pattern_code_or_null, lego_count]`

---

## CRITICAL: What Gets a LEGO_BASKET?

**ONLY create baskets for LEGOs with sensible KNOWN→TARGET mapping.**

### ✓ CREATE BASKET:
- "I want" → "Quiero" (FD, standalone useful)
- "to speak" → "hablar" (FD, standalone useful)
- "Spanish" → "español" (FD, standalone useful)
- "I'd like" → "Me gustaría" (M-LEGO, FD, standalone useful)
- "a little Spanish" → "un poco de español" (M-LEGO, meaningful chunk)

### ✗ DON'T CREATE BASKET:
- "me" → "me" (not standalone useful, just a component)
- "the" → "el" (NOT FD - could be el/la/los/las)
- "very" → "muy" (needs context, not standalone)
- "that" → "que" (not FD, triggers subjunctive - just component)
- "as" → "tan" (needs construction like "tan...como")

**Rule:** If you can't give the English to a learner and expect them to produce meaningful Spanish, DON'T create a basket.

---

## Practice Phrase Generation Algorithm

### Structure Requirements:
1. **First 2 phrases:** New LEGO + 1 previous LEGO (minimal pairs)
2. **Middle phrases (3-6):** Systematically cover ALL applicable patterns
3. **Last 4-5 phrases:** Expansive (5-6 LEGOs, 7-10 words)
4. **Total:** ~10 phrases (8-12 acceptable if quality warrants)

### Step-by-Step Process:

#### Step 1: Generate Minimal Pairs (2-3 phrases)
- New LEGO standalone
- New LEGO + 1 high-frequency previous LEGO
- Keep it simple

Example for "poder" (to be able to):
```json
["to be able to", "poder", null, 1],
["to be able to speak", "poder hablar", null, 2],
["I want to be able to", "Quiero poder", "P01", 2]
```

#### Step 2: Pattern Coverage (N phrases where N = number of applicable patterns)
For each available pattern, generate:
- New LEGO in that pattern with minimal vocabulary

Example for "poder" with patterns P01, P03:
```json
["I want to be able to speak", "Quiero poder hablar", "P01", 3],
["I'm going to be able to speak", "Voy a poder hablar", "P03", 4]
```

**Pattern Compatibility Check:**
- NOT all patterns work with all LEGOs
- Example: "Estoy pudiendo" (I'm being able to) = UNNATURAL Spanish
- Filter out grammatically invalid pattern applications

#### Step 3: High-Frequency Expansions (4-5 phrases)
Combine new LEGO + pattern + high-frequency vocabulary:

**High-frequency tier list:**
- Tier 1: español, contigo, ahora, hoy, mañana
- Tier 2: hablar, aprender, practicar
- Tier 3: alguien, algo, más

Example:
```json
["I want to be able to speak Spanish", "Quiero poder hablar español", "P01", 4],
["I want to be able to speak Spanish with you", "Quiero poder hablar español contigo", "P01", 5],
["I'm going to be able to practice Spanish with you now", "Voy a poder practicar español contigo ahora", "P03", 6]
```

#### Step 4: Sort by LEGO Count
Always sort final phrases shortest → longest (by lego_count)

---

## Cumulative Inventory Tracking

**CRITICAL:** Each seed can ONLY use LEGOs and patterns from previous seeds + current seed.

### Example Progression:

**S0001:**
- Patterns: ["P01"]
- LEGOs: 5
- S0001L01 has 1 LEGO available
- S0001L05 has 5 LEGOs available

**S0002:**
- Patterns: ["P01", "P02"]
- LEGOs: 8 (cumulative from S0001 + new from S0002)
- S0002L01 has 6 LEGOs available (all from S0001 + first new)
- S0002L03 has 8 LEGOs available

**S0005:**
- Patterns: ["P01", "P02", "P03"]
- LEGOs: 19
- Each new LEGO can combine with all 19 LEGOs and all 3 patterns

This creates **combinatoric explosion** as course progresses.

---

## Pattern Definitions (Reference)

From handcrafted extractions:

- **P01:** Quiero + infinitive (I want to...)
- **P02:** Estoy + gerund (I'm ...ing)
- **P03:** Voy a + infinitive (I'm going to...)
- **P04:** Me gustaría + infinitive (I'd like to...)
- **P05:** Simple present tense (I speak, you speak)
- **P06:** No estoy seguro (I'm not sure)
- **P10:** Quiero que + subjunctive (I want you to...)
- **P12:** Question words (cómo, qué, etc.)
- **P18:** Puedo + infinitive (I can...)

---

## Quality Filters

### MUST Remove:
1. Duplicates
2. Phrases with LEGO repetition ("Quiero quiero")
3. Unnatural constructions ("Estoy pudiendo")
4. Phrases using LEGOs not yet taught (GATE violation)
5. Phrases exceeding 10 words
6. Nonsensical combinations ("I want how" → "Quiero cómo")

### MUST Include:
1. At least 2 minimal pairs
2. 100% pattern coverage (all applicable patterns represented)
3. At least 4 expansive phrases (5-6 LEGOs)
4. Natural, grammatically correct Spanish
5. Meaningful English prompts

---

## Workflow for Parallel Execution

### Option 1: Sequential (Safe)
1. Generate S0001 → track cumulative inventory
2. Generate S0002 → track cumulative inventory
3. Continue through S0030

### Option 2: Parallel (Faster, Riskier)
1. Spin up 3 agents:
   - Agent A: S0001-S0010
   - Agent B: S0011-S0020
   - Agent C: S0021-S0030
2. Each agent reads handcrafted extractions
3. Each agent maintains cumulative inventory from their range
4. Monitor for consistency

**Recommendation:** Use Option 1 to ensure cumulative inventory consistency.

---

## Success Criteria

For each seed's baskets:
- ✓ All LEGOs use KNOWN→TARGET orientation (English→Spanish)
- ✓ Only actual LEGOs have baskets (sensible standalone mapping)
- ✓ ~10 practice phrases per LEGO
- ✓ Pattern coverage 100%
- ✓ Natural Spanish (grammatically correct)
- ✓ GATE compliance (only uses previously taught LEGOs)
- ✓ Sorted shortest→longest
- ✓ Progressive complexity (simple→complex)

---

## Example of Complete LEGO_BASKET

See `lego_baskets_s0001_CORRECT.json` for a complete reference implementation.

---

## Notes

- S0021-S0030 don't have handcrafted extractions yet - you'll need to extract LEGOs from seed_pairs.json following the same methodology as S0001-S0020
- When in doubt about whether something is a LEGO: Ask "Can I give an English speaker this English phrase and expect them to produce useful Spanish?" If no → not a LEGO
- Quality over quantity: 10 excellent phrases > 20 mediocre ones
- When pattern application seems weird, skip it (e.g., "Estoy pudiendo" is grammatically bizarre in Spanish)

---

## Output Location

Save all generated files to: `./output/`

Create this directory if it doesn't exist.

---

## Questions?

If anything is unclear, generate S0001 first and compare against the reference. If it matches the schema and orientation, proceed with the rest.

Good luck! 🚀
