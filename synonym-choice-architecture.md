# Synonym-choice architecture
## SSi methodology — choosing the least-action target realisation

A canonical methodology doc for course-builder agents. Sits alongside `ralph-methodology.md` as the practical translator's checklist: when a SEED has multiple valid target-language realisations, which one creates the least-action path for this specific pair?

This is not a replacement for the existing decomposition rules. It's a filter applied at the SEED-translation step, **before** LEGO decomposition. The methodology pipeline is sound; this doc sharpens the upstream choice that determines what gets decomposed.

---

## What this doc does

For each English SEED an agent translates into a target language, multiple defensible realisations typically exist. Examples:

- *"I want to learn Chinese"* → 我想学中文 (atomic) / 我想学习中文 (with disyllabic compound) / 我要学中文 (different modal)
- *"in a house"* (Hungarian) → no atomic option — must be the M-LEGO `házban` carrying bound -ban suffix
- *"the house"* (Swedish for Romanian L1) → `huset` (enclitic definite, mirrors Romanian's postposed article) rather than separate "the" + "house"

Each choice implies different LEGO decomposition, different acquisition cost, different downstream curriculum shape. The criteria below tell the translator how to pick.

> **📖 The mirror-image problem — one ENGLISH word with several defensible TARGET realisations that mean *different things* — has its own index: [`docs/language-mapping-index.md`](docs/language-mapping-index.md). READ IT BEFORE CHOOSING.**
> This doc is about picking among realisations that mean the *same* thing (least action to confidence). When the candidates mean *different* things — "know" a fact vs a person, `ser` vs `estar`, formal vs familiar *you* — you are not choosing a synonym, you are holding a **fork**, and the fix belongs on the **English** side, not the target side. The index carries the fix for each known fork, the languages it bites in, real verbatim shipped English wordings to copy, and what was tried and rejected.

The methodology applies **per pair**. The principles are pair-agnostic; the instantiations are pair-specific. Three worked examples per principle below — across Mandarin-for-English, Swedish-for-Romanian, and Hungarian-for-English — show how the principles instantiate differently. An agent applying the methodology to a new pair (e.g., Polish for Italian, Korean for English, Hebrew for Arabic) should extract the principle from the three and apply it to the new pair's phonology, morphology, and L1-transparency profile.

---

## The eight principles

1. Phonetic-cost-aware compounding (AA reduplication, AB-compound trap, single-syllable atom preference)
2. Meaningful-unit atomisation (atomic > chunked for content; chunked M-LEGO for grammatical particles)
3. Cliff front-loading (structural cliffs in R6-R30)
4. Paradigm balance (don't introduce half-built types)
5. L1-conditional sequencing (where L1's properties create transparency or block it)
6. Grammatical-particle M-LEGO upchunking with "as in" pragmatic anchors
7. Pod-decoupling (defer pod-covered content out of LEGOs)
8. Mid-course frame-opener atomic placement (R200-R400)

Each section below: principle statement, three pair-specific worked examples, synthesis observation.

---

## 1. Phonetic-cost-aware compounding

**Principle.** For each candidate target realisation of an English meaning, prefer the form that minimises L1-specific phonetic difficulty. The rule splits into two cases:

- **AA reduplication** (same syllable doubled): if the target offers a reduplicated form and the meaning maps, prefer it. The second syllable IS the first — one motor program with doubled production margin. HISE-bulletproof.
- **AB compound** (two distinct syllables): prefer only when the second syllable is **phonetically protective** (cheaper than the first, rescuing the harder syllable). Stacked-hard-phoneme compounds (both syllables in L1's tier-4/5) LOSE to the monosyllabic atom.

The general principle: phonetic redundancy via motor-program repetition beats phonetic novelty in disyllabic packaging. Identify L1-specific tier-4/5 phonemes (sounds absent from L1, or requiring distinctions L1 doesn't make), then score candidate target forms against that tier inventory.

### zho_for_eng

Tier-5 phonemes for English speakers: tones (English doesn't lexicalise pitch), retroflex /ʈʂ ʈʂʰ ʂ/ (zh/ch/sh), alveolopalatal /tɕ tɕʰ ɕ/ (j/q/x) and the retroflex-vs-alveolopalatal distinction, /ʐ/ (r-), front rounded /y/ (ü).

- **AA reduplication preferred:** 试试 (shìshi, "give it a try") > 试 (shì) alone when "let me try" / "have a try" is the target meaning. Same syllable repeated; one motor program absorbs the retroflex sh- cost; HISE-redundant. Same logic for 想想 (xiǎngxiang, "let me think") / 看看 / 听听 / 慢慢 / 等等.
- **AB compound rescued:** 中文 (zhōngwén, "Chinese language"). 中 stacks retroflex zh- + tone-1 onto an ng-coda; 文 (wén) is tier-1 phonologically and tone-2. The cheap second syllable carries the learner across the harder first. Same pattern with 怎么 (zěnme — 么 rescues 怎), 现在 (xiànzài — 在 rescues 现), 明白 (míngbai — 白 rescues 明).
- **AB compound trap (atom wins):** 学习 (xuéxí, "learn/study"). Both syllables stack alveolopalatal x- with front rounded /y/ (ü). No rescue available — both syllables share the tier-5 burden. Atomic 学 alone is phonetically cheaper despite losing the redundancy mass. Across 15 v2 builds in the experiment, every agent chose monosyllabic 学 over disyllabic 学习 once the AB-trap rule was made explicit.

### swe_for_ron

Tier-5 phonemes for Romanian speakers: /ɧ/ (sj-sound), /ɕ/ (tj-sound), /ʉ/ (Swedish u), front rounded /y ø œ/, pitch-accent contrast (acute vs grave).

- **AA reduplication preferred:** Swedish has limited true reduplication (jajaja, neinej as intensifier-doubles; "tjotjo" frozen child-register). Productive site: "småsmått" colloquial for "very small" — second syllable IS the first, the front-rounded /å/ is paid for once. Recommended for the R150-R200 intensifier slot when "very small" earns a LEGO.
- **AB compound rescued:** ingång (in + going, "doorway/entrance"). "in" is tier-2 (Romanian "în" is almost identical, free); "gång" has only one new sound (/ŋ/ which Romanian already has in "lung", and /ɔ/ is near-Romanian /o/). The cheap, cognate-protected first syllable carries the learner into the slightly harder second. Recommended over atomic "entré" which forces /tre/ with a French-style nasal Romanian doesn't have in that position.
- **AB compound trap (defer to pod):** diskbänk ("kitchen sink"). /ɛ/-with-retroflex-nk in one syllable; sj-adjacent /sk/ cluster in the other. Both syllables tier-4+. No rescue available. Methodology call: don't atomise diskbänk — pod-defer or pick the atom "ho" (basin) where lexical context allows.

### hun_for_eng

Tier-5 phonemes for English speakers: palatals gy [ɟ] / ty [c] / ny [ɲ] in coda position, the cs/dzs voicing pair as a minimal pair, long-vs-short vowel as phonemic (`tör` vs `tőr`, `kor` vs `kór`), geminate consonants as length-phonemic (`hal` vs `hall`, `megy` vs `meggy`).

- **AA reduplication preferred:** `lassan-lassan` ("gradually / little by little"). Two motor passes of the same single-geminate adverb. Compare candidate `fokozatosan` (4 syllables, denser, stacks unfamiliar prosodic patterns + the /ts/ affricate). The doubling is methodology-favoured.
- **AB compound rescued:** `holnap` ("tomorrow"). `hol` is CVC with cheap phonemes (h, o, l — all tier-1 for English); `nap` has the backed-low-rounded /ɒ/ ([a] in Hungarian) which is tier-4 — but it lands in the **B position**, protected by the established `hol` motor program. The first syllable carries; the second introduces the harder vowel within a forgiving rhythm. Contrast `nappal` ("by day") where the harder /a/ lands first and a geminate -pp- compounds the cost.
- **AB compound trap (atom wins):** `köszönöm` ("thank you, formal"). Four syllables: kö-szö-nö-m, each carrying tier-4/5 — front-rounded ö three times, the sz/s minimal-pair trap, the -m possessive-conjugation echo. Atomic `kösz` (informal "thanks") debuts ö only once and is genuinely register-appropriate for a casual-frame learner. Recommended for atomic debut, with `köszönöm` deferred or absorbed into a pod-driven politeness frame.

### Synthesis

Three pairs, three different tier-5 phoneme inventories, three different patterns of available reduplications and protective compounds. The principle abstracts to: **identify L1-specific tier-4/5 phonemes via the LLM's phonological inventory prior, then score candidate target forms against that inventory**. Reduplications win when available; AB compounds win when B protects A; stacked-hard-phoneme compounds lose to atoms.

The pair-specific instantiation differs in *which* phonemes are tier-5, *whether* productive reduplication exists, and *how often* protective AB compounds are available. The principle does not.

---

## 2. Meaningful-unit atomisation

**Principle.** A LEGO must be a meaningful unit in itself. This is the methodology's hard constraint, not a guideline.

- **Lexical content** (verbs, nouns, adjectives, pronouns, modals, negators, WH-words, content adverbs, content conjunctions): each form is genuinely meaningful alone → atomise where the L2 treats them as separable units.
- **Grammatical particles** (sentence-final markers, clitics, case suffixes, aspect markers, infinitive markers, possessive suffixes, agreement morphology): NOT meaningful alone → must M-LEGO upchunk. The chunked M-LEGO is the LEGO; the particle's function emerges via overlap-inference across multiple chunked exposures.

The "atomise + as-in-prompt-for-grammar-function" approach is a methodology failure mode. A LEGO whose entire content is "this is a Y/N question marker" doesn't meet the meaningful-unit constraint. The right approach is M-LEGO upchunking (see Principle 6).

### zho_for_eng

- **Atomic-meaningful lexical content (R1-R60):** 我 / 你 / 他 / 她 / 我们 / 你们 (pronouns; each meaningful alone), 想 / 要 / 会 / 能 / 可以 (modals; five distinct speech-act meanings), 不 / 没 (negators), 什么 / 怎么 / 谁 / 哪里 / 什么时候 / 为什么 (WH-words), 是 / 有 / 在 (copula / existential / locative; each meaningful as a content verb), 这 / 那 (demonstratives), 学 / 说 / 看 / 听 / 来 / 去 / 吃 / 喝 / 做 / 给 (core verbs), 朋友 / 时间 / 中文 / 朋友 / 今天 / 明天 / 累 / 好 (core content nouns + adjectives).
- **Grammatical particles requiring M-LEGO upchunking:** 吗 (Y/N Q particle), 了 (perfective + change-of-state), 着 (durative), 的 (possessive/modifier link), 吧 (suggestion softener), 呢 (topic-continuation Q), 啊 (softener-reaction). Each is functional, not referential — no English word maps 1:1.

### swe_for_ron

- **Atomic-meaningful lexical content (R1-R60):** jag / du / han / hon / vi / ni / de (subject pronouns), vill / kan / måste / ska / får (modals), inte (negation), här / där / nu / då (deictic content adverbs), vad / var / vem / när / hur / varför (WH-words), ja / nej / kanske (answer particles), och / men / eller (conjunctions), hus / bil / barn / mat / vatten (core nouns), äta / dricka / gå / komma / säga / göra / ha / vara (core verbs in infinitive).
- **Grammatical particles requiring M-LEGO upchunking:** -en / -et / -na (definite suffix), -ar / -or / -er / -n (plural endings), att (infinitive marker — atomic only in complementiser role at R80+, not at debut), sig / sin / sitt (reflexive markers), s-passive / s-genitive (bound morphology).

### hun_for_eng

- **Atomic-meaningful lexical content (R1-R30):** ház / víz / nagy / jó / megy / lát / most / igen / nem / én (each genuinely meaningful as a stand-alone wordform in Hungarian).
- **Grammatical particles requiring M-LEGO upchunking:** -t (accusative; allomorphs -t/-ot/-et/-öt/-at), -ban/-ben (inessive, vowel-harmonic), -nak/-nek (dative, vowel-harmonic), -e (Y/N question clitic), the entire definite-conjugation ending set (-om/-em/-öm, -od/-ed/-öd, -ja/-i, etc.), possessive suffixes (-m/-am/-em/-öm 1sg, etc.).

### Synthesis

The atomic-vs-chunked decision turns entirely on the meaningful-unit constraint. The three pairs differ in *which* items are meaningful units vs grammatical operators — Mandarin's sentence-final particles, Swedish's enclitic definite suffix, Hungarian's case-suffix-plus-vowel-harmony-allomorph cluster. The principle is the same; the inventory varies.

A common production-build failure mode is **over-chunking meaningful units** — e.g., production builds for zho_for_eng have chunked 我想 / 和你 / 学习 as M-LEGOs when 我 + 想, 跟 + 你, and atomic 学 are each meaningful units and should be atomic. The translation-choice checklist catches this.

The opposite failure mode is **trying to atomise grammatical operators** — e.g., introducing 吗 with an "as in (turns a statement into a yes/no question)" prompt. The "as in" clause is doing grammar-labelling, which the no-grammar-metadata rule forbids. Correct handling is M-LEGO upchunking (Principle 6).

---

## 3. Cliff front-loading

**Principle.** Six universal structural cliffs front-load in R6-R30 across nearly every language pair:

- Negation
- Y/N question marker
- Copula
- Past / perfective
- Existential / possession
- Locative

Each cliff multiplies producible surface against the prior inventory — adding a cliff doubles or triples what the learner can construct from the same R1-R(n-1) inventory. The cost denominator is bounded because the methodology's L1-conditional preference picks cheap surface forms when alternatives exist.

The cliffs' realisations vary across pairs: atomic words in some pairs, bound morphology in others, V2 syntactic patterns in still others. Where the cliff is bound morphology, it gets M-LEGO upchunked (see Principle 6); where it's a free word or content verb, it's atomic.

### zho_for_eng

Cliff positions across three v2 builds:

| Cliff | Realisation | R-position window |
|-------|-------------|-------------------|
| Negation | 不 | R7-R10 |
| Y/N Q | 吗 (M-LEGO upchunked) | R8-R20 |
| Copula | 是 | R16-R25 |
| Perfective | 了 (M-LEGO upchunked) | R17-R29 |
| Existential | 有 | R17-R29 |
| Locative | 在 | R19-R30 |

Production defers these significantly (不 R25, 是 R39, 了 R52, 在 R53). v2's earlier placement adds ~3× cumulative yield over the same R-range. **Cliff front-loading is the single biggest cumulative-yield-delta in the experiment.**

### swe_for_ron

| Cliff | Realisation | R-position |
|-------|-------------|------------|
| Negation | inte (atomic) | R7 |
| Y/N Q | V2 inversion (no particle; M-LEGO upchunked) | R30+ (8-12 paired M-LEGOs) |
| Copula | är (atomic; Romanian "e/este" parallel) | R6 |
| Past | -de/-te (M-LEGO upchunked); strong verbs deferred | R40-60 |
| Existential | det finns (M-LEGO upchunked) | R25-30 |
| Locative | i / på / hos (three atomic prepositions across three rounds) | R4-15 |

The Y/N cliff is the hardest item in this pair because Romanian uses intonation-only Y/N while Swedish requires V2 verb-subject inversion. No atomic shortcut available — must be drilled through paired declarative/interrogative M-LEGOs in R30-R60.

### hun_for_eng

| Cliff | Realisation | R-position |
|-------|-------------|------------|
| Negation | nem (atomic, pre-verbal) | R6 |
| Y/N Q | -e clitic (M-LEGO upchunked) + rising intonation for direct Q | R15 |
| Copula | vagyok/vagy (atomic wordforms); 3sg null in non-locative present | R19-R23 |
| Past | -t/-tt suffix (M-LEGO upchunked) + atomic past wordforms (volt, voltam) | R25-R26 atomic; M-LEGO carriers R40-R60 |
| Existential | van / nincs (atomic; nincs is fused neg-exist) | R23-R24 |
| Locative | itt/ott (atomic adverbs); case-suffix locatives (-ban/-ben etc.) M-LEGO upchunked | R21-R22 atomic; M-LEGOs R30-R50 |

The locative cliff is **multi-pronged** in Hungarian — inessive/superessive/adessive forced contrasts that English collapses to in/on/at. Methodology call: introduce one locative case (inessive) inside R6-R30 via M-LEGO carrier; defer the three-way contrast to a focused later round.

### Synthesis

Six cliffs, three pairs, three different bundling shapes. Mandarin and Hungarian put most cliffs in atomic wordforms or M-LEGO-upchunked free clitics. Swedish puts Y/N inside V2 syntax (no atomic, no clitic — pure word-order rule), forcing paired-M-LEGO drilling.

The methodology's invariant is **cliff front-loading in R6-R30 regardless of bundling**. Where the cliff is atomic, it lands as a LEGO. Where it's bound morphology, it lands as an M-LEGO carrier with overlap-inference. Where it's syntactic (V2), it lands as a series of paired exemplar M-LEGOs.

A production-build failure mode is treating cliffs as ordinary content LEGOs — they're not. They have outsize multiplier effects against the prior inventory. The translation-choice checklist enforces "if your translation of a SEED happens to include a structural cliff, atomise it (or front-load the M-LEGO carrier) even if the SEED itself doesn't focus on the cliff."

---

## 4. Paradigm balance

**Principle.** When a TYPE has core paradigm members (pronouns 1sg/2sg/3sg/1pl/2pl/3pl, modals, demonstratives, etc.), complete the paradigm before moving on, OR use chunked M-LEGOs that don't require atomic paradigm completion. A LEGO that introduces a TYPE but leaves the type half-built creates a learner with unusable productive surface: they can talk about themselves but not about others, they can negate the present but not the past, they can name "this" but not "that".

The paradigm shape varies by pair — pronoun system, modal system, demonstrative system, case system, conjugation matrix, definiteness matrix, register tier. The principle is the same: don't half-build.

### zho_for_eng

- **Pronoun paradigm:** 7 members (我/你/他/她/我们/你们/他们). Complete by R37-R44 in v2 builds; production never reaches 100% in R1-R548 — its chunked-pronoun style (我想 / 我要 / 和你) leaves 他/她 atomically unavailable, blocking 3rd-person reference categorically until very late.
- **Modal paradigm:** 5 members (想/要/会/能/可以) — five distinct speech acts. Complete by R63 in v2 build C; later in v2 A/B (R196-R198).
- **Aspect paradigm:** 3 members (了/过/在) — perfective / experiential / progressive. Complete by R57 in v2 A; deferred in others.
- **WH paradigm:** 6 members (什么/怎么/谁/哪里/什么时候/为什么). Production reaches 100% by R51 (faster than any v2 build) — production's WH-completion is methodology-correct; v2 should match.

Production's pronoun paradigm gap is the methodology's clearest paradigm-balance failure — it gives the learner 1st/2nd-person reference but never atomically opens 3rd-person reference, making the entire personal-narrative move unavailable until well past R100.

### swe_for_ron

- **Pronoun paradigm:** 6+ members (jag/du/han/hon/vi/ni/de + den/det neuter-and-common 3sg non-human). Complete jag-de in R8-R12; den/det at R55 once gender is online. Romanian L1 has no neuter, so the 3sg non-human den/det split is a new category for the learner.
- **Gender × definiteness × number for nouns:** 8-cell matrix. Methodology call: complete singular indef + def in R19-R25 (en, ett, huset, bilen); defer plurals to R75-R100 once enough nouns are banked.
- **Modal paradigm:** 6 members (vill/kan/måste/ska/får/bör). Tricky — ska has no clean Romanian equivalent (Romanian's vrea + future is split differently). Methodology call: defer ska to R70+; complete vill/kan/måste in R13-R14.

The Swedish gender system is the paradigm's biggest stress: Romanian's three-gender (m/f/n collapsing to two in plural) doesn't port to Swedish's two-gender (common/neuter) cleanly. Methodology must teach the new categorisation, not just remap.

### hun_for_eng

- **Personal pronouns:** 6 members (én/te/ő/mi/ti/ők) + T/V layer (maga/ön). Complete in R16-R30; defer formal in R50+. Pair-specific gift: `ő` is gender-neutral — no he/she choice required.
- **Present indicative verbal conjugation:** 12-cell matrix per verb (indefinite × definite × 6 persons). The methodology's biggest stress point for this pair. Complete one anchor verb's 12 cells in R30-R80 (e.g., `lát`: látok / látsz / lát / látunk / láttok / látnak [indef] + látom / látod / látja / látjuk / látjátok / látják [def]). Pair-specific gotcha: definite/indefinite is **not** tense — it tracks direct-object definiteness. English has no parallel; methodology must teach via M-LEGO pairs.
- **Demonstratives:** ez/az with the same case-suffix paradigm as nouns. Concord (`ebben a házban` "in this house" — inessive on both ez and ház) is the first encounter with case-concord and is best handled as M-LEGO.

The definite-conjugation paradigm is the most extreme paradigm-completion challenge in any of the three pairs — 12 cells per verb where English has 2 (look / looks). Methodology must use **forced-contrast pairing** (never introduce a definite form in isolation) to keep the contrast salient.

### Synthesis

Three different paradigm shapes, three different stress levels. Mandarin's paradigm load is on pronouns + classifiers + WH + modal cluster. Swedish's is on gender × definiteness × number. Hungarian's is on the 12-cell verbal conjugation matrix.

The methodology's invariant is **paradigm-completion-before-paradigm-introduction-of-next**. Where the paradigm is small (Mandarin pronouns), full completion is cheap. Where it's large (Hungarian definite conjugation), completion requires careful sequencing within a focused window.

A production-build failure mode is **partial paradigm introduction by accident** — a SEED's translation happens to use 1sg + 2sg, the agent atomises those, then no SEED for several rounds happens to use 3sg, leaving the paradigm half-built. The translation-choice checklist forces the agent to check: "is the type this LEGO introduces sufficiently completed by R+20?"

---

## 5. L1-conditional sequencing

**Principle.** The optimal LEGO sequence is conditioned on the L1. Where the L1 has direct cognates, atomic introduction is cheaper. Where the L1 has parallel grammatical features, the learner can absorb the target's version faster. Where the L1 lacks a category entirely, more rounds are needed.

This is the principle that makes the synonym-choice methodology *pair-specific* rather than target-specific. The same target language, translated for different L1 speakers, has different optimal sequences. The classic example from the experiment: 不 lands at R25 in Mandarin-for-English (no L1 transparency) but at R4 in Mandarin-for-Spanish (Spanish "no" is a direct monosyllabic echo).

### zho_for_eng

- **Near-zero cognate density.** English provides no Sinitic cognates for everyday Mandarin content. Every atomic LEGO is fresh motor + fresh meaning.
- **No phonetic scaffolding for tones.** English doesn't lexicalise pitch; the tonal system is acquired from zero.
- **No structural scaffolding for classifiers.** English has count/mass distinction but no productive classifier system — Mandarin's classifier paradigm (一个/一只/一杯/一本) requires fresh acquisition.
- **Shared grammatical features:** SVO default; existence of WH-questions, modals, and copula (though Mandarin's 是 has narrower distribution than English "be").
- **Worked example:** "I want to learn Chinese" — the L1 provides "I" (cheap, atomic), "want" (cheap, atomic), "learn" (cheap, atomic), "Chinese" (cheap, atomic). The Mandarin atoms 我 / 想 / 学 / 中文 each require fresh motor programs but the *structural* shape (subject + modal + verb + object) is L1-parallel. Methodology call: atomise all four; the L1's structural scaffolding makes this efficient.

### swe_for_ron

- **Moderate cognate density via Latinate register.** Romanian and Swedish both have Latin/Greek loan layers (information, telefon, restaurang, polis, musik, idé, plan, system) plus shared English-Germanic loans in modern Romanian (computer, fotbal/fotboll, weekend). In the R150-R250 abstract-noun window, these are 30-40 free LEGOs.
- **Postposed definite article: methodology gift.** Romanian's casa/băiatul instinct ports almost directly to Swedish's huset/bilen. The learner skips the "isolate 'the' as a separate word" stage that English/French L1s have to pass through. Recommended: huset-type forms as atomic-feeling M-LEGOs from R22.
- **V2 syntax: no Romanian scaffold.** Romanian's flexible word order doesn't prepare the learner for Swedish's rigid V2 (the finite verb is always second). Must be drilled via paired inversion-demonstrating M-LEGOs in R30-R60.
- **Pitch accent: no Romanian scaffold.** Romanian has stress but not lexical pitch contrast. Tier-5 distinction; defer explicit minimal-pair drilling to R300+ or pod-only.
- **Worked example:** "the house" — Romanian L1 prompt: defer-no-stage-needed, atomic-feeling M-LEGO huset at R22. Same translation for English L1: would need a separate "the" stage. The L1 changes the LEGO inventory.

### hun_for_eng

- **Essentially zero cognate density on core vocabulary.** Hungarian is Uralic; English is Indo-European. No shared roots in everyday content. International loans (telefon, taxi, kávé, program) exist in formal register but don't help R1-R100 productive frames.
- **No grammatical scaffolding transfers.** English provides nothing for vowel harmony, case-marking, definite/indefinite verbal conjugation, T/V distinction, or pro-drop. Treat the L1 as offering lexical-cognate help only at the periphery and zero structural help.
- **Worked example 1 — divergent feature forces M-LEGO carrier.** "in (the) house" — English speakers want to atomise "in" → some Hungarian word. There is no Hungarian word for "in"; the meaning is carried by bound suffix -ban/-ben. No atomic LEGO for "in"; instead M-LEGO `házban` carries the suffix. Contrast with Romance-for-English where `in` would map cleanly to atomic `in/en/dans`.
- **Worked example 2 — L1 absence permits methodology to skip a category.** Gendered 3sg pronouns. English has he/she/it; Hungarian has `ő` (animate, no gender) and demonstrative `az` for inanimates. Atomic `ő` covers both English he and she. No M-LEGO for gender disambiguation needed.
- **Worked example 3 — L1 absence forces explicit contrast pairing.** Definite vs indefinite conjugation. English speakers have no internal sense of "the verb agrees with object-definiteness". Never debut a definite-conjugation form in isolation. Pair-introduce: `Látok egy házat` ("I see a house" — indef) immediately followed by `Látom a házat` ("I see the house" — def). The contrast IS the lesson.

### Synthesis

L1 conditioning is the principle that prevents methodology over-generalisation. The same target language, translated for different L1s, has different optimal LEGO sequences. The same SEED, translated for the same target, can require different LEGO choices depending on the learner's L1.

Three patterns the principle covers:
1. **Cognate density** — free LEGOs where the L1 shares roots (Latinate register in Romance-Germanic; near-zero in IE-vs-Uralic).
2. **Structural parallels** — gifts where the L1 shares a feature (Romanian postposed definite → Swedish enclitic definite); fresh acquisition required where it doesn't (English's gender system → Mandarin's classifier system).
3. **Category absences** — pair-specific paradigm bloat avoided where the L1 collapses a distinction the target also collapses (Hungarian's gender-neutral ő for English he/she/it); category-forced contrast required where the target makes a distinction the L1 doesn't (Hungarian definite/indefinite conjugation for English speakers).

An LLM applying the methodology to a new pair must read the L1 and the target separately, identify their cognate / structural / category overlaps, then make synonym-choice decisions that exploit the overlaps (cheap atomic where transparent) and accommodate the gaps (M-LEGO with extra exposure where opaque).

---

## 6. Grammatical-particle M-LEGO upchunking with "as in" pragmatic anchors

**The layer beneath this principle.** A language has *units of intention* (what the learner means — atomised, one-to-one, chosen deliberately) and *features of construction* (how the target assembles a thought — never atomised, never chosen, absorbed inside whole thoughts). Grammatical particles are construction-features: the learner never forms an intention to "say 吗" or "say 才", only to mean a whole thought the particle helps build. Atomising one is a *category error*, which is why a bare particle card never reads naturally. ZUT lives in the *production* direction on intentions, so a particle's one-target-to-many-English *reception* shadow is harmless — it is exactly what the carriers below exploit. Two consequences follow: (a) **consolidate, don't introduce** — a particle is made salient once enough host-thoughts already contain it (placement is *pull, not push*; the signal is that carrier phrases already exist in earlier baskets); (b) **gloss the whole intention, never the sub-word** — "just/only" imports the very fork ZUT forbids, so the gloss names the whole thought, not the particle.

**Principle.** Grammatical particles never get atomic LEGOs. They appear inside M-LEGOs whose L1 prompts use "as in <fuller contextual phrase>" to disambiguate **pragmatic context** (not grammatical function). Multiple M-LEGOs containing the same particle in varied content provide overlap-inference for the particle's function.

The "as in" clause is doing **pragmatic specificity**, not grammar description. "do you speak Chinese? — as in 'do you speak Chinese, I'd love someone to practise with'" tells the learner which version of "do you speak Chinese?" this is. It never says "turns the statement into a Y/N question". The no-grammar-metadata rule forbids the latter.

After 3-5 M-LEGOs containing the same particle in varied content, the learner has both (a) the pragmatic shading of each individual move, and (b) the abstract "X 吗" / "X-ban" / "X-en" pattern. Atomic productivity of the particle emerges via inference, even though the particle never has an atomic LEGO of its own.

**First-exposure realisation: the contrastive twin debut.** The particle's *first* appearance is itself two (or three) overlapping carriers that share it — A+B and A+C, A constant, B/C already-known — never a bare debut followed later by carriers. e.g. 她才开始 "she's only just started" + 我现在才懂 "I get it only now"; 把它放在桌子上 "put it on the table" + 把手举起来 "raise your hand up". Choose the frame geometry by particle type: for a content-bearing particle pair *different verb classes* (才 with an action verb vs a cognition verb) so it reads as general; for a structural one hold the *object* constant and vary only the verb (把 + same object, different verb) to isolate its move. Keep the English glosses near-but-different so the collapse is felt, not stated.

### zho_for_eng

Most important grammatical particle: **吗** (Y/N question marker, sentence-final).

Five M-LEGOs:

1. **你说中文吗?** — "do you speak Chinese? — as in 'do you speak Chinese, I'd love someone to practise with'"
2. **想吗?** — "do you want to? — as in 'okay then, but do you want to?'"
3. **是吗?** — "really? — as in 'really, are you sure?'"
4. **你会吗?** — "can you? — as in 'can you ride a bicycle?'"
5. **你有吗?** — "do you have one? — as in 'do you have any time today?'"

After five exposures the learner has 吗 in: full declarative + 吗 (question 1); modal-only + 吗 (question 2); copula + 吗 (question 3); ability-modal + 吗 (question 4); existential + 吗 (question 5). The pattern is overdetermined; atomic productivity follows.

### swe_for_ron

Most important grammatical particle: **-en/-et/-na** (definite suffix). (Swedish's V2 inversion is syntactic, not a particle; the definite suffix is the next-highest-frequency bound morphology and the most L1-exploitable thanks to Romanian's postposed article.)

Five M-LEGOs:

1. **huset** — "the house — as in 'we bought the house last year'"
2. **bilen** — "the car — as in 'the car is parked outside'"
3. **boken** — "the book — as in 'I finished the book on the train'"
4. **barnet** — "the child — as in 'the child is sleeping now'"
5. **flickorna** — "the girls — as in 'the girls are waiting outside'" (plural definite)

Across these the learner sees -en (common gender), -et (neuter gender), and -orna (plural definite) — three cells of the gender × number × definiteness matrix without naming the matrix abstractly. The Romanian L1's casa/băiatul/cărțile instinct anchors the suffix-pattern from item 1.

### hun_for_eng

Most important grammatical particle: **-ban/-ben** (inessive case, vowel-harmonic).

Five M-LEGOs:

1. **házban** — "in a house — as in 'I live in a house, not a flat'" (back-harmony stem `ház` → -ban)
2. **kertben** — "in the garden — as in 'the kids are playing in the garden'" (front-harmony stem `kert` → -ben)
3. **városban** — "in town — as in 'I work in town'" (back-harmony `város` → -ban)
4. **fejben** — "in (my) head — as in 'I worked it out in my head'" (front-harmony `fej` → -ben, metaphorical-location reading)
5. **időben** — "on time / in time — as in 'we got there in time for the train'" (front-harmony `idő` → -ben, temporal-domain reading)

After these the learner has -ban after back-harmony stems (ház, város), -ben after front-harmony stems (kert, fej, idő), and semantic range from physical container through geographic location through metaphorical/temporal extension. The overlap-inference target is three-fold: (1) the suffix means "in", (2) the choice between -ban and -ben tracks the stem's vowels, (3) the range is wider than physical containment. **No explicit grammar prompt** is given; the pattern emerges from the contrast.

### Synthesis

Three different particle types — sentence-final Y/N marker, enclitic definite suffix, vowel-harmonic case suffix — handled by the same M-LEGO upchunking method. The "as in" anchor consistently provides pragmatic specificity, never grammatical function-description.

A pair-specific consideration: the **number of M-LEGOs needed** for overlap-inference varies with the particle's productivity and the L1's transparency. Mandarin's 吗 is productive across nearly every declarative; 5 carriers is sufficient. Swedish's definite suffix has the Romanian L1 gift; 5 carriers is also sufficient. Hungarian's vowel-harmonic case suffix requires showing **both allomorphs** (-ban and -ben) to surface the harmony pattern; 5 carriers minimum with a 2-back / 3-front split.

The methodology canon should state: **for each grammatical particle in a new pair, identify the minimum varied-carriers needed to surface the function**. Three carriers if the particle is invariant and L1-parallel; five if it has allomorphs or unfamiliar function; more if both.

---

## 7. Pod-decoupling

**Principle.** SSi runs a parallel receptive-comprehension track (Listening Pods) covering greetings, polite formulas, and transactional scenarios (cafe, restaurant, market, hotel, pharmacy, directions, taxi). Items the pods cover exhaustively should NOT be atomised as LEGOs — they're acquired receptively, leaving LEGO slots for productive-generation content.

Exception: **frame-opener politeness LEGOs** earn slots even with pod overlap. "Please + V" is a productive frame that combines with the entire verb inventory; the formulaic restaurant-order phrase is pod-territory. The boundary is productivity, not frequency.

### zho_for_eng

- **Pod-covered, defer from LEGO:** 你好, 早上好, 下午好, 晚上好, 嗨, 再见, 明天见, 拜拜 (greetings); 谢谢, 非常感谢, 不客气, 没关系, 对不起, 不好意思, 请问 (polite formulas); 您要点什么, 来一份, 还要别的吗 (service-interaction openers); 拿铁, 美式, 卡布奇诺, 一杯, 一斤 (cafe/market transactional); 预订, 退房, 入住, 前台 (hotel transactional); 师傅 (taxi address form).
- **Frame-opener LEGOs (earn slots despite pod presence):** 请 (please + V — productive imperative-softener frame, atomic R30-R50); 谢谢 as productive turn-closer (atomic ~R50, even though pod-saturated, because productive use of "thanks" as an utterance-finisher is different from formulaic restaurant-thanks).

### swe_for_ron

- **Pod-covered:** Hej / Hejsan / Hej hej (greetings); Tack / Tack så mycket / Tusen tack (thanks); Varsågod ("you're welcome / here you go"); Hur mår du? / Hur är det? ("how are you?"); Trevligt att träffas ("nice to meet you"); En kaffe, tack (café); Notan, tack (bill); Ursäkta (attention-getter); Jag skulle vilja ha … (restaurant order frame); Vad kostar det? ("how much is it?").
- **Frame-opener LEGOs:** snälla ("please" — frame-opener for polite requests, atomic R65-R80); tack as productive turn-closer (atomic R50); ursäkta as productive self-repair opener (atomic R150).

### hun_for_eng

- **Pod-covered:** Szia / Sziasztok (informal hello sg/pl); Jó napot (formal "good day"); Viszlát / Viszontlátásra (informal/formal goodbye); Hogy vagy? / Hogy van? ("how are you?" fam/formal); Köszönöm szépen ("thank you very much"); Szívesen ("you're welcome"); Bocsánat / Elnézést ("sorry / excuse me"); Kérem a számlát ("the bill, please"); Mennyibe kerül? ("how much does it cost?"); Beszél angolul? ("do you speak English?", formal travel).
- **Frame-opener LEGOs:** kérek ("I'd like / I request" — productive request frame, atomic R11. Pods drill it in restaurant frames; atomic placement unlocks `kérek + N-acc` and `kérek + infinitive` productively); szeretnék ("I would like", conditional politeness — atomic ~R150); tessék ("here you go / go ahead / please" — multifunction politeness discourse-marker, atomic placement teaches productive deployment).

### Synthesis

Three pairs, similar pod-vs-LEGO division. The methodology's hard rule: **pod presence is not LEGO-disqualifying for productive frame-openers, but IS LEGO-disqualifying for frozen formulaic content.**

A common production-build failure mode is treating EVERY pod-covered item as automatically excluded from LEGOs — this misses the productive frame-openers. The reverse failure mode is treating no pod-coverage as relevant — this floods the LEGO inventory with formulaic content the pods will handle anyway.

The translation-choice checklist: for each candidate translation that overlaps a pod, ask "is this productive (frame-opener that combines with the inventory) or formulaic (whole utterance with no decompositional yield)?" Productive items earn LEGOs; formulaic items defer.

---

## 8. Mid-course frame-opener atomic placement (R200-R400)

**Principle.** High-value content frame-openers (verbs like let-allow, opine-think, decide, hope, plan, try; structural markers like disposal/object-fronting; modal expansions like need / be-able) should be atomically placed in R200-R400, not deferred to the long tail.

These verbs/markers have **multiplier effects** against the mature inventory — each combines with every banked complement-clause, object, and temporal adverb the learner has accumulated. Chunked-debut inside a specific SEED locks the verb into one collocation and forfeits the recombination payoff. Atomic placement at R200-R400 unlocks compositional novelty.

Production builds often chunk these into M-LEGOs inside specific seeds (e.g., "let me see" as a chunked M-LEGO instead of atomic 让 + 我 + 看). That's a translation-choice miss the experiment specifically surfaced.

### zho_for_eng

Mid-course atomic frame-openers from v2 build A (the experiment's highest-yield build at R548):

- **把** (R207) — disposal/object-fronting marker. Single biggest yield-decision in the experiment. v2 A places atomic at R207; production never atomises 把 in R1-R548 (only inside chunked SEEDs). Production loses ~150-200 cumulative yield points on this single decision.
- **觉得** (R231) — opinion/propositional-attitude opener. Combines with all banked declarative content to give "I think X" / "you think Y" / "she thinks Z".
- **让** (R256) — let / allow / cause. Combines with object + infinitive structure across the inventory.
- **得** (R370) — V-degree complement marker. Unlocks "V得很好/很慢/很清楚" against every adjective banked from R100 onward.

### swe_for_ron

- **låta** (R215) — let / allow. "Låt mig …" / "låt oss …" combines with every banked verb. Atomic = multiplier; chunked-into-seed = locked.
- **tycka** (R230) — to opine / think-have-opinion. Distinct from tänka (cognitive think) and tro (believe). Swedish makes a three-way split Romanian collapses into "a crede / a gândi". Atomic placement of all three across R230-R260 gives three productive frame-openers; chunked-into-seeds loses the contrast. **Common production miss:** atomising "tycka" only as "tycka om" (like-collocation), which buries the opine sense — wrong call.
- **bestämma** (R260) — decide. Combines with reflexive sig and att-clause for "Jag har bestämt mig för att …" frame.
- **hoppas** (R275) — hope. Deponent (-s always). Methodology call: introduce the surface form as the atom; don't try to teach the deponent pattern.
- **planera / försöka / behöva / hjälpa** (R195-R310) — additional frame-openers earning atomic placement in this window.

### hun_for_eng

- **hagyni** (R210) — let / allow. Combines with infinitive complements: `Hagyom (őt) menni` "I let him go". Productive multiplier across the verb inventory.
- **gondolni** (R220) — to think (that). Combines with `azt …, hogy` complementiser frame.
- **dönteni** (R240) — to decide. Pairs with -ról/-ről delative for "decide about X".
- **remélni** (R260) — to hope. Combines with hogy-clauses.
- **tervezni** (R280) — to plan.
- **próbálni** (R300) — to try. Pairs with infinitive.
- **kezdeni** (R320) — to begin. Pairs with infinitive AND illative case (`munkába kezd` "to start work").
- **fogni** (R340) — auxiliary "will" (future periphrasis). Atomic placement opens future-tense productivity without a separate cliff.

Pair-specific subtlety: several of these take case-marked complements (illative, delative). Methodology call: atomic placement of the frame-opener AND introduction of one canonical case-marked carrier alongside — without conflating them.

### Synthesis

The R200-R400 window is the methodology's biggest under-exploited opportunity. By R200 the structural cliffs have fired, the pronoun and modal paradigms are largely complete, and the learner has ~150 LEGOs of compositional partner inventory. Adding atomic frame-opener verbs at this point multiplies producible surface by the entire inventory.

Production builds typically defer these or chunk them into specific SEEDs. The translation-choice checklist: for any SEED in the R200-R400 window whose translation uses a let / opine / decide / hope / plan / try / begin verb, **atomise the verb explicitly, even if the SEED's content is a specific use-case**. The frame-opener earns its slot via the multiplier; the specific use-case is just one of many that will follow.

This is the single highest-leverage tactical refinement the experiment surfaced. v2 A's atomic 把 at R207 single-handedly explains a meaningful fraction of v2's cumulative-yield lead over production at R548.

---

## How to apply this checklist to a new pair

For a pair not covered by the worked examples (e.g., Polish for Italian, Korean for English, Hebrew for Arabic):

1. **Identify the L1's phonological inventory** — what phonemes does the L1 have? What distinctions does it make? What's tier-4 (rare in L1) and tier-5 (absent or contrast-blocked)?

2. **Identify the target's phonological inventory** — what phonemes does the target have? Which of those are tier-4/5 for L1 speakers? Use this for Principle 1 (phonetic-cost-aware compounding).

3. **Identify the target's grammatical particles vs lexical content** — what items are meaningful as standalone wordforms (Principle 2 atomic-eligible)? What items are bound morphology, clitics, or pure operators (Principle 6 M-LEGO-upchunked)?

4. **Identify the target's structural cliffs** — how does this target realise negation, Y/N question, copula, past, existential, locative? Atomic words? Bound suffixes? Syntactic rules (V2)? Use this for Principle 3 (cliff front-loading).

5. **Identify the target's core paradigms** — pronoun system, modal system, demonstrative system, case system, conjugation matrix, definiteness, register tier. Use this for Principle 4 (paradigm balance).

6. **Identify L1-target cognate density and structural overlaps** — where does the L1 provide direct cognates? Where does it share grammatical features (giving transparency)? Where does it lack the target's categories (requiring fresh acquisition)? Use this for Principle 5 (L1-conditional sequencing).

7. **Inventory the pods for this pair** — what content does the receptive track cover? What's formulaic (defer to pod) vs productive (LEGO slot)? Use this for Principle 7 (pod-decoupling).

8. **Identify the target's atomic frame-openers** — let / allow / opine / decide / hope / plan / try / begin verbs; structural markers like disposal/object-fronting; modal expansions. These earn atomic placement in R200-R400. Use this for Principle 8 (mid-course frame-opener placement).

The principles are pair-agnostic. The instantiations are pair-specific. An LLM applying this doc to a new pair extracts the principles from the three worked examples (zho_for_eng, swe_for_ron, hun_for_eng) and instantiates them for the new pair's phonology, morphology, lexical inventory, and L1-transparency profile.

---

## Position relative to existing methodology canon

This doc sits alongside:

- **`ralph-methodology.md`** — the canonical SSi methodology (LEGO units, BUILD/USE distinction, ZUT, vocabulary integrity, distinction ladder, audio-first doctrine, six-layer framework, round structure, two-mode workflow, atomic validation contract). Inherited unchanged.

- **`methodology-v2.md`** (where it exists) — the v2 single-power-per-cost scoring rule for LEGO selection.

**This synonym-choice-architecture doc operates at the SEED-translation step**, upstream of LEGO decomposition. The translator (human or LLM) generates 2-4 candidate target realisations of each English SEED, scores each against the eight principles, picks the winner. The winner is then decomposed into LEGOs and submitted to the existing course-builder pipeline.

The pipeline itself doesn't change. The validation gates (`POST /api/seed/complete` checking tiling / ZUT / vocabulary / phrase counts atomically) remain unchanged. What changes is the upstream agent behaviour — translators now have an explicit checklist for the synonym choice that determines what gets submitted.

The checklist's eight principles are the validated tactical refinements that emerged from a multi-round experiment comparing v2 LEGO-selection methodology to production's existing approach across the full R1-R548 zho_for_eng course. Each principle has empirical grounding in the experiment data; each has cross-pair worked examples (zho_for_eng + swe_for_ron + hun_for_eng) demonstrating that the principle is pair-agnostic.
