# Phrase Length Guidelines

**E-phrases should match the available vocabulary richness.**

## The Rule

Phrase length should scale with available vocabulary:

| Available LEGOs | Phrase Length | Example |
|----------------|---------------|---------|
| 0-5 LEGOs | 0-2 words | `"Quiero hablar"` |
| 6-20 LEGOs | 3-4 words | `"Quiero hablar español"` |
| 21-50 LEGOs | 5-6 words | `"Quiero hablar español contigo ahora"` |
| 51-100 LEGOs | 6-8 words | `"Quiero hablar español contigo esta tarde"` |
| 100+ LEGOs | **7-10 words** | `"Quería preguntarte algo importante sobre tu trabajo ayer"` |

## Why does this matter?

**Short phrases with rich vocabulary = wasted opportunity**

If LEGO #126 has 125 LEGOs available (~500 words), making a 3-word phrase like:

```
"Quería hablar español"  (I wanted to speak Spanish)
```

...is pedagogically weak because:
- Learner doesn't practice combining multiple LEGOs
- Doesn't develop fluency with longer constructions
- Misses spaced repetition of foundational vocabulary

**Better with same LEGO #126:**

```
"Quería preguntarte algo importante sobre tu trabajo ayer"
(I wanted to ask you something important about your work yesterday)
```

- 8 words ✓
- Uses multiple LEGOs from different seeds
- Natural, conversational
- Practices complex sentence structure

## How to determine phrase length for a LEGO

**Step 1**: Find available vocabulary count

```javascript
const legoPosition = canonical_order.indexOf(currentLegoId);
const availableCount = legoPosition; // LEGOs #0 to #(position-1)
```

**Step 2**: Target phrase length

```javascript
if (availableCount >= 100) return "7-10 words";
if (availableCount >= 51) return "6-8 words";
if (availableCount >= 21) return "5-6 words";
if (availableCount >= 6) return "3-4 words";
return "0-2 words";
```

**Step 3**: Generate phrases matching that length

## Common Mistake (From Testing)

❌ **WRONG**: LEGO #126 with 3-word phrases

```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [
      ["Quería hablar español.", "I wanted to speak Spanish."],  // 3 words
      ["Quería aprender ahora.", "I wanted to learn now."]       // 3 words
    ]
  }
}
```

Problem: 125 LEGOs available → should make 7-10 word phrases ✗

✅ **CORRECT**: LEGO #126 with 7-10 word phrases

```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [
      ["Quería hablar español contigo esta tarde sobre trabajo.", "I wanted to speak Spanish with you this afternoon about work."],  // 8 words
      ["Quería preguntarte algo importante antes de ir mañana.", "I wanted to ask you something important before going tomorrow."]  // 8 words
    ]
  }
}
```

## Exceptions

### Early LEGOs (< 20 available)

Short phrases are CORRECT and EXPECTED:

```json
{
  "S0002L01": {
    "lego": ["intentando", "trying"],
    "e": [
      ["Estoy intentando aprender.", "I'm trying to learn."]  // 3 words - CORRECT
    ]
  }
}
```

Only 5 LEGOs available → 3-word phrase is appropriate ✓

### Grammatical constraints

If target language grammar prevents longer phrases, shorter is okay:

```
"¿Por qué?" (Why?) - 2 words
```

But this should be rare for LEGOs with 100+ vocabulary available.

## Phrase Length Checklist

Before accepting an e-phrase:

1. Count available LEGOs
2. Determine target length range
3. Count words in proposed phrase
4. **If phrase is significantly shorter than target → reject and regenerate**

## Bottom Line

**With 100+ LEGOs available, 3-word phrases are lazy. Make 7-10 word phrases.**
