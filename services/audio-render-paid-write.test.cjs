/**
 * Job #140 (2026-10-27): spa_for_eng renders were PAID FOR and then their course_audio write was cancelled at the
 * statement timeout while it waited for an edit-batch transaction on the same course. The bytes sat in S3 with no row,
 * and every retry paid again. Here: (1) the write-back waits out a lock instead of losing the clip; (2) a clip that
 * still cannot land is written down; (3) adoptS3Key files that object later WITHOUT a provider call.
 * No network, no DB. Run: npx vitest run services/audio-render-paid-write.test.cjs
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const paidWrite = require('./shared/paid-write.cjs')
const { renderClip } = require('./shared/audio-render-entry.cjs')

const KEY = 'mastered/80EAB00F-1287-4A1D-B9CE-47FB627D07DB.mp3'
const TIMEOUT = { code: '57014', message: 'canceling statement due to statement timeout' }

describe('the write-back after a paid render', () => {
  it('waits out a lock held by another transaction instead of losing the clip', async () => {
    let calls = 0
    const attempt = async () => (++calls < 3 ? { data: null, error: TIMEOUT } : { data: { id: 'ROW' }, error: null })
    const out = await paidWrite.writeAfterPaid(attempt, { sleep: async () => {} })
    expect(out.data).toEqual({ id: 'ROW' })
    expect(calls).toBe(3)
  })

  it('does not retry an error a later attempt cannot fix', async () => {
    let calls = 0
    const out = await paidWrite.writeAfterPaid(async () => { calls++; return { error: { code: '23502', message: 'null value in column' } } }, { sleep: async () => {} })
    expect(calls).toBe(1)
    expect(out.error.code).toBe('23502')
  })

  it('gives up after its delays and hands back the last error', async () => {
    let calls = 0
    const out = await paidWrite.writeAfterPaid(async () => { calls++; return { error: TIMEOUT } }, { delaysMs: [1, 1], sleep: async () => {} })
    expect(calls).toBe(3)
    expect(out.error).toBe(TIMEOUT)
  })

  it('writes the unsaved clip down so it can be found by its key', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'paid-')), 'paid-unsaved.jsonl')
    paidWrite.recordPaidUnsaved({ courseCode: 'spa_for_eng', role: 'known', text: 'It is hard to remember', voiceId: 'v', s3Key: KEY, durationMs: 1200 }, { file })
    expect(paidWrite.findPaidUnsaved(KEY, { file })).toMatchObject({ courseCode: 'spa_for_eng', text: 'It is hard to remember', durationMs: 1200 })
    expect(paidWrite.findPaidUnsaved('mastered/other.mp3', { file })).toBeNull()
  })
})

describe('adoptS3Key files a paid-but-unsaved clip and pays nothing', () => {
  const req = (o = {}) => ({ courseCode: 'spa_for_eng', role: 'known', text: 'It is hard to remember', purpose: 'recover', requestedBy: 't', adoptS3Key: KEY, ...o })
  const deps = (over = {}) => {
    const seen = { spoke: 0, adopted: [] }
    return {
      seen,
      deps: {
        resolve: async () => ({ language: 'eng', voiceId: 'cartesia_tom006', provider: 'cartesia', providerConfig: {} }),
        link: async () => null,
        speak: async () => { seen.spoke++; return { audioBuffer: Buffer.alloc(1), charsSpent: 22 } },
        store: async () => ({ audioId: 'NEW', s3Key: 'mastered/NEW.mp3', durationMs: 1 }),
        adopt: async (x) => { seen.adopted.push(x); return x.dryRun ? { s3Key: x.s3Key, durationMs: 1200 } : { audioId: 'ADOPTED', s3Key: x.s3Key, durationMs: 1200 } },
        ...over,
      },
    }
  }

  it('files the existing object as the row: no provider call, no new object', async () => {
    const { deps: d, seen } = deps()
    const out = await renderClip(req(), d)
    expect(seen.spoke).toBe(0)
    expect(out).toMatchObject({ ok: true, source: 'adopted', audioId: 'ADOPTED', s3Key: KEY, charsSpent: 0 })
    expect(seen.adopted[0]).toMatchObject({ courseCode: 'spa_for_eng', role: 'known', voiceId: 'cartesia_tom006', s3Key: KEY })
  })

  it('library first: a clip for these words already in the library is linked and the orphan left alone', async () => {
    const { deps: d, seen } = deps({ link: async () => ({ audioId: 'LIB', s3Key: 'mastered/LIB.mp3' }) })
    const out = await renderClip(req(), d)
    expect(out).toMatchObject({ source: 'library', audioId: 'LIB' })
    expect(seen.adopted).toHaveLength(0)
    expect(seen.spoke).toBe(0)
  })

  it('a dry run says it would adopt and writes nothing', async () => {
    const { deps: d, seen } = deps()
    const out = await renderClip(req({ dryRun: true }), d)
    expect(out).toMatchObject({ source: 'would-adopt', dryRun: true, durationMs: 1200 })
    expect(seen.adopted[0].dryRun).toBe(true)
  })

  it('refuses a key phase8 did not master', async () => {
    const { deps: d } = deps()
    await expect(renderClip(req({ adoptS3Key: 'samples/x.mp3' }), d)).rejects.toMatchObject({ code: 'BAD_ADOPT_KEY' })
  })
})

describe('the one-off adopt exception (r-2026-10-28 deu_at Tamara 732)', () => {
  const ex = require('./shared/adopt-exception-r-2026-10-28-deu-at-tamara-732.json')
  const listed = ex.clips.find(c => c.text === 'nervös')
  const TAMARA = 'elevenlabs_Zq8xdM7UEWBINjdZQdBE'
  const req = (o = {}) => ({ courseCode: 'deu_at_for_eng', role: 'target1', text: listed.text, purpose: 'r-2026-10-28', requestedBy: 't', adoptS3Key: listed.key, voiceId: TAMARA, ...o })
  const deps = (over = {}) => {
    const seen = { adopted: [], linked: 0 }
    return { seen, deps: {
      resolve: async (r) => ({ language: 'deu', voiceId: r.voiceId || 'cartesia_vreni', provider: 'elevenlabs', providerConfig: {} }),
      link: async () => { seen.linked++; return { audioId: 'LIB', s3Key: 'mastered/LIB.mp3' } },
      speak: async () => { throw new Error('no provider call on an adopt') },
      adopt: async (x) => { seen.adopted.push(x); return x.dryRun ? { s3Key: null } : { audioId: 'NEW', s3Key: 'mastered/NEW.mp3', durationMs: 900 } },
      ...over,
    } }
  }

  it('lists exactly 732 trial keys and none of the five Kai excluded', () => {
    expect(ex.clips).toHaveLength(732)
    expect(new Set(ex.clips.map(c => c.key)).size).toBe(732)
    for (const w of ['hoiten', 'mitm', 'rotn', 'gebn', 'gmoant']) expect(ex.clips.some(c => c.text === w)).toBe(false)
    expect(ex.clips.every(c => /^trial\/[0-9A-F-]{36}\.mp3$/.test(c.key))).toBe(true)
  })

  it('adopts a listed key, skipping the library, with the exception handed to phase8 at NATURAL speed (1), never a baked slow-down', async () => {
    const { deps: d, seen } = deps()
    const out = await renderClip(req(), d)
    expect(out).toMatchObject({ ok: true, source: 'adopted', s3Key: 'mastered/NEW.mp3', exception: ex.ruling })
    expect(seen.linked).toBe(0)
    expect(seen.adopted[0].exception).toMatchObject({ speed: 1, courseCode: 'deu_at_for_eng' })
  })

  it('still refuses a trial key that is NOT on the list', async () => {
    const { deps: d } = deps()
    await expect(renderClip(req({ adoptS3Key: 'trial/00000000-0000-0000-0000-000000000000.mp3' }), d)).rejects.toMatchObject({ code: 'BAD_ADOPT_KEY' })
  })

  it('refuses a listed key for another course, other words or another voice', async () => {
    const { deps: d } = deps()
    await expect(renderClip(req({ courseCode: 'deu_for_eng' }), d)).rejects.toMatchObject({ code: 'ADOPT_EXCEPTION_MISMATCH' })
    await expect(renderClip(req({ text: 'reden' }), d)).rejects.toMatchObject({ code: 'ADOPT_EXCEPTION_MISMATCH' })
    await expect(renderClip(req({ voiceId: undefined }), d)).rejects.toMatchObject({ code: 'ADOPT_EXCEPTION_MISMATCH' })
  })
})
