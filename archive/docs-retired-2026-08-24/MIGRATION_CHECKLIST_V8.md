# Migration Checklist: ssi-dashboard-v8

> Creating a fresh dashboard repo from v7, using APML v13 as the foundation.

## Pre-Migration Checklist

- [ ] Ensure all APML specs are complete and accurate
- [ ] Verify Supabase has v13 schema (courses, course_audio, shared_audio)
- [ ] Confirm S3 bucket `ssi-audio-stage` is accessible
- [ ] Export current `.env` values (don't commit, just have ready)

---

## Phase 1: Create New Repository

### 1.1 Initialize Repo

```bash
# Create new repo
mkdir ssi-dashboard-v8
cd ssi-dashboard-v8
git init

# Copy package.json (update name/version)
# Copy essential configs
```

### 1.2 Copy Essential Config Files

From `ssi-dashboard-v7-clean/`:

```
COPY:
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── package.json              # Dependencies (review/update)
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS config
├── postcss.config.js         # PostCSS config
├── vercel.json               # Vercel deployment
└── jsconfig.json             # JS config
```

### 1.3 Copy APML Specifications (THE BRAIN)

```bash
# Copy entire APML directory - this is the source of truth
cp -r ssi-dashboard-v7-clean/apml/ ssi-dashboard-v8/apml/
```

Key specs to verify are present:
- [ ] `apml/core/audio-registry-v13.apml` - Data model
- [ ] `apml/core/configuration.apml` - All config
- [ ] `apml/interfaces/dashboard-ui.apml` - Vue components
- [ ] `apml/services/external-services.apml` - External deps
- [ ] `apml/services/orchestrator.apml` - Port 3456
- [ ] `apml/services/production-api.apml` - Port 3470
- [ ] `apml/phases/phase-index-v13.apml` - Phase reference

---

## Phase 2: Copy Vue Components (THE BEAUTY)

### 2.1 Frontend Structure

```bash
# Copy entire src directory
cp -r ssi-dashboard-v7-clean/src/ ssi-dashboard-v8/src/
```

### 2.2 Verify Key Components Present

**Views (102 total):**
- [ ] `src/views/Dashboard.vue`
- [ ] `src/views/MissionControl.vue` (flagship)
- [ ] `src/views/CourseEditor.vue`
- [ ] `src/views/CourseGeneration.vue`
- [ ] `src/views/production/` (entire directory)

**Components:**
- [ ] `src/components/VoiceConfiguration.vue` (v13 voice_config)
- [ ] `src/components/LegoVisualizer.vue`
- [ ] `src/components/generation/GenerationMonitor.vue`
- [ ] `src/components/production/` (entire directory)
- [ ] `src/components/quality/` (entire directory)

### 2.3 Update Supabase References

Search and update any hardcoded table references:

```bash
# Find old table references
grep -r "audio_samples" src/
grep -r "audio_files" src/
grep -r "texts" src/  # careful - may have false positives
```

Update to v13 tables:
- `audio_samples` → `course_audio`
- `audio_files` → `course_audio`
- `course_audio_usage` → `course_audio` (direct)

---

## Phase 3: Copy Supabase Migrations

```bash
# Copy migrations directory
cp -r ssi-dashboard-v7-clean/supabase/ ssi-dashboard-v8/supabase/
```

### 3.1 Verify v13 Migrations Present

- [ ] `001_courses_table.sql`
- [ ] `002_course_audio_table.sql`
- [ ] `003_shared_audio_table.sql`
- [ ] `004_functions_triggers.sql`
- [ ] `005_views.sql`
- [ ] `006_rls_policies.sql`
- [ ] `007_helper_functions.sql`

### 3.2 Optional: Archive Old Migrations

Move pre-v13 migrations to archive:
```bash
mkdir -p supabase/migrations/archive
mv supabase/migrations/20*.sql supabase/migrations/archive/
```

---

## Phase 4: Services (SELECTIVE)

### 4.1 Phase 1-3 Services (COPY AS-IS)

These are PERFECT - don't modify:

```bash
cp -r ssi-dashboard-v7-clean/services/phases/phase1-translation/ ssi-dashboard-v8/services/phases/
cp -r ssi-dashboard-v7-clean/services/phases/phase1-lego-extraction/ ssi-dashboard-v8/services/phases/
cp -r ssi-dashboard-v7-clean/services/phases/phase3-basket-generation/ ssi-dashboard-v8/services/phases/
```

### 4.2 Orchestrator (COPY, MINOR UPDATES)

```bash
cp -r ssi-dashboard-v7-clean/services/orchestration/ ssi-dashboard-v8/services/orchestration/
```

Review for any audio table references.

### 4.3 Audio Services (REWRITE FOR V13)

These need updating for v13 schema:

**Option A: Copy and Update**
```bash
cp ssi-dashboard-v7-clean/services/phases/phase8-audio-*.cjs ssi-dashboard-v8/services/phases/
# Then update to use course_audio table
```

**Option B: Write Fresh from APML**
- Read `apml/services/production-api.apml`
- Read `apml/core/audio-registry-v13.apml`
- Write clean implementation

### 4.4 Supabase Client (REWRITE FOR V13)

Create fresh `services/supabase-client.cjs` from APML spec:
- `course_audio` functions
- `shared_audio` functions
- `courses` functions with `voice_config`

---

## Phase 5: API Routes

### 5.1 Copy API Directory

```bash
cp -r ssi-dashboard-v7-clean/api/ ssi-dashboard-v8/api/
```

### 5.2 Update for v13

Files needing updates:
- [ ] `api/lib/supabase.js` - Use v13 tables
- [ ] `api/production/[courseCode]/audio-pipeline/plan.js` - v13 queries
- [ ] `api/production/[courseCode]/script-view.js` - v13 queries

---

## Phase 6: Shared Utilities

### 6.1 Copy Tools Directory

```bash
cp -r ssi-dashboard-v7-clean/tools/ ssi-dashboard-v8/tools/
```

### 6.2 Copy Shared Services

```bash
cp ssi-dashboard-v7-clean/services/shared/ ssi-dashboard-v8/services/shared/
cp ssi-dashboard-v7-clean/services/s3-service.cjs ssi-dashboard-v8/services/
```

### 6.3 UUID Service

```bash
cp ssi-dashboard-v7-clean/services/uuid-v11.cjs ssi-dashboard-v8/services/
```

Note: v13 uses database-assigned UUIDs, but uuid-v11.cjs may still be used for text normalization.

---

## Phase 7: Documentation

### 7.1 Create New CLAUDE.md

Write fresh `CLAUDE.md` that:
- References v13 APML specs
- Documents the simplified architecture
- Lists what's PERFECT (Phases 1-3, Vue components)
- Explains context to avoid context debt

### 7.2 Copy/Update Other Docs

```bash
cp ssi-dashboard-v7-clean/README.md ssi-dashboard-v8/
cp ssi-dashboard-v7-clean/SYSTEM.md ssi-dashboard-v8/
# Update as needed
```

---

## Phase 8: Verification

### 8.1 Install and Build

```bash
cd ssi-dashboard-v8
npm install
npm run build
```

### 8.2 Start Services

```bash
# Start orchestrator
node services/orchestration/automation_server.cjs

# Verify health
curl http://localhost:3456/health
```

### 8.3 Start Frontend

```bash
npm run dev
# Visit http://localhost:5173
```

### 8.4 Verify Database Connection

```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
supabase.from('courses').select('code').then(console.log);
"
```

### 8.5 Verify S3 Connection

```bash
# Test S3 access
node -e "
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const s3 = new S3Client({ region: 'eu-west-1' });
s3.send(new ListObjectsV2Command({ Bucket: 'ssi-audio-stage', MaxKeys: 1 })).then(console.log);
"
```

---

## Phase 9: Data Migration (If Needed)

### 9.1 Welsh Courses (Human Audio)

If Welsh courses need importing to v13:

```sql
-- Example: Import from old schema to course_audio
INSERT INTO course_audio (course_code, text, language, role, voice_id, origin, s3_key)
SELECT
  'cym_north_for_eng',
  text,
  language,
  role,
  voice_id,
  'human',  -- Welsh audio is human
  s3_key
FROM old_audio_table
WHERE course_code = 'cym_north_for_eng';
```

### 9.2 Verify Audio Files in S3

```bash
# Check S3 has the audio files
aws s3 ls s3://ssi-audio-stage/ --summarize
```

---

## Phase 10: Cleanup Old Repo

### 10.1 Archive v7

```bash
# Rename old repo
mv ssi-dashboard-v7-clean ssi-dashboard-v7-archived
```

### 10.2 Update Any External References

- Update Vercel deployment to new repo
- Update any CI/CD pipelines
- Update documentation links

---

## Quick Reference: What Goes Where

| Content | Action | Notes |
|---------|--------|-------|
| APML specs | COPY ALL | The brain - source of truth |
| Vue components | COPY ALL | 102 excellent components |
| .env.example | COPY | Configuration template |
| Phases 1-3 | COPY AS-IS | Perfect, don't touch |
| Phase 8-9 | REWRITE | Update for v13 schema |
| supabase-client.cjs | REWRITE | v13 functions |
| production-api.cjs | UPDATE | v13 queries |
| Supabase migrations | COPY v13 | Archive old migrations |

---

## Post-Migration Verification Checklist

- [ ] Frontend builds without errors
- [ ] All Vue routes work
- [ ] Supabase connection works
- [ ] S3 connection works
- [ ] Orchestrator starts on port 3456
- [ ] Phase 1-3 services start
- [ ] Can query courses table
- [ ] Can query course_audio table
- [ ] Audio playback works in UI
- [ ] Mission Control dashboard loads

---

## Rollback Plan

If migration fails:

1. Keep `ssi-dashboard-v7-archived` intact
2. Revert Vercel to old deployment
3. Old repo remains functional
4. Debug issues in v8 without pressure

---

*Created: 2026-01-03*
*APML Version: 13.0.0*
