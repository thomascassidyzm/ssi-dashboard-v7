# Phase 5 Master Orchestrator: Patch {{PATCH_ID}}

**Course:** `{{COURSE_CODE}}`
**Your Patch:** Seeds `{{START_SEED}}` to `{{END_SEED}}` ({{SEED_COUNT}} seeds)
**Missing LEGOs in your patch:** {{MISSING_LEGO_COUNT}}

---

## 🎯 YOUR MISSION

You are responsible for generating ALL missing baskets in your patch range.

**Your workflow:**

1. ✅ **Read your LEGO list** (provided below)
2. ✅ **Create scaffolds** for all LEGOs in your list
3. ✅ **Spawn sub-agents** (10 baskets per agent, standard Phase 5 workflow)
4. ✅ **Monitor completion** and report summary

---

## 📋 YOUR LEGO LIST ({{MISSING_LEGO_COUNT}} LEGOs)

```json
{{LEGO_LIST}}
```

---

## 🔧 STEP 1: Create Scaffolds

For each LEGO in your list, create a scaffold using the **standard Phase 5 scaffold generation logic**.

**Scaffold location:** `public/vfs/courses/{{COURSE_CODE}}/phase5_scaffolds/`

**Scaffold format:** Standard Phase 5 scaffold (includes recent_context, current_seed_legos_available, etc.)

Use the existing scaffold generation tools/logic - nothing special needed.

---

## 🚀 STEP 2: Spawn Sub-Agents

Once scaffolds are ready:

1. **Batch your LEGOs:** ~10 baskets per sub-agent
2. **Spawn agents in parallel:** Use the Task tool multiple times in one message
3. **Each sub-agent receives:**
   - Their specific LEGO IDs
   - Path to their scaffolds
   - Standard Phase 5 intelligence prompt: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5

**Sub-agent workflow (standard Phase 5):**
- Read scaffold
- Generate 10 practice phrases (2-2-2-4 distribution)
- Grammar self-check
- Save to `phase5_outputs/seed_SXXXX_baskets.json`
- Push to GitHub (in batches)

---

## 📊 STEP 3: Monitor & Report

Track completion and report:

```
✅ Patch {{PATCH_ID}} Complete
   Seeds: {{START_SEED}}-{{END_SEED}}
   LEGOs generated: {{MISSING_LEGO_COUNT}}
   Sub-agents spawned: [calculated]
   Status: All baskets saved to phase5_outputs/
```

---

## ⚠️ IMPORTANT NOTES

- **You own this patch** - no coordination needed with other masters
- **Standard Phase 5 workflow** - nothing special about "regeneration"
- **10 baskets per sub-agent** - this means ~100 phrases per agent (10 baskets × 10 phrases)
- **Grammar check required** - sub-agents must self-review before saving
- **Push in batches** - don't push 1000+ files at once

---

## 🚀 BEGIN NOW

Start with Step 1: Create scaffolds for your {{MISSING_LEGO_COUNT}} LEGOs.
