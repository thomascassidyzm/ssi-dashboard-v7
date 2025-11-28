/**
 * Pre-flight Check Service
 *
 * Validates all required services and connections before Phase 8 audio generation.
 * Prevents wasted time by catching configuration issues early.
 *
 * Features:
 * - Auto-fix capabilities where possible
 * - Agent instructions for non-auto-fixable issues
 * - Course-specific manifest validation
 */

const fs = require('fs-extra');
const path = require('path');
const https = require('https');

// Paths
const VFS_COURSES_PATH = path.join(__dirname, '..', 'public', 'vfs', 'courses');
const CANONICAL_PATH = path.join(__dirname, '..', 'public', 'vfs', 'canonical');

/**
 * Check if Azure Speech API is accessible and working
 */
async function checkAzureConnection() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key) {
    return {
      success: false,
      service: 'Azure Speech',
      error: 'AZURE_SPEECH_KEY not set in .env file'
    };
  }

  if (!region) {
    return {
      success: false,
      service: 'Azure Speech',
      error: 'AZURE_SPEECH_REGION not set in .env file'
    };
  }

  // Test actual API connection
  return new Promise((resolve) => {
    const options = {
      hostname: `${region}.tts.speech.microsoft.com`,
      path: '/cognitiveservices/voices/list',
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': key
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const voices = JSON.parse(data);
            resolve({
              success: true,
              service: 'Azure Speech',
              message: `Connected to ${region} (${voices.length} voices available)`,
              details: {
                region,
                voiceCount: voices.length
              }
            });
          } catch (error) {
            resolve({
              success: false,
              service: 'Azure Speech',
              error: `Invalid response from API: ${error.message}`
            });
          }
        } else if (res.statusCode === 401) {
          resolve({
            success: false,
            service: 'Azure Speech',
            error: `Invalid API key (HTTP 401). Check AZURE_SPEECH_KEY in .env`
          });
        } else if (res.statusCode === 403) {
          resolve({
            success: false,
            service: 'Azure Speech',
            error: `Access forbidden (HTTP 403). Check region and permissions`
          });
        } else {
          resolve({
            success: false,
            service: 'Azure Speech',
            error: `API returned HTTP ${res.statusCode}`
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        service: 'Azure Speech',
        error: `Network error: ${error.message}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        service: 'Azure Speech',
        error: 'Connection timeout (10s). Check network or region.'
      });
    });

    req.end();
  });
}

/**
 * Check if ElevenLabs API is accessible and working
 */
async function checkElevenLabsConnection() {
  const key = process.env.ELEVENLABS_API_KEY;

  if (!key) {
    return {
      success: false,
      service: 'ElevenLabs',
      error: 'ELEVENLABS_API_KEY not set in .env file',
      warning: 'Only needed if using ElevenLabs voices (source/presentation roles)'
    };
  }

  // Test API connection
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/user',
      method: 'GET',
      headers: {
        'xi-api-key': key
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const user = JSON.parse(data);
            resolve({
              success: true,
              service: 'ElevenLabs',
              message: `Connected (${user.subscription?.tier || 'unknown'} tier)`,
              details: {
                tier: user.subscription?.tier,
                characterCount: user.subscription?.character_count,
                characterLimit: user.subscription?.character_limit
              }
            });
          } catch (error) {
            resolve({
              success: false,
              service: 'ElevenLabs',
              error: `Invalid response: ${error.message}`
            });
          }
        } else if (res.statusCode === 401) {
          resolve({
            success: false,
            service: 'ElevenLabs',
            error: 'Invalid API key (HTTP 401). Check ELEVENLABS_API_KEY in .env'
          });
        } else {
          resolve({
            success: false,
            service: 'ElevenLabs',
            error: `API returned HTTP ${res.statusCode}`
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        service: 'ElevenLabs',
        error: `Network error: ${error.message}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        service: 'ElevenLabs',
        error: 'Connection timeout (10s). Check network connection.'
      });
    });

    req.end();
  });
}

/**
 * Check if AWS S3 credentials are configured
 */
