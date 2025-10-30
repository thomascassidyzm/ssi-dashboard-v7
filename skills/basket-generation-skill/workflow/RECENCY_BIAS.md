# Recency Bias (Optional Quality Enhancement)

**For LEGOs #50+**: Use 30-50% vocabulary from recent seeds, 50-70% from foundational seeds.

## What is recency bias?

When generating e-phrases, prioritize vocabulary from recent seeds (~last 10 seeds) alongside foundational vocabulary.

## Why recency bias?

### Benefits:
1. **Topic coherence** - Recent seeds often share thematic vocabulary
2. **Fresh practice** - Learners practice recently-learned vocabulary
3. **Prevents early-LEGO dominance** - Without bias, LEGOs #1-10 appear in every basket

### Example:

**Seed 100**: About restaurants
**Seeds 90-99**: About food, ordering, dining

**Without recency bias**:
```
E-phrase: "Quiero hablar español contigo ahora."
(Uses LEGOs #1-5 only - no connection to food/dining)
```

**With recency bias**:
```
E-phrase: "Quiero pedir algo de la carta en el restaurante."
(Uses recent: "pedir", "la carta", "restaurante" + foundational: "Quiero", "algo")
```

Result: Learner practices food vocabulary while also spacing repetition of foundational LEGOs.

## When to apply recency bias

**Apply for LEGOs #50+** (when sufficient vocabulary exists)
**Skip for LEGOs #1-49** (limited vocabulary pool)

## Target distribution

For LEGO #200 (position 200):
- Available LEGOs: #1-199
- Recent window: Seeds 190-199 (~40 LEGOs)
- Foundational pool: Seeds 1-189 (~760 LEGOs)

**Target**:
- 30-50% from recent (seeds 190-199)
- 50-70% from foundational (seeds 1-189)

## How to calculate

### Step 1: Identify recent window

```javascript
const seedNumber = parseInt(legoId.match(/S(\d+)/)[1]);  // e.g., S0200 → 200
const recentStart = Math.max(1, seedNumber - 10);  // Seeds 190-199
const recentEnd = seedNumber - 1;
```

### Step 2: Generate e-phrases with bias

For each e-phrase:
- Choose 30-50% of LEGOs from recent window
- Choose remaining from foundational pool

**Example** (8-word phrase for LEGO #200):

```
Recent vocabulary (30-50%): ~3 LEGOs from seeds 190-199
Foundational (50-70%): ~5 LEGOs from seeds 1-189

Phrase: "Quiero pedir un café con leche en el restaurante ahora"
         [1]   [195] [8] [196] [7] [197]  [12] [2] [198]    [5]

Recent LEGOs (195, 196, 197, 198): 4/10 = 40% ✓
Foundational LEGOs (1, 2, 5, 7, 8, 12): 6/10 = 60% ✓
```

### Step 3: Don't stress exact percentages

**Acceptable range**: 25-55% recent

The goal is **bias toward recency**, not exact percentages.

## Examples

### LEGO #150: "biblioteca" (library)

**Recent window**: Seeds 140-149
**Available**: LEGOs #1-149

**E-phrases**:

1. "Quería preguntarte algo importante sobre el libro de la biblioteca"
   - Recent: "el libro", "biblioteca" (40%)
   - Foundational: "Quería", "preguntarte", "algo", "importante", "sobre" (60%)

2. "Voy a estudiar en la biblioteca esta tarde con mis amigos"
   - Recent: "estudiar", "biblioteca", "esta tarde" (33%)
   - Foundational: "Voy a", "en", "con", "mis amigos" (67%)

3. "No podía encontrar el libro que quería en la biblioteca ayer"
   - Recent: "encontrar", "el libro", "biblioteca" (27%)
   - Foundational: "No", "podía", "que", "quería", "en", "ayer" (73%)

**Aggregate**: ~33% recent ✓

### LEGO #50: First use of recency bias

**Recent window**: Seeds 40-49
**Available**: LEGOs #1-49

**E-phrases**:

1. "Quiero intentar hablar español contigo ahora"
   - Recent: "intentar" (14% - okay, limited pool)
   - Foundational: others (86%)

2. "Estoy aprendiendo a hablar mejor cada día"
   - Recent: "aprendiendo", "mejor", "cada día" (43%)
   - Foundational: others (57%)

**Note**: With limited vocabulary, recency bias is less pronounced. This is fine.

## When NOT to use recency bias

### Early LEGOs (#1-49)
- Limited vocabulary pool
- Recency bias less meaningful
- Focus on making any good phrase

### Grammatical constraints
- If recent vocabulary doesn't fit grammatically
- Prioritize grammar over recency

### Culminating LEGOs
- First e-phrase = seed sentence (fixed)
- Apply recency bias to remaining e-phrases only

## Recency Checklist

For LEGOs #50+:

- ✓ Identified recent window (last 10 seeds)?
- ✓ Generated e-phrases with ~30-50% recent vocabulary?
- ✓ Grammar still perfect?
- ✓ Phrases still natural?
- ✓ GATE constraint still maintained?

If recency breaks grammar or GATE → skip recency, prioritize correctness

## Bottom Line

**Recency bias = quality enhancement, not requirement. Use when possible, skip when it breaks other rules.**
