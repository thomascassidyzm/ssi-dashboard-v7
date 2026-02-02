# SSi Add Overlapping LEGOs

Workflow for adding overlapping M-LEGOs to handle word order differences between English and target languages.

## ⚠️ ZERO EXPLANATIONS - CRITICAL

**ALL text becomes TTS audio.** The known_text must be natural English - NO grammar labels, NO linguistic terms, NO parenthetical explanations.

**WRONG:** `"whether I can (verb-final)"` → `"ob ich kann"`
**RIGHT:** `"whether I can"` → `"ob ich kann"`

**WRONG:** `"not (negation wrap)"` → `"ne...pas"`
**RIGHT:** `"I don't want"` → `"je ne veux pas"`

---

## Core Principle: Overlapping LEGOs

When word order differs between English and target language, you need **BOTH atomic LEGOs AND chunk M-LEGOs**.

**Example (Spanish):**
- English: "blue thing" (adjective → noun)
- Spanish: "cosa azul" (noun → adjective)

**Solution:** Create three LEGOs:
1. A-LEGO: "blue" → "azul"
2. A-LEGO: "thing" → "cosa"
3. M-LEGO: "blue thing" → "cosa azul" [blue→azul, thing→cosa]

The M-LEGO captures the transformation when words combine.

---

## Workflow

### Step 1: Identify Word Order Differences

Look for sentences where simple word-by-word substitution produces wrong order:

| Pattern | English | Target | Example |
|---------|---------|--------|---------|
| Time placement | "I want now" | "now I want" | Chinese 我现在想 |
| Prep phrases | "speak with you" | "with you speak" | Chinese 跟你说 |
| Adjective order | "blue car" | "car blue" | Spanish coche azul |
| Negation | "don't want" | "ne...pas want" | French ne veux pas |
| Verb position | "that I can" | "that I...can" | German dass ich kann |

### Step 2: Check Available Vocabulary

Before creating phrases, query vocabulary at the target seed:

```bash
curl -s "http://localhost:3471/api/phrases/{course_code}?seed_min=1&seed_max=N&limit=5000"
```

Only use words that have been introduced.

### Step 3: Create the M-LEGO

**Required fields:**
- `course_code`: Course identifier
- `seed`: Seed number where pattern appears
- `idx`: Next available index
- `type`: "M"
- `known`: Natural English phrase (NO explanations!)
- `target`: Target language phrase
- `components`: Building blocks (real words only)
- `phrases`: BUILD + USE phrases

**Correct example:**
```json
{
  "course_code": "deu_for_eng",
  "seed": 10,
  "idx": 8,
  "type": "M",
  "known": "whether I can",
  "target": "ob ich kann",
  "components": [
    {"known": "whether", "target": "ob"},
    {"known": "I", "target": "ich"},
    {"known": "can", "target": "kann"}
  ],
  "phrases": [
    {"known": "whether", "target": "ob"},
    {"known": "whether I can", "target": "ob ich kann"},
    {"known": "whether I can come", "target": "ob ich kommen kann"},
    {"known": "I don't know whether I can help", "target": "ich weiß nicht ob ich helfen kann"},
    {"known": "she asks whether I can start", "target": "sie fragt ob ich anfangen kann", "score": 6},
    {"known": "tell me whether I can learn this", "target": "sag mir ob ich das lernen kann", "score": 7}
  ]
}
```

### Step 4: Phrase Count Rules

**Seeds 1-5:** At least 1 phrase, as many as meaningfully possible
**Seeds 6+:** Aim for 10-12 phrases (BUILD + USE, not counting components)

Components are auto-generated - don't count them toward your total.

---

## Pattern Examples by Language

### German
| English | German | Why M-LEGO needed |
|---------|--------|-------------------|
| whether I can | ob ich kann | Verb goes to end after "ob" |
| I want to speak | ich will sprechen | Infinitive goes to end |
| he comes back | er kommt zurück | Separable prefix splits |

### Chinese
| English | Chinese | Why M-LEGO needed |
|---------|---------|-------------------|
| speak now | 现在说 | Time before verb |
| speak with you | 跟你说 | Prep phrase before verb |
| speak well | 说得好 | Complement after verb with 得 |
| can you? | 你能不能 | V-not-V question pattern |

### French
| English | French | Why M-LEGO needed |
|---------|--------|-------------------|
| I don't want | je ne veux pas | Negation wraps verb |
| are you learning? | apprends-tu | Subject-verb inversion |
| a good thing | une bonne chose | BAGS adjective before noun |

### Spanish
| English | Spanish | Why M-LEGO needed |
|---------|---------|-------------------|
| blue car | coche azul | Adjective after noun |
| I see him | lo veo | Object pronoun before verb |

---

## API Submission

```bash
curl -X POST http://localhost:3471/api/lego \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Success:** `{"ok": true, "lego_id": "S0010L08", "is_new": true}`
**Vocabulary violation:** Phrase uses word not yet introduced - rewrite using available vocab
