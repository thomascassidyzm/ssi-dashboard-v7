/**
 * recordist-router.cjs — the ONE recordist surface (/api/recording/*).
 *
 * Tom, 2026-08-14: the human-recording flow was five surfaces. This is the
 * backend for the one that replaces them. Human recording is for the languages
 * WE DECIDE we have no TTS voice for; `language_recording_policy` is the single
 * place that decision lives, and routes 4/5 below are its control surface.
 *
 * LINK IS IDENTITY (routes 1-3). No login, no account, no role check, no voice
 * slot to assign: the voice id in the URL IS the claim, checked against the
 * policy table, and every take is attributed to that voice from the first tap.
 * Aran gets a link, taps it, and reads. Nothing else. The admin routes (4/5)
 * keep the estate's normal auth, because they change what everyone else sees.
 *
 *   GET  /voice/:voiceId                    the by-language queue (recordist-queue.cjs)
 *   POST /voice/:voiceId/take               a take → the EXISTING upload seam
 *   GET  /voice/:voiceId/line/:lineId/clip  the STORED bytes, for playback
 *   GET  /coverage                          per-language bar (every human_only language)
 *   GET  /languages  PUT /languages/:language   the policy itself (admin)
 *
 * The take route does NOT contain an uploader. It adapts its body into the
 * shape of POST /api/production/:courseCode/recording/upload and calls that
 * handler, so raw/{UUID}.{ext} archive-BEFORE-process (the fix that exists
 * because the T-20 originals were lost), both take refusals, provenance and pod
 * registration are literally the same code on both surfaces.
 */

'use strict'

const express = require('express')
const Busboy = require('busboy')
const {
  resolveRecordist,
  buildQueue,
  buildCoverage,
  loadPolicies,
  languageName,
  propagateTakeToDuplicates,
} = require('./recordist-queue.cjs')
const { canonicalLanguage, canonicalVoiceId, ClipIdentityError } = require('../shared/clip-identity.cjs')
const { audioKeyCandidates } = require('../shared/text-normalize.cjs')

const MAX_TAKE_BYTES = 60 * 1024 * 1024

/**
 * Parse a multipart take: one audio file part plus text fields.
 * Kept here rather than pulling in a middleware — this is the only multipart
 * route on the service, and a request-scoped parse cannot leak into others.
 */
function parseMultipartTake(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_TAKE_BYTES } })
    const fields = {}
    const chunks = []
    let mimeType = null
    let truncated = false

    busboy.on('field', (name, value) => { fields[name] = value })
    busboy.on('file', (_name, stream, info) => {
      mimeType = info.mimeType || info.mimetype || null
      stream.on('data', (d) => chunks.push(d))
      stream.on('limit', () => { truncated = true })
    })
    busboy.on('error', reject)
    busboy.on('close', () => {
      if (truncated) return reject(new Error(`take exceeds ${MAX_TAKE_BYTES} bytes`))
      resolve({ fields, buffer: chunks.length ? Buffer.concat(chunks) : null, mimeType })
    })
    req.pipe(busboy)
  })
}

/**
 * Run the production upload handler and capture what it would have sent,
 * instead of sending it. The handler stays the single source of truth for how a
 * take is stored; this route owns only the recordist-shaped response.
 */
function captureResponse() {
  const captured = { status: 200, body: null }
  const res = {
    status(code) { captured.status = code; return res },
    json(body) { captured.body = body; return res },
    send(body) { captured.body = body; return res },
  }
  return { res, captured }
}

