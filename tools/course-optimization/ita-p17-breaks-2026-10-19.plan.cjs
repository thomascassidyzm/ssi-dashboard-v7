'use strict';
// ita_for_eng P17 decisions (job #282, 19 Oct 2026) — every census candidate that is a BREAK under canon K49–K51, read in full
// with its LEGO and seed, and what is done with it. Breaks in a basket that stays healthy (≥ 2 USE, the LEGO still practised)
// are DELETED (phrases may go; no audio); a basket left thin is REWRITTEN from words taught by that seed; a row that practises
// another NEW LEGO's words exactly is REHOMED there with its clips (P25). Rows whose fix is a LEGO or seed question are HELD for
// Kai (published list). K49 additions: a LEGO with ONE split/reordered row gets one more split row, so the pattern is practised
// twice beside its plain uses; single K31 adverbs (non / ancora / già / solo) are the course-wide K31 pattern and are not counted.
// Not breaks, nothing written (L28: infinitive + attached clitic is the same form): S0091L01U06 pensarci, S0213L03B03/U02/U05
// ottenerlo, S0325L04U02 considerarlo, S0528L02U02 tenerlo. 55 split/reordered rows are K49 (allowed).
const D = (id, why) => ({ id, do: 'delete', why });
const U = (id, known, target, why) => ({ id, do: 'update', known, target, why });
const I = (id, role, known, target, why) => ({ id, do: 'insert', role, known, target, why });
const H = (id, q) => ({ id, do: 'hold', why: q });
const R = (id, to, why) => ({ id, do: 'rehome', to, why });

const K50 = 'K50: another form of the LEGO verb';
const K51 = 'K51: reflexive ending changed';
const MISS = 'P17: the phrase does not say the LEGO';
const K49 = 'K49: second split/reordered use of the LEGO';

const Q_SHRINK = 'LEGO swallows the next LEGO\'s words';
const Q_SIR = 'LEGO carries sir/madam where seeds 643 and 649 do not';
const Q_600 = 'seed 600 sentence differs from its LEGO';

