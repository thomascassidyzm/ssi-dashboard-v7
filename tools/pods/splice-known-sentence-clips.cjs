#!/usr/bin/env node
/**
 * splice-known-sentence-clips.cjs — the KNOWN (English) half of the sentence
 * splice. Restores per-sentence KNOWN audio by CUTTING each turn's OWN
 * whole-turn known clip at the pauses the synthesiser already left in it.
 * ffmpeg only. No TTS. No money. No content text is touched.
 *
 * WHY THIS EXISTS (Tom, 2026-08-24). The split-array repair
 * (tools/pods/repair-split-array-inheritance.cjs, run 11:12Z on Italian and
 * 11:29Z fleet-wide) NULLed `sentence_known_audio_ids` wherever the array had
 * been inherited positionally from a retired pod and pointed at another
 * conversation's clips. Nulling was right — the learner was hearing the wrong
 * words — but it left the known side of those turns with no per-sentence audio,
 * so a split card shows its sentence's text with the translation slot empty.
 *
 * splice-sentence-clips.cjs, which restored the TARGET side the same free way,
 * scoped itself out of this deliberately and said so:
 *
 *     "TARGET SIDE ONLY. `sentence_known_audio_ids` is out of scope for this
 *      pass and is not touched… Splicing the known side is the same free method
 *      and is a follow-on pass, not a silent extension of this one."
 *
 * This is that follow-on pass. Tom's instruction, 2026-08-24: BUILD IT.
 *
 * ---------------------------------------------------------------------------
 * NOTHING IS REIMPLEMENTED HERE. The cut, the four splice gates and the
 * publisher are `require`d from splice-sentence-clips.cjs, which in turn calls
 * tools/pods/splice.py unmodified. The seam gate shipped fail-open
 * twice during that tool's build; a second copy of it here would be a second
 * chance to get it wrong, and the two would drift. What lives in THIS file is
 * only what is genuinely different about the known side.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DIFFERENT ABOUT THE KNOWN SIDE, and it is not cosmetic.
 *
 * 1. THE UNIT COUNT IS NOT OURS TO CHOOSE. On the target side the number of
 *    pieces IS the number of cards the learner gets. On the known side it is
 *    not: podSentenceSplit.splitRowUnits takes the unit count from
 *    `sentence_audio_ids` and pairs the known array in ONLY when
 *    `knownClips.length === clips.length` — otherwise every unit gets
 *    `knownAudioId: null` and the whole array is dead weight. So N comes from
 *    the row's EXISTING target array, and a known split that does not produce
 *    exactly N pieces is not a smaller win, it is no win at all. Refused.
 *
 * 2. A ROW WITH NO TARGET SPLIT IS OUT OF SCOPE, not a failure. `splitRowUnits`
 *    returns a single whole-turn unit below 2 target clips, and never reads the
 *    known array on that path. Splicing the known side of such a row would
 *    write clips no learner can reach. Those rows are counted and reported as
 *    an explicit gap — they are waiting on the TARGET pass, not on this one.
 *
 * 3. THE PAUSES ARE THERE FOR THE SAME REASON. generatePodAudio inserts its
 *    " … " pause cue on `track === 'target' || track === 'known'` alike
 *    (phase8-audio-v13.cjs, Tom 2026-06-30), so a multi-sentence known take is
 *    as cleanly splittable as a target one. This tool is collecting on that.
 *    The stored clip text carries the cue; the row's own `known_text` does not,
 *    which is why the fidelity gate below compares NORMALISED text.
 *
 * 4. THE KNOWN TRACK HAS ITS OWN CAST. Voice comes from
 *    resolvePodSpeakerVoice(speakers, speaker, 'known') — a different voice
 *    from the target track, per character — and falls back to the course's
 *    voice_config.voices.known for legacy pods, exactly as generatePodAudio's
 *    own known work-queue item does.
 *
 * ---------------------------------------------------------------------------
 * THE GATES. Every one runs PER ROW and is measured on that row, never assumed
 * from the course or from a sibling. A row that fails any gate is LEFT ON ITS
 * WHOLE-TURN FALLBACK — exactly as it is today, no worse — and written to the
 * log with its reason and its numbers.
 *
 *   G1 target-split present    N = |sentence_audio_ids| >= 2, else out of scope.
 *   G2 target split resolves   every target split id must still exist in
 *                              course_audio. The app's stale-slice guard is
 *                              ALL-OR-NOTHING across BOTH arrays, so a known
 *                              array hung off a dangling target array buys
 *                              nothing and hides a different defect.
 *   G3 known count == N        the known text must split into exactly N parts.
 *   G4 known script splittable CJK/Thai known text cannot be split by the
 *                              boundary regex at all; excluded and reported as
 *                              a gap rather than guessed at (see below).
 *   G5 whole-turn clip exists  there is a performance to cut.
 *   G6 known voice resolvable  the cast answers for this speaker's known track.
 *   G7 FIDELITY — text         the whole-turn known clip's stored text must BE
 *                              this row's known text (normalised). This is the
 *                              six-column fidelity check applied to the slot we
 *                              are about to derive N learner-facing clips from:
 *                              cutting a clip that says something else produces
 *                              N wrong clips that every audio gate passes.
 *   G8 FIDELITY — voice        the whole-turn known clip's voice must be ON THE
 *                              Pod's known cast for this speaker. An off-cast
 *                              whole-turn clip is a known, separately-tracked
 *                              defect; splicing it would multiply it by N and
 *                              launder it as freshly verified.
 *   G9 VARIANT-DRILL RULE      (tools/pods/variant-run.cjs, Tom's ruling
 *                              2026-08-24). If this row sits in a variant run
 *                              that is CURRENTLY split across two known voices,
 *                              refuse. The run is mid-repair; propagating the
 *                              breach into N per-sentence clips makes the
 *                              character contradict itself on every card and
 *                              makes the repair N times more work. A run wholly
 *                              on one voice is the CORRECT state and is never
 *                              flagged — this gate only ever fires on a run the
 *                              casting rule already says is wrong.
 *   G10-G13 the splice gates   gap count, margin >= 1.5, seam silence (absolute
 *                              AND relative to the piece's own peak), minimum
 *                              piece duration — all from spliceAndGate, run
 *                              unmodified. See splice-sentence-clips.cjs for
 *                              the evidence behind each number.
 *
 * CJK, SAID PLAINLY. The known-side boundary is /(?<=[.!?…])\s+/ — it needs
 * whitespace after the mark, and CJK/Thai text has none. Every live `<course>:
 * pod-1` today is a `*_for_eng` course, so in practice the known side is
 * English everywhere and G4 excludes nothing; the check is here because
 * `eng_for_jpn`-shaped courses exist on the estate and a pod on one of them
 * would otherwise be split by a regex that cannot see its sentences. The
 * TARGET tool extends its regex for CJK because the clip's own stored text is
 * the app's display oracle on that side. On the known side it is not — the
 * translation text comes from `kSents[i]`, the regex split — so a CJK known
 * split would pair audio against text the app never split. Excluded, counted,
 * reported. That is the honest gap, not a silent skip.
 *
 * FREE BEFORE CUT. Every sentence is looked up first through phase8's own
 * findExistingAudio on the same (course, text, language, role='known', voice)
 * dedup key generatePodAudio uses, with the CANONICAL voice id — the same one
 * the publisher writes, so the read and the write can never disagree about
 * identity (that disagreement repointed 28 clips on the target pass). An
 * already-rendered sentence clip is reused and no splice is made, so this tool
 * can never overwrite a properly rendered known sentence clip with a cut one.
 *
 * PROGRESS SAFETY: nothing to migrate, and that is checked rather than hoped.
 * learner_pod_state keys a split unit `<row.id>:s<k>`, and k runs over the
 * TARGET clip array (`clips.map(...)` in splitRowUnits). This pass adds a known
 * array and changes neither the unit count nor any key. The content-change
 * migration protocol is therefore satisfied with no migration — the learner's
 * position is untouched; a slot that was silent starts speaking.
 *
 *   node tools/pods/splice-known-sentence-clips.cjs <course> [--pod=pod-1]
 *        [--apply] [--conc=4] [--limit=N] [--margin=1.5]
 *
 * Read-only without --apply — and a dry run still downloads, splices and runs
 * every gate, so the refusal list it prints is the real one, not an estimate.
 * Writes docs/pods/<course>-known-sentence-splice-<date>-{dryrun,applied}-log.json.
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { createClient } = require('@supabase/supabase-js')
const p8 = require('../../services/phases/phase8-audio-v13.cjs')
const splicer = require('./splice-sentence-clips.cjs')
const { splitVariantRuns } = require('./variant-run.cjs')

const { KNOWN_SPLIT, splitOn, spliceAndGate, publishPiece } = splicer

const execFileP = promisify(execFile)
const REPO = path.resolve(__dirname, '../..')

const COURSE = process.argv[2]
const APPLY = process.argv.includes('--apply')
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : dflt
}
const POD_SLUG = arg('pod', 'pod-1')
const CONC = Number(arg('conc', 4))
const LIMIT = Number(arg('limit', 0))

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

/**
 * Scripts the known-side boundary regex cannot see sentences in: CJK
 * ideographs and kana, Hangul, and Thai (which writes no sentence punctuation
 * at all). Presence of any of these in a known text means the regex split is
 * not evidence of anything — see the CJK note in the header.
 */
