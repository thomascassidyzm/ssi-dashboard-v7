'use strict';
// tools/course-optimization/ita-k40-k41-plan-2026-09-30.cjs
//
// THE PLAN for job #937·I on ita_for_eng — two of Kai's 30 Sept rulings applied in ONE pass so each seed is
// edited and re-voiced once. Pure data + one pure builder; the apply tool (ita-k40-k41-apply-2026-09-30.cjs)
// reads the live "before" of every row named here, guards it, writes it, and fills audio.
//
//   K40 (job #932·I, canon K40): a subjunctive never stands in a LEGO or BUILD without its trigger inside.
//        Seed 72 is the model: the subjunctive LEGO grows to take its trigger ("I think that he wants |
//        penso che voglia"); every BUILD that isolated the form is re-anchored on the trigger or deleted;
//        every phrase under the grown LEGO still contains it (P17). Components re-tile with their LEGO: the
//        tile that began with bare "that | che" takes the trigger (72's own tiling). Component-only findings
//        are NOT touched (Kai: skip them).
//   #931·I (K39 extended): 129 / 114 / 655 performance "doing well" = stia/stessi PARLANDO, as seed 72;
//        139 U03/U07 then lose the untaught "stia andando via".
//   K41 (job #936·I, canon K41): an Italian infinitive's known gloss carries "to" — LEGO, its tiles, BUILDs.
//
// Everything Kai held (ZUT clashes, exact duplicates, over-cap and unclear K40 seeds, gerunds, tiles under
// correct LEGOs) is listed in HELD with the reason, and is not written.

const COURSE = 'ita_for_eng';
const JOB = '#937·I';

// ── K40 + #931 LEGO re-cuts (hand-authored) ──────────────────────────────────────────────────────────
// comps: the LEGO's components JSON after the pass. crow: component ROWS (player tiles) → new text.
const K40_LEGOS = {
  S0070L03: { known: 'to tell me where it was', target: 'dirmi dove fosse', comps: [['to tell me', 'dirmi'], ['where it was', 'dove fosse']],
    intro: "The Italian for: 'to tell me where it was', as in — 'she didn't want to tell me where it was', is:" },
  S0171L02: { known: 'you want me to help you', target: 'vuoi che ti aiuti', comps: [['you want', 'vuoi'], ['me to help you', 'che ti aiuti']],
    intro: "The Italian for: 'you want me to help you', as in — 'do you want me to help you look for it?', is:" },
  S0303L01: { known: 'I think that he wants', target: 'penso che voglia', comps: [['I think that', 'penso che'], ['he wants', 'voglia']],
    crow: { S0303L01C01: ['I think that', 'penso che'], S0303L01C02: ['he wants', 'voglia'] },
    intro: "The Italian for: 'I think that he wants', as in — 'I think that he wants to sit down', is:" },
  S0304L01: { known: "I think that she doesn't want", target: 'penso che non voglia', comps: [['I think that', 'penso che'], ["doesn't", 'non'], ['want', 'voglia']],
    crow: { S0304L01C01: ['I think that', 'penso che'] },
    intro: "The Italian for: 'I think that she doesn't want', as in — 'I think that she doesn't want to work from home', is:" },
  S0315L02: { known: "I think that he couldn't", target: 'penso che non potesse', comps: [['I think that', 'penso che'], ['not', 'non'], ['could', 'potesse']],
    crow: { S0315L02C01: ['I think that', 'penso che'] },
    intro: "The Italian for: 'I think that he couldn't', as in — 'I think that he couldn't afford the car that he wanted', is:" },
  S0325L01: { known: 'I think that he needs to', target: 'penso che debba', comps: [['I think that', 'penso che'], ['he needs to', 'debba']],
    intro: "The Italian for: 'I think that he needs to', as in — 'I think that he needs to consider ten possible problems', is:" },
  S0326L01: { known: "I don't think that she needs to", target: 'non penso che lei debba', comps: [["I don't think that", 'non penso che'], ['she', 'lei'], ['needs to', 'debba']],
    crow: { S0326L01C01: ["I don't think that", 'non penso che'] },
    intro: "The Italian for: 'I don't think that she needs to', as in — 'I don't think that she needs to sell the company', is:" },
  S0335L01: { known: 'I think that he can', target: 'penso che possa', comps: [['I think that', 'penso che'], ['he can', 'possa']],
    intro: "The Italian for: 'I think that he can', as in — 'I think that he can add some valuable ideas', is:" },
  S0336L01: { known: "I don't think that she can", target: 'non penso che lei possa', comps: [["I don't think that", 'non penso che'], ['she', 'lei'], ['can', 'possa']],
    crow: { S0336L01C01: ["I don't think that", 'non penso che'] },
    intro: "The Italian for: 'I don't think that she can', as in — 'I don't think that she can open the door', is:" },
  S0346L01: { known: 'I wanted her to know', target: 'volevo che lei sapesse', comps: [['I wanted', 'volevo'], ['that she', 'che lei'], ['knew', 'sapesse']],
    intro: "The Italian for: 'I wanted her to know', as in — 'I wanted her to know that I liked her book', is:" },
  S0432L02: { known: 'they want you to ask', target: 'vogliono che tu chieda', comps: [['they want', 'vogliono'], ['you to ask', 'che tu chieda']],
    intro: "The Italian for: 'they want you to ask', as in — 'they could mean that they want you to ask', is:" },
  S0636L02: { known: 'I think that that is', target: 'penso che quella sia', comps: [['I think that', 'penso che'], ['that is', 'quella sia']],
    intro: "The Italian for: 'I think that that is', as in — 'I think that that is Jane's bag', is:" },
  S0655L01: { known: "I think that you're speaking", target: 'penso che stia parlando', comps: [['I think that', 'penso che'], ["you're speaking", 'stia parlando']],
    intro: "The Italian for: 'I think that you're speaking', as in — 'I think that you're speaking very well, madam', is:" },
  S0129L01: { known: "happy that you're speaking so well", target: 'felice che tu stia parlando così bene', comps: [["happy that you're speaking", 'felice che tu stia parlando'], ['so well', 'così bene']],
    crow: { S0129L01C01: ["happy that you're speaking", 'felice che tu stia parlando'] },
    intro: "The Italian for: 'happy that you're speaking so well', is:" },
  S0114L01: { known: 'as if I were speaking', target: 'come se stessi parlando', comps: [['as if', 'come se'], ['I were speaking', 'stessi parlando']],
    intro: "The Italian for: 'as if I were speaking', is:" },
};

