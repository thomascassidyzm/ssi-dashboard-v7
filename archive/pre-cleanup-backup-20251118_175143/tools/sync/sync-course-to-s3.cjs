#!/usr/bin/env node

/**
 * Sync Course Files to S3
 *
 * Uploads course files to S3 with versioning and backup support.
 *
 * Usage:
 *   node scripts/sync-course-to-s3.cjs <courseCode> [--baskets-only] [--force]
 *
 * Example:
 *   node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds
 *   node scripts/sync-course-to-s3.cjs ita_for_eng_10seeds --baskets-only
 *   node scripts/sync-course-to-s3.cjs cmn_for_eng_30seeds --force
 *
 * Environment Variables:
 *   AWS_ACCESS_KEY_ID      - AWS access key (required)
 *   AWS_SECRET_ACCESS_KEY  - AWS secret key (required)
 *   AWS_REGION             - AWS region (default: us-east-1)
 *   S3_BUCKET              - S3 bucket name (default: ssi-courses)
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, CopyObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0].startsWith('--')) {
    console.error(`${colors.red}Error: Course code is required${colors.reset}`);
    console.log(`\nUsage: node scripts/sync-course-to-s3.cjs <courseCode> [--baskets-only] [--force]`);
    process.exit(1);
  }

  return {
    courseCode: args[0],
    basketsOnly: args.includes('--baskets-only'),
    force: args.includes('--force')
  };
}

// Log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, colors.cyan);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

// Calculate file hash
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Parse semantic version
function parseVersion(versionString) {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return { major: 1, minor: 0, patch: 0 };
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

// Increment patch version
function incrementVersion(versionString) {
  const version = parseVersion(versionString);
  version.patch += 1;
  return `${version.major}.${version.minor}.${version.patch}`;
}

// S3 Helper Functions
class S3Helper {
  constructor(config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  async getObject(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      const response = await this.client.send(command);
      const str = await response.Body.transformToString();
      return str;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  async putObject(key, body, contentType = 'application/json') {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    });
    await this.client.send(command);
  }

  async copyObject(sourceKey, destKey) {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destKey
    });
    await this.client.send(command);
  }

  async listObjects(prefix) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix
    });
    const response = await this.client.send(command);
    return response.Contents || [];
  }
}

// Course file manager
class CourseFileSyncer {
  constructor(courseCode, options) {
    this.courseCode = courseCode;
    this.options = options;
    this.coursePath = path.join(process.cwd(), 'vfs', 'courses', courseCode);
    this.s3Prefix = `${courseCode}/`;

    // Initialize S3 helper
    const config = {
      bucket: process.env.S3_BUCKET || 'ssi-courses',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };

    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error('AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    }

    this.s3 = new S3Helper(config);
    this.bucket = config.bucket;
  }

  // Get list of files to upload
  getFilesToUpload() {
    if (this.options.basketsOnly) {
      return ['lego_baskets.json'];
    }
    return [
      'seed_pairs.json',
      'lego_pairs.json',
      'lego_baskets.json'
    ];
  }

  // Verify local files exist
  verifyLocalFiles() {
    logStep('1/7', 'Verifying local files...');

    if (!fs.existsSync(this.coursePath)) {
      throw new Error(`Course directory not found: ${this.coursePath}`);
    }

    const files = this.getFilesToUpload();
    const missingFiles = [];
    const existingFiles = [];

    for (const file of files) {
      const filePath = path.join(this.coursePath, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      } else {
        existingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      logWarning(`Missing files: ${missingFiles.join(', ')}`);
      if (!this.options.force) {
        throw new Error('Some required files are missing. Use --force to continue anyway.');
      }
    }

    logSuccess(`Found ${existingFiles.length} file(s) to upload`);
    existingFiles.forEach(file => {
      const filePath = path.join(this.coursePath, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      log(`  - ${file} (${sizeKB} KB)`, colors.gray);
    });

    return existingFiles;
  }

  // Get current version from S3
  async getCurrentMetadata() {
    logStep('2/7', 'Fetching current version from S3...');

    const metadataKey = `${this.s3Prefix}course_metadata.json`;
    const metadataStr = await this.s3.getObject(metadataKey);

    if (!metadataStr) {
      logWarning('No existing metadata found. This will be version 1.0.0');
      return {
        version: '0.0.0',
        isNew: true
      };
    }

    const metadata = JSON.parse(metadataStr);
    logSuccess(`Current version: ${metadata.version}`);

    if (metadata.files) {
      log(`  Current files:`, colors.gray);
      Object.entries(metadata.files).forEach(([file, info]) => {
        log(`    - ${file} (${info.size} bytes, hash: ${info.hash.substring(0, 8)}...)`, colors.gray);
      });
    }

    return {
      version: metadata.version,
      isNew: false,
      metadata
    };
  }

  // Check if files have changed
  checkForChanges(existingFiles, currentMetadata) {
    logStep('3/7', 'Checking for changes...');

    if (currentMetadata.isNew) {
      logSuccess('New course - all files will be uploaded');
      return { hasChanges: true, changedFiles: existingFiles };
    }

    const changedFiles = [];
    const unchangedFiles = [];

    for (const file of existingFiles) {
      const filePath = path.join(this.coursePath, file);
      const currentHash = calculateFileHash(filePath);
      const previousHash = currentMetadata.metadata.files?.[file]?.hash;

      if (currentHash !== previousHash) {
        changedFiles.push(file);
        log(`  ✓ ${file} - Changed`, colors.green);
      } else {
        unchangedFiles.push(file);
        log(`  - ${file} - No changes`, colors.gray);
      }
    }

    if (changedFiles.length === 0 && !this.options.force) {
      logWarning('No changes detected. Use --force to upload anyway.');
      return { hasChanges: false, changedFiles: [] };
    }

    if (this.options.force && changedFiles.length === 0) {
      logWarning('Forcing upload despite no changes');
      return { hasChanges: true, changedFiles: existingFiles };
    }

    logSuccess(`${changedFiles.length} file(s) changed`);
    return { hasChanges: true, changedFiles };
  }

  // Backup current version
  async backupCurrentVersion(currentMetadata) {
    if (currentMetadata.isNew) {
      logStep('4/7', 'Skipping backup (new course)');
      return null;
    }

    logStep('4/7', `Backing up version ${currentMetadata.version}...`);

    const backupPrefix = `${this.s3Prefix}v${currentMetadata.version}/`;
    const files = this.getFilesToUpload();
    files.push('course_metadata.json');

    let backedUpCount = 0;
    for (const file of files) {
      const sourceKey = `${this.s3Prefix}${file}`;
      const destKey = `${backupPrefix}${file}`;

      try {
        await this.s3.copyObject(sourceKey, destKey);
        backedUpCount++;
        log(`  ✓ Backed up ${file}`, colors.gray);
      } catch (error) {
        logWarning(`  Could not backup ${file}: ${error.message}`);
      }
    }

    logSuccess(`Backed up ${backedUpCount} file(s) to ${backupPrefix}`);
    return backupPrefix;
  }

  // Generate new metadata
  generateMetadata(newVersion, files) {
    const metadata = {
      version: newVersion,
      courseCode: this.courseCode,
      updatedAt: new Date().toISOString(),
      updatedBy: process.env.USER || process.env.USERNAME || 'unknown',
      files: {},
      uploadInfo: {
        basketsOnly: this.options.basketsOnly,
        forced: this.options.force
      }
    };

    for (const file of files) {
      const filePath = path.join(this.coursePath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        metadata.files[file] = {
          size: stats.size,
          hash: calculateFileHash(filePath),
          lastModified: stats.mtime.toISOString()
        };
      }
    }

    return metadata;
  }

  // Upload files to S3
  async uploadFiles(files, newMetadata) {
    logStep('5/7', `Uploading ${files.length} file(s)...`);

    let uploadedCount = 0;
    for (const file of files) {
      const filePath = path.join(this.coursePath, file);
      if (!fs.existsSync(filePath)) {
        logWarning(`  Skipping ${file} (not found)`);
        continue;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const s3Key = `${this.s3Prefix}${file}`;

      await this.s3.putObject(s3Key, fileContent, 'application/json');
      uploadedCount++;

      const sizeKB = (newMetadata.files[file].size / 1024).toFixed(2);
      log(`  ✓ Uploaded ${file} (${sizeKB} KB)`, colors.green);
    }

    logSuccess(`Uploaded ${uploadedCount} file(s)`);
    return uploadedCount;
  }

  // Upload metadata
  async uploadMetadata(metadata) {
    logStep('6/7', 'Uploading metadata...');

    const metadataKey = `${this.s3Prefix}course_metadata.json`;
    const metadataContent = JSON.stringify(metadata, null, 2);

    await this.s3.putObject(metadataKey, metadataContent, 'application/json');

    logSuccess(`Metadata uploaded (version ${metadata.version})`);
  }

  // Summary
  printSummary(result) {
    logStep('7/7', 'Upload complete!');

    console.log();
    log('═══════════════════════════════════════════════', colors.bright);
    log('  SYNC SUMMARY', colors.bright);
    log('═══════════════════════════════════════════════', colors.bright);
    console.log();
    log(`  Course:         ${colors.bright}${this.courseCode}${colors.reset}`);
    log(`  Bucket:         ${colors.bright}s3://${this.bucket}/${this.s3Prefix}${colors.reset}`);
    log(`  Version:        ${colors.bright}${result.oldVersion} → ${result.newVersion}${colors.reset}`);
    log(`  Files uploaded: ${colors.bright}${result.uploadedCount}${colors.reset}`);

    if (result.backupPrefix) {
      log(`  Backup:         ${colors.bright}${result.backupPrefix}${colors.reset}`);
    }

    console.log();
    log('  Uploaded files:', colors.cyan);
    result.files.forEach(file => {
      const info = result.metadata.files[file];
      const sizeKB = (info.size / 1024).toFixed(2);
      log(`    • ${file} (${sizeKB} KB)`, colors.gray);
    });

    console.log();
    log('═══════════════════════════════════════════════', colors.bright);
    console.log();
  }

  // Main sync process
  async sync() {
    try {
      log('\n' + '═'.repeat(50), colors.cyan);
      log(`  Syncing Course: ${this.courseCode}`, colors.bright);
      log('═'.repeat(50) + '\n', colors.cyan);

      // Step 1: Verify local files
      const existingFiles = this.verifyLocalFiles();

      // Step 2: Get current version
      const currentMetadata = await this.getCurrentMetadata();

      // Step 3: Check for changes
      const { hasChanges, changedFiles } = this.checkForChanges(existingFiles, currentMetadata);

      if (!hasChanges) {
        log('\nNo sync needed.', colors.yellow);
        return;
      }

      // Step 4: Backup current version
      const backupPrefix = await this.backupCurrentVersion(currentMetadata);

      // Calculate new version
      const newVersion = incrementVersion(currentMetadata.version);
      logSuccess(`New version: ${newVersion}`);

      // Generate new metadata
      const newMetadata = this.generateMetadata(newVersion, existingFiles);

      // Step 5: Upload files
      const uploadedCount = await this.uploadFiles(existingFiles, newMetadata);

      // Step 6: Upload metadata
      await this.uploadMetadata(newMetadata);

      // Step 7: Print summary
      this.printSummary({
        oldVersion: currentMetadata.version,
        newVersion,
        uploadedCount,
        files: existingFiles,
        metadata: newMetadata,
        backupPrefix
      });

    } catch (error) {
      logError(`\nSync failed: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const args = parseArgs();

  log('\n🚀 SSI Course S3 Sync Tool\n', colors.bright);

  const syncer = new CourseFileSyncer(args.courseCode, {
    basketsOnly: args.basketsOnly,
    force: args.force
  });

  await syncer.sync();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { CourseFileSyncer };
