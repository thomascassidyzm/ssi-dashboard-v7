import { ref } from 'vue'
import { io } from 'socket.io-client'

export function useTextGenSocket() {
  let socket = null
  let connected = false

  const lastSeedComplete = ref(null)
  const lastBuildStatus = ref(null)
  const lastQaUpdate = ref(null)
  const lastGoldenUpdate = ref(null)
  const lastPipelineStage = ref(null)
  const detectiveFindings = ref(null)
  const lastOrchestratorMessage = ref(null)
  const lastOrchestratorResponse = ref(null)

  function getWsUrl() {
    const stored = localStorage.getItem('api_base_url')
    if (stored) return stored
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (isLocal) return 'http://localhost:3470'
    return window.location.origin
  }

  function connect(courseCode) {
    if (socket && connected) return
    if (socket) { socket.disconnect(); socket = null }

    const wsUrl = getWsUrl()
    socket = io(wsUrl, {
      path: '/api/production/websocket',
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('[TextGenSocket] Connected')
      connected = true
      socket.emit('join_course', { courseCode })
    })

    socket.on('connect_error', (err) => {
      console.error('[TextGenSocket] Connection error:', err.message)
    })

    socket.on('disconnect', (reason) => {
      console.log('[TextGenSocket] Disconnected:', reason)
      connected = false
    })

    socket.on('seed:complete', (data) => { lastSeedComplete.value = data })
    socket.on('seed:lego_complete', (data) => { lastSeedComplete.value = data })
    socket.on('build:status', (data) => { lastBuildStatus.value = data })
    socket.on('qa:update', (data) => { lastQaUpdate.value = data })
    socket.on('golden:update', (data) => { lastGoldenUpdate.value = data })
    socket.on('pipeline:stage', (data) => { lastPipelineStage.value = data })
    socket.on('detective:report', (data) => { detectiveFindings.value = data })
    socket.on('orchestrator:message', (data) => { lastOrchestratorMessage.value = data })
    socket.on('orchestrator:response', (data) => { lastOrchestratorResponse.value = data })
  }

  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
      connected = false
    }
  }

  return {
    connect,
    disconnect,
    lastSeedComplete,
    lastBuildStatus,
    lastQaUpdate,
    lastGoldenUpdate,
    lastPipelineStage,
    detectiveFindings,
    lastOrchestratorMessage,
    lastOrchestratorResponse,
  }
}
