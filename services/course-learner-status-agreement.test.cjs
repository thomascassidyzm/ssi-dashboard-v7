// THE LEARNER-FACING STATUS MAY NEVER BE AHEAD OF THE INTERNAL ONE.
//
// courses.new_app_status is the only field that decides whether a learner is
// offered a course — every catalogue read in ssi-learning-app is the same
// predicate, `.in('new_app_status', ['live','beta'])`. courses.status is what
// the estate believes about the same course internally. They are supposed to
// move together, and services/production-api.cjs moves both in one write.
//
// On 2026-08-06 two direct-SQL statements moved only the learner-facing one on
// kor_for_hin, kor_for_tam, zho_for_hin and zho_for_tam. Four courses the
// estate believed were unfinished drafts were offered to learners as BETA for
// a month. Nothing compared the two fields, so nothing said so.
//
// The rule now lives in a CHECK constraint, because the write that broke it was
// hand-written SQL as `postgres` — no API guard, lint or nightly report is in
// the path of that write, and a constraint is. This test is the constraint's
// statement of intent: it asserts the rule holds over the live estate, that the
// constraint is actually installed, and that it bites in the harmful direction
// while leaving the safe one alone.
//
// SKIPPED, loudly and by name, when there is no `.env.psql` — a machine without
// the secret gets a named gap, never a green tick it did not earn.

import { describe, it, expect } from 'vitest'

const fs = require('fs')
const path = require('path')

const ENV_PSQL = path.join(__dirname, '..', '.env.psql')
const DATABASE_URL = process.env.DATABASE_URL || (fs.existsSync(ENV_PSQL)
  ? (fs.readFileSync(ENV_PSQL, 'utf8').match(/DATABASE_URL=(.+)/) || [])[1]?.trim()
  : null)

const CONSTRAINT = 'courses_learner_status_never_ahead_of_internal'

/** Same ladders as the constraint. Ordinals, not names — only the order matters. */
const INTERNAL_RANK = { draft: 1, beta: 2, released: 3 }
const LEARNER_RANK = { not_available: 0, draft: 1, beta: 2, live: 3 }

const suite = DATABASE_URL ? describe : describe.skip

async function withClient (fn) {
  const { Client } = require('pg')
  const c = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try {
    await c.query("set statement_timeout='60s'")
    return await fn(c)
  } finally { await c.end() }
}

const query = (sql) => withClient(async (c) => (await c.query(sql)).rows)

suite('courses.new_app_status never runs ahead of courses.status', () => {
  it('holds for every course in the estate', async () => {
    const rows = await query('select course_code, status, new_app_status from courses')
    expect(rows.length).toBeGreaterThan(0)
    const ahead = rows.filter(r => LEARNER_RANK[r.new_app_status] > INTERNAL_RANK[r.status])
    expect(ahead.map(r => `${r.course_code}: ${r.status} internally, ${r.new_app_status} to learners`)).toEqual([])
  })

  it('is enforced by a constraint, not merely by this test', async () => {
    const [row] = await query(
      `select pg_get_constraintdef(oid) as def from pg_constraint
        where conrelid = 'courses'::regclass and conname = '${CONSTRAINT}'`)
    expect(row, `${CONSTRAINT} is missing — apply ops/sql/20260907-learner-status-never-ahead-of-internal.sql`).toBeTruthy()
    expect(row.def).toMatch(/new_app_status/)
    expect(row.def).toMatch(/status/)
  })

  it('refuses to make a draft course learner-visible', async () => {
    await expect(withClient(async (c) => {
      await c.query('begin')
      try {
        // Any draft course will do; the rule is about the pair, not the course.
        await c.query(`update courses set new_app_status = 'beta'
                        where status = 'draft' and course_code =
                          (select course_code from courses where status = 'draft' order by course_code limit 1)`)
      } finally { await c.query('rollback') }
    })).rejects.toThrow(CONSTRAINT)
  })

  it('still allows pulling a released course back to beta', async () => {
    // Demotion must never be blocked: you must always be able to withdraw a
    // course. This is the half of the space the constraint deliberately leaves open.
    await withClient(async (c) => {
      await c.query('begin')
      try {
        const res = await c.query(`update courses set new_app_status = 'beta'
                                    where status = 'released' and new_app_status = 'live'`)
        expect(res.rowCount).toBeGreaterThan(0)
      } finally { await c.query('rollback') }
    })
  })
})
