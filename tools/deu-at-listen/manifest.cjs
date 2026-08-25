#!/usr/bin/env node
/**
 * Build the listening manifest for Sasha's Austrian German human clips.
 *
 * Usage: node tools/deu-at-listen/manifest.cjs [--out <dir>]
 *
 * READ-ONLY on the database. It writes exactly one file: manifest-<course>.json
 * in the data dir. It never touches course_audio, never renders audio.
 *
 * WHAT A ROW IS. One row per LIVE clip — i.e. per course_audio row with
 * origin='human' for deu_at_for_eng. That is the thing a learner actually
 * hears, so it is the thing Kai has to be able to judge. The takes that did
 * NOT win the binding are carried alongside as context (`takes`), because
 * "this line was recorded four times" is the single strongest predictor that
 * the bound one is the wrong one.
 *
 * ACCEPTANCE. There is none to read. The recorder's Approve tick is client-only
 * state in script mode (useAutocueState.finalizeSession returns early for
 * scriptMode, so approvedSegments is never POSTed anywhere), and no column,
 * table or quality_notes key records it. Every clip therefore carries
 * accepted:false and the page says so at the top rather than implying a
 * verdict nobody gave.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const REPO = path.join(__dirname, '..', '..')
const COURSE = 'deu_at_for_eng'
const outIdx = process.argv.indexOf('--out')
const DATA_DIR = outIdx > -1 ? process.argv[outIdx + 1] : path.join(REPO, 'scripts', 'deu-at-listen')

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DATABASE_URL = (fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  .match(/^DATABASE_URL=(.*)$/m) || [])[1].replace(/^["']|["']$/g, '')

function q(sql) {
  const out = execFileSync(PSQL, [DATABASE_URL, '-At', '-F', '\t', '-c', sql], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  })
  return out.split('\n').filter(Boolean).map((l) => l.split('\t'))
}

// The live clips.
const clips = q(`
  select id, text, s3_key, coalesce(duration_ms::text,'') , audio_revision::text
  from course_audio
  where course_code = '${COURSE}' and origin = 'human'
  order by created_at
`).map(([id, text, s3_key, duration_ms, audio_revision]) => ({
  id, text, s3_key,
  duration_ms: duration_ms ? Number(duration_ms) : null,
  audio_revision: Number(audio_revision),
}))

// Every natural take Sasha recorded, by line. The join back to a clip is on
// TEXT, because that is the identity course_audio itself is keyed on.
const takes = q(`
  select
    audio_uuid,
    quality_notes::jsonb->>'text',
    recorded_at::text,
    created_at::text,
    quality_notes::jsonb->>'s3_key',
    coalesce(quality_notes::jsonb->>'seed_number',''),
    case when quality_notes::jsonb ? 'superseded_by' then '1' else '0' end
  from recording_provenance
  where recorded_by = 'sasha.wanasky@gmail.com'
    and quality_notes::jsonb->>'course_code' = '${COURSE}'
    and coalesce(quality_notes::jsonb->>'cadence','natural') = 'natural'
    and quality_notes::jsonb->>'role' = 'target2'
  order by created_at
`).map(([uuid, text, recorded_at, created_at, s3_key, seed, superseded]) => ({
  uuid, text, recorded_at, created_at, s3_key,
  seed: seed ? Number(seed) : null,
  superseded: superseded === '1',
}))

const takesByText = new Map()
for (const t of takes) {
  if (!takesByText.has(t.text)) takesByText.set(t.text, [])
  takesByText.get(t.text).push(t)
}

const rows = clips.map((c) => {
  const ts = (takesByText.get(c.text) || []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
  const bound = ts.find((t) => t.s3_key === c.s3_key) || null
  const newest = ts.length ? ts[ts.length - 1] : null
  return {
    ...c,
    seed: bound ? bound.seed : (newest ? newest.seed : null),
    take_count: ts.length,
    bound_is_newest: Boolean(bound && newest && bound.uuid === newest.uuid),
    // No acceptance record exists anywhere for this course — see the header.
    accepted: false,
    recorded_at: bound ? bound.recorded_at : null,
    takes: ts.map((t) => ({ uuid: t.uuid, recorded_at: t.recorded_at, superseded: t.superseded, bound: t.s3_key === c.s3_key })),
  }
})

fs.mkdirSync(DATA_DIR, { recursive: true })
const outPath = path.join(DATA_DIR, `manifest-${COURSE}.json`)
fs.writeFileSync(outPath, JSON.stringify({
  course: COURSE,
  voice_id: 'human_sasha_wanasky_deu_at',
  recordist: 'sasha.wanasky@gmail.com',
  built_at: new Date().toISOString(),
  clips: rows,
}, null, 1))

const multi = rows.filter((r) => r.take_count > 1).length
console.log(`${rows.length} clips → ${outPath}`)
console.log(`  ${multi} have more than one take; ${rows.filter((r) => !r.bound_is_newest).length} are not bound to their newest take; ${rows.filter((r) => r.take_count === 0).length} have no matching take row`)
