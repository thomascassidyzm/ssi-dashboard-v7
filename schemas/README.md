# SSi Course Output Schemas

Canonical data formats for all phase outputs. These schemas ensure consistency across all course generations.

## Design Principles

1. **Compact Arrays**: Use arrays instead of objects to reduce token usage (~70% reduction)
2. **Implicit Schema**: Field order is defined in schema, not repeated in data
3. **Type Codes**: Single letters for types (B=BASE, C=COMPOSITE, F=FEEDER)
4. **Validation**: All outputs must pass JSON Schema validation before acceptance

## Schema Files

- `phase1-translations.json` - Phase 1 output format
- `phase3-legos.json` - Phase 3 output format
- `phase5-baskets.json` - Phase 5 output format

## Token Savings

**Before (verbose):**
```json
{
  "lego_id": "S0001L01",
  "lego_type": "BASE",
  "target_chunk": "Quiero",
  "known_chunk": "I want"
}
```
~50 tokens

**After (compact):**
```json
["S0001L01", "B", "Quiero", "I want"]
```
~12 tokens (76% reduction)

For 668 seeds × 5 LEGOs avg = **~50K tokens saved per course**