async function checkS3Configuration() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;

  const missing = [];
  if (!accessKeyId) missing.push('AWS_ACCESS_KEY_ID');
  if (!secretKey) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!region) missing.push('AWS_REGION');
  if (!bucket) missing.push('S3_BUCKET');

  if (missing.length > 0) {
    return {
      success: false,
      service: 'AWS S3',
      error: `Missing environment variables: ${missing.join(', ')}`
    };
  }

  // Note: We don't test S3 connection here to avoid extra costs
  // S3 will be tested during actual upload
  return {
    success: true,
    service: 'AWS S3',
    message: 'Configuration found',
    details: {
      region,
      bucket
    }
  };
}

/**
 * Check if required Node modules are installed
 */
async function checkDependencies() {
  const required = [
    { name: 'microsoft-cognitiveservices-speech-sdk', service: 'Azure TTS' },
    { name: 'elevenlabs', service: 'ElevenLabs' },
    { name: '@aws-sdk/client-s3', service: 'AWS S3' },
    { name: 'fs-extra', service: 'File operations' },
    { name: 'dotenv', service: 'Environment variables' }
  ];

  const missing = [];
  const installed = [];

  for (const dep of required) {
    try {
      require.resolve(dep.name);
      installed.push(dep.name);
    } catch (error) {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    return {
      success: false,
      service: 'Node Dependencies',
      error: `Missing modules: ${missing.map(d => d.name).join(', ')}`,
      fix: `Run: npm install ${missing.map(d => d.name).join(' ')}`
    };
  }

  return {
    success: true,
    service: 'Node Dependencies',
    message: `All ${installed.length} required modules installed`
  };
}

/**
 * Check if sox (audio processor) is available
 */
async function checkSoxAvailability() {
  const { execSync } = require('child_process');

  try {
    execSync('which sox', { stdio: 'ignore' });
    const version = execSync('sox --version', { encoding: 'utf8' }).trim();
    return {
      success: true,
      service: 'SoX (Audio Processor)',
      message: `Installed: ${version.split('\n')[0]}`
    };
  } catch (error) {
    return {
      success: false,
      service: 'SoX (Audio Processor)',
      error: 'sox not found in PATH',
      fix: 'Install via: brew install sox (macOS) or apt-get install sox (Linux)',
      warning: 'Required for audio normalization and duration extraction'
    };
  }
}

/**
 * Check if there's sufficient disk space for audio generation
 * Minimum 5GB recommended:
 * - ~2GB for raw audio files (48K samples @ ~40KB each)
 * - ~2GB for mastered audio (temporary duplication during processing)
 * - ~1GB safety margin for logs, temp files, etc.
 */
async function checkDiskSpace(options = {}) {
  const { execSync } = require('child_process');
  const minFreeGB = options.minFreeGB || 5;
  const minFreeBytes = minFreeGB * 1024 * 1024 * 1024;

  try {
    // Get available space on the filesystem containing the project
    const projectDir = path.resolve(__dirname, '..');
    const dfOutput = execSync(`df -k "${projectDir}" | tail -1`, { encoding: 'utf8' });
    const parts = dfOutput.trim().split(/\s+/);

    // df -k outputs: Filesystem, 1K-blocks, Used, Available, Capacity, Mounted
    const availableKB = parseInt(parts[3], 10);
    const availableGB = availableKB / 1024 / 1024;
    const capacityPercent = parts[4];

    if (availableKB * 1024 < minFreeBytes) {
      return {
        success: false,
        service: 'Disk Space',
        error: `Only ${availableGB.toFixed(1)}GB free (${capacityPercent} used). Minimum ${minFreeGB}GB recommended.`,
        fix: 'Free up disk space or run generation on a different machine.',
        warning: 'Audio generation creates ~2GB of files, with temporary duplication during mastering.',
        details: {
          availableGB: availableGB.toFixed(1),
          requiredGB: minFreeGB,
          capacityUsed: capacityPercent
        }
      };
    }

    return {
      success: true,
      service: 'Disk Space',
      message: `${availableGB.toFixed(1)}GB available (${capacityPercent} used)`,
      details: {
        availableGB: availableGB.toFixed(1),
        requiredGB: minFreeGB,
        capacityUsed: capacityPercent
      }
    };
  } catch (error) {
    return {
      success: false,
      service: 'Disk Space',
      error: `Could not check disk space: ${error.message}`,
      warning: 'Manual verification recommended before large generation runs'
    };
  }
}

// ============================================================================
// NEW MANIFEST-SPECIFIC CHECKS (Auto-Fix Where Possible)
// ============================================================================

/**
 * Check actual S3 bucket access (not just env vars)
 * Tests connectivity to required buckets
 */
async function checkAndFixS3Access(options = {}) {
  const { bucket = process.env.S3_BUCKET } = options;

  if (!bucket) {
    return {
      success: false,
      service: 'S3 Access',
      error: 'S3_BUCKET not set',
      autoFixable: false,
      agentAction: 'Set S3_BUCKET in .env file'
    };
  }

  try {
    // Try to import and test s3Service
    const s3Service = require('./s3-service.cjs');

    // Test by checking if a test key exists (won't fail for non-existent keys)
    const testResult = await s3Service.audioExists('TEST-CONNECTIVITY-CHECK', bucket);

    return {
      success: true,
      service: 'S3 Access',
      message: `Bucket ${bucket} accessible`,
      details: { bucket }
    };
  } catch (error) {
    return {
      success: false,
      service: 'S3 Access',
      error: `Cannot access bucket ${bucket}: ${error.message}`,
      autoFixable: false,
      agentAction: 'Check AWS credentials and bucket permissions'
    };
  }
}

/**
 * Check voice assignments exist for course
 */
async function checkAndFixVoiceAssignments(courseCode) {
  if (!courseCode) {
    return {
      success: true,
      service: 'Voice Assignments',
      message: 'Skipped (no course specified)'
    };
  }

  const voicesPath = path.join(CANONICAL_PATH, 'voices.json');

  if (!await fs.pathExists(voicesPath)) {
    return {
      success: false,
      service: 'Voice Assignments',
      error: 'voices.json not found',
      autoFixable: false,
      agentAction: 'Run: aws s3 sync s3://popty-bach-lfs/canonical/ public/vfs/canonical/'
    };
  }

  try {
    const voicesConfig = await fs.readJson(voicesPath);

    // Try course-specific assignment first
    if (voicesConfig.course_assignments && voicesConfig.course_assignments[courseCode]) {
      const assignments = voicesConfig.course_assignments[courseCode];
      const roles = ['target1', 'target2', 'source', 'presentation'];
      const missing = roles.filter(r => !assignments[r]);

      if (missing.length > 0) {
        return {
          success: false,
          service: 'Voice Assignments',
          error: `Missing voice assignments for roles: ${missing.join(', ')}`,
          autoFixable: false,
          agentAction: `Add to voices.json course_assignments.${courseCode}: ${JSON.stringify(Object.fromEntries(missing.map(r => [r, 'VOICE_ID'])))}`
        };
      }

      return {
        success: true,
        service: 'Voice Assignments',
        message: `All roles assigned for ${courseCode}`,
        details: assignments
      };
    }

    // Try language pair
    const match = courseCode.match(/^(\w{3})_for_(\w{3})/);
    if (match) {
      const targetLang = match[1];
      const sourceLang = match[2];
      const langPair = `${sourceLang}-${targetLang}`;

      if (voicesConfig.language_pair_assignments && voicesConfig.language_pair_assignments[langPair]) {
        return {
          success: true,
          service: 'Voice Assignments',
          message: `Using language pair ${langPair}`,
          details: voicesConfig.language_pair_assignments[langPair]
        };
      }
    }

    return {
      success: false,
      service: 'Voice Assignments',
      error: `No voice assignments found for ${courseCode}`,
      autoFixable: false,
      agentAction: `Add voice assignments to voices.json for course ${courseCode} or language pair`
    };
  } catch (error) {
    return {
      success: false,
      service: 'Voice Assignments',
      error: `Failed to read voices.json: ${error.message}`,
      autoFixable: false,
      agentAction: 'Check voices.json format'
    };
  }
}

/**
 * Check and fix empty seeds (seeds with no introduction_items)
 * AUTO-FIXABLE: Removes empty seeds
 */
async function checkAndFixEmptySeeds(courseCode, options = {}) {
  const { autoFix = true } = options;

  if (!courseCode) {
    return { success: true, service: 'Empty Seeds', message: 'Skipped (no course specified)' };
  }

  const manifestPath = path.join(VFS_COURSES_PATH, courseCode, 'course_manifest.json');

  if (!await fs.pathExists(manifestPath)) {
    return {
      success: false,
      service: 'Empty Seeds',
      error: 'Manifest not found',
      autoFixable: false
    };
  }

  try {
    const manifest = await fs.readJson(manifestPath);
    const seeds = manifest.slices?.[0]?.seeds || [];
    const emptySeeds = seeds.filter(s => !s.introduction_items || s.introduction_items.length === 0);

    if (emptySeeds.length === 0) {
      return {
        success: true,
        service: 'Empty Seeds',
        message: `All ${seeds.length} seeds have introduction_items`
      };
    }

    if (autoFix) {
      // Remove empty seeds
      manifest.slices[0].seeds = seeds.filter(s => s.introduction_items && s.introduction_items.length > 0);
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });

      return {
        success: true,
        service: 'Empty Seeds',
        message: `AUTO-FIXED: Removed ${emptySeeds.length} empty seeds`,
        fixed: true,
        details: { removed: emptySeeds.length, remaining: manifest.slices[0].seeds.length }
      };
    }

    return {
      success: false,
      service: 'Empty Seeds',
      error: `${emptySeeds.length} seeds have no introduction_items`,
      autoFixable: true,
      agentAction: 'Run with autoFix=true to remove empty seeds'
    };
  } catch (error) {
    return {
      success: false,
      service: 'Empty Seeds',
      error: `Failed to check seeds: ${error.message}`
    };
  }
}

