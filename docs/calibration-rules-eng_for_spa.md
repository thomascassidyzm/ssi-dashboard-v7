# Calibration Rules — eng_for_spa (English for Spanish Speakers)

> Learned from human-supervised golden seed phase (seeds 1-10).
> These rules are MANDATORY for all autonomous decomposition work.

## Course Identity

- **Known language**: Spanish (what the learner already speaks)
- **Target language**: English (what they're learning)
- **Register**: tú throughout (never usted)
- **Style**: Natural, conversational — what a real Spanish speaker would say

---

## LEGO Rules

### 1. LEGO Form Is Fixed
The LEGO's known text must match the exact grammatical form of the Spanish. Never strip, conjugate, or alter.

- "quiero" = **"I want"** (first person singular) — NOT "want"
- "estoy tratando de" = **"I'm trying to"** — NOT "trying to"
- "hablo" = **"I speak"** — NOT "speak"
- "voy a" = **"I'm going to"** — NOT "going to"

**Rule**: If the Spanish contains a conjugated verb with a person (estoy, quiero, voy, hablo, etc.), the English MUST include that person.

### 2. LEGO Ordering Within a Seed — Most Combinable First
LEGOs within a seed form a cascade:
- **L1** can ONLY combine with prior seed vocab
- **L2** can use L1 + prior seed vocab
- **L3** can use L1 + L2 + prior seed vocab

**Always put the LEGO with the richest combinations against existing vocab FIRST.**

Example (Seed 4): "cómo decir algo en inglés" → "how to say something in English"
- ✅ L1: "algo" (something) — combines with "I want to learn", "I'm trying to learn", etc.
- ✅ L2: "cómo decir" (how to say) — now combines with L1: "how to say something"
- ✅ L3: "en inglés" (in English) — combines with everything
- ❌ WRONG: "cómo decir" as L1 — has nothing to combine with

### 3. M-LEGO Components Are Available Vocab
When an M-LEGO like "cómo decir" is introduced, its individual components ("cómo" and "decir") become available vocabulary. They can appear independently in phrases.

### 4. LEGO Size: 2-4 Words
LEGOs are SMALL pieces, never whole sentences. The sweet spot balances safety (bigger = less ambiguity) with reusability (smaller = more combinations).

---

## Phrase Rules

### 5. BUILD Phrases Must Be Natural Fragments
No capitalisation, no trailing periods — these are spoken fragments, not written sentences.
Each BUILD should feel like something a learner might actually say or think.

- ✅ "to speak English" — natural fragment
- ✅ "I want to speak" — natural fragment
- ✅ "how to say something" — natural fragment
- ❌ "want to speak" — who says this? Missing "I"
- ❌ "trying to speak English" — missing "I'm"

**Rule**: If the Spanish BUILD contains a conjugated verb, the English must preserve the person.

### 6. BUILD Phrases Must Respect the Cascade
BUILD phrases for a LEGO can only use that LEGO's vocab + prior LEGOs + prior seed vocab. They cannot use vocab from LEGOs introduced later in the same seed.

### 7. USE Phrases — Complete Sentences for Eternal Spaced Repetition
- Must be complete, natural sentences
- No capitalisation, no trailing periods (spoken phrases, not written sentences)
- Scored 5-9 (9 = native-natural both languages, high pedagogical value)
- Must be things a learner would genuinely want to say
- Variety: questions, statements, different time frames, different combinations

### 8. Every Word Must Trace to Introduced Vocabulary
**Every single word** in a phrase — including negation words (no/not), articles, prepositions, pronouns, question words — must come from previously introduced vocabulary (either as a LEGO or as a component of an M-LEGO).

- ❌ "No estoy tratando de hablar" — "no" hasn't been introduced yet
- ✅ Only use "no/not" after it appears in a seed's LEGO (e.g., seed 10 introduces "No sé")

### 9. Don't Force Unnecessary BUILDs
Pick natural stepping stones between components and the full sentence. You don't need every possible intermediate combination.

---

## Phrase Count Requirements

| Seed | min BUILD | min USE |
|------|-----------|---------|
| Seed 1 L1 | 0 | 0 |
| Seed 1 L2+ | 1 | 1 |
| Seeds 2-3 | 1 | 1 |
| Seeds 4+ | **3** | **5** |

These are enforced by the API. `skip_validation` only works for seeds 1-3.

---

## Translation Rules

- **Register**: tú throughout, never usted
- **Cognate avoidance**: Prefer non-cognate vocabulary where possible — learners need to practise NEW sounds
- **Naturalness**: What would a real Spanish speaker say? Not a literal translation
- **Decomposability**: Choose translations that break into 3-6 useful small LEGOs

---

## Process Rules

### Submission Order
Seeds MUST be submitted sequentially. Each seed's vocab builds on all previous seeds. The API checks vocab compliance against the accumulated vocabulary.

### Vocab Check Before Decomposition
Before decomposing seed N, pull available vocabulary:
```
GET /api/vocab/eng_for_spa?seed=N
```

### API Endpoint
```
POST /api/seed/complete?course=eng_for_spa
Content-Type: text/markdown
```

---

## Golden Seed Examples

### Seed 1 — First seed (sparse vocab, everything is new)
"Quiero hablar inglés contigo ahora." → "I want to speak English with you now."
- 5 LEGOs: Quiero (I want), hablar (to speak), inglés (English), contigo (with you), ahora (now)
- L1 introduces the most reusable piece ("I want") — everything builds from there
- BUILDs grow naturally: "I want" → "I want to speak" → "to speak English" → etc.

### Seed 4 — Ordering example (most combinable first)
"cómo decir algo en inglés" → "how to say something in English"
- L1: algo (something) — richest combinations with existing vocab
- L2: cómo decir (how to say) — combines with L1 + existing
- L3: en inglés (in English) — combines with everything

### Seed 10 — Introducing negation
"No sé si puedo recordar toda la frase." → "I'm not sure if I can remember the whole sentence."
- "No sé" introduces "no" for the first time — after this, negation is available
- Before this seed, no phrase can use "no/not"

---

## Optional Component Introduction (`introduce: false`)

M-LEGO components exist for two reasons: (1) tiling validation, (2) pedagogy. These are independent — a component may be needed for tiling but not worth introducing to the learner solo.

Set `introduce: false` on a component when it would confuse more than help as a standalone item:
- Single-letter prepositions ("s", "a", "de") that are meaningless alone
- Particles or stubs that only make sense attached to their parent
- Components that are already well-known from an earlier A-LEGO (no need to re-introduce)

Example:
```json
{
  "type": "M", "known": "with you", "target": "s tobom",
  "components": [
    { "known": "with", "target": "s", "introduce": false },
    { "known": "you", "target": "tobom" }
  ]
}
```

Default is `introduce: true` — only suppress when the component would actively confuse. The component still exists in the DB for tiling and still counts as available vocabulary.

---

## Common Mistakes to Avoid

1. **Stripping person from conjugated verbs** — "quiero hablar" → "want to speak" (WRONG)
2. **Poor LEGO ordering** — putting the least combinable LEGO first
3. **Using vocab before it's introduced** — especially negation, articles, question words
4. **Forcing unnecessary BUILD combinations** — every intermediate isn't needed
5. **Unnatural BUILD fragments** — "want to speak" isn't something anyone says
6. **Too few phrases** — seeds 4+ need 3+ BUILD and 5+ USE per LEGO
7. **Duplicate phrases across LEGOs** — each phrase should appear once
8. **M-LEGO splitting without awareness** — components ARE available, but check the cascade
