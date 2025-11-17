# Segmentation Feature - Quick Reference

**Version**: 1.0 (2025-11-11)
**Status**: ✅ Production Ready

---

## 🎯 What Is Segmentation?

Automatic division of large courses into **100-seed segments** that can be processed **in parallel** across multiple Claude Code web instances.

**Key Benefit**: Process a 668-seed course in 7 parallel browser windows instead of one sequential workflow.

---

## 🚀 Quick Start

### 1. Create a Segmented Job

**Automatic (> 100 seeds)**:
```javascript
{
  course_code: "spa_for_eng",
  target: "spa",
  known: "eng",
  startSeed: 1,
  endSeed: 668,  // > 100 → auto-segmentation
  startPhase: 1,
  endPhase: 6
}
```

**Manual (force segmentation)**:
```javascript
{
  course_code: "spa_for_eng",
  startSeed: 1,
  endSeed: 50,
  mode: "segmented"  // Explicit trigger
}
```

### 2. Dashboard Creates Segments

```
✅ Created 7 segments

📋 SEGMENTED MODE ENABLED
  - s0001-0100: Seeds 1-100 (100 seeds)
  - s0101-0200: Seeds 101-200 (100 seeds)
  - s0201-0300: Seeds 201-300 (100 seeds)
  - s0301-0400: Seeds 301-400 (100 seeds)
  - s0401-0500: Seeds 401-500 (100 seeds)
  - s0501-0600: Seeds 501-600 (100 seeds)
  - s0601-0668: Seeds 601-668 (68 seeds)
```

### 3. Process Segments in Parallel

Open 7 Claude Code web instances (https://claude.ai/code) and paste segment-specific prompts.

See: `docs/SEGMENT_WORKFLOW_GUIDE.md` for complete prompts.

### 4. Monitor Progress

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
```

---

## 📋 CLI Commands

### Create Segment Structure
```bash
node scripts/segment-coordinator.cjs create \
  public/vfs/courses/spa_for_eng \
  spa_for_eng \
  1 \
  668 \
  spa_for_eng_full_20251111
```

### Update Segment Progress
```bash
# Mark Phase 1 complete
node scripts/segment-coordinator.cjs update \
  public/vfs/courses/spa_for_eng \
  s0001-0100 \
  1 \
  completed

# Mark Phase 3 in progress (60% done)
node scripts/segment-coordinator.cjs update \
  public/vfs/courses/spa_for_eng \
  s0201-0300 \
  3 \
  in_progress \
  60
```

### Display Visual Report
```bash
node scripts/segment-coordinator.cjs report public/vfs/courses/spa_for_eng
```

### Get JSON Progress Data
```bash
node scripts/segment-coordinator.cjs progress public/vfs/courses/spa_for_eng
```

---

## 📁 File Structure

```
spa_for_eng/
├── segments/
│   ├── s0001-0100/
│   │   ├── _segment_metadata.json
│   │   ├── seed_pairs.json          # Phase 1 output
│   │   ├── lego_pairs.json          # Phase 3 output
│   │   ├── phase5_scaffolds/
│   │   └── phase5_outputs/
│   ├── s0101-0200/
│   │   └── ...
│   └── s0601-0668/
│       └── ...
├── merged/                           # Created after merge
│   ├── seed_pairs.json              # All segments combined
│   ├── lego_pairs.json              # Deduplicated across segments
│   └── baskets.json                 # All baskets
└── _course_metadata.json            # Parent job tracking
```

---

## 📊 Phase Independence

| Phase | Parallel? | Reason |
|-------|-----------|--------|
| 1 | ✅ | Each segment translates its own seeds |
| 3 | ✅ | LEGOs extracted independently |
| 5 | ✅ | Baskets use sliding window (10-seed lookback) |
| 6 | ✅ | Introductions per LEGO |
| 4 | ❌ | Deduplication needs all segments |
| 7 | ❌ | Final compilation |

**Phases 1, 3, 5, 6**: Process in parallel per segment
**Phases 4, 7**: Merge all segments, then process

---

## 🔧 Implementation Files

### Core Logic
- `scripts/segment-coordinator.cjs` - Segment management and CLI
- `orchestrator-workflow.cjs` - Workflow integration

### Documentation
- `docs/SEGMENT_ARCHITECTURE.md` - Architecture design
- `docs/SEGMENT_WORKFLOW_GUIDE.md` - User guide with prompts
- `docs/SEGMENTATION_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `docs/VERSION_AUDIT.md` - Version tracking

---

## ✅ What's Implemented

- ✅ Automatic 100-seed segmentation (seeds > 100)
- ✅ Manual segmentation trigger (mode: "segmented")
- ✅ Segment directory structure creation
- ✅ Metadata tracking (segment + course level)
- ✅ Progress monitoring CLI
- ✅ Visual progress report
- ✅ JSON progress export
- ✅ Orchestrator workflow integration
- ✅ Comprehensive documentation

---

## ⏸️ Future Work

- Segment merge scripts (Phases 1, 3, 5, 6)
- Dashboard UI integration
- Automated browser instance spawning
- Cross-segment boundary context
- Phase 4 merge deduplication
- Phase 7 final compilation

---

## 📚 Documentation Links

**Quick Reference**: This file
**Architecture**: `docs/SEGMENT_ARCHITECTURE.md`
**User Guide**: `docs/SEGMENT_WORKFLOW_GUIDE.md`
**Implementation**: `docs/SEGMENTATION_IMPLEMENTATION_SUMMARY.md`
**Phase Selection**: `docs/PHASE_SELECTION.md`
**Version Audit**: `docs/VERSION_AUDIT.md`

---

## 🎯 Use Cases

### Use Case 1: Large Course (668 Seeds)
```javascript
{ startSeed: 1, endSeed: 668 }
// → 7 segments, process in parallel
```

### Use Case 2: Foundation Only (Seeds 1-100)
```javascript
{ startSeed: 1, endSeed: 100 }
// → No segmentation (single 100-seed chunk)
```

### Use Case 3: Resume from Seed 101
```javascript
{ startSeed: 101, endSeed: 668 }
// → 6 segments (s0101-0200, ..., s0601-0668)
```

### Use Case 4: Test Segmentation
```javascript
{ startSeed: 1, endSeed: 50, mode: "segmented" }
// → Single segment s0001-0050 (forced)
```

---

## 🚨 Important Notes

1. **Segmentation activates automatically for courses > 100 seeds**
2. **Workflow pauses after creating segment structure** - manual processing required
3. **Each segment is independent** - process in any order
4. **Foundation seeds (1-100) get grammar review** - other segments skip it
5. **Merge phases (4, 7) run after all segments complete**
6. **Update metadata after each phase** to track progress

---

**Status**: ✅ **Production Ready - Start Processing Segments!**
