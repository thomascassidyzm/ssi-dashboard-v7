# APML Gap Analysis Report
**Generated**: 2026-01-28
**Analyzed by**: 13 parallel agents
**Last APML Update**: 2026-01-15 (v14.0.0)
**Commits Since**: 210+

---

## Executive Summary

The SSi Dashboard codebase has significant documentation debt. Since the last APML update (January 15, 2026), there have been **210+ commits** introducing major new features that are completely undocumented.

| Category | Documented | NOT Documented | Coverage |
|----------|------------|----------------|----------|
| API Endpoints | 24 | **102** | 17% |
| Vue Components | 12 | **46** | 21% |
| Database Tables | 8 | **4** | 67% |
| Composables/Stores | 0 | **10** | 0% |
| Skills/Commands | 3 | **9** | 25% |
| TypeScript Types | ~5 | **9** | 36% |

### Critical Breaking Changes (Undocumented)
1. **Port 3456 → 3470**: Main entry point changed
2. **`courses.code` → `courses.course_code`**: Column rename
3. **Sonnet model removed**: Only Opus supported

---

## 1. Database Schema Gaps

### Tables Missing from APML

| Table | Purpose | Priority |
|-------|---------|----------|
| **`build_jobs`** | Multi-pass Course Builder coordination | CRITICAL |
| **`course_export_states`** | 4-step export workflow state | CRITICAL |
| **`sample_flags`** | QA workflow state machine | HIGH |
| **`documentation_content`** | Agent methodology storage | MEDIUM |

### Schema Issues
- `lego_introductions` documented in APML but **no CREATE TABLE** in migrations
- `course_audio.lego_id` column in APML but **not in actual schema**
- RLS policies for new tables not documented
- Trigger functions (`check_pass_1_complete()`) not in spec

---

## 2. API Endpoints Gaps

### Production API (Port 3470)
**84 endpoints total, only 15 documented (18% coverage)**

#### New Endpoint Categories NOT in APML:
- **Mission Control** (3 endpoints): `/api/mission-control/jobs`, `/stop`
- **Build Management** (4 endpoints): `/api/build/start`, `/stop`, `/status`, `/active`
- **Voice Configuration** (4 endpoints): GET/PUT/PATCH voice-config
- **Export Workflow** (6 endpoints): `/export-legacy`, `/verify-s3`, `/publish-manifest`, `/deploy-audio`
- **Audio Pipeline** (10 endpoints): `/stats`, `/plan`, `/start`, `/cancel`, `/retry`, `/missing`, `/orphan-legos`, `/fix-orphan-legos`, `/sync-s3`
- **Content Management** (8 endpoints): `/seeds`, `/legos`, `/progress`, `/learning-journey`
- **Feedback** (4 endpoints): POST/GET feedback, `/aggregated`, `/resolve`, `/stats`

### Course Builder API (Port 3471)
**42 endpoints total, only 9 documented (21% coverage)**

#### Undocumented Systems:
- **Activity Tracking** (5 endpoints): `/api/activity/*`, `/api/heartbeat/*`
- **Agent Management** (5 endpoints): `/api/agents/*`
- **Build Management** (4 endpoints): `/api/build/*`
- **Checkpoint/QA** (9 endpoints): `/api/checkpoint/*`
- **Translation Workflow** (4 endpoints): `/api/course/:code/translate`, `/analysis`

---

## 3. Frontend Gaps

### Views NOT in APML
| Route | Component | Purpose |
|-------|-----------|---------|
| `/jobs` | JobsMonitor.vue | Mission Control for all active jobs |
| `/network-builder` | NetworkBuilder.vue | Real-time LEGO network construction |
| `/course/:courseCode` | CourseManager.vue | Course management |
| `/production/:courseCode/text` | TextGeneration.vue | Course Builder text generation |

### Components NOT in APML (46 total)
**Critical:**
- `CourseStatusTable.vue` - Pipeline status display
- `BuildProgressIndicator.vue` - Build progress tracking
- `LegacyExportDialog.vue` - 4-step export workflow
- `EnvironmentSwitcher.vue` - Multi-machine coordination
- `PlatformStatusBadge.vue` - Release management

