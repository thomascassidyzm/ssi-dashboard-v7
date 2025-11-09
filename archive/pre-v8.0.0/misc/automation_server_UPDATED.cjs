// UPDATED API ENDPOINTS - Replace lines 1509-1683 in automation_server.cjs

/**
 * GET /api/courses
 * List all available courses
 *
 * NEW: Reads from translations.json + LEGO_BREAKDOWNS_COMPLETE.json directly
 */
app.get('/api/courses', async (req, res) => {
  try {
    const courseDirs = await fs.readdir(CONFIG.VFS_ROOT);
    const courses = [];

    for (const dir of courseDirs) {
      const coursePath = path.join(CONFIG.VFS_ROOT, dir);

      try {
        const stats = await fs.stat(coursePath);

        if (!stats.isDirectory() || dir === '.DS_Store') continue;

        // Look for new format: translations.json + LEGO_BREAKDOWNS_COMPLETE.json
        const translationsPath = path.join(coursePath, 'translations.json');
        const legosPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');

        // Check if this is a valid course (has both required files)
        if (await fs.pathExists(translationsPath) && await fs.pathExists(legosPath)) {
          // Parse course code (e.g., spa_for_eng_30seeds)
          const match = dir.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);
          if (!match) {
            console.log(`[API] Skipping directory ${dir} - doesn't match course code pattern`);
            continue;
          }

          const targetLang = match[1];
          const knownLang = match[2];
          const seedCount = parseInt(match[3]);

          // Load translations to get actual count
          const translations = await fs.readJson(translationsPath);
          const translationCount = Object.keys(translations).length;

          // Load LEGO breakdowns to get count
          const legoData = await fs.readJson(legosPath);
          const legoCount = legoData.lego_breakdowns?.length || 0;

          // Determine status based on what exists
          let status = 'phase_3_complete'; // Has translations + LEGOs
          let phases_completed = ['1', '3'];

          courses.push({
            course_code: dir,
            source_language: knownLang.toUpperCase(),
            target_language: targetLang.toUpperCase(),
            total_seeds: seedCount,
            version: '1.0',
            created_at: stats.birthtime.toISOString(),
            status: status,

            // New terminology (dashboard displays these)
            seed_pairs: translationCount,
            lego_pairs: legoCount,
            lego_baskets: 0, // Phase 5 not implemented yet

            phases_completed: phases_completed,

            // Backward compatibility (if needed by older components)
            amino_acids: {
              translations: translationCount,
              legos: 0,
              legos_deduplicated: legoCount,
              baskets: 0,
              introductions: 0
            }
          });
        }
      } catch (error) {
        console.error(`[API] Error processing course directory ${dir}:`, error.message);
        // Skip this course and continue
      }
    }

    console.log(`[API] Found ${courses.length} courses`);
    res.json({ courses });
  } catch (error) {
    console.error('[API] Error listing courses:', error);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

/**
 * GET /api/courses/:courseCode
 * Get detailed course information including translations and LEGOs
 *
 * NEW: Reads from translations.json + LEGO_BREAKDOWNS_COMPLETE.json directly
 */
app.get('/api/courses/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Check if course exists
    if (!await fs.pathExists(coursePath)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check for required files
    const translationsPath = path.join(coursePath, 'translations.json');
    const legosPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');

    if (!await fs.pathExists(translationsPath)) {
      return res.status(404).json({ error: 'translations.json not found' });
    }

    if (!await fs.pathExists(legosPath)) {
      return res.status(404).json({ error: 'LEGO_BREAKDOWNS_COMPLETE.json not found' });
    }

    // Load translations.json
    const translationsData = await fs.readJson(translationsPath);

    // Convert to array format expected by frontend
    // Input: { "S0001": ["target", "known"], ... }
    // Output: [{ seed_id: "S0001", target_phrase: "...", known_phrase: "..." }, ...]
    const translations = Object.entries(translationsData).map(([seed_id, [target_phrase, known_phrase]]) => ({
      seed_id,
      target_phrase,
      known_phrase,
      canonical_seed: null // We don't have canonical seeds yet
    }));

    // Sort by seed_id
    translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id));

    // Load LEGO_BREAKDOWNS_COMPLETE.json
    const legoData = await fs.readJson(legosPath);

    // Extract lego_breakdowns array (already in correct format!)
    const legos = legoData.lego_breakdowns || [];

    // Generate course metadata
    const match = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);
    const stats = await fs.stat(coursePath);

    const course = {
      course_code: courseCode,
      source_language: match ? match[2].toUpperCase() : 'UNK',
      target_language: match ? match[1].toUpperCase() : 'UNK',
      total_seeds: match ? parseInt(match[3]) : 0,
      version: '1.0',
      created_at: stats.birthtime.toISOString(),
      status: 'phase_3_complete',

      // Dashboard-displayed fields
      seed_pairs: translations.length,
      lego_pairs: legos.length,
      lego_baskets: 0,

      phases_completed: ['1', '3'],

      // Metadata from LEGO file
      target_language_name: legoData.target_language,
      known_language_name: legoData.known_language
    };

    console.log(`[API] Loaded course ${courseCode}: ${translations.length} translations, ${legos.length} LEGO breakdowns`);

    res.json({
      course,
      translations,
      legos,
      baskets: [] // Empty for now (Phase 5 not implemented)
    });
  } catch (error) {
    console.error(`[API] Error loading course ${req.params.courseCode}:`, error);
    res.status(500).json({
      error: 'Failed to load course',
      details: error.message
    });
  }
});

/**
 * GET /api/courses/:courseCode/provenance/:seedId
 * Trace provenance for a specific seed
 *
 * NEW: Reads from translations.json + LEGO_BREAKDOWNS_COMPLETE.json
 */
app.get('/api/courses/:courseCode/provenance/:seedId', async (req, res) => {
  try {
    const { courseCode, seedId } = req.params;
    const coursePath = path.join(CONFIG.VFS_ROOT, courseCode);

    // Load translations
    const translationsPath = path.join(coursePath, 'translations.json');
    const translationsData = await fs.readJson(translationsPath);

    const translationPair = translationsData[seedId];
    if (!translationPair) {
      return res.status(404).json({ error: `Seed ${seedId} not found` });
    }

    const translation = {
      seed_id: seedId,
      target_phrase: translationPair[0],
      known_phrase: translationPair[1]
    };

    // Load LEGO breakdown for this seed
    const legosPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');
    const legoData = await fs.readJson(legosPath);

    const legoBreakdown = legoData.lego_breakdowns?.find(l => l.seed_id === seedId);

    // Build provenance chain
    const provenance = {
      seed: translation,
      lego_breakdown: legoBreakdown || null,
      phase_history: [
        {
          phase: '1',
          name: 'Translation',
          completed: true,
          output: translation
        },
        {
          phase: '3',
          name: 'LEGO Extraction',
          completed: !!legoBreakdown,
          output: legoBreakdown
        }
      ]
    };

    res.json(provenance);
  } catch (error) {
    console.error(`[API] Error tracing provenance for ${req.params.seedId}:`, error);
    res.status(500).json({ error: 'Failed to trace provenance' });
  }
});
