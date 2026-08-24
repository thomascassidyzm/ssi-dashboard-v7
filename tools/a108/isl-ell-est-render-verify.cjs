#!/usr/bin/env node
/**
 * Independent post-hoc verification of the A-108 isl/ell/est render.
 *
 * Reads nothing from the render tool's own logs. It takes the live DB state and
 * the rollback ledger (course_audio_revisions), downloads what is ACTUALLY
 * being served for each of the 36 clips, and re-runs the checks from scratch:
 * alive, right voice, decodable, not truncated, text/audio in sync, and — the
 * one that matters — the clip speaks the CORRECTED form rather than the
 * superseded one. Read-only; it never writes to the DB or S3.
 *
 * Usage: node tools/a108/isl-ell-est-render-verify.cjs
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
process.env.PHASE8_NO_LISTEN = '1'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

const p8 = require('../../services/phases/phase8-audio-v13.cjs')
const veracity = require('../../services/audio-veracity.cjs')
const { speaksCorrectedForm, tokenDiff } = require('./changed-form-check.cjs')

const SOURCE = 'a108-isl-ell-est-register-render'
const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
if (!DB) { console.error('DATABASE_URL missing — source .env.psql'); process.exit(1) }
const q = sql => JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
  `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())

const EDITS = require('./isl-ell-est-edits.cjs')

function ffprobeMs (file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file]).toString().trim()
  return Math.round(parseFloat(out) * 1000)
}

;(async () => {
  const clips = q(`
    select r.audio_id as clip_id, a.course_code, a.voice_id, a.language, a.text as spoken_text,
           a.s3_key, a.duration_ms, a.file_size_bytes, a.audio_revision,
           r.previous_s3_key, r.previous_duration_ms, r.previous_revision
    from course_audio_revisions r join course_audio a on a.id = r.audio_id
    where r.source = '${SOURCE}' order by a.course_code, r.created_at`)
  const podRows = q(`
    select s.target_audio_id as clip_id, s.id, p.slug as pod, s.scene_number as scene,
           s.sentence_number as sentence, s.speaker, s.target_text
    from listening_pod_sentences s join listening_pods p on p.id = s.pod_id
    where s.target_audio_id in (select audio_id from course_audio_revisions where source = '${SOURCE}')`)

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'a108-verify-'))
  const results = []
  for (const c of clips) {
    const checks = []
    const add = (name, ok, detail) => checks.push({ name, ok, detail })
    const mine = podRows.filter(r => r.clip_id === c.clip_id)

    // The superseded wording, recovered from the edit list rather than assumed.
    const edit = EDITS.find(e => e.cc === c.course_code && c.spoken_text.includes(e.to))
    const superseded = edit ? c.spoken_text.replace(edit.to, edit.find) : null

    add('voice_is_incumbent_azure', /^(azure_)?(is-IS|el-GR|et-EE)-\w+Neural$/.test(c.voice_id), c.voice_id)
    add('revision_bumped', c.audio_revision > c.previous_revision, `${c.previous_revision} -> ${c.audio_revision}`)
    add('key_moved', c.s3_key !== c.previous_s3_key, `${c.previous_s3_key} -> ${c.s3_key}`)
    add('text_audio_in_sync', mine.length > 0 && mine.every(r => r.target_text === c.spoken_text),
      `${mine.length} pod row(s), all byte-identical to course_audio.text`)
    add('superseded_object_retained', !!c.previous_s3_key, c.previous_s3_key)

    const head = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: c.s3_key }))
    add('alive_on_s3', head.ContentLength === c.file_size_bytes && head.ContentLength > 1000,
      `ContentLength ${head.ContentLength} = file_size_bytes ${c.file_size_bytes}`)

    const file = path.join(tmp, c.clip_id + '.mp3')
    const obj = await p8.s3.send(new GetObjectCommand({ Bucket: p8.S3_BUCKET, Key: c.s3_key }))
    fs.writeFileSync(file, Buffer.from(await obj.Body.transformToByteArray()))
    const probed = ffprobeMs(file)
    add('decodable', probed > 0, `ffprobe ${probed}ms`)
    add('duration_agrees', Math.abs(probed - c.duration_ms) <= Math.max(250, c.duration_ms * 0.05),
      `ffprobe ${probed}ms vs stored ${c.duration_ms}ms`)
    if (superseded) {
      const expected = c.previous_duration_ms * (c.spoken_text.length / superseded.length)
      const ratio = probed / expected
      add('not_truncated', ratio >= 0.75 && ratio <= 1.4,
        `${probed}ms vs length-scaled expectation ${Math.round(expected)}ms (ratio ${ratio.toFixed(2)})`)
    }

    const v = await veracity.checkAudioVeracity(file, c.spoken_text, c.language)
    if (!v.checked) add('asr_decoded', false, `UNCHECKED (${v.reason})`)
    else {
      const cerNew = v.cer
      add('asr_decoded', true, JSON.stringify(v.decode))
      add('asr_is_speech', cerNew < 0.6, `CER vs live text ${cerNew.toFixed(3)}`)
      if (superseded) {
        const cerOld = veracity.characterErrorRate(superseded, v.decode)
        add('asr_speaks_new_form', cerNew < cerOld, `CER ${cerNew.toFixed(3)} vs live < ${cerOld.toFixed(3)} vs superseded`)
        const words = t => String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
        const before = new Set(words(superseded))
        const forms = speaksCorrectedForm(veracity.normalise(v.decode), tokenDiff(c.spoken_text, superseded),
          tokenDiff(superseded, c.spoken_text), veracity.normalise, words(c.spoken_text).filter(w => before.has(w)))
        add('asr_changed_words', forms.ok, forms.results.map(r =>
          `"${r.heard}" is ${r.distance_to_new} from ${r.newTok}${r.oldTok === null ? '' : ` and ${r.distance_to_superseded} from superseded ${r.oldTok}`}`).join('; '))
      }
      c.decode = v.decode
    }

    const ok = checks.every(k => k.ok)
    console.log(`${ok ? 'PASS' : 'FAIL'} ${c.course_code} ${c.clip_id} ${c.voice_id}`)
    if (!ok) for (const k of checks.filter(k => !k.ok)) console.log(`     FAIL ${k.name}: ${k.detail}`)
    results.push({ clip_id: c.clip_id, course: c.course_code, voice_id: c.voice_id,
      superseded_text: superseded, live_text: c.spoken_text, decode: c.decode || null,
      previous_s3_key: c.previous_s3_key, s3_key: c.s3_key,
      previous_revision: c.previous_revision, revision: c.audio_revision,
      pod_rows: mine.map(({ clip_id, ...r }) => r), checks, pass: ok })
  }
  fs.rmSync(tmp, { recursive: true, force: true })

  const passed = results.filter(r => r.pass).length
  const dest = path.join(__dirname, '..', '..', 'docs', 'a108', 'isl-ell-est-register-render-verification.json')
  fs.writeFileSync(dest, JSON.stringify({
    job: 'A-108 isl/ell/est render — independent post-hoc verification',
    date: '2026-08-14', read_only: true,
    clips: results.length, passed, failed: results.length - passed,
    pod_rows: podRows.length, results,
  }, null, 2) + '\n')
  console.log(`\n${passed}/${results.length} clips pass every check. ${podRows.length} pod rows covered.`)
  console.log(`written: ${dest}`)
  if (passed !== results.length) process.exitCode = 1
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
