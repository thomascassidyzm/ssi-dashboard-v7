/**
 * Briefs Router — API-served briefs for agent stages.
 *
 * Each endpoint returns focused, state-aware markdown that an agent can follow.
 * The coordinator fetches these on demand instead of getting everything at spawn time.
 *
 * Routes:
 *   GET /api/brief/:courseCode/stage/decompose  — V2 Stage 1
 *   GET /api/brief/:courseCode/stage/finalize   — V2 Stage 2
 *   GET /api/brief/:courseCode/stage/phrases    — V2 Stage 3 (the key fix)
 *   GET /api/brief/:courseCode/stage/validate   — V2 Stage 4
 *   GET /api/brief/:courseCode/stage/qa         — V2 Stage 5
 *   GET /api/brief/:courseCode/translate        — Translation agent
 *   GET /api/brief/:courseCode/calibrate        — Calibration (human-in-loop)
 *   GET /api/brief/:courseCode/golden-creator   — Golden seed creator
 *   GET /api/brief/:courseCode/golden-checker   — Golden seed checker
 *   GET /api/brief/:courseCode/golden-qa        — Golden QA parallel
 */

const express = require('express');
const router = express.Router();

// Stage briefs (V2 pipeline)
const generateDecomposeBrief = require('./stage-decompose.cjs');
const generateFinalizeBrief = require('./stage-finalize.cjs');
const generatePhraseBrief = require('./stage-phrases.cjs');
const generateValidateBrief = require('./stage-validate.cjs');
const generateQABrief = require('./stage-qa.cjs');

// Simplified pipeline briefs
const generateNewDecomposeBrief = require('./decompose.cjs');

// Non-V2 briefs
const generateTranslateBrief = require('./translate.cjs');
const generateCalibrateBrief = require('./calibrate.cjs');
const generateGoldenCreatorBrief = require('./golden-creator.cjs');
const generateGoldenCheckerBrief = require('./golden-checker.cjs');
const generateGoldenQABrief = require('./golden-qa.cjs');
const generateOrchestratorBrief = require('./orchestrator.cjs');
const generateBuildMvpBrief = require('./stage-build-mvp.cjs');

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

// V2 Stage briefs
router.get('/:courseCode/stage/decompose', (req, res) => serveBrief(res, generateDecomposeBrief, req.params.courseCode));
router.get('/:courseCode/stage/finalize', (req, res) => serveBrief(res, generateFinalizeBrief, req.params.courseCode));
router.get('/:courseCode/stage/phrases', (req, res) => serveBrief(res, generatePhraseBrief, req.params.courseCode));
router.get('/:courseCode/stage/validate', (req, res) => serveBrief(res, generateValidateBrief, req.params.courseCode));
router.get('/:courseCode/stage/qa', (req, res) => serveBrief(res, generateQABrief, req.params.courseCode));

// Non-V2 briefs
router.get('/:courseCode/translate', (req, res) => serveBrief(res, generateTranslateBrief, req.params.courseCode));
router.get('/:courseCode/calibrate', (req, res) => serveBrief(res, generateCalibrateBrief, req.params.courseCode, req.query));
router.get('/:courseCode/golden-creator', (req, res) => serveBrief(res, generateGoldenCreatorBrief, req.params.courseCode, req.query));
router.get('/:courseCode/golden-checker', (req, res) => serveBrief(res, generateGoldenCheckerBrief, req.params.courseCode, req.query));
router.get('/:courseCode/golden-qa', (req, res) => serveBrief(res, generateGoldenQABrief, req.params.courseCode));
router.get('/:courseCode/orchestrator', (req, res) => serveBrief(res, generateOrchestratorBrief, req.params.courseCode));
router.get('/:courseCode/build-mvp', (req, res) => serveBrief(res, generateBuildMvpBrief, req.params.courseCode, req.query));

// Simplified pipeline
router.get('/:courseCode/decompose', (req, res) => serveBrief(res, generateNewDecomposeBrief, req.params.courseCode, req.query));

module.exports = router;
