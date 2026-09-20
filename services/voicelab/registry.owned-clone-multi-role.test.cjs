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
const { cartesiaCandidates } = require('./registry.cjs')

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
