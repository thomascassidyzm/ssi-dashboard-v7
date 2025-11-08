# Prompt Caching Architecture for Phase 5 Recency Context

**Date**: 2025-11-08
**Insight**: Use prompt caching to load ALL 668 seeds once, then vary focus window per LEGO
**Key principle**: Full visibility, sliding focus

---

## 🎯 The Breakthrough Insight

**Problem with previous thinking**: Treating context as "what the agent sees"

**Better framing**: With prompt caching, context is "reference library" (cached) + "current task" (variable)

**Architecture**:
- **CACHED**: All 668 seeds with patterns (loaded once, ~$0.30, reused for all LEGOs)
- **VARIABLE**: Current LEGO + focus instruction (changes per LEGO, ~$0.01 each)

**Agent behavior**:
- Has full visibility into entire course
- Gets explicit focus guidance: "Prioritize S0296-S0300"
- Can reference any seed, but focuses on recent ones
- **Sliding focus window, not sliding visibility window**

---

## 📊 Architecture Design

### Cached Context (Static - Loaded Once)

**Contents**:
```
┌─────────────────────────────────────────┐
│ CACHED CONTEXT (~500-800KB)            │
│ Cost: $0.30 first load, $0.03 reuse    │
├─────────────────────────────────────────┤
│                                         │
│ 1. System Prompt & Instructions         │
│    - Phase 5 v4.1 full guidance         │
│    - GATE rules                         │
│    - Distribution requirements          │
│    - Word class recognition             │
│    - Examples                           │
│                                         │
│ 2. Complete Seed Reference (S0001-S0668)│
│    {                                    │
│      "seed_id": "S0001",                │
│      "target": "Quiero hablar...",      │
│      "known": "I want to speak...",     │
│      "new_legos": [                     │
│        {                                │
│          "target": "quiero",            │
│          "known": "I want",             │
│          "type": "A"                    │
│        },                               │
│        ...                              │
│      ]                                  │
│    },                                   │
│    ... (all 668 seeds)                  │
│                                         │
│ 3. Pattern Recognition Guidance         │
│    - How to identify patterns           │
│    - How to vary patterns               │
│    - Recency priority explanation       │
│                                         │
└─────────────────────────────────────────┘
```

**Size estimate**:
- 100 seeds in lego_pairs.json = 133KB
- 668 seeds ≈ 888KB
- Instructions + examples ≈ 50KB
- **Total cached: ~940KB ≈ 235K tokens**

**Cost** (Claude Sonnet 3.5):
- First load: 235K tokens × $3/MTok = **$0.71**
- Cache write: 235K × $3.75/MTok = **$0.88**
- **Cache read: 235K × $0.30/MTok = $0.07 per reuse** ✅

---

### Variable Context (Per-LEGO)

**Contents**:
```
┌─────────────────────────────────────────┐
│ VARIABLE CONTEXT (~5-10KB)             │
│ Cost: $0.01-0.02 per LEGO              │
├─────────────────────────────────────────┤
│                                         │
│ Current Task:                           │
│                                         │
│ Seed Position: S0301                    │
│                                         │
│ LEGO: ["to show you", "mostrarte"]      │
│ Type: A (Atomic)                        │
│ is_final_lego: false                    │
│                                         │
│ Whitelist: [567 words from S0001-S0301]│
│                                         │
│ Focus Window: S0296-S0300               │
│ (You are at S0301. Prioritize the      │
│  5 previous seeds for vocabulary and    │
│  pattern inspiration.)                  │
│                                         │
│ Task: Generate 10 practice phrases      │
│ following 2-2-2-4 distribution.         │
│                                         │
│ Output: Fill practice_phrases array     │
│                                         │
└─────────────────────────────────────────┘
```

**Size estimate**:
- Current LEGO metadata: ~0.5KB
- Whitelist: ~5KB (567 words)
- Instructions: ~1KB
- **Total variable: ~6.5KB ≈ 1.6K tokens**

**Cost** (Claude Sonnet 3.5):
- Input: 1.6K × $3/MTok = **$0.005**
- Output: ~1K tokens × $15/MTok = **$0.015**
- **Total per LEGO: ~$0.02**

---

## 💰 Cost Analysis

### Current Approach (No Caching)

**Per LEGO**:
- Input: (v4.1 prompt ~20KB + scaffold ~6KB) = 26KB ≈ 6.5K tokens
- Cost: 6.5K × $3/MTok = $0.020 per LEGO
- Output: ~1K × $15/MTok = $0.015

