#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

/**
 * Phase 0: Language Pair Brief Service
 *
 * Responsibilities:
 * - Check if language pair brief exists in Supabase
 * - Return cached brief if available
 * - Store newly generated briefs
 * - Serve the Phase 0 prompt for agent generation
 *
 * Port: 3455 (pre-Phase 1)
 *
 * Flow:
 * 1. Course creation requests brief via GET /api/language-brief/:known/:target
 * 2. If cached → return immediately
 * 3. If not cached → return 404, caller spawns generation agent
 * 4. Agent generates brief and POSTs to /api/language-brief
 * 5. Brief cached in Supabase for future courses
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const { claudeChat } = require('../../shared/claude-cli.cjs');

// Supabase client
const { createClient } = require('@supabase/supabase-js');

// Claude CLI configured (uses Max Plan subscription, not API key)
console.log(`[Phase 0] Claude CLI configured (via claude --print)`);

const PORT = process.env.PHASE0_PORT || 3455;
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 0 (Language Brief)';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log(`[Phase 0] ✅ Supabase connected`);
} else {
  console.warn(`[Phase 0] ⚠️  Supabase not configured - will use in-memory cache only`);
}

// In-memory cache fallback (for development without Supabase)
const memoryCache = new Map();

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

/**
 * Language code to full name mapping
 */
const LANGUAGE_NAMES = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'ita': 'Italian',
  'por': 'Portuguese',
  'nld': 'Dutch',
  'swe': 'Swedish',
  'nor': 'Norwegian',
  'dan': 'Danish',
  'fin': 'Finnish',
  'rus': 'Russian',
  'pol': 'Polish',
  'ces': 'Czech',
  'slk': 'Slovak',
  'hun': 'Hungarian',
  'ron': 'Romanian',
  'bul': 'Bulgarian',
  'hrv': 'Croatian',
  'srp': 'Serbian',
  'slv': 'Slovenian',
  'mkd': 'Macedonian',
  'ell': 'Greek',
  'tur': 'Turkish',
  'ara': 'Arabic',
  'heb': 'Hebrew',
  'fas': 'Persian',
  'urd': 'Urdu',
  'hin': 'Hindi',
  'ben': 'Bengali',
  'tam': 'Tamil',
  'tel': 'Telugu',
  'mar': 'Marathi',
  'guj': 'Gujarati',
  'pan': 'Punjabi',
  'cmn': 'Mandarin Chinese',
  'yue': 'Cantonese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'vie': 'Vietnamese',
  'tha': 'Thai',
  'ind': 'Indonesian',
  'msa': 'Malay',
  'tgl': 'Tagalog',
  'cym': 'Welsh',
  'gle': 'Irish',
  'gla': 'Scottish Gaelic',
  'bre': 'Breton',
  'eus': 'Basque',
  'cat': 'Catalan',
  'glg': 'Galician',
  'ukr': 'Ukrainian',
  'bel': 'Belarusian',
  'lat': 'Latin',
  'swa': 'Swahili',
  'zul': 'Zulu',
  'afr': 'Afrikaans'
};

function getLanguageName(code) {
  return LANGUAGE_NAMES[code?.toLowerCase()] || code?.toUpperCase() || 'Unknown';
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    port: PORT,
    status: 'healthy',
    supabase: !!supabase
  });
});

/**
 * GET /api/language-brief/:known/:target
 * Get cached language pair brief
 *
 * Returns:
 * - 200 + brief if cached
 * - 404 if not found (caller should trigger generation)
 */
