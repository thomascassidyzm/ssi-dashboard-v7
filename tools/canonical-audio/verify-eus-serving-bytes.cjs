#!/usr/bin/env node
/**
 * Byte-level verification of what eus_for_eng is ACTUALLY serving.
 *
 * Tom's instruction, 2026-08-14: verify byte-level that the human-QA'd Basque
 * takes are what is currently serving — "not just linked, actually serving,
 * actual bytes match her take."
 *
 * "Linked" and "serving" are different claims and only one of them is cheap.
 * A row can carry a perfectly good s3_key pointing at an object that is gone,
 * empty, or was silently swapped underneath it. So this fetches the bytes the
 * learner's player would fetch, from the same public endpoint, and hashes them.
 *
 * WHAT THIS CAN PROVE: the object the row points at exists, its size, its SHA-256,
 * its S3 LastModified, and that the byte stream is a real MP3 rather than an
 * error document served with a 200.
 *
 * WHAT IT CANNOT PROVE, stated plainly: there is no stored copy of the original
 * human-rejected take, so "these bytes ARE her regenerated take and not some
 * third thing" cannot be established by comparison — nothing exists to compare
 * against. What it CAN do is show the object predates or postdates the
 * regeneration event, which is the strongest available evidence. Any claim
 * beyond that would be invented.
 *
 * Read-only: HTTP GET and SELECT. Writes nothing.
 */

const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const AUDIO_BASE = process.env.AUDIO_BASE_URL || 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com'
const COURSE = process.argv[2] || 'eus_for_eng'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

/** MP3 frame sync or an ID3 tag — a 200 is not proof of audio. */
function looksLikeMp3(buf) {
  if (buf.length < 4) return false
  if (buf.slice(0, 3).toString('ascii') === 'ID3') return true
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
}

async function fetchBytes(s3Key) {
  const url = `${AUDIO_BASE}/${s3Key}`
  const res = await fetch(url)
  if (!res.ok) return { ok: false, status: res.status, url }
  const buf = Buffer.from(await res.arrayBuffer())
  return {
    ok: true,
    status: res.status,
    url,
    bytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    lastModified: res.headers.get('last-modified'),
    contentType: res.headers.get('content-type'),
    isMp3: looksLikeMp3(buf),
  }
}

async function main() {
  console.log(`byte-level serving verification — course=${COURSE}`)
  console.log(`endpoint: ${AUDIO_BASE}\n`)

  // Every flagged (= human-QA-touched) clip in this course.
  const { data: flags, error: flagErr } = await supabase
    .from('audio_flags')
    .select('id, audio_uuid, status, reason, flagged_by, created_at, regen_count')
    .eq('course_code', COURSE)
  if (flagErr) throw new Error(`flags: ${flagErr.message}`)

  if (!flags?.length) { console.log('no flagged clips in this course'); return }

  const ids = flags.map(f => f.audio_uuid)
  const { data: rows, error: rowErr } = await supabase
    .from('course_audio')
    .select('id, text, role, language, voice_id, origin, s3_key, duration_ms, clip_id, audio_revision, created_at')
    .in('id', ids)
  if (rowErr) throw new Error(`rows: ${rowErr.message}`)
  const byId = new Map((rows || []).map(r => [r.id, r]))

  let bad = 0
  for (const f of flags.sort((a, b) => a.id - b.id)) {
    const r = byId.get(f.audio_uuid)
    console.log('─'.repeat(78))
    console.log(`flag #${f.id}  regen_count=${f.regen_count}  by=${f.flagged_by}  ${f.created_at}`)
    console.log(`  reason  : ${f.reason}`)
    if (!r) { console.log('  ROW GONE — the flagged course_audio row no longer exists'); bad++; continue }
    console.log(`  text    : "${r.text}"  [${r.role}/${r.language}/${r.voice_id}]`)
    console.log(`  origin  : ${r.origin}   audio_revision=${r.audio_revision}`)
    console.log(`  clip_id : ${r.clip_id || 'NULL (not linked to canon — cannot be converged)'}`)
    console.log(`  s3_key  : ${r.s3_key}`)

    const b = await fetchBytes(r.s3_key)
    if (!b.ok) { console.log(`  SERVING : DEAD — HTTP ${b.status}`); bad++; continue }
    console.log(`  SERVING : HTTP ${b.status}  ${b.bytes} bytes  mp3=${b.isMp3}  ${b.contentType}`)
    console.log(`  sha256  : ${b.sha256}`)
    console.log(`  s3 mtime: ${b.lastModified}`)
    console.log(`  row age : ${r.created_at}`)
    if (!b.isMp3 || b.bytes < 1000) { console.log('  ** NOT REAL AUDIO **'); bad++ }
  }

  console.log('─'.repeat(78))
  console.log(bad === 0
    ? `PASS: all ${flags.length} human-QA'd clips in ${COURSE} serve real audio.`
    : `FAIL: ${bad} of ${flags.length} human-QA'd clips are not serving real audio.`)
  process.exit(bad === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
