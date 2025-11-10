# Phase 1 Master Prompt: Pedagogical Translation

**Course**: spa_for_eng_s0001-0003
**Target Language**: spa (Spanish)
**Known Language**: eng (English)
**Total Seeds**: 3 (S0001-S0003)
**Parallel Agents**: 1
**Seeds per agent**: ~70

---

## Your Mission

Translate all 3 canonical seeds into Spanish and English using 1 parallel agents.

**Phase Intelligence**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/1

**Canonical Seeds**: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?limit=3

---

## Execute: Spawn 1 Parallel Agents

Use the Task tool to spawn all 1 agents **in a single message** for parallel execution:


**Task 1**: Translate seeds S0001-S0003 (3 seeds)

```markdown
You are Translation Agent 1.

## Your Task
Translate seeds 1 through 3 (3 seeds total).

## Instructions
1. Fetch Phase 1 intelligence: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase-intelligence/1
2. Fetch canonical seeds: GET https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?limit=3
3. Filter to seeds 1-3
4. For each canonical seed:
   - Replace {target} placeholder with "Spanish"
   - Translate to Spanish (target language)
   - Translate to English (known language - usually English)
   - Follow Phase 1 intelligence rules (cognate preference, zero variation, etc.)

## CRITICAL: {target} Placeholder
- Canonical: "I want to speak {target}"
- Replace with: "I want to speak Spanish"

## Output
Write to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0003/translations/agent_01_translations.json`

Format:
```json
{
  "agent_id": 1,
  "seed_range": {
    "start": 1,
    "end": 3
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

Merge all agent outputs into final seed_pairs.json:

```bash
node scripts/merge_phase1_translations.cjs /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0003
```

Expected output: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0003/seed_pairs.json` with all 3 translations.

---

## Git Workflow

Push completed file to main branch:

```bash
git add /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0003/seed_pairs.json
git commit -m "Phase 1: 3 translations for spa_for_eng_s0001-0003"
git push origin HEAD:main
```

---

**Target completion time**: ~10-15 minutes with 1 parallel agents
