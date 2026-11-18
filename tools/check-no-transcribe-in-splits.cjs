#!/usr/bin/env node
/**
 * NO TRANSCRIPTION IN AUDIO SPLITS — fails when any tracked file whose job is splitting, cutting,
 * splicing, seaming or aligning course audio calls a speech recogniser.
 *
 * THE RULING, verbatim (r-2026-11-03-audio-splits-alignment-never-use-whisper):
 *   "Audio splits/alignment never use Whisper (or any transcription) for timings: word timings come
 *    from Cartesia voice timings of the render; meanings are matched from the text (LEGO map), not
 *    from transcribed audio"
 * Tom, the same day: "there should be no voice transcriptions in our audio work, I feel like I'm
 * going nuts here repeating myself". Agents kept putting whisper back into the cut tools, so the
 * rule is a refusal now, not a note (job #732).
 *
 * WHERE TIMINGS COME FROM INSTEAD: course_audio.word_timings (Cartesia's own timestamps, stored at
 * render: services/shared/word-timings.cjs), read through tools/pods/pod-drill/lib.mjs cartesiaSegs /
 * alignTimes; the seam itself goes at the quietest energy frame between two timed words
 * (quietestBetween / frameDb). Energy and silence detection are NOT transcription and stay allowed.
 *
 * OUT OF SCOPE, on purpose — do not widen this into either of these:
 *  - QA SAMPLING of finished audio. r-2026-11-03-whisper-on-audio-a-1-in stands: "Whisper on audio:
 *    a 1-in-100 sample is fine; never every track, and never on Welsh ... Sampling only, never vetoes
 *    or re-renders (r-2026-09-28 stands)". Veracity, word-loss and capability tools are not scanned
 *    (they are not split files), and services/stt-report-only.test.cjs is what holds them to
 *    report-only. A split-named QA reader that only reports is listed in REPORT_ONLY below.
 *  - TOM'S VOICE DICTATION (command-surface, ops/transcribe-probe). Different repo, different job.
 *  - aeneas (tools/recording-optimizer/align-audio.cjs 'natural' mode) is TTS-synthesis + DTW on a
 *    HUMAN recording, not a recogniser, so it is not matched. If that ruling changes, add it here.
 *
 * SCOPE = tracked code under tools/ and services/ that is either in a cut directory (pod-drill,
 * guess, recording-optimizer, welcome) or whose file name carries a split word (split, splice,
 * seam, cut, align, segment, dice …, whole tokens between - _ .). Tests are not scanned. Comment
 * lines are skipped, so a header quoting the ruling never trips it; a call in code always does.
 *
 *   node tools/check-no-transcribe-in-splits.cjs              # the working tree's tracked files
 *   node tools/check-no-transcribe-in-splits.cjs --rev <sha>  # a commit's tree (the pre-push hook)
 *
 * Wired: package.json pretest (beside check-tts-door) and .githooks/pre-push, which the estate's
 * global pre-push hook (~/.git-identity-hooks/pre-push) chains to on every push from this repo.
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SELF = 'tools/check-no-transcribe-in-splits.cjs'

const CODE = /\.(c|m)?js$|\.ts$|\.py$|\.sh$/
const CUT_DIRS = ['tools/pods/pod-drill/', 'tools/guess/', 'tools/recording-optimizer/', 'tools/welcome/']
const SPLIT_WORD = /^(split|splits|splitter|splice|spliced|splicer|splicing|seam|seams|cut|cuts|align|aligner|alignment|segment|segments|dice)$/i

/** Split-named files that only READ finished audio and report, under the 1-in-100 sampling ruling.
 *  Each is also declared 'report' in services/stt-report-only.test.cjs. Nothing that cuts goes here. */
const REPORT_ONLY = new Set([
  'tools/pods/verify-spliced-sentences.cjs', // --no-stt for sweeps; its STT leg is advisory per clip, cuts nothing
])

