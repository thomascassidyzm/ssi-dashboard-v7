# Quality Review Dashboard - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: View the Demo (1 minute)

No configuration needed! The components include built-in mock data.

```bash
# If your dev server isn't running
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
npm run dev
```

Then visit: http://localhost:5173

### Step 2: Add a Route (1 minute)

Create a new file or add to your existing router:

```javascript
// src/router/index.js (or create if it doesn't exist)
import { createRouter, createWebHistory } from 'vue-router'
import QualityDashboardExample from '@/components/quality/QualityDashboardExample.vue'

const routes = [
  {
    path: '/quality-demo',
    component: QualityDashboardExample
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### Step 3: Visit the Dashboard (1 minute)

Navigate to: **http://localhost:5173/quality-demo**

You should see:
- ✅ Quality Dashboard with 668 mock Spanish SEEDs
- ✅ Quality score distribution chart
- ✅ Filterable/sortable SEED list
- ✅ Bulk action controls
- ✅ Help modal with keyboard shortcuts

### Step 4: Explore the Features (2 minutes)

**Try these interactions:**

1. **Click a quality score bar** → Filters SEEDs by that score range
2. **Press `?`** → Shows keyboard shortcuts help
3. **Click "Detailed Review" tab** → See side-by-side attempt comparison
4. **Click "Prompt Evolution" tab** → View learned rules and A/B tests
5. **Click "Health Report" tab** → See overall course health metrics
6. **Press `j` and `k`** → Navigate through SEEDs with keyboard
7. **Select multiple SEEDs** → Try bulk accept/re-run
8. **Filter by status** → Focus on flagged SEEDs

---

## 🎯 What You're Seeing

### Mock Data Included

The dashboard comes with realistic mock data:

- **668 Spanish SEEDs** - Cycling through 20 example sentences
- **Quality scores** - Ranging from 0-10 with realistic distribution
- **Multiple attempts** - Some SEEDs show 1-5 extraction attempts
- **Learned rules** - 3 production rules with impact statistics
- **Experimental rules** - 2 A/B tests in progress
- **Health metrics** - Overall health score of 87/100

### Example SEED

```
SEED_0001: "Me gustaría ir a la playa" (I would like to go to the beach)

Quality Score: 9.1
Attempts: 3 (improved from 6.5 → 8.2 → 9.1)
Status: Accepted
LEGOs extracted:
  1. "Me gustaría" (conditional_desire)
  2. "ir a la playa" (action_destination)
  3. "mañana" (temporal)
```

---

## 📊 Understanding the Dashboard

### Main Dashboard View

**Top Stats:**
- Average Quality: 8.7 (Good!)
- Flagged SEEDs: 82 (12%)
- Accepted: 456 (68%)
- Avg Attempts: 1.6 per SEED

**Quality Distribution:**
- Click any bar to filter by that quality range
- Green = Excellent (9-10)
- Yellow = Fair (7-8)
- Red = Poor (<6)

**SEED List:**
- Shows 20 SEEDs per page (668 total)
- Click any SEED for detailed review
- Use quick actions: Accept, Re-run, Review

### Detailed Review View

**What You'll See:**
- Side-by-side comparison of extraction attempts
- Visual LEGO boundaries in the sentence
- Agent's self-assessment and concerns
- Quality breakdown by criteria
- Full prompt text used

**Actions:**
- Accept This Attempt
- Reject
- Trigger Re-run
- Remove from Corpus

### Prompt Evolution View

**What You'll See:**
- Version history (v1.0.0 → v1.1.0 → v1.2.0)
- Learned rules with before/after stats
- Experimental rules with A/B test results
- Quality improvement trend chart

**Example Learned Rule:**
```
"Destination Phrase Unification"
Rule: Merge "ir/venir/llegar + a/de + location" as single LEGO
Impact: +12.3% improvement
Applied to: 247 SEEDs
Before: 6.8 avg quality, 62% success
After: 8.1 avg quality, 84% success
```

### Health Report View

**What You'll See:**
- Overall health score: 87/100
- Health factors (quality, coverage, consistency, etc.)
- 30-day quality trend
- Phase completion status
- Re-run statistics
- Common concerns and recommendations

---

## 🎮 Interactive Features to Try

### Keyboard Shortcuts

Open the dashboard and try:

- `j` / `k` - Navigate up/down through SEEDs
- `Enter` - Open detailed review for current SEED
- `a` - Accept current SEED
- `r` - Re-run current SEED
- `x` - Toggle selection
- `?` - Show keyboard shortcuts help

### Filtering & Sorting

**Try these filter combinations:**

1. **Status: Flagged** → See only problematic SEEDs
2. **Quality: Poor (<7.0)** → Focus on low-quality extractions
3. **Search: "playa"** → Find SEEDs containing "playa"
4. **Sort by: Attempts (↓)** → See which SEEDs needed most re-runs

### Bulk Operations

1. Filter to show high-quality SEEDs (9.0-10.0)
2. Click "Select All"
3. Click "Accept Selected"
4. Watch 234 SEEDs get accepted instantly!

---

## 🔧 Customization

### Change Course Code

```vue
<QualityDashboardExample
  courseCode="french_500seeds"
  initialView="health"
