#!/usr/bin/env node
/**
 * weekly-people-report.cjs — Kai's Monday report on the people working in Popty (job #501).
 *
 * Three sections, each per person, last 7 days and all-time: RECORDERS (the booth's own artist
 * overview), VOLUNTEER BUILDERS (Popty role 'editor', from the edit log) and PROOFREADING (approvals,
 * flags and checks). The rules live in people-report-lib.cjs; this file only reads and delivers.
 *
 * READ-ONLY. It reads: the booth overview (booth-artists-reader.cjs, the same code the God-admin
 * /admin/recording page uses), dashboard_users, content_edit_events (human actors), course_seeds
 * approvals, lego_proof_flags and phrase_proof_flags — through the agent login (agent-db.cjs, 5 s
 * cap) and Popty's own Supabase client. It writes nothing to the database.
 *
 *   node tools/reports/weekly-people-report.cjs                  markdown to stdout
 *   node tools/reports/weekly-people-report.cjs --out FILE       markdown to FILE
 *   node tools/reports/weekly-people-report.cjs --publish        write, publish as a surface doc and
 *                                                                post one summary line to Kai's Watson
 *     --to <person>   who gets the line (default Kai)   --days <n>   window (default 7)
 *
 * Identity for --publish: the conversation token in CS_CONV_TOKEN when run from a surface job, else
 * the cron fleet's session (command-surface/ops/cs-cron-identity.js) when run by the Monday timer
 * (ops/systemd/popty-people-report.timer). The doc is written under the shared Popty checkout's
 * gitignored scripts/ so Kai, whose workspace is that repo, can open it.
 */

'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const lib = require('./people-report-lib.cjs')

const SURFACE = process.env.CS_SURFACE || 'http://localhost:4317'
const SHARED_CHECKOUT = path.join(os.homedir(), 'SSi', 'ssi-dashboard-v7-clean')
const DEFAULT_OUT_DIR = path.join(SHARED_CHECKOUT, 'scripts', 'people-report')

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const flag = (name) => process.argv.includes(name)

// ── READS ─────────────────────────────────────────────────────────────────────────────────────────

async function readRecorders() {
  const supabaseClient = require('../../services/supabase-client.cjs')
  if (!supabaseClient.isInitialized()) throw new Error('Popty\'s Supabase client is not configured on this machine (no SUPABASE_URL / SUPABASE_SERVICE_KEY in .env)')
  const { createArtistsReader } = require('../../services/voice-engine/booth-artists-reader.cjs')
  const quiet = { log() {}, info() {}, warn: (m) => process.stderr.write(`${m}\n`), error: (m) => process.stderr.write(`${m}\n`) }
  return createArtistsReader({ getDb: () => supabaseClient.getClient(), logger: quiet }).buildOverview()
}

const EVENTS_SQL = `
  SELECT occurred_at, course_code, operation, actor_id, actor_label, actor_role,
         scope->'seed_numbers' AS seeds,
         CASE WHEN jsonb_typeof(scope->'lego_ids') = 'array' THEN jsonb_array_length(scope->'lego_ids') ELSE 0 END AS legos,
         CASE WHEN jsonb_typeof(scope->'phrase_ids') = 'array' THEN jsonb_array_length(scope->'phrase_ids') ELSE 0 END AS phrases,
         detail->'ops' AS ops
    FROM content_edit_events
   WHERE actor_kind = 'human'
   ORDER BY occurred_at`

const APPROVALS_SQL = `
  SELECT s.course_code, s.seed_number, s.approved_at,
         e.actor_kind, e.actor_id, e.actor_label, e.occurred_at AS event_at
    FROM course_seeds s
    LEFT JOIN content_edit_events e ON e.id = s.last_edit_event_id
   WHERE s.approved_at IS NOT NULL AND s.approved_at >= $1`

const FLAGS_SQL = `
  SELECT 'lego' AS kind, course_code, flagged, flagged_by, updated_at FROM lego_proof_flags
  UNION ALL
  SELECT 'phrase' AS kind, course_code, flagged, flagged_by, updated_at FROM phrase_proof_flags`

const PROGRESS_SQL = `
  SELECT course_code, count(*)::int AS total, count(approved_at)::int AS approved
    FROM course_seeds WHERE course_code = ANY($1::text[]) GROUP BY course_code`

/** One read; a failure becomes a gap with the database's own words, never a crash. */
async function tryQuery(pg, label, sql, params, gaps) {
  try { return (await pg.query(sql, params)).rows } catch (e) {
    gaps.push(`${label} could not be read this week (${e.message}), so the numbers that depend on it are missing, not zero.`)
    return null
  }
}