**Export Workflow (6 components):**
- `LegacyExportDialog.vue`, `ExportStepIndicator.vue`
- `Step1Generate.vue`, `Step2Verify.vue`, `Step3Publish.vue`, `Step4Deploy.vue`

**Quality Review (5 components):**
- `QualityDashboard.vue`, `CourseHealthReport.vue`, `SeedQualityReview.vue`
- `PromptEvolutionView.vue`, `LearnedRulesView.vue`

### Composables NOT Documented (9)
| Composable | Purpose | API Calls |
|------------|---------|-----------|
| `useExportWorkflow.ts` | 4-step export orchestration | 10+ endpoints |
| `useAudioUpload.ts` | Audio blob upload | 1 endpoint |
| `useContinuousRecorder.ts` | Teleprompt recording | Local |
| `useVAD.ts` | Voice Activity Detection | Local |
| `useRecorder.ts` | Standard recording | Local |
| `useAuth.js` | Magic link auth | 4 endpoints |
| `useAutocueState.js` | Teleprompter workflow | 3 endpoints |
| `useScriptPlayer.js` | 4-phase audio playback | S3 direct |
| `usePromptManager.js` | APML prompt editing | 2 endpoints |

### Pinia Store NOT Documented
- `production.js` - Central production state (10+ API calls)

---

## 4. Services Gaps

### Services NOT in APML
| Service | Purpose | Priority |
|---------|---------|----------|
| `network-builder-api.cjs` | LEGO network construction | HIGH |
| `manifest-validator.cjs` | Manifest validation | MEDIUM |
| `publish-manifest-service.cjs` | Manifest publishing | MEDIUM |
| `progress-tracker.cjs` | Progress tracking | LOW |

### Production API APML Severely Outdated
- APML version: 1.0.0 (2026-01-03)
- Documented: ~15 endpoints
- **Actual: 84 endpoints (6x more)**

---

## 5. APML Staleness Issues

### Incorrect Information in APML
| File | Issue |
|------|-------|
| `ssi-dashboard-master.apml:198` | Says port 3456, reality is **3470** |
| `orchestrator.apml` | Has 30+ deprecated Phase 0-3 endpoints |
| `configuration.apml` | Lists ports 3457-3459 that **don't exist** |
| `ssi-production-suite.apml:554-679` | Agent Swimlane (150 lines) marked deprecated but still in spec |

### "To Be Extracted" Items Now Implemented
- Dashboard UI (`src/views/Dashboard.vue`) - EXISTS
- Course Editor UI (`src/components/lego-editor/*`) - EXISTS
- Quality Review UI (`src/components/quality/*`) - EXISTS

---

## 6. Skills/Commands Gaps

### Documented in APML (3)
- `ssi-learner-pattern.md`
- `ssi-decompose-seed.md`
- `ssi-build-phrases.md`

### NOT Documented in APML (9)
| Skill | Priority | Purpose |
|-------|----------|---------|
| `course-resume.md` | HIGH | Agent recovery after context compaction |
| `checkpoint-qa.md` | HIGH | Quality gate specification |
| `audio-generation.md` | HIGH | Core operational workflow |
| `course-audit.md` | HIGH | Quality validation |
| `ssi-translation-methodology.md` | MEDIUM | ZUT principle, translation rules |
| `ssi-phrase-variety.md` | MEDIUM | Practice score metrics |
| `translation-analysis.md` | MEDIUM | Two-pass workflow guide |
| `audio-generation-troubleshooting.md` | MEDIUM | Edge case handling |
| `jpn-analysis-example.md` | LOW | Reference material |

---

## 7. TypeScript Types Gaps

### Types NOT in APML (9)
- `ExportState`, `S3VerificationResult`, `DeployPlan`, `DeployVerification`
- `VersionInfo`, `ManifestStats`, `ValidationResult`
- `CourseManifest`, `KeyboardShortcut`, `FlagModalData`

### APML Models WITHOUT TypeScript Types (9)
- `Course`, `Seed`, `LEGO`, `Basket`, `PracticePhrase`
- `Voice`, `GenerationJob`, `RecordingQueue`, `RecordingItem`

