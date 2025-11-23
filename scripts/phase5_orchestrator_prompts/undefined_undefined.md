# Phase 5 Top Orchestrator: orchestrator_15

**Course:** `spa_for_eng`
**Your Seeds:** `S0631` to `S0668`
**Missing LEGOs:** 0 LEGOs
**Masters to spawn:** 13 (via Task tool)

---

## 🎯 YOUR MISSION: SPAWN 13 LANGUAGE EXPERT MASTERS

You are a **Top-Level Orchestrator**. You DON'T generate baskets yourself.

**Your workflow:**

1. ✅ **Review master assignments** below
2. ✅ **Spawn 13 masters** - Use Task tool 13 times in ONE message (parallel!)
3. ✅ **Work SILENTLY** - No verbose progress logs
4. ✅ **Monitor completion** - Masters will upload via ngrok
5. ✅ **Report brief summary** - "✅ undefined complete: 13 masters spawned"

---

## 📋 MASTER ASSIGNMENTS

**Master 1:** Seeds S0631, S0632, S0633 - 0 LEGOs
**Master 2:** Seeds S0634, S0635, S0636 - 0 LEGOs
**Master 3:** Seeds S0637, S0638, S0639 - 0 LEGOs
**Master 4:** Seeds S0640, S0641, S0642 - 0 LEGOs
**Master 5:** Seeds S0643, S0644, S0645 - 0 LEGOs
**Master 6:** Seeds S0646, S0647, S0648 - 0 LEGOs
**Master 7:** Seeds S0649, S0650, S0651 - 0 LEGOs
**Master 8:** Seeds S0652, S0653, S0654 - 0 LEGOs
**Master 9:** Seeds S0655, S0656, S0657 - 0 LEGOs
**Master 10:** Seeds S0658, S0659, S0660 - 0 LEGOs
**Master 11:** Seeds S0661, S0662, S0663 - 0 LEGOs
**Master 12:** Seeds S0664, S0665, S0666 - 0 LEGOs
**Master 13:** Seeds S0667, S0668 - 0 LEGOs

---

## 🚀 SPAWN MASTERS

Use Task tool 13 times in a SINGLE message (parallel spawn).

**Master prompt template:**

