import { it, expect, vi } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const audit = require('./voice-audit.cjs')
const rv = require('../../services/shared/resolve-voice.cjs')

it('bumps the course version after a successful pointer write even if the next write throws', async () => {
  const fs = require('node:fs')
  const version = require('../../services/shared/course-version.cjs')
  const edits = require('../../services/shared/content-edit-log.cjs')
  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined)
  vi.spyOn(fs, 'appendFileSync').mockImplementation(() => undefined)
  vi.spyOn(rv, 'loadCourse').mockResolvedValue({ course_code: 'fra_for_eng' })
  vi.spyOn(rv, 'resolveVoice').mockReturnValue({ status: 'voice', voiceId: 'cast' })
  vi.spyOn(rv, 'mayPoint').mockResolvedValue(true)
  const write = vi.spyOn(rv, 'setSlotPointer').mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('write failed'))
  const bump = vi.spyOn(version, 'bumpCourseVersion').mockResolvedValue({ content_version: '1.0.1' })
  vi.spyOn(edits, 'recordContentEdit').mockResolvedValue('event')
  const bad = key => ({ key, aid: 'old', cid: 'old', text: 'Bonjour.', t: 'bonjour', language: 'fra', voice_id: 'cast', origin: 'tts', s3_key: null, duration_ms: 0 })
  // listUnplayable makes eleven reads; return two affected slots only on the first.
  let calls = 0
  const pg = { query: async () => ({ rows: ++calls === 1 ? [bad('a'), bad('b')] : calls <= 11 ? [] : [{ id: 'new' }] }) }
  try {
    await expect(audit.repointUnplayable(pg, {}, 'fra_for_eng', {}, { dryRun: false, maxChars: 0 })).rejects.toThrow('write failed')
    expect(write).toHaveBeenCalledTimes(2)
    expect(bump).toHaveBeenCalledWith({}, 'fra_for_eng', 'patch')
  } finally { vi.restoreAllMocks() }
})
