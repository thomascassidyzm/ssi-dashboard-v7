const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// PHASE 7 MANIFEST COMPILER V2
// ============================================================================
// Compiles course manifest from 4 data files in Italian course format
// Input: seed_pairs.json, lego_pairs.json, lego_baskets.json, introductions.json
// Output: course_manifest.json (EXACT Italian format)
// ============================================================================

// Accept courseCode as command-line argument
const courseCode = process.argv[2];
if (!courseCode) {
  console.error('❌ Error: Course code required');
  console.error('Usage: node phase7-compile-manifest-v2.cjs <courseCode>');
  console.error('Example: node phase7-compile-manifest-v2.cjs cmn_for_eng');
  process.exit(1);
}

const VFS_ROOT = process.env.VFS_ROOT || path.join(__dirname, '../public/vfs/courses');
const COURSE_DIR = path.join(VFS_ROOT, courseCode);
const CANONICAL_DIR = path.join(__dirname, '../public/vfs/canonical');

console.log('📦 Phase 7 Manifest Compiler V2\n');
console.log(`Course: ${courseCode}`);
console.log(`Course Dir: ${COURSE_DIR}`);
console.log('Loading input files...');

// Load input files
const seedPairs = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'seed_pairs.json')));
const legoPairs = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'lego_pairs.json')));
const legoBaskets = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'lego_baskets.json')));
const introductions = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'introductions.json')));
const welcomes = JSON.parse(fs.readFileSync(path.join(CANONICAL_DIR, 'welcomes.json')));
const encouragements = JSON.parse(fs.readFileSync(path.join(CANONICAL_DIR, 'eng_encouragements.json')));

// Verify courseCode matches
if (seedPairs.course && seedPairs.course !== courseCode) {
  console.warn(`⚠️  Warning: seed_pairs.course (${seedPairs.course}) doesn't match provided courseCode (${courseCode})`);
}

const knownLang = seedPairs.known_language;
const targetLang = seedPairs.target_language;
const welcome = welcomes.welcomes[courseCode];

// Language code to full name mapping
const langNames = {
  'eng': 'English',
  'en': 'English',
  'cmn': 'Chinese',
  'spa': 'Spanish',
  'es': 'Spanish',
  'fra': 'French',
  'fr': 'French',
  'deu': 'German',
  'de': 'German',
  'ita': 'Italian',
  'it': 'Italian',
  'por': 'Portuguese',
  'pt': 'Portuguese',
  'rus': 'Russian',
  'ru': 'Russian',
  'ara': 'Arabic',
  'ar': 'Arabic',
  'jpn': 'Japanese',
  'ja': 'Japanese',
  'kor': 'Korean',
  'ko': 'Korean',
  'bre': 'Breton',
  'br': 'Breton',
  'cym': 'Welsh',
  'cy': 'Welsh',
  'gle': 'Irish',
  'ga': 'Irish',
  'nld': 'Dutch',
  'nl': 'Dutch',
  'tur': 'Turkish',
  'tr': 'Turkish',
  'ces': 'Czech',
  'cs': 'Czech'
};

// Mapping from 3-letter to 2-letter codes (for English only - target languages stay 3-letter)
const shortCodeMap = {
  'eng': 'en'  // English uses 2-letter code in manifest
  // All other languages use their existing codes (3-letter for targets)
};

const targetName = langNames[targetLang] || targetLang;
const knownName = langNames[knownLang] || knownLang;

console.log(`✓ Course: ${courseCode}`);
console.log(`✓ Known: ${knownLang}, Target: ${targetLang}`);
console.log(`✓ Seeds: ${Object.keys(seedPairs.translations).length}`);
console.log(`✓ Total LEGOs: ${legoPairs.seeds.reduce((sum, s) => sum + s.legos.length, 0)}`);
console.log(`✓ Baskets: ${Object.keys(legoBaskets.baskets).length}`);
console.log(`✓ Encouragements: ${encouragements.pooledEncouragements.length}\n`);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate deterministic UUID from content
 */
