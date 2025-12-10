#!/usr/bin/env node

/**
 * Manifest Structure Validator & Auto-Fixer
 * Validates course manifests and optionally auto-fixes issues.
 *
 * Usage:
 *   node tools/validators/manifest-structure-validator.cjs <course_code> [options]
 *
 * Options:
 *   --check            Validate only (default, no changes)
 *   --fix              Validate and auto-fix fixable issues
 *   --check-durations  Include sample duration check (run after S3 extraction)
 *
 * Examples:
 *   node tools/validators/manifest-structure-validator.cjs spa_for_eng
 *   node tools/validators/manifest-structure-validator.cjs spa_for_eng --fix
 *   node tools/validators/manifest-structure-validator.cjs spa_for_eng --fix --check-durations
 */

const fs = require('fs');
const path = require('path');

// Expected keys at each level (verified against reference manifest)
const EXPECTED = {
  topLevel: ['id', 'introduction', 'known', 'slices', 'status', 'target', 'version'],
  introduction: ['cadence', 'duration', 'id', 'role'],
  slice: ['id', 'orderedEncouragements', 'pooledEncouragements', 'samples', 'seeds', 'version'],
  seed: ['id', 'introduction_items', 'node', 'seed_sentence'],
  seedNode: ['id', 'known', 'target'],
  nodeKnownTarget: ['lemmas', 'text', 'tokens'],
  seedSentence: ['canonical'],
  introItem: ['id', 'node', 'nodes', 'presentation'],
  introItemNode: ['id', 'known', 'target'],
  sample: ['cadence', 'duration', 'id', 'role']
};

// ============================================================================
// STRUCTURE VALIDATION (Report Only)
// ============================================================================

function checkKeys(obj, expectedKeys, path, issues) {
  if (!obj) {
    issues.push(`${path}: missing (null/undefined)`);
    return;
  }

  const actualKeys = Object.keys(obj).sort();
  const expected = [...expectedKeys].sort();

  const missing = expected.filter(k => !actualKeys.includes(k));
  const extra = actualKeys.filter(k => !expected.includes(k));

  if (missing.length > 0) {
    issues.push(`${path}: missing keys [${missing.join(', ')}]`);
  }
  if (extra.length > 0) {
    issues.push(`${path}: extra keys [${extra.join(', ')}]`);
  }
}

function validateStructure(manifest, issues) {
  // Top-level
  checkKeys(manifest, EXPECTED.topLevel, 'manifest', issues);

  // Introduction
  if (manifest.introduction) {
    checkKeys(manifest.introduction, EXPECTED.introduction, 'manifest.introduction', issues);
  }

  // Slices
  if (manifest.slices && manifest.slices.length > 0) {
    const slice = manifest.slices[0];
    checkKeys(slice, EXPECTED.slice, 'slices[0]', issues);

    // Validate seeds (sample: first, middle, last)
    if (slice.seeds && slice.seeds.length > 0) {
      const seeds = slice.seeds;
      const indices = [0];
      if (seeds.length > 2) indices.push(Math.floor(seeds.length / 2));
      if (seeds.length > 1) indices.push(seeds.length - 1);

      for (const i of indices) {
        validateSeedStructure(seeds[i], `slices[0].seeds[${i}]`, issues);
      }
    }

    // Validate samples (sample a few)
    if (slice.samples) {
      const sampleKeys = Object.keys(slice.samples);
      const indices = [0];
      if (sampleKeys.length > 2) indices.push(Math.floor(sampleKeys.length / 2));
      if (sampleKeys.length > 1) indices.push(sampleKeys.length - 1);

      for (const i of indices) {
        const key = sampleKeys[i];
        const variants = slice.samples[key];
        if (variants && variants.length > 0) {
          for (let j = 0; j < Math.min(variants.length, 2); j++) {
            checkKeys(variants[j], EXPECTED.sample, `slices[0].samples["${key.substring(0, 30)}..."][${j}]`, issues);
          }
        }
      }
    }
  }
}

