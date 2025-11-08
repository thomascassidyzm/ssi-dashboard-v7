# Recency Context Design: Seed Sentences vs Vocabulary Lists

**Date**: 2025-11-08
**Question**: Should we show 5 previous SEED SENTENCES with patterns highlighted, or just vocabulary lists?
**Context**: Strengthening recency priority to create rolling window of topics/patterns/vocab

---

## 🎯 Executive Summary

**Recommendation**: **Use SEED SENTENCES with LEGO highlighting** (not vocabulary lists)

**Why**:
- ✅ **Contextual over mechanical** - Aligns with v4.1 linguistic reasoning philosophy
- ✅ **Pattern exposure** - Agents see HOW words are used, not just WHICH words
- ✅ **Natural imitation** - Can vary the patterns they see in recent seeds
- ✅ **Thematic coherence** - See the topic progression explicitly
- ✅ **Richer information** - Sentence structure + LEGOs + components, not just word lists

**This is more aligned with the "linguistic reasoning, not templates" approach.**

---

## 📊 Two Approaches Compared

### Approach A: Vocabulary Lists (Simple)

**What it provides**:
```json
{
  "S0051L01": {
    "lego": ["worried", "preocupado"],
    "whitelist": [...567 words...],
    "_metadata": {
      "recent_vocabulary": [
        "preocupo", "errores", "pienso", "importa", "sabes",
        "terminar", "rápidamente"
      ],
      "recent_window": "S0046-S0050"
    }
  }
}
```

**Pros**:
- ✅ Simple to implement (~30 lines of code)
- ✅ Explicit list of recent words
- ✅ Small data footprint

**Cons**:
- ❌ No context - just isolated words
- ❌ Doesn't show HOW words are used
- ❌ Doesn't reveal sentence patterns
- ❌ Doesn't show thematic progression
- ❌ Mechanical (list-based), not linguistic

---

### Approach B: Seed Sentences with LEGO Highlighting (Rich Context)

**What it provides**:
```json
{
  "S0051L01": {
    "lego": ["worried", "preocupado"],
    "whitelist": [...567 words...],
    "_metadata": {
      "recent_seeds": [
        {
          "seed_id": "S0046",
          "target": "Pero no me preocupo por hacer errores.",
          "known": "But I don't worry about making mistakes.",
          "new_legos": [
            {
              "target": "no me preocupo",
              "known": "I don't worry",
              "components": [["no", "not"], ["me", "myself"], ["preocupo", "I worry"]]
            },
            {
              "target": "por hacer errores",
              "known": "about making mistakes",
              "components": [["por", "about"], ["hacer", "making"], ["errores", "mistakes"]]
            }
          ]
        },
        {
          "seed_id": "S0047",
          "target": "Porque pienso que es una cosa buena hacer errores.",
          "known": "Because I think that it's a good thing to make mistakes.",
          "new_legos": [
            {
              "target": "pienso que",
              "known": "I think that",
              "components": [["pienso", "I think"], ["que", "that"]]
            },
            {
              "target": "es una cosa buena",
              "known": "it's a good thing",
              "components": [["es", "it is"], ["una", "a"], ["cosa", "thing"], ["buena", "good"]]
            },
            {
              "target": "hacer errores",
              "known": "to make mistakes"
            }
          ]
        },
        {
          "seed_id": "S0048",
          "target": "No me importa hacer errores.",
          "known": "I don't care about making mistakes.",
          "new_legos": [
            {
              "target": "no me importa",
              "known": "I don't care",
              "components": [["no", "not"], ["me", "to me"], ["importa", "it matters"]]
            }
          ]
        },
        {
          "seed_id": "S0049",
          "target": "Es así, si sabes lo que quiero decir.",
          "known": "It's like this, if you know what I mean.",
          "new_legos": [
            {
              "target": "es así",
              "known": "it's like this",
              "components": [["es", "it is"], ["así", "thus/like this"]]
            },
            {
              "target": "sabes",
              "known": "you know"
            }
          ]
        },
        {
          "seed_id": "S0050",
          "target": "No estoy intentando terminar lo más rápidamente posible.",
          "known": "I'm not trying to finish as quickly as possible.",
          "new_legos": [
            {
              "target": "no estoy intentando",
              "known": "I'm not trying",
              "components": [["no", "not"], ["estoy intentando", "I'm trying"]]
            },
            {
              "target": "terminar",
              "known": "to finish"
            },
            {
              "target": "lo más rápidamente posible",
              "known": "as quickly as possible",
              "components": [["lo más", "the most"], ["rápidamente", "quickly"], ["posible", "possible"]]
            }
          ]
        }
      ]
    }
  }
}
```

