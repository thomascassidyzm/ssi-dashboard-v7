# Phase 5.5 → 6 → 7 Data Transformation

**Purpose**: How deduplicated LEGOs and introductions become app-ready course JSON

---

## The Pipeline

```
Phase 5.5 (Deduplication)
    ↓
lego_pairs_deduplicated.json + lego_baskets_deduplicated.json
    ↓
Phase 6 (Introductions)
    ↓
introductions.json
    ↓
Phase 7 (Compilation)
    ↓
course_manifest.json (app-ready)
```

---

## Phase 5.5 Output: Deduplicated LEGOs

### lego_pairs_deduplicated.json

```json
[
  [
    "S0001",
    ["Quiero hablar español contigo ahora", "I want to speak Spanish with you now"],
    [
      ["S0001L01", "B", "Quiero", "I want"],
      ["S0001L02", "B", "hablar", "to speak"],
      ["S0001L03", "B", "español", "Spanish"]
    ]
  ],
  [
    "S0002",
    ["Estoy intentando aprender", "I'm trying to learn"],
    [
      ["S0002L01", "C", "Estoy intentando", "I'm trying", [
        ["Estoy", "I am"],
        ["intentando", "trying"]
      ]],
      ["S0002L02", "B", "aprender", "to learn"]
    ]
  ]
]
```

**Key Points**:
- Array of `[seedId, [target, known], [...legos]]`
- **BASE LEGO** (type "B"): `[legoId, "B", target, known]`
- **COMPOSITE LEGO** (type "C"): `[legoId, "C", target, known, [[part1_target, part1_known], ...]]`
- Duplicates removed (~20-30% reduction)

### lego_baskets_deduplicated.json

```json
{
  "baskets": {
    "S0001L02": [
      ["hablar", "to speak"],
      [
        ["hablar español", "to speak Spanish"],
        ["hablar contigo", "to speak with you"]
      ],
      [
        [
          ["Quiero hablar", "I want to speak"],
          ["hablar español", "to speak Spanish"]
        ],
        [
          ["hablar español contigo", "to speak Spanish with you"],
          ["Quiero hablar español", "I want to speak Spanish"]
        ],
        // ... more windows ...
      ]
    ]
  }
}
```

**Structure**: `[lego_pair, full_sentences, [window2, window3, window4, window5]]`
- Window 2: 2-LEGO combinations
- Window 3: 3-LEGO combinations
- Window 4: 4-LEGO combinations
- Window 5: 5-LEGO combinations

---

## Phase 6 Output: Introductions

### introductions.json

```json
{
  "version": "7.8.0",
  "course": "spa_for_eng_20seeds",
  "target": "spa",
  "known": "eng",
  "generated": "2025-10-28T16:58:41.089Z",
  "introductions": {
    "S0001L01": "Now, the Spanish for \"I want\" as in \"I want to speak Spanish with you now\" is \"Quiero\", Quiero.",
    "S0002L01": "The Spanish for \"I'm trying\" as in \"I'm trying to learn\" is \"Estoy intentando\" - where \"Estoy\" means \"I am\" and \"intentando\" means \"trying\"."
  }
}
```

**Key Points**:
- One presentation text per LEGO ID
- **BASE format**: "Now, the {lang} for '{known}' as in '{seed}' is '{target}', {target}."
- **COMPOSITE format**: "The {lang} for '{known}' as in '{seed}' is '{target}' - where {components}."
- Components use "means": "'Estoy' means 'I am'"

---

## Phase 7 Output: App-Ready Manifest

### course_manifest.json

```json
{
  "id": "spa-eng",
  "version": "7.7.0",
  "target": "spa",
  "known": "eng",
  "slices": [
    {
      "id": "uuid",
      "version": "7.7.0",
      "seeds": [...],
      "samples": {...}
    }
  ]
}
```

---

## The Transformation (Phase 7 Logic)

### Input Files
1. **seed_pairs.json** - Original seed sentences
2. **lego_pairs_deduplicated.json** - Deduplicated LEGOs with components
3. **lego_baskets_deduplicated.json** - Practice phrases (expanding windows)
4. **introductions.json** - Presentation text

### Step 1: Create Seed Structure

**From**: `seed_pairs.json` + `lego_pairs_deduplicated.json` + `introductions.json`

```javascript
// For each seed in lego_pairs_deduplicated.json:
const [seedId, [targetSeed, knownSeed], legos] = seed;

const seedObject = {
  id: generateUUID(),
  node: {
    id: generateUUID(),
    target: { tokens: [], text: targetSeed, lemmas: [] },
    known: { tokens: [], text: knownSeed, lemmas: [] }
  },
  seedSentence: {
    canonical: knownSeed
  },
  introductionItems: [] // Will populate next
};
```

