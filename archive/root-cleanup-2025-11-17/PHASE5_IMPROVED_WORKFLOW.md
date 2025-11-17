# Phase 5 Improved Workflow

## Problem with Current Approach

**Current workflow**:
1. Agent generates `S0171_basket.json` with metadata (336KB)
2. Agent pushes full file to GitHub branch
3. Automation server merges to `lego_baskets.json` (strips metadata)
4. Automation server deletes `phase5_outputs/S0171_basket.json`

**Issues**:
- ❌ 650 files × 336KB = 218MB pushed to GitHub unnecessarily
- ❌ Git history bloated with intermediate files
- ❌ Cleanup requires extra deletion logic
- ❌ Bandwidth wasted pushing/pulling large files

## Improved Workflow

**New approach**: Strip metadata BEFORE pushing to GitHub

### Step 1: Agent Generates Full Output (Local Only)

```
phase5_outputs/
└── S0171_basket_FULL.json  ← .gitignored (336KB with metadata)
```

```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0171",
  "generation_stage": "PHRASE_GENERATION_COMPLETE",
  "seed_pair": {
    "seed_id": "S0171",
    "known": "...",
    "target": "..."
  },
  "recent_context": {
    "previous_legos": [...],
    "thematic_progression": "..."
  },
  "legos": {
    "S0171L01": {
      "lego": [...],
      "practice_phrases": [...]
    },
    "S0171L02": {
      "lego": [...],
      "practice_phrases": [...]
    }
  }
}
```

**Purpose**: Debugging, local validation
**Saved to**: `phase5_outputs/S0171_basket_FULL.json`
**Git status**: `.gitignored` (never pushed)

### Step 2: Agent Strips Metadata

Extract just the baskets:

```json
{
  "S0171L01": {
    "lego": [
      { "known": "hola", "target": "hello" },
      { "known": "mundo", "target": "world" }
    ],
    "practice_phrases": [
      {
        "phrase": [
          { "known": "hola", "target": "hello" },
          { "known": "mundo", "target": "world" }
        ],
        "translation": "hello world"
      }
    ]
  },
  "S0171L02": {
    "lego": [...],
    "practice_phrases": [...]
  }
}
```

**Saved to**: `phase5_outputs/S0171_baskets.json` (clean, ~7.4KB)

### Step 3: Agent Pushes Clean File to GitHub

```bash
git checkout -b phase5-basket-S0171
git add phase5_outputs/S0171_baskets.json  # Only 7.4KB
git commit -m "Phase 5: Generated baskets for S0171"
git push origin phase5-basket-S0171
```

**File size**: ~7.4KB (97.8% smaller than full file)
**Git history**: Clean, only essential data

### Step 4: Automation Server Merges to Main

```javascript
async function mergePhase5Basket(branchName) {
  const seedId = extractSeedId(branchName); // "S0171"
  const basketFile = `phase5_outputs/${seedId}_baskets.json`;

  // 1. Read the stripped baskets (already clean!)
  const baskets = JSON.parse(fs.readFileSync(basketFile, 'utf8'));

  // 2. Merge into lego_baskets.json
  const legoBaskets = JSON.parse(fs.readFileSync('lego_baskets.json', 'utf8'));
  Object.assign(legoBaskets.baskets, baskets);
  legoBaskets.total_baskets = Object.keys(legoBaskets.baskets).length;
  legoBaskets.last_modified = new Date().toISOString();

  // 3. Write updated lego_baskets.json
  fs.writeFileSync('lego_baskets.json', JSON.stringify(legoBaskets, null, 2));

  // 4. Delete the individual basket file (cleanup)
  fs.unlinkSync(basketFile);

  // 5. Commit to main
  execSync('git add lego_baskets.json');
  execSync(`git commit -m "Phase 5: Merged basket for ${seedId}"`);
  execSync('git push origin main');

  console.log(`✅ Merged and cleaned up ${seedId}`);
}
```

## .gitignore Rules

Add to `.gitignore`:

```gitignore
# Phase 5: Full outputs with metadata (local debugging only)
phase5_outputs/*_FULL.json

# Keep the stripped basket files (these ARE pushed to branches)
!phase5_outputs/*_baskets.json
```

## File Structure

### Local Development Machine

```
public/vfs/courses/spa_for_eng/
├── lego_baskets.json (4.8MB)         ✅ Tracked
└── phase5_outputs/
    ├── S0001_basket_FULL.json        ❌ .gitignored (336KB)
    ├── S0001_baskets.json            ✅ Tracked (7.4KB)
    ├── S0002_basket_FULL.json        ❌ .gitignored
    ├── S0002_baskets.json            ✅ Tracked
    └── ...
```

