# AGENT PROMPT: Phase 5 Basket Generation v4.1 (STAGED - SCAFFOLD INPUT)

**Version**: 4.1 (Staged Pipeline - Phrase Generation Only)
**Status**: Production Ready for Scaffold-Based Generation
**Purpose**: Fill practice_phrases arrays in pre-generated scaffolds using linguistic reasoning

---

## 🎯 YOUR MISSION

You will receive a **SCAFFOLD JSON** where ALL mechanical setup is complete:
- ✅ Whitelist (available Spanish vocabulary)
- ✅ Structure (JSON skeleton)
- ✅ Metadata (available_legos, is_final_lego, etc.)

**Your ONLY task**: Fill in the `practice_phrases` arrays (10 phrases per LEGO) using linguistic reasoning and extended thinking.

---

## 🚨 CRITICAL: GENERATION METHODOLOGY

**This is NOT a coding task. This is a LINGUISTIC task.**

### ❌ PROHIBITED APPROACHES:

You **MAY NOT**:
- Write Python/JavaScript/any scripts to generate phrases
- Use template-based generation (f-strings, string interpolation)
- Mechanically substitute LEGO text into fixed patterns
- Automate phrase creation through loops or functions

**Examples of FORBIDDEN templates**:
```python
❌ f"I think that {lego} is good"
❌ f"She said that {lego} is here"
❌ f"Do you know {lego}?"
❌ Any mechanical string substitution
```

**Why?** Automated generation cannot understand:
- Word class (verb vs noun vs adjective)
- Semantic appropriateness
- Natural usage patterns
- Contextual fit

### ✅ REQUIRED APPROACH:

You **MUST**:
- Think through each phrase individually
- Use extended thinking (`<thinking>` tags) to reason about each LEGO
- Understand the LEGO's grammatical role
- Create natural, conversational usage
- Validate semantic correctness

**This takes longer but produces "top dollar content" quality.**

---

## 📋 INPUT: SCAFFOLD STRUCTURE

The scaffold you receive looks like this:

```json
{
  "version": "curated_v6_molecular_lego",
  "agent_id": 1,
  "seed_range": "S0301-S0320",
  "generation_stage": "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
  "seeds": {
    "S0301": {
      "seed": "S0301",
      "seed_pair": {
        "target": "Él dijo que quiere mostrarte algo.",
        "known": "He said that he wants to show you something."
      },
      "whitelist": ["él", "dijo", "que", "quiere", "mostrarte", "algo", ...],
      "available_legos_before_seed": 839,
      "legos": {
        "S0301L05": {
          "lego": ["to show you", "mostrarte"],
          "type": "A",
          "new": true,
          "is_final_lego": false,
          "available_legos": 839,
          "practice_phrases": [],  // ← YOU FILL THIS
          "phrase_distribution": {
            "really_short_1_2": 0,
            "quite_short_3": 0,
            "longer_4_5": 0,
            "long_6_plus": 0
          },
          "_metadata": {
            "spanish_words": ["mostrarte"],
            "whitelist_size": 567,
            "seed_context": {
              "target": "Él dijo que quiere mostrarte algo.",
              "known": "He said that he wants to show you something."
            }
          }
        }
      }
    }
  }
}
```

### What's Already Done (DO NOT MODIFY):
- ✅ JSON structure
- ✅ Whitelist arrays (use these for GATE validation)
- ✅ Metadata (available_legos, is_final_lego, etc.)
- ✅ Seed context for thematic guidance

### What You Must Do:
- Fill the `practice_phrases` arrays ONLY
- Update `phrase_distribution` to match actual phrase counts
- **DO NOT modify any other fields**

---

## 🎨 PHRASE GENERATION PROCESS (Per LEGO)

### Step 1: UNDERSTAND THE LEGO

**Use extended thinking** to analyze:

1. **What is it?**
   - Verb? Noun? Adjective? Adverb? Phrase?
   - Single word or multi-word unit?

2. **How is it naturally used?**
   - What contexts make sense?
   - What are typical sentence patterns?
   - Would a native speaker say this?

3. **What is the seed theme?**
   - Look at `_metadata.seed_context`
   - How can phrases build toward the seed sentence?

**Example extended thinking**:
```
<thinking>
LEGO: "to show you" / "mostrarte"
- Type: Infinitive verb phrase
- Natural usage: After verbs like "want", "need", "going to"
- Seed theme: "He wants to show you something"
- Should build phrases around: showing things, wanting to show, purposes

Phrase ideas:
- Start simple: "to show you" (bare LEGO)
- Add context: "to show you something"
- Vary patterns: "I want to show you", "He wants to show you"
- Build complexity: "I want to show you something important"
</thinking>
```

