# Brief: Intelligent Course Resume System

**Mission**: Load any course from VFS, assess completion status, and continue from where it left off.

---

## Problem

Currently:
- Courses can be partially generated (e.g., Spanish has Phase 1 done, Phase 3 started)
- `course_metadata.json` exists but `phases_completed: []` is not updated
- No automated way to detect "where are we?" and resume intelligently
- If generation stops mid-phase, we have to manually figure out what's done

---

## Solution: Course Status Scanner + Resume Logic

### Phase 1: Status Scanner Function

Create: `automation_server.cjs` → `async function scanCourseStatus(courseCode)`

**Returns**:
```javascript
{
  courseCode: "spa_for_eng_668seeds",
  metadata: { /* from course_metadata.json */ },
  phases: {
    "0": { status: "complete", files: 1, expected: 1 },  // phase_0_intelligence.json
    "1": { status: "complete", files: 668, expected: 668 },  // translations/
    "2": { status: "complete", files: 1, expected: 1 },  // phase_2_corpus_intelligence.json
    "3": { status: "incomplete", files: 55, expected: "~400-600" },  // legos/
    "3.5": { status: "not_started", files: 0, expected: 1 },  // phase_3.5_lego_graph.json
    "4": { status: "not_started", files: 0, expected: "~300-500" },  // legos_deduplicated/
    "5": { status: "not_started", files: 0, expected: "~300-500" },  // baskets/
    "6": { status: "not_started", files: 0, expected: "~300-500" }   // introductions/
  },
  nextPhase: "3",  // Resume from here
  completionPercentage: 32
}
```

**Logic**:

```javascript
async function scanCourseStatus(courseCode) {
  const courseDir = path.join(VFS_BASE, 'courses', courseCode);

  // Check metadata
  const metadataPath = path.join(courseDir, 'course_metadata.json');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

  // Scan phase outputs
  const phaseOutputs = path.join(courseDir, 'phase_outputs');
  const aminoAcids = path.join(courseDir, 'amino_acids');

  const status = {
    "0": await checkPhaseOutput(phaseOutputs, 'phase_0_intelligence.json'),
    "1": await checkAminoAcids(aminoAcids, 'translations', metadata.total_seeds),
    "2": await checkPhaseOutput(phaseOutputs, 'phase_2_corpus_intelligence.json'),
    "3": await checkAminoAcids(aminoAcids, 'legos'),
    "3.5": await checkPhaseOutput(phaseOutputs, 'phase_3.5_lego_graph.json'),
    "4": await checkAminoAcids(aminoAcids, 'legos_deduplicated'),
    "5": await checkAminoAcids(aminoAcids, 'baskets'),
    "6": await checkAminoAcids(aminoAcids, 'introductions')
  };

  // Determine next phase
  const phases = ['0', '1', '2', '3', '3.5', '4', '5', '6'];
  let nextPhase = null;
  for (const phase of phases) {
    if (status[phase].status !== 'complete') {
      nextPhase = phase;
      break;
    }
  }

  return {
    courseCode,
    metadata,
    phases: status,
    nextPhase,
    completionPercentage: calculateCompletion(status)
  };
}

async function checkPhaseOutput(dir, filename) {
  const filepath = path.join(dir, filename);
  try {
    const stats = await fs.stat(filepath);
    return { status: 'complete', files: 1, expected: 1, size: stats.size };
  } catch (e) {
    return { status: 'not_started', files: 0, expected: 1 };
  }
}

async function checkAminoAcids(dir, subdir, expectedCount = null) {
  const fullPath = path.join(dir, subdir);
  try {
    const files = await fs.readdir(fullPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const count = jsonFiles.length;

    let status = 'not_started';
    if (count > 0 && expectedCount && count >= expectedCount) {
      status = 'complete';
    } else if (count > 0) {
      status = 'incomplete';
    }

    return { status, files: count, expected: expectedCount || '?' };
  } catch (e) {
    return { status: 'not_started', files: 0, expected: expectedCount || '?' };
  }
}
```

---

### Phase 2: Resume Endpoint

Create: `POST /api/courses/:courseCode/resume`

**Request**:
```json
{
  "forcePhase": "3"  // Optional: force start from specific phase
}
```

**Response**:
```json
{
  "status": "resumed",
  "courseCode": "spa_for_eng_668seeds",
  "resumingFrom": "3",
  "currentStatus": { /* from scanCourseStatus */ }
}
```

**Logic**:
1. Call `scanCourseStatus(courseCode)`
2. Determine next phase (or use `forcePhase` if provided)
3. Generate orchestrator brief for that phase onward
4. Spawn agent (same as regular generation)
5. Update job tracking

---

### Phase 3: Update Metadata After Each Phase

