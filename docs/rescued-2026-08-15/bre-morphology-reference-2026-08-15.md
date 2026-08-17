# Breton (peurunvan / standard literary, KLT) morphology reference for LEGO decomposition

Scope: standard literary Breton (peurunvan), the register used in textbooks and Ofis Publik ar Brezhoneg (OPAB) materials. Built for slicing `bre_for_eng` course sentences into LEGOs without producing a stored LEGO form that never actually surfaces in a sentence, because of mutation.

Compiled 2026-08-15 from web sources (WebSearch/WebFetch over Wikipedia, Wiktionnaire, Skol Ober, Wikiversité, Arbres/CNRS, and an academic PDF that could not be parsed). **This was gathered second-hand through an AI summarizer tool, not by reading primary sources directly** — see the Confidence note at the end of each section and the UNCERTAIN section at the bottom before trusting any single cell.

---

## 0. The c'h problem for word-boundary regexes — READ THIS FIRST

`c'h` is **one letter** in Breton orthography (a trigraph spelling of a single consonant, /x/ ~ /h/), not "c" + apostrophe + "h". It is also one of the four mutation *targets* (k → c'h under soft mutation, k/g → c'h under spirant/mixed mutation — see §1).

Consequences for any regex-based LEGO/word tokenizer in this repo:
- **Never split on `'` as a word-boundary or contraction marker in Breton text.** A naive `\w+|'` tokenizer that treats apostrophe as punctuation will shear `c'hi` (dog) into `c` + `hi`, silently producing a garbage LEGO fragment and losing the actual initial consonant the mutation rules below predict.
- Breton uses apostrophe for at least three unrelated things: (a) the `c'h` letter itself, (b) genuine elision/clitic writing such as the infixed pronoun `'z`/`'m` (`ec'h eus` vs `'z peus` type forms — dialectal/registers vary), and (c) `gw'` is not a thing but `n'` (`ne` + vowel-initial verb, e.g. `n'on ket` = "ne + on + ket") **is** a real elision. A tokenizer needs to special-case `c'h` (always keep as one unit) separately from `n'` / other elisions before touching apostrophes generically.
- Any mutation-lookup table keyed on "first letter" must key on **first grapheme**, where `c'h` and `gw` are single graphemes, not on first Unicode codepoint.

