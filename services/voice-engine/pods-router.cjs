/**
 * pods-router.cjs — HTTP surface for pod CASTING + per-voice RECORDING PLANS
 * (keystone: docs/voice-engine/design/pods-recording-model.md §1-2).
 *
 * NOT mounted by this file — production-api.cjs mounts it under the gated
 * prefix so the app-level app.param('courseCode') course-scope auth gate
 * fires for every route (mergeParams; the router must NOT declare
 * :courseCode internally):
 *
 *   app.use('/api/production/:courseCode/pods',
 *     require('./voice-engine/pods-router.cjs')({ requireDashboardUser,
 *       userCanAccessCourse, getDb: () => supabaseClient.getClient(), logger }))
 *
 * Endpoints:
 *   GET /cast                 current podCast + character inventory with line
 *                             counts (+ solver proposal when ?voices=N)
 *   PUT /cast                 { podCast: { speaker: {voiceId,name?,email?} | null } }
 *                             → surgical additive merge into
 *                             courses.voice_config.podCast (voices.* untouched)
 *   GET /recording-plan       ?voiceId= → ordered autocue queue with cues,
 *                             glue grouping, explainer queue, estimated minutes
 *
 * Writes touch ONLY voice_config.podCast — an additive key TTS serving never
 * reads — so no course-version bump is needed (serving output is unchanged).
 * No DDL, no S3, no TTS. Vocabulary: known / target / seed.
 */

'use strict'

const express = require('express')
const { proposeHumanCast } = require('../../tools/pod-voice-colour-n.cjs')
const {
  EXPLAINER_SPEAKER,
  mergePodCast,
  speakerInventory,
  hasGenerationColouring,
  buildSentenceEditPatch,
} = require('./pods-cast.cjs')
const { buildRecordingPlan, finalizeRecordingPlan, DEFAULT_CUE_COUNT } = require('./pods-plan.cjs')

const SENTENCE_COLUMNS =
  'id, pod_id, scene_number, global_order, speaker, target_text, known_text, explainer_text, glue_to_next, target_audio_id, known_audio_id, explainer_audio_id'
const PAGE_SIZE = 1000 // PostgREST max-rows silently truncates — always paginate

/**
 * @param {object} deps
 * @param {(req,res)=>Promise<object|null>} deps.requireDashboardUser - production-api helper (sends 401/403 itself)
 * @param {(user,courseCode)=>boolean} deps.userCanAccessCourse - production-api helper
 * @param {()=>object} deps.getDb - returns the Supabase service-role client
 * @param {object} [deps.logger]
 */