### Step 2: WORD CLASS RECOGNITION (CRITICAL)

Before generating ANY phrase, identify the LEGO's grammatical class:

#### VERB LEGOS (like "wants", "said", "met", "to show")

**Correct Usage**: In sentence context with subject/object
```
✅ "She wants coffee"
✅ "He said something important"
✅ "I met someone yesterday"
✅ "I want to show you something"
```

**Incorrect Usage**: Treating verb as noun
```
❌ "I think that wants is good"
❌ "This is said"
❌ "I know met"
❌ "Do you have to show?"
```

#### NOUN LEGOS (like "coffee", "something", "woman")

**Correct Usage**: As subject or object
```
✅ "Coffee is good" (subject)
✅ "I want coffee" (object)
✅ "The woman arrived" (subject)
✅ "I met the woman" (object)
```

#### ADJECTIVE LEGOS (like "new", "important", "young")

**Correct Usage**: Modifying nouns or as predicates
```
✅ "something new"
✅ "an important fact"
✅ "a young woman"
✅ "This is important"
```

#### PHRASE LEGOS (like "to show you", "from home", "I met")

**Correct Usage**: As complete units in context
```
✅ "I want to show you something"
✅ "I work from home"
✅ "I met someone at the store"
```

### Step 3: GENERATE 10 PHRASES

**Distribution (MANDATORY)**:
- **2 short (1-2 words)** - fragments OK, show bare LEGO
- **2 quite short (3 words)** - complete thoughts
- **2 longer (4-5 words)** - complete thoughts
- **4 long (6+ words)** - conversational gold ⭐

**Format**:
```json
["English phrase", "Spanish phrase", null, word_count]
```

**Requirements for ALL phrases**:

1. **GATE Compliance**: Every Spanish word must be in the `whitelist` array
2. **Natural Language**: Would a native speaker say this?
3. **Semantic Correctness**: Does it make logical sense?
4. **Progressive Complexity**: Build from simple to complex
5. **Thematic Coherence**: Relate to seed sentence theme

### Step 4: SPECIAL RULES

#### Final LEGO Rule ⭐
**If `is_final_lego: true`**, phrase #10 MUST be the complete seed sentence:
```json
["He said that he wants to show you something.", "Él dijo que quiere mostrarte algo.", null, 8]
```

#### Recency Priority
- Prioritize vocabulary from 5 previous seeds (more recent = more usage)
- Makes content feel fresh and reinforces recent learning

#### Conjunction Usage
- Only use conjunctions (si, y, pero, porque, cuando) if they're in the whitelist
- If available: use in 20-40% of phrases (2-4 out of 10)

---

## 🛡️ GATE COMPLIANCE (Zero Tolerance)

**CRITICAL**: Every Spanish word must be in the whitelist.

### How to Validate:

1. **Extract words** from Spanish phrase:
   - Split on spaces and punctuation
   - Lowercase all words
   - Example: "Quiero mostrarte algo." → ["quiero", "mostrarte", "algo"]

2. **Check against whitelist**:
   - Is "quiero" in the whitelist? ✅
   - Is "mostrarte" in the whitelist? ✅
   - Is "algo" in the whitelist? ✅

3. **If ANY word is missing** → REJECT phrase, generate replacement

**Common mistakes**:
```
Whitelist includes: "quiero" (I want)
❌ "Quiere mostrarte algo" (quiere not in whitelist)
✅ "Quiero mostrarte algo" (quiero is in whitelist)

Whitelist includes: "estoy" (I am)
❌ "Ella está aquí" (está not in whitelist)
✅ "Estoy aquí" (estoy is in whitelist)
```

**NO conjugations, NO variations - exact forms only.**

---

## ✅ OUTPUT FORMAT

Return the SAME scaffold JSON with `practice_phrases` filled:

```json
{
  "version": "curated_v6_molecular_lego",
  "agent_id": 1,
  "seed_range": "S0301-S0320",
  "generation_stage": "PHRASES_GENERATED",
  "seeds": {
    "S0301": {
      "seed": "S0301",
      "seed_pair": {...},
      "whitelist": [...],
      "legos": {
        "S0301L05": {
          "lego": ["to show you", "mostrarte"],
          "type": "A",
          "new": true,
          "is_final_lego": false,
          "practice_phrases": [
            ["to show you", "mostrarte", null, 1],
            ["to show you something", "mostrarte algo", null, 2],
            ["I want to show you", "Quiero mostrarte", null, 3],
            ["He wants to show you", "Él quiere mostrarte", null, 3],
            ["I want to show you something", "Quiero mostrarte algo", null, 4],
            ["He wants to show you something", "Él quiere mostrarte algo", null, 5],
            ["I want to show you something important", "Quiero mostrarte algo importante", null, 6],
            ["He wants to show you something new today", "Él quiere mostrarte algo nuevo hoy", null, 7],
            ["I want to show you something I know", "Quiero mostrarte algo que conozco", null, 8],
            ["He said that he wants to show you something", "Él dijo que quiere mostrarte algo", null, 8]
          ],
          "phrase_distribution": {
            "really_short_1_2": 2,
            "quite_short_3": 2,
            "longer_4_5": 2,
            "long_6_plus": 4
          },
          "_metadata": {...}
        }
      }
    }
  }
}
```

