/**
 * Auth Composable - Supabase Auth (email OTP)
 *
 * OTP email = identity. dashboard_users table = access control.
 * No learners table, no RLS gymnastics.
 *
 * Resilience: All Supabase calls are wrapped with timeouts so the UI
 * never hangs indefinitely when the database is unreachable.
 */

import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'

let explicitLogout = false

// Timeout for auth operations (ms) — if Supabase doesn't respond in this time,
// we fail fast with a clear error instead of hanging forever.
const AUTH_TIMEOUT_MS = 10_000

/**
 * Wrap a promise with a timeout. Rejects with a clear message if the
 * promise doesn't settle within `ms` milliseconds.
 */
function withTimeout(promise, ms = AUTH_TIMEOUT_MS, operation = 'Auth operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(
        `${operation} timed out — the authentication service may be unavailable. Please try again in a few minutes.`
      )), ms)
    )
  ])
}

// Reactive state (module-level so it's shared across all useAuth() calls)
const session = ref(null)
const user = ref(null)           // Supabase Auth user
const dashboardUser = ref(null)  // dashboard_users row (email, role, courses)
const loading = ref(false)
const error = ref(null)
const initialized = ref(false)
const serviceUnavailable = ref(false) // true when Supabase appears unreachable

// Computed
const isAuthenticated = computed(() => !!dashboardUser.value)
const isAdmin = computed(() => dashboardUser.value?.role === 'admin')
const hasDashboardAccess = computed(() => !!dashboardUser.value)
const hasPassword = computed(() => !!user.value?.user_metadata?.has_password)

// ─── localStorage cache ──────────────────────────────────────
const CACHE_KEY = 'popty_dashboard_user'

function cacheUser(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
}

function loadCachedUser(email) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (email && cached.email !== email) return null
    return cached
  } catch { return null }
}

function clearCachedUser() {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}

/**
 * Fetch the dashboard_users row by email.
 * Uses service key via production-api because dashboard_users
 * has RLS restricted to service_role (and that's fine).
 */
async function fetchDashboardUser(email) {
  if (!email) return null

  try {
    // Try direct Supabase first (works if anon has read access)
    if (supabase) {
      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('dashboard_users')
          .select('email, name, role, courses')
          .eq('email', email)
          .single(),
        AUTH_TIMEOUT_MS,
        'Fetching user profile'
      )

      if (data) return data
      // RLS might block anon — fall through to API
      if (fetchError) console.warn('[Auth] Direct dashboard_users query failed, trying API:', fetchError.message)
    }

    // Fallback: ask production-api (uses service key)
    const { getApiUrl } = await import('../services/api.js')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)
    try {
      const resp = await fetch(`${getApiUrl()}/api/auth/me?email=${encodeURIComponent(email)}`, {
        signal: controller.signal
      })
      if (resp.ok) {
        return await resp.json()
      }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (err) {
    console.warn('[Auth] fetchDashboardUser error:', err.message)
  }
  return null
}

/**
 * Sign in with email + password
 */
async function signInWithPassword(email, password) {
  loading.value = true
  error.value = null
  serviceUnavailable.value = false

  try {
    const { data, error: signInError } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      AUTH_TIMEOUT_MS,
      'Signing in'
    )

    if (signInError) throw signInError

    if (data.user) {
      user.value = data.user
      session.value = data.session

      const dbUser = await fetchDashboardUser(email)
      if (dbUser) {
        dashboardUser.value = dbUser
        cacheUser(dbUser)
      } else {
        error.value = 'No dashboard access for this email. Contact an SSi admin.'
        dashboardUser.value = null
        clearCachedUser()
      }
    }

    return data
  } catch (err) {
    if (err.message?.includes('timed out') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      serviceUnavailable.value = true
      error.value = 'Unable to reach the authentication service. Please try again in a few minutes.'
    } else {
      error.value = err.message
    }
    throw err
  } finally {
    loading.value = false
  }
}

/**
 * Set or change password for the current user
 */
async function updatePassword(newPassword) {
  if (!supabase) return { error: 'Not connected' }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
    data: { has_password: true }
  })

  if (updateError) return { error: updateError.message }

  // Update local user ref
  if (user.value) {
    user.value = {
      ...user.value,
      user_metadata: { ...user.value.user_metadata, has_password: true }
    }
  }

  return { success: true }
}

/**
 * Send OTP code to email via Supabase Auth
 */
