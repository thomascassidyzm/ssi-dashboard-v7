# Segment-Based Course Architecture

**Version**: 1.0 (2025-11-11)
**Purpose**: Enable parallel processing of large courses via 100-seed segments

---

## 🎯 Overview

Large courses (200+ seeds) are automatically divided into **100-seed segments** that can be processed independently in parallel. Each segment runs in its own Claude Code web instance, enabling true parallelization.

**Key Benefits:**
- ✅ **True parallelization**: Each segment in separate browser window
- ✅ **Independent progress**: Segments don't block each other
- ✅ **Resource efficiency**: Distribute across multiple Claude Code instances
- ✅ **Fault tolerance**: One segment failing doesn't stop others
- ✅ **Clean monitoring**: Single parent job tracks aggregate progress

---

## 📊 Segmentation Logic

### Automatic Segmentation

**Rule**: Courses are divided into segments of **exactly 100 seeds**

**Examples**:

```javascript
// Course: 668 seeds (S0001-S0668)
Segments:
  1. spa_for_eng_s0001-0100  (100 seeds)
  2. spa_for_eng_s0101-0200  (100 seeds)
  3. spa_for_eng_s0201-0300  (100 seeds)
  4. spa_for_eng_s0301-0400  (100 seeds)
  5. spa_for_eng_s0401-0500  (100 seeds)
  6. spa_for_eng_s0501-0600  (100 seeds)
  7. spa_for_eng_s0601-0668  (68 seeds - final partial segment)

// Course: 250 seeds (S0001-S0250)
Segments:
  1. spa_for_eng_s0001-0100  (100 seeds)
  2. spa_for_eng_s0101-0200  (100 seeds)
  3. spa_for_eng_s0201-0250  (50 seeds - final partial segment)

// Course: 100 seeds (S0001-S0100)
Segments:
  1. spa_for_eng_s0001-0100  (100 seeds - single segment)

// Course: 50 seeds (S0001-S0050)
Segments:
  1. spa_for_eng_s0001-0050  (50 seeds - single segment, no split)
```

### Segment Naming Convention

```
{course_code}_s{start_seed}-{end_seed}

Examples:
- spa_for_eng_s0001-0100
- spa_for_eng_s0101-0200
- zho_for_eng_s0501-0600
```

---

## 🔄 Phase Independence

### Parallelizable Phases

These phases can run independently per segment:

| Phase | Parallelizable? | Why |
|-------|----------------|-----|
| **Phase 1** | ✅ Yes | Each segment translates its own seeds |
| **Phase 3** | ✅ Yes | LEGOs extracted per segment (no cross-segment deps) |
| **Phase 5** | ✅ Yes | Baskets use sliding window (max 10-seed lookback) |
| **Phase 6** | ✅ Yes | Introductions per LEGO, segment-independent |

### Non-Parallelizable Phases

These phases merge across segments:

| Phase | Parallelizable? | Why |
|-------|----------------|-----|
| **Phase 4** | ❌ No | Deduplication needs all segments' LEGOs |
| **Phase 7** | ❌ No | Final compilation of full course manifest |

---

## 📁 File Structure

### Segment-Based Structure

```
spa_for_eng/
├── segments/
│   ├── s0001-0100/
│   │   ├── seed_pairs.json
│   │   ├── lego_pairs.json
│   │   ├── phase5_scaffolds/
│   │   ├── phase5_outputs/
│   │   └── _segment_metadata.json
│   ├── s0101-0200/
│   │   ├── seed_pairs.json
│   │   ├── lego_pairs.json
│   │   └── ...
│   └── s0201-0300/
│       └── ...
├── merged/
│   ├── seed_pairs.json           # All segments merged
│   ├── lego_pairs.json            # Phase 4: Cross-segment dedup
│   ├── baskets.json               # Phase 5: All baskets
│   ├── introductions.json         # Phase 6: All intros
│   └── course_manifest.json       # Phase 7: Final output
└── _course_metadata.json          # Parent job tracking
```

