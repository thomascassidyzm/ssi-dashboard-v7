# PhraseVisualizer Component Usage Guide

## Component Location
`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/PhraseVisualizer.vue`

## Features
- Display basket phrases (LEGOs grouped into teaching baskets)
- Show basket metadata: basket_id, lego_count, patterns_included, composite_score
- Inline editing of phrase text within baskets
- Reordering phrases within a basket (up/down buttons)
- Show SEED provenance for each phrase
- Emerald/slate theme matching CourseEditor.vue
- Basket navigation (prev/next basket buttons)

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `courseCode` | String | Yes | - | Course code (e.g., "mkd_for_eng_574seeds") |
| `basketId` | Number | No | null | Specific basket to display initially |
| `editable` | Boolean | No | true | Enable/disable editing features |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@basket-modified` | `{ basketId, action, ... }` | Emitted when basket contents or order changes |
| `@phrase-edited` | `{ basketId, legoIndex, legoUuid, oldText, newText }` | Emitted when phrase text is edited |

## Basic Usage

### 1. Import and use in a Vue view/component:

```vue
<template>
  <div class="min-h-screen bg-slate-900 p-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-4xl font-bold text-emerald-400 mb-8">
        Macedonian Course - Phrase Visualizer
      </h1>

      <PhraseVisualizer
        course-code="mkd_for_eng_574seeds"
        :editable="true"
        @basket-modified="handleBasketModified"
        @phrase-edited="handlePhraseEdited"
      />
    </div>
  </div>
</template>

<script setup>
import PhraseVisualizer from '@/components/PhraseVisualizer.vue'

function handleBasketModified(event) {
  console.log('Basket modified:', event)
  // Handle basket modification (e.g., save to backend)
}

function handlePhraseEdited(event) {
  console.log('Phrase edited:', event)
  // Handle phrase edit (e.g., update backend)
}
</script>
```

### 2. View specific basket:

```vue
<template>
  <PhraseVisualizer
    course-code="mkd_for_eng_574seeds"
    :basket-id="5"
    :editable="true"
  />
</template>
```

### 3. Read-only mode:

```vue
<template>
  <PhraseVisualizer
    course-code="mkd_for_eng_574seeds"
    :editable="false"
  />
</template>
```

## Event Handlers

### Basket Modified Event

```javascript
function handleBasketModified(event) {
  // Event structure:
  // {
  //   basketId: 1,
  //   action: 'reorder' | 'add' | 'save',
  //   // For reorder:
  //   fromIndex: 2,
  //   toIndex: 1,
  //   // For add:
  //   lego: { uuid, text, provenance, ... },
  //   // For save:
  //   basket: { complete basket object }
  // }

  switch (event.action) {
    case 'reorder':
      console.log(`Moved item from ${event.fromIndex} to ${event.toIndex}`)
      break
    case 'add':
      console.log('Added new LEGO:', event.lego)
      break
    case 'save':
      console.log('Saved basket:', event.basket)
      // Send to backend API
      break
  }
}
```

### Phrase Edited Event

```javascript
function handlePhraseEdited(event) {
  // Event structure:
  // {
  //   basketId: 1,
  //   legoIndex: 3,
  //   legoUuid: "18b8cebedcd2e35034fcf3489e54900e",
  //   oldText: "I can't remember how",
  //   newText: "I cannot remember how"
  // }

  console.log(`Edited phrase in basket ${event.basketId}:`)
  console.log(`From: "${event.oldText}"`)
  console.log(`To: "${event.newText}"`)

  // Send update to backend
  // await api.updateLego(event.legoUuid, { text: event.newText })
}
```

## Integration with Router

Add to your router configuration:

```javascript
// router/index.js
import PhraseVisualizer from '@/components/PhraseVisualizer.vue'

const routes = [
  {
    path: '/courses/:courseCode/baskets',
    name: 'BasketVisualizer',
    component: () => import('@/views/BasketVisualizerView.vue')
  },
  {
    path: '/courses/:courseCode/baskets/:basketId',
    name: 'BasketDetail',
    component: () => import('@/views/BasketVisualizerView.vue')
  }
]
```

Then create a view wrapper:

```vue
<!-- views/BasketVisualizerView.vue -->
<template>
  <div class="min-h-screen bg-slate-900 p-8">
    <div class="max-w-7xl mx-auto">
      <router-link
        :to="`/courses/${courseCode}`"
        class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block"
      >
        ← Back to Course Editor
      </router-link>

      <PhraseVisualizer
        :course-code="courseCode"
        :basket-id="basketId"
        :editable="true"
        @basket-modified="handleBasketModified"
        @phrase-edited="handlePhraseEdited"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PhraseVisualizer from '@/components/PhraseVisualizer.vue'

const route = useRoute()
const courseCode = computed(() => route.params.courseCode)
const basketId = computed(() => route.params.basketId ? parseInt(route.params.basketId) : null)

function handleBasketModified(event) {
  console.log('Basket modified:', event)
}

function handlePhraseEdited(event) {
  console.log('Phrase edited:', event)
}
</script>
```

## Keyboard Shortcuts

When editing a phrase:
- `Ctrl+Enter` or `Cmd+Enter` - Save changes
- `Escape` - Cancel editing

## Data Structure

The component expects basket JSON files with this structure:

```json
{
  "uuid": "25dc881b63627288c2800624f8c1a029",
  "type": "basket",
  "basket_id": 1,
  "lego_count": 10,
  "legos": [
    {
      "uuid": "18b8cebedcd2e35034fcf3489e54900e",
      "text": "I can't remember how",
      "provenance": [
        {
          "provenance": "S35L2",
          "source_translation_uuid": "60873fea1ee976d4fd31e46b72a31b82",
          "source_seed_id": "C0035",
          "original_uuid": "9f7fd62eed4f6ba28d6d037fe91ec331"
        }
      ],
      "fcfs_score": 33.7,
      "utility_score": 61
    }
  ],
  "metadata": {
    "course_code": "mkd_for_eng_574seeds",
    "phase": "phase_5",
    "patterns_included": ["subject_verb", "verb_phrases"],
    "composite_score": 47,
    "pedagogical_notes": {
      "purpose": "Grouped for optimal teaching sequence",
      "pattern_diversity": 5,
      "progression": "Balanced mix of FCFS and utility priorities"
    },
    "created_at": "2025-10-10T10:27:35.752Z"
  }
}
```

## Styling

The component uses Tailwind CSS with the emerald/slate theme:
- Primary color: `emerald-400` for headings and accents
- Background: `slate-900` for main background, `slate-800` for cards
- Borders: `slate-700`
- Text: `slate-100` for primary, `slate-400` for secondary

## Current Limitations

1. **File Loading**: The current implementation attempts to load basket files via fetch from `/vfs/courses/...`. You may need to adjust this based on your backend API structure.

2. **Save Functionality**: The `saveBasket()` method currently only emits an event and logs. You'll need to implement actual persistence via your backend API.

3. **Real-time Updates**: The component doesn't currently support real-time updates from other users. Consider adding WebSocket support if needed.

## Next Steps

To fully integrate this component:

1. Update the fetch logic in `loadBaskets()` to use your API service
2. Implement the save functionality to persist changes
3. Add loading states and error handling for API calls
4. Consider adding drag-and-drop for reordering (currently uses up/down buttons)
5. Add search/filter functionality for large basket collections
6. Implement undo/redo functionality for edits

## Test Data

The component successfully loads from:
`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/mkd_for_eng_574seeds/amino_acids/baskets/`

Total baskets available: **23 baskets** (basket_01.json through basket_23.json)
