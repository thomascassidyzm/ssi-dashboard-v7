#!/usr/bin/env node
/**
 * Syntax gate for the server entrypoints.
 *
 * Why this exists: on 2026-08-08 merge 186af122 combined the same silent-take
 * guard from BOTH of its parents, putting two `const MIN_TAKE_MS = 100` in one
 * function scope of services/production-api.cjs. Every commit up to that merge
 * parsed; the merge produced a file neither author wrote. Node refused to parse
 * it, so popty-production-api crash-looped on watson-1 and every dot in the
 * popty.app env switcher went red. The file sat unparseable on main until the
 * service next restarted — a latent bomb, because nothing on the estate ran
 * `node --check` between "merged to main" and "the -prod checkout executes it".
 *
 * Two call sites, deliberately the same tool:
 *   - CI (.github/workflows/explainer-check.yml) and `npm test`, with no args:
 *     checks every service entrypoint, so a bad merge fails the push.
 *   - systemd ExecStartPre (ops/systemd/popty-production-api.service), with the
 *     entrypoint named explicitly: refuses to start a parse-broken file and says
 *     so loudly in the service log instead of looping silently.
 *
 * Dependency-free node on purpose — CI runs it without an npm install, and
 * ExecStartPre runs it before the service has any environment to speak of.
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..')
const SERVICES_DIR = path.join(REPO_ROOT, 'services')

// Entrypoints only: the top level of services/. Requiring a Popty CLI can start
// a real run, so this never loads a module — `node --check` parses and exits.
//
// *.test.cjs is excluded deliberately: those are vitest specs written with ESM
// `import` despite the .cjs extension, so `node --check` rejects every one of
// them as "Cannot use import statement outside a module". That is correct for
// them and meaningless here — vitest parses them under its own loader, and none
// of them is ever a service entrypoint. Including them would make the gate cry
// wolf 20 times and get switched off, which is how gates die.
const IS_TEST = /\.test\.(c?js|mjs)$/

function defaultTargets() {
  return fs
    .readdirSync(SERVICES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(c?js|mjs)$/.test(e.name) && !IS_TEST.test(e.name))
    .map((e) => path.join(SERVICES_DIR, e.name))
    .sort()
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => path.resolve(REPO_ROOT, p))
  : defaultTargets()

const failures = []
for (const file of targets) {
  if (!fs.existsSync(file)) {
    failures.push({ file, message: 'file does not exist' })
    continue
  }
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
  } catch (err) {
    failures.push({ file, message: (err.stderr || err.stdout || '').toString().trim() || String(err) })
  }
}

const rel = (f) => path.relative(REPO_ROOT, f) || f

if (failures.length) {
  console.error('')
  console.error('=========================================================')
  console.error(' SYNTAX GATE FAILED — these files cannot be parsed by node')
  console.error('=========================================================')
  for (const f of failures) {
    console.error('')
    console.error(`  ${rel(f.file)}`)
    console.error(
      f.message
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n')
    )
  }
  console.error('')
  console.error(' A service cannot start from a file node cannot parse, and a')
  console.error(' supervisor cannot restart its way out of it. Fix the file.')
  console.error(' Duplicate declarations from a merge are the known shape here:')
  console.error(' check whether a merge kept both sides of the same block.')
  console.error('')
  process.exit(1)
}

console.log(`Syntax gate OK — ${targets.length} entrypoint(s) parse: ${targets.map(rel).join(', ')}`)
