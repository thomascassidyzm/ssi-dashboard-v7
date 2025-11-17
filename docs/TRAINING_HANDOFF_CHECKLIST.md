# Training Handoff Checklist
**Date**: 2025-11-17
**Purpose**: Pre-training preparation for non-technical user

---

## ✅ COMPLETED (Ready for Training)

### System Setup
- [x] PM2 services configured and running
- [x] Dashboard accessible (localhost:5173)
- [x] Automation server running (port 3456)
- [x] Ngrok tunnel active (public URL)
- [x] All phase specs documented in dashboard
- [x] Phase 8 audio generation script built

### Documentation
- [x] CLAUDE.md - Agent onboarding guide
- [x] SYSTEM_STATUS_2025-11-17.md - Complete system audit
- [x] Phase intelligence docs (Phases 1, 3, 5, 6, 7, 8)
- [x] This handoff checklist

### Tools
- [x] Validators ready (`tools/validators/`)
- [x] Generators ready (`tools/generators/`)
- [x] Phase 8 audio script ready (`tools/generators/phase8-generate-audio.cjs`)
- [x] Orchestrators configured

---

## ⚠️ NEEDS ATTENTION (Before Training)

### Critical Items
- [ ] **Get ElevenLabs API key** (for Phase 8 testing)
  - Sign up at: https://elevenlabs.io
  - Add to `.env`: `ELEVENLABS_API_KEY=your_key_here`
  - Voice IDs already configured in Phase 8 script

- [ ] **Test complete pipeline on `ita_for_fra`**
  - Currently has: Phase 1 only (10 seeds)
  - Needs: Phases 3, 5, 6, 7, 8

- [ ] **Verify dashboard displays correctly**
  - Open: http://localhost:5173
  - Check: Phase Intelligence tab
  - Check: Course list shows all courses

### Nice to Have
- [ ] Quick start guide (getting started steps)
- [ ] Video walkthrough (optional)
- [ ] Troubleshooting FAQ

---

## 🎯 TRAINING DAY WORKFLOW

### Morning Setup (Before Trainee Arrives)

1. **Start all services**:
   ```bash
   pm2 restart all
   pm2 list   # Verify all green
   ```

2. **Open dashboard**:
   ```bash
   open http://localhost:5173
   ```

3. **Test public access**:
   - URL: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
   - Should show automation server API

4. **Have logs ready**:
   ```bash
   pm2 logs ssi-automation --lines 50
   ```

### Training Session Structure

**Part 1: System Overview (30 min)**
- Show dashboard
- Explain pipeline (Phase 1 → 8)
- Navigate phase intelligence docs
- Explain LEGO methodology basics

**Part 2: Reading Phase Specs (30 min)**
- Open Phase 1 spec in dashboard
- Walk through TWO ABSOLUTE RULES
- Show examples section
- Explain version history

**Part 3: Hands-On Test (60 min)**
- Choose: `ita_for_fra` (10 seeds - manageable size)
- Run through each phase:
  - Phase 1: Already done (show seed_pairs.json)
  - Phase 3: Run LEGO extraction
  - Phase 5: Generate baskets
  - Phase 6: Generate introductions
  - Phase 7: Compile manifest
  - Phase 8: Generate audio (if ElevenLabs key ready)

**Part 4: Troubleshooting (30 min)**
- Show validators
- Demonstrate error handling
- Check logs when things fail
- Review common issues

**Part 5: Q&A and Next Steps (30 min)**
- Answer questions
- Review where docs live
- Show how to check PM2 services
- Explain S3 sync for course backup

---

## 🚀 QUICK START (for Trainee)

### Accessing the System

**Dashboard** (main interface):
```
http://localhost:5173
```

**What you'll see**:
- Course Library tab (all courses)
- Phase Intelligence tab (⭐ KEY - read specs here)
- APML Spec tab (technical details)

**Where to find phase instructions**:
1. Click "Phase Intelligence" tab
2. Select phase (1, 3, 5, 6, 7, 8)
3. Read methodology, examples, rules

### Running a Complete Course

**Example**: Complete `ita_for_fra` (10 Italian seeds for French speakers)

**Step 1: Verify Phase 1 exists**
```bash
cat public/vfs/courses/ita_for_fra/seed_pairs.json
```

Should show 10 Italian ↔ French seed pairs.

**Step 2: Run Phase 3 (LEGO extraction)**
- Read spec in dashboard first!
- Use orchestrator or manual agent execution
- Output: `lego_pairs.json`

**Step 3: Run Phase 5 (Practice baskets)**
- Read spec in dashboard first!
- Generate scaffolds, then baskets
- Output: `baskets/lego_baskets_s*.json`

**Step 4: Run Phase 6 (Introductions)**
```bash
node tools/generators/phase6-generate-introductions.cjs ita_for_fra
```
- Output: `introductions.json`

**Step 5: Run Phase 7 (Compile manifest)**
```bash
node scripts/phase7_compile_manifest.cjs public/vfs/courses/ita_for_fra
```
- Output: `course_manifest.json`

**Step 6: Run Phase 8 (Generate audio)**
```bash
# Dry run first (no actual generation)
node tools/generators/phase8-generate-audio.cjs ita_for_fra --dry-run

# Real run (with ElevenLabs key)
node tools/generators/phase8-generate-audio.cjs ita_for_fra
```
- Output: `audio/*.mp3` + S3 upload

