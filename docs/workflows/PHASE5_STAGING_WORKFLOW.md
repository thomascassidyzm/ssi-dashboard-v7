# Phase 5 Staging Workflow

## Problem Statement

**Git merges are destroying basket data.** We need a safe staging environment where:
1. Agent-generated baskets are immediately saved (git-ignored)
2. Baskets are extracted/normalized in a controlled way
3. Only clean, validated data merges to canon `lego_baskets.json`
4. Canon file goes to GitHub for dashboard consumption

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ AGENT GENERATION (git-ignored)                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Multiple agents generate baskets in various formats:       │
│  • phase5_baskets_staging/seed_S0001_agent01.json          │
│  • phase5_baskets_staging/seed_S0002_agent02.json          │
│  • phase5_baskets_staging/seed_S0003_agent01.json          │
│                                                              │
│  Format variations:                                          │
│  • data.legos (object)                                       │
│  • data.baskets (array)                                      │
│  • data.baskets (object)                                     │
│  • Top-level LEGO IDs                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGING ENVIRONMENT (git-ignored)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Location: public/vfs/courses/{course}/phase5_baskets_staging/ │
│                                                              │
│  Structure:                                                  │
│  ├── seed_S0001_agent01.json    ← Agent outputs            │
│  ├── seed_S0001_agent02.json                                │
│  ├── seed_S0002_agent01.json                                │
│  └── ...                                                     │
│                                                              │
│  Status: Git-ignored, never committed                        │
│  Purpose: Safe landing zone for agent work                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ EXTRACTION & NORMALIZATION (tooling)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tool: tools/phase5/extract-and-normalize.cjs               │
│                                                              │
│  Process:                                                    │
│  1. Scan phase5_baskets_staging/ directory                  │
│  2. Detect format of each file (smart detector)             │
│  3. Extract baskets to normalized structure                  │
│  4. Deduplicate (same LEGO ID from multiple agents)         │
│  5. Validate each basket:                                    │
│     • Has practice_phrases array                             │
│     • 2-2-2-4 distribution                                   │
│     • Valid LEGO references                                  │
│  6. Output: phase5_baskets_normalized.json (git-ignored)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CONTROLLED MERGE (via ngrok or direct)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Option A: ngrok upload (current working solution)          │
│  • Upload normalized baskets to Phase 5 server              │
│  • Server merges atomically per seed                         │
│  • Zero conflict risk                                        │
│                                                              │
│  Option B: Direct merge tool (safer git workflow)           │
│  • Tool: tools/phase5/merge-to-canon.cjs                    │
│  • Reads canon lego_baskets.json                            │
│  • Reads phase5_baskets_normalized.json                     │
│  • Merges only NEW baskets (never overwrites)               │
│  • Validates entire result                                   │
│  • Writes to canon only if valid                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CANON FILE (committed to git)                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  File: public/vfs/courses/{course}/lego_baskets.json        │
│                                                              │
│  Status: COMMITTED TO GIT                                    │
│  Source of truth for dashboard                               │
│  Only modified by controlled merge tools                     │
│  Never edited by agents directly                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD CONSUMPTION                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Dashboard reads ONLY from canon lego_baskets.json          │
│  Never reads from staging directories                        │
│  Always sees validated, clean data                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
public/vfs/courses/{course}/
├── lego_baskets.json                    ✅ CANON (git-committed)
├── phase5_baskets_staging/              ❌ Git-ignored
│   ├── seed_S0001_agent01.json
│   ├── seed_S0001_agent02.json
│   ├── seed_S0002_agent01.json
│   └── ...
├── phase5_baskets_normalized.json       ❌ Git-ignored (intermediate)
└── phase5_outputs/                      ❌ Git-ignored (legacy)
    ├── seed_s0001_baskets.json
    └── ...
```

## Git Ignore Rules

Add to `.gitignore`:

```gitignore
# Phase 5 staging environment (agent outputs)
public/vfs/courses/*/phase5_baskets_staging/

# Phase 5 normalized intermediate files
public/vfs/courses/*/phase5_baskets_normalized.json