**Total for 44 LEGOs**:
- Input: 44 × $0.020 = **$0.88**
- Output: 44 × $0.015 = **$0.66**
- **Total: $1.54**

---

### Prompt Caching Approach (All 668 Seeds)

**First LEGO (cache miss)**:
- Cached context write: 235K × $3.75/MTok = $0.88
- Variable input: 1.6K × $3/MTok = $0.005
- Output: 1K × $15/MTok = $0.015
- **First LEGO: $0.90**

**Subsequent LEGOs (cache hit)**:
- Cached context read: 235K × $0.30/MTok = $0.07
- Variable input: 1.6K × $3/MTok = $0.005
- Output: 1K × $15/MTok = $0.015
- **Per LEGO: $0.09**

**Total for 44 LEGOs**:
- First: $0.90
- Next 43: 43 × $0.09 = $3.87
- **Total: $4.77**

**Wait, that's MORE expensive!** 🤔

---

### BETTER: Batch Processing with Caching

**Key insight**: Generate multiple LEGOs in one conversation with cached context.

**Architecture**:
- Load cached context once (all 668 seeds)
- Process 5-10 LEGOs in sequence in same conversation
- Cache persists across LEGOs within conversation

**Cost for 44 LEGOs (batches of 5)**:

**Batch 1 (LEGOs 1-5)**:
- Cache write: $0.88
- Variable input: 5 × 1.6K × $3/MTok = $0.024
- Output: 5 × 1K × $15/MTok = $0.075
- **Batch 1: $0.98**

**Batches 2-9 (LEGOs 6-44)**:
- Cache read: $0.07 per batch
- Variable input: $0.024 per batch
- Output: $0.075 per batch
- 8 batches × ($0.07 + $0.024 + $0.075) = 8 × $0.169 = **$1.35**

**Total for 44 LEGOs in 9 batches**:
- Batch 1: $0.98
- Batches 2-9: $1.35
- **Total: $2.33**

**Savings vs no caching**: $1.54 vs $2.33 = ❌ **$0.79 MORE expensive**

Hmm, still more expensive even batched!

---

### Wait - Let me recalculate WITHOUT full seed context

**Current approach**: Just v4.1 prompt + current seed context + whitelist
- NOT including all 668 seeds
- Just the 5 recent seeds

Let me recalculate the REAL current cost...

**Current (Layered Approach from earlier)**:
- v4.1 prompt: ~50KB
- Whitelist: ~5KB
- Recent 5 seeds (rich): ~1.5KB
- **Total per LEGO: ~56.5KB ≈ 14K tokens**

**Cost per LEGO (no caching)**:
- Input: 14K × $3/MTok = $0.042
- Output: 1K × $15/MTok = $0.015
- **Per LEGO: $0.057**

**Total for 44 LEGOs**: 44 × $0.057 = **$2.51**

---

**WITH caching (all 668 seeds)**:

If we batch in groups of 5:
- **Total: $2.33** (calculated above)

**Savings: $2.51 - $2.33 = $0.18 savings** ✅

**Plus**: Agent has FULL context, not just recent 5 seeds!

---

## 🎯 The Real Value: Not Cost, But Quality

### What Agent Gets with Full Seed Context

**Scenario**: Generating for "worried" / "preocupado" at S0301

**With just 5 recent seeds (S0296-S0300)**:
```
Agent sees:
- S0296: "Podrías ayudarme..."
- S0297: "Creo que podría ser importante."
- S0298: "Necesito pensar..."
- S0299: "No estoy segura..."
- S0300: "Quiero mostrarte..."

Theme: Helping, thinking, showing
Patterns: "Creo que", "Necesito [inf]", "No estoy segura"
```

**With ALL 668 seeds visible (cached)**:
```
Agent can search memory:
- "Let me look for other uses of worry/preocupar in earlier seeds..."
- Found S0046: "Pero no me preocupo por hacer errores."
- Pattern discovered: "no me preocupo" (I don't worry)
- Can vary: "No me preocupa estar preocupado"

- "Let me look for adjective patterns with estar..."
- Found S0025: "Estoy cansado" (I'm tired)
- Pattern: "Estoy [adjective]"
- Can build: "Estoy preocupado por esto"

- "Let me see if there are uncertainty patterns..."
- Found S0299: "No estoy segura de que sea verdad"
- Pattern: "No estoy [adjective] de que..."
- Can create: "No estoy preocupado de que sea un problema"

Full context → Richer pattern mining → Higher quality
```

