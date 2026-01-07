# Phase 2: Conflict Resolution v8.1

**APML**: v13.0.0
**Port**: 3458
**Input**: draft_lego_pairs.json (from Phase 1)
**Output**: lego_pairs.json (conflict-free, reuse-tracked)

---

## YOUR ROLE

You resolve KNOWN→TARGET conflicts through **upchunking** and track LEGO reuse across seeds.

---

## LANGUAGE-SPECIFIC GUIDANCE

> **IMPORTANT**: Before processing, you will receive a **Language Pair Brief**
> containing language-specific guidance. This brief includes:
> - Conflict patterns common to this language pair
> - Upchunking notes for resolving ambiguity
> - Common pitfalls to avoid
>
> **Use this brief** to inform your conflict resolution decisions.

---

## WHAT IS A CONFLICT?

A conflict occurs when the **same KNOWN text** maps to **different TARGET texts** across seeds.

This violates ZUT (Zero Uncertainty Test) - the learner wouldn't know which target to produce.

**Example conflict:**
- Seed A: "late" → "tarde" (as in "afternoon")
- Seed B: "late" → "tarde" (as in "arrived late")

Wait - that's actually the same target! Not a conflict.

**Real conflict example:**
- Seed A: "bank" → "[word for riverbank]"
- Seed B: "bank" → "[word for financial institution]"

Different targets for the same known = **conflict**.

---

## RESOLUTION: UPCHUNKING

When you find a conflict, **upchunk** both LEGOs to add disambiguating context.

**Before (conflict):**
```
"late" → "[target_1]" (time of day)
"late" → "[target_2]" (tardiness)
```

**After (resolved via upchunking):**
```
"in the afternoon" → "[target phrase 1]" (M-type)
"arrived late" → "[target phrase 2]" (M-type)
```

### Upchunking Rules

1. **Add enough context** to make meaning unambiguous
2. **Create M-types** (upchunked LEGOs are always multi-word on both sides)
3. **Keep it natural** - the phrase should sound idiomatic
4. **Check the brief** - use conflict patterns from the Language Pair Brief

---

## LEGO REUSE TRACKING

### Cross-Seed Exact Duplicates

When **identical** LEGO (same known AND target, character-exact) appears in multiple seeds:
- **First occurrence**: `new: true`
- **Later occurrences**: `new: false` with `ref` to original

```
S0001: "[known]" / "[target]" → new: true, id: "S0001L01"
S0010: "[known]" / "[target]" → new: false, ref: "S0001L01"
```

### Important Notes

- **Same-seed embedding** was handled by Phase 1
- Phase 2 only tracks **exact duplicates across seeds**
- **NEVER remove a LEGO** - keep complete breakdowns, just update `new` flag

---

## OUTPUT FORMAT (v8 HYBRID)

Array-based with keyed k/t pairs:

```json
[
  ["S0001", {"k":"[known sentence]","t":"[target sentence]"}, [
    ["A", 1, {"k":"[known]","t":"[target]"}],
    ["A", 1, {"k":"[known]","t":"[target]"}],
    ["M", 1, {"k":"[known]","t":"[target]"}, [
      {"k":"[component_known]","t":"[component_target]"}
    ]]
  ]],
  ["S0010", {"k":"[known sentence]","t":"[target sentence]"}, [
    ["A", 0, {"k":"[known]","t":"[target]"}, null, "S0001L01"],
    ["A", 1, {"k":"[known]","t":"[target]"}]
  ]]
]
```

### Structure per LEGO:

| Pattern | Meaning |
|---------|---------|
| `[type, new, {k,t}]` | Basic LEGO |
| `[type, new, {k,t}, components]` | M-type with components |
| `[type, new, {k,t}, null, ref]` | Reused LEGO (reference to original) |

### Field Values:

- `type`: "A" or "M"
- `new`: 1 (true) or 0 (false)
- `{k,t}`: Known and target text
- `components`: Array of `{k,t}` objects (M-types only)
- `ref`: ID of original LEGO (reused LEGOs only)

---

## THE ALGORITHM (First Come First Served)

```
FOR each KNOWN text across all seeds:
    1. Collect all TARGET mappings for this KNOWN
    2. Sort by seed order (S0001 before S0002, etc.)

    3. IF multiple different TARGETs exist:
       → CONFLICT detected
       → FIRST occurrence WINS (keeps its target)
       → LATER occurrences must UPCHUNK to disambiguate
       → Upchunked LEGOs become M-types

    4. IF all TARGETs are identical:
       → No conflict
       → Mark first as new: true
       → Mark duplicates as new: false with ref

OUTPUT: lego_pairs.json (conflict-free)
```

**FCFS Rule**: The first seed to use a known text locks in that target. Later seeds with different targets must upchunk.

---

## CHECKLIST BEFORE OUTPUT

- [ ] No KNOWN→TARGET conflicts remain
- [ ] All upchunks are M-types (2+ words both sides)
- [ ] Cross-seed exact duplicates marked `new: 0` with `ref`
- [ ] Complete breakdowns preserved (no LEGOs removed)
- [ ] Gender markers preserved from Phase 1
- [ ] **Language-specific conflict patterns from brief have been applied**

---

## COMMON CONFLICT SOURCES

Conflicts typically arise from:

1. **Polysemous words** - words with multiple meanings
2. **Prepositions** - rarely map 1:1 between languages
3. **Context-dependent translations** - same word, different best translation
4. **Homophones** - words that sound the same but differ in meaning

**Check the Language Pair Brief** for specific conflict patterns in your target language.
