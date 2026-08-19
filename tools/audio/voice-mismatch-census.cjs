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
 * Usage:
 *   node tools/audio/voice-mismatch-census.cjs [--calibrate] [--course=CODE] [--json]
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

async function main() {
  const args = process.argv.slice(2)
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
  const counts = new Map() // `${course}|${role}` -> Map(voice_id -> n)
  for (const [table, , col, role] of SLOTS) {
    const cast = col === 'presentation_audio_id' && table === 'course_legos' ? '::text' : ''
    const { rows } = await db.query(`
      SELECT t.course_code, ca.voice_id, count(*)::int AS n
        FROM ${table} t JOIN course_audio ca ON ca.id${cast} = t.${col}
       WHERE t.${col} IS NOT NULL ${only ? 'AND t.course_code = $1' : ''}
       GROUP BY 1, 2`, only ? [only] : [])
    for (const r of rows) {
      const key = `${r.course_code}|${role}`
      if (!counts.has(key)) counts.set(key, new Map())
      const m = counts.get(key)
      m.set(r.voice_id, (m.get(r.voice_id) || 0) + r.n)
    }
  }

  const report = []
  for (const c of courses) {
    const wanted = resolveVoices(c)
    const row = { course: c.course_code, linked: 0, mismatched: 0, unknownConfig: 0, byRole: {}, voices: {} }
    for (const role of ['known', 'target1', 'target2', 'presentation']) {
      const m = counts.get(`${c.course_code}|${role}`)
      if (!m) continue
      for (const [voiceId, n] of m) {
        row.linked += n
        if (!wanted[role]) {
          // No configured voice for the role: we cannot call this damage. It is
          // a config gap, and it goes in its own bucket rather than inflating
          // the cleanup number.
          row.unknownConfig += n
          continue
        }
        if (!voicesMatch(wanted[role], voiceId).match) {
          row.mismatched += n
          row.byRole[role] = (row.byRole[role] || 0) + n
          row.voices[`${role}:${voiceId}`] = (row.voices[`${role}:${voiceId}`] || 0) + n
        }
      }
    }
    if (row.linked) report.push(row)
  }

  report.sort((a, b) => b.mismatched - a.mismatched)
  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    const tot = report.reduce((a, r) => ({
      linked: a.linked + r.linked, mismatched: a.mismatched + r.mismatched, unknown: a.unknown + r.unknownConfig,
    }), { linked: 0, mismatched: 0, unknown: 0 })
    console.log(`course                  linked  mismatch    %   no-config  wrong voices`)
    for (const r of report) {
      if (!r.mismatched && !r.unknownConfig) continue
      const pct = r.linked ? ((r.mismatched / r.linked) * 100).toFixed(1) : '0.0'
      const vs = Object.entries(r.voices).map(([k, n]) => `${k}x${n}`).slice(0, 4).join(' ')
      console.log(`${r.course.padEnd(22)} ${String(r.linked).padStart(7)} ${String(r.mismatched).padStart(9)} ${pct.padStart(5)} ${String(r.unknownConfig).padStart(10)}  ${vs}`)
    }
    console.log(`\nESTATE: ${tot.linked} linked clips, ${tot.mismatched} voice-mismatched, ${tot.unknown} in courses with no configured voice for the role`)
    console.log(`Courses with any mismatch: ${report.filter(r => r.mismatched).length} / ${report.length}`)
  }
  await db.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
