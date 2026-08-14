#!/usr/bin/env node
/**
 * Canonical-clip verification — on SERVED BYTES, not on row counts.
 *
 * A backfill that reconciles perfectly in SQL still proves nothing a learner
 * can hear. Tom's standing rule after the fra_for_eng purge: verify on the bytes
 * the learner is actually served. So this samples canonical clips and asks the
 * public S3 endpoint whether each object is really there, at a real size, before
 * anything downstream is allowed to depend on the clip store.
 *
 * Read-only. Issues HTTP HEAD requests and SELECTs. Writes nothing, anywhere.
 *
 *   node tools/canonical-audio/verify-canonical-clips.cjs [--sample 500] [--language eng]
 *
 * Exit code is 1 if any sampled canonical clip is dead, because a dead canon is
 * the one failure mode that would propagate: it is shared, so it is silent in
 * every course that points at it, not one.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const AUDIO_BASE = process.env.AUDIO_BASE_URL || 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com'
const CONCURRENCY = 12

const argv = process.argv.slice(2)
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt
}
const SAMPLE = parseInt(arg('sample', '500'), 10)
const LANGUAGE = arg('language', 'eng')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

/** Is this object actually there, and is it audio-sized? */
async function headObject(s3Key) {
  const url = `${AUDIO_BASE}/${s3Key}`
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const len = parseInt(res.headers.get('content-length') || '0', 10)
    return { ok: res.ok, status: res.status, bytes: len, url }
  } catch (e) {
    return { ok: false, status: 0, bytes: 0, url, error: e.message }
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  }))
  return out
}

async function main() {
  console.log(`canonical clip verification — language=${LANGUAGE} sample=${SAMPLE}`)
  console.log(`base: ${AUDIO_BASE}\n`)

  const { data: clips, error } = await supabase
    .from('audio_clips')
    .select('id, s3_key, text, role, voice_id, origin')
    .eq('language', LANGUAGE)
    .limit(SAMPLE)
  if (error) throw new Error(`clip sample failed: ${error.message}`)

  if (!clips || !clips.length) { console.log('no clips sampled'); process.exit(0) }

  const results = await mapLimit(clips, CONCURRENCY, async (c) => ({ clip: c, head: await headObject(c.s3_key) }))

  const dead = results.filter(r => !r.head.ok)
  const empty = results.filter(r => r.head.ok && r.head.bytes < 1000)
  const alive = results.length - dead.length - empty.length

  console.log(`alive : ${alive}`)
  console.log(`empty : ${empty.length}   (HTTP 200 but under 1KB — a 200 is not proof of audio)`)
  console.log(`dead  : ${dead.length}\n`)

  for (const r of [...dead, ...empty].slice(0, 25)) {
    console.log(`  ${r.head.status || 'ERR'} ${r.head.bytes}B  ${r.clip.role}/${r.clip.voice_id}  "${String(r.clip.text).slice(0, 50)}"`)
    console.log(`      ${r.head.url}`)
  }

  if (dead.length || empty.length) {
    console.log(`\nFAIL: ${dead.length + empty.length} of ${results.length} sampled canonical clips are not serving audio.`)
    console.log('A dead canon is silent in EVERY course that shares it, not one.')
    process.exit(1)
  }
  console.log(`PASS: all ${results.length} sampled canonical clips serve real audio.`)
}

main().catch(e => { console.error(e); process.exit(1) })
