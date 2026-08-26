// _known_yor — KNOWN-LANGUAGE BRIEF for the Yoruba known-side agent. FIRST PASS (2026-08-26), ratified:null.
// KNOWN-LANGUAGE-level contract (is_known_default), not per-course: the loader falls back to this for every
// course whose KNOWN/prompt language is Yoruba. Today that is exactly one course — cym_for_yor (target
// Welsh, known Yoruba) — and this file is derived wholly from that corpus, read live from Supabase.
//
// WHY IT EXISTS: cym_for_yor was the estate's only course reporting UNCHECKED(no_contract) on the known
// side. Five decomposition agents policed Yoruba vocabulary discipline by eye across seeds 111–160 with no
// machine check, and a verifier that found nine Yoruba tokens first appearing in seeds 152–157 had to
// decline to say whether they were normal first introductions or untaught vocabulary. This brief is the
// instrument that answers that question. It does not fix content.
//
// RULE (Tom): no regex for language — this is the agent's REFERENCE KNOWLEDGE plus the minimum machinery
// configuration the v2 gate needs. Every count below was measured, not asserted.
//
// ── CORPUS THIS WAS DERIVED FROM ───────────────────────────────────────────────────────────────────────
// cym_for_yor as at 2026-08-26: 449 legos (+ their components) and 4,185 practice phrases across seeds
// 1–160, plus the 160 decomposed seed sentences = 4,794 known-side strings, 34,460 tokens, and — this is
// the single most important number in this file — only 275 DISTINCT TOKEN TYPES. The known side of this
// course is a very tightly controlled language. Course seeds run to 668, but legos exist only through
// seed 160; seeds 161–668 are authored Yoruba with no decomposition yet, so there is no introduced-vocab
// inventory for them and the gate must report them UNCHECKED, never green. (Their known text contains a
// further 329 token types unseen by seed 160 — the forward workload, not a defect.)
//
// ── TYPOLOGY ───────────────────────────────────────────────────────────────────────────────────────────
// Yoruba (Niger-Congo, Volta-Niger, SVO, prepositional) is written in an extended Latin alphabet with
// sub-dot letters (ẹ ọ ṣ) and three contrastive tones marked with acute (high), grave (low) and unmarked
// (mid). Words ARE whitespace-separated, so segmentation is 'space'.
//
// morphology is 'isolating', and that is a deliberate, load-bearing choice rather than a default. Yoruba
// has NO inflectional morphology at all: a verb never changes form for tense, person, number or aspect —
// all of that is carried by preverbal particles (ń, máa, ti, yóò, kò, kì í). There is therefore no
// morphological fog for an unmatched token to hide behind, and — unlike Arabic, Hindi or Korean, where an
// exact-match failure can never be a violation — in Yoruba an exact-match failure genuinely IS new
// vocabulary in almost every case. This is what gives the gate real discriminating power on this pair.
// The exceptions are enumerated below and handled explicitly; they are not left as a fudge factor.
//
// ── TONE MARKS ARE VOCABULARY. NORMALISE TO NFC AND STOP. ──────────────────────────────────────────────
// mo (1sg subject) / mọ̀ ('know') / mọ ('know', mid-tone variant) / mọ́ ('any more') are FOUR DIFFERENT
// WORDS, and all four are attested in this corpus with four different first positions (s1, s49, s17,
// s145). Likewise o 'you' (s11) / ó 'he/she' (s16) / ò NEG (s10); ti 'has/from' (s26) / tí REL (s8) / tó
// 'enough/as' (s3); ni 'be/is' (s33) / ní 'in/at/have' (s4). Any normalisation that folds tone or the
// sub-dot destroys the distinctions the gate exists to police. The estate's normalizeKnown already does
// the right thing (known-side-script.cjs:118 names Yoruba explicitly) — NFC, lowercase, strip cosmetic
// punctuation, KEEP all diacritics — and this brief depends on that and on nothing else.
// MEASURED: the live corpus is already byte-identical to its own NFC form, and the only combining marks
// present are U+0300 (grave) and U+0301 (acute), which sit on the sub-dot letters ẹ/ọ because Unicode has
// no precomposed ẹ̀/ẹ́/ọ̀/ọ́. A \p{L}-only token class would silently drop those two marks and merge ẹ̀/ẹ́/ẹ;
// the estate tokenizer includes \p{M}, so it does not. NFD input would break every lookup in this file —
// if a future writer path ever emits NFD, that is a bug upstream, not a thing to normalise around here.
//
// ── ARE THE HIGH-FREQUENCY GRAMMATICAL PARTICLES "TOKENS LIKE ANY OTHER"? YES. freeClass IS EMPTY. ──────
// This is the biggest single decision in this file, so here is the reasoning and the evidence.
// Yoruba's grammar lives in a small set of very high-frequency particles: ti, ni/ní, kí, bá, ṣe, o, mo, a,
// ń, máa, tó, tí, pé, kò, ò. In every other known-language brief on this estate the equivalent items are
// listed in freeClass, because English/Arabic/Hindi function words are genuinely never "introduced" as
// course vocabulary. IN THIS COURSE THEY ARE. Every one of those particles is taught as a lego or a lego
// component with a real first position: mo s1, láti s1, fẹ́ s1, ń s2, ṣe s3, bá s3, máa s3, ní s4, tí s8,
// pé s10, ò s10, o s11, kí s15, a s18, ti s26, ni s33, kò s34. Putting them in freeClass would switch the
// gate OFF over 60% of the corpus by token count and would hide exactly the class of error the course
// team is worried about — a grammatical particle used several seeds before the seed that teaches it.
// So: freeClass = [], npi = [], negation = []. Yoruba particles are tokens like any other and are checked
// against their introduction date like any other. The NPI and negation FACTS are still recorded, as prose
// in glossRules below, for the agent lane — they are just not wired to the machinery, because every path
// that consumes those three arrays in known-side-gate-v2.cjs (`freeClass.has → continue`,
// `negation.has → continue`, `npi.has + negated → continue`) makes the token unexaminable, and on this
// pair that is the wrong answer.
// MEASURED CONSEQUENCE, so this is not taken on faith: with all three arrays empty, checking every one of
// the 449 legos at its own seed produces ZERO high-confidence false positives, and the whole-corpus run
// flags 23 rows out of 4,794. An empty free class costs this gate nothing in noise and buys it everything
// in coverage. If a future Yoruba course teaches these particles differently, revisit this decision here
// and re-measure — do not copy an English freeClass into it.
//
// ── CONTRACTIONS AND ELISIONS: WHAT I DID ──────────────────────────────────────────────────────────────
// (1) THERE ARE NO APOSTROPHES. Measured: zero occurrences of ' ’ ‘ in 34,460 tokens. This orthography
//     writes elisions fused, not apostrophised, so the apostrophe hazard the estate carries for English,
//     Irish and Italian does not arise here and expandContractions is (correctly) not applied — that
//     switch is gated on known_lang === 'eng' in the gate and must stay that way.
// (2) PREPOSITION FUSION IS REAL, PERVASIVE, AND THE GATE CANNOT SEE THROUGH IT. ní 'in/at/on' and sí
//     'to' fuse with a following vowel-initial noun and take a tone with them: ní + alẹ́ → lálẹ́ 'at
//     night', ní + òní → lónìí 'today', ní + ọ̀la → lọ́la 'tomorrow', ní + àná → lánàá 'yesterday',
//     ní + ọwọ́ → lọ́wọ́, ní + ẹ̀yìn → lẹ́yìn, ní + inú → nínú, ní + ibí → níbí, sí + ilé → sílé,
//     ni + ó → ló. 23 of the 275 types begin with the fused l-/n-. This is structurally the same problem
//     _known_ara documents for Arabic proclitics: the gate's stemStrip removes SUFFIXES only, and no
//     suffix operation can relate lálẹ́ to alẹ́. The concrete cost in this course is visible and worth
//     naming: lálẹ́ is taught at seed 31 and the bare noun alẹ́ only at seed 154 — 123 seeds apart, two
//     unrelated tokens to the tokenizer, one word to the learner. I did NOT try to undo this with string
//     surgery. Undoing it requires knowing which l- is a fused ní and which is lexical (lọ 'go', lè
//     'can', lẹ́tà 'letter'), and that is a language judgment a stemmer must not make. The consequence is
//     COVERAGE LOSS, not false violations: a fused form and its bare noun are simply dated independently,
//     which is conservative in the right direction — it can under-report a "you already taught this",
//     never invent one.
// (3) VOWEL-HARMONY ALLOMORPHY OF THE 2SG OBJECT PRONOUN. The 2nd-person-singular object is ọ / ọ́, its
//     tone assimilating to the preceding verb. Both are attested; ọ́ is taught (lego at s62), ọ is not
//     taught anywhere and appears 16 times from s54. That is a real finding of the first run, not an
//     artefact — see the report. I deliberately did NOT fold ọ onto ọ́, because folding tone here would
//     also fold mo/mọ́, o/ó and ti/tí/tó, which are contrastive lexemes.
//
// ── THE ONE PIECE OF MORPHOLOGY YORUBA DOES HAVE, AND THE ONE PLACE I EXTENDED THE MACHINERY ───────────
// Yoruba forms a gerund/nominal from a verb by CV-REDUPLICATION: copy the verb's initial consonant, add
// a high-tone í, prefix it. sọ 'speak' → sísọ 'speaking'; ṣe 'do' → ṣíṣe 'doing'; kọ́ 'learn' → kíkọ́
// 'learning'; lo 'use' → lílo 'using'; rí 'see' → rírí 'seeing'; wá 'come' → wíwá; yí 'change' → yíyí;
// ràn 'help' → ríràn. This is derivation, not inflection, so it does not make Yoruba non-isolating — but
// it is a PREFIX, and the gate's stemStrip is suffix-only, so the gate structurally could not resolve it.
// Measured: 5 gerund types / 8 tokens in this corpus have no lego of their own (lílo, ríràn, rírí, wíwá,
// yíyí) while all five base verbs ARE taught, at or before the seed where the gerund appears.
// Rather than let those 8 tokens read as "never introduced" — a language judgment the string machinery is
// not entitled to make — I added ONE opt-in field, `reduplicativeNominal`, and a matching contract-driven
// resolver (resolveByReduplication in known-side-script.cjs). It is exactly parallel to stemStrip: it
// resolves a token to an already-introduced base and then dates it against that base, so a gerund of a
// verb taught LATER is still a violation. It runs only when this field is true, so no other course on the
// estate changes behaviour. THIS IS THE ONE DIVERGENCE FROM THE EXISTING PATTERN AND IT IS ADDITIVE.
// Its known limitation, stated rather than hidden: the shape is a string pattern, so it would also
// "resolve" pípé 'complete' (s137) onto pé 'that' (s10), which is etymologically wrong. It never fires
// there because pípé has a lego and exact match wins first; it would only misfire on a CíC-shaped token
// with no lego whose first two consonants happen to coincide. Any such hit must be read by a human.
//
// ── TOKENS AND CALLS I COULD NOT SETTLE (honest gaps) ──────────────────────────────────────────────────
//  • ọ (16×, from s54) vs ọ́ (47×, lego at s62) — see (3). I recorded the allomorphy but did not encode
//    it, so ọ is reported as untaught. I believe that report is correct and useful; a Yoruba speaker
//    should confirm whether the course intends to teach the two tone variants separately.
//  • gan (26×, s142) / an (26×, s142) — these are the two halves of gan-an 'very, exactly', split by the
//    hyphen in PUNCT_RE. They are dated identically so nothing mis-fires, but 'an' is not a Yoruba word
//    on its own and any downstream reader should know the hyphen is doing this.
//  • ì (19×, s153) and é (14×, s152) — single-vowel tokens from the counterfactual frames "Mi ì bá ti"
//    and "ṣe é yàtọ̀". Both are dated by legos at those seeds so they check out, but I could not
//    determine whether ì here is the negative-counterfactual particle in its own right or a fragment of
//    ìbá (s152, taught as one word "mo ìbá ti"). The course spells the same construction BOTH ways in
//    adjacent seeds — "mo ìbá ti" (s152) and "Mi ì bá ti" (s153) — and that inconsistency is a content
//    question for the Yoruba reviewer, not something this file should resolve.
//  • n (17×, s98) — bare n, distinct from the continuous marker ń. I could not tell from the corpus
//    whether this is a tone-unmarked spelling of ń or the 1sg subject variant. Left as its own token.
//  • Register/pronoun choice: this corpus is fixed to SINGULAR informal address (o / ọ / rẹ). The plural
//    or respectful ẹ / yín appears only as ẹ (41×, s73) and, past the decomposed range, yín. If a later
//    slice introduces respectful address as a live alternative, it is a new construction license and
//    every existing 2sg seed needs re-checking; it is not a silent variant.
//  • 'welsh' (482×) — the English word inside Yoruba text ("èdè Welsh"). Taught at s1 and correctly
//    handled, but it means the corpus is technically mixed-script-free yet mixed-LANGUAGE, and a future
//    language-contamination sweep should not read it as leakage.
module.exports = {
  course_code: '_known_yor',
  ratified: null,
  known_lang: 'yor',
  known_lang_name: 'Yoruba',
  is_known_default: true,

  // ── Tokenizer / outcome machinery ─────────────────────────────────────────────────────────────────
  script: 'Latn',
  segmentation: 'space',
  // NO inflectional morphology: tense/aspect/person are all free preverbal particles. An exact-match
  // failure therefore IS new vocabulary, subject only to the reduplication resolver below.
  morphology: 'isolating',

  // Empty BY EVIDENCE, not by omission: Yoruba is not suffixing and there is nothing for a suffix
  // stripper to buy. The one productive affix is the CV- gerund PREFIX, handled by the field below.
  stemStrip: [],
  stemMinLen: 2,

  // OPT-IN EXTENSION (this pair only). CV-reduplication gerund: C + í/ì/i + verb, where the copied
  // consonant must match the verb's initial. See the header for the mechanism and its one known
  // mis-analysis shape. Absent from every other contract, so nothing else on the estate changes.
  reduplicativeNominal: { vowels: ['í', 'ì', 'i'], requireConsonantCopy: true },

  // ── DELIBERATELY EMPTY — see the freeClass section of the header ───────────────────────────────────
  // Yoruba's grammatical particles are taught vocabulary in this course, with real first positions.
  // Listing them here would make them unexaminable and switch the gate off over most of the corpus.
  freeClass: [],
  npi: [],
  negation: [],

  // Reference only, and INERT while npi is empty (isNegated is consulted solely to license an NPI).
  // Correct as a description of Yoruba negation; kept so that a future agent lane can use it without
  // re-deriving it, and so it is obvious that leaving it out was a choice.
  negationMarkers: /(^|\s)(kò|ò|kì|má|mà|kọ́)(\s|$)/u,

  knownConstructions: [
    { id: 'preverbal-tam-particles', marker: 'ń / máa / ti / yóò / ó ti / máa ń', description: "Tense, aspect and mood are carried by INVARIANT PREVERBAL PARTICLES, never by the verb: ń continuous (816×, s2 'mo ń gbìyànjú' = I'm trying), máa future/habitual (318×, s3), ti perfect/completive (237×, s26 'mo bá ti mọ̀' = if I had known), yóò future (59×, s12). The verb itself is the same string in every tense. This is why morphology is 'isolating' and why a token that fails exact match is not shielded by a morphology objection. Each particle is a taught lego and is dated like any other word." },
    { id: 'negation-ko-o', marker: 'kò / ò / kì í / má', description: "Negation is preverbal and particle-borne: kò (387×, s34) the general negator, ò (673×, s10) its reduced form after a subject pronoun ('mo ò' = I don't, 'o kò' = you don't), kì (62×, s116) in the habitual negative kì í, and má (34×, s139) the prohibitive. There is no do-support and no verb change. All four are taught legos here — see the header on why they are NOT in the negation[] array." },
    { id: 'high-tone-subject-pronouns', marker: 'mo / o / ó / a / wọ́n vs mi / ọ / ọ́ / wa / wọn', description: "Subject and object pronouns are different words, and the difference is often only tone: mo 'I' (subject, 1824×, s1) vs mi 'me' (object, 958×, s10); o 'you' (subject, 840×, s11) vs ọ / ọ́ 'you' (object, s62); a 'we' (461×, s18) vs wa 'us' (31×, s111). Never treat a tone or sub-dot difference between two pronouns as a spelling variant — they are distinct lexemes with distinct introduction dates." },
    { id: 'ni-si-preposition-fusion', marker: 'lálẹ́ / lónìí / lọ́la / lánàá / lọ́wọ́ / nínú / níbí / sílé / ló', description: "ní 'in/at/on' and sí 'to' fuse with a following vowel-initial noun, changing its initial tone: ní + alẹ́ → lálẹ́, ní + òní → lónìí, sí + ilé → sílé, ni + ó → ló. 23 of 275 types carry this fusion. The fused form and the bare noun are unrelated strings to the tokenizer and are dated independently — lálẹ́ at s31, alẹ́ at s154. Structurally identical to the Arabic proclitic problem; the gate cannot detach them and must not try. Treat a fused form and its bare noun as ONE lemma when judging by hand." },
    { id: 'cv-reduplication-gerund', marker: 'sísọ / ṣíṣe / kíkọ́ / lílo / rírí / wíwá', description: "The only productive affix in the language: verb → gerund by copying the initial consonant and prefixing C+í. sọ→sísọ (s5), ṣe→ṣíṣe (s46), kọ́→kíkọ́ (s64), kà→kíkà, lo→lílo. Derivation, not inflection. Licensed at the base verb's debut by the reduplicativeNominal resolver; a gerund of a verb taught LATER is still a violation." },
    { id: 'ti-relative-and-complementiser', marker: 'tí / pé / tó', description: "tí (923×, s8) is the relativiser ('ohun tí o fẹ́' = what you want) and also heads temporal clauses with nígbà ('nígbà tí' = when, s16). pé (376×, s10) is the that-complementiser after verbs of saying/thinking. tó (483×, s3) is 'enough / as ... as / that which'. Three distinct high-frequency subordinators separated only by tone and vowel; do not collapse them." },
    { id: 'serial-verb-and-lati', marker: 'láti + V', description: "láti (1681×, rank 2, s1) is the infinitival 'to' and the backbone of the course's opening frame ('mo fẹ́ láti sọ' = I want to speak). It is a separate word, taught at s1, and is checked like any other token — English infinitival 'to' has a real Yoruba carrier here, unlike Arabic's أن." },
    { id: 'counterfactual-iba-ti', marker: 'ìbá ti / ì bá ti', description: "The counterfactual is the frame (pronoun) + ìbá + ti + V: 'Mo ìbá ti ṣe é yàtọ̀' = I would have done it differently (s152), negated as 'Mi ì bá ti sọ ọ́' (s153). The course spells the particle ìbá as one word in s152 and ì bá as two in s153 — see the honest-gaps note; that inconsistency is a content question for a Yoruba reviewer." },
  ],

  glossRules: [
    { id: 'tone-is-lexical-never-normalise', rule: "Tone and the sub-dot are contrastive orthography, not decoration. mo (1sg) / mọ ('know', s17) / mọ̀ ('know', s49) / mọ́ ('any more', s145) are four words with four introduction dates; so are o/ó/ò, ti/tí/tó, ni/ní. Normalise to NFC and lowercase and nothing else. Any audit, dedupe, containment check or 'fuzzy match' that strips diacritics on this course is producing nonsense, and any tokenizer whose character class is \\p{L} without \\p{M} silently deletes the acute and grave that sit on ẹ and ọ, because Unicode has no precomposed forms for those." },
    { id: 'particles-are-taught-vocabulary', rule: "Do not import an English-shaped free class. In this course the Yoruba grammatical particles (ti, ni, ní, kí, bá, ṣe, o, mo, a, ń, máa, kò, ò) are each taught by a specific lego at a specific seed, so treating them as 'free glue' would make the largest and most error-prone part of the known side unexaminable. They are checked against their introduction date exactly like content words." },
    { id: 'npi-inventory-reference-only', rule: "Yoruba's any-items — ohunkóhun 'anything' (14×, s35), ẹnikẹ́ni 'anyone' (15×, s71), níbìkíbi 'anywhere' (first at s182, past the decomposed range), rárá 'at all' (22×, s96), and the reduplicated kankan — are licensed in negative, interrogative, conditional and modal/desiderative environments and are odd in a plain positive declarative. That is recorded here as reference knowledge for an agent lane. It is NOT wired into npi[], because each of these items is a taught lego with a real first position and putting it in npi[] would exempt it from the introduction check under any negation — precisely the wrong trade on this pair, where the introduction check is the whole point." },
    { id: 'fused-preposition-is-one-lemma-by-hand', rule: "When judging by hand, treat a ní-/sí-fused form and its bare noun as ONE lemma: lálẹ́/alẹ́, lónìí/òní, lọ́la/ọ̀la, lánàá/àná, lọ́wọ́/ọwọ́, nínú/inú, sílé/ilé. The gate cannot, and dates them independently. A flag on a bare noun whose fused form was taught much earlier is a coverage artefact of that split, not a learner-facing defect — but a flag on a fused form whose bare noun is untaught is real." },
    { id: 'object-pronoun-tone-allomorphy', rule: "The 2sg object pronoun surfaces as ọ or ọ́ depending on the tone of the preceding verb ('fún ọ' = give you, 'sọ ọ́' = say it). They are one pronoun to a speaker and two tokens to the gate. Only ọ́ is taught (s62); ọ is not taught anywhere and is used 16 times from s54. Reported rather than folded, because folding tone here would also fold the contrastive pairs above." },
    { id: 'welsh-is-not-leakage', rule: "The English word 'Welsh' occurs 482 times inside Yoruba prompts, in the taught unit 'èdè Welsh' (s1) and its fusion 'ní èdè Welsh' → 'yn Gymraeg'. It is introduced vocabulary in this course. A language-contamination sweep must not read it as English leaking onto the known side." },
  ],
};
