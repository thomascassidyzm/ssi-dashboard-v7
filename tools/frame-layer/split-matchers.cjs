/**
 * TARGET-SIDE MATCHERS for the pair's structural splits. Keyed by SPLIT ID.
 *
 * This file used to be `seed-splits.cjs` and was keyed "course:seed" — it told
 * the lab WHICH split a given seed had to cross. That was hardcoding a seed's
 * teaching job, and it got seed 600 wrong (see docs/frame-layer/frame-zut.md).
 * WHICH split applies to a seed is now DERIVED from the seed's own admission
 * diff by tools/frame-layer/derive-seed-job.cjs. All this file holds is the
 * machine-checkable regex per outcome — the one part that cannot be derived,
 * because it is a fact about Spanish morphology, not about the corpus.
 *
 * `target_re: null` means "this outcome has no reliable surface matcher". The
 * derivation reports such an outcome as NOT MACHINE-CHECKABLE rather than as
 * absent — a check that cannot see something must say so, not score it zero.
 *
 * SCOPED BY TARGET LANGUAGE, because these are facts about SPANISH morphology.
 * They were exported bare and applied to every course, which the grid exposes
 * immediately: run a French column and the Spanish matchers simply never fire,
 * so every French seed reports "no split in play" — absence dressed up as an
 * answer. Where a pair has no matchers the derivation now says the splits are
 * UNREADABLE here, which is the honest thing a check that cannot see says.
 *
 * Split ids and names track docs/frame-layer/spanish-structural-splits.json.
 */
const spa = {
  S1: { pattern: 'P1', name: 'want(X) to — subject switch', outcomes: [
    { form: 'querer + INFINITIVE',              target_re: '\\b(?:quiero|quieres|quiere|quieren|quer[íi]a|quer[íi]as|queremos)\\s+(?!que\\b)\\w+(?:ar|er|ir)\\b' },
    { form: 'querer que + PRESENT SUBJUNCTIVE', target_re: '\\b(?:quiero|quieres|quiere|quieren|quer[íi]a|quer[íi]as|queremos)\\s+que\\b' },
  ]},
  S2: { pattern: 'P11', name: 'hope — subject switch', outcomes: [
    { form: 'esperar + INFINITIVE',              target_re: '\\besper\\w*\\s+(?!que\\b)\\w+(?:ar|er|ir)\\b' },
    { form: 'esperar que + PRESENT SUBJUNCTIVE', target_re: '\\besper\\w*\\s+que\\b' },
  ]},
  S3: { pattern: 'P13', name: 'before / after — subject switch', outcomes: [
    { form: '(antes|después) de + INFINITIVE',   target_re: '\\b(?:antes|despu[ée]s)\\s+de\\s+(?!que\\b)\\w+' },
    { form: '(antes|después) de que + SUBJUNCTIVE', target_re: '\\b(?:antes|despu[ée]s)\\s+de\\s+que\\b' },
  ]},
  S4: { pattern: 'P9', name: 'think that — matrix negation', outcomes: [
    { form: 'pensar/creer que + INDICATIVE',       target_re: '(?<!\\bno\\s)\\b(?:pienso|piensas|creo|crees|cree)\\s+que\\b' },
    { form: 'no pensar/creer que + SUBJUNCTIVE',   target_re: '\\bno\\s+(?:pienso|piensas|creo|crees|cree)\\s+que\\b' },
  ]},
  S5: { pattern: 'P16', name: 'relative clause — specificity', outcomes: [
    { form: 'que + INDICATIVE (specific referent)', target_re: null },
    { form: 'que + SUBJUNCTIVE (non-specific)',     target_re: null },
  ]},
  S6: { pattern: 'P4', name: 'could → podía / pudo / podría', outcomes: [
    { form: 'podría (conditional / hypothetical)', target_re: '\\bpodr[íi]a' },
    { form: 'podía (imperfect / ongoing ability)', target_re: '\\bpod[íi]a' },
    { form: 'pudo/pude (preterite / single event)', target_re: '\\bpud(?:o|e|iste|imos|ieron)\\b' },
    { form: 'pueda (present subjunctive)',          target_re: '\\bpued[ao]s?\\b' },
  ]},
  S7: { pattern: 'P17', name: "the double-'d — 'd = would vs 'd = had", outcomes: [
    { form: 'habría + PARTICIPLE (main clause)',    target_re: '\\bhabr[íi]a\\b' },
    { form: 'hubiera(s) + PARTICIPLE (if-clause)',  target_re: '\\bhubiera' },
  ]},
  S8: { pattern: 'P31', name: 'like → dative inversion', outcomes: [
    { form: 'a [X] le gusta [theme]',   target_re: '\\b(?:me|te|le|nos|les)\\s+gust(?:a|an)\\b' },
    { form: 'me gustaría + INFINITIVE', target_re: '\\bgustar[íi]a\\b' },
  ]},
  S9: { pattern: 'P10', name: 'know → saber / conocer (lexical)', outcomes: [
    { form: 'saber (a fact)',    target_re: '\\b(?:s[ée]|sabes|sabe|sab[íi]a|saber|sepa)\\b' },
    { form: 'conocer (a person)', target_re: '\\bconoc\\w*\\b' },
  ]},
  S10: { pattern: 'P12', name: 'ask → preguntar / pedir (lexical)', outcomes: [
    { form: 'preguntar (a question)',  target_re: '\\bpregunt\\w*\\b' },
    { form: 'pedir (for something)',   target_re: '\\b(?:pedir|pido|pides|pide|ped[íi]|pidi\\w+)\\b' },
  ]},
  S11: { pattern: 'P16', name: "personal 'a'", outcomes: [
    { form: 'a + human direct object', target_re: null },
  ]},
  S12: { pattern: 'P18', name: 'it is → ser / estar', outcomes: [
    { form: 'ser (es/era/fue)',    target_re: '\\b(?:es|era|fue|ser)\\b' },
    { form: 'estar (está/estaba)', target_re: '\\b(?:est[áa]|estaba|estar|estuvo)\\b' },
  ]},
};

const BY_TARGET_LANGUAGE = { spa };

/** The split matchers for a course's TARGET language, or null if none exist. */
function splitsFor(course) {
  const m = /^([a-z]{2,3})_for_[a-z]{2,3}$/.exec(String(course || ''));
  return (m && BY_TARGET_LANGUAGE[m[1]]) || null;
}

module.exports = { spa, BY_TARGET_LANGUAGE, splitsFor };
