#!/usr/bin/env node
/**
 * Migrate baskets from local JSON file to Supabase database
 *
 * Reads lego_baskets.json and POSTs each seed's baskets to the Vercel endpoint.
 *
 * Usage:
 *   node scripts/migrate-baskets-to-db.cjs zho_for_eng
 *   node scripts/migrate-baskets-to-db.cjs zho_for_eng --dry-run
 */

const fs = require('fs');
const path = require('path');

const UPLOAD_URL = 'https://popty.app/api/baskets/upload';

async function migrateBaskets(courseCode, dryRun = false) {
  console.log(`\n🚀 Migrating baskets for ${courseCode} to database`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`   Endpoint: ${UPLOAD_URL}\n`);

  // Find the lego_baskets.json file
  const possiblePaths = [
    path.join(process.cwd(), 'public/vfs/courses', courseCode, 'lego_baskets.json'),
    path.join(process.cwd(), 'tools/vfs/courses', courseCode, 'lego_baskets.json'),
  ];

  let basketsPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      basketsPath = p;
      break;
    }
  }

  if (!basketsPath) {
    console.error(`❌ Could not find lego_baskets.json for ${courseCode}`);
    console.error(`   Searched: ${possiblePaths.join(', ')}`);
    process.exit(1);
  }

  console.log(`📂 Found: ${basketsPath}`);

  // Load baskets
  const rawData = fs.readFileSync(basketsPath, 'utf8');
  const allBaskets = JSON.parse(rawData);

  // Group baskets by seed
  const basketsBySeed = {};
  for (const [legoId, basketData] of Object.entries(allBaskets)) {
    // Extract seed from lego ID (e.g., "S0010L02" -> "S0010")
    const seedMatch = legoId.match(/^(S\d+)/);
    if (!seedMatch) {
      console.warn(`⚠️  Skipping ${legoId} - invalid format`);
      continue;
    }
    const seedId = seedMatch[1];

    if (!basketsBySeed[seedId]) {
      basketsBySeed[seedId] = {};
    }
    basketsBySeed[seedId][legoId] = basketData;
  }

  const seeds = Object.keys(basketsBySeed).sort();
  let totalBaskets = Object.keys(allBaskets).length;
  let totalPhrases = 0;

  for (const basket of Object.values(allBaskets)) {
    totalPhrases += basket.practice_phrases?.length || 0;
  }

  console.log(`\n📊 Found ${totalBaskets} baskets across ${seeds.length} seeds (${totalPhrases} phrases)`);
  console.log(`   Seeds: ${seeds[0]} - ${seeds[seeds.length - 1]}\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - showing what would be uploaded:\n');
    for (const seedId of seeds) {
      const seedBaskets = basketsBySeed[seedId];
      const legoCount = Object.keys(seedBaskets).length;
      const phraseCount = Object.values(seedBaskets).reduce((sum, b) => sum + (b.practice_phrases?.length || 0), 0);
      console.log(`   ${seedId}: ${legoCount} LEGOs, ${phraseCount} phrases`);
    }
    console.log(`\n✅ Dry run complete. Run without --dry-run to upload.`);
    return;
  }

  // Upload each seed's baskets
  let successCount = 0;
  let failCount = 0;
  let uploadedPhrases = 0;

  for (const seedId of seeds) {
    const seedBaskets = basketsBySeed[seedId];
    const legoCount = Object.keys(seedBaskets).length;

    const payload = {
      course: courseCode,
      seed: seedId,
      baskets: seedBaskets
    };

    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log(`✅ ${seedId}: ${legoCount} LEGOs, ${result.totalPhrases} phrases`);
        successCount++;
        uploadedPhrases += result.totalPhrases || 0;
      } else {
        console.error(`❌ ${seedId}: ${result.error || 'Unknown error'}`);
        failCount++;
      }
    } catch (err) {
      console.error(`❌ ${seedId}: ${err.message}`);
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Migration Complete`);
  console.log(`   ✅ Success: ${successCount} seeds`);
  console.log(`   ❌ Failed: ${failCount} seeds`);
  console.log(`   📝 Phrases uploaded: ${uploadedPhrases}`);
  console.log(`${'='.repeat(50)}\n`);
}

// CLI
const args = process.argv.slice(2);
const courseCode = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!courseCode) {
  console.log(`
Usage: node scripts/migrate-baskets-to-db.cjs <courseCode> [options]

Options:
  --dry-run    Show what would be uploaded without making changes

Examples:
  node scripts/migrate-baskets-to-db.cjs zho_for_eng --dry-run
  node scripts/migrate-baskets-to-db.cjs zho_for_eng
`);
  process.exit(1);
}

migrateBaskets(courseCode, dryRun);
