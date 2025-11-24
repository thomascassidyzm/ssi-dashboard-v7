# Unified Phase 1+3 Generator Prompt

> **Purpose**: Generate LUT-compliant translations (Phase 1) AND LEGO decompositions (Phase 3) in a single pass for any language pair.

---

## Your Task

You are generating language learning content for the **{COURSE_CODE}** course where:
- **Known Language**: {KNOWN_LANG} (what the learner already speaks)
- **Target Language**: {TARGET_LANG} (what the learner is acquiring)

You will process canonical English seeds and produce:
1. **Translations** (Phase 1): Full sentence pairs in known→target direction
2. **LEGOs** (Phase 3): Chunk decompositions for each seed

---

## Critical Concept: LUT Compliance

**LUT = Learner Uncertainty Test**

The cardinal rule: **Every KNOWN chunk must map unambiguously to exactly one TARGET chunk.**

A learner seeing only the KNOWN language must be able to produce the exact TARGET output without guessing.

### Why This Matters

❌ **Bad (ambiguous):**
```
known: "to" → target: "a" OR "para" OR "de" (Spanish)
```
The learner can't know which Spanish word to produce.

✅ **Good (unambiguous with chunking):**
```
known: "want to" → target: "quiero" (forced pair, always together)
known: "going to" → target: "voy a" (forced pair)
```

### The Solution: Chunk Upward

When a word is ambiguous in isolation, **chunk it with its context** until unambiguous:
- "to" alone = ambiguous
- "want to" = unambiguous (forced pair)
- "going to" = unambiguous (forced pair)
- "have to" = unambiguous (forced pair)

---

## The Meta-Pattern Registry

You have access to `meta_pattern_registry.json` which contains language-agnostic patterns extracted from all 668 canonical seeds.

### Key Sections to Use:

**1. Forced Pairs** (`forced_pairs`)
These word sequences have >90% predictability and MUST stay together:
- `want to`, `need to`, `have to`, `going to`, `trying to`
- `able to`, `used to`, `supposed to`, `willing to`
- `would like to`, `looking forward to`
- `each other`, `as soon as`, `as much as`, `at the moment`

**2. Modal Patterns** (`modal_patterns`)
Core auxiliary structures with conjugation patterns:
- want_family, need_family, going_to_family, trying_family
- able_to_family, used_to_family, have_to_family
- should_family, could_family, can_family, might_family

**3. Chunk Size Guidance** (`chunk_size_guidance`)
- `atomic_chunks`: Small standalone units (pronouns, articles, basic prepositions)
- `forced_chunk_pairs`: Must stay together
- `chunk_up_triggers`: When to merge into larger chunks
- `lut_validation_rules`: How to validate your chunking

---

## Output Format

For each seed, produce a unified structure:

```json
{
  "seed_id": "S0001",
  "seed_pair": {
    "known": "[KNOWN_LANG sentence]",
    "target": "[TARGET_LANG sentence]"
  },
  "legos": [
    {
      "id": "S0001L01",
      "type": "A",
      "new": true,
      "lego": {
        "known": "[KNOWN chunk]",
        "target": "[TARGET chunk]"
      }
    },
    {
      "id": "S0001L02",
      "type": "M",
      "new": true,
      "lego": {
        "known": "[KNOWN compound chunk]",
        "target": "[TARGET compound chunk]"
      },
      "components": [
        {"known": "[part1]", "target": "[part1]"},
        {"known": "[part2]", "target": "[part2]"}
      ]
    }
  ],
  "lut_validated": true
}
```

### LEGO Types

- **Type A (Atomic)**: Single indivisible chunk
- **Type M (Molecular)**: Compound chunk with sub-components

### LEGO ID Convention

`S{seed_number}L{lego_number}` - e.g., `S0001L01`, `S0001L02`

---

## Step-by-Step Process

### Step 1: Analyze the Canonical Seed

