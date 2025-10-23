import axios from 'axios'

// API Base URL - set this to your ngrok URL when running locally
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'

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
    async generate({ target, known, seeds }) {
      const response = await api.post('/api/courses/generate', {
        target,
        known,
        seeds
      })
      return response.data
    },

    async getStatus(courseCode) {
      const response = await api.get(`/api/courses/${courseCode}/status`)
      return response.data
    },

    async list() {
      try {
        // Try API server first (for real-time updates)
        const response = await api.get('/api/courses')
        return response.data
      } catch (err) {
        // Fallback to static files if API unavailable
        console.log('[API] Server unavailable, using static files')

        const courseCodes = ['spa_for_eng_30seeds', 'fra_for_eng_30seeds', 'ita_for_eng_30seeds', 'cmn_for_eng_30seeds']
        const courses = []

        for (const courseCode of courseCodes) {
          try {
            const translationsRes = await fetch(`/vfs/courses/${courseCode}/translations.json`)
            const legosRes = await fetch(`/vfs/courses/${courseCode}/LEGO_BREAKDOWNS_COMPLETE.json`)

            if (translationsRes.ok && legosRes.ok) {
              const translations = await translationsRes.json()
              const legoData = await legosRes.json()

              const match = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_(\\d+)seeds$/)

              courses.push({
                course_code: courseCode,
                source_language: match ? match[2].toUpperCase() : 'UNK',
                target_language: match ? match[1].toUpperCase() : 'UNK',
                total_seeds: match ? parseInt(match[3]) : 0,
                version: '1.0',
                created_at: new Date().toISOString(),
                status: 'phase_3_complete',
                seed_pairs: Object.keys(translations).length,
                lego_pairs: legoData.lego_breakdowns?.length || 0,
                lego_baskets: 0,
                phases_completed: ['1', '3']
              })
            }
          } catch (staticErr) {
            // Skip courses that don't have the required files
          }
        }

        if (courses.length > 0) {
          return { courses }
        }

        // If both fail, throw the original API error
        throw err
      }
    },

    async get(courseCode) {
      try {
        // Try API server first
        const response = await api.get(`/api/courses/${courseCode}`)
        return response.data
      } catch (err) {
        // Fallback to static files if API unavailable
        console.log(`[API] Server unavailable, using static files for ${courseCode}`)

        const translationsRes = await fetch(`/vfs/courses/${courseCode}/translations.json`)
        const legosRes = await fetch(`/vfs/courses/${courseCode}/LEGO_BREAKDOWNS_COMPLETE.json`)

        if (translationsRes.ok && legosRes.ok) {
          const translationsData = await translationsRes.json()
          const legoData = await legosRes.json()

          // Convert translations object to array
          const translations = Object.entries(translationsData).map(([seed_id, [target_phrase, known_phrase]]) => ({
            seed_id,
            target_phrase,
            known_phrase,
            canonical_seed: null
          }))

          translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id))

          const legos = legoData.lego_breakdowns || []
          const match = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_(\\d+)seeds$/)

          const course = {
            course_code: courseCode,
            source_language: match ? match[2].toUpperCase() : 'UNK',
            target_language: match ? match[1].toUpperCase() : 'UNK',
            total_seeds: match ? parseInt(match[3]) : 0,
            version: '1.0',
            created_at: new Date().toISOString(),
            status: 'phase_3_complete',
            seed_pairs: translations.length,
            lego_pairs: legos.length,
            lego_baskets: 0,
            phases_completed: ['1', '3'],
            target_language_name: legoData.target_language,
            known_language_name: legoData.known_language
          }

          return {
            course,
            translations,
            legos,
            baskets: []
          }
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

        const translationsRes = await fetch(`/vfs/courses/${courseCode}/translations.json`)
        const legosRes = await fetch(`/vfs/courses/${courseCode}/LEGO_BREAKDOWNS_COMPLETE.json`)

        if (translationsRes.ok && legosRes.ok) {
          const translationsData = await translationsRes.json()
          const legoData = await legosRes.json()

          const translationPair = translationsData[seedId]
          if (!translationPair) {
            throw new Error(`Seed ${seedId} not found`)
          }

          const translation = {
            seed_id: seedId,
            target_phrase: translationPair[0],
            known_phrase: translationPair[1]
          }

          const legoBreakdown = legoData.lego_breakdowns?.find(l => l.seed_id === seedId)

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
      return response.data
    },

    async getRegenerationStatus(courseCode, jobId) {
      const response = await api.get(`/api/courses/${courseCode}/regeneration/${jobId}`)
      return response.data
    },

    async compile(courseCode) {
      const response = await api.post(`/api/courses/${courseCode}/compile`)
      return response.data
    },

    async deploy(courseCode, courseJSON) {
      const response = await api.post(`/api/courses/${courseCode}/deploy`, {
        courseJSON
      })
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
      return response.data
    },

    // Bulk re-run for multiple SEEDs
    async bulkRerun(courseCode, seedIds) {
      const response = await api.post(`/api/courses/${courseCode}/seeds/regenerate`, {
        seed_ids: seedIds
      })
      return response.data
    },

    // Bulk accept
    async bulkAccept(courseCode, seedIds) {
      const response = await api.post(`/api/courses/${courseCode}/seeds/bulk-accept`, {
        seedIds
      })
      return response.data
    },

    // Remove SEED from corpus
    async removeSeed(courseCode, seedId) {
      const response = await api.delete(`/api/courses/${courseCode}/seeds/${seedId}`)
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
