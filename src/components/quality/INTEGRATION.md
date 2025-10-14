# Quality Dashboard Integration Guide

## Quick Start

### 1. Add Routes to Vue Router

Add these routes to your router configuration:

```javascript
// router/index.js
import QualityDashboard from '@/components/quality/QualityDashboard.vue'
import SeedQualityReview from '@/components/quality/SeedQualityReview.vue'
import PromptEvolutionView from '@/components/quality/PromptEvolutionView.vue'
import CourseHealthReport from '@/components/quality/CourseHealthReport.vue'
import QualityDashboardExample from '@/components/quality/QualityDashboardExample.vue'

const routes = [
  // ... existing routes

  // Quality Dashboard Routes
  {
    path: '/quality/:courseCode',
    name: 'QualityDashboard',
    component: QualityDashboard,
    props: true
  },
  {
    path: '/quality/:courseCode/:seedId',
    name: 'SeedQualityReview',
    component: SeedQualityReview,
    props: true
  },
  {
    path: '/quality/:courseCode/evolution',
    name: 'PromptEvolution',
    component: PromptEvolutionView,
    props: true
  },
  {
    path: '/quality/:courseCode/health',
    name: 'CourseHealth',
    component: CourseHealthReport,
    props: true
  },

  // Optional: Example/Demo view with all components
  {
    path: '/quality-demo',
    name: 'QualityDemo',
    component: QualityDashboardExample,
    props: route => ({
      courseCode: route.query.course || 'spanish_668seeds'
    })
  }
]
```

### 2. Add Navigation Links

Add links to the quality dashboard from your course editor or main navigation:

```vue
<!-- In CourseEditor.vue or similar -->
<template>
  <div>
    <!-- Existing course content -->

    <!-- Add Quality Review Link -->
    <router-link
      :to="`/quality/${courseCode}`"
      class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
    >
      Review Quality
    </router-link>
  </div>
</template>
```

### 3. Testing with Mock Data

The components include built-in mock data. To test immediately:

```bash
# Visit the demo page
http://localhost:5173/quality-demo

# Or visit a specific view
http://localhost:5173/quality/spanish_668seeds
```

### 4. Connect to Real API

Once your backend is ready, the components will automatically use the API:

```javascript
// All API calls are already configured in /src/services/api.js
// The components will call these endpoints:

GET    /api/quality/:courseCode/overview
GET    /api/quality/:courseCode/seeds
GET    /api/quality/:courseCode/seeds/:seedId
GET    /api/quality/:courseCode/seeds/:seedId/attempts
POST   /api/quality/:courseCode/seeds/:seedId/accept
POST   /api/quality/:courseCode/seeds/:seedId/reject
POST   /api/quality/:courseCode/seeds/:seedId/rerun
POST   /api/quality/:courseCode/seeds/bulk-accept
POST   /api/quality/:courseCode/seeds/bulk-rerun
DELETE /api/quality/:courseCode/seeds/:seedId
GET    /api/quality/:courseCode/prompt-evolution
GET    /api/quality/:courseCode/learned-rules
PUT    /api/quality/:courseCode/learned-rules/:ruleId
GET    /api/quality/:courseCode/experimental-rules
POST   /api/quality/:courseCode/experimental-rules/:ruleId/promote
DELETE /api/quality/:courseCode/experimental-rules/:ruleId
GET    /api/quality/:courseCode/health
GET    /api/quality/:courseCode/trend
GET    /api/quality/:courseCode/export
POST   /api/quality/:courseCode/rollback
```

---

## Integration Examples

### Example 1: Add to Course Editor

```vue
<!-- CourseEditor.vue -->
<template>
  <div>
    <!-- Existing tabs -->
    <div class="flex border-b border-slate-700">
      <button @click="activeTab = 'translations'">Translations</button>
      <button @click="activeTab = 'legos'">LEGOs</button>
      <button @click="activeTab = 'baskets'">Baskets</button>

      <!-- Add Quality tab -->
      <button @click="activeTab = 'quality'">Quality Review</button>
    </div>

    <!-- Tab content -->
    <div v-if="activeTab === 'quality'">
      <QualityDashboard :courseCode="courseCode" />
    </div>
  </div>
</template>

<script setup>
import QualityDashboard from '@/components/quality/QualityDashboard.vue'
</script>
```

### Example 2: Standalone Quality Review App

