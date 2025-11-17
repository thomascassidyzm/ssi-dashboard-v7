# Recovery Instructions for Kai - Phase 5 Chinese Course Data

## ✅ Good News: The Work is NOT Lost!

All 67 agents completed successfully and generated Phase 5 practice baskets. The data is in the Claude Code on Web session, but it wasn't pushed to GitHub because `.gitignore` blocks `phase5_outputs/` files.

---

## 🚨 IMMEDIATE ACTION - Don't Close the Browser!

The Claude Code on Web session contains all 668 seeds worth of Phase 5 basket data. We need to extract it.

---

## Recovery Steps

### Option 1: Ask Claude to Force-Add the Files (EASIEST)

In the Claude Code on Web session, type:

```
All the phase5_outputs files are gitignored. Can you force-add them and push?

Use:
git add -f public/vfs/courses/cmn_for_eng/phase5_outputs/
git status
git commit -m "Phase 5: Add basket outputs (force-add ignored files)"
git push origin claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K
```

This will override the `.gitignore` and commit all 668 basket files.

---

### Option 2: Create a Tarball and Download (IF OPTION 1 FAILS)

Ask Claude:

```
Create a tarball of all phase5_outputs:

tar -czf phase5_cmn_outputs.tar.gz public/vfs/courses/cmn_for_eng/phase5_outputs/
ls -lh phase5_cmn_outputs.tar.gz
```

Then download the tarball and extract it locally.

---

### Option 3: Ask Claude to Show File List and Recreate (LAST RESORT)

If the files are somehow lost from the working directory but still in Claude's context:

```
Can you list all the phase5_outputs files that were created?

ls -la public/vfs/courses/cmn_for_eng/phase5_outputs/

Then show me the content of seed_s0001.json as an example.
```

Then we can ask Claude to recreate them from its memory of the agent responses.

---

## What Went Wrong

The `.gitignore` file has this rule (line 67):

```gitignore
public/vfs/courses/*/phase5_outputs/
```

This blocks ALL phase5_outputs directories from being committed. This is normally correct (we don't commit provisional outputs), but in this case we need them because:

1. The 67 agents ran on Web mode (not local)
2. The outputs aren't on a local machine we can access
3. We need them to run the merge script

---

## After Recovery: Run the Merge Script

Once the phase5_outputs files are on GitHub:

1. **Pull Kai's branch locally:**
   ```bash
   git fetch --all
   git checkout claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K
   ```

2. **Run the merge script:**
   ```bash
   node scripts/phase5_merge_baskets.cjs public/vfs/courses/cmn_for_eng
   ```

3. **This will create:**
   - `public/vfs/courses/cmn_for_eng/lego_baskets.json` (final merged file)
   - Validation reports showing GATE compliance, distribution, etc.

4. **Commit the final file:**
   ```bash
   git add public/vfs/courses/cmn_for_eng/lego_baskets.json
   git commit -m "Phase 5: Merge baskets for Chinese course (668 seeds)"
   git push origin claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K
   ```

5. **Merge to main:**
   ```bash
   git checkout main
   git merge claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K
   git push origin main
   ```

---

## Why This Happened

**Root Cause: 67 Agents in One Window**

Kai's orchestrator spawned **all 67 agents in a single Claude Code on Web session** instead of using our segmented approach (7 windows × 10 agents).

**What should have happened:**
- 7 orchestrator windows (spawned 5 seconds apart)
- Each orchestrator spawns 10 agents
- Each orchestrator commits its outputs independently
- Auto-merge happens on each window

**What actually happened:**
- 1 window spawned 67 agents using Task tool
- All 67 agents completed successfully ✅
- Context overflow after push (200K+ tokens)
- Claude Code crashed after git push
- Files created but gitignored

---

## Prevention: Use Dynamic Segmentation

The fix we just pushed prevents this:

**For 668 seeds:**
```javascript
const segmentation = calculateSegmentation(668)
// Returns:
{
  strategy: 'LARGE_MULTI',
  segmentCount: 7,
  totalAgents: 67,
  segments: [
    { segmentNumber: 1, seedCount: 100, agentCount: 10 },
    { segmentNumber: 2, seedCount: 100, agentCount: 10 },
    // ... segments 3-6 ...
    { segmentNumber: 7, seedCount: 68, agentCount: 7 }
  ]
}
```

This spawns 7 separate browser windows, preventing context overflow.

---

## Test with 10 Seeds First

Before running another 668-seed course, test the new segmentation:

**Create a 10-seed test course:**
- Should spawn: 2 windows, 4 agents total (2+2)
- NOT: 1 window, 10 agents

This verifies the segmentation works correctly.

---

## Summary for Kai

1. ✅ **Your work is NOT lost** - it's in Claude Code on Web
2. ✅ **All 67 agents completed successfully**
3. ❌ **Files weren't pushed** (gitignored)
4. 🔧 **Recovery: Force-add and push** (use Option 1 above)
5. ✅ **After recovery: Run merge script locally**
6. 🎉 **Then merge to main and celebrate!**

---

## Need Help?

If the recovery doesn't work, the data is definitely still in the Claude Code on Web session's context. We can ask Claude to:

1. Show the files that were created
2. Recreate them manually
3. Or export them one by one

The work is recoverable! 💪
