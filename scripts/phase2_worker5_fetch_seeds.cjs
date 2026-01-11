#!/usr/bin/env node

/**
 * Phase 2 Worker 5: Fetch assigned seeds from database
 * Seeds: S0061-S0075 (15 seeds)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load .env if it exists
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, continue with existing env vars
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const COURSE_CODE = 'zho_for_eng';
const ASSIGNED_SEEDS = [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials not configured');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  console.log('📥 Fetching seeds S0061-S0075 for zho_for_eng...\n');

  const seedsData = [];

  for (const seedNumber of ASSIGNED_SEEDS) {
    const seedId = `S${String(seedNumber).padStart(4, '0')}`;

    // Fetch seed
    const { data: seedData, error: seedError } = await supabase
      .from('course_seeds')
      .select('*')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seedNumber)
      .single();

    if (seedError) {
      console.error(`❌ Error fetching ${seedId}:`, seedError.message);
      continue;
    }

    if (!seedData) {
      console.log(`⚠️  ${seedId} not found in database`);
      continue;
    }

    // Fetch LEGOs for this seed
    const { data: legosData, error: legosError } = await supabase
      .from('course_legos')
      .select('*')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seedNumber)
      .order('lego_index');

    if (legosError) {
      console.error(`❌ Error fetching LEGOs for ${seedId}:`, legosError.message);
      continue;
    }

    // Transform to expected format
    const seed = {
      seed_id: seedId,
      seed_pair: {
        known: seedData.known_text,
        target: seedData.target_text
      },
      legos: (legosData || []).map(lego => {
        const legoId = `${seedId}L${String(lego.lego_index).padStart(2, '0')}`;
        const result = {
          id: legoId,
          new: lego.is_new,
          lego: {
            known: lego.known_text,
            target: lego.target_text
          },
          type: lego.type
        };

        // Add components for M-type LEGOs
        if (lego.type === 'M' && lego.components) {
          result.components = lego.components;
        }

        return result;
      })
    };

    seedsData.push(seed);
    console.log(`✅ ${seedId}: ${seed.legos.length} LEGOs`);
  }

  console.log(`\n📊 Total seeds fetched: ${seedsData.length}/15`);

  if (seedsData.length === 0) {
    console.error('\n❌ No seeds found in database.');
    console.error('This may mean:');
    console.error('1. Phase 1 has not been run for these seeds yet');
    console.error('2. The data is in VFS files, not in Supabase');
    console.error('3. The seed numbers are incorrect');
    process.exit(1);
  }

  // Save to file
  const outputPath = '/home/user/ssi-dashboard-v7/scripts/phase2_worker5_draft.json';
  fs.writeFileSync(outputPath, JSON.stringify({ course: COURSE_CODE, seeds: seedsData }, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
