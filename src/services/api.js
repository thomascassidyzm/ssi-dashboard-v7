import axios from 'axios'
import { getCachedCourse, setCachedCourse, clearCourseCache, isCacheValid, clearAllCache, getCacheStats, cleanupExpiredCache } from './courseCache.js'
import { getStorageConfig, STORAGE_CONFIG } from '../config/storage.js'
import { supabase, isConfigured as isSupabaseConfigured, getAllCourses } from './supabase.js'

// Build version for cache busting (set by Vite at build time)
export const BUILD_VERSION = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : 'dev'

// Default API URL for local development
// IMPORTANT: NO hardcoded ngrok URLs - different machines have different tunnels!
// Use EnvironmentSwitcher to set the API URL for remote access.
const DEFAULT_LOCAL_URL = 'http://localhost:3470'

/**
 * Get the API base URL - central helper for all API calls
 * Priority: localStorage > localhost default > ngrok relative > empty (requires EnvironmentSwitcher)
 *
 * NO HARDCODING of ngrok URLs - each machine has its own tunnel.
 * For Vercel/static hosting, user MUST use EnvironmentSwitcher to set the backend URL.
 */
export function getApiUrl() {
  // 0. The watson-1 tailnet staging host serves the app and proxies /api/* to
  // the production API on its OWN origin, so relative is not just safe here, it
  // is the only correct answer — and it must beat the pin, because the
  // environment bootstrap writes one on load for anonymous visitors too.
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.ts.net')) return ''

  // 1. Check localStorage (set by EnvironmentSwitcher) - works everywhere
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) {
    return storedUrl
  }

  // 2. Local dev uses localhost
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return DEFAULT_LOCAL_URL
  }

  // 3. ngrok - use relative URL (same origin proxies to backend)
  if (typeof window !== 'undefined' && window.location.hostname.includes('ngrok')) {
    return ''  // Relative URL - ngrok tunnel handles it
  }

  // 4. popty.app (Vercel) - default to watson-1, the always-on cloud machine.
  // Override via EnvironmentSwitcher to point at a dev box (e.g. popty.ngrok.app).
  if (typeof window !== 'undefined' && window.location.hostname === 'popty.app') {
    return 'https://watson-1.tail4968cb.ts.net:8443'
  }

  // 5. Other static hosting - requires EnvironmentSwitcher
  console.warn('[API] No API URL configured. Use Environment Switcher to set the backend URL.')
  return ''
}

// Aliases for backwards compatibility
function getApiBaseUrl() {
  return getApiUrl()
}

function getProductionApiUrl() {
  return getApiUrl()
}

// Export for direct access
export { getProductionApiUrl, getApiBaseUrl }

/**
 * fetch + guard + parse JSON in one call. Throws a CLEAN Error on a non-OK or
 * non-JSON response, instead of the cryptic "Unexpected token '<'" you get when
 * an HTML error page or SPA-404 (`<!doctype …>`) is fed straight to res.json().
 * Pass a full URL (build it with getApiUrl() for API calls, or a /vfs/… path for
 * static files) — this helper does NOT prefix anything.
 */
export async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'ngrok-skip-browser-warning': 'true', ...(init.headers || {}) },
  })
  const ct = res.headers.get('content-type') || ''
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = ct.includes('json') ? await res.json() : await res.text()
      msg = (body && body.error) || (typeof body === 'string' && body.slice(0, 200)) || msg
    } catch { /* keep HTTP status */ }
    throw new Error(msg)
  }
  if (!ct.includes('json')) {
    throw new Error(`Expected JSON but got ${ct || 'unknown content'} (HTTP ${res.status}) — is the API/file reachable?`)
  }
  return res.json()
}

const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3600000, // 1 hour - audio generation can take a very long time
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  }
})

// Export baseURL for components that need direct fetch access
export const baseURL = API_BASE_URL

// Export axios instance for direct use
export const apiClient = api

// Export cache utilities for direct use
export { clearCourseCache, clearAllCache, getCacheStats, cleanupExpiredCache } from './courseCache.js'

// Add request interceptor for cache busting
api.interceptors.request.use(config => {
  // Add build version to all requests for cache busting
  config.params = config.params || {}
  config.params._v = BUILD_VERSION
  return config
})

