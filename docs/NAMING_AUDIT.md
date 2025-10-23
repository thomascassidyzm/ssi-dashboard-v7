# APML v7.6 Naming Audit - Mismatches Found

## 🚨 Critical Naming Mismatches

### Phase 1 Output

**OFFICIAL NAME (from TrainingPhase.vue:427, 446):**
```
SEED_PAIRS_COMPLETE.json
```

**ACTUAL NAME IN USE:**
```
translations.json  ❌ WRONG
```

**LOCATIONS:**
- VFS courses: `ita_for_eng_30seeds/translations.json`
- VFS courses: `ita_for_eng_668seeds/translations.json`
- API automation_server.cjs:1563 - reads `translations.json`
- API automation_server.cjs:1648 - reads `translations.json`
- Conversion script: creates `translations.json`

**FIX REQUIRED:**
- Rename all `translations.json` → `SEED_PAIRS_COMPLETE.json`
- Update API to read `SEED_PAIRS_COMPLETE.json`
- Update conversion script
- Update view components if they reference this filename

---

### Phase 3 Output

**OFFICIAL NAME (from TrainingPhase.vue:725):**
```
LEGO_BREAKDOWNS_COMPLETE.json
```

**ACTUAL NAME IN USE:**
```
LEGO_BREAKDOWNS_COMPLETE.json  ✅ CORRECT
```

**STATUS:** ✅ No changes needed

---

## 📋 Additional Files to Verify

### Phase 2 Output
**OFFICIAL:** `phase_outputs/phase_2_corpus_intelligence.json` (TrainingPhase.vue:520)
**STATUS:** Not yet generated, no conflict

### Phase 3.5 Output
**OFFICIAL:** `phase_outputs/phase_3.5_lego_graph.json` (TrainingPhase.vue:840)
**STATUS:** Not yet generated, no conflict

### Phase 4 Output
**OFFICIAL:** Deduplication - likely `LEGO_BREAKDOWNS_DEDUPLICATED.json` or similar
**CURRENT:** Existing courses have `baskets_deduplicated.json` + `lego_provenance_map.json`
**STATUS:** ⚠️  Need to verify Phase 4 prompt for official naming

### Phase 5 Output
**OFFICIAL:** Individual amino acid files `vfs/amino_acids/baskets/{uuid}.json` (TrainingPhase.vue:1037)
**CURRENT:** Consolidated `baskets.json` file
**STATUS:** ⚠️  Architecture mismatch - atomic vs consolidated storage

### Phase 6 Output
**OFFICIAL:** Individual amino acid files `vfs/amino_acids/introductions/{uuid}.json` (TrainingPhase.vue:1129)
**CURRENT:** Consolidated `introductions.json` file
**STATUS:** ⚠️  Architecture mismatch - atomic vs consolidated storage

### Phase 7 Output
**OFFICIAL:** `vfs/courses/{course_code}/compiled.json` (TrainingPhase.vue:1323)
**CURRENT:** Not yet implemented (using `proteins/manifest.json`)
**STATUS:** ⚠️  Need to update compileManifest() to write to `compiled.json`

---

## 🏗️  Architecture Models

### Two Different Storage Models in Use:

**1. Amino Acid Storage Model** (described in Phase prompts):
```
vfs/
├── amino_acids/
│   ├── translations/{uuid}.json      (individual files per translation)
│   ├── legos/{uuid}.json             (individual files per LEGO)
│   ├── legos_deduplicated/{uuid}.json
│   ├── baskets/{uuid}.json
│   └── introductions/{uuid}.json
└── courses/{course_code}/
    └── compiled.json
```

**2. Consolidated JSON Model** (what exists in VFS):
```
vfs/courses/{course_code}/
├── translations.json                 (all translations in one file)
├── LEGO_BREAKDOWNS_COMPLETE.json     (all LEGOs in one file)
├── baskets.json                      (all baskets in one file)
├── baskets_deduplicated.json
├── lego_provenance_map.json
└── introductions.json                (all introductions in one file)
```

**QUESTION FOR USER:** Which architecture should we use?
- Option A: Implement full amino acid storage (many small JSON files with UUIDs)
- Option B: Stick with consolidated JSON files but fix naming (rename translations.json)
- Option C: Hybrid - consolidated for now, atomic later

---

## 🔧 Immediate Fixes Required

### Priority 1: Phase 1 Output Naming
1. Rename `translations.json` → `SEED_PAIRS_COMPLETE.json` in all courses
2. Update `automation_server.cjs` lines 1563, 1648, 1660
3. Update `convert-old-to-new-format.cjs`
4. Update any view components that reference the filename

### Priority 2: Phase 7 Output Location
1. Update `compileManifest()` in automation_server.cjs:529
2. Change output from `proteins/manifest.json` → `compiled.json`
3. Match spec from TrainingPhase.vue:1323

### Priority 3: Verify Other Phase Outputs
1. Check if Phase 4 exists and verify its output naming
2. Confirm Phase 5, 6 outputs match prompts or document differences

---

## 📝 Recommended Actions

1. **Decide on architecture**: Atomic (amino acids) vs Consolidated (single JSON files)?
2. **Standardize naming**: All outputs must match Phase prompt specifications
3. **Update documentation**: APMLSpec.vue should reflect actual storage model
4. **Migration path**: If switching to amino acid model, need conversion script
