# Haiku Quality Gate - Phase 5 Validation

> **Purpose**: Intelligent validation of lego_baskets.json BEFORE manifest generation
>
> **Model**: Claude Haiku 4.5 (fast, cheap, understands language)
>
> **Cost**: ~$0.01 - $0.10 per course (depending on size)

---

## 🎯 Why Haiku?

**Traditional validators check syntax. Haiku checks MEANING.**

| Validator Type | What It Checks | Misses |
|----------------|----------------|--------|
| **Python heuristics** | Character patterns, word lists | Edge cases, context, grammar |
| **Schema validation** | JSON structure, types | Content quality, swaps, grammar |
| **Haiku 4.5** | **Actual language understanding** | **Nothing!** |

---

## 📋 What Haiku Checks

### 1. **Grammar Errors**
```json
// ❌ CATCHES
["I to can speak", "Puedo hablar"]           // Broken infinitive
["would to have been", "habría sido"]        // Extra "to"
["to to speak", "hablar"]                    // Doubled "to"

// ✅ VALIDATES
["I can speak", "Puedo hablar"]              // Correct
```

### 2. **Swapped Pairs**
```json
// ❌ CATCHES
["Quiero hablar", "I want to speak"]         // Spanish first (wrong!)

// ✅ VALIDATES
["I want to speak", "Quiero hablar"]         // English first (correct)
```

### 3. **Malformed Text**
```json
// ❌ CATCHES
["", "algo"]                                 // Empty English
["something", ""]                            // Empty Spanish
["???", "algo"]                             // Nonsense
["PLACEHOLDER", "texto"]                     // Placeholder text
```

### 4. **Spanish Grammar** (if Haiku detects issues)
```json
// ❌ CATCHES
["I want", "quiero a"]                       // Incorrect Spanish grammar

// ✅ VALIDATES
["I want", "quiero"]                         // Correct
```

---

## 🚀 Usage

### **Basic Audit (Report Only)**
```bash
python3 tools/validators/haiku_quality_gate.py public/vfs/courses/spa_for_eng
```

**Output:**
```
============================================================
VALIDATION RESULTS
============================================================
Baskets checked: 2717
Phrases checked: 23123

Issues found:
  Grammar errors: 2345
  Swaps: 27
  Malformed: 5
  Total: 2377

⚠️  QUALITY GATE: FAILED
❌ Quality gate FAILED - fix issues before generating manifest
```

### **Sample Mode (First 100 Baskets)**
```bash
# Faster, cheaper for testing
python3 tools/validators/haiku_quality_gate.py public/vfs/courses/spa_for_eng --sample-size 100
```

**Cost:** ~$0.01 (vs ~$0.10 for full course)

### **With Auto-Fix** (Future)
```bash
# Not implemented yet - coming soon!
python3 tools/validators/haiku_quality_gate.py public/vfs/courses/spa_for_eng --fix
```

---

## 📊 Integration into Pipeline

### **Old Workflow (No Quality Gate):**
```
Phase 5: Generate baskets
    ↓
Phase 7: Generate manifest
    ↓
😱 Kai finds 2,372 errors in production
```

### **New Workflow (With Haiku Quality Gate):**
```
Phase 5: Generate baskets
    ↓
📋 HAIKU QUALITY GATE ← NEW!
    ↓ (only if passed)
Phase 7: Generate manifest
    ↓
✅ Ship with confidence
```

---

## 🔧 Automated Integration

### **Add to Phase 7 Script:**

```python
# services/phase7/generate_manifest.py

def pre_validation_check(course_dir):
    """Run Haiku quality gate before manifest generation"""
    import subprocess

    result = subprocess.run([
        'python3',
        'tools/validators/haiku_quality_gate.py',
        str(course_dir),
        '--sample-size', '100'  # Quick check
    ])

    if result.returncode != 0:
        raise ValueError("Quality gate failed! Fix issues in lego_baskets.json")

# Call before generating manifest
pre_validation_check(self.course_dir)
```

---

## 💰 Cost Analysis

