# Introduction Generation Logic

## Complete Methodology

### Step 1: Load and Validate Inputs

Load three files:
1. **LEGO_BREAKDOWNS_COMPLETE.json** - Contains all LEGOs with lego_type and componentization
2. **lego_provenance_map.json** - Maps duplicate LEGOs to their originals
3. **translations.json** - Seed-level translations for context

Validate:
- LEGO_BREAKDOWNS_COMPLETE.json has `lego_breakdowns` array
- Each breakdown has `seed_id` and `lego_pairs` array
- Each LEGO has required fields: `lego_id`, `target_chunk`, `known_chunk`, `lego_type`
- Provenance map is valid JSON object (optional)
- Translations is valid JSON object (optional)

### Step 2: Build Provenance Set

```javascript
const duplicateLegos = new Set(Object.keys(provenanceMap));
// Example: Set(['S0015F01', 'S0029F01', 'S0008F02'])
```

Any lego_id in this set should be SKIPPED (it's a duplicate of an earlier LEGO).

### Step 3: Process Each Seed

For each seed in `lego_breakdowns`:

```javascript
const seedId = breakdown.seed_id; // e.g., "S0001"
const seedTranslation = translations[seedId]; // e.g., ["Hola", "Hello"]

// Build seed context
const seed_context = seedTranslation
  ? `In this seed, you learned "${seedTranslation[0]}" means "${seedTranslation[1]}".`
  : "";
```

### Step 4: Process Each LEGO

For each LEGO in `lego_pairs` (and `feeder_pairs` if present):

```javascript
// 1. Check if duplicate
if (duplicateLegos.has(lego.lego_id)) {
  console.log(`Skipping duplicate LEGO: ${lego.lego_id}`);
  continue; // SKIP this LEGO entirely
}

// 2. Build base introduction
let introduction_text = `Here, "${lego.target_chunk}" means "${lego.known_chunk}".`;

// 3. Add componentization for COMPOSITE LEGOs
if (lego.lego_type === 'COMPOSITE' && lego.componentization) {
  introduction_text += ` ${lego.componentization}`;
}

// 4. Write to output
introductions[lego.lego_id] = {
  seed_context: seed_context,
  introduction_text: introduction_text
};
```

### Step 5: Quality Validation

Before writing output, verify:
1. All non-duplicate LEGOs have introductions
2. No duplicate lego_ids in output
3. All COMPOSITE LEGOs with componentization include it in introduction_text
4. Seed context is consistent across all LEGOs from same seed

### Step 6: Write Output

```json
{
  "S0001L01": {
    "seed_context": "In this seed, you learned \"Hola\" means \"Hello\".",
    "introduction_text": "Here, \"Ho\" means \"I have\". This combines Ho (I have) and la (the), where la is the feminine article."
  },
  "S0001L02": {
    "seed_context": "In this seed, you learned \"Hola\" means \"Hello\".",
    "introduction_text": "Here, \"la\" means \"the\"."
  }
}
```

## Pedagogical Guidelines

### Seed Context

**Purpose:** Orient the learner to which seed this LEGO came from

**Format:**
```
"In this seed, you learned \"{target_full}\" means \"{known_full}\"."
```

**Examples:**
- ✅ "In this seed, you learned \"Estoy intentando\" means \"I'm trying\"."
- ❌ "This LEGO comes from seed S0002" (too technical)
- ❌ "From the sentence about trying" (too vague)

### Introduction Text - BASE LEGOs

**Purpose:** Simple, direct explanation of the chunk

**Format:**
```
"Here, \"{target_chunk}\" means \"{known_chunk}\"."
```

**Examples:**
- ✅ "Here, \"la\" means \"the\"."
- ✅ "Here, \"estoy\" means \"I am\"."
- ❌ "La is the Spanish feminine article" (too grammatical)

### Introduction Text - COMPOSITE LEGOs

**Purpose:** Explain the chunk AND how it breaks down

**Format:**
```
"Here, \"{target_chunk}\" means \"{known_chunk}\". {componentization}"
```

**Examples:**
- ✅ "Here, \"Estoy intentando\" means \"I'm trying\". I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying."
- ✅ "Here, \"no lo\" means \"not it\". This combines no (not) and lo (it), creating the negation structure."

**What makes good componentization:**
- Uses natural language, not formulas
- Explains HOW the pieces combine
- Provides linguistic insight when relevant
- Avoids overwhelming the learner with grammatical terminology

### Introduction Text - FEEDER LEGOs

**Purpose:** Same as BASE (feeders are atomic chunks)

**Format:**
```
"Here, \"{target_chunk}\" means \"{known_chunk}\"."
```

**Note:** Feeders don't need special treatment in introductions. They're just smaller BASE-like LEGOs extracted from COMPOSITE parents.

## Special Cases

### Missing Translations

If `translations.json` doesn't have the seed:
```javascript
seed_context = ""; // Empty string, not null
```

Introduction text is still required.

### Missing Componentization

If COMPOSITE LEGO lacks `componentization` field:
```javascript
// Just use base introduction
introduction_text = `Here, "${lego.target_chunk}" means "${lego.known_chunk}".`;
```

Log a warning but continue processing.

### Duplicate Lego IDs in Input

If two LEGOs have same lego_id:
```javascript
if (introductions[lego.lego_id]) {
  console.warn(`Duplicate lego_id found: ${lego.lego_id} - keeping first occurrence`);
  continue;
}
```

### Empty Target or Known Chunk

Skip the LEGO and log error:
```javascript
if (!lego.target_chunk || !lego.known_chunk) {
  console.error(`Invalid LEGO missing chunks: ${lego.lego_id}`);
  continue;
}
```

## Output Format

```typescript
interface Introductions {
  [lego_id: string]: {
    seed_context: string;      // Seed-level context
    introduction_text: string; // LEGO-specific explanation
  }
}
```

**Requirements:**
- Top-level object (not array)
- Keys are lego_ids (e.g., "S0001L01", "S0015F02")
- Each value has exactly 2 fields
- Both fields are strings (never null, never missing)
- seed_context can be empty string "" but not undefined
- introduction_text must always have content

## Validation Checklist

Before finalizing output:

- [ ] All non-duplicate LEGOs from input appear in output
- [ ] No duplicate keys in output
- [ ] All COMPOSITE LEGOs with componentization include it
- [ ] All seed_context values match translations.json
- [ ] All introduction_text values start with "Here, "
- [ ] No technical terminology (lego_id, BASE, COMPOSITE) in learner-facing text
- [ ] No null or undefined values
- [ ] Valid JSON structure
