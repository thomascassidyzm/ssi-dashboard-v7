// Job #885: the artist's own Re-record all. Proves the button is on the ready
// card only when the voice has takes, confirms in plain words, and posts the
// artist flag to the shared route for THIS link's voice.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('./RecordistRoom.vue', import.meta.url), 'utf8')

describe('RecordistRoom Re-record all', () => {
  it('is offered only for a voice with takes, not a pack, nothing pending', () => {
    expect(src).toMatch(/canRerecordAll = computed\(\(\) =>\s*!voice\.value\.pack && voice\.value\.recorded > 0 && queue\.pendingCount\.value === 0\)/)
    expect(src).toContain('v-if="canRerecordAll"')
  })
  it('confirms in plain words and posts asArtist to the shared route', () => {
    expect(src).toContain('Your current takes are kept; you will record every line again from the top.')
    expect(src).toContain("/rerecord-all`")
    expect(src).toMatch(/confirm: true, asArtist: true/)
  })
  it('clears the queue saved lines after a successful reset, before reloading', () => {
    expect(src).toMatch(/Could not start over[^\n]*\n[^\n]*\n[^\n]*\n\s*queue\.reset\(\)\s*\n\s*await load\(\)/)
  })
})