### Segment Metadata

Each segment has `_segment_metadata.json`:

```json
{
  "segment_id": "s0001-0100",
  "course_code": "spa_for_eng",
  "seed_range": {
    "start": 1,
    "end": 100,
    "count": 100
  },
  "parent_job_id": "spa_for_eng_full_20251111",
  "phases_completed": [1, 3, 5],
  "current_phase": 6,
  "status": "in_progress",
  "created_at": "2025-11-11T18:00:00Z",
  "updated_at": "2025-11-11T18:15:00Z"
}
```

### Course Metadata

Parent job has `_course_metadata.json`:

```json
{
  "course_code": "spa_for_eng",
  "total_seeds": 668,
  "seed_range": {
    "start": 1,
    "end": 668
  },
  "segmentation": {
    "enabled": true,
    "segment_size": 100,
    "total_segments": 7,
    "segments": [
      {
        "id": "s0001-0100",
        "start": 1,
        "end": 100,
        "count": 100,
        "status": "completed",
        "phases_completed": [1, 3, 5, 6]
      },
      {
        "id": "s0101-0200",
        "start": 101,
        "end": 200,
        "count": 100,
        "status": "completed",
        "phases_completed": [1, 3, 5, 6]
      },
      {
        "id": "s0201-0300",
        "start": 201,
        "end": 300,
        "count": 100,
        "status": "in_progress",
        "phases_completed": [1, 3]
      },
      // ... remaining segments
    ]
  },
  "aggregate_progress": {
    "segments_completed": 2,
    "segments_in_progress": 1,
    "segments_pending": 4,
    "overall_percent": 29
  },
  "current_phase": 5,
  "created_at": "2025-11-11T17:00:00Z",
  "updated_at": "2025-11-11T18:30:00Z"
}
```

---

## 🚀 Workflow Modes

### Mode 1: Full Auto-Segmentation (Dashboard Orchestrated)

**Use case**: Dashboard automatically spawns all segments in parallel

```javascript
// User creates job
{
  course_code: "spa_for_eng",
  target: "spa",
  known: "eng",
  startSeed: 1,
  endSeed: 668,
  startPhase: 1,
  endPhase: 6,
  mode: "segmented"  // Enable auto-segmentation
}

// Dashboard automatically:
// 1. Creates 7 segment directories
// 2. Spawns 7 parallel orchestrator instances (one per segment)
// 3. Tracks aggregate progress
// 4. Runs Phase 4/7 merge after all segments complete
```

### Mode 2: Manual Segment Dispatch (Claude Code Web)

**Use case**: User manually opens segments in Claude Code web instances

```javascript
// Parent job created
{
  course_code: "spa_for_eng",
  startSeed: 1,
  endSeed: 668,
  mode: "manual_segments"
}

// Dashboard generates:
// 1. Segment URLs for Claude Code web
// 2. Monitoring dashboard showing segment status
// 3. Instructions for each segment

// User manually:
// 1. Opens 7 browser tabs
// 2. Navigates to claude.ai/code
// 3. Pastes segment-specific prompt in each tab
// 4. Segments run in parallel
// 5. Dashboard polls segment completion
```

### Mode 3: Hybrid (Dashboard + Manual)

**Use case**: Dashboard runs some phases, user manually runs others

```javascript
// Phase 1-3: Dashboard orchestrated
{
  startPhase: 1,
  endPhase: 3,
  mode: "segmented"
}
// → Dashboard spawns all segments in parallel

// Phase 5: Manual (user opens Claude Code instances)
// → User manually processes each segment with manual control

// Phase 6: Dashboard orchestrated again
{
  startPhase: 6,
  endPhase: 6,
  mode: "segmented"
}
```

---

## 📊 Progress Tracking (Option B)

### Job State Structure