Read the English source sentence and identify:
1. Which meta-patterns apply (modal? question? conditional?)
2. Which forced pairs are present
3. The semantic layer (1-6) from the registry

**Example Seed:**
```
S0001: "I want to speak {target} with you now."
```

Analysis:
- Modal pattern: `want_family`
- Forced pair: `want to`
- Layer 1: Learning conversation management

### Step 2: Generate Known Language Translation

Translate to the KNOWN language using chunk-aware methodology:
- Keep forced pairs as single conceptual units
- The known chunk must unambiguously map to the target

**For Chinese (eng_for_zho):**
```
known: "我现在想跟你说英语。"
```

Key chunk mapping:
- `想` maps to `want to` (not just "want")
- This is unambiguous because 想+verb always = want to + verb

### Step 3: Generate Target Language (Original English)

The target is the canonical English with {target} resolved:
```
target: "I want to speak English with you now."
```

### Step 4: Decompose into LEGOs

Break the sentence into chunks following LUT rules:

```json
"legos": [
  {
    "id": "S0001L01",
    "type": "A",
    "new": true,
    "lego": {"known": "我", "target": "I"}
  },
  {
    "id": "S0001L02",
    "type": "A",
    "new": true,
    "lego": {"known": "想", "target": "want to"}
  },
  {
    "id": "S0001L03",
    "type": "A",
    "new": true,
    "lego": {"known": "说", "target": "speak"}
  },
  {
    "id": "S0001L04",
    "type": "A",
    "new": true,
    "lego": {"known": "英语", "target": "English"}
  },
  {
    "id": "S0001L05",
    "type": "M",
    "new": true,
    "lego": {"known": "跟你", "target": "with you"},
    "components": [
      {"known": "跟", "target": "with"},
      {"known": "你", "target": "you"}
    ]
  },
  {
    "id": "S0001L06",
    "type": "A",
    "new": true,
    "lego": {"known": "现在", "target": "now"}
  }
]
```

### Step 5: LUT Validation

For each LEGO, verify:
- Can a native {KNOWN_LANG} speaker produce exactly the {TARGET_LANG} chunk?
- Is there any ambiguity? If yes, chunk upward.

---

## Language-Specific Chunk Mappings

Define these for your target course:

### For Chinese → English (eng_for_zho):
```
想 + verb       → want to + verb
要 + verb       → going to + verb
在试着 + verb   → trying to + verb
需要 + verb     → need to + verb
能够/能 + verb  → be able to + verb
可以 + verb     → can + verb
应该 + verb     → should + verb
必须 + verb     → have to + verb
以前常 + verb   → used to + verb
期待 + verb     → looking forward to + verb
想要 + verb     → would like to + verb
```

### For Spanish → English (eng_for_spa):
```
quiero + inf    → want to + verb
voy a + inf     → going to + verb
estoy tratando  → trying to + verb
necesito + inf  → need to + verb
puedo + inf     → can + verb
debería + inf   → should + verb
tengo que + inf → have to + verb
solía + inf     → used to + verb
```

### For French → English (eng_for_fra):
```
veux + inf      → want to + verb (je veux parler = I want to speak)
vais + inf      → going to + verb (je vais parler = I'm going to speak)
essaie de + inf → trying to + verb (j'essaie de parler = I'm trying to speak)
ai besoin de    → need to + verb
peux + inf      → can + verb
dois + inf      → have to + verb / must + verb
avais l'habitude de → used to + verb
comment + inf   → how to + verb (comment parler = how to speak)
ne...pas        → not (wraps verb, chunk as unit with verb)
se souvenir de  → remember (reflexive → simple English)
```

---

## Detailed French Example (eng_for_fra)

Here's a complete worked example showing how grammatical asymmetries are handled:

**Seed S0006:** `"I'm trying to remember a word."`

### Step 1: Translate to French (KNOWN)
```
J'essaie de me souvenir d'un mot.
```

