// THE PROCEDURE REGISTRY — the only way into Popty's procedure front end (/admin/procedures).
//
// Tom, 2026-10-12 16:21Z: "we want Popty to be just like the CS but with its feature set
// constrained by the procedures already existing." A procedure is listed here or it does not exist
// for the front end: there is no free text, no agent chat, and no "run this command" box. Adding a
// feature means adding a DETERMINISTIC procedure — same inputs, same action — to this file.
//
// What an entry declares, and why each field exists:
//   kind        'report' reads only and writes nothing; it runs straight from its plan card.
//               'change' writes. It must declare dryRun(), and the runner refuses Run unless a
//               successful dry run of the SAME inputs exists (router.cjs, planMatches) — the plan
//               the operator read is the plan that runs.
//   inputs      every input is a closed choice (a course from the live course list, an enum, a
//               bounded integer). validateInputs() refuses anything else, so an argv is only ever
//               built from values this file listed. No input is ever spliced into a shell string.
//   command()   the argv of the real tool, run in a cs-long-style systemd unit (runner.cjs).
//   reads / writes / cost   shown on the plan card, verbatim. Honest words, not a template.
//   undo        change procedures only: the procedure that puts a run back, and how its inputs
//               are derived from the run being undone.
//   locked      a procedure we know about but will not expose yet, with the reason. It is listed
//               (so the gap is visible) and cannot be run — the router refuses it, not just the UI.
'use strict'

const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const COURSE_RE = /^[a-z]{3}(?:_[a-z0-9]+)*_for_[a-z]{3}(?:_[a-z0-9]+)?$/

// The phrase-quality lane's data (staged decisions, undo ledgers) lives on Popty branch
// lanes/phrase-quality, never main (each main push redeploys Popty). Its procedures run against a
// detached checkout of that branch, refreshed at the start of every run by bin/with-lane.sh, which
// prints the branch sha first — so a run's output always names exactly which lane state it read.
const LANE = { branch: 'lanes/phrase-quality', dir: 'ops/lanes/phrase-quality' }
const withLane = (...argv) => ['bash', path.join(__dirname, 'bin', 'with-lane.sh'), LANE.branch, ...argv]

const PROCEDURES = [
  {
    id: 'phrase-quality-status',
    group: 'Phrase quality',
    title: 'Lane status, every course',
    kind: 'report',
    summary: 'What the phrase-quality lane has decided and done, per course: staged replace / delete / keep decisions, how many are applied, how many undone, and how many are still open.',
    reads: 'The lane branch: staged decisions and undo ledgers.',
    writes: 'Nothing.',
    cost: 'None.',
    inputs: [],
    command: () => ({ argv: withLane('node', path.join(__dirname, 'reports', 'phrase-quality-status.cjs')) }),
    timeoutMin: 5,
  },
  {
    id: 'phrase-quality-plan',
    group: 'Phrase quality',
    title: 'What applying a course would do',
    kind: 'report',
    summary: "The lane's own apply step in dry run for one course: for every open staged decision it re-reads the live row, re-runs the course-builder gate and the 4-USE floor, and says replace, delete, keep or skip — and why.",
    reads: 'The lane branch, the live practice phrases of this course, and the course-builder gate.',
    writes: 'Nothing. This is apply-staged.cjs without --apply.',
    cost: 'None (database reads).',
    inputs: [{ name: 'course', label: 'Course', type: 'course' }],
    command: ({ course }) => ({ argv: withLane('node', `${LANE.dir}/apply-staged.cjs`, course) }),
    timeoutMin: 20,
  },
  {
    id: 'voice-door-dry-run',
    group: 'Voices',
    title: 'Audio door dry run, one course',
    kind: 'report',
    summary: 'For every line of a course, what the one audio door would answer from clips we already hold, in which voice, and how many characters it would pay to render the rest.',
    reads: 'The course content, the clip index and course audio.',
    writes: 'Nothing. It never loads the renderer, so it cannot reach a provider.',
    cost: 'None (database reads). Takes a few minutes on a big course.',
    inputs: [{ name: 'course', label: 'Course', type: 'course' }],
    command: ({ course }) => ({ argv: ['node', 'tools/tts-door-dry-run.cjs', course] }),
    timeoutMin: 30,
  },
  {
    id: 'debut-practice-check',
    group: 'Phrase quality',
    title: 'Debut practice check, one course',
    kind: 'report',
    summary: 'For every LEGO debut in a course: is its practice blocking, thin (below the floors), dark (no audio), and are the is_new flags right.',
    reads: 'The course seeds, LEGOs and practice phrases.',
    writes: 'Nothing.',
    cost: 'None. Seconds.',
    inputs: [{ name: 'course', label: 'Course', type: 'course' }],
    command: ({ course }) => ({ argv: ['node', 'tools/check-debut-practice.cjs', course] }),
    timeoutMin: 10,
  },
  {
    id: 'phrase-quality-apply',
    group: 'Phrase quality',
    title: 'Apply a course',
    kind: 'change',
    locked: "The undo ledger is a file on the lane branch, written by the live ramp. A second writer from here would fork it. Opens when the ledger has one writer (a table, or this runner committing it).",
    summary: 'Writes the open staged decisions for one course; every write is preceded by its undo-ledger line.',
    reads: 'As the plan.', writes: 'course_practice_phrases (BUILD/USE only), the undo ledger.', cost: 'None; replaced lines are voiced by the normal audio pass.',
    inputs: [{ name: 'course', label: 'Course', type: 'course' }],
    dryRun: ({ course }) => ({ argv: withLane('node', `${LANE.dir}/apply-staged.cjs`, course) }),
    command: ({ course }) => ({ argv: withLane('node', `${LANE.dir}/apply-staged.cjs`, course, '--apply') }),
    undo: { procedure: 'phrase-quality-undo', inputs: (run) => ({ course: run.inputs.course }) },
  },
  {
    id: 'phrase-quality-undo',
    group: 'Phrase quality',
    title: 'Undo a course',
    kind: 'change',
    locked: 'Same single-writer question as Apply: undo appends to the same ledger.',
    summary: 'Restores every applied change for one course from the undo ledger.',
    reads: 'The undo ledger.', writes: 'course_practice_phrases, the undo ledger.', cost: 'None.',
    inputs: [{ name: 'course', label: 'Course', type: 'course' }],
    dryRun: ({ course }) => ({ argv: withLane('node', `${LANE.dir}/undo.cjs`, course) }),
    command: ({ course }) => ({ argv: withLane('node', `${LANE.dir}/undo.cjs`, course, '--apply') }),
  },
  {
    id: 'voice-audit',
    group: 'Voices',
    title: 'Voice audit (resolveVoice)',
    kind: 'report',
    locked: 'Lands with job #53, which is making voice assignment one deterministic procedure. Registered here so it arrives as one entry.',
    summary: 'Every slot whose stored voice differs from what resolveVoice says it should be.',
    reads: 'Course audio and the cast.', writes: 'Nothing.', cost: 'None.',
    inputs: [{ name: 'course', label: 'Course', type: 'course' }],
  },
]

