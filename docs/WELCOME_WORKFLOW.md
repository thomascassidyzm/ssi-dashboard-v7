# Welcome Audio Workflow

This document explains how welcome audio files are managed in the system.

## Architecture Overview

Welcomes use a **two-tier storage system**:

1. **Canonical Storage (LFS)** - Source of truth for team sync
   - Location: `s3://popty-bach-lfs/canonical/welcomes/`
   - Contains: Raw WAV files and `welcomes.json` registry
   - Purpose: Team collaboration and version control

2. **Course Audio Storage** - Runtime audio for courses
   - Location: `s3://ssi-audio-stage/mastered/` or `s3://ssiborg-assets/mastered/`
   - Contains: Processed MP3 files with UUID filenames
   - Purpose: Course playback (referenced in manifests)

## The Welcome Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CANONICAL STORAGE (LFS)                       │
│                                                                   │
│  s3://popty-bach-lfs/canonical/                                  │
│  ├── welcomes.json          (registry with text & metadata)      │
│  └── welcomes/                                                   │
│      ├── ita.wav            (raw audio files)                    │
│      ├── spa.wav                                                 │
│      └── ...                                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑ sync
┌─────────────────────────────────────────────────────────────────┐
│                      LOCAL DEVELOPMENT                           │
│                                                                   │
│  vfs/canonical/welcomes.json      (synced from LFS)              │
│  extracted-welcomes/welcome_*.wav (synced from LFS)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Phase 7 & 8
┌─────────────────────────────────────────────────────────────────┐
│                    COURSE AUDIO STORAGE                          │
│                                                                   │
│  s3://ssi-audio-stage/mastered/{uuid}.mp3                        │
│  (processed, normalized, ready for playback)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow Steps

### 1. Recording/Obtaining Welcome Audio

When you have a new pre-recorded welcome:

```bash
# 1. Save the audio file
cp ~/Downloads/new-welcome.wav extracted-welcomes/welcome_fra.wav

# 2. Extract individual clips if from a long recording
node scripts/extract-welcome-clips.cjs

# 3. Update vfs/canonical/welcomes.json with:
#    - Welcome text
#    - UUID (generate a new one)
#    - Voice (e.g., "Aran")
#    - Duration (from audio file)
#    - Generated date
```

### 2. Syncing with Team (Upload to LFS)

After adding or updating welcomes locally:

```bash
# Upload everything to LFS
node scripts/sync-welcomes-to-lfs.cjs

# Or upload specific parts
node scripts/sync-welcomes-to-lfs.cjs --upload-audio     # Just WAV files
node scripts/sync-welcomes-to-lfs.cjs --upload-registry  # Just welcomes.json
```

This makes your changes available to the team.

### 3. Syncing with Team (Download from LFS)

When joining the project or syncing with latest welcomes:

```bash
# Download everything from LFS
node scripts/sync-welcomes-to-lfs.cjs --download
```

This downloads:
- `vfs/canonical/welcomes.json`
- All `extracted-welcomes/welcome_*.wav` files

### 4. Using Welcomes in Courses

**Phase 7** (Manifest Compilation):
```bash
node scripts/phase7-compile-manifest.cjs ita_for_eng_10seeds
```

Phase 7:
- Reads `vfs/canonical/welcomes.json`
- Finds the welcome for `ita_for_eng_10seeds`
- Includes UUID and metadata in the compiled manifest
- Does NOT process or upload audio

**Phase 8** (Audio Generation):
```bash
node scripts/phase8-audio-generation.cjs ita_for_eng_10seeds
```

Phase 8:
- Checks if welcome UUID exists in course audio bucket
- If YES: Uses existing, updates manifest with duration
- If NO: Processes local WAV → MP3 → Uploads to course bucket

### 5. Workflow for New Pre-recorded Welcome

Complete example for adding French welcome:

