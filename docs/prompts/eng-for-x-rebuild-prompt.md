# Build eng_for_{LANG} Course - First 10 Rounds

You are building a course for **{LANG_NAME} speakers learning English**.

## Direction

- **Known language** (what learner speaks): {LANG_NAME}
- **Target language** (what learner is learning): English
- **Format**: {LANG_NAME} → English

## Example: Spanish for English Speakers (REVERSE of what we're doing)

Here's how we built **spa_for_eng** (English speakers learning Spanish):

```
R1: S0001L01 - I want to speak → quiero hablar
R2: S0001L02 - Spanish → español
  BUILD: speak Spanish → hablar español
  BUILD: I want to speak Spanish → quiero hablar español
R3: S0001L03 - with you → contigo
  BUILD: speak with you → hablar contigo
  BUILD: I want to speak with you → quiero hablar contigo
  BUILD: speak Spanish with you → hablar español contigo
R4: S0001L04 - now → ahora
  BUILD: speak now → hablar ahora
  BUILD: I want to speak now → quiero hablar ahora
  BUILD: speak Spanish now → hablar español ahora
  BUILD: speak with you now → hablar contigo ahora
  BUILD: I want to speak Spanish now → quiero hablar español ahora
  BUILD: I want to speak with you now → quiero hablar contigo ahora
  BUILD: speak Spanish with you now → hablar español contigo ahora
```

**Your task: Do the REVERSE** - {LANG_NAME} speakers learning English.

## 10 Canonical English Seeds

```
S0001: I want to speak English with you now.
S0002: I'm trying to learn.
S0003: how to speak as much as possible.
S0004: how to say something in English
S0005: I'm going to practise speaking with someone else.
S0006: I'm trying to remember a word.
S0007: I want to try as hard as I can today.
S0008: I'm going to try to explain what I mean.
S0009: I speak a little English now.
S0010: I'm not sure if I can remember the whole sentence.
```

## Your Task

For each SEED (S0001 through S0010):

1. **Translate the English SEED into {LANG_NAME}**
   - This becomes the SEED_PAIR: {LANG_NAME} known → English target

2. **Break the SEED into LEGO_PAIRS**
   - Identify the smallest reusable chunks
   - Each LEGO is: {LANG_NAME} known → English target
   - Example for Portuguese S0001:
     * "Eu quero falar" → "I want to speak"
     * "inglês" → "English"
     * "com você" → "with you"
     * "agora" → "now"

3. **Build practice phrases progressively**
   - Introduce ONE LEGO per round
   - Build combinations using ONLY previously introduced LEGOs
   - Follow the spa_for_eng structure

## Critical Rules

**ZUT (Zero Untaught Tokens):**
- You CANNOT use a LEGO_PAIR in practice until it's been introduced
- Every word in a practice phrase must come from a previously introduced LEGO

**One-to-One Mapping:**
- A {LANG_NAME} prompt CANNOT point to multiple English responses
- Each known_text must have exactly ONE target_text

## Output Format

For each ROUND, output:

```json
{
  "round": 1,
  "seed_id": "S0001",
  "lego_id": "L01",
  "lego_pair": {
    "known": "{LANG_NAME} text",
    "target": "English text"
  },
  "practice_phrases": [
    {
      "type": "INTRO",
      "known": "{LANG_NAME}",
      "target": "English"
    },
    {
      "type": "LEGO",
      "known": "{LANG_NAME}",
      "target": "English"
    },
    {
      "type": "BUILD-1",
      "known": "{LANG_NAME}",
      "target": "English"
    }
  ]
}
```

## Start Now

Build ROUNDS 1-10 for **eng_for_{LANG}** ({LANG_NAME} → English).

Follow the spa_for_eng structure exactly, but REVERSED.
