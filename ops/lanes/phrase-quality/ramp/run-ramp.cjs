#!/usr/bin/env node
// RAMP 967 (Tom 2026-10-12): the phrase-quality lane's own contract, run at volume from ONE process
// instead of one Codex worker + one Opus worker per window. Per window:
//   export-window.cjs (read-only) → judge A, Sonnet, lists BAD phrases (judges.cjs finderPrompt)
//   → judge B, Opus, a fresh context, verdict on each line cold (reviewerPrompt) → agreed = both BAD
//   → gate-change.cjs (the lane's gate: Popty course-builder replay, floor of 4 USE) → staged/<course>.jsonl
//   → apply-staged.cjs --apply (the lane's only writer, undo ledger before every write).
// Differences from the lane, and why (docs/DECISIONS.md, 2026-10-12 ramp 967):
//   - a REPLACE is staged with hold:"audio" and NOT applied: its new text has no audio, and this run
//     renders none (brief). apply-staged skips held lines. Deletes need no audio and are applied.
//   - windows are claimed in claims.json; the lane honours it once command-surface ramp-967-claims lands.
//   - the plan never takes a window the lane will reach before 22 Oct (HORIZON) or has already taken.
// Model calls go through the Claude CLI (CLAUDE.md: never the SDK), on the account the surface's router
// may spend (accounts.cjs: iCloud, then claude@ under 90%), one process per call, at most CONCURRENCY windows at once.
// Usage: node ops/lanes/phrase-quality/ramp/run-ramp.cjs [--plan] [--only id,id] [--limit N] [--concurrency N] [--no-apply] [--horizon N]
'use strict'
const fs = require('fs'), path = require('path'), os = require('os')
const { execFile, spawn } = require('child_process')
const J = require('./judges.cjs')

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const has = (k) => process.argv.includes(k)
const LANE = path.resolve(__dirname, '..'), REPO = path.resolve(LANE, '../../..')
const REL = 'ops/lanes/phrase-quality'
const WORK = process.env.RAMP_WORK || path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7', REL, 'ramp-967')
const HORIZON = Number(arg('--horizon', 600))      // lane queue items the lane may reach by 22 Oct (24/day) are never ours
const CONCURRENCY = Number(arg('--concurrency', 6))
const LIMIT = Number(arg('--limit', Infinity))
const APPLY = !has('--no-apply')
const BRANCH = 'lanes/phrase-quality'
const SURFACE = 'http://localhost:4317'
const SURFACE_DB = process.env.CS_DB || path.join(os.homedir(), 'command-surface/command-surface.db')
const CLAUDE = process.env.CLAUDE_BIN_PATH || path.join(os.homedir(), '.local/bin/claude')
const ACCTS = path.join(os.homedir(), '.cs-accounts')
const CLAIMS = path.join(LANE, 'claims.json')
const LOG = path.join(LANE, 'ramp', 'log.jsonl')
fs.mkdirSync(WORK, { recursive: true })
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

const sh = (cmd, args, opts = {}) => new Promise((res) => execFile(cmd, args, { cwd: REPO, maxBuffer: 64e6, timeout: 15 * 60e3, ...opts },
  (err, stdout, stderr) => res({ code: err ? (err.code ?? 1) : 0, stdout: String(stdout), stderr: String(stderr) })))
const readJsonl = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []
const writeJsonl = (f, rows) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '')) }

// ── one lock for everything that touches tracked files or the live DB ────────────────────────────
let chain = Promise.resolve()
const locked = (fn) => { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p }

