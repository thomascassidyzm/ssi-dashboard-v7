/**
 * The audio half of the Pod 1 sentence cuts (job #570; the rules are pod-english-split-cuts.cjs). Three acts, no render:
 *
 *   fetch(clip)          the whole-line clip's bytes, from S3 (signed URL)
 *   cut(buffer, n)       tools/pods/splice.py — ffmpeg silence detection, cut at the n-1 longest interior pauses with
 *                        50 ms of pause kept each side and a 15 ms fade; returns its measurement and the pieces' bytes.
 *                        The same cutter and thresholds job #343 measured; reimplementing it would let it drift.
 *   store(piece)         one piece as a course_audio row, through the booth's own clip storage (s3-production-service
 *                        uploadRecording, the canon mastered/{UUID}.mp3 key). Role 'pod_fine_known' — the per-sentence
 *                        English role — and NOT 'known': a cut of "Of course." must never share an identity (or, through
 *                        the canonical-clip trigger, its bytes) with a take he records of "Of course." on its own.
 *                        Same words already cut for this course and voice = that clip is used (the unique identity).
 *
 * No clip is deleted, here or anywhere in this job.
 */
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { randomUUID } = require('crypto')
const { normalizeForAudio } = require('../shared/text-normalize.cjs')
const { canonicalVoiceId } = require('../shared/clip-identity.cjs')

const run = promisify(execFile)
const SPLICE_PY = path.join(__dirname, '..', '..', 'tools', 'pods', 'splice.py')
const PIECE_ROLE = 'pod_fine_known'

function createSplitCutAudio({ db, s3 = require('../s3-production-service.cjs'), python = 'python3' } = {}) {
  return {
    async fetch(clip) {
      const url = await s3.getAudioSignedUrl(clip.id, 600, { s3Key: clip.s3_key })
      const r = await fetch(url)
      if (!r.ok) throw new Error(`clip ${clip.id} bytes unreadable: HTTP ${r.status}`)
      return Buffer.from(await r.arrayBuffer())
    },

    async cut(buffer, n) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pod-split-cut-'))
      try {
        const src = path.join(dir, 'whole.mp3')
        fs.writeFileSync(src, buffer)
        const { stdout } = await run(python, [SPLICE_PY, src, String(n), path.join(dir, 'piece')], { timeout: 60_000 })
        const splice = JSON.parse(stdout)
        const buffers = (splice.pieces || []).map((p) => fs.readFileSync(path.join(dir, p.file)))
        return { splice, buffers }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true })
      }
    },

    async store({ courseCode, text, voiceId, origin, buffer, durationMs, cutFrom }) {
      const identity = { course_code: courseCode, text_normalized: normalizeForAudio(text), language: 'eng', role: PIECE_ROLE, voice_id: canonicalVoiceId(voiceId) }
      const { data: had, error: readErr } = await db.from('course_audio').select('id').match(identity).maybeSingle()
      if (readErr) throw new Error(`piece lookup failed for "${text}": ${readErr.message}`)
      if (had) return { audioId: had.id, reused: true }
      const uuid = randomUUID().toUpperCase()
      const s3Key = `mastered/${uuid}.mp3`
      await s3.uploadRecording(courseCode, uuid, buffer, { recordedBy: origin === 'human' ? 'human' : 'tts', via: 'pod-sentence-cut', cutFrom, job: '570' }, { s3Key })
      const { data, error } = await db.from('course_audio')
        .insert({ ...identity, text, origin, s3_key: s3Key, duration_ms: durationMs, file_size_bytes: buffer.length })
        .select('id').single()
      if (error) throw new Error(`course_audio write failed for the "${text}" piece: ${error.message} (object ${s3Key} is in S3)`)
      return { audioId: data.id, reused: false }
    },
  }
}

module.exports = { createSplitCutAudio, PIECE_ROLE, SPLICE_PY }
