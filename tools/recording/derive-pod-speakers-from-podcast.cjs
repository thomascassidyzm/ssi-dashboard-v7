#!/usr/bin/env node
/**
 * derive-pod-speakers-from-podcast.cjs — make listening_pods.speakers a pure
 * DERIVATIVE of courses.voice_config.podCast.
 *
 * A Welsh course carries two cast maps. `courses.voice_config.podCast` is the
 * one the recast writes and the one the production API serves; it is correct.
 * `listening_pods.speakers` is a second copy that nothing on the learner or
 * recordist path reads for human-voice courses, so it drifts silently — on
 * cym_n_for_eng (2026-09-03) it had seven roles cast to the WRONG artist and 34
 * of 231 lines with no entry at all. A render sweep or an off-cast unlinker
 * pointed at that map would judge those lines uncast and unlink good human
 * takes. This rewrites `speakers` from `podCast` so the two agree.
 *
 * DERIVATION (nothing is hand-authored, nothing is merged in from the old map):
 *   for every role in podCast, except the __explainer__ pseudo-role:
 *     key      = the podCast role name
 *     gender   = podCast[role].gender
 *     target   = { name, provider:'human'|<provider>, voice_id: podCast.voiceId }
 *     known    = the same (podCast carries one voice per role, and that is the
 *                shape the existing maps use)
 *     variants = every distinct speaker label used by that pod's sentences whose
 *                parenthetical suffix stripped ("Barista (3 pm)" -> "Barista")
 *                equals the role name; the bare role name is always included.
 *
 * REFUSES to write when podCast is missing or empty — an empty map would blank
 * a pod's cast (cym_s_for_eng is in exactly that state).
 *
 * DRY RUN by default. --apply writes. Either way it logs the FULL previous
 * value of speakers, so a rewrite is recoverable.
 *
 *   node tools/recording/derive-pod-speakers-from-podcast.cjs cym_n_for_eng
 *   node tools/recording/derive-pod-speakers-from-podcast.cjs cym_n_for_eng --apply
 *
 * Touches listening_pods.speakers and nothing else.
 */
'use strict'

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const baseRole = (label) => String(label || '').replace(/\s*\([^)]*\)\s*$/, '').trim()

function deriveSpeakers(podCast, sentenceLabels) {
  const out = {}
  for (const [role, cast] of Object.entries(podCast)) {
    if (role === '__explainer__') continue
    const voice = {
      name: cast.name || null,
      provider: cast.provider || (String(cast.voiceId || '').startsWith('human_') ? 'human' : 'tts'),
      voice_id: cast.voiceId || cast.voice_id || null,
    }
    const variants = [role, ...sentenceLabels.filter((l) => baseRole(l) === role && l !== role)]
    out[role] = { known: voice, gender: cast.gender || null, target: voice, variants }
  }
  return out
}

function resolve(map, label) {
  const direct = map[label]
  if (direct) return direct.target?.voice_id || null
  for (const entry of Object.values(map)) {
    if ((entry.variants || []).includes(label)) return entry.target?.voice_id || null
  }
  const base = map[baseRole(label)]
  return base ? base.target?.voice_id || null : null
}

function tally(map, counts) {
  const byVoice = {}
  let unresolved = 0
  for (const [label, n] of Object.entries(counts)) {
    const v = resolve(map, label)
    if (!v) unresolved += n
    else byVoice[v] = (byVoice[v] || 0) + n
  }
  return { byVoice, unresolved, lines: Object.values(counts).reduce((a, b) => a + b, 0) }
}

async function main() {
  const courseCode = process.argv[2]
  const apply = process.argv.includes('--apply')
  if (!courseCode) {
    console.error('usage: derive-pod-speakers-from-podcast.cjs <courseCode> [--apply]')
    process.exit(2)
  }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { data: course, error: cErr } = await db
    .from('courses').select('course_code, voice_config').eq('course_code', courseCode).maybeSingle()
  if (cErr) throw new Error(cErr.message)
  if (!course) throw new Error(`no course ${courseCode}`)

  const podCast = course.voice_config?.podCast
  const roles = podCast && typeof podCast === 'object'
    ? Object.keys(podCast).filter((k) => k !== '__explainer__') : []
  if (!roles.length) {
    console.error(`REFUSED: ${courseCode} has no populated voice_config.podCast — writing would blank the cast.`)
    process.exit(3)
  }

  const { data: pods, error: pErr } = await db
    .from('listening_pods').select('id, slug, speakers').eq('course_code', courseCode)
  if (pErr) throw new Error(pErr.message)

  const log = { courseCode, ranAt: new Date().toISOString(), apply, pods: [] }

  for (const pod of pods || []) {
    const { data: sents, error: sErr } = await db
      .from('listening_pod_sentences').select('speaker').eq('pod_id', pod.id)
    if (sErr) throw new Error(sErr.message)
    if (!sents || !sents.length) {
      log.pods.push({ podId: pod.id, skipped: 'no sentences', speakersBefore: pod.speakers })
      console.log(`skip ${pod.id}: no sentences`)
      continue
    }
    const counts = {}
    for (const s of sents) counts[s.speaker] = (counts[s.speaker] || 0) + 1
    const labels = Object.keys(counts)

    const derived = deriveSpeakers(podCast, labels)
    const before = tally(pod.speakers || {}, counts)
    const after = tally(derived, counts)

    console.log(`\n${pod.id}  (${after.lines} lines)`)
    console.log(`  before: ${JSON.stringify(before.byVoice)} unresolved=${before.unresolved}`)
    console.log(`  after : ${JSON.stringify(after.byVoice)} unresolved=${after.unresolved}`)

    log.pods.push({ podId: pod.id, slug: pod.slug, lines: after.lines, before, after, speakersBefore: pod.speakers, speakersAfter: derived })

    if (apply) {
      const { error: uErr } = await db
        .from('listening_pods').update({ speakers: derived }).eq('id', pod.id)
      if (uErr) throw new Error(`${pod.id}: ${uErr.message}`)
      console.log('  WROTE')
    }
  }

  const out = path.join(__dirname, `derive-pod-speakers-${courseCode}-${apply ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`\nlog: ${out}`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
