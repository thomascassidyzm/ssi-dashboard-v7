# Introductions JSON Schema

## Output Format: introductions.json

```typescript
interface IntroductionsFile {
  course_metadata: {
    course_code: string;           // e.g., "spa_for_eng_30seeds"
    target_language: string;       // e.g., "Spanish"
    known_language: string;        // e.g., "English"
    num_seeds: number;             // e.g., 30
    phase: 6;                      // Always 6
    generation_date: string;       // ISO 8601 timestamp
  };
  introductions: Introduction[];   // Array of introduction objects
}

interface Introduction {
  // For regular LEGOs (from lego_pairs)
  lego_id?: string;                // e.g., "S0001L01"
  lego_type: "BASE" | "COMPOSITE" | "FEEDER";

  // For feeders (from feeder_pairs)
  feeder_id?: string;              // e.g., "S0001F01"
  parent_lego_id?: string;         // e.g., "S0001L01"

  // Common fields
  target_chunk: string;            // e.g., "la"
  known_chunk: string;             // e.g., "the"
  seed_context: string;            // e.g., "Hello"
  introduction_text: string;       // Pedagogical explanation
}
```

## Input Format: LEGO_BREAKDOWNS_COMPLETE.json

```typescript
interface LegoBreakdowns {
  course_metadata: {
    course_code: string;
    target_language: string;
    known_language: string;
    num_seeds: number;
  };
  lego_breakdowns: SeedBreakdown[];
}

interface SeedBreakdown {
  seed_id: string;                 // e.g., "S0001"
  original_target: string;         // e.g., "Hola"
  original_known: string;          // e.g., "Hello"
  lego_pairs: Lego[];
  feeder_pairs: Feeder[];
}

interface Lego {
  lego_id: string;
  lego_type: "BASE" | "COMPOSITE";
  target_chunk: string;
  known_chunk: string;
  componentization?: string;       // Only for COMPOSITE
}

interface Feeder {
  feeder_id: string;
  target_chunk: string;
  known_chunk: string;
  parent_lego_id: string;
}
```

## Input Format: lego_provenance_map.json

```typescript
interface ProvenanceMap {
  [duplicate_lego_id: string]: string;  // Maps duplicate → original
}

// Example:
{
  "S0015F01": "S0001L02",  // S0015F01 is duplicate of S0001L02
  "S0029F01": "S0002F01",  // S0029F01 is duplicate of S0002F01
  "S0008F02": "S0002F02"   // S0008F02 is duplicate of S0002F02
}
```

**Key Rule:** Any lego_id appearing as a KEY in this map should be SKIPPED during introduction generation (it's a duplicate).

## Validation Rules

### Required Fields

Every introduction must have:
- ✅ Either `lego_id` OR `feeder_id` (never both)
- ✅ `lego_type` (BASE, COMPOSITE, or FEEDER)
- ✅ `target_chunk` (non-empty string)
- ✅ `known_chunk` (non-empty string)
- ✅ `seed_context` (can be empty string "" but not null)
- ✅ `introduction_text` (non-empty string)

### Optional Fields

- `componentization` - Only included if source LEGO had it
- `parent_lego_id` - Only for feeders

### Data Integrity

1. **No duplicates:** No lego_id from provenance map keys should appear in output
2. **Unique IDs:** Each lego_id/feeder_id appears at most once
3. **Valid types:** lego_type must be "BASE", "COMPOSITE", or "FEEDER"
4. **Non-empty chunks:** target_chunk and known_chunk must have content
5. **seed_context consistency:** All LEGOs from same seed should have same seed_context

### Componentization Rules

- ✅ COMPOSITE LEGOs with componentization → include in introduction_text
- ✅ COMPOSITE LEGOs without componentization → base introduction only
- ✅ BASE LEGOs → never have componentization
- ✅ FEEDER LEGOs → never have componentization

## Example Complete File

```json
{
  "course_metadata": {
    "course_code": "spa_for_eng_30seeds",
    "target_language": "Spanish",
    "known_language": "English",
    "num_seeds": 30,
    "phase": 6,
    "generation_date": "2025-01-18T10:30:00.000Z"
  },
  "introductions": [
    {
      "lego_id": "S0001L01",
      "lego_type": "COMPOSITE",
      "target_chunk": "Ho la",
      "known_chunk": "I have the",
      "seed_context": "Hello",
      "introduction_text": "The Spanish for I have the, as in Hello, is: Ho la, This combines Ho (I have) and la (the), where la is the feminine article."
    },
    {
      "lego_id": "S0001L02",
      "lego_type": "BASE",
      "target_chunk": "la",
      "known_chunk": "the",
      "seed_context": "Hello",
      "introduction_text": "The Spanish for the, as in Hello, is: la"
    },
    {
      "feeder_id": "S0002F01",
      "lego_type": "FEEDER",
      "target_chunk": "Estoy",
      "known_chunk": "I'm",
      "parent_lego_id": "S0002L01",
      "seed_context": "I'm trying",
      "introduction_text": "The Spanish for I'm, as in I'm trying, is: Estoy"
    }
  ]
}
```

## Common Mistakes to Avoid

❌ **Including duplicate LEGOs**
```json
{
  "lego_id": "S0015F01",  // This is in provenance map - should be SKIPPED
  "introduction_text": "..."
}
```

❌ **Missing seed_context**
```json
{
  "lego_id": "S0001L01",
  "introduction_text": "...",
  // seed_context is missing - should be "" if translations unavailable
}
```

❌ **Wrong lego_type for feeders**
```json
{
  "feeder_id": "S0002F01",
  "lego_type": "BASE",  // Wrong - should be "FEEDER"
  "parent_lego_id": "S0002L01"
}
```

❌ **Including technical terminology in learner-facing text**
```json
{
  "introduction_text": "This is a COMPOSITE LEGO from seed S0001..."
  // Bad - learners don't need to know about "COMPOSITE" or "S0001"
}
```

✅ **Correct approach:**
```json
{
  "introduction_text": "The Spanish for I have the, as in Hello, is: Ho la, This combines Ho (I have) and la (the), where la is the feminine article."
  // Natural language, pedagogically sound, no technical jargon
}
```