```javascript
STATE.jobs = {
  "spa_for_eng_full_20251111": {
    jobId: "spa_for_eng_full_20251111",
    course_code: "spa_for_eng",
    mode: "segmented",

    // Segment tracking
    segmentation: {
      total_segments: 7,
      segment_size: 100,
      segments: {
        "s0001-0100": {
          status: "completed",
          progress: 100,
          current_phase: 6,
          completed_phases: [1, 3, 5, 6]
        },
        "s0101-0200": {
          status: "completed",
          progress: 100,
          current_phase: 6,
          completed_phases: [1, 3, 5, 6]
        },
        "s0201-0300": {
          status: "in_progress",
          progress: 60,
          current_phase: 5,
          completed_phases: [1, 3]
        },
        "s0301-0400": {
          status: "pending",
          progress: 0,
          current_phase: null,
          completed_phases: []
        },
        // ... 3 more segments
      }
    },

    // Aggregate progress
    progress: 43,  // Overall percentage (segments_complete / total * 100)
    status: "in_progress",
    current_phase: 5,

    // Timestamps
    created_at: "2025-11-11T17:00:00Z",
    updated_at: "2025-11-11T18:30:00Z"
  }
}
```

### UI Display

```
Course: spa_for_eng (S0001-S0668)
Phase: 5 (Practice Baskets)
Progress: 43% (3/7 segments complete)

Segment Status:
✅ s0001-0100  [████████████████████] 100% (Phase 6 complete)
✅ s0101-0200  [████████████████████] 100% (Phase 6 complete)
⏳ s0201-0300  [████████████░░░░░░░░]  60% (Phase 5 in progress)
⬜ s0301-0400  [░░░░░░░░░░░░░░░░░░░░]   0% (Pending)
⬜ s0401-0500  [░░░░░░░░░░░░░░░░░░░░]   0% (Pending)
⬜ s0501-0600  [░░░░░░░░░░░░░░░░░░░░]   0% (Pending)
⬜ s0601-0668  [░░░░░░░░░░░░░░░░░░░░]   0% (Pending)
```

---

## 🔧 Implementation Components

### 1. Segmentation Helper

**File**: `scripts/segment-coordinator.cjs`

```javascript
/**
 * Calculate segments for a course
 */
function calculateSegments(startSeed, endSeed, segmentSize = 100) {
  const segments = [];
  let currentStart = startSeed;

  while (currentStart <= endSeed) {
    const currentEnd = Math.min(currentStart + segmentSize - 1, endSeed);
    const count = currentEnd - currentStart + 1;

    segments.push({
      id: `s${String(currentStart).padStart(4, '0')}-${String(currentEnd).padStart(4, '0')}`,
      start: currentStart,
      end: currentEnd,
      count: count,
      status: 'pending',
      progress: 0
    });

    currentStart = currentEnd + 1;
  }

  return segments;
}

/**
 * Create segment directories
 */
async function createSegmentStructure(courseDir, segments) {
  for (const segment of segments) {
    const segmentDir = path.join(courseDir, 'segments', segment.id);
    await fs.ensureDir(segmentDir);
    await fs.ensureDir(path.join(segmentDir, 'phase5_scaffolds'));
    await fs.ensureDir(path.join(segmentDir, 'phase5_outputs'));

    // Write segment metadata
    await fs.writeJson(
      path.join(segmentDir, '_segment_metadata.json'),
      {
        segment_id: segment.id,
        seed_range: {
          start: segment.start,
          end: segment.end,
          count: segment.count
        },
        phases_completed: [],
        status: 'pending',
        created_at: new Date().toISOString()
      },
      { spaces: 2 }
    );
  }
}

/**
 * Update segment progress
 */
async function updateSegmentProgress(courseDir, segmentId, phase, status) {
  const metadataPath = path.join(
    courseDir,
    'segments',
    segmentId,
    '_segment_metadata.json'
  );

  const metadata = await fs.readJson(metadataPath);

  if (status === 'completed' && !metadata.phases_completed.includes(phase)) {
    metadata.phases_completed.push(phase);
  }

  metadata.current_phase = phase;
  metadata.status = status;
  metadata.updated_at = new Date().toISOString();

  await fs.writeJson(metadataPath, metadata, { spaces: 2 });
}

/**
 * Get aggregate progress
 */
async function getAggregateProgress(courseDir, segments) {
  let completedSegments = 0;
  let inProgressSegments = 0;
  let pendingSegments = 0;

  for (const segment of segments) {
    const metadata = await fs.readJson(
      path.join(courseDir, 'segments', segment.id, '_segment_metadata.json')
    );

    if (metadata.status === 'completed') completedSegments++;
    else if (metadata.status === 'in_progress') inProgressSegments++;
    else pendingSegments++;
  }

  return {
    completed: completedSegments,
    in_progress: inProgressSegments,
    pending: pendingSegments,
    total: segments.length,
    percent: Math.round((completedSegments / segments.length) * 100)
  };
}

module.exports = {
  calculateSegments,
  createSegmentStructure,
  updateSegmentProgress,
  getAggregateProgress
};
```

