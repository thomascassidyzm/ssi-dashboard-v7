/**
 * Best-effort ops_events writer for Popty-side guards (job #706, 2026-11-05).
 *
 * The estate's doctrine: every new or changed guard logs each firing to ops_events (the command
 * surface's strip, GET /api/ops-event?source=<guard>), not only to a journal nobody reads. #699's
 * audio-route cap logged to Popty's journal alone; this is the one door Popty uses instead.
 *
 * Fire-and-forget: a loopback POST with a 2 s timeout, errors swallowed — a guard must never fail
 * (or slow) the request it is guarding because the surface is restarting. Off with POPTY_OPS_EVENTS=off.
 */
const http = require('http')

const SURFACE = process.env.CS_SURFACE_URL || 'http://127.0.0.1:4317'

function opsEvent(source, kind, detail) {
  if (String(process.env.POPTY_OPS_EVENTS || '').toLowerCase() === 'off') return
  try {
    const body = JSON.stringify({ source: String(source).slice(0, 60), kind: String(kind).slice(0, 60), detail: String(detail == null ? '' : detail).slice(0, 500) })
    const u = new URL('/api/ops-event', SURFACE)
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', timeout: 2000, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } })
    req.on('error', () => {})
    req.on('timeout', () => req.destroy())
    req.end(body)
  } catch { /* best effort */ }
}

module.exports = { opsEvent }