function generateUUID(content) {
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-').toUpperCase();
}

/**
 * Simple tokenization - split on spaces and punctuation
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Simple lemmatization - just lowercase for now
 * (In production, use proper lemmatizer)
 */
function lemmatize(text) {
  return tokenize(text);
}

/**
 * Create language node with text and empty tokens/lemmas (fields exist but unused)
 */
function createLanguageNode(text) {
  return {
    text: text,
    tokens: [],
    lemmas: []
  };
}

/**
 * Create node with ID and known/target language nodes
 */
function createNode(knownText, targetText) {
  const nodeId = generateUUID(`node:${knownText}:${targetText}`);
  return {
    id: nodeId,
    known: createLanguageNode(knownText),
    target: createLanguageNode(targetText)
  };
}

// ============================================================================
// BUILD MANIFEST
// ============================================================================

console.log('Building manifest structure...\n');

// Apply language code mapping: English uses 2-letter 'en', target languages use 3-letter codes
const manifestKnown = shortCodeMap[knownLang] || knownLang;
const manifestTarget = targetLang;  // Target languages keep their 3-letter codes

console.log(`✓ Manifest codes: known=${manifestKnown}, target=${manifestTarget}`);

const manifest = {
  id: `${manifestKnown}-${manifestTarget}`,
  known: manifestKnown,
  target: manifestTarget,
  version: "8.2.0",
  status: "alpha",
  introduction: {
    id: welcome ? welcome.id : generateUUID('welcome:' + courseCode),
    cadence: "natural",
    role: "presentation",
    duration: welcome ? welcome.duration : 0
  },
  slices: []
};

// Single slice containing all seeds (matching Italian field order)
const slice = {
  id: generateUUID('slice:main:' + courseCode),
  seeds: [],
  pooledEncouragements: encouragements.pooledEncouragements.map(enc => ({
    text: enc.text,
    id: enc.id
  })),
  orderedEncouragements: encouragements.orderedEncouragements.map(enc => ({
    text: enc.text,
    id: enc.id
  })),
  samples: {},
  version: "8.2.0"
};

// Track all unique texts for samples
const allSamples = new Map();

// Add welcome to samples
if (welcome && welcome.text) {
  allSamples.set(welcome.text, {
    duration: welcome.duration || 0,
    id: welcome.id,
    cadence: "natural",
    role: "presentation"
  });
}

// Add encouragements to samples
encouragements.pooledEncouragements.forEach(enc => {
  allSamples.set(enc.text, {
    duration: 0,
    id: enc.id,
    cadence: "natural",
    role: "presentation_encouragement"
  });
});

// ============================================================================
// PROCESS EACH SEED
// ============================================================================

console.log('Processing seeds and LEGOs...');

let processedSeeds = 0;
let processedLegos = 0;
let processedPhrases = 0;

