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

const logger = createLogger('ProductionAPI')

const s3Service = require('./s3-production-service.cjs')
const supabaseClient = require('./supabase-client.cjs')
const manifestGenerator = require('./manifest-generator.cjs')
const courseDataService = require('./course-data-service.cjs')
const { SchemaValidator } = require('./schema-validator.cjs')
const learningScriptGenerator = require('./learning-script-generator.cjs')
const audioProcessor = require('./audio-processor.cjs')
const voiceConfigService = require('./voice-config-service.cjs')
const voiceDiscoveryService = require('./voice-discovery-service.cjs')
const publishManifestService = require('./publish-manifest-service.cjs')
const manifestDiffService = require('./manifest-diff-service.cjs')
const languageCodeService = require('./language-code-service.cjs')

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

    const { data: lr } = await supabaseClient.getClient()
      .from('learners')
      .select('id, user_id, display_name, platform_role, educational_role, dashboard_courses')
      .eq('user_id', user.id)
      .single()

    if (!lr) return null

    const pr = lr.platform_role
    const er = lr.educational_role
    if (pr !== 'ssi_admin' && pr !== 'popty_user' && er !== 'god') return null

    // Course access: admins/god get all, popty_user gets dashboard_courses
    const isAdminUser = pr === 'ssi_admin' || er === 'god'
    const dc = lr.dashboard_courses || []
    const coursesAccess = isAdminUser ? '*' : (dc.includes('*') ? '*' : dc)

    return {
      name: lr.display_name,
      email: user.email,
      role: isAdminUser ? 'admin' : 'user',
      courses: coursesAccess,
      learner_id: lr.id,
    }
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

  // Try Supabase JWT first (new auth)
  const supabaseUser = await verifySupabaseJWT(token)
  if (supabaseUser) return supabaseUser

  // Fall back to old session-based auth (for backwards compat during transition)
  const user = await authValidateSession(token)
  if (!user || user.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return null }
  return user
}

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

