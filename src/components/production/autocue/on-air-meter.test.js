// @vitest-environment jsdom
/**
 * ON AIR — reassurance, never a gate.
 *
 * Sascha read 34 takes on 2026-08-21 into a recorder that showed them nothing,
 * and every one of them came back with its opening cut off at capture. The
 * capture fix is what makes an early start SAFE; this panel is what makes it
 * VISIBLE. The distinction is the whole design, so it is what these tests hold:
 * the lamp is lit for the entire session and the copy never tells anyone to
 * wait for it.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OnAirMeter from './OnAirMeter.vue'

const lit = (w) => w.findAll('.onair-seg.on').length

describe('the lamp is on for the whole session, not per take', () => {
  it('is lit while the room is being measured, before any phrase', async () => {
    // The stream is already hot during calibration — the pre-roll is running.
    // A lamp that waited for calibration to finish would be lying about when
    // it became safe to speak.
    const w = mount(OnAirMeter, { props: { live: true, calibrating: true, level: 0.01 } })
    expect(w.find('.onair').classes()).toContain('is-live')
  })

  it('stays lit between takes, when nobody is speaking', () => {
    // The gap between takes is exactly where the old bar taught the wrong
    // lesson. The stream is never unobserved, so the lamp never blinks off.
    const w = mount(OnAirMeter, { props: { live: true, speaking: false, level: 0.001 } })
    expect(w.find('.onair').classes()).toContain('is-live')
  })

  it('goes dark only when the microphone is actually off', () => {
    const w = mount(OnAirMeter, { props: { live: false, level: 0 } })
    expect(w.find('.onair').classes()).not.toContain('is-live')
    expect(w.find('.onair-line').text()).toBe('Microphone off')
  })
})

describe('the meter moves continuously with the speaker level', () => {
  it('paints more segments as the voice gets louder', async () => {
    const w = mount(OnAirMeter, { props: { live: true, level: 0 } })
    const atSilence = lit(w)

    await w.setProps({ level: 0.1 })
    const atQuiet = lit(w)
    await w.setProps({ level: 0.33 })
    const atSpeech = lit(w)

    expect(atSilence).toBe(0)
    expect(atQuiet).toBeGreaterThan(atSilence)
    expect(atSpeech).toBeGreaterThan(atQuiet)
  })

  it('shows movement at room tone, so a dead mic is distinguishable from a quiet one', async () => {
    // The point of a continuous meter: stillness must mean BROKEN, not quiet.
    // Room tone has to be able to light something.
    const w = mount(OnAirMeter, { props: { live: true, level: 0.03 } })
    expect(lit(w)).toBeGreaterThan(0)
  })

  it('pins the top of the scale rather than overflowing', async () => {
    const w = mount(OnAirMeter, { props: { live: true, level: 5 } })
    expect(lit(w)).toBe(w.findAll('.onair-seg').length)
  })

  it('never paints a negative or NaN level', async () => {
    const w = mount(OnAirMeter, { props: { live: true, level: -1 } })
    expect(lit(w)).toBe(0)
  })
})

describe('it never asks anyone to wait', () => {
  const GATE_WORDS = [
    'wait', 'ready', 'hold on', 'stand by', 'standby',
    'you may', 'you can now', 'begin when', 'do not speak', "don't speak"
  ]

  it('carries no gate language in any state', () => {
    for (const props of [
      { live: true, calibrating: false, level: 0.2 },
      { live: true, calibrating: true, level: 0.01 },
      { live: false, level: 0 }
    ]) {
      const text = mount(OnAirMeter, { props }).text().toLowerCase()
      for (const word of GATE_WORDS) {
        expect(text, `"${word}" in ${JSON.stringify(props)}`).not.toContain(word)
      }
    }
  })

  it('says takes are cut from the stream, which is what actually happens', () => {
    const w = mount(OnAirMeter, { props: { live: true, level: 0.2 } })
    expect(w.find('.onair-line').text()).toContain('cut from the stream')
  })

  it('asks for quiet during calibration without implying the mic is not live', () => {
    // "Stay quiet for a moment" is a real instruction — the room is being
    // measured. It must not read as "you are not on air yet".
    const w = mount(OnAirMeter, { props: { live: true, calibrating: true, level: 0.01 } })
    const line = w.find('.onair-line').text()
    expect(line).toContain('On air')
    expect(line).toContain('stay quiet')
  })
})
