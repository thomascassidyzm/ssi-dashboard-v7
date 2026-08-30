// _known_tel — KNOWN-SIDE BRIEF for the Telugu known-side agent. FIRST PASS (2026-08-18), ratified:null.
// KNOWN-LANGUAGE-level contract: the loader falls back to this for EVERY course whose known/prompt
// language is Telugu. Today that is eng_for_tel (1 course; English is the target).
// Authored by an Opus agent from the real eng_for_tel corpus. RULE (Tom): no regex for language — this
// is the agent's reference knowledge, NOT a regex gate config. The known-side check is an agent that
// reads this brief + the introduced-vocab list + the prompt and judges. See
// docs/course-optimization/eng-for-x-known-side-pilot.md. Ships WITH the three pilot calibration fixes
// already applied (real npiLicensing with 10 environments; every high-frequency function word explicitly
// classified into freeClass or knownConstructions; nothing high-frequency left unclassified).
//
// CORPUS. Read live from Supabase 2026-08-18: 668 seeds (course_seeds), 1,504 legos (course_legos)
// carrying 1,441 component glosses, and 12,255 practice phrases (course_practice_phrases) — 15,200
// Telugu known-side strings, 58,660 tokens, 2,374 distinct whitespace tokens. Every classification below
// was taken by working down that frequency table from rank 1 and reading the paired English gloss; ranks
// 1–260 were audited item by item, and the tail was swept for the specific series (NPI, -ఐనా free-choice,
// ZWNJ loans, ability/obligation auxiliaries) named here.
//
// TYPOLOGY. Telugu (Telu script, an abugida) is South-Central Dravidian: SOV, head-final, strictly
// suffixing and agglutinative, pro-drop, nominative–accusative (NOT ergative). Case, number, person,
// tense, mood, polarity, subordination and even the question and indirect-question operators are all
// SUFFIXES glued onto the word, and the string is spaced between words but heavily packed inside them:
// నేర్చుకోవడానికి = "in order to learn" is one token. Grammatical gender is the Dravidian mahat/amahat
// system, not the Indo-Aryan masculine/feminine one — see genderIsMahatAmahat below.
//
// THE THREE PERVASIVE KNOWN-SIDE ZUT PRESSURES IN THIS PAIR:
//  1. DATIVE-SUBJECT EXPERIENCER. English nominative 'I know / I like / I want / I need / I don't want'
//     maps to a DATIVE subject in Telugu — నాకు తెలుసు, నాకు ఇష్టం, నాకు కావాలి, నాకు అవసరం ఉంది,
//     నాకు వద్దు — never నేను. నాకు is the corpus's #2 token (2,083×) precisely because of this. One
//     English 'I' fans out into నేను (agentive) vs నాకు (experiencer) by predicate class, which is a
//     construction fact, not a ZUT conflict — but authoring that picks the wrong one produces
//     ungrammatical Telugu with a perfectly ordinary-looking English side.
//  2. TWO PRONOUN SPLITS ENGLISH CANNOT SEE. 'you' is నువ్వు (1,306×, default) vs మీరు (101×, polite/
//     plural, concentrated in the service-encounter seeds 501 and 644–668); 'we' is inclusive మనం (441×)
//     vs exclusive మేము (255×). Both are many-Telugu→one-English and both are ZUT-LEGAL. The gate must
//     never read మనం and మేము as two glosses competing for 'we'.
//  3. WORD-FINAL CLITICS REWRITE THE LAST SYLLABLE. The polar-question clitic -ఆ (ఉందా, కావాలా,
//     ఇబ్బందా, అనుకుంటున్నావా) and the indirect-question clitic -ఓ (ఉందో, లేదో, ఏమిటో, చెప్పాలో) attach
//     to the last word of the clause and change its final vowel. So the surface form of a Telugu word is
//     a function of the clause type it happens to end, and any matcher that trusts word-final material
//     is matching sentence syntax, not the lemma.
//
// stemStrip IS DELIBERATELY EMPTY, and this is the load-bearing judgment in the file. I tested every
// plausible clitic empirically against the 2,374-type table (residue-present-in-corpus rate, and a
// hand-read of every type carrying the ending):
//   -కి dative      72 types,  10% residue attested — wrecked by -డానికి 'in order to' (చెప్పడానికి →
//                   'చెప్పడాని'), and by lexical కి-final words.
//   -ని/-ను acc.   354/234 types, 4%/12% — and it eats the two commonest words in the language:
//                   నేను 'I' → 'నే', అతను 'he' → 'అత'. Fatal on its own.
//   -లో locative    46 types, 37% — but 5 of the top 8 lo-final types are NOT locatives at all, they are
//                   the -ఓ indirect-question clitic on a necessitative: చెప్పాలో 'how to say', కావాలో
//                   'what you want', చేయాలో, మాట్లాడాలో. A homograph trap, not a rare edge.
//   -కు dative      46 types, 50% — but ఎందుకు 'why', వరకు 'until', కొడుకు 'son', చేసినందుకు 'for doing'
//                   are not datives.
//   -గా adverbial   72 types, 31%;  -లు plural 46 types, 17%;  verb endings -ాను/-ుంది/-డు/-రు/-ం all
//                   ≤6%. None is defensible.
//   -తో comitative  43 types, 67% — the CLOSEST CALL, and I still reject it. Two of the 43 are the -ఓ
//                   clitic in disguise (ఎంతో, ఎత్తో), and the 14 misses are not noise: they are the
//                   OBLIQUE stem, which is what Telugu actually puts before a case suffix. పిల్లలతో
//                   strips to పిల్లల, and the citation form is పిల్లలు; స్నేహితులతో → స్నేహితుల vs
//                   స్నేహితులు. So even when the strip is morphologically CORRECT the residue is a form
//                   the introduced-gloss list will never contain, and the "match" is a coin flip.
// The general fact underneath all of it: Telugu forms the oblique stem by alternation and sandhi before
// it suffixes (పుస్తకం → పుస్తకాన్ని, ఇల్లు → ఇంటికి), so suffix removal returns an oblique stem, not a
// lemma. A wrong strip here does not merely fail to match — it can silently match some UNRELATED
// introduced gloss and turn a real violation into a green PASS. With morphology:'agglutinative' and an
// empty stemStrip the gate degrades to UNCHECKED(morphology_unresolved), which is the honest outcome and
// the one this brief chooses. Do not populate stemStrip without a native-reviewer ratification pass.
//
// A PRACTICAL TOKENIZER HAZARD, not a linguistic one: 29 types in this corpus carry an INVISIBLE
// ZERO-WIDTH NON-JOINER (U+200C) between a Latin-derived loan stem and its Telugu clitic — ఇంగ్లీష్‌లో
// 'in English' (152×), పబ్‌లో, కౌన్సిల్‌లో, రెస్టారెంట్‌కి, టేబుల్‌తో, సీరియస్‌గా. ఇంగ్లీష్ (359×) and
// ఇంగ్లీష్‌లో are DIFFERENT strings that render identically to the eye. Any comparison against an
// introduced gloss must normalise U+200C (and U+200D) away before matching, or 'English' will read as
// untaught in every locative phrase it appears in.
//
// WHERE I DIVERGED FROM THE TAMIL BRIEF (eng_for_tam.contract.cjs), and why:
//  • REGISTER IS LIVE HERE, NOT FIXED. Tamil's brief could say 'you' is uniformly honorific நீங்கள் with
//    no familiar நீ in the inventory, so formality needs no per-phrase decision. Telugu INVERTS that:
//    both నువ్వు and మీరు are in the corpus and both gloss 'you', so register is a real authoring choice
//    and a real ZUT surface. I made it a construction (register-you-split) rather than a fixed rule.
//  • NO HONORIFIC THIRD PERSON. Tamil splits அவர் (honorific 'he') vs அவன் (familiar 'he'). The Telugu
//    corpus has NO honorific-3sg at all: ఆయన and వారు are absent (0 hits), so 'he' is uniformly అతను
//    (887×) and 'she' uniformly ఆమె (835×). I did not port heHonorificSplit.
//  • GENDER WORKS DIFFERENTLY. Tamil marks a distinct feminine verb ending -ஆள். Telugu's 3sg feminine
//    takes the NON-MASCULINE (amahat) agreement that is identical to the inanimate: ఆమె చెప్పింది 'she
//    said' and అది ఉంది 'it is' share -ఇంది, against masculine -ఆడు (అతను చెప్పాడు). So the pronoun
//    disambiguates he/she but the VERB does not — the mirror image of the Hindi situation, where the
//    pronoun (वह) is neutral and the verb carries gender. New rule: genderIsMahatAmahat.
//  • INCLUSIVE/EXCLUSIVE 'WE' IS STATED. Tamil has நாம்/நாங்கள் too, but the Tamil brief never names it;
//    Telugu's మనం/మేము are ranks 16 and 36 here and cannot be left implicit.
//  • CASE IS A LONGER, MORE PRODUCTIVE SERIES than the Tamil brief's list, and it is what forced the
//    empty stemStrip through the oblique-stem argument above — Tamil's brief reached the same empty
//    stemStrip by a partly different route (fusional portmanteau endings + sandhi at abugida boundaries).
//  • I FOLLOWED TAMIL EXACTLY ON ONE THING: the two-series indefinite architecture. Telugu's -ఊ/-ఆ
//    negative-concord series (ఏమీ, ఎవరూ, ఎప్పుడూ, ఎక్కడా) vs the -ఐనా free-choice series (ఏదైనా,
//    ఏమైనా, ఎవరైనా, ఎక్కడైనా) is the same split as Tamil's -உம் vs -ஆவது, and the corpus confirms it
//    (ఏదైనా is glossed 'something' 183× in positive declaratives; ఏమీ/ఎవరూ appear ONLY under negation).
//  • NO DIGLOSSIA LAYER. Tamil authoring has to hold a spoken/literary line; this corpus is a single
//    consistent modern spoken-standard register throughout. The ONE trace of the literary layer is
//    నీవు (24×), a literary variant of నువ్వు 'you' — flagged below as an unresolved token, not a rule.
//
// TOKENS I COULD NOT CONFIDENTLY CLASSIFY (honest gaps — do not treat these as settled):
//  • ఇంకా (rank 29, 329×) — glossed 'and' (S15, S555, S592, S596), 'yet' (S345), 'any' (S563), 'more'
//    (ఇంకా ఎక్కువ) and 'still'. I put it in freeClass AND wrote a polarity gloss rule for it, but the
//    'and' reading is not the ordinary Telugu conjunction use and I cannot tell from the corpus whether
//    it is an authoring habit or a deliberate mapping. Needs a native reviewer, not a gate decision.
//  • నీవు (24×) vs నువ్వు (1,306×) — same lemma, literary vs colloquial. I did NOT list నీవు in
//    freeClass, because if it is a stray literary form leaking into a spoken-register course that is a
//    content finding the gate should surface, not silently absolve.
//  • ఇప్పుడు 'now' (411×), ఇక్కడ 'here' (411×), అక్కడ 'there' (101×), ఇవాళ/నిన్న/రేపు — deictic time and
//    place adverbs. Closed-class by any normal test, but they are TAUGHT as LEGOs in this course and
//    each has a debut seed, so putting them in freeClass would license them before their debut. Left
//    OUT of freeClass deliberately; they are introduced vocabulary here.
//  • అనుకోవడం / అనుకుంటున్నాను / అనుకుంటాను (199 + 296 + 183) — the verb 'think/want/intend'. Its
//    -ఆలనుకుంటున్నాను frame is pure desiderative machinery (covered as a construction), but the root is
//    a content verb, so I classified the CONSTRUCTION and left the lemma as vocabulary. If the gate
//    starts flagging these forms it is flagging the lemma, and that is correct behaviour.
//  • సరే (20×, 'okay/well/so') and అలా (75×, 'so/that/like that') — discourse particles. సరే I left out
//    (it appears only in the seed-633+ service dialogues and may be a taught greeting-register item);
//    అలా I put in freeClass because it also serves as the manner pro-form in అలా కాదు 'not like that'.
//  • The -ఒచ్చు permissive (అడగొచ్చు 'can ask', చేయవచ్చు, ఉండొచ్చు 'might be') — only 9 tokens total.
//    I folded it into the ability construction, but with that few examples I cannot say whether Telugu's
//    permissive/epistemic 'may' is being kept distinct from -గల 'can' in this course.
module.exports = {
  course_code: '_known_tel',
  ratified: null,
  known_lang: 'tel',
  known_lang_name: "Telugu",
  is_known_default: true,

  // --- tokenizer / outcome machinery ---------------------------------------------------------------
  script: 'Telu',
  // Spaced between words. NOT 'space+agglut': the packing is real (see morphology), but sub-word
  // segmentation of Telugu is exactly the operation this brief argues is unsafe, so the gate should
  // tokenize on whitespace and let morphology drive the fallback.
  segmentation: 'space',
  morphology: 'agglutinative',
  // EMPTY BY DECISION, NOT BY OMISSION. See the header: every candidate clitic either collides with the
  // -ఓ/-ఆ clause clitics, with lexical word-endings, or returns an oblique stem that is not the citation
  // form. UNCHECKED(morphology_unresolved) is the correct outcome here; a wrong strip is not.
  stemStrip: [],
  // Inert while stemStrip is empty. 3 is the floor a future ratified strip should honour: the shortest
  // real Telugu lemmas in this corpus (ఆమె, పని, నీళ్ళు's stem) are 3 code units.
  stemMinLen: 3,

  // Free class — genuinely free-standing Telugu function words, corpus-derived, never "introduced".
  // The line I drew: (a) the whole attested pronoun/demonstrative paradigm INCLUDING its case-marked
  // forms, because with stemStrip empty these forms are the only shape the gate will ever see and they
  // are suppletive/irreducible anyway (నేను/నాకు/నా/నన్ను is not derivable from a stem by stripping);
  // (b) postpositions written as separate words (గురించి, కోసం, కంటే, నుంచి, దగ్గర, తర్వాత, లేకుండా);
  // (c) conjunctions and subordinators; (d) wh-words; (e) closed-class degree/quantity items. EXCLUDED
  // by design: predicates and modals (ఉంది, లేదు, కాదు, వద్దు, తెలుసు, ఇష్టం, అవసరం, కావాలి) — those are
  // machinery and are licensed as knownConstructions below, not blanket-free; and the deictic time/place
  // adverbs, which are taught vocabulary in this course (see the unresolved-tokens note).
  freeClass: [
    "నేను","నాకు","నా","నన్ను","నాతో",
    "మేము","మాకు","మా","మమ్మల్ని","మనం","మనకు","మన",
    "నువ్వు","నీకు","నీ","నిన్ను","నీతో",
    "మీరు","మీకు","మీ","మీతో","మీరందరూ",
    "అతను","అతనికి","అతని","ఆమె","ఆమెకు","ఆమెను",
    "వాళ్ళు","వాళ్ళకు","తాను","తన","తనకు",
    "అది","ఇది","దాని","దాన్ని","దానితో","వాటిని","అదే","ఆ","ఈ","అలా","ఇలా",
    "ఒక","కొన్ని","అన్నీ","ప్రతి","అందరూ","అందరికీ",
    "అని","కానీ","లేదా","ఎందుకంటే","కాబట్టి","ఇంకా","కూడా",
    "గురించి","కోసం","కంటే","నుంచి","దగ్గర","తర్వాత","లేకుండా",
    "ఏం","ఏమిటో","ఎలా","ఎందుకు","ఎక్కడ","ఎప్పుడు","ఎవరు","ఎంత","దేని",
    "చాలా","కొంచెం","ఎక్కువ","మరీ","కేవలం","మాత్రమే","అంత","దాదాపు","బహుశా",
    "అవును","దయచేసి",
  ],

  // NPI items + WHEN they are licensed. Violation = an NPI in a plain POSITIVE DECLARATIVE only.
  // These are the -ఊ/-ఆ NEGATIVE-CONCORD series only. The -ఐనా free-choice series (ఏదైనా, ఏమైనా,
  // ఎవరైనా, ఎక్కడైనా) is deliberately NOT listed here — see indefiniteTwoSeries in glossRules.
  npi: ["ఏమీ","ఇంకేమీ","ఎవరూ","ఎప్పుడూ","ఎక్కడా","ఇంకా"],
  npiLicensing: {
    rule: "Telugu runs TWO indefinite series and only ONE of them is negative-polarity, so the rule must be stated per series — the same architecture as Tamil's -உம் vs -ஆவது split, and the corpus confirms it cleanly. (A) The -ఊ / -ఆ NEGATIVE-CONCORD series — ఏమీ 'anything/nothing', ఇంకేమీ 'anything else', ఎవరూ 'anyone/nobody', ఎప్పుడూ 'ever/never', ఎక్కడా 'anywhere' — is licensed ONLY in a non-veridical / downward-entailing environment and is UNGRAMMATICAL in a plain positive declarative. Telugu is a NEGATIVE-CONCORD language: the item does NOT itself mean 'no-', it co-occurs with a negated verb and the pair renders English 'nobody / nothing / never / not ... anywhere'. Every corpus attestation obeys this — నాకు ఎవరూ చెప్పలేదు 'nobody told me' (S367), నేను ఏమీ చెప్పలేదు 'I didn't say anything' (S295), నేను ఎప్పుడూ చూడలేదు \"I've never seen\" (S309), మాకు ఎక్కడా లేకపోయింది \"we didn't have anywhere\" (S603), నాకు ఇంకేమీ వద్దు \"I don't want anything else\" (S360). There is NOT ONE positive-declarative attestation of this series in 58,660 tokens. (B) The -ఐనా FREE-CHOICE series — ఏదైనా, ఏమైనా, ఎవరైనా, ఎక్కడైనా — is NOT an NPI: it is fine in a positive declarative meaning 'some-' (ఏదైనా is glossed 'something' in all 183 of its hits, e.g. వేరే ఏదైనా ఆడటం 'playing something else' S98), and it EXTENDS to 'any-' under a licensor (ఎక్కడైనా = 'somewhere' at S402/S611 but 'anywhere' at S182/S578; ఎవరైనా ఆట గెలవగలరు 'anyone can win the game' under ability + under negation/belief at S531). An -ఐనా item in a positive declarative is NEVER a violation. The ZUT consequence: the ONLY thing the gate flags as an NPI violation is an -ఊ/-ఆ item (ఏమీ / ఇంకేమీ / ఎవరూ / ఎప్పుడూ / ఎక్కడా) standing in a positive declarative with no licensor; an English 'something/someone/somewhere' rendered with the -ఊ series is the error, and ఏదైనా/ఎవరైనా/ఎక్కడైనా is the correct positive form. ఇంకా is a SPECIAL CASE and is listed in npi for its 'yet/any' reading only: under negation it is the NPI 'yet' (ఇంకా సిద్ధంగా లేను \"I'm not ready yet\" S96, ఇంకా సరిపడా 'not yet' S60) and in positive/additive use it is the perfectly free 'still / more / and' (ఇంకా ఎక్కువ 'a lot more' S23) — polarity picks the reading, so never flag positive ఇంకా. CRITICAL PROCEDURAL POINT: Telugu negation is a SUFFIX or a fused verb form (లేదు, కాదు, వద్దు, తెలియదు, చూడలేదు, నమ్మను), never a free-standing 'not' word, and the question and conditional operators are also bound clitics. The agent must therefore read the FINAL VERB's polarity and mood to decide whether a licensor is present — there is no separate word to look for, and there is nothing here for a pattern-matcher to find.",
    licensedIn: [
      "Verbal / existential negation with లేదు and its inflected and fused forms — లేను 'I'm not' (సిద్ధంగా లేను S88), లేకపోయింది 'didn't have' (S603), లేదని 'that ... not' (S82), and the -లేదు fused negative past (చూడలేదు 'haven't seen' S183, చెప్పలేదు 'didn't say/tell' S295/S367, మిగల్లేదు 'nothing left' S298)",
      "Copular / identificational negation with కాదు — తేలిక కాదు \"isn't easy\" (S64), కష్టం కాదు 'not difficult' (S66), అలా కాదు అని \"that it's not like that\" (S102), అది సమస్య కాదు \"it isn't a problem\"",
      "The fused NEGATIVE CONJUGATION, where negation is an infix/ending on the finite verb rather than a word — తెలియదు \"don't know\" (S60, 238×), వినదు \"won't listen\" (S533), నమ్మను \"I'll never trust\" (S490), పడను \"I won't worry\", అనుకోను \"I don't think\" (S531)",
      "Prohibitive / refusal వద్దు \"don't want / no thanks\" (నాకు వద్దు S474, వద్దు ధన్యవాదాలు S173) and the negated necessity అవసరం లేదు \"don't need to\" (S45, S188)",
      "Yes/no (polar) questions formed by the interrogative clitic -ఆ on the final word — ఉందా \"have you got / do you have to\" (S75, S274), కావాలా \"do you want\" (S643), ఇబ్బందా \"do you mind\" (S190), అనుకుంటున్నావా \"do you think / are you sure\" (S63, S316), చెప్పగలవా \"can you tell me\", ఇవ్వగలవా \"can you give me\" (S161) — no do-support word exists to look for",
      "Embedded / indirect questions formed by the clitic -ఓ, and the ...-ఓ లేదో 'whether or not' frame — గుర్తుంచుకోగలనో లేదో \"if I can remember\" (S10), సహాయం చేయగలనో లేదో \"if I can help you\" (S62), ఎందుకు పని చేయడం లేదో \"why it's not working\" (S99), అవసరం ఉందో అని 'whether I need to' (S44)",
      "Conditionals and counterfactuals — the bound conditional -ఇతే (వీలైతే \"if he can\" S67, ముగిస్తే \"if I finish\" S131) and the periphrastic ... ఉంటే (నువ్వు నాకు చెప్పి ఉంటే \"if you'd told me\" S599, వాళ్ళు కోరుకుని ఉంటే \"if they wanted to\" S435)",
      "Desiderative and volitional scope — the -ఆలనుకుంటున్నాను 'want to' frame, -ఆలని ఉంది \"I'd like to\", కావాలి 'want/need' and ఆశిస్తున్నాను 'hope' (S149); free-choice 'anything you want' lives here",
      "Ability, permission and necessity modals — -గల / -గలుగు 'can, be able to' (చేయగలను, గెలవగలరు S531, పైకెత్తగలరా S655), the permissive -ఒచ్చు 'may/can' (అడగొచ్చు, ఉండొచ్చు 'might be'), and the obligation frames -ఆలి / -ఆల్సి / అవసరం ఉంది",
      "Comparatives with కంటే 'than' (పరిపూర్ణంగా ఉండటం కంటే 'than to be perfect' S137), restrictive focus కేవలం / మాత్రమే 'just / only' (S280), concessive -ఇనా కూడా 'even if' (అతను కోరుకున్నా కూడా S352), and 'before/until' clauses (కంటే ముందు S404, ఉండేవరకు 'until ... is ready' S396) — all non-veridical or scalar frames",
    ],
  },

  // Negation markers (reference list; negation detection is the agent's judgment — and note that in
  // Telugu most of these are ENDINGS on the verb, not separate words).
  negation: ["లేదు","లేను","లేదని","లేదో","లేకపోయింది","లేకుండా","కాదు","కాదని","వద్దు","తెలియదు","చూడలేదు","చెప్పలేదు","నమ్మను","అనుకోను","వినదు"],

  // Telugu machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: "dative-experiencer", marker: "నాకు / నీకు / అతనికి / ఆమెకు / మాకు / మీకు / వాళ్ళకు", description: "THE central construction of this known side. Psychological, cognitive, possessive and desiderative predicates take a DATIVE subject, not a nominative: నాకు తెలుసు 'I know' (S59), నాకు ఇష్టం 'I like' (S26), నాకు కావాలి 'I want/need' (S96), నాకు అవసరం ఉంది 'I need to', నాకు వద్దు \"I don't want\" (S474), నీకు ఇబ్బందా 'do you mind' (S190), నీకు ఎలా అనిపిస్తోంది 'how do you feel', అతనికి ఎంత వయసు ఉందో 'how old he is' (S420), నీకు ఉందా 'have you got' (S75). English nominative I/you/he maps to నాకు/నీకు/అతనికి in this frame. Licensed at the first dative-experiencer debut; the dative pronoun forms are free class, but the FRAME is what must be taught, or authoring writes నేను తెలుసు and produces broken Telugu behind a clean English gloss." },
    { id: "existential-stative-undi", marker: "ఉంది / ఉన్నాను / ఉన్నాడు / ఉంటుంది / ఉండింది", description: "ఉండు is the existential/locative/stative verb: 'there is', 'is located', 'have got' (in the dative frame), and the carrier of predicate-adjective states (చాలా సంతోషంగా ఉన్నాను \"I'm very happy\" S76, విచారంగా ఉన్నాను 'am feeling sad' S548, అది వంతెన కింద ఉంది \"it's under the bridge\"). It also builds the modal periphrases -ఆలని ఉంది \"I'd like to\" (S92) and అవసరం ఉంది 'need to' (S104). It agrees for person/number/gender and tense. It is NOT the equational copula — see zero-copula-equational." },
    { id: "zero-copula-equational", marker: "(no word) ... / కాదు", description: "Affirmative equational sentences have NO copula at all: ఎందుకంటే అతను నా స్నేహితుడు \"because he's my friend\" (S130) is literally 'because he my friend'; అతని పేరు 'his name is'; అది జేన్ సంచి \"that is Jane's bag\" (S635). English is/are/am in an identity or predicate-nominal clause has no Telugu carrier and must be treated as supplied English-side. The NEGATIVE of the same clause DOES have a word — కాదు — which is why negation looks asymmetric here (తేలిక కాదు \"isn't easy\")." },
    { id: "negation-ledu", marker: "లేదు / లేను / లేకపోయింది / -లేదు", description: "లేదు is the existential and verbal negator: 'there isn't / don't have / doesn't / not' (అనుకోవడం లేదు \"I don't want\" S19, నాకు ఇష్టం లేదు \"I don't like\" S27, మాకు ఎక్కడా లేకపోయింది \"we didn't have anywhere\" S603). It also FUSES onto a verb stem to negate the past/perfect as a single token — చూడలేదు \"haven't seen\", చెప్పలేదు \"didn't say\", నచ్చలేదు \"didn't like\" — so English didn't/haven't has no standalone Telugu word. It inflects for person (లేను \"I'm not\", S88) and subordinates (లేదని 'that ... not', లేదో 'whether ... not')." },
    { id: "negation-kaadu", marker: "కాదు / కాదని", description: "కాదు is the COPULAR/identificational negator — 'isn't / is not / not a' — negating the zero equational copula (కష్టం కాదు 'not difficult' S66, అది సమస్య కాదు \"it isn't a problem\", ఎందుకు కాదు 'why not' S82). Choosing between లేదు and కాదు is decided by predicate type, not by the English word: 'isn't' is కాదు in an equation but లేదు in an existential. Licensed at its debut." },
    { id: "negation-vaddu", marker: "వద్దు", description: "వద్దు is the negative volitive/prohibitive — \"don't want\" in the dative frame (నాకు వద్దు S474, నాకు ఇంకేమీ వద్దు \"I don't want anything else\" S360) and the polite refusal \"no thank you\" (వద్దు ధన్యవాదాలు S173). It is the suppletive negative of కావాలి 'want', not a negated form of it; English 'don't want' therefore has a dedicated single word here." },
    { id: "negation-fused-conjugation", marker: "తెలియదు / వినదు / నమ్మను / పడను / అనుకోను", description: "Telugu has a NEGATIVE CONJUGATION: the negative is built into the finite verb's ending rather than added as a word. తెలియదు \"don't know\" (238×) is one token, as are వినదు \"won't listen\" (S533), నమ్మను \"I'll never trust\" (S490), పడను \"I won't worry\", అనుకోను \"I don't think\" (S531). This form is tenseless/general-negative and is the standard way to negate knowing, believing and habitual action. Nothing in the string corresponds to English 'do not' — the agent reads the ending." },
    { id: "quotative-ani", marker: "అని / -అని / -అనేది", description: "అని is the quotative/complementizer particle closing an embedded clause of speech, thought, belief or intention — the Telugu 'that'. It follows the quoted clause (mirror-image of English): మంచిదే అని నేను అనుకుంటాను \"I think that it's a good thing\" (S47), అలా కాదు అని \"that it's not like that\" (S102), తాను చెప్పాలనుకున్నాడని \"that he wanted to tell\" (S235). It also cliticises onto the embedded verb as -అని/-అనేది (ఉందని, చెప్పలేదని, గెలవగలరనేది S531). English 'that' is optional; Telugu అని is not. Licensed at its debut (S44 area)." },
    { id: "indirect-question-o", marker: "-ఓ (ఉందో, లేదో, ఏమిటో, చెప్పాలో, జరగబోతుందో)", description: "The clitic -ఓ on the embedded verb marks an INDIRECT QUESTION — English 'whether / if / what / where / how ...' as a complement: ఎక్కడ ఉందో 'where it was' (S70), గుర్తుంచుకోగలనో లేదో \"if I can remember\" (S10), నా ఉద్దేశం ఏమిటో 'what I mean' (S107 area), ఎలా చెప్పాలో 'how to say' (S115). The ...-ఓ లేదో frame is 'whether or not'. CRITICAL: this clitic rewrites the word's final vowel, so చెప్పాలో and కావాలో are NOT locatives in -లో despite the identical ending — this is precisely why stemStrip is empty." },
    { id: "polar-question-clitic-aa", marker: "-ఆ (ఉందా, కావాలా, ఇబ్బందా, అనుకుంటున్నావా, చెప్పగలవా)", description: "Yes/no questions are formed by the clitic -ఆ on the final (questioned) word — no word order change, no do-support, no separate question word: ఉందా \"have you got\" (S75), మీకు కావాలా \"do you want\" (S643), నీకు ఇబ్బందా \"do you mind\" (S190), ఖచ్చితంగా అనుకుంటున్నావా \"are you sure\" (S63), నువ్వు నాకు ఆ పుస్తకం ఇవ్వగలవా \"can you give me that book\" (S161). English do/does/did/are/have questions all map onto this clitic. Licensed at its debut; the English auxiliaries are absorbed, never tiled as separate Telugu tokens." },
    { id: "ability-permission-gala", marker: "-గల / -గలుగు / -ఒచ్చు", description: "Ability and permission are verb-internal: -గల / -గలుగు 'can, be able to' (చేయగలను \"I can do\", చూడగలను, సహాయం చేయగలనో లేదో \"if I can help\", మీరందరూ మీ చేతులు పైకెత్తగలరా \"can you all put your hands up\" S529, ఎవరైనా ఆట గెలవగలరు 'anyone can win' S531), its negative -లేక/-లేను \"can't\" (S333), and the permissive/epistemic -ఒచ్చు 'may, can, might' (ఖచ్చితంగా నువ్వు ఆమెను అడగొచ్చు \"of course you can ask her\", కావచ్చు 'might be'). One Telugu suffix cluster covers English can / could / be able to / may. Machinery, not vocabulary. It is also an NPI licensor." },
    { id: "obligation-aali-avasaram", marker: "-ఆలి / -ఆల్సి / అవసరం ఉంది / అవసరం లేదు", description: "Obligation and necessity: the necessitative ending -ఆలి \"should / must / ought to\" (ఆమె అలా చేయాలి 'she ought to' S328, నిన్ను నువ్వు ప్రశ్నించుకోవాలి \"you should ask yourself\" S99), the periphrasis -ఆల్సిన అవసరం ఉంది \"need to\" (మార్చాల్సిన అవసరం ఉంది \"we need to change\" S104, 391 hits for అవసరం), its negation అవసరం లేదు \"don't need to\" (S45, S188), and -ఆల్సి వచ్చింది \"had to\" (S455). English should/must/need to/have to/ought to all live in this one family. Machinery — the direct Telugu counterpart of the చాहिए/வேண்டும் class the pilot found leaking in Hindi and Tamil, so classify it here or it leaks." },
    { id: "desiderative-aalanukuntunnanu", marker: "-ఆలనుకుంటున్నాను / -ఆలని ఉంది / కావాలి", description: "'want to' and \"would like to\" are a bound frame on the verb, not an auxiliary + infinitive: మాట్లాడాలనుకుంటున్నాను \"I want to speak\" (S1, one token), కలవాలనుకుంటున్నాను \"I want to meet\", తెలుసుకోవాలని మేము అనుకున్నాం \"we wanted to find out\" (S93); the softer \"I'd like to\" is -ఆలని ఉంది (మాట్లాడగలగాలని ఉంది \"I'd like to be able to speak\" S11, విశ్రాంతి తీసుకోవాలని ఉంది S181). Bare 'want' with a noun object is the dative కావాలి (నాకు కావాలి S586). Licensed as one desiderative construction; note the whole English 'want to speak' is ONE Telugu word, so the gate must not expect a separate 'want' token." },
    { id: "prospective-botunna", marker: "-బోతున్న / -బోతుంది", description: "Immediate future 'going to' is the bound prospective -బోతున్న on the verb stem: నాకు సహాయం చేయబోతున్నావా \"are you going to help me\" (S25), మాట్లాడటం సాధన చేయబోతున్నాను \"I'm going to practise speaking\", ఏం జరగబోతుందో \"what's going to happen\" (S23), ఎదురుచూడబోవడం లేదు \"I'm not going to wait\" (S82). Distinct machinery from the plain future -తా-/-ఉ (చేస్తాను \"I'll do\"). English 'going to' vs 'will' therefore maps to two different Telugu endings, not to a separate word." },
    { id: "verbal-noun-dam-daaniki", marker: "-డం / -టం / -డానికి", description: "Telugu nominalises verbs with -డం/-టం to give the English gerund/infinitive (మాట్లాడటం 'speaking' S49, అనుకోవడం 'wanting/thinking', తప్పులు చేయడం గురించి 'about making mistakes' S46, పరిపూర్ణంగా ఉండటం కంటే 'than to be perfect' S137), and adds the dative -కి to give purpose 'in order to' (నేర్చుకోవడానికి \"in order to learn\" S147, చెప్పడానికి 'to say', వెళ్ళడానికి 'to go'). English to-infinitives of purpose and -ing gerunds both land here. NOTE for matching: -డానికి is why a naive -కి strip is catastrophic." },
    { id: "conditional-ite-unte", marker: "-ఇతే / ... ఉంటే", description: "Conditionals are bound: the -ఇతే ending on the verb ('if') — వీలైతే \"if he can\" (S67), ముగిస్తే \"if I finish\" — and the periphrastic past/counterfactual ... ఉంటే — నువ్వు నాకు చెప్పి ఉంటే \"if you'd told me\" (S599), వాళ్ళు కోరుకుని ఉంటే \"if they wanted to\" (S435). There is no free 'if' word to introduce; English 'if' is absorbed by the verb ending. A key NPI licensor. Distinguish from the indirect-question 'if' of -ఓ లేదో, which is a different construction entirely." },
    { id: "inclusive-exclusive-we", marker: "మనం (incl.) / మేము (excl.)", description: "Telugu grammaticalises a distinction English cannot express: మనం 'we' INCLUDES the addressee (మనం చర్చించాల్సిన అవసరం ఉంది \"we need to discuss\", మన పిల్లలు 'our children'), మేము EXCLUDES them (చూడాలని మేము ఆశించాం \"we hoped to see\", మాకు తెలియదు \"we don't know\"). Both render English 'we/us/our'. The choice is fixed per seed by who is being addressed and is NOT an authoring free variable — but it is also NOT a ZUT conflict. Licensed at each form's own debut (మనం S18, మేము later)." },
    { id: "register-you-split", marker: "నువ్వు (familiar) / మీరు (polite-plural)", description: "Both render English 'you'. నువ్వు (1,306×, with నీకు/నీ/నిన్ను/నీతో) is the default throughout the course; మీరు (101×, with మీకు/మీ/మీతో/మీరందరూ) is polite-singular AND plural, and in this corpus it clusters in the service-encounter and address-a-group seeds (S501, S644–S668: మీరు అది చెప్పగలరా \"could you say that\", మీ అందరికీ కావాలా \"do you all want\", దయచేసి సార్/మేడం). Each is licensed at its own debut and the English side does not distinguish them. UNLIKE Tamil, where the brief could fix 'you' to a single honorific form, register here is a live authoring decision — a seed that switches register mid-dialogue without a reason is a content finding." },
    { id: "reflexive-tanu-tana", marker: "తాను / తన / తనకు", description: "తాను is the logophoric/reflexive third person — 'he/she' when the referent is the subject of the reporting clause, standard inside quoted thought and speech (తాను చెప్పాలనుకున్నాడని \"that he wanted to tell\" S235, తాను ప్రయత్నిస్తానని \"that she was going to try\" S236, తాను అనుకోవడం లేదు \"she doesn't want\" S302). తన is its possessive, replacing అతని/ఆమె when the possessor is the clause subject (తన సోదరి 'his sister' S332, తన సంచిలో 'in her bag' S53). English his/her/he/she collapses onto తన/తాను when subject-bound. Note తన is GENDER-NEUTRAL — the same form glosses 'his' and 'her'." },
    { id: "case-suffix-agglutination", marker: "-కు/-కి, -ను/-ని, -లో, -తో, -లు", description: "Grammatical relations are BOUND suffixes on the noun, taking an oblique stem that may differ from the citation form: dative -కు/-కి (నాకు, అతనికి, ఇంటికి 'to home' < ఇల్లు), accusative -ను/-ని (ఆమెను, పుస్తకాన్ని < పుస్తకం, దాన్ని), locative -లో (సమయంలో 'at the time', ఆఫీసులో 'in the office', ఇంగ్లీష్‌లో 'in English'), comitative/instrumental -తో (నీతో 'with you', పిల్లలతో 'with the children'), plural -లు (పదాలు, ఆలోచనలు). English a/the/to/in/with/of are realised here and need no separate introduced LEGO — the gate should treat the case-marked span as one unit. The FREE postpositions గురించి 'about', కోసం 'for', కంటే 'than', నుంచి 'from/since', దగ్గర 'near', తర్వాత 'after', లేకుండా 'without' are separate words and are free class; they follow their noun, mirror-image of English." },
    { id: "temporal-subordinators", marker: "-ఆక, -ప్పుడు, -వరకు, -నుంచి, -అప్పటి", description: "Temporal clauses are bound endings on the verb, not conjunctions: -ఆక 'after' (నువ్వు ముగించాక \"after you finish\" S11), -ప్పుడు / -అప్పుడు 'when' (వేరే మనుషులు ఉన్నప్పుడు \"when other people are there\", సరిగ్గా నిద్రపోనప్పుడు \"when I don't sleep properly\" S214), -వరకు 'until' (మిగతా అందరూ సిద్ధంగా ఉండేవరకు \"until everybody else is ready\" S396), -అప్పటి నుంచి 'since' (ప్రయత్నించినప్పటి నుంచి \"since we tried\" S146), -అప్పటి కంటే 'than when' (S117). English when/after/until/since clauses have no free Telugu word; the subordinator is glued to the verb. Licensed per ending at its debut." },
    { id: "gender-number-agreement", marker: "-ఆడు (masc) / -ఇంది (non-masc) / -ఆరు (pl-hon) / -ఆను (1sg)", description: "The finite verb carries portmanteau person-number-gender agreement, and the subject pronoun is freely droppable (pro-drop): చెప్పాను \"I said\", చెప్పావు 'you said', చెప్పాడు 'he said', చెప్పింది 'she/it said', చెప్పారు 'they/you-polite said'. The Dravidian mahat/amahat system means the 3sg FEMININE takes the same -ఇంది as the inanimate, NOT a dedicated feminine ending — see genderIsMahatAmahat in glossRules. Licensed at the first finite form; agreement variants of one verb are ONE lemma, never competing glosses." },
  ],

  // Known-side ZUT/rendering rules.
  glossRules: [
    { id: "dativeSubjectNotNominative", rule: "English nominative 'I/you/he' becomes DATIVE నాకు/నీకు/అతనికి with experiencer, cognitive, possessive and desiderative predicates: 'I know' = నాకు తెలుసు (never నేను తెలుసు), 'I like' = నాకు ఇష్టం, 'I want/need' = నాకు కావాలి / నాకు అవసరం ఉంది, \"I don't want\" = నాకు వద్దు, 'do you mind' = నీకు ఇబ్బందా, 'have you got' = నీకు ఉందా, 'how old is he' = అతనికి ఎంత వయసు ఉందో. Hold the frame constant so 'I know/like/want/need' render consistently with the dative and never with నేను. This is the same architecture as Hindi's ko-dative-experiencer; in Telugu it is even more pervasive — నాకు is the second commonest token in the whole corpus." },
    { id: "genderIsMahatAmahat", rule: "Telugu gender is mahat (human-masculine) vs amahat (everything else), NOT masculine vs feminine. The PRONOUNS distinguish అతను 'he' and ఆమె 'she' cleanly — so unlike Hindi वह or Bengali সে there is no he/she collapse at the pronoun. But the VERB collapses them: 3sg feminine takes the same non-masculine ending as the inanimate (ఆమె చెప్పింది 'she said' and అది ఉంది \"it is\" share -ఇంది; అది ఆసక్తికరంగా ఉండింది \"it was interesting\"), against masculine -ఆడు (అతను చెప్పాడు). Consequence for authoring: gender lives in the pronoun, and a pro-dropped -ఇంది clause is genuinely ambiguous between 'she' and 'it' — the seed must supply the referent. Also note the reflexive తన is gender-neutral ('his' at S332, 'her' at S316), so ONE Telugu form legitimately maps to both English possessives there." },
    { id: "indefiniteTwoSeries", rule: "Never collapse the two indefinite series. -ఐనా forms (ఏదైనా, ఏమైనా, ఎవరైనా, ఎక్కడైనా) are FREE-CHOICE: they mean 'something/someone/somewhere' in a positive declarative (ఏదైనా is glossed 'something' in all 183 hits) and extend to 'anything/anyone/anywhere' under a licensor (ఎక్కడైనా = 'somewhere' S402/S611 but 'anywhere' S182/S578). -ఊ/-ఆ forms (ఏమీ, ఇంకేమీ, ఎవరూ, ఎప్పుడూ, ఎక్కడా) are NEGATIVE-CONCORD: they require a negated verb and the PAIR renders 'nothing/nobody/never/not ... anywhere'. So English 'something' → ఏదైనా; English 'anything' → ఏదైనా under a licensor but ఏమీ + negation when the clause is negative. One Telugu form → polarity-conditioned English gloss; this is a rendering split, not a ZUT collision, and neither form should be flagged for having two English glosses." },
    { id: "inkaPolarityConditioned", rule: "ఇంకా (329×) is glossed FIVE ways in this corpus and the reading is picked by polarity and context: under negation it is 'yet' (ఇంకా సిద్ధంగా లేను \"I'm not ready yet\" S96, ఇంకా సరిపడా 'not yet' S60); with a comparative it is 'more' (ఇంకా ఎక్కువ 'a lot more' S23, ఇంకా బాగా 'much better' S29); in questions it is 'any/any more' (S563); positively it is 'still'; and it is also used as the additive 'and' (S15, S555, S592). Fix the English rendering per frame so the same token is not ZUT-flagged as a collision. The 'and' use is the one I am least sure of — see the unresolved-tokens list in the header." },
    { id: "noArticlesOkaIsA", rule: "Telugu has no articles. English 'a/an' is ఒక (literally 'one', 646×: ఒక పదాన్ని 'a word', దాదాపు ఒక వారం 'almost a week'). English 'the' has NO Telugu word — where a definite reading is needed the corpus uses the demonstrative ఆ (ఆ చిన్న కుక్కను 'the young dog' S69, ఆ మనిషి 'the man'), which elsewhere glosses 'that/those'. So ఆ legitimately renders both 'the' and 'that', and English 'the' must be treated as free (supplied English-side), never required as a separate prompt word." },
    { id: "questionByCliticNotDoSupport", rule: "English do/does/did-support and auxiliary inversion correspond to the Telugu clitic -ఆ glued to the final word (ఉందా, కావాలా, ఇబ్బందా, అనుకుంటున్నావా, ఇవ్వగలవా, పైకెత్తగలరా). There is no separate Telugu word for do/does/did/are/have in a question — they are absorbed. Do not tile English question auxiliaries as separate Telugu tokens, and do not expect a question mark or word-order cue: the clitic is the whole signal." },
    { id: "tenseAspectInVerbNotAuxiliary", rule: "English tense, aspect, modality and even the complement verb are fused into a SINGLE Telugu finite word: మాట్లాడాలనుకుంటున్నాను = 'I want to speak' (one token), ప్రయత్నిస్తున్నాను \"I'm trying / I've been trying\", చేయబోతున్నాను \"I'm going to do\", చేయాల్సి వచ్చింది \"I had to do\", గుర్తుంచుకోగలనో లేదో \"whether I can remember\". One Telugu word therefore maps to a multi-word English span, and the same Telugu shape can render several English tenses (progressive vs present-perfect-progressive). Introduce each English periphrasis once against its Telugu ending and then treat it as free; never expect a one-to-one token alignment across the pair." },
    { id: "quotativeAniFollowsTheClause", rule: "అని is a quotative complementizer that CLOSES the embedded clause (mirror-image of English 'that', which opens it): మంచిదే అని నేను అనుకుంటాను \"I think that it's a good thing\". It also cliticises onto the embedded verb (-అని/-అనేది: ఉందని, చెప్పలేదని, గెలవగలరనేది). It is grammatical glue, never a copula and never a content word, and it is obligatory where English 'that' is optional. One further gloss note: అని is occasionally glossed 'about' in the corpus (S508) — that is a component mis-gloss to watch for, not a second sense." },
    { id: "postpositionMirrorOrder", rule: "Relational words FOLLOW their noun: దాని గురించి 'about it', నీ కోసం 'for you', నిన్న రాత్రి కంటే 'than last night', ఈ ఉదయం నుంచి 'since this morning', ద్వారం దగ్గర 'near the door', కారు లేకుండా 'without a car', ఆ తర్వాత 'after that'. When matching an English prepositional phrase the Telugu constituent order is reversed, and the postposition is free-class machinery, not a content gloss. The bound case suffixes (-లో, -తో, -కి, -ను) do the same job for the core cases and are equally free." },
    { id: "zwnjInLoanCompounds", rule: "MECHANICAL BUT LOAD-BEARING: 29 token types carry an invisible ZERO-WIDTH NON-JOINER (U+200C) between a Latin-derived loan stem and its Telugu clitic — ఇంగ్లీష్‌లో 'in English' (152×), పబ్‌లో, కౌన్సిల్‌లో, రెస్టారెంట్‌కి, బీచ్‌కి, టేబుల్‌తో, వైన్‌తో, సీరియస్‌గా, ఈమెయిల్‌లు, సూట్‌కేసు, ఫుట్‌బాల్, పోస్ట్‌కార్డులు. ఇంగ్లీష్ (359×) and ఇంగ్లీష్‌లో are DIFFERENT strings that look identical on screen. Normalise U+200C/U+200D out (and apply NFC) before any comparison against an introduced gloss, or the most-taught noun in the course reads as untaught every time it appears in a locative." },
    { id: "weAndYouSplitsAreNotZutConflicts", rule: "మనం/మేము both gloss 'we' and నువ్వు/మీరు both gloss 'you'. These are many-Telugu→one-English mappings driven by inclusivity and register, and they are ZUT-LEGAL — the gate must not read them as two glosses competing for the same English prompt. What IS a finding: a seed that switches between మనం and మేము, or between నువ్వు and మీరు, for the same referent within one dialogue, since the Telugu then contradicts itself while the English looks clean." },
    { id: "negatorChoiceIsPredicateType", rule: "Telugu negation is selected by PREDICATE TYPE, not by the English negative word, and it is almost never a free-standing word. లేదు negates existence, possession and ordinary verbs (and fuses as -లేదు for the past/perfect: చూడలేదు 'haven't seen'); కాదు negates the zero equational copula (కష్టం కాదు 'not difficult'); వద్దు is the negative volitive \"don't want\"; and knowing/believing/habitual verbs use the fused negative conjugation (తెలియదు, నమ్మను, వినదు). English don't/doesn't/didn't/haven't/isn't/won't therefore fan out across four different Telugu mechanisms, none of which is a separate 'not' token. Never gloss a standalone English 'not/don't' as its own Telugu word." },
  ],
};
