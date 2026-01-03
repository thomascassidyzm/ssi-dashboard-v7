require('dotenv').config();
const { S3Client, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs-extra');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const courseCode = args.find(arg => !arg.startsWith('--'));
const flags = {
  pull: args.includes('--pull'),
  force: args.includes('--force')
};

// Validate arguments
if (!courseCode) {
  console.error('❌ Error: Course code is required');
  console.log('\nUsage:');
  console.log('  node scripts/sync-course-from-s3.cjs <courseCode> [--pull|--force]');
  console.log('\nExamples:');
  console.log('  node scripts/sync-course-from-s3.cjs spa_for_eng_30seeds');
  console.log('  node scripts/sync-course-from-s3.cjs spa_for_eng_30seeds --pull');
  console.log('  node scripts/sync-course-from-s3.cjs spa_for_eng_30seeds --force');
  console.log('\nFlags:');
  console.log('  --pull   Download only if no local changes detected');
  console.log('  --force  Overwrite local files even if modified');
  process.exit(1);
}

if (flags.pull && flags.force) {
  console.error('❌ Error: Cannot use both --pull and --force flags');
  process.exit(1);
}

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const bucket = process.env.S3_BUCKET || 'ssi-audio-stage';
const coursesDir = path.join(__dirname, '..', 'vfs', 'courses');
const courseDir = path.join(coursesDir, courseCode);

// Files to sync from S3
const FILES_TO_SYNC = [
  'seed_pairs.json',
  'lego_pairs.json',
  'lego_baskets.json',
  'course_metadata.json'
];

/**
 * Download a file from S3
 */
async function downloadFromS3(s3Key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key
    });

    const response = await s3Client.send(command);
    const chunks = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString('utf-8');
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return null; // File doesn't exist in S3
    }
    throw error;
  }
}

/**
 * Check if a file exists in S3
 */
