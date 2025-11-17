# LEGO Basket Generation Task

## Task Overview
Generate high-quality practice phrase baskets for Spanish (S0001-S0100) and Chinese (S0001-S0100) courses following strict GATE compliance and quality standards.

## Execution Constraints
- **NO scripts** - all work done manually
- **NO agents** - no spawning of Task agents
- **Steady, slow, brilliant work** - quality over speed
- **Quality checkpoint every 10 SEEDs** - thorough review before proceeding

## Process

### Generation Workflow
1. Read SEED data from `lego_pairs.json`
2. Build GATE compliance whitelist (exact forms only from all previous LEGOs)
3. Generate 8-10 practice phrases per LEGO following distribution rules
4. Validate each phrase for GATE compliance, completeness, naturalness
5. Save basket to appropriate folder
6. Mark todo as complete

### Quality Checkpoint (Every 10 SEEDs)
After completing each set of 10 SEEDs:
1. Review all 10 basket files thoroughly
2. Check GATE compliance - verify no untaught words used
3. Check phrase distribution - 2 short, 2 quite short, 2 longer, 4 long
4. Check naturalness - would a real person say these?
5. Check conjunction usage - only if taught, 20-40% when available
6. Check pattern variety - not overdoing any single pattern
7. Check final LEGO - includes complete seed sentence
8. Only proceed to next 10 after satisfied with quality

## Phase Intelligence Documentation

### Location
`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/phase_intelligence/phase_5_conversational_baskets_v3_ACTIVE.md`

### Key Rules
1. **GATE Compliance (Exact Forms Only)**
   - Every Spanish/Chinese word must be exact form taught in LEGOs
   - NO conjugations, NO derivations
   - Zero tolerance - one untaught form = reject phrase

2. **Completeness (Context Dependent)**
   - First 2 phrases (1-2 LEGOs): Fragments OK
   - Remaining phrases: Must be complete standalone thoughts

3. **Naturalness (Would-Say Test)**
   - Natural grammar and word order
   - Something useful in real conversation
   - Quality over quantity

### Conjunctions
- Only available AFTER taught as LEGOs
- Use naturally: 2-4 phrases per 10 (20-40%)
- Don't overdo

### Distribution Target (per 10 phrases)
- 2 short (1-2 LEGOs) - fragments OK
- 2 quite short (3 LEGOs) - complete thoughts
- 2 longer (4-5 LEGOs) - pattern combinations
- 4 long (6+ LEGOs, avg 7-10 words) - conversational gold

### Pattern & Vocabulary Priority
- Focus on 5 previous SEEDs for patterns and vocab
- Don't overdo any single pattern
- Natural variety

## Course Folders

### Spanish Course
- **Source**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/lego_pairs.json`
- **Output**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/baskets/lego_baskets_s00XX.json`
- **Reference**: `lego_baskets_s0011.json` (exemplary basket)

### Chinese Course
- **Source**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng/lego_pairs.json`
- **Output**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng/baskets/lego_baskets_s00XX.json`

## Output Format
Match S0011.json structure exactly:
```json
{
  "version": "curated_v7_spanish",
  "seed": "S00XX",
  "course_direction": "Spanish for English speakers",
  "mapping": "KNOWN (English) → TARGET (Spanish)",
  "seed_pair": {
    "known": "...",
    "target": "..."
  },
  "patterns_introduced": "...",
  "cumulative_patterns": [...],
  "cumulative_legos": N,

  "S00XXL01": {
    "lego": ["known", "target"],
    "type": "A/B/C/M",
    "available_legos": N,
    "available_patterns": [...],
    "practice_phrases": [
      ["known phrase", "target phrase", "pattern_or_null", lego_count],
      ...
    ],
    "phrase_distribution": {
      "really_short_1_2": N,
      "quite_short_3": N,
      "longer_4_5": N,
      "long_6_plus": N
    },
    "pattern_coverage": "...",
    "full_seed_included": "YES/NO - ...",
    "gate_compliance": "STRICT - ..."
  }
}
```

## Task Execution Plan

### Spanish: S0001-S0100
- **S0001-S0010**: ✅ COMPLETED - checkpoint passed
- **S0011**: ✅ COMPLETED - already exists (exemplary)
- **S0012-S0020**: ✅ COMPLETED - checkpoint passed
- **S0021-S0030**: PENDING - generate + checkpoint
- **S0031-S0040**: PENDING - generate + checkpoint
- **S0041-S0050**: PENDING - generate + checkpoint
- **S0051-S0060**: PENDING - generate + checkpoint
- **S0061-S0070**: PENDING - generate + checkpoint
- **S0071-S0080**: PENDING - generate + checkpoint
- **S0081-S0090**: PENDING - generate + checkpoint
- **S0091-S0100**: PENDING - generate + checkpoint

### Chinese: S0001-S0100
- All pending after Spanish completion

## Quality Indicators
- ✅ No GATE violations
- ✅ All phrases natural and useful
- ✅ Proper distribution maintained
- ✅ Final LEGO includes seed sentence
- ✅ Pattern variety present
- ✅ Recent vocabulary prioritized
- ✅ Conjunctions used appropriately (when available)

## Current Status
**Working on**: Spanish S0021-S0030
**Last checkpoint**: S0020 (passed)
**Next checkpoint**: After S0030

---

**REMEMBER**: Slow, steady, brilliant work. Quality checkpoint every 10 SEEDs. No shortcuts.