### Step 2: Identify Asymmetries
- French uses reflexive `se souvenir de` for "remember"
- French requires `de` before infinitive with `essayer`
- Elision: `Je` → `J'`, `de un` → `d'un`

### Step 3: LEGO Decomposition
```json
{
  "seed_id": "S0006",
  "seed_pair": {
    "known": "J'essaie de me souvenir d'un mot.",
    "target": "I'm trying to remember a word."
  },
  "legos": [
    {
      "id": "S0006L01",
      "type": "A",
      "new": false,
      "lego": {"known": "Je", "target": "I"},
      "note": "J' is elided form of Je - same LEGO"
    },
    {
      "id": "S0006L02",
      "type": "A",
      "new": false,
      "lego": {"known": "essaie de", "target": "'m trying to"},
      "note": "French essayer de + inf = English trying to + verb"
    },
    {
      "id": "S0006L03",
      "type": "A",
      "new": true,
      "lego": {"known": "me souvenir de", "target": "remember"},
      "note": "Reflexive se souvenir de → simple English remember"
    },
    {
      "id": "S0006L04",
      "type": "M",
      "new": true,
      "lego": {"known": "un mot", "target": "a word"},
      "components": [
        {"known": "un", "target": "a"},
        {"known": "mot", "target": "word"}
      ],
      "note": "d'un is elided de+un - track as 'un'"
    }
  ]
}
```

### Key Decisions Explained:
1. **Elision handling**: `J'` and `Je` are the SAME LEGO (track canonical form `Je`)
2. **Reflexive collapse**: `me souvenir de` → `remember` (3 French words → 1 English word)
3. **Preposition absorption**: `de` in `essaie de` is part of the modal, not separate

---

## Handling Grammatical Asymmetries

### 1. Elision (French, Italian)
When vowels contract (`je` → `j'`, `de` → `d'`):
- Track the **canonical (non-elided) form** in your registry
- Both `Je` and `J'` count as the SAME LEGO
- Example: `{"known": "Je", "target": "I"}` covers both `Je parle` and `J'aime`

### 2. Reflexive Verbs → Simple Verbs
Many Romance language reflexives map to simple English:
```
French:  se souvenir de → remember
Spanish: acordarse de   → remember
French:  s'appeler      → be called
Spanish: llamarse       → be called
```
**Rule**: Chunk the entire reflexive construction as ONE atomic LEGO.

### 3. Negation Patterns
French `ne...pas` wraps the verb:
```
French:  Je ne veux pas → I don't want
```
**Options**:
- Chunk `ne...pas` WITH the verb: `{"known": "ne veux pas", "target": "don't want"}`
- Or track separately if reuse is high: `{"known": "ne...pas", "target": "not/don't"}`

**Recommendation**: Chunk with verb for cleaner LUT compliance.

### 4. Preposition Attachment Differences
French often requires prepositions where English doesn't:
```
French:  essayer DE faire → try TO do
French:  commencer À faire → start TO do
Spanish: empezar A hacer  → start TO do
```
**Rule**: Include the preposition with the governing verb in the KNOWN chunk.

### 5. Word Order Differences
When KNOWN language has different word order:
```
French:  "Je le veux" (I it want) → "I want it"
German:  "Ich will es" (I want it) → "I want it"
```
**Rule**: Chunk so the learner can reconstruct the TARGET order. May need larger chunks.

---

## Verb Form Handling

### Conjugated Forms vs. Infinitives

**Question**: Are `parle` (conjugated) and `parler` (infinitive) the same LEGO?

**Answer**: They are DIFFERENT LEGOs because they map to different English forms:
- `parler` → `to speak` / `speak` (infinitive context)
- `parle` → `speak` (present tense, 1st person)
- `parles` → `speak` (present tense, 2nd person - same English!)
- `parlons` → `speak` (present tense, 1st plural - same English!)

