# 🔄 Handoff to Web-Based Claude Code Orchestrator

**Date**: 2025-11-12
**Status**: Pivot to web-based orchestration for remaining extractions

---

## ✅ What We Have (KEEP THIS - IT'S GOOD!)

### Successfully Extracted: 199 seeds (30%)

| Range | Seeds | File Location | Quality |
|-------|-------|---------------|---------|
| S0269-S0335 | 67 | `/tmp/agent_5_s0269_s0335_complete.json` | ✅ World-class |
| S0470-S0536 | 67 | `/tmp/agent8_extraction_S0470_S0536.json` | ✅ World-class |
| S0604-S0668 | 65 | `/tmp/agent_10_final_extraction_s0604_s0668.json` | ✅ World-class |

**Quality verified:**
- ✅ FD compliant
- ✅ A-before-M ordering
- ✅ Complete tiling (both languages)
- ✅ Components arrays for all M-types
- ✅ All marked `new: true`

---

## 🎯 What We Need

### Remaining Extractions: 469 seeds (70%)

| Range | Seeds | Priority | Notes |
|-------|-------|----------|-------|
| S0001-S0067 | 67 | HIGH | First 67 seeds - foundation |
| S0068-S0134 | 67 | HIGH | Failed in CLI attempt |
| S0135-S0201 | 67 | MEDIUM | |
| S0202-S0268 | 67 | MEDIUM | |
| S0336-S0402 | 67 | MEDIUM | |
| S0403-S0469 | 67 | MEDIUM | |
| S0537-S0603 | 67 | MEDIUM | |

---

## 📋 Instructions for Web-Based Orchestrator

### Step 1: Setup

```javascript
// Input file
const seedPairsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/seed_pairs.json';

// Phase intelligence
const phaseIntelligence = [
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/phase_intelligence/phase_3_lego_pairs.md',
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/phase_intelligence/phase_3_orchestrator.md'
];

// Output directory
const outputDir = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/extractions/';
```

### Step 2: Spawn 7 Agents (One per Missing Range)

Each agent should:
1. Read `seed_pairs.json`
2. Read phase intelligence files
3. Extract their assigned range following Phase 3 v6.3 methodology
4. **Write output directly to file**: `${outputDir}/agent_${agentNum}_S${start}_S${end}.json`

**Agent assignments:**
- Agent 1: S0001-S0067 → `extractions/agent_1_S0001_S0067.json`
- Agent 2: S0068-S0134 → `extractions/agent_2_S0068_S0134.json`
- Agent 3: S0135-S0201 → `extractions/agent_3_S0135_S0201.json`
- Agent 4: S0202-S0268 → `extractions/agent_4_S0202_S0268.json`
- Agent 6: S0336-S0402 → `extractions/agent_6_S0336_S0402.json`
- Agent 7: S0403-S0469 → `extractions/agent_7_S0403_S0469.json`
- Agent 9: S0537-S0603 → `extractions/agent_9_S0537_S0603.json`

### Step 3: Agent Prompt Template

```
You are extracting LEGO vocabulary units following Phase 3 v6.3 methodology.

YOUR MISSION:
Extract seeds S${START} through S${END} from seed_pairs.json

CRITICAL PROCESS:
1. Forward & Backward sweeps - extract smallest FD-compliant chunks
2. A-before-M ordering - ALL atomic LEGOs before molecular LEGOs
3. Verify complete tiling in BOTH English and Spanish
4. Add components arrays to ALL M-types
5. Mark all as new: true

EXAMPLES: [include the 10 corrected examples from initial attempt]

OUTPUT:
Write directly to file: ${outputPath}

Format:
{
  "agent_id": "Agent_${NUM}",
  "seed_range": "S${START}-S${END}",
  "seeds": [...]
}

Work carefully and deliberately. You are building world-class language learning materials.
```

### Step 4: Compile All Outputs

Once all 7 agents complete, run compilation:

