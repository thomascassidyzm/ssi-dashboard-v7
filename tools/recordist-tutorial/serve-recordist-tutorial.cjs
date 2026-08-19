#!/usr/bin/env node
/**
 * Preview server for the recordist tutorial. Dev/preview only.
 *
 * Deliberately NOT the vite dev server. Vite would serve the whole Popty
 * dashboard — the login screen, every route, and all of /src — behind whatever
 * URL we point at it. This serves an ALLOWLIST of exactly three files and 404s
 * everything else, so putting it behind a public URL exposes the tutorial and
 * nothing else.
 *
 * The two modules need no bundling: takeSplice.js and tutorialPhrases.js are
 * plain ES modules with no bare imports, so the browser loads them directly.
 *
 * Usage: node tools/recordist-tutorial/serve-recordist-tutorial.cjs [port]
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const PORT = Number(process.argv[2] || 5200)

// Path → file. Nothing outside this map is reachable, so there is no traversal
// surface and no way to reach a service, a key, or the rest of the app.
const ALLOW = {
  '/': 'public/recordist-tutorial.html',
  '/recordist-tutorial.html': 'public/recordist-tutorial.html',
  '/src/utils/takeSplice.js': 'src/utils/takeSplice.js',
  '/src/utils/tutorialPhrases.js': 'src/utils/tutorialPhrases.js',
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }

http
  .createServer((req, res) => {
    const url = req.url.split('?')[0]
    const rel = ALLOW[url]
    if (!rel) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      return res.end('Not found. This server hosts the recordist tutorial and nothing else.')
    }
    let body
    try {
      body = fs.readFileSync(path.join(ROOT, rel))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      return res.end('Missing ' + rel)
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(rel)] || 'application/octet-stream',
      // Always fresh: this is a page under active revision and a stale copy on
      // a phone is a confusing bug report.
      'Cache-Control': 'no-store',
    })
    res.end(body)
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`recordist tutorial preview on http://127.0.0.1:${PORT}/`)
    console.log('serving only:', Object.keys(ALLOW).join(' '))
  })