---

## 📚 KEY CONCEPTS TO UNDERSTAND

### The LEGO Methodology
- Language is broken into reusable "LEGO" pieces
- Each LEGO is a minimal, recombinable unit
- LEGOs stack to form sentences
- Learners practice LEGOs, not grammar rules

### Functional Determinism (Phase 3)
- **Rule**: Known → Target mapping must be 1:1
- **Why**: Remove learner uncertainty
- **Example**:
  - ✅ "with you" → "contigo" (unambiguous)
  - ❌ "with" → "con" (ambiguous - "con él", "contigo", "conmigo"...)

### GATE Constraint (Phase 5)
- **Rule**: LEGO #N can ONLY use vocabulary from LEGOs #1 to #(N-1)
- **Why**: Ensures learners always have the tools they need
- **Example**: LEGO #50 practice can use any vocab from LEGOs #1-#49

### Cognate Preference (Phase 1)
- **Rule**: For seeds 1-100, strongly prefer cognates
- **Why**: Builds semantic networks, not just ease
- **Example**: "often" → use "frecuentemente" (cognate with "frequently") instead of "a menudo"

### Zero Variation (Phase 1, Seeds 1-100)
- **Rule**: Same concept → same translation (first-come-first-served)
- **Why**: Consistency enables functional determinism
- **Example**: First time you translate "want" as "quiero", always use "quiero"

---

## 🛠️ COMMON TROUBLESHOOTING

### Dashboard won't load
```bash
pm2 restart dashboard-ui
pm2 logs dashboard-ui
```

### Automation server not responding
```bash
pm2 restart ssi-automation
pm2 logs ssi-automation --lines 50
```

### Phase validation fails
```bash
# Run validator to see specific errors
node tools/validators/course-validator.cjs <course_code>

# Deep validation for specific phase
node tools/validators/phase-deep-validator.cjs <course_code> phase5
```

### Audio generation fails (Phase 8)
- Check ElevenLabs API key in `.env`
- Check AWS credentials (for S3 upload)
- Try dry run first: `--dry-run` flag
- Check logs: `failed_audio_samples.json`

### Git shows unexpected changes
- You probably created files in wrong directory
- Check `.gitignore`
- Scripts go in `scripts/` (gitignored)
- Tools go in `tools/` (committed)

---

## 📞 WHERE TO GET HELP

### During Training
- Ask Tom immediately
- Show error message
- Check PM2 logs together

### After Training
- **Phase specs**: Dashboard → Phase Intelligence tab
- **System architecture**: Read `SYSTEM.md`
- **Agent guide**: Read `CLAUDE.md`
- **This status doc**: `docs/SYSTEM_STATUS_2025-11-17.md`

### Logs and Debugging
```bash
pm2 logs                    # All services
pm2 logs ssi-automation    # Automation only
pm2 logs dashboard-ui       # Dashboard only
```

---

## 🎓 SUCCESS CRITERIA

By end of training, trainee should be able to:

- [ ] Navigate dashboard and find phase specs
- [ ] Understand the 8-phase pipeline
- [ ] Explain LEGO methodology basics
- [ ] Run a complete course generation (1 small course)
- [ ] Know where to look when errors occur
- [ ] Understand key principles:
  - Functional Determinism
  - GATE constraint
  - Cognate preference
  - Zero variation

---

## 📋 PRE-TRAINING CHECKLIST (Tom)

### System Health
- [ ] All PM2 services running
- [ ] Dashboard loads correctly
- [ ] Phase Intelligence tab shows all docs
- [ ] Ngrok tunnel active

### Environment
- [ ] ElevenLabs API key obtained and added to `.env`
- [ ] AWS credentials verified
- [ ] Anthropic API key verified

### Test Course Ready
- [ ] `ita_for_fra` has Phase 1 complete
- [ ] Ready to run Phases 3-8 as demonstration

### Documentation
- [ ] This checklist printed/accessible
- [ ] SYSTEM_STATUS doc ready
- [ ] CLAUDE.md ready for reference

---

## 🚦 GO/NO-GO DECISION

**GO** if:
- ✅ Dashboard loads
- ✅ At least one phase spec displays correctly
- ✅ One test course exists with Phase 1 complete
- ✅ PM2 services all green

**NO-GO** if:
- ❌ Dashboard won't start
- ❌ No course data available
- ❌ Phase specs missing/broken
- ❌ Critical services down

---

## 📝 NOTES FOR TOM

### What to Emphasize
1. **Dashboard is SSoT** - everything lives there
2. **Read specs first** - don't guess, read the methodology
3. **Start small** - use 10-seed test courses
4. **Validate often** - use validators between phases
5. **Logs are your friend** - `pm2 logs` when stuck

### What to De-emphasize
- Don't worry about the code - agents write it
- Don't worry about S3 sync yet - local first
- Don't worry about 668-seed courses yet - master 10 seeds first

### Common Pitfalls
- Creating files in root (use `scripts/` or `tools/`)
- Skipping validation between phases
- Not reading phase specs before running
- Assuming Phase N is independent (it's a pipeline!)

---

**Ready for Training**: 95%
**Blocker**: ElevenLabs API key needed for Phase 8 testing

---

*Last updated: 2025-11-17 18:20*