function validateSeedStructure(seed, seedPath, issues) {
  checkKeys(seed, EXPECTED.seed, seedPath, issues);

  if (seed.node) {
    checkKeys(seed.node, EXPECTED.seedNode, `${seedPath}.node`, issues);
    if (seed.node.known) {
      checkKeys(seed.node.known, EXPECTED.nodeKnownTarget, `${seedPath}.node.known`, issues);
    }
    if (seed.node.target) {
      checkKeys(seed.node.target, EXPECTED.nodeKnownTarget, `${seedPath}.node.target`, issues);
    }
  }

  if (seed.seed_sentence) {
    checkKeys(seed.seed_sentence, EXPECTED.seedSentence, `${seedPath}.seed_sentence`, issues);
  }

  // Validate introduction_items (sample a few)
  if (seed.introduction_items && seed.introduction_items.length > 0) {
    const items = seed.introduction_items;
    const indices = [0];
    if (items.length > 1) indices.push(items.length - 1);

    for (const i of indices) {
      const item = items[i];
      const itemPath = `${seedPath}.introduction_items[${i}]`;
      checkKeys(item, EXPECTED.introItem, itemPath, issues);

      if (item.node) {
        checkKeys(item.node, EXPECTED.introItemNode, `${itemPath}.node`, issues);
        if (item.node.known) {
          checkKeys(item.node.known, EXPECTED.nodeKnownTarget, `${itemPath}.node.known`, issues);
        }
        if (item.node.target) {
          checkKeys(item.node.target, EXPECTED.nodeKnownTarget, `${itemPath}.node.target`, issues);
        }
      }
    }
  }
}

// ============================================================================
// UUID MATCHING (Auto-Fix)
// ============================================================================

function fixUUIDMatching(manifest, fixes) {
  let seedsFixed = 0;
  let introItemsFixed = 0;

  for (const seed of manifest.slices[0].seeds) {
    // seed.id should match seed.node.id
    if (seed.node && seed.node.id !== seed.id) {
      seed.node.id = seed.id;
      seedsFixed++;
    }

    // introduction_item.id should match introduction_item.node.id
    for (const item of seed.introduction_items || []) {
      if (item.node && item.node.id !== item.id) {
        item.node.id = item.id;
        introItemsFixed++;
      }
    }
  }

  if (seedsFixed > 0) {
    fixes.push(`Fixed ${seedsFixed} seeds: node.id now matches seed.id`);
  }
  if (introItemsFixed > 0) {
    fixes.push(`Fixed ${introItemsFixed} intro_items: node.id now matches item.id`);
  }
}

// ============================================================================
// UUID FORMAT - UPPERCASE (Auto-Fix for non-samples, WARN for samples)
// ============================================================================

function isUppercase(uuid) {
  return uuid === uuid.toUpperCase();
}

function fixNonSampleUUIDs(manifest, fixes) {
  let count = 0;

  // Slice ID
  if (manifest.slices[0].id && !isUppercase(manifest.slices[0].id)) {
    manifest.slices[0].id = manifest.slices[0].id.toUpperCase();
    count++;
  }

  // Seeds and their nodes
  for (const seed of manifest.slices[0].seeds) {
    if (seed.id && !isUppercase(seed.id)) {
      seed.id = seed.id.toUpperCase();
      count++;
    }
    if (seed.node && seed.node.id && !isUppercase(seed.node.id)) {
      seed.node.id = seed.node.id.toUpperCase();
      count++;
    }

    // Introduction items and their nodes
    for (const item of seed.introduction_items || []) {
      if (item.id && !isUppercase(item.id)) {
        item.id = item.id.toUpperCase();
        count++;
      }
      if (item.node && item.node.id && !isUppercase(item.node.id)) {
        item.node.id = item.node.id.toUpperCase();
        count++;
      }
      // Inner nodes
      for (const node of item.nodes || []) {
        if (node.id && !isUppercase(node.id)) {
          node.id = node.id.toUpperCase();
          count++;
        }
      }
    }
  }

  // Encouragements
  for (const enc of manifest.slices[0].orderedEncouragements || []) {
    if (enc.id && !isUppercase(enc.id)) {
      enc.id = enc.id.toUpperCase();
      count++;
    }
  }
  for (const enc of manifest.slices[0].pooledEncouragements || []) {
    if (enc.id && !isUppercase(enc.id)) {
      enc.id = enc.id.toUpperCase();
      count++;
    }
  }

  // Introduction
  if (manifest.introduction && manifest.introduction.id && !isUppercase(manifest.introduction.id)) {
    manifest.introduction.id = manifest.introduction.id.toUpperCase();
    count++;
  }

  if (count > 0) {
    fixes.push(`Uppercased ${count} non-sample UUIDs`);
  }
}