### GitHub Repository (Branches)

```
Branch: phase5-basket-S0171
└── phase5_outputs/
    └── S0171_baskets.json            ✅ Only 7.4KB
```

### GitHub Repository (Main - After All Merges)

```
public/vfs/courses/spa_for_eng/
└── lego_baskets.json                 ✅ Only 4.8MB
```

**Final cleanup**: Delete entire `phase5_outputs/` directory after all baskets merged

## Agent Implementation

### Phase 5 Agent Pseudocode

```javascript
// Generate baskets with full metadata
const fullOutput = {
  version: "curated_v7_spanish",
  seed_id: seedId,
  generation_stage: "PHRASE_GENERATION_COMPLETE",
  seed_pair: seedPair,
  recent_context: recentContext,
  legos: generatedBaskets
};

// Save full output locally (for debugging)
const fullPath = `phase5_outputs/${seedId}_basket_FULL.json`;
fs.writeFileSync(fullPath, JSON.stringify(fullOutput, null, 2));
console.log(`📝 Saved full output to ${fullPath} (local only)`);

// Strip metadata - extract just the baskets
const strippedBaskets = fullOutput.legos;

// Save stripped version (for GitHub)
const strippedPath = `phase5_outputs/${seedId}_baskets.json`;
fs.writeFileSync(strippedPath, JSON.stringify(strippedBaskets, null, 2));
console.log(`✅ Saved stripped baskets to ${strippedPath}`);

// Push only the stripped file to GitHub
execSync(`git checkout -b phase5-basket-${seedId}`);
execSync(`git add ${strippedPath}`);
execSync(`git commit -m "Phase 5: Generated baskets for ${seedId}"`);
execSync(`git push origin phase5-basket-${seedId}`);
console.log(`🚀 Pushed clean baskets to GitHub (${getFileSize(strippedPath)})`);
```

## Storage Comparison

### Current Approach (Push Full Files)

**Local**:
- `phase5_outputs/`: 650 × 336KB = 218MB

**GitHub (650 branches)**:
- Each branch: 336KB
- Total: 650 × 336KB = 218MB

**GitHub (main after merge)**:
- `lego_baskets.json`: 4.8MB

**Total Git History**: 218MB + 4.8MB = ~223MB

### Improved Approach (Push Stripped Files)

**Local**:
- `phase5_outputs/*_FULL.json`: 650 × 336KB = 218MB (.gitignored)
- `phase5_outputs/*_baskets.json`: 650 × 7.4KB = 4.8MB (tracked on branches)

**GitHub (650 branches)**:
- Each branch: 7.4KB
- Total: 650 × 7.4KB = 4.8MB

**GitHub (main after merge)**:
- `lego_baskets.json`: 4.8MB

**Total Git History**: 4.8MB + 4.8MB = ~9.6MB

**Savings**: 223MB → 9.6MB (96% reduction in git repo size)

## Benefits

✅ **Cleaner git history** - Only essential data pushed
✅ **Faster git operations** - Less data to push/pull
✅ **Still have debug data** - Full files kept locally
✅ **Simpler cleanup** - No post-merge deletion needed
✅ **Bandwidth savings** - 97.8% less data per push
✅ **Repository size** - 96% smaller git history

## Implementation Checklist

1. ✅ Update `.gitignore` to ignore `*_FULL.json` files
2. ✅ Update Phase 5 agent to:
   - Save full output to `*_FULL.json` (local only)
   - Strip metadata and save to `*_baskets.json`
   - Push only stripped file to GitHub
3. ✅ Update merge handler to:
   - Read stripped baskets (no stripping needed)
   - Merge to `lego_baskets.json`
   - Delete individual basket file
4. ✅ Update finalization to delete entire `phase5_outputs/` directory

## Validation

After Phase 5 completes:

```bash
# Check local files
ls phase5_outputs/
# Should see both *_FULL.json and *_baskets.json

# Check git status
git status
# Should show *_FULL.json as untracked (gitignored)

# Check GitHub branch
git checkout phase5-basket-S0171
ls phase5_outputs/
# Should only see S0171_baskets.json (7.4KB)

# Check main after merge
git checkout main
ls public/vfs/courses/spa_for_eng/
# Should only see lego_baskets.json
```

## Example: Spanish Course (668 seeds → 2716 LEGOs)

**Old approach**:
- 650 branches × 336KB = 218MB pushed to GitHub
- Git history: ~223MB

**New approach**:
- 650 branches × 7.4KB = 4.8MB pushed to GitHub
- Git history: ~9.6MB
- Full debug files: 218MB (local only, .gitignored)

**Result**: 96% smaller repository, same debugging capability!
