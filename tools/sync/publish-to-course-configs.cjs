#!/usr/bin/env node
/**
 * publish-to-course-configs.cjs
 *
 * Publishes course manifests from S3 to the saysomethingin/course-configs repo.
 *
 * Usage:
 *   node tools/sync/publish-to-course-configs.cjs <course_code> [options]
 *
 * Options:
 *   --version X.Y.Z  Set specific version (default: major bump)
 *   --dry-run        Show what would happen without writing
 *   --commit         Auto-commit to author branch after copying
 *
 * Examples:
 *   node tools/sync/publish-to-course-configs.cjs spa_for_eng --dry-run
 *   node tools/sync/publish-to-course-configs.cjs cmn_for_eng --version 2.0.0
 *   node tools/sync/publish-to-course-configs.cjs spa_for_eng --commit
 *
 * NOTE: Version auto-detection (MAJOR/MINOR/PATCH based on diff) is planned
 * for a future enhancement. Currently defaults to major version bump.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const langService = require('../../services/language-code-service.cjs');

// Paths
const SCRIPT_DIR = __dirname;
const LANGUAGE_CODES_CSV = path.join(SCRIPT_DIR, 'reference', 'language_codes.csv');
const COURSE_CONFIGS_REPO = path.join(process.env.HOME, 'Documents', 'GitHub', 'course-configs');
const COURSE_CONFIGS_COURSES_DIR = path.join(COURSE_CONFIGS_REPO, 'Courses');

// S3 config
const S3_BUCKET = 'popty-bach-lfs';
const S3_COURSES_PREFIX = 'courses';

// Legacy mapping is now handled by language-code-service
// See services/language-code-service.cjs for the centralized conversion logic

// Canonical key order for JSON formatting (ensures clean diffs)
const KEY_ORDER = {
  root: ['id', 'known', 'target', 'version', 'status', 'introduction', 'slices'],
  introduction: ['id', 'cadence', 'role', 'duration'],
  slice: ['id', 'version', 'seeds', 'pooledEncouragements', 'orderedEncouragements', 'samples'],
  seed: ['id', 'seed_sentence', 'node', 'introduction_items'],
  seed_sentence: ['canonical'],
  node: ['id', 'known', 'target'],
  language_obj: ['text', 'tokens', 'lemmas'],
  introduction_item: ['id', 'node', 'nodes', 'presentation'],
  encouragement: ['id', 'text'],
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    courseCode: null,
    version: null,
    dryRun: false,
    commit: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--commit') {
      result.commit = true;
    } else if (arg === '--version' && args[i + 1]) {
      result.version = args[++i];
    } else if (!arg.startsWith('--')) {
      result.courseCode = arg;
    }
  }

  return result;
}

/**
 * Load language codes from CSV
 */
function loadLanguageCodes() {
  const csv = fs.readFileSync(LANGUAGE_CODES_CSV, 'utf-8');
  const lines = csv.trim().split('\n').slice(1); // Skip header
  const codes = {};

  for (const line of lines) {
    const [code, name] = line.split(',');
    if (code && name) {
      codes[code.trim()] = name.trim().replace(/^"|"$/g, '');
    }
  }

  return codes;
}

/**
 * Convert our course code (e.g., spa_for_eng) to course-configs format (e.g., en-es)
 * Uses centralized language-code-service for conversions
 */
function convertCourseCode(ourCode) {
  const parsed = langService.parseCourseCode(ourCode);
  if (!parsed) {
    throw new Error(`Invalid course code format: ${ourCode}. Expected format: xxx_for_yyy`);
  }

  const targetCode = parsed.target;  // Already standard (es, en, cmn, etc.)
  const knownCode = parsed.known;

  // Special handling for Welsh - default to cy-north
  if (targetCode === 'cy') {
    return `${knownCode}-cy-north`;
  }

  // Format: {known}-{target} (opposite of our format)
  return `${knownCode}-${targetCode}`;
}

/**
 * Fetch manifest from S3
 */