// Attach the dashboard session token — course-scoped API routes are
// auth-gated server-side. Calls that set their own header pass through
// unchanged. (Raw fetch() calls get the same treatment centrally via
// services/authFetch.js, installed in main.js.)
api.interceptors.request.use(async config => {
  try {
    if (supabase && !config.headers?.Authorization) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`
      }
    }
  } catch {
    // Never block a request over auth decoration
  }
  return config
})

// Add interceptor to suppress 404 errors for non-critical endpoints
api.interceptors.response.use(
  response => response,
  error => {
    // Log non-404 errors, suppress 404 for better UX
    if (error.response?.status !== 404) {
      console.error('[API Error]', error.message, error.response?.data)
    }
    return Promise.reject(error)
  }
)

export default {
  // Health check
  async health() {
    const response = await api.get('/api/health')
    return response.data
  },

  // Production API URL for database-backed endpoints (uses module-level function)
  getProductionApiUrl,

  // Course generation
  course: {
    // Initialize cache for baskets to avoid re-fetching 5MB files
    _basketsCache: {},

    // Database-first course data loading (APML v11.2.0)
    // Fetches from production API which reads from Supabase
    async getFromDatabase(courseCode) {
      const productionApiUrl = getProductionApiUrl()

      console.log(`[API] Trying database-first load for ${courseCode} from ${productionApiUrl}`)

      try {
        // Fetch seeds with nested legos and basket_phrases from production API
        const seedsRes = await fetch(`${productionApiUrl}/api/production/${courseCode}/seeds`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })

        if (!seedsRes.ok) {
          if (seedsRes.status === 404) {
            console.log(`[API] Course ${courseCode} not found in database`)
            return null
          }
          throw new Error(`Database API returned ${seedsRes.status}`)
        }

        const seedsData = await seedsRes.json()

        // If no seeds in database, check if course record exists (empty course case)
        if (!seedsData.seeds || seedsData.seeds.length === 0) {
          console.log(`[API] No seeds in database for ${courseCode}`)

          // Check if course record exists via orchestrator
          const orchestratorUrl = getApiUrl()
          try {
            const coursesRes = await fetch(`${orchestratorUrl}/api/courses`, {
              headers: { 'ngrok-skip-browser-warning': 'true' }
            })
            if (coursesRes.ok) {
              const coursesData = await coursesRes.json()
              const courseRecord = coursesData.courses?.find(c => (c.code || c.course_code) === courseCode)

              if (courseRecord) {
                // Course exists but no seeds in database - let CourseEditor try JSON files
                console.log(`[API] Course ${courseCode} exists, no DB seeds - will try JSON files`)
                const match = courseCode.match(/^(\w+)_for_(\w+)$/)
                return {
                  course: {
                    course_code: courseCode,
                    name: courseRecord.name || `${courseCode} Course`,
                    display_name: courseRecord.name,
                    known_lang: courseRecord.knownLang,
                    target_lang: courseRecord.targetLang,
                    status: courseRecord.status || 'draft',
                    total_seeds: 0,
                    seed_pairs: 0,
                    lego_pairs: 0,
                    lego_baskets: 0,
                    version: '1.0',
                    phases_completed: [],
                    target_language_name: match ? match[1] : 'unknown',
                    known_language_name: match ? match[2] : 'unknown',
                    data_source: 'json_fallback'
                    // Note: NOT setting isEmpty - let CourseEditor try S3/JSON files
                  },
                  translations: [],
                  legos: [],
                  lego_breakdowns: [],
                  baskets: {}
                }
              }
            }
          } catch (err) {
            console.log(`[API] Could not check course record: ${err.message}`)
          }

          return null
        }

        console.log(`[API] ✓ Loaded ${seedsData.count} seeds from database for ${courseCode}`)

        // Transform database format to expected dashboard format
        const translations = []
        const legos = []
        const baskets = {}
        const seedsArray = [] // For lego_breakdowns (v5.0.1 format)

        for (const seed of seedsData.seeds) {
          // Derive seed_id display format from seed_number: 'S' + seed_number.toString().padStart(4, '0')
          const derivedSeedId = 'S' + seed.seed_number.toString().padStart(4, '0')
          const normalizedSeedId = derivedSeedId.toUpperCase()

          // Add translation
          translations.push({
            seed_id: normalizedSeedId,
            seed_number: seed.seed_number,  // Include integer for direct use
            target_phrase: seed.target_text,
            known_phrase: seed.known_text,
            canonical_seed: seed.canonical
          })

          // Build seed entry for lego_breakdowns
          const seedEntry = {
            seed_id: normalizedSeedId,
            seed_pair: {
              target: seed.target_text,
              known: seed.known_text
            },
            legos: []
          }

          // Process legos for this seed
          if (seed.legos && Array.isArray(seed.legos)) {
            for (const lego of seed.legos) {
              // Derive lego_id display format: seed_id + 'L' + lego_index.toString().padStart(2, '0')
              const derivedLegoId = normalizedSeedId + 'L' + lego.lego_index.toString().padStart(2, '0')

              // Add to flat legos list (only new ones)
              if (lego.is_new) {
                legos.push({
                  seed_id: normalizedSeedId,
                  lego_id: derivedLegoId,
                  lego_type: lego.type,
                  target_chunk: lego.target_text,
                  known_chunk: lego.known_text,
                  components: lego.components || null
                })
              }

              // Add to seed's legos array
              seedEntry.legos.push({
                id: derivedLegoId,
                type: lego.type,
                target: lego.target_text,
                known: lego.known_text,
                new: lego.is_new,
                ref: !lego.is_new,
                components: lego.components || null
              })

              // Process basket phrases for this lego (only new LEGOs get baskets)
              if (lego.is_new && lego.basket_phrases && Array.isArray(lego.basket_phrases)) {
                baskets[derivedLegoId] = {
                  lego_id: derivedLegoId,
                  target: lego.target_text,
                  known: lego.known_text,
                  type: lego.type,
                  phrases: lego.basket_phrases.map(bp => ({
                    target: bp.target_text,
                    known: bp.known_text,
                    is_debut: bp.is_debut,
                    is_component: bp.is_component
                    // Note: phrase_type removed - compute at runtime if needed
                  }))
                }
              }
            }
          }

          seedsArray.push(seedEntry)
        }

        // Sort translations by seed_id
        translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id))

        // Parse course code for metadata
        const matchStandard = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})_?(\d+)?seeds?/)
        const matchBasic = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})/)
        const match = matchStandard || matchBasic

        // Fetch accurate stats from database (same source as Production Suite list)
        let dbStats = null
        try {
          const statsRes = await fetch(`${productionApiUrl}/api/production/${courseCode}/stats`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          })
          if (statsRes.ok) {
            const statsData = await statsRes.json()
            dbStats = statsData.stats
            console.log(`[API] ✓ Loaded stats for ${courseCode} from database:`, dbStats)
          }
        } catch (statsErr) {
          console.warn(`[API] Could not load stats for ${courseCode}:`, statsErr.message)
        }

        // Note: Introductions text is loaded from S3 (introductions.json), not database
        // The lego_introductions table only stores audio UUIDs for introduction audio files

        // Determine completed phases from data
        const phasesCompleted = []
        if (translations.length > 0) phasesCompleted.push('1')
        if (legos.length > 0) phasesCompleted.push('2', '3')
        if (Object.keys(baskets).length > 0) phasesCompleted.push('5')
        if (dbStats?.introductions > 0) phasesCompleted.push('6')
        if (dbStats?.audio > 0) phasesCompleted.push('8', 'audio')

        const course = {
          course_code: courseCode,
          source_language: match ? match[2].toUpperCase() : 'UNK',
          target_language: match ? match[1].toUpperCase() : 'UNK',
          total_seeds: matchStandard?.[3] ? parseInt(matchStandard[3]) : translations.length,
          version: '1.0-db',
          created_at: new Date().toISOString(),
          status: phasesCompleted.length > 0 ? `phase_${phasesCompleted[phasesCompleted.length - 1]}` : 'unknown',
          // Use database stats if available, otherwise fall back to calculated counts
          seed_pairs: dbStats?.seeds ?? translations.length,
          lego_pairs: dbStats?.legos ?? legos.length,
          lego_baskets: dbStats?.baskets ?? Object.keys(baskets).length,
          audio_files: dbStats?.audio ?? 0,
          amino_acids: {
            introductions: dbStats?.introductions ?? 0
          },
          phases_completed: phasesCompleted,
          target_language_name: match ? match[1] : 'unknown',
          known_language_name: match ? match[2] : 'unknown',
          data_source: 'database' // Flag to identify database-backed data
        }

        return {
          course,
          translations,
          legos,
          lego_breakdowns: seedsArray,
          baskets
        }

      } catch (err) {
        console.warn(`[API] Database fetch failed for ${courseCode}:`, err.message)
        return null
      }
    },

    async generate({ target, known, seeds, startSeed, endSeed, executionMode = 'web', phaseSelection = 'all', segmentMode = 'single', force = false, stagingOnly = false }) {
      // APML v11.0: Route Phase 3 (Basket Generation) requests to the basket server
      // Legacy: 'phase5' selection maintained for backward compatibility (old Phase 5 → new Phase 3)
      if (phaseSelection === 'phase3' || phaseSelection === 'phase5') {
        const courseCode = `${target}_for_${known}`

        // Use 12-master launch for staged segments (full course with 668 seeds)
        if (segmentMode === 'staged' && endSeed === 668) {
          const response = await api.post('/phase3/launch-12-masters', {
            courseCode,
            target: target.charAt(0).toUpperCase() + target.slice(1), // Capitalize for display
            known: known.charAt(0).toUpperCase() + known.slice(1),
            stagingOnly
          })
          return {
            ...response.data,
            courseCode // Add courseCode to response for compatibility
          }
        }

        // Use regular single-orchestrator launch for single-pass mode
        const response = await api.post('/phase3/start', {
          courseCode,
          startSeed,
          endSeed,
          target: target.charAt(0).toUpperCase() + target.slice(1), // Capitalize for display
          known: known.charAt(0).toUpperCase() + known.slice(1),
          stagingOnly
        })
        return {
          ...response.data,
          courseCode // Add courseCode to response for compatibility
        }
      }

      // All other phases use the orchestrator
      const response = await api.post('/api/courses/generate', {
        target,
        known,
        seeds,
        startSeed,
        endSeed,
        executionMode,
        phaseSelection,
        segmentMode,
        force
      })
      return response.data
    },

    async getStatus(courseCode) {
      const response = await api.get(`/api/courses/${courseCode}/status`)
      return response.data
    },

    async clearJob(courseCode) {
      const response = await api.delete(`/api/courses/${courseCode}/status`)
      return response.data
    },

    async getPhase2Stats(courseCode) {
      const response = await api.get(`/api/courses/${courseCode}/phase2-stats`)
      return response.data
    },

    // Cache for course list to prevent redundant API calls
    _listCache: null,
    _listCacheTime: 0,
    _listCacheTTL: 5000, // 5 seconds
    _listPendingPromise: null,

    async list() {
      // Return cached data if fresh (prevents redundant calls from multiple components)
      const now = Date.now()
      if (this._listCache && (now - this._listCacheTime) < this._listCacheTTL) {
        console.log('[API] Using cached course list')
        return this._listCache
      }

      // Dedupe concurrent requests
      if (this._listPendingPromise) {
        console.log('[API] Waiting for pending course list request')
        return this._listPendingPromise
      }

      // Use API endpoint (proxies to S3, avoids CORS issues)
      console.log('[API] Loading courses from /api/courses');

      this._listPendingPromise = (async () => {
        try {
        // Try direct Supabase first (no ngrok round-trip)
        if (isSupabaseConfigured()) {
          console.log('[API] Loading courses directly from Supabase')

          const coursesData = await getAllCourses()

          console.log(`[API] ✓ Loaded ${coursesData.length} courses from Supabase`)

          const now = new Date()
          const daysSince = (ts) => {
            if (!ts) return undefined
            return Math.floor((now - new Date(ts)) / (1000 * 60 * 60 * 24))
          }

          const courses = coursesData.map(course => {
            const code = course.course_code
            return {
              code,
              course_code: code,
              display_name: course.display_name,
              source_language: code?.split('_for_')[1]?.toUpperCase() || 'UNK',
              target_language: code?.split('_for_')[0]?.toUpperCase() || 'UNK',
              total_seeds: 668,
              seed_count: course.seed_count || null,
              version: '1.0',
              created_at: new Date().toISOString(),
              status: course.status || 'in_progress',
              new_app_status: course.new_app_status || 'not_available',
              legacy_app_status: course.legacy_app_status || 'not_available',
              new_app_beta_started_at: course.new_app_beta_started_at,
              legacy_app_beta_started_at: course.legacy_app_beta_started_at,
              new_app_beta_days: daysSince(course.new_app_beta_started_at),
              legacy_app_beta_days: daysSince(course.legacy_app_beta_started_at),
              content_status: course.content_status || 'empty',
              content_version: course.content_version || '0.0.0',
              seed_pairs: 0,
              lego_pairs: 0,
              lego_baskets: 0,
              phrases: 0,
              audio_files: 0,
              amino_acids: { introductions: 0 },
              stats: {
                seeds: 0,
                completedSeeds: 0,
                legos: 0,
                phrases: 0,
                audio: 0
              },
              phases_completed: []
            }
          })

          const result = { courses }
          this._listCache = result
          this._listCacheTime = Date.now()
          return result
        }

        // Fallback: use API endpoint (proxies through ngrok)
        console.log('[API] Supabase not configured, falling back to API')
        const response = await api.get('/api/courses', { params: { status: 'true' } });
        const data = response.data;

        console.log(`[API] ✓ Loaded ${data.courses?.length || 0} courses from API`);

        // Fetch real content stats from database
        let contentStats = {}
        try {
          const productionApiUrl = getProductionApiUrl()
          const statsRes = await fetch(`${productionApiUrl}/api/production/course-stats`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          })
          if (statsRes.ok) {
            const statsData = await statsRes.json()
            contentStats = statsData.stats || {}
            console.log(`[API] ✓ Loaded content stats for ${Object.keys(contentStats).length} courses from database`)
          }
        } catch (statsErr) {
          console.warn('[API] Could not load course stats from database:', statsErr.message)
        }

        const courses = (data.courses || []).map(course => {
          const code = course.code || course.course_code
          const stats = contentStats[code] || { seeds: 0, completedSeeds: 0, legos: 0, baskets: 0, phrases: 0, introductions: 0, audio: 0, seed_count: null }
          return {
            code: code,
            course_code: code,
            display_name: course.display_name,
            source_language: code?.split('_for_')[1]?.toUpperCase() || 'UNK',
            target_language: code?.split('_for_')[0]?.toUpperCase() || 'UNK',
            total_seeds: stats.seeds || 668,
            seed_count: stats.seed_count || null,
            version: '1.0',
            created_at: new Date().toISOString(),
            status: course.complete ? 'complete' : 'in_progress',
            new_app_status: course.new_app_status || 'not_available',
            legacy_app_status: course.legacy_app_status || 'not_available',
            new_app_beta_started_at: course.new_app_beta_started_at,
            legacy_app_beta_started_at: course.legacy_app_beta_started_at,
            new_app_beta_days: course.new_app_beta_days,
            legacy_app_beta_days: course.legacy_app_beta_days,
            content_status: course.content_status || 'empty',
            content_version: course.content_version || '0.0.0',
            seed_pairs: stats.completedSeeds,
            lego_pairs: stats.legos,
            lego_baskets: stats.baskets,
            phrases: stats.phrases,
            audio_files: stats.audio,
            amino_acids: {
              introductions: stats.introductions
            },
            stats: {
              seeds: stats.seeds,
              completedSeeds: stats.completedSeeds,
              legos: stats.legos,
              phrases: stats.phrases,
              audio: stats.audio
            },
            phases_completed: [
              ...(stats.completedSeeds > 0 ? ['1'] : []),
              ...(stats.legos > 0 ? ['3'] : []),
              ...(stats.baskets > 0 ? ['5'] : []),
              ...(stats.introductions > 0 ? ['6'] : []),
              ...(course.files?.course_manifest || stats.baskets > 0 ? ['7', 'manifest'] : []),
              ...(stats.audio > 0 ? ['8', 'audio'] : [])
            ],
            files: course.files
          }
        });

        const result = { courses };
        this._listCache = result
        this._listCacheTime = Date.now()
        return result
      } catch (err) {
        console.error('[API] Failed to load courses:', err);
        throw err;
      } finally {
        this._listPendingPromise = null
      }
      })()

      return this._listPendingPromise
    },

    async get(courseCode) {
      // APML v11.2.0: Try database first for real-time data
      // This is the new primary data source for courses in the database
      const dbData = await this.getFromDatabase(courseCode)
      if (dbData) {
        console.log(`[API] ✓ Using database data for ${courseCode} (${dbData.translations.length} seeds, ${dbData.legos.length} legos)`)
        return dbData
      }

      // DATABASE_ONLY mode: Skip S3/GitHub fallbacks for testing new courses
      const databaseOnly = import.meta.env.VITE_DATABASE_ONLY === 'true'
      if (databaseOnly) {
        console.log(`[API] DATABASE_ONLY mode: No fallback to S3/GitHub for ${courseCode}`)
        throw new Error(`Course ${courseCode} not found in database (DATABASE_ONLY mode - no S3/GitHub fallback)`)
      }

      // Fallback: Check cache for legacy courses not in database
      const cachedData = await getCachedCourse(courseCode)
      if (cachedData) {
        console.log(`[API] Using cached data for ${courseCode}`)

        // Reconstruct response from cached raw data
        const seedPairsData = cachedData.seedPairs
        const legoPairsData = cachedData.legoPairs
        const baskets = cachedData.legoBaskets || []

        // Convert translations to array - try seed_pairs.json first, then derive from lego_pairs.json
        let translations = []

        if (seedPairsData?.translations) {
          // Primary source: seed_pairs.json
          const translationsObj = seedPairsData.translations
          translations = Object.entries(translationsObj).map(([seed_id, translation]) => {
            // Handle both old array format and new object format (APML v8.2.0+)
            let target_phrase, known_phrase
            if (Array.isArray(translation)) {
              // Old format: ["target", "known"]
              [target_phrase, known_phrase] = translation
            } else {
              // New format: {target: "...", known: "..."}
              target_phrase = translation.target
              known_phrase = translation.known
            }
            return {
              seed_id,
              target_phrase,
              known_phrase,
              canonical_seed: null
            }
          })
        } else if (legoPairsData?.seeds) {
          // Fallback: derive from lego_pairs.json (each seed has seed_pair embedded)
          console.log(`[API] Deriving translations from lego_pairs.json for ${courseCode}`)
          translations = legoPairsData.seeds.map(seed => ({
            seed_id: seed.seed_id,
            target_phrase: seed.seed_pair?.target || seed.seed_pair?.[0] || '',
            known_phrase: seed.seed_pair?.known || seed.seed_pair?.[1] || '',
            canonical_seed: null
          }))
        }

        translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id))

        // Convert lego_pairs to flat array - handle both v7.7 and v5.0.1 formats
        const seedsArray = legoPairsData?.seeds || []
        const legos = []

        // Detect format by checking first seed structure
        if (seedsArray.length > 0) {
          const firstSeed = seedsArray[0]

          if (Array.isArray(firstSeed)) {
            // v7.7 format: [[seed_id, [target, known], [[lego_id, type, t, k], ...]]]
            for (const [seed_id, [seed_target, seed_known], legoArray] of seedsArray) {
              for (const legoEntry of legoArray) {
                const [lego_id, type, target_chunk, known_chunk] = legoEntry
                legos.push({
                  seed_id,
                  lego_id,
                  lego_type: type === 'B' ? 'BASE' : type === 'C' ? 'COMPOSITE' : type === 'F' ? 'FEEDER' : type,
                  target_chunk,
                  known_chunk
                })
              }
            }
          } else if (firstSeed && typeof firstSeed === 'object' && firstSeed.seed_id) {
            // v5.0.1 format: {seed_id, seed_pair, legos: [{id, type, target, known, new/ref, components?}]}
            for (const seed of seedsArray) {
              // Skip seeds without legos array
              if (!seed.legos || !Array.isArray(seed.legos)) continue

              // Only include NEW LEGOs in the flat list
              const newLegos = seed.legos.filter(l => l.new === true)
              for (const lego of newLegos) {
                legos.push({
                  seed_id: seed.seed_id,
                  lego_id: lego.id,
                  lego_type: lego.type === 'A' ? 'A' : lego.type === 'M' ? 'M' : lego.type,
                  target_chunk: lego.target,
                  known_chunk: lego.known,
                  components: lego.components
                })
              }
            }
          }
        }

        // Flexible course code parsing
        const matchStandard = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})_?(\d+)?seeds?/)
        const matchBasic = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})/)
        const match = matchStandard || matchBasic

        // Determine which phases are complete based on data availability
        // Get phases_completed from manifest (which already has Phase 7 detection)
        const manifestData = await this.list()
        const courseFromManifest = manifestData.courses.find(c => c.course_code === courseCode)
        const phasesCompleted = courseFromManifest?.phases_completed || []

        // Fallback: if manifest doesn't have phases, detect from loaded data
        if (phasesCompleted.length === 0) {
          if (translations.length > 0) phasesCompleted.push('1')
          if (legos.length > 0) phasesCompleted.push('3')
          if (baskets.length > 0) {
            phasesCompleted.push('5')
            // Database-first: baskets in DB means ready for audio
            phasesCompleted.push('7', 'manifest')
          }
        }

        const course = {
          course_code: courseCode,
          source_language: match ? match[2].toUpperCase() : 'UNK',
          target_language: match ? match[1].toUpperCase() : 'UNK',
          total_seeds: matchStandard?.[3] ? parseInt(matchStandard[3]) : translations.length,
          version: cachedData.version,
          created_at: new Date(cachedData.cachedAt).toISOString(),
          status: phasesCompleted[phasesCompleted.length - 1] ? `phase_${phasesCompleted[phasesCompleted.length - 1]}` : 'unknown',
          seed_pairs: translations.length,
          lego_pairs: legos.length,
          lego_baskets: baskets.length,
          phases_completed: phasesCompleted,
          target_language_name: match ? match[1] : 'unknown',
          known_language_name: match ? match[2] : 'unknown'
        }

        return {
          course,
          translations,
          legos,
          lego_breakdowns: seedsArray,
          baskets
        }
      }

      // Use S3 as primary storage, GitHub as fallback
      const storage = getStorageConfig();
      console.log(`[API] Loading ${courseCode} from S3 (primary storage)`);

      try {
        // Try to load all possible phase output files from S3
        // seed_pairs.json, lego_pairs.json, lego_baskets.json are all optional now
        let seedPairsData = null
        let legoPairsData = null
        let legoBasketsData = null
        let introductionsData = null

        // Try seed_pairs.json (Phase 1)
        try {
          const res = await fetch(storage.getCourseFileUrl(courseCode, 'seed_pairs.json'))
          if (res.ok) seedPairsData = await res.json()
        } catch (e) {
          console.log(`[API] No seed_pairs.json for ${courseCode}`)
        }

        // Try lego_pairs.json (Phase 3)
        try {
          const res = await fetch(storage.getCourseFileUrl(courseCode, 'lego_pairs.json'))
          if (res.ok) legoPairsData = await res.json()
        } catch (e) {
          console.log(`[API] No lego_pairs.json for ${courseCode}`)
        }

        // Try lego_baskets.json (Phase 5)
        try {
          const res = await fetch(storage.getCourseFileUrl(courseCode, 'lego_baskets.json'))
          if (res.ok) legoBasketsData = await res.json()
        } catch (e) {
          console.log(`[API] No lego_baskets.json for ${courseCode}`)
        }

        // Try introductions.json (Phase 6)
        try {
          const res = await fetch(storage.getCourseFileUrl(courseCode, 'introductions.json'))
          if (res.ok) introductionsData = await res.json()
        } catch (e) {
          console.log(`[API] No introductions.json for ${courseCode}`)
        }

        // Process data if we have at least one phase output file
        if (seedPairsData || legoPairsData || legoBasketsData) {

          // Parse seed_pairs.json if available
          const translations = []
          if (seedPairsData) {
            const translationsObj = seedPairsData.translations || {}
            translations.push(...Object.entries(translationsObj).map(([seed_id, translation]) => {
              // Handle both old array format and new object format (APML v8.2.0+)
              let target_phrase, known_phrase
              if (Array.isArray(translation)) {
                // Old format: ["target", "known"]
                [target_phrase, known_phrase] = translation
              } else {
                // New format: {target: "...", known: "..."}
                target_phrase = translation.target
                known_phrase = translation.known
              }
              return {
                seed_id,
                target_phrase,
                known_phrase,
                canonical_seed: null
              }
            }))
            translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id))
          }

          // Parse lego_pairs.json if available
          const legos = []
          let seedsArray = [] // For lego_breakdowns visualization
          if (legoPairsData) {
            seedsArray = legoPairsData.seeds || []

            // Detect format by checking first seed structure
            if (seedsArray.length > 0) {
              const firstSeed = seedsArray[0]

              if (Array.isArray(firstSeed)) {
                // v7.7 format: [[seed_id, [target, known], [[lego_id, type, t, k], ...]]]
                for (const [seed_id, [seed_target, seed_known], legoArray] of seedsArray) {
                  for (const legoEntry of legoArray) {
                    const [lego_id, type, target_chunk, known_chunk] = legoEntry
                    legos.push({
                      seed_id,
                      lego_id,
                      lego_type: type === 'B' ? 'BASE' : type === 'C' ? 'COMPOSITE' : type === 'F' ? 'FEEDER' : type,
                      target_chunk,
                      known_chunk
                    })
                  }
                }
              } else if (firstSeed && typeof firstSeed === 'object' && firstSeed.seed_id) {
                // v5.0.1 format: {seed_id, seed_pair, legos: [{id, type, target, known, new/ref, components?}]}
                for (const seed of seedsArray) {
                  // Only include NEW LEGOs in the flat list (not referenced ones)
                  const newLegos = seed.legos.filter(l => l.new === true)
                  for (const lego of newLegos) {
                    legos.push({
                      seed_id: seed.seed_id,
                      lego_id: lego.id,
                      lego_type: lego.type === 'A' ? 'A' : lego.type === 'M' ? 'M' : lego.type,
                      target_chunk: lego.target,
                      known_chunk: lego.known,
                      components: lego.components // Include componentization for molecular LEGOs
                    })
                  }
                }
              }
            }
          }

          // Flexible course code parsing (same as list())
          const matchStandard = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})_?(\d+)?seeds?/)
          const matchBasic = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})/)
          const match = matchStandard || matchBasic

          // Count baskets and introductions
          const basketCount = legoBasketsData?.baskets ? Object.keys(legoBasketsData.baskets).length : 0
          const introductionsCount = introductionsData?.presentations ? Object.keys(introductionsData.presentations).length : 0

          console.log(`[API] Course ${courseCode} counts:`, {
            translations: translations.length,
            legos: legos.length,
            baskets: basketCount,
            introductions: introductionsCount,
            hasBasketData: !!legoBasketsData,
            hasIntroData: !!introductionsData
          })

          // Determine which phases are complete based on data availability
          // Get phases_completed from manifest (which already has Phase 7 detection)
          const manifestData = await this.list()
          const courseFromManifest = manifestData.courses.find(c => c.course_code === courseCode)
          const phasesCompleted = courseFromManifest?.phases_completed || []

          // Fallback: if manifest doesn't have phases, detect from loaded data
          if (phasesCompleted.length === 0) {
            if (translations.length > 0) phasesCompleted.push('1')
            if (legos.length > 0) phasesCompleted.push('3')
            if (basketCount > 0) {
              phasesCompleted.push('5')
              // Database-first: baskets in DB means ready for audio
              phasesCompleted.push('7', 'manifest')
            }
          }

          const course = {
            course_code: courseCode,
            source_language: match ? match[2].toUpperCase() : 'UNK',
            target_language: match ? match[1].toUpperCase() : 'UNK',
            total_seeds: matchStandard?.[3] ? parseInt(matchStandard[3]) : translations.length,
            version: '1.0',
            created_at: new Date().toISOString(),
            status: phasesCompleted[phasesCompleted.length - 1] ? `phase_${phasesCompleted[phasesCompleted.length - 1]}` : 'unknown',
            seed_pairs: translations.length,
            lego_pairs: legos.length,
            lego_baskets: basketCount,
            amino_acids: {
              introductions: introductionsCount
            },
            phases_completed: phasesCompleted,
            target_language_name: match ? match[1] : 'unknown',
            known_language_name: match ? match[2] : 'unknown'
          }

          const result = {
            course,
            translations,
            legos,
            lego_breakdowns: seedsArray, // Raw v7.7 format for visualizer
            baskets: legoBasketsData?.baskets || []
          }

          // Cache the static file data
          await setCachedCourse(courseCode, course.version, {
            seedPairs: seedPairsData,
            legoPairs: legoPairsData,
            legoBaskets: legoBasketsData?.baskets || []
          }).catch(err => {
            console.warn('[API] Failed to cache course data:', err)
          })

          return result
        }

        // Files not found in S3, try GitHub fallback
        console.log(`[API] No files found in S3 for ${courseCode}, trying GitHub fallback`);
      } catch (err) {
        console.error(`[API] Failed to load from S3 for ${courseCode}:`, err);
      }

      // GitHub fallback - try loading from GitHub
      try {
        console.log(`[API] Loading ${courseCode} from GitHub (fallback)`);
        const githubStorage = STORAGE_CONFIG.github;

        let seedPairsData = null
        let legoPairsData = null
        let legoBasketsData = null
        let introductionsData = null

        // Try seed_pairs.json (Phase 1)
        try {
          const res = await fetch(githubStorage.getCourseFileUrl(courseCode, 'seed_pairs.json'))
          if (res.ok) seedPairsData = await res.json()
        } catch (e) {
          console.log(`[API] No seed_pairs.json for ${courseCode} in GitHub`)
        }

        // Try lego_pairs.json (Phase 3)
        try {
          const res = await fetch(githubStorage.getCourseFileUrl(courseCode, 'lego_pairs.json'))
          if (res.ok) legoPairsData = await res.json()
        } catch (e) {
          console.log(`[API] No lego_pairs.json for ${courseCode} in GitHub`)
        }

        // Try lego_baskets.json (Phase 5)
        try {
          const res = await fetch(githubStorage.getCourseFileUrl(courseCode, 'lego_baskets.json'))
          if (res.ok) legoBasketsData = await res.json()
        } catch (e) {
          console.log(`[API] No lego_baskets.json for ${courseCode} in GitHub`)
        }

        // Try introductions.json (Phase 6)
        try {
          const res = await fetch(githubStorage.getCourseFileUrl(courseCode, 'introductions.json'))
          if (res.ok) introductionsData = await res.json()
        } catch (e) {
          console.log(`[API] No introductions.json for ${courseCode} in GitHub`)
        }

        // Process data if we have at least one phase output file
        if (seedPairsData || legoPairsData || legoBasketsData) {
          console.log(`[API] ✓ Found course files in GitHub for ${courseCode}`);

          // Parse seed_pairs.json if available
          const translations = []
          if (seedPairsData) {
            const translationsObj = seedPairsData.translations || {}
            translations.push(...Object.entries(translationsObj).map(([seed_id, translation]) => {
              // Handle both old array format and new object format (APML v8.2.0+)
              let target_phrase, known_phrase
              if (Array.isArray(translation)) {
                // Old format: ["target", "known"]
                [target_phrase, known_phrase] = translation
              } else {
                // New format: {target: "...", known: "..."}
                target_phrase = translation.target
                known_phrase = translation.known
              }
              return {
                seed_id,
                target_phrase,
                known_phrase,
                canonical_seed: null
              }
            }))
            translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id))
          }

          // Parse lego_pairs.json if available (same logic as S3 path)
          const legos = []
          let seedsArray = []
          if (legoPairsData) {
            seedsArray = legoPairsData.seeds || []

            // Detect format by checking first seed structure
            if (seedsArray.length > 0) {
              const firstSeed = seedsArray[0]

              if (Array.isArray(firstSeed)) {
                // v7.7 format
                for (const [seed_id, [seed_target, seed_known], legoArray] of seedsArray) {
                  for (const legoEntry of legoArray) {
                    const [lego_id, type, target_chunk, known_chunk] = legoEntry
                    legos.push({
                      seed_id,
                      lego_id,
                      lego_type: type === 'B' ? 'BASE' : type === 'C' ? 'COMPOSITE' : type === 'F' ? 'FEEDER' : type,
                      target_chunk,
                      known_chunk
                    })
                  }
                }
              } else if (firstSeed && typeof firstSeed === 'object' && firstSeed.seed_id) {
                // v5.0.1 format
                for (const seed of seedsArray) {
                  const newLegos = seed.legos.filter(l => l.new === true)
                  for (const lego of newLegos) {
                    legos.push({
                      seed_id: seed.seed_id,
                      lego_id: lego.id,
                      lego_type: lego.type === 'A' ? 'A' : lego.type === 'M' ? 'M' : lego.type,
                      target_chunk: lego.target,
                      known_chunk: lego.known,
                      components: lego.components
                    })
                  }
                }
              }
            }
          }

          // Flexible course code parsing
          const matchStandard = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})_?(\d+)?seeds?/)
          const matchBasic = courseCode.match(/^([a-z]{3})(?:_[a-z]{1,5})?_for_([a-z]{3})/)
          const match = matchStandard || matchBasic

          // Count baskets and introductions
          const basketCount = legoBasketsData?.baskets ? Object.keys(legoBasketsData.baskets).length : 0
          const introductionsCount = introductionsData?.presentations ? Object.keys(introductionsData.presentations).length : 0

          // Determine which phases are complete based on data availability
          const manifestData = await this.list()
          const courseFromManifest = manifestData.courses.find(c => c.course_code === courseCode)
          const phasesCompleted = courseFromManifest?.phases_completed || []

          // Fallback: if manifest doesn't have phases, detect from loaded data
          if (phasesCompleted.length === 0) {
            if (translations.length > 0) phasesCompleted.push('1')
            if (legos.length > 0) phasesCompleted.push('3')
            if (basketCount > 0) {
              phasesCompleted.push('5')
              // Database-first: baskets in DB means ready for audio
              phasesCompleted.push('7', 'manifest')
            }
          }

          const course = {
            course_code: courseCode,
            source_language: match ? match[2].toUpperCase() : 'UNK',
            target_language: match ? match[1].toUpperCase() : 'UNK',
            total_seeds: matchStandard?.[3] ? parseInt(matchStandard[3]) : translations.length,
            version: '1.0',
            created_at: new Date().toISOString(),
            status: phasesCompleted[phasesCompleted.length - 1] ? `phase_${phasesCompleted[phasesCompleted.length - 1]}` : 'unknown',
            seed_pairs: translations.length,
            lego_pairs: legos.length,
            lego_baskets: basketCount,
            amino_acids: {
              introductions: introductionsCount
            },
            phases_completed: phasesCompleted,
            target_language_name: match ? match[1] : 'unknown',
            known_language_name: match ? match[2] : 'unknown'
          }

          const result = {
            course,
            translations,
            legos,
            lego_breakdowns: seedsArray,
            baskets: legoBasketsData?.baskets || []
          }

          // Cache the data from GitHub
          await setCachedCourse(courseCode, course.version, {
            seedPairs: seedPairsData,
            legoPairs: legoPairsData,
            legoBaskets: legoBasketsData?.baskets || []
          }).catch(err => {
            console.warn('[API] Failed to cache course data:', err)
          })

          return result
        }

        // Files not found in both S3 and GitHub
        throw new Error(`Course files not found for ${courseCode} in S3 or GitHub`)
      } catch (err) {
        console.error(`[API] Failed to load course ${courseCode} from both S3 and GitHub:`, err)
        throw err
      }
    },

    async traceProvenance(courseCode, seedId) {
      // Use S3 as primary storage, GitHub as fallback
      const storage = getStorageConfig();

      let seedPairsRes = await fetch(storage.getCourseFileUrl(courseCode, 'seed_pairs.json'))
      let legoPairsRes = await fetch(storage.getCourseFileUrl(courseCode, 'lego_pairs.json'))

      // Try GitHub fallback if S3 fails
      if (!seedPairsRes.ok || !legoPairsRes.ok) {
        console.log('[API] traceProvenance: Trying GitHub fallback');
        const githubStorage = STORAGE_CONFIG.github;
        seedPairsRes = await fetch(githubStorage.getCourseFileUrl(courseCode, 'seed_pairs.json'))
        legoPairsRes = await fetch(githubStorage.getCourseFileUrl(courseCode, 'lego_pairs.json'))
      }

      if (!seedPairsRes.ok || !legoPairsRes.ok) {
        throw new Error(`Failed to load course data for ${courseCode} from S3 or GitHub`)
      }

      const seedPairsData = await seedPairsRes.json()
      const legoPairsData = await legoPairsRes.json()

      const translationsObj = seedPairsData.translations || {}
      const translationPair = translationsObj[seedId]
      if (!translationPair) {
        throw new Error(`Seed ${seedId} not found`)
      }

      const translation = {
        seed_id: seedId,
        target_phrase: translationPair[0],
        known_phrase: translationPair[1]
      }

      // Find LEGO breakdown - handle both array-of-arrays and array-of-objects formats
      const seedsArray = legoPairsData.seeds || []
      const legoBreakdown = seedsArray.find(item =>
        Array.isArray(item) ? item[0] === seedId : item.seed_id === seedId
      )

      return {
        seed: translation,
        lego_breakdown: legoBreakdown || null,
        phase_history: [
          {
            phase: '1',
            name: 'Translation',
            completed: true,
            output: translation
          },
          {
            phase: '3',
            name: 'LEGO Extraction',
            completed: !!legoBreakdown,
            output: legoBreakdown
          }
        ]
      }
    },

    async updateTranslation(courseCode, uuid, data) {
      const response = await api.put(`/api/courses/${courseCode}/translations/${uuid}`, data)
      // Clear cache since translation data changed
      await clearCourseCache(courseCode)
      return response.data
    },

    async getRegenerationStatus(courseCode, jobId) {
      const response = await api.get(`/api/courses/${courseCode}/regeneration/${jobId}`)
      return response.data
    },

    async compile(courseCode) {
      const response = await api.post(`/api/courses/${courseCode}/compile`)
      // Clear cache since course was recompiled
      await clearCourseCache(courseCode)
      return response.data
    },

    async deploy(courseCode, courseJSON) {
      const response = await api.post(`/api/courses/${courseCode}/deploy`, {
        courseJSON
      })
      return response.data
    },

    // Cache for lego_baskets.json to avoid re-fetching 5MB file for every seed
    _basketsCache: {},

    async getBasket(courseCode, seedId) {
      // Try database first (via production API), then S3/GitHub as fallback
      const productionApiUrl = getProductionApiUrl();
      console.log(`[API] Loading basket ${seedId} - trying database first`);

      try {
        // Try production API (database-first)
        const dbResponse = await fetch(`${productionApiUrl}/api/production/${courseCode}/seed/${seedId}/baskets`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          if (dbData.baskets && Object.keys(dbData.baskets).length > 0) {
            console.log(`[API] ✓ Loaded ${Object.keys(dbData.baskets).length} basket(s) for ${seedId} from database`);
            return {
              basket: {
                seed_pair: dbData.seed_pair,
                legos: dbData.baskets,
                generation_stage: 'COMPLETE'
              }
            };
          }
        }
      } catch (err) {
        console.log(`[API] Database fetch failed for ${seedId}, trying S3:`, err.message);
      }

      // Fall back to S3/GitHub
      const storage = getStorageConfig();
      console.log(`[API] Loading basket ${seedId} from S3 (fallback)`);

      try {
        // Load from merged lego_baskets.json (Phase 5+ format)
        // Cache it to avoid re-fetching the 5MB file for every seed
        if (!this._basketsCache[courseCode]) {
          console.log(`[API] Fetching lego_baskets.json for ${courseCode} (not cached)`);

          // Try S3 first with cache-busting
          let basketsRes = await fetch(`${storage.getCourseFileUrl(courseCode, 'lego_baskets.json')}?t=${Date.now()}`);

          // Fallback to GitHub if S3 fails
          if (!basketsRes.ok) {
            console.log('[API] S3 fetch failed, trying GitHub fallback');
            const githubStorage = STORAGE_CONFIG.github;
            basketsRes = await fetch(`${githubStorage.getCourseFileUrl(courseCode, 'lego_baskets.json')}?t=${Date.now()}`);
          }

          if (basketsRes.ok) {
            this._basketsCache[courseCode] = await basketsRes.json();
          } else {
            throw new Error('lego_baskets.json not found in S3 or GitHub');
          }
        }

        const allBaskets = this._basketsCache[courseCode];

        // Find basket by seedId in baskets object
        // Baskets are keyed like "S0001L01", "S0001L02" etc - find all for this seed
        const seedBaskets = {}
        for (const [key, basketData] of Object.entries(allBaskets.baskets || {})) {
          if (key.startsWith(seedId)) {
            seedBaskets[key] = basketData;
          }
        }

        if (Object.keys(seedBaskets).length > 0) {
          console.log(`[API] ✓ Found ${Object.keys(seedBaskets).length} basket(s) for ${seedId} in ${courseCode}`);
        } else {
          console.warn(`[API] ⚠️  MISSING BASKET: ${seedId} not found in ${courseCode}/lego_baskets.json`);
        }

        if (Object.keys(seedBaskets).length > 0) {
          // Get seed_pair from seed_pairs.json (try S3, fallback to GitHub)
          let seedPairsRes = await fetch(storage.getCourseFileUrl(courseCode, 'seed_pairs.json'));
          if (!seedPairsRes.ok) {
            console.log('[API] Trying GitHub for seed_pairs.json');
            const githubStorage = STORAGE_CONFIG.github;
            seedPairsRes = await fetch(githubStorage.getCourseFileUrl(courseCode, 'seed_pairs.json'));
          }

          let seedPair = null;
          if (seedPairsRes.ok) {
            const seedPairsData = await seedPairsRes.json();
            const translation = seedPairsData.translations?.[seedId];
            if (translation) {
              // Handle both old array format and new object format (APML v8.2.0+)
              if (Array.isArray(translation)) {
                // Old format: ["known", "target"]
                seedPair = {
                  target: translation[1],
                  known: translation[0]
                };
              } else {
                // New format: {target: "...", known: "..."}
                seedPair = {
                  target: translation.target,
                  known: translation.known
                };
              }
            }
          }

          // Return basket in expected format
          return {
            basket: {
              seed_pair: seedPair,
              legos: seedBaskets,  // v6.2+ format with LEGOs nested
              generation_stage: 'COMPLETE'
            }
          };
        }

        throw new Error(`Basket not found for ${seedId}`);
      } catch (err) {
        console.error(`[API] Failed to fetch basket for ${seedId}:`, err);
        throw err;
      }
    },

    async saveBasket(courseCode, seedId, basketData) {
      const response = await api.put(`/api/courses/${courseCode}/baskets/${seedId}`, basketData)
      return response.data
    },

    async updateIntroduction(courseCode, legoId, introData) {
      const response = await api.put(`/api/courses/${courseCode}/introductions/${legoId}`, introData)
      return response.data
    },

    async createFlag(courseCode, data) {
      try {
        const response = await api.post(`/api/courses/${courseCode}/flags`, data)
        return response.data
      } catch (error) {
        console.error(`[API] Failed to create flag for ${courseCode}:`, error)
        throw error
      }
    },

    async getFlags(courseCode) {
      try {
        const response = await api.get(`/api/courses/${courseCode}/flags`)
        return response.data
      } catch (error) {
        console.error(`[API] Failed to get flags for ${courseCode}:`, error)
        throw error
      }
    },

    async deleteFlag(courseCode, flagId) {
      try {
        const response = await api.delete(`/api/courses/${courseCode}/flags/${flagId}`)
        return response.data
      } catch (error) {
        console.error(`[API] Failed to delete flag ${flagId} for ${courseCode}:`, error)
        throw error
      }
    },

    /**
     * Update platform deployment status for a course
     * @param {string} courseCode - Course code
     * @param {string} platform - 'new_app' or 'legacy_app'
     * @param {string} status - Status value
     */
    async updatePlatformStatus(courseCode, platform, status) {
      try {
        const response = await api.patch(`/api/courses/${courseCode}/platform-status`, {
          platform,
          status
        })
        return response.data
      } catch (error) {
        console.error(`[API] Failed to update platform status for ${courseCode}:`, error)
        throw error
      }
    }
  },

  // Quality review and self-healing
  quality: {
    // Get quality overview for a course
    async getOverview(courseCode) {
      const response = await api.get(`/api/courses/${courseCode}/quality`)
      return response.data
    },

    // Get all SEEDs with quality data
    async getSeeds(courseCode, filters = {}) {
      // Get seeds from quality overview for now
      const overview = await this.getOverview(courseCode)
      return { seeds: overview.flagged_seeds || [] }
    },

    // Get detailed quality data for a specific SEED
    async getSeedDetail(courseCode, seedId) {
      const response = await api.get(`/api/courses/${courseCode}/seeds/${seedId}/review`)
      return response.data
    },

    // Get all extraction attempts for a SEED
    async getSeedAttempts(courseCode, seedId) {
      // This is part of getSeedDetail
      const detail = await this.getSeedDetail(courseCode, seedId)
      return { attempts: detail.attempts || [] }
    },

    // Accept an extraction attempt
    async acceptAttempt(courseCode, seedId, attemptId) {
      const response = await api.post(`/api/courses/${courseCode}/seeds/${seedId}/accept`, {
        attemptId
      })
      // Clear cache since LEGO data changed
      await clearCourseCache(courseCode)
      return response.data
    },

    // Reject an extraction attempt
    async rejectAttempt(courseCode, seedId, attemptId) {
      const response = await api.post(`/api/courses/${courseCode}/seeds/${seedId}/reject`, {
        attemptId
      })
      return response.data
    },

    // Trigger re-run for a SEED
    async rerunSeed(courseCode, seedId) {
      const response = await api.post(`/api/courses/${courseCode}/seeds/regenerate`, {
        seed_ids: [seedId]
      })
      // Clear cache since LEGO data will be regenerated
      await clearCourseCache(courseCode)
      return response.data
    },

    // Bulk re-run for multiple SEEDs
    async bulkRerun(courseCode, seedIds) {
      const response = await api.post(`/api/courses/${courseCode}/seeds/regenerate`, {
        seed_ids: seedIds
      })
      // Clear cache since LEGO data will be regenerated
      await clearCourseCache(courseCode)
      return response.data
    },

    // Bulk accept
    async bulkAccept(courseCode, seedIds) {
      const response = await api.post(`/api/courses/${courseCode}/seeds/bulk-accept`, {
        seedIds
      })
      // Clear cache since LEGO data changed
      await clearCourseCache(courseCode)
      return response.data
    },

    // APML v11.0: Regenerate Manifest (was Phase 7 in legacy versions)
    async regenerateManifest(courseCode) {
      const response = await api.post(`/api/courses/${courseCode}/regenerate/manifest`, {})
      // Clear cache since manifest will be regenerated
      await clearCourseCache(courseCode)
      return response.data
    },

    // Legacy alias for backward compatibility (Phase 7 → Manifest)
    async regeneratePhase7(courseCode) {
      return this.regenerateManifest(courseCode)
    },

    // Get a specific phase output file
    async getPhaseOutput(courseCode, phase, filename) {
      const response = await api.get(`/api/courses/${courseCode}/phase-outputs/${phase}/${filename}`)
      return response.data
    },

    // Save a specific phase output file
    async savePhaseOutput(courseCode, phase, filename, data) {
      const response = await api.put(`/api/courses/${courseCode}/phase-outputs/${phase}/${filename}`, data)
      // Clear cache since phase output was modified
      await clearCourseCache(courseCode)
      return response.data
    },

    // Remove SEED from corpus
    async removeSeed(courseCode, seedId) {
      const response = await api.delete(`/api/courses/${courseCode}/seeds/${seedId}`)
      // Clear cache since seed was removed
      await clearCourseCache(courseCode)
      return response.data
    },

    // Get prompt evolution data
    async getPromptEvolution(courseCode) {
      const response = await api.get(`/api/courses/${courseCode}/prompt-evolution`)
      return response.data
    },

    // Get learned rules
    async getLearnedRules(courseCode) {
      try {
        const response = await api.get(`/api/courses/${courseCode}/learned-rules`)
        return response.data
      } catch (error) {
        if (error.response?.status === 404) {
          return { rules: [] } // Return empty array if endpoint not implemented
        }
        throw error
      }
    },

    // Enable/disable a learned rule
    async toggleRule(courseCode, ruleId, enabled) {
      const response = await api.put(`/api/courses/${courseCode}/learned-rules/${ruleId}`, {
        enabled
      })
      return response.data
    },

    // Get experimental rules (A/B testing)
    async getExperimentalRules(courseCode) {
      const response = await api.get(`/api/courses/${courseCode}/experimental-rules`)
      return response.data
    },

    // Promote experimental rule to production
    async promoteRule(courseCode, ruleId) {
      const response = await api.post(`/api/courses/${courseCode}/experimental-rules/${ruleId}/promote`)
      return response.data
    },

    // Reject experimental rule
    async rejectRule(courseCode, ruleId) {
      const response = await api.delete(`/api/courses/${courseCode}/experimental-rules/${ruleId}`)
      return response.data
    },

    // Get course health report
    async getHealthReport(courseCode) {
      try {
        const response = await api.get(`/api/courses/${courseCode}/health`)
        return response.data
      } catch (error) {
        if (error.response?.status === 404) {
          return { health: 'unknown', message: 'Health endpoint not available' }
        }
        throw error
      }
    },

    // Get quality trend data
    async getQualityTrend(courseCode, days = 30) {
      try {
        const response = await api.get(`/api/courses/${courseCode}/quality/trend`, {
          params: { days }
        })
        return response.data
      } catch (error) {
        if (error.response?.status === 404) {
          return { trend: [], message: 'Trend data not available' }
        }
        throw error
      }
    },

    // Export quality report
    async exportReport(courseCode, format = 'csv') {
      const response = await api.get(`/api/courses/${courseCode}/quality/export`, {
        params: { format },
        responseType: 'blob'
      })
      return response.data
    },

    // Rollback to previous prompt version
    async rollbackPrompt(courseCode, version) {
      const response = await api.post(`/api/courses/${courseCode}/prompts/rollback`, {
        version
      })
      return response.data
    }
  },

  // Audio management
  audio: {
    // Check which audio files exist in S3
    async checkS3(sampleIds) {
      const response = await api.post('/api/audio/check-s3', {
        sampleIds
      })
      return response.data
    },

    // Generate missing audio files
    async generateMissing(missingAudio) {
      const response = await api.post('/api/audio/generate-missing', {
        missingAudio
      })
      return response.data
    },

    // Get generation status
    async getGenerationStatus(jobId) {
      const response = await api.get(`/api/audio/generation-status/${jobId}`)
      return response.data
    }
  },

  // Manifest management
  async regenerateManifest() {
    const response = await api.post('/api/regenerate-manifest')
    return response.data
  },

  // GitHub publishing
  async pushToGitHub(courseCode, message = null) {
    const response = await api.post('/api/push-to-github', {
      courseCode,
      message
    })
    return response.data
  },

  async pushAllCourses() {
    const response = await api.post('/api/push-all-courses')
    return response.data
  },

  // =============================================================================
  // APML v11.0: Audio Generation (was Phase 8 in legacy versions)
  // =============================================================================

  // Get available voices from voices.json (for voice selection UI)
  async getAvailableVoices() {
    const response = await api.get('/api/audio/voices')
    return response.data
  },

  // Get Audio generation plan (costs, time estimates, preflight checks)
  async getAudioPlan(courseCode, options = {}) {
    const response = await api.post('/api/audio/plan', {
      courseCode,
      voices: options.voices || null, // Voice overrides to calculate accurate cost
      options: {
        skipSync: options.skipSync || false,
        skipDedup: options.skipDedup || false,
        forceRefresh: options.forceRefresh || false
      }
    })
    return response.data
  },

  // Start Audio generation (requires plan first, or approved: true to skip)
  async startAudioGeneration(courseCode, options = {}) {
    // Call through orchestrator proxy (works from Vercel via ngrok)
    const response = await api.post('/api/audio/start', {
      courseCode,
      approved: options.approved || false,  // Set true after reviewing plan
      voices: options.voices || null,  // Optional voice overrides {target1, target2, source, presentation}
      options: {
        phase: options.phase || 'auto',  // 'auto', 'targets', or 'presentations'
        skipUpload: options.skipUpload || false,
        skipQC: options.skipQC || false,
        uploadBucket: options.uploadBucket || 'stage',
        force: options.force || false
      }
    })
    return response.data
  },

  // Get Audio job status
  async getAudioStatus(courseCode) {
    const response = await api.get(`/api/audio/status/${courseCode}`)
    return response.data
  },

  // Get real-time Audio generation progress
  async getAudioProgress(courseCode) {
    const response = await api.get(`/api/audio/progress/${courseCode}`)
    return response.data
  },

  // Continue Audio processing after QC approval
  async continueAudioProcessing(courseCode, options = {}) {
    const response = await api.post('/api/audio/continue', {
      courseCode,
      options
    })
    return response.data
  },

  // Regenerate specific Audio samples
  async regenerateAudioSamples(courseCode, uuids) {
    const response = await api.post('/api/audio/regenerate', {
      courseCode,
      uuids
    })
    return response.data
  },

  // Get Audio QC report
  async getAudioQCReport(courseCode) {
    const response = await api.get(`/api/audio/qc-report/${courseCode}`)
    return response.data
  },

  // =============================================================================
  // Legacy aliases for backward compatibility (Phase 8 → Audio)
  // =============================================================================
  async startPhase8Audio(courseCode, options = {}) {
    return this.startAudioGeneration(courseCode, options)
  },
  async getPhase8Status(courseCode) {
    return this.getAudioStatus(courseCode)
  },
  async continuePhase8Processing(courseCode, options = {}) {
    return this.continueAudioProcessing(courseCode, options)
  },
  async regeneratePhase8Samples(courseCode, uuids) {
    return this.regenerateAudioSamples(courseCode, uuids)
  },
  async getPhase8QCReport(courseCode) {
    return this.getAudioQCReport(courseCode)
  },

  // ============================================================================
  // AUDIO QA ENDPOINTS
  // ============================================================================

  // Get a random audio sample by role from course manifest
  async getRandomAudioSample(courseCode, role) {
    const response = await api.get(`/api/audio/random-sample/${courseCode}/${role}`)
    return response.data
  },

  // Get a random complete learning cycle (source + target1 + target2)
  async getRandomLearningCycle(courseCode) {
    const response = await api.get(`/api/audio/random-cycle/${courseCode}`)
    return response.data
  },

  // Get audio stream URL for a sample UUID
  // Direct S3 access - no API proxy needed (like learning app)
  getAudioStreamUrl(uuid) {
    if (!uuid) return ''
    // Resolve through course_audio.s3_key — NEVER by convention.
    //
    // This used to return `mastered/<uuid>.mp3`, which assumed a clip's S3 key
    // equals its row id. The versioned no-holes swap breaks that assumption on
    // purpose: the row id stays put so no FK moves, and the s3_key changes. So
    // the old convention served the PRE-SWAP object for ever, which is why
    // replaced clips still sounded identical in Audio Preview and the cycle
    // player. The endpoint below reads s3_key and 302s to a signed URL.
    return `${API_BASE_URL}/api/production/audio/${uuid}/stream`
  },

  // Flag a sample for review
  async flagAudioSample(courseCode, uuid, reason = '') {
    const response = await api.post('/api/audio/flag-sample', {
      courseCode,
      uuid,
      reason
    })
    return response.data
  },

  // Lookup audio UUIDs by known and target text
  async lookupAudio(courseCode, knownText, targetText) {
    const response = await api.post(`/api/audio/lookup/${courseCode}`, {
      knownText,
      targetText
    })
    return response.data
  },

  // ============================================================================
  // DOCUMENTATION API
  // ============================================================================

  /**
   * Get documentation list for navigation
   * @param {string} [category] - Optional category filter ('reference', 'course-content', 'architecture', 'tutorial')
   * @returns {Promise<{success: boolean, count: number, documents: Array}>}
   */
  async getDocumentationList(category = null) {
    const params = category ? { category } : {}
    const response = await api.get('/api/docs/list', { params })
    return response.data
  },

  /**
   * Get documentation by slug with all sections
   * @param {string} slug - Document slug (e.g., 'pedagogy', 'apml-spec')
   * @returns {Promise<{success: boolean, document: Object}>}
   */
  async getDocumentation(slug) {
    const response = await api.get(`/api/docs/${slug}`)
    return response.data
  }
}
