import axios from 'axios'
import { getCachedCourse, setCachedCourse, clearCourseCache, isCacheValid, clearAllCache, getCacheStats, cleanupExpiredCache } from './courseCache.js'
import { GITHUB_CONFIG } from '../config/github.js'

// API Base URL - reads from localStorage (set by EnvironmentSwitcher), then env, then default
function getApiBaseUrl() {
  // Check localStorage for user-selected environment
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) {
    return storedUrl
  }

  // Fall back to environment variable or default
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
}

const API_BASE_URL = getApiBaseUrl()

// GitHub raw content base URL for course data
const GITHUB_VFS_BASE = GITHUB_CONFIG.coursesPath

const api = axios.create({
  baseURL: API_BASE_URL,
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

  // Course generation
  course: {
    // Initialize cache for baskets to avoid re-fetching 5MB files
    _basketsCache: {},

    async generate({ target, known, seeds, startSeed, endSeed, executionMode = 'web', phaseSelection = 'all', segmentMode = 'single', force = false, stagingOnly = false }) {
      // APML v9.0: Route Phase 3 (Basket Generation) requests to the basket server
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

    async list() {
      // ALWAYS use static manifest (GitHub is single source of truth)
      // This ensures everyone (Tom, Kai, anyone) sees the same courses
      // Differences only appear temporarily until changes are pushed to GitHub
      console.log('[API] Loading courses from static manifest (GitHub SSoT)')

      try {
        // Use pre-generated manifest (created at build time by generate-course-manifest.js)
        const manifestRes = await fetch(GITHUB_CONFIG.manifestUrl)
        if (manifestRes.ok) {
          const manifest = await manifestRes.json()
          console.log(`[API] Loaded ${manifest.courses.length} courses from manifest (generated ${manifest.generated_at})`)

          // Transform manifest format to API format
          // Show courses with any pipeline output files (baskets, seed_pairs, or lego_pairs)
          const courses = manifest.courses
            .filter(course =>
              course.has_baskets ||
              course.files?.seed_pairs ||
              course.files?.lego_pairs
            )
            .map(course => ({
              course_code: course.course_code,
              source_language: course.source_language,
              target_language: course.target_language,
              total_seeds: course.total_seeds,
              version: course.format,
              created_at: new Date().toISOString(),
              status: course.phase || 'unknown',
              seed_pairs: course.actual_seed_count,
              lego_pairs: course.lego_count,
              lego_baskets: course.basket_count || 0,
              amino_acids: {
                introductions: course.introductions_count || 0
              },
              phases_completed: course.phases_completed || []
            }))

          return { courses }
        }

        // Manifest fetch failed
        throw new Error('Failed to fetch courses manifest')
      } catch (err) {
        console.error('[API] Failed to load course manifest:', err)
        throw err
      }
    },

    async get(courseCode) {
      // Check cache first
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
        const matchStandard = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_?(\d+)?seeds?/)
        const matchBasic = courseCode.match(/^([a-z]{3})_for_([a-z]{3})/)
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
          if (baskets.length > 0) phasesCompleted.push('5')
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

      // ALWAYS use static files (GitHub SSoT)
      // Don't try API server - ensures everyone sees same data
      console.log(`[API] Loading ${courseCode} from static files (GitHub SSoT)`)

      try {
        // Try to load all possible phase output files
        // seed_pairs.json, lego_pairs.json, lego_baskets.json are all optional now
        let seedPairsData = null
        let legoPairsData = null
        let legoBasketsData = null
        let introductionsData = null

        // Try seed_pairs.json (Phase 1)
        try {
          const res = await fetch(GITHUB_CONFIG.getCourseFileUrl(courseCode, 'seed_pairs.json'))
          if (res.ok) seedPairsData = await res.json()
        } catch (e) {
          console.log(`[API] No seed_pairs.json for ${courseCode}`)
        }

        // Try lego_pairs.json (Phase 3)
        try {
          const res = await fetch(GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_pairs.json'))
          if (res.ok) legoPairsData = await res.json()
        } catch (e) {
          console.log(`[API] No lego_pairs.json for ${courseCode}`)
        }

        // Try lego_baskets.json (Phase 5)
        try {
          const res = await fetch(GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_baskets.json'))
          if (res.ok) legoBasketsData = await res.json()
        } catch (e) {
          console.log(`[API] No lego_baskets.json for ${courseCode}`)
        }

        // Try introductions.json (Phase 6)
        try {
          const res = await fetch(GITHUB_CONFIG.getCourseFileUrl(courseCode, 'introductions.json'))
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
          const matchStandard = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_?(\d+)?seeds?/)
          const matchBasic = courseCode.match(/^([a-z]{3})_for_([a-z]{3})/)
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
            if (basketCount > 0) phasesCompleted.push('5')
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

        // Files not found
        throw new Error(`Course files not found for ${courseCode}`)
      } catch (err) {
        console.error(`[API] Failed to load course ${courseCode}:`, err)
        throw err
      }
    },

    async traceProvenance(courseCode, seedId) {
      // Use static files directly (provenance endpoint not available on Vercel)
      const seedPairsRes = await fetch(GITHUB_CONFIG.getCourseFileUrl(courseCode, 'seed_pairs.json'))
      const legoPairsRes = await fetch(GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_pairs.json'))

      if (!seedPairsRes.ok || !legoPairsRes.ok) {
        throw new Error(`Failed to load course data for ${courseCode}`)
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
      // ALWAYS use static files (GitHub SSoT)
      console.log(`[API] Loading basket ${seedId} from static files (GitHub SSoT)`)

      try {
        // Load from merged lego_baskets.json (Phase 5+ format)
        // Cache it to avoid re-fetching the 5MB file for every seed
        if (!this._basketsCache[courseCode]) {
          console.log(`[API] Fetching lego_baskets.json for ${courseCode} (not cached)`)
          // Add cache-busting to bypass GitHub CDN cache
          const basketsRes = await fetch(`${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_baskets.json')}?t=${Date.now()}`)
          if (basketsRes.ok) {
            this._basketsCache[courseCode] = await basketsRes.json()
          } else {
            throw new Error('lego_baskets.json not found')
          }
        }

        const allBaskets = this._basketsCache[courseCode]

        // Find basket by seedId in baskets object
        // Baskets are keyed like "S0001L01", "S0001L02" etc - find all for this seed
        const seedBaskets = {}
        for (const [key, basketData] of Object.entries(allBaskets.baskets || {})) {
          if (key.startsWith(seedId)) {
            seedBaskets[key] = basketData
          }
        }

        if (Object.keys(seedBaskets).length > 0) {
          console.log(`[API] ✓ Found ${Object.keys(seedBaskets).length} basket(s) for ${seedId} in ${courseCode}`)
        } else {
          console.warn(`[API] ⚠️  MISSING BASKET: ${seedId} not found in ${courseCode}/lego_baskets.json`)
        }

        if (Object.keys(seedBaskets).length > 0) {
          // Get seed_pair from seed_pairs.json
          const seedPairsRes = await fetch(GITHUB_CONFIG.getCourseFileUrl(courseCode, 'seed_pairs.json'))
          let seedPair = null
          if (seedPairsRes.ok) {
            const seedPairsData = await seedPairsRes.json()
            const translation = seedPairsData.translations?.[seedId]
            if (translation) {
              // Handle both old array format and new object format (APML v8.2.0+)
              if (Array.isArray(translation)) {
                // Old format: ["known", "target"]
                seedPair = {
                  target: translation[1],
                  known: translation[0]
                }
              } else {
                // New format: {target: "...", known: "..."}
                seedPair = {
                  target: translation.target,
                  known: translation.known
                }
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
          }
        }

        throw new Error(`Basket not found for ${seedId}`)
      } catch (err) {
        console.error(`[API] Failed to fetch basket for ${seedId}:`, err)
        throw err
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

    // APML v9.0: Regenerate Manifest (was Phase 7 in legacy versions)
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
  // APML v9.0: Audio Generation (was Phase 8 in legacy versions)
  // =============================================================================

  // Start Audio generation
  async startAudioGeneration(courseCode, options = {}) {
    // Call through orchestrator proxy (works from Vercel via ngrok)
    const response = await api.post('/api/audio/start', {
      courseCode,
      options: {
        phase: options.phase || 'auto',  // 'auto', 'targets', or 'presentations'
        skipUpload: options.skipUpload || false,
        skipQC: options.skipQC || false,
        uploadBucket: options.uploadBucket || 'stage'
      }
    })
    return response.data
  },

  // Get Audio job status
  async getAudioStatus(courseCode) {
    const response = await api.get(`/api/audio/status/${courseCode}`)
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

  // Get audio stream URL for a sample UUID
  getAudioStreamUrl(uuid) {
    return `${API_URL}/api/audio/stream/${uuid}`
  },

  // Flag a sample for review
  async flagAudioSample(courseCode, uuid, reason = '') {
    const response = await api.post('/api/audio/flag-sample', {
      courseCode,
      uuid,
      reason
    })
    return response.data
  }
}
