# Unified Phase 1+3 Generator Prompt v2.0

> Production-ready prompt for generating LUT-compliant translations (Phase 1) and LEGO decompositions (Phase 3) for any language pair.
> **Merged from A/B testing** - combines conciseness of v1.0 with structural features of comprehensive prompt.

## Version History
- v1.0 (2025-11-24): Initial version
- v2.0 (2025-11-24): Merged best practices from A/B testing across 3 language pairs

---

## Your Task

Generate language learning content for **{COURSE_CODE}** where:
- **Known Language**: {KNOWN_LANG} (learner's native language)
- **Target Language**: {TARGET_LANG} (language being acquired)

Output:
1. **Phase 1**: Full sentence translations (known → target)
2. **Phase 3**: LEGO chunk decompositions with IDs and reuse tracking

---

## Critical: LUT Compliance

**LUT = Learner Uncertainty Test**

**The Rule**: Every KNOWN chunk must map unambiguously to exactly ONE target chunk.

When ambiguous, **chunk upward** with context:
- ❌ "to" → ambiguous (a/para/de/zu/à)
- ✅ "want to" → unambiguous forced pair

---

## Core Rules

### 1. NO NULL MAPPINGS
Never use "—", "∅", or empty chunks. Every chunk needs a real mapping.
If target language requires structure not in source, absorb into adjacent chunk.

### 2. FORCED PAIRS (Never Break)
```
want to, need to, have to, going to, trying to
able to, used to, supposed to, willing to, 'd like to
looking forward to, each other, as soon as
as much as, as often as, at the moment
would have, could have, should have
```

### 3. INFINITIVE/DICTIONARY FORMS
LEGOs use dictionary forms for teachability:
- Phase 1 (full translation): conjugated/natural
- Phase 3 (LEGOs): dictionary/infinitive forms

### 4. LEGO ID CONVENTION
Format: `S{seed}L{lego}` - e.g., `S0001L01`, `S0001L02`

### 5. REUSE TRACKING
- First occurrence: `"new": true`
- Subsequent occurrences: `"new": false`

---

## LEGO Types

### Type A (Atomic)
Single indivisible unit - components have NO independent pedagogical value.
```json
{"id": "S0001L02", "type": "A", "lego": {"known": "想", "target": "want to"}}
```

### Type M (Molecular)
Compound with useful sub-components - both whole AND parts are teachable.
```json
{
  "id": "S0001L05",
  "type": "M",
  "lego": {"known": "和你", "target": "with you"},
  "components": [
    {"known": "和", "target": "with"},
    {"known": "你", "target": "you"}
  ]
}
```

**Test**: Would teaching components separately help the learner?
- Yes → Type M with components
- No → Type A

---

## FD vs LUT Classification

**FD (Fundamental Dependency)** - 20+ occurrences in corpus:
- Pronouns: I, you, he, she, we, they
- Core verbs: speak, want, be, have, go, do, say
- Forced pairs: want to, going to, able to
- Common connectors: and, but, with, for, to

**LUT (Look-Up Table)** - Lower frequency:
- Specific nouns: cinema, restaurant, hotel
- Adverbs: definitely, unfortunately
- Time expressions: last time, every week
- Specialized phrases

---

## Output Format

```json
{
  "seed_id": "S0001",
  "seed_pair": {
    "known": "[KNOWN language sentence]",
    "target": "[TARGET language sentence]"
  },
  "legos": [
    {
      "id": "S0001L01",
      "type": "A",
      "new": true,
      "lego": {"known": "...", "target": "..."},
      "fd_lut": "FD"
    },
    {
      "id": "S0001L02",
      "type": "M",
      "new": true,
      "lego": {"known": "...", "target": "..."},
      "components": [
        {"known": "...", "target": "..."},
        {"known": "...", "target": "..."}
      ],
      "fd_lut": "LUT",
      "note": "optional grammar note"
    }
  ],
  "lut_validated": true
}
```

---

## Language-Specific Rules

### Pro-Drop Languages (Spanish, Italian, Portuguese, Chinese, Japanese)
Subject pronouns absorbed into verb:
```json
{"lego": {"known": "I want to", "target": "querer"}}  // Spanish
{"lego": {"known": "我想", "target": "I want to"}}     // Chinese→English
```

### Non-Pro-Drop Languages (French, German, English)
Subject pronouns kept separate:
```json
{"lego": {"known": "I", "target": "je"}},
{"lego": {"known": "want to", "target": "vouloir"}}
```

### Languages Requiring Structural Elements

**German "man" for implicit subjects:**
```json
{"lego": {"known": "uno/se", "target": "man"}, "note": "impersonal pronoun required"}
```

**German verb-final in subordinate clauses:**
```json
{"note": "subordinate clause - verb 'spricht' at end"}
```

**French elision (je → j'):**
Track canonical form; both count as same LEGO.

### Article-less → Article Languages (Chinese, Japanese, Russian → English)
Add articles in target, note in LEGO:
```json
{"lego": {"known": "言葉", "target": "a word"}, "note": "article 'a' added - countable noun"}
```

### "Used to" Handling by Language
- Spanish/Italian: "used to" → "soler" / "solere"
- French: "used to" → imperfect tense (no word, grammatical)
- German: "used to" → imperfect OR "früher" + verb
- Chinese: "used to" → "以前" (time marker)

---

## Validation Checklist

Before output, verify:
- [ ] All chunks have real mappings (no nulls)
- [ ] All forced pairs kept together
- [ ] LEGO IDs are sequential and unique
- [ ] `new: true/false` tracking is consistent
- [ ] Type A vs Type M correctly assigned
- [ ] Type M has components array
- [ ] FD/LUT classification is consistent

---

## Examples

### Spanish for English (spa_for_eng)

```json
{
  "seed_id": "S0001",
  "seed_pair": {
    "known": "I want to speak Spanish with you now.",
    "target": "Quiero hablar español contigo ahora."
  },
  "legos": [
    {"id": "S0001L01", "type": "A", "new": true, "lego": {"known": "I want to", "target": "querer"}, "fd_lut": "FD"},
    {"id": "S0001L02", "type": "A", "new": true, "lego": {"known": "speak", "target": "hablar"}, "fd_lut": "FD"},
    {"id": "S0001L03", "type": "A", "new": true, "lego": {"known": "Spanish", "target": "español"}, "fd_lut": "LUT"},
    {"id": "S0001L04", "type": "A", "new": true, "lego": {"known": "with you", "target": "contigo"}, "fd_lut": "FD"},
    {"id": "S0001L05", "type": "A", "new": true, "lego": {"known": "now", "target": "ahora"}, "fd_lut": "FD"}
  ],
  "lut_validated": true
}
```

### English for Chinese (eng_for_zho)

```json
{
  "seed_id": "S0001",
  "seed_pair": {
    "known": "我现在想和你说英语。",
    "target": "I want to speak English with you now."
  },
  "legos": [
    {"id": "S0001L01", "type": "A", "new": true, "lego": {"known": "我", "target": "I"}, "fd_lut": "FD"},
    {"id": "S0001L02", "type": "A", "new": true, "lego": {"known": "想", "target": "want to"}, "fd_lut": "FD"},
    {"id": "S0001L03", "type": "A", "new": true, "lego": {"known": "说", "target": "speak"}, "fd_lut": "FD"},
    {"id": "S0001L04", "type": "A", "new": true, "lego": {"known": "英语", "target": "English"}, "fd_lut": "LUT"},
    {"id": "S0001L05", "type": "M", "new": true, "lego": {"known": "和你", "target": "with you"}, "components": [{"known": "和", "target": "with"}, {"known": "你", "target": "you"}], "fd_lut": "FD"},
    {"id": "S0001L06", "type": "A", "new": true, "lego": {"known": "现在", "target": "now"}, "fd_lut": "LUT"}
  ],
  "lut_validated": true
}
```

### German for Spanish (deu_for_spa)

```json
{
  "seed_id": "S0001",
  "seed_pair": {
    "known": "Quiero hablar alemán contigo ahora.",
    "target": "Ich will jetzt Deutsch mit dir sprechen."
  },
  "legos": [
    {"id": "S0001L01", "type": "A", "new": true, "lego": {"known": "yo", "target": "ich"}, "fd_lut": "FD"},
    {"id": "S0001L02", "type": "A", "new": true, "lego": {"known": "querer", "target": "wollen"}, "fd_lut": "FD", "note": "modal verb"},
    {"id": "S0001L03", "type": "A", "new": true, "lego": {"known": "ahora", "target": "jetzt"}, "fd_lut": "FD"},
    {"id": "S0001L04", "type": "A", "new": true, "lego": {"known": "alemán", "target": "Deutsch"}, "fd_lut": "LUT"},
    {"id": "S0001L05", "type": "M", "new": true, "lego": {"known": "contigo", "target": "mit dir"}, "components": [{"known": "con", "target": "mit"}, {"known": "ti", "target": "dir"}], "fd_lut": "FD", "note": "mit + dative"},
    {"id": "S0001L06", "type": "A", "new": true, "lego": {"known": "hablar", "target": "sprechen"}, "fd_lut": "FD", "note": "infinitive at clause end with modal"}
  ],
  "lut_validated": true
}
```

---

## Usage

```
Generate Phase 1+3 for seeds S0001-S0030.

Course: {COURSE_CODE}
Known Language: {KNOWN_LANG}
Target Language: {TARGET_LANG}

Apply rules above. Output as JSON array.
Track LEGO reuse across seeds (new: true → new: false on reoccurrence).
```

---

## Reference Resources
- `public/vfs/canonical/canonical_seeds.json` - 668 source sentences
- `public/vfs/canonical/meta_pattern_registry.json` - Forced pairs, patterns

---

## A/B Test Results (v2.0 basis)

Tested on: Italian for English, English for Chinese, German for Spanish

| Feature | v1.0 | Comprehensive | v2.0 (merged) |
|---------|------|---------------|---------------|
| Conciseness | ✅ | ❌ | ✅ |
| LEGO IDs | ❌ | ✅ | ✅ |
| Reuse tracking | ❌ | ✅ | ✅ |
| Type A/M | ❌ | ✅ | ✅ |
| Components | ❌ | ✅ | ✅ |
| Grammar notes | ⚠️ | ✅ | ✅ |
| Lang-specific | ⚠️ | ✅ | ✅ |

v2.0 takes the structural completeness of the comprehensive prompt while maintaining readability.
