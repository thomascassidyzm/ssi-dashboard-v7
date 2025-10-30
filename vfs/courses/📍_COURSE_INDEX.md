# 📍 Course Navigation Index

**Last Updated:** 2025-10-29

Use this file to quickly find and switch between courses.

---

## 🎯 MAIN PRODUCTION COURSES

### 🔵 Spanish for English (spa_for_eng) - **ACTIVE**
- **Seeds:** 668 (S0001-S0668)
- **Status:** ✅ Phase 3 Complete, Production Ready
- **File:** `spa_for_eng/lego_pairs.json` (661KB)
- **Start Here:** `spa_for_eng/🔵_START_HERE_SPA_FOR_ENG.md`
- **QA Status:** All blocking checks pass, 0 FD violations
- **Notes:** Main Spanish course, fully QA'd and ready

---

## 📦 OTHER COURSES

### Macedonian
- **mkd_for_eng_574seeds** - Macedonian for English (574 seeds)

### Chinese (Mandarin)
- **cmn_for_eng** - Chinese (Mandarin) for English
- **cmn_for_eng_30seeds** - Chinese test set (30 seeds)

### French
- **fra_for_eng_30seeds** - French test set (30 seeds)

### Basque
- **eus_for_eng_30seeds** - Basque test set (30 seeds)

### Irish
- **gle_for_eng_30seeds** - Irish test set (30 seeds)

### Italian
- **ita_for_eng_10seeds** - Italian test (10 seeds)
- **ita_for_eng_10seeds_sonnet** - Italian test with Sonnet (10 seeds)
- **ita_for_eng_30seeds** - Italian test (30 seeds)
- **ita_for_eng_668seeds** - Italian full course (668 seeds)

### Spanish (Test Sets)
- **spa_for_eng_20seeds** - Spanish test set (20 seeds)

### Test Course
- **test_for_eng_5seeds** - General test course (5 seeds)

---

## 🔍 HOW TO NAVIGATE

### To Work on a Specific Course:
```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/[COURSE_NAME]
```

### To See Course Status:
1. Look for a `🔵_START_HERE_*.md` file in each course
2. Check if `lego_pairs.json` exists
3. Run QA if available: `cd qa && node run_all_checks.cjs ../lego_pairs.json`

---

## 📊 COURSE STATUS QUICK VIEW

| Course | Seeds | Status | QA System | Notes |
|--------|-------|--------|-----------|-------|
| 🔵 spa_for_eng | 668 | ✅ Complete | ✅ Yes | **MAIN COURSE** |
| mkd_for_eng_574seeds | 574 | ❓ Unknown | ❓ | Large course |
| ita_for_eng_668seeds | 668 | ❓ Unknown | ❓ | Full Italian |
| cmn_for_eng | ? | ❓ Unknown | ❓ | Check contents |
| Others | Various | Test sets | No | Small test courses |

---

## 💡 TIPS FOR MULTIPLE COURSES

### 1. Use START_HERE Files
Each main course should have a colored START_HERE file:
- 🔵 Spanish (`🔵_START_HERE_SPA_FOR_ENG.md`) ✅ Created
- 🟢 French (`🟢_START_HERE_FRE_FOR_ENG.md`) - Create if needed
- 🟡 Italian (`🟡_START_HERE_ITA_FOR_ENG.md`) - Create if needed
- 🔴 Macedonian (`🔴_START_HERE_MKD_FOR_ENG.md`) - Create if needed

### 2. Always Check Course Name
Before running commands, verify you're in the right directory:
```bash
pwd | grep -o '[^/]*$'  # Shows current course directory name
```

### 3. Keep This Index Updated
When you complete a phase or make major changes, update this file.

### 4. Use Consistent Structure
Each production course should have:
```
course_name/
├── lego_pairs.json          ← Production file
├── 🔵_START_HERE_*.md       ← Quick orientation
├── qa/                      ← QA automation
├── working/                 ← Intermediate files
└── Phase docs (*.md)        ← Documentation
```

---

## 🆘 WHEN YOU'RE LOST

**Can't remember which course you're in?**
```bash
pwd  # Shows full path
basename $(pwd)  # Shows just the course directory name
```

**Need to see all courses at once?**
```bash
ls -1 /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/
```

**Want to know which courses have completed Phase 3?**
```bash
find /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses -name "README_PHASE3_COMPLETE.md"
```

**Looking for a specific course's lego_pairs.json?**
```bash
find /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses -name "lego_pairs.json"
```

---

## 📝 QUICK REFERENCE

### Language Codes
- `spa` = Spanish (Español)
- `fra` = French (Français)
- `ita` = Italian (Italiano)
- `ger` = German (Deutsch)
- `cmn` = Chinese Mandarin (普通话)
- `mkd` = Macedonian (Македонски)
- `eus` = Basque (Euskara)
- `gle` = Irish (Gaeilge)

### File Name Patterns
- `*_for_eng` = Target language for English speakers
- `*_30seeds` = Test set with 30 seeds
- `*_668seeds` = Full course with 668 seeds

---

## 🎯 CURRENT FOCUS

**Active Course:** 🔵 Spanish for English (`spa_for_eng`)
**Status:** Phase 3 Complete ✅
**Next Steps:** Ready for Phase 4 or other courses

---

**Remember:** Before working on any course, open its `🔵_START_HERE_*.md` file to get oriented!