### Type Mismatches
- `SampleStatus`: 15 values in TS vs 5 in APML
- `AudioSample`: Has `cadence` but APML v13 doesn't store it

---

## 8. Environment Variables Gaps

### Undocumented Variables (8)
| Variable | Used In | Purpose |
|----------|---------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | 30+ files | Alt service auth |
| `GOOGLE_PROJECT_ID` | google-tts-service | Google TTS |
| `GOOGLE_TTS_API_KEY` | google-tts-service | Google TTS |
| `S3_AUDIO_BUCKET` | orchestrator, phase8 | Dedicated audio bucket |
| `PHASE8_PORT` | Code only | Audio generation port |
| `COURSE_BUILDER_PORT` | Code only | Course Builder port |
| `DEBUG` | 10+ files | Verbose logging |
| `CORS_ORIGIN` | production-api | CORS headers |

---

## 9. PM2/Ecosystem Config

### Good News
All service ports match between APML and ecosystem.config!

### Issues
- **ngrok still targets 3456** but should be 3470
- `keep-awake.sh` utility not documented
- Node memory args not documented

---

## Priority Action Items

### P0 - CRITICAL (Do Now)
1. **Update port in master spec**: 3456 → 3470
2. **Document `build_jobs` table**: New coordination layer
3. **Document `course_export_states` table**: Export workflow state
4. **Update Production API APML**: Add 69 missing endpoints
5. **Document export workflow**: 4-step process completely missing

### P1 - HIGH (This Week)
1. Update Course Builder API APML (33 missing endpoints)
2. Document Mission Control job system
3. Document checkpoint/QA workflow (9 endpoints)
4. Document activity tracking system (10 endpoints)
5. Add critical Vue components to APML
6. Document composables and stores

### P2 - MEDIUM (This Month)
1. Remove deprecated Phase 0-3 endpoints from orchestrator.apml
2. Archive Agent Swimlane interface (150 lines)
3. Document all .claude skills
4. Create TypeScript types for APML models
5. Document environment variables
6. Update ngrok target in ecosystem.config

### P3 - LOW (Backlog)
1. Create apml/frontend/ directory for composables/stores
2. Auto-generate APML from JSDoc comments
3. Create OpenAPI/Swagger export
4. Version APML files with semver

---

## Files to Update

### Must Update Now
- `apml/services/production-api.apml` - Add 69 endpoints
- `apml/services/course-builder-api.apml` - Add 33 endpoints
- `apml/ssi-dashboard-master.apml` - Fix port 3456→3470
- `apml/core/audio-registry-v13.apml` - Add build_jobs, course_export_states

### Should Update Soon
- `apml/services/orchestrator.apml` - Remove deprecated endpoints
- `apml/ssi-production-suite.apml` - Remove Agent Swimlane
- `ecosystem.config.cjs` - Update ngrok target

### Create New
- `apml/core/build-jobs.apml` - Build coordination spec
- `apml/core/export-workflow.apml` - Export workflow spec
- `apml/frontend/composables.apml` - Frontend state management
- `apml/frontend/components.apml` - Vue component catalog

---

## Appendix: Agent Analysis Sources

| Agent | Focus | Key Finding |
|-------|-------|-------------|
| 1 | Database Schema | 4 tables missing, trigger functions undocumented |
| 2 | Frontend Views | 6 views completely undocumented |
| 3 | Services | Production API has 6x more endpoints than documented |
| 4 | Components | 46 of 58 components not in APML |
| 5 | Git Commits | 210 commits, 30+ need APML updates |
| 6 | Composables | 9 composables, 1 store, all undocumented |
| 7 | APML Staleness | Port wrong, 30+ deprecated endpoints still in spec |
| 8 | API Endpoints | 126 total, only 17% documented |
| 9 | TypeScript | 9 types missing from APML, 9 APML models without TS |
| 10 | Skills | 9 of 12 skills undocumented |
| 11 | PM2 Config | Ports match, ngrok target wrong |
| 12 | new_vision | Most features implemented, docs can be archived |
| 13 | Env Variables | 8 undocumented variables |

---

*Report generated by Claude Opus 4.5 using 13 parallel analysis agents*