async function gather({ now, days }) {
  const since = now - days * 24 * 3600 * 1000
  const gaps = []
  const d = { now, since, gaps, recorders: {}, builders: {}, proof: {} }

  try { d.recorders = { rows: lib.recorderRows(await readRecorders(), now) } } catch (e) {
    d.recorders = { error: `the booth overview could not be built (${e.message}).` }
  }

  const agentDb = require('../../services/shared/agent-db.cjs')
  let pg
  try { pg = await agentDb.connect({ app: 'tool:weekly-people-report' }) } catch (e) {
    const msg = `the database could not be reached (${e.message}).`
    d.builders = { error: msg }; d.proof = { error: msg }
    return finishGaps(d)
  }
  try {
    const users = await tryQuery(pg, 'Popty logins (dashboard_users)', 'SELECT email, name, role, courses, invited_at FROM dashboard_users', [], gaps)
    const events = await tryQuery(pg, 'The edit log (content_edit_events)', EVENTS_SQL, [], gaps)
    // All-time approvals would credit every seed ever approved; the approver can only be read for
    // approvals that are still standing, so all-time is "approved and still approved".
    const approvals = await tryQuery(pg, 'Seed approvals (course_seeds)', APPROVALS_SQL, [new Date(0).toISOString()], gaps)
    const proofFlags = await tryQuery(pg, 'LEGO and phrase proof flags', FLAGS_SQL, [], gaps)

    if (!events) d.builders = { error: 'the edit log could not be read.' }
    else d.builders = lib.builderRows(users || [], events, since, now)

    if (!events && !approvals && !proofFlags) d.proof = { error: 'none of the proofreading sources could be read.' }
    else {
      d.proof = lib.proofRows({ users: users || [], events: events || [], approvals: approvals || [], proofFlags: proofFlags || [], since })
      const courses = [...new Set([...d.proof.rows.map((r) => r.course), ...Object.keys(d.proof.unattributed)])]
      const prog = courses.length ? await tryQuery(pg, 'Course approval totals', PROGRESS_SQL, [courses], gaps) : []
      d.proof.courseProgress = Object.fromEntries((prog || []).map((r) => [r.course_code, r]))
    }
    if (!users) gaps.push('Without dashboard_users, nobody can be told apart as a builder (role editor), so section 2 is empty for that reason.')
  } finally { await pg.end().catch(() => {}) }
  return finishGaps(d)
}

/** The standing blind spots, said every week so a zero is never mistaken for a fact. */
function finishGaps(d) {
  d.gaps.push(
    'Recorders: a re-read of a line replaces its clip in place, so "lines recorded" counts lines read for the first time, not attempts or re-reads.',
    'Proofreading: the stand-alone proofread tool (tools/proofread) records neither who approved a seed nor its per-phrase OK/flag ticks in the database — the ticks stay in a file on the machine it runs on. Its approvals are counted per course as "no approver recorded"; its phrase checks and flags are not visible here.',
    'Proofreading: "approved" means approved and still approved now. A seed approved and later unapproved by a fix no longer counts, and the approver is only known when the approval came through a Popty route that records the person.',
    'LEGO and phrase proof flags keep only their latest state, so a flag raised and cleared within the week does not show.',
    'Builders: the edit log names a person only for saves made through Popty since the editor-identity ruling (1 Sept 2026); earlier edits carry no name, so "all-time" means since then. Seed text saves do not say whether a seed was new or changed, so they read "written/edited". Edits made by agents or tools are left out — people only.',
    'People are matched to their Popty login by the name or email the edit log carries; a login renamed since may show twice.',
  )
  return d
}

// ── DELIVERY ──────────────────────────────────────────────────────────────────────────────────────

function identityHeaders() {
  if (process.env.CS_CONV_TOKEN) return { 'x-cs-conv': process.env.CS_CONV_TOKEN }
  try { return require(path.join(os.homedir(), 'command-surface', 'ops', 'cs-cron-identity.js')).identityHeaders(SURFACE) } catch { return {} }
}

async function post(route, body) {
  const r = await fetch(`${SURFACE}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...identityHeaders() }, body: JSON.stringify(body) })
  const text = await r.text()
  let json = null; try { json = JSON.parse(text) } catch {}
  if (!r.ok || (json && json.ok === false)) throw new Error(`${route} → ${r.status} ${text.slice(0, 300)}`)
  return json || {}
}

async function main() {
  const now = Date.now()
  const days = Number(arg('--days', 7)) || 7
  const d = await gather({ now, days })
  const md = lib.renderReport(d)
  const summary = lib.summaryLine(d)
  const publish = flag('--publish')
  let out = arg('--out')
  if (!out && publish) out = path.join(DEFAULT_OUT_DIR, `people-report-${new Date(now).toISOString().slice(0, 10)}.md`)
  if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, md) } else process.stdout.write(`${md}\n`)
  process.stderr.write(`${summary}\n`)
  if (!publish) return 0
  const doc = await post('/api/publish-doc', { path: out, title: `Popty people report, ${lib.when(d.since, now)} – ${lib.when(now, now)}`, internal: true })
  if (!doc.url) throw new Error(`publish-doc returned no url: ${JSON.stringify(doc).slice(0, 200)}`)
  const to = arg('--to', 'Kai')
  const sent = await post('/api/surface-notice', { toPerson: to, text: `${summary} ${doc.url}`, relay: 'people-report' })
  process.stderr.write(`published ${doc.url}; line to ${to}: ${JSON.stringify(sent)}\n`)
  return 0
}

if (require.main === module) {
  main().then((code) => process.exit(code), (err) => { process.stderr.write(`weekly-people-report: ${err.stack || err.message}\n`); process.exit(1) })
}

module.exports = { gather, finishGaps }