// seed sentence edits (#931·I: 655 / 129 / 114 performance idiom → parlando)
const SEEDS = {
  655: { known: "I think that you're speaking very well, madam", target: 'penso che stia parlando molto bene, signora' },
  129: { known: "I'm so happy that you're speaking so well", target: 'sono così felice che tu stia parlando così bene' },
  114: { known: "I feel as if I'm speaking worse today than yesterday", target: 'mi sento come se stessi parlando peggio oggi di ieri' },
};

// phrase edits: id → [known, target]; DELETE: id → why
const K40_PHRASES = {
  // 70 — L03 grown to carry dirmi (Kai); every row under it now holds "dirmi dove fosse"
  S0070L03B01: ['to tell me where it was', 'dirmi dove fosse'],
  S0070L03B02: ["it's important to tell me where it was", 'è importante dirmi dove fosse'],
  S0070L03B03: ["he didn't want to tell me where it was", 'non voleva dirmi dove fosse'],
  S0070L03U01: ['do you want to tell me where it was?', 'vuoi dirmi dove fosse?'],
  S0070L03U02: ["you didn't want to tell me where it was", 'non volevi dirmi dove fosse'],
  // 171
  S0171L02B02: ["you don't want me to help you", 'non vuoi che ti aiuti'],
  // 203 — the one BUILD that isolated "ti chiedessi" takes its "se"
  S0203L03B03: ['if I asked you to help me today', 'se ti chiedessi di aiutarmi oggi'],
  // 303
  S0303L01B03: ['I think that he wants to speak', 'penso che voglia parlare'],
  S0303L01B04: ['I think that he wants to help', 'penso che voglia aiutare'],
  S0303L02B01: ["I don't think that he wants to sit down", 'non penso che voglia sedersi'],
  // 304
  S0304L01B03: ["I think that she doesn't want to speak", 'penso che non voglia parlare'],
  S0304L01B04: ["I think that she doesn't want to come", 'penso che non voglia venire'],
  S0304L02B02: ["I think that she doesn't want to work", 'penso che non voglia lavorare'],
  // 315
  S0315L02B03: ["I think that he couldn't come", 'penso che non potesse venire'],
  S0315L02B04: ["I think that he couldn't wait", 'penso che non potesse aspettare'],
  S0315L03B01: ["I think that he couldn't afford", 'penso che non potesse permettersi'],
  S0315L03B02: ["I think that he couldn't afford the car", 'penso che non potesse permettersi la macchina'],
  S0315L03B03: ["I think that he couldn't afford anything", 'penso che non potesse permettersi niente'],
  // 325
  S0325L01B02: ['I think that he needs to work', 'penso che debba lavorare'],
  S0325L01B03: ['I think that he needs to learn', 'penso che debba imparare'],
  S0325L04B01: ['I think that he needs to consider', 'penso che debba considerare'],
  // 326
  S0326L01B03: ["I don't think that she needs to come", 'non penso che lei debba venire'],
  S0326L01B04: ["I don't think that she needs to wait", 'non penso che lei debba aspettare'],
  S0326L01U04: ["I don't think that she needs to come now", 'non penso che lei debba venire adesso'],
  S0326L02B02: ["I don't think that she needs to sell", 'non penso che lei debba vendere'],
  S0326L03B03: ["I don't think that she needs to sell the company", 'non penso che lei debba vendere l\'azienda'],
  // 327
  S0327L01B01: ['I think that she needs to offer', 'penso che debba offrire'],
  // 335
  S0335L01B02: ['I think that he can speak', 'penso che possa parlare'],
  S0335L01B03: ['I think that he can learn', 'penso che possa imparare'],
  S0335L02B01: ['I think that he can add', 'penso che possa aggiungere'],
  // 336
  S0336L01B03: ["I don't think that she can come", 'non penso che lei possa venire'],
  S0336L01B04: ["I don't think that she can wait", 'non penso che lei possa aspettare'],
  S0336L01U03: ["I don't think that she can come now", 'non penso che lei possa venire adesso'],
  S0336L02B02: ["I don't think that she can open", 'non penso che lei possa aprire'],
  // 337 (K41 B02 is in the K41 list)
  S0337L01B03: ["I don't think he can continue to play a game", 'non penso che possa continuare a giocare'],
  // 432
  S0432L02B03: ["they don't want you to ask", 'non vogliono che tu chieda'],
  S0432L02U02: ['they want you to ask her', 'vogliono che tu chieda a lei'],
  S0432L02U04: ['they want you to ask why', 'vogliono che tu chieda perché'],
  // 615
  S0615L03B03: ['I thought you were brave to say it', 'pensavo che fossi coraggioso a dirlo'],
  // 636
  S0636L02B02: ['I think that that is', 'penso che quella sia'],
  S0636L02B03: ["I think that that is Jane's bag", 'penso che quella sia la borsa di Jane'],
  S0636L02U02: ["I really think that that is Jane's bag", 'penso davvero che quella sia la borsa di Jane'],
  S0636L02U04: ["yes, I think that that is Jane's bag", 'sì, penso che quella sia la borsa di Jane'],
  S0636L02U05: ["I don't think that that is Jane's bag", 'non penso che quella sia la borsa di Jane'],
  // 655 (#931 + K40): every row carries sir/madam (formal register)
  S0655L01B01: ["I think that you're speaking with me, madam", 'penso che stia parlando con me, signora'],
  S0655L01B02: ["I think that you're speaking Italian, sir", 'penso che stia parlando italiano, signore'],
  S0655L01B03: ["I think that you're speaking well, madam", 'penso che stia parlando bene, signora'],
  S0655L01U01: ["I think that you're speaking very well, madam", 'penso che stia parlando molto bene, signora'],
  S0655L01U02: ["I think that you're speaking well, sir", 'penso che stia parlando bene, signore'],
  S0655L01U03: ["I think that you're speaking very well, sir", 'penso che stia parlando molto bene, signore'],
  S0655L01U04: ["I think that you're speaking Italian very well, sir", 'penso che stia parlando italiano molto bene, signore'],
  S0655L01U05: ["I think that you're speaking well today, madam", 'penso che stia parlando bene oggi, signora'],
  // 139 knock-on (#931·I): "stia andando via" is taught nowhere once 72/129/655/114 say parlando
  S0139L01U03: ["I think you're leaving so early", 'penso che tu vada via così presto'],
  S0139L01U07: ["of course I'm sorry that I need to leave so early", 'certo che mi dispiace che devo andare via così presto'],
};
// 129 / 114: doing → speaking, andando → parlando, row by row (all rows under the LEGO + 114 L02 B02/U09)
const DOING_TO_SPEAKING = [
  'S0129L01B01', 'S0129L01B02', 'S0129L01B03', 'S0129L01B04', 'S0129L01U01', 'S0129L01U02', 'S0129L01U03', 'S0129L01U04',
  'S0129L01U05', 'S0129L01U06', 'S0129L01U07', 'S0129L01U08',
  'S0114L01B01', 'S0114L01B02', 'S0114L01B03', 'S0114L01B04', 'S0114L01U01', 'S0114L01U03', 'S0114L01U04', 'S0114L01U05',
  'S0114L01U06', 'S0114L02B02', 'S0114L02U09',
];
const doingToSpeaking = ([k, t]) => [k.replace(/\bdoing\b/g, 'speaking'), t.replace(/\bandando\b/g, 'parlando')];

