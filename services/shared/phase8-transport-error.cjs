// A proxy to Phase 8 that fails at the TRANSPORT layer (connection refused/reset/timeout)
// means Phase 8 is restarting or down — a retryable 503, not a 500 server bug.
// voice-gap-fill re-asks on 502/503/504 (tools/frame-layer/v4/voice-gap-fill.cjs), so a
// Phase 8 restart mid-run is waited out only if the route answers 503 here.
const TRANSPORT_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'EPIPE', 'ECONNABORTED'])

function isPhase8TransportError(error) {
  if (!error) return false
  if (TRANSPORT_CODES.has(error.code)) return true
  return /ECONNREFUSED|ECONNRESET|socket hang up/i.test(String(error.message || ''))
}

module.exports = { isPhase8TransportError }
