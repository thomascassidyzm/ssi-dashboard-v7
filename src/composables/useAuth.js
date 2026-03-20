/**
 * Auth Composable - Supabase Auth (email OTP)
 *
 * OTP email = identity. dashboard_users table = access control.
 * No learners table, no RLS gymnastics.
 */

import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'

let explicitLogout = false

// Reactive state (module-level so it's shared across all useAuth() calls)
const session = ref(null)
const user = ref(null)           // Supabase Auth user
const dashboardUser = ref(null)  // dashboard_users row (email, role, courses)
const loading = ref(false)
const error = ref(null)
const initialized = ref(false)

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
      const { data, error: fetchError } = await supabase
        .from('dashboard_users')
        .select('email, name, role, courses')
        .eq('email', email)
        .single()

      if (data) return data
      // RLS might block anon — fall through to API
      if (fetchError) console.warn('[Auth] Direct dashboard_users query failed, trying API:', fetchError.message)
    }

    // Fallback: ask production-api (uses service key)
    const { getApiUrl } = await import('../services/api.js')
    const resp = await fetch(`${getApiUrl()}/api/auth/me?email=${encodeURIComponent(email)}`)
    if (resp.ok) {
      const data = await resp.json()
      return data
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

  try {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

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
    error.value = err.message
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
 * Verify OTP code — email is the identity
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
    const { data: { session: cachedSession } } = await supabase.auth.getSession()

    if (cachedSession?.user) {
      session.value = cachedSession
      user.value = cachedSession.user
      const email = cachedSession.user.email

      // Restore from cache instantly
      const cached = loadCachedUser(email)
      if (cached) {
        dashboardUser.value = cached
      }

      // Refresh from DB in background
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
