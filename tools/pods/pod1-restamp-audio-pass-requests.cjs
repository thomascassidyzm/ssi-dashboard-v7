#!/usr/bin/env node
/**
 * RE-STAMP THE POD-1 RECAST AUDIO-PASS REQUESTS (2026-08-23).
 *
 * The first estate pass stamped 63 per-course requests by hand from its own
 * numbers. The cost-aware re-derivation changed those numbers, so the requests
 * have to be re-stamped or they will tell Tom to re-render clips that are now
 * staying exactly as they are.
 *
 * Source of truth is the LIVE-derived per-language queue file, never this
 * script's own arithmetic:
 *   docs/pods/pod1-recast-regen-queue-by-language-2026-08-23.json
 *
 * Requests are TOUCHED, not recreated — queueAudioPass() keeps one pending row
 * per course and merges metadata, so the record of what was decided survives.
 * A course whose burden has fallen to ZERO keeps its row and is stamped zero
 * rather than being deleted, for the same reason.
 *
 * This tool queues work. It renders NOTHING: TTS stays approval-gated and is
 * Tom's to fire (CLAUDE.md approval gate).
 *
 * SCOPE (2026-08-23, Tom's 21:15Z ruling "We're not fixing any live courses.
 * All we're doing is fixing the staged courses"). --scope=staged re-points the
 * request at the STAGED queue file, so the request a human eventually fulfils
 * describes the held staging pods rather than the serving ones.
 *
 * Usage:
 *   node tools/pods/pod1-restamp-audio-pass-requests.cjs           # dry run
 *   node tools/pods/pod1-restamp-audio-pass-requests.cjs --apply
 *   node tools/pods/pod1-restamp-audio-pass-requests.cjs --scope=staged --apply
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs')

const APPLY = process.argv.includes('--apply')
const OUT_DIR = path.join(__dirname, '../../docs/pods')
const STAMP = '2026-08-23'
const SCOPE = ((process.argv.find(a => a.startsWith('--scope=')) || '--scope=live').split('=')[1])
if (!['live', 'staged'].includes(SCOPE)) { console.error(`FAILED: --scope=${SCOPE} is not live|staged`); process.exit(1) }
const QUEUE_REL = SCOPE === 'live'
  ? `docs/pods/pod1-recast-regen-queue-by-language-${STAMP}.json`
  : `docs/pods/pod1-recast-regen-queue-by-language-staged-${STAMP}.json`
// The staged pods do share course_audio rows with the pods that are live right
// now (clone-pod copies audio ids, and the pod-0-unrecorded drafts were built
// the same way), and an earlier pass stamped that as a gate forbidding in-place
// re-render. Tom overruled it, 2026-08-23 21:58Z: "Pod 1 is the staging name.
// There are no pod 1 live. There is also no risk of affecting live courses. It
// doesn't matter." So an in-place same-uuid regen is ACCEPTED and the request
// says what the pass IS rather than warning against firing it.
const STAGED_GATE = 'PASS: per-conversation recast of the held staging pod — one male and one female voice per conversation, re-rendered in place on the existing clip rows. Approved by Tom, 2026-08-23 22:00Z.'

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') })
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } })

  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '../..', QUEUE_REL), 'utf8'))

  // language → { clips, courses } and course → languages it draws on
  const langOf = new Map(q.groups.map(g => [g.language, g]))
  const langsPerCourse = new Map()
  for (const g of q.groups) {
    for (const c of g.courses) {
      if (!langsPerCourse.has(c)) langsPerCourse.set(c, new Set())
      langsPerCourse.get(c).add(g.language)
    }
  }

  // Every course that already carries a pod-1 recast request stays in the set,
  // even at zero — the row IS the record of the decision.
  const { data: existing, error } = await supabase
    .from('audio_pass_requests')
    .select('course_code, status, reason')
    .eq('status', 'pending')
  if (error) throw error
  const carried = (existing || [])
    .filter(r => /pod-1 per-conversation recast/.test(r.reason || ''))
    .map(r => r.course_code)

  const courses = [...new Set([...Object.keys(q.perCourseClipCount), ...carried])].sort()

  const log = []
  for (const course of courses) {
    const clips = q.perCourseClipCount[course] || 0
    const langs = [...(langsPerCourse.get(course) || [])].sort()
    const langBits = langs.map(l => {
      const g = langOf.get(l)
      return `${l}=${g.clips}${g.courses.length > 1 ? `/shared×${g.courses.length}` : ''}`
    })
    const target = SCOPE === 'staged' ? ' TARGET: the STAGED (held) pod, never the live one. ' + STAGED_GATE : ''
    const reason = clips === 0
      ? `pod-1 per-conversation recast ${STAMP}, re-derived to keep existing audio — ZERO clips to re-render for this course. Row kept as the record of the decision.${target} Work list: ${QUEUE_REL}`
      : `pod-1 per-conversation recast ${STAMP}, re-derived to keep existing audio (Tom: "Can't be 184 clips for Croatian") — organised PER LANGUAGE. Languages: ${langBits.join(' ')}. Distinct clips for this course: ${clips}.${target} Full work list: ${QUEUE_REL}`
    const metadata = {
      rowsTouched: clips,
      pod1Recast: {
        unit: 'distinct course_audio clip',
        grouping: 'per-language',
        scope: SCOPE,
        ...(SCOPE === 'staged' ? { renderTarget: 'staged held pod', passDescription: STAGED_GATE } : {}),
        derivation: 'cost-aware orientation — component orientation chosen to keep the most delivered clips; zero same-voice exchanges unchanged and asserted live',
        languages: langs,
        queueFile: QUEUE_REL,
        supersededQueueFile: `docs/pods/pod1-recast-regen-queue-by-language-${STAMP}-superseded.json`,
        distinctClips: clips,
        estateTotals: {
          totalClips: q.totalClips,
          clipsCausedByRecast: q.clipsCausedByRecast,
          clipsPreexistingDrift: q.clipsPreexistingDrift,
          clipsUntouchedDivergence: q.clipsUntouchedDivergence,
        },
      },
    }
    log.push({ course, clips, languages: langs, reason })
    if (APPLY) {
      const res = await queueAudioPass(supabase, { courseCode: course, reason, requestedBy: '@pod1-costaware-recast', metadata })
      if (res.error) throw new Error(`${course}: ${res.error}`)
      log[log.length - 1].result = res.queued ? 'queued' : res.touched ? 'touched' : 'no-op'
    }
  }

  const out = path.join(OUT_DIR, `pod1-audio-pass-restamp-${SCOPE === 'staged' ? 'staged-' : ''}${STAMP}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`${APPLY ? 'stamped' : 'would stamp'} ${log.length} course requests ` +
    `(${log.filter(l => l.clips === 0).length} at zero)\nlog: ${out}`)
}

main().catch(e => { console.error(e); process.exit(1) })
