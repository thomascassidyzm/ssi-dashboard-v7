/**
 * Auth Composable
 * Manages authentication state and operations
 */

import { ref, computed, watch } from 'vue'
import api from '../services/api'

const SESSION_KEY = 'ssi_session'
const USER_KEY = 'ssi_user'

// Reactive state
const session = ref(localStorage.getItem(SESSION_KEY) || null)
const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'))
const loading = ref(false)
const error = ref(null)

// Computed
const isAuthenticated = computed(() => !!session.value && !!user.value)
const isAdmin = computed(() => user.value?.role === 'admin')

// Persist to localStorage
watch(session, (val) => {
  if (val) localStorage.setItem(SESSION_KEY, val)
  else localStorage.removeItem(SESSION_KEY)
})

watch(user, (val) => {
  if (val) localStorage.setItem(USER_KEY, JSON.stringify(val))
  else localStorage.removeItem(USER_KEY)
}, { deep: true })

/**
 * Request magic link
 */
async function requestMagicLink(email) {
  loading.value = true
  error.value = null

  try {
    const response = await fetch('/api/auth/request-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send magic link')
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
 * Verify magic link token
 */
async function verifyToken(token) {
  loading.value = true
  error.value = null

  try {
    const response = await fetch(`/api/auth/verify?token=${token}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Invalid or expired link')
    }

    session.value = data.session
    user.value = data.user

    return data
  } catch (err) {
    error.value = err.message
    throw err
  } finally {
    loading.value = false
  }
}

/**
 * Check current session
 */
async function checkSession() {
  if (!session.value) return null

  try {
    const response = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${session.value}` }
    })

    if (!response.ok) {
      // Session invalid, clear it
      session.value = null
      user.value = null
      return null
    }

    const data = await response.json()
    user.value = data.user
    return data.user
  } catch (err) {
    console.error('[Auth] Session check failed:', err)
    return null
  }
}

/**
 * Logout
 */
function logout() {
  session.value = null
  user.value = null
}

/**
 * Check if user can access a course
 */
function canAccessCourse(courseCode) {
  if (!user.value) return false
  if (user.value.role === 'admin' || user.value.courses === '*') return true
  return user.value.courses?.includes(courseCode)
}

export function useAuth() {
  return {
    // State
    session,
    user,
    loading,
    error,

    // Computed
    isAuthenticated,
    isAdmin,

    // Methods
    requestMagicLink,
    verifyToken,
    checkSession,
    logout,
    canAccessCourse
  }
}
