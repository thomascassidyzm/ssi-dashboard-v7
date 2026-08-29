/**
 * THE VOICE LAB MUST OFFER THE ESTATE'S OWN CLONES FOR ENGLISH.
 *
 * Tom, 2026-08-29: "I can't see MY own Cartesia clone voice in the list of
 * available voices for English." He was right, and the cause was arithmetic
 * rather than policy: Cartesia publishes 419 English voices in an order nobody
 * here chose, his clone came back at position 210 of them, and the Languages
 * registry caps a language's candidate list at 80. Every other language has
 * fewer voices than the cap, which is why English alone was broken.
 *
 * These tests are pure — no key, no network, no database. They pin the two
 * facts that made the omission possible: the play picker names the clone
 * itself, and the registry sorts voices this estate OWNS ahead of the cap.
 *
 * Run: npx vitest run services/voicelab/voices-eng.test.js
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const params = require_('./params.cjs')
const registry = require_('./registry.cjs')

const ENGLISH = params.LANGUAGES.find((l) => l.code === 'eng')

/** Cartesia's English shelf, with the two owned clones where they really sit. */
function catalogueLikeCartesia () {
  const en = []
  for (let i = 0; i < 419; i += 1) en.push({ id: `stock-${i}`, name: `Stock ${i}`, gender: 'm', owner: false })
  en.splice(209, 0, { id: '33890587-a29f-4416-ba61-2615c74f92fe', name: 'aran_english_003', gender: 'm', owner: true })
  en.splice(210, 0, { id: params.TOM_CLONE.id, name: 'tom_001', gender: 'm', owner: true })
  return { en }
}

describe('the English voice list — the play picker', () => {
  it("names Tom's Cartesia clone, and names it first", () => {
    const voices = params.voicesFor(ENGLISH, {})
    expect(voices[0].id).toBe(params.TOM_CLONE.id)
    expect(voices[0].group).toBe('Clone')
  })

  it('offers it for English only — the standing ruling, not an accident of this test', () => {
    for (const lang of params.LANGUAGES.filter((l) => l.code !== 'eng')) {
      expect(params.voicesFor(lang, {}).some((v) => v.id === params.TOM_CLONE.id)).toBe(false)
    }
  })
})

describe('the English voice list — the per-language registry', () => {
  it("offers Tom's clone even though Cartesia returns it past the 80-candidate cap", () => {
    const candidates = registry.cartesiaCandidates('eng', catalogueLikeCartesia(), []).slice(0, 80)
    expect(candidates.some((c) => c.voiceId === `cartesia_${params.TOM_CLONE.id}`)).toBe(true)
  })

  it("offers the estate's other clone too — the same omission hid both", () => {
    const candidates = registry.cartesiaCandidates('eng', catalogueLikeCartesia(), []).slice(0, 80)
    expect(candidates.some((c) => c.voiceId === 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe')).toBe(true)
  })

  it('puts every owned voice ahead of every stock voice, so the cap can never reach them', () => {
    const candidates = registry.cartesiaCandidates('eng', catalogueLikeCartesia(), [])
    const lastOwned = candidates.map((c) => c.owned).lastIndexOf(true)
    const firstStock = candidates.findIndex((c) => !c.owned)
    expect(lastOwned).toBeLessThan(firstStock)
  })

  it('offers an owned clone for the guide slot, which carried no Cartesia voices at all', () => {
    const guide = registry.guideCandidates({
      code: 'eng', voices: [], guideRoles: [], voiceById: new Map(), inUse: [], catalogue: catalogueLikeCartesia(),
    })
    expect(guide.some((c) => c.voiceId === `cartesia_${params.TOM_CLONE.id}`)).toBe(true)
  })

  it('does NOT pour the whole stock catalogue into the guide list', () => {
    const guide = registry.guideCandidates({
      code: 'eng', voices: [], guideRoles: [], voiceById: new Map(), inUse: [], catalogue: catalogueLikeCartesia(),
    })
    expect(guide.every((c) => !/^cartesia_stock-/.test(c.voiceId))).toBe(true)
  })
})
