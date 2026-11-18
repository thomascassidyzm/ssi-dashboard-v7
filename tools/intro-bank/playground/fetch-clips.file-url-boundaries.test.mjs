import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('./fetch-clips.mjs', import.meta.url), 'utf8')
const legos = ['I want', 'to speak', 'German', 'now', 'with you', 'now I want', 'to learn', "I'm trying to", 'to learn German', 'as often as possible']

// Execute the unchanged module. All external dependencies are synthetic;
// the only real filesystem read is the source above.
async function run({ out = '/output', id = 'clip-id', missing = false } = {}) {
  const trace = { reads: [], urls: [], objects: [], writes: [], directories: [] }
  const context = vm.createContext({ Buffer, process: { argv: ['node', 'fetch-clips.mjs', out] }, console: { log() {} } })
  const fs = {
    readFileSync(path) {
      trace.reads.push(path)
      if (path.endsWith('.env')) return 'SUPABASE_URL=https://database.invalid\nSUPABASE_SERVICE_ROLE_KEY=synthetic\n'
      assert.equal(path, '/synthetic-home/.tmpbig/t734/charlotte.json')
      return JSON.stringify({ voices: [{ frame: { audioId: id }, is: { audioId: id }, legos: legos.map(() => ({ audioId: id })) }] })
    },
    writeFileSync(path, data) { trace.writes.push({ path, data }) },
    mkdirSync(path) { trace.directories.push(path) },
  }
  const sdk = {
    S3Client: class { async send(command) {
      trace.objects.push(command.input)
      return { Body: { async transformToByteArray() { return [1, 2, 3] } } }
    } },
    GetObjectCommand: class { constructor(input) { this.input = input } },
  }
  context.fetch = async (url) => {
    trace.urls.push(url)
    return { async json() {
      if (url.includes('voice_id=')) return (missing ? ['is'] : ['The German for', 'is', ...legos]).map(text => ({ text, id }))
      return [{ s3_key: '../../remote-key?x=1' }]
    } }
  }
  const imports = {
    'node:fs': fs,
    'node:os': { default: { homedir: () => '/synthetic-home' } },
    'node:module': { createRequire: () => name => {
      assert.equal(name, '@aws-sdk/client-s3')
      return sdk
    } },
  }
  const module = new vm.SourceTextModule(source, { context })
  await module.link(specifier => {
    assert.ok(Object.hasOwn(imports, specifier), `unexpected import: ${specifier}`)
    const exports = imports[specifier]
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value)
    }, { context })
  })
  let error
  try { await module.evaluate() } catch (caught) { error = caught }
  return { ...trace, error }
}

test('remote IDs and object keys do not become local filenames', async () => {
  const result = await run({ id: '../../metadata?x=1&select=id#fragment' })
  assert.ifError(result.error)
  assert.equal(result.objects.length, 36)
  assert.ok(result.objects.every(x => x.Bucket === 'ssi-audio-stage' && x.Key === '../../remote-key?x=1'))
  const expected = ['tom_001', 'aran', 'charlotte'].flatMap(voice =>
    ['frame', 'is', ...legos.map((_, i) => `lego${i}`)].map(name => `/output/clips/${voice}/${name}.mp3`))
  assert.deepEqual(result.writes.map(x => x.path), [...expected, '/output/manifest.json'])
  const manifest = JSON.parse(result.writes.at(-1).data)
  assert.equal(manifest.voices.charlotte.files.lego9, 'clips/charlotte/lego9.mp3')
  // Characterize raw interpolation, not a claim about actual HTTP delivery.
  const lookup = new URL(result.urls[2])
  assert.equal(lookup.searchParams.get('id'), 'eq.../../metadata?x=1')
  assert.equal(lookup.searchParams.get('select'), 'id')
  assert.equal(lookup.hash, '#fragment&select=s3_key')
})

test('operator output is a literal path prefix, without file URL decoding or containment', async () => {
  for (const out of ['../chosen output', 'file:///chosen%20output']) {
    const result = await run({ out })
    assert.ifError(result.error)
    assert.equal(result.directories[0], `${out}/clips/tom_001`)
    assert.equal(result.writes[0].path, `${out}/clips/tom_001/frame.mp3`)
    assert.equal(result.writes.at(-1).path, `${out}/manifest.json`)
  }
})

test('missing required metadata stops before directory creation or object download', async () => {
  const result = await run({ missing: true })
  assert.match(result.error?.message ?? '', /missing clip for tom_001/)
  assert.equal(result.urls.length, 2)
  assert.deepEqual(result.objects, [])
  assert.deepEqual(result.directories, [])
  assert.deepEqual(result.writes, [])
})
