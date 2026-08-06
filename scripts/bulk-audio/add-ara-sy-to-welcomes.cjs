#!/usr/bin/env node
/**
 * Add ara_sy (Syrian Arabic) target slot to all welcome translation files.
 * Uses Sonnet to translate based on each lang's existing "ara" slot.
 * Mirrors add-ara-lb-to-welcomes.cjs.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const DIR = path.join(__dirname, 'data', 'translations', 'welcomes')
const EXECUTE = process.argv.includes('--execute')

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'))
const needAraSy = []
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  if (!data.targets?.ara) continue
  if (data.targets.ara_sy) continue
  needAraSy.push({ file: f, lang: f.replace('.json',''), araSlot: data.targets.ara })
}
console.log(`${needAraSy.length} files need ara_sy slot added`)

if (!EXECUTE) {
  console.log('\nWill be sent to Sonnet:')
  for (const n of needAraSy.slice(0, 3)) console.log(`  ${n.file}: ara=${JSON.stringify(n.araSlot)}`)
  console.log('  ... etc')
  console.log('\nDry-run. Re-run with --execute to call Sonnet + update files.')
  process.exit(0)
}

const prompt = `For each language below, translate the existing "ara" (Arabic) slot to a new "ara_sy" (Syrian Arabic) slot. The new slot should follow the same grammatical structure but specify "Syrian Arabic" instead of just "Arabic".

For reference, English does it like this:
  ara: {"in_target": "in Arabic", "a_target_speaker": "an Arabic speaker", "target_speakers": "Arabic speakers"}
  ara_sy: {"in_target": "in Syrian Arabic", "a_target_speaker": "a Syrian Arabic speaker", "target_speakers": "Syrian Arabic speakers"}

For each input lang, give me the ara_sy slot using the same gender/case/agreement style as that lang's ara slot. Keep "Syrian" as an adjective modifying "Arabic" (or merged into a single concept like "syrien" in French where natural).

Output a JSON object: { lang: { in_target: ..., a_target_speaker: ..., target_speakers: ... }, ... }
Output ONLY JSON. No prose, no markdown fences.

Inputs:
${needAraSy.map(n => `  ${n.lang}: ${JSON.stringify(n.araSlot, null, 0)}`).join('\n')}
`

console.log('Calling Sonnet...')
const env = { ...process.env }
delete env.CLAUDECODE
delete env.CLAUDE_CODE_ENTRYPOINT
delete env.ANTHROPIC_API_KEY
const result = spawnSync('claude', ['--print', '--model', 'sonnet', '--permission-mode', 'bypassPermissions'], {
  input: prompt, env, encoding: 'utf8', maxBuffer: 50_000_000
})
if (result.status !== 0) { console.error('Sonnet failed:', result.stderr.slice(0, 500)); process.exit(1) }

const raw = result.stdout
const clean = raw.replace(/```(?:json)?/g, '').trim()
const start = clean.indexOf('{')
const end = clean.lastIndexOf('}')
let parsed
try { parsed = JSON.parse(clean.slice(start, end + 1)) }
catch (e) { console.error('Parse fail:', e.message); console.log('Raw:', raw.slice(0, 500)); process.exit(1) }

console.log(`Got slots for ${Object.keys(parsed).length} langs`)
for (const n of needAraSy) {
  const slot = parsed[n.lang]
  if (!slot || !slot.in_target || !slot.a_target_speaker || !slot.target_speakers) {
    console.log(`  ✗ ${n.lang}: missing/invalid slot — skip`)
    continue
  }
  const data = JSON.parse(fs.readFileSync(path.join(DIR, n.file), 'utf8'))
  data.targets.ara_sy = slot
  fs.writeFileSync(path.join(DIR, n.file), JSON.stringify(data, null, 2))
  console.log(`  ✓ ${n.file}: added ara_sy = ${JSON.stringify(slot)}`)
}
