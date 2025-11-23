# AGENT PROMPT: Phase 3 LEGO Extraction + Introduction Generation (v7.1)

**Version**: 7.1 - Includes Phase 6 Integration (2025-11-20)
**Status**: ✅ Active - Phase 6 introduction generation integrated
**Purpose**: Extract pedagogically-sound LEGO vocabulary units from translated seed pairs, then generate introduction presentations
**Outputs**: `lego_pairs.json` AND `introductions.json`

---

## 🎯 TWO CORE HEURISTICS

### 1. Remove Learner Uncertainty
When learner hears KNOWN phrase → ZERO uncertainty about TARGET phrase

### 2. Maximize Patterns with Minimum Vocab
Create overlapping chunks → each LEGO generates multiple sentence patterns

**All extraction strategies serve these two goals.**

---

## 📚 LEARNING BY EXAMPLE

Three examples show everything you need to know.

---

### Example 1: Word Order Differences (English→Spanish)

**SEED**: "I enjoy doing interesting things with my friends"
**TARGET**: "Disfruto hacer cosas interesantes con mis amigos"

**First attempt (BAD - too granular)**:
```
disfruto = I enjoy
hacer = doing
cosas = things
interesantes = interesting ❌ FD FAILS
con = with ❌ FD FAILS
mis = my ❌ FD FAILS
amigos = friends
```

**Why does "interesantes" = "interesting" fail FD?**
When English learner hears "interesting", what do they say?
- Could be: "interesante" (singular)
- Could be: "interesantes" (plural)
- Uncertainty! ❌

**Why does "con" = "with" fail FD?**
Can learner generate 5+ meaningful practice phrases with "con" alone? No.
- "con" needs a noun to be useful
- Standalone particle = pedagogically weak

**Better extraction (chunked UP)**:
```json
{
  "legos": [
    {
      "type": "M",
      "lego": {"known": "I enjoy doing", "target": "disfruto hacer"},
      "components": [
        {"known": "I enjoy", "target": "disfruto"},
        {"known": "doing/to do", "target": "hacer"}
      ]
    },
    {
      "type": "M",
      "lego": {"known": "interesting things", "target": "cosas interesantes"},
      "components": [
        {"known": "things", "target": "cosas"},
        {"known": "interesting", "target": "interesantes"}
      ]
    },
    {
      "type": "M",
      "lego": {"known": "with my friends", "target": "con mis amigos"},
      "components": [
        {"known": "with", "target": "con"},
        {"known": "my", "target": "mis"},
        {"known": "friends", "target": "amigos"}
      ]
    }
  ]
}
```

**What we learned**:
- Word order differs (interesting things ≠ cosas interesantes) → M-type shows pattern
- Standalone particles (con, mis) need context → chunk UP
- Overlaps not needed here - these 3 chunks tile perfectly

---

### Example 2: Maximize Patterns with Overlapping Chains

**SEED**: "The news took several hours to reach everyone in the office"
**TARGET**: "Las noticias tardaron varias horas en llegar a todos en la oficina"

**Learner uncertainty analysis (from KNOWN perspective)**:
```
KNOWN phrase          → Learner thinks... → FD passes?
"the news"            → "las noticias"     → ✅ YES
"took"                → tardaron? tomó?    → ❌ NO (multiple options)
"several hours"       → "varias horas"     → ✅ YES
"to reach"            → llegar? alcanzar?  → ❌ NO (verb choice ambiguous)
"everyone"            → todos? todas?      → ❌ NO (gender ambiguous)
"in"                  → "en"               → ✅ YES (but pedagogically weak alone)
"the office"          → "la oficina"       → ✅ YES
```