**Result**:
```json
{
  "id": "40617b4f-15cb-47ef-8fb4-920758a3251b",
  "node": {
    "id": "32e00b12-6d79-43c7-8a8f-da686a65695e",
    "target": {
      "tokens": [],
      "text": "Quiero hablar español contigo ahora",
      "lemmas": []
    },
    "known": {
      "tokens": [],
      "text": "I want to speak Spanish with you now",
      "lemmas": []
    }
  },
  "seedSentence": {
    "canonical": "I want to speak Spanish with you now"
  },
  "introductionItems": []
}
```

---

### Step 2: Create Introduction Items (LEGOs)

**For each LEGO** in the seed:

```javascript
const [legoId, type, target, known, components] = lego;
const presentation = introductions[legoId]; // From introductions.json
const basket = baskets[legoId]; // From lego_baskets_deduplicated.json

const introItem = {
  id: generateUUID(),
  node: {
    id: generateUUID(),
    target: { tokens: [], text: target, lemmas: [] },
    known: { tokens: [], text: known, lemmas: [] }
  },
  presentation: presentation,
  nodes: [] // Practice phrases from basket
};
```

**Result**:
```json
{
  "id": "a900e7c1-c741-4706-b628-8072335a57c7",
  "node": {
    "id": "26b14acc-8668-4a0b-8f31-126f87263d55",
    "target": {
      "tokens": [],
      "text": "Quiero",
      "lemmas": []
    },
    "known": {
      "tokens": [],
      "text": "I want",
      "lemmas": []
    }
  },
  "presentation": "Now, the Spanish for \"I want\" as in \"I want to speak Spanish with you now\" is \"Quiero\", Quiero.",
  "nodes": []
}
```

---

### Step 3: Add Practice Phrases (from Baskets)

**From basket structure**: `[lego_pair, full_sentences, [window2, window3, window4, window5]]`

```javascript
const [legoPair, fullSentences, windows] = basket;

// Flatten all windows into practice nodes
for (const window of windows) {
  for (const [targetPhrase, knownPhrase] of window) {
    const practiceNode = {
      id: generateUUID(),
      target: { tokens: [], text: targetPhrase, lemmas: [] },
      known: { tokens: [], text: knownPhrase, lemmas: [] }
    };
    introItem.nodes.push(practiceNode);
  }
}
```

**Result** (practice phrases added to introItem.nodes):
```json
{
  "id": "a900e7c1-c741-4706-b628-8072335a57c7",
  "node": {
    "target": { "tokens": [], "text": "Quiero", "lemmas": [] },
    "known": { "tokens": [], "text": "I want", "lemmas": [] }
  },
  "presentation": "Now, the Spanish for \"I want\"...",
  "nodes": [
    {
      "id": "uuid1",
      "target": { "tokens": [], "text": "Quiero hablar", "lemmas": [] },
      "known": { "tokens": [], "text": "I want to speak", "lemmas": [] }
    },
    {
      "id": "uuid2",
      "target": { "tokens": [], "text": "Quiero hablar español", "lemmas": [] },
      "known": { "tokens": [], "text": "I want to speak Spanish", "lemmas": [] }
    }
  ]
}
```

---

### Step 4: Build Audio Samples Registry

**For ALL text** (seeds, LEGOs, practice phrases, presentations):

```javascript
// For target language text
registerSample(text, targetLang, 'target1', 'natural');
registerSample(text, targetLang, 'target2', 'natural');

// For known/source language text
registerSample(text, knownLang, 'source', 'natural');

function registerSample(text, lang, role, cadence) {
  const uuid = generateDeterministicUUID(text, lang, role, cadence);

  if (!samples[text]) samples[text] = [];
  samples[text].push({ id: uuid, cadence, role });
}
```

**Deterministic UUID Algorithm**:
```javascript
// SHA-1 hash of: text|language|role|cadence
const hash = sha1(`${text}|${lang}|${role}|${cadence}`);

// SSi legacy format: XXXXXXXX-6044-YYYY-ZZZZ-XXXXXXXXXXXX
const uuid = `${hash.slice(0,8)}-6044-${roleSegments[role].seg3}-${roleSegments[role].seg4}-${hash.slice(-12)}`;

const roleSegments = {
  'target1': { seg3: 'AC07', seg4: '8F4E' },
  'target2': { seg3: 'E115', seg4: '8F4E' },
  'source':  { seg3: '36CD', seg4: '31D4' }
};
```

**Result** (samples object):
```json
{
  "samples": {
    "Quiero": [
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
    ],
    "Now, the Spanish for \"I want\" as in...": [
      {
        "id": "uuid-presentation-source",
        "cadence": "natural",
        "role": "source"
      }
    ]
  }
}
```

---

## Complete Example: One LEGO Through All Phases

### Phase 5.5 Input
```json
["S0002L01", "C", "Estoy intentando", "I'm trying", [
  ["Estoy", "I am"],
  ["intentando", "trying"]
]]
```

### Phase 6 Output
```json
{
  "S0002L01": "The Spanish for \"I'm trying\" as in \"I'm trying to learn\" is \"Estoy intentando\" - where \"Estoy\" means \"I am\" and \"intentando\" means \"trying\"."
}
```

