# Complete Dependency Analysis - All Phases

**Date:** 2025-11-20
**Purpose:** Map ALL dependencies to identify shared vs unique, assess restructuring effort

---

## Dependency Matrix

| Dependency | Phase 1 | Phase 3 | Phase 5 | Phase 5.5 | Phase 6 | Phase 7 | Phase 8 | **Total Users** |
|------------|---------|---------|---------|-----------|---------|---------|---------|-----------------|
| `spawn_claude_web_agent.cjs` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **2 phases** |
| `phase6-generate-introductions.cjs` | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | **2 phases** |
| `phase5_prep_scaffolds.cjs` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | **1 phase** |
| `config-loader.cjs` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | **1 phase** |

---

## Analysis by Dependency

### **1. `spawn_claude_web_agent.cjs` (SHARED - 2 users)**

**Location:** `/spawn_claude_web_agent.cjs` (root)

**Used By:**
- ✅ **Phase 1** (Translation) - Spawns translation agents
- ✅ **Phase 3** (LEGO Extraction) - Spawns LEGO extraction agents

**Purpose:** Opens Safari/Chrome tabs with claude.ai/code via osascript, pastes prompts via clipboard

**Size:** 11KB

**Complexity:** Medium (browser automation, AppleScript)

**Type:** **SHARED UTILITY** - Used by multiple phases for agent spawning

**Recommendation:**
- Keep in `services/shared/spawn-agent.cjs`
- Both phases import from shared location
- OR include a copy in each phase directory (11KB is small)

---

### **2. `phase6-generate-introductions.cjs` (SHARED - 2 users)**

**Location:** `/scripts/phase6-generate-introductions.cjs`

**Used By:**
- ✅ **Phase 3** (LEGO Extraction) - Generates introductions inline
- ✅ **Phase 6** (Introductions Server) - Legacy standalone server (deprecated)

**Purpose:** Generates LEGO introductions from lego_pairs.json

**Size:** 7.5KB

**Complexity:** Medium (Claude Code integration, LEGO processing)

**Type:** **SHARED LOGIC** - But Phase 6 is deprecated, so really only Phase 3 uses it

**Recommendation:**
- Move into Phase 3 directory as `generate-introductions.cjs`
- Phase 6 is deprecated anyway (integrated into Phase 3)
- No other phases need this

---

### **3. `phase5_prep_scaffolds.cjs` (UNIQUE - 1 user)**

**Location:** `/scripts/phase5_prep_scaffolds.cjs` (copied from tools/phase-prep/)

**Used By:**
- ✅ **Phase 5** (Baskets) - Preps scaffold files for basket generation

**Purpose:** Creates scaffold structure for LEGOs before basket generation

**Size:** 19KB

**Complexity:** Medium (file scaffolding, LEGO processing)

**Type:** **PHASE-SPECIFIC** - Only Phase 5 needs this

**Recommendation:**
- Move into `services/phases/phase5-basket-generation/prep-scaffolds.cjs`
- 100% specific to Phase 5, should live with phase

---

### **4. `config-loader.cjs` (UNIQUE - 1 user)**

**Location:** `/services/config-loader.cjs`

**Used By:**
- ✅ **Phase 5** (Baskets) - Loads parallelization config (browsers, agents per browser)

**Purpose:** Loads configuration for multi-browser agent spawning

**Size:** 6.8KB

**Complexity:** Low (JSON loading, env vars)

**Type:** **POSSIBLY SHARED** - Currently only Phase 5, but could be used by other phases

**Recommendation:**
- Keep in `services/shared/config-loader.cjs`
- Other phases might want config in future
- Generic utility, not phase-specific

---

## Summary: Shared vs Unique

### **Truly Shared (Multiple Phases Need):**
1. ✅ `spawn_claude_web_agent.cjs` - Phase 1, Phase 3
2. ✅ `config-loader.cjs` - Phase 5 (but could be used by others)

### **Unique (Single Phase Only):**
1. ✅ `phase6-generate-introductions.cjs` - Only Phase 3 (Phase 6 deprecated)
2. ✅ `phase5_prep_scaffolds.cjs` - Only Phase 5

---

## Restructuring Complexity: **LOW**

**Why it's not hard:**
- Only 4 dependencies total
- Only 1 is truly shared across multiple active phases (spawn agent)
- Most dependencies are phase-specific
- Small file sizes (6-19KB each)

**Effort Estimate:**
- **30 minutes** to restructure completely
- Very low risk
- Easy to test

---

## Recommended Structure

### **Option A: Fully Self-Contained (My Recommendation)**

