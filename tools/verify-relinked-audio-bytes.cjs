#!/usr/bin/env node
/**
 * Verify a relink at the DELIVERY END, on bytes.
 *
 * A `course_audio` row that says the right thing is exactly what has been
 * lying to everybody: every previous German audio fix was signed off on row
 * state and every one of them still played the old clip. So this checks the
 * only evidence that counts —
 *
 *   1. the ref the APP hands out (`<uuid>` or `<uuid>.vN`, per audio_revision),
 *   2. the bytes the public proxy returns for that ref,
 *   3. the bytes of the S3 object the row actually names,
 *
 * and asserts (2) === (3) by sha256, plus that the superseded clip's bytes are
 * NOT what comes back. Reads only; mutates nothing.
 *
 * Usage:
 *   node tools/verify-relinked-audio-bytes.cjs <applied-log.json> [--host https://saysomethingin.app] [--out <path>]
 */
require('dotenv').config()
const fs = require('fs')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
})
const BUCKET = process.env.S3_AUDIO_BUCKET || process.env.VITE_S3_AUDIO_BUCKET || 'ssi-audio-stage'

const sha = b => crypto.createHash('sha256').update(b).digest('hex')

async function s3Bytes (key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  return Buffer.concat(await r.Body.toArray())
}

async function main () {
  const args = process.argv.slice(2)
  const logPath = args.find(a => !a.startsWith('-'))
  const flag = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
  const host = flag('--host') || 'https://saysomethingin.app'
  const outPath = flag('--out')
  if (!logPath) { console.error('Usage: verify-relinked-audio-bytes.cjs <applied-log.json> [--host H] [--out P]'); process.exit(1) }

  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'))
  const rows = (log.results || []).filter(r => r.ok)
  console.log(`verifying ${rows.length} relinked slot(s) against ${host}\n`)

  const results = []
  let pass = 0
  for (const r of rows) {
    const rec = { table: r.table, column: r.column, rowId: r.rowId, text: r.text, voice: r.voice }
    try {
      // The ref the app hands out is derived from the LIVE row, not the log.
      const { data: newRow, error } = await supabase
        .from('course_audio').select('id, s3_key, audio_revision, text, voice_id').eq('id', r.newAudioId).single()
      if (error) throw new Error(`reading new row: ${error.message}`)
      const rev = newRow.audio_revision || 1
      const ref = rev > 1 ? `${newRow.id}.v${rev}` : newRow.id
      rec.ref = ref
      rec.s3Key = newRow.s3_key

      const [served, object] = await Promise.all([
        fetch(`${host}/api/audio/${ref}`).then(async res => {
          if (!res.ok) throw new Error(`proxy returned ${res.status}`)
          return Buffer.from(await res.arrayBuffer())
        }),
        s3Bytes(newRow.s3_key),
      ])
      rec.servedSha = sha(served); rec.servedBytes = served.length
      rec.objectSha = sha(object); rec.objectBytes = object.length

      // And the take we replaced must not be what comes back.
      const { data: oldRow } = await supabase
        .from('course_audio').select('s3_key').eq('id', r.oldAudioId).single()
      if (oldRow) {
        const oldBytes = await s3Bytes(oldRow.s3_key).catch(() => null)
        rec.oldSha = oldBytes ? sha(oldBytes) : null
        rec.oldS3Key = oldRow.s3_key
      }

      rec.match = rec.servedSha === rec.objectSha
      rec.differsFromOld = rec.oldSha ? rec.servedSha !== rec.oldSha : true
      rec.ok = rec.match && rec.differsFromOld
      if (rec.ok) pass++
      console.log(`${rec.ok ? 'PASS' : 'FAIL'}  ${ref}  served=${rec.servedSha.slice(0, 12)} object=${rec.objectSha.slice(0, 12)} old=${(rec.oldSha || 'n/a').slice(0, 12)}  "${r.text}"`)
    } catch (e) {
      rec.ok = false; rec.error = e.message
      console.log(`FAIL  ${r.newAudioId}: ${e.message}`)
    }
    results.push(rec)
  }

  console.log(`\n${pass}/${rows.length} verified by fetched bytes`)
  if (outPath) { fs.writeFileSync(outPath, JSON.stringify({ host, logPath, pass, total: rows.length, results }, null, 2)); console.log(`-> ${outPath}`) }
  if (pass !== rows.length) process.exit(2)
}

main().catch(e => { console.error(e); process.exit(1) })
