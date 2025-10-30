# GATE Constraint (Absolute Rule)

**LEGO #N can ONLY use LEGO pairs from LEGOs #1 to #(N-1)**

This is the **absolute, non-negotiable constraint** in basket generation.

## What is GATE?

GATE (Guaranteed Available Tokens Enforced) ensures learners only see vocabulary they've already learned. If LEGO #N appears in lesson 100, the basket can only use LEGO pairs from lessons 1-99.

## Critical: Use ENTIRE LEGO Pairs

Available vocabulary = **complete LEGO pairs** (target/known chunks), NOT individual words.

**Example:**
- LEGO S0002L01: "Estoy intentando" / "I'm trying"
- You use the ENTIRE chunk "Estoy intentando", not "Estoy" or "intentando" separately
- Unless "Estoy" is also its own LEGO, you cannot use it alone

## Why is this absolute?

Breaking GATE means:
- Learner sees unknown vocabulary
- Pedagogical sequence breaks
- Spaced repetition fails
- Course becomes unusable

## How to find available LEGO pairs

To generate a basket for LEGO `S0030L04`:

1. Read `lego_pairs.json` to get all LEGO pairs
2. Find position of `S0030L04` (e.g., position 126)
3. Available LEGO pairs = complete chunks from LEGOs at positions 1-125
4. **NEVER use LEGO pairs from positions 127+**
5. **NEVER break a LEGO pair into component words** (unless those words are also separate LEGOs)

## Examples

### ✅ CORRECT (GATE compliant)

**LEGO #126**: `"ayer"` (yesterday)
**Available**: LEGO pairs from LEGOs #1-125
**E-phrase**: `"Quería preguntarte algo ayer."` (I wanted to ask you something yesterday.)

This phrase assembles from complete LEGO pairs:
- "Quería" (LEGO #20)
- "preguntarte" (LEGO #45)
- "algo" (LEGO #12)
- "ayer" (LEGO #126)

All LEGO pairs used as complete chunks ✓

### ❌ WRONG (GATE violation)

**LEGO #126**: `"ayer"` (yesterday)
**Available**: LEGOs #1-125
**E-phrase**: `"Quería hablar contigo en la biblioteca ayer."` (I wanted to speak with you in the library yesterday.)

Problem: `"biblioteca"` (library) is LEGO #150 → future vocabulary ✗

## What if I can't make a good phrase?

If you can't make a natural phrase within the GATE constraint:

1. **Make a shorter phrase** (it's okay!)
2. **Leave the basket empty** (this is fine for early LEGOs)
3. **NEVER break GATE to make a "better" phrase**

## Special Cases

### Early LEGOs (#1-10)
- Very limited vocabulary available
- Empty or 2-word baskets are EXPECTED and CORRECT
- Don't force phrases

### LEGO #1
- **Available vocabulary: ZERO**
- **Correct basket**: Empty `{}`
- This is pedagogically sound

### LEGOs #50+
- Rich vocabulary available (200+ words)
- Should make 7-10 word phrases
- No excuse for short phrases unless there's a real constraint

## Checking GATE Compliance

**CRITICAL: You must validate GATE using greedy tiling search.**

See [TILING_VALIDATION.md](TILING_VALIDATION.md) for complete algorithm.

### Quick validation process:

**Step 1: Greedy tile the phrase**
```javascript
// Use longest-match-first to handle COMPOSITE LEGOs
Phrase: "Quiero hablar contigo esta tarde"
Tiles: ["Quiero", "hablar", "contigo", "esta tarde"]  // greedy finds COMPOSITE
                                       ↑ 2-word LEGO, not "esta" + "tarde"
```

**Step 2: Find LEGO_ID for each tile**
```javascript
// Search lego_pairs.json
"Quiero" → S0001L01
"hablar" → S0001L02
"contigo" → S0001L04
"esta tarde" → S0018L04  // COMPOSITE LEGO
```

**Step 3: Verify all positions < current**
```javascript
Current LEGO: S0030L01 (position 123)
Tile positions: [1, 2, 4, 18]
All < 123? YES → GATE COMPLIANT ✓
```

**If tiling fails or any position ≥ current → REJECT PHRASE**

### Why greedy search matters

Without greedy search, you might incorrectly split COMPOSITE LEGOs:

❌ **WRONG** (no greedy search):
```
"esta tarde" → ["esta", "tarde"] (2 LEGOs)
                ↑ Might use wrong positions
```

✅ **CORRECT** (greedy search):
```
"esta tarde" → ["esta tarde"] (1 COMPOSITE LEGO)
                ↑ Finds longest match first
```

**Always use greedy search. Read [TILING_VALIDATION.md](TILING_VALIDATION.md) for examples.**

## Bottom Line

**GATE is not a guideline. It's physics. If you break it, the course breaks.**
