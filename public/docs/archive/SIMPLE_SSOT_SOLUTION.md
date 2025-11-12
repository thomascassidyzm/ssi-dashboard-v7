# Simple SSoT Solution: Static Files on Dashboard

**Goal**: Dead simple - edit file → commit → build → agents read new intelligence

---

## The Simplest Possible Architecture

### Source of Truth
**Location**: `docs/phase_intelligence/*.md` (markdown files in git)

**Why Markdown**:
- ✅ Easy to edit
- ✅ Version controlled (git)
- ✅ Human readable
- ✅ Can include formatting/examples
- ✅ Rendered nicely on GitHub

**Why NOT .txt**:
- No real benefit over markdown
- Markdown gives us formatting for free

---

## The Flow (Dead Simple)

```
1. Developer edits: docs/phase_intelligence/phase_3_extraction.md
   ↓
2. Git commit: git commit -m "Update phase 3"
   ↓
3. Server restart: Automation server reloads
   ↓
4. Agents fetch: GET http://localhost:3456/phase-intelligence/3
   ↓
5. Server responds: Reads .md file, returns content
```

**No API complexity. No database. Just static file serving.**

---

## Implementation: Serve Markdown as Static Files

### Add to automation_server.cjs (5 lines of code)

```javascript
// =============================================================================
// PHASE INTELLIGENCE - STATIC FILE SERVING
// =============================================================================

/**
 * GET /phase-intelligence/:phase
 * Serve phase intelligence markdown files as static content
 *
 * Example: GET /phase-intelligence/3
 *          → Serves docs/phase_intelligence/phase_3_extraction.md
 */
app.get('/phase-intelligence/:phase', async (req, res) => {
  const { phase } = req.params;

  try {
    const intelligenceDir = path.join(__dirname, 'docs', 'phase_intelligence');

    // Find matching file: phase_3_*.md
    const files = await fs.readdir(intelligenceDir);
    const matchingFile = files.find(f =>
      f.startsWith(`phase_${phase}_`) && f.endsWith('.md')
    );

    if (!matchingFile) {
      // Fallback to legacy APML prompts
      const promptKey = `PHASE_${phase.replace('.', '_')}`;
      const promptData = apmlRegistry.variable_registry.PHASE_PROMPTS[promptKey];

      if (promptData) {
        console.log(`⚠️  Phase ${phase} module not found, falling back to APML prompt`);
        return res.type('text/markdown').send(promptData.prompt);
      }

      return res.status(404).type('text/plain').send(`Phase ${phase} intelligence not found`);
    }

    // Read and serve markdown file
    const filePath = path.join(intelligenceDir, matchingFile);
    const content = await fs.readFile(filePath, 'utf8');

    res.type('text/markdown').send(content);

  } catch (error) {
    console.error(`Error serving phase ${phase} intelligence:`, error);
    res.status(500).type('text/plain').send('Error loading phase intelligence');
  }
});
```

**That's it. 30 lines of code. Serves markdown files. Done.**

---

## Agent Usage (Dead Simple)

```javascript
// Agent needs Phase 3 methodology
const response = await fetch('http://localhost:3456/phase-intelligence/3');
const methodology = await response.text(); // Gets markdown content

// Agent applies the methodology
console.log('Applying Phase 3 methodology:', methodology.substring(0, 100));
```

**No JSON parsing. No complex API. Just fetch markdown, read it, apply it.**

---

## Update Workflow (3 Steps)

### Step 1: Edit
```bash
vim docs/phase_intelligence/phase_3_extraction.md
# Add new intelligence, bump version
```

### Step 2: Commit
```bash
git add docs/phase_intelligence/phase_3_extraction.md
git commit -m "Add preposition wrapping rule to Phase 3"
```

### Step 3: Restart Server
```bash
# Restart automation server to reload files
pm2 restart automation-server
# OR
pkill -f automation_server.cjs && node automation_server.cjs
```

**That's it. Next agent run gets new intelligence.**

---

## For Dashboard UI (Optional - Future)

If you want to display intelligence in the Vercel dashboard:

### Option 1: Fetch from Automation Server
```javascript
// Dashboard Vue component
const response = await fetch('http://localhost:3456/phase-intelligence/3');
const markdown = await response.text();
// Render markdown in UI
```

### Option 2: Copy to Public Folder During Build
```javascript
// vite.config.js
import { copyFileSync } from 'fs';

export default {
  // ... existing config

  build: {
    // Copy phase intelligence to public folder
    async buildStart() {
      const files = await fs.readdir('docs/phase_intelligence');
      files.filter(f => f.endsWith('.md')).forEach(file => {
        copyFileSync(
          `docs/phase_intelligence/${file}`,
          `public/phase-intelligence/${file}`
        );
      });
    }
  }
}
```

Then serve from Vercel:
```javascript
// Dashboard fetches from Vercel deployment
const response = await fetch('/phase-intelligence/phase_3_extraction.md');
const markdown = await response.text();
```

**But for agents, they always fetch from automation server (not Vercel).**

---

## Why This Is Simple

