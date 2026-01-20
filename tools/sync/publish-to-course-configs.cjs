#!/usr/bin/env node
/**
 * publish-to-course-configs.cjs
 *
 * Publishes legacy course manifests to the saysomethingin/course-configs repo.
 *
 * Usage:
 *   node tools/sync/publish-to-course-configs.cjs --file <manifest_path> [options]
 *
 * Required:
 *   --file PATH      Path to the legacy manifest JSON file
 *
 * Options:
 *   --version X.Y.Z  Set specific version (default: major bump from existing)
 *   --status STATUS  Set status (alpha, beta, release) - default: beta
 *   --dry-run        Show what would happen without writing
 *   --commit         Auto-commit to author branch after copying
 *   --scp            Also upload to apidev server via SCP (requires VPN)
 *
 * course-configs filename: {course_id}.json (e.g., en-it.json)
 * apidev SCP filename: {course_id}_{date}.json (e.g., en-it_20260120.json)
 *   - If multiple uploads in same day, appends _2, _3, etc.
 *
 * Examples:
 *   node tools/sync/publish-to-course-configs.cjs --file ~/Downloads/ita_legacy_manifest.json --dry-run
 *   node tools/sync/publish-to-course-configs.cjs --file ~/Downloads/spa_legacy.json --version 2.0.0 --commit --scp
 *
 * NOTE: Version auto-detection (MAJOR/MINOR/PATCH based on diff) is planned
 * for a future enhancement. Currently defaults to major version bump.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const COURSE_CONFIGS_REPO = path.join(process.env.HOME, 'Documents', 'GitHub', 'course-configs');
const COURSE_CONFIGS_COURSES_DIR = path.join(COURSE_CONFIGS_REPO, 'Courses');

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
 * Simple tokenizer - split on whitespace
 */
function tokenize(text) {
  if (!text) return [];
  return text.split(/\s+/).filter(t => t.length > 0);
}

/**
 * Populate tokens and lemmas for a language object (known/target)
 */
function populateLanguageObj(langObj) {
  if (!langObj || !langObj.text) return;
  langObj.tokens = tokenize(langObj.text);
  langObj.lemmas = tokenize(langObj.text); // Same as tokens for now
}

/**
 * Populate tokens and lemmas for all nodes in a manifest
 */
function populateTokensAndLemmas(manifest) {
  let nodesPopulated = 0;

  for (const slice of manifest.slices || []) {
    for (const seed of slice.seeds || []) {
      // Seed node
      if (seed.node) {
        populateLanguageObj(seed.node.known);
        populateLanguageObj(seed.node.target);
        nodesPopulated++;
      }

      // Introduction items
      for (const introItem of seed.introduction_items || []) {
        // IntroItem node
        if (introItem.node) {
          populateLanguageObj(introItem.node.known);
          populateLanguageObj(introItem.node.target);
          nodesPopulated++;
        }

        // Nodes array within introItem
        for (const node of introItem.nodes || []) {
          populateLanguageObj(node.known);
          populateLanguageObj(node.target);
          nodesPopulated++;
        }
      }
    }
  }

  return nodesPopulated;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    filePath: null,
    version: null,
    status: 'beta',  // Default to beta
    dryRun: false,
    commit: false,
    scp: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--commit') {
      result.commit = true;
    } else if (arg === '--scp') {
      result.scp = true;
    } else if (arg === '--file' && args[i + 1]) {
      result.filePath = args[++i];
    } else if (arg === '--version' && args[i + 1]) {
      result.version = args[++i];
    } else if (arg === '--status' && args[i + 1]) {
      result.status = args[++i];
    }
  }

  return result;
}

/**
 * Load manifest from local file
 */
