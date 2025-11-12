# Phase 3 Language-Specific Insights
## Comparative Analysis: Italian, Spanish, French, Mandarin

**Date:** 2025-10-15
**Analysis Scope:** 30 seeds per language (120 total)
**Purpose:** Document unique linguistic challenges and patterns per language

---

## Executive Summary

Each language presents unique structural challenges for LEGO decomposition. This analysis identifies:
- **Common Romance patterns** (Italian, Spanish, French)
- **Mandarin's distinct patterns** (Sino-Tibetan differences)
- **Language-specific teaching opportunities**
- **Cross-linguistic insights for course design**

**Key Finding:** While Romance languages show 96.7% structural consistency, each has unique features that affect optimal LEGO decomposition. Mandarin requires fundamentally different decomposition strategies.

---

## ITALIAN (Italiano)

### Language Family
**Romance** (Italic branch, Indo-European)

### Typology
- **Word Order:** SVO (Subject-Verb-Object) with flexibility
- **Pro-Drop:** YES (null-subject language)
- **Gender:** 2 genders (masculine, feminine)
- **Articles:** Definite and indefinite with gender/number agreement

### Unique Characteristics for LEGO Decomposition

#### 1. Null-Subject Advantage

**Feature:** Italian allows subject pronoun omission

**Examples:**
- `Voglio parlare` / `I want to speak` (S0001L01+L02)
- `Parlo italiano` / `I speak Italian` (S0009L01+L02)

**LEGO Impact:**
- First-person conjugations are inherently FD (`Voglio` = "I want", unambiguous)
- Can create smaller LEGOs than French (which requires explicit `Je`)
- Third-person still requires gender-neutral English (`Vuole` = "Wants", not "He wants")

**Teaching Opportunity:** Learners see that Italian verb conjugations carry person/number, making pronouns optional.

---

#### 2. Periphrastic Future with "Sto per"

**Feature:** Imminent future using `Sto per` + infinitive

**Examples:**
- `Sto per praticare` / `I'm going to practice` (S0005L01+L02)
- `Sto per cercare` / `I'm going to try` (S0008L01+L02)

**LEGO Impact:**
- `Sto per` must be kept as single LEGO (grammaticalized marker)
- Ends with glue word `per` but acceptable (fixed expression)
- Different from Spanish `Voy a` structure

**Pattern:** `Sto` (I am) + `per` (for/to, grammaticalized) = imminent future

**Teaching Opportunity:** Shows grammaticalization - `per` doesn't mean "for" here, it's part of the future marker.

---

#### 3. Hierarchical Build-Up Preference

**Feature:** Italian decompositions tend to include more hierarchical LEGO layering

**Example from S0005:**
- L04: `qualcuno` / `someone` (base)
- L05: `altro` / `else` (base)
- L06: `qualcun altro` / `someone else` (L04+L05 composite)
- L07: `con qualcun altro` / `with someone else` (preposition + L06)

**Comparison:**
- Italian S0005: 7 total LEGOs (including hierarchical build-ups)
- Spanish S0005: 5 total LEGOs (simpler structure)
- French S0005: 5 total LEGOs (simpler structure)

**LEGO Impact:**
- More pedagogical scaffolding
- Shows how synthetic forms build from components
- Tiling test must account for this (only use BASE LEGOs)

**Teaching Opportunity:** Italian's hierarchical structure helps learners see morphological composition (`qualcun` = `qualcuno` shortened before vowel).

---

#### 4. Preposition + Article Contractions

**Feature:** Mandatory contractions of prepositions with articles

**Examples:**
- `di + il` = `del` ("of the")
- `a + il` = `al` ("to the")
- `in + il` = `nel` ("in the")
- `con + il` = `col` (informal, "with the")

**LEGO Impact:**
- Contractions should remain intact in LEGOs
- Don't decompose `del` into `di` + `il` (loses naturalness)
- Example: `un po' di italiano` / `a little Italian` (S0009L02)

**Teaching Opportunity:** Shows that preposition + article fusions are atomic units in Italian.

---

#### 5. Progressive Aspect: "Sto + gerund"

**Feature:** Present progressive using `stare` + gerund

**Examples:**
- `Sto cercando di imparare` / `I'm trying to learn` (S0002L01)
- `stai imparando` / `are you learning` (S0021L02)

**Pattern:** `Sto/stai/sta` (to be) + verb-`ando`/`-endo` (gerund)

