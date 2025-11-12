# Quick Start Guide: Complete Chinese Course

**Goal**: Finish generating the complete Chinese Mandarin course (574 seeds)
**Current Status**: 20/574 seeds complete (3.5%), infrastructure 80% ready
**Time to Complete**: 6-8 hours with Anthropic API
**Cost**: ~$75-125 (API usage)

---

## Option 1: Use Anthropic API (FASTEST - RECOMMENDED)

### Step 1: Review Sample Quality (15 minutes)

Check the 20 sample translations to verify quality meets expectations:

```bash
cd /Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/cmn_for_eng_574seeds

# View sample translations with grammar notes
cat phase_1_sample_translations.json | jq '.translations.C0001'

# View LEGO decomposition
cat phase_outputs/LEGO_BREAKDOWNS_SAMPLE.json | jq '.lego_breakdowns[0]'

# Check translation amino acids
ls amino_acids/translations/ | head -5
cat amino_acids/translations/*.json | head -50
```

**Questions to ask**:
- Do the Chinese translations sound natural?
- Are the 6 heuristics applied appropriately?
- Do the LEGOs make pedagogical sense?

### Step 2: Set Up API Key (5 minutes)

```bash
# Get your Anthropic API key from: https://console.anthropic.com/

# Set environment variable
export ANTHROPIC_API_KEY="sk-ant-..."

# Test API access
python3 -c "import anthropic; client = anthropic.Anthropic(); print('API connected!')"
```

### Step 3: Update Translation Script for API (10 minutes)

Edit `phase_1_translation_generator.py` to add API integration:

```python
# Add this at the top
import anthropic
import os

def call_claude_api(prompt):
    """Call Claude API with translation prompt"""
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    # Parse JSON response
    response_text = message.content[0].text
    # Extract JSON from response (may be wrapped in markdown)
    import json
    import re

    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())
    else:
        return json.loads(response_text)

# Replace create_mock_translation() with:
def create_translation(seed_id, english_text, intelligence):
    """Create real translation using Claude API"""
    prompt = create_translation_prompt(seed_id, english_text, intelligence)
    return call_claude_api(prompt)
```

### Step 4: Run Full Phase 1 (4-5 hours)

```bash
cd /Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/cmn_for_eng_574seeds

# Process all batches (6 batches of 100 seeds)
python3 phase_1_translation_generator.py

# This will:
# - Process 574 seeds in 6 batches
# - Call Claude API for each seed
# - Generate amino acid files
# - Save to VFS
```

**Monitor Progress**:
```bash
# Watch amino acids being created
watch -n 5 'ls amino_acids/translations/ | wc -l'

# Check latest translations
ls -lt amino_acids/translations/ | head -10
```

### Step 5: Validate Batch Quality (30 minutes)

After first 100 seeds complete:

```bash
# Random sample validation script
python3 << 'EOF'
import json
import random
from pathlib import Path

translation_dir = Path("amino_acids/translations")
files = list(translation_dir.glob("*.json"))
sample = random.sample(files, 10)

print("Validating 10 random translations...")
for f in sample:
    with open(f) as file:
        data = json.load(file)
        print(f"\nSeed: {data['seed_id']}")
        print(f"EN: {data['source']}")
        print(f"ZH: {data['target']}")
        print(f"Quality: {data['metadata'].get('quality_validated', 'Unknown')}")
EOF
```

**Check**:
- Are translations natural?
- Are heuristics applied?
- Is grammar correct?

If quality < 85/100: Adjust prompts and regenerate batch

### Step 6: Continue Through All Phases (6-8 hours total)

Once Phase 1 complete:

```bash
# Phase 2: Corpus Intelligence (30 min)
python3 phase_2_corpus_intelligence.py

# Phase 3: LEGO Decomposition (8-10 hours)
# Note: Create this script based on phase_3_lego_decomposition_sample.py
python3 phase_3_lego_decomposition.py

# Phase 3.5: Graph Construction (1 hour)
python3 phase_3.5_graph_construction.py

# Phase 4: Deduplication (1 hour)
python3 phase_4_deduplication.py

# Phase 5: Basket Generation (12-16 hours with extended thinking)
python3 phase_5_basket_generation.py --extended-thinking

# Phase 6: Introductions (2 hours)
python3 phase_6_introductions.py
```

