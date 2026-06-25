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
// 'recorder' = recording-only helper tier (still in the dashboard_users schema CHECK).
// Recorders live in the Record Room shell, never the admin console.
const isRecorder = computed(() => dashboardUser.value?.role === 'recorder')
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
 * Direct read works for YOUR OWN row (RLS own-row policy); the API
 * fallback uses the service key and also resolves ssi_admin learners
 * without dashboard rows.
 */
// True when the LAST lookup got an AUTHORITATIVE answer (a row, or a
// definite "no row" from the API). False = the production machine could
// not be reached — callers must NOT tell the user they lack access then
// (a down tunnel was sending admins invite-code hunting, 2026-06-11).
let lastLookupAuthoritative = false

async function fetchDashboardUser(email) {
  if (!email) { lastLookupAuthoritative = true; return null }
  lastLookupAuthoritative = false

  try {
    // Direct Supabase read — data here is authoritative, but an EMPTY
    // result is not (RLS hides rows from anon/other sessions).
    if (supabase) {
      const { data, error: fetchError } = await supabase
        .from('dashboard_users')
        .select('email, name, role, courses, voice_id')
        .eq('email', email)
        .single()

      if (data) { lastLookupAuthoritative = true; return data }
      if (fetchError) console.warn('[Auth] Direct dashboard_users query failed, trying API:', fetchError.message)
    }

    // Same-origin serverless /api/auth/me (Vercel) — deployed WITH the
    // frontend, so it's reachable whenever the site itself is, with no
    // dependency on any production machine or tunnel. Only exists on
    // popty.app (vite dev would 404 this with HTML, which must not count
    // as an authoritative "no row").
    if (typeof window !== 'undefined' && window.location.hostname === 'popty.app') {
      try {
        const resp = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`)
        if (resp.ok) {
          lastLookupAuthoritative = true
          return await resp.json()
        }
        if (resp.status === 404) {
          lastLookupAuthoritative = true
          return null
        }
      } catch { /* fall through to the machine API */ }
    }

    // Fallback: production-api. 200 and 404 are both authoritative;
    // anything else (network error, 5xx) means "couldn't reach it".
    const { getApiUrl } = await import('../services/api.js')
    const resp = await fetch(`${getApiUrl()}/api/auth/me?email=${encodeURIComponent(email)}`)
    if (resp.ok) {
      lastLookupAuthoritative = true
      return await resp.json()
    }
    if (resp.status === 404) {
      lastLookupAuthoritative = true
      return null
    }
  } catch (err) {
    console.warn('[Auth] fetchDashboardUser error:', err.message)
  }
  return null
}

/** Message for a failed access lookup that does not lie about access. */
function accessLookupFailureMessage() {
  return lastLookupAuthoritative
    ? 'No dashboard access for this email. Contact an SSi admin.'
    : 'Could not reach the course production machine — check the machine selector (top right) or try again in a moment.'
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
      const rescue = !dbUser && !lastLookupAuthoritative ? loadCachedUser(email) : null
      if (dbUser || rescue) {
        // Identity is already proven (password verified); the cache only
        // carries role/courses from a previous successful lookup. Using it
        // when every access source is unreachable keeps admins working
        // through an outage instead of locking them out.
        dashboardUser.value = dbUser || rescue
        if (dbUser) cacheUser(dbUser)
      } else {
        error.value = accessLookupFailureMessage()
        dashboardUser.value = null
        // Only forget the cached row on a definite "no row" — wiping it on
        // a network failure destroys the one thing that keeps the user
        // working while the machine is unreachable.
        if (lastLookupAuthoritative) clearCachedUser()
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
      options: { shouldCreateUser: true }
    })

    if (otpError) {
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
      const rescue = !dbUser && !lastLookupAuthoritative ? loadCachedUser(email) : null
      if (dbUser || rescue) {
        // Cache rescue: identity proven by OTP; a previously-verified
        // role/courses row beats locking the user out during an outage.
        dashboardUser.value = dbUser || rescue
        if (dbUser) cacheUser(dbUser)
      } else {
        // OTP verified but no usable answer — distinguish "no access"
        // from "couldn't reach the machine" (never invite-code-wall admins
        // over a down tunnel).
        error.value = accessLookupFailureMessage()
        dashboardUser.value = null
        if (lastLookupAuthoritative) clearCachedUser()
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
        } else if (!cached && lastLookupAuthoritative) {
          // Definitive "no row" — not a dashboard user. (A non-authoritative
          // miss — machine unreachable — must not sign anyone out.)
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
    isRecorder,
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
    // True only when the last access lookup got a definite answer (row or
    // confirmed no-row). LoginForm must check this before invite-walling:
    // a network miss means "machine unreachable", not "no access".
    accessLookupWasAuthoritative: () => lastLookupAuthoritative,
    refreshAccess: async (email) => {
      const dbUser = await fetchDashboardUser(email)
      if (dbUser) {
        dashboardUser.value = dbUser
        cacheUser(dbUser)
      }
    },
  }
}
