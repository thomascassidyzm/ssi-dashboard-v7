# Phase 7: Course Manifest Compilation

**Version**: 1.0
**Status**: ✅ Active
**Last Updated**: 2025-10-23
**Script**: `scripts/phase7-compile-manifest.cjs`

---

## Purpose

Compile v7.7 format files (seed_pairs, lego_pairs, lego_baskets, introductions) into the legacy course manifest format required by the SSi mobile app. This transformation enables backwards compatibility while allowing the course generation pipeline to work with the modern, compact v7.7 format.

---

## Core Principles

### 1. **Backwards Compatibility First**
The legacy app format must be preserved exactly:
- Slices structure (future-proofed for modules)
- Seeds with introductionItems
- Empty tokens/lemmas arrays (legacy waste, but required)
- Samples keyed by phrase text

### 2. **Single Slice Architecture**
All seeds go in ONE slice. The slices array is for future-proofing to support multiple modules/lessons, but current courses use a single slice.

### 3. **Deterministic UUIDs**
Audio sample UUIDs must be deterministic and follow SSi legacy format:
- Same text + language + role + cadence = same UUID every time
- Format: `XXXXXXXX-6044-YYYY-ZZZZ-XXXXXXXXXXXX`
- Role-specific fixed middle segments

### 4. **Comprehensive Sample Registration**
Register audio samples for ALL spoken text:
- Seed sentences (target + source)
- LEGO pairs (target + source)
- Practice phrases (target + source)
- Presentation text (source language)

---

## UUID Generation Algorithm

### SSi Legacy Format
```
XXXXXXXX-6044-YYYY-ZZZZ-XXXXXXXXXXXX
```

Where:
- `XXXXXXXX` = First 8 hex chars of SHA-1 hash
- `6044` = Fixed segment 2 (always)
- `YYYY` = Role-specific segment 3
- `ZZZZ` = Role-specific segment 4
- `XXXXXXXXXXXX` = Last 12 hex chars of SHA-1 hash

### Role-Specific Segments
```javascript
{
  'target1': { seg3: 'AC07', seg4: '8F4E' },  // Primary target voice
  'target2': { seg3: 'E115', seg4: '8F4E' },  // Alternate target voice
  'source':  { seg3: '36CD', seg4: '31D4' }   // Known/source language
}
```

### Hash Input
```
SHA-1(text|language|role|cadence)
```

Example:
```
Input:  "Voglio|ita|target1|natural"
Output: C6A82DE8-6044-AC07-8F4E-412F54FEF5F7
```

### Verification
Same inputs MUST produce same UUID across runs. Test by:
1. Generate manifest
2. Check UUID for "Voglio" target1
3. Regenerate manifest
4. Verify UUID unchanged

---

## Input Files

### Required Files
1. `seed_pairs.json` - Seed sentence translations
2. `lego_pairs.json` - LEGO structure with components
3. `lego_baskets.json` - Practice phrases (expanding windows)
4. `introductions.json` - Presentation text for LEGOs

All must be v7.7.0 format.

---

## Output Format

### Course Manifest Structure
```json
{
  "id": "ita-eng",
  "version": "7.7.0",
  "target": "ita",
  "known": "eng",
  "slices": [
    {
      "id": "uuid",
      "version": "7.7.0",
      "seeds": [ /* array of seed objects */ ],
      "samples": { /* audio sample metadata */ }
    }
  ]
}
```

### Seed Structure
```json
{
  "id": "uuid",
  "node": {
    "id": "uuid",
    "target": { "tokens": [], "text": "Voglio parlare...", "lemmas": [] },
    "known":  { "tokens": [], "text": "I want to speak...", "lemmas": [] }
  },
  "seedSentence": {
    "canonical": "I want to speak Italian with you now."
  },
  "introductionItems": [ /* array of LEGO items */ ]
}
```

### Introduction Item Structure
```json
{
  "id": "uuid",
  "node": {
    "id": "uuid",
    "target": { "tokens": [], "text": "Voglio", "lemmas": [] },
    "known":  { "tokens": [], "text": "I want", "lemmas": [] }
  },
  "presentation": "Now, the Italian for \"I want\" as in...",
  "nodes": [ /* array of practice phrases (optional) */ ]
}
```

