#!/usr/bin/env node
/*
 * Acceptance test for the French pack. Each case is a real fra_for_eng string
 * (or the shape of one) that the pack got WRONG at some point while it was
 * being calibrated on 2026-09-08. They are here so the mistake cannot come
 * back quietly: every one of them was a whole false-positive class in the
 * suspect list, not a single row.
 *
 *   node packs/fra.selftest.cjs
 */
const fra = require('./fra.cjs');
const { tokens } = require('../lib/text.cjs');

const CASES = [
  // --- the defect the sweep exists to find (a learner reported this row) ---
  ['je travaille sur quelque chose de difficile', [], 'present, against an English past'],

  // --- elision: the tokeniser does not split "j'ai", so this was invisible ---
  ["j'ai travaillé hier", ['PERF', 'PAST'], 'passé composé in the first person'],
  ["c'était bien", ['PAST'], 'imparfait behind an elided c-'],
  ["aujourd'hui je suis prêt", [], 'aujourd\'hui is not an elision'],
  ["quelqu'un a dit ça", ['PERF', 'PAST'], 'quelqu\'un is not an elision'],

  // --- inversion questions: the tokeniser strips the hyphen ---
  ['quand as-tu commencé ?', ['PERF', 'PAST'], 'inverted subject between aux and participle'],
  ['ton ami a-t-il dit ça ?', ['PERF', 'PAST'], 'the -t- of a-t-il'],
  ['es-tu allé là ?', ['PERF', 'PAST'], 'être perfect, inverted'],

  // --- être + participle-shaped word is usually an ADJECTIVE ---
  ['je suis fatigué', [], 'adjective, not a perfect'],
  ['je suis allé voir un film', ['PERF', 'PAST'], 'être-verb, so it IS a perfect'],
  ["il s'est battu", ['PERF', 'PAST'], 'reflexive perfect, pronoun elided onto the aux'],

  // --- futur proche answers an English future ---
  ['je vais vous aider', ['PROSP'], 'object pronoun between aller and the infinitive'],
  ['on va en parler la semaine prochaine', ['PROSP'], 'en between aller and the infinitive'],

  // --- conditional vs imparfait: both are -r + an imparfait ending ---
  ['ça me rendrait plus heureux', ['COND'], 'conditional of a stem ending -dr'],
  ['il montrait le livre', ['PAST'], 'imparfait of montrer is NOT a conditional'],
  ["nous n'espérions pas partir", ['PAST'], 'nous-imparfait of espérer is NOT a conditional'],
  ["j'aurais fait ça", ['COND', 'PERF', 'PAST'], 'conditionnel passé is also a past'],
  ["j'y aurais réfléchi", ['COND', 'PERF', 'PAST'], 'conditionnel passé with an -i participle'],

  // --- nouns that end like verbs ---
  ['des questions difficiles pour nous', [], '"questions" is not an imparfait'],
  ['mais je ne sais pas', [], '"mais" and "sais" are not imparfaits'],
  ['ils essaient de partir', [], 'present of essayer is not an imparfait'],
  ["j'ai une bonne idée", [], '"idée" is not a participle'],
  ['nous étions au pub', ['PAST'], '"au" is not a participle, but étions is a past'],

  // --- French says some English pasts with a present, correctly ---
  ['je travaille ici depuis deux ans', [], 'depuis + present = English perfect'],
  ['je viens de finir', [], 'venir de = English recent perfect'],
];

let bad = 0;
for (const [text, want, why] of CASES) {
  const got = [...fra.tenses(tokens(text))].sort();
  const w = [...want].sort();
  const ok = got.join(',') === w.join(',');
  if (!ok) { bad++; console.log(`FAIL  ${JSON.stringify(text)}\n      want [${w}] got [${got}]  — ${why}`); }
}
// The two present-tense idioms must additionally be declared ambiguous, or a
// correct row scores as a tense conflict.
for (const t of ['je travaille ici depuis deux ans', 'je viens de finir']) {
  if (!fra.ambiguousPast(tokens(t))) { bad++; console.log(`FAIL  ${JSON.stringify(t)} should be ambiguousPast`); }
}
console.log(bad ? `${bad} FAILED of ${CASES.length + 2}` : `all ${CASES.length + 2} pass`);
process.exit(bad ? 1 : 0);
