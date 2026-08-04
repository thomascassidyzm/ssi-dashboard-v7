# Scottish Gaelic (`gla_for_eng`) — Opus handoff brief

**Status:** All 10 reference seeds survived independent re-verification 2026-07-06 with zero translation changes; every frame is attested in LearnGaelic/SpeakGaelic-grade sources. Fable was sufficient for seeds 1-10; this brief locks its judgments so Opus does not re-litigate them. **Native-check is still OPEN** on seeds 3 and 7 plus two register defaults (riut/ribh, seantans) — build on, but do not ship, before those resolve. **Biggest risk:** Opus inventing a simple present tense (Gaelic has none) or splitting sealed mutation-bearing chunks, silently breaking ZUT on 'with', 'now', 'if', and 'speak'.

## Orthography

**Standard: Gaelic Orthographic Conventions (GOC, 2009 revision) — the spelling used on gd.wikipedia.org, LearnGaelic.scot, and SpeakGaelic.** When in doubt, copy the form gd.wikipedia or LearnGaelic uses, in that order. Do not use pre-1981 or Irish spellings.

Hard rules:
- **Grave accents ONLY**: à è ì ò ù. Any acute accent (á é ó) is an instant reject — acutes are pre-GOC or Irish.
- **Broad/slender harmony** ('caol ri caol is leathann ri leathann'): consonants must be flanked by vowels of the same class (broad a/o/u, slender e/i) on both sides. A violation (e.g. *ionnsachaidh spelled *ionnsachidh) means the form is wrong or misremembered.
- **Hyphenated adverbs**: an-dràsta, an-diugh, a-nis, a-màireach, a-rithist. Unhyphenated 'a nis' / 'an drasta' (also missing the grave) are rejects.
- **Apostrophes are grammar, not decoration**: a' (progressive particle before consonant-VN, and the lenited article), 's (reduced agus/is), a dh' (infinitive particle before vowel sound). Never normalise these away.
- **t- prefix is lowercase with hyphen**: an t-seantans, an t-uisge. Never *an T-seantans, never fused *antseantans.
- Language name: **Gàidhlig** (bare), **a' Ghàidhlig** (with article, lenited). The learner-facing English name is "Scottish Gaelic".

## Core grammar the builder needs

**Word order: VSO.** Verb (or tha/chan eil/copula) first, then subject, then everything else.

**There is NO simple present tense.** Every English present/present-progressive maps to the periphrastic substantive-verb frame:

| English | Gaelic | Rule |
|---|---|---|
| I am / I'm X-ing | tha mi ag/a' [VN] | tha = substantive verb, present |
| I'm not | chan eil mi ... | negative of tha |
| am I? / Q | a bheil mi ...? | interrogative of tha |
| whether/if (indirect Q) | an [copula/verb] | see 'if' contract below |

The bare future (bruidhnidh mi) exists but is **not taught yet** — if Opus emits *bruidhnidh mi for "I speak", that is the #1 wrong output.

**ag / a' / a dh' alternation (mechanical, never optional):**

| Context | Form | Example |
|---|---|---|
| progressive, VN starts with vowel | ag | ag iarraidh, ag ionnsachadh |
| progressive, VN starts with consonant | a' | a' feuchainn, a' bruidhinn, a' dol |
| infinitive particle before consonant | a + lenition | a bhruidhinn, a chleachdadh |
| infinitive particle before vowel SOUND (incl. lenited f-, since fh is silent) | a dh' | a dh'fheuchainn, a dh'ionnsachadh |

**Lenition** inserts h after the initial consonant and changes the pronunciation (b→bh /v/, c→ch, f→fh silent, m→mh, etc.). L, n, r, sg/sm/sp/st don't lenite. Triggers used so far: infinitive particle a (a bhruidhinn), a' dol a (a chleachdadh), possessive mo (mo chuid), article on the language name (a' Ghàidhlig). **Lenited and radical forms are ONE lego in conditioned variants, never two vocabulary items.**

**Object placement — two regimes:**
1. **Direct object of a VN**: fronts before the VN with particle a + lenition → Gàidhlig **a bhruidhinn** (attested parallel: 'seo a leughadh').
2. **Preposition-governed object**: stays AFTER the preposition, never fronts → cuimhneachadh **air facal**, cuimhneachadh **air an t-seantans**.

**No verb 'to have'** — possession is `tha X aig Y`: tha Gàidhlig agam = "I have/speak Gaelic".

**Prepositional pronouns** (preposition fuses with pronoun) used so far:

| Base prep | +mi | +thu (sg) | +sibh (pol/pl) |
|---|---|---|---|
| aig (at) | agam | agad | agaibh |
| ri (to/against) | rium | riut | ribh |
| do (to/for) | dhomh | dhut | dhuibh |

**'can' is not a verb**: urrainn is a noun with the copula + do — 's urrainn dhomh (I can), an urrainn dhomh (can I / whether I can), chan urrainn dhomh (I can't).