async function sendOTP(email) {
  loading.value = true
  error.value = null
  serviceUnavailable.value = false

  try {
    const { error: otpError } = await withTimeout(
      supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      }),
      AUTH_TIMEOUT_MS,
      'Sending login code'
    )

    if (otpError) {
      if (otpError.message?.includes('Signups not allowed') || otpError.message?.includes('not allowed')) {
        throw new Error('No account found for this email. Contact an SSi admin for access.')
      }
      throw otpError
    }

    serviceUnavailable.value = false
    return { success: true }
  } catch (err) {
    if (err.message?.includes('timed out') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      serviceUnavailable.value = true
      error.value = 'Unable to reach the authentication service. Please try again in a few minutes.'
    } else {
      error.value = err.message
    }
    throw err
  } finally {
    loading.value = false
  }
}

/**
 * Verify OTP code — email is the identity
 */
async function verifyOTP(email, token) {
  loading.value = true
  error.value = null
  serviceUnavailable.value = false

  try {
    const { data, error: verifyError } = await withTimeout(
      supabase.auth.verifyOtp({ email, token, type: 'email' }),
      AUTH_TIMEOUT_MS,
      'Verifying code'
    )

    if (verifyError) throw verifyError

    if (data.user) {
      user.value = data.user
      session.value = data.session

      // Look up dashboard access by email
      const dbUser = await fetchDashboardUser(email)
      if (dbUser) {
        dashboardUser.value = dbUser
        cacheUser(dbUser)
      } else {
        // OTP verified but no dashboard_users row — no dashboard access
        error.value = 'No dashboard access for this email. Contact an SSi admin.'
        dashboardUser.value = null
        clearCachedUser()
      }
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
 */
async function initAuth() {
  if (!supabase || initialized.value) return

  initialized.value = true
  loading.value = true

  try {
    // Timeout getSession so the router guard doesn't block forever when Supabase is down.
    // getSession() reads from local storage first, so this is usually instant —
    // but if it tries to refresh an expired token, it hits the network.
    const { data: { session: cachedSession } } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_TIMEOUT_MS,
      'Restoring session'
    )

    if (cachedSession?.user) {
      session.value = cachedSession
      user.value = cachedSession.user
      const email = cachedSession.user.email

      // Restore from cache instantly
      const cached = loadCachedUser(email)
      if (cached) {
        dashboardUser.value = cached
      }

      // Refresh from DB in background (no timeout needed — fire and forget)
      fetchDashboardUser(email).then(dbUser => {
        if (dbUser) {
          dashboardUser.value = dbUser
          cacheUser(dbUser)
        } else if (!cached) {
          // No cache and no DB row — not a dashboard user
          dashboardUser.value = null
        }
      }).catch(() => {
        // DB fetch failed — cache is good enough
      })
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, newSession) => {
      session.value = newSession
      user.value = newSession?.user || null

      if (event === 'SIGNED_OUT' && explicitLogout) {
        dashboardUser.value = null
        clearCachedUser()
        explicitLogout = false
      }
    })
  } catch (err) {
    console.error('[Auth] Init error:', err)
    // If init fails due to timeout, mark service as unavailable
    // but don't block the app — let the user see the login page
    if (err.message?.includes('timed out')) {
      serviceUnavailable.value = true
    }
  } finally {
    loading.value = false
  }
}

/**
 * Logout
 */
async function logout() {
  explicitLogout = true
  if (supabase) {
    await supabase.auth.signOut()
  }
  session.value = null
  user.value = null
  dashboardUser.value = null
  clearCachedUser()
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
 * admin → all courses. Others → check courses field.
 */
function canAccessCourse(courseCode) {
  if (!dashboardUser.value) return false
  if (isAdmin.value) return true
  const courses = dashboardUser.value.courses
  if (!courses) return false
  if (courses === '*') return true
  if (Array.isArray(courses)) return courses.includes(courseCode)
  return false
}

/**
 * Get list of accessible course codes (null = all courses)
 */
const accessibleCourses = computed(() => {
  if (!dashboardUser.value) return []
  if (isAdmin.value) return null
  const courses = dashboardUser.value.courses
  if (!courses) return []
  if (courses === '*') return null
  if (Array.isArray(courses)) return courses
  return []
})

export function useAuth() {
  return {
    // State
    session,
    user,
    learner: dashboardUser,  // kept as 'learner' for backwards compat with templates
    loading,
    error,
    serviceUnavailable,

    // Computed
    isAuthenticated,
    isAdmin,
    hasDashboardAccess,
    hasPassword,
    accessibleCourses,

    // Methods
    sendOTP,
    verifyOTP,
    signInWithPassword,
    updatePassword,
    initAuth,
    logout,
    getAccessToken,
    canAccessCourse,
  }
}
