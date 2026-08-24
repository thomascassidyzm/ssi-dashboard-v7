# Build Practice Phrases - Simple System

You are building practice phrases for **{LANG_NAME} speakers learning English**.

---

## Your Task

For each new LEGO, create **exactly 10 practice phrases**:
- **BUILD-1 to BUILD-4:** Fragments (4 phrases)
- **USE-1 to USE-6:** Complete sentences (6 phrases)

---

## THE GOLDEN RULE: Exact String Matching

**Use ONLY the exact LEGO strings provided. No changes.**

```
✅ CORRECT:   "I want to speak" (exact LEGO text)
❌ WRONG:     "I wanted to speak" (changed tense)
❌ WRONG:     "I really want to speak" (added word)
❌ WRONG:     "want to speak" (missing part)
```

Every word must come from a LEGO.

---

## Input Format

```
NEW LEGO:
  English: [exact text]
  {LANG_NAME}: [exact text]

PREVIOUS LEGOs: (empty for first LEGO)
  - English: [text] → {LANG_NAME}: [text]
  - English: [text] → {LANG_NAME}: [text]
  ...
```

---

## Output Format

```json
{
  "lego": {
    "english": "exact text",
    "known": "{LANG_NAME} text"
  },
  "phrases": [
    {"type": "BUILD-1", "english": "...", "known": "..."},
    {"type": "BUILD-2", "english": "...", "known": "..."},
    {"type": "BUILD-3", "english": "...", "known": "..."},
    {"type": "BUILD-4", "english": "...", "known": "..."},
    {"type": "USE-1", "english": "Complete sentence.", "known": "..."},
    {"type": "USE-2", "english": "Complete sentence.", "known": "..."},
    {"type": "USE-3", "english": "Complete sentence.", "known": "..."},
    {"type": "USE-4", "english": "Complete sentence.", "known": "..."},
    {"type": "USE-5", "english": "Complete sentence.", "known": "..."},
    {"type": "USE-6", "english": "Complete sentence.", "known": "..."}
  ]
}
```

---

## Examples: Early LEGOs

### Example 1: First LEGO (No Previous Vocab)

**Input:**
```
NEW LEGO:
  English: "I want to speak"
  Spanish: "quiero hablar"

PREVIOUS LEGOs: (none)
```

**Output:**
```json
{
  "lego": {
    "english": "I want to speak",
    "known": "quiero hablar"
  },
  "phrases": [
    {"type": "BUILD-1", "english": "I want to speak", "known": "quiero hablar"},
    {"type": "BUILD-2", "english": "I want to speak", "known": "quiero hablar"},
    {"type": "BUILD-3", "english": "I want to speak", "known": "quiero hablar"},
    {"type": "BUILD-4", "english": "I want to speak", "known": "quiero hablar"},
    {"type": "USE-1", "english": "I want to speak.", "known": "Quiero hablar."},
    {"type": "USE-2", "english": "I want to speak.", "known": "Quiero hablar."},
    {"type": "USE-3", "english": "I want to speak.", "known": "Quiero hablar."},
    {"type": "USE-4", "english": "I want to speak.", "known": "Quiero hablar."},
    {"type": "USE-5", "english": "I want to speak.", "known": "Quiero hablar."},
    {"type": "USE-6", "english": "I want to speak.", "known": "Quiero hablar."}
  ]
}
```

**Notes:**
- Only 1 LEGO available = all phrases are identical
- BUILD = no punctuation (fragment)
- USE = with punctuation (sentence)
- This is normal and expected for the first LEGO!

---

### Example 2: Second LEGO (1 Previous LEGO)

**Input:**
```
NEW LEGO:
  English: "English"
  Spanish: "inglés"

PREVIOUS LEGOs:
  - English: "I want to speak" → Spanish: "quiero hablar"
```

**Output:**
```json
{
  "lego": {
    "english": "English",
    "known": "inglés"
  },
  "phrases": [
    {"type": "BUILD-1", "english": "English", "known": "inglés"},
    {"type": "BUILD-2", "english": "speak English", "known": "hablar inglés"},
    {"type": "BUILD-3", "english": "I want to speak English", "known": "quiero hablar inglés"},
    {"type": "BUILD-4", "english": "I want to speak English", "known": "quiero hablar inglés"},
    {"type": "USE-1", "english": "I want to speak English.", "known": "Quiero hablar inglés."},
    {"type": "USE-2", "english": "I want to speak English.", "known": "Quiero hablar inglés."},
    {"type": "USE-3", "english": "I want to speak English.", "known": "Quiero hablar inglés."},
    {"type": "USE-4", "english": "I want to speak English.", "known": "Quiero hablar inglés."},
    {"type": "USE-5", "english": "I want to speak English.", "known": "Quiero hablar inglés."},
    {"type": "USE-6", "english": "I want to speak English.", "known": "Quiero hablar inglés."}
  ]
}
```

