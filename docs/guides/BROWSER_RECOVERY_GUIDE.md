# Browser Session Recovery Guide

You have ~25 browser tabs with completed basket generation that failed to push due to HTTP 403 errors. The data is **committed locally in each tab** but needs to be extracted.

## Quick Recovery Steps

### Method 1: Direct File Copy (Fastest)

For each Claude Code browser tab:

1. **Read the basket files:**
   ```bash
   cat public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S0652_baskets.json
   ```

2. **Copy the JSON output** (entire content)

3. **Save locally:**
   - Create a temp directory: `mkdir -p /tmp/recovered_baskets`
   - Save each file: paste content into `/tmp/recovered_baskets/seed_S0652_baskets.json`

4. **Merge into consolidated file:**
   ```bash
   node recover_from_browser.cjs /tmp/recovered_baskets/
   ```

### Method 2: Bulk Export (For Multiple Files)

In each browser tab, run this to list all basket files:
```bash
ls -1 public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S*_baskets.json
```

Then for each file, read and copy:
```bash
for f in public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S{0643..0668}_baskets.json; do
  [ -f "$f" ] && echo "==== $(basename $f) ====" && cat "$f" && echo ""
done
```

Copy all the output, save to a file, then split by the ==== markers.

### Method 3: Git Branch Export

If the browser still has the git repository:

1. **Check what's committed:**
   ```bash
   git log --oneline -n 1
   git show --name-only --format="" HEAD | grep seed_S
   ```

2. **Export the files:**
   ```bash
   git show HEAD:public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S0652_baskets.json
   ```

3. Copy output and save locally

## Recovery Priority

Based on your example tab (S0643-S0668), prioritize these ranges:

### High Priority (Largest Gaps)
1. **S0343-S0432** (90 seeds) - If you have tabs covering this range
2. **S0133-S0192** (60 seeds)
3. **S0043-S0072** (30 seeds)
4. **S0643-S0668** (26 seeds) ✓ You have this one!

### Medium Priority
- S0235-S0249 (15 seeds)
- S0496-S0507 (12 seeds)

### Low Priority (Small gaps, can regenerate if needed)
- Various 3-9 seed gaps

## Current Status

- ✅ **356 seeds** already consolidated in lego_baskets.json
- ✅ **S0643-S0668** (26 seeds) ready to recover from your example tab
- 📋 **~230 seeds** potentially in other browser tabs

## After Recovery

Once you've recovered all available seeds:

1. **Re-consolidate:**
   ```bash
   node consolidate_cmn_baskets.cjs
   ```

2. **Check coverage:**
   ```bash
   ls public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S*_baskets.json | wc -l
   ```

3. **Commit to main:**
   ```bash
   git add public/vfs/courses/cmn_for_eng/lego_baskets.json
   git commit -m "Consolidate Chinese baskets: recovered from browser sessions"
   git push origin main
   ```

## Tips

- **One tab at a time** - Don't close tabs until you've verified the data is copied
- **Check the completion status** - Look for "✅ All X Agents Complete!" messages
- **Verify file contents** - Each basket file should be valid JSON (starts with `{`)
- **Keep track** - Note which seed ranges you've recovered to avoid duplicates
