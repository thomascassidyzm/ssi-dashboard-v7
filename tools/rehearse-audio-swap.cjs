/**
 * Prove the park -> insert -> relink -> delete ordering on a REAL, LIVE
 * presentation clip inside a transaction that always rolls back. Nothing is
 * rendered, nothing is written. What this has to show:
 *   - parking the old voice_id frees unique_course_audio_per_voice
 *   - the replacement row inserts while the old row still exists
 *   - lego_introductions survives the delete with its link moved, i.e. the
 *     CASCADE that made this role unrepairable never fires on a live row
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

// DATABASE_URL is the secret-zero for direct SQL — .env.psql at the repo root,
// provisioned per machine, never by git (docs/secrets-vault.md §Provisioning).
const readUrl = () => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  for (const p of [path.join(__dirname, '..', '.env.psql'), path.join(__dirname, '..', '.env')]) {
    try {
      const m = fs.readFileSync(p, 'utf8').match(/^DATABASE_URL=(.*)$/m)
      if (m) return m[1].replace(/^['"]|['"]$/g, '')
    } catch {}
  }
  console.error('no DATABASE_URL — provision .env.psql (docs/secrets-vault.md)')
  process.exit(1)
}
const url = readUrl()

//   node tools/rehearse-audio-swap.cjs [<course_audio id>]
// Default: S0462L01 — a live eng_for_tel presentation clip with a real
// lego_introductions row, i.e. the exact shape that used to be unrepairable.
const OLD = process.argv[2] || '289d7e09-1dc6-4a4e-bba7-16749b0372d4'
const NEW = 'AAAAAAAA-0000-4000-8000-00000000BEEF'

;(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()
  await c.query('BEGIN')
  const say = async (label, sql, params) => {
    const r = await c.query(sql, params)
    console.log(`  ${label}: ${JSON.stringify(r.rows[0] || r.rowCount)}`)
    return r
  }
  try {
    const before = await c.query('select voice_id, duration_ms from course_audio where id=$1', [OLD])
    const oldVoice = before.rows[0].voice_id
    console.log(`old row voice_id=${oldVoice} duration=${before.rows[0].duration_ms}ms`)
    await say('intro rows pointing at old', 'select count(*) from lego_introductions where presentation_audio_id=$1', [OLD])

    // The old behaviour, proved destructive: delete first.
    await c.query('SAVEPOINT probe')
    await c.query('delete from course_audio where id=$1', [OLD])
    const gone = await c.query('select count(*) from lego_introductions where presentation_audio_id=$1 or audio_uuid=$1', [OLD])
    console.log(`DELETE-FIRST: lego_introductions rows left = ${gone.rows[0].count}  <-- authored content destroyed`)
    await c.query('ROLLBACK TO SAVEPOINT probe')

    // The new ordering.
    console.log('park -> insert -> relink -> delete:')
    await say('1 park', 'update course_audio set voice_id=$2 where id=$1', [OLD, `parked:AAAAAAAA:${oldVoice}`])
    await say('2 insert', `insert into course_audio (id, course_code, text, text_normalized, language, role, voice_id, s3_key, duration_ms, origin)
       select $2, course_code, text, text_normalized, language, role, $3, 'mastered/REHEARSAL.mp3', 4321, 'tts'
       from course_audio where id=$1`, [OLD, NEW, oldVoice])
    await say('3 relink', 'update lego_introductions set presentation_audio_id=$2, audio_uuid=$2, duration_ms=4321 where presentation_audio_id=$1', [OLD, NEW])
    await say('4 delete', 'delete from course_audio where id=$1', [OLD])
    const kept = await c.query('select lego_id, presentation_audio_id, audio_uuid, duration_ms from lego_introductions where presentation_audio_id=$1', [NEW])
    console.log(`RESULT: lego_introductions survived = ${kept.rowCount} row(s): ${JSON.stringify(kept.rows[0])}`)
  } finally {
    await c.query('ROLLBACK')
    console.log('\nrolled back — database unchanged')
    await c.end()
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
