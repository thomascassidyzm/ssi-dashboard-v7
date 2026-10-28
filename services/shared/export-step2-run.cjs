/**
 * Export Step 2 (Verify S3 audio) as ONE function, run by a detached worker process
 * (tools/audio/export-step2-worker.cjs), not inside production-api (job #27).
 *
 * Why: Step 2 takes 30-40 min on a big course and used to run inside the API's HTTP request.
 * Every push to main restarts the API (auto-deploy), killing the run (four ita_for_eng verifies
 * on 2026-10-27), and the dashboard also gave up its request after 20 min. The API unit has
 * KillMode=process, so a detached child survives a restart; the API only starts it and watches
 * its progress file (services/shared/export-step2-state.cjs).
 *
 * The stages are the route's own, unchanged: 1-2 existence + sox duration + MP3 format check,
 * 3 auto-fix of manifest durations (+ course_audio.duration_ms sync), 4 re-verify the fixed ones.
 * The verdict is exportAudioCheck.stageVerdict (job #994: a check that did not run is a FAIL).
 */
const fs = require('fs-extra')
const exportAudioCheck = require('./export-audio-check.cjs')

/**
 * @param {object} p
 * @param {string} p.courseCode
 * @param {string} p.manifestPath  pending manifest file (rewritten with fixed durations)
 * @param {(event:object)=>void} p.onProgress  {phase, checked, total, ...}
 * @param {AbortSignal} [p.signal]
 * @param {object} p.supabase  supabase-js client
 * @param {object} p.s3DeployService
 * @returns {Promise<{cancelled:true}|{results:object, s3Verified:boolean}>}
 */
async function runStep2 ({ courseCode, manifestPath, onProgress, signal, supabase, s3DeployService, log = console }) {
  const pendingManifest = await fs.readJson(manifestPath)
  const uuids = s3DeployService.collectManifestUuids(pendingManifest)
  log.info(`Verifying ${uuids.length} audio files for ${courseCode}`)

  const verifyResults = await s3DeployService.verifyStageAudio(
    uuids,
    pendingManifest,
    (phase, checked, total, ...phaseData) => {
      if (phase === 'existence') onProgress({ phase: 'existence', checked, total })
      else if (phase === 'duration') {
        const [matched, mismatched, errors] = phaseData
        onProgress({ phase: 'duration', checked, total, matched, mismatched, errors })
      }
    },
    { checkDurations: true, durationTolerance: 0, signal }
  )
  if (verifyResults.cancelled) return { cancelled: true }

  const results = { ...verifyResults }
  delete results.extractedDurations // a Map: serialises to {} and is only needed below, via verifyResults
  const stage2Verdict = exportAudioCheck.stageVerdict(results)
  results.audioCheckGap = stage2Verdict.audioCheckGap
  if (results.audioCheckGap) log.error(`[VERIFY-S3] ${courseCode}: ${exportAudioCheck.audioCheckMessage(results.audioCheckGap)}`)

  // Database-first: the stage 1-2 result is stored before any fixing starts.
  const save = (patch) => supabase.from('course_export_states').upsert(
    { course_code: courseCode, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'course_code' })
  const saved = async (patch) => {
    const { error } = await save(patch)
    if (error) throw new Error(`course_export_states write failed: ${error.message}`)
  }

  if (!(results.durationMismatched > 0)) {
    const s3Verified = stage2Verdict.verified
    await saved({ s3_verification: results, s3_verified: s3Verified, s3_verified_at: s3Verified ? new Date().toISOString() : null })
    return { results, s3Verified }
  }

  await saved({ s3_verification: results, s3_verified: false })
  if (signal?.aborted) return { cancelled: true }

  log.info(`[AUTO-FIX] Fixing ${results.durationMismatched} duration mismatches`)
  onProgress({ phase: 'fixing', checked: 0, total: results.durationMismatched })
  const fixResults = await s3DeployService.autoFixDurations(
    uuids,
    pendingManifest,
    (phase, checked, total, fixed, errors) => onProgress({ phase: 'fixing', checked, total, fixed, errors }),
    verifyResults.extractedDurations,
    { courseCode } // also syncs course_audio.duration_ms so a later Step 1 does not re-introduce stale values
  )
  log.info(`[AUTO-FIX] Fixed ${fixResults.fixed} manifest durations, ${fixResults.errors} errors. DB sync: ${fixResults.dbRowsUpdated} updated, ${fixResults.dbAlreadyCorrect} already correct, ${fixResults.dbErrors} errors`)

  await fs.writeJson(manifestPath, fixResults.updatedManifest, { spaces: 2 })
  results.durationsFixed = fixResults.fixed
  results.durationFixErrors = fixResults.errors
  results.dbRowsUpdated = fixResults.dbRowsUpdated
  results.dbAlreadyCorrect = fixResults.dbAlreadyCorrect
  results.dbErrors = fixResults.dbErrors

  // Stage 4: re-check every fixed duration against what was measured on S3.
  onProgress({ phase: 'verifying', checked: 0, total: fixResults.fixed })
  const extracted = verifyResults.extractedDurations || new Map()
  const fixed = fixResults.updatedManifest
  let checked = 0; let matched = 0; let mismatched = 0
  const mismatchDetails = []
  const check = (uuid, manifestDuration) => {
    checked++
    const s3Duration = extracted.get(uuid)
    if (s3Duration !== undefined) {
      const diff = Math.abs(manifestDuration - s3Duration)
      if (diff < 0.001) matched++
      else { mismatched++; mismatchDetails.push({ uuid, manifestDuration, s3Duration, difference: diff }) }
    }
    if (checked % 100 === 0) onProgress({ phase: 'verifying', checked, total: fixResults.fixed, matched, mismatched })
  }
  if (fixed.introduction?.id && fixed.introduction?.duration) check(fixed.introduction.id, fixed.introduction.duration)
  const slice0 = fixed.slices?.[0] || {}
  for (const key of ['orderedEncouragements', 'pooledEncouragements', 'paywallEncouragements']) {
    for (const enc of slice0[key] || []) if (enc.id && enc.duration) check(enc.id, enc.duration)
  }
  for (const audioArray of Object.values(slice0.samples || {})) {
    for (const audio of audioArray) if (audio.id && audio.duration) check(audio.id, audio.duration)
  }
  onProgress({ phase: 'verifying', checked, total: checked, matched, mismatched })
  log.info(`[VERIFY-FIX] ${matched} matched, ${mismatched} mismatched`)
  results.verifyFixed = { checked, matched, mismatched, mismatchDetails }

  const s3Verified = exportAudioCheck.stageVerdict(results, { stillMismatched: mismatched }).verified
  await saved({ s3_verification: results, s3_verified: s3Verified, s3_verified_at: s3Verified ? new Date().toISOString() : null })
  return { results, s3Verified }
}

module.exports = { runStep2 }
