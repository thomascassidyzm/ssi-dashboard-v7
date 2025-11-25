/**
 * VFS Client - Frontend wrapper for cloud-native file operations
 *
 * All course data operations go through these functions,
 * which call the VFS API (backed by S3).
 *
 * Usage:
 *   import { listCourses, readCourseFile, writeCourseFile } from '@/services/vfs'
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3456'

/**
 * List all courses in S3
 * @returns {Promise<string[]>} Array of course codes
 */
export async function listCourses() {
  const response = await fetch(`${API_BASE}/api/vfs/courses`)

  if (!response.ok) {
    throw new Error(`Failed to list courses: ${response.statusText}`)
  }

  const data = await response.json()
  return data.courses
}

/**
 * Read a course file from S3
 * @param {string} courseCode - Course code (e.g., "ita_for_eng_668seeds")
 * @param {string} fileName - File name (e.g., "seed_pairs.json")
 * @returns {Promise<Object|string>} Parsed JSON object or raw string
 */
export async function readCourseFile(courseCode, fileName) {
  const response = await fetch(`${API_BASE}/api/vfs/courses/${courseCode}/${fileName}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found: ${fileName}`)
    }
    throw new Error(`Failed to read ${fileName}: ${response.statusText}`)
  }

  // Parse JSON files
  if (fileName.endsWith('.json')) {
    return await response.json()
  }

  // Return raw text for other files
  return await response.text()
}

/**
 * Write a course file to S3
 * @param {string} courseCode - Course code
 * @param {string} fileName - File name
 * @param {Object|string} content - Content to write (will be stringified if object)
 * @returns {Promise<Object>} Response with success status
 */
export async function writeCourseFile(courseCode, fileName, content) {
  const body = typeof content === 'string' ? content : JSON.stringify(content, null, 2)

  const response = await fetch(`${API_BASE}/api/vfs/courses/${courseCode}/${fileName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  })

  if (!response.ok) {
    throw new Error(`Failed to write ${fileName}: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Delete a course file from S3
 * @param {string} courseCode - Course code
 * @param {string} fileName - File name
 * @returns {Promise<Object>} Response with success status
 */
export async function deleteCourseFile(courseCode, fileName) {
  const response = await fetch(`${API_BASE}/api/vfs/courses/${courseCode}/${fileName}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new Error(`Failed to delete ${fileName}: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Check if a course file exists in S3
 * @param {string} courseCode - Course code
 * @param {string} fileName - File name
 * @returns {Promise<boolean>} True if file exists
 */
export async function courseFileExists(courseCode, fileName) {
  try {
    await readCourseFile(courseCode, fileName)
    return true
  } catch (error) {
    if (error.message.includes('not found')) {
      return false
    }
    throw error
  }
}

/**
 * Read multiple course files at once
 * @param {string} courseCode - Course code
 * @param {string[]} fileNames - Array of file names
 * @returns {Promise<Object>} Map of fileName -> content
 */
export async function readCourseFiles(courseCode, fileNames) {
  const results = {}

  await Promise.all(
    fileNames.map(async (fileName) => {
      try {
        results[fileName] = await readCourseFile(courseCode, fileName)
      } catch (error) {
        console.warn(`Failed to read ${fileName}:`, error.message)
        results[fileName] = null
      }
    })
  )

  return results
}

/**
 * Read all phase output files for a course
 * @param {string} courseCode - Course code
 * @returns {Promise<Object>} Map of phase -> content
 */
export async function readAllPhaseFiles(courseCode) {
  // APML v9.0 file mapping:
  // Phase 1: Translation + LEGO Extraction (seed_pairs, corpus_intelligence, lego_pairs, introductions)
  // Phase 3: Basket Generation (lego_baskets)
  // Manifest: Course Compilation (course_manifest)
  const phaseFiles = [
    'seed_pairs.json',                    // Phase 1 (Translation)
    'corpus_intelligence.json',           // Phase 1 (Intelligence)
    'lego_pairs.json',                    // Phase 1 (LEGO Extraction)
    'lego_graph.json',                    // Phase 1 (LEGO Graph - optional)
    'lego_baskets.json',                  // Phase 3 (Basket Generation)
    'introductions.json',                 // Phase 1 (Introductions - integrated)
    'course_manifest.json'                // Manifest (Course Compilation)
  ]

  return await readCourseFiles(courseCode, phaseFiles)
}
