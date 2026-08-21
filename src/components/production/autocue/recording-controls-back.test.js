// @vitest-environment jsdom
/**
 * A button whose first tap no longer does what it used to has to SAY so. The
 * old label was "Previous" and it skipped on the first press; in the studio it
 * now restarts the take, and only a double-tap steps back (backTap.js).
 *
 * The tutorial still steps straight back, so the label is opt-in — a surface
 * must never advertise behaviour it does not have.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecordingControls from './recording/RecordingControls.vue'

const mountControls = (props = {}) =>
  mount(RecordingControls, { props: { isRecording: true, ...props } })

describe('RecordingControls back button', () => {
  it('says what a tap and a double-tap do when the studio owns Back', () => {
    const text = mountControls({ backRestartsTake: true }).text()
    expect(text).toContain('Take it again')
    expect(text).toContain('double-tap = previous')
    expect(text).not.toContain('Previous take')
  })

  it('keeps the plain Previous label where Back still steps straight back', () => {
    const text = mountControls().text()
    expect(text).toContain('Previous')
    expect(text).not.toContain('double-tap')
  })

  it('emits the same event either way — the timing lives in the studio', async () => {
    const w = mountControls({ backRestartsTake: true })
    await w.findAll('button').find(b => b.text().includes('Take it again')).trigger('click')
    expect(w.emitted('previous')).toHaveLength(1)
  })
})
