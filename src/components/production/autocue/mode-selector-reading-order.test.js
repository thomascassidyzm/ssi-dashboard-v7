// @vitest-environment jsdom
/**
 * The recordist can SEE which reading order they are in, and change it.
 *
 * Until now the choice lived only in the link's ?order= query. On 2026-08-23 a
 * recordist opened the Record Room without it, landed in coverage order — which
 * opens deep in the course by design — and had no way to tell which mode they
 * were in or to switch. Nothing was lost, but the screen looked like a fresh
 * start.
 *
 * Kai's ruling, 2026-08-24: the DEFAULT does not change. Coverage stays the
 * normal mode; the fix is that the mode is visible and switchable.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const replace = vi.fn()
let query = {}

vi.mock('vue-router', () => ({
  useRoute: () => ({ query, params: { courseCode: 'deu_at_for_eng' } }),
  useRouter: () => ({ replace, push: vi.fn() })
}))

const ModeSelector = (await import('./ModeSelector.vue')).default

function mountWith(routeQuery = {}) {
  query = routeQuery
  replace.mockClear()
  return mount(ModeSelector)
}

const optionTitles = (w) => w.findAll('.order-option-title').map(o => o.text())
const activeTitle = (w) => w.findAll('.order-option').find(o => o.classes('active'))?.find('.order-option-title').text()

describe('the reading-order chooser', () => {
  it('offers both orders, described by what the reader actually does', () => {
    const titles = optionTitles(mountWith())
    expect(titles).toHaveLength(2)
    // Not "coverage" and not "course" — nobody will be standing next to a
    // volunteer to translate the internal names.
    expect(titles.join(' ').toLowerCase()).not.toContain('coverage order')
    expect(titles.some(t => /straight through/i.test(t))).toBe(true)
    expect(titles.some(t => /cut up/i.test(t))).toBe(true)
  })

  it('shows the usual mode as the one selected when the link says nothing', () => {
    const w = mountWith()
    expect(activeTitle(w)).toMatch(/cut up/i)
  })

  it('reflects an existing ?order=course link rather than contradicting it', () => {
    const w = mountWith({ order: 'course' })
    expect(activeTitle(w)).toMatch(/straight through/i)
  })

  it('starts the session in the order that is on screen, not the one in the link', async () => {
    const w = mountWith()
    await w.findAll('.order-option')[1].trigger('click')   // straight through
    await w.findAll('.mode-card')[0].trigger('click')      // Mode 1
    expect(w.emitted('select')[0]).toEqual(['new-course', { order: 'course' }])
  })

  it('writes the choice into the link, so the room and a shared link agree', async () => {
    const w = mountWith()
    await w.findAll('.order-option')[1].trigger('click')
    expect(replace).toHaveBeenCalledWith({ query: { order: 'course' } })
    // ...and switching back drops the param entirely, which is what a plain
    // recorder link looks like today.
    await w.findAll('.order-option')[0].trigger('click')
    expect(replace).toHaveBeenLastCalledWith({ query: {} })
  })

  it('keeps the test batch in the chosen order too', async () => {
    const w = mountWith({ order: 'course' })
    await w.find('.test-batch-btn').trigger('click')
    expect(w.emitted('select')[0][1]).toMatchObject({ order: 'course', maxSeed: 5 })
  })

  it('treats anything but the exact word course as the usual mode', () => {
    expect(activeTitle(mountWith({ order: 'Course' }))).toMatch(/cut up/i)
    expect(activeTitle(mountWith({ order: 'coverage' }))).toMatch(/cut up/i)
  })
})
