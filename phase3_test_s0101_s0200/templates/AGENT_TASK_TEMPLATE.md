# Phase 3 Agent Task: LEGO Extraction for S0XXX-S0XXX

## Your Mission

Extract LEGOs (Functionally Deterministic chunks) from 10 Spanish seeds using bidirectional sweep and FD principles.

**Input**: `batch_input/seeds_0XXX_0XXX.json` (10 seeds)
**Reference**: `templates/lego_registry_s0001_s0100.json` (278 existing LEGOs)
**Output**: `batch_output/batch_XX_provisional.json`

---

## Core Principles (from Quality Review)

### 1. FD (Functionally Deterministic) - GOLDEN RULE

**IF IN DOUBT → CHUNK UP**

A LEGO is FD if learners know EXACTLY one TARGET for one KNOWN (and vice versa):
- ✅ "quiero" = "I want" (1:1, unambiguous)
- ✅ "estoy intentando" = "I'm trying" (1:1, chunked correctly)
- ❌ "que" alone = ambiguous (needs context: "que hables", "después de que")

### 2. Complete Tiling

Every seed MUST be fully reconstructable from its LEGOs:
- Show ALL LEGOs (new + referenced)
- Account for ALL WORDS in the seed
- Test: Can you rebuild the seed from the LEGOs? If no → missing LEGO

### 3. Atomic vs Molecular

**Atomic (A)**: Single-word FD units
- "quiero" = "I want"
- "hablar" = "to speak"
- "español" = "Spanish"
- "más" = "more"

**Molecular (M)**: Multi-word FD units (patterns, idioms, subjunctive triggers)
- "estoy intentando" = "I'm trying" (present continuous)
- "voy a" = "I'm going to" (near future)
- "me gustaría" = "I'd like" (conditional)
- "después de que" = "after" (subjunctive trigger)

**Rule**: If breaking into smaller parts creates ambiguity → keep as Molecular

### 4. Componentization (M-type LEGOs only)

For EVERY Molecular LEGO, show ALL WORDS with literal translations:

**Example 1**: "estoy intentando" = "I'm trying"
```json
{
  "components": [
    ["estoy", "I am"],
    ["intentando", "trying"]
  ]
}
```

**Example 2**: "después de que termines" = "after you finish"
```json
{
  "components": [
    ["después de", "after"],
    ["que", "that"],
    ["termines", "you finish (subjunctive)"]
  ]
}
```

**Critical**: ALL WORDS must appear. If you reference an existing LEGO in components, use its ID:

```json
{
  "components": [
    ["voy", "I go"],
    ["a", "to"],
    ["comenzar", {"ref": "S0023L01"}],  // "comenzar a hablar" already exists
    ["más", {"ref": "S0023L02"}]
  ]
}
```

---

## Extraction Process (Step-by-Step)

### Step 1: Read Your Batch

Load `batch_input/seeds_0XXX_0XXX.json` - you'll see 10 seeds like:

```json
{
  "batch_id": "S0101_S0110",
  "batch_number": 1,
  "seeds": [
    {
      "seed_id": "S0101",
      "seed_pair": {
        "target": "Estoy disfrutando descubrir más sobre este lenguaje",
        "known": "I'm enjoying finding out more about this language."
      }
    },
    ...
  ]
}
```

### Step 2: Load LEGO Registry

Read `templates/lego_registry_s0001_s0100.json` to check existing LEGOs:

```json
{
  "quiero": {"id": "S0001L01", "type": "A", "seed": "S0001"},
  "hablar": {"id": "S0001L02", "type": "A", "seed": "S0001"},
  "estoy intentando": {"id": "S0002L01", "type": "M", "seed": "S0002"},
  ...
}
```

**Use this to mark references**, not new LEGOs.

### Step 3: Bidirectional Sweep

For each seed, extract LEGOs using BOTH directions:

**Forward (Target → Known)**: Split Spanish into FD chunks
```
"Estoy disfrutando descubrir más sobre este lenguaje"
→ estoy disfrutando | descubrir | más | sobre | este | lenguaje
```

**Backward (Known → Target)**: Check English for expected chunks
```
"I'm enjoying finding out more about this language"
→ I'm enjoying | finding out | more | about | this | language
```

**Align**: Do chunks map 1:1?
- "estoy disfrutando" = "I'm enjoying" ✅
- "descubrir" = "finding out" (check: could be "to find out") ✅
- "más" = "more" ✅
- "sobre" = "about" ✅
- "este" = "this" ✅
- "lenguaje" = "language" ✅

### Step 4: Classify A or M

For each chunk:
- **Single word + unambiguous** → A
- **Multi-word OR pattern** → M
- **Ambiguous if split** → M (chunk up!)