function warnLowercaseSampleUUIDs(manifest, warnings) {
  let count = 0;

  for (const variants of Object.values(manifest.slices[0].samples || {})) {
    for (const sample of variants) {
      if (sample.id && !isUppercase(sample.id)) {
        count++;
      }
    }
  }

  if (count > 0) {
    warnings.push(`⚠️  ${count} sample UUIDs are lowercase. These will NOT match S3 filenames! Manual review required.`);
  }
}

// ============================================================================
// EMPTY SEEDS CHECK (Report Only)
// ============================================================================

function checkEmptySeeds(manifest, issues) {
  let emptyCount = 0;
  const emptyIndices = [];

  manifest.slices[0].seeds.forEach((seed, i) => {
    if (!seed.introduction_items || seed.introduction_items.length === 0) {
      emptyCount++;
      if (emptyIndices.length < 5) emptyIndices.push(i);
    }
  });

  if (emptyCount > 0) {
    issues.push(`${emptyCount} seeds have no introduction_items (indices: ${emptyIndices.join(', ')}${emptyCount > 5 ? '...' : ''})`);
  }
}

// ============================================================================
// TOKENS/LEMMAS AUTO-POPULATE (Auto-Fix)
// ============================================================================

function tokenize(text) {
  if (!text) return [];
  return text.split(/\s+/).filter(t => t.length > 0);
}

function lemmatize(text) {
  // Simple lemmatization: just lowercase tokens
  // Real lemmatization would need NLP library
  return tokenize(text).map(t => t.toLowerCase());
}

function populateNodeTokensLemmas(node, fixes, path) {
  let fixed = false;

  if (node.known) {
    if (!node.known.tokens || node.known.tokens.length === 0) {
      node.known.tokens = tokenize(node.known.text);
      fixed = true;
    }
    if (!node.known.lemmas || node.known.lemmas.length === 0) {
      node.known.lemmas = lemmatize(node.known.text);
      fixed = true;
    }
  }

  if (node.target) {
    if (!node.target.tokens || node.target.tokens.length === 0) {
      node.target.tokens = tokenize(node.target.text);
      fixed = true;
    }
    if (!node.target.lemmas || node.target.lemmas.length === 0) {
      node.target.lemmas = lemmatize(node.target.text);
      fixed = true;
    }
  }

  return fixed;
}

function populateEmptyTokensLemmas(manifest, fixes) {
  let nodesFixed = 0;

  for (const seed of manifest.slices[0].seeds) {
    // Seed node
    if (seed.node && populateNodeTokensLemmas(seed.node, fixes, 'seed.node')) {
      nodesFixed++;
    }

    // Introduction items
    for (const item of seed.introduction_items || []) {
      if (item.node && populateNodeTokensLemmas(item.node, fixes, 'intro_item.node')) {
        nodesFixed++;
      }
      // Inner nodes
      for (const node of item.nodes || []) {
        if (populateNodeTokensLemmas(node, fixes, 'inner_node')) {
          nodesFixed++;
        }
      }
    }
  }

  if (nodesFixed > 0) {
    fixes.push(`Populated tokens/lemmas for ${nodesFixed} nodes`);
  }
}

// ============================================================================
// ENCOURAGEMENTS LOCATION CHECK (Report Only)
// ============================================================================

