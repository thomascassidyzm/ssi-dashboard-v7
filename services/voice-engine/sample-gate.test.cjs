// The sample gate's server half (job #428): who needs the sample, and what approval stores.
import { describe, it, expect } from 'vitest'
const gate = require('./sample-gate.cjs')

describe('sample-gate.cjs', () => {
  it('a voice with no approval needs the sample (first session ever)', () => {
    expect(gate.needsSample(null, 'abc123abc123')).toBe(true)
  })
  it('approved for another build needs it again (recorder changed); approved for this one does not', () => {
    const r = gate.approve(null, { build: 'old000000000', by: 'artist', at: 't0' })
    expect(gate.needsSample(r, 'new000000000')).toBe(true)
    expect(gate.needsSample(r, 'old000000000')).toBe(false)
  })
  it('an unknown build never gates (fails open)', () => {
    expect(gate.needsSample(null, 'unknown')).toBe(false)
    expect(gate.needsSample(null, null)).toBe(false)
  })
  it('approval keeps a short history and refuses a junk build id', () => {
    let r = gate.approve(null, { build: 'a1', by: 'artist', at: 't1' })
    r = gate.approve(r, { build: 'b2', by: 'reviewer', at: 't2' })
    expect(r).toMatchObject({ approvedBuild: 'b2', approvedBy: 'reviewer' })
    expect(r.history.map(h => h.build)).toEqual(['b2', 'a1'])
    expect(() => gate.approve(r, { build: '../x y' })).toThrow(/build/)
  })
  it('the store reads and writes one JSON object per voice', async () => {
    const objects = new Map()
    const s3 = { getJsonObject: async (k) => objects.get(k) || null, putJsonObject: async (k, v) => { objects.set(k, v); return v } }
    const store = gate.createSampleGateStore({ s3 })
    expect(await store.read('human_x')).toBeNull()
    await store.approve('human_x', { build: 'abc', by: 'artist' })
    expect(objects.has('booth-sample-gate/human_x.json')).toBe(true)
    expect((await store.read('human_x')).approvedBuild).toBe('abc')
  })
})

describe('recorder build hash covers the whole recording chain (job #433)', () => {
  const fs = require('fs'), os = require('os'), path = require('path')
  it('changing any listed file changes the hash; an unlisted file does not', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-'))
    for (const f of gate.RECORDER_BUILD_FILES) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), 'x') }
    const base = gate.computeRecorderBuild(root)
    expect(base).not.toBe('unknown')
    for (const f of gate.RECORDER_BUILD_FILES) {
      fs.appendFileSync(path.join(root, f), 'y')
      expect(gate.computeRecorderBuild(root)).not.toBe(base)
      fs.writeFileSync(path.join(root, f), 'x')
    }
    expect(gate.RECORDER_BUILD_FILES).toEqual(expect.arrayContaining(['src/views/RecordistRoom.vue', 'services/audio-processor.cjs']))
    fs.writeFileSync(path.join(root, 'other.js'), 'z')
    expect(gate.computeRecorderBuild(root)).toBe(base)
  })
  it('every listed file exists in the repo', () => {
    expect(gate.computeRecorderBuild(path.resolve(__dirname, '../..'))).not.toBe('unknown')
  })
})
