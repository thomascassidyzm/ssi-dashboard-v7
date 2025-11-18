# Explicit Label Protocol

> **Status**: NEW STANDARD for all future courses (starting after Chinese)
>
> **Problem Solved**: Eliminates position-based array confusion that caused hundreds of swaps

---

## 🎯 The Problem

**Position-based arrays** caused "spaz monkey" swaps throughout Spanish course:

```json
❌ AMBIGUOUS - Which is which?
"seed_pair": ["I want to speak", "Quiero hablar"]
"practice_phrases": [
  ["Hello", "Hola"],
  ["Goodbye", "Adiós"]
]
```

Agents (and humans!) had to **guess** the order. Sometimes they guessed wrong.

---

## ✅ The Solution

**Explicit labels** make it impossible to confuse:

```json
✅ CRYSTAL CLEAR
"seed_pair": {
  "english": "I want to speak",
  "spanish": "Quiero hablar"
}

"practice_phrases": [
  {
    "english": "Hello",
    "spanish": "Hola",
    "notes": ""
  },
  {
    "english": "Goodbye",
    "spanish": "Adiós",
    "notes": ""
  }
]
```

---

## 📋 New Standard Format

### **Phase 1: seed_pairs.json**

```json
{
  "version": "9.0.0",
  "phase": "1",
  "course": "fra_for_eng",
  "translations": {
    "S0001": {
      "english": "I want to speak French with you now.",
      "french": "Je veux parler français avec toi maintenant."
    },
    "S0002": {
      "english": "I'm trying to learn.",
      "french": "J'essaie d'apprendre."
    }
  }
}
```

**Note**: Use actual language names (`french`, `german`, `mandarin`) not `target`/`known`

### **Phase 3: lego_pairs.json**

```json
{
  "version": "9.0.0",
  "phase": "3",
  "course": "fra_for_eng",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {
        "english": "I want to speak French with you now.",
        "french": "Je veux parler français avec toi maintenant."
      },
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "english": "I want",
          "french": "je veux",
          "new": true
        },
        {
          "id": "S0001L02",
          "type": "A",
          "english": "to speak",
          "french": "parler",
          "new": true
        }
      ]
    }
  ]
}
```

**Key changes:**
- `seed_pair` is now an object, not array
- LEGOs use language names, not `known`/`target`

### **Phase 5: Scaffolds (CRITICAL!)**

```json
{
  "seed_id": "S0001",
  "seed_context": {
    "english": "I want to speak French with you now.",
    "french": "Je veux parler français avec toi maintenant."
  },
  "legos": [
    {
      "id": "S0001L01",
      "english": "I want",
      "french": "je veux"
    },
    {
      "id": "S0001L02",
      "english": "to speak",
      "french": "parler"
    }
  ],
  "practice_phrases": [
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""}
  ]
}
```

**Key features:**
- ✅ **12 pre-allocated slots** for practice phrases (usually fill 10)
- ✅ **Explicit language names** - agent knows exactly where to put text
- ✅ **Optional notes field** - agent can add context
- ✅ **No ambiguity** - impossible to swap

### **Phase 5: lego_baskets.json (Generated)**

```json
{
  "version": "9.0.0",
  "phase": "5",
  "course": "fra_for_eng",
  "baskets": {
    "S0001L01": {
      "lego_id": "S0001L01",
      "_metadata": {
        "seed_id": "S0001",
        "seed_context": {
          "english": "I want to speak French with you now.",
          "french": "Je veux parler français avec toi maintenant."
        }
      },
      "practice_phrases": [
        {
          "english": "I want to help you",
          "french": "Je veux t'aider",
          "notes": "Basic conjugation"
        },
        {
          "english": "I want to learn",
          "french": "Je veux apprendre",
          "notes": ""
        },
        {
          "english": "I want more time",
          "french": "Je veux plus de temps",
          "notes": ""
        }
        // ... up to 12 phrases
      ]
    }
  }
}
```

---

## 🔧 Implementation

### **For New Courses:**

1. Use `tools/phase-prep/phase5_prep_scaffolds_v9.cjs` (new version)
2. Agent fills explicit-label scaffolds
3. Validator checks language-specific fields
4. Manifest generator reads explicit labels

### **For Migration (Spanish/Chinese):**

1. Run `scripts/migration/migrate_to_explicit_labels.py`
2. Converts all position-based arrays to objects
3. Backups created automatically
4. Update Phase 7 generator to handle both formats during transition

---

## 📊 Benefits

| Feature | Old (Arrays) | New (Labels) |
|---------|-------------|--------------|
| **Clarity** | ❌ Ambiguous | ✅ Self-documenting |
| **Swaps** | ❌ Common | ✅ Impossible |
| **Validation** | ❌ Heuristic | ✅ Direct field check |
| **Agent-friendly** | ❌ Guess position | ✅ Named fields |
| **Token cost** | ~50 chars | ~70 chars (+40%) |
| **Debugging** | ❌ Hard | ✅ Obvious |

**Token cost is negligible** - 20 extra chars per phrase is ~0.005 tokens. Worth it!

---

## 🎓 Language-Specific Field Names

Use actual language codes, not generic names:

| Course | English Field | Target Field |
|--------|---------------|--------------|
| spa_for_eng | `english` | `spanish` |
| fra_for_eng | `english` | `french` |
| deu_for_eng | `english` | `german` |
| cmn_for_eng | `english` | `mandarin` |
| ita_for_eng | `english` | `italian` |
| jpn_for_eng | `english` | `japanese` |
| kor_for_eng | `english` | `korean` |

**Why not `known`/`target`?**
- Less confusing for multi-directional courses (eng_for_spa)
- Self-documenting when reading JSON
- Clearer for TTS phase (knows which language to synthesize)

---

## 🚀 Rollout Plan

### **Phase 1: Documentation** ✅
- This document
- Update CLAUDE.md
- Update phase workflow docs

### **Phase 2: Tooling** (Next)
- Create v9 scaffold generator
- Create migration script
- Update Phase 7 generator for dual-format support

### **Phase 3: New Courses** (Future)
- French course uses new format from day 1
- German course uses new format from day 1
- All future courses use new format

### **Phase 4: Migration** (Optional)
- Migrate Spanish course (already shipped, low priority)
- Migrate Chinese course (if beneficial)

---

## 📝 Validation Rules

### **Phase 1 Validator**
```javascript
for (const [seedId, pair] of Object.entries(translations)) {
  assert(pair.english !== undefined, "Missing english field")
  assert(pair[targetLang] !== undefined, `Missing ${targetLang} field`)
  assert(isEnglish(pair.english), "english field contains non-English")
  assert(isTargetLang(pair[targetLang]), `${targetLang} field contains wrong language`)
}
```

### **Phase 5 Validator**
```javascript
for (const phrase of basket.practice_phrases) {
  assert(phrase.english !== undefined, "Missing english field")
  assert(phrase[targetLang] !== undefined, `Missing ${targetLang} field`)
  assert(phrase.english.trim() !== "", "Empty english phrase")
  assert(phrase[targetLang].trim() !== "", "Empty target phrase")
  // Language detection validates fields are correct languages
}
```

---

## 🎯 Success Criteria

✅ Agent can fill scaffold without positional confusion
✅ Validator can check fields directly by name
✅ Zero swaps in generated data
✅ Self-documenting JSON (readable by humans)
✅ Works for any language pair

---

**Last updated**: 2025-11-18
**Status**: Ready for implementation
