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

function collectCandidates(clips, source) {
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

    const pieces = tile(words, byText, key)
    if (!pieces || pieces.length < MIN_PIECES || pieces.length > MAX_PIECES) continue
    if (pieces.some(p => p.duration_ms && p.duration_ms < MIN_PIECE_MS)) continue
    if (pieces.some(p => p.id === whole.id)) continue

    candidates.push({ source, whole, pieces, words: words.length })
  }
  return candidates
}

/**
 * Spread the sample across courses/voices and across join counts, so Kai's
 * verdicts say something about the fast pass in general rather than about one
 * speaker on one day. Deterministic — no RNG, so a rebuild is reproducible.
 */
function pickSpread(byLabel, count) {
  for (const list of byLabel.values()) {
    list.sort((a, b) => (a.pieces.length - b.pieces.length) || a.whole.text.localeCompare(b.whole.text))
  }
  const picked = []
  const cursors = new Map([...byLabel.keys()].map(k => [k, 0]))
  const stride = new Map([...byLabel.entries()].map(([k, v]) => [k, Math.max(1, Math.floor(v.length / (count / byLabel.size + 1)))]))
  while (picked.length < count) {
    let advanced = false
    for (const [label, list] of byLabel) {
      if (picked.length >= count) break
      const at = cursors.get(label)
      if (at >= list.length) continue
      picked.push(list[at])
      cursors.set(label, at + stride.get(label))
      advanced = true
    }
    if (!advanced) break
  }
  return picked
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

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const byLabel = new Map()
  let totalCandidates = 0
  for (const source of SOURCES) {
    const clips = await fetchAllClips(sb, source)
    const candidates = collectCandidates(clips, source)
    totalCandidates += candidates.length
    console.log(`${source.label}: ${clips.length} clips -> ${candidates.length} phrases with every piece separately recorded`)
    if (candidates.length) byLabel.set(source.label, candidates)
  }
  console.log(`\nTotal qualifying phrases across all sources: ${totalCandidates}`)

  const picked = pickSpread(byLabel, count)
  console.log(`Building ${picked.length} pairs into ${outDir}\n`)

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
      for (let k = 0; k < item.pieces.length; k++) {
        const raw = path.join(tempDir, `${pairId}-piece-${k}-raw.mp3`)
        await download(item.pieces[k].s3_key, raw)
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

      pairs.push({
        id: pairId,
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
      qualifyingPhrasesFound: totalCandidates,
      pairs,
    }, null, 2) + '\n'
  )
  fs.rmSync(tempDir, { recursive: true, force: true })

  console.log(`\nWrote ${pairs.length} pairs to ${path.join(outDir, 'pairs.json')}`)
  if (failures.length) console.log(`${failures.length} skipped:`, failures)
}

main().catch(err => { console.error(err); process.exit(1) })
