# Smart Resume API

**Added**: 2025-10-29
**Endpoint**: `GET /api/courses/:courseCode/analyze`

---

## What It Does

The dashboard can now **intelligently analyze** what's been done and suggest smart resume options.

---

## Example: Chinese Course

```bash
curl http://localhost:3456/api/courses/cmn_for_eng/analyze
```

**Response:**
```json
{
  "courseCode": "cmn_for_eng",
  "seed_pairs": {
    "exists": true,
    "count": 668,
    "range": { "first": "S0001", "last": "S0668" }
  },
  "lego_pairs": {
    "exists": true,
    "count": 458,
    "range": { "first": "S0071", "last": "S0668" },
    "missing": ["S0001", "S0002", ... "S0070", "S0421", ... ]
  },
  "recommendations": [
    {
      "type": "resume",
      "phase": 3,
      "title": "Resume: Seeds 1-70",
      "description": "Process 70 missing seeds",
      "action": { "startSeed": 1, "endSeed": 70 }
    },
    {
      "type": "resume",
      "phase": 3,
      "title": "Resume: Seeds 421-490",
      "description": "Process 70 missing seeds",
      "action": { "startSeed": 421, "endSeed": 490 }
    },
    {
      "type": "full",
      "phase": 3,
      "title": "Process All Missing",
      "description": "Process all 210 missing seeds",
      "action": { "startSeed": 1, "endSeed": 668 }
    }
  ]
}
```

---

## What Dashboard Should Show

### For Chinese Course (cmn_for_eng):

**Current Status:**
- ✅ 668 seed pairs complete
- ⚠️  458/668 LEGOs (missing S0001-S0070, S0421-S0490, S0561-S0630)

**Recommended Actions:**
```
┌─────────────────────────────────────────────────┐
│ 🎯 Smart Resume Options                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ ● Resume: Seeds 1-70                           │
│   Process 70 missing seeds                     │
│   [Start Phase 3: Seeds 1-70]                  │
│                                                 │
│ ● Resume: Seeds 421-490                        │
│   Process 70 missing seeds                     │
│   [Start Phase 3: Seeds 421-490]               │
│                                                 │
│ ● Process All Missing                          │
│   Process all 210 missing seeds                │
│   [Start Phase 3: All Missing]                 │
│                                                 │
│ ● Test Run: First 50 Seeds                    │
│   Test new Phase 3 v4.0.2 intelligence        │
│   [Start Phase 3: Seeds 1-50]                  │
│                                                 │
│ ● Full Run                                     │
│   Regenerate all 668 seeds (overwrites old)   │
│   [Start Phase 3: Seeds 1-668]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

User clicks button → Dashboard sends:
```javascript
POST /api/courses/generate
{
  "target": "cmn",
  "known": "eng",
  "startSeed": 1,    // From recommendation.action
  "endSeed": 70      // From recommendation.action
}
```

---

## Benefits

✅ **No config files** - Dashboard figures it out by looking at actual files
✅ **Smart resume** - Suggests contiguous missing ranges
✅ **Test runs** - Always offers "First 50 seeds" option
✅ **Full runs** - Always offers "All seeds" option
✅ **Intelligent** - Knows what's missing and suggests logical next steps

---

## Integration Steps

1. **CourseGeneration.vue** - Add "Analyze Course" button
2. When user enters language pair, call `/api/courses/:code/analyze`
3. Show recommendations as clickable buttons
4. When user clicks, set `startSeed`/`endSeed` from `recommendation.action`
5. Start generation as normal

---

## File Added

- `automation_server.cjs` - New endpoint at line 2957

---

**Status**: API complete, ready for dashboard integration
