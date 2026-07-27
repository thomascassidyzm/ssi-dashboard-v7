#!/usr/bin/env node
/**
 * Popty's self-explaining COMPILER — second proof of the "apps ship with
 * explanatory power" paradigm (first: ssi-learning-app, 2026-07-27).
 * Design: docs/self-explaining-popty.md.
 *
 * Reads live truth out of Popty's own source — the nav tabs on AppNavbar.vue,
 * the role model in useAuth.js/UserManagement.vue, the course-builder gates
 * (validation.cjs, language-config.cjs), the voice policy
 * (human-voice-courses.cjs), the phase pipeline in SYSTEM.md — plus the
 * hand-written rulings (tools/explainer/rulings/*.md) and noticing rules
 * (rules.json), validates one against the other (the DRIFT GATE: a stale
 * explanation, a persona that isn't a real role, or a rule over a vanished
 * field fails the compile), and emits the static EXPLANATION PACK the
 * dashboard bundles plus the dev/agent file renders. Zero runtime tokens;
 * this CLI is the only place refresh work ever happens.
 *
 *   node tools/explainer/compile.mjs           # write pack + renders
 *   node tools/explainer/compile.mjs --check   # validate only (CI), no writes
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const CHECK_ONLY = process.argv.includes('--check')

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const failures = []
const warnings = []

// ─── 1. DERIVE — parse live truth out of the surfaces' own source ───────────

// 1a. Nav tabs from AppNavbar.vue — the literal { label, to } objects in the
// primaryTabs / sectionTabs computeds. Section attribution by slicing the
// computed bodies, so a moved tab re-classifies itself.
const navSrc = read('src/components/AppNavbar.vue')
const parseTabs = (slice) =>
  [...slice.matchAll(/\{\s*label:\s*'([^']+)',\s*to:\s*(?:'([^']+)'|`([^`]+)`)/g)]
    .map((m) => ({ label: m[1], to: m[2] || m[3] }))
const sliceBetween = (src, startRe, endRe) => {
  const start = src.search(startRe)
  if (start < 0) return ''
  const rest = src.slice(start)
  const end = rest.search(endRe)
  return end < 0 ? rest : rest.slice(0, end)
}
const primaryTabs = parseTabs(sliceBetween(navSrc, /const primaryTabs/, /const sectionTabs/))
const sectionSrc = sliceBetween(navSrc, /const sectionTabs/, /onMounted/)
const adminTabs = parseTabs(sliceBetween(sectionSrc, /isAdminSection\.value/, /isProduction\.value/))
const productionTabs = parseTabs(sliceBetween(sectionSrc, /isProduction\.value/, /if \(isCreateMode\.value\)/))
const docsTabs = parseTabs(sliceBetween(sectionSrc, /isDocs\.value/, /return \[\]/))
if (primaryTabs.length < 3) failures.push(`DERIVE: only ${primaryTabs.length} primary tabs parsed from AppNavbar.vue`)
if (adminTabs.length < 4) failures.push(`DERIVE: only ${adminTabs.length} admin section tabs parsed from AppNavbar.vue`)
if (docsTabs.length < 6) failures.push(`DERIVE: only ${docsTabs.length} docs tabs parsed from AppNavbar.vue`)
if (!productionTabs.some((t) => t.label === 'Overview')) failures.push('DERIVE: production "Overview" tab not found in AppNavbar.vue')

// 1b. Role model — the truth persona rendering hangs off. Roles come from the
// UserManagement role <option>s plus the role computeds in useAuth.
const authSrc = read('src/composables/useAuth.js')
const umSrc = read('src/views/UserManagement.vue')
const roles = new Set([...umSrc.matchAll(/<option value="(\w+)">/g)].map((m) => m[1]))
if (/role === 'recorder'/.test(authSrc)) roles.add('recorder')
for (const r of ['admin', 'editor', 'recorder']) {
  if (!roles.has(r)) failures.push(`DERIVE: role "${r}" no longer found in UserManagement.vue/useAuth.js — persona map is stale`)
}
for (const r of roles) {
  if (!['admin', 'editor', 'recorder'].includes(r)) warnings.push(`role model grew a new role "${r}" — no persona renders for it yet`)
}

// The recorder surface: the Record Room shell (recorders never see the admin
// console). Assert it still exists in the router.
const routerSrc = read('src/router/index.js')
if (!/Record Room/.test(routerSrc)) failures.push('DERIVE: "Record Room" route vanished from src/router/index.js — recorder persona has no surface')

// 1c. Phase pipeline — ONLY the "Active Workflow" headline and the port table
// of SYSTEM.md are trusted; the rest of that file is dated prose.
const systemSrc = read('SYSTEM.md')
const wfMatch = systemSrc.match(/### Active Workflow: ([^\n]+)/)
if (!wfMatch) failures.push('DERIVE: SYSTEM.md lost its "Active Workflow" line')
const phasePorts = [...systemSrc.matchAll(/^\|\s*\*{0,2}(\d{4})\*{0,2}\s*\|\s*\*{0,2}([-\d]+)\*{0,2}\s*\|\s*\*{0,2}([^|*]+?)\*{0,2}\s*\|\s*([^|]+?)\s*\|$/gm)]
  .map((m) => ({ port: m[1], phase: m[2], name: m[3].trim(), status: m[4].trim() }))
if (phasePorts.length < 5) failures.push(`DERIVE: only ${phasePorts.length} phase-port rows parsed from SYSTEM.md`)

// 1d. Gates — from the course-builder's own validation layer, not from docs.
const validationSrc = read('services/course-builder/lib/validation.cjs')
const langConfigSrc = read('services/course-builder/lib/language-config.cjs')
const exportsBlock = sliceBetween(validationSrc, /module\.exports = \{/, /\};/)
const gateFns = [...exportsBlock.matchAll(/^\s*(\w+),?$/gm)].map((m) => m[1]).filter((n) => /^(check|is|classify)/.test(n))
if (gateFns.length < 5) failures.push(`DERIVE: only ${gateFns.length} gate functions parsed from validation.cjs exports`)
const sylMatch = langConfigSrc.match(/const MAX_LEGO_SYLLABLES = (\d+)/)
if (!sylMatch) failures.push('DERIVE: MAX_LEGO_SYLLABLES vanished from language-config.cjs')
// The known-vocab gate went hard-blocking in b77c75f7 — its classifier must exist.
if (!/isKnownVocabBreach/.test(validationSrc)) failures.push('DERIVE: isKnownVocabBreach vanished from validation.cjs — known-vocab gate truth is stale')
const pairContracts = readdirSync(join(ROOT, 'docs/pair-contracts')).filter((f) => f.endsWith('.contract.cjs') && !f.startsWith('_'))

// 1e. Voice policy — the human-voice set + prefix rule, and the standing
// "content passes END BY QUEUEING an audio pass" policy.
const hvSrc = read('services/shared/human-voice-courses.cjs')
const hvSet = sliceBetween(hvSrc, /const HUMAN_VOICE_COURSES = new Set\(\[/, /\]\)/)
const humanVoiceCourses = [...hvSet.matchAll(/'([\w]+)'/g)].map((m) => m[1])
const cymPrefixRule = /\/\^cym_\/\.test/.test(hvSrc)
if (!humanVoiceCourses.length) failures.push('DERIVE: HUMAN_VOICE_COURSES set parsed empty from human-voice-courses.cjs')
if (!cymPrefixRule) failures.push('DERIVE: the cym_* prefix rule vanished from human-voice-courses.cjs')
const apqSrc = read('services/shared/audio-pass-queue.cjs')
if (!/queueAudioPass/.test(apqSrc)) failures.push('DERIVE: queueAudioPass vanished from audio-pass-queue.cjs')

// 1f. Agent API truth — the golden path the course-builder worker agents use.
const seedCompleteSrc = read('services/course-builder/routes/seed-complete.cjs')
const agentEndpoints = [...seedCompleteSrc.matchAll(/router\.(get|post)\('([^']+)'/g)]
  .map((m) => ({ method: m[1].toUpperCase(), path: `/api${m[2]}` }))
if (!agentEndpoints.some((e) => e.path === '/api/seed/complete')) failures.push('DERIVE: POST /seed/complete vanished from seed-complete.cjs')

// 1g. Noticing snapshot — compile-time data baked into the pack. scripts/ is
// gitignored, so the pack is how this data ships; absence is a warning (the
// pack then carries an empty snapshot), not a lie.
let vocabGate = {}
let snapshotNote = null
const auditPath = join(ROOT, 'scripts/vocab-gate/audit-results.json')
if (existsSync(auditPath)) {
  const audit = JSON.parse(readFileSync(auditPath, 'utf8'))
  for (const [course, d] of Object.entries(audit.courses || {})) {
    vocabGate[course] = { knownBreaches: d.known_breaches ?? 0, targetBreaches: d.target_breaches ?? 0, phrases: d.phrases ?? 0 }
  }
  if (!Object.keys(vocabGate).length) failures.push('DERIVE: audit-results.json parsed to zero courses')
} else {
  snapshotNote = 'scripts/vocab-gate/audit-results.json absent on this machine — snapshot carried over is empty'
  warnings.push(snapshotNote)
}

// ─── 2. RULINGS — the hand-written persona voices ───────────────────────────

const APP_PERSONAS = ['admin', 'editor', 'recorder']
const FILE_PERSONAS = ['dev', 'agent']
const explanations = {}
for (const persona of [...APP_PERSONAS, ...FILE_PERSONAS]) {
  const src = readFileSync(join(HERE, 'rulings', `${persona}.md`), 'utf8')
  const body = src.replace(/<!--[\s\S]*?-->/g, '')
  explanations[persona] = {}
  for (const m of body.matchAll(/^## ([\w-]+)\n([\s\S]*?)(?=^## |\s*$(?![\s\S]))/gm)) {
    explanations[persona][m[1]] = m[2].trim()
  }
  if (!Object.keys(explanations[persona]).length) failures.push(`RULINGS: ${persona}.md has no "## <section>" sections`)
}

// ─── 3. VALIDATE — the drift gate ───────────────────────────────────────────

// 3a. Every nav surface a persona can stand on must be named in that
// persona's ruling — the exact moment a static doc would have silently
// rotted. Visibility is the app's own: admins get the admin console; editors
// get Courses/Docs/production Overview; recorders get the Record Room shell.
const mustName = {
  admin: [...primaryTabs, ...adminTabs].map((t) => t.label),
  editor: [
    ...primaryTabs.filter((t) => t.label !== 'Admin'),
    ...productionTabs,
    ...docsTabs,
  ].map((t) => t.label),
  recorder: ['Record Room'],
}
for (const persona of APP_PERSONAS) {
  const all = Object.values(explanations[persona]).join('\n').replace(/\s+/g, ' ')
  for (const label of new Set(mustName[persona])) {
    if (!all.includes(label)) failures.push(`DRIFT: "${label}" is on ${persona}'s surface but ${persona}.md never names it`)
  }
}

// 3b. Noticing rules. Snapshot rules must read fields the snapshot shape
// carries; payload rules must read fields the mapped fetch source still
// mentions (tools/explainer/payload-map.json names the source file per
// mount). Targets must be real router paths.
// Snapshot fields = what the compiler itself bakes (1g), plus the item-join
// fields a perChild snapshot rule reads off the page's own array items
// (rules.json `joinConvention`). Mount-resolved fields are pack-truth lookups
// the mount computes before invoking the evaluator — validated against the
// truth they read, not against a payload.
const SNAPSHOT_FIELDS = ['knownBreaches', 'targetBreaches', 'phrases', 'code', 'name', 'courses']
const MOUNT_RESOLVED = { 'courseFlags.isHumanVoiceCourse': () => humanVoiceCourses.length > 0 }
const rulesPath = join(HERE, 'rules.json')
let rules = []
if (existsSync(rulesPath)) {
  rules = JSON.parse(readFileSync(rulesPath, 'utf8')).rules
  // payload-map.json (see its header): per-page trace of what each mount
  // already fetches, incl. the server files that emit the fields.
  const pmPath = join(HERE, 'payload-map.json')
  const payloadMap = existsSync(pmPath) ? JSON.parse(readFileSync(pmPath, 'utf8')) : { pages: {} }
  const mountEntries = Object.values(payloadMap.pages || {})
  // Every source file a map entry cites (Vue page + server emitters) — a rule
  // field must still appear in at least one of them.
  const entryFiles = (entry) => {
    const cited = JSON.stringify(entry).matchAll(/(src\/[\w/.-]+\.(?:vue|js)|services\/[\w/.-]+\.cjs)/g)
    return [...new Set([entry.path, ...[...cited].map((m) => m[1])])].filter(Boolean)
  }
  for (const rule of rules) {
    if (!['snapshot', 'payload'].includes(rule.source)) failures.push(`RULES: rule "${rule.id}" has unknown source "${rule.source}"`)
    if (!['node', 'perChild', 'countWhere'].includes(rule.shape)) failures.push(`RULES: rule "${rule.id}" has unknown shape "${rule.shape}"`)
    for (const p of rule.personas || []) {
      if (!APP_PERSONAS.includes(p)) failures.push(`RULES: rule "${rule.id}" targets unknown persona "${p}"`)
    }
    const paths = [
      ...(rule.when ?? []).map((c) => c.path),
      ...(rule.itemWhen ?? []).map((c) => c.path),
      ...[...rule.invitation.matchAll(/\{([\w.]+)\}/g)].map((m) => m[1]).filter((p) => p !== 'count'),
      ...(rule.arrayPath ? [rule.arrayPath] : []),
      ...[...(rule.cta?.target ?? '').matchAll(/\{([\w.]+)\}/g)].map((m) => m[1]),
    ]
    for (const p of paths) {
      if (MOUNT_RESOLVED[p]) {
        if (!MOUNT_RESOLVED[p]()) failures.push(`DRIFT: rule "${rule.id}" reads mount-resolved "${p}" but its truth source is empty`)
        continue
      }
      const leaf = p.split('.').pop()
      if (rule.source === 'snapshot') {
        if (!SNAPSHOT_FIELDS.includes(leaf)) {
          failures.push(`DRIFT: snapshot rule "${rule.id}" reads "${p}" but the snapshot/join only carries ${SNAPSHOT_FIELDS.join('/')}`)
        }
      } else {
        const entry = mountEntries.find((e) => e.mount === rule.mount && (e.noticingFieldsPresent || e.clientFieldsAssigned))
        if (!entry) { failures.push(`RULES: payload rule "${rule.id}" has mount "${rule.mount}" with no payload-map entry`); continue }
        if (!JSON.stringify(entry).includes(leaf)) {
          failures.push(`DRIFT: rule "${rule.id}" reads "${p}" but the ${rule.mount} payload-map entry never declares "${leaf}" — retrace the fetch`)
        }
        if (!entryFiles(entry).some((f) => { try { return read(f).includes(leaf) } catch { return false } })) {
          failures.push(`DRIFT: rule "${rule.id}" reads "${p}" but no source file cited for mount "${rule.mount}" still mentions "${leaf}"`)
        }
      }
    }
    // CTA target: 'self' (the invitation stands on the page that holds the
    // data) or a real router path, {param} tolerated.
    const target = rule.cta?.target
    const targetBase = (target || '').replace(/\{[\w.]+\}.*$/, '').replace(/\/$/, '')
    if (target !== 'self' && (!targetBase.startsWith('/') || !routerSrc.includes(`'${targetBase}`))) {
      failures.push(`DRIFT: rule "${rule.id}" links "${target}" but src/router/index.js has no such path`)
    }
  }
} else {
  warnings.push('rules.json absent — pack will carry zero noticing rules (fine mid-build, wrong at ship)')
  if (CHECK_ONLY) failures.push('RULES: rules.json missing in --check mode')
}

// 3c. Human-voice noticing sanity: any rule naming a course must name one the
// policy actually covers.
for (const rule of rules) {
  for (const code of (rule.courses ?? [])) {
    if (!humanVoiceCourses.includes(code) && !/^cym_/.test(code)) {
      failures.push(`DRIFT: rule "${rule.id}" names course "${code}" which is not in the human-voice policy`)
    }
  }
}

// 3d. LOCKSTEP — the runtime evaluator must speak the same rule language the
// compiler validates (shapes, ops, source kinds, the 'self' CTA semantics).
try {
  const evalSrc = read('src/explainer/evaluateRules.js')
  for (const needle of ['perChild', 'countWhere', 'daysSinceGt', 'snapshot', 'payload']) {
    if (!evalSrc.includes(needle)) failures.push(`LOCKSTEP: evaluateRules.js no longer handles '${needle}'`)
  }
} catch {
  warnings.push('LOCKSTEP: src/explainer/evaluateRules.js not found yet (first compile before the runtime exists)')
}

// ─── Report ─────────────────────────────────────────────────────────────────
for (const w of warnings) console.log(`  ⚠ ${w}`)
if (failures.length) {
  console.error(`\n[explainer] COMPILE FAILED — the pack would lie about Popty:`)
  for (const f of failures) console.error(`  ✗ ${f}`)
  console.error('\nFix the surface parse, or re-author the affected ruling, then re-run.')
  process.exit(1)
}

// ─── 4. ASSEMBLE ────────────────────────────────────────────────────────────

const truth = {
  navTabs: { primary: primaryTabs, admin: adminTabs, production: productionTabs, docs: docsTabs },
  roles: [...roles].sort(),
  activeWorkflow: wfMatch?.[1]?.trim() ?? null,
  phasePorts,
  gates: {
    functions: gateFns,
    maxLegoSyllables: Number(sylMatch?.[1]),
    knownVocabGateBlocking: true,
    pairContracts,
  },
  voicePolicy: { humanVoiceCourses, cymPrefixRule, contentPassesQueueAudio: true },
  agentEndpoints,
}
const appExplanations = Object.fromEntries(APP_PERSONAS.map((p) => [p, explanations[p]]))
const snapshot = { vocabGate, note: snapshotNote, generatedAt: new Date().toISOString().slice(0, 10) }
const content = JSON.stringify({ truth, appExplanations, rules, vocabGate })
const pack = {
  version: createHash('sha256').update(content).digest('hex').slice(0, 12),
  generatedAt: new Date().toISOString().slice(0, 10),
  truth,
  explanations: appExplanations,
  rules,
  snapshot,
}

if (CHECK_ONLY) {
  console.log(`[explainer] check OK — pack version would be ${pack.version} (${Object.keys(mustName).length} personas · ${gateFns.length} gates · ${rules.length} rules · ${Object.keys(vocabGate).length} snapshot courses)`)
  process.exit(0)
}

const packPath = join(ROOT, 'src/explainer/pack.json')
mkdirSync(dirname(packPath), { recursive: true })
writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n')

// ─── 5. RENDERS — human-readable pack + the dev/agent file personas ─────────

const section = (p) => Object.entries(explanations[p]).flatMap(([k, t]) => [`### ${k}`, '', t, ''])
writeFileSync(join(ROOT, 'docs/explainer-pack.md'), [
  `# Popty explanation pack — compiled render`,
  ``,
  `**Version \`${pack.version}\` · generated ${pack.generatedAt} by \`tools/explainer/compile.mjs\`. DO NOT EDIT — edit the rulings/rules and recompile.**`,
  ``,
  `Truth: roles ${truth.roles.join('/')} · workflow "${truth.activeWorkflow}" · ${gateFns.length} gates · max LEGO syllables ${truth.gates.maxLegoSyllables} · human-voice: ${humanVoiceCourses.join(', ')} + cym_* prefix · ${pairContracts.length} pair contracts · snapshot: ${Object.keys(vocabGate).length} courses.`,
  ``,
  ...APP_PERSONAS.flatMap((p) => [`## ${p}`, ``, ...section(p)]),
  `## Noticing rules`,
  ``,
  ...rules.map((r) => `- **${r.id}** (${r.shape}, ${r.source}, mount ${r.mount}, ${(r.personas || []).join('/')}): "${r.invitation}" → ${r.cta.target}`),
  ``,
].join('\n'))

// The agent render — generated API/pipeline truth for the course-builder
// worker agents, replacing hand-maintained agent docs that rot.
writeFileSync(join(ROOT, 'docs/explainer-agent.md'), [
  `# Popty for course-builder agents — compiled`,
  ``,
  `**Version \`${pack.version}\` · generated ${pack.generatedAt}. DO NOT EDIT — this file is derived from the course-builder's own source; edit tools/explainer/rulings/agent.md for the voice, or the code for the facts, then recompile.**`,
  ``,
  ...section('agent'),
  `## Derived truth (from the code, this compile)`,
  ``,
  `- Endpoints in \`services/course-builder/routes/seed-complete.cjs\`: ${agentEndpoints.map((e) => `\`${e.method} ${e.path}\``).join(' · ')}`,
  `- Validation gates (\`validation.cjs\` exports): ${gateFns.map((g) => `\`${g}\``).join(', ')}`,
  `- \`MAX_LEGO_SYLLABLES = ${truth.gates.maxLegoSyllables}\` (\`language-config.cjs\`; runs even under skip_validation)`,
  `- Known-vocab gate is HARD-BLOCKING (\`isKnownVocabBreach\`, since b77c75f7): known-side vocab breaches 400 the submission.`,
  `- Pair contracts on disk: ${pairContracts.join(', ')} (+ \`_default_eng\` fallback for eng-known courses).`,
  `- Human-voice-only courses (TTS refused at the chokepoint): ${humanVoiceCourses.join(', ')}, plus every \`cym_*\` course.`,
  `- Content passes end by QUEUEING an audio pass (\`queueAudioPass\`), never by running TTS.`,
  ``,
].join('\n'))

// The dev render — pipeline + repo orientation.
writeFileSync(join(ROOT, 'docs/explainer-dev.md'), [
  `# Popty for developers — compiled`,
  ``,
  `**Version \`${pack.version}\` · generated ${pack.generatedAt}. DO NOT EDIT — derived; edit tools/explainer/rulings/dev.md or the code, then recompile.**`,
  ``,
  ...section('dev'),
  `## Derived truth (from the code, this compile)`,
  ``,
  `- Active workflow (SYSTEM.md): ${truth.activeWorkflow}`,
  `- Phase servers: ${phasePorts.map((p) => `${p.name} :${p.port}${p.phase !== '-' ? ` (phase ${p.phase})` : ''}`).join(' · ')}`,
  `- Roles (dashboard_users.role): ${truth.roles.join(', ')} — persona rendering hangs off exactly these.`,
  `- Nav surfaces: ${primaryTabs.map((t) => t.label).join(' / ')}; admin section: ${adminTabs.map((t) => t.label).join(', ')}; docs: ${docsTabs.map((t) => t.label).join(', ')}.`,
  ``,
].join('\n'))

console.log(`[explainer] pack ${pack.version} written — ${APP_PERSONAS.length}+${FILE_PERSONAS.length} personas · ${gateFns.length} gates · ${rules.length} rules · ${Object.keys(vocabGate).length} snapshot courses`)
console.log(`  → src/explainer/pack.json`)
console.log(`  → docs/explainer-pack.md · docs/explainer-agent.md · docs/explainer-dev.md`)
