// tools/course-optimization/deu-drill-separables-downstream-2026-09-21.data.cjs
//
// The rows job #511 adds to deu_for_eng, as data — so the test can hold the
// tool to Kai's ruling without a database: "practice joined and split versions
// a lot under the lego and in the legos after it (and throughout the course)"
// (Kai, 2026-09-21). Each entry names its HOST basket (an existing LEGO the
// phrase must contain), the verb it drills and the shape the reader must see.
//
// Distribution, and why: one row per host basket (two or three only where a
// late frame like "ich möchte" serves several verbs), hosts spaced 20–70 seeds
// apart from each verb's introduction to the end of the course, shapes
// alternating, frames varied (time adverb, modal, dass-clause, question, past
// tense, formal-plural "euch"). Split where German splits, joined where German
// joins — never split for variety. Vocabulary is whatever the learner has heard
// by the host seed; the gate, not this file, is the judge of that.

'use strict';

const COURSE = 'deu_for_eng';
const JOB = '#511';
const SURFACE = 'tools:deu-drill-separables-downstream-2026-09-21';

/** Kai's "a lot" and "throughout", as a floor the tool refuses to go under. */
const DRILL_FLOOR = Object.freeze({ eachShape: 3, distinctSeeds: 6 });

/** What landed today and must not be disturbed (jobs #497, #499, #502). */
const PROTECTED = Object.freeze({
  seeds: [83, 92, 618, 653, 667],
  legos: ['S0122L01', 'S0133L01', 'S0155L01', 'S0190L01', 'S0281L01', 'S0288L02', 'S0496L01', 'S0524L05', 'S0540L04'],
});

