# S3 Course Sync Script

Sync course files from local `vfs/courses/` directory to AWS S3 with automatic versioning and backup.

## Features

- **Automatic Versioning**: Increments semantic version (1.0.0 → 1.0.1)
- **Backup Management**: Backs up previous version before uploading
- **Change Detection**: Only uploads if files have changed (can override with `--force`)
- **Partial Uploads**: Upload only baskets with `--baskets-only` flag
- **Progress Logging**: Colored terminal output with detailed progress
- **Error Handling**: Comprehensive error messages and validation

## Installation

The required dependency is already added. Just install it:

```bash
npm install
```

## Configuration

### Environment Variables

Create a `.env` file or export these variables:

```bash
# Required
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"

# Optional (with defaults)
export AWS_REGION="us-east-1"          # Default: us-east-1
export S3_BUCKET="ssi-courses"         # Default: ssi-courses
```

Or copy the example file:

```bash
cp .env.s3.example .env
# Edit .env with your credentials
source .env
```

## Usage

### Basic Usage

```bash
node scripts/sync-course-to-s3.cjs <courseCode>
```

### Examples

**Sync all course files:**
```bash
node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds
```

**Sync only baskets:**
```bash
node scripts/sync-course-to-s3.cjs ita_for_eng_10seeds --baskets-only
```

**Force upload even if no changes detected:**
```bash
node scripts/sync-course-to-s3.cjs cmn_for_eng_30seeds --force
```

**Combine flags:**
```bash
node scripts/sync-course-to-s3.cjs ita_for_eng_30seeds --baskets-only --force
```

## S3 Bucket Structure

```
s3://ssi-courses/
└── {courseCode}/
    ├── seed_pairs.json           # Latest version
    ├── lego_pairs.json           # Latest version
    ├── lego_baskets.json         # Latest version
    ├── course_metadata.json      # Version info and file hashes
    ├── v1.0.0/                   # Backup of version 1.0.0
    │   ├── seed_pairs.json
    │   ├── lego_pairs.json
    │   ├── lego_baskets.json
    │   └── course_metadata.json
    ├── v1.0.1/                   # Backup of version 1.0.1
    │   └── ...
    └── v1.0.2/                   # Backup of version 1.0.2
        └── ...
```

## Workflow

The script performs these steps:

1. **Verify Local Files**: Checks that required files exist in `vfs/courses/{courseCode}/`
2. **Fetch Current Version**: Downloads existing `course_metadata.json` from S3
3. **Check for Changes**: Compares file hashes to detect changes
4. **Backup Current Version**: Copies current files to versioned folder (e.g., `v1.0.0/`)
5. **Upload Files**: Uploads changed files to S3
6. **Upload Metadata**: Creates and uploads new metadata with incremented version
7. **Print Summary**: Shows detailed summary of the sync operation

## Metadata Format

The `course_metadata.json` file contains:

```json
{
  "version": "1.0.2",
  "courseCode": "spa_for_eng_30seeds",
  "updatedAt": "2025-11-06T12:34:56.789Z",
  "updatedBy": "username",
  "files": {
    "seed_pairs.json": {
      "size": 12345,
      "hash": "a1b2c3d4...",
      "lastModified": "2025-11-06T12:30:00.000Z"
    },
    "lego_pairs.json": {
      "size": 23456,
      "hash": "e5f6g7h8...",
      "lastModified": "2025-11-06T12:30:00.000Z"
    },
    "lego_baskets.json": {
      "size": 34567,
      "hash": "i9j0k1l2...",
      "lastModified": "2025-11-06T12:30:00.000Z"
    }
  },
  "uploadInfo": {
    "basketsOnly": false,
    "forced": false
  }
}
```

## Flags

### `--baskets-only`

Upload only `lego_baskets.json` instead of all course files.

**Use case**: When you've only updated the baskets and want to avoid uploading all files.

```bash
node scripts/sync-course-to-s3.cjs ita_for_eng_10seeds --baskets-only
```

### `--force`

Force upload even if no changes are detected.

**Use cases**:
- Overwrite S3 files that may have been corrupted
- Re-sync after S3 bucket was cleared
- Ensure latest local version is on S3

```bash
node scripts/sync-course-to-s3.cjs cmn_for_eng_30seeds --force
```

## Troubleshooting

### "Course code is required"

**Problem**: No course code provided.

