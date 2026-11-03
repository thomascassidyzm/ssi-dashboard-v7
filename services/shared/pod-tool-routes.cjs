// services/shared/pod-tool-routes.cjs
//
// THE POD TOOLS, AS POPTY ROUTES (job #809, Tom 2026-11-03,
// r-2026-11-03-agents-act-on-popty-only-thr: "it's still just triggering the
// tools that exist in popty, rather than making up its own scripts").
//
// Three steps of a pod change used to be CLI tools an agent ran with a database
// login of its own: clone pod-1 to a held slug, move a staged line into the
// language's pod text, and switch over with learner progress migrated. These
// routes run THE SAME COMMITTED TOOLS, unchanged, as child processes of Popty,
// with Popty's own database login — so the agent needs no DB access at all, and
// every run is logged under the agent id the signed key proved.
//
// Why a child process and not require(): all three tools parse process.argv at
// load and call process.exit() on a refusal (pod-switchover at module scope).
// Run in-process, a refused switchover would take the Production API down with
// it. A child keeps each tool's own refusals, transaction and output exactly as
// the CLI has them — nothing re-implemented, nothing to drift.
//
// DRY RUN unless the body says "apply": true — the tools' own default, kept.
// Flags are an ALLOW-LIST per tool: a body key that is not listed is refused,
// and every human-only escape hatch is deliberately absent — clone's
// --serve-now (a copy onto a slug learners are served), switchover's
// --accept-miscredit / --accept-uncast-pod / --accept-inherited-split-audio /
// --rehearsal. Those stay a person at a terminal, never a standing agent key.

'use strict'

const path = require('path')
const { execFile } = require('child_process')

const REPO_ROOT = path.join(__dirname, '..', '..')
const SLUG = /^[a-z0-9][a-z0-9_.-]{0,63}$/
const COURSE = /^[a-z0-9_]{3,40}$/
const TEXT = /^[^\n\r\0]{0,200}$/
const ROLE = /^[a-z0-9_.-]{1,64}$/

// body key -> { flag, re }  (value flags render as --flag=value)
// bool body key -> flag     (true renders as --flag)
const POD_TOOLS = Object.freeze({
  clone: {
    script: 'tools/pods/clone-pod.cjs',
    operation: 'pod-clone',
    values: {
      from: { flag: 'from', re: SLUG },
      to: { flag: 'to', re: SLUG },
      toCourse: { flag: 'to-course', re: COURSE },
      titleSuffix: { flag: 'title-suffix', re: TEXT },
      visibility: { flag: 'visibility', re: /^(held|draft)$/ }, // never 'live': going live is a human act
      requiredRole: { flag: 'required-role', re: ROLE },
    },
    required: ['to'],
    bools: {},
  },
  'language-text': {
    script: 'tools/pods/language-text-for-staged-pod.cjs',
    operation: 'pod-language-text',
    values: {
      staged: { flag: 'staged', re: SLUG },
      lines: { flag: 'lines', re: /^\d{1,4}(,\d{1,4}){0,199}$/ },
      bind: { flag: 'bind', re: SLUG },
    },
    required: [],
    bools: {},
  },
  switchover: {
    script: 'tools/pods/pod-switchover.cjs',
    operation: 'pod-switchover',
    values: {
      live: { flag: 'live', re: SLUG },
      staged: { flag: 'staged', re: SLUG },
      stamp: { flag: 'stamp', re: /^[0-9a-z-]{4,32}$/ },
      promoteTo: { flag: 'promote-to', re: SLUG },
      title: { flag: 'title', re: TEXT },
    },
    required: ['staged'],
    bools: { rollback: 'rollback' },
  },
})

/**
 * PURE. Body -> argv for the tool, or a refusal. `apply` is the only write switch.
 * @returns {{ argv: string[], apply: boolean } | { error: string }}
 */
