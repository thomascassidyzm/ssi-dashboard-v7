// Every provider door phase8 builds must be voice-bound (Tom, 2026-10-31): a slot is a voice, so no door may answer it with another
// voice's clip of the same words. Pre-fix, the intro-regenerate door and the ReuseFirst render door omitted voiceBound.
import { describe, it, expect } from 'vitest'
const fs = require('fs'), path = require('path')
const src = fs.readFileSync(path.join(__dirname, 'phase8-audio-v13.cjs'), 'utf8')
describe('phase8 doors are voice-bound', () => {
  it('every `door: {...}` literal passed to the tts service carries voiceBound: true', () => {
    const bad = src.split('\n').map((l, i) => [l, i + 1]).filter(([l]) => /\bdoor: \{ courseCode/.test(l) && !/voiceBound: true/.test(l)).map(([l, n]) => `${n}: ${l.trim()}`)
    expect(bad).toEqual([])
  })
})
