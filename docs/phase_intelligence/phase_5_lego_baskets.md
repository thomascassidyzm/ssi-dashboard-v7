# AGENT PROMPT: Phase 5 Basket Generation v5.0 (STAGED PIPELINE)

**Version**: 5.0 - Ultimate Edition (2025-11-09)
**Status**: Production Ready - Staged Pipeline with Correct Whitelist Logic
**Purpose**: Generate high-quality practice phrase baskets using linguistic reasoning only

---

## 🎯 YOUR MISSION

You will receive a **SCAFFOLD JSON** where ALL mechanical work is complete:

✅ **Whitelist** - Available Spanish vocabulary (3-category rule applied)
✅ **Structure** - JSON skeleton with metadata
✅ **Flags** - `is_final_lego` marked for final LEGOs in each seed

**Your ONLY task**: Fill the `practice_phrases` arrays (10 phrases per LEGO) using linguistic intelligence.

---

## 🚨 CRITICAL: THIS IS A LINGUISTIC TASK, NOT A CODING TASK

### ❌ PROHIBITED APPROACHES

You **MAY NOT**:
- Write Python/JavaScript/any scripts to generate phrases
- Use template-based generation (f-strings, string interpolation)
- Mechanically substitute LEGO text into fixed patterns
- Automate phrase creation through loops or functions

**Why?** Automated generation cannot understand:
- Word class (verb vs noun vs adjective)
- Semantic appropriateness
- Natural usage patterns
- Contextual fit

### ✅ REQUIRED APPROACH

You **MUST**:
- Think through each phrase individually
- Use extended thinking (`<thinking>` tags) for every LEGO
- Understand the LEGO's grammatical role
- Create natural, conversational usage
- Validate semantic correctness

**This takes longer but produces "top dollar content" quality.**

---

## 📋 INPUT: SCAFFOLD STRUCTURE

The scaffold you receive contains:

```json
{
  "version": "curated_v7_spanish",
  "agent_id": 1,
  "seed_range": "S0001-S0020",
  "seeds": {
    "S0001": {
      "seed": "S0001",
      "seed_pair": {
        "known": "I want to speak Spanish with you now.",
        "target": "Quiero hablar español contigo ahora."
      },
      "whitelist": ["quiero", "hablar", "español", "contigo", "ahora"],
      "cumulative_legos": 5,
      "legos": {
        "S0001L01": {
          "lego": ["I want", "quiero"],
          "type": "A",
          "available_legos": 0,
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
  }
}
```

### What's Already Done (DO NOT MODIFY):
- ✅ JSON structure
- ✅ Whitelist arrays (3-category rule applied - see below)
- ✅ Metadata (available_legos, cumulative_legos, is_final_lego)
- ✅ Seed context for thematic guidance

### What You Must Do:
- Fill the `practice_phrases` arrays ONLY
- Update `phrase_distribution` to match actual phrase counts
- **DO NOT modify any other fields**

---

## 🔑 UNDERSTANDING THE WHITELIST (3-Category Rule)

The whitelist was built mechanically using the "learned already" philosophy. Words come from THREE sources:

### 1. Atomic LEGOs (A-type)
```json
{"type": "A", "target": "quiero", "known": "I want"}
→ Whitelist: "quiero" (learner knows it as "I want")
```

### 2. Molecular LEGOs (M-type) - Complete
```json
{"type": "M", "target": "estoy intentando", "known": "I'm trying"}
→ Whitelist: "estoy", "intentando" (split into words, but learned as phrase)
```

### 3. Component Words from Molecular LEGOs - Literal Translations
```json
{
  "type": "M",
  "target": "estoy intentando",
  "known": "I'm trying",
  "components": [
    ["estoy", "I am"],      // ← Literal translation
    ["intentando", "trying"] // ← Literal translation
  ]
}
→ Whitelist:
  - "estoy" (learner knows literal: "I am")
  - "intentando" (learner knows literal: "trying")
```

**Why components?** The learner sees how the target language builds patterns from parts:
- "estoy intentando" = "I'm trying" (the whole)
- "estoy" = "I am" (component 1 - literal)
- "intentando" = "trying" (component 2 - literal)

