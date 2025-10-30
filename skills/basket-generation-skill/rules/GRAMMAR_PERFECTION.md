# Grammar Perfection (Absolute Rule)

**Both target and known language must have perfect grammar. No exceptions.**

## Why is this absolute?

Grammar errors:
- Teach learners incorrect language
- Undermine trust in the course
- Create fossilized mistakes
- Cannot be fixed after publication

## What "perfect grammar" means

### Target Language

Every phrase must be:
- **Grammatically correct** in the target language
- **Natural** (how native speakers actually talk)
- **Properly conjugated** (verbs, nouns, adjectives agree)
- **Idiomatically sound** (not word-for-word translation)

### Known Language

Every translation must be:
- **Grammatically correct** in English (or learner's language)
- **Natural** (how native speakers actually talk)
- **Semantically equivalent** to target phrase
- **Register-appropriate** (formal/informal matches)

## Language-Specific Rules

### Spanish

**Verb conjugation**:
```
✓ "Quiero hablar"     (I want to speak)
✗ "Quiero hablando"   (I want speaking) - wrong form
```

**Gender/number agreement**:
```
✓ "la mesa pequeña"   (the small table - feminine)
✗ "la mesa pequeño"   (the small table - masculine ending)
```

**Preposition usage**:
```
✓ "Pienso en ti"      (I think about you)
✗ "Pienso sobre ti"   (I think about you - wrong preposition)
```

### Italian

**Infinitive + preposition rules** (CRITICAL):

| Verb | Preposition | Example |
|------|-------------|---------|
| cercare | di | `"cercando di parlare"` (trying to speak) |
| imparare | a | `"imparando a parlare"` (learning to speak) |
| provare | a | `"provando a dire"` (trying to say) |
| continuare | a | `"continuando a parlare"` (continuing to speak) |

✓ CORRECT:
```
"Sto cercando di parlare italiano"  (I'm trying to speak Italian)
```

✗ WRONG:
```
"Sto cercando parlare italiano"  (missing "di")
```

### French

**Partitive articles**:
```
✓ "Je veux du pain"    (I want some bread - masculine)
✓ "Je veux de la confiture"  (I want some jam - feminine)
✗ "Je veux de pain"    (missing article)
```

**Negative construction**:
```
✓ "Je ne parle pas français"  (I don't speak French)
✗ "Je ne parle français"      (missing "pas")
```

### Irish/Welsh/Other Complex Languages

Consult language-specific grammar references. No shortcuts.

## Common Grammar Mistakes

### 1. Verb form errors

❌ WRONG:
```
"I want speaking Spanish"  (gerund where infinitive needed)
```

✅ CORRECT:
```
"I want to speak Spanish"
```

### 2. Articles

❌ WRONG (Spanish):
```
"Hablo español en escuela"  (missing article)
```

✅ CORRECT:
```
"Hablo español en la escuela"  (I speak Spanish at the school)
```

### 3. Word order

❌ WRONG (Spanish):
```
"grande casa"  (adjective before noun - unnatural)
```

✅ CORRECT:
```
"casa grande"  (big house - adjective after noun)
```

### 4. Tense agreement

❌ WRONG:
```
"Quería hablar pero no puedo"  (past + present - inconsistent)
```

✅ CORRECT:
```
"Quería hablar pero no podía"  (I wanted to speak but I couldn't)
```

## How to validate grammar

**Before accepting any phrase:**

1. **Read it aloud** - Does it sound natural?
2. **Check verb forms** - Correct conjugation?
3. **Check agreement** - Gender, number, tense align?
4. **Check idioms** - Is this how native speakers talk?
5. **Check both languages** - Known AND target must be perfect

**If you're uncertain about grammar:**
- Look up the construction in the lego_pairs.json (shows validated grammar)
- Check seed_pairs.json (all seeds are grammatically validated)
- When in doubt, use simpler constructions you know are correct

## Grammar Checklist

Before accepting an e-phrase:

- ✓ Target language: grammatically perfect?
- ✓ Known language: grammatically perfect?
- ✓ Both languages: natural and idiomatic?
- ✓ Verb forms: correct conjugation?
- ✓ Agreement: gender/number/tense consistent?
- ✓ Prepositions: language-appropriate?

If ANY check fails → reject and regenerate

## Bottom Line

**Perfect grammar is not optional. If you're unsure, use simpler constructions or look up validated examples in lego_pairs.json.**