**Note**: Phases 2-6 scripts need to be created based on APML spec. Sample scripts exist for reference.

### Step 7: Final Quality Validation (1 hour)

```bash
# Run quality check on 30 random seeds
python3 quality_validator.py --sample 30

# Generate quality report
python3 generate_quality_report.py > QUALITY_REPORT.md
```

**Target**: 85/100 overall quality score

### Step 8: Create APML Improvements Document (30 minutes)

Document Chinese-specific discoveries:

```bash
cat > APML_IMPROVEMENTS_cmn_for_eng.md << 'EOF'
# APML Improvements from Chinese Course Generation

## Phase 1 Enhancements

### Measure Words
- Always use measure words between numbers and nouns
- Example: 一个词 (one word), 两本书 (two books)

[Continue with other discoveries...]
EOF
```

---

## Option 2: Hybrid Approach (BALANCED)

Same as Option 1, but add human review:

### After Phase 1 Complete:

1. Sample 50 random translations
2. Have Chinese expert review for:
   - Naturalness
   - Grammar accuracy
   - Cultural appropriateness
3. Identify systematic issues
4. Regenerate affected batches if needed

**Time**: +2-4 hours for human review
**Quality**: 90-95/100 expected

---

## Option 3: Manual Translation (HIGHEST QUALITY)

If API access unavailable:

### Continue Manual Translation

1. Use `phase_1_sample_translations.json` as template
2. Translate seeds C0021 → C0574 (554 remaining)
3. For each seed:
   - Apply all 6 heuristics
   - Write grammar notes
   - Add pinyin
   - Verify FD_LOOP
4. Create amino acids: `python3 create_sample_amino_acids.py`

**Time**: 277-554 hours (30-60 min per seed)
**Quality**: Highest possible (native speaker quality)

---

## Phase Scripts to Create

Most scripts don't exist yet. Here's what needs to be built:

### Phase 2: `phase_2_corpus_intelligence.py`

```python
# Load all translation amino acids
# Calculate FCFS order (frequency-based)
# Assign utility scores (Frequency × Versatility × Simplicity)
# Map dependencies
# Output: phase_2_corpus_intelligence.json
```

### Phase 3: `phase_3_lego_decomposition.py`

```python
# Based on: phase_3_lego_decomposition_sample.py
# Scale to all 574 seeds
# Apply FD_LOOP test
# Apply TILING test
# Create BASE and COMPOSITE LEGOs
# Extract FEEDERs
# Output: LEGO_BREAKDOWNS_COMPLETE.json
```

### Phase 3.5: `phase_3.5_graph_construction.py`

```python
# Load all LEGO amino acids
# Detect adjacency patterns
# Build directed graph
# Calculate edge weights
# Output: phase_3.5_lego_graph.json
```

### Phase 4: `phase_4_deduplication.py`

```python
# Find duplicate LEGOs (same text, different provenance)
# Merge provenance (preserve all sources)
# Generate new deterministic UUIDs
# Output: deduplicated LEGOs
```

### Phase 5: `phase_5_basket_generation.py`

```python
# CRITICAL: Use extended thinking
# Select LEGOs using graph intelligence
# For each LEGO:
#   - Generate 3-5 e-phrases (7-10 words, perfect grammar)
#   - Generate 8 d-phrases (2/3/4/5-LEGO windows)
# Progressive vocabulary constraint (LEGO N uses only LEGOs 1 to N-1)
# Culminating LEGO rule (complete seed as e-phrase #1)
# Output: phase_5_baskets.json
```

### Phase 6: `phase_6_introductions.py`

```python
# For each basket:
#   - Identify known LEGOs (from previous baskets)
#   - Generate introduction phrases (known-only)
# Zero-unknowns rule (ABSOLUTE)
# Output: introduction amino acids
```

---

## Troubleshooting

### API Rate Limits

If hitting rate limits:

```python
import time

# Add delay between API calls
time.sleep(2)  # 2 seconds between calls

# Or use exponential backoff
from anthropic import RateLimitError

try:
    response = client.messages.create(...)
except RateLimitError:
    time.sleep(60)  # Wait 1 minute
    # Retry
```

### Translation Quality Issues

If quality < 85/100:

1. Check prompt formatting (are all 6 heuristics included?)
2. Review Phase 0 intelligence (is it being used?)
3. Add more examples to prompt
4. Use extended thinking for complex seeds

### LEGO Decomposition Failures

If FD_LOOP fails:

1. Check if chunk is too small (needs more context)
2. Check if chunk is too large (needs to be split)
3. Verify back-translation matches forward translation
4. Consider if chunk needs to be COMPOSITE (glue words present)

---

## Expected Timeline

| Phase | Time | Description |
|-------|------|-------------|
| Phase 1 | 4-5 hours | Translate all 574 seeds via API |
| Phase 2 | 30 min | Corpus intelligence |
| Phase 3 | 8-10 hours | LEGO decomposition (29 batches × 20 seeds) |
| Phase 3.5 | 1 hour | Graph construction |
| Phase 4 | 1 hour | Deduplication |
| Phase 5 | 12-16 hours | Basket generation (use extended thinking) |
| Phase 6 | 2 hours | Introductions |
| Validation | 2 hours | Quality check |
| **Total** | **30-40 hours** | Complete course |

---

## Success Checklist

- [ ] API key configured and tested
- [ ] Phase 1 script updated for API calls
- [ ] Batch 1 (100 seeds) translated and validated (≥85/100)
- [ ] All 574 seeds translated
- [ ] Phase 2 corpus intelligence generated
- [ ] Phase 3 LEGOs decomposed (≥90% FD_LOOP pass)
- [ ] Phase 3.5 graph constructed
- [ ] Phase 4 deduplication complete
- [ ] Phase 5 baskets generated (≥90/100 quality)
- [ ] Phase 6 introductions created
- [ ] 30 random seeds validated end-to-end (≥85/100)
- [ ] QUALITY_REPORT.md created
- [ ] APML_IMPROVEMENTS.md documented
- [ ] Course ready for Irish/Italian generation

---

## Files & Locations

### Input Files
- Canonical seeds: `/Users/tomcassidy/SSi/SSi_Course_Production/pipeline/phase1_seeds/original_574/canonical_seeds.json`
- APML spec: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`

### Working Directory
```
/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/cmn_for_eng_574seeds/
```

### Output Locations
- Translations: `amino_acids/translations/`
- LEGOs: `amino_acids/legos/`
- Deduplicated: `amino_acids/legos_deduplicated/`
- Baskets: `amino_acids/baskets/`
- Introductions: `amino_acids/introductions/`
- Phase outputs: `phase_outputs/`

### Reports
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/CHINESE_COURSE_OVERNIGHT_REPORT.md`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/EXECUTIVE_SUMMARY.md`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/QUICK_START_GUIDE.md` (this file)

---

## Need Help?

### Review Sample Work
```bash
cd /Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/cmn_for_eng_574seeds

# View Phase 0 intelligence
jq '.phase_1_recommendations' phase_outputs/phase_0_intelligence.json

# View sample translations
jq '.translations | keys' phase_1_sample_translations.json

# View LEGO breakdowns
jq '.lego_breakdowns[0]' phase_outputs/LEGO_BREAKDOWNS_SAMPLE.json
```

### Check Progress
```bash
# Count completed amino acids
ls amino_acids/translations/ | wc -l  # Should be 574 when complete
ls amino_acids/legos/ | wc -l  # LEGOs (varies)

# View latest files
ls -lt amino_acids/translations/ | head -5
```

### Validate Quality
```bash
# Random sample check
python3 -c "
import json, random, pathlib
files = list(pathlib.Path('amino_acids/translations').glob('*.json'))
sample = random.choice(files)
with open(sample) as f:
    data = json.load(f)
    print(f'Seed: {data[\"seed_id\"]}')
    print(f'EN: {data[\"source\"]}')
    print(f'ZH: {data[\"target\"]}')
"
```

---

## When Complete

1. **Create Quality Report**: Document overall scores
2. **Update APML**: Add Chinese-specific improvements
3. **Git Commit**: Save progress
4. **Proceed to Irish Course**: Apply lessons learned

**Goal**: 3 complete courses (Chinese, Irish, Italian) proving system generalization

---

**Ready to start? Begin with Step 1: Review Sample Quality**

Good luck! 加油! (Jiāyóu! - "Keep going!" in Chinese)