### Step 5: Check Against Registry

For each LEGO:
```javascript
const targetKey = lego.target.toLowerCase();
if (registry[targetKey]) {
  // EXISTS! Mark as reference
  lego.id = registry[targetKey].id;
  lego.ref = registry[targetKey].seed;
  lego.new = false;
} else {
  // NEW! Mark as provisional (merge will assign final ID)
  lego.provisional_id = `PROV_${seedId}_${legoNum}`;
  lego.new = true;
}
```

### Step 6: Componentize M-types

For EVERY M-type LEGO, break down ALL WORDS:

**Example**: "estoy disfrutando" = "I'm enjoying"
```json
{
  "provisional_id": "PROV_S0101_01",
  "type": "M",
  "target": "estoy disfrutando",
  "known": "I'm enjoying",
  "new": true,
  "components": [
    ["estoy", "I am"],
    ["disfrutando", "enjoying"]
  ]
}
```

**Check**: Does "estoy" exist as a separate LEGO? If yes, optionally reference it:
```json
{
  "components": [
    ["estoy", {"ref": "S0041L03"}],  // If "estoy" was introduced in S0041
    ["disfrutando", "enjoying"]
  ]
}
```

### Step 7: Validate Complete Tiling

Before finalizing, reconstruct the seed:
- Join all LEGO targets (in order)
- Does it match the original seed?
- If no → you're missing a LEGO or have wrong boundaries

### Step 8: Output JSON

Write `batch_output/batch_XX_provisional.json`:

```json
{
  "batch_id": "S0101_S0110",
  "batch_number": 1,
  "extractor": "Agent X",
  "extracted_at": "2025-11-07T12:00:00Z",
  "seeds": [
    {
      "seed_id": "S0101",
      "seed_pair": {
        "target": "Estoy disfrutando descubrir más sobre este lenguaje",
        "known": "I'm enjoying finding out more about this language."
      },
      "legos": [
        {
          "provisional_id": "PROV_S0101_01",
          "type": "M",
          "target": "estoy disfrutando",
          "known": "I'm enjoying",
          "new": true,
          "components": [
            ["estoy", "I am"],
            ["disfrutando", "enjoying"]
          ]
        },
        {
          "provisional_id": "PROV_S0101_02",
          "type": "A",
          "target": "descubrir",
          "known": "to find out",
          "new": true
        },
        {
          "id": "S0023L02",
          "type": "A",
          "target": "más",
          "known": "more",
          "ref": "S0023",
          "new": false
        },
        {
          "provisional_id": "PROV_S0101_03",
          "type": "A",
          "target": "sobre",
          "known": "about",
          "new": true
        },
        {
          "id": "S0067L01",
          "type": "A",
          "target": "este",
          "known": "this",
          "ref": "S0067",
          "new": false
        },
        {
          "provisional_id": "PROV_S0101_04",
          "type": "A",
          "target": "lenguaje",
          "known": "language",
          "new": true
        }
      ]
    },
    ...
  ]
}
```

---

## Quality Self-Check (Before Submitting)

### ✅ FD Compliance
- [ ] Every LEGO has exactly one KNOWN → TARGET mapping
- [ ] No ambiguous chunks (like "que" alone, "de" alone)
- [ ] Molecular boundaries make sense (subjunctive triggers included)

### ✅ Complete Tiling
- [ ] All 10 seeds reconstructible from LEGOs
- [ ] Every word accounted for
- [ ] New + referenced LEGOs shown

### ✅ Componentization
- [ ] ALL M-type LEGOs have components
- [ ] ALL WORDS in each M-type appear in components
- [ ] Literal translations (pedagogically transparent)
- [ ] Optional: Reference existing LEGOs where possible

### ✅ A/M Classification
- [ ] Atomic: single-word, unambiguous
- [ ] Molecular: multi-word OR pattern OR ambiguous if split

### ✅ Registry Alignment
- [ ] Checked all LEGOs against S0001-S0100 registry
- [ ] Marked existing LEGOs with proper ID and ref
- [ ] Marked new LEGOs with provisional_id and new: true

---

## Common Patterns to Watch For (from S0001-S0100)

### Pattern P01: Quiero/Quiere/Queremos + infinitive
**Extraction**: "quiero" (A) + "hablar" (A) separately, NOT "quiero hablar" (M)
**Why**: "quiero" reuses with many verbs

### Pattern P02: Estoy/Está/Están + gerund
**Extraction**: "estoy intentando" (M) together
**Why**: Present continuous is a unit

### Pattern P03: Voy a/Vas a/Va a + infinitive
**Extraction**: "voy a" (M) together
**Why**: Near future pattern

