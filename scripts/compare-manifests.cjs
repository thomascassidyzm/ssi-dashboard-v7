const fs = require('fs');
const path = require('path');

// ============================================================================
// MANIFEST COMPARISON SCRIPT
// ============================================================================
// Compares a new manifest against the Italian reference manifest section by section
// ============================================================================

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node compare-manifests.cjs <new_manifest_path> [reference_manifest_path]');
  console.error('Example: node compare-manifests.cjs public/vfs/courses/spa_for_eng/course_manifest.json');
  process.exit(1);
}

const newManifestPath = args[0];
const refManifestPath = args[1] || path.join(__dirname, '../public/vfs/canonical/Example Course Manifest Italian_for_English_speakers_COURSE_20250827_144821 (1).json');

console.log('MANIFEST COMPARISON\n');
console.log(`Reference: ${path.basename(refManifestPath)}`);
console.log(`New:       ${path.basename(newManifestPath)}\n`);

const ref = JSON.parse(fs.readFileSync(refManifestPath, 'utf8'));
const newM = JSON.parse(fs.readFileSync(newManifestPath, 'utf8'));

let issues = [];
let matches = [];

// ============================================================================
// SECTION 1: TOP-LEVEL STRUCTURE
// ============================================================================
console.log('=' .repeat(60));
console.log('SECTION 1: TOP-LEVEL STRUCTURE');
console.log('=' .repeat(60));

const refKeys = Object.keys(ref).sort();
const newKeys = Object.keys(newM).sort();

console.log(`\nReference keys: ${refKeys.join(', ')}`);
console.log(`New keys:       ${newKeys.join(', ')}`);

if (JSON.stringify(refKeys) === JSON.stringify(newKeys)) {
  console.log('✓ Top-level keys match');
  matches.push('Top-level keys');
} else {
  console.log('✗ Top-level keys DIFFER');
  issues.push('Top-level keys differ');
}

// ============================================================================
// SECTION 2: HEADER FIELDS
// ============================================================================
console.log('\n' + '=' .repeat(60));
console.log('SECTION 2: HEADER FIELDS');
console.log('=' .repeat(60));

const headerFields = ['id', 'known', 'target', 'version', 'status'];
headerFields.forEach(field => {
  const refVal = ref[field];
  const newVal = newM[field];
  const typeMatch = typeof refVal === typeof newVal;
  console.log(`\n${field}:`);
  console.log(`  Reference: ${JSON.stringify(refVal)} (${typeof refVal})`);
  console.log(`  New:       ${JSON.stringify(newVal)} (${typeof newVal})`);
  if (typeMatch) {
    console.log(`  ✓ Type matches`);
  } else {
    console.log(`  ✗ Type DIFFERS`);
    issues.push(`Header field '${field}' type mismatch`);
  }
});

// ============================================================================
// SECTION 3: INTRODUCTION
// ============================================================================
console.log('\n' + '=' .repeat(60));
console.log('SECTION 3: INTRODUCTION');
console.log('=' .repeat(60));

const refIntro = ref.introduction || {};
const newIntro = newM.introduction || {};

console.log('\nReference introduction:');
Object.entries(refIntro).forEach(([k, v]) => {
  console.log(`  ${k}: ${JSON.stringify(v)} (${typeof v})`);
});

console.log('\nNew introduction:');
Object.entries(newIntro).forEach(([k, v]) => {
  console.log(`  ${k}: ${JSON.stringify(v)} (${typeof v})`);
});

const refIntroKeys = Object.keys(refIntro).sort();
const newIntroKeys = Object.keys(newIntro).sort();

if (JSON.stringify(refIntroKeys) === JSON.stringify(newIntroKeys)) {
  console.log('\n✓ Introduction keys match');
  matches.push('Introduction keys');
} else {
  console.log('\n✗ Introduction keys DIFFER');
  console.log(`  Reference: ${refIntroKeys.join(', ')}`);
  console.log(`  New:       ${newIntroKeys.join(', ')}`);
  issues.push('Introduction keys differ');
}

// ============================================================================
// SECTION 4: SLICE STRUCTURE
// ============================================================================
console.log('\n' + '=' .repeat(60));
console.log('SECTION 4: SLICE STRUCTURE');
console.log('=' .repeat(60));

const refSlice = ref.slices[0] || {};
const newSlice = newM.slices[0] || {};

console.log(`\nReference slices: ${ref.slices.length}`);
console.log(`New slices:       ${newM.slices.length}`);

const refSliceKeys = Object.keys(refSlice).sort();
const newSliceKeys = Object.keys(newSlice).sort();

console.log(`\nReference slice keys: ${refSliceKeys.join(', ')}`);
console.log(`New slice keys:       ${newSliceKeys.join(', ')}`);

if (JSON.stringify(refSliceKeys) === JSON.stringify(newSliceKeys)) {
  console.log('✓ Slice keys match');
  matches.push('Slice keys');
} else {
  console.log('✗ Slice keys DIFFER');
  issues.push('Slice keys differ');
}