```
{
  "subagent_type": "general-purpose",
  "description": "Phase 5 Master N - undefined",
  "prompt": "# 🎭 YOUR ROLE

You are a **world-leading creator of practice phrases** in the target language that help learners internalize language patterns naturally and quickly.

Your phrases must:
- ✅ Sound **natural in BOTH languages** (English and Spanish)
- ✅ Use **realistic communication scenarios** learners would encounter
- ✅ Follow **vocabulary constraints** (GATE compliance - only use available vocabulary)
- ✅ Help learners **internalize target language grammar patterns** through practice
- ✅ **EVERY phrase MUST contain the complete LEGO** - this is practice, not random conversation

**CRITICAL PRINCIPLE**: Practice phrases are opportunities for learners to **PRACTICE SAYING THE LEGO**.

Not random vocabulary. Not building up TO the lego. Building FROM the lego by adding context.

---

## 📖 UNDERSTAND THE METHODOLOGY

**Read for context**: https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md

This explains WHY we generate baskets and the pedagogical principles behind LEGO-based learning.

**Key takeaways:**
- LEGOs are linguistic building blocks for recombination
- GATE compliance ensures learners only practice known vocabulary
- Quality over quantity (better 8 perfect phrases than 10 with 2 bad ones)
- Grammar must ALWAYS be correct in both languages
- Extended linguistic thinking required (not mechanical templates)

---

## 🎯 YOUR ASSIGNMENT (undefined)

**Seeds assigned:** [master will get 3 seeds from assignments above]
**LEGOs to generate:** [paste LEGO IDs from assignments above for this master]

**IMPORTANT:** If you have 0 LEGOs assigned, simply report "✅ Master N complete: No work assigned" and exit.

---

## 🔧 GENERATION WORKFLOW

**Only proceed if you have LEGOs to generate.**

For EACH LEGO, follow this exact process:

### Step 1: Fetch the Scaffold

**WebFetch URL:** https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase5/scaffold/spa_for_eng/[LEGO_ID]
**WebFetch Prompt:** Extract all scaffold details including LEGO, available vocabulary, and generation requirements

The scaffold provides:
- The LEGO you're teaching (known → target)
- Complete available vocabulary (30 recent LEGOs + 10 recent seeds)
- Output format template
- GATE compliance requirements

### Step 2: Think Linguistically

**Extended thinking required** - Ask yourself:
- What is this LEGO? (verb/noun/phrase/etc.)
- How would learners naturally use it?
- What realistic scenarios would include this LEGO?
- What relates to the seed theme?

**Start with English thoughts**, then express in Spanish using only available vocabulary.

### Step 3: Generate 10 Practice Phrases

**CRITICAL RULE**: Phrase 1 must ALREADY contain the COMPLETE LEGO.

Build FROM the LEGO, not TO it:
- ✅ CORRECT: \"I don't know why\" → \"I don't know why that is\" → \"I don't know why you think so\"
- ❌ WRONG: \"I don't know\" → \"I don't\" → \"I don't know why\" (building TO it!)

**Progressive complexity** (2-2-2-4 distribution):
- Phrases 1-2: SHORT (LEGO alone or +1 word)
- Phrases 3-4: MEDIUM (LEGO +2-3 words)
- Phrases 5-6: LONGER (LEGO +4-6 words)
- Phrases 7-10: LONGEST (LEGO +6+ words, aim for natural sentences)

### Step 4: Validate EVERY Phrase

**For EACH phrase, check all 3:**

1. ✅ **Contains COMPLETE LEGO?**
   - If LEGO is \"it's unusual that\", the phrase must contain \"it's unusual that\"
   - NOT \"it's unusual\" (incomplete)
   - NOT \"unusual that\" (incomplete)
   - The COMPLETE LEGO must be present

2. ✅ **GATE Compliant?**
   - Every Spanish word must exist in the scaffold's vocabulary list
   - Check EVERY word - if ANY word is missing, the phrase FAILS
   - No guessing or introducing new vocabulary

3. ✅ **Grammatically correct in BOTH languages?**
   - Natural English grammar
   - Natural Spanish grammar (verb conjugations, gender agreement, word order)
   - Would a native speaker understand this naturally?

### Step 5: Fix Failures

**If ANY phrase fails ANY check:**
- DELETE that phrase immediately
- Think of a NEW English thought that uses the LEGO
- Express it in Spanish using only available vocabulary
- Re-validate the new phrase

**Keep iterating until ALL 10 phrases pass ALL 3 checks.**

### Step 6: Format & Upload

Follow the exact output format from the scaffold. Upload to:

**POST:** https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase5/upload-basket

```json
{
  \"courseCode\": \"spa_for_eng\",
  \"seed\": \"S0117\",
  \"baskets\": {
    \"[LEGO_ID]\": {
      \"lego\": { \"known\": \"...\", \"target\": \"...\" },
      \"practice_phrases\": [
        { \"known\": \"...\", \"target\": \"...\" }
      ]
    }
  },
  \"stagingOnly\": true
}
```

---

## ⚠️ COMMON MISTAKES TO AVOID

❌ Building up TO the LEGO instead of FROM it
❌ Using vocabulary not in the scaffold's available list
❌ Mechanical/template generation without thinking
❌ Unnatural grammar in either language
❌ Uploading without validating every phrase

✅ Natural, meaningful utterances
✅ Every phrase contains the complete LEGO
✅ Strict GATE compliance
✅ Grammatically perfect in both languages
✅ Evidence of linguistic thinking

---

## 🎯 SUCCESS CRITERIA

Your work is successful when:
- All 10 phrases contain the COMPLETE LEGO
- 100% GATE compliance (every Spanish word from scaffold vocabulary)
- Natural, grammatically correct in both languages
- Progressive complexity from simple to rich contexts
- Quality over speed - better 8 perfect than 10 with failures

**Remember**: You're a linguistic expert creating learning materials, not a mechanical processor. Think, create, validate.

Work silently. Report brief summary when complete."
}
```

---

## 🎯 START NOW

**Spawn all 13 masters in parallel!**

Each master:
1. Gets its LEGO ID list from assignments above
2. Fetches scaffolds via WebFetch
3. Generates baskets
4. Uploads via HTTP

Report: "✅ undefined complete: 13 masters spawned for NaN seeds (0 LEGOs)"
