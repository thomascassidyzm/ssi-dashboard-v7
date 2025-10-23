# Cloud-Native Dashboard Architecture

**Status**: 🚧 Design Phase → Ready for Implementation
**Version**: 1.0
**Last Updated**: 2025-10-23

---

## Vision

**"The dashboard is everything"** - A single published URL containing everything for both humans AND agents. No local file dependencies. No manual file management. Just Claude Code executing against cloud APIs.

---

## Core Principle

> **Dashboard + S3 = Single Source of Truth**
>
> The dashboard is not a viewer. It's a **VFS proxy** that manages all course data in S3, serving it through clean REST APIs. Claude Code and agents only execute - they never manage files locally.

---

## Architecture Layers

### 1. **Client Layer** (Vue.js Dashboard)
- **URL**: https://ssi-dashboard-v7.vercel.app
- **Purpose**: Human interface for viewing, managing, triggering workflows
- **Access**: Web browser

### 2. **API Layer** (Dashboard Backend)
- **URL**: http://localhost:3456 (development) → https://api.ssi-dashboard.com (production)
- **Purpose**: VFS proxy - all file operations go through REST APIs
- **Technologies**: Express.js, AWS SDK

### 3. **Storage Layer** (AWS S3)
- **Bucket**: `popty-bach-lfs`
- **Region**: `eu-west-1`
- **Structure**:
  ```
  s3://popty-bach-lfs/
  ├── courses/
  │   ├── ita_for_eng_668seeds/
  │   │   ├── seed_pairs.json
  │   │   ├── corpus_intelligence.json
  │   │   ├── lego_pairs.json
  │   │   ├── lego_graph.json
  │   │   ├── lego_baskets.json
  │   │   ├── lego_baskets_deduplicated.json
  │   │   ├── introductions.json
  │   │   ├── course_manifest.json
  │   │   └── audio/
  │   │       ├── C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3
  │   │       └── ...
  │   ├── spa_for_eng_668seeds/
  │   └── fra_for_eng_668seeds/
  ```

### 4. **Execution Layer** (Claude Code)
- **Purpose**: Pure execution - reads/writes through API, never touches local files
- **Example**:
  ```javascript
  // OLD WAY (local files)
  const seedPairs = JSON.parse(fs.readFileSync('vfs/courses/ita_for_eng_668seeds/seed_pairs.json'))

  // NEW WAY (cloud API)
  const seedPairs = await fetch('https://api.ssi-dashboard.com/api/vfs/courses/ita_for_eng_668seeds/seed_pairs.json').then(r => r.json())
  ```

---

## VFS API Endpoints

### Read Operations

#### `GET /api/vfs/courses`
List all courses
```json
{
  "courses": [
    "ita_for_eng_668seeds",
    "spa_for_eng_668seeds",
    "fra_for_eng_668seeds"
  ]
}
```

#### `GET /api/vfs/courses/:code/:file`
Read course file (JSON or text)
```bash
GET /api/vfs/courses/ita_for_eng_668seeds/seed_pairs.json
GET /api/vfs/courses/ita_for_eng_668seeds/lego_pairs.json
GET /api/vfs/courses/ita_for_eng_668seeds/course_manifest.json
```

#### `GET /api/vfs/courses/:code/audio/:uuid`
Read audio file (MP3)
```bash
GET /api/vfs/courses/ita_for_eng_668seeds/audio/C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3
```

### Write Operations

#### `PUT /api/vfs/courses/:code/:file`
Write/update course file
```bash
PUT /api/vfs/courses/ita_for_eng_668seeds/seed_pairs.json
Content-Type: application/json

{
  "S0001": ["Voglio parlare italiano.", "I want to speak Italian."],
  "S0002": ["Sto cercando di imparare.", "I'm trying to learn."]
}
```

#### `PUT /api/vfs/courses/:code/audio/:uuid`
Upload audio file
```bash
PUT /api/vfs/courses/ita_for_eng_668seeds/audio/C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3
Content-Type: audio/mpeg

[binary audio data]
```

#### `DELETE /api/vfs/courses/:code/:file`
Delete course file
```bash
DELETE /api/vfs/courses/ita_for_eng_668seeds/seed_pairs.json
```

---

## Implementation Details

### Backend: S3 Integration