**Pros**:
- ✅ **Rich context** - See words in complete sentences
- ✅ **Pattern exposure** - See sentence structures, not just words
- ✅ **Natural imitation** - Can vary patterns like "No me [verb]" or "pienso que [clause]"
- ✅ **Thematic coherence** - Clear topic: making mistakes, not worrying, thinking
- ✅ **LEGO decomposition** - See how sentences are built from components
- ✅ **Linguistic over mechanical** - Encourages understanding, not word substitution

**Cons**:
- ⚠️ More verbose (~200-300 lines vs ~10 lines for vocabulary list)
- ⚠️ Slightly more complex to implement (~100 lines vs ~30 lines)

---

## 🔍 Analysis: Why Seed Sentences Are Better

### 1. Reveals Thematic Progression

**Seeds S0046-S0050 theme**: Making mistakes, not worrying, thinking it's good

**With vocabulary list**, agent sees:
```
Recent words: preocupo, errores, pienso, importa, sabes, terminar, rápidamente
```
→ No clear theme, just scattered words

**With seed sentences**, agent sees:
```
S0046: "But I don't worry about making mistakes"
S0047: "Because I think that it's a good thing to make mistakes"
S0048: "I don't care about making mistakes"
S0049: "It's like this, if you know what I mean"
S0050: "I'm not trying to finish as quickly as possible"
```
→ **Clear thematic arc**: attitude toward mistakes → not rushing

**Impact**: Phrases can naturally follow the theme
- "I don't worry about being worried"
- "I think that being worried is normal"
- "I don't care if I'm worried sometimes"

---

### 2. Exposes Sentence Patterns

**Vocabulary list doesn't show**:
- How "preocupo" is used (with "no me")
- How "pienso" is used (with "que" + clause)
- How "importa" is used (with "no me", like gustar)

**Seed sentences show patterns explicitly**:
```
Pattern: "No me [verb]"
- S0046: "No me preocupo" (I don't worry)
- S0048: "No me importa" (I don't care)

Pattern: "[Verb] que [clause]"
- S0047: "pienso que es una cosa buena" (I think that it's a good thing)

Pattern: "lo más [adverb] posible"
- S0050: "lo más rápidamente posible" (as quickly as possible)
```

**Agent can then naturally vary**:
- "No me preocupa estar preocupado" (vary "no me [verb]")
- "Pienso que podría ser preocupante" (vary "[verb] que [clause]")
- "Lo más tranquilamente posible" (vary "lo más [adverb] posible")

---

### 3. Shows LEGO Composition

**Seed sentences with components** reveal structure:

```json
{
  "target": "pienso que",
  "known": "I think that",
  "components": [
    ["pienso", "I think"],
    ["que", "that"]
  ]
}
```

**Agent learns**:
- "pienso" alone = "I think"
- "que" is the connector
- Together = "I think that [clause]"

**Can then build**:
- "Pienso que estar preocupado es normal"
- "Creo que no me preocupo tanto" (vary with "creo" from older seed)

---

### 4. Aligns with v4.1 Philosophy

**v4.1 emphasizes** (from AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md):

> **This is NOT a coding task. This is a LINGUISTIC task.**
>
> You MUST:
> - Think through each phrase individually
> - Use extended thinking to reason about each LEGO
> - Understand the LEGO's grammatical role
> - Create natural, conversational usage

**Vocabulary lists** → Mechanical (just use these words)

**Seed sentences** → Linguistic (see how words work in natural sentences, vary those patterns)

**Better alignment with the core philosophy.**

---

## 💡 Implementation Design

### Data Flow

```
lego_pairs.json (Phase 3 output)
  ↓
extract 5 previous seeds for current seed
  ↓
filter to show only NEW LEGOs (not references)
  ↓
include: seed sentences, new LEGOs, components
  ↓
add to scaffold _metadata.recent_seeds
  ↓
Agent reads recent seeds, sees patterns, varies them
```

