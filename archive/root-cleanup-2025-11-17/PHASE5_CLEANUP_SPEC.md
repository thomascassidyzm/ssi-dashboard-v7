# Phase 5 Cleanup Specification

## Current Behavior (ISSUE)

After Phase 5 completes, we have:

```
public/vfs/courses/spa_for_eng/
├── lego_baskets.json (4.8MB) ✅ KEEP - Final output
└── phase5_outputs/ ❌ DELETE - 650 intermediate files
    ├── S0001_basket.json (336KB with metadata)
    ├── S0002_basket.json
    ├── ...
    └── s0668_basket.json
```

**Problem**: `phase5_outputs/` contains 650 files with metadata that are never deleted.

## Expected Behavior

### Step 1: Agent Generates Basket (with metadata)

```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0171",
  "generation_stage": "PHRASE_GENERATION_COMPLETE",
  "seed_pair": { ... },
  "recent_context": { ... },
  "legos": {
    "S0171L01": {
      "lego": [...],
      "practice_phrases": [...]
    }
  }
}
```

**Size**: ~336KB per file
**Purpose**: Debugging, intermediate output
**Location**: `phase5_outputs/S0171_basket.json`

### Step 2: Agent Pushes to GitHub Branch

Branch: `phase5-basket-S0171`
Contains: `phase5_outputs/S0171_basket.json` (with metadata)

### Step 3: Automation Server Merges to Main

1. **Extract just the baskets** (strip metadata):
```json
{
  "S0171L01": {
    "lego": [...],
    "practice_phrases": [...]
  },
  "S0171L02": { ... }
}
```

2. **Merge into `lego_baskets.json`**:
```json
{
  "version": "1.0.0",
  "generated_at": "2025-11-15T02:00:36.554Z",
  "total_baskets": 2716,
  "baskets": {
    "S0001L01": { ... },
    "S0171L01": { "lego": [...], "practice_phrases": [...] },  // Merged
    "S0171L02": { ... }
  }
}
```

3. **✅ COMMIT to main**: `lego_baskets.json` (updated)
4. **❌ DELETE**: `phase5_outputs/S0171_basket.json` (intermediate file)

### Step 4: Cleanup After All Merges Complete

Once all baskets merged:

```bash
# Verify lego_baskets.json has all expected baskets
EXPECTED_BASKETS=$(cat lego_pairs.json | jq '[.seeds[].legos[].id] | length')
ACTUAL_BASKETS=$(cat lego_baskets.json | jq '.baskets | keys | length')

if [ "$EXPECTED_BASKETS" -eq "$ACTUAL_BASKETS" ]; then
  echo "✅ All baskets merged, cleaning up..."
  rm -rf phase5_outputs/
  git add -A
  git commit -m "Phase 5: Cleanup intermediate basket files"
  git push origin main
else
  echo "❌ Missing baskets! Expected: $EXPECTED_BASKETS, Got: $ACTUAL_BASKETS"
fi
```

## GitHub Repository State

**After Phase 5 completion**, the VFS should contain:

```
public/vfs/courses/spa_for_eng/
├── seed_pairs.json              ✅ Phase 1 output
├── lego_pairs.json              ✅ Phase 3 output
├── lego_baskets.json            ✅ Phase 5 output (ONLY THIS FILE)
└── phase_5/                     ✅ Validation reports only
    └── basket_regeneration_manifest.json
```

**Deleted** (not in GitHub):
- ❌ `phase5_outputs/` - All 650 individual basket files
- ❌ `phase5_scaffolds/` - Temporary scaffolding

## Implementation

### Update Phase 5 Merge Logic

**File**: `services/automation/automation_server.js` (or equivalent merge handler)

```javascript
async function mergePhase5Basket(branchName) {
  const seedId = extractSeedId(branchName); // e.g., "S0171"
  const basketFile = `phase5_outputs/${seedId}_basket.json`;

  // 1. Read the basket file (with metadata)
  const fullBasket = JSON.parse(fs.readFileSync(basketFile, 'utf8'));

  // 2. Extract just the baskets object (strip metadata)
  const strippedBaskets = fullBasket.legos;

  // 3. Merge into lego_baskets.json
  const legoBaskets = JSON.parse(fs.readFileSync('lego_baskets.json', 'utf8'));
  Object.assign(legoBaskets.baskets, strippedBaskets);
  legoBaskets.total_baskets = Object.keys(legoBaskets.baskets).length;
  legoBaskets.last_modified = new Date().toISOString();

  // 4. Write updated lego_baskets.json
  fs.writeFileSync('lego_baskets.json', JSON.stringify(legoBaskets, null, 2));

  // 5. Delete the intermediate basket file
  fs.unlinkSync(basketFile);

  // 6. Commit to main
  execSync('git add lego_baskets.json');
  execSync(`git commit -m "Phase 5: Merged basket for ${seedId}"`);
  execSync('git push origin main');

  console.log(`✅ Merged and cleaned up ${seedId}`);
}
```

### Cleanup After All Baskets Merged

```javascript
async function finalizePhase5(courseCode) {
  const legoPairsPath = `public/vfs/courses/${courseCode}/lego_pairs.json`;
  const legoBasketsPath = `public/vfs/courses/${courseCode}/lego_baskets.json`;

  // Count expected vs actual baskets
  const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
  const expectedBaskets = legoPairs.seeds.flatMap(s => s.legos).length;

  const legoBaskets = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
  const actualBaskets = Object.keys(legoBaskets.baskets).length;

  if (expectedBaskets !== actualBaskets) {
    throw new Error(`Missing baskets! Expected: ${expectedBaskets}, Got: ${actualBaskets}`);
  }

  // Delete phase5_outputs directory
  const outputsDir = `public/vfs/courses/${courseCode}/phase5_outputs`;
  if (fs.existsSync(outputsDir)) {
    fs.rmSync(outputsDir, { recursive: true });
    console.log(`🗑️  Deleted ${outputsDir}`);
  }

  // Delete phase5_scaffolds directory
  const scaffoldsDir = `public/vfs/courses/${courseCode}/phase5_scaffolds`;
  if (fs.existsSync(scaffoldsDir)) {
    fs.rmSync(scaffoldsDir, { recursive: true });
    console.log(`🗑️  Deleted ${scaffoldsDir}`);
  }

  // Commit cleanup
  execSync('git add -A');
  execSync('git commit -m "Phase 5: Final cleanup - removed intermediate files"');
  execSync('git push origin main');

  console.log('✅ Phase 5 cleanup complete');
}
```

## Verification

After Phase 5 completes:

```bash
# Should only have these Phase 5-related files:
ls public/vfs/courses/spa_for_eng/ | grep -E "(basket|phase5)"

# Expected output:
lego_baskets.json
phase_5/

# Should NOT exist:
phase5_outputs/  ❌
phase5_scaffolds/ ❌
```

## Storage Savings

**Before cleanup**:
- `lego_baskets.json`: 4.8MB
- `phase5_outputs/`: 650 × 336KB = ~218MB
- **Total**: ~223MB

**After cleanup**:
- `lego_baskets.json`: 4.8MB
- **Total**: 4.8MB

**Savings**: 218MB (97.8% reduction)

## Git History

The intermediate files are still in git history on the `phase5-basket-*` branches, so they're not lost if needed for debugging.

To retrieve an intermediate file:
```bash
git checkout phase5-basket-S0171 -- phase5_outputs/S0171_basket.json
```

## Summary

✅ **Metadata stripping**: Already happening (consolidated file is clean)
❌ **File cleanup**: NOT happening (need to implement)
🔧 **Fix**: Add cleanup logic to merge handler and finalization step