const K40_DELETES = {
  S0070L01B01: 'bare "tell me | dirmi" becomes "to tell me | dirmi", an exact twin of B02 (K41)',
  S0070L03B04: '"to know where it was | sapere dove fosse" does not contain the grown LEGO "dirmi dove fosse" (P17)',
  S0070L03U05: '"I\'m trying to find where it was" does not contain the grown LEGO "dirmi dove fosse" (P17)',
  S0070L03U06: '"it\'s important to know where it was" does not contain the grown LEGO (P17); B02 now says "it\'s important to tell me where it was"',
  S0171L02B01: 'bare "me to help you | che ti aiuti" re-anchors to the LEGO itself, an exact twin of B03',
  S0303L01B01: 'bare "that he wants | che voglia" re-anchors to "I think that he wants | penso che voglia", an exact twin of B02',
  S0304L01B01: 'bare fragment re-anchors to an exact twin of B02',
  S0315L02B01: 'bare fragment re-anchors to an exact twin of B02',
  S0326L01B01: 'bare fragment re-anchors to an exact twin of B02',
  S0336L01B01: 'bare fragment re-anchors to an exact twin of B02',
  S0336L03B04: 're-anchored it is the seed sentence, already L03 U01',
  S0346L01B01: 'bare "her to know | che lei sapesse" re-anchors to an exact twin of B02',
  S0432L02B01: 'bare "that you ask | che tu chieda" re-anchors to an exact twin of B02',
};

