// @vitest-environment jsdom
// Job #392 (Aran 2026-10-14): in the tick panel a section's batches are folded by default behind
// a button, the section tickbox stays in view, and open/shut is remembered per section on the device.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BoothTicks from './BoothTicks.vue'

const SEED = {
  key: 'seed.cym_nv2_for_eng', kind: 'seed', title: 'New Welsh — North: whole sentences', total: 300, recorded: 100,
  batches: [{ n: 1, from: 1, to: 100, total: 100, recorded: 100 }, { n: 2, from: 101, to: 200, total: 100, recorded: 0 }, { n: 3, from: 201, to: 300, total: 100, recorded: 0 }],
}
const props = { tickables: [SEED], ticked: () => true, batchName: (t, b) => `Batch ${b.n}` }

describe('BoothTicks', () => {
  beforeEach(() => localStorage.clear())

  it('shows the section tickbox with its batches folded away until the button is tapped', async () => {
    const w = mount(BoothTicks, { props })
    expect(w.find('[data-test="tick-seed.cym_nv2_for_eng"]').exists()).toBe(true)
    expect(w.findAll('.bt-sub-row')).toHaveLength(0)
    const fold = w.find('[data-test="fold-seed.cym_nv2_for_eng"]')
    expect(fold.text()).toContain('2 batches')
    await fold.trigger('click')
    expect(w.findAll('.bt-sub-row').map((r) => r.text())).toEqual([expect.stringContaining('Batch 2'), expect.stringContaining('Batch 3')])
    expect(w.emitted('tick')).toBeUndefined() // opening the list never ticks anything
  })

  it('remembers an opened section on this device, and a shut one stays shut', async () => {
    const first = mount(BoothTicks, { props })
    await first.find('.bt-fold').trigger('click')
    expect(mount(BoothTicks, { props }).findAll('.bt-sub-row')).toHaveLength(2)
    await first.find('.bt-fold').trigger('click')
    expect(mount(BoothTicks, { props }).findAll('.bt-sub-row')).toHaveLength(0)
  })
})
