# Translation Analysis - Two-Pass Workflow Guide

Use this skill during Pass 1 of course building. Pass 1 is pure translation - you translate ALL seeds while discovering language-specific patterns. Pass 2 uses what you learned to build LEGOs and phrases.

## Why Two Passes?

**The Problem:** Different target languages have unique pitfalls that only emerge after seeing many examples:
- English "remember" → Japanese has TWO verbs (覚える for retention, 思い出す for recall)
- English "I want to X" → Mandarin reverses word order for some constructions
- Some English seeds are ambiguous and need rewording

**The Solution:** Translate first, discover patterns, THEN decompose. No pre-written language rules needed - you discover everything during Pass 1.

---

## Pass 1: What to Track

### 1. Problem Verbs

> **📖 START FROM [`docs/language-mapping-index.md`](../../docs/language-mapping-index.md), not from a blank page.**
> Most of your "problem verbs" have already been hit and solved in another language. The index gives you the fix in one line per problem, the languages it bites in, **copy-pasteable English prompt wordings from shipped courses**, and the rejected approaches. Fill your Pass-1 `disambiguation_rule` fields from it, then add anything new back.

English verbs that map to MULTIPLE target language forms. Watch for:
- **Verbs of cognition**: remember, think, know, understand, learn
- **Verbs of perception**: see, hear, feel
- **Verbs of motion**: go, come, return
- **Verbs of giving/receiving**: give, get, receive

**Detection heuristic:** If you translate the same English verb differently in two seeds, it's a problem verb.

**Record:**
```json
{
  "english": "remember",
  "target_forms": [
    {"target": "覚える", "trigger": "remember for later, memorize, retain"},
    {"target": "思い出す", "trigger": "trying to recall, can't remember, bring to mind"}
  ],
  "disambiguation_rule": "'recall' = 思い出す, 'remember' = 覚える"
}
```

### 2. Golden Keys

High-frequency patterns that cover many seeds. These should be introduced early as M-LEGOs.

**Detection heuristic:** Count patterns as you translate. If "want to V" appears 10+ times, it's a golden key.

**Common golden keys:**
- want to + verb (ubiquitous across languages)
- going to / will (future intent)
- trying to + verb (attempt)
- need to + verb (necessity)
- like to / enjoy + verb-ing (preference)

**Record:**
```json
{
  "pattern": "want to V",
  "target_form": "V-stem + たい",
  "frequency": 58,
  "first_seed": 1,
  "note": "Covers 22% of all seeds - introduce EARLY"
}
```

### 3. ZUT Concerns

Seeds where the English is genuinely ambiguous. The learner would not know which target form to use.

**Detection heuristic:** If YOU hesitate about which target form to use, it's a ZUT concern.

**Examples:**
- "I don't remember what you said" - Is this "can't recall" or "didn't memorize"?
- "I saw her yesterday" - Did you visually observe or meet/encounter?
- "I feel like it's wrong" - Physical sensation or intuition?

**Record:**
```json
{
  "seed": 45,
  "original_english": "I don't remember what you said",
  "issue": "remember is ambiguous - retrieval or retention?",
  "suggested_reword": "I can't recall what you said"
}
```

### 4. Register Decision

Choose ONE register for the entire course. Record your choice and stick to it.

**Options by language:**
- **Japanese**: casual (だ/plain), casual-polite (です/ます), formal (keigo)
- **Korean**: 해요체 (standard polite), 합니다체 (formal)
- **Mandarin**: simplified vs traditional, 您/你 distinction
- **European languages**: formal (vous/Sie/usted) vs informal (tu/du/tú)

**Record:**
```json
{
  "choice": "casual-polite",
  "markers": ["です", "ます"],
  "rationale": "Universally safe - appropriate for strangers, work, daily life"
}
```

---

## Pass 1 Workflow

1. `GET /api/course/{code}/translate?limit=260` - Get all seeds to translate
2. Translate each seed naturally - focus on GOOD translation, not LEGOs
3. `PATCH /api/seed/{code}/{num}` with each translation
4. **As you translate, track patterns:**
   - Same English → different target? → Problem verb
   - Pattern appearing 10+ times? → Golden key
   - You hesitated which form? → ZUT concern
5. After seed 260: Compile your analysis
6. `POST /api/course/{code}/analysis` with your analysis JSON

---

## Analysis JSON Structure

```json
{
  "generated_at": "2026-01-20T12:00:00Z",
  "seeds_analyzed": 260,
  "register": {
    "choice": "casual-polite",
    "markers": ["です", "ます"]
  },
  "problem_verbs": [
    {
      "english": "remember",
      "target_forms": [
        {"target": "覚える", "trigger": "remember for later"},
        {"target": "思い出す", "trigger": "trying to recall"}
      ],
      "disambiguation_rule": "'recall' = 思い出す, 'remember' = 覚える"
    },
    {
      "english": "think",
      "target_forms": [
        {"target": "思う", "trigger": "I think that X (opinion)"},
        {"target": "考える", "trigger": "think about X (deliberate)"}
      ],
      "disambiguation_rule": "'think that' = 思う, 'think about' = 考える"
    }
  ],
  "golden_keys": [
    {
      "pattern": "want to V",
      "target_form": "V-stem + たい",
      "frequency": 58
    },
    {
      "pattern": "going to V",
      "target_form": "V + つもり",
      "frequency": 18
    }
  ],
  "zut_concerns": [
    {
      "seed": 45,
      "original_english": "I don't remember what you said",
      "suggested_reword": "I can't recall what you said"
    }
  ]
}
```

---

## Pass 2: Using Your Analysis

After Pass 1, your analysis is saved to the database and returned with every `/api/resume` call.

**In Pass 2:**
1. `GET /api/resume/{code}` - Includes your `translation_analysis`
2. For each problem verb: Use your disambiguation rules to choose the right form
3. For ZUT concerns: Use your suggested rewordings in the LEGO known_text
4. For golden keys: Prioritize teaching these patterns early as M-LEGOs

---

## Example Analysis

See `/jpn-analysis-example` for a complete worked example with Japanese.

---

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/course/{code}/translate?limit=260` | GET | Get seeds for Pass 1 translation |
| `/api/seed/{code}/{num}` | PATCH | Save individual translation |
| `/api/course/{code}/translate` | POST | Batch save translations |
| `/api/course/{code}/analysis` | POST | Save analysis after Pass 1 |
| `/api/course/{code}/analysis` | GET | Retrieve analysis |
| `/api/resume/{code}` | GET | Resume includes analysis (Pass 2) |
