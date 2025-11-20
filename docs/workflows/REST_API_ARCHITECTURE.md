# REST API Architecture for SSI Phase Servers

**Date:** 2025-11-20
**Purpose:** Unified REST API pattern for all agent-to-server communication

---

## Current State

### ✅ Phase 1 (Implemented)
```
GET  /api/canonical-seeds?limit=N&start=M
GET  /api/phase-intelligence/1
POST /api/phase1/:courseCode/submit
```

### ⚠️ Other Phases (Partial/Missing)
- Phase 3, 5, 5.5, 7, 8: Mixed git/branch-based workflows
- Inconsistent data exchange patterns
- Complex branch watching and merging

---

## Target Architecture

### **Unified Pattern for All Phases:**

```
# Input Data (GET)
GET /api/courses/:courseCode/phase-outputs/:phase/:file
GET /api/phase-intelligence/:phase

# Submit Work (POST)
POST /api/phase:N/:courseCode/submit

# Status/Health
GET /api/phase:N/:courseCode/status
GET /api/phase:N/health
```

---

## Phase-by-Phase API Specification

### **Phase 1: Translation**

**Agent Needs:**
- Canonical seeds
- Phase 1 methodology

**Agent Produces:**
- `seed_pairs.json`

**Endpoints:**
```javascript
// ✅ Already implemented
GET  /api/canonical-seeds?limit=N&start=M
GET  /api/phase-intelligence/1
POST /api/phase1/:courseCode/submit
  Body: { version, course, target_language, known_language, generated, total_seeds, translations }
  Returns: { success, seedCount, savedTo }
```

---

### **Phase 3: LEGO Extraction + Introductions**

**Agent Needs:**
- seed_pairs.json (from Phase 1)
- Phase 3 methodology

**Agent Produces:**
- `lego_pairs.json`
- `introductions.json`

**Endpoints:**
```javascript
// GET seed_pairs from previous phase
GET /api/courses/:courseCode/phase-outputs/1/seed_pairs.json
  Returns: Full seed_pairs.json

// GET methodology
GET /api/phase-intelligence/3
  Returns: { phase, filename, content, format }

// POST completed work
POST /api/phase3/:courseCode/submit
  Body: {
    lego_pairs: { version, course, ... },
    introductions: { version, course, ... }
  }
  Returns: { success, legoCount, introCount, savedTo }
```

---

### **Phase 5: Basket Generation**

**Agent Needs:**
- lego_pairs.json (from Phase 3)
- introductions.json (from Phase 3)
- Phase 5 methodology

**Agent Produces:**
- `lego_baskets.json`

**Endpoints:**
```javascript
// GET previous phase outputs
GET /api/courses/:courseCode/phase-outputs/3/lego_pairs.json
GET /api/courses/:courseCode/phase-outputs/3/introductions.json

// GET methodology
GET /api/phase-intelligence/5

// POST completed work
POST /api/phase5/:courseCode/submit
  Body: { version, course, baskets: [...] }
  Returns: { success, basketCount, savedTo }
```

---

### **Phase 5.5: Grammar Validation**

**Agent Needs:**
- lego_baskets.json (from Phase 5)
- Phase 5.5 methodology

**Agent Produces:**
- Validation report / corrections

**Endpoints:**
```javascript
// GET previous phase output
GET /api/courses/:courseCode/phase-outputs/5/lego_baskets.json

// GET methodology
GET /api/phase-intelligence/5.5

// POST validation results
POST /api/phase5.5/:courseCode/submit
  Body: { validationReport, corrections, status }
  Returns: { success, issuesFound, correctionsMade }
```

---

### **Phase 7: Manifest Compilation**

**Agent Needs:**
- seed_pairs.json (Phase 1)
- lego_pairs.json (Phase 3)
- lego_baskets.json (Phase 5)
- introductions.json (Phase 3)
- Phase 7 methodology

**Agent Produces:**
- `course_manifest.json`

**Endpoints:**
```javascript
// GET all previous outputs (convenience endpoint)
GET /api/courses/:courseCode/phase-outputs
  Returns: {
    phase1: { seed_pairs: {...} },
    phase3: { lego_pairs: {...}, introductions: {...} },
    phase5: { lego_baskets: {...} }
  }

// OR individual files
GET /api/courses/:courseCode/phase-outputs/1/seed_pairs.json
GET /api/courses/:courseCode/phase-outputs/3/lego_pairs.json
GET /api/courses/:courseCode/phase-outputs/3/introductions.json
GET /api/courses/:courseCode/phase-outputs/5/lego_baskets.json

// GET methodology
GET /api/phase-intelligence/7

// POST compiled manifest
POST /api/phase7/:courseCode/submit
  Body: { version, course, manifest: {...} }
  Returns: { success, totalPhrases, savedTo }
```

---

### **Phase 8: Audio Generation**

**Agent Needs:**
- course_manifest.json (Phase 7)
- Phase 8 methodology

**Agent Produces:**
- Audio files metadata (actual files may be uploaded separately)

**Endpoints:**
```javascript
// GET manifest
GET /api/courses/:courseCode/phase-outputs/7/course_manifest.json

// GET methodology
GET /api/phase-intelligence/8

// POST audio generation results
POST /api/phase8/:courseCode/submit
  Body: { version, course, audioFiles: [...], metadata: {...} }
  Returns: { success, fileCount, totalDuration }
```

---

## Generic Endpoints (All Phases)

### **GET Phase Intelligence**
```javascript
GET /api/phase-intelligence/:phase
  Params: phase = "1" | "3" | "5" | "5.5" | "7" | "8"
  Returns: { phase, filename, content, format: "markdown" }
```

