# Generate E-Phrases (Step 1)

E-phrases are **eternal phrases** - natural sentences for spaced repetition practice.

## Goal

Generate 3-5 natural, conversational sentences that:
1. Use ONLY vocabulary from prior LEGOs (GATE)
2. Include the operative LEGO (what's being taught)
3. Have perfect grammar in BOTH languages
4. Are things people actually say
5. Tile perfectly from LEGOs (no extra/missing words)
6. Match appropriate phrase length for available vocabulary

## Process

### Step 1: Determine available vocabulary

```javascript
const legoId = "S0030L04";
const position = canonical_order.indexOf(legoId);  // e.g., 126
const availableLegos = canonical_order.slice(0, position);  // LEGOs #1-125
```

### Step 2: Determine target phrase length

Use [PHRASE_LENGTH.md](../rules/PHRASE_LENGTH.md):

- 100+ LEGOs available → 7-10 words
- 51-100 LEGOs → 6-8 words
- 21-50 LEGOs → 5-6 words
- 6-20 LEGOs → 3-4 words
- 0-5 LEGOs → 0-2 words

### Step 3: Generate candidate phrases

Create 5-7 candidate phrases:

```
For LEGO "ayer" (yesterday) with 125 available LEGOs:

Candidates:
1. "Quería preguntarte algo ayer." (5 words - TOO SHORT)
2. "Quería hablar español contigo ayer." (5 words - TOO SHORT)
3. "Quería preguntarte algo importante sobre tu trabajo ayer." (8 words - GOOD ✓)
4. "Estaba pensando en hablar contigo sobre esto ayer." (9 words - GOOD ✓)
5. "Quería aprender más palabras nuevas en español ayer." (8 words - GOOD ✓)
```

### Step 4: Validate each candidate

Run through quality checklist for each:

1. **GATE**: All LEGOs < current? (ABSOLUTE)
2. **Grammar**: Perfect in BOTH languages? (ABSOLUTE)
3. **Phrase length**: Matches target range? (IMPORTANT)
4. **Tiling**: Composes exactly from LEGOs? (ABSOLUTE)
5. **Natural**: Something people actually say? (IMPORTANT)
6. **Operative**: Contains the LEGO being taught? (ABSOLUTE)

### Step 5: Select best 3-5 phrases

Choose phrases that:
- Pass all ABSOLUTE criteria
- Are most natural and useful
- Provide variety (different contexts, different prior LEGOs)

## Quality Guidelines

### Naturalness

✅ NATURAL:
```
"Quería preguntarte algo importante sobre tu trabajo ayer."
(I wanted to ask you something important about your work yesterday.)
```

People actually say this in conversation.

❌ UNNATURAL:
```
"Quería preguntarte algo rápido diferente ayer ahora."
(I wanted to ask you something quick different yesterday now.)
```

Forced, doesn't make sense, grammatically awkward.

### Variety

Don't repeat the same structure:

❌ REPETITIVE:
```
1. "Quería hablar español ayer."
2. "Quería aprender español ayer."
3. "Quería intentar español ayer."
```

✅ VARIED:
```
1. "Quería preguntarte algo importante sobre tu trabajo ayer."
2. "Estaba pensando en hablar contigo ayer."
3. "No podía recordar lo que querías decir ayer."
```

### Usefulness

Prioritize phrases that:
- Express common needs/thoughts
- Use high-frequency vocabulary
- Practice important constructions

✅ USEFUL:
```
"Quería preguntarte algo importante."
(I wanted to ask you something important.)
```

✗ LESS USEFUL:
```
"Quería hablar sobre el perro pequeño amarillo."
(I wanted to talk about the small yellow dog.)
```

## Special Cases

### Culminating LEGOs

For culminating LEGOs (last in seed), **first e-phrase = complete seed sentence**.

See [CULMINATING_LEGOS.md](../rules/CULMINATING_LEGOS.md) for details.

```json
{
  "S0030L04": {
    "e": [
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],  // ← SEED FIRST
      ["Estaba pensando en ti ayer.", "I was thinking about you yesterday."],
      ["No podía recordar tu nombre ayer.", "I couldn't remember your name yesterday."]
    ]
  }
}
```

### Early LEGOs (limited vocabulary)

For LEGOs #1-10 with minimal vocabulary:
- Short phrases (2-3 words) are CORRECT
- Empty baskets are acceptable for LEGO #1
- Don't force unnatural long phrases

✅ CORRECT (LEGO #3 with 2 available):
```json
{
  "S0002L01": {
    "e": [
      ["Estoy intentando aprender.", "I'm trying to learn."]  // 3 words - appropriate
    ]
  }
}
```

### Recency Bias (LEGOs #50+)

For LEGOs with rich vocabulary (50+), use **recency bias**:
- 30-50% vocabulary from recent seeds (last 10 seeds)
- 50-70% from earlier seeds (foundational)

See [RECENCY_BIAS.md](RECENCY_BIAS.md) for details.

## E-Phrase Checklist

Before accepting a phrase:

- ✓ GATE compliant? (check every LEGO)
- ✓ Grammar perfect in BOTH languages?
- ✓ Phrase length matches available vocabulary?
- ✓ Tiles perfectly from LEGOs?
- ✓ Natural and conversational?
- ✓ Contains operative LEGO?
- ✓ Useful for learners?

If all YES → accept
If any ABSOLUTE fails → reject

## Bottom Line

**Generate natural, grammatical phrases at appropriate length. Quality over quantity.**
