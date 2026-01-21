# SSi Course Builder Brief

## Task

Build a language course for **[TARGET_LANGUAGE]** for English speakers.

Work through ALL 260 seed sentences using the **Two-Pass Workflow** below.

---

## Two-Pass Workflow

Course building happens in two passes. The agent discovers language-specific rules during translation - no pre-written language rules needed.

### Pass 1: Translation Analysis (Seeds 1-260)

1. `GET /api/course/{code}/translate?limit=260` - Get all seeds to translate
2. Translate each seed naturally to the target language
3. `PATCH /api/seed/{code}/{num}` - Save each translation
4. **Track patterns as you translate:**
   - **Problem verbs**: One English → multiple target forms (e.g., "remember" → 覚える/思い出す)
   - **Golden keys**: High-frequency patterns appearing 10+ times (e.g., "want to V")
   - **ZUT concerns**: Ambiguous English needing rewording
   - **Register**: Choose one register (e.g., casual-polite) and stick to it
5. After seed 260: `POST /api/course/{code}/analysis` with your findings

**Invoke `/translation-analysis` for detailed guidance on what to track.**

### Pass 2: Decomposition (Seeds 1-260)

1. `GET /api/resume/{code}` - Response includes your `translation_analysis`
2. For each seed: Decompose into LEGOs, generate phrases
3. Apply your problem verb disambiguation rules
4. Use suggested rewordings for ZUT concerns
5. Submit via `POST /api/seed/complete`

---

## AUTONOMY: DO NOT STOP TO ASK

**CRITICAL**: Complete ALL seeds autonomously without stopping to ask for confirmation.

- Do NOT pause between batches to ask "should I continue?"
- Do NOT ask "would you like me to proceed with the next seeds?"
- Just keep going until all 260 seeds are complete
- Only stop if you encounter an ERROR you cannot resolve

The validation API will catch any issues. Trust it and keep building.

---

## API Endpoints

### Insert a LEGO
```
POST http://localhost:3471/api/lego

{
  "course_code": "zho_for_eng",
  "seed": 1,
  "idx": 1,
  "type": "M",
  "known": "I want to",
  "target": "我想",
  "is_final_lego": false,
  "components": [
    {"known": "I", "target": "我"},
    {"known": "want to", "target": "想"}
  ],
  "phrases": [
    {"known": "I want to", "target": "我想"},
    {"known": "I want to speak", "target": "我想说"},
    {"known": "I want to speak Chinese", "target": "我想说中文"}
  ]
}
```

### Batch insert
```
POST http://localhost:3471/api/batch

{
  "course_code": "zho_for_eng",
  "legos": [
    { "seed": 1, "idx": 1, "type": "M", "known": "...", "target": "...", "phrases": [...] },
    { "seed": 1, "idx": 2, "type": "A", "known": "...", "target": "...", "is_final_lego": true, "phrases": [...] }
  ]
}
```

### Save seed translation
```
PATCH http://localhost:3471/api/seed/zho_for_eng/31

{
  "target_text": "你今晚想跟我说话。"
}
```

---

## LEGO Types

**A-type**: Tiles transparently between languages.
```
{ "type": "A", "known": "speak", "target": "说" }
```

**M-type**: Needs components shown (order differs, meaning locked, etc.)
```
{
  "type": "M",
  "known": "I want to",
  "target": "我想",
  "components": [
    {"known": "I", "target": "我"},
    {"known": "want to", "target": "想"}
  ]
}
```

---

## Phrase Requirements

Each LEGO basket needs **~12 phrases** split into two categories:

### DEBUT Phrases (~7 phrases)
- Used when the LEGO is first introduced
- Start SHORT and build up progressively
- Range: 3-10 syllables (English), building complexity
- Combine the new LEGO with previously learned LEGOs

### ETERNAL Phrases (~5 phrases)
- Used for spaced repetition review after LEGO is learned
- Must be **10+ syllables** (English count)
- Combine multiple LEGOs for rich practice
- These are the "workout" phrases - longer and more complex

