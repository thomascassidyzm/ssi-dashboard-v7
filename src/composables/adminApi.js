import { getApiUrl } from '@/services/api'
import { useAuth } from '@/composables/useAuth'

/**
 * One authenticated JSON POST to the production API (requireAdmin routes).
 * Bearer token from the current session; the parsed body comes back on a
 * 2xx, and a non-2xx throws the server's `error` or the HTTP status.
 * A non-JSON body is treated as `{}` so an HTML error page still reports its
 * status rather than a parse error.
 */
export async function postAdminJson(path, body) {
  const { getAccessToken } = useAuth()
  const token = await getAccessToken()
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}