const UNSPLITTABLE_SCRIPT = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯฀-๿]/

/**
 * The comparison the fidelity gate makes. Deliberately the SAME normalisation
 * repair-split-array-inheritance.cjs used to decide these rows were broken in
 * the first place, so the tool that cleans up cannot disagree with the tool
 * that swept. Strips the " … " pause cue the stored clip text carries and the
 * row's text does not, folds case, drops diacritics and punctuation.
 */
const norm = (s) => (s || '')
  .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/\[pause\]/g, ' ').replace(/[…]/g, ' ')
  .replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()

/** A voice id appears bare and provider-prefixed for the same voice. */
const bare = (v) => (v || '').replace(/^(xai_|azure_)/, '')

// Exported for the tests: these are the two decisions that are this file's own.
module.exports = { UNSPLITTABLE_SCRIPT, norm, bare, planRow }

/**
 * The whole per-row decision, as a PURE function — every gate from G1 to G9,
 * with no I/O in it. Pure so the tests can drive every refusal reason directly
 * with a row object instead of needing a pod, a cast and a clip to reproduce
 * one. The audio gates (G10-G13) cannot be pure and are not here; they are
 * spliceAndGate's, unmodified.
 *
 * @param {object} row       listening_pod_sentences row
 * @param {object} clipsById id -> {text, voice_id} for every clip referenced
 * @param {Set<string>} castKnownVoices  bare voice ids on the pod's known cast
 * @param {boolean} inSplitVariantRun    G9, computed once per pod
 * @returns {{verdict:'work'|'skip'|'gap'|'refuse', reason:string|null,
 *            n:number, kSents:string[]}}
 */
