#!/usr/bin/env node
/**
 * grant-pod-role — give one person a `learner_roles` row so RLS lets them see a
 * role-restricted listening pod (listening_pods.required_role), or take it away.
 *
 * WHY THIS EXISTS. The Senedd/S4C pod (cym_n_for_eng:senedd-s4c-steve) went live
 * on 2026-09-13 with required_role='previewer_001' (Tom's ruling, 16:17Z): visible
 * only to Steve Dimmich and SSi admin accounts. Access is decided by
 * listening_pods_public_read → current_user_has_role(), which reads learner_roles.
 * Nothing in the learner app or Popty writes learner_roles — there is no UI for
 * it — so a grant is one INSERT, and this is the one command that makes it.
 *
 * The person MUST already have signed in once: the row keys on learners.id, which
 * the app creates at first sign-in. A matching auth user with no learners row is
 * reported as such and nothing is written.
 *
 * Usage (dry-run by default; nothing is written without --apply):
 *   node tools/pods/grant-pod-role.cjs --email=steve@example.com                  # preview grant of previewer_001
 *   node tools/pods/grant-pod-role.cjs --email=steve@example.com --apply          # grant
 *   node tools/pods/grant-pod-role.cjs --email=steve@example.com --revoke --apply # revoke (sets removed_at)
 *   node tools/pods/grant-pod-role.cjs --list                                     # who holds the role now
 *   --role=<name>   defaults to previewer_001 (free text on both sides on purpose — see the column comment)
 *   --note="…"      optional free text on the row
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')

const DEFAULT_ROLE = 'previewer_001'

function parseArgs(argv) {
  const out = { role: DEFAULT_ROLE, apply: false, revoke: false, list: false, email: null, note: null }
  for (const a of argv) {
    const m = a.match(/^--([a-z]+)(?:=(.*))?$/)
    if (!m) throw new Error(`unrecognised argument: ${a}`)
    const [, k, v] = m
    if (k === 'apply' || k === 'revoke' || k === 'list') out[k] = true
    else if (k === 'email' || k === 'role' || k === 'note') out[k] = (v || '').trim()
    else throw new Error(`unrecognised flag: --${k}`)
  }
  if (!out.list && !out.email) throw new Error('need --email=<address> (or --list)')
  if (!out.role) throw new Error('--role must not be empty')
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    if (args.list) {
      const { rows } = await db.query(
        `SELECT u.email, r.learner_id, r.granted_at, r.granted_by, r.note
           FROM learner_roles r
           JOIN learners l ON l.id = r.learner_id
           LEFT JOIN auth.users u ON u.id::text = l.user_id
          WHERE r.role = $1 AND r.removed_at IS NULL
          ORDER BY u.email`, [args.role])
      console.log(`${rows.length} live holder(s) of ${args.role}:`)
      for (const r of rows) console.log(`  ${r.email || '(no auth user)'}  learner ${r.learner_id}  granted ${r.granted_at.toISOString()} by ${r.granted_by || '?'}`)
      return
    }

    // Exact email, case-insensitive, in the live auth table — never a guess.
    const { rows: users } = await db.query(
      `SELECT u.id::text AS user_id, u.email, l.id AS learner_id, l.display_name
         FROM auth.users u LEFT JOIN learners l ON l.user_id = u.id::text
        WHERE lower(u.email) = lower($1)`, [args.email])
    if (users.length === 0) {
      console.error(`NO MATCH: no auth user with email ${args.email}. They have not signed up; nothing written.`)
      process.exit(2)
    }
    const u = users[0]
    if (!u.learner_id) {
      console.error(`NO LEARNER ROW: auth user ${u.user_id} (${u.email}) exists but has never signed in to the app, so learners has no row to attach the role to. Ask them to sign in once, then re-run. Nothing written.`)
      process.exit(3)
    }
    const { rows: existing } = await db.query(
      `SELECT id, granted_at FROM learner_roles WHERE learner_id = $1 AND role = $2 AND removed_at IS NULL`,
      [u.learner_id, args.role])

    const verb = args.revoke ? 'REVOKE' : 'GRANT'
    console.log(`${args.apply ? '' : 'DRY-RUN '}${verb} ${args.role} — ${u.email} (${u.display_name || 'no name'}), learner ${u.learner_id}${existing.length ? ` — currently HOLDS it since ${existing[0].granted_at.toISOString()}` : ' — does not hold it'}`)

    if (args.revoke) {
      if (!existing.length) { console.log('nothing to revoke'); return }
      if (!args.apply) return
      await db.query(`UPDATE learner_roles SET removed_at = now() WHERE id = $1`, [existing[0].id])
      console.log('revoked')
      return
    }
    if (existing.length) { console.log('already granted; nothing to do'); return }
    if (!args.apply) return
    const grantedBy = `tools/pods/grant-pod-role.cjs by ${process.env.USER || 'unknown'}`
    const note = args.note || `granted via grant-pod-role for ${u.email}`
    const { rows: ins } = await db.query(
      `INSERT INTO learner_roles (learner_id, role, granted_by, note) VALUES ($1, $2, $3, $4) RETURNING id, granted_at`,
      [u.learner_id, args.role, grantedBy, note])
    console.log(`granted: learner_roles ${ins[0].id} at ${ins[0].granted_at.toISOString()}`)
  } finally {
    await db.end()
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message || e); process.exit(1) })
}
module.exports = { parseArgs, DEFAULT_ROLE }
