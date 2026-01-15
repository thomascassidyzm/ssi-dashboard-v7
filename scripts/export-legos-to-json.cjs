#!/usr/bin/env node
/**
 * Export LEGOs from database to lego_pairs.json
 * This bridges the gap between database-first and legacy JSON-based Phase 3
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function exportLegoPairs(courseCode) {
  console.log(`Exporting LEGOs from database to lego_pairs.json for ${courseCode}...`);

  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('Found', legos.length, 'LEGOs');

  // Group by seed
  const seedMap = new Map();
  for (const lego of legos) {
    const seedNum = lego.seed_number;
    if (!seedMap.has(seedNum)) {
      seedMap.set(seedNum, []);
    }
    seedMap.get(seedNum).push({
      lego_id: lego.lego_id,
      known_text: lego.known_text,
      target_text: lego.target_text,
      type: lego.lego_type || 'A',
      new: lego.is_new,
      components: lego.components || null
    });
  }

  // Build lego_pairs structure
  const seeds = [];
  for (const [seedNum, seedLegos] of [...seedMap.entries()].sort((a, b) => a[0] - b[0])) {
    seeds.push({
      seed_number: seedNum,
      seed_id: 'S' + String(seedNum).padStart(4, '0'),
      legos: seedLegos
    });
  }

  const legoPairs = {
    metadata: {
      course_code: courseCode,
      generated_at: new Date().toISOString(),
      source: 'supabase_export',
      total_seeds: seeds.length,
      total_legos: legos.length
    },
    seeds
  };

  const vfsRoot = process.env.VFS_ROOT || path.join(__dirname, '../public/vfs/courses');
  const outPath = path.join(vfsRoot, courseCode, 'lego_pairs.json');

  // Ensure directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  fs.writeFileSync(outPath, JSON.stringify(legoPairs, null, 2));
  console.log('Wrote:', outPath);
  console.log('Seeds:', seeds.length, 'LEGOs:', legos.length);

  // Count new LEGOs
  const newCount = legos.filter(l => l.is_new).length;
  console.log('New LEGOs (is_new=true):', newCount);
}

const courseCode = process.argv[2] || 'ita_for_eng';
exportLegoPairs(courseCode).catch(console.error);