**LEGO Impact:**
- Keep entire progressive phrase together for FD
- Bare gerund fails FD (`cercando` alone = multiple meanings)
- Different from Spanish `estar + -ando/-iendo`

---

### Italian-Specific Challenges

**1. Reflexive Pronoun Positions:**
- `sentirmi` / `feeling` (S0026L02) - pronoun attached to infinitive
- `mi piace` / `I like` (S0026L01) - pronoun before verb
- LEGO must include pronoun for FD

**2. Double Negatives:**
- `Non... mai` / `never` (not in 30-seed set, but common)
- Would need to chunk entire negative scope

**3. Subjunctive Triggers:**
- `dopo che finisci` / `after you finish` (S0011L04)
- Uses indicative here, but subjunctive common in other contexts
- LEGO size affected by mood requirements

---

## SPANISH (Español)

### Language Family
**Romance** (Italic branch, Indo-European)

### Typology
- **Word Order:** SVO with flexibility
- **Pro-Drop:** YES (null-subject language)
- **Gender:** 2 genders (masculine, feminine)
- **Articles:** Definite and indefinite with gender/number agreement

### Unique Characteristics for LEGO Decomposition

#### 1. Periphrastic Future with "Voy a"

**Feature:** Near future using `ir a` + infinitive

**Examples:**
- `Voy a practicar` / `I'm going to practice` (S0005L01+L02)
- `Voy a tratar` / `I'm going to try` (S0008L01+L02)

**LEGO Impact:**
- `Voy a` kept as single LEGO (grammaticalized future marker)
- Ends with glue word `a` but acceptable (fixed expression)
- Parallel to Italian `Sto per` but more common in Spanish

**Pattern:** `Voy/Vas/Va` (to go) + `a` (to, grammaticalized) = near future

**Difference from Italian:**
- Spanish uses "going" metaphor
- Italian uses "being for" metaphor
- Both grammaticalized - `a` and `per` are not prepositions here

---

#### 2. "Estar + gerund" Progressive

**Feature:** Present progressive using `estar` + gerund

**Examples:**
- `Estoy tratando de aprender` / `I'm trying to learn` (S0002L01)
- `estás aprendiendo` / `are you learning` (S0021L02)

**Pattern:** `Estoy/estás/está` + verb-`ando`/`-iendo`

**LEGO Impact:**
- Parallel to Italian structure
- Must keep together for FD
- Distinguishes from simple present

---

#### 3. "Me gustaría" (Conditional of "gustar")

**Feature:** Inverted structure for "I would like"

**Examples:**
- `Me gustaría poder hablar` / `I'd like to be able to speak` (S0011L01)
- `No me gustaría adivinar` / `I wouldn't like to guess` (S0012L01)

**LEGO Impact:**
- `Me gustaría` must be single LEGO
- Literal: "To me it would please"
- English translation context-adapted for FD

**Pattern:** Reflexive pronoun `me` + conditional of `gustar`

**Teaching Opportunity:** Shows Spanish's inverted "pleasing" construction vs. English "liking".

---

#### 4. Prepositional Pronouns

**Feature:** Special forms with prepositions

**Examples:**
- `contigo` / `with you` (S0001L04) - fused form
- `conmigo` / `with me` (S0015L03) - fused form

**LEGO Impact:**
- Keep fused forms intact
- `con + ti` → `contigo` (irregular fusion)
- Different from Italian `con te` (separate words)

**Teaching Opportunity:** Spanish has special prepositional pronoun fusions that Italian doesn't.

---

#### 5. Simpler LEGO Structure

**Feature:** Spanish decompositions tend to be flatter than Italian

**Example S0005:**
- Spanish: 5 total LEGOs (L01, L02, L04, L05)
- Italian: 7 total LEGOs (L01, L02, L04, L05, L06, L07)

**LEGO Impact:**
- Less hierarchical build-up
- More direct decomposition
- May reflect teaching philosophy or language structure

**Observation:** Spanish seems to favor showing complete phrases rather than intermediate build-ups.

---

### Spanish-Specific Challenges

**1. Subjunctive Mood Triggers:**
- `quiero que hables` / `I want you to speak` (S0015L01)
- Subjunctive `hables` triggered by `quiero que`
- Must keep trigger + subjunctive together

**2. Reflexive Verb Nuances:**
- Some verbs change meaning with reflexive pronouns
- Example: `ir` = "to go" vs. `irse` = "to leave/go away"
- LEGOs must include reflexive when meaning changes