```
services/
  shared/                              # Truly shared utilities
    spawn-agent.cjs                    # ← Phase 1, 3 both use
    config-loader.cjs                  # ← Generic config loading

  phases/
    phase1-translation/
      server.cjs                       # Main server
      spawn-agent.cjs                  # ← Copy of shared (or import ../shared)

    phase3-lego-extraction/
      server.cjs                       # Main server
      spawn-agent.cjs                  # ← Copy of shared (or import ../shared)
      generate-introductions.cjs       # ← Phase-specific (ex-Phase 6)

    phase5-basket-generation/
      server.cjs                       # Main server
      prep-scaffolds.cjs               # ← Phase-specific
      config.json                      # ← Phase-specific config

    phase5.5-grammar-validation/
      server.cjs                       # Already self-contained ✅

    phase7-manifest-compilation/
      server.cjs                       # Already self-contained ✅

    phase8-audio-generation/
      server.cjs                       # Already self-contained ✅
```

**Changes Required:**
1. Create `services/shared/` directory
2. Move `spawn_claude_web_agent.cjs` → `services/shared/spawn-agent.cjs`
3. Move `config-loader.cjs` → `services/shared/config-loader.cjs`
4. Create phase directories (phase1-translation/, phase3-lego-extraction/, phase5-basket-generation/)
5. Move servers and their specific dependencies into phase directories
6. Update require paths

**Files to Move:**
```bash
# Shared utilities
spawn_claude_web_agent.cjs          → services/shared/spawn-agent.cjs
services/config-loader.cjs          → services/shared/config-loader.cjs

# Phase-specific
scripts/phase6-generate-introductions.cjs → services/phases/phase3-lego-extraction/generate-introductions.cjs
scripts/phase5_prep_scaffolds.cjs         → services/phases/phase5-basket-generation/prep-scaffolds.cjs

# Servers (rename and relocate)
services/phases/phase1-translation-server.cjs → services/phases/phase1-translation/server.cjs
services/phases/phase3-lego-extraction-server.cjs → services/phases/phase3-lego-extraction/server.cjs
services/phases/phase5-basket-server.cjs → services/phases/phase5-basket-generation/server.cjs
```

**Require Path Changes:**

Phase 1 server:
```javascript
// Old
const spawnerPath = path.join(__dirname, '../../spawn_claude_web_agent.cjs');

// New (Option 1: Import from shared)
const { spawnClaudeWebAgent } = require('../../shared/spawn-agent.cjs');

// New (Option 2: Local copy)
const { spawnClaudeWebAgent } = require('./spawn-agent.cjs');
```

Phase 3 server:
```javascript
// Old
const { generateIntroductions } = require('../../scripts/phase6-generate-introductions.cjs');
const spawnerPath = path.join(__dirname, '../../spawn_claude_web_agent.cjs');

// New
const { generateIntroductions } = require('./generate-introductions.cjs');
const { spawnClaudeWebAgent } = require('../../shared/spawn-agent.cjs');
```

Phase 5 server:
```javascript
// Old
const { loadConfig } = require('../config-loader.cjs');
const { preparePhase5Scaffolds } = require('../../scripts/phase5_prep_scaffolds.cjs');

// New
const { loadConfig } = require('../../shared/config-loader.cjs');
const { preparePhase5Scaffolds } = require('./prep-scaffolds.cjs');
```

---

### **Option B: Minimal Change (Quick Fix)**

Keep current structure, just fix broken paths:
```
spawn_claude_web_agent.cjs           # Root (Phase 1, 3)
scripts/
  phase6-generate-introductions.cjs  # Phase 3
  phase5_prep_scaffolds.cjs          # Phase 5
services/
  config-loader.cjs                  # Phase 5
  phases/
    phase1-translation-server.cjs
    phase3-lego-extraction-server.cjs
    phase5-basket-server.cjs
    ...
```

**Pros:** Already done, works now
**Cons:** Still scattered, will break during cleanups, hard to understand

---

## My Recommendation: **Option A (Self-Contained)**

**Why:**
1. ✅ **Only 4 dependencies** - Very manageable
2. ✅ **30 minutes of work** - Not a big refactor
3. ✅ **Prevents future breakage** - Won't break during cleanups
4. ✅ **Clear ownership** - Each phase owns its dependencies
5. ✅ **Easy to test** - Test phases in isolation
6. ✅ **Easy to port** - Can move phases to other projects
7. ✅ **Better for collaboration** - Clear what each phase needs

**When:**
- Can do it right now (30 min)
- OR do it after testing current setup works

**Risk:** Low - only 4 files to move, simple require path changes

---

## Test Plan After Restructure

1. **Test Phase 1:** Generate course with Phase 1 only
2. **Test Phase 3:** Run Phase 3 on existing seed_pairs.json
3. **Test Phase 5:** Run Phase 5 on existing lego_pairs.json
4. **Test Full Pipeline:** Generate complete course (1 → 3 → 5 → 7 → 8)

---

## Decision Time

**Question:** Should we:

**A)** Do the 30-minute restructure now (clean, maintainable)
**B)** Test current setup first, restructure later
**C)** Keep current scattered approach (already works)

I recommend **A** or **B** (prefer A - just do it now while we're here).

