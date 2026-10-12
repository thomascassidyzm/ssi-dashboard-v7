#!/usr/bin/env node
// tools/course-optimization/rechunk-short-legos/clone.cjs — job #192 (Tom 2026-10-12: "we can clone a course and do
// it there - its just DB pointing to audio files").
//
// A CLONE is a private copy of a course's TEXT LAYER under a new course code: the courses row, every seed, LEGO and
// practice phrase. Its audio columns point at the SAME course_audio rows as the source — no clip is copied, rendered
// or re-tagged. The clone is created draft, hidden and not_available, so it is in no learner's catalogue or picker,
// and the live course is never touched. A re-chunk pilot runs on the clone (rechunk.cjs <clone-code>), and Tom plays
// it on staging through an admin-only ?course= link.
//
//   node clone.cjs create <source> <clone> [--apply]   copy (DRY RUN unless --apply); refuses an existing code
//   node clone.cjs drop   <clone> [--apply]            delete EVERY row of the clone (only a code this ledger created,
//                                                      still draft/not_available); course_audio is never touched
//
// Ledger: ops/rechunk-short-legos/clones.jsonl — one line per create and per drop, with row counts.
'use strict'
const fs = require('fs'), path = require('path')
const REPO = path.resolve(__dirname, '..', '..', '..')
const LEDGER = path.join(REPO, 'ops', 'rechunk-short-legos', 'clones.jsonl')
const SHARED = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean'
const [CMD, A, B] = process.argv.slice(2)
const APPLY = process.argv.includes('--apply')

// The text layer, in foreign-key order. course_practice_phrases.id embeds the course code ("<code>:S0001L01U01")
// and is rewritten; every other row keeps its content byte for byte, audio ids included.
const TABLES = ['course_seeds', 'course_legos', 'course_practice_phrases', 'lego_introductions']
const CLONE_ROW = (src, dst) => ({ course_code: dst, display_name: `${src.display_name} — re-chunk pilot (clone, job #192)`,
  status: 'draft', visibility: 'hidden', new_app_status: 'not_available', legacy_app_status: 'not_available',
  released_at: null, featured_order: null, new_app_beta_started_at: null, legacy_app_beta_started_at: null, export_ready: false })

// Pure, tested: the clone code must keep the "<target>_for_<known>" shape the app parses (known side = split[1],
// target = the 3-letter prefix), and must not be a real course.
function cloneCodeProblems(src, dst) {
  const p = []
  const [st, sk] = String(src).split('_for_'), [dt, dk] = String(dst).split('_for_')
  if (!dk || dk !== sk) p.push(`clone must end in _for_${sk} (the app reads the known language from the code)`)
  if (!dt || dt.slice(0, 3) !== st.slice(0, 3)) p.push(`clone must start with the source's target language "${st.slice(0, 3)}"`)
  if (dst === src) p.push('clone code equals source')
  if (/cym/.test(src) || /cym/.test(dst)) p.push('Welsh is out of scope (Tom)')
  return p
}
const rewriteId = (id, src, dst) => (String(id).startsWith(`${src}:`) ? `${dst}:${String(id).slice(src.length + 1)}` : id)