### Scaffold Script Modification

**Add to `create_basket_scaffolds.cjs`**:

```javascript
/**
 * Extract recent seeds context from lego_pairs.json
 * @param {object} legoPairs - lego_pairs.json data
 * @param {number} currentSeedNum - Current seed number
 * @param {number} windowSize - How many previous seeds (default 5)
 * @returns {array} - Recent seeds with NEW LEGOs highlighted
 */
function extractRecentSeedsContext(legoPairs, currentSeedNum, windowSize = 5) {
  const recentSeeds = [];
  const startSeed = Math.max(1, currentSeedNum - windowSize);
  const endSeed = currentSeedNum - 1;

  for (const seedData of legoPairs.seeds) {
    const seedNum = extractSeedNum(seedData.seed_id);

    if (seedNum >= startSeed && seedNum <= endSeed) {
      // Extract only NEW LEGOs (not references)
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
// Load lego_pairs.json
const legoPairsPath = path.join(
  path.dirname(seedsPath),
  '..',
  '..',
  'public',
  'vfs',
  'courses',
  'spa_for_eng',
  'lego_pairs.json'
);
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// For each LEGO:
const recentSeeds = extractRecentSeedsContext(legoPairs, seedNum, 5);

scaffold.seeds[seedId].legos[legoId]._metadata.recent_seeds = recentSeeds;
```

**Complexity**: ~100 lines of code (medium)

---

### Prompt Enhancement

**Add to v4.1 prompt**:

```markdown
#### Recency Priority ⭐ IMPORTANT

**Goal**: Create a rolling window of fresh vocabulary and patterns.

**Your scaffold includes `recent_seeds`** - the 5 previous seed sentences with NEW LEGOs highlighted.

**How to use recent seeds**:

1. **Read the recent seed sentences**
   - See the complete sentences in context
   - Notice the themes and topics
   - Observe the sentence patterns

2. **Identify patterns you can vary**
   - "No me [verb]" structure
   - "[Verb] que [clause]" structure
   - "lo más [adverb] posible" structure
   - Other patterns you notice

3. **Build phrases that echo recent patterns**
   - Use similar structures with your current LEGO
   - Vary the vocabulary while keeping the pattern
   - Create thematic continuity with recent seeds

4. **Target**: 6-8 out of 10 phrases should use recent vocabulary or patterns

**Example**:

You're generating for LEGO "worried" / "preocupado" (S0051).

Recent seeds show:
- S0046: "No me preocupo..." (I don't worry)
- S0047: "pienso que es una cosa buena..." (I think that it's a good thing)
- S0048: "No me importa..." (I don't care)

✅ **Natural variations using recent patterns**:
- "No me preocupa" (varies "No me [verb]" from S0046/S0048)
- "Pienso que estar preocupado es normal" (varies "pienso que" from S0047)
- "Estoy preocupado por hacer errores" (uses "errores" from S0046-S0048)

**Why this matters**:
- Creates thematic continuity (seeds feel connected)
- Reinforces recent patterns through natural variation
- Ensures pattern diversity (rolling window of structures)
- Better learning (spaced repetition of recent content)
```

**Complexity**: ~40 lines added to prompt

---

## 📈 Comparison Table

| Aspect | Vocabulary Lists | Seed Sentences with LEGOs |
|--------|------------------|---------------------------|
| **Implementation** | 🟢 Simple (~30 lines) | 🟡 Medium (~100 lines) |
| **Data size** | 🟢 Small (~10 lines JSON) | 🟡 Medium (~200-300 lines JSON) |
| **Context provided** | ❌ None (just words) | ✅✅ Rich (sentences + structure) |
| **Pattern exposure** | ❌ No | ✅✅ Yes (explicit patterns) |
| **Thematic coherence** | ❌ No | ✅✅ Yes (topic progression) |
| **Natural variation** | ⚠️ Hard (no examples) | ✅✅ Easy (see patterns to vary) |
| **Linguistic reasoning** | ⚠️ Mechanical | ✅✅ Linguistic |
| **v4.1 alignment** | ⚠️ Weak | ✅✅ Strong |
| **Learning value** | ⚠️ Low (list-based) | ✅✅ High (contextual) |
| **Prompt enhancement** | 🟢 Minimal | 🟡 Moderate |

