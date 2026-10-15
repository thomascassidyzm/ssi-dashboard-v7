import { ref, watch } from 'vue'
import { useAuth } from './useAuth'
import { recordingApiBase as apiBase, rememberBoothKey } from '@/services/recordingApi'

/**
 * Which recording voices does the signed-in login hold? The SAME answer /my-recording and the
 * booth's language tabs use (GET /api/recording/mine: dashboard_users.voice_id ∪
 * language_recording_policy voices by email, job #392) — asked once per login, so the navbar's
 * Recording link (job #411) shows for exactly the people that door would open a booth for.
 * Nobody signed in, an error, or no voice: an empty list, and no link.
 */
const voices = ref([])
let askedFor = null

export function useMyRecordingVoices() {
  const { isAuthenticated, user, getAccessToken } = useAuth()
  watch(() => (isAuthenticated.value ? user.value?.email || null : null), async (email) => {
    if (email === askedFor) return
    askedFor = email
    voices.value = []
    if (!email) return
    try {
      const token = await getAccessToken()
      const res = await fetch(`${apiBase()}/api/recording/mine`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      if (!res.ok || askedFor !== email) return
      const data = await res.json()
      const list = Array.isArray(data.voices) ? data.voices : []
      for (const v of list) if (v.boothKey) rememberBoothKey(v.voiceId, v.boothKey)
      voices.value = list
    } catch { /* the link is a convenience; without an answer it simply is not shown */ }
  }, { immediate: true })
  return { voices }
}
