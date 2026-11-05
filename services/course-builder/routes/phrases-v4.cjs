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
 *
 * THE WEEKLY PACE (#412·AD; Tom 2026-11-04: "if it's doing too much token heavy stuff it has to pace it over the
 * week"). This door is Popty's token-heavy path — one Opus CLI per LEGO, ~50k tokens of prompt each; on 4 Nov it
 * ran ~3,700 times and took claude@ from 24% to 100% of its week in eight hours. So it answers 429 WEEKLY_PACE
 * {resume_at} while EVERY SSi account is past its pro-rata share of the week (claude-config.cjs pacedNow); a run
 * waits until resume_at and carries on. A person's one-off call passes "unpaced": true.
 *
 * THE SPAWN CAP AND THE HOLD (#422·AD). Every Opus call this door makes waits for a slot in one cap shared
 * by every course build (lib/phrase-spawn-gate.cjs): over the cap a request QUEUES, it is never refused, and
 * one whose caller hangs up while queued is dropped unspent. A LEGO the gate refuses after its one retry is
 * HELD (lib/phrase-holds.cjs): the next ask for the same LEGO answers HELD_FOR_REVIEW with no model call,
 * until a person sends "retry_held": true. GET /api/phrases/held/:courseCode lists the holds.
 */
module.exports = function phrasesV4Routes(ctx) {
  const express = require('express');
  const router = express.Router();
  const { generateLegoPhrasesV4 } = require('../lib/phrase-generation-v4.cjs');
  const { PHRASE_MODEL } = require('../lib/phrase-generation.cjs');
  const { bulkPace } = require('../../shared/claude-config.cjs');
  const { phraseSpawnGate, callerGoneSignal } = require('../lib/phrase-spawn-gate.cjs');
  const { phraseHolds, isGateRefusal, heldAnswer } = require('../lib/phrase-holds.cjs');

  router.get('/phrases/held/:courseCode', (req, res) => {
    const holds = phraseHolds().list(req.params.courseCode);
    res.json({ ok: true, course_code: req.params.courseCode, count: holds.length, holds, spawn_gate: phraseSpawnGate.stats() });
  });

  router.post('/phrases/v4/generate/:courseCode', async (req, res) => {
    const courseCode = req.params.courseCode;
    const body = req.body || {};
    if (/^cym/.test(courseCode)) return res.status(409).json({ ok: false, code: 'WELSH_EXCLUDED', error: 'Welsh is excluded from phrase v4 (r-2026-09-27): use POST /api/phrases/v3/generate' });
    const seed = Number(body.seed);
    const lego = Number(body.lego ?? body.lego_index ?? 1);
    if (!Number.isInteger(seed) || seed < 1) return res.status(400).json({ ok: false, error: 'seed is required (a positive integer)' });
    if (!Number.isInteger(lego) || lego < 1) return res.status(400).json({ ok: false, error: 'lego must be a positive integer' });
    if (!/^[a-z]{2,4}_for_[a-z]{2,4}$/.test(courseCode)) return res.status(400).json({ ok: false, error: 'courseCode required (e.g. fra_for_eng)' });
    if (body.unpaced !== true) {
      const pace = bulkPace();
      if (pace) {
        res.set('Retry-After', String(Math.max(60, Math.ceil((Date.parse(pace.resumeAt) - Date.now()) / 1000))));
        return res.status(429).json({ ok: false, code: 'WEEKLY_PACE', pipeline: 'v4', course_code: courseCode, seed, lego, resume_at: pace.resumeAt, error: pace.why });
      }
    }
    const proposedLego = (body.lego_known && body.lego_target)
      ? { known: String(body.lego_known), target: String(body.lego_target), type: String(body.lego_type || 'A').toUpperCase() } : null;
    const held = phraseHolds().find(courseCode, seed, lego, proposedLego);
    if (held && body.retry_held !== true) {
      console.log(`[phrases-v4] ${courseCode} S${seed}L${lego} — HELD for review since ${held.held_at}; no model call`);
      return res.json(heldAnswer(held, 'v4'));
    }
    if (held) phraseHolds().release(courseCode, seed, lego, proposedLego, req.get('x-agent-id') || 'retry_held');
    try {
      const result = await generateLegoPhrasesV4(ctx.supabase, courseCode, seed, lego, { proposedLego, signal: callerGoneSignal(res) });
      const hold = isGateRefusal(result) ? phraseHolds().record(courseCode, seed, lego, proposedLego, result, 'v4') : null;
      const dc = result.declarationCheck;
      const declWord = !dc || !dc.checked ? '' : dc.pass ? ' declaration PASS' : ` declaration FAIL (floors: ${dc.floor_failures.join(',')})`;
      console.log(`[phrases-v4] ${courseCode} S${seed}L${lego} — ${result.build.length} BUILD / ${result.use.length} USE on ${result.model} in ${(result.elapsedMs / 1000).toFixed(0)}s — ${result.blocked ? (hold ? 'BLOCKED, HELD for review' : 'BLOCKED') : 'gate PASS'}${declWord} after ${result.attempts.length} attempt(s); v4 frames ${result.v4.frames}`);
      // ok is the gate verdict, not "the HTTP call worked" (same contract as v3).
      res.json({ ok: !result.blocked, blocked: result.blocked, model: PHRASE_MODEL, ...result, ...(hold ? { held: true, code: 'HELD_FOR_REVIEW', hold } : {}) });
    } catch (err) {
      if (err.code === 'CLIENT_GONE') { console.log(`[phrases-v4] ${courseCode} S${seed}L${lego} — caller went away while queued; not spawned`); return; }
      console.error(`[phrases-v4] ${courseCode} S${seed}L${lego} FAILED: ${err.message}`);
      res.status(500).json({ ok: false, model: PHRASE_MODEL, pipeline: 'v4', course_code: courseCode, seed, lego, error: err.message });
    }
  });

  return router;
};