This lets them **reconstruct and recombine** - seeing grammar without explanation!

**Example:**
```
LEGO: "lo más posible" = "as much as possible" (M-type)
Components:
  - "lo más" = "the most" (literal)
  - "posible" = "possible" (literal)

Learner can now use:
  ✅ "lo más posible" (the whole phrase)
  ✅ "lo más" alone (knows it means "the most")
  ✅ "posible" alone (knows it means "possible")
```

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
   - Look at `seed_pair` for context
   - How can phrases build toward the seed sentence?

**Example extended thinking**:
```
<thinking>
LEGO: "quiero" / "I want"
- Type: Verb (first person singular, present)
- Natural usage: Followed by infinitive or noun
- Seed theme: "I want to speak Spanish with you now"

Phrase ideas:
1. Start bare: "I want" (show the LEGO)
2. Add object: "I want coffee"
3. Add infinitive: "I want to speak"
4. Build complexity: "I want to speak Spanish"
5. Toward seed: "I want to speak Spanish with you now"
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

#### PHRASE LEGOS (like "to show you", "from home", "I'm trying")

**Correct Usage**: As complete units in context
```
✅ "I want to show you something"
✅ "I work from home"
✅ "I'm trying to learn Spanish"
```

### Step 3: GENERATE 10 PHRASES

**Distribution (MANDATORY)**:
- **2 short (1-2 words)** - fragments OK, show bare LEGO
- **2 quite short (3 words)** - complete thoughts
- **2 longer (4-5 words)** - complete thoughts
- **4 long (6+ words)** - conversational gold ⭐

**Format**:
```json
["English phrase", "Spanish phrase", pattern_code_or_null, word_count]
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
["I want to speak Spanish with you now.", "Quiero hablar español contigo ahora.", null, 7]
```

#### 🎯 Recency Reinforcement (HIGH PRIORITY)

**Your scaffold includes `recent_context`** - the last 5 seeds with LEGO tiling.

**CRITICAL**: Use these patterns extensively in practice phrases:

- **Target**: 50-70% of phrases should incorporate LEGOs from `recent_context`
- **Why**: Spaced repetition - learners see recent vocabulary in new combinations
- **How**: For each practice phrase, scan `recent_context` and preferentially combine with those LEGOs

**Example**: Teaching "recordar" (to remember) with `recent_context`:
```json
"recent_context": {
  "S0002": ["estoy intentando | aprender", "I'm trying | to learn"],
  "S0005": ["Voy a | practicar | hablar", "I'm going to | to practise | speaking"]
}
```

✅ GOOD phrases (use recent patterns):
- "Estoy intentando recordar" (uses S0002's "estoy intentando")
- "Voy a recordar" (uses S0005's "Voy a")
- "Quiero practicar recordar" (uses S0005's "practicar")

❌ MISSED OPPORTUNITY (generic, no recent reinforcement):
- "Recordar algo"
- "Recordar ahora"

**The recent_context shows you EXACTLY which LEGOs to prioritize** - use them!

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
   - Example: "Quiero hablar español." → ["quiero", "hablar", "español"]

2. **Check against whitelist**:
   - Is "quiero" in the whitelist? ✅
   - Is "hablar" in the whitelist? ✅
   - Is "español" in the whitelist? ✅

3. **If ANY word is missing** → REJECT phrase, generate replacement

**Common mistakes**:
```
Whitelist includes: "quiero" (I want)
❌ "Quiere hablar español" (quiere not in whitelist)
✅ "Quiero hablar español" (quiero is in whitelist)

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
  "version": "curated_v7_spanish",
  "agent_id": 1,
  "seed_range": "S0001-S0020",
  "generation_stage": "PHRASES_GENERATED",
  "seeds": {
    "S0001": {
      "seed": "S0001",
      "seed_pair": {...},
      "whitelist": [...],
      "legos": {
        "S0001L01": {
          "lego": ["I want", "quiero"],
          "type": "A",
          "practice_phrases": [
            ["I want", "quiero", null, 1],
            ["I want coffee", "quiero café", null, 2],
            ["I want to speak", "quiero hablar", null, 3],
            ["I want to learn Spanish", "quiero aprender español", null, 4],
            ["I want to speak Spanish now", "quiero hablar español ahora", null, 5],
            ["I want to speak Spanish with you", "quiero hablar español contigo", null, 6],
            ["I want to speak with you now", "quiero hablar contigo ahora", null, 6],
            ["I want to learn Spanish with you", "quiero aprender español contigo", null, 6],
            ["I want to speak Spanish with someone", "quiero hablar español con alguien", null, 7],
            ["I want to speak Spanish with you now", "quiero hablar español contigo ahora", null, 7]
          ],
          "phrase_distribution": {
            "really_short_1_2": 2,
            "quite_short_3": 2,
            "longer_4_5": 2,
            "long_6_plus": 4
          }
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
- seed_pair data

**You MUST modify**:
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

### Example 1: Verb LEGO - "quiero" / "I want"

```
<thinking>
Word class: Verb (first person, present)
Natural usage: "quiero" + infinitive or noun
Seed theme: Wanting to speak Spanish
Context: Learning, communication

Phrases:
1. Bare: "I want"
2. Simple: "I want coffee"
3. Infinitive: "I want to speak"
4. Build: "I want to learn Spanish"
5. Expand: "I want to speak Spanish now"
6. More: "I want to speak Spanish with you"
7. Longer: "I want to speak with you now"
8. Complex: "I want to learn Spanish with you"
9. Rich: "I want to speak Spanish with someone"
10. Seed: "I want to speak Spanish with you now"

Check: All use "quiero" as VERB with appropriate complements ✅
Check: No "I know quiero" or "This is quiero" patterns ✅
</thinking>
```

### Example 2: Molecular LEGO - "estoy intentando" / "I'm trying"

```
<thinking>
Word class: Verb phrase (present continuous)
Natural usage: "estoy intentando" + infinitive
Components available: "estoy" (I am), "intentando" (trying)
Seed theme: Trying to learn

Phrases:
1. Bare: "I'm trying"
2. Simple: "I'm trying now"
3. Infinitive: "I'm trying to speak"
4. Build: "I'm trying to learn"
5. Expand: "I'm trying to learn Spanish"
6. More: "I'm trying to speak Spanish now"
7. Complex: "I'm trying to speak with you"
8. Rich: "I'm trying to learn Spanish with you"
9. Full: "I'm trying to speak Spanish with someone"
10. Seed context: "I'm trying to learn Spanish now"

Check: All use "estoy intentando" as complete phrase ✅
Check: Could also use "estoy" alone (component) ✅
</thinking>
```

---

## 🚨 COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Using Untaught Conjugations

```json
Whitelist: ["quiero"]
❌ "Quiere hablar español" (quiere not taught)
✅ "Quiero hablar español" (quiero is taught)
```

### ❌ Mistake 2: Wrong Word Class Usage

```json
LEGO: "wants" (verb)
❌ "I think that wants is good" (treating verb as noun)
✅ "She wants coffee" (verb with subject/object)
```

### ❌ Mistake 3: Incomplete Thoughts (phrases 3-10)

```json
❌ "to be able to" (incomplete - to be able to WHAT?)
✅ "I want to be able to speak" (complete thought)
```

### ❌ Mistake 4: Ignoring Final LEGO Rule

```json
is_final_lego: true
❌ Phrase 10: "I want to speak Spanish very well" (not the seed)
✅ Phrase 10: "I want to speak Spanish with you now" (exact seed)
```

### ❌ Mistake 5: Template Generation

```python
# This is FORBIDDEN:
❌ for verb in verbs:
     phrases.append(f"I want to {verb}")

# This is REQUIRED:
✅ <thinking>
   What does "quiero" naturally combine with?
   - Objects: coffee, water
   - Infinitives: to speak, to learn
   Build phrases that sound natural...
   </thinking>
```

---

## 📊 SUCCESS METRICS

**Quality targets** (from production testing):
- ✅ 100% GATE compliance (zero violations)
- ✅ 100% natural language (both English and Spanish)
- ✅ 100% complete tiling (phrase 10 of final LEGO = seed)
- ✅ 2-2-2-4 distribution maintained
- ✅ Thematic coherence with seed context
- ✅ Progressive complexity (simple → conversational)

**From S0001-S0100 test run:**
- ✅ 100% format compliance
- ✅ 98%+ GATE compliance
- ✅ ~45 minutes for 100 seeds (linguistic generation)
- ✅ "Top dollar content" quality achieved

---

## ✅ SELF-VALIDATION CHECKLIST (CRITICAL)

**Before writing your output JSON, you MUST validate your baskets:**

### Format Validation
- [ ] Output is valid JSON
- [ ] All `practice_phrases` arrays have exactly 10 phrases
- [ ] Each phrase is `[known, target]` format (English first, Spanish second)
- [ ] `phrase_distribution` counts updated to match actual phrases

### Distribution Validation (2-2-2-4 Rule)
- [ ] 2 phrases with 1-2 Spanish words (really short)
- [ ] 2 phrases with 3 Spanish words (quite short)
- [ ] 2 phrases with 4-5 Spanish words (longer)
- [ ] 4 phrases with 6+ Spanish words (long)
- [ ] **Count Spanish words by splitting on spaces** (e.g., "Quiero hablar" = 2 words)

### GATE Compliance (CRITICAL)
- [ ] **Every Spanish word** in every phrase must be in the whitelist
- [ ] Check each word by splitting Spanish phrase on spaces
- [ ] Whitelist includes: A-type LEGOs, M-type LEGOs, M-type components, current LEGO being taught
- [ ] No words outside available vocabulary
- [ ] **If word not in whitelist → REMOVE THE PHRASE and create a different one**

### Final LEGO Validation
- [ ] If `is_final_lego: true`, phrase #10 MUST be the complete seed sentence
- [ ] English phrase #10 must EXACTLY match `seed_pair.known`
- [ ] Spanish phrase #10 must EXACTLY match `seed_pair.target`
- [ ] Remove any punctuation before comparing if needed

### Recency Reinforcement (50-70% target)
- [ ] Check `recent_context` field in scaffold
- [ ] Count how many phrases use LEGOs from recent_context
- [ ] Target: At least 5-7 out of 10 phrases should incorporate recent vocabulary
- [ ] Prioritize combining current LEGO with patterns from last 5 seeds

### Natural Language Validation
- [ ] Each phrase sounds natural in both English and Spanish
- [ ] No nonsensical combinations (e.g., "I want table" - grammatical but unnatural)
- [ ] Phrases use LEGO in contextually appropriate way
- [ ] Word class respected (verbs as verbs, nouns as nouns, etc.)

**If ANY check fails → FIX IT before writing output**

**Common fixes:**
- GATE violation → Replace phrase with one using only whitelist words
- Distribution wrong → Adjust phrase lengths (add/remove words)
- Final phrase mismatch → Use exact seed sentence for phrase #10
- Low recency → Scan recent_context and rewrite phrases to incorporate those LEGOs
- Unnatural phrase → Rethink the usage context

---

## 📝 SUMMARY

**Your task in 3 steps**:

1. **Load the scaffold JSON** (all mechanical setup done)
2. **For each LEGO**:
   - Use extended thinking to understand the LEGO
   - Identify word class (verb/noun/adjective/phrase)
   - Generate 10 natural phrases (2-2-2-4 distribution)
   - Validate ALL Spanish words against whitelist
   - Check phrases sound natural in both languages
   - **Run self-validation checklist above**
3. **Save the completed JSON** (same structure, practice_phrases filled)

**Remember**:
- ❌ NO scripts, NO templates, NO automation
- ✅ Linguistic reasoning, extended thinking, natural language
- ✅ **SELF-VALIDATE before writing output**
- 🎯 Quality over speed - "top dollar content"

---

**Good luck! Think linguistically, not mechanically. 🧠**

---

**Version History:**
- v5.0 (2025-11-09): Staged pipeline with 3-category whitelist logic
- v4.1: Staged scaffold approach
- v4.0: Self-validating agent with gates
- v3.0: GATE compliance focus
