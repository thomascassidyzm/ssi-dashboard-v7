# Whitelist and Context Presentation Strategy

**Date**: 2025-11-08
**Question**: How should we present vocabulary and seed context to optimize recency priority?
**Options**: Several approaches with different trade-offs

---

## 🎯 The Question

Should we:

**Option A**: Whitelist = only last 5 seeds + recent seeds as sentences?

**Option B**: Show ALL seeds N-1 as sentences, with S(1, N-6) marked "available" and S(N-5, N-1) marked "priority"?

**Option C**: Whitelist = ALL vocabulary + recent seeds only as rich context?

**Option D**: Layered approach with multiple levels of detail?

---

## 🚨 Critical Constraint: GATE Compliance

**GATE requires**: Every Spanish word in generated phrases MUST be in the whitelist.

**Current implementation**:
```javascript
// From create_basket_scaffolds.cjs
function buildWhitelist(registry, targetSeedNum) {
  // Include ALL LEGOs from seeds up to (and including) target seed
  if (legoSeedNum <= targetSeedNum) {
    lego.spanish_words.forEach(word => whitelist.add(word));
  }
}
```

**Whitelist for S0301**: 567 words (from S0001-S0301)

**If we restrict whitelist to only last 5 seeds**:
- Estimated: ~20-40 words
- Agent CANNOT use "quiero" (S0001), "hablar" (S0001), "creo" (S0014), etc.
- GATE validation would REJECT most natural phrases
- **❌ NOT VIABLE**

**Conclusion**: **Whitelist MUST contain ALL vocabulary from S0001 to current seed.**

---

## 📊 Option Analysis

### Option A: Restrict Whitelist to Recent Only

**Structure**:
```json
{
  "whitelist": ["preocupo", "errores", "pienso", ...],  // Only S0296-S0300 words
  "recent_seeds": [...]
}
```

**Pros**:
- ✅ Small whitelist (~30 words)
- ✅ Forces recency

**Cons**:
- ❌ **Breaks GATE** - can't use 95% of vocabulary
- ❌ Can't say "Quiero estar preocupado" (quiero is S0001)
- ❌ Can't say "Creo que es normal" (creo is S0014)
- ❌ Severely restricts phrase diversity

**Verdict**: ❌ **NOT VIABLE** (GATE compliance failure)

---

### Option B: Show ALL Seeds as Sentences

**Structure**:
```json
{
  "whitelist": [...567 words...],
  "all_seeds_context": [
    {
      "seeds": "S0001-S0295",
      "priority": "available",
      "format": "sentences"  // 295 seed sentences
    },
    {
      "seeds": "S0296-S0300",
      "priority": "high",
      "format": "rich_sentences_with_legos"  // 5 seed sentences + LEGOs
    }
  ]
}
```

**Context size calculation**:
- 295 basic sentences: ~295 × 100 chars = 29.5KB
- 5 rich sentences: ~5 × 300 chars = 1.5KB
- Total per LEGO: ~31KB
- Total for 44 LEGOs: 31KB × 44 = **1,364KB = 1.4MB**

**Current scaffold**: 253KB for 44 LEGOs
**New size**: 253KB + 1,364KB = **1,617KB = 1.6MB**

**Token cost** (rough estimate):
- 1.6MB ≈ 400,000 tokens (at ~4 chars/token)
- **Just to READ the scaffold** = 400K tokens
- Plus generation tokens
- **Way over budget for most models**

**Pros**:
- ✅ Complete context available
- ✅ Clear priority marking

**Cons**:
- ❌ **Massive context bloat** (1.4MB increase)
- ❌ **Token cost prohibitive** (~400K tokens)
- ❌ Agent can't realistically process 300 seed sentences
- ❌ Overwhelming cognitive load

**Verdict**: ❌ **NOT PRACTICAL** (context explosion)

---

### Option C: Full Whitelist + Recent Seeds Only

**Structure** (current recommendation):
```json
{
  "whitelist": [...567 words...],  // ALL vocabulary (GATE compliance)
  "_metadata": {
    "whitelist_size": 567,
    "recent_seeds": [  // Just 5 previous seeds with rich context
      {
        "seed_id": "S0296",
        "target": "...",
        "known": "...",
        "new_legos": [...]
      },
      // ... S0297-S0300
    ]
  }
}
```