### Pattern P04: Me gustaría/Te gustaría + infinitive
**Extraction**: "me gustaría" (M) together
**Why**: Conditional desire idiom

### Pattern P10: Subjunctive triggers
**Extraction**: "después de que" (M), "quiero que" (M)
**Why**: Trigger must stay with subjunctive marker

### Pattern P12: Question words
**Extraction**: "cómo" (A), "por qué" (M, two words), "cuándo" (A)
**Why**: Most question words are atomic

---

## Edge Cases (from Quality Review)

### Case 1: Prepositions
**Issue**: Is "con" alone atomic or needs context?
**Answer**: "con" = "with" (A) ✅ - reusable in many contexts

### Case 2: Verb + Infinitive Patterns
**Issue**: "practicar hablar" - one LEGO or two?
**Answer**: "practicar hablar" (M) ✅ - shows verb + infinitive pattern clearly

### Case 3: Reflexive Verbs
**Issue**: "reunirse" - atomic or molecular?
**Answer**: "reunirse" (A) ✅ - if it's a complete reflexive verb form

### Case 4: Articles
**Issue**: "los demás" - include article?
**Answer**: "los demás" (M) ✅ - shows article pattern in Spanish

---

## Example: Worked Extraction (S0101)

**Seed**: "Estoy disfrutando descubrir más sobre este lenguaje"
**Known**: "I'm enjoying finding out more about this language."

### Bidirectional Sweep

**Forward**:
```
Estoy disfrutando | descubrir | más | sobre | este | lenguaje
```

**Backward**:
```
I'm enjoying | finding out | more | about | this | language
```

### Alignment Check

| Target | Known | FD? | Type | Why |
|--------|-------|-----|------|-----|
| estoy disfrutando | I'm enjoying | ✅ | M | Present continuous pattern |
| descubrir | to find out | ✅ | A | Single verb (infinitive form) |
| más | more | ✅ | A | Single word, unambiguous |
| sobre | about | ✅ | A | Preposition, reusable |
| este | this | ✅ | A | Demonstrative, reusable |
| lenguaje | language | ✅ | A | Noun, unambiguous |

### Registry Check

- "estoy disfrutando" → NOT in registry → **NEW**
- "descubrir" → NOT in registry → **NEW**
- "más" → IN registry (S0023L02) → **REFERENCE**
- "sobre" → NOT in registry → **NEW**
- "este" → Check registry... (assume found in S0067) → **REFERENCE**
- "lenguaje" → NOT in registry → **NEW**

### Componentization (M-type only)

"estoy disfrutando" components:
```json
{
  "components": [
    ["estoy", "I am"],
    ["disfrutando", "enjoying"]
  ]
}
```

### Final Output

```json
{
  "seed_id": "S0101",
  "legos": [
    {
      "provisional_id": "PROV_S0101_01",
      "type": "M",
      "target": "estoy disfrutando",
      "known": "I'm enjoying",
      "new": true,
      "components": [
        ["estoy", "I am"],
        ["disfrutando", "enjoying"]
      ]
    },
    {
      "provisional_id": "PROV_S0101_02",
      "type": "A",
      "target": "descubrir",
      "known": "to find out",
      "new": true
    },
    {
      "id": "S0023L02",
      "type": "A",
      "target": "más",
      "known": "more",
      "ref": "S0023",
      "new": false
    },
    {
      "provisional_id": "PROV_S0101_03",
      "type": "A",
      "target": "sobre",
      "known": "about",
      "new": true
    },
    {
      "id": "S0067L01",
      "type": "A",
      "target": "este",
      "known": "this",
      "ref": "S0067",
      "new": false
    },
    {
      "provisional_id": "PROV_S0101_04",
      "type": "A",
      "target": "lenguaje",
      "known": "language",
      "new": true
    }
  ]
}
```

### Validation

**Reconstruction**:
```
estoy disfrutando + descubrir + más + sobre + este + lenguaje
= "Estoy disfrutando descubrir más sobre este lenguaje" ✅
```

**All words accounted for**: ✅
**FD compliance**: ✅
**Complete tiling**: ✅ (6 LEGOs: 4 new, 2 ref)

---

## Time Estimate

**Per seed**: ~1-2 minutes
**Your batch (10 seeds)**: ~15-20 minutes total

Work carefully but efficiently. Quality > speed.

---

## Questions?

If you're unsure about:
1. **FD boundaries** → CHUNK UP (prefer larger units)
2. **A vs M** → If multi-word or pattern → M
3. **Componentization** → Show ALL WORDS with literal translations
4. **Registry lookup** → Use exact lowercase match on `target`

Good luck! 🚀
