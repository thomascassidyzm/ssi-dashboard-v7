#!/usr/bin/env node
/**
 * The write half of cym-n-health-recast — see that file for the ruling, the
 * edits and why they are what they are. Everything here is one transaction over
 * DATABASE_URL (.env.psql): text edits + version history, the speaker split,
 * the cast, and the registration of the held pod. Dry run by default.
 */
'use strict'
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')
const R = require('./cym-n-health-recast.cjs')

const APPLY = process.argv.includes('--apply')
const log = { mode: APPLY ? 'APPLIED' : 'DRY_RUN', edits: [], speakers: {}, cast: {}, registration: {}, verify: {} }

/** freeze-then-append, exactly as api/canonical-script.js does it. */
async function recordVersion(db, line, patch) {
  const { rows: existing } = await db.query(
    `select 1 from canonical_script_versions where scenario_id=$1 and kind='original'`, [line.id])
  if (!existing.length) {
    await db.query(
      `insert into canonical_script_versions (scenario_id, pod_slug, kind, english_text, speaker, author_notes, target_text, target_lang, saved_by)
       values ($1,$2,'original',$3,$4,$5,$6,$7,$8)`,
      [line.id, line.pod_slug, line.english_text ?? '', line.speaker, line.author_notes, line.target_text, line.target_lang, R.SAVED_BY])
  }
  const next = { ...line, ...patch }
  await db.query(
    `insert into canonical_script_versions (scenario_id, pod_slug, kind, english_text, speaker, author_notes, target_text, target_lang, saved_by)
     values ($1,$2,'save',$3,$4,$5,$6,$7,$8)`,
    [line.id, line.pod_slug, next.english_text ?? '', next.speaker, next.author_notes, next.target_text, next.target_lang, R.SAVED_BY])
}

async function applyEdits(db, slug, field, edits) {
  for (const [order, from, to] of edits) {
    const { rows } = await db.query(
      `select * from canonical_pod_scenarios where pod_slug=$1 and global_order=$2`, [slug, order])
    if (rows.length !== 1) throw new Error(`DRIFT ${slug}#${order}: expected one row, found ${rows.length}`)
    const line = rows[0]
    if (line[field] !== from) {
      throw new Error(`DRIFT ${slug}#${order}: stored ${field} is not the words this edit was written against.\n  stored:   ${JSON.stringify(line[field])}\n  expected: ${JSON.stringify(from)}`)
    }
    const notes = `${line.author_notes || ''} · ✏ ${R.STAMP}`.trim()
    const patch = { [field]: to, author_notes: notes }
    log.edits.push({ id: line.id, field, from, to })
    if (!APPLY) continue
    await recordVersion(db, line, patch)
    const r = await db.query(
      `update canonical_pod_scenarios set ${field}=$3, author_notes=$4, updated_at=now()
        where id=$1 and ${field}=$2`, [line.id, from, to, notes])
    if (r.rowCount !== 1) throw new Error(`DRIFT ${line.id}: update matched ${r.rowCount} rows`)
  }
}

async function splitSpeakers(db, slug) {
  const { rows } = await db.query(
    `select id, scene_number, speaker from canonical_pod_scenarios where pod_slug=$1 order by global_order`, [slug])
  const counts = {}
  for (const r of rows) {
    const next = R.speakerFor(r.scene_number, r.speaker)
    // Idempotent: a re-run finds the four names already in place and asks for nothing.
    if (!next) {
      if (Object.values(R.CAST)[0] && Object.keys(R.CAST).includes(r.speaker)) { counts[r.speaker] = (counts[r.speaker] || 0) + 1; continue }
      throw new Error(`UNKNOWN speaker ${JSON.stringify(r.speaker)} on ${r.id} — refusing to guess`)
    }
    counts[next] = (counts[next] || 0) + 1
    if (APPLY) await db.query(`update canonical_pod_scenarios set speaker=$2, updated_at=now() where id=$1`, [r.id, next])
  }
  log.speakers[slug] = counts
}

async function castPod(db) {
  const { rows } = await db.query(`select voice_config from courses where course_code=$1`, [R.COURSE])
  if (rows.length !== 1) throw new Error(`no courses row for ${R.COURSE}`)
  const vc = rows[0].voice_config || {}
  const podCast = { ...(vc.podCast || {}) }
  for (const [speaker, voice] of Object.entries(R.CAST)) podCast[speaker] = { ...voice }
  log.cast = Object.fromEntries(Object.entries(R.CAST).map(([s, v]) => [s, v.voiceId]))
  if (APPLY) {
    await db.query(`update courses set voice_config = jsonb_set($2::jsonb, '{podCast}', $3::jsonb, true) where course_code=$1`,
      [R.COURSE, JSON.stringify(vc), JSON.stringify(podCast)])
  }
}

