# v9 Explicit Labels - Quick Start Guide

> **For the next course** (French, German, etc.) - use v9 format from day 1!

---

## 🎯 What's Different?

**v7 (Old - Spanish/Chinese):**
```json
"seed_pair": ["I want to speak", "Quiero hablar"]
"practice_phrases": [
  ["I want to help", "Quiero ayudar"],
  ["I want to learn", "Quiero aprender"]
]
```
❌ Position-based → caused 500+ swaps

**v9 (New - French onwards):**
```json
"seed_pair": {
  "english": "I want to speak",
  "french": "Je veux parler"
}
"practice_phrases": [
  {"english": "I want to help", "french": "Je veux aider", "notes": ""},
  {"english": "I want to learn", "french": "Je veux apprendre", "notes": ""}
]
```
✅ Explicit labels → **ZERO swaps**

---

## 🚀 Starting a New Course (French Example)

### Step 1: Generate Phase 5 Scaffolds

```bash
node tools/phase-prep/phase5_prep_scaffolds_v9.cjs public/vfs/courses/fra_for_eng
```

**Output:**
```
[Phase 5 Prep v9] Languages: english → french (fra_for_eng)
[Phase 5 Prep v9] Format: Explicit labels with 12 pre-allocated phrase slots
[Phase 5 Prep v9] ✅ Generated 668 scaffold files
```

**Creates:**
- `public/vfs/courses/fra_for_eng/phase5_scaffolds_v9/seed_s0001.json`
- `public/vfs/courses/fra_for_eng/phase5_scaffolds_v9/seed_s0002.json`
- ... etc

### Step 2: Agent Fills Scaffolds

Agent sees this:
```json
{
  "practice_phrases": [
    {"english": "", "french": "", "notes": ""},
    {"english": "", "french": "", "notes": ""},
    // ... 12 slots total
  ],
  "target_phrase_count": 10,
  "_instructions": {
    "slots": "12 pre-allocated slots - fill first 10, leave last 2 empty"
  }
}
```

Agent fills:
```json
{
  "practice_phrases": [
    {"english": "I want to help you", "french": "Je veux t'aider", "notes": ""},
    {"english": "I want to learn", "french": "Je veux apprendre", "notes": ""},
    {"english": "I want more time", "french": "Je veux plus de temps", "notes": ""},
    // ... 7 more (total 10 filled)
    {"english": "", "french": "", "notes": ""},  // Empty slot 11
    {"english": "", "french": "", "notes": ""}   // Empty slot 12
  ]
}
```

**Key points:**
- ✅ Agent knows exactly where to put English vs French
- ✅ Fills first 10 slots
- ✅ Leaves last 2 empty for future expansion
- ✅ Can add notes if helpful

### Step 3: Validate (Expect ZERO Swaps!)

```bash
python3 scripts/fixes/validate_protocol.py public/vfs/courses/fra_for_eng
```

**Expected output:**
```
============================================================
OVERALL PROTOCOL SUMMARY
============================================================
✅ seed_pairs.json: OK
✅ lego_pairs.json: OK
✅ lego_baskets.json: OK

============================================================
✅ PROTOCOL IS CONSISTENT!
   All files follow [English, French] convention
   Safe to proceed with course generation
```

### Step 4: Generate Manifest

```bash
python3 services/phase7/generate_manifest.py public/vfs/courses/fra_for_eng
```

**Phase 7 automatically:**
- ✅ Detects v9 format
- ✅ Normalizes explicit labels
- ✅ Skips empty phrase slots
- ✅ Generates manifest with 0 swaps

---

## 🔄 Migrating Existing Course (Optional)

**Only if you need to migrate Spanish or Chinese:**

```bash
# Dry run first
python3 scripts/migration/migrate_to_explicit_labels.py public/vfs/courses/spa_for_eng --dry-run

# Review changes, then apply
python3 scripts/migration/migrate_to_explicit_labels.py public/vfs/courses/spa_for_eng

# Validate
python3 scripts/fixes/validate_protocol.py public/vfs/courses/spa_for_eng
```

**Creates backups:**
- `seed_pairs.json.backup_v7`
- `lego_pairs.json.backup_v7`
- `lego_baskets.json.backup_v7`

---

## 🎓 Language-Specific Fields

**Use actual language names:**

| Course Directory | Source Field | Target Field |
|------------------|--------------|--------------|
| `fra_for_eng` | `english` | `french` |
| `deu_for_eng` | `english` | `german` |
| `cmn_for_eng` | `english` | `mandarin` |
| `ita_for_eng` | `english` | `italian` |
| `jpn_for_eng` | `english` | `japanese` |
| `kor_for_eng` | `english` | `korean` |
| `por_for_eng` | `english` | `portuguese` |
| `rus_for_eng` | `english` | `russian` |

**Auto-detected from directory name!**

---

## ✅ Checklist for New Course

- [ ] Phase 1-3 complete (seed_pairs.json, lego_pairs.json)
- [ ] Generate v9 scaffolds: `node tools/phase-prep/phase5_prep_scaffolds_v9.cjs <course_dir>`
- [ ] Agent fills scaffolds (10 phrases per LEGO, explicit labels)
- [ ] Validate protocol: `python3 scripts/fixes/validate_protocol.py <course_dir>`
- [ ] Expect: ✅ PROTOCOL IS CONSISTENT!
- [ ] Generate manifest: `python3 services/phase7/generate_manifest.py <course_dir>`
- [ ] Run swap detector (should find 0): `python3 scripts/fixes/detect_all_swaps.py <course_dir>`
- [ ] Ship to production! 🚀

---

## 🐛 Troubleshooting

### "Invalid directory format"

**Error:**
```
ValueError: Invalid course directory format: my_course
Expected format: xxx_for_yyy (e.g., spa_for_eng)
```

**Fix:** Use standard format: `fra_for_eng`, `deu_for_eng`, etc.

### "Unknown language code"

**Error:**
```
ValueError: Unknown language code: xyz
```

**Fix:** Add language to map in:
- `tools/phase-prep/phase5_prep_scaffolds_v9.cjs` (line 26)
- `scripts/migration/migrate_to_explicit_labels.py` (line 23)

### Phase 7 Not Finding Fields

**Error:**
```
KeyError: 'known' or 'target'
```

**Fix:** Update to latest Phase 7 generator with dual-format support:
- `services/phase7/generate_manifest.py`
- Uses `normalize_pair()` and `normalize_lego_fields()` methods

---

## 📚 More Info

- **Full Protocol**: `docs/workflows/EXPLICIT_LABEL_PROTOCOL.md`
- **Implementation Summary**: `docs/workflows/EXPLICIT_LABEL_IMPLEMENTATION_SUMMARY.md`
- **CLAUDE.md**: General repo guide

---

**Ready to build the French course with ZERO swaps! 🇫🇷**