async function fileExistsInS3(s3Key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: s3Key
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * List all files in the course directory in S3
 */
async function listS3CourseFiles() {
  const prefix = `courses/${courseCode}/`;
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix
  });

  try {
    const response = await s3Client.send(command);
    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    return response.Contents.map(item => ({
      key: item.Key,
      filename: item.Key.replace(prefix, ''),
      lastModified: item.LastModified,
      size: item.Size
    }));
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Check for local modifications
 */
async function checkLocalModifications() {
  const metadataPath = path.join(courseDir, '.course_metadata.json');

  if (!await fs.pathExists(metadataPath)) {
    return { hasMetadata: false, hasModifications: false };
  }

  try {
    const metadata = await fs.readJson(metadataPath);

    if (!metadata.last_sync) {
      return { hasMetadata: true, hasModifications: false };
    }

    // Check if last_modified is after last_sync
    const lastSync = new Date(metadata.last_sync);
    const lastModified = metadata.last_modified ? new Date(metadata.last_modified) : null;

    const hasModifications = lastModified && lastModified > lastSync;

    return {
      hasMetadata: true,
      hasModifications,
      metadata,
      lastSync,
      lastModified
    };
  } catch (error) {
    console.warn(`⚠️  Warning: Could not read .course_metadata.json: ${error.message}`);
    return { hasMetadata: true, hasModifications: false };
  }
}

/**
 * Compare local and S3 metadata
 */
async function compareMetadata(localMeta, s3Content) {
  if (!localMeta || !s3Content) {
    return { different: false };
  }

  try {
    const s3Meta = JSON.parse(s3Content);

    // Compare important fields
    const localVersion = localMeta.metadata?.version || localMeta.metadata?.last_modified;
    const s3Version = s3Meta.version || s3Meta.last_modified;

    return {
      different: localVersion !== s3Version,
      local: localMeta.metadata,
      s3: s3Meta
    };
  } catch (error) {
    console.warn(`⚠️  Warning: Could not parse S3 metadata: ${error.message}`);
    return { different: false };
  }
}

/**
 * Main sync function
 */
async function syncCourseFromS3() {
  console.log('🔄 SSi Course Sync from S3\n');
  console.log(`Course:  ${courseCode}`);
  console.log(`Bucket:  ${bucket}`);
  console.log(`Region:  ${process.env.AWS_REGION || 'eu-west-1'}`);
  console.log(`Target:  ${courseDir}`);
  console.log(`Mode:    ${flags.force ? 'FORCE' : flags.pull ? 'PULL' : 'NORMAL'}`);
  console.log('\n' + '='.repeat(70));

  // Step 1: Check if course exists in S3
  console.log('\n📡 Step 1: Checking S3 for course files...');
  const s3Files = await listS3CourseFiles();

  if (s3Files.length === 0) {
    console.error(`\n❌ Error: Course "${courseCode}" not found in S3`);
    console.log(`\nSearched in: s3://${bucket}/courses/${courseCode}/`);
    console.log('\nTip: Make sure the course has been uploaded to S3 first.');
    process.exit(1);
  }

  console.log(`✅ Found ${s3Files.length} files in S3:`);
  s3Files.forEach(file => {
    console.log(`   - ${file.filename} (${(file.size / 1024).toFixed(1)} KB)`);
  });

  // Step 2: Check local course directory
  console.log('\n📁 Step 2: Checking local course directory...');
  const courseExists = await fs.pathExists(courseDir);

  if (courseExists) {
    console.log(`✅ Local directory exists: ${courseDir}`);
  } else {
    console.log(`📝 Creating new directory: ${courseDir}`);
    await fs.ensureDir(courseDir);
  }

  // Step 3: Check for local modifications
  console.log('\n🔍 Step 3: Checking for local modifications...');
  const localCheck = await checkLocalModifications();

  if (localCheck.hasMetadata) {
    console.log('✅ Found local .course_metadata.json');

    if (localCheck.hasModifications) {
      console.log(`⚠️  WARNING: Local files have been modified!`);
      console.log(`   Last sync:     ${localCheck.lastSync?.toISOString()}`);
      console.log(`   Last modified: ${localCheck.lastModified?.toISOString()}`);

      if (flags.pull) {
        console.error('\n❌ Error: Cannot pull - local changes detected');
        console.log('\nOptions:');
        console.log('  1. Use --force to overwrite local changes');
        console.log('  2. Manually backup your changes first');
        console.log('  3. Resolve conflicts manually');
        process.exit(1);
      }

      if (!flags.force) {
        console.error('\n❌ Error: Local changes detected and no --force flag');
        console.log('\nOptions:');
        console.log('  1. Use --force to overwrite local changes');
        console.log('  2. Use --pull only if you want to prevent overwriting');
        process.exit(1);
      }

      console.log('⚡ FORCE mode: Will overwrite local changes');
    } else {
      console.log('✅ No local modifications detected');
    }
  } else {
    console.log('📝 No local metadata found (first sync)');
  }

  // Step 4: Download course_metadata.json from S3 (if exists)
  console.log('\n📥 Step 4: Checking S3 course_metadata.json...');
  const metadataS3Key = `courses/${courseCode}/course_metadata.json`;
  const s3MetadataContent = await downloadFromS3(metadataS3Key);

  if (s3MetadataContent) {
    console.log('✅ Found course_metadata.json in S3');

    // Compare with local if exists
    if (localCheck.hasMetadata) {
      const comparison = await compareMetadata(localCheck, s3MetadataContent);
      if (comparison.different) {
        console.log('⚠️  S3 and local metadata differ');
      } else {
        console.log('✅ S3 and local metadata match');
      }
    }
  } else {
    console.log('⚠️  No course_metadata.json found in S3');
  }

  // Step 5: Download files from S3
  console.log('\n📥 Step 5: Downloading files from S3...');
  console.log();

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const downloadedFiles = [];

  for (const filename of FILES_TO_SYNC) {
    const s3Key = `courses/${courseCode}/${filename}`;
    const localPath = path.join(courseDir, filename);

    try {
      process.stdout.write(`   Downloading ${filename}... `);

      const content = await downloadFromS3(s3Key);

      if (content === null) {
        console.log('⏭️  Not found in S3');
        skipped++;
        continue;
      }

      // Validate JSON
      try {
        JSON.parse(content);
      } catch (parseError) {
        console.log('❌ Invalid JSON');
        failed++;
        continue;
      }

      // Write to local file
      await fs.writeFile(localPath, content, 'utf-8');

      const sizeKB = (content.length / 1024).toFixed(1);
      console.log(`✅ ${sizeKB} KB`);

      downloaded++;
      downloadedFiles.push(filename);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      failed++;
    }
  }

  // Step 6: Create/update local .course_metadata.json
  console.log('\n📝 Step 6: Updating local metadata...');

  const now = new Date().toISOString();
  const newMetadata = {
    course_code: courseCode,
    last_sync: now,
    last_modified: null,  // Reset since we just synced
    synced_from_s3: true,
    sync_timestamp: now,
    files_synced: downloadedFiles,
    s3_source: {
      bucket: bucket,
      prefix: `courses/${courseCode}/`,
      region: process.env.AWS_REGION || 'eu-west-1'
    }
  };

  // If we downloaded course_metadata.json, include it
  if (s3MetadataContent) {
    try {
      const parsedMetadata = JSON.parse(s3MetadataContent);
      newMetadata.course_info = parsedMetadata;
    } catch (error) {
      console.warn(`⚠️  Could not parse course_metadata.json: ${error.message}`);
    }
  }

  const metadataPath = path.join(courseDir, '.course_metadata.json');
  await fs.writeJson(metadataPath, newMetadata, { spaces: 2 });

  console.log('✅ Created .course_metadata.json');

  // Step 7: Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Sync Summary:');
  console.log(`   ✅ Files downloaded: ${downloaded}`);
  console.log(`   ⏭️  Files skipped:    ${skipped}`);
  console.log(`   ❌ Files failed:     ${failed}`);
  console.log(`   📁 Target directory: ${courseDir}`);

  if (downloaded > 0) {
    console.log('\n✅ Course successfully synced from S3!');
    console.log('\n📦 Downloaded files:');
    downloadedFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
    console.log(`\n💾 Metadata saved to: ${metadataPath}`);
  } else if (failed > 0) {
    console.log('\n⚠️  Sync completed with errors. Please review above.');
  } else {
    console.log('\n⚠️  No files were downloaded. Course may not exist in S3.');
  }

  if (failed > 0) {
    process.exit(1);
  }
}

// Main execution
syncCourseFromS3().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error('\nFull error:', error);

  if (error.name === 'CredentialsProviderError' || error.message.includes('credentials')) {
    console.error('\n💡 Tip: Check your AWS credentials in .env file:');
    console.error('   - AWS_ACCESS_KEY_ID');
    console.error('   - AWS_SECRET_ACCESS_KEY');
    console.error('   - AWS_REGION (optional, defaults to eu-west-1)');
    console.error('   - S3_BUCKET (optional, defaults to ssi-audio-stage)');
  }

  process.exit(1);
});
