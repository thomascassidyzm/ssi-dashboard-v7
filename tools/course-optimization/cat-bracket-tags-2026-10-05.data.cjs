'use strict';
// tools/course-optimization/cat-bracket-tags-2026-10-05.data.cjs — job #881, cat_for_eng.
//
// THE PLAN, as data: every bracketed tag on a cat_for_eng LEGO or practice phrase (inventory: job #879·J,
// https://watson-1.tail4968cb.ts.net/d/33d2858a — 84 LEGOs, 33 phrases) and what replaces it, under Kai's ruling of
// 2026-10-05 (canon K42):
//   A  grammar / sense / person tag  → the LEGO GROWS, on both sides, to take in the seed's own words that force
//      the form (K40 for the subjunctive, K26 for the person); its phrases are re-made to contain the grown LEGO.
//   B  masc / fem / plural tag       → the tag is DROPPED; the phrases under the LEGO are checked to use that form
//      only where the sentence itself selects it (a feminine noun, "she", a plural), never bare (K27).
//   R  redundant tag                 → the English already selects the form ("is changing (continuous)"): dropped.
//   C  component / phrase tags       → brackets dropped from the known text the same way.
//   HELD                              → not changed; listed for Kai with the seed sentence and a recommendation.
//
// LEGO entry: { known, target?, comps?, demo?, group, why }. `target` absent = target unchanged. `comps` absent =
// components unchanged (brackets stripped). `demo` = the "as in" sentence of the new intro (must contain `known`);
// absent = the plain frame "The Catalan for: '<known>', is:".
// PHRASES: id → [known, target] (target unchanged where the same). DELETES: id → why (exact duplicates, or rows
// that cannot contain the grown LEGO in vocabulary taught by their round).

const COURSE = 'cat_for_eng';

