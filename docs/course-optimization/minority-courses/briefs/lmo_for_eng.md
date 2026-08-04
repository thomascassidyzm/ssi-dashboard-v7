# Lombard (`lmo_for_eng`) — Opus handoff brief

**Status:** Seeds 1–10 are locked and independently re-verified (Cherubini, Porta, MILCLASS conventions, Wikisource proverbs, lmo.wikipedia); Fable-level review is complete and further model review adds nothing. **Three seeds (3, 5, 7) are HELD** on unattested frames pending native check — do not decompose them. **Biggest risk going forward:** wrong-but-plausible Italianisms — Lombard is thin enough online that an Italian-shaped guess will read as correct to every automated check. When in doubt, flag; never invent.

---

## Orthography

**Standard chosen: WESTERN Lombard (Milanese), classical/literary orthography** (*ortografia milanese classica* — the Porta/Tessa/Cherubini tradition, as used in Western-Lombard articles on lmo.wikipedia and codified on lmo.wikipedia's MILCLASS conventions page). Chosen because it is the only Lombard convention with a deep attested corpus (Porta 1810s, Cherubini's dictionary, the 1851 *Raccolta de proverbi milanes*) to verify forms against. **Copy lmo.wikipedia's Western/Milanese articles, not its Eastern or unified-orthography ones.**

Hard rules (course-wide, already applied to seeds 1–10):