**Winner**: ✅ **Seed Sentences with LEGOs** (despite slightly higher complexity)

---

## 🎯 Recommendation

### Use Approach B: Seed Sentences with LEGO Highlighting

**Rationale**:

1. **Aligns with v4.1 philosophy** - Linguistic reasoning over mechanical generation
2. **Richer information** - See HOW words are used, not just WHICH words
3. **Natural variation** - Can vary patterns from recent seeds
4. **Thematic coherence** - See topic progression explicitly
5. **Better learning** - Context aids retention and understanding

**Trade-offs accepted**:
- ⚠️ ~70 more lines of code than vocabulary list approach
- ⚠️ ~200-300 lines of JSON vs ~10 lines
- **BUT**: Much higher pedagogical and quality value

---

## 💡 What to Highlight in Seed Sentences

### Option 1: NEW LEGOs Only (Recommended)

**Show**:
- Seed sentence (target + known)
- Only NEW LEGOs introduced in that seed
- Components for molecular LEGOs

**Why**:
- ✅ Focus on what's fresh
- ✅ Reduces verbosity (don't show referenced LEGOs)
- ✅ Clear what's new vocabulary

**Example**:
```json
{
  "seed_id": "S0047",
  "target": "Porque pienso que es una cosa buena hacer errores.",
  "known": "Because I think that it's a good thing to make mistakes.",
  "new_legos": [
    {"target": "pienso que", "known": "I think that", ...},
    {"target": "es una cosa buena", "known": "it's a good thing", ...},
    {"target": "hacer errores", "known": "to make mistakes", ...}
  ]
  // ❌ Doesn't show "porque" (referenced from S0022)
}
```

---

### Option 2: All LEGOs with New/Ref Markers

**Show**:
- Seed sentence
- ALL LEGOs (new + referenced)
- Mark which are new vs referenced

**Why**:
- ✅ Complete reconstruction visible
- ✅ See how LEGOs combine
- ⚠️ More verbose
- ⚠️ Mixes old and new (less focus)

**Example**:
```json
{
  "seed_id": "S0047",
  "target": "Porque pienso que es una cosa buena hacer errores.",
  "known": "Because I think that it's a good thing to make mistakes.",
  "legos": [
    {"target": "porque", "known": "because", "new": false, "ref": "S0022"},
    {"target": "pienso que", "known": "I think that", "new": true},
    {"target": "es una cosa buena", "known": "it's a good thing", "new": true},
    {"target": "hacer errores", "known": "to make mistakes", "new": true}
  ]
}
```

---

### Recommendation: **Option 1 (NEW LEGOs Only)**

**Why**:
- Agent already has the whitelist (includes all old words)
- Focus should be on what's FRESH (new vocabulary/patterns)
- Reduces JSON size significantly
- Clearer signal: "these are the recent additions"

---

## 🧪 Example: What Agent Would See

### Current LEGO: "worried" / "preocupado" (S0051)

**Scaffold metadata would include**:

```json
{
  "_metadata": {
    "spanish_words": ["preocupado"],
    "whitelist_size": 145,
    "seed_context": {
      "target": "Estoy un poco preocupado.",
      "known": "I'm a bit worried."
    },
    "recent_seeds": [
      {
        "seed_id": "S0046",
        "target": "Pero no me preocupo por hacer errores.",
        "known": "But I don't worry about making mistakes.",
        "new_legos": [
          {
            "target": "no me preocupo",
            "known": "I don't worry",
            "components": [["no", "not"], ["me", "myself"], ["preocupo", "I worry"]]
          },
          {
            "target": "por hacer errores",
            "known": "about making mistakes",
            "components": [["por", "about"], ["hacer", "making"], ["errores", "mistakes"]]
          }
        ]
      },
      {
        "seed_id": "S0047",
        "target": "Porque pienso que es una cosa buena hacer errores.",
        "known": "Because I think that it's a good thing to make mistakes.",
        "new_legos": [
          {
            "target": "pienso que",
            "known": "I think that",
            "components": [["pienso", "I think"], ["que", "that"]]
          },
          {
            "target": "es una cosa buena",
            "known": "it's a good thing",
            "components": [["es", "it is"], ["una", "a"], ["cosa", "thing"], ["buena", "good"]]
          },
          {
            "target": "hacer errores",
            "known": "to make mistakes",
            "components": [["hacer", "to make"], ["errores", "mistakes"]]
          }
        ]
      },
      {
        "seed_id": "S0048",
        "target": "No me importa hacer errores.",
        "known": "I don't care about making mistakes.",
        "new_legos": [
          {
            "target": "no me importa",
            "known": "I don't care",
            "components": [["no", "not"], ["me", "to me"], ["importa", "it matters"]]
          }
        ]
      },
      {
        "seed_id": "S0049",
        "target": "Es así, si sabes lo que quiero decir.",
        "known": "It's like this, if you know what I mean.",
        "new_legos": [
          {
            "target": "es así",
            "known": "it's like this",
            "components": [["es", "it is"], ["así", "thus/like this"]]
          },
          {
            "target": "sabes",
            "known": "you know"
          }
        ]
      },
      {
        "seed_id": "S0050",
        "target": "No estoy intentando terminar lo más rápidamente posible.",
        "known": "I'm not trying to finish as quickly as possible.",
        "new_legos": [
          {
            "target": "no estoy intentando",
            "known": "I'm not trying",
            "components": [["no", "not"], ["estoy intentando", "I'm trying"]]
          },
          {
            "target": "terminar",
            "known": "to finish"
          },
          {
            "target": "lo más rápidamente posible",
            "known": "as quickly as possible",
            "components": [["lo más", "the most"], ["rápidamente", "quickly"], ["posible", "possible"]]
          }
        ]
      }
    ]
  }
}
```

---

### Agent's Thinking Process

```
<thinking>
Current LEGO: "worried" / "preocupado"

Looking at recent seeds:
- Theme: Making mistakes, not worrying, thinking it's good
- Clear topic progression toward accepting imperfection

Patterns I notice:
1. "No me [verb]" structure (S0046: "no me preocupo", S0048: "no me importa")
2. "pienso que" + clause (S0047)
3. "hacer errores" appears 3 times (S0046, S0047, S0048)
4. "es [article] cosa [adjective]" (S0047: "es una cosa buena")

Interesting connection: "preocupo" in S0046 shares root with my LEGO "preocupado"!
- "preocupo" = I worry (verb)
- "preocupado" = worried (adjective)

I should build phrases that echo these recent patterns:

1. Bare: "preocupado"
2. Simple: "un poco preocupado"
3. Pattern echo: "Estoy preocupado" (echoes "Estoy intentando" from S0050)
4. Recent vocab: "Estoy preocupado por hacer errores" (uses "hacer errores" from S0046-S0048)
5. Pattern variation: "No me preocupa" (varies "No me preocupo" from S0046)
6. Pattern variation: "Pienso que estar preocupado es normal" (varies "pienso que" from S0047)
7. Thematic: "No me importa estar un poco preocupado" (uses "No me importa" from S0048)
8. Complex: "Creo que es una cosa normal estar preocupado" (varies "es una cosa [adj]" from S0047)
9. Context: "Estoy preocupado, pero no me preocupo por eso" (combines patterns)
10. Seed: "Estoy un poco preocupado." (final LEGO seed)

Result: 8 out of 10 phrases use recent vocabulary or patterns ✅
Theme: Continuity with "accepting worry/mistakes" topic ✅
</thinking>
```

**Notice**: Agent naturally varies patterns it sees in recent seeds, creating thematic and structural coherence.

---

## 🏆 Expected Impact

### With Vocabulary Lists (Approach A)

**Agent behavior**:
- Scans list: "preocupo, errores, pienso, importa, sabes, terminar, rápidamente"
- Mechanically inserts words into generic patterns
- **No contextual understanding**
- Phrases feel disconnected from recent seeds

**Example phrases**:
- "Estoy preocupado" ✅
- "Quiero estar preocupado" (uses "quiero" from S0001, ignores recent context)
- "Voy a estar preocupado" (uses "voy a" from S0005, ignores recent context)

**Recency compliance**: ~40-50% (some recent words used, but no pattern continuity)

---

### With Seed Sentences (Approach B)

**Agent behavior**:
- Reads seed sentences, sees patterns
- Notices theme (making mistakes, not worrying)
- Varies patterns naturally ("No me [verb]", "pienso que")
- **Contextual understanding drives generation**
- Phrases feel thematically connected

**Example phrases**:
- "Estoy preocupado por hacer errores" (echoes "hacer errores" theme)
- "No me preocupa tanto" (varies "No me preocupo" pattern)
- "Pienso que estar preocupado es normal" (varies "pienso que es [cosa] [adj]")

**Recency compliance**: ~70-80% (high vocabulary + pattern usage, thematic coherence)

**Quality improvement**: ⬆️ +0.5 to +1.0 (from 4.5/5 to 5.0/5)

---

## 📋 Implementation Checklist

### Phase 1: Scaffold Enhancement

- [ ] Add `extractRecentSeedsContext()` function to `create_basket_scaffolds.cjs`
- [ ] Load `lego_pairs.json` in scaffold generator
- [ ] Extract 5 previous seeds per current seed
- [ ] Filter to NEW LEGOs only
- [ ] Add `recent_seeds` to `_metadata` in scaffold output
- [ ] Test: Generate scaffold for S0051, verify recent_seeds S0046-S0050 present

**Estimated effort**: ~100 lines of code, 2-3 hours

---

### Phase 2: Prompt Enhancement

- [ ] Expand "Recency Priority" section in v4.1 prompt (~40 lines)
- [ ] Add "How to use recent_seeds" guidance
- [ ] Include example showing pattern variation from recent seeds
- [ ] Emphasize thematic coherence benefit
- [ ] Position recency as IMPORTANT (⭐), not just "special rule"

**Estimated effort**: ~40 lines of docs, 1 hour

---

### Phase 3: Testing

- [ ] Generate phrases for 6 LEGOs using enhanced scaffold
- [ ] Analyze: % phrases using recent vocabulary
- [ ] Analyze: % phrases echoing recent patterns
- [ ] Analyze: Thematic coherence across LEGOs
- [ ] Compare to baseline (current v4.1 without recency)

**Estimated effort**: 1-2 hours testing

---

### Phase 4: Validation (Optional)

- [ ] Add `checkRecencyUsage()` to `validate_agent_baskets.cjs`
- [ ] Report % phrases using recent vocabulary
- [ ] Report % phrases echoing recent patterns
- [ ] Set target: 60% vocabulary, 40% patterns
- [ ] Warning (not error) if below target

**Estimated effort**: ~60 lines of code, 2 hours

---

## 🎯 Final Recommendation

### Use Seed Sentences with LEGO Highlighting

**Implementation**:
1. ✅ Modify `create_basket_scaffolds.cjs` to extract recent seeds from `lego_pairs.json`
2. ✅ Include in `_metadata.recent_seeds` (NEW LEGOs only, with components)
3. ✅ Expand v4.1 prompt recency section with guidance on using recent_seeds
4. ✅ Emphasize pattern variation and thematic coherence
5. ⚠️ Optional: Add validation for recency compliance

**Total effort**: ~200 lines of code + 40 lines of docs = ~6-8 hours

**Expected benefit**:
- ⬆️ Quality: +0.5 to +1.0 (4.5 → 5.0)
- ⬆️ Pattern diversity: +5-15% (62.8% → 70-80%)
- ⬆️ Thematic coherence: Significant improvement
- ⬆️ Recency compliance: ~40% → ~70-80%

**Why it's worth it**:
- ✅ Aligns perfectly with v4.1 linguistic reasoning philosophy
- ✅ Much richer pedagogical value
- ✅ Creates rolling window of topics/patterns (user's insight)
- ✅ Natural variation from context, not mechanical substitution
- ✅ Better learning outcomes for end users

---

**Analysis completed**: 2025-11-08
**Recommendation**: Seed sentences with LEGO highlighting (Approach B)
**Implementation complexity**: Medium (~6-8 hours)
**Expected value**: High (quality +0.5-1.0, coherence improvement)
**Alignment with v4.1**: Excellent (linguistic over mechanical)