**Context size**:
- Whitelist: ~567 words × 8 chars avg = ~4.5KB
- Recent seeds: 5 × 300 chars = 1.5KB
- Total per LEGO: ~6KB
- Total for 44 LEGOs: 6KB × 44 = 264KB

**Current scaffold**: 253KB
**New size**: 253KB + (1.5KB × 44) = **319KB**
**Increase**: +26% (manageable)

**Pros**:
- ✅ GATE compliant (full whitelist)
- ✅ Reasonable context size (+26%)
- ✅ Rich recent context (sentences + LEGOs)
- ✅ Agent can process easily
- ✅ Old vocabulary available but not highlighted

**Cons**:
- ⚠️ No explicit visibility into S0001-S0295 sentence context
- ⚠️ Agent has to remember/infer how old words are used

**Verdict**: ✅ **VIABLE** (good balance)

---

### Option D: Layered Approach (Best of Both Worlds)

**Structure**:
```json
{
  "whitelist": [...567 words...],  // ALL vocabulary (GATE compliance)
  "_metadata": {
    "whitelist_size": 567,

    "recent_vocabulary": [  // Quick reference: what's new
      "preocupo", "errores", "pienso", "importa", "sabes",
      "terminar", "rápidamente", ...
    ],

    "recent_seeds": [  // Rich context: how they're used
      {
        "seed_id": "S0296",
        "target": "...",
        "known": "...",
        "new_legos": [...]
      },
      // ... S0297-S0300
    ]
  }
}
```

**What it provides**:

1. **Full whitelist** (567 words)
   - Purpose: GATE validation
   - Usage: "Can I use word X?" → check whitelist

2. **Recent vocabulary** subset (20-40 words)
   - Purpose: Quick scan of what's new
   - Usage: "What should I prioritize?" → scan this list

3. **Recent seeds** with full context (5 seeds)
   - Purpose: Pattern understanding
   - Usage: "How are these words used?" → read sentences

**Context size**:
- Whitelist: ~4.5KB
- Recent vocabulary: ~30 words × 8 chars = ~0.24KB
- Recent seeds: 5 × 300 chars = 1.5KB
- Total per LEGO: ~6.24KB
- Total for 44 LEGOs: ~274KB

**Increase**: 253KB → 274KB (+8%)

**Agent workflow**:

```
<thinking>
Current LEGO: "worried" / "preocupado"

Step 1: Quick scan - what's recent?
recent_vocabulary: ["preocupo", "errores", "pienso", "importa", ...]
→ Ah, "preocupo" is recent! Related to my LEGO "preocupado"

Step 2: Deep dive - how are they used?
recent_seeds[0]: "Pero no me preocupo por hacer errores."
→ "No me preocupo" pattern
→ "hacer errores" theme
recent_seeds[1]: "Porque pienso que es una cosa buena hacer errores."
→ "pienso que" pattern
→ Mistakes theme continues

Step 3: Generate with recency priority
- Use recent patterns: "No me preocupa", "Pienso que estar preocupado..."
- Use recent vocab: "errores", "pienso"
- Can also use old vocab if needed: "quiero", "creo" (in full whitelist)

Result: 7/10 phrases use recent vocabulary ✅
</thinking>
```

**Pros**:
- ✅ GATE compliant (full whitelist)
- ✅ Quick reference (recent_vocabulary list)
- ✅ Rich context (recent_seeds with patterns)
- ✅ Minimal overhead (+8% vs +26%)
- ✅ Three-tier information architecture
- ✅ Agent can choose depth: scan list OR read sentences

**Cons**:
- ⚠️ Slightly more complex to implement (+20 lines)
- ⚠️ Tiny bit of redundancy (recent words appear in both list and sentences)

**Verdict**: ✅✅ **BEST APPROACH** (optimal balance)

---

## 🔍 Detailed Comparison

