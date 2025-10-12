# LegoVisualizer.vue Component

A beautiful, interactive Vue component for visualizing and editing LEGO amino acids from SSi language courses.

## Component Location

**File Path:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/LegoVisualizer.vue`

## Features

### 1. Display Individual LEGO Amino Acids
- Beautiful card-based layout with emerald/slate theme
- Shows all LEGO properties:
  - Text (known language version)
  - Provenance chain with clickable links
  - FCFS score with visual bar
  - Utility score with visual bar
  - Pedagogical score with visual bar
  - Metadata (UUID, duplicate count, creation date)

### 2. Inline Editing
- Click "Edit" button to enable inline editing
- Edit LEGO text directly in the card
- Save or cancel changes
- Emits `@lego-edited` event for parent component handling

### 3. Pagination
- 20 LEGOs per page
- Previous/Next navigation
- Page number buttons with smart visibility
- Shows current range and total count

### 4. Filtering
- **Search Text:** Filter by text content
- **FCFS Range:** Min/Max sliders (0-100)
- **Utility Range:** Min/Max sliders (0-100)
- Reset filters button

### 5. Sorting
- FCFS Score (High to Low / Low to High)
- Utility Score (High to Low / Low to High)
- Alphabetical

### 6. Provenance Tracking
- Click any provenance ID to view details
- Modal shows:
  - Provenance ID
  - Source SEED ID
  - Translation UUID
  - Original UUID
- Emits `@show-provenance` event for custom handling

### 7. Impact Analysis
- "Show Impact" button on each LEGO
- Shows downstream effects of editing
- Emits event for parent component to handle

## Props

```javascript
{
  courseCode: {
    type: String,
    required: true,
    // Example: 'mkd_for_eng_574seeds'
  },
  editable: {
    type: Boolean,
    default: true,
    // Set to false to disable editing
  },
  initialFilters: {
    type: Object,
    default: () => ({}),
    // Optional initial filter state
    // Example: { searchText: 'I', fcfsMin: 20, utilityMin: 50 }
  }
}
```

## Emitted Events

### @lego-edited
Emitted when a LEGO is saved after editing.

```javascript
// Event payload
{
  uuid: "01cd3e97bd9ee518278e5a3244c3521b",
  text: "updated text",
  fcfs_score: 5.8,
  utility_score: 39,
  // ... all other LEGO properties
}
```

### @show-provenance
Emitted when user clicks provenance link or "Show Impact" button.

```javascript
// Event payload (provenance clicked)
{
  lego: { /* full LEGO object */ },
  provenance: {
    provenance: "S39L2",
    source_seed_id: "C0039",
    source_translation_uuid: "e2186863091c2aa0ce42750c7c23fe86",
    original_uuid: "e14e8bb2d8c2a5475568570e630abe15"
  }
}

// Event payload (impact requested)
{
  lego: { /* full LEGO object */ },
  type: 'impact'
}
```

## Usage Examples

### Basic Usage

```vue
<template>
  <LegoVisualizer
    course-code="mkd_for_eng_574seeds"
    :editable="true"
    @lego-edited="handleLegoEdited"
    @show-provenance="handleShowProvenance"
  />
</template>

<script setup>
import LegoVisualizer from '@/components/LegoVisualizer.vue'

function handleLegoEdited(lego) {
  console.log('LEGO edited:', lego)
  // Send update to API
  // await api.lego.update(lego.uuid, { text: lego.text })
}

function handleShowProvenance(data) {
  console.log('Show provenance:', data)
  // Fetch and display provenance chain
  // const chain = await api.provenance.trace(data.lego.uuid)
}
</script>
```

### With Initial Filters

```vue
<template>
  <LegoVisualizer
    course-code="mkd_for_eng_574seeds"
    :editable="true"
    :initial-filters="{
      searchText: 'I',
      fcfsMin: 30,
      fcfsMax: 100,
      utilityMin: 60,
      utilityMax: 100
    }"
  />
</template>
```

### Read-Only Mode

```vue
<template>
  <LegoVisualizer
    course-code="mkd_for_eng_574seeds"
    :editable="false"
  />
