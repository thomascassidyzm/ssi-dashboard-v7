#!/usr/bin/env node
/**
 * restore-pod-text-from-snapshot.cjs — put a pod's target_text / target_text_draft
 * back exactly as a snapshot recorded them.
 *
 * Written alongside the 2026-09-10 Senedd Welsh drafting run so that the undo for a
 * production write is a command somebody can run under pressure, not a thing they have
 * to reconstruct. It restores TEXT ONLY: target_text and target_text_draft. No audio
 * pointer, no known-side column, no pod metadata is touched, and a row that is already
 * identical to the snapshot is left alone rather than rewritten.
 *
 *   node tools/pods/restore-pod-text-from-snapshot.cjs --file=<snapshot.json>          # dry run
 *   node tools/pods/restore-pod-text-from-snapshot.cjs --file=<snapshot.json> --apply
 *
 * The snapshot is the shape written by the drafting run: { pod_id, sentences: [...] }.
 */
'use strict'
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: process.env.SSI_ENV_PSQL || path.join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')

const arg = (n) => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=')
const FILE = arg('file')
const APPLY = process.argv.includes('--apply')

async function main () {
  if (!FILE) throw new Error('--file=<snapshot.json> is required')
  const snap = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  if (!snap.pod_id || !Array.isArray(snap.sentences)) throw new Error('not a pod snapshot: needs pod_id and sentences[]')

  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const live = new Map((await db.query(
      'select id, target_text, target_text_draft from listening_pod_sentences where pod_id=$1', [snap.pod_id]
    )).rows.map(r => [r.id, r]))

    const same = (a, b) => String(a.target_text || '') === String(b.target_text || '') &&
      Boolean(a.target_text_draft) === Boolean(b.target_text_draft)

    const missing = snap.sentences.filter(s => !live.has(s.id))
    if (missing.length) throw new Error(`${missing.length} snapshot rows no longer exist (e.g. ${missing[0].id}) — stopping`)

    const ops = snap.sentences.filter(s => !same(s, live.get(s.id)))
    console.log(`${snap.pod_id}: ${snap.sentences.length} rows in snapshot, ${ops.length} differ from live`)
    for (const o of ops) {
      const cur = live.get(o.id)
      console.log(`  ${o.id}\n    live: ${JSON.stringify(String(cur.target_text || '').slice(0, 80))} draft=${cur.target_text_draft}` +
        `\n    snap: ${JSON.stringify(String(o.target_text || '').slice(0, 80))} draft=${o.target_text_draft}`)
    }
    if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return }
    await db.query('begin')
    try {
      for (const o of ops) {
        await db.query(
          'update listening_pod_sentences set target_text=$2, target_text_draft=$3 where id=$1',
          [o.id, o.target_text, o.target_text_draft]
        )
      }
      await db.query('commit')
      console.log(`RESTORED ${ops.length} rows.`)
    } catch (e) { await db.query('rollback'); throw e }
  } finally { await db.end() }
}

if (require.main === module) main().catch(e => { console.error(`FAILED: ${e.message}`); process.exit(1) })
