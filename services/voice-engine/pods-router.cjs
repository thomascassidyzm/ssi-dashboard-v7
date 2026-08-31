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
 *   POST /cast/propose        { people: [{name, gender?, email?, guide?}] } →
 *                             PEOPLE-FIRST solve: assignments per person,
 *                             plain-language warnings, feasibility
 *                             (GET variant takes ?people=<JSON> for tooling)
 *   PUT /cast                 { podCast: { speaker: {voiceId,name?,email?,gender?} | null } }
 *                             → surgical additive merge into
 *                             courses.voice_config.podCast (voices.* untouched)
 *                             + AUTO-PROVISIONING: cast entries carrying an
 *                             email get dashboard access (create recorder row
 *                             mirroring the invite-redeem shape, or add this
 *                             course to an existing courses[] — role/voice_id
 *                             of existing users NEVER touched)
 *   GET /drafts               every pod line whose target text is an unproofread
 *                             machine DRAFT, course-wide, with the English
 *                             beside it and who is cast to read it
 *   GET /recording-plan       ?voiceId= → ordered autocue queue with cues,
 *                             glue grouping, known-language queue, estimated
 *                             minutes
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
  DEFAULT_POD_VOICES,
  MAX_POD_VOICES,
  defaultCastPeople,
  validateCastPeople,
  castVoiceFor,
  mergePodCast,
  speakerInventory,
  hasGenerationColouring,
  buildSentenceEditPatch,
  proposePeopleCast,
  provisionPlanFor,
  collapseTwoVoiceCast,
  mergeCastAliases,
} = require('./pods-cast.cjs')
const { buildRecordingPlan, finalizeRecordingPlan, DEFAULT_CUE_COUNT } = require('./pods-plan.cjs')
const consentGate = require('../shared/voice-consent-gate.cjs')

