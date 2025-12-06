# Learning App Data Flow
**How the new app works WITHOUT manifest files**

Version: 1.0.0
Date: 2025-12-05

---

## Overview

The learning app queries Supabase directly instead of loading a pre-compiled manifest. This enables:

1. **Dynamic content assembly** - Build learning sequences on-the-fly
2. **Real-time updates** - New content available immediately
3. **Personalization** - Different content per learner
4. **Offline support** - Cache to IndexedDB, sync when online
5. **Agent generation** - New content can be created on-demand

---

## Data Sources

### Supabase Tables (v2 Schema)

| Table | Purpose | Replaces |
|-------|---------|----------|
| `seeds` | Course backbone sentences | manifest.slices[0].seeds |
| `legos` | Reusable building blocks | manifest introduction_items |
| `practice_phrases` | COMP, LEGO, DEBU, ETER phrases | lego_baskets.json |
| `audio_samples` | Audio metadata + UUIDs | manifest.samples |
| `canonical_welcomes` | Course welcome | manifest.introduction |
| `canonical_encouragements` | Pooled/ordered encouragements | manifest encouragements |
| `learner_*` | Progress tracking | (new) |

### S3

| Path | Content |
|------|---------|
| `mastered/{uuid}.mp3` | Audio files |

---

## App Startup Flow

```
1. App loads
   ↓
2. Check IndexedDB for cached course data
   ├─ If fresh (< 24h): Use cached
   └─ If stale/missing: Fetch from Supabase
   ↓
3. Fetch learner progress from Supabase
   (or create new learner record)
   ↓
4. Build initial learning queue
   ↓
5. Pre-fetch next 30 mins of audio to IndexedDB
   ↓
6. Ready to learn!
```

---

## Key Queries

### 1. Load Course Structure

```sql
-- Get all seeds for a course (with their LEGOs)
SELECT * FROM seed_with_legos
WHERE course_code = 'spa_for_eng'
ORDER BY sequence_number;
```

### 2. Get LEGO with Practice Phrases

```sql
-- Get a LEGO and all its phrases
SELECT * FROM lego_with_phrases
WHERE lego_id = 'S0042L01';

-- Result includes:
-- - LEGO data (known_text, target_text, type, etc.)
-- - phrases array ordered: COMP → LEGO → DEBU → ETER
```

### 3. Get Audio for a Phrase

```sql
-- Get all audio samples for a text
SELECT * FROM audio_samples
WHERE text_normalized = lower(trim('quiero'))
  AND lang = 'spa';

-- Returns: target1 (slow), target2 (slow) samples
```

### 4. Get Learner's Next Items

```sql
-- What should this learner practice next?
SELECT * FROM learner_next_items
WHERE learner_id = 'uuid-...'
  AND course_code = 'spa_for_eng'
ORDER BY priority, next_review_at
LIMIT 20;
```

### 5. Get Encouragements

```sql
-- Get ordered encouragements (for story sequence)
SELECT * FROM canonical_encouragements
WHERE type = 'ordered'
  AND language = 'eng'
ORDER BY order_position;

-- Get pooled encouragements (for random selection)
SELECT * FROM canonical_encouragements
WHERE type = 'pooled'
  AND language = 'eng'
  AND is_active = true;
```

### 6. Get Course Welcome

```sql
SELECT
  w.*,
  a.duration_ms,
  a.s3_key
FROM canonical_welcomes w
LEFT JOIN audio_samples a ON a.uuid = w.audio_uuid
WHERE w.course_code = 'spa_for_eng';
```

---

## Dynamic Content Assembly

### Introduction Sequence (new LEGO)

```javascript
// When introducing a new LEGO
async function buildIntroductionSequence(legoId) {
  const { data: lego } = await supabase
    .from('lego_with_phrases')
    .select('*')
    .eq('lego_id', legoId)
    .single();

  const sequence = [];

  // 1. Components (if M-type)
  const comps = lego.phrases.filter(p => p.phrase_type === 'COMP');
  for (const comp of comps) {
    sequence.push({
      type: 'COMP',
      known: comp.known_text,
      target: comp.target_text,
      nodeId: comp.node_id
    });
  }

  // 2. LEGO itself
  sequence.push({
    type: 'LEGO',
    known: lego.known_text,
    target: lego.target_text,
    nodeId: lego.node_id,
    presentation: lego.presentation_text
  });

  // 3. Debut phrases
  const debus = lego.phrases.filter(p => p.phrase_type === 'DEBU');
  for (const debu of debus) {
    sequence.push({
      type: 'DEBU',
      known: debu.known_text,
      target: debu.target_text,
      nodeId: debu.node_id
    });
  }

  return sequence;
}
```

### Practice Sequence (review)