// Tom first (2026-10-12). The server refuses everyone else, whatever the page shows.
const OPERATORS = ['thomas.cassidy+ssi@gmail.com']
const isOperator = (user) => !!user && OPERATORS.includes(String(user.email || '').toLowerCase())

function getProcedure(id) {
  return PROCEDURES.find((p) => p.id === id) || null
}

// Every input must be a closed choice. `ctx.courses` is the live course list the router read.
function validateInputs(proc, raw, ctx = {}) {
  const inputs = {}
  const errors = []
  const given = raw && typeof raw === 'object' ? raw : {}
  for (const k of Object.keys(given)) if (!proc.inputs.some((i) => i.name === k)) errors.push(`${k}: not an input of ${proc.id}`)
  for (const def of proc.inputs) {
    const v = given[def.name]
    if (v === undefined || v === null || v === '') { if (!def.optional) errors.push(`${def.name}: required`); continue }
    if (def.type === 'course') {
      if (typeof v !== 'string' || !COURSE_RE.test(v)) { errors.push(`${def.name}: not a course code`); continue }
      if (ctx.courses && !ctx.courses.includes(v)) { errors.push(`${def.name}: ${v} is not a live course`); continue }
      inputs[def.name] = v
    } else if (def.type === 'enum') {
      if (!def.options.includes(v)) { errors.push(`${def.name}: must be one of ${def.options.join(', ')}`); continue }
      inputs[def.name] = v
    } else if (def.type === 'int') {
      const n = Number(v)
      if (!Number.isInteger(n) || n < def.min || n > def.max) { errors.push(`${def.name}: whole number ${def.min}-${def.max}`); continue }
      inputs[def.name] = n
    } else errors.push(`${def.name}: unknown input type ${def.type}`)
  }
  return { inputs, errors }
}

// The shape the page sees: declarations only, never the functions.
function publicView(proc) {
  const { command, dryRun, undo, ...rest } = proc
  return { ...rest, locked: proc.locked || null, hasDryRun: typeof dryRun === 'function', undo: undo ? undo.procedure : null }
}

module.exports = { PROCEDURES, OPERATORS, REPO_ROOT, COURSE_RE, getProcedure, validateInputs, publicView, isOperator }