function dbUrl() { return process.env.DATABASE_URL || (fs.readFileSync(path.join(SHARED, '.env.psql'), 'utf8').match(/postgresql:\/\/[^\s"']+/) || [])[0] }
async function pg() { const { Client } = require('pg'); const c = new Client({ connectionString: dbUrl() }); await c.connect(); return c }
async function columns(c, table) {
  const { rows } = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND is_generated='NEVER' ORDER BY ordinal_position", [table])
  return rows.map((r) => r.column_name)
}
const ledger = () => (fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
function appendLedger(line) { fs.mkdirSync(path.dirname(LEDGER), { recursive: true }); fs.appendFileSync(LEDGER, JSON.stringify(line) + '\n') }

// Every content write carries an editor identity (CLAUDE.md): one event per create / drop.
async function editEvent(courseCode, operation, detail) {
  const env = {}; for (const l of fs.readFileSync(path.join(SHARED, '.env'), 'utf8').split('\n')) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
  const sb = require('@supabase/supabase-js').createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { serviceIdentity } = require(path.join(REPO, 'services/shared/editor-identity.cjs'))
  const { recordContentEdit } = require(path.join(REPO, 'services/shared/content-edit-log.cjs'))
  return recordContentEdit(sb, { identity: serviceIdentity('rechunk-short-legos-clone', { role: 'content-sweep' }), courseCode, operation,
    surface: 'tools/course-optimization/rechunk-short-legos/clone.cjs', scope: { seed_numbers: [1] }, detail: { job: '#192', ...detail } })
}

async function create(src, dst) {
  const problems = cloneCodeProblems(src, dst)
  const c = await pg()
  const { rows: [course] } = await c.query('SELECT * FROM courses WHERE course_code=$1', [src])
  if (!course) problems.push(`no course ${src}`)
  const { rows: [exists] } = await c.query('SELECT 1 FROM courses WHERE course_code=$1', [dst])
  if (exists) problems.push(`${dst} already exists — drop it first`)
  const counts = {}
  for (const t of TABLES) counts[t] = Number((await c.query(`SELECT count(*) FROM ${t} WHERE course_code=$1`, [src])).rows[0].count)
  console.error(`${src} → ${dst}: ${JSON.stringify(counts)}${problems.length ? '\nREFUSED: ' + problems.join('; ') : ''}`)
  if (problems.length) { await c.end(); process.exit(2) }
  if (!APPLY) { console.error('DRY RUN — nothing written'); await c.end(); return }
  const event = await editEvent(dst, 'course-clone', { source: src, rows: counts })
  try {
    await c.query('BEGIN')
    const row = { ...course, ...CLONE_ROW(course, dst) }
    const cc = (await columns(c, 'courses')).filter((k) => k in row)
    const json = new Set((await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='courses' AND data_type IN ('json','jsonb')")).rows.map((r) => r.column_name))
    await c.query(`INSERT INTO courses (${cc.join(',')}) VALUES (${cc.map((_, i) => '$' + (i + 1)).join(',')})`, cc.map((k) => (row[k] !== null && json.has(k) ? JSON.stringify(row[k]) : row[k])))
    for (const t of TABLES) {
      const cols = (await columns(c, t)).filter((k) => !(k === 'id' && t !== 'course_practice_phrases'))   // uuid ids are minted fresh
      const sel = cols.map((k) => (k === 'course_code' ? '$2' : k === 'id' ? `$2 || substr(id, length($1) + 1)` : k)).join(',')
      await c.query(`INSERT INTO ${t} (${cols.join(',')}) SELECT ${sel} FROM ${t} WHERE course_code=$1`, [src, dst])
    }
    const after = {}
    for (const t of TABLES) after[t] = Number((await c.query(`SELECT count(*) FROM ${t} WHERE course_code=$1`, [dst])).rows[0].count)
    for (const t of TABLES) if (after[t] !== counts[t]) throw new Error(`${t}: copied ${after[t]} of ${counts[t]}`)
    await c.query('COMMIT')
    appendLedger({ action: 'create', at: new Date().toISOString(), job: '#192', source: src, clone: dst, rows: { courses: 1, ...after }, audio: 'shared with source (no course_audio rows created)' })
    await c.query('REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index')
    console.error(`created ${dst}: ${JSON.stringify(after)}; round index refreshed`)
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); console.error('ROLLED BACK:', e.message); process.exitCode = 1 }
  await c.end()
}

async function drop(dst) {
  const made = ledger().filter((l) => l.clone === dst)
  const c = await pg()
  const { rows: [course] } = await c.query('SELECT status, new_app_status, visibility FROM courses WHERE course_code=$1', [dst])
  const problems = []
  if (!made.some((l) => l.action === 'create')) problems.push(`${dst} was not created by this tool (no ledger line) — refusing`)
  if (course && (course.status !== 'draft' || course.new_app_status !== 'not_available')) problems.push(`${dst} is ${course.status}/${course.new_app_status} — a clone that has been released is not dropped by a script`)
  // Every course-keyed table except course_audio (the clone owns no clip) and content_edit_events (history).
  const { rows: keyed } = await c.query(`SELECT c.table_name, c.column_name FROM information_schema.columns c JOIN information_schema.tables t USING (table_schema, table_name)
    WHERE c.table_schema='public' AND t.table_type='BASE TABLE' AND c.column_name IN ('course_code','course_id') AND c.table_name NOT IN ('course_audio','content_edit_events','courses')`)
  const plan = []
  for (const k of keyed) { const n = Number((await c.query(`SELECT count(*) FROM ${k.table_name} WHERE ${k.column_name}=$1`, [dst])).rows[0].count); if (n) plan.push({ ...k, n }) }
  const order = (t) => ({ course_practice_phrases: 0, lego_introductions: 1, course_legos: 2, course_seeds: 3 }[t] ?? -1)
  plan.sort((a, b) => order(a.table_name) - order(b.table_name))
  console.error(`${dst}: ${plan.map((p) => `${p.table_name} ${p.n}`).join(', ') || 'no rows'}${course ? ', courses 1' : ''}${problems.length ? '\nREFUSED: ' + problems.join('; ') : ''}`)
  if (problems.length) { await c.end(); process.exit(2) }
  if (!APPLY) { console.error('DRY RUN — nothing deleted'); await c.end(); return }
  await editEvent(dst, 'course-clone-drop', { rows: Object.fromEntries(plan.map((p) => [p.table_name, p.n])) })
  try {
    await c.query('BEGIN')
    for (const p of plan) await c.query(`DELETE FROM ${p.table_name} WHERE ${p.column_name}=$1`, [dst])
    await c.query('DELETE FROM courses WHERE course_code=$1', [dst])
    await c.query('COMMIT')
    appendLedger({ action: 'drop', at: new Date().toISOString(), clone: dst, rows: Object.fromEntries(plan.map((p) => [p.table_name, p.n])) })
    await c.query('REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index')
    console.error(`dropped ${dst}; round index refreshed`)
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); console.error('ROLLED BACK:', e.message); process.exitCode = 1 }
  await c.end()
}

if (require.main === module) {
  const fn = { create: () => create(A, B), drop: () => drop(A) }[CMD]
  if (!fn || !A) { console.error('usage: clone.cjs create <source> <clone> [--apply] | drop <clone> [--apply]'); process.exit(2) }
  fn().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
}
module.exports = { cloneCodeProblems, rewriteId, CLONE_ROW, TABLES, LEDGER }