/**
 * Check and fix manifest structure using manifest-structure-validator
 * AUTO-FIXABLE: Uses validator's --fix mode
 */
async function checkAndFixManifestStructure(courseCode, options = {}) {
  const { autoFix = true } = options;

  if (!courseCode) {
    return { success: true, service: 'Manifest Structure', message: 'Skipped (no course specified)' };
  }

  try {
    const validator = require('../tools/validators/manifest-structure-validator.cjs');
    const result = validator.validateCourse(courseCode, { fix: autoFix });

    if (result.valid) {
      return {
        success: true,
        service: 'Manifest Structure',
        message: result.fixes.length > 0 ? `AUTO-FIXED: ${result.fixes.join('; ')}` : 'Valid',
        fixed: result.fixes.length > 0,
        details: { fixes: result.fixes, warnings: result.warnings }
      };
    }

    return {
      success: false,
      service: 'Manifest Structure',
      error: result.issues.join('; '),
      autoFixable: true,
      agentAction: 'Run: node tools/validators/manifest-structure-validator.cjs ' + courseCode + ' --fix'
    };
  } catch (error) {
    return {
      success: false,
      service: 'Manifest Structure',
      error: `Validator failed: ${error.message}`,
      autoFixable: false
    };
  }
}

/**
 * Check and fix welcome state (should be empty placeholder before generation)
 * AUTO-FIXABLE: Clears welcome.id if incomplete
 */
