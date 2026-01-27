/**
 * publish-manifest-service.cjs
 *
 * Service for publishing legacy course manifests to course-configs repo and apidev.
 * Extracted from tools/sync/publish-to-course-configs.cjs for API usage.
 *
 * @version 1.0.0 - Jan 2026
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')
const createLogger = require('./shared/logger.cjs')

const logger = createLogger('PublishManifest')

// Paths - configurable via environment
const COURSE_CONFIGS_REPO = process.env.COURSE_CONFIGS_REPO || path.join(os.homedir(), 'Documents', 'GitHub', 'course-configs')
const COURSE_CONFIGS_COURSES_DIR = path.join(COURSE_CONFIGS_REPO, 'Courses')

// Canonical key order for JSON formatting (ensures clean diffs)
const KEY_ORDER = {
  root: ['id', 'known', 'target', 'version', 'status', 'introduction', 'slices'],
  introduction: ['id', 'cadence', 'role', 'duration'],
  slice: ['id', 'version', 'seeds', 'pooledEncouragements', 'orderedEncouragements', 'samples'],
  seed: ['id', 'seed_sentence', 'node', 'introduction_items'],
  seed_sentence: ['canonical'],
  node: ['id', 'known', 'target'],
  language_obj: ['text', 'tokens', 'lemmas'],
  introduction_item: ['id', 'node', 'nodes', 'presentation'],
  encouragement: ['id', 'text']
}

/**
 * Simple tokenizer - split on whitespace
 */
function tokenize(text) {
  if (!text) return []
  return text.split(/\s+/).filter(t => t.length > 0)
}

/**
 * Populate tokens and lemmas for a language object (known/target)
 */
function populateLanguageObj(langObj) {
  if (!langObj || !langObj.text) return
  langObj.tokens = tokenize(langObj.text)
  langObj.lemmas = tokenize(langObj.text) // Same as tokens for now
}

/**
 * Populate tokens and lemmas for all nodes in a manifest
 * @param {Object} manifest - The manifest to process
 * @returns {number} Number of nodes populated
 */
function populateTokensAndLemmas(manifest) {
  let nodesPopulated = 0

  for (const slice of manifest.slices || []) {
    for (const seed of slice.seeds || []) {
      // Seed node
      if (seed.node) {
        populateLanguageObj(seed.node.known)
        populateLanguageObj(seed.node.target)
        nodesPopulated++
      }

      // Introduction items
      for (const introItem of seed.introduction_items || []) {
        // IntroItem node
        if (introItem.node) {
          populateLanguageObj(introItem.node.known)
          populateLanguageObj(introItem.node.target)
          nodesPopulated++
        }

        // Nodes array within introItem
        for (const node of introItem.nodes || []) {
          populateLanguageObj(node.known)
          populateLanguageObj(node.target)
          nodesPopulated++
        }
      }
    }
  }

  return nodesPopulated
}

/**
 * Order object keys according to canonical order
 */
function orderKeys(obj, orderType) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }

  const order = KEY_ORDER[orderType] || Object.keys(obj).sort()
  const ordered = {}

  // First add keys in specified order
  for (const key of order) {
    if (key in obj) {
      ordered[key] = obj[key]
    }
  }

  // Then add any remaining keys (sorted alphabetically)
  for (const key of Object.keys(obj).sort()) {
    if (!(key in ordered)) {
      ordered[key] = obj[key]
    }
  }

  return ordered
}

/**
 * Canonicalize a node object
 */
function canonicalizeNode(node) {
  const orderedNode = orderKeys(node, 'node')
  if (orderedNode.known) {
    orderedNode.known = orderKeys(orderedNode.known, 'language_obj')
  }
  if (orderedNode.target) {
    orderedNode.target = orderKeys(orderedNode.target, 'language_obj')
  }
  return orderedNode
}

/**
 * Recursively canonicalize JSON structure
 * @param {Object} manifest - The manifest to canonicalize
 * @returns {Object} Canonicalized manifest
 */
