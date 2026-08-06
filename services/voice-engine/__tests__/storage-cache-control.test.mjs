import { describe, it, expect } from 'vitest'
import { createS3Storage } from '../storage.cjs'
import { AUDIO_CACHE_CONTROL } from '../../shared/audio-cache-control.cjs'

/** Captures the PutObjectCommand input instead of talking to S3. */
function fakeClient(sent) {
  return { async send(cmd) { sent.push(cmd.input); return {} } }
}

describe('S3 storage — cache headers on upload', () => {
  it('puts audio immutable: the key is minted fresh per clip, so bytes never change', async () => {
    const sent = []
    const storage = createS3Storage({ bucket: 'ssi-audio-stage', client: fakeClient(sent) })
    await storage.putObject('segments/mkd_for_fra/human_marija_mkd/ABC.mp3', Buffer.from('x'), 'audio/mpeg')

    expect(sent).toHaveLength(1)
    expect(sent[0].CacheControl).toBe(AUDIO_CACHE_CONTROL)
    expect(sent[0].ContentType).toBe('audio/mpeg')
  })

  it('leaves the segment manifest uncached — it is rewritten at a stable key', async () => {
    const sent = []
    const storage = createS3Storage({ bucket: 'ssi-audio-stage', client: fakeClient(sent) })
    await storage.putJson('segments/mkd_for_fra/human_marija_mkd/manifest.json', { segments: [] })

    expect(sent).toHaveLength(1)
    expect(sent[0].ContentType).toBe('application/json')
    expect(sent[0].CacheControl).toBeUndefined()
  })
})
