import { describe, it, expect } from 'vitest'
const {
  AUDIO_CACHE_CONTROL, isAudioContentType, cacheControlFor, withAudioCacheControl,
} = require('./audio-cache-control.cjs')

describe('audio cache control', () => {
  it('is the immutable year-long policy', () => {
    expect(AUDIO_CACHE_CONTROL).toBe('public, max-age=31536000, immutable')
  })

  it('recognises audio content types, case and whitespace tolerant', () => {
    expect(isAudioContentType('audio/mpeg')).toBe(true)
    expect(isAudioContentType('Audio/MPEG')).toBe(true)
    expect(isAudioContentType(' audio/wav')).toBe(true)
    expect(isAudioContentType('audio/mp4')).toBe(true)
  })

  it('refuses everything that is not audio', () => {
    for (const ct of ['application/json', 'application/x-ndjson', 'text/plain',
      'application/octet-stream', undefined, null, '', 123]) {
      expect(isAudioContentType(ct)).toBe(false)
      expect(cacheControlFor(ct)).toBeUndefined()
    }
  })

  it('gives the policy for audio', () => {
    expect(cacheControlFor('audio/mpeg')).toBe(AUDIO_CACHE_CONTROL)
  })

  it('adds CacheControl to audio put params', () => {
    const params = withAudioCacheControl({ Bucket: 'b', Key: 'mastered/X.mp3', ContentType: 'audio/mpeg' })
    expect(params.CacheControl).toBe(AUDIO_CACHE_CONTROL)
    expect(params.Key).toBe('mastered/X.mp3')
  })

  it('leaves JSON params untouched — manifests must stay revalidatable', () => {
    const original = { Bucket: 'b', Key: 'manifest.json', ContentType: 'application/json' }
    expect(withAudioCacheControl(original)).toEqual(original)
    expect(withAudioCacheControl(original).CacheControl).toBeUndefined()
  })

  it('never overrides an explicit CacheControl', () => {
    const params = withAudioCacheControl({ ContentType: 'audio/mpeg', CacheControl: 'no-store' })
    expect(params.CacheControl).toBe('no-store')
  })
})
