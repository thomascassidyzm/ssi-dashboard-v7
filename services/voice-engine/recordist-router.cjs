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
  clearRerecordWants,
  clearKnownRerecordWant,
  splitLineId,
} = require('./recordist-queue.cjs')
const { canonicalLanguage, canonicalVoiceId, ClipIdentityError } = require('../shared/clip-identity.cjs')
const { audioKeyCandidates } = require('../shared/text-normalize.cjs')
const { bucketKey } = require('../shared/dialect.cjs')

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
        // Which accent this queue is. The recordist should be able to see, on
        // their own page, which of a language's dialects they are reading.
        dialect: recordist.dialect,
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

  /**
   * A take for a queue item that is a flagged CLIP rather than a pod line
   * (narration, encouragement, instruction — see the note at the call site).
   * Regeneration mode: same upload seam, same raw archive, same refusals.
   */
  async function recordRerecordClip({ req, res, recordist, lineId, text, audioBase64, mimeType, device }) {
    const { data: clip, error: clipErr } = await db()
      .from('course_audio')
      .select('id, course_code, text, role, language, voice_id, s3_key, rerecord_wanted')
      .eq('id', lineId)
      .maybeSingle()
    // An id that is neither a pod line nor a clip is the old 404, unchanged.
    if (clipErr && clipErr.code !== '22P02') throw new Error(`clip lookup failed: ${clipErr.message}`)
    if (!clip) return res.status(404).json({ error: `No line ${lineId}` })

    if (!clip.rerecord_wanted) {
      return res.status(409).json({
        error: 'That clip is not queued for a re-record. This surface re-records what was asked for, ' +
          'and nothing else.',
      })
    }
    if (clip.language !== recordist.language) {
      return res.status(403).json({ error: `Clip ${lineId} is ${clip.language}, not ${recordist.language}` })
    }

    const clipText = (clip.text || '').trim()
    if (text && text.trim() && text.trim() !== clipText) {
      return res.status(409).json({
        error: 'The text on this line has changed since the queue was loaded — reload before recording it.',
        expected: clipText,
        received: text.trim(),
      })
    }

    const { res: innerRes, captured } = captureResponse()
    await handleRecordingUpload({
      params: { courseCode: clip.course_code },
      headers: { authorization: req.headers.authorization },
      socket: req.socket,
      recordistVoiceId: recordist.voiceId,
      // uuid + no pod/script metadata IS regeneration mode: the row is looked up
      // before the S3 PUT, so a bad id cannot orphan bytes.
      body: {
        uuid: clip.id,
        audioData: audioBase64,
        mimeType,
        metadata: { text: clipText, role: clip.role, voiceId: recordist.voiceId },
        provenance: {
          recorded_by: recordist.email || recordist.displayName,
          mode: 'recordist',
          recording_device: device || null,
        },
      },
    }, innerRes)
    if (captured.status >= 400 || !captured.body || !captured.body.success) {
      return res.status(captured.status >= 400 ? captured.status : 500).json(captured.body || { error: 'upload failed' })
    }

    // Retire the want by ID, not by clip identity. Narration lives in the shared
    // untagged 'human' voice bucket, so an identity-based clear would not match
    // this row and the line would be asked for again forever.
    let retired = 0
    try {
      const { error } = await db().from('course_audio').update({ rerecord_wanted: null }).eq('id', clip.id)
      if (error) logger.error(`[Recordist] want clear failed for ${clip.id}: ${error.message}`)
      else retired = 1
    } catch (wantErr) {
      logger.error(`[Recordist] want clear threw (take is stored): ${wantErr.message}`)
    }

    return res.json({
      ok: true,
      audioId: clip.id,
      kind: 'rerecord',
      role: clip.role,
      alsoFilled: 0,
      rawKey: captured.body.rawKey || null,
      wantsRetired: retired,
    })
  }

  // ── 2. a take ──────────────────────────────────────────────────────────────
  router.post('/voice/:voiceId/take', async (req, res) => {
    try {
      const recordist = await recordistOr404(req, res)
      if (!recordist) return

      const isMultipart = String(req.headers['content-type'] || '').includes('multipart/form-data')
      // What recorded this take — the recordist's chosen mic and their browser.
      // It was NULL on all 154 archived takes when the clipping was diagnosed,
      // which made "which device, which browser" unanswerable and left a mime
      // string standing in for a code path. The client sends it now.
      let lineId, text, audioBase64, mimeType, device
      if (isMultipart) {
        const parsed = await parseMultipartTake(req)
        lineId = parsed.fields.lineId
        text = parsed.fields.text
        device = parsed.fields.device || null
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
        device = req.body.device || null
        audioBase64 = req.body.audioData
        if (!audioBase64) return res.status(400).json({ error: 'audioData (base64) or a multipart audio part required' })
      }
      if (!lineId) return res.status(400).json({ error: 'lineId required' })

      // A queue id may name the KNOWN track of a pod line (`<id>#known`) — the
      // opt-in exception described in recordist-queue.cjs. The suffix decides
      // which track the take is filed under, and nothing else.
      const { sentenceId: lineSentenceId, track } = splitLineId(lineId)

      // The line decides the course; the recordist decides the voice.
      const { data: sentence, error: sentErr } = await db()
        .from('listening_pod_sentences')
        .select('id, pod_id, target_text, known_text, target_audio_id, rerecord_wanted')
        .eq('id', lineSentenceId)
        .maybeSingle()
      if (sentErr) throw new Error(`line lookup failed: ${sentErr.message}`)

      // NOT A POD LINE — a flagged re-record of some other content type.
      //
      // The queue is content-type-agnostic by design (Tom, 2026-08-14: the
      // failing LEGO-narration clips "ride the new queue's existing design"),
      // and it has been emitting those items since. This route was not: it
      // resolved every lineId against listening_pod_sentences, so all 18 live
      // Welsh narration re-records answered 404 on tap — 17 of them in Aran's
      // queue, waiting for his first session.
      //
      // A re-record of an existing clip is exactly what the upload seam's
      // REGENERATION mode is for: the course_audio row keeps its id and its
      // s3_key moves to a fresh object, so the 18 course_legos rows pointing at
      // it keep working with no relink, and the old object stays at the old key
      // for reversibility. Only a clip that ASKED for a new take is accepted —
      // this is a re-record path, never a way to overwrite arbitrary audio.
      if (!sentence) {
        return recordRerecordClip({ req, res, recordist, lineId, text, audioBase64, mimeType, device })
      }

      const { data: pod, error: podErr } = await db()
        .from('listening_pods').select('id, course_code').eq('id', sentence.pod_id).maybeSingle()
      if (podErr) throw new Error(`pod lookup failed: ${podErr.message}`)
      if (!pod) return res.status(404).json({ error: `Line ${lineId} has no pod` })

      const isKnownTrack = track === 'known'
      if (isKnownTrack && !(sentence.rerecord_wanted && sentence.rerecord_wanted.known)) {
        return res.status(409).json({
          error: 'That line is not asking for its English to be recorded. The known side is normally ' +
            'synthesised; a human reads it only where the pod line itself says so.',
        })
      }
      const lineText = (isKnownTrack ? (sentence.known_text || '') : (sentence.target_text || '')).trim()
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
            kind: isKnownTrack ? 'known' : 'target',
            text: lineText,
            voiceId: recordist.voiceId,
          },
          provenance: {
            recorded_by: recordist.email || recordist.displayName,
            mode: 'recordist',
            recording_device: device || null,
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
      // A known take is bespoke by definition — that is why a human is reading
      // it at all — so nothing else in the language shares it: no propagation,
      // and only this one sentence's want to retire.
      if (isKnownTrack) {
        let knownRetired = 0
        try {
          knownRetired = await clearKnownRerecordWant({ db: db(), sentenceId: sentence.id, logger })
        } catch (wantErr) {
          logger.error('[Recordist] known want retirement failed (take is stored): ' + wantErr.message)
        }
        return res.json({
          ok: true,
          audioId: captured.body.uuid,
          kind: 'known',
          clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${encodeURIComponent(lineId)}/clip`,
          alsoFilled: 0,
          rawKey: captured.body.rawKey || null,
          wantsRetired: knownRetired,
        })
      }

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

      // The line was queued BECAUSE a re-record was wanted; that want is now
      // satisfied. Retired last, after the take is stored, linked and
      // propagated — and never allowed to fail the take.
      let retired = { clips: 0, sentences: 0 }
      try {
        retired = await clearRerecordWants({ db: db(), recordist, text: lineText, sentenceId: sentence.id, logger })
      } catch (wantErr) {
        logger.error(`[Recordist] want retirement failed (take is stored and linked): ${wantErr.message}`)
      }

      res.json({
        ok: true,
        audioId,
        clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${sentence.id}/clip`,
        alsoFilled: propagation.linked.length,
        rawKey: captured.body.rawKey || null,
        wantsRetired: retired.clips + retired.sentences,
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

      const { sentenceId: clipSentenceId, track: clipTrack } = splitLineId(req.params.lineId)
      const { data: sentence, error: sentErr } = await db()
        .from('listening_pod_sentences')
        .select('id, target_text, known_text, target_audio_id, known_audio_id')
        .eq('id', clipSentenceId)
        .maybeSingle()
      if (sentErr) throw new Error(`line lookup failed: ${sentErr.message}`)
      if (!sentence) return res.status(404).json({ error: `No line ${req.params.lineId}` })

      const isKnownTrack = clipTrack === 'known'
      const trackText = (isKnownTrack ? sentence.known_text : sentence.target_text) || ''
      const trackAudioId = isKnownTrack ? sentence.known_audio_id : sentence.target_audio_id

      let row = null
      if (trackAudioId) {
        const { data } = await db()
          .from('course_audio').select('id, s3_key, voice_id, language')
          .eq('id', trackAudioId).maybeSingle()
        // Only the recordist's OWN take is served back to them here: a line
        // whose FK still points at another voice's clip is not "their clip".
        if (data && recordist.spellings.includes(data.voice_id)) row = data
      }
      if (!row && !isKnownTrack) {
        // The FK may not have been set (another course's copy of the same line),
        // so fall back to the clip's identity: (language, text, voice). Target
        // track only — a known clip is stored under the KNOWN language, and
        // widening this read to it would serve back the wrong language.
        const { data } = await db()
          .from('course_audio')
          .select('id, s3_key, voice_id, language, created_at')
          .eq('language', recordist.language)
          .in('voice_id', recordist.spellings)
          .in('text_normalized', audioKeyCandidates(trackText.trim()))
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
        // A slot is 'm' / 'f' for a single-dialect language, or 'm:<dialect>' /
        // 'f:<dialect>' when the language has more than one — Welsh needs four
        // slots, not two, and a key of 'm' alone cannot say which accent it
        // means. The gender is the leading token; the dialect is stated on the
        // ENTRY (entry.dialect), because the slot key is only a unique name and
        // the tag is the thing the queue routes on.
        const seenBuckets = new Set()
        for (const [slot, entry] of Object.entries(voices)) {
          const gender = String(slot).split(':')[0]
          if (!['m', 'f'].includes(gender)) return res.status(400).json({ error: `voices key must be 'm', 'f', 'm:<dialect>' or 'f:<dialect>' (got ${slot})` })
          if (!entry || !entry.voiceId) return res.status(400).json({ error: `voices.${slot}.voiceId required` })
          if (entry.gender !== undefined && String(entry.gender).toLowerCase() !== gender) {
            return res.status(400).json({ error: `voices.${slot}.gender (${entry.gender}) contradicts its slot key` })
          }
          if (entry.dialect !== undefined && (typeof entry.dialect !== 'string' || !entry.dialect.trim())) {
            return res.status(400).json({ error: `voices.${slot}.dialect must be a non-empty string when given` })
          }
          // Two voices in one (dialect, gender) bucket is not a richer cast, it
          // is an ambiguous queue: the second one would silently never be read.
          const bucket = bucketKey(entry.dialect, gender)
          if (seenBuckets.has(bucket)) {
            return res.status(400).json({ error: `two voices share the bucket ${bucket} — one voice per gender per dialect` })
          }
          seenBuckets.add(bucket)
          try {
            // Refuse an unspellable voice here rather than mint a queue nobody
            // can be paid attribution under.
            canonicalVoiceId(entry.voiceId)
          } catch (e) {
            return res.status(400).json({ error: `voices.${slot}.voiceId: ${e.message}` })
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
