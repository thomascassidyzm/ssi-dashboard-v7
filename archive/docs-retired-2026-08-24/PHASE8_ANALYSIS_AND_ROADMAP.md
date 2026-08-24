# Phase 8 Audio Generation: Analysis and Roadmap

## Executive Summary

The current Phase 8 audio generation system works but has significant fragility issues:
1. **UUID inconsistency** - 3 different formats historically used
2. **Cache timing mismatches** - Plan (5min) vs S3 index (24h)
3. **Duplicate processing** - Same analysis runs twice (plan + execute)
4. **No S3 index invalidation** - New uploads invisible for up to 24h
5. **MAR/Manifest/S3 sync gaps** - Data can be out of sync

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD (React)                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │  audio-server:3465      │
         │  - POST /plan           │
         │  - POST /start          │
         │  - GET /status          │
         │  - DELETE /job          │
         └────────────┬────────────┘
                      │
         ┌────────────┴────────────┐
         │  phase8-audio-gen.cjs   │
         │  - analyzeRequirements  │
         │  - generateAudioForCourse│
         │  - Phase A (targets)    │
         │  - Phase B (presentations)│
         └────────────┬────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───┴───┐       ┌─────┴─────┐     ┌─────┴─────┐
│  MAR  │       │ S3 Index  │     │  Manifest │
│ temp/ │       │  (24h)    │     │  public/  │
└───────┘       └───────────┘     └───────────┘
```

## Identified Vulnerabilities

### Critical Issues

| Issue | Impact | Root Cause |
|-------|--------|------------|
| S3 index 24h cache | New uploads invisible | Optimization over correctness |
| Voice overrides not persisted | Plan/execute mismatch | Missing data in approvedPlans cache |
| 3 UUID formats | Lookup failures | Historical inconsistency |
| No index invalidation after upload | Stale data | Missing lifecycle hook |

### Medium Issues

| Issue | Impact | Root Cause |
|-------|--------|------------|
| Plan cache 5min vs S3 index 24h | Confusing state | Different TTLs |
| Double analysis (plan + start) | Inefficiency | Manifest not saved after plan |
| Presentation service separate logic | Divergent behavior | Copy-paste code |
| MAR out of sync with S3 | Missing audio metadata | No unified update |

### UUID Format History

```javascript
// Format 1: "Wrong" - text|role|cadence (no language!)
const wrongKey = `${text}|${role}|${cadence}`;

// Format 2: Legacy - text|lang|role|cadence
const legacyKey = `${text}|${language}|${role}|${cadence}`;

// Format 3: Current - text|lang|role|cadence|voiceId
const currentKey = `${text}|${language}|${role}|${cadence}|${voiceId}`;
```

All three exist in S3. Lookup must try all three.

## Comparison: Current vs New App Format

| Aspect | Dashboard v7.7.0 | Learning App APML v1.1.0 |
|--------|------------------|--------------------------|
| Structure | Slice-based, compressed arrays | Seed-based, object format |
| Audio refs | Massive centralized manifest | Per-item UUID + URL |
| LEGO types | B/C/D (grammar) | A/M (atomic/molecular) |
| Phrase markers | Implicit (position) | Explicit (is_component, is_debut) |
| Manifest size | 662K lines | ~10K lines estimated |

### Transformation Required

```
lego_pairs.json (v7.7.0) ─┐
                          ├──► APML v1.1.0 course manifest
lego_baskets.json ────────┤
                          │
