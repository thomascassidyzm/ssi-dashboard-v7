# UUID Case Mismatch Fix

## Problem
- `lego_introductions.audio_uuid` stores **UPPERCASE** UUIDs (e.g., `B124F896-B9F4-4419-91A7-E855C1A355B9`)
- S3 keys use **lowercase** UUIDs (e.g., `mastered/b124f896-b9f4-4419-91a7-e855c1a355b9.mp3`)
- S3 is **case-sensitive**, so if the learning app constructs S3 paths from the UUID, uppercase paths fail

## Root Cause
`services/uuid-v11.cjs` line 171 was generating UPPERCASE UUIDs:
```javascript
const hex = digest.slice(0, 16).toString('hex').toUpperCase();
```

## Fix Applied

### 1. Code Fix (Done)
Updated `services/uuid-v11.cjs` to output lowercase:
```javascript
const hex = digest.slice(0, 16).toString('hex').toLowerCase();
```

### 2. Database Fix (Manual - Required)
Run this SQL in **Supabase SQL Editor**:

```sql
-- Fix lego_introductions.audio_uuid to lowercase
UPDATE lego_introductions
SET audio_uuid = LOWER(audio_uuid::text)::uuid
WHERE audio_uuid IS NOT NULL;

-- Fix course_audio.audio_uuid to lowercase (if any are uppercase)
UPDATE course_audio
SET audio_uuid = LOWER(audio_uuid::text)::uuid
WHERE audio_uuid IS NOT NULL
AND audio_uuid::text != LOWER(audio_uuid::text);

-- Verify the fix
SELECT lego_id, audio_uuid::text
FROM lego_introductions
WHERE course_code = 'zho_for_eng'
LIMIT 10;
```

## Verification
After running the SQL, the learning app should be able to find audio files because:
1. UUID stored: `b124f896-b9f4-4419-91a7-e855c1a355b9` (lowercase)
2. S3 key: `mastered/b124f896-b9f4-4419-91a7-e855c1a355b9.mp3` (lowercase)
3. Case matches = file found

## Notes
- PostgreSQL UUID type is case-insensitive for comparisons, but the stored text representation matters when constructing S3 paths
- New UUIDs generated after this fix will automatically be lowercase