async function checkAndFixWelcomeState(courseCode, options = {}) {
  const { autoFix = true } = options;

  if (!courseCode) {
    return { success: true, service: 'Welcome State', message: 'Skipped (no course specified)' };
  }

  const manifestPath = path.join(VFS_COURSES_PATH, courseCode, 'course_manifest.json');

  if (!await fs.pathExists(manifestPath)) {
    return { success: true, service: 'Welcome State', message: 'Skipped (no manifest)' };
  }

  try {
    const manifest = await fs.readJson(manifestPath);
    const intro = manifest.introduction;

    if (!intro) {
      return {
        success: true,
        service: 'Welcome State',
        message: 'No introduction defined'
      };
    }

    // Welcome is fine if: no id, or id with duration > 0
    if (!intro.id || (intro.id && intro.duration > 0)) {
      return {
        success: true,
        service: 'Welcome State',
        message: intro.id ? `Welcome audio exists (${intro.duration}s)` : 'Welcome placeholder ready'
      };
    }

    // Problem: id exists but no duration (incomplete state)
    if (intro.id && (!intro.duration || intro.duration === 0)) {
      if (autoFix) {
        intro.id = '';
        intro.duration = 0;
        await fs.writeJson(manifestPath, manifest, { spaces: 2 });

        return {
          success: true,
          service: 'Welcome State',
          message: 'AUTO-FIXED: Cleared incomplete welcome',
          fixed: true
        };
      }

      return {
        success: false,
        service: 'Welcome State',
        error: 'Welcome has ID but no duration (incomplete)',
        autoFixable: true,
        agentAction: 'Clear introduction.id or generate welcome audio'
      };
    }

    return { success: true, service: 'Welcome State', message: 'OK' };
  } catch (error) {
    return {
      success: false,
      service: 'Welcome State',
      error: `Failed to check welcome: ${error.message}`
    };
  }
}