function checkEncouragements(manifest, issues) {
  // Should NOT have top-level encouragements
  if (manifest.encouragements) {
    issues.push('Top-level "encouragements" array exists - should be moved to slices[0]');
  }

  // Should have encouragements in slice
  const slice = manifest.slices[0];
  if (!slice.orderedEncouragements || slice.orderedEncouragements.length === 0) {
    issues.push('slices[0].orderedEncouragements: empty or missing');
  }
  if (!slice.pooledEncouragements || slice.pooledEncouragements.length === 0) {
    issues.push('slices[0].pooledEncouragements: empty or missing');
  }
}

// ============================================================================
// SAMPLE COMPLETENESS CHECK (Critical, Report Only)
// Verifies every item in structure has a matching sample with UUID
// ============================================================================

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .replace(/\s+/g, ' ');
}

function checkSampleCompleteness(manifest, issues) {
  const samples = manifest.slices?.[0]?.samples || {};

  // Build sample index by normalized text + role
  const sampleIndex = new Map();
  for (const [text, variants] of Object.entries(samples)) {
    const normalizedText = normalizeText(text);
    for (const variant of variants) {
      const key = `${normalizedText}|${variant.role}`;
      if (!sampleIndex.has(key)) {
        sampleIndex.set(key, []);
      }
      sampleIndex.get(key).push(variant);
    }
  }

  const missing = {
    source: [],
    target1: [],
    target2: [],
    presentation: [],
    encouragement: [],
    introduction: []
  };

  let totalItems = 0;
  let itemsWithMissingSamples = 0;

  // Check introduction/welcome has UUID
  if (manifest.introduction) {
    if (!manifest.introduction.id || manifest.introduction.id.length === 0) {
      missing.introduction.push('Welcome/introduction missing UUID');
    }
  }

  // Check each seed and introduction_item
  for (const seed of manifest.slices?.[0]?.seeds || []) {
    for (const item of seed.introduction_items || []) {
      totalItems++;
      let itemHasMissing = false;

      // Check known.text -> source sample
      if (item.node?.known?.text) {
        const normalizedKnown = normalizeText(item.node.known.text);
        const sourceKey = `${normalizedKnown}|source`;
        const sourceVariants = sampleIndex.get(sourceKey);

        if (!sourceVariants || sourceVariants.length === 0) {
          if (missing.source.length < 5) {
            missing.source.push(item.node.known.text.substring(0, 50));
          }
          itemHasMissing = true;
        } else {
          // Check for valid UUID
          const hasValidUuid = sourceVariants.some(v => v.id && v.id.length > 0);
          if (!hasValidUuid) {
            if (missing.source.length < 5) {
              missing.source.push(`(no UUID) ${item.node.known.text.substring(0, 40)}`);
            }
            itemHasMissing = true;
          }
        }
      }

      // Check target.text -> BOTH target1 AND target2 samples required
      if (item.node?.target?.text) {
        const normalizedTarget = normalizeText(item.node.target.text);
        const target1Key = `${normalizedTarget}|target1`;
        const target2Key = `${normalizedTarget}|target2`;
        const target1Variants = sampleIndex.get(target1Key);
        const target2Variants = sampleIndex.get(target2Key);

        // Check target1
        if (!target1Variants || target1Variants.length === 0) {
          if (missing.target1.length < 5) {
            missing.target1.push(item.node.target.text.substring(0, 50));
          }
          itemHasMissing = true;
        } else {
          const hasValidUuid = target1Variants.some(v => v.id && v.id.length > 0);
          if (!hasValidUuid) {
            if (missing.target1.length < 5) {
              missing.target1.push(`(no UUID) ${item.node.target.text.substring(0, 40)}`);
            }
            itemHasMissing = true;
          }
        }

        // Check target2
        if (!target2Variants || target2Variants.length === 0) {
          if (missing.target2.length < 5) {
            missing.target2.push(item.node.target.text.substring(0, 50));
          }
          itemHasMissing = true;
        } else {
          const hasValidUuid = target2Variants.some(v => v.id && v.id.length > 0);
          if (!hasValidUuid) {
            if (missing.target2.length < 5) {
              missing.target2.push(`(no UUID) ${item.node.target.text.substring(0, 40)}`);
            }
            itemHasMissing = true;
          }
        }
      }

      // Check presentation -> presentation sample
      if (item.presentation) {
        const normalizedPres = normalizeText(item.presentation);
        const presKey = `${normalizedPres}|presentation`;
        const presVariants = sampleIndex.get(presKey);

        if (!presVariants || presVariants.length === 0) {
          if (missing.presentation.length < 5) {
            missing.presentation.push(item.presentation.substring(0, 50));
          }
          itemHasMissing = true;
        } else {
          // Check for valid UUID
          const hasValidUuid = presVariants.some(v => v.id && v.id.length > 0);
          if (!hasValidUuid) {
            if (missing.presentation.length < 5) {
              missing.presentation.push(`(no UUID) ${item.presentation.substring(0, 40)}`);
            }
            itemHasMissing = true;
          }
        }
      }

      if (itemHasMissing) {
        itemsWithMissingSamples++;
      }
    }
  }

  // Check encouragements have matching samples with UUIDs
  // Each encouragement must have:
  // 1. An id in the structure (canonical item ID)
  // 2. A matching sample entry with role='presentation' and exact text match
  // Note: Encouragements use role='presentation', same as regular presentations
  const allEncouragements = [
    ...(manifest.slices?.[0]?.orderedEncouragements || []),
    ...(manifest.slices?.[0]?.pooledEncouragements || [])
  ];

  for (const enc of allEncouragements) {
    // Check structure has UUID
    if (!enc.id || enc.id.length === 0) {
      if (missing.encouragement.length < 5) {
        missing.encouragement.push(`(no UUID) ${(enc.text || 'unknown').substring(0, 40)}`);
      }
      continue;
    }

    // Check for matching sample with exact text match and role='presentation'
    const sampleVariants = samples[enc.text];
    if (!sampleVariants) {
      if (missing.encouragement.length < 5) {
        missing.encouragement.push(`(no sample) ${(enc.text || 'unknown').substring(0, 40)}`);
      }
      continue;
    }

    // Encouragements use role='presentation' (same as regular presentations)
    const encouragementSample = sampleVariants.find(v => v.role === 'presentation' && v.id);
    if (!encouragementSample) {
      if (missing.encouragement.length < 5) {
        missing.encouragement.push(`(no presentation sample) ${(enc.text || 'unknown').substring(0, 40)}`);
      }
    }
  }

  // Report issues
  if (missing.introduction.length > 0) {
    issues.push(`CRITICAL: ${missing.introduction[0]}`);
  }
  if (missing.source.length > 0) {
    issues.push(`CRITICAL: ${missing.source.length}+ items missing source samples (e.g., "${missing.source[0]}...")`);
  }
  if (missing.target1.length > 0) {
    issues.push(`CRITICAL: ${missing.target1.length}+ items missing target1 samples (e.g., "${missing.target1[0]}...")`);
  }
  if (missing.target2.length > 0) {
    issues.push(`CRITICAL: ${missing.target2.length}+ items missing target2 samples (e.g., "${missing.target2[0]}...")`);
  }
  if (missing.presentation.length > 0) {
    issues.push(`CRITICAL: ${missing.presentation.length}+ items missing presentation samples (e.g., "${missing.presentation[0]}...")`);
  }
  if (missing.encouragement.length > 0) {
    issues.push(`CRITICAL: ${missing.encouragement.length}+ encouragements missing samples (e.g., "${missing.encouragement[0]}...")`);
  }

  if (itemsWithMissingSamples > 0) {
    issues.push(`CRITICAL: ${itemsWithMissingSamples}/${totalItems} introduction_items have incomplete samples`);
  }

  return {
    totalItems,
    itemsWithMissingSamples,
    complete: itemsWithMissingSamples === 0 &&
              missing.introduction.length === 0 &&
              missing.encouragement.length === 0
  };
}

