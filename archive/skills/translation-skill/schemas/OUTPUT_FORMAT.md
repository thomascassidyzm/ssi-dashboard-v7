# Output Format

**File**: `vfs/courses/{course_code}/seed_pairs.json`

---

## JSON Structure

```json
{
  "version": "7.7.0",
  "course": "{course_code}",
  "target": "{target_language_code}",
  "known": "{known_language_code}",
  "generated": "{ISO 8601 timestamp}",
  "total_seeds": 668,
  "translations": {
    "S0001": ["{target_translation}", "{known_translation}"],
    "S0002": ["{target_translation}", "{known_translation}"],
    ...
    "S0668": ["{target_translation}", "{known_translation}"]
  }
}
```

---

## Field Specifications

### Metadata Fields

- **version**: String - Course format version (current: "7.7.0")
- **course**: String - Course code (e.g., "spa_for_eng_668seeds")
- **target**: String - Target language ISO 639-3 code (e.g., "spa", "fra", "ita")
- **known**: String - Known language ISO 639-3 code (e.g., "eng", "spa", "fra")
- **generated**: String - ISO 8601 timestamp
- **total_seeds**: Number - Total translations (668 for full course)

### Translations Object

**Key**: Seed ID (format: `S0001` to `S0668`)

**Value**: Array with exactly 2 elements:
1. `[0]` - Target language translation (string)
2. `[1]` - Known language translation (string)

---

## Translation Format Rules

### Target Language Translation

**Requirements**:
- Pedagogically optimized (cognates for seeds 1-100)
- Grammatically perfect
- Replaces `{target}` placeholder with target language name
- Consistent with vocabulary registry
- Natural and idiomatic (within pedagogical constraints)

**Example** (Spanish for English):
```json
"S0001": [
  "Quiero hablar español contigo ahora.",
  "I want to speak Spanish with you now."
]
```

### Known Language Translation

**Critical Rules**:

1. **If known IS English:**
   - Use canonical English directly
   - Replace `{target}` placeholder with target language name
   - **NO back-translation from target to English**

2. **If known is NOT English:**
   - Translate canonical to known language
   - Match cognates with target where possible
   - Ensure alignment with target structure

**Example** (Spanish for English - known IS English):
```json
"S0003": [
  "cómo hablar lo más frecuentemente posible",
  "how to speak as often as possible"
]
```
Note: Known uses canonical "often" even though target uses "frecuentemente". Phase 6 reveals synonym relationship.

**Example** (Italian for French - NEITHER is English):
```json
"S0003": [
  "il più frequentemente possibile",
  "aussi fréquemment que possible"
]
```
Note: Both use cognate "frequently" for transparency.

---

## Language Placeholder Replacement

**Canonical seeds contain `{target}` placeholder:**

```
Canonical: "I want to speak {target} with you now."
```

**Replace with target language name:**

```json
"S0001": [
  "Quiero hablar español contigo ahora.",  // Spanish: "español"
  "I want to speak Spanish with you now."  // English: "Spanish"
]
```

**Language names by code**:
- `spa` → Spanish / español
- `fra` → French / français
- `ita` → Italian / italiano
- `eng` → English / inglés (when in other language)
- `cmn` → Chinese / 中文 (Zhōngwén)

---

## Formatting

**JSON style**:
- Pretty-printed (2-space indentation)
- UTF-8 encoding
- Sorted by seed ID (S0001, S0002, ..., S0668)
- No trailing commas

**Example**:
```json
{
  "version": "7.7.0",
  "course": "spa_for_eng_668seeds",
  "target": "spa",
  "known": "eng",
  "generated": "2025-10-30T12:34:56.789Z",
  "total_seeds": 668,
  "translations": {
    "S0001": [
      "Quiero hablar español contigo ahora.",
      "I want to speak Spanish with you now."
    ],
    "S0002": [
      "Estoy intentando aprender.",
      "I'm trying to learn."
    ],
    "S0003": [
      "cómo hablar lo más frecuentemente posible",
      "how to speak as often as possible"
    ]
  }
}
```

---

## Validation Checklist

Before writing output file, verify:

- ✓ All 668 seeds present (S0001 through S0668)
- ✓ Every translation is 2-element array [target, known]
- ✓ No missing or null translations
- ✓ Metadata fields complete and accurate
- ✓ Language codes correct (ISO 639-3)
- ✓ Placeholder `{target}` replaced in all translations
- ✓ JSON valid (no syntax errors)
- ✓ UTF-8 encoding (handles all characters)
- ✓ Sorted by seed ID

---

## File Location

**Path**: `vfs/courses/{course_code}/seed_pairs.json`

**Example paths**:
- `vfs/courses/spa_for_eng_668seeds/seed_pairs.json`
- `vfs/courses/fra_for_eng_668seeds/seed_pairs.json`
- `vfs/courses/ita_for_fra_668seeds/seed_pairs.json`

---

## Example Full Output (First 3 Seeds)

```json
{
  "version": "7.7.0",
  "course": "spa_for_eng_668seeds",
  "target": "spa",
  "known": "eng",
  "generated": "2025-10-30T12:34:56.789Z",
  "total_seeds": 668,
  "translations": {
    "S0001": [
      "Quiero hablar español contigo ahora.",
      "I want to speak Spanish with you now."
    ],
    "S0002": [
      "Estoy intentando aprender.",
      "I'm trying to learn."
    ],
    "S0003": [
      "cómo hablar lo más frecuentemente posible",
      "how to speak as often as possible"
    ]
  }
}
```

---

**Output must be valid JSON, UTF-8 encoded, with all 668 seeds translated.**
