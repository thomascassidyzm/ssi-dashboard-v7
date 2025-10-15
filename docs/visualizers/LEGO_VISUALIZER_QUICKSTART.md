# LegoVisualizer - Quick Start Guide

## 🚀 TL;DR

```vue
<template>
  <LegoVisualizer
    course-code="mkd_for_eng_574seeds"
    @lego-edited="handleEdit"
    @show-provenance="handleProvenance"
  />
</template>

<script setup>
import LegoVisualizer from '@/components/LegoVisualizer.vue'

function handleEdit(lego) {
  console.log('Edited:', lego)
}

function handleProvenance(data) {
  console.log('Provenance:', data)
}
</script>
```

## 📁 File Locations

| File | Path |
|------|------|
| Main Component | `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/LegoVisualizer.vue` |
| Example Usage | `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/LegoVisualizerExample.vue` |
| Test Script | `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/test-lego-loader.cjs` |
| Full Docs | `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/LEGO_VISUALIZER_README.md` |
| Integration Guide | `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/LEGO_VISUALIZER_INTEGRATION.md` |

## 📊 Test Data

**Course:** Macedonian (mkd_for_eng_574seeds)
**LEGOs Loaded:** 230 ✅

Run test:
```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
node test-lego-loader.cjs
```

## ⚡ Features

- ✅ Display 230 LEGOs in paginated format (20 per page)
- ✅ Filter by FCFS score, utility score, search text
- ✅ Sort by FCFS, utility, alphabetical
- ✅ Inline editing with save/cancel
- ✅ Provenance tracking with clickable chains
- ✅ Impact analysis for each LEGO
- ✅ Emerald/slate theme matching CourseEditor.vue
- ✅ Visual score bars (FCFS, utility, pedagogical)

## 🎨 Visual Design

```
╭─────────────────────────────────╮
│ "You want to learn Macedonian"  │
│ Provenance: S14L4               │
│ FCFS: 46.2 | Utility: 72        │
│ [Edit] [Show Impact]            │
╰─────────────────────────────────╯
```

## 🔧 Props

```javascript
{
  courseCode: 'mkd_for_eng_574seeds',  // Required
  editable: true,                       // Optional, default: true
  initialFilters: {                     // Optional
    searchText: 'I',
    fcfsMin: 30,
    utilityMin: 60
  }
}
```

## 📤 Events

```javascript
// LEGO edited
@lego-edited="(lego) => { /* save to API */ }"

// Provenance clicked or impact requested
@show-provenance="(data) => { /* navigate or show modal */ }"
```

## 📈 Statistics

- **Avg FCFS:** 30.1 (range: 5.8 - 47.3)
- **Avg Utility:** 58.1 (range: 34 - 73)
- **Avg Pedagogical:** 56.9
- **Multiple Sources:** 10 LEGOs

## 🔝 Top LEGOs

**By FCFS:**
1. "how to speak" (47.3)
2. "You want to learn Macedonian" (46.2)
3. "You want to learn" (46.2)

**By Utility:**
1. "I'm trying" (73)
2. "You want to learn Macedonian" (72)
3. "You want to learn" (72)

## 🎯 Common Use Cases

### Read-Only Mode
```vue
<LegoVisualizer
  course-code="mkd_for_eng_574seeds"
  :editable="false"
/>
```

### Pre-Filtered View
```vue
<LegoVisualizer
  course-code="mkd_for_eng_574seeds"
  :initial-filters="{ fcfsMin: 30, utilityMin: 60 }"
/>
```

### With State Management
```vue
<script setup>
import { useLegoStore } from '@/stores/lego'

const legoStore = useLegoStore()

function handleEdit(lego) {
  legoStore.updateLego(lego.uuid, { text: lego.text })
}
</script>
```

## 🧪 Test Commands

```bash
# Run full test suite
node test-lego-loader.cjs

# Count LEGOs
ls vfs/courses/mkd_for_eng_574seeds/amino_acids/legos_deduplicated/*.json | wc -l

# View sample LEGO
cat vfs/courses/mkd_for_eng_574seeds/amino_acids/legos_deduplicated/40fd15725cb09370f3a62b655b2adcda.json
```

## 📚 Documentation

- **Component API:** `LEGO_VISUALIZER_README.md`
- **Integration:** `LEGO_VISUALIZER_INTEGRATION.md`
- **Summary:** `LEGO_VISUALIZER_SUMMARY.md`
- **This Guide:** `LEGO_VISUALIZER_QUICKSTART.md`

## 🐛 Troubleshooting

**LEGOs not loading?**
1. Check courseCode prop
2. Verify API endpoint
3. Check console for errors

**Styling broken?**
1. Ensure Tailwind CSS is configured
2. Check emerald/slate colors in config

**Performance slow?**
1. Pagination already enabled (20/page)
2. Use computed filters
3. Check browser console

## ✅ Success Criteria

All requirements met:
- [x] Display individual LEGOs ✅
- [x] Show all properties ✅
- [x] Inline editing ✅
- [x] Pagination (20/page) ✅
- [x] Filtering (FCFS, utility, search) ✅
- [x] Sorting (FCFS, utility, alpha) ✅
- [x] Macedonian data (230 LEGOs) ✅
- [x] Emerald/slate theme ✅
- [x] Provenance tracking ✅

---

**Ready to use!** 🎉

Start with `LegoVisualizerExample.vue` for a complete working example.