**Registry tracking**: Track by the **known+target PAIR**:
```json
{
  "parler|to speak": "S0001L03",
  "parle|speak": "S0009L02",
  "parles|speak": "S0013L02"
}
```

**Important**: Even if the TARGET is the same (`speak`), different KNOWN forms are separate LEGOs because they represent different grammatical knowledge.

---

## Sentence Fragments

Some canonical seeds are fragments (S0003, S0004):
```
S0003: "how to speak as often as possible."
S0004: "how to say something in {target}"
```

### Handling Fragments:
1. Translate the fragment naturally (no need to add subject)
2. Mark with `"fragment": true` in output
3. LEGOs are extracted the same way

**Example**:
```json
{
  "seed_id": "S0003",
  "fragment": true,
  "seed_pair": {
    "known": "comment parler aussi souvent que possible.",
    "target": "how to speak as often as possible."
  },
  "legos": [...]
}
```

---

## Type A vs Type M: Decision Criteria

### Use Type A (Atomic) when:
- The chunk is a single conceptual unit that shouldn't be split
- The components have NO independent pedagogical value
- Examples: `想` → `want to`, `se souvenir de` → `remember`

### Use Type M (Molecular) when:
- Both the compound AND its parts are useful for learning
- The learner benefits from seeing the breakdown
- Components appear independently elsewhere in the curriculum

**Test**: Would teaching the components separately help the learner?
- Yes → Type M with components
- No → Type A

**Example Decision**:
```
"avec toi" (with you) → Type M
  - "avec" appears in many contexts
  - "toi" appears independently
  - Both are useful LEGOs on their own

"se souvenir de" (remember) → Type A
  - "se", "souvenir", "de" are NOT useful separately
  - Learner needs to know this as one unit
```

---

## LEGO Registry: What to Track

Track LEGOs by the **KNOWN + TARGET pair**, not just one side:

```json
lego_registry = {
  "Je|I": {"first": "S0001L01", "count": 45},
  "veux|want to": {"first": "S0001L02", "count": 12},
  "parler|speak": {"first": "S0001L03", "count": 8},
  "parle|speak": {"first": "S0009L02", "count": 3},
  ...
}
```

**Why both sides?**
- Same KNOWN can map to different TARGETs in different contexts
- Same TARGET can come from different KNOWN forms
- The pair is what the learner actually practices

---

## Tracking New vs. Reused LEGOs

A LEGO is `"new": true` if this is its first occurrence across all seeds.
A LEGO is `"new": false` if it appeared in an earlier seed.

Maintain a registry as you process:
```
lego_registry = {
  "want to": "S0001L02",  // first seen in S0001
  "I": "S0001L01",
  "now": "S0001L06",
  ...
}
```

When you encounter "want to" again in S0005, mark it as:
```json
{"id": "S0005L02", "type": "A", "new": false, "lego": {"known": "想", "target": "want to"}}
```

---

## Final Output Structure

Generate two files:

### 1. seed_pairs.json (Phase 1)
```json
{
  "version": "1.0.0",
  "course": "{COURSE_CODE}",
  "target_language": "{TARGET_LANG_CODE}",
  "known_language": "{KNOWN_LANG_CODE}",
  "methodology": "Unified Phase 1+3 with LUT compliance",
  "chunk_mappings": {
    "[KNOWN pattern]": "[TARGET pattern]",
    ...
  },
  "translations": {
    "S0001": {"known": "...", "target": "..."},
    "S0002": {"known": "...", "target": "..."},
    ...
  }
}
```

### 2. lego_pairs.json (Phase 3)
```json
{
  "course": "{COURSE_CODE}",
  "methodology": "Unified Phase 1+3 - LUT Compliant LEGOs",
  "phase": "3",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {"known": "...", "target": "..."},
      "legos": [...]
    },
    ...
  ]
}
```

---

## Quality Checklist

Before finalizing, verify:

