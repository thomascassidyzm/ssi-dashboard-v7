# Phase 5: Improved Basket Generation Prompt

**Use this prompt for high-quality basket generation with appropriate phrase lengths**

---

## Agent Prompt Template

```
You are generating practice phrase baskets for Spanish course LEGOs.

**Your task:** Generate baskets for [LEGO_COUNT] LEGOs: [LEGO_LIST]

## CRITICAL: OUTPUT PROTOCOL

Write to file: [OUTPUT_PATH]
Return ONLY: "✅ Generated [N] baskets. Quality: [assessment]"

## DATA SOURCE

Read: [LEGO_PAIRS_PATH]

## GENERATION PHILOSOPHY

**Make phrases AS RICH as available vocabulary allows.**

Don't be conservative. If you have 20 LEGOs available, use 6-8 of them per phrase to create complex, natural sentences. The learner needs practice combining multiple LEGOs.

## THE ABSOLUTE CONSTRAINT: GATE

LEGO #N uses ONLY vocabulary from LEGOs #1 to #(N-1). Never use future vocabulary.

## WORKFLOW FOR EACH LEGO

### Step 1: Assess Available Vocabulary

Count how many prior LEGOs you have. This determines your phrase richness potential:

- **0-5 LEGOs:** Very limited. 0-2 word phrases expected.
- **6-20 LEGOs:** Getting interesting. **Aim for 5-7 word phrases** using multiple LEGOs.
- **21-50 LEGOs:** Rich vocabulary. **Aim for 7-9 word phrases**.
- **51-100 LEGOs:** Very rich. **Aim for 8-10 word phrases**.
- **100+ LEGOs:** Extremely rich. **Aim for 9-12 word phrases**.

### Step 2: Generate E-Phrases (3-5 natural sentences)

**Key principle:** Use as many LEGOs as naturally fits.

**Good example for S0006L01 (19 LEGOs available):**
```json
"e": [
  ["Estoy intentando hablar español con alguien más ahora", "I'm trying to speak Spanish with someone else now"],  // 8 words - uses 6 LEGOs
  ["Estoy intentando aprender cómo hablar lo más frecuentemente posible", "I'm trying to learn how to speak as often as possible"],  // 10 words - uses 5 LEGOs
  ["Voy a practicar, porque Estoy intentando hablar", "I'm going to practise because I'm trying to speak"]  // 8 words - uses 4 LEGOs
]
```

**Bad example (too conservative):**
```json
"e": [
  ["Estoy intentando hablar", "I'm trying to speak"],  // Only 3 words - wasted opportunity!
  ["Estoy intentando aprender", "I'm trying to learn"]  // Only 3 words - too short!
]
```

**Requirements:**
- Perfect grammar in BOTH languages
- Natural phrases people actually say
- Include the operative LEGO
- Use recent vocabulary (30-50% from last 10 seeds for LEGOs #50+)
- **For culminating LEGOs:** First e-phrase = complete seed sentence

### Step 3: Extract D-Phrases (Mechanical)

Extract ALL 2-5 LEGO windows containing the operative LEGO using sliding window extraction.

## QUALITY CHECKLIST

Before accepting each basket:

1. ✓ **GATE:** All LEGOs from prior positions?
2. ✓ **Grammar:** Perfect in both Spanish and English?
3. ✓ **Natural:** Real conversational phrases?
4. ✓ **Richness:** Using available vocabulary fully? (Not too short?)
5. ✓ **Operative:** Contains the LEGO being taught?
6. ✓ **Culminating:** If last in seed, first phrase = seed sentence?

## OUTPUT FORMAT

```json
{
  "S0001L01": {
    "lego": ["target", "known"],
    "e": [
      ["natural longer phrase in Spanish", "natural longer phrase in English"],
      ["another natural phrase", "another natural phrase"],
      ["third natural phrase", "third natural phrase"]
    ],
    "d": {
      "2": [["2-word fragment", "translation"], ...],
      "3": [["3-word fragment", "translation"], ...],
      "4": [["4-word fragment", "translation"], ...],
      "5": [["5-word fragment", "translation"], ...]
    }
  }
}
```

## EXAMPLES OF PHRASE RICHNESS

**Early LEGO (S0001L05 "ahora", 4 LEGOs available):**
```json
"e": [
  ["Quiero hablar español contigo ahora", "I want to speak Spanish with you now"],  // 6 words - uses ALL 4 prior LEGOs!
  ["Quiero hablar ahora", "I want to speak now"]  // 4 words
]
```

**Mid LEGO (S0020L04 "rápidamente", ~80 LEGOs available):**
```json
"e": [
  ["Quieres aprender su nombre rápidamente antes de que todos los demás vuelvan", "You want to learn his name quickly before everyone else comes back"],  // 12 words
  ["Ella quiere descubrir la respuesta rápidamente esta noche", "She wants to find out the answer quickly this evening"],  // 9 words
  ["No quiero parar de hablar español rápidamente", "I don't want to stop speaking Spanish quickly"]  // 8 words
]
```

**Late LEGO (S0030L04 "ayer", 126 LEGOs available - CULMINATING):**
```json
"e": [
  ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],  // SEED SENTENCE FIRST
  ["No estaba pensando en cómo responder cuando me vio ayer", "I wasn't thinking about how to answer when she saw me yesterday"],  // 11 words
  ["Quería comenzar a practicar hablar español lo más rápidamente posible ayer", "I wanted to start to practise speaking Spanish as quickly as possible yesterday"]  // 12 words
]
```

## KEY PRINCIPLE

**Don't leave vocabulary on the table.** If you have rich vocabulary available, create rich practice phrases.

---

Begin generation now.
```
