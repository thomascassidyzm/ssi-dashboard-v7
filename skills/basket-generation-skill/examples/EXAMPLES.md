# Basket Generation Examples

## Good Example 1: Early LEGO (Limited Vocabulary)

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
- ✓ Phrase length: 3 words (appropriate for 5 available LEGOs)
- ✓ Natural: People actually say these phrases
- ✓ D-phrases: Mechanically extracted, no gaps

---

## Good Example 2: Mid-Range LEGO (Moderate Vocabulary)

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
        ["Quería aprender más", "I wanted to learn more"]
      ],
      "4": [
        ["Quería preguntarte algo importante", "I wanted to ask you something important"],
        ["Quería aprender más sobre", "I wanted to learn more about"]
      ],
      "5": [
        ["Quería preguntarte algo importante sobre", "I wanted to ask you something important about"],
        ["Quería aprender más sobre hablar", "I wanted to learn more about speaking"]
      ]
    }
  }
}
```

**Why this is good**:
- ✓ GATE: All vocabulary from LEGOs #1-122
- ✓ Phrase length: 8-9 words (matches 122 available LEGOs)
- ✓ Natural: Conversational, realistic phrases
- ✓ Variety: Different contexts (asking, learning, remembering)
- ✓ Recency bias: ~35% recent vocabulary
- ✓ D-phrases: Complete extraction

---

## Good Example 3: Culminating LEGO

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
      ["Estaba pensando en hablar contigo ayer.", "I was thinking about speaking with you yesterday."],
      ["No podía recordar las palabras que aprendí ayer.", "I couldn't remember the words I learned yesterday."]
    ],
    "d": {
      "2": [
        ["algo ayer", "something yesterday"],
        ["contigo ayer", "with you yesterday"],
        ["aprendí ayer", "I learned yesterday"]
      ],
      "3": [
        ["preguntarte algo ayer", "to ask you something yesterday"],
        ["hablar contigo ayer", "to speak with you yesterday"]
      ],
      "4": [
        ["Quería preguntarte algo ayer", "I wanted to ask you something yesterday"]
      ],
      "5": []
    }
  }
}
```

**Why this is good**:
- ✓ GATE: All vocabulary from LEGOs #1-125
- ✓ Phrase length: 5-8 words (appropriate for 125 available)
- ✓ **Culminating rule**: First e-phrase = complete seed sentence ✓✓✓
- ✓ Natural: Realistic, conversational phrases

---

## Bad Example 1: Short Phrases with Rich Vocabulary

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
      ["Quería hablar español.", "I wanted to speak Spanish."],
      ["Quería aprender ahora.", "I wanted to learn now."]
    ]
  }
}
```

**Problems**:
- ✗ Phrase length: 3 words when 7-10 possible
- ✗ Wasted opportunity: 122 LEGOs available, only using 2-3
- ✗ Pedagogically weak: Doesn't practice complex sentences

---

## Bad Example 2: Breaking LEGO Pairs into Component Words

**LEGO**: S0030L01 - "Quería" (I wanted)
**Position**: 123
**Available LEGO pairs**: Positions 1-122

**Available includes:**
- S0002L01: "Estoy intentando" / "I'm trying" (complete pair)

### ❌ BAD:

```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [
      ["Quería hablar español pero estoy cansado.", "I wanted to speak Spanish but I'm tired."]
    ]
  }
}
```

**Problems**:
- ✗ **Broke LEGO pair**: Used "estoy" alone, but only "Estoy intentando" exists as a LEGO
- ✗ Cannot extract "Estoy" from "Estoy intentando" unless "Estoy" is also a separate LEGO
- ✗ Phrase won't tile correctly from available LEGO pairs

### ✅ CORRECT:

```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [
      ["Quería hablar español pero estoy intentando aprender.", "I wanted to speak Spanish but I'm trying to learn."]
    ]
  }
}
```

**Why this is good**:
- ✓ Uses complete LEGO pair "Estoy intentando" as a chunk
- ✓ All LEGO pairs used as complete units
- ✓ Phrase tiles perfectly from available LEGO pairs

---

## Bad Example 3: GATE Violation (Future Vocabulary)

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
    ]
  }
}
```

**Problems**:
- ✗ **GATE violation**: "biblioteca" (library) appears at position 624
- ✗ Learner sees unknown vocabulary
- ✗ Breaks pedagogical sequence
- ✗ **Course becomes unusable**

---

## Bad Example 4: Culminating LEGO Without Seed First

**LEGO**: S0030L04 - "ayer" (yesterday) - LAST IN SEED
**Seed**: "Quería preguntarte algo ayer."

### ❌ BAD:

```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería hablar contigo ayer.", "I wanted to speak with you yesterday."],
      ["Estaba pensando en ti ayer.", "I was thinking about you yesterday."],
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."]
    ]
  }
}
```

**Problems**:
- ✗ Culminating LEGO: seed sentence is 3rd, should be 1st
- ✗ Breaks pedagogical payoff moment
- ✗ Learner doesn't get closure

---

## Bad Example 5: Missing D-Phrases

### ❌ BAD:

```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."]
    ],
    "d": {
      "2": [["algo ayer", "something yesterday"]],
      "3": [],
      "4": [],
      "5": []
    }
  }
}
```

**Problems**:
- ✗ D-phrases: Incomplete extraction
- ✗ Missing: "preguntarte algo ayer", etc.
- ✗ Manual curation: Should be mechanical extraction

---

## Bad Example 6: Commentary in Output

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

The basket includes 3 e-phrases following GATE constraint.
```

**Problems**:
- ✗ Commentary: "I've generated...", explanation text
- ✗ Markdown code blocks
- ✗ Not pure JSON: Orchestrator can't parse this

### ✅ CORRECT:

```
{"S0030L01":{"lego":["Quería","I wanted"],"e":[...],"d":{...}}}
```

**Pure JSON, no commentary, single line.**

---

## Key Quality Criteria

**Always check:**
1. ✓ Use complete LEGO pairs as chunks (never break them apart)
2. ✓ GATE compliance (only use LEGO pairs from prior positions)
3. ✓ Phrase length matches available vocabulary
4. ✓ Culminating LEGOs have seed first
5. ✓ Natural, grammatical phrases in both languages
6. ✓ Complete d-phrase extraction (mechanical, no curation)
7. ✓ Pure JSON output (zero commentary)
