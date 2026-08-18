// _known_kor — KNOWN-SIDE BRIEF for the Korean known-side agent. FIRST PASS (2026-08-18), ratified:null.
// KNOWN-LANGUAGE-level contract: the loader falls back to this for EVERY course whose known/prompt
// language is Korean. Today that is exactly one course, eng_for_kor (teaches English; prompts in Korean).
// Authored from the real eng_for_kor corpus. RULE (Tom): no regex/signature/stemmer EVER for a language
// judgment — this is the agent's reference knowledge, NOT a regex gate config. The known-side check is an
// agent that reads this brief + the introduced-vocab list + the prompt and judges. See
// docs/course-optimization/eng-for-x-known-side-pilot.md. Ships with the three pilot calibration fixes
// already applied (real npiLicensing with 10 environments; every high-frequency function word explicitly
// classified into freeClass or knownConstructions; nothing left unclassified without a named reason).
//
// CORPUS EXAMINED. 5,952 rows of eng_for_kor known_text — 546 course_legos (plus their `components`
// glosses) and 5,406 course_practice_phrases — yielding 24,289 whitespace-delimited Korean tokens
// (eojeol) of which 1,414 are distinct. Every classification below was taken off that frequency table,
// worked from rank 1 downwards; counts quoted in this file are corpus counts.
//
// TYPOLOGY. Korean (Hangul script, ISO 15924 'Hang') is an SOV, head-final, strictly suffixing
// AGGLUTINATIVE language. It is written with spaces, but the space does not delimit a word: it delimits
// an EOJEOL — a phonological word made of a content stem plus a stack of case particles (josa),
// delimiters, auxiliaries and a verbal ending. 저는 / 제가 / 저를 / 저에게 / 저와 / 저 are six distinct
// corpus tokens for one lemma 'I/me'; 말하고 / 말할 / 말하는 / 말하기 / 말한 / 말해요 / 말했어요 /
// 말하지 / 말하려고 / 말하는지 are ten for one verb. Hence segmentation:'space+agglut' — the gate may
// split on whitespace, but must NEVER assume an eojeol is a word, and must NEVER call an eojeol a
// violation merely because it does not exactly match an introduced gloss.
//
// THE THREE PERVASIVE KNOWN-SIDE ZUT PRESSURES IN THIS PAIR.
// (1) ONE KOREAN EOJEOL, MANY ENGLISH SHAPES — and the ambiguity is on the ENGLISH side, not the Korean.
//     Korean marks no articles, no obligatory plural, and no obligatory subject. 책을 is 'a book' / 'the
//     book' / 'books' / 'the books' with nothing in the prompt to choose between them; 사람들을 (38×) is
//     glossed 'people' at one seed and 'everyone' at another. This is a legal many-English-to-one-Korean
//     mapping, NOT a ZUT conflict — but it does mean the KNOWN side cannot be trusted to disambiguate the
//     English answer on its own, and the authoring must fix the English per seed and hold it.
// (2) THE OBLIGATORY 저는. Korean drops subjects freely; real Korean speech would say 말하고 싶어요.
//     This corpus force-inserts 저는 1,320 times (rank 1, 5.4% of ALL known-side tokens) purely so the
//     English answer 'I want to speak' is uniquely recoverable from the prompt. Likewise 당신 (10 bare,
//     plus 당신이 139 / 당신은 60 / 당신을 33 / 당신에게 53 / 당신과 72 / 당신의 28) is a
//     translationese 'you' that a Korean speaker would normally omit or replace with a name/title. Both
//     are ZUT scaffolding: they are machinery of THIS course, never content, and the agent must not
//     flag them as unintroduced vocabulary at any seed.
// (3) POLITENESS AND REGISTER ARE FIXED, AND THAT IS LOAD-BEARING. The corpus is 해요-form throughout:
//     ZERO 합니다/-습니다 formal-deferential tokens and effectively zero 반말 (나는 4×, 너를 1× against
//     저는 1,320× and 당신-forms 395× — those five are register leaks, not a second tier). Speech level
//     therefore never has to be chosen per phrase, and any 합니다- or 반말-form appearing in a prompt is a
//     defect rather than a variant. The one honorific that DOES appear is subject-honorific -시- inside
//     주셔서 (도움을 주셔서 감사해요, 45×) — licensed as a fixed politeness formula, not as a live
//     honorific paradigm.
//
// STEM-STRIP DECISION — THE LOAD-BEARING JUDGMENT, AND IT IS DELIBERATELY NARROW.
// The obvious move is to strip the textbook josa list 은/는/이/가/을/를/에/도/만. Measured against this
// corpus that move is WRONG, and wrong in the worst available way: it produces silent FALSE PASSES.
// Korean's high-frequency case particles are homographic with its high-frequency VERBAL endings, and the
// residue of a bad strip is a bound verb stem which this corpus DOES carry as a component gloss — so the
// mis-lemmatised token lands on a real introduced gloss and the gate reports green.
//   * 는 — 2,436 occurrences. Topic particle in 저는/그는/그녀는/우리는/남자는, but ALSO the present
//     adnominal ending in 말하는(112) 하는(52) 배우는(35) 있는(31) 찾는(23) 아는(23) 보는(23) 원하는(21)
//     읽는(11) … Stripping gives 말하/하/있/보 — bound stems, and 있 is a live gloss ('can'). REJECTED.
//   * 은 — 512 occurrences, and the ADNOMINAL reading is the MAJORITY of types: 좋은(99) 많은(77)
//     같은(35) 싶은(20) 짧은(18) 젊은(16) 똑같은(11) 괜찮은 받은 … against only 것은/당신은/그것은/
//     그들은/이것은/이름은/지금은/사람들은 as topic. 좋은 'good' → 좋 'like'. REJECTED.
//   * 을 — 1,279 occurrences. Object particle in 것을/무엇을/시간을, but also the PROSPECTIVE adnominal
//     in 있을(46) 없을(23) 했을(18) 않았을(15) 않을(13) 봤을(13) 있었을(12) 이야기했을(13). REJECTED.
//   * 이 — 808 occurrences. Subject particle in 것이/당신이/시간이, but 많이 'a lot'(94) → 많, and
//     나이 'age'(41) → 나 'I' — a different-lexeme collision straight onto a pronoun. REJECTED.
//   * 가 — 529. Subject particle, but also the indefinite formant in 무언가(11) 뭔가(7) 누가(10)
//     어디선가(12), and the stem of 가다 'go'. REJECTED (residues are non-words, so the cost is only lost
//     recall, but the recall it buys is near-zero: the safe cases are already glossed eojeol).
//   * 도 — 172. The 'also' particle is FOUR of twenty-three types (저도 당신도 그녀도 시간도, 5 occ
//     total). The rest are the concessive ending -어도 (않아도 물어봐도 해도 기다려도) or lexical
//     (아무도 35, 안타깝게도 34, 아무것도 28, 수도 9). REJECTED, decisively.
//   * 만 — 212. The 'only' particle is TWO types, 2 occurrences (일만, 분만). Everything else is the
//     concessive ending -지만 — including 하지만 'but' at 114 occurrences, which strips to 하지, a real
//     gloss. REJECTED, decisively.
//   * 의 — 152. Genitive, but 거의 'almost'(12) → 거 'thing' is a live different-lexeme collision, and
//     논의 'discussion' → 논. REJECTED.
//   * 와 — 47. Comitative in 저와/우리와/친구와, but also the -아/-어 converb of vowel-stem verbs:
//     도와 'help' → 도. REJECTED (과, its post-consonant twin, has no such twin hazard and is kept).
//   * 라고 — 118. Quotative, but strips 말해달라고 → 말해달 and 거라고 → 거 (a live gloss). REJECTED as
//     a bare suffix; the unambiguous copular-quotative 이라고 is kept.
//   * 께 — 64 occurrences and 63 of them are 함께 'together'. REJECTED.
//   * 들 — plural, but 아들 'son' → 아. REJECTED; and plural is not case, so nothing is owed here.
// What SURVIVES is the set that is unambiguously josa in this orthography — multi-syllable case
// particles, the object 를, the locative 에, the comitative 과, the instrumental 로/으로, and the
// compound josa that begin with a safe particle. Measured over the whole corpus this set recovers 76
// distinct token types / 398 occurrences to a correct noun lemma (남자를→남자, 어젯밤에→어젯밤,
// 친구들과→친구들, 친구에게서→친구, 일요일부터→일요일) with ZERO different-lexeme mis-lemmatisations.
// Two residual hazards are named rather than papered over: 안에 'inside' strips to 안, which is also the
// short-form negator glossed 'not'; and 별로/서로 strip under 로 to the non-words 별/서 (harmless — they
// match nothing and fall through to UNCHECKED). Compound josa are listed LONGEST FIRST precisely so that
// 에게는/에서는/으로는/에게도/에서도 are consumed whole and never reach the rejected 는/도.
// stemMinLen is 1: Korean has a large monosyllabic noun inventory that this corpus uses as lemmas —
// 것 말 일 답 책 물 잠 개 차 뇌 밤 집 달 주 전 후 때 저 그 — so a 1-syllable residue is normal and
// rejecting it would throw away most of the strip's value.
//
// TOKENS I COULD NOT CONFIDENTLY CLASSIFY (honest gaps, all corpus-attested).
//   * 데 (43) — bound noun in -는 데 'in doing / the matter of' (준비를 처리하는 데, 이해하는 데 도움을).
//     Homographic with the contrastive connective ending -는데, which this corpus spaces differently but
//     which a future author may not. I have listed it as free machinery but its two senses are not
//     separated here, and a spacing slip would make them indistinguishable.
//   * 것 / 거 / 게 (127 / in 거예요 308 + 거라고 34 / in 듣게·알게) — one nominalizer 것 with two
//     phonological reductions, plus a homograph: 게 is BOTH the reduction of 것이 AND the causative/
//     adverbial ending -게 (아무도 듣게 하지 마요). I have licensed 것/거 as nominalizer machinery and
//     -게 하다 as a separate causative construction, but I cannot guarantee the split holds for a bare 게.
//   * 한 (121) — glossed only inside 가능한 한 'as ... as possible'. It is simultaneously the numeral
//     'one', the adnominal of 하다 ('having done'), and the bound noun of the 가능한 한 idiom. The corpus
//     shows only the idiom, so I have licensed the idiom and left the numeral/adnominal readings open.
//   * 수도 (9) — 수 + 도 in -ㄹ 수도 있다 'might'. Genuinely a distinct epistemic modal from -ㄹ 수 있다
//     'can', but 9 occurrences at seeds 261+ is too thin to lock; licensed under the ability construction
//     with a note, not given its own entry.
//   * 별로 (41) — behaves as a negative-polarity degree adverb ('not very / not much': 별로 어렵지
//     않아요, 별로 인내심이 없었어요) but is glossed on the English side as 'very' inside a negated clause.
//     Listed as an NPI, but whether it should also sit in freeClass as a plain degree adverb is unsettled.
//   * 전혀 (26) — an NPI 'at all' that the corpus licenses at S0191 with a MORPHOLOGICALLY POSITIVE
//     predicate: 전혀 괜찮아요 = 'I don't mind at all'. The licensor there is the lexical semantics of
//     괜찮다, not any overt negator. I have named this in npiLicensing but it is the one environment I am
//     least sure generalises.
//   * 든 (41) — appears only inside 나이 든 'old' (a participle of 들다), never as the free-choice
//     particle -든 whose relatives 누구든/언제든지 DO appear. Left out of freeClass rather than guessed.
//   * 주 (27, in 주에/지난주에/일주일) — glossed 'week' in the phrase layer but 'early' on one component;
//     I could not tell whether that component gloss is a fragment defect or a second lexeme.
// AND, deliberately NOT in freeClass despite very high frequency — the same call the Bengali brief made
// for করা: the 하다 light-verb paradigm (해요 269, 하고 103, 할 166, 하는 52, 한다고, 했어요 59, 해야 44)
// carries the verbal EVENT of most compound predicates (연습해요, 이야기하고, 실수하는) and is therefore
// content, not a function word; likewise 말하-forms, 잘 'well' (145), and the temporal nouns
// 오늘/내일/어제/지금/오후/아침/밤, all of which are taught vocabulary with their own debut seeds.
module.exports = {
  course_code: '_known_kor',
  ratified: null,
  known_lang: 'kor',
  known_lang_name: "Korean",
  is_known_default: true,

  script: 'Hang',
  segmentation: 'space+agglut',
  morphology: 'agglutinative',

  // Longest first. See the header for the per-suffix evidence and for the nine suffixes REJECTED
  // (은/는/이/가/을/도/만/의/와/라고/께/들) because they are homographic with verbal endings and their
  // residues collide with live component glosses.
  stemStrip: [
    '에게서','에게는','에서는','으로는','에게도','에서도','이라고',
    '에게','한테','에서','으로','까지','부터','에는','과는',
    '를','과','에','로',
  ],
  stemMinLen: 1,

  // Free class — genuinely free-standing Korean function words, never "introduced", always permitted.
  // NOTE ON FORM: because 은/는/이/가/을/를 could not be put in stemStrip, the josa-inflected EOJEOL of
  // each function word are listed here explicitly. That is not redundancy — it is the only safe way to
  // free a Korean function word when its particle cannot be stripped. Bound clitics do not appear here
  // (they are in stemStrip or are rejected outright); bound verbal endings do not appear here (they are
  // knownConstructions).
  freeClass: [
    // 1sg pronoun (humble 저) — the ZUT scaffolding of pressure (2)
    "저","저는","제가","저를","저에게","저와","저의","제","저도","저한테","저보다",
    // 2sg pronoun (당신) — course-fixed, translationese, never content
    "당신","당신이","당신은","당신을","당신에게","당신과","당신의","당신도",
    // 3rd person and plural
    "그","그는","그가","그를","그에게","그의","그녀","그녀는","그녀가","그녀를","그녀에게","그녀의",
    "우리","우리는","우리가","우리를","우리의","우리와","우리에게","그들","그들은","그들이","그들과",
    "자신","자신을","자신에게","서로","서로에게",
    // demonstratives and the pro-form 것/거 (nominalizer + 'thing')
    "이","그것","그것이","그것은","그것을","그것에","이것","이것이","이것은","이것을","저것","저것이",
    "것","것이","것은","것을","것에","것과","것보다","거","여기","거기","저기","여기가","여기서",
    // question words
    "왜","어떻게","언제","어디","어디에","어디서","무엇","무엇을","무엇인지","무슨","뭘","뭐","뭔지",
    "누가","누구","누구를","얼마나","몇",
    // conjunctions / connectives (free-standing words, not endings)
    "하지만","그리고","그래서","그런데","왜냐하면","또는","또","그렇게","그럼",
    // degree, quantity and scalar adverbs
    "더","아주","너무","조금","좀","많이","가장","훨씬","전부","다","모든","모두","다른","같은","새로운",
    // temporal/aspectual and discourse adverbs that are pure machinery
    "다시","이미","아직","곧","막","이제","항상","자주","보통","물론","정말","확실히","분명히","아마","혹시",
    // relational bound nouns used post-nominally (the Korean answer to English prepositions)
    "대해","위해","함께","때","때문에","때문이에요","동안","전","후","데","중","동안에","만큼","사이",
    // existential / copular / negation carriers (free-standing predicate words)
    "있어요","있었어요","있고","있는","있을","없어요","없었어요","없을","아니에요","아니요","네",
    "안","못","수",
  ],

  // NPI items + WHEN they are licensed. Violation = an NPI in a plain POSITIVE DECLARATIVE only.
  npi: ["아무도","아무것도","아무나","아무","전혀","별로","아직","하나도","누구도","어디에도","밖에","절대","결코"],
  npiLicensing: {
    rule: "Korean negative-polarity items are STRICTER than the Hindi/Bengali equivalents and the agent must not carry over that intuition. 아무도 'anyone/nobody', 아무것도 'anything/nothing', 하나도 'not one', 전혀 'at all', 별로 'not much/not very', and the delimiter 밖에 'nothing but' are STRICT NPIs: they are ungrammatical in a plain positive declarative and there is no positive-existential twin of the same form. Korean expresses positive 'something/someone/somewhere' with a DIFFERENT lexeme — 무언가 / 뭔가 (56+7 occ, 'something'), 누군가 ('someone'), 어디선가 (12, 'somewhere') — so unlike Hindi कुछ~कुछ भी the licensed and unlicensed readings do not share a surface form. The consequence for this gate: an 아무-form or 전혀/별로 standing in an unnegated assertion is a VIOLATION regardless of the English gloss, and conversely a 무언가/뭔가/누군가 rendered into English 'anything' under a licensor is a GLOSS defect, not an NPI defect. Two Korean-specific mechanics the agent must judge rather than pattern-match: (a) the licensing negator usually sits on the OUTERMOST auxiliary, not next to the NPI — 아무것도 말하고 싶지 않아요 'I don't want to say anything' negates 싶다, and 우리는 아무도 듣게 하고 싶지 않았어요 negates the wanting, two auxiliaries away from the NPI; the NPI is licensed by scope, not adjacency. (b) 아직 is an NPI only in its 'yet' reading, which requires negation (아직 못해요 'I can't yet', 아직 몰라요 'I don't know yet', 아직 충분하지 않아요); its positive 'still' reading (아직도) is veridical and is NOT an NPI. The free-choice series is separate and does NOT need negation: 아무나 'anyone at all', 누구든 (저 여자는 누구든 도울 거예요 'that woman would help anyone'), 언제든지 (당신이 원할 때 언제든지 'as soon as you want'), 무엇이든 — these are licensed by wanting, ability, imperatives, conditionals and generics with no negator present, and must never be flagged.",
    licensedIn: [
      "Long-form clausal negation -지 않다 (않아요 304 / 않았어요 122 / 않을 / 않는 / 않지만) — e.g. 아무것도 말하고 싶지 않아요 'don't want to say anything', 별로 어렵지 않아요 'this isn't very difficult'",
      "Short-form negation with the preverbal adverb 안 (준비가 안 됐어요 'I'm not ready to') and potential negation with 못 (아직 못해요 'I can't yet', 잠을 잘 못 잤어요 'I didn't sleep well')",
      "Existential/possessive negation 없다 (없어요 98 / 없었어요 33 / 없을 23) — 별로 인내심이 없었어요 'he wasn't very patient', 수 없어요 'can't'; and copular/identificational negation 아니다 (아니에요 52)",
      "Prohibitive -지 마요 / -지 마세요 (아무도 듣게 하지 마요 'don't let anyone hear', 걱정하지 마세요 'don't worry')",
      "Yes/no (polar) questions — marked by rising intonation on the plain 해요-form with no word-order change and no do-support (그것에 대해 어떻게 생각해요?, 배운 지 얼마나 됐어요?), and permission questions in -아/어도 돼요 (물어봐도 돼요 'can I ask')",
      "Conditional / hypothetical -(으)면 (있으면 83, 할 수 있으면 'if she could', 수 있으면 좋겠어요) and concessive -아/어도 (걱정하지 않아도 돼요)",
      "Desiderative -고 싶다 and its complements (싶어요 664 / 싶지 154 / 싶었어요 121 / 싶어해요 85) — wanting is non-veridical, so an any-item inside a want-complement is licensed whether or not the wanting itself is negated",
      "Ability / potential -(으)ㄹ 수 있다 ~ 없다 and -(으)ㄹ 수도 있다 'might' (수 392, 기억할 수 없어요 'I can't remember', 중요할 수도 있다고 'it might be important')",
      "Embedded polar / indirect questions in -는지 / -(으)ㄹ지 (기억할 수 있을지 'if I can', 있는지 27, 원하는지 10, 일어날지 17, 배웠는지 16) and complements of doubt (모르겠어요 99, 몰라요 32, 확실하지 12)",
      "Comparatives and superlatives with -보다 'than' (것보다 32, 어제보다, 어젯밤보다, 때보다) and 가장 'most'; also 'before/until' temporal frames -기 전에 / -(으)ㄹ 때까지 (때까지), where the event is not asserted as actual",
      "Free-choice -든지 / -든 / 아무나 (누구든, 언제든지, 아무나 듣게 하다) — inherently any-type; licensed by want, ability, imperative, conditional or generic with NO negator required",
      "Inherently negative-meaning predicates with positive morphology — the corpus's 전혀 괜찮아요 = 'I don't mind at all' (S0191) licenses 전혀 through the lexical semantics of 괜찮다, not an overt negator. Flagged in the header as the least certain environment: judge the meaning, and do not generalise this to any positive predicate.",
    ],
  },

  // Negation markers (reference list; negation detection is the agent's judgment).
  negation: ["않아요","않았어요","않지","않는","않을","안","못","없어요","없었어요","없을","아니에요","아니라고","마요","마세요","모르겠어요","몰라요"],

  // Korean machinery the agent licenses at a carrier's debut (id / marker / description).
  knownConstructions: [
    { id: "topic-vs-subject-particle", marker: "은/는 (저는, 그것은) vs 이/가 (것이, 제가, 준비가)", description: "Korean marks the topic with 은/는 and the grammatical subject with 이/가, and the choice is information-structural, not translatable: 저는 is 'I' as topic (1,320×) while 제가 is 'I' as focused subject (89×), and both render English 'I'. Neither particle may be stripped (see header), so both eojeol are listed in freeClass. Licensed at the first 저는 — i.e. seed 1 — and never content." },
    { id: "object-and-oblique-particles", marker: "을/를, 에, 에서, 에게/한테, 으로/로, 과/와, 의, 보다, 까지, 부터", description: "Case is suffixed to the noun, not signalled by word order or a preposition: 을/를 accusative (것을 342), 에 locative/temporal (오후에, 주말에), 에서 'at/from' (사무실에서), 에게/한테 dative (저에게 59, 당신에게 53), 으로/로 instrumental (영어로 163, 버스로), 과/와 comitative (당신과 72), 의 genitive (그의, 우리의), 보다 'than' (것보다), 까지 'until', 부터 'from'. English prepositions map to a FOLLOWING particle, mirror-imaged. Licensed at each particle's first carrier; the safe members of this set are the whole of stemStrip." },
    { id: "sentence-final-politeness-haeyo", marker: "-아/어요 (해요, 있어요, 좋아요, 말해요)", description: "Every finite clause in this course ends in the 해요 polite-informal ending. Speech level is FIXED estate-wide for kor: no 합니다/-습니다 deferential forms and no 반말 appear (the 4× 나는 and 1× 너를 are leaks, not a tier). The ending carries no English word — English politeness is not marked — so -아/어요 is machinery licensed at seed 1 and must never be read as vocabulary." },
    { id: "desiderative-go-sipda", marker: "-고 싶다 (싶어요 664, 싶지 154, 싶었어요 121, 싶어해요 85, 싶은, 싶다고)", description: "'want to' is the auxiliary 싶다 bound to a -고 converb: 말하고 싶어요 'I want to speak'. It is an AUXILIARY, not a verb the learner is taught — the lexical content sits in the -고 stem (말하고, 배우고, 만나고). Third-person wanting takes the derived 싶어하다 (싶어해요 'he/she wants to'), which is the same lemma, not a second item. Licensed at its S0001 debut; all of 싶어요/싶지/싶었어요/싶어해요/싶은/싶다고 are one construction." },
    { id: "ability-l-su-issda", marker: "-(으)ㄹ 수 있다 / 없다 (수 392, 할 수 있어요, 기억할 수 없어요, 수도 있다고)", description: "Ability and possibility are the bound noun 수 plus 있다/없다 on a prospective adnominal stem: 할 수 있어요 'be able to', 수 없어요 'can't', 기억할 수 있을지 'if I can'. English can/could/be-able-to all converge here. The variant -(으)ㄹ 수도 있다 'might' (수도 9, 중요할 수도 있다고) is epistemic rather than ability — licensed under this construction with the header's caveat that 9 occurrences is too thin to split it out." },
    { id: "prospective-geoyeyo", marker: "-(으)ㄹ 거예요 / 거라고 (거예요 308, 거라고 34)", description: "Future and presumptive: the prospective adnominal plus the bound noun 거 plus the copula — 물어볼 거예요 'he's going to ask', 답을 줄 거예요 'would give you an answer', 곧 끝날 거라고 'that you'll finish soon'. It renders English will / going to / would in one shape. Also -(으)ㄹ게요 (물어볼게요 28, 'I'll ask him') is the first-person PROMISSIVE variant — same future machinery, different commitment; both licensed as machinery, never content." },
    { id: "negation-long-form", marker: "-지 않다 (않아요 304, 않았어요 122, 않을, 않는, 않지만)", description: "The productive negator: a -지 converb plus 않다, negating the whole predicate (좋아하지 않아요 'doesn't like', 아무것도 기억하지 않아요). It attaches to the OUTERMOST auxiliary, which is why an NPI can sit several words away from its licensor (말하고 싶지 않아요). English don't/doesn't/didn't/isn't all converge onto this one shape — do not gloss a standalone 'don't' word." },
    { id: "negation-short-an-mot", marker: "안 (24), 못 (15)", description: "Two preverbal negative adverbs: 안 is plain negation (준비가 안 됐어요 'I'm not ready to') and 못 is POTENTIAL negation, 'can't / didn't manage to' (아직 못해요, 잠을 잘 못 잤어요 'I didn't sleep well'). The 안/못 split is not present in English and must be chosen by meaning, not by the English word. HAZARD: 안 is homographic with the noun 안 'inside' (안에 17× 'in time/inside') — the header names this as the one surviving stemStrip collision." },
    { id: "negation-existential-copular", marker: "없다 (없어요 98) ; 아니다 (아니에요 52)", description: "Korean negates existence/possession with the dedicated verb 없다 rather than by negating 있다 (시간이 없어요 'I don't have time', 수 없어요 'can't'), and negates identity with 아니다 (아니에요 'it isn't'). Neither is formed from 않다. English 'there isn't / don't have / isn't a' select between these two by predicate type, exactly as Bengali selects নেই vs নয়." },
    { id: "prohibitive-ji-mayo", marker: "-지 마요 / -지 마세요", description: "Negative imperative: the -지 converb plus the suppletive 말다 (걱정하지 마세요 'don't worry', 아무도 듣게 하지 마요 'don't let anyone hear'). 않다 CANNOT negate an imperative. Licensed at its debut; it is also an NPI-licensing environment." },
    { id: "existential-and-progressive-issda", marker: "있다 (있어요 427, 있는, 있을, 있었어요) ; -고 있다", description: "있다 does triple duty: existential 'there is' (너무 많은 아이디어가 있어요), possessive 'have', and — bound to a -고 converb — the PROGRESSIVE (노력하고 있어요 'I'm trying to', 더 못하고 있는 것 같아요 'I feel as if I'm doing worse'). One Korean carrier renders English there-is / have / am-…-ing; the aspectual reading is licensed at the first -고 있다." },
    { id: "past-tense-eoss", marker: "-았/었- (했어요 59, 말했어요 43, 만났어요 32, 있었어요, 봤어요 48, 시작했어요 58)", description: "Past is the infix -았/었- fused into the stem before the ending; there is no separate past-tense word. One fused form covers English simple past, present perfect and past progressive (배웠는지 'whether you learned', 보냈어요 'I sent'). Tense lives inside the eojeol, which is exactly why exact-form matching fails on it and why the gate must fall back rather than flag." },
    { id: "adnominal-endings", marker: "-는 / -(으)ㄴ / -(으)ㄹ (말하는, 좋은, 말할, 배운)", description: "Korean has no relative pronoun: a clause modifies a following noun by taking an adnominal ending — present -는 (말하는 사람들 'people who speak'), past -(으)ㄴ (배운 지, 끝난), prospective -(으)ㄹ (말할, 갈, 도울, 기억할). These endings are the reason 는/은/을 CANNOT be stripped as particles. Licensed as machinery at the first adnominal; the English side supplies who/that/-ing/to-." },
    { id: "nominalizers-geot-gi", marker: "-는 것 (것 127, 것을 342, 것이 167) ; -기 (말하기 59, 배우기 43, 가기)", description: "Two nominalizers turn a clause into an argument: -는 것 (실수하는 것 'to make mistakes', 사람들을 만나는 것을 'to meet people') and -기 (배우기 위해 'in order to learn', 말하기를 'to speak'). English infinitives AND gerunds both land here, so the Korean prompt does not choose between 'to speak' and 'speaking' — the English rendering must be fixed per seed. Machinery, licensed at debut." },
    { id: "purposive-and-causal", marker: "-(으)려고 (기억하려고, 배우려고, 도우려고) ; -기 위해 (위해 27) ; 때문에/때문이에요 (31) ; 왜냐하면 (34) ; -아/어서 (주셔서)", description: "Purpose is -(으)려고 or -기 위해 'in order to'; cause is -기 때문에 / 때문이에요 'because', frequently paired with the clause-initial 왜냐하면 (왜냐하면 … 때문이에요, a bracketing pair with no English counterpart — English says 'because' once). -아/어서 is the sequential/causal converb (도움을 주셔서 감사해요 'thank you for helping'). All are free machinery." },
    { id: "embedded-question-neunji", marker: "-는지 / -(으)ㄹ지 (있는지 27, 하는지 19, 원하는지, 일어날지 17, 있을지 38, 무엇인지 20)", description: "Indirect/embedded questions take -는지 or -(으)ㄹ지 on the embedded verb, with the wh-word left IN SITU: 제 말이 무슨 뜻인지 'what I mean', 누구를 말하는지 'who you mean', 기억할 수 있을지 'if I can'. English fronts the wh-word and adds whether/if. Licensed at debut; also an NPI-licensing environment." },
    { id: "obligation-haeya-hada", marker: "-아/어야 하다 / 되다 (해야 44, 고려해야, 일해야, 바꿔야) ; -아/어도 되다 (돼요 44, 물어봐도 돼요)", description: "Obligation is the -아/어야 converb plus 하다/되다 (고려해야 해요 'I should consider', 바꿔야 해요 'we need to change', 해야 할 'have to do'); permission is -아/어도 되다 (물어봐도 돼요 'can I ask'); exemption is 않아도 돼요 ('you shouldn't worry about'). English should/need-to/have-to/must all converge on -아/어야 하다 — closed-class modal machinery, not vocabulary." },
    { id: "quotative-dago-irago", marker: "-다고 / -라고 / -이라고 (싶다고, 좋다고, 있다고, 한다고, 생각이라고 24, 거라고 34, 말해달라고)", description: "Reported speech and thought embed with a quotative ending — -다고 on verbs/adjectives (좋다고 생각해요 'I think it's good'), -(이)라고 on nouns (생각이라고, 일이라고). 말해달라고 combines it with the benefactive request 달다. English 'that …' clauses map here. The bare -라고 is NOT strippable (it mangles 말해달라고 → 말해달 and 거라고 → 거); only the copular -이라고 is." },
    { id: "benefactive-eo-juda", marker: "-아/어 주다 (도와줄 34, 말해줄 34, 도와주는, 말해주기를, 주셔서 45, 줄 수 있어요)", description: "An action done FOR someone takes the auxiliary 주다 on an -아/어 converb: 말해줄 'tell me', 도와줄 'help you', 줄 수 있어요 'could you'. English marks this with an indirect object or nothing at all, so the auxiliary carries no English word. The honorific 주셔서 (subject-honorific -시- in the fixed formula 도움을 주셔서 감사해요) is the ONLY live honorific in the corpus and is licensed as part of this construction." },
    { id: "causative-ge-hada", marker: "-게 하다 (듣게 해요, 알게 하고, 알아내게)", description: "Periphrastic causative/permissive: an -게 adverbial plus 하다 — 아무도 듣게 하지 마요 'don't let anyone hear', 그녀는 아무도 알게 하고 싶지 않았어요 'she didn't want to let anyone know'. English let/make/have + object + verb maps here. Flagged in the header as the reason a bare 게 cannot be safely classified (it is also the reduction of 것이)." },
    { id: "conditional-myeon", marker: "-(으)면 (있으면 83, 할 수 있으면) ; -아/어도", description: "The conditional is the bound ending -(으)면 'if/when'; there is NO free 'if' word in this corpus (만약 does not appear once). 걱정하지 않아도 shows the concessive -아/어도 'even if'. Both are non-veridical and license NPIs. Licensed at the first -(으)면; the English 'if' is supplied English-side with no Korean carrier of its own." },
    { id: "comparative-deo-boda", marker: "더 (305) ; -보다 (것보다 32) ; 가장", description: "Comparison is the free adverb 더 'more' plus, optionally, a 보다-marked standard (어제보다 더 잘 'better than yesterday'); the superlative is 가장. Korean adjectives do not inflect for degree, so English -er/-est and more/most all come from 더/가장 — pure machinery, licensed at 더's S0023 debut. Note 보다 is homographic with the verb 보다 'see' (봤어요, 보는, 볼), so the comparative reading is a judgment, not a form." },
    { id: "zut-scaffold-pronouns", marker: "저는 (1320), 당신-forms (395)", description: "See header pressure (2). Korean drops subjects; this course inserts 저는 and 당신 solely so the English answer is uniquely recoverable. They are the course's ZUT scaffolding — machinery licensed at seed 1, never content, and never a naturalness defect to be 'fixed' by deletion, because deleting them would break the one-known-one-target rail." },
  ],

  // Known-side ZUT/rendering rules.
  glossRules: [
    { id: "no-articles-no-obligatory-plural", rule: "Korean has NO articles and no obligatory plural: 책을 is 'a book'/'the book'/'books' with nothing in the prompt to choose, and the plural -들 is optional and mostly animate (사람들 'people/everyone'). English a/the/-s therefore have NO Korean carrier — they are supplied English-side and must be treated as free on the known side, never demanded as separate prompt words. The corollary binds the author: the English rendering of a bare Korean noun must be FIXED per seed and held, because the prompt cannot disambiguate it." },
    { id: "he-she-are-distinct-here", rule: "Unlike Hindi वह and Bengali সে, Korean DOES distinguish third-person gender in this corpus: 그/그는/그가 = he (139+57) and 그녀/그녀는/그녀가 = she (110+66). Do not import the gender-neutral-3sg allowance from the Indic briefs. But note the opposite hazard: 그 alone is ALSO the adnominal demonstrative 'that/the' (그 사람들 'those people', 그 질문에 'the question'), so a bare 그 is ambiguous between 'he' and 'that' and its English must be fixed by seed context." },
    { id: "jeo-is-both-i-and-that", rule: "저 is a homograph of exactly the kind that breaks naive matching: humble first person 'I/me' (저 = 'me' at S0015) AND the distal demonstrative 'that (over there)'. Corpus S0227 has both in one prompt — 저 남자는 저에게 뭔가를 말할 거예요 'that man is going to tell me something'. The particle disambiguates (저에게 = me; bare 저 + noun = that), but the agent must judge, not match. Same shape of hazard: 이 = 'this' AND the subject particle AND the copula stem; 제 = 'my' AND the prefix of 제때 'on time'." },
    { id: "dangsin-is-course-fixed-you", rule: "All second person is 당신, with the 해요 politeness level. 당신 is not natural conversational Korean — a real speaker would drop the pronoun or use a name/title — but it is this course's FIXED carrier for English 'you', chosen so that 'you' is recoverable from the prompt. Never render 'you' as 너/네/자네/그쪽 (너를 appears once, a leak). The formality tier is fixed and needs no per-phrase decision; if an honorific tier is ever added it becomes a new construction license, not a silent variant." },
    { id: "one-eojeol-many-english-tenses", rule: "Tense, aspect, mood, politeness and clause-linkage are all fused INSIDE the eojeol, so one Korean form can legitimately render several English shapes and one English verb fans out into ten Korean eojeol. 배우고 있어요 covers 'I'm learning' and 'I've been learning'; 시작했어요 covers 'I started' and 'I've started'. These are many-to-one/one-to-many mappings, NOT ZUT conflicts. The gate must resolve 말하고/말할/말하는/말하기/말한/말해요/말했어요/말하지/말하려고/말하는지 to the single introduced lemma 'speak' and must never call an inflected form new vocabulary." },
    { id: "verbal-endings-are-not-particles", rule: "This is the rule that protects the gate from itself: 는, 은, 을, 도, 만, 이, 라고 are HOMOGRAPHIC between case particles and verbal endings, and in this corpus the verbal reading is the more common one for 은/도/만. 좋은 is 'good' (adnominal), not 좋 + topic; 하지만 is 'but', not 하지 + only; 아무것도 is 'anything', not 아무것 + also; 많이 is 'a lot', not 많 + subject. A token that fails exact match must be resolved by the agent's reading of the whole eojeol, never by peeling a final syllable — see the header for why stemStrip excludes all seven." },
    { id: "positive-something-vs-npi-anything", rule: "Korean splits what Hindi and Bengali merge: positive 'something/someone/somewhere' is 무언가 / 뭔가 / 누군가 / 어디선가, while 'anything/anyone' under a licensor is 아무것도 / 아무도 (negative-licensed) or 무엇이든 / 누구든 / 아무나 (free choice). There is no single form doing both jobs. So an English 'something' rendered as 아무것도 is wrong even under negation, and an English 'anything' rendered as 무언가 in a negated clause is wrong. Choose by polarity AND by free-choice vs existential, and hold it." },
    { id: "component-fragments-carry-adjacent-english", rule: "The single largest known-side gloss hazard in eng_for_kor is the same one the Hindi pilot found: a `components` fragment carrying English that belongs to the neighbouring fragment or to the whole chunk. Live corpus examples — component 개 glossed 'a few words' (개 is the counter in 몇 개, and 'a few words' belongs to 몇 개의 단어), component 안 glossed \"i'm not\" (안 is the negator in 준비가 안 됐어요), component 주 glossed 'early', component 이 glossed 'what the is'. Such a fragment is UNANSWERABLE in isolation and should be reported as a gloss_rule_violation, not as unintroduced vocabulary. Because Korean packs several morphemes per eojeol, component splitting is more error-prone here than in any Latin-script pair." },
    { id: "spacing-is-not-word-boundary", rule: "Korean orthographic spacing (띄어쓰기) is a real norm but it separates eojeol, not words, and it is applied inconsistently even by native writers around bound nouns: 할 수 있어요 (spaced) vs 수도 (unspaced), -는 데 'in doing' (spaced) vs -는데 'but' (unspaced), 것 (spaced) vs 거예요 (fused). Two prompts differing only in a space are the SAME string for ZUT purposes and must not be treated as two targets; conversely a spacing change can flip -는 데 into -는데 and change the meaning. Judge the reading, not the whitespace." },
    { id: "hada-forms-are-content-not-machinery", rule: "The 하다 light verb (해요 269, 하고 103, 할 166, 했어요 59, 해야 44, 하는 52) is deliberately NOT in freeClass — the same call the Bengali brief made for করা. In 연습해요 / 이야기하고 / 실수하는 / 걱정하지, 하다 carries the verbal event of a compound predicate whose nominal is the taught vocabulary, so freeing 하다 wholesale would free the predicate. Free only the specific 하다-bearing CONSTRUCTIONS named above (-아/어야 하다 obligation, -게 하다 causative), and treat every other 하다 form as content tracing to its nominal's introduced lemma." },
    { id: "eojeol-of-a-free-word-is-still-free", rule: "Because 은/는/이/가/을/를 cannot be stripped, a function word's particle-bearing forms are listed in freeClass one by one (저/저는/제가/저를/저에게/저와/저의/제 …). If the agent meets a freeClass lemma carrying a particle NOT enumerated there — say 그것으로, 우리에게서 — it must resolve it to the listed lemma and treat it as free, not report it as new vocabulary. The enumeration is a safety net for the un-strippable particles, not an exhaustive paradigm." },
  ],
};
