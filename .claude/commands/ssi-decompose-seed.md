# SSi Decompose Seed

How to break a seed sentence into LEGOs for the SSi language learning system.

## 🎓 You Are a World-Class Language Teacher

You are applying the SaySomethingin (SSi) methodology - **the most effective methodology in the world for learning to speak a new language confidently and fast**. Your decomposition decisions shape how thousands of learners will acquire this language.

---

## ⚠️ WORK SLOWLY AND STEADILY

**Quality over speed. Always.** This is linguistic craftsmanship, not a race.

- Think carefully about each decomposition
- Don't rush to "get through" seeds quickly
- Verify each LEGO tiles correctly before moving on
- One poorly decomposed seed creates cascading problems

---

## ⚠️ ZERO EXPLANATIONS - CRITICAL

**ALL text becomes TTS audio. The learner HEARS everything.**

The known_text must be **natural English that a learner would want to say**. NEVER include:
- Grammar labels: ❌ "negation wrap", "verb-final", "complement marker"
- Linguistic terms: ❌ "subordinate", "reflexive", "aspect"
- Pattern descriptions: ❌ "A-not-A question", "time before verb"
- Parenthetical notes: ❌ "speak (verb)", "I want (modal)"

**WRONG:** `"not (negation wrap)"` → `"ne...pas"`
**RIGHT:** `"I don't want"` → `"je ne veux pas"`

**WRONG:** `"verb-得-result pattern"` → `"V得+result"`
**RIGHT:** `"speak well"` → `"说得好"`

Grammar is INFERRED through pattern recognition, never explicitly taught.

---

## Core Principle

Every seed must be FULLY TILEABLE from its LEGOs. No part of the sentence can be skipped.

## Same Pattern, Any Language

The decomposition approach works identically across ALL language families:

**CHINESE:** "I want to speak Chinese" → 我想说中文
```
L1 [M] "I want" → 我想 [I→我, want→想]
L2 [A] "to speak" → 说
L3 [A] "Chinese" → 中文
```

**PORTUGUESE:** "I want to speak Portuguese" → Eu quero falar português
```
L1 [M] "I want" → eu quero [I→eu, want→quero]
L2 [A] "to speak" → falar
L3 [A] "Portuguese" → português
```

**GERMAN:** "I want to speak German" → Ich möchte Deutsch sprechen
```
L1 [M] "I would like" → ich möchte [I→ich, would like→möchte]
L2 [A] "German" → Deutsch
L3 [A] "to speak" → sprechen
```

**The principle is universal:** chunk meaningful phrases as M-LEGOs, single words as A-LEGOs.

---

## LEGO Types

**A-type (Atomic)**: Single meaningful words
- Chinese: "Chinese" → "中文", "now" → "现在"
- Portuguese: "Portuguese" → "português", "now" → "agora"
- German: "German" → "Deutsch", "now" → "jetzt"

**M-type (Molecular)**: Multi-word phrases with components
- Chinese: "I want" → "我想" [I→我, want→想]
- Portuguese: "I want" → "eu quero" [I→eu, want→quero]
- German: "I would like" → "ich möchte" [I→ich, would like→möchte]

## Ordering Rule: PEDAGOGICAL, NOT MECHANICAL

Order LEGOs so phrases build naturally. Temporal markers and grammar particles come LAST.

**BAD** (mechanical, follows sentence order):
```
"I want to speak Chinese with you now"
1. I → 我
2. now → 现在  ← TOO EARLY! Nothing to combine with
3. want to speak → 想说
4. with you → 和你
5. Chinese → 中文
```

**GOOD** (pedagogical):
```
1. I want → 我想 [M-LEGO]
2. to speak → 说
3. Chinese → 中文
4. with you → 和你 [M-LEGO]
5. now → 现在  ← LAST! Now combines with everything
```

## Tiling Check

Before submitting, verify the full seed can be reconstructed:

Seed: "我现在想和你说中文"
- 我想 ✓
- 说 ✓
- 中文 ✓
- 和你 ✓
- 现在 ✓
- Full sentence: 我 + 现在 + 想 + 和 + 你 + 说 + 中文 ✓

**If any part is missing, add a LEGO for it!**

## Punctuation - AUTOMATICALLY STRIPPED

**NEVER create standalone punctuation LEGOs.** Punctuation is automatically stripped during tiling validation.

| Character | Type | Create LEGO? |
|-----------|------|--------------|
| 。？！、 | CJK punctuation | ❌ NO |
| . ? ! , | Western punctuation | ❌ NO |
| ؟ ، ؛ | Arabic punctuation | ❌ NO |

**Example - WRONG:**
```
Seed: "你好吗？" (How are you?)
L1 [A] "you" → 你
L2 [A] "good" → 好
L3 [A] "?" → ？  ← ❌ NEVER DO THIS!
```

**Example - CORRECT:**
```
Seed: "你好吗？" (How are you?)
L1 [A] "you" → 你
L2 [M] "good?" → 好吗 [good→好]  ← Punctuation attached to final LEGO
```

Or simply omit punctuation - tiling will pass either way because `？` is stripped during validation.

**Why this matters:**
- TTS cannot generate audio for standalone punctuation
- Learners don't need to "learn" punctuation as vocabulary
- Creates orphaned audio requirements that can never be fulfilled

## Reusing Existing LEGOs

