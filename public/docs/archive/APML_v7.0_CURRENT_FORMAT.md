# APML v7.0 - CURRENT FORMAT SPECIFICATION

**Last Updated:** October 23, 2024
**Status:** Active Production Format
**Reference Implementation:** test_for_eng_5seeds (Oct 22, 2024)

---

## 🎯 Design Philosophy

**Ultra-Compact JSON Arrays** - Maximum information density, minimal verbosity
- Use arrays instead of verbose objects where possible
- Single-letter type codes (B/C/F instead of "BASE"/"COMPOSITE"/"FEEDER")
- Inline structure, no separate UUID files
- All phase outputs in single consolidated JSON files

---

## 📁 File Structure

```
vfs/courses/{lang}_for_{lang}_{n}seeds/
├── seed_pairs.json          # Phase 1 output
├── lego_pairs.json          # Phase 3 output
├── lego_baskets.json        # Phase 5 output
├── introductions.json       # Phase 6 output (optional)
└── phase_outputs/           # Intermediate processing files
    ├── phase_2_corpus_intelligence.json
    └── phase_3_lego_graph.json
```

---

## 📋 Phase 1: Translations

**Filename:** `seed_pairs.json`

**Structure:**
```json
{
  "version": "7.0",
  "translations": {
    "S0001": ["target_phrase", "known_phrase"],
    "S0002": ["target_phrase", "known_phrase"]
  }
}
```

**Format Rules:**
- Top-level: `version` (string) + `translations` (object)
- Key: Seed ID in format `S####` (4 digits, zero-padded)
- Value: Array `[target, known]` - always 2 strings
- Target = target language sentence (pedagogically optimized)
- Known = known language sentence (pedagogically optimized)

**Example:**
```json
{
  "version": "7.0",
  "translations": {
    "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
    "S0002": ["Estoy intentando aprender.", "I'm trying to learn."]
  }
}
```

---

## 📋 Phase 3: LEGO Decomposition

**Filename:** `lego_pairs.json`

**Structure:**
```json
{
  "version": "7.0",
  "seeds": [
    [
      "S0001",
      ["target_full_sentence", "known_full_sentence"],
      [
        ["S0001L01", "B", "target_chunk", "known_chunk"],
        ["S0001L02", "C", "composite_target", "composite_known", [
          ["S0001F01", "F", "feeder1_target", "feeder1_known"],
          ["S0001F02", "F", "feeder2_target", "feeder2_known"]
        ]]
      ]
    ]
  ]
}
```

**Format Rules:**
- Top-level: `version` + `seeds` (array)
- Each seed: `[seed_id, [target, known], lego_array]`
- Each LEGO: `[lego_id, type, target_chunk, known_chunk]` OR with feeders: `[..., [feeder_array]]`
- LEGO types: `"B"` (BASE), `"C"` (COMPOSITE), `"F"` (FEEDER)
- LEGO IDs: `S####L##` (LEGOs), `S####F##` (FEEDERs)
- FEEDERs only appear inside COMPOSITE LEGOs (5th element)

**LEGO Types:**

**BASE (B):**
- Atomic, indivisible FD unit
- Example: `["S0001L01", "B", "Quiero", "I want"]`

**COMPOSITE (C):**
- Multi-word FD unit containing BASE LEGOs that don't tile cleanly
- Includes FEEDER array as 5th element
- Example: `["S0002L01", "C", "Estoy intentando", "I'm trying", [feeders]]`

**FEEDER (F):**
- BASE LEGO participating in a COMPOSITE
- Only exists inside COMPOSITE's feeder array
- Example: `["S0002F01", "F", "Estoy", "I'm"]`

**Example:**
```json
{
  "version": "7.0",
  "seeds": [
    ["S0001", ["Quiero hablar español.", "I want to speak Spanish."], [
      ["S0001L01", "B", "Quiero", "I want"],
      ["S0001L02", "B", "hablar", "to speak"],
      ["S0001L03", "B", "español", "Spanish"]
    ]],
    ["S0002", ["Estoy intentando aprender.", "I'm trying to learn."], [
      ["S0002L01", "C", "Estoy intentando", "I'm trying", [
        ["S0002F01", "F", "Estoy", "I'm"],
        ["S0002F02", "F", "intentando", "trying"]
      ]],
      ["S0002L02", "B", "aprender", "to learn"]
    ]]
  ]
}
```

---

## 📋 Phase 5: LEGO Baskets