```javascript
// automation_server.cjs (or dedicated vfs-api.cjs service)

const AWS = require('aws-sdk')
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
})

const BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs'

// READ: GET /api/vfs/courses/:code/:file
app.get('/api/vfs/courses/:code/:file(*)', async (req, res) => {
  const { code, file } = req.params
  const key = `courses/${code}/${file}`

  try {
    const obj = await s3.getObject({ Bucket: BUCKET, Key: key }).promise()

    // Detect content type
    const contentType = file.endsWith('.json') ? 'application/json' :
                       file.endsWith('.mp3') ? 'audio/mpeg' :
                       'text/plain'

    res.type(contentType).send(obj.Body)
    console.log(`✅ Served ${key} from S3`)
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      res.status(404).json({ error: 'File not found' })
    } else {
      console.error('S3 read error:', error)
      res.status(500).json({ error: 'Failed to read file' })
    }
  }
})

// WRITE: PUT /api/vfs/courses/:code/:file
app.put('/api/vfs/courses/:code/:file(*)', async (req, res) => {
  const { code, file } = req.params
  const key = `courses/${code}/${file}`

  try {
    // Detect content type
    const contentType = file.endsWith('.json') ? 'application/json' :
                       file.endsWith('.mp3') ? 'audio/mpeg' :
                       'text/plain'

    await s3.putObject({
      Bucket: BUCKET,
      Key: key,
      Body: req.body,
      ContentType: contentType,
      ACL: 'public-read'
    }).promise()

    console.log(`✅ Wrote ${key} to S3`)
    res.json({ success: true, key })
  } catch (error) {
    console.error('S3 write error:', error)
    res.status(500).json({ error: 'Failed to write file' })
  }
})

// LIST: GET /api/vfs/courses
app.get('/api/vfs/courses', async (req, res) => {
  try {
    const result = await s3.listObjectsV2({
      Bucket: BUCKET,
      Prefix: 'courses/',
      Delimiter: '/'
    }).promise()

    const courses = result.CommonPrefixes
      .map(p => p.Prefix.replace('courses/', '').replace('/', ''))
    res.json({ courses })
  } catch (error) {
    console.error('S3 list error:', error)
    res.status(500).json({ error: 'Failed to list courses' })
  }
})

// DELETE: DELETE /api/vfs/courses/:code/:file
app.delete('/api/vfs/courses/:code/:file(*)', async (req, res) => {
  const { code, file } = req.params
  const key = `courses/${code}/${file}`

  try {
    await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise()
    console.log(`✅ Deleted ${key} from S3`)
    res.json({ success: true })
  } catch (error) {
    console.error('S3 delete error:', error)
    res.status(500).json({ error: 'Failed to delete file' })
  }
})
```

### Frontend: VFS Client Wrapper

```javascript
// src/services/vfs.js

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3456'

export async function readCourseFile(courseCode, fileName) {
  const response = await fetch(`${API_BASE}/api/vfs/courses/${courseCode}/${fileName}`)

  if (!response.ok) {
    throw new Error(`Failed to read ${fileName}: ${response.statusText}`)
  }

  return fileName.endsWith('.json') ? await response.json() : await response.text()
}

export async function writeCourseFile(courseCode, fileName, content) {
  const body = typeof content === 'string' ? content : JSON.stringify(content, null, 2)

  const response = await fetch(`${API_BASE}/api/vfs/courses/${courseCode}/${fileName}`, {
    method: 'PUT',
    headers: { 'Content-Type': fileName.endsWith('.json') ? 'application/json' : 'text/plain' },
    body
  })

  if (!response.ok) {
    throw new Error(`Failed to write ${fileName}: ${response.statusText}`)
  }

  return await response.json()
}

export async function listCourses() {
  const response = await fetch(`${API_BASE}/api/vfs/courses`)
  return (await response.json()).courses
}

export async function deleteCourseFile(courseCode, fileName) {
  const response = await fetch(`${API_BASE}/api/vfs/courses/${courseCode}/${fileName}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new Error(`Failed to delete ${fileName}: ${response.statusText}`)
  }

  return await response.json()
}
```

### Claude Code: Cloud-Native Agent Pattern

```javascript
// Example: Phase 1 agent (cloud-native)

