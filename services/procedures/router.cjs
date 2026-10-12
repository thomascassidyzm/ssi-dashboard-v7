// /api/procedures — the HTTP door of Popty's procedure front end. Mounted from production-api.cjs.
//
// Tom, 2026-10-12: Popty gets a CS-style front end that "can only trigger existing procedures that
// are already deterministic within Popty". So this router has no endpoint that takes a command, a
// path or free text: every launch names a registry id and a set of inputs, the registry validates
// those inputs as closed choices, and the registry builds the argv. The page cannot ask for anything
// the registry did not declare.
//
// WHO: Tom first (registry.OPERATORS). Every route is admin-gated AND operator-gated on the server;
// the page hiding things is courtesy, this is the lock.
//
// THE PLAN THAT RUNS IS THE PLAN YOU READ. A 'change' procedure runs only against a successful dry
// run of the same procedure with the same inputs, made within PLAN_TTL_MIN — planMatches() below.
// A 'report' writes nothing, so its plan is its declaration card and it runs directly.
'use strict'

const registry = require('./registry.cjs')
const runner = require('./runner.cjs')

const PLAN_TTL_MIN = 60
const MAX_RUNNING = 3
const sameInputs = (a, b) => JSON.stringify(Object.entries(a || {}).sort()) === JSON.stringify(Object.entries(b || {}).sort())

// Pure: may `plan` (a run) license running `proc` with `inputs` at `now`? Returns null or the reason.
function planMatches(plan, proc, inputs, now = Date.now()) {
  if (!plan) return 'no dry run given: a change runs only after its dry run'
  if (plan.procedure !== proc.id) return 'that dry run is of a different procedure'
  if (plan.mode !== 'dry-run') return 'that run is not a dry run'
  if (plan.state !== 'ok') return `that dry run did not succeed (${plan.state})`
  if (!sameInputs(plan.inputs, inputs)) return 'the inputs changed since the dry run: dry-run again'
  if (now - Date.parse(plan.startedAt) > PLAN_TTL_MIN * 60000) return `that dry run is over ${PLAN_TTL_MIN} minutes old: dry-run again`
  return null
}

function undoTarget(run) {
  const proc = registry.getProcedure(run.procedure)
  if (!proc || !proc.undo || run.mode !== 'run' || run.state !== 'ok') return null
  return { procedure: proc.undo.procedure, inputs: proc.undo.inputs(run) }
}

/**
 * @param {object} app
 * @param {object} deps
 * @param {function} deps.requireAdmin   (req,res) -> user|null (responds on failure)
 * @param {function} deps.listCourses    async () -> string[] of live course codes
 * @param {object}   [deps.logger]
 * @param {object}   [deps.runner]       injected in tests
 */
function mount(app, { requireAdmin, listCourses, logger = console, runner: r = runner }) {
  let coursesCache = { at: 0, list: null }
  async function courses() {
    if (coursesCache.list && Date.now() - coursesCache.at < 60000) return coursesCache.list
    coursesCache = { at: Date.now(), list: (await listCourses()).slice().sort() }
    return coursesCache.list
  }

  async function operator(req, res) {
    const user = await requireAdmin(req, res)
    if (!user) return null
    if (!registry.isOperator(user)) { res.status(403).json({ error: 'Procedures are open to Tom only for now.' }); return null }
    return user
  }

  async function start(req, res, mode) {
    const user = await operator(req, res); if (!user) return
    const proc = registry.getProcedure(req.params.id)
    if (!proc) return res.status(404).json({ error: `no procedure ${req.params.id}` })
    if (proc.locked) return res.status(423).json({ error: `locked: ${proc.locked}` })
    const { inputs, errors } = registry.validateInputs(proc, req.body && req.body.inputs, { courses: await courses() })
    if (errors.length) return res.status(400).json({ error: errors.join('; '), errors })

    let build
    if (mode === 'dry-run') {
      if (proc.kind !== 'change' || typeof proc.dryRun !== 'function') return res.status(400).json({ error: 'a report has no dry run: it writes nothing, run it' })
      build = proc.dryRun(inputs)
    } else {
      if (proc.kind === 'change') {
        const plan = req.body && req.body.planRunId ? await r.readRun(String(req.body.planRunId)) : null
        const why = planMatches(plan, proc, inputs)
        if (why) return res.status(409).json({ error: why })
      }
      build = proc.command(inputs)
    }

    const live = (await r.listRuns({ limit: 60 })).filter((x) => x.state === 'running')
    if (live.length >= MAX_RUNNING) return res.status(429).json({ error: `${live.length} procedures already running; wait for one to finish` })
    const twin = live.find((x) => x.procedure === proc.id && sameInputs(x.inputs, inputs))
    if (twin) return res.status(409).json({ error: 'the same procedure with the same inputs is already running', run: twin })

    const run = await r.launch({
      record: { procedure: proc.id, title: proc.title, kind: proc.kind, mode, inputs, by: user.email, planRunId: (req.body && req.body.planRunId) || null },
      argv: build.argv, cwd: build.cwd || registry.REPO_ROOT, timeoutMin: proc.timeoutMin,
    })
    logger.info?.(`[procedures] ${user.email} ${mode} ${proc.id} ${JSON.stringify(inputs)} -> ${run.id}`)
    res.status(202).json({ run })
  }

  app.get('/api/procedures', async (req, res) => {
    const user = await operator(req, res); if (!user) return
    res.json({ procedures: registry.PROCEDURES.map(registry.publicView), operator: user.email })
  })

  app.get('/api/procedures/courses', async (req, res) => {
    if (!(await operator(req, res))) return
    try { res.json({ courses: await courses() }) } catch (e) { res.status(502).json({ error: `course list: ${e.message}` }) }
  })

  app.post('/api/procedures/:id/dry-run', (req, res) => start(req, res, 'dry-run').catch((e) => res.status(500).json({ error: e.message })))
  app.post('/api/procedures/:id/run', (req, res) => start(req, res, 'run').catch((e) => res.status(500).json({ error: e.message })))

  app.get('/api/procedures/runs', async (req, res) => {
    if (!(await operator(req, res))) return
    res.json({ runs: await r.listRuns({ limit: Math.min(100, Number(req.query.limit) || 40) }) })
  })

  app.get('/api/procedures/runs/:runId', async (req, res) => {
    if (!(await operator(req, res))) return
    const run = await r.readRun(req.params.runId)
    if (!run) return res.status(404).json({ error: 'no such run' })
    res.json({ run: { ...run, undoTarget: undoTarget(run) }, log: r.readLog(req.params.runId, req.query.from) })
  })
}

module.exports = { mount, planMatches, undoTarget, PLAN_TTL_MIN }
