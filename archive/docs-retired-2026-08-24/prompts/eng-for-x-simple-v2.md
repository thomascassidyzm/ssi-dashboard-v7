# Build eng_for_{LANG} - Simple Practice Phrase Generator

You are building **eng_for_{LANG}** ({LANG_NAME} speakers learning English).

---

## Your Task

For each LEGO, create **exactly 10 practice phrases**:
- **BUILD-1 to BUILD-4:** Fragments (4 phrases)
- **USE-1 to USE-6:** Complete sentences (6 phrases)

---

## THE GOLDEN RULE: Exact Text Matching

**You can ONLY use exact LEGO strings. No modifications.**

```
✅ CORRECT:   Use "I want" exactly as is
❌ WRONG:     "I wanted" (changed tense)
❌ WRONG:     "I really want" (added word)
❌ WRONG:     "want" (partial LEGO)
```

**Every word in your phrases must come from an introduced LEGO.**

---

## Input Format

**LEGO being introduced:**
- English: [exact text]
- {LANG_NAME}: [exact text]

**Previously introduced LEGOs:**
- LEGO 1: English → {LANG_NAME}
- LEGO 2: English → {LANG_NAME}
- etc.

---

## Output Format

```json
{
  "round": N,
  "lego": {
    "english": "exact text",
    "known": "{LANG_NAME} text"
  },
  "phrases": [
    {
      "type": "BUILD-1",
      "english": "fragment or phrase",
      "known": "{LANG_NAME} translation"
    },
    {
      "type": "BUILD-2",
      "english": "fragment or phrase",
      "known": "{LANG_NAME} translation"
    },
    {
      "type": "BUILD-3",
      "english": "fragment or phrase",
      "known": "{LANG_NAME} translation"
    },
    {
      "type": "BUILD-4",
      "english": "fragment or phrase",
      "known": "{LANG_NAME} translation"
    },
    {
      "type": "USE-1",
      "english": "Complete grammatical sentence.",
      "known": "{LANG_NAME} translation"
    },
    {
      "type": "USE-2",
      "english": "Complete grammatical sentence.",
      "known": "{LANG_NAME} translation"
    },
    {
      "type": "USE-3",
      "english": "Complete grammatical sentence.",
      "known": "{LANG_NAME} translation"
    },
    {
      "type": "USE-4",
      "english": "Complete grammatical sentence.",
      "known": "{LANG_NAME} translation"
    },
    {
      "type": "USE-5",
      "english": "Complete grammatical sentence.",
      "known": "{LANG_NAME} translation"
    },
    {
      "type": "USE-6",
      "english": "Complete grammatical sentence.",
      "known": "{LANG_NAME} translation"
    }
  ]
}
```

---

## BUILD Phrases (1-4)

**Purpose:** Short combinations to build learner confidence.

**Can be:**
- Fragments: "say something"
- Short phrases: "how to say"
- Incomplete sentences: "I want to learn"

**Rules:**
- Must use exact LEGO text
- Progressive combinations (each slightly longer/more complex)
- Natural English (even if incomplete)

---

## USE Phrases (5-10)

**Purpose:** Complete, speakable English sentences.

**Must be:**
- Grammatically complete sentences
- Natural, spoken English
- Something a native speaker would actually say
- End with proper punctuation (. ! ?)

**Rules:**
- Must use exact LEGO text
- More complex combinations
- Longer sentences preferred
- Real-world usage

---

## Example: Round 10

**LEGO being introduced:**
- English: "something"
- Spanish: "algo"

**Previously introduced:**
- "I want to speak" → "quiero hablar"
- "English" → "inglés"
- "with you" → "contigo"
- "now" → "ahora"
- "I'm trying to" → "estoy intentando"
- "learn" → "aprender"
- "how to" → "cómo"
- "as much as possible" → "lo más posible"
- "say" → "decir"

**Output:**

```json
{
  "round": 10,
  "lego": {
    "english": "something",
    "known": "algo"
  },
  "phrases": [
    {
      "type": "BUILD-1",
      "english": "say something",
      "known": "decir algo"
    },
    {
      "type": "BUILD-2",
      "english": "learn something",
      "known": "aprender algo"
    },
    {
      "type": "BUILD-3",
      "english": "how to say something",
      "known": "cómo decir algo"
    },
    {
      "type": "BUILD-4",
      "english": "I want to say something",
      "known": "quiero decir algo"
    },
    {
      "type": "USE-1",
      "english": "I want to learn something.",
      "known": "Quiero aprender algo."
    },
    {
      "type": "USE-2",
      "english": "I'm trying to say something.",
      "known": "Estoy intentando decir algo."
    },
    {
      "type": "USE-3",
      "english": "I'm trying to learn something now.",
      "known": "Estoy intentando aprender algo ahora."
    },
    {
      "type": "USE-4",
      "english": "I want to say something in English.",
      "known": "Quiero decir algo en inglés."
    },
    {
      "type": "USE-5",
      "english": "How do I say something in English?",
      "known": "¿Cómo decir algo en inglés?"
    },
    {
      "type": "USE-6",
      "english": "I'm trying to learn how to say something.",
      "known": "Estoy intentando aprender cómo decir algo."
    }
  ]
}
```

---

## Critical Rules

### ✅ DO:
- Use exact LEGO strings word-for-word
- Make BUILD phrases progressively longer
- Make USE phrases complete, natural sentences
- Combine LEGOs in different ways
- Always output exactly 10 phrases (4 BUILD + 6 USE)

### ❌ DO NOT:
- Change verb tenses ("speak" → "spoke")
- Add articles not in LEGOs ("the", "a")
- Add adverbs not in LEGOs ("very", "really")
- Use conjugations not introduced ("I speak" if only "speak" was introduced)
- Skip any of the 10 phrases
- Create fewer or more than 10 phrases

---

## The 10 Canonical English Seeds

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

## Your Task Now

Build Rounds 1-10 for **eng_for_{LANG}**.

For each seed, break it into LEGOs, then create 10 phrases per LEGO.

**Remember:** Exact text matching. 4 BUILD + 6 USE. Every round.