function buildPodToolArgv (toolName, courseCode, body) {
  const tool = POD_TOOLS[toolName]
  if (!tool) return { error: `unknown pod tool ${toolName}` }
  if (!COURSE.test(String(courseCode || ''))) return { error: 'bad course code' }
  const b = body && typeof body === 'object' ? body : {}
  const argv = [`--course=${courseCode}`]
  for (const key of Object.keys(b)) {
    if (key === 'apply') continue
    if (tool.values[key]) {
      const v = b[key]
      if (typeof v !== 'string' || !tool.values[key].re.test(v)) return { error: `${key}: not an accepted value` }
      argv.push(`--${tool.values[key].flag}=${v}`)
    } else if (tool.bools[key]) {
      if (typeof b[key] !== 'boolean') return { error: `${key} must be true or false` }
      if (b[key]) argv.push(`--${tool.bools[key]}`)
    } else {
      return { error: `${key} is not a flag this route passes to ${tool.script} (allowed: ${[...Object.keys(tool.values), ...Object.keys(tool.bools), 'apply'].join(', ')})` }
    }
  }
  for (const r of tool.required) if (!b[r]) return { error: `${r} is required` }
  // clone-pod copies the SOURCE's visibility when none is named, so a copy of a
  // live pod-1 would be born live. Through this route a clone is held unless the
  // caller names draft: a held slug is the whole point of the copy.
  if (toolName === 'clone' && !b.visibility) argv.push('--visibility=held')
  const apply = b.apply === true
  if (apply) argv.push('--apply')
  return { argv, apply }
}

const tail = (s, n = 20000) => (s.length > n ? '…' + s.slice(-n) : s)

/** Run one committed pod tool as a child, with Popty's database login. Never throws. */
function runPodTool ({ script, argv, databaseUrl, agentId, timeoutMs = 15 * 60 * 1000, exec = execFile }) {
  return new Promise((resolve) => {
    const env = { ...process.env, DATABASE_URL: databaseUrl, CS_JOB_LABEL: agentId || 'popty-pod-route' }
    exec(process.execPath, [path.join(REPO_ROOT, script), ...argv], { cwd: REPO_ROOT, env, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      const exitCode = err ? (typeof err.code === 'number' ? err.code : null) : 0
      resolve({ exitCode, killed: !!(err && err.killed), stdout: tail(String(stdout || '')), stderr: tail(String(stderr || '')) })
    })
  })
}

/**
 * The express handler for POST /api/admin/pods/:courseCode/<tool>.
 * deps: { gate(req,res) -> user|null, databaseUrl() -> string, logger }
 */
function podToolRoute (toolName, { gate, databaseUrl, logger = console, run = runPodTool }) {
  const tool = POD_TOOLS[toolName]
  return async function handler (req, res) {
    const who = await gate(req, res)
    if (!who) return
    const built = buildPodToolArgv(toolName, req.params.courseCode, req.body)
    if (built.error) { req.contentEdit?.wroteNothing(); return res.status(400).json({ error: built.error }) }
    const agentId = (req.agentAdmin && req.agentAdmin.agent) || who.email || who.id || 'unknown'
    let url
    try { url = databaseUrl() } catch (e) { req.contentEdit?.wroteNothing(); return res.status(503).json({ error: `Popty has no database login for pod tools: ${e.message}` }) }
    logger.info?.(`[PodTool] ${agentId} ${toolName} ${built.apply ? 'APPLY' : 'dry-run'} ${tool.script} ${built.argv.join(' ')}`)
    const out = await run({ script: tool.script, argv: built.argv, databaseUrl: url, agentId })
    logger.info?.(`[PodTool] ${agentId} ${toolName} -> exit ${out.exitCode}${out.killed ? ' (timed out)' : ''}`)
    const ok = out.exitCode === 0
    if (!ok || !built.apply) req.contentEdit?.wroteNothing()
    else if (req.contentEdit) await req.contentEdit.record({ operation: tool.operation, scope: { course_code: req.params.courseCode, tool: tool.script }, detail: { argv: built.argv, by: agentId } }).catch(() => {})
    // exit 2 = the tool's own reasoned refusal (language-text); 1 = refused/failed.
    res.status(ok ? 200 : 409).json({ ok, tool: tool.script, apply: built.apply, by: agentId, argv: built.argv, ...out })
  }
}

module.exports = { POD_TOOLS, buildPodToolArgv, runPodTool, podToolRoute }