Modify: `spawnPhaseAgent()` or create: `markPhaseComplete(courseCode, phase)`

**After each phase completes**:
1. Update `course_metadata.json`:
```javascript
async function markPhaseComplete(courseCode, phase) {
  const metadataPath = path.join(VFS_BASE, 'courses', courseCode, 'course_metadata.json');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

  if (!metadata.phases_completed.includes(phase)) {
    metadata.phases_completed.push(phase);
  }

  metadata.last_updated = new Date().toISOString();

  // Update status
  const allPhases = ['0', '1', '2', '3', '3.5', '4', '5', '6'];
  if (metadata.phases_completed.length === allPhases.length) {
    metadata.status = 'complete';
  } else {
    metadata.status = 'in_progress';
  }

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}
```

---

### Phase 4: Dashboard UI for Resume

Add button to Course Visualization page:

```vue
<template>
  <div v-if="courseStatus.nextPhase">
    <div class="alert warning">
      Course incomplete: Phase {{ courseStatus.nextPhase }} pending
    </div>
    <button @click="resumeCourse">
      Resume from Phase {{ courseStatus.nextPhase }}
    </button>
  </div>
</template>

<script>
async function resumeCourse() {
  const response = await api.post(`/api/courses/${courseCode}/resume`);
  // Show progress monitor
}
</script>
```

---

## Implementation Steps

1. **Add `scanCourseStatus()` function** to automation_server.cjs
2. **Create `/api/courses/:code/status` endpoint** - returns current status
3. **Create `/api/courses/:code/resume` endpoint** - resumes generation
4. **Add `markPhaseComplete()` function** - updates metadata after each phase
5. **Update orchestrator brief generator** - support "start from phase X"
6. **Add Resume UI** to dashboard course viewer
7. **Test with Spanish course** - resume from Phase 3

---

## Test Plan

### Test 1: Status Detection
```bash
# Spanish course (Phase 1 complete, Phase 3 partial)
curl localhost:54321/api/courses/spa_for_eng_668seeds/status

# Expected:
{
  "phases": {
    "0": { "status": "complete", "files": 1 },
    "1": { "status": "complete", "files": 668 },
    "3": { "status": "incomplete", "files": 55 }
  },
  "nextPhase": "3"
}
```

### Test 2: Resume from Phase 3
```bash
curl -X POST localhost:54321/api/courses/spa_for_eng_668seeds/resume

# Should:
# - Spawn agent for Phase 3 (continue LEGO extraction)
# - Complete remaining ~400-600 LEGOs
# - Move to Phase 3.5, 4, 5, 6
```

### Test 3: Metadata Update
After Phase 3 completes:
```bash
cat vfs/courses/spa_for_eng_668seeds/course_metadata.json

# Should show:
{
  "phases_completed": ["0", "1", "2", "3"],
  "status": "in_progress"
}
```

---

## Edge Cases

1. **Phase partially complete** (e.g., 300/668 translations)
   - Resume should regenerate entire phase OR skip existing files
   - Recommendation: Skip existing (deterministic UUIDs prevent duplicates)

2. **Corrupted phase output**
   - Status scanner should validate file contents, not just count
   - If JSON invalid, mark phase as "corrupted" → needs regeneration

3. **Force restart from Phase 0**
   - Option: `forcePhase: "0"` + `deleteExisting: true`
   - Clears VFS and starts fresh

4. **Multiple phases incomplete**
   - Always resume from earliest incomplete phase
   - Can't skip Phase 3 and jump to Phase 5 (dependencies)

---

## Deliverable

**Files to create/modify**:

1. `automation_server.cjs`:
   - Add `scanCourseStatus()`
   - Add `GET /api/courses/:code/status`
   - Add `POST /api/courses/:code/resume`
   - Add `markPhaseComplete()`

2. `src/views/CourseEditor.vue` (or visualization page):
   - Add status display
   - Add "Resume" button

3. Test with Spanish course:
   - Resume from Phase 3
   - Verify completes through Phase 6
   - Verify metadata updated correctly

**Success Criteria**:
- ✅ Can detect course status automatically
- ✅ Can resume from any incomplete phase
- ✅ Metadata updates after each phase
- ✅ UI shows resume button when course incomplete
- ✅ Spanish course completes successfully

---

## Why This Matters

1. **Resilience**: If generation crashes, don't lose progress
2. **Iterative Development**: Can stop, fix APML, resume
3. **Testing**: Generate first 3 phases, validate, then continue
4. **Debugging**: Can restart specific phases without full regeneration
5. **User Experience**: Dashboard shows clear status + action to take

---

**Build this now before generating Chinese course - it will make the 668-seed generation much safer.**
