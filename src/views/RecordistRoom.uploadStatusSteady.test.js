import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

// Job #340: the upload-status line is always rendered with a fixed height, so uploads catching up
// never makes the page jump.
const src = readFileSync(fileURLToPath(new URL('./RecordistRoom.vue', import.meta.url)), 'utf8')

describe('booth upload status line stays put', () => {
  it('is never conditionally rendered and says the all-uploaded words', () => {
    expect(src).toMatch(/<div class="safety-banner"/)
    expect(src).not.toMatch(/v-if="safetyBanner"/)
    expect(src).toContain('All takes uploaded, brilliant work!')
  })
  it('reserves a fixed height', () => {
    expect(src).toMatch(/\.safety-banner \{ height: 5rem;/)
  })
})
