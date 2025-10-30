# Bad Baskets (Common Mistakes)

These examples demonstrate common errors in basket generation.

## Mistake #1: Short Phrases with Rich Vocabulary

**LEGO**: S0030L01 - "Quería" (I wanted)
**Position**: 123
**Available**: 122 LEGOs (~500 words)
**Expected length**: 7-10 words

### ❌ BAD:

```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [
      ["Quería hablar español.", "I wanted to speak Spanish."],  // 3 words
      ["Quería aprender ahora.", "I wanted to learn now."],      // 3 words
      ["Quería intentar hoy.", "I wanted to try today."]         // 3 words
    ]
  }
}
```

**Problems**:
- ✗ Phrase length: 3 words when 7-10 possible
- ✗ Wasted opportunity: 122 LEGOs available, only using 2-3
- ✗ Pedagogically weak: Doesn't practice complex sentences

### ✅ CORRECT:

```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [
      ["Quería preguntarte algo importante sobre tu trabajo ayer.", "I wanted to ask you something important about your work yesterday."],  // 8 words
      ["Quería aprender más sobre hablar español con fluidez.", "I wanted to learn more about speaking Spanish fluently."],  // 8 words
      ["Quería intentar recordar todas las palabras nuevas hoy.", "I wanted to try to remember all the new words today."]  // 9 words
    ]
  }
}
```

## Mistake #2: GATE Violation (Future Vocabulary)

**LEGO**: S0030L04 - "ayer" (yesterday)
**Position**: 126
**Available**: LEGOs #1-125

### ❌ BAD:

```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería ir a la biblioteca para estudiar ayer.", "I wanted to go to the library to study yesterday."]
      // "biblioteca" is LEGO #624 - FUTURE VOCABULARY!
    ]
  }
}
```

**Problems**:
- ✗ **GATE violation**: "biblioteca" (library) appears at position 624
- ✗ Learner sees unknown vocabulary
- ✗ Breaks pedagogical sequence
- ✗ Course becomes unusable

### ✅ CORRECT:

```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería preguntarte algo importante sobre tu trabajo ayer.", "I wanted to ask you something yesterday."]
      // All vocabulary from LEGOs #1-125 ✓
    ]
  }
}
```

## Mistake #3: Grammar Errors

**LEGO**: S0015L02 - "hablar" (to speak)

### ❌ BAD (Spanish grammar error):

```json
{
  "S0015L02": {
    "lego": ["hablar", "to speak"],
    "e": [
      ["Quiero hablando español contigo.", "I want speaking Spanish with you."]
      // WRONG: "hablando" should be "hablar" after "Quiero"
    ]
  }
}
```

**Problems**:
- ✗ Spanish grammar: "Quiero hablando" is incorrect
- ✗ Should be: "Quiero hablar" (infinitive after modal verb)

### ❌ BAD (English grammar error):

```json
{
  "S0015L02": {
    "lego": ["hablar", "to speak"],
    "e": [
      ["Quiero hablar español contigo.", "I want speak Spanish with you."]
      // WRONG: Missing "to" before "speak"
    ]
  }
}
```

**Problems**:
- ✗ English grammar: "I want speak" is incorrect
- ✗ Should be: "I want to speak"

### ✅ CORRECT:

```json
{
  "S0015L02": {
    "lego": ["hablar", "to speak"],
    "e": [
      ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."]
      // Both languages grammatically perfect ✓
    ]
  }
}
```

## Mistake #4: Culminating LEGO Without Seed Sentence

**LEGO**: S0030L04 - "ayer" (yesterday) - LAST IN SEED
**Seed**: "Quería preguntarte algo ayer." (I wanted to ask you something yesterday.)

### ❌ BAD:

```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería hablar contigo ayer.", "I wanted to speak with you yesterday."],  // NOT THE SEED
      ["Estaba pensando en ti ayer.", "I was thinking about you yesterday."],
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."]  // SEED IS 3RD
    ]
  }
}
```