// ── K41: LEGO re-glosses applied (job #936·I list minus Kai's holds) ─────────────────────────────────
// id → new known (target unchanged). Intro: keep the "as in" demo if it still contains the new gloss as whole
// words, else the named basket sentence, else the plain frame.
const K41_LEGOS = {
  S0062L01: { known: 'to help you', demo: 'I want to help you' },
  S0065L02: { known: 'to take time', demo: null },
  S0065L03: { known: 'to test yourself', demo: null },
  S0069L02: { known: 'to look after', demo: null },
  S0070L01: { known: 'to tell me', demo: null },
  S0088L01: { known: 'to talk to', demo: "I'm not ready to talk to people I don't know yet" },
  S0092L02: { known: 'to do it', demo: null },
  S0136L02: { known: 'to ask her', demo: 'I want to ask her' },
  S0171L03: { known: 'to look for it', demo: 'I want to look for it now' },
  S0173L01: { known: 'to manage on my own', demo: 'I want to manage on my own' },
  S0213L03: { known: 'to achieve', demo: null },
  S0276L01: { known: 'to stay', demo: 'would you like to stay here with us?' },
  S0293L01: { known: "to find out where he's going to", demo: "I have to find out where he's going to meet me" },
  S0293L02: { known: 'to meet me', demo: null },
  S0294L01: { known: 'to call you', demo: null },
  S0381L04: { known: 'to follow us', demo: null },
  S0384L02: { known: 'to agree with', demo: "I didn't want to agree with her" },
  S0395L02: { known: 'to turn left', demo: null },
  S0403L03: { known: 'to remain quiet', demo: null },
  S0466L02: { known: 'to throw it', demo: "it wasn't easy to throw it there" },
  S0475L03: { known: 'to consider waiting', demo: null },
  S0512L02: { known: 'to hold the door open', demo: 'she asked me to hold the door open' },
  S0529L02: { known: 'to put your hands up', demo: null },
  S0531L03: { known: 'to win the game', demo: null },
  S0660L01: { known: 'to help you all', demo: 'I want to help you all' },
};
// tiles inside a re-glossed LEGO: JSON components (by LEGO) and component ROWS (by id). old known → new known.
const K41_TILES_JSON = {
  S0065L02: { 'take time': 'to take time' }, S0065L03: { 'test yourself': 'to test yourself' },
  S0069L02: { 'look after': 'to look after' }, S0088L01: { 'talk to': 'to talk to' },
  S0136L02: { 'ask her': 'to ask her' }, S0173L01: { 'manage on my own': 'to manage on my own' },
  S0293L01: { 'find out where': 'to find out where' }, S0381L04: { follow: 'to follow' },
  S0395L02: { turn: 'to turn' }, S0403L03: { 'remain quiet': 'to remain quiet' },
  S0466L02: { throw: 'to throw' }, S0475L03: { consider: 'to consider' }, S0512L02: { hold: 'to hold' },
  S0529L02: { 'put up': 'to put up' }, S0660L01: { 'help you all': 'to help you all' },
};
const K41_TILE_ROWS = {
  S0171L03C01: ['to look for', 'cercare'], S0293L01C01: ['to find out where', 'scoprire dove'],
  S0293L02C02: ['to meet', 'incontrare'], S0294L01C02: ['to call', 'chiamare'],
  S0381L04C01: ['to follow', 'seguire'], S0395L02C01: ['to turn', 'girare'], S0466L02C01: ['to throw', 'buttare'],
  S0475L03C01: ['to consider', 'considerare'], S0512L02C01: ['to hold', 'tenere'], S0529L02C01: ['to put up', 'alzare'],
};

