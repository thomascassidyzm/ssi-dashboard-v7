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
 *   POST   /assign-slot  { email, slot } — mint voice id, write dashboard_users.voice_id
 *                        AND courses.voice_config.voices[slot] (surgical merge);
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
        return res.status(403).json({ error: 'Recorders cannot manage the course team' })
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

      // ── Assign: mint (or reuse) the voice id, then surgical merge ──
      // Reuse the member's existing id if it's already a mint for this person+course
      // (idempotent re-assign / slot move); otherwise mint fresh with collision suffixing.
      let voiceId
      if (isOwnMint(member.voice_id, email, courseCode)) {
        voiceId = member.voice_id
      } else {
        voiceId = await mintVoiceId({
          email,
          courseCode,
          isTaken: candidate => voiceIdTakenByOther(db, candidate, email),
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