**Relative future** (bhruidhneas, chanas, ghabhas) appears only inside sealed frames ('ciamar a ...', 'cho X 's a ghabhas'). It is not a taught tense; never gloss it as "will".

**t-prefixation**: masculine s+vowel-or-s+l/n/r noun after the article in prepositional position takes t- → air an t-seantans. The bare lego is seantans; the t- form exists only inside the article-bearing chunk.

## LOCKED DECISIONS (contracts Opus must NOT break)

ZUT mappings — one known → one target, course-wide:

- [ ] **'speak' → bruidhinn** (verb contexts). "I speak (a little) Gaelic" as a competence statement is the SEALED possession idiom tha (beagan) Gàidhlig agam (seed 9) — never emit a standalone lego 'I speak' = 'tha ... agam'.
- [ ] **'with' has TWO sealed targets, never a bare 'with' lego**: speak-TO 'with' = ri (riut), sealed to bruidhinn (seed 1); accompaniment 'with' = còmhla ri, sealed as 'còmhla ri cuideigin eile'-type chunks (seed 5). English known-side text must always disambiguate via the sealed chunk, never expose "with" alone.
- [ ] **'now' has TWO targets**: an-dràsta = right now / at this moment (seed 1); a-nis = now, as of this changed state (seed 9). Known-side glosses if both are ever exposed: "now (right now)" vs "now (these days / by now)".
- [ ] **'if' will need TWO targets**: whether-'if' before indirect questions = an (an urrainn dhomh, seed 10); conditional 'if' = ma/nan (NOT YET INTRODUCED). When conditional 'if' debuts, the known side must be split ("if (whether)" vs "if (in case)") — plan this at debut, not after collision.
- [ ] **'as X as possible/as I can' has two sealed frames**: cho X 's a ghabhas (seed 3) and cho X 's as urrainn dhomh (seed 7). Keep both sealed whole; do not treat them as interchangeable targets for one known.
- [ ] **Register default: riut (informal singular) for 'with you'** — provisional, pending native Q3. Use it consistently everywhere until the native ruling; if the ruling flips to ribh, it flips course-wide including seed 1.
- [ ] **'remember X' → cuimhneachadh air X** (always with air; object never fronts). One pattern only.
- [ ] **'try to X' → feuchainn ri X** (bare VN after ri). 'a' dol a dh'fheuchainn ri' for "going to try to".
- [ ] **'want' → tha X ag iarraidh** (+ bare VN complement, or fronted-object VN). 'bu toigh leam' (I'd like) is held in reserve as a DIFFERENT known ("I'd like") — never a second target for 'want'.
- [ ] **'going to' future → tha X a' dol a + lenited VN** (a dh' before vowel sound).
- [ ] **'my Gaelic' → mo chuid Gàidhlig** — languages take cuid with possessives. *mo Ghàidhlig is a reject.
- [ ] **'word' → facal**; **'sentence' → seantans** (pending native Q4); **'the whole sentence' → an t-seantans gu lèir** (gu lèir chosen over air fad to avoid double-air with cuimhnich air).
- [ ] **'learn' → ionnsachadh**; **'practise/use (a language)' → cleachdadh**; **'explain' → mìneachadh**; **'mean' → ciallachadh** (a' ciallachadh in 'dè tha mi a' ciallachadh').
- [ ] **'how to X (I)' → ciamar a [rel.fut] mi**, sealed whole (seeds 3/4) — 'ciamar a chanas mi' = "how to say", 'ciamar a bhruidhneas mi' = "how to speak".
- [ ] **'in Scottish Gaelic' → ann an Gàidhlig** (not anns a' Ghàidhlig) in the how-do-you-say formula.
- [ ] **'someone' → cuideigin**; **'something' → rudeigin**; **'else/other' → eile** (postposed).
- [ ] **'I'm not sure' → chan eil mi cinnteach**.

## The 10 reference seeds

| n | English | Target | Gloss | Conf |
|---|---|---|---|---|
| 1 | I want to speak Scottish Gaelic with you now | tha mi ag iarraidh Gàidhlig a bhruidhinn riut an-dràsta | be.PRES I at wanting Gaelic PART speak.VN(len) to-you.SG now | high |
| 2 | I'm trying to learn | tha mi a' feuchainn ri ionnsachadh | be.PRES I at trying.VN to learn.VN | high |
| 3 | how to speak as often as possible | ciamar a bhruidhneas mi cho tric 's a ghabhas | how REL speak.FUT.REL I as often 's REL takes (=as possible) | med-high |
| 4 | how to say something in Scottish Gaelic | ciamar a chanas mi rudeigin ann an Gàidhlig | how REL say.FUT.REL I something in Gaelic | high |
| 5 | I'm going to practise my Gaelic with someone else | tha mi a' dol a chleachdadh mo chuid Gàidhlig còmhla ri cuideigin eile | be.PRES I at going PART practise.VN(len) my portion.of Gaelic together-with someone other | high |
| 6 | I'm trying to remember a word | tha mi a' feuchainn ri cuimhneachadh air facal | be.PRES I at trying.VN to remember.VN on word | high |
| 7 | I want to try as hard as I can today | tha mi ag iarraidh feuchainn cho cruaidh 's as urrainn dhomh an-diugh | be.PRES I at wanting try.VN as hard 's COP.REL ability to-me today | med-high |
| 8 | I'm going to try to explain what I mean | tha mi a' dol a dh'fheuchainn ri mìneachadh dè tha mi a' ciallachadh | be.PRES I at going PART try.VN(len) to explain.VN what be.PRES I at meaning.VN | high |
| 9 | I speak a little Scottish Gaelic now | tha beagan Gàidhlig agam a-nis | be.PRES little.of Gaelic at-me now | high |
| 10 | I'm not sure if I can remember the whole sentence | chan eil mi cinnteach an urrainn dhomh cuimhneachadh air an t-seantans gu lèir | NEG be.PRES I certain Q ability to-me remember.VN on the t-sentence entirely | high |

Rule-carrying notes: (1) object fronting Gàidhlig a bhruidhinn; riut sealed to bruidhinn. (3/4) 'ciamar a + rel.fut + mi' sealed whole = "how to X"; never expose mi or gloss the rel. future. (5) mo chuid Gàidhlig obligatory; còmhla ri ≠ seed 1's ri. (7) deliberate pre-intro of urrainn+do before seed 10; fallback if native balks: 'tha mi a' dol a dhèanamh mo dhìcheall an-diugh' / "I'm going to do my best today". (9) whole seed is a sealed non-compositional pairing. (10) whether-'an', never ma/nan; t- form only inside the article chunk.

## Worked decompositions

**Seed 1** — tha mi ag iarraidh Gàidhlig a bhruidhinn riut an-dràsta

| # | Known | Target | Notes |
|---|---|---|---|
| 1 | I want | tha mi ag iarraidh | SEALED. Never split tha/mi/ag iarraidh — the learner has no tha-frame theory yet. |
| 2 | to speak Scottish Gaelic | Gàidhlig a bhruidhinn | SEALED. Object-fronting + lenition live inside; splitting exposes bhruidhinn as a "different word" from bruidhinn. |
| 3 | with you | riut | Sealed to the bruidhinn frame. NOT reusable for seed 5's 'with'. |
| 4 | now | an-dràsta | The right-now 'now'. Distinct lego from a-nis. |

**Seed 5** — tha mi a' dol a chleachdadh mo chuid Gàidhlig còmhla ri cuideigin eile

| # | Known | Target | Notes |
|---|---|---|---|
| 1 | I'm going | tha mi a' dol | SEALED frame; combines with #2. |
| 2 | to practise | a chleachdadh | SEALED — infinitive particle + lenition inseparable; the citation form cleachdadh never surfaces alone here. |
| 3 | my Gaelic | mo chuid Gàidhlig | SEALED — cuid is obligatory and untranslatable atom-by-atom; mo lenites chuid←cuid. |
| 4 | with someone else | còmhla ri cuideigin eile | SEALED as one chunk at debut. Later, once còmhla ri is established, cuideigin/eile may be freed — but 'with' alone must never become a lego. |

**Seed 10** — chan eil mi cinnteach an urrainn dhomh cuimhneachadh air an t-seantans gu lèir

| # | Known | Target | Notes |
|---|---|---|---|
| 1 | I'm not sure | chan eil mi cinnteach | SEALED. chan eil = negative tha; don't decompose the negation yet. |
| 2 | if I can | an urrainn dhomh | SEALED. Whether-'an' + noun urrainn + do-pronoun: three things the learner can't parse yet, one meaning they can. |
| 3 | remember | cuimhneachadh air | Seal air INTO the remember lego (known side just "remember") — matches seed 6, prevents a floating 'on'. |
| 4 | the whole sentence | an t-seantans gu lèir | SEALED. t- is article-conditioned; bare lego later is seantans without t-. |

Pattern for Opus: seal anything containing (a) a mutation, (b) a particle (a, a dh', an, 's), (c) a prepositional pronoun bound to a verb, or (d) a relative-future form. Free only atoms whose surface form is identical in isolation.

## Gotchas

1. **No simple present.** English present → tha X ag/a' + VN, always. *bruidhnidh mi for "I speak" = future tense = wrong.
2. **Relative future is not 'will'.** bhruidhneas/chanas/ghabhas live only inside sealed 'ciamar a...' / ''s a...' frames. Never gloss as future, never extract.
3. **Two 'with's.** ri/riut (speak to — seed 1) vs còmhla ri (together with — seed 5). No bare 'with' lego, ever.
4. **Two 'now's.** an-dràsta (this moment) vs a-nis (changed state). Disambiguate on the known side if both are exposed.
5. **'I speak Gaelic' is possession.** tha (beagan) Gàidhlig agam. Sealed idiom; 'I speak' = 'tha ... agam' as a lego is forbidden.
6. **Fronting is direct-object only.** Gàidhlig a bhruidhinn ✓; but cuimhneachadh air facal — air-governed objects NEVER front (*facal a chuimhneachadh air ✗).
7. **ag / a' / a dh' is mechanical.** ag + vowel-VN, a' + consonant-VN, a dh' + vowel SOUND (including fh-: a dh'fheuchainn).
8. **Lenited ≠ new word.** bruidhinn/bhruidhinn, cleachdadh/chleachdadh, feuchainn/fheuchainn, cuid/chuid are conditioned variants of one lego each.
9. **urrainn is a noun, 'if' before it is 'an'.** 's urrainn dhomh / an urrainn dhomh / chan urrainn dhomh. Conditional ma/nan in a whether-clause = wrong.
10. **GOC or reject:** graves only; an-dràsta / an-diugh / a-nis hyphenated; caol ri caol respected.
11. **t- stays in the article chunk.** air an t-seantans, but the bare noun is seantans.
12. **mo chuid Gàidhlig,** never *mo Ghàidhlig — the calque every builder produces.
13. **Two as-as frames, both sealed:** cho X 's a ghabhas / cho X 's as urrainn dhomh. Not interchangeable.

## Native-check questions

1. **Seed 3:** in the fragment "how to speak as often as possible", is 'ciamar a bhruidhneas mi...' natural, or only 'mar a bhruidhneas mi...' in this embedded/fragment position? (ciamar is unquestioned in seed 4's direct formula.)
2. **Seed 7:** does 'feuchainn cho cruaidh 's as urrainn dhomh' sound native or English-flavoured? Prefer ''s a ghabhas' in that slot, or 'mo dhìcheall a dhèanamh' instead? (Fallback prepared, see seed 7 note.)
3. **Register:** riut (informal sg) vs ribh as the course-wide default 'with you'? The winner applies from seed 1 onward, consistently.
4. **Seed 10:** is 'seantans' acceptable register, or rosg-rann/abairt? And 'air an t-seantans gu lèir' vs 'an t-seantans air fad' (despite double air)?
5. **Seed 8:** canonical spelling of the embedded question — 'dè tha mi a' ciallachadh' or 'dè a tha mi a' ciallachadh'? (Speech identical.)
6. **Seed 5:** 'còmhla ri cuideigin eile' or 'le cuideigin eile' for "with someone else"?
7. **Seed 9:** confirm a-nis (not an-dràsta) and that the sentence reads as competence ("I can speak a little Gaelic now"), not odd literal possession.
8. **Read all 10 aloud:** any verbal noun (feuchainn, ionnsachadh, cleachdadh, cuimhneachadh, mìneachadh, ciallachadh) or prepositional pronoun (riut, agam, dhomh) off for your dialect or for a broadcast-standard course?
9. **(New) Dialect baseline:** should this course target broadcast/Mid-Minch standard (LearnGaelic/BBC norm) explicitly, or lean Lewis/Skye? Affects future vocabulary calls (e.g. 'boy', 'girl', discourse particles) — get a ruling before seed ~30.
10. **(New) Future negatives/questions of tha:** when 'chan eil' and 'a bheil' debut as productive legos (seeds 11+ will need them), confirm any dialect preference between 'a bheil' and reduced "'eil" for audio.

## Instructions to Opus for continuing (seeds 11+)

**Workflow per new seed:**
1. Translate the English via the LOCKED DECISIONS table FIRST — if a word/frame already has a contract (speak, with, now, if, remember, try, want, going-to, my+language, as-as), reuse the exact established chunk. Do not synonym-shop.
2. Every English present/progressive → tha X ag/a' + VN. Check the ag/a'/a dh' table mechanically. Then check lenition triggers. Then check GOC spelling (graves, hyphens, caol ri caol) against gd.wikipedia/LearnGaelic — copy attested strings, don't compose from memory.
3. Classify each object: direct (fronts with a + lenition) vs preposition-governed (stays after prep, prep seals into the verb lego).
4. Decompose using the sealing rule from the worked examples: mutation, particle, bound prepositional pronoun, or relative future inside a chunk ⇒ seal it.

**When to flag instead of guess — Scottish Gaelic is thin in your training data; these areas are where you WILL hallucinate:**
- **Verbal-noun formation is irregular** (bruidhinn→bruidhinn, ionnsaich→ionnsachadh, feuch→feuchainn, cuimhnich→cuimhneachadh — four different patterns already). Never derive a VN by analogy. If you cannot find the exact VN attested (LearnGaelic dictionary, Am Faclair Beag), mark `confidence: low` and add to native-check.
- **Prepositional pronoun paradigms** (ri, aig, do, le, air, bho...) — use only forms you can attest; the tables are full of traps (rium vs riut vs ris).
- **Which preposition a verb governs** (cuimhnich AIR, feuch RI, coimhead AIR/RI...) — verb-preposition government is lexical and unguessable. Attest or flag.
- **Irregular verbs** (abair/can, rach, dèan, faic, faigh, cluinn, thoir, ruig, beir) have suppletive stems across tenses. Any new tense of these: attest or flag.
- **Copula (is) vs tha**: identity/classification sentences ("I'm a teacher", "it's good that...") need the copula system, which is NOT yet introduced. When a seed forces it, treat the whole copula frame as a new sealed chunk, verify against LearnGaelic, and flag for native review.
- **Past tense** (lenition + dh' for vowels: bhruidhinn mi, dh'ionnsaich mi) and **future** (-idh) are not yet introduced. At their debut, seal the first instances and add the tense rule to this brief's grammar table.
- **Numbers, dates, gendered nouns after the article** (am/an/a'/an t-), and **slenderising plurals** are all mutation minefields — attest every form.

**Consistency discipline:** before writing any seed, grep your seed set for every content word of the English — if the word has appeared, reuse its target verbatim (same mutation environment permitting). New English word + plausible Gaelic ≠ done: it needs an attested source or a `confidence: medium/low` flag. When two English words would map to one Gaelic target (or one English to two Gaelic), stop and design the ZUT split explicitly — add it to LOCKED DECISIONS — before emitting the seed.

**Do not ship** until native-check Q1-Q4 (seed 3 ciamar/mar, seed 7 naturalness, riut/ribh default, seantans register) are resolved; if riut→ribh flips, sweep every 'with you' in the course, and if seed 7 flips to the dìcheall fallback, its English side changes too ("I'm going to do my best today") — update both sides atomically.