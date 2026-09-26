#!/usr/bin/env node
/**
 * Set the rate the APP plays a course's target voice at — Tom 2026-09-26:
 * "SET ON A TARGET VOICE BASIS / as a configuration - per specific course …
 * we slow it down, by ear, at the point of previewing/testing courses".
 *
 *   node tools/voice/set-course-playback-speed.cjs <course> --target1 0.85 [--target2 0.9] [--apply]
 *
 * Writes courses.voice_config.voices.<slot>.playbackSpeed (rule and validation:
 * services/shared/course-voice-config.cjs). Without --apply it prints the
 * before/after and the course's voice shape and writes nothing. Setting a speed
 * puts the course on app-played speed: every later render for it is made at
 * 1.0. Nothing already rendered is touched. Known voices have no speed to set —
 * the app plays them at 1.0.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const cfg = require('../../services/shared/course-voice-config.cjs')

async function main() {
  const args = process.argv.slice(2)
  const course = args[0]
  const val = n => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : null }
  const speeds = { target1: val('--target1'), target2: val('--target2') }
  if (!course || (speeds.target1 == null && speeds.target2 == null)) {
    console.error('usage: <course> --target1 <0.7-1.0> [--target2 <0.7-1.0>] [--apply]'); process.exit(2)
  }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { data, error } = await db.from('courses').select('course_code, voice_config').eq('course_code', course).single()
  if (error) throw new Error(error.message)
  let next = data.voice_config
  for (const [slot, speed] of Object.entries(speeds)) if (speed != null) next = cfg.withPlaybackSpeed(next, slot, speed)
  const shape = cfg.courseVoiceShape(next)
  console.log(JSON.stringify({ course, before: { target1: cfg.playbackSpeedFor(data.voice_config, 'target1'), target2: cfg.playbackSpeedFor(data.voice_config, 'target2') }, after: { target1: cfg.playbackSpeedFor(next, 'target1'), target2: cfg.playbackSpeedFor(next, 'target2') }, shape }, null, 1))
  if (!args.includes('--apply')) { console.log('dry run — nothing written (add --apply)'); return }
  const { error: upErr } = await db.from('courses').update({ voice_config: next }).eq('course_code', course)
  if (upErr) throw new Error(upErr.message)
  console.log('written')
}
main().catch(e => { console.error(e.message); process.exit(1) })
