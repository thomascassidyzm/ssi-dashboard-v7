'use strict'
// Job #371: the link plan repoints only at text-identical EXISTING clips, one voice per speaker per scene, all-or-nothing, never a near match.
const test = require('node:test'), assert = require('node:assert')
const { buildIndex, planLink } = require('./english-pod1-revoice.cjs')
const CH = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', T1 = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', OLIVIA = 'xai_bedd6226-aaaa'
const src = { lines: [
  { clip: 'c-hi', oldVoice: CH, clipText: 'Good morning.', splits: [] },
  { clip: 'c-how', oldVoice: CH, clipText: 'How are you?', splits: [] },
  { clip: 't-hi', oldVoice: T1, clipText: 'Good morning.', splits: [] },
  { clip: 'o-x', oldVoice: OLIVIA, clipText: 'Only on Olivia.', splits: [] }] }
const line = (id, speaker, text, splits = []) => ({ id, scene: 1, speaker, text, clip: 'old-' + id, clipText: text, oldVoice: OLIVIA, splits })
test('links text-identical existing clips; a speaker with one missing line is held whole; near matches and old-voice clips never link', () => {
  const idx = buildIndex([src])
  const lines = [line('a', 'Sarah', 'Good morning.'), line('b', 'Sarah', 'How are you?', [{ id: 'old-b1', text: 'How are you?', voice_id: OLIVIA }]),
    line('c', 'Anna', 'Good morning.'), line('d', 'Anna', 'Only on Olivia.'), line('e', 'Tom', 'Good morning!')]
  const p = planLink(lines, idx, { Sarah: 'f', Anna: 'f', Tom: 'm' })
  assert.deepStrictEqual(p.links.filter(x => x.line === 'a' || x.line === 'b').map(x => x.id).sort(), ['c-hi', 'c-how', 'c-how'])
  assert.ok(!p.links.some(x => x.line === 'c' || x.line === 'd'), 'Anna has a gap, so none of her lines link')
  assert.deepStrictEqual(p.gaps.map(g => g.text).sort(), ['Good morning!', 'Only on Olivia.'].sort())
  assert.strictEqual(p.held.length, 2)
})
// Job #417 (supersedes #414): the source is the UNION of ita/spa/nld_for_eng; any other X_for_eng is refused.
test('English sources are the ita/spa/nld_for_eng union; other X_for_eng courses are not sources', () => {
  const { englishSources, isAllowedSource } = require('./english-pod1-revoice.cjs')
  assert.deepStrictEqual(englishSources(), ['ita_for_eng', 'spa_for_eng', 'nld_for_eng'])
  assert.ok(isAllowedSource('spa_for_eng') && !isAllowedSource('fra_for_eng'))
})