function planRow (row, clipsById, castKnownVoices, inSplitVariantRun) {
  const tgt = (row.sentence_audio_ids || []).filter(Boolean)
  const known = (row.sentence_known_audio_ids || []).filter(Boolean)
  const n = tgt.length
  const kSents = splitOn(row.known_text, KNOWN_SPLIT)
  const out = (verdict, reason) => ({ verdict, reason, n, kSents })

  // G1 — no target split means no split units, so nothing here can reach a learner.
  if (n < 2) return out('gap', 'no_target_split')
  // Already correct: the array is present and the right length. Never re-cut.
  if (known.length === n) return out('skip', 'already_split')
  // G2 — the target split must itself be alive. All-or-nothing in the app.
  if (!tgt.every((id) => clipsById[id])) return out('gap', 'target_split_dangling')
  // G4 before G3: on an unsplittable script the count is not evidence either way.
  if (UNSPLITTABLE_SCRIPT.test(row.known_text || '')) return out('gap', 'known_script_unsplittable')
  // G3 — the count the app requires, or the array is dead weight.
  if (kSents.length !== n) return out('refuse', 'known_count_mismatch')
  // G5 — there has to be a performance to cut.
  if (!row.known_audio_id) return out('refuse', 'no_whole_turn_known_clip')
  const clip = clipsById[row.known_audio_id]
  if (!clip) return out('refuse', 'whole_turn_known_clip_missing')
  // G7 — it has to be THIS row's words.
  if (norm(clip.text) !== norm(row.known_text)) return out('refuse', 'whole_turn_text_mismatch')
  // G8 — in this pod's known voice, or we would multiply an off-cast clip by n.
  if (!castKnownVoices.has(bare(clip.voice_id))) return out('refuse', 'whole_turn_off_cast')
  // G9 — Tom's variant-drill ruling; the run is mid-repair, don't spread it.
  if (inSplitVariantRun) return out('refuse', 'variant_run_split_voices')
  return out('work', null)
}