| Rule | Course form | REJECT (other orthographies / Italian) |
|---|---|---|
| /ø/ written **oeu** | voeuri, incoeu, coeur | vöri, incö (unified/NOL) |
| /y/ written **u** | pussee | püsee |
| Palatal glide **j** in quaj-words | quajcoss, quajghedun, quaj, mej | quaicoss, quaicòss |
| Milanese geminates kept | parolla | parola |
| Final-consonant devoicing baked into spelling | spess, fras, adess, lombard | spesso, frase, adesso |
| Accents **obligatory on infinitives** | parlà, imparà, dì, spiegà, regordà, podè, provà | parla, di |
| Accents facultative elsewhere — course locks: futures **unaccented** | faroo, provaroo | faròo |
| Infinitive+clitic **unaccented** | sforzamm, regordamm (Porta's *famm* pattern) | sforzàmm |
| Tonic pronouns **accented** | mì, tì | mi, ti (as tonic) |
| Classical lexeme shapes | **olter** (Porta 1814), **sicur**, **pratega** | alter, sicuro/segur, pratica |

Never mix conventions: *vöri, püsee, quaicoss, alter* are the **same words** in other orthographies and must not leak in, ever.

---

## Core grammar the builder needs

**Verb: 1sg present** (all of seeds 1–10) — ending **-i**, **no subject clitic**: *parli, voeuri, poss, son, hoo* (have). Never write *mì te parli* or clitic+1sg.

**Subject clitics are person-split** (invisible so far — all seeds are 1sg — and will surface abruptly at the first "you/he/she"):

| Person | Clitic | Example (parlà) | Confidence |
|---|---|---|---|
| 1sg (mì) | **none** | parli | locked (seeds 1–10) |
| 2sg (tì) | **te** (near-obligatory) | te parlet | high — verify exact -et ending on lmo.wikipedia before first use |
| 3sg m/f (lù/lee) | **el / la** | el parla, la parla | high |
| 1pl / 2pl / 3pl | — | parlom / parlee / parlen (approx.) | **medium — verify full paradigm against lmo.wikipedia Milanese grammar before first plural seed; do not guess** |

**Auxiliaries/irregulars in play:** *vess* 'be': 1sg **son** (*sont* only prevocalic/emphatic), 3sg *l'è*. *Podè* 'can': 1sg **poss** (course form; *podi* exists — never use), impersonal **se pò**. *Fà* 'do': fut. 1sg **faroo**.

**Progressive** = *vess dree a* + infinitive: *son dree a scriv* (lmo.wikipedia). THE signature Western construction; use it for every English "I'm X-ing (right now)".

**Future 1sg** = -aroo: *faroo, provaroo*. Unaccented (locked).

**Negation:** postverbal **minga** after the finite verb: *son minga sicur*. (Milanese also has *nò/no* variants — course uses minga only.)

**Articles:** m. *el* / *on*; f. *la* / *ona* (*on'* before fem. vowel: *on'oltra*). Bare noun for language names: *parlà lombard*, *on poo de lombard* — never *el lombard* after parlà (pending native confirm, Q6).

**con/cont** (Wikibooks-verified): **cont only before a vowel** (*cont on olter, cont el coeur*), **con before a consonant** (*con tì, con la…*). One LEGO, two surface forms — see Gotcha 4.

**Word order:** SVO, adverbs clause-final acceptable (*…adess*), *quell che* = 'what/that which', *de* + infinitive after adjectives (*sicur de podè*). Questions use enclitic inversion (*te parlet → parlet?*) — **not yet needed; verify with native before the first interrogative seed.**

**Gender agreement on predicates:** *sicur/sicura*, *on olter/on'oltra* — seeds default masculine speaker; must match the recording voice (Gotcha 10).

---

## LOCKED DECISIONS (contracts Opus must NOT break)

Register default: **informal 2sg (tì/te)** course-wide; courtesy forms are out of scope until a native call is made.

ZUT contracts — one known → exactly one target, everywhere:

- [ ] I want → **voeuri**
- [ ] to speak → **parlà**; I speak → **parli**
- [ ] to learn → **imparà**
- [ ] to say → **dì**
- [ ] to explain → **spiegà**
- [ ] to remember → **regordà** (transitive; Q3 may flip to regordàss — then seeds 6+10 change together)
- [ ] I'm …-ing (progressive) → **son dree a** + inf
- [ ] trying to → **provà a** (Q5 may flip to cercà de — then seeds 2, 6, 8 change together)
- [ ] I'm going to try to → **provaroo a**
- [ ] can (inf) → **podè**; I can → **poss**; one can/impersonal → **se pò** (three distinct knowns, three targets — keep separate)
- [ ] now → **adess** · today → **incoeu** (never swap)
- [ ] something → **quajcoss** · someone → **quajghedun**
- [ ] a word → **ona parolla** · the sentence → **la fras**
- [ ] a little (of) → **on poo de**
- [ ] with → **con/cont** (ONE lego, phonological alternation, see Gotcha 4)
- [ ] with you → **con tì**
- [ ] someone else / another → **on olter** (Q4 pending)
- [ ] not → **minga** (postverbal)
- [ ] sure → **sicur** (m.)
- [ ] what (rel.) → **quell che**
- [ ] whole → **tutt/tutta** + article (*tutta la fras*)
- [ ] Lombard (the language) → **lombard**, bare, no article
- [ ] HELD, do not reuse until native clears: **pussee X che se pò / che poss** ('as X as possible / as I can', seeds 3+7, shared fate) and **fà pratega de + inf** (seed 5)

---

## The 10 reference seeds

| n | English | Target | Gloss | Conf |
|---|---|---|---|---|
| 1 | I want to speak Lombard with you now | voeuri parlà lombard con tì adess | want-1SG speak-INF Lombard with you now | high |
| 2 | I'm trying to learn | son dree a provà a imparà | am-1SG behind at try-INF to learn-INF | high |
| 3 | how to speak as often as possible | come parlà pussee spess che se pò | how speak-INF more often that IMPERS can | **medium — HELD** |
| 4 | how to say something in Lombard | come dì quajcoss in lombard | how say-INF something in Lombard | high |
| 5 | I'm going to practise speaking with someone else | faroo pratega de parlà cont on olter | do-FUT.1SG practice of speak-INF with an other | **medium — HELD** |
| 6 | I'm trying to remember a word | son dree a provà a regordà ona parolla | am-1SG behind at try-INF to remember-INF a word | medium |
| 7 | I want to try as hard as I can today | voeuri sforzamm pussee che poss incoeu | want-1SG exert-INF-1SG.REFL more that can-1SG today | **medium — HELD** |
| 8 | I'm going to try to explain what I mean | provaroo a spiegà quell che voeuri dì | try-FUT.1SG to explain-INF that which want-1SG say-INF | high |
| 9 | I speak a little Lombard now | parli on poo de lombard adess | speak-1SG a little of Lombard now | high |
| 10 | I'm not sure if I can remember the whole sentence | son minga sicur de podè regordà tutta la fras | am-1SG not sure of can-INF remember-INF whole the sentence | high |

Rule-carrying notes: (1) *con tì* not *cont tì* — con/cont rule. (4) j-spelling *quajcoss* is the course convention. (5) *cont on* — cont before vowel; female speaker would need *cont on'oltra*. (7) impersonal *se pò* (seed 3) vs 1sg *poss* (seed 7) is deliberate and must be preserved. (8) 'what I mean' = *quell che voeuri dì* — no personal verb 'to mean' exists; always restructure this way. (10) 'not sure if I can' = *sicur de podè* — infinitive strategy, not a literal *se poss* clause.

---

## Worked decompositions (the pattern to copy)

**Seed 1** — *voeuri parlà lombard con tì adess*

| # | Known | Target | Note |
|---|---|---|---|
| 1 | I want | voeuri | 1sg, no clitic ever |
| 2 | to speak | parlà | accented infinitive |
| 3 | Lombard | lombard | bare — never add *el* |
| 4 | with you | **con tì** — SEALED | the con/cont alternation lives inside with-LEGOs; splitting 'with' off exposes two surface forms of one known and ZUT-collides |
| 5 | now | adess | |

**Seed 2** — *son dree a provà a imparà*

| # | Known | Target | Note |
|---|---|---|---|
| 1 | I'm | son | never *sont* pre-consonant |
| 2 | trying to | **dree a provà a** — SEALED | progressive particle *dree a* + welded preposition *a*; splitting strands a bare *a* or a bare *dree* with no learnable meaning |
| 3 | learn | imparà | |

**Seed 10** — *son minga sicur de podè regordà tutta la fras*

| # | Known | Target | Note |
|---|---|---|---|
| 1 | I'm | son | same LEGO as seed 2 — reuse, don't mint |
| 2 | not | minga | postverbal slot |
| 3 | sure | sicur | agrees with speaker gender |
| 4 | if I can | **de podè** — SEALED | restructured to infinitive; a split would tempt a literal *se poss* clause, which is the stiff/wrong option |
| 5 | remember | regordà | shared fate with seed 6 (Q3) |
| 6 | the whole sentence | **tutta la fras** — SEALED | *tutt-* carries agreement and drags the article after it; order is fixed |

General pattern: seal (a) prepositions welded to verbs (*provà **a***, *pratega **de***), (b) *con/cont* + complement, (c) *dree a* + anything, (d) agreement-carrying quantifiers + article (*tutta la*). Split freely at plain verb/noun/adverb boundaries. Every reused known must map to its existing target LEGO — check the contracts list before minting anything.

---

## Gotchas (each with the correct form)

1. **No standard exists.** Course = Western/Milanese, classical orthography, full stop. Verify against Western sources only; an Eastern or unified form is a different course.
2. **Orthography leaks:** *voeuri* not vöri; *pussee* not püsee; *quajcoss* not quaicoss; *olter* not alter. Same word, wrong convention = defect.
3. **Accents:** infinitives always accented (*parlà, dì*); futures and infinitive+clitic never (*faroo, sforzamm*); tonic pronouns accented (*mì, tì*).
4. **con/cont:** *cont* ONLY before vowels (*cont on olter*), *con* before consonants (*con tì*). One LEGO, two surface forms — decompose as one known or it ZUT-collides.
5. **Clitic cliff:** 1sg takes NO subject clitic (*voeuri, parli, son, poss*); 2sg/3sg clitics (*te / el / la*) are near-obligatory. Seeds 1–10 hide this entirely; the first 'you/he/she' seed must introduce the clitic as part of the verb LEGO (*te parlet* = 'you speak', one LEGO).
6. **poss vs podi vs se pò:** 1sg = *poss* (locked), impersonal = *se pò*. Never *podi*.
7. **Held frames:** *pussee X che se pò / che poss* (seeds 3+7 — whichever form the native approves applies to BOTH) and *fà pratega de + inf* (seed 5). No decomposition, no reuse, until cleared.
8. **Italian interference is the #1 failure mode.** *alter, sicuro, provare*-calques, inserted articles, un-devoiced finals — all read fine to an Italian-trained eye and are all wrong. Every "obvious" form needs a **Milanese** attestation (Cherubini / Porta / lmo.wikipedia Western / Milanese proverbs), never an Italian one.
9. **Devoiced spellings are correct:** *spess, fras, adess, lombard*. Do not "fix" toward *spesso, frase, adesso*.
10. **Speaker gender:** *sicur/sicura*, *on olter/on'oltra*. Seeds are masculine-default; lock the recording voice's gender before audio and sweep predicates for agreement.
11. **regordà vs regordàss:** transitive locked for now (seeds 6, 10). If the native flips it, both seeds change together and the unaccented infinitive+clitic convention applies (*regordamm*).
12. **No Lombard TTS exists.** Audio needs a human **dialect-speaking** Milanese voice — classical spelling-to-sound is nontrivial (*oeu* = /ø/, *u* = /y/, unwritten vowel length); an Italian reading the spellings will be wrong.

---

## Native-check questions

Blocking (seeds held until answered):
1. **Equative frame (seeds 3+7):** is *pussee spess che se pò* natural for 'as often as possible', or *el pussee spess possibil*, or other? Same frame 1sg: *voeuri sforzamm pussee che poss*? One answer applies to both seeds.
2. **Practise (seed 5):** is *faroo pratega de parlà* natural? If yes, *de* or *a*? If no: *me esercitaroo a parlà* or restructure?

Non-blocking but course-shaping:
3. *regordà* transitive vs *regordàss* reflexive (seeds 6, 10 — shared fate).
4. 'Someone else': *cont on olter* vs *con quajghedun d'olter* vs other.
5. 'Try to': *provà a* vs *cercà de* (seeds 2, 6, 8).
6. Bare language names: confirm *parlà lombard*, *on poo de lombard* — never *el lombard*.
7. Confirm *son dree / son minga* (*sont* prevocalic/emphatic only).
8. Adverb placement: clause-final *adess* vs fronted.
9. Orthography sanity-read of *voeuri, quajcoss, olter, parolla, sicur, fras, incoeu*.

New (surfaced by this handoff, needed before seeds 11+ reach those structures):
10. **Full 2sg/3sg/plural present paradigms** for parlà/vess/avè/podè, with clitics, in your speech (before the first non-1sg seed).
11. **Question formation:** enclitic inversion (*parlet?*) vs intonation-only — what do you actually say?
12. **Courtesy 'you':** what form does polite address take in living Milanese, if any (before any formal-register seed)?
13. **'Have' forms:** plain *hoo* vs *gh'hoo* distribution (before any possession seed).

---

## Instructions to Opus for continuing (seeds 11+)

1. **Reuse before minting.** For every new canonical seed, first map each English chunk against the LOCKED DECISIONS checklist. If a known already has a target, that target is mandatory — no synonyms, no re-translation.
2. **Attestation is the bar, not plausibility.** A new content word or frame goes in only if you can find it in Cherubini, Porta, the Milanese proverb corpus, or a Western-Lombard lmo.wikipedia article — in classical spelling. If your evidence is "this is how Italian does it," you have no evidence: mark `confidence: low`, add it to the native-check list, and choose the most conservative structure meanwhile.
3. **Restructure like seeds 8 and 10, don't calque:** 'what I mean' → *quell che voeuri dì*; 'sure if I can' → *sicur de podè*. When English uses a structure with no Milanese attestation, prefer the plain Romance infinitive/relative strategy over inventing a subordinate clause.
4. **Do not touch seeds 3, 5, 7** (no decomposition, no reuse of their held frames) until the native answers land; then apply the ruling to both equative seeds identically.
5. **The clitic cliff is yours.** The first seed containing 'you' or 'he/she' introduces subject clitics: build the verb LEGO with the clitic sealed in (*te parlet*), confirm the ending against lmo.wikipedia's Milanese conjugation first, and expect this to need a native pass (Q10).
6. **Thin zones — flag, never invent:** plural verb forms, question inversion, courtesy register, *avè/gh'* possession, object clitic placement, past tenses (none used yet — when needed, expect *hoo + participle* but verify participle shapes per verb). Anything in these zones ships as `confidence: low/medium` with an explicit native question appended to the list above.
7. **Every seed record keeps the discipline of seeds 1–10:** target in classical Milanese spelling, gloss, confidence, and a note citing the attestation for each non-trivial form. A form with no citation and no flag is a defect.
8. **Audio is gated:** no TTS exists (Gotcha 12); nothing here authorizes audio generation. Recording plans go through Kai with the voice-gender decision (Gotcha 10) resolved first.