```javascript
// Merge all agent outputs with existing good data
const allSeeds = [
  ...loadJSON('extractions/agent_1_S0001_S0067.json').seeds,
  ...loadJSON('extractions/agent_2_S0068_S0134.json').seeds,
  ...loadJSON('extractions/agent_3_S0135_S0201.json').seeds,
  ...loadJSON('extractions/agent_4_S0202_S0268.json').seeds,
  ...loadJSON('/tmp/agent_5_s0269_s0335_complete.json').seeds, // EXISTING ✅
  ...loadJSON('extractions/agent_6_S0336_S0402.json').seeds,
  ...loadJSON('extractions/agent_7_S0403_S0469.json').seeds,
  ...loadJSON('/tmp/agent8_extraction_S0470_S0536.json').seeds, // EXISTING ✅
  ...loadJSON('extractions/agent_9_S0537_S0603.json').seeds,
  ...loadJSON('/tmp/agent_10_final_extraction_s0604_s0668.json').seeds // EXISTING ✅
];

// Write final output
const finalOutput = {
  version: "6.3",
  course: "spa_for_eng",
  generated: new Date().toISOString(),
  methodology: "Phase 3 v6.3 - Pragmatic FD Edition",
  total_seeds: 668,
  seeds: allSeeds
};

fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/lego_pairs.json',
  JSON.stringify(finalOutput, null, 2)
);
```

---

## 🎓 Phase Intelligence Reference

The 10 example seeds (corrected S0010):

```json
{
  "seed_id": "S0010",
  "seed_pair": ["I'm not sure if I can remember the whole sentence.", "No estoy seguro si puedo recordar toda la oración."],
  "legos": [
    {"id": "S0010L01", "type": "A", "target": "si", "known": "if", "new": true},
    {"id": "S0010L02", "type": "M", "target": "no estoy seguro", "known": "I'm not sure", "new": true, "components": [["no", "not"], ["estoy", "I am"], ["seguro", "sure"]]},
    {"id": "S0010L03", "type": "M", "target": "puedo recordar", "known": "I can remember", "new": true, "components": [["puedo", "I can"], ["recordar", "to remember"]]},
    {"id": "S0010L04", "type": "M", "target": "toda la oración", "known": "the whole sentence", "new": true, "components": [["toda", "whole"], ["la", "the"], ["oración", "sentence"]]}
  ]
}
```

**Key lesson from S0010**: Must verify tiling in BOTH languages! "I can remember" is a unit in English (modal + bare infinitive).

---

## 🚀 Why Web-Based Orchestrator is Better

1. **File-based output** - No token limits on responses
2. **Parallel processing** - True concurrent agent execution
3. **Error recovery** - Can restart individual agents without losing others
4. **Cleaner logs** - Each agent's work is isolated
5. **Better monitoring** - Can check file sizes as agents complete

---

## 📂 Directory Structure

```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/
├── public/vfs/courses/spa_for_eng/
│   ├── seed_pairs.json (INPUT)
│   └── lego_pairs.json (FINAL OUTPUT)
├── docs/phase_intelligence/
│   ├── phase_3_lego_pairs.md
│   └── phase_3_orchestrator.md
├── extractions/ (CREATE THIS)
│   ├── agent_1_S0001_S0067.json
│   ├── agent_2_S0068_S0134.json
│   ├── agent_3_S0135_S0201.json
│   ├── agent_4_S0202_S0268.json
│   ├── agent_6_S0336_S0402.json
│   ├── agent_7_S0403_S0469.json
│   └── agent_9_S0537_S0603.json
└── /tmp/ (EXISTING GOOD DATA)
    ├── agent_5_s0269_s0335_complete.json ✅
    ├── agent8_extraction_S0470_S0536.json ✅
    └── agent_10_final_extraction_s0604_s0668.json ✅
```

---

## ✅ Success Criteria

When web orchestrator completes:
- [ ] 7 new extraction files created in `/extractions/`
- [ ] All files are valid JSON
- [ ] Total of 668 seeds compiled into `lego_pairs.json`
- [ ] All seeds follow Phase 3 v6.3 methodology
- [ ] Random sample verification passes

---

**Ready for web-based orchestration!** 🚀

The existing 199 seeds are solid - just need to extract the remaining 469 with a more reliable approach.
