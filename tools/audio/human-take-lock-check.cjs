#!/usr/bin/env node
/**
 * Proves the Postgres human-take lock (database/migrations/20261013_human_take_lock.sql) against the LIVE database,
 * inside one transaction that is ALWAYS rolled back — nothing it does survives.
 *
 *   node tools/audio/human-take-lock-check.cjs        exit 0 = every case behaves, 1 = a case failed
 *
 * Per slot table, on a real row whose slot holds a human take: a raw SQL repoint to a synthetic clip is REFUSED;
 * a bare "yes" override is still refused; a human-to-human move PASSES; Tom's tom:YYYY-MM-DD:<what> token PASSES;
 * unlinking to NULL PASSES. Before the migration is installed the first case fails (the overwrite goes through).
 */
const fs = require('fs'), path = require('path')
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }
const COURSE = process.env.LOCK_TEST_COURSE || 'cym_sv2_for_eng' // a course no running writer holds
const HUMAN = `(lower(coalesce(a.origin,'')) = 'human' or coalesce(a.voice_id,'') ~* '^human_')`

async function main() {
  const { Client } = require('pg')
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect()
  let failed = 0
  const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++ }
  const attempt = async (sql, args) => {
    await pg.query('savepoint t')
    try { const r = await pg.query(sql, args); await pg.query('release savepoint t'); return { done: r.rowCount } } catch (e) { await pg.query('rollback to savepoint t'); return { err: e } }
  }
  try {
    await pg.query('begin'); await pg.query("set local lock_timeout = '30s'"); await pg.query('set local statement_timeout = 60000')
    const { rows: [syn] } = await pg.query(`select a.id from course_audio a where not ${HUMAN} and a.origin = 'tts' limit 1`)
    for (const [tbl, col] of [['course_legos', 'known_audio_id'], ['course_seeds', 'target1_audio_id'], ['course_practice_phrases', 'known_audio_id'], ['lego_introductions', 'presentation_audio_id']]) {
      const { rows: [slot] } = await pg.query(`select t.id, t.${col}::text cur from ${tbl} t join course_audio a on a.id = t.${col}::uuid where ${HUMAN} and t.course_code = $1 limit 1 for update of t skip locked`, [COURSE])
      if (!slot) { console.log(`SKIP  ${tbl}.${col}: no row holds a human take`); continue }
      const { rows: [hum] } = await pg.query(`select a.id from course_audio a where ${HUMAN} and a.id::text <> $1 limit 1`, [slot.cur])
      const set = (v) => attempt(`update ${tbl} set ${col} = $1 where id = $2`, [v, slot.id])
      let r = await set(syn.id)
      ok(r.err && /HUMAN TAKE LOCK/.test(r.err.message), `${tbl}.${col}: raw SQL human -> synthetic is refused${r.err ? '' : ' (it went through)'}`)
      await pg.query("set local popty.tom_human_take_approval = 'yes'")
      r = await set(syn.id)
      ok(!!r.err, `${tbl}.${col}: a bare "yes" override is still refused`)
      await pg.query("set local popty.tom_human_take_approval = ''")
      r = await set(hum.id)
      ok(r.done === 1, `${tbl}.${col}: human -> human move passes${r.err ? ` (${r.err.message.slice(0, 120)})` : ''}`)
      r = await set(slot.cur)
      ok(r.done === 1, `${tbl}.${col}: and back again`)
      await pg.query("set local popty.tom_human_take_approval = 'tom:2026-10-13:human-take-lock self-test'")
      r = await set(syn.id)
      ok(r.done === 1, `${tbl}.${col}: Tom's tom:YYYY-MM-DD:<what> token lets human -> synthetic through${r.err ? ` (${r.err.message.slice(0, 120)})` : ''}`)
      await pg.query("set local popty.tom_human_take_approval = ''")
      r = await set(slot.cur)
      r = await set(null)
      ok(r.done === 1, `${tbl}.${col}: unlink to NULL passes`)
    }
  } finally {
    await pg.query('rollback'); await pg.end()
  }
  console.log(failed ? `${failed} case(s) FAILED (transaction rolled back)` : 'all cases passed (transaction rolled back, nothing written)')
  process.exit(failed ? 1 : 0)
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
