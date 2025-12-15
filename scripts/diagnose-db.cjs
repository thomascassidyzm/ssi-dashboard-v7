#!/usr/bin/env node
/**
 * Diagnose database LEGO/seed linkage issues
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnose() {
  console.log('=== DATABASE DIAGNOSTIC ===\n');

  // 1. Get all data
  const { data: allLegos } = await supabase.from('legos').select('id, seed_id, lego_id');
  const { data: allSeeds } = await supabase.from('seeds').select('id, course_code, seed_number');

  const seedIds = new Set(allSeeds.map(s => s.id));
  const orphanedLegos = allLegos.filter(l => !seedIds.has(l.seed_id));

  console.log('Total LEGOs in database:', allLegos.length);
  console.log('Total Seeds in database:', allSeeds.length);
  console.log('Orphaned LEGOs (invalid seed_id):', orphanedLegos.length);
  if (orphanedLegos.length > 0) {
    console.log('  First 5 orphaned:', orphanedLegos.slice(0, 5).map(l => l.lego_id));
  }

  // 2. Count LEGOs properly by looking at seed's course_code
  const seedCourseMap = {};
  allSeeds.forEach(s => seedCourseMap[s.id] = s.course_code);

  const legoByCourse = {};
  allLegos.forEach(l => {
    const course = seedCourseMap[l.seed_id];
    if (course) {
      legoByCourse[course] = (legoByCourse[course] || 0) + 1;
    }
  });

  console.log('\nLEGOs by course (via seed join):');
  Object.entries(legoByCourse).sort().forEach(([course, count]) => {
    console.log(`  ${course}: ${count}`);
  });

  // 3. Check spa_for_eng_v2 specifically
  console.log('\n=== spa_for_eng_v2 DETAIL ===');
  const v2Seeds = allSeeds.filter(s => s.course_code === 'spa_for_eng_v2');
  console.log('Seeds:', v2Seeds.length);
  console.log('Seed numbers:', v2Seeds.map(s => s.seed_number).sort((a,b) => a-b).join(', '));

  const v2SeedIds = new Set(v2Seeds.map(s => s.id));
  const v2Legos = allLegos.filter(l => v2SeedIds.has(l.seed_id));
  console.log('LEGOs linked to those seeds:', v2Legos.length);

  // 4. Check for seeds with same seed_number but different courses
  console.log('\n=== SEED OVERLAP CHECK ===');
  const seedNumberByCourse = {};
  allSeeds.forEach(s => {
    const key = `${s.course_code}:${s.seed_number}`;
    if (!seedNumberByCourse[key]) seedNumberByCourse[key] = [];
    seedNumberByCourse[key].push(s.id);
  });

  const duplicates = Object.entries(seedNumberByCourse).filter(([k, v]) => v.length > 1);
  console.log('Duplicate course:seed_number entries:', duplicates.length);
  if (duplicates.length > 0) {
    console.log('  Examples:', duplicates.slice(0, 5).map(([k]) => k));
  }

  // 5. Check the JSON source files
  console.log('\n=== SOURCE FILE CHECK ===');
  const fs = require('fs-extra');
  const path = require('path');

  const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', 'spa_for_eng_v2');
  const legoPairsPath = path.join(coursePath, 'lego_pairs.json');

  if (await fs.pathExists(legoPairsPath)) {
    const legoPairs = await fs.readJson(legoPairsPath);
    console.log('lego_pairs.json seeds:', legoPairs.seeds?.length || 0);

    let totalLegos = 0;
    legoPairs.seeds?.forEach(s => {
      totalLegos += (s.legos || []).length;
    });
    console.log('lego_pairs.json total LEGOs:', totalLegos);
  }
}

diagnose().catch(console.error);
