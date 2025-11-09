# Introduction Examples

## Complete Examples from Real Courses

### Example 1: BASE LEGO

**Input (LEGO_BREAKDOWNS_COMPLETE.json):**
```json
{
  "seed_id": "S0001",
  "original_target": "Hola",
  "original_known": "Hello",
  "lego_pairs": [
    {
      "lego_id": "S0001L01",
      "lego_type": "BASE",
      "target_chunk": "Hola",
      "known_chunk": "Hello"
    }
  ]
}
```

**Output (introductions.json):**
```json
{
  "lego_id": "S0001L01",
  "lego_type": "BASE",
  "target_chunk": "Hola",
  "known_chunk": "Hello",
  "seed_context": "Hello",
  "introduction_text": "The Spanish for Hello, as in Hello, is: Hola"
}
```

**Analysis:**
- ✅ Simple BASE LEGO gets simple introduction
- ✅ seed_context and seed itself are same (happens with single-word seeds)
- ✅ No componentization (BASE LEGOs don't break down)
- ✅ Natural language, pedagogically clear

---

### Example 2: COMPOSITE LEGO with Componentization

**Input (LEGO_BREAKDOWNS_COMPLETE.json):**
```json
{
  "seed_id": "S0002",
  "original_target": "Estoy intentando",
  "original_known": "I'm trying",
  "lego_pairs": [
    {
      "lego_id": "S0002L01",
      "lego_type": "COMPOSITE",
      "target_chunk": "Estoy intentando",
      "known_chunk": "I'm trying",
      "componentization": "I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
    }
  ],
  "feeder_pairs": [
    {
      "feeder_id": "S0002F01",
      "target_chunk": "Estoy",
      "known_chunk": "I'm",
      "parent_lego_id": "S0002L01"
    }
  ]
}
```

**Output (introductions.json):**
```json
{
  "lego_id": "S0002L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying",
  "seed_context": "I'm trying",
  "introduction_text": "The Spanish for I'm trying, as in I'm trying, is: Estoy intentando, I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
}
```

**Analysis:**
- ✅ COMPOSITE LEGO includes componentization
- ✅ Componentization appended after base introduction
- ✅ Explains how the LEGO breaks down into feeders
- ✅ Pedagogically valuable - learner sees the structure

---

### Example 3: FEEDER LEGO

**Input (LEGO_BREAKDOWNS_COMPLETE.json):**
```json
{
  "seed_id": "S0002",
  "original_target": "Estoy intentando",
  "original_known": "I'm trying",
  "feeder_pairs": [
    {
      "feeder_id": "S0002F01",
      "target_chunk": "Estoy",
      "known_chunk": "I'm",
      "parent_lego_id": "S0002L01"
    }
  ]
}
```

**Output (introductions.json):**
```json
{
  "feeder_id": "S0002F01",
  "lego_type": "FEEDER",
  "target_chunk": "Estoy",
  "known_chunk": "I'm",
  "parent_lego_id": "S0002L01",
  "seed_context": "I'm trying",
  "introduction_text": "The Spanish for I'm, as in I'm trying, is: Estoy"
}
```

**Analysis:**
- ✅ Uses feeder_id instead of lego_id
- ✅ Includes parent_lego_id to show where it came from
- ✅ lego_type is "FEEDER" (not BASE or COMPOSITE)
- ✅ No componentization (feeders are atomic)
- ✅ Simple, clear introduction

---

### Example 4: Duplicate LEGO (SKIPPED)

**Input (lego_provenance_map.json):**
```json
{
  "S0015F01": "S0001L02"
}
```

**Input (LEGO_BREAKDOWNS_COMPLETE.json):**
```json
{
  "seed_id": "S0015",
  "original_target": "la mesa",
  "original_known": "the table",
  "feeder_pairs": [
    {
      "feeder_id": "S0015F01",  // This is a duplicate!
      "target_chunk": "la",
      "known_chunk": "the",
      "parent_lego_id": "S0015L01"
    }
  ]
}
```

**Output (introductions.json):**
```json
// NOTHING - this LEGO is SKIPPED entirely
```

**Console Log:**
```
SKIP S0015F01: duplicate of S0001L02
```

**Analysis:**
- ✅ Correctly identified as duplicate
- ✅ Skipped from output (no introduction generated)
- ✅ Logged for transparency
- ✅ Learner will use introduction from S0001L02 instead

---

### Example 5: COMPOSITE with "you know already" Annotation

**Input (LEGO_BREAKDOWNS_COMPLETE.json):**
```json
{
  "seed_id": "S0008",
  "original_target": "no lo sé",
  "original_known": "I don't know",
  "lego_pairs": [
    {
      "lego_id": "S0008L01",
      "lego_type": "COMPOSITE",
      "target_chunk": "no lo",
      "known_chunk": "not it",
      "componentization": "not it = no lo, where no = not and lo = it"
    }
  ],
  "feeder_pairs": [
    {
      "feeder_id": "S0008F01",
      "target_chunk": "no",
      "known_chunk": "not",
      "parent_lego_id": "S0008L01"
    },
    {
      "feeder_id": "S0008F02",  // Let's say this is a duplicate of S0002F02
      "target_chunk": "lo",
      "known_chunk": "it",
      "parent_lego_id": "S0008L01"
    }
  ]
}
```

**Input (lego_provenance_map.json):**
```json
{
  "S0008F02": "S0002F02"  // S0008F02 is duplicate - learner already knows "lo"
}
```

**Output (introductions.json):**
```json
{
  "lego_id": "S0008L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "no lo",
  "known_chunk": "not it",
  "seed_context": "I don't know",
  "introduction_text": "The Spanish for not it, as in I don't know, is: no lo, not it = no lo, where no = not and lo = it (you know already)"
}
```

**Analysis:**
- ✅ Componentization includes "you know already" annotation
- ✅ Shows learner they've already learned "lo" elsewhere
- ✅ Reduces cognitive load (no need to re-learn)
- ✅ Reinforces prior knowledge
- ⚠️ S0008F02 itself is NOT in output (it's a duplicate)

---

## Bad Examples to Avoid

### ❌ Example 1: Including Technical IDs

**Bad:**
```json
{
  "introduction_text": "This LEGO (S0002L01) is a COMPOSITE type from seed S0002..."
}
```

**Why it's bad:**
- Exposes internal IDs (S0002L01, S0002) to learner
- Uses technical terminology (COMPOSITE)
- Breaks pedagogical immersion
- Confusing for learners

**Good:**
```json
{
  "introduction_text": "The Spanish for I'm trying, as in I'm trying, is: Estoy intentando, I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
}
```

---

### ❌ Example 2: Missing Componentization

**Bad:**
```json
{
  "lego_id": "S0002L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying",
  "seed_context": "I'm trying",
  "introduction_text": "The Spanish for I'm trying, as in I'm trying, is: Estoy intentando"
  // Missing componentization even though source LEGO has it!
}
```

**Why it's bad:**
- Loses valuable pedagogical information
- Learner doesn't understand how LEGO breaks down
- Missed opportunity to reinforce feeders

**Good:**
```json
{
  "introduction_text": "The Spanish for I'm trying, as in I'm trying, is: Estoy intentando, I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
}
```

---

### ❌ Example 3: Including Duplicate LEGOs

**Bad:**
```json
[
  {
    "lego_id": "S0001L02",
    "target_chunk": "la",
    "known_chunk": "the",
    "introduction_text": "..."
  },
  {
    "feeder_id": "S0015F01",  // This is duplicate of S0001L02!
    "target_chunk": "la",
    "known_chunk": "the",
    "introduction_text": "..."  // Duplicate introduction - waste
  }
]
```

**Why it's bad:**
- Creates duplicate content
- Confuses learner with redundant introductions
- Ignores provenance map
- Wastes tokens and storage

**Good:**
```json
[
  {
    "lego_id": "S0001L02",
    "target_chunk": "la",
    "known_chunk": "the",
    "introduction_text": "..."
  }
  // S0015F01 is SKIPPED - not in output
]
```

---

### ❌ Example 4: Null or Missing Fields

**Bad:**
```json
{
  "lego_id": "S0001L01",
  "lego_type": "BASE",
  "target_chunk": "Hola",
  "known_chunk": "Hello",
  "seed_context": null,  // Should be "" not null
  "introduction_text": "..."
}
```

**Why it's bad:**
- JSON spec requires strings, not null
- Frontend may crash on null values
- Breaks type safety

**Good:**
```json
{
  "lego_id": "S0001L01",
  "lego_type": "BASE",
  "target_chunk": "Hola",
  "known_chunk": "Hello",
  "seed_context": "",  // Empty string is valid
  "introduction_text": "..."
}
```

---

## Quality Checklist

Before finalizing introductions.json:

- [ ] All non-duplicate LEGOs from input appear in output
- [ ] No LEGOs from provenance map keys appear in output
- [ ] All COMPOSITE LEGOs with componentization include it in introduction_text
- [ ] All feeders use feeder_id (not lego_id)
- [ ] All feeders include parent_lego_id
- [ ] All feeders have lego_type = "FEEDER"
- [ ] No null values (use empty string "" instead)
- [ ] No technical terminology in introduction_text
- [ ] seed_context consistent for all LEGOs from same seed
- [ ] Valid JSON structure (no syntax errors)
