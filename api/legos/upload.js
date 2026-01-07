/**
 * POST /api/legos/upload
 *
 * Direct database upload for Phase 2 conflict resolution / LEGO extraction.
 * Workers POST here instead of going through orchestrator.
 *
 * Body format (array of seeds):
 * {
 *   course: 'zho_for_eng',
 *   seeds: [
 *     {
 *       seed_id: 'S0001',
 *       seed_pair: { known: '...', target: '...' },
 *       legos: [
 *         { id: 'S0001L01', type: 'A', new: true, known: '...', target: '...' },
 *         { id: 'S0001L02', type: 'M', new: true, known: '...', target: '...', components: [...] }
 *       ]
 *     }
 *   ]
 * }
 *
 * Or batch format (legacy):
 * {
 *   courseCode: 'zho_for_eng',
 *   seeds: [...]  // Same structure as above
 * }
 *
 * Updates course_legos table in Supabase, setting is_new flags and resolving conflicts.
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

/**
 * Parse seed number from seed_id
 * "S0042" -> 42, "s0042" -> 42
 */
function parseSeedNumber(seedId) {
  if (typeof seedId === 'number') return seedId;
  const match = String(seedId).match(/s?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse LEGO index from lego_id
 * "S0001L01" -> 1, "S0001L02" -> 2
 */
function parseLegoIndex(legoId) {
  if (typeof legoId === 'number') return legoId;
  const str = String(legoId);

  // Try Phase 1 format: S0001L01, S0001L02, etc.
  const phaseMatch = str.match(/L(\d+)$/i);
  if (phaseMatch) return parseInt(phaseMatch[1], 10);

  // Try legacy format: lego_s0042_001
  const legacyMatch = str.match(/_(\d+)$/);
  if (legacyMatch) return parseInt(legacyMatch[1], 10);

  return 1;
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
    // Accept both 'course' and 'courseCode' for compatibility
    const course = req.body.course || req.body.courseCode;
    const seeds = req.body.seeds || req.body;

    // Handle case where body IS the seeds array
    const seedsArray = Array.isArray(seeds) ? seeds : (Array.isArray(req.body) ? req.body : null);

    if (!course) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: course (or courseCode)'
      });
    }

    if (!seedsArray || !Array.isArray(seedsArray)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid seeds array'
      });
    }

    const supabase = getSupabase();

    let totalSeeds = 0;
    let totalLegos = 0;
    const errors = [];

    // Process each seed
    for (const seed of seedsArray) {
      const seedId = seed.seed_id || seed.seedId;
      const seedNumber = parseSeedNumber(seedId);

      if (!seedNumber) {
        errors.push({ seedId, error: `Invalid seed ID format: ${seedId}` });
        continue;
      }

      // Extract seed pair (handles various formats)
      const seedPair = seed.seed_pair || seed.seedPair || {
        known: seed.known || seed.k || '',
        target: seed.target || seed.t || ''
      };

      // Upsert the seed
      const { error: seedError } = await supabase
        .from('course_seeds')
        .upsert({
          course_code: course,
          seed_number: seedNumber,
          known_text: seedPair.known || seedPair.k || '',
          target_text: seedPair.target || seedPair.t || '',
          status: 'draft'
        }, {
          onConflict: 'course_code,seed_number'
        });

      if (seedError) {
        errors.push({ seedId, error: `Seed upsert failed: ${seedError.message}` });
        continue;
      }

      totalSeeds++;

      // Process LEGOs for this seed
      const legos = seed.legos || seed.l || [];

      for (const lego of legos) {
        const legoId = lego.id || lego.legoId;
        const legoIndex = lego.lego_index || parseLegoIndex(legoId);

        // Extract LEGO text (handles nested lego: {known, target} format)
        const knownText = lego.known || lego.k || lego.lego?.known || lego.lego?.k || '';
        const targetText = lego.target || lego.t || lego.lego?.target || lego.lego?.t || '';

        // Determine type (A = Atomic, M = Molecular)
        const type = lego.type || lego.y || 'A';

        // Determine is_new flag
        // Accepts: new, isNew, is_new, n (where 1/true = new, 0/false = not new)
        let isNew = true;
        if (lego.new !== undefined) isNew = lego.new === true || lego.new === 1;
        else if (lego.isNew !== undefined) isNew = lego.isNew === true || lego.isNew === 1;
        else if (lego.is_new !== undefined) isNew = lego.is_new === true || lego.is_new === 1;
        else if (lego.n !== undefined) isNew = lego.n === true || lego.n === 1;

        // Prepare components for M-type LEGOs
        let components = null;
        if (type === 'M' && lego.components) {
          // Handle various component formats
          if (Array.isArray(lego.components)) {
            components = lego.components.map(c => {
              // Array format: [known, target]
              if (Array.isArray(c)) {
                return { known: c[0], target: c[1] };
              }
              // Object format: {known, target} or {k, t}
              return {
                known: c.known || c.k || '',
                target: c.target || c.t || ''
              };
            });
          }
        } else if (type === 'M' && lego.c) {
          // Compact format: c: [{k, t}]
          components = lego.c.map(c => ({
            known: c.k || c.known || '',
            target: c.t || c.target || ''
          }));
        }

        // Upsert the LEGO
        const { error: legoError } = await supabase
          .from('course_legos')
          .upsert({
            course_code: course,
            seed_number: seedNumber,
            lego_index: legoIndex,
            known_text: knownText,
            target_text: targetText,
            type: type,
            is_new: isNew,
            components: components,
            status: 'draft'
          }, {
            onConflict: 'course_code,seed_number,lego_index'
          });

        if (legoError) {
          errors.push({
            seedId,
            legoId,
            error: `LEGO upsert failed: ${legoError.message}`
          });
          continue;
        }

        totalLegos++;
      }
    }

    if (errors.length > 0) {
      return res.status(207).json({
        success: false,
        message: `Partial success: ${totalSeeds}/${seedsArray.length} seeds, ${totalLegos} LEGOs saved`,
        course,
        totalSeeds,
        totalLegos,
        errors
      });
    }

    return res.status(200).json({
      success: true,
      message: 'LEGOs saved to database',
      course,
      seedCount: totalSeeds,
      legoCount: totalLegos
    });

  } catch (error) {
    console.error('[Legos Upload] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
