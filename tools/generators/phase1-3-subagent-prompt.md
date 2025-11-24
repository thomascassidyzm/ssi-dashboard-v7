# Phase 1+3 Sub-Agent Prompt (3-Seed Micro-Batch)

> Compact prompt for sub-agents processing exactly 3 seeds each.
> Used in swarm parallelization: many agents, few seeds per agent.

---

## Your Task

Process **3 seeds** for **{COURSE_CODE}**:
- **Known Language**: {KNOWN_LANG}
- **Target Language**: {TARGET_LANG}
- **Your Seeds**: {SEED_START} to {SEED_END}

For each seed:
1. Generate natural translation
2. Extract LEGOs following v3.0 principles
3. POST results to API

---

## Core Rules (Memorize These)

### Zero Ambiguity (LUT Test)
When learner hears KNOWN chunk, ZERO ambiguity about TARGET to produce.
If ambiguous, chunk UP with more context.

### A-type Classification
If EITHER known OR target is a **single word** = A-type (can't split a single word).
```
"I want to" → "querer"     = A-type (querer is 1 word)
"after" → "después de que" = A-type (after is 1 word)
```

### M-type Classification
2+ words on BOTH sides AND teaches something unexpected:
- Word order difference
- Linking word appears (a, de, que)
- Structural divergence

### NOT M-type
Trivial A+A concatenation that teaches nothing new:
```
"quiero hablar" = NOT M-type (just predictable concatenation)
```

### Meaningful Standalone
Articles ("the", "a") and particles alone fail this test - only appear as M-type components.

---

## Input: Canonical Seeds

Fetch your 3 seeds from:
```
https://ssi-dashboard-v7.vercel.app/api/seeds?start={SEED_NUM_START}&end={SEED_NUM_END}
```

Or read locally:
```
public/vfs/canonical/canonical_seeds.json
```

Replace `{target}` placeholder with "{TARGET_LANG_NAME}".

---

## Output Format

For EACH of your 3 seeds, produce:

```json
{
  "seed_id": "S00XX",
  "seed_pair": {
    "known": "English sentence here",
    "target": "Target language sentence here"
  },
  "legos": [
    {
      "id": "S00XXL01",
      "type": "A",
      "new": true,
      "lego": {"known": "chunk", "target": "chunk"}
    },
    {
      "id": "S00XXL02",
      "type": "M",
      "new": true,
      "lego": {"known": "multi word", "target": "multi word"},
      "components": [
        {"known": "multi", "target": "multi"},
        {"known": "word", "target": "word"}
      ],
      "teaches": "what this M-type teaches"
    }
  ]
}
```

---

## POST Your Results

When all 3 seeds complete, POST to:

```bash
curl -X POST {API_URL}/upload-batch \
  -H "Content-Type: application/json" \
  -d '{
    "course": "{COURSE_CODE}",
    "browserId": {BROWSER_ID},
    "agentId": "{AGENT_ID}",
    "seedRange": "{SEED_START}-{SEED_END}",
    "seeds": [
      // your 3 seed objects here
    ]
  }'
```

**API URL**: `http://localhost:3457` (or ngrok URL if remote)

---

## Quick Reference

| Question | Answer | Result |
|----------|--------|--------|
| Single word either side? | Yes | A-type |
| 2+ words both sides? | Yes | Check if teaches something |
| Teaches something new? | No | NOT M-type |
| Teaches something new? | Yes | M-type with components |
| Articles/particles alone? | - | Component only, not LEGO |

---

## Execute Now

1. Fetch your 3 seeds
2. For each seed: translate + extract LEGOs
3. POST all 3 to API
4. Report completion

**Target time**: ~2-3 minutes for 3 seeds
