const test = require('node:test')
const assert = require('node:assert')
const {
  parseVoice, slotFor, recastEntry, genderMapFromPods, slotByCharacterFromPods,
  canonicalLabel, distinctVoices,
} = require('./pod-recast-target-pair.cjs')

const ELVIRA = { provider: 'azure', voice_id: 'es-ES-ElviraNeural', name: 'Elvira' }
const ALVARO = { provider: 'azure', voice_id: 'es-ES-AlvaroNeural', name: 'Alvaro' }

test('parseVoice reads provider:id:Name and defaults the name to the id', () => {
  assert.deepStrictEqual(parseVoice('azure:es-ES-ElviraNeural:Elvira'), ELVIRA)
  assert.deepStrictEqual(parseVoice('xai:f2f41225'), { provider: 'xai', voice_id: 'f2f41225', name: 'f2f41225' })
  assert.throws(() => parseVoice('azure'), /provider:voice_id/)
})

test('a declared character gender picks the slot', () => {
  const g = new Map()
  assert.strictEqual(slotFor({ gender: 'f' }, g), 'f')
  assert.strictEqual(slotFor({ gender: 'M' }, g), 'm')
})

test('a neutral character follows the gender of the voice it is cast to today', () => {
  const g = new Map([['pablo', 'm'], ['maria', 'f']])
  assert.strictEqual(slotFor({ gender: 'n', target: { voice_id: 'pablo' } }, g), 'm')
  assert.strictEqual(slotFor({ target: { voice_id: 'maria' } }, g), 'f')
})

test('a character with neither is unresolved, so the caller can refuse', () => {
  assert.strictEqual(slotFor({ gender: 'n', target: { voice_id: 'mystery' } }, new Map()), null)
  assert.strictEqual(slotFor({}, new Map()), null)
})

test('--by-voice ignores the character gender: accent change and nothing else', () => {
  const g = new Map([['maria', 'f']])
  const driver = { gender: 'm', target: { voice_id: 'maria' } }   // the real spa mismatch
  assert.strictEqual(slotFor(driver, g), 'm')                      // default fixes it
  assert.strictEqual(slotFor(driver, g, { byVoice: true }), 'f')   // --by-voice preserves it
})

test('recastEntry restates only the target track', () => {
  const before = {
    gender: 'f',
    variants: ['Sarah'],
    known: { name: 'Olivia', provider: 'xai', voice_id: 'bedd6226', locale: 'en' },
    target: { name: 'Maria', provider: 'xai', voice_id: 'f2f41225', locale: 'es' },
  }
  const after = recastEntry(before, ELVIRA, 'es-ES')
  assert.deepStrictEqual(after.known, before.known, 'known track untouched')
  assert.deepStrictEqual(after.variants, before.variants)
  assert.strictEqual(after.gender, 'f')
  assert.deepStrictEqual(after.target, {
    name: 'Elvira', provider: 'azure', voice_id: 'es-ES-ElviraNeural', locale: 'es-ES',
  })
  assert.strictEqual(before.target.voice_id, 'f2f41225', 'input not mutated')
})

test('the locale is stated explicitly — a region-stripped handle is the bug being fixed', () => {
  assert.strictEqual(recastEntry({}, ALVARO, 'es-ES').target.locale, 'es-ES')
  assert.strictEqual('locale' in recastEntry({}, ALVARO, undefined).target, false)
})

test('genderMapFromPods learns a voice gender from the characters it reads', () => {
  const pods = [{
    speakers: {
      Anna: { gender: 'f', target: { voice_id: 'maria' } },
      Sarah: { gender: 'f', target: { voice_id: 'maria' } },
      Driver: { gender: 'm', target: { voice_id: 'maria' } },   // one mismatch loses the vote
      Guest: { gender: 'm', target: { voice_id: 'pablo' } },
      Narrator: { gender: 'n', target: { voice_id: 'pablo' } }, // neutral casts no vote
    },
  }]
  const g = genderMapFromPods(pods)
  assert.strictEqual(g.get('maria'), 'f')
  assert.strictEqual(g.get('pablo'), 'm')
})

test('a tied voice stays unresolved rather than being guessed', () => {
  const g = genderMapFromPods([{ speakers: {
    A: { gender: 'f', target: { voice_id: 'x' } },
    B: { gender: 'm', target: { voice_id: 'x' } },
  } }])
  assert.strictEqual(g.has('x'), false)
})

test('distinctVoices separates two voices that differ only by locale handle', () => {
  const keys = [...distinctVoices({
    A: { target: { provider: 'xai', voice_id: 'v1', locale: 'es' } },
    B: { target: { provider: 'xai', voice_id: 'v1', locale: 'es-ES' } },
  }, 'target').keys()]
  assert.deepStrictEqual(keys, ['xai|v1|es', 'xai|v1|es-ES'])
})

test('a character on a tied voice inherits the slot the same character has elsewhere', () => {
  const pods = [
    { speakers: {                                    // pod-0: the prior decision
      Anna: { gender: 'f', target: { voice_id: 'eve' } },
      'Customer 3': { gender: 'n', target: { voice_id: 'diego' } },
      Guest: { gender: 'm', target: { voice_id: 'diego' } },
    } },
    { speakers: {                                    // the pod being recast
      Anna: { gender: 'f', target: { voice_id: 'maria' } },
      Guest: { gender: 'm', target: { voice_id: 'maria' } },   // tie: maria is 1f/1m
      'Customer 3': { gender: 'n', target: { voice_id: 'maria' } },
    } },
  ]
  const g = genderMapFromPods(pods)
  assert.strictEqual(g.has('maria'), false, 'maria is tied, so it has no gender')
  const byChar = slotByCharacterFromPods(pods, g)
  assert.strictEqual(byChar.get('Customer 3'), 'm')
  assert.strictEqual(
    slotFor(pods[1].speakers['Customer 3'], g, { slotByCharacter: byChar, label: 'Customer 3' }), 'm')
})

test('a character the pods disagree about is left undecided', () => {
  const pods = [
    { speakers: { Guide: { gender: 'f', target: { voice_id: 'a' } } } },
    { speakers: { Guide: { gender: 'm', target: { voice_id: 'b' } } } },
  ]
  const byChar = slotByCharacterFromPods(pods, genderMapFromPods(pods))
  assert.strictEqual(byChar.has('Guide'), false)
})

test('character slots match across paren variants of the same label', () => {
  const pods = [{ speakers: { 'Friend (7 pm)': { gender: 'm', target: { voice_id: 'p' } } } }]
  const byChar = slotByCharacterFromPods(pods, genderMapFromPods(pods))
  assert.strictEqual(byChar.get('Friend'), 'm')
  assert.strictEqual(canonicalLabel('Friend (7 pm)'), 'Friend')
})
