/**
 * Preflight route — scores USE phrases via Claude Haiku before DB insertion.
 *
 * POST /api/seed/preflight?course=ara_for_eng
 *   Body: identical markdown to /api/seed/complete
 *   Returns: { preflight: "PASS"|"FAIL", seed, legos, hint }
 *   Nothing is written to the database.
 */

const { Router } = require('express');
const { isMarkdownSubmission, extractMarkdown, parseMarkdownSeed } = require('../lib/markdown-parser.cjs');
const { scoreUsePhrases, applyThresholds } = require('../lib/phrase-scorer.cjs');

// ─── Router ──────────────────────────────────────────────────────────────────

module.exports = function createPreflightRouter(ctx) {
  const router = Router();

  router.post('/seed/preflight', async (req, res) => {
    try {
      const courseCode = req.query.course || req.body?.course_code;
      if (!courseCode) {
        return res.status(400).json({ error: 'course query param required' });
      }

      // Parse the markdown body (same path as /seed/complete)
      let parsed;
      if (isMarkdownSubmission(req)) {
        const md = extractMarkdown(req);
        parsed = parseMarkdownSeed(md);
      } else {
        return res.status(400).json({ error: 'Body must be text/markdown' });
      }

      if (!parsed || !parsed.seed_number) {
        return res.status(400).json({ error: 'Could not parse seed from markdown' });
      }

      const { seed_number, known_text, target_text, legos } = parsed;
      const seedLabel = `S${String(seed_number).padStart(4, '0')}`;

      // Score via Haiku
      let scoredPhrases;
      try {
        scoredPhrases = await scoreUsePhrases(seed_number, known_text, target_text, legos);
      } catch (err) {
        return res.status(502).json({ error: `Haiku scoring failed: ${err.message}` });
      }

      // Apply thresholds
      const { seedPass, legoResults, failReasons } = applyThresholds(legos, scoredPhrases);

      const hint = seedPass
        ? 'All USE phrases passed. Submit with /api/seed/complete.'
        : `Revise before submitting: ${failReasons.join(' | ')}`;

      return res.json({
        preflight: seedPass ? 'PASS' : 'FAIL',
        seed: seedLabel,
        legos: legoResults,
        hint,
      });

    } catch (err) {
      console.error('[preflight] error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
};