// ============================================================================
// SECTION 5: ENCOURAGEMENTS
// ============================================================================
console.log('\n' + '=' .repeat(60));
console.log('SECTION 5: ENCOURAGEMENTS');
console.log('=' .repeat(60));

const refPooled = refSlice.pooledEncouragements || [];
const newPooled = newSlice.pooledEncouragements || [];
const refOrdered = refSlice.orderedEncouragements || [];
const newOrdered = newSlice.orderedEncouragements || [];

console.log(`\npooledEncouragements:`);
console.log(`  Reference: ${refPooled.length} items`);
console.log(`  New:       ${newPooled.length} items`);

console.log(`\norderedEncouragements:`);
console.log(`  Reference: ${refOrdered.length} items`);
console.log(`  New:       ${newOrdered.length} items`);

if (refPooled.length > 0 && newPooled.length > 0) {
  const refPooledKeys = Object.keys(refPooled[0]).sort();
  const newPooledKeys = Object.keys(newPooled[0]).sort();
  console.log(`\nPooled item structure:`);
  console.log(`  Reference: ${refPooledKeys.join(', ')}`);
  console.log(`  New:       ${newPooledKeys.join(', ')}`);

  if (JSON.stringify(refPooledKeys) === JSON.stringify(newPooledKeys)) {
    console.log('  ✓ Structure matches');
    matches.push('Encouragement structure');
  } else {
    console.log('  ✗ Structure DIFFERS');
    issues.push('Encouragement structure differs');
  }
}

// ============================================================================
// SECTION 6: SEED STRUCTURE
// ============================================================================
console.log('\n' + '=' .repeat(60));
console.log('SECTION 6: SEED STRUCTURE');
console.log('=' .repeat(60));

const refSeeds = refSlice.seeds || [];
const newSeeds = newSlice.seeds || [];

console.log(`\nSeeds count:`);
console.log(`  Reference: ${refSeeds.length}`);
console.log(`  New:       ${newSeeds.length}`);

if (refSeeds.length > 0 && newSeeds.length > 0) {
  const refSeed = refSeeds[0];
  const newSeed = newSeeds[0];

  const refSeedKeys = Object.keys(refSeed).sort();
  const newSeedKeys = Object.keys(newSeed).sort();

  console.log(`\nSeed keys:`);
  console.log(`  Reference: ${refSeedKeys.join(', ')}`);
  console.log(`  New:       ${newSeedKeys.join(', ')}`);

  if (JSON.stringify(refSeedKeys) === JSON.stringify(newSeedKeys)) {
    console.log('  ✓ Seed keys match');
    matches.push('Seed keys');
  } else {
    console.log('  ✗ Seed keys DIFFER');
    issues.push('Seed keys differ');
  }

  // Check seed_sentence structure
  console.log(`\nseed_sentence structure:`);
  console.log(`  Reference: ${JSON.stringify(refSeed.seed_sentence)}`);
  console.log(`  New:       ${JSON.stringify(newSeed.seed_sentence)}`);

  // Check node structure
  const refNode = refSeed.node || {};
  const newNode = newSeed.node || {};
  const refNodeKeys = Object.keys(refNode).sort();
  const newNodeKeys = Object.keys(newNode).sort();

  console.log(`\nSeed node keys:`);
  console.log(`  Reference: ${refNodeKeys.join(', ')}`);
  console.log(`  New:       ${newNodeKeys.join(', ')}`);

  if (JSON.stringify(refNodeKeys) === JSON.stringify(newNodeKeys)) {
    console.log('  ✓ Node keys match');
    matches.push('Seed node keys');
  } else {
    console.log('  ✗ Node keys DIFFER');
    issues.push('Seed node keys differ');
  }

  // Check known/target structure within node
  if (refNode.known && newNode.known) {
    const refKnownKeys = Object.keys(refNode.known).sort();
    const newKnownKeys = Object.keys(newNode.known).sort();
    console.log(`\nNode known keys:`);
    console.log(`  Reference: ${refKnownKeys.join(', ')}`);
    console.log(`  New:       ${newKnownKeys.join(', ')}`);

    if (JSON.stringify(refKnownKeys) === JSON.stringify(newKnownKeys)) {
      console.log('  ✓ Known keys match');
      matches.push('Node known keys');
    } else {
      console.log('  ✗ Known keys DIFFER');
      issues.push('Node known keys differ');
    }
  }
}

// ============================================================================
// SECTION 7: INTRODUCTION_ITEMS STRUCTURE
// ============================================================================
console.log('\n' + '=' .repeat(60));
console.log('SECTION 7: INTRODUCTION_ITEMS STRUCTURE');
console.log('=' .repeat(60));

