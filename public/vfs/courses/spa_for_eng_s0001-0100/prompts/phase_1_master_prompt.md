# Phase 1 Master Prompt: Pedagogical Translation

**Course**: spa_for_eng_s0001-0100
**Target Language**: spa (Spanish)
**Known Language**: eng (English)
**Total Seeds**: 100 (S0001-S0100)
**Parallel Agents**: 2
**Seeds per agent**: ~70

---

## Your Mission

Translate all 100 canonical seeds into Spanish and English using 2 parallel agents.

**Phase Intelligence**: https://ssi-dashboard-v7.vercel.app/intelligence (Phase 1 - v2.6)

**Canonical Seeds**: https://ssi-dashboard-v7.vercel.app/api/seeds?limit=100

---

## Execute: Spawn 2 Parallel Agents

Use the Task tool to spawn all 2 agents **in a single message** for parallel execution:


**Task 1**: Translate seeds S0001-S0070 (70 seeds)

```markdown
You are Translation Agent 1.

## Your Task
Translate seeds 1 through 70 (70 seeds total).

## Instructions
1. Fetch Phase 1 intelligence: https://ssi-dashboard-v7.vercel.app/intelligence (Phase 1 - v2.6)
2. Fetch canonical seeds: https://ssi-dashboard-v7.vercel.app/api/seeds?limit=100
3. Filter to seeds 1-70
4. For each canonical seed:
   - Replace {target} placeholder with "Spanish"
   - Translate to Spanish (target language)
   - Translate to English (known language - usually English)
   - Follow Phase 1 intelligence rules (cognate preference, zero variation, etc.)

## CRITICAL: {target} Placeholder
- Canonical: "I want to speak {target}"
- Replace with: "I want to speak Spanish"

## Output
Write to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0100/translations/agent_01_translations.json`

Format:
```json
{
  "agent_id": 1,
  "seed_range": {
    "start": 1,
    "end": 70
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

**Task 2**: Translate seeds S0071-S0100 (30 seeds)

```markdown
You are Translation Agent 2.

## Your Task
Translate seeds 71 through 100 (30 seeds total).

## Instructions
1. Fetch Phase 1 intelligence: https://ssi-dashboard-v7.vercel.app/intelligence (Phase 1 - v2.6)
2. Fetch canonical seeds: https://ssi-dashboard-v7.vercel.app/api/seeds?limit=100
3. Filter to seeds 71-100
4. For each canonical seed:
   - Replace {target} placeholder with "Spanish"
   - Translate to Spanish (target language)
   - Translate to English (known language - usually English)
   - Follow Phase 1 intelligence rules (cognate preference, zero variation, etc.)

## CRITICAL: {target} Placeholder
- Canonical: "I want to speak {target}"
- Replace with: "I want to speak Spanish"

## Output
Write to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0100/translations/agent_02_translations.json`

Format:
```json
{
  "agent_id": 2,
  "seed_range": {
    "start": 71,
    "end": 100
  },
  "translations": {
    "S0071": ["spa translation", "eng translation"],
    "S0072": ["spa translation", "eng translation"]
  }
}
```

IMPORTANT: Use compact JSON formatting (no unnecessary whitespace).
```


---

## After All 2 Agents Complete

1. Merge all agent outputs into final seed_pairs.json:

```bash
node scripts/merge_phase1_translations.cjs /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0100
```

Expected output: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0100/seed_pairs.json` with all 100 translations.

2. **PUSH TO GITHUB IMMEDIATELY** (critical for automation):

```bash
git add .
git commit -m "Phase 1: Translations complete for spa_for_eng_s0001-0100

- Translated 100 seeds
- 2 parallel agents
- Ready for Phase 3"

git push origin HEAD:claude/phase1-spa_for_eng_s0001-0100-$(date +%s)
```

3. Report completion with the branch name

The automation server will automatically:
- Detect your pushed branch
- Pull and merge your changes
- Continue to Phase 3

**DO NOT wait for user confirmation - push immediately when merge completes!**

---

**Target completion time**: ~10-15 minutes with 2 parallel agents
