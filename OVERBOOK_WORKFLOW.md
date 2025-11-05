# Over-Booking Strategy for LEGO Baskets

## The Strategy

Instead of carefully crafting exactly 10 perfect phrases, **generate 13-15 high-quality phrases** knowing that some will be discarded due to:
- GATE violations (using vocabulary not yet taught)
- Grammatical awkwardness
- Poor pattern variety

This is faster and more natural than being overly cautious.

## Workflow

### 1. Hand-Craft 13-15 High-Quality Phrases

For each LEGO, write 13-15 natural, sophisticated phrases. Don't worry too much about GATE compliance - write what feels natural and grammatically correct.

**Example for S0010L05 (the whole sentence):**

```json
{
  "practice_phrases": [
    ["the whole sentence", "toda la oración", null, 2],
    ["I want to remember the whole sentence", "Quiero recordar toda la oración", "P01", 4],
    ["I'm trying to remember the whole sentence", "Estoy intentando recordar toda la oración", "P02", 4],
    ["I'm going to remember the whole sentence", "Voy a recordar toda la oración", "P03", 4],
    ["I can remember the whole sentence", "Puedo recordar toda la oración", "P18", 4],
    ["I'm not sure if I can remember the whole sentence", "No estoy seguro si puedo recordar toda la oración", "P06", 7],
    ["how to remember the whole sentence", "cómo recordar toda la oración", "P12", 3],
    ["I can't remember the whole sentence now", "No puedo recordar toda la oración ahora", "P18", 4],
    ["I speak the whole sentence", "Hablo toda la oración", "P05", 3],
    ["I want to explain the whole sentence", "Quiero explicar toda la oración", "P01", 4],

    // Extra phrases that might get filtered:
    ["I need to understand the whole sentence", "Necesito entender toda la oración", "P01", 4],
    // ^ GATE violation: 'necesito' and 'entender' not taught until S0025

    ["I should write the whole sentence", "Debería escribir toda la oración", null, 3],
    // ^ GATE violation: 'debería' (conditional) not taught yet

    ["You know the whole sentence", "Sabes toda la oración", "P05", 3],
    // ^ GATE violation: 'saber' not taught until S0012

    ["the whole sentence is difficult", "toda la oración es difícil", null, 3],
    // ^ GATE violation: 'difícil' not taught yet

    ["I'm trying learning the whole sentence", "Estoy intentando aprendiendo toda la oración", "P02", 4]
    // ^ Grammatically awkward: double gerund
  ]
}
```

### 2. Run Validation

```bash
node validate_basket_phrases.cjs public/baskets/lego_baskets_s0010.json S0010L05
```

The validator will flag:
- ❌ **GATE violations** - words not yet taught
- ⚠️  **Grammar issues** - awkward constructions
- ✓ **Valid phrases** - ready to use

### 3. Review and Select

From the validation output:
- **Passed: 10** phrases are perfect
- **Failed: 5** phrases have issues

You now have exactly 10 high-quality, GATE-compliant phrases for your basket!

### 4. (Optional) Adjust and Revalidate

If you end up with too few valid phrases, add a few more and rerun validation.

## Benefits of This Approach

1. **Faster** - Write naturally without constant GATE checking
2. **Higher quality** - Focus on natural phrasing, filter mechanically
3. **Safety net** - Over-booking means you won't end up with too few phrases
4. **Better variety** - Generate more options, pick the best pattern distribution

## Example Session

Let's say you're working on **S0015L03** (with me / conmigo):

1. **Generate 15 phrases** (5 minutes):
   - Mix of all available patterns (P01-P18)
   - Natural, conversational Spanish
   - Some might use "saber", "necesitar", etc. (not sure if taught yet)

2. **Run validator** (5 seconds):
   ```bash
   node validate_basket_phrases.cjs public/baskets/lego_baskets_s0015.json S0015L03
   ```

3. **Review results**:
   - 12 phrases passed ✓
   - 3 phrases failed (GATE violations: "necesitar", "poder", "saber")

4. **Done!** Keep the 12 passing phrases (or select best 10)

## Tools Provided

- **`validate_basket_phrases.cjs`** - Validates phrases for GATE compliance and grammar
- **`example_overbook_s0010l05.json`** - Example showing 15 phrases → filter → 10

## Next Steps

To apply this strategy to S0001-S0020:

1. For each LEGO, add 3-5 more high-quality phrases to existing baskets
2. Run validation to check for GATE violations
3. Keep the best 10-12 phrases with maximum pattern variety
4. Commit the enhanced baskets

This way, especially for longer seeds (S0010+), you have more phrase options and can be confident that any GATE violations will be caught automatically.