- [ ] All 668 seeds are processed
- [ ] Every forced pair from meta_pattern_registry is kept together
- [ ] No known chunk maps to multiple target chunks (LUT violation)
- [ ] LEGO IDs are sequential and unique
- [ ] New/reused tracking is consistent
- [ ] Type A vs Type M is correctly assigned
- [ ] Molecular LEGOs have valid components

---

## Common Pitfalls to Avoid

1. **Splitting forced pairs**: "want" and "to" as separate LEGOs = WRONG
2. **Ambiguous chunks**: Single prepositions that could mean multiple things
3. **Over-chunking**: Breaking into too many tiny pieces
4. **Under-chunking**: Making chunks so large they're not reusable
5. **Inconsistent chunking**: Same phrase chunked differently across seeds
6. **Forgetting word order**: Some languages have different syntax - chunk so learner can reconstruct

---

## Getting Started

1. Read `canonical_seeds.json` for the 668 source sentences
2. Read `meta_pattern_registry.json` for patterns and forced pairs
3. Define your language-specific chunk mappings
4. Process seeds in order (S0001 → S0668)
5. Track new vs. reused LEGOs as you go
6. Output both seed_pairs.json and lego_pairs.json

Good luck! Keep the LUT compliance tight and the chunks meaningful.

---

## Appendix A: Germanic Languages (German, Dutch)

### Separable Verbs

German/Dutch have separable prefix verbs that split in main clauses:
```
anfangen (to start) → Ich fange morgen an (I start tomorrow)
mitnehmen (to take along) → Ich nehme es mit (I take it along)
aufhören (to stop) → Hör auf! (Stop!)
```

**Rule**: Keep separable verbs as ONE atomic LEGO with the full infinitive form:
```json
{
  "lego": {"known": "anfangen", "target": "start"},
  "note": "Separable: prefix 'an' moves to clause end in main clauses"
}
```

The learner learns `anfangen = start` as a unit. The splitting is a German grammar rule they apply.

### Case System Handling

German has 4 cases that change articles and adjective endings:
```
Nominative: der ganze Satz (the whole sentence - subject)
Accusative: den ganzen Satz (the whole sentence - direct object)
Dative: dem ganzen Satz (the whole sentence - indirect object)
Genitive: des ganzen Satzes (of the whole sentence)
```

**Strategy**: Track by **base form** with case annotation:
```json
lego_registry = {
  "der/ein Satz|the/a sentence": {"first": "S0010L07", "cases_seen": ["acc"]},
  ...
}
```

For LEGOs:
- Use Type M when case marking is pedagogically important
- Include case in the `note` field
- Components show the base mapping

**Example**:
```json
{
  "id": "S0010L07",
  "type": "M",
  "lego": {"known": "den ganzen Satz", "target": "the whole sentence"},
  "components": [
    {"known": "der/den/dem", "target": "the"},
    {"known": "ganz-", "target": "whole"},
    {"known": "Satz", "target": "sentence"}
  ],
  "note": "Accusative case (direct object)"
}
```

### Verb-Final in Subordinate Clauses

German subordinate clauses place the verb at the END:
```
Main: Ich kann den Satz erinnern (I can remember the sentence)
Subordinate: ...ob ich den Satz erinnern kann (...if I can remember the sentence)
```

**Strategy**: Chunk subordinate clauses more aggressively:
```json
{
  "lego": {"known": "ob ich...kann", "target": "if I can"},
  "note": "Subordinate clause - verb 'kann' at end in German"
}
```

Or track the conjunction separately and note the word order shift:
```json
[
  {"lego": {"known": "ob", "target": "if"}, "triggers": "verb-final"},
  {"lego": {"known": "ich kann", "target": "I can"}, "note": "Position shifts in subordinate"}
]
```

### Modal + Infinitive at End

German modals place the infinitive at clause end:
```
English: I want to speak English with you now.
German: Ich will jetzt mit dir Englisch sprechen.
         (I want now with you English speak)
```

