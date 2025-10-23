require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

const bucket = process.env.S3_BUCKET || 'popty-bach-lfs';

async function testS3() {
  console.log('🧪 Testing S3 Connection...\n');
  console.log(`Bucket: ${bucket}`);
  console.log(`Region: ${process.env.AWS_REGION || 'eu-west-1'}`);
  console.log(`Access Key: ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 8)}...`);
  console.log();

  try {
    // Test 1: List objects in courses/ prefix (verifies bucket exists and credentials work)
    console.log('1️⃣  Listing existing courses (verifies bucket access)...');
    const objects = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: 'courses/',
      Delimiter: '/'
    }).promise();
    
    if (objects.CommonPrefixes && objects.CommonPrefixes.length > 0) {
      console.log(`   ✅ Found ${objects.CommonPrefixes.length} courses:`);
      objects.CommonPrefixes.forEach(p => {
        const courseName = p.Prefix.replace('courses/', '').replace('/', '');
        console.log(`      - ${courseName}`);
      });
    } else {
      console.log(`   📁 No courses found yet (bucket is empty or no courses/ prefix)`);
    }
    console.log();

    // Test 2: Write a test file
    console.log('2️⃣  Testing WRITE permission...');
    const testKey = 'courses/test_connection/test.json';
    const testContent = JSON.stringify({
      test: true,
      timestamp: new Date().toISOString(),
      message: 'S3 connection test successful!'
    }, null, 2);

    await s3.putObject({
      Bucket: bucket,
      Key: testKey,
      Body: testContent,
      ContentType: 'application/json',
      ACL: 'private'
    }).promise();
    console.log(`   ✅ Successfully wrote: ${testKey}`);
    console.log();

    // Test 3: Read the test file back
    console.log('3️⃣  Testing READ permission...');
    const readObj = await s3.getObject({
      Bucket: bucket,
      Key: testKey
    }).promise();
    const readContent = readObj.Body.toString('utf8');
    const parsed = JSON.parse(readContent);
    console.log(`   ✅ Successfully read: ${testKey}`);
    console.log(`   📄 Content: ${parsed.message}`);
    console.log();

    // Test 4: Delete the test file
    console.log('4️⃣  Testing DELETE permission...');
    await s3.deleteObject({
      Bucket: bucket,
      Key: testKey
    }).promise();
    console.log(`   ✅ Successfully deleted: ${testKey}`);
    console.log();

    console.log('✅ All S3 tests passed! Ready for VFS auto-sync.');

  } catch (error) {
    console.error('\n❌ S3 Test Failed:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. Invalid AWS credentials');
    console.error('  2. Bucket does not exist');
    console.error('  3. Insufficient permissions (needs s3:ListBucket, s3:GetObject, s3:PutObject, s3:DeleteObject)');
    console.error('  4. Wrong region specified');
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testS3();
