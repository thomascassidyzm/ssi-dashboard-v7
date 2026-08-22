#!/usr/bin/env node
/**
 * verify-pod-text.cjs — ask an INDEPENDENT agent whether each machine-drafted
 * pod line is a reasonable translation, and approve the clean ones for audio.
 *
 * Tom's ruling, 2026-08-16 (A-109), verbatim:
 *   "we're not going to manually read all text for all courses - that's lunacy -
 *    we state an acceptable risk policy: maybe we ask a verifier agent to check
 *    all translations for reasonableness - as distinct from the agent that did
 *    the translating - and then we mark text as approved to generate audio"
 *
 * So: a human proofread of every line is REJECTED as the policy. The trade is
 * that a verifier reads everything and a human reads only the flagged tail.
 *
 * WHAT "REASONABLE" MEANS HERE. Not a QA pass, not a ZUT audit, not a
 * methodology review, and emphatically not a naturalness contest. One question:
 * is this a reasonable rendering of this English line, such that we are content
 * to spend money turning it into audio a learner will hear? A line is flagged
 * when it is WRONG — not when the verifier would have phrased it differently.
 *
 * INDEPENDENCE. The verifier is a fresh CLI session given ONLY the English and
 * the drafted target — no drafting rationale, no sibling verdicts, no contact
 * with whatever produced the draft. Judged blind.
 *
 *   PROVENANCE GAP, stated plainly: we do NOT record which model wrote these
 *   drafts. write-pod0-drafts.cjs applies a JSON file authored elsewhere with no
 *   model stamped per row. So independence is guaranteed by SESSION and by
 *   CONSTRUCTION, and only PROBABLY by model. Closing that gap means stamping
 *   the drafting model at draft time; recommended, not done here.
 *
 * NEVER the Anthropic SDK — all LLM calls go through the Claude CLI
 * (`claude --print`). A past SDK module silently billed ~$38/day. Pattern copied
 * from services/gender-prep-coordinator.cjs: unsetting CLAUDECODE is required
 * for a nested CLI call, not optional.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. The write shape is the one from
 * write-pod0-drafts.cjs and is the point of the file: per-row
 * `UPDATE … WHERE id=$1 AND target_text=$2 AND target_text_draft`, so a row
 * whose words changed under us matches zero rows and takes its batch back.
 *
 * Idempotent and resumable: only ever selects drafts that are not yet approved,
 * and commits per batch, so a crash keeps the verdicts already earned.
 *
 *   node tools/pods/verify-pod-text.cjs --pod=spa_for_eng:pod-0-unrecorded
 *   … --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { Client } = require('pg')
const { claudeEnv, claudeConfigExport } = require('../../services/shared/claude-config.cjs')

const REPO = path.join(__dirname, '..', '..')
const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}

// Scoped by pod slug, REQUIRED, no default — there is no shape of this command
// that should be able to run estate-wide by accident.
const POD = arg('pod')
if (!POD) {
  console.error('FAILED: --pod=<course:slug> is required (e.g. --pod=spa_for_eng:pod-0-unrecorded)')
  process.exit(1)
}
const MODEL = arg('model') || 'opus'
const MODEL_ID = arg('model-id') || 'claude-opus-5'
const BATCH_SIZE = Number(arg('batch') || 16)
const LIMIT = Number(arg('limit') || 0)   // 0 = no limit; for a small smoke run
const APPROVED_BY = `verifier:${MODEL_ID}`

const LOG_DIR = path.join(REPO, 'docs', 'pods')
const slugSafe = POD.replace(/[^a-z0-9]+/gi, '-')

// ---------------------------------------------------------------------------
// The brief. Says what reasonable means, and — just as loudly — what it is not.
// A verifier not told this flags half a competent corpus on taste.
// ---------------------------------------------------------------------------
function buildBrief(lines, targetLang) {
  return `You are a translation VERIFIER. You did not write these translations and you are seeing them for the first time. Judge them blind.

Each item below is one line of a listening pod: an English line a learner hears, and a machine-drafted ${targetLang} rendering of it. Your one question for each:

  Is this a REASONABLE ${targetLang} rendering of this English line — reasonable enough that we are content to spend money turning it into audio a learner will hear?

FLAG a line only when it is WRONG. Wrong means:
  - a mistranslation, or a meaning added or dropped
  - a register so wrong it would embarrass a learner who said it
  - the wrong language entirely, or an English passthrough
  - corrupted, mojibake or missing characters
  - leftover annotation, editorial notes, or PARENTHESES (this estate bans parentheses in learner-facing text outright)
  - obviously broken grammar

DO NOT flag a line because you would have phrased it differently. A slightly different but correct phrasing is FINE and must be marked ok. This is not a naturalness contest, not a style preference, not a methodology audit. Regional variation is fine. A more formal or more casual choice that still fits the scene is fine. If you find yourself flagging more than a small minority of these, you have set your bar wrong — reset it to "is this WRONG?" and go again.

Return STRICT JSON and nothing else — no prose before or after, no markdown fence. Exactly this shape, one entry per line id given to you:

{"verdicts":[{"id":"<the id exactly as given>","verdict":"ok"},{"id":"<id>","verdict":"flagged","reason":"<one plain-English sentence saying what is wrong>"}]}

Lines to judge:

${lines.map(l => JSON.stringify({ id: l.id, english: l.known_text, draft: l.target_text })).join('\n')}
`
}

// ---------------------------------------------------------------------------
// One CLI call per batch. No SDK, ever.
// ---------------------------------------------------------------------------
function runClaude(brief, tag) {
  return new Promise((resolve, reject) => {
    // Scratch off /tmp: /tmp on this box is tmpfs, so files there spend RAM.
    const dir = fs.mkdtempSync(path.join(os.homedir(), '.verify-pod-text-'))
    const briefFile = path.join(dir, `${tag}-brief.txt`)
    const outFile = path.join(dir, `${tag}-out.json`)
    fs.writeFileSync(briefFile, brief, 'utf8')

    // Auth and account pinning come from services/shared/claude-config.cjs —
    // the repo's one answer to "which account does a nested CLI bill?". Without
    // it this box answers "Not logged in": there is no keychain here, and the
    // working credential is the OAuth token that helper injects.
    // PATH: `bash -c` is not a login shell, so ~/.local/bin is off PATH and a
    // bare `claude` is "command not found" — the CLI is installed there.
    const cmd = `export PATH="$HOME/.local/bin:$PATH" && ${claudeConfigExport()} && cat '${briefFile}' | claude --print --model ${MODEL} > '${outFile}' 2>&1`
    const env = claudeEnv({ ...process.env })

    const proc = spawn('bash', ['-c', cmd], { stdio: 'pipe', env, cwd: REPO })
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', (code) => {
      let raw = ''
      try { raw = fs.readFileSync(outFile, 'utf8') } catch { /* nothing written */ }
      try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* best effort */ }
      if (code !== 0 && !raw) return reject(new Error(`claude exited ${code}: ${stderr.slice(0, 300)}`))
      resolve(raw)
    })
  })
}

