require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

const bucket = process.env.S3_BUCKET || 'popty-bach-lfs';
const coursesDir = path.join(__dirname, 'vfs', 'courses');

async function uploadCourse(courseCode) {
  const coursePath = path.join(coursesDir, courseCode);

  // Check if seed_pairs.json and lego_pairs.json exist (required files)
  const seedPairsPath = path.join(coursePath, 'seed_pairs.json');
  const legoPairsPath = path.join(coursePath, 'lego_pairs.json');

  if (!await fs.pathExists(seedPairsPath) || !await fs.pathExists(legoPairsPath)) {
    console.log(`   ⚠️  Skipping ${courseCode} - missing seed_pairs.json or lego_pairs.json`);
    return { skipped: true };
  }

  console.log(`\n📦 Uploading ${courseCode}...`);

  // Find all JSON files in the course directory
  const pattern = path.join(coursePath, '**', '*.json');
  const files = glob.sync(pattern);

  let uploaded = 0;
  let failed = 0;

  for (const filePath of files) {
    const relativePath = path.relative(coursesDir, filePath);
    const s3Key = `courses/${relativePath.replace(/\\/g, '/')}`;

    try {
      const content = await fs.readFile(filePath, 'utf8');

      await s3.putObject({
        Bucket: bucket,
        Key: s3Key,
        Body: content,
        ContentType: 'application/json',
        // Make it publicly readable for CORS (optional)
        // ACL: 'public-read'
      }).promise();

      uploaded++;
      process.stdout.write(`   ✅ ${uploaded} files uploaded\r`);
    } catch (error) {
      failed++;
      console.error(`\n   ❌ Failed to upload ${relativePath}: ${error.message}`);
    }
  }

  console.log(`\n   ✅ Completed ${courseCode}: ${uploaded} files uploaded${failed > 0 ? `, ${failed} failed` : ''}`);
  return { uploaded, failed };
}

async function main() {
  console.log('🚀 SSi Course Upload to S3\n');
  console.log(`Bucket: ${bucket}`);
  console.log(`Region: ${process.env.AWS_REGION || 'eu-west-1'}`);
  console.log(`Source: ${coursesDir}\n`);

  // Get all course directories
  const entries = await fs.readdir(coursesDir);
  const courseCodes = [];

  for (const entry of entries) {
    const entryPath = path.join(coursesDir, entry);
    const stat = await fs.stat(entryPath);
    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
      courseCodes.push(entry);
    }
  }

  console.log(`Found ${courseCodes.length} course directories:\n`);
  courseCodes.forEach(code => console.log(`  - ${code}`));

  console.log('\n' + '='.repeat(60));

  let totalUploaded = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const courseCode of courseCodes) {
    try {
      const result = await uploadCourse(courseCode);
      if (result.skipped) {
        totalSkipped++;
      } else {
        totalUploaded += result.uploaded;
        totalFailed += result.failed;
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${courseCode}:`, error.message);
      totalFailed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Upload Summary:');
  console.log(`   ✅ Total files uploaded: ${totalUploaded}`);
  console.log(`   ❌ Total failures: ${totalFailed}`);
  console.log(`   ⚠️  Courses skipped: ${totalSkipped}`);
  console.log(`   📁 Courses processed: ${courseCodes.length - totalSkipped}`);

  if (totalFailed === 0) {
    console.log('\n✅ All courses successfully uploaded to S3!');
    console.log('\n💡 Next steps:');
    console.log('   1. Courses are now in S3 at: s3://' + bucket + '/courses/');
    console.log('   2. API server will serve from S3: http://localhost:3456/api/vfs/courses');
    console.log('   3. Deploy to Vercel - it will use S3 as fallback');
  } else {
    console.log('\n⚠️  Some uploads failed. Please review errors above.');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
