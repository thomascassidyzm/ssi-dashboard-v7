/**
 * Auth Composable - Supabase Auth (email OTP)
 *
 * Uses the same Supabase Auth as the learning app.
 * Dashboard access requires platform_role in ('ssi_admin', 'popty_user')
 * or educational_role = 'god'.
 *
 * PERSISTENCE STRATEGY (March 2026):
 * We maintain our OWN localStorage cache for both session and learner data.
 * On page load / new tab, we read from OUR cache first (instant, zero network).
 * Supabase's getSession() is only used as a fallback, and onAuthStateChange
 * is only allowed to UPGRADE auth state (sign-in, token refresh) — never to
 * downgrade it due to transient refresh failures. Only explicit logout clears state.
 */

import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'

// Reactive state (module-level so it's shared across all useAuth() calls)
const session = ref(null)
const user = ref(null)       // Supabase Auth user
const learner = ref(null)    // learners table row
const loading = ref(false)
const error = ref(null)
const initialized = ref(false)

// Track whether the user explicitly logged out (vs transient refresh failure)
let explicitLogout = false

// Computed
const isAuthenticated = computed(() => !!session.value && !!learner.value)
const isAdmin = computed(() => {
  if (!learner.value) return false
  return learner.value.platform_role === 'ssi_admin' || learner.value.educational_role === 'god'
})
const hasDashboardAccess = computed(() => {
  if (!learner.value) return false
  const pr = learner.value.platform_role
  const er = learner.value.educational_role
  return pr === 'ssi_admin' || pr === 'popty_user' || er === 'god'
})

// ─── localStorage cache ──────────────────────────────────────────────
const LEARNER_CACHE_KEY = 'popty_learner'
const SESSION_CACHE_KEY = 'popty_session'

function cacheLearner(userId, data) {
  try { localStorage.setItem(LEARNER_CACHE_KEY, JSON.stringify({ userId, data })) } catch {}
}

function loadCachedLearner(userId) {
  try {
    const raw = localStorage.getItem(LEARNER_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (userId && cached.userId !== userId) return null
    const pr = cached.data?.platform_role
    const er = cached.data?.educational_role
    if (pr === 'ssi_admin' || pr === 'popty_user' || er === 'god') return cached.data
    return null
  } catch { return null }
}

function clearCachedLearner() {
  try { localStorage.removeItem(LEARNER_CACHE_KEY) } catch {}
}

function cacheSession(sessionData) {
  try {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      user: sessionData.user,
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      expires_at: sessionData.expires_at,
      cached_at: Date.now()
    }))
  } catch {}
}

function loadCachedSession() {
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function clearCachedSession() {
  try { localStorage.removeItem(SESSION_CACHE_KEY) } catch {}
}

/**
 * Fetch the learner record for the current auth user
 */
async function fetchLearner(userId) {
  if (!supabase) return null

  const { data, error: fetchError } = await supabase
    .from('learners')
    .select('id, user_id, display_name, platform_role, educational_role, verified_emails, dashboard_courses, created_at')
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    console.warn('[Auth] No learner record found for user:', userId)
    return null
  }

  return data
}

/**
 * Send OTP code to email via Supabase Auth
 */
async function sendOTP(email) {
  loading.value = true
  error.value = null

  try {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })

    if (otpError) {
      if (otpError.message?.includes('Signups not allowed') || otpError.message?.includes('not allowed')) {
        throw new Error('No account found for this email. Contact an SSi admin for access.')
      }
      throw otpError
    }

    return { success: true }
  } catch (err) {
    error.value = err.message
    throw err
  } finally {
    loading.value = false
  }
}

/**
 * Verify OTP code
 */
async function verifyOTP(email, token) {
  loading.value = true
  error.value = null

  try {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })

    if (verifyError) throw verifyError

    if (data.user) {
      const lr = await fetchLearner(data.user.id)
      if (!lr) {
        await supabase.auth.signOut()
        throw new Error('No dashboard access. Contact an SSi admin.')
      }

      const pr = lr.platform_role
      const er = lr.educational_role
      if (pr !== 'ssi_admin' && pr !== 'popty_user' && er !== 'god') {
        await supabase.auth.signOut()
        throw new Error('You don\'t have dashboard access. Contact an SSi admin.')
      }

      learner.value = lr
      cacheLearner(data.user.id, lr)
      if (data.session) cacheSession(data.session)
    }

    return data
  } catch (err) {
    error.value = err.message
    throw err
  } finally {
    loading.value = false
  }
}

