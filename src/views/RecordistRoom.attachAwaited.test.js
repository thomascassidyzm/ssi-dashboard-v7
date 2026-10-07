// Review #857: the ready card must not show before the on-device queue has loaded,
// or Submit can run ahead of an unsent take.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('./RecordistRoom.vue', import.meta.url), 'utf8')

describe('load() awaits the queue before the ready phase', () => {
  it('awaits queue.attach, and does so before phase = ready', () => {
    const at = src.indexOf('await queue.attach(props.voiceId)')
    expect(at).toBeGreaterThan(-1)
    expect(src.indexOf("phase.value = 'ready'", at)).toBeGreaterThan(at)
    expect(src).not.toMatch(/^\s*queue\.attach\(props\.voiceId\)/m)
  })
})