/**
 * Check and fix encouragements empty state (should be empty before generation)
 * AUTO-FIXABLE: Removes encouragements from manifest
 */
async function checkAndFixEncouragementsEmpty(courseCode, options = {}) {
  const { autoFix = true } = options;

  if (!courseCode) {
    return { success: true, service: 'Encouragements Empty', message: 'Skipped (no course specified)' };
  }

  const manifestPath = path.join(VFS_COURSES_PATH, courseCode, 'course_manifest.json');

  if (!await fs.pathExists(manifestPath)) {
    return { success: true, service: 'Encouragements Empty', message: 'Skipped (no manifest)' };
  }

  try {
    const manifest = await fs.readJson(manifestPath);
    const slice = manifest.slices?.[0];

    if (!slice) {
      return { success: true, service: 'Encouragements Empty', message: 'No slice found' };
    }

    const hasOrdered = slice.orderedEncouragements && slice.orderedEncouragements.length > 0;
    const hasPooled = slice.pooledEncouragements && slice.pooledEncouragements.length > 0;

    if (!hasOrdered && !hasPooled) {
      return {
        success: true,
        service: 'Encouragements Empty',
        message: 'Encouragements are empty (ready for generation)'
      };
    }

    if (autoFix) {
      delete slice.orderedEncouragements;
      delete slice.pooledEncouragements;
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });

      return {
        success: true,
        service: 'Encouragements Empty',
        message: 'AUTO-FIXED: Removed encouragements (will be re-added post-generation)',
        fixed: true
      };
    }

    return {
      success: false,
      service: 'Encouragements Empty',
      error: `Encouragements present (${(slice.orderedEncouragements?.length || 0) + (slice.pooledEncouragements?.length || 0)} total)`,
      autoFixable: true,
      agentAction: 'Remove encouragements before deduplication'
    };
  } catch (error) {
    return {
      success: false,
      service: 'Encouragements Empty',
      error: `Failed to check encouragements: ${error.message}`
    };
  }
}

/**
 * Check and fix slashes in presentations
 * AUTO-FIXABLE: Replaces "/" with " or "
 */
