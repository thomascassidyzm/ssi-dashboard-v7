# S3 Bucket Architecture

This document explains how S3 buckets are used in the SSi Dashboard system.

## Bucket Overview

The system uses THREE separate S3 buckets with different purposes:

### 1. Course Audio Buckets (Generated Content)

These buckets store **course-specific audio files** with UUID filenames that are referenced in course manifests.

- **`ssi-audio-stage`** - Development/testing environment
- **`ssiborg-assets`** - Live production environment

**Structure:**
```
s3://ssi-audio-stage/mastered/{uuid}.mp3
s3://ssiborg-assets/mastered/{uuid}.mp3
```

**Contents:**
- Individual lesson presentation audio samples
- Practice phrase audio samples
- Response audio samples
- Encouragement audio samples

**Important:** These are generated per-course and have UUID filenames that are directly referenced in the course manifest JSON files.

### 2. LFS Bucket (Canonical/Structural Files)

This bucket stores **shared canonical resources** that are used across multiple courses.

- **`popty-bach-lfs`** - Large File Storage (like Git LFS)

**Structure:**
```
s3://popty-bach-lfs/canonical/welcomes.json          (registry)
s3://popty-bach-lfs/canonical/welcomes/{lang}.wav    (audio files)
s3://popty-bach-lfs/canonical/encouragements.json    (future)
s3://popty-bach-lfs/canonical/templates/             (future)
```

**Contents:**
- Welcome audio files (shared across all courses for a language pair)
- Welcome registry (welcomes.json)
- Other shared templates and resources

**Important:** These are canonical files that should NOT be mixed with course-generated audio. They don't have UUID filenames - they have semantic names like `ita.wav` or `welcomes.json`.

## Critical Rules

### ❌ DO NOT:
- Upload canonical/structural files to `ssi-audio-stage` or `ssiborg-assets`
- Upload course-generated audio (with UUIDs) to `popty-bach-lfs`
- Mix these two types of content

### ✅ DO:
- Upload course audio (Phase 8 generated files) to `ssi-audio-stage` (dev) or `ssiborg-assets` (prod)
- Upload canonical welcomes, registries, and templates to `popty-bach-lfs`
- Keep the separation clear

## Working with Welcomes

Welcomes are **canonical resources** stored in the LFS bucket.

### Uploading Welcomes

```bash
# Upload both registry and audio files
node scripts/sync-welcomes-to-lfs.cjs

# Upload only audio files
node scripts/sync-welcomes-to-lfs.cjs --upload-audio

# Upload only registry
node scripts/sync-welcomes-to-lfs.cjs --upload-registry
```

### Downloading Welcomes (Syncing)

When you join the project or need to sync with the canonical welcomes:

```bash
# Download registry and all audio files from LFS
node scripts/sync-welcomes-to-lfs.cjs --download
```

This will:
1. Download `welcomes.json` to `vfs/canonical/welcomes.json`
2. Download all welcome audio files to `extracted-welcomes/`
3. Keep your local environment in sync with the team

### How Phases Use Welcomes

**Phase 7 (Compile Manifest):**
- Reads `vfs/canonical/welcomes.json` to get welcome text and metadata
- Includes welcome UUID and duration in the compiled manifest
- Does NOT generate audio

**Phase 8 (Audio Generation):**
- Can generate welcome audio if it doesn't exist yet
- Uploads generated audio to **course audio bucket** (`ssi-audio-stage`)
- However, for pre-recorded welcomes (like Aran's), those should be in LFS

**Future Enhancement:**
Phase 8 should check LFS for pre-recorded welcomes before generating new ones.

## File Locations

### Local Development

```
vfs/canonical/welcomes.json          ← Welcome registry (synced with LFS)
extracted-welcomes/welcome_*.wav     ← Welcome audio files (synced with LFS)
samples_database/                     ← MAR for course-generated audio
```

### S3 Remote

```
s3://popty-bach-lfs/
  └── canonical/
      ├── welcomes.json              ← Registry
      └── welcomes/
          ├── ita.wav                ← Italian welcome
          ├── spa.wav                ← Spanish welcome
          ├── fra.wav                ← French welcome
          └── ...

s3://ssi-audio-stage/
  └── mastered/
      ├── 8E130B02-...-.mp3          ← Course audio (UUIDs)
      ├── A6533FA4-...-.mp3
      └── ...

s3://ssiborg-assets/                 ← Same structure as stage
  └── mastered/
      └── ...
```

## Workflow Examples

### Adding a New Pre-recorded Welcome

1. Record/obtain the welcome audio file
2. Add it to `extracted-welcomes/welcome_{lang}.wav`
3. Update `vfs/canonical/welcomes.json` with text and metadata
4. Sync to LFS:
   ```bash
   node scripts/sync-welcomes-to-lfs.cjs
   ```

### Setting Up a New Development Machine

1. Clone the repository
2. Download canonical resources:
   ```bash
   node scripts/sync-welcomes-to-lfs.cjs --download
   ```
3. Now you have all the shared welcomes locally

### Deploying a Course to Production

1. Run Phase 7 (manifest compilation) - uses local welcomes.json
2. Run Phase 8 (audio generation) - uploads course audio to `ssi-audio-stage`
3. Test thoroughly in stage environment
4. Copy audio from stage to prod:
   ```bash
   # Use s3-service.cjs copyAudio() function
   # Copies from ssi-audio-stage to ssiborg-assets
   ```

## Summary

- **Course Audio** (UUIDs) → `ssi-audio-stage` / `ssiborg-assets`
- **Canonical Files** (semantic names) → `popty-bach-lfs`
- **Never mix these two types**
- Use `sync-welcomes-to-lfs.cjs` to keep canonical files in sync
- The LFS bucket is your "single source of truth" for shared resources