// ── the plan ────────────────────────────────────────────────────────────────────────────────────
function laneTaken() {   // lanes.js takenItems(), read-only
  try {
    const { DatabaseSync } = require('node:sqlite')
    const db = new DatabaseSync(SURFACE_DB, { readOnly: true })
    const ids = db.prepare("SELECT item FROM lanes_runs WHERE lane_id='phrase-quality' AND stage='labour' AND item IS NOT NULL AND state NOT IN ('failed','deferred')").all()
      .map((r) => { try { return JSON.parse(r.item).id } catch { return null } }).filter(Boolean)
    db.close(); return new Set(ids)
  } catch (e) { throw new Error(`cannot read the lane's taken windows from ${SURFACE_DB}: ${e.message}`) }
}
const doneByUs = () => new Set(readJsonl(LOG).filter((l) => l.outcome !== 'error').map((l) => l.id))
const hasRunFiles = (it) => ['codex', 'finder', 'verdicts', 'agreed'].some((k) => fs.existsSync(path.join(LANE, 'runs', it.course, `${it.from}-${it.to}.${k}.jsonl`)))
async function makePlan() {
  const full = JSON.parse(fs.readFileSync(path.join(LANE, 'queue.json'), 'utf8')).items        // every in-scope course (77)
  const r = await sh('git', ['show', `origin/main:${REL}/queue.json`])                            // what the lane reads
  const laneItems = JSON.parse(r.stdout).items
  const laneIdx = new Map(laneItems.map((it, i) => [it.id, i]))
  const taken = laneTaken(), ours = doneByUs()
  const ok = (it) => !/cym/.test(it.course) && !taken.has(it.id) && !ours.has(it.id) && !hasRunFiles(it)
  // Tom's priority order first (the lane's queue past its horizon), then every other in-scope course
  const plan = [...laneItems.filter((it, i) => i >= HORIZON), ...full.filter((it) => !laneIdx.has(it.id))].filter(ok)
  return { plan, laneItems, laneIdx, taken }
}

// ── model calls ─────────────────────────────────────────────────────────────────────────────────
const benched = new Map()   // account name → until (ms)
let routing = { at: 0, data: null, usage: null }
// Tom 2026-10-12: iCloud then claude@ (<90% week) only, else wait — accounts.cjs, tested in ramp.test.cjs
async function pickAccount() {
  if (Date.now() - routing.at > 120e3) {
    const h = process.env.CS_CONV ? { 'x-cs-conv': process.env.CS_CONV } : {}
    try {
      const [r, u] = await Promise.all([fetch(`${SURFACE}/api/routing`, { headers: h }), fetch(`${SURFACE}/api/usage`, { headers: h })])
      routing = { at: Date.now(), data: await r.json(), usage: await u.json() }
    } catch (e) { say('routing/usage unreadable:', e.message) }
  }
  const name = require('./accounts.cjs').chooseAccount(routing.data, routing.usage, benched)
  return name && fs.existsSync(path.join(ACCTS, name, '.cs-oauth-token')) ? name : null
}
const usage = { calls: 0, input: 0, output: 0, cacheRead: 0, byModel: {} }
async function callClaude(model, { system, user }, label) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const acct = await pickAccount()
    if (!acct) { say(`${label}: no account open, waiting 10 min`); await new Promise((r) => setTimeout(r, 600e3)); continue }
    const dir = path.join(ACCTS, acct)
    const env = { ...process.env, CLAUDE_CONFIG_DIR: dir, CLAUDE_CODE_OAUTH_TOKEN: fs.readFileSync(path.join(dir, '.cs-oauth-token'), 'utf8').trim() }
    for (const k of ['CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_SESSION_ID']) delete env[k]
    const out = await new Promise((res) => {
      const p = spawn(CLAUDE, ['--print', '--model', model, '--tools', '', '--no-session-persistence', '--strict-mcp-config', '--output-format', 'json', '--system-prompt', system],
        { cwd: WORK, env, stdio: ['pipe', 'pipe', 'pipe'] })
      let o = '', e = ''
      const t = setTimeout(() => p.kill('SIGTERM'), 20 * 60e3)
      p.stdout.on('data', (d) => (o += d)); p.stderr.on('data', (d) => (e += d))
      p.on('close', (code) => { clearTimeout(t); res({ code, o, e }) })
      p.stdin.end(user)
    })
    let j = null; try { j = JSON.parse(out.o) } catch {}
    if (j && !j.is_error && typeof j.result === 'string') {
      usage.calls++; usage.input += j.usage.input_tokens || 0; usage.output += j.usage.output_tokens || 0; usage.cacheRead += j.usage.cache_read_input_tokens || 0
      for (const m of Object.keys(j.modelUsage || {})) usage.byModel[m] = (usage.byModel[m] || 0) + 1
      return { text: j.result, account: acct, served: Object.keys(j.modelUsage || {})[0] || model }
    }
    const why = (j && j.result) || out.e.slice(-300) || `exit ${out.code}`
    say(`${label}: ${model} on ${acct} failed (attempt ${attempt}): ${String(why).slice(0, 200)}`)
    if (/limit|quota|rate|overloaded|429|logged in/i.test(why)) benched.set(acct, Date.now() + 30 * 60e3)
    await new Promise((r) => setTimeout(r, 20e3 * attempt))
  }
  throw new Error(`${label}: ${model} failed four times`)
}
async function askArray(model, prompt, label, rawPath) {
  for (let i = 1; i <= 2; i++) {
    const r = await callClaude(model, prompt, label)
    fs.writeFileSync(rawPath + (i > 1 ? `.${i}` : ''), r.text)
    try { return { arr: J.parseArray(r.text), served: r.served, account: r.account } } catch (e) { say(`${label}: unparseable answer (${e.message}), asking again`) }
  }
  throw new Error(`${label}: two unparseable answers`)
}

