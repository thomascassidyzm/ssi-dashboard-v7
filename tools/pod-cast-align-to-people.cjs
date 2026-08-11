#!/usr/bin/env node
/**
 * Align listening_pods.speakers with the PEOPLE cast in courses.voice_config.podCast.
 *
 * Why this exists (2026-08-11, Tom's ruling): the Welsh courses carry two
 * castings of the same pod in two places, and they disagree.
 *
 *   - `courses.voice_config.podCast` — the cast of record: one entry per
 *     character naming a real reader (name, email, gender, human voice id).
 *     For cym_n/cym_s that is exactly two people, Aran and Catrin. This is what
 *     the recorder and the autocue queue read.
 *   - `listening_pods.speakers` — what PodLab shows, what phase-8 resolves, and
 *     what the approval gate fingerprints. For cym_n/cym_s it still held five
 *     placeholder generation ids (HUMAN_F1/F2/F3/M1/M2) left over from the
 *     original import. Nothing was ever recorded against three of them, and
 *     PodLab flagged the course: "5 distinct target voices — Aran's rule is a
 *     two-hander."
 *
 * This tool makes the second agree with the first — per character, from the
 * named cast, never from a guess. A course whose podCast does not cover every
 * speaker label on every pod is refused outright rather than half-recast.
 *
 *   node tools/pod-cast-align-to-people.cjs --course=cym_n_for_eng           # dry-run
 *   node tools/pod-cast-align-to-people.cjs --courses=cym_n_for_eng,cym_s_for_eng
 *   node tools/pod-cast-align-to-people.cjs --course=cym_n_for_eng --apply
 *
 * ⚠️ MAKE BEFORE BREAK ⚠️
 *   --apply writes `listening_pods.speakers` and NOTHING ELSE. It never touches
 *   listening_pod_sentences, never nulls target_audio_id/known_audio_id, and
 *   never deletes audio. Recorded clips stay exactly where they are; this only
 *   changes which voice the cast SAYS each character is read by — and it moves
 *   it TOWARDS the ids the existing human recordings already carry.
 *
 *   Every write is guarded by a re-read: if the stored speakers map changed
 *   since this run read it, that pod is skipped, not overwritten. The full
 *   before-state of every pod is written to the log file, which is the way back.
 *
 * Changing speakers changes the cast fingerprint, so any approval on record for
 * the course goes stale and must be re-granted in PodLab. That is the gate
 * working as designed — it is refusing to carry an approval of a cast that no
 * longer exists.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const approvals = require('../services/pod-voice-approvals.cjs')

// Lazy: the pure helpers below are unit-tested, and a client at module load
// would demand credentials the tests have no business holding.
let _supabase = null
function db() {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return _supabase
}

// Same canonicalisation the fingerprint and phase-8's resolver use: parens
// stripped, whitespace collapsed. "Friend (7 pm)" and "Friend" are one part.
function canonicalSpeaker(speaker) {
  return String(speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseArgs(argv) {
  const out = { courses: [], apply: false, verbose: false }
  for (const a of argv.slice(2)) {
    if (a === '--apply') out.apply = true
    else if (a === '--verbose') out.verbose = true
    else if (a.startsWith('--course=')) out.courses.push(a.slice('--course='.length))
    else if (a.startsWith('--courses=')) out.courses.push(...a.slice('--courses='.length).split(',').map(s => s.trim()).filter(Boolean))
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length)
  }
  return out
}

/** The reader a character is cast to, from podCast — canonical lookup included. */
function castFor(podCast, label) {
  return podCast[label] || podCast[canonicalSpeaker(label)] || null
}

/**
 * The speakers entry this label should hold. Other keys on the entry (variants,
 * anything a later feature added) are preserved untouched — only gender and the
 * two track voices are restated from the cast of record.
 */
function alignedEntry(entry, person) {
  const voice = { name: person.name || null, provider: 'human', voice_id: person.voiceId }
  return { ...entry, gender: person.gender || entry.gender || 'n', target: { ...voice }, known: { ...voice } }
}

const voiceKey = (v) => (v && v.voice_id ? `${v.provider || 'azure'}|${v.voice_id}` : 'none')

function distinctVoices(speakers, track) {
  const m = new Map()
  for (const [label, e] of Object.entries(speakers || {})) {
    const v = e && e[track] && e[track].voice_id ? e[track] : (track === 'target' && e && e.voice_id ? e : null)
    const k = voiceKey(v)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(label)
  }
  return m
}

