# Introduction Format

## Two Presentation Types

### BASE LEGOs (type: B)

Simple introduction format:
```
"Now, the {target_lang} for "{known_lego}" as in "{known_seed}" is "{target_lego}", {target_lego}."
```

**Example:**
```
"Now, the Spanish for "I want" as in "I want to speak Spanish with you now" is "Quiero", Quiero."
```

**Key features:**
- Starts with "Now, the"
- Includes seed context ("as in...")
- Ends with repetition for pronunciation

---

### COMPOSITE LEGOs (type: C)

Detailed breakdown with component explanation:
```
"The {target_lang} for "{known_lego}" as in "{known_seed}" is "{target_lego}" - where {component_explanations}."
```

**Component explanations use "means":**
- `"{target_part}" means "{known_part}"`

**Examples:**

**2 components:**
```
"The Spanish for "I'm trying" as in "I'm trying to learn" is "Estoy intentando" - where "Estoy" means "I am" and "intentando" means "trying"."
```

**3+ components:**
```
"The Spanish for "as often as possible" as in "how to speak as often as possible" is "lo más a menudo posible" - where "lo más" means "as", "a menudo" means "often", and "posible" means "possible"."
```

---

## Component Grammar Rules

- **1 component**: `where X`
- **2 components**: `where X and Y`
- **3+ components**: `where X, Y, and Z`

Use Oxford comma for 3+ components.

---

## Language Name Mapping

```javascript
const LANGUAGE_NAMES = {
  'ita': 'Italian',
  'spa': 'Spanish',
  'fra': 'French',
  'cmn': 'Mandarin',
  'cym': 'Welsh',
  'gle': 'Irish',
  'eus': 'Basque',
  'mkd': 'Macedonian',
  'eng': 'English'
};
```

---

## Repetition Format

End BASE presentations with the target word repeated:
```
"...is \"Voglio\", Voglio."
```

This helps learners hear the pronunciation clearly. COMPOSITE LEGOs do not need repetition (they end with component explanation).