async function checkAndFixSlashesInPresentations(courseCode, options = {}) {
  const { autoFix = true } = options;

  if (!courseCode) {
    return { success: true, service: 'Slashes in Presentations', message: 'Skipped (no course specified)' };
  }

  const manifestPath = path.join(VFS_COURSES_PATH, courseCode, 'course_manifest.json');

  if (!await fs.pathExists(manifestPath)) {
    return { success: true, service: 'Slashes in Presentations', message: 'Skipped (no manifest)' };
  }

  try {
    const manifest = await fs.readJson(manifestPath);
    const seeds = manifest.slices?.[0]?.seeds || [];

    let slashCount = 0;
    const presentationsWithSlashes = [];

    for (const seed of seeds) {
      for (const item of seed.introduction_items || []) {
        if (item.presentation && item.presentation.includes('/')) {
          slashCount++;
          if (presentationsWithSlashes.length < 5) {
            presentationsWithSlashes.push(item.presentation.substring(0, 60));
          }
        }
      }
    }

    if (slashCount === 0) {
      return {
        success: true,
        service: 'Slashes in Presentations',
        message: 'No slashes found in presentations'
      };
    }

    if (autoFix) {
      let fixedCount = 0;
      for (const seed of seeds) {
        for (const item of seed.introduction_items || []) {
          if (item.presentation && item.presentation.includes('/')) {
            item.presentation = item.presentation.replace(/\//g, ' or ');
            fixedCount++;
          }
        }
      }
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });

      return {
        success: true,
        service: 'Slashes in Presentations',
        message: `AUTO-FIXED: Replaced slashes in ${fixedCount} presentations`,
        fixed: true
      };
    }

    return {
      success: false,
      service: 'Slashes in Presentations',
      error: `${slashCount} presentations contain "/" character`,
      autoFixable: true,
      agentAction: 'Replace "/" with " or " in presentations',
      details: { examples: presentationsWithSlashes }
    };
  } catch (error) {
    return {
      success: false,
      service: 'Slashes in Presentations',
      error: `Failed to check presentations: ${error.message}`
    };
  }
}

/**
 * Check presentation target text match
 * NOT AUTO-FIXABLE: Requires manual review
 */
async function checkPresentationTargetMatch(courseCode) {
  if (!courseCode) {
    return { success: true, service: 'Presentation Target Match', message: 'Skipped (no course specified)' };
  }

  const manifestPath = path.join(VFS_COURSES_PATH, courseCode, 'course_manifest.json');

  if (!await fs.pathExists(manifestPath)) {
    return { success: true, service: 'Presentation Target Match', message: 'Skipped (no manifest)' };
  }

  try {
    const manifest = await fs.readJson(manifestPath);
    const seeds = manifest.slices?.[0]?.seeds || [];

    const mismatches = [];

    for (const seed of seeds) {
      for (const item of seed.introduction_items || []) {
        const targetText = item.node?.target?.text;
        const presentation = item.presentation;

        if (targetText && presentation) {
          // Check if presentation contains target text (case-insensitive)
          if (!presentation.toLowerCase().includes(targetText.toLowerCase())) {
            mismatches.push({
              seedId: seed.id,
              itemId: item.id,
              target: targetText,
              presentation: presentation.substring(0, 80)
            });
          }
        }
      }
    }

    if (mismatches.length === 0) {
      return {
        success: true,
        service: 'Presentation Target Match',
        message: 'All presentations contain their target text'
      };
    }

    return {
      success: false,
      service: 'Presentation Target Match',
      error: `${mismatches.length} presentations don't contain their target text`,
      autoFixable: false,
      agentAction: 'Review mismatched presentations - target text should appear in presentation',
      details: { mismatches: mismatches.slice(0, 5), total: mismatches.length }
    };
  } catch (error) {
    return {
      success: false,
      service: 'Presentation Target Match',
      error: `Failed to check presentations: ${error.message}`
    };
  }
}

// ============================================================================
// MAIN PREFLIGHT CHECK FUNCTIONS
// ============================================================================

/**
 * Run all pre-flight checks
 * Enhanced interface with auto-fix support
 */
