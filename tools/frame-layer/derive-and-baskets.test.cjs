#!/usr/bin/env node
/**
 * Self-test for the two mechanisms added on 2026-08-29: the admission-diff
 * derivation, and per-LEGO-basket scoping of the floors.
 * No DB, no network, single process — the corpus is a handful of literals.
 */
const { deriveJob, splitsForBasket } = require('./derive-seed-job.cjs');
const { scoreBaskets, score } = require('./pattern-diversity.cjs');
let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log('FAIL ' + msg); } };

// ---- the derivation ------------------------------------------------------
const S = (known_text, target_text, seed_number) => ({ known_text, target_text, seed_number });

// (a) NEW FRAME: nothing before it has ever asked a question
{
  const job = deriveJob({
    seedRow: S('do you want to speak Spanish?', '¿quieres hablar español?'),
    ownLegos: [{ lego_index: 1, known_text: 'do you want', target_text: 'quieres' }],
    priorSeeds: [S('I want to speak Spanish', 'quiero hablar español', 1)],
  });
  ok(job.verdict === 'NEW FRAME', `a first question should be NEW FRAME, got ${job.verdict}`);
  ok(job.new_frames.some(f => f.id === 'P20'), 'the new frame should include P20 question');
}

// (b) NEW SIDE: the frame is old, but this is the first time the split's other
//     outcome has ever appeared. This is the case the seed-keyed table could not
//     express and the one most easily missed.
{
  const job = deriveJob({
    seedRow: S('I want you to speak Spanish with me', 'quiero que hables español conmigo'),
    ownLegos: [{ lego_index: 1, known_text: 'I want you to', target_text: 'quiero que' }],
    priorSeeds: [S('I want to speak Spanish', 'quiero hablar español', 1)],
  });
  ok(job.verdict === 'NEW SIDE', `the subject-switch side should be NEW SIDE, got ${job.verdict}`);
  ok(job.new_sides.some(s => s.split_id === 'S1'), 'the new side should be S1');
  ok(job.new_sides[0].lego_indexes.includes(1), 'the new side must be attributed to the lego that carries it');
}

// (c) LEXICAL ONLY: every frame and every side already seen. This is the answer
//     for seed 600 ("driven"/"conducido") — the reason its hardcoded split
//     criterion was withdrawn — and, as it turns out, for 599 too, because both
//     sides of the double-'d were already admitted at seed 152.
{
  const prior = [
    S('I would have done it differently if I had known what you wanted',
      'lo habría hecho de manera diferente si hubiera sabido lo que querías', 152),
    // 600's known side also uses told (P12) and a perfect (P29); a corpus this
    // small has to carry them or the diff correctly reports them as new.
    S('she told me she has driven that car', 'me dijo que ha conducido ese coche', 153),
  ];
  const j600 = deriveJob({
    seedRow: S("I'd have driven if you'd told me how tired you were",
               'habría conducido si me hubieras dicho lo cansado que estabas'),
    ownLegos: [{ lego_index: 1, known_text: 'driven', target_text: 'conducido' }],
    priorSeeds: prior,
  });
  ok(j600.verdict === 'LEXICAL ONLY', `seed 600's job is lexical, got ${j600.verdict}`);
  ok(j600.new_sides.length === 0, 'seed 600 admits no new side of the double-\'d');
  ok(splitsForBasket(j600, 1).length === 0,
     "600's basket must not be tested against a split it does not admit");
}

// (d) NOTHING STRUCTURAL: no legos, no new frames, no new sides
{
  const job = deriveJob({
    seedRow: S('I want to speak Spanish', 'quiero hablar español'),
    ownLegos: [],
    priorSeeds: [S('I want to speak Spanish now', 'quiero hablar español ahora', 1)],
  });
  ok(job.verdict === 'NOTHING STRUCTURAL', `got ${job.verdict}`);
}

// ---- per-basket scoping --------------------------------------------------
// THE POINT OF THE WHOLE CHANGE: three healthy baskets must not carry a thin
// fourth through an average.
{
  const legos = [1, 2].map(i => ({ lego_index: i, known_text: i === 1 ? 'driven' : 'happy', target_text: i === 1 ? 'conducido' : 'contento' }));
  const varied = [
    ['build', 'driven', 'conducido'],
    ['use', "I'd have driven if you'd told me", 'habría conducido si me lo hubieras dicho'],
    ['use', 'would you have driven that far?', '¿habrías conducido tan lejos?'],
    ['use', 'nobody has driven this car', 'nadie ha conducido este coche'],
    ['use', 'she said she had driven home', 'dijo que había conducido a casa'],
  ].map(([phrase_role, known_text, target_text], i) => ({ phrase_role, known_text, target_text, lego_index: 1, position: i + 1 }));
  const stamped = Array.from({ length: 5 }, (_, i) => ({
    phrase_role: 'use', lego_index: 2, position: i + 1,
    known_text: `I'd have been happy ${['here', 'there', 'today', 'anyway', 'too'][i]}`,
    target_text: `habría estado contento ${['aquí', 'allí', 'hoy', 'igualmente', 'también'][i]}`,
  }));
  const r = scoreBaskets([...varied, ...stamped], { legos });
  ok(r.baskets.length === 2, 'one basket per lego');
  ok(r.baskets[0].score.pass, 'the varied basket should pass');
  ok(!r.baskets[1].score.pass, 'the stamped basket should fail');
  ok(r.seed_pass === false, 'a seed passes only if EVERY basket passes');
  // and the thing that would have hidden it:
  const asOneSeed = score([...varied, ...stamped], { lego: 'driven' });
  ok(r.seed_composite > 0 && asOneSeed, 'seed composite is computed but is context only');
  ok(r.failing_baskets.length === 1 && r.failing_baskets[0].lego_index === 2,
     'the failing basket must be named, not averaged away');
}