// BUILD rows (job #936·I list): default = "to " + known. Listed exceptions override or hold.
const K41_BUILD_IDS = `S0061L03B02 S0061L05B02 S0061L05B03 S0062L01B03 S0062L02B03 S0065L02B01 S0065L02B02 S0065L02B04 S0065L03B01
S0065L03B02 S0065L03B04 S0069L02B01 S0069L02B02 S0069L02B04 S0069L03B04 S0070L02B03 S0088L01B01 S0088L01B02 S0088L01B04
S0136L02B01 S0136L02B02 S0136L02B03 S0139L01B04 S0156L01B03 S0161L02B02 S0161L03B03 S0169L01B04 S0170L02B03 S0171L03B01
S0173L01B01 S0173L01B02 S0174L02B04 S0175L02B03 S0176L03B03 S0179L02B03 S0180L01B03 S0180L02B03 S0200L03B01 S0202L03B03
S0204L03B03 S0209L02B03 S0210L03B02 S0249L01B03 S0250L02B03 S0271L01B04 S0275L01B03 S0275L01B04 S0276L01B01 S0276L01B02
S0276L02B03 S0276L02B04 S0293L01B01 S0293L01B02 S0293L02B01 S0293L02B02 S0294L01B01 S0295L01B03 S0299L01B01
S0299L02B02 S0300L02B02 S0313L02B02 S0316L02B02 S0320L04B02 S0323L01B03 S0323L02B02 S0333L02B02 S0334L02B02 S0334L03B02
S0337L01B02 S0347L01B02 S0351L01B03 S0355L01B02 S0359L02B02 S0368L01B02 S0376L02B01 S0377L01B02 S0381L04B01 S0384L02B01
S0385L01B01 S0395L02B01 S0395L03B02 S0396L04B03 S0401L03B02 S0402L03B02 S0403L03B01 S0404L03B02 S0410L03B02 S0412L03B02
S0417L02B02 S0428L02B02 S0434L03B03 S0450L03B02 S0466L02B01 S0466L03B03 S0475L03B01 S0501L04B02 S0502L01B03 S0504L02B03
S0510L03B03 S0512L01B03 S0512L02B01 S0512L02B03 S0529L02B01 S0529L02B03 S0531L03B01 S0540L02B02 S0541L01B02 S0541L01B03
S0545L02B02 S0549L02B02 S0556L02B03 S0564L01B03 S0584L02B03 S0590L01B03 S0593L01B03 S0613L02B02 S0613L02B03
S0660L01B01`.split(/\s+/).filter(Boolean);
const K41_BUILD_OVERRIDE = {
  // the page's "to tell me what do you want me to do" is not English; the embedded question drops "do"
  S0169L01B04: ['to tell me what you want me to do', 'dirmi che cosa vuoi che faccia'],
  // "to look for it | a cercarlo" would clash with the re-glossed LEGO "to look for it | cercarlo" (ZUT)
  S0171L03B02: ['I want to look for it', 'voglio cercarlo'],
};
if (K41_BUILD_IDS.length !== 118) throw new Error(`K41 BUILD list: ${K41_BUILD_IDS.length}, expected 118 (134 on the page, 13 held, 3 of seed 70 re-authored under K40)`);

