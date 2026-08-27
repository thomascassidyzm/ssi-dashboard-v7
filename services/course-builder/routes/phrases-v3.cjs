/**
 * PHRASE GENERATION ROUTES — the v3 prompt, on Opus, served to builders.
 *
 * Two doors onto `lib/phrase-generation.cjs`:
 *
 *   GET  /api/phrases/v3/prompt/:courseCode?seed=N&lego=L
 *        The assembled prompt as plain text. Read-only, calls no model. This is
 *        how you see what a builder is actually being handed, and how you
 *        diagnose a bad set without paying for a regeneration.
 *
 *   POST /api/phrases/v3/generate/:courseCode  {seed, lego}
 *        Generates the BUILD + USE set on Opus and returns it. WRITES NOTHING.
 *        Submission stays where it already lives (POST /api/v2/phrases,
 *        POST /api/seed/complete), so every existing gate — tiling, vocabulary,
 *        ZUT, containment, the phrase floors — runs on this output exactly as it
 *        ran on the previous builder's. This route adds a generator; it does not
 *        add a second way into the database.
 *
 * The response always names the model that produced it, so "did this run on
 * Opus?" is a fact about the output rather than a claim about the source.
 */

const { generateLegoPhrases, buildPhrasePrompt, PHRASE_MODEL } = require('../lib/phrase-generation.cjs');

module.exports = function phrasesV3Routes(ctx) {
  const express = require('express');
  const router = express.Router();

  function readTarget(req) {
    const seed = Number(req.query.seed ?? req.body?.seed);
    const lego = Number(req.query.lego ?? req.body?.lego ?? req.body?.lego_index ?? 1);
    if (!Number.isFinite(seed) || seed < 1) return { error: 'seed is required (a positive integer)' };
    if (!Number.isFinite(lego) || lego < 1) return { error: 'lego must be a positive integer' };
    // A live builder asks for phrases BEFORE it submits the seed — /seed/complete
    // writes LEGOs and phrases atomically, so the LEGO cannot already exist. The
    // proposal covers that; without it the LEGO is read from the database.
    const known = req.query.lego_known ?? req.body?.lego_known;
    const target = req.query.lego_target ?? req.body?.lego_target;
    const proposedLego = (known && target)
      ? { known: String(known), target: String(target), type: String(req.query.lego_type ?? req.body?.lego_type ?? 'A').toUpperCase() }
      : null;
    return { seed, lego, proposedLego };
  }

  router.get('/phrases/v3/prompt/:courseCode', async (req, res) => {
    const { seed, lego, proposedLego, error } = readTarget(req);
    if (error) return res.status(400).json({ ok: false, error });
    try {
      const { prompt } = await buildPhrasePrompt(ctx.supabase, req.params.courseCode, seed, lego, { proposedLego });
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(prompt);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/phrases/v3/generate/:courseCode', async (req, res) => {
    const { seed, lego, proposedLego, error } = readTarget(req);
    if (error) return res.status(400).json({ ok: false, error });
    const courseCode = req.params.courseCode;
    try {
      const result = await generateLegoPhrases(ctx.supabase, courseCode, seed, lego, { proposedLego });
      console.log(`[phrases-v3] ${courseCode} S${seed}L${lego} — ${result.build.length} BUILD / ${result.use.length} USE on ${result.model} in ${(result.elapsedMs / 1000).toFixed(0)}s`);
      res.json({ ok: true, model: PHRASE_MODEL, ...result });
    } catch (err) {
      console.error(`[phrases-v3] ${courseCode} S${seed}L${lego} FAILED: ${err.message}`);
      res.status(500).json({ ok: false, model: PHRASE_MODEL, course_code: courseCode, seed, lego, error: err.message });
    }
  });

  return router;
};
