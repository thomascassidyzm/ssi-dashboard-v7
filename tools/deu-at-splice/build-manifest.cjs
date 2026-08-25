#!/usr/bin/env node
/**
 * Assemble the splice-source manifest from what job #640 staged: the take rows,
 * the S3 fetch results (with each object's OWN coursecode metadata) and the
 * whisper word-timing JSON.
 *
 * Two things this carries that matter more than the transcript:
 *   - `chunks_string` — on a SLOW take this is Sascha's own pause map, e.g.
 *     "i wü|iatz|wos|auf Deitsch|sogn". Where it is present the cut can land in a
 *     pause Sascha actually made, which beats any estimate from a transcript.
 *   - `discarded` — three staged takes are flagged discarded, all of them Kai's
 *     own recorder-test takes of 2026-08-07 ("not course content", Kai
 *     2026-08-08). They are excluded as sources and counted, never silently
 *     dropped.
 *
 * Usage: node tools/deu-at-splice/build-manifest.cjs [--dir <work dir>]
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const WORK = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : path.join(__dirname, '..', '..', 'scripts', 'deu-at-splice')

const COURSE = 'deu_at_for_eng'

function durationMs(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', file]).toString().trim()
    return Math.round(Number(out) * 1000)
  } catch { return null }
}

/** whisper-cli -ml 1 -sow: one segment per word, offsets in ms. */
function words(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'))
  return (j.transcription || [])
    .map((s) => ({ word: String(s.text || '').trim(), start_ms: s.offsets?.from ?? null, end_ms: s.offsets?.to ?? null }))
    .filter((w) => w.word && !/^\[/.test(w.word) && w.start_ms != null)
}

function main() {
  const fetched = JSON.parse(fs.readFileSync(path.join(WORK, 'fetch-results.json'), 'utf8'))
  const raw = JSON.parse(fs.readFileSync(path.join(WORK, 'raw-takes.json'), 'utf8'))
  const qn = new Map(raw.map((r) => [r.audio_uuid, r.qn || {}]))

  const takes = []
  const rejected = []
  const excluded_other_courses = []

  for (const f of fetched) {
    if (f.status !== 'staged') { rejected.push({ uuid: f.uuid, why: f.reason || f.status }); continue }
    if (f.s3_coursecode && f.s3_coursecode !== COURSE) {
      excluded_other_courses.push({ uuid: f.uuid, coursecode: f.s3_coursecode })
      continue
    }
    const q = qn.get(f.uuid) || {}
    if (q.discarded_at || q.method === 'discarded') {
      rejected.push({ uuid: f.uuid, why: `discarded: ${q.discarded_reason || 'flagged discarded'}` })
      continue
    }
    const wf = path.join(WORK, 'words', `${f.uuid}.json`)
    if (!fs.existsSync(wf)) { rejected.push({ uuid: f.uuid, why: 'no whisper timings — decode did not finish for this take' }); continue }
    const ws = words(wf)
    if (!ws.length) { rejected.push({ uuid: f.uuid, why: 'whisper produced no words' }); continue }
    takes.push({
      uuid: f.uuid,
      prompted_text: f.prompted_text,
      cadence: f.cadence,
      seed_number: f.seed_number,
      recorded_at: f.recorded_at,
      session_id: f.session_id,
      s3_key: f.s3_key,
      s3_coursecode: f.s3_coursecode || null,
      source_prefix: f.source_prefix,
      mp3_path: f.mp3_path,
      duration_ms: durationMs(f.mp3_path),
      chunks_string: q.chunks_string || null,
      whisper_words: ws,
    })
  }

  const out = {
    course: COURSE,
    recordist: 'Sascha (they/them)',
    built_at: new Date().toISOString(),
    counts: {
      staged: fetched.filter((f) => f.status === 'staged').length,
      usable_sources: takes.length,
      slow_reads_with_a_pause_map: takes.filter((t) => t.cadence === 'slow' && t.chunks_string).length,
      rejected: rejected.length,
    },
    rejected, excluded_other_courses, takes,
  }
  fs.writeFileSync(path.join(WORK, 'manifest-sources.json'), JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out.counts, null, 2))
  if (rejected.length) {
    const why = {}
    for (const r of rejected) { const k = r.why.replace(/\(.*/, '').slice(0, 60); why[k] = (why[k] || 0) + 1 }
    console.log('rejected:', why)
  }
}

if (require.main === module) main()
