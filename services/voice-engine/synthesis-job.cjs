/**
 * voice-engine/synthesis-job.cjs — JOB ORCHESTRATOR.
 *
 * Per-course-per-voice synthesis job: turn a course's uploaded human
 * recordings into the full phrase audio set for one voice slot.
 *
 *   load → align+extract segments → register whole takes → plan →
 *   (dry-run stops here) → splice → register → link → report
 *
 * Job-state idiom follows phase8's startWork/currentWork pattern
 * (in-memory registry, progress counters, cancellation), but keyed
 * per (courseCode, voiceId) so two voices of one course can run
 * back-to-back without a global lock.
 *
 * RESUME falls out of idempotency, not job-state persistence:
 * - segments already in the manifest are skipped (segment-store upsert),
 * - phrases already in course_audio for (course, role, voice) are skipped,
 * - the course_audio upsert hits the live 5-column unique index.
 * Re-POSTing /synthesize after a crash continues where it left off.
 *
 * RE-RECORDS SUPERSEDE (provenance contract: latest take per (phrase,
 * cadence) wins): segments cut from out-dated takes are pruned and re-cut,
 * and a course_audio row pointing at an older take's s3_key (or a splice)
 * is re-upserted to the latest whole take.
 *
 * NO TTS calls, ever. NO DDL. Course-agnostic.
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')

const { buildUniverse, parseChunks, normalizeForMatching } = require('./chunking.cjs')
const { alignTakePair, cutSegments } = require('./align.cjs')
const segmentStore = require('./segment-store.cjs')
const { buildSplicePlan, spliceSegmentsToFile } = require('./splicer.cjs')
const { normalizeForAudio } = require('../shared/text-normalize.cjs')

// ---------------------------------------------------------------------------
// Job registry (in-memory, phase8 currentWork idiom, keyed per course+voice)
// ---------------------------------------------------------------------------

const jobs = new Map() // `${courseCode}::${voiceId}` → job

function jobKey(courseCode, voiceId) {
  return `${courseCode}::${voiceId}`
}

function newJob(courseCode, voiceId, role, options) {
  return {
    courseCode,
    voiceId,
    role,
    options,
    state: 'running', // running | completed | failed | cancelled
    phase: 'load',    // load | align | register-takes | plan | splice | link | done
    cancelled: false,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    progress: { current: 0, total: 0, success: 0, failed: 0 },
    lastItem: null,
    errors: [],
    report: null,
    error: null,
  }
}

function getJob(courseCode, voiceId) {
  return jobs.get(jobKey(courseCode, voiceId)) || null
}

function listJobs(courseCode = null) {
  const all = [...jobs.values()]
  return courseCode ? all.filter(j => j.courseCode === courseCode) : all
}

function cancelJob(courseCode, voiceId) {
  const job = getJob(courseCode, voiceId)
  if (!job || job.state !== 'running') return false
  job.cancelled = true
  return true
}

function pushError(job, item, message) {
  job.errors.push({ item: String(item).slice(0, 60), error: message })
  if (job.errors.length > 20) job.errors.shift()
}

// ---------------------------------------------------------------------------
// Voice-slot resolution (keystone: voice slots are the unit of assignment)
// ---------------------------------------------------------------------------

const SLOT_ROLES = ['target1', 'target2', 'known', 'presentation']

/**
 * Resolve { role, voiceId } from voice_config + the request.
 * Accepts either (or both, validated for consistency).
 */
