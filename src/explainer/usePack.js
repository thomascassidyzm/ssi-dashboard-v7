// usePack — one source for the explanation pack, with the live-refresh path.
//
// The COMMITTED pack (src/explainer/pack.json, bundled at build time) is the
// always-available fallback: code-derived facts as of the deployed commit.
// The LIVE pack is the same compiler re-run on the production machine
// (GET {api_base}/api/explainer/pack) — same code-derived truth from that
// machine's checkout, plus a live snapshot (course list, audio-pass queue,
// row counts) the bundle can never carry. If the API is unreachable (no
// tunnel, machine asleep) the bundled pack simply stands — the Docs surface
// must never be blank.
import { ref, computed } from 'vue'
import bundledPack from '@/explainer/pack.json'

const apiBase = () => localStorage.getItem('api_base_url') || 'http://localhost:3470'

const livePack = ref(null)
const fetchedOnce = ref(false)
const refreshing = ref(false)
const refreshError = ref(null)

async function fetchLivePack() {
  try {
    const res = await fetch(`${apiBase()}/api/explainer/pack`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    if (!res.ok) return
    const pack = await res.json()
    if (pack?.version && pack?.truth) livePack.value = pack
  } catch { /* unreachable production machine — bundled pack stands */ }
}

export function usePack() {
  if (!fetchedOnce.value) {
    fetchedOnce.value = true
    fetchLivePack()
  }

  const pack = computed(() => livePack.value || bundledPack)
  const source = computed(() => (livePack.value ? 'live' : 'bundled'))

  // The admin "Update docs" verb: re-run the compiler on the production
  // machine against live truth, then re-fetch what it wrote.
  async function refresh(token) {
    refreshing.value = true
    refreshError.value = null
    try {
      const res = await fetch(`${apiBase()}/api/explainer/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `refresh failed (${res.status})`)
      await fetchLivePack()
      return body
    } catch (err) {
      refreshError.value = err.message
      throw err
    } finally {
      refreshing.value = false
    }
  }

  return { pack, source, refresh, refreshing, refreshError }
}
