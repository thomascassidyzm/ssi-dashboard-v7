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
 *   5. Gender expansion                           — service-driven (no brief)
 *   8. Audio generation                           — service-driven (no brief)
 *   9. Export manifest                            — service-driven (no brief)
 *
 * Deprecated briefs moved to ./deprecated/
 */

const express = require('express');
const router = express.Router();

// Stage 2: Translation
const generateTranslateBrief = require('./translate.cjs');

// Stage 3: Build team
const generateBuildTeamCreatorBrief = require('./build-team-creator.cjs');
const generateBuildTeamCheckerBrief = require('./build-team-checker.cjs');
const generateBuildTeamOrchestratorBrief = require('./build-team-orchestrator.cjs');

// Stage 4: Final pass
const generateFinalPassBrief = require('./final-pass.cjs');

// Helper to serve brief as markdown
async function serveBrief(res, generator, courseCode, query = {}) {
  try {
    const markdown = await generator(courseCode, query);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(markdown);
  } catch (err) {
    console.error(`[BRIEF] Error generating brief for ${courseCode}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}

// Stage 2
router.get('/:courseCode/translate', (req, res) => serveBrief(res, generateTranslateBrief, req.params.courseCode));

// Stage 3
router.get('/:courseCode/build-team-creator', (req, res) => serveBrief(res, generateBuildTeamCreatorBrief, req.params.courseCode, req.query));
router.get('/:courseCode/build-team-checker', (req, res) => serveBrief(res, generateBuildTeamCheckerBrief, req.params.courseCode, req.query));
router.get('/:courseCode/build-team-orchestrator', (req, res) => serveBrief(res, generateBuildTeamOrchestratorBrief, req.params.courseCode, req.query));

// Stage 4
router.get('/:courseCode/final-pass', (req, res) => serveBrief(res, generateFinalPassBrief, req.params.courseCode, req.query));

module.exports = router;
