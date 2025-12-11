# Phase 3: Basket Generation (v8.0 Minimal)

**Port**: 3459 | **Input**: lego_pairs.json | **Output**: lego_baskets.json

---

## Your Task

Generate **10 practice phrases** for each LEGO showing natural usage. Each phrase MUST:
1. **Contain the complete LEGO** (it's practice for that specific unit)
2. **Use only available vocabulary** (GATE compliance - from scaffold)
3. **Sound natural** in both languages

---

## Scaffold Format

You receive a text scaffold per LEGO:

```
=== S0010L01 ===
LEGO: "I want" → "quiero" [A-type]

VOCABULARY AVAILABLE:
Seeds: S0001-S0009 (all vocabulary from these seeds)
Priority LEGOs: S0008L03 "to speak" → "hablar", S0009L01 "something" → "algo", ...

GENERATE 10 PHRASES (2-2-2-4):
1-2: Short (1-2 LEGOs)
3-4: Medium (3 LEGOs)
5-6: Longer (4 LEGOs)
7-10: Longest (5+ LEGOs)
```

---

## 2-2-2-4 Distribution

| Phrases | Length | Word Count |
|---------|--------|------------|
| 1-2 | Short | 2-3 words |
| 3-4 | Medium | 4-5 words |
| 5-6 | Longer | 6-7 words |
| 7-10 | Longest | 8+ words |

---

## Output Format

```json
{
  "S0010L01": {
    "lego": {"known": "I want", "target": "quiero"},
    "practice_phrases": [
      {"known": "I want it", "target": "Lo quiero"},
      {"known": "I want something", "target": "Quiero algo"},
      ...10 total
    ]
  }
}
```

---

## Validation (Server Rejects If Failed)

Each phrase is validated on upload:

| Check | Failure Response |
|-------|-----------------|
| **GATE violation** | `{"error": "GATE: unknown word 'X' not in available vocab"}` |
| **Missing LEGO** | `{"error": "Phrase 3 does not contain LEGO 'quiero'"}` |

**Fix strategy**: If phrase fails, try different English thought using available vocabulary.

---

## Process

1. Read scaffold (shows LEGO + available vocab)
2. Think of natural English utterance using the LEGO
3. Translate to target using ONLY available vocabulary
4. If can't translate cleanly → try different English thought
5. Build 2-2-2-4: 2 short, 2 medium, 2 longer, 4 longest
6. Submit → server validates → fix failures → resubmit

---

## Early Seeds (S0001-S0010)

Limited vocabulary = fewer natural combinations.
- **Fewer than 10 phrases is OK** if vocab doesn't allow more
- **Never force unnatural phrases** just to hit count
- **Quality > quantity**

---

## Critical Rules

✅ Every phrase contains the COMPLETE LEGO
✅ Every target word comes from available vocabulary
✅ Natural in BOTH languages
✅ 2-2-2-4 distribution (short → longest)
❌ Never use vocabulary not in scaffold
❌ Never submit partial LEGO usage

---

*v8.0 - Minimal prompt with server-side validation*
