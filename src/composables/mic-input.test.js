// Which microphone is this? Built-in phone/laptop mic → the phone setup (voice
// chain, as before); a proper plugged-in mic → the pro setup (all DSP off).
import { describe, it, expect } from 'vitest'
import { classifyMicInput, setupForMicKind } from './mic-input.js'

const kind = (label, channelCount) => classifyMicInput({ label, channelCount }).kind

describe('classifyMicInput', () => {
  it.each([
    'iPhone Microphone', 'Bottom Microphone', 'Front Microphone', 'Back Microphone',
    'MacBook Air Microphone', 'MacBook Pro Microphone (Built-in)', 'Built-in Microphone',
    'Default - MacBook Pro Microphone (Built-in)', 'Internal Mic',
    'Microphone Array (Realtek(R) Audio)', 'Microphone (Realtek High Definition Audio)',
    'Speakerphone', 'HD Pro Webcam C920',
  ])('built-in: %s', (label) => { expect(kind(label)).toBe('builtin') })

  it.each([
    'AirPods Pro', "Tom's AirPods", 'Headset earpiece', 'Bluetooth Headset', 'EarPods',
    'USB Headset', 'Hands-Free AG Audio',
  ])('headset: %s', (label) => { expect(kind(label)).toBe('headset') })

  it.each([
    'Blue Snowball', 'Yeti Stereo Microphone', 'RØDE NT-USB+', 'Rode PodMic USB',
    'Shure MV7', 'MV88', 'Scarlett 2i2 USB', 'Focusrite USB Audio', 'USB Audio CODEC',
    'Default - Scarlett Solo USB', 'AT2020USB+', 'Elgato Wave:3', 'iRig Mic HD 2',
    'Lightning Microphone', 'DJI Mic 2', 'Zoom H5', 'USB PnP Sound Device',
  ])('external: %s', (label) => { expect(kind(label)).toBe('external') })

  it('no label (before permission) is unknown, and unknown gets the phone setup', () => {
    expect(kind('')).toBe('unknown')
    expect(kind('Microphone')).toBe('unknown')
    expect(setupForMicKind('unknown')).toBe('phone')
  })

  it('a stereo input with an unrecognised name is treated as an interface', () => {
    expect(kind('Some Box 2x2', 2)).toBe('external')
    expect(kind('Some Box 2x2', 1)).toBe('unknown')
    // a built-in label wins over channel count
    expect(kind('MacBook Pro Microphone', 3)).toBe('builtin')
  })

  it('only an external mic turns the DSP off', () => {
    expect(setupForMicKind('external')).toBe('pro')
    expect(setupForMicKind('builtin')).toBe('phone')
    expect(setupForMicKind('headset')).toBe('phone')
  })
})
