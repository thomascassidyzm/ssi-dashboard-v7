# SSi Decompose Seed

How to break a seed sentence into LEGOs for the SSi language learning system.

## Core Principle

Every seed must be FULLY TILEABLE from its LEGOs. No part of the sentence can be skipped.

## LEGO Types

**A-type (Atomic)**: Single meaningful words
- "Chinese" → "中文"
- "now" → "现在"
- "speak" → "说"

**M-type (Molecular)**: Multi-word phrases with components
- "I want" → "我想" with components: ["I" → "我"], ["want" → "想"]
- "with you" → "和你" with components: ["with" → "和"], ["you" → "你"]

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

### Particles are INFERRED, Never Taught

**Components must be REAL WORDS that translate to actual vocabulary.**

Particles (了, 着, 过, 吗, 的, etc.) are NEVER listed as components. The learner infers their meaning from context.

**WRONG - grammatical explanation as component:**
```json
{
  "type": "M",
  "known": "done",
  "target": "做了",
  "components": [
    {"known": "do", "target": "做"},
    {"known": "completed action marker", "target": "了"}  // ❌ BULLSHIT! Not a word!
  ]
}
```

**RIGHT - only real vocabulary:**
```json
{
  "type": "M",
  "known": "done",
  "target": "做了",
  "components": [{"known": "do", "target": "做"}]
}
```

The learner sees:
```
do    →  做
done  →  做了
```

They infer 了 indicates completion from the contrast. No explanation needed!

**More examples:**

```
good     →  好
Is it good?  →  好吗
```
Learner infers 吗 = question marker.

```
eat      →  吃
eating   →  在吃
```
Learner infers 在 = ongoing action.

**Rule: If you can't translate it to a single English WORD (not an explanation), don't make it a component.**

## Decomposition Checklist

1. [ ] Translate seed naturally
2. [ ] Identify meaningful chunks (not whole sentence!)
3. [ ] Order pedagogically (grammar markers last)
4. [ ] Create M-LEGOs with components where needed
5. [ ] Verify full seed tiles from LEGOs
6. [ ] Check for vocabulary reuse from prior seeds
