#!/usr/bin/env node
/**
 * Preview server for the recordist practice page. Dev/preview only.
 *
 * Deliberately NOT the vite dev server. Vite would serve the whole Popty
 * dashboard — the login screen, every route, and all of /src — behind whatever
 * URL we point at it. This serves the built bundle out of
 * tools/recordist-tutorial/dist and 404s everything else, so putting it behind
 * a public URL exposes the practice page and nothing else.
 *
 * Build first:
 *   npx vite build --config tools/recordist-tutorial/vite.config.mjs
 * Then:
 *   node tools/recordist-tutorial/serve-recordist-tutorial.cjs [port]
 *
 * Port 5271 is the one https://watson-1.tail4968cb.ts.net:10000/ proxies to.
 * CHECK IT IS FREE before starting — port 5200 was silently taken by an
 * unrelated project's vite dev server once, and the preview URL happily served
 * a different app.
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const DIST = path.join(__dirname, 'dist')
const PORT = Number(process.argv[2] || 5271)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('No build in ' + DIST)
  console.error('Run: npx vite build --config tools/recordist-tutorial/vite.config.mjs')
  process.exit(1)
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0])
    const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '')

    // Resolve inside DIST and refuse anything that escapes it — the served
    // tree is a build output, but the server still must not become a file
    // reader for the rest of the repo.
    const file = path.resolve(DIST, rel)
    if (file !== DIST && !file.startsWith(DIST + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' })
      return res.end('Forbidden')
    }

    let body
    try {
      body = fs.readFileSync(file)
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      return res.end('Not found. This server hosts the recordist practice page and nothing else.')
    }

    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      // Always fresh: this is a page under active revision and a stale copy on
      // a phone is a confusing bug report.
      'Cache-Control': 'no-store',
    })
    res.end(body)
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`recordist practice preview on http://127.0.0.1:${PORT}/`)
    console.log('serving only:', DIST)
  })
