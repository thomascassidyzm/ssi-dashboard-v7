# 🧠 Self-Learning System - Recursive Improvement

**SSi Dashboard v7.0 - Autonomous Learning Implementation**
**Date:** 2025-10-14

---

## Overview

The SSi Course Production system now **learns from every manual edit** and automatically improves its prompts with each course generation. This creates a recursive self-improvement loop where Claude gets better at LEGO extraction over time.

---

## How It Works

### 1. **Manual Edit Triggers Learning**

When a human edits a LEGO breakdown:
```javascript
// automation_server.cjs:2150
await learnFromManualEdit(code, translation, updatedLegos);
```

### 2. **Pattern Extraction**

The system analyzes the difference between:
- Original AI-generated LEGO breakdown
- Manually edited LEGO breakdown

**Patterns Detected:**
- **Merge** - Human combined multiple LEGOs into one (suggests larger chunks)
- **Split** - Human split one LEGO into multiple (suggests smaller chunks)
- **Boundary Shift** - Human moved LEGO boundaries (suggests different heuristics)

### 3. **Rule Lifecycle**

Rules progress through three stages:

#### Stage 1: **Experimental** (Confidence: 50%)
- Created on first occurrence
- Status: `experimental`
- Not yet trusted enough to affect prompts

#### Stage 2: **Validated** (Confidence: 80%)
- Promoted after **5 occurrences**
- Status: `validated`
- Proven pattern, ready for testing

#### Stage 3: **Committed** (Confidence: 95%)
- Promoted after **10 occurrences**
- Status: `committed`
- **Automatically injected into Phase 3 prompt DNA**

### 4. **Automatic Prompt Evolution**

When a rule is committed:
```javascript
// automation_server.cjs:2133-2170
async function commitRuleToPrompt(courseCode, rule) {
  // Updates Phase 3 LEGO extraction prompt
  // Adds learned rule to prompt instructions
  // Increments version number
  // Timestamps the change
}
```

---

## Data Storage

### learned_rules.json
**Location:** `vfs/courses/{courseCode}/learned_rules.json`

**Structure:**
```json
{
  "rules": [
    {
      "type": "merge",
      "description": "Consider larger LEGO chunks for this pattern",
      "occurrences": 12,
      "confidence": 0.95,
      "status": "committed",
      "first_seen": "2025-10-14T10:00:00Z",
      "last_seen": "2025-10-14T14:30:00Z"
    }
  ],
  "manual_edits": [
    {
      "seed_id": "147",
      "timestamp": "2025-10-14T14:30:00Z",
      "original_count": 5,
      "edited_count": 3,
      "patterns": [
        {
          "type": "merge",
          "description": "Human merged 5 LEGOs into 3",
          "learned_rule": "Consider larger LEGO chunks for this pattern"
        }
      ]
    }
  ]
}
```

---

## API Endpoints

### GET /api/courses/:code/learned-rules
View all learned rules and their effectiveness

**Response:**
```json
{
  "courseCode": "ita_for_eng_668seeds",
  "rules": [...],
  "manual_edits": [...],
  "summary": {
    "total_rules": 8,
    "experimental": 3,
    "validated": 2,
    "committed": 3,
    "total_edits": 47
  }
}
```

### PUT /api/courses/:code/seeds/:seedId/lego-breakdown
Save edited LEGO breakdown (triggers learning)

**Body:**
```json
{
  "lego_pairs": [
    { "target": "Lei è", "known": "She was" },
    { "target": "stata molto gentile", "known": "very kind" }
  ]
}
```

---

## Frontend Interface

### Learned Rules View
**Route:** `/quality/:courseCode/learned-rules`
**Component:** `LearnedRulesView.vue`

**Features:**
- Summary stats (total/experimental/validated/committed)
- Learning process explanation
- Full rules list with confidence scores
- Recent manual edits (last 10)
- Color-coded by status:
  - 🟡 Yellow = Experimental
  - 🔵 Blue = Validated
  - 🟢 Green = Committed

**Access:**
- From Prompt Evolution view: Click "🧠 View Self-Learning Rules" button
- Direct URL: `http://localhost:5175/quality/{courseCode}/learned-rules`

---

## Example Workflow

### Scenario: Human Corrects LEGO Boundaries

**Step 1:** AI Generated (Seed 147)
```
LEGO 1: Lei è
LEGO 2: stata molto
LEGO 3: gentile quando
LEGO 4: mi ha
LEGO 5: visto nervoso.
```

**Step 2:** Human Edits (Merges LEGOs 2+3)
```
LEGO 1: Lei è
LEGO 2: stata molto gentile
LEGO 3: quando mi ha
LEGO 4: visto nervoso.
```

