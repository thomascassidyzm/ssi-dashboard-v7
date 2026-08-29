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

console.log(fail ? `${fail} failing assertion(s)` : 'ok — derivation returns all four verdicts, attributes new sides to their lego, scopes floors per basket, excludes components, and mints lab-side phrase ids');
process.exit(fail ? 1 : 0);