module.exports = [
  // seed 65: prendermi (K51)
  U('S0065L02U02', "it's important to take time to answer", 'è importante prendersi il tempo per rispondere', K51),
  D('S0065L02U03', K51),
  D('S0083L01U03', K50 + ' (sono → essere)'),
  ...['B02', 'B03', 'U01', 'U02', 'U03', 'U05', 'U06', 'U07', 'U08'].map((s) => H(`S0098L03${s}`, Q_SHRINK)),
  D('S0099L03U01', K50 + ' (funziona → funzioni)'),
  D('S0106L02U05', K50 + ' (felici → felice)'),
  D('S0128L02U05', K50 + ' (sei → tu sia)'),
  D('S0130L02U03', K50 + ' (è → sia)'),
  D('S0136L02U08', MISS + ' (chiederlo a lei → chiederle)'),
  D('S0136L03U03', K50 + ' (è → sia)'), D('S0136L03U07', K50 + ' (è → sia)'), D('S0136L03U08', K50 + ' (è → sia)'),
  D('S0149L01U10', MISS + ' (no spero)'),
  D('S0168L02U02', K50 + ' (potrò → poter)'), D('S0168L02U07', K50 + ' (potrò → poter)'),
  D('S0200L03B03', K51),
  D('S0207L01U08', K50 + ' (hai fatto → abbia fatto)'),
  D('S0219L02B03', K51),
  ...['B01', 'B02', 'B03', 'B04', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08'].map((s) => H(`S0243L02${s}`, Q_SHRINK)),
  D('S0267L01U04', K50 + ' (hai → abbia)'),
  D('S0268L01U04', K50 + ' (ha → abbia)'), D('S0268L01U08', K50 + ' (ha → abbia)'),
  D('S0270L02U01', K50 + ' (arriverò → arrivare)'), D('S0270L02U05', K50 + ' (arriverò → arrivare)'),
  D('S0270L03U04', 'knock-on of the same K50 pattern: arrivare is untaught at seed 270 (P1)'),
  D('S0288L01U03', MISS + ' (alla → per la)'),
  ...['B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06'].map((s) => H(`S0308L01${s}`, Q_SHRINK)),
  D('S0310L02U05', MISS + ' (su → di)'),
  D('S0324L02U05', K50 + ' (ha → abbia)'),
  D('S0343L01B01', MISS + ' (build is part of the LEGO)'),
  D('S0362L02U04', K50 + ' (silenzioso → silenziosa)'),
  D('S0374L02B01', MISS + ' (build is part of the LEGO)'),
  ...['B02', 'B03', 'U02', 'U03', 'U04', 'U05'].map((s) => D(`S0385L01${s}`, MISS + ' (no "con lei")')),
  U('S0387L02B02', "I didn't think she was right about that", 'non pensavo che avesse ragione su quello', MISS),
  D('S0387L02B03', MISS),
  D('S0387L02U01', MISS),
  U('S0387L02U03', "I didn't think she was right about this", 'non pensavo che avesse ragione su questo', MISS),
  U('S0387L02U04', "I told you I didn't think she was right", 'ti ho detto che non pensavo che avesse ragione', MISS),
  D('S0387L02U05', MISS),
  D('S0406L01U05', K50 + ' (andrà → vada)'),
  D('S0425L01U01', K51 + ' (not-new LEGO, never played)'),
  D('S0433L03B03', MISS + ' (no quando)'),
  D('S0483L02U05', K50 + ' (è → sia; English does not read)'),
  D('S0502L03U03', MISS + ' (right/left swapped)'),
  D('S0506L03U04', K50 + ' (vivevo → viveva)'),
  D('S0508L01B02', K50 + ' (pagherai → paghi)'),
  D('S0539L02B01', MISS), D('S0539L02U04', MISS), D('S0539L02U05', MISS),
  D('S0572L02U05', MISS + ' (che cosa → tutto quello che)'),
  U('S0584L02B01', 'to wake up every morning', 'svegliarsi ogni mattina', MISS),
  U('S0584L02B03', 'to wake up every morning and see the mountains', 'svegliarsi ogni mattina e vedere le montagne', MISS),
  U('S0584L02U02', "it's lovely to wake up every morning", 'è bellissimo svegliarsi ogni mattina', MISS),
  U('S0584L02U03', "what's it like to wake up every morning in this part of the world?", "com'è svegliarsi ogni mattina in questa parte del mondo?", MISS),
  D('S0598L03U05', K50 + ' (ha → abbia)'),
  H('S0600L03U01', Q_600),
  D('S0601L01B01', MISS + ' (build is part of the LEGO)'),
  U('S0615L02B03', 'I thought you were brave', 'pensavo che fossi coraggioso', MISS),
  U('S0615L02U02', 'I thought you were ready', 'pensavo che fossi pronto', MISS),
  U('S0615L02U03', 'I thought you were very tired', 'pensavo che fossi molto stanco', MISS),
  U('S0615L02U04', 'I really thought you were ready', 'pensavo davvero che fossi pronto', MISS + '; K49 second split row'),
  D('S0615L02U05', MISS),
  U('S0617L02B02', 'you thought it was easy', 'pensavi che fosse facile', MISS),
  U('S0617L02B03', 'you thought it was difficult', 'pensavi che fosse difficile', MISS),
  D('S0617L02U02', MISS + ' (pensavi → pensavo; S0374L01 cannot take it: errore is untaught at seed 374)'),
  U('S0617L02U03', 'you thought it was a big mistake', 'pensavi che fosse un grande errore', MISS),
  U('S0617L02U04', 'I know you thought it was a mistake', 'so che pensavi che fosse un errore', MISS),
  D('S0617L02U05', MISS),
  D('S0640L02U04', K50 + ' (è → sia)'),
  ...['B01', 'B02', 'B03', 'U02', 'U03', 'U05', 'U06'].map((s) => H(`S0644L01${s}`, Q_SIR)),
  ...['B01', 'B02', 'B03', 'U02', 'U03', 'U04', 'U05', 'U06'].map((s) => H(`S0645L01${s}`, Q_SIR)),
  ...['B01', 'B02', 'B03', 'U02', 'U03', 'U04', 'U05', 'U06'].map((s) => H(`S0646L01${s}`, Q_SIR)),
  ...['B02', 'B03', 'U05'].map((s) => H(`S0647L01${s}`, Q_SIR)),
  U('S0647L01U04', 'you speak it well madam', 'lei lo parla bene, signora', 'signore under a LEGO that says signora (Astra #262·T)'),
  ...['B01', 'B02', 'B03', 'U03'].map((s) => H(`S0648L01${s}`, Q_SIR)),

  // K49: LEGOs with one split/reordered row get a second
  I('S0393L02', 'use', 'the man with the black hair and the green shirt', "l'uomo con i capelli neri e la camicia verde", K49),
  I('S0436L01', 'use', 'there is already a minimum number', "c'è già un numero minimo", K49),
  I('S0441L01', 'use', "I think it's a good approach", 'penso che sia un buon approccio', K49),
  I('S0442L02', 'use', 'a new and different approach', 'un approccio nuovo e diverso', K49),
  I('S0464L02', 'use', "I saw her here once but she didn't see me", "l'ho vista una volta qui, ma lei non mi ha visto", K49),
  I('S0468L03', 'use', "it's such a big world", 'è un mondo così grande', K49),
  I('S0480L03', 'use', "it's not very far from here", 'non è molto lontano da qui', K49),
  I('S0484L02', 'use', "it's a real challenge", 'è una vera sfida', K49),
  I('S0507L02', 'use', 'we have already moved', 'ci siamo già trasferiti', K49),
  I('S0531L03', 'use', 'I want to win the last game', "voglio vincere l'ultima partita", K49),
  I('S0539L02', 'use', "it's getting really late", 'si sta facendo davvero tardi', K49),
  I('S0605L01', 'use', 'we really needed help', 'avevamo davvero bisogno di aiuto', K49),
  I('S0632L02', 'use', 'another glass of water', "un altro bicchiere d'acqua", K49),
  I('S0634L02', 'use', "I'd only like one of those", 'ne vorrei solo uno di quelli', K49),
  I('S0636L02', 'use', 'I really think that that is my bag', 'penso davvero che quella sia la mia borsa', K49),
  I('S0590L02', 'use', 'I saw everyone leaving', 'ho visto partire tutti', 'K49: a second plain use beside seven split ones'),
];
module.exports.QUESTIONS = { Q_SHRINK, Q_SIR, Q_600 };
