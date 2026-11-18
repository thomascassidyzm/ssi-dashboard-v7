#!/usr/bin/env node
// Point the app's generated pod data at the pod-only course_audio rows Popty filed for its trial clips (job #628, step 2
// of Tom's r-2026-11-07-ssi-pods-exactly-one-way-of: nothing a learner hears stays a trial clip).
//
// The mapping is Popty's ops/pod-audio-rows/trial-to-row.json ({ "trial_<UUID>": { audioId, course, role } }), written by
// Popty's tools/pods/file-pod-audio.cjs only after each row's copy was seen alive. This swaps ids in the generated files'
// own text (formatting kept), and nothing else: a trial id with no mapping is left as it is and counted.
//
// wire-staging.cjs now maps every id itself on each regeneration; this stays for the one-off swap of a file it does not write.
//   node tools/pods/pod-drill/pieces/apply-row-ids.cjs --app <ssi-learning-app checkout> [--map <trial-to-row.json>] [--write]
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const MAP = opt('--map')
const WRITE = args.includes('--write')
const { ROW_MAP, appRoot } = require('./paths.cjs')
const map = JSON.parse(fs.readFileSync(MAP ? MAP.replace(/^~/, process.env.HOME) : ROW_MAP, 'utf8'))

const ROOT = appRoot()
const targets = [
  ...fs.readdirSync(path.join(ROOT, 'packages/player-vue/src/data/podDrillPieces')).filter((f) => f.endsWith('.json')).sort().map((f) => `packages/player-vue/src/data/podDrillPieces/${f}`),
  'packages/player-vue/src/listening/talkBollocksIta1.data.ts',
]

const out = { swapped: 0, left: 0, files: {} }
for (const rel of targets) {
  const file = path.join(ROOT, rel)
  const before = fs.readFileSync(file, 'utf8')
  let swapped = 0, left = 0
  const after = before.replace(/"(trial_[0-9A-Fa-f-]{36}(?:_x\d{2,3})?)"/g, (whole, id) => {
    const m = map[id]
    if (!m || !m.audioId) { left++; return whole }
    swapped++
    return `"${m.audioId}"`
  })
  if (swapped || left) out.files[rel] = { swapped, left }
  out.swapped += swapped
  out.left += left
  if (WRITE && after !== before) fs.writeFileSync(file, after)
}
console.log(JSON.stringify({ write: WRITE, ...out }, null, 1))