module.exports = function createPodsCastRouter({
  requireDashboardUser,
  userCanAccessCourse,
  getDb,
  logger = console,
}) {
  if (typeof requireDashboardUser !== 'function' || typeof userCanAccessCourse !== 'function' || typeof getDb !== 'function') {
    throw new Error('pods-router requires { requireDashboardUser, userCanAccessCourse, getDb }')
  }

  const router = express.Router({ mergeParams: true })

  // ── Course-scoped auth gate (same shape as team-router.cjs) ──────────────
  // Recorders may READ (they need their own recording plan) but never write
  // the cast — client-side confinement is not auth.
  router.use(async (req, res, next) => {
    try {
      const user = await requireDashboardUser(req, res)
      if (!user) return // 401/403 already sent
      const courseCode = req.params.courseCode
      if (!userCanAccessCourse(user, courseCode)) {
        return res.status(403).json({ error: `No access to course ${courseCode}` })
      }
      if (req.method !== 'GET' && user.role === 'recorder') {
        return res.status(403).json({ error: 'Recorders cannot change the cast' })
      }
      req.dashboardUser = user
      next()
    } catch (err) {
      logger.error('[PodsCast] Auth gate error:', err)
      res.status(500).json({ error: 'Authentication check failed' })
    }
  })

  // ── DB helpers (read-only except saveVoiceConfig) ─────────────────────────

  async function fetchVoiceConfig(db, courseCode) {
    const { data, error } = await db
      .from('courses')
      .select('voice_config')
      .eq('course_code', courseCode)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    if (!data) return { found: false, voiceConfig: null }
    return { found: true, voiceConfig: data.voice_config || null }
  }

  async function fetchPods(db, courseCode) {
    const { data, error } = await db
      .from('listening_pods')
      .select('id, slug, title, pod_type, pod_order, speakers, metadata')
      .eq('course_code', courseCode)
      .order('pod_order')
      .order('slug')
    if (error) throw error
    return data || []
  }

  async function fetchAllSentences(db, podIds) {
    if (!podIds.length) return []
    const out = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await db
        .from('listening_pod_sentences')
        .select(SENTENCE_COLUMNS)
        .in('pod_id', podIds)
        .order('pod_id')
        .order('global_order')
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      out.push(...(data || []))
      if (!data || data.length < PAGE_SIZE) break
    }
    return out
  }

  /** Roster humans holding this course (voice ids minted by the team flow). */
  async function fetchRosterVoices(db, courseCode) {
    const { data, error } = await db
      .from('dashboard_users')
      .select('email, name, role, courses, voice_id')
    if (error) throw error
    return (data || [])
      .filter(u => u.voice_id && (u.courses === '*' || (Array.isArray(u.courses) && u.courses.includes(courseCode))))
      .sort((a, b) => (a.email < b.email ? -1 : 1))
      .map(u => ({
        voiceId: u.voice_id,
        name: u.name || String(u.email || '').split('@')[0],
        email: u.email,
        gender: null, // dashboard_users carries no gender — leader overrides in the UI
      }))
  }

  // ── GET /cast ──────────────────────────────────────────────────────────────
  router.get('/cast', async (req, res) => {
    const { courseCode } = req.params
    try {
      const db = getDb()
      const [{ found, voiceConfig }, pods] = await Promise.all([
        fetchVoiceConfig(db, courseCode),
        fetchPods(db, courseCode),
      ])
      if (!found) return res.status(404).json({ error: `Course ${courseCode} not found` })

      const sentences = await fetchAllSentences(db, pods.map(p => p.id))
      const inventory = speakerInventory({ pods, sentences })
      const podCast = (voiceConfig && voiceConfig.podCast) || {}

      const body = {
        course_code: courseCode,
        podCast,
        speakers: inventory.speakers,
        explainer: { speaker: EXPLAINER_SPEAKER, ...inventory.explainer },
        // Addendum 2026-06-11: generation-side colouring present ⇒ consume it
        // verbatim; the solver below is only a fallback proposal.
        generationColouring: hasGenerationColouring(pods),
        rosterVoices: await fetchRosterVoices(db, courseCode),
      }

      // Solver proposal on request: ?voices=N (4-5 is the design centre).
      const voicesN = req.query.voices ? parseInt(String(req.query.voices), 10) : null
      if (voicesN) {
        if (!Number.isInteger(voicesN) || voicesN < 1 || voicesN > 12) {
          return res.status(400).json({ error: 'voices must be an integer between 1 and 12' })
        }
        // Real roster humans fill the first slots; unfilled slots get
        // placeholder ids so the leader still sees the SHAPE of the cast
        // (which characters can share one voice) before everyone has joined.
        const voices = body.rosterVoices.slice(0, voicesN)
        for (let i = voices.length + 1; i <= voicesN; i++) {
          voices.push({ voiceId: `pod_voice_${i}`, name: `Voice ${i}`, email: null, gender: null })
        }
        const genderBySpeaker = {}
        for (const sp of inventory.speakers) genderBySpeaker[sp.speaker] = sp.gender
        body.proposal = proposeHumanCast({ sentences, voices, genderBySpeaker })
      }

      res.json(body)
    } catch (err) {
      logger.error(`[PodsCast] GET cast failed for ${courseCode}:`, err)
      res.status(500).json({ error: 'Failed to load pod cast' })
    }
  })

  // ── PUT /cast — surgical additive merge into voice_config.podCast ─────────
  router.put('/cast', async (req, res) => {
    const { courseCode } = req.params
    try {
      const updates = req.body && req.body.podCast
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return res.status(400).json({ error: 'Body must be { podCast: { "<speaker>": { voiceId, name?, email? } | null } }' })
      }

      const db = getDb()
      const { found, voiceConfig } = await fetchVoiceConfig(db, courseCode)
      if (!found) return res.status(404).json({ error: `Course ${courseCode} not found` })

      let merged
      try {
        merged = mergePodCast(voiceConfig, updates)
      } catch (err) {
        return res.status(400).json({ error: err.message })
      }

      const { error } = await db
        .from('courses')
        .update({ voice_config: merged })
        .eq('course_code', courseCode)
      if (error) throw error
      // No bumpCourseVersion: podCast is an additive key TTS serving never
      // reads (keystone §1) — learner-facing output is byte-identical.

      logger.info(`[PodsCast] ${req.dashboardUser?.email || 'unknown'} updated podCast for ${courseCode} (${Object.keys(updates).length} speaker(s))`)
      res.json({ success: true, course_code: courseCode, podCast: merged.podCast })
    } catch (err) {
      logger.error(`[PodsCast] PUT cast failed for ${courseCode}:`, err)
      res.status(500).json({ error: 'Failed to save pod cast' })
    }
  })

  // ── GET /recording-plan?voiceId= ──────────────────────────────────────────
  router.get('/recording-plan', async (req, res) => {
    const { courseCode } = req.params
    const voiceId = req.query.voiceId ? String(req.query.voiceId) : null
    if (!voiceId) return res.status(400).json({ error: 'voiceId query parameter required' })
    const cueCount = req.query.cues ? Math.max(0, Math.min(5, parseInt(String(req.query.cues), 10) || 0)) : DEFAULT_CUE_COUNT
    try {
      const db = getDb()
      const [{ found, voiceConfig }, pods] = await Promise.all([
        fetchVoiceConfig(db, courseCode),
        fetchPods(db, courseCode),
      ])
      if (!found) return res.status(404).json({ error: `Course ${courseCode} not found` })

      const podCast = (voiceConfig && voiceConfig.podCast) || {}
      const sentences = await fetchAllSentences(db, pods.map(p => p.id))
      const plan = buildRecordingPlan({ pods, sentences, podCast, voiceId, cueCount })
      const final = await finalizeRecordingPlan({
        plan, sentences, voiceId,
        fetchAudioRows: async (ids) => {
          const out = []
          for (let i = 0; i < ids.length; i += 200) {
            const { data, error } = await db.from('course_audio')
              .select('id, origin, voice_id').in('id', ids.slice(i, i + 200))
            if (error) throw new Error(error.message)
            out.push(...(data || []))
          }
          return out
        },
      })
      const castEntry = Object.values(podCast).find(e => e && e.voiceId === voiceId)
      res.json({
        course_code: courseCode,
        courseCode,
        voiceName: (castEntry && castEntry.name) || null,
        speakers: final.castSpeakers,
        ...final,
      })
    } catch (err) {
      logger.error(`[PodsCast] recording-plan failed for ${courseCode}/${voiceId}:`, err)
      res.status(500).json({ error: 'Failed to build recording plan' })
    }
  })

  // ── PATCH /sentence/:sentenceId — community script editing ───────────────
  // Course editors fix the generated script BEFORE (or after) recording:
  // target/known/explainer text. Clearing the edited line's audio pointer is
  // what resurfaces it in the recording plan; the old audio ROW is never
  // deleted. (The legacy admin-only /api/admin/pod-sentences/:id stays for
  // back-compat; this is the per-course-scoped door community leaders use.)
  router.patch('/sentence/:sentenceId', async (req, res) => {
    const { courseCode, sentenceId } = req.params
    const patch = buildSentenceEditPatch(req.body || {})
    if (!patch) return res.status(400).json({ error: 'target_text, known_text or explainer_text required' })
    try {
      const db = getDb()
      // The sentence must belong to a pod of THIS course — the URL's course
      // is what the gate authorized, so verify before writing.
      const { data: sentence, error: fetchError } = await db
        .from('listening_pod_sentences')
        .select('id, pod_id, target_audio_id, known_audio_id, explainer_audio_id')
        .eq('id', sentenceId)
        .maybeSingle()
      if (fetchError) throw new Error(fetchError.message)
      if (!sentence) return res.status(404).json({ error: `sentence not found: ${sentenceId}` })
      const { data: pod, error: podError } = await db
        .from('listening_pods')
        .select('id, course_code')
        .eq('id', sentence.pod_id)
        .maybeSingle()
      if (podError) throw new Error(podError.message)
      if (!pod || pod.course_code !== courseCode) {
        return res.status(403).json({ error: `Sentence does not belong to course ${courseCode}` })
      }

      const cleared = {}
      for (const col of ['target_audio_id', 'known_audio_id', 'explainer_audio_id']) {
        if (col in patch && sentence[col]) cleared[col] = sentence[col]
      }
      const { data: updated, error: updateError } = await db
        .from('listening_pod_sentences')
        .update(patch)
        .eq('id', sentenceId)
        .select('id, target_text, known_text, explainer_text, target_audio_id, known_audio_id, explainer_audio_id')
        .single()
      if (updateError) throw new Error(updateError.message)
      if (Object.keys(cleared).length) {
        logger.info(`[PodsEdit] ${courseCode} ${sentenceId} edited by ${req.dashboardUser?.email || '?'} — unlinked ${JSON.stringify(cleared)} (rows kept)`)
      }
      res.json({ ok: true, sentence: updated, unlinkedAudio: cleared })
    } catch (err) {
      logger.error(`[PodsEdit] ${courseCode}/${sentenceId} failed:`, err)
      res.status(500).json({ error: 'Failed to save sentence edit' })
    }
  })

  return router
}