**Problems**:
- ✗ Culminating LEGO: seed sentence is 3rd, should be 1st
- ✗ Breaks pedagogical payoff moment
- ✗ Learner doesn't get closure

### ✅ CORRECT:

```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],  // ✓ SEED FIRST
      ["Quería hablar contigo ayer.", "I wanted to speak with you yesterday."],
      ["Estaba pensando en ti ayer.", "I was thinking about you yesterday."]
    ]
  }
}
```

## Mistake #5: Unnatural Phrases

**LEGO**: S0050L03 - "importante" (important)

### ❌ BAD:

```json
{
  "S0050L03": {
    "lego": ["importante", "important"],
    "e": [
      ["Quiero hablar importante español rápido mucho ahora.", "I want to speak important Spanish fast much now."]
      // Grammatically broken, unnatural word salad
    ]
  }
}
```

**Problems**:
- ✗ Unnatural: Nobody says this
- ✗ Forced vocabulary: Trying to use many LEGOs without coherence
- ✗ Grammar broken: Word order nonsensical

### ✅ CORRECT:

```json
{
  "S0050L03": {
    "lego": ["importante", "important"],
    "e": [
      ["Quiero preguntarte algo muy importante sobre tu trabajo.", "I want to ask you something very important about your work."]
      // Natural, conversational, grammatical ✓
    ]
  }
}
```

## Mistake #6: Missing D-Phrases

**LEGO**: S0030L04 - "ayer" (yesterday)

### ❌ BAD:

```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],
      ["Estaba pensando en ti ayer.", "I was thinking about you yesterday."]
    ],
    "d": {
      "2": [["algo ayer", "something yesterday"]],  // INCOMPLETE
      "3": [],  // MISSING
      "4": [],  // MISSING
      "5": []   // MISSING
    }
  }
}
```

**Problems**:
- ✗ D-phrases: Incomplete extraction
- ✗ Missing: "preguntarte algo ayer", "pensando en ti ayer", etc.
- ✗ Manual curation: Should be mechanical extraction

### ✅ CORRECT:

```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],
      ["Estaba pensando en ti ayer.", "I was thinking about you yesterday."]
    ],
    "d": {
      "2": [
        ["algo ayer", "something yesterday"],
        ["ti ayer", "you yesterday"]
      ],
      "3": [
        ["preguntarte algo ayer", "to ask you something yesterday"],
        ["en ti ayer", "about you yesterday"]
      ],
      "4": [
        ["Quería preguntarte algo ayer", "I wanted to ask you something yesterday"],
        ["pensando en ti ayer", "thinking about you yesterday"]
      ],
      "5": [
        ["Estaba pensando en ti ayer", "I was thinking about you yesterday"]
      ]
    }
  }
}
```

## Mistake #7: Commentary in Output

**LEGO**: S0030L01 - "Quería" (I wanted)

### ❌ BAD:

```
I've generated baskets for S0030L01. Here's the result:

```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [...],
    "d": {...}
  }
}
```

The basket includes 3 e-phrases following GATE constraint and proper phrase length.
```

**Problems**:
- ✗ Commentary: "I've generated...", explanation text
- ✗ Markdown code blocks: ```json
- ✗ Not pure JSON: Orchestrator can't parse this

### ✅ CORRECT:

```
{"S0030L01":{"lego":["Quería","I wanted"],"e":[...],"d":{...}}}
```

**Why this is good**:
- ✓ Pure JSON: No commentary
- ✓ Compact: Single line, no pretty-printing
- ✓ Parseable: Orchestrator can process immediately

## Key Takeaways

Common mistakes:
1. **Short phrases** when rich vocabulary available
2. **GATE violations** using future vocabulary
3. **Grammar errors** in either language
4. **Wrong culminating handling** seed not first
5. **Unnatural phrases** forced vocabulary
6. **Incomplete d-phrases** manual curation instead of mechanical extraction
7. **Output commentary** instead of pure JSON

**Avoid these and baskets will be high quality.**
