// RELEASE NOTES — generate a LEARNER-FACING release note from the
// learning-app's main..staging delta, then publish it. Mirrors the insight-
// discovery flow: the service (services/release-notes.cjs) reads main..staging
// via local git (machine SSH creds, no token), filters engineering noise, runs
// `claude --print` on the Max subscription (billed key + CLAUDECODE scrubbed —
// done inside the service), and writes to the shared release_notes table.
// Unlike insight-discovery (fire-and-forget), generation is SYNCHRONOUS so the
// draft can be returned to the UI for review/edit before publishing.
//
// Every route is behind requireAdmin, which production-api.cjs passes in:
// the guard sends its own 401 and returns a falsy user. Mounted at
// /api/release-notes; URLs unchanged by the lift (job #101).
const express = require('express')

module.exports = function releaseNotesRouter({ requireAdmin, logger, releaseNotes }) {
  const releaseNotesSvc = releaseNotes || require('./release-notes.cjs')
  const router = express.Router()

  // POST /api/release-notes/generate — build a draft from main..staging.
  // Optional body { version } overrides the version SHA. Returns the draft.
  router.post('/generate', async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const version = req.body && typeof req.body.version === 'string' ? req.body.version.trim() : undefined
    try {
      const draft = await releaseNotesSvc.generateDraft(version ? { version } : {})
      logger.log(`[ReleaseNotes] draft generated (id=${draft.id}, version=${draft.version}, ${draft.commitCount} commits) by ${admin.email || admin.id}`)
      res.json(draft)
    } catch (e) {
      logger.error(`[ReleaseNotes] generate failed: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  // POST /api/release-notes/publish — flip a draft to published, saving any edits.
  // Body { id, headline?, bullets? }. Returns the updated row.
  router.post('/publish', async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const { id, headline, bullets } = req.body || {}
    if (id === undefined || id === null || id === '') {
      return res.status(400).json({ error: 'id required' })
    }
    try {
      const row = await releaseNotesSvc.publishNote({ id, headline, bullets })
      logger.log(`[ReleaseNotes] published id=${id} (version=${row.version}) by ${admin.email || admin.id}`)
      res.json(row)
    } catch (e) {
      logger.error(`[ReleaseNotes] publish failed: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  // GET /api/release-notes/drafts — unpublished rows, newest-first (for the UI).
  router.get('/drafts', async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    try {
      const drafts = await releaseNotesSvc.listDrafts()
      res.json({ drafts: Array.isArray(drafts) ? drafts : [] })
    } catch (e) {
      logger.error(`[ReleaseNotes] drafts read failed: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  return router
}
