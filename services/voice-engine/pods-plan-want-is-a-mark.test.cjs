/**
 * The studio's recording plan and the booth's queue must not disagree about
 * what is still to read. Tom, 2026-09-11: a confirmed take is a recording under
 * every flag; a want is a mark. This pins the studio half.
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { finalizeRecordingPlan } = require('./pods-plan.cjs')

const plan = {
  items: [
    { podId: 'p', podTitle: 'Pod', sentenceId: 's1', kind: 'target', speaker: 'Aran', line: 'Bore da.', cues: [] },
    { podId: 'p', podTitle: 'Pod', sentenceId: 's2', kind: 'target', speaker: 'Aran', line: 'Nos da.', cues: [] },
  ],
}
const audio = { 'clip-1': { id: 'clip-1', origin: 'human', voice_id: 'human_aran_cym_n', duration_ms: 1200, file_size_bytes: 20000 } }
const fetchAudioRows = async (ids) => ids.map((id) => audio[id]).filter(Boolean)

test('a wanted track whose slot holds a confirmed human take is RECORDED, and the want is carried as a mark', async () => {
  const sentences = [
    { id: 's1', target_audio_id: 'clip-1', rerecord_wanted: { target: 'human_aran_cym_n' } },
    { id: 's2', target_audio_id: null, rerecord_wanted: { target: 'human_aran_cym_n' } },
  ]
  const out = await finalizeRecordingPlan({ plan, sentences, voiceId: 'human_aran_cym_n', fetchAudioRows })
  const [s1, s2] = out.items
  assert.strictEqual(s1.recorded, true, 'the take outranks the want')
  assert.strictEqual(s1.rerecordWanted, true, 'the want is not destroyed, it is a mark')
  assert.strictEqual(s2.recorded, false, 'no confirmed upload: still to read')
  assert.strictEqual(s2.rerecordWanted, false, 'a mark only ever sits over a recorded line')
  assert.deepStrictEqual(out.totals, { items: 2, recorded: 1, remaining: 1 })
})