// ── HELD: one line each, with the recommendation (published for Kai) ────────────────────────────────
const HELD = [
  // K40 — Kai's own holds
  ['185', 'K40 over cap', "I think you left them | penso che tu le abbia lasciate = 10 syllables. Recommend: accept the cap exception for this one LEGO (no shorter cut keeps trigger + form)."],
  ['204', 'K40 over cap', "I wanted her to help you | volevo che lei ti aiutasse = 9 syllables. Recommend: accept the exception; the 8-syllable 'volevo che lei aiutasse' drops ti and no longer matches the seed."],
  ['375', 'K40 over cap + unclear', "non sapevo che cosa stesse facendo: the mood follows a negated verb + indirect question. Recommend: seed to the indicative 'che cosa stava facendo' (S0107 already teaches stavi facendo) — needs no trigger."],
  ['419', 'K40 over cap', "they want people to like them | vogliono che la gente li apprezzi = 11 syllables. Recommend: accept the exception, or cut at 'vogliono che la gente' + 'li apprezzi' is not possible (bare form again)."],
  ['427', 'K40 over cap', "they wouldn't like you to think | non vorrebbero che tu pensassi = 10. Also the current gloss 'that you thought' does not match the seed. Recommend: grow and accept the cap exception."],
  ['438', 'K40 over cap + unclear', "decidere che cosa dovesse fare = 11, indirect question after a negated verb. Recommend: seed to the conditional 'che cosa dovrebbe fare' (no trigger needed)."],
  ['444', 'K40 over cap', "LEGO 'potesse essere fatto' already differs from the seed 'si potesse fare'. Recommend: re-cut to the seed, 'they thought that it could be done | pensavano che si potesse fare' (9), cap exception."],
  ['479', 'K40 unclear', "il minimo che potessi fare: triggered by the superlative. Recommend: grow to 'the least I could do | il minimo che potessi fare' (10), cap exception."],
  ['482', 'K40 over cap', "the hope is that they're not serious | la speranza è che non siano seri = 11. Recommend: cap exception."],
  ['497', 'K40 over cap', "it seems that you need to | sembra che tu abbia bisogno di = 10. Recommend: cap exception."],
  ['501', 'K40 over cap', "to trust that you play together | fidarmi che giochiate insieme = 10; also B03 'fidarmi che giocare senza litigare' is broken Italian (che + infinitive). Recommend: cap exception + B03 → 'fidarmi che giochiate senza litigare'."],
  ['526', 'K40 over cap', "to believe that you can't manage to | credere che tu non riesca a = 9. Recommend: cap exception."],
  ['587', 'K40 over cap', "she used to insist that we ate | insisteva che mangiassimo = 9 (overlaps L03). Recommend: cap exception."],
  ['597', 'K40 over cap', "I suspect that he has heard them | sospetto che ne abbia sentite = 10. Recommend: cap exception."],
  // K40 — held by this job (not obviously the fix)
  ['47', 'K40 held here', "the proposed L02 'I think that it's | penso che sia' is EXACTLY S0163L01, so 163 would become a later duplicate, go not-new and its played basket would go dark (P25); and 'I think that it's a good thing | penso che sia una buona cosa' is 10 syllables. Recommend: Kai picks — cap exception for the whole chunk, or grow and accept 163 going not-new with its phrases rehomed."],
  ['339', 'K40 held here', "the LEGO 'he's hurt himself | si sia fatto' is already wrong without 'male' (hurt = farsi male), and three USE rows say pensi/pensa, not penso. Recommend: re-cut to 'I think he's hurt himself | penso che si sia fatto male' (8) and rewrite U02/U06."],
  ['486', 'K40 held here', "I think that they're beautiful | penso che siano bellissimi = 9 syllables, over the cap (the page listed it as clear). Recommend: cap exception."],
  ['668', 'K40 held here', "the page's split gives L02 'to go all | andare tutti', which is not English, and turns the not-new 'I hope | spero' into new text (never flip not-new). The whole chunk 'spero che possiate andare tutti' is 11 syllables. Recommend: grow L01 to 'I hope that you all can | spero che possiate' and leave 'andare tutti' to taught pieces (L30)."],
  // K41 — Kai's holds
  ['S0061L02 + S0644L02', 'K41 ZUT', "'to say it | dirlo' clashes with S0615L03 'to say it | a dirlo'. Recommend: re-gloss 615 L03 to 'brave to say it | coraggioso a dirlo' (its own seed words), freeing 'to say it' for dirlo; 644 is then a later exact duplicate of 61 (already not-new)."],
  ['S0067L01', 'K41 ZUT', "'to stop | smettere' vs S0402L02 'to stop | fermarsi'. Recommend: your call which one owns 'to stop'; the other keeps its current gloss and gets its sense into the intro (K23). Nothing written."],
  ['S0251L01', 'K41 ZUT', "'to find out | scoprirlo' vs 'to find out | scoprire' (S0017L01, S0433L02). Recommend: 'to find it out | scoprirlo' (the page's faithful fix)."],
  ['S0255L01', 'K41 ZUT', "'to leave | partire' vs 'to leave | andare via' (S0345L01, S0455L02). Recommend: Kai's call which is 'to leave'; partire could be 'to set off'."],
  ['S0066L02', 'K41 duplicate', "'to find | trovare' = S0460L01, which would go not-new (its basket dark). Recommend: apply and rehome 460's phrases, or leave 66 as is."],
  ['S0074L01', 'K41 duplicate', "'to understand | capire' = S0425L02 (later row would go not-new)."],
  ['S0300L01', 'K41 duplicate', "'to seem | sembrare' = S0122L02 (earlier), so 300 L01 would go not-new."],
  ['S0314L01 + S0382L04', 'K41 duplicate', "'to put it | metterlo' twice; 382 L04 is already not-new. Applying one without the other leaves two glosses for metterlo. Recommend: apply both together."],
  ['S0071L02', 'K41 held here', "'let hear | far sentire' → 'to let hear' is not English. Seed: 'we didn't want to let anyone hear the truth'. Recommend: grow the LEGO to 'to let anyone hear | far sentire … a nessuno' is not contiguous, so re-cut to 'to let someone hear | far sentire' — your call."],
  ['S0062L02B04', 'K41 held here', "'do it at the same time | fare allo stesso tempo': the Italian has no 'it' (farlo is taught later, at 92). 'to do it at the same time' keeps the mismatch."],
  ['S0274L01B03', 'K41 held here', "'see you in a few days | vedere tra qualche giorno': Italian has no 'you' (vederti)."],
  ['S0470L03B03', 'K41 held here', "'ask her before we stop | chiedere prima che ci fermiamo': Italian has no 'her' (chiederle)."],
  ['S0501L04B03', 'K41 held here', "'fidarmi che giocare senza litigare' is broken Italian; belongs with held seed 501."],
  ['S0656L02B04', 'K41 held here', "'let me stay with you all | stare con voi tutti': the Italian has no 'let me'."],
  ['S0289L01B03', 'K41 held here', "'to be there | essere lì' would clash (ZUT) with S0157L01 'to be there | esserci', taught earlier. Recommend: 'to be there | esserci' is the course's; rewrite the BUILD to use esserci, or gloss it 'to be over there'."],
  ['S0645L01B01', 'K41 held here', "'to help you | aiutarla' would clash with S0062L01 'to help you | aiutarti' (taught at 62), and the row is a bare fragment of its formal LEGO 'I can help you, madam | posso aiutarla, signora'. Recommend: rewrite as 'I can help you, madam | posso aiutarla, signora'-style BUILD, e.g. 'I want to help you, madam | voglio aiutarla, signora'."],
  ['K41 tiles under correct LEGOs (25)', 'K41 Kai\'s call', 'Not written (Kai held them).'],
  ['K41 gerund glosses (29)', 'K41 Kai\'s call', 'Not written (Kai held them).'],
  ['187 U04', '#931 not in brief', "'I'm doing well so far | sto andando bene finora' — the same performance idiom; the brief did not name it."],
  ['117', '#931 your call', "#931·I left 117 to Kai (speaking / improving); not in this brief's apply list."],
];

