#!/usr/bin/env node
/**
 * rehearse-switchover.cjs — prove a switchover AND its rollback on a throwaway clone of a
 * real course, before touching the real one.
 *
 * WHY NOT JUST APPLY-THEN-ROLLBACK ON THE REAL COURSE? Because rolling back does not restore
 * the exposures dropped on the way in: it re-derives progress from what survived. A live
 * apply → rollback → apply round-trip therefore pays the migration's cost TWICE out of real
 * learners' progress, to learn something a clone can tell you for free. So: clone the course
 * under a scratch course_code (no FK references course_code, so the clone is fully isolated),
 * run the real tool against the clone in both directions, assert the numbers, and drop it.
 *
 * --clean drops the scratch course and exits, for when a run dies half way.
 *
 *   node tools/pods/rehearse-switchover.cjs --course=hrv_for_eng --scratch=zzz_rehearsal \
 *     --stamp=2026-08-22 --promote-to=pod-1
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')
const { execFileSync } = require('child_process')
const path = require('path')

const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const COURSE = arg('course')
const SCRATCH = arg('scratch') || 'zzz_rehearsal'
const STAMP = arg('stamp') || '2026-08-22'
const PROMOTE_TO = arg('promote-to')
const CLEAN = process.argv.includes('--clean')

const log = (...a) => console.log(...a)

async function dropScratch (db) {
  await db.query('delete from learner_pod_state where course_code = $1', [SCRATCH])
  await db.query('delete from listening_pod_sentences where pod_id like $1', [`${SCRATCH}:%`])
  await db.query('delete from listening_pods where course_code = $1', [SCRATCH])
}

async function snapshot (db, course) {
  const pods = (await db.query(
    `select p.slug, count(s.*)::int n from listening_pods p
       left join listening_pod_sentences s on s.pod_id = p.id
      where p.course_code = $1 group by 1 order by 1`, [course])).rows
  const state = (await db.query(
    `select split_part(sentence_id,':',2) slug, count(*)::int rows, sum(exposures)::int exposures
       from learner_pod_state where course_code = $1 group by 1 order by 1`, [course])).rows
  return { pods, state }
}

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  if (CLEAN) { await dropScratch(db); log(`cleaned ${SCRATCH}`); await db.end(); return }

  log(`cloning ${COURSE} → ${SCRATCH} …`)
  await db.query('begin')
  try {
    await dropScratch(db)
    await db.query(
      // `visibility` copied too — a rehearsal against a copy whose pods are all
      // live would not rehearse a held course at all (Tom, 2026-08-23).
      `insert into listening_pods (id, course_code, pod_type, slug, pod_order, title, scene, difficulty, speakers, source_file, metadata, visibility)
       select replace(id, $1 || ':', $2 || ':'), $2, pod_type, slug, pod_order, title, scene, difficulty, speakers, source_file, metadata, visibility
         from listening_pods where course_code = $1`, [COURSE, SCRATCH])
    // Copy every column so the clone's canon — text, audio ids, ordering — is identical to
    // the real one. A rehearsal against a thinner copy would prove less than it looks.
    const cols = (await db.query(
      `select column_name from information_schema.columns
        where table_name = 'listening_pod_sentences' and column_name not in ('id','pod_id')
        order by ordinal_position`)).rows.map(r => r.column_name)
    const colList = cols.map(c => `"${c}"`).join(', ')
    const colSel = cols.map(c => `s."${c}"`).join(', ')
    await db.query(
      `insert into listening_pod_sentences (id, pod_id, ${colList})
       select replace(s.id, $1 || ':', $2 || ':'), replace(s.pod_id, $1 || ':', $2 || ':'), ${colSel}
         from listening_pod_sentences s join listening_pods p on p.id = s.pod_id
        where p.course_code = $1`, [COURSE, SCRATCH])
    await db.query(
      `insert into learner_pod_state (learner_id, course_code, sentence_id, exposures)
       select learner_id, $2, replace(sentence_id, $1 || ':', $2 || ':'), exposures
         from learner_pod_state where course_code = $1`, [COURSE, SCRATCH])
    await db.query('commit')
  } catch (e) { await db.query('rollback'); throw e }

  const before = await snapshot(db, SCRATCH)
  log('clone before:'); console.table(before.pods); console.table(before.state)

  const tool = path.join(__dirname, 'pod-switchover.cjs')
  const run = (extra) => {
    const args = [tool, `--course=${SCRATCH}`, `--stamp=${STAMP}`, ...(PROMOTE_TO ? [`--promote-to=${PROMOTE_TO}`] : []), ...extra]
    const out = execFileSync('node', args, { encoding: 'utf8', cwd: path.join(__dirname, '..', '..') })
    process.stdout.write(out.split('\n').map(l => '    ' + l).join('\n') + '\n')
    return out
  }

  log('\n=== FORWARD (--apply) ===')
  run(['--apply'])
  const after = await snapshot(db, SCRATCH)
  log('clone after forward:'); console.table(after.pods); console.table(after.state)

  log('\n=== ROLLBACK (--rollback --apply) ===')
  run(['--rollback', '--apply'])
  const rolled = await snapshot(db, SCRATCH)
  log('clone after rollback:'); console.table(rolled.pods); console.table(rolled.state)

  // The assertions that make this a proof rather than a demo.
  const problems = []
  const slugs = (s) => s.pods.map(p => p.slug).sort().join(',')
  if (slugs(rolled) !== slugs(before)) {
    problems.push(`rollback did not restore the pod slugs: before [${slugs(before)}], after rollback [${slugs(rolled)}]`)
  }
  for (const p of before.pods) {
    const q = rolled.pods.find(x => x.slug === p.slug)
    if (!q || q.n !== p.n) problems.push(`rollback: pod ${p.slug} holds ${q ? q.n : 'nothing'}, expected ${p.n}`)
  }
  const orph = Number((await db.query(
    `select count(*) n from learner_pod_state ls where ls.course_code = $1
       and not exists (select 1 from listening_pod_sentences s
                        where s.id = regexp_replace(ls.sentence_id, ':s\\d+$', ''))`, [SCRATCH])).rows[0].n)
  if (orph > 0) problems.push(`${orph} learner state rows point at no sentence after the round trip`)

  log('\n=== VERDICT ===')
  if (problems.length) { for (const p of problems) log(`  FAIL: ${p}`) } else {
    log('  PASS: forward and rollback both land, pods restored to their original slugs and counts, no orphaned progress.')
    log('  NOTE: exposures are expected to be LOWER after the round trip — rollback re-derives')
    log('        progress from what survived, it does not resurrect dropped exposures. That is documented behaviour.')
  }

  await dropScratch(db)
  log(`\ncleaned ${SCRATCH}.`)
  await db.end()
  if (problems.length) process.exit(1)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
