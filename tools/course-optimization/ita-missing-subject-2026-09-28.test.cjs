'use strict';
// node --test tools/course-optimization/ita-missing-subject-2026-09-28.test.cjs
// Pure-rule tests for the ita_for_eng missing-subject sweep (Kai's person-match ruling, job #573·I).
// No DB. The calibration rows are the OLD texts of S0599L01C01 and S0201L01 as content_edit_events
// recorded them before jobs #544 / #572 fixed them; the detector must flag both, and must NOT flag
// an imperative, an infinitive, or a row whose English already carries its subject.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-missing-subject-2026-09-28.cjs');

T.learnBaseVerbs(['I want to guess', 'to come here', 'to say it', 'to work', 'to think', 'to look for', 'to try', 'to know', 'to speak', 'to live']);
const v = (k, t) => T.classify(k, t);

test('calibration: the two rows Kai caught are flagged with the right person', () => {
  const a = v('would have been', 'sarebbe stato');
  assert.equal(a.verdict, 'flag'); assert.equal(a.it.person, '3s'); assert.equal(a.pronoun, null); // he/she/it: context decides
  const b = v('wanted', 'volevamo');
  assert.equal(b.verdict, 'flag'); assert.equal(b.pronoun, 'we');
});

test('fixed text is clean: subject present on the English side', () => {
  assert.equal(v('I would have been', 'sarei stato').verdict, 'ok:eng-subject');
  assert.equal(v('we wanted', 'volevamo').verdict, 'ok:eng-subject');
  assert.equal(v('that would be great', 'sarebbe fantastico').verdict, 'ok:eng-subject');
  assert.equal(v('nothing seems to work', 'niente sembra funzionare').verdict, 'ok:eng-subject');
});

test('exclusions: imperative, infinitive, gerund/participle, inverted question, Italian with its own subject', () => {
  assert.ok(!v('come here', 'vieni qui').verdict.startsWith('flag'), 'imperative');
  assert.ok(!v('guess who told me', 'indovina chi mi ha raccontato').verdict.startsWith('flag'), 'imperative -are');
  assert.equal(v('to say it', 'dirlo').verdict, 'ok:eng-other');
  assert.equal(v('said', 'detto').verdict, 'ok:ita-nonfinite');
  assert.ok(v('boiled eggs', 'uova sode').verdict.startsWith('ok:'), 'adjective, not a verb');
  assert.equal(v('could you say it?', 'potresti dirlo?').verdict, 'ok:eng-question');
  assert.equal(v('was saying she', 'stava dicendo lei').verdict, 'ok:ita-subject');
  assert.equal(v('lives', 'vive').verdict, 'flag?', 'vive is an -e form the ending rule cannot pin down: unsure, listed not edited');
});

test('person from the Italian: sono decided by what follows; piace by its dative clitic; subjunctive listed', () => {
  assert.deepEqual([v('went out', 'sono uscito').verdict, v('went out', 'sono uscito').pronoun], ['flag', 'I']);
  assert.deepEqual([v('are ready', 'sono pronti').verdict, v('are ready', 'sono pronti').pronoun], ['flag', 'they']);
  assert.deepEqual([v("don't mind", 'non mi dispiace').verdict, v("don't mind", 'non mi dispiace').pronoun], ['flag', 'I']);
  assert.equal(v('told us', 'ci hanno detto').pronoun, 'they');
  assert.equal(v('needed to', 'dovevi').pronoun, 'you');
  assert.equal(v('think that', 'pensano che').pronoun, 'they', 'bare verb + 3rd plural has no imperative reading');
  assert.equal(v('could', 'potesse').verdict, 'borderline:subjunctive');
  assert.equal(v("wouldn't have said it", "non l'avrei detto").pronoun, 'I', "l' is split off before the verb is read");
});

