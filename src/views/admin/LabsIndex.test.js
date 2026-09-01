/**
 * The Labs index, and the two claims it exists to make.
 *
 * 1. EVERY LAB IS ON IT — including the two that were not reachable from the
 *    admin tree at all before 2026-09-01: the Script Lab (linked only from
 *    inside /courses and /canonical/*) and Capture A/B (linked from nowhere in
 *    src/). This is the test that fails if a lab is added and the front door is
 *    not told about it.
 * 2. EVERY LAB WEARS ITS BLAST RADIUS, and the placements that matter are the
 *    ones the old tree got backwards: Basket Lab must not sit under a heading
 *    claiming it reaches every learner, and the deferred labs must not sit
 *    under "NOTHING".
 *
 * Plus: no lab's route may 404, and every legacy path must still resolve.
 */
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LabsIndex from './LabsIndex.vue'
import { BLAST_RADIUS, BLAST_ORDER, LAB_BLAST_RADIUS } from '@/components/admin/blastRadius'
import { LEGACY_LAB_REDIRECTS } from '@/router/legacyLabRedirects'

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : \'\'"><slot /></a>',
}

function render () {
  return mount(LabsIndex, { global: { stubs: { RouterLink: RouterLinkStub, 'router-link': RouterLinkStub } } })
}

const EXPECTED_LABS = [
  'Listening Lab', 'Speaking Lab', 'Voice Lab', 'Pod Lab',
  'Script Lab', 'VAD Lab', 'Basket Lab', 'Capture A/B',
]

describe('Labs index — every lab has a front door', () => {
  it('lists all eight labs, Script Lab and Capture A/B included', () => {
    const titles = render().findAll('.card-title').map(n => n.text())
    expect(titles.sort()).toEqual([...EXPECTED_LABS].sort())
  })

  it('links the Script Lab to its real route, not a /admin/labs path it does not have', () => {
    const hrefs = render().findAll('.hub-card').map(n => n.attributes('href'))
    expect(hrefs).toContain('/canonical/scripts')
    expect(hrefs).toContain('/admin/labs/capture-ab')
  })

  it('renders one section per non-empty tier, most-reaching first', () => {
    const labels = render().findAll('.section-label').map(n => n.text())
    expect(labels).toEqual(['LIVE NOW', 'LIVE AT NEXT GENERATION', 'NOTHING'])
  })
})

describe('Labs index — the labels are the point of the page', () => {
  it('gives every lab a tier and the write it was classified on', () => {
    const cards = render().findAll('.hub-card')
    expect(cards).toHaveLength(EXPECTED_LABS.length)
    for (const card of cards) {
      expect(card.find('.badge-label').text()).toBeTruthy()
      // The evidence line: a placement you can check rather than trust.
      expect(card.find('.card-writes').text()).toMatch(/^writes \S/)
    }
  })

  it('puts Listening, Speaking and Pod Lab in LIVE NOW', () => {
    const live = Object.entries(LAB_BLAST_RADIUS).filter(([, v]) => v.tier === 'live').map(([k]) => k)
    expect(live.sort()).toEqual(['listening', 'pods', 'speaking'])
  })

  it('rates Pod Lab by its highest-reaching write, not its typical one', () => {
    // Three of Pod Lab's four writes are genuinely deferred, and the fourth is
    // not: PATCH /api/pod-fine-map sets atom_map_fine, which the learner's Drill
    // reads live on every fetch. It was classified 'deferred' on the strength of
    // that endpoint's own comment claiming it "cannot touch ... anything
    // learners hear", which is false. A label pitched at the average control on
    // a page is a label that lies about the dangerous one.
    expect(LAB_BLAST_RADIUS.pods.tier).toBe('live')
    expect(LAB_BLAST_RADIUS.pods.writes).toMatch(/pod-fine-map/)
  })

  it('does not file Basket Lab or Capture A/B as reaching anyone', () => {
    // The old tree sat Basket Lab under "applies across every course and every
    // learner" while it was mounted readOnly: true and could write nothing.
    expect(LAB_BLAST_RADIUS.basket.tier).toBe('none')
    expect(LAB_BLAST_RADIUS['capture-ab'].tier).toBe('none')
  })

  it('does not file the deferred writers as read-only', () => {
    // Voice Lab declares a course side's voice; Script Lab edits the English
    // masters every course flexes from. Neither changes anything today. Both
    // change everything at the next generation. (Pod Lab was here until an
    // adversarial audit found its fine-map write on the live learner path.)
    for (const key of ['voice', 'scripts']) {
      expect(LAB_BLAST_RADIUS[key].tier).toBe('deferred')
    }
  })
})

describe('blast radius vocabulary', () => {
  it('uses only the three declared tiers', () => {
    for (const [key, entry] of Object.entries(LAB_BLAST_RADIUS)) {
      expect(BLAST_ORDER, `${key} has an unknown tier`).toContain(entry.tier)
      expect(BLAST_RADIUS[entry.tier].label).toBeTruthy()
      expect(entry.writes, `${key} has no evidence line`).toBeTruthy()
    }
  })
})

describe('the move leaves no broken bookmark', () => {
  it('redirects every old /admin/configs path to its lab', () => {
    const byPath = Object.fromEntries(LEGACY_LAB_REDIRECTS.map(r => [r.path, r.redirect]))
    expect(byPath['/admin/configs']).toBe('/admin/labs')
    for (const slug of ['listening', 'speaking', 'pods', 'voice', 'vad', 'basket']) {
      expect(byPath[`/admin/configs/${slug}`]).toBe(`/admin/labs/${slug}`)
    }
    expect(byPath['/admin/capture-ab']).toBe('/admin/labs/capture-ab')
    expect(byPath['/admin/listening']).toBe('/admin/labs/listening')
  })

  it('every redirect target is a path the index actually offers, or a lab route', () => {
    const offered = new Set(render().findAll('.hub-card').map(n => n.attributes('href')))
    offered.add('/admin/labs')
    for (const r of LEGACY_LAB_REDIRECTS) {
      expect(offered, `${r.path} redirects to an unlisted ${r.redirect}`).toContain(r.redirect)
    }
  })
})
