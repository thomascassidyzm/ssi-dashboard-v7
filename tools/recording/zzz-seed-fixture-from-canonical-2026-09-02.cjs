/**
 * Make zzz_test2_for_eng a course a human can actually DRIVE — seed sentences,
 * taken from the canonical seeds, and the target-voice casting that lets those
 * seeds reach a recordist's queue.
 *
 * Tom, 2026-09-02: "We can use the canonical SEEDs as the English SEEDS - we are
 * testing the process." So nobody authors sentences for the test course. The
 * ENGLISH side has to be REAL, because the English side is what he reads into
 * the microphone; the `zzz` target side is a fake language nobody learns from,
 * so it is the same string. Clip identity is (language, text, voice) and the two
 * sides file under different languages (eng / zzz), so identical text on the two
 * sides is two clips, not one collision.
 *
 * `{target}` in a canonical seed is the placeholder every real course substitutes
 * its target language name into (cym_n_for_eng seed 1 reads "I want to speak
 * Welsh"). Here it becomes "Zzz".
 *
 * THE CASTING IS THE OTHER HALF, and it is what actually turns the seed queue on.
 * A seed sentence has no speaker, so — unlike a pod line — it cannot be routed
 * through voice_config.podCast. It is cast from voice_config.voices.target1 /
 * .target2 / .known instead, and a course that casts no human voice for a role
 * puts its seeds in NOBODY's queue (counted as uncast, never guessed). This
 * writes that casting for the test course and for the test course only.
 *
 * SAFE BY CONSTRUCTION:
 *   - refuses outright to touch any course whose code does not start `zzz_`;
 *   - only ADDS seed rows, keyed on (course_code, seed_number); an existing row
 *     is left exactly as it is and reported as `already there`;
 *   - deletes nothing, unlinks nothing, and never writes a seed's audio columns;
 *   - dry run by default, and writes a per-row log either way.
 *
 *   node tools/recording/zzz-seed-fixture-from-canonical-2026-09-02.cjs            # dry run
 *   node tools/recording/zzz-seed-fixture-from-canonical-2026-09-02.cjs --apply
 *   node tools/recording/zzz-seed-fixture-from-canonical-2026-09-02.cjs --seeds=100
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const COURSE = 'zzz_test2_for_eng'
const TARGET_NAME = 'Zzz'
const APPLY = process.argv.includes('--apply')
const seedsArg = process.argv.find((a) => a.startsWith('--seeds='))
const MAX_SEED = seedsArg ? parseInt(seedsArg.split('=')[1], 10) : 100

// The voices the language policy casts for `zzz`. Written into the COURSE so a
// seed line has someone to belong to; the policy already says who these people
// are (language_recording_policy.voices).
const CAST = {
  target1: { voiceId: 'human_tom_zzz', name: 'Tom' },
  target2: { voiceId: 'human_test_f_zzz', name: 'Test Voice F' },
  known: { voiceId: 'human_tom_zzz', name: 'Tom' },
}

if (!/^zzz_/.test(COURSE)) throw new Error('This tool only ever writes to a zzz_ test course.')

;(async () => {
  const log = { course: COURSE, apply: APPLY, maxSeed: MAX_SEED, at: new Date().toISOString(), seeds: [], casting: null }

  const { data: canon, error: canonErr } = await db
    .from('canonical_seeds')
    .select('seed_number, source_text')
    .lte('seed_number', MAX_SEED)
    .order('seed_number')
  if (canonErr) throw canonErr

  const { data: existing, error: exErr } = await db
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', COURSE)
    .lte('seed_number', MAX_SEED)
  if (exErr) throw exErr
  const have = new Map((existing || []).map((r) => [r.seed_number, r]))

  const toInsert = []
  for (const c of canon) {
    const text = String(c.source_text || '').replace(/\{target\}/g, TARGET_NAME).trim()
    if (!text) continue
    if (have.has(c.seed_number)) {
      log.seeds.push({ seed_number: c.seed_number, action: 'already there', text: have.get(c.seed_number).target_text })
      continue
    }
    log.seeds.push({ seed_number: c.seed_number, action: APPLY ? 'insert' : 'would insert', text })
    toInsert.push({ course_code: COURSE, seed_number: c.seed_number, known_text: text, target_text: text, status: 'approved' })
  }

  // Casting. Merged into whatever voice_config already holds — podCast is what
  // routes the pod lines and must survive untouched.
  const { data: course, error: cErr } = await db
    .from('courses').select('voice_config').eq('course_code', COURSE).single()
  if (cErr) throw cErr
  const vc = course.voice_config || {}
  const voices = { ...(vc.voices || {}) }
  const castChanges = []
  for (const [role, who] of Object.entries(CAST)) {
    const current = voices[role] && voices[role].voiceId
    if (current === who.voiceId) { castChanges.push({ role, action: 'already cast', voiceId: who.voiceId }); continue }
    castChanges.push({ role, action: APPLY ? 'cast' : 'would cast', from: current || null, voiceId: who.voiceId })
    voices[role] = { ...(voices[role] || {}), name: who.name, voiceId: who.voiceId, provider: 'human', language: role === 'known' ? 'eng' : 'zzz' }
  }
  log.casting = castChanges

  if (APPLY) {
    for (let i = 0; i < toInsert.length; i += 200) {
      const { error } = await db.from('course_seeds').insert(toInsert.slice(i, i + 200))
      if (error) throw error
    }
    if (castChanges.some((c) => c.action === 'cast')) {
      const { error } = await db.from('courses').update({ voice_config: { ...vc, voices } }).eq('course_code', COURSE)
      if (error) throw error
    }
  }

  const out = path.join(__dirname, `zzz-seed-fixture-from-canonical-2026-09-02-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  const inserted = log.seeds.filter((s) => s.action.includes('insert')).length
  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — ${inserted} seed(s) ${APPLY ? 'inserted' : 'to insert'}, ${log.seeds.length - inserted} already there; casting: ${castChanges.map((c) => `${c.role} ${c.action}`).join(', ')}`)
  console.log(`log: ${out}`)
})().catch((e) => { console.error(e.message); process.exit(1) })
