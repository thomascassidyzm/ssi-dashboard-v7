/**
 * Central Authorization wiring for the dashboard's raw fetch() calls.
 *
 * Course-scoped API routes (/api/production/:courseCode/* etc.) are now
 * auth-gated server-side. API calls are scattered across dozens of
 * components as bare fetch() — rather than touching every call site, this
 * installs a window.fetch wrapper that attaches the Supabase session token
 * to API-bound requests only:
 *
 *   - relative '/api/...' URLs (ngrok same-origin mode), or
 *   - `${getApiUrl()}/api/...` absolute URLs.
 *
 * Everything else (S3, GitHub, Supabase, static assets) is left untouched so
 * the token never leaks to third-party hosts. A request that already carries
 * an Authorization header is passed through unchanged.
 *
 * The axios instance gets the same treatment via its own interceptor in
 * services/api.js.
 */
import { supabase } from './supabase'
import { getApiUrl } from './api'

function isApiRequest(url) {
  if (typeof url !== 'string' || !url) return false
  if (url.startsWith('/api/')) return true
  const base = getApiUrl()
  if (base && url.startsWith(base)) {
    const rest = url.slice(base.length)
    return rest.startsWith('/api/')
  }
  return false
}

async function getSessionToken() {
  try {
    if (!supabase) return null
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch {
    return null
  }
}

export function installAuthFetch() {
  if (typeof window === 'undefined' || window.__poptyAuthFetchInstalled) return
  window.__poptyAuthFetchInstalled = true

  const origFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    try {
      const url = typeof input === 'string'
        ? input
        : (input instanceof URL ? input.href : input?.url)
      if (isApiRequest(url)) {
        const headers = new Headers(
          init?.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined)
        )
        if (!headers.has('Authorization')) {
          const token = await getSessionToken()
          if (token) {
            headers.set('Authorization', `Bearer ${token}`)
            init = { ...(init || {}), headers }
          }
        }
      }
    } catch {
      // Never break a request over auth decoration — send it as-is.
    }
    return origFetch(input, init)
  }
}
