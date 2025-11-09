# Componentization Guide

## Purpose

Componentization explains how a COMPOSITE LEGO breaks down into its parts, helping learners understand the internal structure.

## Format

```
{known_full} = {target_full}, where {known_part1} = {target_part1} and {known_part2} = {target_part2}
```

## Good Componentization Examples

### Example 1: Simple Two-Part COMPOSITE

**COMPOSITE LEGO:**
```json
{
  "target_chunk": "la mesa",
  "known_chunk": "the table"
}
```

**Componentization:**
```
"the table = la mesa, where la = the and mesa = table"
```

**Why it's good:**
- ✅ Follows standard format
- ✅ Clear "where" clause explaining parts
- ✅ Parts align with FEEDERs
- ✅ Natural language (not formulaic)

---

### Example 2: Verb + Gerund

**COMPOSITE LEGO:**
```json
{
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying"
}
```

**Componentization:**
```
"I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
```

**Why it's good:**
- ✅ Uses "represents" for semantic relationship
- ✅ Acknowledges "intentando" isn't literal "trying" (it's gerund form)
- ✅ Pedagogically accurate
- ✅ Helps learner understand verb structure

---

### Example 3: Negation + Pronoun

**COMPOSITE LEGO:**
```json
{
  "target_chunk": "no lo",
  "known_chunk": "not it"
}
```

**Componentization:**
```
"not it = no lo, where no = not and lo = it"
```

**Why it's good:**
- ✅ Straightforward mapping
- ✅ Each component is clear
- ✅ Order is preserved
- ✅ No unnecessary elaboration

---

### Example 4: More Complex COMPOSITE

**COMPOSITE LEGO:**
```json
{
  "target_chunk": "Estoy tratando de",
  "known_chunk": "I'm trying to"
}
```

**Componentization:**
```
"I'm trying to = Estoy tratando de, where Estoy = I'm, tratando = trying, and de = to"
```

**Why it's good:**
- ✅ Handles three components clearly
- ✅ Uses commas for readability
- ✅ Final "and" before last component
- ✅ Each part aligns with FEEDER

## Bad Componentization Examples

### ❌ Example 1: Over-Explaining

**Bad:**
```
"I'm trying = Estoy intentando, where Estoy is the first person singular present tense conjugation of the verb estar (to be) combined with the present participle intentando, which is the -ando form of the infinitive intentar, meaning to try"
```

**Why it's bad:**
- ❌ Too much grammatical detail
- ❌ Overwhelms learner
- ❌ Not concise
- ❌ Loses pedagogical focus

**Good:**
```
"I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
```

---

### ❌ Example 2: Missing "where" Clause

**Bad:**
```
"the table = la mesa (la/the, mesa/table)"
```

**Why it's bad:**
- ❌ Doesn't follow standard format
- ❌ Uses slash notation (unclear)
- ❌ Missing "where" explanation
- ❌ Looks like a dictionary entry

**Good:**
```
"the table = la mesa, where la = the and mesa = table"
```

---

### ❌ Example 3: Misaligned Components

**Bad:**
```
COMPOSITE: "no lo sé" → "I don't know"
Componentization: "I don't know = no lo sé, where no = don't and lo sé = know"
```

**Why it's bad:**
- ❌ "lo sé" isn't a single component (should be "sé" = know)
- ❌ Doesn't match FEEDER structure
- ❌ Misleading to learner

**Good:**
```
"I don't know = no lo sé, where no = not, lo = it, and sé = know"
```

---

### ❌ Example 4: Too Technical

**Bad:**
```
"the table = la mesa, where la is the feminine definite article and mesa is a first-declension feminine noun"
```

**Why it's bad:**
- ❌ Uses grammatical terminology (definite article, declension)
- ❌ Assumes grammatical knowledge
- ❌ Not pedagogically friendly
- ❌ Scares learners away

