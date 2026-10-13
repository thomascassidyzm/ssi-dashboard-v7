#!/usr/bin/env node
/**
 * welsh-seed-queue-coverage-588.cjs — READ-ONLY. Is every EMPTY Welsh seed slot
 * in the queue of the voice cast to fill it, in a way that a take actually
 * REACHES that slot?
 *
 * Job #588 (Aran, 2026-10-13). "Not just by text match": a seed slot counts as
 * queued only when a queue line of the cast voice stands for THAT seed row (its
 * own line or one of its collapsed duplicates) — those are exactly the rows
 * linkSeedTake fills, because both are built from the courses whose slot is
 * cast to that voice (seedCastEntry). A same-text line in a sibling course whose
 * take could never be linked here is reported as NOT queued.
 *
 * Played = what the learner app can reach: live courses serve released seeds
 * only (course_round_index holds exactly cym_n 1..305, cym_s 1..334, i.e. the
 * released rows); sandboxes are counted in full and split by course_running_order.
 *
 *   node tools/recording/welsh-seed-queue-coverage-588.cjs [--json]
 */
'use strict'
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const q = require('../../services/voice-engine/recordist-queue.cjs')
const { isLineRecorded } = require('../../services/voice-engine/take-selection.cjs')

const COURSES = ['cym_n_for_eng', 'cym_s_for_eng', 'cym_nv2_for_eng', 'cym_sv2_for_eng']
const CAST = {
  north: { target1: 'human_catrinlliar_cym_n', target2: 'human_aran_cym_n' },
  south: { target1: 'human_dan_cym_s', target2: 'human_eleri_cym_s' },
}
const dialectOf = (c) => (/^cym_s/.test(c) ? 'south' : 'north')

async function main() {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const seeds = []
  for (const c of COURSES) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('course_seeds')
        .select('id, course_code, seed_number, status, target_text, target1_audio_id, target2_audio_id')
        .eq('course_code', c).order('seed_number').range(from, from + 999)
      if (error) throw error
      seeds.push(...data)
      if (data.length < 1000) break
    }
  }
  const played = new Set()
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const { data, error } = await db.from('course_running_order').select('seed_number').eq('course_code', c).range(0, 4999)
    if (error) throw error
    for (const r of data) played.add(`${c}:${r.seed_number}`)
  }
  const language = await q.buildLanguageLines(db, 'cym', { cache: new Map() })
  const out = {}
  for (const dialect of ['north', 'south']) {
    for (const role of ['target1', 'target2']) {
      const voiceId = CAST[dialect][role]
      const recordist = await q.resolveRecordist(db, voiceId)
      const mine = q.linesForVoice(language, recordist).filter((l) => l.kind === 'seed' && l.role === role)
      const recordedKeys = await q.recordedTextKeys(db, recordist)
      const reach = new Map()   // seedId -> {outstanding: bool}
      for (const l of mine) {
        const outstanding = !isLineRecorded(l, { recordedKeys, spellings: recordist.spellings })
        for (const id of [l.seedId, ...l.duplicateOf.map((d) => d.seedId)]) reach.set(id, { outstanding, text: l.text })
      }
      for (const s of seeds) {
        if (dialectOf(s.course_code) !== dialect) continue
        if (s[`${role}_audio_id`]) continue
        const isLive = !/v2_/.test(s.course_code)
        if (isLive && s.status !== 'released') continue   // not served
        const key = `${s.course_code}`
        const bucket = (out[`${voiceId}`] ||= { voiceId, role, courses: {} }).courses[key] ||= {
          empty: 0, emptyPlayed: 0, queued: 0, queuedPlayed: 0, recordedByText: 0, notInQueue: 0, notInQueueSeeds: [] }
        const p = isLive || played.has(`${s.course_code}:${s.seed_number}`)
        bucket.empty += 1; if (p) bucket.emptyPlayed += 1
        const r = reach.get(s.id)
        if (r && r.outstanding) { bucket.queued += 1; if (p) bucket.queuedPlayed += 1 }
        else if (r) bucket.recordedByText += 1
        else { bucket.notInQueue += 1; bucket.notInQueueSeeds.push({ seed: s.seed_number, status: s.status, played: p, text: s.target_text }) }
      }
    }
  }
  if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 2)); return }
  for (const v of Object.values(out)) {
    console.log(`\n${v.voiceId} (${v.role})`)
    for (const [c, b] of Object.entries(v.courses)) {
      console.log(`  ${c}: empty ${b.empty} (played ${b.emptyPlayed}) | queued ${b.queued} (played ${b.queuedPlayed}) | voice already has a take of the text ${b.recordedByText} | NOT queued ${b.notInQueue}`)
      for (const n of b.notInQueueSeeds.slice(0, 6)) console.log(`      #${n.seed} ${n.status}${n.played ? ' played' : ''}: ${String(n.text || '').slice(0, 60)}`)
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