// Explainer narration is deprecated (2026-08-24): explainer_text /
// explainer_audio_id are deliberately NOT selected — the columns and their rows
// stay in the DB, they simply stop being read here.
const SENTENCE_COLUMNS =
  'id, pod_id, scene_number, global_order, speaker, target_text, target_text_draft, known_text, glue_to_next, rerecord_wanted, target_audio_id, known_audio_id'
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

  /** Recorded HUMAN takes per voice_id across these sentences' audio pointers. */
  async function countHumanTakes(db, sentences) {
    const ids = new Set()
    for (const s of sentences) {
      for (const col of ['target_audio_id', 'known_audio_id']) {
        if (s[col]) ids.add(s[col])
      }
    }
    const counts = {}
    const all = [...ids]
    for (let i = 0; i < all.length; i += 200) {
      const { data, error } = await db.from('course_audio')
        .select('id, origin, voice_id').in('id', all.slice(i, i + 200))
      if (error) throw new Error(error.message)
      for (const row of data || []) {
        if (row.origin === 'human' && row.voice_id) {
          counts[row.voice_id] = (counts[row.voice_id] || 0) + 1
        }
      }
    }
    return counts
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
      let podCast = (voiceConfig && voiceConfig.podCast) || {}

      // Two-voice rule migration (founder ruling 2026-07-17): a legacy cast
      // holding 3+ identities collapses to one voice per gender on load, and
      // the collapsed shape is written back so the DB stops accumulating
      // v2/v3 identities. Dropped ids persist as podCastAliases — old record
      // links resolve to their survivor and old takes still count.
      const distinctVoices = new Set(Object.values(podCast).map(e => e && e.voiceId).filter(Boolean))
      // How many voices this course DECLARED (written by PUT /cast). Absent =
      // legacy cast that predates the opt-in, so it defaults to two and
      // collapses exactly as it always did. A leader who deliberately opted in
      // to three or four voices (Tom 2026-08-06) is left alone — collapsing
      // their cast back to two on every load would silently undo the upgrade.
      const declaredVoices = Number(voiceConfig && voiceConfig.podCastVoices) || DEFAULT_POD_VOICES
      if (distinctVoices.size > DEFAULT_POD_VOICES && declaredVoices <= DEFAULT_POD_VOICES) {
        const takesByVoiceId = await countHumanTakes(db, sentences)
        const collapse = collapseTwoVoiceCast({ podCast, speakers: inventory.speakers, takesByVoiceId })
        if (collapse.changed) {
          podCast = collapse.podCast
          const migrated = {
            ...(voiceConfig || {}),
            podCast,
            podCastAliases: mergeCastAliases(voiceConfig && voiceConfig.podCastAliases, collapse.aliases),
          }
          try {
            const { error } = await db.from('courses')
              .update({ voice_config: migrated }).eq('course_code', courseCode)
            if (error) throw new Error(error.message)
            logger.info(`[PodsCast] ${courseCode}: collapsed legacy cast ${[...distinctVoices].join(', ')} → ` +
              `${Object.keys(collapse.aliases).join(', ')} (aliases kept${collapse.unresolved.length ? `; unresolved: ${collapse.unresolved.join(', ')}` : ''})`)
          } catch (err) {
            // Serve the collapsed view regardless — the next load retries.
            logger.warn(`[PodsCast] ${courseCode}: cast collapse write-back failed: ${err.message}`)
          }
        }
      }

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
      // What a course gets with nobody configuring anything: two voices, one
      // male one female (Tom 2026-08-06). The panel prefills from this, so the
      // default path never presents an N-voice concept; `max` is the quiet
      // opt-in ceiling for courses that do have extra recorders.
      body.castDefaults = {
        voices: DEFAULT_POD_VOICES,
        max: MAX_POD_VOICES,
        people: defaultCastPeople({ rosterVoices: body.rosterVoices }),
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

  // ── POST /cast/propose — PEOPLE-FIRST solve (Tom's design 2026-06-11) ─────
  // The leader declares WHO can record; the people drive the colouring.
  // Generation-side colouring never blocks this (keystone addendum, softened):
  // it stays available as a default suggestion for the 5-person case.
  async function handlePropose(req, res) {
    const { courseCode } = req.params
    let people = req.body && req.body.people
    if (!people && req.query.people) {
      try { people = JSON.parse(String(req.query.people)) } catch {
        return res.status(400).json({ error: 'people query parameter must be JSON' })
      }
    }
    if (!Array.isArray(people) || people.length === 0) {
      return res.status(400).json({ error: 'Body must be { people: [{ name, gender?, email?, guide? }] } with at least one person' })
    }
    // Two voices — one male, one female — is the DEFAULT (Tom, voice note
    // 2026-08-06: "probably do it for two voices as the default. And then if
    // you want to try it with three or four voices because you do have
    // additional human voice recorders, then fantastic, we can do that").
    // Three to five is an opt-in upgrade, never a requirement: forced
    // same-voice reuse across characters is the intended outcome at two, not a
    // shortfall to grow the cast out of.
    const castCheck = validateCastPeople(people)
    if (!castCheck.ok) return res.status(400).json({ error: castCheck.error })
    try {
      const db = getDb()
      const [{ found, voiceConfig }, pods] = await Promise.all([
        fetchVoiceConfig(db, courseCode),
        fetchPods(db, courseCode),
      ])
      if (!found) return res.status(404).json({ error: `Course ${courseCode} not found` })

      const sentences = await fetchAllSentences(db, pods.map(p => p.id))
      const inventory = speakerInventory({ pods, sentences })
      const genderBySpeaker = {}
      for (const sp of inventory.speakers) genderBySpeaker[sp.speaker] = sp.gender

      let proposal
      try {
        proposal = proposePeopleCast({
          people,
          sentences,
          courseCode,
          genderBySpeaker,
          existingCast: (voiceConfig && voiceConfig.podCast) || null,
          explainerWorkload: inventory.explainer,
        })
      } catch (err) {
        return res.status(400).json({ error: err.message })
      }

      res.json({
        course_code: courseCode,
        ...proposal,
        // Informational only — a people-first solve is never blocked by it.
        generationColouring: hasGenerationColouring(pods),
      })
    } catch (err) {
      logger.error(`[PodsCast] propose failed for ${courseCode}:`, err)
      res.status(500).json({ error: 'Failed to work out the parts' })
    }
  }
  router.post('/cast/propose', handlePropose)
  router.get('/cast/propose', handlePropose)

  // ── Auto-provisioning (PUT /cast) ─────────────────────────────────────────
  // A saved cast entry carrying an email grants that person dashboard access:
  //  - no dashboard_users row → CREATE { email, name, role:'recorder',
  //    courses:[courseCode], voice_id } — mirrors the invite-redeem row shape
  //    (production-api.cjs POST /api/auth/invite-codes/redeem), no code involved
  //  - existing row → NEVER touch role/voice_id; append courseCode to
  //    courses[] only when it's an array missing it ('*' and weird shapes
  //    untouched). Idempotent: a re-PUT is all no-ops.
  async function provisionCastMembers(db, courseCode, entries, actorEmail) {
    // One decision per email (a person may play several characters).
    const byEmail = new Map()
    for (const entry of entries) {
      if (!entry || !entry.email || !entry.voiceId) continue
      const email = String(entry.email).trim().toLowerCase()
      if (email && !byEmail.has(email)) byEmail.set(email, entry)
    }

    const results = []
    for (const [email, entry] of byEmail) {
      try {
        const { data: row, error } = await db
          .from('dashboard_users')
          .select('email, name, role, courses, voice_id')
          .eq('email', email)
          .maybeSingle()
        if (error) throw new Error(error.message)

        const plan = provisionPlanFor(row || null, courseCode)
        if (plan.action === 'create') {
          // Supabase Auth account so they can log in with OTP (same tolerant
          // pattern as the redeem endpoint — "already exists" is fine).
          try {
            await db.auth.admin.createUser({ email, email_confirm: true })
          } catch (authErr) {
            if (!authErr.message?.includes('already') && !authErr.message?.includes('exists')) {
              logger.warn(`[PodsCast] Failed to create auth account for ${email}: ${authErr.message}`)
            }
          }
          const { error: insertError } = await db
            .from('dashboard_users')
            .insert({
              email,
              name: entry.name || email.split('@')[0],
              role: 'recorder',
              courses: [courseCode],
              voice_id: entry.voiceId,
              invited_by: actorEmail || null,
              invited_at: new Date().toISOString(),
            })
          if (insertError) throw new Error(insertError.message)
          logger.info(`[PodsCast] Provisioned ${email} as recorder on ${courseCode} (voice ${entry.voiceId}) — cast save by ${actorEmail || '?'}`)
          results.push({ email, action: 'create', role: 'recorder', voice_id: entry.voiceId })
        } else if (plan.action === 'add-course') {
          const { error: updateError } = await db
            .from('dashboard_users')
            .update({ courses: plan.courses, updated_by: actorEmail || null, updated_at: new Date().toISOString() })
            .eq('email', email)
          if (updateError) throw new Error(updateError.message)
          logger.info(`[PodsCast] Added ${courseCode} to ${email}'s courses (role ${row.role} untouched) — cast save by ${actorEmail || '?'}`)
          results.push({ email, action: 'add-course' })
        } else {
          logger.info(`[PodsCast] Provisioning no-op for ${email} on ${courseCode} (${plan.reason})`)
          results.push({ email, action: 'no-op', reason: plan.reason })
        }
      } catch (err) {
        // A provisioning hiccup never un-saves the cast — report it instead.
        logger.warn(`[PodsCast] Provisioning failed for ${email} on ${courseCode}: ${err.message}`)
        results.push({ email, action: 'error', error: err.message })
      }
    }
    return results
  }

  // ── PUT /cast — surgical additive merge into voice_config.podCast ─────────
  router.put('/cast', async (req, res) => {
    const { courseCode } = req.params
    try {
      const updates = req.body && req.body.podCast
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return res.status(400).json({ error: 'Body must be { podCast: { "<speaker>": { voiceId, name?, email? } | null } }' })
      }

      const db = getDb()

      // ── NO CONSENT, NO CAST (Tom, 2026-08-31) ──────────────────────────
      // "we are never going to use a voice without consent." This is a cast
      // write that goes straight to courses.voice_config, so it is a second
      // door onto the same room as the Voice Lab's slot endpoint and needs the
      // same lock. Checked BEFORE the merge so a refused cast writes nothing.
      // Only the entries being SET are checked; clearing one (null) never is.
      for (const [speaker, entry] of Object.entries(updates)) {
        const vid = entry && entry.voiceId
        if (!vid) continue
        try {
          await consentGate.assertConsented(String(vid), { db, context: `${courseCode} podCast ${speaker}` })
        } catch (err) {
          return res.status(err.status || 409).json({ error: err.message, code: err.code || 'NO_RECORDED_CONSENT', speaker, voiceId: vid })
        }
      }

      const { found, voiceConfig } = await fetchVoiceConfig(db, courseCode)
      if (!found) return res.status(404).json({ error: `Course ${courseCode} not found` })

      let merged
      try {
        merged = mergePodCast(voiceConfig, updates)
      } catch (err) {
        return res.status(400).json({ error: err.message })
      }

      // Record how many voices this cast declares, so a deliberate three- or
      // four-voice opt-in survives the legacy two-voice collapse on the next
      // GET /cast. Additive key; TTS serving never reads it.
      merged.podCastVoices =
        new Set(Object.values(merged.podCast || {}).map(e => e && e.voiceId).filter(Boolean)).size ||
        DEFAULT_POD_VOICES

      const { error } = await db
        .from('courses')
        .update({ voice_config: merged })
        .eq('course_code', courseCode)
      if (error) throw error
      // No bumpCourseVersion: podCast is an additive key TTS serving never
      // reads (keystone §1) — learner-facing output is byte-identical.

      // Auto-provision dashboard access for the SAVED entries that carry an
      // email (merged state, so an update that only changed a voiceId still
      // sees the entry's existing email/name). Idempotent; never un-saves.
      const savedEntries = Object.keys(updates)
        .filter(speaker => updates[speaker] !== null)
        .map(speaker => merged.podCast[speaker])
      const provisioning = await provisionCastMembers(
        db, courseCode, savedEntries, req.dashboardUser?.email || null)

      logger.info(`[PodsCast] ${req.dashboardUser?.email || 'unknown'} updated podCast for ${courseCode} (${Object.keys(updates).length} speaker(s))`)
      res.json({ success: true, course_code: courseCode, podCast: merged.podCast, provisioning })
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
      // Alias resolution (two-voice collapse): a record link minted for a
      // collapsed-away identity keeps working — it resolves to its survivor,
      // and takes recorded under EITHER id count as recorded.
      const aliases = (voiceConfig && voiceConfig.podCastAliases) || {}
      let effectiveVoiceId = voiceId
      for (const [survivor, list] of Object.entries(aliases)) {
        if (Array.isArray(list) && list.includes(voiceId)) { effectiveVoiceId = survivor; break }
      }
      const acceptVoiceIds = new Set([effectiveVoiceId, ...(aliases[effectiveVoiceId] || [])])
      const sentences = await fetchAllSentences(db, pods.map(p => p.id))
      const plan = buildRecordingPlan({ pods, sentences, podCast, voiceId: effectiveVoiceId, cueCount })
      const final = await finalizeRecordingPlan({
        plan, sentences, voiceId: effectiveVoiceId, acceptVoiceIds,
        fetchAudioRows: async (ids) => {
          const out = []
          for (let i = 0; i < ids.length; i += 200) {
            const { data, error } = await db.from('course_audio')
              .select('id, origin, voice_id, duration_ms, file_size_bytes').in('id', ids.slice(i, i + 200))
            if (error) throw new Error(error.message)
            out.push(...(data || []))
          }
          return out
        },
      })
      const castEntry = Object.values(podCast).find(e => e && e.voiceId === effectiveVoiceId)
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

  // ── GET /drafts — the proofreading queue ─────────────────────────────────
  // Every line in this course's pods whose target text is a machine-written
  // DRAFT nobody has read yet (listening_pod_sentences.target_text_draft).
  // The person who proofreads is not necessarily the person who records the
  // line, so this is course-wide and voice-blind: PATCH /sentence clears the
  // marker, so an empty list means the course is clean.
  router.get('/drafts', async (req, res) => {
    const { courseCode } = req.params
    try {
      const db = getDb()
      const [{ found, voiceConfig }, pods] = await Promise.all([
        fetchVoiceConfig(db, courseCode),
        fetchPods(db, courseCode),
      ])
      if (!found) return res.status(404).json({ error: `Course ${courseCode} not found` })
      const podCast = (voiceConfig && voiceConfig.podCast) || {}
      const podById = new Map(pods.map(p => [p.id, p]))
      const sentences = await fetchAllSentences(db, pods.map(p => p.id))

      const byPod = {}
      const items = []
      for (const s of sentences) {
        if (s.target_text_draft !== true) continue
        const pod = podById.get(s.pod_id)
        byPod[s.pod_id] = (byPod[s.pod_id] || 0) + 1
        // Who is cast to read it — so a proofreader can see whose session is
        // blocked by this line, not just that a line is blocked.
        const entry = castVoiceFor(podCast, s.speaker)
        items.push({
          id: s.id,
          podId: s.pod_id,
          podSlug: (pod && pod.slug) || null,
          podTitle: (pod && (pod.title || pod.slug)) || s.pod_id,
          sceneNumber: s.scene_number,
          globalOrder: s.global_order,
          speaker: s.speaker,
          readBy: (entry && entry.name) || null,
          targetText: s.target_text,
          knownText: s.known_text,
        })
      }
      items.sort((a, b) => (a.podId < b.podId ? -1 : a.podId > b.podId ? 1 : (a.globalOrder || 0) - (b.globalOrder || 0)))
      res.json({ course_code: courseCode, courseCode, total: items.length, byPod, items })
    } catch (err) {
      logger.error(`[PodsCast] drafts failed for ${courseCode}:`, err)
      res.status(500).json({ error: 'Failed to load draft lines' })
    }
  })

  // ── PATCH /sentence/:sentenceId — community script editing ───────────────
  // Course editors fix the generated script BEFORE (or after) recording:
  // target/known text. Clearing the edited line's audio pointer is what
  // resurfaces it in the recording plan; the old audio ROW is never deleted.
  // explainer_text is no longer editable (deprecated 2026-08-24) and an
  // explainer_audio_id link is deliberately left alone by an edit: nothing
  // plays it and nothing will re-record it, so nulling it would be a DB
  // mutation with no purpose. (The legacy admin-only /api/admin/pod-sentences/:id stays for
  // back-compat; this is the per-course-scoped door community leaders use.)
  router.patch('/sentence/:sentenceId', async (req, res) => {
    const { courseCode, sentenceId } = req.params
    const patch = buildSentenceEditPatch(req.body || {})
    if (!patch) return res.status(400).json({ error: 'target_text or known_text required' })
    try {
      const db = getDb()
      // The sentence must belong to a pod of THIS course — the URL's course
      // is what the gate authorized, so verify before writing.
      const { data: sentence, error: fetchError } = await db
        .from('listening_pod_sentences')
        .select('id, pod_id, target_audio_id, known_audio_id')
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
      for (const col of ['target_audio_id', 'known_audio_id']) {
        if (col in patch && sentence[col]) cleared[col] = sentence[col]
      }
      const { data: updated, error: updateError } = await db
        .from('listening_pod_sentences')
        .update(patch)
        .eq('id', sentenceId)
        .select('id, target_text, target_text_draft, known_text, target_audio_id, known_audio_id')
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