### Practice Node Structure
```json
{
  "id": "uuid",
  "target": { "tokens": [], "text": "Voglio parlare", "lemmas": [] },
  "known":  { "tokens": [], "text": "I want to speak", "lemmas": [] }
}
```

### Samples Structure
```json
{
  "Voglio": [
    {
      "id": "C6A82DE8-6044-AC07-8F4E-412F54FEF5F7",
      "cadence": "natural",
      "role": "target1"
    },
    {
      "id": "4114E479-6044-E115-8F4E-8B1C4F02C6C8",
      "cadence": "natural",
      "role": "target2"
    }
  ],
  "I want": [
    {
      "id": "489C5783-6044-36CD-31D4-4CB55EF258B5",
      "cadence": "natural",
      "role": "source"
    }
  ]
}
```

---

## Implementation Rules

### 1. **Empty Tokens/Lemmas**
Always use empty arrays for tokens and lemmas fields:
```javascript
{
  tokens: [],
  text: "actual text",
  lemmas: []
}
```

This is legacy waste (they're never used, always same as text), but required for backwards compatibility.

### 2. **Practice Phrase Flattening**
Basket structure: `[lego_pair, full_sentences, practice_windows]`

Practice windows is an array of 4 windows. Flatten all windows into a single nodes array:
```javascript
const practiceWindows = basket[2] || [];
for (const window of practiceWindows) {
  for (const phrase of window) {
    // Create practice node
  }
}
```

### 3. **Sample Registration**
Register variants for each phrase:
- Target language: target1 + target2 (both natural cadence)
- Source language: source (natural cadence)

### 4. **Course ID Format**
```javascript
const courseId = `${targetCode}-${knownCode}`;
// Example: "ita-eng"
```

---

## Validation Checklist

✅ Single slice containing all seeds
✅ Each seed has introductionItems array
✅ Each introductionItem has presentation text
✅ Practice nodes properly flattened from windows
✅ All text has corresponding sample entries
✅ UUIDs are deterministic (verify across runs)
✅ UUIDs follow role-specific segment format
✅ Empty tokens/lemmas arrays everywhere
✅ Samples object populated with all phrases

---

## Anti-patterns

❌ **Don't create one slice per seed**
Bad: 10 slices with 1 seed each
Good: 1 slice with 10 seeds

❌ **Don't populate tokens/lemmas**
Bad: Tokenizing and lemmatizing all text
Good: Empty arrays (legacy compatibility)

❌ **Don't use random UUIDs for samples**
Bad: `uuidv4()` - different every time
Good: Deterministic hash-based UUID

❌ **Don't skip sample registration**
Every piece of spoken text must have samples, including presentation text

❌ **Don't use 'known' role**
Bad: `role: "known"`
Good: `role: "source"` (legacy naming)

---

## Sample Statistics

**Test Course**: `ita_for_eng_10seeds`
- 1 slice
- 10 seeds
- 63 introduction items
- 562 practice nodes
- 1141 unique phrases
- 1681 total audio sample variants

---

## Audio Generation Mapping

Phase 8 will use this manifest to generate audio files:
1. Iterate through samples object
2. For each phrase text:
   - For each variant (role + cadence):
     - Generate audio file named `{UUID}.mp3`
     - Store in course audio directory

Example:
```
C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3  <- "Voglio" target1 natural
4114E479-6044-E115-8F4E-8B1C4F02C6C8.mp3  <- "Voglio" target2 natural
489C5783-6044-36CD-31D4-4CB55EF258B5.mp3  <- "I want" source natural
```

---

## Version History

### v1.0 (2025-10-23)
- Initial implementation
- Single slice architecture
- Deterministic UUID generation with SSi legacy format
- Role-specific UUID segments (target1, target2, source)
- Comprehensive sample registration
- Empty tokens/lemmas for backwards compatibility

---

## Related Phases

- **Phase 1**: Provides seed_pairs.json
- **Phase 3**: Provides lego_pairs.json
- **Phase 4**: Provides lego_baskets.json
- **Phase 6**: Provides introductions.json
- **Phase 8**: Will generate audio files using sample UUIDs

---

## Schema Reference

**File**: `schemas/course-manifest-schema.json`

Defines the complete structure of the output manifest with JSON Schema validation rules.

---

**Remember**: Phase 7 bridges the modern v7.7 format to the legacy app format. Backwards compatibility is critical - the app expects exact structure including "wasteful" empty arrays.