| Aspect | Option A | Option B | Option C | Option D |
|--------|----------|----------|----------|----------|
| **GATE compliance** | ❌ Breaks | ✅ Yes | ✅ Yes | ✅ Yes |
| **Context size** | Small | Huge (+1.4MB) | Medium (+66KB) | Small (+21KB) |
| **Token cost** | Low | Prohibitive | Acceptable | Low |
| **Recent visibility** | High | High | High | Very High |
| **Old vocab access** | ❌ Blocked | ✅ Visible | ✅ Available | ✅ Available |
| **Pattern exposure** | Yes (recent) | Yes (all) | Yes (recent) | Yes (recent) |
| **Quick reference** | N/A | No | No | ✅ Yes |
| **Cognitive load** | Low | Overwhelming | Medium | Low-Medium |
| **Implementation** | Simple | Complex | Medium | Medium+ |
| **Practical?** | ❌ No | ❌ No | ✅ Yes | ✅✅ Yes |

**Winner**: **Option D** (Layered Approach)

---

## 💡 Recommended Implementation: Option D

### Scaffold Structure

```json
{
  "version": "curated_v6_molecular_lego",
  "agent_id": 1,
  "seed_range": "S0301-S0320",
  "seeds": {
    "S0301": {
      "seed": "S0301",
      "seed_pair": {
        "target": "Él dijo que quiere mostrarte algo.",
        "known": "He said that he wants to show you something."
      },

      "whitelist": [
        "a", "absoluto", "acaba", ..., "yo", "zona"
        // ALL 567 words from S0001-S0301
      ],

      "available_legos_before_seed": 839,

      "legos": {
        "S0301L05": {
          "lego": ["to show you", "mostrarte"],
          "type": "A",
          "new": true,
          "is_final_lego": false,
          "available_legos": 839,
          "practice_phrases": [],
          "phrase_distribution": {...},

          "_metadata": {
            "spanish_words": ["mostrarte"],
            "whitelist_size": 567,

            "seed_context": {
              "target": "Él dijo que quiere mostrarte algo.",
              "known": "He said that he wants to show you something."
            },

            "recent_vocabulary": [
              "ayudar", "importante", "necesitar", "pensar", "podría",
              "mostrar", "mostrarte", "pueblo", "segura", "verdad",
              // ~20-40 words from S0296-S0300
            ],

            "recent_seeds": [
              {
                "seed_id": "S0296",
                "target": "Podrías ayudarme con esto si quieres.",
                "known": "You could help me with this if you want.",
                "new_legos": [
                  {
                    "target": "podrías",
                    "known": "you could",
                    "type": "A"
                  },
                  {
                    "target": "ayudarme",
                    "known": "help me",
                    "type": "A"
                  },
                  {
                    "target": "con esto",
                    "known": "with this",
                    "type": "M",
                    "components": [["con", "with"], ["esto", "this"]]
                  }
                ]
              },
              {
                "seed_id": "S0297",
                "target": "Creo que podría ser importante.",
                "known": "I think that it could be important.",
                "new_legos": [
                  {
                    "target": "podría ser",
                    "known": "it could be",
                    "type": "M",
                    "components": [["podría", "could"], ["ser", "be"]]
                  },
                  {
                    "target": "importante",
                    "known": "important",
                    "type": "A"
                  }
                ]
              },
              {
                "seed_id": "S0298",
                "target": "Necesito pensar en lo que dijo.",
                "known": "I need to think about what he said.",
                "new_legos": [
                  {
                    "target": "necesito",
                    "known": "I need",
                    "type": "A"
                  },
                  {
                    "target": "pensar en",
                    "known": "to think about",
                    "type": "M",
                    "components": [["pensar", "to think"], ["en", "about/in"]]
                  }
                ]
              },
              {
                "seed_id": "S0299",
                "target": "No estoy segura de que sea verdad.",
                "known": "I'm not sure that it's true.",
                "new_legos": [
                  {
                    "target": "no estoy segura",
                    "known": "I'm not sure",
                    "type": "M",
                    "components": [["no", "not"], ["estoy", "I am"], ["segura", "sure (fem)"]]
                  },
                  {
                    "target": "de que sea",
                    "known": "that it is (subj)",
                    "type": "M",
                    "components": [["de que", "that"], ["sea", "it is (subj)"]]
                  },
                  {
                    "target": "verdad",
                    "known": "true/truth",
                    "type": "A"
                  }
                ]
              },
              {
                "seed_id": "S0300",
                "target": "Quiero mostrarte un pueblo pequeño.",
                "known": "I want to show you a small town.",
                "new_legos": [
                  {
                    "target": "mostrar",
                    "known": "to show",
                    "type": "A"
                  },
                  {
                    "target": "pueblo",
                    "known": "town",
                    "type": "A"
                  },
                  {
                    "target": "pequeño",
                    "known": "small",
                    "type": "A"
                  }
                ]
              }
            ]
          }
        }
      }
    }
  }
}
```

