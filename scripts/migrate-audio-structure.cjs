#!/usr/bin/env node
/**
 * Migrate audio files from flat temp/audio/ to hierarchical temp/{course}/{role}/{cadence}/
 *
 * Usage:
 *   node scripts/migrate-audio-structure.cjs --dry-run    # Preview changes
 *   node scripts/migrate-audio-structure.cjs              # Execute migration
 */

const fs = require('fs-extra');
const path = require('path');

const COURSES = ['spa_for_eng', 'cmn_for_eng'];
const SOURCE_DIR = path.join(__dirname, '../temp/audio');
const TEMP_BASE = path.join(__dirname, '../temp');

// Directories to keep at temp/ level (shared)
const SHARED_DIRS = ['segment_cache', 'worker-input', 'worker-output', 'processed', 'mastered', 'presentations', 'welcomes', 'encouragements'];

async function loadManifestSamples(courseCode) {
  const manifestPath = path.join(__dirname, `../public/vfs/courses/${courseCode}/course_manifest.json`);

  if (!await fs.pathExists(manifestPath)) {
    console.log(`  Manifest not found for ${courseCode}, skipping`);
    return new Map();
  }

  const manifest = await fs.readJson(manifestPath);
  const samples = manifest.slices?.[0]?.samples || {};

  // Build map of UUID -> { role, cadence }
  const uuidMap = new Map();

  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      const uuid = variant.id || variant.uuid;
      if (uuid) {
        uuidMap.set(uuid, {
          role: variant.role,
          cadence: variant.cadence || 'natural'
        });
      }
    }
  }

  return uuidMap;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== Audio Structure Migration ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE'}\n`);

  if (!await fs.pathExists(SOURCE_DIR)) {
    console.log('Source directory temp/audio/ does not exist. Nothing to migrate.');
    return;
  }

  // Get all MP3 files in temp/audio (excluding subdirectories)
  const allFiles = await fs.readdir(SOURCE_DIR);
  const mp3Files = allFiles.filter(f => f.endsWith('.mp3') && !f.includes('/'));

  console.log(`Found ${mp3Files.length} MP3 files in temp/audio/\n`);

  // Load manifests for all courses
  const courseMaps = new Map();
  for (const course of COURSES) {
    console.log(`Loading manifest for ${course}...`);
    const map = await loadManifestSamples(course);
    courseMaps.set(course, map);
    console.log(`  Found ${map.size} samples with UUIDs`);
  }

  // Plan the migration
  const migrations = [];
  const orphans = [];
  const skipped = [];

  for (const file of mp3Files) {
    const uuid = file.replace('.mp3', '');
    const sourcePath = path.join(SOURCE_DIR, file);

    // Find which course this UUID belongs to
    let found = false;
    for (const [course, uuidMap] of courseMaps) {
      if (uuidMap.has(uuid)) {
        const { role, cadence } = uuidMap.get(uuid);
        const destDir = path.join(TEMP_BASE, course, role, cadence);
        const destPath = path.join(destDir, file);

        migrations.push({
          uuid,
          course,
          role,
          cadence,
          sourcePath,
          destPath,
          destDir
        });
        found = true;
        break;
      }
    }

    if (!found) {
      orphans.push({ uuid, sourcePath });
    }
  }

  // Count shared directory contents
  for (const sharedDir of SHARED_DIRS) {
    const sharedPath = path.join(SOURCE_DIR, sharedDir);
    if (await fs.pathExists(sharedPath)) {
      const stat = await fs.stat(sharedPath);
      if (stat.isDirectory()) {
        skipped.push(sharedDir);
      }
    }
  }

  // Summary
  console.log('\n=== Migration Plan ===\n');

  // Group by course/role/cadence for summary
  const summary = {};
  for (const m of migrations) {
    const key = `${m.course}/${m.role}/${m.cadence}`;
    summary[key] = (summary[key] || 0) + 1;
  }

  console.log('Files to move:');
  for (const [path, count] of Object.entries(summary).sort()) {
    console.log(`  ${path}: ${count} files`);
  }

  console.log(`\nOrphans (not in any manifest): ${orphans.length}`);
  if (orphans.length > 0 && orphans.length <= 20) {
    orphans.forEach(o => console.log(`  ${o.uuid}`));
  } else if (orphans.length > 20) {
    orphans.slice(0, 10).forEach(o => console.log(`  ${o.uuid}`));
    console.log(`  ... and ${orphans.length - 10} more`);
  }

  console.log(`\nShared directories to keep in place: ${skipped.join(', ') || 'none'}`);

  console.log(`\nTotal: ${migrations.length} files to move, ${orphans.length} orphans`);

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made. Run without --dry-run to execute.');
    return;
  }

  // Execute migration
  console.log('\n=== Executing Migration ===\n');

  // Create target directories
  const dirsCreated = new Set();
  for (const m of migrations) {
    if (!dirsCreated.has(m.destDir)) {
      await fs.ensureDir(m.destDir);
      dirsCreated.add(m.destDir);
    }
  }
  console.log(`Created ${dirsCreated.size} directories`);

  // Move files
  let moved = 0;
  let errors = 0;

  for (const m of migrations) {
    try {
      await fs.move(m.sourcePath, m.destPath, { overwrite: false });
      moved++;

      if (moved % 1000 === 0) {
        console.log(`  Moved ${moved}/${migrations.length}...`);
      }
    } catch (err) {
      if (err.message.includes('already exists')) {
        // File already in destination, remove source
        await fs.remove(m.sourcePath);
        moved++;
      } else {
        console.error(`  Error moving ${m.uuid}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\nMoved ${moved} files, ${errors} errors`);

  // Write migration log
  const logPath = path.join(TEMP_BASE, 'migration-log.json');
  await fs.writeJson(logPath, {
    timestamp: new Date().toISOString(),
    moved: migrations.length,
    orphans: orphans.map(o => o.uuid),
    summary
  }, { spaces: 2 });
  console.log(`\nMigration log written to: ${logPath}`);

  // Handle orphans - move to temp/orphans/ for review
  if (orphans.length > 0) {
    const orphanDir = path.join(TEMP_BASE, 'orphans');
    await fs.ensureDir(orphanDir);

    let orphansMoved = 0;
    for (const o of orphans) {
      try {
        await fs.move(o.sourcePath, path.join(orphanDir, `${o.uuid}.mp3`), { overwrite: false });
        orphansMoved++;
      } catch (err) {
        // Ignore if already exists
      }
    }
    console.log(`Moved ${orphansMoved} orphan files to temp/orphans/`);
  }

  console.log('\n=== Migration Complete ===');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
