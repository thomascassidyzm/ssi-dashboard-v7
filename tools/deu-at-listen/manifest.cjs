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
 * WHICH RECORDING FLOW PRODUCED A TAKE IS **NOT STORED**, and this build does
 * NOT guess it. Kai marks the takes himself on the page; his marks are the only
 * answer to that question anywhere, so nothing here is pre-filled and nothing
 * here classifies.
 *
 * What was checked, so the claim is a finding rather than a shrug:
 * `recording_provenance` has no mode and no session column at all (18 columns,
 * neither among them); the JSON context in quality_notes
 * (services/recording-upload-helpers.cjs buildProvenanceContext) carries `mode`,
 * but its only values are 'script'|'pod'|'regeneration' — the upload seam, not
 * the reading order, and every deu_at take is 'script'. The reading order the
 * recordist actually chose — ModeSelector.vue's "the course itself, straight
 * through from the start" (order=course) versus "a shorter set of lines, cut up
 * afterwards" (order=coverage) — is never sent with the take at all.
 * AutocueStudio.vue does send provenance.mode='continuous', but that names the
 * RECORDER (useContinuousRecorder's VAD cutter), both orders use it, and it is
 * dropped on insert for want of a column. There is no S3 prefix distinction
 * either: everything is mastered/ and raw/.
 *
 * WHAT *IS* RECORDED, and is therefore what the marking control is built on:
 * `script_session_id` — the sitting a take was recorded in — travels with every
 * scripted take and is a stored fact, not a deduction. Takes cluster by sitting,
 * and a sitting is one reading order from beginning to end, so a session is the
 * natural unit for "mark this whole lot". This file emits the sessions with
 * their times, take counts and seed ranges; it does not say what either of them
 * IS.
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
    coalesce(rp.quality_notes::jsonb->>'quality_notes',''),
    case when rp.quality_notes::jsonb->>'chunks_string' is not null then '1' else '0' end,
    coalesce(rp.quality_notes::jsonb->>'script_session_id','')
  from recording_provenance rp
  where rp.recorded_by = '${RECORDIST}'
    and rp.quality_notes::jsonb->>'course_code' = '${COURSE}'
  order by rp.created_at
`).map(([uuid, recorded_at, created_at, prompted_text, cadence, role, s3_key, raw_s3_key, seed, superseded, discarded, note, hasChunks, session]) => ({
  uuid, recorded_at, created_at, prompted_text,
  cadence: cadence || null, role: role || null,
  s3_key: s3_key || null, raw_s3_key: raw_s3_key || null,
  seed: seed ? Number(seed) : null,
  superseded: superseded === '1',
  discarded: discarded === '1',
  note: note || null,
  has_chunks: hasChunks === '1',
  session: session || null,
}))

// No flow classification is computed. Which reading order produced a take is not
// stored (see the header), and the only honest source for it is Kai's own mark,
// which lives in marks-<course>.json and is applied by the page — never here.

// ---- takes REFUSED before any provenance row was written ----
// They exist only as S3 objects, so the database cannot see them and neither
// could this page until now. Optional input, built by the S3-side census: a
// JSON array of { uuid, s3_key, last_modified, size_bytes, session_window }.
// No provenance means NO PROMPTED TEXT — we do not know which line was being
// read, and the page says exactly that rather than guessing one.
const refusedPath = arg('--refused', path.join(DATA_DIR, 'refused-takes.json'))
let refused = []
try {
  const raw = JSON.parse(fs.readFileSync(refusedPath, 'utf8'))
  refused = (Array.isArray(raw) ? raw : raw.takes || []).map((r) => ({
    uuid: r.uuid,
    recorded_at: r.last_modified || r.recorded_at || null,
    created_at: r.last_modified || null,
    prompted_text: null,
    cadence: null, role: null,
    s3_key: r.s3_key || null, raw_s3_key: r.raw_s3_key || null,
    seed: null, superseded: false, discarded: false, note: null,
    has_chunks: false,
    // No provenance row means no session id either. What we have instead is the
    // moment the object landed in the bucket, which the census resolved against
    // the recorded session windows — a fact about the upload, never a claim
    // about the take.
    session: null,
    upload_window: r.session_window || null,
    refused: true,
  })).filter((r) => r.uuid && r.s3_key)
} catch { refused = [] }

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

// The refused takes get ONE group of their own rather than being scattered into
// the line groups: with no provenance there is no prompted text, so there is no
// line to file them under, and inventing one would be exactly the fabrication
// this page exists to prevent.
if (refused.length) {
  groups.set('(refused)', {
    key: '(refused)',
    prompted_text: null,
    refused_group: true,
    takes: refused.map((t) => ({
      ...t,
      decode: decodeFor(t.uuid),
      is_live: Boolean(t.s3_key && live.has(t.s3_key)),
      course_audio_id: t.s3_key && live.get(t.s3_key) ? live.get(t.s3_key).id : null,
      slot_text: null,
      text_disagrees: false,
    })),
  })
}

const out = [...groups.values()].map((g) => {
  g.takes.sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at)))
  const natural = g.takes.filter((t) => t.cadence !== 'slow')
  return {
    ...g,
    seed: g.takes.map((t) => t.seed).find((s) => s != null) ?? null,
    take_count: g.takes.length,
    natural_count: natural.length,
    live_count: g.takes.filter((t) => t.is_live).length,
    disagree_count: g.takes.filter((t) => t.text_disagrees).length,
    // The sittings this line's takes came from — a stored fact, and what the
    // page offers as a marking set.
    sessions: [...new Set(g.takes.map((t) => t.session).filter(Boolean))],
    // The pattern #601 proved: more than one natural take of the same line, so
    // a good-read-then-flubbed-retry pair is possible here.
    has_retry: natural.length > 1,
  }
})

// The one known-live defect, pinned to the top whatever filter is on: this line
// plays a take of a DIFFERENT sentence today, and a good earlier read of it
// exists in the bucket with no course_audio row of its own. Restoring it is an
// in-place s3_key swap on the course_audio row named here — no row moves and
// nothing is deleted. Kai rules on it by ear like any other take; it is pinned
// so he does not have to go looking for it.
const PINNED_AUDIO_ID = '65f8618f-b103-407f-ae33-aaa689a74a76'
const PINNED_GOOD_TAKE = '0AA52677-B285-485B-8DCE-F5DC490F36ED'
for (const g of out) {
  if (g.takes.some((t) => t.course_audio_id === PINNED_AUDIO_ID || t.uuid === PINNED_GOOD_TAKE)) {
    g.pinned = true
    g.pinned_note = 'Known live defect. The clip a learner hears on this line today is a take of a different sentence. A good earlier read of the right line is in the bucket but was never bound to the course.'
  }
}

// Riskiest first. The pinned defect, then a group where the tool's line and the
// course slot disagree (a mis-filing), then lines that were retried (where a
// flub can be hiding), then the rest in seed order. The refused takes — which
// have no line and no order of their own — go last. Nothing is dropped.
out.sort((a, b) =>
  (b.pinned === true) - (a.pinned === true) ||
  (a.refused_group === true) - (b.refused_group === true) ||
  (b.disagree_count > 0) - (a.disagree_count > 0) ||
  (b.has_retry) - (a.has_retry) ||
  b.natural_count - a.natural_count ||
  ((a.seed ?? 1e9) - (b.seed ?? 1e9)) ||
  String(a.prompted_text || '').localeCompare(String(b.prompted_text || ''))
)

const allTakes = out.flatMap((g) => g.takes)

// ---- the sittings, straight out of the takes ----
// script_session_id is RECORDED, so this is a fact and not a reading of one. A
// sitting is one reading order from beginning to end, which is why it is the
// unit the page offers for marking a whole set at once. What each sitting IS
// remains Kai's to say.
const sessions = []
{
  const bySession = new Map()
  for (const t of allTakes) {
    if (!t.session) continue
    if (!bySession.has(t.session)) bySession.set(t.session, [])
    bySession.get(t.session).push(t)
  }
  for (const [id, ts] of bySession) {
    const times = ts.map((t) => t.recorded_at).filter(Boolean).sort()
    const seeds = ts.map((t) => t.seed).filter((s) => s != null)
    sessions.push({
      id,
      first: times[0] || null,
      last: times[times.length - 1] || null,
      take_count: ts.length,
      seed_min: seeds.length ? Math.min(...seeds) : null,
      seed_max: seeds.length ? Math.max(...seeds) : null,
      uuids: ts.map((t) => t.uuid),
    })
  }
  sessions.sort((a, b) => String(a.first).localeCompare(String(b.first)))
}
const unsessioned = allTakes.filter((t) => !t.session).length

fs.mkdirSync(DATA_DIR, { recursive: true })
const outPath = path.join(DATA_DIR, `manifest-${COURSE}.json`)
fs.writeFileSync(outPath, JSON.stringify({
  course: COURSE,
  recordist: 'Sascha',
  recordist_account: RECORDIST,
  voice_id: 'human_sasha_wanasky_deu_at',
  built_at: new Date().toISOString(),
  total_takes: allTakes.length,
  total_lines: out.filter((g) => !g.refused_group).length,
  live_takes: allTakes.filter((t) => t.is_live).length,
  refused_takes: refused.length,
  // The page reads this and says it out loud: nothing is pre-filled, because
  // there is nothing to pre-fill it FROM.
  flow: {
    stored: false,
    prefilled: false,
    source: "Kai's own marks",
    checked: 'recording_provenance has no mode and no session column; the mode in the quality_notes context is the upload seam (script|pod|regeneration), and every deu_at take is "script"; the reading order the recordist chose (ModeSelector: straight through from the start vs a shorter set cut up afterwards) is never sent with the take; AutocueStudio sends provenance.mode="continuous", but that names the VAD recorder both orders use and it is dropped on insert; both orders land in mastered/ and raw/.',
  },
  sessions,
  unsessioned_takes: unsessioned,
  groups: out,
}, null, 1))

console.log(`${allTakes.length} takes over ${out.length} groups → ${outPath}`)
console.log(`  NO flow classification computed — which reading order produced a take is not stored, and Kai marks it himself`)
console.log(`  ${sessions.length} recorded sittings offered as marking sets (${unsessioned} takes carry no session id)`)
console.log(`  ${refused.length} refused takes folded in (no provenance row — flow unknown, no prompted text)`)
console.log(`  ${out.filter((g) => g.has_retry).length} lines were recorded more than once (natural takes)`)
console.log(`  ${allTakes.filter((t) => t.is_live).length} takes are what a learner hears today`)
console.log(`  ${out.filter((g) => g.disagree_count > 0).length} lines where the prompted text and the course slot disagree`)
console.log(`  ${allTakes.filter((t) => t.cadence === 'slow').length} slow reads (never filed as clips, shown and labelled)`)
