# Phase 5 Intelligence: LEGO Basket Generation (Conversational)

## Your Mission

Generate **15 high-quality practice phrases** for this LEGO that build conversational confidence.

## CRITICAL REQUIREMENTS (Must Meet!)

### 1. CONVERSATIONAL REALISM (★★★★★)
**Generate at least 7-8 phrases with 5+ LEGOs**

Why? These longer phrases:
- Mimic natural thought processes
- Build confidence in chaining ideas together
- Prepare learners for real conversations

Examples of GOOD conversational phrases:
- "I want to speak Spanish and I'm trying to learn but I'm not sure" (8 LEGOs)
- "I'm going to try because I want to practise but I can remember" (9 LEGOs)
- "I'm not sure if I can explain but I'm trying to learn Spanish" (9 LEGOs)

### 2. CONJUNCTION GOLD (★★★★★)
**Use conjunctions in 40%+ of phrases** (aim for 6+ out of 15)

**CRITICAL: NEVER MIX LANGUAGES!**
- KNOWN (English) must use ONLY English: "if", "and", "but", "because"
- TARGET (Spanish) must use ONLY Spanish: "si", "y", "pero", "porque"

GOLD conjunctions - use liberally in TARGET language:

| Spanish | English | Usage Example |
|---------|---------|---------------|
| **pero** | but | English: "I want to speak but I'm not sure"<br>Spanish: "Quiero hablar pero no estoy seguro" |
| **y** | and | English: "I'm trying to learn and I want to practise"<br>Spanish: "Estoy intentando aprender y quiero practicar" |
| **porque** | because | English: "I'm practising because I want to learn"<br>Spanish: "Estoy practicando porque quiero aprender" |
| **o** | or | English: "I can speak or I can try"<br>Spanish: "Puedo hablar o puedo intentar" |
| **si** | if | English: "I'm not sure if I can remember"<br>Spanish: "No estoy seguro si puedo recordar" |
| **cuando** | when | English: "I speak when I can"<br>Spanish: "Hablo cuando puedo" |

These are **UNDER-REPRESENTED in seeds** but **CRITICAL for real conversation**!

### 3. GATE COMPLIANCE (★★★★★)
**ONLY use vocabulary from previously taught LEGOs**

Every word in your Spanish phrases MUST appear in one of the previously taught LEGOs.

Exception: Common conjugations of taught verbs are allowed:
- If "quiero" taught → "quiere", "quieres", "queremos" OK
- If "hablo" taught → "habla", "hablas", "hablamos" OK
- If "estoy" taught → "está", "estás", "están" OK

### 4. Pattern Variety
Use ALL available patterns across your phrases.

## Phrase Distribution Target (for 15 phrases)

- **2 phrases**: 1-2 LEGOs (building blocks)
- **5-6 phrases**: 3-4 LEGOs (pattern practice)
- **7-8 phrases**: 5+ LEGOs (conversational, chained thoughts with conjunctions)

## Context Provided

You will receive:
- Current LEGO (the one you're generating for)
- Previously taught LEGOs (for GATE compliance)
- Available patterns (to ensure variety)
- Whether this is the final LEGO in seed (must include full seed sentence)

## Output Format

Return ONLY a JSON array of 15 phrases in this exact format:

```json
[
  ["known phrase", "target phrase", "pattern_code_or_null", lego_count],
  ["I want to speak", "Quiero hablar", "P01", 2],
  ["I want to speak and I'm trying to learn", "Quiero hablar y estoy intentando aprender", "P01", 4],
  ["I want to speak Spanish but I'm trying to learn because I'm not sure", "Quiero hablar español pero estoy intentando aprender porque no estoy seguro", "P01", 9]
]
```

Each phrase is: `[English, Spanish, Pattern (or null), Number of LEGOs used]`

## Quality Checklist Before Submitting

- [ ] At least 7-8 phrases have 5+ LEGOs
- [ ] At least 6 phrases use conjunctions (pero, y, porque, si, cuando)
- [ ] All Spanish words appear in taught LEGOs list (GATE compliant)
- [ ] Natural, conversational phrasing (how people actually think/speak)
- [ ] All available patterns represented
- [ ] If final LEGO: Full seed sentence included as one phrase

## Common Mistakes to Avoid

❌ Too many short phrases: "I want" (2 LEGOs), "to speak" (1 LEGO)
✅ Chain thoughts: "I want to speak and I'm trying to learn" (4 LEGOs)

❌ No conjunctions: Missing pero, y, porque
✅ Natural flow:
  - English: "I want to speak but I'm not sure because I'm learning"
  - Spanish: "Quiero hablar pero no estoy seguro porque estoy aprendiendo"

❌ GATE violations: Using words not yet taught
✅ Only use vocabulary from the taught LEGOs list provided

❌ Pattern repetition: Using P01 for all phrases
✅ Variety: P01, P02, P03, P05, P06, P12, null

## Why This Matters

Current baskets score ~20/100 on conversational metrics. Your job is to:
- Generate phrases that score 100/100 on conversational requirements
- Make learners comfortable chaining multiple thoughts together
- Use conjunctions liberally to mimic natural speech
- Maintain strict GATE compliance so learners only use taught vocabulary

**Think like a real conversation, not a grammar drill!**
