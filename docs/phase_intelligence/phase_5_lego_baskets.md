# AGENT PROMPT: Phase 5 Basket Generation v6.0 (SLIDING WINDOW)

**Version**: 6.0 - Sliding Window with Recent Seed Pairs (2025-11-11)
**Status**: Production Ready - Pattern-Guided Natural Language Generation
**Purpose**: Generate high-quality practice phrase baskets using linguistic reasoning with recent seed context

---

## 🎯 YOUR MISSION

You will receive a **SCAFFOLD JSON** containing:

✅ **Recent seed_pairs** - Last 10 seeds as complete sentences showing natural patterns
✅ **Current seed context** - The new seed_pair being taught
✅ **LEGOs to teach** - Vocabulary units with incremental availability
✅ **Structure** - JSON skeleton ready for phrase generation

**Your ONLY task**: Fill the `practice_phrases` arrays with natural, meaningful utterances.

---

## 📋 INPUT: SCAFFOLD STRUCTURE

```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0010",
  "generation_stage": "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
  "seed_pair": {
    "target": "No estoy seguro si puedo recordar toda la oración.",
    "known": "I'm not sure if I can remember the whole sentence."
  },
  "recent_seed_pairs": {
    "S0001": [
      "Quiero hablar español contigo ahora.",
      "I want to speak Spanish with you now."
    ],
    "S0002": [
      "Estoy intentando aprender.",
      "I'm trying to learn."
    ],
    // ... up to 10 most recent seeds
  },
  "legos": {
    "S0010L01": {
      "lego": ["if", "si"],
      "type": "A",
      "current_seed_legos_available": [],  // Incremental within current seed
      "is_final_lego": false,
      "practice_phrases": [],  // ← YOU FILL THIS
      "phrase_distribution": {
        "really_short_1_2": 0,
        "quite_short_3": 0,
        "longer_4_5": 0,
        "long_6_plus": 0
      }
    }
  }
}
```

---

## 🔑 KEY PRINCIPLE: MEANINGFUL UTTERANCES FIRST

### ❌ WRONG APPROACH: Mechanical Pattern Filling

```
DON'T: "Let me slot 'recordar' into every pattern I see..."
- ❌ "recordar contigo" (remember with you - nonsensical)
- ❌ "español recordar" (Spanish remember - ungrammatical)
- ❌ "recordar ahora más" (remember now more - word salad)
```

### ✅ RIGHT APPROACH: Think → Express → Validate

```
1. THINK: "What would a learner want to say with 'recordar'?"
   - "I want to remember"
   - "I'm trying to remember a word"
   - "I can remember how to speak Spanish"

2. EXPRESS in Spanish using available vocabulary
   - "quiero recordar"
   - "estoy intentando recordar una palabra"
   - "puedo recordar cómo hablar español"

3. VALIDATE: Are all Spanish words available?
   - Check against recent_seed_pairs vocabulary
   - Check against current_seed_legos_available
```

---

## 🎨 VOCABULARY SOURCES

For each LEGO, you can use Spanish words from:

### 1. Recent Seed Pairs (Primary Source)
Extract ALL words from the recent_seed_pairs sentences:
- Split sentences on spaces: "Quiero hablar español" → ["quiero", "hablar", "español"]
- These words are LEARNED - the learner has practiced them

### 2. Current Seed LEGOs Available (Secondary Source)
- LEGOs taught earlier in THIS seed
- Listed in `current_seed_legos_available` array
- Grows incrementally: L01 has [], L02 has [L01], L03 has [L01, L02], etc.

