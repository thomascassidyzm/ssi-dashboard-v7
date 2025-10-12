# Quality Review Dashboard

A comprehensive quality review system for the self-healing APML LEGO extraction pipeline.

## Overview

The Quality Review Dashboard enables human reviewers to efficiently review, validate, and improve LEGO extractions from course SEEDs. It integrates with a self-healing system that learns from feedback and automatically improves extraction quality over time.

## Components

### 1. QualityDashboard.vue

**Main dashboard for reviewing all SEEDs in a course**

**Features:**
- Course health statistics (avg quality, flagged SEEDs, acceptance rate)
- Quality score distribution histogram
- Filterable/sortable SEED list with real-time search
- Bulk actions (accept, re-run, remove from corpus)
- Keyboard shortcuts for fast review workflow
- Export reports (CSV, PDF)

**Props:**
- `courseCode` (String, required) - The course identifier

**Keyboard Shortcuts:**
- `j/k` - Navigate up/down through SEEDs
- `Enter` - View detailed review for current SEED
- `a` - Accept current SEED
- `r` - Re-run current SEED
- `x` - Toggle selection
- `?` - Show keyboard shortcuts help

**Example Usage:**
```vue
<QualityDashboard courseCode="spanish_668seeds" />
```

---

### 2. SeedQualityReview.vue

**Detailed review component for individual SEEDs**

**Features:**
- Side-by-side comparison of extraction attempts
- Agent's self-assessment with concerns and suggestions
- Visual LEGO boundary highlighting (uses LegoVisualizer)
- Quality score breakdown by criteria (boundaries, coverage, semantics, etc.)
- Attempt timeline showing quality progression
- Accept/reject/re-run/remove actions
- View full prompt used for extraction

**Props:**
- `courseCode` (String, required) - The course identifier
- `seedId` (String, required) - The SEED identifier

**Keyboard Shortcuts:**
- `a` - Accept current attempt
- `r` - Trigger re-run
- `←/→` - Navigate between attempts
- `Esc` - Return to dashboard

**Example Usage:**
```vue
<SeedQualityReview
  courseCode="spanish_668seeds"
  seedId="SEED_0042"
/>
```

---

### 3. PromptEvolutionView.vue

**Visualization of prompt learning and evolution**

**Features:**
- Version history timeline
- Learned rules with before/after statistics
- Example SEEDs showing rule impact
- Experimental rules with A/B test results
- Statistical confidence indicators
- Promote/reject experimental rules
- Enable/disable learned rules
- Quality improvement trend chart
- Rollback to previous versions

**Props:**
- `courseCode` (String, required) - The course identifier

**Example Usage:**
```vue
<PromptEvolutionView courseCode="spanish_668seeds" />
```

---

### 4. CourseHealthReport.vue

**High-level health metrics and system monitoring**

**Features:**
- Overall health score (0-100)
- Health factors breakdown (quality, coverage, consistency, etc.)
- 30-day quality trend visualization
- Phase completion status with progress bars
- Re-run statistics and distribution
- Common concerns/issues with recommendations
- Performance metrics (API calls, processing time, error rate)
- System recommendations with priority levels
- Export capabilities (PDF, CSV)

**Props:**
- `courseCode` (String, required) - The course identifier

**Example Usage:**
```vue
<CourseHealthReport courseCode="spanish_668seeds" />
```

---

## Mock Data

The `mockData.js` module provides realistic mock data for testing all components before the API is ready.

**Available Functions:**

```javascript
import mockData from './mockData.js'

// Generate a single SEED with quality data
const seed = mockData.generateSeed(42)

// Generate multiple SEEDs (default: 668)
const seeds = mockData.generateSeeds(668)

// Generate extraction attempts for a SEED
const attempts = mockData.generateAttempts(seed, 3)

// Generate quality overview statistics
const overview = mockData.generateQualityOverview(seeds)

// Generate learned rules
const rules = mockData.generateLearnedRules()

// Generate experimental rules (A/B tests)
const expRules = mockData.generateExperimentalRules()

// Generate health report data
const health = mockData.generateHealthReport()
```

---

## API Integration

The components are designed to integrate with the backend API. All endpoints are defined in `/src/services/api.js` under the `quality` namespace.

**Available API Methods:**

```javascript
import api from '@/services/api'

// Get quality overview
const overview = await api.quality.getOverview(courseCode)

// Get SEEDs with optional filters
const seeds = await api.quality.getSeeds(courseCode, {
  status: 'flagged',
  qualityRange: '0-7'
})

// Get detailed SEED data
const seed = await api.quality.getSeedDetail(courseCode, seedId)

// Get extraction attempts
const attempts = await api.quality.getSeedAttempts(courseCode, seedId)

// Accept an attempt
await api.quality.acceptAttempt(courseCode, seedId, attemptId)

// Reject an attempt
await api.quality.rejectAttempt(courseCode, seedId, attemptId)

// Trigger re-run
await api.quality.rerunSeed(courseCode, seedId)

// Bulk actions
await api.quality.bulkAccept(courseCode, seedIds)
await api.quality.bulkRerun(courseCode, seedIds)

// Remove from corpus
await api.quality.removeSeed(courseCode, seedId)

// Prompt evolution
const evolution = await api.quality.getPromptEvolution(courseCode)
const rules = await api.quality.getLearnedRules(courseCode)
await api.quality.toggleRule(courseCode, ruleId, enabled)

// Experimental rules
const expRules = await api.quality.getExperimentalRules(courseCode)
await api.quality.promoteRule(courseCode, ruleId)
await api.quality.rejectRule(courseCode, ruleId)

// Health report
const health = await api.quality.getHealthReport(courseCode)
const trend = await api.quality.getQualityTrend(courseCode, 30)

// Export
const csvBlob = await api.quality.exportReport(courseCode, 'csv')
const pdfBlob = await api.quality.exportReport(courseCode, 'pdf')

// Rollback
await api.quality.rollbackPrompt(courseCode, 'v1.1.0')
```

