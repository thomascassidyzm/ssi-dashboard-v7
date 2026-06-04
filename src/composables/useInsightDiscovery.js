import { ref } from 'vue'
import { getApiUrl } from '@/services/api'
import { useAuth } from '@/composables/useAuth'

/**
 * Trigger the SSi insights "Discovery" deep-run on the always-on machine
 * (POST /api/insight-discovery/run, requireAdmin). The machine runs
 * `claude --print` on the Max subscription over real telemetry (school-demo
 * learners excluded) and writes findings to insight_discoveries; the SSi
 * learning-app /admin/insights feed reads them. Fire-and-forget (~1-2 min).
 */
export function useInsightDiscovery() {
  const { getAccessToken } = useAuth()
  const running = ref(false)
  const lastResult = ref(null)
  const error = ref(null)
  const latest = ref(null)
  const loadingLatest = ref(false)

  async function fetchLatest(source = 'real') {
    loadingLatest.value = true
    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/api/insight-discovery/latest?source=${source}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
      })
      const data = await res.json().catch(() => ({}))
      latest.value = data && data.latest ? data.latest : null
      return latest.value
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loadingLatest.value = false
    }
  }

  async function trigger(demo = false) {
    running.value = true
    error.value = null
    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/api/insight-discovery/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ demo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      lastResult.value = data
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      running.value = false
    }
  }

  return { running, lastResult, error, trigger, latest, loadingLatest, fetchLatest }
}
