// services/production-api.cjs
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs-extra')
const { createServer } = require('http')
const { Server } = require('socket.io')
const createLogger = require('./shared/logger.cjs')
const { normalizeForAudio } = require('./shared/text-normalize.cjs')
const { isPunctuationOnly } = require('./shared/text-classification.cjs')
const { identity: buildIdentity } = require('./shared/build-identity.cjs')

const logger = createLogger('ProductionAPI')

const s3Service = require('./s3-production-service.cjs')
const supabaseClient = require('./supabase-client.cjs')
const { canonicalLanguage } = require('./shared/clip-identity.cjs')
const { swapClipInPlace } = require('./shared/audio-revision-swap.cjs')
const manifestGenerator = require('./manifest-generator.cjs')
const courseDataService = require('./course-data-service.cjs')
const { SchemaValidator } = require('./schema-validator.cjs')
const learningScriptGenerator = require('./learning-script-generator.cjs')
const audioProcessor = require('./audio-processor.cjs')
const ttsService = require('./tts-service.cjs')
const voiceConfigService = require('./voice-config-service.cjs')
const voiceDiscoveryService = require('./voice-discovery-service.cjs')
const publishManifestService = require('./publish-manifest-service.cjs')
const manifestDiffService = require('./manifest-diff-service.cjs')
const languageCodeService = require('./language-code-service.cjs')
const { decomposeText } = require('./phrase-decomposer.cjs')
const { isScriptModeUpload, normalizeProvenance, buildProvenanceContext, resolveTakeVoiceId, retainAndProcessTake } = require('./recording-upload-helpers.cjs')
const { planScriptTakeFiling, fileScriptTake } = require('./script-take-filing.cjs')
const takeSupersede = require('./take-supersede.cjs')
const podsRegistration = require('./voice-engine/pods-registration.cjs')
const podVoiceApprovals = require('./pod-voice-approvals.cjs')
const { resolvePoptyIdentity, hasAdminRole } = require('./shared/popty-identity.cjs')
const presentationAuthor = require('./phases/presentation-author.cjs')

// =============================================================================
// MANIFEST CACHING
// =============================================================================
// Cache generated manifests - DISABLED during development
// Re-enable once testing is complete
const manifestCache = new Map()
const MANIFEST_CACHE_TTL_MS = 0 // DISABLED - caching causes issues during testing

// Track running S3 verifications to prevent duplicate jobs
// Maps courseCode -> { startedAt }
const runningVerifications = new Map()

// Track running deploy plans to prevent duplicate jobs
const runningDeployPlans = new Map()

// Track running deploy executions to prevent concurrent S3 copy operations
// Maps courseCode -> { startedAt, type, progress: { phase, deployed, total, ... } }
const runningDeploys = new Map()

// Track active apidev stage deploys (one per course at a time).
// Maps courseCode -> { jobId, courseConfigsId, sshProc, startedAt, state, sawChecksPassed, ... }
const stageDeployJobs = new Map()

// Track active stage-server restart jobs (one per course at a time).
// Restarts run independently of deploys — they're triggered by the user
// after a successful deploy via a separate button.
const stageRestartJobs = new Map()

async function getCachedManifest(courseCode) {
  const cached = manifestCache.get(courseCode)
  if (cached && (Date.now() - cached.timestamp) < MANIFEST_CACHE_TTL_MS) {
    logger.info(`[Cache HIT] Manifest for ${courseCode} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`)
    return cached.manifest
  }

  // Generate fresh manifest
  const startTime = Date.now()
  const manifest = await manifestGenerator.generateManifest(courseCode)
  const elapsed = Date.now() - startTime

  logger.info(`[Cache MISS] Generated manifest for ${courseCode} in ${elapsed}ms`)

  // Cache it
  manifestCache.set(courseCode, { manifest, timestamp: Date.now() })

  return manifest
}

// Clear cache for a specific course (call after data updates)
/**
 * Build the courseConfigsId (file name + manifest id) with dialect-aware suffix
 * on either the known or target side (or both, in theory).
 * E.g.:
 *   spa_for_eng        → "en-es"        (no suffix)
 *   spa_mx_for_eng     → "en-es-mx"     (target suffix)
 *   fra_ca_for_eng     → "en-fr-ca"
 *   eng_for_fra_ca     → "fr-ca-en"     (known suffix — hypothetical, no such course today)
 *   cym_anthem_for_jpn → "ja-cy-anthem"
 *
 * Mirrors the logic in services/phases/generate-legacy-manifest.cjs (build manifest section)
 * so the dashboard's UI/publish path agrees with the manifest's internal id.
 *
 * Also exported indirectly via parseCourseCodeSuffixes() so other modules can
 * reuse the same parsing.
 *
 * @param {string} courseCode      e.g. "fra_ca_for_eng"
 * @param {string} knownDbLang     e.g. "eng" (course.known_lang)
 * @param {string} targetDbLang    e.g. "fra" (course.target_lang)
 * @param {string} knownLegacyCode e.g. "en"  (after languageCodeService conversion)
 * @param {string} targetLegacyCode e.g. "fr"
 */
function parseCourseCodeSuffixes(courseCode, knownDbLang, targetDbLang) {
  const re = new RegExp(`^${targetDbLang}(?:_(.+?))?_for_${knownDbLang}(?:_(.+))?$`)
  const m = courseCode.match(re)
  return { targetSuffix: m?.[1] || '', knownSuffix: m?.[2] || '' }
}

function buildCourseConfigsId(courseCode, knownDbLang, targetDbLang, knownLegacyCode, targetLegacyCode) {
  const { targetSuffix, knownSuffix } = parseCourseCodeSuffixes(courseCode, knownDbLang, targetDbLang)
  const knownPart = knownSuffix ? `${knownLegacyCode}-${knownSuffix}` : knownLegacyCode
  const targetPart = targetSuffix ? `${targetLegacyCode}-${targetSuffix}` : targetLegacyCode
  return `${knownPart}-${targetPart}`
}

function invalidateManifestCache(courseCode) {
  if (manifestCache.has(courseCode)) {
    manifestCache.delete(courseCode)
    logger.info(`[Cache] Invalidated manifest cache for ${courseCode}`)
  }
}

// VFS root for local file checks
const VFS_ROOT = process.env.VFS_ROOT?.endsWith('/courses')
  ? process.env.VFS_ROOT
  : path.join(process.env.VFS_ROOT || path.join(__dirname, '../public/vfs'), 'courses')

const app = express()
const httpServer = createServer(app)

// WebSocket setup
const io = new Server(httpServer, {
  path: '/api/production/websocket',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))  // Large limit for manifests with 20k+ audio entries

// Disable ALL caching on API responses during development
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.set('Surrogate-Control', 'no-store')
  next()
})

// =============================================================================
// AUTH ROUTES
// =============================================================================
// Supabase-backed authentication with login codes

const crypto = require('crypto')

const LOGIN_CODE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

async function authGetUser(email) {
  const { data, error } = await supabaseClient.getClient()
    .from('dashboard_users').select('*').eq('email', email).single()
  if (error && error.code === 'PGRST116') return null
  if (error) throw error
  return data ? { name: data.name, email: data.email, role: data.role, courses: data.courses, voice_id: data.voice_id } : null
}

async function authGenerateLoginCode(email) {
  const user = await authGetUser(email)
  if (!user) return { error: 'User not found' }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = crypto.randomBytes(6)
  for (let i = 0; i < 6; i++) { code += chars[bytes[i] % chars.length] }
  const expires = new Date(Date.now() + LOGIN_CODE_TTL)
  const { error } = await supabaseClient.getClient()
    .from('dashboard_login_codes').insert({ code, email, expires_at: expires.toISOString() })
  if (error) throw error
  return { code, expires: expires.getTime() }
}

async function authVerifyLoginCode(email, code) {
  if (!code) return { error: 'Code required' }
  const normalizedCode = code.toUpperCase().trim()
  const { data, error } = await supabaseClient.getClient()
    .from('dashboard_login_codes')
    .select('*')
    .eq('code', normalizedCode)
    .gt('expires_at', new Date().toISOString())
    .single()
  if (error && error.code === 'PGRST116') return { error: 'Invalid code' }
  if (error) throw error
  if (!data) return { error: 'Invalid code' }
  if (data.email.toLowerCase() !== email.toLowerCase()) return { error: 'Invalid code' }
  return { email: data.email }
}

async function authCreateSession(email) {
  const sessionId = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_TTL)
  const user = await authGetUser(email)
  const { error } = await supabaseClient.getClient()
    .from('dashboard_sessions').insert({ session_id: sessionId, email, expires_at: expires.toISOString() })
  if (error) throw error
  return { sessionId, expires: expires.getTime(), user }
}

async function authValidateSession(sessionId) {
  const { data, error } = await supabaseClient.getClient()
    .from('dashboard_sessions')
    .select('email, expires_at, dashboard_users(*)')
    .eq('session_id', sessionId)
    .gt('expires_at', new Date().toISOString())
    .single()
  if (error && error.code === 'PGRST116') return null
  if (error) return null
  if (!data) return null
  const u = data.dashboard_users
  return u ? { name: u.name, email: u.email, role: u.role, courses: u.courses, voice_id: u.voice_id } : null
}

async function authDeleteSession(sessionId) {
  await supabaseClient.getClient()
    .from('dashboard_sessions').delete().eq('session_id', sessionId)
}

// Helper: verify Supabase JWT and check dashboard access
async function verifySupabaseJWT(token) {
  try {
    const { data: { user }, error } = await supabaseClient.getClient().auth.getUser(token)
    if (error || !user) return null

    // AUTHORITY ORDER (services/shared/popty-identity.cjs): the
    // dashboard_users row governs Popty authorization when one exists —
    // editing that table must always change effective access. The learners
    // ssi_admin/god check is the no-row fallback that keeps the
    // single-account convenience (one Supabase login → learning app AND
    // Popty) working for SSi staff.
    const [dashboardRow, learnerRow] = await Promise.all([
      authGetUser(user.email).catch(() => null),
      supabaseClient.getClient()
        .from('learners')
        .select('id, user_id, display_name, platform_role, educational_role, dashboard_courses')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => data)
        .catch(() => null),
    ])

    return resolvePoptyIdentity({ email: user.email, dashboardRow, learnerRow })
  } catch (err) {
    logger.error('[Auth] Supabase JWT verification error:', err)
    return null
  }
}

// Helper: check if user has access to a specific course
function userCanAccessCourse(user, courseCode) {
  if (!user || !courseCode) return false
  if (user.courses === '*') return true
  if (Array.isArray(user.courses)) return user.courses.includes(courseCode)
  return false
}

// Helper: extract session from Authorization header and verify dashboard access
// Tries Supabase JWT first, falls back to old session-based auth
async function requireAdmin(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return null }

  // Resolve via Supabase JWT first, then legacy dashboard sessions — but both
  // paths funnel through the ONE role gate. Any non-admin identity (editor,
  // checker, recorder, popty_user) is refused here, whichever path resolved it.
  const user = (await verifySupabaseJWT(token)) || (await authValidateSession(token))
  if (!hasAdminRole(user)) { res.status(403).json({ error: 'Admin access required' }); return null }
  return user
}

// Like requireAdmin but allows any dashboard user (editor, recorder, admin)
async function requireDashboardUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return null }

  const supabaseUser = await verifySupabaseJWT(token)
  if (supabaseUser) return supabaseUser

  const user = await authValidateSession(token)
  if (!user) { res.status(403).json({ error: 'Dashboard access required' }); return null }
  return user
}

// =============================================================================
// COURSE SCOPING — every route carrying :courseCode is gated in ONE place:
// the caller must be a dashboard user AND hold access to that course.
// A missing/empty course list on a non-admin record is a DENY (the
// dashboard_users.courses DB default of '"*"' is fail-open; only an explicit
// '*' or list membership grants access — userCanAccessCourse handles both).
// =============================================================================

// Same-host service-mesh calls (phase8 cache busts, course-builder/build-team
// agents spawned ON the host — the working remote design) arrive on loopback
// with NO forwarded headers. ngrok and LAN traffic always carry
// x-forwarded-for / a non-loopback peer address, so they cannot spoof this.
function isLoopbackDirectRequest(req) {
  const addr = req.socket?.remoteAddress || ''
  const isLoopback = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
  return isLoopback && !req.headers['x-forwarded-for'] && !req.headers['x-real-ip']
}

// Resolve the calling dashboard user WITHOUT writing a response. Tries, in
// order: Supabase JWT → learners (popty_user/ssi_admin/god), legacy dashboard
// session id, then Supabase JWT email → dashboard_users (the client's OTP
// model: email = identity, dashboard_users = access control — mirrors
// /api/auth/me so an OTP'd editor without a learners role still resolves).
async function resolveDashboardUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null

  const supabaseUser = await verifySupabaseJWT(token)
  if (supabaseUser) return supabaseUser

  const sessionUser = await authValidateSession(token)
  if (sessionUser) return sessionUser

  try {
    const { data: { user } } = await supabaseClient.getClient().auth.getUser(token)
    if (user?.email) return await authGetUser(user.email)
  } catch (err) { /* invalid token — fall through to null */ }
  return null
}

// Small TTL cache so polling surfaces (build monitor, audio-stats, upload
// queue) don't hit Supabase auth on every request.
const courseScopeUserCache = new Map() // token → { user, expires }
const COURSE_SCOPE_CACHE_TTL = 60 * 1000
const COURSE_SCOPE_CACHE_MAX = 500

async function resolveDashboardUserCached(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  const hit = courseScopeUserCache.get(token)
  if (hit && hit.expires > Date.now()) return hit.user
  const user = await resolveDashboardUser(req)
  if (user) {
    if (courseScopeUserCache.size >= COURSE_SCOPE_CACHE_MAX) {
      const oldest = courseScopeUserCache.keys().next().value
      courseScopeUserCache.delete(oldest)
    }
    courseScopeUserCache.set(token, { user, expires: Date.now() + COURSE_SCOPE_CACHE_TTL })
  }
  return user
}

app.param('courseCode', async (req, res, next, courseCode) => {
  try {
    if (isLoopbackDirectRequest(req)) return next()

    const user = await resolveDashboardUserCached(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    // admin → all courses (matches useAuth.canAccessCourse); everyone else
    // needs '*' or list membership. Missing/empty courses on the record = DENY.
    if (user.role !== 'admin' && !userCanAccessCourse(user, courseCode)) {
      logger.warn(`[CourseScope] DENY ${user.email || 'unknown'} → ${courseCode} (${req.method} ${req.path})`)
      return res.status(403).json({ error: `No access to course ${courseCode}` })
    }
    req.dashboardUser = user
    next()
  } catch (err) {
    logger.error('[CourseScope] error:', err)
    res.status(500).json({ error: 'Course access check failed' })
  }
})

// Human voice engine: synthesis jobs + honest coverage. Mounted under
// /api/production/:courseCode so the app.param course-scope gate above fires
// for every route (the router itself uses mergeParams — it must NOT declare
// :courseCode internally or it would escape the gate).
app.use('/api/production/:courseCode/voice-engine',
  require('./voice-engine/router.cjs').createVoiceEngineRouter())

// Voice-engine team roster: members, voice-slot assignment (writes
// courses.voice_config — surgical single-slot merge), recorder invites.
// Same gate coverage as above; bumpCourseVersion so learner apps re-fetch
// after a voice_config change (mirrors voice-config-service).
app.use('/api/production/:courseCode/team',
  require('./voice-engine/team-router.cjs')({
    requireDashboardUser,
    userCanAccessCourse,
    getDb: () => supabaseClient.getClient(),
    logger,
    bumpCourseVersion: require('./shared/course-version.cjs').bumpCourseVersion,
  }))

// Pod recording coverage (keystone §5): per cast voice (voice_config.podCast)
// lines recorded / remaining + per-pod breakdown, human-vs-tts per sentence.
// REGISTERED BEFORE the pods router on purpose: this read-only route relies on
// the app.param gate alone (which keeps the same-host loopback bypass); the
// router's per-route requireDashboardUser has no such bypass and would 401
// mesh/local tooling.
app.get('/api/production/:courseCode/pods/coverage', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const { computePodsCoverage } = require('./voice-engine/pods-coverage.cjs')
    const coverage = await computePodsCoverage(
      { supabase: supabaseClient.getClient(), logger }, req.params.courseCode)
    res.json(coverage)
  } catch (err) {
    logger.error(`[PodsCoverage] ${err.message}`)
    res.status(err.status || 500).json({ error: err.message })
  }
})

// Pod casting + per-voice recording plans (human pod recording keystone).
// Same gate coverage as the voice-engine mounts above. Writes touch ONLY
// courses.voice_config.podCast — an additive key TTS serving never reads —
// via a surgical merge (pods-cast.cjs), so no course-version bump is needed.
app.use('/api/production/:courseCode/pods',
  require('./voice-engine/pods-router.cjs')({
    requireDashboardUser,
    userCanAccessCourse,
    getDb: () => supabaseClient.getClient(),
    logger,
  }))

// Audio preview: the human listening pass over rendered clips (READ-ONLY —
// pure SELECTs plus the veracity quarantine ledger; no writes, no TTS).
// Same app.param course-scope gate coverage as the mounts above.
app.use('/api/production/:courseCode/audio-preview',
  require('./audio-preview-router.cjs')({
    getDb: () => supabaseClient.getClient(),
    logger,
  }))

// The ONE recordist surface. Top-level /api/recording/* on purpose: this queue
// is derived BY LANGUAGE across every course (language_recording_policy), so it
// has no :courseCode to be scoped by, and its three recordist routes are
// deliberately unauthenticated — the link IS the identity. The admin routes it
// carries (/languages) take requireAdmin.
// Mounted AFTER handleRecordingUpload is defined (hoisted function declaration),
// which it calls rather than duplicating the upload seam.
app.use('/api/recording',
  require('./voice-engine/recordist-router.cjs')({
    getDb: () => (supabaseClient.isInitialized() ? supabaseClient.getClient() : null),
    logger,
    requireAdmin,
    handleRecordingUpload,
  }))

// Course QA / approval gate: per-round human play-through sign-off, derived
// per-cycle verification status, and the publish block that stops a course
// reaching learners unsigned. Mounted on its own top-level /api/qa-gate/*
// prefix rather than under /api/production/:courseCode so the estate view
// (every course at once) has somewhere to live.
// Schema + why: ops/sql/20260805-course-qa-gate.sql.
require('./api/course-qa-gate-routes.cjs').mount(app, {
  requireAdmin,
  requireDashboardUser,
  getDb: () => supabaseClient.getClient(),
  logger,
})

/** The gate, for the publish path below. Lazy: see the mount note above. */
let _qaGate = null
const qaGate = () => (_qaGate || (_qaGate = require('./course-qa-gate.cjs')
  .createGate({ getDb: () => supabaseClient.getClient(), logger })))

// POST /api/auth/login — login with email + code
app.post('/api/auth/login', async (req, res) => {
  const { email, code } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })
  if (!code) return res.status(400).json({ error: 'Code required' })
  try {
    const result = await authVerifyLoginCode(email, code)
    if (result.error) return res.status(401).json({ error: result.error })
    const session = await authCreateSession(result.email)
    logger.info(`[Auth] Login successful for ${email}`)
    res.json({ success: true, session: session.sessionId, user: session.user, expires: session.expires })
  } catch (err) {
    logger.error('[Auth] Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/auth/generate-code — admin generates a login code for a user
app.post('/api/auth/generate-code', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })
  try {
    const result = await authGenerateLoginCode(email)
    if (result.error) return res.status(404).json({ error: result.error })
    logger.info(`[Auth] Login code generated for ${email} by ${adminUser.email}`)
    res.json({ success: true, code: result.code, expires: new Date(result.expires).toISOString() })
  } catch (err) {
    logger.error('[Auth] Generate code error:', err)
    res.status(500).json({ error: 'Failed to generate code' })
  }
})

// GET /api/auth/me — get current user from session or email lookup
app.get('/api/auth/me', async (req, res) => {
  // Path 1: Bearer token (JWT or old session)
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const supabaseUser = await verifySupabaseJWT(token)
    if (supabaseUser) return res.json(supabaseUser)

    const user = await authValidateSession(token)
    if (user) return res.json(user)
  }

  // Path 2: Email query param (used by frontend when direct Supabase is blocked by CORS)
  const email = req.query.email
  if (email) {
    const user = await authGetUser(email)
    if (user) return res.json(user)
    return res.status(404).json({ error: 'User not found' })
  }

  return res.status(401).json({ error: 'No session or email provided' })
})

// POST /api/auth/invite-dashboard — create Supabase Auth account + learner with dashboard access
app.post('/api/auth/invite-dashboard', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  const { email, name, platform_role = 'popty_user', dashboard_courses } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  if (!['ssi_admin', 'popty_user'].includes(platform_role)) {
    return res.status(400).json({ error: 'Invalid platform_role' })
  }

  const db = supabaseClient.getClient()

  try {
    // Check if Supabase Auth account already exists
    const { data: existingUsers } = await db.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let authUserId
    if (existing) {
      authUserId = existing.id
      logger.info(`[Invite] Existing auth account found for ${email}: ${authUserId}`)
    } else {
      // Create Supabase Auth account (confirmed, no email sent)
      const { data: newUser, error: createErr } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (createErr) throw createErr
      authUserId = newUser.user.id
      logger.info(`[Invite] Created auth account for ${email}: ${authUserId}`)
    }

    // Check if learner record exists
    const { data: existingLearner } = await db
      .from('learners')
      .select('id, platform_role, dashboard_courses')
      .eq('user_id', authUserId)
      .single()

    if (existingLearner) {
      // Update existing learner
      const updates = { platform_role }
      if (dashboard_courses) updates.dashboard_courses = dashboard_courses
      await db.from('learners').update(updates).eq('id', existingLearner.id)
      logger.info(`[Invite] Updated learner ${existingLearner.id} — role: ${platform_role}`)
      res.json({ success: true, message: `Updated ${email} — they can now sign in to Popty`, learner_id: existingLearner.id })
    } else {
      // Create learner record
      const displayName = name || email.split('@')[0]
      const { data: newLearner, error: insertErr } = await db
        .from('learners')
        .insert({
          user_id: authUserId,
          display_name: displayName,
          platform_role,
          dashboard_courses: dashboard_courses || null,
          verified_emails: [email.toLowerCase()],
        })
        .select('id')
        .single()
      if (insertErr) throw insertErr
      logger.info(`[Invite] Created learner for ${email}: ${newLearner.id} — role: ${platform_role}`)
      res.json({ success: true, message: `Invited ${email} — they can now sign in to Popty`, learner_id: newLearner.id })
    }
  } catch (err) {
    logger.error('[Invite] Error:', err)
    res.status(500).json({ error: err.message || 'Failed to invite user' })
  }
})

// POST /api/auth/invite — add new user (admin only) [LEGACY — old dashboard_users flow]
// PUT /api/auth/invite — edit existing user (admin only)
app.post('/api/auth/invite', async (req, res) => { handleInvite(req, res) })
app.put('/api/auth/invite', async (req, res) => { handleInvite(req, res) })

async function handleInvite(req, res) {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return
  const { email, name, courses, role = 'editor' } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  // 'recorder' still accepted for backward-compat with existing rows; new
  // invites default to 'editor'. Recorder role was retired from the UI on
  // 2026-04-21 — the only gating going forward is per-course access.
  if (!['recorder', 'editor', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
  // Admins always have access to every course — store the '*' wildcard (renders
  // as a single "All courses" chip, not a wall of every course code) and skip
  // the per-course requirement. Non-admins must get at least one specific course.
  const isAdminInvite = role === 'admin'
  if (!isAdminInvite && (!courses || !Array.isArray(courses) || courses.length === 0)) {
    return res.status(400).json({ error: 'At least one course must be assigned' })
  }
  const effectiveCourses = isAdminInvite ? '*' : courses
  try {
    const db = supabaseClient.getClient()
    if (req.method === 'POST') {
      const existing = await authGetUser(email)
      if (existing) return res.status(409).json({ error: 'User already exists', existing })

      // Create Supabase Auth account so user can receive OTP
      try {
        const { data: authData, error: authErr } = await db.auth.admin.createUser({
          email,
          email_confirm: true,
        })
        if (authErr) {
          // "already registered" is fine — just means they already have an auth account
          if (authErr.message?.includes('already') || authErr.message?.includes('exists')) {
            logger.info(`[Auth] Supabase Auth account already exists for ${email}`)
          } else {
            logger.warn(`[Auth] Failed to create Supabase Auth account for ${email}: ${authErr.message}`)
          }
        } else {
          logger.info(`[Auth] Created Supabase Auth account for ${email}: ${authData?.user?.id}`)
        }
      } catch (authErr) {
        logger.warn(`[Auth] Supabase Auth account creation failed for ${email}: ${authErr.message}`)
      }

      const sanitizedEmail = email.split('@')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const primaryLanguage = (Array.isArray(courses) ? courses[0] : null)?.split('_')[0] || 'unknown'
      // Non-admins get a voice_id since editors are the ones recording now.
      const voiceId = role !== 'admin' ? `human_${sanitizedEmail}_${primaryLanguage}` : null
      const row = {
        email, name: name || email.split('@')[0], role, courses: effectiveCourses,
        ...(voiceId && { voice_id: voiceId }),
        invited_by: adminUser.email || adminUser.name, invited_at: new Date().toISOString()
      }
      const { data, error } = await db.from('dashboard_users').insert(row).select().single()
      if (error) throw error
      logger.info(`[Auth] User invited: ${email}`)
      res.json({ success: true, message: `Invited ${email}`, user: data })
    } else {
      const existing = await authGetUser(email)
      if (!existing) return res.status(404).json({ error: 'User not found' })
      const updates = {
        ...(name && { name }), role, courses: effectiveCourses,
        updated_by: adminUser.email || adminUser.name, updated_at: new Date().toISOString()
      }
      const { data, error } = await db.from('dashboard_users').update(updates).eq('email', email).select().single()
      if (error) throw error
      logger.info(`[Auth] User updated: ${email}`)
      res.json({ success: true, message: `Updated ${email}`, user: data })
    }
  } catch (err) {
    logger.error('[Auth] Invite/update error:', err)
    res.status(500).json({ error: 'Failed to process request' })
  }
}

// GET /api/auth/users — list all users (admin only)
// DELETE /api/auth/users — remove a user (admin only)
app.get('/api/auth/users', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return
  try {
    const { data, error } = await supabaseClient.getClient()
      .from('dashboard_users').select('*').order('invited_at', { ascending: false })
    if (error) throw error
    res.json({ users: data || [], total: (data || []).length })
  } catch (err) {
    logger.error('[Auth] List users error:', err)
    res.status(500).json({ error: 'Failed to list users' })
  }
})

app.delete('/api/auth/users', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return
  const email = req.query.email
  if (!email) return res.status(400).json({ error: 'Email query param required' })
  if (email === adminUser.email) return res.status(400).json({ error: 'Cannot delete your own account' })
  try {
    const existing = await authGetUser(email)
    if (!existing) return res.status(404).json({ error: 'User not found' })
    const { error } = await supabaseClient.getClient()
      .from('dashboard_users').delete().eq('email', email)
    if (error) throw error
    logger.info(`[Auth] User deleted: ${email} by ${adminUser.email}`)
    res.json({ success: true, message: `User ${email} removed` })
  } catch (err) {
    logger.error('[Auth] Delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '')
  if (sessionId) {
    try { await authDeleteSession(sessionId) } catch (err) { /* ignore */ }
  }
  res.json({ success: true })
})

// =============================================================================
// INVITE CODES
// =============================================================================

// POST /api/auth/invite-codes/generate — generate an invite code
// Admins: any role, any course. Editors: can only invite editors for their own courses.
// (The 'recorder' role was retired from the UI on 2026-04-21; accepted here for
// backward compat with any outstanding recorder invites. Gating is now by course access only.)
app.post('/api/auth/invite-codes/generate', async (req, res) => {
  const user = await requireDashboardUser(req, res)
  if (!user) return

  const { courses, role = 'editor', label, expires_days, max_uses = 1 } = req.body
  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: 'courses array is required' })
  }
  if (!['recorder', 'editor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  // Non-admins can only generate non-admin codes for their own courses.
  if (user.role !== 'admin') {
    if (role === 'admin') {
      return res.status(403).json({ error: 'Only admins can invite admins' })
    }
    const userCourses = Array.isArray(user.courses) ? user.courses : []
    const unauthorized = courses.filter(c => !userCourses.includes(c))
    if (unauthorized.length > 0) {
      return res.status(403).json({ error: `You don't have access to: ${unauthorized.join(', ')}` })
    }
  }

  try {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    const bytes = crypto.randomBytes(8)
    for (let i = 0; i < 8; i++) { code += chars[bytes[i] % chars.length] }

    const expires_at = expires_days
      ? new Date(Date.now() + expires_days * 86400000).toISOString()
      : null

    const db = supabaseClient.getClient()
    const { data, error } = await db.from('dashboard_invite_codes').insert({
      code,
      role,
      courses: JSON.stringify(courses),
      label: label || null,
      created_by: user.email,
      expires_at,
      max_uses: max_uses || 1,
    }).select().single()

    if (error) throw error
    logger.info(`[Auth] Invite code generated: ${code} for ${courses.join(',')} by ${user.email}`)
    res.json({ code: data.code, id: data.id, expires_at: data.expires_at })
  } catch (err) {
    logger.error('[Auth] Generate invite code error:', err)
    res.status(500).json({ error: 'Failed to generate invite code' })
  }
})

// GET /api/auth/invite-codes — list all invite codes (admin only)
app.get('/api/auth/invite-codes', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  try {
    const db = supabaseClient.getClient()
    const { data, error } = await db
      .from('dashboard_invite_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ codes: data || [] })
  } catch (err) {
    logger.error('[Auth] List invite codes error:', err)
    res.status(500).json({ error: 'Failed to list invite codes' })
  }
})

// POST /api/auth/invite-codes/redeem — redeem an invite code (no admin required)
app.post('/api/auth/invite-codes/redeem', async (req, res) => {
  const { code: rawCode, email: rawEmail } = req.body
  if (!rawCode || !rawEmail) {
    return res.status(400).json({ error: 'code and email are required' })
  }

  // Supabase Auth normalises auth.users.email to lowercase; dashboard_users.email
  // is the join key verifySupabaseJWT uses (authGetUser(user.email), exact TEXT
  // match). Storing whatever case the user typed here silently orphans a
  // mixed-case redeemer — every later request resolves to "no dashboard access".
  const email = rawEmail.trim().toLowerCase()
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '').trim()

  try {
    const db = supabaseClient.getClient()

    // Check if user already has dashboard access
    const existing = await authGetUser(email)
    if (existing) {
      return res.status(409).json({ error: 'You already have dashboard access' })
    }

    // Atomically claim the code: increment use_count only if under max_uses
    const { data: invite, error: claimError } = await db
      .from('dashboard_invite_codes')
      .update({
        use_count: db.rpc ? undefined : undefined, // placeholder — real increment below
      })
      .eq('code', code)
      .select()
      .single()

    // Fetch the code first to validate
    const { data: codeRow, error: fetchError } = await db
      .from('dashboard_invite_codes')
      .select('*')
      .eq('code', code)
      .single()

    if (fetchError || !codeRow) {
      return res.status(404).json({ error: 'Invalid invite code' })
    }

    // Check expiry
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invite code has expired' })
    }

    // Check uses
    if (codeRow.use_count >= codeRow.max_uses) {
      return res.status(410).json({ error: 'This invite code has already been used' })
    }

    // Parse courses from the code
    let courses = codeRow.courses
    if (typeof courses === 'string') {
      try { courses = JSON.parse(courses) } catch { courses = [] }
    }

    // Create Supabase Auth account if needed (so they can log in with OTP)
    try {
      await db.auth.admin.createUser({ email, email_confirm: true })
    } catch (authErr) {
      // Already exists is fine
      if (!authErr.message?.includes('already') && !authErr.message?.includes('exists')) {
        logger.warn(`[Auth] Failed to create auth account for ${email}: ${authErr.message}`)
      }
    }

    // Create dashboard_users row
    const { data: newUser, error: insertError } = await db
      .from('dashboard_users')
      .insert({
        email,
        name: email.split('@')[0],
        role: codeRow.role,
        courses,
        invited_by: codeRow.created_by,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Mark code as used (atomic increment + append redemption)
    const redemptions = [...(codeRow.redemptions || []), { email, redeemed_at: new Date().toISOString() }]
    await db
      .from('dashboard_invite_codes')
      .update({
        use_count: codeRow.use_count + 1,
        redemptions,
      })
      .eq('code', code)

    logger.info(`[Auth] Invite code ${code} redeemed by ${email} → ${codeRow.role}, courses: ${JSON.stringify(courses)}`)
    res.json({
      success: true,
      user: { email: newUser.email, name: newUser.name, role: newUser.role, courses: newUser.courses }
    })
  } catch (err) {
    logger.error('[Auth] Redeem invite code error:', err)
    res.status(500).json({ error: 'Failed to redeem invite code' })
  }
})

// =============================================================================
// END AUTH ROUTES
// =============================================================================

// Health check
app.get('/api/production/health', (req, res) => {
  const supabaseInitialized = supabaseClient.isInitialized()
  res.json({
    status: 'ok',
    service: 'Production API',
    port: PORT,
    timestamp: new Date().toISOString(),
    supabase: supabaseInitialized ? 'connected' : 'not initialized'
  })
})

// Schema validation - compare APML spec against live database
app.get('/api/production/schema/validate', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const validator = new SchemaValidator(supabaseClient.getClient())
    const results = await validator.validate()

    logger.info(`Schema validation: ${results.valid ? 'VALID' : 'DRIFT DETECTED'}`)

    res.json(results)
  } catch (err) {
    logger.error('Schema validation failed:', err)
    res.status(500).json({ error: err.message })
  }
})

// List all courses (simplified endpoint for frontend)
// Replaces orchestrator's /api/courses endpoint
// Returns course metadata immediately; stats loaded separately via /api/courses/stats
app.get('/api/courses', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const courses = await supabaseClient.getCourses()

    // Helper to compute days since beta started
    function computeBetaDays(betaStartedAt) {
      if (!betaStartedAt) return null
      const start = new Date(betaStartedAt)
      const now = new Date()
      const diffMs = now - start
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }

    // If ?stats=true, include stats (legacy behaviour, slower)
    let stats = {}
    if (req.query.stats === 'true') {
      stats = await supabaseClient.getAllCourseContentStats()
    }

    // Merge course info with stats and platform status
    const result = courses.map(c => ({
      code: c.course_code,
      course_code: c.course_code,
      known_lang: c.known_lang,
      target_lang: c.target_lang,
      display_name: c.display_name,
      status: c.status,
      // Platform deployment status
      new_app_status: c.new_app_status || 'not_available',
      legacy_app_status: c.legacy_app_status || 'not_available',
      new_app_beta_started_at: c.new_app_beta_started_at,
      legacy_app_beta_started_at: c.legacy_app_beta_started_at,
      new_app_beta_days: computeBetaDays(c.new_app_beta_started_at),
      legacy_app_beta_days: computeBetaDays(c.legacy_app_beta_started_at),
      content_status: c.content_status || 'empty',
      export_ready: c.export_ready || false,
      created_at: c.created_at || null,
      updated_at: c.updated_at || null,
      stats: stats[c.course_code] || { seeds: 0, completedSeeds: 0, legos: 0, phrases: 0, audio: 0 }
    }))

    logger.info(`Returning ${result.length} courses from database${req.query.stats === 'true' ? ' (with stats)' : ''}`)
    res.json({ courses: result })
  } catch (err) {
    logger.error('Failed to get courses:', err)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// THE DERIVED ESTATE MAP — GET /api/estate-map
// =============================================================================
// The questions workers on this estate keep getting wrong, answered from the
// database on every read. Tom's ruling, 2026-08-13: "Code >> Doctrine - we
// basically moved to deprecate doctrine docs as much as possible because of our
// speed of iteration. It's too difficult to keep docs up to date." So this is a
// query, not a document: no cache, no snapshot, no materialised view, no cron.
// Every field below is recomputed per request (public.estate_map(), see
// database/migrations/20260813_estate_map.sql).
//
// The SEMANTICS block below is the one human-authored part, and it is here rather
// than in a doc on purpose: the meaning of a field lives in the same file as the
// query that produces it, so a change to one lands next to the other. Most of this
// week's estate errors were wrong MEANINGS, not wrong numbers — "blocked" read as
// unreleased, "veracity" read as quality, "draft lines" read as missing content.

const ESTATE_MAP_SEMANTICS = {
  released:
    "new_app_status IN ('live','beta'). Tom: \"Live + Beta = released in the DB status.\" "
    + 'A course that is not marked released is not necessarily unbuilt — it may be fully built and simply not switched on.',
  blocked:
    'In the casting docs and the premium queue, "blocked" means AWAITING VOICE CASTING. It says nothing '
    + 'whatsoever about whether the course is released — released courses are routinely blocked, and blocked '
    + 'courses are routinely live. Reading "blocked" as "unreleased" is one of the specific errors this endpoint exists to stop.',
  blocked_reasons:
    'EVERY applicable blocker for the course, not just the top one. `blocked_reason` is the first and the one to '
    + 'act on; this list is the whole truth. They sum to more than the blocked course count.',
  blocked_reason:
    'Machine-readable blocker, most-blocking first: no_audio | pod0_awaiting_voice_approval | '
    + 'pod0_stale_voice_approval | pod0_known_track_incomplete | pod0_target_track_incomplete | null. '
    + 'Every value is about AUDIO PRODUCTION, never about release state.',
  veracity_checked:
    'Clips that have been through the veracity QA process. NOT a quality signal, and NOT a coverage target: '
    + 'blanket per-clip whisper checking was deliberately removed from phase8, and the standing model is '
    + 'graduated sampling (see `render_qa_policy`). A low figure here is the policy working as intended — it '
    + 'does NOT mean the audio is bad, unchecked in any meaningful sense, or in need of repair, and it is not '
    + 'a backlog to burn down.',
  render_qa_policy:
    'STANDING MODEL for render/QA, Tom 2026-08-13: GRADUATED SAMPLING. Veracity-check ~10% of the FIRST '
    + 'job/course in a render run; if that sample comes back clean, drop to ~1% across the remaining 90%; keep '
    + 'relaxing the rate as trust accumulates course by course through the run. Neither blanket per-clip '
    + 'whisper on everything (removed from phase8 last week) nor zero checking. Trust is earned within a run '
    + 'and spent on the run — a clean first sample buys the cheaper rate for what follows it, and a FAILURE '
    + 'snaps the rate straight back. Implemented in services/audio-veracity.cjs (createSampler); phase8 marks '
    + 'the course boundaries. What it catches is a bad RUN — a voice gone silent, a truncating provider — not '
    + 'one bad clip among healthy ones; do not sell it as the latter.',
  voice_mode:
    'tts | human | mixed | unknown, derived from course_audio.origin. "unknown" means the course has no audio '
    + 'rows at all — it is not a guess at TTS. "mixed" is a real and common state on this estate, not a defect.',
  voices_of_record:
    'The voice ids actually carrying this course\'s clips, read from course_audio. NOT the stored cast: only 16 of '
    + '119 Spanish pod clips sit on the stored listening_pods.speakers cast, and 0 of 110 on cym_n. If you want to '
    + 'know what a learner hears, this is the field; the stored cast is INTENDED casting and is a different thing.',
  human_clips:
    "Aran's and Catrin's recordings are PROTECTED SLOTS. Those are their real voices, and TTS never overwrites "
    + 'them, even when a clip is dead. Tom\'s standing position on the 23 dead Welsh English stubs is that they '
    + "remain his voice's slots until Aran says otherwise.",
  welsh_is_human_voice:
    'HARD RULE, Tom 2026-08-13: WELSH IS A HUMAN-VOICE LANGUAGE. Its gaps are RECORDING TASKS FOR '
    + 'ARAN AND CATRIN, NOT RENDER TASKS. Every cym_* course is permanently excluded from every TTS '
    + 'render queue — recount, render plan, audio-pass request, all of it — and Aran\'s and Catrin\'s '
    + 'recordings are never overwritten by synthesis. A low Welsh audio-coverage figure in this '
    + 'response is a recording backlog and must never be costed, queued or proposed as renders. '
    + 'Enforced in code at services/shared/human-voice-courses.cjs (isHumanVoiceCourse / '
    + 'isHumanVoiceLang / assertNoHumanVoiceInQueue), with no runtime override by design: including '
    + 'Welsh would take a code change signed off by Tom. Breton (bre_for_fra) is the same class '
    + '(2026-07-27), and so is Pennsylvania Dutch (pdc_for_eng, 2026-08-14) — admitted to clip '
    + 'identity the same day it was ruled human-voice-only, so its clips can be written but never '
    + 'synthesised. The trigger was the 2026-08-13 recount proposing 23,442 Welsh renders while 91% '
    + 'of Welsh distinct texts were already humanly recorded and 23,960 slots already pointed at '
    + 'origin=\'human\' clips.',
  known_dead_stubs:
    'Slots linked to a clip whose file is under 2KB — linked in the database, silent to the learner. The 23 on the '
    + 'Welsh pod-0 English track are 834-byte files from a bad write on 2026-06-15. A linked slot is not a filled slot.',
  draft_lines:
    'Pod lines whose target text is machine-translated and no human has read yet. The text EXISTS; it is '
    + 'unconfirmed, not missing.',
  english_audio:
    'English renders once, estate-wide, and links everywhere: there is one English clone pool shared across the '
    + 'estate. Do not assume a course\'s English audio was rendered for that course.',
  pods_by_language:
    'STANDING FACT, Tom 2026-08-13: PODS ARE PER LANGUAGE, NOT PER COURSE. Each language\'s pod content renders '
    + 'ONCE and is shared across every course in that language — the English pod-0 dedupe generalised to the '
    + 'whole estate. The player handles pod delivery speed; per-course pod duplication is not the answer to '
    + 'anything. This block is the ruling made countable: `slots_per_course_counting` is the OLD unit, '
    + '`distinct_lines` is the real render cost, and `collapse_factor` is the ratio between them.',
  collapse_factor:
    'slots_per_course_counting / distinct_lines for a language\'s pod-0 content. It is how much a per-course '
    + 'count over-states the render. CONSEQUENCE Tom flagged: the ~210k-clip premium-first non-English rebuild '
    + 'queue was counted per-course and should collapse significantly under per-language dedupe. That number '
    + 'wants recounting and publishing BEFORE anyone proposes spend against it.',
  pod_0:
    'Per-COURSE pod state — still the right unit for "can a learner play this course\'s pod 0", and the WRONG '
    + 'unit for costing a render. To cost a render, read `pods_by_language`. Both are in this response on '
    + 'purpose, because conflating them is what produced a per-course render queue.',
  lego_types:
    'An A-LEGO is one word on at least one side, and is therefore unmappable. An M-LEGO is two or more words on '
    + 'BOTH sides, is mappable, and mapping is offered on Intros only. Tom: "It\'s just classification that feeds the mapping."',
  mapping:
    'Presentational segmentation of the known text in target word order. Never a text change, never word-pairing. '
    + 'Editing a mapping is segmentation, not translation.',
  code_over_doctrine:
    'Tom: "Code >> Doctrine - we basically moved to deprecate doctrine docs as much as possible because of our '
    + 'speed of iteration. It\'s too difficult to keep docs up to date." Where a doc and the live database disagree, '
    + 'the doc is stale. This endpoint being derived rather than written is that principle applied to the estate map itself.',
}

/**
 * Decide what a course is blocked on, from its already-derived row plus the live
 * pod-0 voice-approval verdict. Pure — no I/O — so the ordering is readable and testable.
 *
 * Returns EVERY applicable blocker, not just the first. Reporting only the highest
 * would be the bug this endpoint exists to prevent: every one of the 67 pod-0 courses
 * is awaiting voice approval, which would mask the fact that the Welsh pod-0 English
 * track is separately silent. `blocked_reason` is the one to act on; `blocked_reasons`
 * is the truth.
 */
function estateMapBlockers(course, approval) {
  const pod0 = course.pod_0 || { exists: false }
  const out = []
  if ((course.audio?.clips || 0) === 0) {
    out.push({ reason: 'no_audio', detail: 'No audio rows exist for this course at all.' })
  }
  if (pod0.exists && approval && !approval.ok) {
    out.push({
      reason: approval.reason === 'stale_approval' ? 'pod0_stale_voice_approval' : 'pod0_awaiting_voice_approval',
      detail: approval.message,
    })
  }
  if (pod0.exists && (pod0.known_empty > 0 || pod0.known_dead_stubs > 0)) {
    out.push({
      reason: 'pod0_known_track_incomplete',
      detail: `Pod 0's known-language track has ${pod0.known_empty} empty slots and `
        + `${pod0.known_dead_stubs} linked-but-dead clips out of ${pod0.slots}.`,
    })
  }
  if (pod0.exists && pod0.target_empty > 0) {
    out.push({
      reason: 'pod0_target_track_incomplete',
      detail: `Pod 0's target-language track has ${pod0.target_empty} empty slots out of ${pod0.slots}.`,
    })
  }
  return out
}

/** Skimmable text rendering, so a worker can eyeball the map without jq. */
function estateMapAsText(payload) {
  const t = payload.totals
  const lines = [
    `ESTATE MAP — computed ${payload.generated_at} (fresh per read, never cached)`,
    '',
    `courses ${t.courses} | released ${t.released} (live ${t.new_app_live} + beta ${t.new_app_beta}) | `
      + `unreleased ${t.courses - t.released} (drafts/never-shipped) | `
      + `tts ${t.voice_mode.tts} human ${t.voice_mode.human} mixed ${t.voice_mode.mixed} unknown ${t.voice_mode.unknown}`,
    `pod 0: ${t.with_pod_0} courses have one | blocked: ${t.blocked}`,
    ...Object.entries(t.blocked_by_reason).map(([r, n]) => `    ${n}  ${r}`),
    '',
    `pod lines, per-course counting ${t.pod_0_lines.per_course_counting} -> per-LANGUAGE `
      + `${t.pod_0_lines.distinct_per_language} distinct. Pods are per language, not per course.`,
    ...payload.pods_by_language.slice(0, 8).map(l =>
      `    ${l.lang.padEnd(5)} ${String(l.slots_per_course_counting).padStart(6)} slots -> `
      + `${String(l.distinct_lines).padStart(5)} lines  (${l.collapse_factor}x)  across `
      + `${l.courses_with_pod_0} courses`),
    '',
    'COURSE                          REL  VOICE   CLIPS    POD-0 (tgt/known of slots)  BLOCKED ON',
  ]
  for (const c of payload.courses) {
    const pod = c.pod_0.exists
      ? `${c.pod_0.target_linked}/${c.pod_0.known_linked} of ${c.pod_0.slots}`.padEnd(26)
      : '—'.padEnd(26)
    lines.push(
      c.course_code.padEnd(32)
      + (c.released ? 'yes' : 'no ').padEnd(5)
      + c.audio.voice_mode.padEnd(8)
      + String(c.audio.clips).padEnd(9)
      + pod
      + c.blocked_reasons.join(', '),
    )
  }
  lines.push('', 'SEMANTICS — what these words mean here', '')
  for (const [k, v] of Object.entries(payload.semantics)) lines.push(`${k}:`, `  ${v}`, '')
  return lines.join('\n')
}

// GET /api/estate-map — the derived map. No auth, by design: any worker with a curl
// must be able to read it, or they will go back to inferring estate facts instead.
app.get('/api/estate-map', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const supabase = supabaseClient.getClient()

    // 1. The derived rows — one round trip, aggregated in SQL (~1.8s over ~2.5M audio rows).
    //    Returns { courses, pods_by_language }: pods are counted per LANGUAGE as well
    //    as per course, because per-language is the unit a render is actually costed in.
    const { data: derived, error } = await supabase.rpc('estate_map')
    if (error) throw new Error(`estate_map(): ${error.message}`)
    const rows = derived?.courses || []
    const podsByLanguage = derived?.pods_by_language || []

    // 2. Overlay the live pod-0 voice-approval verdict. Same code path the real
    //    generation gate uses, so a course reported as awaiting approval here is a
    //    course /generate-pods will actually refuse.
    const [{ data: pods, error: podErr }, approvals] = await Promise.all([
      supabase.from('listening_pods').select('id, course_code, speakers'),
      podVoiceApprovals.loadApprovals(supabase),
    ])
    if (podErr) throw new Error(`load pods: ${podErr.message}`)
    const podsByCourse = new Map()
    for (const p of pods || []) {
      if (!podsByCourse.has(p.course_code)) podsByCourse.set(p.course_code, [])
      podsByCourse.get(p.course_code).push(p)
    }

    let courses = (rows || []).map(c => {
      const coursePods = podsByCourse.get(c.course_code) || []
      const approval = coursePods.length
        ? podVoiceApprovals.evaluateApproval(
          approvals[c.course_code] || null,
          podVoiceApprovals.castFingerprint(coursePods),
        )
        : null
      const blockers = estateMapBlockers(c, approval)
      return {
        ...c,
        pod_voice_approval: approval ? approval.reason : 'no_pods',
        blocked: blockers.length > 0,
        blocked_reason: blockers.length ? blockers[0].reason : null,
        blocked_detail: blockers.length ? blockers[0].detail : null,
        blocked_reasons: blockers.map(b => b.reason),
        blockers,
      }
    })

    // 3. Cheap conveniences. The unfiltered read stays the default.
    if (req.query.released === 'true') courses = courses.filter(c => c.released)
    if (req.query.course) courses = courses.filter(c => c.course_code === req.query.course)

    const payload = {
      generated_at: new Date().toISOString(),
      derived: 'Computed from the database on every read. Never cached, never a snapshot. '
        + 'If this disagrees with a document, the document is stale.',
      totals: {
        courses: courses.length,
        released: courses.filter(c => c.released).length,
        new_app_live: courses.filter(c => c.new_app_status === 'live').length,
        new_app_beta: courses.filter(c => c.new_app_status === 'beta').length,
        legacy_released: courses.filter(c => ['live', 'beta', 'released'].includes(c.legacy_app_status)).length,
        voice_mode: {
          tts: courses.filter(c => c.audio.voice_mode === 'tts').length,
          human: courses.filter(c => c.audio.voice_mode === 'human').length,
          mixed: courses.filter(c => c.audio.voice_mode === 'mixed').length,
          unknown: courses.filter(c => c.audio.voice_mode === 'unknown').length,
        },
        with_pod_0: courses.filter(c => c.pod_0.exists).length,
        blocked: courses.filter(c => c.blocked).length,
        // Counted over every applicable blocker, so a course blocked three ways
        // appears under all three. These will sum to more than `blocked`.
        blocked_by_reason: courses.reduce((acc, c) => {
          for (const r of c.blocked_reasons) acc[r] = (acc[r] || 0) + 1
          return acc
        }, {}),
        clips: courses.reduce((n, c) => n + (c.audio.clips || 0), 0),
        // Pods counted in BOTH units, so the gap between them is impossible to miss.
        // The per-course number is what a render queue gets costed at when nobody
        // remembers that pods are per language.
        pod_0_lines: {
          per_course_counting: podsByLanguage.reduce((n, l) => n + l.slots_per_course_counting, 0),
          distinct_per_language: podsByLanguage.reduce((n, l) => n + l.distinct_lines, 0),
        },
      },
      // Tom, 2026-08-13: pods are per LANGUAGE. This is the unit to cost a render in.
      pods_by_language: podsByLanguage,
      semantics: ESTATE_MAP_SEMANTICS,
      courses,
    }

    logger.info(`Estate map: ${payload.totals.courses} courses, ${payload.totals.released} released, ${payload.totals.blocked} blocked`)

    if (req.query.format === 'text' || (req.accepts(['json', 'text']) === 'text' && !req.query.format)) {
      res.type('text/plain').send(estateMapAsText(payload))
      return
    }
    res.json(payload)
  } catch (err) {
    logger.error('Failed to build estate map:', err)
    res.status(500).json({ error: err.message })
  }
})

// Course content stats — per-course endpoint for progressive loading
app.get('/api/courses/:courseCode/stats', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const stats = await supabaseClient.getCourseContentStats(req.params.courseCode)
    res.json({ course_code: req.params.courseCode, stats })
  } catch (err) {
    logger.error(`Failed to get stats for ${req.params.courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Update platform deployment status for a course
app.patch('/api/courses/:courseCode/platform-status', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { platform, status } = req.body

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Validate platform
    if (!['new_app', 'legacy_app'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform. Must be "new_app" or "legacy_app"' })
    }

    // Validate status (UI uses 'testing'/'live', DB uses 'draft'/'released')
    const validStatuses = ['not_available', 'draft', 'testing', 'beta', 'released', 'live', 'deprecated']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }
    // Normalize UI terms to DB terms: testing→draft, live→released
    let normalizedStatus = status
    if (status === 'testing') normalizedStatus = 'draft'
    if (status === 'live') normalizedStatus = 'released'

    const supabase = supabaseClient.getClient()

    // Get current course to check previous status
    const { data: current, error: fetchError } = await supabase
      .from('courses')
      .select(`${platform}_status, ${platform}_beta_started_at`)
      .eq('course_code', courseCode)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Course not found' })
      }
      throw fetchError
    }

    // Prepare update object
    const statusColumn = `${platform}_status`
    const betaColumn = `${platform}_beta_started_at`
    const updateData = { [statusColumn]: normalizedStatus }

    // Auto-set beta_started_at when entering beta
    const previousStatus = current[statusColumn]
    if (normalizedStatus === 'beta' && previousStatus !== 'beta') {
      updateData[betaColumn] = new Date().toISOString()
    }
    // Clear beta_started_at when leaving beta
    if (normalizedStatus !== 'beta' && previousStatus === 'beta') {
      updateData[betaColumn] = null
    }

    // Update the course
    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('course_code', courseCode)
      .select()
      .single()

    if (error) throw error

    logger.info(`Updated ${platform} status for ${courseCode}: ${previousStatus} -> ${status}`)

    res.json({
      success: true,
      course_code: courseCode,
      platform,
      status,
      beta_started_at: data[betaColumn]
    })
  } catch (err) {
    logger.error(`Failed to update platform status for ${req.params.courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Stats endpoint - mirrors course-builder-api's /api/stats/:courseCode
// So TextGeneration.vue and ProductionOverview.vue can use the same endpoint via ngrok
app.get('/api/stats/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Count LEGOs
    const { count: legos } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    // Count only NEW legos (unique introductions)
    const { count: newLegos } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true)

    // Count phrases
    const { count: phrases } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    // Count total seeds
    const { count: totalSeeds } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    // Count completed seeds (those with BOTH known_text and target_text non-empty)
    const { count: completedSeeds } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .neq('target_text', '')
      .neq('known_text', '')

    // Count seeds with decomposition done (decomposed_at IS NOT NULL)
    // This includes empty seeds (all vocab already known) which have no LEGO rows
    const { count: seedsWithLegos } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .not('decomposed_at', 'is', null)

    // Ratio based on NEW legos only
    const effectiveLegos = newLegos || 0
    const ratio = effectiveLegos > 0 ? (phrases / effectiveLegos) : 0

    // Calculate average phrase quality score (USE phrases have scores 5-9)
    const { data: scoreData } = await supabase
      .from('course_practice_phrases')
      .select('score')
      .eq('course_code', courseCode)
      .not('score', 'is', null)

    const scoredPhrases = scoreData?.filter(p => typeof p.score === 'number') || []
    const avgScore = scoredPhrases.length > 0
      ? (scoredPhrases.reduce((sum, p) => sum + p.score, 0) / scoredPhrases.length)
      : null

    res.json({
      course_code: courseCode,
      total_seeds: totalSeeds || 668,
      completed_seeds: completedSeeds || 0,
      seeds_with_legos: seedsWithLegos || 0,
      seeds: seedsWithLegos || 0,
      legos: effectiveLegos,
      legos_total: legos || 0,
      phrases: phrases || 0,
      ratio: ratio.toFixed(1),
      avg_phrase_score: avgScore ? avgScore.toFixed(1) : null,
      scored_phrases: scoredPhrases.length
    })
  } catch (err) {
    logger.error(`Failed to get stats for ${req.params.courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Proxy /api/build/* to course-builder-api (port 3471)
// Course Builder runs on a separate service that handles osascript/iTerm launch
const COURSE_BUILDER_URL = process.env.COURSE_BUILDER_URL || 'http://localhost:3471'

// Course-code shape, e.g. spa_for_eng / eng_for_jpn. The proxy mounts below are
// wildcards (/api/build/*, /api/v2/*, …) so the app.param('courseCode') gate
// never fires for them, and :courseCode sits in varying path positions. We
// locate the scoped course by matching this shape against the path segments
// (and, as a fallback, the JSON body) rather than by position.
const PROXY_COURSE_CODE_RE = /^[a-z]{2,4}_for_[a-z]{2,4}$/

function extractProxyCourseCode(req) {
  for (const seg of (req.path || '').split('/')) {
    if (PROXY_COURSE_CODE_RE.test(seg)) return seg
  }
  const bodyCode = req.body && (req.body.course_code || req.body.courseCode)
  if (typeof bodyCode === 'string' && PROXY_COURSE_CODE_RE.test(bodyCode)) return bodyCode
  return null
}

// Gate for the course-builder proxy routes. Course Builder (3471) has no auth of
// its own and these routes spawn Claude CLI agents on the host (osascript →
// iTerm2/Terminal → node/claude). Without this gate any caller reaching 3470
// could drive the machine for ANY course. Mirrors the app.param('courseCode')
// gate: same-host mesh/agent callbacks bypass; everyone else must be a resolved
// dashboard user, and a course named in the path/body is scoped to that user.
async function requireProxyCourseAccess(req, res, next) {
  try {
    // Same-host service-mesh / agent callbacks (spawned ON the host) — keep working.
    if (isLoopbackDirectRequest(req)) return next()

    const user = await resolveDashboardUserCached(req)
    if (!user) return res.status(401).json({ error: 'Authentication required' })

    const courseCode = extractProxyCourseCode(req)
    if (courseCode && user.role !== 'admin' && !userCanAccessCourse(user, courseCode)) {
      logger.warn(`[ProxyScope] DENY ${user.email || 'unknown'} → ${courseCode} (${req.method} ${req.path})`)
      return res.status(403).json({ error: `No access to course ${courseCode}` })
    }
    req.dashboardUser = user
    next()
  } catch (err) {
    logger.error('[ProxyScope] error:', err)
    res.status(500).json({ error: 'Course access check failed' })
  }
}

// Generic proxy function for course-builder routes
async function proxyCourseBuilder(req, res) {
  try {
    const targetUrl = `${COURSE_BUILDER_URL}${req.originalUrl}`
    logger.info(`[Proxy] ${req.method} ${req.originalUrl} -> ${targetUrl}`)

    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) && req.body
      ? JSON.stringify(req.body)
      : undefined

    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        // Forward the caller's identity so 3471 can attribute/log the spawn and
        // make its own decisions (defence-in-depth). Previously dropped.
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
      },
      body
    }

    const response = await fetch(targetUrl, fetchOptions)
    const data = await response.json()

    res.status(response.status).json(data)
  } catch (err) {
    logger.error(`[Proxy] Failed to proxy ${req.originalUrl}:`, err.message)
    res.status(502).json({ error: 'Course Builder service unavailable', details: err.message })
  }
}

app.all('/api/build/*', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/v2/*', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/golden/*', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/phrases/*', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/legos/*', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/agents', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/agents/*', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/orchestrator/*', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/qa/*', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/course/*', requireProxyCourseAccess, proxyCourseBuilder)
app.all('/api/seeds/*', requireProxyCourseAccess, proxyCourseBuilder)

// Proxy to orchestrator (port 3456) for mission-control and health endpoints
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3456'

async function proxyOrchestrator(req, res) {
  try {
    const targetUrl = `${ORCHESTRATOR_URL}${req.originalUrl}`
    logger.info(`[Proxy] ${req.method} ${req.originalUrl} -> ${targetUrl}`)

    // Only pass safe headers - exclude hop-by-hop headers that break proxying
    const safeHeaders = {
      'Content-Type': 'application/json',
      'Accept': req.headers.accept || 'application/json'
    }
    // Pass through ngrok-skip-browser-warning if present
    if (req.headers['ngrok-skip-browser-warning']) {
      safeHeaders['ngrok-skip-browser-warning'] = req.headers['ngrok-skip-browser-warning']
    }
    // Pass through authorization if present
    if (req.headers.authorization) {
      safeHeaders['Authorization'] = req.headers.authorization
    }

    const fetchOptions = {
      method: req.method,
      headers: safeHeaders
    }

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(targetUrl, fetchOptions)
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    logger.error(`[Proxy] Failed to proxy ${req.originalUrl}:`, err.message)
    res.status(502).json({ error: 'Orchestrator service unavailable', details: err.message })
  }
}

// =============================================================================
// DIRECT ROUTES (replacing orchestrator - consolidation Jan 2026)
// =============================================================================

// Health check - production-api's own health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Production API',
    port: PORT || 3470,
    timestamp: new Date().toISOString(),
    supabase: supabaseClient.isInitialized() ? 'connected' : 'not initialized',
    // Which commit is THIS PROCESS running? Frozen at start, never re-read —
    // see services/shared/build-identity.cjs. This is what the staleness
    // watchdog compares against origin/main.
    build: buildIdentity()
  })
})

// Staleness state, as last written by ops/watchdog/popty-staleness-watchdog.sh.
// Read-only and cheap by design: this serves a cached file the cron job wrote,
// it never shells out to git inside a request handler.
// Keyed by checkout basename — the watchdog script derives the identical path
// from its own repo root, so the two meet with no shared config. watson-1 runs
// services from more than one clone; a single fixed path would let one
// checkout's verdict be served as another's.
const STALENESS_STATE_FILE = process.env.POPTY_STALENESS_STATE ||
  `/tmp/popty-staleness-${path.basename(require('./shared/build-identity.cjs').REPO_ROOT)}.json`

app.get('/api/ops/staleness', (req, res) => {
  try {
    const raw = fs.readFileSync(STALENESS_STATE_FILE, 'utf8')
    const state = JSON.parse(raw)
    // Age matters as much as content: a "fresh" verdict from six hours ago
    // means the watchdog itself stopped running, which is its own alarm.
    const checkedAt = state.checked_at ? Date.parse(state.checked_at) : NaN
    const ageSeconds = Number.isNaN(checkedAt) ? null : Math.round((Date.now() - checkedAt) / 1000)
    res.json({ ...state, age_seconds: ageSeconds, build: buildIdentity() })
  } catch (err) {
    res.json({
      status: 'unknown',
      reason: `no staleness state at ${STALENESS_STATE_FILE} (${err.code || err.message})`,
      build: buildIdentity()
    })
  }
})

// =============================================================================
// EXPLAINER PACK — the Docs surface's live path (founder ruling 2026-07-27).
// The compiler (tools/explainer/compile.mjs) is deterministic node, zero LLM,
// so re-running it on demand is cheap. GET serves the freshest pack this
// machine has (live refresh if one exists, else the committed bundle); POST
// re-runs the compiler with --live (Supabase course list, audio-pass queue,
// row counts) into scripts/explainer/ — gitignored, so a refresh never
// dirties the checkout. Code-derived facts refresh via commit+CI; the button
// only covers live-state derivables, and its UI copy says so.
// =============================================================================
const LIVE_PACK_REL = 'scripts/explainer/pack-live.json'

app.get('/api/explainer/pack', (req, res) => {
  try {
    const livePath = path.join(__dirname, '..', LIVE_PACK_REL)
    const committedPath = path.join(__dirname, '..', 'src', 'explainer', 'pack.json')
    const servePath = fs.existsSync(livePath) ? livePath : committedPath
    res.json(JSON.parse(fs.readFileSync(servePath, 'utf8')))
  } catch (err) {
    res.status(500).json({ error: `explainer pack unavailable: ${err.message}` })
  }
})

let explainerRefreshInFlight = false
app.post('/api/explainer/refresh', async (req, res) => {
  const user = await requireAdmin(req, res)
  if (!user) return
  if (explainerRefreshInFlight) return res.status(409).json({ error: 'A docs refresh is already running' })
  explainerRefreshInFlight = true
  const { execFile } = require('child_process')
  execFile(
    process.execPath,
    ['tools/explainer/compile.mjs', '--live', '--out', LIVE_PACK_REL],
    { cwd: path.join(__dirname, '..'), timeout: 60_000 },
    (err, stdout, stderr) => {
      explainerRefreshInFlight = false
      if (err) {
        logger.error('[Explainer] refresh failed:', stderr || err.message)
        // A drift-gate failure here is signal, not noise: the checkout's code
        // and rulings disagree — surface the compiler's own message.
        return res.status(500).json({ error: 'Compile failed', details: (stderr || stdout || err.message).slice(-2000) })
      }
      try {
        const pack = JSON.parse(fs.readFileSync(path.join(__dirname, '..', LIVE_PACK_REL), 'utf8'))
        logger.info(`[Explainer] pack refreshed by ${user.email} → ${pack.version}`)
        res.json({ ok: true, version: pack.version, generatedAt: pack.snapshot?.live?.generatedAt })
      } catch (readErr) {
        res.status(500).json({ error: `Compile succeeded but pack unreadable: ${readErr.message}` })
      }
    }
  )
})

// Languages endpoint - ISO 639 language codes from CSV
// Query params:
//   ?tts=true - Only languages with TTS configured (Azure, ElevenLabs, or Google)
//   ?format=legacy - Return legacy 3-letter codes (spa, fra) instead of ISO standard (es, fr)
app.get('/api/languages', async (req, res) => {
  try {
    const ttsOnly = req.query.tts === 'true'
    const useLegacy = req.query.format === 'legacy'

    // Get all languages from the CSV via language-code-service
    const allLanguages = languageCodeService.getAllLanguages({ ttsOnly, withLegacy: true })

    // Format response based on requested format
    const languages = allLanguages.map(lang => ({
      code: useLegacy && lang.legacyCode ? lang.legacyCode : lang.code,
      name: lang.name,
      native: lang.native || '',
      tts: {
        azure: lang.hasAzure,
        elevenlabs: lang.hasElevenLabs,
        google: lang.hasGoogle
      }
    }))

    logger.info(`[Languages] Returning ${languages.length} languages (ttsOnly=${ttsOnly}, format=${useLegacy ? 'legacy' : 'standard'})`)
    res.json(languages)
  } catch (error) {
    logger.error('Error serving languages:', error)
    res.status(500).json({ error: 'Failed to load languages' })
  }
})

// Courses list endpoint - query Supabase directly
app.get('/api/courses', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Get courses from database
    const { data: dbCourses, error } = await supabase
      .from('courses')
      .select('course_code, known_lang, target_lang, display_name, status')
      .order('course_code')

    if (error) throw error

    // Get content stats for each course
    const contentStats = await supabaseClient.getAllCourseContentStats()

    const courses = (dbCourses || []).map(c => {
      const stats = contentStats[c.course_code] || { seeds: 0, legos: 0, baskets: 0 }
      return {
        code: c.course_code,
        course_code: c.course_code,
        known_lang: c.known_lang,
        target_lang: c.target_lang,
        display_name: c.display_name,
        status: c.status || 'draft',
        seeds: stats.seeds,
        legos: stats.legos,
        phrases: stats.phrases || stats.baskets
      }
    })

    res.json(courses)
  } catch (error) {
    logger.error('Error fetching courses:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create new course - DATABASE-FIRST (APML v14)
app.post('/api/courses/create', async (req, res) => {
  const { courseCode, displayName, knownLanguage, sourceLanguage, targetLanguage, seedStart, seedEnd } = req.body

  // Accept both knownLanguage (new) and sourceLanguage (legacy)
  const known = knownLanguage || sourceLanguage

  logger.info(`Creating course: ${courseCode}`)

  if (!courseCode || !known || !targetLanguage) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'knownLanguage', 'targetLanguage']
    })
  }

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Supabase is not configured. Course creation requires database.'
      })
    }

    const supabase = supabaseClient.getClient()

    // Check if course already exists
    const { data: existing } = await supabase
      .from('courses')
      .select('course_code')
      .eq('course_code', courseCode)
      .single()

    if (existing) {
      return res.status(409).json({
        error: 'Course already exists',
        courseCode
      })
    }

    // Insert into Supabase courses table
    const { error: dbError } = await supabase
      .from('courses')
      .insert({
        course_code: courseCode,
        known_lang: known,
        target_lang: targetLanguage,
        display_name: displayName || `${languageCodeService.getName(targetLanguage) || targetLanguage} for ${languageCodeService.getName(known) || known} Speakers`,
        status: 'draft'
      })

    if (dbError) {
      logger.error(`Failed to insert course into database:`, dbError)
      return res.status(500).json({
        error: 'Failed to create course in database',
        message: dbError.message
      })
    }

    logger.info(`Course created in Supabase: ${courseCode}`)

    res.json({
      success: true,
      courseCode,
      displayName: displayName || `${targetLanguage} for ${sourceLanguage} speakers`,
      sourceLanguage,
      targetLanguage,
      seedRange: { start: seedStart || 1, end: seedEnd || 668 },
      message: 'Course created. Use Course Builder to add content.'
    })

  } catch (error) {
    logger.error(`Failed to create course ${courseCode}:`, error)
    res.status(500).json({
      error: 'Failed to create course',
      message: error.message
    })
  }
})

// =============================================================================
// VOICE CONFIGURATION ROUTES (consolidated from orchestrator)
// =============================================================================

// GET /api/courses/:courseCode/voice-config - Load voice configuration
app.get('/api/courses/:courseCode/voice-config', async (req, res) => {
  const { courseCode } = req.params
  try {
    const config = await voiceConfigService.loadVoiceConfig(courseCode)
    res.json({ success: true, config })
  } catch (error) {
    logger.error(`[VoiceConfig] Error loading config for ${courseCode}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/courses/:courseCode/voice-config - Save voice configuration
app.put('/api/courses/:courseCode/voice-config', async (req, res) => {
  const { courseCode } = req.params
  const config = req.body
  try {
    const validation = voiceConfigService.validateVoiceConfig({
      ...config,
      courseCode
    })
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors })
    }
    const savedConfig = await voiceConfigService.saveVoiceConfig(courseCode, config)
    res.json({ success: true, config: savedConfig })
  } catch (error) {
    logger.error(`[VoiceConfig] Error saving config for ${courseCode}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PATCH /api/courses/:courseCode/voice-config/:role - Update single voice role
app.patch('/api/courses/:courseCode/voice-config/:role', async (req, res) => {
  const { courseCode, role } = req.params
  const voiceSettings = req.body
  try {
    const validRoles = ['target1', 'target2', 'known', 'presentation']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Invalid role: ${role}` })
    }
    const updatedConfig = await voiceConfigService.updateVoiceRole(courseCode, role, voiceSettings)
    res.json({ success: true, config: updatedConfig })
  } catch (error) {
    logger.error(`[VoiceConfig] Error updating ${role} for ${courseCode}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// =============================================================================
// VOICE DISCOVERY & PREVIEW ROUTES (for VoiceConfiguration component)
// =============================================================================

// GET /api/voices/discover/:language?provider=azure|xai - Discover voices for a language
// Defaults to azure if no provider specified (backwards-compatible).
// ElevenLabs voices are entered manually in the UI (no discovery endpoint).
app.get('/api/voices/discover/:language', async (req, res) => {
  const { language } = req.params
  const provider = (req.query.provider || 'azure').toLowerCase()
  try {
    logger.info(`[VoiceDiscovery] Discovering ${provider} voices for language: ${language}`)

    let voices
    if (provider === 'azure') {
      voices = await voiceDiscoveryService.discoverAzureVoices(language)
    } else if (provider === 'xai') {
      voices = await voiceDiscoveryService.discoverXaiVoices(language)
    } else {
      return res.status(400).json({ success: false, error: `Unknown provider: ${provider}` })
    }

    logger.info(`[VoiceDiscovery] Found ${voices.length} ${provider} voices for ${language}`)
    res.json({ success: true, provider, voices })
  } catch (error) {
    logger.error(`[VoiceDiscovery] Error discovering ${provider} voices for ${language}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/courses/:courseCode/seed-phrases-preview - Get sample phrases from seeds for voice testing
app.get('/api/courses/:courseCode/seed-phrases-preview', async (req, res) => {
  const { courseCode } = req.params
  try {
    const supabase = supabaseClient.getClient()
    // Pick ~10 seeds spread across the course for variety
    const { data: seeds } = await supabase
      .from('course_seeds')
      .select('known_text, target_text')
      .eq('course_code', courseCode)
      .not('known_text', 'is', null)
      .not('target_text', 'is', null)
      .order('seed_number')

    if (!seeds || seeds.length === 0) {
      return res.json({ known: [], target: [] })
    }

    // Sample ~10 evenly spaced seeds
    const step = Math.max(1, Math.floor(seeds.length / 10))
    const sampled = seeds.filter((_, i) => i % step === 0).slice(0, 10)

    res.json({
      known: sampled.map(s => s.known_text),
      target: sampled.map(s => s.target_text)
    })
  } catch (error) {
    logger.error(`[SeedPhrases] Error loading preview phrases for ${courseCode}:`, error)
    res.status(500).json({ known: [], target: [] })
  }
})

// POST /api/voices/preview - Generate a voice preview audio sample
// Body: { voiceId, text, speed?, provider?, language? }
// provider: 'azure' (default) | 'elevenlabs' | 'xai'
// language: BCP-47 code for xAI (e.g. 'es', 'pt-BR'). Derived from voiceId for Azure.
app.post('/api/voices/preview', async (req, res) => {
  if (!await requireDashboardUser(req, res)) return
  const { voiceId, text, speed, provider = 'azure', language } = req.body

  if (!voiceId) return res.status(400).json({ success: false, error: 'voiceId is required' })
  if (!text) return res.status(400).json({ success: false, error: 'text is required' })
  if (text.length > 1000) return res.status(400).json({ success: false, error: 'Text too long (max 1000 characters for preview)' })

  try {
    logger.info(`[VoicePreview] provider=${provider} voice=${voiceId} textLen=${text.length}`)

    let audioBuffer

    if (provider === 'azure') {
      const azureKey = process.env.AZURE_SPEECH_KEY
      const azureRegion = process.env.AZURE_SPEECH_REGION || 'westeurope'
      if (!azureKey) {
        return res.status(500).json({ success: false, error: 'Azure Speech not configured (AZURE_SPEECH_KEY not set)' })
      }
      const result = await ttsService.generateWithRetry(text, 'azure', {
        subscriptionKey: azureKey,
        region: azureRegion,
        voiceName: voiceId,
        speed: speed || 1.0,
      })
      audioBuffer = result.audioBuffer
    } else if (provider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'ElevenLabs not configured (ELEVENLABS_API_KEY not set)' })
      }
      const result = await ttsService.generateWithRetry(text, 'elevenlabs', {
        apiKey, voiceId, speed: speed || 1.0
      })
      audioBuffer = result.audioBuffer
    } else if (provider === 'xai') {
      const apiKey = process.env.XAI_API_KEY
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'xAI not configured (XAI_API_KEY not set)' })
      }
      const result = await ttsService.generateWithRetry(text, 'xai', {
        apiKey,
        voiceId,
        language: language || 'auto',
      })
      audioBuffer = result.audioBuffer
    } else {
      return res.status(400).json({ success: false, error: `Unknown provider: ${provider}` })
    }

    // Convert audio to base64 data URI for frontend playback
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const dataUri = `data:audio/mpeg;base64,${base64Audio}`

    logger.info(`[VoicePreview] Generated ${audioBuffer.length} bytes of audio`)
    res.json({ success: true, audio: dataUri, byteLength: audioBuffer.length })
  } catch (error) {
    logger.error('[VoicePreview] Error generating preview:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Helper: Escape special XML characters for SSML
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// =============================================================================
// MISSION CONTROL - Active Jobs from build_jobs table
// =============================================================================

/**
 * GET /api/mission-control/jobs
 * Returns active build jobs from the build_jobs database table
 * AND active audio generation jobs from Phase 8
 */
app.get('/api/mission-control/jobs', async (req, res) => {
  const jobs = []

  try {
    if (!supabaseClient.isInitialized()) {
      return res.json({ jobs: [], services: {}, timestamp: new Date().toISOString() })
    }

    const supabase = supabaseClient.getClient()

    // Query build_jobs for active jobs
    const { data: buildJobs, error } = await supabase
      .from('build_jobs')
      .select('*')
      .in('status', ['pending', 'running', 'stalled'])
      .order('started_at', { ascending: false })

    if (error) {
      logger.warn('[Mission Control] Could not fetch build_jobs:', error.message)
    } else if (buildJobs && buildJobs.length > 0) {
      // Fetch orchestrator messages for all active build jobs in parallel
      const messagePromises = buildJobs.map(row =>
        supabase
          .from('orchestrator_messages')
          .select('id, direction, message, status, created_at')
          .eq('course_code', row.course_code)
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data: msgs, error: msgErr }) => {
            if (msgErr) logger.warn(`[Mission Control] Could not fetch orchestrator_messages for ${row.course_code}:`, msgErr.message)
            return { courseCode: row.course_code, messages: (msgs || []).reverse() }
          })
          .catch(err => {
            logger.warn(`[Mission Control] orchestrator_messages query failed for ${row.course_code}:`, err.message)
            return { courseCode: row.course_code, messages: [] }
          })
      )
      const allMessages = await Promise.all(messagePromises)
      const messagesByCourse = Object.fromEntries(allMessages.map(m => [m.courseCode, m.messages]))

      for (const row of buildJobs) {
        const totalSeeds = row.total_seeds || 300
        const seedsDecomposed = row.seeds_completed || 0  // Pass 2: seeds with LEGOs

        // Query Pass 1 progress: count seeds with target_text (translated)
        let seedsTranslated = 0
        try {
          const { count, error: countError } = await supabase
            .from('course_seeds')
            .select('*', { count: 'exact', head: true })
            .eq('course_code', row.course_code)
            .not('target_text', 'is', null)
            .neq('target_text', '')
            .not('known_text', 'is', null)
            .neq('known_text', '')

          if (!countError && count !== null) {
            seedsTranslated = count
          }
        } catch (err) {
          logger.warn(`[Mission Control] Could not count translated seeds for ${row.course_code}:`, err.message)
        }

        // Determine current pass and appropriate progress to show
        const currentPass = row.pass || (seedsTranslated < totalSeeds ? 1 : 2)
        const currentProgress = currentPass === 1 ? seedsTranslated : seedsDecomposed
        const percentage = Math.round((currentProgress / totalSeeds) * 100)

        jobs.push({
          id: `${row.course_code}-build`,
          courseCode: row.course_code,
          service: 'course-builder',
          type: 'build',
          status: row.status,
          startedAt: row.started_at,
          canStop: row.status === 'running',
          machine: row.machine_name || null,
          progress: {
            current: currentProgress,
            total: totalSeeds,
            percentage,
            // Include both pass metrics for detailed display
            seedsTranslated,      // Pass 1: seeds with target_text
            seedsDecomposed,      // Pass 2: seeds with LEGOs
            currentPass
          },
          metadata: {
            pass: currentPass,
            currentSeed: row.current_seed,
            requestedBy: row.requested_by,
            lastHeartbeat: row.last_heartbeat,
            errorMessage: row.error_message
          },
          activityLog: row.metadata?.activity_log || [],
          lastProgressAt: row.last_progress_at,
          chatMessages: messagesByCourse[row.course_code] || []
        })
      }
    }

    // Also check for active audio generation jobs from Phase 8
    try {
      const audioStatusResponse = await proxyToPhase8('GET', '/status')
      if (audioStatusResponse.status === 200 && audioStatusResponse.data?.active) {
        const audio = audioStatusResponse.data
        const current = audio.current || 0
        const total = audio.total || 1
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0

        jobs.push({
          id: `${audio.courseCode || 'unknown'}-audio`,
          courseCode: audio.courseCode || 'unknown',
          service: 'phase8-audio',
          type: 'audio',
          status: 'running',
          startedAt: audio.startedAt || null,
          canStop: true,
          progress: {
            current,
            total,
            percentage,
            success: audio.success || 0,
            failed: audio.failed || 0
          },
          metadata: {
            operation: audio.operation || 'generate',
            role: audio.role || null,
            lastItem: audio.lastItem || null
          }
        })
      }
    } catch (audioErr) {
      // Phase 8 not running or no active job - that's fine
      logger.debug('[Mission Control] No active audio job (Phase 8 not running or idle)')
    }
  } catch (err) {
    logger.error('[Mission Control] Error fetching jobs:', err.message)
  }

  res.json({
    jobs,
    services: {},
    timestamp: new Date().toISOString()
  })
})

/**
 * POST /api/mission-control/jobs/:jobId/stop
 * Stop a job - proxies to course-builder for build jobs, Phase 8 for audio jobs
 */
app.post('/api/mission-control/jobs/:jobId/stop', async (req, res) => {
  const { jobId } = req.params

  // Parse job ID: {courseCode}-{type}
  const match = jobId.match(/^(.+)-(build|audio)$/)
  if (!match) {
    return res.status(400).json({ success: false, error: 'Invalid job ID format' })
  }

  const [, courseCode, jobType] = match

  if (jobType === 'build') {
    // Proxy to course-builder
    try {
      const response = await fetch(`${COURSE_BUILDER_URL}/api/build/stop/${courseCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      return res.json({ success: data.ok, ...data })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  if (jobType === 'audio') {
    // Proxy to Phase 8 audio generator cancel endpoint
    try {
      const response = await proxyToPhase8('POST', '/cancel')
      return res.json({ success: response.data?.success || true, ...response.data })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  res.status(400).json({ success: false, error: `Unknown job type: ${jobType}` })
})

/**
 * POST /api/mission-control/jobs/:jobId/resume
 * Resume a stalled job - spawns a new agent to continue the build
 */
app.post('/api/mission-control/jobs/:jobId/resume', async (req, res) => {
  const { jobId } = req.params
  const { terminal = 'iTerm2' } = req.body || {}

  // Parse job ID: {courseCode}-{type}
  const match = jobId.match(/^(.+)-(build|audio)$/)
  if (!match) {
    return res.status(400).json({ success: false, error: 'Invalid job ID format' })
  }

  const [, courseCode, jobType] = match

  if (jobType === 'build') {
    // Proxy to course-builder's start endpoint (handles existing stalled jobs)
    try {
      const response = await fetch(`${COURSE_BUILDER_URL}/api/build/start/${courseCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminal, targetSeeds: 260 })
      })
      const data = await response.json()
      return res.json({ success: data.ok, ...data })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  res.status(400).json({ success: false, error: `Resume not supported for job type: ${jobType}` })
})

/**
 * POST /api/mission-control/jobs/:jobId/clear
 * Clear/dismiss a stalled job from the active jobs list
 */
app.post('/api/mission-control/jobs/:jobId/clear', async (req, res) => {
  const { jobId } = req.params

  // Parse job ID: {courseCode}-{type}
  const match = jobId.match(/^(.+)-(build|audio)$/)
  if (!match) {
    return res.status(400).json({ success: false, error: 'Invalid job ID format' })
  }

  const [, courseCode, jobType] = match

  if (jobType === 'build') {
    // Mark the stalled job as 'cleared' in the database
    const supabase = supabaseClient.getClient()
    try {
      const { data: job, error: findError } = await supabase
        .from('build_jobs')
        .select('id, status')
        .eq('course_code', courseCode)
        .eq('status', 'stalled')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      if (findError || !job) {
        return res.status(404).json({ success: false, error: 'No stalled job found for this course' })
      }

      const { error: updateError } = await supabase
        .from('build_jobs')
        .update({
          status: 'stopped',
          stop_requested: true
        })
        .eq('id', job.id)

      if (updateError) {
        return res.status(500).json({ success: false, error: updateError.message })
      }

      logger.info(`[Mission Control] Cleared stalled job ${job.id} for ${courseCode}`)
      return res.json({ success: true, jobId: job.id, message: 'Job cleared' })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  res.status(400).json({ success: false, error: `Clear not supported for job type: ${jobType}` })
})

// PM2 service management routes - keep proxying to orchestrator for now
// These are admin-only and rarely used; can be migrated later
app.get('/api/services', proxyOrchestrator)
app.post('/api/services/:name/restart', proxyOrchestrator)
app.get('/api/services/:name/logs', proxyOrchestrator)
app.post('/api/deploy', proxyOrchestrator)
// Repair fallback — only offered after a deploy has failed on the target machine
app.post('/api/deploy/repair', proxyOrchestrator)
app.get('/api/deploy/history', proxyOrchestrator)

// Get content stats for all courses (seeds, legos, baskets counts)
// Used by dashboard course listings to show real counts
// Database-only: no local JSON fallback (remote users can't access local files)
app.get('/api/production/course-stats', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const stats = await supabaseClient.getAllCourseContentStats()
    logger.info(`Returning content stats for ${Object.keys(stats).length} courses from database`)

    res.json({
      success: true,
      stats
    })
  } catch (err) {
    logger.error('Failed to get course content stats:', err)
    res.status(500).json({ error: err.message })
  }
})

// Get content stats for a single course
// Used by Course Editor to show accurate counts matching Production Suite list
app.get('/api/production/:courseCode/stats', async (req, res) => {
  const { courseCode } = req.params
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const stats = await supabaseClient.getCourseContentStats(courseCode)
    logger.info(`Returning content stats for ${courseCode}: ${JSON.stringify(stats)}`)

    res.json({
      success: true,
      courseCode,
      stats
    })
  } catch (err) {
    logger.error(`Failed to get stats for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Get course info including status
// Used by Production Suite to display course status and allow status changes
app.get('/api/production/:courseCode/info', async (req, res) => {
  const { courseCode } = req.params
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Fetch course and stats in parallel
    const [course, stats] = await Promise.all([
      supabaseClient.getCourse(courseCode),
      supabaseClient.getCourseContentStats(courseCode)
    ])

    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` })
    }

    logger.info(`Returning info for ${courseCode}: status=${course.status}, completedSeeds=${stats.completedSeeds}`)

    // Extract learnings from quality_rules for easy frontend access
    const learnings = course.quality_rules?.learnings || []

    res.json({
      success: true,
      course: {
        code: course.course_code,
        displayName: course.display_name,
        knownLang: course.known_lang,
        targetLang: course.target_lang,
        status: course.status,
        courseType: course.course_type,
        creatorEmail: course.creator_email,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
        seed_count: course.seed_count,  // Release target for decomposition
        // Include stats so frontend doesn't need separate Supabase queries
        stats: {
          seeds: stats.seeds,
          completedSeeds: stats.completedSeeds,
          legos: stats.legos,
          phrases: stats.phrases,
          audio: stats.audio
        },
        // Language-pair learnings from QA and course building
        learnings: learnings,
        learningsCount: learnings.length,
        // Pricing tier
        pricingTier: course.pricing_tier || 'premium',
        isCommunity: course.is_community || false
      }
    })
  } catch (err) {
    logger.error(`Failed to get info for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Update course status
// Used by Production Suite to mark courses as draft, beta, or released
// UI sends: testing, beta, live → mapped to DB: draft, beta, released
app.post('/api/production/:courseCode/status', async (req, res) => {
  const { courseCode } = req.params
  const { status: uiStatus } = req.body

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    if (!uiStatus) {
      return res.status(400).json({ error: 'Status is required' })
    }

    // Map UI status to database status
    // UI uses: testing, beta, live (user-friendly)
    // DB uses: draft, beta, released (canonical)
    const statusMap = {
      'testing': 'draft',
      'beta': 'beta',
      'live': 'released',
      // Also accept DB values directly for backwards compatibility
      'draft': 'draft',
      'released': 'released'
    }

    const dbStatus = statusMap[uiStatus]
    if (!dbStatus) {
      return res.status(400).json({
        error: `Invalid status: ${uiStatus}. Must be one of: testing, beta, live`
      })
    }

    // Map to new_app_status for learning app
    // Constraint: ('not_available', 'draft', 'beta', 'live')
    const appStatusMap = {
      'draft': 'draft',
      'beta': 'beta',
      'released': 'live'
    }
    const newAppStatus = appStatusMap[dbStatus]

    // ── THE APPROVAL GATE ───────────────────────────────────────────────────
    // "No course should EVER go out to learners unless it has passed a manual
    // approval gate." (Tom, 2026-08-05.) new_app_status IN ('live','beta') is
    // what actually makes a course learner-visible — that is the predicate
    // ssi-learning-app/api/courses/available.ts selects on — so that is where
    // this bites.
    //
    // It bites on PROMOTION only. Demotion is always allowed (you must always
    // be able to pull a course back), and re-saving a course at the status it
    // already holds is a no-op: 78 courses were already learner-visible when
    // this gate was built and Tom's ruling explicitly accepts that they
    // cannot be pulled back in. Blocking an unrelated re-save of one of them
    // would be the gate punishing the wrong thing.
    let gateDecision = null
    try {
      const { data: currentRow } = await supabaseClient.getClient()
        .from('courses').select('new_app_status').eq('course_code', courseCode).maybeSingle()
      gateDecision = await qaGate().checkPublishAllowed({
        courseCode,
        targetAppStatus: newAppStatus,
        currentAppStatus: currentRow?.new_app_status || 'not_available',
      })
    } catch (gateErr) {
      // A gate that cannot be read must not silently wave a course through.
      logger.error(`[qa-gate] publish check failed for ${courseCode}:`, gateErr)
      return res.status(503).json({
        error: 'QA approval gate could not be evaluated, so publication is refused',
        code: 'gate_unavailable',
        detail: gateErr.message,
      })
    }

    if (!gateDecision.allowed) {
      logger.warn(`[qa-gate] BLOCKED promotion of ${courseCode} to ${newAppStatus}: ${gateDecision.reason}`)
      return res.status(409).json({
        error: gateDecision.message,
        code: 'qa_gate_unpassed',
        gate: gateDecision.gate,
      })
    }
    if (gateDecision.reason === 'overridden') {
      logger.warn(`[qa-gate] ${courseCode} promoted to ${newAppStatus} under an OVERRIDE by ` +
        `${gateDecision.gate?.override_by}: ${gateDecision.gate?.override_reason}`)
    }

    const updatedCourse = await supabaseClient.updateCourseStatus(courseCode, dbStatus, newAppStatus)
    logger.info(`Updated ${courseCode} status to ${dbStatus} (new_app_status: ${newAppStatus})`)

    // Emit WebSocket event for real-time UI updates
    io.emit('course:statusChanged', {
      courseCode,
      status: dbStatus,
      updatedAt: updatedCourse.updated_at
    })

    res.json({
      success: true,
      course: {
        code: updatedCourse.course_code,
        status: updatedCourse.status,
        updatedAt: updatedCourse.updated_at
      }
    })
  } catch (err) {
    logger.error(`Failed to update status for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Update course pricing tier
// Used by Production Overview to mark courses as free, premium, or community
app.post('/api/production/:courseCode/pricing-tier', async (req, res) => {
  const { courseCode } = req.params
  const { pricingTier } = req.body

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const validTiers = ['free', 'premium', 'community']
    if (!pricingTier || !validTiers.includes(pricingTier)) {
      return res.status(400).json({
        error: `Invalid pricing tier: ${pricingTier}. Must be one of: ${validTiers.join(', ')}`
      })
    }

    const { data, error: dbError } = await supabaseClient.getClient()
      .from('courses')
      .update({
        pricing_tier: pricingTier,
        is_community: pricingTier === 'community'
      })
      .eq('course_code', courseCode)
      .select('course_code, pricing_tier, is_community, updated_at')
      .single()

    if (dbError) throw dbError

    logger.info(`Updated ${courseCode} pricing_tier to ${pricingTier}`)

    io.emit('course:pricingTierChanged', {
      courseCode,
      pricingTier: data.pricing_tier,
      isCommunity: data.is_community,
      updatedAt: data.updated_at
    })

    res.json({
      success: true,
      course: {
        code: data.course_code,
        pricingTier: data.pricing_tier,
        isCommunity: data.is_community,
        updatedAt: data.updated_at
      }
    })
  } catch (err) {
    logger.error(`Failed to update pricing tier for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Get introductions for a course
// Used by Course Editor INTRODUCTIONS tab to display lego presentations
app.get('/api/production/:courseCode/introductions', async (req, res) => {
  const { courseCode } = req.params
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const introductions = await supabaseClient.getIntroductionsByCourse(courseCode)
    logger.info(`Returning ${introductions.count} introductions for ${courseCode}`)

    res.json({
      success: true,
      ...introductions
    })
  } catch (err) {
    logger.error(`Failed to get introductions for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Get the presentation (intro) text + audio for a single LEGO.
// Reads the AUTHORITATIVE store (course_audio.text, role='presentation') — the same
// text the audio path generates from — so the Script Viewer edit affordance shows
// exactly what was/will-be spoken (not the orphaned S3 introductions.json).
// GET /api/production/:courseCode/presentation/:legoId
app.get('/api/production/:courseCode/presentation/:legoId', async (req, res) => {
  const { courseCode, legoId } = req.params
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const db = supabaseClient.getClient()
    const { data, error } = await db
      .from('course_audio')
      .select('id, text, s3_key, duration_ms')
      .eq('course_code', courseCode)
      .eq('role', 'presentation')
      .eq('lego_id', legoId)
      .maybeSingle()
    if (error) throw error

    // No row yet — most LEGOs on a course that has never had its intros authored.
    // Hand back the line this LEGO WOULD get, rendered off its OWN course's
    // template, flagged is_suggested so the editor can say it isn't stored yet.
    // Anything less leaves the edit box blank, and a blank box was read as
    // content once already (Deborah, 2026-08-12: the placeholder's Chinese
    // example looked like eus_for_eng's stored narration).
    let suggested = null
    if (!data) {
      try {
        const { data: course } = await db
          .from('courses')
          .select('known_lang, target_lang')
          .eq('course_code', courseCode)
          .maybeSingle()
        const seedNumber = parseInt(legoId.slice(1, 5), 10)
        const legoIndex = parseInt(legoId.slice(6, 8), 10)
        const { data: lego } = await db
          .from('course_legos')
          .select('known_text')
          .eq('course_code', courseCode)
          .eq('seed_number', seedNumber)
          .eq('lego_index', legoIndex)
          .maybeSingle()
        if (course && lego?.known_text) {
          suggested = await presentationAuthor.defaultIntroText(db, {
            knownLang: course.known_lang,
            targetLang: course.target_lang,
            knownText: lego.known_text
          })
        }
      } catch (draftErr) {
        // A missing template is not a reason to fail the read — fall back to blank.
        logger.warn(`No suggested narration for ${courseCode}/${legoId}: ${draftErr.message}`)
      }
    }

    const isPending = !data?.s3_key || data.s3_key.startsWith('pending/')
    res.json({
      success: true,
      lego_id: legoId,
      exists: !!data,
      text: data?.text || suggested,
      is_suggested: !data && !!suggested,
      audio_id: data?.id || null,
      duration_ms: data?.duration_ms || null,
      hasAudio: !!data && !isPending
    })
  } catch (err) {
    logger.error(`Failed to get presentation for ${courseCode}/${legoId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Get course manifest
// Priority: 1) Database (if course structure exists), 2) S3 static file, 3) Stub
app.get('/api/production/:courseCode/manifest', async (req, res) => {
  try {
    const { courseCode } = req.params
    const source = req.query.source // 'db', 's3', or auto (default)

    // Option 1: Try database-first generation (new architecture) with caching
    if (source !== 's3' && supabaseClient.isInitialized()) {
      try {
        const manifest = await getCachedManifest(courseCode)
        if (manifest && manifest.slices?.[0]?.seeds?.length > 0) {
          return res.json({
            ...manifest,
            _source: 'database'
          })
        }
      } catch (dbError) {
        // Course not in database yet, fall through to S3
        logger.debug(`Database manifest generation failed for ${courseCode}: ${dbError.message}`)
      }
    }

    // Option 2: Try S3 static manifest (legacy)
    if (source !== 'db') {
      const manifest = await s3Service.getCourseManifest(courseCode)
      if (manifest) {
        logger.info(`Manifest for ${courseCode} loaded from S3`)
        return res.json({
          ...manifest,
          _source: 's3'
        })
      }
    }

    // Option 3: Return stub if course exists but manifest not ready
    const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json')
    if (await fs.pathExists(basketsPath)) {
      const baskets = await fs.readJson(basketsPath)
      const basketCount = Object.keys(baskets.baskets || baskets || {}).length
      return res.json({
        _stub: true,
        _source: 'stub',
        _message: 'Manifest not yet compiled. Import course to database or run audio generation.',
        courseCode,
        status: 'pre-audio',
        basketCount,
        seeds: [],
        audio: {},
        version: 'stub'
      })
    }

    return res.status(404).json({ error: 'Course not found' })
  } catch (error) {
    logger.error('Error fetching manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// Generate manifest from database (explicit trigger - bypasses and refreshes cache)
app.post('/api/production/:courseCode/manifest/generate', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Invalidate cache to force fresh generation
    invalidateManifestCache(courseCode)

    logger.info(`Generating fresh manifest for ${courseCode} from database...`)
    const startTime = Date.now()
    const manifest = await manifestGenerator.generateManifest(courseCode)
    const elapsed = Date.now() - startTime

    // Cache the fresh manifest
    manifestCache.set(courseCode, { manifest, timestamp: Date.now() })
    logger.info(`Manifest generated in ${elapsed}ms, cached for future requests`)

    // Validate it
    const validation = await manifestGenerator.validateManifest(manifest)

    res.json({
      success: true,
      manifest,
      validation,
      generationTimeMs: elapsed,
      stats: {
        seeds: manifest.slices?.[0]?.seeds?.length || 0,
        samples: Object.keys(manifest.slices?.[0]?.samples || {}).length
      }
    })
  } catch (error) {
    logger.error('Error generating manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// Validate manifest audio coverage
app.get('/api/production/:courseCode/manifest/validate', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const manifest = await getCachedManifest(courseCode)
    const validation = await manifestGenerator.validateManifest(manifest)

    res.json(validation)
  } catch (error) {
    logger.error('Error validating manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// LEGACY MANIFEST EXPORT WITH COMBINED AUDIO
// =============================================================================

// Track active legacy audio jobs
const legacyAudioJobs = new Map()

// Export legacy manifest (for old learning app)
// Query params:
//   withAudio=true  - Start background job to generate combined presentation audio
app.get('/api/production/:courseCode/export-legacy', async (req, res) => {
  try {
    const { courseCode } = req.params
    const withAudio = req.query.withAudio === 'true'

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Import the legacy manifest generator
    const { generateLegacyManifest, validateManifest } = require('./phases/generate-legacy-manifest.cjs')

    logger.info(`Generating legacy manifest for ${courseCode}${withAudio ? ' (with audio)' : ''}`)

    // Generate manifest (always without audio for immediate response)
    // The manifest already has placeholder presentation UUIDs
    const manifest = await generateLegacyManifest(courseCode, { withAudio: false })

    // Validate the manifest for critical issues
    const validation = validateManifest(manifest)
    if (!validation.valid) {
      logger.warn(`Legacy manifest validation issues for ${courseCode}: ${validation.summary}`)
    }

    // Generate filename with date
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `${manifest.id}_legacy_${date}.json`

    // Count intro items for audio generation
    let introCount = 0
    for (const seed of manifest.slices[0].seeds) {
      introCount += (seed.introduction_items || []).length
    }

    // Start background audio generation if requested
    let audioJobId = null
    if (withAudio && introCount > 0) {
      audioJobId = `legacy-audio-${courseCode}-${Date.now()}`
      startLegacyAudioGeneration(courseCode, audioJobId, manifest)
    }

    res.json({
      success: true,
      manifest,
      filename,
      stats: {
        seeds: manifest.slices[0].seeds.length,
        orderedEncouragements: manifest.slices[0].orderedEncouragements.length,
        pooledEncouragements: manifest.slices[0].pooledEncouragements.length
      },
      validation: {
        valid: validation.valid,
        summary: validation.summary,
        invalidUUIDs: validation.issues.invalidUUIDs.length,
        emptyStrings: validation.issues.emptyStrings.length,
        // Include first few details for display
        invalidUUIDDetails: validation.issues.invalidUUIDs.slice(0, 5),
        emptyStringDetails: validation.issues.emptyStrings.slice(0, 5)
      },
      audioJobId
    })
  } catch (error) {
    logger.error('Error generating legacy manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// Start background audio generation for legacy manifest
async function startLegacyAudioGeneration(courseCode, jobId, manifest) {
  // Import the combined presentations generator
  const { generateCombinedPresentations } = require('./phases/generate-legacy-manifest.cjs')

  // Query database to get lego info with original lego_id
  // We need this because the manifest only has generated UUIDs, not the S0001L01 format
  const client = supabaseClient.getClient()
  if (!client) {
    logger.error(`[LegacyAudio] Supabase not initialized`)
    return
  }

  // Get all new LEGOs with their lego_id
  const { data: dbLegos } = await client
    .from('course_legos')
    .select('lego_id, seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('seed_number')
    .order('lego_index')

  if (!dbLegos || dbLegos.length === 0) {
    logger.info(`[LegacyAudio] No new LEGOs found for ${courseCode}`)
    return
  }

  // Build intro items directly from database LEGOs (not manifest)
  // This ensures we have the correct lego_id format for presentation lookup
  const introItems = dbLegos.map(lego => ({
    legoId: lego.lego_id,  // Original format: S0001L01
    knownText: lego.known_text,
    targetText: lego.target_text,
    // Presentation text isn't needed for lookup since we use lego_id
    presentation: `The ... for — '${lego.known_text}' — is: ... '${lego.target_text}' ... '${lego.target_text}'`
  }))

  logger.info(`[LegacyAudio] Built ${introItems.length} intro items from database LEGOs`)

  // Create job record
  legacyAudioJobs.set(jobId, {
    courseCode,
    status: 'running',
    total: introItems.length,
    completed: 0,
    startedAt: Date.now(),
    cancelled: false
  })

  logger.info(`[LegacyAudio] Starting job ${jobId} for ${courseCode}: ${introItems.length} items`)

  // Emit start event
  io.emit('legacyAudio:started', { jobId, courseCode, total: introItems.length })

  try {
    // Load audio data from database
    const client = supabaseClient.getClient()
    const course = await supabaseClient.getCourse(courseCode)
    const targetLang = course.target_lang
    const knownLang = course.known_lang

    // Load audio records
    const { data: dbAudio } = await client
      .from('course_audio')
      .select('id, text, text_normalized, language, role, duration_ms, lego_id, s3_key')
      .eq('course_code', courseCode)

    // Build lookup maps
    const audioLookup = new Map()
    const presentationByLegoId = new Map()

    if (dbAudio) {
      for (const record of dbAudio) {
        if (record.role === 'presentation' && record.lego_id) {
          presentationByLegoId.set(record.lego_id, record)
        }
        const key = `${record.text_normalized}|${record.language}|${record.role}`
        audioLookup.set(key, record)
      }
    }

    logger.info(`[LegacyAudio] Audio lookup: ${audioLookup.size} by text, ${presentationByLegoId.size} presentations by lego_id`)

    // Generate combined presentations with progress callback
    const job = legacyAudioJobs.get(jobId)

    await generateCombinedPresentations(
      courseCode,
      introItems,
      audioLookup,
      presentationByLegoId,
      targetLang,
      knownLang,
      {
        dryRun: false,
        concurrency: 4,
        onProgress: (completed, total) => {
          const currentJob = legacyAudioJobs.get(jobId)
          if (currentJob) {
            currentJob.completed = completed
            io.emit('legacyAudio:progress', { jobId, completed, total })
          }
        },
        shouldCancel: () => {
          const currentJob = legacyAudioJobs.get(jobId)
          return currentJob?.cancelled === true
        }
      }
    )

    // Check if cancelled
    const finalJob = legacyAudioJobs.get(jobId)
    if (finalJob?.cancelled) {
      finalJob.status = 'cancelled'
      io.emit('legacyAudio:cancelled', { jobId })
      logger.info(`[LegacyAudio] Job ${jobId} cancelled`)
    } else {
      if (finalJob) finalJob.status = 'completed'
      io.emit('legacyAudio:completed', { jobId })
      logger.info(`[LegacyAudio] Job ${jobId} completed`)
    }
  } catch (err) {
    const job = legacyAudioJobs.get(jobId)
    if (job) job.status = 'failed'
    io.emit('legacyAudio:failed', { jobId, error: err.message })
    logger.error(`[LegacyAudio] Job ${jobId} failed:`, err)
  }

  // Clean up job after some time
  setTimeout(() => {
    legacyAudioJobs.delete(jobId)
  }, 5 * 60 * 1000) // Keep for 5 minutes
}

// Cancel legacy audio generation
app.post('/api/production/:courseCode/cancel-legacy-audio', (req, res) => {
  const { courseCode } = req.params

  // Find and cancel active job for this course
  for (const [jobId, job] of legacyAudioJobs) {
    if (job.courseCode === courseCode && job.status === 'running') {
      job.cancelled = true
      logger.info(`[LegacyAudio] Cancellation requested for job ${jobId}`)
      return res.json({ success: true, jobId })
    }
  }

  res.status(404).json({ error: 'No active audio job found for this course' })
})

// Get legacy audio job status
app.get('/api/production/:courseCode/legacy-audio-status', (req, res) => {
  const { courseCode } = req.params

  for (const [jobId, job] of legacyAudioJobs) {
    if (job.courseCode === courseCode) {
      return res.json({
        jobId,
        status: job.status,
        total: job.total,
        completed: job.completed,
        startedAt: job.startedAt
      })
    }
  }

  res.json({ status: 'none' })
})

// Get sample flags
app.get('/api/production/:courseCode/flags', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Get flags from Supabase
    const flagsArray = await supabaseClient.getCourseFlags(courseCode)

    // Transform Supabase format to legacy S3 format for backward compatibility
    const flags = {
      courseCode,
      samples: {}
    }

    for (const flag of flagsArray) {
      flags.samples[flag.audio_uuid] = {
        status: flag.status,
        notes: flag.notes,
        flaggedBy: flag.flagged_by,
        updatedAt: flag.flagged_at,
        history: flag.history || []
      }
    }

    res.json(flags)
  } catch (error) {
    logger.error('Error fetching flags:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update single sample flag
app.post('/api/production/:courseCode/flags/update', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuid, status, reason, notes, flaggedBy } = req.body

    if (!uuid || !status) {
      return res.status(400).json({ error: 'uuid and status required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Update flag in Supabase (includes automatic history tracking)
    const combinedNotes = reason ? `${reason}${notes ? '\n' + notes : ''}` : notes
    const updated = await supabaseClient.updateSampleFlag(uuid, {
      courseCode,
      status,
      notes: combinedNotes,
      flaggedBy
    })

    // Broadcast update via WebSocket
    io.to(`course:${courseCode}`).emit('sample_updated', {
      courseCode,
      uuid,
      update: {
        status: updated.status,
        notes: updated.notes,
        flaggedBy: updated.flagged_by,
        updatedAt: updated.flagged_at,
        history: updated.history
      }
    })

    res.json({
      success: true,
      sample: {
        status: updated.status,
        notes: updated.notes,
        flaggedBy: updated.flagged_by,
        updatedAt: updated.flagged_at,
        history: updated.history
      }
    })
  } catch (error) {
    logger.error('Error updating flag:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// AUDIO FLAGS (NEW simple workflow)
// =============================================================================

// Get all audio flags for a course
app.get('/api/production/:courseCode/audio-flags', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const flags = await supabaseClient.getAudioFlags(courseCode)
    const stats = await supabaseClient.getAudioFlagStats(courseCode)

    res.json({ flags, stats })
  } catch (error) {
    logger.error('Error getting audio flags:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get flagged items with audio context (fast — doesn't load all seeds)
// Returns items ready for FlaggedItemRow display
app.get('/api/production/:courseCode/flagged-items', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // 1. Get all flagged UUIDs (small table, instant)
    const { data: flags, error: flagsErr } = await supabase
      .from('audio_flags')
      .select('audio_uuid, status, reason, flagged_by, created_at')
      .eq('course_code', courseCode)
      .eq('status', 'flagged')

    if (flagsErr) throw flagsErr
    if (!flags || flags.length === 0) {
      return res.json({ items: [], total: 0 })
    }

    const flagMap = new Map()
    flags.forEach(f => flagMap.set(f.audio_uuid, f))
    const uuids = flags.map(f => f.audio_uuid)

    // 2. Look up those UUIDs in course_audio to get text + role (batch in chunks)
    const audioRows = []
    for (let i = 0; i < uuids.length; i += 200) {
      const chunk = uuids.slice(i, i + 200)
      const { data } = await supabase
        .from('course_audio')
        .select('id, text, role')
        .eq('course_code', courseCode)
        .in('id', chunk)
      if (data) audioRows.push(...data)
    }

    // 3. Look up phrase context directly from course_practice_phrases (NOT practice_cycles view)
    // practice_cycles does 3 expensive LEFT JOINs with regexp_replace — can exhaust DB connections
    const uniqueTargetTexts = [...new Set(audioRows.filter(a => a.role !== 'known').map(a => a.text))]
    const uniqueKnownTexts = [...new Set(audioRows.filter(a => a.role === 'known').map(a => a.text))]

    const phraseRows = []
    // Look up by target_text
    for (let i = 0; i < uniqueTargetTexts.length; i += 200) {
      const chunk = uniqueTargetTexts.slice(i, i + 200)
      const { data } = await supabase
        .from('course_practice_phrases')
        .select('id, seed_number, lego_index, known_text, target_text')
        .eq('course_code', courseCode)
        .in('target_text', chunk)
      if (data) phraseRows.push(...data)
    }
    // Look up by known_text
    for (let i = 0; i < uniqueKnownTexts.length; i += 200) {
      const chunk = uniqueKnownTexts.slice(i, i + 200)
      const { data } = await supabase
        .from('course_practice_phrases')
        .select('id, seed_number, lego_index, known_text, target_text')
        .eq('course_code', courseCode)
        .in('known_text', chunk)
      if (data) phraseRows.push(...data)
    }

    // Build text → phrase context map
    // For each audio row, find which phrase it belongs to by matching text
    const uuidContext = new Map()
    for (const audio of audioRows) {
      if (uuidContext.has(audio.id)) continue
      const phrase = phraseRows.find(p =>
        audio.role === 'known' ? p.known_text === audio.text : p.target_text === audio.text
      )
      if (phrase) {
        const seedId = 'S' + String(phrase.seed_number).padStart(4, '0')
        const legoId = seedId + 'L' + String(phrase.lego_index).padStart(2, '0')
        uuidContext.set(audio.id, {
          seedId,
          legoId,
          phraseId: phrase.id,
          track: audio.role,
          text: audio.text
        })
      }
    }

    // 4. Build response items
    const items = []
    const seen = new Set()
    for (const [uuid, flag] of flagMap) {
      if (seen.has(uuid)) continue
      seen.add(uuid)

      const ctx = uuidContext.get(uuid)
      const audio = audioRows.find(a => a.id === uuid)

      items.push({
        uuid,
        seedId: ctx?.seedId || '?',
        legoId: ctx?.legoId || '?',
        phraseId: ctx?.phraseId || '?',
        track: ctx?.track || audio?.role || '?',
        text: ctx?.text || audio?.text || '?',
        status: flag.status,
        notes: flag.reason,
        flaggedAt: flag.created_at,
        flaggedBy: flag.flagged_by
      })
    }

    logger.info(`[FlaggedItems] ${courseCode}: ${items.length} items returned`)
    res.json({ items, total: items.length })
  } catch (error) {
    logger.error('Error getting flagged items:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create or update an audio flag
app.post('/api/production/:courseCode/audio-flags', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { audio_uuid, status, reason, flagged_by } = req.body

    if (!audio_uuid) {
      return res.status(400).json({ error: 'audio_uuid required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const flag = await supabaseClient.upsertAudioFlag(audio_uuid, courseCode, {
      status: status || 'flagged',
      reason,
      flagged_by: flagged_by || 'qa'
    })

    logger.info(`Audio flagged: ${audio_uuid} in ${courseCode} - ${reason || 'no reason'}`)

    // Broadcast via WebSocket
    io.to(`course:${courseCode}`).emit('audio_flagged', {
      courseCode,
      audio_uuid,
      flag
    })

    res.json({ success: true, flag })
  } catch (error) {
    logger.error('Error creating audio flag:', error)
    res.status(500).json({ error: error.message })
  }
})

// Resolve an audio flag
app.post('/api/production/:courseCode/audio-flags/:audioUuid/resolve', async (req, res) => {
  try {
    const { courseCode, audioUuid } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const flag = await supabaseClient.resolveAudioFlag(audioUuid, courseCode)

    logger.info(`Audio flag resolved: ${audioUuid} in ${courseCode}`)

    io.to(`course:${courseCode}`).emit('audio_flag_resolved', {
      courseCode,
      audio_uuid: audioUuid,
      flag
    })

    res.json({ success: true, flag })
  } catch (error) {
    logger.error('Error resolving audio flag:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete an audio flag
app.delete('/api/production/:courseCode/audio-flags/:audioUuid', async (req, res) => {
  try {
    const { courseCode, audioUuid } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    await supabaseClient.deleteAudioFlag(audioUuid, courseCode)

    logger.info(`Audio flag deleted: ${audioUuid} in ${courseCode}`)

    io.to(`course:${courseCode}`).emit('audio_flag_deleted', {
      courseCode,
      audio_uuid: audioUuid
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('Error deleting audio flag:', error)
    res.status(500).json({ error: error.message })
  }
})

// Bulk delete audio flags (resolve all at once)
app.post('/api/production/:courseCode/audio-flags/bulk-delete', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { audio_uuids } = req.body

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    if (!audio_uuids || !Array.isArray(audio_uuids) || audio_uuids.length === 0) {
      return res.status(400).json({ error: 'audio_uuids array required' })
    }

    // Delete in batches of 100 to avoid query size limits
    const BATCH = 100
    let deleted = 0
    for (let i = 0; i < audio_uuids.length; i += BATCH) {
      const batch = audio_uuids.slice(i, i + BATCH)
      const { error } = await supabaseClient.getClient()
        .from('audio_flags')
        .delete()
        .eq('course_code', courseCode)
        .in('audio_uuid', batch)
      if (error) throw error
      deleted += batch.length
    }

    logger.info(`Bulk deleted ${deleted} audio flags for ${courseCode}`)
    res.json({ success: true, deleted })
  } catch (error) {
    logger.error('Error bulk deleting audio flags:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete orphaned audio flags (flags whose text no longer matches any phrase)
app.post('/api/production/:courseCode/audio-flags/delete-orphaned', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // 1. Get all flagged UUIDs
    const { data: flags, error: flagsErr } = await supabase
      .from('audio_flags')
      .select('audio_uuid')
      .eq('course_code', courseCode)
      .eq('status', 'flagged')

    if (flagsErr) throw flagsErr
    if (!flags || flags.length === 0) {
      return res.json({ deleted: 0, total: 0, remaining: 0 })
    }

    const uuids = flags.map(f => f.audio_uuid)

    // 2. Get audio text+role for each flagged UUID
    const audioRows = []
    for (let i = 0; i < uuids.length; i += 200) {
      const chunk = uuids.slice(i, i + 200)
      const { data } = await supabase
        .from('course_audio')
        .select('id, text, role')
        .eq('course_code', courseCode)
        .in('id', chunk)
      if (data) audioRows.push(...data)
    }

    // 3. Get all phrase texts for this course
    const { data: phrases, error: phrasesErr } = await supabase
      .from('course_practice_phrases')
      .select('known_text, target_text')
      .eq('course_code', courseCode)

    if (phrasesErr) throw phrasesErr

    const knownTexts = new Set((phrases || []).map(p => p.known_text))
    const targetTexts = new Set((phrases || []).map(p => p.target_text))

    // 4. Find orphaned flags (audio text doesn't match any phrase)
    const orphanedUuids = []
    for (const audio of audioRows) {
      const hasMatch = audio.role === 'known'
        ? knownTexts.has(audio.text)
        : targetTexts.has(audio.text)
      if (!hasMatch) orphanedUuids.push(audio.id)
    }

    // Also include flags whose UUID isn't even in course_audio anymore
    const audioIdSet = new Set(audioRows.map(a => a.id))
    for (const uuid of uuids) {
      if (!audioIdSet.has(uuid) && !orphanedUuids.includes(uuid)) {
        orphanedUuids.push(uuid)
      }
    }

    if (orphanedUuids.length === 0) {
      return res.json({ deleted: 0, total: flags.length, remaining: flags.length })
    }

    // 5. Delete orphaned flags
    const BATCH = 100
    for (let i = 0; i < orphanedUuids.length; i += BATCH) {
      const batch = orphanedUuids.slice(i, i + BATCH)
      const { error } = await supabase
        .from('audio_flags')
        .delete()
        .eq('course_code', courseCode)
        .in('audio_uuid', batch)
      if (error) throw error
    }

    logger.info(`[OrphanFlags] ${courseCode}: deleted ${orphanedUuids.length} orphaned flags out of ${flags.length} total`)
    res.json({ deleted: orphanedUuids.length, total: flags.length, remaining: flags.length - orphanedUuids.length })
  } catch (error) {
    logger.error('Error deleting orphaned flags:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// PHRASE MANAGEMENT
// =============================================================================

// Delete a practice phrase
app.delete('/api/production/:courseCode/phrases/:phraseId', async (req, res) => {
  try {
    const { courseCode, phraseId } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Delete the phrase from course_practice_phrases
    const { error } = await supabase
      .from('course_practice_phrases')
      .delete()
      .eq('course_code', courseCode)
      .eq('id', phraseId)

    if (error) {
      logger.error(`Error deleting phrase ${phraseId}:`, error)
      throw error
    }

    logger.info(`Phrase deleted: ${phraseId} from ${courseCode}`)

    // Broadcast deletion via WebSocket
    io.to(`course:${courseCode}`).emit('phrase_deleted', {
      courseCode,
      phraseId
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('Error deleting phrase:', error)
    res.status(500).json({ error: error.message })
  }
})

// Batch delete practice phrases
app.post('/api/production/:courseCode/phrases/batch-delete', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { phraseIds } = req.body

    if (!phraseIds || !Array.isArray(phraseIds) || phraseIds.length === 0) {
      return res.status(400).json({ error: 'phraseIds array required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Delete all phrases in the batch
    const { error, count } = await supabase
      .from('course_practice_phrases')
      .delete()
      .eq('course_code', courseCode)
      .in('id', phraseIds)

    if (error) {
      logger.error(`Error batch deleting phrases:`, error)
      throw error
    }

    logger.info(`Batch deleted ${phraseIds.length} phrases from ${courseCode}`)

    // Broadcast deletion via WebSocket
    io.to(`course:${courseCode}`).emit('phrases_batch_deleted', {
      courseCode,
      phraseIds,
      count: phraseIds.length
    })

    res.json({ success: true, deleted: phraseIds.length })
  } catch (error) {
    logger.error('Error batch deleting phrases:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// LEGACY FLAGS (old sample_flags table - keep for backwards compat)
// =============================================================================

// Delete a sample flag (item is done, no longer needs regen)
app.post('/api/production/:courseCode/flags/delete', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuid } = req.body

    if (!uuid) {
      return res.status(400).json({ error: 'uuid required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Delete flag from Supabase
    await supabaseClient.deleteSampleFlag(uuid)

    // Broadcast deletion via WebSocket
    io.to(`course:${courseCode}`).emit('sample_updated', {
      courseCode,
      uuid,
      update: { deleted: true }
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('Error deleting flag:', error)
    res.status(500).json({ error: error.message })
  }
})

// Bulk update sample flags
app.post('/api/production/:courseCode/flags/bulk-update', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { updates } = req.body

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates array required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Apply all updates to Supabase
    const results = []
    for (const { uuid, status, reason, notes, flaggedBy } of updates) {
      const combinedNotes = reason ? `${reason}${notes ? '\n' + notes : ''}` : notes
      const updated = await supabaseClient.updateSampleFlag(uuid, {
        courseCode,
        status,
        notes: combinedNotes,
        flaggedBy
      })
      results.push(updated)
    }

    // Broadcast bulk update
    io.to(`course:${courseCode}`).emit('bulk_update', {
      courseCode,
      count: updates.length
    })

    res.json({ success: true, updated: updates.length })
  } catch (error) {
    logger.error('Error bulk updating flags:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================================
// USER FEEDBACK ENDPOINTS
// Crowdsourced QA - users flag issues, aggregated by threshold
// ============================================================================

// Submit user feedback on audio/content
app.post('/api/production/:courseCode/feedback', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { audioId, feedbackType, userId, comment, sessionContext } = req.body

    // Validate required fields
    if (!feedbackType) {
      return res.status(400).json({ error: 'feedbackType required' })
    }

    const validTypes = ['translation', 'audio_quality', 'pronunciation', 'too_fast', 'confusing', 'other']
    if (!validTypes.includes(feedbackType)) {
      return res.status(400).json({
        error: `Invalid feedbackType. Must be one of: ${validTypes.join(', ')}`
      })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Insert feedback
    const { data, error } = await supabase
      .from('content_feedback')
      .insert({
        audio_id: audioId || null,
        course_code: courseCode,
        feedback_type: feedbackType,
        user_id: userId || 'anonymous',
        comment: comment || null,
        session_context: sessionContext || null
      })
      .select()
      .single()

    if (error) throw error

    logger.info(`Feedback submitted: ${feedbackType} for ${courseCode}${audioId ? ` (audio: ${audioId})` : ''}`)

    // Broadcast feedback event
    io.to(`course:${courseCode}`).emit('feedback_submitted', {
      courseCode,
      feedbackType,
      audioId
    })

    res.json({ success: true, feedback: data })
  } catch (error) {
    logger.error('Error submitting feedback:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get aggregated feedback above threshold
app.get('/api/production/:courseCode/feedback/aggregated', async (req, res) => {
  try {
    const { courseCode } = req.params
    const threshold = parseInt(req.query.threshold) || 3  // Default: 3 flags to surface
    const feedbackType = req.query.type || null           // Optional filter by type
    const limit = parseInt(req.query.limit) || 50

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Query aggregated feedback
    // Note: Using raw SQL via RPC would be more efficient, but this works for now
    let query = supabase
      .from('content_feedback')
      .select('audio_id, feedback_type, comment, created_at, session_context')
      .eq('course_code', courseCode)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })

    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType)
    }

    const { data: allFeedback, error } = await query

    if (error) throw error

    // Aggregate in JS (could be optimized with a DB view/function)
    const aggregated = {}
    for (const fb of allFeedback || []) {
      const key = `${fb.audio_id || 'general'}:${fb.feedback_type}`
      if (!aggregated[key]) {
        aggregated[key] = {
          audio_id: fb.audio_id,
          feedback_type: fb.feedback_type,
          flag_count: 0,
          comments: [],
          first_flagged: fb.created_at,
          last_flagged: fb.created_at,
          session_contexts: []
        }
      }
      aggregated[key].flag_count++
      aggregated[key].last_flagged = fb.created_at
      if (fb.comment) {
        aggregated[key].comments.push(fb.comment)
      }
      if (fb.session_context) {
        aggregated[key].session_contexts.push(fb.session_context)
      }
    }

    // Filter by threshold and sort by flag count
    const issues = Object.values(aggregated)
      .filter(item => item.flag_count >= threshold)
      .sort((a, b) => b.flag_count - a.flag_count)
      .slice(0, limit)

    // Get text info for audio IDs (v13: course_audio has text directly)
    const audioIds = issues.map(i => i.audio_id).filter(Boolean)
    let audioInfo = {}

    if (audioIds.length > 0) {
      const { data: audioData } = await supabase
        .from('course_audio')
        .select('id, text, language, voice_id')
        .in('id', audioIds)

      if (audioData) {
        for (const audio of audioData) {
          audioInfo[audio.id] = {
            text: audio.text,
            language: audio.language,
            voice_id: audio.voice_id
          }
        }
      }
    }

    // Enrich issues with text info
    const enrichedIssues = issues.map(issue => ({
      ...issue,
      text: audioInfo[issue.audio_id]?.text || null,
      language: audioInfo[issue.audio_id]?.language || null,
      voice_id: audioInfo[issue.audio_id]?.voice_id || null
    }))

    res.json({
      success: true,
      threshold,
      total_issues: enrichedIssues.length,
      issues: enrichedIssues
    })
  } catch (error) {
    logger.error('Error getting aggregated feedback:', error)
    res.status(500).json({ error: error.message })
  }
})

// Resolve feedback (mark as addressed)
app.post('/api/production/:courseCode/feedback/resolve', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { audioId, feedbackType, resolvedBy, resolutionNote } = req.body

    if (!resolvedBy) {
      return res.status(400).json({ error: 'resolvedBy required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Build update query
    let query = supabase
      .from('content_feedback')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_note: resolutionNote || null
      })
      .eq('course_code', courseCode)
      .is('resolved_at', null)

    if (audioId) {
      query = query.eq('audio_id', audioId)
    }
    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType)
    }

    const { data, error, count } = await query.select()

    if (error) throw error

    logger.info(`Resolved ${data?.length || 0} feedback items for ${courseCode}`)

    // Broadcast resolution
    io.to(`course:${courseCode}`).emit('feedback_resolved', {
      courseCode,
      audioId,
      feedbackType,
      resolvedCount: data?.length || 0
    })

    res.json({
      success: true,
      resolved: data?.length || 0
    })
  } catch (error) {
    logger.error('Error resolving feedback:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get feedback stats for course
app.get('/api/production/:courseCode/feedback/stats', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Get counts by type
    const { data: allFeedback, error } = await supabase
      .from('content_feedback')
      .select('feedback_type, resolved_at')
      .eq('course_code', courseCode)

    if (error) throw error

    const stats = {
      total: allFeedback?.length || 0,
      unresolved: 0,
      resolved: 0,
      by_type: {}
    }

    for (const fb of allFeedback || []) {
      if (fb.resolved_at) {
        stats.resolved++
      } else {
        stats.unresolved++
      }
      stats.by_type[fb.feedback_type] = (stats.by_type[fb.feedback_type] || 0) + 1
    }

    res.json({ success: true, stats })
  } catch (error) {
    logger.error('Error getting feedback stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get audio metadata
app.get('/api/production/:courseCode/audio-metadata', async (req, res) => {
  try {
    const { courseCode } = req.params
    const metadata = await s3Service.getAudioMetadata(courseCode)
    res.json(metadata)
  } catch (error) {
    logger.error('Error fetching audio metadata:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// Shared helper: Calculate audio stats from Supabase PLUS phase 8's /needs.
// Used by /audio-stats, /audio-pipeline/plan, and /audio-pipeline/missing
// Cached in-memory for 60s per course — invalidated on audio generation events
//
// HARD DEPENDENCY on phase 8 (port 3465): the pending count comes from phase 8's
// /needs so the dashboard number matches exactly what /generate would process.
// If 3465 is down this throws ECONNREFUSED and every caller 500s — that was the
// 2026-08-04 audio-stats outage. 3465 is supervised by
// ops/systemd/popty-phase8-audio.service and health-checked by the watchdog.
// (The comment here used to claim "no Phase 8 needed"; that stopped being true
// when the /needs call was introduced as the single source of truth.)
// =============================================================================
const _audioStatsCache = new Map() // courseCode → { data, expiry }
const AUDIO_STATS_CACHE_TTL = 5_000 // 5 seconds — short because Phase 8 linking can change counts between requests

function invalidateAudioStatsCache(courseCode) {
  if (courseCode) {
    _audioStatsCache.delete(courseCode)
  } else {
    _audioStatsCache.clear()
  }
}

// Paginated Supabase fetch — prevents silent row truncation on large tables
async function fetchAllRows(supabase, table, selectCols, filters) {
  const PAGE_SIZE = 50000
  let allData = []
  let offset = 0
  while (true) {
    let query = supabase.from(table).select(selectCols)
    for (const [method, ...args] of filters) {
      query = query[method](...args)
    }
    query = query.range(offset, offset + PAGE_SIZE - 1)
    const { data, error } = await query
    if (error) throw error
    allData = allData.concat(data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return allData
}

async function getDirectAudioStats(courseCode) {
  // Check cache
  const cached = _audioStatsCache.get(courseCode)
  if (cached && Date.now() < cached.expiry) {
    return cached.data
  }

  const supabase = supabaseClient.getClient()

  // Get course info for shared audio (known_lang)
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('seed_count, known_lang, target_lang')
    .eq('course_code', courseCode)
    .single()
  if (courseError) throw new Error(`Course not found: ${courseCode}`)
  const knownLang = course.known_lang || 'eng'

  // Single source of truth: phase 8's /needs endpoint, which uses getAudioNeeds().
  // This is the same function /generate uses to decide what to TTS, so the
  // dashboard's "Pending" number now matches what Generate will process exactly.
  // A bare ECONNREFUSED here surfaces as AggregateError with an EMPTY .message,
  // so the endpoint used to answer {"error":""} — true but useless. Name the
  // dependency instead; that is the whole diagnosis.
  let phase8Resp
  try {
    phase8Resp = await proxyToPhase8('GET', `/needs/${courseCode}`)
  } catch (err) {
    const reason = err?.code || err?.errors?.[0]?.code || err?.message || 'unknown error'
    throw new Error(
      `phase 8 audio service (localhost:3465) is unreachable (${reason}) — ` +
      `audio stats cannot be computed without it. ` +
      `Check: systemctl --user status popty-phase8-audio`
    )
  }
  if (phase8Resp.status >= 400) {
    throw new Error(`phase8 /needs failed (${phase8Resp.status}): ${JSON.stringify(phase8Resp.data)}`)
  }
  const phase8Needs = phase8Resp.data
  // Course TTS work = existing texts to render + intros /generate authors
  // itself (frame judgment) in the same run
  const azureMissing = (phase8Needs.toGenerate || 0) + (phase8Needs.toAuthor || 0)
  const azureSlots = phase8Needs.totalSlots || 0
  const azureExisting = phase8Needs.existing || 0

  // Shared audio (NOT generated by Generate Missing Audio — separate bulk-audio scripts).
  // Reported here so existing /audio-pipeline/missing consumers don't break, but
  // dashboard surfaces should use /shared-audio-status for richer per-bucket info.
  const SHARED_REQUIREMENTS = { encouragement: 48, instruction: 48 }
  const [encRes, instrRes, welcomeRes] = await Promise.all([
    supabase.from('shared_audio').select('*', { count: 'exact', head: true })
      .eq('language', knownLang).eq('audio_type', 'encouragement'),
    supabase.from('shared_audio').select('*', { count: 'exact', head: true })
      .eq('language', knownLang).eq('audio_type', 'instruction'),
    supabase.from('course_audio').select('id')
      .eq('course_code', courseCode).eq('role', 'welcome')
      .not('s3_key', 'like', 'pending/%').limit(1)
  ])
  const sharedMissing = Math.max(0, SHARED_REQUIREMENTS.encouragement - (encRes.count || 0))
    + Math.max(0, SHARED_REQUIREMENTS.instruction - (instrRes.count || 0))
  const sharedTotal = SHARED_REQUIREMENTS.encouragement + SHARED_REQUIREMENTS.instruction
  const welcomeMissing = (welcomeRes.data?.length > 0) ? 0 : 1
  const welcomeTotal = 1

  // Combined totals — Pending widget reads `missing` and now matches /generate.
  const totalSlots = azureSlots + sharedTotal + welcomeTotal
  const totalMissing = azureMissing + sharedMissing + welcomeMissing
  const totalExisting = totalSlots - totalMissing

  const result = {
    total: totalSlots,
    existing: totalExisting,
    missing: totalMissing,
    // NEW: course-specific TTS work (the Generate button). Excludes shared.
    toGenerate: azureMissing,
    toAuthor: phase8Needs.toAuthor || 0,
    ledger: phase8Needs.ledger || null,
    toLink: phase8Needs.toLink || 0,
    azureSlots,
    azureExisting,
    breakdown: phase8Needs.breakdown || { known: 0, target1: 0, target2: 0, presentation: 0 },
    // "missing" vs "unlinked" — a slot whose audio exists (and whose object is
    // in the bucket) was never missing, it was just unbound. Kept as separate
    // counts so the dashboard stops calling one the other.
    unlinkedBreakdown: phase8Needs.unlinkedBreakdown || { known: 0, target1: 0, target2: 0, presentation: 0 },
    missingBreakdown: phase8Needs.missingBreakdown || phase8Needs.breakdown || { known: 0, target1: 0, target2: 0, presentation: 0 },
    toCopy: phase8Needs.toCopy || 0,
    storageBroken: phase8Needs.storageBroken || 0,
    storageBrokenBreakdown: phase8Needs.storageBrokenBreakdown || { known: 0, target1: 0, target2: 0 },
    existingByRole: {},
    totalPhrases: 0, // not in /needs response; consumers use /audio-pipeline/missing for breakdowns
    totalLegos: 0,
    totalNewLegos: 0,
    sharedNeeded: sharedTotal,
    sharedExisting: sharedTotal - sharedMissing,
    welcomeExists: welcomeMissing === 0,
    readyForGenerate: phase8Needs.readyForGenerate,
    presentationStatus: phase8Needs.presentationStatus,
    releaseTarget: phase8Needs.releaseTarget
  }

  // Cache result
  _audioStatsCache.set(courseCode, { data: result, expiry: Date.now() + AUDIO_STATS_CACHE_TTL })
  return result
}

// Paid-target languages — courses with these as target get paywall encouragements
// (currently only available in English known-language; see memory/project_paywall_encouragements.md)
const PAID_TARGET_LANGUAGES = new Set(['eng', 'ara', 'cmn', 'jpn', 'kor', 'ita', 'fra', 'spa', 'por', 'deu'])

/**
 * Render the welcome script text for a given (knownLang, targetLang) pair.
 * Reads the template from scripts/bulk-audio/data/translations/welcomes/{knownLang}.json
 * and substitutes target-specific slots ({a_target_speaker}, {in_target}, etc.).
 * Returns null if the template file or target slots are missing.
 */
// Course `known_lang` codes don't always match the welcome-translation file naming.
// e.g., zho (Chinese — used by courses) ↔ cmn.json (Mandarin — file). Most cases match.
const WELCOME_FILE_ALIAS = { zho: 'cmn' }

function renderWelcomeScript(knownLang, targetLang, targetSuffix = '') {
  try {
    const fs = require('fs')
    const fileLang = WELCOME_FILE_ALIAS[knownLang] || knownLang
    const p = path.join(__dirname, '..', 'scripts', 'bulk-audio', 'data', 'translations', 'welcomes', `${fileLang}.json`)
    if (!fs.existsSync(p)) return null
    const data = JSON.parse(fs.readFileSync(p, 'utf8'))
    // Dialect-aware lookup: ara_lb_for_eng → try targets["ara_lb"] first, fall back to targets["ara"]
    const dialectKey = targetSuffix ? `${targetLang}_${targetSuffix}` : null
    const slots = (dialectKey && data.targets?.[dialectKey]) || data.targets?.[targetLang]
    if (!data.template || !slots) return null
    return data.template
      .replace(/\{a_target_speaker\}/g, slots.a_target_speaker || '')
      .replace(/\{in_target\}/g, slots.in_target || '')
      .replace(/\{target_speakers\}/g, slots.target_speakers || '')
      .replace(/\{in_known\}/g, data.in_known || '')
  } catch (e) {
    logger.warn(`renderWelcomeScript(${knownLang}, ${targetLang}, ${targetSuffix}) failed: ${e.message}`)
    return null
  }
}

// GET /api/production/:courseCode/shared-audio-status
// Per-bucket status for the dashboard's Shared Audio section.
// Buckets: welcome, ordered (instructions), pooled (encouragements), paywall (paid courses only).
app.get('/api/production/:courseCode/shared-audio-status', async (req, res) => {
  try {
    const { courseCode } = req.params
    const supabase = supabaseClient.getClient()
    if (!supabase) return res.status(503).json({ error: 'Supabase not initialized' })

    const { data: course, error: courseError } = await supabase
      .from('courses').select('known_lang, target_lang').eq('course_code', courseCode).single()
    if (courseError || !course) return res.status(404).json({ error: 'Course not found' })

    const knownLang = course.known_lang
    const targetLang = course.target_lang
    const paywallApplies = PAID_TARGET_LANGUAGES.has(targetLang)

    const [orderedRes, pooledRes, welcomeRes, paywallRes] = await Promise.all([
      supabase.from('shared_audio').select('id', { count: 'exact', head: true })
        .eq('language', knownLang).eq('audio_type', 'instruction'),
      supabase.from('shared_audio').select('id', { count: 'exact', head: true })
        .eq('language', knownLang).eq('audio_type', 'encouragement'),
      supabase.from('course_audio').select('id, s3_key, text')
        .eq('course_code', courseCode).eq('role', 'welcome').limit(1),
      paywallApplies
        ? supabase.from('shared_audio').select('id', { count: 'exact', head: true })
            .eq('language', knownLang).eq('audio_type', 'paywall')
        : Promise.resolve({ count: 0 })
    ])

    const ORDERED_TOTAL = 48
    const POOLED_TOTAL = 48

    const welcomeRow = welcomeRes.data?.[0]
    const welcomePopulated = !!(welcomeRow && welcomeRow.s3_key && !welcomeRow.s3_key.startsWith('pending/'))

    // The text stored on the welcome course_audio row is just "welcome" (a label).
    // The actual spoken script is built from the template + per-target slot fills.
    const { targetSuffix } = parseCourseCodeSuffixes(courseCode, knownLang, targetLang)
    const welcomeScript = renderWelcomeScript(knownLang, targetLang, targetSuffix)

    res.json({
      knownLang,
      targetLang,
      welcome: {
        populated: welcomePopulated,
        text: welcomeScript || welcomeRow?.text || null,
        s3_key: welcomeRow?.s3_key || null
      },
      ordered: {
        populated_count: orderedRes.count || 0,
        total: ORDERED_TOTAL,
        complete: (orderedRes.count || 0) >= ORDERED_TOTAL
      },
      pooled: {
        populated_count: pooledRes.count || 0,
        total: POOLED_TOTAL,
        complete: (pooledRes.count || 0) >= POOLED_TOTAL
      },
      paywall: {
        applies: paywallApplies,
        populated_count: paywallRes.count || 0,
        // Total for paywall not known per-language; report 0 when not applicable
        // and the actual count when it does. Frontend renders accordingly.
      }
    })
  } catch (error) {
    logger.error('shared-audio-status error:', error)
    res.status(500).json({ error: error.message })
  }
})

// FAST audio stats endpoint - counts audio matching CURRENT course content
// Returns total needed vs existing audio for Progress Dashboard
// Uses same normalizeText logic as the /plan endpoint for consistent counts
app.get('/api/production/:courseCode/audio-stats', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Allow cache-bust via ?fresh=1
    if (req.query.fresh) invalidateAudioStatsCache(courseCode)
    const stats = await getDirectAudioStats(courseCode)

    res.json({
      success: true,
      total: stats.total,
      existing: stats.existing,
      missing: stats.missing,
      // NEW canonical fields for the dashboard:
      // - toGenerate: course-specific TTS work (matches what /generate processes)
      // - toLink: rows that already have audio, just need binding (no TTS spend)
      // - readyForGenerate: false → "Generate presentation text first"
      toGenerate: stats.toGenerate,
      toLink: stats.toLink,
      readyForGenerate: stats.readyForGenerate,
      presentationStatus: stats.presentationStatus,
      breakdown: {
        ...stats.breakdown,
        phrases: stats.totalPhrases,
        seeds: 0,
        uniquePhraseAudio: stats.uniquePhraseAudio,
        newLegos: stats.totalNewLegos,
        presentationsExisting: stats.existingByRole?.presentation,
        sharedNeeded: stats.sharedNeeded,
        sharedExisting: stats.sharedExisting,
        welcomeExists: stats.welcomeExists
      }
    })
  } catch (error) {
    logger.error('Error fetching audio stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// LISTENING PODS (Layer 2)
// =============================================================================

// GET /api/pods/:courseCode — list pods for a course with coverage summary
app.get('/api/pods/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const supabase = supabaseClient.getClient()

    const { data: pods, error: podsErr } = await supabase
      .from('listening_pods')
      .select('id, course_code, pod_type, slug, title, scene, difficulty, speakers, metadata, source_file, updated_at')
      .eq('course_code', courseCode)
      .order('pod_type').order('slug')

    if (podsErr) throw podsErr

    const results = []
    for (const pod of pods || []) {
      const { count: totalSentences } = await supabase
        .from('listening_pod_sentences')
        .select('*', { count: 'exact', head: true })
        .eq('pod_id', pod.id)
      const { count: targetAudio } = await supabase
        .from('listening_pod_sentences')
        .select('*', { count: 'exact', head: true })
        .eq('pod_id', pod.id)
        .not('target_audio_id', 'is', null)
      const { count: knownAudio } = await supabase
        .from('listening_pod_sentences')
        .select('*', { count: 'exact', head: true })
        .eq('pod_id', pod.id)
        .not('known_audio_id', 'is', null)

      results.push({
        ...pod,
        sentence_count: totalSentences || 0,
        audio_coverage: {
          target: targetAudio || 0,
          known: knownAudio || 0,
          total_sentences: totalSentences || 0,
        },
      })
    }

    res.json({ course_code: courseCode, pods: results })
  } catch (err) {
    logger.error(`[Pods list] ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pods/:courseCode/:slug — pod detail with all sentences
app.get('/api/pods/:courseCode/:slug', async (req, res) => {
  try {
    const { courseCode, slug } = req.params
    const supabase = supabaseClient.getClient()
    const podId = `${courseCode}:${slug}`

    const { data: pod, error: podErr } = await supabase
      .from('listening_pods').select('*').eq('id', podId).single()
    if (podErr || !pod) return res.status(404).json({ error: `Pod not found: ${podId}` })

    const { data: sentences, error: sErr } = await supabase
      .from('listening_pod_sentences')
      .select('id, scene_number, sentence_number, global_order, beat_label, speaker, target_text, known_text, target_audio_id, known_audio_id, explainer_decomposition, explainer_text, explainer_audio_id')
      .eq('pod_id', podId)
      .order('global_order')
    if (sErr) throw sErr

    res.json({ pod, sentences: sentences || [] })
  } catch (err) {
    logger.error(`[Pod detail] ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/pods/generate — create/extend a listening pod for a course by
// flexing the canonical scenarios (canonical_pod_scenarios) into the course's
// language pair via the Max-plan Claude CLI. Resumable: generates scenes within
// a wall-time budget and returns more_remaining; the UI calls again to continue
// (same loop shape as /api/admin/pod-explainer-generate). Generated sentences
// have no audio yet, so they're a reviewable/editable DRAFT until audio is run.
// Refuses to overwrite a pod that already has audio unless { force: true }.
app.post('/api/admin/pods/generate', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const courseCode = String(req.body?.courseCode || '').trim()
  const slug = String(req.body?.slug || 'pod-0').trim()
  const force = req.body?.force === true
  // mode: 'full' | 'sync' | 'resume'. 'sync' propagates a canonical edit
  // surgically (re-flex only changed scenes, preserve the rest + its audio).
  const mode = ['full', 'sync', 'resume'].includes(req.body?.mode) ? req.body.mode : undefined
  if (!courseCode) return res.status(400).json({ error: 'courseCode required' })
  try {
    const podGenerator = require('./pod-dialogue-generator.cjs')
    const r = await podGenerator.generatePodBatch({
      courseCode, podSlug: slug, force, mode,
      deadlineMs: 45_000, maxScenes: 4, // bounded per call; UI loops until more_remaining=false
      log: (m) => logger.info('[PodGen] ' + m),
    })
    res.json({ ok: true, ...r })
  } catch (e) {
    logger.error('[PodGen] error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// PATCH /api/admin/pod-sentences/:id — edit a generated pod sentence's text.
// Editing target/known text nulls its audio (the recorded audio no longer
// matches), same convention as the course-content tables — Phase 8 regenerates.
app.patch('/api/admin/pod-sentences/:id', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const id = String(req.params.id || '')
  const patch = {}
  if (typeof req.body?.target_text === 'string') { patch.target_text = req.body.target_text.trim(); patch.target_audio_id = null }
  if (typeof req.body?.known_text === 'string') { patch.known_text = req.body.known_text.trim(); patch.known_audio_id = null }
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'target_text or known_text required' })
  try {
    const sb = supabaseClient.getClient()
    const { data, error } = await sb.from('listening_pod_sentences').update(patch).eq('id', id).select('id, target_text, known_text').maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: `sentence not found: ${id}` })
    res.json({ ok: true, sentence: data })
  } catch (e) {
    logger.error('[PodSentence] patch error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// GET /api/admin/pods/:courseCode/audio-plan — what pod audio is missing.
// Thin passthrough to Phase 8's /plan-pods (port 3465). Optional ?slug=<slug>
// scopes to one pod (Phase 8's route takes a comma-separated ?pods=<id> list,
// where a pod id is `${courseCode}:${slug}`). Returns Phase 8's shape so the UI
// reads total_clips_to_generate + per-pod missing counts directly.
app.get('/api/admin/pods/:courseCode/audio-plan', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const { courseCode } = req.params
  const slug = req.query.slug ? String(req.query.slug).trim() : null
  try {
    let path = `/plan-pods/${courseCode}`
    if (slug) path += `?pods=${encodeURIComponent(`${courseCode}:${slug}`)}`
    const response = await proxyToPhase8('GET', path)
    logger.info(`[Pods audio-plan] ${courseCode}${slug ? ' (' + slug + ')' : ''}: ${response.status}`)
    res.status(response.status).json(response.data)
  } catch (e) {
    logger.error('[Pods audio-plan] error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// POST /api/admin/pods/:courseCode/generate-audio — fill MISSING pod audio.
// Thin passthrough to Phase 8's /generate-pods (port 3465). Body may carry
// { pod_ids?: string[], roles?, concurrency? }; Phase 8 only generates clips
// whose audio_id is null, so this never deletes or overwrites existing audio.
// Returns Phase 8's shape ({ generated, reused, failed, total, ... }).
app.post('/api/admin/pods/:courseCode/generate-audio', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const { courseCode } = req.params
  try {
    const response = await proxyToPhase8('POST', `/generate-pods/${courseCode}`, req.body || {})
    logger.info(`[Pods generate-audio] ${courseCode}: ${response.status} (generated=${response.data?.generated}, failed=${response.data?.failed})`)
    res.status(response.status).json(response.data)
  } catch (e) {
    logger.error('[Pods generate-audio] error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// POST /api/admin/pods/:courseCode/generate-explainer-audio — render the
// Stage-1 explainer narration (Tom's branded xAI voice gfzdpspr5fdp) for
// sentences that HAVE explainer_text but NO explainer_audio_id yet, then write
// the resulting audio id back to the row. Mirrors the audio pass of
// services/run-pod-explainer-batch.cjs EXACTLY — same generatePodAudio params
// (text = explainer_text, language 'auto', role 'pod_explainer', voice
// {voice_id:'gfzdpspr5fdp', provider:'xai'}), same null-only scoping, same
// bounded fan-out. It never regenerates text and never overwrites an existing
// explainer_audio_id. Body may carry { pod_ids?: string[] } or ?slug=<slug> to
// scope to one pod. Calls phase8's generatePodAudio in-process (it inherits the
// xAI→Azure fallback + retry resilience); PHASE8_NO_LISTEN keeps it from
// grabbing port 3465 when required here.
const EXPLAINER_VOICE_ID = 'gfzdpspr5fdp'
// The xAI language CUE, not the clip's language. 'auto' means "detect" to the
// provider and is meaningless as an identity — it is what put 'auto' on 7,847
// course_audio.language rows. It now travels as ttsLanguageCue (so this
// endpoint's renders are bit-for-bit what they were) while the row gets the
// course's own target language. Deliberately NOT switched to
// resolveExplainerLanguage here: that would change the cue, and therefore the
// audio, which this change is not allowed to do. The batch runner
// (run-pod-explainer-batch.cjs) does cue per course; the divergence between the
// two paths predates this change and is worth a ruling.
const EXPLAINER_TTS_LANGUAGE_CUE = 'auto'
const EXPLAINER_ROLE = 'pod_explainer'
const EXPLAINER_PROVIDER = 'xai'
const EXPLAINER_AUDIO_PARALLEL = 4
app.post('/api/admin/pods/:courseCode/generate-explainer-audio', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const { courseCode } = req.params
  try {
    const supabase = supabaseClient.getClient()

    // The clip's IDENTITY language — the course's own target language, read
    // from the courses row rather than inferred from the cue. Separate from
    // EXPLAINER_TTS_LANGUAGE_CUE above, which is what xAI is told.
    const { data: courseRow, error: courseErr } = await supabase
      .from('courses').select('target_lang').eq('course_code', courseCode).single()
    if (courseErr || !courseRow) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` })
    }
    let identityLanguage
    try {
      identityLanguage = canonicalLanguage(courseRow.target_lang)
    } catch (identityErr) {
      return res.status(400).json({ error: `course ${courseCode}: ${identityErr.message}` })
    }

    // Scope: explicit pod_ids list, or a single pod via ?slug / body slug
    // (pod id is `${courseCode}:${slug}`). No scope = every pod in the course.
    let podIds = null
    if (Array.isArray(req.body?.pod_ids) && req.body.pod_ids.length) {
      podIds = req.body.pod_ids.map(String).filter(Boolean)
    } else {
      const slug = (req.query.slug || req.body?.slug)
      if (slug) podIds = [`${courseCode}:${String(slug).trim()}`]
    }

    // Candidates: explainer_text non-empty AND explainer_audio_id IS NULL.
    let query = supabase
      .from('listening_pod_sentences')
      .select('id, explainer_text, explainer_audio_id')
      .not('explainer_text', 'is', null)
      .neq('explainer_text', '')
      .is('explainer_audio_id', null)
    if (podIds && podIds.length) {
      query = podIds.length === 1 ? query.eq('pod_id', podIds[0]) : query.in('pod_id', podIds)
    } else {
      // No explicit scope: still bound to this course's pods.
      query = query.like('pod_id', `${courseCode}:%`)
    }
    const { data: rows, error } = await query
    if (error) throw new Error(`load explainer-audio candidates: ${error.message}`)

    const total = (rows || []).length
    if (total === 0) {
      logger.info(`[Pods generate-explainer-audio] ${courseCode}: nothing to render`)
      return res.json({ generated: 0, failed: 0, total: 0 })
    }

    // Lazy-load phase8 (pulls the full audio graph). PHASE8_NO_LISTEN stops its
    // app.listen() so requiring it here never collides with port 3465.
    process.env.PHASE8_NO_LISTEN = '1'
    const { generatePodAudio } = require('./phases/phase8-audio-v13.cjs')

    let generated = 0
    let failed = 0
    const errors = []
    for (let i = 0; i < rows.length; i += EXPLAINER_AUDIO_PARALLEL) {
      const wave = rows.slice(i, i + EXPLAINER_AUDIO_PARALLEL)
      await Promise.all(wave.map(async row => {
        try {
          const result = await generatePodAudio({
            courseCode,
            text: row.explainer_text,
            language: identityLanguage,
            ttsLanguageCue: EXPLAINER_TTS_LANGUAGE_CUE,
            role: EXPLAINER_ROLE,
            voice: {
              voice_id: EXPLAINER_VOICE_ID,
              provider: EXPLAINER_PROVIDER,
            },
          })
          const audioId = result?.id
          if (!audioId) throw new Error('no audio id returned from generatePodAudio')
          const { error: upErr } = await supabase
            .from('listening_pod_sentences')
            .update({ explainer_audio_id: audioId })
            .eq('id', row.id)
          if (upErr) throw new Error(`link write failed: ${upErr.message}`)
          generated++
        } catch (err) {
          failed++
          const msg = err?.message || String(err)
          errors.push({ id: row.id, error: msg })
          logger.error(`[Pods generate-explainer-audio] ${courseCode} fail for ${row.id}:`, msg)
        }
      }))
    }

    logger.info(`[Pods generate-explainer-audio] ${courseCode}: generated=${generated}, failed=${failed}, total=${total}`)
    const payload = { generated, failed, total }
    if (errors.length) payload.errors = errors
    res.json(payload)
  } catch (e) {
    logger.error('[Pods generate-explainer-audio] error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// GET /api/admin/canonical-pods/:slug — the language-neutral English scenarios
// (the editable source the generator flexes per course).
app.get('/api/admin/canonical-pods/:slug', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  try {
    const sb = supabaseClient.getClient()
    const { data, error } = await sb.from('canonical_pod_scenarios')
      .select('id, scene_number, scene_label, scene_title, scene_subtitle, sentence_number, global_order, speaker, english_text, author_notes')
      .eq('pod_slug', String(req.params.slug || 'pod-0')).order('global_order', { ascending: true })
    if (error) throw error
    res.json({ slug: req.params.slug, scenarios: data || [] })
  } catch (e) {
    logger.error('[CanonicalPods] list error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// PATCH /api/admin/canonical-pods/:id — edit a canonical scenario line (English
// + optional speaker/notes). This is the "Aran writes the English" surface.
app.patch('/api/admin/canonical-pods/:id', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const id = String(req.params.id || '')
  const patch = {}
  for (const k of ['english_text', 'speaker', 'author_notes']) {
    if (typeof req.body?.[k] === 'string') patch[k] = req.body[k]
  }
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'nothing to update' })
  try {
    const sb = supabaseClient.getClient()
    const { data, error } = await sb.from('canonical_pod_scenarios').update(patch).eq('id', id).select('id, english_text, speaker, author_notes').maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: `canonical line not found: ${id}` })
    res.json({ ok: true, line: data })
  } catch (e) {
    logger.error('[CanonicalPods] patch error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// GET /api/canonical-seeds — the 668 language-neutral English seeds (the SSoT
// in the canonical_seeds table). Public read: this drives the docs/seeds page.
// Returns the shape that view renders: { id, seed_number, seed_id, canonical_id, source }.
app.get('/api/canonical-seeds', async (req, res) => {
  try {
    const sb = supabaseClient.getClient()
    const { data, error } = await sb.from('canonical_seeds')
      .select('id, seed_number, seed_id, canonical_id, source_text')
      .order('seed_number', { ascending: true })
    if (error) throw error
    const seeds = (data || []).map(r => ({
      id: r.id, seed_number: r.seed_number, seed_id: r.seed_id,
      canonical_id: r.canonical_id, source: r.source_text,
    }))
    res.json({ seeds, total: seeds.length })
  } catch (e) {
    logger.error('[CanonicalSeeds] list error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// PATCH /api/admin/canonical-seeds/:id — edit a canonical seed's English source.
// Admin-gated. Updates source_text only; re-translation is a separate pipeline
// step (editing the canonical does not auto-propagate to course translations).
app.patch('/api/admin/canonical-seeds/:id', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const id = String(req.params.id || '')
  const source = req.body?.source
  if (typeof source !== 'string' || !source.trim()) {
    return res.status(400).json({ error: 'source (non-empty string) required' })
  }
  try {
    const sb = supabaseClient.getClient()
    const { data, error } = await sb.from('canonical_seeds')
      .update({ source_text: source }).eq('id', id)
      .select('id, seed_id, source_text').maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: `seed not found: ${id}` })
    res.json({ ok: true, seed: { id: data.id, seed_id: data.seed_id, source: data.source_text } })
  } catch (e) {
    logger.error('[CanonicalSeeds] patch error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// =============================================================================
// DOCUMENTATION API
// -----------------------------------------------------------------------------
// Live docs are served from Supabase (documentation_content / _sections).
// These endpoints used to live only on the orchestrator (3456), which is now
// optional — but the frontend talks to 3470, so getDocumentation() calls 404'd
// and every /docs page silently fell back to hardcoded content. Serving them
// here reconnects the live-from-DB pipe. supabase-client.cjs is already required
// above and exports both helpers (with RPC + manual-query fallbacks).
//
// Order matters: /list is registered before /:slug so the catch-all param route
// does not shadow it.
// =============================================================================

// GET /api/docs/list — document list for docs navigation. Query: ?category=...
app.get('/api/docs/list', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Database not initialized' })
    }
    const { category } = req.query
    const docs = await supabaseClient.getDocumentationList(category || null)
    res.json({ success: true, count: docs.length, documents: docs })
  } catch (e) {
    logger.error('[Docs API] list error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// GET /api/docs/:slug — a single document with all its sections.
app.get('/api/docs/:slug', async (req, res) => {
  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Database not initialized' })
    }
    const { slug } = req.params
    const doc = await supabaseClient.getDocumentation(slug)
    if (!doc) return res.status(404).json({ error: 'Document not found', slug })
    res.json({ success: true, document: doc })
  } catch (e) {
    logger.error(`[Docs API] get error for ${req.params.slug}:`, e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// Get signed URL for audio playback
// Looks up s3_key from database for v13 audio, falls back to legacy path
// GET /api/production/audio/:uuid/stream
// A clip's bytes, resolved through course_audio.s3_key and 302'd to a signed URL.
//
// WHY THIS EXISTS. Popty used to build clip URLs by CONVENTION —
// `mastered/<row-id>.mp3` — in api.js getAudioStreamUrl and in the
// useScriptPlayer fallback. That convention held only while a clip's s3_key
// equalled its row id. The versioned no-holes swap deliberately breaks that:
// it keeps the ROW ID stable (so no holder FK moves and no hole opens) and
// writes a NEW s3_key. Every convention-built URL therefore kept serving the
// PRE-SWAP object, for ever — which is exactly why replaced clips sounded
// unchanged in the Audio Preview tool and the cycle player on 2026-08-07.
//
// Synchronous by design: it returns a URL a caller can assign straight to
// `audio.src`, so every existing call site is fixed by changing one string
// rather than by an async refactor of each player.
app.get('/api/production/audio/:uuid/stream', async (req, res) => {
  try {
    const { uuid } = req.params
    let s3Key = null
    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      const { data } = await supabase
        .from('course_audio').select('s3_key').eq('id', uuid).maybeSingle()
      if (data?.s3_key) s3Key = data.s3_key
      if (!s3Key) {
        // TAKE FALLBACK (2026-08-19). Not every recorded take is a clip: a
        // script-mode SLOW read is deliberately never filed as course_audio
        // (services/script-take-filing.cjs), and a take whose filing failed has
        // bytes but no row. Both are things a recordist has just spoken and must
        // be able to play back — "there is no clip" is not an answer to "let me
        // hear that again". recording_provenance holds the take's s3_key in its
        // quality_notes context, keyed by the minted take uuid.
        //
        // READ-ONLY, and it files nothing: it makes existing bytes audible, it
        // does not create or backfill any course_audio row.
        const { data: takeRow } = await supabase
          .from('recording_provenance').select('quality_notes').eq('audio_uuid', uuid).maybeSingle()
        if (takeRow?.quality_notes && typeof takeRow.quality_notes === 'string' && takeRow.quality_notes[0] === '{') {
          try {
            const ctx = JSON.parse(takeRow.quality_notes)
            if (ctx?.s3_key) s3Key = ctx.s3_key
          } catch { /* a non-JSON quality_notes is an old plain-text row — no key to find */ }
        }
      }
    }
    if (!s3Key) return res.status(404).json({ error: `no course_audio row, recorded take or s3_key for ${uuid}` })
    if (s3Key.startsWith('pending/')) return res.status(409).json({ error: 'clip has no rendered audio yet' })
    const url = await s3Service.getAudioSignedUrl(uuid, 3600, { s3Key })
    // no-store: the signed URL expires, and a cached redirect would pin a
    // learner-invisible clip to a stale object after the next swap.
    res.set('Cache-Control', 'no-store')
    res.redirect(302, url)
  } catch (error) {
    logger.error('Error streaming audio by id:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/production/:courseCode/audio/:uuid/url', async (req, res) => {
  try {
    const { courseCode, uuid } = req.params

    // The DB is authoritative for a clip's s3_key, and a caller's copy of it is
    // not. A regen keeps the ROW ID stable and writes a NEW s3_key (see the
    // /audio/:uuid/stream block above), so a page that loaded before the regen
    // holds a key pointing at the PRE-REGEN object — which is still on S3,
    // because make-before-break never deletes it. Trusting that key served the
    // old take back for ever and read as "my regenerated audio reverted"
    // (Deborah, eus_for_eng, 2026-08-12). Same failure the /stream endpoint was
    // built to kill on 2026-08-07; it survived here because this endpoint let
    // the client win. The query param is now only a fallback for a clip with no
    // row (legacy paths), never an override of one that has.
    let s3Key = null

    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      const { data: audioData } = await supabase
        .from('course_audio')
        .select('s3_key')
        .eq('id', uuid)
        .maybeSingle()

      if (audioData?.s3_key) {
        s3Key = audioData.s3_key
      }
    }

    if (!s3Key) s3Key = req.query.s3Key || null

    // Generate signed URL (uses s3_key if available, otherwise legacy path)
    const url = await s3Service.getAudioSignedUrl(uuid, 3600, { s3Key })
    res.json({ url })
  } catch (error) {
    logger.error('Error generating signed URL:', error)
    res.status(500).json({ error: error.message })
  }
})

// Check audio file exists
app.get('/api/production/:courseCode/audio/:uuid/exists', async (req, res) => {
  try {
    const { uuid } = req.params
    const exists = await s3Service.audioFileExists(uuid)
    res.json({ exists })
  } catch (error) {
    logger.error('Error checking audio existence:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get audio URL by text lookup
// Used by CyclePlayer and ScriptViewer to find audio for phrases
// v13 Schema: course_audio (flat table with text, course_code, role, s3_key)
app.get('/api/production/:courseCode/audio/by-text', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { text, role = 'target1' } = req.query

    if (!text) {
      return res.status(400).json({ error: 'text parameter required' })
    }

    const supabase = supabaseClient.getClient()
    if (!supabase) {
      return res.status(500).json({ error: 'Database not initialized' })
    }

    // v13: Query course_audio directly (flat table, no joins needed)
    const normalizedText = normalizeForAudio(text.toString())
    // Fallback: strip all punctuation for legacy records with inconsistent normalization
    const PUNCT_REGEX = /[。？！、，.!?,;:()（）「」『』\[\]…—–\-]+/g
    const strippedText = normalizedText.replace(PUNCT_REGEX, '').trim()

    const { data: audioData, error: audioError } = await supabase
      .from('course_audio')
      .select('id, s3_key, voice_id, role')
      .eq('course_code', courseCode)
      .eq('text_normalized', normalizedText)
      .eq('role', role)
      .single()

    if (audioError || !audioData) {
      // Try without role filter and find best match
      const { data: anyAudio } = await supabase
        .from('course_audio')
        .select('id, s3_key, voice_id, role')
        .eq('course_code', courseCode)
        .eq('text_normalized', normalizedText)
        .limit(1)
        .single()

      if (!anyAudio && strippedText !== normalizedText) {
        // Fallback: try punctuation-stripped text (handles 你想。 → 你想 mismatch)
        const { data: strippedAudio } = await supabase
          .from('course_audio')
          .select('id, s3_key, voice_id, role')
          .eq('course_code', courseCode)
          .eq('text_normalized', strippedText)
          .eq('role', role)
          .single()

        if (strippedAudio) {
          const url = await s3Service.getAudioSignedUrl(strippedAudio.id, 3600, { s3Key: strippedAudio.s3_key })
          return res.json({ url, uuid: strippedAudio.id, role: strippedAudio.role })
        }

        // Try stripped text without role filter
        const { data: strippedAny } = await supabase
          .from('course_audio')
          .select('id, s3_key, voice_id, role')
          .eq('course_code', courseCode)
          .eq('text_normalized', strippedText)
          .limit(1)
          .single()

        if (strippedAny) {
          const url = await s3Service.getAudioSignedUrl(strippedAny.id, 3600, { s3Key: strippedAny.s3_key })
          return res.json({ url, uuid: strippedAny.id, role: strippedAny.role })
        }
      }

      if (!anyAudio) {
        return res.status(404).json({ error: `Audio not found for text in course ${courseCode}` })
      }

      // Use the fallback audio
      const url = await s3Service.getAudioSignedUrl(anyAudio.id, 3600, { s3Key: anyAudio.s3_key })
      return res.json({ url, uuid: anyAudio.id, role: anyAudio.role })
    }

    // Get signed URL using s3_key from database
    const url = await s3Service.getAudioSignedUrl(audioData.id, 3600, { s3Key: audioData.s3_key })
    res.json({ url, uuid: audioData.id })
  } catch (error) {
    logger.error('Error fetching audio by text:', error)
    res.status(500).json({ error: error.message })
  }
})

// Upload human recording
// POST /api/production/:courseCode/recording/upload
//
// Extracted from its route closure so the recordist surface
// (/api/recording/voice/:voiceId/take, services/voice-engine/recordist-router.cjs)
// can hand a take to THIS handler instead of growing a second uploader. The
// recordist route adapts its multipart body into the shape below and calls
// handleRecordingUpload directly — which is what keeps raw/{UUID}.{ext}
// archive-before-process, the two refusals, provenance and pod registration
// identical on both surfaces, with one set of tests over them.
async function handleRecordingUpload(req, res) {
  try {
    const { courseCode } = req.params
    const {
      uuid,
      audioData,
      metadata = {},
      provenance = {},
      mimeType = 'audio/webm'
    } = req.body

    // Script-mode takes (new-course autocue) have no pre-existing audio identity;
    // regeneration-mode takes re-record an existing course_audio row by real uuid.
    // Pod-mode takes (dialogue autocue) carry pod identity in metadata — a NEW
    // course_audio row is minted and the pod sentence FK re-pointed at commit.
    const isPodMode = podsRegistration.isPodModeUpload(metadata)
    const isScriptMode = !isPodMode && isScriptModeUpload(uuid, metadata)

    if (!audioData || (!uuid && !isScriptMode && !isPodMode)) {
      return res.status(400).json({ error: 'uuid and audioData required' })
    }

    // Script mode: mint the take's identity server-side and store at the canon
    // prefix. Client-fabricated ids (script-0..N) produced one global key per index
    // (ssiborg-assets/mastered/script-0.mp3) shared across every course, session
    // and voice — later sessions PUT over earlier ones.
    // Every take gets a FRESH object key — an existing S3 object is never PUT over.
    // Regeneration mode: the course_audio row keeps its id; its s3_key moves to the
    // fresh key after upload (the old object stays at the old key for reversibility).
    const audioId = (isScriptMode || isPodMode) ? crypto.randomUUID().toUpperCase() : uuid
    const s3KeyUuid = isScriptMode ? audioId : crypto.randomUUID().toUpperCase()
    const s3Key = `mastered/${s3KeyUuid}.mp3`

    // Pod mode: validate identity + resolve the cast voice BEFORE the S3 PUT
    // (same principle as the regeneration lookup below — a bad sentenceId must
    // never orphan bytes). voice_id resolves SERVER-side from
    // voice_config.podCast (client metadata.voiceId advisory).
    let podContext = null
    if (isPodMode) {
      if (!supabaseClient.isInitialized()) {
        return res.status(503).json({ error: 'Supabase not initialized — pod recordings cannot be registered' })
      }
      const prep = await podsRegistration.preparePodRegistration({
        supabase: supabaseClient.getClient(), courseCode, metadata, logger,
        // Set ONLY by the recordist surface, which resolved the voice from
        // language_recording_policy before it got here (req.recordistVoiceId).
        // Absent on every other caller, so the cast stays authoritative there.
        forcedVoiceId: req.recordistVoiceId || null
      })
      if (prep.error) return res.status(prep.status || 400).json({ error: prep.error })
      podContext = prep.context
    }

    // Regeneration mode re-records an existing course_audio row — look it up
    // BEFORE the S3 PUT so a bad uuid can't orphan bytes.
    let existingRow = null
    if (!isScriptMode && !isPodMode && supabaseClient.isInitialized()) {
      const { data: row, error: rowError } = await supabaseClient.getClient()
        .from('course_audio')
        .select('id, s3_key, origin')
        .eq('id', uuid)
        .eq('course_code', courseCode)
        .maybeSingle()
      if (rowError) {
        if (rowError.code === '22P02') {
          return res.status(400).json({ error: `Invalid course_audio uuid: ${uuid}` })
        }
        throw rowError
      }
      if (!row) {
        return res.status(404).json({ error: `No course_audio row ${uuid} in ${courseCode}` })
      }
      existingRow = row
    }

    // Decode base64 audio data
    const rawBuffer = Buffer.from(audioData, 'base64')
    logger.log(`[Upload] Received ${rawBuffer.length} bytes for ${audioId}${isScriptMode ? ' (script mode, server-minted)' : ''}`)

    // The silent-take floor, enforced inside retainAndProcessTake below.
    //
    // A take that processed "successfully" into no audio is refused: the trim
    // filter (silenceremove at -40dB) strips a silent or muted-mic take down to
    // nothing — ffmpeg exits 0, lame writes an 834-byte header-only MP3 that
    // ffprobe cannot even decode ("Failed to find two consecutive MPEG audio
    // frames"), and the recorder got a 200 with success:true. That is the
    // 2026-08-06 Welsh bug — bookkeeping said recorded, the learner got silence.
    // In regeneration/pod mode it repoints a real phrase row at an unplayable
    // stub. Refused BEFORE the S3 PUT (same principle as the uuid lookup above —
    // a bad take must never orphan bytes) so the client's upload queue marks it
    // failed and the take stays visible as missing. Threshold is deliberately low
    // so that it only catches silence, muted mics and stray clicks, never a word.
    //
    // The old note here read "the trim is aggressive — a synthesised 350ms tone
    // comes out the far side at 150ms". That was the T-20 bug being observed and
    // worked around rather than fixed: the trim was destroying 100ms at each end
    // (start_duration, since corrected to start_silence — see audio-processor.cjs).
    // A 350ms tone now survives as ~350ms, so this guard has MORE headroom than
    // when it was written, not less. It stays as the silent-take backstop.
    const MIN_TAKE_MS = 100

    // RETAIN THE RAW TAKE, THEN PROCESS — the order is deliberate and load-bearing.
    //
    // Until now the raw container lived only in this request-local buffer and was
    // gone the moment the handler returned; only the processed MP3 was ever PUT.
    // That is why the originals of 107 butchered Welsh clips do not exist anywhere
    // in ssi-audio-stage (T-20 post-mortem): every destructive step in the chain
    // had no undo. A voice actor's take is irreplaceable — archive it first.
    //
    // The archive write happens BEFORE processing so that even a take this handler
    // goes on to REFUSE (unprocessable, or nothing audible after the trim — both
    // below, both unchanged) still has its original kept. A refused take is exactly
    // the one someone will want to recover or diagnose. Orphans under raw/ are
    // acceptable and wanted; orphans under mastered/ are not, which is why the two
    // refusals still sit before the mastered PUT.
    //
    // A failed archive write does NOT fail the take (retainAndProcessTake swallows
    // and logs it) — losing the upload because the archive PUT failed would be
    // worse than the problem being solved.
    logger.log(`[Upload] Retaining raw take + processing (mimeType: ${mimeType})...`)
    const take = await retainAndProcessTake({
      rawBuffer,
      mimeType,
      s3KeyUuid,
      audioId,
      minTakeMs: MIN_TAKE_MS,
      logger,
      retainRaw: ({ rawKey, buffer, contentType }) => s3Service.uploadRawTake({
        key: rawKey,
        buffer,
        contentType,
        metadata: {
          courseCode,
          audioId,
          masteredKey: s3Key,
          mimeType,
          via: 'recording'
        }
      }),
      processRecording: (buffer, options) => audioProcessor.processRecordingBuffer(buffer, options)
    })

    const rawKey = take.rawKey
    const { audioMeta } = take

    // Both refusals are the pre-existing ones, verbatim: unprocessable audio (500)
    // and a take that trimmed down to nothing (422). They still fire BEFORE the
    // mastered PUT — the raw is already archived by this point, and the response
    // now carries its key so a refused take is recoverable.
    if (take.refused) {
      return res.status(take.refused.status).json(take.refused.body)
    }
    const processedBuffer = take.processedBuffer

    // Upload processed audio to S3 at the canon mastered/{UUID}.mp3 key.
    // S3 user metadata rides in HTTP headers with a 2KB total cap — long target
    // text and chunk maps percent-encode at ~6-9 bytes per non-Latin char and
    // would 400 the PUT. Supabase (recording_provenance) holds the truth; keep
    // only short identifiers on the object.
    const { text: _metaText, chunksString: _metaChunks, chunkBoundariesMs: _metaBounds, ...s3SafeMetadata } = metadata
    const result = await s3Service.uploadRecording(courseCode, audioId, processedBuffer, {
      ...s3SafeMetadata,
      recordedBy: 'human',
      via: 'recording',
      audioProcessing: audioMeta,
      // Pointer to this clip's untouched original (raw/{UUID}.{ext}). A short
      // key, never text — S3 caps TOTAL user metadata at 2KB. Null when the
      // archive write failed, so the object never claims an original it lacks.
      rawKey: rawKey || null
    }, { s3Key })

    // Regeneration mode: repoint the course_audio row at the fresh human take.
    // origin='human' marks it precious (allowed by the live CHECK: 'tts'|'human').
    // The old s3_key is recorded in recording_provenance below for reversibility.
    if (existingRow) {
      // VERSIONED. A retake replaces the bytes under an unchanged row id, and
      // the learner's address for that clip is <uuid>.v<audio_revision> — held
      // in the browser cache under `immutable` and in player-vue's IndexedDB
      // under the bare ref string. Repointing s3_key without bumping the
      // revision means the recordist hears their new take and every learner who
      // already played the old one never does. Same versioned swap the repair
      // panel and the reuse-first render use.
      const swap = await swapClipInPlace({
        supabase: supabaseClient.getClient(),
        audioId: uuid,
        newS3Key: s3Key,
        durationMs: (audioMeta.processed && audioMeta.durationMs) ? audioMeta.durationMs : null,
        fileSizeBytes: (audioMeta.processed && audioMeta.durationMs) ? processedBuffer.length : null,
        patch: { origin: 'human' },
        source: 'recordist-retake',
        acceptedBy: 'production-api /upload (recording)',
        reason: 'human retake replacing an existing clip',
      })
      logger.log(`[Upload] course_audio ${uuid} repointed ${existingRow.s3_key} -> ${s3Key} (origin=human, revision ${swap.previousRevision} -> ${swap.revision})`)
    }

    // Pod mode: register the human take (course_audio upsert, origin='human',
    // role per kind — recon §1) and re-point the sentence's audio FK explicitly
    // (recon §2: the autolink trigger never touches listening_pod_sentences).
    // Re-record = new/repointed row + re-point; the old take's row and S3
    // object are kept (replaced ids recorded in provenance below).
    let podResult = null
    if (isPodMode && podContext) {
      podResult = await podsRegistration.commitPodRegistration({
        supabase: supabaseClient.getClient(),
        courseCode,
        context: podContext,
        s3Key,
        durationMs: (audioMeta.processed && audioMeta.durationMs) ? audioMeta.durationMs : null,
        fileSizeBytes: processedBuffer.length,
        logger
      })
    }

    // Which voice this take belongs to, resolved SERVER-side from the course's
    // voice_config slot — the client's metadata.voiceId is advisory (used only
    // when the slot has no human voice assigned yet, e.g. recording ahead of
    // roster assignment). A slot still holding its TTS voice lends nothing:
    // see resolveTakeVoiceId.
    //
    // HOISTED (2026-08-19) out of the provenance block below, because script-mode
    // filing now needs it too and it must be resolved ONCE, from one place, so a
    // take's course_audio row and its provenance row can never name two different
    // voices. The course row is fetched here for the same reason: filing needs
    // its target_lang/known_lang, and one read serves both.
    let slotVoiceId = null
    let courseRow = null
    if (supabaseClient.isInitialized()) {
      try {
        const { data } = await supabaseClient.getClient()
          .from('courses').select('voice_config, target_lang, known_lang')
          .eq('course_code', courseCode).single()
        courseRow = data || null
      } catch (courseReadError) {
        logger.warn('[Recording] course row read failed:', courseReadError.message)
      }
    }
    if (isPodMode && podContext) {
      // Pod mode already resolved the cast voice server-side in prepare
      // (voice_config.podCast[speaker] / podCast.__explainer__).
      slotVoiceId = podContext.voiceId
    } else {
      const slotRole = metadata?.role || null
      if (slotRole) {
        const resolved = resolveTakeVoiceId({
          voiceConfig: courseRow?.voice_config || null,
          role: slotRole,
          clientVoiceId: metadata?.voiceId || null
        })
        slotVoiceId = resolved.voiceId
        if (resolved.warning) logger.warn(`[Recording] ${resolved.warning}`)
      }
      if (!slotVoiceId && metadata?.voiceId) slotVoiceId = metadata.voiceId
    }

    // SCRIPT MODE: file the take as a course_audio row so it can actually be
    // served. Until 2026-08-19 this branch did not exist — script takes got
    // bytes in S3 and a provenance row and nothing that could play them back,
    // which is why 50 takes recorded on 2026-08-19 have no clip and why the
    // review screen's play button was dead. See services/script-take-filing.cjs
    // for why the slow cadence is deliberately not filed.
    //
    // Filing NEVER fails the upload: the bytes are already safe at s3Key and
    // refusing here would throw away a take to report a database problem. The
    // verdict rides back in the response instead, and the recorder shows it.
    // Who recorded this take: the authenticated user's email when a session token
    // is presented, else the client-sent recorded_by. Clients send snake_case
    // provenance keys; the old camelCase-only gate meant recording_provenance was
    // NEVER written (live: 0 rows ever).
    //
    // Resolved BEFORE filing, not after: a re-record now files through the
    // versioned swap, whose history column accepted_by is NOT NULL — so the
    // identity has to exist by the time the take is filed, not merely by the
    // time provenance is written. Nothing between here and its old position
    // read `prov`, so this is a pure hoist.
    const prov = normalizeProvenance(provenance)
    let recordedBy = prov.recordedBy || metadata.recordedBy || 'human'
    const authToken = req.headers.authorization?.replace('Bearer ', '')
    if (authToken) {
      try {
        const sessionUser = (await verifySupabaseJWT(authToken)) || (await authValidateSession(authToken))
        if (sessionUser?.email) recordedBy = sessionUser.email
      } catch (authErr) {
        // Endpoint is not auth-gated — fall back to the client-sent identity
      }
    }

    let scriptFiling = null
    if (isScriptMode && supabaseClient.isInitialized()) {
      const plan = planScriptTakeFiling({ metadata, voiceId: slotVoiceId, course: courseRow })
      scriptFiling = await fileScriptTake({
        supabase: supabaseClient.getClient(),
        courseCode,
        plan,
        s3Key,
        durationMs: (audioMeta.processed && audioMeta.durationMs) ? audioMeta.durationMs : null,
        recordedBy,
        logger
      })
    } else if (isScriptMode) {
      scriptFiling = {
        filed: false,
        courseAudioId: null,
        reason: 'no_database',
        deliberate: false,
        message: 'This take was saved to storage but the database was unreachable, so it was not filed as a clip and will not play back. Tell whoever runs the course build — the recording itself is safe.'
      }
      logger.error(`[ScriptTake] FILING SKIPPED for ${courseCode}: Supabase not initialized — take ${s3Key} has no course_audio row`)
    }

    // Update the sample flag in Supabase to mark as recorded.
    // Regeneration mode only: script-mode takes have no sample_flags row (their
    // identity is server-minted) and the insert here used to 500 the upload AFTER
    // the S3 PUT succeeded. QA-state failures must never fail an uploaded take.
    // Pod-mode takes also skip — pod sentences have no sample_flags row.
    if (supabaseClient.isInitialized()) {
      if (!isScriptMode && !isPodMode) {
        try {
          await supabaseClient.updateRecordingStatus(
            uuid,
            courseCode,
            'needs_review',
            `Recorded by ${recordedBy} at ${new Date().toISOString()}`,
            recordedBy
          )
        } catch (flagError) {
          logger.error('Error updating recording status (upload kept):', flagError)
        }
      }

      // Register the take in recording_provenance — who/when plus the aligner-critical
      // context (course, seed/phrase identity, chunks_string pause map, replaced
      // s3_key). The live table has no dedicated columns for that context, so it
      // rides in quality_notes as JSON. Keyed by the take's fresh S3 uuid so every
      // re-record gets its own row. voice_id was resolved above (hoisted so
      // filing and provenance can never disagree about the voice).
      const provenanceContext = buildProvenanceContext({
        courseCode,
        isScriptMode,
        metadata,
        provenance: prov,
        s3Key,
        rawS3Key: rawKey,
        courseAudioId: isPodMode
          ? (podResult ? podResult.audioRow.id : null)
          // Script mode now HAS a course_audio row (natural cadence), so the
          // provenance row names it — the join from a take to its clip used to
          // be an honest null here only because the clip did not exist.
          : (isScriptMode ? (scriptFiling?.courseAudioId || null) : (existingRow ? uuid : null)),
        replacedS3Key: isPodMode
          ? (podResult ? podResult.replacedS3Key : null)
          : (existingRow ? existingRow.s3_key : null),
        voiceId: slotVoiceId,
        pod: (isPodMode && podContext) ? {
          podId: podContext.podId,
          sentenceId: podContext.sentenceId,
          kind: podContext.kind,
          replacedAudioId: podResult ? podResult.replacedAudioId : podContext.replacedAudioId
        } : null
      })
      try {
        await supabaseClient.insertRecordingProvenance({
          audioUuid: s3KeyUuid,
          recordedBy,
          speakerNativeLanguage: prov.speakerNativeLanguage,
          speakerProficiency: prov.speakerProficiency,
          speakerAgeRange: prov.speakerAgeRange,
          speakerDialect: prov.speakerDialect,
          speakerRegion: prov.speakerRegion,
          recordedAt: prov.recordedAt || new Date().toISOString(),
          recordingLocation: prov.recordingLocation,
          recordingDevice: prov.recordingDevice,
          recordingEnvironment: prov.recordingEnvironment,
          speakerConsent: prov.speakerConsent !== undefined ? prov.speakerConsent : true,
          consentFormRef: prov.consentFormRef,
          usageRights: prov.usageRights,
          qualityNotes: JSON.stringify(provenanceContext),
          retakeCount: prov.retakeCount || 0
        })
        logger.log(`Provenance recorded for ${s3KeyUuid} (${provenanceContext.mode} mode)`)

        // A redo must actually retire what it replaced. Mark every earlier take
        // of this same line/cadence/voice as superseded by this one, so the take
        // the recordist rejected can never be selected again — regardless of
        // what their phone thought the time was. NOTHING IS DELETED: the
        // superseded takes keep their rows and their S3 objects.
        //
        // Best-effort on purpose. A take whose bytes are safely stored is worth
        // more than a tidy supersede ledger, so this never fails the upload; if
        // it does not manage to mark, the reader falls back to recency exactly
        // as before.
        try {
          const sup = await takeSupersede.supersedeEarlierTakes(supabaseClient.getClient(), {
            courseCode,
            text: metadata.text || null,
            cadence: metadata.cadence || null,
            voiceId: slotVoiceId,
            role: metadata.role || null,
            audioUuid: s3KeyUuid
          })
          if (sup.superseded.length) {
            logger.log(`Superseded ${sup.superseded.length} earlier take(s) of this line by ${s3KeyUuid} (bytes kept)`)
          }
          if (sup.error) logger.error('Superseding earlier takes failed (upload kept):', sup.error)
        } catch (supersedeError) {
          logger.error('Superseding earlier takes threw (upload kept):', supersedeError)
        }
      } catch (provenanceError) {
        // Log error but don't fail the upload
        logger.error('Error inserting provenance metadata:', provenanceError)
        logger.error('Upload succeeded but provenance recording failed')
      }
    }

    // Pod mode: the take's canonical identity is the course_audio row the
    // sentence FK now points at (clients carry this, not the minted s3 uuid).
    // Script mode: the course_audio row's id when the take was filed, so the
    // review screen's play button resolves through /api/production/audio/:uuid
    // /stream like every other clip in the estate. A take that was NOT filed
    // (the slow cadence, or a filing failure) falls back to the minted take
    // uuid, which that route resolves through recording_provenance — so the
    // recordist can always hear what they just recorded, filed or not.
    const responseUuid = (isPodMode && podResult)
      ? podResult.audioRow.id
      : (isScriptMode && scriptFiling?.courseAudioId) ? scriptFiling.courseAudioId : audioId

    // Emit recording_completed event
    io.to(`course:${courseCode}`).emit('recording_completed', {
      courseCode,
      uuid: responseUuid,
      metadata: {
        recordedAt: prov.recordedAt || new Date().toISOString(),
        recordedBy,
        via: 'recording',
        ...metadata
      }
    })

    res.json({
      success: true,
      // Script mode: the server-minted identity — clients must carry this, not script-N
      // Pod mode: the course_audio row id now linked on the pod sentence
      uuid: responseUuid,
      // SCRIPT MODE ONLY. Whether this take became a clip, and if not, why —
      // in words a recordist can act on. The recorder shows this; a `filed:
      // false` with `deliberate: false` is a warning they must not be able to
      // miss. Absent on pod/regeneration uploads, which have always filed.
      ...(scriptFiling ? { filing: scriptFiling } : {}),
      ...(isPodMode && podResult ? {
        pod: {
          podId: podContext.podId,
          sentenceId: podContext.sentenceId,
          kind: podContext.kind,
          audioId: podResult.audioRow.id,
          replacedAudioId: podResult.replacedAudioId,
          voiceId: podContext.voiceId
        }
      } : {}),
      s3Key: s3Key || null,
      rawKey: rawKey || null,
      uploaded: true,
      audioProcessing: audioMeta.processed ? {
        durationMs: audioMeta.durationMs,
        format: audioMeta.format,
        sizeReduction: audioMeta.inputSize - audioMeta.outputSize
      } : null
    })
  } catch (error) {
    logger.error('Error uploading recording:', error)
    res.status(500).json({ error: error.message })
  }
}

app.post('/api/production/:courseCode/recording/upload', handleRecordingUpload)

// Helper function to proxy requests to Phase 8 Audio Generator (port 3465)
async function proxyToPhase8(method, path, body = null) {
  const http = require('http')

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3465,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, data: parsed })
        } catch (error) {
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

// NOTE: Audio Pipeline routes are defined at the bottom of this file (lines ~940+)
// They use axios with proper response transformation for the frontend

// Recording Queue: Get recording queue
// GET /api/production/:courseCode/recording/queue
app.get('/api/production/:courseCode/recording/queue', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { page = 1, pageSize = 20 } = req.query

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`Getting recording queue for ${courseCode}`)

    const result = await supabaseClient.getRecordingQueue(
      courseCode,
      parseInt(page),
      parseInt(pageSize)
    )

    res.json(result)
  } catch (error) {
    logger.error('Error getting recording queue:', error)
    res.status(500).json({ error: error.message })
  }
})

// Recording: Claim a sample for recording
// POST /api/production/:courseCode/recording/claim
// Body: { uuid, claimedBy }
app.post('/api/production/:courseCode/recording/claim', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuid, claimedBy } = req.body

    if (!uuid) {
      return res.status(400).json({ error: 'uuid is required' })
    }
    if (!claimedBy) {
      return res.status(400).json({ error: 'claimedBy is required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`${claimedBy} claiming sample ${uuid} for recording in ${courseCode}`)

    // Update status from 'flagged_human_needed' to 'in_recording'
    const updated = await supabaseClient.updateRecordingStatus(
      uuid,
      courseCode,
      'in_recording',
      `Claimed by ${claimedBy}`,
      claimedBy
    )

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('recording_claimed', {
      courseCode,
      uuid,
      claimedBy,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      sample: updated
    })
  } catch (error) {
    logger.error('Error claiming recording:', error)

    // Handle invalid transition
    if (error.message.includes('Invalid transition')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message })
  }
})

// Recording: Release a claimed sample
// POST /api/production/:courseCode/recording/release
// Body: { uuid, releasedBy }
app.post('/api/production/:courseCode/recording/release', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuid, releasedBy } = req.body

    if (!uuid) {
      return res.status(400).json({ error: 'uuid is required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`${releasedBy || 'User'} releasing sample ${uuid} in ${courseCode}`)

    // Update status from 'in_recording' back to 'flagged_human_needed'
    const updated = await supabaseClient.updateRecordingStatus(
      uuid,
      courseCode,
      'flagged_human_needed',
      `Released by ${releasedBy || 'User'}`,
      releasedBy
    )

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('recording_released', {
      courseCode,
      uuid,
      releasedBy,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      sample: updated
    })
  } catch (error) {
    logger.error('Error releasing recording:', error)

    if (error.message.includes('Invalid transition')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// REGENERATION ENDPOINTS
// =============================================================================

// Regeneration Queue: Get samples needing regeneration
// GET /api/production/:courseCode/regeneration/queue
app.get('/api/production/:courseCode/regeneration/queue', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Get flagged samples from audio_flags table (new simplified system)
    const flaggedSamples = await supabaseClient.getAudioFlagsWithDetails(courseCode)

    // Transform to match expected format
    const items = flaggedSamples.map(flag => ({
      uuid: flag.audio_uuid,
      status: flag.status,
      notes: flag.reason,
      flaggedBy: flag.flagged_by,
      flaggedAt: flag.created_at,
      regenCount: flag.regen_count || 0,
      audio: flag.audio
    }))

    // Group by role for UI display
    const byRole = { known: 0, target1: 0, target2: 0 }
    for (const item of items) {
      if (item.audio?.role && byRole[item.audio.role] !== undefined) {
        byRole[item.audio.role]++
      }
    }

    res.json({
      items,
      total: items.length,
      byRole
    })
  } catch (error) {
    logger.error('Error fetching regeneration queue:', error)
    res.status(500).json({ error: error.message })
  }
})

// Regeneration: Trigger regeneration for specific samples
// POST /api/production/:courseCode/regeneration/trigger
app.post('/api/production/:courseCode/regeneration/trigger', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { uuids } = req.body

    if (!Array.isArray(uuids) || uuids.length === 0) {
      return res.status(400).json({ error: 'uuids array required' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`Triggering regeneration for ${uuids.length} samples in ${courseCode}`)

    // Update status to 'in_pipeline'
    await supabaseClient.bulkUpdateFlagStatus(
      uuids,
      courseCode,
      'in_pipeline',
      'Regeneration triggered'
    )

    // Get sample details for regeneration
    const samples = []
    for (const uuid of uuids) {
      const sample = await supabaseClient.getCourseAudio(uuid)
      if (sample) {
        samples.push(sample)
      }
    }

    // Call Phase 8 to generate audio for these specific UUIDs
    // Note: Phase 8's /generate endpoint generates MISSING audio, not regenerates
    // For UUID-based regeneration, we need to use the direct TTS approach
    // For now, proxy to generate endpoint with courseCode in path
    const response = await proxyToPhase8('POST', `/generate/${courseCode}`, {
      dryRun: false,
      limit: uuids.length
    })

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('regeneration_started', {
      courseCode,
      uuids,
      count: uuids.length,
      timestamp: new Date().toISOString()
    })

    // Update status based on Phase 8 response
    if (response.status === 200) {
      // Mark flags as complete after successful regeneration
      await supabaseClient.bulkUpdateFlagStatus(
        uuids,
        courseCode,
        'complete',
        'Regeneration completed'
      )
      res.json({
        success: true,
        count: uuids.length,
        jobId: response.data.jobId
      })
    } else {
      // If Phase 8 failed, update status back to flagged
      await supabaseClient.bulkUpdateFlagStatus(
        uuids,
        courseCode,
        'flagged_regen_tts',
        `Regeneration failed: ${response.data.error || 'Unknown error'}`
      )
      res.status(response.status).json(response.data)
    }
  } catch (error) {
    logger.error('Error triggering regeneration:', error)
    res.status(500).json({ error: error.message })
  }
})

// Regeneration: Trigger regeneration for ALL flagged samples
// POST /api/production/:courseCode/regeneration/trigger-all
app.post('/api/production/:courseCode/regeneration/trigger-all', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`Triggering regeneration for ALL flagged samples in ${courseCode}`)

    // Get all flagged samples (using new audio_flags system)
    const flaggedSamples = await supabaseClient.getAudioFlagsWithDetails(courseCode)

    if (flaggedSamples.length === 0) {
      return res.json({
        success: true,
        count: 0,
        message: 'No samples flagged for regeneration'
      })
    }

    // Group by role for regeneration
    const byRole = {}
    for (const flag of flaggedSamples) {
      const role = flag.audio?.role || 'unknown'
      if (!byRole[role]) byRole[role] = []
      byRole[role].push(flag.audio_uuid)
    }

    const uuids = flaggedSamples.map(flag => flag.audio_uuid)

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('regeneration_started', {
      courseCode,
      uuids,
      count: uuids.length,
      byRole: Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, v.length])),
      timestamp: new Date().toISOString()
    })

    // Call Phase 8 to regenerate each role with flaggedOnly=true
    // Process roles in parallel for efficiency
    const roleResults = await Promise.all(
      Object.keys(byRole)
        .filter(role => ['known', 'target1', 'target2', 'presentation'].includes(role))
        .map(async (role) => {
          try {
            const response = await proxyToPhase8('POST', `/regenerate-role/${courseCode}`, {
              role,
              dryRun: false,
              flaggedOnly: true,
              limit: byRole[role].length
            })
            return { role, success: response.status === 200, data: response.data }
          } catch (err) {
            return { role, success: false, error: err.message }
          }
        })
    )

    // Check results
    const allSuccess = roleResults.every(r => r.success)
    const totalProcessed = roleResults.reduce((sum, r) => sum + (r.data?.success || 0), 0)
    const totalFailed = roleResults.reduce((sum, r) => sum + (r.data?.failed || 0), 0)

    // Aggregate regeneratedItems from all roles for inline preview
    const allRegeneratedItems = roleResults.flatMap(r => r.data?.regeneratedItems || [])

    // NOTE: Don't auto-resolve flags here - let user review and mark done manually
    // Flags stay at 'flagged' until user clicks "Done" after reviewing audio

    if (allSuccess) {
      res.json({
        success: true,
        count: uuids.length,
        processed: totalProcessed,
        failed: totalFailed,
        regeneratedItems: allRegeneratedItems,
        byRole: roleResults.map(r => ({ role: r.role, ...r.data }))
      })
    } else {
      // Some roles failed
      res.json({
        success: false,
        partial: true,
        count: uuids.length,
        processed: totalProcessed,
        failed: totalFailed,
        regeneratedItems: allRegeneratedItems,
        byRole: roleResults.map(r => ({ role: r.role, success: r.success, ...r.data, error: r.error }))
      })
    }
  } catch (error) {
    logger.error('Error triggering bulk regeneration:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// ROLE-BASED REGENERATION ENDPOINTS
// =============================================================================

// GET /api/audio/status - Get audio generation status (proxies to Phase 8)
app.get('/api/audio/status', async (req, res) => {
  try {
    const response = await proxyToPhase8('GET', '/status')
    res.status(response.status).json(response.data)
  } catch (error) {
    // If Phase 8 is not running, return inactive status
    res.json({ active: false, error: 'Audio server not running' })
  }
})

// Regenerate audio by role (known, target1, target2)
// POST /api/audio/regenerate-role/:courseCode
// Body: { role, dryRun, flaggedOnly, limit }
app.post('/api/audio/regenerate-role/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { role, dryRun = true, flaggedOnly = false, limit } = req.body

    if (!role || !['known', 'target1', 'target2', 'presentation'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be known, target1, target2, or presentation' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    logger.log(`[Regenerate Role] ${dryRun ? 'Preview' : 'Execute'} ${role} for ${courseCode}, flaggedOnly=${flaggedOnly}`)

    // Get course voice config
    const course = await supabaseClient.getCourse(courseCode)
    if (!course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` })
    }

    const voiceConfig = course.voice_config || {}
    const voiceId = voiceConfig.voices?.[role]?.voiceId || voiceConfig[role] || voiceConfig.default || 'unknown'
    const language = role === 'known' ? course.known_lang : course.target_lang

    // Query audio samples by role
    let audioQuery = supabaseClient.getClient()
      .from('course_audio')
      .select('id, text, text_normalized, language, role, voice_id, duration_ms')
      .eq('course_code', courseCode)
      .eq('role', role)

    // Apply limit only if explicitly provided
    if (limit) {
      audioQuery = audioQuery.limit(limit)
    }

    const { data: audioSamples, error: audioError } = await audioQuery

    if (audioError) {
      logger.error('Error fetching audio samples:', audioError)
      return res.status(500).json({ error: audioError.message })
    }

    let samplesToRegenerate = audioSamples || []

    // If flaggedOnly, start from flagged UUIDs and filter audio by those
    // (Reversed from previous approach which hit 414 URI Too Large with large audio tables)
    if (flaggedOnly) {
      const { data: flags } = await supabaseClient.getClient()
        .from('audio_flags')
        .select('audio_uuid')
        .eq('course_code', courseCode)
        .eq('status', 'flagged')

      const flaggedUuids = new Set((flags || []).map(f => f.audio_uuid))
      samplesToRegenerate = samplesToRegenerate.filter(s => flaggedUuids.has(s.id))
    }

    // For dry run, just return preview
    if (dryRun) {
      return res.json({
        dryRun: true,
        count: samplesToRegenerate.length,
        voiceId,
        language,
        sample: samplesToRegenerate[0] || null
      })
    }

    // Execute regeneration
    if (samplesToRegenerate.length === 0) {
      return res.json({
        dryRun: false,
        total: 0,
        success: 0,
        failed: 0,
        voiceId,
        language,
        regeneratedItems: [],
        message: 'No samples to regenerate'
      })
    }

    const uuids = samplesToRegenerate.map(s => s.id)

    // Emit WebSocket event
    io.to(`course:${courseCode}`).emit('regeneration_started', {
      courseCode,
      uuids,
      role,
      count: uuids.length,
      timestamp: new Date().toISOString()
    })

    // Return 202 immediately — regeneration runs in background
    // Frontend polls GET /api/audio/status for progress
    res.status(202).json({
      accepted: true,
      dryRun: false,
      total: uuids.length,
      voiceId,
      language,
      role,
      message: `Regeneration of ${uuids.length} ${role} samples started in background. Monitor progress via audio status.`
    })

    // Run phase8 regeneration in background
    ;(async () => {
      try {
        const response = await proxyToPhase8('POST', `/regenerate-role/${courseCode}`, {
          role,
          dryRun: false,
          flaggedOnly,
          ...(limit ? { limit } : {})
        })

        if (response.status === 200) {
          logger.log(`[Regenerate Role] Completed ${role} for ${courseCode}: ${response.data.success || uuids.length} success, ${response.data.failed || 0} failed`)

          // Clear flags for regenerated audio
          if (flaggedOnly && uuids.length > 0) {
            try {
              const { error: delErr, count } = await supabaseClient.getClient()
                .from('audio_flags')
                .delete({ count: 'exact' })
                .eq('course_code', courseCode)
                .eq('status', 'flagged')
                .in('audio_uuid', uuids)
              if (delErr) logger.warn(`[Regenerate Role] Failed to clear flags: ${delErr.message}`)
              else logger.log(`[Regenerate Role] Cleared ${count} flags for regenerated ${role} audio`)
            } catch (e) {
              logger.warn(`[Regenerate Role] Error clearing flags: ${e.message}`)
            }
          }

          io.to(`course:${courseCode}`).emit('regeneration_completed', {
            courseCode,
            role,
            total: uuids.length,
            success: response.data.success || uuids.length,
            failed: response.data.failed || 0
          })
        } else {
          logger.error(`[Regenerate Role] Failed ${role} for ${courseCode}: ${response.data.error || 'Unknown error'}`)
          io.to(`course:${courseCode}`).emit('regeneration_error', {
            courseCode,
            role,
            error: response.data.error || 'Regeneration failed'
          })
        }
      } catch (error) {
        logger.error(`[Regenerate Role] Background error for ${courseCode}/${role}:`, error.message)
        io.to(`course:${courseCode}`).emit('regeneration_error', {
          courseCode,
          role,
          error: error.message
        })
      }
    })()
  } catch (error) {
    logger.error('Error in regenerate-role:', error)
    res.status(500).json({ error: error.message })
  }
})

// Regenerate a single audio file by UUID (inline from journey view)
// POST /api/audio/regenerate-single/:courseCode/:audioUuid
app.post('/api/audio/regenerate-single/:courseCode/:audioUuid', async (req, res) => {
  try {
    const { courseCode, audioUuid } = req.params
    logger.log(`[Regenerate Single] ${courseCode} / ${audioUuid}`)
    const response = await proxyToPhase8('POST', `/regenerate-single/${courseCode}/${audioUuid}`)
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Regenerate single proxy error:', error)
    res.status(500).json({ error: error.message || 'Phase 8 audio server not reachable' })
  }
})

// Surgical per-LEGO presentation edit + regen (single intro clip)
// POST /api/audio/regenerate-presentation/:courseCode/:legoId
// Body: { text? } — if provided, persists new presentation text to course_audio
// (the authoritative store for intro audio) then regenerates ONLY this lego's
// presentation clip. No-op for every other row. Proxies to phase8.
app.post('/api/audio/regenerate-presentation/:courseCode/:legoId', async (req, res) => {
  try {
    const { courseCode, legoId } = req.params
    logger.log(`[Regenerate Presentation] ${courseCode} / ${legoId}`)
    const response = await proxyToPhase8('POST', `/regenerate-presentation/${courseCode}/${legoId}`, req.body || {})
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Regenerate presentation proxy error:', error)
    res.status(500).json({ error: error.message || 'Phase 8 audio server not reachable' })
  }
})

// Surgical per-PHRASE text edit + role-scoped regen (component_practice/build/use rows)
// POST /api/audio/regenerate-phrase/:courseCode/:phraseId
// Body: { known_text?, target_text?, roles: ["known"|"target1"|"target2", ...] }
// TTSes the NEW text (never re-reads stale course_audio.text — the desync trap),
// persists course_practice_phrases text + course_audio.text, mints a fresh UUID/S3 key
// per regenerated role, rebinds the phrase pointer, returns fresh *_audio_id + durations.
// Auto-approve (no accept step); old S3 objects survive. Admin-only — it costs TTS (D3).
app.post('/api/audio/regenerate-phrase/:courseCode/:phraseId', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  try {
    const { courseCode, phraseId } = req.params
    logger.log(`[Regenerate Phrase] ${courseCode} / ${phraseId}`)
    const response = await proxyToPhase8('POST', `/regenerate-phrase/${courseCode}/${phraseId}`, req.body || {})
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Regenerate phrase proxy error:', error)
    res.status(500).json({ error: error.message || 'Phase 8 audio server not reachable' })
  }
})

// Surgical per-LEGO AUDIO regen — LEGO TEXT IS LOCKED (never written)
// POST /api/audio/regenerate-lego/:courseCode/:legoId
// Body: { roles: ["known"|"target1"|"target2", ...], tts_known_text?, tts_target_text? }
// tts_* is the SPOKEN text only (e.g. "mit dir." to test trailing punctuation on the
// voice); course_legos.known_text/target_text are NEVER touched, so no BUILD-phrase
// cascade. Mints a fresh UUID/S3 key per role, rebinds only this LEGO's *_audio_id.
// Admin-only — it costs TTS (same posture as regenerate-phrase).
app.post('/api/audio/regenerate-lego/:courseCode/:legoId', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  try {
    const { courseCode, legoId } = req.params
    logger.log(`[Regenerate Lego] ${courseCode} / ${legoId}`)
    const response = await proxyToPhase8('POST', `/regenerate-lego/${courseCode}/${legoId}`, req.body || {})
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Regenerate lego proxy error:', error)
    res.status(500).json({ error: error.message || 'Phase 8 audio server not reachable' })
  }
})

// Regenerate presentation audio
// POST /api/audio/regenerate-presentations/:courseCode
// Body: { dryRun, regenerateAudio }
// This endpoint generates presentation TEXT for all LEGOs (e.g., "The Chinese for 'hello' is:")
// It proxies to phase8's /regenerate-presentations which handles the actual logic
app.post('/api/audio/regenerate-presentations/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { dryRun = true, regenerateAudio = false } = req.body

    logger.log(`[Regenerate Presentations] ${dryRun ? 'Preview' : 'Execute'} for ${courseCode}`)

    // Proxy to phase8's /regenerate-presentations endpoint which:
    // 1. Gets all LEGOs for the course
    // 2. Generates presentation text using template
    // 3. Upserts to course_audio
    // 4. Updates lego_introductions and course_legos.presentation_audio_id
    const response = await proxyToPhase8('POST', `/regenerate-presentations/${courseCode}`, {
      dryRun,
      regenerateAudio
    })

    if (!dryRun && response.status === 200) {
      io.to(`course:${courseCode}`).emit('presentations_generated', {
        courseCode,
        count: response.data.total || response.data.count || 0,
        timestamp: new Date().toISOString()
      })
    }

    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Error in regenerate-presentations:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/audio/link-presentation-audio/:courseCode
// Fix presentation audio linking for a course
app.post('/api/audio/link-presentation-audio/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const response = await proxyToPhase8('POST', `/link-presentation-audio/${courseCode}`)
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Error linking presentation audio:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// REUSE-FIRST REGENERATION — /api/audio/reuse-*
// =============================================================================
// Thin passthroughs to Phase 8 (port 3465). The rule these serve: before any
// TTS spend, set aside every clip the first N rounds need, ask "does this
// voice x text x language already exist?", relink what does, and render only
// what is genuinely missing. Phase 8 owns all the logic — these routes add
// nothing but transport, so the UI reads Phase 8's shape directly.

// GET /api/audio/reuse-plan/:courseCode?rounds=10
// Read-only. Generates nothing, writes nothing, costs nothing.
app.get('/api/audio/reuse-plan/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const rounds = req.query.rounds ? Number(req.query.rounds) : 10
    const response = await proxyToPhase8('GET', `/reuse-plan/${courseCode}?rounds=${encodeURIComponent(rounds)}`)
    logger.info(`[Reuse plan] ${courseCode} rounds=${rounds}: ${response.status}`)
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Reuse plan proxy error:', error?.message || error)
    res.status(500).json({ error: error.message || 'Phase 8 audio server not reachable' })
  }
})

// GET /api/audio/reuse-coverage/:courseCode?rounds=10
// Read-only. Measures, for every candidate voice, how much of what this course
// needs already exists in the estate — the lookup key is voice x text x
// language and nothing else, so a clip recorded as target2 in another course
// counts for the known side here. Generates nothing; the coverage table is the
// evidence for a voice choice, not a step in making one.
app.get('/api/audio/reuse-coverage/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const rounds = req.query.rounds ? Number(req.query.rounds) : 10
    const response = await proxyToPhase8('GET', `/reuse-coverage/${courseCode}?rounds=${encodeURIComponent(rounds)}`)
    logger.info(`[Reuse coverage] ${courseCode} rounds=${rounds}: ${response.status}`)
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Reuse coverage proxy error:', error?.message || error)
    res.status(500).json({ error: error.message || 'Phase 8 audio server not reachable' })
  }
})

// POST /api/audio/reuse-apply/:courseCode
// Body: { rounds, dryRun, confirm }. dryRun:false SPENDS MONEY on TTS, so it
// is admin-only and Phase 8 additionally requires confirm === courseCode.
// Returns 202 + { runId } for real runs; progress comes from GET /api/audio/status.
app.post('/api/audio/reuse-apply/:courseCode', async (req, res) => {
  const dryRun = req.body?.dryRun !== false
  if (!dryRun && !await requireAdmin(req, res)) return
  try {
    const { courseCode } = req.params
    logger.log(`[Reuse apply] ${dryRun ? 'Dry run' : 'LIVE'} for ${courseCode} (rounds=${req.body?.rounds})`)
    const response = await proxyToPhase8('POST', `/reuse-apply/${courseCode}`, req.body || {})
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Reuse apply proxy error:', error?.message || error)
    res.status(500).json({ error: error.message || 'Phase 8 audio server not reachable' })
  }
})

// GET /api/audio/reuse-run/:runId — the outcome of a finished reuse-first run.
app.get('/api/audio/reuse-run/:runId', async (req, res) => {
  try {
    const { runId } = req.params
    const response = await proxyToPhase8('GET', `/reuse-run/${runId}`)
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Reuse run proxy error:', error?.message || error)
    res.status(500).json({ error: error.message || 'Phase 8 audio server not reachable' })
  }
})

// =============================================================================
// NON-DESTRUCTIVE AUDIO REPAIR — /api/audio/repair/*
// =============================================================================
// propose / preview / accept / reject, uniform across every clip kind
// including role='presentation'. Accept is a SAME-ID in-place swap, so no row
// is deleted and no CASCADE can fire — which is why introductions have a
// repair path at all now. Read services/audio-repair-core.cjs for the design.
// Mounted rather than inlined: this file is large and edited concurrently.
require('./api/audio-repair-routes.cjs').mount(app, { requireAdmin, requireDashboardUser, logger })

// =============================================================================
// VOICELAB — /api/voicelab/*
// =============================================================================
// A bench for voices and gate thresholds: parameters, runs, and every run kept as
// an experiment. Reads are open to dashboard users; POST /runs and /rerun are
// admin-only because they are the calls that spend money. It writes no course_audio
// and no algorithm_config — /export hands a config back for a human to apply.
require('./voicelab/router.cjs').mount(app, { requireAdmin, requireDashboardUser, logger })

// =============================================================================
// TAIL-TRUNCATION SCAN — /api/audio/tail-scan/*
// =============================================================================
// A whole-course tail scan is one S3 GET plus one ffmpeg decode per clip, so it
// is a JOB (start / poll / read the report), never a synchronous request. Every
// route is a read: no TTS, no writes, nothing on the learner path. Job state is
// in-process and does not survive a restart — see services/audio-tail-scan.cjs.
// getDb because /raise-flags writes its findings through the QA gate, which owns
// audio_clip_flags — the same client the gate surface above is mounted with.
require('./api/audio-tail-scan-routes.cjs').mount(app, {
  requireDashboardUser, getDb: () => supabaseClient.getClient(), logger,
})

// =============================================================================
// VOICE MANAGEMENT ENDPOINTS
// =============================================================================

// List all voices with optional filters
// GET /api/production/voices?type=human&language=spa&active=true
app.get('/api/production/voices', async (req, res) => {
  try {
    const { type, language, active } = req.query

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const filters = {}
    if (type) filters.type = type
    if (language) filters.language = language
    if (active !== undefined) filters.isActive = active === 'true'

    const voices = await supabaseClient.listVoices(filters)

    res.json({
      success: true,
      count: voices.length,
      voices
    })
  } catch (error) {
    logger.error('Error listing voices:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get voice details by ID
// GET /api/production/voices/:voiceId
app.get('/api/production/voices/:voiceId', async (req, res) => {
  try {
    const { voiceId } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const voice = await supabaseClient.getVoice(voiceId)

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' })
    }

    res.json({
      success: true,
      voice
    })
  } catch (error) {
    logger.error('Error getting voice:', error)
    res.status(500).json({ error: error.message })
  }
})

// Register a new human voice
// POST /api/production/voices/register-human
// Body: { voiceId, humanName, humanEmail, languages, metadata }
app.post('/api/production/voices/register-human', async (req, res) => {
  try {
    // No :courseCode here, so the course-scope param gate never fires — gate
    // explicitly: the human-voice registry anchors recording provenance and
    // must not be writable anonymously.
    const authedUser = await requireDashboardUser(req, res)
    if (!authedUser) return

    const { voiceId, humanName, humanEmail, languages, metadata } = req.body

    // Validation
    if (!voiceId) {
      return res.status(400).json({ error: 'voiceId is required' })
    }
    if (!humanName) {
      return res.status(400).json({ error: 'humanName is required' })
    }
    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({ error: 'languages array must have at least one entry' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Register the voice
    const voice = await supabaseClient.registerHumanVoice({
      voiceId,
      humanName,
      humanEmail,
      languages,
      metadata
    })

    logger.log(`Registered human voice: ${voiceId} (${humanName})`)

    res.status(201).json({
      success: true,
      voice
    })
  } catch (error) {
    logger.error('Error registering human voice:', error)

    // Handle duplicate voice error
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message })
    }

    // Handle validation errors
    if (error.message.includes('must start with') ||
        error.message.includes('is required') ||
        error.message.includes('must have at least')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message })
  }
})

// Update voice status (activate/deactivate)
// PATCH /api/production/voices/:voiceId/status
// Body: { isActive: boolean }
app.patch('/api/production/voices/:voiceId/status', async (req, res) => {
  try {
    const { voiceId } = req.params
    const { isActive } = req.body

    // Validation
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' })
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Update status
    const voice = await supabaseClient.updateVoiceStatus(voiceId, isActive)

    logger.log(`Updated voice ${voiceId} status to: ${isActive ? 'active' : 'inactive'}`)

    res.json({
      success: true,
      voice
    })
  } catch (error) {
    logger.error('Error updating voice status:', error)

    // Handle not found error
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Voice not found' })
    }

    res.status(500).json({ error: error.message })
  }
})

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.log(`Client connected: ${socket.id}`)

  socket.on('join_course', ({ courseCode }) => {
    socket.join(`course:${courseCode}`)
    logger.log(`${socket.id} joined course:${courseCode}`)
  })

  socket.on('leave_course', ({ courseCode }) => {
    socket.leave(`course:${courseCode}`)
    logger.log(`${socket.id} left course:${courseCode}`)
  })

  socket.on('disconnect', () => {
    logger.log(`Client disconnected: ${socket.id}`)
  })
})

// Emit helper for external use (e.g., from audio pipeline)
function emitToRoom(courseCode, event, data) {
  io.to(`course:${courseCode}`).emit(event, data)
}

// Internal emit endpoint - for phase servers to emit WebSocket events
// POST /api/production/internal/emit
app.post('/api/production/internal/emit', (req, res) => {
  const { courseCode, event, data } = req.body

  if (!courseCode || !event) {
    return res.status(400).json({ error: 'courseCode and event required' })
  }

  emitToRoom(courseCode, event, { courseCode, ...data })
  logger.log(`Emitted ${event} to course:${courseCode}`)

  res.json({ success: true, event, courseCode })
})

// =============================================================================
// AUDIO PIPELINE ROUTES - Proxy to Phase 8 service on port 3465
// =============================================================================

const PHASE8_URL = process.env.PHASE8_URL || 'http://localhost:3465'
const axios = require('axios')

// NOTE: Dead duplicate audio-stats route removed — the fast endpoint at line ~2214
// handles /api/production/:courseCode/audio-stats directly without needing Phase 8

// GET /api/production/:courseCode/audio-pipeline/plan
// Get generation plan with cost estimates
// Uses fast Supabase query (cached). Phase 8 is only needed for actual generation.
app.get('/api/production/:courseCode/audio-pipeline/plan', async (req, res) => {
  const { courseCode } = req.params
  try {
    const stats = await getDirectAudioStats(courseCode)
    const estimatedCostUSD = (stats.missing * 0.004).toFixed(2)

    // Fetch Phase 8's actual generation plan (deduped unique clips to generate)
    // This is the slow call (~3s) so it only runs when user explicitly requests plan
    let generationPlan = null
    try {
      const planRes = await axios.get(`${PHASE8_URL}/plan/${courseCode}`, { timeout: 30000 })
      generationPlan = {
        missing: planRes.data.missing,
        total: planRes.data.total,
        existing: planRes.data.existing,
        breakdown: planRes.data.breakdown
      }
    } catch (e) {
      // Phase 8 may not be running
    }

    const costSource = generationPlan ? generationPlan.missing : stats.missing
    return res.json({
      success: true,
      estimatedCost: `$${(costSource * 0.004).toFixed(2)}`,
      estimatedTime: `${Math.ceil(costSource / 60)} min`,
      total: stats.total,
      existing: stats.existing,
      missing: stats.missing,
      generationPlan,
      phraseNeeds: stats.totalPhrases,
      introNeeds: stats.totalNewLegos,
      breakdown: [
        { role: 'known', count: stats.breakdown.known },
        { role: 'target1', count: stats.breakdown.target1 },
        { role: 'target2', count: stats.breakdown.target2 },
        { role: 'introduction', count: stats.breakdown.presentation }
      ],
      assembly: null,
      voices: {},
      dataSource: 'database'
    })
  } catch (error) {
    logger.error(`Audio plan error for ${courseCode}:`, error.message)
    return res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/start
// Start audio generation
app.post('/api/production/:courseCode/audio-pipeline/start', async (req, res) => {
  if (!await requireDashboardUser(req, res)) return
  const { courseCode } = req.params
  const { options } = req.body
  try {
    invalidateAudioStatsCache(courseCode)
    const response = await axios.post(`${PHASE8_URL}/generate/${courseCode}`, options || {}, {
      timeout: 3600000 // 1 hour - audio generation can take a very long time for large courses
    })
    // After generation, trigger linking so audio IDs get set on content rows
    let linkResult = null
    try {
      const linkResponse = await axios.post(`${PHASE8_URL}/link-audio-ids/${courseCode}`, {}, {
        timeout: 600000 // 10 min for linking
      })
      linkResult = linkResponse.data
    } catch (linkErr) {
      logger.warn(`Audio linking after generation failed for ${courseCode}: ${linkErr.message}`)
    }
    invalidateAudioStatsCache(courseCode)
    const result = response.data
    if (linkResult) result.linkResult = linkResult
    res.json(result)
  } catch (error) {
    logger.error(`Audio start error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// GET /api/audio/health — proxy phase 8's own /health, which carries
// tail_repair_mode. Without this, the only way to learn whether a machine's
// render service still mutates audio is a shell on that machine — which is
// exactly what we do not have for the Camberley Mac. Port 3470 is the single
// public door, so the answer has to come through it.
app.get('/api/audio/health', async (req, res) => {
  try {
    const response = await axios.get(`${PHASE8_URL}/health`, { timeout: 8000 })
    res.json(response.data)
  } catch (e) {
    res.status(503).json({ status: 'unreachable', service: 'phase8-audio-v13', error: e.message })
  }
})

// GET /api/production/:courseCode/audio-pipeline/status
// Get generation status
app.get('/api/production/:courseCode/audio-pipeline/status', async (req, res) => {
  const { courseCode } = req.params
  try {
    // Phase8 /status returns global state (no courseCode in URL)
    const response = await axios.get(`${PHASE8_URL}/status`)
    const status = response.data

    // Check if the active job is for the requested course
    if (status.active && status.courseCode !== courseCode) {
      // Job is for a different course
      return res.json({ success: true, job: null, message: 'No active job for this course' })
    }

    // Wrap in job object for frontend compatibility
    if (status.active) {
      res.json({
        success: true,
        job: {
          status: 'running',
          courseCode: status.courseCode,
          operation: status.operation,
          progress: {
            current: status.current,
            total: status.total,
            generated: status.success,
            failed: status.failed
          },
          lastItem: status.lastItem,
          startedAt: status.startedAt
        }
      })
    } else {
      res.json({ success: true, job: null, message: 'No active job' })
    }
  } catch (error) {
    if (error.response?.status === 404) {
      return res.json({ success: true, job: null, message: 'No active job' })
    }
    logger.error(`Audio status error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/cancel
// Cancel generation (POST to match frontend expectation)
app.post('/api/production/:courseCode/audio-pipeline/cancel', async (req, res) => {
  if (!await requireDashboardUser(req, res)) return
  const { courseCode } = req.params
  try {
    const response = await axios.delete(`${PHASE8_URL}/cancel/${courseCode}`)
    res.json(response.data)
  } catch (error) {
    logger.error(`Audio cancel error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/retry
// Retry failed audio generation
app.post('/api/production/:courseCode/audio-pipeline/retry', async (req, res) => {
  if (!await requireDashboardUser(req, res)) return
  const { courseCode } = req.params
  const { options } = req.body
  try {
    const response = await axios.post(`${PHASE8_URL}/generate/${courseCode}`, {
      retry: true,
      ...options
    }, {
      timeout: 3600000 // 1 hour - audio generation can take a very long time for large courses
    })
    res.json(response.data)
  } catch (error) {
    logger.error(`Audio retry error for ${courseCode}:`, error.message)
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Phase 8 audio service not running' })
    }
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/link-and-recount
// Link unlinked audio to content rows, then return refreshed stats
// Called async by frontend after initial stats load to refine counts
app.post('/api/production/:courseCode/audio-pipeline/link-and-recount', async (req, res) => {
  const { courseCode } = req.params
  try {
    let linked = 0
    try {
      const linkResponse = await axios.post(`${PHASE8_URL}/link-audio-ids/${courseCode}`, {}, {
        timeout: 120000 // 2 min for linking
      })
      linked = linkResponse.data?.totalLinked || linkResponse.data?.results?.total || 0
    } catch (linkErr) {
      logger.warn(`Audio linking for ${courseCode}: ${linkErr.code === 'ECONNREFUSED' ? 'Phase 8 not running' : linkErr.message}`)
    }

    // Invalidate cache and re-fetch stats with fresh data
    invalidateAudioStatsCache(courseCode)
    const stats = await getDirectAudioStats(courseCode)

    res.json({
      success: true,
      linked,
      stats
    })
  } catch (error) {
    logger.error(`Link-and-recount error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/audio-pipeline/missing
// Get detailed list of missing audio with sample playback URLs for voice matching
// AZURE COUNTS: Direct Supabase via getDirectAudioStats() — fast, cached
// ELEVENLABS COUNTS: Handled locally (shared audio, welcomes)
app.get('/api/production/:courseCode/audio-pipeline/missing', async (req, res) => {
  const { courseCode } = req.params
  logger.info(`Getting missing audio details for ${courseCode}`)

  try {
    // =========================================================================
    // AZURE TTS COUNTS: Direct Supabase via getDirectAudioStats() — fast, cached
    // =========================================================================
    const stats = await getDirectAudioStats(courseCode)
    const breakdown = stats.breakdown
    // "Missing" now means no audio exists. Slots whose audio is already
    // rendered and storage-verified — they were simply never bound — are
    // reported as `unlinked`, their own count with its own fix (link, no TTS).
    const unlinkedCounts = stats.unlinkedBreakdown || { known: 0, target1: 0, target2: 0, presentation: 0 }
    const trulyMissingCounts = stats.missingBreakdown || breakdown
    const sumRoles = (b) => (b.known || 0) + (b.target1 || 0) + (b.target2 || 0) + (b.presentation || 0)
    const azureMissing = sumRoles(trulyMissingCounts)
    const azureUnlinked = sumRoles(unlinkedCounts)

    const supabase = supabaseClient.getClient()
    const knownLang = stats.course?.known_lang || 'eng'
    const releaseTarget = stats.releaseTarget || 260

    // =========================================================================
    // SAMPLE AUDIO: Get one sample per role for voice matching UI
    // =========================================================================
    const samplesByRole = { known: null, target1: null, target2: null, presentation: null }

    const { data: sampleAudio } = await supabase
      .from('course_audio')
      .select('id, text, role, voice_id, s3_key')
      .eq('course_code', courseCode)
      .not('s3_key', 'like', 'pending/%')
      .in('role', ['known', 'target1', 'target2', 'presentation'])
      .limit(100)

    for (const sa of sampleAudio || []) {
      if (!samplesByRole[sa.role]) {
        samplesByRole[sa.role] = {
          text: sa.text,
          audioId: sa.id,
          voiceId: sa.voice_id,
          s3Key: sa.s3_key
        }
      }
    }

    // Generate signed URLs for samples
    for (const role of ['known', 'target1', 'target2', 'presentation']) {
      if (samplesByRole[role]) {
        try {
          const url = await s3Service.getAudioSignedUrl(samplesByRole[role].audioId, 3600, {
            s3Key: samplesByRole[role].s3Key
          })
          samplesByRole[role].url = url
        } catch (e) {
          logger.warn(`Could not get signed URL for ${role} sample: ${e.message}`)
        }
      }
    }

    // =========================================================================
    // ELEVENLABS: Shared audio (encouragements, instructions, welcome)
    // =========================================================================
    const SHARED_AUDIO_REQUIREMENTS = { encouragement: 48, instruction: 48 }

    const { count: encCount } = await supabase
      .from('shared_audio')
      .select('*', { count: 'exact', head: true })
      .eq('language', knownLang)
      .eq('audio_type', 'encouragement')

    const { count: instrCount } = await supabase
      .from('shared_audio')
      .select('*', { count: 'exact', head: true })
      .eq('language', knownLang)
      .eq('audio_type', 'instruction')

    const sharedAudio = {
      language: knownLang,
      encouragements: {
        expected: SHARED_AUDIO_REQUIREMENTS.encouragement,
        existing: encCount || 0,
        missing: Math.max(0, SHARED_AUDIO_REQUIREMENTS.encouragement - (encCount || 0))
      },
      instructions: {
        expected: SHARED_AUDIO_REQUIREMENTS.instruction,
        existing: instrCount || 0,
        missing: Math.max(0, SHARED_AUDIO_REQUIREMENTS.instruction - (instrCount || 0))
      }
    }

    // Welcome audio check
    // Welcome audio — check course_audio table
    let welcomeStatus = { exists: false, hasAudio: false, details: null }
    try {
      const { data: welcomeAudio } = await supabase
        .from('course_audio')
        .select('id, s3_key, voice_id, duration_ms')
        .eq('course_code', courseCode)
        .eq('role', 'welcome')
        .not('s3_key', 'like', 'pending/%')
        .limit(1)
        .single()
      if (welcomeAudio) {
        welcomeStatus = {
          exists: true,
          hasAudio: true,
          hasDuration: (welcomeAudio.duration_ms || 0) > 0,
          details: { id: welcomeAudio.id, duration: welcomeAudio.duration_ms, voice: welcomeAudio.voice_id }
        }
      }
    } catch (e) { /* no welcome audio */ }

    // =========================================================================
    // BUILD RESPONSE: Supabase data for Azure, local data for ElevenLabs
    // =========================================================================
    const sharedMissing = sharedAudio.encouragements.missing + sharedAudio.instructions.missing
    const welcomeMissing = welcomeStatus.hasAudio ? 0 : 1
    const totalMissing = azureMissing + sharedMissing + welcomeMissing

    // Build missing arrays for UI (empty - UI uses counts, detail lists not needed)
    const missingByRole = { known: [], target1: [], target2: [], presentation: [] }

    res.json({
      success: true,
      courseCode,
      releaseTarget,
      totalMissing,
      totalPhrases: stats.totalPhrases || 0,
      totalLegos: stats.totalNewLegos || 0,
      existingCounts: stats.existingByRole || { known: 0, target1: 0, target2: 0, presentation: 0 },

      // Breakdown for Azure (UI reads counts via byProcess)
      missing: missingByRole,
      missingCounts: trulyMissingCounts,  // no audio anywhere — needs TTS
      unlinkedCounts,                     // audio exists in storage, slot unbound
      totalUnlinked: azureUnlinked,
      unboundCounts: breakdown,           // unlinked + missing, the old meaning
      copyable: stats.toCopy || 0,        // exists in another course, right voice
      storageBroken: stats.storageBroken || 0,
      storageBrokenBreakdown: stats.storageBrokenBreakdown || { known: 0, target1: 0, target2: 0 },
      samples: samplesByRole,

      // Seeds/LEGOs included in deduped counts (no separate tracking needed)
      seeds: { counts: {}, missing: { known: [], target1: [], target2: [] }, totalMissing: 0 },
      legos: { counts: {}, missing: { known: [], target1: [], target2: [] }, totalMissing: 0 },

      // ElevenLabs (local)
      sharedAudio,
      welcome: welcomeStatus,

      // Summary by generation process. Labels are provider-neutral: the
      // actual voice per role comes from voice_config (presentations resolve
      // to the English clone on eng-known courses), not a hardcoded engine.
      byProcess: {
        azure: {
          label: 'Course TTS (Phrases)',
          missing: trulyMissingCounts.known + trulyMissingCounts.target1 + trulyMissingCounts.target2,
          unlinked: unlinkedCounts.known + unlinkedCounts.target1 + unlinkedCounts.target2,
          categories: ['known', 'target1', 'target2']
        },
        azureSeeds: {
          label: 'Course TTS (Seeds)',
          missing: 0,  // Included in deduped counts
          unlinked: 0,
          categories: []
        },
        azureLegos: {
          label: 'Intros (LEGO debuts)',
          missing: trulyMissingCounts.presentation,
          unlinked: unlinkedCounts.presentation || 0,
          categories: ['presentation']
        },
        elevenLabs: {
          label: 'UI Audio (shared)',
          missing: sharedMissing + welcomeMissing,
          categories: ['encouragements', 'instructions', 'welcome']
        }
      }
    })

  } catch (error) {
    logger.error(`Missing audio error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/audio-pipeline/ungeneratable
// List items whose text is empty/punctuation-only AND have no audio linked.
// These are silently filtered by Phase 8 generation, so the dashboard needs
// to surface them — otherwise the user sees "X missing", clicks generate,
// nothing changes, and they have no idea why.
app.get('/api/production/:courseCode/audio-pipeline/ungeneratable', async (req, res) => {
  const { courseCode } = req.params

  try {
    const supabase = supabaseClient.getClient()
    if (!supabase) return res.status(500).json({ error: 'Database not initialized' })

    const items = []

    // Practice phrases — known/target1/target2 with NULL audio_id
    const { data: phrases, error: pErr } = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', courseCode)
      .or('known_audio_id.is.null,target1_audio_id.is.null,target2_audio_id.is.null')
      .limit(10000)
    if (pErr) throw pErr

    for (const row of phrases || []) {
      if (row.known_audio_id === null && isPunctuationOnly(row.known_text)) {
        items.push({ source: 'phrase', id: row.id, role: 'known', text: row.known_text || '' })
      }
      if (row.target1_audio_id === null && isPunctuationOnly(row.target_text)) {
        items.push({ source: 'phrase', id: row.id, role: 'target1', text: row.target_text || '' })
      }
      if (row.target2_audio_id === null && isPunctuationOnly(row.target_text)) {
        items.push({ source: 'phrase', id: row.id, role: 'target2', text: row.target_text || '' })
      }
    }

    // LEGOs — known/target1 with NULL audio_id
    const { data: legos, error: lErr } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id')
      .eq('course_code', courseCode)
      .or('known_audio_id.is.null,target1_audio_id.is.null')
      .limit(10000)
    if (lErr) throw lErr

    for (const row of legos || []) {
      if (row.known_audio_id === null && isPunctuationOnly(row.known_text)) {
        items.push({ source: 'lego', id: row.lego_id, seed: row.seed_number, legoIndex: row.lego_index, role: 'known', text: row.known_text || '' })
      }
      if (row.target1_audio_id === null && isPunctuationOnly(row.target_text)) {
        items.push({ source: 'lego', id: row.lego_id, seed: row.seed_number, legoIndex: row.lego_index, role: 'target1', text: row.target_text || '' })
      }
    }

    res.json({
      success: true,
      courseCode,
      count: items.length,
      items
    })
  } catch (error) {
    logger.error(`Ungeneratable items error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/audio-pipeline/orphan-legos
// Find NEW LEGOs that don't have any phrases (position=0 is the debut phrase)
// Phrase table uses seed_number + lego_index to identify the LEGO, not lego_id
app.get('/api/production/:courseCode/audio-pipeline/orphan-legos', async (req, res) => {
  const { courseCode } = req.params
  logger.info(`Finding orphan LEGOs for ${courseCode}`)

  try {
    const supabase = supabaseClient.getClient()

    // Get all NEW LEGOs (only new LEGOs need debut phrases)
    const { data: legos, error: legosError } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, lego_index, known_text, target_text, type')
      .eq('course_code', courseCode)
      .eq('is_new', true)

    if (legosError) throw legosError

    // Get all practice phrases (any phrase, position 0 is debut)
    // Use seed_number + lego_index to identify which LEGO has phrases
    const { data: phrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)

    if (phrasesError) throw phrasesError

    // Build set of LEGOs that have at least one phrase
    const legosWithPhrases = new Set(
      (phrases || []).map(p => `${p.seed_number}-${p.lego_index}`)
    )

    // Find LEGOs without any phrases
    const orphanLegos = (legos || []).filter(l =>
      !legosWithPhrases.has(`${l.seed_number}-${l.lego_index}`)
    )

    logger.info(`Found ${orphanLegos.length} orphan LEGOs (LEGOs without any phrases)`)

    res.json({
      success: true,
      orphanLegos,
      total: orphanLegos.length
    })
  } catch (error) {
    logger.error(`Orphan LEGOs error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/fix-orphan-legos
// Add debut phrases (position=0) for LEGOs that don't have any phrases
app.post('/api/production/:courseCode/audio-pipeline/fix-orphan-legos', async (req, res) => {
  const { courseCode } = req.params
  const { dryRun = false } = req.body

  try {
    const supabase = supabaseClient.getClient()

    // OPTIMIZATION: Quick count of new LEGOs first - most courses have none
    const { count: newLegoCount, error: countError } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true)

    if (countError) throw countError

    // Fast path: no new LEGOs means no orphans possible
    if (!newLegoCount || newLegoCount === 0) {
      return res.json({ success: true, addedCount: 0, message: 'No new LEGOs to check' })
    }

    logger.info(`Fixing orphan LEGOs for ${courseCode} (${newLegoCount} new LEGOs, dryRun: ${dryRun})`)

    // Get all NEW LEGOs (we know there are some)
    const { data: legos, error: legosError } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, lego_index, known_text, target_text, type')
      .eq('course_code', courseCode)
      .eq('is_new', true)

    if (legosError) throw legosError

    // Only get phrases for the seeds that have new LEGOs (much smaller query)
    const seedNumbers = [...new Set(legos.map(l => l.seed_number))]
    const { data: phrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)
      .in('seed_number', seedNumbers)

    if (phrasesError) throw phrasesError

    // Build set of LEGOs that have at least one phrase
    const legosWithPhrases = new Set(
      (phrases || []).map(p => `${p.seed_number}-${p.lego_index}`)
    )

    // Find LEGOs without any phrases
    const orphanLegos = (legos || []).filter(l =>
      !legosWithPhrases.has(`${l.seed_number}-${l.lego_index}`)
    )

    if (orphanLegos.length === 0) {
      return res.json({ success: true, addedCount: 0, message: 'No orphan LEGOs found' })
    }

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        wouldAdd: orphanLegos.length,
        orphanLegos: orphanLegos.map(l => ({
          lego_id: l.lego_id,
          known_text: l.known_text,
          target_text: l.target_text
        }))
      })
    }

    // Create debut phrases for orphan LEGOs
    // The debut phrase shows the LEGO itself — role 'build', position 1
    // Uses deterministic phrase IDs matching course-builder-api.cjs makePhraseId format
    const ROLE_PREFIX = { component: 'C', build: 'B', use: 'U' }
    function makePhraseId(cc, seedNum, legoIdx, phraseRole, rolePos) {
      const s = String(seedNum).padStart(4, '0')
      const l = String(legoIdx).padStart(2, '0')
      const r = ROLE_PREFIX[phraseRole] || 'X'
      const p = String(rolePos).padStart(2, '0')
      return `${cc}:S${s}L${l}${r}${p}`
    }

    const debutPhrases = orphanLegos.map(lego => ({
      id: makePhraseId(courseCode, lego.seed_number, lego.lego_index, 'build', 1),
      course_code: courseCode,
      seed_number: lego.seed_number,
      lego_index: lego.lego_index,
      lego_id: lego.lego_id,
      position: 1,
      known_text: lego.known_text,
      target_text: lego.target_text,
      phrase_role: 'build',
      word_count: (lego.target_text || '').split(/\s+/).filter(w => w.length > 0).length || 1,
      lego_count: 1,
      connected_lego_ids: [],
      status: 'draft',
      version: 1
    }))

    const { error: insertError } = await supabase
      .from('course_practice_phrases')
      .insert(debutPhrases)

    if (insertError) throw insertError

    logger.info(`Added ${debutPhrases.length} debut phrases for orphan LEGOs in ${courseCode}`)

    res.json({
      success: true,
      addedCount: debutPhrases.length,
      message: `Added ${debutPhrases.length} debut phrases`
    })
  } catch (error) {
    logger.error(`Fix orphan LEGOs error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/audio-pipeline/sync-s3
// Sync existing S3 audio files to Supabase (import existing audio)
app.post('/api/production/:courseCode/audio-pipeline/sync-s3', async (req, res) => {
  const { courseCode } = req.params
  logger.info(`Starting S3 to Supabase sync for ${courseCode}`)

  try {
    // Step 1: Get ALL audio needs directly from database (not limited like Phase 8 plan)
    const supabase = supabaseClient.getClient()

    // Get course voices (voice_config JSONB column, courses.course_code is PK)
    const { data: courseData } = await supabase
      .from('courses')
      .select('voice_config')
      .eq('course_code', courseCode)
      .single()

    const voiceConfig = courseData?.voice_config || {}
    const voices = {
      known: voiceConfig.known,
      target1: voiceConfig.target1,
      target2: voiceConfig.target2
    }

    // Get all practice phrases for this course
    const { data: phrases, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index, position, known_text, target_text')
      .eq('course_code', courseCode)

    if (phrasesError) throw phrasesError

    logger.info(`Found ${phrases?.length || 0} practice phrases in database for ${courseCode}`)

    // Parse course code for languages
    const parts = courseCode.split('_for_')
    const targetLang = parts[0] || 'zho'
    const knownLang = parts[1] || 'eng'

    // Build samples list with UUIDs
    const samples = []
    const seen = new Set()

    for (const phrase of phrases || []) {
      // Target1 audio
      if (phrase.target_text && voices.target1) {
        const uuid = supabaseClient.generateAudioUUID(voices.target1, phrase.target_text, targetLang, 'target1', 'slow')
        if (!seen.has(uuid)) {
          seen.add(uuid)
          samples.push({ uuid, text: phrase.target_text, lang: targetLang, role: 'target1' })
        }
      }
      // Target2 audio
      if (phrase.target_text && voices.target2) {
        const uuid = supabaseClient.generateAudioUUID(voices.target2, phrase.target_text, targetLang, 'target2', 'slow')
        if (!seen.has(uuid)) {
          seen.add(uuid)
          samples.push({ uuid, text: phrase.target_text, lang: targetLang, role: 'target2' })
        }
      }
      // Known audio
      if (phrase.known_text && voices.known) {
        const uuid = supabaseClient.generateAudioUUID(voices.known, phrase.known_text, knownLang, 'known', 'natural')
        if (!seen.has(uuid)) {
          seen.add(uuid)
          samples.push({ uuid, text: phrase.known_text, lang: knownLang, role: 'known' })
        }
      }
    }

    logger.info(`Extracted ${samples.length} unique audio needs from database`)

    if (samples.length === 0) {
      return res.json({ success: true, message: 'No audio samples needed', synced: 0 })
    }

    // Step 2: Batch check which UUIDs exist in S3
    const uuids = samples.map(s => s.uuid)
    const existsResults = await s3Service.batchCheckAudio(uuids, process.env.S3_BUCKET || 'ssi-audio-stage')

    const existingInS3 = samples.filter(s => existsResults[s.uuid])
    logger.info(`Found ${existingInS3.length}/${samples.length} samples in S3`)

    if (existingInS3.length === 0) {
      return res.json({ success: true, message: 'No matching audio in S3', synced: 0 })
    }

    // Step 3: Register in Supabase (v13: use course_audio table)
    let synced = 0
    let skipped = 0
    let errors = 0

    for (const sample of existingInS3) {
      try {
        // Check if already registered (v13: course_audio with text_normalized)
        const normalizedText = normalizeForAudio(sample.text)
        const { data: existing } = await supabase
          .from('course_audio')
          .select('id')
          .eq('course_code', courseCode)
          .eq('text_normalized', normalizedText)
          .eq('role', sample.role)
          .single()

        if (existing) {
          skipped++
          continue
        }

        // Register the audio (v13: course_audio is flat)
        const { error } = await supabase
          .from('course_audio')
          .insert({
            course_code: courseCode,
            text: sample.text,
            text_normalized: normalizedText,
            language: sample.lang,
            role: sample.role,
            voice_id: voices[sample.role] || null,
            origin: 'tts',
            s3_key: `${sample.uuid}.mp3`
          })

        if (error && error.code !== '23505') {
          logger.warn(`Error registering ${sample.uuid}: ${error.message}`)
          errors++
        } else {
          synced++
        }
      } catch (err) {
        logger.warn(`Error processing ${sample.uuid}: ${err.message}`)
        errors++
      }
    }

    logger.info(`S3 sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors`)
    res.json({
      success: true,
      totalInPlan: samples.length,
      foundInS3: existingInS3.length,
      synced,
      skipped,
      errors
    })
  } catch (error) {
    logger.error(`S3 sync error for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// Database-First Course Data Endpoints
// =============================================================================

// Get seeds from database
app.get('/api/production/:courseCode/seeds', async (req, res) => {
  const { courseCode } = req.params
  const status = req.query.status || 'all'  // Default to all statuses (draft, released, etc.)
  try {
    const seeds = await courseDataService.getSeedsByCourse(courseCode, { status })

    // Transform database format to match frontend expectations:
    // - course_legos → legos
    // - course_practice_phrases → basket_phrases
    const transformedSeeds = seeds.map(seed => ({
      ...seed,
      legos: (seed.course_legos || []).map(lego => ({
        ...lego,
        basket_phrases: lego.course_practice_phrases || []
      }))
    }))

    // Remove the original nested properties to avoid confusion
    transformedSeeds.forEach(seed => {
      delete seed.course_legos
      seed.legos.forEach(lego => {
        delete lego.course_practice_phrases
      })
    })

    res.json({
      courseCode,
      count: transformedSeeds.length,
      seeds: transformedSeeds
    })
  } catch (error) {
    logger.error(`Error fetching seeds for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Get LEGOs from database
app.get('/api/production/:courseCode/legos', async (req, res) => {
  const { courseCode } = req.params
  try {
    const legos = await courseDataService.getLegosByCourse(courseCode)
    res.json({
      courseCode,
      count: legos.length,
      legos
    })
  } catch (error) {
    logger.error(`Error fetching legos for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Get course progress from database
app.get('/api/production/:courseCode/progress', async (req, res) => {
  const { courseCode } = req.params
  try {
    const progress = await courseDataService.getCourseProgress(courseCode)
    res.json(progress)
  } catch (error) {
    logger.error(`Error fetching progress for ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Update a LEGO in database
app.patch('/api/production/:courseCode/lego/:legoId', async (req, res) => {
  const { courseCode, legoId } = req.params
  const updates = req.body
  try {
    // Parse legoId: "S0001L02" -> seedNumber=1, legoIndex=2
    const seedNumber = courseDataService.parseSeedNumber(legoId)
    const legoIndex = courseDataService.parseLegoIndex(legoId)

    if (!seedNumber || !legoIndex) {
      return res.status(400).json({ error: `Invalid legoId format: ${legoId}` })
    }

    const result = await courseDataService.updateLego(courseCode, seedNumber, legoIndex, updates)
    res.json({
      success: true,
      lego: result
    })
  } catch (error) {
    logger.error(`Error updating lego ${legoId}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Delete a seed from database (soft delete by removing from course)
app.delete('/api/production/:courseCode/seed/:seedNumber', async (req, res) => {
  const { courseCode, seedNumber } = req.params
  try {
    const result = await courseDataService.deleteSeed(courseCode, parseInt(seedNumber))
    if (!result) {
      return res.status(404).json({ error: `Seed ${seedNumber} not found in course ${courseCode}` })
    }
    res.json({
      success: true,
      deleted: courseDataService.formatSeedId(parseInt(seedNumber))
    })
  } catch (error) {
    logger.error(`Error deleting seed ${seedNumber} from ${courseCode}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Get basket phrases for a LEGO
app.get('/api/production/:courseCode/lego/:legoId/basket', async (req, res) => {
  const { courseCode, legoId } = req.params
  try {
    // Parse legoId: "S0001L02" -> seedNumber=1, legoIndex=2
    const seedNumber = courseDataService.parseSeedNumber(legoId)
    const legoIndex = courseDataService.parseLegoIndex(legoId)

    if (!seedNumber || !legoIndex) {
      return res.status(400).json({ error: `Invalid legoId format: ${legoId}` })
    }

    const phrases = await courseDataService.getPracticePhrases(courseCode, seedNumber, legoIndex)
    res.json({
      courseCode,
      legoId,
      count: phrases.length,
      phrases
    })
  } catch (error) {
    logger.error(`Error fetching basket for lego ${legoId}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// Get all baskets for a seed (for LegoBasketViewer)
app.get('/api/production/:courseCode/seed/:seedId/baskets', async (req, res) => {
  const { courseCode, seedId } = req.params
  try {
    // Get seed with all legos and their practice phrases (nested via includeLegos)
    const seedData = await courseDataService.getSeed(courseCode, seedId.toUpperCase(), {
      includeLegos: true  // This includes course_legos (with components JSONB) and course_practice_phrases
    })

    if (!seedData) {
      return res.status(404).json({ error: `Seed ${seedId} not found in ${courseCode}` })
    }

    // Build baskets object keyed by lego_id (e.g., "S0001L01")
    const baskets = {}
    for (const lego of seedData.course_legos || []) {
      // Derive lego_id from seed_number and lego_index
      const derivedSeedId = 'S' + seedData.seed_number.toString().padStart(4, '0')
      const derivedLegoId = derivedSeedId + 'L' + lego.lego_index.toString().padStart(2, '0')

      if (lego.course_practice_phrases && lego.course_practice_phrases.length > 0) {
        baskets[derivedLegoId] = {
          lego: {
            known: lego.known_text,
            target: lego.target_text
          },
          type: lego.type,
          is_new: lego.is_new,
          components: (lego.components || []).map(c => ({
            known: c.known,
            target: c.target
          })),
          practice_phrases: lego.course_practice_phrases.sort((a, b) => a.position - b.position).map(bp => ({
            known: bp.known_text,
            target: bp.target_text,
            position: bp.position,
            word_count: bp.word_count,
            lego_count: bp.lego_count
            // NOTE: phrase_type computed at runtime from position/word_count/lego_count per registry v1.1.0
          }))
        }
      }
    }

    res.json({
      courseCode,
      seedId: courseDataService.formatSeedId(seedData.seed_number),
      seed_pair: {
        known: seedData.known_text,
        target: seedData.target_text
      },
      basketCount: Object.keys(baskets).length,
      baskets
    })
  } catch (error) {
    logger.error(`Error fetching baskets for seed ${seedId}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// SCRIPT VIEW ENDPOINT
// Returns hierarchical structure: seeds -> legos -> phrases for script editing
// =============================================================================

/**
 * Batch lookup audio UUIDs for a set of texts
 * Returns a map: normalized_text -> { known, target1, target2 }
 *
 * Uses audio_registry table (v12 schema) with voice/cadence matching
 * This matches the practice_cycles view join logic
 */
async function batchLookupAudioUuids(supabase, courseCode, knownTexts, targetTexts) {
  const audioMap = new Map()  // normalized_text -> { known?, target1?, target2? }

  // Get course config for voice/cadence matching
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('known_lang, target_lang, known_voice, target1_voice, target2_voice, known_cadence, target_cadence')
    .eq('course_code', courseCode)
    .single()

  if (courseError || !course) {
    logger.warn(`Could not find course ${courseCode} for audio lookup`)
    return audioMap
  }

  // Normalize and deduplicate texts
  const normalizedKnown = [...new Set(knownTexts.filter(t => t).map(t => normalizeForAudio(t)))]
  const normalizedTarget = [...new Set(targetTexts.filter(t => t).map(t => normalizeForAudio(t)))]

  if (normalizedKnown.length === 0 && normalizedTarget.length === 0) return audioMap

  // Query known audio (source language)
  if (normalizedKnown.length > 0 && course.known_voice) {
    const { data: knownAudio } = await supabase
      .from('audio_registry')
      .select('audio_id, content_normalized, duration_ms')
      .in('content_normalized', normalizedKnown)
      .eq('language', course.known_lang)
      .eq('voice_id', course.known_voice)
      .eq('cadence', course.known_cadence || 'natural')

    for (const audio of (knownAudio || [])) {
      if (!audioMap.has(audio.content_normalized)) {
        audioMap.set(audio.content_normalized, {})
      }
      const entry = audioMap.get(audio.content_normalized)
      entry.known = audio.audio_id
      entry.known_duration_ms = audio.duration_ms
    }
  }

  // Query target1 audio
  if (normalizedTarget.length > 0 && course.target1_voice) {
    const { data: target1Audio } = await supabase
      .from('audio_registry')
      .select('audio_id, content_normalized, duration_ms')
      .in('content_normalized', normalizedTarget)
      .eq('language', course.target_lang)
      .eq('voice_id', course.target1_voice)
      .eq('cadence', course.target_cadence || 'slow')

    for (const audio of (target1Audio || [])) {
      if (!audioMap.has(audio.content_normalized)) {
        audioMap.set(audio.content_normalized, {})
      }
      const entry = audioMap.get(audio.content_normalized)
      entry.target1 = audio.audio_id
      entry.target1_duration_ms = audio.duration_ms
    }
  }

  // Query target2 audio
  if (normalizedTarget.length > 0 && course.target2_voice) {
    const { data: target2Audio } = await supabase
      .from('audio_registry')
      .select('audio_id, content_normalized, duration_ms')
      .in('content_normalized', normalizedTarget)
      .eq('language', course.target_lang)
      .eq('voice_id', course.target2_voice)
      .eq('cadence', course.target_cadence || 'slow')

    for (const audio of (target2Audio || [])) {
      if (!audioMap.has(audio.content_normalized)) {
        audioMap.set(audio.content_normalized, {})
      }
      const entry = audioMap.get(audio.content_normalized)
      entry.target2 = audio.audio_id
      entry.target2_duration_ms = audio.duration_ms
    }
  }

  return audioMap
}

// Get script view data - all phrases grouped by seed and LEGO
// Queries course_practice_phrases and course_legos directly (NOT the cycle views)
// Supports pagination via query params: seedStart, seedEnd (e.g., S0001, S0030)
app.get('/api/production/:courseCode/script-view', async (req, res) => {
  const { courseCode } = req.params
  const { seedStart, seedEnd, flaggedOnly } = req.query

  // Parse seed range from query params (S0001 -> 1, S0030 -> 30)
  const parseSeedNumber = (s) => {
    if (!s) return null
    const match = String(s).match(/(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }
  let startNum = parseSeedNumber(seedStart)
  let endNum = parseSeedNumber(seedEnd)

  // Enforce max seed range to prevent runaway queries that exhaust DB connections
  // practice_cycles view does 3 LEFT JOINs with regexp — loading 296 seeds can take 5+ minutes
  const MAX_SEED_RANGE = 50
  if (startNum !== null && endNum !== null && (endNum - startNum) > MAX_SEED_RANGE) {
    endNum = startNum + MAX_SEED_RANGE
    logger.warn(`[ScriptView] Clamped seed range to max ${MAX_SEED_RANGE}: S${startNum}-S${endNum}`)
  }
  if (startNum === null && endNum === null && flaggedOnly !== 'true') {
    // No range specified — default to first 30 seeds instead of loading everything
    startNum = 1
    endNum = 30
    logger.warn(`[ScriptView] No seed range specified — defaulting to S1-S30`)
  }

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // flaggedOnly through script-view is deprecated — use /flagged-items endpoint
    if (flaggedOnly === 'true') {
      logger.warn(`[ScriptView] flaggedOnly=true rejected — use GET /api/production/${courseCode}/flagged-items instead`)
      return res.status(400).json({
        error: 'Use /api/production/' + courseCode + '/flagged-items instead',
        redirect: `/api/production/${courseCode}/flagged-items`
      })
    }

    // Query course_practice_phrases directly (NOT practice_cycles view!)
    // The practice_cycles view does 3 LEFT JOINs on lower(trim(text)) against course_audio
    // which takes 5+ minutes for a full course and can exhaust the connection pool.
    // Audio UUIDs are already on course_practice_phrases — no join needed.
    // AbortSignal prevents runaway queries from exhausting DB connection pool.
    const queryTimeout = AbortSignal.timeout(60000) // 60s max per query
    let cyclesQuery = supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', courseCode)
      .abortSignal(queryTimeout)

    // Apply seed range filter if provided
    if (startNum !== null) {
      cyclesQuery = cyclesQuery.gte('seed_number', startNum)
    }
    if (endNum !== null) {
      cyclesQuery = cyclesQuery.lte('seed_number', endNum)
    }

    cyclesQuery = cyclesQuery.order('seed_number', { ascending: true })
      .order('lego_index', { ascending: true })
      .order('position', { ascending: true })

    // Also query course_seeds and course_legos for their text values
    let seedsQuery = supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text, status')
      .eq('course_code', courseCode)

    if (startNum !== null) {
      seedsQuery = seedsQuery.gte('seed_number', startNum)
    }
    if (endNum !== null) {
      seedsQuery = seedsQuery.lte('seed_number', endNum)
    }

    let legosQuery = supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, type, is_new')
      .eq('course_code', courseCode)

    if (startNum !== null) {
      legosQuery = legosQuery.gte('seed_number', startNum)
    }
    if (endNum !== null) {
      legosQuery = legosQuery.lte('seed_number', endNum)
    }

    // Query audio_flags for this course (NEW simplified system)
    const flagsQuery = supabase
      .from('audio_flags')
      .select('audio_uuid, status, reason, flagged_by, created_at, regen_count')
      .eq('course_code', courseCode)

    // Query course_legos directly (NOT lego_cycles view which does expensive text JOINs)
    let legoCyclesQuery = supabase
      .from('course_legos')
      .select('id, lego_id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, target1_duration_ms, target2_duration_ms')
      .eq('course_code', courseCode)
      .abortSignal(queryTimeout)

    if (startNum !== null) {
      legoCyclesQuery = legoCyclesQuery.gte('seed_number', startNum)
    }
    if (endNum !== null) {
      legoCyclesQuery = legoCyclesQuery.lte('seed_number', endNum)
    }

    // Run all queries in parallel
    const [cyclesResult, seedsResult, legosResult, flagsResult, legoCyclesResult] = await Promise.all([
      cyclesQuery,
      seedsQuery,
      legosQuery,
      flagsQuery,
      legoCyclesQuery
    ])

    if (cyclesResult.error) {
      logger.error(`Script view cycles query error for ${courseCode}:`, cyclesResult.error)
      throw cyclesResult.error
    }

    const cycles = cyclesResult.data
    const seedsData = seedsResult.data || []
    const legosData = legosResult.data || []
    const flagsData = flagsResult.data || []
    const legoCyclesData = legoCyclesResult.data || []

    // Build LEGO debut lookup: "seed_number:lego_index" -> lego cycle with audio
    const legoDebutMap = new Map()
    for (const lc of legoCyclesData) {
      const key = `${lc.seed_number}:${lc.lego_index}`
      legoDebutMap.set(key, lc)
    }

    // Build flags lookup map: audio_uuid -> { status, notes, flagged_by, flagged_at, regen_count }
    const flagsMap = new Map()
    for (const flag of flagsData) {
      flagsMap.set(flag.audio_uuid, {
        status: flag.status,
        notes: flag.reason, // Map to old field name for compatibility
        flagged_by: flag.flagged_by,
        flagged_at: flag.created_at, // Map to old field name for compatibility
        regen_count: flag.regen_count || 0
      })
    }

    // Build lookup maps for seeds and legos
    const seedTextMap = new Map()  // seed_number -> { known_text, target_text, status }
    for (const seed of seedsData) {
      seedTextMap.set(seed.seed_number, {
        known_text: seed.known_text,
        target_text: seed.target_text,
        status: seed.status
      })
    }

    const legoTextMap = new Map()  // "seed_number:lego_index" -> { known_text, target_text, type, is_new }
    for (const lego of legosData) {
      const key = `${lego.seed_number}:${lego.lego_index}`
      legoTextMap.set(key, {
        known_text: lego.known_text,
        target_text: lego.target_text,
        type: lego.type,
        is_new: lego.is_new
      })
    }

    logger.info(`Loaded ${cycles?.length || 0} practice cycles, ${seedsData.length} seeds, ${legosData.length} legos for ${courseCode}`)

    // Group flat cycles into hierarchical structure: seeds -> legos -> phrases
    const seedsMap = new Map()  // seed_number -> { legos: Map<lego_id, { phrases: [] }> }

    for (const cycle of (cycles || [])) {
      const seedNum = cycle.seed_number
      // Construct lego_id from seed_number + lego_index (was computed in practice_cycles view)
      const legoId = 'S' + String(seedNum).padStart(4, '0') + 'L' + String(cycle.lego_index).padStart(2, '0')

      // Get or create seed entry
      if (!seedsMap.has(seedNum)) {
        seedsMap.set(seedNum, {
          seed_number: seedNum,
          seed_id: 'S' + String(seedNum).padStart(4, '0'),
          known_text: null,  // Will get from first phrase
          target_text: null,
          legos: new Map()
        })
      }
      const seedEntry = seedsMap.get(seedNum)

      // Get or create lego entry
      if (!seedEntry.legos.has(legoId)) {
        seedEntry.legos.set(legoId, {
          lego_id: legoId,
          lego_index: cycle.lego_index,
          type: null,  // Not in practice_cycles view
          known_text: null,
          target_text: null,
          is_new: null,
          phrases: []
        })
      }
      const legoEntry = seedEntry.legos.get(legoId)

      // S3 path is mastered/{UUID-UPPERCASE}.mp3 (same as learning app)
      const buildS3Key = (uuid) => uuid ? `mastered/${uuid.toUpperCase()}.mp3` : null

      // Map table column names (*_audio_id) to what the frontend expects (*_audio_uuid)
      const knownAudioUuid = cycle.known_audio_id || null
      const target1AudioUuid = cycle.target1_audio_id || null
      const target2AudioUuid = cycle.target2_audio_id || null

      // Check flags for any audio in this phrase
      const knownFlag = knownAudioUuid ? flagsMap.get(knownAudioUuid) : null
      const target1Flag = target1AudioUuid ? flagsMap.get(target1AudioUuid) : null
      const target2Flag = target2AudioUuid ? flagsMap.get(target2AudioUuid) : null
      const isFlagged = (flag) => flag?.status === 'flagged'
      const anyFlagged = isFlagged(knownFlag) || isFlagged(target1Flag) || isFlagged(target2Flag)

      // Add phrase
      legoEntry.phrases.push({
        id: cycle.id,
        position: cycle.position,
        known_text: cycle.known_text,
        target_text: cycle.target_text,
        type: cycle.phrase_role || 'build',
        introduce: cycle.introduce,
        word_count: cycle.word_count,
        lego_count: cycle.lego_count,
        known_audio_uuid: knownAudioUuid,
        target1_audio_uuid: target1AudioUuid,
        target2_audio_uuid: target2AudioUuid,
        // S3 keys for direct URL construction
        known_s3_key: buildS3Key(knownAudioUuid),
        target1_s3_key: buildS3Key(target1AudioUuid),
        target2_s3_key: buildS3Key(target2AudioUuid),
        // Durations
        known_duration_ms: null,  // not stored on table, only target durations
        target1_duration_ms: cycle.target1_duration_ms || null,
        target2_duration_ms: cycle.target2_duration_ms || null,
        // Flag status from database
        is_flagged: anyFlagged,
        known_flag: knownFlag || null,
        target1_flag: target1Flag || null,
        target2_flag: target2Flag || null
      })
    }

    // Convert maps to arrays and sort, enriching with seed/lego text from lookup maps
    const transformedSeeds = Array.from(seedsMap.values())
      .sort((a, b) => a.seed_number - b.seed_number)
      .map(seed => {
        // Get seed text from lookup map
        const seedData = seedTextMap.get(seed.seed_number) || {}

        return {
          seed_id: seed.seed_id,
          seed_number: seed.seed_number,
          known_text: seedData.known_text || null,
          target_text: seedData.target_text || null,
          status: seedData.status || null,
          legos: Array.from(seed.legos.values())
            .sort((a, b) => a.lego_index - b.lego_index)
            .map(lego => {
              // Get lego text from lookup map
              const legoKey = `${seed.seed_number}:${lego.lego_index}`
              const legoData = legoTextMap.get(legoKey) || {}

              // Get LEGO debut (the LEGO itself as a phrase at position 0)
              const legoDebut = legoDebutMap.get(legoKey)
              const allPhrases = [...lego.phrases]

              // Insert LEGO debut as position 0 if it has audio
              if (legoDebut && (legoDebut.known_audio_id || legoDebut.target1_audio_id || legoDebut.target2_audio_id)) {
                const buildS3Key = (uuid) => uuid ? `mastered/${uuid.toUpperCase()}.mp3` : null
                const knownFlag = legoDebut.known_audio_id ? flagsMap.get(legoDebut.known_audio_id) : null
                const target1Flag = legoDebut.target1_audio_id ? flagsMap.get(legoDebut.target1_audio_id) : null
                const target2Flag = legoDebut.target2_audio_id ? flagsMap.get(legoDebut.target2_audio_id) : null
                const isFlagged = (flag) => flag?.status === 'flagged'

                allPhrases.unshift({
                  id: legoDebut.id,
                  position: 0,
                  known_text: legoDebut.known_text,
                  target_text: legoDebut.target_text,
                  type: 'lego_debut',
                  word_count: 1,
                  lego_count: 1,
                  known_audio_uuid: legoDebut.known_audio_id || null,
                  target1_audio_uuid: legoDebut.target1_audio_id || null,
                  target2_audio_uuid: legoDebut.target2_audio_id || null,
                  known_s3_key: buildS3Key(legoDebut.known_audio_id),
                  target1_s3_key: buildS3Key(legoDebut.target1_audio_id),
                  target2_s3_key: buildS3Key(legoDebut.target2_audio_id),
                  known_duration_ms: null,
                  target1_duration_ms: legoDebut.target1_duration_ms || null,
                  target2_duration_ms: legoDebut.target2_duration_ms || null,
                  is_flagged: isFlagged(knownFlag) || isFlagged(target1Flag) || isFlagged(target2Flag),
                  known_flag: knownFlag || null,
                  target1_flag: target1Flag || null,
                  target2_flag: target2Flag || null
                })
              }

              return {
                lego_id: lego.lego_id,
                lego_index: lego.lego_index,
                type: legoData.type || null,
                known_text: legoData.known_text || null,
                target_text: legoData.target_text || null,
                is_new: legoData.is_new ?? null,
                phrases: allPhrases.sort((a, b) => a.position - b.position)
              }
            })
        }
      })

    // Get total seed count for pagination info (without range filter)
    const { count: totalSeedCount } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    const rangeInfo = startNum || endNum
      ? ` (range: ${startNum || 1}-${endNum || totalSeedCount})`
      : ' (all)'
    logger.info(`Returning script view for ${courseCode}: ${transformedSeeds.length} seeds${rangeInfo}`)

    res.json({
      courseCode,
      seeds: transformedSeeds,
      pagination: {
        returned: transformedSeeds.length,
        total: totalSeedCount || transformedSeeds.length,
        seedStart: startNum,
        seedEnd: endNum
      }
    })
  } catch (err) {
    logger.error(`Failed to get script view for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// =============================================================================
// LEARNING JOURNEY VIEW
// =============================================================================
// Generate learning script showing how the course looks to a learner
// Shows rounds with spaced repetition (Fibonacci-based reviews)
// Ported from ssi-learning-app's generateLearningScript()
// =============================================================================
// GLOSS ALIGNMENT — read on the row, re-segment in place
//
// The alignment is the literal known-language gloss cut into chunks that sit
// UNDER the target's own words, in the target's own order (Tom, 2026-08-12:
// "word order of target must be preserved and known language will look wrong
// when the orders differ"). Deborah reported it wrong on Basque `hitz bat`
// (2026-08-12) and asked to be able to fix it herself; this is that write path.
//
// Editing is SEGMENTATION, not pairing. The target words are fixed columns and
// are never touched. All this endpoint can change is where the breaks fall and
// which known words land in each chunk. Consequences, all deliberate:
//
//  - no target text and no known text changes anywhere, on any row, ever;
//  - no row is deleted or recreated, and `decomposition` is not touched at all,
//    so the learner's LEGO tiling and its salient highlight are untouched;
//  - therefore no audio clip can go stale and no audio pass is owed;
//  - it can never reach a re-translate or a TTS render.
//
// Two hard gates buy all of that, so neither is a nicety:
//  1. the chunk spans must sum to the row's actual target word count — the
//     alignment can never claim more or fewer columns than the target has;
//  2. the gloss words must be exactly the words already there, as a multiset.
//     Order is deliberately NOT compared — re-cutting to follow the target's
//     order is what reorders the gloss ("a word" -> `word` `a`), so comparing
//     order would refuse the very edit this exists to make. Words may move
//     anywhere; none may be invented, dropped or edited.
// A request failing either is a 4xx, never a partial write.
//
// REVERT (2026-08-12): both gates police a re-PAIRING, and neither can express
// "nobody has segmented this row" — so before this, one tap marked a row as
// hand-segmented for good and only raw SQL could undo it. A body sending
// `segments` as null or as an empty list is an explicit revert: the row's
// `known_gloss_segments` goes back to NULL and the gloss reads as whatever the
// generator derives. It writes that one column and nothing else, and it still
// answers to the editor gate, the unknown-row 404 and the nothing-to-align 409.
// =============================================================================

const MAPPING_EDIT_ROLES = ['admin', 'editor']
function canEditMapping(user) {
  return !!user && MAPPING_EDIT_ROLES.includes(user.role)
}

const glossWords = str => String(str || '').trim().split(/\s+/).filter(Boolean)

// The gloss as a word MULTISET, independent of order and of where the breaks
// are. Order deliberately plays no part: re-segmenting to follow the target's
// word order is exactly what reorders the gloss — Basque `hitz bat` turns
// "a word" into `word` `a` — so an ordered comparison would refuse the very
// edit this tool exists to make. What must not change is WHICH words are there.
function glossWordMultiset(segments) {
  return segments.flatMap(s => glossWords(s.known)).sort().join(' ')
}

// An explicit "put this row back to how it was before anyone touched it" —
// `segments` sent as null or as an empty list. Pure and unit-tested next door.
const { isRevertRequest } = require('./shared/mapping-revert-intent.cjs')

function invalidSegments(segments, wordCount) {
  if (!Array.isArray(segments) || segments.length === 0) return 'segments must be a non-empty array'
  let total = 0
  for (const seg of segments) {
    if (!seg || typeof seg !== 'object') return 'each segment must be an object'
    if (!Number.isInteger(seg.span) || seg.span < 1) return 'each segment needs a whole span of at least 1'
    if (typeof seg.known !== 'string') return 'each segment needs a known string'
    total += seg.span
  }
  if (total !== wordCount) {
    return `the segments cover ${total} target words but this row has ${wordCount}`
  }
  return null
}

app.post('/api/production/:courseCode/mapping/:rowId', async (req, res) => {
  const { courseCode, rowId } = req.params
  const { source, segments } = req.body || {}

  const editor = await resolveDashboardUserCached(req)
  if (!canEditMapping(editor)) {
    return res.status(403).json({ error: 'You need editor access to change a word mapping.' })
  }
  if (source !== 'phrase' && source !== 'lego') {
    return res.status(400).json({ error: "source must be 'phrase' or 'lego'" })
  }

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const supabase = supabaseClient.getClient()

    const table = source === 'phrase' ? 'course_practice_phrases' : 'course_legos'
    const blockColumn = source === 'phrase' ? 'decomposition' : 'components'
    const idColumn = source === 'phrase' ? 'id' : 'lego_id'
    // Only course_legos has a type; the A/M split is what decides mappability.
    const typeColumn = source === 'lego' ? 'type, ' : ''

    const { data: row, error: fetchError } = await supabase
      .from(table)
      .select(`${idColumn}, known_text, target_text, ${typeColumn}${blockColumn}, known_gloss_segments`)
      .eq(idColumn, rowId)
      .eq('course_code', courseCode)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!row) return res.status(404).json({ error: `No such row ${rowId} in ${courseCode}` })

    // The columns are the target's words, read from the row itself — never from
    // the request. The client cannot widen or narrow the grid.
    const words = learningScriptGenerator.targetWordsOf(row.target_text)
    if (words.length < 2) {
      return res.status(409).json({ error: 'This row has no alignment to change.' })
    }

    // An A-LEGO is one word in at least one language, so it cannot be split and
    // mapped (Tom, 2026-08-13). The viewer shows it no glyph; this is the same
    // rule at the write end, so a stray call cannot author one behind the UI's
    // back. Checked on the row's own declared type, never on the request.
    if (source === 'lego' && !learningScriptGenerator.legoIsMappable(row)) {
      return res.status(409).json({
        error: 'An A-LEGO is a single word on one side, so it has no mapping to change.',
      })
    }

    const reverting = isRevertRequest(req.body)

    if (!reverting) {
      const shapeError = invalidSegments(segments, words.length)
      if (shapeError) return res.status(400).json({ error: shapeError })
    }

    // What the gloss reads NOW: the stored segmentation if a human has made one,
    // otherwise the same derivation the viewer showed them.
    // A declared M-LEGO with no components has no DERIVED start — but it is a
    // mapping candidate all the same (Tom, 2026-08-13: "it's just classification
    // that feeds the mapping"), so the editor opens on blank columns and the
    // save must not 409. 1,354 of the 4,088 rows reclassified that day are
    // exactly this shape, `a word = hitz bat` among them. The blank start
    // carries no words of its own, so the multiset check below falls through to
    // the row's own known text — which is the only source an author may draw on.
    const current = learningScriptGenerator.glossAlignment(
      source, row.target_text, row[blockColumn], row.known_gloss_segments)
      || learningScriptGenerator.blankAlignment(source, row.target_text)
    if (!current) {
      return res.status(409).json({ error: 'This row has no alignment to change.' })
    }

    // The multiset check polices a RE-PAIRING: the same words, cut differently.
    // A revert submits no words at all, so there is nothing to compare — the
    // row simply stops carrying a human cut and goes back to what the generator
    // derives. Every other guard above still applies to it.
    //
    // TWO multisets are acceptable, and the second one is the point. What is
    // being segmented is the row's OWN KNOWN TEXT against the target's word
    // order — never a word-pairing exercise, and never a re-translation. The
    // derived start is usually that same text cut by LEGO blocks, so the two
    // agree and nothing changes. But a LEGO whose components do not occur in
    // its own target text derives its start from the COMPONENTS' glosses
    // instead, and then the only words on offer are words the sentence does not
    // contain: eus_for_eng `gogoratzen saiatzen ari naiz` starts as "to
    // remember" + "wishing to" while its known text reads "I'm trying to
    // remember". Under one multiset that row can never be given a correct
    // literal build — which is exactly the sentence Tom photographed on
    // 2026-08-13 and asked to see mapped. Accepting the row's own known words
    // unblocks it while keeping the guard's whole purpose: every word must come
    // from this row, and no edit may invent or re-translate one.
    const acceptable = [
      glossWordMultiset(current.segments),
      glossWordMultiset([{ known: row.known_text || '' }]),
    ]
    if (!reverting && !acceptable.includes(glossWordMultiset(segments))) {
      return res.status(400).json({
        error: 'A mapping edit may only move the existing words around, not change them.',
      })
    }

    const cleaned = reverting ? null : segments.map(s => ({ span: s.span, known: s.known.trim() }))

    const { error: updateError } = await supabase
      .from(table)
      .update({ known_gloss_segments: cleaned })
      .eq(idColumn, rowId)
      .eq('course_code', courseCode)

    if (updateError) throw updateError

    // Read back. An /api/* path that is not routed on this estate answers 200
    // with the SPA's HTML, so a 200 is not proof a write landed — the caller is
    // told what the database now holds and can check it itself.
    const { data: after, error: reReadError } = await supabase
      .from(table)
      .select('known_gloss_segments')
      .eq(idColumn, rowId)
      .eq('course_code', courseCode)
      .maybeSingle()
    if (reReadError) throw reReadError

    const stored = after ? after.known_gloss_segments : cleaned

    // On a revert the stored value is NULL, which is the point — so answer with
    // what the row now READS as, the generator's own derivation, and the caller
    // can render the honest state without a second request.
    const derived = reverting
      ? (learningScriptGenerator.glossAlignment(source, row.target_text, row[blockColumn], null)
         || learningScriptGenerator.blankAlignment(source, row.target_text))
      : null

    logger.info(
      `[Mapping] ${editor.email || 'unknown'} ${reverting ? 'reverted' : 're-segmented'} ` +
      `${source} ${rowId} in ${courseCode}`)

    io.to(`course:${courseCode}`).emit('mapping_updated', { courseCode, source, rowId })

    res.json({
      success: true,
      source,
      rowId,
      words,
      segments: reverting ? (derived ? derived.segments : []) : stored,
      segmented: !reverting,
      ...(reverting ? { reverted: true } : {}),
    })
  } catch (error) {
    logger.error(`[Mapping] Failed to re-segment ${source} ${rowId} in ${courseCode}:`, error.message)
    res.status(500).json({ error: 'The mapping could not be saved. Nothing was changed.' })
  }
})

app.get('/api/production/:courseCode/learning-journey', async (req, res) => {
  const { courseCode } = req.params
  const { maxLegos, offset, learnerView } = req.query

  // Parse query params
  const maxLegosNum = maxLegos ? parseInt(maxLegos, 10) : 50
  const offsetNum = offset ? parseInt(offset, 10) : 0
  // learnerView=1 applies the learner app's audio gates PER ITEM: an unvoiced
  // intro/debut cycle or phrase is skipped on its own while its round keeps its
  // number and everything else it has, exactly as the player does since
  // 2026-08-06. Default (production view) keeps + flags the gaps.
  const learnerViewFlag = learnerView === '1' || learnerView === 'true'

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    const [scriptResult, legoCountResult] = await Promise.all([
      learningScriptGenerator.generateLearningScript(
        supabase,
        courseCode,
        maxLegosNum,
        offsetNum,
        { learnerView: learnerViewFlag }
      ),
      supabase.from('course_legos').select('id', { count: 'exact', head: true }).eq('course_code', courseCode)
    ])

    const { rounds, allItems, stats, legosLoaded } = scriptResult
    const totalLegoCount = legoCountResult.count || 0

    logger.info(`Returning learning journey for ${courseCode}: ${rounds.length} rounds, ${allItems.length} items (${legosLoaded} LEGOs loaded, ${totalLegoCount} total in course)`)

    res.json({
      courseCode,
      rounds,
      allItems,
      stats,
      totalLegoCount,
      // Whether THIS caller may re-pair a row's word mapping. Read is open to
      // any course-scoped dashboard user; the write is editor/admin only, and
      // the viewer hides the editing gesture (not the mapping) when false.
      canEditMapping: canEditMapping(req.dashboardUser || await resolveDashboardUserCached(req)),
      pagination: {
        maxLegos: maxLegosNum,
        offset: offsetNum,
        returned: legosLoaded || rounds.length,
      }
    })
  } catch (err) {
    logger.error(`Failed to generate learning journey for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Search learning journey across ALL content (not paginated)
app.get('/api/production/:courseCode/learning-journey/search', async (req, res) => {
  const { courseCode } = req.params
  const { q } = req.query

  if (!q || q.trim().length === 0) {
    return res.json({ courseCode, rounds: [], allItems: [], stats: null, query: '' })
  }

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()
    const query = q.trim().toLowerCase()

    // Search course_legos for matching LEGOs (by known/target text or seed number)
    let matchingLegoIds = new Set()

    // 1. Search LEGOs by text
    const { data: legoMatches } = await supabase
      .from('course_legos')
      .select('lego_id, seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .or(`known_text.ilike.%${query}%,target_text.ilike.%${query}%`)

    if (legoMatches) {
      for (const m of legoMatches) matchingLegoIds.add(m.lego_id)
    }

    // 2. Search by seed number (e.g. "42" matches seed 42)
    if (/^\d+$/.test(query)) {
      const seedNum = parseInt(query, 10)
      const { data: seedMatches } = await supabase
        .from('course_legos')
        .select('lego_id')
        .eq('course_code', courseCode)
        .eq('seed_number', seedNum)
      if (seedMatches) {
        for (const m of seedMatches) matchingLegoIds.add(m.lego_id)
      }
    }

    // 3. Search practice phrases by text
    const { data: phraseMatches } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)
      .or(`known_text.ilike.%${query}%,target_text.ilike.%${query}%`)
      .limit(500)

    if (phraseMatches) {
      for (const m of phraseMatches) {
        // Derive lego_id from seed_number + lego_index (lego_id column may be null)
        const legoId = `S${String(m.seed_number).padStart(4,'0')}L${String(m.lego_index).padStart(2,'0')}`
        matchingLegoIds.add(legoId)
      }
    }

    if (matchingLegoIds.size === 0) {
      return res.json({ courseCode, rounds: [], allItems: [], stats: null, query: q })
    }

    // Generate full journey (all LEGOs) then filter to matching rounds
    const { rounds, allItems, stats } = await learningScriptGenerator.generateLearningScript(
      supabase,
      courseCode,
      9999, // Load all
      0
    )

    const filteredRounds = rounds.filter(r => matchingLegoIds.has(r.legoId))
    const filteredItems = []
    for (const r of filteredRounds) {
      filteredItems.push(...r.items)
    }

    logger.info(`Journey search "${query}" for ${courseCode}: ${matchingLegoIds.size} LEGOs, ${filteredRounds.length} rounds`)

    res.json({
      courseCode,
      rounds: filteredRounds,
      allItems: filteredItems,
      stats: { ...stats, roundsGenerated: filteredRounds.length, totalItems: filteredItems.length },
      query: q
    })
  } catch (err) {
    logger.error(`Failed to search learning journey for ${courseCode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Mark LEGO as new/not-new
app.post('/api/production/:courseCode/lego/:legoId/mark-new', async (req, res) => {
  const { courseCode, legoId } = req.params
  const { isNew } = req.body
  try {
    // Parse legoId: "S0001L02" -> seedNumber=1, legoIndex=2
    const seedNumber = courseDataService.parseSeedNumber(legoId)
    const legoIndex = courseDataService.parseLegoIndex(legoId)

    if (!seedNumber || !legoIndex) {
      return res.status(400).json({ error: `Invalid legoId format: ${legoId}` })
    }

    const result = await courseDataService.markLegoAsNew(courseCode, seedNumber, legoIndex, isNew)
    res.json({
      success: true,
      lego: result
    })
  } catch (error) {
    logger.error(`Error marking lego ${legoId} as new:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// PHRASE EDITING ENDPOINT
// =============================================================================

// Update a practice phrase (text editing with regeneration flagging)
// PATCH /api/production/:courseCode/phrase/:phraseId
// Body: { known_text?, target_text?, flag_for_regeneration? }
app.patch('/api/production/:courseCode/phrase/:phraseId', async (req, res) => {
  const { courseCode, phraseId } = req.params
  const { known_text, target_text, flag_for_regeneration, introduce } = req.body

  try {
    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // First, get the existing phrase to merge metadata
    const { data: existingPhrase, error: fetchError } = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('id', phraseId)
      .eq('course_code', courseCode)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: `Phrase ${phraseId} not found in course ${courseCode}` })
      }
      throw fetchError
    }

    // Build the update object
    const updateData = {}

    if (known_text !== undefined) {
      updateData.known_text = known_text
    }

    if (target_text !== undefined) {
      updateData.target_text = target_text
    }

    if (introduce !== undefined) {
      updateData.introduce = !!introduce
    }

    // Handle regeneration flagging in metadata
    if (flag_for_regeneration !== undefined) {
      const existingMetadata = existingPhrase.metadata || {}
      updateData.metadata = {
        ...existingMetadata,
        needs_regeneration: flag_for_regeneration,
        regeneration_flagged_at: flag_for_regeneration ? new Date().toISOString() : null
      }
    }

    // If no updates provided, return error
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' })
    }

    // Perform the update
    const { data: updatedPhrase, error: updateError } = await supabase
      .from('course_practice_phrases')
      .update(updateData)
      .eq('id', phraseId)
      .eq('course_code', courseCode)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    logger.info(`Updated phrase ${phraseId} in ${courseCode}: ${JSON.stringify(updateData)}`)

    // Emit WebSocket event for real-time updates
    io.to(`course:${courseCode}`).emit('phrase_updated', {
      courseCode,
      phraseId,
      phrase: updatedPhrase
    })

    res.json({
      success: true,
      phrase: updatedPhrase
    })
  } catch (error) {
    logger.error(`Error updating phrase ${phraseId}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// RECORDING OPTIMIZER ENDPOINTS
// =============================================================================

// Import the recording optimizer algorithm
const { generateRecordingScript } = require('../tools/recording-optimizer/generate-recording-script.cjs')
const { buildScriptItems, isNaturalOnly } = require('./recording-script-items.cjs')

// GET /api/production/:courseCode/recording-optimizer
// Runs the GuaranteedCoverage algorithm to find minimum recording set
app.get('/api/production/:courseCode/recording-optimizer', async (req, res) => {
  try {
    const { courseCode } = req.params

    logger.log(`[Recording Optimizer] Generating script for ${courseCode}`)

    // Run the algorithm (suppress console output by redirecting)
    const originalLog = console.log
    const logs = []
    console.log = (...args) => logs.push(args.join(' '))

    const result = await generateRecordingScript(courseCode, { verbose: false })

    console.log = originalLog

    if (!result) {
      return res.status(404).json({ error: 'No LEGOs found for course. Run Course Builder first.' })
    }

    // Format response for dashboard
    res.json({
      courseCode,
      generatedAt: result.generatedAt,
      statistics: {
        totalLegos: result.statistics.totalLegos,
        phrasesToRecord: result.recordingScript.phrases.length,
        directRecord: result.directRecord.items.length,
        totalRecordings: result.statistics.totalRecordings,
        coveragePercent: result.statistics.coveragePercent,
        reductionPercent: result.statistics.reductionPercent,
        estimatedMinutes: result.statistics.estimatedMinutes,
        totalPhrases: result.statistics.totalLegos * 10 // Approx phrases generatable
      },
      recordingScript: result.recordingScript.phrases.slice(0, 50), // First 50 for preview
      directRecord: result.directRecord.items.slice(0, 20), // First 20 for preview
      fullScript: result // Full data if needed
    })
  } catch (error) {
    logger.error('Error running recording optimizer:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/recording-script
// Returns the optimizer's script formatted for the autocue — interleaved normal/slow pairs
// with direct record items appended. Each phrase appears twice: natural then slow cadence.
app.get('/api/production/:courseCode/recording-script', async (req, res) => {
  try {
    const { courseCode } = req.params
    // Default: skip anything already spliceable from existing HUMAN
    // recordings, so a course with real recording history (e.g. cym) shows
    // only the actual gap, not the same from-scratch script every time.
    // ?full=true opts back into the original unfiltered script.
    const excludeRecorded = req.query.full !== 'true'
    // ?maxSeed=N caps the script to seeds 1..N. The optimizer orders by LEGO
    // coverage, so an uncapped 668-seed course opens somewhere in the 300s —
    // fine for a full campaign, wrong for a test session that wants something
    // listenable from the start. No param = whole course (existing behaviour).
    const rawMaxSeed = parseInt(req.query.maxSeed, 10)
    const maxSeed = Number.isInteger(rawMaxSeed) && rawMaxSeed > 0 ? rawMaxSeed : null
    // Which voice slot this script is FOR. Only matters when excludeRecorded is
    // on: the "already recorded" pool must be that slot's own takes, since each
    // target voice needs its own complete set. Unknown/absent → target1, the
    // historical behaviour.
    const role = ['target1', 'target2'].includes(req.query.role) ? req.query.role : 'target1'
    // ?order=course reads the SAME selected lines in course sequence (seed 1
    // upwards) instead of coverage order, and — since Kai's ruling of
    // 2026-08-21 — reads each of them ONCE, at natural speed, with no slow
    // pass. Selection and chunking are still untouched. Default stays
    // 'coverage', so nothing changes for anyone who doesn't ask for it.
    const order = req.query.order === 'course' ? 'course' : 'coverage'
    const naturalOnly = isNaturalOnly(order)

    logger.log(`[Recording Script] Generating ${naturalOnly ? 'natural-only' : 'interleaved'} script for ${courseCode} [${role}]${excludeRecorded ? ' (gap only)' : ' (full)'}${maxSeed ? ` (seeds 1-${maxSeed})` : ''} (${order} order)`)

    // Run the optimizer (suppress console output)
    const originalLog = console.log
    const logs = []
    console.log = (...args) => logs.push(args.join(' '))

    const result = await generateRecordingScript(courseCode, { verbose: false, excludeRecorded, maxSeed, role, order })

    console.log = originalLog

    if (!result) {
      return res.status(404).json({
        error: maxSeed
          ? `No LEGOs found in seeds 1-${maxSeed} for ${courseCode}.`
          : 'No LEGOs found for course. Run Course Builder first.'
      })
    }

    const phrases = result.recordingScript.phrases
    const directItems = result.directRecord.items

    // Shape the reading list. In coverage order each line is read twice
    // (natural, then slow); in course order it is read ONCE, natural only —
    // see services/recording-script-items.cjs for what that costs downstream.
    const items = buildScriptItems({ phrases, directItems, order })

    // Estimate: ~6 seconds per item (read + pause)
    const estimatedMinutes = Math.round((items.length * 6) / 60)

    res.json({
      courseCode,
      maxSeed,
      role,
      order,
      // So the recorder can say so on screen rather than infer it from the
      // absence of amber lines halfway through a session.
      naturalOnly,
      totalItems: items.length,
      totalPhrases: phrases.length,
      totalDirect: directItems.length,
      estimatedMinutes,
      items
    })
  } catch (error) {
    logger.error('Error generating recording script:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// EXPORT WORKFLOW ENDPOINTS (Legacy Manifest Publication)
// =============================================================================

const s3DeployService = require('./s3-deploy-service.cjs')

// GET /api/production/:courseCode/export-state
// Get current export workflow state for a course
app.get('/api/production/:courseCode/export-state', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()
    const { data, error } = await supabase
      .from('course_export_states')
      .select('*')
      .eq('course_code', courseCode)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // Return empty state if not found
    if (!data) {
      return res.json({
        courseCode,
        manifestGenerated: false,
        s3Verified: false,
        manifestPublished: false,
        audioDeployed: false
      })
    }

    res.json({
      courseCode: data.course_code,
      manifestGenerated: data.manifest_generated,
      manifestGeneratedAt: data.manifest_generated_at,
      s3Verified: data.s3_verified,
      s3VerifiedAt: data.s3_verified_at,
      manifestPublished: data.manifest_published,
      manifestPublishedAt: data.manifest_published_at,
      audioDeployed: data.audio_deployed,
      audioDeployedAt: data.audio_deployed_at,
      manifestVersion: data.manifest_version,
      manifestStatus: data.manifest_status,
      s3Verification: data.s3_verification,
      publishCourseConfigsPath: data.publish_course_configs_path,
      publishApidevFilename: data.publish_apidev_filename,
      deployPlan: data.deploy_plan,
      deployExecutedAt: data.deploy_executed_at,
      updatedAt: data.updated_at,
      pendingManifestPath: data.pending_manifest_path,
      generatedOnMachine: data.generated_on_machine
    })
  } catch (error) {
    logger.error('Error getting export state:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/export-state
// Update export workflow state for a course
app.post('/api/production/:courseCode/export-state', async (req, res) => {
  try {
    const { courseCode } = req.params
    const updates = req.body

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const supabase = supabaseClient.getClient()

    // Build update object with snake_case keys
    const updateData = { course_code: courseCode }

    if ('manifestGenerated' in updates) updateData.manifest_generated = updates.manifestGenerated
    if ('manifestGeneratedAt' in updates) updateData.manifest_generated_at = updates.manifestGeneratedAt
    if ('s3Verified' in updates) updateData.s3_verified = updates.s3Verified
    if ('s3VerifiedAt' in updates) updateData.s3_verified_at = updates.s3VerifiedAt
    if ('manifestPublished' in updates) updateData.manifest_published = updates.manifestPublished
    if ('manifestPublishedAt' in updates) updateData.manifest_published_at = updates.manifestPublishedAt
    if ('audioDeployed' in updates) updateData.audio_deployed = updates.audioDeployed
    if ('audioDeployedAt' in updates) updateData.audio_deployed_at = updates.audioDeployedAt
    if ('manifestVersion' in updates) updateData.manifest_version = updates.manifestVersion
    if ('manifestStatus' in updates) updateData.manifest_status = updates.manifestStatus
    if ('manifestHash' in updates) updateData.manifest_hash = updates.manifestHash
    if ('manifestSeedCount' in updates) updateData.manifest_seed_count = updates.manifestSeedCount
    if ('manifestLegoCount' in updates) updateData.manifest_lego_count = updates.manifestLegoCount
    if ('manifestAudioCount' in updates) updateData.manifest_audio_count = updates.manifestAudioCount
    if ('s3Verification' in updates) updateData.s3_verification = updates.s3Verification
    if ('publishCourseConfigsPath' in updates) updateData.publish_course_configs_path = updates.publishCourseConfigsPath
    if ('publishApidevFilename' in updates) updateData.publish_apidev_filename = updates.publishApidevFilename
    if ('deployPlan' in updates) updateData.deploy_plan = updates.deployPlan
    if ('deployExecutedAt' in updates) updateData.deploy_executed_at = updates.deployExecutedAt
    if ('pendingManifestPath' in updates) updateData.pending_manifest_path = updates.pendingManifestPath
    if ('generatedOnMachine' in updates) updateData.generated_on_machine = updates.generatedOnMachine

    const { data, error } = await supabase
      .from('course_export_states')
      .upsert(updateData, { onConflict: 'course_code' })
      .select()
      .single()

    if (error) throw error

    logger.info(`Export state updated for ${courseCode}`)
    res.json({ success: true, state: data })
  } catch (error) {
    logger.error('Error updating export state:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/export-legacy-with-state
// Step 1: Generate legacy manifest and save to temp with state tracking
app.post('/api/production/:courseCode/export-legacy-with-state', async (req, res) => {
  const { courseCode } = req.params
  try {
    const { withAudio = false, useAsIs = false } = req.body

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Get course metadata
    const course = await supabaseClient.getCourse(courseCode)
    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` })
    }

    const knownCode = languageCodeService.legacyToStandard(course.known_lang)
    const targetCode = languageCodeService.legacyToStandard(course.target_lang)
    const courseConfigsId = buildCourseConfigsId(courseCode, course.known_lang, course.target_lang, knownCode, targetCode)

    // Import the legacy manifest generator
    const { generateLegacyManifest, validateManifest } = require('./phases/generate-legacy-manifest.cjs')

    logger.info(`Generating legacy manifest for ${courseCode} (courseConfigsId: ${courseConfigsId}, withAudio: ${withAudio}, useAsIs: ${useAsIs})`)

    // Generate a job ID for audio generation tracking
    const audioJobId = withAudio ? `legacy-audio-${courseCode}-${Date.now()}` : null

    // If withAudio, run audio generation in background and return response immediately
    if (withAudio && audioJobId) {
      // Generate manifest WITHOUT audio first (fast)
      const { manifest, audioGenerationWarnings: noAudioWarnings, welcomeMissing, missingSamples } = await generateLegacyManifest(courseCode, { withAudio: false })

      // Validate and save manifest
      const validation = validateManifest(manifest)
      const seedCount = manifest.slices?.[0]?.seeds?.length || 0
      const orderedEnc = manifest.slices?.[0]?.orderedEncouragements?.length || 0
      const pooledEnc = manifest.slices?.[0]?.pooledEncouragements?.length || 0

      const legoIds = new Set()
      for (const seed of manifest.slices[0]?.seeds || []) {
        for (const item of seed.introduction_items || []) {
          if (item.node?.id) legoIds.add(item.node.id)
        }
      }
      const legoCount = legoIds.size

      const audioIds = new Set()
      for (const variants of Object.values(manifest.slices[0]?.samples || {})) {
        for (const audio of variants) {
          if (audio.id) audioIds.add(audio.id)
        }
      }
      const audioCount = audioIds.size

      // Save manifest
      const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
      await fs.ensureDir(path.dirname(manifestPath))
      await fs.writeJson(manifestPath, manifest, { spaces: 2 })
      logger.info(`Saved pending manifest to: ${manifestPath}`)

      // Save to Supabase
      const supabase = supabaseClient.getClient()
      await supabase
        .from('course_export_states')
        .upsert({
          course_code: courseCode,
          manifest_generated: true,
          manifest_generated_at: new Date().toISOString(),
          manifest_seed_count: seedCount,
          manifest_lego_count: legoCount,
          manifest_audio_count: audioCount,
          pending_manifest_path: manifestPath,
          generated_on_machine: require('os').hostname(),
          s3_verified: false,
          s3_verified_at: null,
          s3_verification: null,
          manifest_published: false,
          manifest_published_at: null
        }, { onConflict: 'course_code' })

      logger.info(`Export state saved for ${courseCode}`)

      // Return response IMMEDIATELY so frontend can connect WebSocket
      res.json({
        success: true,
        courseCode,
        courseConfigsId,
        stats: {
          seeds: seedCount,
          legos: legoCount,
          audio: audioCount,
          orderedEncouragements: orderedEnc,
          pooledEncouragements: pooledEnc
        },
        validation: {
          valid: validation.valid,
          summary: validation.summary
        },
        savedToState: true,
        pendingPath: manifestPath,
        warnings: [
          ...(welcomeMissing ? ['Welcome audio missing - course will use placeholder introduction'] : []),
          ...(missingSamples && missingSamples.length > 0
            ? [`${missingSamples.length} sample audio role(s) missing — manifest will ship with gaps. First few: ` +
                missingSamples.slice(0, 5).map(m => `[${m.role}] "${m.text.slice(0, 50)}"`).join('; ') +
                (missingSamples.length > 5 ? ` (+${missingSamples.length - 5} more)` : '')]
            : [])
        ],
        missingSamples: missingSamples || [],
        audioJobId: audioJobId
      })

      // NOW generate combined audio in background
      logger.info(`[AudioProgress] Starting background audio generation for job ${audioJobId}`)

      // Re-generate manifest with audio (will use the existing one and just add combined audio)
      const { manifest: finalManifest, audioGenerationWarnings } = await generateLegacyManifest(courseCode, {
        withAudio: true,
        useAsIs,
        onAudioProgress: (completed, total) => {
          logger.info(`[AudioProgress] Emitting progress: ${completed}/${total} for job ${audioJobId}`)
          io.emit('legacyAudio:progress', { jobId: audioJobId, completed, total, courseCode })
        }
      })

      // Update manifest with combined audio
      await fs.writeJson(manifestPath, finalManifest, { spaces: 2 })
      logger.info(`Updated manifest with combined presentations: ${manifestPath}`)

      // Emit completion event
      const skippedCount = audioGenerationWarnings?.skippedCount || 0
      const skippedItems = audioGenerationWarnings?.skippedItems || []
      logger.info(`[AudioProgress] Emitting completion for job ${audioJobId}, skipped: ${skippedCount}`)
      io.emit('legacyAudio:completed', {
        jobId: audioJobId,
        courseCode,
        successful: 704 - skippedCount,
        skippedCount,
        skipped: skippedItems
      })

      return // Already sent response
    }

    // Normal path (withAudio: false)
    const { manifest, audioGenerationWarnings, welcomeMissing, missingSamples } = await generateLegacyManifest(courseCode, { withAudio: false })

    // Validate the manifest
    const validation = validateManifest(manifest)

    // Compute stats
    const seedCount = manifest.slices?.[0]?.seeds?.length || 0
    const orderedEnc = manifest.slices?.[0]?.orderedEncouragements?.length || 0
    const pooledEnc = manifest.slices?.[0]?.pooledEncouragements?.length || 0

    // Count LEGOs (unique LEGO IDs)
    const legoIds = new Set()
    for (const seed of manifest.slices[0]?.seeds || []) {
      for (const item of seed.introduction_items || []) {
        if (item.node?.id) legoIds.add(item.node.id)
      }
    }
    const legoCount = legoIds.size

    // Count audio (all UUIDs in samples)
    const audioIds = new Set()
    for (const variants of Object.values(manifest.slices[0]?.samples || {})) {
      for (const audio of variants) {
        if (audio.id) audioIds.add(audio.id)
      }
    }
    const audioCount = audioIds.size

    // Save manifest to temp/course_export_states
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    await fs.ensureDir(path.dirname(manifestPath))
    await fs.writeJson(manifestPath, manifest, { spaces: 2 })
    logger.info(`Saved pending manifest to: ${manifestPath}`)

    // Save to Supabase export state
    const supabase = supabaseClient.getClient()
    await supabase
      .from('course_export_states')
      .upsert({
        course_code: courseCode,
        manifest_generated: true,
        manifest_generated_at: new Date().toISOString(),
        manifest_seed_count: seedCount,
        manifest_lego_count: legoCount,
        manifest_audio_count: audioCount,
        pending_manifest_path: manifestPath,
        generated_on_machine: require('os').hostname(),
        // Clear previous verification state
        s3_verified: false,
        s3_verified_at: null,
        s3_verification: null,
        manifest_published: false,
        manifest_published_at: null
      }, { onConflict: 'course_code' })

    logger.info(`Export state saved for ${courseCode}`)

    res.json({
      success: true,
      courseCode,
      courseConfigsId,
      stats: {
        seeds: seedCount,
        legos: legoCount,
        audio: audioCount,
        orderedEncouragements: orderedEnc,
        pooledEncouragements: pooledEnc
      },
      validation: {
        valid: validation.valid,
        summary: validation.summary
      },
      savedToState: true,
      pendingPath: manifestPath,
      warnings: [
        ...(audioGenerationWarnings ? [audioGenerationWarnings.message] : []),
        ...(welcomeMissing ? ['Welcome audio missing - course will use placeholder introduction'] : []),
        ...(missingSamples && missingSamples.length > 0
          ? [`${missingSamples.length} sample audio role(s) missing — manifest will ship with gaps. First few: ` +
              missingSamples.slice(0, 5).map(m => `[${m.role}] "${m.text.slice(0, 50)}"`).join('; ') +
              (missingSamples.length > 5 ? ` (+${missingSamples.length - 5} more)` : '')]
          : [])
      ],
      missingSamples: missingSamples || [],
      audioJobId: audioJobId // Will be null if withAudio=false
    })
  } catch (error) {
    logger.error(`Error generating legacy manifest for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/production/:courseCode/export-state
// Reset export workflow state for a course
app.delete('/api/production/:courseCode/export-state', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Delete local temp files (manifest and durations only)
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    const durationsPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_extracted_durations.json`)

    if (fs.existsSync(manifestPath)) {
      await fs.remove(manifestPath)
      logger.info(`Deleted pending manifest for ${courseCode}`)
    }

    if (fs.existsSync(durationsPath)) {
      await fs.remove(durationsPath)
      logger.info(`Deleted extracted durations for ${courseCode}`)
    }

    // Delete from Supabase
    const supabase = supabaseClient.getClient()
    const { error } = await supabase
      .from('course_export_states')
      .delete()
      .eq('course_code', courseCode)

    if (error && error.code !== 'PGRST116') {
      // Ignore "not found" error
      throw error
    }

    logger.info(`Export state reset for ${courseCode}`)
    res.json({ success: true, message: 'Export state reset successfully' })
  } catch (error) {
    logger.error('Error resetting export state:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/pending-manifest
// Download pending manifest for review before publishing
app.get('/api/production/:courseCode/pending-manifest', async (req, res) => {
  try {
    const { courseCode } = req.params

    // Load manifest from temp/course_export_states
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'No pending manifest found. Generate manifest first (Step 1).' })
    }

    const manifest = await fs.readJson(manifestPath)
    res.json(manifest)
  } catch (error) {
    logger.error(`Get pending manifest error for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/export-state/manifest
// Re-download manifest (Step 1 - Redownload button)
app.get('/api/production/:courseCode/export-state/manifest', async (req, res) => {
  try {
    const { courseCode } = req.params

    // Check if manifest exists in temp folder
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'No pending manifest found. Generate manifest first (Step 1).' })
    }

    const manifest = await fs.readJson(manifestPath)

    // Get generation info from Supabase
    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      const { data: exportState } = await supabase
        .from('course_export_states')
        .select('manifest_generated_at, manifest_hash')
        .eq('course_code', courseCode)
        .single()

      res.json({
        manifest,
        generatedAt: exportState?.manifest_generated_at || null,
        hash: exportState?.manifest_hash || null
      })
    } else {
      res.json({ manifest })
    }
  } catch (error) {
    logger.error('Error getting cached manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/publish-manifest
// Step 3: Publish manifest to course-configs repo and/or apidev
app.post('/api/production/:courseCode/publish-manifest', async (req, res) => {
  try {
    const { courseCode } = req.params
    const {
      version,
      status = 'published',
      commitToCourseConfigs = true,
      scpToApidev = false
    } = req.body

    if (!version) {
      return res.status(400).json({ error: 'Version is required' })
    }

    // Check if manifest exists
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'No pending manifest found. Generate and verify first.' })
    }

    const manifest = await fs.readJson(manifestPath)

    // Block publishing if any samples have duration 0 (combined presentations not yet fixed)
    const zeroDurationSamples = []
    const manifestSamples = manifest.slices?.[0]?.samples || {}
    for (const [text, variants] of Object.entries(manifestSamples)) {
      for (const variant of variants) {
        if (variant.id && (!variant.duration || variant.duration === 0)) {
          zeroDurationSamples.push({ id: variant.id, text: text.substring(0, 80) })
        }
      }
    }
    // The welcome sits at top-level `introduction`, not in slices[0].samples, so the loop
    // above never sees it — a zero-duration welcome used to ship unchallenged.
    if (manifest.introduction?.id && !manifest.introduction.duration) zeroDurationSamples.push({ id: manifest.introduction.id, text: 'introduction (welcome)' })
    if (zeroDurationSamples.length > 0) {
      logger.warn(`[PUBLISH] Blocked: ${zeroDurationSamples.length} samples have duration 0`)
      return res.status(400).json({
        error: `Cannot publish: ${zeroDurationSamples.length} samples have duration 0. Run "Verify S3" to fix durations first.`,
        zeroDurationCount: zeroDurationSamples.length,
        examples: zeroDurationSamples.slice(0, 5)
      })
    }

    logger.info(`Publishing manifest for ${courseCode}: v${version}, status=${status}`)

    // Use publish manifest service
    const result = await publishManifestService.publishManifest(manifest, {
      version,
      status,
      commitToCourseConfigs,
      scpToApidev
    })

    if (result.success) {
      // Update export state
      if (supabaseClient.isInitialized()) {
        const supabase = supabaseClient.getClient()
        await supabase
          .from('course_export_states')
          .upsert({
            course_code: courseCode,
            manifest_published: true,
            manifest_published_at: new Date().toISOString(),
            manifest_version: version,
            manifest_status: status,
            publish_course_configs_path: result.courseConfigs?.filePath || null,
            publish_apidev_filename: result.apidev?.filename || null
          }, { onConflict: 'course_code' })
      }

      logger.info(`Manifest published for ${courseCode}: v${version}`)
    }

    res.json(result)
  } catch (error) {
    logger.error('Error publishing manifest:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/publish-manifest/version
// Step 3: Check course-configs repo and suggest next version
app.get('/api/production/:courseCode/publish-manifest/version', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const course = await supabaseClient.getCourse(courseCode)
    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` })
    }

    const knownCode = languageCodeService.legacyToStandard(course.known_lang)
    const targetCode = languageCodeService.legacyToStandard(course.target_lang)
    const courseConfigsId = buildCourseConfigsId(courseCode, course.known_lang, course.target_lang, knownCode, targetCode)

    const repoCheck = publishManifestService.checkCourseConfigsRepo()
    if (repoCheck.exists) publishManifestService.pullAuthorBranch()
    const versionInfo = publishManifestService.suggestVersion(courseConfigsId)

    res.json({
      courseCode,
      courseConfigsId,
      repoAvailable: repoCheck.exists,
      repoError: repoCheck.error,
      ...versionInfo
    })
  } catch (error) {
    logger.error('Error getting version suggestion:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/manifest-diff
// Step 3: Compare pending manifest against published version in course-configs
app.get('/api/production/:courseCode/manifest-diff', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    const course = await supabaseClient.getCourse(courseCode)
    if (!course) {
      return res.status(404).json({ error: `Course ${courseCode} not found` })
    }

    const knownCode = languageCodeService.legacyToStandard(course.known_lang)
    const targetCode = languageCodeService.legacyToStandard(course.target_lang)
    const courseConfigsId = buildCourseConfigsId(courseCode, course.known_lang, course.target_lang, knownCode, targetCode)

    // Load pending manifest
    const pendingPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    if (!fs.existsSync(pendingPath)) {
      return res.status(404).json({ error: 'No pending manifest found. Generate one first (Step 1).' })
    }
    const pending = await fs.readJson(pendingPath)

    // Load published manifest from course-configs (pull latest first)
    const repoCheck = publishManifestService.checkCourseConfigsRepo()
    if (!repoCheck.exists) {
      return res.json({ isNewCourse: true, suggestedVersion: '1.0.0', suggestedBump: 'none', major: [], minor: [], patch: [], stats: {} })
    }
    publishManifestService.pullAuthorBranch()

    const publishedPath = path.join(repoCheck.path, 'Courses', `${courseConfigsId}.json`)
    if (!fs.existsSync(publishedPath)) {
      return res.json({ isNewCourse: true, suggestedVersion: '1.0.0', suggestedBump: 'none', major: [], minor: [], patch: [], stats: {} })
    }

    const published = await fs.readJson(publishedPath)

    // Run diff
    const diff = manifestDiffService.diffManifests(published, pending)
    diff.courseConfigsId = courseConfigsId

    logger.info(`[ManifestDiff] ${courseCode}: ${diff.suggestedBump} bump (${diff.major.length} major, ${diff.minor.length} minor, ${diff.patch.length} patch)`)
    res.json(diff)
  } catch (error) {
    logger.error('Error computing manifest diff:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/course-configs/status
// Get status of course-configs repo (commits ahead, branch, etc.)
app.get('/api/production/course-configs/status', async (req, res) => {
  try {
    const status = publishManifestService.getRepoStatus()
    res.json(status)
  } catch (error) {
    logger.error('Error getting repo status:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/course-configs/push
// Push course-configs commits to remote
app.post('/api/production/course-configs/push', async (req, res) => {
  try {
    logger.info('Pushing course-configs to remote...')
    const result = publishManifestService.pushToRemote()

    if (result.success) {
      res.json(result)
    } else {
      res.status(500).json(result)
    }
  } catch (error) {
    logger.error('Error pushing to remote:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/stage-deploy
// Step 3 (sub-step): Run apidev `./check -e stage deploy` for this course.
// Pipes services/stage-deploy.py over SSH; the pexpect script drives the
// 4-prompt interaction and emits __SD__:... events on stderr.
//
// Body: { deleteProgress?: boolean, skipChecks?: boolean }
//   deleteProgress (default true)  — answer to "Delete progress entries?"
//   skipChecks (default false)     — answer "n" to "Run checks?" (retry path
//                                    after a mid-cp crash that's already had
//                                    a successful checks pass)
app.post('/api/production/:courseCode/stage-deploy', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { deleteProgress = true, skipChecks = false } = req.body || {}

    // Only block on a job that's actually still running. Cancelled/failed/
    // succeeded jobs linger in the map for 60s (see the close handler) so the
    // cancel endpoint can still find them — but that linger shouldn't prevent
    // a fresh retry. Use job.state, not .has().
    const existing = stageDeployJobs.get(courseCode)
    if (existing && existing.state === 'running') {
      return res.status(409).json({
        error: 'Stage deploy already running for this course',
        jobId: existing.jobId
      })
    }
    // Clear any terminal (cancelled/failed/success/identical) entry now so the
    // setTimeout cleanup doesn't race with the new job we're about to insert.
    if (existing) stageDeployJobs.delete(courseCode)

    // Block if course-configs has unpushed commits — same guard Step 3→4 uses
    // for advancing the wizard. If we deploy with unpushed commits, apidev's
    // `./check` reads a stale en-XX.json and the live manifest diverges from
    // what we just published locally.
    try {
      const repoStatus = publishManifestService.getRepoStatus()
      if (repoStatus.success && repoStatus.commitsAhead > 0) {
        return res.status(412).json({
          error: 'course-configs has unpushed commits — push first',
          commitsAhead: repoStatus.commitsAhead,
          needsPush: true
        })
      }
    } catch (err) {
      // Non-fatal: if the status check itself errors, let the deploy proceed
      // rather than blocking on a transient repo-read issue.
      logger.warn(`[StageDeploy] could not read course-configs status: ${err.message}`)
    }

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Derive the courseConfigsId (e.g. fra_ca_for_eng -> en-fr-ca)
    const course = await supabaseClient.getCourse(courseCode)
    if (!course) return res.status(404).json({ error: `Course ${courseCode} not found` })

    const knownCode = languageCodeService.legacyToStandard(course.known_lang)
    const targetCode = languageCodeService.legacyToStandard(course.target_lang)
    const courseConfigsId = buildCourseConfigsId(
      courseCode, course.known_lang, course.target_lang, knownCode, targetCode
    )

    // Strict whitelist — interpolated into the SSH-relayed command
    if (!/^[a-z0-9-]+$/.test(courseConfigsId)) {
      return res.status(400).json({ error: `Refusing to deploy with unsafe courseConfigsId: ${courseConfigsId}` })
    }

    const scriptPath = path.join(__dirname, 'stage-deploy.py')
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ error: `stage-deploy.py not found at ${scriptPath}` })
    }

    const jobId = `stage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const startedAt = new Date().toISOString()

    // Build remote command. courseConfigsId is whitelisted; flags are constants.
    const flags = []
    if (deleteProgress) flags.push('--delete-progress')
    if (skipChecks) flags.push('--skip-checks')
    const remoteCmd = `python3 - ${courseConfigsId}${flags.length ? ' ' + flags.join(' ') : ''}`

    logger.info(`[StageDeploy] ${courseCode} (${courseConfigsId}) jobId=${jobId} remote: ${remoteCmd}`)

    // Pipe the script via stdin: `cat scriptPath | ssh ... "remoteCmd"`
    const { spawn: spawnProc } = require('child_process')
    const cat = spawnProc('cat', [scriptPath])
    const ssh = spawnProc('ssh', [
      '-o', 'BatchMode=yes',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=4',
      'ssi@apidev',
      remoteCmd
    ])
    cat.stdout.pipe(ssh.stdin)
    cat.on('error', (err) => logger.error(`[StageDeploy] cat error: ${err.message}`))

    const job = {
      jobId, courseCode, courseConfigsId,
      sshProc: ssh, catProc: cat,
      startedAt, state: 'running',
      sawChecksPassed: false, sawNewCourse: false,
      skipChecks, deleteProgress
    }
    stageDeployJobs.set(courseCode, job)

    io.emit('stageDeploy:started', {
      jobId, courseCode, courseConfigsId, startedAt, skipChecks, deleteProgress
    })

    // Line-buffered stderr parser for __SD__: events
    // Split on \r, \n, and \r\n so in-place progress updates (./check's S3
    // check writes "Checking N/total..\r..\r..") flush as they happen.
    let stderrBuf = ''
    ssh.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString()
      const lines = stderrBuf.split(/\r\n|\n|\r/)
      stderrBuf = lines.pop()
      for (const line of lines) handleStderrLine(job, line)
    })

    // Line-buffered stdout — forward to UI as log
    let stdoutBuf = ''
    ssh.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString()
      const lines = stdoutBuf.split(/\r\n|\n|\r/)
      stdoutBuf = lines.pop()
      for (const line of lines) {
        if (line === '') continue // collapse runs of separators
        io.emit('stageDeploy:log', { jobId, courseCode, stream: 'stdout', line })
      }
    })

    ssh.on('error', (err) => {
      logger.error(`[StageDeploy] ssh spawn error: ${err.message}`)
    })

    ssh.on('close', (code, signal) => {
      // Flush partial buffers
      if (stdoutBuf) io.emit('stageDeploy:log', { jobId, courseCode, stream: 'stdout', line: stdoutBuf })
      if (stderrBuf) handleStderrLine(job, stderrBuf)

      // If no terminal event was seen, derive state from exit code
      if (job.state === 'running') {
        job.state = (code === 0) ? 'success' : 'failed'
      }

      io.emit('stageDeploy:closed', {
        jobId, courseCode,
        exitCode: code, signal,
        finalState: job.state,
        sawChecksPassed: job.sawChecksPassed,
        sawNewCourse: job.sawNewCourse
      })

      logger.info(`[StageDeploy] ${courseCode} closed exit=${code} signal=${signal} state=${job.state}`)

      // Keep the job entry around briefly so the cancel endpoint can find it
      setTimeout(() => stageDeployJobs.delete(courseCode), 60 * 1000)
    })

    res.json({
      success: true,
      jobId, courseCode, courseConfigsId, startedAt,
      skipChecks, deleteProgress
    })
  } catch (error) {
    logger.error('[StageDeploy] error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Parse a single line from stage-deploy.py's stderr stream. __SD__:events
// drive websocket state updates; other lines are forwarded as log noise.
function handleStderrLine(job, line) {
  if (!line) return
  const { jobId, courseCode } = job
  if (line.startsWith('__SD__:')) {
    const m = line.match(/^__SD__:(\w+)(?:\s+(.+))?$/)
    if (!m) return
    const event = m[1]
    let payload = {}
    if (m[2]) {
      try { payload = JSON.parse(m[2]) } catch (e) { /* malformed, ignore */ }
    }
    switch (event) {
      case 'start':       io.emit('stageDeploy:start', { jobId, courseCode, ...payload }); break
      case 'newCourse':   job.sawNewCourse = true
                          io.emit('stageDeploy:newCourse', { jobId, courseCode, ...payload }); break
      case 'identical':   io.emit('stageDeploy:identical', { jobId, courseCode }); break
      case 'checksPassed':job.sawChecksPassed = true
                          io.emit('stageDeploy:checksPassed', { jobId, courseCode }); break
      case 'deployed':    io.emit('stageDeploy:deployed', { jobId, courseCode }); break
      case 'done':        // Don't overwrite if 'identical' already set this state
                          if (job.state !== 'success') job.state = 'success'
                          io.emit('stageDeploy:done', { jobId, courseCode }); break
      case 'failed':      job.state = 'failed'
                          io.emit('stageDeploy:failed', { jobId, courseCode }); break
      case 'exit':        /* informational; close event carries final state */ break
      default:            logger.warn(`[StageDeploy] unknown event: ${event}`)
    }
  } else {
    // Unstructured stderr (warnings, SSH messages) — forward as log
    io.emit('stageDeploy:log', { jobId, courseCode, stream: 'stderr', line })
  }
}

// POST /api/production/:courseCode/stage-deploy/cancel
// Best-effort cancel. SIGTERMs the local SSH process; also fires a remote pkill
// so any orphaned python3/check process on apidev gets cleaned up.
app.post('/api/production/:courseCode/stage-deploy/cancel', async (req, res) => {
  try {
    const { courseCode } = req.params
    const job = stageDeployJobs.get(courseCode)
    if (!job) return res.status(404).json({ error: 'No active stage deploy for this course' })

    job.state = 'cancelled'
    try { job.sshProc.kill('SIGTERM') } catch (e) {
      logger.warn(`[StageDeploy] SIGTERM ssh failed: ${e.message}`)
    }

    // Remote cleanup — process group might survive the SSH disconnect
    const { spawn: spawnProc } = require('child_process')
    const pkill = spawnProc('ssh', [
      '-o', 'BatchMode=yes',
      'ssi@apidev',
      `pkill -TERM -f "python3 -.*${job.courseConfigsId}" || true`
    ])
    pkill.on('error', () => {})
    pkill.unref()

    io.emit('stageDeploy:cancelled', { jobId: job.jobId, courseCode })

    // Drop the entry from the map immediately so a retry isn't blocked by the
    // 60s close-handler cleanup. (The duplicate guard in POST stage-deploy
    // already accepts terminal-state entries, but removing it here means the
    // GET /status endpoint also stops claiming `active: true` straight away.)
    stageDeployJobs.delete(courseCode)
    res.json({ success: true, jobId: job.jobId })
  } catch (error) {
    logger.error('[StageDeploy] cancel error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/production/:courseCode/stage-deploy/status
// Lightweight peek so a refreshing UI can re-attach mid-run.
app.get('/api/production/:courseCode/stage-deploy/status', (req, res) => {
  const { courseCode } = req.params
  const job = stageDeployJobs.get(courseCode)
  if (!job) return res.json({ active: false })
  res.json({
    active: true,
    jobId: job.jobId,
    courseConfigsId: job.courseConfigsId,
    startedAt: job.startedAt,
    state: job.state,
    sawChecksPassed: job.sawChecksPassed,
    sawNewCourse: job.sawNewCourse,
    skipChecks: job.skipChecks,
    deleteProgress: job.deleteProgress
  })
})

// POST /api/production/:courseCode/stage-restart
// Run ~/api/stage/restart.sh on apidev and watch for the "Server started"
// notice. Independent of stage-deploy — meant to be invoked by a button
// after a successful deploy (or as a recovery action).
app.post('/api/production/:courseCode/stage-restart', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (stageRestartJobs.has(courseCode)) {
      return res.status(409).json({
        error: 'Stage restart already running for this course',
        jobId: stageRestartJobs.get(courseCode).jobId
      })
    }

    const scriptPath = path.join(__dirname, 'stage-restart.py')
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ error: `stage-restart.py not found at ${scriptPath}` })
    }

    const jobId = `restart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const startedAt = new Date().toISOString()

    logger.info(`[StageRestart] ${courseCode} jobId=${jobId}`)

    const { spawn: spawnProc } = require('child_process')
    const cat = spawnProc('cat', [scriptPath])
    // jobId doubles as a sentinel in the remote argv list. stage-restart.py
    // ignores extra argv, but the token shows up in `ps` so the cancel
    // handler's pkill can scope to THIS restart only — not a concurrent
    // stage-deploy.py also piped through `python3 -`.
    const ssh = spawnProc('ssh', [
      '-o', 'BatchMode=yes',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=4',
      'ssi@apidev',
      `python3 - ${jobId}`
    ])
    cat.stdout.pipe(ssh.stdin)
    cat.on('error', (err) => logger.error(`[StageRestart] cat error: ${err.message}`))

    const job = {
      jobId, courseCode,
      sshProc: ssh, catProc: cat,
      startedAt, phase: 'running' // 'running' | 'succeeded' | 'failed' | 'cancelled'
    }
    stageRestartJobs.set(courseCode, job)

    io.emit('stageDeploy:restartStarted', { jobId, courseCode, startedAt })

    let stderrBuf = ''
    ssh.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString()
      const lines = stderrBuf.split(/\r\n|\n|\r/)
      stderrBuf = lines.pop()
      for (const line of lines) handleRestartStderrLine(job, line)
    })

    let stdoutBuf = ''
    ssh.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString()
      const lines = stdoutBuf.split(/\r\n|\n|\r/)
      stdoutBuf = lines.pop()
      for (const line of lines) {
        if (line === '') continue
        io.emit('stageDeploy:log', { jobId, courseCode, stream: 'stdout', line })
      }
    })

    ssh.on('error', (err) => logger.error(`[StageRestart] ssh spawn error: ${err.message}`))

    ssh.on('close', (code, signal) => {
      if (stdoutBuf) io.emit('stageDeploy:log', { jobId, courseCode, stream: 'stdout', line: stdoutBuf })
      if (stderrBuf) handleRestartStderrLine(job, stderrBuf)

      // If phase still running, derive from exit code
      if (job.phase === 'running') {
        job.phase = (code === 0) ? 'succeeded' : 'failed'
        if (job.phase === 'succeeded') {
          io.emit('stageDeploy:restartSucceeded', { jobId, courseCode })
        } else {
          io.emit('stageDeploy:restartFailed', { jobId, courseCode, reason: `ssh exited ${code}` })
        }
      }

      logger.info(`[StageRestart] ${courseCode} closed exit=${code} signal=${signal} phase=${job.phase}`)
      setTimeout(() => stageRestartJobs.delete(courseCode), 60 * 1000)
    })

    res.json({ success: true, jobId, courseCode, startedAt })
  } catch (error) {
    logger.error('[StageRestart] error:', error)
    res.status(500).json({ error: error.message })
  }
})

function handleRestartStderrLine(job, line) {
  if (!line) return
  const { jobId, courseCode } = job
  if (line.startsWith('__SD__:')) {
    const m = line.match(/^__SD__:(\w+)(?:\s+(.+))?$/)
    if (!m) return
    const event = m[1]
    let payload = {}
    if (m[2]) {
      try { payload = JSON.parse(m[2]) } catch (e) { /* ignore */ }
    }
    switch (event) {
      case 'start':            io.emit('stageDeploy:restartStarted', { jobId, courseCode, ...payload }); break
      case 'restartSucceeded': job.phase = 'succeeded'
                               io.emit('stageDeploy:restartSucceeded', { jobId, courseCode }); break
      case 'restartFailed':    job.phase = 'failed'
                               io.emit('stageDeploy:restartFailed', { jobId, courseCode, ...payload }); break
      case 'exit':             break
      default:                 logger.warn(`[StageRestart] unknown event: ${event}`)
    }
  } else {
    io.emit('stageDeploy:log', { jobId, courseCode, stream: 'stderr', line })
  }
}

// POST /api/production/:courseCode/stage-restart/cancel
app.post('/api/production/:courseCode/stage-restart/cancel', async (req, res) => {
  try {
    const { courseCode } = req.params
    const job = stageRestartJobs.get(courseCode)
    if (!job) return res.status(404).json({ error: 'No active stage restart for this course' })

    job.phase = 'cancelled'
    try { job.sshProc.kill('SIGTERM') } catch (e) {
      logger.warn(`[StageRestart] SIGTERM ssh failed: ${e.message}`)
    }
    // Defensive remote cleanup — scoped to THIS job's jobId sentinel so a
    // concurrent stage-deploy.py (also piped through `python3 -`) isn't
    // collateral damage.
    const { spawn: spawnProc } = require('child_process')
    const pkill = spawnProc('ssh', [
      '-o', 'BatchMode=yes',
      'ssi@apidev',
      `pkill -TERM -f "python3 -.*${job.jobId}" || true`
    ])
    pkill.on('error', () => {})
    pkill.unref()

    io.emit('stageDeploy:restartFailed', { jobId: job.jobId, courseCode, reason: 'cancelled' })
    res.json({ success: true, jobId: job.jobId })
  } catch (error) {
    logger.error('[StageRestart] cancel error:', error)
    res.status(500).json({ error: error.message })
  }
})


// POST /api/production/:courseCode/verify-s3
// Step 2: Verify stage audio exists and durations match manifest
app.post('/api/production/:courseCode/verify-s3', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }

    // Check if verification is already running for this course
    const running = runningVerifications.get(courseCode)
    if (running) {
      const elapsed = Math.round((Date.now() - running.startedAt) / 1000)
      logger.info(`[VERIFY-S3] Verification already running for ${courseCode} (${elapsed}s elapsed), skipping duplicate request`)
      return res.status(409).json({
        error: 'Verification already in progress',
        alreadyRunning: true,
        elapsedSeconds: elapsed
      })
    }

    // Mark verification as running with abort controller
    const abortController = new AbortController()
    runningVerifications.set(courseCode, { startedAt: Date.now(), abortController })

    // Load manifest from temp/course_export_states
    const manifestPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_pending_manifest.json`)
    if (!fs.existsSync(manifestPath)) {
      runningVerifications.delete(courseCode)
      return res.status(404).json({ error: 'No pending manifest found. Generate manifest first.' })
    }

    const pendingManifest = await fs.readJson(manifestPath)

    const uuids = collectManifestUuids(pendingManifest)
    logger.info(`Verifying ${uuids.length} audio files for ${courseCode}`)

    // Stage 1: Existence check + Stage 2: Duration verification
    const verifyResults = await s3DeployService.verifyStageAudio(
      uuids,
      pendingManifest,
      (phase, checked, total, ...phaseData) => {
        if (phase === 'existence') {
          io.emit('s3Verify:progress', { courseCode, phase: 'existence', checked, total })
        } else if (phase === 'duration') {
          const [matched, mismatched, errors] = phaseData
          io.emit('s3Verify:progress', {
            courseCode, phase: 'duration', checked, total, matched, mismatched, errors
          })
        }
      },
      { checkDurations: true, durationTolerance: 0, signal: abortController.signal }
    )

    // Check if cancelled
    if (verifyResults.cancelled) {
      runningVerifications.delete(courseCode)
      return res.json({ cancelled: true, message: 'Verification cancelled' })
    }

    const results = { ...verifyResults }

    // Save state after Stage 2 (database-first)
    const supabase = supabaseClient.getClient()
    await supabase
      .from('course_export_states')
      .upsert({
        course_code: courseCode,
        s3_verification: results,
        s3_verified: false, // Not verified yet until auto-fix completes
        updated_at: new Date().toISOString()
      }, { onConflict: 'course_code' })

    // Send immediate response after Stage 2 - don't block the UI
    logger.info(`[VERIFY-S3] Stages 1-2 complete, starting auto-fix in background`)
    res.json(results)

    // Stage 3 & 4: Auto-fix and verify in BACKGROUND (async, non-blocking)
    if (results.durationMismatched > 0) {
      setImmediate(async () => {
        try {
          if (abortController.signal.aborted) {
            logger.info(`[AUTO-FIX] Skipped - verification was cancelled`)
            runningVerifications.delete(courseCode)
            return
          }
          logger.info(`[AUTO-FIX] Starting background auto-fix for ${results.durationMismatched} duration mismatches`)
          io.emit('s3Verify:progress', { courseCode, phase: 'fixing', checked: 0, total: results.durationMismatched })

          // Save extracted S3 durations to temp file
          const durationsPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_extracted_durations.json`)
          const durationsObj = Object.fromEntries(verifyResults.extractedDurations || new Map())
          await fs.writeJson(durationsPath, durationsObj, { spaces: 2 })
          logger.info(`[AUTO-FIX] Saved ${Object.keys(durationsObj).length} extracted durations`)

          // Run auto-fix with pre-extracted durations (should be instant).
          // Pass courseCode so course_audio.duration_ms is also synced — prevents
          // a subsequent Step 1 run from re-introducing the stale values.
          const fixResults = await s3DeployService.autoFixDurations(
            uuids,
            pendingManifest,
            (phase, checked, total, fixed, errors) => {
              io.emit('s3Verify:progress', {
                courseCode, phase: 'fixing', checked, total, fixed, errors
              })
            },
            verifyResults.extractedDurations,
            { courseCode }
          )

          logger.info(`[AUTO-FIX] Fixed ${fixResults.fixed} manifest durations, ${fixResults.errors} errors. DB sync: ${fixResults.dbRowsUpdated} rows updated, ${fixResults.dbAlreadyCorrect} already correct, ${fixResults.dbErrors} errors`)

          // Save updated manifest
          await fs.writeJson(manifestPath, fixResults.updatedManifest, { spaces: 2 })
          results.durationsFixed = fixResults.fixed
          results.durationFixErrors = fixResults.errors
          results.dbRowsUpdated = fixResults.dbRowsUpdated
          results.dbAlreadyCorrect = fixResults.dbAlreadyCorrect
          results.dbErrors = fixResults.dbErrors

          // Stage 4: Verify fixed durations
          logger.info(`[VERIFY-FIX] Verifying ${fixResults.fixed} fixed durations`)
          io.emit('s3Verify:progress', { courseCode, phase: 'verifying', checked: 0, total: fixResults.fixed })

          const fixedManifest = fixResults.updatedManifest
          const extractedDurations = await fs.readJson(durationsPath)

          let verifyChecked = 0
          let verifyMatched = 0
          let verifyMismatched = 0
          const verifyMismatchDetails = []
          let progressCounter = 0

          // Check all fixed durations with progress updates
          const checkSample = (uuid, manifestDuration) => {
            verifyChecked++
            progressCounter++
            const s3Duration = extractedDurations[uuid]

            if (s3Duration !== undefined) {
              const diff = Math.abs(manifestDuration - s3Duration)
              if (diff < 0.001) {
                verifyMatched++
              } else {
                verifyMismatched++
                verifyMismatchDetails.push({
                  uuid,
                  manifestDuration,
                  s3Duration,
                  difference: diff
                })
              }
            }

            // Send progress update every 100 samples
            if (progressCounter % 100 === 0) {
              io.emit('s3Verify:progress', {
                courseCode, phase: 'verifying', checked: verifyChecked, total: fixResults.fixed,
                matched: verifyMatched, mismatched: verifyMismatched
              })
            }
          }

          // Check introduction
          if (fixedManifest.introduction?.id && fixedManifest.introduction?.duration) {
            checkSample(fixedManifest.introduction.id, fixedManifest.introduction.duration)
          }

          // Check encouragements
          for (const enc of fixedManifest.slices[0]?.orderedEncouragements || []) {
            if (enc.id && enc.duration) checkSample(enc.id, enc.duration)
          }
          for (const enc of fixedManifest.slices[0]?.pooledEncouragements || []) {
            if (enc.id && enc.duration) checkSample(enc.id, enc.duration)
          }
          for (const enc of fixedManifest.slices[0]?.paywallEncouragements || []) {
            if (enc.id && enc.duration) checkSample(enc.id, enc.duration)
          }

          // Check samples
          for (const audioArray of Object.values(fixedManifest.slices[0]?.samples || {})) {
            for (const audio of audioArray) {
              if (audio.id && audio.duration) checkSample(audio.id, audio.duration)
            }
          }

          // Final progress update
          io.emit('s3Verify:progress', {
            courseCode, phase: 'verifying', checked: verifyChecked, total: verifyChecked,
            matched: verifyMatched, mismatched: verifyMismatched
          })

          logger.info(`[VERIFY-FIX] Verification complete: ${verifyMatched} matched, ${verifyMismatched} mismatched`)

          results.verifyFixed = {
            checked: verifyChecked,
            matched: verifyMatched,
            mismatched: verifyMismatched,
            mismatchDetails: verifyMismatchDetails
          }

          // Clean up temp durations file
          await fs.remove(durationsPath)

          // Update final state (database-first)
          // Format failures (ID3v2 / non-LAME encoding) block verification — they're
          // the iOS-playback bug and must be fixed before publishing.
          const s3Verified = results.missing === 0 && verifyMismatched === 0 && (results.formatFailed || 0) === 0
          await supabase
            .from('course_export_states')
            .update({
              s3_verification: results,
              s3_verified: s3Verified,
              s3_verified_at: s3Verified ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('course_code', courseCode)

          // Notify completion
          logger.info(`[VERIFY-S3] All stages complete for ${courseCode}`)
          io.emit('s3Verify:completed', { courseCode, ...results })
          runningVerifications.delete(courseCode)

        } catch (err) {
          logger.error(`[AUTO-FIX] Background error for ${courseCode}:`, err)
          io.emit('s3Verify:error', { courseCode, error: err.message })
          runningVerifications.delete(courseCode)
        }
      })
    } else {
      // No duration mismatches — but format failures (ID3v2 / non-LAME) still block.
      const s3Verified = results.missing === 0 && (results.formatFailed || 0) === 0
      await supabase
        .from('course_export_states')
        .update({
          s3_verification: results,
          s3_verified: s3Verified,
          s3_verified_at: s3Verified ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('course_code', courseCode)

      io.emit('s3Verify:completed', { courseCode, ...results })
      runningVerifications.delete(courseCode)
    }

  } catch (error) {
    if (abortController.signal.aborted) {
      logger.info(`[VERIFY-S3] Cancelled for ${courseCode}`)
      runningVerifications.delete(courseCode)
      return res.json({ cancelled: true, message: 'Verification cancelled' })
    }
    logger.error(`Verify S3 error for ${courseCode}:`, error)
    runningVerifications.delete(courseCode)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/production/:courseCode/verify-s3
// Cancel a running S3 verification
app.delete('/api/production/:courseCode/verify-s3', (req, res) => {
  const { courseCode } = req.params
  const running = runningVerifications.get(courseCode)

  if (!running) {
    return res.status(404).json({ error: 'No verification running for this course' })
  }

  logger.info(`[VERIFY-S3] Cancelling verification for ${courseCode}`)
  running.abortController.abort()
  runningVerifications.delete(courseCode)
  io.emit('s3Verify:cancelled', { courseCode })
  res.json({ cancelled: true, message: `Verification cancelled for ${courseCode}` })
})

/**
 * Load published manifest from course-configs repo or local fallback
 * @param {string} courseCode - Course code (e.g., 'fra_for_eng')
 * @returns {Object} { manifest, source } - manifest object and source location
 */
async function loadPublishedManifest(courseCode) {
  // Get course to compute courseConfigsId from language codes
  const course = await supabaseClient.getCourse(courseCode)
  if (!course) {
    throw new Error(`Course ${courseCode} not found`)
  }

  // Compute courseConfigsId dynamically from language codes (e.g., "en-cmn" for zho_for_eng)
  // Dialect-aware: spa_mx_for_eng → "en-es-mx", fra_ca_for_eng → "en-fr-ca"
  const knownCode = languageCodeService.databaseToManifest(course.known_lang)
  const targetCode = languageCodeService.databaseToManifest(course.target_lang)
  const courseConfigsId = buildCourseConfigsId(courseCode, course.known_lang, course.target_lang, knownCode, targetCode)

  // Try course-configs repo first (canonical published location)
  const courseConfigsRepo = process.env.COURSE_CONFIGS_REPO || path.join(require('os').homedir(), 'Documents', 'GitHub', 'course-configs')
  const courseConfigsPath = path.join(courseConfigsRepo, 'Courses', `${courseConfigsId}.json`)

  if (fs.existsSync(courseConfigsPath)) {
    logger.info(`Loading published manifest from course-configs: ${courseConfigsPath}`)
    const manifest = await fs.readJson(courseConfigsPath)
    return { manifest, source: 'course-configs' }
  }

  // Fallback to local published manifest
  const localPath = path.join(__dirname, '../temp/course_export_states', `${courseCode}_published_manifest.json`)
  if (fs.existsSync(localPath)) {
    logger.info(`Loading published manifest from local: ${localPath}`)
    const manifest = await fs.readJson(localPath)
    return { manifest, source: 'local' }
  }

  throw new Error('No published manifest found. Publish manifest first (Step 3).')
}

/**
 * Extract all audio UUIDs from a manifest (introduction, encouragements, samples)
 */
function collectManifestUuids(manifest) {
  const uuids = []
  if (manifest.introduction?.id) uuids.push(manifest.introduction.id)
  for (const enc of manifest.slices[0]?.orderedEncouragements || []) {
    if (enc.id) uuids.push(enc.id)
  }
  for (const enc of manifest.slices[0]?.pooledEncouragements || []) {
    if (enc.id) uuids.push(enc.id)
  }
  for (const enc of manifest.slices[0]?.paywallEncouragements || []) {
    if (enc.id) uuids.push(enc.id)
  }
  const samples = manifest.slices[0]?.samples || {}
  for (const [text, audioArray] of Object.entries(samples)) {
    for (const audio of audioArray) {
      if (audio.id) uuids.push(audio.id)
    }
  }
  return uuids
}

/**
 * Build verification progress callback for verifyProductionDurations
 * Handles the (phase, checked, total, ...rest) signature correctly
 */
function buildVerifyProgressCallback(io, courseCode, totalUuids, runningDeploysMap) {
  return (phase, checked, total, ...rest) => {
    if (phase === 'existence') {
      io.emit('audioDeploy:verifyProgress', {
        courseCode, phase, checked, total: totalUuids,
        matched: 0, mismatched: 0, errors: 0
      })
      // Update runningDeploys progress for status endpoint
      if (runningDeploysMap) {
        const entry = runningDeploysMap.get(courseCode)
        if (entry) entry.progress = { phase: 'verifying', verified: checked, total: totalUuids }
      }
    } else if (phase === 'duration') {
      const [matched, mismatched, errors] = rest
      io.emit('audioDeploy:verifyProgress', {
        courseCode, phase, checked, total,
        matched: matched || 0, mismatched: mismatched || 0, errors: errors || 0
      })
      if (runningDeploysMap) {
        const entry = runningDeploysMap.get(courseCode)
        if (entry) entry.progress = { phase: 'verifying-durations', verified: checked, total, matched: matched || 0, mismatched: mismatched || 0, errors: errors || 0 }
      }
    }
  }
}

/**
 * Build human-readable deploy result message
 */
function buildDeployMessage(deployResult, verificationResult, verificationPassed) {
  const parts = []
  parts.push(`Copied ${deployResult.deployed} files`)
  if (deployResult.failed > 0) parts.push(`${deployResult.failed} copy failures`)
  if (verificationResult.missing > 0) parts.push(`${verificationResult.missing} missing from production`)
  if (verificationResult.durationMismatched > 0) parts.push(`${verificationResult.durationMismatched} duration mismatches`)
  if (verificationResult.durationErrors > 0) parts.push(`${verificationResult.durationErrors} verification errors`)
  if (verificationPassed) parts.push('All production audio verified')
  return parts.join('. ') + '.'
}

// POST /api/production/:courseCode/deploy-audio/plan
// Get deployment plan with automatic duration checking for overwrites
// Returns immediately with {started: true}, sends result via WebSocket
app.post('/api/production/:courseCode/deploy-audio/plan', async (req, res) => {
  const { courseCode } = req.params
  try {
    // Prevent duplicate runs
    const running = runningDeployPlans.get(courseCode)
    if (running) {
      const elapsed = Math.round((Date.now() - running.startedAt) / 1000)
      logger.info(`[Deploy Plan] Already running for ${courseCode} (${elapsed}s elapsed)`)
      return res.status(409).json({
        error: 'Deploy plan already in progress',
        alreadyRunning: true,
        elapsedSeconds: elapsed
      })
    }

    runningDeployPlans.set(courseCode, { startedAt: Date.now() })

    // Respond immediately so the frontend doesn't time out
    res.json({ started: true, message: 'Deploy plan started, results via WebSocket' })

    // Run the heavy work in background
    setImmediate(async () => {
      try {
        const { manifest: publishedManifest, source } = await loadPublishedManifest(courseCode)
        logger.info(`[Deploy Plan] Loaded manifest for ${courseCode} from ${source}`)

        const uuids = collectManifestUuids(publishedManifest)
        logger.info(`[Deploy Plan] Collected ${uuids.length} UUIDs for ${courseCode}`)

        const plan = await s3DeployService.generateDeployPlanWithDurations(
          uuids,
          publishedManifest,
          (phase, checked, total, matched, mismatched, errors) => {
            io.emit('deployPlan:progress', {
              courseCode,
              phase,
              checked,
              total,
              matched,
              mismatched,
              errors
            })
          }
        )
        logger.info(`[Deploy Plan] Complete for ${courseCode}: ${plan.newFiles} new, ${plan.overwrites} overwrites, scenario: ${plan.scenario}`)

        // Save to state (database-first)
        if (supabaseClient.isInitialized()) {
          const supabase = supabaseClient.getClient()
          await supabase
            .from('course_export_states')
            .update({
              deploy_plan: plan,
              updated_at: new Date().toISOString()
            })
            .eq('course_code', courseCode)
        }

        io.emit('deployPlan:completed', { courseCode, plan })
        runningDeployPlans.delete(courseCode)
      } catch (error) {
        logger.error(`[Deploy Plan] Background error for ${courseCode}:`, error)
        io.emit('deployPlan:error', { courseCode, error: error.message })
        runningDeployPlans.delete(courseCode)
      }
    })
  } catch (error) {
    logger.error(`[Deploy Plan] Error for ${courseCode}:`, error)
    runningDeployPlans.delete(courseCode)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/deploy-audio/execute
// Execute deployment (copy stage → production) with post-deployment verification
// Non-blocking: returns 202 immediately, runs deploy in background, emits completion via WebSocket
app.post('/api/production/:courseCode/deploy-audio/execute', async (req, res) => {
  const { courseCode } = req.params

  // Dedup guard
  const running = runningDeploys.get(courseCode)
  if (running) {
    const elapsed = Math.round((Date.now() - running.startedAt) / 1000)
    logger.info(`[DEPLOY] Already running for ${courseCode} (${elapsed}s, type: ${running.type})`)
    return res.status(409).json({ error: 'Deploy already in progress', alreadyRunning: true, type: running.type, elapsedSeconds: elapsed })
  }

  try {
    // Validate synchronously before accepting
    const { confirmation } = req.body
    const { manifest: publishedManifest } = await loadPublishedManifest(courseCode)
    const uuids = collectManifestUuids(publishedManifest)

    // Register and return 202 immediately
    runningDeploys.set(courseCode, { startedAt: Date.now(), type: 'execute', progress: { phase: 'deploying', deployed: 0, total: uuids.length } })
    res.status(202).json({ accepted: true, type: 'execute', total: uuids.length })

    // Run deploy + verify in background
    ;(async () => {
      try {
        const result = await s3DeployService.deployToProduction(uuids, {
          confirmOverwrite: confirmation,
          onProgress: (deployed, total) => {
            io.emit('audioDeploy:progress', { courseCode, deployed, total })
            const entry = runningDeploys.get(courseCode)
            if (entry) entry.progress = { phase: 'deploying', deployed, total }
          }
        })

        // Post-deployment verification (full manifest)
        logger.info(`[DEPLOY execute] Post-deployment verification for ${courseCode}`)
        const entry = runningDeploys.get(courseCode)
        if (entry) entry.progress = { phase: 'verifying', deployed: result.deployed, total: uuids.length }

        const verificationResult = await s3DeployService.verifyProductionDurations(
          uuids, publishedManifest, buildVerifyProgressCallback(io, courseCode, uuids.length, runningDeploys)
        )

        const verificationPassed = (
          verificationResult.missing === 0 &&
          verificationResult.durationMismatched === 0 &&
          verificationResult.durationErrors === 0
        )

        // Save to state — only mark deployed if verification passed
        if (supabaseClient.isInitialized()) {
          const supabase = supabaseClient.getClient()
          await supabase
            .from('course_export_states')
            .update({
              audio_deployed: verificationPassed,
              audio_deployed_at: verificationPassed ? new Date().toISOString() : null,
              deploy_plan: verificationResult,
              updated_at: new Date().toISOString()
            })
            .eq('course_code', courseCode)
        }

        const message = buildDeployMessage(result, verificationResult, verificationPassed)
        logger.info(`[DEPLOY execute] ${courseCode}: ${message}`)

        io.emit('audioDeploy:completed', {
          courseCode,
          success: verificationPassed,
          deployed: result.deployed,
          failed: result.failed,
          failedUuids: result.failedUuids || [],
          verification: verificationResult,
          verificationPassed,
          message
        })
      } catch (error) {
        logger.error(`Deploy error for ${courseCode}:`, error)
        io.emit('audioDeploy:error', { courseCode, error: error.message })
      } finally {
        runningDeploys.delete(courseCode)
      }
    })()
  } catch (error) {
    // Validation failed before accepting — return error synchronously
    logger.error(`Deploy validation error for ${courseCode}:`, error)
    runningDeploys.delete(courseCode)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/deploy-audio/new-only
// Deploy ONLY new files (accepts newUuids from frontend plan)
// Non-blocking: returns 202 immediately, runs deploy in background, emits completion via WebSocket
app.post('/api/production/:courseCode/deploy-audio/new-only', async (req, res) => {
  const { courseCode } = req.params

  // Dedup guard
  const running = runningDeploys.get(courseCode)
  if (running) {
    const elapsed = Math.round((Date.now() - running.startedAt) / 1000)
    logger.info(`[DEPLOY] Already running for ${courseCode} (${elapsed}s, type: ${running.type})`)
    return res.status(409).json({ error: 'Deploy already in progress', alreadyRunning: true, type: running.type, elapsedSeconds: elapsed })
  }

  const { newUuids = [] } = req.body

  if (newUuids.length === 0) {
    return res.json({
      success: true, message: 'No new files to deploy', deployed: 0, failed: 0,
      verification: null, verificationPassed: true
    })
  }

  // Register and return 202 immediately
  runningDeploys.set(courseCode, { startedAt: Date.now(), type: 'new-only', progress: { phase: 'deploying', deployed: 0, total: newUuids.length } })
  res.status(202).json({ accepted: true, type: 'new-only', total: newUuids.length })

  // Run deploy + verify in background
  ;(async () => {
    try {
      logger.info(`[DEPLOY new-only] Deploying ${newUuids.length} new files for ${courseCode}`)

      const result = await s3DeployService.deployToProduction(newUuids, {
        confirmOverwrite: true,
        onProgress: (deployed, total) => {
          io.emit('audioDeploy:progress', { courseCode, deployed, total: newUuids.length })
          const entry = runningDeploys.get(courseCode)
          if (entry) entry.progress = { phase: 'deploying', deployed, total: newUuids.length }
        }
      })

      // Post-deployment verification (full manifest — verify ALL production audio)
      logger.info(`[DEPLOY new-only] Post-deployment verification for ${courseCode}`)
      const { manifest: publishedManifest } = await loadPublishedManifest(courseCode)
      const allUuids = collectManifestUuids(publishedManifest)

      const entry = runningDeploys.get(courseCode)
      if (entry) entry.progress = { phase: 'verifying', deployed: result.deployed, total: allUuids.length }

      const verificationResult = await s3DeployService.verifyProductionDurations(
        allUuids, publishedManifest, buildVerifyProgressCallback(io, courseCode, allUuids.length, runningDeploys)
      )

      const verificationPassed = (
        verificationResult.missing === 0 &&
        verificationResult.durationMismatched === 0 &&
        verificationResult.durationErrors === 0
      )

      // Save to state — only mark deployed if verification passed
      if (supabaseClient.isInitialized()) {
        const supabase = supabaseClient.getClient()
        await supabase
          .from('course_export_states')
          .update({
            audio_deployed: verificationPassed,
            audio_deployed_at: verificationPassed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('course_code', courseCode)
      }

      const message = buildDeployMessage(result, verificationResult, verificationPassed)
      logger.info(`[DEPLOY new-only] ${courseCode}: ${message}`)

      io.emit('audioDeploy:completed', {
        courseCode,
        success: verificationPassed,
        deployed: result.deployed,
        failed: result.failed,
        failedUuids: result.failedUuids || [],
        verification: verificationResult,
        verificationPassed,
        message
      })
    } catch (error) {
      logger.error(`Deploy new-only error for ${courseCode}:`, error)
      io.emit('audioDeploy:error', { courseCode, error: error.message })
    } finally {
      runningDeploys.delete(courseCode)
    }
  })()
})

// POST /api/production/:courseCode/deploy-audio/new-and-mismatched
// Deploy new files AND mismatched overwrites (skip identical overwrites)
// Non-blocking: returns 202 immediately, runs deploy in background, emits completion via WebSocket
app.post('/api/production/:courseCode/deploy-audio/new-and-mismatched', async (req, res) => {
  const { courseCode } = req.params

  // Dedup guard
  const running = runningDeploys.get(courseCode)
  if (running) {
    const elapsed = Math.round((Date.now() - running.startedAt) / 1000)
    logger.info(`[DEPLOY] Already running for ${courseCode} (${elapsed}s, type: ${running.type})`)
    return res.status(409).json({ error: 'Deploy already in progress', alreadyRunning: true, type: running.type, elapsedSeconds: elapsed })
  }

  const { newUuids = [], mismatchedUuids = [] } = req.body
  const uuidsToDeploy = [...newUuids, ...mismatchedUuids]

  if (uuidsToDeploy.length === 0) {
    return res.json({
      success: true, message: 'No UUIDs provided to deploy', deployed: 0, failed: 0,
      verification: null, verificationPassed: true
    })
  }

  // Register and return 202 immediately
  runningDeploys.set(courseCode, { startedAt: Date.now(), type: 'new-and-mismatched', progress: { phase: 'deploying', deployed: 0, total: uuidsToDeploy.length } })
  res.status(202).json({ accepted: true, type: 'new-and-mismatched', total: uuidsToDeploy.length })

  // Run deploy + verify in background
  ;(async () => {
    try {
      logger.info(`[DEPLOY new+mismatched] Deploying ${newUuids.length} new + ${mismatchedUuids.length} mismatched files for ${courseCode}`)

      const result = await s3DeployService.deployToProduction(uuidsToDeploy, {
        confirmOverwrite: true,
        onProgress: (deployed, total) => {
          io.emit('audioDeploy:progress', { courseCode, deployed, total })
          const entry = runningDeploys.get(courseCode)
          if (entry) entry.progress = { phase: 'deploying', deployed, total }
        }
      })

      // Post-deployment verification (full manifest)
      logger.info(`[DEPLOY new+mismatched] Post-deployment verification for ${courseCode}`)
      const { manifest: publishedManifest } = await loadPublishedManifest(courseCode)
      const allUuids = collectManifestUuids(publishedManifest)

      const entry = runningDeploys.get(courseCode)
      if (entry) entry.progress = { phase: 'verifying', deployed: result.deployed, total: allUuids.length }

      const verificationResult = await s3DeployService.verifyProductionDurations(
        allUuids, publishedManifest, buildVerifyProgressCallback(io, courseCode, allUuids.length, runningDeploys)
      )

      const verificationPassed = (
        verificationResult.missing === 0 &&
        verificationResult.durationMismatched === 0 &&
        verificationResult.durationErrors === 0
      )

      // Save to state — only mark deployed if verification passed
      if (supabaseClient.isInitialized()) {
        const supabase = supabaseClient.getClient()
        await supabase
          .from('course_export_states')
          .update({
            audio_deployed: verificationPassed,
            audio_deployed_at: verificationPassed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('course_code', courseCode)
      }

      const message = buildDeployMessage(result, verificationResult, verificationPassed)
      logger.info(`[DEPLOY new+mismatched] ${courseCode}: ${message}`)

      io.emit('audioDeploy:completed', {
        courseCode,
        success: verificationPassed,
        deployed: result.deployed,
        failed: result.failed,
        failedUuids: result.failedUuids || [],
        verification: verificationResult,
        verificationPassed,
        message
      })
    } catch (error) {
      logger.error(`Deploy new-and-mismatched error for ${courseCode}:`, error)
      io.emit('audioDeploy:error', { courseCode, error: error.message })
    } finally {
      runningDeploys.delete(courseCode)
    }
  })()
})

// GET /api/production/:courseCode/deploy-audio/status
// Lightweight status check for running deploys (reads from in-memory Map)
app.get('/api/production/:courseCode/deploy-audio/status', (req, res) => {
  const { courseCode } = req.params
  const running = runningDeploys.get(courseCode)
  if (!running) return res.json({ running: false })
  res.json({
    running: true,
    type: running.type,
    elapsedSeconds: Math.round((Date.now() - running.startedAt) / 1000),
    progress: running.progress || {}
  })
})

// GET /api/production/audio/:uuid/download/:bucket
// Proxy download audio file from stage or production bucket (avoids CORS issues)
app.get('/api/production/audio/:uuid/download/:bucket', async (req, res) => {
  try {
    const { uuid, bucket } = req.params
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')

    const STAGE_BUCKET = 'ssi-audio-stage'
    const PROD_BUCKET = 'ssiborg-assets'
    const REGION = process.env.S3_REGION || 'eu-west-1'

    // Validate bucket parameter
    let targetBucket
    let filename
    if (bucket === 'stage') {
      targetBucket = STAGE_BUCKET
      filename = `${uuid}_stage.mp3`
    } else if (bucket === 'production' || bucket === 'prod') {
      targetBucket = PROD_BUCKET
      filename = `${uuid}_production.mp3`
    } else {
      return res.status(400).json({ error: 'Invalid bucket. Use "stage" or "production".' })
    }

    const s3Client = new S3Client({ region: REGION })
    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: `mastered/${uuid}.mp3`
    })

    const response = await s3Client.send(command)

    // Set headers for download
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    if (response.ContentLength) {
      res.setHeader('Content-Length', response.ContentLength)
    }

    // Stream the file to the response
    response.Body.pipe(res)
  } catch (error) {
    logger.error(`Error downloading audio ${req.params.uuid} from ${req.params.bucket}:`, error)
    if (error.name === 'NoSuchKey') {
      res.status(404).json({ error: 'Audio file not found' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// POST /api/production/:courseCode/verify-production-durations
// Step 4: Verify production audio durations WITHOUT deploying
app.post('/api/production/:courseCode/verify-production-durations', async (req, res) => {
  try {
    const { courseCode } = req.params

    const { manifest: publishedManifest } = await loadPublishedManifest(courseCode)
    const uuids = collectManifestUuids(publishedManifest)

    const verificationResult = await s3DeployService.verifyProductionDurations(
      uuids, publishedManifest, buildVerifyProgressCallback(io, courseCode, uuids.length)
    )

    // Save to state (database-first)
    if (supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      await supabase
        .from('course_export_states')
        .update({
          deploy_plan: verificationResult,
          updated_at: new Date().toISOString()
        })
        .eq('course_code', courseCode)
    }

    res.json(verificationResult)
  } catch (error) {
    logger.error(`Verify production error for ${courseCode}:`, error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/deploy-audio/missing-only
// Deploy ONLY missing files (safe deployment after verification)
// Non-blocking: returns 202 immediately, runs deploy in background
app.post('/api/production/:courseCode/deploy-audio/missing-only', async (req, res) => {
  const { courseCode } = req.params

  // Dedup guard
  const running = runningDeploys.get(courseCode)
  if (running) {
    const elapsed = Math.round((Date.now() - running.startedAt) / 1000)
    return res.status(409).json({ error: 'Deploy already in progress', alreadyRunning: true, type: running.type, elapsedSeconds: elapsed })
  }

  try {
    const { manifest: publishedManifest } = await loadPublishedManifest(courseCode)
    const uuids = collectManifestUuids(publishedManifest)

    // First verify production to get missing files (sync — needed to know total)
    const verification = await s3DeployService.verifyProductionDurations(
      uuids, publishedManifest, buildVerifyProgressCallback(io, courseCode, uuids.length)
    )

    const missingUuids = verification.missingUuids || []

    if (missingUuids.length === 0) {
      return res.json({
        success: true, message: 'No missing files to deploy', deployed: 0, failed: 0,
        verification: null, verificationPassed: true
      })
    }

    // Register and return 202 immediately
    runningDeploys.set(courseCode, { startedAt: Date.now(), type: 'missing-only', progress: { phase: 'deploying', deployed: 0, total: missingUuids.length } })
    res.status(202).json({ accepted: true, type: 'missing-only', total: missingUuids.length })

    // Run deploy in background
    ;(async () => {
      try {
        const result = await s3DeployService.deployToProduction(missingUuids, {
          confirmOverwrite: false,
          onProgress: (deployed, total) => {
            io.emit('audioDeploy:progress', { courseCode, deployed, total: missingUuids.length })
            const entry = runningDeploys.get(courseCode)
            if (entry) entry.progress = { phase: 'deploying', deployed, total: missingUuids.length }
          }
        })

        // Post-deploy re-verification
        logger.info(`[DEPLOY missing-only] Post-deployment verification for ${courseCode}`)
        const entry = runningDeploys.get(courseCode)
        if (entry) entry.progress = { phase: 'verifying', deployed: result.deployed, total: uuids.length }

        const verificationResult = await s3DeployService.verifyProductionDurations(
          uuids, publishedManifest, buildVerifyProgressCallback(io, courseCode, uuids.length, runningDeploys)
        )

        const verificationPassed = (
          verificationResult.missing === 0 &&
          verificationResult.durationMismatched === 0 &&
          verificationResult.durationErrors === 0
        )

        if (supabaseClient.isInitialized()) {
          const supabase = supabaseClient.getClient()
          await supabase
            .from('course_export_states')
            .update({
              audio_deployed: verificationPassed,
              audio_deployed_at: verificationPassed ? new Date().toISOString() : null,
              deploy_plan: verificationResult,
              updated_at: new Date().toISOString()
            })
            .eq('course_code', courseCode)
        }

        const message = buildDeployMessage(result, verificationResult, verificationPassed)
        logger.info(`[DEPLOY missing-only] ${courseCode}: ${message}`)

        io.emit('audioDeploy:completed', {
          courseCode,
          success: verificationPassed,
          deployed: result.deployed,
          failed: result.failed,
          failedUuids: result.failedUuids || [],
          verification: verificationResult,
          verificationPassed,
          message
        })
      } catch (error) {
        logger.error(`Deploy missing-only error for ${courseCode}:`, error)
        io.emit('audioDeploy:error', { courseCode, error: error.message })
      } finally {
        runningDeploys.delete(courseCode)
      }
    })()
  } catch (error) {
    logger.error(`Deploy missing-only validation error for ${courseCode}:`, error)
    runningDeploys.delete(courseCode)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// GENDER PREP ROUTES
// =============================================================================

const genderHaikuService = require('./gender-haiku-service.cjs')
const genderPrepDetector = require('./gender-prep-detector.cjs')
const voiceGenderMap = require('./voice-gender-map.cjs')

function safeParseJson(s) { try { return JSON.parse(s) } catch { return null } }

// POST /api/production/:courseCode/gender-prep/check
// Run a Haiku check on this course's actual phrases to determine whether
// gender prep is needed. Persists the result to courses.needs_gender_prep.
// Skips if a human has set the determination, unless ?force=true.
app.post('/api/production/:courseCode/gender-prep/check', async (req, res) => {
  try {
    const { courseCode } = req.params
    const force = req.query.force === 'true' || req.body?.force === true
    const result = await genderPrepDetector.detectNeedsGenderPrep(courseCode, { force })
    res.json(result)
  } catch (e) {
    logger.error('Error in gender-prep/check:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/production/:courseCode/gender-prep/override
// Manually set needs_gender_prep for a course (audit-trail marked `set_by: human`).
// Body: { value: true | false | null, reason?: string }
// Subsequent auto-detector runs won't overwrite this unless called with force=true.
app.post('/api/production/:courseCode/gender-prep/override', async (req, res) => {
  try {
    const { courseCode } = req.params
    const { value, reason } = req.body || {}
    if (value !== true && value !== false && value !== null) {
      return res.status(400).json({ error: 'Body must include value: true | false | null' })
    }
    const result = await genderPrepDetector.setManualOverride(courseCode, value, reason)
    res.json(result)
  } catch (e) {
    logger.error('Error in gender-prep/override:', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/production/:courseCode/gender-prep/status
// Check gender expansion status for a course
app.get('/api/production/:courseCode/gender-prep/status', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const supabase = supabaseClient.getClient()

    // Get course target language + per-course override (if migration applied)
    let course
    let { data: courseData, error: courseErr } = await supabase
      .from('courses')
      .select('target_lang, needs_gender_prep, gender_prep_check_notes, gender_prep_checked_at')
      .eq('course_code', courseCode)
      .single()
    if (courseErr) {
      // If migration not applied, retry without the new fields
      if (/column .* does not exist|Could not find the/.test(courseErr.message || '')) {
        const fb = await supabase.from('courses').select('target_lang').eq('course_code', courseCode).single()
        if (!fb.data) return res.status(404).json({ error: 'Course not found' })
        course = { ...fb.data, needs_gender_prep: null, gender_prep_check_notes: null, gender_prep_checked_at: null }
      } else {
        return res.status(404).json({ error: 'Course not found' })
      }
    } else {
      course = courseData
    }

    // Per-course flag wins; null falls back to hardcoded language list
    const isGendered = course.needs_gender_prep === true ||
      (course.needs_gender_prep === null && genderHaikuService.GENDERED_LANGUAGES.includes(course.target_lang))

    if (!isGendered) {
      return res.json({
        isGendered: false, processed: false, totalExpansions: 0, processedAt: null,
        autoChecked: course.gender_prep_checked_at || null,
        checkNotes: course.gender_prep_check_notes ? safeParseJson(course.gender_prep_check_notes) : null
      })
    }

    // Count existing expansions
    const { count, error: countErr } = await supabase
      .from('course_gender_expansions')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    // Get most recent processed_at
    const { data: latest } = await supabase
      .from('course_gender_expansions')
      .select('processed_at')
      .eq('course_code', courseCode)
      .order('processed_at', { ascending: false })
      .limit(1)

    const totalExpansions = count || 0
    const processedAt = latest?.[0]?.processed_at || null

    res.json({
      isGendered: true,
      processed: totalExpansions > 0,
      totalExpansions,
      processedAt
    })
  } catch (error) {
    logger.error('Error fetching gender-prep status:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/production/:courseCode/gender-prep/start
// Spawn a single coordinator in one iTerm window that runs parallel Haiku --print calls
app.post('/api/production/:courseCode/gender-prep/start', async (req, res) => {
  if (!await requireDashboardUser(req, res)) return
  try {
    const { courseCode } = req.params
    const { spawn: spawnProc } = require('child_process')

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const supabase = supabaseClient.getClient()

    // Verify course exists and is gendered. voice_config is needed for the
    // voice-gender gate (no female target voice → prep is pointless).
    let { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('target_lang, display_name, needs_gender_prep, voice_config')
      .eq('course_code', courseCode)
      .single()

    if (courseErr) {
      // Migration not applied yet — retry without the new column
      if (/column .* does not exist/.test(courseErr.message || '')) {
        const fb = await supabase.from('courses').select('target_lang, display_name, voice_config').eq('course_code', courseCode).single()
        course = fb.data ? { ...fb.data, needs_gender_prep: null } : null
      }
    }
    if (!course) return res.status(404).json({ error: 'Course not found' })

    // Allow if either the per-course flag is true OR (flag is null AND language in fallback list)
    const inFallback = genderHaikuService.GENDERED_LANGUAGES.includes(course.target_lang)
    const courseFlag = course.needs_gender_prep
    if (courseFlag === false || (courseFlag === null && !inFallback)) {
      return res.status(400).json({ error: `Course ${courseCode} (${course.target_lang}) is not flagged as needing gender prep` })
    }

    // Voice-config gate: skip if both target voices are confirmed male — the
    // masculine canonical text is the only thing that will ever speak, so the
    // pipeline would produce dead-weight variants. Unknown voices fall through
    // (run prep) to stay safe.
    const hasFem = voiceGenderMap.anyTargetVoiceFemale(course.voice_config)
    if (hasFem === false) {
      const g = voiceGenderMap.getCourseVoiceGenders(course.voice_config)
      return res.status(400).json({
        error: `Course ${courseCode} has no female target voice — gender prep would produce unused variants.`,
        target1: g.voiceIds.target1, target1_gender: g.target1,
        target2: g.voiceIds.target2, target2_gender: g.target2,
        hint: 'If this is wrong (e.g. the voice gender is misidentified), set the voice_id in voice_config or use /gender-prep/override to force a manual decision.',
      })
    }

    // Check for already-running gender-prep job (with staleness auto-cleanup)
    const { data: existingJob } = await supabase
      .from('build_jobs')
      .select('id, status, started_at, last_heartbeat')
      .eq('course_code', courseCode)
      .eq('pass', 'gender-prep')
      .in('status', ['running', 'pending'])
      .limit(1)

    if (existingJob && existingJob.length > 0) {
      const job = existingJob[0]
      const lastActivity = job.last_heartbeat || job.started_at
      const staleMins = (Date.now() - new Date(lastActivity).getTime()) / 60000

      // Auto-fail jobs with no heartbeat for 10+ minutes
      if (staleMins > 10) {
        logger.warn(`[GENDER-PREP] Auto-failing stale job ${job.id} (no heartbeat for ${Math.round(staleMins)} min)`)
        await supabase.from('build_jobs')
          .update({ status: 'failed', error_message: `Stale: no heartbeat for ${Math.round(staleMins)} minutes`, completed_at: new Date().toISOString() })
          .eq('id', job.id)
      } else {
        return res.status(409).json({ error: 'Gender prep already running', job_id: job.id })
      }
    }

    // Quick count of texts (coordinator does the actual querying)
    const { count: phraseCount } = await supabase.from('course_practice_phrases').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
    const { count: legoCount } = await supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
    const { count: seedCount } = await supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
    const estimatedTexts = (phraseCount || 0) + (legoCount || 0) + (seedCount || 0)

    // Insert build_jobs row as 'pending' — coordinator sets 'running' on actual startup
    const { data: jobRow, error: jobErr } = await supabase
      .from('build_jobs')
      .insert({
        course_code: courseCode,
        pass: 'gender-prep',
        status: 'pending',
        total_seeds: estimatedTexts,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (jobErr) {
      logger.error('[GENDER-PREP] Failed to create build_jobs row:', jobErr.message)
      return res.status(500).json({ error: 'Failed to create job record' })
    }

    const jobId = jobRow.id

    // Spawn coordinator in a terminal window (iTerm preferred, Terminal.app fallback)
    const projectDir = path.resolve(__dirname, '..')
    const coordinatorPath = path.resolve(__dirname, 'gender-prep-coordinator.cjs')
    const cmd = `cd "${projectDir}" && node "${coordinatorPath}" ${courseCode} --concurrency 5 --batch-size 200 --job-id ${jobId}`
    const escapedCmd = cmd.replace(/"/g, '\\"')

    function spawnInTerminalApp() {
      const termScript = `tell application "Terminal"
  activate
  do script "${escapedCmd}"
end tell`
      const termAgent = spawnProc('osascript', ['-e', termScript], { stdio: 'pipe', detached: true })
      termAgent.unref()
      termAgent.on('error', async (e) => {
        logger.error(`[GENDER-PREP] Terminal.app spawn failed: ${e.message}`)
        await supabase.from('build_jobs').update({ status: 'failed', error_message: `Terminal spawn failed: ${e.message}`, completed_at: new Date().toISOString() }).eq('id', jobId)
      })
      termAgent.on('exit', async (code) => {
        if (code !== 0) {
          logger.error(`[GENDER-PREP] Terminal.app osascript exit code ${code}`)
          await supabase.from('build_jobs').update({ status: 'failed', error_message: `Terminal spawn exited with code ${code}`, completed_at: new Date().toISOString() }).eq('id', jobId)
        } else {
          logger.info(`[GENDER-PREP] Coordinator launched in Terminal.app for ${courseCode}`)
        }
      })
    }

    const itermScript = `tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    set name to "Gender Prep: ${courseCode}"
    write text "${escapedCmd}"
  end tell
end tell`

    const agent = spawnProc('osascript', ['-e', itermScript], { stdio: 'pipe', detached: true })
    agent.unref()
    agent.on('error', async (e) => {
      logger.warn(`[GENDER-PREP] iTerm not available (${e.message}), falling back to Terminal.app`)
      spawnInTerminalApp()
    })
    agent.on('exit', async (code) => {
      if (code !== 0) {
        logger.warn(`[GENDER-PREP] iTerm failed (exit ${code}), falling back to Terminal.app`)
        spawnInTerminalApp()
      } else {
        logger.info(`[GENDER-PREP] Coordinator launched in iTerm for ${courseCode}`)
      }
    })

    const BATCH_SIZE = 200
    const estimatedBatches = Math.ceil(estimatedTexts / BATCH_SIZE)

    await supabase.from('orchestrator_messages').insert({
      course_code: courseCode,
      direction: 'agent_to_human',
      message: `Gender prep spawned — processing ${estimatedTexts} texts across ${estimatedBatches} batches`,
      status: 'pending',
      metadata: { action: 'gender_prep_spawned' }
    })

    res.json({
      ok: true,
      spawned: true,
      course_code: courseCode,
      language: course.target_lang,
      totalTexts: estimatedTexts,
      agents: 1,
      batches: estimatedBatches,
      concurrency: 5,
      batchSize: BATCH_SIZE,
      message: `Coordinator spawned in 1 iTerm window (${estimatedTexts} texts, ${estimatedBatches} batches, concurrency 5)`
    })
  } catch (error) {
    logger.error('Error spawning gender-prep coordinator:', error)
    res.status(500).json({ error: error.message })
  }
})

// generateGenderPrepBrief removed — brief generation now lives in gender-prep-coordinator.cjs

// GET /api/production/:courseCode/gender-prep/flag-count
// Count audio flags with reason 'gender-expansion-regen'
app.get('/api/production/:courseCode/gender-prep/flag-count', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const supabase = supabaseClient.getClient()

    // Get flags with audio details for role breakdown
    const { data: flags, error } = await supabase
      .from('audio_flags')
      .select('audio_uuid')
      .eq('course_code', courseCode)
      .eq('reason', 'gender-expansion-regen')

    if (error) throw error

    const flaggedCount = flags?.length || 0

    // Get role breakdown if there are flags
    let roleBreakdown = { target1: 0, target2: 0 }
    if (flaggedCount > 0) {
      const uuids = flags.map(f => f.audio_uuid)
      // Query audio to get roles (in batches of 500)
      for (let i = 0; i < uuids.length; i += 500) {
        const batch = uuids.slice(i, i + 500)
        const { data: audioRows } = await supabase
          .from('course_audio')
          .select('id, role')
          .in('id', batch)
        if (audioRows) {
          for (const row of audioRows) {
            if (row.role === 'target1') roleBreakdown.target1++
            else if (row.role === 'target2') roleBreakdown.target2++
          }
        }
      }
    }

    res.json({
      flagged: flaggedCount,
      role_breakdown: roleBreakdown
    })
  } catch (error) {
    logger.error('Error fetching gender-prep flag count:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// CHECKPOINT PROXY ROUTES (to Course Builder API)
// =============================================================================

const COURSE_BUILDER_API_URL = process.env.COURSE_BUILDER_API_URL || 'http://localhost:3471'

// Proxy /api/checkpoint/* to Course Builder API
app.use('/api/checkpoint', async (req, res) => {
  const targetUrl = `${COURSE_BUILDER_API_URL}/api/checkpoint${req.url}`
  logger.info(`[Checkpoint Proxy] ${req.method} ${targetUrl}`)

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })

    res.status(response.status).json(response.data)
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Course Builder API not running',
        message: 'Start with: pm2 start services/course-builder-api.cjs --name course-builder'
      })
    }

    const status = error.response?.status || 500
    const data = error.response?.data || { error: error.message }
    res.status(status).json(data)
  }
})

// ─── Admin: iTerm2 Agent Management ─────────────────────────────────

const { execFile, spawn } = require('child_process')
const { promisify } = require('util')
const execFileAsync = promisify(execFile)

// Run `pm2 save` only when every managed process is online and has been up
// long enough to not be mid-flap. Polls pm2 jlist until healthy or timeout.
// Reason this exists: a naive `pm2 restart X && pm2 save` can capture a
// 'launching' or 'errored' state into ~/.pm2/dump.pm2, and the next reboot
// will resurrect that broken state — services come up "stopped" and the
// machine is unreachable until someone SSHs in.
async function pm2SaveIfHealthy({ waitMs = 10000, minUptimeMs = 5000 } = {}) {
  const deadline = Date.now() + waitMs
  let lastUnhealthy = []
  while (Date.now() < deadline) {
    try {
      const { stdout } = await execFileAsync('bash', ['-c', 'pm2 jlist'])
      const procs = JSON.parse(stdout || '[]')
      if (procs.length === 0) {
        return { saved: false, reason: 'no pm2 processes' }
      }
      const now = Date.now()
      const unhealthy = procs.filter(p => {
        const status = p.pm2_env?.status
        const uptime = p.pm2_env?.pm_uptime ? now - p.pm2_env.pm_uptime : 0
        return status !== 'online' || uptime < minUptimeMs
      }).map(p => ({
        name: p.name,
        status: p.pm2_env?.status || '?',
        uptime_ms: p.pm2_env?.pm_uptime ? now - p.pm2_env.pm_uptime : 0
      }))
      if (unhealthy.length === 0) {
        await execFileAsync('bash', ['-c', 'pm2 save'])
        return { saved: true, reason: 'all online' }
      }
      lastUnhealthy = unhealthy
    } catch (e) {
      lastUnhealthy = [{ name: 'pm2 jlist failed', status: e.message }]
    }
    await new Promise(r => setTimeout(r, 500))
  }
  logger.warn('[pm2SaveIfHealthy] save skipped, unhealthy:',
    lastUnhealthy.map(u => `${u.name}=${u.status}`).join(', '))
  return { saved: false, reason: 'unhealthy after timeout', unhealthy: lastUnhealthy }
}

// GET /api/admin/agents — list all iTerm2 sessions with their status
app.get('/api/admin/agents', async (req, res) => {
  try {
    const { stdout } = await execFileAsync('osascript', ['-e', `
      tell application "iTerm"
        set output to ""
        set winIdx to 0
        repeat with w in windows
          set winIdx to winIdx + 1
          set tabIdx to 0
          repeat with t in tabs of w
            set tabIdx to tabIdx + 1
            repeat with s in sessions of t
              set sName to name of s
              set isAt to (is at shell prompt of s)
              set sTty to tty of s
              set output to output & winIdx & "," & tabIdx & "," & sTty & "," & isAt & "," & sName & linefeed
            end repeat
          end repeat
        end repeat
        return output
      end tell
    `])

    const sessions = stdout.trim().split('\n').filter(Boolean).map(line => {
      const [winIdx, tabIdx, tty, atPrompt, ...nameParts] = line.split(',')
      return {
        window: parseInt(winIdx),
        tab: parseInt(tabIdx),
        tty: tty.trim(),
        atPrompt: atPrompt.trim() === 'true',
        name: nameParts.join(',').trim()
      }
    })

    res.json({ ok: true, sessions, total: sessions.length, idle: sessions.filter(s => s.atPrompt).length })
  } catch (error) {
    logger.error('[Admin] Error listing agents:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/admin/agents/kill — kill specific sessions by PID, or all idle ones
// Body: { pids: [123, 456] } or { idle: true } to kill all at-prompt sessions
app.post('/api/admin/agents/kill', async (req, res) => {
  try {
    const { pids, idle } = req.body || {}

    if (idle) {
      // Kill all sessions that are at shell prompt (completed agents)
      const { stdout } = await execFileAsync('osascript', ['-e', `
        tell application "iTerm"
          set killed to 0
          repeat with w in windows
            repeat with t in tabs of w
              repeat with s in sessions of t
                if (is at shell prompt of s) then
                  tell s to close
                  set killed to killed + 1
                end if
              end repeat
            end repeat
          end repeat
          return killed
        end tell
      `])
      const killed = parseInt(stdout.trim()) || 0
      res.json({ ok: true, killed, mode: 'idle' })
    } else if (pids && pids.length > 0) {
      // Kill specific PIDs
      let killed = 0
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGTERM')
          killed++
        } catch (e) {
          logger.warn(`[Admin] Could not kill PID ${pid}: ${e.message}`)
        }
      }
      res.json({ ok: true, killed, requested: pids.length, mode: 'pids' })
    } else {
      res.status(400).json({ error: 'Provide { pids: [...] } or { idle: true }' })
    }
  } catch (error) {
    logger.error('[Admin] Error killing agents:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/admin/agents/kill-all — kill all claude processes then close iTerm windows
app.post('/api/admin/agents/kill-all', async (req, res) => {
  try {
    // Step 1: Find and kill all claude processes (except our own node process)
    const { stdout: psList } = await execFileAsync('bash', ['-c', 'ps aux | grep "[c]laude" | awk \'{print $2}\''])
    const claudePids = psList.trim().split('\n').filter(Boolean).map(Number)

    let killed = 0
    for (const pid of claudePids) {
      try {
        process.kill(pid, 'SIGTERM')
        killed++
      } catch (e) { /* already dead */ }
    }

    // Step 2: Wait for processes to die, then force-kill iTerm2 app
    setTimeout(async () => {
      try {
        await execFileAsync('bash', ['-c', 'pkill -9 iTerm2 || true'], { timeout: 5000 })
        logger.info('[Admin] iTerm2 force-killed')
      } catch (e) {
        logger.warn('[Admin] iTerm2 force-kill note:', e.message)
      }
    }, 2000)

    res.json({ ok: true, claudeProcessesKilled: killed, pids: claudePids, message: `Killed ${killed} claude processes. iTerm windows closing in 2s.` })
  } catch (error) {
    logger.error('[Admin] Error killing agents:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/admin/system — system stats (RAM, CPU, uptime)
const os = require('os')
app.get('/api/admin/system', async (req, res) => {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  // Get top memory consumers
  let topProcesses = []
  try {
    const { stdout } = await execFileAsync('bash', ['-c', 'ps aux --sort=-%mem 2>/dev/null || ps aux -m 2>/dev/null | head -16'])
    const lines = stdout.trim().split('\n')
    topProcesses = lines.slice(1, 16).map(line => {
      const parts = line.trim().split(/\s+/)
      return { user: parts[0], pid: parts[1], cpu: parts[2] + '%', mem: parts[3] + '%', command: parts.slice(10).join(' ').substring(0, 80) }
    })
  } catch (e) { /* ignore */ }

  res.json({
    ok: true,
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: Math.floor(os.uptime() / 3600) + 'h',
    cpu: { model: os.cpus()[0]?.model, cores: os.cpus().length, load: os.loadavg() },
    memory: {
      total: (totalMem / 1e9).toFixed(1) + ' GB',
      used: (usedMem / 1e9).toFixed(1) + ' GB',
      free: (freeMem / 1e9).toFixed(1) + ' GB',
      percent: ((usedMem / totalMem) * 100).toFixed(1) + '%'
    },
    topProcesses
  })
})

// GET /api/admin/pm2 — pm2 process list with watch status
app.get('/api/admin/pm2', async (req, res) => {
  try {
    const { stdout } = await execFileAsync('bash', ['-c', 'pm2 jlist'])
    const procs = JSON.parse(stdout)
    res.json({ ok: true, processes: procs.map(p => ({
      name: p.name, pid: p.pid, status: p.pm2_env?.status,
      watch: p.pm2_env?.watch, restarts: p.pm2_env?.restart_time,
      memory: Math.round((p.monit?.memory || 0) / 1e6) + 'MB',
      cpu: (p.monit?.cpu || 0) + '%'
    }))})
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/admin/pm2/fix — disable watch on all processes and save
app.post('/api/admin/pm2/fix', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  // Respond immediately — restart happens after, so connection isn't dropped
  res.json({ ok: true, message: 'Disabling pm2 watch and restarting all services in 3s...' })
  setTimeout(async () => {
    try {
      await execFileAsync('bash', ['-c', 'pm2 restart all --watch false'])
      await pm2SaveIfHealthy()
    } catch (e) {
      logger.warn('[Admin] pm2/fix error:', e.message)
    }
  }, 3000)
})

// POST /api/admin/pm2/restart — restart a named pm2 process
// Self-restart (production-api restarting itself) replies first, then restarts
// after a short delay so the browser actually receives the success response
// instead of seeing the connection drop mid-reply.
app.post('/api/admin/pm2/restart', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const name = req.body?.name
  if (!name) return res.status(400).json({ error: 'name required' })
  const selfName = process.env.name || 'production-api'
  if (name === selfName) {
    res.json({ ok: true, name, message: `Self-restart scheduled in 1s` })
    setTimeout(async () => {
      try {
        await execFileAsync('bash', ['-c', `pm2 restart ${name}`])
        await pm2SaveIfHealthy()
      } catch (e) { logger.warn('[Admin] self-restart error:', e.message) }
    }, 1000)
    return
  }
  try {
    const { stdout } = await execFileAsync('bash', ['-c', `pm2 restart ${name}`])
    const save = await pm2SaveIfHealthy()
    res.json({ ok: true, name, output: stdout.trim(), save })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// POST /api/admin/pm2/stop — stop a named pm2 process (e.g. ssi-dashboard dev server)
app.post('/api/admin/pm2/stop', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const name = req.body?.name
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const { stdout } = await execFileAsync('bash', ['-c', `pm2 stop ${name}`])
    // Stop is an explicit user action — capture it. But only if no OTHER
    // process is mid-flap, otherwise we'd persist some unrelated bad state.
    const save = await pm2SaveIfHealthy({ waitMs: 3000 })
    res.json({ ok: true, name, output: stdout.trim(), save })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// POST /api/admin/pm2/delete — permanently remove a process from pm2
app.post('/api/admin/pm2/delete', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const name = req.body?.name
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const { stdout } = await execFileAsync('bash', ['-c', `pm2 delete ${name}`])
    const save = await pm2SaveIfHealthy({ waitMs: 3000 })
    res.json({ ok: true, name, output: stdout.trim(), save })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// POST /api/admin/setup-remote — one-time remote setup for headless operation
// Saves pm2 process list, checks startup config, adds sudoers NOPASSWD for reboot
app.post('/api/admin/setup-remote', async (req, res) => {
  const secret = req.query.secret || req.headers['x-admin-secret']
  const expected = process.env.ADMIN_SECRET
  if (!expected || secret !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const results = {}

  // 1. pm2 save (healthy only)
  try {
    const result = await pm2SaveIfHealthy()
    results.pm2_save = { ok: result.saved, ...result }
  } catch (e) {
    results.pm2_save = { ok: false, error: e.message }
  }

  // 2. Check if pm2 startup is already configured (launchd plist exists)
  try {
    const { stdout } = await execFileAsync('bash', ['-c', 'launchctl list | grep pm2 || echo "NOT_FOUND"'])
    results.pm2_startup = { configured: !stdout.includes('NOT_FOUND'), output: stdout.trim() }
  } catch (e) {
    results.pm2_startup = { configured: false, error: e.message }
  }

  // 3. Add sudoers NOPASSWD for reboot (so restart-machine works headless)
  try {
    const user = process.env.USER || 'tomcassidy'
    const sudoersLine = `${user} ALL=(ALL) NOPASSWD: /sbin/reboot`
    const sudoersFile = '/etc/sudoers.d/ssi-reboot'
    await execFileAsync('bash', ['-c', `echo "${sudoersLine}" | sudo tee ${sudoersFile} > /dev/null && sudo chmod 440 ${sudoersFile}`])
    results.sudoers_reboot = { ok: true, file: sudoersFile }
  } catch (e) {
    results.sudoers_reboot = { ok: false, error: e.message }
  }

  // 4. Set SPAWN_MODE=headless in .env (removes all iTerm2/osascript dependencies)
  try {
    const envPath = path.join(__dirname, '..', '.env')
    let envContent = fs.readFileSync(envPath, 'utf8')
    if (envContent.includes('SPAWN_MODE=')) {
      envContent = envContent.replace(/SPAWN_MODE=.*/g, 'SPAWN_MODE=headless')
    } else {
      envContent += '\n# Headless agent spawning — no iTerm2/osascript needed\nSPAWN_MODE=headless\n'
    }
    fs.writeFileSync(envPath, envContent)
    results.spawn_mode = { ok: true, value: 'headless', note: 'Agents now run as background processes — no iTerm2 permissions needed' }
  } catch (e) {
    results.spawn_mode = { ok: false, error: e.message }
  }

  // 5. Check auto-login status
  try {
    const { stdout } = await execFileAsync('bash', ['-c', 'sudo defaults read /Library/Preferences/com.apple.loginwindow autoLoginUser 2>/dev/null || echo "NOT_SET"'])
    results.auto_login = { configured: !stdout.includes('NOT_SET'), current_user: stdout.trim() }
  } catch (e) {
    results.auto_login = { configured: false, note: 'Must be set manually in System Settings → Users & Groups' }
  }

  results.manual_steps_still_needed = [
    !results.auto_login?.configured && 'Auto-login: System Settings → Users & Groups → enable Automatic Login'
  ].filter(Boolean)

  results.note = 'SPAWN_MODE=headless eliminates all iTerm2/Automation permission requirements'

  res.json({ ok: true, ...results })
})

// POST /api/admin/kill-pid — kill a process by PID
app.post('/api/admin/kill-pid', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const pids = Array.isArray(req.body?.pids) ? req.body.pids : [req.body?.pid]
  if (!pids[0]) return res.status(400).json({ error: 'pid or pids required' })
  const results = {}
  for (const pid of pids) {
    try {
      await execFileAsync('kill', ['-9', String(pid)])
      results[pid] = 'killed'
    } catch (e) {
      results[pid] = e.message
    }
  }
  res.json({ ok: true, results })
})

// POST /api/admin/git-pull — stash local changes and pull latest code, then restart services
app.post('/api/admin/git-pull', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const projectDir = path.resolve(__dirname, '..')
  const log = []
  const add = msg => { log.push(msg); logger.log('[git-pull]', msg) }
  try {
    const status = (await execFileAsync('git', ['status', '--porcelain'], { cwd: projectDir })).stdout.trim()
    if (status) {
      add(`Stashing ${status.split('\n').length} local changes...`)
      await execFileAsync('git', ['stash'], { cwd: projectDir })
    }
    const pull = (await execFileAsync('git', ['pull', '--ff-only'], { cwd: projectDir })).stdout.trim()
    add(`git pull: ${pull}`)
    res.json({ ok: true, log })
    // Restart services after responding. Save only after they settle —
    // see pm2SaveIfHealthy comment for why this matters.
    setTimeout(async () => {
      try {
        await execFileAsync('bash', ['-c', 'pm2 restart all --watch false'])
        await pm2SaveIfHealthy()
      } catch (e) { logger.warn('[git-pull] restart error:', e.message) }
    }, 2000)
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, log })
  }
})

// POST /api/admin/kill-apps — kill non-essential GUI apps to free RAM
// Kills: Google Chrome, iTerm2, Safari, Finder (optional), Xcode, etc.
// macOS-only: on a headless Linux host there are no GUI apps to kill, and
// `killall "Google Chrome"` would just be a no-op the caller can't distinguish
// from success. Refuse honestly instead.
app.post('/api/admin/kill-apps', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  if (require('os').platform() !== 'darwin') {
    return res.status(400).json({
      ok: false,
      error: 'kill-apps is macOS-only — this host has no GUI apps to kill.'
    })
  }
  const targets = req.body?.apps || ['Google Chrome', 'iTerm2']
  const results = {}
  for (const app of targets) {
    try {
      await execFileAsync('killall', [app])
      results[app] = 'killed'
    } catch (e) {
      results[app] = e.stderr?.includes('No matching processes') ? 'not running' : e.message
    }
  }
  res.json({ ok: true, results })
})

// Memory stats that mean what a human expects.
// os.freemem() on macOS only counts truly-free pages — file cache shows as
// "used" even though it's instantly reclaimable, so the raw metric pegs at
// 95-99% on a healthy machine. vm_stat gives us Activity Monitor's numbers:
// wired + active + compressed = real "Memory Used"; the rest is cache.
async function getMemStats() {
  const os = require('os')
  const totalBytes = os.totalmem()

  if (os.platform() === 'darwin') {
    try {
      const { stdout } = await execFileAsync('vm_stat')
      const pageSizeMatch = stdout.match(/page size of (\d+) bytes/)
      const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1], 10) : 16384
      const grab = (label) => {
        const m = stdout.match(new RegExp(`^${label}:\\s+(\\d+)\\.?\\s*$`, 'm'))
        return m ? parseInt(m[1], 10) : 0
      }
      const wired       = grab('Pages wired down')
      const active      = grab('Pages active')
      const compressor  = grab('Pages occupied by compressor')
      const usedBytes   = Math.min(totalBytes, (wired + active + compressor) * pageSize)
      return {
        total_bytes: totalBytes,
        used_bytes: usedBytes,
        free_bytes: totalBytes - usedBytes,
        used_percent: Math.round((usedBytes / totalBytes) * 1000) / 10
      }
    } catch (_) { /* fall through to os.freemem() */ }
  }

  const freeMem = os.freemem()
  const usedMem = totalBytes - freeMem
  return {
    total_bytes: totalBytes,
    used_bytes: usedMem,
    free_bytes: freeMem,
    used_percent: Math.round((usedMem / totalBytes) * 1000) / 10
  }
}

// Disk stats for the root volume. `df -Pk /` gives portable single-line
// output with sizes in 1024-byte blocks. On macOS APFS the raw "1024-blocks"
// includes sealed system volumes, so used/total reads at ~3% on a healthy
// machine; we report the container-fullness view (used / (used + available))
// to match df's own Capacity column and what a human means by "disk full".
async function getDiskStats() {
  try {
    const { stdout } = await execFileAsync('df', ['-Pk', '/'])
    const lines = stdout.trim().split('\n')
    const parts = lines[lines.length - 1].trim().split(/\s+/)
    const usedBytes = parseInt(parts[2], 10) * 1024
    const freeBytes = parseInt(parts[3], 10) * 1024
    const allocatableBytes = usedBytes + freeBytes
    return {
      total_bytes: allocatableBytes,
      used_bytes: usedBytes,
      free_bytes: freeBytes,
      used_percent: Math.round((usedBytes / allocatableBytes) * 1000) / 10,
      mount: parts[5] || '/'
    }
  } catch (e) {
    return { error: e.message }
  }
}

// Check reboot readiness — whether services will come back after a reboot.
// What "comes back" MEANS is platform-specific: on macOS it's PM2's launchd
// agent + saved dump; on Linux this API runs as a systemd USER unit, so it's
// the unit being enabled plus user lingering (without linger, user units die
// with the last session and never start at boot).
//
// Two independent questions, deliberately kept apart:
//   ready   — will things restart afterwards?
//   reboot  — can this host be rebooted from here at all?
// The old code conflated them, so a host that simply lacks passwordless sudo
// was told "PM2 would not auto-resurrect", which was not true.
//
// Every probe is readable without sudo.
async function checkRebootReadiness() {
  const os = require('os')
  const platform = os.platform()
  return platform === 'linux'
    ? await linuxRebootReadiness()
    : await darwinRebootReadiness()
}

// macOS path — unchanged semantics and unchanged field names (Camberley).
async function darwinRebootReadiness() {
  const os = require('os')
  const home = os.homedir()
  const user = os.userInfo().username
  const plistPath = `${home}/Library/LaunchAgents/pm2.${user}.plist`
  const dumpPath = `${home}/.pm2/dump.pm2`

  const out = {
    platform: os.platform(),
    pm2_launch_agent: { exists: false, path: plistPath },
    pm2_dump: { exists: false, path: dumpPath, mtime: null, age_seconds: null },
    ready: false,
    fix_command: null
  }
  try {
    const s = await fs.stat(plistPath)
    out.pm2_launch_agent.exists = true
    out.pm2_launch_agent.mtime = s.mtime.toISOString()
  } catch {}
  try {
    const s = await fs.stat(dumpPath)
    out.pm2_dump.exists = true
    out.pm2_dump.mtime = s.mtime.toISOString()
    out.pm2_dump.age_seconds = Math.round((Date.now() - s.mtimeMs) / 1000)
  } catch {}

  out.ready = out.pm2_launch_agent.exists && out.pm2_dump.exists
  if (!out.pm2_launch_agent.exists) {
    out.fix_command = `sudo env PATH=$PATH:$(dirname $(which node)) pm2 startup launchd -u ${user} --hp ${home} && pm2 save`
  } else if (!out.pm2_dump.exists) {
    out.fix_command = 'pm2 save'
  }

  // Same two rows the panel has always shown, now as generic checks so the
  // UI has one render path across platforms.
  out.checks = [
    {
      key: 'pm2_launch_agent',
      label: 'PM2 launch agent',
      ok: out.pm2_launch_agent.exists,
      detail: out.pm2_launch_agent.exists ? 'installed' : 'missing'
    },
    {
      key: 'pm2_dump',
      label: 'PM2 saved state',
      ok: out.pm2_dump.exists,
      detail: out.pm2_dump.exists ? null : 'missing',
      age_seconds: out.pm2_dump.age_seconds
    }
  ]
  // osascript restart needs no sudo and always exists on macOS.
  out.reboot = { capable: true, reason: null }
  return out
}

// Linux path — systemd user unit + lingering.
async function linuxRebootReadiness() {
  const os = require('os')
  const user = os.userInfo().username
  const unit = process.env.POPTY_SYSTEMD_UNIT || 'popty-production-api'

  // When this process IS the user unit, XDG_RUNTIME_DIR is already set; keep a
  // fallback so an interactive/ssh invocation probes the same user bus.
  const env = {
    ...process.env,
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${os.userInfo().uid}`
  }
  const probe = async (cmd, args) => {
    try {
      const { stdout } = await execFileAsync(cmd, args, { env })
      return stdout.trim()
    } catch (e) {
      // systemctl exits non-zero for "disabled"/"static" but still prints it.
      return (e.stdout || '').trim() || null
    }
  }

  const enabledState = await probe('systemctl', ['--user', 'is-enabled', unit])
  const lingerRaw = await probe('loginctl', ['show-user', user, '--property=Linger'])
  const linger = lingerRaw === 'Linger=yes'
  const enabled = enabledState === 'enabled' || enabledState === 'enabled-runtime'

  const out = {
    platform: 'linux',
    systemd_unit: { name: unit, enabled, state: enabledState },
    linger: { enabled: linger, user },
    ready: enabled && linger,
    fix_command: null,
    checks: [
      {
        key: 'systemd_unit',
        label: `Service ${unit}`,
        ok: enabled,
        detail: enabledState || 'not found'
      },
      {
        key: 'linger',
        label: 'User lingering',
        ok: linger,
        detail: linger ? 'on' : 'off'
      }
    ]
  }
  if (!out.ready) {
    const fixes = []
    if (!enabled) fixes.push(`systemctl --user enable ${unit}`)
    if (!linger) fixes.push(`sudo loginctl enable-linger ${user}`)
    out.fix_command = fixes.join(' && ')
  }

  // Rebooting a Linux host from here needs passwordless sudo. If we don't have
  // it, say so plainly rather than blaming auto-resurrect.
  let capable = false
  try {
    await execFileAsync('sudo', ['-n', 'true'])
    capable = true
  } catch {}
  out.reboot = capable
    ? { capable: true, reason: null }
    : {
        capable: false,
        reason: `No passwordless sudo for ${user} on this host — reboot it from the VM console/host instead.`
      }
  return out
}

// GET /api/admin/system-health — RAM, load, PM2 process snapshot, reboot readiness
// Read-only; no auth (same posture as /health).
app.get('/api/admin/system-health', async (req, res) => {
  const os = require('os')
  const health = {
    hostname: os.hostname(),
    platform: os.platform(),
    uptime_seconds: Math.round(os.uptime()),
    mem: await getMemStats(),
    disk: await getDiskStats(),
    load_avg: os.loadavg(),
    cpu_count: os.cpus().length,
    pm2: [],
    reboot_readiness: await checkRebootReadiness()
  }
  try {
    const { stdout } = await execFileAsync('bash', ['-c', 'pm2 jlist'])
    const list = JSON.parse(stdout || '[]')
    health.pm2 = list.map(p => ({
      name: p.name,
      pm_id: p.pm_id,
      pid: p.pid,
      status: p.pm2_env?.status,
      restart_count: p.pm2_env?.restart_time,
      uptime_ms: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : null,
      mem_bytes: p.monit?.memory ?? 0,
      cpu_percent: p.monit?.cpu ?? 0
    }))
  } catch (e) {
    health.pm2_error = e.message
  }
  res.json(health)
})

// POST /api/admin/restart-machine — remotely reboot the machine
// Refuses unless reboot readiness checks pass, to avoid bricking a remote
// box whose PM2 won't auto-resurrect. Pass ?force=1 to override.
// The reboot button does two things and nothing else: it preserves the
// last-known-good pm2 dump, then reboots. Service recovery is not its job —
// use the restart-all button for that. Keeping responsibilities separate is
// what makes this reliable.
app.post('/api/admin/restart-machine', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const force = req.query.force === '1' || req.body?.force === true

  // Resurrect must be wired up, otherwise nothing comes back on boot.
  const readiness = await checkRebootReadiness()
  if (!force && !readiness.ready) {
    return res.status(412).json({
      ok: false,
      error: readiness.platform === 'linux'
        ? 'Reboot blocked: services are not configured to start at boot.'
        : 'Reboot blocked: PM2 auto-resurrect is not configured.',
      readiness,
      hint: 'Run the fix_command on the target machine, or pass ?force=1 to reboot anyway.'
    })
  }
  // No amount of ?force=1 conjures sudo we don't have — fail before pretending.
  if (readiness.reboot && readiness.reboot.capable === false) {
    return res.status(412).json({
      ok: false,
      error: `Reboot unavailable: ${readiness.reboot.reason}`,
      readiness
    })
  }

  // Save the current pm2 state ONLY if every process is online. If anything
  // is unhealthy we leave the existing dump alone — resurrect will use the
  // last known-good snapshot. Never overwrite a good dump with a broken one.
  const saveResult = await pm2SaveIfHealthy({ waitMs: 3000 })
  const save = saveResult.saved ? 'saved current state' : 'preserved previous dump'

  res.json({ ok: true, save, saveResult, message: 'Rebooting in 5 seconds...' })

  // Detached so it survives if production-api gets killed for any reason.
  // macOS: osascript goes through the GUI restart flow, needs no sudo, and asks
  // apps to quit gracefully. Linux is headless — there are no GUI apps to quit
  // and no osascript; systemctl reboot (via the sudo we just verified) is it.
  const rebootScript = readiness.platform === 'linux'
    ? 'sleep 5; sudo -n systemctl reboot || sudo -n /sbin/reboot'
    : 'sleep 5; ' +
      'killall iTerm2 2>/dev/null; killall "Google Chrome" 2>/dev/null; ' +
      'osascript -e \'tell application "System Events" to restart\' || sudo -n /sbin/reboot'
  spawn('bash', ['-c', rebootScript], { detached: true, stdio: 'ignore' }).unref()
})

// ============================================================================
// Content audit log — read stats + manual cleanup
// ============================================================================
// Backs the popty Maintenance page. The audit log itself is populated by
// triggers on the at-risk content tables (course_legos, course_seeds, etc.)
// — see ssi-learning-app migration 20260510_content_audit_history.sql.
// Retention is manual: this endpoint surfaces the stats, the Clean button
// runs the DELETE.

// GET /api/admin/audit-stats — row count, oldest entry, days since oldest.
// Uses Postgres's planner row estimate (count:'estimated') instead of exact count.
// The oldest-row query is best-effort: until the changed_at index exists (see
// migration 20260517_content_audit_log_changed_at_index.sql), ORDER BY changed_at
// is a full table scan and trips Postgres's 8s statement_timeout on a 4M-row log.
// We swallow that timeout so the page still loads with row count visible —
// "oldest" returns null and the panel shows "—" instead of 500-ing the whole tab.
app.get('/api/admin/audit-stats', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  try {
    const sb = supabaseClient.getClient()
    const [countRes, oldestRes] = await Promise.all([
      sb.from('content_audit_log').select('*', { count: 'estimated', head: true }),
      sb.from('content_audit_log').select('changed_at').order('changed_at', { ascending: true }).limit(1)
    ])
    if (countRes.error) throw countRes.error
    if (oldestRes.error) {
      logger.warn('[Audit] oldest-row query failed (likely missing index on changed_at):', oldestRes.error?.message)
    }

    const oldest_at = oldestRes.error ? null : (oldestRes.data?.[0]?.changed_at ?? null)
    const days_since_oldest = oldest_at
      ? Math.floor((Date.now() - new Date(oldest_at).getTime()) / (1000 * 60 * 60 * 24))
      : null

    res.json({
      total_rows: countRes.count ?? 0,
      oldest_at,
      days_since_oldest,
      oldest_unavailable: !!oldestRes.error,
    })
  } catch (e) {
    logger.error('[Audit] stats error:', e?.message || e?.code || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// GET /api/admin/audit-events — searchable feed of recent audit rows
// Query params (all optional):
//   table=course_legos      filter by source table
//   change_type=UPDATE      filter by op (UPDATE or DELETE)
//   hours=24                window in hours (default 24, capped at 720 = 30 days)
//                           fractional allowed (0.5 = last 30 min, 0.25 = 15 min)
//   q=<text>                substring search inside the JSONB old_row
//   primary_key=<id>        exact match on primary_key
//   limit=100 / offset=0    pagination (limit capped at 500)
// Returns events newest-first + total count for the filter.
app.get('/api/admin/audit-events', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  try {
    const sb = supabaseClient.getClient()
    const hoursRaw = Number(req.query.hours)
    // Fractional hours allowed so the UI can offer "last 30 min" without
    // introducing a separate minutes param. Tiny floor prevents 0/negative.
    const hours = Number.isFinite(hoursRaw) && hoursRaw > 0
      ? Math.min(hoursRaw, 720)
      : 24
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    const limitRaw = Number(req.query.limit)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 500)
      : 100
    const offsetRaw = Number(req.query.offset)
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0
      ? Math.floor(offsetRaw)
      : 0

    // `count: 'estimated'` because content_audit_log is ~9M rows and growing.
    // An exact count requires Postgres to scan and count every matching row,
    // which hits the 8s statement_timeout on this table. The estimated count
    // is good enough for the UI ("~60k events in last 24h") and the page
    // through is independent of the count value anyway.
    // Deliberately omit old_row from the list select. Some old_row JSONB
    // payloads are very large (a single course_legos snapshot can be ~100 KB);
    // shipping 100 of them tipped this query past the statement_timeout under
    // production network conditions. The expanded-row UI fetches old_row via
    // /api/admin/audit-row?event_id=… on demand instead.
    let q = sb.from('content_audit_log')
      .select('id,changed_at,change_type,table_name,primary_key,changed_by_role,changed_by_uid', { count: 'estimated' })
      .gte('changed_at', since)
      .order('changed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (req.query.table) q = q.eq('table_name', String(req.query.table))
    if (req.query.change_type) {
      const t = String(req.query.change_type).toUpperCase()
      if (t === 'UPDATE' || t === 'DELETE') q = q.eq('change_type', t)
    }
    if (req.query.primary_key) q = q.eq('primary_key', String(req.query.primary_key))
    if (req.query.q) {
      // Substring search across the fields most likely to be useful: the
      // primary key (lego id, course code) and the visible text fields the
      // audit usually captures (known_text, target_text). PostgREST can
      // ilike on JSONB ->> extractions; can't ilike on a JSONB ::text cast.
      const needle = String(req.query.q).replace(/[%_,]/g, ' ')  // commas would break .or()
      const pat = `%${needle}%`
      q = q.or(
        `primary_key.ilike.${pat},` +
        `old_row->>known_text.ilike.${pat},` +
        `old_row->>target_text.ilike.${pat}`
      )
    }

    const { data, count, error } = await q
    if (error) throw error
    res.json({ events: data || [], total: count ?? 0, limit, offset, hours })
  } catch (e) {
    logger.error('[Audit] events error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Map of audited table → primary-key column. Required for restore to know
// what to match on / upsert against. Keep in sync with the triggers in
// ssi-learning-app migration 20260510_content_audit_history.sql.
const AUDIT_TABLE_PK = {
  course_legos: 'id',
  course_seeds: 'id',
  course_practice_phrases: 'id',
  course_audio: 'id',
  courses: 'course_code',
  // Added 2026-05-11 (ssi-learning-app migration 20260511_audit_more_content_tables.sql)
  canonical_seeds: 'id',
  canonical_seed_translations: 'id',
  listening_pod_sentences: 'id',
  listening_pods: 'id',
  lego_introductions: 'id',
  voices: 'voice_id',
  shared_audio: 'id'
}

// GET /api/admin/audit-row?table=X&pk=Y[&event_id=N] — fetch the current
// live row at (table, primary_key), and optionally the captured old_row
// + change_type for a specific audit event id. Used by the Maintenance UI
// to render a captured-vs-current diff when an audit event is expanded.
//
// Returns { current, old_row, change_type }:
//   current     — current live row, or null if it no longer exists (deleted
//                 since the captured snapshot)
//   old_row     — the captured snapshot from content_audit_log for the
//                 given event_id, or null if event_id not provided/not found
//   change_type — 'UPDATE' | 'DELETE' for that event, or null
//
// old_row is fetched per-row on expand rather than included in the list
// query because some old_row JSONB payloads are very large (~100 KB) and
// shipping 100 of them in the list response tipped that query past the
// statement_timeout.
app.get('/api/admin/audit-row', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const tableName = String(req.query.table || '')
  const pkValue = String(req.query.pk || '')
  const eventId = req.query.event_id ? String(req.query.event_id) : null
  if (!tableName || !pkValue) return res.status(400).json({ error: 'table + pk required' })
  const pkCol = AUDIT_TABLE_PK[tableName]
  if (!pkCol) return res.status(400).json({ error: `unknown table ${tableName}` })
  try {
    const sb = supabaseClient.getClient()
    const queries = [
      sb.from(tableName).select('*').eq(pkCol, pkValue).maybeSingle(),
    ]
    if (eventId) {
      queries.push(
        sb.from('content_audit_log')
          .select('old_row,change_type')
          .eq('id', eventId)
          .maybeSingle()
      )
    }
    const results = await Promise.all(queries)
    const currentRes = results[0]
    const eventRes = eventId ? results[1] : null
    if (currentRes.error) throw currentRes.error
    if (eventRes?.error) {
      logger.warn('[Audit] event_id fetch failed:', eventRes.error.message)
    }
    res.json({
      current: currentRes.data ?? null,
      old_row: eventRes?.data?.old_row ?? null,
      change_type: eventRes?.data?.change_type ?? null,
    })
  } catch (e) {
    logger.error('[Audit] row fetch error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/admin/audit-restore — restore rows to their captured state
// Body: { event_ids: [...] }
//
// For each event we upsert the OLD row back into the source table. Upsert
// handles both cases cleanly: UPDATE rollback (row exists, gets reverted to
// the captured snapshot) and DELETE rollback (row absent, gets inserted).
//
// Conflict resolution: if multiple selected events touch the same
// (table, primary_key), only the OLDEST is applied — that restores to the
// earliest pre-change snapshot. Newer events for the same row would just
// overwrite the older restore.
//
// The restore itself is a write to the source table, so the trigger fires
// AGAIN and a new audit row gets captured for the restore. Rollbacks are
// themselves rollback-able.
app.post('/api/admin/audit-restore', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const eventIds = Array.isArray(req.body?.event_ids) ? req.body.event_ids : []
  if (eventIds.length === 0) return res.status(400).json({ error: 'event_ids required' })
  if (eventIds.length > 1000) return res.status(400).json({ error: 'max 1000 events per restore' })

  try {
    const sb = supabaseClient.getClient()
    const { data: events, error: fetchErr } = await sb
      .from('content_audit_log')
      .select('id,changed_at,change_type,table_name,primary_key,old_row')
      .in('id', eventIds)
      .order('changed_at', { ascending: true })  // oldest first
    if (fetchErr) throw fetchErr

    // Oldest-per-(table, primary_key) wins. Drop any newer duplicates from
    // the apply list but report them as "skipped" so the UI can show them.
    const seen = new Set()
    const toApply = []
    const skipped = []
    for (const ev of events) {
      const key = `${ev.table_name} ${ev.primary_key}`
      if (seen.has(key)) {
        skipped.push({ event_id: ev.id, reason: 'newer event selected for same row; oldest applied' })
        continue
      }
      seen.add(key)
      toApply.push(ev)
    }

    const restored = []
    const failed = []
    for (const ev of toApply) {
      const pkCol = AUDIT_TABLE_PK[ev.table_name]
      if (!pkCol) {
        failed.push({ event_id: ev.id, reason: `unknown table ${ev.table_name}` })
        continue
      }
      try {
        const { error } = await sb.from(ev.table_name).upsert(ev.old_row, { onConflict: pkCol })
        if (error) {
          failed.push({ event_id: ev.id, reason: error.message })
        } else {
          restored.push({
            event_id: ev.id,
            table: ev.table_name,
            primary_key: ev.primary_key,
            change_type: ev.change_type
          })
        }
      } catch (e) {
        failed.push({ event_id: ev.id, reason: e.message })
      }
    }

    logger.info(`[Audit] Restore: ${restored.length} ok, ${failed.length} failed, ${skipped.length} skipped`)
    res.json({ restored, failed, skipped })
  } catch (e) {
    logger.error('[Audit] restore error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/admin/audit-cleanup — delete entries older than `days` (default 3)
// Hard-capped at 365 days so a stray/zero/negative value can't wipe the table.
app.post('/api/admin/audit-cleanup', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const requested = Number(req.body?.days)
  const days = Number.isFinite(requested) && requested >= 1 && requested <= 365
    ? Math.floor(requested)
    : 3
  try {
    const sb = supabaseClient.getClient()
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    // Batch the delete: a single DELETE on millions of rows hits Postgres's
    // statement_timeout. We page through old rows by id and delete in
    // chunks, capped at 60s of wall time per request — partial progress is
    // still progress, the next click finishes the job.
    //
    // BATCH=500 because PostgREST builds the DELETE as
    // `?id=in.(uuid1,uuid2,...)` in the URL — 500 UUIDs is ~4KB which sits
    // comfortably under typical URL limits, 5,000 was ~40KB which the
    // ngrok/PostgREST layer rejected with 400 Bad Request.
    const BATCH = 500
    const DEADLINE_MS = 60_000
    const start = Date.now()
    let totalDeleted = 0
    let exhausted = true
    while (Date.now() - start < DEADLINE_MS) {
      const { data: batch, error: selErr } = await sb
        .from('content_audit_log')
        .select('id')
        .lt('changed_at', cutoff)
        .limit(BATCH)
      if (selErr) throw selErr
      if (!batch || batch.length === 0) break
      const ids = batch.map(r => r.id)
      const { error: delErr } = await sb.from('content_audit_log').delete().in('id', ids)
      if (delErr) throw delErr
      totalDeleted += ids.length
      if (ids.length < BATCH) break
      // Loop continues — there's more to delete, take the next batch
      exhausted = ids.length < BATCH
    }
    const more_remaining = !exhausted && (Date.now() - start >= DEADLINE_MS)
    logger.info(`[Audit] Cleanup deleted ${totalDeleted} rows older than ${days} days (more_remaining=${more_remaining})`)
    res.json({ ok: true, deleted: totalDeleted, days, cutoff, more_remaining })
  } catch (e) {
    logger.error('[Audit] cleanup error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// ============================================================================
// Audit archive (S3 tiering) — POST /api/admin/audit-archive
// ============================================================================
// Tiers content_audit_log: archive days older than hotDays to S3 as gzipped
// NDJSON (recovery-readable via recover-pod-audio-from-audit.cjs --archive),
// and with prune=true delete them from Postgres. Reuses the tested CLI
// (tools/archive-audit-log.cjs) via spawn rather than duplicating its logic.
// Capped at ~110s wall time — archive-before-delete means partial progress is
// safe; click again to continue. The nightly scheduler (below) runs the same
// CLI with --execute --prune.
const { spawn: spawnArchive } = require('child_process')
const ARCHIVE_TOOL = path.join(__dirname, '..', 'tools', 'archive-audit-log.cjs')

function runArchiveTool(flags, { timeoutMs = 110_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawnArchive('node', [ARCHIVE_TOOL, ...flags], {
      cwd: path.join(__dirname, '..'),
      env: process.env,
    })
    let stdout = '', stderr = '', timedOut = false
    const killer = setTimeout(() => { timedOut = true; child.kill('SIGTERM') }, timeoutMs)
    child.stdout.on('data', d => { stdout += d })
    child.stderr.on('data', d => { stderr += d })
    child.on('close', (code) => { clearTimeout(killer); resolve({ code, stdout, stderr, timedOut }) })
    child.on('error', (e) => { clearTimeout(killer); resolve({ code: -1, stdout, stderr: `${stderr}\n${e.message}`, timedOut }) })
  })
}

app.post('/api/admin/audit-archive', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const hotDays = Math.max(1, Math.min(365, Math.floor(Number(req.body?.hotDays)) || 14))
  const maxDays = Math.max(1, Math.min(400, Math.floor(Number(req.body?.maxDays)) || 30))
  const execute = req.body?.execute === true
  const prune = req.body?.prune === true
  const flags = [`--hot-days=${hotDays}`, `--max-days=${maxDays}`]
  if (execute) flags.push('--execute')
  if (prune) flags.push('--prune')
  try {
    logger.info(`[AuditArchive] run ${flags.join(' ')}`)
    const r = await runArchiveTool(flags)
    res.json({
      ok: r.code === 0 && !r.timedOut,
      execute, prune, hotDays, maxDays,
      timedOut: r.timedOut,
      exitCode: r.code,
      output: `${r.stdout}${r.stderr ? `\n[stderr]\n${r.stderr}` : ''}`.trim(),
    })
  } catch (e) {
    logger.error('[AuditArchive] error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// ============================================================================
// Phrase decomposition — backfill + audit
// ============================================================================
// See new_vision/PHRASE_DECOMPOSITION_SPEC.md.
//
// The build-time phrase decomposer pre-chunks `target_text` into LEGO + ghost
// blocks at phrase-write time. These endpoints surface drift (phrases whose
// stored decomposition is missing or stale relative to courses.version) and
// let an admin trigger backfill / dry-run from the Maintenance UI.

// GET /api/admin/decomposition-audit/:courseCode — drift summary for one course.
//
// Returns:
//   null_count    — phrases with decomposition IS NULL (never computed)
//   stale_count   — decomposition present AND its version stamp is NULL or
//                   older than courses.version
//   clean_count   — decomposition present AND version is current
//
// An UNSTAMPED row (decomposition present, decomposition_course_version NULL)
// counts as STALE. It used to count as neither: `< version` and `>= version`
// are both NULL — hence false — for a NULL stamp, so those rows fell out of
// every bucket and total != null + stale + clean. 71% of decomposed phrases
// estate-wide are unstamped, so the audit was hiding most of its own subject:
// eus_for_eng reported 49 stale where content inspection found 502
// (docs/gloss-mapping-bug-2026-08-12.md). Reporting a small clean number is
// precisely what stopped anyone looking.
//   total         — total phrases in this course
//   course_version — current courses.version (the target)
//
// Click-to-refresh, not auto-polled. Use this to decide whether to run the
// backfill endpoint.
app.get('/api/admin/decomposition-audit/:courseCode', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const courseCode = req.params.courseCode
  try {
    const sb = supabaseClient.getClient()

    const { data: courseRow, error: courseErr } = await sb
      .from('courses')
      .select('version')
      .eq('course_code', courseCode)
      .maybeSingle()
    if (courseErr) throw courseErr
    if (!courseRow) return res.status(404).json({ error: `course not found: ${courseCode}` })
    const courseVersion = courseRow.version ?? 1

    // Four count queries in parallel. Each uses count:'exact' on a HEAD-only
    // request so we don't drag row data over the wire.
    const [totalRes, nullRes, staleRes, cleanRes] = await Promise.all([
      sb.from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode),
      sb.from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .is('decomposition', null),
      sb.from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .not('decomposition', 'is', null)
        .or(`decomposition_course_version.is.null,decomposition_course_version.lt.${courseVersion}`),
      sb.from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .not('decomposition', 'is', null)
        .gte('decomposition_course_version', courseVersion)
    ])
    for (const r of [totalRes, nullRes, staleRes, cleanRes]) {
      if (r.error) throw r.error
    }

    res.json({
      course_code: courseCode,
      course_version: courseVersion,
      total: totalRes.count ?? 0,
      null_count: nullRes.count ?? 0,
      stale_count: staleRes.count ?? 0,
      clean_count: cleanRes.count ?? 0
    })
  } catch (e) {
    logger.error('[Decomposition] audit error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// POST /api/admin/decomposition-backfill — compute + persist decompositions.
//
// Body: { courseCode?: string, dryRun?: boolean, limit?: int }
//   courseCode — if omitted, walks ALL courses. Useful for a one-time sweep.
//   dryRun     — if true, computes but doesn't write. Returns sample blocks.
//   limit      — max phrases to process this request (default 500, cap 5000).
//
// Resumable + capped: batched scan, 60s wall-time deadline per request.
// Response includes `more_remaining: true` if the deadline tripped or the
// limit was hit — the UI loops back with another POST.
//
// Pattern mirrors /api/admin/audit-cleanup (see ~line 9451): same deadline,
// chunked-loop shape, partial-progress reporting.
app.post('/api/admin/decomposition-backfill', async (req, res) => {
  if (!await requireAdmin(req, res)) return

  const courseCode = req.body?.courseCode ? String(req.body.courseCode) : null
  const dryRun = !!req.body?.dryRun
  const requestedLimit = Number(req.body?.limit)
  const maxRows = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(Math.floor(requestedLimit), 5000)
    : 500

  const DEADLINE_MS = 60_000
  const PAGE_SIZE = 100
  const start = Date.now()

  let processed = 0
  let updated = 0
  let failed = 0
  let sample = [] // dry-run only — first 3 decompositions for inspection
  const failures = [] // first 5 failure reasons for the report

  try {
    const sb = supabaseClient.getClient()

    // Build the list of courses we're walking.
    let courseList
    if (courseCode) {
      const { data, error } = await sb.from('courses').select('course_code, version').eq('course_code', courseCode)
      if (error) throw error
      if (!data || data.length === 0) return res.status(404).json({ error: `course not found: ${courseCode}` })
      courseList = data
    } else {
      const { data, error } = await sb.from('courses').select('course_code, version').order('course_code')
      if (error) throw error
      courseList = data || []
    }

    let moreRemaining = false
    let cutoffReached = false

    // Per-course: cache vocabulary (one fetch covers every phrase in the
    // course, since we always look up by seed_number ≤ phrase.seed_number).
    const vocabCache = new Map()
    async function getVocab(cc) {
      if (vocabCache.has(cc)) return vocabCache.get(cc)
      const { data, error } = await sb
        .from('course_legos')
        .select('seed_number, lego_index, target_text, known_text')
        .eq('course_code', cc)
      if (error) throw error
      const vocab = (data || []).map(l => ({
        lego_id: `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`,
        target_text: l.target_text,
        known_text: l.known_text,
        seed_number: l.seed_number
      }))
      vocabCache.set(cc, vocab)
      return vocab
    }

    outer: for (const course of courseList) {
      const cc = course.course_code
      const courseVersion = course.version ?? 1

      // Page through phrases needing work. The "needs work" predicate is
      // decomposition IS NULL OR its version stamp is NULL or < courseVersion.
      // PostgREST's `or()` handles that compactly.
      //
      // NOTE — deliberately NOT widened to unstamped rows, even though the
      // audit endpoint above now counts them as stale.
      //
      // `decomposition_course_version.lt.N` is NULL — not true — for an
      // unstamped row, so a phrase that HAS a decomposition and NO stamp
      // matches neither leg and is never backfilled. That is 71% of decomposed
      // phrases estate-wide. Widening this predicate looks like the fix and is
      // not: this loop writes with decomposeText, which has no parent LEGO and
      // so cannot restore a salient anchor. Turning it loose on ~435k
      // previously-untouched rows would overwrite correct anchored
      // decompositions with weaker unanchored ones — a regression bigger than
      // the drift it repairs.
      //
      // Widening is safe only once this loop decomposes with decomposeAnchored
      // (needs lego_index in the select for the parent LEGO, plus the
      // kind==='error' skip so a phrase that does not contain its own LEGO is
      // left alone rather than silently flattened). Until then the content-keyed
      // repair path is tools/course-optimization/refresh-stale-phrase-decompositions.cjs.
      // See docs/gloss-mapping-bug-2026-08-12.md.
      // We don't use offset/range because we mutate as we go — keep refetching
      // the first page until it stops returning rows.
      while (true) {
        if (Date.now() - start >= DEADLINE_MS) {
          moreRemaining = true
          cutoffReached = true
          break outer
        }
        if (processed >= maxRows) {
          moreRemaining = true
          break outer
        }

        const { data: rows, error: pageErr } = await sb
          .from('course_practice_phrases')
          .select('id, course_code, seed_number, target_text, decomposition_course_version')
          .eq('course_code', cc)
          .or(`decomposition.is.null,decomposition_course_version.lt.${courseVersion}`)
          .limit(Math.min(PAGE_SIZE, maxRows - processed))
        if (pageErr) throw pageErr
        if (!rows || rows.length === 0) break

        const vocab = await getVocab(cc)

        for (const row of rows) {
          processed++
          try {
            const vocabForPhrase = vocab.filter(l => l.seed_number <= row.seed_number)
            const blocks = decomposeText(row.target_text, vocabForPhrase)

            if (dryRun) {
              if (sample.length < 3) sample.push({ phrase_id: row.id, target_text: row.target_text, blocks })
              continue
            }

            const { error: updateErr } = await sb
              .from('course_practice_phrases')
              .update({ decomposition: blocks, decomposition_course_version: courseVersion })
              .eq('id', row.id)
            if (updateErr) throw updateErr
            updated++
          } catch (e) {
            failed++
            if (failures.length < 5) failures.push({ phrase_id: row.id, reason: e?.message || String(e) })
          }
        }

        // Page returned fewer rows than asked = course done (for this version).
        if (rows.length < PAGE_SIZE) break
      }
    }

    logger.info(
      `[Decomposition] Backfill: processed=${processed} updated=${updated} failed=${failed} ` +
      `more=${moreRemaining} cutoff=${cutoffReached} dryRun=${dryRun} course=${courseCode || 'ALL'}`
    )

    res.json({
      ok: true,
      dry_run: dryRun,
      processed,
      updated,
      failed,
      more_remaining: moreRemaining,
      cutoff_reached: cutoffReached,
      sample: dryRun ? sample : undefined,
      failures: failures.length > 0 ? failures : undefined
    })
  } catch (e) {
    logger.error('[Decomposition] backfill error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// ============================================================================
// Uptime monitoring + DB health — diagnostic panel for the Maintenance tab
// ============================================================================
// Backs the popty UptimePanel. Read-only proxies onto two external sources:
//   - Better Stack (external HTTPS probing of the learner-path URLs)
//   - Supabase Metrics API (Prometheus exposition, Pro-plan feature)
// No alert routing, no persistence — Tom checks these when investigating
// "did the app go down?" or "why are queries slow right now?".

// GET /api/admin/uptime-summary — proxy Better Stack monitors + last-24h incidents.
// If BETTERSTACK_API_KEY is unset, returns { configured: false } cleanly so the
// panel can show a setup CTA instead of a generic 500.
app.get('/api/admin/uptime-summary', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const apiKey = process.env.BETTERSTACK_API_KEY
  if (!apiKey) {
    return res.json({ configured: false })
  }
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const headers = { Authorization: `Bearer ${apiKey}` }
    const [monitorsRes, incidentsRes] = await Promise.all([
      fetch('https://uptime.betterstack.com/api/v2/monitors', { headers }),
      fetch(`https://uptime.betterstack.com/api/v2/incidents?from=${encodeURIComponent(since)}`, { headers })
    ])
    if (!monitorsRes.ok) throw new Error(`Better Stack monitors HTTP ${monitorsRes.status}`)
    if (!incidentsRes.ok) throw new Error(`Better Stack incidents HTTP ${incidentsRes.status}`)
    const [monitorsBody, incidentsBody] = await Promise.all([monitorsRes.json(), incidentsRes.json()])

    const monitors = (monitorsBody.data || []).map(m => ({
      id: m.id,
      name: m.attributes?.pronounceable_name || m.attributes?.url || m.id,
      url: m.attributes?.url,
      status: m.attributes?.status,            // 'up' | 'down' | 'paused' | 'pending' | 'validating'
      last_checked_at: m.attributes?.last_checked_at,
      // Response time shape varies across plans; pick the first numeric we find.
      last_response_time_ms:
        m.attributes?.regions?.[0]?.response_times?.[0]?.response_time
        ?? m.attributes?.last_response_time
        ?? null
    }))
    const incidents = (incidentsBody.data || []).map(i => ({
      id: i.id,
      monitor_id: i.attributes?.monitor_id ?? i.relationships?.monitor?.data?.id,
      started_at: i.attributes?.started_at,
      resolved_at: i.attributes?.resolved_at,
      cause: i.attributes?.cause
    }))
    res.json({ configured: true, monitors, incidents, since })
  } catch (e) {
    logger.error('[Uptime] summary error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// Parse Prometheus exposition format into a flat map keyed by metric name +
// optional sorted-label string. Values are numbers. Helper kept local — no
// need for prom-client just to read 8 metrics off a scrape.
function parsePrometheusText(text) {
  const samples = []
  const lines = text.split('\n')
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    // Metric line: name{label="v",label="v"} 123 [timestamp]
    // Or: name 123
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([-+0-9.eEnNaIfF]+)/)
    if (!m) continue
    const name = m[1]
    const labelBlock = m[2] || ''
    const valueStr = m[3]
    const value = Number(valueStr)
    if (!Number.isFinite(value)) continue
    const labels = {}
    if (labelBlock) {
      const re = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g
      let lm
      while ((lm = re.exec(labelBlock)) !== null) {
        labels[lm[1]] = lm[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      }
    }
    samples.push({ name, labels, value })
  }
  return samples
}

// Sum samples for a metric, optionally filtered by label predicate.
function sumMetric(samples, name, labelPredicate = null) {
  let total = 0
  let matched = 0
  for (const s of samples) {
    if (s.name !== name) continue
    if (labelPredicate && !labelPredicate(s.labels)) continue
    total += s.value
    matched++
  }
  return matched > 0 ? { value: total, count: matched } : null
}

// First-sample lookup — for gauge metrics where there's typically one series.
function firstMetric(samples, name, labelPredicate = null) {
  for (const s of samples) {
    if (s.name !== name) continue
    if (labelPredicate && !labelPredicate(s.labels)) continue
    return s.value
  }
  return null
}

// GET /api/admin/db-health — scrape Supabase Metrics API, extract 6-8 metrics
// that tell the "is the DB healthy right now?" story. Resilient to missing
// metrics (logs a warning, returns null in that slot). Project ref is derived
// from SUPABASE_URL so we don't need a separate env var.
app.get('/api/admin/db-health', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const supaUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supaUrl || !serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY missing' })
  }
  // Derive project ref from https://<ref>.supabase.co
  const refMatch = supaUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/)
  if (!refMatch) {
    return res.status(500).json({ error: `Cannot derive project ref from SUPABASE_URL=${supaUrl}` })
  }
  const projectRef = refMatch[1]
  const metricsUrl = `https://${projectRef}.supabase.co/customer/v1/privileged/metrics`
  const auth = 'Basic ' + Buffer.from(`service_role:${serviceKey}`).toString('base64')

  try {
    const scrapeStart = Date.now()
    const r = await fetch(metricsUrl, { headers: { Authorization: auth } })
    if (!r.ok) throw new Error(`Metrics scrape HTTP ${r.status}`)
    const text = await r.text()
    const scrapeMs = Date.now() - scrapeStart
    const samples = parsePrometheusText(text)

    // Pull out the metrics that matter. Supabase's exposition (as of May 2026)
    // uses _total-suffixed counters (Prometheus convention) and num_backends
    // with an underscore. Older code looked for un-suffixed names which no
    // longer match — we use the suffixed names with the un-suffixed names as
    // fallbacks so older exporter versions still work.
    //
    //   pg_stat_database_blks_hit_total / _blks_read_total   cache hit rate
    //   pg_stat_database_xact_commit_total / _xact_rollback_total
    //   pg_stat_database_deadlocks_total / _conflicts_total
    //   pg_stat_database_num_backends                        active connections (gauge)
    //   max_connections_connection_count                     pool ceiling
    //   physical_replication_lag_*                           replica lag (if any)
    //   pg_database_size_bytes                               on-disk size
    //
    // Anything we can't find returns null and gets logged.
    const isMainDb = (l) => !l.datname || l.datname === 'postgres'

    // Cache hit rate
    const blksHit =
      sumMetric(samples, 'pg_stat_database_blks_hit_total', isMainDb)
      ?? sumMetric(samples, 'pg_stat_database_blks_hit', isMainDb)
    const blksRead =
      sumMetric(samples, 'pg_stat_database_blks_read_total', isMainDb)
      ?? sumMetric(samples, 'pg_stat_database_blks_read', isMainDb)
    const cacheHitRate = (blksHit && blksRead && (blksHit.value + blksRead.value) > 0)
      ? blksHit.value / (blksHit.value + blksRead.value)
      : null

    // Transaction counters
    const xactCommit =
      sumMetric(samples, 'pg_stat_database_xact_commit_total', isMainDb)
      ?? sumMetric(samples, 'pg_stat_database_xact_commit', isMainDb)
    const xactRollback =
      sumMetric(samples, 'pg_stat_database_xact_rollback_total', isMainDb)
      ?? sumMetric(samples, 'pg_stat_database_xact_rollback', isMainDb)

    // Statement-timeout cancellations show up as deadlocks + confl_* counters
    // depending on exporter version. We surface deadlocks (clear) and the
    // aggregate conflicts_total — both are the failure modes that mask slow
    // queries.
    const deadlocks =
      sumMetric(samples, 'pg_stat_database_deadlocks_total', isMainDb)
      ?? sumMetric(samples, 'pg_stat_database_deadlocks', isMainDb)
    const conflicts =
      sumMetric(samples, 'pg_stat_database_conflicts_total', isMainDb)
      ?? sumMetric(samples, 'pg_stat_database_conflicts', isMainDb)

    // Active connections: gauge — current backend count.
    // num_backends (with underscore) is what current Supabase exports.
    const activeConnections =
      sumMetric(samples, 'pg_stat_database_num_backends', isMainDb)?.value
      ?? firstMetric(samples, 'pg_stat_activity_count', isMainDb)
      ?? sumMetric(samples, 'pg_stat_database_numbackends', isMainDb)?.value
      ?? null

    // Max connections: Supabase exposes max_connections_connection_count.
    // Older exporters used pg_settings_max_connections; keep as fallback.
    const maxConnections =
      firstMetric(samples, 'max_connections_connection_count')
      ?? firstMetric(samples, 'pg_settings_max_connections')
      ?? null

    const poolUtilization = (activeConnections != null && maxConnections != null && maxConnections > 0)
      ? activeConnections / maxConnections
      : null

    // Replication lag — Supabase currently exposes a boolean
    // physical_replication_lag_is_connected_to_primary plus per-slot bytes
    // metrics, but no straight seconds figure. We keep the old name lookups
    // for forward compatibility; null is the correct answer when nothing
    // seconds-shaped is present.
    const replicationLagSeconds =
      firstMetric(samples, 'physical_replication_lag_seconds')
      ?? firstMetric(samples, 'pg_replication_lag')
      ?? firstMetric(samples, 'pg_stat_replication_lag_seconds')
      ?? null

    // Disk / WAL pressure — early warning before queries start timing out.
    const dbSizeBytes = sumMetric(samples, 'pg_database_size_bytes', isMainDb)?.value ?? null

    const metrics = {
      cache_hit_rate: cacheHitRate,                     // 0-1, ideally > 0.99
      active_connections: activeConnections,            // current backend count
      max_connections: maxConnections,                  // pool ceiling
      pool_utilization: poolUtilization,                // 0-1
      replication_lag_seconds: replicationLagSeconds,   // null if no replica
      deadlocks_total: deadlocks?.value ?? null,        // counter, watch for jumps
      conflicts_total: conflicts?.value ?? null,        // counter, statement_timeout cancellations land here
      transactions_committed: xactCommit?.value ?? null,
      transactions_rolled_back: xactRollback?.value ?? null,
      db_size_bytes: dbSizeBytes
    }

    // Log any metrics we couldn't find so we know to add fallbacks.
    const missing = Object.entries(metrics).filter(([_, v]) => v === null).map(([k]) => k)
    if (missing.length) {
      logger.warn(`[DBHealth] metrics not found in scrape: ${missing.join(', ')}`)
    }

    res.json({
      configured: true,
      scraped_at: new Date().toISOString(),
      scrape_ms: scrapeMs,
      sample_count: samples.length,
      metrics,
      missing
    })
  } catch (e) {
    logger.error('[DBHealth] scrape error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// ============================================================================
// Listening Pod Explainer — audit + generate (text only; audio pass is separate)
// ============================================================================
// See migration 20260519_listening_pod_explainer_columns.sql for the schema and
// services/pod-explainer-generator.cjs for the per-sentence generator.
//
// Stage-1 sequence per sentence is target → known → explainer → target → target.
// These endpoints populate explainer_decomposition + explainer_text. A
// downstream audio pass (not in this commit) renders explainer_audio_id from
// explainer_text via xAI multilingual TTS.

const podExplainer = require('./pod-explainer-generator.cjs')

// GET /api/admin/pod-explainer-audit
//   ?courseCode=<code>  optional: scope to one course
// Returns counts so the Maintenance UI can show progress and the skip rules
// applied. No mutations.
app.get('/api/admin/pod-explainer-audit', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const courseFilter = typeof req.query.courseCode === 'string' ? req.query.courseCode : null
  try {
    const sb = supabaseClient.getClient()
    // Pull pod ids (optionally filtered to one course's pods)
    let podQuery = sb.from('listening_pods').select('id')
    if (courseFilter) podQuery = podQuery.like('id', `${courseFilter}:%`)
    const { data: pods, error: podsErr } = await podQuery
    if (podsErr) throw podsErr
    const allPodIds = (pods || []).map(p => p.id)
    // Apply skip rules course-by-course
    const skippedCourses = []
    const includedPodIds = []
    for (const podId of allPodIds) {
      const code = String(podId).split(':')[0]
      const skip = podExplainer.shouldSkipCourse(code)
      if (skip.skip) {
        if (!skippedCourses.find(s => s.course_code === code)) {
          skippedCourses.push({ course_code: code, reason: skip.reason })
        }
        continue
      }
      includedPodIds.push(podId)
    }
    // Count sentences in scope by explainer state.
    if (includedPodIds.length === 0) {
      return res.json({
        total: 0,
        with_explainer_text: 0,
        with_explainer_audio: 0,
        without_explainer_text: 0,
        skipped_courses: skippedCourses,
      })
    }
    // Pull all sentence rows for the in-scope pods; project minimal columns.
    const { data: rows, error: rowsErr } = await sb
      .from('listening_pod_sentences')
      .select('pod_id, explainer_text, explainer_audio_id')
      .in('pod_id', includedPodIds)
    if (rowsErr) throw rowsErr
    let withText = 0
    let withAudio = 0
    let withoutText = 0
    for (const r of rows || []) {
      if (r.explainer_text && r.explainer_text.trim()) withText++
      else withoutText++
      if (r.explainer_audio_id) withAudio++
    }
    res.json({
      total: (rows || []).length,
      with_explainer_text: withText,
      with_explainer_audio: withAudio,
      without_explainer_text: withoutText,
      skipped_courses: skippedCourses,
    })
  } catch (e) {
    logger.error('[PodExplainer] audit error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// POST /api/admin/pod-explainer-generate
//   body: { courseCode?: string, podId?: string, dryRun?: boolean, limit?: int }
// Batched, resumable, capped at 60s of wall time per request. Picks sentence
// rows where explainer_text IS NULL (in-scope per skip rules) and fills
// explainer_decomposition + explainer_text via Haiku.
//
// Sentences are batched into the same Haiku call (BATCH_SIZE per CLI
// invocation) because each `claude --print` spawn costs 2-15s regardless
// of payload size — amortising across many sentences is roughly a 10×
// speedup over the per-sentence pattern. The 60s wall-time deadline +
// more_remaining flag still drive the UI poll loop.
//
// Beyond batching, we fan out PARALLEL_BATCHES CLI invocations at once.
// Each batch is independent (different sentences, fresh subprocess), so
// the only ceiling is mild rate-limit risk at the Anthropic side — which
// at 3-4 concurrent calls from one user is well below the threshold.
// Throughput at parallel=4 × batch=12 is roughly 48 sentences per ~60s
// window, so a 117-sentence pod finishes in 2-3 endpoint calls.
const POD_EXPLAINER_BATCH_SIZE = 12
const POD_EXPLAINER_PARALLEL = 4
app.post('/api/admin/pod-explainer-generate', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  const { courseCode, podId, dryRun = false, force = false } = req.body || {}
  const limitNum = Number(req.body?.limit)
  const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : 1000
  const DEADLINE_MS = 60_000
  const start = Date.now()

  try {
    const sb = supabaseClient.getClient()
    // Build the candidate set. Default: sentences missing explainer_text in
    // scope. With `force: true`, all in-scope sentences regardless of
    // current explainer_text — used to re-run after a prompt change.
    let query = sb
      .from('listening_pod_sentences')
      .select('id, pod_id, target_text, known_text')
      .limit(limit)
    if (!force) {
      query = query.is('explainer_text', null)
    }
    if (podId) {
      query = query.eq('pod_id', podId)
    } else if (courseCode) {
      query = query.like('pod_id', `${courseCode}:%`)
    }
    const { data: candidates, error: candErr } = await query
    if (candErr) throw candErr

    let processed = 0
    let updated = 0
    let skipped = 0
    let failed = 0
    const failures = []
    const pushFailure = (id, message) => {
      failed++
      failures.push({ id, error: message })
      if (failures.length > 25) failures.length = 25
    }

    // Group candidates by course (skip rules + connector localise per course).
    // Same-course batching guarantees the prompt's "Target language" line is
    // accurate for every sentence in the batch.
    const byCourse = new Map()
    for (const row of candidates || []) {
      const code = String(row.pod_id).split(':')[0]
      if (!byCourse.has(code)) byCourse.set(code, [])
      byCourse.get(code).push(row)
    }

    // Build the flat list of batches to run (one batch = one CLI call).
    // Each entry carries the course + the validated rows it'll process.
    // Skip rules and empty-text filtering happen here so the parallel
    // executor below only sees runnable work.
    const batches = []
    for (const [code, rows] of byCourse) {
      const skip = podExplainer.shouldSkipCourse(code)
      if (skip.skip) {
        skipped += rows.length
        processed += rows.length
        continue
      }
      for (let i = 0; i < rows.length; i += POD_EXPLAINER_BATCH_SIZE) {
        const slice = rows.slice(i, i + POD_EXPLAINER_BATCH_SIZE)
        const valid = []
        for (const row of slice) {
          if (!row.target_text || !row.known_text) {
            skipped++
            processed++
          } else {
            valid.push(row)
          }
        }
        if (valid.length > 0) batches.push({ code, rows: valid })
      }
    }

    /**
     * Apply one batch's result back to the DB (or count it in dry-run).
     * Pulled out so the parallel executor can call it once a batch resolves
     * without serialising the writes.
     */
    const applyBatchResult = async (batch, resultsById) => {
      for (const row of batch.rows) {
        processed++
        const result = resultsById.get(row.id)
        if (!result) {
          pushFailure(row.id, 'no entry returned for this id in batch response')
          continue
        }
        if (dryRun) {
          updated++
          continue
        }
        try {
          const { error: upErr } = await sb
            .from('listening_pod_sentences')
            .update({
              explainer_decomposition: result.decomposition,
              explainer_text: result.explainer_text,
            })
            .eq('id', row.id)
          if (upErr) throw upErr
          updated++
        } catch (writeErr) {
          pushFailure(row.id, `write failed: ${writeErr?.message || writeErr}`)
        }
      }
    }

    /**
     * Run one batch end-to-end: CLI call → parse → apply. Resolves to
     * void; per-row failures are accumulated via pushFailure inside.
     * Whole-batch CLI failures mark every row in that batch as failed.
     */
    const runBatch = async (batch) => {
      let resultsById
      try {
        resultsById = await podExplainer.generateForBatch({
          courseCode: batch.code,
          sentences: batch.rows.map(r => ({
            id: r.id,
            target_text: r.target_text,
            known_text: r.known_text,
          })),
        })
      } catch (err) {
        const msg = err?.message || String(err)
        for (const row of batch.rows) {
          processed++
          pushFailure(row.id, `batch failed: ${msg}`)
        }
        return
      }
      await applyBatchResult(batch, resultsById)
    }

    // Fan out POD_EXPLAINER_PARALLEL batches at a time. Each parallel
    // wave is awaited together; we stop accepting new waves once the
    // deadline trips, but a wave that's already in flight finishes —
    // partial progress is still progress, the poll loop picks up the
    // rest on the next call. The deadline check is between waves, not
    // mid-wave, so any wave that starts is committed to its CLI calls.
    for (let i = 0; i < batches.length; i += POD_EXPLAINER_PARALLEL) {
      if (Date.now() - start >= DEADLINE_MS) break
      const wave = batches.slice(i, i + POD_EXPLAINER_PARALLEL)
      await Promise.all(wave.map(b => runBatch(b)))
    }

    const totalCandidates = candidates?.length || 0
    const more_remaining = totalCandidates >= limit ||
      (Date.now() - start >= DEADLINE_MS && processed < totalCandidates)

    logger.info(
      `[PodExplainer] generate processed=${processed} updated=${updated} ` +
      `skipped=${skipped} failed=${failed} dryRun=${dryRun} ` +
      `more_remaining=${more_remaining} batchSize=${POD_EXPLAINER_BATCH_SIZE} ` +
      `elapsed_ms=${Date.now() - start}`
    )
    res.json({
      ok: true,
      processed,
      updated,
      skipped,
      failed,
      failures,
      more_remaining,
      dry_run: !!dryRun,
    })
  } catch (e) {
    logger.error('[PodExplainer] generate error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})

// ============================================================================
// Nightly audit-log archive+prune scheduler
// ============================================================================
// Tiers content_audit_log to S3 each night at 03:00 UTC via the same CLI the
// Maintenance button uses. pg_cron can't write to S3, so the schedule lives
// here in the long-running API process. OPT-IN: set AUDIT_ARCHIVE_CRON=on, so
// merely deploying this code never silently starts deleting prod audit rows.
function scheduleNightlyArchive() {
  if (process.env.AUDIT_ARCHIVE_CRON !== 'on') {
    logger.log('[AuditArchive] nightly schedule DISABLED — set AUDIT_ARCHIVE_CRON=on to enable')
    return
  }
  const HOUR_UTC = 3
  const hotDays = Math.max(1, Math.floor(Number(process.env.AUDIT_ARCHIVE_HOT_DAYS)) || 14)
  const msUntilNext = () => {
    const now = new Date()
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), HOUR_UTC, 0, 0))
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
    return next - now
  }
  const arm = () => {
    const delay = msUntilNext()
    logger.log(`[AuditArchive] nightly armed — next run in ${(delay / 3600000).toFixed(1)}h (03:00 UTC, hot-days=${hotDays})`)
    setTimeout(async () => {
      try {
        logger.log('[AuditArchive] nightly run starting')
        const r = await runArchiveTool([`--hot-days=${hotDays}`, '--max-days=120', '--execute', '--prune'], { timeoutMs: 30 * 60_000 })
        logger.log(`[AuditArchive] nightly run done (exit ${r.code}${r.timedOut ? ', TIMED OUT' : ''})`)
      } catch (e) {
        logger.error('[AuditArchive] nightly run error:', e?.message || e)
      } finally {
        arm() // reschedule for tomorrow
      }
    }, delay)
  }
  arm()
}

// ============================================================
// INSIGHT DISCOVERY — trigger the SSi-learning-app insights deep-run on this
// machine so it can be fired from popty without being at the box. Runs the
// zero-dep discovery script (claude --print on the Max plan — same headless
// mechanism as services/shared/claude-cli.cjs — school-demo learners excluded),
// which writes findings to the shared insight_discoveries table. The learning
// app's /admin/insights feed then reads them. requireAdmin.
// ============================================================
const INSIGHT_SCRIPT = process.env.INSIGHT_DISCOVERY_SCRIPT
  || path.resolve(__dirname, 'insight-discovery.cjs')  // services/insight-discovery.cjs (this repo — present on every machine)
const INSIGHT_CWD = path.resolve(__dirname, '..')      // dashboard repo root (its .env)

app.post('/api/insight-discovery/run', async (req, res) => {
  const admin = await requireAdmin(req, res)
  if (!admin) return
  const demo = req.body && req.body.demo === true
  const args = [INSIGHT_SCRIPT, '--write']
  if (demo) args.push('--demo')
  try {
    const { spawn: spawnProc } = require('child_process')
    // Nested claude --print: scrub the billed key (use the subscription) and
    // unset CLAUDECODE (per CLAUDE.md — required for nested Claude CLI calls).
    const childEnv = { ...process.env }
    delete childEnv.ANTHROPIC_API_KEY
    delete childEnv.ANTHROPIC_AUTH_TOKEN
    delete childEnv.CLAUDECODE
    const child = spawnProc('node', args, { cwd: INSIGHT_CWD, detached: true, stdio: 'ignore', env: childEnv })
    child.on('error', (e) => logger.error(`[InsightDiscovery] spawn error: ${e.message}`))
    child.unref()
    logger.log(`[InsightDiscovery] triggered (${demo ? 'demo' : 'real'}) by ${admin.email || admin.id} → ${INSIGHT_SCRIPT}`)
    res.status(202).json({ triggered: true, source: demo ? 'demo' : 'real', note: 'Deep-run started on the machine; the feed updates when it finishes (~1-2 min).' })
  } catch (e) {
    logger.error(`[InsightDiscovery] failed to start: ${e.message}`)
    res.status(500).json({ error: 'Failed to start discovery run', detail: e.message })
  }
})

// GET the latest persisted discovery (service-key read — popty's own auth can't
// pass the table's god-gate, so the dashboard reads it through this admin route).
app.get('/api/insight-discovery/latest', async (req, res) => {
  const admin = await requireAdmin(req, res)
  if (!admin) return
  const source = req.query.source === 'demo' ? 'demo' : 'real'
  try {
    const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    const r = await fetch(`${base}/rest/v1/insight_discoveries?source=eq.${source}&order=generated_at.desc&limit=1&select=generated_at,window_days,source,findings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    const rows = await r.json()
    res.json({ latest: Array.isArray(rows) && rows[0] ? rows[0] : null })
  } catch (e) {
    logger.error(`[InsightDiscovery] latest read failed: ${e.message}`)
    res.status(500).json({ error: 'Failed to read latest discovery' })
  }
})

// ============================================================
// RELEASE NOTES — generate a LEARNER-FACING release note from the
// learning-app's main..staging delta, then publish it. Mirrors the insight-
// discovery flow: the service (services/release-notes.cjs) reads main..staging
// via local git (machine SSH creds, no token), filters engineering noise, runs `claude --print` on the Max
// subscription (billed key + CLAUDECODE scrubbed — done inside the service),
// and writes to the shared release_notes table. Unlike insight-discovery
// (fire-and-forget), generation is SYNCHRONOUS so the draft can be returned to
// the UI for review/edit before publishing. requireAdmin.
// ============================================================
const releaseNotesSvc = require('./release-notes.cjs')

// POST /api/release-notes/generate — build a draft from main..staging.
// Optional body { version } overrides the version SHA. Returns the draft.
app.post('/api/release-notes/generate', async (req, res) => {
  const admin = await requireAdmin(req, res)
  if (!admin) return
  const version = req.body && typeof req.body.version === 'string' ? req.body.version.trim() : undefined
  try {
    const draft = await releaseNotesSvc.generateDraft(version ? { version } : {})
    logger.log(`[ReleaseNotes] draft generated (id=${draft.id}, version=${draft.version}, ${draft.commitCount} commits) by ${admin.email || admin.id}`)
    res.json(draft)
  } catch (e) {
    logger.error(`[ReleaseNotes] generate failed: ${e.message}`)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/release-notes/publish — flip a draft to published, saving any edits.
// Body { id, headline?, bullets? }. Returns the updated row.
app.post('/api/release-notes/publish', async (req, res) => {
  const admin = await requireAdmin(req, res)
  if (!admin) return
  const { id, headline, bullets } = req.body || {}
  if (id === undefined || id === null || id === '') {
    return res.status(400).json({ error: 'id required' })
  }
  try {
    const row = await releaseNotesSvc.publishNote({ id, headline, bullets })
    logger.log(`[ReleaseNotes] published id=${id} (version=${row.version}) by ${admin.email || admin.id}`)
    res.json(row)
  } catch (e) {
    logger.error(`[ReleaseNotes] publish failed: ${e.message}`)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/release-notes/drafts — unpublished rows, newest-first (for the UI).
app.get('/api/release-notes/drafts', async (req, res) => {
  const admin = await requireAdmin(req, res)
  if (!admin) return
  try {
    const drafts = await releaseNotesSvc.listDrafts()
    res.json({ drafts: Array.isArray(drafts) ? drafts : [] })
  } catch (e) {
    logger.error(`[ReleaseNotes] drafts read failed: ${e.message}`)
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PRODUCTION_API_PORT || 3470
// Bind loopback-only by default. watson-1 has a public IP; public access to this
// service is meant to arrive via the tailscale funnel on :8443, which proxies to
// http://localhost:3470 — so loopback keeps the funnel working while removing the
// raw 0.0.0.0 path. Override with BIND_HOST only with a deliberate reason.
const HOST = process.env.BIND_HOST || '127.0.0.1'

httpServer.listen(PORT, HOST, () => {
  logger.log(`Production API server running on ${HOST}:${PORT}`)
  logger.log(`WebSocket path: /api/production/websocket`)
  scheduleNightlyArchive()
})

module.exports = { app, io, emitToRoom }
