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
      const response = await api.get('/api/courses')
      return response.data
    },

    async get(courseCode) {
      const response = await api.get(`/api/courses/${courseCode}`)
      return response.data
    },

    async traceProvenance(courseCode, seedId) {
      const response = await api.get(`/api/courses/${courseCode}/provenance/${seedId}`)
      return response.data
    },

    async updateTranslation(courseCode, uuid, data) {
      const response = await api.put(`/api/courses/${courseCode}/translations/${uuid}`, data)
      return response.data
    }
  },

  // Quality review and self-healing
  quality: {
    // Get quality overview for a course
    async getOverview(courseCode) {
      const response = await api.get(`/api/quality/${courseCode}/overview`)
      return response.data
    },

    // Get all SEEDs with quality data
    async getSeeds(courseCode, filters = {}) {
      const response = await api.get(`/api/quality/${courseCode}/seeds`, { params: filters })
      return response.data
    },

    // Get detailed quality data for a specific SEED
    async getSeedDetail(courseCode, seedId) {
      const response = await api.get(`/api/quality/${courseCode}/seeds/${seedId}`)
      return response.data
    },

    // Get all extraction attempts for a SEED
    async getSeedAttempts(courseCode, seedId) {
      const response = await api.get(`/api/quality/${courseCode}/seeds/${seedId}/attempts`)
      return response.data
    },

    // Accept an extraction attempt
    async acceptAttempt(courseCode, seedId, attemptId) {
      const response = await api.post(`/api/quality/${courseCode}/seeds/${seedId}/accept`, {
        attemptId
      })
      return response.data
    },

    // Reject an extraction attempt
    async rejectAttempt(courseCode, seedId, attemptId) {
      const response = await api.post(`/api/quality/${courseCode}/seeds/${seedId}/reject`, {
        attemptId
      })
      return response.data
    },

    // Trigger re-run for a SEED
    async rerunSeed(courseCode, seedId) {
      const response = await api.post(`/api/quality/${courseCode}/seeds/${seedId}/rerun`)
      return response.data
    },

    // Bulk re-run for multiple SEEDs
    async bulkRerun(courseCode, seedIds) {
      const response = await api.post(`/api/quality/${courseCode}/seeds/bulk-rerun`, {
        seedIds
      })
      return response.data
    },

    // Bulk accept
    async bulkAccept(courseCode, seedIds) {
      const response = await api.post(`/api/quality/${courseCode}/seeds/bulk-accept`, {
        seedIds
      })
      return response.data
    },

    // Remove SEED from corpus
    async removeSeed(courseCode, seedId) {
      const response = await api.delete(`/api/quality/${courseCode}/seeds/${seedId}`)
      return response.data
    },

    // Get prompt evolution data
    async getPromptEvolution(courseCode) {
      const response = await api.get(`/api/quality/${courseCode}/prompt-evolution`)
      return response.data
    },

    // Get learned rules
    async getLearnedRules(courseCode) {
      const response = await api.get(`/api/quality/${courseCode}/learned-rules`)
      return response.data
    },

    // Enable/disable a learned rule
    async toggleRule(courseCode, ruleId, enabled) {
      const response = await api.put(`/api/quality/${courseCode}/learned-rules/${ruleId}`, {
        enabled
      })
      return response.data
    },

    // Get experimental rules (A/B testing)
    async getExperimentalRules(courseCode) {
      const response = await api.get(`/api/quality/${courseCode}/experimental-rules`)
      return response.data
    },

    // Promote experimental rule to production
    async promoteRule(courseCode, ruleId) {
      const response = await api.post(`/api/quality/${courseCode}/experimental-rules/${ruleId}/promote`)
      return response.data
    },

    // Reject experimental rule
    async rejectRule(courseCode, ruleId) {
      const response = await api.delete(`/api/quality/${courseCode}/experimental-rules/${ruleId}`)
      return response.data
    },

    // Get course health report
    async getHealthReport(courseCode) {
      const response = await api.get(`/api/quality/${courseCode}/health`)
      return response.data
    },

    // Get quality trend data
    async getQualityTrend(courseCode, days = 30) {
      const response = await api.get(`/api/quality/${courseCode}/trend`, {
        params: { days }
      })
      return response.data
    },

    // Export quality report
    async exportReport(courseCode, format = 'csv') {
      const response = await api.get(`/api/quality/${courseCode}/export`, {
        params: { format },
        responseType: 'blob'
      })
      return response.data
    },

    // Rollback to previous prompt version
    async rollbackPrompt(courseCode, version) {
      const response = await api.post(`/api/quality/${courseCode}/rollback`, {
        version
      })
      return response.data
    }
  }
}
