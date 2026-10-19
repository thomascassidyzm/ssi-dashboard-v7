'use strict';
// tools/qa/quality-census/known-positives.cjs — defects we KNOW were real on ita_for_eng (or, where Italian has
// none on record, on a sibling course), each with where it came from. calibrate.cjs puts them back into a copy of a
// live snapshot and asks whether the check meant to catch them does (Kai's rule: calibrate against a known positive
// before trusting a check). Every entry is a past state of the course that a person fixed — never an invented one;
// the invented ones are the nonsense controls in calibrate.cjs, kept apart on purpose.

// Re-mark these LEGOs NEW: #639·I (2026-09-28, commit 314c0c55a) found six later LEGOs marked new whose pair an
// earlier new LEGO already taught on BOTH sides, and set them not-new. [later, earlier]
const DUPLICATES_639 = [['S0171L01', 'S0020L01'], ['S0202L02', 'S0043L02'], ['S0209L01', 'S0200L02'], ['S0478L01', 'S0142L01'], ['S0562L01', 'S0357L01'], ['S0620L01', 'S0496L01']];

// #865·I (2026-09-29, commit c1745d071): one English prompt over two Italian forms. Put both rows back as they were.
const ZUT_865 = [
  ['S0310L02U03', 'he said he could write a story about that man', "ha detto che potrebbe scrivere una storia su quell'uomo"],
  ['S0313L01U03', 'he said he could write a story about that man', "ha detto che poteva scrivere una storia su quell'uomo"],
];

// #883·I (2026-09-29, Kai approved, commit 1324ff649): capital-initial Italian rows on a lowercase-initial course
// ("Perché…/È…", 16 rows). The tool's own test records the text; added back as a USE row of seed 82 ("why not?").
const CAPITALS_883 = [['why not?', 'Perché no?']];

// Canon P30's own specimen (Tom 2026-09-30, job #906): ita_for_eng S0190L01 "do you mind if I ask you" was left
// with BUILD rows and no USE after #887·I moved its five USE rows forward. Replay: drop the LEGO's USE rows.
const NO_USE_887 = 'S0190L01';

// Subjunctive after "penso che": two rows the phrase-quality lane confirmed BAD on ita_for_jpn (job 967, commits
// cc9a5e8e1 / b00c03d96). Same Italian target rule; English glosses ours.
const SUBJUNCTIVE_967 = [['it is not like that now, I think', 'non penso che è così adesso'], ["I think it's my friend's", 'penso che è del mio amico']];

// Bracketed tag on a component (tile) gloss: cat_for_eng, fixed under Kai's K42 ruling (job #881, 2026-10-05,
// tools/course-optimization/cat-bracket-tags-2026-10-05.data.cjs — "component / phrase tags → brackets dropped").
const TAG_881 = ['you speak (subj.)', 'parlis'];