function canonicalizeManifest(manifest) {
  // Order root keys
  const result = orderKeys(manifest, 'root')

  // Order introduction
  if (result.introduction) {
    result.introduction = orderKeys(result.introduction, 'introduction')
  }

  // Order slices
  if (result.slices && Array.isArray(result.slices)) {
    result.slices = result.slices.map(slice => {
      const orderedSlice = orderKeys(slice, 'slice')

      // Order seeds
      if (orderedSlice.seeds && Array.isArray(orderedSlice.seeds)) {
        orderedSlice.seeds = orderedSlice.seeds.map(seed => {
          const orderedSeed = orderKeys(seed, 'seed')

          // Order seed_sentence
          if (orderedSeed.seed_sentence) {
            orderedSeed.seed_sentence = orderKeys(orderedSeed.seed_sentence, 'seed_sentence')
          }

          // Order node
          if (orderedSeed.node) {
            orderedSeed.node = canonicalizeNode(orderedSeed.node)
          }

          // Order introduction_items
          if (orderedSeed.introduction_items && Array.isArray(orderedSeed.introduction_items)) {
            orderedSeed.introduction_items = orderedSeed.introduction_items.map(item => {
              const orderedItem = orderKeys(item, 'introduction_item')
              if (orderedItem.node) {
                orderedItem.node = canonicalizeNode(orderedItem.node)
              }
              if (orderedItem.nodes && Array.isArray(orderedItem.nodes)) {
                orderedItem.nodes = orderedItem.nodes.map(n => canonicalizeNode(n))
              }
              return orderedItem
            })
          }

          return orderedSeed
        })
      }

      // Order encouragements
      if (orderedSlice.pooledEncouragements && Array.isArray(orderedSlice.pooledEncouragements)) {
        orderedSlice.pooledEncouragements = orderedSlice.pooledEncouragements.map(e => orderKeys(e, 'encouragement'))
      }
      if (orderedSlice.orderedEncouragements && Array.isArray(orderedSlice.orderedEncouragements)) {
        orderedSlice.orderedEncouragements = orderedSlice.orderedEncouragements.map(e => orderKeys(e, 'encouragement'))
      }

      return orderedSlice
    })
  }

  return result
}

/**
 * Read existing version from course-configs repo
 * @param {string} courseConfigsId - Course ID in course-configs format (e.g., 'en-it')
 * @returns {string} Existing version or '1.0.0' if not found
 */
function readExistingVersion(courseConfigsId) {
  const filePath = path.join(COURSE_CONFIGS_COURSES_DIR, `${courseConfigsId}.json`)

  if (!fs.existsSync(filePath)) {
    logger.info(`No existing file found at ${filePath}, will use version 1.0.0 as base`)
    return '1.0.0'
  }

  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return existing.version || '1.0.0'
  } catch (error) {
    logger.warn(`Warning: Could not read existing version: ${error.message}`)
    return '1.0.0'
  }
}

/**
 * Bump major version
 * @param {string} currentVersion - Current version string
 * @returns {string} Next major version
 */
function bumpMajorVersion(currentVersion) {
  const parts = currentVersion.split('.')
  const major = parseInt(parts[0], 10) || 0
  return `${major + 1}.0.0`
}

/**
 * Suggest next version based on existing version
 * @param {string} courseConfigsId - Course ID in course-configs format
 * @returns {Object} { existingVersion, suggestedVersion }
 */
function suggestVersion(courseConfigsId) {
  const existingVersion = readExistingVersion(courseConfigsId)
  const suggestedVersion = bumpMajorVersion(existingVersion)
  return { existingVersion, suggestedVersion }
}

/**
 * Check if course-configs repo exists and is accessible
 * @returns {Object} { exists, path, error }
 */
function checkCourseConfigsRepo() {
  if (!fs.existsSync(COURSE_CONFIGS_REPO)) {
    return {
      exists: false,
      path: COURSE_CONFIGS_REPO,
      error: `course-configs repo not found at ${COURSE_CONFIGS_REPO}. Clone it first: git clone git@github.com:saysomethingin/course-configs.git`
    }
  }

  if (!fs.existsSync(COURSE_CONFIGS_COURSES_DIR)) {
    return {
      exists: false,
      path: COURSE_CONFIGS_COURSES_DIR,
      error: `Courses directory not found at ${COURSE_CONFIGS_COURSES_DIR}`
    }
  }

  return { exists: true, path: COURSE_CONFIGS_REPO, error: null }
}

/**
 * Write manifest to course-configs repo
 * @param {Object} manifest - The manifest to write
 * @param {string} courseConfigsId - Course ID (e.g., 'en-it')
 * @returns {Object} { success, filePath, fileSize }
 */
function writeToRepo(manifest, courseConfigsId) {
  const filePath = path.join(COURSE_CONFIGS_COURSES_DIR, `${courseConfigsId}.json`)
  const jsonContent = JSON.stringify(manifest, null, 2)

  fs.writeFileSync(filePath, jsonContent)

  const fileSize = (jsonContent.length / 1024 / 1024).toFixed(2)
  logger.info(`Written to: ${filePath} (${fileSize} MB)`)

  return {
    success: true,
    filePath,
    fileSize: `${fileSize} MB`
  }
}

/**
 * Commit changes to author branch
 * @param {string} courseConfigsId - Course ID
 * @param {string} version - Version string
 * @returns {Object} { success, message, error }
 */
