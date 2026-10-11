import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const req = createRequire(import.meta.url)
const { PASSES } = req('./charlotte-backfill.cjs')

// #278: the tom-clone pass renders Charlotte with the male guard off, so it must only ever select the known role.
describe('tom-clone-to-charlotte', () => {
  it('is pinned to the known role (the runner uses [pass.role] over --roles)', () => {
    const pass = PASSES['tom-clone-to-charlotte']
    expect(pass.role).toBe('known')
    for (const flag of [undefined, 'target2', 'presentation', 'target2,presentation']) {
      const roles = pass.role ? [pass.role] : (flag ?? 'known,presentation').split(',') // mirrors the runner's line
      expect(roles).toEqual(['known'])
    }
  })
})
