# SSi Course Production - Complete Setup Guide

## System Overview

This is the **complete, working SSi Course Production system**:

- **Dashboard** (Vue 3 + Vite + Tailwind) - Hosted on Vercel
- **Automation Server** (Express API) - Runs locally on your Mac
- **Claude Code Agents** - Spawned via osascript for each phase
- **VFS Storage** - Local file system for amino acids and proteins

## Architecture Flow

```
Dashboard (Vercel)
    ↓ (HTTPS via ngrok)
automation_server.js (localhost:3456)
    ↓ (osascript)
Terminal windows with Claude Code agents
    ↓ (writes to)
vfs/courses/{courseCode}/
```

---

## Quick Start (ONE Command!)

### PM2 Auto-Start (Recommended)

**Run once to set up:**
```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
./start-pm2.sh
```

This will:
- ✅ Start automation server (port 3456)
- ✅ Start ngrok tunnel (using your reserved URL)
- ✅ Auto-restart if crashes
- ✅ Run in background

**That's it!** Your server is now running and will auto-start on Mac boot.

### Verify It's Running

```bash
pm2 list
# Should show: ssi-automation (online), ssi-ngrok (online)

pm2 logs
# View live logs
```

### Open Dashboard

1. Go to https://ssi-dashboard-v7-clean.vercel.app
2. Browse existing courses in **Course Library**
3. Click on a course to view translations, LEGOs, and baskets
4. Click **Edit** on any translation to see impact analysis
5. Or click **"🚀 Generate New Course"** to create a new one

---

## What Happens When You Click "Generate Course"

1. **Dashboard sends API call** → `POST /api/courses/generate`
2. **Automation server creates job** → Initializes course directory in VFS
3. **Phase 0 agent spawns** → New Terminal window with full APML prompt
4. **You work with Claude Code** → Complete Phase 0 tasks
5. **Repeat for Phases 1-6** → Each phase spawns its own Terminal
6. **Compilation** → Manifest generated in `vfs/courses/{courseCode}/proteins/`

---

## Phase Prompts

Each phase has a **complete, detailed prompt** with:

- Task description
- Input sources (VFS paths)
- Mission objectives
- Critical rules (e.g., IRON RULE for Phase 3)
- Output format/structure
- Success criteria

**View prompts:**
- Dashboard → Click any phase card → See "Claude Code Prompt" section
- Copy to clipboard or download as .txt

---

## VFS Directory Structure

After generation completes:

```
vfs/courses/{courseCode}/
├── amino_acids/
│   ├── translations/        # Phase 1 output
│   ├── legos/              # Phase 3 output
│   ├── legos_deduplicated/ # Phase 4 output
│   ├── baskets/            # Phase 5 output
│   └── introductions/      # Phase 6 output
├── phase_outputs/
│   ├── phase_0_intelligence.json
│   ├── phase_2_corpus_intelligence.json
│   └── phase_3.5_lego_graph.json
└── proteins/
    └── manifest.json       # Final compiled course
```

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Run dashboard locally
npm run dev
# → http://localhost:5173

# Terminal 2: Run automation server
npm run server
# → http://localhost:3456

# Terminal 3: Expose via ngrok
ngrok http 3456

# Update .env.local with ngrok URL:
echo "VITE_API_BASE_URL=https://YOUR_NGROK_URL.ngrok.io" > .env.local

# Restart dashboard (Terminal 1)
```

### Production Deployment

Dashboard is auto-deployed to Vercel on every push to `main`.

For ngrok URL changes:
1. Update `VITE_API_BASE_URL` in Vercel dashboard
2. Redeploy

---

## Editing Workflow

### How to Edit a Translation

1. **Open Course Library** → https://ssi-dashboard-v7-clean.vercel.app/courses
2. **Click on a course** (e.g., Spanish 574 seeds)
3. **Browse translations** in the Translations tab
4. **Click "Edit"** on any translation
5. **Review impact analysis:**
   - LEGOs generated from this seed
   - Deduplicated LEGOs affected
   - Baskets impacted
6. **Edit source or target text**
7. **Click "Save & Regenerate"**

### What Happens After Edit

1. Translation amino acid file is updated in VFS
2. `course_metadata.json` marked with `needs_regeneration: true`
3. Phases 3-6 must be re-run to propagate changes:
   - Phase 3: LEGO Extraction
   - Phase 3.5: Graph Construction
   - Phase 4: Deduplication
   - Phase 5: Baskets
   - Phase 6: Introductions

### Regeneration Process

```bash
# Navigate to course directory
cd vfs/courses/spa_for_eng_574seeds

# Run phases 3-6 with Claude Code
# Each phase will detect changes and regenerate affected amino acids
```

---

## API Endpoints

### Health Check
```bash
GET http://localhost:3456/api/health
```

### List All Courses
```bash
GET http://localhost:3456/api/courses
# Returns all courses with metadata and phase completion status
```

### Get Course Data
```bash
GET http://localhost:3456/api/courses/:courseCode
# Returns full course: translations, LEGOs, baskets
```

### Trace Provenance
```bash
GET http://localhost:3456/api/courses/:courseCode/provenance/:seedId
# Returns: LEGOs generated, deduplicated, baskets affected
```

### Update Translation (NEW)
```bash
PUT http://localhost:3456/api/courses/:courseCode/translations/:uuid
{
  "source": "Updated known language text",
  "target": "Updated target language text"
}
# Marks course for regeneration, triggers phases 3-6
```

### Generate Course
```bash
POST http://localhost:3456/api/courses/generate
{
  "target": "spa",
  "known": "eng",
  "seeds": 574
}
```

### Get Generation Status
```bash
GET http://localhost:3456/api/courses/:courseCode/status
```

---

## Troubleshooting

### "Failed to start course generation"
- ✅ Is automation server running? (`npm run server`)
- ✅ Is ngrok tunnel active? (`ngrok http 3456`)
- ✅ Is `VITE_API_BASE_URL` set correctly?

### "No Terminal windows spawning"
- ✅ Check automation server logs
- ✅ Ensure osascript has Terminal access (System Preferences → Security)

### "CORS error"
- ✅ Verify dashboard URL is in `CONFIG.CORS_ORIGINS` (automation_server.js:50)
- ✅ Restart automation server after changes

---

## Key Files

| File | Purpose |
|------|---------|
| `automation_server.cjs` | Backend API + phase orchestration + editing endpoints |
| `src/views/CourseBrowser.vue` | Course Library - browse all courses |
| `src/views/CourseEditor.vue` | Edit translations with impact analysis |
| `src/views/CourseGeneration.vue` | Generation UI + progress monitor |
| `src/views/APMLSpec.vue` | APML v7.0 specification documentation |
| `src/services/api.js` | API client (axios) with ngrok bypass header |
| `src/views/TrainingPhase.vue` | Phase prompts (editable) |
| `vfs/courses/` | Generated course storage (VFS) |
| `migrate-course.cjs` | Migration tool for legacy courses |

---

## Next Steps

1. ✅ Generate your first test course (e.g., Welsh for English, 10 seeds)
2. ✅ Verify VFS files are created
3. ✅ Test prompt editing on training pages
4. ✅ Scale up to full 574-seed course

---

**Version:** 7.0.0
**Status:** Production Ready
**Last Updated:** 2025-10-10
