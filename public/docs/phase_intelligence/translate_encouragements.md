# Translate Encouragements

**Version**: 1.0
**Status**: ✅ Active
**Last Updated**: 2025-10-27
**Purpose**: Translate canonical English encouragements into target language for source language voice

---

## Purpose

Translate canonical English encouragements into the target language while maintaining the warm, encouraging tone and pedagogical intent. Encouragements are motivational messages spoken by the course instructor in the learner's known language (source language).

**CRITICAL**: Encouragements are spoken in the SOURCE language (known language), NOT the target language. For example, in an Italian for English speakers course, encouragements are in ENGLISH (the source).

---

## Core Principles

### 1. **Language Assignment**
- **Encouragements are always in the SOURCE (known) language**
- Example: `ita_for_eng` course → English encouragements (not Italian)
- Example: `spa_for_fra` course → French encouragements (not Spanish)
- You are translating **from English canonical to the source language**

### 2. **Tone and Style**
Encouragements must be:
- **Warm and encouraging**: Supportive instructor voice
- **Conversational**: As if speaking directly to the learner
- **Natural**: Idiomatic expressions preferred
- **Enthusiastic**: Maintain motivational energy
- **Informal**: Use informal "you" forms (tu not Lei, tú not usted)

### 3. **Content Preservation**
- Preserve the pedagogical intent and message
- Maintain neuroscience facts and learning principles
- Keep percentage values, numbers, and specific examples
- Don't add or remove content - translate faithfully

### 4. **UUID Preservation**
- Copy UUIDs from English source exactly
- Each encouragement keeps its original ID
- Structure: `{text, id}` format

---

## Input Format

**File**: `vfs/canonical/eng_encouragements.json`

```json
{
  "pooledEncouragements": [
    {
      "text": "Your brain has around 100 billion neurons - that's roughly the same as the number of stars in our galaxy - and as you're...",
      "id": "91c6ff6f-fb35-5ab2-b0d9-04e02f1f4aa5"
    }
  ],
  "orderedEncouragements": [
    {
      "text": "Excellent! You've just taken an important step towards...",
      "id": "62833c2e-30a6-5149-a8b4-9a4c4a3d398e"
    }
  ]
}
```

---

## Output Format

**File**: `vfs/canonical/{source_lang}_encouragements.json`

**Example**: For French for English course → `vfs/canonical/fra_encouragements.json`

```json
{
  "pooledEncouragements": [
    {
      "text": "[Translated French text maintaining conversational tone...]",
      "id": "91c6ff6f-fb35-5ab2-b0d9-04e02f1f4aa5"
    }
  ],
  "orderedEncouragements": [
    {
      "text": "[Translated French text...]",
      "id": "62833c2e-30a6-5149-a8b4-9a4c4a3d398e"
    }
  ]
}
```

---

## Translation Guidelines by Language

### Romance Languages (Spanish, French, Italian, Portuguese)

#### Informal "You"
- **Spanish**: Use "tú" form, NOT "usted"
  - ✅ "Estás haciendo" (you are doing)
  - ❌ "Está haciendo" (formal)

- **French**: Use "tu" form, NOT "vous"
  - ✅ "Tu es en train de" (you are)
  - ❌ "Vous êtes" (formal)

- **Italian**: Use "tu" form, NOT "Lei"
  - ✅ "Stai facendo" (you are doing)
  - ❌ "Sta facendo" (formal)

#### Cognate Preference
- Prefer words similar to English where natural
- Spanish: "practicar" over "entrenar"
- French: "pratiquer" over "s'entraîner"
- Italian: "praticare" over "allenarsi"

#### Natural Idioms
- Don't translate literally if idiom doesn't work
- Find equivalent expressions in target language
- Example: "break a leg" → appropriate cultural equivalent

### Germanic Languages (German)

- **Informal**: Use "du" form, NOT "Sie"
- **Compound words**: Keep natural German compound structure
- **Word order**: Maintain natural German syntax

### Asian Languages (Mandarin, Japanese, Korean)

#### Mandarin
- Use simplified characters unless specified
- Keep tone natural and encouraging
- Translate numerical examples directly (100 billion neurons = 1000亿个神经元)

#### Japanese
- Use **plain/casual form** (である体), NOT polite (ですます体)
- Or use polite but friendly tone if culturally appropriate
- Honorific level should match peer-to-peer learning context

#### Korean
- Use **informal** 해요체 or 반말, NOT formal 합니다체
- Match tone to friendly instructor, not formal teacher

---

## Implementation Steps

### Step 1: Read English Source
```bash
vfs/canonical/eng_encouragements.json
```

### Step 2: Identify Target Language
- Check course code or parameter
- Determine source (known) language
- Example: `ita_for_eng` → Translate to English (known)
- Example: `spa_for_fra` → Translate to French (known)

### Step 3: Translate Each Encouragement

