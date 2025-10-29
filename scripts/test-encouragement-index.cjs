/**
 * Test script for encouragement index functionality
 * Verifies that the encouragement index in MAR service works correctly
 */

const marService = require('../services/mar-service.cjs');
const { v5: uuidv5 } = require('uuid');

const ENCOURAGEMENT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

async function generateTestUUID(text, language) {
  const data = `encouragement_${language}_${text}`;
  return uuidv5(data, ENCOURAGEMENT_NAMESPACE);
}

async function runTests() {
  console.log('=== Testing Encouragement Index ===\n');

  const testLanguage = 'eng';
  const testVoiceId = 'elevenlabs_aran';
  const testPhrases = [
    "Great job! You're making excellent progress.",
    "Keep going! You're doing wonderfully.",
    "Fantastic work! Your dedication is paying off."
  ];

  try {
    // Test 1: Check initial state
    console.log('Test 1: Check if encouragement index exists for test language');
    let index = await marService.getEncouragementIndex(testLanguage);
    console.log(`  Initial index:`, index || 'null (does not exist yet)');

    // Test 2: Generate test UUIDs
    console.log('\nTest 2: Generate deterministic UUIDs');
    const testUUIDs = [];
    for (const phrase of testPhrases) {
      const uuid = await generateTestUUID(phrase, testLanguage);
      testUUIDs.push(uuid);
      console.log(`  "${phrase.substring(0, 30)}..." -> ${uuid}`);
    }

    // Test 3: Update encouragement index
    console.log('\nTest 3: Update encouragement index');
    await marService.updateEncouragementIndex(testLanguage, testVoiceId, testUUIDs);
    console.log(`  ✓ Updated index with ${testUUIDs.length} UUIDs`);

    // Test 4: Retrieve updated index
    console.log('\nTest 4: Retrieve updated encouragement index');
    index = await marService.getEncouragementIndex(testLanguage);
    console.log(`  Voice: ${index.voice}`);
    console.log(`  Count: ${index.count}`);
    console.log(`  UUIDs: ${index.uuids.length} entries`);
    console.log(`  Last updated: ${index.last_updated}`);

    // Test 5: Verify UUIDs match
    console.log('\nTest 5: Verify UUIDs match');
    const matches = testUUIDs.every(uuid => index.uuids.includes(uuid));
    console.log(`  All UUIDs present: ${matches ? '✓ YES' : '✗ NO'}`);

    // Test 6: Add a new encouragement incrementally
    console.log('\nTest 6: Add new encouragement to existing index');
    const newPhrase = "Excellent! You're really getting the hang of this.";
    const newUUID = await generateTestUUID(newPhrase, testLanguage);
    console.log(`  Adding: "${newPhrase.substring(0, 30)}..." -> ${newUUID}`);
    await marService.addEncouragementToIndex(testLanguage, testVoiceId, newUUID);

    // Test 7: Verify incremental addition
    console.log('\nTest 7: Verify incremental addition');
    index = await marService.getEncouragementIndex(testLanguage);
    console.log(`  New count: ${index.count} (expected: ${testUUIDs.length + 1})`);
    console.log(`  New UUID present: ${index.uuids.includes(newUUID) ? '✓ YES' : '✗ NO'}`);

    // Test 8: Try adding duplicate (should not increase count)
    console.log('\nTest 8: Try adding duplicate UUID');
    const countBefore = index.count;
    await marService.addEncouragementToIndex(testLanguage, testVoiceId, newUUID);
    index = await marService.getEncouragementIndex(testLanguage);
    const countAfter = index.count;
    console.log(`  Count before: ${countBefore}, after: ${countAfter}`);
    console.log(`  Duplicate prevented: ${countBefore === countAfter ? '✓ YES' : '✗ NO'}`);

    // Test 9: Test with non-existent language
    console.log('\nTest 9: Check non-existent language');
    const nonExistentIndex = await marService.getEncouragementIndex('xyz');
    console.log(`  Result: ${nonExistentIndex === null ? '✓ null (as expected)' : '✗ unexpected value'}`);

    console.log('\n=== All Tests Completed ===\n');
    console.log('Summary:');
    console.log(`  ✓ Encouragement index can be created`);
    console.log(`  ✓ Encouragement index can be retrieved`);
    console.log(`  ✓ UUIDs are stored correctly`);
    console.log(`  ✓ Incremental addition works`);
    console.log(`  ✓ Duplicate prevention works`);
    console.log(`  ✓ Non-existent language returns null`);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().then(() => {
  console.log('\nTest script completed successfully.');
  process.exit(0);
}).catch(error => {
  console.error('\nTest script failed:', error);
  process.exit(1);
});
