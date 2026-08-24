#!/usr/bin/env node
/**
 * verify-pod-audio.cjs — READ-ONLY. For every row of a pod, resolve target_audio_id
 * and known_audio_id through course_audio to their s3_key, HEAD the object in S3
 * (exists, non-trivial size), and ffprobe a downloaded copy (decodable, sane
 * duration for the text) on a sample of rows.
 *
 * Never mutates anything. Never renders. Reports HEAD count vs ffprobe count
 * explicitly so a sampled check is never reported as a full check.
 *
 *   node tools/pods/verify-pod-audio.cjs --pod=hrv_for_eng:pod-0-unrecorded --probe-sample=40
 *   node tools/pods/verify-pod-audio.cjs --pod=hrv_for_eng:pod-0-unrecorded --probe-all
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const execFileAsync = promisify(execFile)
const { Client } = require('pg')
const { S3Client, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')

const REPO = path.join(__dirname, '..', '..')
const arg = (n) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const POD_ID = arg('pod')
const PROBE_ALL = process.argv.includes('--probe-all')
const PROBE_SAMPLE = parseInt(arg('probe-sample') || '40', 10)
if (!POD_ID) {
  console.error('FAILED: --pod=<pod_id> is required')
  process.exit(1)
}

const BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const REGION = process.env.S3_REGION || 'eu-west-1'
const s3 = new S3Client({ region: REGION })

async function headObject(key) {
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return { ok: true, size: r.ContentLength }
  } catch (e) {
    return { ok: false, error: e.name }
  }
}

async function downloadAndProbe(key, textForSanity) {
  const tmp = path.join(os.tmpdir(), `probe-${Math.random().toString(36).slice(2)}.mp3`)
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const chunks = []
    for await (const c of r.Body) chunks.push(c)
    fs.writeFileSync(tmp, Buffer.concat(chunks))
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', tmp
    ])
    const dur = JSON.parse(stdout).format?.duration
    const durMs = dur ? Math.round(parseFloat(dur) * 1000) : null
    // sanity: at least ~40ms per character of text is generous slack; flag absurdly short
    const minPlausibleMs = Math.max(200, Math.min(30, textForSanity.length) * 20)
    const plausible = durMs !== null && durMs >= minPlausibleMs
    return { ok: true, durationMs: durMs, plausible }
  } catch (e) {
    return { ok: false, error: e.message }
  } finally {
    fs.existsSync(tmp) && fs.unlinkSync(tmp)
  }
}

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()

  const rows = await c.query(
    `select id, target_text, known_text, target_audio_id, known_audio_id
       from listening_pod_sentences
      where pod_id = $1
      order by id`,
    [POD_ID]
  )
  console.log(`Rows in ${POD_ID}: ${rows.rows.length}`)

  const audioIds = new Set()
  for (const r of rows.rows) {
    audioIds.add(r.target_audio_id)
    audioIds.add(r.known_audio_id)
  }
  const idList = [...audioIds].filter(Boolean)
  const audioRows = await c.query(
    `select id, s3_key, duration_ms, role, language from course_audio where id = any($1::uuid[])`,
    [idList]
  )
  const audioById = new Map(audioRows.rows.map((a) => [a.id, a]))
  console.log(`Resolved ${audioById.size} of ${idList.length} distinct audio ids to course_audio rows`)

  const results = { target: [], known: [] }
  for (const row of rows.rows) {
    for (const [role, audioIdCol, textCol] of [
      ['target', 'target_audio_id', 'target_text'],
      ['known', 'known_audio_id', 'known_text']
    ]) {
      const audioId = row[audioIdCol]
      const audio = audioById.get(audioId)
      results[role].push({
        rowId: row.id,
        audioId,
        resolved: !!audio,
        s3Key: audio?.s3_key || null,
        text: row[textCol]
      })
    }
  }

  // HEAD every resolved object
  for (const role of ['target', 'known']) {
    console.log(`\n--- HEAD check: ${role} (${results[role].length} rows) ---`)
    let ok = 0, missing = 0, unresolved = 0
    for (const item of results[role]) {
      if (!item.resolved) { unresolved++; item.head = { ok: false, error: 'unresolved-audio-id' }; continue }
      const h = await headObject(item.s3Key)
      item.head = h
      if (h.ok && h.size > 500) ok++
      else missing++
    }
    console.log(`HEAD ok=${ok} missing/tiny=${missing} unresolved=${unresolved}`)
  }

  // ffprobe: all or sample
  for (const role of ['target', 'known']) {
    const headOk = results[role].filter((i) => i.head?.ok && i.head.size > 500)
    let toProbe
    if (PROBE_ALL) {
      toProbe = headOk
    } else {
      // deterministic sample: every Nth row, at least PROBE_SAMPLE
      const n = Math.max(1, Math.floor(headOk.length / PROBE_SAMPLE))
      toProbe = headOk.filter((_, i) => i % n === 0).slice(0, PROBE_SAMPLE)
    }
    console.log(`\n--- ffprobe check: ${role}: probing ${toProbe.length} of ${headOk.length} HEAD-ok rows (${PROBE_ALL ? 'FULL' : 'SAMPLE'}) ---`)
    let ok = 0, bad = 0
    for (const item of toProbe) {
      const p = await downloadAndProbe(item.s3Key, item.text || '')
      item.probe = p
      if (p.ok && p.plausible) ok++
      else bad++
    }
    console.log(`ffprobe ok=${ok} bad=${bad}`)
  }

  const outPath = path.join(REPO, 'docs', 'pods', `hrv-pod0-audio-verify-${POD_ID.replace(/[:]/g, '_')}.json`)
  fs.writeFileSync(outPath, JSON.stringify({ podId: POD_ID, probeMode: PROBE_ALL ? 'full' : 'sample', probeSample: PROBE_SAMPLE, results }, null, 2))
  console.log(`\nWrote full detail to ${outPath}`)

  await c.end()
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1) })