// ============================================================================
// SAMPLE DURATIONS CHECK (Optional, Report Only)
// ============================================================================

function checkSampleDurations(manifest, issues) {
  let zeroDurationCount = 0;
  let missingDurationCount = 0;

  for (const variants of Object.values(manifest.slices[0].samples || {})) {
    for (const sample of variants) {
      if (sample.duration === undefined || sample.duration === null) {
        missingDurationCount++;
      } else if (sample.duration === 0) {
        zeroDurationCount++;
      }
    }
  }

  if (missingDurationCount > 0) {
    issues.push(`${missingDurationCount} samples have missing duration`);
  }
  if (zeroDurationCount > 0) {
    issues.push(`${zeroDurationCount} samples have duration = 0 (no audio in S3?)`);
  }
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

function validateAndFixManifest(manifest, options = {}) {
  const issues = [];
  const fixes = [];
  const warnings = [];

  // 1. Structure (report only)
  validateStructure(manifest, issues);

  // 2. UUID Matching (auto-fix if --fix)
  if (options.fix) {
    fixUUIDMatching(manifest, fixes);
  } else {
    // Just check
    let mismatchCount = 0;
    for (const seed of manifest.slices[0].seeds) {
      if (seed.node && seed.node.id !== seed.id) mismatchCount++;
      for (const item of seed.introduction_items || []) {
        if (item.node && item.node.id !== item.id) mismatchCount++;
      }
    }
    if (mismatchCount > 0) {
      issues.push(`${mismatchCount} UUID mismatches (seed.id != seed.node.id or item.id != item.node.id)`);
    }
  }

  // 3. UUID Format
  if (options.fix) {
    fixNonSampleUUIDs(manifest, fixes);
  } else {
    // Just check non-sample UUIDs
    let lowercaseCount = 0;
    if (manifest.slices[0].id && !isUppercase(manifest.slices[0].id)) lowercaseCount++;
    for (const seed of manifest.slices[0].seeds) {
      if (seed.id && !isUppercase(seed.id)) lowercaseCount++;
      if (seed.node && seed.node.id && !isUppercase(seed.node.id)) lowercaseCount++;
    }
    if (lowercaseCount > 0) {
      issues.push(`${lowercaseCount} non-sample UUIDs are lowercase`);
    }
  }
  // Always warn about sample UUIDs (never auto-fix)
  warnLowercaseSampleUUIDs(manifest, warnings);

  // 4. Empty Seeds (report only)
  checkEmptySeeds(manifest, issues);

  // 5. Tokens/Lemmas (auto-fix if --fix)
  if (options.fix) {
    populateEmptyTokensLemmas(manifest, fixes);
  } else {
    // Just check
    let emptyCount = 0;
    for (const seed of manifest.slices[0].seeds) {
      if (seed.node) {
        if (seed.node.known && (!seed.node.known.tokens || seed.node.known.tokens.length === 0)) emptyCount++;
        if (seed.node.target && (!seed.node.target.tokens || seed.node.target.tokens.length === 0)) emptyCount++;
      }
    }
    if (emptyCount > 0) {
      issues.push(`${emptyCount} nodes have empty tokens/lemmas`);
    }
  }

  // 6. Encouragements (report only)
  checkEncouragements(manifest, issues);

  // 7. Sample Durations (optional)
  if (options.checkDurations) {
    checkSampleDurations(manifest, issues);
  }

  // 8. Sample Completeness (critical for publishing)
  if (options.checkCompleteness) {
    const completenessResult = checkSampleCompleteness(manifest, issues);
    if (!completenessResult.complete) {
      console.log(`\nSample Completeness: ${completenessResult.totalItems - completenessResult.itemsWithMissingSamples}/${completenessResult.totalItems} items complete`);
    }
  }

  return {
    valid: issues.length === 0 && warnings.length === 0,
    issues,
    fixes,
    warnings,
    modified: fixes.length > 0
  };
}

// ============================================================================
// COURSE VALIDATION
// ============================================================================

function validateCourse(courseCode, options = {}) {
  const manifestPath = path.join(process.cwd(), 'public/vfs/courses', courseCode, 'course_manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return {
      valid: false,
      issues: [`Manifest not found: ${manifestPath}`],
      fixes: [],
      warnings: [],
      modified: false
    };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const result = validateAndFixManifest(manifest, options);

  // Save if modified
  if (result.modified && options.fix) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    result.saved = true;
  }

  return result;
}