```javascript
// When reviewing a LEGO (already introduced)
async function buildPracticeSequence(legoId, count = 3) {
  const { data: phrases } = await supabase
    .from('practice_phrases')
    .select('*')
    .eq('lego_id', legoId)
    .eq('phrase_type', 'ETER')
    .order('RANDOM()')  // Random selection
    .limit(count);

  return phrases.map(p => ({
    type: 'ETER',
    known: p.known_text,
    target: p.target_text,
    nodeId: p.node_id
  }));
}
```

### Audio Lookup

```javascript
// Get audio URLs for a phrase
async function getAudioForPhrase(knownText, targetText, courseCode) {
  // Get course voice config
  const { data: course } = await supabase
    .from('courses')
    .select('source_voice_id, target1_voice_id, target2_voice_id')
    .eq('course_code', courseCode)
    .single();

  // Get known (source) audio
  const { data: sourceAudio } = await supabase
    .from('audio_samples')
    .select('uuid, duration_ms, s3_key')
    .eq('text_normalized', knownText.toLowerCase().trim())
    .eq('role', 'source')
    .eq('voice_id', course.source_voice_id)
    .single();

  // Get target audio (both voices)
  const { data: targetAudio } = await supabase
    .from('audio_samples')
    .select('uuid, duration_ms, s3_key, role')
    .eq('text_normalized', targetText.toLowerCase().trim())
    .in('role', ['target1', 'target2'])
    .in('voice_id', [course.target1_voice_id, course.target2_voice_id]);

  return {
    known: {
      url: `https://s3.../mastered/${sourceAudio.uuid}.mp3`,
      duration: sourceAudio.duration_ms
    },
    target1: {
      url: `https://s3.../mastered/${targetAudio[0].uuid}.mp3`,
      duration: targetAudio[0].duration_ms
    },
    target2: {
      url: `https://s3.../mastered/${targetAudio[1].uuid}.mp3`,
      duration: targetAudio[1].duration_ms
    }
  };
}
```

---

## Offline Support (IndexedDB)

### What to Cache

```javascript
// Cache structure in IndexedDB
const cacheStructure = {
  // Course data (refreshed daily)
  'course:spa_for_eng': {
    seeds: [...],
    legos: [...],
    phrases: [...],
    cachedAt: timestamp
  },

  // Audio files (cached as blobs)
  'audio:{uuid}': Blob,

  // Learner progress (synced to Supabase)
  'progress:{learnerId}:{courseCode}': {
    legoProgress: {...},
    sessionState: {...},
    pendingSync: [...]  // Changes to sync when online
  }
};
```

### Sync Strategy

```javascript
// On app load
async function syncProgress() {
  const pending = await indexedDB.get('pendingSync');

  if (navigator.onLine && pending.length > 0) {
    // Push local changes to Supabase
    for (const change of pending) {
      await supabase.from(change.table).upsert(change.data);
    }

    // Pull latest from Supabase
    const { data: serverProgress } = await supabase
      .from('learner_course_progress')
      .select('*')
      .eq('learner_id', learnerId);

    // Merge and update IndexedDB
    await mergeProgress(serverProgress);
  }
}
```

---

## Real-time Updates

### Subscribe to Progress Changes (for dashboards)

```javascript
// Schools dashboard: watch student progress
const subscription = supabase
  .channel('class-progress')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'learner_course_progress',
      filter: `class_id=eq.${classId}`
    },
    (payload) => {
      updateDashboard(payload.new);
    }
  )
  .subscribe();
```

---

## Benefits Over Manifest Files

| Aspect | Manifest File | Supabase Direct |
|--------|---------------|-----------------|
| **Update speed** | Recompile + redeploy | Instant |
| **Personalization** | Same for everyone | Per-learner |
| **File size** | 20-30 MB per course | Query what you need |
| **Offline** | Download entire manifest | Cache only needed data |
| **Content generation** | Pre-generate everything | Generate on-demand |
| **Progress sync** | Separate system | Same database |
| **Real-time** | Polling | WebSocket subscriptions |

---

## Migration Path

### Phase 1: Populate Supabase from existing files
```bash
node scripts/migrate-to-supabase.cjs spa_for_eng
```

### Phase 2: App reads from Supabase (with manifest fallback)
```javascript
try {
  courseData = await loadFromSupabase(courseCode);
} catch {
  courseData = await loadManifest(courseCode);  // Fallback
}
```

### Phase 3: Remove manifest dependency
- App fully Supabase-native
- Manifest compiler only for legacy native app

---

## Next Steps

1. **Implement migration script** - `scripts/migrate-to-supabase.cjs`
2. **Update @ssi/core** - Add Supabase data provider
3. **Build IndexedDB cache layer** - `packages/core/src/cache/`
4. **Test offline flow** - PWA service worker
5. **Schools dashboard integration** - Real-time progress

---

*Document prepared by Claude Code*
*Date: 2025-12-05*