const LEGOS = {
  // ── A: grammar tags ──────────────────────────────────────────────────────────────────────────────
  S0022L04: { group: 'A', known: 'to meet people who speak', target: 'conèixer gent que parli', comps: [['to meet people', 'conèixer gent'], ['who', 'que'], ['speak', 'parli']], why: "subjunctive parli is selected by wanting to meet people (not yet known) — the trigger grows into the LEGO (K40); contains L03 as K39's S0072L02 contains L01" },
  S0089L02: { group: 'A', known: 'a short time', target: 'poc temps', comps: [['short / little', 'poc'], ['time', 'temps']], why: "'(adj.)' marked poc agreeing with a noun: the noun temps comes in (seed: 'in a short time | en poc temps')" },
  S0091L01: { group: 'A', known: 'quickly enough', target: 'prou ràpid', comps: [['enough', 'prou'], ['quickly', 'ràpid']], why: "'(adj.)' marked ràpid used as an adverb; the seed's 'quickly enough | prou ràpid' carries it" },
  S0097L02: { group: 'A', known: 'as soon as you want', target: 'quan vulguis', comps: [['as soon as', 'quan'], ['you want', 'vulguis']], why: 'subjunctive vulguis is selected by quan (future) — the seed says "as soon as you want | quan vulguis"' },
  S0100L02: { group: 'A', known: "you shouldn't worry", target: 'no hauries de preocupar-te', comps: [["you shouldn't", 'no hauries de'], ['to worry', 'preocupar'], ['yourself', 'te']], why: "'(yourself)' marked the -te clitic; the 'you' that selects it is the seed's 'you shouldn't'" },
  S0102L02: { group: 'A', known: "we're trying", target: 'estem intentant', comps: [['we are', 'estem'], ['trying', 'intentant']], why: "'(trying)' said estem here is the progressive auxiliary; the seed's 'we're trying | estem intentant' carries it" },
  S0106L05: { group: 'A', known: 'we need to feel', target: 'necessitem sentir-nos', comps: [['we need', 'necessitem'], ['to feel', 'sentir'], ['ourselves', 'nos']], why: "'(ourselves)' marked -nos (collided with S0026L03 'to feel | sentir'); the seed's 'we … need to feel' carries the person" },
  S0107L03: { group: 'A', known: 'what you were doing', target: 'el que feies', comps: [['what', 'el que'], ['you were doing', 'feies']], why: "imperfect feies in the seed's 'what you were doing | el que feies'" },
  S0108L03: { group: 'A', known: "we didn't hope to wake", target: 'no esperàvem despertar-nos', comps: [["we didn't hope", 'no esperàvem'], ['to wake', 'despertar'], ['ourselves', 'nos']], why: "'(ourselves)' marked -nos; the 'we' that selects it is the seed's 'we didn't hope' (collided with S0055L03 'to wake up | despertar-me')" },
  S0110L02: { group: 'A', known: "I'd like to relax", target: "m'agradaria relaxar-me", comps: [["I'd like", "m'agradaria"], ['to relax', 'relaxar'], ['myself', 'me']], why: "'(myself)' marked -me; the seed's 'I'd like to relax' carries the person" },
  S0118L03: { group: 'A', known: 'when we were', target: 'quan érem', comps: [['when', 'quan'], ['we were', 'érem']], why: "imperfect érem (background 'when we were…') — the seed's quan comes in" },
  S0119L02: { group: 'A', known: 'before you leave', target: 'abans que marxis', comps: [['before', 'abans que'], ['you leave', 'marxis']], why: 'subjunctive marxis is selected by abans que (K40)' },
  S0120L03: { group: 'A', known: "it's interesting that you like", target: "és interessant que t'agradi", comps: [["it's interesting that", 'és interessant que'], ['you like', "t'agradi"]], why: "subjunctive t'agradi is selected by 'és interessant que' (K40; the bare que is not the trigger)" },
  S0121L04: { group: 'A', known: "it's unusual that you don't like", target: "és estrany que no t'agradi", comps: [["it's unusual that", 'és estrany que'], ["you don't like", "no t'agradi"]], why: "subjunctive t'agradi is selected by 'és estrany que' (K40)" },
  S0129L03: { group: 'A', known: "happy that you're doing it", target: 'content que ho estiguis fent', comps: [['happy that', 'content que'], ["you're doing it", 'ho estiguis fent']], why: "subjunctive estiguis is selected by 'content que' (K40; the ita_for_eng S0129L01 shape)" },
  S0136L02: { group: 'A', known: 'you can ask her', target: 'li pots preguntar', comps: [['to her', 'li'], ['you can', 'pots'], ['to ask', 'preguntar']], why: "'(indirect)' marked li; the seed's 'you can ask her | li pots preguntar' is the verb that governs it" },
  S0137L02: { group: 'A', known: 'to be perfect', target: 'ser perfecte', comps: [['to be', 'ser'], ['perfect', 'perfecte']], why: "'(infinitive)' separated ser from d'estar (S0253L01); the seed's 'to be perfect' is what selects ser" },
  S0169L01: { group: 'A', known: 'you want me to do', target: 'vols que faci', comps: [['you want', 'vols que'], ['me to do', 'faci']], why: 'subjunctive faci is selected by vols que (K40)' },
  S0170L01: { group: 'A', known: 'what you need', target: 'el que necessites', comps: [['what', 'el que'], ['you need', 'necessites']], why: "the tag said 'subjunctive' but necessites is indicative; what selects it in the seed is 'el que' — the LEGO grows to the seed's 'what you need'" },
  S0171L02: { group: 'A', known: 'you want me to help you look for it', target: "vols que t'ajudi a buscar-ho", comps: [['you want', 'vols que'], ['me to help you', "t'ajudi"], ['look for it', 'a buscar-ho']], why: "subjunctive t'ajudi is selected by vols que (K40); 7 by the builder's syllable gate" },
  S0174L01: { group: 'A', known: "I'm saying", target: 'estic dient', comps: [["I'm", 'estic'], ['saying', 'dient']], why: "gerund dient after estic — the seed's 'what I'm saying | el que estic dient'" },
  S0182L04: { group: 'A', known: 'have you seen', target: 'has vist', comps: [['have you', 'has'], ['seen', 'vist']], why: "participle vist after has — the seed's 'have you seen'" },
  S0237L02: { group: 'A', known: 'he wanted me to tell you', target: 'volia que jo et digués', comps: [['he wanted', 'volia que'], ['me', 'jo'], ['to tell you', 'et digués']], why: 'subjunctive digués is selected by volia que (K40); contains L01 jo' },
  S0238L01: { group: 'A', known: 'he wanted you to tell me', target: "volia que tu m'ho diguessis", comps: [['he wanted', 'volia que'], ['you', 'tu'], ['to tell me', "m'ho diguessis"]], why: 'subjunctive diguessis is selected by volia que (K40)' },
  S0246L02: { group: 'A', known: 'I wanted her to help you', target: "volia que ella t'ajudés", comps: [['I wanted', 'volia que'], ['her', 'ella'], ['to help you', "t'ajudés"]], why: 'subjunctive ajudés is selected by volia que (K40)' },
  S0249L01: { group: 'A', known: 'I want you to help me', target: "vull que m'ajudis", comps: [['I want', 'vull que'], ['you to help me', "m'ajudis"]], why: 'subjunctive ajudis is selected by vull que (K40)' },
  S0253L01: { group: 'A', known: 'I should be', target: "hauria d'estar", comps: [['I should', 'hauria'], ['to', "d'"], ['be', 'estar']], why: "'(contracted)' marked d'estar; the hauria that takes de is the seed's 'I should be'" },
  S0281L03: { group: 'A', known: 'before you start', target: 'abans de que comencis', comps: [['before', 'abans de que'], ['you start', 'comencis']], why: 'subjunctive comencis is selected by abans de que (K40) — the seed\'s own wording' },
  // R: the English already selects the form
  S0126L03: { group: 'R', known: 'is changing', why: "'is changing' already says the progressive; the tag repeated it" },
  S0127L01: { group: 'R', known: 'to see you', why: "'to see you' already says infinitive + object; the clitic is spelling, not a choice" },
  S0237L01: { group: 'R', known: 'I', why: "growing it would need the subjunctive L02 teaches; L02 now carries 'he wanted me' (and contains jo), so the emphatic use is taught there" },

  // ── A: sense tags ────────────────────────────────────────────────────────────────────────────────
  S0022L03: { group: 'A', known: 'to meet people', target: 'conèixer gent', comps: [['to meet', 'conèixer'], ['people', 'gent']], why: "'(people)' separated conèixer from quedar (S0018L02 'to meet'); the seed's people comes in" },
  S0073L01: { group: 'A', known: 'more to', target: 'molt per', comps: [['more', 'molt'], ['to', 'per']], demo: "I've got more to learn", why: "'(purpose)' marked per; the seed's 'more to (learn) | molt per (aprendre)' keeps the pattern every phrase drills" },
  S0085L02: { group: 'A', known: "I don't know those people", target: 'no conec aquesta gent', comps: [["I don't know", 'no conec'], ['those people', 'aquesta gent']], why: "'(people)' separated conec from sé (S0135L03); the seed's people comes in — and 'I know' is then free to mean sé" },
  S0087L01: { group: 'A', known: "people I don't know", target: 'persones que no conec', comps: [['people', 'persones'], ["I don't know", 'que no conec']], why: "'(formal)' separated persones from gent (S0022L02 'people'); the seed's 'people I don't know' carries it" },
  S0093L01: { group: 'A', known: "it's time to", target: 'és hora de', comps: [["it's", 'és'], ['time', 'hora'], ['to', 'de']], demo: "it's time to go", why: "'(hour/o'clock)' separated hora from temps/vegada; 'it's time to | és hora de' is the frame the seed and every phrase use" },
  S0183L01: { group: 'A', known: "I'm afraid", why: "'I'm sorry' is ho sento (S0140); the seed says 'I'm afraid' and the intro already did — slash and gloss go" },
  S0272L01: { group: 'A', known: 'sounds like', target: 'sona com', comps: [['sounds', 'sona'], ['like', 'com']], why: "'(like)' — the seed's com comes in" },
  S0276L01: { group: 'A', known: 'I can stay here', target: 'puc quedar-me aquí', comps: [['I can', 'puc'], ['to stay', 'quedar'], ['myself', 'me'], ['here', 'aquí']], why: "'(here)' — the seed's here, and the 'I can' that selects -me" },
  S0279L01: { group: 'A', known: "there wasn't much time left", target: 'no quedava gaire temps', comps: [['not', 'no'], ['there was left', 'quedava'], ['much', 'gaire'], ['time', 'temps']], why: "'there was (left) / remained' — quedar needs its subject; the seed's 'much time' comes in" },
  S0284L01: { group: 'A', known: 'do you know', demo: 'do you know my friend', why: "growing would swallow L02 'the female friend | l'amiga'; per K23(b) the people sense goes in the intro's as-in, and every phrase under it already has a person" },
  S0289L03: { group: 'A', known: "she's going to be there", target: 'serà allà', comps: [["she's going to be", 'serà'], ['there', 'allà']], why: "'(that place)' separated allà from hi; the seed's 'she's going to be there | serà allà' carries it (contains L02 serà)" },

  // ── A: person tags ───────────────────────────────────────────────────────────────────────────────
  S0122L04: { group: 'A', known: "it's starting", target: 'està començant', comps: [["it's", 'està'], ['starting', 'començant']], why: "'(3rd person = està)' put a Catalan word in the English; the seed's 'it's starting | està començant' is what selects està over és" },
  S0128L01: { group: 'A', known: 'I used to know', why: "'(I)' — the person moves into the English (K26), the seed's 'I used to know'" },
  S0132L03: { group: 'A', known: 'she was saying', target: 'ella deia', comps: [['she', 'ella'], ['was saying', 'deia']], why: "'(she)' — the seed's ella comes in (K26)" },
  S0133L03: { group: 'A', known: 'you work together', target: 'treballeu junts', comps: [['you work', 'treballeu'], ['together', 'junts']], why: "'(pl)' — 'together' is the seed's word that makes the you plural" },
  S0134L02: { group: 'A', known: 'you work', why: "'(singular)' — with S0133L03 now 'you work together', a bare 'you work' is the singular default (K23(f)); nothing in seed 134 marks it further" },
  S0135L02: { group: 'A', known: 'you think that', target: 'creus que', comps: [['you think', 'creus'], ['that', 'que']], why: "'(2sg)' and the slash — the seed's 'you think that | creus que'" },
  S0135L03: { group: 'A', known: 'I know', why: "'(1sg)' — the person is in the English; conec now carries its people (S0085L02), so 'I know' is sé alone" },
  S0140L01: { group: 'A', known: "you're trying to show me", target: 'intentes mostrar-me', comps: [["you're trying", 'intentes'], ['to show me', 'mostrar-me']], why: "'(2sg)' — the seed's 'you're trying to show me' (contained in L02)" },
  S0290L01: { group: 'A', known: 'he knows', target: 'ell sap', comps: [['he', 'ell'], ['knows', 'sap']], why: "'(he/she knows)' — the seed's ell comes in (K26)" },

  // ── B: masc / fem / plural — tag dropped ─────────────────────────────────────────────────────────
  S0083L02: { group: 'B+', known: 'your friend', target: 'el teu amic', comps: [['your', 'el teu'], ['friend', 'amic']], why: "masc. dropped; 'your' alone mapped to el teu and teva (S0125L01) — grown to the seed's 'your friend' (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0084L01: { group: 'B+', known: 'my friend', target: 'el meu amic', comps: [['my', 'el meu'], ['friend', 'amic']], why: "masc. dropped; 'my' alone mapped to el meu / meva / meves — grown to the seed's 'my friend' (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0085L01: { group: 'B', known: 'this', demo: 'this evening', why: "fem. and the wrong '/ these' dropped; every phrase has a feminine noun" },
  S0103L02: { group: 'B', known: 'many', demo: 'many words', why: 'fem. dropped; phrases have paraules' },
  S0106L06: { group: 'B+', known: 'we need to feel happy', target: 'necessitem sentir-nos feliços', comps: [['we need to feel', 'necessitem sentir-nos'], ['happy', 'feliços']], why: "plural dropped; 'happy' alone mapped to feliç (S0145L01) — grown to the seed's 'we … need to feel happy', whose 'we' selects the plural; contains L05 (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0109L01: { group: 'B+', known: 'new words', target: 'paraules noves', comps: [['words', 'paraules'], ['new', 'noves']], why: "pl. fem. dropped; 'new' alone mapped to noves and nova (S0111L01) — grown to the seed's 'new words' (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0111L01: { group: 'B+', known: 'something new', target: 'alguna cosa nova', comps: [['something', 'alguna cosa'], ['new', 'nova']], why: "fem. sing. dropped; 'new' alone mapped to nova and noves — grown to the seed's 'something new' (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0122L03: { group: 'B', known: 'excited', why: 'masc. and the slash dropped (intro already said excited)' },
  S0125L01: { group: 'B+', known: 'your idea', target: 'la teva idea', comps: [['your', 'la teva'], ['idea', 'idea']], why: "fem. dropped; 'your' alone mapped to teva and el teu — grown to the seed's 'your idea' (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0125L02: { group: 'B', known: 'very good', demo: 'your idea was very good', why: 'fem. dropped; phrases given the feminine noun (idea) where they had none (K27)' },
  S0134L03: { group: 'B', known: 'them', why: 'masc. pl. dropped' },
  S0135L01: { group: 'B+', known: 'so good', target: 'tan bo', comps: [['so', 'tan'], ['good', 'bo']], why: "masc. dropped; 'good' alone mapped to bo and bona (S0189L01) — grown to the seed's 'so good'. 189 cannot grow: 'a good idea | una bona idea' is already S0124L01 (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0136L03: { group: 'B+', known: "she's my friend", target: 'és la meva amiga', comps: [['she is', 'és'], ['my', 'la meva'], ['friend', 'amiga']], why: "fem. dropped; 'my friend' alone mapped to la meva amiga and el meu amic — grown to the seed's 'she's my friend', whose she selects amiga (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0143L01: { group: 'B', known: 'same', demo: 'the same thing', why: 'fem. dropped; phrases given cosa where they had no noun (K27)' },
  S0156L01: { group: 'B', known: 'a', demo: 'a friend', why: 'masculine dropped; phrases have amic / poc' },
  S0161L02: { group: 'B', known: 'that', demo: 'that book', why: 'm. dropped; phrases given a masculine noun where aquell stood alone (K27)' },
  S0181L01: { group: 'B', known: 'my', demo: 'my mother', why: 'feminine dropped; phrases given she / a feminine noun where "my friend" left it open' },
  S0182L01: { group: 'B', known: 'my', demo: 'my keys', why: 'f. pl. dropped; every phrase has coses' },
  S0183L02: { group: 'A', known: "I haven't seen them", target: 'no les he vistes', comps: [['not', 'no'], ['them', 'les'], ['I have seen', 'he vistes']], why: "'seen (f.pl.) / them (f.)': vistes agrees with les, so les comes in — a bare 'seen' would map to vistes" },
  S0189L01: { group: 'B', known: 'good', demo: 'a good idea', why: 'f. dropped; every phrase has idea' },
  S0232L01: { group: 'B+', known: 'an old woman', target: 'una dona vella', comps: [['a woman', 'una dona'], ['old', 'vella']], why: "feminine dropped; 'old' alone mapped to vella and vell (S0231L01) — grown to the seed's 'an old woman' (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0237L03: { group: 'B', known: 'of the', why: 'masc dropped; every phrase has cap de setmana' },
  S0246L01: { group: 'B+', known: 'she was too busy', target: 'estava massa ocupada', comps: [['she was', 'estava'], ['too', 'massa'], ['busy', 'ocupada']], why: "feminine dropped; 'busy' alone mapped to ocupada and ocupat (S0192L01) — grown to the seed's 'she was too busy' (Kai 2026-10-05 addendum: where the bare word left one English over two Catalan forms, grow to the seed's noun when easy)" },
  S0257L02: { group: 'B', known: 'blue', demo: 'that blue thing', why: 'feminine dropped; every phrase has cosa' },
  S0268L04: { group: 'B', known: 'last', demo: 'last week', why: 'feminine and the slash dropped; every phrase has setmana' },
  S0283L01: { group: 'B', known: 'which', why: "'(ones)' (plural) dropped; phrases are plural (amics / ones)" },
  S0283L02: { group: 'B', known: 'of your', demo: 'of your friends', why: 'plural dropped; every phrase has amics' },
  S0287L01: { group: 'B', known: 'how many', demo: 'how many people', why: "fem. and the slash dropped; every phrase has gent" },
  S0300L02: { group: 'B', known: 'unfriendly', why: 'f dropped; phrases given she where they had none' },
};

// Practice phrases: id → [known, target]
const PHRASES = {
  // 22 L03 to meet people
  S0022L03B01: ['to meet people', 'conèixer gent'],
  S0022L03B02: ['I want to meet people', 'vull conèixer gent'],
  S0022L03U01: ['I want to meet people today', 'vull conèixer gent avui'],
  S0022L03U04: ['she wants to meet people today', 'ella vol conèixer gent avui'],
  // 22 L04 to meet people who speak
  S0022L04B01: ['to meet people who speak', 'conèixer gent que parli'],
  S0022L04B02: ['I want to meet people who speak', 'vull conèixer gent que parli'],
  S0022L04B03: ['to meet people who speak Catalan', 'conèixer gent que parli català'],
  S0022L04C02: ['speak', 'parli'],
  S0022L04U05: ['I want to meet people who speak Catalan very well', 'vull conèixer gent que parli català molt bé'],
  // 73 more to
  S0073L01B01: ['more to', 'molt per'],
  // 83/84 your/my (masc)
  // 85 L02 I don't know those people
  S0085L02B01: ["I don't know those people", 'no conec aquesta gent'],
  S0085L02B02: ["I don't know those people yet", 'encara no conec aquesta gent'],
  S0085L02B03: ["no, I don't know those people", 'no, no conec aquesta gent'],
  S0085L02U02: ["because I don't know those people", 'perquè no conec aquesta gent'],
  S0085L02U03: ["I think I don't know those people", 'crec que no conec aquesta gent'],
  S0085L02U05: ["I don't know those people very well", 'no conec aquesta gent molt bé'],
  // 87 people I don't know
  S0087L01B01: ["people I don't know", 'persones que no conec'],
  S0087L01B02: ["I want to speak with people I don't know", 'vull parlar amb persones que no conec'],
  S0087L01B03: ["there are people I don't know", 'hi ha persones que no conec'],
  S0087L01U01: ["there are people I don't know today", 'avui hi ha persones que no conec'],
  S0087L01U02: ["I think there are people I don't know", 'crec que hi ha persones que no conec'],
  S0087L01U03: ["because there are people I don't know", 'perquè hi ha persones que no conec'],
  // 89 a short time
  S0089L02B01: ['a short time', 'poc temps'],
  S0089L02B02: ['in a short time', 'en poc temps'],
  S0089L02B03: ["I've done a lot in a short time", 'he fet molt en poc temps'],
  S0089L02U02: ['I have a lot to do in a short time', 'tinc molt per fer en poc temps'],
  S0089L02U03: ["I've got a short time", 'tinc poc temps'],
  S0089L02U04: ['I want to learn a lot in a short time', 'vull aprendre molt en poc temps'],
  S0089L02U05: ['I can do a lot in a short time', 'puc fer molt en poc temps'],
  // 91 quickly enough
  S0091L01B01: ['quickly enough', 'prou ràpid'],
  S0091L01B03: ['think quickly enough', 'pensar prou ràpid'],
  S0091L01U01: ["it's difficult to think quickly enough", 'és difícil pensar prou ràpid'],
  S0091L01U02: ["it's difficult to speak quickly enough", 'és difícil parlar prou ràpid'],
  S0091L01U03: ["it's important to think quickly enough", 'és important pensar prou ràpid'],
  S0091L01U05: ['it would be great to speak quickly enough', 'seria genial parlar prou ràpid'],
  // 93 it's time to
  S0093L01B01: ["it's time to", 'és hora de'],
  S0093L01B02: ["it's time to speak Catalan", 'és hora de parlar català'],
  // 97 as soon as you want
  S0097L02B01: ['as soon as you want', 'quan vulguis'],
  S0097L02B02: ['go as soon as you want', 'marxar quan vulguis'],
  S0097L02B03: ['ready to go as soon as you want', 'a punt de marxar quan vulguis'],
  S0097L02U02: ['go home as soon as you want', 'tornar a casa quan vulguis'],
  S0097L02U03: ["I'm ready as soon as you want", 'estic a punt quan vulguis'],
  S0097L02U04: ['start as soon as you want', 'començar quan vulguis'],
  S0097L02U05: ["I'll be ready as soon as you want", 'estaré a punt quan vulguis'],
  // 100 you shouldn't worry
  S0100L02B01: ["you shouldn't worry", 'no hauries de preocupar-te'],
  S0100L02B02: ["you shouldn't worry today", 'avui no hauries de preocupar-te'],
  S0100L02B03: ["you shouldn't worry about starting", 'no hauries de preocupar-te de començar'],
  S0100L02U02: ["you shouldn't worry about doing this", 'no hauries de preocupar-te de fer això'],
  S0100L02U03: ["you shouldn't worry about speaking", 'no hauries de preocupar-te de parlar'],
  S0100L02U05: ["I think you shouldn't worry", 'crec que no hauries de preocupar-te'],
  // 102 we're trying
  S0102L02B01: ["we're trying", 'estem intentant'],
  S0102L02B02: ["we're trying to say", 'estem intentant dir'],
  S0102L02B03: ["we're trying to say that", 'estem intentant dir que'],
  S0102L02C01: ['we are', 'estem'],
  S0102L02C02: ['trying', 'intentant'],
  // 103 many
  S0103L02U05: ['I want to understand many words', 'vull entendre moltes paraules'],
  // 106 L05 we need to feel ; L06 happy
  S0106L05B01: ['we need to feel', 'necessitem sentir-nos'],
  S0106L05U03: ['we need to feel good today', 'necessitem sentir-nos bé avui'],
  // 107 what you were doing
  S0107L03B01: ['what you were doing', 'el que feies'],
  S0107L03B02: ['to see what you were doing', 'veure el que feies'],
  S0107L03B03: ['I wanted to see what you were doing', 'volia veure el que feies'],
  S0107L03U03: ['I think I understand what you were doing', 'crec que entenc el que feies'],
  // 108 we didn't hope to wake
  S0108L03B01: ["we didn't hope to wake", 'no esperàvem despertar-nos'],
  S0108L03B02: ["we didn't hope to wake at night", 'no esperàvem despertar-nos de nit'],
  S0108L03B03: ["we didn't hope to wake at midnight", 'no esperàvem despertar-nos a mitja nit'],
  S0108L03U03: ["we didn't hope to wake early", 'no esperàvem despertar-nos aviat'],
  S0108L03U04: ["we didn't hope to wake at six", 'no esperàvem despertar-nos a les sis'],
  // 110 I'd like to relax
  S0110L02B01: ["I'd like to relax", "m'agradaria relaxar-me"],
  S0110L02B03: ["I'd like to relax more", "m'agradaria relaxar-me més"],
  S0110L02U01: ["I'd like to relax now", "m'agradaria relaxar-me ara"],
  S0110L02U03: ["I'd like to relax a little", "m'agradaria relaxar-me una mica"],
  S0110L02U05: ["I think I'd like to relax", "crec que m'agradaria relaxar-me"],
  S0110L02U07: ["I'd like to relax with you", "m'agradaria relaxar-me amb tu"],
  // 118 when we were
  S0118L03B01: ['when we were', 'quan érem'],
  S0118L03B02: ['when we were at the bar', 'quan érem al bar'],
  S0118L03B03: ['than when we were at the bar', 'que quan érem al bar'],
  // 119 before you leave
  S0119L02B01: ['before you leave', 'abans que marxis'],
  S0119L02B02: ['work before you leave', 'treballar abans que marxis'],
  S0119L02B03: ['talk before you leave', 'parlar abans que marxis'],
  // 120 it's interesting that you like
  S0120L03B01: ["it's interesting that you like", "és interessant que t'agradi"],
  S0120L03B02: ["it's interesting that you like this", "és interessant que t'agradi això"],
  S0120L03B03: ["it's interesting that you like to go", "és interessant que t'agradi anar"],
  S0120L03U02: ["it's interesting that you like to speak Catalan", "és interessant que t'agradi parlar català"],
  S0120L03U04: ["it's interesting that you like to work", "és interessant que t'agradi treballar"],
  // 121 it's unusual that you don't like
  S0121L04B01: ["it's unusual that you don't like", "és estrany que no t'agradi"],
  S0121L04B02: ["it's unusual that you don't like this", "és estrany que no t'agradi això"],
  S0121L04B03: ["it's unusual that you don't like to use", "és estrany que no t'agradi usar"],
  S0121L04U02: ["it's unusual that you don't like to use this", "és estrany que no t'agradi usar això"],
  S0121L04U03: ["it's unusual that you don't like to go by bus", "és estrany que no t'agradi anar en autobús"],
  S0121L04U04: ["I think it's unusual that you don't like to speak Catalan", "crec que és estrany que no t'agradi parlar català"],
  S0121L04U05: ["it's unusual that you don't like the car", "és estrany que no t'agradi el cotxe"],
  // 122 L04 it's starting
  S0122L04U01: ["it's starting now", 'està començant ara'],
  S0122L04U02: ["I think it's starting", 'crec que està començant'],
  S0122L04U03: ["it's starting today", 'està començant avui'],
  S0122L04U04: ['everything is starting now', 'tot està començant ara'],
  S0122L04U06: ["I think it's starting now", 'crec que està començant ara'],
  S0122L04U07: ["yes, it's starting", 'sí, està començant'],
  // 125 L02 very good
  S0125L02B03: ['a very good idea', 'una idea molt bona'],
  S0125L02U02: ['I think the idea was very good', 'crec que la idea era molt bona'],
  S0125L02U04: ['the idea was very good', 'la idea era molt bona'],
  S0125L02U05: ['I think your idea is very good', 'crec que la teva idea és molt bona'],
  // 126 is changing
  S0126L03B01: ['is changing', 'està canviant'],
  // 129 L03 happy that you're doing it
  S0129L03B01: ["happy that you're doing it", 'content que ho estiguis fent'],
  S0129L03B02: ["I'm happy that you're doing it", 'estic content que ho estiguis fent'],
  S0129L03B03: ["I'm happy that you're doing it well", 'estic content que ho estiguis fent bé'],
  S0129L03U02: ["I'm happy that you're doing it better", 'estic content que ho estiguis fent millor'],
  S0129L03U03: ["I'm very happy that you're doing it now", 'estic molt content que ho estiguis fent ara'],
  S0129L03U04: ["I'm happy that you're doing it so well", 'estic content que ho estiguis fent tan bé'],
  S0129L03U05: ["I'm happy that you're doing it today", 'estic content que ho estiguis fent avui'],
  // 132 she was saying
  S0132L03U04: ['what she was saying was important', 'el que ella deia era important'],
  // 133 you work together
  S0133L03B02: ['you work together', 'treballeu junts'],
  S0133L03B03: ['you work together today', 'treballeu junts avui'],
  S0133L03U01: ['do you work together very well?', 'treballeu junts molt bé?'],
  S0133L03U02: ['you work together very well', 'treballeu junts molt bé'],
  S0133L03U05: ['you work together very well today', 'treballeu junts molt bé avui'],
  // 135 L03 I know
  S0135L03U01: ["I don't know anything", 'no sé res'],
  // 136 L02 you can ask her
  S0136L02B02: ['yes, you can ask her', 'sí, li pots preguntar'],
  S0136L02B03: ['you can ask her something', 'li pots preguntar alguna cosa'],
  S0136L02U03: ['you can ask her why', 'li pots preguntar per què'],
  S0136L02U05: ['you can ask her something now', 'li pots preguntar alguna cosa ara'],
  S0136L02U06: ['you can ask her tomorrow', 'li pots preguntar demà'],
  // 136 L03 my friend
  S0136L03C01: ['friend', 'amiga'],
  // 137 to be perfect
  S0137L02B02: ["it's better to be perfect", 'és millor ser perfecte'],
  S0137L02U02: ["it's not important to be perfect", 'no és important ser perfecte'],
  S0137L02U03: ["I don't need to be perfect", 'no necessito ser perfecte'],
  // 140 you're trying to show me
  S0140L01B01: ["you're trying to show me", 'intentes mostrar-me'],
  S0140L01B02: ["you're trying to show me now", 'intentes mostrar-me ara'],
  S0140L01B03: ["you're trying to show me today", 'intentes mostrar-me avui'],
  S0140L01U01: ["you're trying to show me something new", 'intentes mostrar-me alguna cosa nova'],
  S0140L01U02: ["I think you're trying to show me", 'crec que intentes mostrar-me'],
  S0140L01U03: ["you're trying to show me but it's difficult", 'intentes mostrar-me però és difícil'],
  S0140L01U04: ["I know you're trying to show me something", 'sé que intentes mostrar-me alguna cosa'],
  S0140L01U05: ["you're trying to show me something", 'intentes mostrar-me alguna cosa'],
  // 143 same
  S0143L01B02: ['the same thing for me', 'la mateixa cosa per a mi'],
  S0143L01B03: ['this same thing', 'aquesta mateixa cosa'],
  // 161 that
  S0161L02B02: ['that car', 'aquell cotxe'],
  S0161L02U01: ['I want that car', 'vull aquell cotxe'],
  S0161L02U02: ['she showed me that restaurant', 'em va mostrar aquell restaurant'],
  S0161L02U03: ['I want to know about that friend', 'vull saber sobre aquell amic'],
  S0161L02U04: ['I can see that car', 'puc veure aquell cotxe'],
  S0161L02U05: ['she showed me that restaurant today', 'em va mostrar aquell restaurant avui'],
  S0161L02U06: ['I found that car', 'vaig trobar aquell cotxe'],
  // 169 you want me to do
  S0169L01B01: ['you want me to do', 'vols que faci'],
  S0169L01B02: ['what you want me to do', 'el que vols que faci'],
  S0169L01B03: ['what you want me to do now', 'el que vols que faci ara'],
  S0169L01U05: ["I don't know what you want me to do", 'no sé el que vols que faci'],
  // 170 what you need
  S0170L01B01: ['what you need', 'el que necessites'],
  S0170L01B02: ['what you need today', 'el que necessites avui'],
  S0170L01U03: ['she asked me what you need', 'em va preguntar el que necessites'],
  S0170L01U04: ['I want to find what you need today', 'vull trobar el que necessites avui'],
  S0170L02B01: ['you would tell me', 'em diguessis'],
  // 171 you want me to help you look for it
  S0171L02B01: ['you want me to help you look for it', "vols que t'ajudi a buscar-ho"],
  S0171L02B02: ['you want me to help you look for it today', "vols que t'ajudi a buscar-ho avui"],
  S0171L02B03: ['do you want me to help you look for it now?', "vols que t'ajudi a buscar-ho ara?"],
  S0171L02U06: ['I know you want me to help you look for it', "sé que vols que t'ajudi a buscar-ho"],
  S0171L02U07: ['I think you want me to help you look for it', "crec que vols que t'ajudi a buscar-ho"],
  S0171L02U08: ['do you want me to help you look for it tomorrow?', "vols que t'ajudi a buscar-ho demà?"],
  // 174 I'm saying
  S0174L01B01: ["I'm saying", 'estic dient'],
  S0174L01B02: ["what I'm saying", 'el que estic dient'],
  S0174L01B03: ["what I'm saying now", 'el que estic dient ara'],
  S0174L01U03: ["can you hear what I'm saying?", 'pots sentir el que estic dient?'],
  // 181 my (fem)
  S0181L01B01: ['my', 'meva'],
  S0181L01B02: ["she's my friend", 'és la meva amiga'],
  S0181L01B03: ["I know she's my friend", 'sé que és la meva amiga'],
  S0181L01U02: ['I like my idea', "m'agrada la meva idea"],
  S0181L01U03: ['I told you about my idea', 'et vaig parlar de la meva idea'],
  S0181L01U04: ['my idea is very good', 'la meva idea és molt bona'],
  S0181L01U05: ["she's my friend and she wants to help", 'és la meva amiga i vol ajudar'],
  S0181L01U06: ['I told her about my idea today', 'li vaig parlar de la meva idea avui'],
  // knock-on (O12): 'my friend' over la meva amiga with nothing feminine in the sentence → the default el meu amic
  S0181L02B03: ['take my friend today', 'portar el meu amic avui'],
  S0181L02U05: ['I want to take my friend', 'vull portar el meu amic'],
  S0181L02U06: ['can I take my friend?', 'puc portar el meu amic?'],
  // knock-on: the same English as the grown S0246L02, its Catalan missing the ella its seed (204) says
  S0204L02B03: ['I wanted her to help you', "volia que ella t'ajudés"],
  // 182 my (f.pl.) ; have you seen
  S0182L01B01: ['my', 'meves'],
  S0182L04B01: ['have you seen', 'has vist'],
  S0182L04B02: ['have you seen my things', 'has vist les meves coses'],
  S0182L04U05: ["haven't you seen my keys?", 'no has vist les meves claus?'],
  S0182L04U06: ['she asked me if you have seen my keys', 'em va preguntar si has vist les meves claus'],
  // 183 I'm afraid ; I haven't seen them
  S0183L01B01: ["I'm afraid", 'em sap greu'],
  S0183L01B03: ["I'm afraid I can't", 'em sap greu, no puc'],
  S0183L01U02: ["I'm afraid I can't help", 'em sap greu, no puc ajudar'],
  S0183L01U04: ["I'm afraid I can't come", 'em sap greu, no puc venir'],
  S0183L01U06: ["I'm afraid I don't know her", 'em sap greu, no la conec'],
  S0183L02B01: ["I haven't seen them", 'no les he vistes'],
  S0183L02B02: ["no, I haven't seen them", 'no, no les he vistes'],
  S0183L02U03: ["I'm afraid I haven't seen them", 'em sap greu, no les he vistes'],
  // 189 good
  S0189L01B01: ['good', 'bona'],
  // 237 he wanted me to tell you
  S0237L02B01: ['he wanted me to tell you', 'volia que jo et digués'],
  S0237L02B02: ['he wanted me to tell you today', 'volia que jo et digués avui'],
  S0237L02B03: ['he wanted me to tell you something', 'volia que jo et digués alguna cosa'],
  S0237L02U01: ['he wanted me to tell you that', 'volia que jo et digués això'],
  S0237L02U02: ['she wanted me to tell you something new', 'volia que jo et digués alguna cosa nova'],
  S0237L02U06: ['he wanted me to tell you the truth', 'volia que jo et digués la veritat'],
  S0237L02U08: ['he wanted me to tell you why', 'volia que jo et digués per què'],
  // 238 he wanted you to tell me
  S0238L01B01: ['he wanted you to tell me', "volia que tu m'ho diguessis"],
  S0238L01B02: ['he wanted you to tell me today', "volia que tu m'ho diguessis avui"],
  S0238L01B03: ['he wanted you to tell me before', "volia que tu m'ho diguessis abans"],
  S0238L01U04: ['he wanted you to tell me before the weekend', "volia que tu m'ho diguessis abans del cap de setmana"],
  S0238L01U06: ['I think he wanted you to tell me', "crec que volia que tu m'ho diguessis"],
  S0238L01U07: ['he wanted you to tell me tomorrow', "volia que tu m'ho diguessis demà"],
  // 246 busy ; I wanted her to help you
  S0246L01U01: ['the woman was too busy', 'la dona estava massa ocupada'],
  S0246L02B01: ['I wanted her to help you', "volia que ella t'ajudés"],
  S0246L02B02: ['I wanted her to help you today', "volia que ella t'ajudés avui"],
  S0246L02U02: ['I wanted her to help you work', "volia que ella t'ajudés a treballar"],
  S0246L02U03: ['I wanted her to help you speak', "volia que ella t'ajudés a parlar"],
  // 249 I want you to help me
  S0249L01B01: ['I want you to help me', "vull que m'ajudis"],
  S0249L01B02: ['I want you to help me today', "vull que m'ajudis avui"],
  S0249L01B03: ['I want you to help me with this', "vull que m'ajudis amb això"],
  S0249L01U02: ['I want you to help me tomorrow', "vull que m'ajudis demà"],
  // 253 I should be
  S0253L01B01: ['I should be', "hauria d'estar"],
  S0253L01B02: ['I should be ready', "hauria d'estar a punt"],
  S0253L01B03: ['I should be ready today', "hauria d'estar a punt avui"],
  // 272 sounds like
  S0272L01B01: ['it sounds like', 'sona com'],
  S0272L01U02: ['that sounds like something interesting', 'sona com una cosa interessant'],
  S0272L01U04: ['it sounds like something difficult', 'sona com una cosa difícil'],
  // 276 I can stay here
  S0276L01B01: ['I can stay here', 'puc quedar-me aquí'],
  S0276L01B02: ['no, I can stay here', 'no, puc quedar-me aquí'],
  S0276L01U02: ['I can stay here today', 'puc quedar-me aquí avui'],
  S0276L01U04: ['I think I can stay here', 'crec que puc quedar-me aquí'],
  S0276L01U05: ['I can stay here with you', 'puc quedar-me aquí amb tu'],
  // 279 there wasn't much time left
  S0279L01B01: ["there wasn't much time left", 'no quedava gaire temps'],
  S0279L01B02: ["yes, there wasn't much time left", 'sí, no quedava gaire temps'],
  S0279L01B03: ["there wasn't much time left to finish", 'no quedava gaire temps per acabar'],
  S0279L01U03: ["there wasn't much time left today", 'avui no quedava gaire temps'],
  S0279L01U04: ["I think there wasn't much time left", 'crec que no quedava gaire temps'],
  S0279L01U05: ["there wasn't much time left to speak", 'no quedava gaire temps per parlar'],
  // 281 before you start
  S0281L03B01: ['before you start', 'abans de que comencis'],
  S0281L03B02: ['I want to finish before you start', 'vull acabar abans de que comencis'],
  S0281L03U01: ['I want to help you before you start', 'vull ajudar-te abans de que comencis'],
  S0281L03U02: ["I'd like to finish before you start", "m'agradaria acabar abans de que comencis"],
  S0281L03U03: ["I think it's important to finish before you start", 'crec que és important acabar abans de que comencis'],
  S0281L03U04: ['I want to speak with you before you start', 'vull parlar amb tu abans de que comencis'],
  S0281L03U05: ['do you mind if I finish before you start?', "t'importa si acabo abans de que comencis?"],
  S0281L03U06: ["I'd like to finish my coffee before you start", "m'agradaria acabar el meu cafè abans de que comencis"],
  S0281L03U07: ["it's important to practise before you start", 'és important practicar abans de que comencis'],
  S0281L03U08: ['I want to speak with her before you start', 'vull parlar amb ella abans de que comencis'],
  S0281L03U09: ['I want to see you before you start', "vull veure't abans de que comencis"],
  S0281L03U10: ["it's important to understand before you start", 'és important entendre abans de que comencis'],
  S0281L03U11: ['I hope to finish before you start', 'espero acabar abans de que comencis'],
  // 283 of your (plural)
  S0283L02B01: ['of your', 'dels teus'],
  // 287 how many
  S0287L01B01: ['how many', 'quanta'],
  // 289 she's going to be there
  S0289L03B01: ["she's going to be there", 'serà allà'],
  S0289L03B02: ["if she's going to be there", 'si serà allà'],
  S0289L03B03: ["she's going to be there this afternoon", 'serà allà aquesta tarda'],
  S0289L03U02: ["I think she's going to be there", 'crec que serà allà'],
  S0289L03U03: ["is she going to be there?", 'serà allà?'],
  S0289L03U05: ["she's going to be there tomorrow", 'serà allà demà'],
  // 290 he knows
  S0290L01B02: ['he knows the answer', 'ell sap la resposta'],
  S0290L01B03: ['I wonder if he knows', 'em pregunto si ell sap'],
  S0290L01U03: ['he knows what he wants', 'ell sap el que vol'],
  S0290L01U04: ['I wonder if he knows where he wants to go', 'em pregunto si ell sap on vol anar'],
  // 300 unfriendly
  S0300L02B01: ["she's a bit unfriendly", 'és una mica antipàtica'],
  S0300L02B03: ["she's very unfriendly", 'és molt antipàtica'],
  // B+ (Kai's addendum, 2026-10-05): the bare word grown to its seed noun
  S0083L02B01: ["your friend", "el teu amic"],
  S0083L02B02: ["about your friend", "sobre el teu amic"],
  S0083L02B03: ["with your friend", "amb el teu amic"],
  S0083L02B04: ["your friend today", "el teu amic avui"],
  S0084L01B01: ["my friend", "el meu amic"],
  S0084L01B02: ["about my friend", "sobre el meu amic"],
  S0084L01B03: ["with my friend", "amb el meu amic"],
  S0084L01B04: ["my friend today", "el meu amic avui"],
  S0106L06B01: ["we need to feel happy", "necessitem sentir-nos feliços"],
  S0106L06B02: ["we need to feel happy now", "necessitem sentir-nos feliços ara"],
  S0106L06B03: ["we need to feel happy today", "necessitem sentir-nos feliços avui"],
  S0106L06U05: ["I think we need to feel happy", "crec que necessitem sentir-nos feliços"],
  S0109L01B01: ["new words", "paraules noves"],
  S0109L01B02: ["learn new words", "aprendre paraules noves"],
  S0111L01B01: ["something new", "alguna cosa nova"],
  S0111L01B02: ["I want something new", "vull alguna cosa nova"],
  S0125L01B01: ["your idea", "la teva idea"],
  S0125L01B02: ["your idea was important", "la teva idea era important"],
  S0125L01U05: ["I like your idea", "m'agrada la teva idea"],
  S0135L01B01: ["so good", "tan bo"],
  S0135L01B02: ["it's so good", "és tan bo"],
  // knock-on: 'so good' over tan bé — the English says 'so well'
  S0129L01B01: ["so well", "tan bé"],
  S0135L01U04: ["that is so good", "això és tan bo"],
  S0135L01U05: ["he is so good at this", "ell és tan bo en això"],
  S0136L03B01: ["she's my friend", "és la meva amiga"],
  S0136L03B02: ["yes, she's my friend", "sí, és la meva amiga"],
  S0232L01B01: ["an old woman", "una dona vella"],
  S0232L01B02: ["there's an old woman", "hi ha una dona vella"],
  S0232L01U05: ["an old woman is trying to help me", "una dona vella intenta ajudar-me"],
  S0246L01B01: ["she was too busy", "estava massa ocupada"],
  S0246L01B02: ["she was too busy today", "avui estava massa ocupada"],
  S0246L01B03: ["she was too busy to speak", "estava massa ocupada per parlar"],
  // C: component rows elsewhere — brackets dropped
  S0015L03C02: ['you speak', 'parlis'],
  S0061L04C02: ['it', 'ho'],
  S0062L01C02: ['you', 'te'],
  S0063L01C02: ['me', 'me'],
  S0070L03C02: ['me', 'me'],
  S0077L03C02: ['the', 'la'],
  S0082L02C01: ['you', 'et'],
  S0173L03C01: ['myself', "me'n"],
  S0184L01C01: ['the', "l'"],
};

// JSON component tags elsewhere (not in LEGOS): lego_id → { old known: new known }
const COMPONENT_JSON_STRIPS = {
  S0015L03: { 'you speak (subj.)': 'you speak' },
  S0061L04: { 'it (object)': 'it' },
  S0062L01: { 'you (object)': 'you' },
  S0063L01: { 'me (object)': 'me' },
  S0070L03: { 'me (object)': 'me' },
  S0077L03: { 'the (fem)': 'the' },
  S0082L02: { 'you (clitic)': 'you' },
  S0136L03: { 'friend (fem)': 'friend' },
  S0173L03: { 'myself (enclitic)': 'myself' },
  S0184L01: { 'the (elided)': 'the' },
};

const DELETES = {
  S0106L06U07: 'exact duplicate of U06',
  S0087L01U05: "cannot carry 'people I don't know' in words taught by round 221 without repeating U01–U03",
  S0108L03U05: "cannot contain 'we didn't hope to wake' naturally ('it's hard to wake up at midnight')",
  S0108L03U06: "'I don't want us to wake up early' cannot contain the grown LEGO",
  S0108L03U07: "'we were expecting to wake up at six' — the positive; the grown LEGO is negative (U04 now says it)",
  S0108L03U08: 'exact duplicate of U06',
  S0108L03U09: 'exact duplicate of U07',
  S0110L02U08: 'exact duplicate of U07',
  S0122L04U05: 'exact duplicate of U04',
  S0122L04U08: 'exact duplicate of U04',
  S0122L04U09: 'exact duplicate of U06',
  S0122L04U10: 'exact duplicate of U07',
  S0171L02U09: "'he wants me to help…' — vol, not vols; cannot contain the grown LEGO",
  S0171L02U10: 'exact duplicate of U07',
  S0171L02U11: 'exact duplicate of U09',
  S0171L02U12: 'exact duplicate of U07',
  S0237L02U09: 'exact duplicate of U08',
  S0238L01U08: "'she wanted you to say something' — no m'ho; cannot contain the grown LEGO",
  S0238L01U09: 'exact duplicate of U08',
  S0281L03U12: 'exact duplicate of U01',
  S0281L03U13: 'exact duplicate of U09',
  S0281L03U14: 'exact duplicate of U10',
  S0281L03U15: 'exact duplicate of U11',
  S0281L03U16: 'exact duplicate of U01',
};

// Not changed — for Kai. Tag stays until he rules.
const HELD = [
  { id: 'S0025L01', known: 'to go (away)', target: 'marxar', seed: 'Are you going to help me before I have to go? | Em vas a ajudar abans que hagi de marxar?',
    why: "The seed's only context for marxar is 'I have to go | hagi de marxar' — a bare subjunctive (K40) that L02 'before I have to go | abans que hagi de marxar' already teaches. Growing L01 into it would duplicate L02.",
    rec: "K23(b): LEGO 'to go | marxar' with the intro 'The Catalan for: 'to go', when you mean leaving, is:' — and anar (S0120L01) stays the default 'to go'. Every marxar phrase already says where nothing is (go / leave), so (d) holds." },
  { id: 'S0115L04', known: 'that (subjunctive)', target: 'estigui', seed: "I don't feel as if I'm ready to have a conversation. | No em sembla que estigui a punt de tenir una conversa.",
    why: "The gloss is wrong ('that' for estigui = 'I am'), and the trigger is L05 'it doesn't seem to me that | no em sembla que', which comes AFTER L04 — growing L04 to contain it breaks introduce-the-small-piece-first (L13). The seed's English ('I don't feel as if') also does not match L05's.",
    rec: "Swap the order and grow: L04 = 'it doesn't seem to me that | no em sembla que' (today's L05), L05 = 'it doesn't seem to me that I'm | no em sembla que estigui' (7 by the gate). Or merge them. Your call which." },
  { id: 'S0128L02', known: 'you are (informal)', target: 'ets', seed: "You're like someone I used to know. | Ets com algú que coneixia.",
    why: "Growing to the seed's 'you're like someone | ets com algú' swallows L03 'like someone | com algú', which comes after. Also two phrases under it say 'ets a punt' / 'no ets a punt', which should be estàs a punt.",
    rec: "Grow L02 to 'you're like | ets com' (2 syllables) and fix the two a-punt phrases to estàs; or re-cut 128 as L02 'you're like someone | ets com algú' with L03 shrunk." },
  { id: 'S0129L02', known: 'you are (subjunctive)', target: 'estiguis', seed: "I'm so happy that you're doing so well. | Estic molt content que ho estiguis fent tan bé.",
    why: "In the seed estiguis only appears inside 'ho estiguis fent', which L03 (now 'happy that you're doing it') teaches with its trigger. A trigger-carrying L02 would have to be 'happy that you're | content que … estiguis' — not contiguous in the seed.",
    rec: "Making L02 not-new would darken its 8 phrases (P25). Options: L02 = 'I want you to be | vull que estiguis' — but 'vull' is not in seed 129 (L26). So: merge L02 into L03 and move L02's phrases ('vull que estiguis bé', 'que estiguis a punt') under L03 where they contain it, or delete them." },
];

// Second pass (Kai's B addendum): only these LEGOs (and their phrases) are written by ONLY_PASS2=1.
const PASS2 = ['S0083L02', 'S0084L01', 'S0106L06', 'S0109L01', 'S0111L01', 'S0125L01', 'S0135L01', 'S0136L03', 'S0232L01', 'S0246L01', 'S0129L01'];

module.exports = { PASS2, COURSE, LEGOS, PHRASES, COMPONENT_JSON_STRIPS, DELETES, HELD };
