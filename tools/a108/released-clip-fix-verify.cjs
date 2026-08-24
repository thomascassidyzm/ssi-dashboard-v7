#!/usr/bin/env node
/**
 * A-119 — independent verification, run AFTER the render pass.
 *
 * Deliberately does NOT import the render tool's plan or its logs: it re-reads
 * the live database and the live S3 objects and asks the two questions the job
 * was set to answer, from scratch.
 *
 *   1. Is there any row left in the five courses where course_audio.text
 *      disagrees with its pod row's target_text?
 *   2. Is there any clip left whose text still carries a slash or parenthetical
 *      gender form — and do the served BYTES of every clip we touched really
 *      say the corrected words?
 *
 * Verification is on the served bytes (fetched from S3 by the s3_key the DB now
 * points at), never on the DB row alone.
 *
 * Usage: node tools/a108/released-clip-fix-verify.cjs [--decode]
 *   --decode  also whisper-decode every touched clip (slow; the render pass
 *             already did this per clip before swapping)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
process.env.PHASE8_NO_LISTEN = '1'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')

const p8 = require('../../services/phases/phase8-audio-v13.cjs')
const veracity = require('../../services/audio-veracity.cjs')
const { droppedSlashForm } = require('./slash-form-check.cjs')
const ROW_IDS = require('./released-clip-row-ids.cjs')

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
if (!DB) { console.error('DATABASE_URL missing — source .env.psql'); process.exit(1) }

const COURSES = ['pol_for_eng', 'lav_for_eng', 'por_for_eng', 'ara_for_eng', 'spa_for_eng']
const DECODE = process.argv.includes('--decode')
const ANNOTATED = t => /[^\s]\/[^\s]/.test(String(t)) || /\(/.test(String(t))

function q (sql) {
  return JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())
}
const lit = s => "'" + String(s).replace(/'/g, "''") + "'"

;(async () => {
  const fails = []
  const note = (ok, name, detail) => {
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${detail}`)
    if (!ok) fails.push(`${name}: ${detail}`)
  }

  // ── 1. course-wide: no desync anywhere in the five courses ────────────────
  //
  // A clip's text legitimately carries a ' … ' PAUSE CUE that the pod row does
  // not: it is a TTS instruction, not content, and the render path puts it in
  // on purpose. A first version of this check compared the raw strings and
  // reported 260 "desyncs" — 258 of which were this convention and nothing
  // else (lav 35, spa 223, zero residue once the cue is normalised away). That
  // is a check lying about its own subject, so the cue is normalised out here
  // and the check asks the question the job was actually set: do the WORDS
  // agree?
  const stripCue = t => String(t).replace(/\s*…\s*/g, ' ').replace(/\s+/g, ' ').trim()
  const allPairs = q(`
    select p.course_code, s.id, a.text as audio_text, s.target_text
    from listening_pods p join listening_pod_sentences s on s.pod_id = p.id
    join course_audio a on a.id = s.target_audio_id
    where p.course_code in (${COURSES.map(lit).join(',')}) and a.text is distinct from s.target_text`)
  const desync = allPairs.filter(r => stripCue(r.audio_text) !== stripCue(r.target_text))
  note(desync.length === 0, 'no_text_audio_desync_in_the_five_courses',
    desync.length
      ? `${desync.length} row(s), e.g. ${desync[0].id}`
      : `zero rows disagree on words (${allPairs.length} differ by the ' … ' pause cue alone, which is by design)`)

  // ── 2. course-wide: no annotation left in pod target text or its clips ────
  const annotatedRows = q(`
    select p.course_code, s.id, s.target_text
    from listening_pods p join listening_pod_sentences s on s.pod_id = p.id
    where p.course_code in (${COURSES.map(lit).join(',')})`).filter(r => ANNOTATED(r.target_text))
  note(annotatedRows.length === 0, 'no_annotated_pod_text',
    annotatedRows.length ? `${annotatedRows.length} row(s), e.g. ${annotatedRows[0].id} "${annotatedRows[0].target_text}"` : 'zero pod rows carry a slash or parenthetical')

  const annotatedClips = q(`
    select distinct a.id, a.course_code, a.text
    from listening_pods p join listening_pod_sentences s on s.pod_id = p.id
    join course_audio a on a.id = s.target_audio_id
    where p.course_code in (${COURSES.map(lit).join(',')})`).filter(r => ANNOTATED(r.text))
  note(annotatedClips.length === 0, 'no_annotated_clip_text',
    annotatedClips.length ? `${annotatedClips.length} clip(s), e.g. ${annotatedClips[0].id} "${annotatedClips[0].text}"` : 'zero pod-linked clips carry a slash or parenthetical')

  // ── 3. the 79 rows specifically ──────────────────────────────────────────
  const scope = q(`
    select p.course_code, s.id, s.target_text, s.target_text_draft, s.target_audio_id,
           a.text as audio_text, a.s3_key, a.voice_id, a.audio_revision, a.language, a.duration_ms
    from listening_pods p join listening_pod_sentences s on s.pod_id = p.id
    left join course_audio a on a.id = s.target_audio_id
    where s.id in (${ROW_IDS.map(lit).join(',')})`)
  note(scope.length === ROW_IDS.length, 'all_79_rows_present', `${scope.length} of ${ROW_IDS.length}`)
  note(scope.every(r => !r.target_text_draft), 'all_79_rows_still_released', 'target_text_draft = false on every row')
  note(scope.every(r => !r.target_audio_id || r.audio_text === r.target_text), 'all_79_rows_in_sync',
    `${scope.filter(r => r.target_audio_id && r.audio_text !== r.target_text).length} disagree`)

  const byCourse = {}
  for (const r of scope) {
    const b = byCourse[r.course_code] || (byCourse[r.course_code] = { rows: 0, clips: new Set(), noAudio: 0 })
    b.rows++
    if (r.target_audio_id) b.clips.add(r.target_audio_id); else b.noAudio++
  }
  console.log('\nscope by course:')
  for (const [cc, b] of Object.entries(byCourse).sort()) {
    console.log(`  ${cc.padEnd(12)} ${String(b.rows).padStart(2)} rows  ${String(b.clips.size).padStart(2)} clips  ${b.noAudio} without audio`)
  }

  // ── 4. served bytes: every distinct clip behind the 79 rows is alive ──────
  const clips = [...new Map(scope.filter(r => r.target_audio_id)
    .map(r => [r.target_audio_id, r])).values()]
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a119-verify-'))
  let alive = 0, dead = 0, decoded = 0, decodeFails = 0
  console.log(`\nserved bytes: checking ${clips.length} clip(s)${DECODE ? ' with whisper decode' : ''}`)
  for (const c of clips) {
    try {
      const head = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: c.s3_key }))
      if (!head.ContentLength) throw new Error('zero-length object')
      alive++
      if (!DECODE) continue
      const obj = await p8.s3.send(new GetObjectCommand({ Bucket: p8.S3_BUCKET, Key: c.s3_key }))
      const f = path.join(tmpDir, path.basename(c.s3_key))
      fs.writeFileSync(f, Buffer.from(await obj.Body.transformToByteArray()))
      const v = await veracity.checkAudioVeracity(f, c.target_text, c.language)
      if (!v.checked) { decodeFails++; console.log(`  UNCHECKED ${c.target_audio_id}: ${v.reason}`); continue }
      decoded++
      if (v.cer >= 0.6) { decodeFails++; console.log(`  HIGH CER ${c.target_audio_id}: ${v.cer.toFixed(3)} "${v.decode}"`) }
    } catch (e) {
      dead++
      console.log(`  DEAD ${c.target_audio_id} ${c.s3_key}: ${e.message}`)
    }
  }
  note(dead === 0, 'every_clip_alive_on_s3', `${alive} alive, ${dead} dead of ${clips.length}`)
  if (DECODE) note(decodeFails === 0, 'every_clip_decodes_as_its_text', `${decoded} decoded, ${decodeFails} problem(s)`)

  console.log(`\n${fails.length ? `${fails.length} CHECK(S) FAILED` : 'ALL CHECKS PASSED'}`)
  if (fails.length) process.exitCode = 1
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
