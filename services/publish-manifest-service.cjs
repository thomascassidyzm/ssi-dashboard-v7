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
 * Trailing period characters to strip.
 * Matches normalizeForDedup() in generate-legacy-manifest.cjs:
 *   . (Latin), 。 (CJK), ．(fullwidth), । (Devanagari danda), ۔ (Arabic full stop)
 */
const TRAILING_PERIOD_REGEX = /[.。．।۔]+$/

/**
 * Strip trailing period characters from a text string
 */
function stripTrailingPeriod(text) {
  if (!text || typeof text !== 'string') return text
  return text.replace(TRAILING_PERIOD_REGEX, '').trim()
}

/**
 * Strip trailing periods from all text fields in a manifest.
 * Cleans: node text (known/target), sample dictionary keys,
 * seed sentence canonicals, encouragement text, and presentation text.
 *
 * Must be called BEFORE populateTokensAndLemmas so tokens reflect cleaned text.
 *
 * @param {Object} manifest - The manifest to clean (mutated in place)
 * @returns {{ textsStripped: number, samplesRenamed: number }}
 */
function cleanTrailingPeriods(manifest) {
  let textsStripped = 0
  let samplesRenamed = 0

  function stripFromLangObj(langObj) {
    if (!langObj || !langObj.text) return
    const cleaned = stripTrailingPeriod(langObj.text)
    if (cleaned !== langObj.text) {
      langObj.text = cleaned
      textsStripped++
    }
  }

  for (const slice of manifest.slices || []) {
    // 1. Clean node text in seeds
    for (const seed of slice.seeds || []) {
      // Seed sentence canonical
      if (seed.seed_sentence?.canonical) {
        const cleaned = stripTrailingPeriod(seed.seed_sentence.canonical)
        if (cleaned !== seed.seed_sentence.canonical) {
          seed.seed_sentence.canonical = cleaned
          textsStripped++
        }
      }

      // Seed node
      if (seed.node) {
        stripFromLangObj(seed.node.known)
        stripFromLangObj(seed.node.target)
      }

      // Introduction items
      for (const introItem of seed.introduction_items || []) {
        if (introItem.node) {
          stripFromLangObj(introItem.node.known)
          stripFromLangObj(introItem.node.target)
        }
        for (const node of introItem.nodes || []) {
          stripFromLangObj(node.known)
          stripFromLangObj(node.target)
        }
        // Presentation text
        if (introItem.presentation) {
          const cleaned = stripTrailingPeriod(introItem.presentation)
          if (cleaned !== introItem.presentation) {
            introItem.presentation = cleaned
            textsStripped++
          }
        }
      }
    }

    // 2. Clean sample dictionary keys
    if (slice.samples) {
      const newSamples = {}
      for (const [key, entries] of Object.entries(slice.samples)) {
        const cleanedKey = stripTrailingPeriod(key)
        if (cleanedKey !== key) samplesRenamed++
        // Merge if cleaned key already exists (deduplicate by audio ID)
        if (newSamples[cleanedKey]) {
          const existingIds = new Set(newSamples[cleanedKey].map(e => e.id))
          for (const entry of entries) {
            if (!existingIds.has(entry.id)) {
              newSamples[cleanedKey].push(entry)
            }
          }
        } else {
          newSamples[cleanedKey] = entries
        }
      }
      slice.samples = newSamples
    }

    // 3. Clean encouragement text
    for (const enc of slice.orderedEncouragements || []) {
      if (enc.text) {
        const cleaned = stripTrailingPeriod(enc.text)
        if (cleaned !== enc.text) {
          enc.text = cleaned
          textsStripped++
        }
      }
    }
    for (const enc of slice.pooledEncouragements || []) {
      if (enc.text) {
        const cleaned = stripTrailingPeriod(enc.text)
        if (cleaned !== enc.text) {
          enc.text = cleaned
          textsStripped++
        }
      }
    }
    for (const enc of slice.paywallEncouragements || []) {
      if (enc.text) {
        const cleaned = stripTrailingPeriod(enc.text)
        if (cleaned !== enc.text) {
          enc.text = cleaned
          textsStripped++
        }
      }
    }
  }

  return { textsStripped, samplesRenamed }
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
    logger.info(`No existing file found at ${filePath}, this is a new course`)
    return null // Return null for new courses so frontend knows to show 1.0.0
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
  // For new courses (null), suggest 1.0.0; otherwise bump major
  const suggestedVersion = existingVersion ? bumpMajorVersion(existingVersion) : '1.0.0'
  return { existingVersion, suggestedVersion, isNewCourse: !existingVersion }
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
 * Pull latest author branch from remote.
 * Call this before reading from the repo (diff, version check) to avoid stale data.
 */
function pullAuthorBranch() {
  const repoCheck = checkCourseConfigsRepo()
  if (!repoCheck.exists) return

  try {
    execSync('git checkout author', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })
    execSync('git pull --rebase origin author', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })
    logger.info('Pulled latest author branch from remote')
  } catch {
    // No remote branch yet or network issue — not fatal, just use local state
    logger.warn('Could not pull author branch (may not exist on remote yet)')
  }
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
 * Push author branch to remote
 * @returns {Object} { success, message, error }
 */
