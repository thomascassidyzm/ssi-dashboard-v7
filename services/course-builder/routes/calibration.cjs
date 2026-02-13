/**
 * Calibration routes — golden decompositions for course calibration.
 *
 * Endpoints:
 *   POST /course/:courseCode/calibration   — Save golden decompositions (JSON or Markdown)
 *   GET  /course/:courseCode/calibration   — Get golden decompositions for a course
 *   GET  /calibrations/patterns            — Cross-language calibration patterns
 *   GET  /calibrations/seed/:seedNumber    — All calibrations for a specific seed
 */

const { Router } = require('express');
const { getGoldenSeedCount } = require('../lib/language-config.cjs');

// ---------------------------------------------------------------------------
// Pure helpers (module-level — no DB, no ctx)
// ---------------------------------------------------------------------------

/**
 * Parse calibration markdown into golden_decompositions JSON structure.
 *
 * Recognizes:
 *   ## Seed N           -> new seed entry
 *   Known: / Target:    -> seed text
 *   ### LN [M/A] "k" -> "t" -> LEGO with type, known, target
 *   Components:         -> components array (M-type)
 *   Reasoning:          -> reasoning string
 *   BUILD: section      -> build_phrases array
 *   USE: section        -> use_phrases array with scores
 *   Contrastive:        -> contrastive_notes array
 *   Key insight:        -> key_insight string
 */
