# Unified Phase 1+3 Generator Prompt - Iteration 1

## Context
You are generating LUT-compliant translations and LEGO decompositions for language learning.

## Critical LUT Rules
1. **Unambiguous Mapping**: Every KNOWN chunk must map to exactly ONE target chunk
2. **Forced Pairs Stay Together**: want to, need to, going to, trying to, able to, used to, each other, as soon as, at the moment, on my own
3. **Infinitive Forms**: Use infinitive verb forms for teaching (hablar, comer, vivir - NOT conjugated)
4. **Chunk Up When Ambiguous**: If a word could mean multiple things, merge with context

## Forced Pairs Reference
- want to, need to, have to, going to, trying to
- able to, used to, supposed to, willing to, ought to
- would like to, looking forward to
- each other, as soon as, as much as, as often as
- a long time, at the moment, on my own

## Task
Generate Phase 1 (translations) and Phase 3 (LEGO decomposition) for the following seeds.

### Language Pair: {known_language} for {target_language} speakers
### Target Output Format:

```json
{
  "seed_id": "SXXXX",
  "phase1": {
    "known": "English sentence with {target} replaced with actual language name",
    "target": "Translation in target language"
  },
  "phase3": {
    "legos": [
      {"known_chunk": "I want to", "target_chunk": "quiero", "type": "FD"},
      {"known_chunk": "speak", "target_chunk": "hablar", "type": "FD"},
      {"known_chunk": "Spanish", "target_chunk": "espanol", "type": "FD"}
    ]
  }
}
```

### LEGO Types:
- **FD** (Fundamental Dependency): Core building blocks that appear frequently
- **LUT** (Look-Up Table): Higher-order patterns, less frequent

### Test Seeds to Process:

1. S0001: "I want to speak {target} with you now."
2. S0005: "I'm going to practise speaking with someone else."
3. S0011: "I'd like to be able to speak after you finish."
4. S0028: "It's useful to start talking as soon as you can."
5. S0029: "I'm looking forward to speaking better as soon as I can."
6. S0117: "I'm definitely doing better than I was last time we talked to each other."
7. S0152: "If I'd known you were there, I'd have come to see you."
8. S0199: "They used to go to the cinema together every week."
9. S0506: "I used to think this place was where I wanted to be."
10. S0563: "If I'd been able to go, I would have tried to help."

### Output all 10 seed translations with LEGO decompositions for: Spanish for English speakers (spa_for_eng)
