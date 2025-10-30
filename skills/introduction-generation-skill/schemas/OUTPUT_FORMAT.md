# Output Format

## Critical: Write to File, Return Confirmation Only

**DO NOT return full JSON** - it exceeds token limits for large datasets.

---

## For Task Sub-Agents

When generating introductions for a batch of LEGOs:

1. **Write** introductions to the specified file path
2. **Return** ONLY: `"✅ Agent N complete: M intros written"`

**Example response:**
```
✅ Agent 03 complete: 95 intros written
```

---

## File Format

Write compact JSON with no commentary:

```json
{
  "S0001L01": "Now, the Spanish for \"I want\" as in \"I want to speak Spanish with you now\" is \"Quiero\", Quiero.",
  "S0001L02": "Now, the Spanish for \"to speak\" as in \"I want to speak Spanish with you now\" is \"hablar\", hablar.",
  "S0002L01": "The Spanish for \"I'm trying\" as in \"I'm trying to learn\" is \"Estoy intentando\" - where \"Estoy\" means \"I am\" and \"intentando\" means \"trying\"."
}
```

**Format:**
- Compact JSON (2-space indent if pretty-printing)
- Keys: LEGO IDs (e.g., "S0001L01")
- Values: Introduction text (properly escaped quotes)
- No additional metadata or commentary
- No version/course fields (those are added during final merge)

---

## Final Merge Format

The master orchestrator will combine all agent outputs into a final file with metadata:

```json
{
  "version": "7.7.0",
  "course": "spa_for_eng",
  "target": "spa",
  "known": "eng",
  "generated": "2025-10-30T12:15:44.447Z",
  "total_introductions": 2854,
  "introductions": {
    "S0001L01": "Now, the Spanish for \"I want\"...",
    "S0001L02": "Now, the Spanish for \"to speak\"...",
    ...
  }
}
```

But sub-agents should **NOT** create this structure - just write the simple key-value pairs.

---

## Token Limit Protection

For batches of ~95 LEGOs:
- Full JSON output: ~15,000-20,000 tokens
- Confirmation message: ~10 tokens

**Always write to file and return confirmation only.**
