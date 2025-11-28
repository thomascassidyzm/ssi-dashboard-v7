#!/usr/bin/env node

/**
 * Manifest Repopulation (Post-Generation)
 *
 * Restores manifest after audio generation by:
 * 1. Re-extracting ALL text variants from course structure (exact text, NOT normalized)
 * 2. Matching each variant to MAR by normalized text to get UUID
 * 3. Assigning matched UUIDs to all variants
 * 4. Reporting errors for any samples without MAR matches
 * 5. Adding encouragements back to manifest
 *
 * Usage: node scripts/manifest-repopulation.cjs <course_code>
 */

const fs = require('fs-extra');
const path = require('path');

// Paths
const VFS_COURSES_PATH = path.join(__dirname, '..', 'public', 'vfs', 'courses');
const CANONICAL_PATH = path.join(__dirname, '..', 'public', 'vfs', 'canonical');
const MAR_PERMANENT_PATH = path.join(__dirname, '..', 'samples_database', 'voices');
const MAR_TEMP_PATH = path.join(__dirname, '..', 'temp', 'mar', 'voices');

// Import services (relative paths)
let marService, encouragementService;
try {
  marService = require('../services/mar-service.cjs');
  encouragementService = require('../services/encouragement-service.cjs');
} catch (e) {
  console.error('Failed to load services:', e.message);
  console.error('Make sure you are running from the project root');
  process.exit(1);
}

// ============================================================================
// TEXT UTILITIES
// ============================================================================

/**
 * Normalize text for MAR matching (matches mar-service normalization)
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Extract tagged examples from presentation text
 * Pattern: {role}'text' or {role}"text"
 */