**DO NOT modify**:
- version, agent_id, seed_range
- whitelist arrays
- is_final_lego flags
- _metadata sections

**You MAY modify**:
- practice_phrases arrays (fill them in)
- phrase_distribution (update to match actual counts)
- generation_stage (change to "PHRASES_GENERATED")

---

## 🎯 QUALITY CHECKLIST (Per LEGO)

Before moving to the next LEGO, verify:

- [ ] 10 phrases generated (exactly 10)
- [ ] Distribution: 2-2-2-4 (short-quite short-longer-long)
- [ ] ALL Spanish words in whitelist (zero violations)
- [ ] All phrases sound natural in BOTH languages
- [ ] Word class used correctly (verb as verb, noun as noun)
- [ ] Progressive complexity (simple → complex)
- [ ] Thematic coherence (relates to seed theme)
- [ ] If final LEGO: phrase 10 is complete seed sentence
- [ ] No template patterns detected
- [ ] Extended thinking used for challenging LEGOs

---

## 💡 EXAMPLES

### Example 1: Verb LEGO - "met" / "conocí"

```
<thinking>
Word class: Verb (past tense)
Natural usage: "I met [someone/something]"
Seed theme: Meeting people
Context: Social interactions, learning Spanish

Phrases:
1. Bare LEGO: "I met"
2. Simple object: "I met him"
3. Add time: "I met someone today"
4. Add description: "I met someone who speaks"
5. Expand: "I want to meet someone"
6. Add detail: "I met someone a few days"
7. Complex: "I want to meet someone who speaks Spanish"
8. Full context: "I met someone who can speak Spanish with me"
9. Purpose: "I want to meet someone who speaks Spanish very well"
10. Complete: "I'm trying to meet someone who can help me learn"

Check: All use "met/conocí" as VERB with appropriate objects ✅
Check: No "I know met" or "This is met" patterns ✅
</thinking>
```

### Example 2: Noun LEGO - "coffee" / "café"

```
<thinking>
Word class: Noun
Natural usage: As subject or object
Seed theme: Daily activities

Phrases:
1. Bare: "coffee"
2. Simple: "the coffee"
3. As object: "I want coffee"
4. As subject: "Coffee is good"
5. With adjective: "I want good coffee"
6. Context: "I want to drink coffee today"
7. Complex: "I want coffee when I work"
8. More: "I want to drink coffee with you"
9. Full: "I met someone who wants coffee too"
10. Complete seed usage

Check: All use "coffee/café" as NOUN ✅
</thinking>
```

---

## 🚦 VALIDATION EXAMPLES

The JavaScript validation examples below are for **understanding the validation logic**.

**DO NOT interpret these as "write code to generate phrases".**

**Generate linguistically. Validate programmatically.**

### GATE Validation Example:

```javascript
// This is how validation works (for your understanding)
function validateGate(spanishPhrase, whitelist) {
  const words = spanishPhrase
    .toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const violations = [];
  for (const word of words) {
    if (!whitelist.includes(word)) {
      violations.push(word);
    }
  }

  return { valid: violations.length === 0, violations };
}

// Example:
validateGate("Quiero mostrarte algo", ["quiero", "mostrarte", "algo"])
// → { valid: true, violations: [] } ✅

validateGate("Quiere mostrarte algo", ["quiero", "mostrarte", "algo"])
// → { valid: false, violations: ["quiere"] } ❌
```

---

## 📝 SUMMARY

**Your task in 3 steps**:

1. **Load the scaffold JSON** (all mechanical setup done)
2. **For each NEW LEGO**:
   - Use extended thinking to understand the LEGO
   - Identify word class (verb/noun/adjective/phrase)
   - Generate 10 natural phrases (2-2-2-4 distribution)
   - Validate ALL Spanish words against whitelist
   - Check phrases sound natural in both languages
3. **Save the completed JSON** (same structure, practice_phrases filled)

**Remember**:
- ❌ NO scripts, NO templates, NO automation
- ✅ Linguistic reasoning, extended thinking, natural language
- 🎯 Quality over speed - "top dollar content"

---

**Good luck! Think linguistically, not mechanically. 🧠**
