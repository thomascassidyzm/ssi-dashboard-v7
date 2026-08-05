// The per-round "open in the learning app" launch, asserted on the rendered
// round rows rather than on the helper alone. What matters here is that the
// button a producer actually clicks exists on every round, is not swallowed by
// the row's expand/collapse, and hands the learning app the round AND the LEGO
// id — the LEGO is the anchor that survives the journey renumbering rounds
// when it hides content awaiting audio.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LearningJourneyView from './LearningJourneyView.vue'

const item = (type, id) => ({
  id,
  type,
  legoId: 'S0002L02',
  seedNumber: 2,
  knownText: "I'm trying to",
  targetText: 'ich versuche zu',
})

const round = (roundNumber, legoId) => ({
  roundNumber,
  legoId,
  legoIndex: 2,
  seedId: 'S0002',
  legoType: 'M',
  isNew: true,
  items: [item('intro', `${legoId}-intro`), item('build', `${legoId}-b1`)],
  spacedRepReviews: [],
  itemCount: 2,
})

const ROUNDS = [round(7, 'S0002L02'), round(8, 'S0002L03')]

function mountView() {
  return mount(LearningJourneyView, {
    props: {
      rounds: ROUNDS,
      allItems: ROUNDS.flatMap(r => r.items),
      stats: null,
      courseCode: 'deu_for_eng',
      isLoading: false,
    },
  })
}

describe('LearningJourneyView — launch a round in the learning app', () => {
  let openSpy

  beforeEach(() => {
    openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders one launch button per round row', () => {
    const wrapper = mountView()
    const buttons = wrapper.findAll('[title="Open this round in the learning app"]')
    expect(buttons).toHaveLength(ROUNDS.length)
  })

  it('opens the learning app at that round and LEGO, in a new tab', async () => {
    const wrapper = mountView()
    await wrapper.findAll('[title="Open this round in the learning app"]')[0].trigger('click')

    expect(openSpy).toHaveBeenCalledTimes(1)
    const [url, target] = openSpy.mock.calls[0]
    expect(url).toContain('?course=deu_for_eng')
    expect(url).toContain('&round=7')
    expect(url).toContain('&lego=S0002L02')
    expect(url).not.toContain('&cycle=')
    expect(target).toBe('_blank')
  })

  it('launching does not toggle the round open or shut', async () => {
    const wrapper = mountView()
    const before = wrapper.findAll('.item-row').length
    expect(before).toBeGreaterThan(0)
    await wrapper.findAll('[title="Open this round in the learning app"]')[0].trigger('click')
    expect(wrapper.findAll('.item-row').length).toBe(before)
  })

  it('carries the cycle when launched from a cycle row', async () => {
    const wrapper = mountView()
    // Rounds render expanded, so the cycle rows are already on screen.
    const cycleButtons = wrapper.findAll('[title="Open the learning app from here"]')
    expect(cycleButtons.length).toBeGreaterThan(0)

    await cycleButtons[1].trigger('click')
    const [url] = openSpy.mock.calls[0]
    expect(url).toContain('&round=7')
    expect(url).toContain('&lego=S0002L02')
    // Second row, and the contract is 1-based.
    expect(url).toContain('&cycle=2')
  })
})