### 3. Current LEGO Being Taught
- The LEGO you're generating phrases for
- Always available (obviously - you're teaching it!)

---

## 📐 PHRASE GENERATION PROCESS

### Step 1: Extract Available Vocabulary

```javascript
// Pseudocode - DO NOT actually write this code!
// This shows the LOGIC you should apply mentally

available_words = []

// From recent seed pairs
for (seed_pair in recent_seed_pairs) {
  spanish_sentence = seed_pair[0]
  words = spanish_sentence.split(' ')
  available_words.add(words)
}

// From current seed LEGOs
for (lego in current_seed_legos_available) {
  available_words.add(lego[1].split(' '))  // Spanish side
}

// Current LEGO
available_words.add(current_lego_spanish.split(' '))
```

### Step 2: Think of Meaningful English Utterances

**Start with the KNOWN language** (English):
- What would a learner want to say using this LEGO?
- What are natural, useful, communicative phrases?
- What relates to the seed theme?

**Examples for "recordar" (to remember):**
- "I want to remember"
- "I'm trying to remember a word"
- "I can remember how to speak"
- "I'm not sure if I can remember"

### Step 3: Express in Spanish Using Available Vocabulary

**Translate your English thoughts to Spanish:**
- "I want to remember" → "quiero recordar"
  - Check: "quiero" in recent seeds? ✓ (S0001)
  - Check: "recordar" is current LEGO? ✓

- "I'm trying to remember a word" → "estoy intentando recordar una palabra"
  - Check: "estoy intentando" in recent seeds? ✓ (S0002, S0006)
  - Check: "recordar" is current LEGO? ✓
  - Check: "una palabra" in recent seeds? ✓ (S0006)

### Step 4: Validate ALL Words

**CRITICAL: Every Spanish word must be available**
- Split Spanish phrase on spaces
- Check each word exists in:
  - Recent seed pairs vocabulary, OR
  - Current seed LEGOs available, OR
  - Current LEGO being taught

**If ANY word is unavailable → Try a different English thought**

---

## 🎯 PHRASE REQUIREMENTS

### Distribution (12-15 phrases per LEGO):
- **2 phrases**: 1-2 LEGOs (really_short)
- **2 phrases**: 3 LEGOs (quite_short)
- **2 phrases**: 4-5 LEGOs (longer)
- **4-6 phrases**: 6+ LEGOs (long_6_plus)

### Format:
```json
["English phrase", "Spanish phrase", null, lego_count]
```

### Quality Standards:
1. **Semantic meaning**: Makes sense in both languages
2. **Syntactic correctness**: Proper grammar in Spanish
3. **Communicative value**: Something learners would actually want to say
4. **Pattern inspiration**: Naturally uses structures visible in recent_seed_pairs
5. **Progressive complexity**: Build from simple to complex
6. **Vocabulary compliance**: ALL Spanish words available

---

## 🌟 PATTERN INSPIRATION (Not Pattern Forcing!)

The `recent_seed_pairs` show you **natural sentence structures** the learner has seen:

**Example patterns visible in recent seeds:**
```
S0001: "Quiero hablar español contigo ahora"
       Pattern: quiero + infinitive + object + location/time

S0002: "Estoy intentando aprender"
       Pattern: estoy intentando + infinitive

S0005: "Voy a practicar hablar con alguien más"
       Pattern: voy a + infinitive + infinitive + prepositional phrase
```

**Use these patterns as INSPIRATION:**
- ✅ "quiero recordar" (inspired by "quiero hablar" pattern)
- ✅ "estoy intentando recordar" (inspired by "estoy intentando aprender" pattern)
- ✅ "voy a recordar" (inspired by "voy a practicar" pattern)

**NOT as rigid templates:**
- ❌ Force every phrase into "quiero X contigo ahora" pattern
- ❌ Mechanically substitute LEGOs into fixed slots

**The patterns show you what vocabulary and structures are available - use them naturally!**

---

## 🔍 SPECIAL RULES

### Final LEGO Rule ⭐
If `is_final_lego: true`, your LAST phrase MUST be the complete seed sentence:
```json
["I'm not sure if I can remember the whole sentence.",
 "No estoy seguro si puedo recordar toda la oración.",
 null, 8]
```

### Incremental Build Within Seed
Each LEGO in a seed has access to previous LEGOs from that seed:
- L01: `current_seed_legos_available: []` (just recent seeds)
- L02: `current_seed_legos_available: [[L01]]` (recent seeds + L01)
- L03: `current_seed_legos_available: [[L01], [L02]]` (recent seeds + L01 + L02)
- Final: Can use ALL LEGOs from current seed → makes complete seed sentence

---

## ❌ COMMON MISTAKES TO AVOID

### Mistake 1: Using Unavailable Words
```json
recent_seed_pairs vocabulary: ["quiero", "hablar", "español", ...]
current LEGO: "recordar"

❌ "puedo recordar tu nombre"
   → "tu", "nombre" not in available vocabulary

✅ "puedo recordar una palabra"
   → "puedo" from S0010L02, "recordar" is current LEGO,
      "una palabra" from S0006
```

### Mistake 2: Nonsensical Combinations
```json
❌ "recordar español contigo" (remember Spanish with you - odd)
✅ "quiero recordar español" (I want to remember Spanish - natural)
```

### Mistake 3: Ignoring Linguistic Quality
```json
❌ "si recordar ahora" (if to-remember now - broken grammar)
✅ "si puedo recordar ahora" (if I can remember now - complete sentence)
```

### Mistake 4: Mechanical Pattern Filling
```json
Pattern seen: "quiero hablar X"
❌ Apply mechanically: "quiero recordar X" for every phrase
✅ Use naturally: Some phrases with "quiero recordar",
                  others with "estoy intentando recordar",
                  "puedo recordar", "voy a recordar", etc.
```

---

## ✅ OUTPUT FORMAT

Return the scaffold JSON with:
- `practice_phrases` arrays filled for ALL LEGOs
- `phrase_distribution` updated to match actual counts
- `generation_stage` changed to `"PHRASE_GENERATION_COMPLETE"`

```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0010",
  "generation_stage": "PHRASE_GENERATION_COMPLETE",  // ← Changed
  "seed_pair": {...},
  "recent_seed_pairs": {...},
  "legos": {
    "S0010L01": {
      "lego": ["if", "si"],
      "type": "A",
      "practice_phrases": [
        ["if I want", "si quiero", null, 2],
        ["if you want", "si quieres", null, 2],
        ["if I speak Spanish", "si hablo español", null, 3],
        ["if I'm trying", "si estoy intentando", null, 3],
        // ... 10-15 total
      ],
      "phrase_distribution": {
        "really_short_1_2": 2,
        "quite_short_3": 2,
        "longer_4_5": 4,
        "long_6_plus": 6
      }
    }
  }
}
```

---

## 🎓 EXAMPLE: Teaching "recordar" (to remember)

**Context:**
- Current LEGO: "recordar" / "to remember"
- Recent seed pairs show: quiero, hablar, español, estoy intentando, aprender, una palabra, voy a, practicar, etc.
- Current seed LEGOs available: (none yet - this is L01)

**Good phrases:**
1. "to remember" → "recordar" (bare LEGO)
2. "I want to remember" → "quiero recordar" (uses S0001 pattern)
3. "I'm trying to remember" → "estoy intentando recordar" (uses S0002 pattern)
4. "I can remember" → "puedo recordar" (if "puedo" available)
5. "I want to remember a word" → "quiero recordar una palabra" (uses S0006)
6. "I'm trying to remember how to speak" → "estoy intentando recordar cómo hablar" (combines patterns)
7. "I'm going to remember" → "voy a recordar" (uses S0005 pattern)
8. "I can remember how to speak Spanish" → "puedo recordar cómo hablar español" (complex, natural)

**Why these work:**
- ✅ Start with meaningful English thoughts
- ✅ Use vocabulary from recent seeds naturally
- ✅ Follow patterns learner has seen
- ✅ Semantically meaningful and useful
- ✅ Build from simple to complex

---

## 📊 SUCCESS METRICS

**Quality targets:**
- ✅ 100% vocabulary compliance (all words available)
- ✅ 100% natural language (both English and Spanish)
- ✅ 100% semantic correctness (phrases make sense)
- ✅ 12-15 phrases per LEGO (proper distribution)
- ✅ Final LEGO culminates in complete seed sentence
- ✅ Progressive complexity throughout

---

## 📝 SUMMARY

**Your task:**

1. **For each LEGO in the scaffold:**
   - Extract available vocabulary (recent seeds + current seed LEGOs + current LEGO)
   - Think of 12-15 meaningful things learners would want to say
   - Express in Spanish using only available vocabulary
   - Validate ALL words are available
   - Format as: `["English", "Spanish", null, count]`

2. **Quality over mechanics:**
   - Start with communicative intent (what to say)
   - Use patterns as inspiration (not rigid templates)
   - Ensure linguistic naturalness
   - Build from simple to complex

3. **Save the completed basket JSON**

---

**Think linguistically, not mechanically. Start with meaning, then find the words. 🧠**

---

**Version History:**
- v6.0 (2025-11-11): Sliding window with recent seed_pairs, pattern-guided generation
- v5.0 (2025-11-09): Staged pipeline with 3-category whitelist logic
- v4.1: Staged scaffold approach
- v4.0: Self-validating agent with gates
