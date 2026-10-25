import { it, expect } from 'vitest'
const { ingestCut } = require('./ingest-cut.cjs')
const guard = require('./drill-cut-guard.cjs')
const { renderClip } = require('./audio-render-entry.cjs')

it('ingest-cut does not reuse a clip explicitly rejected by audit', async () => {
  const sourceId = '11111111-1111-4111-8111-111111111111'
  const rejectedId = '22222222-2222-4222-8222-222222222222'
  const tables = {
    course_seeds: [{ id: 's1', course_code: 'zho_for_eng', seed_number: 1, target_text: '我想', target1_audio_id: null }],
    course_audio: [
      { id: sourceId, course_code: 'zho_for_eng', text: '我想说中文', text_normalized: '我想说中文', language: 'zho', role: 'target1', voice_id: 'cast', s3_key: 'source.mp3' },
      { id: rejectedId, course_code: 'zho_for_eng', text: '我想', text_normalized: '我想', language: 'zho', role: 'target1', voice_id: 'cast', s3_key: 'bad.mp3', veracity_pass: false },
    ],
  }
  const db = { from(table) {
    let rows = tables[table]
    const q = {
      select() { return q },
      eq(k, v) { rows = rows.filter(r => r[k] === v); return q },
      not(k, op, v) {
        rows = rows.filter(r => op === 'like' ? !String(r[k]).startsWith(v.replace(/%$/, '')) : r[k] !== v)
        return q
      },
      maybeSingle: async () => ({ data: rows[0] || null, error: null }),
    }
    return q
  } }
  const out = await ingestCut({ courseCode: 'zho_for_eng', seedNumber: 1, role: 'target1', text: '我想', sourceAudioId: sourceId,
    startSec: 0, endSec: 0.8, charStart: 0, charEnd: 2, requestedBy: 'test', dryRun: true }, {
    db, fetchServed: async () => Buffer.from('whole'),
    cut: async () => ({ bytes: Buffer.from('cut'), durationSec: 0.8, sourceDurationSec: 2 }),
    decode: async () => new Float32Array(1), hashVerdict: () => ({ ok: true }),
    tailAudit: async () => ({ click: false }),
  })
  expect(out).toMatchObject({ ok: true, source: 'cut', audioId: null })
})

it('a matching turn in a second voice still prevents paying for that voice again', async () => {
  const rows = ['voice-a', 'voice-b'].map((voice, i) => ({ id: `row-${i}`, course_code: 'zho_for_eng',
    target_text: '谢谢你。我很好。', target_audio_id: `turn-${i}`, clip: { language: 'zho', voice_id: voice } }))
  const paid = []
  const result = await renderClip({ courseCode: 'zho_for_eng', role: 'target1', text: '谢谢你。', purpose: 'test', requestedBy: 'test' }, {
    resolve: async () => ({ language: 'zho', voiceId: 'voice-b', provider: 'xai', providerConfig: {} }),
    link: async () => null,
    immersionTurn: async args => guard.findImmersionTurn(rows, args),
    speak: async text => { paid.push(text); return { audioBuffer: Buffer.alloc(8), charsSpent: text.length } },
    store: async () => ({ audioId: 'new', s3Key: 'new.mp3', durationMs: 900 }),
  }).catch(e => e)
  expect(result).toMatchObject({ status: 409, code: 'DRILL_IS_CUT' })
  expect(paid).toEqual([])
})
