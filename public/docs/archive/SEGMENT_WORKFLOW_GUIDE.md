# Segment-Based Workflow Guide

**Version**: 1.0 (2025-11-11)
**Purpose**: Step-by-step guide for processing large courses using 100-seed segments

---

## 🎯 Quick Start

When you create a job with **more than 100 seeds** or set `mode: "segmented"`, the system automatically:

1. ✅ Divides course into 100-seed segments
2. ✅ Creates segment directories with metadata
3. ✅ Prepares course metadata for aggregate tracking
4. ⏸️ **Pauses and waits for manual segment processing**

Each segment can then be processed **independently in parallel** using Claude Code web instances.

---

## 📊 When Segmentation Activates

### Automatic Segmentation
```javascript
{
  course_code: "spa_for_eng",
  target: "spa",
  known: "eng",
  startSeed: 1,
  endSeed: 668,  // > 100 seeds → auto-segmentation
  startPhase: 1,
  endPhase: 6
}
```

**Result**: 7 segments created automatically
- s0001-0100 (100 seeds)
- s0101-0200 (100 seeds)
- s0201-0300 (100 seeds)
- s0301-0400 (100 seeds)
- s0401-0500 (100 seeds)
- s0501-0600 (100 seeds)
- s0601-0668 (68 seeds)

### Manual Segmentation
```javascript
{
  course_code: "spa_for_eng",
  startSeed: 1,
  endSeed: 50,  // < 100 seeds normally
  mode: "segmented"  // Force segmentation
}
```

**Result**: Single segment created (useful for testing workflow)

---

## 🗂️ File Structure Created

```
spa_for_eng/
├── segments/
│   ├── s0001-0100/
│   │   ├── _segment_metadata.json
│   │   ├── phase5_scaffolds/
│   │   └── phase5_outputs/
│   ├── s0101-0200/
│   │   └── ...
│   └── s0201-0300/
│       └── ...
├── merged/                          # Created after segment merge
│   ├── seed_pairs.json
│   ├── lego_pairs.json
│   └── baskets.json
└── _course_metadata.json            # Parent job tracking
```

### Segment Metadata Format

`segments/s0001-0100/_segment_metadata.json`:
```json
{
  "segment_id": "s0001-0100",
  "course_code": "spa_for_eng",
  "parent_job_id": "spa_for_eng_full_20251111",
  "seed_range": {
    "start": 1,
    "end": 100,
    "count": 100
  },
  "phases_completed": [],
  "current_phase": null,
  "status": "pending",
  "progress": 0,
  "created_at": "2025-11-11T18:00:00Z",
  "updated_at": "2025-11-11T18:00:00Z"
}
```

### Course Metadata Format

`_course_metadata.json`:
```json
{
  "course_code": "spa_for_eng",
  "parent_job_id": "spa_for_eng_full_20251111",
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
        "status": "pending",
        "phases_completed": []
      }
      // ... 6 more segments
    ]
  },
  "aggregate_progress": {
    "segments_completed": 0,
    "segments_in_progress": 0,
    "segments_pending": 7,
    "segments_failed": 0,
    "overall_percent": 0
  },
  "current_phase": null,
  "created_at": "2025-11-11T17:00:00Z",
  "updated_at": "2025-11-11T17:00:00Z"
}
```

---

## 🚀 Processing Segments (Manual Dispatch)

### Step 1: Create Job in Dashboard

```javascript
{
  course_code: "spa_for_eng",
  target: "spa",
  known: "eng",
  startSeed: 1,
  endSeed: 668,
  startPhase: 1,
  endPhase: 6,
  mode: "segmented"
}
```

Dashboard will create segment structure and display:
```
✅ Created 7 segments

📋 SEGMENTED MODE ENABLED

Each segment can be processed independently in parallel.
For manual dispatch, open Claude Code web instances and process:
  - s0001-0100: Seeds 1-100 (100 seeds)
  - s0101-0200: Seeds 101-200 (100 seeds)
  - s0201-0300: Seeds 201-300 (100 seeds)
  - s0301-0400: Seeds 301-400 (100 seeds)
  - s0401-0500: Seeds 401-500 (100 seeds)
  - s0501-0600: Seeds 501-600 (100 seeds)
  - s0601-0668: Seeds 601-668 (68 seeds)

Segment directories created in: public/vfs/courses/spa_for_eng/segments
```

### Step 2: Open Claude Code Web Instances

Open 7 browser tabs (or fewer for parallel processing):
1. Navigate to https://claude.ai/code
2. Paste segment-specific prompt (see below)
3. Segments run independently in parallel

### Step 3: Segment Processing Prompts

**Example: Segment s0001-0100 (Phase 1)**

