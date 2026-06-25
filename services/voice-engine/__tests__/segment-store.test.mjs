import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import store from '../segment-store.cjs'
import { createLocalStorage } from '../storage.cjs'

const COURSE = 'mkd_for_fra'
const VOICE = 'human_marija_mkd'

describe('key minting — identity is NEVER filename-derived', () => {
  it('mints segments/{courseCode}/{voiceId}/{UUID}.mp3', () => {
    const id = store.mintSegmentId()
    expect(id).toMatch(store.UUID_RE)
    const key = store.segmentAudioKey(COURSE, VOICE, id)
    expect(key).toBe(`segments/${COURSE}/${VOICE}/${id}.mp3`)
  })

  it('keys for Cyrillic chunk text contain NO text at all — only the UUID', () => {
    const entry = store.makeSegmentEntry({
      courseCode: COURSE, voiceId: VOICE,
      text: 'да зборувам', cadence: 'natural',
    })
    // The Cyrillic lives in manifest data; the S3 key is pure ASCII UUID.
    expect(entry.s3Key).toMatch(new RegExp(`^segments/${COURSE}/${VOICE}/[0-9A-F-]{36}\\.mp3$`))
    expect(entry.s3Key).not.toContain('да')
    expect(entry.text).toBe('да зборувам')
    expect(entry.textKey).toBe('да зборувам')
  })

  it('two segments with identical text get DIFFERENT keys (no collisions)', () => {
    const a = store.makeSegmentEntry({ courseCode: COURSE, voiceId: VOICE, text: 'сакам', cadence: 'natural' })
    const b = store.makeSegmentEntry({ courseCode: COURSE, voiceId: VOICE, text: 'сакам', cadence: 'slow' })
    expect(a.s3Key).not.toBe(b.s3Key)
  })

  it('rejects unsafe identifiers and non-UUID segment ids', () => {
    expect(() => store.segmentAudioKey('a/b', VOICE, store.mintSegmentId())).toThrow()
    expect(() => store.segmentAudioKey(COURSE, 'voice id with spaces', store.mintSegmentId())).toThrow()
    expect(() => store.segmentAudioKey(COURSE, VOICE, 'script-0')).toThrow()
  })
})

describe('manifest round-trip + resume semantics', () => {
  it('persists and reloads via the storage adapter (local files, no S3)', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 've-store-test-'))
    const storage = createLocalStorage(root)

    const manifest = await store.loadManifest(storage, COURSE, VOICE)
    expect(manifest.segments).toEqual([])

    const entry = store.makeSegmentEntry({
      courseCode: COURSE, voiceId: VOICE, text: 'јас сакам', cadence: 'natural',
      durationMs: 480, startMs: 100, endMs: 580, method: 'transferred',
      takeProvenanceId: 'prov-1', takeS3Key: 'recordings/x.mp3',
    })
    store.upsertSegmentEntry(manifest, entry)
    store.recordSpliced(manifest, { text: 'јас сакам да зборувам', audioId: 'AUD-1', s3Key: 'mastered/AUD-1.mp3' })
    store.recordAlignmentFailure(manifest, { phraseText: 'болен сум', reason: 'chunk-count mismatch', expectedCount: 3, detectedCount: 2 })
    await store.saveManifest(storage, manifest)

    const reloaded = await store.loadManifest(storage, COURSE, VOICE)
    expect(reloaded.segments).toHaveLength(1)
    expect(reloaded.segments[0]).toMatchObject({ text: 'јас сакам', cadence: 'natural', durationMs: 480 })
    expect(reloaded.spliced).toHaveLength(1)
    expect(reloaded.alignmentFailures[0].reason).toMatch(/mismatch/)
    expect(reloaded.updatedAt).toBeTruthy()
  })

  it('upsert is resume-safe: existing (textKey, cadence) wins, no duplicates', () => {
    const manifest = store.emptyManifest(COURSE, VOICE)
    const first = store.makeSegmentEntry({ courseCode: COURSE, voiceId: VOICE, text: 'Сакам', cadence: 'natural' })
    const dupe = store.makeSegmentEntry({ courseCode: COURSE, voiceId: VOICE, text: 'сакам!', cadence: 'natural' })
    expect(store.upsertSegmentEntry(manifest, first).added).toBe(true)
    const second = store.upsertSegmentEntry(manifest, dupe)
    expect(second.added).toBe(false)
    expect(second.entry.id).toBe(first.id) // the live entry is the original
    expect(manifest.segments).toHaveLength(1)
  })

  it('spliced ledger dedupes by textKey', () => {
    const manifest = store.emptyManifest(COURSE, VOICE)
    store.recordSpliced(manifest, { text: 'сакам кафе', audioId: 'A', s3Key: 'mastered/A.mp3' })
    store.recordSpliced(manifest, { text: 'сакам кафе', audioId: 'B', s3Key: 'mastered/B.mp3' })
    expect(manifest.spliced).toHaveLength(1)
  })

  it('index lookups go by (textKey, cadence)', () => {
    const manifest = store.emptyManifest(COURSE, VOICE)
    const e = store.makeSegmentEntry({ courseCode: COURSE, voiceId: VOICE, text: 'Да Зборувам', cadence: 'slow' })
    store.upsertSegmentEntry(manifest, e)
    const idx = store.segmentIndex(manifest)
    expect(idx.get('да зборувам|slow')).toBe(e)
    expect(idx.get('да зборувам|natural')).toBeUndefined()
  })
})