**Extraction with overlaps (for recombination power)**:
```json
{
  "legos": [
    {
      "type": "M",
      "lego": {"known": "the news took", "target": "las noticias tardaron"},
      "components": [
        {"known": "the", "target": "las"},
        {"known": "news", "target": "noticias"},
        {"known": "took/delayed", "target": "tardaron"}
      ]
    },
    {
      "type": "M",
      "lego": {"known": "took several hours", "target": "tardaron varias horas"},
      "components": [
        {"known": "took", "target": "tardaron"},
        {"known": "several/various", "target": "varias"},
        {"known": "hours", "target": "horas"}
      ]
    },
    {
      "type": "A",
      "lego": {"known": "several hours", "target": "varias horas"}
    },
    {
      "type": "M",
      "lego": {"known": "several hours to reach everyone", "target": "varias horas en llegar a todos"},
      "components": [
        {"known": "several", "target": "varias"},
        {"known": "hours", "target": "horas"},
        {"known": "in", "target": "en"},
        {"known": "to arrive/reach", "target": "llegar"},
        {"known": "to", "target": "a"},
        {"known": "everyone/all", "target": "todos"}
      ]
    },
    {
      "type": "M",
      "lego": {"known": "to reach everyone", "target": "en llegar a todos"},
      "components": [
        {"known": "in", "target": "en"},
        {"known": "to arrive", "target": "llegar"},
        {"known": "to", "target": "a"},
        {"known": "everyone", "target": "todos"}
      ]
    },
    {
      "type": "M",
      "lego": {"known": "in the office", "target": "en la oficina"},
      "components": [
        {"known": "in", "target": "en"},
        {"known": "the", "target": "la"},
        {"known": "office", "target": "oficina"}
      ]
    }
  ]
}
```

**Spanish overlapping chains** (Heuristic 2: maximize patterns):
- "las noticias tardaron" + "tardaron varias horas" share "tardaron"
- "varias horas en llegar a todos" + "en llegar a todos" share ending
- **6 LEGOs → dozens of recombination patterns**

**Chinese overlapping chains** (same principle):

**SEED**: "how to say something in Chinese" = "怎么用中文说什么"
```json
{
  "legos": [
    {"known": "say something", "target": "说什么"},
    {"known": "say something in Chinese", "target": "用中文说什么"},
    {"known": "say in Chinese", "target": "用中文说"},
    {"known": "how to say in Chinese", "target": "怎么用中文说"}
  ]
}
```

**Generative power**: 4 overlapping LEGOs → dozens of practice sentences
- **说什么** → 你说什么? 我要说什么?
- **用中文说什么** → 用英文说什么, 用西班牙语说什么
- **怎么用中文说** → 怎么用中文说 + [any word]

**What we learned**:
- **Heuristic 1**: "took" alone = uncertainty → needs "the news took"
- **Heuristic 2**: Overlaps multiply patterns → "tardaron" appears in 2 LEGOs
- **Particles wrapped**: "en", "a", "用" never standalone
- **Language-agnostic**: Same principle works Spanish/Chinese/any pair

---

### Example 3: Backward Sweep Catches Grammatical Triggers (English→Spanish)

**SEED**: "We're friends, and after we finish I'd like to relax"
**TARGET**: "Somos amigos, y después de que terminemos me gustaría relajarme"

**Forward sweep (KNOWN → TARGET)** misses subjunctive trigger:
```
We're     → somos? estamos? ❌ ambiguous (Heuristic 1: uncertainty)
after     → después ❌ needs construction
we finish → terminemos ❌ subjunctive needs trigger!
```

**Backward sweep (TARGET → KNOWN)** catches it:
```
Reading right-to-left from "terminemos":
- "terminemos" alone = ❌ ambiguous (terminamos? terminemos?)
- "que terminemos" = ❌ still needs trigger
- "de que terminemos" = ❌ still needs trigger
- "después de que terminemos" = ✅ NOW FD passes!
```

**Extraction**:
```json
{
  "legos": [
    {"known": "we're friends", "target": "somos amigos"},
    {"known": "and", "target": "y"},
    {"known": "after we finish", "target": "después de que terminemos"},
    {"known": "I'd like", "target": "me gustaría"},
    {"known": "to relax", "target": "relajarme"}
  ]
}
```

**What we learned**:
- **Forward sweep** (left-to-right in KNOWN): semantic chunks
- **Backward sweep** (right-to-left in TARGET): grammatical patterns
- **Both sweeps required** to satisfy Heuristic 1 (remove uncertainty)
- **Subjunctive triggers** must stay together

---

## 🧭 EXTRACTION METHODOLOGY

