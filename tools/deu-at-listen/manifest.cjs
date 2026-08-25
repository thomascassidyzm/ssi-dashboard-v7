#!/usr/bin/env node
/**
 * Build the listening manifest for Sascha's Austrian German recordings.
 *
 * Usage: node tools/deu-at-listen/manifest.cjs [--out <dir>] [--decodes <dir>]
 *
 * READ-ONLY on the database. It writes exactly one file, manifest-<course>.json,
 * in the data dir. It never touches course_audio and never renders audio.
 *
 * A ROW IS A TAKE, NOT A CLIP. This is the whole point of the page and it is
 * the opposite of how the course sees the world.
 *
 * The course sees 225 clips: one `course_audio` row per line, holding whichever
 * take the upsert last wrote. Sascha actually recorded 331 takes. The 106 that
 * are not the bound one are invisible from the course side — and job #601 proved
 * that is exactly where the good audio is hiding: Sascha repeatedly read a line
 * correctly and then flubbed the retry seconds later ("Ups!", a laugh, the wrong
 * sentence), and the linker took the later one. A page built from clips can only
 * show you the flub. So this is built from `recording_provenance`.
 *
 * THE TEXT COMES FROM THE RECORDING TOOL. Each take's `quality_notes` context
 * carries the line the autocue PROMPTED Sascha to read. That is authoritative
 * for "what were they trying to say". The course-slot text — `course_audio.text`
 * on the row the take was filed into — is recorded separately as
 * `slot_text`, and where the two disagree the take is marked `text_disagrees`.
 * That disagreement is a mis-filing, and it is invisible from either side alone.
 *
 * CADENCE. Script mode records every line twice: natural, then a deliberately
 * halting slow read that exists to give the aligner its pause boundaries and is
 * never filed as a clip (services/script-take-filing.cjs). Slow takes are
 * INCLUDED here and labelled, because Kai is judging what was said, not what was
 * filed — but they are never presented as candidates to bind.
 *
 * Sascha uses they/them; the voice they record is the male voice, which
 * describes the part and not them.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const REPO = path.join(__dirname, '..', '..')
const COURSE = 'deu_at_for_eng'
const RECORDIST = 'sasha.wanasky@gmail.com'   // the account id; the person is Sascha
const arg = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : dflt }
const DATA_DIR = arg('--out', path.join(REPO, 'scripts', 'deu-at-listen'))
const DECODE_DIR = arg('--decodes', null)

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DATABASE_URL = (fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  .match(/^DATABASE_URL=(.*)$/m) || [])[1].replace(/^["']|["']$/g, '')

function q(sql) {
  const out = execFileSync(PSQL, [DATABASE_URL, '-At', '-F', '\t', '-c', sql], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  })
  return out.split('\n').filter(Boolean).map((l) => l.split('\t'))
}

// ---- every take Sascha recorded for this course ----
const takes = q(`
  select
    rp.audio_uuid,
    rp.recorded_at::text,
    rp.created_at::text,
    coalesce(rp.quality_notes::jsonb->>'text',''),
    coalesce(rp.quality_notes::jsonb->>'cadence',''),
    coalesce(rp.quality_notes::jsonb->>'role',''),
    coalesce(rp.quality_notes::jsonb->>'s3_key',''),
    coalesce(rp.quality_notes::jsonb->>'raw_s3_key',''),
    coalesce(rp.quality_notes::jsonb->>'seed_number',''),
    case when rp.quality_notes::jsonb ? 'superseded_by' then '1' else '0' end,
    case when rp.quality_notes::jsonb ? 'discarded_at' then '1' else '0' end,
    coalesce(rp.quality_notes::jsonb->>'quality_notes','')
  from recording_provenance rp
  where rp.recorded_by = '${RECORDIST}'
    and rp.quality_notes::jsonb->>'course_code' = '${COURSE}'
  order by rp.created_at
`).map(([uuid, recorded_at, created_at, prompted_text, cadence, role, s3_key, raw_s3_key, seed, superseded, discarded, note]) => ({
  uuid, recorded_at, created_at, prompted_text,
  cadence: cadence || null, role: role || null,
  s3_key: s3_key || null, raw_s3_key: raw_s3_key || null,
  seed: seed ? Number(seed) : null,
  superseded: superseded === '1',
  discarded: discarded === '1',
  note: note || null,
}))

// ---- what the course currently serves, keyed by s3_key ----
const live = new Map()
for (const [id, text, s3_key, role, origin] of q(`
  select id, text, s3_key, role, origin from course_audio where course_code = '${COURSE}'
`)) live.set(s3_key, { id, slot_text: text, role, origin })

// ---- optional whisper decodes, one <uuid>.txt per take ----
function decodeFor(uuid) {
  if (!DECODE_DIR) return null
  const p = path.join(DECODE_DIR, uuid + '.txt')
  try { return fs.readFileSync(p, 'utf8').trim() || null } catch { return null }
}

// ---- group takes by the line the tool asked for ----
// Grouping key is the prompted text, lightly folded, because that is the
// question Kai is answering: "of the times they were asked to say THIS, which
// one is good?" Cadence is deliberately NOT part of the key — the slow read of
// a line belongs beside its natural read, not in a group of its own.
const foldKey = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()

const groups = new Map()
for (const t of takes) {
  const bound = t.s3_key ? live.get(t.s3_key) || null : null
  const row = {
    ...t,
    decode: decodeFor(t.uuid),
    // Is this exact take what a learner hears today?
    is_live: Boolean(bound),
    course_audio_id: bound ? bound.id : null,
    slot_text: bound ? bound.slot_text : null,
    // The defect this page exists to expose: the tool asked for one line and
    // the take is filed under another.
    text_disagrees: Boolean(bound && foldKey(bound.slot_text) !== foldKey(t.prompted_text)),
  }
  const k = foldKey(t.prompted_text) || `(no prompted text) ${t.uuid}`
  if (!groups.has(k)) groups.set(k, { key: k, prompted_text: t.prompted_text, takes: [] })
  groups.get(k).takes.push(row)
}

const out = [...groups.values()].map((g) => {
  g.takes.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
  const natural = g.takes.filter((t) => t.cadence !== 'slow')
  return {
    ...g,
    seed: g.takes.map((t) => t.seed).find((s) => s != null) ?? null,
    take_count: g.takes.length,
    natural_count: natural.length,
    live_count: g.takes.filter((t) => t.is_live).length,
    disagree_count: g.takes.filter((t) => t.text_disagrees).length,
    // The pattern #601 proved: more than one natural take of the same line, so
    // a good-read-then-flubbed-retry pair is possible here.
    has_retry: natural.length > 1,
  }
})

// Riskiest first. A group where the tool's line and the course slot disagree is
// a mis-filing and comes first; then lines that were retried (where a flub can
// be hiding); then the rest in seed order. Nothing is dropped.
out.sort((a, b) =>
  (b.disagree_count > 0) - (a.disagree_count > 0) ||
  (b.has_retry) - (a.has_retry) ||
  b.natural_count - a.natural_count ||
  ((a.seed ?? 1e9) - (b.seed ?? 1e9)) ||
  a.prompted_text.localeCompare(b.prompted_text)
)

fs.mkdirSync(DATA_DIR, { recursive: true })
const outPath = path.join(DATA_DIR, `manifest-${COURSE}.json`)
fs.writeFileSync(outPath, JSON.stringify({
  course: COURSE,
  recordist: 'Sascha',
  recordist_account: RECORDIST,
  voice_id: 'human_sasha_wanasky_deu_at',
  built_at: new Date().toISOString(),
  total_takes: takes.length,
  total_lines: out.length,
  live_takes: takes.filter((t) => t.s3_key && live.has(t.s3_key)).length,
  groups: out,
}, null, 1))

console.log(`${takes.length} takes over ${out.length} prompted lines → ${outPath}`)
console.log(`  ${out.filter((g) => g.has_retry).length} lines were recorded more than once (natural takes)`)
console.log(`  ${takes.filter((t) => t.s3_key && live.has(t.s3_key)).length} takes are what a learner hears today`)
console.log(`  ${out.filter((g) => g.disagree_count > 0).length} lines where the prompted text and the course slot disagree`)
console.log(`  ${takes.filter((t) => t.cadence === 'slow').length} slow reads (never filed as clips, shown and labelled)`)
