/**
 * Export artefacts are workstation-local; their status is shared.
 *
 * A course export writes its pending manifest to THIS machine's `temp/course_export_states/`
 * and records `manifest_generated: true` in the SHARED `course_export_states` table, along with
 * the generating machine's hostname and absolute path. Every later step — redownload, verify,
 * diff, publish — then looks for that file on ITS OWN disk. On any other machine the row still
 * reads "generated" while the file is simply not there, and `temp/` is not durable even on the
 * same box.
 *
 * The rule this module exists to enforce: an export artefact that is not on THIS disk is a
 * named, specific failure that says which machine made it — never a bare 404, never a silent
 * empty result. Reporting absence is all it does: it never creates, moves or deletes an artefact.
 */

const path = require('path')
const os = require('os')

const EXPORT_ARTEFACT_ABSENT = 'EXPORT_ARTEFACT_ABSENT'

class ExportArtefactAbsentError extends Error {
  constructor(message, details) {
    super(message)
    this.name = 'ExportArtefactAbsentError'
    this.code = EXPORT_ARTEFACT_ABSENT
    Object.assign(this, details)
  }
}

const DEFAULT_BASE_DIR = path.join(__dirname, '../../temp/course_export_states')

function pendingManifestPath(courseCode, baseDir = DEFAULT_BASE_DIR) {
  return path.join(baseDir, `${courseCode}_pending_manifest.json`)
}

function extractedDurationsPath(courseCode, baseDir = DEFAULT_BASE_DIR) {
  return path.join(baseDir, `${courseCode}_extracted_durations.json`)
}

/**
 * The one place the error wording lives, so every handler tells the same story.
 * `generatedOnMachine` null means the row predates hostname recording — say so rather than
 * inventing a machine (never infer attribution for a pre-existing row).
 */
function describeAbsence({ courseCode, artefact, localPath, recordedPath, generatedOnMachine, thisMachine, manifestGenerated }) {
  const where = `Expected on this machine (${thisMachine}) at ${localPath}`

  if (!manifestGenerated) {
    return `No ${artefact} for ${courseCode}: nothing has been generated. Run Step 1 (Generate manifest) here. ${where}.`
  }

  if (generatedOnMachine && generatedOnMachine !== thisMachine) {
    return `The ${artefact} for ${courseCode} was generated on a DIFFERENT machine — ${generatedOnMachine} — ` +
      `and the export state points at ${recordedPath || 'an unrecorded path'} on that machine. ` +
      `The database says the export succeeded; the file is not on this box. ${where}. ` +
      `Re-run Step 1 (Generate manifest) here, or continue the export on ${generatedOnMachine}.`
  }

  if (generatedOnMachine) {
    return `The ${artefact} for ${courseCode} was generated on THIS machine (${thisMachine}) but the file is gone — ` +
      `temp/ is not durable and does not survive a clean-up or a redeploy. ` +
      `The database still says the export succeeded. ${where}. Re-run Step 1 (Generate manifest).`
  }

  return `The ${artefact} for ${courseCode} is recorded as generated, but the export state records no generating machine ` +
    `(the row predates hostname recording), and the file is not on this box. ${where}. Re-run Step 1 (Generate manifest).`
}

/**
 * Resolve the pending manifest for a course, or throw an ExportArtefactAbsentError naming the
 * machine that made it. Deps are injected so the rule is testable without a DB or a disk.
 */
async function requirePendingManifest(courseCode, deps = {}) {
  const {
    supabase = null,
    fs = require('fs-extra'),
    baseDir = DEFAULT_BASE_DIR,
    hostname = os.hostname(),
    artefact = 'pending manifest'
  } = deps

  const localPath = pendingManifestPath(courseCode, baseDir)
  const state = await readExportState(courseCode, supabase)

  if (!fs.existsSync(localPath)) {
    throw new ExportArtefactAbsentError(
      describeAbsence({
        courseCode,
        artefact,
        localPath,
        recordedPath: state.pending_manifest_path,
        generatedOnMachine: state.generated_on_machine,
        thisMachine: hostname,
        manifestGenerated: state.manifest_generated === true
      }),
      {
        courseCode,
        artefact,
        expectedPath: localPath,
        recordedPath: state.pending_manifest_path || null,
        generatedOnMachine: state.generated_on_machine || null,
        thisMachine: hostname,
        machineMismatch: Boolean(state.generated_on_machine && state.generated_on_machine !== hostname)
      }
    )
  }

  return { path: localPath, manifest: await fs.readJson(localPath), state }
}

async function readExportState(courseCode, supabase) {
  if (!supabase) return {}
  try {
    const { data } = await supabase
      .from('course_export_states')
      .select('manifest_generated, pending_manifest_path, generated_on_machine')
      .eq('course_code', courseCode)
      .single()
    return data || {}
  } catch {
    return {}
  }
}

/**
 * For the state endpoint: does the shared status agree with this machine's disk?
 * A `manifestGenerated: true` that this box cannot honour is reported as such, not implied.
 */
function localArtefactStatus(state = {}, deps = {}) {
  const {
    fs = require('fs-extra'),
    baseDir = DEFAULT_BASE_DIR,
    hostname = os.hostname()
  } = deps

  const courseCode = state.course_code
  const localPath = courseCode ? pendingManifestPath(courseCode, baseDir) : null
  const present = Boolean(localPath && fs.existsSync(localPath))
  const generatedOnMachine = state.generated_on_machine || null
  const claimsGenerated = state.manifest_generated === true

  return {
    thisMachine: hostname,
    generatedOnMachine,
    pendingManifestPathHere: localPath,
    pendingManifestPresentHere: present,
    machineMismatch: Boolean(generatedOnMachine && generatedOnMachine !== hostname),
    artefactAbsentHere: claimsGenerated && !present,
    absenceReason: claimsGenerated && !present
      ? describeAbsence({
        courseCode,
        artefact: 'pending manifest',
        localPath,
        recordedPath: state.pending_manifest_path,
        generatedOnMachine,
        thisMachine: hostname,
        manifestGenerated: true
      })
      : null
  }
}

/** Uniform HTTP shape for the loud failure. 409: the shared state and this disk disagree. */
function respondArtefactAbsent(res, error) {
  return res.status(409).json({
    error: error.message,
    code: error.code,
    courseCode: error.courseCode,
    generatedOnMachine: error.generatedOnMachine,
    thisMachine: error.thisMachine,
    expectedPath: error.expectedPath,
    recordedPath: error.recordedPath,
    machineMismatch: error.machineMismatch
  })
}

module.exports = {
  EXPORT_ARTEFACT_ABSENT,
  ExportArtefactAbsentError,
  DEFAULT_BASE_DIR,
  pendingManifestPath,
  extractedDurationsPath,
  describeAbsence,
  requirePendingManifest,
  localArtefactStatus,
  respondArtefactAbsent
}
