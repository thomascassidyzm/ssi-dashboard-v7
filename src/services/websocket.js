// src/services/websocket.js
import io from 'socket.io-client'
import { useProductionStore } from '@/stores/production'

let socket = null

export function initWebSocket(serverUrl = '') {
  if (socket) {
    socket.disconnect()
  }

  socket = io(serverUrl || window.location.origin, {
    path: '/api/production/websocket',
    transports: ['websocket', 'polling']
  })

  const store = useProductionStore()

  socket.on('connect', () => {
    console.log('[WS] Connected to production server')
    store.setWsConnected(true)
  })

  socket.on('disconnect', () => {
    console.log('[WS] Disconnected from production server')
    store.setWsConnected(false)
  })

  socket.on('sample_updated', (data) => {
    console.log('[WS] Sample updated:', data.uuid)
    store.handleWebSocketUpdate({ type: 'sample_updated', ...data })
  })

  socket.on('pipeline_progress', (data) => {
    console.log('[WS] Pipeline progress:', data)
    // Emit custom event for components to listen
    window.dispatchEvent(new CustomEvent('pipeline_progress', { detail: data }))
  })

  socket.on('generation_complete', (data) => {
    console.log('[WS] Generation complete:', data.uuid)
    store.handleWebSocketUpdate({ type: 'audio_metadata_updated', ...data })
  })

  socket.on('recording_completed', (data) => {
    console.log('[WS] Recording completed:', data.uuid)
    store.handleWebSocketUpdate({ type: 'audio_metadata_updated', ...data })
  })

  socket.on('error', (error) => {
    console.error('[WS] Error:', error)
  })

  return socket
}

export function getSocket() {
  return socket
}

export function joinCourseRoom(courseCode) {
  if (socket && socket.connected) {
    socket.emit('join_course', { courseCode })
  }
}

export function leaveCourseRoom(courseCode) {
  if (socket && socket.connected) {
    socket.emit('leave_course', { courseCode })
  }
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