**Solution**:
```bash
# Wrong
node scripts/sync-course-to-s3.cjs --force

# Correct
node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds --force
```

### "AWS credentials not found"

**Problem**: AWS environment variables not set.

**Solution**:
```bash
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
```

### "Course directory not found"

**Problem**: The course doesn't exist in `vfs/courses/`.

**Solution**: Verify the course code is correct:
```bash
ls vfs/courses/
```

### "Some required files are missing"

**Problem**: Expected files (seed_pairs.json, lego_pairs.json, lego_baskets.json) not found.

**Solution**: Either create the missing files or use `--force` to upload available files:
```bash
node scripts/sync-course-to-s3.cjs courseCode --force
```

### "No changes detected"

**Problem**: Files haven't changed since last upload.

**Solution**: This is normal. If you need to re-upload anyway, use `--force`:
```bash
node scripts/sync-course-to-s3.cjs courseCode --force
```

## Example Output

```
🚀 SSI Course S3 Sync Tool

══════════════════════════════════════════════════
  Syncing Course: ita_for_eng_10seeds
══════════════════════════════════════════════════

[1/7] Verifying local files...
✓ Found 3 file(s) to upload
  - seed_pairs.json (0.99 KB)
  - lego_pairs.json (4.85 KB)
  - lego_baskets.json (94.01 KB)

[2/7] Fetching current version from S3...
✓ Current version: 1.0.0
  Current files:
    - seed_pairs.json (1011 bytes, hash: a1b2c3d4...)
    - lego_pairs.json (4962 bytes, hash: e5f6g7h8...)
    - lego_baskets.json (96264 bytes, hash: i9j0k1l2...)

[3/7] Checking for changes...
  ✓ seed_pairs.json - Changed
  - lego_pairs.json - No changes
  ✓ lego_baskets.json - Changed
✓ 2 file(s) changed

[4/7] Backing up version 1.0.0...
  ✓ Backed up seed_pairs.json
  ✓ Backed up lego_pairs.json
  ✓ Backed up lego_baskets.json
  ✓ Backed up course_metadata.json
✓ Backed up 4 file(s) to ita_for_eng_10seeds/v1.0.0/

✓ New version: 1.0.1

[5/7] Uploading 3 file(s)...
  ✓ Uploaded seed_pairs.json (0.99 KB)
  ✓ Uploaded lego_pairs.json (4.85 KB)
  ✓ Uploaded lego_baskets.json (94.01 KB)
✓ Uploaded 3 file(s)

[6/7] Uploading metadata...
✓ Metadata uploaded (version 1.0.1)

[7/7] Upload complete!

═══════════════════════════════════════════════
  SYNC SUMMARY
═══════════════════════════════════════════════

  Course:         ita_for_eng_10seeds
  Bucket:         s3://ssi-courses/ita_for_eng_10seeds/
  Version:        1.0.0 → 1.0.1
  Files uploaded: 3
  Backup:         ita_for_eng_10seeds/v1.0.0/

  Uploaded files:
    • seed_pairs.json (0.99 KB)
    • lego_pairs.json (4.85 KB)
    • lego_baskets.json (94.01 KB)

═══════════════════════════════════════════════
```

## Advanced Usage

### Programmatic Usage

You can also use the script as a module:

```javascript
const { CourseFileSyncer } = require('./scripts/sync-course-to-s3.cjs');

async function syncCourse() {
  const syncer = new CourseFileSyncer('spa_for_eng_30seeds', {
    basketsOnly: false,
    force: false
  });

  await syncer.sync();
}

syncCourse();
```

### CI/CD Integration

```yaml
# .github/workflows/sync-course.yml
name: Sync Course to S3

on:
  push:
    paths:
      - 'vfs/courses/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - name: Sync to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds
```

## Security Notes

- Never commit AWS credentials to git
- Use `.env` files (which should be in `.gitignore`)
- Consider using AWS IAM roles instead of access keys in production
- The script only requires S3 permissions: `s3:GetObject`, `s3:PutObject`, `s3:ListBucket`, `s3:CopyObject`

## Version Numbering

The script uses semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Manual changes only (breaking changes to course structure)
- **MINOR**: Manual changes only (new features, non-breaking)
- **PATCH**: Automatically incremented by this script (bug fixes, content updates)

Currently, the script only increments PATCH version. To change MAJOR or MINOR version, manually edit the `course_metadata.json` in S3.
