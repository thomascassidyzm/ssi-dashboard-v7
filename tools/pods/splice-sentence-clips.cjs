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
 * The splicer itself is tools/pods/splice.py, called as a subprocess — same
 * thresholds job #343 measured (-35 dB / 100 ms detection, N-1 longest interior
 * gaps, cut at each gap's midpoint, 50 ms of pause kept either side, 15 ms
 * fade). Reimplementing it here would let it drift away from the evidence that
 * justified it.
 *
 * It lived at scripts/splice-fork/splice.py until 2026-08-24 and was therefore
 * UNTRACKED — scripts/ is the gitignored workspace — so this committed tool
 * depended at runtime on a file that existed on one machine and in no clean
 * checkout. Moved into tools/ (committed, shared) alongside its caller.
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
/**
 * The splicer lives in tools/ because this tool cannot run without it.
 *
 * It was written in scripts/splice-fork/ during job #343, and scripts/ is the
 * GITIGNORED workspace — so the committed version of this tool would have
 * shipped to main pointing at a file that does not exist in the repo. Caught by
 * running the test suite from a fresh checkout off main rather than from the
 * working tree that happened to have it.
 *
 * The copy was byte-identical to the one #343 measured (md5
 * e2f61cf3bdcd344cc187d3a7e7af94e1) until job #599 (2026-09-13) taught it to
 * heal sub-5 ms blips inside a pause (see BLIP_MERGE_S there). Its thresholds — -35 dB /
 * 100 ms detection, N-1 longest interior gaps, cut at the midpoint, 50 ms of
 * pause kept either side, 15 ms fade — are the ones the splice-vs-render
 * evidence was gathered with, and re-typing them would quietly decouple the
 * tool from its justification.
 */

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
// --orders=1,3,23 — restrict the pass to these global_orders. A scoped repair
// (one pod's retired split rows) must not wander into every other unsplit turn
// of the pod; without this the only scope control was --limit, which is
// positional, not nominal. Empty/absent = the whole pod, exactly as before.
const ONLY_ORDERS = new Set(String(arg('orders', '')).split(',').map((s) => s.trim()).filter(Boolean).map(Number))

/** Pure: keep only the work items whose row.global_order is in `orders` (all when empty). */
const filterByOrders = (work, orders) => orders && orders.size ? work.filter((w) => orders.has(Number(w.row.global_order))) : work

// NB: the missing-course check lives with the run guard further down, not here.
// Required as a module (by the tests) there is no argv[2], and exiting on that
// would make the tool untestable.

const {
  SEAM_DB, SEAM_WINDOW, MIN_PIECE,
  SENTENCE_SPLIT, KNOWN_SPLIT, SENTENCE_SPLIT_NO_ELLIPSIS, CUE_SPLIT,
  ELLIPSIS_IS_HESITATION, cueMap, splitOn, peakDb, ffprobeDur, spliceAndGate: gate,
} = require('./splice-gates.cjs')
const spliceAndGate = (src, n, outbase, cue) => gate(src, n, outbase, cue, MARGIN_FLOOR)

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

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
module.exports = {
  SENTENCE_SPLIT, KNOWN_SPLIT, SENTENCE_SPLIT_NO_ELLIPSIS, CUE_SPLIT,
  ELLIPSIS_IS_HESITATION, cueMap,
  splitOn, peakDb, ffprobeDur, spliceAndGate, filterByOrders,
}

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

  // On a hesitation-ellipsis course the sentence rule changes AND the cut has
  // to be aimed by ordinal; everywhere else this is exactly as it was.
  const hesitation = ELLIPSIS_IS_HESITATION.has(COURSE)
  const work = []
  const cueMapFailures = []
  for (const s of sents || []) {
    let tSents, cue = null
    if (hesitation) {
      const m = cueMap(s.target_text)
      if (!m) { cueMapFailures.push({ id: s.id, order: s.global_order, text: s.target_text }); continue }
      tSents = m.sentences
      cue = { cues: m.cues, at: m.at }
    } else {
      tSents = splitOn(s.target_text, SENTENCE_SPLIT)
    }
    if (tSents.length < 2) continue
    const cur = (s.sentence_audio_ids || []).filter(Boolean)
    if (cur.length === tSents.length) continue      // already correctly split
    work.push({ row: s, tSents, cue })
  }
  if (cueMapFailures.length) {
    console.log(`cue-map self-check refused ${cueMapFailures.length} row(s) — left whole-turn`)
  }
  const scoped = filterByOrders(work, ONLY_ORDERS)
  const todo = LIMIT ? scoped.slice(0, LIMIT) : scoped

  const scratch = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'splice-'))
  const stats = { linked: 0, reused_clips: 0, spliced_clips: 0, refused: 0, errors: 0, known_count_mismatch: 0 }
  const refusals = []
  const applied = []
  const errors = []

  async function handle (item) {
    const { row, tSents, cue } = item
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
        existing.push(await p8.findExistingAudio(COURSE, t, targetLang, voiceId))
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
        result = await spliceAndGate(src, n, outbase, cue)
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
      // On a hesitation-ellipsis course the KNOWN side is read with the same
      // demoted "…" so the two sides are counted by one rule, not two.
      const kParts = splitOn(row.known_text,
        cue ? /(?<=[.!?])\s+/ : KNOWN_SPLIT).length
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
    splicer: 'tools/pods/splice.py',
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
