# Key Corrections Made by Agent 4

## M-types That Should NOT Exist

### 1. S0011: "poder hablar" ❌

**Broken version had:**
```json
{
  "id": "S0011L05",
  "target": "poder hablar",
  "known": "to be able to speak",
  "type": "M"
}
```

**Why it's wrong:** Both languages tile cleanly. No FD requirement.

**Correct approach:** Use A-types only:
- `poder` → "to be able to"
- `hablar` → "to speak"

---

### 2. S0013: "muy bien" ❌

**Broken version had:**
```json
{
  "id": "S0013L04",
  "target": "muy bien",
  "known": "very well",
  "type": "M"
}
```

**Why it's wrong:** Both languages tile cleanly with same word order. Classic over-extraction.

**Correct approach:** Use A-types only:
- `muy` → "very"
- `bien` → "well"

---

## M-types With Wrong Chunking

### 3. S0011: "después de que termines" ❌

**Broken version had:**
```json
{
  "id": "S0011L06",
  "target": "después de que termines",
  "known": "after you finish",
  "type": "M"
}
```

**Why it's wrong:** Over-chunked - includes verb unnecessarily.

**Correct approach:** Split at particle boundary:
```json
{
  "id": "S0011L05",
  "target": "después de que",
  "known": "after",
  "type": "M",
  "components": [
    ["después", "after"],
    ["de", "of"],
    ["que", "that"]
  ]
}
```

Plus separate A-type:
```json
{
  "id": "S0011L03",
  "target": "termines",
  "known": "you finish",
  "type": "A"
}
```

---

### 4. S0012: "lo que va a ocurrir" ❌

**Broken version had:**
```json
{
  "id": "S0012L05",
  "target": "lo que va a ocurrir",
  "known": "what's going to happen",
  "type": "M"
}
```

**Why it's wrong:** Over-chunked - combines 3 distinct meaningful units.

**Correct approach:** Split into minimal FD-compliant chunks:
```json
{
  "id": "S0012L05",
  "target": "lo que",
  "known": "what",
  "type": "M",
  "components": [["lo", "it"], ["que", "that"]]
},
{
  "id": "S0012L06",
  "target": "va a",
  "known": "going to",
  "type": "M",
  "components": [["va", "goes"], ["a", "to"]]
},
{
  "id": "S0012L02",
  "target": "ocurrir",
  "known": "to happen",
  "type": "A"
}
```

---

### 5. S0015: "quiero que hables" ❌

**Broken version had:**
```json
{
  "id": "S0015L06",
  "target": "quiero que hables",
  "known": "I want you to speak",
  "type": "M"
}
```

**Why it's wrong:** Over-chunked - verb should be separate for reusability.

**Correct approach:** Stop at particle boundary:
```json
{
  "id": "S0015L07",
  "target": "quiero que",
  "known": "I want that",
  "type": "M",
  "components": [["quiero", "I want"], ["que", "that"]]
}
```

Plus separate A-types:
```json
{
  "id": "S0015L02",
  "target": "quiero",
  "known": "I want",
  "type": "A"
},
{
  "id": "S0015L03",
  "target": "hables",
  "known": "speak",
  "type": "A"
}
```

---

## M-types That ARE Correct

### S0014: "todo el día" ✅

**Both versions correctly have:**
```json
{
  "id": "S0014L04",
  "target": "todo el día",
  "known": "all day",
  "type": "M",
  "components": [
    ["todo", "all"],
    ["el", "the"],
    ["día", "day"]
  ]
}
```

**Why it's justified:** Article "el" embedded in non-obvious way. Cannot split "el" alone (FD violation).

---

## The Pattern

### Over-extraction happens when:

1. **Clean tiling ignored**: "poder hablar", "muy bien"
   - Test: Can both be tiled from A-types with same word order?
   - If YES → Don't extract M-type

2. **Wrong boundaries**: "después de que termines", "quiero que hables"
   - Test: Does chunk extend beyond particle construction?
   - If YES → Stop at particle boundary

3. **Over-chunking**: "lo que va a ocurrir"
   - Test: Does chunk combine multiple reusable units?
   - If YES → Split to minimum FD-compliant chunks

---

## Quick Reference: The FD Test

For each potential M-type, ask:

1. **Can learner reconstruct from A-types?** → If YES, skip M-type
2. **Is particle standalone FD-compliant?** → If NO, needs M-type
3. **Is this minimum chunk for FD?** → If NO, reduce chunk size
4. **Do both languages tile cleanly?** → If YES, skip M-type

---

## Files Generated

1. **Correct extraction**: `agent4_validation_lego_pairs_s0011-0015.json`
2. **Full report**: `agent4_validation_report.md`
3. **Detailed comparison**: `agent4_detailed_comparison.md`
4. **This summary**: `agent4_key_corrections.md`

All files in: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_test_s0011-0040/`
