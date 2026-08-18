// _known_mar — KNOWN-SIDE BRIEF for the Marathi known-side agent. FIRST PASS (2026-08-18), ratified:null.
// KNOWN-LANGUAGE-level contract: the loader falls back to this for EVERY course whose known/prompt
// language is Marathi. Today that is exactly one course, eng_for_mar (teaches English; prompts in Marathi).
// Authored from the real eng_for_mar corpus. RULE (Tom): no regex for language — this is the agent's
// reference knowledge, NOT a regex gate config. The known-side check is an agent that reads this brief +
// the introduced-vocab list + the prompt and judges. See docs/course-optimization/eng-for-x-known-side-pilot.md.
//
// CORPUS ACTUALLY READ (numbers, not adjectives). eng_for_mar, live Supabase, read-only:
// 1,407 course_legos rows (all with a non-null known_text) + 1,281 known-side component strings + 12,848
// course_practice_phrases rows = 15,536 Marathi strings, 64,593 tokens, 1,825 distinct token types,
// spanning seeds 1–668. 203 types are hapax. I walked the frequency list top-down and classified every
// type down to rank 120; ranks 1–120 account for 38,720 of 64,593 tokens (59.9%). Everything below rank
// 120 that is closed-class and reachable (जरी, शिवाय, पेक्षा, ना-tag, नये, म्हणो, करूया) was pulled up by
// hand from concordance searches rather than by rank. HONESTY NOTE on the corpus: this course's lego
// cards are known to be unreliable in places (some known/target pairs are visibly broken English, e.g.
// S128 "तुम्ही तुमच्यासारखे कोणी मी" || "you're like someone I"). Token FREQUENCY is trustworthy — that is
// what this brief is built on — but no single gloss pair below should be treated as ratified evidence.
//
// TYPOLOGY. Marathi (mar) is a Southern Indo-Aryan SOV language in Devanagari, in long contact with
// Dravidian and structurally halfway there: it is postpositional, dative-subject-dominant, split-ergative
// in the perfective, and it agrees for THREE genders (masculine -आ, feminine -ई, NEUTER -ं) and number
// on verbs, participles, adjectives, possessives and the volitional predicate. Its case system is a
// LAYERED, AGGLUTINATIVE overlay written SOLID onto a FUSIONAL oblique stem: मी → म-ला, तो → त्या-ला,
// तुम्ही → तुम्हा-ला, माझा → माझ्या-कडे, तुमचा → तुमच्या-शी, काम → कामा-वर, मित्र → मित्रां-ना. The stem
// alternation is what makes it fusional and it is why stemStrip below is EMPTY (see the stemStrip note).
//
// THE THREE PERVASIVE KNOWN-SIDE ZUT PRESSURES IN THIS PAIR
// (1) DATIVE-SUBJECT EVERYTHING. मला is the single most frequent token in the corpus (3,603 — 5.6% of all
//     tokens) because wanting, needing, liking, thinking, feeling, remembering, knowing and being-able
//     are ALL experiencer predicates with a dative subject: मला हवं आहे 'I want', मला वाटतं 'I think',
//     मला आवडेल "I'd like", मला गरज आहे 'I need', मला माहित आहे 'I know', मला आठवत नाही "I can't remember".
//     English nominative 'I/you/he' maps onto मला/तुम्हाला/त्याला across this whole family; authoring must
//     hold the frame constant so these never drift to nominative मी/तुम्ही.
// (2) ONE ENGLISH MODAL FANS OUT INTO FIVE MARATHI EXPONENTS. English 'need/want/should/must/can' does
//     NOT map one-to-one: हवं/हवी/हवा (volitional 'want', 258+60+26), -आयचं आहे (want-to on the
//     infinitive, e.g. जायचं आहे), गरज आहे (necessity, 373), करावं लागेल (obligation, 98), पाहिजे (deontic
//     'should/must', 24), नको (negative volitional 'don't want / shouldn't', 77), शकणे (ability,
//     शकतो/शकते/शकतं/शकेल/शकता/शकतील/शकत = 573 across the paradigm) and जमणे ('manage / be able', जमेल 28).
//     Each is machinery, not lexis, and each carries its own negation partner. Getting these wrong is
//     the single largest known-side hazard here.
// (3) THE INDEFINITE -तरी / -ही SPLIT. Marathi builds positive existentials with -तरी and any-/free-choice
//     items with -ही, both bonded solid: काहीतरी 'something' (481) vs काहीही 'anything/whatever' (35);
//     कुठेतरी 'somewhere' (45) vs कुठेही 'anywhere' (18); कोणालातरी 'someone' (40) vs कोणीही 'anyone' (20).
//     This is the exact analogue of Hindi कुछ vs कुछ भी, but written as one word, so it is invisible to
//     anything that looks for a separate particle. See npiLicensing.
//
// WHERE I DIVERGED FROM THE HINDI BRIEF, AND WHY (required by the brief; every divergence is corpus-checked)
// a. Hindi's headline gloss rule "vah-he-she-collapse" is DROPPED, not copied. Marathi 3sg is NOT
//    gender-neutral: तो = he (bare lego glossed 'he' at S344/S345/S420), ती = she (S372/S375), ते =
//    it/they (S64 'it', S87 'they'). The Hindi one-pronoun-two-glosses hazard simply does not exist here;
//    the opposite hazard does — see gloss rule 'te-three-way'.
// b. Hindi has TWO genders; Marathi has THREE. The neuter (-ं: चांगलं, हवं, शकतं, करायचं) is not a Hindi
//    category at all and it is the DEFAULT for infinitival/propositional subjects, so most 'want to X'
//    prompts land in it. Hindi's "want-gender-forms" rule is re-derived, not reused.
// c. ERGATIVE ने IS THIRD-PERSON ONLY. Hindi's ergative-ne construction covers मैंने/हमने/आपने. In 64,593
//    Marathi tokens there are ZERO occurrences of मीने or any 1st/2nd-person ergative: the corpus has
//    त्याने (66), तिने (113), त्यांनी (49), ज्याने (44), मित्राने, माणसाने — and plain मी with an
//    object-agreeing neuter verb for 1sg (मी विचारलं नाही "I didn't ask"). Copying Hindi here would have
//    licensed a form Marathi does not have.
// d. QUESTION PARTICLE. Hindi keeps polar क्या and wh क्यों apart. Marathi का is BOTH — 332 clause-level
//    occurrences, 87 of them glossed 'why' (debut S21 as bare 'why'), 153 in a '?' polar frame. This is
//    a Bengali-कি/কী-style minimal-pair hazard, except that in Marathi it is one identical token.
// e. FREECLASS IS MUCH SMALLER THAN HINDI'S BY DESIGN. Hindi's freeClass can list में/से/के/की/को/का/पर/ने
//    because Hindi writes its postpositions as SEPARATE WORDS. Marathi writes the whole case series solid
//    onto the oblique stem, so -ला/-ना/-चा/-ची/-चं/-शी/-त/-वर/-कडे/-साठी/-बद्दल/-पासून/-पर्यंत/-मध्ये/
//    -बरोबर/-पेक्षा are BOUND and can never be freeClass tokens. Following the Bengali header's reasoning,
//    bound clitics do not belong in freeClass — but unlike Bengali I could not put them in stemStrip
//    either (below), so they are handled entirely by the 'layered-postposition' construction instead.
// f. INCLUSIVE/EXCLUSIVE 'WE', which Hindi lacks. आम्ही (354) is exclusive we; आपण (97) is inclusive.
//    But the corpus shows आपण is DOMINANTLY something else again — see gloss rule 'aapan-you-or-lets'.
// g. Hindi's चाहिए/सकना pair is replaced by the five-way modal split described in pressure (2).
//
// WHY stemStrip IS EMPTY — the measurement, not an opinion. I tested 24 candidate suffixes by stripping
// them from every corpus type and asking whether the residue is itself an attested corpus token. Result:
// EVERY case suffix lands on the OBLIQUE stem, not the lemma, so stripping does not recover the
// introduced gloss and does create false matches. Measured hit rates (attested-residue share of tokens):
//   -ला 39% (3,861 tokens) — but the "hits" are oblique stems (तुम्हाला→तुम्हा, not तुम्ही) and the misses
//        are catastrophic: -ला is ALSO the masc.sg past ending (म्हणाला 'he said' → म्हणा, which is the
//        imperative 'say') and the infinitive+dative (करायला/बोलायला/राहायला → कराय/बोलाय/राहाय).
//   -त  34% (4,774) — but -त is simultaneously the locative (इंग्रजीत→इंग्रजी ✓), the plural copula ending
//        (आहेत, नाहीत), the imperfective participle (करत, वाटत, आठवत) and lexeme-final in माहित, मदत,
//        जास्त, सुरुवात, उत्तर-adjacent forms. Four unrelated jobs, one string.
//   -चं 2% (1,723), -चा 12% (642), -ची 16% (965) — near-total failure, because they attach to the oblique
//        infinitive (करायचं ← करणे) and because these three ARE the three-gender contrast that gloss rules
//        'three-gender-agreement' and 'hava-agrees-with-the-wanted-thing' must inspect. Stripping them
//        destroys exactly the information this contract relies on — the same argument the Hindi brief
//        makes for -ता/-ती/-ते.
//   -ना 13% (745), -ांना 14% (547), -यांना 0% (438), -नी 0% (86), -ांची 0% (44) — the plural oblique
//        (-ां-) is a stem change, so stripping the visible suffix always leaves a non-word (त्यांना→त्यां).
//   -ही 67% (3,632) looks tempting until you see the misses: तुम्ही→तुम् and आम्ही→आम्, i.e. the #9 and
//        #28 tokens in the whole corpus are destroyed. Unusable.
//   -च 89% (838) is the ONE genuinely safe-looking clitic (emphatic: आधीच→आधी, लवकरच→लवकर, तेच→ते), but
//        it still eats real lexemes (उंच 'tall'→उं, चर्च 'church'→चर्), and shipping a one-item stemStrip
//        buys ~1.3% of tokens at the cost of telling the machinery that suffix-stripping is safe in this
//        language, which it is not. Rejected.
// So: stemStrip = []. This is the honest answer. Marathi known-side matching must be LEMMA-AWARE (the
// agent knows मला is the dative of मी), not suffix-stripping. Because morphology is 'fusional', the gate
// must NOT call an exact-form miss a violation — it falls back to stem containment and, where that is
// inconclusive, reports UNCHECKED(morphology_unresolved). For Marathi that fallback will fire OFTEN and
// that is correct: an honest UNCHECKED beats a fabricated pass. stemMinLen is set to 3 so that it is a
// sane value the day a ratified pass adds a vetted affix; while stemStrip is empty it is inert.
//
// TOKENS I COULD NOT CONFIDENTLY CLASSIFY (this list is the point of the exercise)
//  • ते (1,492, rank 4) — THREE jobs I cannot separate by form: 3pl 'they' (S87), neuter 3sg 'it' (S64,
//    S329), and the correlative/complement head 'that (which)' resuming a clause (…ते मला माहीत आहे
//    "I know what…"). Left in freeClass as a pronoun, but the correlative use may need its own licence.
//  • असं (242) — manner adverb 'like this / such' (असं मोठ्या आवाजात संगीत 'such loud music') AND the
//    sentence-final quotative particle before वाटतं/म्हणाला (…असं मला वाटतं "I wish/I think that…"). I
//    shipped it as a construction (quotative-asa) because the quotative use is the commoner one in the
//    corpus, but the adverbial use is real and the split is not recoverable from the token.
//  • तर (162) — conditional enclitic closing a protasis (जमलं असतं तर "if she could"), consequent 'then'
//    (जर … तर), and a topic/emphatic particle. Shipped as free, but the conditional use is a genuine
//    NPI licensor and the other two are not.
//  • अजून (300) — 'yet' (NPI: ते अजून तयार नाहीत "they're not ready yet"), 'still' (veridical: पण मला अजून
//    काम आहे "but I still have work"), and 'even more' (अजून चांगलं 'even better', S29). Only the first is
//    an NPI and nothing in the form tells you which you have. Listed in npi WITH this caveat, exactly as
//    the Bengali brief handles এখনো.
//  • माहित (491) vs माहीत (24) — the SAME word, two spellings in one course (ह्रस्व/दीर्घ ि/ी). Any
//    exact-form matcher sees two types. I have not corrected the corpus (read-only job); the agent must
//    treat them as one lemma. Flagged as gloss rule 'mahit-spelling-variance'.
//  • वाटतं / वाटतंय / वाटत / वाटते (850+105+150+9 = 1,114) — the experiencer verb वाटणे, glossed across the
//    corpus as 'think', 'feel', 'seem' AND "would like" (S11 मला वाटतं || "I'd like"). Rank 8, and I
//    deliberately did NOT put it in freeClass: it carries the clause's event, exactly as the Bengali brief
//    excluded করা/মনে. It gets a gloss rule instead. If a later pass decides its 'seem' reading is pure
//    machinery, that is a reclassification I could not justify from frequency alone.
//  • The करणे light-verb family (करत 146, करायला 286, करायचं 129, करू 123, करतोय 118, करता 64, करणं 54,
//    करावं 78, करणार 109 …) — Bengali's করা problem verbatim. Excluded from freeClass because it carries
//    the event; the -आयचं / -णार / -तोय / -आवं inflections ARE machinery and are licensed as constructions.
//  • हो (79) — 'yes' vs the imperative/subjunctive of होणे 'become'. Shipped as free ('yes'); the verbal
//    reading is rare here but real.
//  • ना (14 as a free token) — the confirmation tag ("हरकत नाही ना" = "do you mind?"). Not to be confused
//    with the bound dative-plural -ना (745 occurrences, all solid on a noun). Shipped as a free tag.
//  • जास्त (157) — comparative degree 'more' (machinery, pairs with -पेक्षा 'than') vs the plain adjective
//    'a lot'. Shipped free as a degree word; the comparative frame is a separate construction.
//  • इंग्रजीत (722, rank 11) — 'in English'. Not a function word at all; it is this course's FRAME phrase,
//    appended to a large share of prompts. Classified as content, but named here because its rank will
//    otherwise mislead anyone reading the frequency list cold.
module.exports = {
  course_code: '_known_mar',
  ratified: null,
  known_lang: 'mar',
  known_lang_name: "Marathi",
  is_known_default: true,

  // --- tokenizer / outcome machinery ------------------------------------------------------------
  script: 'Deva',
  segmentation: 'space',      // Devanagari, whitespace-delimited orthographic words.
  morphology: 'fusional',     // Layered agglutinative case ON a fusional oblique stem (see header).
                              // Exact-form failure may NOT be called a violation; fall back to stem
                              // containment, else UNCHECKED(morphology_unresolved).
  stemStrip: [],              // DELIBERATELY EMPTY — measured, not assumed. See the stemStrip note above.
  stemMinLen: 3,              // Inert while stemStrip is empty; a sane floor for any future ratified affix.

  // --- free class -------------------------------------------------------------------------------
  // Genuinely FREE-STANDING closed-class Marathi words, corpus-derived, never "introduced". Bound case
  // clitics are absent by design (they are written solid — see divergence (e)); so are the light verb
  // करणे and the experiencer वाटणे, which carry events.
  // 123 of these 130 items are attested in the eng_for_mar corpus and together cover 25,063 of 64,593
  // tokens (38.8%). SEVEN are NOT attested here and are declared PARADIGM GAP-FILLS, added so that a
  // future Marathi-known course does not get a legal form flagged as a leak merely because eng_for_mar
  // happened not to use it: आपला, आपलं (masc/neut of the attested आपली/आपल्या), त्यांची, त्यांच्या
  // (fem/oblique of the attested त्यांचा/त्यांचं), जरी ('although', the preposed partner of the attested
  // तरी), कशी (fem of the attested कसं/कसे), इकडे ('over here', the partner of the attested तिकडे).
  freeClass: [
    // copula / existential (होणे, असणे) — present, past, habitual, future
    "आहे","आहेत","आहात","आहोत","होतं","होती","होता","होते","होतो","असतं","असती","असता","असेल","असतील","होईल",
    // 1st/2nd person pronouns and their solid dative/genitive forms
    "मी","मला","माझा","माझी","माझं","माझे","माझ्या","तुम्ही","तुम्हाला","तुम्हा","तुमचा","तुमची","तुमचं","तुमच्या",
    "आम्ही","आम्हाला","आमचा","आमची","आमचं","आमच्या","आपण","आपल्याला","आपला","आपली","आपलं","आपल्या",
    // 3rd person pronouns, incl. the ergative forms
    "तो","ती","ते","त्या","त्याला","तिला","त्यांना","त्याचा","त्याची","त्याचं","त्याच्या","तिचा","तिची","तिचं","तिच्या",
    "त्यांचा","त्यांची","त्यांचं","त्यांच्या","त्याने","तिने","त्यांनी","स्वतः",
    // demonstratives / determiners
    "हा","ही","हे","या","एक","एका","दुसरा","दुसरी","दुसरं","सगळे","सगळं","सगळी","सगळ्या","प्रत्येक","दोन्ही",
    // relatives + correlatives + complementizer
    "जो","जी","जे","ज्या","ज्याने","की",
    // conjunctions / subordinators / discourse
    "आणि","किंवा","पण","कारण","जर","तर","तरी","जरी","म्हणून","म्हणजे","मग","नंतर","जेव्हा","तेव्हा","शिवाय",
    // interrogatives (का is machinery — see constructions — and is NOT listed here)
    "काय","कोण","कुठे","कसं","कसे","कशी","किती",
    // positive existential indefinites (the -तरी series; the -ही series is in npi)
    "काहीतरी","कुठेतरी","कोणीतरी","कोणालातरी",
    // degree / focus / deictic adverbials
    "खूप","फार","अगदी","जास्त","थोडा","थोडं","थोड्या","फक्त","इथे","तिथे","तिकडे","इकडे","पुन्हा","आधी","परत",
    // polarity-neutral answer + tag particles
    "हो","ना","बरं","ठीक",
  ],

  // --- negative polarity ------------------------------------------------------------------------
  // Seven of these ten are attested in eng_for_mar. THREE are declared paradigm gap-fills, listed for
  // the same forward-compatibility reason as the freeClass gap-fills: कोणालाही (dative of the attested
  // कोणीही), मुळीच ('not in the least', the strict-NPI partner of the attested अजिबात), and एकही
  // ('not a single', the scalar -ही form). Do not read their presence as corpus evidence.
  npi: ["काहीही","काहीच","कोणीही","कोणालाही","कुठेही","कधीही","अजिबात","अजून","मुळीच","एकही"],
  npiLicensing: {
    rule: "Marathi negative-polarity / free-choice items are built by bonding the emphatic clitic -ही ('even, at all', the cognate of Hindi भी) onto an indefinite: काहीही 'anything/whatever', कोणीही 'anyone', कुठेही 'anywhere', कधीही 'ever', plus the pure NPI adverbs अजिबात 'at all' and मुळीच 'not in the least' and the scalar एकही 'not a single'. They are licensed ONLY in NON-VERIDICAL / downward-entailing environments, and in every such environment they are FREE (no introduction needed). The ONLY violation is an NPI standing in a plain POSITIVE DECLARATIVE that asserts existence. The agent must JUDGE the environment, not pattern-match — nothing in the token tells you which environment it sits in. The decisive Marathi-specific fact is the -तरी / -ही SPLIT: a positive declarative 'something / someone / somewhere' is the -तरी form (काहीतरी 481×, S4 'something'; कोणालातरी 40×, S234 'I met someone last night'; कुठेतरी 45×, S402 'I want to eat something somewhere'), whereas the -ही form means 'anything (at all) / any / whatever' and REQUIRES a licensor (काहीही at S35 'did you want to show me anything?', S39 'she doesn't want to read anything', S320 'he doesn't need to buy anything'; कोणीही at S370 'I didn't see anyone that I knew', S531 'anyone can win the game' under a modal; कुठेही at S376 'I didn't go anywhere last month' / 'she can go anywhere' under ability). So 'I want something' = काहीतरी, and 'I don't want anything' / 'do you want anything' / 'if you want anything' = काहीही. Bare काही is the ambiguous middle: it is the free quantifier 'a few / some' in positive declaratives (S56 'I can remember a few words', S350 'I want to see some old friends') and only reads as 'anything' under a licensor (S35). TWO CAVEATS the agent must carry: (1) अजिबात is a STRICT NPI — it never appears without a negator anywhere in this corpus (34/34 occurrences co-occur with नाही) and is a violation in any positive clause. (2) अजून is an NPI ONLY in its 'yet' reading (S183 'I haven't seen them yet', S431 'they're not ready yet'); its 'still' reading (S558 'but I still have work') and its 'even more' reading (S29 अजून चांगलं 'even better') are veridical and are NOT NPIs — do not flag those. Do NOT flag a licensed NPI as unintroduced vocabulary, and do NOT let a -ही form pass in a bare positive assertion.",
    licensedIn: [
      "Clausal negation with नाही / नाहीये / नाहीत (S39 तिला काहीही वाचायचं नाही 'she doesn't want to read anything'; S485 इथे काहीही नाही 'nothing here'; S370 मी ओळखत असलेलं कोणीही मला दिसलं नाही 'I didn't see anyone I knew')",
      "Past/perfect negation with नव्हतं / नव्हती / नव्हता / नव्हतो (S375 मला माहित नव्हतं 'I didn't know'; S518 मी करू शकत नव्हतो 'I couldn't')",
      "Negative volitional नको ('don't want / shouldn't': S320 मला आणखी एक टीव्ही नको आहे; S404 आम्ही खायची अपेक्षा करायला नको) and the prohibitive/optative नये (S557 त्यांनी वाजवू नये 'I wish they wouldn't play')",
      "Polar questions marked by clause-final का (S35 काहीही दाखवायचं होतं का? 'did you want to show me anything?'; S182 चाव्या कुठे पाहिल्या का? 'have you seen my keys anywhere?'; S360 तुम्ही आणखी काही ऐकलं का? 'did you hear anything else?') and the confirmation tag ना (S281 हरकत नाही ना 'do you mind')",
      "Conditionals and hypotheticals — जर …(तर) (S49 जर तुम्हाला माहित असेल 'if you know'; S225 जर जमलं असतं 'if he could'), the clause-final conditional तर (S317 तिला हवं असेल तर 'if she wanted to'), and concessive तरी / असलं तरी (S352 त्याला हवं असलं तरी 'even if he wanted to')",
      "Volitional / desiderative scope — हवं/हवी/हवा 'want', the -आयचं आहे want-to construction, and आवडेल 'would like' (S402 मला कुठेतरी काहीतरी खायचं आहे; S411 आम्हाला काहीतरी खायला आवडेल; free-choice काहीही under 'want')",
      "Ability and potential modals — शकणे (शकतो/शकते/शकतं/शकेल/शकता/शकतील) and जमणे (जमेल/जमलं/जमणार नाही): S376 ती कुठेही जाऊ शकते 'she can go anywhere'; S531 कोणीही खेळ जिंकू शकतं 'anyone can win the game'; S7 जमेल तितका 'as hard as I can'",
      "Necessity / obligation modals — गरज आहे / गरज नाही 'need / don't need' (S320 त्याला काहीही घ्यायची गरज नाही 'he doesn't need to buy anything'; S420 त्यांना काही प्रश्न विचारायची गरज नाही), करावं लागेल 'have to', पाहिजे 'should/must'",
      "Comparatives and superlatives with -पेक्षा 'than' and सगळ्यात / सर्वात 'most' (S114 त्यापेक्षा 'than [yesterday]'; 'better than anyone / most of any')",
      "Free-choice and universal readings — the -ही forms in their 'whatever / whoever / wherever' sense (S480 तो काहीही म्हणो, आम्ही ते बदलू शकत नाही 'whatever he says we can't change it'; S544 ज्याने कोणी म्हटलं 'whoever said it'), and generic/habitual or not-yet-realised frames (-पूर्वी 'before', -पर्यंत 'until': S396 बाकी सगळे तयार होईपर्यंत 'until everybody else is ready')",
      "Doubt / uncertainty predicates — मला खात्री नाही 'I'm not sure' (S10, S104, S531) and मला माहित नाही 'I don't know' (S70, S225, S375, S527), which embed a non-veridical complement",
    ],
  },

  // --- negation ---------------------------------------------------------------------------------
  // Reference list; negation detection is the agent's judgment, never a regex.
  negation: ["नाही","नाहीये","नाहीत","नव्हतं","नव्हती","नव्हता","नव्हतो","नको","नये","नसतं","न"],

  // --- Marathi machinery licensed at a carrier's debut ------------------------------------------
  knownConstructions: [
    { id: "dative-experiencer-subject", marker: "मला / तुम्हाला / त्याला / तिला / आम्हाला / त्यांना / आपल्याला", description: "THE dominant Marathi frame and the reason मला is the corpus's #1 token (3,603 = 5.6% of all tokens). Psychological, volitional, epistemic and modal predicates take a DATIVE subject, not a nominative one: मला हवं आहे 'I want', मला वाटतं 'I think/feel', मला आवडेल \"I'd like\", मला गरज आहे 'I need', मला माहित आहे 'I know', मला आठवत नाही \"I can't remember\", तुम्हाला काय करावं लागेल 'what do you need to do'. English nominative I/you/he/she/we/they maps onto this dative series across the whole family. Licensed at the first dative-experiencer debut (S1 मला हवं आहे); after that the frame is machinery, and a prompt must not silently switch to nominative मी/तुम्ही for these predicates." },
    { id: "layered-postposition-on-oblique", marker: "-ला, -ना, -चा/-ची/-चं, -शी, -त, -वर, -कडे, -साठी, -बद्दल, -पासून, -पर्यंत, -मध्ये, -बरोबर, -पेक्षा, -शिवाय", description: "Marathi is postpositional AND writes its postpositions SOLID onto an OBLIQUE stem, so the case marker is never a separate token: मी→मला, तो→त्याला, तुम्ही→तुम्हाला, माझा→माझ्याकडे 'with me', तुमचा→तुमच्याशी 'with you', काम→कामावर 'at work', मित्र→मित्रांना 'to friends', गोष्ट→गोष्टीबद्दल 'about the thing'. Two consequences the agent must hold: (a) an English preposition has NO standalone Marathi counterpart to look for — it is inside the noun token; (b) the oblique stem differs from the citation form, so exact-form matching against an introduced gloss will fail on a perfectly legal inflection. This is the single biggest source of UNCHECKED(morphology_unresolved) in this language and it is expected. Licensed at the first postposition debut." },
    { id: "three-gender-agreement", marker: "-आ (masc) / -ई (fem) / -ं (neut): चांगला/चांगली/चांगलं ; हवा/हवी/हवं ; शकतो/शकते/शकतं ; करायचा/करायची/करायचं", description: "Verbs, participles, adjectives, possessives and the volitional predicate agree in gender AND number with their controller across THREE genders — masculine, feminine and NEUTER. The neuter is not a Hindi category and it is the default for infinitival/propositional controllers, which is why -चं/-यचं forms dominate the corpus (चं 1,723 occurrences as a final). One English form therefore surfaces as three Marathi shapes (a legal one-to-many ZUT mapping, NOT a conflict). Licensed at the first agreeing debut; the learner producing English never chooses gender, but the prompt's gender is fixed by its controller." },
    { id: "third-person-ergative", marker: "त्याने / तिने / त्यांनी / ज्याने / <noun>ने", description: "Split ergativity in the perfective: a THIRD-person subject takes the ergative -ने/-नी and the verb agrees with the object (S224 त्याने आत्ताच सुरुवात 'he's just started', S268 तिने मला दोन ईमेल पाठवले 'she sent me two emails', S211 त्यांनी आम्हाला सांगितलं 'they told us'). CRITICAL divergence from Hindi: 1st and 2nd person do NOT take ergative -ने in Marathi — there are ZERO occurrences of मीने in 64,593 tokens; 1sg perfective is plain मी + a neuter object-agreeing verb (मी विचारलं नाही \"I didn't ask\"). Licensed at the first ergative debut." },
    { id: "volitional-hava", marker: "हवं / हवी / हवा (+ आहे / होतं / असेल)", description: "The volitional predicate 'want/need', with a DATIVE subject and gender-number agreement with the WANTED THING, not the wanter: मला मदत हवी आहे 'I want help' (fem मदत), मला वेळ हवा आहे 'I need time' (masc वेळ), मला ते हवं आहे 'I want that' (neut). Past हवं होतं 'wanted'; conditional हवं असेल तर 'if …wanted to'. 258+60+26 = 344 occurrences. Pure machinery — license the paradigm once; हवा/हवी/हवं are one lemma, not three items." },
    { id: "want-to-infinitive", marker: "-आयचं / -आयची / -आयचा + आहे / होतं / नाही", description: "'Want to X' is built on the oblique infinitive plus the genitive-agreeing ending and a copula: जायचं आहे 'want to go', भेटायचं आहे 'want/need to meet', बोलायचं होतं 'wanted to speak', करायचं नाही \"don't want to do\". This is the highest-frequency want-construction in the corpus (करायचं 129, जायचं 128, बोलायचं 160, भेटायचं 118, शिकायचं 71 …) and it agrees for three genders with the thing wanted. Its negation is the plain नाही, NOT नको. Licensed at its first debut (S18 आम्हाला भेटायचं आहे)." },
    { id: "necessity-garaj", marker: "गरज आहे / गरज नाही / गरज होती / गरज नव्हती", description: "The necessity predicate 'need to' (373 occurrences, debut S44): dative subject + an agreeing -आयची/-आयचं infinitive + गरज + copula — त्याला वाचायची गरज आहे 'he needs to read', आम्हाला वळायची गरज आहे 'we need to turn', S47 तुम्हाला माहित असायची गरज नाही \"you don't need to know\". Negated by नाही (not by नको). Closed-class modal machinery in the चाहिए class, not lexical content." },
    { id: "obligation-lagel", marker: "-आवं / -आवी + लागेल / लागलं / लागतं", description: "External obligation 'have to / will need to': the -आवं subjunctive participle plus लागणे — S167 तुम्हाला काय करावं लागेल 'what do you need to do', S181 आईला डॉक्टरकडे न्यावं लागेल 'I have to take my mother to the doctor', S405 बुकिंग करावं लागेल 'we have to book', S452 ट्रेन पकडावी लागेल 'they have to catch the train' (fem agreement). 98 occurrences of लागेल plus लागलं/लागतंय. Distinct from गरज (felt need) and पाहिजे (deontic should) — three different English renderings must stay apart." },
    { id: "deontic-pahije", marker: "पाहिजे", description: "Invariant deontic modal 'should / must' (24 occurrences, debut S98): मी जायला पाहिजे 'I should go', S109 आम्ही मेहनत केली पाहिजे 'we must work hard'. Takes no agreement. Low frequency but it is the ONLY exponent of English 'must' in this course, so it must be recognised as machinery rather than read as content — this is precisely the चाहिए failure mode the pilot found." },
    { id: "negative-volitional-nako", marker: "नको", description: "The negative volitional 'don't want / shouldn't' (77 occurrences, debut S100). It negates हवं (मला ते नको आहे \"I don't want it\", S473) and negates a -आयला infinitive as advice (काळजी करायला नको 'shouldn't worry', S100; आम्ही अपेक्षा करायला नको 'we shouldn't expect', S404), and it forms the negative hortative with आपण (S534 आपण बाहेर जाऊ नको \"let's not go outside\"). Marathi has a DEDICATED word here; do not build 'don't want' from नाही + हवं." },
    { id: "prohibitive-optative-naye", marker: "नये", description: "The prohibitive/optative negator 'should not / wouldn't' on a bare verb stem (10 occurrences, all S557): त्यांनी वाजवू नये असं मला वाटतं \"I wish they wouldn't play\". Distinct from नाही (declarative), नको (volitional) and नव्हतं (past). Rare but it is the sole exponent of the English 'I wish they wouldn't' frame." },
    { id: "ability-shakane", marker: "शकतो / शकते / शकतं / शकता / शकेल / शकतील / शकत नाही", description: "The ability/possibility auxiliary शकणे on a bare verb stem, agreeing for three genders and person, with a future/potential शकेल for 'could' (573 occurrences across the paradigm): मी करू शकतो 'I can do', ती घडवू शकते 'she can build', कोणीही जिंकू शकतं 'anyone can win', तो मदत करू शकेल \"he'll be able to help\", तो देऊ शकत नाही \"he can't provide\". Note the negative uses the INVARIANT stem शकत + नाही. One lemma; the agreeing forms are not separate items. Also an NPI-licensing environment." },
    { id: "potential-jamane", marker: "जमेल / जमलं / जमणार नाही / जमलं असतं", description: "A SECOND ability auxiliary, जमणे 'to manage / be able / it works out', semantically distinct from शकणे and impersonal (it takes a dative experiencer): S7 जमेल तितका प्रयत्न 'as hard as I can', S225 जर जमलं असतं 'if he could', S352 त्याला ते जमणार नाही \"he wouldn't be able to\". English 'can/could/be able to' therefore has TWO Marathi carriers; keep the mapping deterministic per frame rather than letting them alternate." },
    { id: "liking-avadane", marker: "आवडेल / आवडतं / आवडते / आवडत नाही / आवडणार", description: "The dative-experiencer verb आवडणे 'like / would like / enjoy': मला आवडेल \"I'd like\" (148), मला आवडतं 'I like/enjoy' (112), मला आवडत नाही \"I don't enjoy\" (S55). The conditional आवडेल is the standard rendering of English \"I'd like to\" and the present आवडतं of 'I like/enjoy' — a tense-to-gloss mapping that must be held constant. Machinery in the dative-experiencer family, not a content verb to re-introduce per tense." },
    { id: "polar-and-wh-ka", marker: "का", description: "ONE token, TWO grammatical jobs (332 clause-level occurrences). (a) Clause-final POLAR question particle, the whole of English do/does/did-support and auxiliary inversion: तुम्हाला इथे आवडतं का? 'do you like it here?', चाव्या कुठे पाहिल्या का? 'have you seen my keys?'; 153 of the 332 sit in a '?' frame. (b) Clause-internal wh-word 'why': debut S21 as the bare gloss 'why', S113 का आठवत नाही \"why can't I remember\", S135 तुम्हाला का वाटतं 'why you think that'; 87 of the 332 are glossed 'why'. Marathi does NOT keep these apart the way Hindi keeps क्या from क्यों. Licensed at S14/S21; the agent must judge which reading a prompt has from position and from the English side." },
    { id: "complementizer-ki", marker: "की", description: "The finite complementizer 'that' introducing clausal complements (895 occurrences, debut S10): मला वाटतं की … 'I think that …', ती म्हणाली की … 'she said that …', मला माहित नाही की … \"I don't know that/whether …\". Optional in English, near-obligatory here. Note S10 की मला आठवेल is glossed 'if I can remember' — की also covers embedded 'whether'. Free-standing machinery." },
    { id: "quotative-asa", marker: "असं (… वाटतं / म्हणाला / दिसतं)", description: "Sentence-final quotative/complementising असं, the mirror-image alternative to preposed की: त्यांनी वाजवू नये असं मला वाटतं \"I wish they wouldn't play\", ते चांगलं आहे असं ज्याने कोणी म्हटलं 'whoever said it's good', काहीच चालत नाहीये असं दिसतंय 'nothing seems to be working'. 242 occurrences. Ambiguous with the manner adverb असं 'like this / such' (S557 असं मोठ्या आवाजात संगीत 'such loud music') — see the header's unclassified list. Licensed as machinery at its debut." },
    { id: "prospective-nar", marker: "-णार (+ आहे / होतं / नाही)", description: "The prospective 'going to / will': करणार आहे \"I'm going to do\" (109), येणार आहे 'is going to come' (48), होणार आहे 'is going to happen' (44), देणार, पळणार, लागणार. Built on the verb stem plus -णार plus a copula; the copula may be dropped. This is English 'going to' and near-future 'will'; distinct from the future copula होईल and from the -एल future (करेल, विचारेन, आठवेल). Licensed at its debut." },
    { id: "progressive-toy", marker: "-तोय / -तेय / -ताय / -तंय (करतोय, पाहतोय, शिकताय, वाटतंय, येतेय)", description: "Colloquial present progressive, a contraction of the -त participle plus आहे, agreeing for person and three genders: मी करतोय \"I'm doing\" (118), तुम्ही शिकताय \"you're learning\", मला वाटतंय \"I'm feeling\" (105), ती येतेय. Renders English present progressive and, with a duration phrase, present-perfect-progressive. The uncontracted करत आहे / करत नाहीये (95) is the same construction. Licensed at its debut." },
    { id: "conditional-jar-tar", marker: "जर … (तर) ; clause + तर ; असलं तरी", description: "Three conditional/concessive shapes: preposed जर 'if' (42, S44/S49), the clause-final conditional enclitic तर (162, S229 जमलं असतं तर 'if she could', S317 तिला हवं असेल तर 'if she wanted to'), and concessive तरी / -लं तरी 'although / even if' (38, S178 'although I wanted', S352 'even if he wanted to'). जर is optional — a bare clause + तर is a complete conditional, which means an English 'if' can have no separate Marathi word. All three are NPI licensors. Licensed at first debut." },
    { id: "relative-correlative", marker: "जो / जी / जे / ज्या / ज्याने … तो / ती / ते", description: "Relative clauses are correlative and gender-agreeing: the जो-series opens the relative clause and a matching तो-series pronoun resumes it in the main clause — S234 मी कोणालातरी भेटलो जी तुमच्या बहिणीला ओळखते 'I met someone who knows your sister' (fem जी), जो तुमच्या भावाबरोबर काम करतो (masc जो), S344 ज्याने सांगितलं 'who said' (ergative). English postnominal 'who/that/which' maps onto a gender-selected जो-form; the correlative resumptive has no English counterpart. Licensed at its debut." },
    { id: "honorific-register-tumhi", marker: "तुम्ही / तुम्हाला / तुमच्या ; आपण / आपल्याला", description: "The formality tier is nearly fixed: the intimate तू appears ZERO times in 64,593 tokens. तुम्ही (716) is the default 'you' throughout. From seed 501 a SECOND, higher honorific tier appears — आपण / आपल्याला / आपल्या (S644 आपण ते सांगाल का साहेब? 'could you say that sir?', S645 मी आपल्याला मदत करू शकतो 'I can help you'), used in the 639–655 block. So English 'you' maps to तुम्ही by default and to आपण only in the explicitly deferential seeds; the tier is a licensed choice at S501, not a free variant." },
    { id: "inclusive-exclusive-we", marker: "आम्ही / आम्हाला (exclusive) vs आपण / आपल्याला (inclusive)", description: "Marathi splits 'we': आम्ही (354, debut S102) EXCLUDES the addressee; आपण INCLUDES them and is the carrier of the hortative 'let's' (S522 आपण मान्य करूया \"let's agree\", S534 आपण बाहेर जाऊ नको \"let's not go outside\"). English 'we' does not encode this, so the known side fixes it per seed and it must not drift. Hindi has no such distinction, which is why this construction is not in the Hindi brief. Licensed at each carrier's debut. See also the gloss rule 'aapan-you-or-lets' — आपण's honorific-you reading is actually the commoner one in this corpus." },
    { id: "comparative-pekshaa", marker: "-पेक्षा / जास्त / सगळ्यात / सर्वात", description: "Comparison is postpositional: the standard takes -पेक्षा 'than' solid (त्यापेक्षा 'than that/yesterday', 50), with जास्त / अधिक 'more' as the degree word, and the superlative is सगळ्यात / सर्वात 'most of all' (62+29). English 'than X' is a preposed phrase; Marathi's is a suffixed one. Also an NPI-licensing environment ('better than anyone'). Licensed at its debut." },
  ],

  // --- known-side ZUT / rendering rules ----------------------------------------------------------
  glossRules: [
    { id: "to-ti-te-gender-is-real", rule: "MARATHI 3sg IS NOT GENDER-NEUTRAL — do not import the Hindi वह / Bengali সে collapse. तो = 'he' (bare lego glossed 'he' at S344, S345, S420), ती = 'she' (S372, S375), ते = 'it' or 'they' (S64 'it', S87 'they'). The oblique series is equally distinct: त्याला 'him', तिला 'her', त्यांना 'them'; possessives त्याचा/त्याची/त्याचं 'his' vs तिचा/तिची/तिचं 'her'. Because the pronoun already fixes the referent's gender, a Marathi prompt with तो may NEVER be glossed 'she' and vice versa — a one-to-one mapping where Hindi has one-to-two. Note the possessive agrees with the POSSESSED noun, not the possessor (त्याची कार 'his car', fem कार), so the -आ/-ई/-ं ending on a possessive tells you nothing about the owner's gender; the pronoun stem त्या-/ति- does." },
    { id: "te-three-way", rule: "ते (1,492 occurrences, rank 4) carries THREE unrelated jobs and the token cannot distinguish them: (a) 3pl 'they' (S87 bare lego 'they'), (b) neuter 3sg 'it / it's' (S64, S329, S330, S374), (c) the correlative/complement head 'that (which)' resuming or anticipating a clause (S104 आम्ही जे करतोय ते \"what we're doing\", S648 …ते मला माहीत आहे 'I know what …'). The English rendering must be fixed per seed by context. This is a KNOWN UNRESOLVED item — flagged in the header, not solved here." },
    { id: "aapan-you-or-lets", rule: "आपण / आपल्याला / आपल्या is the sharpest ZUT hazard in this pair and it is NOT what the inclusive/exclusive story alone predicts. Across 220 corpus rows containing an आपण-form, 175 gloss to English 'you / your' (the high-honorific second person, seeds 639–655: S642 आपल्याला कसं वाटतंय 'how do you feel', S644 आपण ते सांगाल का साहेब? 'could you say that sir?', S650 आपल्याला माझ्याबरोबर जायचं आहे का? 'do you want to go with me?') and only 45 gloss to 'we / us / let's' (the inclusive hortative: S501 आपण … बोलू शकतो 'we can talk', S522 आपण मान्य करूया \"let's agree\", S534 आपण बाहेर जाऊ नको \"let's not go outside\"). One Marathi form, two English persons. Disambiguation is by the verb: honorific-you takes 2pl agreement (सांगाल, करताय, आहात), inclusive-we takes 1pl or the hortative -ऊया (करूया, जाऊ). The agent must NOT treat 'you' and \"let's\" on आपण as a ZUT conflict, and must NOT let a prompt swap one reading for the other." },
    { id: "aamhi-is-exclusive", rule: "आम्ही / आम्हाला / आमच्या (354 / 399 / 22) is the EXCLUSIVE 'we' — it excludes the person being addressed. English 'we' is ambiguous between this and inclusive आपण, so the known side has already made the choice and it is not the learner's to re-make. Do not render an आम्ही prompt with a \"let's\" English gloss (that is आपण + -ऊया), and do not swap आम्हाला for आपल्याला in a seed that has fixed the exclusive reading." },
    { id: "ka-polar-vs-why", rule: "का is a single token doing two jobs and this must never collapse: clause-final का = the POLAR question particle carrying all of English do-support and auxiliary inversion ('do you like it here?', 'have you seen my keys?', 'did you hear anything else?'), while clause-internal का = the wh-word 'why' (S21 debut glossed bare 'why', S113 'why can't I remember', S269 'why don't you want'). Of 332 clause-level occurrences, 87 gloss to 'why' and 153 sit in a '?' polar frame. There is NO separate Marathi 'do' — a polar question is the plain statement plus का — so the English do/does/did in these prompts is supplied English-side and must be treated as free on the known side. This is a Bengali-कि/কী-type split with a much worse property: the two are homographs, not a minimal pair." },
    { id: "hava-agrees-with-the-wanted-thing", rule: "हवा / हवी / हवं agrees in gender and number with the THING WANTED, not with the wanter: मला मदत हवी आहे 'I want help' (fem मदत), मला वेळ हवा आहे 'I need time' (masc वेळ), मला ते हवं आहे 'I want that' (neut), मला खेळणी हवी आहेत 'I want my toys' (pl). A single English 'want' therefore surfaces as three or four Marathi shapes determined by the object. Record as agreement-driven one-to-many, NOT as lexical choice and NOT as a ZUT conflict. The same agreement drives शकतो/शकते/शकतं and करायचा/करायची/करायचं." },
    { id: "five-way-need-want-should", rule: "English need / want / should / must / have-to do NOT map one-to-one onto Marathi and the mapping must be fixed per frame, not chosen per phrase: हवं/हवी/हवा = volitional 'want' (and, with a bare infinitive, 'need to': S239 मला वाचायला हवं 'because I need to read'); -आयचं आहे = 'want to' on an infinitive; गरज आहे = felt necessity 'need to'; करावं लागेल = external obligation 'have to / will need to'; पाहिजे = deontic 'should / must'; नको = negative volitional \"don't want / shouldn't\". Their NEGATIONS also differ: गरज नाही, हवं नाही→नको, करावं लागणार नाही, पाहिजे→नये. Once a seed picks a carrier for an English modal, later seeds must not silently substitute another — that is the highest-value ZUT check in this pair." },
    { id: "vatane-polysemy", rule: "वाटणे (वाटतं 850, वाटत 150, वाटतंय 105, वाटते 9 — 1,114 tokens, rank 8) is highly polysemous experiencer machinery whose English gloss is fixed by the frame, and this corpus already renders it four ways: मला वाटतं की … = 'I think that …' (the dominant use), मला … वाटतं = \"I'd like\" (S11, bare lego), मला कसं वाटतंय = 'how do I feel' (S642), and …असं दिसतंय/वाटतं = 'it seems'. Fix the English per frame the way the Hindi brief fixes लगना, so the same Marathi shape is not glossed inconsistently across seeds. Note it is NOT in freeClass: it carries the clause's event." },
    { id: "negation-selection-by-frame", rule: "Marathi negation is selected by PREDICATE TYPE and TENSE, not by the English word: नाही = the all-purpose declarative/interrogative negator on present predicates and the copula ('not / don't / doesn't / isn't', 1,883); नाहीये = its colloquial present-progressive partner (\"I'm not …ing\", 95); नव्हतं / नव्हती / नव्हता / नव्हतो = the PAST negative copula and past auxiliary ('wasn't / didn't', 275 across the paradigm, agreeing for three genders); नको = negative volitional (\"don't want / shouldn't\", 77); नये = prohibitive/optative (\"wouldn't / shouldn't\", 10); नसतं = negative habitual (27). English didn't/haven't/wasn't converge onto the नव्हतं series or onto नाही plus a past participle; English \"don't want\" goes to नको, NOT to नाही + हवं. Negation is a construction feature here, not a standalone gloss word." },
    { id: "tari-vs-hi-indefinites", rule: "The -तरी / -ही split is the Marathi realisation of the positive-existential vs any/free-choice contrast, and both are written SOLID so there is no separate particle to see: काहीतरी 'something' vs काहीही 'anything/whatever'; कुठेतरी 'somewhere' vs कुठेही 'anywhere'; कोणालातरी 'someone' vs कोणीही 'anyone'. A positive declarative takes the -तरी form; the -ही form needs a licensor (see npiLicensing). Bare काही is the ambiguous middle — 'a few / some' in positive clauses, 'anything' only under a licensor. Never gloss a -तरी form as English 'anything/anyone/anywhere', and never let a -ही form stand in a plain positive assertion." },
    { id: "no-articles-ek-is-one", rule: "Marathi has NO articles. English 'a/an' surfaces as the numeral एक 'one' (414) when a numeral is actually wanted and as BARE noun otherwise; English 'the' has no Marathi exponent at all — definiteness is carried by word order, by the oblique/dative marking on specific objects, or by nothing. So 'a' and 'the' must be treated as FREE on the known side (supplied English-side) and must never be required as separate prompt words. Contrast Bengali, which does have a bound definite clitic -টা." },
    { id: "dative-subject-to-english-nominative", rule: "The whole experiencer family maps a Marathi DATIVE onto an English NOMINATIVE: मला हवं आहे → 'I want', तुम्हाला वाटतं का → 'do you think', त्याला गरज आहे → 'he needs', आम्हाला आवडेल → \"we'd like\", तुम्हाला काय लागेल → 'what do you need'. Hold the frame constant so 'I want/think/need/like/know/remember' consistently render with मला rather than मी. The reverse also holds: a nominative मी in one of these frames is a known-side defect, not a stylistic variant." },
    { id: "mahit-spelling-variance", rule: "माहित (491) and माहीत (24) are the SAME word ('known', in the दatives frame माहित आहे 'know' / माहित नाही \"don't know\"), differing only in ह्रस्व ि vs दीर्घ ी. Any exact-form matcher sees two distinct types and will report the rarer one as untaught. Treat them as one lemma. This is an ORTHOGRAPHIC defect in the corpus, not a linguistic contrast; I did not correct it (read-only job) and it is flagged here so the gate does not mistake it for a vocabulary leak." },
    { id: "ingrajit-is-the-course-frame", rule: "इंग्रजीत 'in English' (722, rank 11) and इंग्रजी (212) are not function words and not ordinary content either — they are this course's FRAME phrase, appended to a large share of prompts (…इंग्रजीत? = '…in English?'). They must be treated as taught content that debuts once, and their rank must not be read as evidence of a high-frequency Marathi function word." },
    { id: "no-tu-register", rule: "The intimate second person तू and its paradigm (तुला, तुझा) appear ZERO times in 64,593 tokens. Every English 'you/your' renders to the तुम्ही paradigm (or, from S501, the deferential आपण paradigm). If an intimate register is ever introduced it becomes a NEW construction licence, never a silent variant of तुम्ही." },
  ],
};
