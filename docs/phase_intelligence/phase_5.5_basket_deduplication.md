# Phase 5.5: LEGO Basket Deduplication

**Version**: 2.0 🔒 (Updated 2025-10-28)
**Status**: Locked
**Input**: `lego_pairs.json`, `lego_baskets.json`
**Output**: `lego_pairs_deduplicated.json`, `lego_baskets_deduplicated.json`

---

## Purpose

Remove duplicate LEGO pairs where both target and known text are character-identical (case-insensitive, trimmed). First occurrence wins. Remove baskets for deduplicated LEGOs.

## Deduplication Logic

### Identity Rules

1. **Character-level comparison** after normalization:
   - Trim leading/trailing whitespace
   - Case-insensitive (lowercase both)
   - **Preserve punctuation** (semantic difference)

2. **Deduplication key:** `target.trim().toLowerCase() ||| known.trim().toLowerCase()`

3. **First occurrence wins:**
   - Keep first LEGO with this key
   - Discard all subsequent LEGOs with same key
   - Remove baskets for discarded LEGOs

### Examples

**Identical (deduplicate):**
- "Hablo" + "I speak" = "hablo" + "I SPEAK" ✅
- "quiero que hables" + "I want you to speak" = "Quiero Que Hables" + "I Want You To Speak" ✅

**Different (keep both):**
- "quieres" + "you want" ≠ "¿quieres?" + "do you want?" ❌ (punctuation = semantic)
- "habló" + "he spoke" ≠ "hablo" + "I speak" ❌ (accents preserved)

## Implementation

```javascript
function createDedupeKey(target, known) {
  return `${target.trim().toLowerCase()}|||${known.trim().toLowerCase()}`;
}

// Track first occurrence of each unique LEGO
const seen = new Map(); // dedupeKey -> first legoId
const keptLegoIds = new Set();

for (const seed of seeds) {
  const [seedId, pair, legos] = seed;
  const deduplicatedLegos = [];

  for (const lego of legos) {
    const [legoId, type, target, known] = lego;
    const dedupeKey = createDedupeKey(target, known);

    if (!seen.has(dedupeKey)) {
      // First occurrence - keep it
      seen.set(dedupeKey, legoId);
      keptLegoIds.add(legoId);
      deduplicatedLegos.push(lego);
    }
    // else: duplicate - discard
  }

  if (deduplicatedLegos.length > 0) {
    deduplicatedSeeds.push([seedId, pair, deduplicatedLegos]);
  }
}

// Filter baskets: only keep baskets for kept LEGOs
const deduplicatedBaskets = {};
for (const [legoId, basket] of Object.entries(basketsData)) {
  if (keptLegoIds.has(legoId)) {
    deduplicatedBaskets[legoId] = basket;
  }
}
```

## Expected Deduplication Rate

**~20-30%** of LEGOs are duplicates across seeds.

Common duplicates:
- High-frequency words: "quiero" (I want), "hablar" (to speak), "español" (Spanish)
- Question words: "cómo" (how), "qué" (what), "cuándo" (when)
- Pronouns: "yo" (I), "tú" (you), "él" (he)

---

## Output Format

**lego_pairs_deduplicated.json:**
- Array of seeds (same structure as input)
- Only first occurrence of each unique LEGO
- Seeds with no LEGOs after deduplication are removed

**lego_baskets_deduplicated.json:**
- Object keyed by lego_id (same structure as input)
- Only baskets for LEGOs that were kept

---

## Test Results: spa_for_eng_20seeds

**Input:**
- 20 seeds
- 89 total LEGOs
- 64 baskets

**Output:**
- 20 seeds (no seeds removed)
- 64 unique LEGOs (25 duplicates removed, 28.1%)
- 64 baskets kept (0 removed - duplicates had no baskets)

**Sample duplicates removed:**
- S0001L02 (hablar, to speak) - appeared 5 times, kept first occurrence
- S0001L03 (español, Spanish) - appeared 6 times, kept first occurrence
- S0001L01 (Quiero, I want) - appeared 4 times, kept first occurrence

---

## Usage

```bash
node scripts/phase5.5-deduplicate-baskets.cjs <course_code>

# Example
node scripts/phase5.5-deduplicate-baskets.cjs spa_for_eng_20seeds
```

---

## Notes

1. **Why 0 baskets removed?**
   - Only first occurrence of each LEGO gets a basket (from Phase 5)
   - Duplicates are references to earlier LEGOs
   - Therefore, duplicates have no baskets to remove

2. **Seed removal:**
   - Seeds with all LEGOs deduplicated are removed entirely
   - This is rare (usually only for test/demo seeds)

3. **LEGO ID preservation:**
   - Original LEGO IDs are preserved (S0001L02, etc.)
   - Makes tracing back to original seeds easier

---

## Version History

- **v2.0** 🔒 (2025-10-28): **LOCKED** - Simplified to character-identical deduplication
  - Character-identical deduplication (trim + lowercase)
  - Punctuation preserved (semantic difference)
  - First occurrence wins
  - Script implemented: `scripts/phase5.5-deduplicate-baskets.cjs`
  - Tested on spa_for_eng_20seeds: 28.1% deduplication rate

- **v1.0** (2025-10-23): Initial version (feeder-based deduplication)
  - Focused on removing feeder duplicates
  - More complex logic based on LEGO types
