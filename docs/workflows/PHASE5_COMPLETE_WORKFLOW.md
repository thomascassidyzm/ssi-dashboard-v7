# Phase 5: Complete Workflow Breakdown

**Every single step from detection to deployment**

---

## Overview

**Total Steps**: 30
**Manual Steps**: 11
**Automatic Steps**: 19
**Loops**: 2 main loops (master spawns sub-agents, sub-agent processes LEGOs)

---

## PRE-LAUNCH: Preparation (Manual)

### Step 1: Detect Missing Baskets
- **Input**: `lego_pairs.json` (all LEGOs with `new: true/false` tags)
- **Process**: Find all LEGOs marked `new: true` without baskets
- **Script**: `scripts/detect_missing_baskets_new_only.cjs`
- **Output**: `phase5_missing_baskets_new_only.json`
- **Trigger**: Manual

### Step 2: Divide Into Patches
- **Input**: `phase5_missing_baskets_new_only.json`
- **Process**: Divide missing LEGOs into 12 patches (~56 seeds each)
- **Script**: `scripts/universal_12master_orchestration/divide_into_patches.cjs`
- **Output**: `phase5_patch_manifest.json`
- **Trigger**: Manual

### Step 3: Generate Master Prompts
- **Input**: `phase5_patch_manifest.json`, `templates/phase5_master_template.md`
- **Process**: Fill template for each of 12 patches
- **Script**: `scripts/universal_12master_orchestration/generate_master_prompts.cjs`
- **Output**: 12 files in `scripts/phase5_master_prompts/`
- **Trigger**: Manual

### Step 4: Launch 12 Masters
- **Input**: 12 prompt files
- **Process**: Open Safari tabs, auto-paste prompts
- **Script**: `scripts/phase5_launch_12_masters.sh`
- **Output**: 12 browser tabs with Claude Code sessions
- **Trigger**: Manual

---

## MASTER AGENT WORKFLOW (×12 in parallel)

### Step 5: Master Reads LEGO List
- **Input**: LEGO list from prompt (e.g., 196 LEGOs for Patch 1)
- **Process**: Parse JSON list of LEGO IDs
- **Agent**: Master agent (Claude Code web)
- **Output**: In-memory LEGO list
- **Trigger**: Automatic

### Step 6: Create Scaffolds
- **Input**: LEGO list, `lego_pairs.json`, `seed_pairs.json`
- **Process**: For each LEGO, create scaffold with context and available LEGOs
- **Agent**: Master agent
- **Output**: `phase5_scaffolds/scaffold_SXXXXLXX.json` (×196 files for Patch 1)
- **Trigger**: Automatic

**Scaffold structure**:
```json
{
  "lego_id": "S0003L01",
  "known": "I'd like",
  "target": "我想",
  "seed_id": "S0003",
  "recent_context": [...],
  "available_legos": [...]
}
```

### Step 7: Batch LEGOs for Sub-Agents
- **Input**: 196 LEGO IDs (example for Patch 1)
- **Process**: Divide into batches of ~10 LEGOs
- **Agent**: Master agent
- **Output**: ~20 batches of 10 LEGO IDs each
- **Trigger**: Automatic

### Step 8: Spawn Sub-Agents
- **Input**: Batch assignments (20 batches)
- **Process**: Use Task tool to spawn 20 sub-agents in parallel
- **Agent**: Master agent
- **Output**: 20 sub-agent sessions launched
- **Trigger**: Automatic

---

## SUB-AGENT WORKFLOW (×20 per master = ~240 total)

### Step 9: Sub-Agent Reads Assignment
- **Input**: Batch of 10 LEGO IDs, Phase 5 intelligence prompt URL
- **Process**: Fetch intelligence prompt, parse LEGO list
- **Agent**: Sub-agent (spawned by master)
- **Output**: In-memory task list (10 LEGOs to process)
- **Trigger**: Automatic

### Step 10: Read Scaffolds
- **Input**: 10 LEGO IDs, `phase5_scaffolds/` directory
- **Process**: Read `scaffold_SXXXXLXX.json` for each LEGO
- **Agent**: Sub-agent
- **Output**: In-memory scaffolds (10 scaffolds loaded)
- **Trigger**: Automatic

