import { openDB } from 'idb'

const DB_NAME = 'ssi-course-cache'
const STORE_NAME = 'courses'
const DB_VERSION = 1
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

/**
 * Initializes and returns the IndexedDB database instance
 * @returns {Promise<IDBDatabase>}
 */
async function getDB() {
  try {
    return await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'courseCode' })

          // Create indexes for efficient querying
          store.createIndex('version', 'version', { unique: false })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
          store.createIndex('cachedAt', 'cachedAt', { unique: false })
        }
      },
      blocked() {
        console.warn('[CourseCache] Database upgrade blocked - please close other tabs')
      },
      blocking() {
        console.warn('[CourseCache] This page is blocking database upgrade')
      }
    })
  } catch (error) {
    console.error('[CourseCache] Failed to open database:', error)
    throw new Error(`Failed to initialize course cache: ${error.message}`)
  }
}

/**
 * Retrieves a cached course if it exists and is still valid
 * @param {string} courseCode - The course code to retrieve
 * @returns {Promise<Object|null>} The cached course data or null if not found/expired
 */
export async function getCachedCourse(courseCode) {
  try {
    const db = await getDB()
    const cachedData = await db.get(STORE_NAME, courseCode)

    if (!cachedData) {
      console.log(`[CourseCache] No cache found for ${courseCode}`)
      return null
    }

    // Check if cache has expired
    if (Date.now() > cachedData.expiresAt) {
      console.log(`[CourseCache] Cache expired for ${courseCode}`)
      // Clean up expired cache
      await clearCourseCache(courseCode)
      return null
    }

    console.log(`[CourseCache] Cache hit for ${courseCode} (version: ${cachedData.version})`)
    return {
      version: cachedData.version,
      seedPairs: cachedData.seedPairs,
      legoPairs: cachedData.legoPairs,
      legoBaskets: cachedData.legoBaskets,
      cachedAt: cachedData.cachedAt
    }
  } catch (error) {
    console.error(`[CourseCache] Error retrieving cache for ${courseCode}:`, error)
    return null
  }
}

/**
 * Stores course data in the cache with 24-hour expiry
 * @param {string} courseCode - The course code
 * @param {string} version - The course version
 * @param {Object} data - The course data to cache
 * @param {Object} data.seedPairs - Seed pairs data
 * @param {Object} data.legoPairs - LEGO pairs data
 * @param {Object} data.legoBaskets - LEGO baskets data
 * @returns {Promise<void>}
 */
export async function setCachedCourse(courseCode, version, data) {
  try {
    const db = await getDB()
    const now = Date.now()

    const cacheEntry = {
      courseCode,
      version,
      seedPairs: data.seedPairs || null,
      legoPairs: data.legoPairs || null,
      legoBaskets: data.legoBaskets || null,
      cachedAt: now,
      expiresAt: now + CACHE_DURATION
    }

    await db.put(STORE_NAME, cacheEntry)
    console.log(`[CourseCache] Cached ${courseCode} (version: ${version})`)
  } catch (error) {
    console.error(`[CourseCache] Error caching ${courseCode}:`, error)
    // Don't throw - caching failure shouldn't break the app
  }
}

/**
 * Removes a specific course from the cache
 * @param {string} courseCode - The course code to remove
 * @returns {Promise<void>}
 */
export async function clearCourseCache(courseCode) {
  try {
    const db = await getDB()
    await db.delete(STORE_NAME, courseCode)
    console.log(`[CourseCache] Cleared cache for ${courseCode}`)
  } catch (error) {
    console.error(`[CourseCache] Error clearing cache for ${courseCode}:`, error)
  }
}

/**
 * Clears all cached courses
 * @returns {Promise<void>}
 */
export async function clearAllCache() {
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await tx.objectStore(STORE_NAME).clear()
    await tx.done
    console.log('[CourseCache] Cleared all cache')
  } catch (error) {
    console.error('[CourseCache] Error clearing all cache:', error)
  }
}

/**
 * Checks if a cached course exists and matches the current version
 * @param {string} courseCode - The course code to check
 * @param {string} currentVersion - The current version to compare against
 * @returns {Promise<boolean>} True if cache is valid and version matches
 */
export async function isCacheValid(courseCode, currentVersion) {
  try {
    const cachedData = await getCachedCourse(courseCode)

    if (!cachedData) {
      return false
    }

    const isValid = cachedData.version === currentVersion

    if (!isValid) {
      console.log(`[CourseCache] Version mismatch for ${courseCode}: cached ${cachedData.version}, current ${currentVersion}`)
      // Clear invalid cache
      await clearCourseCache(courseCode)
    }

    return isValid
  } catch (error) {
    console.error(`[CourseCache] Error checking cache validity for ${courseCode}:`, error)
    return false
  }
}

/**
 * Gets cache statistics (useful for debugging/monitoring)
 * @returns {Promise<Object>} Cache statistics
 */
export async function getCacheStats() {
  try {
    const db = await getDB()
    const allCourses = await db.getAll(STORE_NAME)

    const now = Date.now()
    const valid = allCourses.filter(c => c.expiresAt > now)
    const expired = allCourses.filter(c => c.expiresAt <= now)

    return {
      total: allCourses.length,
      valid: valid.length,
      expired: expired.length,
      courses: allCourses.map(c => ({
        courseCode: c.courseCode,
        version: c.version,
        cachedAt: new Date(c.cachedAt).toISOString(),
        expiresAt: new Date(c.expiresAt).toISOString(),
        isExpired: c.expiresAt <= now
      }))
    }
  } catch (error) {
    console.error('[CourseCache] Error getting cache stats:', error)
    return {
      total: 0,
      valid: 0,
      expired: 0,
      courses: [],
      error: error.message
    }
  }
}

/**
 * Cleans up expired cache entries
 * @returns {Promise<number>} Number of entries removed
 */
export async function cleanupExpiredCache() {
  try {
    const db = await getDB()
    const allCourses = await db.getAll(STORE_NAME)

    const now = Date.now()
    const expired = allCourses.filter(c => c.expiresAt <= now)

    for (const course of expired) {
      await db.delete(STORE_NAME, course.courseCode)
    }

    if (expired.length > 0) {
      console.log(`[CourseCache] Cleaned up ${expired.length} expired entries`)
    }

    return expired.length
  } catch (error) {
    console.error('[CourseCache] Error cleaning up expired cache:', error)
    return 0
  }
}
