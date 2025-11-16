# Phase 1 Master Prompt: Pedagogical Translation

**Course**: nor_for_eng_s0583-0592
**Target Language**: nor (Norwegian)
**Known Language**: eng (English)
**Total Seeds**: 10 (S0583-S0592)
**Parallel Agents**: 1
**Seeds per agent**: ~70

---

## Your Mission

Translate all 10 canonical seeds into Norwegian and English using 1 parallel agents.

**Phase Intelligence**: https://ssi-dashboard-v7.vercel.app/intelligence (Phase 1 - v2.6)

**Canonical Seeds**: https://ssi-dashboard-v7.vercel.app/api/seeds?limit=592

---

## Execute: Spawn 1 Parallel Agents

Use the Task tool to spawn all 1 agents **in a single message** for parallel execution:


**Task 1**: Translate seeds S0583-S0592 (10 seeds)

```markdown
You are Translation Agent 1.

## Your Task
Translate seeds 583 through 592 (10 seeds total).

## Instructions
1. Fetch Phase 1 intelligence: https://ssi-dashboard-v7.vercel.app/intelligence (Phase 1 - v2.6)
2. Fetch canonical seeds: https://ssi-dashboard-v7.vercel.app/api/seeds?limit=592
3. Filter to seeds 583-592
4. For each canonical seed:
   - Replace {target} placeholder with "Norwegian"
   - Translate to Norwegian (target language)
   - Translate to English (known language - usually English)
   - Follow Phase 1 intelligence rules (cognate preference, zero variation, etc.)

## CRITICAL: {target} Placeholder
- Canonical: "I want to speak {target}"
- Replace with: "I want to speak Norwegian"

## Output
Write to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/nor_for_eng_s0583-0592/translations/agent_01_translations.json`

Format:
```json
{
  "agent_id": 1,
  "seed_range": {
    "start": 583,
    "end": 592
  },
  "translations": {
    "S0583": ["nor translation", "eng translation"],
    "S0584": ["nor translation", "eng translation"]
  }
}
```

IMPORTANT: Use compact JSON formatting (no unnecessary whitespace).
```


---

## After All 1 Agents Complete

1. Merge all agent outputs into final seed_pairs.json:

```bash
node scripts/merge_phase1_translations.cjs /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/nor_for_eng_s0583-0592
```

Expected output: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/nor_for_eng_s0583-0592/seed_pairs.json` with all 10 translations.

2. **PUSH TO GITHUB IMMEDIATELY** (critical for automation):

```bash
git add .
git commit -m "Phase 1: Translations complete for nor_for_eng_s0583-0592

- Translated 10 seeds
- 1 parallel agents
- Ready for Phase 3"

git push origin HEAD:claude/phase1-nor_for_eng_s0583-0592-$(date +%s)
```

3. Report completion with the branch name

The automation server will automatically:
- Detect your pushed branch
- Pull and merge your changes
- Continue to Phase 3

**DO NOT wait for user confirmation - push immediately when merge completes!**

---

**Target completion time**: ~10-15 minutes with 1 parallel agents