### Step 11: Generate Baskets (LOOP: ×10 per sub-agent)
- **Input**: Single scaffold (one LEGO), Phase 5 intelligence rules
- **Process**: Generate 10 practice phrases with 2-2-2-4 difficulty distribution
  - 2 phrases at difficulty 1-2 LEGOs (fragments OK)
  - 2 phrases at difficulty 2-3 LEGOs
  - 2 phrases at difficulty 3-4 LEGOs
  - 4 phrases at difficulty 4-5 LEGOs (full grammar)
- **Agent**: Sub-agent
- **Output**: 10 practice phrases
- **Trigger**: Automatic (loops through 10 LEGOs)

### Step 12: Grammar Self-Check
- **Input**: 10 generated phrases (for current LEGO)
- **Process**: Review using Phase 5 prompt 7-point checklist:
  1. Word order correct?
  2. Verb choice appropriate?
  3. Particle placement correct?
  4. Completeness (fragments OK for 1-2 LEGOs)?
  5. Formality appropriate for Phase 1?
  6. GATE compliance (no untaught vocab)?
  7. Naturalness for complexity level?
- **Agent**: Sub-agent (self-review)
- **Output**: Corrected phrases (if issues found)
- **Trigger**: Automatic

### Step 13: Save Basket (LOOP END)
- **Input**: 10 validated phrases for current LEGO
- **Process**: Append to in-memory basket collection
- **Agent**: Sub-agent
- **Output**: In-memory basket (grows with each LEGO)
- **Trigger**: Automatic
- **Result**: After processing all 10 LEGOs, contains 100 phrases (10 × 10)

### Step 14: Group by Seed
- **Input**: 100 phrases across 10 LEGOs
- **Process**: Group baskets by parent seed
- **Agent**: Sub-agent
- **Output**: Seed-grouped baskets
- **Trigger**: Automatic

### Step 15: Write Output Files
- **Input**: Seed-grouped baskets
- **Process**: Write one file per seed
- **Agent**: Sub-agent
- **Output**: `phase5_outputs/seed_SXXXX_baskets.json` (multiple files)
- **Trigger**: Automatic

### Step 16: Git Add & Commit (Batched)
- **Input**: Seed basket files
- **Process**: `git add phase5_outputs/seed_S00*.json && git commit`
- **Agent**: Sub-agent
- **Output**: Local git commit
- **Trigger**: Automatic
- **Note**: Commits but DOES NOT push (avoid conflicts)

### Step 17: Report to Master
- **Input**: Completion status
- **Process**: Return success/failure message
- **Agent**: Sub-agent → Master
- **Output**: Report (e.g., "✅ Batch 1 complete: 10 LEGOs, 100 phrases")
- **Trigger**: Automatic

---

## MASTER AGENT: Monitoring & Coordination

### Step 18: Master Monitors Sub-Agents
- **Input**: 20 sub-agent reports
- **Process**: Track completion of all 20 sub-agents
- **Agent**: Master agent
- **Output**: Completion dashboard in browser
- **Trigger**: Automatic (as sub-agents report back)

### Step 19: Handle Failures (If Any)
- **Input**: Failed sub-agent report
- **Process**: Respawn sub-agent for failed batch
- **Agent**: Master agent
- **Output**: New sub-agent session
- **Trigger**: Conditional (if sub-agent fails)

### Step 20: Batch Git Push
- **Input**: All 20 sub-agents completed
- **Process**: `git pull --rebase && git push origin main`
- **Agent**: Master agent
- **Output**: Remote git updated
- **Trigger**: Automatic
- **Push size**: ~196 baskets × 10 phrases = ~1,960 phrases

### Step 21: Final Report
- **Input**: Completion statistics
- **Process**: Generate summary report
- **Agent**: Master agent
- **Output**: Report in browser
- **Trigger**: Automatic

**Example report**:
```
✅ Patch 1 Complete
   Seeds: S0001-S0056
   LEGOs generated: 196
   Sub-agents spawned: 20
   Phrases created: 1,960
   Files written: 56
   Status: All baskets saved to phase5_outputs/
```

---

## POST-COMPLETION: Validation & Merge (Manual)

### Step 22: Wait for All 12 Masters
- **Input**: 12 master completion reports
- **Process**: Human monitors all 12 browser tabs
- **Agent**: Human operator
- **Output**: Visual confirmation (all tabs show ✅)
- **Trigger**: Manual

