# Phase 6: Introduction Generation

**Version**: 2.1 🔒 **LOCKED**
**Status**: 🔗 **INTEGRATED INTO PHASE 3** (not a separate service)
**Last Updated**: 2025-11-20
**Script**: `scripts/phase6-generate-introductions.cjs`
**Execution**: Runs automatically after Phase 3 LEGO extraction completes (<1 second overhead)
**Server**: Built into `services/phases/phase3-lego-extraction-server.cjs` (port 3458)

---

## ⚠️ IMPORTANT: Execution Model Change

**Phase 6 is no longer a standalone microservice.** As of 2025-11-20, introduction generation is integrated directly into the Phase 3 server and runs automatically after LEGO extraction completes.

**Previous Model** (deprecated):
- Phase 3 → outputs `lego_pairs.json`
- Phase 6 → separate service, reads `lego_pairs.json`, outputs `introductions.json`

**Current Model** (active):
- Phase 3 → outputs `lego_pairs.json` AND `introductions.json` (single phase completion)
- Introduction generation runs immediately after LEGO extraction (<1s overhead)
- No separate Phase 6 service or API endpoint

**Why the change?**
- Introduction generation is fast (<1s) and deterministic
- No benefit to separate service and parallel coordination overhead
- Simpler pipeline: 1 → 3 (includes 6) → 5 → 7 → 8

**For Developers:**
- The methodology below is still used (built into Phase 3 server)
- The script `phase6-generate-introductions.cjs` is still called by Phase 3
- Output file `introductions.json` is still created (same format)

---

## Purpose

Generate natural language presentation text for each LEGO that introduces it to learners. This text is spoken by the course to explain what each language component means and how it fits into the full sentence context.

---

## Core Principles

### 1. **Phase Separation**
- **Phase 3** creates component arrays (DATA)
- **Phase 6** reads those arrays and generates presentation text (EXPLANATIONS)
- Phase 6 should never modify or restructure LEGO data

### 2. **Context is Critical**
Every LEGO presentation must include:
- The known language translation
- The target language form
- **The seed sentence context** ("as in {known_seed}")

Without seed context, learners don't know which usage/meaning is being taught.

### 3. **Type-Specific Presentations**

#### BASE LEGOs (type: B)
Simple introduction format:
```
"Now, the {target_lang} for "{known_lego}" as in "{known_seed}" is "{target_lego}", {target_lego}."
```

Example:
```
"Now, the Spanish for "I want" as in "I want to speak Spanish with you now" is "Quiero", Quiero."
```

#### COMPOSITE LEGOs (type: C)
Detailed breakdown with component explanation:
```
"The {target_lang} for "{known_lego}" as in "{known_seed}" is "{target_lego}" - where {component_explanations}."
```

Component explanations use "means":
- `"{target_part}" means "{known_part}"`

Examples:
```
"The Spanish for "I'm trying" as in "I'm trying to learn" is "Estoy intentando" - where "Estoy" means "I am" and "intentando" means "trying"."

"The Spanish for "as often as possible" as in "how to speak as often as possible" is "lo más frecuentemente posible" - where "lo más" means "the most", "frecuentemente" means "often", and "posible" means "possible"."
```

---

## Input Format

**File**: `vfs/courses/{course_code}/lego_pairs_deduplicated.json` (preferred)
**Fallback**: `vfs/courses/{course_code}/lego_pairs.json`

### LEGO Structure
```json
[
  "S0002L01",                    // LEGO ID
  "C",                           // Type: B=BASE, C=COMPOSITE
  "Estoy intentando",            // Target language LEGO
  "I'm trying",                  // Known language LEGO
  [                              // Components (only for COMPOSITE)
    ["Estoy", "I am"],
    ["intentando", "trying"]
  ]
]
```

Component format: `[[targetPart, knownPart], ...]`

---

## Output Format

**File**: `vfs/courses/{course_code}/introductions.json`

```json
{
  "version": "7.7.0",
  "course": "ita_for_eng_10seeds",
  "target": "ita",
  "known": "eng",
  "generated": "2025-10-23T12:15:44.447Z",
  "introductions": {
    "S0001L01": "Now, the Italian for \"I want\" as in \"I want to speak Italian with you now.\" is \"Voglio\", Voglio.",
    "S0002L01": "The Italian for \"I'm trying\" as in \"I'm trying to learn.\" is \"Sto provando\" - where \"Sto\" is \"I'm\" (which you learned earlier) and \"provando\" is \"trying\" (which you learned earlier)."
  }
}
```