Apply the two heuristics through four steps:

### Step 1: Forward Sweep (KNOWN → TARGET)

Start from KNOWN language, left to right:
- Begin with smallest chunk
- Extend until passes **Heuristic 1** (zero uncertainty)
- LOCK as LEGO
- Create overlaps to satisfy **Heuristic 2** (maximize patterns)

### Step 2: Backward Sweep (TARGET → KNOWN)

Process TARGET language, right to left:
- Catches grammatical triggers (Example 3: subjunctive)
- Catches target-language particles
- Creates overlapping LEGOs satisfying both heuristics

### Step 3: Add Components to M-types

Every multi-word LEGO gets components array (word-by-word literal mapping).

### Step 4: Validate

- ✅ **Heuristic 1**: No standalone pronouns/articles/particles, zero uncertainty
- ✅ **Heuristic 2**: Overlaps created where pedagogically valuable
- ✅ All M-types have components

If fails → merge with adjacent LEGO

---

## 📋 A-TYPE vs M-TYPE

**A-type**: Single semantic unit, no components needed
- Examples: "ahora"/"now", "español"/"Spanish"

**M-type**: Multi-word unit with components array
- Use when: FD requires it OR teaches pattern OR pedagogically valuable
- Examples: "cosas interesantes"/"interesting things", "vas a ayudarme"/"you're going to help me"

**When in doubt**: M-type with components (shows structure, enables overlaps)

---

## ✅ QUICK VALIDATION

Before submitting:
- ✅ No standalone pronouns/articles/particles
- ✅ Each LEGO passes learner uncertainty test
- ✅ All M-types have components array
- ✅ Both sweeps completed (forward in KNOWN, backward in TARGET)
- ✅ All words accounted for
- ✅ Valid JSON, all LEGOs marked `new: true`

---

## 📤 OUTPUT FORMAT

```json
{
  "version": "7.0",
  "seeds": [
    {
      "seed_id": "S0051",
      "seed_pair": {
        "known": "I enjoy doing interesting things with my friends",
        "target": "Disfruto hacer cosas interesantes con mis amigos"
      },
      "legos": [
        {
          "id": "S0051L01",
          "type": "M",
          "new": true,
          "lego": {"known": "I enjoy doing", "target": "disfruto hacer"},
          "components": [
            {"known": "I enjoy", "target": "disfruto"},
            {"known": "doing/to do", "target": "hacer"}
          ]
        },
        {
          "id": "S0051L02",
          "type": "M",
          "new": true,
          "lego": {"known": "interesting things", "target": "cosas interesantes"},
          "components": [
            {"known": "things", "target": "cosas"},
            {"known": "interesting", "target": "interesantes"}
          ]
        },
        {
          "id": "S0051L03",
          "type": "M",
          "new": true,
          "lego": {"known": "with my friends", "target": "con mis amigos"},
          "components": [
            {"known": "with", "target": "con"},
            {"known": "my", "target": "mis"},
            {"known": "friends", "target": "amigos"}
          ]
        }
      ]
    }
  ]
}
```