function pushToRemote() {
  try {
    // Check repo exists
    const repoCheck = checkCourseConfigsRepo()
    if (!repoCheck.exists) {
      return { success: false, error: repoCheck.error }
    }

    // Ensure we're on author branch
    execSync('git checkout author', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })

    // Check if there are commits to push
    const status = execSync('git status -sb', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })
    const behindAhead = status.match(/\[.*ahead (\d+).*\]/)
    const commitsAhead = behindAhead ? parseInt(behindAhead[1], 10) : 0

    if (commitsAhead === 0) {
      // Check if remote tracking exists
      try {
        execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })
        return {
          success: true,
          message: 'Already up to date with remote',
          commitsPushed: 0
        }
      } catch {
        // No upstream set, will push with -u
      }
    }

    // Pull before pushing to avoid rejection
    try {
      execSync('git pull --rebase origin author', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })
    } catch {
      // No remote branch yet or no upstream — fine, push will create it
    }

    // Push to origin
    execSync('git push -u origin author', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })

    logger.info(`Pushed author branch to remote (${commitsAhead} commit${commitsAhead !== 1 ? 's' : ''})`)

    return {
      success: true,
      message: `Pushed ${commitsAhead} commit${commitsAhead !== 1 ? 's' : ''} to origin/author`,
      commitsPushed: commitsAhead
    }
  } catch (error) {
    logger.error(`Failed to push: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get status of course-configs repo (commits ahead, current branch, etc.)
 * @returns {Object} { success, branch, commitsAhead, lastCommit, error }
 */
function getRepoStatus() {
  try {
    const repoCheck = checkCourseConfigsRepo()
    if (!repoCheck.exists) {
      return { success: false, error: repoCheck.error }
    }

    // Get current branch
    const branch = execSync('git branch --show-current', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' }).trim()

    // Get status with tracking info
    const status = execSync('git status -sb', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' })
    const behindAhead = status.match(/\[.*ahead (\d+).*\]/)
    const commitsAhead = behindAhead ? parseInt(behindAhead[1], 10) : 0

    // Get last commit info
    let lastCommit = null
    try {
      const logOutput = execSync('git log -1 --format="%h|%s|%ar"', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8', stdio: 'pipe' }).trim()
      const [hash, subject, relativeTime] = logOutput.split('|')
      lastCommit = { hash, subject, relativeTime }
    } catch {
      // No commits yet
    }

    return {
      success: true,
      branch,
      commitsAhead,
      lastCommit
    }
  } catch (error) {
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
    status = 'published',
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

  logger.info(`Publishing ${courseConfigsId}: ${existingVersion ? `v${existingVersion}` : '(new)'} → v${newVersion}`)

  // Update manifest metadata
  manifest.version = newVersion
  manifest.status = status

  // Strip trailing periods from text fields and sample keys
  const { textsStripped, samplesRenamed } = cleanTrailingPeriods(manifest)
  if (textsStripped > 0 || samplesRenamed > 0) {
    logger.info(`Stripped trailing periods: ${textsStripped} text fields, ${samplesRenamed} sample keys renamed`)
  }

  // Populate tokens and lemmas (after period stripping so tokens reflect cleaned text)
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
  cleanTrailingPeriods,
  populateTokensAndLemmas,
  canonicalizeManifest,

  // Version management
  readExistingVersion,
  bumpMajorVersion,
  suggestVersion,

  // Repo operations
  pullAuthorBranch,
  checkCourseConfigsRepo,
  writeToRepo,
  commitToGit,
  pushToRemote,
  getRepoStatus,

  // Apidev operations
  generateScpFilename,
  uploadToApidev,

  // Full workflow
  publishManifest
}