**Strategy**: Track word order in `grammar_notes` but keep LEGOs focused on meaning pairs:
- `will` → `want to` (modal mapping)
- `sprechen` → `speak` (infinitive)

The word order reconstruction is a grammar skill, not a LEGO concern.

### Formal/Informal Pronouns (du/Sie)

German has T-V distinction:
```
Informal: mit dir (with you - singular familiar)
Formal: mit Ihnen (with you - singular/plural formal)
Plural informal: mit euch (with you all)
```

**Strategy**: Use unified LEGO with register tag:
```json
{
  "lego": {"known": "du/Sie", "target": "you"},
  "register": "informal: du, dich, dir | formal: Sie, Sie, Ihnen"
}
```

Or track separately if the course emphasizes register:
```json
lego_registry = {
  "dir|you": {"first": "S0001L05", "register": "informal"},
  "Ihnen|you": {"first": "S0639L05", "register": "formal"}
}
```

### Compound Nouns

German creates compounds freely:
```
Fremdsprache = foreign language (Fremd + Sprache)
Sprachkenntnisse = language skills (Sprach + Kenntnisse)
```

**Rule**: Keep meaningful compounds as atomic LEGOs:
```json
{
  "lego": {"known": "Fremdsprache", "target": "foreign language"},
  "type": "A",
  "note": "German compound: Fremd(foreign) + Sprache(language)"
}
```

Only use Type M if both components appear independently elsewhere in the curriculum.

---

## Appendix B: Impersonal Constructions

### "How to" Equivalents

Different languages express "how to [verb]" differently:

| Language | Construction | Example |
|----------|--------------|---------|
| German | wie man + conjugated verb | wie man spricht (how one speaks) |
| French | comment + infinitive | comment parler |
| Spanish | cómo + infinitive | cómo hablar |
| Chinese | 怎么 + verb | 怎么说 |

**Rule**: Map the full construction to "how to":
```json
{"known": "wie man", "target": "how to"}  // German
{"known": "comment", "target": "how to"}  // French
{"known": "怎么", "target": "how to"}      // Chinese
```

### Impersonal "Man" (German) / "On" (French)

These require conjugated verbs even when English uses infinitive:
```
German: wie man es sagt (how one says it) → how to say it
French: comment on le dit (how one says it) → how to say it
```

**Strategy**: Chunk "wie man" / "comment on" as the "how to" equivalent.

---

## Appendix C: Negation Patterns

### Split Negation

Some languages split negation around the verb:

