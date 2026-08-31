/**
 * Team roster + voice-slot assignment router (human voice engine).
 *
 * NOT mounted by this file — see services/voice-engine/README.md for the
 * one-line mount in production-api.cjs. Built as a factory so it reuses the
 * SAME auth helpers production-api.cjs already defines (requireDashboardUser,
 * userCanAccessCourse) instead of re-implementing auth.
 *
 * Every route is course-scoped: the caller must be a dashboard user AND hold
 * the course in the URL (flat model — any editor who holds the course manages
 * its team; no separate leader role, per the keystone doc).
 *
 * Endpoints (mounted at /api/production/:courseCode/team):
 *   GET    /             team members for this course + the two target voice slots
 *   POST   /consent      the CONSENT STEP OF ONBOARDING — mints this person's
 *                        human_* voice id with a recorded consent declaration
 *                        already on it (read-aloud phrase, or attestation)
 *   POST   /assign-slot  { email, slot } — cast their consented voice id into
 *                        courses.voice_config.voices[slot] (surgical merge) and
 *                        mirror it onto dashboard_users.voice_id;
 *                        slot 'unassigned' (or null) removes them from their slot
 *   DELETE /member       { email } — remove THIS course from their courses[]
 *                        (never deletes the user row); vacates their slot here
 *   POST   /invite       { role?, label?, expires_days?, max_uses? } — mint a
 *                        recorder invite code for THIS course via the existing
 *                        dashboard_invite_codes machinery
 *
 * Vocabulary: known / target / seed.
 */

'use strict'

const express = require('express')
const crypto = require('crypto')
const Busboy = require('busboy')
const declaration = require('../voicelab/declaration.cjs')
const consentGate = require('../shared/voice-consent-gate.cjs')
const consent = require('../voicelab/consent.cjs')
const cloneConfirmation = require('../voicelab/clone-confirmation.cjs')
const { onboardConsentedVoice } = require('./recordist-consent.cjs')
const {
  ASSIGNABLE_SLOTS,
  UNASSIGNED,
  isOwnMint,
  mintVoiceId,
  assignVoiceToSlot,
  vacateSlot,
  findSlotForMember,
  slotSummary,
  holdsCourse,
  targetLangFromCourseCode,
} = require('./voice-slots.cjs')

/**
 * @param {object} deps
 * @param {(req,res)=>Promise<object|null>} deps.requireDashboardUser - production-api helper (sends 401/403 itself)
 * @param {(user,courseCode)=>boolean} deps.userCanAccessCourse - production-api helper
 * @param {()=>object} deps.getDb - returns the Supabase service-role client
 * @param {object} [deps.logger] - logger with info/warn/error (default console)
 * @param {(db,courseCode,kind)=>Promise} [deps.bumpCourseVersion] - optional; called after voice_config writes
 */
