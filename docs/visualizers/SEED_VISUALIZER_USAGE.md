# SeedVisualizer Component Usage Guide

## Overview

The `SeedVisualizer.vue` component provides an interactive visualization of SEED translations and their LEGO boundaries. It displays sentences in both known and target languages with visual dividers that can be clicked to adjust LEGO segmentation.

## File Location

**Component:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/SeedVisualizer.vue`

**Service:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/services/seedService.js`

**Demo Page:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/SeedVisualizerDemo.vue`

## Features

1. **Dual Language Display**: Shows SEED translations in both known and target languages
2. **Visual LEGO Boundaries**: Displays `|` dividers between LEGOs
3. **Interactive Editing**: Click dividers to add/remove boundaries
4. **LEGO Details**: Shows all LEGOs with provenance, scores, and metadata
5. **Change Tracking**: Emits events when boundaries are modified
6. **Emerald/Slate Theme**: Matches existing CourseEditor.vue styling

## Component Props

```vue
<SeedVisualizer
  :translation-uuid="string"  // Required: UUID of translation to display
  :course-code="string"        // Required: Course code (e.g., 'mkd_for_eng_574seeds')
  :editable="boolean"          // Optional: Enable boundary editing (default: true)
  @boundaries-changed="handler" // Event emitted when boundaries change
/>
```

## Events

### @boundaries-changed

Emitted when user modifies LEGO boundaries:

```javascript
{
  translationUuid: "e5e82f717bc05ee954a80ad21f216c44",
  boundaries: [1, 2, 4] // Array of word indices where boundaries exist
}
```

## Sample Usage

### Basic Usage

```vue
<template>
  <div>
    <SeedVisualizer
      translation-uuid="e5e82f717bc05ee954a80ad21f216c44"
      course-code="mkd_for_eng_574seeds"
      :editable="true"
      @boundaries-changed="handleChange"
    />
  </div>
</template>

<script setup>
import SeedVisualizer from '@/components/SeedVisualizer.vue'

function handleChange(event) {
  console.log('Boundaries changed:', event)
  // Save changes, trigger regeneration, etc.
}
</script>
```

### Read-Only Mode

```vue
<SeedVisualizer
  translation-uuid="e5e82f717bc05ee954a80ad21f216c44"
  course-code="mkd_for_eng_574seeds"
  :editable="false"
/>
```

### In CourseEditor Integration

```vue
<template>
  <div class="course-editor">
    <!-- Existing course editor content -->

    <!-- Add a "Visualize" button for each translation -->
    <button @click="showVisualizer(translation.uuid)">
      Visualize LEGOs
    </button>

    <!-- Modal with visualizer -->
    <div v-if="visualizerModal.open" class="modal">
      <SeedVisualizer
        :translation-uuid="visualizerModal.translationUuid"
        :course-code="courseCode"
        :editable="true"
        @boundaries-changed="onBoundariesChanged"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SeedVisualizer from '@/components/SeedVisualizer.vue'

const visualizerModal = ref({
  open: false,
  translationUuid: null
})

function showVisualizer(uuid) {
  visualizerModal.value = {
    open: true,
    translationUuid: uuid
  }
}

function onBoundariesChanged(event) {
  console.log('User changed boundaries:', event)
  // Trigger Phase 3 regeneration for this translation
  // Update course state, etc.
}
</script>
```

## Test Data

The component is designed to work with the Macedonian course data:

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/mkd_for_eng_574seeds/`

### Example Translations

1. **"I know how to practise"**
   - UUID: `e5e82f717bc05ee954a80ad21f216c44`
   - 5 LEGOs (S37L1-S37L5)

2. **"I think that you're doing very well"**
   - UUID: `04e26f811c296d7ea0a9ac33f69d906a`

## How It Works

### Data Loading Process

1. Component receives `translationUuid` and `courseCode` props
2. Loads translation from `/vfs/courses/{courseCode}/amino_acids/translations/{uuid}.json`
3. Loads LEGOs from pre-generated index: `/vfs/courses/{courseCode}/amino_acids/legos_index.json`
4. Sorts LEGOs by provenance (S1L1, S1L2, etc.)
5. Extracts boundaries from LEGO `end_index` metadata
6. Renders visual display with clickable dividers

### Boundary Reconstruction

LEGOs contain metadata indicating their word positions:

```json
{
  "text": "I know how",
  "provenance": "S37L1",
  "metadata": {
    "start_index": 0,
    "end_index": 2
  }
}
```

The visualizer uses `end_index` values to place boundaries:
- S37L1: words 0-2 → boundary after word 2
- S37L2: words 0-4 → boundary after word 4

### Interactive Editing

When a user clicks a divider:
1. Component toggles boundary at that word index
2. Updates internal state
3. Emits `@boundaries-changed` event
4. Parent component can trigger LEGO regeneration

## Demo Page

A full demo is available at:

**File:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/SeedVisualizerDemo.vue`

To use the demo:

1. Enter a course code and translation UUID
2. Or click an example button
3. Click dividers to modify boundaries
4. See changes logged in real-time

## Generating LEGO Index

The component requires a pre-generated LEGO index for fast lookups:

```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/mkd_for_eng_574seeds
node generate-lego-index.cjs
```

This creates: `amino_acids/legos_index.json`

The index maps translation UUIDs to their LEGOs for O(1) lookup.

## Styling

The component uses Tailwind CSS with the emerald/slate theme matching CourseEditor.vue:

- Background: `bg-slate-800`
- Borders: `border-slate-700`
- Accent: `text-emerald-400`, `border-emerald-600`
- LEGOs: `bg-emerald-900/30 border-emerald-600/50`
- Hover: `hover:bg-emerald-900/40`

## Known Limitations

1. **Index Generation**: Requires running `generate-lego-index.cjs` for each course
2. **Static Loading**: Currently loads from VFS files, not a live API
3. **No Validation**: Doesn't validate if edited boundaries are linguistically valid
4. **No Persistence**: Boundary changes are emitted but not automatically saved

## Future Enhancements

Potential improvements:

1. **Live API**: Connect to backend API for dynamic LEGO loading
2. **Boundary Validation**: Check if edited boundaries make sense
3. **Auto-save**: Automatically persist boundary changes
4. **Undo/Redo**: History tracking for boundary edits
5. **Multi-language Support**: Display language names dynamically
6. **LEGO Highlighting**: Hover over LEGO in list to highlight in sentence
7. **Diff View**: Show before/after when boundaries are changed

## Troubleshooting

### "Failed to load SEED data"

- Verify translation UUID exists in course
- Check that `legos_index.json` has been generated
- Ensure VFS paths are accessible

### "No LEGOs found"

- Run Phase 3 to generate LEGOs
- Regenerate LEGO index: `node generate-lego-index.cjs`
- Verify translation UUID has LEGOs in index

### Boundaries not showing

- Check that LEGOs have valid `metadata.end_index` values
- Verify LEGOs are sorted by provenance correctly
- Check browser console for errors

## Contact

For questions or issues, refer to the main SSi dashboard documentation or the CourseEditor.vue implementation for similar patterns.
