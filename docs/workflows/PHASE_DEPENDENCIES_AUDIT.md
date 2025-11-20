# Phase Server Dependencies Audit

**Date:** 2025-11-20
**Purpose:** Document all external dependencies for phase servers and evaluate self-contained architecture

---

## Current Dependency Map

### **Phase 1: Translation Server**
**Location:** `services/phases/phase1-translation-server.cjs`

**Dependencies:**
| File | Expected Path | Actual Path | Status |
|------|---------------|-------------|--------|
| `spawn_claude_web_agent.cjs` | `../../spawn_claude_web_agent.cjs` (root) | ✅ `/spawn_claude_web_agent.cjs` | Fixed |

**Purpose:**
- Spawns Claude Code browser sessions for translation work
- Opens Safari tabs via osascript
- Handles agent coordination

---

### **Phase 3: LEGO Extraction Server**
**Location:** `services/phases/phase3-lego-extraction-server.cjs`

**Dependencies:**
| File | Expected Path | Actual Path | Status |
|------|---------------|-------------|--------|
| `spawn_claude_web_agent.cjs` | `../../spawn_claude_web_agent.cjs` | ✅ `/spawn_claude_web_agent.cjs` | Fixed |
| `phase6-generate-introductions.cjs` | `../../scripts/phase6-generate-introductions.cjs` | ✅ `/scripts/phase6-generate-introductions.cjs` | OK |

**Purpose:**
- Spawns agents for LEGO extraction
- Generates introductions inline (Phase 6 integrated into Phase 3)

---

### **Phase 5: Basket Generation Server**
**Location:** `services/phases/phase5-basket-server.cjs`

**Dependencies:**
| File | Expected Path | Actual Path | Status |
|------|---------------|-------------|--------|
| `config-loader.cjs` | `../config-loader.cjs` | ✅ `/services/config-loader.cjs` | OK |
| `phase5_prep_scaffolds.cjs` | `../../scripts/phase5_prep_scaffolds.cjs` | ❌ `/tools/phase-prep/phase5_prep_scaffolds_v10.cjs` | **BROKEN** |

**Purpose:**
- Loads parallelization configuration
- Preps scaffolds for basket generation

---

### **Phase 5.5: Grammar Validation Server**
**Location:** `services/phases/phase5.5-grammar-validation-server.cjs`

**Dependencies:**
- None (self-contained) ✅

---

### **Phase 6: Introduction Server** (Deprecated - integrated into Phase 3)
**Location:** `services/phases/phase6-introduction-server.cjs`

**Dependencies:**
| File | Expected Path | Actual Path | Status |
|------|---------------|-------------|--------|
| `phase6-generate-introductions.cjs` | `../../scripts/phase6-generate-introductions.cjs` | ✅ `/scripts/phase6-generate-introductions.cjs` | OK |

**Note:** Phase 6 is deprecated but server still exists for legacy support.

---

### **Phase 7: Manifest Compilation Server**
**Location:** `services/phases/phase7-manifest-server.cjs`

**Dependencies:**
- None (self-contained) ✅

---

### **Phase 8: Audio/TTS Server**
**Location:** `services/phases/phase8-audio-server.cjs`

**Dependencies:**
- None (minimal stub) ✅

---

## Issues Found

### **🔴 Critical: Phase 5 Broken**
**Problem:** Phase 5 server requires `scripts/phase5_prep_scaffolds.cjs` but file is at `tools/phase-prep/phase5_prep_scaffolds_v10.cjs`

**Impact:** Phase 5 will crash when trying to prep scaffolds

**Fix Options:**
1. Copy `tools/phase-prep/phase5_prep_scaffolds_v10.cjs` to `scripts/phase5_prep_scaffolds.cjs`
2. Update Phase 5 server to require from correct path
3. **Recommended:** Restructure to self-contained phase directories (see below)

---

## Proposed: Self-Contained Phase Architecture

### **Current Structure (Scattered Dependencies)**
```
services/phases/
  phase1-translation-server.cjs → requires ../../spawn_claude_web_agent.cjs
  phase3-lego-extraction-server.cjs → requires ../../scripts/phase6-*.cjs
  phase5-basket-server.cjs → requires ../../scripts/phase5_prep_*.cjs

spawn_claude_web_agent.cjs (root)
scripts/
  phase6-generate-introductions.cjs
tools/phase-prep/
  phase5_prep_scaffolds_v10.cjs
```

**Problems:**
- Dependencies scattered across multiple directories
- Hard to understand what each phase needs
- Brittle paths (`../../scripts/...`)
- Difficult to test phases in isolation
- Cleanup operations can break dependencies (as happened)

