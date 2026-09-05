#!/usr/bin/env node
/**
 * The declaration — cheap self-test. No DB, no network, one process.
 *
 * THE ACCEPTANCE TEST OF THE WHOLE DESIGN: a batch is judged against what it
 * declared, mechanically, with nobody reading the target language. So this
 * file exercises the checker on fixtures shaped like the real spa_for_eng 599
 * finding: a stamped basket (nine near-identical matrix clauses) FAILS its
 * declaration with a rewrite instruction per axis; a varied basket PASSES; a
 * wrong per-phrase frame claim is caught by re-derivation (the 2026-09-04 run
 * caught 5 of 36 that way); a non-English known side gets an honest pass-through
 * rather than a fabricated verdict.
 */
const { checkDeclaration, frameSection, legoKey } = require('./declaration.cjs');
const { frameSig, matrixClause } = require('./pattern-diversity.cjs');

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log('FAIL ' + msg); } };

const DECL = {
  declares: true, applicable: true, proposed: false,
  course: 'spa_for_eng', seed: 599, lego_index: 1,
  lego_id: 'spa_for_eng:S0599L01',
  lego: { known_text: 'I would have', target_text: 'habría', type: 'A' },
  job: { verdict: 'ATOMISATION', sentence: '"habría" becomes a LEGO of its own.' },
  frame_pool: { total: 36, seed_attested: 30, seed_ids: ['P1', 'P3', 'P17'],
                pod: [{ id: 'D2', name: 'polar response + elaboration', position: 'response',
                        register: ['service'], owned_via: ['yes'], grain: 'sentence' }] },
  splits: [],
  floors: { frame: 0.34, pos: 0.34, neigh: 0.30, junct: 0.50, split: 1.0 },
  expensive_class: 'SPLIT',
  computed_at: '2026-09-05T00:00:00Z',
};

// --- the stamped basket: the live L01 defect, verbatim shape ---------------
const stamp = (k) => ({ phrase_role: 'use', known_text: k, target_text: 'habría x' });
const STAMPED = [
  stamp('I would have'), stamp('I would have said'), stamp('I would have done'),
  stamp('I would have said the same thing'), stamp('I would have said something'),
  stamp('I would have done that'), stamp('I would have done the same'),
  stamp('I would have done it'), stamp('I would have said it'),
];
const r1 = checkDeclaration(DECL, STAMPED);
ok(r1.checked === true, 'stamped basket is checked');
ok(r1.pass === false, 'stamped basket FAILS its declaration');
ok(r1.floor_failures.includes('frame'), 'stamped basket fails the FRAME floor');
ok(r1.rewrite_instructions.some(s => s.includes('MATRIX CLAUSE')),
   'the FRAME shortfall carries its rewrite instruction');

// --- the varied basket: matrix clauses vary, positions vary ----------------
const vary = (k) => ({ phrase_role: 'use', known_text: k, target_text: 'habría x' });
const VARIED = [
  vary('I would have'),
  vary('I think that I would have said something'),
  vary('why would I would have — no: do you think I would have said it'),
  vary('she told me she would have done it'),
  vary('if you had asked, I would have helped'),
  vary('who would have thought it'),
  vary('we know that they would have come'),
  vary('would have been enough, I would have said'),
  vary('he says he would have gone home'),
];
const r2 = checkDeclaration(DECL, VARIED);
ok(r2.checked === true, 'varied basket is checked');
ok(r2.axes.frame > r1.axes.frame, 'varied basket beats the stamped one on FRAME');

// --- component rows are not practice and cannot buy or lose points ---------
const r1c = checkDeclaration(DECL, [...STAMPED,
  { phrase_role: 'component', known_text: 'would', target_text: 'x' }]);
ok(r1c.composite === r1.composite, 'component rows are excluded from every axis');

// --- claim vs fired: the model's tag is audited, never believed, NEVER GATES -
// Tom's ruling, 2026-09-05: claim honesty REPORTS, it does not gate. This block
// was deliberately flipped — it used to assert that one wrong claim fails the
// set. The detection is the whole point of keeping the check, so every
// assertion below guards that the finding SURVIVES the demotion.
// The two sets differ by the TAG ALONE — same nine phrases either way — so any
// difference in verdict or composite can only have come from the claim.
const UNTAGGED = [...VARIED.slice(0, 8),
  { phrase_role: 'use', known_text: 'I would have said so', target_text: 'habría x' }];
const dishonest = [...VARIED.slice(0, 8),
  { phrase_role: 'use', known_text: 'I would have said so', target_text: 'habría x', frame: 'D2' }];
const r3 = checkDeclaration(DECL, dishonest);
const r3u = checkDeclaration(DECL, UNTAGGED);
ok(r3.claim_honesty.checked === 1, 'exactly one claim was made');
ok(r3.claim_honesty.wrong === 1, 'a claim the matchers do not confirm is counted wrong');
ok(r3.claim_honesty.findings.length === 1, 'the wrong claim is still named, not just counted');
ok(r3.claim_honesty.findings[0].claimed === 'D2' && r3.claim_honesty.findings[0].honest === false,
   'the finding says what was claimed and that it was not honest');
