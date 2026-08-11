#!/usr/bin/env node
/**
 * build-pairs.cjs — assemble the blind concat-vs-whole listening test set.
 *
 * THE QUESTION THIS SERVES. Kai does not yet trust that a phrase built by
 * gluing separately-recorded pieces together (the "fast pass") sounds as good
 * as the same phrase read in one continuous take (the "slow pass"). Before
 * committing to a record-every-phrase-in-full mode, Kai wants to judge by ear.
 *
 * NO AUDIO IS GENERATED. Every byte here comes from clips that already exist in
 * `course_audio` — no TTS call, no recording session, no S3 write. The Welsh
 * legacy imports give us both halves of the comparison for free:
 *
 *   - the WHOLE side  = the existing single-take recording of the full phrase;
 *   - the CONCAT side = the existing separate recordings of that phrase's own
 *     pieces, glued with the SAME chain the live splicer uses
 *     (services/voice-engine/splicer.cjs: per-piece normalise to −16 LUFS,
 *     concat demuxer, ffmpeg→lame encode).
 *
 * A phrase qualifies only when every piece of a full tiling of its text exists
 * as its own separately-recorded clip in the same course, role and voice. That
 * is ~3,600 phrases across cym_s_for_eng and cym_n_for_eng; we ship a sample.
 *
 * FAIRNESS IS THE WHOLE POINT. A blind test is worthless if one side is
 * identifiable by anything other than the joins, so the whole-phrase side is
 * put through the IDENTICAL normalise + lame encode as the concat side. Both
 * sides therefore share loudness, sample rate and encoder; the only difference
 * left for Kai's ear is the gluing.
 *
 * Usage:
 *   node tools/concat-listening-test/build-pairs.cjs [--count 20] [--out <dir>]
 *
 * Writes <out>/audio/*.mp3 and <out>/pairs.json (default out:
 * public/concat-listening-test).
 */

const fs = require('fs')
const os = require('os')
const { execFileSync } = require('child_process')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const { createClient } = require('@supabase/supabase-js')
const audioProcessor = require('../../services/audio-processor.cjs')
const { spliceSegmentsToFile, NORMALIZE_LUFS } = require('../../services/voice-engine/splicer.cjs')
const { DEFAULTS, detectSilenceSpans, invertSilenceSpans, getAudioDurationMs } = require('../../services/voice-engine/align.cjs')

// The clips are public objects in the audio bucket, so the page can be fully
// static — no API, no signed URLs, no CORS, nothing for a phone to trip over.
const S3_BASE = `https://${process.env.S3_BUCKET || 'ssi-audio-stage'}.s3.amazonaws.com/`

// Courses whose human recordings cover BOTH whole phrases and their pieces.
// (legacy_import is the old SSi Welsh estate: every clip is a real human take.)
const SOURCES = [
  { courseCode: 'cym_s_for_eng', voiceId: 'legacy_import', role: 'target1', label: 'South Welsh, voice 1' },
  { courseCode: 'cym_s_for_eng', voiceId: 'legacy_import', role: 'target2', label: 'South Welsh, voice 2' },
  { courseCode: 'cym_n_for_eng', voiceId: 'legacy_import', role: 'target1', label: 'North Welsh, voice 1' },
  { courseCode: 'cym_n_for_eng', voiceId: 'legacy_import', role: 'target2', label: 'North Welsh, voice 2' },
]

// COURSE POSITION IS THE QUESTION (Kai, 2026-08-11). Not "does glue sound ok"
// in general, but "how far into a course does the join stop mattering" — seed 1
// is a total beginner with nothing to compare against, and by seed 40 the
// learner has an ear for the language.
//
// So the sample is drawn per BAND, and each band is deliberately sampled at both
// ends of its range rather than clumped, so the verdicts can resolve WHERE the
// answer changes rather than just whether it does. The seed number rides along
// in pairs.json so the read can be finer than three buckets after the fact.
const BANDS = [
  { key: 'early', label: 'Early in the course', min: 1, max: 30, blurb: 'a near-total beginner — nothing to compare the sound against yet' },
  { key: 'middle', label: 'Middle of the course', min: 90, max: 200, blurb: 'well in — the ear has started to settle' },
  { key: 'late', label: 'Later in the course', min: 260, max: 9999, blurb: 'a long way in — a real ear for the language by now' },
]

