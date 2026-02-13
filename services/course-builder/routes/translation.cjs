/**
 * Translation & Analysis routes — extracted from course-builder-api.cjs
 *
 * Handles:
 *   GET  /course/:courseCode/translate      - Get seeds needing translation
 *   POST /course/:courseCode/translate      - Submit batch translations
 *   POST /course/:courseCode/analysis       - Save translation analysis
 *   GET  /course/:courseCode/analysis       - Retrieve translation analysis
 *   POST /course/:courseCode/quality-rules  - Save methodology guidance
 *   GET  /course/:courseCode/quality-rules  - Retrieve methodology guidance
 */

const { Router } = require('express');
const { getLanguageName } = require('../lib/language-config.cjs');
const { recordActivity } = require('../lib/activity-tracker.cjs');

module.exports = function (ctx) {
  const router = Router();
  const supabase = ctx.supabase;

  // ---------------------------------------------------------------------------
  // initializeCourseSeeds — inline until extracted to a shared lib module
  // TODO: Extract to ../lib/seed-initializer.cjs and share with other routes
  // ---------------------------------------------------------------------------
  async function initializeCourseSeeds(courseCode) {
    // Parse course code: target_for_known (e.g., zho_for_eng)
    const parts = courseCode.split('_for_');
    const targetLang = parts[0] || '';
    const knownLang = parts[1] || '';

    const knownIsEng = knownLang === 'eng';
    const targetIsEng = targetLang === 'eng';

    // Check if course already has seeds
    const { count: existingCount } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    if (existingCount > 0) {
      console.log(`Course ${courseCode} already has ${existingCount} seeds`);
      return { initialized: false, count: existingCount };
    }

    // Get canonical seeds (English)
    const { data: canonical, error: canonicalError } = await supabase
      .from('canonical_seeds')
      .select('seed_number, source_text')
      .order('seed_number');

    if (canonicalError || !canonical || canonical.length === 0) {
      throw new Error('Failed to fetch canonical seeds: ' + (canonicalError?.message || 'no data'));
    }

    // Get target language name for {target} substitution
    const targetLangName = getLanguageName(courseCode);

    // For non-English known languages, check for canonical translations
    // This applies to BOTH eng_for_X (type 2) AND X_for_Y (type 3) courses
    let knownTranslations = new Map();
    if (!knownIsEng) {
      const { data: translations } = await supabase
        .from('canonical_seed_translations')
        .select('seed_number, translated_text')
        .eq('language_code', knownLang);

      if (translations && translations.length > 0) {
        translations.forEach(t => knownTranslations.set(t.seed_number, t.translated_text));
        console.log(`Found ${translations.length} canonical translations for ${knownLang}`);
      }
    }

    // For non-English target languages, check for canonical translations
    // If e.g. por_for_eng already built, por translations exist — reuse them for por_for_fra
    let targetTranslations = new Map();
    if (!targetIsEng) {
      const { data: translations } = await supabase
        .from('canonical_seed_translations')
        .select('seed_number, translated_text')
        .eq('language_code', targetLang);

      if (translations && translations.length > 0) {
        translations.forEach(t => targetTranslations.set(t.seed_number, t.translated_text));
        console.log(`Found ${translations.length} canonical translations for ${targetLang}`);
      }
    }

    // Create course seeds based on which language is English
    // These are NOT mutually exclusive — eng_for_zho needs BOTH target from canonical AND known from translations
    const courseSeeds = canonical.map(c => {
      const canonicalText = c.source_text.replace(/\{target\}/g, targetLangName);
      let knownText = '';
      let targetText = '';

      // If known language is English, use canonical for known_text
      if (knownIsEng) {
        knownText = canonicalText;
      }

      // If target language is English, use canonical for target_text
      if (targetIsEng) {
        targetText = canonicalText;
      }

      // If known language is NOT English, check for pre-existing translations
      // This applies to BOTH eng_for_X and X_for_Y courses
      if (!knownIsEng && knownTranslations.has(c.seed_number)) {
        knownText = knownTranslations.get(c.seed_number).replace(/\{target\}/g, targetLangName);
      }

      // If target language is NOT English, check for pre-existing translations
      if (!targetIsEng && targetTranslations.has(c.seed_number)) {
        targetText = targetTranslations.get(c.seed_number).replace(/\{target\}/g, targetLangName);
      }

      return {
        course_code: courseCode,
        seed_number: c.seed_number,
        known_text: knownText,
        target_text: targetText
      };
    });

    // Insert
    const { error: insertError } = await supabase
      .from('course_seeds')
      .insert(courseSeeds);

    if (insertError) {
      throw new Error('Failed to initialize course seeds: ' + insertError.message);
    }

    // Build mode description for logging
    const modeParts = [];
    if (knownIsEng) modeParts.push('known=eng (instant)');
    if (targetIsEng) modeParts.push('target=eng (instant)');
    if (!knownIsEng && knownTranslations.size > 0) modeParts.push(`known=${knownLang} (${knownTranslations.size} from translations)`);
    if (!knownIsEng && knownTranslations.size === 0) modeParts.push(`known=${knownLang} (agent translates)`);
    if (!targetIsEng && targetTranslations.size > 0) modeParts.push(`target=${targetLang} (${targetTranslations.size} from translations)`);
    if (!targetIsEng && targetTranslations.size === 0) modeParts.push(`target=${targetLang} (agent translates)`);
    const mode = modeParts.join(', ');
    console.log(`Initialized ${courseCode} with ${courseSeeds.length} seeds [${mode}]`);
    return { initialized: true, count: courseSeeds.length, mode, targetLangName, knownTranslations: knownTranslations.size, targetTranslations: targetTranslations.size };
  }

  // ===========================================================================
  // GET /course/:courseCode/translate
  // Returns canonical seeds that need translation, along with SSi method guidance.
  // ===========================================================================
  router.get('/course/:courseCode/translate', async (req, res) => {
    const { courseCode } = req.params;
    const limit = parseInt(req.query.limit) || 300;  // Default course size
    const offset = parseInt(req.query.offset) || 0;

    // Parse course type
    const parts = courseCode.split('_for_');
    const targetLang = parts[0] || '';
    const knownLang = parts[1] || '';
    const knownIsEng = knownLang === 'eng';
    const targetIsEng = targetLang === 'eng';
    const targetLangName = getLanguageName(courseCode);

    // Initialize course if needed
    try {
      await initializeCourseSeeds(courseCode);
    } catch (err) {
      console.error('Init error:', err.message);
    }

    // Get seeds that need translation
    const { data: seeds, error } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .order('seed_number')
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Filter to seeds needing translation
    const needsTranslation = seeds.filter(s => {
      const needsKnown = !knownIsEng && (!s.known_text || s.known_text === '');
      const needsTarget = !targetIsEng && (!s.target_text || s.target_text === '');
      return needsKnown || needsTarget;
    });

    // Get canonical text for reference
    const { data: canonical } = await supabase
      .from('canonical_seeds')
      .select('seed_number, source_text')
      .in('seed_number', needsTranslation.map(s => s.seed_number));

    const canonicalMap = {};
    (canonical || []).forEach(c => {
      canonicalMap[c.seed_number] = c.source_text.replace(/\{target\}/g, targetLangName);
    });

    // Build response with guidance
    const seedsToTranslate = needsTranslation.map(s => ({
      seed_number: s.seed_number,
      canonical_english: canonicalMap[s.seed_number] || '',
      current_known: s.known_text || null,
      current_target: s.target_text || null,
      needs_known: !knownIsEng && (!s.known_text || s.known_text === ''),
      needs_target: !targetIsEng && (!s.target_text || s.target_text === '')
    }));

    res.json({
      course_code: courseCode,
      target_language: targetLangName,
      known_language: knownLang,
      mode: knownIsEng ? 'translate_targets' : targetIsEng ? 'translate_knowns' : 'translate_both',
      total_seeds: seeds.length,
      needs_translation: seedsToTranslate.length,
      seeds: seedsToTranslate,
      guidance: {
        principles: [
          'CONSISTENCY: Same concept = same translation throughout all seeds',
          'COGNATES: Use cognates where they sound natural (especially for related languages)',
          'PATTERNS: Maintain consistent grammatical structures across seeds',
          'SIMPLICITY: Prefer simpler constructions that work for teaching',
          'ZUT: Translations must pass Zero Uncertainty Test (unambiguous meaning)'
        ],
        tips: [
          `Translate all seeds together to ensure vocabulary consistency`,
          `Create a mental glossary of key terms before starting`,
          `For ${targetLangName}: prefer common/standard forms over regional variants`,
          `Match formality level consistently (tu vs vous, tú vs usted, etc.)`
        ]
      }
    });
  });

  // ===========================================================================
  // POST /course/:courseCode/translate
  // Submit batch translations for multiple seeds at once.
  // Body: { translations: [{ seed_number, known_text?, target_text? }, ...] }
  // ===========================================================================
  router.post('/course/:courseCode/translate', async (req, res) => {
    const { courseCode } = req.params;
    const { translations } = req.body;

    if (!translations || !Array.isArray(translations)) {
      return res.status(400).json({
        error: 'translations array required',
        example: { translations: [{ seed_number: 1, target_text: '...' }] }
      });
    }

    // Parse course type
    const parts = courseCode.split('_for_');
    const knownLang = parts[1] || '';
    const knownIsEng = knownLang === 'eng';

    let updated = 0;
    let errors = [];

    for (const t of translations) {
      if (!t.seed_number) {
        errors.push({ error: 'missing seed_number', item: t });
        continue;
      }

      const updateData = {};
      if (t.known_text) updateData.known_text = t.known_text;
      if (t.target_text) updateData.target_text = t.target_text;

      if (Object.keys(updateData).length === 0) {
        errors.push({ error: 'no translation provided', seed_number: t.seed_number });
        continue;
      }

      const { error } = await supabase
        .from('course_seeds')
        .update(updateData)
        .eq('course_code', courseCode)
        .eq('seed_number', t.seed_number);

      if (error) {
        errors.push({ error: error.message, seed_number: t.seed_number });
      } else {
        updated++;
      }
    }

    console.log(`Batch translation for ${courseCode}: ${updated}/${translations.length} updated`);

    res.json({
      course_code: courseCode,
      submitted: translations.length,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      message: `${updated} seeds translated successfully`
    });
  });

  // ===========================================================================
  // POST /course/:courseCode/analysis
  // Save translation analysis after Pass 1.
  // Body: { analysis: { generated_at, seeds_analyzed, register, problem_verbs, ... } }
  // ===========================================================================
  router.post('/course/:courseCode/analysis', async (req, res) => {
    const { courseCode } = req.params;
    const { analysis } = req.body;

    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({
        error: 'Required: analysis object with translation analysis data'
      });
    }

    // Validate required fields
    const requiredFields = ['generated_at', 'seeds_analyzed'];
    const missingFields = requiredFields.filter(f => !analysis[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields in analysis: ${missingFields.join(', ')}`
      });
    }

    // Check course exists
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('course_code, display_name')
      .eq('course_code', courseCode)
      .single();

    if (courseErr || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` });
    }

    // Save analysis to course record
    const { error: updateErr } = await supabase
      .from('courses')
      .update({
        translation_analysis: analysis,
        updated_at: new Date().toISOString()
      })
      .eq('course_code', courseCode);

    if (updateErr) {
      console.error(`Error saving analysis for ${courseCode}:`, updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    console.log(`[ANALYSIS] Saved translation analysis for ${courseCode}: ${analysis.seeds_analyzed} seeds analyzed`);

    res.json({
      success: true,
      course_code: courseCode,
      message: `Translation analysis saved for ${analysis.seeds_analyzed} seeds`,
      summary: {
        problem_verbs: (analysis.problem_verbs || []).length,
        golden_keys: (analysis.golden_keys || []).length,
        zut_concerns: (analysis.zut_concerns || []).length,
        register: analysis.register?.choice || 'not specified'
      }
    });
  });

  // ===========================================================================
  // GET /course/:courseCode/analysis
  // Retrieve translation analysis.
  // ===========================================================================
  router.get('/course/:courseCode/analysis', async (req, res) => {
    const { courseCode } = req.params;

    const { data: course, error } = await supabase
      .from('courses')
      .select('course_code, display_name, translation_analysis')
      .eq('course_code', courseCode)
      .single();

    if (error || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` });
    }

    if (!course.translation_analysis) {
      return res.status(404).json({
        error: 'No translation analysis found',
        hint: 'Complete Pass 1 (translate all seeds) and POST analysis to /api/course/:code/analysis',
        course_code: courseCode
      });
    }

    res.json({
      course_code: courseCode,
      display_name: course.display_name,
      analysis: course.translation_analysis
    });
  });

  // ===========================================================================
  // POST /course/:courseCode/quality-rules
  // Save methodology guidance after Pass 1.
  // Body: { quality_rules: { analysis_date, known_language, target_language, ... } }
  // ===========================================================================
  router.post('/course/:courseCode/quality-rules', async (req, res) => {
    const { courseCode } = req.params;
    const { quality_rules } = req.body;

    if (!quality_rules || typeof quality_rules !== 'object') {
      return res.status(400).json({
        error: 'Required: quality_rules object with methodology guidance'
      });
    }

    // Validate required fields
    const requiredFields = ['analysis_date', 'known_language', 'target_language'];
    const missingFields = requiredFields.filter(f => !quality_rules[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields in quality_rules: ${missingFields.join(', ')}`
      });
    }

    // Check course exists
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('course_code, display_name')
      .eq('course_code', courseCode)
      .single();

    if (courseErr || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` });
    }

    // Save quality_rules to course record
    const { error: updateErr } = await supabase
      .from('courses')
      .update({
        quality_rules: quality_rules,
        updated_at: new Date().toISOString()
      })
      .eq('course_code', courseCode);

    if (updateErr) {
      console.error(`Error saving quality_rules for ${courseCode}:`, updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    console.log(`[QUALITY_RULES] Saved methodology guidance for ${courseCode}`);

    res.json({
      success: true,
      course_code: courseCode,
      message: 'Quality rules saved - methodology guidance now available for future agents',
      summary: {
        known_language: quality_rules.known_language,
        target_language: quality_rules.target_language,
        avoid_patterns_count: (quality_rules.known_language_guidance?.avoid_patterns || []).length,
        methodology_insights_count: (quality_rules.methodology_insights || []).length,
        zut_direction: quality_rules.zut_direction || 'not specified'
      }
    });
  });

  // ===========================================================================
  // GET /course/:courseCode/quality-rules
  // Retrieve methodology guidance.
  // ===========================================================================
  router.get('/course/:courseCode/quality-rules', async (req, res) => {
    const { courseCode } = req.params;

    const { data: course, error } = await supabase
      .from('courses')
      .select('course_code, display_name, quality_rules')
      .eq('course_code', courseCode)
      .single();

    if (error || !course) {
      return res.status(404).json({ error: `Course not found: ${courseCode}` });
    }

    if (!course.quality_rules) {
      return res.status(404).json({
        error: 'No quality rules found',
        hint: 'Run /course-methodology-analysis after Pass 1 to generate guidance',
        course_code: courseCode
      });
    }

    res.json({
      course_code: courseCode,
      display_name: course.display_name,
      quality_rules: course.quality_rules
    });
  });

  return router;
};