app.get('/api/language-brief/:known/:target', async (req, res) => {
  const { known, target } = req.params;
  const knownCode = known.toLowerCase();
  const targetCode = target.toLowerCase();

  console.log(`[Phase 0] 🔍 Looking up brief for ${knownCode} → ${targetCode}`);

  try {
    // Try Supabase first
    if (supabase) {
      const { data, error } = await supabase
        .from('language_pair_briefs')
        .select('*')
        .eq('known_code', knownCode)
        .eq('target_code', targetCode)
        .single();

      if (data && !error) {
        console.log(`[Phase 0] ✅ Brief found in Supabase (generated ${data.generated_at})`);
        return res.json({
          found: true,
          cached: true,
          known_code: knownCode,
          target_code: targetCode,
          known_name: getLanguageName(knownCode),
          target_name: getLanguageName(targetCode),
          brief: data.brief,
          generated_at: data.generated_at,
          generated_by: data.generated_by
        });
      }
    }

    // Try memory cache
    const cacheKey = `${knownCode}-${targetCode}`;
    if (memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      console.log(`[Phase 0] ✅ Brief found in memory cache`);
      return res.json({
        found: true,
        cached: true,
        source: 'memory',
        ...cached
      });
    }

    // Not found
    console.log(`[Phase 0] ❌ Brief not found for ${knownCode} → ${targetCode}`);
    return res.status(404).json({
      found: false,
      known_code: knownCode,
      target_code: targetCode,
      known_name: getLanguageName(knownCode),
      target_name: getLanguageName(targetCode),
      message: 'Brief not found. Trigger generation via POST /api/language-brief/generate'
    });

  } catch (error) {
    console.error(`[Phase 0] Error looking up brief:`, error);
    return res.status(500).json({ error: 'Failed to lookup brief', details: error.message });
  }
});

/**
 * POST /api/language-brief
 * Store a newly generated language pair brief
 *
 * Body: {
 *   known_code: string,
 *   target_code: string,
 *   brief: object,
 *   generated_by: string (optional)
 * }
 */
app.post('/api/language-brief', async (req, res) => {
  const { known_code, target_code, brief, generated_by } = req.body;

  if (!known_code || !target_code || !brief) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['known_code', 'target_code', 'brief']
    });
  }

  const knownCode = known_code.toLowerCase();
  const targetCode = target_code.toLowerCase();

  console.log(`[Phase 0] 💾 Storing brief for ${knownCode} → ${targetCode}`);

  try {
    // Validate brief structure
    const requiredFields = [
      'target_language_profile',
      'zut_failures',
      'zut_passes',
      'chunking_guidance',
      'phrase_generation_notes',
      'common_pitfalls'
    ];

    const missingFields = requiredFields.filter(f => !brief[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Invalid brief structure',
        missing_fields: missingFields
      });
    }

    const record = {
      known_code: knownCode,
      target_code: targetCode,
      brief,
      generated_by: generated_by || 'unknown',
      prompt_version: '1.0.0',
      generated_at: new Date().toISOString()
    };

    // Store in Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('language_pair_briefs')
        .upsert(record, {
          onConflict: 'known_code,target_code'
        })
        .select()
        .single();

      if (error) {
        console.error(`[Phase 0] Supabase error:`, error);
        // Fall back to memory cache
      } else {
        console.log(`[Phase 0] ✅ Brief stored in Supabase`);
        return res.json({
          success: true,
          stored: 'supabase',
          known_code: knownCode,
          target_code: targetCode,
          id: data.id
        });
      }
    }

    // Store in memory cache (fallback or if Supabase unavailable)
    const cacheKey = `${knownCode}-${targetCode}`;
    memoryCache.set(cacheKey, {
      known_code: knownCode,
      target_code: targetCode,
      known_name: getLanguageName(knownCode),
      target_name: getLanguageName(targetCode),
      brief,
      generated_at: record.generated_at,
      generated_by: record.generated_by
    });

    console.log(`[Phase 0] ✅ Brief stored in memory cache`);
    return res.json({
      success: true,
      stored: 'memory',
      known_code: knownCode,
      target_code: targetCode
    });

  } catch (error) {
    console.error(`[Phase 0] Error storing brief:`, error);
    return res.status(500).json({ error: 'Failed to store brief', details: error.message });
  }
});

