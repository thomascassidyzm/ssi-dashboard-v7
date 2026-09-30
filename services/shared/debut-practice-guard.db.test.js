// Job #912: the database refuses any write that leaves a debut LEGO (is_new) with no practice phrase —
// for every course, whatever its status (Tom 2026-09-30 11:35Z: "these courses are live already, so they
// can't ever move off being alive"). Trigger debut_keeps_practice, database/migrations/20260930_debut_practice_guard.sql.
//
// Runs against the live DB inside ONE rolled-back transaction, so it writes nothing. If the trigger is not
// installed yet, the migration is applied inside that transaction and rolled back with it — unless
// DEBUT_GUARD_SKIP_INSTALL=1, which runs the same assertions against the database as it stands (that is how
// the fail-before half was seen). Skips when no DATABASE_URL.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { normalizeForContainment } = require('../course-builder/lib/text-normalization.cjs');
const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const f = [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql'].find(fs.existsSync);
  const m = f && fs.readFileSync(f, 'utf8').match(/DATABASE_URL=(.+)/);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}
const url = dbUrl();
const MIGRATION = path.join(__dirname, '../../database/migrations/20260930_debut_practice_guard.sql');

let c;
let n = 0;
// Each case in its own savepoint, checked at its own end: SET CONSTRAINTS … IMMEDIATE fires the deferred
// check exactly as COMMIT would, then the savepoint is rolled back so cases never see each other's writes.
async function attempt(sqls) {
  const sp = `c${++n}`;
  await c.query(`SAVEPOINT ${sp}`);
  await c.query('SET CONSTRAINTS ALL DEFERRED');
  try {
    for (const [q, params] of sqls) await c.query(q, params || []);
    await c.query('SET CONSTRAINTS ALL IMMEDIATE');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    await c.query(`ROLLBACK TO SAVEPOINT ${sp}`);
  }
}
const refused = (r) => { expect(r.ok, 'expected the guard to refuse this write').toBe(false); expect(r.error).toMatch(/DEBUT_WITHOUT_PRACTICE/); };
const allowed = (r) => expect(r.error || 'ok').toBe('ok');

const ITA = 'ita_for_eng';
// ita_for_eng S0190L01 "ti dispiace se ti faccio": the 29 Sep sweep (#887·I) moved its USE rows forward to L02.
const moveOff190L01 = (roles) => [`UPDATE course_practice_phrases SET lego_index = 2, position = position + 100
  WHERE course_code = $1 AND seed_number = 190 AND lego_index = 1 AND phrase_role = ANY ($2)`, [ITA, roles]];

