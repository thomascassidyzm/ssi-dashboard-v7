#!/usr/bin/env node
/**
 * welsh-phrase-queues-619.cjs — job #619 (Aran, 2026-10-13).
 *
 *   PRACTICE PHRASES (task A) need NO write: the sandboxes already cast their readers (cym_nv2_for_eng
 *   voice_config: Catrin target1, Aran target2; cym_sv2_for_eng: Dan, Eleri; the 'eng' policy castOn: Aran's
 *   English on both known sides), and the queue code reads that cast (services/voice-engine/phrase-queue.cjs).
 *   The dry run reports what each reader is served.
 *
 *   THE NORTH ENGLISH PROMPTS HELD BY SYNTHETIC SPEECH (task B) need ONE policy write: the eng castOn entry for
 *   live cym_n_for_eng's known side gains `synthetic: 'queue'` — the line enters /r/human_aran_eng, and a take
 *   NEVER moves the live slot (recordist-queue.cjs SYNTHETIC_MODES). Replacing the synthetic clip on record is
 *   Tom's switch and stays OFF:
 *
 *   node tools/recording/welsh-phrase-queues-619.cjs                          # dry run: phrase batches + task B lines, no write
 *   node tools/recording/welsh-phrase-queues-619.cjs --apply                  # backup, then write synthetic:'queue'
 *   node tools/recording/welsh-phrase-queues-619.cjs --replace-synthetic on   # TOM'S YES ONLY: dry run of the switch;
 *   node tools/recording/welsh-phrase-queues-619.cjs --replace-synthetic on --apply   #   add --apply to throw it
 *   node tools/recording/welsh-phrase-queues-619.cjs --replace-synthetic off --apply  # back to queue-only
 *   node tools/recording/welsh-phrase-queues-619.cjs --undo [--apply]         # restore the eng row from the pre-apply backup
 *
 * Backups: table backup_language_recording_policy_619 (one row per write, label + voices) and
 *          ~/ssi-evidence/ssi-dashboard-v7/tools/recording/welsh-phrase-queues-619-backup.json
 * Never touches course content, voice_config, canonical_seeds, or any audio. No TTS.
 */
'use strict'
const fs = require('fs')
const path = require('path')
const os = require('os')
for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env']) if (fs.existsSync(p) && !process.env.SUPABASE_URL) require('dotenv').config({ path: p, quiet: true })
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p) && !process.env.DATABASE_URL) require('dotenv').config({ path: p, quiet: true })
const { createClient } = require('@supabase/supabase-js')
const q = require('../../services/voice-engine/recordist-queue.cjs')

const LIVE_NORTH = 'cym_n_for_eng'
const ENG_VOICE = 'human_aran_eng'
const BACKUP_JSON = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/tools/recording/welsh-phrase-queues-619-backup.json')
// #606's committed ledger of Welsh known slots emptied on Tom's GO (2026-10-13): they held only Tom-clone TTS.
const LEDGER_606 = path.join(__dirname, '../../ops/welsh-tom-clone-revert-606/no-human-take.csv')
const READERS = ['human_catrinlliar_cym_n', 'human_aran_cym_n', 'human_dan_cym_s', 'human_eleri_cym_s', ENG_VOICE]

/** Live-North course_seeds ids #606 emptied of synthetic speech (no human take). */
function emptiedNorthSeeds() {
  const [head, ...lines] = fs.readFileSync(LEDGER_606, 'utf8').trim().split('\n')
  const cols = head.split(',')
  const at = (row, c) => row[cols.indexOf(c)]
  return lines.map((l) => l.split(',')).filter((r) => at(r, 'course_code') === LIVE_NORTH && at(r, 'tbl') === 'course_seeds').map((r) => at(r, 'pk'))
}

/** The eng row's voices with the live-North known castOn set to `mode` (null removes the key). */
function withSyntheticMode(voices, mode) {
  const out = JSON.parse(JSON.stringify(voices))
  let hit = 0
  for (const v of Object.values(out)) {
    if (v.voiceId !== ENG_VOICE) continue
    for (const c of v.castOn || []) {
      if (c.courseCode === LIVE_NORTH && c.role === 'known') {
        if (mode) { c.synthetic = mode; c.syntheticSeeds = emptiedNorthSeeds() } else { delete c.synthetic; delete c.syntheticSeeds }
        hit += 1
      }
    }
  }
  if (hit !== 1) throw new Error(`expected exactly one ${ENG_VOICE} castOn on ${LIVE_NORTH} known, found ${hit}`)
  return out
}

/** The live client, with language_recording_policy answered from `policies` (a dry run's proposed rows). */
function withPolicies(db, policies) {
  return {
    from(table) {
      if (table !== 'language_recording_policy') return db.from(table)
      const ok = (data) => ({ data, error: null })
      const qq = {
        select() { return qq }, order() { return qq },
        eq(col, val) { return { ...qq, then: (r, j) => Promise.resolve(ok(policies.filter((p) => p[col] === val))).then(r, j) } },
        then(r, j) { return Promise.resolve(ok(policies)).then(r, j) },
      }
      return qq
    },
  }
}