/**
 * GET /api/language-brief/prompt
 * Get the Phase 0 prompt for agent generation
 */
app.get('/api/language-brief/prompt', async (req, res) => {
  try {
    const promptPath = path.join(__dirname, 'PROMPT.md');
    const content = await fs.readFile(promptPath, 'utf8');
    res.json({
      format: 'markdown',
      content
    });
  } catch (error) {
    console.error(`[Phase 0] Error reading prompt:`, error);
    res.status(500).json({ error: 'Failed to read prompt', details: error.message });
  }
});

/**
 * POST /api/language-brief/generate
 * Generate a language pair brief using Claude API
 *
 * Body: {
 *   known_code: string,
 *   target_code: string,
 *   known_name: string (optional),
 *   target_name: string (optional),
 *   sample_seeds: array (optional)
 * }
 */
app.post('/api/language-brief/generate', async (req, res) => {
  const { known_code, target_code, known_name, target_name, sample_seeds } = req.body;

  if (!known_code || !target_code) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['known_code', 'target_code']
    });
  }

  const knownCode = known_code.toLowerCase();
  const targetCode = target_code.toLowerCase();
  const knownName = known_name || getLanguageName(knownCode);
  const targetName = target_name || getLanguageName(targetCode);

  console.log(`[Phase 0] 🚀 Generation requested for ${knownCode} → ${targetCode}`);

  // Check if already exists (avoid regeneration)
  if (supabase) {
    const { data } = await supabase
      .from('language_pair_briefs')
      .select('brief')
      .eq('known_code', knownCode)
      .eq('target_code', targetCode)
      .single();

    if (data) {
      console.log(`[Phase 0] Brief already exists, returning cached version`);
      return res.json({
        status: 'already_exists',
        cached: true,
        brief: data.brief,
        message: 'Brief already exists.'
      });
    }
  }

  // Load prompt template
  const promptTemplate = await fs.readFile(path.join(__dirname, 'PROMPT.md'), 'utf8');

  const userMessage = `Generate a Language Pair Intelligence Brief for:

Known Language: ${knownName} (${knownCode})
Target Language: ${targetName} (${targetCode})

${sample_seeds?.length > 0 ? `Sample seeds from the course:\n${JSON.stringify(sample_seeds.slice(0, 10), null, 2)}` : ''}

Follow the instructions in the system prompt exactly. Return ONLY valid JSON.`;

  console.log(`[Phase 0] Calling Claude CLI to generate brief...`);

  try {
    const responseText = await claudeChat(userMessage, {
      model: 'opus',
      system: promptTemplate,
      timeout: 300000 // 5 min for opus
    });
    let brief;

    try {
      // Try to parse directly
      brief = JSON.parse(responseText);
    } catch (parseErr) {
      // Try to extract JSON from markdown code block
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        brief = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error('Could not parse JSON from response');
      }
    }

    console.log(`[Phase 0] Brief generated successfully`);

    // Store in database
    const record = {
      known_code: knownCode,
      target_code: targetCode,
      brief,
      generated_by: 'claude-opus-4-5',
      prompt_version: '1.2.0',
      generated_at: new Date().toISOString()
    };

    if (supabase) {
      const { error } = await supabase
        .from('language_pair_briefs')
        .upsert(record, { onConflict: 'known_code,target_code' });

      if (error) {
        console.error(`[Phase 0] Failed to store in Supabase:`, error);
      } else {
        console.log(`[Phase 0] Brief stored in Supabase`);
      }
    }

    // Also cache in memory
    const cacheKey = `${knownCode}-${targetCode}`;
    memoryCache.set(cacheKey, {
      known_code: knownCode,
      target_code: targetCode,
      known_name: knownName,
      target_name: targetName,
      brief,
      generated_at: record.generated_at,
      generated_by: record.generated_by
    });

    return res.json({
      status: 'generated',
      cached: false,
      known_code: knownCode,
      target_code: targetCode,
      brief,
      generated_by: 'claude-sonnet-4'
    });

  } catch (error) {
    console.error(`[Phase 0] Generation failed:`, error);
    return res.status(500).json({
      error: 'Failed to generate brief',
      details: error.message
    });
  }
});

