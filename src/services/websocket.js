/**
 * WebSocket Service for Course Production Suite
 * Handles real-time updates for audio pipeline, sample flags, and collaboration
 */

let socket = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000

// Event handlers
const handlers = {
  onConnect: [],
  onDisconnect: [],
  onMessage: [],
  onError: []
}

/**
 * Initialize WebSocket connection
 * @param {string} baseUrl - Optional WebSocket server URL
 */
export function initWebSocket(baseUrl = null) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected')
    return
  }

  // Determine WebSocket URL
  const wsUrl = baseUrl || getWebSocketUrl()

  try {
    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log('WebSocket connected')
      reconnectAttempts = 0
      handlers.onConnect.forEach(handler => handler())

      // Emit connected event
      window.dispatchEvent(new CustomEvent('ws_connected'))
    }

    socket.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason)
      handlers.onDisconnect.forEach(handler => handler())

      // Emit disconnected event
      window.dispatchEvent(new CustomEvent('ws_disconnected'))

      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++
        console.log(`Reconnecting... attempt ${reconnectAttempts}`)
        setTimeout(() => initWebSocket(baseUrl), RECONNECT_DELAY)
      }
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handlers.onMessage.forEach(handler => handler(message))

        // Emit typed events
        if (message.type) {
          window.dispatchEvent(new CustomEvent(`ws_${message.type}`, { detail: message }))
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      handlers.onError.forEach(handler => handler(error))
    }
  } catch (err) {
    console.error('Failed to create WebSocket:', err)
  }
}

/**
 * Get WebSocket URL based on current location
 */
function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host

  // Default to port 3456 for orchestrator
  return `${protocol}//${host.replace(/:\d+$/, '')}:3456/ws`
}

/**
 * Join a course room for targeted updates
 * @param {string} courseCode - Course code to join
 */
export function joinCourseRoom(courseCode) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not connected, cannot join room')
    return
  }

  socket.send(JSON.stringify({
    type: 'join_room',
    room: `course:${courseCode}`
  }))
}

/**
 * Leave a course room
 * @param {string} courseCode - Course code to leave
 */
export function leaveCourseRoom(courseCode) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return
  }

  socket.send(JSON.stringify({
    type: 'leave_room',
    room: `course:${courseCode}`
  }))
}

/**
 * Send a message through WebSocket
 * @param {Object} message - Message to send
 */
export function sendMessage(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not connected, message not sent')
    return false
  }

  socket.send(JSON.stringify(message))
  return true
}

/**
 * Subscribe to pipeline updates for a course
 * @param {string} courseCode - Course code
 */
export function subscribeToPipeline(courseCode) {
  sendMessage({
    type: 'subscribe',
    channel: `pipeline:${courseCode}`
  })
}

/**
 * Unsubscribe from pipeline updates
 * @param {string} courseCode - Course code
 */
export function unsubscribeFromPipeline(courseCode) {
  sendMessage({
    type: 'unsubscribe',
    channel: `pipeline:${courseCode}`
  })
}

/**
 * Disconnect WebSocket
 */
export function disconnectWebSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
}

/**
 * Check if WebSocket is connected
 * @returns {boolean}
 */
export function isConnected() {
  return socket && socket.readyState === WebSocket.OPEN
}

/**
 * Register event handler
 * @param {string} event - Event type (connect, disconnect, message, error)
 * @param {Function} handler - Handler function
 */
export function on(event, handler) {
  const key = `on${event.charAt(0).toUpperCase() + event.slice(1)}`
  if (handlers[key]) {
    handlers[key].push(handler)
  }
}

/**
 * Remove event handler
 * @param {string} event - Event type
 * @param {Function} handler - Handler function to remove
 */
export function off(event, handler) {
  const key = `on${event.charAt(0).toUpperCase() + event.slice(1)}`
  if (handlers[key]) {
    const index = handlers[key].indexOf(handler)
    if (index > -1) {
      handlers[key].splice(index, 1)
    }
  }
}

export default {
  initWebSocket,
  joinCourseRoom,
  leaveCourseRoom,
  sendMessage,
  subscribeToPipeline,
  unsubscribeFromPipeline,
  disconnectWebSocket,
  isConnected,
  on,
  off
}