async function report(db) {
  const out = { readers: {} }
  for (const v of READERS) {
    const r = await q.resolveRecordist(db, v)
    if (!r) { out.readers[v] = 'NOT A RECORDIST'; continue }
    const queue = await q.buildQueue(db, r, { includeRecorded: true })
    const phrases = queue.lines.filter((l) => l.kind === 'phrase')
    out.readers[v] = {
      phrases: queue.phrases,
      servedPhraseLines: phrases.length,
      firstPhrases: phrases.slice(0, 3).map((l) => `${l.id} | ${l.text}`),
      seedLinesOutstanding: queue.lines.filter((l) => l.kind === 'seed' && !l.recorded).length,
    }
  }
  // Task B in detail: the seed lines queued BECAUSE a live-North known slot holds synthetic speech.
  const lang = await q.buildLanguageLines(db, 'eng', { cache: new Map() })
  const syn = [...lang.byBucket.values()].flat().filter((l) => l.syntheticHeld)
  out.taskB = {
    ledgerSeeds: emptiedNorthSeeds().length,
    syntheticHeldLines: syn.length,
    syntheticHeldSlots: syn.reduce((n, l) => n + l.syntheticHeld, 0),
    lines: syn.map((l) => `#${l.seedNumber} ${l.courseCode}: ${l.text}`),
  }
  return out
}

async function pgClient() {
  const { Client } = require('pg')
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  return c
}

async function backup(label, row) {
  const c = await pgClient()
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS backup_language_recording_policy_619 (
      taken_at timestamptz NOT NULL DEFAULT now(), label text NOT NULL, language text NOT NULL, voices jsonb NOT NULL)`)
    await c.query('INSERT INTO backup_language_recording_policy_619 (label, language, voices) VALUES ($1, $2, $3)', [label, row.language, JSON.stringify(row.voices)])
  } finally { await c.end() }
  const prior = fs.existsSync(BACKUP_JSON) ? JSON.parse(fs.readFileSync(BACKUP_JSON, 'utf8')) : []
  prior.push({ takenAt: new Date().toISOString(), label, language: row.language, voices: row.voices })
  fs.mkdirSync(path.dirname(BACKUP_JSON), { recursive: true })
  fs.writeFileSync(BACKUP_JSON, JSON.stringify(prior, null, 2))
}

async function main() {
  const argv = process.argv.slice(2)
  const apply = argv.includes('--apply')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: rows, error } = await db.from('language_recording_policy').select('*').order('language')
  if (error) throw error
  const eng = rows.find((r) => r.language === 'eng')
  if (!eng) throw new Error('no eng policy row (job #588 writes it first)')

  if (argv.includes('--undo')) {
    const c = await pgClient()
    let pre
    try {
      const r = await c.query(`SELECT voices, taken_at FROM backup_language_recording_policy_619 WHERE language = 'eng' AND label = 'pre-apply' ORDER BY taken_at ASC LIMIT 1`)
      pre = r.rows[0]
    } finally { await c.end() }
    if (!pre) throw new Error('no pre-apply backup row')
    console.log(`undo: restore eng voices from the pre-apply backup taken ${pre.taken_at.toISOString()}`)
    if (!apply) { console.log('(dry run: add --apply)'); return }
    await backup('pre-undo', eng)
    const { error: e } = await db.from('language_recording_policy').update({ voices: pre.voices }).eq('language', 'eng')
    if (e) throw e
    q.invalidateLanguageQueueCache('eng')
    const { data: after } = await db.from('language_recording_policy').select('voices').eq('language', 'eng').single()
    console.log(JSON.stringify(after.voices) === JSON.stringify(pre.voices) ? 'undone: eng voices equal the pre-apply backup' : 'UNDO MISMATCH')
    return
  }

  const flip = argv.indexOf('--replace-synthetic')
  const mode = flip >= 0 ? ({ on: 'replace', off: 'queue' })[argv[flip + 1]] : 'queue'
  if (!mode) throw new Error('--replace-synthetic takes on|off')
  const voices = withSyntheticMode(eng.voices, mode)
  const proposed = rows.map((r) => (r.language === 'eng' ? { ...r, voices } : r))
  if (!apply) {
    console.log(JSON.stringify(await report(withPolicies(db, proposed)), null, 2))
    console.log(`\n(dry run — nothing written; would set ${LIVE_NORTH} known castOn synthetic: '${mode}')`)
    return
  }
  if (mode === 'replace' && !argv.includes('--tom-said-yes')) {
    throw new Error("replace mode replaces live cym_n_for_eng English prompts on record: Tom's call. Add --tom-said-yes once he has.")
  }
  await backup(flip >= 0 ? `pre-switch-${mode}` : 'pre-apply', eng)
  console.log('backup written (table backup_language_recording_policy_619 + ' + BACKUP_JSON + ')')
  const { error: e } = await db.from('language_recording_policy').update({ voices }).eq('language', 'eng')
  if (e) throw e
  console.log(`applied: ${LIVE_NORTH} known castOn synthetic: '${mode}'`)
  console.log(JSON.stringify((await report(db)).taskB, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
