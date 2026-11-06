/**
 * The sentence rule and the seam gates of splice-sentence-clips.cjs, carved out unchanged (job #71, 2026-11-06)
 * so a second caller can use them with no database client: tools/pods/pod-drill/silence-lines.cjs measures human
 * takes and writes the player's cut file, nothing else. The evidence for each gate is in the splicer's header.
 * One addition: measure.piece_spans, each piece's [start, end] in seconds of the whole take.
 */
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileP = promisify(execFile)
const SPLICER = path.join(__dirname, 'splice.py')

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

/**
 * COURSES WHERE "…" IS HESITATION, NOT A SENTENCE END (Tom's ruling via
 * delegation, 2026-08-24).
 *
 * Croatian Pod 1 writes hesitation with an ellipsis: "Da, mogu li dobiti… i
 * čašu vode, molim." is ONE sentence, and 78 of its 131 multi-sentence rows do
 * this. Both the app's boundary regex and generatePodAudio's TTS pause cue
 * treat "…" as terminal, so the take really does pause there and a
 * length-chosen cut lands mid-sentence with every audio gate passing. Gate 5
 * (known_count_mismatch) caught all 78 and refused them, which is why they are
 * whole-turn today rather than wrong.
 *
 * Measured before changing anything: under the sentence rule below, all 78 rows
 * match their English known-side count exactly — 31 turn out to be single
 * sentences (correctly never split) and 47 become splittable.
 *
 * A SET rather than a global change because this is a claim about a course's
 * authored text, not about the character. Adding a course here says "we have
 * read this pod's text and its ellipses are hesitations."
 */
const ELLIPSIS_IS_HESITATION = new Set(['hrv_for_eng', 'cym_n_for_eng', 'cym_s_for_eng'])

/** Where generatePodAudio put its " … " TTS pause cue — i.e. where the take
 *  ACTUALLY pauses. Latin-only and whitespace-required, exactly as the renderer
 *  had it; the cue markers survive in the whole-turn clip's stored text, which
 *  is how this was verified rather than assumed. */
const CUE_SPLIT = /(?<=[.!?…])\s+/
/** Sentence boundary once "…" is demoted to hesitation. */
const SENTENCE_SPLIT_NO_ELLIPSIS = /(?<=[。！？])\s*(?=\S)|(?<=[.!?؟])\s+(?=\S)/

/**
 * Map a hesitation-ellipsis turn onto the cue pauses its take contains.
 *
 * Returns {sentences, cues, at} where `cues` is how many pauses the renderer
 * put in the audio and `at` is which of those pauses, IN TIME ORDER, are real
 * sentence ends. splice.py cuts only at those, leaving the hesitation pauses
 * inside their sentence where they belong — the performance is preserved
 * exactly, not re-joined.
 *
 * Returns null when the derivation does not reproduce the sentence split it
 * claims to describe. That is the self-check: a cue map that cannot rebuild
 * its own sentences is a wrong map, and cutting on it would be a guess.
 */
function cueMap (text) {
  const cueParts = splitOn(text, CUE_SPLIT)
  const sentences = splitOn(text, SENTENCE_SPLIT_NO_ELLIPSIS)
  const at = []
  for (let i = 0; i < cueParts.length - 1; i++) {
    if (/[.!?]$/.test(cueParts[i])) at.push(i)
  }
  // Rebuild the sentences from the cue parts using the map, and require that it
  // matches. Guards against any punctuation shape the two regexes disagree on.
  const rebuilt = []
  let acc = []
  for (let i = 0; i < cueParts.length; i++) {
    acc.push(cueParts[i])
    if (at.includes(i) || i === cueParts.length - 1) { rebuilt.push(acc.join(' ')); acc = [] }
  }
  if (rebuilt.length !== sentences.length ||
      rebuilt.some((s, i) => s !== sentences[i])) return null
  return { sentences, cues: cueParts.length - 1, at }
}

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
async function spliceAndGate (src, n, outbase, cue = null, MARGIN_FLOOR = 1.5) {
  const args = [SPLICER, src, String(n), outbase]
  // Cue-ordinal mode: cut only at the pauses the TEXT says are sentence ends.
  if (cue) args.push(`--cues=${cue.cues}`, `--at=${cue.at.join(',')}`)
  const { stdout } = await execFileP('python3', args, { maxBuffer: 8 << 20 })
  const r = JSON.parse(stdout)
  const measure = {
    whole_dur: r.whole_dur,
    interior_gaps_ms: r.interior_gaps_ms,
    cut_at_gaps_ms: r.cut_at_gaps_ms,
    rejected_gaps_ms: r.rejected_gaps_ms,
    margin: r.margin,
    piece_durs: r.pieces.map((p) => p.dur),
    piece_spans: r.pieces.map((p) => [p.start, p.end]),
  }
  if (r.cue_mode) {
    measure.cue_mode = true
    measure.cues_expected = r.cues_expected
    measure.cues_found = r.cues_found
    measure.cut_at_ordinals = r.cut_at_ordinals
    measure.cue_gaps_ms = r.cue_gaps_ms
  }
  const files = r.pieces.map((p) => path.join(path.dirname(outbase), p.file))

  // Gate 1 — the cut has to be possible at all. In cue mode the audio must
  // contain every pause the text says it does, not merely n-1 of them: a take
  // missing one cue pause means the pause-to-text mapping is off by one and
  // every ordinal after it points at the wrong gap.
  const gapsNeeded = cue ? cue.cues : n - 1
  if (r.interior_gaps_ms.length < gapsNeeded || r.pieces.length !== n) {
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

module.exports = {
  SEAM_DB, SEAM_REL_DB, SEAM_WINDOW, MIN_PIECE,
  SENTENCE_SPLIT, KNOWN_SPLIT, SENTENCE_SPLIT_NO_ELLIPSIS, CUE_SPLIT,
  ELLIPSIS_IS_HESITATION, cueMap, splitOn, peakDb, ffprobeDur, spliceAndGate,
}
