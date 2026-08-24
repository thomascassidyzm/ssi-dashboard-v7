#!/usr/bin/env node
/**
 * VOICE-MISMATCH CENSUS — how many currently-linked clips are in a voice the
 * course voice_config does not name? (Kai's ruling, 2026-08-19.)
 *
 * READ-ONLY. Fixes nothing, renders nothing. This is the number that says how
 * big the cleanup is after the relink voice-match rule landed.
 *
 * Method: walk every FK from the three content tables (course_seeds,
 * course_legos, course_practice_phrases) to course_audio, and compare each
 * clip's voice_id against audio_configured_voice(course, role) under the same
 * identity rule as services/shared/relink-voice-guard.cjs — bare and
 * provider-prefixed ids are ONE voice, locales are NOT.
 *
 * CALIBRATION — the known positive, and what it actually means. Kai's figure
 * for zho_for_eng is "436 Sonia / 232 clone" on the known side. That is the
 * COURSE_SEEDS known slot specifically: 436 + 232 = 668 = the course's seed
 * count, and this detector reproduces both numbers exactly. It is NOT the whole
 * known side — course_legos and course_practice_phrases carry their own known
 * prompts, equally audible to a learner, and they push the course's true
 * known-side damage far above 232. `--calibrate` prints the seed slice against
 * Kai's expected numbers and refuses to be quiet if it misses them.
 *
 * --arbitrate is the sharpest instrument here, and the one that separates this
 * ruling's damage from everything else. For each mismatched clip it asks: did a
 * clip in the CONFIGURED voice, with the same text and role, already exist? If
 * yes, a relink had a correct clip available and took the wrong one — that is
 * relink damage under Kai's ruling and nothing else explains it. If no, the
 * course was simply never rendered in the configured voice, which is a render
 * gap wearing the same mismatch signature. Measured 2026-08-19, the two look
 * identical in a raw count and could not be further apart: fra_for_eng known is
 * 98% "a correct clip existed", fra_ca/spa_mx/por_br/deu_at are 0%.
 * (--arbitrate covers the course_legos slice only — it is expensive, and legos
 * are enough to tell the two populations apart.)
 *
 * Usage:
 *   node tools/audio/voice-mismatch-census.cjs [--calibrate] [--course=CODE] [--json]
 *   node tools/audio/voice-mismatch-census.cjs --arbitrate CODE [CODE...]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql') })
const { Client } = require('pg')
const { resolveVoices, voicesMatch } = require('../../services/shared/relink-voice-guard.cjs')

// Every (content table, FK column, role) triple a learner can actually hear.
const SLOTS = [
  ['course_seeds', 'id', 'known_audio_id', 'known'],
  ['course_seeds', 'id', 'target1_audio_id', 'target1'],
  ['course_seeds', 'id', 'target2_audio_id', 'target2'],
  ['course_legos', 'lego_id', 'known_audio_id', 'known'],
  ['course_legos', 'lego_id', 'target1_audio_id', 'target1'],
  ['course_legos', 'lego_id', 'target2_audio_id', 'target2'],
  ['course_legos', 'lego_id', 'presentation_audio_id', 'presentation'],
  ['course_practice_phrases', 'id', 'known_audio_id', 'known'],
  ['course_practice_phrases', 'id', 'target1_audio_id', 'target1'],
  ['course_practice_phrases', 'id', 'target2_audio_id', 'target2'],
  ['course_practice_phrases', 'id', 'presentation_audio_id', 'presentation'],
]

/**
 * Reproduce Kai's known positive before trusting any other number. A detector
 * that cannot find the damage we already know about has no business reporting
 * damage we don't.
 */
async function calibrate(db) {
  const { rows: [c] } = await db.query(`SELECT voice_config FROM courses WHERE course_code = 'zho_for_eng'`)
  const wantedKnown = resolveVoices(c).known
  const { rows } = await db.query(`
    SELECT ca.voice_id, count(*)::int AS n
      FROM course_seeds s JOIN course_audio ca ON ca.id = s.known_audio_id
     WHERE s.course_code = 'zho_for_eng' GROUP BY 1`)
  let match = 0, mismatch = 0
  for (const r of rows) (voicesMatch(wantedKnown, r.voice_id).match ? (match += r.n) : (mismatch += r.n))
  const ok = match === 436 && mismatch === 232
  console.log(`CALIBRATION zho_for_eng course_seeds.known_audio_id vs configured ${wantedKnown}:`)
  console.log(`  configured voice: ${match} (Kai: 436)   mismatched: ${mismatch} (Kai: 232)   ${ok ? 'MATCH' : 'DOES NOT MATCH — detector is wrong'}`)
  if (!ok) { console.error('Refusing to report estate numbers from an uncalibrated detector.'); process.exit(2) }
  console.log('')
}

