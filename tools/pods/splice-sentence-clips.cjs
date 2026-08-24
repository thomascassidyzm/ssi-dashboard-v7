#!/usr/bin/env node
/**
 * splice-sentence-clips.cjs — build the per-SENTENCE clips a multi-sentence pod
 * turn needs by CUTTING THE TURN'S OWN WHOLE-TURN CLIP at its sentence gaps.
 * ffmpeg only. No TTS. No money.
 *
 * WHY THIS EXISTS (Tom, 2026-08-24 12:24Z). The Pod 1 split-array repair
 * (1053db318) NULLed `sentence_audio_ids` on every live Pod 1, because the
 * arrays it found had been inherited positionally from a RETIRED pod and were
 * pointing at another pod's clips. Correct to NULL them; but it left ~1,500
 * multi-sentence turns playing to the learner as one undifferentiated block
 * (podSentenceSplit.ts returns a single whole-turn unit below 2 clips).
 *
 * The obvious repair was to RENDER each sentence as its own TTS take
 * (tools/render-sentence-takes.cjs, which is what Italian got). Tom stopped
 * that run and asked the sharper question: why render a second performance of
 * audio we already have? Job #343 answered it with measurement, not opinion
 * (docs/pods/splice-vs-render-2026-08-24.md): the sentence gaps in these takes
 * are 1.7x-6.3x longer than the longest comma pause, no cut lands inside a
 * word, and where Italian has both a spliced and a rendered piece for the same
 * sentence the two agree on length to within 0.1s on 12 of 13. Splicing is
 * free, takes minutes not hours, and hands the learner the SAME performance
 * they already hear instead of a second, subtly different one.
 *
 * It also is not luck that the gaps are there. generatePodAudio deliberately
 * synthesises a multi-sentence turn with a " … " pause cue between sentences
 * (phase8-audio-v13.cjs, Tom 2026-06-30) precisely so the take stays cleanly
 * splittable. This tool is collecting on that.
 *
 * THE ONE RULE: CUT ONLY IN SILENCE, REFUSE RATHER THAN GUESS. A refused turn
 * keeps its whole-turn clip and stays exactly as it is today — no worse. A
 * guessed cut ships a clip that begins mid-word, which is worse than no split
 * at all ("a BAD split is WORSE than NO split"). Every gate below therefore
 * fails CLOSED, and every refusal is written to the log with its reason and
 * its numbers so the render fallback can be aimed at exactly those turns.
 *
 * THE GATES, and the evidence each one comes from:
 *   1. gap count      — fewer than N-1 interior silences means the cut cannot
 *                       be made at all. 2/138 in the fleet census: TTS takes
 *                       that run two sentences together with no pause.
 *   2. margin >= 1.5  — margin is (shortest gap cut at) / (longest gap NOT cut
 *                       at). Above ~1.5 the sentence boundaries are a distinct
 *                       population from the comma pauses; at 1.0 it is a coin
 *                       toss. The census (docs/pods/splice-margin-census-
 *                       2026-08-24.md) found 9 of 52 measurable margins below
 *                       1.5, clustered in hin/kor/zho/ara_eg — course-specific
 *                       prosody, not script. Those are exactly the turns we
 *                       must not guess on. A turn with no rejected gap at all
 *                       has no margin and passes: there was nothing to choose
 *                       between.
 *   3. seam silence   — the last 30ms of every piece and the first 30ms of
 *                       every piece after a cut must measure quieter than
 *                       -45 dB. #343 measured -62 dB worst across 32 pieces,
 *                       so -45 dB is a wide gate that still catches a cut
 *                       landing in speech. Only INTERNAL seams are gated: the
 *                       very start and very end of the turn are the original
 *                       clip's own edges and are not this tool's doing.
 *   4. piece duration — no piece under 0.35s. The census found none; one here
 *                       means the gap chosen was not a sentence boundary.
 *
 * The splicer itself is scripts/splice-fork/splice.py, called UNMODIFIED as a
 * subprocess — same thresholds job #343 measured (-35 dB / 100 ms detection,
 * N-1 longest interior gaps, cut at each gap's midpoint, 50 ms of pause kept
 * either side, 15 ms fade). Reimplementing it here would let it drift away
 * from the evidence that justified it.
 *
 * FREE BEFORE CUT. Every sentence is looked up first through phase8's own
 * findExistingAudio, on the same text+language+role+voice dedup key
 * generatePodAudio uses. If the clip already exists it is reused and no splice
 * is made — which also means this tool can never overwrite a properly rendered
 * sentence clip with a spliced one.
 *
 * TARGET SIDE ONLY. `sentence_known_audio_ids` is out of scope for this pass
 * and is not touched; 1,796 of the 2,144 multi-sentence turns have no known
 * split today and the app degrades gracefully (it pairs the regex-split known
 * TEXT by index and simply has no per-sentence known audio). Splicing the
 * known side is the same free method and is a follow-on pass, not a silent
 * extension of this one.
 *
 *   node tools/pods/splice-sentence-clips.cjs <course> [--pod=pod-1]
 *        [--apply] [--conc=4] [--limit=N] [--margin=1.5]
 *
 * Read-only without --apply — and a dry run still downloads, splices and runs
 * every gate, so the refusal list it prints is the real one, not an estimate.
 * Writes docs/pods/<course>-sentence-splice-<date>-{dryrun,applied}-log.json.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { randomUUID } = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const p8 = require('../../services/phases/phase8-audio-v13.cjs')
// The SAME normaliser phase8 keys course_audio on. Never re-derive this: a
// text_normalized computed any other way writes a row the dedup lookup cannot
// find, and the next run pays to make it again.
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')

const execFileP = promisify(execFile)
const REPO = path.resolve(__dirname, '../..')
const SPLICER = path.join(REPO, 'scripts', 'splice-fork', 'splice.py')

const COURSE = process.argv[2]
const APPLY = process.argv.includes('--apply')
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : dflt
}
const POD_SLUG = arg('pod', 'pod-1')
const CONC = Number(arg('conc', 4))
const LIMIT = Number(arg('limit', 0))
const MARGIN_FLOOR = Number(arg('margin', 1.5))

// NB: the missing-course check lives with the run guard further down, not here.
// Required as a module (by the tests) there is no argv[2], and exiting on that
// would make the tool untestable.

/**
 * Seam gates. Both must hold at every internal seam.
 *
 * SEAM_DB is -35 because that IS the definition of silence this cut was made
 * on (splice.py's silencedetect floor). Checking the ENCODED PIECE's edge
 * against it is not circular — it independently confirms that the mp3 that
 * actually got written has a quiet edge, catching encoder padding drift, a
 * bad offset, or pieces mapped to the wrong boundary.
 *
 * It started at -45 and that was wrong, measured rather than argued: it
 * refused deu SC04-S003, whose cut sits in the middle of a genuine 783 ms
 * pause (profiled at 30 ms resolution: -91, -91, -49, -90, -91, -73 dB) and
 * whose seam reads -36.8 dB only because a breath falls in the window. A gate
 * stricter than the method's own silence floor doesn't reject bad cuts, it
 * rejects clips with an audible breath and a higher noise floor.
 *
 * SEAM_REL_DB is the gate that actually discriminates, and the reason it is
 * safe to relax the absolute one: the seam must also be at least 20 dB below
 * that piece's OWN speech peak. A cut through a word leaves a seam within
 * ~10 dB of speech; the deu breath sits 30 dB down. Relative, so it travels
 * across courses whose clips are mastered to different levels.
 */