Audio UUID registry ──────┘
```

## Recommended Fixes

### Phase 1: Immediate Stability

1. **Reduce S3 index cache to 5 minutes**
   - Match plan cache TTL
   - Add manual refresh endpoint

2. **Invalidate S3 index after upload**
   - Call `invalidateS3Index()` after `uploadToS3()`

3. **Persist voice overrides in approvedPlans**
   ```javascript
   approvedPlans.set(courseCode, {
     plan,
     voices,  // ADD THIS
     createdAt: Date.now(),
     approved: false
   });
   ```

4. **Add multi-format UUID lookup**
   ```javascript
   function findUUID(text, lang, role, cadence, voiceId, s3Set) {
     // Try all 3 formats
     const formats = [
       generateCurrentUUID(text, lang, role, cadence, voiceId),
       generateLegacyUUID(text, lang, role, cadence),
       generateWrongUUID(text, role, cadence)
     ];
     return formats.find(uuid => s3Set.has(uuid));
   }
   ```

### Phase 2: Consolidation

1. **Unify UUID checking**
   - Single function used by orchestrator AND presentation service
   - Returns { uuid, source: 'current'|'legacy'|'wrong' }

2. **Single MAR update point**
   - All audio metadata flows through mar-service
   - MAR becomes Single Source of Truth

3. **Save manifest after plan**
   - Avoid re-analysis on /start
   - Store voice assignments in manifest

### Phase 3: New Format Support

1. **Build APML transformer**
   - Input: lego_pairs.json + lego_baskets.json + audio registry
   - Output: APML v1.1.0 course manifest

2. **Dual-write manifests**
   - Continue generating current format (backwards compat)
   - Also generate new APML format

3. **Audio URL builder**
   - Map UUID → S3 URL
   - Support multiple CDN endpoints

## UX Improvements Needed

### Current Pain Points

1. **Progress is opaque** - User sees "running" but no details
2. **Failures unclear** - "Failed" with no actionable info
3. **No cost breakdown** - Just total, not per-phase
4. **No resume capability** - Must restart from beginning
5. **Manual refresh needed** - No real-time updates

### Proposed UX (frontend-design plugin)

1. **Phase timeline visualization**
   - Phase A (targets) → QC → Phase B (presentations) → Upload
   - Each phase shows: count, progress %, time elapsed

2. **Sample-level progress**
   - "Generating 234/1000 target1 samples..."
   - Failed samples highlighted, retryable

3. **Cost tracking in real-time**
   - Running total by provider (Azure/ElevenLabs)
   - Per-phase breakdown

4. **Error recovery**
   - "3 samples failed - Retry | Skip | View details"
   - Partial completion saves progress

5. **WebSocket for real-time updates**
   - No polling, instant feedback
   - Connection status indicator

## Migration Path

### Backwards Compatibility Strategy

```
                    ┌────────────────────┐
                    │  lego_pairs.json   │
                    │  lego_baskets.json │
                    │  (current format)  │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
     ┌────────────────┐ ┌──────────┐ ┌───────────────┐
     │ course_manifest│ │   MAR    │ │ APML v1.1.0   │
     │ (v8.2.0)       │ │ (audio)  │ │ (new format)  │
     │ (legacy apps)  │ │          │ │ (new apps)    │
     └────────────────┘ └──────────┘ └───────────────┘
```

1. **Keep generating legacy format** for existing apps
2. **Add APML transformer** for new app
3. **Single audio generation pipeline** feeds both
4. **Gradually deprecate** v8.2.0 manifest

## Implementation Priority

### Week 1: Critical Fixes
- [ ] Reduce S3 index cache to 5min
- [ ] Add S3 index invalidation after upload
- [ ] Persist voice overrides in plan cache
- [ ] Add multi-format UUID lookup

### Week 2: Consolidation
- [ ] Unify UUID checking functions
- [ ] Single MAR update flow
- [ ] Save manifest after plan

### Week 3: UX Improvements
- [ ] Phase timeline component
- [ ] Sample-level progress
- [ ] Error recovery UI

### Week 4: New Format
- [ ] APML v1.1.0 transformer
- [ ] Dual-write manifests
- [ ] Integration testing

## Success Metrics

1. **Zero UUID lookup failures** - Multi-format lookup catches everything
2. **Real-time progress** - Users see exactly what's happening
3. **< 5 min stale data** - Cache alignment eliminates confusion
4. **Both formats generated** - Legacy and new apps served
5. **Recoverable failures** - No full restarts needed

---

*Document created: 2025-12-04*
*Last updated: 2025-12-04*