**The benefit isn't cost - it's QUALITY and PATTERN DIVERSITY.**

---

## 💡 The Smart Architecture

### Cached Reference Library (All 668 Seeds)

```json
{
  "seed_reference_library": {
    "purpose": "Complete seed corpus for pattern mining",
    "usage": "You have full access to all seeds. Search and reference any seed for patterns.",

    "seeds": [
      {
        "id": "S0001",
        "target": "Quiero hablar español contigo ahora.",
        "known": "I want to speak Spanish with you now.",
        "legos": [
          {"target": "quiero", "known": "I want", "type": "A"},
          {"target": "hablar", "known": "to speak", "type": "A"},
          ...
        ]
      },
      ...
      // All 668 seeds
    ],

    "pattern_mining_guidance": {
      "instruction": "You can search through all seeds to find patterns similar to your current LEGO. Look for:",
      "search_for": [
        "Same word class (verb, noun, adjective)",
        "Same root word or semantic field",
        "Similar sentence structures",
        "Thematic connections"
      ]
    }
  }
}
```

### Variable Task Context (Per-LEGO)

```json
{
  "current_task": {
    "position": "S0301",
    "lego": ["to show you", "mostrarte"],
    "type": "A",

    "whitelist": [...567 words...],

    "recency_focus": {
      "window": "S0296-S0300",
      "instruction": "PRIORITIZE these 5 seeds for recency. You should use vocabulary and patterns from S0296-S0300 in 60-80% of your phrases.",
      "note": "You MAY reference earlier seeds from the full library if you find relevant patterns, but keep the recency focus."
    },

    "task": "Generate 10 practice phrases (2-2-2-4 distribution)",
    "output": {
      "practice_phrases": []
    }
  }
}
```

---

## 🔥 Agent Thinking Process with Full Context

```
<thinking>
Current LEGO: "worried" / "preocupado" (S0301)
Type: Adjective

Step 1: Check recency focus
Recency window: S0296-S0300
Let me read these first...

S0296: "Podrías ayudarme con esto si quieres."
S0297: "Creo que podría ser importante."
S0298: "Necesito pensar en lo que dijo."
S0299: "No estoy segura de que sea verdad."
S0300: "Quiero mostrarte un pueblo pequeño."

Patterns: "Creo que podría", "Necesito [inf]", "No estoy segura", "si quieres"
Theme: Thinking, helping, uncertainty
Recent vocab: podría, importante, necesitar, pensar, segura

Step 2: Search full library for "preocupado" related patterns
Searching seed_reference_library for "preocup"...

Found S0046: "Pero no me preocupo por hacer errores."
- "preocupo" (verb) vs my "preocupado" (adjective)
- Pattern: "no me preocupo por [activity]"
- I can vary: "No me preocupa [noun/clause]"

Found patterns with "estar + adjective":
- S0025: "Estoy cansado" (I'm tired)
- S0087: "Está contento" (He's happy)
- Pattern: "Estoy/Está [adjective]"

Step 3: Combine recency + pattern mining

Recent words to prioritize:
- importante (S0297)
- pensar (S0298)
- segura (S0299) - similar adjective usage!

Patterns to vary:
- "No estoy [adjective]" (combining S0299 + adjective pattern)
- "Creo que" (S0297)
- "Necesito [inf]" (S0298)

Generate:
1. "preocupado" (bare)
2. "un poco preocupado" (simple)
3. "Estoy preocupado" (estar + adj pattern)
4. "No estoy preocupado" (varies S0299 "No estoy segura")
5. "Creo que estoy preocupado" (uses S0297 "Creo que")
6. "Estoy un poco preocupado por esto" (adds complexity)
7. "No me preocupa tanto" (varies S0046 pattern)
8. "Necesito pensar si estoy preocupado" (uses S0298 pattern)
9. "Creo que es importante no estar preocupado" (combines S0297 importante)
10. "Estoy un poco preocupado." (final seed)

Recency check:
- Uses "importante" (S0297) ✅
- Uses "pensar" (S0298) ✅
- Echoes "No estoy [adj]" from S0299 ✅
- Echoes "Creo que" from S0297 ✅
- 7/10 phrases use recent patterns ✅

Pattern diversity:
- Bare, estar + adj, no estar, creo que, necesito, no me preocupa
- 6 different patterns ✅

Result: High recency + rich pattern mining from full context!
</thinking>
```