/**
 * Was a clip in the configured voice available when the link was made? That is
 * the difference between "a relink chose wrongly" and "this course was never
 * rendered in the configured voice at all".
 */
async function arbitrate(db, codes) {
  console.log('course                role          mismatched   a correct-voice clip EXISTED for the same text')
  for (const code of codes) {
    const { rows: [cr] } = await db.query('SELECT voice_config FROM courses WHERE course_code = $1', [code])
    const w = resolveVoices(cr || {})
    for (const [role, col] of [['known', 'known_audio_id'], ['target1', 'target1_audio_id'], ['target2', 'target2_audio_id'], ['presentation', 'presentation_audio_id']]) {
      if (!w[role]) continue
      const cast = role === 'presentation' ? '::text' : ''
      const { rows } = await db.query(`
        SELECT ca.voice_id,
               EXISTS (SELECT 1 FROM course_audio b
                        WHERE b.course_code = $1 AND b.role = ca.role
                          AND b.text_normalized = ca.text_normalized AND b.voice_id = $2
                          AND coalesce(b.s3_key, '') NOT LIKE 'pending/%') AS had_right
          FROM course_legos t JOIN course_audio ca ON ca.id${cast} = t.${col}
         WHERE t.course_code = $1`, [code, w[role]])
      let bad = 0, rescuable = 0
      for (const r of rows) {
        if (voicesMatch(w[role], r.voice_id).match) continue
        bad++; if (r.had_right) rescuable++
      }
      if (bad) console.log(`${code.padEnd(20)} ${role.padEnd(14)} ${String(bad).padStart(8)}   ${String(rescuable).padStart(8)} (${((rescuable / bad) * 100).toFixed(0)}%)`)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--arbitrate')) {
    const codes = args.filter(a => !a.startsWith('--'))
    if (!codes.length) { console.error('--arbitrate needs at least one course code'); process.exit(1) }
    const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await db.connect()
    await arbitrate(db, codes)
    await db.end()
    return
  }
  const only = args.find(a => a.startsWith('--course='))?.split('=')[1]
    || (args.includes('--calibrate') ? 'zho_for_eng' : null)

  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()

  if (args.includes('--calibrate')) await calibrate(db)

  const { rows: courses } = await db.query(
    `SELECT course_code, voice_config FROM courses ${only ? 'WHERE course_code = $1' : ''} ORDER BY course_code`,
    only ? [only] : []
  )

  // One query per slot for the whole estate, grouped — far cheaper than paging
  // course_audio, and immune to the offset-without-ORDER-BY paging trap.
  const counts = new Map() // `${course}|${role}` -> Map(`${voice_id}|${origin}` -> n)
  for (const [table, , col, role] of SLOTS) {
    const cast = col === 'presentation_audio_id' && table === 'course_legos' ? '::text' : ''
    const { rows } = await db.query(`
      SELECT t.course_code, ca.voice_id, ca.origin, count(*)::int AS n
        FROM ${table} t JOIN course_audio ca ON ca.id${cast} = t.${col}
       WHERE t.${col} IS NOT NULL ${only ? 'AND t.course_code = $1' : ''}
       GROUP BY 1, 2, 3`, only ? [only] : [])
    for (const r of rows) {
      const key = `${r.course_code}|${role}`
      if (!counts.has(key)) counts.set(key, new Map())
      const m = counts.get(key)
      const k = `${r.voice_id}|${r.origin}`
      m.set(k, (m.get(k) || 0) + r.n)
    }
  }

  // A raw mismatch count is NOT a finding. Four different things produce one,
  // and only the first is the damage Kai's ruling is about:
  //
  //   DRIFT      — a role is MOSTLY on its configured voice with a minority on
  //                others. Voices mixed within one role is what a learner hears
  //                as the voice flipping. This is relink damage.
  //   WHOLESALE  — a role is ~entirely on ONE non-configured voice. Nothing
  //                drifted: someone changed voice_config and the course was
  //                never re-rendered. Real, but a different job, and counting
  //                it as relink damage would inflate the number ~15x.
  //   HUMAN      — the clip is a human recording. It cannot carry a TTS voice
  //                id, so comparing it to voice_config is meaningless. Pure
  //                detector false positive; excluded.
  //   NO-CONFIG  — the course has no configured voice for the role. A config
  //                gap, not voice drift.
  const WHOLESALE_FLOOR = 0.9

  const report = []
  for (const c of courses) {
    const wanted = resolveVoices(c)
    const row = {
      course: c.course_code, linked: 0,
      drift: 0, wholesale: 0, human: 0, noConfig: 0,
      driftVoices: {}, wholesaleRoles: [],
    }
    for (const role of ['known', 'target1', 'target2', 'presentation']) {
      const m = counts.get(`${c.course_code}|${role}`)
      if (!m) continue
      let roleTotal = 0, roleMismatch = 0
      const roleBad = {}
      for (const [k, n] of m) {
        const [voiceId, origin] = k.split('|')
        row.linked += n
        if (origin === 'human') { row.human += n; continue }
        if (!wanted[role]) { row.noConfig += n; continue }
        roleTotal += n
        if (!voicesMatch(wanted[role], voiceId).match) {
          roleMismatch += n
          roleBad[`${role}:${voiceId}`] = (roleBad[`${role}:${voiceId}`] || 0) + n
        }
      }
      if (!roleMismatch) continue
      if (roleTotal && roleMismatch / roleTotal >= WHOLESALE_FLOOR) {
        row.wholesale += roleMismatch
        row.wholesaleRoles.push(`${role} ${roleMismatch}/${roleTotal}`)
      } else {
        row.drift += roleMismatch
        Object.assign(row.driftVoices, roleBad)
      }
    }
    if (row.linked) report.push(row)
  }

  report.sort((a, b) => b.drift - a.drift || b.wholesale - a.wholesale)
  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
    await db.end(); return
  }

  const tot = report.reduce((a, r) => ({
    linked: a.linked + r.linked, drift: a.drift + r.drift,
    wholesale: a.wholesale + r.wholesale, human: a.human + r.human, noConfig: a.noConfig + r.noConfig,
  }), { linked: 0, drift: 0, wholesale: 0, human: 0, noConfig: 0 })

  console.log('DRIFT — voices mixed within one role. This is the relink damage.\n')
  console.log('course                  linked   drift     %  wrong voices')
  for (const r of report.filter(x => x.drift)) {
    const pct = ((r.drift / r.linked) * 100).toFixed(2)
    const vs = Object.entries(r.driftVoices).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}x${n}`).slice(0, 3).join(' ')
    console.log(`${r.course.padEnd(22)} ${String(r.linked).padStart(7)} ${String(r.drift).padStart(7)} ${pct.padStart(5)}  ${vs}`)
  }

  console.log('\nWHOLESALE — a whole role on one unconfigured voice: config changed, course never re-rendered.')
  console.log('Real, but NOT relink damage — a separate job.\n')
  console.log('course                 wholesale  roles')
  for (const r of report.filter(x => x.wholesale).sort((a, b) => b.wholesale - a.wholesale)) {
    console.log(`${r.course.padEnd(22)} ${String(r.wholesale).padStart(9)}  ${r.wholesaleRoles.join(', ')}`)
  }

  console.log(`\nESTATE TOTALS over ${tot.linked} linked clips in ${report.length} courses:`)
  console.log(`  DRIFT (relink damage, the cleanup)  ${tot.drift}   in ${report.filter(r => r.drift).length} courses`)
  console.log(`  WHOLESALE (config ahead of audio)   ${tot.wholesale}   in ${report.filter(r => r.wholesale).length} courses`)
  console.log(`  HUMAN recordings (excluded — no TTS voice id to compare)  ${tot.human}`)
  console.log(`  NO CONFIGURED VOICE for the role (config gap, not drift)  ${tot.noConfig}`)
  await db.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