// POST /api/auth/dev-login — dev bypass, only in non-production
const DEV_ACCOUNTS = ['thomas.cassidy+ssi@gmail.com', 'test@test.com']
app.post('/api/auth/dev-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Dev login not available in production' })
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })
  if (!DEV_ACCOUNTS.includes(email)) return res.status(403).json({ error: 'Email not in dev accounts list' })
  try {
    let user = await authGetUser(email)
    if (!user) {
      // Auto-create dev user in DB so FK constraint on sessions is satisfied
      const devUser = { email, name: email.split('@')[0], role: 'admin', courses: '"*"' }
      await supabaseClient.getClient().from('dashboard_users').upsert(devUser, { onConflict: 'email' })
      user = { name: devUser.name, email, role: 'admin', courses: '*' }
    }
    const session = await authCreateSession(email)
    logger.info(`[Auth] Dev login for ${email}`)
    res.json({ success: true, session: session.sessionId, user: session.user || user, expires: session.expires })
  } catch (err) {
    logger.error('[Auth] Dev login error:', err)
    res.status(500).json({ error: 'Dev login failed' })
  }
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
  const { email, name, courses, role = 'recorder' } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  if (!courses || !Array.isArray(courses) || courses.length === 0) return res.status(400).json({ error: 'At least one course must be assigned' })
  if (!['recorder', 'editor', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
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
      const primaryLanguage = courses[0]?.split('_')[0] || 'unknown'
      const voiceId = role === 'recorder' ? `human_${sanitizedEmail}_${primaryLanguage}` : null
      const row = {
        email, name: name || email.split('@')[0], role, courses,
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
        ...(name && { name }), role, courses,
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
        'Content-Type': req.headers['content-type'] || 'application/json'
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

app.all('/api/build/*', proxyCourseBuilder)
app.all('/api/v2/*', proxyCourseBuilder)
app.all('/api/golden/*', proxyCourseBuilder)
app.all('/api/phrases/*', proxyCourseBuilder)
app.all('/api/legos/*', proxyCourseBuilder)
app.all('/api/agents', proxyCourseBuilder)
app.all('/api/agents/*', proxyCourseBuilder)
app.all('/api/orchestrator/*', proxyCourseBuilder)
app.all('/api/qa/*', proxyCourseBuilder)
app.all('/api/course/*', proxyCourseBuilder)
app.all('/api/seeds/*', proxyCourseBuilder)

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
    supabase: supabaseClient.isInitialized() ? 'connected' : 'not initialized'
  })
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
        display_name: displayName || `${targetLanguage} for ${known} speakers`,
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

// GET /api/voices/discover/:language - Discover available Azure voices for a language
app.get('/api/voices/discover/:language', async (req, res) => {
  const { language } = req.params
  try {
    logger.info(`[VoiceDiscovery] Discovering voices for language: ${language}`)

    const voices = await voiceDiscoveryService.discoverAzureVoices(language)

    logger.info(`[VoiceDiscovery] Found ${voices.length} voices for ${language}`)
    res.json({ success: true, voices })
  } catch (error) {
    logger.error(`[VoiceDiscovery] Error discovering voices for ${language}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/courses/:courseCode/seed-phrases-preview - Get sample phrases from seeds for voice testing
app.get('/api/courses/:courseCode/seed-phrases-preview', async (req, res) => {
  const { courseCode } = req.params
  try {
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
app.post('/api/voices/preview', async (req, res) => {
  const { voiceId, text, speed, provider } = req.body

  // Validation
  if (!voiceId) {
    return res.status(400).json({ success: false, error: 'voiceId is required' })
  }
  if (!text) {
    return res.status(400).json({ success: false, error: 'text is required' })
  }
  if (text.length > 1000) {
    return res.status(400).json({ success: false, error: 'Text too long (max 1000 characters for preview)' })
  }

  try {
    const azureKey = process.env.AZURE_SPEECH_KEY
    const azureRegion = process.env.AZURE_SPEECH_REGION || 'westeurope'

    if (!azureKey) {
      return res.status(500).json({
        success: false,
        error: 'Azure Speech not configured (AZURE_SPEECH_KEY not set)'
      })
    }

    logger.info(`[VoicePreview] Generating preview: ${voiceId}, text length: ${text.length}`)

    // Extract locale from voiceId (e.g., 'es-ES' from 'es-ES-ElviraNeural')
    const locale = voiceId.split('-').slice(0, 2).join('-')

    // Build SSML with optional speed adjustment
    const rate = speed && speed !== 1.0 ? speed : null
    let ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${locale}'>`
    ssml += `<voice name='${voiceId}'>`
    if (rate) {
      ssml += `<prosody rate='${rate}'>`
    }
    ssml += escapeXml(text)
    if (rate) {
      ssml += `</prosody>`
    }
    ssml += `</voice></speak>`

    // Call Azure TTS API
    const response = await fetch(
      `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          'User-Agent': 'SSi-Dashboard-Voice-Preview'
        },
        body: ssml
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`[VoicePreview] Azure TTS error: ${response.status} ${errorText}`)
      return res.status(response.status).json({
        success: false,
        error: `Azure TTS error: ${response.status}`,
        message: errorText
      })
    }

    // Convert audio to base64 data URI for frontend playback
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const dataUri = `data:audio/mpeg;base64,${base64Audio}`

    logger.info(`[VoicePreview] Generated ${audioBuffer.byteLength} bytes of audio`)

    res.json({
      success: true,
      audio: dataUri,
      byteLength: audioBuffer.byteLength
    })
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
// Shared helper: Calculate audio stats directly from Supabase (no Phase 8 needed)
// Used by /audio-stats, /audio-pipeline/plan, and /audio-pipeline/missing
// Cached in-memory for 60s per course — invalidated on audio generation events
// =============================================================================
const _audioStatsCache = new Map() // courseCode → { data, expiry }
const AUDIO_STATS_CACHE_TTL = 60_000 // 60 seconds

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

  // Single source of truth: Phase 8 /plan endpoint counts unique text+lang+role combos
  // using normalizeForAudio() — same logic that /generate uses to build the work queue.
  // This ensures dashboard stats ALWAYS match what generation actually does.
  const phase8Url = process.env.PHASE8_URL || 'http://localhost:3465'
  const resp = await fetch(`${phase8Url}/plan/${courseCode}`)
  if (!resp.ok) {
    throw new Error(`Phase 8 plan failed for ${courseCode}: ${resp.status}`)
  }
  const plan = await resp.json()

  const result = {
    total: plan.total || 0,
    existing: plan.existing || 0,
    missing: plan.missing || 0,
    breakdown: plan.breakdown || { known: 0, target1: 0, target2: 0, presentation: 0 },
    existingByRole: {},
    totalPhrases: plan.totalPhrases || 0,
    totalLegos: 0,
    totalNewLegos: plan.totalPresentationsNeeded || 0,
    uniquePhraseAudio: plan.uniqueKnownTexts || 0,
    sharedNeeded: 0,
    sharedExisting: 0,
    welcomeExists: false,
    releaseTarget: plan.releaseTarget || 300
  }

  // Cache result
  _audioStatsCache.set(courseCode, { data: result, expiry: Date.now() + AUDIO_STATS_CACHE_TTL })
  return result
}

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
      breakdown: {
        phrases: stats.totalPhrases,
        seeds: 0,
        uniquePhraseAudio: stats.uniquePhraseAudio,
        newLegos: stats.totalNewLegos,
        presentationsExisting: stats.existingByRole.presentation,
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

// Get signed URL for audio playback
// Looks up s3_key from database for v13 audio, falls back to legacy path
app.get('/api/production/:courseCode/audio/:uuid/url', async (req, res) => {
  try {
    const { courseCode, uuid } = req.params

    // Accept s3Key from query param (e.g. for intro audio where we already know the path)
    let s3Key = req.query.s3Key || null

    // If no s3Key provided, try to look it up from course_audio
    if (!s3Key && supabaseClient.isInitialized()) {
      const supabase = supabaseClient.getClient()
      const { data: audioData } = await supabase
        .from('course_audio')
        .select('s3_key')
        .eq('id', uuid)
        .single()

      if (audioData?.s3_key) {
        s3Key = audioData.s3_key
      }
    }

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
app.post('/api/production/:courseCode/recording/upload', async (req, res) => {
  try {
    const { courseCode } = req.params
    const {
      uuid,
      audioData,
      metadata = {},
      provenance = {},
      mimeType = 'audio/webm'
    } = req.body

    if (!uuid || !audioData) {
      return res.status(400).json({ error: 'uuid and audioData required' })
    }

    // Decode base64 audio data
    const rawBuffer = Buffer.from(audioData, 'base64')
    logger.log(`[Upload] Received ${rawBuffer.length} bytes for ${uuid}`)

    // Determine input format from MIME type
    let inputFormat = 'webm'
    if (mimeType.includes('mp3')) inputFormat = 'mp3'
    else if (mimeType.includes('wav')) inputFormat = 'wav'
    else if (mimeType.includes('m4a') || mimeType.includes('mp4')) inputFormat = 'm4a'
    else if (mimeType.includes('ogg')) inputFormat = 'ogg'

    // Process audio: convert to MP3, normalize, trim silence
    logger.log(`[Upload] Processing audio (format: ${inputFormat})...`)
    const { buffer: processedBuffer, metadata: audioMeta } = await audioProcessor.processRecordingBuffer(
      rawBuffer,
      {
        inputFormat,
        trimSilence: true,
        normalize: true,
        targetLUFS: -16
      }
    )

    if (audioMeta.processed) {
      logger.log(`[Upload] Audio processed: ${audioMeta.inputSize} -> ${audioMeta.outputSize} bytes, duration: ${audioMeta.durationMs}ms`)
    } else {
      logger.warn(`[Upload] Audio processing skipped: ${audioMeta.reason}`)
    }

    // Upload processed audio to S3
    const result = await s3Service.uploadRecording(courseCode, uuid, processedBuffer, {
      ...metadata,
      recordedBy: 'human',
      source: 'recording',
      audioProcessing: audioMeta
    })

    // Update the sample flag in Supabase to mark as recorded
    if (supabaseClient.isInitialized()) {
      await supabaseClient.updateSampleFlag(
        uuid,
        courseCode,
        'needs_review',
        `Recorded by ${metadata.recordedBy || provenance.recordedBy || 'human'} at ${new Date().toISOString()}`,
        metadata.recordedBy || provenance.recordedBy || 'human'
      )

      // Insert recording provenance if metadata provided
      if (provenance.recordedBy) {
        try {
          await supabaseClient.insertRecordingProvenance({
            audioUuid: uuid,
            recordedBy: provenance.recordedBy,
            speakerNativeLanguage: provenance.speakerNativeLanguage,
            speakerProficiency: provenance.speakerProficiency,
            speakerAgeRange: provenance.speakerAgeRange,
            speakerDialect: provenance.speakerDialect,
            speakerRegion: provenance.speakerRegion,
            recordedAt: provenance.recordedAt || new Date().toISOString(),
            recordingLocation: provenance.recordingLocation,
            recordingDevice: provenance.recordingDevice,
            recordingEnvironment: provenance.recordingEnvironment,
            speakerConsent: provenance.speakerConsent !== undefined ? provenance.speakerConsent : true,
            consentFormRef: provenance.consentFormRef,
            usageRights: provenance.usageRights,
            qualityNotes: provenance.qualityNotes,
            retakeCount: provenance.retakeCount || 0
          })
          logger.log(`Provenance metadata recorded for ${uuid}`)
        } catch (provenanceError) {
          // Log error but don't fail the upload
          logger.error('Error inserting provenance metadata:', provenanceError)
          logger.error('Upload succeeded but provenance recording failed')
        }
      }
    }

    // Emit recording_completed event
    io.to(`course:${courseCode}`).emit('recording_completed', {
      courseCode,
      uuid,
      metadata: {
        recordedAt: provenance.recordedAt || new Date().toISOString(),
        recordedBy: metadata.recordedBy || provenance.recordedBy || 'human',
        source: 'recording',
        ...metadata
      }
    })

    res.json({
      success: true,
      uuid,
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
})

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
    const azureMissing = stats.missing

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
    const SHARED_AUDIO_REQUIREMENTS = { encouragement: 26, instruction: 48 }

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
      missingCounts: breakdown,  // Direct counts for UI
      samples: samplesByRole,

      // Seeds/LEGOs included in deduped counts (no separate tracking needed)
      seeds: { counts: {}, missing: { known: [], target1: [], target2: [] }, totalMissing: 0 },
      legos: { counts: {}, missing: { known: [], target1: [], target2: [] }, totalMissing: 0 },

      // ElevenLabs (local)
      sharedAudio,
      welcome: welcomeStatus,

      // Summary by generation process
      byProcess: {
        azure: {
          label: 'Azure TTS (Phrases)',
          missing: breakdown.known + breakdown.target1 + breakdown.target2,
          categories: ['known', 'target1', 'target2']
        },
        azureSeeds: {
          label: 'Azure TTS (Seeds)',
          missing: 0,  // Included in deduped counts
          categories: []
        },
        azureLegos: {
          label: 'Azure TTS (LEGOs)',
          missing: breakdown.presentation,
          categories: ['presentation']
        },
        elevenLabs: {
          label: 'ElevenLabs (UI Audio)',
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
app.get('/api/production/:courseCode/learning-journey', async (req, res) => {
  const { courseCode } = req.params
  const { maxLegos, offset } = req.query

  // Parse query params
  const maxLegosNum = maxLegos ? parseInt(maxLegos, 10) : 50
  const offsetNum = offset ? parseInt(offset, 10) : 0

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
        offsetNum
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
  const { known_text, target_text, flag_for_regeneration } = req.body

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

    logger.log(`[Recording Script] Generating interleaved script for ${courseCode}`)

    // Run the optimizer (suppress console output)
    const originalLog = console.log
    const logs = []
    console.log = (...args) => logs.push(args.join(' '))

    const result = await generateRecordingScript(courseCode, { verbose: false })

    console.log = originalLog

    if (!result) {
      return res.status(404).json({ error: 'No LEGOs found for course. Run Course Builder first.' })
    }

    const phrases = result.recordingScript.phrases
    const directItems = result.directRecord.items

    // Interleave: each phrase gets natural + slow pair
    const items = []
    let idx = 0

    for (let i = 0; i < phrases.length; i++) {
      const p = phrases[i]
      items.push({
        index: idx++,
        text: p.target,
        cadence: 'natural',
        type: 'phrase',
        phraseIndex: i,
        wordCount: p.wordCount,
        coversLegos: p.coversLegos,
        known: p.known || '',
        source: p.source || '',
        seedNumber: p.seedNumber || null
      })
      items.push({
        index: idx++,
        text: p.target,
        cadence: 'slow',
        type: 'phrase',
        phraseIndex: i,
        wordCount: p.wordCount,
        coversLegos: p.coversLegos,
        known: p.known || '',
        source: p.source || '',
        seedNumber: p.seedNumber || null
      })
    }

    // Append direct record items (also normal + slow pairs)
    for (let i = 0; i < directItems.length; i++) {
      const d = directItems[i]
      items.push({
        index: idx++,
        text: d.target,
        cadence: 'natural',
        type: 'direct',
        known: d.known || '',
        legoId: d.legoId || ''
      })
      items.push({
        index: idx++,
        text: d.target,
        cadence: 'slow',
        type: 'direct',
        known: d.known || '',
        legoId: d.legoId || ''
      })
    }

    // Estimate: ~6 seconds per item (read + pause)
    const estimatedMinutes = Math.round((items.length * 6) / 60)

    res.json({
      courseCode,
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

// GET /api/production/:courseCode/frankenstein-demo
// Returns audio URLs for the frankenstein demo (Seeds 1, 6, 11, and synthesized results)
app.get('/api/production/:courseCode/frankenstein-demo', async (req, res) => {
  try {
    const { courseCode } = req.params

    // Demo splice S3 keys (pre-generated spliced audio stored in S3)
    // V2: Generated with deterministic silence detection, 44.1kHz/128k CBR
    const demoSplices = {
      // demo1: "dw i ddim isio siarad Cymraeg rŵan" - built from seeds 1, 6, 11
      60: { s3Key: 'demo-splices/demo1.mp3', duration: 8934 },
      // demo2: "fedra i ddim siarad Cymraeg" - built from seed 6
      61: { s3Key: 'demo-splices/demo2.mp3', duration: 7105 },
      // demo3: "dw i isio ymarfer siarad Cymraeg" - built from seeds 1, 11
      62: { s3Key: 'demo-splices/demo3.mp3', duration: 7105 }
    }

    // The demo phrases for Welsh North
    // Source phrases (seeds 1, 6, 11) - fetched from database
    // Synthesized phrases (seeds 60, 61, 62) - use pre-spliced demo files
    const demoPhrases = [
      { seed: 1, text: 'dw i isio siarad Cymraeg', role: 'target1', isSynthesized: false },
      { seed: 6, text: 'fedra i ddim cofio sut i siarad Cymraeg', role: 'target1', isSynthesized: false },
      { seed: 11, text: 'ond well i mi ymarfer siarad Cymraeg rŵan', role: 'target1', isSynthesized: false },
      { seed: 60, text: 'dw i ddim isio siarad Cymraeg rŵan', english: "I don't want to speak Welsh now", role: 'target1', isSynthesized: true },
      { seed: 61, text: 'fedra i ddim siarad Cymraeg', english: "I can't speak Welsh", role: 'target1', isSynthesized: true },
      { seed: 62, text: 'dw i isio ymarfer siarad Cymraeg', english: "I want to practice speaking Welsh", role: 'target1', isSynthesized: true }
    ]

    const results = []

    for (const phrase of demoPhrases) {
      // For synthesized phrases, use the pre-spliced demo files with signed URLs
      if (phrase.isSynthesized && demoSplices[phrase.seed]) {
        const splice = demoSplices[phrase.seed]
        const url = await s3Service.getAudioSignedUrl(`demo-splice-${phrase.seed}`, 3600, { s3Key: splice.s3Key })
        results.push({
          seed: phrase.seed,
          text: phrase.text,
          english: phrase.english,
          audioId: `demo-splice-${phrase.seed}`,
          url,
          duration: splice.duration,
          isSynthesized: true
        })
        continue
      }

      // For source phrases, find audio in the database
      const audio = await supabaseClient.findCourseAudio(courseCode, phrase.text, 'cym', phrase.role)

      if (audio) {
        // Get signed URL
        const url = await s3Service.getAudioSignedUrl(audio.id, 3600, { s3Key: audio.s3_key })
        results.push({
          seed: phrase.seed,
          text: phrase.text,
          audioId: audio.id,
          url,
          duration: audio.duration_ms,
          isSynthesized: false
        })
      } else {
        results.push({
          seed: phrase.seed,
          text: phrase.text,
          audioId: null,
          url: null,
          duration: null,
          isSynthesized: false
        })
      }
    }

    res.json({
      courseCode,
      phrases: results
    })
  } catch (error) {
    logger.error('Error fetching frankenstein demo audio:', error)
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
    const courseConfigsId = `${knownCode}-${targetCode}`

    // Import the legacy manifest generator
    const { generateLegacyManifest, validateManifest } = require('./phases/generate-legacy-manifest.cjs')

    logger.info(`Generating legacy manifest for ${courseCode} (courseConfigsId: ${courseConfigsId}, withAudio: ${withAudio}, useAsIs: ${useAsIs})`)

    // Generate a job ID for audio generation tracking
    const audioJobId = withAudio ? `legacy-audio-${courseCode}-${Date.now()}` : null

    // If withAudio, run audio generation in background and return response immediately
    if (withAudio && audioJobId) {
      // Generate manifest WITHOUT audio first (fast)
      const { manifest, audioGenerationWarnings: noAudioWarnings, welcomeMissing } = await generateLegacyManifest(courseCode, { withAudio: false })

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
          ...(welcomeMissing ? ['Welcome audio missing - course will use placeholder introduction'] : [])
        ],
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
    const { manifest, audioGenerationWarnings, welcomeMissing } = await generateLegacyManifest(courseCode, { withAudio: false })

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
        ...(welcomeMissing ? ['Welcome audio missing - course will use placeholder introduction'] : [])
      ],
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
      status = 'beta',
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
    const courseConfigsId = `${knownCode}-${targetCode}`

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
    const courseConfigsId = `${knownCode}-${targetCode}`

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

          // Run auto-fix with pre-extracted durations (should be instant)
          const fixResults = await s3DeployService.autoFixDurations(
            uuids,
            pendingManifest,
            (phase, checked, total, fixed, errors) => {
              io.emit('s3Verify:progress', {
                courseCode, phase: 'fixing', checked, total, fixed, errors
              })
            },
            verifyResults.extractedDurations
          )

          logger.info(`[AUTO-FIX] Fixed ${fixResults.fixed} durations, ${fixResults.errors} errors`)

          // Save updated manifest
          await fs.writeJson(manifestPath, fixResults.updatedManifest, { spaces: 2 })
          results.durationsFixed = fixResults.fixed
          results.durationFixErrors = fixResults.errors

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
          const s3Verified = results.missing === 0 && verifyMismatched === 0
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
      // No mismatches, mark as verified immediately (database-first)
      const s3Verified = results.missing === 0
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
  const knownCode = languageCodeService.databaseToManifest(course.known_lang)
  const targetCode = languageCodeService.databaseToManifest(course.target_lang)
  const courseConfigsId = `${knownCode}-${targetCode}`

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

// GET /api/production/:courseCode/gender-prep/status
// Check gender expansion status for a course
app.get('/api/production/:courseCode/gender-prep/status', async (req, res) => {
  try {
    const { courseCode } = req.params

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const supabase = supabaseClient.getClient()

    // Get course target language
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('target_lang')
      .eq('course_code', courseCode)
      .single()

    if (courseErr || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const isGendered = genderHaikuService.GENDERED_LANGUAGES.includes(course.target_lang)

    if (!isGendered) {
      return res.json({ isGendered: false, processed: false, totalExpansions: 0, processedAt: null })
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
  try {
    const { courseCode } = req.params
    const { spawn: spawnProc } = require('child_process')

    if (!supabaseClient.isInitialized()) {
      return res.status(503).json({ error: 'Supabase not initialized' })
    }
    const supabase = supabaseClient.getClient()

    // Verify course exists and is gendered
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('target_lang, display_name')
      .eq('course_code', courseCode)
      .single()

    if (courseErr || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    if (!genderHaikuService.GENDERED_LANGUAGES.includes(course.target_lang)) {
      return res.status(400).json({ error: `Language ${course.target_lang} does not have grammatical gender` })
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

const { execFile } = require('child_process')
const { promisify } = require('util')
const execFileAsync = promisify(execFile)

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

const PORT = process.env.PRODUCTION_API_PORT || 3470

httpServer.listen(PORT, () => {
  logger.log(`Production API server running on port ${PORT}`)
  logger.log(`WebSocket path: /api/production/websocket`)
})

module.exports = { app, io, emitToRoom }
