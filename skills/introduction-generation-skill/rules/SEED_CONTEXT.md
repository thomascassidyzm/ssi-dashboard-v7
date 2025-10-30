# Seed Context Requirement

## Critical Rule

**ALWAYS include** `"as in {known_seed}"` to provide context.

## Why Context Matters

Without the seed sentence, learners don't know which meaning or usage of a word/phrase is being taught.

For example:
- "I want" could mean desire, intention, or need
- "trying" could mean attempting or taste-testing
- "speak" could be formal or informal speech

The seed sentence clarifies which usage is relevant.

---

## Examples with Context

**Good:**
```
"Now, the Spanish for "I want" as in "I want to speak Spanish with you now" is "Quiero", Quiero."
```

**Good:**
```
"The Spanish for "I'm trying" as in "I'm trying to learn" is "Estoy intentando" - where "Estoy" means "I am" and "intentando" means "trying"."
```

**Good:**
```
"The Spanish for "as often as possible" as in "how to speak as often as possible" is "lo más a menudo posible" - where "lo más" means "as", "a menudo" means "often", and "posible" means "possible"."
```

---

## Examples WITHOUT Context (Wrong)

**Bad (missing context):**
```
"Now, the Spanish for "I want" is "Quiero", Quiero."
```

**Bad (missing context):**
```
"The Spanish for "I'm trying" is "Estoy intentando" - where "Estoy" means "I am" and "intentando" means "trying"."
```

---

## Implementation

For each LEGO, extract the `known_seed` from the parent seed array and include it in the introduction text with the phrase `as in "{known_seed}"`.

This must appear in **every** introduction, whether BASE or COMPOSITE type.
