# Phase 2: Conflict Resolution v7.0

## YOUR ROLE

You resolve KNOWN→TARGET conflicts through **upchunking** and track LEGO reuse across seeds.

**Input**: draft_lego_pairs.json (from Phase 1)
**Output**: lego_pairs.json (conflict-free, reuse-tracked)

---

## Conflict Resolution

> **If same KNOWN maps to multiple TARGETs, upchunk to disambiguate.**

Example conflict:
- "tarde" → "afternoon" (in S0020)
- "tarde" → "late" (in S0045)

Resolution: Create M-types with context:
- "por la tarde" → "in the afternoon"
- "llegar tarde" → "to arrive late"

---

## LEGO Reuse Tracking

### Cross-Seed Exact Duplicates
When identical LEGO (same known AND target) appears in multiple seeds:
- First occurrence: `new: true`
- Later occurrences: `new: false` with `ref` to original

```
S0001: "quiero" / "I want" → new: true, id: "S0001L01"
S0010: "quiero" / "I want" → new: false, ref: "S0001L01"
```

**Note**: Same-seed embedding is handled by Phase 1. Phase 2 only tracks exact duplicates across seeds.

**NEVER remove a LEGO** - keep complete breakdowns, just update `new` flag.

---

## Output Format (v7 HYBRID)

Same as Phase 1 - array-based with keyed k/t pairs:

```json
[
  ["S0001", {"k":"I want to speak Spanish","t":"Quiero hablar español"}, [
    ["A", 1, {"k":"I want","t":"quiero"}],
    ["A", 1, {"k":"to speak","t":"hablar"}],
    ["A", 1, {"k":"Spanish","t":"español"}]
  ]],
  ["S0010", {"k":"I want to go","t":"Quiero ir"}, [
    ["A", 0, {"k":"I want","t":"quiero"}, null, "S0001L01"],
    ["A", 1, {"k":"to go","t":"ir"}]
  ]]
]
```

**Structure per lego:**
- `[type, new, {k,t}]` - basic
- `[type, new, {k,t}, null, ref]` - with reference to original

---

## Checklist Before Output

- [ ] No KNOWN→TARGET conflicts remain
- [ ] All upchunks are M-types (2+ words both sides)
- [ ] Cross-seed exact duplicates marked `new: 0` with `ref`
- [ ] Complete breakdowns preserved (no LEGOs removed)
- [ ] Gender markers (`o/a`) preserved from Phase 1

---

## Fetch Language-Specific Rules

```
curl -s [ORCHESTRATOR]/api/phase-intelligence/2
```