### Step 23: Run GATE Validator
- **Input**: All files in `phase5_outputs/`
- **Process**: Check every phrase for untaught vocabulary
- **Script**: `scripts/phase5_gate_validator_v2.cjs cmn_for_eng`
- **Output**: `phase5_gate_violations.json`
- **Trigger**: Manual

### Step 24: Run LUT Validator
- **Input**: All files in `phase5_outputs/`
- **Process**: Check for learner uncertainty (multiple targets for same known)
- **Script**: `scripts/phase5_lut_validator.cjs cmn_for_eng`
- **Output**: `phase5_lut_uncertainties.json`
- **Trigger**: Manual

### Step 25: Run Grammar Validator
- **Input**: All files in `phase5_outputs/`
- **Process**: Sample review of grammar naturalness
- **Script**: `scripts/phase5_grammar_review_v2.cjs cmn_for_eng batch`
- **Output**: `phase5_grammar_review.json`
- **Trigger**: Manual

### Step 26: Fix Violations (If Any)
- **Input**: Validation reports
- **Process**: Delete bad phrases using deletion tool
- **Script**: `scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete SXXXX SXXXXLXX <index>`
- **Output**: Updated basket files
- **Trigger**: Manual (if violations found)

### Step 27: Merge Baskets
- **Input**: All validated files in `phase5_outputs/`
- **Process**: Merge into main `lego_baskets.json`
- **Script**: `scripts/phase5_merge_batches.cjs cmn_for_eng`
- **Output**: `public/vfs/courses/cmn_for_eng/lego_baskets.json` (updated)
- **Trigger**: Manual

### Step 28: Final Commit & Push
- **Input**: Updated `lego_baskets.json`
- **Process**: `git add`, `git commit`, `git push`
- **Agent**: Human (or automation)
- **Output**: Main course file updated in git
- **Trigger**: Manual

### Step 29: Cleanup Phase Outputs
- **Input**: `phase5_outputs/` directory
- **Process**: Archive or delete individual seed files
- **Script**: Optional cleanup
- **Output**: Clean workspace
- **Trigger**: Manual (optional)

### Step 30: Sync to S3 (Production)
- **Input**: Updated course files
- **Process**: Upload to S3 for production deployment
- **Script**: `tools/sync/sync-course-to-s3.cjs cmn_for_eng`
- **Output**: Production course updated
- **Trigger**: Manual

---

## Summary Table

| Phase | Steps | Type | Count |
|-------|-------|------|-------|
| Pre-Launch | 1-4 | Manual | 4 |
| Master Workflow | 5-8 | Automatic | 4 × 12 = 48 |
| Sub-Agent Workflow | 9-17 | Automatic | 9 × 240 = 2,160 |
| Master Monitoring | 18-21 | Automatic | 4 × 12 = 48 |
| Post-Completion | 22-30 | Manual | 9 |

**Total Operations**: ~2,265 (counting all agent instances)
**Human Touch Points**: 13 manual steps
**Parallelization**: 12 masters × 20 sub-agents = 240 concurrent workers

---

## Key Loops

### Loop 1: Master Spawns Sub-Agents
- **Master**: Iterates through batches (1-20)
- **Each iteration**: Spawns 1 sub-agent with ~10 LEGOs
- **Total**: 20 sub-agents per master

### Loop 2: Sub-Agent Processes LEGOs
- **Sub-agent**: Iterates through LEGO list (1-10)
- **Each iteration**:
  1. Generate 10 phrases
  2. Grammar self-check
  3. Save basket
- **Total**: 10 baskets per sub-agent = 100 phrases

---

## Data Flow

```
lego_pairs.json
    ↓
phase5_missing_baskets_new_only.json
    ↓
phase5_patch_manifest.json
    ↓
12 master prompts
    ↓
phase5_scaffolds/ (×1,497 scaffolds)
    ↓
phase5_outputs/ (×340 seed files)
    ↓
Validation (GATE, LUT, Grammar)
    ↓
lego_baskets.json (merged)
    ↓
S3 (production)
```

---

## Error Handling

**Sub-agent failure**: Master respawns for that batch only
**GATE violation**: Human deletes bad phrases using deletion tool
**Merge conflict**: Sub-agents commit locally, master pushes after all complete
**Grammar issue**: Caught in self-check (Step 12) or post-validation (Step 25)

---

**Last updated**: 2025-11-17