**Good:**
```
"the table = la mesa, where la = the and mesa = table"
```

## Special Cases

### Case 1: Semantic Relationships (not literal)

When components don't map literally, use "represents" or "expresses":

**Example:**
```json
{
  "target_chunk": "me gusta",
  "known_chunk": "I like"
}
```

**Componentization:**
```
"I like = me gusta, where me represents to me and gusta = pleases"
```

**Why "represents"?**
- "me gusta" literally means "to me it pleases"
- But learners understand it as "I like"
- "represents" acknowledges the semantic shift

---

### Case 2: Contractions

**Example:**
```json
{
  "target_chunk": "Estoy intentando",
  "known_chunk": "I'm trying"
}
```

**Question:** Should we explain "I'm" = "I am"?

**Answer:** NO, treat "I'm" as atomic

**Componentization:**
```
"I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
```

**Reasoning:**
- We're teaching Spanish, not English grammar
- "I'm" is the natural form learners will use
- Don't over-explain the known language

---

### Case 3: Three or More Components

**Example:**
```json
{
  "target_chunk": "no lo sé",
  "known_chunk": "I don't know"
}
```

**Componentization:**
```
"I don't know = no lo sé, where no = not, lo = it, and sé = know"
```

**Format:**
- Use commas to separate components
- Use "and" before final component
- Keep it readable and scannable

---

### Case 4: Word Order Differences

**Example:**
```json
{
  "target_chunk": "me gusta mucho",
  "known_chunk": "I like a lot"
}
```

**Componentization:**
```
"I like a lot = me gusta mucho, where me represents to me, gusta = pleases, and mucho = a lot"
```

**Note:** Don't over-explain word order differences - just map the components.

## Componentization Checklist

Before finalizing componentization:

- [ ] Follows standard format: `{known} = {target}, where {k1} = {t1} and {k2} = {t2}`
- [ ] Uses "where" to introduce component breakdown
- [ ] Each component aligns with a FEEDER
- [ ] Uses "represents" or "expresses" for semantic (not literal) mappings
- [ ] Avoids grammatical jargon
- [ ] Concise (1-2 sentences maximum)
- [ ] Natural language (not formulaic notation)
- [ ] Pedagogically helpful (explains structure without overwhelming)

## Formula Template

**Standard (2 parts):**
```
{known} = {target}, where {k1} = {t1} and {k2} = {t2}
```

**With Semantic Mapping:**
```
{known} = {target}, where {k1} represents {t1} and {k2} = {t2}
```

**Three Parts:**
```
{known} = {target}, where {k1} = {t1}, {k2} = {t2}, and {k3} = {t3}
```

**Four or More Parts:**
```
{known} = {target}, where {k1} = {t1}, {k2} = {t2}, {k3} = {t3}, and {k4} = {t4}
```

## Real Examples from Courses

### Spanish Course

✅ **"I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"**

✅ **"not it = no lo, where no = not and lo = it"**

✅ **"the table = la mesa, where la = the and mesa = table"**

### Italian Course

✅ **"I'm trying = Sto provando, where Sto = I'm and provando represents trying"**

✅ **"the coffee = il caffè, where il = the and caffè = coffee"**

### French Course

✅ **"I'm trying = J'essaie, where J' represents I and essaie = try"**

✅ **"the book = le livre, where le = the and livre = book"**

### Mandarin Course

✅ **"don't know = 不知道, where 不 = not and 知道 = know"**

✅ **"very good = 很好, where 很 = very and 好 = good"**

## Quality Standards

**Good componentization:**
- ✅ Clear and concise
- ✅ Pedagogically valuable
- ✅ Follows standard format
- ✅ Natural language
- ✅ Helps learner understand structure

**Bad componentization:**
- ❌ Too long or complex
- ❌ Uses grammatical jargon
- ❌ Doesn't match FEEDERs
- ❌ Over-explains or under-explains
- ❌ Confuses rather than clarifies