Later seeds will reuse vocabulary. Check what's already available:
- `GET /api/vocab/{course_code}` - see current vocabulary
- If a LEGO already exists, don't recreate it (API marks is_new: false)

A seed might only need 1 new LEGO if the rest is covered. That's fine!
But the seed must still TILE from available LEGOs.

## M-LEGO Components - MANDATORY

**ALL M-type LEGOs MUST have component breakdown.** This is not optional.

Components teach the building blocks BEFORE the assembled phrase. Without them, learners are asked to memorize chunks they can't construct mentally.

### Component Rules

1. **Every M-LEGO needs at least 1 component** (excluding particles)
2. **Long M-LEGOs (4+ characters) need 2+ components**
3. **Components enable construction** - learner should be able to mentally build the M-LEGO

### Example: Good M-LEGO

```json
{
  "type": "M",
  "known": "I want",
  "target": "我想",
  "components": [
    {"known": "I", "target": "我"},
    {"known": "want", "target": "想"}
  ]
}
```

Learner sees: I → 我, want → 想, I want → 我想

### Example: BAD (will be REJECTED)

```json
{
  "type": "M",
  "known": "everything you've done",
  "target": "你做的一切",
  "components": []  // ❌ REJECTED! No components for 5-char M-LEGO
}
```

**Fix:** Add components:
```json
{
  "components": [
    {"known": "you", "target": "你"},
    {"known": "do", "target": "做"},
    {"known": "everything", "target": "一切"}
  ]
}
```

### Grammar is INFERRED, Never Taught

**Components must be REAL WORDS that translate to actual vocabulary.**

Grammar patterns (particles, conjugations, case endings) are NEVER listed as components. The learner infers their meaning from contrast.

#### Chinese Example
**WRONG:**
```json
{
  "type": "M",
  "known": "done",
  "target": "做了",
  "components": [
    {"known": "do", "target": "做"},
    {"known": "completed action marker", "target": "了"}  // ❌ BULLSHIT!
  ]
}
```

**RIGHT:**
```json
{
  "type": "M",
  "known": "done",
  "target": "做了",
  "components": [{"known": "do", "target": "做"}]
}
```
Learner sees: do → 做, done → 做了. They infer 了 = completion.

#### Portuguese Example
**WRONG:**
```json
{
  "type": "M",
  "known": "I speak",
  "target": "eu falo",
  "components": [
    {"known": "I", "target": "eu"},
    {"known": "first person singular conjugation", "target": "-o"}  // ❌ BULLSHIT!
  ]
}
```

**RIGHT:**
```json
{
  "type": "M",
  "known": "I speak",
  "target": "eu falo",
  "components": [{"known": "I", "target": "eu"}, {"known": "speak", "target": "falar"}]
}
```
Learner sees: to speak → falar, I speak → eu falo. They infer conjugation.

#### German Example
**WRONG:**
```json
{
  "type": "M",
  "known": "eaten",
  "target": "gegessen",
  "components": [
    {"known": "past participle prefix", "target": "ge-"},  // ❌ BULLSHIT!
    {"known": "eat", "target": "essen"}
  ]
}
```

**RIGHT:**
```json
{
  "type": "A",
  "known": "eaten",
  "target": "gegessen"
}
```
Or as part of an M-LEGO: "I have eaten" → "ich habe gegessen" [I have→ich habe, eaten→gegessen]

**Rule: If you can't translate it to a single English WORD (not an explanation), don't make it a component.**

## Overlapping LEGOs - For Word Order Differences

When word order differs between languages, use **BOTH** atomic LEGOs AND a chunk M-LEGO.

**Example: "blue thing" = "cosa azul" in Spanish (reversed order)**
```
A-LEGO: "blue" → "azul"
A-LEGO: "thing" → "cosa"
M-LEGO: "blue thing" → "cosa azul" [blue→azul, thing→cosa]
```

This is NOT a ZUT conflict because the known_texts are different ("blue" ≠ "blue thing").

**Why use overlapping LEGOs?**
- Simple word-by-word tiling produces wrong word order: "azul cosa" ≠ "cosa azul"
- The M-LEGO handles the transformation that occurs when words combine
- Learners benefit from knowing BOTH the atoms AND how they transform when combined

**When to use overlapping LEGOs:**
- Adjective/noun order reversal (English→Spanish, English→French)
- Verb position differences (English→German final verbs)
- Particle placement differences (Asian languages)
- Compound formations that don't follow simple concatenation

**Example decomposition with overlap:**
```
Seed: "I want a blue thing" → "Quiero una cosa azul"

L1 [M] "I want" → "quiero" [I→yo, want→quiero]
L2 [A] "a" → "una"
L3 [A] "blue" → "azul"
L4 [A] "thing" → "cosa"
L5 [M] "blue thing" → "cosa azul" [blue→azul, thing→cosa]  ← OVERLAP!
```

The overlap at L5 ensures proper word order when "blue" + "thing" combine in Spanish.

---

## Decomposition Checklist

1. [ ] Translate seed naturally
2. [ ] Identify meaningful chunks (not whole sentence!)
3. [ ] Order pedagogically (grammar markers last)
4. [ ] Create M-LEGOs with components where needed
5. [ ] **Check for word-order differences - add overlapping M-LEGOs if needed**
6. [ ] Verify full seed tiles from LEGOs
7. [ ] Check for vocabulary reuse from prior seeds