// Selection gates. These keep the test honest rather than flattering: a pair is
// only interesting if the concat side has real joins in it (>= 2 pieces) and
// the phrase is long enough that prosody across the joins matters.
const MIN_WORDS = 3
const MAX_WORDS = 9
const MIN_PIECES = 2
const MAX_PIECES = 5
const MIN_PIECE_MS = 200
const MAX_WHOLE_MS = 7000
const MIN_WHOLE_MS = 1200

function normText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:¿¡"'’‘“”…—–()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchAllClips(sb, { courseCode, voiceId, role }) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('course_audio')
      .select('id,text,s3_key,duration_ms')
      .eq('course_code', courseCode)
      .eq('voice_id', voiceId)
      .eq('role', role)
      .range(from, from + 999)
    if (error) throw new Error(`course_audio read failed: ${error.message}`)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

/**
 * Where does a phrase sit in the course?
 *
 * The legacy Welsh clips carry no seed number of their own, so position is
 * recovered by matching the clip's text back to the course's own practice
 * phrases and seeds. Earliest appearance wins — a phrase reused later is
 * introduced at its first seed, which is the position that decides how much
 * language the learner had when they first met it.
 *
 * ~80% of clips match; the rest are legacy recordings for text the current
 * course no longer carries, and are simply not eligible for this test.
 */
async function buildPositionIndex(sb, courseCode) {
  const pos = new Map()
  for (const [table, sel] of [['course_practice_phrases', 'seed_number,target_text'], ['course_seeds', 'seed_number,target_text']]) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(table).select(sel).eq('course_code', courseCode).range(from, from + 999)
      if (error) throw new Error(`${table} read failed: ${error.message}`)
      for (const row of data) {
        const key = normText(row.target_text)
        if (key && (!pos.has(key) || row.seed_number < pos.get(key))) pos.set(key, row.seed_number)
      }
      if (data.length < 1000) break
    }
  }
  return pos
}

function bandFor(seed) {
  return BANDS.find(b => seed >= b.min && seed <= b.max) || null
}

/**
 * Greedy max-munch tiling of a phrase from OTHER clips of the same voice.
 * Max-munch (longest piece first) mirrors the live splice planner, so the
 * concat side is as good as the real pipeline would make it — we are testing
 * the fast pass at its best, not a straw man.
 */
function tile(words, byText, wholeKey) {
  const pieces = []
  let i = 0
  while (i < words.length) {
    let hit = null
    for (let j = Math.min(words.length, i + 4); j > i; j--) {
      const candidate = words.slice(i, j).join(' ')
      if (candidate === wholeKey) continue // a phrase may not be "spliced" from itself
      if (byText.has(candidate)) { hit = { candidate, end: j }; break }
    }
    if (!hit) return null
    pieces.push(byText.get(hit.candidate))
    i = hit.end
  }
  return pieces
}

function collectCandidates(clips, source, positions) {
  const byText = new Map()
  for (const clip of clips) {
    const key = normText(clip.text)
    if (key && !byText.has(key)) byText.set(key, clip)
  }

  const candidates = []
  for (const whole of clips) {
    const key = normText(whole.text)
    const words = key.split(' ')
    if (words.length < MIN_WORDS || words.length > MAX_WORDS) continue
    if (whole.duration_ms && (whole.duration_ms < MIN_WHOLE_MS || whole.duration_ms > MAX_WHOLE_MS)) continue

    // No recoverable course position means the pair cannot answer Kai's
    // question, so it is not a candidate at all.
    const seed = positions.get(key)
    if (!seed) continue
    const band = bandFor(seed)
    if (!band) continue

    const pieces = tile(words, byText, key)
    if (!pieces || pieces.length < MIN_PIECES || pieces.length > MAX_PIECES) continue
    if (pieces.some(p => p.duration_ms && p.duration_ms < MIN_PIECE_MS)) continue
    if (pieces.some(p => p.id === whole.id)) continue

    candidates.push({ source, whole, pieces, words: words.length, seed, band })
  }
  return candidates
}

