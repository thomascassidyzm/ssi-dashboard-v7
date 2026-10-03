/**
 * iPhone Safari audition (Tom, 2026-10-03): audio.play() after an await rejects
 * with NotAllowedError, and that message used to land in the panel-level `error`,
 * which replaced the whole language table. The element is unlocked synchronously
 * in the tap, and a play failure stays on its own row.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (f) => readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), 'utf8')

for (const f of ['CastingPanel.vue', 'LanguagesPanel.vue']) {
  describe(f, () => {
    const src = read(f)
    it('unlocks the audio element before the first await in play', () => {
      const body = src.slice(src.indexOf('async function play ') > -1 ? src.indexOf('async function play ') : src.indexOf('async function startAudio'))
      const fn = src.includes('async function startAudio') ? src.slice(src.indexOf('async function startAudio')) : body
      expect(fn.indexOf('unlockedAudio()')).toBeGreaterThan(-1)
      expect(fn.indexOf('unlockedAudio()')).toBeLessThan(fn.indexOf('await clipUrl'))
    })
    it('never feeds a play rejection into the panel-level error', () => {
      expect(src).not.toMatch(/\.play\(\)\.catch\(\(e\) => \{[^}]*error\.value/)
      expect(src).not.toMatch(/onerror = \(\) => \{[^}]*[^a-zA-Z]error\.value/)
    })
  })
}

describe('CastingPanel.vue table', () => {
  it('is not replaced by an error message', () => {
    expect(read('CastingPanel.vue')).not.toMatch(/v-else-if="loading"/)
  })
})
