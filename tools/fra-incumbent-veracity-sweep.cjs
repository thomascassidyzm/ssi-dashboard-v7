#!/usr/bin/env node
/**
 * LISTEN TO THE CLIPS THE REBUILD NEVER TOUCHED.
 *
 * The reuse-first pass gates every clip it RENDERS. It does not gate the clips
 * it leaves alone: a SATISFIED clip is byte-checked (alive, non-trivial size)
 * and reused as-is. For fra_for_eng rounds 1-200 that is most of the French
 * side — and Tom's report was that the damage is worst on the known layer and
 * target-v2, i.e. partly in exactly that untouched set.
 *
 * Every clip in the estate predates the last-word rule (added 2026-08-07
 * 04:28Z), so no incumbent has ever been asked the question this asks:
 *
 *     is the script's LAST WORD audible in the decode?
 *
 * This is READ-ONLY. It renders nothing, writes nothing to the DB and deletes
 * nothing. Its output is a verdict list; re-rendering the failures is a
 * separate, explicit step run against that list.
 *
 *   node scripts/fra-incumbent-veracity-sweep.cjs [--rounds 200] [--limit N] [--out FILE]
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const veracity = require('../services/audio-veracity.cjs')

const arg = (k, d) => {
  const i = process.argv.indexOf(k)
  return i > -1 ? process.argv[i + 1] : d
}
const ROUNDS = Number(arg('--rounds', 200))
const LIMIT = Number(arg('--limit', 0))
const PORT = arg('--port', '3468')
const OUT = arg('--out', path.join(__dirname, '..', 'docs', 'audio-repair-2026-08-07',
  `fra_for_eng-incumbent-veracity-r${ROUNDS}.json`))
const CONCURRENCY = Number(arg('--concurrency', 4))

// Same two env names phase 8 itself reads, so the sweep can never end up
// listening to a different bucket than the one the course is served from.
const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
const BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'

async function fetchObject (key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const chunks = []
  for await (const c of r.Body) chunks.push(c)
  return Buffer.concat(chunks)
}

async function main () {
  veracity.announceStatus(console)

  console.log(`[sweep] building the rounds 1-${ROUNDS} plan (read-only)…`)
  const res = await fetch(`http://localhost:${PORT}/reuse-plan/fra_for_eng?rounds=${ROUNDS}&verifyBytes=false`)
  if (!res.ok) throw new Error(`reuse-plan ${res.status}`)
  const plan = await res.json()

  // The untouched set: reused as-is, so never listened to by the render gate.
  let targets = plan.clips.filter(c =>
    c.decision === 'SATISFIED' && c.reuseSource?.s3Key && c.text)
  if (LIMIT) targets = targets.slice(0, LIMIT)
  console.log(`[sweep] ${plan.clips.length} clips in scope, ${targets.length} incumbents to listen to`)

  const results = []
  let done = 0, failed = 0, errored = 0
  let cursor = 0
  const worker = async () => {
    while (cursor < targets.length) {
      const clip = targets[cursor++]
      try {
        const buf = await fetchObject(clip.reuseSource.s3Key)
        const verdict = await veracity.checkAudioVeracity(buf, clip.text, clip.language)
        if (!verdict.pass && verdict.checked) failed++
        results.push({
          audioId: clip.reuseSource.audioId,
          s3Key: clip.reuseSource.s3Key,
          role: clip.role,
          language: clip.language,
          voiceId: clip.reuseSource.voiceId,
          text: clip.text,
          roundsUsedIn: clip.roundsUsedIn,
          plays: clip.plays,
          pass: verdict.pass,
          checked: verdict.checked,
          reason: verdict.reason,
          cer: verdict.cer,
          lastWord: verdict.lastWord,
          decode: verdict.decode,
        })
      } catch (e) {
        errored++
        results.push({ audioId: clip.reuseSource.audioId, s3Key: clip.reuseSource.s3Key,
          role: clip.role, text: clip.text, error: e.message })
      }
      if (++done % 100 === 0) {
        console.log(`[sweep] ${done}/${targets.length} listened — ${failed} damaged, ${errored} errors`)
        fs.writeFileSync(OUT, JSON.stringify({ partial: true, rounds: ROUNDS, done, failed, errored, results }, null, 1))
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const byRole = {}
  for (const r of results) {
    if (r.pass === false && r.checked) {
      const k = `${r.role}/${r.reason}`
      byRole[k] = (byRole[k] || 0) + 1
    }
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({
    partial: false, rounds: ROUNDS, listened: done, damaged: failed, errors: errored, byRole, results,
  }, null, 1))
  console.log(`[sweep] DONE — ${done} listened, ${failed} damaged, ${errored} errors`)
  console.log(`[sweep] breakdown: ${JSON.stringify(byRole)}`)
  console.log(`[sweep] ${OUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
