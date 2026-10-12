// THE PROCEDURE RUNNER — launches a registered procedure as its own systemd --user unit and reads
// its state back. Nothing here knows what any procedure does; registry.cjs owns that.
//
// WHY A UNIT AND NOT A CHILD PROCESS. A child of production-api dies with it, and production-api
// restarts on every deploy (tools/deploy/auto-deploy-prod.cjs, every two minutes when main moves).
// A transient unit is forked by the user manager, so a run outlives the API, a deploy and the
// operator closing the tab — the same reason the command surface runs its long jobs as cs-long-*
// units (Tom, 2026-09-01). The unit sits in cs-workers.slice, the estate's aggregate CPU cap.
//
// THE RUN DIRECTORY IS THE RECORD. ~/.local/share/popty-procedures/runs/<runId>/ holds
//   run.json   what was asked: procedure, mode (dry-run | run | undo), inputs, argv, who, when
//   out.log    the tool's stdout+stderr, as it happens
//   exit       the exit code, written by the unit's own shell when the tool ends
// so the state of a run is a fact on disk, readable after any restart: no exit file and a live
// unit = running; an exit file = finished; neither = lost (the unit died without finishing).
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFile } = require('child_process')

const HOME_DIR = process.env.POPTY_PROC_HOME || path.join(process.env.HOME || '/tmp', '.local/share/popty-procedures')
const RUNS_DIR = path.join(HOME_DIR, 'runs')
const SLICE = 'cs-workers.slice'
const UNIT_PREFIX = 'popty-proc-'

// The unit's shell: run the argv exactly as given ("$@" — never a string built from inputs), then
// record the exit code. stdout+stderr both go to out.log.
const UNIT_SHELL = '"$@" >>"$PROC_OUT" 2>&1; code=$?; echo "$code" >"$PROC_EXIT.tmp" && mv "$PROC_EXIT.tmp" "$PROC_EXIT"'

const newRunId = (now = new Date()) => `${now.toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${crypto.randomBytes(3).toString('hex')}`
const runDir = (id) => path.join(RUNS_DIR, id)
const RUN_ID_RE = /^\d{14}-[0-9a-f]{6}$/

// The systemd-run argv for one run. Pure, so the test can assert the shape that matters: a unit of
// its own, in the slice, with a runtime ceiling, and the tool's argv passed through untouched.
function systemdRunArgv({ runId, cwd, argv, timeoutMin, env = {} }) {
  const dir = runDir(runId)
  const sets = { PROC_OUT: path.join(dir, 'out.log'), PROC_EXIT: path.join(dir, 'exit'), POPTY_PROC_HOME: HOME_DIR, ...env }
  return [
    '--user', `--unit=${UNIT_PREFIX}${runId}`, `--slice=${SLICE}`, '--collect', '--quiet',
    `--working-directory=${cwd}`,
    `--property=RuntimeMaxSec=${Math.max(1, timeoutMin || 30) * 60}`,
    ...Object.entries(sets).map(([k, v]) => `--setenv=${k}=${v}`),
    '/bin/bash', '-c', UNIT_SHELL, 'popty-proc', ...argv,
  ]
}

function execP(cmd, args, env) {
  return new Promise((resolve) => execFile(cmd, args, { timeout: 15000, env: env ? { ...process.env, ...env } : process.env }, (err, stdout, stderr) => resolve({ code: err ? (err.code ?? 1) : 0, stdout: String(stdout), stderr: String(stderr) })))
}

const systemEnvFor = () => ({ PATH: process.env.PATH, HOME: process.env.HOME, XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid()}`, DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS || `unix:path=/run/user/${process.getuid()}/bus` })

/**
 * Launch one run. `record` is everything run.json should say (procedure, mode, inputs, by, …).
 * Returns the run as readRun() would show it.
 */
async function launch({ record, argv, cwd, timeoutMin, exec = execP }) {
  const runId = newRunId()
  fs.mkdirSync(runDir(runId), { recursive: true })
  const run = { id: runId, unit: `${UNIT_PREFIX}${runId}`, startedAt: new Date().toISOString(), argv, cwd, ...record }
  fs.writeFileSync(path.join(runDir(runId), 'run.json'), JSON.stringify(run, null, 2))
  fs.writeFileSync(path.join(runDir(runId), 'out.log'), `$ ${argv.join(' ')}\n`)
  const r = await exec('systemd-run', systemdRunArgv({ runId, cwd, argv, timeoutMin }), systemEnvFor())
  if (r.code !== 0) {
    fs.appendFileSync(path.join(runDir(runId), 'out.log'), `\n[runner] systemd-run refused: ${r.stderr || r.stdout}\n`)
    fs.writeFileSync(path.join(runDir(runId), 'exit'), '127\n')
  }
  return readRun(runId)
}

async function unitActive(unit, exec = execP) {
  const r = await exec('systemctl', ['--user', 'is-active', unit], systemEnvFor())
  return r.stdout.trim() === 'active' || r.stdout.trim() === 'activating'
}

/** The run as it stands: record + state ('running' | 'ok' | 'failed' | 'lost') + exit code. */
async function readRun(id, { exec = execP } = {}) {
  if (!RUN_ID_RE.test(id)) return null
  const f = path.join(runDir(id), 'run.json')
  if (!fs.existsSync(f)) return null
  const run = JSON.parse(fs.readFileSync(f, 'utf8'))
  const exitFile = path.join(runDir(id), 'exit')
  if (fs.existsSync(exitFile)) {
    const code = Number(fs.readFileSync(exitFile, 'utf8').trim())
    const st = fs.statSync(exitFile)
    return { ...run, state: code === 0 ? 'ok' : 'failed', exitCode: code, endedAt: st.mtime.toISOString() }
  }
  return { ...run, state: (await unitActive(run.unit, exec)) ? 'running' : 'lost', exitCode: null }
}

/** A slice of out.log from byte `from`, capped, so the page can follow a run incrementally. */
function readLog(id, from = 0, max = 256 * 1024) {
  if (!RUN_ID_RE.test(id)) return null
  const f = path.join(runDir(id), 'out.log')
  if (!fs.existsSync(f)) return { text: '', next: 0, size: 0 }
  const size = fs.statSync(f).size
  const start = Math.max(0, Math.min(Number(from) || 0, size))
  const len = Math.min(max, size - start)
  const buf = Buffer.alloc(len)
  if (len) { const fd = fs.openSync(f, 'r'); fs.readSync(fd, buf, 0, len, start); fs.closeSync(fd) }
  return { text: buf.toString('utf8'), next: start + len, size }
}

/** Newest first. States are resolved, so a list never shows a dead unit as running. */
async function listRuns({ limit = 40, exec = execP } = {}) {
  if (!fs.existsSync(RUNS_DIR)) return []
  const ids = fs.readdirSync(RUNS_DIR).filter((d) => RUN_ID_RE.test(d)).sort().reverse().slice(0, limit)
  const runs = []
  for (const id of ids) { const r = await readRun(id, { exec }); if (r) runs.push(r) }
  return runs
}

module.exports = { launch, readRun, readLog, listRuns, systemdRunArgv, newRunId, RUN_ID_RE, RUNS_DIR, HOME_DIR, UNIT_SHELL }