if (refSeeds.length > 0 && newSeeds.length > 0) {
  const refIntroItems = refSeeds[0].introduction_items || [];
  const newIntroItems = newSeeds[0].introduction_items || [];

  console.log(`\nintroduction_items count (first seed):`);
  console.log(`  Reference: ${refIntroItems.length}`);
  console.log(`  New:       ${newIntroItems.length}`);

  if (refIntroItems.length > 0 && newIntroItems.length > 0) {
    const refItem = refIntroItems[0];
    const newItem = newIntroItems[0];

    const refItemKeys = Object.keys(refItem).sort();
    const newItemKeys = Object.keys(newItem).sort();

    console.log(`\nintroduction_item keys:`);
    console.log(`  Reference: ${refItemKeys.join(', ')}`);
    console.log(`  New:       ${newItemKeys.join(', ')}`);

    if (JSON.stringify(refItemKeys) === JSON.stringify(newItemKeys)) {
      console.log('  ✓ Introduction item keys match');
      matches.push('Introduction item keys');
    } else {
      console.log('  ✗ Introduction item keys DIFFER');
      issues.push('Introduction item keys differ');
    }

    console.log(`\nSample introduction_item:`);
    console.log(`  Reference presentation: "${refItem.presentation?.substring(0, 60)}..."`);
    console.log(`  New presentation:       "${newItem.presentation?.substring(0, 60)}..."`);

    // Check nodes array
    const refNodes = refItem.nodes || [];
    const newNodes = newItem.nodes || [];
    console.log(`\nNodes in first intro_item:`);
    console.log(`  Reference: ${refNodes.length}`);
    console.log(`  New:       ${newNodes.length}`);
  }
}

// ============================================================================
// SECTION 8: SAMPLES STRUCTURE
// ============================================================================
console.log('\n' + '=' .repeat(60));
console.log('SECTION 8: SAMPLES STRUCTURE');
console.log('=' .repeat(60));

const refSamples = refSlice.samples || {};
const newSamples = newSlice.samples || {};

console.log(`\nUnique sample texts:`);
console.log(`  Reference: ${Object.keys(refSamples).length}`);
console.log(`  New:       ${Object.keys(newSamples).length}`);

// Count by role
function countRoles(samples) {
  const counts = {};
  Object.values(samples).forEach(entries => {
    entries.forEach(e => {
      counts[e.role] = (counts[e.role] || 0) + 1;
    });
  });
  return counts;
}

const refRoles = countRoles(refSamples);
const newRoles = countRoles(newSamples);

console.log(`\nSample counts by role:`);
console.log(`  Reference:`);
Object.entries(refRoles).sort().forEach(([role, count]) => {
  console.log(`    ${role}: ${count}`);
});
console.log(`  New:`);
Object.entries(newRoles).sort().forEach(([role, count]) => {
  console.log(`    ${role}: ${count}`);
});

// Check role types match
const refRoleTypes = Object.keys(refRoles).sort();
const newRoleTypes = Object.keys(newRoles).sort();

if (JSON.stringify(refRoleTypes) === JSON.stringify(newRoleTypes)) {
  console.log('\n✓ Sample role types match');
  matches.push('Sample role types');
} else {
  console.log('\n✗ Sample role types DIFFER');
  console.log(`  Reference: ${refRoleTypes.join(', ')}`);
  console.log(`  New:       ${newRoleTypes.join(', ')}`);
  issues.push('Sample role types differ');
}

// Check sample entry structure
const refSampleEntry = Object.values(refSamples)[0]?.[0];
const newSampleEntry = Object.values(newSamples)[0]?.[0];

if (refSampleEntry && newSampleEntry) {
  const refEntryKeys = Object.keys(refSampleEntry).sort();
  const newEntryKeys = Object.keys(newSampleEntry).sort();

  console.log(`\nSample entry keys:`);
  console.log(`  Reference: ${refEntryKeys.join(', ')}`);
  console.log(`  New:       ${newEntryKeys.join(', ')}`);

  if (JSON.stringify(refEntryKeys) === JSON.stringify(newEntryKeys)) {
    console.log('  ✓ Sample entry keys match');
    matches.push('Sample entry keys');
  } else {
    console.log('  ✗ Sample entry keys DIFFER');
    issues.push('Sample entry keys differ');
  }
}

// Check target samples have both target1 and target2
console.log(`\nTarget sample structure check:`);
let hasTarget1And2 = false;
for (const [text, entries] of Object.entries(newSamples)) {
  const roles = entries.map(e => e.role);
  if (roles.includes('target1') && roles.includes('target2')) {
    hasTarget1And2 = true;
    console.log(`  ✓ Found target text with both target1 and target2`);
    console.log(`    Text: "${text.substring(0, 50)}..."`);
    break;
  }
}
if (!hasTarget1And2) {
  console.log(`  ✗ No target text found with both target1 and target2`);
  issues.push('Target samples missing dual roles');
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '=' .repeat(60));
console.log('SUMMARY');
console.log('=' .repeat(60));

console.log(`\n✓ Matches: ${matches.length}`);
matches.forEach(m => console.log(`  - ${m}`));

console.log(`\n✗ Issues: ${issues.length}`);
if (issues.length === 0) {
  console.log('  None - manifests are structurally compatible!');
} else {
  issues.forEach(i => console.log(`  - ${i}`));
}

console.log('\n');