module.exports = function createTeamRouter({
  requireDashboardUser,
  userCanAccessCourse,
  getDb,
  logger = console,
  bumpCourseVersion = null,
}) {
  if (typeof requireDashboardUser !== 'function' || typeof userCanAccessCourse !== 'function' || typeof getDb !== 'function') {
    throw new Error('team-router requires { requireDashboardUser, userCanAccessCourse, getDb }')
  }

  const router = express.Router({ mergeParams: true })

  // ── Course-scoped auth gate (identity + membership + role for writes) ────
  // A 'recorder' holds the course too (that is how the recorder shell works)
  // but is READ-ONLY here: without this server-side check a recorder could
  // hit POST /invite {role:'editor'} directly and mint an editor code —
  // privilege escalation. Client-side confinement is not auth. (Deny is by
  // the 'recorder' role specifically: the Supabase-JWT auth path labels
  // popty editors role 'user', so an editor/admin allowlist would lock them
  // out; 'recorder' only ever comes from dashboard_users.role.)
  router.use(async (req, res, next) => {
    try {
      const user = await requireDashboardUser(req, res)
      if (!user) return // 401/403 already sent
      const courseCode = req.params.courseCode
      if (!userCanAccessCourse(user, courseCode)) {
        return res.status(403).json({ error: `No access to course ${courseCode}` })
      }
      if (req.method !== 'GET' && user.role === 'recorder') {
        // ONE EXCEPTION, and it is the whole point of the consent step: the
        // person whose voice it is must be able to state, themselves, that they
        // agree to it being used. Refusing a recordist the right to consent on
        // their own behalf would leave consent as something done ABOUT people
        // rather than BY them. Confined to their own email, checked in the
        // route once the body has been parsed — everything else stays read-only.
        if (req.path === '/consent') req.consentSelfOnly = true
        else return res.status(403).json({ error: 'Recorders cannot manage the course team' })
      }
      req.dashboardUser = user
      next()
    } catch (err) {
      logger.error('[Team] Auth gate error:', err)
      res.status(500).json({ error: 'Authentication check failed' })
    }
  })

  // ── DB helpers ────────────────────────────────────────────────────────────

  async function fetchMember(db, email) {
    const { data, error } = await db
      .from('dashboard_users')
      .select('email, name, role, courses, voice_id')
      .eq('email', email)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  async function listMembers(db, courseCode) {
    // dashboard_users is small (single-digit rows live); filter in JS because
    // courses is JSONB that may be the string "*" or an array.
    const { data, error } = await db
      .from('dashboard_users')
      .select('email, name, role, courses, voice_id')
    if (error) throw error
    return (data || []).filter(u => Array.isArray(u.courses) && u.courses.includes(courseCode))
  }

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

  async function saveVoiceConfig(db, courseCode, voiceConfig) {
    const { error } = await db
      .from('courses')
      .update({ voice_config: voiceConfig })
      .eq('course_code', courseCode)
    if (error) throw error
    if (bumpCourseVersion) {
      try { await bumpCourseVersion(db, courseCode, 'patch') } catch (err) {
        logger.warn(`[Team] bumpCourseVersion failed for ${courseCode}: ${err.message}`)
      }
    }
  }

  /** voice_id is taken if ANOTHER person already carries it. */
  async function voiceIdTakenByOther(db, candidate, email) {
    const { data, error } = await db
      .from('dashboard_users')
      .select('email')
      .eq('voice_id', candidate)
      .neq('email', email)
      .limit(1)
    if (error) throw error
    return (data || []).length > 0
  }

  function memberSlotMap(members, voiceConfig) {
    const map = {}
    for (const m of members) {
      const slot = findSlotForMember(voiceConfig, { email: m.email, voiceId: m.voice_id })
      if (slot) map[m.email] = slot
    }
    return map
  }

  // ── GET / — the roster ────────────────────────────────────────────────────
  router.get('/', async (req, res) => {
    const { courseCode } = req.params
    try {
      const db = getDb()
      const [members, { found, voiceConfig }] = await Promise.all([
        listMembers(db, courseCode),
        fetchVoiceConfig(db, courseCode),
      ])
      if (!found) return res.status(404).json({ error: `Course ${courseCode} not found` })

      const slotsByEmail = memberSlotMap(members, voiceConfig)
      const slots = slotSummary(voiceConfig).map(s => ({
        ...s,
        // assignedEmail on the slot is canonical (survives the same person
        // being re-minted on another course); voice_id match is the fallback
        // for configs written before assignedEmail existed.
        assigned_email: s.isHuman
          ? (s.assignedEmail || members.find(m => m.voice_id === s.voiceId)?.email || null)
          : null,
      }))

      res.json({
        course_code: courseCode,
        members: members.map(m => ({
          email: m.email,
          name: m.name,
          role: m.role,
          voice_id: m.voice_id || null,
          slot: slotsByEmail[m.email] || null,
          // Placeholder until the recording-progress build lands a real count.
          recorded_count: null,
        })),
        slots,
      })
    } catch (err) {
      logger.error(`[Team] List roster failed for ${courseCode}:`, err)
      res.status(500).json({ error: 'Failed to load team roster' })
    }
  })


  /**
   * Which of the two consent stamps this voice is waiting on, if any.
   * Read straight from the row so the answer is the same one the block used.
   */
  async function confirmationStage (db, voiceId) {
    try {
      const { data } = await db.from('voices').select(consent.COLUMNS).eq('voice_id', voiceId).limit(1)
      const row = Array.isArray(data) ? (data[0] || null) : (data || null)
      return cloneConfirmation.stageOf(row)
    } catch { return 'unasked' }
  }

  // ── POST /consent — THE CONSENT STEP OF ONBOARDING ────────────────────────
  //
  // Tom, 2026-08-31: "onboarding must CAPTURE consent as a step of the process,
  // and mint the voice id with a consent record already attached."
  //
  // Nothing about the block below is new consent machinery. The words, the
  // whisper check, the three ways through and the columns written are the same
  // `services/voicelab/declaration.cjs` the clone route uses — a recordist's
  // yes and a clone subject's yes are the same yes, and two mechanisms would
  // mean two things could be true at once about what somebody agreed to.
  //
  // Two shapes, one route:
  //   multipart, sampleFrom=record  they read the line at a microphone; whisper
  //                                 verifies it against the very bytes uploaded
  //   JSON, declarationAgreed=true  they are not at a microphone; a named human
  //                                 states it instead, recorded as 'attested'
  //
  // A recordist may run this for themselves (see the auth gate); an editor may
  // run it for a member of their course's team.
  const MAX_CONSENT_CLIP_BYTES = 25 * 1024 * 1024
  function readConsentUpload (req) {
    // Local, like every other multipart parse on this service — a request-scoped
    // parse cannot leak into another route, and this is the only one here.
    return new Promise((resolve, reject) => {
      let bus
      try {
        bus = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_CONSENT_CLIP_BYTES } })
      } catch (e) {
        return reject(Object.assign(new Error(`Expected a multipart upload: ${e.message}`), { status: 400 }))
      }
      const fields = {}
      const chunks = []
      let tooBig = false
      bus.on('field', (name, value) => { fields[name] = value })
      bus.on('file', (_n, stream) => {
        stream.on('data', (c) => chunks.push(c))
        stream.on('limit', () => { tooBig = true })
      })
      bus.on('error', (e) => reject(Object.assign(new Error(String(e.message)), { status: 400 })))
      bus.on('close', () => {
        if (tooBig) return reject(Object.assign(new Error(`That recording is larger than ${MAX_CONSENT_CLIP_BYTES / 1024 / 1024} MB.`), { status: 413 }))
        resolve({ clip: chunks.length ? Buffer.concat(chunks) : null, fields })
      })
      req.pipe(bus)
    })
  }

  router.post('/consent', async (req, res) => {
    const { courseCode } = req.params
    try {
      const multipart = /multipart\/form-data/i.test(req.headers['content-type'] || '')
      const { clip, fields } = multipart
        ? await readConsentUpload(req)
        : { clip: null, fields: req.body || {} }

      const email = String(fields.email || '').trim()
      if (!email) return res.status(400).json({ error: 'email is required — say whose voice this consent is about' })
      if (req.consentSelfOnly && email.toLowerCase() !== String(req.dashboardUser.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'You can record consent for your own voice only' })
      }

      const db = getDb()
      const member = await fetchMember(db, email)
      if (!member) return res.status(404).json({ error: `No dashboard user with email ${email}` })
      if (!holdsCourse(member.courses, courseCode)) {
        return res.status(400).json({ error: `${email} is not on this course's team — add them first` })
      }

      // Whose voice it is, in their own name. Falls back to the account name
      // and then the email's local part, because a consent record with nobody
      // named on it is one nobody can ever act on — but it is never left blank
      // and never quietly set to the operator.
      const person = String(fields.person || member.name || email.split('@')[0]).trim()

      const declarationRecord = await declaration.captureDeclaration({
        clip,
        sampleFrom: fields.sampleFrom,
        agreed: String(fields.declarationAgreed ?? '').toString().trim().toLowerCase() === 'true',
        attestedBy: fields.attestedBy,
        person,
        language: targetLangFromCourseCode(courseCode),
      })

      const { voiceId, voice, minted } = await onboardConsentedVoice(db, {
        email,
        courseCode,
        person,
        declarationRecord,
        existingVoiceId: member.voice_id,
        name: member.name,
        recordedBy: req.dashboardUser.email,
        isTaken: candidate => voiceIdTakenByOther(db, candidate, email),
      })

      // Mirror the mint onto the person, exactly as assign-slot did — so the
      // id exists on the person BEFORE anyone tries to cast it, which is what
      // lets assign-slot stop minting and start checking.
      if (member.voice_id !== voiceId) {
        const { error: userErr } = await db
          .from('dashboard_users')
          .update({ voice_id: voiceId, updated_by: req.dashboardUser.email, updated_at: new Date().toISOString() })
          .eq('email', email)
        if (userErr) throw userErr
      }

      // The gate caches consent verdicts for 30 seconds. Without this, a person
      // who consents and is assigned in the same breath — which is exactly what
      // the screen does — is refused by a verdict taken before they said yes.
      consentGate.clearCache()

      logger.info(`[Team] ${req.dashboardUser.email} recorded ${declarationRecord.consent_declaration_kind} consent for ${email} on ${courseCode} as ${voiceId}`)
      res.json({
        success: true,
        email,
        voice_id: voiceId,
        minted,
        consent: {
          // The ROW's status, which since 2026-08-31 is the first of two
          // stamps: they have said yes, and the voice is not castable until
          // they have heard their clone and confirmed it. Reporting the
          // declaration's own `authorised` here would tell the screen a thing
          // the block does not agree with.
          status: voice.consent_status,
          kind: declarationRecord.consent_declaration_kind,
          person,
          declared_by: declarationRecord.consent_authorised_by,
          declared_at: declarationRecord.consent_authorised_at,
          words: declarationRecord.consent_declaration,
          heard: declarationRecord.consent_declaration_heard,
        },
        // WHAT IS STILL OUTSTANDING, so the screen says it rather than showing
        // a green tick over a voice that cannot be cast.
        confirmation: cloneConfirmation.describe(voice),
      })
    } catch (err) {
      const status = err && err.status ? err.status : 500
      if (status >= 500) logger.error(`[Team] Consent capture failed for ${courseCode}:`, err)
      // err.detail rides alongside the sentence for the screen that has to
      // BRANCH — offer the attestation, or ask for the line again — rather than
      // string-match English prose that is Tom's to redline.
      res.status(status).json({
        error: status >= 500 ? 'Failed to record consent' : err.message,
        code: err.code || 'consent_failed',
        ...(err.detail || {}),
      })
    }
  })

  /** The consent line and the attestation wording, for the screen to show. */
  router.get('/consent-wording', (_req, res) => {
    res.json({ spoken_phrase: declaration.SPOKEN_PHRASE, attestation: declaration.ATTESTATION })
  })

  // ── POST /assign-slot — { email, slot } ───────────────────────────────────
  router.post('/assign-slot', async (req, res) => {
    const { courseCode } = req.params
    const { email, slot } = req.body || {}
    if (!email) return res.status(400).json({ error: 'email is required' })

    const unassign = slot == null || slot === UNASSIGNED
    if (!unassign && !ASSIGNABLE_SLOTS.includes(slot)) {
      return res.status(400).json({ error: `slot must be one of: ${ASSIGNABLE_SLOTS.join(', ')}, ${UNASSIGNED}` })
    }

    try {
      const db = getDb()
      const member = await fetchMember(db, email)
      if (!member) return res.status(404).json({ error: `No dashboard user with email ${email}` })
      if (!holdsCourse(member.courses, courseCode)) {
        return res.status(400).json({ error: `${email} is not on this course's team — add them first` })
      }

      const { found, voiceConfig } = await fetchVoiceConfig(db, courseCode)
      if (!found) return res.status(404).json({ error: `Course ${courseCode} not found` })

      // ── Unassign: vacate whichever slot this person holds ──
      if (unassign) {
        const currentSlot = findSlotForMember(voiceConfig, { email, voiceId: member.voice_id })
        if (!currentSlot) {
          return res.json({ success: true, email, slot: null, message: `${email} holds no voice slot on this course` })
        }
        const next = vacateSlot(voiceConfig, currentSlot)
        await saveVoiceConfig(db, courseCode, next)
        logger.info(`[Team] ${req.dashboardUser.email} unassigned ${email} from ${currentSlot} on ${courseCode}`)
        return res.json({ success: true, email, slot: null, vacated: currentSlot })
      }

      // Occupied-slot guard: assigning over a slot held by a DIFFERENT
      // person would silently displace them (their recordings keep their
      // voice_id, but they'd lose the slot without anyone deciding that).
      // The leader unassigns explicitly first.
      const targetSlot = voiceConfig?.voices?.[slot]
      if (targetSlot?.provider === 'human' && targetSlot.voiceId) {
        const heldByThisPerson = targetSlot.assignedEmail
          ? targetSlot.assignedEmail === email
          : targetSlot.voiceId === member.voice_id
        if (!heldByThisPerson) {
          return res.status(409).json({
            error: `That voice slot is already held by ${targetSlot.assignedEmail || 'another team member'} — unassign them first`,
          })
        }
      }

      // ── Assign: their CONSENTED voice id, then surgical merge ─────────────
      //
      // NO CONSENT, NO VOICE (Tom, 2026-08-31). This route used to mint a fresh
      // `human_*` id here and cast it in the same motion — a voice id created
      // for a real person before anybody had asked them anything, which is the
      // one door the hard-block sweep left open and named.
      //
      // It is closed by moving the consent EARLIER, not by exempting this
      // route: POST /consent mints the id with the person's recorded yes on it,
      // so by the time anyone casts, the id already exists and already passes.
      // The check below is therefore the ordinary standing gate, with no
      // special case in it — for a properly onboarded recordist it never fires.
      //
      // The refusal names the missing step rather than the person. Somebody who
      // has just been invited to help has done nothing wrong by not yet having
      // read a sentence they have never been shown.
      let voiceId
      if (isOwnMint(member.voice_id, email, courseCode)) {
        voiceId = member.voice_id
      } else {
        const who = member.name || email
        return res.status(409).json({
          error: `${who} has not agreed to their voice being used on this course yet. Record their consent first — they read one line aloud in the browser, or state it in writing — and then this will go through.`,
          code: 'NO_RECORDED_CONSENT',
          needsOnboardingConsent: true,
          email,
          slot,
        })
      }

      try {
        await consentGate.assertConsented(voiceId, { db, context: `${courseCode} ${slot} assignment` })
      } catch (err) {
        // WHICH STEP IS MISSING, not just "no consent" (Tom, 2026-08-31).
        // Sign-up consent is now the first of two: the person also hears their
        // clone and confirms it, and that second stamp is what casts. So the
        // screen is told which of the two to open, and somebody who has already
        // read the line aloud is never asked to read it again.
        const stage = await confirmationStage(db, voiceId)
        const needsConfirmation = stage === 'awaiting_hearing'
        return res.status(err.status || 409).json({
          error: err.message,
          code: err.code || 'NO_RECORDED_CONSENT',
          needsCloneConfirmation: needsConfirmation,
          needsOnboardingConsent: !needsConfirmation,
          email,
          slot,
          voice_id: voiceId,
        })
      }

      // If this person already holds the OTHER slot, vacate it (a move, not a copy).
      let next = voiceConfig
      const currentSlot = findSlotForMember(voiceConfig, { email, voiceId: member.voice_id })
      if (currentSlot && currentSlot !== slot) {
        next = vacateSlot(next, currentSlot)
      }

      // member.name rides along so the slot announces the PERSON in every
      // voice UI, not the TTS voice they displaced.
      next = assignVoiceToSlot(next, slot, voiceId, email, member.name || null)

      // Persist: voice_config is canonical for the course; dashboard_users.voice_id
      // mirrors the latest mint for the person.
      await saveVoiceConfig(db, courseCode, next)
      if (member.voice_id !== voiceId) {
        const { error: userErr } = await db
          .from('dashboard_users')
          .update({ voice_id: voiceId, updated_by: req.dashboardUser.email, updated_at: new Date().toISOString() })
          .eq('email', email)
        if (userErr) throw userErr
      }

      logger.info(`[Team] ${req.dashboardUser.email} assigned ${email} → ${slot} on ${courseCode} as ${voiceId}`)
      res.json({
        success: true,
        email,
        slot,
        voice_id: voiceId,
        moved_from: currentSlot && currentSlot !== slot ? currentSlot : null,
        voice: next.voices[slot],
      })
    } catch (err) {
      logger.error(`[Team] Assign slot failed for ${courseCode}:`, err)
      res.status(500).json({ error: 'Failed to assign voice slot' })
    }
  })

  // ── DELETE /member — { email } — remove this course from their courses[] ──
  router.delete('/member', async (req, res) => {
    const { courseCode } = req.params
    const email = (req.body && req.body.email) || req.query.email
    if (!email) return res.status(400).json({ error: 'email is required' })

    try {
      const db = getDb()
      const member = await fetchMember(db, email)
      if (!member) return res.status(404).json({ error: `No dashboard user with email ${email}` })
      if (member.courses === '*' || member.role === 'admin') {
        return res.status(400).json({ error: `${email} is admin-managed and cannot be removed here` })
      }
      if (!Array.isArray(member.courses) || !member.courses.includes(courseCode)) {
        return res.status(400).json({ error: `${email} is not on this course's team` })
      }

      // Vacate their voice slot on this course first (restores the displaced voice).
      const { found, voiceConfig } = await fetchVoiceConfig(db, courseCode)
      let vacated = null
      if (found) {
        const currentSlot = findSlotForMember(voiceConfig, { email, voiceId: member.voice_id })
        if (currentSlot) {
          await saveVoiceConfig(db, courseCode, vacateSlot(voiceConfig, currentSlot))
          vacated = currentSlot
        }
      }

      // Remove the course from their list — NEVER delete the user row.
      const remaining = member.courses.filter(c => c !== courseCode)
      const { error: updErr } = await db
        .from('dashboard_users')
        .update({ courses: remaining, updated_by: req.dashboardUser.email, updated_at: new Date().toISOString() })
        .eq('email', email)
      if (updErr) throw updErr

      logger.info(`[Team] ${req.dashboardUser.email} removed ${email} from ${courseCode} (slot vacated: ${vacated || 'none'})`)
      res.json({ success: true, email, removed_course: courseCode, vacated_slot: vacated, remaining_courses: remaining })
    } catch (err) {
      logger.error(`[Team] Remove member failed for ${courseCode}:`, err)
      res.status(500).json({ error: 'Failed to remove team member' })
    }
  })

  // ── POST /invite — mint a recorder invite code for THIS course ────────────
  // Uses the existing dashboard_invite_codes machinery (same table + code
  // format the /api/auth/invite-codes/redeem endpoint consumes). The schema
  // CHECK already allows role 'recorder' (retired from the old UI, never from
  // the schema), so no allowlist extension is needed server-side.
  router.post('/invite', async (req, res) => {
    const { courseCode } = req.params
    const { role = 'recorder', label, expires_days = 30, max_uses = 1 } = req.body || {}

    // Course-holders can mint recorder/editor codes for THEIR course only
    // (course scope is enforced by the router gate; admin minting lives elsewhere).
    if (!['recorder', 'editor'].includes(role)) {
      return res.status(400).json({ error: "role must be 'recorder' or 'editor'" })
    }

    try {
      const db = getDb()

      // Same unambiguous charset as /api/auth/invite-codes/generate.
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      const bytes = crypto.randomBytes(8)
      for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length]

      const expires_at = expires_days
        ? new Date(Date.now() + expires_days * 86400000).toISOString()
        : null

      const { data, error } = await db.from('dashboard_invite_codes').insert({
        code,
        role,
        courses: JSON.stringify([courseCode]),
        label: label || `${courseCode} ${role} invite`,
        created_by: req.dashboardUser.email,
        expires_at,
        max_uses: max_uses || 1,
      }).select().single()
      if (error) throw error

      logger.info(`[Team] ${req.dashboardUser.email} minted ${role} invite ${code} for ${courseCode}`)
      res.json({
        code: data.code,
        role,
        course_code: courseCode,
        expires_at: data.expires_at,
        max_uses: data.max_uses,
        // The recorder shell route for this course (client prepends its own origin).
        record_path: `/record/${courseCode}`,
      })
    } catch (err) {
      logger.error(`[Team] Mint invite failed for ${courseCode}:`, err)
      res.status(500).json({ error: 'Failed to create invite code' })
    }
  })

  return router
}