// The CLI sometimes wraps JSON in a fence or a sentence despite instruction.
// Pull the outermost object rather than failing a whole batch on decoration.
function parseVerdicts(raw) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error(`no JSON object in verifier output: ${raw.slice(0, 200)}`)
  const obj = JSON.parse(raw.slice(start, end + 1))
  if (!Array.isArray(obj.verdicts)) throw new Error('verifier output has no verdicts array')
  return obj.verdicts
}

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const { rows: podRows } = await db.query(
    `SELECT p.id, p.course_code, c.target_lang
       FROM listening_pods p JOIN courses c ON c.course_code = p.course_code
      WHERE p.id = $1`, [POD])
  if (!podRows.length) { console.error(`FAILED: pod not found: ${POD}`); process.exit(1) }
  const targetLang = podRows[0].target_lang || 'the target language'

  // Only unapproved drafts. This is what makes a re-run cheap and idempotent:
  // an approved line is never re-verified.
  const { rows: lines } = await db.query(
    `SELECT id, known_text, target_text
       FROM listening_pod_sentences
      WHERE pod_id = $1 AND target_text_draft AND target_text_approved_at IS NULL
      ORDER BY global_order` + (LIMIT ? ` LIMIT ${LIMIT}` : ''), [POD])

  if (!lines.length) {
    console.log(JSON.stringify({ mode: APPLY ? 'APPLIED' : 'DRY_RUN', pod: POD, message: 'no unapproved drafts — nothing to verify', summary: { total: 0 } }, null, 2))
    await db.end(); return
  }

  const batches = chunk(lines, BATCH_SIZE)
  console.error(`[verify-pod-text] ${POD}: ${lines.length} unapproved draft(s) in ${batches.length} batch(es), model ${MODEL_ID}${APPLY ? '' : ' — DRY RUN'}`)

  const byId = new Map(lines.map(l => [l.id, l]))
  const log = []
  let ok = 0, flagged = 0, unjudged = 0, written = 0

  for (const [i, batch] of batches.entries()) {
    const checkedAt = new Date().toISOString()
    let verdicts
    try {
      verdicts = parseVerdicts(await runClaude(buildBrief(batch, targetLang), `batch-${i + 1}`))
    } catch (e) {
      console.error(`[verify-pod-text] batch ${i + 1}/${batches.length} FAILED: ${e.message} — its lines stay unapproved`)
      for (const l of batch) { unjudged++; log.push({ id: l.id, verdict: 'unjudged', reason: e.message }) }
      continue
    }

    const seen = new Set()
    const writes = []
    for (const v of verdicts) {
      const line = byId.get(v.id)
      if (!line || seen.has(v.id)) continue   // hallucinated or duplicated id
      seen.add(v.id)
      const isOk = v.verdict === 'ok'
      const review = {
        verdict: isOk ? 'ok' : 'flagged',
        reason: isOk ? null : String(v.reason || 'flagged without a reason'),
        model: MODEL_ID,
        checked_at: checkedAt,
        known_text_at_check: line.known_text,
        target_text_at_check: line.target_text,
      }
      if (isOk) ok++; else flagged++
      log.push({ id: line.id, english: line.known_text, draft: line.target_text, verdict: review.verdict, reason: review.reason })
      writes.push({ line, review, approve: isOk })
    }
    for (const l of batch) {
      if (!seen.has(l.id)) { unjudged++; log.push({ id: l.id, verdict: 'unjudged', reason: 'verifier returned no verdict for this id' }) }
    }

    if (!APPLY) continue

    // One transaction per batch: resumable, and a drifted row takes back only
    // its own batch rather than the whole run.
    try {
      await db.query('BEGIN')
      for (const w of writes) {
        const r = await db.query(
          `UPDATE listening_pod_sentences
              SET target_text_approved_at = CASE WHEN $3 THEN now() ELSE NULL END,
                  target_text_approved_by = CASE WHEN $3 THEN $4::text ELSE NULL END,
                  target_text_review      = $5::jsonb,
                  updated_at              = now()
            WHERE id = $1 AND target_text = $2 AND target_text_draft`,
          [w.line.id, w.line.target_text, w.approve, APPROVED_BY, JSON.stringify(w.review)])
        if (r.rowCount !== 1) {
          throw new Error(`DRIFT ${w.line.id}: expected one draft row carrying the words verified, matched ${r.rowCount}; batch rolled back`)
        }
        written++
      }
      await db.query('COMMIT')
    } catch (e) {
      await db.query('ROLLBACK')
      console.error(`[verify-pod-text] batch ${i + 1} write FAILED: ${e.message}`)
      written -= writes.length
    }
    console.error(`[verify-pod-text] batch ${i + 1}/${batches.length}: ${writes.filter(w => w.approve).length} ok, ${writes.filter(w => !w.approve).length} flagged`)
  }

  await db.end()

  const summary = { pod: POD, model: MODEL_ID, total: lines.length, ok, flagged, unjudged, rows_written: APPLY ? written : 0 }
  const outFile = path.join(LOG_DIR, `verify-pod-text-${slugSafe}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.mkdirSync(LOG_DIR, { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify({ mode: APPLY ? 'APPLIED' : 'DRY_RUN', summary, log }, null, 2))
  console.log(JSON.stringify({ mode: APPLY ? 'APPLIED' : 'DRY_RUN', summary, log_file: outFile }, null, 2))
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