async function run() {
  const args = parseArgs(process.argv)
  if (!args.courses.length) {
    console.error('usage: pod-cast-align-to-people.cjs --course=<code> [--course=…] [--apply]')
    process.exit(1)
  }
  const log = { ran_at: new Date().toISOString(), mode: args.apply ? 'applied' : 'dryrun', courses: [] }

  for (const courseCode of args.courses) {
    const { data: course, error: cErr } = await db()
      .from('courses').select('course_code, voice_config').eq('course_code', courseCode).maybeSingle()
    if (cErr) throw new Error(`load course ${courseCode}: ${cErr.message}`)
    if (!course) throw new Error(`no such course: ${courseCode}`)

    const podCast = (course.voice_config || {}).podCast || {}
    if (!Object.keys(podCast).length) {
      throw new Error(`${courseCode}: voice_config.podCast is empty — there is no cast of record to align to`)
    }

    const { data: pods, error: pErr } = await db()
      .from('listening_pods').select('id, slug, speakers').eq('course_code', courseCode).order('id')
    if (pErr) throw new Error(`load pods ${courseCode}: ${pErr.message}`)

    // Refuse before writing anything: every label on every pod must be cast.
    const uncast = []
    for (const pod of pods || []) {
      for (const label of Object.keys(pod.speakers || {})) {
        if (!castFor(podCast, label)) uncast.push(`${pod.id} :: ${label}`)
      }
    }
    if (uncast.length) {
      throw new Error(`${courseCode}: ${uncast.length} speaker label(s) are not in podCast — refusing to guess:\n  ${uncast.join('\n  ')}`)
    }

    const before = (pods || []).map(p => ({ id: p.id, speakers: p.speakers || {} }))
    const after = []
    const courseLog = { course_code: courseCode, pods: [] }

    for (const pod of pods || []) {
      const speakers = pod.speakers || {}
      const next = {}
      for (const [label, entry] of Object.entries(speakers)) {
        next[label] = alignedEntry(entry, castFor(podCast, label))
      }
      after.push({ id: pod.id, speakers: next })

      const changed = JSON.stringify(speakers) !== JSON.stringify(next)
      const podLog = {
        pod_id: pod.id,
        slug: pod.slug,
        changed,
        target_voices_before: [...distinctVoices(speakers, 'target').keys()],
        target_voices_after: [...distinctVoices(next, 'target').keys()],
        known_voices_before: [...distinctVoices(speakers, 'known').keys()],
        known_voices_after: [...distinctVoices(next, 'known').keys()],
        speakers_before: speakers,
        speakers_after: next,
      }
      courseLog.pods.push(podLog)

      console.log(`\n${pod.id} (${pod.slug || '-'}) — ${Object.keys(speakers).length} characters`)
      console.log(`  target voices: ${podLog.target_voices_before.join(', ')}`)
      console.log(`             →   ${podLog.target_voices_after.join(', ')}`)
      if (args.verbose) {
        for (const [k, labels] of distinctVoices(next, 'target')) console.log(`    ${k}  ← ${labels.join(', ')}`)
      }

      if (!changed) { console.log('  unchanged'); podLog.write = 'skipped: already aligned'; continue }
      if (!args.apply) { podLog.write = 'dry-run'; continue }

      // Guard: the row must still hold exactly what we read before we overwrite it.
      const { data: fresh, error: fErr } = await db()
        .from('listening_pods').select('speakers').eq('id', pod.id).maybeSingle()
      if (fErr) throw new Error(`re-read ${pod.id}: ${fErr.message}`)
      if (JSON.stringify(fresh?.speakers || {}) !== JSON.stringify(speakers)) {
        console.log('  SKIPPED — the stored cast changed under this run')
        podLog.write = 'skipped: drifted'
        continue
      }
      const { error: uErr } = await db().from('listening_pods').update({ speakers: next }).eq('id', pod.id)
      if (uErr) throw new Error(`write ${pod.id}: ${uErr.message}`)
      console.log('  written')
      podLog.write = 'written'
    }

    courseLog.fingerprint_before = approvals.castFingerprint(before)
    courseLog.fingerprint_after = approvals.castFingerprint(after)
    console.log(`\n${courseCode}: cast fingerprint ${courseLog.fingerprint_before} → ${courseLog.fingerprint_after}`)
    log.courses.push(courseLog)
  }

  const out = args.out || path.resolve(
    __dirname, '..', 'docs/voice-engine/welsh-pods',
    `cast-align-${args.apply ? 'applied' : 'dryrun'}-log.json`,
  )
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`\nlog → ${out}`)
  if (!args.apply) console.log('DRY RUN — nothing written. Re-run with --apply.')
}

if (require.main === module) run().catch(e => { console.error(e.message); process.exit(1) })

module.exports = { canonicalSpeaker, castFor, alignedEntry, distinctVoices }
