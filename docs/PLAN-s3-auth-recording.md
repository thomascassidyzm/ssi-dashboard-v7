# Implementation Plan: S3 SSoT + Auth + Recording Studio

**Branch:** `feature/s3-auth-recording`
**Date:** 2024-12-01
**Status:** Ready for execution

---

## Overview

This plan covers three interconnected features:
1. **S3 as Single Source of Truth** - Replace GitHub with S3 for course data storage
2. **Simple Auth with Magic Links** - Access control for courses by user
3. **Recording Studio** - Allow human voice recording for phrases lacking good TTS

---

## Part 1: S3 as Single Source of Truth

### Current State
- Course data is read from GitHub raw content URLs (`raw.githubusercontent.com/...`)
- Edits go through Vercel API routes that commit back to GitHub via Octokit
- This is slow (git operations) and sometimes unreliable

### Target State
- Course data is read/written directly to/from S3
- Faster, more reliable, simpler
- S3 versioning provides history (similar to git commits)

### Files to Create/Modify

#### 1.1 New: `api/lib/s3-course.js` - S3 Course Data Service
```javascript
// Functions:
// - readCourseFile(courseCode, filename) → JSON
// - writeCourseFile(courseCode, filename, data) → { etag, url }
// - listCourses() → course manifest
// - courseFileExists(courseCode, filename) → boolean
```

#### 1.2 Modify: `src/config/github.js` → `src/config/storage.js`
- Abstract storage configuration
- Support both GitHub (legacy) and S3 modes
- Environment variable: `STORAGE_BACKEND=s3` (default) or `github`

#### 1.3 Modify: `src/services/api.js`
- Update `course.list()` to fetch from S3
- Update `course.get()` to fetch from S3
- Update all data loading to use S3 URLs
- Keep cache layer (IndexedDB) unchanged

#### 1.4 Modify: API Routes to use S3
- `api/courses/[courseCode]/introductions/[legoId].js` - Read/write to S3
- `api/courses/[courseCode]/baskets/[seedId].js` - Read/write to S3
- `api/courses/[courseCode]/translations/[uuid].js` - Read/write to S3

#### 1.5 S3 Bucket Structure
```
s3://popty-bach-lfs/
├── courses/
│   ├── manifest.json              # Course listing (replaces courses-manifest.json)
│   ├── spa_for_eng/
│   │   ├── seed_pairs.json
│   │   ├── lego_pairs.json
│   │   ├── lego_baskets.json
│   │   ├── introductions.json
│   │   └── course_manifest.json
│   ├── fra_for_eng/
│   │   └── ...
│   └── ...
├── audio/                         # Existing audio storage
│   └── mastered/{uuid}.mp3
└── recordings/                    # NEW: Human recordings
    └── {text_hash}_{lang}_{role}_{voice_id}.mp3
```

---

## Part 2: Simple Auth with Magic Links (OTP)

### Design Principles
- **Very simple** - No passwords, no OAuth complexity
- **Email-based** - Magic link sent to email, valid for 15 minutes
- **Session-based** - Cookie/localStorage token, valid for 7 days
- **Role-based** - Admin (all courses) vs Recorder (assigned courses only)

### Files to Create

#### 2.1 New: `api/lib/auth.js` - Auth utilities
```javascript
// Functions:
// - generateMagicLink(email) → token
// - verifyMagicLink(token) → user | null
// - createSession(user) → sessionToken
// - validateSession(sessionToken) → user | null
// - getUserPermissions(email) → { role, courses }
```

#### 2.2 New: `api/auth/request-link.js` - Request magic link endpoint
```javascript
// POST /api/auth/request-link
// Body: { email }
// Response: { success: true, message: "Check your email" }
// Side effect: Sends email with magic link
```

#### 2.3 New: `api/auth/verify.js` - Verify magic link
```javascript
// GET /api/auth/verify?token=xxx
// Response: { success: true, session: "...", user: {...} }
// Or redirect to dashboard with session cookie
```

#### 2.4 New: `api/auth/me.js` - Get current user
```javascript
// GET /api/auth/me
// Headers: Authorization: Bearer {session}
// Response: { user: { email, role, courses } }
```

#### 2.5 S3 Permissions Storage
```
s3://popty-bach-lfs/auth/
├── users.json                     # User list with roles/courses
├── sessions/                      # Active session tokens (auto-expire)
│   └── {sessionId}.json
└── magic-links/                   # Pending magic links (15min TTL)
    └── {token}.json
```

#### 2.6 `users.json` Schema
```json
{
  "users": {
    "kai@ssi.org": {
      "name": "Kai",
      "role": "admin",
      "courses": "*"
    },
    "volunteer1@example.com": {
      "name": "Maria",
      "role": "recorder",
      "courses": ["mkd_for_cat", "wel_for_eng"],
      "voice_id": "human_maria_mkd"
    }
  }
}
```

#### 2.7 Frontend Auth Components

##### `src/components/LoginForm.vue`
- Email input
- "Send Magic Link" button
- Loading/success states

##### `src/composables/useAuth.js`
- `login(email)` - Request magic link
- `logout()` - Clear session
- `user` - Current user reactive ref
- `isAuthenticated` - Boolean
- `canAccessCourse(courseCode)` - Permission check