function fetchManifestFromS3(courseCode) {
  const s3Path = `s3://${S3_BUCKET}/${S3_COURSES_PREFIX}/${courseCode}/course_manifest.json`;
  console.log(`Fetching manifest from ${s3Path}...`);

  try {
    const result = execSync(`aws s3 cp ${s3Path} - --profile default`, {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large manifests
    });
    return JSON.parse(result);
  } catch (error) {
    throw new Error(`Failed to fetch manifest from S3: ${error.message}`);
  }
}

/**
 * Read existing version from course-configs repo
 */
function readExistingVersion(courseConfigsFilename) {
  const filePath = path.join(COURSE_CONFIGS_COURSES_DIR, `${courseConfigsFilename}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`No existing file found at ${filePath}, will use version 1.0.0 as base`);
    return '1.0.0';
  }

  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return existing.version || '1.0.0';
  } catch (error) {
    console.warn(`Warning: Could not read existing version: ${error.message}`);
    return '1.0.0';
  }
}

/**
 * Bump major version
 * NOTE: Future enhancement will auto-detect MAJOR/MINOR/PATCH based on diff
 */
function bumpMajorVersion(currentVersion) {
  const parts = currentVersion.split('.');
  const major = parseInt(parts[0], 10) || 0;
  return `${major + 1}.0.0`;
}

/**
 * Order object keys according to canonical order
 */
function orderKeys(obj, orderType) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const order = KEY_ORDER[orderType] || Object.keys(obj).sort();
  const ordered = {};

  // First add keys in specified order
  for (const key of order) {
    if (key in obj) {
      ordered[key] = obj[key];
    }
  }

  // Then add any remaining keys (sorted alphabetically)
  for (const key of Object.keys(obj).sort()) {
    if (!(key in ordered)) {
      ordered[key] = obj[key];
    }
  }

  return ordered;
}

/**
 * Recursively canonicalize JSON structure
 */
function canonicalizeManifest(manifest) {
  // Order root keys
  const result = orderKeys(manifest, 'root');

  // Order introduction
  if (result.introduction) {
    result.introduction = orderKeys(result.introduction, 'introduction');
  }

  // Order slices
  if (result.slices && Array.isArray(result.slices)) {
    result.slices = result.slices.map(slice => {
      const orderedSlice = orderKeys(slice, 'slice');

      // Order seeds
      if (orderedSlice.seeds && Array.isArray(orderedSlice.seeds)) {
        orderedSlice.seeds = orderedSlice.seeds.map(seed => {
          const orderedSeed = orderKeys(seed, 'seed');

          // Order seed_sentence
          if (orderedSeed.seed_sentence) {
            orderedSeed.seed_sentence = orderKeys(orderedSeed.seed_sentence, 'seed_sentence');
          }

          // Order node
          if (orderedSeed.node) {
            orderedSeed.node = canonicalizeNode(orderedSeed.node);
          }

          // Order introduction_items
          if (orderedSeed.introduction_items && Array.isArray(orderedSeed.introduction_items)) {
            orderedSeed.introduction_items = orderedSeed.introduction_items.map(item => {
              const orderedItem = orderKeys(item, 'introduction_item');
              if (orderedItem.node) {
                orderedItem.node = canonicalizeNode(orderedItem.node);
              }
              if (orderedItem.nodes && Array.isArray(orderedItem.nodes)) {
                orderedItem.nodes = orderedItem.nodes.map(n => canonicalizeNode(n));
              }
              return orderedItem;
            });
          }

          return orderedSeed;
        });
      }

      // Order encouragements
      if (orderedSlice.pooledEncouragements && Array.isArray(orderedSlice.pooledEncouragements)) {
        orderedSlice.pooledEncouragements = orderedSlice.pooledEncouragements.map(e => orderKeys(e, 'encouragement'));
      }
      if (orderedSlice.orderedEncouragements && Array.isArray(orderedSlice.orderedEncouragements)) {
        orderedSlice.orderedEncouragements = orderedSlice.orderedEncouragements.map(e => orderKeys(e, 'encouragement'));
      }

      return orderedSlice;
    });
  }

  return result;
}

/**
 * Canonicalize a node object
 */
function canonicalizeNode(node) {
  const orderedNode = orderKeys(node, 'node');
  if (orderedNode.known) {
    orderedNode.known = orderKeys(orderedNode.known, 'language_obj');
  }
  if (orderedNode.target) {
    orderedNode.target = orderKeys(orderedNode.target, 'language_obj');
  }
  return orderedNode;
}

/**
 * Write manifest to course-configs repo
 */
function writeManifest(manifest, courseConfigsFilename, dryRun) {
  const filePath = path.join(COURSE_CONFIGS_COURSES_DIR, `${courseConfigsFilename}.json`);
  const jsonContent = JSON.stringify(manifest, null, 2);

  if (dryRun) {
    console.log(`\n[DRY RUN] Would write to: ${filePath}`);
    console.log(`[DRY RUN] File size: ${(jsonContent.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[DRY RUN] Version: ${manifest.version}`);
    return;
  }

  fs.writeFileSync(filePath, jsonContent);
  console.log(`Written to: ${filePath}`);
  console.log(`File size: ${(jsonContent.length / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Commit changes to author branch
 */
function commitChanges(courseConfigsFilename, version, dryRun) {
  if (dryRun) {
    console.log(`\n[DRY RUN] Would commit with message: "Update ${courseConfigsFilename} to v${version}"`);
    return;
  }

  const filePath = `Courses/${courseConfigsFilename}.json`;

  try {
    // Ensure we're on author branch
    execSync('git checkout author', { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8' });

    // Stage the file
    execSync(`git add "${filePath}"`, { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8' });

    // Commit
    const commitMessage = `Update ${courseConfigsFilename} to v${version}`;
    execSync(`git commit -m "${commitMessage}"`, { cwd: COURSE_CONFIGS_REPO, encoding: 'utf-8' });

    console.log(`\nCommitted: ${commitMessage}`);
    console.log('Note: Changes are committed locally. Push manually when ready.');
  } catch (error) {
    console.error(`Failed to commit: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Publish to course-configs ===\n');

  // Parse arguments
  const { courseCode, version, dryRun, commit } = parseArgs();

  if (!courseCode) {
    console.error('Usage: node publish-to-course-configs.cjs <course_code> [--version X.Y.Z] [--dry-run] [--commit]');
    console.error('Example: node publish-to-course-configs.cjs spa_for_eng --dry-run');
    process.exit(1);
  }

  // Check course-configs repo exists
  if (!fs.existsSync(COURSE_CONFIGS_REPO)) {
    console.error(`Error: course-configs repo not found at ${COURSE_CONFIGS_REPO}`);
    console.error('Please clone it first: git clone git@github.com:saysomethingin/course-configs.git ~/Documents/GitHub/course-configs');
    process.exit(1);
  }

  // Convert course code
  const courseConfigsFilename = convertCourseCode(courseCode);
  console.log(`Course code mapping: ${courseCode} → ${courseConfigsFilename}.json`);

  // Fetch manifest from S3
  const manifest = fetchManifestFromS3(courseCode);
  console.log(`Fetched manifest with ${manifest.slices?.[0]?.seeds?.length || 0} seeds`);

  // Determine version
  const existingVersion = readExistingVersion(courseConfigsFilename);
  console.log(`Existing version: ${existingVersion}`);

  let newVersion;
  if (version) {
    newVersion = version;
    console.log(`Using specified version: ${newVersion}`);
  } else {
    newVersion = bumpMajorVersion(existingVersion);
    console.log(`Bumping major version: ${existingVersion} → ${newVersion}`);
  }

  // Update manifest version
  manifest.version = newVersion;

  // Canonicalize JSON
  console.log('Canonicalizing JSON structure...');
  const canonicalized = canonicalizeManifest(manifest);

  // Write to course-configs
  writeManifest(canonicalized, courseConfigsFilename, dryRun);

  // Commit if requested
  if (commit) {
    commitChanges(courseConfigsFilename, newVersion, dryRun);
  }

  console.log('\nDone!');
  if (dryRun) {
    console.log('\n[DRY RUN] No changes were made. Remove --dry-run to execute.');
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
