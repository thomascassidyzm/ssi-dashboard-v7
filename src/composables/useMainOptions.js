/**
 * "Back to main options" — where a person goes when they've finished, WITHOUT
 * signing out.
 *
 * Role-aware on purpose. The router guard confines recorders to the Record
 * Room (src/router/index.js, the isRecorder block): any navigation to another
 * route bounces straight back into the room. So a hardcoded `to="/"` renders a
 * button that looks dead for exactly the people most likely to press it.
 *
 *   editor / admin      → the Popty home hub '/'
 *   recorder, >1 room   → the bare Record Room, which renders the room picker
 *   recorder, 1 room    → nowhere: the room IS their main options screen, so
 *                         the caller should not render a control at all
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

export function useMainOptions() {
  const router = useRouter()
  const { isRecorder, learner } = useAuth()

  const myRooms = computed(() => {
    const courses = learner.value?.courses
    return Array.isArray(courses) ? courses : []
  })

  const destination = computed(() => {
    if (!isRecorder.value) return '/'
    return myRooms.value.length > 1 ? { name: 'RecordRoom' } : null
  })

  const hasMainOptions = computed(() => destination.value !== null)

  function goToMainOptions() {
    if (!destination.value) return
    router.push(destination.value)
  }

  return { destination, hasMainOptions, goToMainOptions }
}
