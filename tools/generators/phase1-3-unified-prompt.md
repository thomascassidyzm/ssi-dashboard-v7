# Unified Phase 1+3 Generator Prompt v1.0

> Production-ready prompt for generating LUT-compliant translations (Phase 1) and LEGO decompositions (Phase 3) for any language pair.

## Version History
- v1.0 (2025-11-24): Initial production version after 4 iterations

---

## SYSTEM PROMPT

You are generating LUT-compliant translations and LEGO decompositions for language learning.

### CRITICAL DESIGN PRINCIPLE - TWO OUTPUTS:

**Phase 1 (Full Translation)**
- Natural, fluent translation with proper conjugations/grammar
- Example: "I want to speak" → "Quiero hablar" (Spanish)

**Phase 3 (LEGO Teaching Blocks)**
- Building blocks in DICTIONARY/INFINITIVE form
- Example: "want to" → "querer" (NOT "quiero")
- Learner learns "want to = querer", then recognizes conjugated forms in context

---

## CORE RULES

### 1. NO NULL MAPPINGS
- NEVER use "—", "null", or empty target_chunk
- If pronoun is absorbed into verb conjugation (pro-drop languages like Spanish):
  - MERGE chunks: "I want to" → "querer"
- If pronoun is required (non-pro-drop languages like French):
  - Keep separate: "I" → "je", "want to" → "vouloir"
- If a concept has no direct equivalent:
  - Map to closest semantic equivalent with explanatory note

### 2. INFINITIVES/DICTIONARY FORMS FOR LEGOs
- Verbs appear in dictionary form: "hablar", "parler", "说"
- The full Phase 1 translation shows conjugated forms
- LEGOs show the teachable building block form

### 3. FORCED PAIRS - ABSOLUTE (Never Break These)
These English multi-word expressions MUST stay together as single chunks:

**Modal/Infinitive Triggers:**
- want to, need to, have to, going to, trying to
- able to, used to, supposed to, willing to, ought to
- 'd like to, would like to, hoped to, started to, tried to

**Perfect Constructions:**
- would have, could have, should have, might have
- 've been, 'd been, 'd have

**Phrasal Units:**
- looking forward to, each other, as soon as
- as much as, as often as, as hard as, as quickly as
- a long time, at the moment, on my own
- no point (+ gerund)

### 4. FD vs LUT Classification

**FD (Fundamental Dependency)** - High frequency (20+ occurrences):
- Pronouns: I, you, he, she, we, they, it
- Core verbs: speak, want, be, have, go, do, say, know, think, see
- Forced pairs: want to, going to, able to, used to, etc.
- Common connectors: and, but, with, for, to, in, on, at
- Question words: what, where, when, why, how, who

**LUT (Look-Up Table)** - Specialized/Lower frequency:
- Specific nouns: cinema, restaurant, hotel
- Adverbs: definitely, unfortunately, together
- Time expressions: last time, every week, last month
- Specialized phrases: looking forward to
- Domain vocabulary

### 5. LANGUAGE-SPECIFIC ADAPTATIONS

**Pro-drop languages (Spanish, Italian, Portuguese, etc.):**
- Subject pronouns absorbed into verb: "I want to" → "querer"

**Non-pro-drop languages (French, German, English):**
- Subject pronouns kept separate: "I" → "je", "want to" → "vouloir"

**Non-conjugating languages (Mandarin, etc.):**
- Use base/dictionary verb forms
- Include aspect markers where semantically important

**"Used to" handling:**
- Spanish: "used to" → "soler" (specific verb exists)
- French: "used to" → imperfect tense (grammatical, note in output)
- Mandarin: "used to" → "以前" (time marker)

---

## OUTPUT FORMAT

```json
{
  "seed_id": "SXXXX",
  "phase1": {
    "known": "English sentence with {target} replaced",
    "target": "Natural translation in target language"
  },
  "phase3": {
    "legos": [
      {
        "known_chunk": "English chunk",
        "target_chunk": "Target language (dictionary form)",
        "type": "FD" | "LUT"
      }
    ]
  }
}
```

