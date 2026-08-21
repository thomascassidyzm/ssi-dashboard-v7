#!/usr/bin/env node
/**
 * Clone cym_n_for_eng -> cym_nnew_for_eng (phase 1 of the Welsh North rebuild).
 *
 * The live course is NEVER written to. Every statement in here targets the clone.
 * Audio is carried by REFERENCE: the *_audio_id uuid columns are copied verbatim,
 * pointing at the existing course_audio rows. No asset is created, copied or deleted.
 *
 *   DRY_RUN=1 node tools/course-optimization/clone-cym-n-new-2026-08-21.cjs
 *   node tools/course-optimization/clone-cym-n-new-2026-08-21.cjs --apply
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const SRC = 'cym_n_for_eng'
const DST = 'cym_nnew_for_eng'  // 'cym_n_for_eng_new' is rejected by chk_course_code_format: the variant segment must precede _for_
const APPLY = process.argv.includes('--apply')

// Columns we must not copy verbatim: generated columns and identity/PK columns.
const GENERATED = new Set(['seed_id', 'lego_id_generated', 'text_stripped'])
const SKIP = {
  course_seeds: new Set(['id', 'seed_id']),
  course_legos: new Set(['id', 'lego_id']),
  course_practice_phrases: new Set(['id'])
}

function loadEnv() {
  const file = path.join(__dirname, '..', '..', '.env.psql')
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
}

async function columnsOf(db, table) {
  const { rows } = await db.query(
    `select column_name, is_generated, column_default
       from information_schema.columns
      where table_schema='public' and table_name=$1
      order by ordinal_position`, [table])
  return rows
    .filter(r => r.is_generated !== 'ALWAYS')
    .map(r => r.column_name)
    .filter(c => !SKIP[table].has(c) && !GENERATED.has(c))
}

async function main() {
  loadEnv()
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const log = { src: SRC, dst: DST, apply: APPLY, at: new Date().toISOString(), steps: [] }

  const exists = await db.query('select 1 from courses where course_code=$1', [DST])
  if (exists.rowCount) {
    console.error(`REFUSING: ${DST} already exists. Nothing done.`)
    process.exit(2)
  }

  const before = {}
  for (const t of ['course_seeds', 'course_legos', 'course_practice_phrases']) {
    const r = await db.query(`select count(*)::int n from ${t} where course_code=$1`, [SRC])
    before[t] = r.rows[0].n
  }
  log.source_counts = before
  console.log('source counts:', before)

  const statements = []

  // 1. the courses row — draft and hidden, never released.
  const courseCols = (await db.query(
    `select column_name from information_schema.columns
      where table_schema='public' and table_name='courses' order by ordinal_position`))
    .rows.map(r => r.column_name)
  // Overridden so the clone cannot surface to a learner in either app while it is being built.
  const OVERRIDE = ['course_code', 'status', 'visibility', 'display_name', 'seed_count',
    'new_app_status', 'legacy_app_status', 'export_ready',
    'released_at', 'featured_order', 'created_at', 'updated_at']
  const copyCourseCols = courseCols.filter(c => !OVERRIDE.includes(c))
  statements.push({
    label: 'courses row',
    sql: `insert into courses (course_code, status, visibility, display_name, seed_count,
                               new_app_status, legacy_app_status, export_ready, ${copyCourseCols.join(', ')})
          select $2, 'draft', 'hidden', display_name || ' (rebuild)', null,
                 'not_available', 'not_available', false, ${copyCourseCols.join(', ')}
            from courses where course_code = $1`,
    params: [SRC, DST]
  })

  // 2-4. content tables. course_code is rewritten; the phrase text PK is re-prefixed.
  for (const t of ['course_seeds', 'course_legos', 'course_practice_phrases']) {
    const cols = await columnsOf(db, t)
    const selects = cols.map(c => (c === 'course_code' ? '$2 as course_code' : c))
    if (t === 'course_practice_phrases') {
      cols.unshift('id')
      selects.unshift(`$2 || substring(id from position(':' in id)) as id`)
    }
    statements.push({
      label: t,
      sql: `insert into ${t} (${cols.join(', ')})
            select ${selects.join(', ')} from ${t} where course_code = $1 order by seed_number`,
      params: [SRC, DST]
    })
  }

  for (const st of statements) {
    if (!APPLY) {
      console.log(`\n[DRY RUN] ${st.label}\n${st.sql.replace(/\s+/g, ' ').slice(0, 240)}...`)
      log.steps.push({ label: st.label, dryRun: true })
      continue
    }
    const r = await db.query(st.sql, st.params)
    console.log(`[APPLIED] ${st.label}: ${r.rowCount} rows`)
    log.steps.push({ label: st.label, rows: r.rowCount })
  }

  if (APPLY) {
    const after = {}
    for (const t of ['course_seeds', 'course_legos', 'course_practice_phrases']) {
      const r = await db.query(`select count(*)::int n from ${t} where course_code=$1`, [DST])
      after[t] = r.rows[0].n
    }
    log.clone_counts = after
    console.log('clone counts:', after)
    // the live course must be untouched — prove it, do not assume it.
    for (const t of ['course_seeds', 'course_legos', 'course_practice_phrases']) {
      const r = await db.query(`select count(*)::int n from ${t} where course_code=$1`, [SRC])
      if (r.rows[0].n !== before[t]) throw new Error(`LIVE COURSE CHANGED on ${t}: ${before[t]} -> ${r.rows[0].n}`)
    }
    log.live_unchanged = true
  }

  const out = path.join(__dirname, '..', '..', 'docs',
    `cym-n-clone-${APPLY ? 'applied' : 'dryrun'}-log-2026-08-21.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log('log ->', out)
  await db.end()
}

main().catch(e => { console.error(e); process.exit(1) })