**3. Two-Word Interrogatives:**
- `Por qué` / `Why` (S0021L01) - two words in Spanish
- `Pourquoi` / `Why` (French) - one word
- `Perché` / `Why` (Italian) - one word

---

## FRENCH (Français)

### Language Family
**Romance** (Italic branch, Indo-European)

### Typology
- **Word Order:** SVO (more rigid than Italian/Spanish)
- **Pro-Drop:** NO (requires explicit subject pronouns)
- **Gender:** 2 genders (masculine, feminine)
- **Articles:** Definite and indefinite with complex liaison rules

### Unique Characteristics for LEGO Decomposition

#### 1. Mandatory Subject Pronouns

**Feature:** French REQUIRES explicit subject pronouns (not pro-drop)

**Examples:**
- `Je veux parler` / `I want to speak` (S0001L01)
- `Je vais m'entraîner` / `I'm going to practice` (S0005L01)
- `J'essaie d'apprendre` / `I'm trying to learn` (S0002L01)

**LEGO Impact:**
- LEGOs must ALWAYS include subject pronoun
- Larger LEGOs than Italian/Spanish equivalents
- `Je veux` = single LEGO (not split)

**Comparison:**
- French: `Je veux` / `I want` (2 words, 1 LEGO)
- Italian: `Voglio` / `I want` (1 word, 1 LEGO)
- Spanish: `Quiero` / `I want` (1 word, 1 LEGO)

**FD Justification:** `veux` alone fails FD (could be "you want", "I want", etc. - person ambiguous).

---

#### 2. Two-Part Negation

**Feature:** French uses `ne...pas` for negation

**Examples:**
- `je ne veux pas` / `I don't want` (S0019L01)
- `Je ne suis pas sûr` / `I'm not sure` (S0010L01)
- `Je n'aimerais pas` / `I wouldn't like` (S0012L01)

**LEGO Impact:**
- Must include entire negative scope
- `ne` and `pas` surround verb - keep as unit
- Sometimes `ne` elided: `J'essaie` not `Je n'essaie`

**Pattern:** Subject + `ne` + verb + `pas`

**Teaching Opportunity:** Shows French's discontinuous negation (unlike Italian/Spanish simple `no/non` prefix).

---

#### 3. Periphrastic Future with "aller"

**Feature:** Near future using `aller` + infinitive

**Examples:**
- `Je vais m'entraîner` / `I'm going to practice` (S0005L01)
- `tu vas parler` / `you're going to speak` (S0008L01)

**LEGO Impact:**
- Subject + `vais/vas/va` = single LEGO
- Parallel to Spanish `Voy a`
- NO glue word at end (unlike Spanish `a`)

**Pattern:** `Je vais` / `tu vas` / `il va` + infinitive

---

#### 4. Pronoun Elision and Apostrophes

**Feature:** Frequent elision before vowels

**Examples:**
- `J'essaie` (← `Je essaie`)
- `m'entraîner` (← `me entraîner`)
- `d'apprendre` (← `de apprendre`)
- `quelqu'un` (← `quelque un`)

**LEGO Impact:**
- Keep elided forms intact - don't expand
- `J'essaie d'apprendre` = entire phrase
- Apostrophe is part of orthography, not decomposition point

---

#### 5. Reflexive Pronoun Flexibility

**Feature:** Reflexive pronouns integral to many verbs

**Examples:**
- `me souvenir` / `to remember` (S0006F02)
- `me sentir` / `feeling` (S0026L02)
- `m'entraîner` / `to practice` (S0005F01)

**LEGO Impact:**
- Reflexive pronoun must stay with verb
- `souvenir` alone doesn't mean "remember" - needs `se/me`
- Different from Spanish where some verbs work with/without reflexive

**Pattern:** Many common French verbs are inherently reflexive.

---

### French-Specific Challenges

**1. Liaison Complexity:**
- Affects pronunciation but not always orthography
- LEGOs should respect orthographic boundaries
- Liaison happens in speech but isn't marked in text

**2. Subjunctive Triggers:**
- `après que tu aies fini` / `after you finish` (S0011L04)
- Subjunctive required in subordinate clauses
- Must keep trigger + subjunctive together

**3. Gender Agreement:**
- Past participles agree with preceding direct objects
- Affects how some constructions decompose
- Not prominent in 30-seed set (mostly present tense)

**4. Partitive Article:**
- `de` / `d'` as partitive ("some")
- Can be confused with preposition `de` ("of")
- Example: `un peu de` / `a little` (partitive)

---

## MANDARIN (中文 / 普通话)