### Phase 5.5 Basket
```json
{
  "S0002L01": [
    ["Estoy intentando", "I'm trying"],
    [
      ["Estoy intentando aprender", "I'm trying to learn"]
    ],
    [
      [
        ["Quiero Estoy intentando", "I want I'm trying"],
        ["Estoy intentando hablar", "I'm trying to speak"]
      ]
    ]
  ]
}
```

### Phase 7 Output (in manifest)
```json
{
  "id": "uuid-intro-item",
  "node": {
    "id": "uuid-node",
    "target": {
      "tokens": [],
      "text": "Estoy intentando",
      "lemmas": []
    },
    "known": {
      "tokens": [],
      "text": "I'm trying",
      "lemmas": []
    }
  },
  "presentation": "The Spanish for \"I'm trying\" as in \"I'm trying to learn\" is \"Estoy intentando\" - where \"Estoy\" means \"I am\" and \"intentando\" means \"trying\".",
  "nodes": [
    {
      "id": "uuid-practice1",
      "target": {
        "tokens": [],
        "text": "Estoy intentando aprender",
        "lemmas": []
      },
      "known": {
        "tokens": [],
        "text": "I'm trying to learn",
        "lemmas": []
      }
    },
    {
      "id": "uuid-practice2",
      "target": {
        "tokens": [],
        "text": "Estoy intentando hablar",
        "lemmas": []
      },
      "known": {
        "tokens": [],
        "text": "I'm trying to speak",
        "lemmas": []
      }
    }
  ]
}
```

### Samples Generated
```json
{
  "Estoy intentando": [
    { "id": "uuid-target1", "cadence": "natural", "role": "target1" },
    { "id": "uuid-target2", "cadence": "natural", "role": "target2" }
  ],
  "I'm trying": [
    { "id": "uuid-source", "cadence": "natural", "role": "source" }
  ],
  "The Spanish for \"I'm trying\"...": [
    { "id": "uuid-presentation", "cadence": "natural", "role": "source" }
  ],
  "Estoy intentando aprender": [
    { "id": "uuid-practice1-target1", "cadence": "natural", "role": "target1" },
    { "id": "uuid-practice1-target2", "cadence": "natural", "role": "target2" }
  ],
  "I'm trying to learn": [
    { "id": "uuid-practice1-source", "cadence": "natural", "role": "source" }
  ]
}
```

---

## Automation Strategy

### Current State
- **Phase 5.5**: Script exists, not in automation server
- **Phase 6**: Script exists, **integrated** in automation server
- **Phase 7**: Script exists, **partially integrated** (basic)

### What's Needed

**1. Integrate Phase 5.5 into orchestration**
```javascript
// After Phase 5 complete
await runPhase5_5Deduplication(courseCode);
// Then Phase 6
```

**2. Enhance Phase 7 integration**
```javascript
// Read all required inputs
const seedPairs = await fs.readJson(path.join(courseDir, 'seed_pairs.json'));
const legoPairs = await fs.readJson(path.join(courseDir, 'lego_pairs_deduplicated.json'));
const baskets = await fs.readJson(path.join(courseDir, 'lego_baskets_deduplicated.json'));
const introductions = await fs.readJson(path.join(courseDir, 'introductions.json'));

// Run compilation script
const manifest = await compileManifest(seedPairs, legoPairs, baskets, introductions);

// Write output
await fs.writeJson(path.join(courseDir, 'course_manifest.json'), manifest);
```

**3. Validation**
- Verify all LEGOs have introductions
- Verify all text has audio samples
- Verify UUIDs are deterministic
- Verify single slice structure

---

## Key Transformations Summary

| Phase 5.5/6 Format | Phase 7 Format | Notes |
|-------------------|----------------|-------|
| `["S0001L01", "B", "Quiero", "I want"]` | `{node: {target: {text: "Quiero"}, known: {text: "I want"}}}` | Wrapped in node structure |
| Introduction text string | `presentation` field | Direct copy |
| Basket windows array | `nodes` array (flattened) | All windows merged |
| Components `[["Estoy", "I am"], ...]` | Embedded in presentation text | Not in manifest structure |
| N/A | `samples` object | Generated for all text |
| N/A | Empty `tokens`/`lemmas` | Legacy compatibility |

---

## Complete File Flow

```
seed_pairs.json (Phase 1)
    ↓
lego_pairs.json (Phase 3)
    ↓
lego_baskets.json (Phase 5)
    ↓
lego_pairs_deduplicated.json + lego_baskets_deduplicated.json (Phase 5.5)
    ↓
introductions.json (Phase 6)
    ↓
course_manifest.json (Phase 7)
    ↓
Audio files (Phase 8) - uses sample UUIDs
```

---

## Next Steps

1. **Test Phase 7 script** on spa_for_eng_60seeds with existing outputs
2. **Integrate Phase 5.5** into automation server orchestration
3. **Enhance Phase 7** automation to use full script (not basic implementation)
4. **Validate output** against app schema

The transformation is **deterministic** - same inputs always produce same manifest (including UUIDs).
