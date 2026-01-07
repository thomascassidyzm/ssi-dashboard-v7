/**
 * POST /api/baskets/upload
 *
 * Direct database upload for Phase 3 basket generation.
 * Workers POST here instead of going through orchestrator.
 *
 * Body: {
 *   course: 'zho_for_eng',
 *   seed: 'S0001',
 *   baskets: {
 *     'S0001L01': {
 *       lego: { known: '...', target: '...' },
 *       practice_phrases: [{ known: '...', target: '...' }, ...]
 *     }
 *   }
 * }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { course, seed, baskets } = req.body;

    if (!course || !seed || !baskets) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, seed, baskets'
      });
    }

    const supabase = getSupabase();

    // Parse seed number from seed ID (e.g., 'S0001' -> 1)
    const seedNumber = parseInt(seed.replace(/\D/g, ''), 10);
    if (isNaN(seedNumber)) {
      return res.status(400).json({
        success: false,
        error: `Invalid seed format: ${seed}. Expected format: S0001`
      });
    }

    let totalPhrases = 0;
    const errors = [];

    // Process each LEGO basket
    for (const [legoId, basket] of Object.entries(baskets)) {
      // Parse lego index from ID (e.g., 'S0001L01' -> 1)
      const legoMatch = legoId.match(/L(\d+)$/);
      if (!legoMatch) {
        errors.push({ legoId, error: 'Invalid LEGO ID format' });
        continue;
      }
      const legoIndex = parseInt(legoMatch[1], 10);

      const phrases = basket.practice_phrases || basket.phrases || [];

      // Delete existing phrases for this LEGO (replace strategy)
      const { error: deleteError } = await supabase
        .from('course_practice_phrases')
        .delete()
        .eq('course_code', course)
        .eq('seed_number', seedNumber)
        .eq('lego_index', legoIndex);

      if (deleteError) {
        errors.push({ legoId, error: `Delete failed: ${deleteError.message}` });
        continue;
      }

      // Insert new phrases
      const phraseRows = phrases.map((phrase, index) => ({
        course_code: course,
        seed_number: seedNumber,
        lego_index: legoIndex,
        known_text: phrase.known,
        target_text: phrase.target,
        position: index + 1,
        word_count: phrase.syllable_count || phrase.word_count || (phrase.target || '').split(/\s+/).length,
        lego_count: phrase.lego_count || 1
      }));

      if (phraseRows.length > 0) {
        const { error: insertError } = await supabase
          .from('course_practice_phrases')
          .insert(phraseRows);

        if (insertError) {
          errors.push({ legoId, error: `Insert failed: ${insertError.message}` });
          continue;
        }
      }

      totalPhrases += phraseRows.length;
    }

    if (errors.length > 0) {
      return res.status(207).json({
        success: false,
        message: `Partial success: ${Object.keys(baskets).length - errors.length}/${Object.keys(baskets).length} LEGOs saved`,
        totalPhrases,
        errors
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Baskets saved to database',
      course,
      seed,
      basketCount: Object.keys(baskets).length,
      totalPhrases
    });

  } catch (error) {
    console.error('[Baskets Upload] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
