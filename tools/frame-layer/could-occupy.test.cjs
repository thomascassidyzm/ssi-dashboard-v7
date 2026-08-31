#!/usr/bin/env node
/** Could-occupy tagging — cheap self-test. No DB, no network, one process. */
const { CLASSES, tag, tagCorpus, isSpecific, GENERIC } = require('./could-occupy.cjs');
const mg = require('../../services/shared/metagraph/index.cjs');

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('FAIL ' + m); } };
const cls = (t) => tag(t).classes;
const at = (t, pos) => tag(t).could_occupy.some(c => `${c.shape}#${c.position}` === pos);

// --- THE CONSTRAINT: a tag is a could-occupy, never an attestation ---------
// Enforced in the schema: every tagged position carries the class that inferred
// it (`via`), and nothing anywhere carries an attestation count. If a field
// named `attests` ever appears here, this test is the place it gets caught.
{
  const t = tag('I want to speak Spanish with you now');
  ok(t.could_occupy.every(c => 'via' in c), 'every could_occupy entry must name the class that inferred it');
  ok(!('attests' in t) && !('attested' in t), 'a seed tag must never claim attestation');
}

// --- every position a class points at must EXIST in the shape store --------
{
  const store = mg.load();
  const real = new Set();
  for (const n of store.nodes) for (const p of n.positions || []) real.add(`${n.id}#${p.index}`);
  for (const c of CLASSES) for (const p of c.positions) {
    ok(real.has(p), `${c.id} points at ${p}, which is not a position in the shape store`);
  }
  ok(CLASSES.every(c => /^C\d+$/.test(c.id)), 'class ids are C-numbers');
  ok(new Set(CLASSES.map(c => c.id)).size === CLASSES.length, 'class ids are unique');
}

// --- the classes fire where they should, and not where they should not -----
ok(cls('I don\'t know how to say that').includes('C18'), 'not-knowing');
ok(cls('Could you say that again a little more slowly?').includes('C5'), 'repair initiation');
ok(cls('Shall we meet at eight?').includes('C10'), 'proposal');
ok(cls('You should ask yourself why it\'s not working').includes('C12'), 'instruction');
ok(cls('Can I ask you something before you leave?').includes('C2'), 'permission question');
ok(cls('Is there a bank near here?').includes('C1'), 'availability question');
ok(cls('Do you speak Spanish all day?').includes('C24'), 'a polar question must be tagged, not dropped');
ok(cls('Why are you learning her name?').includes('C4'), 'wh-question');

// the four false positives the probe caught, each now refused
ok(!cls('I started to think about it carefully last month').includes('C7'),
   '"about" as a bare preposition is not a hedge');
ok(cls('I\'ve been learning for about a week').includes('C7'),
   '"about a week" IS a hedge — the fix must not kill the real ones');
ok(!cls('I\'m going to try to explain what I mean').includes('C12'),
   'a first-person intention is not an instruction to the other');
ok(!cls('She was very kind when she saw me feeling nervous').includes('C17'),
   'somebody else\'s feeling is not a trouble declaration');
ok(!cls('No nobody told me').includes('C19'),
   'a negative-polarity pronoun in a plain report is not a generalisation');

// --- generic classes are marked, and cannot be mistaken for coverage -------
{
  ok(GENERIC.has('C6') && GENERIC.has('C0'), 'the two generic classes are marked generic');
  ok(!isSpecific(tag('It\'s on the other side of that yellow line')),
     'a plain declarative with nothing else is generic-only, not coverage');
  ok(isSpecific(tag('I\'m not sure if I can remember the whole sentence')),
     'a hedge is a specific tag');
  ok(cls('Woman.').length === 0, 'a one-word fragment is untagged, not guessed');
}

// --- the pool is indexed by position and keyed by text ---------------------
{
  const { byPosition } = tagCorpus([
    { key: 'i dont know', known_text: "I don't know", course_count: 40, seed_numbers: [12] },
    { key: 'shall we meet', known_text: 'Shall we meet at eight?', course_count: 3, seed_numbers: [400] },
  ]);
  ok(byPosition.has('N13#2'), 'the not-knowing position gets its filler');
  ok(byPosition.get('N13#2')[0].known_text === "I don't know", 'the filler carries its text');
  ok(byPosition.get('N13#2')[0].seed_numbers.join() === '12',
     'the filler carries the seed numbers it is known by — a course inherits by text, and needs both');
  ok(!byPosition.has('N5#2'),
     'N5#2 "A+return" must stay empty: no seed carries return material, and filling it with plain answers is the frame error this design exists to prevent');
}

console.log(fail ? `${fail} failing assertion(s)` : `ok — ${CLASSES.length} position classes, every target position exists in the shape store, and a tag is a could-occupy in the schema as well as in the prose`);
process.exit(fail ? 1 : 0);
