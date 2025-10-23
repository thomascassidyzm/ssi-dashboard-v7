# Phase 6: Introduction Generation

**Version**: 1.0
**Status**: ✅ Active
**Last Updated**: 2025-10-23
**Script**: `scripts/phase6-generate-introductions.cjs`

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
"Now, the Italian for "I want" as in "I want to speak Italian with you now." is "Voglio", Voglio."
```

#### FEEDER LEGOs (type: F)
Same format as BASE (they're just BASE LEGOs introduced in a different seed for reuse):
```
"Now, the {target_lang} for "{known_lego}" as in "{known_seed}" is "{target_lego}", {target_lego}."
```

#### COMPOSITE LEGOs (type: C)
Detailed breakdown with component explanation:
```
"The {target_lang} for "{known_lego}" as in "{known_seed}" is "{target_lego}" - where {component_explanations}."
```

Component explanations:
- For FEEDER components: `"{target_part}" is "{known_part}" (which you learned earlier)`
- For new components: `"{target_part}" is "{known_part}"`

Example:
```
"The Italian for "I'm trying" as in "I'm trying to learn." is "Sto provando" - where "Sto" is "I'm" (which you learned earlier) and "provando" is "trying" (which you learned earlier)."
```

---

## Input Format

**File**: `vfs/courses/{course_code}/lego_pairs.json`

### LEGO Structure
```json
[
  "S0002L01",                    // LEGO ID
  "C",                           // Type: B=BASE, F=FEEDER, C=COMPOSITE
  "Sto provando",                // Target language LEGO
  "I'm trying",                  // Known language LEGO
  [                              // Components (only for COMPOSITE)
    ["S0002F01", "F", "Sto", "I'm"],
    ["S0002F02", "F", "provando", "trying"]
  ]
]
```

Component format: `[legoId, type, targetPart, knownPart]`

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

### 1. **Grammar for Component Lists**
- 1 component: `where X`
- 2 components: `where X and Y`
- 3+ components: `where X, Y, and Z`

### 2. **FEEDER Recognition**
When a component has type "F", add "(which you learned earlier)" to indicate it's a callback to previous learning.

### 3. **Repetition Format**
End BASE/FEEDER presentations with the target word repeated:
```
"...is \"Voglio\", Voglio."
```

This helps learners hear the pronunciation clearly.

### 4. **Seed Context Requirement**
ALWAYS include `"as in \"{known_seed}\""` to provide context. Learners need to know which meaning/usage is being taught.

---

## Validation Checklist

✅ Every LEGO ID has exactly one presentation
✅ All BASE LEGOs (type B) use simple format
✅ All FEEDER LEGOs (type F) use simple format
✅ All COMPOSITE LEGOs (type C) include component breakdown
✅ FEEDER components include "(which you learned earlier)"
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
- 54 BASE/FEEDER LEGOs (simple format)
- 9 COMPOSITE LEGOs (component breakdown)

---

## Version History

### v1.0 (2025-10-23)
- Initial implementation
- Three presentation types (BASE, FEEDER, COMPOSITE)
- Seed context requirement established
- Component grammar rules defined
- FEEDER recognition with "learned earlier" text

---

## Related Phases

- **Phase 3**: Creates LEGO structure that Phase 6 reads
- **Phase 7**: Uses introduction presentations in final manifest
- **Phase 8**: Will generate audio for presentation text

---

**Remember**: Phase 6 reads component DATA from Phase 3 and generates natural language EXPLANATIONS. It never modifies the underlying LEGO structure.
