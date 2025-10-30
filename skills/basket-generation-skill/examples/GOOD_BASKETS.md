# Good Baskets (Examples)

These examples demonstrate correct basket generation following all rules.

## Example 1: Early LEGO (Limited Vocabulary)

**LEGO**: S0002L01 - "Estoy intentando" (I'm trying)
**Position**: 6
**Available**: LEGOs #1-5 (~10 words)
**Target length**: 3-4 words

```json
{
  "S0002L01": {
    "lego": ["Estoy intentando", "I'm trying"],
    "e": [
      ["Estoy intentando aprender.", "I'm trying to learn."],
      ["Estoy intentando hablar.", "I'm trying to speak."]
    ],
    "d": {
      "2": [
        ["Estoy intentando", "I'm trying"],
        ["intentando aprender", "trying to learn"],
        ["intentando hablar", "trying to speak"]
      ],
      "3": [
        ["Estoy intentando aprender", "I'm trying to learn"],
        ["Estoy intentando hablar", "I'm trying to speak"]
      ],
      "4": [],
      "5": []
    }
  }
}
```

**Why this is good**:
- ✓ GATE: Only uses LEGOs #1-5
- ✓ Grammar: Perfect in both languages
- ✓ Phrase length: 3 words (appropriate for 5 available LEGOs)
- ✓ Natural: People actually say these phrases
- ✓ Operative: Contains "Estoy intentando" in every e-phrase
- ✓ D-phrases: Mechanically extracted, no gaps

## Example 2: Mid-Range LEGO (Moderate Vocabulary)

**LEGO**: S0030L01 - "Quería" (I wanted)
**Position**: 123
**Available**: LEGOs #1-122 (~500 words)
**Target length**: 7-10 words

```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [
      ["Quería preguntarte algo importante sobre tu trabajo ayer.", "I wanted to ask you something important about your work yesterday."],
      ["Quería aprender más sobre hablar español con fluidez.", "I wanted to learn more about speaking Spanish fluently."],
      ["Quería intentar recordar todas las palabras nuevas hoy.", "I wanted to try to remember all the new words today."]
    ],
    "d": {
      "2": [
        ["Quería preguntarte", "I wanted to ask you"],
        ["Quería aprender", "I wanted to learn"],
        ["Quería intentar", "I wanted to try"]
      ],
      "3": [
        ["Quería preguntarte algo", "I wanted to ask you something"],
        ["preguntarte algo importante", "to ask you something important"],
        ["Quería aprender más", "I wanted to learn more"],
        ["aprender más sobre", "to learn more about"],
        ["Quería intentar recordar", "I wanted to try to remember"]
      ],
      "4": [
        ["Quería preguntarte algo importante", "I wanted to ask you something important"],
        ["preguntarte algo importante sobre", "to ask you something important about"],
        ["Quería aprender más sobre", "I wanted to learn more about"],
        ["aprender más sobre hablar", "to learn more about speaking"],
        ["Quería intentar recordar todas", "I wanted to try to remember all"]
      ],
      "5": [
        ["Quería preguntarte algo importante sobre", "I wanted to ask you something important about"],
        ["preguntarte algo importante sobre tu trabajo", "to ask you something important about your work"],
        ["Quería aprender más sobre hablar", "I wanted to learn more about speaking"],
        ["aprender más sobre hablar español", "to learn more about speaking Spanish"],
        ["Quería intentar recordar todas las palabras", "I wanted to try to remember all the words"]
      ]
    }
  }
}
```

**Why this is good**:
- ✓ GATE: All vocabulary from LEGOs #1-122
- ✓ Grammar: Perfect Spanish and English
- ✓ Phrase length: 8-9 words (matches 122 available LEGOs)
- ✓ Natural: Conversational, realistic phrases
- ✓ Variety: Different contexts (asking, learning, remembering)
- ✓ Recency bias: ~35% recent vocabulary
- ✓ D-phrases: Complete extraction, no curation

## Example 3: Culminating LEGO (Special Case)

**LEGO**: S0030L04 - "ayer" (yesterday) - LAST IN SEED
**Position**: 126
**Available**: LEGOs #1-125 (~500 words)
**Seed**: "Quería preguntarte algo ayer." (I wanted to ask you something yesterday.)

```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],
      ["Estaba pensando en hablar contigo sobre tu trabajo ayer.", "I was thinking about speaking with you about your work yesterday."],
      ["No podía recordar todas las palabras que aprendí ayer.", "I couldn't remember all the words I learned yesterday."]
    ],
    "d": {
      "2": [
        ["algo ayer", "something yesterday"],
        ["trabajo ayer", "work yesterday"],
        ["aprendí ayer", "I learned yesterday"]
      ],
      "3": [
        ["preguntarte algo ayer", "to ask you something yesterday"],
        ["tu trabajo ayer", "your work yesterday"],
        ["que aprendí ayer", "that I learned yesterday"]
      ],
      "4": [
        ["Quería preguntarte algo ayer", "I wanted to ask you something yesterday"],
        ["sobre tu trabajo ayer", "about your work yesterday"],
        ["palabras que aprendí ayer", "words that I learned yesterday"]
      ],
      "5": [
        ["hablar contigo sobre tu trabajo ayer", "to speak with you about your work yesterday"],
        ["todas las palabras que aprendí ayer", "all the words that I learned yesterday"]
      ]
    }
  }
}
```

**Why this is good**:
- ✓ GATE: All vocabulary from LEGOs #1-125
- ✓ Grammar: Perfect in both languages
- ✓ Phrase length: 5-10 words (appropriate for 125 available)
- ✓ **Culminating rule**: First e-phrase = complete seed sentence ✓✓✓
- ✓ Natural: Realistic, conversational phrases
- ✓ D-phrases: Mechanically extracted from all e-phrases

## Example 4: Rich Vocabulary with Recency Bias

**LEGO**: S0150L03 - "biblioteca" (library)
**Position**: 624
**Available**: LEGOs #1-623 (~2500 words)
**Recent window**: Seeds 140-149 (~40 LEGOs)

```json
{
  "S0150L03": {
    "lego": ["biblioteca", "library"],
    "e": [
      ["Quería ir a la biblioteca para estudiar con mis amigos esta tarde.", "I wanted to go to the library to study with my friends this afternoon."],
      ["Voy a buscar un libro interesante en la biblioteca después de trabajar.", "I'm going to look for an interesting book in the library after working."],
      ["No podía encontrar el libro que necesitaba en la biblioteca ayer.", "I couldn't find the book I needed in the library yesterday."],
      ["Me gusta leer y aprender cosas nuevas en la biblioteca.", "I like to read and learn new things in the library."]
    ],
    "d": {
      "2": [
        ["la biblioteca", "the library"],
        ["en la biblioteca", "in the library"],
        ["biblioteca para", "library to"],
        ["biblioteca después", "library after"],
        ["biblioteca ayer", "library yesterday"]
      ],
      "3": [
        ["a la biblioteca", "to the library"],
        ["la biblioteca para", "the library to"],
        ["en la biblioteca", "in the library"],
        ["biblioteca para estudiar", "library to study"],
        ["la biblioteca después", "the library after"],
        ["la biblioteca ayer", "the library yesterday"]
      ],
      "4": [
        ["a la biblioteca para", "to the library to"],
        ["la biblioteca para estudiar", "the library to study"],
        ["en la biblioteca después", "in the library after"],
        ["necesitaba en la biblioteca", "I needed in the library"],
        ["nuevas en la biblioteca", "new in the library"]
      ],
      "5": [
        ["ir a la biblioteca para", "to go to the library to"],
        ["a la biblioteca para estudiar", "to the library to study"],
        ["libro en la biblioteca después", "book in the library after"],
        ["necesitaba en la biblioteca ayer", "I needed in the library yesterday"],
        ["cosas nuevas en la biblioteca", "new things in the library"]
      ]
    }
  }
}
```

**Why this is good**:
- ✓ GATE: All vocabulary from LEGOs #1-623
- ✓ Grammar: Perfect Spanish and English
- ✓ Phrase length: 9-13 words (rich vocabulary allows longer)
- ✓ Natural: Realistic library-related contexts
- ✓ Recency bias: ~40% from seeds 140-149 (estudiar, libro, trabajar from recent seeds)
- ✓ Variety: 4 different contexts (studying, searching, reading, learning)
- ✓ D-phrases: Comprehensive extraction

## Key Takeaways

1. **Phrase length scales with vocabulary** - More available LEGOs = longer phrases
2. **GATE is absolute** - Never use future vocabulary
3. **Grammar perfection** - Both languages must be flawless
4. **Culminating LEGOs** - First e-phrase = seed sentence
5. **Natural phrases** - Things people actually say
6. **Mechanical d-phrase extraction** - No curation, just extract all windows
7. **Recency bias** - For LEGOs 50+, use ~35% recent vocabulary
