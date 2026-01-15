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

## M-LEGO Components

For M-LEGOs, components become vocabulary for the build-up:

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

**Particles are NOT components** - they're inferred from context:
```json
{
  "type": "M",
  "known": "Is it good?",
  "target": "好吗",
  "components": [{"known": "good", "target": "好"}]
}
```
Learner infers 吗 makes questions.

## Decomposition Checklist

1. [ ] Translate seed naturally
2. [ ] Identify meaningful chunks (not whole sentence!)
3. [ ] Order pedagogically (grammar markers last)
4. [ ] Create M-LEGOs with components where needed
5. [ ] Verify full seed tiles from LEGOs
6. [ ] Check for vocabulary reuse from prior seeds
