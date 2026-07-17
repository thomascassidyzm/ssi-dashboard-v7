// services/shared/dashboard-auth.cjs
//
// Server-side auth for standalone dashboard-backend services (anything NOT
// mounted inside production-api.cjs). Mirrors production-api.cjs's
// verifySupabaseJWT / authGetUser / authValidateSession / requireDashboardUser
// EXACTLY — same two auth paths (Supabase JWT, then legacy dashboard_sessions),
// same resolvePoptyIdentity authority order — so a user's access is identical
// across every dashboard backend. Do not fork this logic per-service.

const supabaseClient = require('../supabase-client.cjs')
const { resolvePoptyIdentity } = require('./popty-identity.cjs')
const createLogger = require('./logger.cjs')

const logger = createLogger('DashboardAuth')

async function authGetUser(email) {
  const { data, error } = await supabaseClient.getClient()
    .from('dashboard_users').select('*').eq('email', email).single()
  if (error && error.code === 'PGRST116') return null
  if (error) throw error
  return data ? { name: data.name, email: data.email, role: data.role, courses: data.courses, voice_id: data.voice_id } : null
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

async function verifySupabaseJWT(token) {
  try {
    const { data: { user }, error } = await supabaseClient.getClient().auth.getUser(token)
    if (error || !user) return null

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

// Like production-api's requireDashboardUser: resolves any dashboard user
// (editor, recorder, admin) from the Bearer token, writing 401/403 itself on
// failure. Returns the user object, or null (response already sent).
async function requireDashboardUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return null }

  const supabaseUser = await verifySupabaseJWT(token)
  if (supabaseUser) return supabaseUser

  const user = await authValidateSession(token)
  if (!user) { res.status(403).json({ error: 'Dashboard access required' }); return null }
  return user
}

// Express middleware form — mount with app.use('/api/whatever', requireDashboardUserMiddleware)
// to gate every route on that path in one place.
async function requireDashboardUserMiddleware(req, res, next) {
  const user = await requireDashboardUser(req, res)
  if (!user) return // requireDashboardUser already sent 401/403
  req.dashboardUser = user
  next()
}

module.exports = { requireDashboardUser, requireDashboardUserMiddleware, verifySupabaseJWT }