module.exports = function createRecordistRouter({
  getDb,
  logger = console,
  requireAdmin,
  handleRecordingUpload,
  // Injectable only so the route's variant handling is testable without S3.
  s3 = require('../s3-production-service.cjs'),
}) {
  const router = express.Router()

  const db = () => {
    const client = getDb()
    if (!client) throw Object.assign(new Error('Supabase not initialized'), { status: 503 })
    return client
  }

  /** Resolve :voiceId or answer 404 — the only gate routes 1-3 have, by design. */
  async function recordistOr404(req, res) {
    const recordist = await resolveRecordist(db(), req.params.voiceId)
    if (!recordist) {
      res.status(404).json({
        error: `No recording voice ${req.params.voiceId}. A recording link is only live while ` +
          `language_recording_policy names that voice for a language.`,
      })
      return null
    }
    return recordist
  }

  // ── 1. the queue ───────────────────────────────────────────────────────────
  router.get('/voice/:voiceId', async (req, res) => {
    try {
      const recordist = await recordistOr404(req, res)
      if (!recordist) return
      const includeRecorded = req.query.includeRecorded === '1' || req.query.includeRecorded === 'true'
      const queue = await buildQueue(db(), recordist, { includeRecorded })
      res.json({
        voiceId: recordist.voiceId,
        displayName: recordist.displayName,
        language: recordist.language,
        languageName: recordist.languageName,
        gender: recordist.gender,
        total: queue.total,
        recorded: queue.recorded,
        remaining: queue.remaining,
        lines: queue.lines,
      })
    } catch (err) {
      logger.error(`[Recordist] queue: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── 2. a take ──────────────────────────────────────────────────────────────
  router.post('/voice/:voiceId/take', async (req, res) => {
    try {
      const recordist = await recordistOr404(req, res)
      if (!recordist) return

      const isMultipart = String(req.headers['content-type'] || '').includes('multipart/form-data')
      let lineId, text, audioBase64, mimeType
      if (isMultipart) {
        const parsed = await parseMultipartTake(req)
        lineId = parsed.fields.lineId
        text = parsed.fields.text
        mimeType = parsed.fields.mimeType || parsed.mimeType || 'audio/webm'
        if (!parsed.buffer || !parsed.buffer.length) {
          return res.status(400).json({ error: 'no audio part in the upload' })
        }
        audioBase64 = parsed.buffer.toString('base64')
      } else {
        // JSON base64 is accepted too: it is what every existing recorder client
        // on this estate sends, and refusing it would make the one surface
        // reachable by fewer clients than the five it replaces.
        lineId = req.body.lineId
        text = req.body.text
        mimeType = req.body.mimeType || 'audio/webm'
        audioBase64 = req.body.audioData
        if (!audioBase64) return res.status(400).json({ error: 'audioData (base64) or a multipart audio part required' })
      }
      if (!lineId) return res.status(400).json({ error: 'lineId required' })

      // The line decides the course; the recordist decides the voice.
      const { data: sentence, error: sentErr } = await db()
        .from('listening_pod_sentences')
        .select('id, pod_id, target_text, target_audio_id')
        .eq('id', lineId)
        .maybeSingle()
      if (sentErr) throw new Error(`line lookup failed: ${sentErr.message}`)
      if (!sentence) return res.status(404).json({ error: `No line ${lineId}` })

      const { data: pod, error: podErr } = await db()
        .from('listening_pods').select('id, course_code').eq('id', sentence.pod_id).maybeSingle()
      if (podErr) throw new Error(`pod lookup failed: ${podErr.message}`)
      if (!pod) return res.status(404).json({ error: `Line ${lineId} has no pod` })

      const lineText = (sentence.target_text || '').trim()
      if (text && text.trim() && text.trim() !== lineText) {
        // The stored line is authoritative; a client-sent text that disagrees is
        // a stale queue, and silently recording it would file the take under an
        // identity no queue will ever look up again.
        return res.status(409).json({
          error: 'The text on this line has changed since the queue was loaded — reload before recording it.',
          expected: lineText,
          received: text.trim(),
        })
      }

      // Hand the take to the production upload seam, in pod mode. voiceId is
      // forced to the POLICY voice (req.recordistVoiceId) so one person's clips
      // stay one identity across every course of the language.
      const { res: innerRes, captured } = captureResponse()
      const innerReq = {
        params: { courseCode: pod.course_code },
        headers: { authorization: req.headers.authorization },
        socket: req.socket,
        recordistVoiceId: recordist.voiceId,
        body: {
          audioData: audioBase64,
          mimeType,
          metadata: {
            mode: 'pod',
            podId: pod.id,
            sentenceId: sentence.id,
            kind: 'target',
            text: lineText,
            voiceId: recordist.voiceId,
          },
          provenance: {
            recorded_by: recordist.email || recordist.displayName,
            mode: 'recordist',
          },
        },
      }
      await handleRecordingUpload(innerReq, innerRes)
      if (captured.status >= 400 || !captured.body || !captured.body.success) {
        return res.status(captured.status >= 400 ? captured.status : 500).json(captured.body || { error: 'upload failed' })
      }

      const audioId = captured.body.uuid
      // One recording fills every duplicate of this line across the language —
      // the other half of the queue's dedupe promise. Runs AFTER the take is
      // stored (make-before-break); a failure here never fails the take.
      let propagation = { linked: [] }
      try {
        propagation = await propagateTakeToDuplicates({
          db: db(),
          recordist,
          sentenceId: sentence.id,
          text: lineText,
          s3Key: captured.body.s3Key,
          durationMs: captured.body.audioProcessing ? captured.body.audioProcessing.durationMs : null,
          logger,
        })
      } catch (propErr) {
        logger.error(`[Recordist] propagation failed (take is stored and linked): ${propErr.message}`)
      }

      res.json({
        ok: true,
        audioId,
        clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${sentence.id}/clip`,
        alsoFilled: propagation.linked.length,
        rawKey: captured.body.rawKey || null,
      })
    } catch (err) {
      logger.error(`[Recordist] take: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── 3. the stored bytes ────────────────────────────────────────────────────
  // `?variant=raw` serves the UNTOUCHED original instead of the mastered clip,
  // so a recordist can hear what the processing chain did to their take before
  // deciding to re-read anything (T-20: 107 Welsh clips lost their heads and
  // nobody could hear it, because there was nothing to compare against).
  // Default stays `processed` — every existing caller is untouched.
  router.get('/voice/:voiceId/line/:lineId/clip', async (req, res) => {
    try {
      const variant = req.query.variant === undefined || req.query.variant === ''
        ? 'processed'
        : String(req.query.variant)
      if (variant !== 'processed' && variant !== 'raw') {
        return res.status(400).json({
          error: `variant must be 'processed' or 'raw' (got '${variant}')`,
          reason: 'bad_variant',
        })
      }
      const recordist = await recordistOr404(req, res)
      if (!recordist) return

      const { data: sentence, error: sentErr } = await db()
        .from('listening_pod_sentences')
        .select('id, target_text, target_audio_id')
        .eq('id', req.params.lineId)
        .maybeSingle()
      if (sentErr) throw new Error(`line lookup failed: ${sentErr.message}`)
      if (!sentence) return res.status(404).json({ error: `No line ${req.params.lineId}` })

      let row = null
      if (sentence.target_audio_id) {
        const { data } = await db()
          .from('course_audio').select('id, s3_key, voice_id, language')
          .eq('id', sentence.target_audio_id).maybeSingle()
        // Only the recordist's OWN take is served back to them here: a line
        // whose FK still points at another voice's clip is not "their clip".
        if (data && recordist.spellings.includes(data.voice_id)) row = data
      }
      if (!row) {
        // The FK may not have been set (another course's copy of the same line),
        // so fall back to the clip's identity: (language, text, voice).
        const { data } = await db()
          .from('course_audio')
          .select('id, s3_key, voice_id, language, created_at')
          .eq('language', recordist.language)
          .in('voice_id', recordist.spellings)
          .in('text_normalized', audioKeyCandidates((sentence.target_text || '').trim()))
          .order('created_at', { ascending: false })
          .limit(1)
        row = data && data[0] ? data[0] : null
      }
      if (!row) {
        return res.status(404).json({ error: 'No stored take for this line yet', reason: 'no_take' })
      }

      if (variant === 'raw') {
        // One HEAD, paid only because a human asked to compare. The raw key
        // lives in the mastered object's own metadata — there is no column.
        const { url, rawKey, notFound } = await s3.getRawSignedUrl(row.s3_key, 3600)
        if (!rawKey) {
          return res.status(404).json({
            error: notFound
              ? 'The processed clip for this take is missing from storage, so its original cannot be found.'
              : 'No original was kept for this take — it was recorded before 2026-08-14, when raw originals started being retained.',
            reason: notFound ? 'mastered_missing' : 'no_raw_retained',
            audioId: row.id,
            variant: 'raw',
          })
        }
        if (req.query.json === '1') return res.json({ audioId: row.id, s3Key: rawKey, url, variant: 'raw' })
        return res.redirect(302, url)
      }

      const url = await s3.getAudioSignedUrl(row.id, 3600, { s3Key: row.s3_key })
      if (req.query.json === '1') return res.json({ audioId: row.id, s3Key: row.s3_key, url, variant: 'processed' })
      res.redirect(302, url)
    } catch (err) {
      logger.error(`[Recordist] clip: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── 4. coverage ────────────────────────────────────────────────────────────
  router.get('/coverage', async (req, res) => {
    try {
      res.json(await buildCoverage(db()))
    } catch (err) {
      logger.error(`[Recordist] coverage: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── 5. the policy itself (admin) ───────────────────────────────────────────
  router.get('/languages', async (req, res) => {
    try {
      if (requireAdmin && !(await requireAdmin(req, res))) return
      const rows = await loadPolicies(db())
      res.json(rows.map((r) => ({
        language: r.language,
        languageName: languageName(r.language),
        humanOnly: !!r.human_only,
        voices: r.voices || {},
        notes: r.notes || null,
        updatedAt: r.updated_at,
      })))
    } catch (err) {
      logger.error(`[Recordist] languages: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.put('/languages/:language', async (req, res) => {
    try {
      if (requireAdmin && !(await requireAdmin(req, res))) return

      let language
      try {
        language = canonicalLanguage(req.params.language)
      } catch (e) {
        if (e instanceof ClipIdentityError) return res.status(400).json({ error: e.message })
        throw e
      }

      const { humanOnly, voices, notes } = req.body || {}
      if (humanOnly !== undefined && typeof humanOnly !== 'boolean') {
        return res.status(400).json({ error: 'humanOnly must be a boolean' })
      }
      if (voices !== undefined) {
        if (!voices || typeof voices !== 'object' || Array.isArray(voices)) {
          return res.status(400).json({ error: 'voices must be an object keyed by gender' })
        }
        for (const [gender, entry] of Object.entries(voices)) {
          if (!['m', 'f'].includes(gender)) return res.status(400).json({ error: `voices key must be 'm' or 'f' (got ${gender})` })
          if (!entry || !entry.voiceId) return res.status(400).json({ error: `voices.${gender}.voiceId required` })
          try {
            // Refuse an unspellable voice here rather than mint a queue nobody
            // can be paid attribution under.
            canonicalVoiceId(entry.voiceId)
          } catch (e) {
            return res.status(400).json({ error: `voices.${gender}.voiceId: ${e.message}` })
          }
        }
      }

      const { data: existing } = await db()
        .from('language_recording_policy').select('*').eq('language', language).maybeSingle()

      const row = {
        language,
        human_only: humanOnly !== undefined ? humanOnly : (existing ? existing.human_only : false),
        voices: voices !== undefined ? voices : (existing ? existing.voices : {}),
        notes: notes !== undefined ? notes : (existing ? existing.notes : null),
      }
      const { data, error } = await db()
        .from('language_recording_policy')
        .upsert(row, { onConflict: 'language' })
        .select()
        .single()
      if (error) throw new Error(`policy write failed: ${error.message}`)
      logger.log(`[Recordist] policy ${language}: human_only=${data.human_only}, voices=${Object.keys(data.voices || {}).join('/') || 'none'}`)
      res.json({
        language: data.language,
        languageName: languageName(data.language),
        humanOnly: !!data.human_only,
        voices: data.voices || {},
        notes: data.notes || null,
        updatedAt: data.updated_at,
      })
    } catch (err) {
      logger.error(`[Recordist] policy write: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  return router
}