function resolveVoiceSlot(voiceConfig, { role = null, voiceId = null }) {
  const voices = voiceConfig?.voices || {}
  if (role && !SLOT_ROLES.includes(role)) {
    throw new Error(`invalid role "${role}" — expected one of ${SLOT_ROLES.join(', ')}`)
  }
  if (role && voiceId) {
    const configured = voices[role]?.voiceId
    if (configured && configured !== voiceId) {
      throw new Error(`voice slot mismatch: voice_config.voices.${role}.voiceId is "${configured}", request said "${voiceId}"`)
    }
    return { role, voiceId, provider: voices[role]?.provider ?? null }
  }
  if (role) {
    const slot = voices[role]
    if (!slot?.voiceId) throw new Error(`voice_config has no voiceId for slot "${role}" — assign the helper to the slot first (roster)`)
    return { role, voiceId: slot.voiceId, provider: slot.provider ?? null }
  }
  if (voiceId) {
    for (const r of SLOT_ROLES) {
      if (voices[r]?.voiceId === voiceId) return { role: r, voiceId, provider: voices[r]?.provider ?? null }
    }
    throw new Error(`voiceId "${voiceId}" is not assigned to any voice slot in voice_config`)
  }
  throw new Error('role or voiceId required')
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Start a synthesis job. Returns { started, job } immediately; the pipeline
 * runs async. deps:
 *   { supabase, storage, audioProcessor, db, provenance, logger, tmpRoot }
 * (db = ./db.cjs shaped; provenance = ./provenance-adapter.cjs shaped —
 *  both injectable for tests.)
 */
function startSynthesisJob(deps, { courseCode, voiceId = null, role = null, dryRun = false, includeSeeds = true }) {
  const db = deps.db
  const logger = deps.logger || console

  // One running job per (course, voice); resolve the slot inside the run
  // (needs the course row), so register under a provisional key first if
  // only role was given — we re-key once resolved.
  const provisionalKey = jobKey(courseCode, voiceId || role || '?')
  const existing = jobs.get(provisionalKey)
  if (existing?.state === 'running') {
    return { started: false, conflict: true, job: existing }
  }

  const job = newJob(courseCode, voiceId || '?', role, { dryRun, includeSeeds })
  jobs.set(provisionalKey, job)

  const run = (async () => {
    const tmpBase = fs.mkdtempSync(path.join(deps.tmpRoot || os.tmpdir(), 've-job-'))
    try {
      // ---- PHASE: load --------------------------------------------------
      job.phase = 'load'
      const course = await db.loadCourse(deps.supabase, courseCode)
      const slot = resolveVoiceSlot(course.voice_config, { role, voiceId })
      job.role = slot.role
      job.voiceId = slot.voiceId
      // Re-key the registry under the resolved identity.
      if (jobKey(courseCode, job.voiceId) !== provisionalKey) {
        const resolvedKey = jobKey(courseCode, job.voiceId)
        const clash = jobs.get(resolvedKey)
        if (clash?.state === 'running' && clash !== job) {
          throw new Error(`a job is already running for ${courseCode}/${job.voiceId}`)
        }
        jobs.delete(provisionalKey)
        jobs.set(resolvedKey, job)
      }

      const language = slot.role === 'known' ? course.known_lang : course.target_lang
      const textCol = slot.role === 'known' ? 'known_text' : 'target_text'

      const [legos, phrases, seeds] = await Promise.all([
        db.loadNewLegos(deps.supabase, courseCode),
        db.loadPhrases(deps.supabase, courseCode),
        includeSeeds ? db.loadSeeds(deps.supabase, courseCode) : Promise.resolve([]),
      ])
      const universe = buildUniverse(legos)

      const { rows: takes, error: provenanceError } = await deps.provenance.fetchProvenanceRows(deps.supabase, {
        courseCode, voiceId: job.voiceId, role: slot.role,
      })
      if (provenanceError) {
        logger.warn?.(`[voice-engine] provenance fetch: ${provenanceError} (0 takes — integration seam, see provenance-adapter.cjs)`)
      }
      const takeGroups = deps.provenance.groupTakesByPhrase(takes)

      // Re-records supersede (provenance-adapter contract: latest take per
      // (phrase, cadence) wins). Any take id that is NOT a current winner is
      // superseded — its segments get pruned and re-cut, its course_audio
      // registration gets re-pointed.
      const winnerTakeIds = new Set()
      for (const g of takeGroups.values()) {
        if (g.natural?.id != null) winnerTakeIds.add(g.natural.id)
        if (g.slow?.id != null) winnerTakeIds.add(g.slow.id)
      }
      const supersededTakeIds = new Set()
      for (const t of takes) {
        if (t?.id == null) continue
        if (t.method && t.method !== 'take') continue
        if (!winnerTakeIds.has(t.id)) supersededTakeIds.add(t.id)
      }

      const manifest = await segmentStore.loadManifest(deps.storage, courseCode, job.voiceId)

      // ---- PHASE: align + extract segments ------------------------------
      job.phase = 'align'
      const idx = segmentStore.segmentIndex(manifest)
      const alignFailures = []
      let segmentsExtracted = 0

      const groupsToAlign = [...takeGroups.values()].filter(g => g.chunksString && (g.slow || g.natural))
      job.progress = { current: 0, total: groupsToAlign.length, success: 0, failed: 0 }

      for (const group of groupsToAlign) {
        if (job.cancelled) break
        job.progress.current++
        job.lastItem = group.phraseText?.slice(0, 40)
        try {
          const expectedChunks = parseChunks(group.chunksString)
          // Supersede: drop segments cut from out-dated takes of these chunks
          // BEFORE the resume check, so a re-record forces a re-cut instead
          // of the first recording winning forever.
          const pruned = segmentStore.pruneSupersededSegments(
            manifest,
            expectedChunks.map(c => normalizeForMatching(c)),
            supersededTakeIds,
          )
          for (const seg of pruned) idx.delete(`${seg.textKey}|${seg.cadence}`)
          // Resume: skip when every chunk already has a segment in ANY cadence.
          const allPresent = expectedChunks.every(c => {
            const k = normalizeForMatching(c)
            return idx.has(`${k}|natural`) || idx.has(`${k}|slow`)
          })
          if (allPresent) { job.progress.success++; continue }

          // Slow take is the alignment authority; without it we cannot chop.
          if (!group.slow) {
            alignFailures.push({ phraseText: group.phraseText, reason: 'no slow take uploaded — cannot align without pause boundaries' })
            segmentStore.recordAlignmentFailure(manifest, { phraseText: group.phraseText, reason: 'no slow take' })
            job.progress.failed++
            continue
          }

          // Download takes to tmp (opaque names).
          const groupDir = fs.mkdtempSync(path.join(tmpBase, 'take-'))
          const slowPath = path.join(groupDir, 'slow.mp3')
          fs.writeFileSync(slowPath, await deps.storage.getObjectBuffer(group.slow.s3Key))
          let naturalPath = null
          if (group.natural) {
            naturalPath = path.join(groupDir, 'natural.mp3')
            fs.writeFileSync(naturalPath, await deps.storage.getObjectBuffer(group.natural.s3Key))
          }

          const aligned = await alignTakePair({ slowPath, naturalPath, expectedChunks })
          if (!aligned.ok) {
            const f = aligned.failure || {}
            alignFailures.push({ phraseText: group.phraseText, reason: f.reason || f.stage, expectedCount: f.expectedCount ?? null, detectedCount: f.detectedCount ?? null })
            segmentStore.recordAlignmentFailure(manifest, { phraseText: group.phraseText, reason: f.reason || f.stage, expectedCount: f.expectedCount ?? null, detectedCount: f.detectedCount ?? null })
            job.progress.failed++
            continue
          }

          // Cut + upload each chunk segment, manifest-keyed by UUID.
          const segDir = path.join(groupDir, 'segments')
          const cuts = await cutSegments(aligned.cutPath, aligned.chunks, segDir, deps.audioProcessor)
          for (const cut of cuts) {
            const entry = segmentStore.makeSegmentEntry({
              courseCode,
              voiceId: job.voiceId,
              text: cut.text,
              cadence: aligned.cadence,
              durationMs: cut.durationMs,
              startMs: cut.startMs,
              endMs: cut.endMs,
              method: cut.method || aligned.naturalMethod || 'slow-gap',
              takeProvenanceId: (aligned.cadence === 'natural' ? group.natural : group.slow)?.id ?? null,
              takeS3Key: (aligned.cadence === 'natural' ? group.natural : group.slow)?.s3Key ?? null,
            })
            const { added, entry: live } = segmentStore.upsertSegmentEntry(manifest, entry)
            if (added) {
              // Dry run is read-only: plan against the in-memory entry, no upload.
              if (!dryRun) {
                await deps.storage.putObject(live.s3Key, fs.readFileSync(cut.filePath), 'audio/mpeg')
              }
              idx.set(`${live.textKey}|${live.cadence}`, live)
              segmentsExtracted++
            }
          }
          job.progress.success++
          if (!dryRun && job.progress.current % 10 === 0) await segmentStore.saveManifest(deps.storage, manifest)
        } catch (err) {
          job.progress.failed++
          pushError(job, group.phraseText, err.message)
        }
      }
      if (!dryRun) await segmentStore.saveManifest(deps.storage, manifest)

      // ---- PHASE: register whole-phrase natural takes --------------------
      // A recorded whole-phrase natural take ALWAYS beats splicing it.
      job.phase = 'register-takes'
      const neededTexts = new Map() // normalizeForAudio → original text
      for (const p of phrases) if (p[textCol]) neededTexts.set(normalizeForAudio(p[textCol]), p[textCol])
      for (const s of seeds) if (s[textCol]) neededTexts.set(normalizeForAudio(s[textCol]), s[textCol])
      for (const l of legos) if (l[textCol]) neededTexts.set(normalizeForAudio(l[textCol]), l[textCol])

      // Map text_normalized → registered s3_key (db.fetchExistingAudioTexts).
      // The s3_key is what makes re-records supersede: a row pointing at an
      // older take (or a splice) gets re-upserted to the latest take.
      let existingTexts = await db.fetchExistingAudioTexts(deps.supabase, { courseCode, role: slot.role, voiceId: job.voiceId })
      const wholeTakeTexts = new Set()
      let takesRegistered = 0

      for (const [norm, group] of takeGroups) {
        if (job.cancelled) break
        if (!group.natural) continue
        wholeTakeTexts.add(norm)
        if (!neededTexts.has(norm)) continue
        // Already registered from THIS take → nothing to do (resume).
        // Registered from anything else → the latest take wins (supersede).
        if (existingTexts.get(norm) === group.natural.s3Key) continue
        if (dryRun) { takesRegistered++; continue }
        try {
          let durationMs = group.natural.durationMs
          if (durationMs == null) {
            // Probe the uploaded take only when provenance lacks a duration.
            const tmpTake = path.join(tmpBase, `probe-${crypto.randomUUID()}.mp3`)
            fs.writeFileSync(tmpTake, await deps.storage.getObjectBuffer(group.natural.s3Key))
            const meta = await deps.audioProcessor.getAudioMetadata(tmpTake)
            durationMs = Math.round((meta.duration || 0) * 1000)
            fs.rmSync(tmpTake, { force: true })
          }
          await db.upsertHumanCourseAudio(deps.supabase, {
            courseCode,
            text: neededTexts.get(norm),
            language,
            role: slot.role,
            voiceId: job.voiceId,
            s3Key: group.natural.s3Key,
            durationMs,
          })
          existingTexts.set(norm, group.natural.s3Key)
          takesRegistered++
        } catch (err) {
          pushError(job, group.phraseText, err.message)
        }
      }

      // ---- PHASE: plan ----------------------------------------------------
      job.phase = 'plan'
      const planCandidates = [
        ...phrases.map(p => ({ id: p.id, text: p[textCol] })),
        ...seeds.map(s => ({ id: `seed:${s.seed_number}`, text: s[textCol] })),
      ].filter(c => c.text)

      const plan = buildSplicePlan({
        phrases: planCandidates,
        universe,
        segmentIdx: segmentStore.segmentIndex(manifest),
        wholeTakeTexts,
        existingAudioTexts: existingTexts,
      })

      const report = {
        courseCode,
        role: slot.role,
        voiceId: job.voiceId,
        language,
        dryRun,
        counts: {
          phrases: phrases.length,
          seeds: seeds.length,
          newLegos: legos.length,
          recordedTakes: takeGroups.size,
          segmentsExtracted,
          segmentsTotal: manifest.segments.length,
          alignmentFailures: alignFailures.length,
          takesRegistered,
          planned: plan.stats.planned,
          coveredByTake: plan.stats.coveredByTake,
          alreadyRegistered: plan.stats.alreadyRegistered,
          missingChunkPhrases: plan.stats.missingChunks,
          spliced: 0,
          spliceFailed: 0,
        },
        provenanceError: provenanceError || null,
        alignmentFailures: alignFailures.slice(0, 50),
        gapReport: plan.gapReport.slice(0, 50),
        planSample: plan.items.slice(0, 20).map(i => ({ text: i.text, chunks: i.chunks.map(c => c.text) })),
        linked: null,
      }

      if (dryRun) {
        job.report = report
        job.phase = 'done'
        job.state = job.cancelled ? 'cancelled' : 'completed'
        job.finishedAt = new Date().toISOString()
        return
      }

      // ---- PHASE: splice ---------------------------------------------------
      job.phase = 'splice'
      job.progress = { current: 0, total: plan.items.length, success: 0, failed: 0 }
      const segmentCache = new Map() // segmentId → local path
      const spliceDir = path.join(tmpBase, 'spliced')
      fs.mkdirSync(spliceDir, { recursive: true })

      for (const item of plan.items) {
        if (job.cancelled) break
        job.progress.current++
        job.lastItem = item.text.slice(0, 40)
        try {
          const localFiles = []
          for (const chunk of item.chunks) {
            let localPath = segmentCache.get(chunk.segmentId)
            if (!localPath) {
              localPath = path.join(tmpBase, `seg-${chunk.segmentId}.mp3`)
              fs.writeFileSync(localPath, await deps.storage.getObjectBuffer(chunk.s3Key))
              segmentCache.set(chunk.segmentId, localPath)
            }
            localFiles.push(localPath)
          }

          const audioId = crypto.randomUUID().toUpperCase()
          const s3Key = `mastered/${audioId}.mp3` // live serving + deploy prefix
          const outPath = path.join(spliceDir, `${audioId}.mp3`)
          const { durationMs } = await spliceSegmentsToFile(localFiles, outPath, { audioProcessor: deps.audioProcessor })

          await deps.storage.putObject(s3Key, fs.readFileSync(outPath), 'audio/mpeg')
          const insertedId = await db.upsertHumanCourseAudio(deps.supabase, {
            courseCode,
            text: item.text,
            language,
            role: slot.role,
            voiceId: job.voiceId,
            s3Key,
            durationMs,
          })
          segmentStore.recordSpliced(manifest, { text: item.text, audioId: insertedId, s3Key })
          await deps.provenance.recordSplicedProvenance(deps.supabase, {
            audioId: insertedId, courseCode, voiceId: job.voiceId, role: slot.role, text: item.text, s3Key,
          }, logger)

          fs.rmSync(outPath, { force: true })
          report.counts.spliced++
          job.progress.success++
          if (job.progress.current % 25 === 0) await segmentStore.saveManifest(deps.storage, manifest)
        } catch (err) {
          report.counts.spliceFailed++
          job.progress.failed++
          pushError(job, item.text, err.message)
        }
      }
      await segmentStore.saveManifest(deps.storage, manifest)

      // ---- PHASE: link ------------------------------------------------------
      if (!job.cancelled && (report.counts.spliced > 0 || takesRegistered > 0)) {
        job.phase = 'link'
        report.linked = await db.linkCourseAudio(deps.supabase, courseCode)
      }

      job.report = report
      job.phase = 'done'
      job.state = job.cancelled ? 'cancelled' : 'completed'
      job.finishedAt = new Date().toISOString()
    } catch (err) {
      job.state = 'failed'
      job.error = err.message
      job.finishedAt = new Date().toISOString()
      logger.error?.(`[voice-engine] synthesis job failed for ${courseCode}/${job.voiceId}: ${err.message}`)
    } finally {
      try { fs.rmSync(tmpBase, { recursive: true, force: true }) } catch { /* best-effort */ }
    }
  })()

  job._run = run // awaitable for tests
  return { started: true, job }
}

module.exports = {
  startSynthesisJob,
  getJob,
  listJobs,
  cancelJob,
  resolveVoiceSlot,
  jobKey,
  _jobs: jobs, // exposed for tests
}
