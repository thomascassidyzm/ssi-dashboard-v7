# SeedVisualizer Integration Example

## Quick Integration into CourseEditor.vue

Here's how to add the SeedVisualizer to the existing CourseEditor view:

### 1. Import the Component

Add to the `<script setup>` section:

```javascript
import SeedVisualizer from '../components/SeedVisualizer.vue'
```

### 2. Add Visualizer Modal State

Add to the reactive state:

```javascript
const visualizerModal = ref({
  open: false,
  translationUuid: null
})
```

### 3. Add Modal to Template

Add this after the existing edit modal (around line 343):

```vue
<!-- Visualizer Modal -->
<div
  v-if="visualizerModal.open"
  class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
  @click.self="closeVisualizerModal"
>
  <div class="bg-slate-800 border border-slate-700 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
    <!-- Modal Header -->
    <div class="flex items-center justify-between p-6 border-b border-slate-700">
      <h2 class="text-2xl font-bold text-emerald-400">LEGO Visualizer</h2>
      <button
        @click="closeVisualizerModal"
        class="text-slate-400 hover:text-slate-300 text-2xl"
      >
        ×
      </button>
    </div>

    <!-- Modal Body -->
    <div class="p-6">
      <SeedVisualizer
        :translation-uuid="visualizerModal.translationUuid"
        :course-code="courseCode"
        :editable="true"
        @boundaries-changed="handleBoundariesChanged"
      />
    </div>

    <!-- Modal Footer -->
    <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
      <button
        @click="closeVisualizerModal"
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
      >
        Close
      </button>
    </div>
  </div>
</div>
```

### 4. Add "Visualize" Button to Translations

Modify the translation card (around line 106) to add a visualize button:

```vue
<div class="flex items-start justify-between mb-2">
  <div class="flex-1">
    <div class="text-emerald-400 font-medium mb-1">{{ translation.source }}</div>
    <div class="text-slate-300 text-sm">{{ translation.target }}</div>
  </div>
  <div class="flex gap-2 ml-4">
    <button
      @click="visualizeTranslation(translation)"
      class="bg-slate-700 hover:bg-slate-600 text-emerald-400 px-3 py-1 rounded text-sm"
    >
      Visualize
    </button>
    <button
      @click="editTranslation(translation)"
      class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm"
    >
      Edit
    </button>
  </div>
</div>
```

### 5. Add Handler Functions

Add these functions to the script section:

```javascript
function visualizeTranslation(translation) {
  visualizerModal.value = {
    open: true,
    translationUuid: translation.uuid
  }
}

function closeVisualizerModal() {
  visualizerModal.value = {
    open: false,
    translationUuid: null
  }
}

function handleBoundariesChanged(event) {
  console.log('Boundaries changed:', event)

  // Show confirmation
  const confirm = window.confirm(
    'LEGO boundaries have been modified. This will require regenerating LEGOs for this translation. Continue?'
  )

  if (confirm) {
    // Trigger Phase 3 regeneration for this translation
    regenerateLegosForTranslation(event.translationUuid, event.boundaries)
  }
}

async function regenerateLegosForTranslation(translationUuid, boundaries) {
  try {
    // Call API to regenerate LEGOs with new boundaries
    await api.course.regenerateLegos(courseCode, translationUuid, boundaries)

    // Reload course data
    await loadCourse()

    // Close modal
    closeVisualizerModal()

    alert('LEGOs regenerated successfully!')
  } catch (err) {
    console.error('Failed to regenerate LEGOs:', err)
    alert('Failed to regenerate LEGOs: ' + err.message)
  }
}
```

## Complete Working Example

See `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/SeedVisualizerDemo.vue` for a complete standalone example.

## Testing

1. Navigate to Course Editor
2. Click "Visualize" on any translation
3. See SEED with LEGO boundaries
4. Click dividers to modify boundaries
5. Changes are logged and emitted

## Visual Result

```
Known:  [I know how] | [to practise]
Target: [Знам како да] | [вежбам]

LEGO Details:
┌─────────────────────────────────────┐
│ S37L1  Words 0-2                    │
│ "I know how"                        │
│ FCFS: 41.8 Utility: 70 Ped: 60     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ S37L4  Words 2-4                    │
│ "how to practise"                   │
│ FCFS: 41.8 Utility: 70 Ped: 50     │
└─────────────────────────────────────┘
```

## Benefits

1. **Visual Feedback**: See exactly how LEGOs are segmented
2. **Interactive**: Adjust boundaries with clicks
3. **Integrated**: Fits seamlessly into existing UI
4. **Informative**: Shows all LEGO metadata and scores
5. **Non-destructive**: Changes only emitted, not auto-saved
