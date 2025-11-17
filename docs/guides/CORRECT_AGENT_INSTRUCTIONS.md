# Correct Agent Instructions for Phase 5 Basket Generation

## The Problem

Agents are looking for scaffolds with wrong naming:
- ❌ Looking for: `public/vfs/courses/cmn_for_eng/phase5_scaffolds/seed_S0115_scaffold.json`
- ✅ Actually exists: `public/vfs/courses/cmn_for_eng/phase5_scaffolds/seed_s0115.json`

**Differences:**
1. Lowercase `s` not uppercase `S`
2. No `_scaffold` suffix
3. Just `seed_s0115.json`

---

## Corrected Sub-Agent Instruction

When spawning agents, use this exact instruction:

```
Generate Phase 5 LEGO basket data for seed {SEED_ID} in the cmn_for_eng course.

IMPORTANT FILE PATHS:
- Input scaffold: public/vfs/courses/cmn_for_eng/phase5_scaffolds/seed_s{SEED_NUM}.json
  (Note: lowercase 's', no 'S' prefix, no '_scaffold' suffix)
  Example: For S0115, use seed_s0115.json

- Output basket: public/vfs/courses/cmn_for_eng/phase5_outputs/seed_{SEED_ID}_baskets.json
  (Use the exact SEED_ID provided, e.g., S0115)

STEPS:
1. Read the scaffold file: public/vfs/courses/cmn_for_eng/phase5_scaffolds/seed_s{SEED_NUM}.json
2. Extract the LEGOs and their metadata from the scaffold
3. Generate practice phrases following the Phase 5 basket format
4. Save to: public/vfs/courses/cmn_for_eng/phase5_outputs/seed_{SEED_ID}_baskets.json

Example for S0115:
- Read from: public/vfs/courses/cmn_for_eng/phase5_scaffolds/seed_s0115.json
- Write to: public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S0115_baskets.json

DO NOT perform any git operations - the orchestrator will handle that.
```

---

## Scaffold File Format

The scaffolds are located at:
```
public/vfs/courses/cmn_for_eng/phase5_scaffolds/seed_s{NUMBER}.json
```

Where `{NUMBER}` is the 4-digit seed number (e.g., 0001, 0115, 0668)

Examples:
- seed_s0001.json
- seed_s0115.json
- seed_s0668.json

**Naming pattern**:
- Always lowercase `s`
- 4-digit zero-padded number
- `.json` extension
- No `_scaffold` suffix

---

## Output File Format

The output baskets should be:
```
public/vfs/courses/cmn_for_eng/phase5_outputs/seed_{SEED_ID}_baskets.json
```

Where `{SEED_ID}` is the full seed ID (e.g., S0001, S0115)

Examples:
- seed_S0001_baskets.json (capital S)
- seed_S0115_baskets.json (capital S)
- seed_S0668_baskets.json (capital S)

**Naming pattern**:
- Capital `S` prefix
- 4-digit seed number
- `_baskets.json` suffix

---

## Quick Reference

| File Type | Path Template | Example |
|-----------|--------------|---------|
| Input Scaffold | `phase5_scaffolds/seed_s{NUM}.json` | `seed_s0115.json` |
| Output Basket | `phase5_outputs/seed_S{NUM}_baskets.json` | `seed_S0115_baskets.json` |

Notice: Scaffold uses lowercase `s`, output uses capital `S`

---

## Corrected Orchestrator Prompt Template

```markdown
# Phase 5 Basket Generation - Orchestrator {NUM}

**Seeds**: {START}-{END}
**Session ID**: {SESSION_ID}

## Sub-Agent Instructions

When spawning each agent, provide this instruction:

```
Generate Phase 5 LEGO basket for seed {SEED_ID}.

Files:
- Read scaffold: public/vfs/courses/cmn_for_eng/phase5_scaffolds/seed_s{LOWERCASE_NUM}.json
- Write basket: public/vfs/courses/cmn_for_eng/phase5_outputs/seed_{SEED_ID}_baskets.json

Example for S0115:
- Read: public/vfs/courses/cmn_for_eng/phase5_scaffolds/seed_s0115.json (lowercase!)
- Write: public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S0115_baskets.json (capital!)

Do NOT do git operations.
```

## Mini-Batch Example

For seeds S0115-S0119:

Agent 1: Read seed_s0115.json → Write seed_S0115_baskets.json
Agent 2: Read seed_s0116.json → Write seed_S0116_baskets.json
Agent 3: Read seed_s0117.json → Write seed_S0117_baskets.json
Agent 4: Read seed_s0118.json → Write seed_S0118_baskets.json
Agent 5: Read seed_s0119.json → Write seed_S0119_baskets.json

After all complete:
```bash
git add public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S011[5-9]_baskets.json
git commit -m "Batch 1: S0115-S0119"
git push origin branch-name-{SESSION_ID}
```
```

---

## Why This Matters

If agents look for the wrong file path:
- ❌ They can't find the scaffold
- ❌ They try to generate from lego_pairs.json instead (slower, less reliable)
- ❌ Or they fail completely

With correct paths:
- ✅ Agents read pre-made scaffolds (fast)
- ✅ Consistent basket format
- ✅ Higher success rate
