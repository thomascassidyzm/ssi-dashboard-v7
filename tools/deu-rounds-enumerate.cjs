/**
 * deu_for_eng — enumerate every clip the first N rounds play, via the REAL
 * learning-script generator (services/audio-reuse-planner.enumerateRoundClips),
 * then classify each currently-linked course_audio row as CURRENT or STALE.
 *
 * CURRENT = created on/after the cutover date, or revised on/after it
 *           (course_audio_revisions) — i.e. it is on the generation Tom heard
 *           and approved in the 2026-08-05/06 seeds 1-10 repair.
 *
 * Read-only. Emits a targets file in the shape tools/audio-repair.cjs consumes.
 *
 *   node scripts/deu-rounds-enumerate.cjs <course> <rounds> <out.json>
 */
require('dotenv').config()
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const planner = require('../services/audio-reuse-planner.cjs')

const CUTOVER = process.env.CUTOVER || '2026-08-06'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

async function fetchAudioRows (ids) {
  const out = new Map()
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const { data, error } = await supabase
      .from('course_audio')
      .select('id, text, role, language, voice_id, duration_ms, created_at, audio_revision')
      .in('id', chunk)
    if (error) throw new Error(error.message)
    for (const r of data) out.set(r.id, r)
  }
  return out
}

async function fetchRevisedSince (courseCode, since) {
  const out = new Set()
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('course_audio_revisions')
      .select('audio_id')
      .eq('course_code', courseCode)
      .gte('created_at', since)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    data.forEach(r => out.add(r.audio_id))
    if (data.length < 1000) break
    from += 1000
  }
  return out
}

;(async () => {
  const course = process.argv[2] || 'deu_for_eng'
  const rounds = parseInt(process.argv[3] || '200', 10)
  const out = process.argv[4] || `/tmp/${course}-rounds-1-${rounds}-targets.json`

  const { clips, shape } = await planner.enumerateRoundClips(supabase, course, rounds)
  const specs = [...clips.values()]

  const linkedIds = [...new Set(specs.flatMap(c => c.currentAudioIds || []))]
  const [audio, revised] = await Promise.all([
    fetchAudioRows(linkedIds),
    fetchRevisedSince(course, CUTOVER),
  ])

  const isCurrent = (row) => row && (row.created_at >= CUTOVER || revised.has(row.id))

  const byRole = {}
  const stale = []
  const seen = new Set()
  for (const spec of specs) {
    for (const id of spec.currentAudioIds || []) {
      const row = audio.get(id)
      const role = row?.role || spec.role
      byRole[role] = byRole[role] || { linked: 0, current: 0, stale: 0, unresolved: 0 }
      if (seen.has(id)) continue
      seen.add(id)
      byRole[role].linked++
      if (!row) { byRole[role].unresolved++; continue }
      if (isCurrent(row)) { byRole[role].current++; continue }
      byRole[role].stale++
      stale.push({
        audioId: row.id,
        text: row.text,
        role: row.role,
        language: row.language,
        voiceId: row.voice_id,
        durationMs: row.duration_ms,
        firstRound: Math.min(...spec.roundsUsedIn),
      })
    }
  }

  stale.sort((a, b) => a.firstRound - b.firstRound || a.audioId.localeCompare(b.audioId))
  fs.writeFileSync(out, JSON.stringify({ course, items: stale }, null, 2))

  const chars = stale.reduce((n, s) => n + (s.text || '').length, 0)
  console.log(JSON.stringify({
    course, rounds, cutover: CUTOVER, shape, byRole,
    distinctClipSpecs: specs.length,
    distinctLinkedClips: seen.size,
    staleClips: stale.length,
    staleCharacters: chars,
    out,
  }, null, 2))
})().catch(e => { console.error(e); process.exit(1) })
