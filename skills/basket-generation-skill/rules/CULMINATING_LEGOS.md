# Culminating LEGOs (Special Case)

**Culminating LEGO** = Last LEGO in a seed

**Rule**: First e-phrase MUST be the complete seed sentence.

## Why this matters

Culminating LEGOs are the pedagogical "payoff" moment:
- Learner has practiced all fragments (LEGOs) in the seed
- Now they can speak the COMPLETE sentence
- This is the reward for mastering the pieces

## How to identify culminating LEGOs

Look at LEGO ID format: `S0030L04`

- `S0030` = Seed 30
- `L04` = LEGO 4

**Check**: Is this the highest LEGO number for seed S0030?

```javascript
// In lego_pairs.json
["S0030", [...seed pair...], [
  ["S0030L01", "B", "Quería", "I wanted"],
  ["S0030L02", "B", "preguntarte", "to ask you"],
  ["S0030L03", "B", "algo", "something"],
  ["S0030L04", "B", "ayer", "yesterday"]  // ← LAST = CULMINATING
]]
```

S0030L04 is the last LEGO → culminating ✓

## The requirement

For culminating LEGOs:

**E-phrase #1 = Complete seed sentence**

✅ CORRECT:
```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],  // ← COMPLETE SEED FIRST
      ["Quería hablar contigo ayer.", "I wanted to speak with you yesterday."],
      ["Quería aprender español ayer.", "I wanted to learn Spanish yesterday."]
    ]
  }
}
```

❌ WRONG:
```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería hablar contigo ayer.", "I wanted to speak with you yesterday."],  // ← NOT THE SEED
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],  // ← SEED IS 2ND
      ["Quería aprender español ayer.", "I wanted to learn Spanish yesterday."]
    ]
  }
}
```

## How to find the complete seed sentence

**Step 1**: Identify seed ID from LEGO ID

```
LEGO: S0030L04 → Seed: S0030
```

**Step 2**: Look up seed in seed_pairs.json

```json
{
  "S0030": ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."]
}
```

**Step 3**: Use as first e-phrase for culminating LEGO

## Non-culminating LEGOs

For LEGOs that are NOT culminating (e.g., S0030L01, S0030L02, S0030L03):

- Generate normal baskets
- No requirement to include complete seed
- Focus on natural phrases using the operative LEGO

## Examples

### Seed S0030

**Seed sentence**: `"Quería preguntarte algo ayer."` (I wanted to ask you something yesterday.)

**LEGOs:**
- S0030L01: `"Quería"` - NOT culminating
- S0030L02: `"preguntarte"` - NOT culminating
- S0030L03: `"algo"` - NOT culminating
- S0030L04: `"ayer"` - **CULMINATING** ← First e-phrase MUST be seed

**S0030L01 basket** (not culminating):
```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [
      ["Quería hablar español contigo esta tarde.", "I wanted to speak Spanish with you this afternoon."],  // ← Any natural phrase
      ["Quería aprender más sobre el trabajo hoy.", "I wanted to learn more about the work today."]
    ]
  }
}
```

**S0030L04 basket** (culminating):
```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],  // ← MUST BE SEED
      ["Quería hablar contigo ayer.", "I wanted to speak with you yesterday."],
      ["Estaba pensando en ti ayer.", "I was thinking about you yesterday."]
    ]
  }
}
```

## Validation

Before finalizing a basket:

```javascript
if (isLastLegoInSeed(legoId)) {
  const seedSentence = getSeedSentence(legoId);
  const firstEPhrase = basket.e[0];

  if (firstEPhrase !== seedSentence) {
    throw new Error("Culminating LEGO must have seed sentence as first e-phrase");
  }
}
```

## Why this is pedagogically important

The learner's experience:

1. **S0030L01**: "Okay, I can say 'Quería'..."
2. **S0030L02**: "Now I can say 'preguntarte'..."
3. **S0030L03**: "I learned 'algo'..."
4. **S0030L04**: "Wait! I can now say the WHOLE sentence: 'Quería preguntarte algo ayer'!" 🎉

This creates a sense of achievement and closure.

## Bottom Line

**Culminating LEGO = last in seed → first e-phrase = complete seed sentence. This is non-negotiable.**