const inScope = (file) => {
  if (file === SELF || REPORT_ONLY.has(file) || !CODE.test(file) || /\.test\./.test(file)) return false
  if (!/^(tools|services)\//.test(file)) return false
  if (CUT_DIRS.some((d) => file.startsWith(d))) return true
  return path.basename(file).split(/[-_.]/).some((t) => SPLIT_WORD.test(t))
}

/** One way each to reach a recogniser. Prose mentioning "whisper" does not match; a call does. */
const RECOGNISERS = [
  { name: 'whisper', re: /whisper-cli|whisper\.cpp|WHISPER_(BIN|MODEL|CLI)\b|ggml-[\w.-]*\.bin|faster[_-]whisper|whisperx|openai-whisper|whisper\.load_model|^\s*(import|from)\s+whisper\b|require\(\s*['"`][^'"`]*whisper|whisper-cli-cap/i },
  { name: 'forced aligner / phone recogniser', re: /torchaudio|MMS_FA|wav2vec2?|forced_align|ctc[_-]segmentation|ctc-forced-aligner|montreal-forced-aligner|nemo_forced_aligner|\bvosk\b|pocketsphinx|allosaurus|align-takes\.py/i },
  { name: 'speech-to-text API', re: /audio\/transcriptions|audio\.transcriptions|api\.deepgram\.com\/v\d+\/listen|api\.assemblyai\.com|speech\.googleapis\.com|@google-cloud\/speech|SpeechRecognizer|speech_recognition|recognizeOnceAsync|speech-to-text|api\.rev\.ai|speechmatics/i },
  { name: "Popty's own STT engine", re: /\b(checkAudioVeracity|detectSpokenLanguage|verifyTrimKeepsText|decodeAudio)\s*\(/ },
]

const isComment = (line) => /^\s*(\/\/|\/\*|\*|#(?!!))/.test(line)

/** Pure: offenders in { file: text }. */
function findTranscription(files) {
  const out = []
  for (const [file, text] of Object.entries(files)) {
    if (!inScope(file)) continue
    text.split('\n').forEach((line, i) => {
      if (isComment(line)) return
      const r = RECOGNISERS.find((p) => p.re.test(line))
      if (r) out.push({ file, line: i + 1, kind: r.name, text: line.trim().slice(0, 140) })
    })
  }
  return out
}

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

function scan(rev = null) {
  const list = rev ? git(['ls-tree', '-r', '-z', '--name-only', rev]) : git(['ls-files', '-z'])
  const files = {}
  for (const f of list.split('\0').filter((x) => x && inScope(x))) {
    try { files[f] = rev ? git(['show', `${rev}:${f}`]) : fs.readFileSync(path.join(ROOT, f), 'utf8') } catch { /* deleted in the worktree */ }
  }
  return findTranscription(files)
}

module.exports = { RECOGNISERS, REPORT_ONLY, inScope, findTranscription, scan }

if (require.main === module) {
  const i = process.argv.indexOf('--rev')
  const rev = i > 0 ? process.argv[i + 1] : null
  const offenders = scan(rev)
  if (offenders.length) {
    console.error(`✗ no-transcribe-in-splits: ${offenders.length} recogniser call(s) in audio split/cut/seam/align code${rev ? ` at ${/^[0-9a-f]{40}$/.test(rev) ? rev.slice(0, 9) : rev}` : ''}:`)
    for (const o of offenders) console.error(`  ${o.file}:${o.line}  [${o.kind}]  ${o.text}`)
    console.error('Tom r-2026-11-03: "Audio splits/alignment never use Whisper (or any transcription) for timings: word timings come from Cartesia voice timings of the render; meanings are matched from the text (LEGO map), not from transcribed audio". Take timings from course_audio.word_timings (pod-drill lib cartesiaSegs/alignTimes) and the seam from energy (quietestBetween). Read this file\'s header before touching its scope.')
    process.exit(1)
  }
  console.log('✓ no-transcribe-in-splits: no recogniser in any audio split/cut/seam/align file')
}
