# Quick Start: S3 Course Sync

## Setup (One-time)

1. **Set AWS credentials:**
```bash
export AWS_ACCESS_KEY_ID="your_key_here"
export AWS_SECRET_ACCESS_KEY="your_secret_here"
export AWS_REGION="us-east-1"  # Optional
export S3_BUCKET="ssi-courses"  # Optional
```

Or create a `.env` file:
```bash
cp .env.s3.example .env
# Edit .env with your credentials
source .env
```

2. **Dependencies are already installed** via npm install

## Usage

**Sync all files:**
```bash
node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds
```

**Sync only baskets:**
```bash
node scripts/sync-course-to-s3.cjs ita_for_eng_10seeds --baskets-only
```

**Force upload (even if no changes):**
```bash
node scripts/sync-course-to-s3.cjs cmn_for_eng_30seeds --force
```

## What it does

1. Reads files from `vfs/courses/{courseCode}/`
2. Checks current version on S3
3. Backs up old version to `s3://ssi-courses/{courseCode}/v{version}/`
4. Uploads new files to `s3://ssi-courses/{courseCode}/`
5. Increments version (1.0.0 → 1.0.1)
6. Shows detailed summary

## Files synced

- `seed_pairs.json`
- `lego_pairs.json`
- `lego_baskets.json`
- `course_metadata.json` (auto-generated)

See `sync-course-to-s3.README.md` for full documentation.
