# LEGO Classification Rules

## Decision Tree

```
START: You have a target chunk and known chunk pair
    ↓
┌───────────────────────────────────────────────────────┐
│ STEP 1: Can this chunk be meaningfully broken down    │
│         into smaller parts?                           │
│                                                        │
│ Examples:                                              │
│ • "Estoy intentando" → YES (Estoy + intentando)       │
│ • "Hola" → NO (single word, atomic)                   │
│ • "la" → NO (single particle, indivisible)            │
│                                                        │
│ NO  → BASE LEGO                                        │
│ YES → Continue to Step 2...                           │
└───────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────┐
│ STEP 2: Do the component parts have pedagogical value?│
│                                                        │
│ Examples:                                              │
│ • "Estoy intentando" → YES                            │
│   - Estoy = I'm (useful on its own)                   │
│   - intentando = trying (learnable concept)           │
│                                                        │
│ • "hola" → NO                                          │
│   - Cannot meaningfully split "hola"                  │
│                                                        │
│ NO  → BASE LEGO (even if multi-word)                   │
│ YES → COMPOSITE LEGO                                   │
└───────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────┐
│ STEP 3: Extract FEEDERs from COMPOSITE                │
│                                                        │
│ For each meaningful component:                        │
│ 1. Create FEEDER with parent_lego_id                  │
│ 2. Validate FD for each feeder                        │
│ 3. Add to feeder_pairs array                          │
│                                                        │
│ Example:                                               │
│ COMPOSITE: "Estoy intentando" → "I'm trying"          │
│ FEEDER 1: "Estoy" → "I'm"                             │
│ FEEDER 2: "intentando" → "trying"                     │
└───────────────────────────────────────────────────────┘
```

## BASE LEGO Definition

**What is a BASE LEGO?**
- A single, atomic, indivisible chunk
- Cannot be meaningfully broken down further
- Stands alone as a pedagogical unit

**Characteristics:**
- Usually (but not always) single word
- May be multi-word if it's an idiom or fixed expression
- No internal structure worth extracting
- High reusability as-is

**Examples:**

✅ **Single-word BASE:**
```json
{
  "lego_id": "S0001L01",
  "lego_type": "BASE",
  "target_chunk": "Hola",
  "known_chunk": "Hello"
}
```

✅ **Multi-word BASE (idiomatic expression):**
```json
{
  "lego_id": "S0025L01",
  "lego_type": "BASE",
  "target_chunk": "qué tal",
  "known_chunk": "how's it going"
}
```
Why BASE? "qué tal" functions as a single unit; breaking it down wouldn't be pedagogically useful.

✅ **Particle BASE:**
```json
{
  "lego_id": "S0001L02",
  "lego_type": "BASE",
  "target_chunk": "la",
  "known_chunk": "the"
}
```

## COMPOSITE LEGO Definition

**What is a COMPOSITE LEGO?**
- A chunk that contains multiple meaningful parts
- Can be broken down into pedagogically valuable components
- Each component (FEEDER) teaches something useful

**Characteristics:**
- Always multi-word or multi-morpheme
- Components have clear boundaries
- Each component passes FD validation independently
- Componentization explains the breakdown

**Requirements:**
1. Must have `componentization` field
2. Must have corresponding FEEDERs in `feeder_pairs`
3. Componentization must explain how parts combine

**Examples:**

✅ **Standard COMPOSITE:**
```json
{
  "lego_id": "S0002L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying",
  "componentization": "I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
}
```

Corresponding FEEDERs:
```json
{
  "feeder_id": "S0002F01",
  "target_chunk": "Estoy",
  "known_chunk": "I'm",
  "parent_lego_id": "S0002L01"
},
{
  "feeder_id": "S0002F02",
  "target_chunk": "intentando",
  "known_chunk": "trying",
  "parent_lego_id": "S0002L01"
}
```

✅ **COMPOSITE with article + noun:**
```json
{
  "lego_id": "S0015L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "la mesa",
  "known_chunk": "the table",
  "componentization": "the table = la mesa, where la = the and mesa = table"
}
```

Corresponding FEEDERs:
```json
{
  "feeder_id": "S0015F01",
  "target_chunk": "la",
  "known_chunk": "the",
  "parent_lego_id": "S0015L01"
},
{
  "feeder_id": "S0015F02",
  "target_chunk": "mesa",
  "known_chunk": "table",
  "parent_lego_id": "S0015L01"
}
```

## FEEDER Definition

**What is a FEEDER?**
- A component extracted from a COMPOSITE LEGO
- Represents a meaningful part that learners should know
- Always has a parent_lego_id pointing to its COMPOSITE source

**Characteristics:**
- Created from COMPOSITE breakdown
- Never standalone (always extracted from parent)
- Must pass FD validation independently
- Pedagogically valuable on its own

**Requirements:**
1. Must have `feeder_id` (not lego_id)
2. Must have `parent_lego_id`
3. Must appear in parent's componentization
4. Must pass FD validation

**Examples:**

✅ **Standard FEEDER:**
```json
{
  "feeder_id": "S0002F01",
  "target_chunk": "Estoy",
  "known_chunk": "I'm",
  "parent_lego_id": "S0002L01"
}
```