function commitToGit(courseConfigsId, version) {
  const filePath = `Courses/${courseConfigsId}.json`
  const commitMessage = `Update ${courseConfigsId} to v${version}`

  try {
    // Ensure we're on author branch
    execSync('git checkout author', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })

    // Stage the file
    execSync(`git add "${filePath}"`, { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })

    // Commit
    execSync(`git commit -m "${commitMessage}"`, { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })

    logger.info(`Committed: ${commitMessage}`)

    return {
      success: true,
      message: commitMessage,
      note: 'Changes committed locally. Push manually when ready.'
    }
  } catch (error) {
    logger.error(`Failed to commit: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Generate dated filename for SCP upload
 * Format: en-it_20260120.json, en-it_20260120_2.json, etc.
 * @param {string} courseConfigsId - Course ID
 * @returns {string} SCP filename
 */
function generateScpFilename(courseConfigsId) {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const baseFilename = `${courseConfigsId}_${dateStr}`

  // Check existing files on apidev server
  let existingFiles = []
  try {
    const result = execSync(`ssh ssi@apidev "ls kai/${baseFilename}*.json 2>/dev/null || true"`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: 'pipe'
    })
    existingFiles = result.trim().split('\n')
      .filter(f => f.length > 0)
      .map(f => path.basename(f))
  } catch (error) {
    // If SSH fails, just use base filename
    logger.info('Note: Could not check existing files on apidev, using base filename')
  }

  if (existingFiles.length === 0) {
    return `${baseFilename}.json`
  }

  // Find the next available suffix
  let suffix = 2
  while (existingFiles.includes(`${baseFilename}_${suffix}.json`)) {
    suffix++
  }

  // If base exists but no _2, use _2
  if (existingFiles.includes(`${baseFilename}.json`)) {
    return `${baseFilename}_${suffix}.json`
  }

  return `${baseFilename}.json`
}

/**
 * Upload manifest to apidev server via SCP
 * @param {Object} manifest - The manifest to upload
 * @param {string} courseConfigsId - Course ID
 * @returns {Object} { success, filename, remotePath, error }
 */
function uploadToApidev(manifest, courseConfigsId) {
  const scpFilename = generateScpFilename(courseConfigsId)
  const remotePath = `ssi@apidev:kai/${scpFilename}`

  logger.info(`SCP upload: ${scpFilename} → ${remotePath}`)

  // Write to temp file first
  const tempFile = path.join(os.tmpdir(), scpFilename)
  const jsonContent = JSON.stringify(manifest, null, 2)
  fs.writeFileSync(tempFile, jsonContent)

  try {
    execSync(`scp "${tempFile}" "${remotePath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    })
    logger.info(`✓ Uploaded to ${remotePath}`)

    // Clean up temp file
    fs.unlinkSync(tempFile)

    return {
      success: true,
      filename: scpFilename,
      remotePath
    }
  } catch (error) {
    logger.error(`✗ SCP failed: ${error.message}`)
    // Clean up temp file
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)

    return {
      success: false,
      error: `SCP failed: ${error.message}. Make sure VPN is connected and SSH key is configured.`
    }
  }
}

/**
 * Full publish workflow
 * @param {Object} manifest - The manifest to publish
 * @param {Object} options - { version, status, commitToCourseConfigs, scpToApidev }
 * @returns {Object} Result with all operation outcomes
 */
async function publishManifest(manifest, options = {}) {
  const {
    version = null,
    status = 'beta',
    commitToCourseConfigs = true,
    scpToApidev = true
  } = options

  // Validate manifest has ID
  const courseConfigsId = manifest.id
  if (!courseConfigsId) {
    return { success: false, error: 'Manifest is missing "id" field' }
  }

  // Check course-configs repo
  const repoCheck = checkCourseConfigsRepo()
  if (!repoCheck.exists) {
    return { success: false, error: repoCheck.error }
  }

  // Determine version
  const { existingVersion, suggestedVersion } = suggestVersion(courseConfigsId)
  const newVersion = version || suggestedVersion

  logger.info(`Publishing ${courseConfigsId}: v${existingVersion} → v${newVersion}`)

  // Update manifest metadata
  manifest.version = newVersion
  manifest.status = status

  // Populate tokens and lemmas
  const nodesPopulated = populateTokensAndLemmas(manifest)
  logger.info(`Populated tokens/lemmas for ${nodesPopulated} nodes`)

  // Canonicalize
  const canonicalized = canonicalizeManifest(manifest)

  // Results object
  const result = {
    success: true,
    courseConfigsId,
    version: newVersion,
    status,
    nodesPopulated,
    courseConfigs: null,
    apidev: null
  }

  // Write to course-configs repo
  const writeResult = writeToRepo(canonicalized, courseConfigsId)
  result.courseConfigs = {
    written: true,
    ...writeResult
  }

  // Commit if requested
  if (commitToCourseConfigs) {
    const commitResult = commitToGit(courseConfigsId, newVersion)
    result.courseConfigs.committed = commitResult.success
    result.courseConfigs.commitMessage = commitResult.message || commitResult.error
  }

  // SCP upload if requested
  if (scpToApidev) {
    const scpResult = uploadToApidev(canonicalized, courseConfigsId)
    result.apidev = scpResult
    if (!scpResult.success) {
      result.success = false
      result.error = scpResult.error
    }
  }

  return result
}

module.exports = {
  // Core functions
  populateTokensAndLemmas,
  canonicalizeManifest,

  // Version management
  readExistingVersion,
  bumpMajorVersion,
  suggestVersion,

  // Repo operations
  checkCourseConfigsRepo,
  writeToRepo,
  commitToGit,

  // Apidev operations
  generateScpFilename,
  uploadToApidev,

  // Full workflow
  publishManifest
}
