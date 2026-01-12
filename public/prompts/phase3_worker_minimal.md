# Phase 3 Worker (Minimal)

**Course:** {{COURSE_CODE}}
**Your LEGOs:** {{LEGO_IDS}}
**Seeds:** {{SEED_IDS}}
**API Base:** {{ORCHESTRATOR_URL}}

---

## WORKFLOW

### 1. Verify Orchestrator
```bash
curl {{ORCHESTRATOR_URL}}/health
```
If unreachable, STOP and report error.

### 2. Fetch Methodology
```bash
curl {{ORCHESTRATOR_URL}}/api/phase-intelligence/3
```
Read the basket generation methodology. Key principles:
- GATE compliance (only use available vocabulary)
- LEGO must appear in EVERY phrase
- ~10 phrases per basket (2-2-2-4 distribution)
- Grammar must be correct in both languages

### 3. Fetch Scaffolds
```bash
curl "{{ORCHESTRATOR_URL}}/scaffolds/{{COURSE_CODE}}/batch?seeds={{SEED_IDS}}"
```
The scaffold provides:
- Each LEGO's known/target text
- Available vocabulary for GATE checking
- 30 most recent LEGOs for recombination

### 4. Generate Phrases

For each LEGO in your assignment:

1. **Think linguistically** - What natural phrases use this LEGO?
2. **Generate ~10 phrases** following 2-2-2-4 complexity distribution
3. **Validate each phrase**:
   - Contains the complete LEGO
   - All words in available vocabulary (GATE)
   - Correct grammar in both languages
4. **Quality over quantity** - 8 perfect phrases beats 10 forced ones

### 5. Upload Each LEGO (Minimal Payload)

**POST each LEGO individually** as you complete it:

```bash
curl -X POST {{ORCHESTRATOR_URL}}/upload-lego \
  -H "Content-Type: application/json" \
  -d '{
    "course": "{{COURSE_CODE}}",
    "legoId": "S0001L01",
    "phrases": [
      { "known": "I want", "target": "我想" },
      { "known": "I want that", "target": "我想要那个" }
    ]
  }'
```

**Minimal payload** - server enriches with syllable_count, lego_count, position.

**Expected response:**
```json
{"success": true, "legoId": "S0001L01", "phraseCount": 10, "enriched": true}
```

---

## VALIDATION CHECKLIST

Before uploading each LEGO, verify:
- [ ] Every phrase contains the COMPLETE LEGO
- [ ] Every word exists in available_vocab (GATE)
- [ ] Grammar correct in both languages
- [ ] ~10 phrases (8-12 acceptable)
- [ ] Complexity progression (simple to complex)

---

## COMPLETION

When all LEGOs are uploaded, report:
```
Worker complete: X LEGOs uploaded
```

Work silently during generation. Only report final summary.