✅ **Particle FEEDER:**
```json
{
  "feeder_id": "S0015F01",
  "target_chunk": "la",
  "known_chunk": "the",
  "parent_lego_id": "S0015L01"
}
```

## Edge Cases and Tricky Decisions

### Case 1: Multi-word but Indivisible

**Example:** "por favor" → "please"

**Question:** COMPOSITE or BASE?

**Answer:** BASE

**Reasoning:**
- "por favor" is a fixed expression
- Breaking it into "por" + "favor" isn't pedagogically useful
- "por" alone doesn't mean anything specific here
- Treat as single unit

```json
{
  "lego_id": "S0030L01",
  "lego_type": "BASE",
  "target_chunk": "por favor",
  "known_chunk": "please"
}
```

### Case 2: Verb + Pronoun

**Example:** "no lo sé" → "I don't know"

**Question:** Extract "no lo" as COMPOSITE?

**Answer:** YES, if pedagogically valuable

```json
{
  "lego_id": "S0008L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "no lo",
  "known_chunk": "not it",
  "componentization": "not it = no lo, where no = not and lo = it"
}
```

FEEDERs:
```json
{
  "feeder_id": "S0008F01",
  "target_chunk": "no",
  "known_chunk": "not",
  "parent_lego_id": "S0008L01"
},
{
  "feeder_id": "S0008F02",
  "target_chunk": "lo",
  "known_chunk": "it",
  "parent_lego_id": "S0008L01"
}
```

### Case 3: Single Word with Internal Structure

**Example (Chinese):** "不知道" (bù zhīdào) → "don't know"

**Question:** COMPOSITE or BASE?

**Answer:** COMPOSITE (can break into morphemes)

```json
{
  "lego_id": "S0001L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "不知道",
  "known_chunk": "don't know",
  "componentization": "don't know = 不知道, where 不 = not and 知道 = know"
}
```

**Reasoning:**
- Even though it's written as one "word" in Chinese
- It has clear morpheme boundaries
- Each component (不, 知道) is pedagogically valuable

### Case 4: Contractions

**Example:** "I'm" in English side

**Question:** How to handle contractions?

**Answer:** Treat as atomic if it's the known chunk

```json
{
  "lego_id": "S0002F01",
  "target_chunk": "Estoy",
  "known_chunk": "I'm"
}
```

Don't break "I'm" into "I" + "am" - it's atomic in this context.

### Case 5: Ambiguous Boundaries

**Example:** "Estoy intentando hacer" → "I'm trying to do"

**Question:** Extract "Estoy intentando" or "intentando hacer"?

**Answer:** Extract the most pedagogically valuable chunk

**Option 1 (Recommended):**
```json
{
  "lego_id": "S0002L01",
  "lego_type": "COMPOSITE",
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying",
  "componentization": "..."
}
```

**Reasoning:**
- "Estoy intentando" is a complete, reusable phrase
- "intentando hacer" is less useful (depends on context)

## Validation Checklist

Before finalizing a LEGO classification:

**Note:** "FD validation" refers to **Functional Determinism + FCFS** (First Come First Served). See [FD_VALIDATION.md](./FD_VALIDATION.md) for complete test logic. In brief:
- **FD:** Learner sees known chunk → knows exactly ONE target response
- **FCFS:** First occurrence of known chunk claims that mapping

### For BASE LEGOs:
- [ ] Cannot be meaningfully broken down
- [ ] Has pedagogical value as-is
- [ ] Passes FD validation
- [ ] No componentization field

### For COMPOSITE LEGOs:
- [ ] Contains multiple meaningful parts
- [ ] Each part has pedagogical value
- [ ] Has componentization field
- [ ] Has corresponding FEEDERs in feeder_pairs
- [ ] Passes FD validation
- [ ] Componentization accurately explains breakdown

### For FEEDERs:
- [ ] Has parent_lego_id
- [ ] Parent is a COMPOSITE LEGO
- [ ] Mentioned in parent's componentization
- [ ] Passes FD validation independently
- [ ] Has pedagogical value on its own

## Common Classification Mistakes

❌ **Mistake 1: Over-splitting BASE LEGOs**
```json
// BAD: Splitting "hola" unnecessarily
{
  "lego_type": "COMPOSITE",
  "target_chunk": "hola",
  "componentization": "ho + la"
}
```

✅ **Correct:**
```json
{
  "lego_type": "BASE",
  "target_chunk": "Hola",
  "known_chunk": "Hello"
}
```

---

❌ **Mistake 2: Treating COMPOSITE as BASE**
```json
// BAD: Missing valuable components
{
  "lego_type": "BASE",
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying"
}
```

✅ **Correct:**
```json
{
  "lego_type": "COMPOSITE",
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying",
  "componentization": "..."
}
```

---

❌ **Mistake 3: FEEDERs without Parents**
```json
// BAD: Orphaned feeder
{
  "feeder_id": "S0002F01",
  "target_chunk": "Estoy",
  "known_chunk": "I'm"
  // Missing parent_lego_id!
}
```

✅ **Correct:**
```json
{
  "feeder_id": "S0002F01",
  "target_chunk": "Estoy",
  "known_chunk": "I'm",
  "parent_lego_id": "S0002L01"
}
```