**Required fields**:
- `id`: LEGO ID (format: S####L##)
- `type`: "A" or "M"
- `target`: Target language phrase
- `known`: Known language phrase
- `new`: true (deduplication happens in Phase 3.5)
- `components`: [[target, known], ...] for M-types only (literal translations)

---

## 🔄 USE EXTENDED THINKING

For EVERY seed, use `<thinking>` tags to show your work:

```xml
<thinking>
SEED: "Las noticias tardaron varias horas en llegar a todos en la oficina"
KNOWN: "The news took several hours to reach everyone in the office"

FORWARD SWEEP (KNOWN → TARGET):
- "the news" → "las noticias" ✅ FD passes → LOCK
- "took" → "tardaron" ❌ FD fails (multiple verbs possible)
- "the news took" → "las noticias tardaron" ✅ FD passes → LOCK as M-type

- "several hours" → "varias horas" ✅ FD passes → LOCK as A-type
  But also useful in context...
- "took several hours" → "tardaron varias horas" ✅ overlap → LOCK as M-type

- "to reach everyone" → "en llegar a todos" ✅ passes → LOCK as M-type
- "in the office" → "en la oficina" ✅ passes → LOCK as M-type

BACKWARD SWEEP (TARGET → KNOWN):
- Reading right-to-left from "oficina"
- "oficina" → covered
- "la oficina" → covered
- "en la oficina" → already extracted
- Continue backward... all covered

OVERLAPS CREATED:
- "las noticias tardaron" + "tardaron varias horas" share "tardaron"
- Pedagogically valuable: shows "tardaron" in multiple contexts

OUTPUT READY
</thinking>
```

---

## 📤 PHASE 3 OUTPUTS & PHASE 6 INTEGRATION

### Primary Output: lego_pairs.json

**Phase 3 LEGO extraction** creates the main output file containing all extracted LEGOs with their components and metadata.

**Format**: See examples above - each seed has an array of LEGOs with types (A/M), components, and FD validation.

### Secondary Output: introductions.json (Phase 6)

**After LEGO extraction completes**, Phase 3 automatically calls Phase 6 introduction generation to create natural language presentations for each LEGO.

**Execution model**:
1. Phase 3 extracts LEGOs → writes `lego_pairs.json`
2. Phase 3 calls `generateIntroductions(courseDir)` → writes `introductions.json`
3. Phase 3 notifies orchestrator of completion (<1s total overhead)

**Why integrated?**
- Introduction generation is fast (<1s) and deterministic
- No benefit to separate microservice
- Simpler pipeline: No parallel coordination needed

**Phase 6 methodology**: See `phase_6_introductions.md` for full details on how presentations are generated from LEGO data.

**Example outputs**:
```json
// lego_pairs.json (Phase 3)
{
  "S0001L01": {
    "type": "A",
    "lego": {"known": "I want", "target": "quiero"}
  }
}

// introductions.json (Phase 6, generated automatically)
{
  "S0001L01": "Now, the Spanish for 'I want' as in 'I want to speak Spanish with you now.' is 'quiero', quiero."
}
```

**For developers**: The Phase 3 server (`services/phases/phase3-lego-extraction-server.cjs`) calls the Phase 6 script automatically. Agents do not need to trigger Phase 6 separately.

---

## 🚨 COMMON MISTAKES

**❌ Splitting particles**: "con" alone → wrap in "con mis amigos"
**❌ Ignoring word order**: "cosas" + "interesantes" → use M-type "cosas interesantes"
**❌ Skipping backward sweep**: Miss subjunctive triggers like "después de que terminemos"
**❌ Forcing overlaps**: Don't create overlaps when perfect tiling exists (see Example 3)

---

## 📊 SUCCESS METRICS

**Target quality**:
- 0% FD violations (zero standalone pronouns/articles/particles)
- 30-60% atomic, 40-70% molecular (varies by language pair)
- All M-types justified (FD required OR pattern teaching OR pedagogical value)
- Both sweeps completed (forward in KNOWN, backward in TARGET)
- Overlaps created only when valuable

**Version History**:
- v7.1 (2025-11-20): **Phase 6 integration** - Introduction generation now runs automatically after LEGO extraction
- v7.0 (2025-11-13): Examples-first edition, language-agnostic, overlaps permitted
- v6.3 (2025-11-12): Pragmatic FD heuristic
- v6.2 (2025-11-12): FD validation & merge step
- v6.1 (2025-11-11): Maximum tiling set
- v6.0 (2025-11-11): Simplified M-LEGO rules

**Status**: ✅ Active (includes Phase 6 introduction generation)

---

## 🎓 REMEMBER THE TWO HEURISTICS

### Heuristic 1: Remove Learner Uncertainty
- No standalone pronouns, articles, particles
- When learner hears KNOWN → ZERO uncertainty about TARGET
- If uncertain → chunk UP with context

### Heuristic 2: Maximize Patterns with Minimum Vocab
- Create overlapping LEGOs when pedagogically valuable
- Each LEGO should generate multiple practice sentences
- "tardaron" in 2 LEGOs → more recombination power

**All strategies (forward sweep, backward sweep, overlaps, M-types) serve these two goals.**

Let the examples guide you.
