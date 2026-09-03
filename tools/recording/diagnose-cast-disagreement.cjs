#!/usr/bin/env node
/**
 * diagnose-cast-disagreement.cjs — WHICH MAP DECIDES, AND WHAT IT COSTS.
 *
 * Written 2026-09-03 for the cym_n pod-speaker alignment job. READ-ONLY: it
 * makes no writes of any kind, to any table.
 *
 * Two casting maps exist per course and they can disagree:
 *   - listening_pods.speakers        — per CHARACTER, across the whole pod
 *   - courses.voice_config.podCast   — per CONVERSATION, male/female alternating
 *
 * podCast is the newer, deliberate map (Tom's 2026-08-23 recast, made because
 * the per-character map gave Aran both sides of a scene). This tool answers the
 * question that decides whether aligning the older map is worth anything:
 *
 *   WHO ACTUALLY READS `listening_pods.speakers`?
 *
 * The answer, verified in the code on 2026-09-03: pod-bulk-migrate.cjs (TTS
 * generation), pod-voice-approvals.cjs (the TTS cast fingerprint / uncast gate)
 * and pod-dialogue-generator.cjs. NOT recordist-queue.cjs, which is the only
 * thing behind /r/<voice>. So aligning `speakers` moves no number an artist
 * sees. That is what this tool measures rather than asserts.
 *
 * Criterion, stated explicitly:
 *   a line DISAGREES when podCast and speakers give it different genders;
 *   a line is CREDITED to a recordist when course_audio holds a row under
 *   (language, normalised text, one of that voice's spellings) — the same
 *   definition recordist-queue.cjs uses for `recorded`, minus rerecord_wanted.
 *
 *   node tools/recording/diagnose-cast-disagreement.cjs cym_n_for_eng
 */
'use strict'

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const { audioKeyCandidates } = require('../../services/shared/text-normalize.cjs')
const { resolveRecordist, buildQueue } = require('../../services/voice-engine/recordist-queue.cjs')

const canonSpeaker = (s) => String(s || '').replace(/\s*\([^)]*\)\s*$/, '').trim()

async function recordedKeysFor(db, recordist) {
  const keys = new Set()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from('course_audio')
      .select('text_normalized').eq('language', recordist.language)
      .in('voice_id', recordist.spellings).order('text_normalized')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    for (const row of data || []) for (const k of audioKeyCandidates(row.text_normalized)) keys.add(k)
    if (!data || data.length < PAGE) break
  }
  return keys
}

async function main() {
  const courseCode = process.argv[2]
  if (!courseCode) { console.error('usage: diagnose-cast-disagreement.cjs <courseCode>'); process.exit(2) }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { data: course } = await db.from('courses')
    .select('course_code, voice_config').eq('course_code', courseCode).maybeSingle()
  if (!course) throw new Error(`no course ${courseCode}`)
  const podCast = (course.voice_config && course.voice_config.podCast) || {}
  console.log(`${courseCode}: voice_config.podCast holds ${Object.keys(podCast).length} speaker(s)`)

  const { data: pods } = await db.from('listening_pods')
    .select('id, speakers').eq('course_code', courseCode)

  // The recordists of this course's voices, discovered from the cast itself.
  const voiceIds = [...new Set(Object.values(podCast).map((e) => e && e.voiceId).filter(Boolean))]
  const recordists = []
  for (const v of voiceIds) { const r = await resolveRecordist(db, v); if (r) recordists.push(r) }
  const keys = new Map()
  for (const r of recordists) keys.set(r.voiceId, await recordedKeysFor(db, r))

  for (const pod of pods || []) {
    const speakers = pod.speakers || {}
    const { data: sents } = await db.from('listening_pod_sentences')
      .select('id, speaker, target_text').eq('pod_id', pod.id).order('global_order')
    if (!sents || !sents.length) { console.log(`\n${pod.id}: no sentences`); continue }

    let disagree = 0, uncast = 0
    const credited = new Map(recordists.map((r) => [r.voiceId, { inTheirBucket: 0, inTheOtherBucket: 0 }]))
    for (const s of sents) {
      const name = canonSpeaker(s.speaker)
      const pc = podCast[name] || podCast[s.speaker] || null
      const sp = speakers[name] || speakers[s.speaker] || null
      if (!pc) { uncast += 1; continue }
      if (sp && sp.gender && pc.gender && String(sp.gender).toLowerCase() !== String(pc.gender).toLowerCase()) disagree += 1
      const cand = audioKeyCandidates((s.target_text || '').trim())
      for (const r of recordists) {
        if (!cand.some((k) => keys.get(r.voiceId).has(k))) continue
        const mine = String(pc.gender || '').toLowerCase() === r.gender
        credited.get(r.voiceId)[mine ? 'inTheirBucket' : 'inTheOtherBucket'] += 1
      }
    }
    console.log(`\n${pod.id}: ${sents.length} lines`)
    console.log(`  speakers/podCast gender disagreements : ${disagree}`)
    console.log(`  lines with no podCast entry (uncast)  : ${uncast}`)
    for (const r of recordists) {
      const c = credited.get(r.voiceId)
      console.log(`  ${r.displayName}: has a take of ${c.inTheirBucket + c.inTheOtherBucket} line(s) — ` +
        `${c.inTheirBucket} inside their podCast bucket, ${c.inTheOtherBucket} stranded in the other's`)
    }
  }

  // What the artist's screen actually says today, from the one code path
  // behind /r/<voice>. Printed so the diagnosis and the screen cannot drift.
  console.log('\nLIVE QUEUE (recordist-queue.cjs, the /r/<voice> path):')
  for (const r of recordists) {
    const q = await buildQueue(db, r, { includeRecorded: true, maskRejectedHistory: false })
    const pod = q.lines.filter((l) => (l.kind || 'pod') === 'pod')
    const wanted = pod.filter((l) => l.rerecordWanted).length
    const withClip = pod.filter((l) => l.clipUrl).length
    console.log(`  ${r.displayName.padEnd(8)} total=${q.total} recorded=${q.recorded} remaining=${q.remaining}` +
      `  [pod lines ${pod.length}: ${withClip} hold a stored take, ${wanted} of those are flagged rerecord_wanted]`)
  }
}

main().catch((e) => { console.error(e.message); process.exit(1) })
