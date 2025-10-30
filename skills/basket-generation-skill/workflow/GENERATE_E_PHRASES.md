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

### STEP 0: Identify Your Vocabulary Window (MANDATORY FIRST STEP)

Before generating ANY phrases, read what LEGO pairs you have available:

**For current LEGO at position N:**

1. **Read lego_pairs.json** - get ALL LEGO pairs from positions 1 to (N-1)
2. **Total available**: Complete LEGO pairs (target/known chunks) from LEGOs 1 to (N-1)
3. **Recency window**: Last 20 LEGO pairs (positions N-20 to N-1)
4. **Foundational**: Everything before that (positions 1 to N-21)

**Example for S0030L01 (position 123):**
```
Total available: LEGO pairs from positions 1-122
Recency window: LEGO pairs 103-122 (last 20)
Foundational: LEGO pairs 1-102

Available chunks include:
- "Quería" / "I wanted" (S0020L01)
- "preguntarte" / "to ask you" (S0045L02)
- "algo" / "something" (S0012L03)
- "importante" / "important" (S0035L01)
etc.
```

**Critical**: You can ONLY use these complete LEGO pairs as chunks. Don't break them into component words (unless those words are also separate LEGOs).

### STEP 1: Determine Target Phrase Length

Use [PHRASE_LENGTH.md](../rules/PHRASE_LENGTH.md):

- 100+ LEGOs available → **7-10 words**
- 51-100 LEGOs → 6-8 words
- 21-50 LEGOs → 5-6 words
- 6-20 LEGOs → 3-4 words
- 0-5 LEGOs → 0-2 words

### STEP 2: Assemble Phrases from Available LEGO Pairs

**Composition target:**
- 30-50% from recency window (last 20 LEGO pairs)
- 50-70% from foundational (earlier LEGO pairs)

**Generate 3-5 natural phrases by ASSEMBLING from complete LEGO pairs:**

```
For LEGO "ayer" (yesterday) at position 126:

Available LEGO pairs: positions 1-125
Recency pairs: positions 106-125
Target length: 7-10 words (counting individual words in the assembled phrase)

Candidate 1: "Quería preguntarte algo importante sobre tu trabajo ayer"
             └─ Assembled from LEGO pairs:
                "Quería" (S0020L01)
                "preguntarte" (S0045L02)
                "algo" (S0012L03)
                "importante" (S0035L01)
                "sobre" (S0015L04)
                "tu" (S0003L01)
                "trabajo" (S0108L02 - recent)
                "ayer" (S0126L01 - current)
             └─ 8 words total ✓
             └─ Uses complete LEGO pairs as chunks ✓

Candidate 2: "Estaba pensando en hablar contigo sobre esto ayer"
             └─ Assembled from complete LEGO pairs
             └─ 8 words total ✓
```

**Critical**: Each phrase must assemble ONLY from complete LEGO pairs. Don't invent words or break LEGO pairs apart.

### STEP 3: Validate Each Phrase

For each candidate phrase:

✓ **GATE check**: Did I use only complete LEGO pairs from positions 1 to (N-1)? YES → valid
✓ **Chunk integrity**: Did I use ENTIRE LEGO pairs, not component words? YES → valid
✓ **Grammar**: Perfect in both languages? YES → valid
✓ **Natural**: Something people actually say? YES → valid
✓ **Operative**: Contains the current LEGO being taught? YES → valid
✓ **Length**: Matches target for available vocabulary? YES → valid

**If you used LEGO pairs from current/future positions → REJECT immediately**
**If you broke a LEGO pair into component words → REJECT immediately**

### STEP 4: Select Best 3-5 Phrases

Choose phrases that:
- Pass all validation checks
- Provide variety (different contexts)
- Use good mix of recency + foundational vocabulary

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
