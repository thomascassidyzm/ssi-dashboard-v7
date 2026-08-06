#!/usr/bin/env node
/**
 * Add ara_lb (Lebanese Arabic) target slot to all welcome translation files.
 * Uses Sonnet to translate based on each lang's existing "ara" slot.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const DIR = path.join(__dirname, 'data', 'translations', 'welcomes')
const EXECUTE = process.argv.includes('--execute')

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'))
const needAraLb = []
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  if (!data.targets?.ara) continue  // skip if no ara base (e.g., ara.json itself)
  if (data.targets.ara_lb) continue  // already has it
  needAraLb.push({ file: f, lang: f.replace('.json',''), araSlot: data.targets.ara })
}
console.log(`${needAraLb.length} files need ara_lb slot added`)

if (!EXECUTE) {
  console.log('\nWill be sent to Sonnet:')
  for (const n of needAraLb.slice(0, 3)) console.log(`  ${n.file}: ara=${JSON.stringify(n.araSlot)}`)
  console.log('  ... etc')
  console.log('\nDry-run. Re-run with --execute to call Sonnet + update files.')
  process.exit(0)
}

// Build Sonnet prompt — single call with all 27
const prompt = `For each language below, translate the existing "ara" (Arabic) slot to a new "ara_lb" (Lebanese Arabic) slot. The new slot should follow the same grammatical structure but specify "Lebanese Arabic" instead of just "Arabic".

For reference, English does it like this:
  ara: {"in_target": "in Arabic", "a_target_speaker": "an Arabic speaker", "target_speakers": "Arabic speakers"}
  ara_lb: {"in_target": "in Lebanese Arabic", "a_target_speaker": "a Lebanese Arabic speaker", "target_speakers": "Lebanese Arabic speakers"}

For each input lang, give me the ara_lb slot using the same gender/case/agreement style as that lang's ara slot. Keep "Lebanese" as an adjective modifying "Arabic" (or merged into a single concept like "libanais" in French where natural).

Output a JSON object: { lang: { in_target: ..., a_target_speaker: ..., target_speakers: ... }, ... }
Output ONLY JSON. No prose, no markdown fences.

Inputs:
${needAraLb.map(n => `  ${n.lang}: ${JSON.stringify(n.araSlot, null, 0)}`).join('\n')}
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
for (const n of needAraLb) {
  const slot = parsed[n.lang]
  if (!slot || !slot.in_target || !slot.a_target_speaker || !slot.target_speakers) {
    console.log(`  ✗ ${n.lang}: missing/invalid slot — skip`)
    continue
  }
  const data = JSON.parse(fs.readFileSync(path.join(DIR, n.file), 'utf8'))
  data.targets.ara_lb = slot
  fs.writeFileSync(path.join(DIR, n.file), JSON.stringify(data, null, 2))
  console.log(`  ✓ ${n.file}: added ara_lb = ${JSON.stringify(slot)}`)
}
