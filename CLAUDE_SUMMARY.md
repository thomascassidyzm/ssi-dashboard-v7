# CLAUDE.md Quick Reference

**Last Updated:** 2025-11-20 | **Spec:** APML v8.2.0 | **Architecture:** REST API Microservices

---

## 🚀 Quick Start

```bash
# Start all services
npm run automation

# Check services are running
curl http://localhost:3456/health  # Orchestrator
curl http://localhost:3459/health  # Phase 5
```

---

## 📊 System Overview

**What:** Transforms 668 language-agnostic canonical seeds → complete language courses

**Pipeline:** Phase 1 → 3 (includes 6) → 5 → 7 → 8

**How:** REST API microservices (NO git branching)

---

## 🏗️ Architecture (Current)

### **Microservices**
```
services/orchestration/orchestrator.cjs         (port 3456) - Main orchestrator
services/phases/phase1-translation/             (port 3457) - Translation + LUT
services/phases/phase3-lego-extraction/         (port 3458) - LEGOs + Introductions
services/phases/phase5-basket-generation/       (port 3459) - Practice baskets
services/phases/phase5.5-grammar-validation-*   (port 3460) - Grammar check
services/phases/phase7-manifest-server.cjs      (port 3464) - Compilation
services/phases/phase8-audio-server.cjs         (port 3465) - Audio/TTS (Kai)
```

### **Data Files (per course)**
```
public/vfs/courses/{course_code}/
├── seed_pairs.json          (Phase 1 output)
├── lego_pairs.json          (Phase 3 output)
├── introductions.json       (Phase 6 output - runs in Phase 3)
├── lego_baskets.json        (Phase 5 output)
└── course_manifest.json     (Phase 7 output)
```

### **Canonical Content (language-agnostic)**
```
public/vfs/canonical/
├── canonical_seeds.json     (668 seeds with {target} placeholders)
├── eng_encouragements.json
└── welcomes.json
```

---

## 🎯 Key Principles

1. **REST API First** - Agents fetch via GET, submit via POST (no git branching)
2. **APML v8.2.0** - Current spec (not v7.7)
3. **Staging → Production** - Phase 5 uses `phase5_baskets_staging/` before merge
4. **Validation at Boundaries** - POST endpoints validate before accepting
5. **Self-Contained Services** - Each phase server has all dependencies

---

## 📝 Agent Workflow (New Way)

```bash
# 1. Fetch input data
curl http://localhost:3456/api/courses/spa_for_eng/phase-outputs/3/lego_pairs.json

# 2. Generate content
# ... Claude Code does the work ...

# 3. Submit via POST
curl -X POST http://localhost:3456/api/phase5/spa_for_eng/submit \
  -H "Content-Type: application/json" \
  -d '{"version": "8.2.0", "course": "spa_for_eng", "baskets": {...}}'
```

**No git branching needed!**

---

## 📂 Where to Put Files

### ✅ **DO**
- Scripts → `scripts/` (gitignored)
- Services → `services/phases/`
- Docs → `public/docs/phase_intelligence/`
- Tools → `tools/` (stable, shared utilities)
- Archives → `archive/`

### ❌ **DON'T**
- Create files in root (except configs)
- Commit `scripts/` contents
- Use `automation_server.cjs` (ARCHIVED)
- Work in git branches for agents
- Use outdated v7.7 spec

---

## 🔧 Common Tasks

### **Generate a Course**
```bash
curl -X POST http://localhost:3456/api/start-course-generation \
  -d '{"targetLang": "spa", "knownLang": "eng", "phases": [1,3,5,7]}'
```

### **Check Phase Status**
```bash
curl http://localhost:3456/api/course-status/spa_for_eng
```

### **Fix Language Leakage**
```bash
node scripts/fix_language_leakage.js  # Creates backup automatically
```

---

## 📖 APML v8.2.0 Quick Facts

### **Phase Versions**
- Phase 1: v2.6 (Translation + LUT check)
- Phase 3: v7.1 (LEGOs + Introductions dual output)
- Phase 5: v6.1 (Practice baskets)
- Phase 6: v2.1 (Integrated into Phase 3, <1s overhead)
- Phase 7: v1.1 (Manifest with placeholders)
- Phase 8: v1.1 (Audio + duration population)

### **LEGO Types**
- **ATOMIC (A)**: Single unit (e.g., "I" → "我")
- **MOLECULAR (M)**: Composite with components (e.g., "with you" → "和你" = ["和", "你"])

### **Phase Outputs**
- `seed_pairs.json` - Phase 1 (~500KB)
- `lego_pairs.json` - Phase 3 (~2MB)
- `introductions.json` - Phase 3 (~500KB)
- `lego_baskets.json` - Phase 5 (~5MB)
- `course_manifest.json` - Phase 7 (~20MB)

---

## 🚨 What Changed Recently (Last 24 Hours)

- ✅ **automation_server.cjs ARCHIVED** → Use microservices
- ✅ **APML v8.2.0** → Linear pipeline (1 → 3+6 → 5 → 7 → 8)
- ✅ **REST API architecture** → No git branching
- ✅ **Phase 6 integrated** → Runs in Phase 3 (<1s overhead)
- ✅ **Self-contained services** → Each phase has all dependencies

---

## 🐛 Troubleshooting

### **Services won't start?**
```bash
cat .env.automation  # Check VFS_ROOT is set
ls services/orchestration/orchestrator.cjs  # Verify exists
```

### **Can't submit baskets?**
```bash
curl http://localhost:3459/health  # Check Phase 5 running
ls public/vfs/courses/spa_for_eng/phase5_baskets_staging/  # Verify staging exists
```

### **Spanish in Chinese course?**
```bash
node scripts/fix_language_leakage.js  # Auto-fixes with backup
```

---

## ✅ Pre-Flight Checklist

Before starting work:

- [ ] Read `git log --oneline -10` (see recent changes)
- [ ] Understand **APML v8.2.0** (not v7.7)
- [ ] Know **automation_server is ARCHIVED** (use microservices)
- [ ] Understand **REST API workflow** (no git branching)
- [ ] Check `.gitignore` before creating files
- [ ] Files go in appropriate directories (NOT root)

---

## 📚 Essential Reading

1. **SYSTEM.md** - System architecture overview
2. **ssi-course-production.apml** - APML v8.2.0 spec (SSoT)
3. **CLAUDE.md** - Full agent onboarding guide (this summary's source)
4. **public/docs/phase_intelligence/** - Phase methodology docs

---

## 🎯 Success = Clean Repo + Working Services

✅ Root stays clean
✅ Use REST APIs (not git branches)
✅ Validate before merging
✅ Know APML v8.2.0 is current
✅ automation_server is archived

---

**For full details:** See `CLAUDE.md`

*Last updated: 2025-11-20*