/**
 * Pick `perBand` pairs for one band, spread across the courses/voices that have
 * material there AND across the band's seed range — taking evenly-spaced seeds
 * rather than the first N, so "early" isn't secretly all seed 3. Deterministic.
 */
function pickBand(candidates, perBand) {
  // The same phrase usually exists in all four course/voice combinations, and
  // hearing it four times teaches Kai nothing while costing four judgements —
  // so dedupe on the text and let each slot buy a distinct phrase.
  const seen = new Set()
  const pool = []
  for (const c of candidates.slice().sort((a, b) => (a.seed - b.seed) || a.source.label.localeCompare(b.source.label))) {
    const key = normText(c.whole.text)
    if (seen.has(key)) continue
    seen.add(key)
    pool.push(c)
  }

  // Evenly-spaced across the band's seed range, so "early" is not secretly all
  // seed 1 — the point is to see WHERE within the band the answer moves.
  const picked = []
  for (let n = 0; n < perBand && n < pool.length; n++) {
    picked.push(pool[Math.floor((n * (pool.length - 1)) / Math.max(1, perBand - 1))])
  }
  // Rotate the voice mix so a band isn't one speaker's verdict.
  return [...new Set(picked)].sort((a, b) => a.seed - b.seed)
}

async function download(s3Key, destPath) {
  const res = await fetch(S3_BASE + s3Key)
  if (!res.ok) throw new Error(`GET ${s3Key} -> ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500) throw new Error(`${s3Key} is only ${buf.length} bytes`)
  fs.writeFileSync(destPath, buf)
  return buf.length
}

/**
 * Trim a clip to its voiced span, padded — the same thing the live aligner does
 * when it cuts pieces out of a slow-gapped take (align.cjs cutSegments, same
 * −35 dB threshold and 20 ms padding).
 *
 * This is not cosmetic. These library clips were each recorded as their own
 * course phrase, so they carry their own lead-in and tail silence. Gluing them
 * untrimmed inserts a second of dead air at every join, which would make the
 * concat side sound far worse than the real fast pass ever does — a straw man
 * that would push Kai to the wrong conclusion. Both sides get trimmed, so
 * neither is identifiable by a silent head or tail either.
 */
async function trimToVoiced(inputPath, outputPath) {
  const durationMs = await getAudioDurationMs(inputPath)
  const silences = await detectSilenceSpans(inputPath, {
    silenceDb: DEFAULTS.SILENCE_DB,
    silenceMinMs: DEFAULTS.SILENCE_MIN_MS,
  })
  const voiced = invertSilenceSpans(durationMs, silences)
  if (!voiced.length) { fs.copyFileSync(inputPath, outputPath); return }

  const pad = DEFAULTS.SEGMENT_PADDING_MS
  const startSec = Math.max(0, voiced[0].startMs - pad) / 1000
  const endSec = Math.min(durationMs, voiced[voiced.length - 1].endMs + pad) / 1000
  await audioProcessor.ffmpegFilterToLameMp3(inputPath, outputPath, {
    filterChain: `atrim=start=${startSec}:end=${endSec},asetpts=PTS-STARTPTS`,
  })
}

// ---------------------------------------------------------------------------
// Is a "carved" pair really carved?
//
// Scout #169 inferred that Aran's clause pieces were cut out of his whole takes
// from timestamps, missing provenance rows and clause containment — not from the
// audio. That inference decides what the page TELLS Kai ("cut out of this very
// take, so only the joins can differ"), so it gets measured rather than trusted.
// Measured: 8 of the 11 hold; 3 are the same words from a DIFFERENT take, and
// are labelled accordingly.
//
// Method: locate each piece inside the whole take by phase-insensitive energy
// envelope, then confirm with a sample-exact correlation in a tight window
// around the hit. (A raw-sample scan alone is useless here — at 8 kHz a 2.5 ms
// misalignment decorrelates speech completely and every piece reads as
// unrelated, which is exactly the false negative the first attempt produced.)
const CARVED_CORR_MIN = 0.75

function decodePcm8k(mp3Path, tempDir) {
  const rawPath = path.join(tempDir, `${path.basename(mp3Path)}.raw`)
  execFileSync('ffmpeg', ['-v', 'error', '-i', mp3Path, '-ac', '1', '-ar', '8000', '-f', 's16le', rawPath])
  const buf = fs.readFileSync(rawPath)
  const out = new Float32Array(buf.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(i * 2) / 32768
  return out
}

function rmsEnvelope(x, frame = 80) {
  const e = new Float32Array(Math.floor(x.length / frame))
  for (let f = 0; f < e.length; f++) {
    let s = 0
    for (let i = 0; i < frame; i++) { const v = x[f * frame + i]; s += v * v }
    e[f] = Math.sqrt(s / frame)
  }
  return e
}

function corrAt(hay, needle, off, n) {
  let dot = 0, eh = 0, en = 0
  for (let i = 0; i < n; i++) { const h = hay[off + i], x = needle[i]; dot += h * x; eh += h * h; en += x * x }
  return dot / (Math.sqrt(eh * en) || 1e-9)
}

function excerptCorrelation(whole, piece) {
  const eh = rmsEnvelope(whole), en = rmsEnvelope(piece)
  const m = Math.min(en.length, 200)
  let bestFrame = 0, bestEnv = -1
  for (let f = 0; f + m < eh.length; f++) {
    const c = corrAt(eh, en, f, m)
    if (c > bestEnv) { bestEnv = c; bestFrame = f }
  }
  const n = Math.min(piece.length, 8000 * 2)
  let best = -1
  for (let off = Math.max(0, bestFrame * 80 - 160); off <= bestFrame * 80 + 160 && off + n < whole.length; off++) {
    const c = corrAt(whole, piece, off, n)
    if (c > best) best = c
  }
  return best
}

/**
 * Master the whole-phrase take through the SAME trim + normalise + lame encode
 * the spliced side gets. Without this the blind test leaks: a louder or
 * differently-encoded side is identifiable without listening to a single join.
 */
async function masterWhole(inputPath, outputPath, tempDir) {
  const trimmed = path.join(tempDir, `whole-trim-${path.basename(outputPath)}`)
  await trimToVoiced(inputPath, trimmed)
  const normPath = path.join(tempDir, `whole-norm-${path.basename(outputPath)}`)
  try {
    await audioProcessor.normalizeAudio(trimmed, normPath, NORMALIZE_LUFS)
  } catch {
    fs.copyFileSync(trimmed, normPath) // short clips can fall below loudnorm's floor
  }
  await audioProcessor.ffmpegFilterToLameMp3(normPath, outputPath, {})
  const meta = await audioProcessor.getAudioMetadata(outputPath)
  return Math.round((meta.duration || 0) * 1000)
}

async function main() {
  const args = process.argv.slice(2)
  const count = Number(args[args.indexOf('--count') + 1]) || 20
  const outDir = args.includes('--out')
    ? path.resolve(args[args.indexOf('--out') + 1])
    : path.join(__dirname, '..', '..', 'public', 'concat-listening-test')

  // The purest pairs on the estate, found by the 2026-08-11 audio scout: whole
  // pod utterances Aran recorded on 2026-06-15, which a pass on 2026-06-16 cut
  // into clause pieces and registered as their own clips. Same larynx, same
  // session, same microphone, same take — so re-gluing them isolates the join
  // artefact and NOTHING else. No pace difference to argue about.
  const carvedFile = args.includes('--carved')
    ? path.resolve(args[args.indexOf('--carved') + 1])
    : path.join(__dirname, '..', '..', 'docs', 'concat-vs-whole-2026-08-11', 'B-human-aran-pieces-and-whole.json')

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const carved = []
  if (fs.existsSync(carvedFile)) {
    for (const row of JSON.parse(fs.readFileSync(carvedFile, 'utf8'))) {
      carved.push({
        kind: 'carved',
        source: { courseCode: row.course_code, role: row.role, label: `${row.voice_id} (human)` },
        whole: { id: row.whole_audio_id, text: row.text, s3_key: row.whole_s3_key, duration_ms: row.whole_duration_ms },
        pieces: row.pieces.map(p => ({ id: p.audio_id, text: p.text, s3_key: p.s3_key, duration_ms: p.duration_ms })),
      })
    }
    console.log(`Carved-from-the-same-take pairs (human, Aran): ${carved.length}`)
  } else {
    console.log(`No carved-pair file at ${carvedFile} — building library pairs only`)
  }

  const allCandidates = []
  const positionCache = new Map()
  for (const source of SOURCES) {
    if (!positionCache.has(source.courseCode)) {
      positionCache.set(source.courseCode, await buildPositionIndex(sb, source.courseCode))
    }
    const clips = await fetchAllClips(sb, source)
    const candidates = collectCandidates(clips, source, positionCache.get(source.courseCode))
    allCandidates.push(...candidates)
    const perBand = BANDS.map(b => `${b.key} ${candidates.filter(c => c.band.key === b.key).length}`).join(', ')
    console.log(`${source.label}: ${clips.length} clips -> ${candidates.length} usable pairs with a course position (${perBand})`)
  }
  console.log(`\nTotal qualifying phrases, placed in the course: ${allCandidates.length}`)

  // Kai's question is where the join stops mattering, so the sample is balanced
  // ACROSS bands, not across the estate. Bands run early -> late, and the
  // positionless carved pairs go last as an optional extra: a listener who stops
  // after the course bands has fully answered the question that was asked.
  const perBand = Math.max(1, Math.round(count / BANDS.length))
  const banded = []
  for (const band of BANDS) {
    const inBand = allCandidates.filter(c => c.band.key === band.key)
    const chosen = pickBand(inBand, perBand)
    console.log(`  ${band.key} (seeds ${band.min}-${band.max === 9999 ? 'end' : band.max}): ${inBand.length} available -> ${chosen.length} chosen, seeds ${chosen.map(c => c.seed).join(',')}`)
    if (chosen.length < perBand) {
      console.log(`  !! only ${chosen.length} of ${perBand} available for ${band.key} — the spread is thinner than asked for`)
    }
    banded.push(...chosen)
  }

  const picked = banded.concat(carved)
  console.log(`\nBuilding ${picked.length} pairs (${banded.length} placed in the course + ${carved.length} carved extras) into ${outDir}\n`)

  const audioDir = path.join(outDir, 'audio')
  fs.mkdirSync(audioDir, { recursive: true })
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concat-test-'))

  const pairs = []
  const failures = []
  for (let i = 0; i < picked.length; i++) {
    const item = picked[i]
    const pairId = `p${String(i + 1).padStart(2, '0')}`
    // Opaque, non-revealing file names: nothing in the network tab tells Kai
    // which side is which before the pick.
    const fileA = `${pairId}-a.mp3`
    const fileB = `${pairId}-b.mp3`
    try {
      const piecePaths = []
      const rawPiecePaths = []
      for (let k = 0; k < item.pieces.length; k++) {
        const raw = path.join(tempDir, `${pairId}-piece-${k}-raw.mp3`)
        await download(item.pieces[k].s3_key, raw)
        rawPiecePaths.push(raw)
        const trimmed = path.join(tempDir, `${pairId}-piece-${k}.mp3`)
        await trimToVoiced(raw, trimmed)
        piecePaths.push(trimmed)
      }
      const wholeRaw = path.join(tempDir, `${pairId}-whole-raw.mp3`)
      await download(item.whole.s3_key, wholeRaw)

      const concatOut = path.join(audioDir, fileA)
      const { durationMs: concatMs } = await spliceSegmentsToFile(piecePaths, concatOut, { audioProcessor })
      const wholeOut = path.join(audioDir, fileB)
      const wholeMs = await masterWhole(wholeRaw, wholeOut, tempDir)

      // A pair only gets to claim "cut from this very take" if the audio proves
      // it. The claim changes what the listener is told they are judging, so it
      // is measured against the raw (pre-trim) clips, not assumed from metadata.
      let kind = item.kind || 'library'
      let corr = null
      if (kind === 'carved') {
        const wholePcm = decodePcm8k(wholeRaw, tempDir)
        const scores = rawPiecePaths.map(p => excerptCorrelation(wholePcm, decodePcm8k(p, tempDir)))
        corr = Number(Math.min(...scores).toFixed(2))
        if (corr < CARVED_CORR_MIN) kind = 'pod-retake'
        console.log(`    ${pairId} excerpt correlation ${corr} -> ${kind}`)
      }

      pairs.push({
        id: pairId,
        // 'carved'      = pieces PROVEN to be excerpts of this take (joins only).
        // 'pod-retake'  = same words, but a different take — joins plus delivery.
        // 'library'     = pieces from separate recordings (joins plus pace drift).
        kind,
        excerptCorrelation: corr,
        // Where in the course the learner first meets this phrase. Shown to the
        // listener BEFORE they pick — position is context for the judgement, not
        // a clue about which side is glued. null for the carved pod extras.
        band: item.band ? item.band.key : null,
        bandLabel: item.band ? item.band.label : 'Pod recording, outside the course',
        bandBlurb: item.band ? item.band.blurb
          : kind === 'carved' ? 'no course position — the pieces came out of this very take, so the joins are the only difference'
          : 'no course position — same words, but the pieces are a different take',
        seedNumber: item.seed || null,
        courseCode: item.source.courseCode,
        role: item.source.role,
        voiceLabel: item.source.label,
        text: item.whole.text,
        pieceTexts: item.pieces.map(p => p.text),
        concat: { file: `audio/${fileA}`, durationMs: concatMs, sourceAudioIds: item.pieces.map(p => p.id) },
        whole: { file: `audio/${fileB}`, durationMs: wholeMs, sourceAudioId: item.whole.id },
        // Loudness and encoding are matched between the two sides, so LENGTH is
        // the one thing left that can leak which is which. Recorded rather than
        // filtered out: a glued version that drags is a real fast-pass artefact
        // and Kai should hear it — but the verdicts deserve to be read against it.
        paceRatio: wholeMs ? Number((concatMs / wholeMs).toFixed(2)) : null,
      })
      console.log(`  ${pairId} ok  "${item.whole.text}"  ${item.pieces.length} pieces  concat ${concatMs}ms / whole ${wholeMs}ms`)
    } catch (err) {
      failures.push({ text: item.whole.text, reason: err.message })
      console.log(`  ${pairId} SKIPPED "${item.whole.text}" — ${err.message}`)
    }
  }

  fs.writeFileSync(
    path.join(outDir, 'pairs.json'),
    JSON.stringify({
      generatedFrom: 'existing course_audio clips only — no TTS, no new recording, no S3 write',
      qualifyingPhrasesFound: allCandidates.length,
      availableByBand: Object.fromEntries(BANDS.map(b => [b.key, allCandidates.filter(c => c.band.key === b.key).length])),
      bands: BANDS.map(({ key, label, min, max, blurb }) => ({ key, label, min, max, blurb })),
      pairs,
    }, null, 2) + '\n'
  )
  fs.rmSync(tempDir, { recursive: true, force: true })

  console.log(`\nWrote ${pairs.length} pairs to ${path.join(outDir, 'pairs.json')}`)
  if (failures.length) console.log(`${failures.length} skipped:`, failures)
}

main().catch(err => { console.error(err); process.exit(1) })
