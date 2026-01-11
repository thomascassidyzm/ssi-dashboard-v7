/**
 * POST /api/upload-seed
 *
 * Direct database upload for Phase 1 seed translation.
 * Workers POST here with complete seed + LEGOs as atomic unit.
 *
 * Body: {
 *   course: 'spa_for_eng',
 *   seed_number: 42,           // or "S0042" string
 *   known_text: 'I want to go',
 *   target_text: 'Quiero ir',
 *   legos: [
 *     { lego_index: 0, known_text: '...', target_text: '...', type: 'A', is_new: true },
 *     { lego_index: 1, known_text: '...', target_text: '...', type: 'M', is_new: true, components: [...] }
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

function parseSeedNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Handle "S0042" format
    const num = parseInt(value.replace(/\D/g, ''), 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

function formatSeedId(num) {
  return `S${String(num).padStart(4, '0')}`;
}

// Report event to orchestrator for WebSocket broadcast (fire-and-forget)
async function reportEvent(courseCode, eventData) {
  const orchestratorUrl = process.env.ORCHESTRATOR_URL;
  if (!orchestratorUrl) return;

  try {
    await fetch(`${orchestratorUrl}/api/events/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
  } catch (err) {
    // Fire-and-forget - don't block on event reporting
    console.warn('[Upload Seed] Event report failed:', err.message);
  }
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
    const { course, seed_number, known_text, target_text, legos } = req.body;

    // Validate required fields
    if (!course) {
      return res.status(400).json({ success: false, error: 'Missing required field: course' });
    }

    const seedNum = parseSeedNumber(seed_number);
    if (seedNum === null) {
      return res.status(400).json({ success: false, error: `Invalid seed_number: ${seed_number}` });
    }

    if (!known_text || !target_text) {
      return res.status(400).json({ success: false, error: 'Missing required fields: known_text, target_text' });
    }

    if (!legos || !Array.isArray(legos) || legos.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing or empty legos array' });
    }

    const supabase = getSupabase();

    // DELETE existing LEGOs for this seed first (child records)
    const { error: deleteLegoError } = await supabase
      .from('course_legos')
      .delete()
      .eq('course_code', course)
      .eq('seed_number', seedNum);

    if (deleteLegoError) {
      return res.status(500).json({
        success: false,
        error: `Failed to delete existing LEGOs: ${deleteLegoError.message}`
      });
    }

    // DELETE existing seed (parent record)
    const { error: deleteSeedError } = await supabase
      .from('course_seeds')
      .delete()
      .eq('course_code', course)
      .eq('seed_number', seedNum);

    if (deleteSeedError) {
      return res.status(500).json({
        success: false,
        error: `Failed to delete existing seed: ${deleteSeedError.message}`
      });
    }

    // INSERT seed
    const { error: insertSeedError } = await supabase
      .from('course_seeds')
      .insert({
        course_code: course,
        seed_number: seedNum,
        known_text,
        target_text,
        status: 'draft'
      });

    if (insertSeedError) {
      return res.status(500).json({
        success: false,
        error: `Failed to insert seed: ${insertSeedError.message}`
      });
    }

    // INSERT LEGOs
    const legoRows = legos.map((lego, idx) => ({
      course_code: course,
      seed_number: seedNum,
      lego_index: lego.lego_index ?? idx,
      known_text: lego.known_text,
      target_text: lego.target_text,
      type: lego.type || 'A',
      is_new: lego.is_new !== false,
      components: lego.type === 'M' && lego.components ? lego.components : null,
      status: 'draft'
    }));

    const { error: insertLegoError } = await supabase
      .from('course_legos')
      .insert(legoRows);

    if (insertLegoError) {
      return res.status(500).json({
        success: false,
        error: `Failed to insert LEGOs: ${insertLegoError.message}`
      });
    }

    // Report seed:complete event to orchestrator (fire-and-forget)
    const seedId = formatSeedId(seedNum);
    reportEvent(course, {
      event: 'seed:complete',
      seedId,
      legoCount: legoRows.length
    });

    return res.status(200).json({
      success: true,
      seed_number: seedNum,
      lego_count: legoRows.length
    });

  } catch (error) {
    console.error('[Upload Seed] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