const PHRASES = [
  { seed: 149, legoIndex: 1, hostLego: "ich hoffe du", verb: "kennenlernen", shape: "split",
    known: "I hope you get to know my friend", target: "ich hoffe, du lernst meinen Freund kennen" },
  { seed: 163, legoIndex: 1, hostLego: "ich denke, dass", verb: "kennenlernen", shape: "joined",
    known: "I think that you want to get to know more people", target: "ich denke, dass du mehr Leute kennenlernen willst" },
  { seed: 214, legoIndex: 2, hostLego: "am Wochenende", verb: "kennenlernen", shape: "split",
    known: "you get to know people at the weekend", target: "man lernt am Wochenende Leute kennen" },
  { seed: 271, legoIndex: 1, hostLego: "möchtest du", verb: "kennenlernen", shape: "joined",
    known: "would you like to get to know my friend?", target: "möchtest du meinen Freund kennenlernen?" },
  { seed: 297, legoIndex: 2, hostLego: "viele Leute", verb: "kennenlernen", shape: "split",
    known: "you get to know many people at work", target: "man lernt bei der Arbeit viele Leute kennen" },
  { seed: 340, legoIndex: 1, hostLego: "ich bin mir sicher, dass", verb: "kennenlernen", shape: "joined",
    known: "I am sure that you want to get to know her", target: "ich bin mir sicher, dass du sie kennenlernen willst" },
  { seed: 411, legoIndex: 1, hostLego: "wir möchten", verb: "kennenlernen", shape: "joined",
    known: "we would like to get to know your friend", target: "wir möchten deine Freundin kennenlernen" },
  { seed: 465, legoIndex: 2, hostLego: "Nächstes Mal werde ich", verb: "kennenlernen", shape: "joined",
    known: "next time I will get to know everyone", target: "Nächstes Mal werde ich alle kennenlernen" },
  { seed: 568, legoIndex: 3, hostLego: "beim nächsten Mal", verb: "kennenlernen", shape: "split",
    known: "the next time you will get to know my friend", target: "beim nächsten Mal lernst du meinen Freund kennen" },
  { seed: 614, legoIndex: 3, hostLego: "deine Familie", verb: "kennenlernen", shape: "split",
    known: "I'll get to know your family tomorrow", target: "ich lerne morgen deine Familie kennen" },
  { seed: 312, legoIndex: 3, hostLego: "morgen Abend", verb: "fernsehen", shape: "split",
    known: "we're watching television tomorrow night", target: "wir sehen morgen Abend fern" },
  { seed: 316, legoIndex: 1, hostLego: "denkst du, dass", verb: "fernsehen", shape: "joined",
    known: "do you think that they like watching television?", target: "denkst du, dass sie gern fernsehen?" },
  { seed: 349, legoIndex: 2, hostLego: "am Freitagabend", verb: "fernsehen", shape: "split",
    known: "we like watching television on Friday night", target: "wir sehen am Freitagabend gern fern" },
  { seed: 411, legoIndex: 1, hostLego: "wir möchten", verb: "fernsehen", shape: "joined",
    known: "we would like to watch television tonight", target: "wir möchten heute Abend fernsehen" },
  { seed: 447, legoIndex: 1, hostLego: "nach dem Essen", verb: "fernsehen", shape: "split",
    known: "we watch television after the meal", target: "wir sehen nach dem Essen fern" },
  { seed: 562, legoIndex: 1, hostLego: "Ich will nur", verb: "fernsehen", shape: "joined",
    known: "I just want to stay at home and watch television", target: "Ich will nur zu Hause bleiben und fernsehen" },
  { seed: 588, legoIndex: 4, hostLego: "zu Hause", verb: "fernsehen", shape: "split",
    known: "the children are watching television at home", target: "die Kinder sehen zu Hause fern" },
  { seed: 631, legoIndex: 1, hostLego: "möchtest du", verb: "fernsehen", shape: "joined",
    known: "would you like to watch television tonight?", target: "möchtest du heute Abend fernsehen?" },
  { seed: 184, legoIndex: 2, hostLego: "im Büro", verb: "anfangen", shape: "split",
    known: "I'm starting in the office tomorrow", target: "ich fange morgen im Büro an" },
  { seed: 221, legoIndex: 3, hostLego: "und dann", verb: "anfangen", shape: "split",
    known: "we talk and then we start", target: "wir reden und dann fangen wir an" },
  { seed: 274, legoIndex: 1, hostLego: "in ein paar Tagen", verb: "anfangen", shape: "split",
    known: "I'm starting in a few days", target: "ich fange in ein paar Tagen an" },
  { seed: 316, legoIndex: 4, hostLego: "am Montag", verb: "anfangen", shape: "split",
    known: "we start on Monday", target: "wir fangen am Montag an" },
  { seed: 340, legoIndex: 1, hostLego: "ich bin mir sicher, dass", verb: "anfangen", shape: "joined",
    known: "I am sure that he is starting soon", target: "ich bin mir sicher, dass er bald anfängt" },
  { seed: 410, legoIndex: 2, hostLego: "immer noch", verb: "anfangen", shape: "joined",
    known: "she still hasn't started", target: "sie hat immer noch nicht angefangen" },
  { seed: 465, legoIndex: 2, hostLego: "Nächstes Mal werde ich", verb: "anfangen", shape: "joined",
    known: "next time I will start at home", target: "Nächstes Mal werde ich zu Hause anfangen" },
  { seed: 549, legoIndex: 2, hostLego: "muss", verb: "anfangen", shape: "joined",
    known: "I have to start to learn tonight", target: "ich muss heute Abend anfangen zu lernen" },
  { seed: 603, legoIndex: 2, hostLego: "zu der Zeit", verb: "anfangen", shape: "split",
    known: "at the time I was starting to learn German", target: "zu der Zeit fing ich an, Deutsch zu lernen" },
  { seed: 634, legoIndex: 1, hostLego: "ich möchte", verb: "anfangen", shape: "joined",
    known: "I'd like to start tomorrow morning", target: "ich möchte morgen früh anfangen" },
  { seed: 668, legoIndex: 1, hostLego: "ich hoffe", verb: "anfangen", shape: "split",
    known: "I hope you start soon", target: "ich hoffe, du fängst bald an" },
  { seed: 510, legoIndex: 2, hostLego: "einen sicheren Platz", verb: "vorhaben", shape: "split",
    known: "I'm planning to look for somewhere safe", target: "ich habe vor, einen sicheren Platz zu suchen" },
  { seed: 522, legoIndex: 1, hostLego: "lass uns", verb: "vorhaben", shape: "joined",
    known: "let's find out what he is planning", target: "lass uns herausfinden, was er vorhat" },
  { seed: 541, legoIndex: 4, hostLego: "eine gute Idee", verb: "vorhaben", shape: "joined",
    known: "it's a good idea to know what he is planning", target: "es ist eine gute Idee zu wissen, was er vorhat" },
  { seed: 562, legoIndex: 1, hostLego: "Ich will nur", verb: "vorhaben", shape: "joined",
    known: "I just want to know if he is planning to stay", target: "Ich will nur wissen, ob er vorhat zu bleiben" },
  { seed: 576, legoIndex: 1, hostLego: "warten", verb: "vorhaben", shape: "split",
    known: "I'm not planning to wait long", target: "ich habe nicht vor, lange zu warten" },
  { seed: 588, legoIndex: 4, hostLego: "zu Hause", verb: "vorhaben", shape: "split",
    known: "we are planning to stay at home", target: "wir haben vor, zu Hause zu bleiben" },
  { seed: 610, legoIndex: 2, hostLego: "suchen", verb: "vorhaben", shape: "split",
    known: "are you planning to look for work?", target: "hast du vor, Arbeit zu suchen?" },
  { seed: 634, legoIndex: 1, hostLego: "ich möchte", verb: "vorhaben", shape: "joined",
    known: "I'd like to know what he is planning today", target: "ich möchte wissen, was er heute vorhat" },
  { seed: 656, legoIndex: 2, hostLego: "mit euch allen", verb: "vorhaben", shape: "split",
    known: "I'm planning to speak with you all", target: "ich habe vor, mit euch allen zu sprechen" },
  { seed: 528, legoIndex: 5, hostLego: "wahrscheinlich", verb: "zurückrufen", shape: "split",
    known: "I'll probably call you back tomorrow", target: "ich rufe dich wahrscheinlich morgen zurück" },
  { seed: 537, legoIndex: 1, hostLego: "ich hatte", verb: "zurückrufen", shape: "joined",
    known: "I had no time, but I can call you back now", target: "ich hatte keine Zeit, aber ich kann dich jetzt zurückrufen" },
  { seed: 549, legoIndex: 2, hostLego: "muss", verb: "zurückrufen", shape: "joined",
    known: "I have to call her brother back", target: "ich muss ihren Bruder zurückrufen" },
  { seed: 562, legoIndex: 1, hostLego: "Ich will nur", verb: "zurückrufen", shape: "joined",
    known: "I just want to know when you can call me back", target: "Ich will nur wissen, wann du mich zurückrufen kannst" },
  { seed: 579, legoIndex: 1, hostLego: "oft", verb: "zurückrufen", shape: "split",
    known: "I often call her back", target: "ich rufe sie oft zurück" },
  { seed: 606, legoIndex: 4, hostLego: "weiß", verb: "zurückrufen", shape: "joined",
    known: "I know that I can call you back now", target: "ich weiß, dass ich dich jetzt zurückrufen kann" },
  { seed: 623, legoIndex: 3, hostLego: "Kaffee", verb: "zurückrufen", shape: "split",
    known: "I'll call you back after the coffee", target: "ich rufe dich nach dem Kaffee zurück" },
  { seed: 634, legoIndex: 1, hostLego: "ich möchte", verb: "zurückrufen", shape: "joined",
    known: "I'd like to call you back tomorrow morning", target: "ich möchte dich morgen früh zurückrufen" },
  { seed: 668, legoIndex: 1, hostLego: "ich hoffe", verb: "zurückrufen", shape: "joined",
    known: "I hope I can call you back tonight", target: "ich hoffe, ich kann dich heute Abend zurückrufen" },];

