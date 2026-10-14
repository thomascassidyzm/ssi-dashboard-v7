/**
 * The door for COMMITTED tools that query the shared SSi database (job #384, 2026-10-14).
 * Tom's HARD RULE the same day: no agent touches the DB with hand-written code — a scratch script
 * that requires this file is still hand-written and the surface's guard refuses it. Use it from a
 * tool that is merged to main and run unchanged.
 *
 * Why it exists. On 2026-10-14 a worker's scratch script looked clips up with
 * `course_audio WHERE id::text = ANY($1)`. Casting the COLUMN stops Postgres using the primary key,
 * so every call read all ~2.5M course_audio rows (5-12 s), repeatedly, and the Popty recording
 * booth went to 500s. The cast was copied tool to tool (por_br 108 → deu 130 → hin 349) because the
 * one text-typed audio pointer, course_legos.presentation_audio_id, makes every join look like it
 * needs one — and the wrong side got cast.
 *
 * Three layers, cheapest first:
 *   1. lintSql()   — refuses a cast on a key column inside a comparison, before the query is sent.
 *   2. connect()   — a pg Client on the agent login whose query() runs lintSql() on every statement.
 *   3. the login   — .env.psql now holds `agent_script`, capped at statement_timeout 5 s, so even
 *                    SQL that never came through here cannot run long (owner login: services only).
 *                    It is also READ-ONLY on course content (job #388): writes to course_audio/seeds/
 *                    legos/practice_phrases/gender_expansions/courses are refused — call Popty instead.
 *
 * Use it:
 *   const db = require('<popty>/services/shared/agent-db.cjs')
 *   const pg = await db.connect()                       // agent login, linted
 *   const clips = await db.clipsById(pg, ids)           // course_audio by id, the right way
 *   const intros = await db.presentationClips(pg, 'deu_for_eng', ['S0130L01'])
 *   await pg.end()
 * Lint files before running them:  node services/shared/agent-db.cjs lint <file|dir>...
 */
const fs = require('fs')
const path = require('path')