// ── per course: the target of every LEGO, by seed (judges see what is already taught) ───────────
const legoCache = new Map()
async function priorTargets(course, from) {
  if (!legoCache.has(course)) {
    const { selectAll } = require('../lib.cjs')
    legoCache.set(course, await selectAll('course_legos', 'seed_number,target_text', (q) => q.eq('course_code', course).order('seed_number')))
  }
  return [...new Set(legoCache.get(course).filter((l) => l.seed_number < from).map((l) => l.target_text))]
}

// ── claims ──────────────────────────────────────────────────────────────────────────────────────
function claim(id) {
  const c = fs.existsSync(CLAIMS) ? JSON.parse(fs.readFileSync(CLAIMS, 'utf8')) : { note: 'Windows claimed by ramp 967 (command-surface #967). The phrase-quality lane skips these ids.', claimant: 'ramp-967', windows: {} }
  if (!c.windows[id]) c.windows[id] = new Date().toISOString()
  fs.writeFileSync(CLAIMS, JSON.stringify(c, null, 1) + '\n')
}

// ── git ─────────────────────────────────────────────────────────────────────────────────────────
let unpushed = 0, lastPush = Date.now()
async function commit(paths, msg) {
  await sh('git', ['add', '--', ...paths])
  const r = await sh('git', ['commit', '-q', '-m', `${msg}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, '--', ...paths])
  if (r.code === 0) unpushed++
  if (unpushed && (unpushed >= 5 || Date.now() - lastPush > 10 * 60e3)) await push()
}
async function push() {
  for (let i = 0; i < 4; i++) {
    let r = await sh('git', ['push', '-q', 'origin', `HEAD:${BRANCH}`])
    if (r.code === 0) { unpushed = 0; lastPush = Date.now(); return true }
    // merge, never rebase: append-only ledgers union-merge (ops/lanes/phrase-quality/.gitattributes)
    r = await sh('git', ['pull', '-q', '--no-rebase', '--no-edit', 'origin', BRANCH])
    if (r.code !== 0) { say('PULL FAILED — commits stay local until fixed:', r.stderr.slice(-300)); await sh('git', ['merge', '--abort']) }
  }
  say('push failed four times; commits kept locally, will retry'); return false
}

// ── one window ──────────────────────────────────────────────────────────────────────────────────
async function doWindow(it) {
  const tag = it.id, base = `${it.from}-${it.to}`, wdir = path.join(WORK, it.course)
  fs.mkdirSync(wdir, { recursive: true })
  if (laneTaken().has(it.id)) return { id: tag, outcome: 'lane-took-it' }
  await locked(() => claim(it.id))
  const winPath = path.join(wdir, `${base}.window.json`)
  const ex = await sh('node', [`${REL}/export-window.cjs`, it.course, String(it.from), String(it.to), winPath])
  if (ex.code !== 0) throw new Error(`export failed: ${ex.stderr.slice(-300)}`)
  const win = JSON.parse(fs.readFileSync(winPath, 'utf8'))
  const prior = await priorTargets(it.course, it.from)
  const nRows = J.practiceRows(win).size
  const A = await askArray('sonnet', J.finderPrompt(win, prior), `${tag} finder`, path.join(wdir, `${base}.finder.raw.txt`))
  const findings = J.toFindings(win, A.arr).map((f) => ({ ...f, judge: A.served }))
  const rec = { id: tag, course: it.course, from: it.from, to: it.to, rows: nRows, bad: findings.length, agreed: 0, replace: 0, delete: 0, keep: 0, skip: 0, applied: 0, held_audio: 0,
    finder: A.served, reviewer: null, at: null }
  let verdicts = [], agreed = [], decisions = []
  if (findings.length) {
    const B = await askArray('opus', J.reviewerPrompt(win, prior, findings), `${tag} reviewer`, path.join(wdir, `${base}.reviewer.raw.txt`))
    rec.reviewer = B.served
    ;({ verdicts, agreed } = J.toVerdicts(findings, B.arr))
    verdicts = verdicts.map((v) => ({ ...v, reviewer: B.served }))
    rec.agreed = agreed.length
    if (agreed.length) {
      const ap = path.join(wdir, `${base}.agreed.jsonl`), dp = path.join(wdir, `${base}.decisions.jsonl`)
      writeJsonl(ap, agreed)
      const g = await sh('node', [`${REL}/gate-change.cjs`, it.course, ap, dp])
      if (g.code !== 0) throw new Error(`gate failed: ${g.stderr.slice(-300)}`)
      decisions = readJsonl(dp).map((d) => (d.decision === 'replace' ? { ...d, hold: 'audio', hold_why: 'ramp 967: replacement text has no audio; no render in this run' } : d))
      for (const k of ['replace', 'delete', 'keep', 'skip']) rec[k] = decisions.filter((d) => d.decision === k).length
      rec.held_audio = rec.replace
    }
  }
  // finalise under the lock: run files, staged append, apply, log, commit
  return locked(async () => {
    const runDir = path.join(LANE, 'runs', it.course), paths = []
    if (findings.length) {
      writeJsonl(path.join(runDir, `${base}.finder.jsonl`), findings)
      writeJsonl(path.join(runDir, `${base}.verdicts.jsonl`), verdicts)
      paths.push(`${REL}/runs/${it.course}/${base}.finder.jsonl`, `${REL}/runs/${it.course}/${base}.verdicts.jsonl`)
      if (agreed.length) { writeJsonl(path.join(runDir, `${base}.agreed.jsonl`), agreed); paths.push(`${REL}/runs/${it.course}/${base}.agreed.jsonl`) }
    }
    if (decisions.length) {
      const sp = path.join(LANE, 'staged', `${it.course}.jsonl`)
      fs.appendFileSync(sp, decisions.map((d) => JSON.stringify(d)).join('\n') + '\n')
      paths.push(`${REL}/staged/${it.course}.jsonl`)
      if (APPLY && rec.delete) {
        const a = await sh('node', [`${REL}/apply-staged.cjs`, it.course, '--apply'])
        const m = /(\d+) replace, (\d+) delete, (\d+) kept, (\d+) skipped, (\d+) errors/.exec(a.stderr)
        rec.applied = m ? Number(m[1]) + Number(m[2]) : 0
        rec.apply_line = (a.stderr.trim().split('\n').pop() || '').slice(0, 300)
        if (fs.existsSync(path.join(LANE, 'undo', `${it.course}.jsonl`))) paths.push(`${REL}/undo/${it.course}.jsonl`)
      }
    }
    rec.at = new Date().toISOString(); rec.outcome = 'done'
    fs.appendFileSync(LOG, JSON.stringify(rec) + '\n')
    paths.push(`${REL}/ramp/log.jsonl`, `${REL}/claims.json`)
    await commit(paths, `phrase-quality ramp 967 ${it.course} ${base}: ${rec.bad} bad, ${rec.agreed} agreed; gate ${rec.replace} replace (held for audio), ${rec.delete} delete, ${rec.keep} kept at floor; ${rec.applied} applied`)
    return rec
  })
}

async function progress(done, total, note) {
  if (!process.env.CS_CONV) return
  try { await fetch(`${SURFACE}/api/job-progress`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cs-conv': process.env.CS_CONV }, body: JSON.stringify({ steps_total: total, steps_done: done, note }) }) } catch {}
}

async function main() {
  const { plan, laneItems } = await makePlan()
  let todo = plan
  if (arg('--only')) { const ids = arg('--only').split(','); todo = ids.map((id) => plan.find((p) => p.id === id) || null).filter(Boolean); if (todo.length !== ids.length) say('some --only ids are not in the plan (taken, done, or inside the horizon)') }
  todo = todo.slice(0, LIMIT)
  say(`plan: ${plan.length} windows open to the ramp (lane queue ${laneItems.length}, horizon ${HORIZON}); running ${todo.length}, ${CONCURRENCY} at a time, apply ${APPLY}`)
  if (has('--plan')) { const per = {}; for (const p of plan) per[p.course] = (per[p.course] || 0) + 1; console.log(JSON.stringify(per)); return }
  let i = 0, done = 0, errors = 0
  const results = []
  const worker = async () => {
    while (i < todo.length) {
      const it = todo[i++]
      try {
        const r = await doWindow(it); results.push(r); done++
        say(`${it.id}: ${r.outcome} — ${r.bad ?? '-'} bad, ${r.agreed ?? '-'} agreed, ${r.delete ?? 0} delete, ${r.replace ?? 0} replace held, ${r.applied ?? 0} applied`)
        await progress(done, todo.length, `${it.id}: ${r.bad ?? 0} bad, ${r.agreed ?? 0} agreed, ${r.applied ?? 0} applied`)
      } catch (e) {
        errors++; say(`${it.id}: ERROR ${e.message}`)
        await locked(() => fs.appendFileSync(path.join(WORK, 'errors.jsonl'), JSON.stringify({ id: it.id, at: new Date().toISOString(), error: e.message }) + '\n'))
        if (errors >= 10 && errors > done) { say('more errors than windows done; stopping'); i = todo.length }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker))
  await locked(async () => { if (unpushed) await push() })
  const sum = (k) => results.reduce((a, r) => a + (r[k] || 0), 0)
  const line = `ramp 967 phrase quality: ${done} windows done, ${errors} errors; ${sum('rows')} rows read, ${sum('bad')} bad, ${sum('agreed')} agreed, ${sum('delete')} delete, ${sum('replace')} replace held for audio, ${sum('keep')} kept at floor, ${sum('applied')} applied; calls ${usage.calls}, tokens in ${usage.input} / cache ${usage.cacheRead} / out ${usage.output}`
  say(line)
  fs.writeFileSync(path.join(WORK, `summary-${Date.now()}.json`), JSON.stringify({ line, usage, results }, null, 1))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.stack || e.message); process.exit(1) })