/** Pure: the whole plan as rows. `live` maps id → {known,target} for phrase rows the plan derives from (129/114, K41 BUILDs). */
function buildPlan(live) {
  const legos = {};
  for (const [id, l] of Object.entries(K40_LEGOS)) legos[id] = { known: l.known, target: l.target, comps: l.comps.map(([known, target]) => ({ known, target })), intro: l.intro, rule: 'K40' };
  for (const [id, l] of Object.entries(K41_LEGOS)) {
    if (legos[id]) throw new Error(`${id} in both K40 and K41`);
    legos[id] = { known: l.known, targetFromLive: true, k41: l, rule: 'K41' };
  }
  const phrases = {};
  const put = (id, kt, rule) => { if (phrases[id]) throw new Error(`${id} planned twice`); phrases[id] = { known: kt[0], target: kt[1], rule }; };
  for (const [id, kt] of Object.entries(K40_PHRASES)) put(id, kt, 'K40');
  for (const id of DOING_TO_SPEAKING) { const b = live[id]; if (!b) throw new Error(`${id} not live`); put(id, doingToSpeaking([b.known, b.target]), '#931'); }
  for (const [id, kt] of Object.entries(K40_LEGOS).flatMap(([, l]) => Object.entries(l.crow || {}))) put(id, kt, 'K40-tile');
  for (const [id, kt] of Object.entries(K41_TILE_ROWS)) put(id, kt, 'K41-tile');
  for (const id of K41_BUILD_IDS) {
    const b = live[id]; if (!b) throw new Error(`${id} not live`);
    put(id, K41_BUILD_OVERRIDE[id] || [`to ${b.known}`, b.target], 'K41');
  }
  for (const [id, kt] of Object.entries(K41_BUILD_OVERRIDE)) if (!phrases[id]) put(id, kt, 'K41');
  const deletes = { ...K40_DELETES };
  for (const id of Object.keys(deletes)) if (phrases[id]) throw new Error(`${id} both edited and deleted`);
  return { legos, phrases, deletes, seeds: SEEDS };
}

module.exports = { COURSE, JOB, K40_LEGOS, K41_LEGOS, K41_TILES_JSON, K41_TILE_ROWS, K41_BUILD_IDS, K41_BUILD_OVERRIDE, K40_PHRASES, K40_DELETES, DOING_TO_SPEAKING, SEEDS, HELD, buildPlan, doingToSpeaking };
