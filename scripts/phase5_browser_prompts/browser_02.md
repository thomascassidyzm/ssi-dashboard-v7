# Phase 5 Browser Coordinator: browser_02

**Course:** `spa_for_eng`
**Your LEGOs:** 71 LEGOs
**Workers to spawn:** 15 (via Task tool)

---

## 🎯 YOUR MISSION: SPAWN 15 LANGUAGE EXPERT WORKERS

You are a **Browser Coordinator**. You DON'T generate baskets yourself.

**Your workflow:**

1. ✅ **Review worker assignments** below
2. ✅ **Spawn 15 workers** - Use Task tool 15 times in ONE message (parallel!)
3. ✅ **Work SILENTLY** - No verbose progress logs
4. ✅ **Monitor completion** - Workers will upload via ngrok
5. ✅ **Report brief summary** - "✅ browser_02 complete: 15 workers spawned for 71 LEGOs"

---

## 📋 WORKER ASSIGNMENTS

**Worker 1:** 5 LEGOs (S0161L04, S0162L01, S0162L02, S0162L03, S0163L01)
**Worker 2:** 5 LEGOs (S0163L02, S0163L03, S0164L01, S0164L02, S0165L02)
**Worker 3:** 5 LEGOs (S0165L03, S0165L04, S0166L01, S0166L02, S0166L03)
**Worker 4:** 5 LEGOs (S0167L01, S0167L02, S0167L03, S0167L04, S0167L05)
**Worker 5:** 5 LEGOs (S0168L01, S0168L02, S0168L03, S0168L04, S0168L05)
**Worker 6:** 5 LEGOs (S0168L06, S0169L01, S0169L02, S0169L03, S0170L02)
**Worker 7:** 5 LEGOs (S0170L03, S0170L04, S0170L05, S0171L01, S0171L02)
**Worker 8:** 5 LEGOs (S0171L03, S0171L04, S0358L01, S0358L03, S0358L04)
**Worker 9:** 5 LEGOs (S0358L05, S0358L06, S0359L01, S0359L02, S0359L03)
**Worker 10:** 5 LEGOs (S0359L04, S0359L05, S0360L01, S0360L02, S0360L03)
**Worker 11:** 5 LEGOs (S0361L01, S0361L02, S0362L02, S0362L03, S0362L04)
**Worker 12:** 5 LEGOs (S0362L05, S0362L06, S0363L02, S0363L03, S0363L04)
**Worker 13:** 5 LEGOs (S0364L01, S0364L02, S0364L03, S0364L04, S0365L01)
**Worker 14:** 5 LEGOs (S0365L02, S0365L03, S0365L04, S0366L01, S0366L02)
**Worker 15:** 1 LEGOs (S0366L03)

---

## 🚀 SPAWN WORKERS

Use Task tool 15 times in a SINGLE message (parallel spawn).

**Worker prompt template:**

For each worker, use this exact format with the LEGO IDs from assignments above:

```json
{
  "subagent_type": "general-purpose",
  "description": "Phase 5 Worker [N] - browser_02",
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

## 🎯 YOUR ASSIGNMENT

**LEGOs to generate:** [Worker will receive specific LEGO ID list from assignment above]

Replace [Worker N] with the actual worker number (1, 2, 3, etc.) and paste the LEGO IDs from the worker assignments above.

---

## 🔧 GENERATION WORKFLOW

For EACH LEGO in your assignment, follow this exact process:

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

**Spawn all 15 workers in parallel!**

Each worker:
1. Gets its LEGO ID list from assignments above
2. Fetches scaffolds via WebFetch: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase5/scaffold/spa_for_eng/[LEGO_ID]
3. Generates baskets for each LEGO
4. Uploads via HTTP: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase5/upload-basket

Report: "✅ browser_02 complete: 15 workers spawned for 71 LEGOs"