### No API Complexity
- ❌ No PUT endpoints
- ❌ No version tracking in database
- ❌ No JSON schemas
- ❌ No complicated registry updates

Just:
- ✅ Edit markdown file
- ✅ Git commit
- ✅ Server serves file

### No Build Process
- ❌ No compilation
- ❌ No registry regeneration
- ❌ No deploy steps

Just:
- ✅ Restart server
- ✅ Files reload

### No Database
- ❌ No version history storage
- ❌ No publish tracking
- ❌ No audit logs

Just:
- ✅ Git history (built-in)
- ✅ File system (already there)

---

## Version Tracking? Git!

Don't build version tracking - **use git**:

```bash
# See all changes to Phase 3
git log --follow docs/phase_intelligence/phase_3_extraction.md

# See what changed between versions
git diff abc123 def456 docs/phase_intelligence/phase_3_extraction.md

# Roll back to previous version
git checkout abc123 docs/phase_intelligence/phase_3_extraction.md
```

**Git IS your version control system. Don't rebuild it.**

---

## Registry Update (v7.7.1) - Simplified

The registry just needs to **point to the files**:

```json
{
  "version": "7.7.1",

  "phase_intelligence": {
    "status": "ACTIVE - Static file serving",
    "location": "docs/phase_intelligence/*.md",
    "access": "GET http://localhost:3456/phase-intelligence/:phase",
    "format": "Markdown text files",

    "modules": {
      "phase_1": {
        "file": "phase_1_translation.md",
        "status": "pending"
      },
      "phase_3": {
        "file": "phase_3_extraction.md",
        "version": "2.0",
        "status": "active"
      }
      // etc.
    },

    "workflow": [
      "1. Edit: docs/phase_intelligence/phase_X.md",
      "2. Commit: git commit -m 'Update phase X'",
      "3. Restart: pm2 restart automation-server",
      "4. Done: Agents fetch from /phase-intelligence/X"
    ]
  }
}
```

**No complicated tracking. Just file paths and status.**

---

## Comparison: Complex vs Simple

### Complex (What We Were Building)
```
Edit .md → Update registry → Publish via API → Store in DB →
Version tracking → History API → Diff API → Agents fetch via API
```
**Lines of code**: ~200+

### Simple (What We Actually Need)
```
Edit .md → Commit → Restart → Agents fetch static file
```
**Lines of code**: ~30

---

## The Complete Implementation

### 1. Keep Phase Intelligence Modules (Already Done)
```
docs/phase_intelligence/
├── phase_3_extraction.md (v2.0) ✅
├── phase_1_translation.md (to create)
├── phase_5_baskets.md (to create)
└── README.md ✅
```

### 2. Add Static File Serving to automation_server.cjs
Insert 30-line endpoint (code above) at line ~2820

### 3. Update Registry (Simplified)
Just add `phase_intelligence` section with file locations

### 4. Agents Fetch Directly
```javascript
const methodology = await fetch('http://localhost:3456/phase-intelligence/3').then(r => r.text());
```

**Done. That's the entire system.**

---

## Hot Reload (Optional - Even Simpler)

Don't even restart the server - use nodemon:

```bash
# Install nodemon
npm install -g nodemon

# Run with auto-reload
nodemon automation_server.cjs --watch docs/phase_intelligence
```

**Now edits automatically reload. Zero manual restart.**

---

## What About Vercel Dashboard?

The Vercel dashboard is **just a UI**. It doesn't need to serve intelligence.

**Agents run via automation server (local)** → They fetch from automation server
**Dashboard displays intelligence (optional)** → It fetches from automation server

If you want dashboard to display intelligence:
```vue
<!-- Dashboard Vue component -->
<script setup>
const methodology = ref('');

async function loadMethodology() {
  const response = await fetch('http://localhost:3456/phase-intelligence/3');
  methodology.value = await response.text();
}
</script>

<template>
  <div v-html="renderMarkdown(methodology)" />
</template>
```

**Dashboard reads from same source agents do. One SSoT.**

---

## The Answer to Your Question

> "we need a location that is easy to edit, and builds to the live dashboard - and this will be where the agents actually GO during runtime"

**Answer**:
- **Easy to edit**: ✅ Markdown files in `docs/phase_intelligence/`
- **Builds to live dashboard**: ✅ Automation server serves them statically
- **Where agents go**: ✅ `http://localhost:3456/phase-intelligence/:phase`
- **When edit is made, next build has changes**: ✅ Restart server (or use nodemon for auto-reload)

**No complicated build process. Just edit → commit → restart → done.**

---

## Implementation Time

**Total**: ~10 minutes

1. Add 30-line static file endpoint (5 min)
2. Update registry with simplified tracking (3 min)
3. Test with curl (2 min)

**That's it. Done.**

---

## Next Action

Do you want:
1. **Option A**: Implement the simple 30-line static file serving (recommended)
2. **Option B**: Go back to the complex 200-line API system we designed earlier

I **strongly recommend Option A** - it's simpler, easier to maintain, and does exactly what you need.

Shall I implement the simple version?
