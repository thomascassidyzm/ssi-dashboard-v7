/**
 * PHRASE v4, PER LEGO — the door builders call (job #544; Tom 2026-10-14: "phrase v4 is THE phrase builder").
 *
 *   POST /api/phrases/v4/generate/:courseCode  {seed, lego, lego_known?, lego_target?, lego_type?}
 *
 * The same request and the same response shape as POST /api/phrases/v3/generate (so a builder's
 * switch is one word in a URL): { ok, blocked, model, build[], use[], gate, score, attempts… }, plus
 *   pipeline: 'v4'
 *   v4:       { frames, frames_available, distinct_frames, per_phrase[] }   what was checked, and what was NOT
 *   staged_rows: the passed set in the shape POST /api/admin/phrase-v4/gap-fill takes, to land an
 *             existing course's LEGO with a preview, an undo file and (on a live course) Tom's go.
 * WRITES NOTHING. Logic and why: lib/phrase-generation-v4.cjs.
 *
 * Welsh is answered 409 WELSH_EXCLUDED (r-2026-09-27): its builders keep the v3 door.
 */
module.exports = function phrasesV4Routes(ctx) {
  const express = require('express');
  const router = express.Router();
  const { generateLegoPhrasesV4 } = require('../lib/phrase-generation-v4.cjs');
  const { PHRASE_MODEL } = require('../lib/phrase-generation.cjs');

  router.post('/phrases/v4/generate/:courseCode', async (req, res) => {
    const courseCode = req.params.courseCode;
    const body = req.body || {};
    const seed = Number(body.seed);
    const lego = Number(body.lego ?? body.lego_index ?? 1);
    if (!Number.isInteger(seed) || seed < 1) return res.status(400).json({ ok: false, error: 'seed is required (a positive integer)' });
    if (!Number.isInteger(lego) || lego < 1) return res.status(400).json({ ok: false, error: 'lego must be a positive integer' });
    if (!/^[a-z]{2,4}_for_[a-z]{2,4}$/.test(courseCode)) return res.status(400).json({ ok: false, error: 'courseCode required (e.g. fra_for_eng)' });
    if (/^cym/.test(courseCode)) return res.status(409).json({ ok: false, code: 'WELSH_EXCLUDED', error: 'Welsh is excluded from phrase v4 (r-2026-09-27): use POST /api/phrases/v3/generate' });
    const proposedLego = (body.lego_known && body.lego_target)
      ? { known: String(body.lego_known), target: String(body.lego_target), type: String(body.lego_type || 'A').toUpperCase() } : null;
    try {
      const result = await generateLegoPhrasesV4(ctx.supabase, courseCode, seed, lego, { proposedLego });
      const dc = result.declarationCheck;
      const declWord = !dc || !dc.checked ? '' : dc.pass ? ' declaration PASS' : ` declaration FAIL (floors: ${dc.floor_failures.join(',')})`;
      console.log(`[phrases-v4] ${courseCode} S${seed}L${lego} — ${result.build.length} BUILD / ${result.use.length} USE on ${result.model} in ${(result.elapsedMs / 1000).toFixed(0)}s — ${result.blocked ? 'BLOCKED' : 'gate PASS'}${declWord}; v4 frames ${result.v4.frames}`);
      // ok is the gate verdict, not "the HTTP call worked" (same contract as v3).
      res.json({ ok: !result.blocked, blocked: result.blocked, model: PHRASE_MODEL, ...result });
    } catch (err) {
      console.error(`[phrases-v4] ${courseCode} S${seed}L${lego} FAILED: ${err.message}`);
      res.status(500).json({ ok: false, model: PHRASE_MODEL, pipeline: 'v4', course_code: courseCode, seed, lego, error: err.message });
    }
  });

  return router;
};