test('decide: 3rd singular takes the pronoun its own phrases use; a noun-subject seed goes to Kai; components follow only when they tile', () => {
  const rows = [
    { kind: 'seed', sn: 227, id: 'S0227', known: 'that man is going to tell me something new', target: "quell'uomo mi dirà qualcosa di nuovo" },
    { kind: 'lego', sn: 227, id: 'S0227L02', known: 'will tell me', target: 'mi dirà', components: null },
    { kind: 'build', sn: 227, id: 'S0227L02B01', known: 'will tell me', target: 'mi dirà' },
    { kind: 'build', sn: 227, id: 'S0227L02B02', known: 'he will tell me tomorrow', target: 'mi dirà domani' },
    { kind: 'use', sn: 227, id: 'S0227L02U03', known: 'I think he will tell me', target: 'penso che mi dirà' },
    { kind: 'seed', sn: 462, id: 'S0462', known: 'my grandfather fought in Italy during the war', target: 'mio nonno ha combattuto in Italia durante la guerra' },
    { kind: 'lego', sn: 462, id: 'S0462L03', known: 'fought in Italy', target: 'ha combattuto in Italia', components: [{ known: 'fought', target: 'ha combattuto' }, { known: 'in Italy', target: 'in Italia' }] },
    { kind: 'build', sn: 462, id: 'S0462L03B01', known: 'fought in Italy', target: 'ha combattuto in Italia' },
    { kind: 'component', sn: 462, id: 'S0462L03C01', known: 'fought', target: 'ha combattuto' },
    { kind: 'seed', sn: 218, id: 'S0218', known: "I didn't do much on Sunday", target: 'non ho fatto molto domenica' },
    { kind: 'lego', sn: 218, id: 'S0218L01', known: "didn't do much", target: 'non ho fatto molto', components: [{ known: "didn't do", target: 'non ho fatto' }, { known: 'much', target: 'molto' }] },
    { kind: 'build', sn: 218, id: 'S0218L01B01', known: "didn't do much", target: 'non ho fatto molto' },
    { kind: 'component', sn: 218, id: 'S0218L01C01', known: "didn't do", target: 'non ho fatto' },
    { kind: 'component', sn: 218, id: 'S0218L01C02', known: 'much', target: 'molto' },
    { kind: 'seed', sn: 201, id: 'S0201', known: 'we wanted to know what was going to happen', target: 'volevamo sapere che cosa sarebbe successo' },
    { kind: 'lego', sn: 201, id: 'S0201L01', known: 'wanted', target: 'volevamo', components: null },
  ];
  T.learnBaseVerbs(rows.map((r) => r.known));
  const D = T.decide(rows);
  const by = (id) => D.changes.find((c) => c.id === id);
  assert.equal(by('S0227L02').to, 'he will tell me');
  assert.equal(by('S0227L02B01').to, 'he will tell me');
  assert.ok(!by('S0462L03') && D.kai.some((k) => k.id === 'S0462L03' && /noun phrase/.test(k.why)), 'noun-subject seed: listed for Kai, not edited');
  assert.ok(!by('S0462L03C01') && !by('S0462L03B01'), 'its fragment and component follow it to the list');
  assert.equal(by('S0218L01').to, "I didn't do much");
  assert.equal(by('S0218L01C01').to, "I didn't do", 'components tile the LEGO, so the head component follows');
  assert.ok(!D.changes.some((c) => c.id === 'S0218L01C02'));
  assert.ok(!by('S0201L01') && D.skipped.some((s) => s.id === 'S0201L01'), 'seed 201 is held for job #572');
  assert.equal(D.coverage.scanned, rows.length);
});

test('a phrase that already carries a different subject is a containment exception, never edited', () => {
  const rows = [
    { kind: 'seed', sn: 354, id: 'S0354', known: "he didn't need to appear angry", target: 'non aveva bisogno di sembrare arrabbiato' },
    { kind: 'lego', sn: 354, id: 'S0354L01', known: "didn't need to", target: 'non aveva bisogno di', components: null },
    { kind: 'build', sn: 354, id: 'S0354L01B02', known: "he didn't need to go out", target: 'non aveva bisogno di uscire' },
    { kind: 'build', sn: 354, id: 'S0354L01B03', known: "he didn't need to run", target: 'non aveva bisogno di correre' },
    { kind: 'use', sn: 354, id: 'S0354L01U03', known: "she didn't need to sell the company", target: "non aveva bisogno di vendere l'azienda" },
  ];
  T.learnBaseVerbs(rows.map((r) => r.known));
  const D = T.decide(rows);
  assert.equal(D.changes.find((c) => c.id === 'S0354L01').to, "he didn't need to");
  assert.ok(!D.changes.some((c) => c.id === 'S0354L01U03'));
  assert.ok(D.exceptions.some((e) => e.id === 'S0354L01U03'));
});