# Keep the exception for tracking the directory structure
!public/vfs/courses/*/phase5_baskets_staging/.gitignore
```

## Workflow Steps

### 1. Agent Generation (via ngrok or direct)

Agents generate baskets and save to staging:

```bash
# Via ngrok upload (current)
POST /phase5/upload-basket
{
  "course": "cmn_for_eng",
  "seed": "S0001",
  "baskets": { ... },
  "agentId": "agent-01",
  "staging": true  # ← NEW: Save to staging, not canon
}
```

Server saves to:
```
public/vfs/courses/cmn_for_eng/phase5_baskets_staging/seed_S0001_agent01_timestamp.json
```

### 2. Extract & Normalize

```bash
# Extract from staging to normalized format
node tools/phase5/extract-and-normalize.cjs cmn_for_eng

# Output:
# ✅ Extracted 502 baskets
# ✅ Normalized to standard format
# ✅ Deduplicated 18 duplicates
# ✅ Validated all baskets
# ✅ Saved to phase5_baskets_normalized.json
```

### 3. Review (optional)

```bash
# Review what will be merged
node tools/phase5/preview-merge.cjs cmn_for_eng

# Shows:
# - New baskets to be added: 484
# - Existing baskets (won't overwrite): 2470
# - Conflicts (same ID, different content): 0
# - Validation errors: 0
```

### 4. Merge to Canon

```bash
# Merge normalized baskets to canon
node tools/phase5/merge-to-canon.cjs cmn_for_eng

# Process:
# 1. Load canon lego_baskets.json
# 2. Load phase5_baskets_normalized.json
# 3. Merge only NEW baskets
# 4. Validate entire result
# 5. Write to canon
# 6. Commit to git

# Output:
# ✅ Merged 484 new baskets
# ✅ Canon now has 2954 baskets
# ✅ Validation passed
# ✅ Ready to commit
```

### 5. Commit to Git

```bash
git add public/vfs/courses/cmn_for_eng/lego_baskets.json
git commit -m "phase5: Add 484 baskets via staging workflow"
git push
```

### 6. Clean Staging (optional)

```bash
# Archive staging files (for recovery if needed)
node tools/phase5/archive-staging.cjs cmn_for_eng

# Moves staging files to:
# archive/phase5_staging/cmn_for_eng/2025-11-18/
```

## Key Benefits

### ✅ No Data Loss
- Agent work immediately saved to staging
- Staging is git-ignored but persistent
- Recovery possible from staging at any time

### ✅ Format Flexibility
- Agents can output any format
- Extraction tool normalizes everything
- Canon always has consistent format

### ✅ Controlled Merging
- Never merge invalid data
- Never overwrite existing baskets
- Atomic operations only

### ✅ Git Safety
- Canon only modified by tools, not agents
- Staging never causes merge conflicts
- Clean commit history

### ✅ Transparency
- Preview changes before merging
- Validation at every step
- Audit trail of agent work

## Comparison to Current Workflows

### Old: Direct Git Push (UNSAFE)
```
Agent → Git branch → Manual merge → Data loss
```
**Problems:**
- Merge conflicts destroy data
- Format inconsistencies break merges
- No validation before merge
- Lost 99 baskets in one commit

### Current: ngrok to Canon (SAFER)
```
Agent → ngrok → Server merge → Canon → Git
```
**Problems:**
- No staging buffer
- Can't preview changes
- Can't batch multiple agents
- Format issues hit production

### New: Staging Workflow (SAFEST)
```
Agent → Staging → Normalize → Preview → Merge → Canon → Git
```
**Benefits:**
- Staging buffer prevents data loss
- Normalization handles format diversity
- Preview before merge
- Validation gates at every step
- Clean separation of concerns

## Implementation Priority

### Phase 1: Core Infrastructure (Now)
- [x] Create staging directory structure
- [ ] Add gitignore rules
- [ ] Create extract-and-normalize.cjs tool
- [ ] Create merge-to-canon.cjs tool

### Phase 2: Server Integration
- [ ] Update Phase 5 server to support staging mode
- [ ] Add `staging: true` parameter to upload endpoint
- [ ] Server saves to staging instead of canon

### Phase 3: Workflow Tooling
- [ ] Create preview-merge.cjs tool
- [ ] Create archive-staging.cjs tool
- [ ] Add validation reports

### Phase 4: Documentation & Training
- [ ] Update agent prompts to use staging
- [ ] Create operator runbook
- [ ] Add dashboard staging view (optional)

## Recovery from Current State

We already have staging data in `/tmp/consolidated-staging-baskets.json`:

```bash
# 1. Move to staging directory
mkdir -p public/vfs/courses/cmn_for_eng/phase5_baskets_staging
cp /tmp/consolidated-staging-baskets.json \
   public/vfs/courses/cmn_for_eng/phase5_baskets_staging/recovered_2025-11-18.json

# 2. This is now safe and recoverable
# 3. Can re-normalize and re-merge anytime without risk
```

## Notes

- **Staging is persistent but git-ignored**: Won't cause merge conflicts
- **Canon is the only source of truth**: Dashboard reads from canon only
- **Tools are deterministic**: Same input → same output
- **Validation is mandatory**: Invalid data never reaches canon
- **Audit trail**: Staging files show agent work history

---

**Status**: Architecture designed, ready for implementation
**Priority**: High - Prevents future data loss
**Owner**: Phase 5 pipeline team
