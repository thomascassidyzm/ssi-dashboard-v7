import { ref } from 'vue'
import { recordingApiBase as apiBase } from '@/services/recordingApi'

/**
 * How many recording voices the signed-in login reads — the server's answer (GET
 * /api/recording/mine, voicesForEmail), asked once per address and shared by every navbar.
 * Read by AppNavbar for the Recording link (recordingLink, job #420). Any failure counts as
 * none: a link that may lead nowhere is worse than no link.
 */
export const myVoiceCount = ref(0)
let askedFor = null

export async function refreshMyVoices(email, getAccessToken) {
  if (!email) { askedFor = null; myVoiceCount.value = 0; return }
  if (askedFor === email) return
  askedFor = email
  try {
    const token = await getAccessToken()
    const res = await fetch(`${apiBase()}/api/recording/mine`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    const data = res.ok ? await res.json() : null
    if (askedFor !== email) return
    myVoiceCount.value = Array.isArray(data?.voices) ? data.voices.length : 0
  } catch {
    if (askedFor === email) myVoiceCount.value = 0
  }
}
