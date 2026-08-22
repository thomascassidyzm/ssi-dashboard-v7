#!/usr/bin/env node
/**
 * unlink-off-cast-pod-clips.cjs — NULL the pod links of target clips whose voice is
 * not in the pod's own cast, so /generate-pods refills them on the cast voices.
 *
 * WHY THIS EXISTS (2026-08-22, the ita/spa/fra/zho rollout). The readiness gate in
 * pod-switchover.cjs counts sentences with NO audio. It cannot see a sentence whose
 * audio exists but is in the WRONG VOICE — so a pod can read 0/0/0/0/0 "ready" while
 * a third of it plays in voices nobody cast and nobody approved.
 *
 * That is not hypothetical. spa_for_eng:pod-0-unrecorded passed readiness with 231/231
 * clips alive and ffprobe-clean while 80 of them were on Eve, Ara and four other voices
 * outside Tom's approved Manuel + Elvira pair. Croatian, the finished article, is
 * 231/231 ON-CAST — that is the real standard, and this tool is how the others reach it.
 *
 * SAFETY.
 *   - Reads the cast from listening_pods.speakers. If the pod resolves to no cast
 *     voices at all it aborts rather than treating everything as off-cast.
 *   - Provider prefixes are stripped before comparison ('xai_yis75yfp' and 'yis75yfp'
 *     are one voice, not two) — the one bug that would make this delete the world.
 *   - NULLs the pod's LINK only. No course_audio row is deleted; every clip survives
 *     and any link can be restored from the snapshot this writes.
 *   - Refuses any pod slug that is not *-unrecorded, so a live learner-facing pod
 *     cannot be reached. Make-before-break still governs the live pods: this only ever
 *     runs on staging, where no learner can hear a gap.
 *   - Per-row before-state assertion inside the UPDATE predicate; drift aborts the run.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write.
 *
 *   node tools/pods/unlink-off-cast-pod-clips.cjs --pod=spa_for_eng:pod-0-unrecorded
 *   node tools/pods/unlink-off-cast-pod-clips.cjs --pod=spa_for_eng:pod-0-unrecorded --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const REPO = path.join(__dirname, '..', '..')
const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const POD_ID = arg('pod')
if (!POD_ID) {
  console.error('FAILED: --pod=<pod_id> is required')
  process.exit(1)
}
if (!/-unrecorded$/.test(POD_ID)) {
  console.error(`FAILED: ${POD_ID} is not an *-unrecorded staging pod. This tool will not touch a live pod.`)
  process.exit(1)
}
const logPath = (kind) =>
  path.join(REPO, 'docs', 'pods', `${POD_ID.replace(/:/g, '-')}-off-cast-unlink-${kind}-log.json`)

// 'xai_yis75yfp' and 'yis75yfp' are the same voice recorded two ways.
const norm = (v) => String(v || '').replace(/^(xai_|azure_|eleven_)/, '')

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  try {
    const { rows: podRows } = await c.query(`select speakers from listening_pods where id = $1`, [POD_ID])
    if (podRows.length !== 1) throw new Error(`pod ${POD_ID} not found`)
    const cast = new Set(
      Object.values(podRows[0].speakers || {})
        .map((e) => e && e.target && e.target.voice_id)
        .filter(Boolean)
        .map(norm)
    )
    if (!cast.size) throw new Error(`pod ${POD_ID} resolves to NO cast target voices — refusing to treat every clip as off-cast`)
    console.log(`Cast target voices for ${POD_ID}: ${[...cast].join(', ')}`)

    const { rows } = await c.query(
      `select s.id, s.speaker, s.target_audio_id, ca.voice_id, ca.s3_key
         from listening_pod_sentences s
         join course_audio ca on ca.id = s.target_audio_id
        where s.pod_id = $1
        order by s.global_order`,
      [POD_ID]
    )
    const offCast = rows.filter((r) => !cast.has(norm(r.voice_id)))
    const byVoice = offCast.reduce((m, r) => { m[r.voice_id] = (m[r.voice_id] || 0) + 1; return m }, {})
    console.log(`${rows.length} linked target clips; ${rows.length - offCast.length} on-cast, ${offCast.length} OFF-CAST`)
    if (offCast.length) console.log(`  off-cast voices: ${JSON.stringify(byVoice)}`)

    const log = offCast.map((r) => ({
      ...r,
      reason: `voice ${r.voice_id} is not in the pod cast [${[...cast].join(', ')}]`,
      action: APPLY ? 'unlinked' : 'would-unlink',
    }))

    if (!APPLY) {
      fs.writeFileSync(logPath('dryrun'), JSON.stringify(log, null, 2))
      console.log(`DRY RUN. Wrote ${log.length} rows to ${logPath('dryrun')}`)
      await c.end()
      return
    }

    await c.query('BEGIN')
    for (const r of offCast) {
      // The predicate re-asserts the exact link we read, so a concurrent writer
      // that already replaced this clip loses the race instead of the clip.
      const res = await c.query(
        `update listening_pod_sentences
            set target_audio_id = null
          where id = $1 and pod_id = $2 and target_audio_id = $3
          returning id`,
        [r.id, POD_ID, r.target_audio_id]
      )
      if (res.rowCount !== 1) {
        throw new Error(`DRIFT: row ${r.id} no longer links clip ${r.target_audio_id} — aborting whole run, nothing written`)
      }
    }
    await c.query('COMMIT')
    fs.writeFileSync(logPath('applied'), JSON.stringify(log, null, 2))
    console.log(`APPLIED. Unlinked ${log.length} off-cast clips (no course_audio row deleted). Wrote ${logPath('applied')}`)
    console.log(`▶ Next: POST /generate-pods/<course> with pod_ids=["${POD_ID}"], roles=["target"] to refill them on the cast voices.`)
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    console.error('FAILED:', e.message)
    process.exit(1)
  } finally {
    await c.end()
  }
}

main()
