'use strict';
// por_br_for_eng seed 108 (job #349·K): every word of the seed's Portuguese is carried by one of its LEGOs (S3/L27).
// Before the grow, "no" in "no meio da noite" was carried by none of them; "noite" is covered by the course's earlier
// LEGO for "night" (taught before 108), which this test checks too. READ-ONLY against the live DB.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { Client } = require('pg');
const { plan, LEGO } = require('./por-br-108-grow-no-meio-da-2026-10-06.cjs');

const words = (s) => String(s).toLowerCase().replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);

test('plan(): the grown LEGO is refused if it would not be a piece of the seed', () => {
  const rows = [{ kind: 'seed', sn: 108, id: 'S0108', known: "we didn't hope to wake in the middle of the night", target: 'nós não esperávamos acordar no meio da noite' }];
  assert.ok(plan(rows).problems.some((p) => /S0108L01 not in pre-state/.test(p)));
  assert.deepStrictEqual(LEGO.to.components.map((c) => c.target).join(' '), LEGO.to.target);
});

test('live: seed 108 Portuguese is fully carried by its LEGOs plus words taught before it', async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    const { rows: [seed] } = await pg.query("SELECT target_text FROM course_seeds WHERE course_code='por_br_for_eng' AND seed_number=108");
    const { rows: own } = await pg.query("SELECT target_text FROM course_legos WHERE course_code='por_br_for_eng' AND seed_number=108");
    const { rows: earlier } = await pg.query("SELECT target_text FROM course_legos WHERE course_code='por_br_for_eng' AND seed_number<108 AND is_new");
    const ownWords = own.flatMap((l) => words(l.target_text));
    const before = new Set(earlier.flatMap((l) => words(l.target_text)));
    // "no" must come from a LEGO OF THIS SEED (it is taught nowhere earlier as its own piece; S0037L03 carries it only in "no mês passado")
    assert.ok(ownWords.includes('no'), 'no LEGO of seed 108 carries "no"');
    const uncovered = words(seed.target_text).filter((w) => !ownWords.includes(w) && !before.has(w));
    assert.deepStrictEqual(uncovered, []);
  } finally { await pg.end(); }
});