### Language Family
**Sino-Tibetan** (Sinitic branch)

### Typology
- **Word Order:** SVO (but topic-prominent)
- **Pro-Drop:** YES (but context-dependent)
- **Gender:** NO grammatical gender
- **Articles:** NO articles

### Unique Characteristics for LEGO Decomposition

#### 1. Topic-Comment Structure

**Feature:** Topic-prominent language (not just subject-prominent)

**LEGO Impact:**
- Word order more flexible than Romance languages
- Topic often fronted, affects decomposition
- Example structures may not parallel Romance SVO

**Teaching Opportunity:** Shows fundamentally different information structure compared to Romance languages.

---

#### 2. Lack of Inflection

**Feature:** No verb conjugation, no noun pluralization, no gender

**Examples:**
- `我想` / `I want` (S0001L01)
- `你想` / `You want` (S0020L01)
- Same verb `想` (to want), person indicated by pronoun

**LEGO Impact:**
- Subject pronoun REQUIRED for FD (no conjugation to indicate person)
- More similar to French requirement than Italian/Spanish
- Simpler morphology = different decomposition challenges

**FD Justification:**
- `想` alone could be "want", "wants", "think" - needs subject
- `我想` is FD = "I want"

---

#### 3. Aspect Markers Integral to Verbs

**Feature:** Aspect particles (`了`, `着`, `过`) modify verb meaning

**Examples:**
- `在试着学` / `trying to learn` (S0002L01)
- `着` indicates progressive aspect

**LEGO Impact:**
- Aspect markers stay with verbs
- Cannot separate particle from verb
- Different from Romance auxiliary + verb structure

**Pattern:** Verb + aspect particle = unit

---

#### 4. Measure Words (Classifiers)

**Feature:** Required between numbers/determiners and nouns

**Note:** Not prominent in 30-seed set (few counted nouns)

**Future Consideration:** When seeds include counted nouns, measure words must stay with quantifier or noun for FD.

---

#### 5. Resultative Complements

**Feature:** Verb + result complement construction

**LEGO Impact:**
- Keep verb + complement together
- Example: `说完` = "finish speaking" (说 = speak, 完 = finish)
- Different from Romance verb + preposition + infinitive

---

#### 6. Cleaner LEGO Structure

**Feature:** Mandarin decompositions have ZERO tiling failures

**Observation:**
- Minimal hierarchical build-up LEGOs
- More direct, flatter structure
- Fewer pedagogical intermediate forms

**Analysis:**
- May reflect isolating morphology (less to decompose)
- May reflect teaching philosophy
- May indicate optimal approach for non-inflecting languages

**Comparison:**
- Romance languages: 15-16 tiling "failures" each (due to hierarchical LEGOs)
- Mandarin: 0 tiling failures (cleaner base structure)

---

#### 7. No Grammatical Gender

**Feature:** No gender distinctions in pronouns or verbs

**LEGO Impact:**
- Third-person `他/她/它` distinguish gender, but not in verb
- English translations naturally gender-neutral
- Easier FD compliance than Romance languages

**Example:**
- Chinese third-person doesn't affect verb form
- English "Wants" is naturally neutral
- Romance languages must avoid "he/she" to stay FD

---

### Mandarin-Specific Challenges

**1. Tone Distinctions:**
- Not reflected in LEGO decomposition (text-based)
- But crucial for actual learning
- Future audio integration will need tone marking

**2. Character vs. Word Boundaries:**
- Characters don't always = words
- Some words are single characters, others are compounds
- LEGO boundaries should respect word units, not just characters

**3. Coverbs and Serial Verb Constructions:**
- Mandarin allows multiple verbs in sequence
- Example: `跟你说` = "with you speak" (coverb + main verb)
- Keep these sequences together

**4. Topic Markers:**
- Particles like `呢`, `吗`, `吧` at sentence end
- Question particle `吗` appears in questions
- May need to be included in question LEGOs for FD

**5. Reduplication:**
- Verb reduplication for tentativeness: `看看` = "take a look"
- Adjective reduplication for emphasis
- Keep reduplicated forms together

---

## CROSS-LINGUISTIC COMPARISONS

### 1. Subject Pronoun Requirements

| Language | Pro-Drop? | Pronoun in LEGO | Example |
|----------|-----------|-----------------|---------|
| Italian | YES | Optional | `Voglio` / `I want` |
| Spanish | YES | Optional | `Quiero` / `I want` |
| French | NO | REQUIRED | `Je veux` / `I want` |
| Mandarin | Context | REQUIRED* | `我想` / `I want` |