function extractTaggedExamples(text) {
  if (!text) return [];
  const pattern = /\{(\w+(?:-\w+)?)\}\s*(["'])(.*?)\2(?=[\s,.;:!?)]|$)/g;
  const results = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    results.push({ tag: match[1], text: match[3] });
  }
  return results;
}

/**
 * Determine role from tag
 */
function tagToRole(tag) {
  if (tag === 'target1' || tag === 'target2') return tag;
  if (tag === 'source') return 'source';
  if (tag === 'presentation') return 'presentation';
  return 'target1';
}

// ============================================================================
// VOICE ASSIGNMENT
// ============================================================================

/**
 * Get voice assignments for a course
 * Tries course_assignments first, then language_pair_assignments
 */
async function getVoiceAssignments(courseCode) {
  const voicesPath = path.join(CANONICAL_PATH, 'voices.json');

  if (!await fs.pathExists(voicesPath)) {
    throw new Error(`Voices configuration not found at ${voicesPath}`);
  }

  const voicesConfig = await fs.readJson(voicesPath);

  // Try course-specific assignment first
  if (voicesConfig.course_assignments && voicesConfig.course_assignments[courseCode]) {
    console.log(`Using course-specific voice assignments for ${courseCode}`);
    return voicesConfig.course_assignments[courseCode];
  }

  // Try to derive from course code (e.g., spa_for_eng -> eng-spa)
  const match = courseCode.match(/^(\w{3})_for_(\w{3})/);
  if (match) {
    const targetLang = match[1]; // spa
    const sourceLang = match[2]; // eng
    const langPair = `${sourceLang}-${targetLang}`; // eng-spa

    if (voicesConfig.language_pair_assignments && voicesConfig.language_pair_assignments[langPair]) {
      console.log(`Using language pair assignments for ${langPair}`);
      return voicesConfig.language_pair_assignments[langPair];
    }
  }

  throw new Error(`No voice assignments found for course ${courseCode}`);
}

/**
 * Extract language codes from course code
 */
function extractLanguageCodes(courseCode) {
  const match = courseCode.match(/^(\w{3})_for_(\w{3})/);
  if (!match) {
    throw new Error(`Cannot extract languages from course code: ${courseCode}`);
  }
  return {
    targetLang: match[1], // e.g., 'spa'
    sourceLang: match[2]  // e.g., 'eng'
  };
}

// ============================================================================
// SAMPLE EXTRACTION
// ============================================================================

/**
 * Extract ALL expected samples from course structure with EXACT text (not normalized)
 * Returns: Map<normalizedKey, Array<{exactText, role, cadence}>>
 *
 * The key is normalized text for MAR matching, but we preserve all exact variants
 */
function extractAllExpectedSamples(manifest) {
  const slice = manifest.slices[0];
  const samplesByNormalized = new Map(); // normalizedKey -> [{exactText, role, cadence}, ...]

  function addSample(text, role) {
    if (!text) return;

    const normalized = normalizeText(text);
    const cadence = (role === 'target1' || role === 'target2') ? 'slow' : 'natural';
    const key = `${normalized}|${role}|${cadence}`;

    if (!samplesByNormalized.has(key)) {
      samplesByNormalized.set(key, []);
    }

    // Add exact variant if not already present
    const variants = samplesByNormalized.get(key);
    if (!variants.some(v => v.exactText === text)) {
      variants.push({ exactText: text, role, cadence });
    }
  }

  // Process seeds
  for (const seed of slice.seeds || []) {
    // Seed node
    if (seed.node) {
      if (seed.node.known?.text) addSample(seed.node.known.text, 'source');
      if (seed.node.target?.text) {
        addSample(seed.node.target.text, 'target1');
        addSample(seed.node.target.text, 'target2');
      }
    }

    // Introduction items
    for (const introItem of seed.introduction_items || []) {
      // IntroItem node
      if (introItem.node) {
        if (introItem.node.known?.text) addSample(introItem.node.known.text, 'source');
        if (introItem.node.target?.text) {
          addSample(introItem.node.target.text, 'target1');
          addSample(introItem.node.target.text, 'target2');
        }
      }

      // Presentation
      if (introItem.presentation) {
        addSample(introItem.presentation, 'presentation');

        // Tagged examples in presentation
        const examples = extractTaggedExamples(introItem.presentation);
        for (const { tag, text } of examples) {
          addSample(text, tagToRole(tag));
        }
      }

      // Nodes array
      for (const node of introItem.nodes || []) {
        if (node.known?.text) addSample(node.known.text, 'source');
        if (node.target?.text) {
          addSample(node.target.text, 'target1');
          addSample(node.target.text, 'target2');
        }
      }
    }
  }

  return samplesByNormalized;
}

// ============================================================================
// MAR MATCHING
// ============================================================================

/**
 * Build MAR index for all voices used in course
 * Returns: { voiceId: { normalizedKey: { uuid, sample } } }
 */
async function buildMARIndex(voiceAssignments) {
  const index = {};
  const voiceIds = [...new Set(Object.values(voiceAssignments))];

  console.log(`Building MAR index for ${voiceIds.length} voices...`);

  for (const voiceId of voiceIds) {
    index[voiceId] = {};

    // Load from permanent MAR
    const permanentPath = path.join(MAR_PERMANENT_PATH, voiceId, 'samples.json');
    if (await fs.pathExists(permanentPath)) {
      const data = await fs.readJson(permanentPath);
      for (const [uuid, sample] of Object.entries(data.samples || {})) {
        const normalized = normalizeText(sample.text);
        const cadence = sample.cadence || 'natural';
        const key = `${normalized}|${sample.role}|${cadence}`;
        index[voiceId][key] = { uuid, sample, source: 'permanent' };
      }
    }

    // Load from temp MAR (overrides permanent)
    const tempPath = path.join(MAR_TEMP_PATH, voiceId, 'samples.json');
    if (await fs.pathExists(tempPath)) {
      const data = await fs.readJson(tempPath);
      for (const [uuid, sample] of Object.entries(data.samples || {})) {
        const normalized = normalizeText(sample.text);
        const cadence = sample.cadence || 'natural';
        const key = `${normalized}|${sample.role}|${cadence}`;
        index[voiceId][key] = { uuid, sample, source: 'temp' };
      }
    }

    const sampleCount = Object.keys(index[voiceId]).length;
    console.log(`  ${voiceId}: ${sampleCount} samples`);
  }

  return index;
}

/**
 * Match samples to MAR and build new samples object
 */
function matchSamplesToMAR(expectedSamples, marIndex, voiceAssignments) {
  const newSamples = {};
  const matched = { count: 0, byRole: {} };
  const unmatched = [];

  for (const [key, variants] of expectedSamples) {
    const [normalizedText, role, cadence] = key.split('|');
    const voiceId = voiceAssignments[role];

    if (!voiceId) {
      console.warn(`  Warning: No voice assigned for role ${role}`);
      continue;
    }

    // Look up in MAR
    const marEntry = marIndex[voiceId]?.[key];

    if (marEntry) {
      // Found in MAR - assign UUID to ALL variants
      for (const variant of variants) {
        if (!newSamples[variant.exactText]) {
          newSamples[variant.exactText] = [];
        }

        // Check if this role already exists
        const existing = newSamples[variant.exactText].find(s => s.role === role);
        if (!existing) {
          newSamples[variant.exactText].push({
            id: marEntry.uuid,
            role: role,
            cadence: cadence,
            duration: marEntry.sample?.duration || 0
          });
          matched.count++;
          matched.byRole[role] = (matched.byRole[role] || 0) + 1;
        }
      }
    } else {
      // Not found in MAR
      unmatched.push({ normalizedText, role, cadence, variants });
    }
  }

  return { newSamples, matched, unmatched };
}

// ============================================================================
// ENCOURAGEMENT RESTORATION
// ============================================================================

/**
 * Load and add encouragements to manifest
 */
async function addEncouragements(manifest, sourceLang) {
  // Load canonical encouragements
  const { pooled, ordered } = await encouragementService.loadCanonicalEncouragements(sourceLang, false);

  if (pooled.length === 0 && ordered.length === 0) {
    console.log(`  No canonical encouragements found for ${sourceLang}`);
    return { added: 0 };
  }

  const slice = manifest.slices[0];

  // Set ordered and pooled encouragements
  slice.orderedEncouragements = ordered.map(enc => ({
    text: enc.text,
    id: enc.id
  }));

  slice.pooledEncouragements = pooled.map(enc => ({
    text: enc.text,
    id: enc.id
  }));

  // Also add to samples for duration tracking
  const samples = slice.samples || {};
  const allEncouragements = [...pooled, ...ordered];

  for (const enc of allEncouragements) {
    const text = enc.text;
    if (!samples[text]) {
      samples[text] = [];
    }

    // Add if not exists
    const existing = samples[text].find(s => s.role === 'presentation' && s.id === enc.id);
    if (!existing) {
      samples[text].push({
        id: enc.id,
        role: 'presentation',
        cadence: 'natural',
        duration: enc.duration || 0
      });
    }
  }

  slice.samples = samples;

  return {
    added: allEncouragements.length,
    ordered: ordered.length,
    pooled: pooled.length
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const courseCode = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!courseCode) {
    console.error('Usage: node scripts/manifest-repopulation.cjs <course_code> [--dry-run]');
    console.error('Example: node scripts/manifest-repopulation.cjs spa_for_eng');
    process.exit(1);
  }

  const manifestPath = path.join(VFS_COURSES_PATH, courseCode, 'course_manifest.json');

  console.log('='.repeat(60));
  console.log('Manifest Repopulation (Post-Generation)');
  console.log('='.repeat(60));
  console.log(`\nCourse: ${courseCode}`);
  console.log(`Manifest: ${manifestPath}`);
  if (dryRun) console.log('Mode: DRY RUN (no changes will be saved)');
  console.log();

  // Load manifest
  if (!await fs.pathExists(manifestPath)) {
    console.error(`Error: Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest = await fs.readJson(manifestPath);
  const { targetLang, sourceLang } = extractLanguageCodes(courseCode);

  console.log(`Target language: ${targetLang}`);
  console.log(`Source language: ${sourceLang}\n`);

  // Step 1: Get voice assignments
  console.log('Step 1: Loading voice assignments...\n');
  let voiceAssignments;
  try {
    voiceAssignments = await getVoiceAssignments(courseCode);
    for (const [role, voiceId] of Object.entries(voiceAssignments)) {
      console.log(`  ${role}: ${voiceId}`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Extract all expected samples
  console.log('\nStep 2: Extracting samples from course structure...\n');
  const expectedSamples = extractAllExpectedSamples(manifest);

  let totalVariants = 0;
  for (const variants of expectedSamples.values()) {
    totalVariants += variants.length;
  }
  console.log(`  Found ${expectedSamples.size} unique samples (normalized)`);
  console.log(`  Total variants (with capitalization/punctuation): ${totalVariants}`);

  // Step 3: Build MAR index
  console.log('\nStep 3: Building MAR index...\n');
  const marIndex = await buildMARIndex(voiceAssignments);

  // Step 4: Match samples to MAR
  console.log('\nStep 4: Matching samples to MAR...\n');
  const { newSamples, matched, unmatched } = matchSamplesToMAR(
    expectedSamples,
    marIndex,
    voiceAssignments
  );

  console.log(`  Matched: ${matched.count} samples`);
  for (const [role, count] of Object.entries(matched.byRole)) {
    console.log(`    ${role}: ${count}`);
  }

  if (unmatched.length > 0) {
    console.log(`\n  UNMATCHED: ${unmatched.length} samples not found in MAR:`);
    for (const item of unmatched.slice(0, 10)) {
      console.log(`    ${item.role}: "${item.normalizedText.substring(0, 50)}..."`);
    }
    if (unmatched.length > 10) {
      console.log(`    ... and ${unmatched.length - 10} more`);
    }
    console.log('\n  WARNING: Some samples have no MAR match. Run audio generation first.');
  }

  // Step 5: Add encouragements
  console.log('\nStep 5: Adding encouragements...\n');
  const encResult = await addEncouragements(manifest, sourceLang);
  console.log(`  Added ${encResult.added} encouragements (${encResult.ordered} ordered, ${encResult.pooled} pooled)`);

  // Step 6: Update manifest
  manifest.slices[0].samples = newSamples;

  // Count final samples
  const finalSampleCount = Object.keys(newSamples).length;
  let finalVariantCount = 0;
  for (const variants of Object.values(newSamples)) {
    finalVariantCount += variants.length;
  }

  console.log(`\nStep 6: Finalizing manifest...\n`);
  console.log(`  Sample texts: ${finalSampleCount}`);
  console.log(`  Sample variants: ${finalVariantCount}`);

  // Save
  if (!dryRun) {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = manifestPath.replace('.json', `_backup_${timestamp}.json`);
    await fs.copy(manifestPath, backupPath);
    console.log(`\n  Backup: ${path.basename(backupPath)}`);

    // Save
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    const stats = await fs.stat(manifestPath);
    console.log(`  Saved: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.log('\n  DRY RUN - no changes saved');
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  if (unmatched.length > 0) {
    console.log(`WARNING: ${unmatched.length} samples without MAR matches`);
    console.log('Run audio generation before repopulation');
  } else {
    console.log('SUCCESS: All samples matched to MAR');
  }
  console.log(`${finalSampleCount} sample texts, ${finalVariantCount} variants`);
  console.log('='.repeat(60));

  process.exit(unmatched.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
