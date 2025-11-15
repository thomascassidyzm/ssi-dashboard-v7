# Phase 5 Chinese Course Recovery Summary

## Overview
Recovered Phase 5 practice basket data from crashed Claude Code on Web sandbox session (branch: `claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K`).

## What Happened

### The Crash
- **67 agents** spawned in a single Claude Code on Web window
- All agents completed Phase 5 basket generation successfully
- Git push succeeded, but then context overflow caused crash
- Sandbox became inaccessible after crash

### Why Files Weren't on GitHub
The `.gitignore` file blocks `public/vfs/courses/*/phase5_outputs/` from being committed:
```gitignore
# Line 67 in .gitignore
public/vfs/courses/*/phase5_outputs/
```

When Claude Code on Web clones a repo, it brings the `.gitignore` file with it. Even though the files were generated successfully, `git add` respected the .gitignore and skipped them during the commit.

## Recovery Results

### Seeds Recovered
Successfully extracted **9 complete seed files** from browser-copied RTF content:

| Seed | LEGOs | Phrases | Sentence |
|------|-------|---------|----------|
| s0064 | 8 | 120 | Learning Mandarin Chinese isn't easy but it is fun. |
| s0453 | 6 | 60 | Did they say who they saw last night? |
| s0454 | 5 | 50 | Our friends came round at about six o'clock. |
| s0455 | 2 | 20 | We had to leave because the children were tired. |
| s0456 | 2 | 20 | He might be there but it's not very likely. |
| s0457 | 2 | 20 | Part of the problem is the number of different areas. |
| s0458 | 2 | 20 | It was all much easier in the past. |
| s0459 | 2 | 20 | It wasn't in front of the blue sign. |
| s0460 | 2 | 20 | I want to find a shop near the hotel. |

**Total:** 9 seeds, 31 LEGOs, 350 practice phrases

### Data Loss
- **Total seeds in course:** 668
- **Seeds recovered:** 9
- **Recovery rate:** ~1.3%

The RTF file contained only these 9 complete seed files. The rest of the Phase 5 data was lost when the sandbox crashed.

## File Locations

### Recovered Files
```
recovered_phase5_seeds/
├── seed_s0064.json (32KB)
├── seed_s0453.json (36KB)
├── seed_s0454.json (19KB)
├── seed_s0455.json (8KB)
├── seed_s0456.json (8KB)
├── seed_s0457.json (8KB)
├── seed_s0458.json (8KB)
├── seed_s0459.json (8KB)
└── seed_s0460.json (8KB)
```

### Source RTF
Original browser copy: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/possilbe chines phase 5 crashed claude code content.rtf`

## Phase 5 Basket Structure

Each recovered seed contains proper Phase 5 format:
- `practice_phrases`: Array of 10 practice phrases per LEGO
- `phrase_distribution`: 2-2-2-4 distribution (short/medium/longer/longest)
- `_metadata`: LEGO ID and seed context
- `components`: Component breakdown for M-LEGOs

Example from seed_s0459:
```json
{
  "lego": ["it wasn't in front of", "它不在...的前面"],
  "type": "M",
  "practice_phrases": [
    ["in front of", "...的前面", null, 1],
    ["wasn't there", "不在那里", null, 1],
    // ... 8 more phrases
  ],
  "phrase_distribution": {
    "short_1_to_2_legos": 2,
    "medium_3_legos": 2,
    "longer_4_legos": 2,
    "longest_5_legos": 4
  }
}
```

## Lessons Learned

### 1. .gitignore in Web Mode
When using Claude Code on Web, phase5_outputs are gitignored. Solutions:
- Use `git add -f` to force-add files before sandbox closes
- Create tarball and download before closing
- Update .gitignore strategy for Web mode work

### 2. Context Management
Spawning 67 agents in one window caused overflow. The dynamic segmentation (already implemented) should prevent this by creating separate orchestrator windows.

### 3. Data Preservation
Always verify files are on GitHub before closing Claude Code on Web sandboxes, especially when .gitignore might exclude important outputs.

## Next Steps

1. **Use recovered seeds as examples** for Phase 5 basket structure
2. **Re-run Phase 5 generation** for Chinese course with proper segmentation
3. **Consider .gitignore updates** for Claude Code on Web workflows
4. **Test dynamic segmentation** to ensure it prevents context overflow

## Date
Recovery performed: November 15, 2025
