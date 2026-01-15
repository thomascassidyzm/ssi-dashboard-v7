# Phase 3 Scaffold Format (v9)

This document defines the plain-text scaffold format for Phase 3 basket generation.

---

## Design Principles

1. **Pattern matching, not translation** - LLM recombines shown patterns
2. **Parallel pairs** - Both languages shown together
3. **Bracket notation** - `[brackets]` mark recently NEW LEGOs (prioritize these)
4. **Minimal tokens** - ~100-200 tokens vs 2000+ in v8
5. **Context-rich** - Real sentences show natural combination patterns

---

## Scaffold Structure

```
=== PHASE 3: BASKET GENERATION ===

Course: {course_code}
Languages: {known_language} → {target_language}

---

YOUR LEGO: [{known}] / [{target}]

From seed S{NNNN}:
  "{seed_known_with_brackets}"
  "{seed_target_with_brackets}"

---

RECENT PATTERNS ([brackets] = recently NEW - prioritize these):

S{NNNN}: "{known_sentence_with_brackets}"
         "{target_sentence_with_brackets}"

S{NNNN}: "{known_sentence_with_brackets}"
         "{target_sentence_with_brackets}"

[... 10-15 seed pairs total ...]

---

TASK: Generate 15-20 practice phrases containing [{lego}].

Rules:
- Recombine patterns from above (don't invent new vocabulary)
- Prioritize [bracketed] LEGOs (recently learned)
- Length: from [{lego}] + one word up to ~12 words
- Order: shortest first, longest last
- Natural in BOTH languages

Output format:
1. "{known}" / "{target}"
2. "{known}" / "{target}"
[... 15-20 phrases ...]
```

---

## Example Scaffold (Italian, S0056L07)

```
=== PHASE 3: BASKET GENERATION ===

Course: ita_for_eng
Languages: English → Italian

---

YOUR LEGO: [words] / [parole]

From seed S0056:
  "So I can remember how to say [a few words]."
  "Così posso ricordare come dire [alcune parole]."

---

RECENT PATTERNS ([brackets] = recently NEW - prioritize these):

S0056: "So I can remember how to say [a few words]."
       "Così posso ricordare come dire [alcune parole]."

S0055: "[I don't enjoy] [waking up] when [I didn't sleep] well."
       "[Non mi piace] [svegliarmi] quando [non ho dormito] bene."

S0054: "[We wanted] [to give] you [a little more] [time]."
       "[Volevamo] [darti] [un po' più] di [tempo]."

S0053: "[She wanted] [to put] [his letter] [in her bag]."
       "[Voleva] [mettere] [la sua lettera] [nella sua borsa]."

S0052: "[He wanted] [to write] [a letter] to [his friend] [last week]."
       "[Voleva] [scrivere] [una lettera] [al suo amico] [la settimana scorsa]."

S0051: "[I enjoy] [doing] [interesting things] with [my friends]."
       "[Mi piace] [fare] [cose interessanti] con [i miei amici]."

S0050: "[I'm not] [trying to] [finish] [as quickly as possible]."
       "[Non sto] [cercando di] [finire] [il più velocemente possibile]."

S0049: "Do [you know] [what] I mean [like this]?"
       "[Capisci] [cosa] intendo [così]?"

S0048: "[I care], [don't] I?"
       "[Mi importa], [non] è vero?"

S0047: "[I think] [that] [it's] [a good thing] [to make] mistakes."
       "[Penso] [che] [sia] [una buona cosa] [fare] errori."

S0046: "[I don't worry] about [making mistakes]."
       "[Non mi preoccupo] di [fare errori]."

---

TASK: Generate 15-20 practice phrases containing [words] / [parole].

Rules:
- Recombine patterns from above (don't invent new vocabulary)
- Prioritize [bracketed] LEGOs (recently learned)
- Length: from [words] + one word up to ~12 words
- Order: shortest first, longest last
- Natural in BOTH languages

Output format:
1. "{known}" / "{target}"
2. "{known}" / "{target}"
[... 15-20 phrases ...]
```

---

## What the LLM Should Produce

Given the scaffold above, the LLM recombines patterns:

```
1. "Some words." / "Alcune parole."
2. "I want words." / "Voglio parole."
3. "A few words now." / "Alcune parole adesso."
4. "I can say words." / "Posso dire parole."
5. "I want to say words." / "Voglio dire parole."
6. "I enjoy learning words." / "Mi piace imparare parole."
7. "I don't enjoy waking up to learn words." / "Non mi piace svegliarmi per imparare parole."
8. "She wanted to write a few words." / "Voleva scrivere alcune parole."
9. "I think that it's a good thing to learn words." / "Penso che sia una buona cosa imparare parole."
10. "We wanted to give you a little more time to say words." / "Volevamo darti un po' più di tempo per dire parole."
[... etc ...]
```

All vocabulary comes from recombining the shown patterns - no translation needed.

---

## Server-Side Validation

After receiving phrases, the server:

1. **Decomposition check (known)**: Can the English phrase decompose into A/M/Components?
2. **Decomposition check (target)**: Can the Italian phrase decompose into A/M/Components?
3. **LEGO presence**: Does the phrase contain [words]/[parole]?
4. **Length check**: LEGO+1 minimum, ~12 words maximum?
5. **Filter**: Remove any phrases that fail
6. **Order**: Sort by known language syllable count (ascending)
7. **Output**: Keep 10+ valid phrases

---

## Token Comparison

| Version | Scaffold Size | Content |
|---------|--------------|---------|
| v8 | ~2000+ tokens | 300 known vocab + 300 target vocab + rules |
| v9 | ~150-200 tokens | 10-15 parallel sentence pairs + rules |

**~10x reduction** in input tokens.

---

## Generating the Scaffold

The scaffold generator needs to:

1. Load `lego_pairs.json` for the course
2. For the target LEGO, get its seed sentence
3. Find seeds containing the 30 most recent `new: true` LEGOs
4. For each seed, format the sentence with brackets around new LEGOs
5. Output plain text scaffold

See `generate-scaffold-v9.cjs` for implementation.
