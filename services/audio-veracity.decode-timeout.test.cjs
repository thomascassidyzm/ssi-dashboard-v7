/**
 * A WHISPER THAT NEVER ANSWERS MUST NOT FREEZE THE BOOTH (2026-10-15, live).
 *
 * Every booth upload awaits checkAudioVeracity, which holds an in-process slot
 * around a whisper-cli subprocess. On 14 Oct Popty moved to the `popty` user and
 * the whisper wrapper's semaphore dir (/tmp/whisper-sem, made by tomcassidy) was
 * not writable by it, so the wrapper polled for a slot forever. With no timeout
 * the upload never answered, the slot was never released, and from 15:39 UTC no
 * take on production was filed at all — 242 of Aran's sat on his Chromebook.
 *
 * The decode now has a ceiling. Past it the check says "not checked" (never a
 * pass) and the upload goes on to save the take, as it does for any other
 * unchecked verdict.
 */
import { describe, it, expect } from 'vitest'

const fs = require('fs')
const os = require('os')
const path = require('path')

describe('decode timeout', () => {
  it('a whisper that hangs returns unchecked within the ceiling, and frees its slot', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veracity-hang-'))
    const hang = path.join(dir, 'whisper-hang.sh')
    fs.writeFileSync(hang, '#!/bin/sh\nexec sleep 30\n', { mode: 0o755 })
    const model = path.join(dir, 'model.bin')
    fs.writeFileSync(model, '')
    const saved = { ...process.env }
    Object.assign(process.env, {
      WHISPER: hang, WHISPER_MODEL: model, FFMPEG: '/bin/true',
      AUDIO_VERACITY_DECODE_TIMEOUT_MS: '400', AUDIO_VERACITY_CONCURRENCY: '1',
      AUDIO_VERACITY_GATE: 'on',
    })
    const modPath = require.resolve('./audio-veracity.cjs')
    delete require.cache[modPath]
    try {
      const V = require('./audio-veracity.cjs')
      const t0 = Date.now()
      const a = await V.checkAudioVeracity(Buffer.from('x'), 'hello world', 'eng')
      // The single slot must have been released, or this second call never returns.
      const b = await V.checkAudioVeracity(Buffer.from('x'), 'hello world', 'eng')
      expect(Date.now() - t0).toBeLessThan(5000)
      for (const v of [a, b]) {
        expect(v.checked).toBe(false)
        expect(v.pass).toBe(null)
        expect(v.reason).toBe('unchecked_decode_error')
      }
    } finally {
      process.env = saved
      delete require.cache[modPath]
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }, 8000)
})
