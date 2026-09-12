// "Copy link" on the community course casting row (Tom, 2026-09-12).
//
// The editor casts a voice into a role and sends that person their link; the
// link is the artist's identity, scoped to THIS course. So the button is the
// EDITOR's, and an artist opening the same page never sees another artist's
// link. Both halves are asserted here.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const auth = vi.hoisted(() => ({ editor: true }))
vi.mock('@/composables/useAuth.js', () => ({
  useAuth: () => ({
    getAccessToken: async () => 'token',
    isEditorOf: (code) => auth.editor && code === 'spa_for_eng',
  }),
}))
vi.mock('@/services/api.js', () => ({ getApiUrl: () => 'http://api.test' }))
vi.mock('@/views/admin/voicelab/ConsentStep.vue', () => ({ default: { template: '<div />' } }))

import PodCastPanel from './PodCastPanel.vue'

const CAST = {
  podCast: {
    Ana: { voiceId: 'human_ana_spa', name: 'Ana', gender: 'f', email: 'ana@example.com' },
    Luis: { voiceId: 'human_luis_spa', name: 'Luis', gender: 'm', email: 'luis@example.com' },
  },
  speakers: [
    { speaker: 'Ana', gender: 'f', lineCount: 3, estimatedSeconds: 30 },
    { speaker: 'Luis', gender: 'm', lineCount: 2, estimatedSeconds: 20 },
  ],
  castDefaults: { default: 2, max: 5 },
}

beforeEach(() => {
  global.fetch = vi.fn(async (url) => {
    if (String(url).includes('/pods/cast')) return { ok: true, json: async () => CAST }
    return { ok: false, status: 404, json: async () => ({}) }
  })
})

async function mountPanel() {
  const wrapper = mount(PodCastPanel, { props: { courseCode: 'spa_for_eng' } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('PodCastPanel — Copy link on the casting row', () => {
  it('the editor gets one "Copy link" per cast artist, scoped to this course', async () => {
    auth.editor = true
    const w = await mountPanel()
    const buttons = w.findAll('.copy-link')
    expect(buttons.map(b => b.text())).toEqual(['Copy link', 'Copy link'])
    const hrefs = w.findAll('.open-link').map(a => a.attributes('href')).sort()
    expect(hrefs).toEqual([
      `${window.location.origin}/r/human_ana_spa?course=spa_for_eng`,
      `${window.location.origin}/r/human_luis_spa?course=spa_for_eng`,
    ])
  })

  it('copies the link and says Copied', async () => {
    auth.editor = true
    const written = []
    Object.defineProperty(global.navigator, 'clipboard', { value: { writeText: async (t) => { written.push(t) } }, configurable: true })
    const w = await mountPanel()
    await w.find('.copy-link').trigger('click')
    await flushPromises()
    expect(written).toEqual([`${window.location.origin}/r/human_ana_spa?course=spa_for_eng`])
    expect(w.find('.copy-link').text()).toBe('Copied')
  })

  it('a cast artist sees no link at all — not their own, never another artist’s', async () => {
    auth.editor = false
    const w = await mountPanel()
    expect(w.findAll('.copy-link')).toHaveLength(0)
    expect(w.findAll('.open-link')).toHaveLength(0)
    expect(w.html()).not.toContain('/r/human_luis_spa')
    // the cast itself is still readable
    expect(w.text()).toContain('Luis')
  })
})
