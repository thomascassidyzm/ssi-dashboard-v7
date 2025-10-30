# Tiling Validation (Greedy Search)

**Every e-phrase must tile perfectly from available LEGOs using greedy search.**

## What is Tiling?

Tiling = decomposing a phrase into the exact LEGOs that were used to construct it.

**Perfect tiling**:
- Every word in the phrase corresponds to a LEGO
- No words left over
- No extra words
- Uses greedy search (longest match first)

## Why Greedy Search?

LEGOs come in two types:
- **BASE**: Single atomic chunks (e.g., `"hablar"` = to speak)
- **COMPOSITE**: Multi-word chunks (e.g., `"esta tarde"` = this afternoon)

A COMPOSITE might contain words that are ALSO individual BASE LEGOs:
- `"esta"` (this) - BASE LEGO
- `"tarde"` (afternoon) - BASE LEGO
- `"esta tarde"` (this afternoon) - COMPOSITE LEGO

**Without greedy search:**
```
Phrase: "Quiero hablar contigo esta tarde"
Wrong tiling: [Quiero] [hablar] [contigo] [esta] [tarde]
               ↑ Uses "esta" + "tarde" as 2 LEGOs
```

**With greedy search:**
```
Phrase: "Quiero hablar contigo esta tarde"
Correct tiling: [Quiero] [hablar] [contigo] [esta tarde]
                 ↑ Uses "esta tarde" as 1 COMPOSITE LEGO
```

## Greedy Search Algorithm

```javascript
function tilePhrase(phrase, availableLegos) {
  const words = phrase.split(' ');
  const tiles = [];
  let position = 0;

  while (position < words.length) {
    let matched = false;

    // Try longest possible match first (greedy)
    for (let length = words.length - position; length >= 1; length--) {
      const candidate = words.slice(position, position + length).join(' ');

      // Check if this candidate exists in available LEGOs
      if (availableLegos.includes(candidate)) {
        tiles.push(candidate);
        position += length;
        matched = true;
        break;  // Found longest match, move on
      }
    }

    if (!matched) {
      throw new Error(`Cannot tile: "${words[position]}" not found in available LEGOs`);
    }
  }

  return tiles;
}
```

## Step-by-Step Example

### Phrase to validate:
```
"Quiero hablar contigo esta tarde"
(I want to speak with you this afternoon)
```

### Available LEGOs (positions 1-125):
```
S0001L01: "Quiero" (I want)
S0001L02: "hablar" (to speak)
S0001L04: "contigo" (with you)
S0012L03: "esta" (this)
S0015L06: "tarde" (afternoon)
S0018L04: "esta tarde" (this afternoon)  ← COMPOSITE
...125 total LEGOs
```

### Greedy tiling process:

**Position 0**: `"Quiero..."`
- Try 5-word match: `"Quiero hablar contigo esta tarde"` → not found
- Try 4-word match: `"Quiero hablar contigo esta"` → not found
- Try 3-word match: `"Quiero hablar contigo"` → not found
- Try 2-word match: `"Quiero hablar"` → not found
- Try 1-word match: `"Quiero"` → **FOUND** (S0001L01) ✓

**Position 1**: `"hablar..."`
- Try 4-word match: `"hablar contigo esta tarde"` → not found
- Try 3-word match: `"hablar contigo esta"` → not found
- Try 2-word match: `"hablar contigo"` → not found
- Try 1-word match: `"hablar"` → **FOUND** (S0001L02) ✓

**Position 2**: `"contigo..."`
- Try 3-word match: `"contigo esta tarde"` → not found
- Try 2-word match: `"contigo esta"` → not found
- Try 1-word match: `"contigo"` → **FOUND** (S0001L04) ✓

**Position 3**: `"esta tarde"`
- Try 2-word match: `"esta tarde"` → **FOUND** (S0018L04) ✓ ← COMPOSITE
- ⚠️ Don't try 1-word `"esta"` because we already found the longer match!

**Result**:
```
Tiles: ["Quiero", "hablar", "contigo", "esta tarde"]
LEGO IDs: [S0001L01, S0001L02, S0001L04, S0018L04]
All positions ≤ 125 → GATE COMPLIANT ✓
```

## Common Mistakes

### ❌ WRONG: Not using greedy search

```
Phrase: "Quiero hablar contigo esta tarde"

Non-greedy tiling:
[Quiero] [hablar] [contigo] [esta] [tarde]
         ↑ Split "esta tarde" into 2 LEGOs

Problem: Might incorrectly think "tarde" is position 15 (BASE)
         When actually using "esta tarde" at position 18 (COMPOSITE)
```

### ✅ CORRECT: Greedy search

```
Phrase: "Quiero hablar contigo esta tarde"

Greedy tiling:
[Quiero] [hablar] [contigo] [esta tarde]
         ↑ Use longest match "esta tarde" as 1 LEGO

Result: Correctly identifies COMPOSITE LEGO at position 18
```

## GATE Validation with Tiling

**To validate GATE compliance:**

1. **Tile the phrase** using greedy search
2. **For each tile**, find its LEGO_ID in lego_pairs.json
3. **Get position** of each LEGO_ID in the sequence
4. **Verify** all positions < current LEGO position

### Example: Validating S0030L01 basket

**Current LEGO**: S0030L01 at position 123

**Candidate phrase**: `"Quiero hablar contigo esta tarde"`

**Step 1: Greedy tile**
```
Tiles: ["Quiero", "hablar", "contigo", "esta tarde"]
```

**Step 2: Find LEGO IDs**
```javascript
// Search lego_pairs.json for each tile
"Quiero" → S0001L01
"hablar" → S0001L02
"contigo" → S0001L04
"esta tarde" → S0018L04
```

**Step 3: Get positions**
```
S0001L01 → position 1
S0001L02 → position 2
S0001L04 → position 4
S0018L04 → position 18
```

**Step 4: Validate**
```
All positions (1, 2, 4, 18) < 123 → GATE COMPLIANT ✓
```

## What if tiling fails?

### Scenario: Unknown word

**Phrase**: `"Quiero hablar biblioteca"`
**Available**: LEGOs 1-125 (biblioteca is LEGO #624)

**Greedy tiling**:
```
Position 0: "Quiero" → FOUND (S0001L01)
Position 1: "hablar" → FOUND (S0001L02)
Position 2: "biblioteca" → NOT FOUND
         ↓
TILING FAILS → GATE VIOLATION → REJECT PHRASE
```

### Scenario: Word exists in multiple LEGOs

**Phrase**: `"de la tarde"`

**Available LEGOs**:
- S0008L02: `"de"` (of/from)
- S0012L05: `"la"` (the)
- S0015L06: `"tarde"` (afternoon)
- S0018L04: `"de la tarde"` (this evening) ← COMPOSITE

**Greedy tiling**:
```
Position 0: Try "de la tarde" → FOUND (S0018L04) ✓

Result: [de la tarde] - 1 LEGO
```

**Non-greedy would give**:
```
[de] [la] [tarde] - 3 LEGOs (WRONG)
```

## Tiling Checklist

Before accepting an e-phrase:

1. ✓ Attempt greedy tiling (longest match first)
2. ✓ Every word successfully tiled?
3. ✓ All tiles have LEGO_IDs?
4. ✓ All LEGO_ID positions < current position?
5. ✓ No words left over?
6. ✓ No extra words?

If ALL yes → GATE COMPLIANT
If ANY no → REJECT PHRASE

## Bottom Line

**Always use greedy search. COMPOSITE LEGOs must be matched before their component BASE LEGOs. This is how you verify GATE compliance.**