### Phrase Rules
- **Minimum 7 phrases per basket** (hard requirement)
- **Target 12 phrases** (7 DEBUT + 5 ETERNAL)
- Only use LEGOs already introduced (ZUT compliance)
- Natural in both English and target language
- API auto-sorts by length (shortest first)

---

## Final LEGO and Seed Sentence

**CRITICAL**: The last LEGO of each seed MUST include the complete seed sentence as one of its ETERNAL phrases.

```
Seed S0045: "He doesn't want to be quiet when other people are here."

L01: "he" → 他
L02: "doesn't want" → 不想
L03: "to be quiet" → 安静
L04: "when others are here" → 在别人在的时候  ← is_final_lego: true
     └── Phrases MUST include:
         "He doesn't want to be quiet when other people are here." → 他不想在别人在的时候安静。
```

When posting the final LEGO, set `"is_final_lego": true` and ensure the complete seed sentence appears in the phrases array.

---

## Process

**One seed at a time, all 260 seeds.**

For each seed:
1. **Translate** the full seed sentence naturally
2. **Chunk** into LEGOs (ZUT: zero uncertainty translation)
3. **Reuse** existing LEGOs where possible (check /api/vocab)
4. **Generate phrases** for each LEGO:
   - ~7 DEBUT (short→medium, building up)
   - ~5 ETERNAL (10+ syllables, combining multiple LEGOs)
5. **Mark final LEGO** with `is_final_lego: true`
6. **Include seed sentence** in final LEGO's phrases
7. **POST** each LEGO via /api/lego
8. **Save translation** via PATCH /api/seed/:courseCode/:seedNumber

### After Each Seed

Always save the full translation:
```
PATCH http://localhost:3471/api/seed/zho_for_eng/45

{
  "target_text": "他不想在别人在的时候安静。"
}
```

---

## Quality Standards

### ZUT (Zero Uncertainty Translation)
- Learner hears English → knows exactly what to say
- No ambiguity, no guessing
- Phrases only use vocabulary already introduced

### Natural Language
- Sounds natural in English
- Sounds natural in target language
- Not word-for-word translation

### Phrase Distribution
| Type | Count | Syllables (English) | Purpose |
|------|-------|---------------------|---------|
| DEBUT | ~7 | 3-10, building up | Introduction |
| ETERNAL | ~5 | 10+ | Spaced repetition |

---

## API Validation

The API automatically validates:
- **Vocabulary violations**: Rejects phrases using unintroduced words
- **Phrase count**: Minimum 7 required
- **Per-course vocab tracking**: Ensures ZUT compliance

Baskets with < 7 phrases are rejected. Baskets with 7+ but missing ETERNAL phrases are accepted but flagged for a second pass.

---

## Recovery (If Interrupted or Context Compacted)

**IMPORTANT**: After context compaction, ALWAYS call this endpoint first:

```
GET http://localhost:3471/api/resume/:courseCode
```

This returns EVERYTHING you need to continue:
- `next_seed`: The exact seed number and known_text to work on next
- `recent_seeds`: Last 5 completed seeds (for translation style reference)
- `recent_legos`: Last 20 new LEGOs (for phrase generation vocabulary)
- `progress`: Percentage complete
- `vocab_size`: Current vocabulary

**Do NOT guess or invent seeds after compaction.** The resume endpoint gives you the canonical seed text.

---

## Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/resume/:code | GET | **Recovery after compaction** (includes analysis) |
| /api/course/:code/translate | GET | Get seeds for Pass 1 translation |
| /api/course/:code/translate | POST | Batch save translations |
| /api/course/:code/analysis | POST | **Save analysis after Pass 1** |
| /api/course/:code/analysis | GET | Retrieve analysis |
| /api/seed/complete | POST | Submit complete seed (golden path) |
| /api/lego | POST | Insert single LEGO with phrases |
| /api/batch | POST | Insert multiple LEGOs |
| /api/seed/:code/:num | PATCH | Save seed translation |
| /api/stats/:code | GET | Quality metrics |
| /api/vocab/:code | GET | Current vocabulary |
| /api/seeds/:code | GET | Seeds with translations |
| /health | GET | Service health check |