// components are tiling glosses, not practice: excluded from every axis
{
  const legos = [{ lego_index: 1, known_text: 'been happy', target_text: 'estado contento' }];
  const rows = [
    { phrase_role: 'component', known_text: 'been', target_text: 'estado', lego_index: 1, position: 1 },
    { phrase_role: 'component', known_text: 'happy', target_text: 'contento', lego_index: 1, position: 2 },
    { phrase_role: 'use', known_text: "I'd have been happy to go", target_text: 'habría estado contento de ir', lego_index: 1, position: 3 },
    { phrase_role: 'use', known_text: 'been happy is how I felt', target_text: 'estado contento es como me sentí', lego_index: 1, position: 4 },
  ];
  const b = scoreBaskets(rows, { legos }).baskets[0];
  ok(b.score.phrase_count === 2, `components must not be scored as practice, got ${b.score.phrase_count}`);
  ok(b.score.components_excluded === 2, 'components are reported, not silently dropped');
  ok(b.score.axes.pos <= 1, `POS cannot exceed 1.0 — "absent" is not a position (got ${b.score.axes.pos})`);
}

// an unattributed row informs but never gates
{
  const legos = [{ lego_index: 1, known_text: 'driven', target_text: 'conducido' }];
  const rows = [
    ...Array.from({ length: 4 }, (_, i) => ({ phrase_role: 'use', lego_index: 1, position: i + 1,
      known_text: ["I'd have driven there", 'has she driven before?', 'nobody had driven it', 'driven home at last'][i],
      target_text: ['x', 'y', 'z', 'w'][i] })),
    { phrase_role: 'use', lego_index: 9, position: 1, known_text: 'orphan row', target_text: 'huérfano' },
  ];
  const r = scoreBaskets(rows, { legos });
  ok(r.unattributed && r.unattributed.phrases.length === 1, 'the orphan is surfaced');
  ok(r.baskets.length === 1, 'the orphan does not invent a basket');
  ok(r.seed_pass === r.baskets[0].score.pass, 'the orphan must not gate the seed');
}

// lab-side phrase ids
{
  const legos = [{ lego_index: 3, known_text: 'to drive', target_text: 'conducir' }];
  const rows = [
    { phrase_role: 'use', lego_index: 3, position: 2, known_text: 'b', target_text: 'b', id: 'spa_for_eng:S0599L03U02' },
    { phrase_role: 'build', lego_index: 3, position: 1, known_text: 'a', target_text: 'a' },
  ];
  const b = scoreBaskets(rows, { legos }).baskets[0];
  ok(b.phrases[0].lab_id === 'L03-1', `build sorts first and gets L03-1, got ${b.phrases[0].lab_id}`);
  ok(b.phrases[1].lab_id === 'L03-2', `got ${b.phrases[1].lab_id}`);
  ok(b.phrases[1].db_id === 'spa_for_eng:S0599L03U02', 'the real deterministic id is passed through for display');
}