// A key column (id, *_id) cast to text/varchar and then compared: `x.id::text = …`, `id::text IN`,
// `audio_id::varchar = ANY(…)`, `CAST(id AS text) = …`. A cast in the SELECT list is harmless and
// not matched (nothing compares against it).
const CAST_THEN_COMPARE = /\b((?:\w+\.)?\w*id)\s*::\s*(?:text|varchar|character varying)\b\s*(=|<>|!=|\bin\b|\blike\b|\bilike\b)/gi
const CAST_FN_THEN_COMPARE = /\bcast\s*\(\s*((?:\w+\.)?\w*id)\s+as\s+(?:text|varchar)\s*\)\s*(=|<>|!=|\bin\b)/gi
// The mirror image: `… = x.id::text` / `= ANY(…) … ` on the right-hand side.
const COMPARE_THEN_CAST = /(=|<>|!=)\s*((?:\w+\.)?\w*id)\s*::\s*(?:text|varchar)\b(?!\s*\[)/gi
// Lifting the agent login's cap from inside a script is legal (51 bounded bulk tools do it) but
// should be deliberate: reported as a warning, never refused.
const LIFT_TIMEOUT = /\bset\s+(?:local\s+|session\s+)?statement_timeout\b|set_config\s*\(\s*'statement_timeout'/gi

function lintSql(sql) {
  const text = String(sql)
  const out = []
  const add = (re, rule, why) => { for (const m of text.matchAll(re)) out.push({ rule, match: m[0].trim(), index: m.index, why }) }
  add(CAST_THEN_COMPARE, 'key-cast', 'casting a key column defeats its index: cast the VALUE instead, e.g. `id = ANY($1::uuid[])`, `id = $1::uuid`, `ca.id = l.presentation_audio_id::uuid`')
  add(CAST_FN_THEN_COMPARE, 'key-cast', 'casting a key column defeats its index: cast the VALUE instead')
  add(COMPARE_THEN_CAST, 'key-cast', 'casting a key column defeats its index: cast the other side, e.g. `l.presentation_audio_id::uuid = ca.id`')
  add(LIFT_TIMEOUT, 'lift-timeout', 'warning: lifting the 5 s cap must be a deliberate, bounded choice (one statement you have EXPLAINed), never a habit')
  return out
}

/** Lint every SQL-bearing file under the given paths. Returns [{ file, line, rule, match, why }]. */
function lintFiles(paths) {
  const findings = []
  const walk = (p) => {
    let st; try { st = fs.statSync(p) } catch { return }
    if (st.isDirectory()) {
      if (/node_modules|\.git$/.test(p)) return
      for (const f of fs.readdirSync(p)) walk(path.join(p, f))
      return
    }
    if (!/\.(c|m)?js$|\.ts$|\.sql$|\.sh$|\.py$/.test(p) || /agent-db(\.test)?\.cjs$/.test(p)) return
    const src = fs.readFileSync(p, 'utf8')
    for (const f of lintSql(src)) {
      const line = src.slice(0, f.index).split('\n').length
      if (/agent-db-lint:\s*allow/.test(src.split('\n')[line - 1] || '')) continue
      findings.push({ file: p, line, ...f })
    }
  }
  for (const p of paths) walk(p)
  return findings
}

/** The agent login URL: DATABASE_URL in the environment, else .env.psql beside this repo. */
function agentUrl(envFile = process.env.AGENT_DB_ENV || path.join(__dirname, '..', '..', '.env.psql')) {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const m = fs.readFileSync(envFile, 'utf8').match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)
  if (!m) throw new Error(`no DATABASE_URL in ${envFile}`)
  return m[1].trim()
}

/** A connected pg Client whose query() refuses index-defeating SQL before sending it. */
async function connect({ url = agentUrl(), app = process.env.PGAPPNAME || `agent:${path.basename(require.main ? require.main.filename : 'repl')}` } = {}) {
  const { Client } = require('pg')
  const client = new Client({ connectionString: url, application_name: app.slice(0, 63) })
  await client.connect()
  const raw = client.query.bind(client)
  client.query = (q, ...rest) => {
    const sql = typeof q === 'string' ? q : q && q.text
    const bad = sql ? lintSql(sql).filter((f) => f.rule === 'key-cast') : []
    if (bad.length) {
      const err = new Error(`agent-db refused SQL: ${bad.map((b) => `${b.match} — ${b.why}`).join('; ')}`)
      err.code = 'AGENT_DB_LINT'
      if (typeof rest[rest.length - 1] === 'function') return rest[rest.length - 1](err)
      return Promise.reject(err)
    }
    return raw(q, ...rest)
  }
  return client
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLIP_COLS = 'id::text AS id, course_code, role, language, voice_id, text, s3_key, duration_ms, origin, created_at'

/** course_audio rows by id, on the primary key. Non-uuid / empty ids are dropped, not thrown on. */
async function clipsById(pg, ids, { cols = CLIP_COLS, chunk = 5000 } = {}) {
  const want = [...new Set((ids || []).filter((x) => x && UUID.test(String(x))).map(String))]
  const rows = []
  for (let i = 0; i < want.length; i += chunk) {
    rows.push(...(await pg.query(`SELECT ${cols} FROM course_audio WHERE id = ANY($1::uuid[])`, [want.slice(i, i + chunk)])).rows)
  }
  return rows
}

/** Map id → row, for the common "look up the clip each slot points at" step. */
async function clipMap(pg, ids, opts) {
  return new Map((await clipsById(pg, ids, opts)).map((r) => [r.id, r]))
}

/**
 * A course's intro (presentation) clips, joined the right way round.
 * course_legos.presentation_audio_id is TEXT (every other audio pointer is uuid), so the cast goes
 * on the pointer, never on course_audio.id (all 73,777 live pointers were well-formed uuids, 2026-10-14).
 */
async function presentationClips(pg, courseCode, legoIds = null) {
  const { rows } = await pg.query(
    `SELECT l.lego_id, l.presentation_audio_id AS audio_id, a.text, a.voice_id, a.s3_key, a.duration_ms
       FROM course_legos l
       LEFT JOIN course_audio a ON a.id = l.presentation_audio_id::uuid
      WHERE l.course_code = $1 AND ($2::text[] IS NULL OR l.lego_id = ANY($2::text[]))
      ORDER BY l.seed_number, l.lego_index`,
    [courseCode, legoIds],
  )
  return rows
}

module.exports = { lintSql, lintFiles, agentUrl, connect, clipsById, clipMap, presentationClips, UUID }

if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2)
  if (cmd !== 'lint' || !args.length) {
    console.error('usage: node services/shared/agent-db.cjs lint <file|dir>...')
    process.exit(2)
  }
  const found = lintFiles(args)
  for (const f of found) console.log(`${f.file}:${f.line}  [${f.rule}]  ${f.match}\n    ${f.why}`)
  const refused = found.filter((f) => f.rule === 'key-cast').length
  console.log(refused ? `agent-db lint: ${refused} key-cast(s) — fix before running` : `agent-db lint: clean${found.length ? ` (${found.length} warning(s))` : ''}`)
  process.exit(refused ? 1 : 0)
}
