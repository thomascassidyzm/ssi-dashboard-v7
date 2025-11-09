# Phase 5 Agent Task: Generate Baskets for LEGOs

## Your Mission

Generate 10 practice phrase baskets for each LEGO assigned to you.

**Input**: `phase5_baskets_s0101_s0200/batch_input/agent_XX_legos.json` (~14 LEGOs)
**Reference**: `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json` (551 cumulative LEGOs)
**Skill**: `skills/basket-generation-skill/SKILL.md`
**Output**: `phase5_baskets_s0101_s0200/batch_output/agent_XX_baskets.json`

---

## Core Principles (GATE Constraint)

**GOLDEN RULE**: You can ONLY use complete LEGO pairs from earlier positions

**Available Vocabulary**:
- For LEGO `S0150L02`: Use any LEGO from S0001L01 through S0150L01
- Available = cumulative_legos field in your batch file

**Example**:
```
S0150L02: "to wait" = "esperar"
Available LEGOs: 450 (all from S0001-S0150 up to L01)

✅ Can use: "quiero" (S0001L01), "hablar" (S0001L02), "más" (S0023L02)
❌ Cannot use: any LEGO from S0150L03 onwards (future vocabulary)
```

---

## Basket Generation Process

### Step 1: Read Your Assignment

```bash
cat phase5_baskets_s0101_s0200/batch_input/agent_XX_legos.json
```

You'll see:
```json
{
  "agent_number": 1,
  "total_legos": 14,
  "legos": [
    {
      "lego_id": "S0101L01",
      "seed_id": "S0101",
      "type": "M",
      "target": "Estoy disfrutando",
      "known": "I'm enjoying",
      "cumulative_legos": 281,
      "components": [["Estoy", "I'm"], ["disfrutando", "enjoying"]]
    },
    ...
  ]
}
```

### Step 2: Load Complete LEGO Registry

```bash
cat phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json
```

Build vocabulary map:
```javascript
const availableLEGOs = {};
for (const seed of legoPairs.seeds) {
  for (const lego of seed.legos) {
    availableLEGOs[lego.id] = {
      target: lego.target,
      known: lego.known,
      type: lego.type
    };
  }
}
```

### Step 3: For Each LEGO, Generate 10 Phrases

**Distribution Requirements** (2-2-2-4):
- 2 really short (1-2 LEGOs)
- 2 quite short (3 LEGOs)
- 2 longer (4-5 LEGOs)
- 4 long (6+ LEGOs)

**Example for S0101L01: "I'm enjoying" = "Estoy disfrutando"**

Available: 281 LEGOs (S0001L01 through S0101L01)

```json
{
  "S0101L01": {
    "lego": ["I'm enjoying", "Estoy disfrutando"],
    "type": "M",
    "available_legos": 280,  // cumulative_legos - 1 (can't use self)
    "available_patterns": ["P01", "P02", "P03", ...],
    "practice_phrases": [
      ["I'm enjoying", "Estoy disfrutando", null, 1],  // Really short
      ["I'm enjoying learning", "Estoy disfrutando aprender", null, 2],  // Really short
      ["I'm enjoying speaking Spanish", "Estoy disfrutando hablar español", "P02", 3],  // Quite short
      ["I'm enjoying learning Spanish now", "Estoy disfrutando aprender español ahora", "P02", 4],  // Quite short
      ["I'm enjoying speaking with you today", "Estoy disfrutando hablar contigo hoy", "P02", 4],  // Longer
      ["I'm enjoying learning how to speak Spanish", "Estoy disfrutando aprender cómo hablar español", "P02", 5],  // Longer
      ["I'm enjoying finding out more about this language", "Estoy disfrutando descubrir más sobre este lenguaje", "P02", 6],  // Long (full seed!)
      ["I want to say that I'm enjoying learning Spanish", "quiero decir que estoy disfrutando aprender español", "P01", 7],  // Long
      ["I'm enjoying speaking with people who speak Spanish", "Estoy disfrutando hablar con personas que hablan español", "P02", 7],  // Long
      ["because I'm enjoying learning how to speak Spanish with you", "porque estoy disfrutando aprender cómo hablar español contigo", "P02", 8]  // Long
    ],
    "phrase_distribution": {
      "really_short_1_2": 2,
      "quite_short_3": 2,
      "longer_4_5": 2,
      "long_6_plus": 4
    },
    "pattern_coverage": "P01, P02",
    "full_seed_included": "YES - phrase 7",
    "gate_compliance": "STRICT - Only S0001-S0101L01 LEGOs available"
  }
}
```

---

## GATE Constraint Checklist

For EVERY phrase, verify:

1. **Available LEGOs Only**
   - Check: Is every LEGO in phrase from available_legos range?
   - Get LEGO ID from registry
   - Compare: LEGO position < current LEGO position

2. **Complete LEGO Pairs**
   - Use BOTH target AND known from registry
   - Don't split LEGOs (e.g., can't use "estoy" from "estoy intentando")

3. **No Future Vocabulary**
   - If current LEGO is S0150L02, cannot use S0150L03+
   - Cannot use ANY LEGO from later seeds

---

## Pattern Coverage

**Use these patterns** (from cumulative_patterns in registry):
- P01: Quiero/quiere/queremos + infinitive
- P02: Estoy/está/están + gerund
- P03: Voy a/vas a/va a + infinitive
- P04: Me gustaría/te gustaría + infinitive
- P05: Simple present tense
- P10: Subjunctive triggers
- P12: Question words
- P18: Puedo/puede/podemos + infinitive

Mark pattern used in phrase array: `[known, target, "P01", lego_count]`

---

## Output Format

```json
{
  "agent_number": 1,
  "total_legos_processed": 14,
  "total_baskets_generated": 14,
  "generated_at": "2025-11-07T...",
  "baskets": {
    "S0101L01": { /* basket as shown above */ },
    "S0101L02": { /* basket */ },
    ...
  }
}
```

---

## Quality Self-Check

Before submitting, verify:

✅ **Distribution**: Every basket has 2-2-2-4 distribution
✅ **GATE**: Every phrase uses only available LEGOs
✅ **Full Seed**: At least one phrase includes the full seed sentence
✅ **Pattern Coverage**: Multiple patterns used across phrases
✅ **Natural Spanish**: All target phrases are grammatically correct
✅ **Progressive Length**: Phrases progress from simple → complex

---

## Common Mistakes to Avoid

❌ **Using future vocabulary**
```
Current: S0150L02
Bad: Uses "después" from S0155L01 ← FUTURE!
```

❌ **Splitting molecular LEGOs**
```
Available: "estoy intentando" (M-type)
Bad: Use only "estoy" ← Must use complete LEGO pair
```

❌ **Wrong distribution**
```
Bad: 5 short, 3 long, 2 medium ← Must be 2-2-2-4
```

❌ **Missing full seed**
```
Bad: No phrase reconstructs the original seed sentence
Good: Include seed as one of the long phrases
```

---

## Time Estimate

- Per LEGO: 2-3 minutes
- Your batch (~14 LEGOs): **30-40 minutes**

Work carefully - quality over speed!

---

## Example: Complete Basket

See existing baskets for reference:
```bash
cat public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0050.json
cat public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0023.json
```

---

## Questions?

If unsure about:
1. **GATE constraint** → Only use LEGOs with position < current
2. **Distribution** → Always 2-2-2-4 (short to long)
3. **Pattern marking** → Check cumulative_patterns in registry
4. **Natural Spanish** → Trust your language model training

Good luck! 🧺
