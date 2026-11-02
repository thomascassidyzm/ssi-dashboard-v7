import { getApiUrl } from '@/services/api'
import { useAuth } from '@/composables/useAuth'

/**
 * One authenticated JSON call to the production API (requireAdmin and other
 * session-bearer routes). Bearer token from the current session; the parsed
 * body comes back on a 2xx, and a non-2xx throws the server's `error` or the
 * HTTP status. A non-JSON body is treated as `{}` so an HTML error page still
 * reports its status rather than a parse error.
 *
 * `postAdminJson` and `getAdminJson` are the two shapes callers actually use;
 * both go through `adminJson` so the bearer, the error contract and the
 * non-JSON fallback are decided in exactly one place.
 */
async function adminJson(path, init) {
  const { getAccessToken } = useAuth()
  const token = await getAccessToken()
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export function postAdminJson(path, body) {
  return adminJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** The GET twin: no body, no content-type, same bearer and same error contract. */
export function getAdminJson(path) {
  return adminJson(path, { method: 'GET' })
}
