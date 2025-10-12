# LegoVisualizer Integration Guide

Complete guide for integrating the LegoVisualizer component into your Vue application.

## Quick Start

### 1. Add to Vue Router

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // ... other routes
  {
    path: '/course/:courseCode/legos',
    name: 'lego-visualizer',
    component: () => import('@/views/LegoVisualizerView.vue'),
    props: true
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

### 2. Create View Component

```vue
<!-- views/LegoVisualizerView.vue -->
<template>
  <div class="min-h-screen bg-slate-900 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link
          :to="`/course/${courseCode}`"
          class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block"
        >
          ← Back to Course
        </router-link>
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">
          LEGO Amino Acids
        </h1>
        <p class="text-slate-400">{{ courseCode }}</p>
      </div>

      <!-- LegoVisualizer Component -->
      <LegoVisualizer
        :course-code="courseCode"
        :editable="canEdit"
        @lego-edited="handleLegoEdited"
        @show-provenance="handleShowProvenance"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import LegoVisualizer from '@/components/LegoVisualizer.vue'
import api from '@/services/api'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const router = useRouter()

// Check if user has edit permissions
const canEdit = computed(() => {
  // Implement your permission logic
  return true // For now, allow all
})

async function handleLegoEdited(lego) {
  try {
    // Save to API
    await api.lego.update(lego.uuid, {
      text: lego.text
    })

    // Show success message
    console.log('LEGO updated successfully')
  } catch (error) {
    console.error('Failed to update LEGO:', error)
    alert('Failed to save changes: ' + error.message)
  }
}

function handleShowProvenance(data) {
  if (data.type === 'impact') {
    // Show impact analysis
    showImpactAnalysis(data.lego)
  } else {
    // Navigate to provenance detail
    router.push({
      name: 'seed-detail',
      params: {
        courseCode: props.courseCode,
        seedId: data.provenance.source_seed_id
      }
    })
  }
}

async function showImpactAnalysis(lego) {
  // Fetch and display impact data
  try {
    const impact = await api.provenance.getImpact(lego.uuid)

    // Show modal or navigate to impact view
    console.log('Impact:', impact)
  } catch (error) {
    console.error('Failed to fetch impact:', error)
  }
}
</script>
```

### 3. Add to Navigation

```vue
<!-- In CourseEditor.vue or similar -->
<template>
  <div>
    <!-- ... course info ... -->

    <div class="flex gap-4">
      <router-link
        :to="`/course/${courseCode}/legos`"
        class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors"
      >
        View LEGO Visualizer
      </router-link>
    </div>
  </div>
</template>
```

## API Service Setup

### Create LEGO API Module

```javascript
// services/api/lego.js
export default {
  /**
   * Get all LEGOs for a course
   */
  async getAll(courseCode) {
    const response = await fetch(`/api/legos/${courseCode}`)
    if (!response.ok) throw new Error('Failed to load LEGOs')
    return response.json()
  },

  /**
   * Update a LEGO
   */
  async update(uuid, data) {
    const response = await fetch(`/api/legos/${uuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update LEGO')
    return response.json()
  },

  /**
   * Get LEGO by UUID
   */
  async get(uuid) {
    const response = await fetch(`/api/legos/${uuid}`)
    if (!response.ok) throw new Error('Failed to load LEGO')
    return response.json()
  },

  /**
   * Delete a LEGO
   */
  async delete(uuid) {
    const response = await fetch(`/api/legos/${uuid}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete LEGO')
    return response.json()
  }
}
```

### Create Provenance API Module

```javascript
// services/api/provenance.js
export default {
  /**
   * Trace provenance chain for a LEGO
   */
  async trace(uuid) {
    const response = await fetch(`/api/provenance/trace/${uuid}`)
    if (!response.ok) throw new Error('Failed to trace provenance')
    return response.json()
  },

  /**
   * Get impact analysis for a LEGO
   */
  async getImpact(uuid) {
    const response = await fetch(`/api/provenance/impact/${uuid}`)
    if (!response.ok) throw new Error('Failed to get impact')
    return response.json()
  },

  /**
   * Find all LEGOs derived from a SEED
   */
  async findBySeeds(courseCode, seedId) {
    const response = await fetch(
      `/api/provenance/seed/${courseCode}/${seedId}/legos`
    )
    if (!response.ok) throw new Error('Failed to find LEGOs')
    return response.json()
  }
}
```

### Main API Service

```javascript
// services/api/index.js
import lego from './lego'
import provenance from './provenance'
import course from './course'

export default {
  lego,
  provenance,
  course
}
```

## Backend API Endpoints

### Express.js Example

```javascript
// routes/legos.js
const express = require('express')
const router = express.Router()
const fs = require('fs').promises
const path = require('path')

// Get all LEGOs for a course
router.get('/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params
    const legoDir = path.join(
      __dirname,
      '../vfs/courses',
      courseCode,
      'amino_acids/legos_deduplicated'
    )

    const files = await fs.readdir(legoDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    const legos = await Promise.all(
      jsonFiles.map(async file => {
        const content = await fs.readFile(
          path.join(legoDir, file),
          'utf-8'
        )
        return JSON.parse(content)
      })
    )

    res.json({ legos })
  } catch (error) {
    console.error('Error loading LEGOs:', error)
    res.status(500).json({ error: 'Failed to load LEGOs' })
  }
})

// Update a LEGO
router.put('/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params
    const { text } = req.body

    // Find the LEGO file
    const legoFile = path.join(
      __dirname,
      '../vfs/courses/*/amino_acids/legos_deduplicated',
      `${uuid}.json`
    )

    // Read, update, and write
    const content = await fs.readFile(legoFile, 'utf-8')
    const lego = JSON.parse(content)

    lego.text = text
    lego.metadata.updated_at = new Date().toISOString()

    await fs.writeFile(legoFile, JSON.stringify(lego, null, 2))

    res.json({ lego })
  } catch (error) {
    console.error('Error updating LEGO:', error)
    res.status(500).json({ error: 'Failed to update LEGO' })
  }
})

module.exports = router
```

## State Management (Pinia)

### Create LEGO Store

```javascript
// stores/lego.js
import { defineStore } from 'pinia'
import api from '@/services/api'

export const useLegoStore = defineStore('lego', {
  state: () => ({
    legos: [],
    loading: false,
    error: null,
    currentCourse: null
  }),

  getters: {
    getLegoById: (state) => (uuid) => {
      return state.legos.find(l => l.uuid === uuid)
    },

    legosBySeed: (state) => (seedId) => {
      return state.legos.filter(l =>
        l.provenance.some(p => p.source_seed_id === seedId)
      )
    },

    highValueLegos: (state) => {
      return state.legos.filter(l =>
        l.fcfs_score >= 30 && l.utility_score >= 60
      )
    }
  },

  actions: {
    async loadLegos(courseCode) {
      this.loading = true
      this.error = null
      this.currentCourse = courseCode

      try {
        const data = await api.lego.getAll(courseCode)
        this.legos = data.legos
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateLego(uuid, updates) {
      try {
        const data = await api.lego.update(uuid, updates)

        // Update local state
        const index = this.legos.findIndex(l => l.uuid === uuid)
        if (index !== -1) {
          this.legos[index] = data.lego
        }

        return data.lego
      } catch (error) {
        this.error = error.message
        throw error
      }
    }
  }
})
```

### Use Store in Component

```vue
<template>
  <LegoVisualizer
    :course-code="courseCode"
    @lego-edited="handleLegoEdited"
  />
</template>

<script setup>
import { useLegoStore } from '@/stores/lego'
import LegoVisualizer from '@/components/LegoVisualizer.vue'

const legoStore = useLegoStore()
const props = defineProps(['courseCode'])

async function handleLegoEdited(lego) {
  await legoStore.updateLego(lego.uuid, { text: lego.text })
}
</script>
```

## Advanced Features

### Custom Filters from URL Query

```vue
<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const initialFilters = ref({
  searchText: route.query.search || '',
  fcfsMin: Number(route.query.fcfsMin) || 0,
  fcfsMax: Number(route.query.fcfsMax) || 100,
  utilityMin: Number(route.query.utilityMin) || 0,
  utilityMax: Number(route.query.utilityMax) || 100
})

// Update URL when filters change
function handleFiltersChanged(filters) {
  router.replace({
    query: {
      search: filters.searchText || undefined,
      fcfsMin: filters.fcfsMin !== 0 ? filters.fcfsMin : undefined,
      fcfsMax: filters.fcfsMax !== 100 ? filters.fcfsMax : undefined,
      utilityMin: filters.utilityMin !== 0 ? filters.utilityMin : undefined,
      utilityMax: filters.utilityMax !== 100 ? filters.utilityMax : undefined
    }
  })
}
</script>
```

### Keyboard Shortcuts

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

function handleKeyDown(event) {
  // Ctrl/Cmd + F: Focus search
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault()
    // Focus search input
  }

  // Escape: Clear filters
  if (event.key === 'Escape') {
    // Reset filters
  }
}
</script>
```

### Export Functionality

```vue
<script setup>
function exportToCSV(legos) {
  const headers = ['UUID', 'Text', 'FCFS', 'Utility', 'Pedagogical', 'Provenance']
  const rows = legos.map(lego => [
    lego.uuid,
    `"${lego.text}"`,
    lego.fcfs_score,
    lego.utility_score,
    lego.pedagogical_score,
    lego.provenance.map(p => p.provenance).join('; ')
  ])

  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  // Download
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `legos-${courseCode}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
```

## Testing

### Component Test (Vitest)

```javascript
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import LegoVisualizer from '@/components/LegoVisualizer.vue'

describe('LegoVisualizer', () => {
  it('renders LEGOs correctly', async () => {
    const wrapper = mount(LegoVisualizer, {
      props: {
        courseCode: 'mkd_for_eng_574seeds'
      }
    })

    // Wait for data to load
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lego-card').exists()).toBe(true)
  })

  it('filters LEGOs by search text', async () => {
    const wrapper = mount(LegoVisualizer, {
      props: {
        courseCode: 'mkd_for_eng_574seeds'
      }
    })

    await wrapper.find('input[type="text"]').setValue('test')

    // Check filtered results
    expect(wrapper.vm.filteredLegos.length).toBeLessThanOrEqual(
      wrapper.vm.totalLegos
    )
  })

  it('emits lego-edited event', async () => {
    const wrapper = mount(LegoVisualizer, {
      props: {
        courseCode: 'mkd_for_eng_574seeds'
      }
    })

    await wrapper.find('.lego-card button').trigger('click')

    expect(wrapper.emitted('lego-edited')).toBeTruthy()
  })
})
```

## Troubleshooting

### LEGOs Not Loading
1. Check courseCode prop is correct
2. Verify API endpoint is accessible
3. Check browser console for errors
4. Ensure LEGO files exist in vfs directory

### Styling Issues
1. Ensure Tailwind CSS is configured
2. Check that emerald and slate colors are in tailwind.config.js
3. Verify component is wrapped in correct layout

### Performance Issues
1. Enable pagination (default: 20 per page)
2. Implement virtual scrolling for large datasets
3. Use computed properties for filtering
4. Debounce search input

## Support

For issues or questions:
1. Check the LEGO_VISUALIZER_README.md
2. Review test-lego-loader.cjs output
3. Inspect browser console logs
4. Verify data format matches expected schema
