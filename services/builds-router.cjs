// Test-build distribution: real APK bytes to an external tester's phone.
//
// WHY THIS EXISTS AT ALL: popty.app is a Vercel static deploy whose catch-all
// rewrite hands /index.html to every path it does not know, so a "/builds"
// link that nobody built returned a 669-byte dashboard shell with HTTP 200.
// Two jobs in one day recorded that URL as a distribution surface; nobody could
// install anything. Bytes, not status codes, are the acceptance test here.
//
// THE PATH: popty.app/builds/* --(vercel.json rewrite, above the catch-all)-->
// https://watson-1.tail4968cb.ts.net:8443/api/builds/*  (tailscale FUNNEL, i.e.
// genuine public internet) --> this router on the production API, port 3470.
//
// AUTH: the link IS the identity — the same call already made, deliberately,
// by the /api/recording recordist routes in production-api.cjs. The tester is
// external: she has no Popty account, so a session login would 401 on her
// phone and fail the actual requirement. The capability is an unguessable
// token segment in the path; without it there is no listing and no download.
//
// DURABILITY: files live in ~/apk-serve, outside every git worktree, so a
// worktree sweep or a repo reaper cannot delete the artefact behind a link
// that has been handed to a human.
const express = require('express')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const APK_CONTENT_TYPE = 'application/vnd.android.package-archive'
const APK_NAME = /^[A-Za-z0-9._-]+\.apk$/

/** Provenance a downloader can check before trusting a binary. */
const BUILD_NOTES = {
  'ssi-devwrap-7ccf1288-debug.apk':
    'Bottom-controls fix: the bottom row of controls no longer sits under the phone’s own navigation bar. Built from commit 7ccf1288.',
}

/**
 * The capability token, persisted beside the builds so it survives a service
 * restart and a redeploy — a link handed to a human must not rotate under her.
 */
function loadToken(dir) {
  const file = path.join(dir, 'access-token.txt')
  try {
    const existing = fs.readFileSync(file, 'utf8').trim()
    if (existing) return existing
  } catch { /* not created yet */ }
  const token = crypto.randomBytes(16).toString('hex')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, token + '\n', { mode: 0o600 })
  return token
}

function tokenMatches(supplied, actual) {
  const a = Buffer.from(String(supplied || ''))
  const b = Buffer.from(actual)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

const hashCache = new Map()
function sha256Of(file, stat) {
  const key = `${file}:${stat.size}:${stat.mtimeMs}`
  const hit = hashCache.get(key)
  if (hit) return hit
  const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  hashCache.set(key, digest)
  return digest
}

function listBuilds(dir) {
  return fs.readdirSync(dir)
    .filter((f) => APK_NAME.test(f))
    .map((name) => {
      const full = path.join(dir, name)
      const stat = fs.statSync(full)
      return { name, size: stat.size, mtime: stat.mtime, sha256: sha256Of(full, stat) }
    })
    .sort((a, b) => b.mtime - a.mtime)
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function landingPage(builds, token) {
  const rows = builds.map((b) => `
    <div class="build">
      <p><a class="dl" href="/builds/${token}/${encodeURIComponent(b.name)}">Download ${escapeHtml(b.name)}</a></p>
      ${BUILD_NOTES[b.name] ? `<p>${escapeHtml(BUILD_NOTES[b.name])}</p>` : ''}
      <p class="meta">${b.size.toLocaleString('en-GB')} bytes<br><span class="hash">sha256 ${b.sha256}</span></p>
    </div>`).join('\n')
  return `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSi Android test builds</title>
<body style="font:17px/1.55 -apple-system,system-ui,sans-serif;padding:24px;max-width:34em;margin:0 auto">
<h2>SSi Android test builds</h2>
${rows || '<p>No builds available.</p>'}
<p style="color:#666">Debug builds. Android will ask you to allow installing from this browser — that prompt is expected.</p>
<style>.build{border-top:1px solid #ddd;padding-top:14px;margin-top:14px}
.dl{font-weight:600}.meta{color:#666;font-size:15px}.hash{word-break:break-all;font-family:ui-monospace,monospace;font-size:13px}</style>
</body></html>`
}

/**
 * @param {{ dir?: string, logger?: { info: Function, error: Function } }} opts
 */
module.exports = function buildsRouter(opts = {}) {
  const dir = opts.dir || process.env.BUILDS_DIR || path.join(require('os').homedir(), 'apk-serve')
  const logger = opts.logger || console
  const router = express.Router()

  router.get('/:token', (req, res) => {
    if (!tokenMatches(req.params.token, loadToken(dir))) return res.status(404).send('not found')
    let builds
    try { builds = listBuilds(dir) } catch (err) {
      logger.error(`[Builds] listing failed: ${err.message}`)
      return res.status(500).send('builds unavailable')
    }
    res.set('Cache-Control', 'no-store')
    res.type('html').send(landingPage(builds, req.params.token))
  })

  router.get('/:token/:file', (req, res) => {
    if (!tokenMatches(req.params.token, loadToken(dir))) return res.status(404).send('not found')
    const name = req.params.file
    if (!APK_NAME.test(name)) return res.status(404).send('not found')
    const full = path.join(dir, name)
    let stat
    try { stat = fs.statSync(full) } catch { return res.status(404).send('not found') }

    // The headers that make Android treat this as an installable package, and
    // that make a truncated download loud instead of silent.
    res.set({
      'Content-Type': APK_CONTENT_TYPE,
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${name}"`,
      'X-Apk-Sha256': sha256Of(full, stat),
      'Cache-Control': 'public, max-age=300',
    })
    logger.info(`[Builds] serving ${name} (${stat.size} bytes)`)
    fs.createReadStream(full).pipe(res)
  })

  return router
}

module.exports.BUILDS_TOKEN_FOR_OPS = loadToken
