// @vitest-environment jsdom
//
// THE RECORDING LINK ON THE TOP BAR (job #420, Aran 2026-10-14): shown to a signed-in person who
// reads a recording voice, wherever the bar shows, and to nobody else. Whether they read one is
// the server's answer (/api/recording/mine — voicesForEmail, the rule the booth's tabs use).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import router from '../router/index.js'
import { recordingLink } from './navigation.js'
import { myVoiceCount, refreshMyVoices } from './myVoices.js'

const courses = router.resolve('/courses')
const booth = router.resolve('/r/human_aran_cym_n')
const signedOut = { isAuthenticated: false, isAdmin: false, isRecorder: false }
const admin = { isAuthenticated: true, isAdmin: true, isRecorder: false }
const editor = { isAuthenticated: true, isAdmin: false, isRecorder: false }
const recorder = { isAuthenticated: true, isAdmin: false, isRecorder: true }

describe('the Recording link shows by voice, not by role', () => {
  it('shows for an admin, an editor and a recorder who read a voice, and goes to their own booth home', () => {
    for (const v of [admin, editor]) {
      expect(recordingLink(courses, { ...v, voiceCount: 1 })).toMatchObject({ label: 'Recording', to: '/my-recording', active: false })
    }
    for (const v of [admin, editor, recorder]) {
      expect(recordingLink(booth, { ...v, voiceCount: 2 })).toMatchObject({ to: '/my-recording', active: true })
    }
  })

  it('hides for a login with no voice and for a signed-out visitor, even one holding a voice count', () => {
    for (const v of [admin, editor, recorder]) {
      expect(recordingLink(courses, { ...v, voiceCount: 0 })).toBeNull()
      expect(recordingLink(booth, { ...v })).toBeNull()
    }
    expect(recordingLink(booth, { ...signedOut, voiceCount: 1 })).toBeNull()
  })

  it('goes with the bar: mid-take, and for a recorder off the booth, there is no bar to carry it', () => {
    expect(recordingLink(booth, { ...admin, voiceCount: 1, micLive: true })).toBeNull()
    expect(recordingLink(courses, { ...recorder, voiceCount: 1 })).toBeNull()
  })
})

describe('the voice count is the server\'s /mine answer, once per address', () => {
  beforeEach(async () => { await refreshMyVoices(null) })

  it('counts the voices /mine names, and counts none when it fails or names none', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ voices: [{ voiceId: 'human_aran_cym_n' }] }) })
    await refreshMyVoices('aran@hey.com', async () => 'tok')
    expect(myVoiceCount.value).toBe(1)
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/api\/recording\/mine$/)
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')
    await refreshMyVoices('aran@hey.com', async () => 'tok')
    expect(global.fetch).toHaveBeenCalledTimes(1)

    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ voices: [] }) })
    await refreshMyVoices('nobody@example.com', async () => 'tok')
    expect(myVoiceCount.value).toBe(0)

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    await refreshMyVoices('other@example.com', async () => null)
    expect(myVoiceCount.value).toBe(0)

    await refreshMyVoices(null)
    expect(myVoiceCount.value).toBe(0)
  })
})
