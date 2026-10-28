/**
 * Export Step 2: did the audio length/format check actually RUN? (job #994)
 *
 * Kai's ruling, 2026-10-28: "We shouldn't be skipping the sox check - if it's
 * not run, we can't allow a course to be exported to the legacy app."
 *
 * The specimen (job #550, 27 Oct): sox was not installed on watson-1. Every
 * clip's sox measure threw, each throw was counted as a duration "error", and
 * Step 2 decided s3_verified from missing + formatFailed alone. The format check
 * runs on the same download AFTER sox, so it never ran either. Twelve courses
 * showed as verified on file presence alone.
 *
 * So the rule is fail closed: a check that errored, was skipped, or covered
 * fewer files than it should have is a FAIL, never a pass. `audioCheckGap`
 * names the reason (null only when the check ran on every file it should
 * have); `stageVerdict` is the one place Step 2's verdict is decided — the
 * route, the CLI verifier and the publish/stage-deploy gates all call it.
 */

const { execFile } = require('child_process')
const { resolveSoxBinary } = require('./sox-binary.cjs')

/** The plain message a refused publish/export carries. */
function audioCheckMessage (reason) {
  return `audio length/format check could not run: ${reason}`
}

/**
 * Pure. Given a Step 2 result (verifyStageAudio's output, or the stored
 * course_export_states.s3_verification), return why the length/format check
 * did not fully run, or null if it did.
 */
function audioCheckGap (v) {
  if (!v) return 'Step 2 (Verify S3 Audio) has not been run on this manifest'
  if (v.durationCheckFailed) return v.durationCheckError || 'the duration check did not run'
  const checked = v.durationChecked || 0
  const errors = v.durationErrors || 0
  if (checked === 0) return 'no audio files were measured'
  if (errors > 0) {
    const first = (v.durationErrorDetails || [])[0]
    const why = first && first.error ? ` (first: ${first.uuid}: ${first.error})` : ''
    return `${errors} of ${checked} files could not be measured${why}`
  }
  // The format check piggybacks on each measured download; every measured file must have one.
  const formatChecked = v.formatChecked || 0
  if (formatChecked < checked - errors) {
    return `MP3 format checked on only ${formatChecked} of ${checked - errors} measured files`
  }
  return null
}

/**
 * Pure. Step 2's verdict. Verified only when nothing is missing, no file is
 * badly encoded, the check ran in full, and (after an auto-fix) nothing still
 * mismatches. `stillMismatched` is the post-fix re-check count, when there was one.
 */
function stageVerdict (results, { stillMismatched = 0 } = {}) {
  const gap = audioCheckGap(results)
  const reasons = []
  if (gap) reasons.push(audioCheckMessage(gap))
  if ((results?.missing || 0) > 0) reasons.push(`${results.missing} files missing from stage`)
  if ((results?.formatFailed || 0) > 0) reasons.push(`${results.formatFailed} files badly encoded`)
  if (stillMismatched > 0) reasons.push(`${stillMismatched} durations still mismatched after auto-fix`)
  return { verified: reasons.length === 0, audioCheckGap: gap, reasons }
}

/**
 * The legacy-export gate (publish-manifest, stage-deploy). `readVerification` returns the stored
 * course_export_states.s3_verification (or null). Returns a refusal body when the length/format
 * check did not run in full, or null to let the export through. The Step 3 override in the dialog
 * covers other Step 2 failures; it cannot cover this one. A state that cannot be read is a refusal too.
 */
async function legacyExportAudioGate (readVerification) {
  let verification
  try {
    verification = await readVerification()
  } catch (err) {
    return { error: audioCheckMessage(`could not read the Step 2 result (${err.message})`), audioCheckCouldNotRun: true }
  }
  const gap = audioCheckGap(verification)
  if (!gap) return null
  return {
    error: `${audioCheckMessage(gap)}. Re-run Step 2 (Verify S3 Audio) with the check working.`,
    audioCheckCouldNotRun: true,
    reason: gap
  }
}

function run (bin, args) {
  return new Promise((resolve) => {
    execFile(bin, args, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({ err, out: `${stdout || ''}${stderr || ''}` })
    })
  })
}

/**
 * Are the tools the check needs present? sox (with MP3 read support — it
 * measures the durations) and ffprobe (it reads the MP3 encoder tag for the
 * format check). Returns { ok, reason }. `exec` is injectable for tests.
 */
async function audioToolsPreflight ({ exec = run, soxBinary = resolveSoxBinary() } = {}) {
  const sox = await exec(soxBinary, ['-h'])
  if (sox.err && sox.err.code === 'ENOENT') return { ok: false, reason: `sox is not installed (looked for "${soxBinary}")` }
  // `sox -h` exits 0 and lists "AUDIO FILE FORMATS: ... mp3 ..." when libsox-fmt-mp3 (or a build with mad/lame) is present.
  const formats = (sox.out.match(/AUDIO FILE FORMATS:([^\n]*)/) || [])[1]
  if (!formats) return { ok: false, reason: `sox ("${soxBinary}") did not run: ${sox.err ? sox.err.message : 'no format list in sox -h'}` }
  if (!/(^|\s)mp3(\s|$)/.test(formats)) return { ok: false, reason: 'sox has no MP3 support (install libsox-fmt-mp3)' }
  const ff = await exec('ffprobe', ['-version'])
  if (ff.err) return { ok: false, reason: `ffprobe is not available: ${ff.err.code === 'ENOENT' ? 'not installed' : ff.err.message}` }
  return { ok: true, reason: null }
}

module.exports = { audioCheckGap, stageVerdict, audioCheckMessage, audioToolsPreflight, legacyExportAudioGate }
