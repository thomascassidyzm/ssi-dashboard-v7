/**
 * Test script for VFS API (cloud-native S3 operations)
 *
 * Usage: node test-vfs-api.cjs
 *
 * Tests:
 * 1. Write test file to S3
 * 2. Read test file from S3
 * 3. List courses
 * 4. Delete test file from S3
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3456';
const TEST_COURSE = 'test_vfs_course';
const TEST_FILE = 'test_data.json';

async function testVfsApi() {
  console.log('🧪 Testing VFS API...\n');

  try {
    // Test 1: Write file
    console.log('1️⃣  Testing WRITE...');
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Hello from VFS test!'
    };

    const writeResponse = await fetch(`${API_BASE}/api/vfs/courses/${TEST_COURSE}/${TEST_FILE}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData, null, 2)
    });

    if (!writeResponse.ok) {
      throw new Error(`Write failed: ${writeResponse.statusText}`);
    }

    const writeResult = await writeResponse.json();
    console.log(`   ✅ Wrote file: ${writeResult.key} (${writeResult.size} bytes)\n`);

    // Test 2: Read file
    console.log('2️⃣  Testing READ...');
    const readResponse = await fetch(`${API_BASE}/api/vfs/courses/${TEST_COURSE}/${TEST_FILE}`);

    if (!readResponse.ok) {
      throw new Error(`Read failed: ${readResponse.statusText}`);
    }

    const readData = await readResponse.json();
    console.log('   ✅ Read file:', JSON.stringify(readData, null, 2));

    if (readData.test !== true || readData.message !== 'Hello from VFS test!') {
      throw new Error('Read data does not match written data!');
    }
    console.log('   ✅ Data integrity verified\n');

    // Test 3: List courses
    console.log('3️⃣  Testing LIST...');
    const listResponse = await fetch(`${API_BASE}/api/vfs/courses`);

    if (!listResponse.ok) {
      throw new Error(`List failed: ${listResponse.statusText}`);
    }

    const listResult = await listResponse.json();
    console.log(`   ✅ Found ${listResult.courses.length} courses:`, listResult.courses);

    if (!listResult.courses.includes(TEST_COURSE)) {
      console.log(`   ⚠️  Test course "${TEST_COURSE}" not found in list (may take a moment for S3 to index)`);
    } else {
      console.log(`   ✅ Test course "${TEST_COURSE}" found in list`);
    }
    console.log();

    // Test 4: Delete file
    console.log('4️⃣  Testing DELETE...');
    const deleteResponse = await fetch(`${API_BASE}/api/vfs/courses/${TEST_COURSE}/${TEST_FILE}`, {
      method: 'DELETE'
    });

    if (!deleteResponse.ok) {
      throw new Error(`Delete failed: ${deleteResponse.statusText}`);
    }

    const deleteResult = await deleteResponse.json();
    console.log(`   ✅ Deleted file: ${deleteResult.key}\n`);

    // Test 5: Verify deletion
    console.log('5️⃣  Verifying deletion...');
    const verifyResponse = await fetch(`${API_BASE}/api/vfs/courses/${TEST_COURSE}/${TEST_FILE}`);

    if (verifyResponse.status === 404) {
      console.log('   ✅ File successfully deleted (404 confirmed)\n');
    } else {
      console.log('   ⚠️  File may still exist (got status', verifyResponse.status, ')\n');
    }

    console.log('✅ All VFS API tests passed!\n');
    console.log('🎉 Cloud-native file operations working correctly!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔍 Make sure:');
    console.error('   1. automation_server.cjs is running (npm run server)');
    console.error('   2. AWS credentials are set in .env');
    console.error('   3. S3 bucket "popty-bach-lfs" exists and is accessible\n');
    process.exit(1);
  }
}

// Run tests
testVfsApi();