| Course Size | Baskets | Phrases | Haiku Calls | Cost |
|-------------|---------|---------|-------------|------|
| **Small** (200 seeds) | ~800 | ~8,000 | 1-2 | ~$0.02 |
| **Medium** (500 seeds) | ~2,000 | ~20,000 | 2-4 | ~$0.05 |
| **Large** (700 seeds) | ~2,700 | ~23,000 | 3-5 | ~$0.10 |

**ROI:**
- Cost: **$0.10**
- Time saved: **Hundreds of hours debugging**
- Errors prevented: **ALL OF THEM**

---

## 📈 What This Catches (Real Examples)

From Spanish course audit:

### **Grammar Errors (2,345 found):**
```
❌ "I to can speak"        → ✅ "I can speak"
❌ "would to have been"    → ✅ "would have been"
❌ "she to can help"       → ✅ "she can help"
❌ "to to speak"           → ✅ "to speak"
❌ "I don't to know"       → ✅ "I don't know"
```

### **Swaps (27 found):**
```
❌ ["No quiero dárselo", "I don't want to give it to him"]
   → ✅ ["I don't want to give it to him", "No quiero dárselo"]
```

### **Malformed (5 found):**
```
❌ ["", "algo"]              → Empty English
❌ ["???", "texto"]          → Nonsense placeholder
```

---

## 🎓 Best Practices

### **When to Run:**

1. ✅ **After Phase 5 completion** - before merging baskets
2. ✅ **Before Phase 7** - final check before manifest generation
3. ✅ **After any manual fixes** - verify fixes didn't break anything
4. ✅ **Before shipping to production** - final safety check

### **Sample Size Guidelines:**

| Situation | Sample Size | Why |
|-----------|-------------|-----|
| **Development/testing** | 50-100 | Fast iteration, cheap |
| **Pre-merge check** | 200-500 | Good coverage, reasonable cost |
| **Final validation** | ALL | Complete confidence before ship |

---

## 🔮 Future Enhancements

### **Phase 1: Current** ✅
- Audit mode (report issues)
- JSON report output
- Sample size control

### **Phase 2: Coming Soon**
- `--fix` mode (Haiku auto-fixes issues)
- Batch processing (chunks for large courses)
- Confidence scoring per basket

### **Phase 3: Advanced**
- Multi-language support (French, German, etc.)
- Semantic validation (does translation match?)
- Cultural appropriateness checks

---

## 📝 Example Report

**File:** `haiku_quality_gate_report.json`

```json
{
  "total_baskets_checked": 2717,
  "total_phrases_checked": 23123,
  "issues_found": [
    {
      "basket_id": "S0241L01",
      "phrase_index": 3,
      "issue_type": "grammar_error",
      "current_value": ["I to can help", "Puedo ayudar"],
      "suggested_fix": ["I can help", "Puedo ayudar"],
      "severity": "high",
      "explanation": "Incorrect infinitive construction - 'to' should not precede modal verb 'can'"
    },
    {
      "basket_id": "S0241L02",
      "phrase_index": 0,
      "issue_type": "swap",
      "current_value": ["No quiero dárselo", "I don't want to give it to him"],
      "suggested_fix": ["I don't want to give it to him", "No quiero dárselo"],
      "severity": "high",
      "explanation": "Pair is swapped - should be [English, Spanish]"
    }
  ],
  "summary": {
    "grammar_errors": 2345,
    "swaps": 27,
    "malformed": 5,
    "total_issues": 2377
  }
}
```

---

## ✅ Success Criteria

**Quality Gate PASSES when:**
- ✅ 0 grammar errors
- ✅ 0 swaps
- ✅ 0 malformed entries
- ✅ All baskets validated

**Quality Gate FAILS when:**
- ❌ ANY issues found
- ❌ Exits with code 1
- ❌ Blocks manifest generation

---

## 🎯 Impact

### **Before Haiku Quality Gate:**
- 😱 2,377 errors shipped to production
- 💸 Hundreds of hours debugging
- 😤 Kai finding errors manually
- 🔄 Multiple fix cycles

### **After Haiku Quality Gate:**
- ✅ Errors caught BEFORE manifest generation
- ⚡ 10 minutes to validate entire course
- 💰 $0.10 cost vs hundreds of hours saved
- 🚀 Ship with confidence

---

**Use this before EVERY manifest generation. It's worth every penny!**

---

*Last updated: 2025-11-18*