/**
 * PUT /api/language-brief/:known/:target
 * Update an existing language pair brief
 *
 * Body: { brief: object }
 */
app.put('/api/language-brief/:known/:target', async (req, res) => {
  const { known, target } = req.params;
  const { brief } = req.body;
  const knownCode = known.toLowerCase();
  const targetCode = target.toLowerCase();

  if (!brief) {
    return res.status(400).json({ error: 'Missing brief in request body' });
  }

  console.log(`[Phase 0] 📝 Updating brief for ${knownCode} → ${targetCode}`);

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('language_pair_briefs')
        .update({
          brief,
          updated_at: new Date().toISOString()
        })
        .eq('known_code', knownCode)
        .eq('target_code', targetCode)
        .select()
        .single();

      if (error) {
        console.error(`[Phase 0] Supabase error:`, error);
        return res.status(500).json({ error: 'Failed to update brief', details: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'Brief not found' });
      }

      console.log(`[Phase 0] ✅ Brief updated in Supabase`);
      return res.json({
        success: true,
        known_code: knownCode,
        target_code: targetCode,
        updated_at: data.updated_at
      });
    }

    // Memory cache update
    const cacheKey = `${knownCode}-${targetCode}`;
    if (memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      cached.brief = brief;
      cached.updated_at = new Date().toISOString();
      memoryCache.set(cacheKey, cached);
      console.log(`[Phase 0] ✅ Brief updated in memory cache`);
      return res.json({
        success: true,
        known_code: knownCode,
        target_code: targetCode,
        source: 'memory'
      });
    }

    return res.status(404).json({ error: 'Brief not found' });

  } catch (error) {
    console.error(`[Phase 0] Error updating brief:`, error);
    return res.status(500).json({ error: 'Failed to update brief', details: error.message });
  }
});

/**
 * GET /api/language-names
 * Get all known language codes and names
 */
app.get('/api/language-names', (req, res) => {
  res.json(LANGUAGE_NAMES);
});

/**
 * GET /api/language-briefs
 * List all cached briefs (for admin/debugging)
 */
app.get('/api/language-briefs', async (req, res) => {
  try {
    const briefs = [];

    // Get from Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('language_pair_briefs')
        .select('known_code, target_code, generated_at, generated_by, validated')
        .order('generated_at', { ascending: false });

      if (data && !error) {
        briefs.push(...data.map(b => ({
          ...b,
          source: 'supabase',
          known_name: getLanguageName(b.known_code),
          target_name: getLanguageName(b.target_code)
        })));
      }
    }

    // Get from memory cache
    for (const [key, value] of memoryCache.entries()) {
      const exists = briefs.some(b =>
        b.known_code === value.known_code && b.target_code === value.target_code
      );
      if (!exists) {
        briefs.push({
          ...value,
          source: 'memory'
        });
      }
    }

    res.json({
      count: briefs.length,
      briefs
    });

  } catch (error) {
    console.error(`[Phase 0] Error listing briefs:`, error);
    res.status(500).json({ error: 'Failed to list briefs', details: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🌍 Phase 0: Language Pair Brief Service                     ║
║                                                               ║
║   Port: ${PORT}                                                ║
║   Supabase: ${supabase ? '✅ Connected' : '❌ Not configured'}                              ║
║                                                               ║
║   Endpoints:                                                  ║
║   GET  /health                      - Health check            ║
║   GET  /api/language-brief/:k/:t    - Get cached brief        ║
║   POST /api/language-brief          - Store new brief         ║
║   POST /api/language-brief/generate - Request generation      ║
║   GET  /api/language-brief/prompt   - Get generation prompt   ║
║   GET  /api/language-briefs         - List all briefs         ║
║   GET  /api/language-names          - Get language names      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
