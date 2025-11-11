# Phase 1 Master Prompt: Pedagogical Translation

**Course**: spa_for_eng_s0001-0020
**Target Language**: spa (Spanish)
**Known Language**: eng (English)
**Total Seeds**: 20 (S0001-S0020)
**Parallel Agents**: 1
**Seeds per agent**: ~70

---

## Your Mission

Translate all 20 canonical seeds into Spanish and English using 1 parallel agents.

**Phase Intelligence**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/1

**Canonical Seeds**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?limit=20

---

## Execute: Spawn 1 Parallel Agents

Use the Task tool to spawn all 1 agents **in a single message** for parallel execution:


**Task 1**: Translate seeds S0001-S0020 (20 seeds)

```markdown
You are Translation Agent 1.

## Your Task
Translate seeds 1 through 20 (20 seeds total).

## Instructions
1. Fetch Phase 1 intelligence: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/1
2. Fetch canonical seeds: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?limit=20
3. Filter to seeds 1-20
4. For each canonical seed:
   - Replace {target} placeholder with "Spanish"
   - Translate to Spanish (target language)
   - Translate to English (known language - usually English)
   - Follow Phase 1 intelligence rules (cognate preference, zero variation, etc.)

## CRITICAL: {target} Placeholder
- Canonical: "I want to speak {target}"
- Replace with: "I want to speak Spanish"

## Output
Write to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0020/translations/agent_01_translations.json`

Format:
```json
{
  "agent_id": 1,
  "seed_range": {
    "start": 1,
    "end": 20
  },
  "translations": {
    "S0001": ["spa translation", "eng translation"],
    "S0002": ["spa translation", "eng translation"]
  }
}
```

IMPORTANT: Use compact JSON formatting (no unnecessary whitespace).
```


---

## After All 1 Agents Complete

1. Merge all agent outputs into final seed_pairs.json:

```bash
node scripts/merge_phase1_translations.cjs /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0020
```

Expected output: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0020/seed_pairs.json` with all 20 translations.

2. **PUSH TO GITHUB IMMEDIATELY** (critical for automation):

```bash
git add .
git commit -m "Phase 1: Translations complete for spa_for_eng_s0001-0020

- Translated 20 seeds
- 1 parallel agents
- Ready for Phase 3"

git push origin HEAD:claude/phase1-spa_for_eng_s0001-0020-$(date +%s)
```

3. Report completion with the branch name

The automation server will automatically:
- Detect your pushed branch
- Pull and merge your changes
- Continue to Phase 3

**DO NOT wait for user confirmation - push immediately when merge completes!**

---

**Target completion time**: ~10-15 minutes with 1 parallel agents