```
# Segment Processing: spa_for_eng_s0001-0100

**Course**: Spanish for English Speakers
**Segment**: Seeds 1-100 (100 seeds)
**Parent Job**: spa_for_eng_full_20251111
**Phase**: 1 (Seed Pair Translation)

---

## YOUR TASK

Process this segment independently (Phases 1-6):

**Working Directory**:
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/segments/s0001-0100

---

### Phase 1: Seed Pair Translation

1. Read phase intelligence: `docs/phase_intelligence/phase_1_seed_pairs.md`
2. Generate seed_pairs.json for seeds 1-100
3. Validate zero variation compliance (seeds 1-100)
4. Update segment metadata: `node scripts/segment-coordinator.cjs update <course_dir> s0001-0100 1 completed`

Output: `segments/s0001-0100/seed_pairs.json`

---

### Phase 3: LEGO Extraction

1. Read phase intelligence: `docs/phase_intelligence/phase_3_lego_pairs.md` (v6.0)
2. Extract LEGOs from seed_pairs.json
3. Run deduplication: `node scripts/phase3_deduplicate_legos.cjs public/vfs/courses/spa_for_eng/segments/s0001-0100`
4. Run A-before-M reordering: `node scripts/phase3_reorder_legos.cjs public/vfs/courses/spa_for_eng/segments/s0001-0100`
5. Update segment metadata: `node scripts/segment-coordinator.cjs update <course_dir> s0001-0100 3 completed`

Output: `segments/s0001-0100/lego_pairs.json`

---

### Phase 5: Practice Baskets

1. Read phase intelligence: `docs/phase_intelligence/phase_5_lego_baskets.md` (v6.0)
2. Generate scaffolds: `node scripts/phase5_generate_scaffolds.cjs public/vfs/courses/spa_for_eng/segments/s0001-0100`
3. Generate practice phrases (12-15 per LEGO, pattern-guided natural language)
4. Run GATE validation: `node scripts/phase5_gate_validator.cjs public/vfs/courses/spa_for_eng/segments/s0001-0100`
5. Remove violations: `node scripts/phase5_remove_gate_violations.cjs public/vfs/courses/spa_for_eng/segments/s0001-0100`
6. **Grammar review (seeds 1-100 ONLY)**: `node scripts/phase5_grammar_review.cjs public/vfs/courses/spa_for_eng/segments/s0001-0100`
7. Update segment metadata: `node scripts/segment-coordinator.cjs update <course_dir> s0001-0100 5 completed`

Output: `segments/s0001-0100/lego_pairs.json` (with practice_phrases embedded)

---

### Phase 6: Introductions

1. Read phase intelligence: `docs/phase_intelligence/phase_6_introductions.md`
2. Generate introduction chunks for each LEGO
3. Update segment metadata: `node scripts/segment-coordinator.cjs update <course_dir> s0001-0100 6 completed`

Output: `segments/s0001-0100/lego_pairs.json` (with introductions embedded)

---

## CRITICAL NOTES

✅ This segment is **independent** - you don't need to wait for other segments!
✅ For Phase 5 sliding window: Last 10 seeds come from previous segment boundary context
✅ Update segment metadata after each phase completion
✅ All outputs stay in segment directory until merge phase

---

When complete, report: "✅ Segment s0001-0100 complete (Phases 1-6)"
```

---

## 📊 Monitoring Progress

### Check Segment Status

```bash
node scripts/segment-coordinator.cjs report public/vfs/courses/spa_for_eng
```

**Output**:
```
============================================================
📊 SEGMENT STATUS REPORT
============================================================
Course: spa_for_eng
Seeds: 1-668 (668 total)
Segments: 7
Progress: 43% (3/7 complete)

✅ s0001-0100  [████████████████████] 100% (Complete)
✅ s0101-0200  [████████████████████] 100% (Complete)
⏳ s0201-0300  [████████████░░░░░░░░]  60% (Phase 5 in progress)
⬜ s0301-0400  [░░░░░░░░░░░░░░░░░░░░]   0% (Pending)
⬜ s0401-0500  [░░░░░░░░░░░░░░░░░░░░]   0% (Pending)
⬜ s0501-0600  [░░░░░░░░░░░░░░░░░░░░]   0% (Pending)
⬜ s0601-0668  [░░░░░░░░░░░░░░░░░░░░]   0% (Pending)

============================================================
✅ Completed: 2
⏳ In Progress: 1
⬜ Pending: 4
============================================================
```

### Update Segment Progress Manually

```bash
# Mark Phase 1 complete for segment s0001-0100
node scripts/segment-coordinator.cjs update public/vfs/courses/spa_for_eng s0001-0100 1 completed

# Mark Phase 3 in progress for segment s0201-0300
node scripts/segment-coordinator.cjs update public/vfs/courses/spa_for_eng s0201-0300 3 in_progress 50
```

### Get JSON Progress Data

```bash
node scripts/segment-coordinator.cjs progress public/vfs/courses/spa_for_eng
```

