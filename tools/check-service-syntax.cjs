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
 * Call sites, deliberately all the same tool:
 *   - CI (.github/workflows/explainer-check.yml) and `npm test`, with no args:
 *     checks every service entrypoint, so a bad merge fails the push.
 *   - The auto-merge workflow, with --all, on the MERGE RESULT before it is
 *     pushed to main. This is the one that would have caught 186af122: the
 *     broken file existed on neither parent, so no check of the branch itself
 *     could see it, and auto-merge pushes without waiting for any other job.
 *   - The deploy path (ops/watchdog/popty-staleness-watchdog.sh), with --range,
 *     after the pull and BEFORE any restart. On failure the checkout is rolled
 *     back and the last-known-good process is left running — make-before-break.
 *   - systemd ExecStartPre (ops/systemd/popty-*.service), with the entrypoint
 *     named explicitly: refuses to start a parse-broken file and says so loudly
 *     in the service log instead of looping silently. The last line of defence,
 *     not the first — by then the old process is already gone.
 *
 * Dependency-free node on purpose — CI runs it without an npm install, and
 * ExecStartPre runs it before the service has any environment to speak of.
 *
 * Usage:
 *   node tools/check-service-syntax.cjs                 # services/ entrypoints
 *   node tools/check-service-syntax.cjs --all           # every tracked JS file
 *   node tools/check-service-syntax.cjs --range A..B    # JS changed in a git range
 *   node tools/check-service-syntax.cjs path/one.cjs …  # named files
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const REPO_ROOT = path.resolve(__dirname, '..')
const SERVICES_DIR = path.join(REPO_ROOT, 'services')

// Entrypoints only: the top level of services/. Requiring a Popty CLI can start
// a real run, so this never loads a module — parsing is all this ever does.
const IS_JS = /\.(c?js|mjs)$/

// *.test.cjs used to be excluded by name, because those are vitest specs written
// with ESM `import` under a .cjs extension and a plain `node --check` rejects all
// twenty of them. Name-exclusion stops working the moment the gate widens to
// --all/--range, so the checker now tries BOTH grammars instead: a file passes if
// it parses as CommonJS or as an ES module. That is the honest question anyway —
// "can anything parse this?" — and it means no file has to be trusted by name.
// In-process, because --all spans 580 files and a subprocess each turns a 9s gate
// into a 24s one on the auto-merge critical path. This is what `node --check`
// does: compile inside the CommonJS module wrapper (which is what makes top-level
// `return` legal) and never run a line of it. Hashbangs are stripped as node does.
function parsesAsCommonJs(file) {
  try {
    const body = fs.readFileSync(file, 'utf-8').replace(/^#!.*/, '')
    new vm.Script(`(function (exports, require, module, __filename, __dirname) {${body}\n})`, { filename: file })
    return null
  } catch (err) {
    return `${err.name}: ${err.message}`
  }
}

function parsesAsModule(file) {
  try {
    execFileSync(process.execPath, ['--input-type=module', '--check'], {
      input: fs.readFileSync(file, 'utf-8').replace(/^#!.*/, ''),
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return null
  } catch (err) {
    return (err.stderr || err.stdout || '').toString().trim() || String(err)
  }
}

// The units are in the repo, so the list of things this estate actually STARTS is
// a fact we can read rather than a list to keep in sync by hand. Two of them —
// phase8 and the orchestrator — live in subdirectories of services/ and would be
// missed by a top-level sweep, which is exactly how an entrypoint stops being
// covered without anyone noticing.
function unitEntrypoints() {
  const dir = path.join(REPO_ROOT, 'ops', 'systemd')
  if (!fs.existsSync(dir)) return []
  const found = []
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.service')) continue
    const text = fs.readFileSync(path.join(dir, name), 'utf-8')
    for (const line of text.split('\n')) {
      const m = /^ExecStart=.*?\bnode\s+(\S+)/.exec(line.trim())
      if (m && IS_JS.test(m[1])) found.push(path.resolve(REPO_ROOT, m[1]))
    }
  }
  return found
}

function defaultTargets() {
  const topLevel = fs
    .readdirSync(SERVICES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && IS_JS.test(e.name))
    .map((e) => path.join(SERVICES_DIR, e.name))
  return [...new Set([...topLevel, ...unitEntrypoints()])].filter((f) => fs.existsSync(f)).sort()
}

function trackedJsFiles(args) {
  const out = execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8', timeout: 30000 })
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((f) => IS_JS.test(f))
    .map((f) => path.join(REPO_ROOT, f))
    .filter((f) => fs.existsSync(f))
}

function resolveTargets(argv) {
  const rangeIdx = argv.indexOf('--range')
  if (rangeIdx !== -1) {
    const range = argv[rangeIdx + 1]
    if (!range) throw new Error('--range needs a git range, e.g. --range OLD..NEW')
    // ACMR: files the range added or changed. A deleted file has nothing to parse.
    return trackedJsFiles(['diff', '--name-only', '--diff-filter=ACMR', range])
  }
  if (argv.includes('--all')) return trackedJsFiles(['ls-files', '*.js', '*.cjs', '*.mjs'])
  const named = argv.filter((a) => !a.startsWith('--'))
  if (named.length) return named.map((p) => path.resolve(REPO_ROOT, p))
  return defaultTargets()
}

let targets
try {
  targets = resolveTargets(process.argv.slice(2))
} catch (err) {
  // Not knowing what to check is a failure, not a pass. A deploy path must never
  // read "0 problems" out of "0 information".
  console.error(`Syntax gate: cannot determine what to check — ${err.message}`)
  process.exit(1)
}

const failures = []
for (const file of targets) {
  if (!fs.existsSync(file)) {
    failures.push({ file, message: 'file does not exist' })
    continue
  }
  const cjsError = parsesAsCommonJs(file)
  if (!cjsError) continue
  if (!parsesAsModule(file)) continue
  // Neither grammar accepts it. Report the CommonJS error — for a genuinely
  // broken file both describe the same defect and this one names the line.
  failures.push({ file, message: cjsError })
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

if (!targets.length) {
  console.log('Syntax gate OK — no JavaScript files in scope')
} else if (targets.length <= 12) {
  console.log(`Syntax gate OK — ${targets.length} file(s) parse: ${targets.map(rel).join(', ')}`)
} else {
  console.log(`Syntax gate OK — ${targets.length} files parse`)
}