For EACH encouragement in both pooled and ordered arrays:

1. **Read the English text**
2. **Understand the pedagogical intent**:
   - Is it about neuroscience? (brain facts)
   - Is it about learning principles? (10% rule, mistakes are learning)
   - Is it motivational? (you can do this!)
   - Is it about habits? (daily practice)

3. **Translate naturally**:
   - Use conversational, warm tone
   - Maintain informal "you" (tu/tú/du)
   - Preserve numbers and facts
   - Find natural idioms in target language

4. **Preserve UUID exactly**:
   ```json
   {
     "text": "[Your translation]",
     "id": "[Original UUID from English]"
   }
   ```

### Step 4: Quality Check

For each translated encouragement:
- ✅ Is the tone warm and encouraging?
- ✅ Is it conversational (not formal/stiff)?
- ✅ Does it use informal "you" form?
- ✅ Are numbers/facts preserved?
- ✅ Is the UUID copied exactly?
- ✅ Is the grammar perfect?
- ✅ Would a native speaker say this naturally?

### Step 5: Write Output
```bash
vfs/canonical/{source_lang}_encouragements.json
```

---

## Validation Checklist

✅ Both pooled and ordered arrays translated
✅ All UUIDs copied exactly from English source
✅ Count matches: English pooled count = translated pooled count
✅ Count matches: English ordered count = translated ordered count
✅ Tone is warm and encouraging throughout
✅ All text uses informal "you" forms
✅ Grammar is perfect in target language
✅ Numbers and facts preserved (e.g., "100 billion neurons")
✅ No English text remaining in output
✅ Valid JSON format
✅ File saved to correct location

---

## Example Translations

### English → Spanish

**English**:
```
"Your brain has around 100 billion neurons - that's roughly the same as the number of stars in our galaxy - and as you're learning to speak your new language, those neurons are firing together, connecting together, and creating entirely new patterns."
```

**Spanish** (informal tú):
```
"Tu cerebro tiene alrededor de 100 mil millones de neuronas - más o menos el mismo número que las estrellas en nuestra galaxia - y mientras aprendes a hablar tu nuevo idioma, esas neuronas están activándose juntas, conectándose juntas, y creando patrones completamente nuevos."
```

### English → French

**English**:
```
"Excellent! You've just taken an important step towards becoming a confident speaker."
```

**French** (informal tu):
```
"Excellent ! Tu viens de faire un pas important vers devenir un locuteur confiant."
```

### English → Italian

**English**:
```
"Remember, mistakes are how your brain learns - every mistake is actually helping you get better!"
```

**Italian** (informal tu):
```
"Ricorda, gli errori sono il modo in cui il tuo cervello impara - ogni errore ti sta effettivamente aiutando a migliorare!"
```

---

## Anti-patterns

❌ **Don't use formal "you" forms**
- Bad: "Vous êtes" (French formal)
- Good: "Tu es" (French informal)

❌ **Don't translate too literally**
- Bad: Word-for-word translation that sounds unnatural
- Good: Natural idiomatic expression

❌ **Don't change the message**
- Bad: Adding your own content or removing facts
- Good: Faithful translation of original meaning

❌ **Don't modify UUIDs**
- Bad: Generating new UUIDs
- Good: Copying exact UUID from English source

❌ **Don't use stiff/academic language**
- Bad: "It is recommended that you practice daily"
- Good: "Practice every day - you'll be amazed at your progress!"

---

## Language Name Mapping

```javascript
const LANGUAGE_NAMES = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'ita': 'Italian',
  'por': 'Portuguese',
  'deu': 'German',
  'rus': 'Russian',
  'cmn': 'Mandarin Chinese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'cym': 'Welsh',
  'gla': 'Scottish Gaelic',
  'gle': 'Irish Gaelic'
};
```

---

## Usage

When called by automation server or manually:

```bash
# Manual execution (provide source language code)
# Read: vfs/canonical/eng_encouragements.json
# Write: vfs/canonical/{source_lang}_encouragements.json

# Example: Translate to Spanish (for ita_for_spa course)
# Output: vfs/canonical/spa_encouragements.json

# Example: Translate to French (for spa_for_fra course)
# Output: vfs/canonical/fra_encouragements.json
```

---

## Version History

### v1.0 (2025-10-27)
- Initial implementation
- Translation guidelines for Romance, Germanic, and Asian languages
- Informal "you" form requirements
- UUID preservation rules
- Quality validation checklist

---

## Related Components

- **Phase 7**: Loads encouragements and adds to course manifest
- **Phase 8**: Generates audio for encouragement text with presentation_encouragement role
- **MAR**: Tracks encouragement samples with `is_encouragement: true` flag

---

**Remember**: Encouragements are in the SOURCE (known) language, spoken by the instructor to motivate learners. Keep the tone warm, conversational, and encouraging!