function parseCalibrationMarkdown(text) {
  const seeds = [];
  let current = null;   // current seed object
  let currentLego = null;
  let section = null;   // 'build' | 'use' | 'contrastive' | null

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // ## Seed N
    const seedMatch = trimmed.match(/^## Seed (\d+)/);
    if (seedMatch) {
      if (currentLego && current) { current.legos.push(currentLego); currentLego = null; }
      if (current) seeds.push(current);
      current = {
        seed_number: parseInt(seedMatch[1]),
        known_text: '',
        target_text: '',
        legos: [],
        contrastive_notes: [],
        key_insight: ''
      };
      section = null;
      continue;
    }

    if (!current) continue;

    // Known: / Target:
    const knownMatch = trimmed.match(/^Known:\s*(.+)/);
    if (knownMatch) { current.known_text = knownMatch[1].trim(); section = null; continue; }

    const targetMatch = trimmed.match(/^Target:\s*(.+)/);
    if (targetMatch) { current.target_text = targetMatch[1].trim(); section = null; continue; }

    // ### LN [M/A] "known" -> "target"
    const legoMatch = trimmed.match(/^### L(\d+)\s+\[([MA])]\s+"([^"]+)"\s*→\s*"([^"]+)"/);
    if (legoMatch) {
      if (currentLego) current.legos.push(currentLego);
      currentLego = {
        type: legoMatch[2],
        known: legoMatch[3],
        target: legoMatch[4],
        reasoning: '',
        build_phrases: [],
        use_phrases: []
      };
      if (legoMatch[2] === 'M') currentLego.components = [];
      section = null;
      continue;
    }

    if (!currentLego && !section && !trimmed.startsWith('Contrastive:') && !trimmed.startsWith('Key insight:')) continue;

    // Components: x -> y, a -> b
    const compMatch = trimmed.match(/^Components:\s*(.+)/);
    if (compMatch && currentLego) {
      currentLego.components = compMatch[1].split(',').map(pair => {
        const parts = pair.trim().split(/\s*→\s*/);
        return { known: parts[0].trim(), target: (parts[1] || '').trim() };
      });
      section = null;
      continue;
    }

    // Reasoning:
    const reasonMatch = trimmed.match(/^Reasoning:\s*(.+)/);
    if (reasonMatch && currentLego) { currentLego.reasoning = reasonMatch[1].trim(); section = null; continue; }

    // Section headers
    if (trimmed === 'BUILD:') { section = 'build'; continue; }
    if (trimmed === 'USE:') { section = 'use'; continue; }
    if (trimmed === 'Contrastive:') {
      if (currentLego) { current.legos.push(currentLego); currentLego = null; }
      section = 'contrastive';
      continue;
    }

    // Key insight:
    const insightMatch = trimmed.match(/^Key insight:\s*(.+)/);
    if (insightMatch) {
      if (currentLego) { current.legos.push(currentLego); currentLego = null; }
      current.key_insight = insightMatch[1].trim();
      section = null;
      continue;
    }

    // List items within sections
    if (trimmed.startsWith('- ') && section) {
      const item = trimmed.slice(2).trim();

      if (section === 'build') {
        const parts = item.split(/\s*→\s*/);
        if (parts.length === 2 && currentLego) {
          currentLego.build_phrases.push({ known: parts[0].trim(), target: parts[1].trim() });
        }
      } else if (section === 'use') {
        // "known -> target [score]"
        const useMatch = item.match(/^(.+?)\s*→\s*(.+?)\s*\[(\d+)]/);
        if (useMatch && currentLego) {
          currentLego.use_phrases.push({ known: useMatch[1].trim(), target: useMatch[2].trim(), score: parseInt(useMatch[3]) });
        }
      } else if (section === 'contrastive') {
        current.contrastive_notes.push(item);
      }
      continue;
    }
  }

  // Flush remaining
  if (currentLego && current) current.legos.push(currentLego);
  if (current) seeds.push(current);

  if (seeds.length === 0) {
    return { error: 'No seeds found in markdown. Expected "## Seed N" headings.' };
  }

  // Validate each seed has minimum required fields
  for (const seed of seeds) {
    if (!seed.known_text || !seed.target_text) {
      return { error: `Seed ${seed.seed_number} missing Known: or Target: line` };
    }
    if (seed.legos.length === 0) {
      return { error: `Seed ${seed.seed_number} has no LEGOs. Expected "### LN [M/A] ..." headings.` };
    }
  }

  return { golden_decompositions: seeds };
}

/**
 * Helper: Extract common LEGO patterns across calibrations
 */
function extractCommonPatterns(comparisons, legoType) {
  const knownTexts = {};

  for (const comp of comparisons) {
    const legos = comp.lego_summary
      .filter(l => l.startsWith(legoType + ':'))
      .map(l => {
        const match = l.match(/"([^"]+)"/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    for (const known of legos) {
      knownTexts[known] = (knownTexts[known] || 0) + 1;
    }
  }

  // Return patterns that appear in 2+ calibrations
  return Object.entries(knownTexts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([text, count]) => ({ known_text: text, appears_in: count }));
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

module.exports = function(ctx) {
  const router = Router();
  const supabase = ctx.supabase;

  // -----------------------------------------------------------------------
  // POST /course/:courseCode/calibration
  // Save golden decompositions from calibration session
  //
  // Accepts two formats:
  //   1. JSON  (Content-Type: application/json)  — body.golden_decompositions
  //   2. Markdown (Content-Type: text/markdown or text/plain) — parsed automatically
  //
  // Markdown submissions are merged by seed_number (existing seeds updated,
  // new seeds added).
  // -----------------------------------------------------------------------
  router.post('/course/:courseCode/calibration', async (req, res) => {
    const { courseCode } = req.params;

    // Detect markdown (string body) vs JSON (object body)
    let golden_decompositions;
    if (typeof req.body === 'string') {
      const parsed = parseCalibrationMarkdown(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      golden_decompositions = parsed.golden_decompositions;
    } else {
      golden_decompositions = req.body.golden_decompositions;
    }

    // Validation: Must have golden_decompositions array
    if (!golden_decompositions || !Array.isArray(golden_decompositions)) {
      return res.status(400).json({
        error: 'Required: golden_decompositions array with seed decompositions',
        hint: 'Use /calibrate skill to create golden decompositions interactively, or POST markdown with Content-Type: text/markdown'
      });
    }

    // Validation: Must have at least one seed (unless just setting golden_seed_count)
    const justSettingCount = golden_decompositions.length === 0 && typeof req.body === 'object' && req.body.golden_seed_count != null;
    if (golden_decompositions.length < 1 && !justSettingCount) {
      return res.status(400).json({
        error: 'golden_decompositions array is empty',
        hint: 'Include at least one seed for effective calibration, or set golden_seed_count to update just the count'
      });
    }

    // Validate each decomposition has required fields
    const requiredFields = ['seed_number', 'known_text', 'target_text', 'legos'];
    for (const decomp of golden_decompositions) {
      const missing = requiredFields.filter(f => !decomp[f]);
      if (missing.length > 0) {
        return res.status(400).json({
          error: `Seed ${decomp.seed_number || '?'} missing required fields: ${missing.join(', ')}`,
          required: requiredFields
        });
      }

      // Validate LEGOs have required fields
      if (!Array.isArray(decomp.legos) || decomp.legos.length === 0) {
        return res.status(400).json({
          error: `Seed ${decomp.seed_number} has no LEGOs`,
          hint: 'Each seed must have at least one LEGO decomposition'
        });
      }

      for (const lego of decomp.legos) {
        if (!lego.type || !lego.known || !lego.target) {
          return res.status(400).json({
            error: `Seed ${decomp.seed_number} has invalid LEGO - missing type, known, or target`,
            lego
          });
        }
        if (!['A', 'M'].includes(lego.type)) {
          return res.status(400).json({
            error: `Seed ${decomp.seed_number} has invalid LEGO type: ${lego.type}`,
            allowed: ['A', 'M']
          });
        }
        if (lego.type === 'M' && (!lego.components || !Array.isArray(lego.components))) {
          return res.status(400).json({
            error: `Seed ${decomp.seed_number} M-LEGO "${lego.known}" missing components array`,
            hint: 'M-LEGOs must have components showing their building blocks'
          });
        }
      }
    }

    // Check course exists
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('course_code, display_name, quality_rules')
      .eq('course_code', courseCode)
      .single();

    if (courseErr || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` });
    }

    // Merge golden_decompositions by seed_number (update existing, add new)
    const existingRules = course.quality_rules || {};
    const existing = existingRules.golden_decompositions || [];
    const merged = [...existing];
    for (const newSeed of golden_decompositions) {
      const idx = merged.findIndex(s => s.seed_number === newSeed.seed_number);
      if (idx >= 0) merged[idx] = newSeed;  // replace existing seed
      else merged.push(newSeed);            // add new seed
    }
    merged.sort((a, b) => a.seed_number - b.seed_number);

    // Accept optional golden_seed_count from JSON body
    if (typeof req.body === 'object' && req.body.golden_seed_count != null) {
      const count = parseInt(req.body.golden_seed_count);
      if (isNaN(count) || count < 1 || count > 50) {
        return res.status(400).json({ error: 'golden_seed_count must be between 1 and 50' });
      }
      existingRules.golden_seed_count = count;
    }

    const updatedRules = {
      ...existingRules,
      golden_decompositions: merged,
      calibrated_at: new Date().toISOString(),
      calibrated_by: 'human+agent'
    };

    // Save to database
    const { error: updateErr } = await supabase
      .from('courses')
      .update({
        quality_rules: updatedRules,
        updated_at: new Date().toISOString()
      })
      .eq('course_code', courseCode);

    if (updateErr) {
      console.error(`Error saving calibration for ${courseCode}:`, updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    console.log(`[CALIBRATION] Merged ${golden_decompositions.length} seed(s) for ${courseCode} (${merged.length} total)`);

    // Summarize the calibration (report on merged totals)
    const summary = {
      seeds_submitted: golden_decompositions.map(d => d.seed_number).sort((a, b) => a - b),
      seeds_total: merged.map(d => d.seed_number).sort((a, b) => a - b),
      total_legos: merged.reduce((sum, d) => sum + d.legos.length, 0),
      m_legos: merged.reduce((sum, d) => sum + d.legos.filter(l => l.type === 'M').length, 0),
      a_legos: merged.reduce((sum, d) => sum + d.legos.filter(l => l.type === 'A').length, 0),
      with_reasoning: merged.reduce((sum, d) => sum + d.legos.filter(l => l.reasoning).length, 0),
      with_contrastive_notes: merged.filter(d => d.contrastive_notes && d.contrastive_notes.length > 0).length
    };

    res.json({
      success: true,
      course_code: courseCode,
      message: 'Golden decompositions saved - future agents will receive these as canonical examples',
      calibrated_at: updatedRules.calibrated_at,
      summary,
      next_steps: [
        'Build agents spawned via /api/spawn will receive golden examples in initial brief',
        'GET /api/resume will include golden_decompositions for context recovery',
        `Seeds ${(updatedRules.golden_seed_count || 10) + 1}+ should follow the patterns established in seeds 1-${updatedRules.golden_seed_count || 10}`
      ]
    });
  });

  // -----------------------------------------------------------------------
  // GET /course/:courseCode/calibration
  // Get golden decompositions for a course
  // -----------------------------------------------------------------------
  router.get('/course/:courseCode/calibration', async (req, res) => {
    const { courseCode } = req.params;

    const { data: course, error } = await supabase
      .from('courses')
      .select('course_code, display_name, quality_rules')
      .eq('course_code', courseCode)
      .single();

    if (error || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` });
    }

    const goldenDecompositions = course.quality_rules?.golden_decompositions;
    const calibratedAt = course.quality_rules?.calibrated_at;

    if (!goldenDecompositions) {
      return res.status(404).json({
        error: 'Course not calibrated',
        hint: 'Run /calibrate to create golden decompositions with human guidance',
        course_code: courseCode
      });
    }

    res.json({
      course_code: courseCode,
      display_name: course.display_name,
      golden_seed_count: getGoldenSeedCount(course),
      calibrated_at: calibratedAt,
      calibrated_by: course.quality_rules?.calibrated_by || 'unknown',
      golden_decompositions: goldenDecompositions,
      summary: {
        seeds_calibrated: goldenDecompositions.length,
        total_legos: goldenDecompositions.reduce((sum, d) => sum + d.legos.length, 0)
      }
    });
  });

  // -----------------------------------------------------------------------
  // GET /calibrations/patterns
  // Cross-language calibration patterns for reference
  //
  // Returns all existing calibrations grouped by:
  //   - Target language (how to chunk that language)
  //   - Known language (phrasing patterns)
  //   - Seed number (side-by-side comparison)
  //
  // Query params: ?target=fra&known=eng&seed=1
  // -----------------------------------------------------------------------
  router.get('/calibrations/patterns', async (req, res) => {
    const { target, known, seed } = req.query;

    // Fetch all courses with calibrations
    const { data: courses, error } = await supabase
      .from('courses')
      .select('course_code, display_name, quality_rules')
      .not('quality_rules->golden_decompositions', 'is', null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Filter to only calibrated courses
    const calibrated = (courses || []).filter(c =>
      c.quality_rules?.golden_decompositions?.length > 0
    );

    if (calibrated.length === 0) {
      return res.json({
        message: 'No calibrated courses found yet',
        hint: 'Run /calibrate on a course to create the first calibration',
        calibrated_courses: []
      });
    }

    // Parse course codes into target/known languages
    const parsed = calibrated.map(c => {
      const parts = c.course_code.split('_for_');
      return {
        course_code: c.course_code,
        target_lang: parts[0],
        known_lang: parts[1],
        calibrated_at: c.quality_rules.calibrated_at,
        seeds: c.quality_rules.golden_decompositions.length,
        golden: c.quality_rules.golden_decompositions
      };
    });

    // Apply filters if specified
    let filtered = parsed;
    if (target) {
      filtered = filtered.filter(c => c.target_lang === target);
    }
    if (known) {
      filtered = filtered.filter(c => c.known_lang === known);
    }

    // Group by target language
    const byTarget = {};
    for (const course of filtered) {
      if (!byTarget[course.target_lang]) {
        byTarget[course.target_lang] = [];
      }
      byTarget[course.target_lang].push({
        course_code: course.course_code,
        known_lang: course.known_lang,
        seeds: course.seeds
      });
    }

    // Group by known language
    const byKnown = {};
    for (const course of filtered) {
      if (!byKnown[course.known_lang]) {
        byKnown[course.known_lang] = [];
      }
      byKnown[course.known_lang].push({
        course_code: course.course_code,
        target_lang: course.target_lang,
        seeds: course.seeds
      });
    }

    // If specific seed requested, show side-by-side comparison
    let seedComparison = null;
    if (seed) {
      const seedNum = parseInt(seed);
      seedComparison = {};
      for (const course of filtered) {
        const seedData = course.golden.find(g => g.seed_number === seedNum);
        if (seedData) {
          seedComparison[course.course_code] = {
            known_text: seedData.known_text,
            target_text: seedData.target_text,
            legos: seedData.legos.map(l => ({
              type: l.type,
              known: l.known,
              target: l.target,
              reasoning: l.reasoning
            })),
            key_insight: seedData.key_insight
          };
        }
      }
    }

    res.json({
      calibrated_courses: filtered.length,
      by_target_language: byTarget,
      by_known_language: byKnown,
      seed_comparison: seedComparison,
      hint: seedComparison
        ? `Showing seed ${seed} across ${Object.keys(seedComparison).length} calibrated courses`
        : 'Add ?seed=1 to see side-by-side comparison of how seed 1 was chunked across languages'
    });
  });

  // -----------------------------------------------------------------------
  // GET /calibrations/seed/:seedNumber
  // All calibrations for a specific seed number
  //
  // Shows how different language pairs chunked the same seed number.
  // Useful for seeing patterns before calibrating a new pair.
  // -----------------------------------------------------------------------
  router.get('/calibrations/seed/:seedNumber', async (req, res) => {
    const seedNum = parseInt(req.params.seedNumber);

    if (isNaN(seedNum) || seedNum < 1 || seedNum > 50) {
      return res.status(400).json({
        error: 'Seed number must be 1-50 (calibration range)',
        provided: req.params.seedNumber
      });
    }

    // Fetch all courses with calibrations
    const { data: courses, error } = await supabase
      .from('courses')
      .select('course_code, quality_rules')
      .not('quality_rules->golden_decompositions', 'is', null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const comparisons = [];

    for (const course of courses || []) {
      const golden = course.quality_rules?.golden_decompositions || [];
      const seedData = golden.find(g => g.seed_number === seedNum);

      if (seedData) {
        const parts = course.course_code.split('_for_');
        comparisons.push({
          course_code: course.course_code,
          target_lang: parts[0],
          known_lang: parts[1],
          known_text: seedData.known_text,
          target_text: seedData.target_text,
          lego_summary: seedData.legos.map(l =>
            `${l.type}: "${l.known}" → "${l.target}"`
          ),
          m_count: seedData.legos.filter(l => l.type === 'M').length,
          a_count: seedData.legos.filter(l => l.type === 'A').length,
          key_insight: seedData.key_insight,
          contrastive_notes: seedData.contrastive_notes
        });
      }
    }

    if (comparisons.length === 0) {
      return res.json({
        seed_number: seedNum,
        message: 'No calibrations found for this seed yet',
        hint: 'Run /calibrate on a course to create calibrations'
      });
    }

    // Group by target language for pattern discovery
    const byTarget = {};
    for (const comp of comparisons) {
      if (!byTarget[comp.target_lang]) {
        byTarget[comp.target_lang] = [];
      }
      byTarget[comp.target_lang].push(comp);
    }

    res.json({
      seed_number: seedNum,
      calibrations_found: comparisons.length,
      comparisons,
      by_target_language: byTarget,
      patterns: {
        hint: 'Look for common M-LEGO patterns across languages',
        common_m_legos: extractCommonPatterns(comparisons, 'M'),
        common_a_legos: extractCommonPatterns(comparisons, 'A')
      }
    });
  });

  return router;
};
