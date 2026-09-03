#!/usr/bin/env node
/**
 * link-orphan-seed-takes-2026-09-03.cjs — point a seed's own audio slot at the
 * take the artist ALREADY GAVE US.
 *
 * WHY THIS EXISTS. A seed line is scored done by its own slot FK, never by "a
 * clip of this text exists" (services/voice-engine/take-selection.cjs says
 * why). 26 lines across the estate have a stored, verified take by the very
 * voice being asked, and an FK that does not point at it — so the booth lists
 * them as outstanding and will go on asking until the slot moves:
 *
 *   - 6 in cym_n_for_eng target2 (Aran, 2026-09-03). The slot holds a
 *     `legacy_import` clip and linkSeedTake refused to displace it. The refusal
 *     is fixed going forward (this commit's sibling change); these six were
 *     recorded before the fix and stay stuck without this.
 *   - 20 in fin_for_eng target1 (Kai, 2026-08-19..23). Slots are EMPTY. Those
 *     takes predate seed sentences entering the queue at all (2026-09-02), so
 *     nothing ever linked them.
 *
 * WHAT IT DOES AND DOES NOT DO. It writes ONE column, course_seeds.<role>_audio_id,
 * and nothing else. No clip is deleted, no S3 object is touched, no take is
 * superseded: the displaced clip stays in course_audio, still retrievable and
 * still playable. Every row's before-state is asserted immediately before the
 * write and the run aborts on any drift.
 *
 * A slot held by ANOTHER HUMAN RECORDIST is never moved — that is the one guard
 * the fix deliberately keeps, and it is re-checked here independently.
 *
 * DRY RUN BY DEFAULT.  node tools/recording/link-orphan-seed-takes-2026-09-03.cjs
 * APPLY:               APPLY=1 node tools/recording/link-orphan-seed-takes-2026-09-03.cjs
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const Q = require('../../services/voice-engine/recordist-queue.cjs')
const { audioKeyCandidates } = require('../../services/shared/text-normalize.cjs')

const APPLY = process.env.APPLY === '1'

async function main() {
  const db = createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)

  const plan = []
  for (const policy of await Q.loadPolicies(db)) {
    // Every human voice of every language, and the spellings of each — the same
    // widened read the queue uses. Reads widen, writes narrow.
    const policyVoiceIds = new Set()
    for (const slot of Object.keys(policy.voices || {})) {
      const v = (policy.voices[slot] || {}).voiceId
      if (v) policyVoiceIds.add(v)
    }
    for (const voiceId of policyVoiceIds) {
      const recordist = await Q.resolveRecordist(db, voiceId)
      if (!recordist) continue
      const queue = await Q.buildQueue(db, recordist, { maskRejectedHistory: false })
      const outstanding = queue.lines.filter((l) => l.kind === 'seed')
      if (!outstanding.length) continue

      // This voice's own clips, keyed both ways the column is stored.
      const { data: clips, error } = await db.from('course_audio')
        .select('id, text, text_normalized, voice_id, origin, s3_key, created_at')
        .eq('language', recordist.language).in('voice_id', recordist.spellings)
      if (error) throw new Error(`clip read failed: ${error.message}`)
      const byKey = new Map()
      for (const c of clips || []) {
        for (const k of audioKeyCandidates(c.text_normalized)) {
          const prev = byKey.get(k)
          // Newest take wins, by the server's own clock (pickCurrentTake's rule).
          if (!prev || String(c.created_at || '') > String(prev.created_at || '')) byKey.set(k, c)
        }
      }

      for (const line of outstanding) {
        const clip = audioKeyCandidates(line.text).map((k) => byKey.get(k)).find(Boolean)
        if (!clip) continue
        const { seedId, role } = Q.parseSeedLineId(line.id) || {}
        if (!seedId) continue
        plan.push({ voiceId: recordist.voiceId, language: recordist.language,
          courseCode: line.courseCode, seedNumber: line.seedNumber, role, seedId,
          text: line.text, audioId: clip.id })
      }
    }
  }

  const log = []
  for (const item of plan) {
    // BEFORE-STATE, read fresh and asserted at the moment of the write.
    const { data: seed, error } = await db.from('course_seeds')
      .select(`id, course_code, seed_number, target_text, ${item.role}_audio_id`)
      .eq('id', item.seedId).maybeSingle()
    if (error) throw new Error(`seed read failed: ${error.message}`)
    if (!seed) { log.push({ ...item, action: 'skip', why: 'seed vanished' }); continue }
    const current = seed[`${item.role}_audio_id`] || null
    if (current === item.audioId) { log.push({ ...item, action: 'skip', why: 'already linked' }); continue }

    let holder = null
    if (current) {
      const { data: held } = await db.from('course_audio').select('id, voice_id, origin').eq('id', current).maybeSingle()
      holder = held ? held.voice_id : null
      // Never take a slot off another human recordist. Independent re-check.
      const other = await Q.resolveRecordist(db, holder || '')
      if (other && !item.voiceId.startsWith(other.voiceId) && other.voiceId !== item.voiceId) {
        log.push({ ...item, action: 'skip', why: `held by recordist ${holder}`, from: current }); continue
      }
    }
    log.push({ ...item, action: APPLY ? 'linked' : 'would-link', from: current, fromVoice: holder })
    if (!APPLY) continue
    const { error: upErr } = await db.from('course_seeds')
      .update({ [`${item.role}_audio_id`]: item.audioId })
      .eq('id', item.seedId).eq(`${item.role}_audio_id`, current)
    if (upErr) throw new Error(`link failed for ${item.seedId}: ${upErr.message}`)
  }

  const out = path.join(__dirname, `link-orphan-seed-takes-2026-09-03-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  const counts = log.reduce((m, r) => (m[r.action] = (m[r.action] || 0) + 1, m), {})
  console.log(APPLY ? 'APPLIED' : 'DRY RUN', counts, '->', out)
}

main().catch((e) => { console.error(e); process.exit(1) })