```vue
<!-- QualityReviewApp.vue -->
<template>
  <QualityDashboardExample
    :courseCode="courseCode"
    :initialView="view"
  />
</template>

<script setup>
import { useRoute } from 'vue-router'
import QualityDashboardExample from '@/components/quality/QualityDashboardExample.vue'

const route = useRoute()
const courseCode = computed(() => route.params.courseCode)
const view = computed(() => route.query.view || 'dashboard')
</script>
```

### Example 3: Embedded Health Metrics

```vue
<!-- CourseDashboard.vue -->
<template>
  <div>
    <!-- Course overview -->
    <h1>{{ courseName }}</h1>

    <!-- Embedded health score -->
    <div class="bg-slate-800 rounded-lg p-4">
      <div class="text-sm text-slate-400">Quality Health</div>
      <div class="text-3xl font-bold text-emerald-400">
        {{ healthScore }}/100
      </div>
      <router-link
        :to="`/quality/${courseCode}/health`"
        class="text-sm text-emerald-400"
      >
        View full report →
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const healthScore = ref(0)

onMounted(async () => {
  const health = await api.quality.getHealthReport(courseCode)
  healthScore.value = health.healthScore
})
</script>
```

---

## Switching from Mock to Real Data

### Current (Mock Data)

```javascript
// In component
import { generateSeeds } from './mockData.js'

onMounted(() => {
  seeds.value = generateSeeds(668)
})
```

### Production (Real API)

```javascript
// In component
import api from '@/services/api'

onMounted(async () => {
  try {
    const response = await api.quality.getSeeds(courseCode, filters.value)
    seeds.value = response.seeds
  } catch (error) {
    console.error('Failed to load seeds:', error)
  }
})
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# API Base URL
VITE_API_BASE_URL=http://localhost:54321

# Or use ngrok for remote access
# VITE_API_BASE_URL=https://your-ngrok-url.ngrok.io
```

---

## WebSocket Integration (Optional)

For real-time updates when re-runs complete:

```javascript
// In QualityDashboard.vue
import { io } from 'socket.io-client'

onMounted(() => {
  const socket = io(import.meta.env.VITE_API_BASE_URL)

  socket.on('quality:seed-updated', (data) => {
    // Update the SEED in the list
    const seed = seeds.value.find(s => s.id === data.seedId)
    if (seed) {
      Object.assign(seed, data.updates)
    }
  })

  socket.on('quality:rerun-complete', (data) => {
    // Refresh the specific SEED
    loadSeedData(data.seedId)
  })

  onUnmounted(() => {
    socket.disconnect()
  })
})
```

---

## Styling Customization

All components use Tailwind CSS classes. To customize:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Override emerald/slate theme
        primary: {
          400: '#your-color',
          500: '#your-color',
          600: '#your-color',
        }
      }
    }
  }
}
```

---

## Performance Optimization

### Lazy Loading

```javascript
// router/index.js
const routes = [
  {
    path: '/quality/:courseCode',
    component: () => import('@/components/quality/QualityDashboard.vue'),
    props: true
  }
]
```

### Virtual Scrolling (for large SEED lists)

```bash
npm install vue-virtual-scroller
```

```vue
<!-- In QualityDashboard.vue -->
<template>
  <RecycleScroller
    :items="filteredSeeds"
    :item-size="120"
    key-field="id"
  >
    <template #default="{ item }">
      <!-- SEED card content -->
    </template>
  </RecycleScroller>
</template>

<script setup>
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
</script>
```

---

## Troubleshooting

### Components not rendering

- Check that LegoVisualizer.vue exists in `/src/components/`
- Verify Vue Router is configured correctly
- Check browser console for errors

### API calls failing

- Verify VITE_API_BASE_URL is set correctly
- Check that backend server is running
- Review API endpoint URLs in `/src/services/api.js`

### Mock data not showing

- Components default to mock data if API calls fail
- Check component's onMounted() function
- Verify mockData.js exports are correct

### Styling issues

- Ensure Tailwind CSS is configured
- Check that all required colors are in theme
- Verify component imports are correct

---

## Next Steps

1. **Test with Mock Data** - Visit `/quality-demo` to see all components
2. **Integrate Backend** - Connect API endpoints to your backend
3. **Customize Theme** - Adjust colors and styling to match your brand
4. **Add WebSockets** - Enable real-time updates (optional)
5. **Deploy** - Build and deploy with `npm run build`

---

## Questions?

Refer to:
- `/src/components/quality/README.md` - Full component documentation
- `/src/services/api.js` - API endpoint definitions
- `/src/components/quality/mockData.js` - Mock data examples