// Legacy function for backwards compatibility
function validateManifestStructure(manifest) {
  const issues = [];
  validateStructure(manifest, issues);

  // Also check encouragements
  checkEncouragements(manifest, issues);

  return {
    valid: issues.length === 0,
    issues
  };
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const courseCode = args.find(a => !a.startsWith('--'));

  if (!courseCode) {
    console.log(`
Manifest Structure Validator & Auto-Fixer

Usage:
  node manifest-structure-validator.cjs <course_code> [options]

Options:
  --check              Validate only (default, no changes)
  --fix                Validate and auto-fix fixable issues
  --check-durations    Include sample duration check (run after S3 extraction)
  --skip-completeness  Skip sample completeness check (enabled by default)
  --publish            If valid, publish to course-configs repo (dry-run)

Examples:
  node manifest-structure-validator.cjs spa_for_eng
  node manifest-structure-validator.cjs spa_for_eng --fix
  node manifest-structure-validator.cjs spa_for_eng --fix --check-durations
  node manifest-structure-validator.cjs spa_for_eng --publish

Checks performed:
  1. Structure      - All required keys at all levels
  2. UUID Matching  - seed.id = seed.node.id, item.id = item.node.id
  3. UUID Format    - All UUIDs should be UPPERCASE
  4. Empty Seeds    - Every seed must have introduction_items
  5. Tokens/Lemmas  - Must be populated (not empty)
  6. Encouragements - Must be in slices, not top-level
  7. Durations      - Samples should have duration > 0 (optional)

Auto-fixable (with --fix):
  - UUID Matching
  - UUID Format (non-samples only)
  - Tokens/Lemmas
`);
    process.exit(1);
  }

  const options = {
    fix: args.includes('--fix'),
    checkDurations: args.includes('--check-durations'),
    checkCompleteness: !args.includes('--skip-completeness'), // Enabled by default
    publish: args.includes('--publish')
  };

  console.log(`\n=== Manifest Validation: ${courseCode} ===`);
  console.log(`Mode: ${options.fix ? 'FIX' : 'CHECK'}`);
  if (options.checkDurations) console.log('Including duration check');
  if (options.checkCompleteness) console.log('Including sample completeness check (required for publishing)');
  console.log('');

  const result = validateCourse(courseCode, options);

  // Report fixes
  if (result.fixes.length > 0) {
    console.log('✓ Auto-fixes applied:');
    result.fixes.forEach(f => console.log(`  - ${f}`));
    console.log('');
  }

  // Report warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach(w => console.log(`  ${w}`));
    console.log('');
  }

  // Report issues
  if (result.issues.length > 0) {
    console.log('✗ Issues found:');
    result.issues.forEach(i => console.log(`  - ${i}`));
    console.log('');
  }

  // Summary
  if (result.valid) {
    console.log('✓ Manifest is valid\n');

    if (options.publish) {
      // Run publish script
      console.log('Publishing to course-configs...\n');
      const { execSync } = require('child_process');
      const publishScript = path.join(__dirname, '..', 'sync', 'publish-to-course-configs.cjs');
      try {
        execSync(`node "${publishScript}" ${courseCode} --dry-run`, { stdio: 'inherit' });
        console.log('\nTo commit, run:');
        console.log(`  node tools/sync/publish-to-course-configs.cjs ${courseCode} --commit\n`);
      } catch (e) {
        console.error('Publish failed:', e.message);
        process.exit(1);
      }
    } else {
      // Print publish instructions
      console.log('To publish to course-configs:');
      console.log(`  node tools/validators/manifest-structure-validator.cjs ${courseCode} --publish\n`);
      console.log('Or publish directly:');
      console.log(`  node tools/sync/publish-to-course-configs.cjs ${courseCode} --dry-run`);
      console.log(`  node tools/sync/publish-to-course-configs.cjs ${courseCode} --commit\n`);
    }
  } else {
    console.log('✗ Manifest has issues\n');
  }

  if (result.saved) {
    console.log('✓ Changes saved to manifest\n');
  }

  process.exit(result.valid ? 0 : 1);
}

module.exports = {
  validateAndFixManifest,
  validateManifestStructure,
  validateCourse,
  EXPECTED
};
