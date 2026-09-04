/**
 * EVERY CONSENT PANEL IS GATED. A regression test for the loop Tom hit on the
 * night of 2026-09-03: he recorded consent for his own Cartesia clone three
 * times and the "Consent needed" panel was still on screen afterwards, beside a
 * green "authorised" badge.
 *
 * Nothing was wrong with consent. Commit ea039e028 swapped VoiceConsent for
 * ConsentStep in the two CAST-SLOT sites of LanguagesPanel.vue, carried the
 * props across, and dropped
 *
 *     v-if="consentFor === slot.voiceId && consentIn === slotKey(lang, slot)"
 *
 * so the panel drew itself under every filled slot unconditionally and no
 * action of any kind could close it. The condition now lives in ONE function,
 * consentOpen(), and this test is what stops a fifth copy of it going missing:
 * it reads the file and insists every ConsentStep tag is gated by that
 * function. A `v-if` written out by hand fails here on purpose.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const PANEL = fileURLToPath(new URL('./LanguagesPanel.vue', import.meta.url))

describe('LanguagesPanel consent panel', () => {
  const src = readFileSync(PANEL, 'utf8')

  it('draws a ConsentStep only when consentOpen() says so', () => {
    const tags = src.split('<ConsentStep').slice(1)
    expect(tags.length).toBeGreaterThan(0)
    for (const tag of tags) {
      const attrs = tag.split('/>')[0]
      expect(attrs).toMatch(/v-if="consentOpen\(/)
    }
  })

  it('has exactly one place that decides whether the panel is open', () => {
    expect(src.match(/function consentOpen \(/g) || []).toHaveLength(1)
    // No hand-written copy of the condition may creep back alongside it.
    expect(src).not.toMatch(/v-if="consentFor === /)
  })

  it('clears both halves of the open state when it closes', () => {
    const close = src.slice(src.indexOf('function closeConsent ('))
    expect(close).toMatch(/consentFor\.value = null/)
    expect(close).toMatch(/consentIn\.value = ''/)
  })
})