/>
```

### Use Individual Components

```vue
<template>
  <div>
    <h1>My Custom Quality Page</h1>
    <QualityDashboard courseCode="spanish_668seeds" />
  </div>
</template>

<script setup>
import { QualityDashboard } from '@/components/quality'
</script>
```

### Generate Custom Mock Data

```javascript
import { generateSeeds } from '@/components/quality/mockData'

// Generate 1000 SEEDs instead of 668
const seeds = generateSeeds(1000)
```

---

## 📱 Responsive Design

The dashboard works on all screen sizes:

- **Desktop** - Full experience with side-by-side comparisons
- **Tablet** - Adapted grid layouts
- **Mobile** - Stacked views, simplified charts

Try resizing your browser window to see responsive behavior!

---

## 🎨 Theme Customization

All components use your existing emerald/slate theme:

```javascript
// Matching CourseEditor.vue design:
Primary: text-emerald-400, bg-emerald-600
Background: bg-slate-900, bg-slate-800
Borders: border-slate-700
Text: text-slate-100, text-slate-400
```

---

## 🔄 Real-Time Updates (Future)

When connected to WebSocket backend:

```javascript
// Automatic updates when re-runs complete
socket.on('quality:rerun-complete', (data) => {
  // SEED automatically updates in list
  // No page refresh needed!
})
```

---

## 📚 Learn More

- **Full Documentation:** `README.md`
- **Integration Guide:** `INTEGRATION.md`
- **Architecture:** `ARCHITECTURE.md`
- **Complete Summary:** `SUMMARY.md`

---

## 🆘 Troubleshooting

### Dashboard shows blank page

**Check:**
1. Is the dev server running? (`npm run dev`)
2. Did you add the route to your router?
3. Check browser console for errors

**Quick fix:**
```bash
# Restart dev server
npm run dev
```

### Can't see mock data

**The components automatically use mock data!**

If you don't see data:
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify Vue is loaded

### Keyboard shortcuts not working

**Common issues:**
- Cursor is in an input field (shortcuts disabled)
- Wrong component is focused
- Browser shortcuts interfering

**Try:**
- Click outside any input fields
- Click the SEED list area
- Use mouse to test first

---

## ✅ Next Steps

1. **Explore all 4 views** (Dashboard, Detail, Evolution, Health)
2. **Try keyboard shortcuts** (j/k/a/r/x/?)
3. **Test filtering and sorting** (combine multiple filters)
4. **Review the documentation** (README.md)
5. **Plan your API integration** (INTEGRATION.md)

---

## 🎉 That's It!

You now have a fully functional Quality Review Dashboard with:

- ✅ 668 mock Spanish SEEDs
- ✅ Multiple extraction attempts per SEED
- ✅ Self-healing prompt learning system
- ✅ A/B testing for experimental rules
- ✅ Comprehensive health metrics
- ✅ Professional, beautiful UI
- ✅ Keyboard shortcuts for efficiency

**Ready to review your first LEGO extractions!**

---

## 🔗 Quick Links

- Demo: http://localhost:5173/quality-demo
- Documentation: `/src/components/quality/README.md`
- Mock Data: `/src/components/quality/mockData.js`
- API Endpoints: `/src/services/api.js`

---

**Questions?** Check the full documentation or review the component source code!