---

## Workflow

### Typical Review Session

1. **Dashboard Overview** - Reviewer opens QualityDashboard to see course health
2. **Filter & Sort** - Uses filters to focus on flagged SEEDs or low quality scores
3. **Quick Actions** - For obvious cases, uses quick accept/re-run buttons
4. **Detailed Review** - Clicks SEEDs needing deeper inspection
5. **Attempt Comparison** - Views multiple attempts to see quality progression
6. **Decision Making** - Based on agent assessment and visual inspection:
   - Accept good extractions
   - Re-run borderline cases
   - Remove problematic SEEDs from corpus
7. **Bulk Processing** - Selects similar SEEDs and applies bulk actions
8. **Monitor Progress** - Checks CourseHealthReport to track overall improvement

### Prompt Evolution Workflow

1. **Monitor Rules** - Review learned rules and their impact
2. **A/B Testing** - Experimental rules are automatically tested
3. **Statistical Validation** - Rules reach 95% confidence before promotion
4. **Promotion** - High-confidence rules are promoted to production
5. **Observation** - Monitor impact on extraction quality
6. **Rollback** - If issues arise, can rollback to previous version

---

## Design Patterns

### Theme & Styling

All components use the existing emerald/slate theme:

- **Primary:** `text-emerald-400`, `bg-emerald-600`
- **Background:** `bg-slate-900`, `bg-slate-800`
- **Borders:** `border-slate-700`
- **Text:** `text-slate-100` (primary), `text-slate-400` (secondary)

### Quality Score Colors

```javascript
function getQualityColor(score) {
  if (score >= 9) return 'text-emerald-400'  // Excellent
  if (score >= 8) return 'text-lime-400'     // Good
  if (score >= 7) return 'text-yellow-400'   // Fair
  if (score >= 6) return 'text-orange-400'   // Poor
  return 'text-red-400'                       // Very Poor
}
```

### Status Badge Colors

- **Pending:** Blue (`bg-blue-900/50 text-blue-400`)
- **Flagged:** Yellow (`bg-yellow-900/50 text-yellow-400`)
- **Accepted:** Green (`bg-emerald-900/50 text-emerald-400`)
- **Rejected:** Red (`bg-red-900/50 text-red-400`)

---

## Self-Healing System

### How It Works

1. **Initial Extraction** - Agent extracts LEGOs using current prompt
2. **Self-Assessment** - Agent evaluates own extraction quality
3. **Quality Scoring** - Automated scoring across multiple criteria
4. **Pattern Detection** - System identifies common failure patterns
5. **Rule Generation** - Creates experimental rules to address issues
6. **A/B Testing** - Tests new rules against control group
7. **Statistical Validation** - Measures improvement with confidence intervals
8. **Promotion** - High-confidence rules added to production prompt
9. **Continuous Learning** - Cycle repeats with improved prompts

### Quality Criteria

Each extraction is scored on:

1. **Boundaries** (0-10) - Precision of LEGO span boundaries
2. **Coverage** (0-10) - Complete sentence coverage by LEGOs
3. **Semantics** (0-10) - Alignment with semantic units
4. **Overlap** (0-10) - Absence of overlapping LEGOs
5. **Complexity** (0-10) - Appropriate granularity for teaching

**Overall Quality Score** = Average of all criteria

---

## Integration with LegoVisualizer

The `SeedQualityReview` component uses the existing `LegoVisualizer` component to display LEGO boundaries visually. Make sure `LegoVisualizer.vue` is available in the components directory.

```vue
<LegoVisualizer
  :sentence="seed.target"
  :legos="currentAttempt.legos"
  :highlight="true"
/>
```

Expected LEGO format:
```javascript
{
  text: "Me gustaría",
  start: 0,
  end: 10,
  type: "conditional_desire",
  confidence: 0.95
}
```

---

## Testing

### Using Mock Data

All components can be tested immediately using the built-in mock data generator:

```javascript
// In component
import { generateSeeds } from './mockData.js'

onMounted(() => {
  seeds.value = generateSeeds(668)
})
```

### Real Data Integration

Once the API is ready, replace mock data calls with API calls:

```javascript
// In component
import api from '@/services/api'

onMounted(async () => {
  const response = await api.quality.getSeeds(courseCode)
  seeds.value = response.seeds
})
```

---

## Performance Considerations

- **Pagination** - Dashboard shows 20 SEEDs per page by default
- **Virtual Scrolling** - Consider implementing for large SEED lists
- **Debounced Search** - Search input should debounce for 300ms
- **Lazy Loading** - Load attempt history only when viewing detail
- **Caching** - Cache quality overview and health data

---

## Future Enhancements

- Real-time WebSocket updates when re-runs complete
- Collaborative review (multiple reviewers)
- Annotation tools for detailed feedback
- Video walkthroughs for training reviewers
- Machine learning confidence thresholds
- Custom quality criteria weights
- Batch SEED upload for testing rules
- Integration with version control for prompts

---

## Contributing

When adding new features:

1. Follow existing design patterns
2. Use the emerald/slate theme consistently
3. Add keyboard shortcuts for efficiency
4. Include helpful tooltips and documentation
5. Test with mock data first
6. Update this README

---

## Support

For questions or issues:
- Review the component source code
- Check the mock data for expected data formats
- Refer to the API documentation in `/src/services/api.js`
- Review the CourseEditor.vue for design pattern examples