---

### Prompt Enhancement

```markdown
#### Recency Priority ⭐ IMPORTANT

**Goal**: Create a rolling window of fresh vocabulary and patterns.

**Your scaffold provides THREE levels of vocabulary context**:

1. **Full whitelist** (567 words)
   - Contains ALL Spanish words available up to current seed
   - Use for GATE validation: "Can I use this word?"
   - You MAY use any word from this list

2. **Recent vocabulary** (20-40 words)
   - Contains words introduced in the 5 previous seeds
   - Quick reference: "What should I prioritize?"
   - You SHOULD prioritize these words

3. **Recent seeds** (5 seed sentences)
   - Complete sentences showing HOW recent words are used
   - Reveals patterns and themes
   - You SHOULD vary these patterns

**Target**: 6-8 out of 10 phrases should use recent vocabulary or echo recent patterns.

---

**How to use this information**:

**Step 1: Quick scan - what's new?**
```
Check _metadata.recent_vocabulary
→ Note words related to your current LEGO
→ Identify interesting new words
```

**Step 2: Deep dive - how are they used?**
```
Read _metadata.recent_seeds
→ See complete sentences in context
→ Identify sentence patterns (structures)
→ Notice thematic connections
```

**Step 3: Generate with recency priority**
```
Build phrases that:
✅ Use recent vocabulary (from recent_vocabulary list)
✅ Vary recent patterns (from recent_seeds sentences)
✅ Maintain thematic coherence (continue recent topics)
⚠️ Can use old vocabulary (from full whitelist) when needed
```

---

**Example** (LEGO: "to show you" / "mostrarte" at S0301):

**Step 1: Quick scan**
```
recent_vocabulary: ["ayudar", "importante", "necesitar", "pensar",
                    "podría", "mostrar", "mostrarte", "pueblo", ...]
→ "mostrar" and "mostrarte" are here! This is fresh vocabulary.
→ "necesitar", "pensar", "importante", "podría" also look useful.
```

**Step 2: Deep dive**
```
recent_seeds show:
S0296: "Podrías ayudarme con esto si quieres."
→ Pattern: "Podrías [verb]" (you could...)
→ Pattern: "si quieres" (if you want)

S0297: "Creo que podría ser importante."
→ Pattern: "creo que podría ser [adj]" (I think it could be...)

S0298: "Necesito pensar en lo que dijo."
→ Pattern: "Necesito [infinitive]" (I need to...)
→ Uses "dijo" (said) - connects to current seed!