### 2. Segment Merge Scripts

**Phase 1 Merge**: Combine seed_pairs.json from all segments
**Phase 3 Merge**: Combine lego_pairs.json from all segments
**Phase 5 Merge**: Combine baskets from all segments
**Phase 6 Merge**: Combine introductions from all segments

---

## 🎯 Segment Dispatch URLs (Claude Code Web)

### Prompt Template for Manual Dispatch

```
# Segment Processing: spa_for_eng_s0201-0300

**Course**: Spanish for English Speakers
**Segment**: Seeds 201-300 (100 seeds)
**Parent Job**: spa_for_eng_full_20251111
**Phase**: 5 (Practice Baskets)

---

## YOUR TASK

Process this segment independently:

1. **Read segment directory**:
   `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/segments/s0201-0300`

2. **Input files**:
   - `seed_pairs.json` (seeds 201-300)
   - `lego_pairs.json` (LEGOs for this segment)

3. **Run Phase 5**:
   - Generate scaffolds: `node scripts/phase5_generate_scaffolds.cjs public/vfs/courses/spa_for_eng/segments/s0201-0300`
   - Generate baskets (spawn 5 agents, 20 seeds each)
   - GATE validation: `node scripts/phase5_gate_validator.cjs public/vfs/courses/spa_for_eng/segments/s0201-0300`
   - Remove violations: `node scripts/phase5_remove_gate_violations.cjs public/vfs/courses/spa_for_eng/segments/s0201-0300`
   - Grammar review: `node scripts/phase5_grammar_review.cjs public/vfs/courses/spa_for_eng/segments/s0201-0300`

4. **Update status**:
   Update `_segment_metadata.json` with completion status

---

This segment is independent - you don't need to wait for other segments!
```

---

## 📝 Migration Path

### Existing Courses → Segmented

For courses already in progress:

1. **Detect existing structure**
2. **Calculate segments**
3. **Migrate files to segment directories**
4. **Create metadata**
5. **Resume from current phase**

---

## 🚨 Edge Cases

### Cross-Segment Dependencies

**Problem**: Phase 5 sliding window needs previous 10 seeds

**Solution**:
- Segment boundaries designed to minimize overlap
- First 10 seeds of each segment can reference previous segment's final seeds
- Store "boundary context" in segment metadata

**Example**:
```json
// s0101-0200 metadata
{
  "boundary_context": {
    "previous_segment_seeds": [
      // Last 10 seeds from s0001-0100
      "S0091", "S0092", ..., "S0100"
    ]
  }
}
```

### Partial Segment Completion

**Problem**: Segment fails mid-phase

**Solution**:
- Each segment tracks phase completion independently
- Resume from last completed phase
- No need to reprocess completed segments

---

**Status**: ✅ **Architecture Designed - Ready for Implementation**