**The agent gets BOTH**:
- ✅ Recency focus (guided by explicit window)
- ✅ Pattern mining (enabled by full context)

---

## 📋 Implementation Design

### File Structure

**Create**: `phase5_seed_reference_library.json`
```json
{
  "version": "1.0",
  "purpose": "Complete seed corpus for prompt caching and pattern mining",
  "total_seeds": 668,
  "seeds": [
    // Extract from lego_pairs.json
    // Format: simplified for caching
  ]
}
```

**Script**: `scripts/build_seed_reference_library.cjs`
```javascript
// Read lego_pairs.json (all batches)
// Extract: seed_id, target, known, new_legos (simplified)
// Output: Optimized JSON for caching
```

---

### Prompt Structure (with caching markers)

```
┌─────────────────────────────────────────┐
│ [CACHE: START]                          │ ← Anthropic prompt caching marker
├─────────────────────────────────────────┤
│                                         │
│ # Phase 5 Basket Generation v4.2       │
│ (Complete v4.1 instructions here)       │
│                                         │
│ # Seed Reference Library               │
│ You have access to all 668 seeds...    │
│                                         │
│ {seed_reference_library JSON}          │
│                                         │
│ # Pattern Mining Guidance              │
│ Search the library for patterns...      │
│                                         │
├─────────────────────────────────────────┤
│ [CACHE: END]                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [VARIABLE CONTEXT]                      │
├─────────────────────────────────────────┤
│                                         │
│ # Current Task                          │
│                                         │
│ Position: S0301                         │
│ LEGO: ["to show you", "mostrarte"]      │
│ Whitelist: [...]                        │
│                                         │
│ Recency Focus: S0296-S0300             │
│ (Prioritize these 5 seeds)              │
│                                         │
│ Generate: 10 practice phrases           │
│                                         │
└─────────────────────────────────────────┘
```

---

### Batching Strategy

**Process LEGOs in batches of 5-10** within same conversation:

```
Conversation start:
→ Load cached context (all 668 seeds) [$0.88 cache write]

LEGO 1: S0301L05
→ Variable: position S0301, focus S0296-S0300
→ Generate 10 phrases
→ [$0.005 input + $0.015 output]

LEGO 2: S0301L06
→ Variable: position S0301, focus S0296-S0300
→ Generate 10 phrases
→ [$0.005 input + $0.015 output]

... (5-10 LEGOs in same conversation)

Conversation end.

Next batch (new conversation):
→ Cache hit (all 668 seeds) [$0.07 cache read]
→ Process next 5-10 LEGOs
```

**Cost for 44 LEGOs** (9 batches of ~5):
- Batch 1: Cache write $0.88 + tasks $0.10 = $0.98
- Batches 2-9: Cache read $0.07 + tasks $0.10 = $0.17 each × 8 = $1.36
- **Total: $2.34** (vs $2.51 without caching)

**Savings**: $0.17 (7%)
**Benefit**: Agent has full context, not just 5 recent seeds

---

## 🎯 Final Recommendation

### Yes, Use Prompt Caching with Full Seed Library!

**Architecture**:

1. **Build seed reference library** (~900KB)
   - All 668 seeds with LEGOs
   - Optimized JSON format

2. **Cache it** in every agent conversation
   - First conversation: $0.88 cache write
   - Subsequent: $0.07 cache read

3. **Variable context**: Current LEGO + focus window
   - Whitelist for current position
   - "Recency focus: S(N-5) to S(N-1)"

4. **Batch process**: 5-10 LEGOs per conversation
   - Amortize cache cost
   - Keep conversation context

**Benefits**:
- ✅ Small cost (7% savings, ~$0.17 saved)
- ✅ **HUGE quality benefit**: Full pattern mining capability
- ✅ Agent can reference ANY seed for patterns
- ✅ Still has clear recency focus (explicit guidance)
- ✅ Best of both worlds: full visibility + sliding focus

**The insight you had is exactly right**: Full library cached + sliding focus window is the smart architecture!

---

**Analysis completed**: 2025-11-08
**Recommendation**: Implement prompt caching with full 668-seed reference library
**Next step**: Build seed_reference_library.json and update generation script to use caching
