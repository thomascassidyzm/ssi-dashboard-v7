# Quality Review Dashboard - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Quality Review Dashboard                      │
│                     (Self-Healing APML System)                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            ┌───────▼────────┐       ┌───────▼────────┐
            │   Vue Frontend │       │  Backend API   │
            │   (Dashboard)  │◄──────┤  (FastAPI)     │
            └────────────────┘       └────────────────┘
                    │                         │
        ┌───────────┼───────────┐            │
        │           │           │            │
   ┌────▼─────┐ ┌──▼───┐ ┌────▼─────┐      │
   │Dashboard │ │Detail│ │Evolution │      │
   │   View   │ │Review│ │   View   │      │
   └──────────┘ └──────┘ └──────────┘      │
                    │                        │
                    │                   ┌────▼─────┐
              ┌─────▼─────┐            │ Postgres │
              │  Health   │            │ Database │
              │  Report   │            └──────────┘
              └───────────┘
```

## Component Hierarchy

```
QualityDashboardExample.vue (Router Entry Point)
│
├─── QualityDashboard.vue (Main Dashboard)
│    ├── Quality score distribution histogram
│    ├── Filter controls (status, quality range, concerns)
│    ├── SEED list with pagination
│    ├── Bulk action controls
│    └── Navigation to detail view
│
├─── SeedQualityReview.vue (Detailed Review)
│    ├── Attempt comparison (side-by-side)
│    ├── LegoVisualizer.vue (Visual boundaries)
│    ├── Quality breakdown charts
│    ├── Agent self-assessment display
│    └── Action buttons (accept/reject/rerun)
│
├─── PromptEvolutionView.vue (Learning System)
│    ├── Version history timeline
│    ├── Learned rules list
│    ├── Experimental rules (A/B tests)
│    ├── Quality trend chart
│    └── Rule management controls
│
└─── CourseHealthReport.vue (Health Metrics)
     ├── Overall health score (circular)
     ├── Health factors breakdown
     ├── 30-day quality trend
     ├── Phase completion status
     ├── Re-run statistics
     └── System recommendations
```

## Data Flow

### 1. Loading Dashboard

```
User navigates to /quality/spanish_668seeds
            │
            ▼
   QualityDashboard.vue mounts
            │
            ▼
   onMounted() → api.quality.getSeeds()
            │
            ▼
   GET /api/quality/:courseCode/seeds
            │
            ▼
   Backend queries database
            │
            ▼
   Returns: { seeds: [...], stats: {...} }
            │
            ▼
   Component renders with data
```

### 2. Reviewing a SEED

```
User clicks SEED_0042 card
            │
            ▼
   Router navigates to /quality/spanish_668seeds/SEED_0042
            │
            ▼
   SeedQualityReview.vue mounts
            │
            ▼
   onMounted() → api.quality.getSeedAttempts()
            │
            ▼
   GET /api/quality/:courseCode/seeds/:seedId/attempts
            │
            ▼
   Backend queries extraction_attempts table
            │
            ▼
   Returns: { attempts: [...], seed: {...} }
            │
            ▼
   Component displays attempts with LegoVisualizer
```

### 3. Accepting a SEED

```
User clicks "Accept" button
            │
            ▼
   acceptAttempt() method called
            │
            ▼
   api.quality.acceptAttempt(courseCode, seedId, attemptId)
            │
            ▼
   POST /api/quality/:courseCode/seeds/:seedId/accept
            │
            ▼
   Backend updates seed status to 'accepted'
            │
            ▼
   Returns: { success: true, seed: {...} }
            │
            ▼
   Component updates UI, navigates back to dashboard
```

### 4. Self-Healing Loop

```
Agent extracts LEGOs from SEED
            │
            ▼
   Agent self-assesses quality (score: 6.5, concerns: boundary)
            │
            ▼
   System detects pattern: "compound prepositions fragmenting"
            │
            ▼
   Creates experimental rule: "merge compound prepositions"
            │
            ▼
   A/B test on 100 SEEDs (50 control, 50 treatment)
            │
            ▼
   Measures improvement: +0.8 quality, 96.2% confidence
            │
            ▼
   Confidence > 95% → Auto-promote to production
            │
            ▼
   Future extractions use new rule
            │
            ▼
   Quality improves (6.5 → 8.9)
            │
            ▼
   Human reviewer sees improvement in PromptEvolutionView
```

## State Management

### Component State (Reactive)

```javascript
// QualityDashboard.vue
const seeds = ref([])              // All SEEDs
const selectedSeeds = ref([])      // Multi-select
const filters = ref({              // Active filters
  search: '',
  status: '',
  qualityRange: '',
  concern: ''
})
const currentPage = ref(1)         // Pagination