</template>
```

### Full Integration Example

See `LegoVisualizerExample.vue` for a complete working example with:
- Stats panel
- Event logging
- API integration examples
- State management

## Data Format

The component expects LEGO data in this format:

```json
{
  "uuid": "01cd3e97bd9ee518278e5a3244c3521b",
  "type": "lego_deduplicated",
  "text": "you say that",
  "provenance": [
    {
      "provenance": "S39L2",
      "source_translation_uuid": "e2186863091c2aa0ce42750c7c23fe86",
      "source_seed_id": "C0039",
      "original_uuid": "e14e8bb2d8c2a5475568570e630abe15"
    }
  ],
  "fcfs_score": 5.8,
  "utility_score": 39,
  "pedagogical_score": 50,
  "metadata": {
    "course_code": "mkd_for_eng_574seeds",
    "phase": "phase_4",
    "duplicate_count": 1,
    "canonical_provenance": "S39L2",
    "all_sources": "S39L2",
    "created_at": "2025-10-10T10:26:08.952Z"
  }
}
```

## Test Data

### Macedonian Course Statistics
- **Total LEGOs:** 230
- **Average FCFS Score:** 30.1 (range: 5.8 - 47.3)
- **Average Utility Score:** 58.1 (range: 34 - 73)
- **Average Pedagogical Score:** 56.9
- **LEGOs with Multiple Sources:** 10

### Sample LEGOs (Top FCFS)
1. "how to speak" (FCFS: 47.3, Utility: 72)
2. "You want to learn Macedonian" (FCFS: 46.2, Utility: 72)
3. "You want to learn" (FCFS: 46.2, Utility: 72)

### Sample LEGOs (Top Utility)
1. "I'm trying" (FCFS: 45.0, Utility: 73)
2. "You want to learn Macedonian" (FCFS: 46.2, Utility: 72)
3. "You want to learn" (FCFS: 46.2, Utility: 72)

## Testing

Run the test script to verify data loading:

```bash
node test-lego-loader.cjs
```

This will:
- Load all 230 LEGO files
- Calculate statistics
- Show sample data
- Test filtering scenarios
- Verify pagination

## Design Theme

The component uses the emerald/slate color scheme matching `CourseEditor.vue`:

- **Background:** `bg-slate-900` (main), `bg-slate-800` (cards)
- **Borders:** `border-slate-700`
- **Primary Color:** `text-emerald-400` (headings, scores)
- **Secondary Text:** `text-slate-400` (labels)
- **Accent Colors:**
  - FCFS bars: `bg-emerald-500`
  - Utility bars: `bg-blue-500`
  - Pedagogical bars: `bg-purple-500`

## API Integration (Recommended)

The component includes placeholders for API integration. Implement these endpoints:

```javascript
// Load LEGOs
GET /api/legos/{courseCode}
Response: { legos: [...] }

// Update LEGO
PUT /api/legos/{uuid}
Body: { text: "updated text" }
Response: { lego: {...} }

// Trace provenance
GET /api/provenance/trace/{uuid}
Response: { chain: [...] }

// Get impact analysis
GET /api/provenance/impact/{uuid}
Response: { legos: 10, baskets: 3, ... }
```

## Exposed Methods

The component exposes these methods via `defineExpose()`:

```javascript
const legoVisualizerRef = ref(null)

// Reload LEGOs from source
await legoVisualizerRef.value.loadLegos()

// Reset all filters to defaults
legoVisualizerRef.value.resetFilters()
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires Vue 3 Composition API
- Tailwind CSS for styling

## Performance

- Efficient filtering with computed properties
- Pagination limits DOM rendering to 20 items
- Smart page button visibility (max 5 buttons)
- Reactive updates with Vue 3's reactivity system

## Future Enhancements

Potential improvements:
- Export filtered LEGOs to CSV/JSON
- Bulk editing mode
- Advanced search (regex, fuzzy matching)
- Visualization of provenance graphs
- Compare mode (side-by-side LEGOs)
- Custom color themes
- Keyboard shortcuts
- Undo/redo for edits

## License

Part of the SSi Dashboard v7 project.
