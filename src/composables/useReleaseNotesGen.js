import { ref } from 'vue'
import { getApiUrl } from '@/services/api'
import { useAuth } from '@/composables/useAuth'

/**
 * Generate + publish learner-facing app release notes from the always-on
 * machine. generate() reads the learning-app's main..staging delta via local
 * git on the machine, runs `claude --print` on the Max subscription, and
 * inserts a DRAFT into the shared release_notes table; publish() flips that
 * draft to published (saving any edits). The learning app's
 * /admin/release-notes surface reads published rows. requireAdmin.
 */
export function useReleaseNotesGen() {
  const { getAccessToken } = useAuth()
  const generating = ref(false)
  const publishing = ref(false)
  const error = ref(null)
  const draft = ref(null)        // { id, version, headline, bullets, commitCount }
  const published = ref(null)    // the published row after publish()

  async function generate(version) {
    generating.value = true
    error.value = null
    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/api/release-notes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(version ? { version } : {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      draft.value = data
      published.value = null
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      generating.value = false
    }
  }

  async function publish(payload) {
    publishing.value = true
    error.value = null
    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/api/release-notes/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      published.value = data
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      publishing.value = false
    }
  }

  return { generating, publishing, error, draft, published, generate, publish }
}