// Computed
const filteredSeeds = computed(() => {
  // Apply filters + sorting
})
const paginatedSeeds = computed(() => {
  // Slice for current page
})
```

### API State (Centralized)

```javascript
// /src/services/api.js
export default {
  quality: {
    async getSeeds(courseCode, filters) {
      // Cached in component state
    },
    async acceptAttempt(courseCode, seedId, attemptId) {
      // Updates component state on success
    }
  }
}
```

## Database Schema (Conceptual)

```sql
-- SEEDs table
CREATE TABLE seeds (
  id VARCHAR PRIMARY KEY,           -- SEED_0001
  course_code VARCHAR,              -- spanish_668seeds
  source TEXT,                      -- English sentence
  target TEXT,                      -- Spanish sentence
  quality_score DECIMAL(3,1),       -- 8.7
  attempt_count INTEGER,            -- 2
  status VARCHAR,                   -- accepted/flagged/pending
  concerns JSONB,                   -- ["boundary", "overlap"]
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Extraction attempts
CREATE TABLE extraction_attempts (
  id UUID PRIMARY KEY,
  seed_id VARCHAR REFERENCES seeds(id),
  attempt_number INTEGER,           -- 1, 2, 3...
  quality_score DECIMAL(3,1),       -- 8.2
  prompt_version VARCHAR,           -- v1.2.0
  model VARCHAR,                    -- claude-3-5-sonnet
  legos JSONB,                      -- [...extracted LEGOs...]
  quality_breakdown JSONB,          -- { boundaries: 9.5, ... }
  agent_assessment TEXT,            -- Self-assessment text
  concerns JSONB,                   -- [{ type, description }]
  suggestions JSONB,                -- ["Consider merging..."]
  created_at TIMESTAMP
);

-- Learned rules
CREATE TABLE learned_rules (
  id VARCHAR PRIMARY KEY,           -- rule_001
  name VARCHAR,                     -- "Destination Phrase Unification"
  description TEXT,
  rule TEXT,                        -- Actual rule logic
  version VARCHAR,                  -- v1.1.0
  status VARCHAR,                   -- active/disabled
  improvement_percentage DECIMAL,   -- 12.3
  applied_count INTEGER,            -- 247
  before_stats JSONB,               -- { avgQuality: 6.8, ... }
  after_stats JSONB,                -- { avgQuality: 8.1, ... }
  example_seeds JSONB,              -- [...examples...]
  created_at TIMESTAMP
);

-- Experimental rules (A/B testing)
CREATE TABLE experimental_rules (
  id VARCHAR PRIMARY KEY,           -- exp_001
  name VARCHAR,
  hypothesis TEXT,
  control_stats JSONB,              -- Control group results
  treatment_stats JSONB,            -- Treatment group results
  confidence DECIMAL(4,1),          -- 96.2
  status VARCHAR,                   -- testing/promoted/rejected
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

## API Endpoints

### Quality Overview
```
GET    /api/quality/:courseCode/overview
       Returns: { avgQuality, flaggedCount, acceptedCount, ... }
```

### SEED Operations
```
GET    /api/quality/:courseCode/seeds
       Query params: status, qualityRange, concern
       Returns: { seeds: [...], total: 668 }

GET    /api/quality/:courseCode/seeds/:seedId
       Returns: { seed: {...}, attempts: [...] }

GET    /api/quality/:courseCode/seeds/:seedId/attempts
       Returns: { attempts: [...] }

POST   /api/quality/:courseCode/seeds/:seedId/accept
       Body: { attemptId }
       Returns: { success: true }

POST   /api/quality/:courseCode/seeds/:seedId/reject
       Body: { attemptId }
       Returns: { success: true }

POST   /api/quality/:courseCode/seeds/:seedId/rerun
       Returns: { jobId, estimatedTime }

DELETE /api/quality/:courseCode/seeds/:seedId
       Returns: { success: true }
```

### Bulk Operations
```
POST   /api/quality/:courseCode/seeds/bulk-accept
       Body: { seedIds: [...] }
       Returns: { accepted: 234, failed: 0 }

POST   /api/quality/:courseCode/seeds/bulk-rerun
       Body: { seedIds: [...] }
       Returns: { jobId, totalSeeds: 82 }
```

### Prompt Evolution
```
GET    /api/quality/:courseCode/prompt-evolution
       Returns: { versions: [...], currentVersion: "v1.2.0" }

GET    /api/quality/:courseCode/learned-rules
       Returns: { rules: [...] }

PUT    /api/quality/:courseCode/learned-rules/:ruleId
       Body: { enabled: true/false }
       Returns: { success: true }

GET    /api/quality/:courseCode/experimental-rules
       Returns: { rules: [...] }

POST   /api/quality/:courseCode/experimental-rules/:ruleId/promote
       Returns: { newVersion: "v1.3.0" }

DELETE /api/quality/:courseCode/experimental-rules/:ruleId
       Returns: { success: true }

POST   /api/quality/:courseCode/rollback
       Body: { version: "v1.1.0" }
       Returns: { success: true, currentVersion: "v1.1.0" }
```

### Health & Analytics
```
GET    /api/quality/:courseCode/health
       Returns: { healthScore: 87, factors: [...], ... }

GET    /api/quality/:courseCode/trend
       Query params: days (default: 30)
       Returns: { trend: [...daily data...] }

GET    /api/quality/:courseCode/export
       Query params: format (csv/pdf)
       Returns: Blob (file download)
```

## Performance Considerations

### Frontend Optimizations
```
✅ Pagination (20 items per page)
✅ Lazy loading (detail view loads on demand)
✅ Debounced search (300ms delay)
✅ Computed properties (cached filtering/sorting)
✅ Virtual scrolling (for future 10k+ SEED courses)
```

### Backend Optimizations
```
✅ Database indexing (seed_id, course_code, quality_score)
✅ Query result caching (Redis for overview stats)
✅ Batch operations (bulk accept/reject)
✅ Async re-run jobs (Celery/background tasks)
✅ WebSocket updates (real-time progress)
```

### Caching Strategy
```
Dashboard overview:     Cache for 5 minutes
SEED list:             Cache per filter combination
Individual SEED:       Cache for 1 minute
Prompt evolution:      Cache for 1 hour
Health report:         Cache for 10 minutes
```

## Security Considerations

### Authentication
```javascript
// Add auth header to all requests
api.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`
  return config
})
```

### Authorization
```python
# Backend endpoint example
@app.post("/api/quality/{course_code}/seeds/{seed_id}/accept")
async def accept_seed(
    course_code: str,
    seed_id: str,
    user: User = Depends(get_current_user)
):
    # Verify user has permission to review this course
    if not user.can_review(course_code):
        raise HTTPException(403, "Not authorized")

    # Process acceptance
    ...
