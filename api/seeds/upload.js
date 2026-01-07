/**
 * POST /api/seeds/upload
 *
 * Direct database upload for Phase 1 (Translation + LEGO Extraction).
 * Workers POST here instead of going through ngrok orchestrator.
 *
 * Body: {
 *   course: 'spa_for_eng',
 *   seeds: [
 *     {
 *       seed_id: 'S0001',
 *       seed_pair: { known: '...', target: '...' },
 *       legos: [
 *         { id: 'S0001L01', type: 'A', new: true, lego: { known: '...', target: '...' } },
 *         { id: 'S0001L02', type: 'M', new: true, lego: { known: '...', target: '...' }, components: [...] }
 *       ]
 *     }
 *   ]
 * }
 *
 * Also accepts compact format (auto-expanded):
 * {
 *   course: 'spa_for_eng',
 *   seeds: [
 *     { s: 'S0001', k: '...', t: '...', l: [{ y: 'A', n: 1, k: '...', t: '...' }] }
 *   ]
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

/**
 * Parse seed number from seed_id
 * "S0001" -> 1
 */
function parseSeedNumber(seedId) {
  if (typeof seedId === 'number') return seedId;
  const match = String(seedId).match(/S?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse LEGO index from lego_id
 * "S0001L01" -> 1
 */
function parseLegoIndex(legoId) {
  if (typeof legoId === 'number') return legoId;
  const match = String(legoId).match(/L(\d+)$/i);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Expand compact format to full format
 *
 * Compact: { s: 'S0001', k: '...', t: '...', l: [{ y: 'A', n: 1, k: '...', t: '...' }] }
 * Full: { seed_id: 'S0001', seed_pair: { known: '...', target: '...' }, legos: [...] }
 */
function expandCompactFormat(seeds) {
  return seeds.map(seed => {
    // Already in full format
    if (seed.seed_id) return seed;

    // Array-based hybrid format
    if (Array.isArray(seed)) {
      const [seedId, seedPair, legos] = seed;
      return {
        seed_id: seedId,
        seed_pair: { known: seedPair.k, target: seedPair.t },
        legos: (legos || []).map((lego, idx) => {
          const [type, isNew, legoPair, components] = lego;
          const expanded = {
            id: `${seedId}L${String(idx + 1).padStart(2, '0')}`,
            type: type,
            new: isNew === 1 || isNew === true,
            lego: { known: legoPair.k, target: legoPair.t }
          };
          if (components && components.length > 0) {
            expanded.components = components.map(c => ({ known: c.k, target: c.t }));
          }
          return expanded;
        })
      };
    }

    // Object-based compact format
    const seedId = seed.s;
    return {
      seed_id: seedId,
      seed_pair: { known: seed.k, target: seed.t },
      legos: (seed.l || []).map((lego, idx) => {
        const expanded = {
          id: `${seedId}L${String(idx + 1).padStart(2, '0')}`,
          type: lego.y,
          new: lego.n === 1 || lego.n === true,
          lego: { known: lego.k, target: lego.t }
        };
        if (lego.c) {
          expanded.components = lego.c.map(c => ({ known: c.k, target: c.t }));
        }
        return expanded;
      })
    };
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
    let { course, seeds } = req.body;

    if (!course || !seeds) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: course, seeds'
      });
    }

    if (!Array.isArray(seeds)) {
      return res.status(400).json({
        success: false,
        error: 'seeds must be an array'
      });
    }

    // Detect and expand compact formats
    const isCompact = seeds.length > 0 && (seeds[0].s || Array.isArray(seeds[0]));
    if (isCompact) {
      seeds = expandCompactFormat(seeds);
    }

    const supabase = getSupabase();

    let totalSeeds = 0;
    let totalLegos = 0;
    let totalComponents = 0;
    const errors = [];

    // Process each seed
    for (const seedData of seeds) {
      const seedNumber = parseSeedNumber(seedData.seed_id);
      if (!seedNumber) {
        errors.push({ seedId: seedData.seed_id, error: 'Invalid seed_id format' });
        continue;
      }

      // Upsert seed into course_seeds
      const { error: seedError } = await supabase
        .from('course_seeds')
        .upsert({
          course_code: course,
          seed_number: seedNumber,
          known_text: seedData.seed_pair?.known || seedData.known,
          target_text: seedData.seed_pair?.target || seedData.target,
          status: 'draft'
        }, {
          onConflict: 'course_code,seed_number'
        });

      if (seedError) {
        errors.push({ seedId: seedData.seed_id, error: `Seed upsert failed: ${seedError.message}` });
        continue;
      }

      totalSeeds++;

      // Process LEGOs for this seed
      const legos = seedData.legos || [];
      for (const legoData of legos) {
        const legoIndex = parseLegoIndex(legoData.id);

        // Prepare components for M-type LEGOs
        let components = null;
        if (legoData.type === 'M' && legoData.components) {
          components = legoData.components;
          totalComponents += components.length;
        }

        // Upsert LEGO into course_legos
        const { error: legoError } = await supabase
          .from('course_legos')
          .upsert({
            course_code: course,
            seed_number: seedNumber,
            lego_index: legoIndex,
            known_text: legoData.lego?.known || legoData.known,
            target_text: legoData.lego?.target || legoData.target,
            type: legoData.type || 'A',
            is_new: legoData.new !== false,
            components: components,
            status: 'draft'
          }, {
            onConflict: 'course_code,seed_number,lego_index'
          });

        if (legoError) {
          errors.push({
            seedId: seedData.seed_id,
            legoId: legoData.id,
            error: `LEGO upsert failed: ${legoError.message}`
          });
          continue;
        }

        totalLegos++;
      }
    }

    if (errors.length > 0 && totalSeeds === 0) {
      return res.status(400).json({
        success: false,
        error: 'All seeds failed to save',
        errors
      });
    }

    if (errors.length > 0) {
      return res.status(207).json({
        success: false,
        message: `Partial success: ${totalSeeds}/${seeds.length} seeds saved`,
        totalSeeds,
        totalLegos,
        totalComponents,
        errors
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Seeds and LEGOs saved to database',
      course,
      totalSeeds,
      totalLegos,
      totalComponents,
      expanded: isCompact
    });

  } catch (error) {
    console.error('[Seeds Upload] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