ok(r3.pass === true, 'a wrong claim does NOT fail a set whose content floors are clean');
ok(r3.pass === r3u.pass,
   'the same phrases with and without a wrong tag get the same content verdict');
ok(!r3.rewrite_instructions.some(s => s.startsWith('CLAIM WRONG')),
   'claim guidance is NOT in rewrite_instructions — that list drives retries and claims never do');
ok(r3.claim_instructions.length === 1 && r3.claim_instructions[0].startsWith('CLAIM WRONG'),
   'claim guidance lives in its own field, available as extra context');
ok(r3.claim_instructions[0].includes('does not block'),
   'the claim guidance says plainly that it does not block');
// the demotion must not smuggle claims into the content number either
ok(r3.composite === r3u.composite,
   'a claim finding is never summed into the composite');
ok(r3u.claim_honesty.checked === 0 && r3u.claim_honesty.wrong === 0,
   'an untagged basket claims nothing and so has nothing wrong');
// a stamped basket still fails on FLOORS, with or without honest tags
ok(checkDeclaration(DECL, STAMPED).pass === false, 'the CONTENT floors still gate');
// sanity: the audit uses the same derivation the scorer uses
ok(frameSig(matrixClause('I would have said so')) !== 'D2+anything',
   'frameSig is the auditor');

// --- pod reach is REPORTED, never gated ------------------------------------
ok(Array.isArray(r2.pod_frames.offered) && r2.pod_frames.offered.includes('D2'),
   'the declaration names the pod frames that were offered');
ok(!('pod' in (r2.floor_failures || [])), 'pod reach is not a floor');

// --- non-English known side: honest pass-through ---------------------------
const NA = { declares: false, applicable: false, course: 'eng_for_spa',
             reason: 'known side is not English' };
const r4 = checkDeclaration(NA, STAMPED);
ok(r4.checked === false && r4.pass === null, 'a non-applicable declaration checks nothing');
ok(frameSection(NA) === '', 'a non-applicable declaration adds nothing to the prompt');

// --- the prompt block and the QA spec are the same object ------------------
const sect = frameSection(DECL);
ok(sect.includes('THE DECLARATION'), 'frameSection renders the declaration header');
ok(sect.includes('P17'), 'the declared seed frames reach the prompt');
ok(sect.includes('you own: "yes"'), 'a pod frame quotes exactly the owned material');
ok(sect.includes('USE AT LEAST ONE'), 'the prompt ASKS for pod reach (never a floor)');
ok(sect.includes('AUDITED against the matchers'), 'the prompt says claims are audited');
// the prompt and the QA spec are the same object, so the prompt may not claim a
// power the checker no longer has.
ok(!sect.includes('a wrong tag fails the set'),
   'the prompt no longer says a wrong tag fails the set — it does not');
ok(sect.includes('A wrong tag does NOT fail the set'),
   'the prompt says truthfully what a wrong tag now costs');
ok(sect.includes('Tag honestly'), 'the prompt still asks for honest tags');

// --- the candidate reader: the same instrument scores phrases off disk ------
// The pure half needs no DB: readCandidatePhrases normalises BOTH on-disk
// shapes — the door's own response (build[]/use[]) and the lab candidate file
// (phrases[]) — into the rows checkDeclaration wants.
const { readCandidatePhrases } = require('./qa-report.cjs');
const doorShape = { build: [{ known: 'I would have', target: 'habría', frame: 'P17' }],
                    use: [{ known: 'she told me she would have done it', target: 'x' }] };
const dRows = readCandidatePhrases(doorShape);
ok(dRows.length === 2, 'the door response shape yields one row per phrase');
ok(dRows[0].phrase_role === 'build' && dRows[1].phrase_role === 'use',
   'build[] and use[] carry their roles through');
ok(dRows[0].known_text === 'I would have' && dRows[0].frame === 'P17',
   'known/target/frame are renamed into the checker\'s field names');
const labShape = { phrases: [
  { lego_index: 1, phrase_role: 'use', known_text: 'who would have thought it', target_text: 'x', frame: 'P3' },
  { lego_index: 2, phrase_role: 'use', known_text: 'other basket', target_text: 'y' }] };
ok(readCandidatePhrases(labShape).length === 2, 'the lab shape passes through');
ok(readCandidatePhrases(labShape, 1).length === 1,
   'a lego_index filter selects one basket out of a multi-basket candidate file');
ok(checkDeclaration(DECL, readCandidatePhrases({ build: [], use: STAMPED.map(
     p => ({ known: p.known_text, target: p.target_text })) })).pass === false,
   'candidate phrases read off disk are judged by exactly the same checker');

// --- the key survives regeneration -----------------------------------------
ok(legoKey('spa_for_eng', 599, 1) === 'spa_for_eng:S0599L01', 'lego key is the deterministic id');

if (fail) { console.log(`\n${fail} FAILURE(S)`); process.exit(1); }
console.log('declaration.test.cjs: all assertions pass');