### **GET Previous Phase Outputs**
```javascript
// Specific file
GET /api/courses/:courseCode/phase-outputs/:phase/:file
  Example: /api/courses/hun_for_eng/phase-outputs/1/seed_pairs.json
  Returns: File content as JSON

// All outputs for a phase
GET /api/courses/:courseCode/phase-outputs/:phase
  Example: /api/courses/hun_for_eng/phase-outputs/3
  Returns: { lego_pairs: {...}, introductions: {...} }

// All outputs for a course (convenience)
GET /api/courses/:courseCode/phase-outputs
  Returns: { phase1: {...}, phase3: {...}, phase5: {...} }
```

### **GET Course Status**
```javascript
GET /api/courses/:courseCode/status
  Returns: {
    courseCode,
    completedPhases: [1, 3, 5],
    currentPhase: 7,
    files: {
      seed_pairs: { exists: true, size: 50000, modified: "..." },
      lego_pairs: { exists: true, size: 200000, modified: "..." },
      ...
    }
  }
```

---

## Standard Response Format

### **Success Response:**
```json
{
  "success": true,
  "message": "Phase N submission received for {courseCode}",
  "data": {
    "courseCode": "hun_for_eng",
    "phase": 1,
    "itemCount": 10,
    "savedTo": "/path/to/file.json",
    "timestamp": "2025-11-20T02:00:00.000Z"
  }
}
```

### **Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "Missing required field: translations",
  "code": "VALIDATION_ERROR"
}
```

---

## Implementation Priority

### **Phase 1: High Priority (Week 1)**
✅ Already implemented

### **Phase 2: Phase 3 APIs (Week 1)**
```javascript
GET  /api/courses/:courseCode/phase-outputs/1/seed_pairs.json
POST /api/phase3/:courseCode/submit
```

### **Phase 3: Phase 5 APIs (Week 1)**
```javascript
GET  /api/courses/:courseCode/phase-outputs/3/lego_pairs.json
GET  /api/courses/:courseCode/phase-outputs/3/introductions.json
POST /api/phase5/:courseCode/submit
```

### **Phase 4: Generic Endpoints (Week 2)**
```javascript
GET /api/courses/:courseCode/phase-outputs/:phase/:file
GET /api/courses/:courseCode/status
```

### **Phase 5: Phase 7 & 8 APIs (Week 2)**
```javascript
POST /api/phase7/:courseCode/submit
POST /api/phase8/:courseCode/submit
```

---

## Benefits Over Git-Based Workflow

| Aspect | Git/Branch | REST API |
|--------|-----------|----------|
| **Branch naming** | Complex, error-prone | Not needed |
| **Merge conflicts** | Frequent | None |
| **Parallel agents** | Complex coordination | Simple - just POST |
| **Error handling** | Indirect (branch watchers) | Immediate HTTP response |
| **Debugging** | Hard (git logs, branches) | Easy (HTTP logs) |
| **Agent instructions** | Complex (git commands) | Simple (HTTP requests) |
| **Scalability** | Limited (branch spam) | Unlimited |

---

## Migration Strategy

### **Option A: Gradual (Recommended)**
1. Week 1: Implement Phase 3 & 5 REST APIs
2. Keep git workflow as fallback
3. Update agent prompts to use REST first
4. Week 2: Remove git workflow once REST is proven

### **Option B: Big Bang**
1. Implement all APIs at once
2. Update all prompts
3. Remove git workflow
4. High risk, fast completion

**Recommendation:** Option A - gradual migration with fallback

---

## Next Steps

1. **Implement Phase 3 REST endpoints** (highest priority)
   - GET seed_pairs
   - POST lego_pairs + introductions

2. **Implement Phase 5 REST endpoints**
   - GET lego_pairs + introductions
   - POST lego_baskets

3. **Update Phase 3 & 5 prompts** to use REST APIs

4. **Test end-to-end** (Phase 1 → 3 → 5 via REST)

5. **Implement Phase 7 & 8** once 1-5 proven stable

---

## Testing Plan

### **Unit Tests:**
```bash
# Test each endpoint individually
curl -X GET "http://localhost:3456/api/canonical-seeds?limit=3"
curl -X GET "http://localhost:3456/api/phase-intelligence/1"
curl -X POST "http://localhost:3456/api/phase1/test_for_eng/submit" -d @seed_pairs.json
```

### **Integration Tests:**
```bash
# Test full pipeline
1. POST Phase 1 submission
2. GET Phase 1 output
3. POST Phase 3 submission
4. GET Phase 3 outputs
5. POST Phase 5 submission
```

### **Agent Tests:**
```bash
# Spawn real agent with REST API URLs
# Verify agent can:
# - Fetch inputs via GET
# - Submit outputs via POST
# - Handle errors gracefully
```

---

## Documentation for Agents

Each phase prompt should include:

```markdown
## Data Sources

**Fetch inputs via:**
- GET {ORCHESTRATOR_URL}/api/canonical-seeds?limit=N
- GET {ORCHESTRATOR_URL}/api/courses/{courseCode}/phase-outputs/1/seed_pairs.json

**Submit work via:**
POST {ORCHESTRATOR_URL}/api/phase3/{courseCode}/submit

**Expected format:**
{
  "lego_pairs": { ... },
  "introductions": { ... }
}

**Success response:**
{
  "success": true,
  "legoCount": 150,
  "savedTo": "/path/to/lego_pairs.json"
}
```

---

## Success Criteria

- [ ] All phases use REST API for input/output
- [ ] Zero git branch operations needed
- [ ] Agents can run in parallel without conflicts
- [ ] Full pipeline (1 → 3 → 5 → 7 → 8) via REST
- [ ] Error responses are clear and actionable
- [ ] Documentation is complete

---

**Status:** Phase 1 complete, ready to implement Phase 3 & 5 next.