*Required for FD even though language allows dropping in context

**LEGO Principle:** Include pronoun when needed for FD, even if language allows omission.

---

### 2. Future Constructions

| Language | Future Marker | Glue Word End? | Status |
|----------|---------------|----------------|--------|
| Italian | `Sto per` | YES (`per`) | Grammaticalized ✓ |
| Spanish | `Voy a` | YES (`a`) | Grammaticalized ✓ |
| French | `Je vais` | NO | Clean |
| Mandarin | `要` / `会` | NO | Modal particle |

**LEGO Principle:** Grammaticalized markers ending in glue words are acceptable (whitelisted).

---

### 3. Progressive Aspect

| Language | Construction | Pattern | Example |
|----------|-------------|---------|---------|
| Italian | `stare` + gerund | Sto cercando | I'm trying |
| Spanish | `estar` + gerund | Estoy tratando | I'm trying |
| French | Simple present* | J'essaie | I'm trying |
| Mandarin | Aspect particle | 我在试着 | I'm trying |

*French uses simple present where English uses progressive

**LEGO Principle:** Romance progressives are periphrastic and chunked together. Mandarin uses particles.

---

### 4. Negation Patterns

| Language | Pattern | Example |
|----------|---------|---------|
| Italian | Prefix `non` | non voglio |
| Spanish | Prefix `no` | no quiero |
| French | Two-part `ne...pas` | je ne veux pas |
| Mandarin | Prefix `不/没` | 我不想 |

**LEGO Impact:** French negation spans verb, must be kept together.

---

### 5. Prepositions with Pronouns

| Language | With You | Structure |
|----------|----------|-----------|
| Italian | con te | Prep + pronoun |
| Spanish | contigo | Fused form |
| French | avec toi | Prep + stressed pronoun |
| Mandarin | 跟你 | Prep + pronoun |

**LEGO Principle:** All kept together as units, but Spanish has irregular fusion.

---

## TEACHING IMPLICATIONS

### Romance Language Learners

**Advantage of Multi-Language Approach:**
- 96.7% structural consistency across Italian, Spanish, French
- Learning one Romance language facilitates others
- Pattern recognition transfers across languages

**Example:**
Progressive construction pattern is parallel:
- Italian: `Sto cercando di` + infinitive
- Spanish: `Estoy tratando de` + infinitive
- French: `J'essaie de` + infinitive (but not progressive in French)

**LEGO Impact:** Students learning multiple Romance languages will see parallel decompositions, reinforcing patterns.

---

### Mandarin Learners (From Romance Background)

**Challenges:**
- No verb conjugation (must include pronouns for context)
- Topic-prominence vs. subject-prominence
- Aspect particles vs. auxiliary verbs
- No articles (different from Romance definite/indefinite)

**Opportunities:**
- Simpler morphology = fewer inflection variations to learn
- Cleaner LEGO structure (less hierarchical complexity)
- Gender-neutral = easier FD compliance

**LEGO Impact:** Mandarin LEGOs are more direct, less pedagogical scaffolding needed for morphological composition.

---

### Cross-Linguistic Insights for Course Design

**1. Pro-Drop Languages (Italian, Spanish) vs. Non-Pro-Drop (French, Mandarin):**
- Pro-drop allows smaller LEGOs
- But FD may require including pronouns anyway
- Teaching decision: Include pronouns for consistency across languages?

**2. Grammaticalization Examples:**
- Excellent teaching moments: `Sto per`, `Voy a` show how language evolves
- Preposition → function word → grammatical marker
- LEGO decomposition reveals this process

**3. Typological Differences:**
- Romance: Inflecting, gender, articles
- Mandarin: Isolating, no gender, no articles
- Different decomposition strategies needed
- But FD_LOOP principle applies universally

---

## LANGUAGE-SPECIFIC RECOMMENDATIONS

### For Italian Courses

1. **Embrace Hierarchical Build-Up:**
   - Italian benefits from showing compositional structure
   - Include intermediate LEGOs showing how forms build
   - Example: `qualcuno` → `altro` → `qualcun altro`

2. **Highlight Grammaticalization:**
   - `Sto per` as teaching opportunity for grammatical change
   - Show how `per` functions differently here than as preposition

3. **Preposition Contractions:**
   - Keep contracted forms intact (`del`, `al`, `nel`)
   - Teach as atomic units, not decomposed

### For Spanish Courses