**Notes:**
- 2 LEGOs available = limited combinations
- BUILD shows progression: LEGO alone → partial combo → full combo
- USE phrases will repeat - this is normal for early LEGOs!

---

### Example 3: Sixth LEGO (5 Previous LEGOs)

**Input:**
```
NEW LEGO:
  English: "learn"
  Spanish: "aprender"

PREVIOUS LEGOs:
  - English: "I want to speak" → Spanish: "quiero hablar"
  - English: "English" → Spanish: "inglés"
  - English: "with you" → Spanish: "contigo"
  - English: "now" → Spanish: "ahora"
  - English: "I'm trying to" → Spanish: "estoy intentando"
```

**Output:**
```json
{
  "lego": {
    "english": "learn",
    "known": "aprender"
  },
  "phrases": [
    {"type": "BUILD-1", "english": "learn", "known": "aprender"},
    {"type": "BUILD-2", "english": "learn English", "known": "aprender inglés"},
    {"type": "BUILD-3", "english": "I want to learn", "known": "quiero aprender"},
    {"type": "BUILD-4", "english": "I'm trying to learn", "known": "estoy intentando aprender"},
    {"type": "USE-1", "english": "I want to learn.", "known": "Quiero aprender."},
    {"type": "USE-2", "english": "I want to learn English.", "known": "Quiero aprender inglés."},
    {"type": "USE-3", "english": "I'm trying to learn.", "known": "Estoy intentando aprender."},
    {"type": "USE-4", "english": "I'm trying to learn English.", "known": "Estoy intentando aprender inglés."},
    {"type": "USE-5", "english": "I want to learn English now.", "known": "Quiero aprender inglés ahora."},
    {"type": "USE-6", "english": "I'm trying to learn English with you.", "known": "Estoy intentando aprender inglés contigo."}
  ]
}
```

**Notes:**
- 6 LEGOs available = good variety now!
- BUILD: Simple → progressively complex
- USE: All different, natural sentences
- **This pattern repeats for all subsequent LEGOs**

---

## Rules for BUILD Phrases (1-4)

**Purpose:** Build learner confidence with progressive combinations.

- **No punctuation** (fragments okay)
- Start simple, get progressively longer
- Can be incomplete: "learn English", "I want to learn"

**Pattern:**
1. BUILD-1: Just the new LEGO
2. BUILD-2: New LEGO + 1 previous LEGO
3. BUILD-3: New LEGO + 2 previous LEGOs
4. BUILD-4: New LEGO + 2-3 previous LEGOs

---

## Rules for USE Phrases (5-10)

**Purpose:** Complete, natural, speakable English sentences.

- **Must have punctuation** (. ! ?)
- **Grammatically complete** sentences
- **Natural spoken English** a native speaker would say
- **Varied** - don't repeat! Use different LEGO combinations

**Pattern:**
- Combine the new LEGO with previous LEGOs in different ways
- Make sentences longer and more complex
- Use all available vocabulary creatively

---

## Critical Rules

### ✅ DO:
- Use exact LEGO text (word-for-word)
- Make BUILD phrases progressively longer
- Make USE phrases complete, varied sentences
- Accept repetition in early LEGOs (1-5) - it's unavoidable!
- Create variety once you have 6+ LEGOs

### ❌ DO NOT:
- Change tenses ("speak" → "spoke", "speaking")
- Add words ("the", "a", "very", "really")
- Use contractions unless they're in the LEGO ("I am" → "I'm")
- Skip any of the 10 phrases
- Make fewer or more than 10 phrases

---

## The 10 Canonical English Seeds

These will be broken into LEGOs:

```
S0001: I want to speak English with you now.
S0002: I'm trying to learn.
S0003: how to speak as much as possible.
S0004: how to say something in English
S0005: I'm going to practise speaking with someone else.
S0006: I'm trying to remember a word.
S0007: I want to try as hard as I can today.
S0008: I'm going to try to explain what I mean.
S0009: I speak a little English now.
S0010: I'm not sure if I can remember the whole sentence.
```

---

## Your Task

Build practice phrases for **eng_for_{LANG}**.

For each LEGO, you'll receive:
- The new LEGO
- List of previous LEGOs

Create 10 phrases following the examples above.

**Remember:**
- Exact text matching
- 4 BUILD (fragments) + 6 USE (sentences)
- Early repetition is normal
- Variety comes after 6+ LEGOs
