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

  it('lists exactly 737 trial keys: the 732, plus the five Kai first excluded as their variant-D re-tries (#51·AA)', () => {
    expect(ex.clips).toHaveLength(737)
    expect(new Set(ex.clips.map(c => c.key)).size).toBe(737)
    expect(new Set(ex.clips.map(c => c.text)).size).toBe(737)
    // Kai 2026-10-28 18:28Z picked D for these five, and Tom's exception was extended to them — those keys and no others.
    const D = {
      hoiten: 'trial/50EFD790-8C3E-4E5E-82D0-63875B74A701.mp3',
      mitm: 'trial/161B7670-1E9A-4FF3-A403-08ED21C27986.mp3',
      rotn: 'trial/6269683E-C4CE-4B02-A289-F62D0AC3F649.mp3',
      gebn: 'trial/CA46A701-8857-4476-82AC-9C99DC11838B.mp3',
      gmoant: 'trial/7FA2127E-AA7D-4FD9-B989-D136FFE46FBB.mp3',
    }
    for (const [w, key] of Object.entries(D)) expect(ex.clips.filter(c => c.text === w).map(c => c.key)).toEqual([key])
    expect(ex.clips.every(c => /^trial\/[0-9A-F-]{36}\.mp3$/.test(c.key))).toBe(true)
  })

  it('adopts a variant-D key for its own course word (the IPA it was rendered from is not the slot text)', async () => {
    const { deps: d, seen } = deps()
    const D = ex.clips.find(c => c.text === 'hoiten')
    const out = await renderClip(req({ text: 'hoiten', adoptS3Key: D.key }), d)
    expect(out).toMatchObject({ ok: true, source: 'adopted' })
    expect(seen.adopted[0].exception).toMatchObject({ speed: 1 })
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

describe('phase8 writePaidClipRow is versioned (job #74·AA)', () => {
  // A write that lands on an EXISTING clip identity (a re-adopt, a render over a held row) must move audio_revision, or a
  // learner who already played the clip keeps the old bytes: the app addresses it as <uuid>.v<rev> under an immutable HTTP
  // cache and an IndexedDB AudioCache keyed on that ref. #63·AA's re-adopt of the 732 Tamara clips was an unversioned upsert.
  const fs = require('fs'), path = require('path')
  const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
  const start = src.indexOf('async function writePaidClipRow(')
  const body = src.slice(start, src.indexOf('\n}\n', start))

  it('goes through writeOrSwapClip (insert, or swapClipInPlace with revision + 1) and never upserts course_audio', () => {
    expect(start).toBeGreaterThan(0)
    expect(body).toContain('writeOrSwapClip(')
    expect(body).not.toMatch(/\.upsert\(/)
    expect(body).toMatch(/revision: row\.revision/)   // the caller can see the swap landed
  })
})
