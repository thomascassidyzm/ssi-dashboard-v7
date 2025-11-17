# Course Validator

A comprehensive system for validating SSi course pipelines, identifying missing components, and triggering phase reruns.

## Overview

The Course Validator checks each course for completeness across all pipeline phases:
- **Phase 1**: Seed Generation (`seed_pairs.json`)
- **Phase 3**: LEGO Extraction (`lego_pairs.json`)
- **Phase 4**: Basket & Introduction Generation (`lego_baskets.json`, `introductions.json`)
- **Phase 5**: Scaffold Generation (`phase5_outputs/`, `phase5_scaffolds/`)

## Components

### 1. Backend Module (`course-validator.cjs`)

Core validation logic that:
- Checks for required files and directories per phase
- Validates phase prerequisites and dependencies
- Generates actionable recommendations
- Provides detailed reports on course status

**Usage:**
```bash
# Validate a specific course
node course-validator.cjs cmn_for_eng

# Validate all courses
node course-validator.cjs
```

### 2. API Endpoints (`automation_server.cjs`)

#### `GET /api/courses/validate/all`
Returns validation status for all courses in the VFS.

**Response:**
```json
{
  "timestamp": "2025-11-15T21:37:32.800Z",
  "courses": {
    "cmn_for_eng": { ... },
    "spa_for_eng": { ... }
  }
}
```

#### `GET /api/courses/:courseCode/validate`
Returns detailed validation report for a specific course.

**Response:**
```json
{
  "courseCode": "cmn_for_eng",
  "exists": true,
  "completedPhases": ["phase_1", "phase_3"],
  "nextPhase": "phase_4",
  "canProgress": true,
  "summary": {
    "total_phases": 4,
    "completed": 2,
    "missing": 2,
    "progress_percentage": 50
  },
  "recommendations": [
    {
      "priority": "high",
      "action": "run_phase_4",
      "phase": "phase_4",
      "name": "Phase 4: Basket & Introduction Generation",
      "missing": [
        { "type": "file", "name": "lego_baskets.json" },
        { "type": "file", "name": "introductions.json" }
      ]
    }
  ]
}
```

#### `POST /api/courses/:courseCode/rerun/:phase`
Initiates a rerun of a specific phase.

**Supported phases:**
- `phase_1` - Seeds generation (multi-step workflow)
- `phase_4` - Baskets & Introductions generation
- `phase_5` - Scaffolds generation

**Response:**
```json
{
  "message": "Ready to trigger phase_4 for cmn_for_eng",
  "redirectUrl": "/api/courses/cmn_for_eng/baskets/generate",
  "jobInfo": {
    "courseCode": "cmn_for_eng",
    "phase": "phase_4",
    "status": "initiated",
    "timestamp": "2025-11-15T21:40:00.000Z",
    "action": "baskets_generation"
  },
  "instructions": "POST to /api/courses/cmn_for_eng/baskets/generate to start the job"
}
```

### 3. UI Component (`src/views/CourseValidator.vue`)

Interactive dashboard for course validation with:
- Overview of all courses with progress indicators
- Detailed phase-by-phase validation view
- Missing component detection
- One-click phase triggering
- Real-time status updates

**Access:**
- All courses: `/validate`
- Specific course: `/validate/:courseCode`

## Features

### Validation Logic

The validator checks for:
1. **File Existence**: Required JSON files for each phase
2. **Directory Existence**: Required directories (phase5_outputs, etc.)
3. **Prerequisites**: Ensures phases are run in correct order
4. **Blocking Detection**: Identifies phases blocked by missing prerequisites

### Progress Tracking

Each course shows:
- Completed phases count (e.g., 2/4)
- Progress percentage
- Next actionable phase
- Blocked phases with reasons

### Smart Recommendations

The system provides actionable recommendations:
- **High Priority**: Missing phases that can be run immediately
- **Info**: Phases blocked by missing prerequisites
- Detailed list of missing files/directories

### Phase Triggering

One-click buttons to:
- Trigger missing phases
- Navigate to appropriate workflow steps
- Validate prerequisites before execution

## Testing

Run the test script to verify all endpoints:
```bash
./test-validator-api.sh
```

Or test manually:
```bash
# Test validation
curl http://localhost:3456/api/courses/cmn_for_eng/validate | jq

# Test phase trigger
curl -X POST http://localhost:3456/api/courses/cmn_for_eng/rerun/phase_4 | jq
```

## Example Outputs

### Complete Course (spa_for_eng)
```json
{
  "courseCode": "spa_for_eng",
  "completedPhases": ["phase_1", "phase_3", "phase_4", "phase_5"],
  "nextPhase": null,
  "canProgress": false,
  "summary": {
    "progress_percentage": 100
  }
}
```

### Incomplete Course (cmn_for_eng)
```json
{
  "courseCode": "cmn_for_eng",
  "completedPhases": ["phase_1", "phase_3"],
  "nextPhase": "phase_4",
  "canProgress": true,
  "summary": {
    "progress_percentage": 50
  },
  "missing": [
    {
      "phase": "phase_4",
      "name": "Phase 4: Basket & Introduction Generation",
      "items": [
        { "type": "file", "name": "lego_baskets.json" },
        { "type": "file", "name": "introductions.json" }
      ]
    }
  ]
}
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│         CourseValidator.vue (UI)                │
│  - Course selection dropdown                    │
│  - Progress visualization                       │
│  - Missing component alerts                     │
│  - Phase trigger buttons                        │
└─────────────────┬───────────────────────────────┘
                  │
                  │ HTTP GET/POST
                  ▼
┌─────────────────────────────────────────────────┐
│      automation_server.cjs (API Layer)          │
│  - GET /api/courses/validate/all                │
│  - GET /api/courses/:code/validate              │
│  - POST /api/courses/:code/rerun/:phase         │
└─────────────────┬───────────────────────────────┘
                  │
                  │ require()
                  ▼
┌─────────────────────────────────────────────────┐
│     course-validator.cjs (Core Logic)           │
│  - validateCourse()                             │
│  - validateAllCourses()                         │
│  - generateReport()                             │
│  - getRecommendations()                         │
└─────────────────┬───────────────────────────────┘
                  │
                  │ File System Access
                  ▼
┌─────────────────────────────────────────────────┐
│           VFS (public/vfs/courses/)             │
│  ├── cmn_for_eng/                               │
│  │   ├── seed_pairs.json                        │
│  │   ├── lego_pairs.json                        │
│  │   └── phase5_outputs/                        │
│  └── spa_for_eng/                               │
│      ├── seed_pairs.json                        │
│      ├── lego_pairs.json                        │
│      ├── lego_baskets.json                      │
│      ├── introductions.json                     │
│      └── phase5_outputs/                        │
└─────────────────────────────────────────────────┘
```

## Next Steps

To fully integrate phase triggering:
1. Implement Phase 3 (LEGO extraction) automation endpoint
2. Add webhook support for real-time progress updates
3. Integrate with existing job queue system
4. Add email/notification support for completed phases
5. Create batch validation/rerun capabilities

## Development

To add support for new phases:
1. Update `PHASE_REQUIREMENTS` in `course-validator.cjs`
2. Add phase mapping in `/api/courses/:code/rerun/:phase` endpoint
3. Update UI labels in `CourseValidator.vue`
4. Add corresponding execution endpoints

## Notes

- The validator is read-only by default; phase triggers are safe and require confirmation
- Phase 3 (LEGO extraction) reruns require manual intervention currently
- Phase prerequisites are strictly enforced to prevent pipeline corruption
- All validation is performed against the local VFS, not S3
