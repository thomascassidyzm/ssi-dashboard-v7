/**
 * Auth Composable - Supabase Auth (email OTP)
 *
 * Uses the same Supabase Auth as the learning app.
 * Dashboard access requires platform_role in ('ssi_admin', 'popty_user')
 * or educational_role = 'god'.
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
      // "Signups not allowed" means user doesn't have a Supabase Auth account
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

    // Session is set automatically by Supabase, onAuthStateChange will fire
    // But we also check dashboard access immediately
    if (data.user) {
      const lr = await fetchLearner(data.user.id)
      if (!lr) {
        // User exists in Supabase Auth but has no learner record
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
    // Check for existing session
    const { data: { session: existingSession } } = await supabase.auth.getSession()

    if (existingSession?.user) {
      session.value = existingSession
      user.value = existingSession.user
      const lr = await fetchLearner(existingSession.user.id)

      if (lr) {
        const pr = lr.platform_role
        const er = lr.educational_role
        if (pr === 'ssi_admin' || pr === 'popty_user' || er === 'god') {
          learner.value = lr
        } else {
          // Has account but no dashboard access — sign out
          await supabase.auth.signOut()
          session.value = null
          user.value = null
        }
      } else {
        // No learner record — sign out
        await supabase.auth.signOut()
        session.value = null
        user.value = null
      }
    }

    // Listen for auth changes (sign in, sign out, token refresh)
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      session.value = newSession
      user.value = newSession?.user || null

      if (event === 'SIGNED_IN' && newSession?.user) {
        const lr = await fetchLearner(newSession.user.id)
        learner.value = lr
      } else if (event === 'SIGNED_OUT') {
        learner.value = null
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
  if (supabase) {
    await supabase.auth.signOut()
  }
  session.value = null
  user.value = null
  learner.value = null
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
 * - ssi_admin / god → all courses
 * - popty_user → only courses in dashboard_courses (or all if ['*'])
 */
function canAccessCourse(courseCode) {
  if (!learner.value) return false
  // Admins and god get everything
  if (isAdmin.value) return true
  // popty_user: check dashboard_courses
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
  if (isAdmin.value) return null // null means all
  const dc = learner.value.dashboard_courses
  if (!dc || dc.length === 0) return []
  if (dc.includes('*')) return null // null means all
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
