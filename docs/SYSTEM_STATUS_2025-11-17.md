# SSi Course Production System - Status Report
**Date**: 2025-11-17
**Purpose**: Pre-training system audit and handoff documentation

---

## ✅ SYSTEM SERVICES (All Running)

### PM2 Managed Services
```bash
pm2 list
```

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **ssi-automation** | 3456 | ✅ ONLINE | Automation server, orchestration, API |
| **dashboard-ui** | 5173 | ✅ ONLINE | Vite dev server (dashboard frontend) |
| **ngrok-tunnel** | - | ✅ ONLINE | Public tunnel to automation server |

**Public URL**: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev

---

## 📊 CURRENT COURSE INVENTORY

### Production Courses
| Course Code | Seeds | Phase 1 | Phase 3 | Phase 5 | Phase 6 | Phase 7 | Phase 8 |
|-------------|-------|---------|---------|---------|---------|---------|---------|
| **spa_for_eng** | 668 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **cmn_for_eng** | 668 | ✅ | ✅ | ✅ | ✅ | ❓ | ❌ |

### Test Courses
| Course Code | Seeds | Phase 1 | Phase 3 | Phase 5 | Phase 6 | Phase 7 | Phase 8 |
|-------------|-------|---------|---------|---------|---------|---------|---------|
| **ita_for_fra** | 10 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend**:
- ✅ Complete
- ❌ Not done
- ❓ Unknown/needs verification

---

## 📖 PHASE INTELLIGENCE (SSoT)

All phase specifications are **live in the dashboard** at:
- **Location**: `public/docs/phase_intelligence/`
- **Dashboard Route**: `/intelligence` (or via API)
- **Format**: Markdown files with version history

### Active Phase Specs (Locked 🔒)