1. **Leverage Parallel with Italian:**
   - Cross-reference Italian patterns where applicable
   - Highlight differences (like `contigo` fusion)

2. **Emphasize Periphrastic Future:**
   - `Voy a` is extremely common and productive
   - Good entry point for future tense teaching

3. **Subjunctive Chunking:**
   - Keep subjunctive triggers with verbs
   - Example: `quiero que hables` as unit

### For French Courses

1. **Pronoun Requirement:**
   - Always include subject pronouns in LEGOs
   - Explain why (lack of conjugation clarity without pronoun)

2. **Two-Part Negation:**
   - Teach `ne...pas` as discontinuous unit
   - Keep entire negative scope in one LEGO

3. **Elision Awareness:**
   - Keep elided forms as written
   - Don't expand `J'` to `Je` in decomposition

### For Mandarin Courses

1. **Topic-Comment Teaching:**
   - Explain topic-prominence vs. subject-prominence
   - Show flexibility in word order

2. **Aspect System:**
   - Keep aspect particles with verbs
   - Explain difference from Romance auxiliary systems

3. **Simplicity Advantage:**
   - Use flatter LEGO structure (less hierarchical)
   - No need for gender considerations
   - Focus on word order and particle usage

---

## QUALITY ASSURANCE IMPLICATIONS

### Romance Language Consistency Check

**Procedure:**
For each seed across Italian, Spanish, French:
1. Compare LEGO count (should be within ±2)
2. Check parallel structures decompose similarly
3. Investigate significant deviations

**Acceptable Variance:**
- Language-specific features (e.g., French pronouns add LEGOs)
- Idiomatic differences (e.g., Italian `Sto per` vs. French `Je vais`)
- Teaching philosophy (Italian hierarchical vs. Spanish flat)

**Unacceptable Variance:**
- One language missing LEGOs needed for FD
- Arbitrary differences without linguistic justification
- Inconsistent treatment of parallel structures

---

### Mandarin Independence

**Principle:** Do NOT force Mandarin to match Romance patterns

**Example:**
- Romance languages may use 6-7 LEGOs for a seed
- Mandarin may use 3-4 for same concept
- This is CORRECT - different language structure

**Quality Check:**
- Verify Mandarin LEGOs independently against FD_LOOP
- Do not compare LEGO count to Romance languages
- Respect isolating morphology differences

---

## FUTURE LANGUAGE ADDITIONS

### Considerations for Other Romance Languages

**Portuguese:**
- Very similar to Spanish
- Expect 95%+ consistency with Spanish patterns
- Some differences: nasal vowels, different pronouns

**Romanian:**
- Romance but with Slavic influences
- May show lower consistency with Western Romance
- Postposed articles (unique among Romance)

**Catalan:**
- Between Spanish and French in structure
- Expect patterns similar to both

---

### Considerations for Other Language Families

**Germanic (German, Dutch, Swedish):**
- Word order differences (SOV in subordinate clauses)
- Separable verb prefixes (unique decomposition challenge)
- May need different LEGO strategies than Romance

**Slavic (Russian, Polish, Czech):**
- Complex case systems
- Aspect pairs (perfective/imperfective)
- Free word order
- Very different from Romance patterns

**Other Sino-Tibetan (Cantonese, Taiwanese):**
- Similar to Mandarin in many ways
- Expect similar flat LEGO structure
- Different aspect systems may affect decomposition

---

## CONCLUSION

Each language presents unique opportunities and challenges for LEGO decomposition:

**Romance Languages (Italian, Spanish, French):**
- High structural consistency (96.7%)
- Different morphological richness affects LEGO size
- French requires pronouns; Italian/Spanish optional
- All share progressive, future, negative patterns

**Mandarin:**
- Fundamentally different structure (isolating vs. inflecting)
- Simpler morphology = cleaner LEGO structure
- Topic-prominence affects decomposition
- No gender = easier FD compliance
- Aspect particles integral to verbs

**Universal Principles:**
- FD_LOOP applies regardless of language
- IRON RULE applies regardless of language
- Gender neutrality critical for pro-drop/null-subject languages
- Pattern consistency within language family

**Language-Specific Approaches:**
- Respect linguistic typology
- Don't force cross-family consistency
- Leverage intra-family parallelism
- Document unique features for learners

**Quality Assurance:**
- Check consistency within Romance family
- Validate Mandarin independently
- Document all language-specific decisions
- Update pattern library with new languages

This analysis provides a foundation for adding new languages while maintaining quality and leveraging cross-linguistic insights where appropriate.