const SEAM_DB = -35       // loudest a gated seam edge may be, absolute
const SEAM_REL_DB = 20    // ...and how far below its own piece's peak it must sit
const SEAM_WINDOW = 0.030 // measured over 30ms, as in job #343
const MIN_PIECE = 0.35    // seconds

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

/**
 * Sentence boundary for the TARGET side.
 *
 * The app's own boundary (POD_SENTENCE_BOUNDARY in podSentenceSplit.ts) is
 * /(?<=[.!?…])\s+/ — Latin, and it requires whitespace after the mark. CJK text
 * has no such whitespace, so that regex sees a 3-sentence Japanese turn as one
 * sentence. This is the same extension render-sentence-takes.cjs already makes
 * for exactly the same reason: CJK terminals split with or without a following
 * space, Latin marks keep requiring whitespace so "3.5" and abbreviations are
 * safe, and Arabic ؟ behaves like Latin ?.
 *
 * The app does not disagree with us when we split further than its regex can:
 * splitRowUnits takes its UNIT COUNT from the clip array and each unit's TEXT
 * from that clip's own stored course_audio.text (the `textById` oracle). So the
 * text a CJK learner reads on each card is the exact sentence this tool wrote
 * onto the clip. Verified against the app's real code, not assumed.
 */
const SENTENCE_SPLIT = /(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/
const KNOWN_SPLIT = /(?<=[.!?…])\s+/
const splitOn = (t, re) => String(t || '').split(re).map((s) => s.trim()).filter(Boolean)

async function ffprobeDur (file) {
  const { stdout } = await execFileP('ffprobe',
    ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return parseFloat(stdout.trim())
}

/**
 * Peak level in dB over a window of a file, windowed with the `atrim` FILTER.
 * Digital silence reads -91.
 *
 * Neither form of `-ss` works here, and both fail SILENTLY in the direction
 * that passes a bad cut — which is why this is a filter and not a seek:
 *
 *   `-ss` BEFORE `-i` is a fast seek to the nearest mp3 frame. On these clips
 *   it decoded an empty window (`n_samples: 0`, no level printed at all), and
 *   the first version of this function read that silence-shaped nothing as
 *   "-91 dB, quiet, pass". Measured on a real German turn: fast seek at 1.65s
 *   reported -91 dB where the truth at that instant is **-2.0 dB** — the
 *   middle of a word.
 *
 *   `-ss` AFTER `-i` is an output option: it discards frames after the filter
 *   graph has already seen them, so volumedetect measured the WHOLE file
 *   (102,864 samples for a 30 ms request) and every window returned the clip's
 *   overall peak.
 *
 * `atrim` cuts inside the graph, so volumedetect sees exactly the window asked
 * for — verified at 1,440 samples for 30 ms at 48 kHz. A seam gate that fails
 * open is worse than no gate: it launders a bad cut as verified.
 *
 * ffmpeg instantiates the graph twice and prints a spurious `n_samples: 0` for
 * the discarded instance, so both fields are read from the LAST match. Missing
 * or empty means throw — fail closed, and the caller turns that into a refusal.
 */
async function peakDb (file, start, dur) {
  const { stderr } = await execFileP('ffmpeg',
    ['-hide_banner', '-v', 'info', '-i', file,
      '-af', `atrim=start=${start.toFixed(4)}:end=${(start + dur).toFixed(4)},volumedetect`,
      '-f', 'null', '-'])
  const ns = [...stderr.matchAll(/n_samples:\s*(\d+)/g)]
  const vs = [...stderr.matchAll(/max_volume:\s*(-?[0-9.]+) dB/g)]
  const n = ns.length ? Number(ns[ns.length - 1][1]) : 0
  if (!n) throw new Error(`volumedetect read no samples at ${start.toFixed(3)}s of ${path.basename(file)}`)
  if (!vs.length) throw new Error(`volumedetect gave no max_volume at ${start.toFixed(3)}s of ${path.basename(file)}`)
  return parseFloat(vs[vs.length - 1][1])
}

/**
 * Splice one whole-turn clip into `n` pieces and run every gate.
 * Returns {ok:true, pieces:[{file,dur}], measure} or {ok:false, reason, measure}.
 */
async function spliceAndGate (src, n, outbase) {
  const { stdout } = await execFileP('python3', [SPLICER, src, String(n), outbase],
    { maxBuffer: 8 << 20 })
  const r = JSON.parse(stdout)
  const measure = {
    whole_dur: r.whole_dur,
    interior_gaps_ms: r.interior_gaps_ms,
    cut_at_gaps_ms: r.cut_at_gaps_ms,
    rejected_gaps_ms: r.rejected_gaps_ms,
    margin: r.margin,
    piece_durs: r.pieces.map((p) => p.dur),
  }
  const files = r.pieces.map((p) => path.join(path.dirname(outbase), p.file))

  // Gate 1 — the cut has to be possible at all.
  if (r.interior_gaps_ms.length < n - 1 || r.pieces.length !== n) {
    return { ok: false, reason: 'too_few_gaps', measure, files }
  }
  // Gate 2 — and it has to not be a coin toss.
  if (r.margin !== null && r.margin < MARGIN_FLOOR) {
    return { ok: false, reason: 'margin_below_floor', measure, files }
  }
  // Gate 4 (cheap, so before the ffmpeg passes) — no absurdly short piece.
  const shortest = Math.min(...measure.piece_durs)
  if (shortest < MIN_PIECE) {
    return { ok: false, reason: 'piece_too_short', measure, files }
  }
  // Gate 3 — every INTERNAL seam edge must be room tone, not speech.
  // The tail window is placed against the piece's ENCODED duration, read back
  // with ffprobe rather than taken from the cut arithmetic: mp3 encoding pads,
  // so the requested end and the real end are not the same instant, and
  // measuring 30ms at the wrong instant is how a gate stops testing anything.
  const seams = []
  try {
    for (let i = 0; i < files.length; i++) {
      const d = await ffprobeDur(files[i])
      // The piece's own speech level, for the relative half of the gate.
      const peak = await peakDb(files[i], 0, d)
      if (i > 0) {
        seams.push({ edge: `s${i}.head`, db: await peakDb(files[i], 0, SEAM_WINDOW), piece_peak_db: peak })
      }
      if (i < files.length - 1) {
        seams.push({
          edge: `s${i}.tail`,
          db: await peakDb(files[i], Math.max(0, d - SEAM_WINDOW), SEAM_WINDOW),
          piece_peak_db: peak,
        })
      }
    }
  } catch (e) {
    measure.seam_error = e.message
    return { ok: false, reason: 'seam_unmeasurable', measure, files }
  }
  measure.seams_db = seams
  const loud = seams.filter((s) => s.db > SEAM_DB || s.db > s.piece_peak_db - SEAM_REL_DB)
  if (loud.length) {
    measure.loud_seams = loud
    return { ok: false, reason: 'seam_not_silent', measure, files }
  }
  return { ok: true, measure, files }
}

/** Put one spliced piece in S3 and give it a course_audio row. Returns its id. */
async function publishPiece (file, { text, language, role, voiceId }) {
  const body = fs.readFileSync(file)
  const durationMs = Math.round((await ffprobeDur(file)) * 1000)
  const audioId = randomUUID().toUpperCase()
  const s3Key = `mastered/${audioId}.mp3`
  for (let attempt = 1; ; attempt++) {
    try {
      await p8.s3.send(new PutObjectCommand({
        Bucket: p8.S3_BUCKET,
        Key: s3Key,
        Body: body,
        ContentType: 'audio/mpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }))
      break
    } catch (e) {
      if (attempt >= 3) throw new Error(`[s3 after ${attempt}] ${e.message}`)
      await new Promise((r) => setTimeout(r, 600 * attempt))
    }
  }
  const { data, error } = await supabase.from('course_audio').upsert({
    course_code: COURSE,
    text,
    text_normalized: normalizeForAudio(text),
    language,
    role,
    voice_id: voiceId,
    origin: 'tts',      // it IS TTS audio — the same take, cut. Never 'human'.
    s3_key: s3Key,
    duration_ms: durationMs,
    file_size_bytes: body.length,
    word_boundaries: null,
  }, { onConflict: 'course_code,text_normalized,language,role,voice_id' })
    .select('id').single()
  if (error) throw new Error(`[db] ${error.message}`)
  return data.id
}

// Exported so the tests can drive the split and the measurement directly.
// Both are pure enough to test and both are places where a wrong answer is
// SILENT — the seam gate shipped fail-open twice during this tool's build.
module.exports = { SENTENCE_SPLIT, KNOWN_SPLIT, splitOn, peakDb, ffprobeDur, spliceAndGate }

// Only run the fleet job when invoked as a command, never on require().
if (require.main !== module) return

if (!COURSE) {
  console.error('usage: splice-sentence-clips.cjs <course> [--pod=pod-1] [--apply] [--conc=4] [--limit=N] [--margin=1.5]')
  process.exit(2)
}

;(async () => {
  const POD_ID = `${COURSE}:${POD_SLUG}`
  const { data: pod } = await supabase.from('listening_pods')
    .select('speakers, visibility').eq('id', POD_ID).single()
  if (!pod || !pod.speakers) { console.error(`ERR: no speakers cast on ${POD_ID}`); process.exit(1) }
  const { data: course } = await supabase.from('courses')
    .select('voice_config').eq('course_code', COURSE).single()
  const vc = ((course || {}).voice_config || {}).voices || {}
  const targetLang = vc.target1?.language || COURSE.split('_')[0]

  const { data: sents, error } = await supabase.from('listening_pod_sentences')
    .select('id, global_order, speaker, target_text, known_text, target_audio_id, sentence_audio_ids')
    .eq('pod_id', POD_ID).order('global_order')
  if (error) { console.error(error.message); process.exit(1) }

  const work = []
  for (const s of sents || []) {
    const tSents = splitOn(s.target_text, SENTENCE_SPLIT)
    if (tSents.length < 2) continue
    const cur = (s.sentence_audio_ids || []).filter(Boolean)
    if (cur.length === tSents.length) continue      // already correctly split
    work.push({ row: s, tSents })
  }
  const todo = LIMIT ? work.slice(0, LIMIT) : work

  const scratch = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'splice-'))
  const stats = { linked: 0, reused_clips: 0, spliced_clips: 0, refused: 0, errors: 0, known_count_mismatch: 0 }
  const refusals = []
  const applied = []
  const errors = []

  async function handle (item) {
    const { row, tSents } = item
    const n = tSents.length
    const tag = `S${row.global_order}`
    // Declared out here so the finally block can always clean up, including on
    // the paths that throw between download and publish. /tmp is RAM-backed on
    // this box and 1,500 turns of mp3 left behind would matter.
    let files = []
    try {
      const voice = p8.resolvePodSpeakerVoice(pod.speakers, row.speaker, 'target')
      if (!voice) {
        refusals.push({ id: row.id, order: row.global_order, n, reason: 'no_target_voice', text: row.target_text })
        stats.refused++; return
      }
      const voiceId = p8.canonicalClipVoiceId
        ? p8.canonicalClipVoiceId(voice.voice_id, voice.provider || 'azure')
        : voice.voice_id

      // Free first: anything already rendered under the dedup key is reused.
      //
      // Look up with the CANONICAL voice id — the same one publishPiece writes,
      // and therefore the same one the upsert's conflict key uses. Passing the
      // raw cast id here (which is what the equivalent call in generatePodAudio
      // does) makes the read and the write disagree: `sameVoice` canonicalises
      // through `tryCanonicalClipVoiceId(v)` with no provider argument, so it
      // cannot match a pod cast's bare `bf9fe5b5f981` to a stored
      // `xai_bf9fe5b5f981`. The lookup then misses a row that the conflict key
      // hits, and the upsert silently becomes an UPDATE that repoints an
      // existing clip at a spliced one.
      //
      // That is not hypothetical: it repointed 28 rows on the first fleet run
      // (nld 21, swe 2, and five others) before this line was changed. Same
      // text, same voice, so nothing sounded wrong and no gate fired — which is
      // exactly why it needs to be structurally impossible rather than watched
      // for. Restored by tools/pods/restore-clobbered-clip-pointers.cjs.
      const existing = []
      for (const t of tSents) {
        existing.push(await p8.findExistingAudio(COURSE, t, targetLang, 'target1', voiceId))
      }
      const needSplice = existing.some((id) => !id)

      let result = null
      if (needSplice) {
        if (!row.target_audio_id) {
          refusals.push({ id: row.id, order: row.global_order, n, reason: 'no_whole_turn_clip', text: row.target_text })
          stats.refused++; return
        }
        const src = path.join(scratch, `${row.id.replace(/[^A-Za-z0-9_-]/g, '_')}.mp3`)
        const outbase = src.replace(/\.mp3$/, '')
        await execFileP('curl', ['-sL', '--fail', '--max-time', '60', '-o', src,
          `https://saysomethingin.app/api/audio/${row.target_audio_id}`])
        if (!fs.existsSync(src) || fs.statSync(src).size < 500) {
          throw new Error(`whole-turn clip download too small`)
        }
        result = await spliceAndGate(src, n, outbase)
        files = [src, ...(result.files || [])]
        if (!result.ok) {
          refusals.push({
            id: row.id, order: row.global_order, n, reason: result.reason,
            text: row.target_text, sentences: tSents,
            target_audio_id: row.target_audio_id, measure: result.measure,
          })
          stats.refused++
          return
        }
      }

      // GATE 5 — the known side must be able to supply text for every card.
      //
      // This started as a counter and had to become a refusal, on evidence.
      // splitRowUnits pairs known text to cards BY INDEX (`kSents[i] || ''`),
      // so splitting a target into more pieces than the English has sentences
      // hands the learner cards with no translation at all.
      //
      // Croatian is where it showed up and it is worth stating precisely,
      // because every AUDIO gate passes on these rows: hrv Pod 1 uses "…" as a
      // mid-sentence hesitation marker ("Da, mogu li dobiti… i čašu vode,
      // molim." — one sentence). The app's own boundary regex counts "…" as
      // terminal, and generatePodAudio uses the same regex to place its " … "
      // TTS pause cue, so the take genuinely pauses there and the splicer finds
      // a wide, clean, high-margin gap. The cut is good. The unit is not a
      // sentence, and the giveaway is that the English does not split with it.
      //
      // Counting parts is the general form of that check: it catches the
      // Croatian ellipsis (78 rows) and the 8 unrelated mismatches elsewhere
      // with one rule and no special cases. A refused row keeps its whole-turn
      // clip and is exactly as it was — the safe direction.
      const kParts = splitOn(row.known_text, KNOWN_SPLIT).length
      if (kParts !== n) {
        stats.known_count_mismatch++
        refusals.push({
          id: row.id, order: row.global_order, n, reason: 'known_count_mismatch',
          text: row.target_text, known_text: row.known_text,
          sentences: tSents, known_parts: kParts,
          mid_ellipsis: /… /.test(row.target_text || ''),
        })
        stats.refused++
        return
      }

      const ids = []
      for (let i = 0; i < n; i++) {
        if (existing[i]) { ids.push(existing[i]); stats.reused_clips++; continue }
        if (!APPLY) { ids.push(`<would-splice:s${i}>`); stats.spliced_clips++; continue }
        ids.push(await publishPiece(result.files[i], {
          text: tSents[i], language: targetLang, role: 'target1', voiceId,
        }))
        stats.spliced_clips++
      }

      if (APPLY) {
        const { error: werr } = await supabase.from('listening_pod_sentences')
          .update({ sentence_audio_ids: ids }).eq('id', row.id)
        if (werr) throw new Error(`[link] ${werr.message}`)
      }
      applied.push({
        id: row.id, order: row.global_order, n, sentences: tSents, ids,
        margin: result ? result.measure.margin : null,
        piece_durs: result ? result.measure.piece_durs : null,
        // The loudest thing at any internal seam. Kept on the SUCCESS path too,
        // so the log proves the gate ran on every landed turn rather than only
        // explaining the ones it rejected.
        worst_seam_db: result ? Math.max(...result.measure.seams_db.map((s) => s.db)) : null,
        all_reused: !needSplice,
      })
      stats.linked++
      console.log(`${tag}: ${n} pieces ${needSplice ? `spliced (margin ${result.measure.margin ?? 'n/a'})` : 'reused'} ✓`)
    } catch (e) {
      errors.push({ id: row.id, order: row.global_order, error: e.message.slice(0, 300) })
      stats.errors++
      console.log(`${tag}: ERROR ${e.message.slice(0, 160)}`)
    } finally {
      for (const f of files) { try { fs.unlinkSync(f) } catch (_) {} }
    }
  }

  let next = 0
  const worker = async () => { while (next < todo.length) await handle(todo[next++]) }
  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) || 1 }, worker))
  try { fs.rmSync(scratch, { recursive: true, force: true }) } catch (_) {}

  const at = new Date().toISOString()
  const log = {
    course: COURSE, pod: POD_ID, apply: APPLY, at,
    gates: { margin_floor: MARGIN_FLOOR, seam_db: SEAM_DB, seam_window_s: SEAM_WINDOW, min_piece_s: MIN_PIECE },
    splicer: 'scripts/splice-fork/splice.py (unmodified)',
    multi_sentence_turns_needing_split: work.length,
    processed: todo.length,
    stats, refusals, errors,
    linked: applied,
  }
  const logPath = path.join(REPO, 'docs', 'pods',
    `${COURSE}-sentence-splice-${at.slice(0, 10)}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2))

  console.log(`\n${APPLY ? '[APPLIED] ' : '[DRY] '}${COURSE}: ${stats.linked}/${todo.length} turns linked ` +
    `(${stats.spliced_clips} clips spliced, ${stats.reused_clips} reused), ` +
    `${stats.refused} refused, ${stats.errors} errors, ${stats.known_count_mismatch} known-count mismatches.`)
  if (refusals.length) {
    const by = {}
    for (const r of refusals) by[r.reason] = (by[r.reason] || 0) + 1
    console.log(`   refusals: ${Object.entries(by).map(([k, v]) => `${k}=${v}`).join(' ')}`)
  }
  console.log(`   log: ${logPath}`)
  process.exit(stats.errors ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