// The phrase-quality lane's hand-confirmed BAD rows on ita_for_eng seeds 1–100 (jobs #494, #772, #291, #921 and the
// 21–40 pass; Codex finder, Opus reviewer, verdict BAD). All have since been replaced or deleted. Before-text as the
// lane recorded it: [row id, seed, lego_index, role, known, target, the lane's problem class].
const LANE_BAD = [
  ["S0004L02U03", 4, 2, "use", "I'm trying to say something with you", "sto provando a dire qualcosa con te", "R8 tier 2"],
  ["S0004L02U05", 4, 2, "use", "I want to say something with you", "voglio dire qualcosa con te", "R8 tier 2"],
  ["S0006L02U04", 6, 2, "use", "I want to say a word in Italian with you", "voglio dire una parola in italiano con te", "R8 tier 2"],
  ["S0008L02U04", 8, 2, "use", "I want to explain something with you", "voglio spiegare qualcosa con te", "R8 tier 2"],
  ["S0012L03U06", 12, 3, "use", "I want to learn what's going to happen", "voglio imparare cosa succederà", "Meaning"],
  ["S0012L04U03", 12, 4, "use", "I'm going to try to learn something tomorrow", "sto per provare a imparare qualcosa domani", "Meaning"],
  ["S0015L03U03", 15, 3, "use", "I'd like to practise speaking with you today and tomorrow", "mi piacerebbe fare pratica parlando con te oggi e domani", "Containment"],
  ["S0015L03U04", 15, 3, "use", "I want someone else to speak Italian with me", "voglio che qualcun altro parli con me", "Meaning"],
  ["S0017L01U06", 17, 1, "use", "I'm trying to find out what I mean", "sto provando a scoprire quello che intendo", "R8 tier 2"],
  ["S0019L03B01", 19, 3, "build", "to stop", "smettere di", "R1 ZUT"],
  ["S0020L01U05", 20, 1, "use", "you want", "vuoi", "R8"],
  ["S0026L01U06", 26, 1, "use", "I like to learn a word today", "mi piace imparare una parola oggi", "R8 tier 2"],
  ["S0026L03B01", 26, 3, "build", "nearly now", "quasi adesso", "R8 tier 2"],
  ["S0038L03B02", 38, 3, "build", "I'm learning for about", "sto imparando da circa", "Grammar and meaning"],
  ["S0043L02B02", 43, 2, "build", "I want to answer", "voglio rispondere", "Containment"],
  ["S0043L02U01", 43, 2, "use", "I want to answer quickly", "voglio rispondere velocemente", "Containment"],
  ["S0043L02U02", 43, 2, "use", "I don't want to answer now", "non voglio rispondere adesso", "Containment"],
  ["S0043L02U03", 43, 2, "use", "I'm trying to answer carefully", "sto provando a rispondere attentamente", "Containment"],
  ["S0043L02U04", 43, 2, "use", "I like answering carefully", "mi piace rispondere attentamente", "Containment"],
  ["S0053L02U01", 53, 2, "use", "I want to put it", "voglio mettere questo", "R8 / grammar"],
  ["S0053L02U02", 53, 2, "use", "I need to put something", "ho bisogno di mettere qualcosa", "R8 / grammar"],
  ["S0053L02U03", 53, 2, "use", "I can put it now", "posso mettere questo adesso", "R8 / grammar"],
  ["S0053L02U04", 53, 2, "use", "she wanted to put something", "voleva mettere qualcosa", "R8 / grammar"],
  ["S0053L02U05", 53, 2, "use", "I like to put things", "mi piace mettere cose", "R8 / grammar"],
  ["S0053L02U06", 53, 2, "use", "I want to put other things", "voglio mettere altre cose", "R8 / grammar"],
  ["S0053L02U07", 53, 2, "use", "I need to put it today", "ho bisogno di mettere questo oggi", "R8 / grammar"],
  ["S0053L02U08", 53, 2, "use", "she wanted to put it with me", "voleva mettere questo con me", "R8 / grammar"],
  ["S0053L03U06", 53, 3, "use", "I want to put his letter", "voglio mettere la sua lettera", "R8 / grammar"],
  ["S0053L03U07", 53, 3, "use", "she wanted to put his letter", "voleva mettere la sua lettera", "R8 / grammar"],
  ["S0055L02B02", 55, 2, "build", "I haven't slept", "non ho dormito", "Containment"],
  ["S0055L02U05", 55, 2, "use", "I wanted to speak when I haven't slept", "volevo parlare quando non ho dormito", "R8"],
  ["S0056L02U08", 56, 2, "use", "I can know how to say something", "posso sapere come dire qualcosa", "R8 Tier 2"],
  ["S0058L02U03", 58, 2, "use", "I wanted to speak when you understand", "volevo parlare quando capisci", "R8 Tier 2"],
  ["S0058L02U08", 58, 2, "use", "I wanted to do it when you understand", "volevo fare questo quando capisci", "R8 Tier 2"],
  ["S0059L03U06", 59, 3, "use", "I like to do things next week", "mi piace fare cose la settimana prossima", "R8"],
  ["S0062L01U07", 62, 1, "use", "I can help you slowly", "posso aiutarti lentamente", "R8 tier 2"],
  ["S0062L02B04", 62, 2, "build", "do it at the same time", "fare allo stesso tempo", "Meaning"],
  ["S0063L02B03", 63, 2, "build", "I want helping me", "voglio aiutarmi", "R8 tier 3 and meaning"],
  ["S0063L02U08", 63, 2, "use", "I can help myself slowly", "posso aiutarmi lentamente", "R8 tier 2"],
  ["S0065L02U02", 65, 2, "use", "I like to take time to answer", "mi piace prendermi il tempo per rispondere", "Containment"],
  ["S0065L02U03", 65, 2, "use", "I want to take time to do this well", "voglio prendermi il tempo per fare questo bene", "Containment"],
  ["S0065L03U02", 65, 3, "use", "I like to test myself when I am learning Italian", "mi piace mettermi alla prova quando imparo italiano", "Containment"],
  ["S0065L03U03", 65, 3, "use", "I want to test myself now", "voglio mettermi alla prova adesso", "Containment"],
  ["S0066L02B02", 66, 2, "build", "find it", "trovare", "Meaning"],
  ["S0066L02U01", 66, 2, "use", "it's not difficult to find", "non è difficile trovare", "Grammar and R8"],
  ["S0067L01B01", 67, 1, "build", "to stop", "smettere", "R1 ZUT"],
  ["S0068L01B03", 68, 1, "build", "you're looking for it", "stai cercando", "Meaning"],
  ["S0069L03B03", 69, 3, "build", "the young dog", "cane giovane", "Grammar and meaning"],
  ["S0070L01U05", 70, 1, "use", "I'm trying to tell myself", "sto provando a dirmi", "R8"],
  ["S0070L01U06", 70, 1, "use", "I need to tell myself", "ho bisogno di dirmi", "R8"],
  ["S0071L02U01", 71, 2, "use", "I want to let you hear something important", "voglio far sentire qualcosa di importante", "Meaning"],
  ["S0071L02U02", 71, 2, "use", "it is useful to let you hear how to speak Italian", "è utile far sentire come parlare italiano", "Meaning"],
  ["S0071L02U06", 71, 2, "use", "I'd like to let you hear how to speak Italian", "mi piacerebbe far sentire come parlare italiano", "Meaning"],
  ["S0074L02U04", 74, 2, "use", "I think that for helping me to understand, it's very important", "penso che per avermi aiutato a capire, sia molto importante", "R8 and meaning"],
  ["S0074L02U08", 74, 2, "use", "for helping me to understand, I think that it's important", "per avermi aiutato a capire, penso che sia importante", "R8"],
  ["S0076L01U03", 76, 1, "use", "I think that I'm very happy with it", "penso di essere molto contento di quello", "Containment"],
  ["S0076L01U08", 76, 1, "use", "I think that I'm very happy with something", "penso di essere molto contento di qualcosa", "Containment"],
  ["S0077L01U03", 77, 1, "use", "I think that I'm surprised at it", "penso di essere sorpreso di quello", "Containment"],
  ["S0077L01U08", 77, 1, "use", "I think that I'm surprised at something very important", "penso di essere sorpreso di qualcosa di molto importante", "Containment"],
  ["S0077L03U02", 77, 3, "use", "I think that I'm starting to understand", "penso di cominciare a capire", "Containment"],
  ["S0077L03U06", 77, 3, "use", "I'm very happy that I'm starting to understand", "sono molto contento che stia cominciando a capire", "Containment"],
  ["S0077L03U08", 77, 3, "use", "I think that I'm starting to understand it", "penso di cominciare a capire quello", "Containment"],
  ["S0083L01U06", 83, 1, "use", "I'm going to agree with you now", "sono d'accordo con te adesso", "Meaning"],
  ["S0083L01U09", 83, 1, "use", "I'm not going to agree with you", "non sono d'accordo con te", "Meaning"],
  ["S0084L01U06", 84, 1, "use", "I'm going to think about what he said", "sto pensando a quello che ha detto", "Meaning"],
  ["S0087L01U04", 87, 1, "use", "they are people I don't know from before", "sono persone che non conosco di prima", "R8 and target naturalness"],
  ["S0089L02U06", 89, 2, "use", "in a short time I'll be better", "in poco tempo sarò meglio", "Grammar"],
  ["S0092L01U03", 92, 1, "use", "I'd like to keep on trying for a while", "mi piacerebbe continuare a provare per un po", "Italian spelling"],
  ["S0092L02B03", 92, 2, "build", "I'd like to keep on doing it for a while", "mi piacerebbe continuare a farlo per un po", "Italian spelling"],
  ["S0092L02U08", 92, 2, "use", "I'd like to do it for a while", "mi piacerebbe farlo per un po", "Italian spelling"],
  ["S0094L03U01", 94, 3, "use", "I think it will work now", "penso che funzioni adesso", "Meaning"],
  ["S0095L01U07", 95, 1, "use", "I'd like to go home for a while", "mi piacerebbe tornare a casa per un po", "Italian spelling"],
  ["S0095L02U03", 95, 2, "use", "I think the next bus is in time", "penso che il prossimo autobus sia in tempo", "R8"],
  ["S0096L01U07", 96, 1, "use", "can you keep on a little more time?", "puoi continuare un po' più di tempo?", "R8"],
  ["S0098L02B01", 98, 2, "build", "to consider", "considerare di", "R1 ZUT"],
  ["S0098L02B02", 98, 2, "build", "to consider", "considerare di", "R1 ZUT"],
  ["S0098L03B01", 98, 3, "build", "to play", "suonare", "R1 ZUT"],
];

// The lane's 'Containment' rows are the phrase-missing-its-own-LEGO cases (P17): the check P17 in checks.cjs is calibrated on these.
const CONTAINMENT_LANE = LANE_BAD.filter((r) => r[6] === 'Containment');

module.exports = { CONTAINMENT_LANE, DUPLICATES_639, ZUT_865, CAPITALS_883, NO_USE_887, SUBJUNCTIVE_967, TAG_881, LANE_BAD };
