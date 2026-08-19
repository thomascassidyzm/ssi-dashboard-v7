#!/usr/bin/env node
/**
 * Build the editable seed document for the six learner guided walks.
 *
 *   node tools/htw-copy/build-learner-walks.cjs [--out docs/copy-surfaces/learner-walks.md]
 *
 * Reads the compiled walkthrough pack in the learning app and flattens every
 * editable string into a markdown document with one heading per string and a
 * stable key under each heading. Nothing is paraphrased: the strings are copied
 * verbatim, so a later worker maps edits back into pack.json by key, mechanically.
 *
 * What is deliberately NOT in the document: `anchor` (which element on screen the
 * step points at), `advance`, `place` and `personas`. Those are wiring, not copy —
 * changing them would break the overlay rather than reword it.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const APP = path.join(__dirname, '../../../ssi-learning-app')
const PACK = path.join(APP, 'packages/player-vue/src/walkthrough/pack.json')
const outArg = process.argv.indexOf('--out')
const OUT = path.join(__dirname, '../..',
  outArg > -1 ? process.argv[outArg + 1] : 'docs/copy-surfaces/learner-walks.md')

const pack = JSON.parse(fs.readFileSync(PACK, 'utf8'))
const walks = pack.walks.filter(w => (w.personas || []).includes('learner'))

let ref = 'unknown'
try {
  ref = execFileSync('git', ['-C', APP, 'log', '-1', '--format=%h (%s)', '--', PACK],
    { encoding: 'utf8' }).trim()
} catch { /* not a git checkout — the header just says unknown */ }

const L = []
const key = k => L.push('`' + k + '`', '')

L.push('# The little walks a learner can ask for', '')
L.push('For whoever is editing. These are the six guided walks in the app: a learner taps a')
L.push('question in the Library and the app walks them round their own screen, one step at a')
L.push('time, pointing at the real thing as it talks. These are the words it says.', '')
L.push('They are the other half of the How This Works copy — that document is the reading;')
L.push('this is the pointing.', '')
L.push('**Edit the words freely.** The `##`/`###` headings and the little `key` lines under')
L.push('them are how we map your edits back into the app, so please leave those alone —')
L.push('everything else is yours to change.', '')
L.push('Each step is pinned to a real thing on the learner\'s screen, and the app draws a')
L.push('spotlight round it while the step is showing. So a step\'s words should make sense')
L.push('as a caption for the thing it is pointing at. If a step needs to point somewhere')
L.push('else, say so in your edit and we will move it — that part is wiring, not words.', '')
L.push('A few lines are governed by settled rulings and are fine to raise, but we will come')
L.push('back to Tom on them rather than silently applying or reverting your edit:', '')
L.push('- The names **Easy** and **Fast** for the two paces.')
L.push('- The **no-streaks, no-points, no-leaderboard** framing — the decision, not just the words.')
L.push('- The **honest thirty-hours arc**: that the first thirty hours are hard, and we say so.')
L.push('- No learner-facing line says **lego** or **seed** — those are our words, not theirs.')
L.push('- British English throughout.', '')
L.push(`Source: \`packages/player-vue/src/walkthrough/pack.json\` in ssi-learning-app, at ${ref}.`, '')
L.push('---', '')

for (const w of walks) {
  L.push(`## ${w.title}`, '')
  L.push(`### The question a learner taps`)
  key(`${w.id} / topic`)
  L.push(w.topic, '')
  L.push('### The heading on the walk')
  key(`${w.id} / title`)
  L.push(w.title, '')
  L.push('### Words that find this walk in the search box')
  key(`${w.id} / keywords`)
  L.push((w.keywords || []).join(', '), '')

  w.steps.forEach((s, i) => {
    L.push(`### Step ${i + 1} — what it says`)
    key(`${w.id} / step-${i + 1} / say`)
    L.push(s.say, '')
    if (s.terminal) {
      L.push(`### Step ${i + 1} — the line that closes the walk`)
      key(`${w.id} / step-${i + 1} / terminal`)
      L.push(s.terminal, '')
    }
  })
  L.push('---', '')
}

const text = L.join('\n').replace(/\n{3,}/g, '\n\n')
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, text)

const words = text.split(/\s+/).filter(Boolean).length
console.log(`wrote ${OUT}`)
console.log(`${walks.length} walks, ${walks.reduce((n, w) => n + w.steps.length, 0)} steps, ${words} words`)
