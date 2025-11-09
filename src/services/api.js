import axios from 'axios'
import { getCachedCourse, setCachedCourse, clearCourseCache, isCacheValid, clearAllCache, getCacheStats, cleanupExpiredCache } from './courseCache.js'

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
    async generate({ target, known, seeds, startSeed, endSeed, executionMode = 'local' }) {
      const response = await api.post('/api/courses/generate', {
        target,
        known,
        seeds,
        startSeed,
        endSeed,
        executionMode
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

    async list() {
      try {
        // Try API server first (for real-time updates)
        const response = await api.get('/api/courses')
        return response.data
      } catch (err) {
        // Fallback to static files if API unavailable
        console.log('[API] Server unavailable, using static course manifest')

        try {
          // Use pre-generated manifest (created at build time by generate-course-manifest.js)
          const manifestRes = await fetch('/vfs/courses-manifest.json')
          if (manifestRes.ok) {
            const manifest = await manifestRes.json()
            console.log(`[API] Loaded ${manifest.courses.length} courses from manifest (generated ${manifest.generated_at})`)

            // Transform manifest format to API format
            const courses = manifest.courses.map(course => ({
              course_code: course.course_code,
              source_language: course.source_language,
              target_language: course.target_language,
              total_seeds: course.total_seeds,
              version: course.format,
              created_at: new Date().toISOString(),
              status: 'phase_3_complete',
              seed_pairs: course.actual_seed_count,
              lego_pairs: course.lego_count,
              lego_baskets: course.has_baskets ? 1 : 0,
              phases_completed: ['1', '3']
            }))

            return { courses }
          }
        } catch (manifestErr) {
          console.error('[API] Failed to load course manifest:', manifestErr)
        }

        // If both fail, throw the original API error
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

        // Convert v7.7 format translations object to array
        const translationsObj = seedPairsData.translations || {}
        const translations = Object.entries(translationsObj).map(([seed_id, [target_phrase, known_phrase]]) => ({
          seed_id,
          target_phrase,
          known_phrase,
          canonical_seed: null
        }))
        translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id))

        // Convert lego_pairs to flat array - handle both v7.7 and v5.0.1 formats
        const seedsArray = legoPairsData.seeds || []
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

        const course = {
          course_code: courseCode,
          source_language: match ? match[2].toUpperCase() : 'UNK',
          target_language: match ? match[1].toUpperCase() : 'UNK',
          total_seeds: matchStandard?.[3] ? parseInt(matchStandard[3]) : translations.length,
          version: cachedData.version,
          created_at: new Date(cachedData.cachedAt).toISOString(),
          status: 'phase_3_complete',
          seed_pairs: translations.length,
          lego_pairs: legos.length,
          lego_baskets: baskets.length,
          phases_completed: ['1', '3'],
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

      try {
        // Try API server first
        const response = await api.get(`/api/courses/${courseCode}`)
        const data = response.data

        // Cache the API response
        if (data.course && data.course.version) {
          // Convert translations array back to v7.7 format for caching
          const translationsObj = {}
          if (data.translations) {
            for (const trans of data.translations) {
              translationsObj[trans.seed_id] = [trans.target_phrase, trans.known_phrase]
            }
          }

          await setCachedCourse(courseCode, data.course.version, {
            seedPairs: { translations: translationsObj },
            legoPairs: { seeds: data.lego_breakdowns || [] },
            legoBaskets: data.baskets || []
          }).catch(err => {
            console.warn('[API] Failed to cache course data:', err)
          })
        }

        return data
      } catch (err) {
        // Fallback to static files if API unavailable
        console.log(`[API] Server unavailable, using static files for ${courseCode}`)

        const seedPairsRes = await fetch(`/vfs/courses/${courseCode}/seed_pairs.json`)
        const legoPairsRes = await fetch(`/vfs/courses/${courseCode}/lego_pairs.json`)

        if (seedPairsRes.ok && legoPairsRes.ok) {
          const seedPairsData = await seedPairsRes.json()
          const legoPairsData = await legoPairsRes.json()

          // Convert v7.7 format translations object to array
          // Input: { translations: { "S0001": ["target", "known"], ... } }
          // Output: [{ seed_id: "S0001", target_phrase: "...", known_phrase: "..." }, ...]
          const translationsObj = seedPairsData.translations || {}
          const translations = Object.entries(translationsObj).map(([seed_id, [target_phrase, known_phrase]]) => ({
            seed_id,
            target_phrase,
            known_phrase,
            canonical_seed: null
          }))

          translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id))

          // Convert lego_pairs to flat array - handle both v7.7 and v5.0.1 formats
          const seedsArray = legoPairsData.seeds || []
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

          // Flexible course code parsing (same as list())
          const matchStandard = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_?(\d+)?seeds?/)
          const matchBasic = courseCode.match(/^([a-z]{3})_for_([a-z]{3})/)
          const match = matchStandard || matchBasic

          const course = {
            course_code: courseCode,
            source_language: match ? match[2].toUpperCase() : 'UNK',
            target_language: match ? match[1].toUpperCase() : 'UNK',
            total_seeds: matchStandard?.[3] ? parseInt(matchStandard[3]) : translations.length,
            version: '1.0',
            created_at: new Date().toISOString(),
            status: 'phase_3_complete',
            seed_pairs: translations.length,
            lego_pairs: legos.length,
            lego_baskets: 0,
            phases_completed: ['1', '3'],
            target_language_name: match ? match[1] : 'unknown',
            known_language_name: match ? match[2] : 'unknown'
          }

          const result = {
            course,
            translations,
            legos,
            lego_breakdowns: seedsArray, // Raw v7.7 format for visualizer
            baskets: []
          }

          // Cache the static file data
          await setCachedCourse(courseCode, course.version, {
            seedPairs: seedPairsData,
            legoPairs: legoPairsData,
            legoBaskets: []
          }).catch(err => {
            console.warn('[API] Failed to cache course data:', err)
          })

          return result
        }

        throw err
      }
    },

    async traceProvenance(courseCode, seedId) {
      try {
        // Try API server first
        const response = await api.get(`/api/courses/${courseCode}/provenance/${seedId}`)
        return response.data
      } catch (err) {
        // Fallback to static files if API unavailable
        console.log(`[API] Server unavailable, using static files for provenance ${courseCode}/${seedId}`)

        const seedPairsRes = await fetch(`/vfs/courses/${courseCode}/seed_pairs.json`)
        const legoPairsRes = await fetch(`/vfs/courses/${courseCode}/lego_pairs.json`)

        if (seedPairsRes.ok && legoPairsRes.ok) {
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

          // Find LEGO breakdown in v7.7 format
          const seedsArray = legoPairsData.seeds || []
          const legoBreakdown = seedsArray.find(([seed_id]) => seed_id === seedId)

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
        }

        throw err
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

    async getBasket(courseCode, seedId) {
      try {
        // Try API server first
        const response = await api.get(`/api/courses/${courseCode}/baskets/${seedId}`)
        return response.data
      } catch (err) {
        // Fallback to static basket files in VFS structure
        console.log(`[API] Server unavailable, using static basket file for ${seedId}`)

        try {
          const basketRes = await fetch(`/vfs/courses/${courseCode}/baskets/lego_baskets_${seedId.toLowerCase()}.json`)
          if (basketRes.ok) {
            const basketData = await basketRes.json()
            return basketData
          }
        } catch (basketErr) {
          console.error('[API] Failed to load basket from VFS:', basketErr)
        }

        throw err
      }
    },

    async saveBasket(courseCode, seedId, basketData) {
      const response = await api.put(`/api/courses/${courseCode}/baskets/${seedId}`, basketData)
      return response.data
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
  }
}