// ---- ATOMISATION: promotion, not new material ----------------------------
{
  const { findAtomisations } = require('./derive-seed-job.cjs');
  const priorLegos = [{ seed_number: 152, lego_index: 1, known_text: 'I would have done it', target_text: 'lo habría hecho' }];
  const priorComponents = [{ seed_number: 152, lego_index: 3, known_text: 'I had known', target_text: 'Hubiera sabido' }];
  const a = findAtomisations({
    ownLegos: [
      { lego_index: 1, known_text: 'I would have', target_text: 'habría' },     // bundled inside an M-LEGO
      { lego_index: 4, known_text: "you'd told", target_text: 'hubieras' },     // never seen at all: NOT a promotion
      { lego_index: 5, known_text: 'I had known', target_text: 'hubiera sabido' }, // was a component: promotion
    ], priorLegos, priorComponents });
  ok(a.length === 2, `habría and hubiera sabido are promotions, hubieras is new material, got ${a.length}`);
  ok(a[0].how === 'bundled' && a[0].from_seed === 152, 'habría is evidenced against the M-LEGO that carried it');
  ok(a.some(x => x.target_text === 'hubiera sabido' && x.how === 'component'),
     'a form that was only ever a component is promoted when it becomes a LEGO');
  ok(!a.some(x => x.target_text === 'hubieras'),
     'a form with no earlier appearance is new material, not a promotion — the derivation must not flatter itself');

  // a form that was ALREADY a lego of its own is not a promotion either
  ok(findAtomisations({ ownLegos: [{ lego_index: 1, known_text: 'x', target_text: 'habría' }],
                        priorLegos: [{ seed_number: 9, target_text: 'habría' }], priorComponents: [] }).length === 0,
     're-admitting an existing LEGO is not an atomisation');

  // ...and it ranks below NEW FRAME / NEW SIDE, above LEXICAL ONLY
  const job = deriveJob({
    seedRow: S('I would have driven', 'habría conducido'),
    ownLegos: [{ lego_index: 1, known_text: 'I would have', target_text: 'habría' }],
    priorSeeds: [S('I would have done it differently', 'lo habría hecho de manera diferente', 152)],
    priorLegos, priorComponents,
  });
  ok(job.verdict === 'ATOMISATION', `promotion outranks LEXICAL ONLY, got ${job.verdict}`);
  ok(/STATUS/.test(job.sentence), 'the sentence says what is new is status, not material');
}

// ---- the per-LEGO availability window ------------------------------------
{
  const { availableVocab, attestedFrames } = require('./availability.cjs');
  const legos = [
    { seed_number: 598, lego_index: 1, known_text: 'old', target_text: 'viejo' },
    { seed_number: 599, lego_index: 1, known_text: 'I would have', target_text: 'habría' },
    { seed_number: 599, lego_index: 2, known_text: 'been happy', target_text: 'estado encantado' },
    { seed_number: 599, lego_index: 3, known_text: 'to drive', target_text: 'conducir' },
  ];
  const components = [
    { seed_number: 152, lego_index: 3, known_text: 'if', target_text: 'si' },
    { seed_number: 599, lego_index: 2, known_text: 'happy', target_text: 'encantado' },
  ];
  const v = (k) => availableVocab({ legos, components, seed: 599, legoIndex: k }).map(x => x.target_text);
  ok(v(1).join() === 'viejo,si', `LEGO 1 has only prior seeds and their components, got ${v(1).join()}`);
  ok(v(2).includes('habría') && !v(2).includes('estado encantado'), 'LEGO 2 gets LEGO 1 and not itself');
  ok(v(3).includes('encantado'), "LEGO 3 gets LEGO 2's COMPONENT — the glue is legitimately seen material");
  ok(!v(3).includes('conducir'), 'a basket never gets its own LEGO from the pool');
  ok(v(1).includes('si'), 'components of earlier seeds are available vocabulary');

  // frames are attested PER COURSE, from this course's own known side
  const f = attestedFrames([S('I want to speak Spanish', 'x', 1)], S('do you want to speak Spanish?', 'y', 2));
  ok(f.get('P1') === 1, 'a frame is dated by the first seed of THIS course that fired it');
  ok(f.has('P20') && f.get('P20') === 2, 'the question frame is attested only from the seed that asked one');
}

// ---- FRAME is scored against what was instantiable, not an absolute --------
{
  const legos = [{ lego_index: 1, known_text: 'driven', target_text: 'conducido' }];
  const rows = ['driven home', 'driven there', 'driven again', 'driven twice'].map((known_text, i) =>
    ({ phrase_role: 'use', lego_index: 1, position: i + 1, known_text, target_text: 'conducido' }));
  const rich = scoreBaskets(rows, { legos, instantiableFrames: 30 }).baskets[0].score;
  const poor = scoreBaskets(rows, { legos, instantiableFrames: 1 }).baskets[0].score;
  ok(rich.frame_ceiling === 4, `a rich pool leaves the phrase count as the ceiling, got ${rich.frame_ceiling}`);
  ok(poor.frame_ceiling === 1, `a pool of one frame is the ceiling, got ${poor.frame_ceiling}`);
  ok(poor.axes.frame > rich.axes.frame, 'the same thin basket is not marked down for a poverty it did not choose');
  ok(poor.axes.frame <= 1, 'the axis never exceeds 1');
  const unset = scoreBaskets(rows, { legos }).baskets[0].score;
  ok(unset.axes.frame === rich.axes.frame, 'with no pool given, the behaviour is exactly the old phrase-count denominator');
}

console.log(fail ? `${fail} failing assertion(s)` : 'ok — derivation returns all five verdicts including atomisation, reads components for availability and never as teaching, windows vocabulary per LEGO, attests frames per course, scores FRAME against what was instantiable, scopes floors per basket, and mints lab-side phrase ids');
process.exit(fail ? 1 : 0);
