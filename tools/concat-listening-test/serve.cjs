#!/usr/bin/env node
/**
 * serve.cjs — host the blind glued-vs-one-take listening test.
 *
 * The page is static, so in the long run it ships with the dashboard build and
 * needs nothing. This exists so Kai can listen TODAY, from a phone, without
 * waiting on a merge and a deploy: run it, path-mount it on the existing
 * tailscale funnel, hand over the URL.
 *
 *   node tools/concat-listening-test/serve.cjs            # loopback :4788
 *   tailscale funnel --bg --set-path=/concat-listening-test http://127.0.0.1:4788
 *   -> https://<host>.ts.net:8443/concat-listening-test/
 *
 * Verdicts POST to ./verdicts, which is same-origin under the path mount, so
 * saving works even though the dashboard API knows nothing about this yet.
 * Files land in scripts/concat-listening-test/verdicts/ — the same place the
 * production-api route writes them, so there is one place to look either way.
 *
 * Binds loopback only. watson-1 has a public IP and the funnel proxies from
 * localhost, so a 127.0.0.1 bind keeps the public URL working while leaving no
 * raw 0.0.0.0 path (same ruling as tools/seed1-listen/server.cjs).
 */

const fs = require('fs')
const http = require('http')
const path = require('path')

// Deliberately NOT process.env.PORT: agent shells on watson-1 carry a stray
// PORT=4317, which silently steals this server's socket and crash-loops it.
const PORT = Number(process.env.CONCAT_TEST_PORT || 4788)
const HOST = process.env.BIND_HOST || '127.0.0.1'
const ROOT = path.join(__dirname, '..', '..', 'public', 'concat-listening-test')
const VERDICT_DIR = path.join(__dirname, '..', '..', 'scripts', 'concat-listening-test', 'verdicts')

const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg' }

function sendJson(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(body))
}

const server = http.createServer((req, res) => {
  // Strip any mount prefix so the same server works at / and at /concat-listening-test/.
  let url = decodeURIComponent(req.url.split('?')[0]).replace(/^\/concat-listening-test/, '') || '/'

  if (url === '/verdicts') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
      return res.end()
    }
    if (req.method === 'GET') {
      if (!fs.existsSync(VERDICT_DIR)) return sendJson(res, 200, { sessions: [] })
      const sessions = fs.readdirSync(VERDICT_DIR).filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(fs.readFileSync(path.join(VERDICT_DIR, f), 'utf8')))
      return sendJson(res, 200, { sessions })
    }
    if (req.method === 'POST') {
      let body = ''
      req.on('data', c => { body += c; if (body.length > 1e6) req.destroy() })
      req.on('end', () => {
        try {
          const { sessionId, listener, verdicts } = JSON.parse(body || '{}')
          if (!Array.isArray(verdicts) || !verdicts.length) {
            return sendJson(res, 400, { error: 'verdicts must be a non-empty array' })
          }
          fs.mkdirSync(VERDICT_DIR, { recursive: true })
          const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '') || 'unknown'
          fs.writeFileSync(path.join(VERDICT_DIR, `${safe}.json`), JSON.stringify({
            sessionId: safe, listener: listener || null,
            savedAt: new Date().toISOString(), verdicts
          }, null, 2))
          sendJson(res, 200, { saved: verdicts.length })
        } catch (err) {
          sendJson(res, 500, { error: err.message })
        }
      })
      return
    }
    return sendJson(res, 405, { error: 'method not allowed' })
  }

  const rel = url === '/' ? 'index.html' : url.replace(/^\//, '')
  const file = path.join(ROOT, rel)
  // Never serve outside the page's own directory.
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('not found')
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': path.extname(file) === '.mp3' ? 'public, max-age=86400' : 'no-cache',
  })
  fs.createReadStream(file).pipe(res)
})

server.listen(PORT, HOST, () => {
  console.log(`concat listening test on http://${HOST}:${PORT}/  (root: ${ROOT})`)
  console.log(`verdicts -> ${VERDICT_DIR}`)
})