**Output**:
```json
{
  "total_segments": 7,
  "completed": 2,
  "in_progress": 1,
  "pending": 4,
  "failed": 0,
  "overall_percent": 29,
  "segments": [
    {
      "id": "s0001-0100",
      "status": "completed",
      "progress": 100,
      "current_phase": 6,
      "phases_completed": [1, 3, 5, 6]
    }
    // ... 6 more segments
  ]
}
```

---

## 🔄 Phase Independence

| Phase | Parallelizable? | Why |
|-------|----------------|-----|
| **Phase 1** | ✅ Yes | Each segment translates its own seeds |
| **Phase 3** | ✅ Yes | LEGOs extracted per segment (no cross-segment deps) |
| **Phase 5** | ✅ Yes | Baskets use sliding window (max 10-seed lookback) |
| **Phase 6** | ✅ Yes | Introductions per LEGO, segment-independent |
| **Phase 4** | ❌ No | Deduplication needs all segments' LEGOs |
| **Phase 7** | ❌ No | Final compilation of full course manifest |

**Merge Phases** (4 & 7): Wait for all segments to complete, then merge outputs.

---

## 🔀 Merging Segments

After all segments complete Phases 1-6, merge outputs:

### Phase 1 Merge: Combine seed_pairs.json

```bash
# TODO: Create merge script
node scripts/phase1-merge-segments.cjs public/vfs/courses/spa_for_eng
```

Output: `merged/seed_pairs.json` (all 668 seeds)

### Phase 3 Merge: Combine lego_pairs.json

```bash
# TODO: Create merge script
node scripts/phase3-merge-segments.cjs public/vfs/courses/spa_for_eng
```

Output: `merged/lego_pairs.json` (all LEGOs, deduplicated across segments)

### Phase 5 Merge: Combine baskets

```bash
# TODO: Create merge script
node scripts/phase5-merge-segments.cjs public/vfs/courses/spa_for_eng
```

Output: `merged/lego_pairs.json` (with all practice phrases)

### Phase 6 Merge: Combine introductions

```bash
# TODO: Create merge script
node scripts/phase6-merge-segments.cjs public/vfs/courses/spa_for_eng
```

Output: `merged/lego_pairs.json` (with all introductions)

---

## 🎯 Best Practices

### 1. Process Foundation First
Start with s0001-0100 (foundation seeds) to establish vocabulary baseline:
```bash
# s0001-0100 gets grammar review (Phase 5.5)
# Other segments skip grammar review
```

### 2. Parallel Processing
Open multiple Claude Code instances:
- 3-5 instances for moderate parallelization
- Each instance processes one segment independently
- No blocking between segments

### 3. Monitor Aggregate Progress
Check status regularly:
```bash
node scripts/segment-coordinator.cjs report public/vfs/courses/spa_for_eng
```

### 4. Incremental Quality Gates
- Complete Phase 1 for all segments → Review seed_pairs quality
- Complete Phase 3 for all segments → Review LEGO extraction
- Complete Phase 5 for all segments → Review basket quality

---

## 🚨 Troubleshooting

### Segment Fails Mid-Phase
Each segment tracks phase completion independently. To resume:
1. Check segment metadata: `cat segments/s0201-0300/_segment_metadata.json`
2. Identify last completed phase
3. Restart from next phase (don't reprocess completed phases)

### Cross-Segment Dependencies
Phase 5 sliding window needs last 10 seeds:
- **Solution**: Boundary context stored in segment metadata
- First 10 seeds of each segment reference previous segment's final seeds

### Merge Phase Failures
If merge fails:
1. Verify all segments completed required phase
2. Check segment outputs exist and are valid JSON
3. Rerun merge script for specific phase

---

## 📋 Complete Example Workflow

### Large Course (668 Seeds)

**Step 1**: Create segmented job
```javascript
{
  course_code: "spa_for_eng",
  startSeed: 1,
  endSeed: 668,
  startPhase: 1,
  endPhase: 6,
  mode: "segmented"
}
```

**Step 2**: Dashboard creates 7 segments

**Step 3**: Process segments in parallel
- Open 7 Claude Code web tabs
- Paste segment-specific prompts
- Each segment processes Phases 1, 3, 5, 6 independently

**Step 4**: Monitor progress
```bash
node scripts/segment-coordinator.cjs report public/vfs/courses/spa_for_eng
```

**Step 5**: Merge segments (after all complete)
```bash
node scripts/phase1-merge-segments.cjs public/vfs/courses/spa_for_eng
node scripts/phase3-merge-segments.cjs public/vfs/courses/spa_for_eng
node scripts/phase5-merge-segments.cjs public/vfs/courses/spa_for_eng
node scripts/phase6-merge-segments.cjs public/vfs/courses/spa_for_eng
```

**Step 6**: Final compilation (Phase 7)
```bash
# Run Phase 7 on merged outputs
node scripts/phase7-compile-course.cjs public/vfs/courses/spa_for_eng
```

---

**Status**: ✅ **Segmentation Complete - Ready for Use**