// Only run the pod job when invoked as a command, never on require().
if (require.main !== module) return

if (!COURSE) {
  console.error('usage: splice-known-sentence-clips.cjs <course> [--pod=pod-1] [--apply] [--conc=4] [--limit=N] [--margin=1.5]')
  process.exit(2)
}

;(async () => {
  const POD_ID = `${COURSE}:${POD_SLUG}`
  const { data: pod } = await supabase.from('listening_pods')
    .select('speakers, visibility').eq('id', POD_ID).single()
  if (!pod || !pod.speakers) { console.error(`ERR: no speakers cast on ${POD_ID}`); process.exit(1) }
  const { data: course } = await supabase.from('courses')
    .select('known_lang, voice_config').eq('course_code', COURSE).single()
  const vc = ((course || {}).voice_config || {}).voices || {}
  // Same resolution order generatePodAudio uses for a known clip.
  const knownLang = vc.known?.language || course?.known_lang || COURSE.split('_for_').pop()
  const courseKnownVoice = vc.known?.voiceId
    ? { voice_id: vc.known.voiceId, provider: vc.known.provider || 'azure' }
    : null

  const castKnownVoices = new Set()
  for (const entry of Object.values(pod.speakers)) {
    if (entry?.known?.voice_id) castKnownVoices.add(bare(entry.known.voice_id))
  }
  if (courseKnownVoice) castKnownVoices.add(bare(courseKnownVoice.voice_id))
  if (!castKnownVoices.size) { console.error(`ERR: ${POD_ID} has no known cast`); process.exit(1) }

  const { data: sents, error } = await supabase.from('listening_pod_sentences')
    .select('id, global_order, scene_number, sentence_number, speaker, target_text, known_text, ' +
            'known_audio_id, sentence_audio_ids, sentence_known_audio_ids')
    .eq('pod_id', POD_ID).order('global_order')
  if (error) { console.error(error.message); process.exit(1) }
  const rows = sents || []

  // Resolve every clip this pod references on the slots we read, in chunks —
  // PostgREST's .in() quietly returns a fraction past ~100 ids rather than
  // erroring, and a clip "missing" for that reason would be reported as a
  // defect it is not.
  const ids = new Set()
  for (const r of rows) {
    if (r.known_audio_id) ids.add(r.known_audio_id)
    for (const i of (r.sentence_audio_ids || [])) if (i) ids.add(i)
  }
  const clipsById = {}
  const idArr = [...ids]
  for (let i = 0; i < idArr.length; i += 80) {
    const { data: cs, error: cerr } = await supabase.from('course_audio')
      .select('id, text, voice_id').in('id', idArr.slice(i, i + 80))
    if (cerr) { console.error(`clip read: ${cerr.message}`); process.exit(1) }
    for (const c of cs || []) clipsById[c.id] = c
  }

  // G9, computed once for the pod: which variant runs are currently split
  // across two KNOWN voices. voiceOf returns null for a row whose whole-turn
  // clip cannot be resolved — splitVariantRuns then ignores it rather than
  // guessing, which is the same fail-safe direction as every gate below.
  const labelOf = (r) => `${r.scene_number}.${r.sentence_number}`
  const scriptOrder = [...rows].sort((a, b) =>
    (a.scene_number - b.scene_number) || (a.sentence_number - b.sentence_number))
  const splitRuns = splitVariantRuns(scriptOrder, (r) => {
    const c = clipsById[r.known_audio_id]
    return c ? bare(c.voice_id) : null
  })
  // splitVariantRuns reports a run by its LABELS (scene.sentence), which is the
  // stable identity in that module's contract; map back to row ids here.
  const blockedLabels = new Set(splitRuns.flatMap((run) => run.labels))
  const variantBlockedIds = new Set(
    rows.filter((r) => blockedLabels.has(labelOf(r))).map((r) => r.id))

  const work = []
  const gaps = []
  const refusals = []
  const stats = {
    rows: rows.length, already_split: 0, restored: 0, reused_clips: 0, spliced_clips: 0,
    refused: 0, excluded: 0, errors: 0,
  }

  for (const row of rows) {
    const plan = planRow(row, clipsById, castKnownVoices, variantBlockedIds.has(row.id))
    if (plan.verdict === 'skip') { stats.already_split++; continue }
    if (plan.verdict === 'gap') {
      gaps.push({ id: row.id, order: row.global_order, at: labelOf(row), reason: plan.reason, n: plan.n })
      stats.excluded++
      continue
    }
    if (plan.verdict === 'refuse') {
      refusals.push({
        id: row.id, order: row.global_order, at: labelOf(row), reason: plan.reason,
        n: plan.n, known_parts: plan.kSents.length,
        known_text: row.known_text, speaker: row.speaker,
        clip_text: clipsById[row.known_audio_id]?.text || null,
        clip_voice: clipsById[row.known_audio_id]?.voice_id || null,
      })
      stats.refused++
      continue
    }
    work.push({ row, kSents: plan.kSents, n: plan.n })
  }
  const todo = LIMIT ? work.slice(0, LIMIT) : work

  const scratch = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'kspl-'))
  const applied = []
  const errors = []

  async function handle (item) {
    const { row, kSents, n } = item
    const tag = `${labelOf(row)}`
    let files = []
    try {
      const voice = p8.resolvePodSpeakerVoice(pod.speakers, row.speaker, 'known') || courseKnownVoice
      if (!voice) {
        refusals.push({ id: row.id, order: row.global_order, at: tag, reason: 'no_known_voice', n })
        stats.refused++; return
      }
      // CANONICAL id for BOTH the lookup and the write. See the publisher's
      // conflict-key note — a read and a write that canonicalise differently is
      // how the target pass repointed 28 clips.
      const voiceId = p8.canonicalClipVoiceId
        ? p8.canonicalClipVoiceId(voice.voice_id, voice.provider || 'azure')
        : voice.voice_id

      const existing = []
      for (const t of kSents) {
        existing.push(await p8.findExistingAudio(COURSE, t, knownLang, 'known', voiceId))
      }
      const needSplice = existing.some((id) => !id)

      let result = null
      if (needSplice) {
        const src = path.join(scratch, `${row.id.replace(/[^A-Za-z0-9_-]/g, '_')}.mp3`)
        const outbase = src.replace(/\.mp3$/, '')
        await execFileP('curl', ['-sL', '--fail', '--max-time', '60', '-o', src,
          `https://saysomethingin.app/api/audio/${row.known_audio_id}`])
        if (!fs.existsSync(src) || fs.statSync(src).size < 500) {
          throw new Error('whole-turn known clip download too small')
        }
        result = await spliceAndGate(src, n, outbase)
        files = [src, ...(result.files || [])]
        if (!result.ok) {
          refusals.push({
            id: row.id, order: row.global_order, at: tag, reason: result.reason,
            n, known_text: row.known_text, sentences: kSents,
            known_audio_id: row.known_audio_id, measure: result.measure,
          })
          stats.refused++
          return
        }
      }

      const ids = []
      for (let i = 0; i < n; i++) {
        if (existing[i]) { ids.push(existing[i]); stats.reused_clips++; continue }
        if (!APPLY) { ids.push(`<would-splice:s${i}>`); stats.spliced_clips++; continue }
        ids.push(await publishPiece(result.files[i], {
          courseCode: COURSE, text: kSents[i], language: knownLang, role: 'known', voiceId,
        }))
        stats.spliced_clips++
      }

      if (APPLY) {
        // Per-row before-state assertion: the plan was computed from a read that
        // is now minutes old and other passes run on this estate concurrently.
        // Abort this ROW on drift rather than write over a change we did not see.
        const { data: live, error: lerr } = await supabase.from('listening_pod_sentences')
          .select('sentence_audio_ids, sentence_known_audio_ids').eq('id', row.id).single()
        if (lerr) throw new Error(`[recheck] ${lerr.message}`)
        const stillEmpty = (live.sentence_known_audio_ids || []).filter(Boolean).length === 0
        const sameTarget = JSON.stringify((live.sentence_audio_ids || []).filter(Boolean)) ===
          JSON.stringify((row.sentence_audio_ids || []).filter(Boolean))
        if (!stillEmpty || !sameTarget) {
          throw new Error('DRIFT since plan — known array or target array changed; row left alone')
        }
        const { error: werr } = await supabase.from('listening_pod_sentences')
          .update({ sentence_known_audio_ids: ids }).eq('id', row.id)
        if (werr) throw new Error(`[link] ${werr.message}`)
      }
      applied.push({
        id: row.id, order: row.global_order, at: tag, n, speaker: row.speaker,
        sentences: kSents, ids,
        margin: result ? result.measure.margin : null,
        piece_durs: result ? result.measure.piece_durs : null,
        // Kept on the SUCCESS path too, so the log proves the seam gate RAN on
        // every landed turn rather than only explaining the refused ones.
        worst_seam_db: result ? Math.max(...result.measure.seams_db.map((s) => s.db)) : null,
        all_reused: !needSplice,
      })
      stats.restored++
      console.log(`${tag}: ${n} known pieces ${needSplice ? `spliced (margin ${result.measure.margin ?? 'n/a'})` : 'reused'} ✓`)
    } catch (e) {
      errors.push({ id: row.id, order: row.global_order, at: tag, error: e.message.slice(0, 300) })
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

  const tally = (list) => {
    const by = {}
    for (const r of list) by[r.reason] = (by[r.reason] || 0) + 1
    return by
  }
  const at = new Date().toISOString()
  const log = {
    course: COURSE, pod: POD_ID, side: 'known', apply: APPLY, at,
    known_language: knownLang,
    cast_known_voices: [...castKnownVoices],
    splicer: 'tools/pods/splice-sentence-clips.cjs spliceAndGate → tools/pods/splice.py',
    candidates: work.length,
    processed: todo.length,
    stats,
    refusals_by_reason: tally(refusals),
    excluded_by_reason: tally(gaps),
    variant_runs_split_across_known_voices: splitRuns,
    refusals, excluded: gaps, errors,
    restored: applied,
  }
  const logPath = path.join(REPO, 'docs', 'pods',
    `${COURSE}-known-sentence-splice-${at.slice(0, 10)}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2))

  console.log(`\n${APPLY ? '[APPLIED] ' : '[DRY] '}${COURSE} known side: ${stats.restored}/${todo.length} turns restored ` +
    `(${stats.spliced_clips} clips spliced, ${stats.reused_clips} reused), ` +
    `${stats.refused} left on fallback, ${stats.excluded} out of scope, ${stats.errors} errors, ` +
    `${stats.already_split} already split.`)
  if (refusals.length) console.log(`   fallback: ${Object.entries(tally(refusals)).map(([k, v]) => `${k}=${v}`).join(' ')}`)
  if (gaps.length) console.log(`   excluded: ${Object.entries(tally(gaps)).map(([k, v]) => `${k}=${v}`).join(' ')}`)
  console.log(`   log: ${logPath}`)
  process.exit(stats.errors ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