| Phase | File | Version | Status | Output |
|-------|------|---------|--------|--------|
| 1 | `phase_1_seed_pairs.md` | 2.6 🔒 | ACTIVE | seed_pairs.json |
| 3 | `phase_3_lego_pairs.md` | 7.0 | ACTIVE | lego_pairs.json |
| 5 | `phase_5_lego_baskets.md` | 7.0 | ACTIVE | lego_baskets.json |
| 6 | `phase_6_introductions.md` | 2.0 🔒 | ACTIVE | introductions.json |
| 7 | `phase_7_compilation.md` | 1.0 🔒 | ACTIVE | course_manifest.json |
| 8 | `phase_8_audio_generation.md` | 1.0 | DOCUMENTED | audio/*.mp3 (S3) |

**Key Principle**: Dashboard is the SSoT - agents read phase specs from the live dashboard API.

---

## 🔧 AVAILABLE TOOLS

### Phase Processing Tools (`tools/`)

**Validators**:
```bash
node tools/validators/course-validator.cjs <course_code>
node tools/validators/phase-deep-validator.cjs <course_code> <phase>
```

**Generators**:
```bash
node tools/generators/generate-course-manifest.js
node tools/generators/phase5-merge-batches.cjs <course_code>
node tools/generators/phase6-generate-introductions.cjs <course_code>
```

**Orchestrators**:
```bash
node tools/orchestrators/automation_server.cjs  # Main automation server
node tools/orchestrators/orchestrator-workflow.cjs  # Workflow coordinator
```

**Sync** (S3):
```bash
node tools/sync/sync-course-to-s3.cjs <course_code>
node tools/sync/sync-course-from-s3.cjs <course_code>
```

**Phase Prep**:
```bash
node tools/phase-prep/phase3_prepare_batches.cjs <course_code>
node tools/phase-prep/phase5_prep_scaffolds.cjs <course_code> <seed_range>
```

### Scripts (`scripts/` - gitignored workspace)

Agent-generated batch processors, experiments, one-off fixes.
**Not committed to git** - temporary workspace.

---

## 🔄 COMPLETE WORKFLOW (Phase 1 → 8)

### Prerequisites
- Canonical seeds: `seeds/canonical_seeds.json` (668 seeds)
- Course directory: `public/vfs/courses/{course_code}/`
- Environment variables (AWS, Anthropic API keys)

### Pipeline

#### Phase 1: Pedagogical Translation
**Input**: Canonical English seeds
**Output**: `seed_pairs.json` (target + known language)
**Method**: Dashboard orchestration or manual agent
**Spec**: `phase_1_seed_pairs.md` (v2.6 🔒)

**Key Rules**:
- TWO ABSOLUTE RULES: (1) Never change canonical meaning, (2) Prefer cognates
- Synonym flexibility (cognates teach semantic networks)
- Zero variation (first-come-first-served)

---

#### Phase 3: LEGO Extraction
**Input**: `seed_pairs.json`
**Output**: `lego_pairs.json`
**Method**: Dashboard orchestration or manual agent
**Spec**: `phase_3_lego_pairs.md` (v7.0)

**Key Rules**:
- Remove learner uncertainty (Known → Target mapping must be 1:1)
- Maximize patterns with minimum vocab
- TILING FIRST: Every seed decomposes perfectly

---

#### Phase 5: Practice Basket Generation
**Input**: `lego_pairs.json`
**Output**: `baskets/lego_baskets_s*.json` (one per seed)
**Method**: Dashboard orchestration or manual agent
**Spec**: `phase_5_lego_baskets.md` (v7.0)

**Key Rules**:
- GATE constraint: LEGO #N uses only vocabulary from LEGOs #1 to #(N-1)
- E-phrases (eternal): Natural sentences for spaced repetition
- D-phrases (debut): Mechanically extracted fragments
- Grammar perfection: 100% in both languages

---

#### Phase 6: Introduction Generation
**Input**: `lego_pairs.json`
**Output**: `introductions.json`
**Method**: Script-based (automated)
**Spec**: `phase_6_introductions.md` (v2.0 🔒)

**Command**:
```bash
node tools/generators/phase6-generate-introductions.cjs <course_code>
```

**Key Rules**:
- BASE (simple LEGOs): "Now, the Spanish for X is Y."
- COMPOSITE (complex LEGOs): Component breakdown with "means"
- Seed context: "as in [seed sentence]"

---

#### Phase 7: Course Manifest Compilation
**Input**: All previous phase outputs
**Output**: `course_manifest.json`
**Method**: Script-based (automated)
**Spec**: `phase_7_compilation.md` (v1.0 🔒)

**Command**:
```bash
node scripts/phase7_compile_manifest.cjs public/vfs/courses/<course_code>
```

**Purpose**:
- Compile v7 format → legacy app manifest
- Deterministic UUID generation for audio samples
- Single slice architecture

---

#### Phase 8: Audio Generation ⚠️ **NEVER TESTED**
**Input**: `course_manifest.json`
**Output**: `audio/*.mp3` files (uploaded to S3)
**Method**: **NEEDS TO BE BUILT**
**Spec**: `phase_8_audio_generation.md` (v1.0)

**Status**: ❌ **NO WORKING SCRIPT EXISTS**

**Requirements**:
- ElevenLabs API key (TTS)
- AWS credentials (S3 upload)
- Voice IDs for each language

**Algorithm** (from spec):
1. Load `course_manifest.json`
2. Extract `samples` object
3. For each text variant:
   - Generate TTS audio
   - Save as `{UUID}.mp3`
   - Upload to S3: `courses/{course_code}/audio/{UUID}.mp3`

**Test Course**: `ita_for_fra` (10 seeds → ~1,600 audio files estimated)

---

## 🚨 CRITICAL GAPS

### 1. Phase 8 Audio Generation
**Status**: Specification exists, but NO working implementation
**Impact**: Cannot complete end-to-end course generation
**Priority**: **URGENT** for training

**What's needed**:
- Build `tools/generators/phase8-generate-audio.cjs`
- Test with ElevenLabs API
- Verify S3 upload path structure
- Run on `ita_for_fra` (small test)

### 2. End-to-End Pipeline Test
**Status**: No recent full pipeline test (Phase 1 → 8)
**Impact**: Unknown breakages in integration
**Priority**: HIGH

**What's needed**:
- Complete `ita_for_fra` course (run Phases 3, 5, 6, 7)
- Build and test Phase 8
- Document any issues found

### 3. Training Documentation
**Status**: Dashboard has all specs, but no "getting started" guide
**Impact**: Non-technical user may struggle with first steps
**Priority**: MEDIUM

**What's needed**:
- Quick start guide in dashboard
- Screenshots/video walkthrough
- Troubleshooting common issues

---

## 📂 PROJECT STRUCTURE

```
/
├── README.md              # Project overview
├── CLAUDE.md              # Agent onboarding guide (⭐ KEY DOCUMENT)
├── SYSTEM.md              # System architecture
├── public/
│   ├── docs/
│   │   └── phase_intelligence/    # ⭐ Phase specs (SSoT)
│   └── vfs/
│       └── courses/              # Course data
├── tools/                 # Stable, committed utilities
│   ├── orchestrators/
│   ├── validators/
│   ├── generators/
│   ├── mergers/
│   ├── sync/
│   └── phase-prep/
├── scripts/              # Workspace (gitignored)
│   ├── batch-temp/       # Agent-generated
│   ├── experiments/      # Testing
│   └── fixes/            # One-off fixes
├── src/                  # Dashboard frontend (Vue 3)
├── api/                  # Backend services (Express)
├── automation_server.cjs # Main orchestration server
└── ecosystem.config.cjs  # PM2 configuration
```

**Key Files**:
- **CLAUDE.md**: Agent onboarding (read this first!)
- **public/docs/phase_intelligence/**: Phase specifications
- **ecosystem.config.cjs**: PM2 service definitions

---

## 🎯 PRE-TRAINING CHECKLIST

### System Health
- [x] PM2 services running
- [x] Dashboard accessible (localhost:5173)
- [x] Automation server responding (port 3456)
- [x] Ngrok tunnel active (public access)
- [x] Phase specs in dashboard

### Phase Testing
- [ ] Phase 1: Verify with example seed
- [ ] Phase 3: Run on `ita_for_fra`
- [ ] Phase 5: Run on `ita_for_fra`
- [ ] Phase 6: Run on `ita_for_fra`
- [ ] Phase 7: Run on `ita_for_fra`
- [ ] Phase 8: **BUILD** and test on `ita_for_fra`

### Documentation
- [ ] Quick start guide for non-technical users
- [ ] Troubleshooting guide
- [ ] Video walkthrough (optional but helpful)

---

## 🔑 CRITICAL ENVIRONMENT VARIABLES

Located in `.env` file:

```bash
# AWS (for S3 course data sync + audio upload)
AWS_ACCESS_KEY_ID=AKIAYOZ5W4WS34FFVFOJ
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs

# Anthropic (for AI-driven course generation)
ANTHROPIC_API_KEY=<in .env file>

# ElevenLabs (for Phase 8 audio generation) ⚠️ NEEDED
ELEVENLABS_API_KEY=<NOT SET - REQUIRED FOR PHASE 8>
```

**Action needed**: Get ElevenLabs API key for Phase 8 testing.

---

## 📞 SUPPORT RESOURCES

### Live Dashboard
- **Local**: http://localhost:5173
- **Public**: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev

### Documentation
- **Phase Intelligence**: Dashboard → Intelligence tab
- **CLAUDE.md**: Agent onboarding guide
- **SYSTEM.md**: System architecture

### Logs
```bash
pm2 logs                    # All services
pm2 logs ssi-automation    # Automation server only
pm2 logs dashboard-ui       # Dashboard only
```

---

## 🎓 TRAINING APPROACH

### The Dashboard IS the Training Manual
- All phase specifications live in dashboard
- Non-technical user reads specs from browser
- Dashboard provides examples, validation rules, anti-patterns
- No separate PDF/docs needed

### Hands-On Learning Path
1. **Understand the Pipeline**: Phase 1 → 3 → 5 → 6 → 7 → 8
2. **Read Phase Specs**: Start with Phase 1, understand principles
3. **Run Small Test**: Complete `ita_for_fra` (10 seeds)
4. **Observe Outputs**: See how data flows between phases
5. **Troubleshoot**: Learn validation, error handling
6. **Scale Up**: Try larger course batch

### Key Concepts to Teach
- **LEGO methodology**: Language as reusable building blocks
- **Functional Determinism**: Known → Target must be 1:1 (no uncertainty)
- **GATE constraint**: Vocabulary only from earlier LEGOs
- **Cognate preference**: Build semantic networks (Phase 1)
- **Zero variation**: First-come-first-served (Phase 1, seeds 1-100)

---

## ✅ NEXT STEPS (Before Training)

### URGENT (Must Do)
1. **Build Phase 8 audio generator**
   - Script: `tools/generators/phase8-generate-audio.cjs`
   - Test with `ita_for_fra` (small course)
   - Verify S3 upload works

2. **Complete `ita_for_fra` pipeline**
   - Run Phases 3, 5, 6, 7, 8
   - Document any errors/fixes needed

### HIGH PRIORITY (Should Do)
3. **Create quick start guide**
   - Where is dashboard?
   - How to read phase specs?
   - How to run a complete course?

4. **Test all validation tools**
   - Ensure validators work
   - Document expected output

### NICE TO HAVE
5. **Video walkthrough**
   - Screen recording of complete pipeline
   - Non-technical friendly

---

**Status**: System is 90% ready. Phase 8 is the critical missing piece.
**Recommendation**: Focus on building/testing Phase 8 before training session.

---

*Last updated: 2025-11-17 18:10*
