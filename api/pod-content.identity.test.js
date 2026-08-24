/**
 * The pod-explainer store's identity, read side.
 *
 * api/pod-content.js spells the canonical language and voice as LITERALS rather
 * than calling clip-identity.cjs, because .vercelignore excludes tools/ from the
 * deployed function bundle and the language service loads its reference CSV from
 * there. This test is what stops those literals drifting from the library: it
 * runs in node, where the CSV is present.
 *
 * It also pins the temporary pre-canonical members. The writers
 * (tools/build-shared-known-store.cjs, tools/persist-stage0-pod0.cjs) now emit
 * the canonical spelling, but every row written before them carries the old
 * one. Dropping the old members before the approved back-fill has run silences
 * every pod explainer.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { canonicalLanguage, canonicalVoiceId } = require('../services/shared/clip-identity.cjs')

const src = readFileSync(new URL('./pod-content.js', import.meta.url), 'utf8')

/** The array literal assigned to `name`, parsed out of the source. */
function constArray(name) {
  const m = new RegExp(`const ${name} = (\\[[^\\]]*\\])`).exec(src)
  if (!m) throw new Error(`${name} not found in api/pod-content.js`)
  return JSON.parse(m[1].replace(/'/g, '"'))
}

describe('api/pod-content.js identity literals', () => {
  const voiceIds = constArray('EXPLAINER_VOICE_IDS')
  const languages = constArray('SHARED_KNOWN_LANGS')

  it('leads with the canonical voice the writers emit', () => {
    expect(voiceIds[0]).toBe(canonicalVoiceId('comp:leo'))
  })

  it('leads with the canonical language the shared store is written under', () => {
    expect(languages[0]).toBe(canonicalLanguage('en'))
  })

  it('still accepts the pre-canonical spelling until the back-fill runs', () => {
    expect(voiceIds).toContain('comp:leo')
    expect(languages).toContain('en')
  })

  it('reads both spellings — no .eq() left on either column', () => {
    expect(src).not.toMatch(/\.eq\('voice_id', 'comp:/)
    expect(src).not.toMatch(/\.eq\('language', '(en|eng)'\)/)
    expect(src).toMatch(/\.in\('voice_id', EXPLAINER_VOICE_IDS\)/)
    expect(src).toMatch(/\.in\('language', SHARED_KNOWN_LANGS\)/)
  })
})

describe('the writers this read is coupled to', () => {
  it('build-shared-known-store writes exactly what pod-content leads with', () => {
    const writer = readFileSync(new URL('../tools/build-shared-known-store.cjs', import.meta.url), 'utf8')
    expect(writer).toMatch(/const SHARED_LANG = canonicalLanguage\('en'\)/)
    expect(writer).toMatch(/const VOICE_ID = canonicalVoiceId\('comp:leo'\)/)
  })

  it('persist-stage0-pod0 writes the same composite voice', () => {
    const writer = readFileSync(new URL('../tools/persist-stage0-pod0.cjs', import.meta.url), 'utf8')
    expect(writer).toMatch(/const VOICE_ID = canonicalVoiceId\('comp:leo'\)/)
    expect(writer).toMatch(/const LANGUAGE = canonicalLanguage\(META\.language\)/)
  })
})
