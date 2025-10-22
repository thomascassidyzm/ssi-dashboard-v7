# Phase 5 Basket Enrichment Guide

## Overview

Phase 5 baskets have been generated for the Irish (gle) course. All 124 baskets are currently **empty or sparse** - this is correct and follows APML progressive vocabulary rules.

## Current State

- **Total baskets**: 124 (93 LEGOs + 31 Feeders)
- **All baskets created in FCFS order** (First-Come-First-Served)
- **Structure**: Complete and validated
- **Content**: Intentionally empty/sparse awaiting linguist enrichment

## Progressive Vocabulary Rules

**Critical Rule**: LEGO #N can ONLY use vocabulary from LEGOs #1 to #(N-1)

This means:
- **First 5-10 LEGOs**: Will have EMPTY baskets (no prior vocabulary available)
- **LEGOs 10-30**: Will have LIMITED baskets (some vocabulary available)
- **LEGOs 30+**: Will have RICHER baskets (more vocabulary available)

## Basket Structure

Each basket contains:
```json
{
  "LEGO_ID": {
    "lego": ["Irish phrase", "English translation"],
    "e": [],  // Elaborative phrases (5 phrases, 7-10 words each)
    "d": {    // Demonstrative phrases by window size
      "2": [],
      "3": [],
      "4": [],
      "5": []
    }
  }
}
```

## E-Phrases (Elaborative)

**Requirements**:
- 5 phrases per basket
- 7-10 words per phrase
- Perfect Irish grammar
- Must use ONLY vocabulary from previous LEGOs
- Syntactically correct in BOTH languages

**Example for S0010L02** (if vocabulary available):
```json
"e": [
  ["An féidir liom labhairt Gaeilge leat anois?", "Can I speak Irish with you now?"],
  ["An féidir liom foghlaim rud éigin nua inniu?", "Can I learn something new today?"],
  ["An féidir liom iarraidh a mheabhrú an focal?", "Can I try to remember the word?"],
  ["An féidir liom tosú ag caint go luath?", "Can I start talking soon?"],
  ["An féidir liom bualadh leat níos déanaí?", "Can I meet you later?"]
]
```

## D-Phrases (Demonstrative)

**Requirements**:
- Organized by window size (2, 3, 4, 5 LEGOs)
- Must use ONLY vocabulary from previous LEGOs
- Shows how to combine LEGOs in context
- Syntactically correct in BOTH languages

**Example for S0010L02** (if vocabulary available):
```json
"d": {
  "2": [
    ["An féidir liom labhairt", "Can I speak"],
    ["An féidir liom foghlaim", "Can I learn"],
    ["An féidir liom iarraidh", "Can I try"]
  ],
  "3": [
    ["An féidir liom labhairt Gaeilge", "Can I speak Irish"],
    ["An féidir liom foghlaim rud éigin", "Can I learn something"],
    ["An féidir liom iarraidh anois", "Can I try now"]
  ],
  "4": [
    ["An féidir liom labhairt Gaeilge leat", "Can I speak Irish with you"],
    ["An féidir liom foghlaim rud éigin nua", "Can I learn something new"]
  ],
  "5": [
    ["An féidir liom labhairt Gaeilge leat anois", "Can I speak Irish with you now"]
  ]
}
```

## Enrichment Process

### For Early LEGOs (1-10):
- Most will remain **empty** (correct per APML)
- No vocabulary available yet
- Human linguist: Verify and mark as "intentionally empty"

### For Mid LEGOs (10-30):
- Will have **sparse** baskets (limited vocabulary)
- Human linguist: Add phrases using ONLY available vocabulary
- May not reach 5 E-phrases (that's OK)

### For Later LEGOs (30+):
- Will have **rich** baskets (full vocabulary pool)
- Human linguist: Add full complement of E and D phrases
- Should reach all 5 E-phrases
- Should populate all D windows with examples

## Validation Checklist

For each enriched basket, verify:

- [ ] All phrases use ONLY vocabulary from previous LEGOs
- [ ] Irish grammar is perfect
- [ ] English translations are accurate
- [ ] E-phrases are 7-10 words each
- [ ] D-phrases are organized by window size
- [ ] Both languages are syntactically correct
- [ ] Phrases demonstrate natural usage

## Files

- **Input**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/gle_for_eng_30seeds/phase_outputs/phase3_lego_extraction.json`
- **Output**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/gle_for_eng_30seeds/baskets.json`
- **Generator**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/gle_for_eng_30seeds/generate_baskets.py`

## Next Steps

1. Human linguist reviews all 124 baskets
2. Linguist enriches baskets following progressive vocabulary rules
3. Validation pass ensures all phrases are correct
4. Baskets.json is ready for Phase 6 (Ordering)
