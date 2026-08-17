// _lang_fra — LANGUAGE-LEVEL KNOWN-SIDE BRIEF for FRENCH AS THE KNOWN/PROMPT LANGUAGE.
// FIRST PASS (2026-08-17), ratified:null. Resolves for every course whose courses.known_lang
// is 'fra' and which has no course-specific <code>.contract.cjs override (loadPairContract
// precedence, validation.cjs). Today that is eng_for_fra (beta) and bre_for_fra (draft);
// it will cover any future *_for_fra without further work.
//
// DIALECT: this is an AGENT BRIEF, deliberately. It uses freeClass / npi / npiLicensing /
// negation / knownConstructions[{id,marker,description}] / glossRules, and it contains NO
// `test` regex, NO freeGlue and NO negationMarkers — so isMechanicalContract() returns FALSE
// and the gate routes every finding to ADVISORY. That is Kai's ruling of 2026-08-17: against
// a richly inflected Romance paradigm an exact-form matcher is TRIAGE, not pass/fail. It
// produces a list a human adjudicates; it must never fail a build.
//
// ── CALIBRATION ──
// Derived from the LIVE corpus, not from intuition: all 1,278 course_legos rows of the two
// French-known courses (eng_for_fra 648, bre_for_fra 630), tokenised with the repo's own
// tokenizeKnown/stemKnownGloss — 3,643 known-side tokens, 661 distinct stems. Example prompts
// cited below are real course_practice_phrases known_text from those two courses (seed numbers
// given). The free class below is the intersection of "high-frequency in that corpus" and
// "closed-class French function word", checked item by item against the frequency list.
//
// ── TYPOLOGICAL PROFILE, AND WHAT IT DOES TO EXACT-FORM MATCHING ──
// French is a Romance, SVO, fusional, NON-pro-drop language with two-part sentential negation,
// obligatory gender/number concord across the noun phrase and the participle, a clitic pronoun
// system that is phonologically and orthographically BOUND to the verb, and pervasive elision.
// Four consequences, each of which the gate cannot see and the adjudicator must:
//
//  1. VERB INFLECTION IS THE DOMINANT FALSE-POSITIVE CLASS. Say this first because it is the
//     largest single fact about this contract. `stemKnownGloss` does no stemming at all (Tom's
//     rule, 2026-06-15: exact form or nothing). A French verb has dozens of surface forms, and
//     the corpus really uses them: vouloir alone appears as veux(21) veut(14) voulais(14)
//     voulait(12) voulions(5) voulons(4) voulaient(4) veulent(3) voudrais…; parler as parler(18)
//     parles(5) parle(4) parlent(3) parlé; aimer as j'aime(4) n'aime(4) aiment(3) j'aimerais(2).
//     Every one of those is a DISTINCT stem to the matcher. Introducing "je veux" at S1 licenses
//     nothing about "il voulait" at S52. Expect a large majority of `unknown gloss` findings on
//     a French-known course to be inflections of an already-introduced lexeme. They are not
//     defects; they are the matcher's blindness. Only a finding whose LEMMA is absent from the
//     introduced inventory is a candidate real breach.
//  2. ELISION FUSES FUNCTION WORDS ONTO CONTENT WORDS INSIDE ONE TOKEN. tokenizeKnown treats
//     the apostrophe as word-internal (the split class is /[^\p{L}\p{M}']+/u), so j'ai, c'est,
//     n'ai, m'aider, qu'il, l'heure, d'accord are each ONE token. 90 of the 661 distinct stems
//     in this corpus (13.6%) contain an apostrophe. This is why freeClass below lists the
//     wholly-functional elided combinations (c'est, qu'il, qu'elle, qu'on, d'un, s'il, n'est …)
//     explicitly: they are the only ones that can be freed safely. An elided form whose second
//     element is lexical — j'ai, m'aider, l'aurais, t'inquiéter — CANNOT be freed without freeing
//     the verb inside it, so those stay out and will be flagged. That is the deliberate trade.
//  3. CLITIC PRONOUNS ARE BOUND AND ORDERED. me/te/se/le/la/les/lui/leur/y/en sit between the
//     subject and the verb (je te suis reconnaissante, S142; je l'aurais fait, S152), attach to
//     the infinitive with a hyphen or elision (m'aider, t'aide, te voir), and follow a fixed
//     order. The hyphenated ones DO split into separate tokens (hyphen is a separator), so those
//     are handled by the free class; the elided ones do not (point 2).
//  4. NEGATION IS TWO-PART AND ONE OF ITS PARTS IS ONE LETTER. See `negation` and the honest
//     gap note below — this is where the brief-dialect gate is weakest on French.
//
// ── HONEST GAP: NEGATION DETECTION IS SUBSTRING-BASED HERE, AND FRENCH IS THE WORST CASE ──
// checkKnownSide has no negationMarkers regex under a brief contract, so it decides "is this
// prompt negated?" by asking whether any `negation` string occurs as a SUBSTRING of the prompt.
// French's negative particle is `ne` (and elided `n'`), which is a substring of prochaine,
// personne, jeune, semaine, entendu, venir…; `plus` and `ni` are similarly short. MEASURED on the
// 5,240 build/use/practice prompts of eng_for_fra (2026-08-17): the substring test calls 42.0% of
// prompts negated, while a word-boundary regex over the same marker list calls 27.8% negated — so
// 744 prompts (14.2%) are FALSELY read as negated. That is the worst rate of the four Romance
// briefs, tied with Italian. The NPI check is therefore DEGRADED, not inert: it still fired 34
// times on this course, but roughly one in seven prompts is silently exempted from it. The true
// markers stay in `negation` — the list is also the adjudicator's reference, and removing `ne`
// would misdescribe the language to buy back a check that a two-word discontinuous particle
// cannot support in a substring test. The npiLicensing prose below is written for the HUMAN/agent
// adjudicator first. A real fix needs a mechanical contract with a word-boundary negationMarkers
// regex (/\bne\b|\bn['’]|\bpas\b|\bjamais\b|\brien\b|\baucun/i) and is out of scope for a brief.
//
// ── TOKENS I COULD NOT CONFIDENTLY CLASSIFY, AND LEFT OUT OF freeClass ──
//   • `plus` (28) and `moins` (5): degree adverbs ('more'/'less') AND the negative particle of
//     `ne … plus` ('no longer'). Freed as degree words below; flagged here because a `plus` in a
//     negative clause is machinery, not degree, and the two readings are indistinguishable to
//     an exact-form matcher.
//   • `personne` (3): 'nobody' (NPI) and 'person' (noun) are the same string. Listed in `npi`,
//     but a `personne` finding may be the ordinary noun — always check the prompt.
//   • `rien` (6), `encore` (9), `jamais`: NPI/aspectual, listed under npi rather than freeClass.
//   • `tout/toute/tous/toutes` (15/6/…): quantifier, pronoun ('everything') and adverb ('quite').
//     Freed as a quantifier; the pronoun reading is arguably content and I have not split it.
//   • `même` (14): 'same' (adjective, content) vs 'even' (adverb, glue) vs `moi-même`. Left OUT
//     of freeClass — the adjectival reading dominates in this corpus ("en même temps", S62).
//   • `bien` (19), `là` (8), `donc` (3), `alors`: discourse/degree particles that shade into
//     content ("parler bien" is 'speak well'). Left OUT; they will be flagged and adjudicated.
//   • `on` (5): impersonal/1pl subject pronoun — genuinely free, and INCLUDED, but note it is
//     also a substring problem in the other direction (it is a whole token here, so this is safe).
//   • `y` (6) and `en` (23): clitic pro-forms AND, for `en`, a preposition. Both freed; the
//     conflation is harmless because both readings are function words.
module.exports = {
  course_code: '_lang_fra',
  ratified: null,
  known_lang: 'fra',
  known_lang_name: 'French',

  // Free class — closed-class French function words, corpus-derived (every item below occurs in
  // the eng_for_fra/bre_for_fra lego corpus or is a paradigm-mate of one that does).
  // NOTE ON THE COPULA: present-tense être forms (suis/es/est/sommes/êtes/sont) are freed here,
  // exactly as _default_eng frees is/are/am/be. PAST and FUTURE copula forms (était, sera, serait,
  // j'étais) are deliberately NOT freed — SSi teaches tense explicitly, so a past copula is a
  // taught form, not glue. The perfect auxiliary avoir (j'ai, avons, avait) is likewise NOT free:
  // it is machinery licensed by the compound-past construction below, mirroring English 'have'.
  freeClass: [
    // articles + partitives + the elided article
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l',
    // preposition+article contractions
    'au', 'aux',
    // prepositions
    'à', 'en', 'dans', 'avec', 'pour', 'sur', 'sous', 'par', 'sans', 'chez', 'vers',
    'entre', 'depuis', 'pendant', 'après', 'avant', 'contre',
    // subject pronouns (French is NOT pro-drop — these are obligatory, hence pure glue)
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    // object / reflexive / adverbial clitics
    'me', 'te', 'se', 'lui', 'leur', 'y',
    // stressed (disjunctive) pronouns
    'moi', 'toi', 'soi', 'eux', 'elles',
    // possessive determiners
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'notre', 'nos', 'votre', 'vos', 'leurs',
    // demonstratives
    'ce', 'cet', 'cette', 'ces', 'ça', 'cela', 'ceci', 'celui', 'celle', 'ceux',
    // relatives / complementisers / conjunctions
    'que', 'qui', 'dont', 'et', 'ou', 'mais', 'si', 'car', 'donc', 'comme', 'parce',
    // degree / quantity adverbs
    'très', 'plus', 'moins', 'aussi', 'trop', 'peu', 'beaucoup', 'assez',
    'tout', 'toute', 'tous', 'toutes', 'quelques', 'quelque',
    // present-tense copula (être) only — see note above
    'suis', 'es', 'est', 'sommes', 'êtes', 'sont',
    // wholly-functional elided combinations (both elements are themselves free)
    "c'est", "qu'il", "qu'elle", "qu'ils", "qu'elles", "qu'on", "s'il",
    "d'un", "d'une", "d'autre", "n'est", "l'on",
  ],

  // NPI / negative-concord items. See the honest gap above: the matcher cannot police these on
  // French. This list and its licensing prose are the ADJUDICATOR's reference.
  npi: ['rien', 'personne', 'aucun', 'aucune', 'jamais', 'encore', 'nulle'],
  npiLicensing: {
    rule: "French negative-polarity behaviour splits three ways and the split matters more than the list. (A) NEGATIVE-CONCORD ITEMS — rien 'nothing', personne 'nobody', aucun(e) 'no/any', nulle part 'nowhere', jamais 'never/ever'. In modern French these are the SECOND element of a bipartite negation: `ne` + item, with NO `pas` (je ne vois rien, NOT *je ne vois pas rien). They are therefore not 'licensed by' negation so much as they ARE the negation, and a prompt containing one is a negative prompt even though the word 'pas' never appears. An adjudicator who looks only for `pas` will misread every one of these as a positive declarative containing a stray NPI. (B) TRUE POLARITY-SENSITIVE ITEMS — `encore` ('yet' under negation: je ne comprends pas encore, S78 eng_for_fra; 'still/more' in a positive: encore un mot), and `non plus` ('either'). These have the Tamil-இன்னும் shape: one French form, polarity-conditioned English rendering. (C) FREE-CHOICE / EXISTENTIAL INDEFINITES — quelque chose, quelqu'un, quelque part. These are NOT NPIs: they are perfectly grammatical in a plain positive declarative meaning 'something/someone/somewhere' (tu as vu quelque chose là-bas ?, S182; je voulais te demander quelque chose, S119) and they ALSO extend to 'anything/anyone' under a question or negation. A quelque-form in a positive declarative is NEVER a violation, and the corpus uses them exactly this way. The only thing that would be a genuine violation is a class-(A) item standing in a clause with no `ne` and no other non-veridical licenser — and because `ne` is routinely dropped in the spoken register the course models, even that is weak evidence. Treat any NPI finding on a French known side as a prompt to READ THE SENTENCE, never as a verdict.",
    licensedIn: [
      "Sentential negation ne … pas / ne … plus / ne … jamais / ne … rien / ne … personne / ne … aucun, INCLUDING the very common spoken-register form with `ne` dropped (c'est pas possible)",
      "Negative infinitives — ne pas + infinitive (je suis désolé de ne pas pouvoir voir …, bre_for_fra S140)",
      "Yes/no questions in all three French formations: rising intonation (tu as vu quelque chose ?), est-ce que (est-ce que je peux te voir samedi soir ?, bre_for_fra S154), and subject–verb inversion (as-tu vu …)",
      "Wh-questions and embedded interrogatives with ce que / si (je ne sais pas si je suis prêt, bre_for_fra S80; je ne sais pas ce que tu as fait, bre_for_fra S185)",
      "Conditional clauses headed by si (si tu peux parler, S90; si j'avais su ce que tu voulais, S152)",
      "Comparatives with plus/moins … que and the superlative (plus fatigué que la nuit dernière, S42; aussi souvent que possible, S11)",
      "Volitional / desiderative predicates — vouloir, aimer/aimerais, avoir besoin de, and the subjunctive complements they take (avant que tu partes, S119)",
      "Restrictive ne … que ('only'), seul(e) and juste",
      "Doubt / denial predicates and their subjunctive complements (je ne suis pas sûr que …), and modal pouvoir/devoir under negation",
    ],
  },

  // Negation markers — reference list. `ne`/`n'` is the syntactic negator; the second element
  // carries the meaning. See the substring-detection gap in the header.
  negation: ['ne', "n'", 'pas', 'jamais', 'rien', 'personne', 'aucun', 'ni', 'non', 'plus'],

  // French machinery the adjudicator licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: 'bipartite_negation', marker: "ne … pas", description: "French sentential negation is DISCONTINUOUS: a preverbal clitic `ne` (elided `n'` before a vowel) plus a postverbal item — pas (plain), plus ('no longer'), jamais ('never'), rien ('nothing'), personne ('nobody'), aucun ('no'), que ('only'). One English `not` maps to a two-token French frame that wraps the finite verb (je ne comprends pas, S78; elle ne voulait pas me dire la vérité, S71; ce n'était pas possible, bre_for_fra S86). With an infinitive both parts precede it (ne pas pouvoir). In the spoken register the course teaches, `ne` is frequently dropped, so the SAME negation surfaces with one token or two. Licensed once, as a frame — never tile `ne` and `pas` as two separate English glosses, and never read a `pas`-less `ne … rien` as positive." },
    { id: 'obligatory_subject_pronoun', marker: 'je / tu / il / elle / on / nous / vous / ils', description: "Unlike Spanish, Italian and Portuguese, French is NOT pro-drop: the subject clitic is obligatory even when the verb ending is unambiguous (je veux, S1 — never bare *veux). The subject pronouns are therefore pure grammatical glue on the known side and are freed unconditionally. Corollary for ZUT: English 'I want' and French 'je veux' are one-to-one, with none of the optional-pronoun ambiguity the other three Romance languages carry. `on` is the register-neutral 1pl/impersonal subject ('we'/'one'/'they') and collapses with `nous` into English 'we'." },
    { id: 'clitic_pronoun_placement', marker: "me / te / se / le / la / les / lui / leur / y / en", description: "Object, reflexive and adverbial pronouns are BOUND proclitics: they stand between subject and finite verb in a fixed order (je te suis reconnaissante, S142; je me suis réveillée, S147; je l'aurais fait, S152), attach to a governing infinitive by elision or hyphen (m'aider, t'aide, te voir, te demander), and invert to enclitics in the affirmative imperative (dis-moi). `y` (locative/oblique pro-form) and `en` (partitive/genitive pro-form) have no English word at all — English realises them as nothing or as 'about it/of it/there' (j'aimerais y penser, S37). Licensed as one placement construction at the first clitic debut; the English side must not tile them." },
    { id: 'elision_liaison', marker: "j' / n' / l' / d' / qu' / m' / t' / s' / c'", description: "Before a vowel or mute h, a monosyllabic function word loses its vowel and fuses orthographically with the next word: je→j', ne→n', le/la→l', de→d', que→qu', me→m', te→t', se→s', ce→c'. This is orthography, not morphology, and it is invisible to English. It is also the single biggest mechanical hazard on this known side (13.6% of distinct corpus stems), because the tokenizer treats the apostrophe as word-internal and produces j'ai / m'aider / l'heure as single tokens. Licensed at the first elided form; the adjudicator must mentally de-elide before deciding whether a gloss is genuinely new." },
    { id: 'article_contraction', marker: 'au / aux / du / des', description: "à + le → au, à + les → aux, de + le → du, de + les → des. The contraction is obligatory and carries both the preposition and the definite article in one token (au bureau, S201; parler du problème). English 'to the' / 'of the' / 'from the' collapse into it. Free glue — never require a separate introduction for the article inside a contraction." },
    { id: 'gender_number_concord', marker: 'prêt / prête ; content / contente ; -s / -es', description: "Determiners, adjectives and (with être, or with a preceding direct object) past participles agree in gender and number with the noun. The corpus shows both members of several pairs on the same lemma: prêt(15) vs prête ('presque prête à partir', S27); content(3)/contente(3); désolé; réveillée (S147); aidé vs aidée. English has ONE form for all of them. This is a many-French→one-English (ZUT-legal) collapse driven by the SPEAKER'S and the referent's gender, not by anything English encodes. Licensed at the first agreeing adjective; each agreement variant is the SAME gloss, and an exact-form matcher that sees `contente` after `content` was introduced will wrongly call it unknown." },
    { id: 'compound_past', marker: "j'ai fait / je suis allé(e)", description: "The passé composé — auxiliary avoir OR être in the present + past participle — is the ordinary past of spoken French and covers BOTH English simple past and English present perfect (j'ai appris = 'I learned' and 'I have learned'; je suis sorti samedi, bre_for_fra S220). Auxiliary selection is lexical: être for reflexives and a closed set of motion/change verbs (je me suis réveillée, S147; je suis sorti), avoir elsewhere, and the être-auxiliary participle then agrees in gender/number. The auxiliary is MACHINERY, not vocabulary — the English analogue of the 'have' entry in KNOWN_GRAMMAR — and it is deliberately NOT in freeClass so that its debut is visible; license it once here rather than treating j'ai / avons / avait as three new content words." },
    { id: 'imperfect_vs_compound_past', marker: 'voulais / voulait / était / avais', description: "French splits past reference two ways where English uses one form: imparfait for background, habit and states (je voulais te demander …, S119; ce n'était pas possible; j'avais su), passé composé for bounded events. English 'I wanted' maps to voulais OR ai voulu depending on aspect, which is a one-English→many-French choice the authoring must make deliberately (it is a translation-choice decision in the sense of synonym-choice-architecture.md, applied before decomposition). Licensed as a tense construction at the first imperfect form; every imperfect ending (-ais/-ait/-ions/-aient) is inflection of an introduced lemma, not new vocabulary." },
    { id: 'periphrastic_future', marker: 'je vais + infinitif', description: "Near future = aller (present) + infinitive: je vais commencer à parler (bre_for_fra S23), vais(9), va(8), vas(4). It competes with the synthetic future (-rai/-ras/-ra: serai, pourra, seras) and with the present used futurally. English 'going to' and 'will' both map here, and the choice between vais-future and -rai-future is a register/immediacy distinction English does not mark. Licensed as one future construction covering both formations." },
    { id: 'conditional_and_politeness', marker: "j'aimerais / je voudrais / tu devrais / serait", description: "The conditional (-rais/-rait/-rions/-raient) does double duty: hypothetical apodosis (je l'aurais fait … si j'avais su, S152) and POLITE/soft assertion (j'aimerais pouvoir parler, S11; tu ne devrais pas attendre, S100; ce serait). English renders the second as 'would like' / 'should', which is why 'aimerais' and 'aime' must not be treated as unrelated words. Licensed as a mood construction." },
    { id: 'subjunctive', marker: 'que tu partes / que ça marche / qu\'il fasse', description: "The subjunctive is obligatory after certain conjunctions and predicates — avant que (avant que tu partes, S119), pour que (pour que ça marche, S94), bien que, il faut que, vouloir que (tu veux que je t'aide ?, S171), and after doubt/emotion. English has no morphological counterpart and simply uses the plain form, so every subjunctive form is a paradigm variant of an already-introduced verb that the matcher will read as new. Licensed as one mood construction at its first appearance." },
    { id: 'modals', marker: 'pouvoir / vouloir / devoir / falloir / savoir', description: "French expresses modality with FULL VERBS that inflect for person, tense and mood, not with invariant particles: pouvoir 'can/be able' (je peux t'aider, S62; je ne pourrai pas être là, S157; pouvait), vouloir 'want' (veux/veut/voulais/voulait/voulions/voulaient/veulent), devoir 'must/should' (dois, devais, devons, devrais), il faut 'one must', savoir 'know how'. One English modal therefore corresponds to a whole French paradigm (many-French→one-English), and conversely 'could' splits into pouvais / pourrais / ai pu. These are the highest-frequency verbs in the corpus and hence the highest-volume source of inflection false positives. License the modal paradigm as machinery at the lemma's debut." },
    { id: 'question_formation', marker: "est-ce que / qu'est-ce que / inversion / intonation", description: "French forms questions three ways, all of which correspond to English do-support or subject–auxiliary inversion: (a) rising intonation with declarative order — tu as vu quelque chose là-bas ? (S182), tu veux que je t'aide ? (S171); (b) the est-ce que frame — est-ce que je peux te voir samedi soir ? (bre_for_fra S154), qu'est-ce que tu as besoin de faire demain après-midi (bre_for_fra S179); (c) subject–verb inversion — as-tu vu. English do/does/did have NO French counterpart: they are absorbed by the frame. Licensed once as a question construction; never tile 'do' as a separate French gloss, and note that qu'est-ce que tokenises as qu'est + ce + que." },
    { id: 'reflexive_verbs', marker: 'se souvenir / se sentir / s\'inquiéter', description: "A large class of French verbs is inherently or derivationally reflexive and takes a clitic agreeing with the subject: je me souviens (S57), je me suis réveillée (S147), tu devrais t'inquiéter (S105), se sentir, s'assurer (bre_for_fra S200), s'entraîner. The English equivalent usually has no reflexive at all ('remember', 'feel', 'worry'). The reflexive clitic is machinery, and its person-varying surface (me/te/se/nous/vous) plus elision (m'/t'/s') multiplies forms of one lemma. Licensed at the first reflexive verb." },
    { id: 'existential_il_y_a', marker: 'il y a', description: "Existential 'there is/there are' is the fixed three-token frame il y a (s'il y a du temps, bre_for_fra S44), past il y avait. It is non-compositional — il is a dummy subject, y the locative clitic, a the verb avoir — and must be licensed as a whole unit, not tiled as 'he'+'there'+'has'." },
    { id: 'partitive_de', marker: 'du / de la / des / de', description: "French requires an overt partitive article where English uses a bare mass/plural noun: du temps ('time'), des erreurs ('mistakes', S47), beaucoup de nouveaux mots (bre_for_fra S109), and after a negation it reduces to bare de (pas de temps). English 'some' and the zero article both map here. Free glue; license once so the partitive is never mistaken for the preposition 'of'." },
    { id: 'tu_vous_address', marker: 'tu / vous', description: "The T/V split. `tu` (131 occurrences) is familiar-singular; `vous` (5) is polite-singular AND plural, with its own verb agreement (-ez) and possessives (votre/vos). Both collapse to English 'you'. These courses are overwhelmingly tu-based, which is a deliberate register choice; the few vous prompts are plural or politeness-marked. License both at their own debuts and see the ZUT rule below." },
  ],

  // Known-side ZUT / rendering rules.
  glossRules: [
    { id: 'tuVousCollapse', rule: "One English 'you' ⇄ French tu (familiar sg) OR vous (polite sg / any plural), with a whole agreeing paradigm behind each (tu veux / vous voulez, ton / votre, toi / vous). This is a many-French→one-English collapse driven by register and number, neither of which English marks. Do NOT invent an English contrast to carry it, and do NOT treat vous-forms as new vocabulary once the tu-forms are introduced — they are the same gloss in a different address register." },
    { id: 'inflectionIsNotNewVocabulary', rule: "THE GOVERNING RULE FOR THIS KNOWN SIDE. A French finite verb encodes person, number, tense and mood in a fused ending, and the stem itself alternates (veux/voulais/voudrais/veuille; peux/pouvait/pourrai; vais/allait/irai). Every such form is the SAME gloss as the lemma introduced earlier. Because stemKnownGloss is exact-form by design, the gate will report each of them as `unknown gloss`. Adjudication rule: map the finding to a lemma; if that lemma is in the introduced inventory at or before this seed, the finding is a false positive of the matcher and must be recorded as such, not fixed." },
    { id: 'genderConcordIsNotAnEnglishDistinction', rule: "prêt/prête, content/contente, désolé/désolée, allé/allée/allés/allées and every -e/-s agreement variant render to ONE English form. The French side varies with the gender and number of the referent — including the SPEAKER's gender in first-person predicates — which English does not encode. Many-French→one-English; keep the variants as one gloss and never manufacture an English distinction to mirror them." },
    { id: 'negationIsAFrame', rule: "English 'not' (and n't) corresponds to the discontinuous frame ne … pas, not to a single French word. `ne` alone is meaningless and `pas` alone is the colloquial reduction of the same frame. Additionally ne … plus / jamais / rien / personne / que replace `pas` and carry their own English word ('no longer' / 'never' / 'nothing' / 'nobody' / 'only'), so the SECOND element is where the English gloss lives. Never gloss `ne` separately; never read a missing `pas` as a missing negation." },
    { id: 'compoundPastCoversTwoEnglishTenses', rule: "One French passé composé maps to BOTH English simple past and present perfect (j'ai appris = 'I learned' / 'I have learned'). Conversely English simple past splits French-side into passé composé (bounded event) vs imparfait (state/habit). The English rendering must be chosen once per prompt and held; do not let the same French form surface as two different English tenses across the course, and do not tile the auxiliary avoir/être as an English 'have'/'be' gloss." },
    { id: 'clitisationIsMorphologyNotVocabulary', rule: "m'aider, t'aide, l'heure, j'espère, s'assurer, qu'il are single tokens containing a free function word plus something else. Treat the FUNCTION half as already-free and adjudicate only the lexical half. A finding on an elided token is a finding about the word after the apostrophe, and nothing else." },
    { id: 'futureIsPeriphrasticOrSynthetic', rule: "English 'will' and 'going to' both map to French, but French splits them differently: aller + infinitive (je vais commencer) vs the synthetic future (je commencerai), with the present tense also usable futurally. One English future → two French formations chosen on immediacy/register. Fix the choice per prompt; both formations are the same English gloss." },
    { id: 'yAndEnHaveNoEnglishGloss', rule: "The clitics `y` and `en` frequently have NO English realisation at all (j'aimerais y penser = 'I'd like to think about it'; j'en ai besoin = 'I need it'). They must be free on the known side and must never be assigned an English gloss of their own — the English preposition+pronoun that translates them belongs to the verb's frame, not to the clitic." },
    { id: 'plusIsAmbiguous', rule: "`plus` is BOTH the comparative 'more' (plus fatigué que …, S42; plus important, S137) and the negative particle of ne … plus 'no longer'. One French string, two unrelated English renderings, disambiguated only by the presence of `ne` — which the spoken register drops. Any authoring decision involving `plus` must state which reading is intended; the gate cannot tell them apart." },
    { id: 'estCeQueIsAFrame', rule: "est-ce que / qu'est-ce que are non-compositional interrogative frames, not a sequence of glossable words ('is-it-that'). License and mask them whole; English do/does/did have no separate French token and must never be tiled." },
  ],
};