**Filename:** `lego_baskets.json`

**Structure:**
```json
{
  "version": "7.0",
  "baskets": {
    "S0001L01": [
      ["lego_target", "lego_known"],
      [
        ["e_phrase_target", "e_phrase_known"]
      ],
      [
        [["d2_target", "d2_known"]],
        [["d3_target", "d3_known"]],
        [["d4_target", "d4_known"]],
        [["d5_target", "d5_known"]]
      ]
    ]
  }
}
```

**Format Rules:**
- Top-level: `version` + `baskets` (object)
- Key: LEGO ID (`S####L##`)
- Value: `[lego_pair, e_phrases, d_phrases]`
  - `lego_pair`: `[target, known]` - the LEGO itself
  - `e_phrases`: Array of `[target, known]` pairs (enabling phrases - full sentence context)
  - `d_phrases`: Array of 4 arrays (d2, d3, d4, d5) - each containing `[target, known]` pairs

**d-phrases (discovery phrases):**
- d2: 2-word patterns containing this LEGO
- d3: 3-word patterns
- d4: 4-word patterns
- d5: 5-word patterns

**Example:**
```json
{
  "version": "7.0",
  "baskets": {
    "S0001L01": [
      ["Quiero", "I want"],
      [
        ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."]
      ],
      [
        [["Quiero hablar", "I want to speak"]],
        [["Quiero hablar español", "I want to speak Spanish"]],
        [["Quiero hablar español contigo", "I want to speak Spanish with you"]],
        []
      ]
    ],
    "S0001L02": [
      ["hablar", "to speak"],
      [],
      [[], [], [], []]
    ]
  }
}
```

---

## 📋 Phase 6: Introductions (Optional)

**Filename:** `introductions.json`

**Structure:** TBD - format to be defined when Phase 6 is implemented

---

## 🔄 Evolution Notes

**Format History:**
- **Oct 10:** Amino acid model with individual UUID files (mkd_for_eng_574seeds)
- **Oct 15:** Interim format with `translations.json` + `LEGO_BREAKDOWNS_COMPLETE.json`
- **Oct 22:** Current ultra-compact format with `seed_pairs.json` + `lego_pairs.json` + `lego_baskets.json`

**Key Improvements in v7.0:**
- ✅ Ultra-compact arrays reduce file size 40-60%
- ✅ Single-letter type codes (B/C/F) for clarity
- ✅ Inline structure eliminates UUID lookup overhead
- ✅ Consolidated files simplify API reading
- ✅ Direct mapping to app consumption format

---

## 🚨 Breaking Changes from Previous Versions

1. **Filename changes:**
   - `translations.json` → `seed_pairs.json`
   - `LEGO_BREAKDOWNS_COMPLETE.json` → `lego_pairs.json`
   - `baskets.json` → `lego_baskets.json`

2. **Structure changes:**
   - LEGOs now in seed-centric array format (not object with lego_breakdowns)
   - Type codes now single letters: "BASE" → "B", "COMPOSITE" → "C", "FEEDER" → "F"
   - FEEDERs embedded in COMPOSITE LEGOs (not separate entries)

3. **Removed concepts:**
   - Individual UUID files (amino_acids/ directories)
   - Verbose object keys (target_chunk, known_chunk, lego_type)
   - Separate metadata objects

---

## ✅ Validation

**JSON Schema Location:** `/schemas/`
- `phase1-seed_pairs.json`
- `phase3-lego_pairs.json`
- `phase5-lego_baskets.json`

**Example Files:** `/schemas/examples/`
- `seed_pairs-example.json`
- `lego_pairs-example.json`
- `lego_baskets-example.json`

---

## 🎯 Migration Checklist

When updating old format courses:

- [ ] Rename `translations.json` → `seed_pairs.json`
- [ ] Wrap translations in `{version: "7.0", translations: {...}}`
- [ ] Convert `LEGO_BREAKDOWNS_COMPLETE.json` → `lego_pairs.json`
- [ ] Restructure LEGOs: object-based → seed-centric array format
- [ ] Convert type strings: "BASE"/"COMPOSITE"/"FEEDER" → "B"/"C"/"F"
- [ ] Embed FEEDERs inside COMPOSITE LEGOs (5th element)
- [ ] Rename `baskets.json` → `lego_baskets.json` (structure already correct)
- [ ] Update API endpoints to read new filenames
- [ ] Update view components to parse new format
- [ ] Test browsing in dashboard