legoPairs.seeds.forEach((seedData, seedIndex) => {
  const seedId = seedData.seed_id;
  const seedPair = seedPairs.translations[seedId];

  if (!seedPair) {
    console.warn(`⚠️  Missing seed pair for ${seedId}`);
    return;
  }

  // Create seed object
  const seed = {
    id: generateUUID('seed:' + seedId),
    seed_sentence: {
      canonical: seedPair.known
    },
    node: createNode(seedPair.known, seedPair.target),
    introduction_items: []
  };

  // Add seed sentence to samples
  allSamples.set(seedPair.known, {
    duration: 0,
    id: generateUUID('sample:seed:' + seedId + ':known'),
    cadence: "natural",
    role: "seed_known"
  });
  allSamples.set(seedPair.target, {
    duration: 0,
    id: generateUUID('sample:seed:' + seedId + ':target'),
    cadence: "natural",
    role: "seed_target"
  });

  // Process each LEGO in this seed
  seedData.legos.forEach((lego, legoIndex) => {
    const legoId = lego.id;
    const legoKnown = lego.lego.known;
    const legoTarget = lego.lego.target;
    const basket = legoBaskets.baskets[legoId];
    const presentationData = introductions.presentations[legoId];

    // Skip if no basket (expected for new=false review LEGOs)
    if (!basket) {
      return;
    }

    if (!presentationData) {
      console.warn(`⚠️  Missing presentation for ${legoId}`);
      return;
    }

    // Handle both v2 format (object with .text) and legacy format (string)
    const presentationText = typeof presentationData === 'string'
      ? presentationData
      : presentationData.text;

    // Create introduction item
    const introItem = {
      id: generateUUID('intro:' + legoId),
      node: createNode(legoKnown, legoTarget),
      nodes: [],
      presentation: presentationText
    };

    // Add LEGO to samples
    allSamples.set(legoKnown, {
      duration: 0,
      id: generateUUID('sample:lego:' + legoId + ':known'),
      cadence: "natural",
      role: "lego_known"
    });
    allSamples.set(legoTarget, {
      duration: 0,
      id: generateUUID('sample:lego:' + legoId + ':target'),
      cadence: "natural",
      role: "lego_target"
    });

    // Add presentation to samples
    allSamples.set(presentationText, {
      duration: 0,
      id: generateUUID('sample:presentation:' + legoId),
      cadence: "natural",
      role: "presentation"
    });

    // Add practice phrases from basket
    if (basket.practice_phrases && basket.practice_phrases.length > 0) {
      basket.practice_phrases.forEach((phrase, phraseIndex) => {
        const phraseNode = createNode(phrase.known, phrase.target);
        introItem.nodes.push(phraseNode);

        // Add phrase to samples
        allSamples.set(phrase.known, {
          duration: 0,
          id: generateUUID('sample:phrase:' + legoId + ':' + phraseIndex + ':known'),
          cadence: "natural",
          role: "practice_known"
        });
        allSamples.set(phrase.target, {
          duration: 0,
          id: generateUUID('sample:phrase:' + legoId + ':' + phraseIndex + ':target'),
          cadence: "natural",
          role: "practice_target"
        });

        processedPhrases++;
      });
    }

    seed.introduction_items.push(introItem);
    processedLegos++;
  });

  slice.seeds.push(seed);
  processedSeeds++;

  if (processedSeeds % 50 === 0) {
    console.log(`  Processed ${processedSeeds} seeds...`);
  }
});

// ============================================================================
// BUILD SAMPLES OBJECT
// ============================================================================

console.log('\nBuilding samples object...');

// Convert samples map to object format (text as key, array of sample objects as value)
allSamples.forEach((sample, text) => {
  slice.samples[text] = [sample];
});

// ============================================================================
// FINALIZE AND WRITE
// ============================================================================

manifest.slices.push(slice);

// Generate timestamp in format: YYYYMMDD_HHMMSS
const now = new Date();
const timestamp = now.getFullYear() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0') + '_' +
  String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');

// Format: {Target}_for_{Known}_speakers_COURSE_{timestamp}
const manifestFilename = `${targetName}_for_${knownName}_speakers_COURSE_${timestamp}.json`;

const outputPath = path.join(COURSE_DIR, manifestFilename);
const backupPath = path.join(COURSE_DIR, 'course_manifest.json.backup.' + Date.now());

// Backup existing manifest if present
if (fs.existsSync(outputPath)) {
  fs.copyFileSync(outputPath, backupPath);
  console.log(`✓ Backed up existing manifest to ${path.basename(backupPath)}`);
}

// Write new manifest (compact with 1-space indent)
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 1));

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n✅ Manifest compilation complete!\n');
console.log('📊 Summary:');
console.log(`   Seeds: ${processedSeeds}`);
console.log(`   LEGOs: ${processedLegos}`);
console.log(`   Practice phrases: ${processedPhrases}`);
console.log(`   Unique samples: ${allSamples.size}`);
console.log(`   Output: ${outputPath}`);
console.log(`   Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB\n`);