---

### **Recommended: Self-Contained Modules**
```
services/phases/
  phase1-translation/
    server.cjs                  # Main server (port 3457)
    spawn-agent.cjs             # Browser spawning logic
    intelligence.md             # Phase 1 methodology
    validators/                 # Translation validation
    utils/                      # Helper functions

  phase3-lego-extraction/
    server.cjs                  # Main server (port 3458)
    spawn-agent.cjs             # Browser spawning
    generate-introductions.cjs  # Intro generation (ex-Phase 6)
    intelligence.md             # Phase 3 methodology
    validators/                 # LEGO validation

  phase5-basket-generation/
    server.cjs                  # Main server (port 3459)
    prep-scaffolds.cjs          # Scaffold preparation
    spawn-agent.cjs             # Browser spawning
    intelligence.md             # Phase 5 methodology
    validators/                 # Basket validation
    config.json                 # Phase-specific config

  phase5.5-grammar-validation/
    server.cjs                  # Main server (port 3460)
    intelligence.md             # Grammar rules

  phase7-manifest-compilation/
    server.cjs                  # Main server (port 3462)
    compile-manifest.cjs        # Manifest logic
    intelligence.md             # Compilation methodology

  phase8-audio-generation/
    server.cjs                  # Main server (port 3463)
    generate-audio.cjs          # TTS logic
    intelligence.md             # Audio methodology
```

**Benefits:**
✅ Each phase is a self-contained module
✅ All dependencies co-located with phase
✅ Easy to understand what each phase needs
✅ Simple relative requires (`./spawn-agent.cjs`)
✅ Can test each phase in isolation
✅ Safe to archive/cleanup other directories
✅ Easy to port phases to different projects
✅ Clear ownership and maintenance

**Shared Utilities:**
```
services/shared/
  config-loader.cjs           # Shared config loading
  vfs-utils.cjs               # VFS operations
  git-utils.cjs               # Git branch operations
  orchestrator-client.cjs     # Report to orchestrator
```

---

## Migration Path

### **Option 1: Immediate Fix (Quick)**
Copy missing files to expected locations:
```bash
cp tools/phase-prep/phase5_prep_scaffolds_v10.cjs scripts/phase5_prep_scaffolds.cjs
```

**Pros:** Quick, works now
**Cons:** Doesn't solve architectural issue, still scattered

---

### **Option 2: Gradual Refactor (Recommended)**
Migrate one phase at a time to self-contained structure:

**Week 1: Phase 1**
1. Create `services/phases/phase1-translation/` directory
2. Move `phase1-translation-server.cjs` → `server.cjs`
3. Copy `spawn_claude_web_agent.cjs` → `spawn-agent.cjs`
4. Update requires to use `./spawn-agent.cjs`
5. Test Phase 1 generation
6. Update `start-automation.cjs` to point to new path

**Week 2: Phase 3**
1. Create `services/phases/phase3-lego-extraction/` directory
2. Move server and dependencies
3. Test LEGO extraction + introductions

**Week 3: Phase 5**
1. Create `services/phases/phase5-basket-generation/` directory
2. Move server, prep-scaffolds, config
3. Test basket generation

**Week 4+: Remaining phases**

**Pros:** Clean architecture, maintainable, each phase independent
**Cons:** Takes time, requires careful testing

---

### **Option 3: Hybrid Approach**
Fix immediate issues now, plan refactor later:

**Today:**
```bash
# Fix Phase 5 broken dependency
cp tools/phase-prep/phase5_prep_scaffolds_v10.cjs scripts/phase5_prep_scaffolds.cjs

# Verify all critical dependencies
ls -lh spawn_claude_web_agent.cjs
ls -lh scripts/phase6-generate-introductions.cjs
ls -lh scripts/phase5_prep_scaffolds.cjs
```

**Next Sprint:**
Plan and execute self-contained refactor

---

## Recommendation

**Immediate (Today):**
- ✅ Fix Phase 5 broken dependency (copy file)
- ✅ Document this audit
- ✅ Test Phase 1 generation works

**Short Term (Next 2 weeks):**
- Refactor to self-contained phase modules
- Start with Phase 1 (most critical)
- One phase at a time, with testing

**Long Term:**
- All phases self-contained
- Clear separation of concerns
- Easy to maintain and extend

---

## Decision Required

**Question for Tom:**
> "Should we do a quick fix now (copy missing files) and plan a proper refactor, or start the self-contained refactor immediately?"

**My recommendation:** Quick fix today, gradual refactor starting next week. This gets testing working NOW while setting up for better architecture.

