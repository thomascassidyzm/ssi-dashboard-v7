/**
 * PHRASE GENERATION ROUTES — the v3 prompt, on Opus, served to builders.
 *
 * Three doors onto `lib/phrase-generation.cjs`:
 *
 *   GET  /api/phrases/v3/declaration/:courseCode?seed=N&lego=L[&check=live]
 *        The DECLARATION — what a batch at this position would be built to
 *        instantiate (derived job, frame pool, splits, floors) — and, with
 *        check=live, the mechanical verdict of the live basket against it.
 *        Read-only, calls no model. The declaration is the QA spec.
 *
 *   GET  /api/phrases/v3/prompt/:courseCode?seed=N&lego=L
 *        The assembled prompt as plain text. Read-only, calls no model. This is
 *        how you see what a builder is actually being handed, and how you
 *        diagnose a bad set without paying for a regeneration.
 *
 *   POST /api/phrases/v3/generate/:courseCode  {seed, lego}
 *        Generates the BUILD + USE set on Opus, RUNS THE REAL GATES AND THE
 *        SCORER over it, regenerates on failure, and returns it. WRITES NOTHING.
 *        Submission stays where it already lives (POST /api/v2/phrases,
 *        POST /api/seed/complete), so every existing gate — tiling, vocabulary,
 *        ZUT, containment, the phrase floors — runs on this output exactly as it
 *        ran on the previous builder's. This route adds a generator; it does not
 *        add a second way into the database.
 *
 * The response always names the model that produced it, so "did this run on
 * Opus?" is a fact about the output rather than a claim about the source — and
 * since Tom's A-294 ruling (2026-08-28) it also always carries `gate` and
 * `score`, so "did this pass?" is a fact about the output too. A set that could
 * not be made to pass in one retry (#422·AD) comes back with `ok:false, blocked:true`
 * and its failure list; nothing downstream should show it to a human.
 */

const path = require('path');
const { generateLegoPhrases, buildPhrasePrompt, PHRASE_MODEL } = require('../lib/phrase-generation.cjs');
// The spawn cap and the hold (#422·AD): the same two rules as the v4 door — see routes/phrases-v4.cjs.
const { callerGoneSignal } = require('../lib/phrase-spawn-gate.cjs');
const { phraseHolds, isGateRefusal, heldAnswer } = require('../lib/phrase-holds.cjs');
const { computeDeclaration, checkDeclaration, tagForCheck } =
  require(path.join(__dirname, '../../../tools/frame-layer/declaration.cjs'));

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

  /**
   * GET /api/phrases/v3/declaration/:courseCode?seed=N&lego=L[&check=live]
   *
   * Read-only, calls no model, writes nothing. The declaration this door WOULD
   * record before generating — the QA spec for that basket. With `check=live`
   * it also fetches the basket's live phrases and judges them against the
   * declaration mechanically, which is the per-basket QA verdict with nobody
   * reading the target language. This is the endpoint half of Kai's
   * instrument; the course-level loop is `tools/frame-layer/qa-report.cjs`.
   */
  router.get('/phrases/v3/declaration/:courseCode', async (req, res) => {
    const { seed, lego, proposedLego, error } = readTarget(req);
    if (error) return res.status(400).json({ ok: false, error });
    try {
      const declaration = await computeDeclaration(ctx.supabase, req.params.courseCode, seed, lego, { proposedLego });
      let check = null;
      if (String(req.query.check || '') === 'live') {
        const { data, error: dbErr } = await ctx.supabase.from('course_practice_phrases')
          .select('phrase_role,known_text,target_text')
          .eq('course_code', req.params.courseCode).eq('seed_number', seed).eq('lego_index', lego);
        if (dbErr) throw new Error(dbErr.message);
        await tagForCheck(declaration, data || []); // frames are model-tagged, cached per text
        check = checkDeclaration(declaration, data || []);
      }
      res.json({ ok: true, declaration, check });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/phrases/v3/generate/:courseCode', async (req, res) => {
    const { seed, lego, proposedLego, error } = readTarget(req);
    if (error) return res.status(400).json({ ok: false, error });
    const courseCode = req.params.courseCode;
    const held = phraseHolds().find(courseCode, seed, lego, proposedLego);
    if (held && req.body?.retry_held !== true) {
      console.log(`[phrases-v3] ${courseCode} S${seed}L${lego} — HELD for review since ${held.held_at}; no model call`);
      return res.json(heldAnswer(held, 'v3'));
    }
    if (held) phraseHolds().release(courseCode, seed, lego, proposedLego, req.get('x-agent-id') || 'retry_held');
    try {
      const result = await generateLegoPhrases(ctx.supabase, courseCode, seed, lego, { proposedLego, signal: callerGoneSignal(res) });
      const hold = isGateRefusal(result) ? phraseHolds().record(courseCode, seed, lego, proposedLego, result, 'v3') : null;
      // The declaration word is a CONTENT verdict; claim honesty is a separate
      // finding printed as a finding, never as a failure (Tom's ruling,
      // 2026-09-05 — claim honesty reports, it does not gate).
      const dc = result.declarationCheck;
      const declWord = !dc || !dc.checked ? ''
        : dc.pass ? ' declaration PASS'
        : ` declaration FAIL (floors: ${dc.floor_failures.join(',')})`;
      const claimWord = dc && dc.checked && dc.claim_honesty && dc.claim_honesty.wrong
        ? `  ~ CLAIMS: ${dc.claim_honesty.wrong}/${dc.claim_honesty.checked} frame tags wrong (reported, not gated)` : '';
      const verdict = (result.blocked ? `${hold ? 'HELD ' : ''}BLOCKED (${result.gate.failingGates.join(',')})` : 'gate PASS') + declWord + claimWord;
      console.log(`[phrases-v3] ${courseCode} S${seed}L${lego} — ${result.build.length} BUILD / ${result.use.length} USE on ${result.model} in ${(result.elapsedMs / 1000).toFixed(0)}s — ${verdict} after ${result.attempts.length} attempt(s)`);
      // A blocked set is returned, named, with its failures — never silently
      // dropped and never dressed as a success. 200 with ok:false is the shape
      // that makes a caller handle it: `ok` is the gate verdict, not "the HTTP
      // call worked", so a caller that ignores it gets nothing to show.
      res.json({ ok: !result.blocked, blocked: result.blocked, model: PHRASE_MODEL, ...result, ...(hold ? { held: true, code: 'HELD_FOR_REVIEW', hold } : {}) });
    } catch (err) {
      if (err.code === 'CLIENT_GONE') { console.log(`[phrases-v3] ${courseCode} S${seed}L${lego} — caller went away while queued; not spawned`); return; }
      console.error(`[phrases-v3] ${courseCode} S${seed}L${lego} FAILED: ${err.message}`);
      res.status(500).json({ ok: false, model: PHRASE_MODEL, course_code: courseCode, seed, lego, error: err.message });
    }
  });

  return router;
};