/**
 * Initialize auth — check for existing session, set up listener
 *
 * STRATEGY: Read our own localStorage cache first (instant, zero network).
 * This means new tabs, refreshes, and post-deploy loads are instant.
 * Supabase session refresh happens in the background.
 */
async function initAuth() {
  if (!supabase || initialized.value) return

  initialized.value = true
  loading.value = true
  explicitLogout = false

  try {
    // ── Step 1: Load from OUR cache (instant, no network) ──────────
    const cachedSess = loadCachedSession()
    const cachedLr = cachedSess?.user?.id ? loadCachedLearner(cachedSess.user.id) : loadCachedLearner()

    if (cachedSess?.user && cachedLr) {
      // We have everything we need — auth is ready immediately
      session.value = cachedSess
      user.value = cachedSess.user
      learner.value = cachedLr
      console.log('[Auth] Restored from cache (instant)')
    }

    // ── Step 2: Try Supabase getSession as upgrade/fallback ────────
    // This may make a network call if token is expired. That's OK —
    // if it succeeds, we upgrade. If it fails, we already have cache.
    supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
      if (supaSession?.user) {
        session.value = supaSession
        user.value = supaSession.user
        cacheSession(supaSession)

        // Refresh learner from DB in background
        fetchLearner(supaSession.user.id).then(lr => {
          if (lr) {
            const pr = lr.platform_role
            const er = lr.educational_role
            if (pr === 'ssi_admin' || pr === 'popty_user' || er === 'god') {
              learner.value = lr
              cacheLearner(supaSession.user.id, lr)
            }
          }
        })
      } else if (!cachedSess?.user) {
        // No Supabase session AND no cache — genuinely not logged in
        console.log('[Auth] No session found (not logged in)')
      }
      // If getSession returns null but we have cache, do NOT clear —
      // it's likely a transient refresh failure
    }).catch(err => {
      console.warn('[Auth] getSession failed (using cache):', err.message)
    })

    // ── Step 3: Listen for auth changes ────────────────────────────
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[Auth] Event:', event)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Upgrade auth state
        session.value = newSession
        user.value = newSession?.user || null
        if (newSession) cacheSession(newSession)

        if (newSession?.user) {
          const lr = await fetchLearner(newSession.user.id)
          if (lr) {
            learner.value = lr
            cacheLearner(newSession.user.id, lr)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // ONLY clear state if the user explicitly logged out.
        // Transient refresh failures fire SIGNED_OUT — ignore those.
        if (explicitLogout) {
          session.value = null
          user.value = null
          learner.value = null
          clearCachedLearner()
          clearCachedSession()
        } else {
          console.warn('[Auth] Ignoring SIGNED_OUT (not explicit logout — likely token refresh failure)')
        }
      }
    })
  } catch (err) {
    console.error('[Auth] Init error:', err)
  } finally {
    loading.value = false
  }
}

/**
 * Logout — the ONLY way to clear auth state
 */
async function logout() {
  explicitLogout = true
  if (supabase) {
    await supabase.auth.signOut()
  }
  session.value = null
  user.value = null
  learner.value = null
  clearCachedLearner()
  clearCachedSession()
}

/**
 * Get the current access token (for API calls to production-api)
 */
async function getAccessToken() {
  if (!supabase) return null
  const { data: { session: s } } = await supabase.auth.getSession()
  return s?.access_token || null
}

/**
 * Check if user can access a specific course in the dashboard.
 */
function canAccessCourse(courseCode) {
  if (!learner.value) return false
  if (isAdmin.value) return true
  const dc = learner.value.dashboard_courses
  if (!dc || dc.length === 0) return false
  if (dc.includes('*')) return true
  return dc.includes(courseCode)
}

/**
 * Get list of accessible course codes (null = all courses)
 */
const accessibleCourses = computed(() => {
  if (!learner.value) return []
  if (isAdmin.value) return null
  const dc = learner.value.dashboard_courses
  if (!dc || dc.length === 0) return []
  if (dc.includes('*')) return null
  return dc
})

export function useAuth() {
  return {
    // State
    session,
    user,
    learner,
    loading,
    error,

    // Computed
    isAuthenticated,
    isAdmin,
    hasDashboardAccess,
    accessibleCourses,

    // Methods
    sendOTP,
    verifyOTP,
    initAuth,
    logout,
    getAccessToken,
    canAccessCourse,
  }
}
