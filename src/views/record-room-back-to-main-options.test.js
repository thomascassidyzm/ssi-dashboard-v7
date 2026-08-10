// @vitest-environment jsdom
/**
 * Aran (editor, admin role) finished a pod recording session and found that the
 * only control that looked like a way out of the Record Room was "Sign out" —
 * which signed him out of Popty entirely instead of returning him to his
 * options. These guard the acceptance criterion:
 *
 *   after a session, a control exists that is NOT sign out and that navigates
 *   to the main options screen without calling logout().
 *
 * They also guard the role-awareness, which is the part that is easy to get
 * wrong: the router guard confines recorders to the Record Room, so a naive
 * link to '/' would bounce and read as a dead button.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'

const push = vi.fn()
const logout = vi.fn()
const learner = ref({ courses: '*' })
const isRecorder = ref(false)
const pendingCount = ref(0)

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: {}, params: {}, meta: {} })
}))
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ learner, isRecorder, logout, dashboardUser: ref({ role: 'admin' }) })
}))
vi.mock('@/composables/useCourses', () => ({
  useCourses: () => ({ getCourseName: () => 'Welsh' })
}))
vi.mock('@/composables/useAutocueState', () => ({
  useAutocueState: () => ({ recordedCount: ref(0) })
}))
vi.mock('@/composables/useAudioUpload', () => ({
  useUploadQueue: () => ({ uploadedCount: ref(0), pendingCount })
}))
vi.mock('@/services/api', () => ({ getApiUrl: () => 'http://localhost:3001' }))

const { useMainOptions } = await import('@/composables/useMainOptions')
const RecordRoom = (await import('./RecordRoom.vue')).default

function mountRoom() {
  return shallowMount(RecordRoom, {
    props: { courseCode: null },
    global: { stubs: { 'router-link': true } }
  })
}

beforeEach(() => {
  push.mockClear()
  logout.mockClear()
  learner.value = { courses: '*' }
  isRecorder.value = false
  pendingCount.value = 0
})

describe('Record Room — a way back that is not sign out', () => {
  it('renders a back-to-main-menu control alongside sign out', () => {
    const w = mountRoom()
    const back = w.find('.btn-main-options')
    expect(back.exists()).toBe(true)
    expect(back.text()).not.toMatch(/sign out/i)
    expect(w.find('.btn-signout').exists()).toBe(true)
  })

  it('navigates to the main options screen without signing the user out', async () => {
    const w = mountRoom()
    await w.find('.btn-main-options').trigger('click')
    expect(push).toHaveBeenCalledWith('/')
    expect(logout).not.toHaveBeenCalled()
  })

  it('will not strand audio that is still uploading', async () => {
    pendingCount.value = 2
    const w = mountRoom()
    await w.vm.$nextTick()
    expect(w.find('.btn-main-options').attributes('disabled')).toBeDefined()
    expect(w.text()).toMatch(/saving your recording/i)
    await w.find('.btn-main-options').trigger('click')
    expect(push).not.toHaveBeenCalled()
  })

  it('sign out still signs out', async () => {
    const w = mountRoom()
    await w.find('.btn-signout').trigger('click')
    expect(logout).toHaveBeenCalled()
  })
})

describe('useMainOptions — role-aware destination', () => {
  it('sends an editor or admin to the Popty home hub', () => {
    isRecorder.value = false
    expect(useMainOptions().destination.value).toBe('/')
  })

  it('sends a multi-room recorder to the room picker, never to a route the guard bounces', () => {
    isRecorder.value = true
    learner.value = { courses: ['cym_for_eng', 'cym_south_for_eng'] }
    const { destination, hasMainOptions } = useMainOptions()
    expect(hasMainOptions.value).toBe(true)
    expect(destination.value).toEqual({ name: 'RecordRoom' })
  })

  it('offers no control to a single-room recorder — the room IS their main options', () => {
    isRecorder.value = true
    learner.value = { courses: ['cym_for_eng'] }
    expect(useMainOptions().hasMainOptions.value).toBe(false)
  })
})
