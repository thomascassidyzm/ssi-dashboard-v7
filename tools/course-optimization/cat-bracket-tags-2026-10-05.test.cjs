'use strict';
// node --test tools/course-optimization/cat-bracket-tags-2026-10-05.test.cjs
// K42 on cat_for_eng. The live test FAILS on the course as it was (84 bracketed LEGOs, 33 bracketed phrases) and
// PASSES once the pass is applied: no bracket survives outside Kai's held list, every planned row holds its AFTER
// text, and every phrase under a grown LEGO still contains it.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const test = require('node:test');
const assert = require('node:assert');
const D = require('./cat-bracket-tags-2026-10-05.data.cjs');
const { containsSeq, hasBracket } = require('./cat-bracket-tags-2026-10-05.cjs');

test('the plan itself: no bracket in any AFTER text, the four held LEGOs untouched, every intro demo contains its chunk', () => {
  for (const [id, l] of Object.entries(D.LEGOS)) {
    assert.ok(!hasBracket(l.known), `${id} "${l.known}"`);
    if (l.demo) assert.ok(containsSeq(l.demo, l.known), `${id} demo "${l.demo}" lacks "${l.known}"`);
  }
  for (const [id, [k]] of Object.entries(D.PHRASES)) assert.ok(!hasBracket(k), `${id} "${k}"`);
  for (const h of D.HELD) {
    assert.ok(!D.LEGOS[h.id], `held ${h.id} is in the plan`);
    assert.ok(!Object.keys(D.PHRASES).some((p) => p.startsWith(h.id)), `held ${h.id} has phrase edits`);
  }
  assert.equal(Object.keys(D.LEGOS).length + D.HELD.length, 84);
});

test('live cat_for_eng holds the pass', { skip: !process.env.DATABASE_URL && 'no DATABASE_URL' }, async () => {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    const held = new Set(D.HELD.map((h) => h.id));
    const { rows: legos } = await pg.query(`SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1`, [D.COURSE]);
    const bracketed = legos.filter((l) => hasBracket(l.known_text) && !held.has(l.lego_id)).map((l) => l.lego_id);
    assert.deepEqual(bracketed, [], `bracketed LEGOs outside the held list: ${bracketed.join(' ')}`);
    const L = Object.fromEntries(legos.map((l) => [l.lego_id, l]));
    for (const [id, p] of Object.entries(D.LEGOS)) assert.equal(L[id].known_text, p.known, id);
    const { rows: ph } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text FROM course_practice_phrases WHERE course_code=$1`, [D.COURSE]);
    const P = Object.fromEntries(ph.map((p) => [p.id, p]));
    const bp = ph.filter((p) => hasBracket(p.known_text) && !held.has(p.id.slice(0, 8))).map((p) => p.id);
    assert.deepEqual(bp, [], `bracketed phrases: ${bp.join(' ')}`);
    for (const [id, [k, t]] of Object.entries(D.PHRASES)) assert.deepEqual([P[id]?.known_text, P[id]?.target_text], [k, t], id);
    for (const id of Object.keys(D.DELETES)) assert.ok(!P[id], `${id} still exists`);
    for (const p of ph) {
      const lid = p.id.slice(0, 8);
      if (!D.LEGOS[lid]?.target || p.phrase_role === 'component') continue;
      assert.ok(containsSeq(p.target_text, D.LEGOS[lid].target), `${p.id} "${p.target_text}" lacks "${D.LEGOS[lid].target}"`);
    }
  } finally { await pg.end(); }
});

// Job #20 (lane review #19·K): the first apply cleared caches only when the TARGET changed, so English-only edits
// ("so good"→"so well") and every phrase that merely CARRIES a re-texted LEGO kept the old bracketed gloss.
test('a change to either language invalidates the phrase caches', () => {
  const { textChanged } = require('./cat-bracket-tags-2026-10-05.cjs');
  assert.ok(textChanged({ known: 'so good', target: 'tan bé' }, { known: 'so well', target: 'tan bé' }), 'English-only edit');
  assert.ok(textChanged({ known: 'my (feminine)', target: 'meva' }, { known: 'my', target: 'meva' }), 'bracket dropped');
  assert.ok(textChanged({ known: 'a', target: 'poc' }, { known: 'a', target: 'poc temps' }), 'target-only edit');
  assert.ok(!textChanged({ known: 'So well.', target: 'tan bé' }, { known: 'so well', target: 'tan bé' }), 'punctuation/case alone');
});

test('live: no decomposition under cat_for_eng carries a bracketed gloss for a re-texted LEGO', { skip: !process.env.DATABASE_URL && 'no DATABASE_URL' }, async () => {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    const { rows } = await pg.query(`SELECT p.id, e->>'known' dk, l.known_text lk FROM course_practice_phrases p CROSS JOIN LATERAL jsonb_array_elements(p.decomposition::jsonb) e
      JOIN course_legos l ON l.course_code=p.course_code AND l.lego_id=e->>'legoId'
      WHERE p.course_code=$1 AND p.decomposition IS NOT NULL AND l.lego_id = ANY($2) AND btrim(e->>'known') <> l.known_text AND e->>'known' <> ''`, [D.COURSE, Object.keys(D.LEGOS)]);
    assert.deepEqual(rows.slice(0, 5), [], `${rows.length} stale decomposition glosses`);
    const { rows: ph } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND decomposition::text ~ '\\(' AND id = ANY($2)`, [D.COURSE, Object.keys(D.PHRASES).map((i) => `${D.COURSE}:${i}`)]);
    assert.deepEqual(ph, [], 'edited phrases still carry a bracketed decomposition');
  } finally { await pg.end(); }
});