##### `src/router/index.js` - Route Guards
- Protected routes require authentication
- Course routes check `canAccessCourse()`

---

## Part 3: Recording Studio

### Audio Sample Key Format
Samples are identified by: `{text}:{language}:{role}:{cadence}:{voice_id}`

For human recordings, voice_id = `human_{userId}_{language}`

### Files to Create

#### 3.1 New: `src/views/RecordingStudio.vue` - Main Recording Interface
Features:
- Course selector (filtered by user permissions)
- Phrase browser (shows phrases needing recording)
- Audio recorder with waveform visualization
- Playback/re-record controls
- Upload to S3 on save
- Progress tracking (X of Y phrases recorded)

#### 3.2 New: `src/components/AudioRecorder.vue` - Reusable Recorder
```vue
<template>
  <div class="audio-recorder">
    <div class="waveform" ref="waveformRef"></div>
    <div class="controls">
      <button @click="startRecording" v-if="!isRecording">🎤 Record</button>
      <button @click="stopRecording" v-if="isRecording">⏹ Stop</button>
      <button @click="playback" v-if="hasRecording">▶ Play</button>
      <button @click="clear" v-if="hasRecording">🗑 Clear</button>
    </div>
    <audio ref="audioRef" :src="recordingUrl"></audio>
  </div>
</template>

<script setup>
// Uses MediaRecorder API
// Outputs MP3 blob
// Emits: recorded(blob), cleared
</script>
```

#### 3.3 New: `api/audio/record.js` - Upload Recording Endpoint
```javascript
// POST /api/audio/record
// Body: FormData with { audio: Blob, metadata: JSON }
// metadata: { text, language, role, cadence, voice_id, course_code }
// Response: { success: true, key: "...", url: "..." }
```

#### 3.4 New: `api/audio/recordings.js` - List/Query Recordings
```javascript
// GET /api/audio/recordings?language=mkd&role=target1
// Response: { recordings: [...] }
```

#### 3.5 Voice ID Auto-Creation
When a new user with role "recorder" is added:
1. System generates `voice_id`: `human_{sanitized_email}_{primary_language}`
2. Stored in `users.json`
3. All their recordings tagged with this voice_id

#### 3.6 Recording Propagation
When a recording is saved:
1. Key is generated: `{md5(text)}_{lang}_{role}_{cadence}_{voice_id}`
2. Uploaded to: `s3://popty-bach-lfs/recordings/{key}.mp3`
3. Any course manifest requesting this exact combo uses this recording
4. TTS is only used as fallback when no human recording exists

#### 3.7 Router Addition
```javascript
{
  path: '/record',
  name: 'RecordingStudio',
  component: RecordingStudio,
  meta: { title: 'Recording Studio', requiresAuth: true }
}
```

---

## Implementation Order (for Parallel Agents)

### Agent 1: S3 Course Data Layer
1. Create `api/lib/s3-course.js`
2. Create `src/config/storage.js`
3. Modify `api/courses/[courseCode]/introductions/[legoId].js`
4. Modify `api/courses/[courseCode]/baskets/[seedId].js`

### Agent 2: Frontend S3 Integration
1. Modify `src/services/api.js` - course.list(), course.get()
2. Update data loading URLs
3. Test CourseBrowser and CourseEditor with S3

### Agent 3: Auth System Backend
1. Create `api/lib/auth.js`
2. Create `api/auth/request-link.js`
3. Create `api/auth/verify.js`
4. Create `api/auth/me.js`
5. Set up S3 auth storage structure

### Agent 4: Auth System Frontend
1. Create `src/components/LoginForm.vue`
2. Create `src/composables/useAuth.js`
3. Add route guards to `src/router/index.js`
4. Add login/logout to Dashboard

### Agent 5: Recording Studio
1. Create `src/components/AudioRecorder.vue`
2. Create `src/views/RecordingStudio.vue`
3. Create `api/audio/record.js`
4. Create `api/audio/recordings.js`
5. Add route and navigation

---

## Environment Variables Required

```env
# Already in .env (see .env file for actual values)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs

# New
STORAGE_BACKEND=s3
SMTP_HOST=smtp.example.com       # For magic link emails
SMTP_USER=noreply@ssi.org
SMTP_PASS=xxx
MAGIC_LINK_SECRET=random-32-char-string
SESSION_SECRET=another-random-string
```

---

## Quality Control Checklist

After implementation, verify:

- [ ] CourseBrowser loads courses from S3
- [ ] CourseEditor loads/saves to S3
- [ ] Inline editing persists to S3
- [ ] Magic link email is sent
- [ ] Magic link verification works
- [ ] Session persists across page reloads
- [ ] Non-admin users only see assigned courses
- [ ] AudioRecorder captures audio
- [ ] Recording uploads to S3
- [ ] Recording appears in phrase browser
- [ ] Voice ID is auto-created for new recorders

---

## Rollback Plan

If issues arise:
1. Checkout `main` branch
2. All changes isolated in `feature/s3-auth-recording`
3. S3 data is additive (doesn't delete GitHub data)
4. GitHub remains functional as fallback

---

## Notes for Agents

- Use existing S3 service patterns from `services/s3-service.cjs`
- Follow Vue 3 Composition API patterns from existing components
- Keep error handling consistent with existing API routes
- Test thoroughly before marking complete
- Commit frequently with descriptive messages