async function runPreflightChecks(options = {}) {
  const { verbose = true, skipOptional = false, courseCode = null, autoFix = true } = options;

  if (verbose) {
    console.log('\n' + '='.repeat(60));
    console.log('Phase 8: Pre-flight Checks');
    console.log('='.repeat(60));
    console.log();
  }

  const results = [];

  // Critical checks
  if (verbose) console.log('Checking dependencies...');
  results.push(await checkDependencies());

  if (verbose) console.log('Checking Azure Speech API...');
  results.push(await checkAzureConnection());

  if (verbose) console.log('Checking ElevenLabs API...');
  results.push(await checkElevenLabsConnection());

  if (verbose) console.log('Checking S3 configuration...');
  results.push(await checkS3Configuration());

  if (verbose) console.log('Checking SoX audio processor...');
  results.push(await checkSoxAvailability());

  if (verbose) console.log('Checking disk space...');
  results.push(await checkDiskSpace());

  // Course-specific manifest checks (if courseCode provided)
  if (courseCode) {
    if (verbose) console.log(`\nCourse-specific checks for ${courseCode}...`);

    if (verbose) console.log('Checking S3 access...');
    results.push(await checkAndFixS3Access());

    if (verbose) console.log('Checking voice assignments...');
    results.push(await checkAndFixVoiceAssignments(courseCode));

    if (verbose) console.log('Checking empty seeds...');
    results.push(await checkAndFixEmptySeeds(courseCode, { autoFix }));

    if (verbose) console.log('Checking manifest structure...');
    results.push(await checkAndFixManifestStructure(courseCode, { autoFix }));

    if (verbose) console.log('Checking welcome state...');
    results.push(await checkAndFixWelcomeState(courseCode, { autoFix }));

    if (verbose) console.log('Checking encouragements empty...');
    results.push(await checkAndFixEncouragementsEmpty(courseCode, { autoFix }));

    if (verbose) console.log('Checking slashes in presentations...');
    results.push(await checkAndFixSlashesInPresentations(courseCode, { autoFix }));

    if (verbose) console.log('Checking presentation/target match...');
    results.push(await checkPresentationTargetMatch(courseCode));
  }

  // Categorize results
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const fixed = results.filter(r => r.fixed);
  const agentActions = failed.filter(r => r.agentAction);
  const unfixable = failed.filter(r => !r.autoFixable && !r.agentAction);

  if (verbose) {
    console.log('\n' + '='.repeat(60));
    console.log('Pre-flight Check Results');
    console.log('='.repeat(60));
    console.log();

    // Show auto-fixed
    if (fixed.length > 0) {
      console.log('🔧 AUTO-FIXED:');
      fixed.forEach(r => {
        console.log(`  ${r.service}: ${r.message}`);
      });
      console.log();
    }

    // Show passed checks
    if (passed.length > 0) {
      console.log('✅ PASSED:');
      passed.forEach(r => {
        if (!r.fixed) {
          console.log(`  ${r.service}: ${r.message || 'OK'}`);
        }
      });
      console.log();
    }

    // Show agent actions needed
    if (agentActions.length > 0) {
      console.log('🤖 AGENT ACTION REQUIRED:');
      agentActions.forEach(r => {
        console.log(`  ${r.service}: ${r.error}`);
        console.log(`    → ${r.agentAction}`);
      });
      console.log();
    }

    // Show unfixable failures
    if (unfixable.length > 0) {
      console.log('❌ BLOCKING ISSUES:');
      unfixable.forEach(r => {
        console.log(`  ${r.service}: ${r.error}`);
        if (r.fix) {
          console.log(`    Fix: ${r.fix}`);
        }
        if (r.warning) {
          console.log(`    Note: ${r.warning}`);
        }
      });
      console.log();
    }

    console.log('='.repeat(60));
    console.log(`Summary: ${passed.length} passed, ${fixed.length} auto-fixed, ${failed.length} failed`);
    if (agentActions.length > 0) {
      console.log(`         ${agentActions.length} require agent action`);
    }
    console.log('='.repeat(60));
    console.log();
  }

  return {
    passed: passed.length,
    failed: failed.length,
    results,
    allPassed: failed.length === 0,
    // New enhanced interface
    fixed: fixed.map(r => ({ service: r.service, message: r.message })),
    agentActions: agentActions.map(r => ({ service: r.service, error: r.error, action: r.agentAction })),
    unfixable: unfixable.map(r => ({ service: r.service, error: r.error }))
  };
}

module.exports = {
  runPreflightChecks,
  // Core service checks
  checkAzureConnection,
  checkElevenLabsConnection,
  checkS3Configuration,
  checkDependencies,
  checkSoxAvailability,
  checkDiskSpace,
  // New manifest-specific checks with auto-fix
  checkAndFixS3Access,
  checkAndFixVoiceAssignments,
  checkAndFixEmptySeeds,
  checkAndFixManifestStructure,
  checkAndFixWelcomeState,
  checkAndFixEncouragementsEmpty,
  checkAndFixSlashesInPresentations,
  checkPresentationTargetMatch
};