describe.skipIf(!url)('debut_keeps_practice (live DB, rolled back)', () => {
  beforeAll(async () => {
    c = new Client({ connectionString: url });
    await c.connect();
    await c.query('BEGIN');
    const { rows } = await c.query("SELECT 1 FROM pg_trigger WHERE tgname = 'debut_keeps_practice'");
    if (!rows.length && process.env.DEBUT_GUARD_SKIP_INSTALL !== '1') await c.query(fs.readFileSync(MIGRATION, 'utf8'));
    // the fixture this file leans on is still what it was when written
    const { rows: s190 } = await c.query(`SELECT count(*)::int AS n FROM course_practice_phrases
      WHERE course_code = $1 AND seed_number = 190 AND lego_index = 1 AND phrase_role IN ('build','use')
        AND debut_norm(target_text) <> debut_norm('ti dispiace se ti faccio')`, [ITA]);
    expect(s190[0].n).toBeGreaterThan(1);
  }, 60e3);
  afterAll(async () => { if (c) { await c.query('ROLLBACK').catch(() => {}); await c.end(); } });

  it('reproduces the 29 Sep seed-190 sweep cut: moving every real practice row off S0190L01 is refused', async () => {
    refused(await attempt([moveOff190L01(['build', 'use'])]));
  });

  it('a move that leaves S0190L01 some real practice passes (BUILD or USE counts)', async () => {
    allowed(await attempt([[`UPDATE course_practice_phrases SET lego_index = 2, position = position + 100
      WHERE id IN (SELECT id FROM course_practice_phrases WHERE course_code = $1 AND seed_number = 190 AND lego_index = 1
                   AND phrase_role = 'build' ORDER BY position DESC LIMIT 1)`, [ITA]]]));
  });

  it('deleting every real row of a debut is refused; deleting the bare-LEGO copy alone passes', async () => {
    refused(await attempt([[`DELETE FROM course_practice_phrases WHERE course_code = $1 AND seed_number = 190 AND lego_index = 1
      AND debut_norm(target_text) <> debut_norm('ti dispiace se ti faccio')`, [ITA]]]));
    allowed(await attempt([[`DELETE FROM course_practice_phrases WHERE course_code = $1 AND seed_number = 190 AND lego_index = 1
      AND debut_norm(target_text) = debut_norm('ti dispiace se ti faccio')`, [ITA]]]));
  });

  it('re-roling the last real rows to component, or rewriting them to the bare LEGO, is refused', async () => {
    refused(await attempt([[`UPDATE course_practice_phrases SET phrase_role = 'component', introduce = false
      WHERE course_code = $1 AND seed_number = 190 AND lego_index = 1`, [ITA]]]));
    refused(await attempt([[`UPDATE course_practice_phrases SET target_text = 'Ti dispiace se ti faccio?'
      WHERE course_code = $1 AND seed_number = 190 AND lego_index = 1`, [ITA]]]));
  });

  it('make-before-break inside one transaction passes: delete the old rows AFTER writing the new one', async () => {
    allowed(await attempt([
      [`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, phrase_role)
        VALUES ($1, $2, 190, 1, 900, 'zzz912', 'zzz912 ti dispiace se ti faccio', 6, 2, 'build')`, [`${ITA}:zzz912`, ITA]],
      [`DELETE FROM course_practice_phrases WHERE course_code = $1 AND seed_number = 190 AND lego_index = 1 AND id <> $2`, [ITA, `${ITA}:zzz912`]],
    ]));
  });

  it('the old two-call seed teardown (phrases, commit, then LEGOs) is refused; wipe_seed_teaching() passes', async () => {
    refused(await attempt([[`DELETE FROM course_practice_phrases WHERE course_code = $1 AND seed_number = 190`, [ITA]]]));
    allowed(await attempt([[`SELECT wipe_seed_teaching($1, ARRAY[190])`, [ITA]]]));
  });

  it('LEGO side: rewriting a debut target so every phrase becomes the bare LEGO is refused', async () => {
    // S0190L02 "domande": make every L02 row's target the new LEGO text
    refused(await attempt([
      [`UPDATE course_legos SET target_text = 'zzz912' WHERE course_code = $1 AND seed_number = 190 AND lego_index = 2`, [ITA]],
      [`UPDATE course_practice_phrases SET target_text = 'zzz912' WHERE course_code = $1 AND seed_number = 190 AND lego_index = 2`, [ITA]],
    ]));
  });

  it('LEGO side: switching is_new on for a LEGO with no practice is refused; switching it off passes', async () => {
    // ita_for_eng S0548L03 "al momento": not new, no phrases of its own
    refused(await attempt([[`UPDATE course_legos SET is_new = true WHERE course_code = $1 AND lego_id = 'S0548L03'`, [ITA]]]));
    allowed(await attempt([[`UPDATE course_legos SET is_new = false WHERE course_code = $1 AND seed_number = 190 AND lego_index = 1`, [ITA]]]));
  });

  it('GRANDFATHERED: an already-empty debut (gle_for_eng S0053L01) may be written to, and writes around it pass', async () => {
    const { rows } = await c.query("SELECT 1 FROM debut_practice_gaps(ARRAY['gle_for_eng']) WHERE lego_id = 'S0053L01'");
    expect(rows.length, 'fixture: gle S0053L01 is still an empty debut').toBe(1);
    allowed(await attempt([[`UPDATE course_legos SET known_text = known_text || ' zzz912' WHERE course_code = 'gle_for_eng' AND lego_id = 'S0053L01'`]]));
    allowed(await attempt([[`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, phrase_role)
      VALUES ('gle_for_eng:zzz912', 'gle_for_eng', 53, 1, 900, 'zzz912', 'zzz912 tá agam', 3, 2, 'build')`]]));
    allowed(await attempt([[`UPDATE course_practice_phrases SET known_text = known_text WHERE course_code = 'gle_for_eng' AND seed_number = 53`]]));
  });

  it('debut_norm is normalizeForContainment, character for character', async () => {
    const samples = ['Ti dispiace, se ti faccio?', '  ¿Qué  tal?  ', '«Bonjour» !', 'مَرْحَبًا، يا صديقي؟', '你好。我是',
      'l amico', 'He said "hi" — and \'left\'', 'één; twee: drie!'];
    for (const s of samples) {
      const { rows } = await c.query('SELECT debut_norm($1) AS v', [s]);
      expect(rows[0].v, s).toBe(normalizeForContainment(s));
    }
  });
}, 120e3);