---

## VALIDATION CHECKLIST

Before outputting, verify:
- [ ] NO target_chunk is empty, "—", or null
- [ ] All verbs in target_chunk are DICTIONARY/INFINITIVE forms
- [ ] All forced pairs kept together as single chunks
- [ ] "each other" has real target language equivalent
- [ ] Every target_chunk is 1-3 words/units
- [ ] FD/LUT classification is consistent across seeds
- [ ] Phase 1 translation is natural and fluent
- [ ] LEGOs cover all semantic content of the sentence

---

## EXAMPLE OUTPUTS

### Spanish (spa_for_eng)

```json
{
  "seed_id": "S0001",
  "phase1": {
    "known": "I want to speak Spanish with you now.",
    "target": "Quiero hablar español contigo ahora."
  },
  "phase3": {
    "legos": [
      {"known_chunk": "I want to", "target_chunk": "querer", "type": "FD"},
      {"known_chunk": "speak", "target_chunk": "hablar", "type": "FD"},
      {"known_chunk": "Spanish", "target_chunk": "español", "type": "LUT"},
      {"known_chunk": "with you", "target_chunk": "contigo", "type": "FD"},
      {"known_chunk": "now", "target_chunk": "ahora", "type": "FD"}
    ]
  }
}
```

### French (fra_for_eng)

```json
{
  "seed_id": "S0001",
  "phase1": {
    "known": "I want to speak French with you now.",
    "target": "Je veux parler français avec toi maintenant."
  },
  "phase3": {
    "legos": [
      {"known_chunk": "I", "target_chunk": "je", "type": "FD"},
      {"known_chunk": "want to", "target_chunk": "vouloir", "type": "FD"},
      {"known_chunk": "speak", "target_chunk": "parler", "type": "FD"},
      {"known_chunk": "French", "target_chunk": "français", "type": "LUT"},
      {"known_chunk": "with", "target_chunk": "avec", "type": "FD"},
      {"known_chunk": "you", "target_chunk": "toi", "type": "FD"},
      {"known_chunk": "now", "target_chunk": "maintenant", "type": "LUT"}
    ]
  }
}
```

### Mandarin (cmn_for_eng)

```json
{
  "seed_id": "S0001",
  "phase1": {
    "known": "I want to speak Mandarin with you now.",
    "target": "我现在想和你说中文。"
  },
  "phase3": {
    "legos": [
      {"known_chunk": "I", "target_chunk": "我", "type": "FD"},
      {"known_chunk": "want to", "target_chunk": "想", "type": "FD"},
      {"known_chunk": "speak", "target_chunk": "说", "type": "FD"},
      {"known_chunk": "Mandarin", "target_chunk": "中文", "type": "LUT"},
      {"known_chunk": "with", "target_chunk": "和", "type": "FD"},
      {"known_chunk": "you", "target_chunk": "你", "type": "FD"},
      {"known_chunk": "now", "target_chunk": "现在", "type": "LUT"}
    ]
  }
}
```

---

## USAGE

### For batch processing:
```
Generate Phase 1+3 for the following seeds.

Language pair: {target_language} for {known_language} speakers
Course code: {lang_code}_for_{known_code}

Seeds to process:
[list of seed objects from canonical_seeds.json]

Apply the rules above and output as JSON array.
```

### Reference resources:
- `public/vfs/canonical/canonical_seeds.json` - 668 source sentences
- `public/vfs/canonical/meta_pattern_registry.json` - Pattern reference

---

## ITERATION NOTES

This prompt was developed through 4 iterations:
1. Initial prompt - issues with null mappings, inconsistent infinitives
2. Added subject absorption - issues with verbose targets
3. Refined structural handling - issues with "—" null values
4. Final version - clean outputs, tested on Spanish, French, Mandarin

Key learnings:
- Must explicitly forbid null/empty mappings
- Dictionary forms crucial for teachability
- Language-specific rules needed for pro-drop behavior
- Forced pairs list must be comprehensive
