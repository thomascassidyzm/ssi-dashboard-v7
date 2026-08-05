/**
 * audio-repair-cli.cjs — the parts of the repair CLI that are pure decisions,
 * split out so they can be unit-tested with no Supabase, no S3 and no spend.
 *
 * The repair LOGIC lives in services/audio-repair-core.cjs and is not
 * duplicated here. What lives here is the CLI's own responsibilities:
 *
 *   - reading a target list, in whatever shape the tool upstream emitted it
 *     (tools/audio-batch-gate.cjs --out, a queue dump, a bare id list);
 *   - deciding which of those targets this run will touch, and saying out loud
 *     why each of the others was dropped rather than silently skipping it;
 *   - BEFORE-STATE assertions: the facts about a clip captured when a human was
 *     shown it, re-checked immediately before the accept lands, so a clip that
 *     moved underneath a reviewer aborts instead of being overwritten. Several
 *     workers touch this estate at once — drift is expected, not theoretical.
 *
 * British English throughout; `-ise` spellings.
 */

/** Thrown when a clip has changed since the human looked at it. */
class DriftError extends Error {
  constructor (audioId, moved) {
    super(`clip ${audioId} changed since it was proposed: ${moved.map(m => `${m.field} ${JSON.stringify(m.expected)} -> ${JSON.stringify(m.actual)}`).join('; ')}`)
    this.name = 'DriftError'
    this.audioId = audioId
    this.moved = moved
  }
}

/**
 * Normalise whatever the caller handed us into `{ id, role, text, durationMs,
 * verdict }`. Four shapes are accepted because four tools already emit them and
 * an emergency is the wrong moment to be reformatting JSON by hand:
 *
 *   ["uuid", ...]                                  a bare id list
 *   [{ id, role, text, duration_ms, verdict }]     tools/audio-batch-gate.cjs --out
 *   { items: [{ audioId, role, text, durationMs }] } audio-repair queue --json
 *   { ids: [...] }                                 hand-written
 */
function parseTargets (raw) {
  let list = raw
  if (raw && !Array.isArray(raw)) {
    if (Array.isArray(raw.items)) list = raw.items
    else if (Array.isArray(raw.ids)) list = raw.ids
    else if (Array.isArray(raw.clips)) list = raw.clips
    else throw new Error('target file is an object with no items[], ids[] or clips[] array')
  }
  if (!Array.isArray(list)) throw new Error('target file is neither an array nor a recognised object')

  return list.map((entry, i) => {
    if (typeof entry === 'string') return { id: entry, role: null, text: null, durationMs: null, verdict: null }
    if (!entry || typeof entry !== 'object') throw new Error(`target ${i} is neither a string nor an object`)
    const id = entry.id || entry.audioId || entry.audio_id
    if (!id) throw new Error(`target ${i} has no id / audioId / audio_id`)
    return {
      id,
      role: entry.role ?? null,
      text: entry.text ?? null,
      durationMs: entry.durationMs ?? entry.duration_ms ?? null,
      verdict: entry.verdict ?? null,
    }
  })
}

/**
 * Which targets this run touches, and — separately — why every other one was
 * dropped. Skips are returned rather than filtered away silently: a run that
 * quietly halves its own worklist reads as "covered everything" when it didn't.
 *
 * Note what is NOT here: a role refusal. The old tools refused
 * role='presentation' because their first move was a DELETE, and
 * lego_introductions.presentation_audio_id is ON DELETE CASCADE. The core swaps
 * in place at the same id, so nothing is deleted, nothing can CASCADE, and
 * presentation clips take exactly the same path as everything else.
 */
function planTargets (targets, opts = {}) {
  const { role = null, only = 'all', limit = 0, skipIds = [] } = opts
  const skipped = []
  const seen = new Set()
  const skipSet = new Set(skipIds)
  let jobs = []

  for (const t of targets) {
    if (seen.has(t.id)) { skipped.push({ id: t.id, why: 'duplicate in the target list' }); continue }
    seen.add(t.id)
    if (skipSet.has(t.id)) { skipped.push({ id: t.id, why: 'excluded by --skip' }); continue }
    if (role && t.role && t.role !== role) { skipped.push({ id: t.id, why: `role=${t.role}, not ${role}` }); continue }
    if (only !== 'all' && t.verdict && t.verdict !== only) {
      skipped.push({ id: t.id, why: `verdict=${t.verdict}, not ${only}` }); continue
    }
    jobs.push(t)
  }

  if (limit > 0 && jobs.length > limit) {
    for (const t of jobs.slice(limit)) skipped.push({ id: t.id, why: `beyond --limit ${limit}` })
    jobs = jobs.slice(0, limit)
  }
  return { jobs, skipped }
}

/**
 * The facts about a clip that must not have moved between propose and accept.
 * `currentFacts` is the shape the core returns from propose/preview.
 */
function expectationFrom (current) {
  if (!current) throw new Error('cannot record an expectation from nothing')
  return {
    id: current.id,
    s3Key: current.s3Key ?? null,
    revision: current.revision ?? 1,
    durationMs: current.durationMs ?? null,
    text: current.text ?? null,
    role: current.role ?? null,
  }
}

const DRIFT_FIELDS = ['id', 's3Key', 'revision', 'durationMs', 'text', 'role']

/**
 * Compare a recorded expectation against the clip as it is right now. Fields
 * absent from the expectation are not checked — an old log missing a field
 * should not be treated as evidence that the field changed.
 */
function driftBetween (expected, actual) {
  const moved = []
  for (const field of DRIFT_FIELDS) {
    if (!(field in (expected || {}))) continue
    if (expected[field] === undefined) continue
    const a = actual ? actual[field] : undefined
    const normalised = field === 'revision' ? (a ?? 1) : (a ?? null)
    const want = field === 'revision' ? (expected[field] ?? 1) : (expected[field] ?? null)
    if (normalised !== want) moved.push({ field, expected: want, actual: normalised })
  }
  return moved
}

/** Abort on drift. This is the assertion the discipline requires; it throws. */
function assertNoDrift (expected, actual) {
  const moved = driftBetween(expected, actual)
  if (moved.length) throw new DriftError(expected.id || (actual && actual.id), moved)
  return true
}

/**
 * What a propose run would spend if it were allowed to render. Characters are
 * the billable unit at every provider the estate uses; there is no attempt to
 * price them here, because the rate is a commercial fact that rots and a wrong
 * number is worse than an honest count.
 */
function costEstimate (jobs) {
  const characters = jobs.reduce((n, j) => n + String(j.text || '').length, 0)
  return {
    clips: jobs.length,
    characters,
    charactersKnown: jobs.every(j => j.text != null),
  }
}

/**
 * Per-row log path. `-dryrun-` and `-applied-` are distinct filenames on
 * purpose: reading back the wrong one is how a dry run gets mistaken for a
 * completed repair.
 */
function logPath ({ course, verb, dryRun, count, dir = '/tmp', stamp = null }) {
  const suffix = dryRun ? 'dryrun' : 'applied'
  const s = stamp ? `-${stamp}` : ''
  return `${dir}/audio-repair-${course}-${verb}-${count}${s}-${suffix}-log.json`
}

/** Minimal flag parser shared by the CLI. Values are strings; callers cast. */
function parseArgv (argv) {
  const flags = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) flags[key] = true
      else { flags[key] = next; i++ }
    } else positional.push(a)
  }
  return { flags, positional }
}

module.exports = {
  DriftError,
  parseTargets,
  planTargets,
  expectationFrom,
  driftBetween,
  assertNoDrift,
  costEstimate,
  logPath,
  parseArgv,
  DRIFT_FIELDS,
}