| Language | Pattern | Example |
|----------|---------|---------|
| French | ne...pas | Je ne veux pas (I don't want) |
| German | nicht (position varies) | Ich will nicht (I don't want) |

**French Rule**: Chunk with the verb for clean LUT:
```json
{"known": "ne veux pas", "target": "don't want"}
```

**German Rule**: German `nicht` has flexible position. Options:
1. Chunk with verb: `{"known": "will nicht", "target": "don't want"}`
2. Keep separate if `nicht` position is pedagogically important

### Negative Articles

German `kein` and French `ne...pas de` replace articles in negation:
```
German: Ich habe ein Buch → Ich habe kein Buch (I don't have a book)
French: J'ai un livre → Je n'ai pas de livre (I don't have a book)
```

**Rule**: Track negative article forms as separate LEGOs:
```json
{"known": "kein", "target": "no / not a"}  // German
{"known": "pas de", "target": "no / not any"}  // French
```

---

## Appendix D: Japanese/Korean (SOV + Agglutinative)

Japanese and Korean represent a fundamentally different typological profile from European languages. This appendix is REQUIRED reading for eng_for_jpn or eng_for_kor courses.

### Key Typological Differences

| Feature | Japanese/Korean | English | Impact |
|---------|-----------------|---------|--------|
| Word Order | SOV | SVO | Complete reordering needed |
| Prepositions | Postpositions (noun + particle) | Prepositions (prep + noun) | Position reversal |
| Articles | NONE | a, an, the | Must ADD in English |
| Subject | Often dropped | Required | Must INFER and supply |
| Plurals | Not grammatical | Required | Must INFER plurality |
| Modals | Verb suffixes | Separate words | Suffix → word mapping |

### SOV → SVO Transformation

```
Japanese: 私は 英語を あなたと 話したい
          (I-TOP English-OBJ you-with speak-want)

English:  I want to speak English with you
          (SUBJ MODAL VERB OBJ PREP-PHRASE)
```

**Strategy**: LEGOs focus on MEANING pairs, not position. Word order reconstruction is a grammar skill.

### Japanese Modal Verb Suffix Mappings

Japanese expresses modality through verb endings, not separate words:

```
〜たい (-tai)              → want to
〜ようとしている (-you to shiteiru) → 'm trying to
〜つもりだ (-tsumori da)    → 'm going to
〜ことができる (-koto ga dekiru) → can / be able to
〜なければならない (-nakereba naranai) → have to / must
〜べきだ (-beki da)         → should
〜かもしれない (-kamo shirenai) → might
〜ことができた (-koto ga dekita) → was able to / could
```

**Example LEGO**:
```json
{
  "lego": {"known": "〜たい", "target": "want to"},
  "type": "A",
  "note": "Japanese desiderative suffix - attaches to verb stem"
}
```

### Particle Absorption Rules

Japanese particles mark grammatical relations but have NO English equivalents:

| Particle | Function | English Handling |
|----------|----------|------------------|
| は (wa) | Topic marker | ABSORB - no English equivalent |
| が (ga) | Subject marker | ABSORB - word order indicates subject |
| を (wo) | Object marker | ABSORB - word order indicates object |
| に (ni) | Direction/recipient | "to", "at", "in" (context-dependent) |
| で (de) | Means/location | "with", "at", "by" (context-dependent) |
| と (to) | Accompaniment | "with", "and" |
| の (no) | Possessive/connector | "'s", "of" |

**Rule**: Chunk particles WITH their noun phrases:
```json
// Good - particle absorbed
{"known": "あなたと", "target": "with you"}

// Bad - particle orphaned
{"known": "と", "target": "with"}  // LUT violation - と alone is ambiguous
```

**Exception**: Particles に, で, と can sometimes stand alone IF context is unambiguous.

### Handling Dropped Subjects (Pro-Drop)

Japanese frequently omits subjects:
```
Japanese: 学ぼうとしています。 (Trying to learn.)
English: I'm trying to learn. (Subject required!)
```

**Rule**: When Japanese drops the subject:
1. The English LEGO for the pronoun IS included in the target
2. Add `"inferred": true` to the LEGO
3. Document the inference logic

```json
{
  "lego": {"known": "[dropped]", "target": "I"},
  "type": "A",
  "inferred": true,
  "note": "Japanese pro-drop - subject inferred from context/verb form"
}
```

### Article Insertion

Japanese has NO articles. English requires them.

**Heuristics for adding a/an/the**:
- First mention, countable, singular → "a" or "an"
- Previously mentioned or unique → "the"
- Generic reference → often no article OR "the"
- Proper nouns → no article

**LEGO Strategy**: Chunk article WITH noun:
```json
{
  "lego": {"known": "言葉", "target": "a word"},
  "type": "M",
  "components": [
    {"known": "[no article]", "target": "a"},
    {"known": "言葉", "target": "word"}
  ],
  "note": "Article added - Japanese has no articles"
}
```

Or use atomic LEGO if article choice is formulaic:
```json
{
  "lego": {"known": "言葉", "target": "a word"},
  "type": "A",
  "note": "Article 'a' added (generic countable noun)"
}
```

### Nominalization (Gerunds)

Japanese uses こと or の for nominalization:
```
Japanese: 話すこと (speaking / to speak)
English: speaking
```

**Mapping**:
```json
{
  "lego": {"known": "話すこと", "target": "speaking"},
  "type": "A",
  "note": "こと nominalization → English gerund"
}
```

### "How To" in Japanese

Japanese doesn't have a direct "how to" construction. It uses:
- 〜方 (-kata): "way of doing" → how to
- 〜方法 (houhou): "method" → how to

```json
{
  "lego": {"known": "言い方", "target": "how to say"},
  "type": "A",
  "note": "Japanese 言い方 (ii-kata) = way of saying"
}
```

### Japanese Worked Example

**Seed S0006**: `"I'm trying to remember a word."`

```
Japanese: 私は言葉を思い出そうとしています。
          watashi-wa kotoba-wo omoidasou-to-shiteimasu
          I-TOP word-OBJ remember-try-PROG
```

**LEGO Decomposition**:
```json
{
  "seed_id": "S0006",
  "seed_pair": {
    "known": "私は言葉を思い出そうとしています。",
    "target": "I'm trying to remember a word."
  },
  "legos": [
    {
      "id": "S0006L01",
      "type": "A",
      "lego": {"known": "私は", "target": "I"},
      "note": "Topic marker は absorbed"
    },
    {
      "id": "S0006L02",
      "type": "A",
      "lego": {"known": "〜ようとしている", "target": "'m trying to"},
      "note": "Volitional + している = trying to (grammatical construction)"
    },
    {
      "id": "S0006L03",
      "type": "A",
      "lego": {"known": "思い出す", "target": "remember"},
      "note": "Base verb - appears as 思い出そう in volitional form"
    },
    {
      "id": "S0006L04",
      "type": "M",
      "lego": {"known": "言葉を", "target": "a word"},
      "components": [
        {"known": "[no article]", "target": "a"},
        {"known": "言葉", "target": "word"},
        {"known": "を", "target": "[object marker - absorbed]"}
      ],
      "note": "を particle absorbed; article 'a' added"
    }
  ]
}
```

### Politeness Register

Japanese has multiple politeness levels:

| Level | Example | When to Use |
|-------|---------|-------------|
| Plain/Dictionary | 話す (hanasu) | Default for LEGOs |
| Polite (-masu) | 話します (hanashimasu) | Formal contexts |
| Humble/Honorific | お話しする (ohanashi suru) | Very formal |

**Recommendation**: Use **plain/dictionary form** for LEGO known values. It's the base form learners encounter in dictionaries.

---

## Appendix E: Article-Less → Article Languages

When the KNOWN language lacks articles but TARGET language requires them:

### Languages Without Articles
- Japanese, Korean, Chinese, Russian, Polish, Czech, Hindi, Turkish, etc.

### Insertion Heuristics

| Context | Insert | Example |
|---------|--------|---------|
| First mention, singular countable | a/an | "I want a book" |
| Previously mentioned | the | "Give me the book" |
| Unique referent | the | "the sun, the answer" |
| Generic category | ∅ or the | "I like (∅) music" / "The tiger is endangered" |
| Proper nouns | ∅ | "I speak Japanese" |
| Mass nouns | ∅ | "I drink water" |

### LEGO Strategy

**Option 1: Atomic with note**
```json
{"known": "本", "target": "a book", "note": "Article 'a' added (countable, first mention)"}
```

**Option 2: Molecular showing insertion**
```json
{
  "known": "本",
  "target": "a book",
  "type": "M",
  "components": [
    {"known": "[∅]", "target": "a"},
    {"known": "本", "target": "book"}
  ]
}
```

**Recommendation**: Use Option 1 (Atomic) for cleaner LEGOs. The note documents the insertion.

---

## Version History

- **v1.0**: Initial prompt with Chinese and Spanish examples
- **v2.0**: Added French worked example, grammatical asymmetries section
- **v2.1**: Added Germanic language appendix, case handling, separable verbs, subordinate clause guidance
- **v2.2**: Added Japanese/Korean appendix (SOV, agglutinative, particles, pro-drop), article-less language handling
