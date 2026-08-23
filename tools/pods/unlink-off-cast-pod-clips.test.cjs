/**
 * Guard tests for unlink-off-cast-pod-clips.cjs.
 *
 * The slug allowlist is the lock that keeps this tool off live pods, and it was
 * widened on 2026-08-23 to reach the Group 1 staged clones. Widening a safety
 * guard is how holes appear, so the allowed and refused sets are pinned here.
 * The `held` visibility check is the second lock and is asserted in the tool
 * against the live DB; this file covers what can be decided from a pod id alone.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const {
  podSlugAllowed, STAGING_SLUGS, TRACKS, norm, canonicalSpeaker, expectedVoiceFor,
} = require_('./unlink-off-cast-pod-clips.cjs')

describe('podSlugAllowed', () => {
  it('allows the *-unrecorded staging pods', () => {
    expect(podSlugAllowed('spa_for_eng:pod-0-unrecorded')).toBe(true)
    expect(podSlugAllowed('tha_for_eng:pod-0-unrecorded')).toBe(true)
  })

  it('allows the literal 2026-08-23 staged clone slug', () => {
    expect(podSlugAllowed('fra_for_eng:pod-1-staged-2026-08-23')).toBe(true)
    expect(STAGING_SLUGS).toEqual(['pod-1-staged-2026-08-23'])
  })

  it('refuses live pods', () => {
    expect(podSlugAllowed('spa_for_eng:pod-0')).toBe(false)
    expect(podSlugAllowed('fra_for_eng:pod-1')).toBe(false)
    expect(podSlugAllowed('fra_for_eng:pod-2')).toBe(false)
  })

  it('refuses a slug that merely looks staged', () => {
    expect(podSlugAllowed('fra_for_eng:pod-1-staged-2026-08-24')).toBe(false)
    expect(podSlugAllowed('fra_for_eng:pod-0-unrecorded-live')).toBe(false)
    expect(podSlugAllowed('fra_for_eng:unrecorded')).toBe(false)
  })

  it('refuses empty and malformed ids', () => {
    expect(podSlugAllowed('')).toBe(false)
    expect(podSlugAllowed(null)).toBe(false)
    expect(podSlugAllowed('pod-0-unrecorded')).toBe(false) // no course prefix
  })
})

describe('tracks', () => {
  it('maps each track to its own link column and cast side', () => {
    expect(TRACKS.target.link).toBe('target_audio_id')
    expect(TRACKS.known.link).toBe('known_audio_id')
    expect(TRACKS.target.castOf({ target: { voice_id: 'a' }, known: { voice_id: 'b' } })).toBe('a')
    expect(TRACKS.known.castOf({ target: { voice_id: 'a' }, known: { voice_id: 'b' } })).toBe('b')
  })

  it('survives a speaker entry missing the track', () => {
    expect(TRACKS.known.castOf({ target: { voice_id: 'a' } })).toBeUndefined()
    expect(TRACKS.known.castOf(null)).toBeFalsy()
  })
})

describe('expectedVoiceFor — per-speaker, not set membership', () => {
  // The shape that made fra_for_eng read 231/231 "on-cast" while a third of the
  // pod was on the wrong character: both voices ARE in the cast set.
  const speakers = {
    Sarah: { known: { voice_id: 'xai_bedd6226' }, target: { voice_id: '69smp8rm' } },
    Barista: { known: { voice_id: 'gfzdpspr5fdp' }, target: { voice_id: '0p0rt7o1' } },
    _default: { known: { voice_id: 'fallback' }, target: { voice_id: 'fallbackT' } },
  }

  it('resolves the speaker\'s OWN cast voice per track', () => {
    expect(expectedVoiceFor(speakers, 'Sarah', 'known')).toBe('bedd6226')
    expect(expectedVoiceFor(speakers, 'Barista', 'known')).toBe('gfzdpspr5fdp')
    expect(expectedVoiceFor(speakers, 'Sarah', 'target')).toBe('69smp8rm')
  })

  it('treats a time-of-day label as the same character', () => {
    expect(expectedVoiceFor(speakers, 'Barista (3 pm)', 'known')).toBe('gfzdpspr5fdp')
    expect(expectedVoiceFor(speakers, 'Sarah (8 am)', 'target')).toBe('69smp8rm')
  })

  it('catches a swap the cast-set check cannot see', () => {
    // Barista's clip rendered in Sarah's voice: in the cast set, wrong character.
    const clipVoice = norm('xai_bedd6226')
    expect(TRACKS.known.castOf(speakers.Barista)).toBeTruthy()
    expect(clipVoice).not.toBe(expectedVoiceFor(speakers, 'Barista', 'known'))
  })

  it('falls back to _default, then reports null when nothing is cast', () => {
    expect(expectedVoiceFor(speakers, 'Nobody', 'known')).toBe('fallback')
    expect(expectedVoiceFor({ Sarah: { target: { voice_id: 'x' } } }, 'Sarah', 'known')).toBeNull()
    expect(expectedVoiceFor({}, 'Sarah', 'known')).toBeNull()
  })

  it('refuses an unknown track rather than guessing', () => {
    expect(() => expectedVoiceFor(speakers, 'Sarah', 'explainer')).toThrow(/unknown track/)
  })
})

describe('canonicalSpeaker', () => {
  it('strips parenthetical suffixes and collapses whitespace', () => {
    expect(canonicalSpeaker('Barista (3 pm)')).toBe('Barista')
    expect(canonicalSpeaker('Susjed (08:00) (M)')).toBe('Susjed')
    expect(canonicalSpeaker('Neighbour (10:30 pm)')).toBe('Neighbour')
    expect(canonicalSpeaker('Bar Customer 1')).toBe('Bar Customer 1')
    expect(canonicalSpeaker(null)).toBe('')
  })
})

describe('norm', () => {
  it('treats a provider-prefixed id and a bare id as one voice', () => {
    expect(norm('xai_eve')).toBe('eve')
    expect(norm('eve')).toBe('eve')
    expect(norm('azure_es-ES-ElviraNeural')).toBe('es-ES-ElviraNeural')
  })
})