/** Per verb: how many split / joined rows, over which distinct seeds. */
function drillCoverage(rows) {
  const out = {};
  for (const r of rows) {
    const c = out[r.verb] || (out[r.verb] = { split: 0, joined: 0, seeds: [] });
    c[r.shape]++;
    if (!c.seeds.includes(r.seed)) c.seeds.push(r.seed);
  }
  for (const c of Object.values(out)) c.seeds.sort((a, b) => a - b);
  return out;
}

/**
 * The census the defect is measured by: for one verb, its split and joined
 * occurrences in rows AFTER its introduction seed. `rows` are {seed, target}
 * of any kind — seeds, LEGOs, phrases. Uses the ruling's own reader.
 */
function downstreamRecurrence(rows, lemma, introSeed, separableVerbsIn) {
  const out = { split: 0, joined: 0, seeds: [] };
  for (const r of rows) {
    if (r.seed <= introSeed) continue;
    for (const v of separableVerbsIn(r.target)) {
      if (v.lemma !== lemma) continue;
      out[v.realisation]++;
      if (!out.seeds.includes(r.seed)) out.seeds.push(r.seed);
    }
  }
  return out;
}

module.exports = { COURSE, JOB, SURFACE, DRILL_FLOOR, PROTECTED, PHRASES, drillCoverage, downstreamRecurrence };
