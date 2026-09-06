// THE POD SLUG IS DERIVED, IN SQL TOO.
//
// estate_map() decided "does this course have a pod at all?" with the literal
// `WHERE p.slug = 'pod-0'`. After Tom's 1-based ruling of 2026-08-22 that made
// the estate map — the estate's own declared source of truth — report the 22
// courses on `pod-1` as having NO POD, and count their live pods as staging
// ones. A hardcoded slug standing in for a derivation is the recurring bug
// shape here; this test is the shape being refused in the one place a unit test
// could not previously see, which is why it talks to the database.
//
// It is SKIPPED, loudly and by name, when there is no `.env.psql` — a machine
// without the secret gets a named gap, never a green tick it did not earn.

import { describe, it, expect } from 'vitest'

const fs = require('fs')
const path = require('path')

const ENV_PSQL = path.join(__dirname, '..', '.env.psql')
const DATABASE_URL = process.env.DATABASE_URL || (fs.existsSync(ENV_PSQL)
  ? (fs.readFileSync(ENV_PSQL, 'utf8').match(/DATABASE_URL=(.+)/) || [])[1]?.trim()
  : null)

/** Same list, same order, as src/lib/servingPod.js and player-vue's servedPod.ts. */
const SERVING_SLUGS = ['pod-1', 'pod-0']

const suite = DATABASE_URL ? describe : describe.skip

async function query (sql) {
  const { Client } = require('pg')
  const c = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try {
    await c.query("set statement_timeout='120s'")
    return (await c.query(sql)).rows
  } finally { await c.end() }
}

suite('estate_map() derives the serving pod, never assumes a slug', () => {
  it('has no serving-slug literal left in its definition', async () => {
    const [{ def }] = await query(
      "select pg_get_functiondef(oid) as def from pg_proc where proname = 'estate_map'")
    // Comments explaining the history are fine; a quoted SQL literal is not.
    const code = def.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
    for (const slug of SERVING_SLUGS) expect(code).not.toContain(`'${slug}'`)
    expect(code).toContain('serving_pod')
  }, 60_000)

  it('public.serving_pod gives every course with a core pod exactly one answer, pod-1 first', async () => {
    const rows = await query(`
      select p.course_code, p.slug as raw, sp.slug as served
      from public.listening_pods p
      left join public.serving_pod sp on sp.course_code = p.course_code
      where p.slug in ('pod-1','pod-0') and (p.pod_type is null or p.pod_type = 'core')`)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.served).not.toBeNull()
      // pod-1 wins wherever it exists; nothing else is ever served.
      expect(SERVING_SLUGS).toContain(r.served)
      if (r.raw === 'pod-1') expect(r.served).toBe('pod-1')
    }
  }, 60_000)

  it('reports the pod each course actually serves, whatever its slug', async () => {
    const [{ j }] = await query('select estate_map() as j')
    const served = new Map((await query('select course_code, pod_id, slug from public.serving_pod'))
      .map(r => [r.course_code, r]))
    expect(served.size).toBeGreaterThan(0)

    const missing = []
    const wrong = []
    for (const c of j.courses) {
      const truth = served.get(c.course_code)
      if (!truth) continue
      if (!c.serving_pod?.exists) { missing.push(c.course_code); continue }
      if (c.serving_pod.pod_id !== truth.pod_id) wrong.push(c.course_code)
      // `pod_0` is the original key kept live: same object, never a second answer.
      expect(c.pod_0.pod_id).toBe(c.serving_pod.pod_id)
    }
    expect(missing).toEqual([])
    expect(wrong).toEqual([])

    // A course's own live pod is never one of its "staging" (parked) pods.
    const [{ n }] = await query(`
      select count(*)::int as n from public.listening_pods p
      join public.serving_pod sp on sp.pod_id = p.id`)
    const stagingTotal = j.courses.reduce((t, c) => t + Number(c.staging_pods || 0), 0)
    const [{ all }] = await query('select count(*)::int as all from public.listening_pods')
    expect(stagingTotal).toBe(all - n)
  }, 120_000)
})