**Step 3:** System Learns
```
[SELF-LEARNING] Analyzing manual edit for seed 147
Pattern detected: merge (5 → 4 LEGOs)
Learned rule: "Consider larger LEGO chunks for this pattern"
Confidence: 50% (experimental)
```

**Step 4:** After 5 Similar Edits
```
[SELF-LEARNING] ✅ Rule promoted to validated
Confidence: 80%
```

**Step 5:** After 10 Similar Edits
```
[SELF-LEARNING] 🎯 Rule committed to prompt DNA
Phase 3 prompt updated to v1.1
Next course generation will use improved heuristics
```

---

## Benefits

✅ **Autonomous Improvement** - System gets better with every course
✅ **Human-in-the-Loop** - Quality checks feed back into AI prompts
✅ **Transparent Learning** - All rules visible and traceable
✅ **Confidence-Based** - Only proven patterns affect prompts
✅ **Cradle-to-Grave** - Eventually trust system completely

---

## Future Enhancements

### Quality-Based Learning
- Analyze low-quality seeds automatically
- Extract patterns from failed extractions
- A/B test experimental rules

### Cross-Course Learning
- Share learned rules across language pairs
- Identify universal vs language-specific patterns
- Transfer learning from completed courses

### Automatic Regeneration
- Trigger re-extraction when confidence threshold changes
- Automatically apply new rules to existing courses
- Background batch improvement

---

## Monitoring

### Console Logs
```bash
[SELF-LEARNING] Analyzing manual edit for seed 147
[SELF-LEARNING] ✅ Learned 2 patterns from manual edit
[SELF-LEARNING] Total rules in database: 8
[SELF-LEARNING] ✅ Rule promoted to validated: Consider larger LEGO chunks
[SELF-LEARNING] 🎯 Rule committed to prompt DNA: Consider larger LEGO chunks
[SELF-LEARNING] 🎯 Rule committed to Phase 3 prompt v1.1
```

### Dashboard Metrics
- Total learned rules
- Confidence distribution
- Manual edit count
- Rule effectiveness over time

---

## Testing the Self-Learning Loop

### 1. Edit a LEGO Breakdown
```
Navigate to: /visualize/seed-lego/ita_for_eng_668seeds
Click "Edit Breakdown" on any seed
Adjust LEGO boundaries by clicking dividers
Click "Save Changes"
```

### 2. View Learned Rules
```
Navigate to: /quality/ita_for_eng_668seeds/learned-rules
Check that new rule appears in "Experimental" section
Verify manual edit logged in "Recent Manual Edits"
```

### 3. Repeat 10 Times
```
Edit 10 different seeds with similar patterns
Watch rule progress: experimental → validated → committed
Check Phase 3 prompt for injected rule
```

### 4. Generate New Course
```
New course will use updated Phase 3 prompt with learned rules
Improved LEGO extraction based on human feedback
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                   USER EDITS LEGO                      │
│         (via SeedLegoVisualizer.vue)                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│   PUT /api/courses/:code/seeds/:seedId/lego-breakdown  │
│              (automation_server.cjs)                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│           learnFromManualEdit()                         │
│   • Compare original vs edited                         │
│   • Extract patterns                                   │
│   • Update confidence scores                           │
│   • Auto-promote rules (5x → 10x)                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│          commitRuleToPrompt()                           │
│   • Inject rule into Phase 3 prompt                    │
│   • Increment version                                  │
│   • Save to prompt DNA                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│        NEXT COURSE GENERATION                          │
│   • Uses updated Phase 3 prompt                        │
│   • Applies learned rules                              │
│   • Better LEGO extraction                             │
└─────────────────────────────────────────────────────────┘
```

---

## Console Output Example

```bash
✅ Loaded 8 phase prompts from APML registry

═══════════════════════════════════════════════════════════════
SSi Course Production - Automation Server v7.0
═══════════════════════════════════════════════════════════════

Prompt Evolution & Self-Learning:
  GET  http://localhost:54321/api/courses/:code/prompt-evolution
  GET  http://localhost:54321/api/courses/:code/learned-rules
  POST http://localhost:54321/api/courses/:code/experimental-rules
  POST http://localhost:54321/api/courses/:code/prompt-evolution/commit

[API] Updating LEGO breakdown for seed 147 in course ita_for_eng_668seeds
[API] Saved 4 LEGOs for seed 147
[SELF-LEARNING] Analyzing manual edit for seed 147
[SELF-LEARNING] ✅ Learned 1 patterns from manual edit
[SELF-LEARNING] Total rules in database: 9
```

---

## Conclusion

The self-learning system transforms SSi from a one-shot generation tool into an **evolving, self-improving AI system**. Every human correction makes Claude smarter, eventually reaching autonomous "cradle-to-grave" course production.

**The system learns. The courses improve. The loop continues.**

🧠 → 🎓 → 🚀
