// Documentation API — live docs served from Supabase
// (documentation_content / _sections), mounted by production-api.cjs at
// /api/docs. URLs unchanged by the lift out of production-api.cjs (job #101).
//
// These endpoints used to live only on the orchestrator (3456), which is now
// optional — but the frontend talks to 3470, so getDocumentation() calls 404'd
// and every /docs page silently fell back to hardcoded content. Serving them
// here reconnects the live-from-DB pipe. supabase-client.cjs exports both
// helpers (with RPC + manual-query fallbacks) and is passed in by the mount.
//
// Order matters: /list is registered before /:slug so the catch-all param
// route does not shadow it. docs-router.test.cjs pins that.
const express = require('express')

module.exports = function docsRouter({ supabaseClient, logger }) {
  const router = express.Router()

  // GET /api/docs/list — document list for docs navigation. Query: ?category=...
  router.get('/list', async (req, res) => {
    try {
      if (!supabaseClient.isInitialized()) {
        return res.status(503).json({ error: 'Database not initialized' })
      }
      const { category } = req.query
      const docs = await supabaseClient.getDocumentationList(category || null)
      res.json({ success: true, count: docs.length, documents: docs })
    } catch (e) {
      logger.error('[Docs API] list error:', e?.message || e)
      res.status(500).json({ error: e?.message || 'unknown error' })
    }
  })

  // GET /api/docs/:slug — a single document with all its sections.
  router.get('/:slug', async (req, res) => {
    try {
      if (!supabaseClient.isInitialized()) {
        return res.status(503).json({ error: 'Database not initialized' })
      }
      const { slug } = req.params
      const doc = await supabaseClient.getDocumentation(slug)
      if (!doc) return res.status(404).json({ error: 'Document not found', slug })
      res.json({ success: true, document: doc })
    } catch (e) {
      logger.error(`[Docs API] get error for ${req.params.slug}:`, e?.message || e)
      res.status(500).json({ error: e?.message || 'unknown error' })
    }
  })

  return router
}
