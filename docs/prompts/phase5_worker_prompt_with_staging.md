# Phase 5 Worker Agent: {{AGENT_ID}}

**Course:** `{{COURSE_CODE}}`
**Your LEGOs:** {{LEGO_COUNT}} baskets to generate
**Upload URL:** `{{NGROK_URL}}/phase5/upload-basket`
**Agent ID:** `{{AGENT_ID}}`

---

## 🎯 YOUR MISSION

Generate practice baskets for YOUR assigned LEGOs and upload them via ngrok.

**Your workflow:**

1. ✅ **Read your LEGO assignments** (below)
2. ✅ **For each LEGO:** Read scaffold → Generate phrases → Validate
3. ✅ **Group by seed** (all LEGOs from same seed together)
4. ✅ **Upload to staging** via ngrok HTTP POST
5. ✅ **Report completion**

---

## 📋 YOUR LEGO ASSIGNMENTS ({{LEGO_COUNT}} LEGOs)

```json
{{LEGO_LIST}}
```

---

## 🔧 STEP 1: Read Scaffolds

For each LEGO in your list:

```bash
# Scaffold location
public/vfs/courses/{{COURSE_CODE}}/phase5_scaffolds/seed_{{SEED}}_scaffold.json
```

**Scaffold contains:**
- LEGO pair (target/known)
- LEGO type (A/M/F/X)
- Recent context (previous LEGOs for natural progression)
- Current seed LEGOs (other LEGOs in this seed)

**If scaffold missing:**
- Check if `lego_pairs.json` has this LEGO
- Generate scaffold yourself using standard logic
- Or skip and report error

---

## 🎨 STEP 2: Generate Practice Phrases

**For EACH LEGO**, generate exactly **10 practice phrases**.

### 2-2-2-4 Distribution

- **2 short** (levels 1-2): 1-2 LEGOs total
- **2 medium** (level 3): ~3 LEGOs total
- **2 longer** (level 4): ~4 LEGOs total
- **4 longest** (levels 5-7): 5+ LEGOs total

### Quality Requirements

**Grammar:**
- ✅ Natural, fluent {{TARGET_LANGUAGE}}
- ✅ Grammatically correct
- ✅ Age-appropriate (adult learners)
- ❌ No childish phrases
- ❌ No direct translations (natural phrasing)

**Progression:**
- Start simple (target LEGO in isolation)
- Build complexity (add context LEGOs)
- Vary sentence structures
- Use natural collocations

**Phase 5 Intelligence:**
Read the full intelligence doc: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5

---

## 🧪 STEP 3: Self-Validation

Before uploading, CHECK EACH BASKET:

```javascript
// Validation checklist
✓ Exactly 10 practice phrases
✓ 2-2-2-4 distribution respected
✓ All phrases grammatically correct
✓ Natural {{TARGET_LANGUAGE}} phrasing
✓ Progressive complexity
✓ Target LEGO appears in every phrase
```

**If validation fails:**
- Fix the issues
- Re-check
- Then upload

---

## 📤 STEP 4: Upload via ngrok

Group baskets by seed and upload seed-by-seed.

### HTTP POST Request

```bash
POST {{NGROK_URL}}/phase5/upload-basket
Content-Type: application/json

{
  "course": "{{COURSE_CODE}}",
  "seed": "S0123",
  "baskets": {
    "S0123L01": {
      "lego": ["target phrase", "已知短语"],
      "type": "M",
      "practice_phrases": [
        ["Known phrase", "目标短语", null, 1],
        ["I know this phrase", "我知道这个短语", null, 2],
        ... (8 more)
      ]
    },
    "S0123L02": {
      ... (same format)
    }
  },
  "agentId": "{{AGENT_ID}}"
}
```

### Upload Strategy

**Group by seed:**
```
S0044L01, S0044L02, S0044L03 → Upload together as seed S0044
S0045L01, S0045L02 → Upload together as seed S0045
```

**Small delay between uploads:**
- Wait ~100ms between each seed upload
- Prevents overwhelming server
- Allows progress tracking

**Check responses:**
- Server returns `{ success: true, ... }`
- Log failed uploads
- Report failures to master

---

## 🎯 STEP 5: Report Completion

When all LEGOs uploaded, report summary:

```
✅ {{AGENT_ID}} Complete

Assigned LEGOs: {{LEGO_COUNT}}
Seeds processed: {{SEED_COUNT}}
Uploads successful: {{SUCCESS_COUNT}}
Uploads failed: {{FAIL_COUNT}}

Upload method: ngrok HTTP POST
Saved to: staging → canon (automatic merge)
Git conflicts: None (staging is git-ignored)

Status: ✅ Ready for next batch
```

---

## ⚠️ CRITICAL RULES

### DO:
- ✅ Generate exactly 10 phrases per basket (2-2-2-4)
- ✅ Grammar self-check before upload
- ✅ Group by seed for upload
- ✅ Use provided agent ID in uploads
- ✅ Report failures immediately

### DON'T:
- ❌ Push to GitHub (no git involved!)
- ❌ Merge files manually (server does this)
- ❌ Skip grammar validation
- ❌ Upload incomplete baskets
- ❌ Use wrong LEGO IDs

---

## 📚 Resources

**Phase 5 Intelligence (SSoT):**
https://ssi-dashboard-v7.vercel.app/phase-intelligence/5

**Course files:**
- `lego_pairs.json` - LEGO definitions
- `seed_pairs.json` - Seed translations
- `phase5_scaffolds/` - Pre-generated scaffolds

**ngrok endpoint:**
- URL: `{{NGROK_URL}}/phase5/upload-basket`
- Method: POST
- Returns: `{ success: boolean, ... }`

---

## 🚀 BEGIN NOW

Start with your first LEGO: `{{FIRST_LEGO_ID}}`

Read the scaffold, generate 10 phrases, validate, then upload.

Work through your {{LEGO_COUNT}} LEGOs systematically.

**Good luck!** 🎉
