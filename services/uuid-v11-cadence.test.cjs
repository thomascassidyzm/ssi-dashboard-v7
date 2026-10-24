'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const ids = require('./uuid-v11.cjs')
const cadence = require('./cadence-service.cjs')

const pairHash = '30AFB3E8783C0BF8'

test('pair hashes have fixed vectors, preserve case and distinguish pair order', () => {
  assert.equal(ids.hashPair('hello', 'hola'), pairHash)
  assert.equal(ids.hashPair('', ''), 'B99834BC19BBAD24')
  assert.notEqual(ids.hashPair('hello', 'hola'), ids.hashPair('hola', 'hello'))
  assert.notEqual(ids.hashPair('Hello', 'hola'), pairHash)
})

test('all node builders encode type, position and the exact pair hash', () => {
  assert.deepEqual(ids.NODE_TYPES, { SEED: 'SEED', COMP: 'COMP', LEGO: 'LEGO', DEBU: 'DEBU', ETER: 'ETER' })
  const suffix = `${pairHash.slice(0, 4)}-${pairHash.slice(4)}`
  const cases = [
    ['generateSeedNodeId', ['S0042'], 'S0042000-SEED-0000'],
    ['generateComponentNodeId', ['S0042', 'L01', 3], 'S0042L01-COMP-0003'],
    ['generateLegoNodeId', ['S0042', 'L01'], 'S0042L01-LEGO-0000'],
    ['generateDebutNodeId', ['S0042', 'L01', 12], 'S0042L01-DEBU-0012'],
    ['generateEternalNodeId', ['S0042', 'L01', 9999], 'S0042L01-ETER-9999'],
  ]
  for (const [name, args, prefix] of cases) {
    assert.equal(ids[name](...args, 'hello', 'hola'), `${prefix}-${suffix}`, name)
  }
  assert.equal(ids.generateNodeId('S0042', 'L01', 'COMP', 3, 'hello', 'hola'), `S0042L01-COMP-0003-${suffix}`)
  assert.equal(ids.generateNodeId('S', 'L', 'LEGO', 0, '', '').split('-')[0], 'SL000000')
  assert.equal(ids.generateNodeId('S0042', 'L01234', 'LEGO', 0, '', '').split('-')[0], 'S0042L01')
  for (const type of ['', 'PRAC', null, undefined]) {
    assert.throws(() => ids.generateNodeId('S0042', null, type, 0, '', ''), /Invalid node type/)
  }
})

test('parsing recovers both seed-only and LEGO identities and rejects missing segments', () => {
  assert.deepEqual(ids.parseNodeId(ids.generateComponentNodeId('S0042', 'L01', 3, 'hello', 'hola')), {
    seedId: 'S0042', legoId: 'L01', nodeType: 'COMP', order: 3, hash: pairHash,
  })
  assert.deepEqual(ids.parseNodeId(ids.generateSeedNodeId('S0042', 'hello', 'hola')), {
    seedId: 'S0042', legoId: null, nodeType: 'SEED', order: 0, hash: pairHash,
  })
  for (const value of ['', 'S0042', 'a-b-c-d', 'a-b-c-d-e-f']) {
    assert.throws(() => ids.parseNodeId(value), /Invalid node ID format/)
  }
  assert.throws(() => ids.parseNodeId(null), TypeError)
})

test('normalisation folds case and whitespace, preserves accents and handles empty values', () => {
  assert.equal(ids.normalizeText('  HÉLLO\tWORLD\n '), 'héllo world')
  for (const value of ['', ' \t\n', null, undefined, false, 0]) assert.equal(ids.normalizeText(value), '')
  for (const value of [42, {}, []]) assert.throws(() => ids.normalizeText(value), TypeError)
})

test('UUID v5 matches the published DNS vector and accepts empty input deterministically', () => {
  const dns = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
  assert.equal(ids.uuidv5('www.widgets.com', dns), '21f7f8de-8051-5b89-8680-0195ef798b6a')
  assert.equal(ids.uuidv5('', dns), '4ebd0208-8328-5d69-8c44-ec50939c0967')
  assert.throws(() => ids.uuidv5(null, dns), TypeError)
  assert.throws(() => ids.uuidv5('text', null), TypeError)
})

test('sample identity fixes namespace and key order, normalises text and separates every dimension', () => {
  assert.equal(ids.SSI_AUDIO_NAMESPACE, '6e2d1e3a-2c4a-4b5d-8e6f-1a2b3c4d5e6f')
  const args = ['voice', 'hola', 'spa', 'target1', 'slow']
  const expected = '334aafc4-1add-5d57-80be-7a534d219a37'
  assert.equal(ids.generateSampleId(...args), expected)
  assert.equal(ids.generateSampleId('voice', '  HOLA\n', 'spa', 'target1', 'slow'), expected)
  for (const [index, value] of [[0, 'other'], [1, 'adiós'], [2, 'eng'], [3, 'target2'], [4, 'natural']]) {
    const changed = [...args]
    changed[index] = value
    assert.notEqual(ids.generateSampleId(...changed), expected)
  }
  assert.equal(ids.generateSampleId('voice', null, 'spa', 'target1', 'slow'), ids.generateSampleId('voice', '', 'spa', 'target1', 'slow'))
})

test('both role maps and cadence conversions retain the slow/natural contract', () => {
  assert.deepEqual(cadence.CADENCE_SPEEDS, { slow: 0.7, natural: 1 })
  assert.deepEqual(cadence.ROLE_CADENCES, { target1: 'slow', target2: 'slow', source: 'natural', presentation: 'natural' })
  assert.deepEqual(ids.CADENCE_RULES, { ...cadence.ROLE_CADENCES, presentation_encouragement: 'natural' })
  for (const role of ['target1', 'target2', 'source', 'presentation', 'presentation_encouragement', 'unknown', '', null, undefined]) {
    const expected = ['target1', 'target2'].includes(role) ? 'slow' : 'natural'
    assert.equal(ids.getCadenceForRole(role), expected)
    assert.equal(cadence.getCadenceForRole(role), expected)
  }
  for (const value of ['slow', 'natural', 'unknown', '', null, undefined, 0, {}, []]) {
    const slow = value === 'slow'
    assert.equal(cadence.getSpeedForCadence(value), slow ? 0.7 : 1)
    assert.equal(cadence.getStretchForCadence(value), slow ? 1 / 0.7 : 1)
    assert.equal(cadence.getAzureSpeedForCadence(value), slow ? '-30%' : '0%')
    assert.equal(cadence.isValidCadence(value), value === 'slow' || value === 'natural')
  }
})

test.todo('generateNodeId should reject inherited object keys such as toString as invalid node types')
