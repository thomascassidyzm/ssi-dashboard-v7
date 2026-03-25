/**
 * Briefs Router — API-served briefs for agent stages.
 *
 * Pipeline stages (in order):
 *   1. Create course                              — manual (no brief)
 *   2. GET /:courseCode/translate                  — Translate all 668 seeds
 *   3. GET /:courseCode/build-team-orchestrator    — Orchestrator spawns creator/checker team
 *      GET /:courseCode/build-team-creator         — Team creator (Sonnet) — builds seeds
 *      GET /:courseCode/build-team-checker         — Team checker (Opus) — reviews + submits
 *   4. GET /:courseCode/final-pass                 — Post-build grammar audit
 *   4b.GET /:courseCode/backfill-phrases           — Top up under-threshold LEGOs
 *   5. GET /:courseCode/component-backfill         — Fix M-LEGO components
 *   6. Gender expansion                           — service-driven (no brief)
 *   8. Audio generation                           — service-driven (no brief)
 *   9. Export manifest                            — service-driven (no brief)
 *
 * Repair briefs:
 *   GET /:courseCode/redo                          — Wipe & rebuild broken seeds
 *
 * Deprecated briefs moved to ./deprecated/
 */

const express = require('express');
const router = express.Router();

// Stage 2: Translation
const { generateTranslateBrief } = require('./translate.cjs');

// Stage 3: Build team
const generateBuildTeamCreatorBrief = require('./build-team-creator.cjs');
const generateBuildTeamCheckerBrief = require('./build-team-checker.cjs');
const generateBuildTeamOrchestratorBrief = require('./build-team-orchestrator.cjs');

// Stage 4: Final pass
const generateFinalPassBrief = require('./final-pass.cjs');
const generateFinalPassOrchestratorBrief = require('./final-pass-orchestrator.cjs');
const generateFinalPassReviewerBrief = require('./final-pass-reviewer.cjs');

// Redo: targeted seed rebuild
const generateRedoBrief = require('./redo.cjs');

// Phrase backfill: add missing USE phrases to under-threshold LEGOs
const generateBackfillPhrasesBrief = require('./backfill-phrases.cjs');

// Component backfill: M-LEGO component decomposition (Haiku agent)
const { generateComponentBackfillBrief } = require('./component-backfill.cjs');

// Emit a chat message when an agent fetches a brief — covers the "silent startup" gap
const supabaseClient = require('../supabase-client.cjs');
const { emitProgress } = require('../shared/emit-progress.cjs');

const BRIEF_LABELS = {
  'translate': 'Translation',
  'build-team-orchestrator': 'Build orchestrator',
  'build-team-creator': 'Builder agent',
  'build-team-checker': 'Checker agent',
  'final-pass': 'Final pass',
  'final-pass-orchestrator': 'Final pass orchestrator',
  'final-pass-reviewer': 'Final pass reviewer',
  'redo': 'Redo agent',
  'backfill-phrases': 'Phrase backfill',
  'component-backfill': 'Component backfill',
};

// Helper to serve brief as markdown
async function serveBrief(res, generator, courseCode, query = {}, briefKey = null) {
  try {
    const markdown = await generator(courseCode, query);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(markdown);

    // Emit startup message to chat (after response, so it doesn't slow the agent)
    const label = briefKey && BRIEF_LABELS[briefKey];
    if (label) {
      const supabase = supabaseClient.getClient();
      emitProgress(supabase, courseCode, `${label} starting up — reading brief`, { phase: briefKey, action: 'brief-fetched' });
    }
  } catch (err) {
    console.error(`[BRIEF] Error generating brief for ${courseCode}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}

// Stage 2
router.get('/:courseCode/translate', (req, res) => serveBrief(res, generateTranslateBrief, req.params.courseCode, {}, 'translate'));

// Stage 3
router.get('/:courseCode/build-team-creator', (req, res) => serveBrief(res, generateBuildTeamCreatorBrief, req.params.courseCode, req.query, 'build-team-creator'));
router.get('/:courseCode/build-team-checker', (req, res) => serveBrief(res, generateBuildTeamCheckerBrief, req.params.courseCode, req.query, 'build-team-checker'));
router.get('/:courseCode/build-team-orchestrator', (req, res) => serveBrief(res, generateBuildTeamOrchestratorBrief, req.params.courseCode, req.query, 'build-team-orchestrator'));

// Stage 4
router.get('/:courseCode/final-pass', (req, res) => serveBrief(res, generateFinalPassBrief, req.params.courseCode, req.query, 'final-pass'));
router.get('/:courseCode/final-pass-orchestrator', (req, res) => serveBrief(res, generateFinalPassOrchestratorBrief, req.params.courseCode, req.query, 'final-pass-orchestrator'));
router.get('/:courseCode/final-pass-reviewer', (req, res) => serveBrief(res, generateFinalPassReviewerBrief, req.params.courseCode, req.query, 'final-pass-reviewer'));

// Redo
router.get('/:courseCode/redo', (req, res) => serveBrief(res, generateRedoBrief, req.params.courseCode, req.query, 'redo'));

// Phrase backfill
router.get('/:courseCode/backfill-phrases', (req, res) => serveBrief(res, generateBackfillPhrasesBrief, req.params.courseCode, req.query, 'backfill-phrases'));

// Component backfill
router.get('/:courseCode/component-backfill', (req, res) => serveBrief(res, generateComponentBackfillBrief, req.params.courseCode, req.query, 'component-backfill'));

module.exports = router;
