/**
 * OUR OWN CLONES STAY IN THE PICKER EVEN WHEN CAST (Tom, 2026-09-20).
 *
 * "aran_english_003 (our Cartesia clone) is on the shelf and cast as Second
 * Male" but searching 'aran' in the candidate picker said "no voice matches
 * these filters". The candidate was not merely unsearchable — it was not in
 * the list at all: `cartesiaCandidates` dropped every voice already holding a
 * role, owned or not, so Aran's clone (cast as Second Male) could never be
 * offered for the Guide role too. Every other voice should still drop off the
 * list once cast — this is the one exception, for owned clones only.
 *
 * Run: node services/voicelab/registry.owned-clone-multi-role.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const { cartesiaCandidates, describeLanguage, guideCandidates } = require('./registry.cjs')

const catalogue = {
  en: [
    { id: '33890587-a29f-4416-ba61-2615c74f92fe', name: 'aran_english_003', owner: true, gender: 'm' },
    { id: 'stock-id', name: 'Skylar', owner: false, gender: 'f' },
  ],
}

test('a voice already cast into a role disappears from the candidate list', () => {
  const roles = [{ voice_id: 'cartesia_stock-id', slot: 'phrase' }]
  const out = cartesiaCandidates('eng', catalogue, roles)
  assert.ok(!out.some((c) => c.voiceId === 'cartesia_stock-id'), 'an ordinary voice cast already should not reappear')
})

test('an owned clone stays listed even when already cast — findable for the guide role too', () => {
  const roles = [{ voice_id: 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe', slot: 'phrase', gender: 'm', rank: 1 }]
  const out = cartesiaCandidates('eng', catalogue, roles)
  const aran = out.find((c) => c.voiceId === 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe')
  assert.ok(aran, 'Aran\'s clone must still be offered after it is cast as Second Male')
  assert.equal(aran.owned, true)
})

test('describeLanguage keeps a cast owned clone on the registered path, without a catalogue duplicate', () => {
  const voices = catalogue.en.map((v) => ({
    voice_id: `cartesia_${v.id}`, display_name: v.name, tts_engine: 'cartesia',
    type: 'tts', gender: v.gender, languages: ['eng'], is_active: true,
  }))
  const roles = voices.map((v) => ({ voice_id: v.voice_id, slot: 'phrase', gender: v.gender, rank: 0 }))
  const voiceById = new Map(voices.map((v) => [v.voice_id, v]))
  const out = describeLanguage({ code: 'eng', langCourses: [], roles, voices, voiceById, catalogue })
  const clone = voices[0]
  assert.equal(out.slots.m[0].voiceId, clone.voice_id)
  assert.equal(out.slots.m[0].filled, true)
  const matches = out.candidates.filter((c) => c.voiceId === clone.voice_id)
  assert.equal(matches.length, 1, 'the clone appears exactly once')
  assert.equal(matches[0].registered, true, 'a catalogue fallback must not mask loss of the registered candidate')
  assert.equal(matches[0].owned, true)
  assert.equal(matches[0].name, clone.display_name)
  assert.ok(!out.candidates.some((c) => c.voiceId === voices[1].voice_id), 'a cast stock voice still drops out')
})

test('guideCandidates merges a catalogue-only owned clone ahead of unregistered in-use and registered voices', () => {
  const stock = { voice_id: 'cartesia_stock-id', display_name: 'Skylar', tts_engine: 'cartesia', type: 'tts', languages: ['eng'], is_active: true }
  const cloneId = `cartesia_${catalogue.en[0].id}`
  const voiceById = new Map([[stock.voice_id, stock]])
  assert.equal(voiceById.has(cloneId), false)
  const out = guideCandidates({
    code: 'eng', voices: [stock], voiceById, guideRoles: [], catalogue,
    inUse: [{ voice_id: 'cartesia_existing-guide', clips: 10 }],
  })
  assert.deepEqual(out.map((c) => c.voiceId), [cloneId, 'cartesia_existing-guide', stock.voice_id])
  assert.equal(out[0].owned, true)
  assert.equal(out[0].registered, false)
  assert.equal(out[0].inUse, false, 'the clone comes from the catalogue, not existing clips')
  assert.equal(out[1].inUse, true)
  assert.equal(out[1].registered, false)
  assert.equal(out[2].registered, true)
})