```bash
# 1. Have your WAV file ready
ls extracted-welcomes/welcome_fra.wav
# ✓ extracted-welcomes/welcome_fra.wav

# 2. Edit vfs/canonical/welcomes.json
# Add entry for fra_for_eng:
# {
#   "text": "Welcome to this unusual game...",
#   "id": "A1B2C3D4-...",
#   "generated_date": "2025-03-07T12:00:00.000Z",
#   "voice": "Aran",
#   "duration": 45.123
# }

# 3. Upload to LFS (share with team)
node scripts/sync-welcomes-to-lfs.cjs

# 4. Run Phase 7 (manifest compilation)
node scripts/phase7-compile-manifest.cjs fra_for_eng

# 5. Run Phase 8 (audio processing & upload to course bucket)
node scripts/phase8-audio-generation.cjs fra_for_eng --phase=presentations

# Done! The welcome is now:
# - In LFS (canonical storage)
# - In course bucket (processed for playback)
# - Referenced in course manifest
```

## Key Differences: LFS vs Course Buckets

### LFS Bucket (`popty-bach-lfs`)
- **File format:** WAV (unprocessed, high quality)
- **File names:** Semantic (`ita.wav`, `spa.wav`)
- **Purpose:** Team collaboration, source control
- **When to use:** Sharing new/updated pre-recorded welcomes
- **Who accesses:** Developers, content creators

### Course Buckets (`ssi-audio-stage`, `ssiborg-assets`)
- **File format:** MP3 (processed, normalized)
- **File names:** UUIDs (`8E130B02-C468-4395-9D1B-D082E67F2CCB.mp3`)
- **Purpose:** Course playback, runtime audio
- **When to use:** Automatically by Phase 8
- **Who accesses:** Course player app, end users

## Important Notes

### Don't Mix Buckets!

❌ **WRONG:**
```bash
# Don't upload welcome WAV files to course buckets
aws s3 cp welcome_ita.wav s3://ssi-audio-stage/mastered/welcome_ita.wav
```

✅ **CORRECT:**
```bash
# Upload to LFS
node scripts/sync-welcomes-to-lfs.cjs --upload-audio

# Let Phase 8 handle course bucket uploads
node scripts/phase8-audio-generation.cjs ita_for_eng_10seeds
```

### Local Files are Synced Copies

The files in `extracted-welcomes/` and `vfs/canonical/welcomes.json` are **synced copies** of the canonical data in LFS. Think of LFS as your "git remote" for large files.

### UUIDs are Stable

Once a welcome has a UUID in `welcomes.json`, it should stay the same. This ensures:
- Course manifests reference the correct audio
- Updates don't break existing courses
- Team members stay in sync

## Troubleshooting

### "Welcome not found for course: xxx"

Phase 7 couldn't find a welcome entry. Fix:

```bash
# 1. Check if welcomes.json has entry for your course
cat vfs/canonical/welcomes.json | grep xxx_for_yyy

# 2. If missing, either:
#    a) Add it manually to welcomes.json
#    b) Sync from LFS: node scripts/sync-welcomes-to-lfs.cjs --download
```

### "Welcome audio doesn't exist in S3"

Phase 8 found the registry entry but no audio in course bucket. Fix:

```bash
# 1. Make sure you have the WAV file locally
ls extracted-welcomes/welcome_xxx.wav

# 2. If missing, download from LFS
node scripts/sync-welcomes-to-lfs.cjs --download

# 3. Re-run Phase 8
node scripts/phase8-audio-generation.cjs xxx_for_yyy_10seeds --phase=presentations
```

### "Out of sync with team"

Someone else added/updated welcomes. Sync:

```bash
# Download latest from LFS
node scripts/sync-welcomes-to-lfs.cjs --download
```

## Summary

- **LFS bucket** = Canonical source, team sync, raw WAV files
- **Course buckets** = Processed MP3s for playback, UUID filenames
- **Local files** = Working copies synced with LFS
- **Use sync script** = Keep team in sync
- **Phase 8** = Converts local WAVs → MP3s → Uploads to course bucket
- **Never manually upload welcomes to course buckets** = Always use Phase 8
