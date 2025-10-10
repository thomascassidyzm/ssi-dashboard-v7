import axios from 'axios'

// API Base URL - set this to your ngrok URL when running locally
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
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
    }
  }
}
