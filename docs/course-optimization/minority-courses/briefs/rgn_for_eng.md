# Romagnol (`rgn_for_eng`) — Opus handoff brief

**Status:** Seeds 1–10 are locked reference drafts at overall **medium-low confidence** after a two-pass review grounded in primary sources (Vitali, *L'ortografia romagnola* 2008, read in full; la Ludla corpus; Wiktionary rgn lemmas). The function-word skeleton is primary-source confirmed; the open-class morphology (every 1SG vowel, reflexive enclitics, the practise/effort idioms, 'sentence') is inference over a corpus too thin to settle it. **Fable + primary sources took this as far as models can go — Opus must not "improve" the linguistics, only extend the pattern and flag.** Biggest risk: a native-check session (15 questions below, ~30 min) has NOT happened; nothing ships, and no audio is recorded, before it does. This is the least model-ready language of the Italian set.

---

## Orthography

**Standard chosen:** Grafia Romagnola Unificata / Schürr-derived spelling as used by **Daniele Vitali, *L'ortografia romagnola* (2008)** (PDF on dialettoromagnolo.it) and practiced in **la Ludla** back-issues (same site) — the largest living text corpus. Cross-checked against en.wikipedia "Romagnol" and Wiktionary Romagnol lemmas.

⚠️ **The grounding brief's pointer to rgn.wikipedia is WRONG — that wiki does not exist** (DNS fails; the combined Emilian-Romagnol wiki is eml.wikipedia.org). Do not go looking for it; use the sources above.

**Hard spelling rules (course-wide):**

| Rule | Form | Reject |
|---|---|---|
| Circumflex vowels are phonemic centering diphthongs | `ê ô` (imparê, rumagnôl, prôv) | "simplifying" to e/o, or Italianizing (imparare) |
| Masculine article written with apostrophe | `e'` (e' piò spès) | plain `e` (Vitali's own preference — we follow la Ludla) |
| Clitic particles spaced, never glued with apostrophes | `a n sò`, `u s pò` | `a'n sò`, `u's pò` |
| Elision of *che/se* before clitic vowel | `ch'a`, `ch'u`, `s'a` | unelided `che a` |
| Linker *ad* 'of/to': `ad` before consonant, `d'` before vowel | `ad scórar`, `d'imparê` | Vitali's spaced `d imparê`; mixed piecemeal "normalizing" either way |
| Accent convention **currently mixed — must be locked with native** | attested-bare `voj` (la Ludla style) sits beside marked `scór/pòs/prôv` (Vitali style) | sweeping one way without the native ruling (Q2/Q4) |
| 1st-conj infinitives end `-ê` (no -r) except liaison | `imparê`, but `imparêr a...` before vowel | writing `-êr` everywhere, or never |
| Endonym | `rumagnôl` (course standard) | rumagnùl, Rumagnöl — both live in sources; variance ≠ error |

**Accent-convention note (feeds TTS/recording scripts):** la Ludla omits the accent when stress falls where the Italian cognate has it (hence attested bare `voj`); Vitali marks everything except vowel-final paroxytones (would demand `vòj/vój`). ONE convention must be chosen at native check and all seeds swept before any recording script is generated.

---

## Core grammar the builder needs

**Subject clitics — obligatory, always present, fuse with negation and 'if':**

| Person | Clitic | Example |
|---|---|---|
| 1SG | `a` | a voj, a prôv, a scór |
| 2SG | `t` | (t + verb) |
| 3SG masc | `e` / `u` | e sëra; u s pò (impersonal) |
| 1PL | `a` | a n puten (attested) |

- Negation: **`a n` + verb, nothing else** — `a n sò sicur`. No post-verbal negator (that's Bolognese *brisa* — see gotchas).
- 'if' fuses: `s'a` = if-I (Vitali p.31: `a n e sò s'a s avdẽ`).
- **Decompose clitic+verb as ONE unit**: `a voj` = "I want". Never split `a` off as a standalone "I" LEGO.

**Infinitives:**

| Class | Shape | Examples | Liaison |
|---|---|---|---|
| 1st conj | `-ê` (r dropped) | imparê, spieghê, arcurdê(m) | `-êr` re-inserted before vowel-initial word: *andêr a cà*, *fêr un ṡbali* (Vitali p.29) |
| irregular retained -ar | `-ar` (unstressed) | scórar | keeps written -ar |
| others | bé, fnì, dì | — | same liaison rule |

- `-ê` infinitive and past participle are **homographs** (andê = andare AND andato).
- No seed 1–10 triggers liaison-r, but downstream phrases will: the same LEGO must surface as `imparê`/`imparêr` by context. **Decide the surface policy before phrase-building** (recommended: store lemma `imparê`, document the liaison alternant in the LEGO note, write the liaison form in phrase text where the next word is vowel-initial).

**1SG present ≠ 3SG/imperative stem (Vitali p.22):** apocope + vowel shift — *e sëra→a sèrr, e löta→a lòtt, e cãta→a caĩt, e médga→a midg*. Every 1SG in seeds 1–10 (`a prôv, a scór, a pòs, a voj, a sò`) is **inferred and systematically suspect** until a native pronounces them. Word-final ó does survive in closed syllables (amór, muradór), so `scór` is plausible — but only plausible.

**Future 1SG:** `-arò` on the attested model `a farò` (Vitali p.10) → `a pruvarò`. Unstressed-o reduction in the stem (pruv-, attested `pruvè`).

**Word order:** SVO, adverbs late (`adès`, `incù` clause-final in seeds 1/7/9). Relative 'that which' = `quel ch'` + clitic (`quel ch'a voj dì`).

**Reflexive enclitic on infinitive (UNRESOLVED):** modeled `-m` (arcurdêm, impignêm) on attested fêt/metmi; native must rule -m vs -um vs -am, or prefer clitic climbing (`a m pòs arcurdê`). One ruling covers seeds 6/7/10.

**Homograph alert — `sò`:** = 'I am' (*Me a sò*) AND 'I know' (*a sò «so»*, Vitali p.31). Seed 10's `a n sò sicur` is 'am'. Document per-use in decomposition notes.

---

## LOCKED DECISIONS (contracts Opus must NOT break)

ZUT mappings — one known → one target, course-wide:

- [ ] **'Romagnol' → `rumagnôl`** (bare, seeds 1/9); **'in Romagnol' → `in rumagnôl`** (seed 4 only — its English prompt contains 'in'; the mapping is transparent, no hidden preposition anywhere)
- [ ] **'I want' → `a voj`** (bare-voj spelling until accent convention locked)
- [ ] **'to speak' → `scórar`** (NOT parlé; Wiktionary lemma, keeps -ar)
- [ ] **'to say' → `dì`** (unaccented, attested)
- [ ] **attempt-'try' → `pruvê`** (seed 8 lineage) / **effort-'try hard' → `impignês`** (seed 7 lineage) — **the try-split is deliberate; merging them is a regression**
- [ ] **'to learn' → `imparê`**; **'to remember' → `arcurdês`** (enclitic form `arcurdêm` pending native ruling)
- [ ] **'something' → `quaicosa`**; **'someone' → `quaicadun`** (RF spelling, Vitali p.17)
- [ ] **'other/else' → `êtar`**; **'a word' → `una parola`**; **'a little (of)' → `un pô ad`** (attested `un pô a la vôlta`)
- [ ] **'now' → `adès`**; **'today' → `incù`** (central-RF; NOT Rimini oz/og)
- [ ] **'how' → `cmè`** (Ercolani only — provisional until Q5)
- [ ] **Linker after try/practise verbs: `ad` before consonant, `d'` (apostrophe, la Ludla style) before vowel** — consistent across seeds 2/5/6/8
- [ ] **Masc article = `e'`** (with apostrophe, la Ludla style) — apply course-wide
- [ ] **Negation = bare `a n` + verb** — never add a second negator
- [ ] **Dialect area = RF/central (Ravenna-Forlì)** — screen every new attestation for its area
- [ ] **Register:** seeds so far use only `te` ('cun te'); informal 2SG is the course default
- [ ] **Voice gender NOT YET LOCKED** — `sicur` (seed 10) is a masc placeholder; female voice ⇒ `sicura`. Blocks approval + recording
- [ ] **QUARANTINE: no downstream 'practise' phrases** until native supplies the real idiom (seed 5's `fê pratica ad` is unverified)
- [ ] **No TTS exists for Romagnol; assume human recording** — accent convention + 1SG vowels must be locked first

---

## The 10 reference seeds

| n | English | Target | Gloss | Conf. |
|---|---|---|---|---|
| 1 | I want to speak Romagnol with you now | a voj scórar rumagnôl cun te adès | I-CLIT want to-speak Romagnol with you now | medium |
| 2 | I'm trying to learn | a prôv d'imparê | I-CLIT try of to-learn | low-med |
| 3 | how to speak as often as possible | cmè scórar e' piò spès ch'u s pò | how to-speak the more often that-one can | low |
| 4 | how to say something in Romagnol | cmè dì quaicosa in rumagnôl | how to-say something in Romagnol | low-med |
| 5 | I'm going to practise speaking with someone else | a farò pratica ad scórar cun quaicadun êtar | I-CLIT will-do practice of to-speak with someone other | low |
| 6 | I'm trying to remember a word | a prôv d'arcurdêm una parola | I-CLIT try of to-remember-me a word | med-low |
| 7 | I want to try as hard as I can today | a voj impignêm piò ch'a pòs incù | I-CLIT want to-commit-myself more that-I can today | low |
| 8 | I'm going to try to explain what I mean | a pruvarò ad spieghê quel ch'a voj dì | I-CLIT will-try of to-explain that which-I want to-say | low-med |
| 9 | I speak a little Romagnol now | a scór un pô ad rumagnôl adès | I-CLIT speak a little of Romagnol now | med-low |
| 10 | I'm not sure if I can remember the whole sentence | a n sò sicur s'a pòs arcurdêm tota la frase | I-CLIT not am sure if-I can to-remember-me all-F the sentence | low-med |

Rule-carrying notes: **1** — bare object per Wiktionary's own example *Scórar Rumagnöl*; this is what keeps the rumagnôl / in rumagnôl ZUT clean. **3** — fragment continuing seed 2, lowercase by design; superlative-with-article is an Italian-model calque, unverified. **5** — weakest frame; `a farò` and `quaicadun` are literally attested, but the *fê pratica ad* idiom is quarantined. **8** — `spieghê` is a regularized Italianism, unverified lemma. **10** — structure primary-source confirmed against Vitali p.31 *a n e sò s'a s avdẽ*; `sicur`/`sicura` awaits voice lock; `la frase` unverified loan.

---

## Worked decompositions

**Seed 1 — `a voj scórar rumagnôl cun te adès`**

| Known | Target | Note |
|---|---|---|
| I want | `a voj` | SEALED — clitic never splits off |
| to speak | `scórar` | |
| Romagnol | `rumagnôl` | bare — no preposition LEGO here |
| with you | `cun te` | SEALED chunk |
| now | `adès` | |

**Seed 9 — `a scór un pô ad rumagnôl adès`**

| Known | Target | Note |
|---|---|---|
| I speak | `a scór` | SEALED (clitic+verb); 1SG vowel provisional |
| a little (of) | `un pô ad` | SEALED — the partitive `ad` lives INSIDE this chunk; never a floating `ad` LEGO |
| Romagnol | `rumagnôl` | same LEGO as seed 1 |
| now | `adès` | |

**Seed 10 — `a n sò sicur s'a pòs arcurdêm tota la frase`**

| Known | Target | Note |
|---|---|---|
| I'm not sure | `a n sò sicur` | SEALED — clitic+negator+verb+adj as one unit; `sò`='am' here (homograph with 'I know'); sicur→sicura if female voice |
| if I can | `s'a pòs` | SEALED — s' elision fused to clitic; never split `s'` off |
| to remember | `arcurdêm` | enclitic -m provisional (native ruling shared with 6/7) |
| the whole sentence | `tota la frase` | `la frase` unverified — recheck after Q11 |

**Pattern for Opus:** anything containing a subject clitic, negator, elided ch'/s', article, or enclitic is a SEALED multi-word chunk mapped to a natural English unit. Free-standing LEGOs are only content words with no particle attached (scórar, rumagnôl, adès, incù, una parola, quaicosa).

---

## Gotchas

1. **rgn.wikipedia does not exist.** Real sources: en.wikipedia "Romagnol", Vitali 2008 PDF (dialettoromagnolo.it), la Ludla back-issues (same site), Wiktionary rgn lemmas, Ercolani/romagnazone vocabularies.
2. **Endonym instability is real cross-source variance, not an error**: rumagnôl / rumagnùl / Rumagnöl all live. Course = `rumagnôl` until native rules.
3. **Liaison-r** (Vitali p.29): imparê → imparêr before a vowel-initial word. Seeds 1–10 never trigger it; downstream phrases will. Same LEGO, two surfaces — policy documented above; also -ê infinitive = past participle homograph.
4. **1SG ≠ 3SG stem** (Vitali p.22): every 1SG vowel in the course is inferred. Do not treat `a prôv / a scór / a pòs` as confirmed; do not build rhymes/patterns on their vowels.
5. **`e` is four homographs**: article e', 3SG masc clitic, object clitic 'lo' (*a n e sò* = "I don't know IT"), conjunction. **Never allow a floating one-letter `e` LEGO** — keep every `e`/`e'` glued to its chunk.
6. **Subject clitics obligatory** and fuse with negation/'if' (`a n` + V; `s'a`). `a voj` decomposes as one unit = "I want".
7. **Two accent conventions coexist** (la Ludla minimal vs Vitali full); the seeds currently mix (bare `voj`, marked `scór/pòs/prôv`). Lock ONE with the native, then sweep — before any recording script.
8. **Negation is bare `a n` + verb.** A reviewer "fixing in" a post-verbal negator (brisa/breṡa) is importing Bolognese. Reject.
9. **Dialect-area drift**: RF vs Cesena vs Rimini vs Sarsina (incù vs oz/og; quaicadun vs quaicadóun). Course = RF/central. Screen every attestation's area before treating it as confirmation.
10. **ad → d' is aphaeresis** (initial a drops). Vitali writes `d imparê` (space); la Ludla writes `d'`. Course = `d'`. Don't let anyone normalize either way piecemeal.
11. **No Romagnol TTS.** Italian voices destroy ê/ô centering diphthongs, final devoiced clusters, nasal vowels. Human recording only; accent + 1SG decisions are prerequisites.
12. **'Practise' frame quarantined** (seed 5): `fê pratica ad` + inf is unverified idiom. Zero downstream 'practise' phrases until the native supplies the real expression.
13. **try-split enforced**: `pruvê` = attempt-try ONLY; `impignês` = effort-try ONLY. Merging them back is a regression.

---

## Native-check questions

1. Endonym: rumagnôl / rumagnùl / rumagnöl — spelling, sound, capitalization in running text? (Locks seeds 1/4/9 + course name.)
2. 'I want': a voj / a vòj / a vój — vowel quality, and which accent convention should the whole course follow (la Ludla-minimal vs Vitali-full)?
3. After 'speak'/'say': bare object or preposition? `a voj scórar rumagnôl` vs `scórar in rumagnôl`; is `in` right in `dì quaicosa in rumagnôl`?
4. Pronounce the 1SG presents slowly: 'I try' (prôv/próv/pruv?), 'I speak' (scór/scòr/scur?), 'I can' (pòs?), 'I am' (sò?).
5. 'How': cmè, cum, cumè, or côma for your area?
6. 'As often as possible': is `e' piò spès ch'u s pò` natural? Is the article needed/wrong/optional? Alternative shape?
7. Real way to say 'to practise (speaking)': is `fê pratica ad scórar` acceptable, or reflexive / `êssar drì a` / other idiom?
8. 'To try hard': does `impignês` exist for you? Give "I want to try hard today" in your own words.
9. Reflexive 1SG enclitic on -ê infinitives: arcurdêm / arcurdêum / arcurdêam — or clitic climbing `a m pòs arcurdê`? (One ruling → seeds 6/7/10.)
10. 'Someone else': `quaicadun êtar` or just `un êtar`? 'Something': quaicosa / quicvèl / un quèl?
11. 'Sentence': la frase, la fras, or a native word? (Recurs constantly; blocks seed 10.)
12. Ongoing 'I'm trying to learn/remember': simple present `a prôv d'…` or progressive `a sò drì a …`?
13. Linker after 'try': `ad/d'` + infinitive, or `a` + infinitive?
14. Course voice male or female? (sicur vs sicura — blocks approval + recording.)
15. 'Today' = incù in your area, or oz/og? (Confirms central-RF anchoring.)

Additional (found while writing this brief): 16. Liaison-r in real speech — do you actually say `imparêr a` before a vowel, and should the course WRITE the -r there? 17. When `scórar` takes the liaison context, does the -ar shape ever change? 18. Is `quel ch'a voj dì` your natural "what I mean", or is there an idiom?

---

## Instructions to Opus for continuing (seeds 11+)

1. **Reuse before you translate.** Every chunk in the Locked Decisions checklist is a contract: if English contains "I want", the target contains `a voj` — never a synonym, never a respelling. Build new seeds by assembling locked chunks first, then translating only the genuinely new material.
2. **New 1SG verbs: construct, flag, never assert.** Take the 3SG/imperative or infinitive stem, apply apocope, mark the vowel as PROVISIONAL in the note (cite gotcha 4), set confidence low. Do not invent metaphony you can't attest.
3. **New vocabulary workflow:** search la Ludla back-issues and Wiktionary rgn first; then Ercolani/romagnazone; note the ATTESTATION AREA of anything found (gotcha 9 — Cesena/Rimini forms are evidence, not confirmation, for this RF-anchored course). If nothing attests, use the Italian cognate regularized into Vitali grafia, mark `unverified Italianism` (the `spieghê` pattern), confidence low, and add a native-check question. **Never leave a gap silently filled.**
4. **Where Romagnol is too thin to guess — mark low-confidence and DEFER, do not invent:** any 1SG or 2SG verb vowel; any reflexive enclitic; any idiom (practise, effort, "mean", phrasal expressions); any noun gender not attested; anything touching the progressive (`êssar drì a` unconfirmed); plural morphology (metaphony-driven, barely represented in seeds 1–10 — get native data before the first plural seed).
5. **Decomposition discipline:** copy the worked-decomposition pattern exactly — clitic+verb sealed, elided s'/ch' sealed with their clitic, `un pô ad` sealed, no floating `e` or `ad` LEGOs ever. Fragments continuing a prior seed stay lowercase (seed 3 pattern).
6. **Respect the quarantines:** no 'practise' phrases (gotcha 12); no phrases requiring the liaison-r surface until the policy is native-confirmed (or write the `-êr` form and flag it); no gendered predicate adjectives beyond `sicur` until voice is locked.
7. **When two sources disagree on spelling, that is expected** (gotcha 2/7): follow the course standard column in this brief, note the variance, do not "correct" locked seeds.
8. **Do not touch seeds 1–10.** They are the refined, twice-reviewed reference set; every change now goes through the native-check answers, not through model judgment.
9. **After the native session:** sweep ALL seeds for the accent convention, the 1SG vowels, the enclitic ruling, `cmè`, `la frase`, and the endonym in one atomic pass; update the Locked Decisions checklist; only then approve or script any recording.
10. **Confidence ceiling:** nothing in this course exceeds `medium` until a native has heard it. If you find yourself writing `high`, you have made an error.