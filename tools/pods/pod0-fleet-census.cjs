#!/usr/bin/env node
/**
 * pod0-fleet-census.cjs — what every course's pod-0 is, live, and what the
 * fleet-wide realignment to Aran's 2026-08-06 canonical would actually cost.
 *
 * READ-ONLY. No writes of any kind, no archive files, no TTS. Safe to re-run.
 *
 * Tom, 2026-08-08: "we need all PODS to now be the latest version of the canon
 * that Aran built with around 230 sentences - configured to work with a 2-voice
 * cast for simplicity for now, for POD 0". This answers, from the DB rather than
 * from any doc: which courses are already there, which are not, which pod slot is
 * live to learners (so must be done off a parallel slug) and which is free, and
 * how many clips the whole job is.
 *
 * Clip counts are not estimated from a per-course average — they come from the
 * SAME diff engine the aligner uses (tools/pods/pod0-recording-diff.cjs), so the
 * per-course number is what that course would really need.
 *
 *   node tools/pods/pod0-fleet-census.cjs                 # table + totals
 *   node tools/pods/pod0-fleet-census.cjs --json=out.json # machine-readable too
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const { diffPod } = require('./pod0-recording-diff.cjs')
const { baseSlate } = require('../../services/shared/canonical-slate.cjs')

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }

const LEARNING_RE = /i'm learning ([^.]+)\./i
const PLACEHOLDER_TOKEN = /\[target language\]/gi
const detectLanguageName = (rows) => {
  const counts = new Map()
  for (const r of rows) {
    const m = LEARNING_RE.exec(String(r.known_text || ''))
    if (m) counts.set(m[1].trim(), (counts.get(m[1].trim()) || 0) + 1)
  }
  return counts.size ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] : null
}

// Pod-0-family slugs. `pod-0-unrecorded` is the parallel working copy the Welsh
// courses and now Spanish use; it is not learner-facing (player-vue's
// useListeningPods.ts queries the exact id `<course>:pod-0`).
const isPod0 = (slug) => slug === 'pod-0' || slug === 'pod-0-unrecorded'

// The live canonical slate. Renamed from 'pod-0' to 'pod-1' on 2026-09-01 —
// this is a `canonical_pod_scenarios` slug and is NOT a course's listening-pod
// slug, which is per-course and still 'pod-0' on most courses.
const CANONICAL_SLUG = 'pod-1'

;(async () => {
  const { data: __slateRaw, error: ce } = await db.from('canonical_pod_scenarios')
    .select('*').eq('pod_slug', CANONICAL_SLUG).order('global_order')
  // Base slate only — a variant row is a continuation attached to a coordinate,
  // not an extra line of the walk (services/shared/canonical-slate.cjs).
  const canonRaw = baseSlate(__slateRaw || [])
  if (ce) throw new Error(`canonical: ${ce.message}`)
  const CANON_N = canonRaw.length

  const { data: pods, error: pe } = await db.from('listening_pods')
    .select('id, course_code, slug, speakers').order('course_code')
  if (pe) throw new Error(`pods: ${pe.message}`)
  const pod0s = pods.filter(p => isPod0(p.slug))

  const { data: courses, error: cse } = await db.from('courses').select('course_code, status')
  if (cse) throw new Error(`courses: ${cse.message}`)
  const statusOf = new Map(courses.map(c => [c.course_code, c.status]))

  // One bulk read of every pod-0-family sentence, then group in memory.
  const rowsByPod = new Map()
  const ids = pod0s.map(p => p.id)
  for (let i = 0; i < ids.length; i += 20) {
    const { data, error } = await db.from('listening_pod_sentences')
      .select('id, pod_id, scene_number, sentence_number, global_order, speaker, known_text, target_text, target_audio_id, known_audio_id, variant_key')
      .in('pod_id', ids.slice(i, i + 20)).order('global_order')
    if (error) throw new Error(`sentences: ${error.message}`)
    // Base rows only: a continuation is attached to a coordinate, not a position
    // in the walk, so counting one would report every pod as longer than canon.
    for (const r of baseSlate(data || [])) {
      if (!rowsByPod.has(r.pod_id)) rowsByPod.set(r.pod_id, [])
      rowsByPod.get(r.pod_id).push(r)
    }
  }

  const distinctTargetVoices = (speakers) => {
    const m = (speakers && (speakers.speakers || speakers)) || {}
    return new Set(Object.values(m).map(v => v && v.target && v.target.voice_id).filter(Boolean)).size
  }

  const byCourse = new Map()
  for (const p of pod0s) {
    if (!byCourse.has(p.course_code)) byCourse.set(p.course_code, [])
    byCourse.get(p.course_code).push(p)
  }

  const out = []
  for (const [course, coursePods] of [...byCourse.entries()].sort()) {
    const live = coursePods.find(p => p.slug === 'pod-0')
    const workingCopy = coursePods.find(p => p.slug === 'pod-0-unrecorded')
    // The pod that actually holds this course's content today: prefer the working
    // copy when it exists, because that is where the realignment already happened.
    const held = workingCopy || live
    const heldRows = rowsByPod.get(held.id) || []
    const liveRows = rowsByPod.get(live ? live.id : '') || []

    const rec = {
      course,
      status: statusOf.get(course) || '(unknown)',
      learner_facing_pod_lines: liveRows.length,
      working_copy: workingCopy ? workingCopy.id : null,
      working_copy_lines: workingCopy ? heldRows.length : null,
      canon: heldRows.length >= CANON_N - 5 ? 'new' : 'old',
      two_voice: distinctTargetVoices(held.speakers) <= 2,
      target_voices: distinctTargetVoices(held.speakers),
    }

    if (!course.endsWith('_for_eng')) {
      // The aligner compares known_text against the canonical ENGLISH; on a course
      // whose known side is not English every line would mis-carry. Refusing is the
      // tool's own guard, so the census reports it rather than guessing a number.
      rec.blocked = 'known language is not English — aligner unsupported'
      out.push(rec); continue
    }

    const name = detectLanguageName(heldRows)
    const canon = canonRaw.map(r => ({
      ...r,
      english_text: name ? String(r.english_text || '').replace(PLACEHOLDER_TOKEN, name) : String(r.english_text || ''),
    }))
    if (!name && canonRaw.some(r => /\[target language\]/i.test(r.english_text))) {
      rec.blocked = 'no line to learn the target-language name from; needs --language-name'
      out.push(rec); continue
    }

    const d = diffPod(heldRows, canon)
    // A clip carries forward only when the aligner would keep its pointer — which
    // is exactly diffPod's target_still_valid / known_still_valid. Everything else
    // on the new canon has to be rendered.
    rec.survives = d.buckets.survives_unchanged
    rec.reworded = d.buckets.reworded
    rec.new_lines = d.buckets.new
    rec.target_clips_needed = CANON_N - d.takes.target_still_valid
    rec.known_clips_needed = CANON_N - d.takes.known_still_valid
    rec.clips_needed = rec.target_clips_needed + rec.known_clips_needed
    rec.lines_needing_translation =
      d.target_text_gap.no_target_text_at_all + d.target_text_gap.target_needs_review
    out.push(rec)
  }

  const doable = out.filter(r => !r.blocked)
  const totals = {
    canonical_lines: CANON_N,
    courses_with_pod0: out.length,
    already_new_canon: out.filter(r => r.canon === 'new').length,
    still_old_canon: out.filter(r => r.canon === 'old').length,
    blocked: out.filter(r => r.blocked).length,
    two_voice_already: out.filter(r => r.two_voice).length,
    learner_facing_slot_occupied: out.filter(r => r.learner_facing_pod_lines > 0).length,
    total_clips_needed_doable: doable.reduce((a, r) => a + (r.clips_needed || 0), 0),
    total_lines_needing_translation_doable: doable.reduce((a, r) => a + (r.lines_needing_translation || 0), 0),
  }

  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ totals, courses: out }, null, 1))
  console.log(JSON.stringify({ totals }, null, 2))
  console.log('\ncourse                status      live-pod  canon  voices  clips  translate  blocked')
  for (const r of out) {
    console.log(
      r.course.padEnd(21) + String(r.status).padEnd(12) +
      String(r.learner_facing_pod_lines).padStart(8) + '  ' +
      String(r.canon).padEnd(6) + String(r.target_voices).padStart(5) + '  ' +
      String(r.clips_needed ?? '-').padStart(6) + String(r.lines_needing_translation ?? '-').padStart(10) + '  ' +
      (r.blocked || ''))
  }
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