S0299: "No estoy segura de que sea verdad."
→ Pattern: "No estoy segura" (I'm not sure)

S0300: "Quiero mostrarte un pueblo pequeño."
→ Uses "mostrarte" directly!
→ Pattern: "Quiero mostrarte [noun]"

Theme: Helping, thinking, showing, uncertainty → collaborative learning
```

**Step 3: Generate**
```
1. "Mostrarte" (bare)
2. "Quiero mostrarte" (echoes S0300 pattern)
3. "Mostrarte algo" (simple extension)
4. "Necesito mostrarte esto" (echoes S0298 "Necesito [inf]")
5. "Él quiere mostrarte algo importante" (uses S0297 "importante")
6. "Creo que quiero mostrarte" (uses "creo que" from S0297)
7. "Podría mostrarte si quieres" (echoes S0296 "si quieres")
8. "Él dijo que quiere mostrarte" (uses "dijo" from S0298 + seed context)
9. "Necesito pensar en cómo mostrarte" (combines S0298 "necesito pensar")
10. "Él dijo que quiere mostrarte algo." (final seed)

Result: 9/10 phrases use recent vocabulary or patterns ✅
Theme: Continues collaborative/showing theme ✅
</thinking>
```

---

**Why three levels?**

1. **Full whitelist** = GATE compliance + complete freedom
2. **Recent vocabulary** = Quick prioritization signal
3. **Recent seeds** = Deep contextual understanding

You have complete freedom (full whitelist) with strong guidance (recent vocabulary + seeds).
```

---

## 🎯 Final Recommendation

### Use Option D: Layered Approach

**Include in scaffold `_metadata`**:

1. ✅ **Full whitelist** (existing, keep as-is)
   - ALL words from S0001 to current
   - GATE compliance
   - 567 words for S0301

2. ✅ **recent_vocabulary** (NEW - simple list)
   - Words from 5 previous seeds only
   - Quick reference for prioritization
   - ~20-40 words

3. ✅ **recent_seeds** (NEW - rich context)
   - 5 previous seed sentences
   - NEW LEGOs highlighted with components
   - ~1.5KB per LEGO

**Total overhead**: +21KB for 44 LEGOs (+8% from 253KB to 274KB)

**Benefits**:
- ✅ GATE compliant
- ✅ Quick reference (scan list)
- ✅ Deep context (read sentences)
- ✅ Pattern exposure (see structures)
- ✅ Thematic coherence (topic progression)
- ✅ Minimal overhead (+8%)
- ✅ Agent choice: quick OR deep

**Why not show all seeds?**
- ❌ Context explosion (would add 1.4MB)
- ❌ Token cost prohibitive (~400K tokens)
- ❌ Overwhelming for agent
- ✅ Old vocabulary available in whitelist (agent can use if needed)
- ✅ Recent focus ensures rolling window benefit

---

## 💡 Key Insight

**The whitelist answers**: "CAN I use this word?" (GATE validation)

**The recent vocabulary answers**: "SHOULD I prioritize this word?" (quick scan)

**The recent seeds answer**: "HOW do I use this word naturally?" (pattern understanding)

**Three complementary information layers, each serving a different purpose.**

---

## 📋 Implementation Summary

**Modify `create_basket_scaffolds.cjs`**:

```javascript
// Add function to extract recent vocabulary (simple list)
function buildRecentVocabulary(registry, currentSeedNum, windowSize = 5) {
  const recentWords = new Set();
  const startSeed = Math.max(1, currentSeedNum - windowSize);
  const endSeed = currentSeedNum - 1;

  for (const legoId in registry.legos) {
    const legoSeedNum = extractLegoSeedNum(legoId);
    if (legoSeedNum >= startSeed && legoSeedNum <= endSeed) {
      const lego = registry.legos[legoId];
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => recentWords.add(word));
      }
    }
  }

  return Array.from(recentWords).sort();
}

// Add function to extract recent seeds (rich context)
function extractRecentSeedsContext(legoPairs, currentSeedNum, windowSize = 5) {
  const recentSeeds = [];
  const startSeed = Math.max(1, currentSeedNum - windowSize);
  const endSeed = currentSeedNum - 1;

  for (const seedData of legoPairs.seeds) {
    const seedNum = extractSeedNum(seedData.seed_id);

    if (seedNum >= startSeed && seedNum <= endSeed) {
      const newLegos = seedData.legos
        .filter(lego => lego.new === true)
        .map(lego => ({
          target: lego.target,
          known: lego.known,
          type: lego.type,
          components: lego.components || null
        }));

      recentSeeds.push({
        seed_id: seedData.seed_id,
        target: seedData.seed_pair[0],
        known: seedData.seed_pair[1],
        new_legos: newLegos
      });
    }
  }

  return recentSeeds;
}

// In generateScaffold():
const recentVocab = buildRecentVocabulary(registry, seedNum, 5);
const recentSeeds = extractRecentSeedsContext(legoPairs, seedNum, 5);

scaffold.seeds[seedId].legos[legoId]._metadata.recent_vocabulary = recentVocab;
scaffold.seeds[seedId].legos[legoId]._metadata.recent_seeds = recentSeeds;
```

**Estimated implementation time**: 4-6 hours
**Context overhead**: +8%
**Expected benefit**: High (quality +0.5-1.0, recency compliance 70-80%)

---

**Analysis completed**: 2025-11-08
**Recommendation**: Option D (Layered approach with three information levels)
**Next step**: Implement in create_basket_scaffolds.cjs and update v4.1 prompt