```

### Data Validation
```python
# Pydantic models for request validation
class AcceptAttemptRequest(BaseModel):
    attemptId: str

    @validator('attemptId')
    def validate_attempt_id(cls, v):
        if not v.startswith('attempt_'):
            raise ValueError('Invalid attempt ID')
        return v
```

## Error Handling

### Frontend
```javascript
async function loadSeeds() {
  try {
    const response = await api.quality.getSeeds(courseCode)
    seeds.value = response.seeds
  } catch (error) {
    if (error.response?.status === 404) {
      errorMessage.value = 'Course not found'
    } else if (error.response?.status === 403) {
      errorMessage.value = 'Not authorized to view this course'
    } else {
      errorMessage.value = 'Failed to load SEEDs. Please try again.'
    }
    console.error('Load error:', error)
  }
}
```

### Backend
```python
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

@app.get("/api/quality/{course_code}/seeds")
async def get_seeds(course_code: str):
    try:
        seeds = await db.query(Seed).filter(
            Seed.course_code == course_code
        ).all()
        return {"seeds": seeds}
    except IntegrityError as e:
        raise HTTPException(500, "Database error")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(500, "Internal server error")
```

## Testing Strategy

### Unit Tests
```javascript
// QualityDashboard.spec.js
describe('QualityDashboard', () => {
  it('filters seeds by quality score', () => {
    const wrapper = mount(QualityDashboard, {
      props: { courseCode: 'test' }
    })

    wrapper.vm.filters.qualityRange = '9-10'
    expect(wrapper.vm.filteredSeeds.length).toBe(234)
  })
})
```

### Integration Tests
```python
# test_quality_api.py
async def test_accept_seed(client):
    response = await client.post(
        "/api/quality/spanish_668seeds/seeds/SEED_0001/accept",
        json={"attemptId": "attempt_3"}
    )
    assert response.status_code == 200
    assert response.json()["success"] == True
```

### E2E Tests
```javascript
// cypress/e2e/quality-review.cy.js
describe('Quality Review Workflow', () => {
  it('can review and accept a SEED', () => {
    cy.visit('/quality/spanish_668seeds')
    cy.contains('SEED_0001').click()
    cy.contains('Accept This Attempt').click()
    cy.url().should('include', '/quality/spanish_668seeds')
    cy.contains('SEED_0001').should('have.class', 'accepted')
  })
})
```

## Deployment

### Build for Production
```bash
npm run build
# Output: dist/ folder
```

### Environment Variables
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## Monitoring

### Frontend Metrics
```javascript
// Track component performance
import { onMounted, onUpdated } from 'vue'

onMounted(() => {
  const loadTime = performance.now()
  analytics.track('QualityDashboard.Loaded', { loadTime })
})
```

### Backend Metrics
```python
from prometheus_client import Counter, Histogram

seed_reviews = Counter('seed_reviews_total', 'Total seed reviews')
review_duration = Histogram('review_duration_seconds', 'Review duration')

@app.post("/api/quality/{course_code}/seeds/{seed_id}/accept")
async def accept_seed(...):
    with review_duration.time():
        # Process acceptance
        seed_reviews.inc()
        ...
```

---

**Architecture designed for scale, performance, and maintainability!**