---

## Implementation Rules

### **Seed Context Requirement**
ALWAYS include `"as in \"{known_seed}\""` to provide context. Learners need to know which meaning/usage is being taught.

---

## Validation Checklist

✅ Every LEGO ID has exactly one presentation
✅ All BASE LEGOs (type B) use simple format
✅ All COMPOSITE LEGOs (type C) include component breakdown
✅ All presentations include seed context ("as in...")
✅ Component grammar is correct (and/commas)
✅ Target language name matches course metadata
✅ Known language name matches course metadata

---

## Anti-patterns

❌ **Don't embed LEGO structure in presentation**
Bad: "The first component is..."
Good: Just explain what the components mean

❌ **Don't skip seed context**
Bad: "The Italian for 'I want' is 'Voglio'"
Good: "The Italian for 'I want' as in 'I want to speak Italian with you now.' is 'Voglio'"

❌ **Don't explain Phase 3 decisions**
Phase 6 just presents what Phase 3 created, it doesn't justify or explain why something is a LEGO

❌ **Don't generate new LEGOs**
Phase 6 only creates presentations for existing LEGOs from Phase 3

---

## Language Name Mapping

```javascript
const LANGUAGE_NAMES = {
  'ita': 'Italian',
  'spa': 'Spanish',
  'fra': 'French',
  'cmn': 'Mandarin',
  'cym': 'Welsh',
  'gle': 'Irish',
  'eus': 'Basque',
  'mkd': 'Macedonian',
  'eng': 'English'
};
```

---

## Example Output Statistics

**Test Course**: `ita_for_eng_10seeds`
- 63 total introductions generated
- 54 BASE LEGOs (simple format)
- 9 COMPOSITE LEGOs (component breakdown)

---

## Version History

### v2.1 (2025-11-20) 🔒 **LOCKED**
- **Execution model change**: Integrated into Phase 3 server (no longer separate service)
- **Automatic execution**: Runs immediately after LEGO extraction (<1s overhead)
- **Output unchanged**: Still generates `introductions.json` in same format
- **Pipeline simplification**: Removes need for parallel coordination with Phase 5
- **Methodology preserved**: All generation rules remain identical

### v2.0 (2025-10-28) 🔒 **LOCKED**
- **Simplified to two types**: BASE and COMPOSITE (ATOMIC and MOLECULAR)
- **Component wording**: Changed "is" to "means" for clarity
- **Literal componentization**: Reads literal translations from Phase 3 v3.4
- **Format simplified**: Components are `[[target, known], ...]` (no feeder IDs)
- **Input flexibility**: Reads deduplicated file (preferred) or original
- **Version bump**: 7.8.0
- **Pedagogical transparency**: Introductions now reveal target language construction
  - "where 'lo más' means 'the most'" shows Spanish superlative pattern
  - "where 'que' means 'that'" shows subjunctive construction

### v1.0 (2025-10-23)
- Initial implementation
- Three presentation types (BASE, COMPOSITE)
- Seed context requirement established
- Component grammar rules defined

---

## Related Phases

- **Phase 3**: **NOW INCLUDES PHASE 6** - Runs introduction generation automatically after LEGO extraction
- **Phase 5**: Runs after Phase 3 completes (reads both `lego_pairs.json` and `introductions.json`)
- **Phase 7**: Uses introduction presentations in final manifest compilation
- **Phase 8**: Generates audio for presentation text

---

## Integration Details

**How Phase 3 calls Phase 6:**

In `services/phases/phase3-lego-extraction-server.cjs`, after LEGO extraction completes:

```javascript
async function notifyOrchestrator(courseCode, status) {
  if (status === 'complete') {
    // Run Phase 6 introduction generation
    const courseDir = path.join(VFS_ROOT, courseCode);
    const result = await generateIntroductions(courseDir);
    console.log(`[Phase 3→6] ✅ Generated ${result.totalIntroductions} introductions`);
  }

  // Notify orchestrator of Phase 3 completion
  await fetch(`${ORCHESTRATOR_URL}/phase-complete`, {
    phase: 3, courseCode, status
  });
}
```

**Execution time**: Typically <1 second for 668-seed courses

**Error handling**: If introduction generation fails, Phase 3 logs a warning but still completes successfully (orchestrator can proceed to Phase 5)

---

**Remember**: Phase 6 reads component DATA from Phase 3 and generates natural language EXPLANATIONS. It never modifies the underlying LEGO structure. The methodology below is still used internally by the Phase 3 server.
