/**
 * Job #483: a presentation render (a) resolves to the KNOWN language without the caller naming one
 * (so the cast gate sees eng, not the target) and (b) binds course_legos.presentation_audio_id itself.
 * target1/target2 stay target-language. No network, no DB. Run: npx vitest run services/audio-render-presentation.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { renderClip, roleNativeLanguage } = require('./shared/audio-render-entry.cjs')

const course = { known_lang: 'eng', target_lang: 'ita' }
const req = (o = {}) => ({ courseCode: 'ita_for_eng', role: 'presentation', text: 'now you say', purpose: 'p', requestedBy: 't', legoId: 'S0001L01', ...o })

function deps(over = {}) {
  const links = []
  return {
    links,
    deps: {
      resolve: async () => ({ language: 'eng', voiceId: 'v', provider: 'cartesia', providerConfig: {} }),
      link: async () => null,
      speak: async () => ({ audioBuffer: Buffer.alloc(1), wordBoundaries: null, charsSpent: 5 }),
      store: async () => ({ audioId: 'A1', s3Key: 'k', durationMs: 1 }),
      linkLego: async (x) => { links.push(x); return { linked: true } },
      ...over,
    },
  }
}

describe('presentation role is known-language', () => {
  it('presentation and known resolve to the known side; target roles stay target', () => {
    expect(roleNativeLanguage('presentation', course)).toBe('eng')
    expect(roleNativeLanguage('known', course)).toBe('eng')
    expect(roleNativeLanguage('target1', course)).toBe('ita')
    expect(roleNativeLanguage('target2', course)).toBe('ita')
  })
})

describe('presentation render binds its LEGO', () => {
  it('a rendered clip is linked to that course + lego only', async () => {
    const { deps: d, links } = deps()
    const out = await renderClip(req(), d)
    expect(links).toEqual([{ courseCode: 'ita_for_eng', legoId: 'S0001L01', audioId: 'A1' }])
    expect(out.legoLinked).toBe(true)
  })
  it('a library hit is linked too', async () => {
    const { deps: d, links } = deps({ link: async () => ({ audioId: 'LIB', s3Key: 'k' }) })
    await renderClip(req(), d)
    expect(links[0].audioId).toBe('LIB')
  })
  it('a dry run writes nothing; other roles and a missing legoId are not linked', async () => {
    for (const r of [req({ dryRun: true }), req({ role: 'known' }), req({ legoId: undefined })]) {
      const { deps: d, links } = deps()
      await renderClip(r, d)
      expect(links).toEqual([])
    }
  })
})