function loadManifestFromFile(filePath) {
  // Expand ~ to home directory
  const expandedPath = filePath.replace(/^~/, process.env.HOME);

  if (!fs.existsSync(expandedPath)) {
    throw new Error(`Manifest file not found: ${expandedPath}`);
  }

  console.log(`Loading manifest from: ${expandedPath}`);

  try {
    const content = fs.readFileSync(expandedPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse manifest: ${error.message}`);
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
 * Generate dated filename for SCP upload
 * Format: en-it_20260120.json, en-it_20260120_2.json, etc.
 */
function generateScpFilename(courseConfigsId) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const baseFilename = `${courseConfigsId}_${dateStr}`;

  // Check existing files on apidev server
  let existingFiles = [];
  try {
    const result = execSync(`ssh ssi@apidev "ls kai/${baseFilename}*.json 2>/dev/null || true"`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    existingFiles = result.trim().split('\n')
      .filter(f => f.length > 0)
      .map(f => path.basename(f));
  } catch (error) {
    // If SSH fails, just use base filename (might overwrite, but that's ok)
    console.log('  Note: Could not check existing files on apidev, using base filename');
  }

  if (existingFiles.length === 0) {
    return `${baseFilename}.json`;
  }

  // Find the next available suffix
  let suffix = 2;
  while (existingFiles.includes(`${baseFilename}_${suffix}.json`)) {
    suffix++;
  }

  // If base exists but no _2, use _2
  if (existingFiles.includes(`${baseFilename}.json`)) {
    return `${baseFilename}_${suffix}.json`;
  }

  return `${baseFilename}.json`;
}

/**
 * Upload manifest to apidev server via SCP
 */
function uploadToApidev(manifest, courseConfigsId, dryRun) {
  const scpFilename = generateScpFilename(courseConfigsId);
  const remotePath = `ssi@apidev:kai/${scpFilename}`;

  console.log(`\nSCP upload: ${scpFilename} → ${remotePath}`);

  if (dryRun) {
    console.log(`[DRY RUN] Would upload to: ${remotePath}`);
    return scpFilename;
  }

  // Write to temp file first
  const tempFile = path.join(require('os').tmpdir(), scpFilename);
  const jsonContent = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(tempFile, jsonContent);

  try {
    execSync(`scp "${tempFile}" "${remotePath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`✓ Uploaded to ${remotePath}`);

    // Clean up temp file
    fs.unlinkSync(tempFile);
    return scpFilename;
  } catch (error) {
    console.error(`✗ SCP failed: ${error.message}`);
    console.error('  Make sure VPN is connected and SSH key is configured.');
    // Clean up temp file
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    return null;
  }
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
  const { filePath, version, status, dryRun, commit, scp } = parseArgs();

  if (!filePath) {
    console.error('Usage: node publish-to-course-configs.cjs --file <manifest_path> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --file PATH       Path to legacy manifest JSON (required)');
    console.error('  --version X.Y.Z   Set specific version (default: major bump)');
    console.error('  --status STATUS   Set status (default: beta)');
    console.error('  --dry-run         Preview without making changes');
    console.error('  --commit          Auto-commit to author branch');
    console.error('  --scp             Upload to apidev server (requires VPN)');
    console.error('');
    console.error('Example: node publish-to-course-configs.cjs --file ~/Downloads/ita_legacy.json --commit --scp');
    process.exit(1);
  }

  // Check course-configs repo exists
  if (!fs.existsSync(COURSE_CONFIGS_REPO)) {
    console.error(`Error: course-configs repo not found at ${COURSE_CONFIGS_REPO}`);
    console.error('Please clone it first: git clone git@github.com:saysomethingin/course-configs.git ~/Documents/GitHub/course-configs');
    process.exit(1);
  }

  // Load manifest from file
  const manifest = loadManifestFromFile(filePath);

  // Get course ID from manifest (e.g., "en-it")
  const courseConfigsFilename = manifest.id;
  if (!courseConfigsFilename) {
    console.error('Error: Manifest is missing "id" field');
    process.exit(1);
  }

  console.log(`Course ID: ${courseConfigsFilename}`);
  console.log(`Seeds: ${manifest.slices?.[0]?.seeds?.length || 0}`);

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

  // Update manifest metadata
  manifest.version = newVersion;
  // manifest.id, manifest.known, manifest.target should already be set in the legacy manifest

  // Apply status (defaults to beta)
  manifest.status = status;
  console.log(`Setting status: ${status}`);

  // Populate tokens and lemmas for all nodes
  console.log('Populating tokens and lemmas...');
  const nodesPopulated = populateTokensAndLemmas(manifest);
  console.log(`Populated tokens/lemmas for ${nodesPopulated} nodes`);

  // Canonicalize JSON
  console.log('Canonicalizing JSON structure...');
  const canonicalized = canonicalizeManifest(manifest);

  // Write to course-configs
  writeManifest(canonicalized, courseConfigsFilename, dryRun);

  // Commit if requested
  if (commit) {
    commitChanges(courseConfigsFilename, newVersion, dryRun);
  }

  // SCP upload to apidev if requested
  if (scp) {
    uploadToApidev(canonicalized, courseConfigsFilename, dryRun);
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