async function register(db) {
  const { rows: canon } = await db.query(
    `select c.id, c.scene_number, c.sentence_number, c.global_order, c.speaker, c.variant_key,
            c.attach_sentence_number, c.target_text, c.author_notes, e.english_text
       from canonical_pod_scenarios c
       join canonical_pod_scenarios e on e.pod_slug=$2 and e.global_order=c.global_order
      where c.pod_slug=$1 order by c.global_order`, [R.CYM_SLUG, R.ENG_SLUG])
  if (canon.length !== 438) throw new Error(`expected 438 canonical rows, got ${canon.length}`)
  const missing = canon.filter(r => !r.target_text || !r.english_text)
  if (missing.length) throw new Error(`${missing.length} rows have no text — refusing to register a half-written pod`)

  // The pod's own speaker map, the shape listening_pods.speakers already uses on
  // the Welsh pods beside it: one entry per character, human voice both sides.
  const speakers = {}
  for (const [name, v] of Object.entries(R.CAST)) {
    speakers[name] = {
      gender: v.gender,
      target: { name: v.name, provider: 'human', voice_id: v.voiceId },
      known: { name: v.name, provider: 'human', voice_id: v.voiceId },
    }
  }
  log.registration = { pod_id: R.POD_ID, sentences: canon.length, visibility: 'held', speakers: Object.keys(speakers) }
  if (!APPLY) return canon

  await db.query(
    `insert into listening_pods (id, course_code, pod_type, slug, title, speakers, visibility, source_file, metadata, updated_at)
     values ($1,$2,'choice','health',$3,$4::jsonb,'held',$5,'{}'::jsonb, now())
     on conflict (id) do update set speakers=excluded.speakers, title=excluded.title, updated_at=now()`,
    [R.POD_ID, R.COURSE, 'Health — ward and surgery', JSON.stringify(speakers), 'tools/pods/cym-n-health-recast.cjs'])

  // Wholesale replace, the same semantics pod-sync uses. Nothing is linked to
  // audio here — the pod has none — so no take can be orphaned by it.
  await db.query(`delete from listening_pod_sentences where pod_id=$1`, [R.POD_ID])
  for (const r of canon) {
    await db.query(
      `insert into listening_pod_sentences
         (id, pod_id, scene_number, sentence_number, global_order, speaker, target_text, known_text,
          variant_key, attach_sentence_number, beat_label, target_text_draft)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)`,
      [r.id.replace(R.CYM_SLUG, R.POD_ID), R.POD_ID, r.scene_number, r.sentence_number, r.global_order,
       r.speaker, r.target_text, r.english_text, r.variant_key, r.attach_sentence_number, r.author_notes])
  }
  return canon
}

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    await db.query('BEGIN')
    await applyEdits(db, R.ENG_SLUG, 'english_text', R.ENGLISH_EDITS)
    await applyEdits(db, R.CYM_SLUG, 'target_text', R.WELSH_EDITS)
    await splitSpeakers(db, R.ENG_SLUG)
    await splitSpeakers(db, R.CYM_SLUG)
    await castPod(db)
    await register(db)

    // VERIFY INSIDE THE TRANSACTION, so a failed check takes the writes with it.
    const { rows: after } = await db.query(
      `select c.id, c.scene_number, c.speaker, c.variant_key, c.global_order, c.target_text, e.english_text
         from canonical_pod_scenarios c
         join canonical_pod_scenarios e on e.pod_slug=$2 and e.global_order=c.global_order
        where c.pod_slug=$1 order by c.global_order`, [R.CYM_SLUG, R.ENG_SLUG])
    const rows = APPLY ? after : after.map(r => {
      const we = R.WELSH_EDITS.find(([o]) => o === r.global_order)
      const ee = R.ENGLISH_EDITS.find(([o]) => o === r.global_order)
      return { ...r, speaker: R.speakerFor(r.scene_number, r.speaker) || r.speaker,
               target_text: we ? we[2] : r.target_text, english_text: ee ? ee[2] : r.english_text }
    })
    const bad = R.sameSexExchanges(rows)
    const residue = R.femaleResidue(rows)
    const perVoice = {}
    for (const r of rows) { const v = R.CAST[r.speaker]; if (v) perVoice[v.name] = (perVoice[v.name] || 0) + 1 }
    log.verify = { same_sex_exchanges: bad, female_residue: residue, lines_per_recordist: perVoice, scenes: new Set(rows.map(r => r.scene_number)).size }
    if (bad.length) throw new Error(`STOP: ${bad.length} same-sex exchanges remain — ${JSON.stringify(bad.slice(0, 5))}`)
    if (residue.length) throw new Error(`STOP: female-marked text survives — ${JSON.stringify(residue.slice(0, 5))}`)

    if (APPLY) { await db.query('COMMIT') } else { await db.query('ROLLBACK') }
  } catch (e) {
    await db.query('ROLLBACK')
    console.error('FAILED:', e.message)
    process.exitCode = 1
  } finally {
    await db.end()
  }
  const out = evidencePath(`docs/pods/cym-n-health-recast-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(JSON.stringify({ mode: log.mode, edits: log.edits.length, speakers: log.speakers, cast: log.cast, registration: log.registration, verify: log.verify }, null, 2))
  console.log(`log: ${out}`)
})()
