#!/usr/bin/env node
/**
 * "How this works clips" compiler CLI.
 *
 * Reads the hand-authored clips (tools/walkthrough/walks/*.json), runs the
 * drift gates in lib.mjs against the live Vue source, the router, the
 * explainer's noticing rules and the capability inventory, and emits the
 * static pack the SPA bundles. A broken anchor, a clip offered to a persona
 * who cannot see the element, a five-step clip, a click-advance step on a
 * money-spending verb — each FAILS the compile. Zero runtime tokens, zero
 * model calls; this CLI is the only refresh path.
 *
 *   node tools/walkthrough/compile.mjs           # write pack.json + docs render
 *   node tools/walkthrough/compile.mjs --check   # validate only, no writes (CI)
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runGates, assemblePack } from './lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const CHECK_ONLY = process.argv.includes('--check')

function vueFilesUnder(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...vueFilesUnder(full))
    else if (entry.endsWith('.vue')) out.push({ path: full.slice(ROOT.length + 1), src: readFileSync(full, 'utf8') })
  }
  return out
}

const walksDir = join(HERE, 'walks')
const walkFiles = existsSync(walksDir) ? readdirSync(walksDir).filter((f) => f.endsWith('.json')).sort() : []
const walks = walkFiles.map((f) => {
  try {
    return JSON.parse(readFileSync(join(walksDir, f), 'utf8'))
  } catch (e) {
    console.error(`[clips] ${f} is not valid JSON: ${e.message}`)
    process.exit(1)
  }
})

const inventoryPath = join(HERE, 'inventory.json')
const inventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, 'utf8')) : { capabilities: [] }

const { failures, warnings, coverage, skeletonSteps } = runGates({
  walks,
  vueFiles: vueFilesUnder(join(ROOT, 'src')),
  runtimeSrc: readFileSync(join(ROOT, 'src/walkthrough/useWalkthrough.js'), 'utf8'),
  routerSrc: readFileSync(join(ROOT, 'src/router/index.js'), 'utf8'),
  rulesJson: JSON.parse(readFileSync(join(ROOT, 'tools/explainer/rules.json'), 'utf8')),
  evaluateRulesSrc: readFileSync(join(ROOT, 'src/explainer/evaluateRules.js'), 'utf8'),
  inventory,
})

if (!existsSync(inventoryPath)) warnings.push('inventory.json absent — coverage against what Popty can DO is unmeasured')

for (const w of warnings) console.log(`  ⚠ ${w}`)
if (failures.length) {
  console.error('\n[clips] COMPILE FAILED — a clip would lie about Popty:')
  for (const f of failures) console.error(`  ✗ ${f}`)
  console.error('\nFix the anchor / data-persona / place, or re-author the clip, then re-run.')
  process.exit(1)
}

const pack = assemblePack(walks)
const content = JSON.stringify(pack)
const versioned = {
  version: createHash('sha256').update(content).digest('hex').slice(0, 12),
  generatedAt: new Date().toISOString().slice(0, 10),
  ...pack,
}

// The coverage line is the founder's total-coverage ruling made visible on
// every single compile: how much of what Popty can DO is actually a written
// clip, and how much is still a marked placeholder.
const authoredSteps = walks.filter((w) => w.status === 'authored').reduce((n, w) => n + w.steps.length, 0)
const summary = `${coverage.authored} authored (${authoredSteps} steps) · ${coverage.skeleton} skeleton (${skeletonSteps} steps) · ${coverage.capabilities} capabilities in the inventory`
const pct = coverage.capabilities ? Math.round((coverage.authored / coverage.capabilities) * 100) : 0

if (CHECK_ONLY) {
  console.log(`[clips] check OK — pack version would be ${versioned.version}`)
  console.log(`[clips] coverage ${pct}% — ${summary}`)
  process.exit(0)
}

writeFileSync(join(ROOT, 'src/walkthrough/pack.json'), JSON.stringify(versioned, null, 2) + '\n')

const say = (s) => (s.say == null ? '_(needs Tom\'s voice)_' : s.say)
const md = [
  '# "How this works" clips — compiled render',
  '',
  `**Version \`${versioned.version}\` · generated ${versioned.generatedAt} by \`tools/walkthrough/compile.mjs\`. DO NOT EDIT — edit tools/walkthrough/walks/*.json and recompile.**`,
  '',
  `Coverage: **${pct}%** — ${summary}.`,
  '',
  '## Authored',
  '',
  ...versioned.walks.filter((w) => w.status === 'authored').flatMap((w) => [
    `### ${w.id} — ${w.title}`,
    '',
    `Personas: ${w.personas.join(', ')} · place: ${w.place.section}${w.next ? ` · chains into: ${w.next}` : ''}`,
    '',
    ...w.steps.map((s, i) => `${i + 1}. [\`${s.anchor}\` · ${s.choice} · advance ${s.advance.on}] ${say(s)}${s.terminal ? `\n   - terminal: ${s.terminal}` : ''}`),
    '',
  ]),
  '## Skeleton — not offered, awaiting authoring',
  '',
  ...versioned.walks.filter((w) => w.status === 'skeleton').map((w) =>
    `- **${w.id}** (${w.place.section}, ${w.personas.join('/')}) — ${w.title}: ${w.steps.length} steps, ${w.steps.filter((s) => s.say == null).length} sentences needing Tom's voice`),
  '',
].join('\n')
writeFileSync(join(ROOT, 'docs/walkthrough-pack.md'), md)

console.log(`[clips] pack ${versioned.version} written — coverage ${pct}% (${summary})`)
console.log('  → src/walkthrough/pack.json')
console.log('  → docs/walkthrough-pack.md')