**Confidence: high** on the linguistic fact (c'h = one letter); the tokenizer implication is my own inference from that fact, not sourced.

---

## 1. The mutation table

Breton peurunvan has four mutation types. Below is the consonant-output table, cross-checked across three independent fetches of the Wikipedia "Breton mutations" article plus corroborating detail from Iosad's academic description (title only recovered — PDF body could not be parsed, see gap note) and grokipedia/languagesgulper summaries.

| Underlying | Soft (lenition) | Spirant | Hard (provection) | Mixed |
|---|---|---|---|---|
| p | b | f | p (unchanged) | b |
| t | d | z | t (unchanged) | d |
| k | g | c'h | k (unchanged) | g |
| b | v | — (n/a, voiced) | p | v |
| d | z | — (n/a, voiced) | t | t |
| g | c'h | — (n/a, voiced) | k | c'h |
| gw | w | — | kw | w |
| m | v | v* | mh | v |

`*` — spirant mutation is, strictly, defined only over the voiceless stops p/t/k (voiceless stop → voiceless fricative). Sources that list "m → v under spirant" are describing what happens to `m` when a *spirant-triggering* word (e.g. `ma`/`va` "my") precedes it — the trigger word causes lenition on m even though it causes spirant mutation on p/t/k. Treat the m-row as "what this trigger class does to m," not as a fifth true spirant output. **Flagged uncertain — see §8.**

### Triggers, by mutation type

**Soft mutation** (by far the most frequent):
- Articles (definite/indefinite) before feminine singular nouns and before masculine plural nouns denoting people
- Prepositions: `da`, `dre`, `a`, `war`, `dindan`, `eme`, `en ur`
- Possessive pronouns: `da` (your, sg.), `e` (his)
- Verbal particles: `a`, `ne`, `na`, `ez`, `ra`, `en em`
- Numerals: `daou`, `div` (two, m./f.)
- Conjunctions: `pa`, `pe`, `tra`
- Adverb `re` (too)
- Pronouns: `holl`, `re`, `hini`
- Postposed adjectives after feminine singular nouns and masculine plural (people) nouns

**Spirant mutation**:
- Possessive pronouns: `he` (her — on p/t/k only, see above), `o` (their), `ma`/`va` (my)
- Numerals: `tri`, `teir`, `pevar`, `peder`, `nav` (3 m./f., 4 m./f., 9)
- Note (dialectal): the Trégorrois form `hon` ("our") also triggers spirant mutation in that dialect's system; KLT `hor`/`hon`/`hol` triggers differ — see §5.
- Note (registral): spoken Breton frequently replaces spirant mutation with soft mutation after numerals — flagged explicitly by the source as a register/dialect divergence, not an error.

**Hard mutation** (provection) — the smallest, most restricted class:
- Possessive pronoun `ho` (your, pl.)
- The infixed/subject pronoun `'z` and its variants (`az`, `ez`)

**Mixed mutation**:
- Verbal particle `e` (the "other-than-subject-fronted" preverbal particle — see §2)
- Verbal particle `o` (the progressive participle particle — see §3)
- Conjunction `ma` ("if")

**Confidence: medium-high.** The four-column table was reproduced consistently across independent fetches once I stopped trusting single-pass paraphrase (an earlier pass hallucinated `k→k`/`g→k` for the mixed column before I re-verified — corrected here). The trigger *lists* are Wikipedia's own categorization and I have not independently verified each bullet against a second grammar; treat the trigger lists as a strong starting point, not exhaustive.

Sources: [Breton mutations — Wikipedia](https://en.wikipedia.org/wiki/Breton_mutations), [Breton non-local spirantization reexamined — ScienceDirect/Brill](https://www.sciencedirect.com/org/science/article/pii/S221258842000006X), [Mutations du breton — Wikipédia (FR)](https://fr.wikipedia.org/wiki/Mutations_du_breton), [The Phonology and Morphosyntax of Breton Mutation, Pavel Iosad (PDF, title/existence only — body unreadable)](https://www.anghyflawn.net/pdf/lel.breton.pdf).

---

## 2. The periphrastic present and the particles `a` / `e`

Breton is normally verb-second-ish with a fronted constituent + particle + finite verb. Two preverbal particles alternate in affirmative clauses, and the choice is **syntactically conditioned**, not free variation:

- **`a`** appears when the fronted element is the **subject, direct object, or the verbal noun/infinitive itself** (i.e., subject-fronting or infinitive-fronting).
- **`e`** appears when the fronted element is **anything else** — an adverbial, a PP, etc.

`a` triggers **soft mutation** on the following verb; `e` triggers **mixed mutation** on the following verb. This is why `komz a ran` (soft-mutation environment, but see the `ober` irregularity below) contrasts structurally with constructions fronting a non-subject/non-object element, which would use `e` + mixed-mutated verb instead.

Source: [Non-negative word order in Breton: maintaining verb-second (Oxford, ORA)](https://ora.ox.ac.uk/objects/uuid:9131b11a-3eff-43b1-9055-b6c9f19b413b/files/m8855738e4679f0fe5af20bef11878240), [Preverbal particles in verb-initial languages (ResearchGate)](https://www.researchgate.net/publication/241378240_Preverbal_particles_in_verb-initial_languages).

### The verb `ober` (to do/make) — present indicative

`ober`'s radical is historically `gr-` / `gra-` / `gre-` (from Proto-Brythonic *gwrėɣɨd, cognate with Welsh `gwneud`, Cornish `gwul`). It has **two surface series**:

| Person | Independent/absolute form (verb-initial) | Conjunct form (after particle `a`) |
|---|---|---|
| me (I) | gran | ran |
| te (you sg.) | grez | rez |
| eñ/hi (he/she) | gra | ra |
| ni (we) | greomp | reomp |
| c'hwi (you pl.) | grit | rit |
| int (they) | greont | reont |
| impersonal | greer | reer |

**This is a documented irregularity, not the regular soft-mutation output.** Under regular soft mutation, `g` → `c'h`. For `ober` specifically, the initial `g` is instead lost entirely after the particles `a`/`e` (Wiktionnaire's own gloss: *"Dans le cas de la mutation par adoucissement, le g initial disparaît au lieu de muter en c'h"* — "in lenition, the initial g disappears instead of mutating to c'h"). So the course forms `komz a ran`, `komz a rez` are the **conjunct** series, and if you ever see the bare/verb-initial form (e.g. in an imperative or a topic-less sentence) it will be `gra`/`greomp`/`grit`, not `ra`/`reomp`/`rit`. **Do not build a LEGO that assumes `ra`-forms are interchangeable with `gra`-forms — they are conditioned by whether a fronted element + particle precedes.**

Confirmed independently by [Wiktionnaire — Conjugaison:breton/ober](https://fr.wiktionnaire.org/wiki/Conjugaison:breton/ober) and [en.wiktionary.org/wiki/ober](https://en.wiktionary.org/wiki/ober), and cross-checked against the course sentences `komz a ran` / `komz a rez` themselves.

### The `fellout a ra din` pattern

`fellout a ra din komz` = "wanting does to-me [to] speak" = "I want to speak." This is the **same** verb-fronted `a` + `ober` construction, but with `ober` staying in its impersonal-default 3sg `ra` form (there is no true impersonal-subject in Breton the way French has `il`; `ra` here is the invariant "it happens/is-done" form), and the experiencer expressed via the conjugated preposition `da` (`din`, `dit`, `dezhañ`, `dezhi`, `deomp`/`dimp`, `deoc'h`, `dezho` — see §4). This is a fixed idiomatic frame (`X a ra da-PERSON` = "X happens to PERSON" / "PERSON does/wants X"), not a fully productive paradigm — the verb after `da`-PERSON stays as the bare verbal noun (`komz`, not a conjugated form).

**Confidence: medium.** The `a`/`e` particle-choice rule and the `ober` gra-/ra- alternation are both independently sourced and mutually consistent (and match the actual course sentences). The `fellout ... din` idiom-frame description is my own synthesis from the pattern, not a directly cited grammar description — flagged in §8.

---

## 3. `emaon` / `emaout` / `emañ` — the locative-progressive

`bezañ` ("to be") has a dedicated **situative** present paradigm, distinct from its ordinary present (`on/out/eo/omp/oc'h/int` or the habitual `zo`/`eo`), used specifically for location and for the progressive:

| Person | Situative present |
|---|---|
| me | emaon |
| te | emaout |
| eñ/hi | emañ |
| ni | emaomp |
| c'hwi | emaoc'h |
| int | emaint |

The progressive is built as **`emaon` + `o` + verbal noun**: `emaon o klask` = "I am trying/searching." The particle `o` (like `e`) triggers **mixed mutation** on the following verbal noun:

- `o klask` — k is unaffected in this example (need to check: k under mixed is unlisted/unchanged in most sources, i.e. mixed mutation may not touch voiceless stops at all — see §8)
- `o teskin` (teaching, from `deskiñ`) — d → t, matching the mixed-mutation table (d→t)
- `o vont` (going, from `mont`) — m → v, matching the mixed-mutation table (m→v)
- a search source additionally gave `o hortoz` from `gortoz` (to wait) — g → c'h (spelled `h` colloquially/informally in that source), matching the mixed-mutation table (g→c'h)

So: **`o` + verbal noun mutates the verbal noun by the mixed-mutation rule in §1**, exactly like the particle `e`. This is consistent, not a separate rule.

**Confidence: medium-high** for the paradigm table (directly sourced, one clean fetch, matches expected Breton forms I can cross-check against the base `bezañ` paradigm shape). **Medium** for the `o klask` example specifically — `klask` starts with `k`, and I could not get a source to state explicitly whether mixed mutation leaves voiceless stops (p/t/k) untouched or not; the table in §1 only has entries for b/d/g/gw/m under "mixed," suggesting p/t/k are simply unaffected by mixed mutation, which would make `o klask` stay as `o klask` (unmutated) — but I did not find a source stating this negative fact directly. **Flagged uncertain — see §8.**

Sources: [Emañ — Arbres/CNRS](https://arbres.iker.cnrs.fr/index.php/Ema%C3%B1), [Conjugaison:breton/bezañ — Wiktionnaire](https://fr.wiktionary.org/wiki/Conjugaison:breton/beza%C3%B1), [Breton mutations — Wikipedia](https://en.wikipedia.org/wiki/Breton_mutations).

---

## 4. Prepositional pronouns (conjugated prepositions)

Cross-checked between two independent sources (Skol Ober and Wikiversité FR) — they agree except for minor 1pl free-variation (`ganeomp`/`ganimp` both attested).

| Person | gant (with) | da (to) | e/en (in) | war (on) | a (of/from — also used for the disjunctive "about") | evit (for) |
|---|---|---|---|---|---|---|
| me | ganin | din | ennon | warnon | ac'hanon | evidon |
| te | ganit | dit | ennout | warnout | ac'hanout | evidout |
| eñ (he) | gantañ | dezhañ | ennañ | warnañ (also warnezhañ) | anezhañ | evitañ |
| hi (she) | ganti | dezhi | enni | warni (also warnezhi) | anezhi | eviti |
| ni (we) | ganimp / ganeomp | dimp / deomp | ennomp | warnomp | ac'hanomp | evidomp |
| c'hwi (you pl.) | ganeoc'h | deoc'h | ennoc'h | warnoc'h | ac'hanoc'h | evidoc'h |
| int (they) | ganto | dezho | enno | warno (also warnezho) | anezho | evito |

**Used in the course sentences given:**
- `gant` full paradigm as above.
- `da`: `din` (fellout a ra **din**), `dit` (…**dit**), `dezhañ` (…**dezhañ**), `dezhi` (…**dezhi**), `deomp` (…**deomp**) — the prompt's `dezhan` is a spelling without the circumflex-tilde; the sourced form is `dezhañ`.

**`eus` (of/from) — NOT independently verified.** I could not get any source to produce a clean 7-cell paradigm for `eus`. One source noted it "appears only in compound forms like `eus e berzh`." Some grammars conjugate `eus` periphrastically via `a-berzh` or route the "from X" meaning through the `a`-column above instead. **Mark `eus` conjugated forms as UNVERIFIED — do not build a LEGO assuming a specific `eus + pronoun` fused form without checking a primary grammar (e.g. Kervella or Press) directly.**

Sources: [Tables of prepositions — Skol Ober](https://www.skolober.com/en/courses/breton/grammar/prepositions), [Breton/Grammaire/Prépositions — Wikiversité](https://fr.wikiversity.org/wiki/Breton/Grammaire/Pr%C3%A9positions), [Prepositional pronouns in the Brythonic languages — Omniglot](https://www.omniglot.com/language/celtic/pronouns/brythonic.php).

**Confidence: high** for gant/da/e/war/a/evit (three-way cross-check, internally consistent). **Low/unverified** for `eus`.

---

## 5. Possessives — full list and mutation

| Possessive | Meaning | Mutation triggered | Example |
|---|---|---|---|
| ma / va | my | Spirant (on p/t/k); lenition-like on b/d/g/m (see §1 footnote) | `va fenn` (my head, penn→fenn) |
| da | your (sg.) | Soft | `da dad` (your father, tad→dad — wait, tad under soft is `dad`; sourced example instead used `he zad`, see below) |
| e | his | Soft | `e vreur` (his brother, breur→vreur) |
| he | her | Spirant (recognition-mutation contrast with `e`) | `he zad` (her father, tad→zad, spirant t→z) |
| hor / hon / hol | our | KLT: `hol` before l-, `hon` before n-/d-/t-/h-/vowel-, `hor` elsewhere. Trégorrois dialect: always `hon`. Mutation: spirant in the Trégorrois system; KLT `hor/hon/hol` pattern is reported as triggering **no mutation / provection-adjacent behavior** in some sources — **flagged uncertain, see §8**. | — |
| ho | your (pl.) | Hard (provection); vowel-initial variant is `hoc'h` | `hoc'h anv` (your name) |
| o | their | Spirant | — |

**The `e` vs `he` "recognition mutation"**: because `e` (his) and `he` (her) are near-homophones, Breton leans on the mutation each triggers to disambiguate — `e vreur` "his brother" (soft) vs `he zad` "her father" (spirant) sound different even though the possessive word itself is nearly the same. This is explicitly called a "mutation of recognition" (mutation de reconnaissance) by the source, distinguishing homophonous grammatical words by their mutation effect alone.

**Before a vowel-initial noun**, several of these possessives get (or are reported to get) a `c'h`- prefix so the possessive itself stays audible/distinct, by analogy with `ho` → `hoc'h`. I found this **directly confirmed only for `ho` → `hoc'h`**. The prompt's example `hech anv` ("her name") — i.e. `he` becoming `hec'h` before a vowel-initial noun — is **plausible by analogy but I could not find a source directly confirming `he` → `hec'h` before vowels** (as opposed to `he` staying `he` and the following vowel-initial noun being unaffected, since spirant mutation doesn't touch vowels at all). **Flagged uncertain — see §8. Do not assume `hec'h anv` is correct without checking a primary grammar; `he anv` (unmutated, since anv starts with a vowel and spirant mutation has no vowel-initial output) is at least as plausible given the mutation mechanics in §1.**

Sources: [Déterminants possessifs — Arbres/CNRS](https://arbres.iker.cnrs.fr/index.php/D%C3%A9terminants_possessifs) (fetch failed with a certificate error — content below is from the WebSearch snippet only, not a direct page read), [Trégorrois Breton dialect — Wikipedia](https://en.wikipedia.org/wiki/Tr%C3%A9gorrois_Breton_dialect), [Breton mutations — Wikipedia](https://en.wikipedia.org/wiki/Breton_mutations).

**Confidence: medium** for `ma/da/e/he/ho/o` mutation classes (matches §1's trigger lists, internally consistent). **Low** for `hor/hon/hol` distribution and for any vowel-initial variant of `he`/`ma`/`e` — these are gaps, not confirmed facts.

---

## 6. Negation: `ne ... ket`

Bipartite negation: `ne` before the verb, `ket` after it. `ne` is one of the soft-mutation-triggering verbal particles (§1). Before a vowel-initial verb, `ne` elides to `n'` (e.g. `n'on ket`, "I am not").

- `Ne skrivan ket` — "I do not write."
- `Ne fell ket din` — "I do not want" (lit. "it does-not-please not to-me"), the negated form of the `fellout a ra din` frame in §2 — note that under negation the verb-fronting/particle-`a` construction is replaced: the finite verb `fell` sits directly after `ne`, not after a fronted verbal noun + `a`. This is a structural, not just morphological, difference between affirmative and negative periphrastic-present sentences — **worth flagging for LEGO-boundary purposes: don't assume the affirmative word order/chunking survives into the negated sentence.**
- One search source additionally noted a word-order effect where, if an explicit subject follows a negated verb, the verb may stay in its (impersonal-looking) singular form rather than agreeing in number with a plural subject (their example: `Ne gan ket ar baotred`, "the boys do not sing," singular `gan`) — **flagged uncertain, single low-confidence source, not cross-checked.**

**Confidence: medium** for the basic `ne...ket` + soft mutation + `n'` elision facts (matches general Celtic-negation typology and is stated plainly by the source). **Low** for the subject-agreement claim in the last bullet.

Source: [Breton Grammar - Negation — PolyglotClub](https://polyglotclub.com/wiki/Language/Breton/Grammar/Negation), [Breton grammar — Wikipedia](https://en.wikipedia.org/wiki/Breton_grammar).

---

## 7. Five ways a non-speaker would mis-slice these sentences into LEGOs

1. **Treating a mutated word-form as the citation/dictionary form.** `ran`, `rez`, `vreur`, `zad`, `c'hi` are not separate vocabulary items from `gra`, `breur`, `tad`, `ki` — they are the same lexeme under a mutation trigger. A LEGO built on the surface form `ran` alone, without knowing it's conditioned by "fronted verbal-noun/subject + particle `a`," will silently fail to recur when the same verb appears verb-initial (`gra`) or after a different particle.

2. **Splitting `c'h` on the apostrophe** (§0) — turns one consonant into two garbage fragments and destroys the very mutation signal you're trying to track.

3. **Assuming the `a`/`e` particle choice is free variation or decorative.** It is syntactically determined by what's fronted (subject/object/infinitive → `a`; everything else → `e`), and it changes the mutation on the verb that follows (soft vs mixed). Slicing `a ran` and `e ran` as interchangeable LEGO fragments would conflate two different grammatical structures that happen to look similar.

4. **Missing that the `ober`-family conjunct forms (`ran/rez/ra/reomp/rit/reont`) are irregular** — the initial `g` is *lost*, not soft-mutated to `c'h`, unlike every other g-initial word in the language (§2). Pattern-matching "g-initial words mutate to c'h under `a`" and applying it to `ober` will produce the wrong prediction (`c'hran`, which doesn't exist) for one of the single most frequent verbs in any beginner course.

5. **Chunking a conjugated preposition (`ganin`, `dezhi`, `warnon`...) as [preposition] + [pronoun] two-LEGO units**, when it is a single fused inflected word (like Welsh/Irish conjugated prepositions) — there is no separate free-standing pronoun word inside `ganin`; the whole form is the LEGO, and slicing it in two would produce a fragment (`nin`? `-in`?) that never occurs as an independent word anywhere else in the corpus.

**Confidence: high on the mechanism, this is a synthesis/judgment call from the sourced grammar facts above, not itself independently cited.**

---

## 8. UNCERTAIN — explicit gaps, do not silently trust

- **Spirant mutation's treatment of `m`** (§1): sources describe `m → v` as part of the spirant-triggering possessives' effect, but spirant mutation proper is only defined over p/t/k. I have not found a source that resolves whether this is formally "spirant mutation extended to m" or "these trigger words cause spirant on ptk and lenition on everything else" as two overlapping rule-sets. Practically the *output* (v) is the same prediction either way, so this likely doesn't matter for LEGO-slicing, but the mechanism description in §1 should not be cited as settled.
- **Whether mixed mutation touches p/t/k at all** (§3): the mutation table I could source only has entries for b/d/g/gw/m under "mixed." I could not find a source stating explicitly that p/t/k are left unmutated under `e`/`o`/`ma`(if), though this is the natural reading of the table's gaps. **Before treating `o klask`, `o teurel`, etc. (verbal nouns starting p/t/k) as unmutated after `o`, verify against a primary grammar** — this is exactly the kind of gap that could silently break a LEGO.
- **`he` → `hec'h` before vowel-initial nouns** (§5): plausible by analogy with `ho`→`hoc'h`, but not directly sourced. The prompt's `hech anv` example is unverified — could equally be plain `he anv`.
- **`hor`/`hon`/`hol` mutation class** (§5): the KLT distributional rule (hol/hon/hor by following sound) is sourced, but which mutation type it triggers is not clearly stated in what I found — only the Trégorrois `hon` was confirmed as spirant-triggering.
- **`eus` conjugated-preposition paradigm** (§4): no source produced a clean table. Treat any `eus + pronoun` fused form as unverified.
- **Subject-number agreement under negation** (§6, last bullet): single low-confidence source, not cross-checked against a second grammar.
- **General method caveat**: every fetch in this session went through an AI web-fetch summarizer, not a direct read of primary-source HTML/text — I caught and corrected at least one internal contradiction (an early fetch hallucinated the mixed-mutation column) by re-querying, but that means other, uncaught summarizer errors are possible anywhere above. Anything load-bearing for an actual LEGO decision should get a second, independent check (ideally against Kervella's *Yezhadur bras ar brezhoneg* or Press's *A Grammar of Modern Breton*, neither of which I had direct access to) before you rely on it.
- **The academic Iosad PDF** (`anghyflawn.net/pdf/lel.breton.pdf`) could not be parsed by the available tools (no `pdftoppm`/poppler-utils in this environment) — it's cited above by title only, its content was never actually read, and it may contain corrections to anything above.

---

## Sources consulted

- [Breton mutations — Wikipedia](https://en.wikipedia.org/wiki/Breton_mutations)
- [Mutations du breton — Wikipédia (FR)](https://fr.wikipedia.org/wiki/Mutations_du_breton)
- [Breton grammar — Wikipedia](https://en.wikipedia.org/wiki/Breton_grammar)
- [Breton non-local spirantization reexamined — ScienceDirect/Brill](https://www.sciencedirect.com/org/science/article/pii/S221258842000006X)
- [Mutation in Breton verbs: pertinacity across generations — Oxford ORA](https://ora.ox.ac.uk/objects/uuid:e7153347-8bff-425c-84d9-199c97ad4dbb/files/m0c306d3e77d5b2f58d610ca8ccffa3c8)
- [Non-negative word order in Breton: maintaining verb-second — Oxford ORA](https://ora.ox.ac.uk/objects/uuid:9131b11a-3eff-43b1-9055-b6c9f19b413b/files/m8855738e4679f0fe5af20bef11878240)
- [Preverbal particles in verb-initial languages — ResearchGate](https://www.researchgate.net/publication/241378240_Preverbal_particles_in_verb-initial_languages)
- [Conjugaison:breton/ober — Wiktionnaire](https://fr.wiktionary.org/wiki/Conjugaison:breton/ober)
- [ober — Wiktionary (EN)](https://en.wiktionary.org/wiki/ober)
- [Emañ — Arbres/CNRS](https://arbres.iker.cnrs.fr/index.php/Ema%C3%B1)
- [Conjugaison:breton/bezañ — Wiktionnaire](https://fr.wiktionary.org/wiki/Conjugaison:breton/beza%C3%B1)
- [Tables of prepositions — Skol Ober](https://www.skolober.com/en/courses/breton/grammar/prepositions)
- [Breton/Grammaire/Prépositions — Wikiversité](https://fr.wikiversity.org/wiki/Breton/Grammaire/Pr%C3%A9positions)
- [Prepositional pronouns in the Brythonic languages — Omniglot](https://www.omniglot.com/language/celtic/pronouns/brythonic.php)
- [Déterminants possessifs — Arbres/CNRS](https://arbres.iker.cnrs.fr/index.php/D%C3%A9terminants_possessifs) (WebSearch snippet only — direct fetch failed on a TLS certificate error)
- [Trégorrois Breton dialect — Wikipedia](https://en.wikipedia.org/wiki/Tr%C3%A9gorrois_Breton_dialect)
- [Breton Grammar - Negation — PolyglotClub](https://polyglotclub.com/wiki/Language/Breton/Grammar/Negation)
- [The Phonology and Morphosyntax of Breton Mutation, Pavel Iosad (PDF)](https://www.anghyflawn.net/pdf/lel.breton.pdf) — title/existence only, body unreadable in this environment
