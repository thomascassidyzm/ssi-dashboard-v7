/**
 * A course-tagged alert, sent to the course OWNER's Watson room on the command surface (job #458, 2026-11-09).
 *
 * The surface door is POST /api/service-notice (command-surface service-notice.js): it routes by course
 * owner, lands routine notices HELD (read at the owner's next Watson turn, no wake), and de-duplicates
 * (same key within 6 h = once) and rate-limits on its side. This file is Popty's one caller of it.
 *
 * AUTH: x-cs-service: popty:<secret>. The secret is /etc/popty/cs-service-notice.secret, owner popty,
 * mode 0600 — read at call time, never cached, never logged, never on an argv. Nothing else on the box
 * (popty's group is tomcassidy) can read it. Never a conversation token.
 *
 * Fire-and-forget: 3 s timeout, never throws, never awaited by the alert it accompanies. A failure is
 * logged ONCE per reason per process, so a surface outage does not fill the journal every 60 s sweep.
 * Off with POPTY_SERVICE_NOTICE=off.
 *
 * Only course-tagged alerts go: no course, no notice (untagged alerts stay in the course chat / ops strip).
 *
 * Probe from a shell (runs as popty so it can read the secret; the text is not secret):
 *   sudo -u popty node services/shared/service-notice.cjs --course cs_probe --key probe-1 --text "probe"
 */
const fs = require('fs')
const http = require('http')

const SURFACE = process.env.CS_SURFACE_URL || 'http://127.0.0.1:4317'
const SECRET_FILE = process.env.POPTY_SERVICE_NOTICE_SECRET_FILE || '/etc/popty/cs-service-notice.secret'
const SERVICE = 'popty'
const loggedOnce = new Set()
const logOnce = (why) => { if (loggedOnce.has(why)) return; loggedOnce.add(why); console.error(`[service-notice] not sent: ${why} (logged once per process)`) }

/** Returns a promise of {ok, status, body} — callers that do not care simply do not await it. */
function sendServiceNotice({ course, text, severity = 'routine', key = null }) {
  return new Promise((resolve) => {
    const done = (r) => resolve(r)
    try {
      if (String(process.env.POPTY_SERVICE_NOTICE || '').toLowerCase() === 'off') return done({ ok: false, skipped: 'off' })
      if (!course || !String(text || '').trim()) return done({ ok: false, skipped: 'untagged' })
      let secret
      try { secret = fs.readFileSync(SECRET_FILE, 'utf8').trim() } catch (e) { logOnce(`secret unreadable (${e.code || e.message})`); return done({ ok: false, error: 'no-secret' }) }
      const body = JSON.stringify({ service: SERVICE, course: String(course), text: String(text).slice(0, 2000), severity, ...(key ? { key: String(key) } : {}) })
      const u = new URL('/api/service-notice', SURFACE)
      const req = http.request({
        hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', timeout: 3000,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-cs-service': `${SERVICE}:${secret}` },
      }, (res) => {
        let data = ''
        res.on('data', (c) => { data += c })
        res.on('end', () => {
          let parsed = null; try { parsed = JSON.parse(data) } catch {}
          if (res.statusCode !== 200) logOnce(`surface answered ${res.statusCode}`)
          done({ ok: res.statusCode === 200, status: res.statusCode, body: parsed })
        })
      })
      req.on('error', (e) => { logOnce(`surface unreachable (${e.code || e.message})`); done({ ok: false, error: e.code || e.message }) })
      req.on('timeout', () => { req.destroy(new Error('timeout')) })
      req.end(body)
    } catch (e) { logOnce(e.message); done({ ok: false, error: e.message }) }
  })
}

module.exports = { sendServiceNotice }

if (require.main === module) {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined }
  sendServiceNotice({ course: arg('course'), text: arg('text'), severity: arg('severity') || 'routine', key: arg('key') })
    .then((r) => { console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1) })
}