async function runPhase1(courseCode, targetLang, knownLang) {
  // 1. Read canonical seeds from API
  const response = await fetch(`${API_BASE}/api/courses/${courseCode}/canonical_seeds`)
  const canonicalSeeds = await response.json()

  // 2. Generate seed_pairs (in memory)
  const seedPairs = await translateSeeds(canonicalSeeds, targetLang, knownLang)

  // 3. Write to S3 via API
  await fetch(`${API_BASE}/api/vfs/courses/${courseCode}/seed_pairs.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seedPairs, null, 2)
  })

  console.log('✅ Phase 1 complete - seed_pairs.json written to S3')
}
```

---

## Migration Path

### Phase 1: Add S3 Backend (Non-Breaking)
- ✅ Add VFS API endpoints to `automation_server.cjs`
- ✅ Keep existing local file operations intact
- ✅ Test S3 read/write with test course

### Phase 2: Parallel Operations (Redundancy)
- Write to BOTH local files AND S3
- Read from S3 with fallback to local files
- Verify data consistency

### Phase 3: S3 Primary (Local Backup)
- Read from S3 by default
- Keep local writes as backup
- Monitor for issues

### Phase 4: S3 Only (Full Cloud-Native)
- Remove all local file operations
- Pure API-driven workflow
- Local `vfs/` directory becomes optional cache

---

## Benefits

### 1. **Multi-User Capable**
- Multiple developers can work on different courses simultaneously
- No file conflicts or sync issues
- Central source of truth

### 2. **Scalable**
- S3 handles storage scaling automatically
- No local disk space constraints
- Unlimited courses

### 3. **Versioned**
- Enable S3 versioning for automatic backups
- Rollback to previous versions if needed
- Audit trail of all changes

### 4. **Distributed**
- Agents can run anywhere (local, cloud, Lambda)
- Dashboard can be accessed from anywhere
- No local dependencies

### 5. **Simple Deployment**
- Vercel for dashboard (zero config)
- Railway/Heroku for API (environment variables only)
- S3 for storage (already managed)

### 6. **No Local File Management**
- Claude Code just executes
- No `fs.readFile` / `fs.writeFile` shenanigans
- Clean API calls only

---

## Security

### API Authentication
```javascript
// Add API key middleware
app.use('/api/vfs', (req, res, next) => {
  const apiKey = req.headers['x-api-key']

  if (apiKey !== process.env.VFS_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
})
```

### S3 Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::popty-bach-lfs/courses/*/audio/*"
    },
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::popty-bach-lfs/courses/*/*.json"
    }
  ]
}
```
- Audio files: Public (for app playback)
- Course data: Private (API only)

---

## Environment Variables

### Backend (automation_server.cjs)
```bash
AWS_ACCESS_KEY_ID=AKIAYOZ5W4WS34FFVFOJ
AWS_SECRET_ACCESS_KEY=47InCYXc9vQue4RzvFc1C1TOFcxjqWSVsRLlB+h3
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs
VFS_API_KEY=your_api_key_for_client_auth
```

### Frontend (Dashboard)
```bash
VITE_API_URL=http://localhost:3456  # development
VITE_API_URL=https://api.ssi-dashboard.com  # production
VITE_VFS_API_KEY=your_api_key
```

---

## Example: Full Course Generation (Cloud-Native)

```javascript
// POST /api/courses/:code/generate-full
app.post('/api/courses/:code/generate-full', async (req, res) => {
  const { code } = req.params
  const { targetLang, knownLang, seedCount } = req.body

  try {
    // All phases write directly to S3 via VFS API

    // Phase 1
    await runPhase1(code, targetLang, knownLang)
    // Writes: seed_pairs.json → S3

    // Phase 2
    await runPhase2(code)
    // Reads: seed_pairs.json ← S3
    // Writes: corpus_intelligence.json → S3

    // Phase 3
    await runPhase3(code)
    // Reads: seed_pairs.json, corpus_intelligence.json ← S3
    // Writes: lego_pairs.json → S3

    // Phase 3.5
    await runPhase3_5(code)
    // Reads: lego_pairs.json ← S3
    // Writes: lego_graph.json → S3

    // Phase 5
    await runPhase5(code)
    // Reads: seed_pairs.json, lego_pairs.json, lego_graph.json ← S3
    // Writes: lego_baskets.json → S3

    // Phase 5.5
    await runPhase5_5(code)
    // Reads: lego_baskets.json ← S3
    // Writes: lego_baskets_deduplicated.json → S3

    // Phase 6
    await runPhase6(code)
    // Reads: lego_pairs.json, seed_pairs.json ← S3
    // Writes: introductions.json → S3

    // Phase 7
    await runPhase7(code)
    // Reads: all previous phase files ← S3
    // Writes: course_manifest.json → S3

    // Phase 8
    await runPhase8(code)
    // Reads: course_manifest.json ← S3
    // Writes: audio/*.mp3 → S3

    res.json({
      success: true,
      message: 'Full course generated in S3',
      s3_path: `s3://popty-bach-lfs/courses/${code}/`
    })

  } catch (error) {
    console.error('Course generation error:', error)
    res.status(500).json({ error: error.message })
  }
})
```

---

## Comparison: Old vs New

### Old Way (Local Files)
```
Claude Code → fs.readFile('vfs/courses/.../seed_pairs.json')
           → Process
           → fs.writeFile('vfs/courses/.../lego_pairs.json')
           → Manual git commit/push
           → Manual sync to S3 for deployment
```

**Problems**:
- File conflicts in multi-user scenarios
- Manual sync overhead
- Local disk dependencies
- No automatic versioning

### New Way (Cloud-Native)
```
Claude Code → GET /api/vfs/courses/.../seed_pairs.json (from S3)
           → Process
           → PUT /api/vfs/courses/.../lego_pairs.json (to S3)
           → Automatic versioning (S3 feature)
           → Already deployed (S3 is live storage)
```

**Benefits**:
- No file conflicts (S3 handles concurrency)
- Zero sync overhead (S3 is source of truth)
- No local dependencies (pure API)
- Automatic versioning (S3 feature)

---

## Status

**Current**: Local files with manual S3 sync
**Next**: Implement VFS API endpoints
**Goal**: Full cloud-native architecture with S3 as SSoT

---

## Related Documentation

- **Phase Intelligence**: `docs/phase_intelligence/README.md` (already using static file serving from docs/)
- **APML Registry**: `.apml-registry.json` (tracks current v7.7.1 architecture)
- **Phase 8 Audio**: `docs/phase_intelligence/phase_8_audio_generation.md` (already specifies S3 upload)

---

**Remember**: The dashboard is everything. No local files. Just clean APIs and S3 storage. Claude Code executes, the dashboard manages.
