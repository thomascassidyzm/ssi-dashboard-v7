import { it, expect } from 'vitest'
const { ingestCut } = require('./ingest-cut.cjs')

// P1 #9: libraryClip reused a clip the tail audit had marked veracity_pass=false.
const SRC = '11111111-1111-4111-8111-111111111111'
function run(held) {
  const tables = {
    course_seeds: [{ id: 's1', course_code: 'zho_for_eng', seed_number: 1, target_text: '我想', target1_audio_id: null }],
    course_audio: [{ id: SRC, course_code: 'zho_for_eng', text: '我想说中文', text_normalized: '我想说中文', language: 'zho', role: 'target1', voice_id: 'cast', s3_key: 'source.mp3' }, held],
  }
  const db = { from(table) {
    let rows = tables[table]
    const q = {
      select() { return q },
      eq(k, v) { rows = rows.filter(r => r[k] === v); return q },
      not(k, op, v) { rows = rows.filter(r => !String(r[k]).startsWith(v.replace(/%$/, ''))); return q },
      or(expr) { // only the one expression the code uses
        expect(expr).toBe('veracity_pass.is.null,veracity_pass.eq.true')
        rows = rows.filter(r => r.veracity_pass == null || r.veracity_pass === true); return q
      },
      maybeSingle: async () => ({ data: rows[0] || null, error: null }),
    }
    return q
  } }
  return ingestCut({ courseCode: 'zho_for_eng', seedNumber: 1, role: 'target1', text: '我想', sourceAudioId: SRC, startSec: 0, endSec: 0.8, charStart: 0, charEnd: 2, requestedBy: 'test', dryRun: true }, {
    db, fetchServed: async () => Buffer.from('whole'),
    cut: async () => ({ bytes: Buffer.from('cut'), durationSec: 0.8, sourceDurationSec: 2 }),
    decode: async () => new Float32Array(1), hashVerdict: () => ({ ok: true }), tailAudit: async () => ({ click: false }),
  })
}
const clip = (extra) => ({ id: '22222222-2222-4222-8222-222222222222', course_code: 'zho_for_eng', text: '我想', text_normalized: '我想', language: 'zho', role: 'target1', voice_id: 'cast', s3_key: 'x.mp3', ...extra })

it('a veracity_pass=false clip is not reused; the cut proceeds', async () => {
  expect(await run(clip({ veracity_pass: false }))).toMatchObject({ source: 'cut' })
})
it('an unchecked (null) clip is still reused', async () => {
  expect(await run(clip({ veracity_pass: null }))).toMatchObject({ source: 'library' })
})
