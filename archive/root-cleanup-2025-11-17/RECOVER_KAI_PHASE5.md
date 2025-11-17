# Recovery Plan for Kai's Phase 5 Work

## Current Situation

✅ **Good News:**
- 67 agents completed successfully
- All outputs committed and pushed to GitHub branch
- Branch: `claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K`
- 73 files, 19,797 lines committed

❌ **Problem:**
- Files are in `/segments/segment_X/` instead of `/phase5_outputs/`
- Claude Code crashed after push (context overflow)
- Browser window may still have the content

---

## Option 1: Recover from Browser Window (IF STILL OPEN)

### Steps for Kai:

1. **DO NOT CLOSE THE BROWSER WINDOW**

2. **Check if conversation is visible:**
   - Can you still see the 67 agent responses?
   - Can you scroll through them?

3. **If YES - Ask Claude to extract the data:**
   ```
   Can you read all 67 agent outputs and create the proper phase5_outputs
   directory structure? Write each agent's output to:

   public/vfs/courses/cmn_for_eng/phase5_outputs/seed_sXXXX.json

   (where XXXX is the seed number each agent processed)
   ```

4. **Then commit and push:**
   ```
   git add public/vfs/courses/cmn_for_eng/phase5_outputs/
   git commit -m "Phase 5: Restructure outputs to phase5_outputs directory"
   git push origin claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K
   ```

---

## Option 2: Extract from Existing Branch (SAFEST)

The outputs ARE on GitHub, just in the wrong directory. We can fix this with a script.

### Steps:

1. **Checkout Kai's branch:**
   ```bash
   cd ~/Projects/SSi/ssi-dashboard-v7
   git fetch --all
   git checkout claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K
   ```

2. **Create restructure script:**
   ```bash
   cat > restructure_phase5.sh << 'EOF'
   #!/bin/bash

   # Create phase5_outputs directory
   mkdir -p public/vfs/courses/cmn_for_eng/phase5_outputs

   # Copy all agent outputs to phase5_outputs with proper naming
   # Agent 1 = S0001-S0010, Agent 2 = S0011-S0020, etc.

   for segment in {1..7}; do
     for file in public/vfs/courses/cmn_for_eng/segments/segment_$segment/agent_*.json; do
       if [ -f "$file" ]; then
         # Extract agent number from filename
         agent_num=$(basename "$file" | sed 's/agent_//' | sed 's/_output.json//')

         # Calculate seed range (each agent does 10 seeds)
         start_seed=$(( (agent_num - 1) * 10 + 1 ))

         # For agent 67, only do 8 seeds (S0661-S0668)
         if [ $agent_num -eq 67 ]; then
           end_seed=668
         else
           end_seed=$(( start_seed + 9 ))
         fi

         echo "Processing Agent $agent_num: S$(printf '%04d' $start_seed)-S$(printf '%04d' $end_seed)"

         # Read the agent output and extract individual seed baskets
         # This assumes the agent output has seed-level data
         cp "$file" "public/vfs/courses/cmn_for_eng/phase5_outputs/agent_${agent_num}_provisional.json"
       fi
     done
   done

   echo "✅ Restructuring complete!"
   echo "Files in: public/vfs/courses/cmn_for_eng/phase5_outputs/"
   ls -la public/vfs/courses/cmn_for_eng/phase5_outputs/
   EOF

   chmod +x restructure_phase5.sh
   ./restructure_phase5.sh
   ```

3. **Commit and push:**
   ```bash
   git add public/vfs/courses/cmn_for_eng/phase5_outputs/
   git commit -m "Phase 5: Restructure agent outputs to phase5_outputs directory"
   git push origin claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K
   ```

4. **Run merge script:**
   ```bash
   node scripts/phase5_merge_baskets.cjs public/vfs/courses/cmn_for_eng
   ```

---

## Option 3: Re-merge from Main (NUCLEAR OPTION)

If the outputs are corrupted or incomplete, merge what we have:

```bash
cd ~/Projects/SSi/ssi-dashboard-v7

# Switch to main
git checkout main

# Merge Kai's branch (ignoring conflicts)
git merge origin/claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K --no-ff

# Resolve conflicts (keep main's docs, Kai's outputs)
# Then commit
```

---

## What Went Wrong (Root Cause Analysis)

### The Problem: 67 Agents in ONE Window

Kai's Claude Code spawned **67 parallel agents in a single window** using the Task tool:

```javascript
// What happened:
await Task("process S0001-S0010")
await Task("process S0011-S0020")
// ... 67 times in one message
```

**Why this caused issues:**
1. **Context overflow**: 67 agent responses = 200K+ tokens
2. **Memory**: Holding 67 parallel tasks in working memory
3. **Crash**: Claude Code ran out of context after push

### The Solution: Segmented Orchestration

Our new dynamic segmentation (which we just added) prevents this:

**For 668 seeds:**
- Spawn 7 orchestrator windows (one every 5 seconds)
- Each orchestrator spawns 10 agents
- Total: 7 windows × 10 agents = 70 browser tabs
- Context per window: manageable

**What should have happened:**
```
Window 1: Orchestrator for S0001-S0100 (spawns 10 agents)
Window 2: Orchestrator for S0101-S0200 (spawns 10 agents)
...
Window 7: Orchestrator for S0601-S0668 (spawns 7 agents)
```

---

## Next Steps

**For Kai:**

1. **If browser is still open** → Option 1 (ask Claude to restructure)
2. **If browser is closed** → Option 2 (extract from branch)
3. **After recovery** → Test with 10-seed course to verify new segmentation works

**For Tom:**

1. Document this as a known issue
2. Add safeguards to prevent single-window 67-agent spawns
3. Test dynamic segmentation with small course first

---

## Prevention: Dynamic Segmentation Testing

The fix we just pushed will prevent this in the future. Test with 10 seeds:

```bash
# Create 10-seed test course
# Should spawn: 2 windows, 4 agents total (2+2)
# NOT: 1 window, 10 agents
```

Expected behavior:
- Window 1: Opens at t=0s, spawns 2 agents for S0001-S0005
- Window 2: Opens at t=5s, spawns 2 agents for S0006-S0010
- Both complete independently
- Auto-merge when done

---

## Files to Check

**On Kai's branch (`claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K`):**

✅ Has:
- 67 agent output files in `/segments/segment_X/`
- seed_pairs.json
- lego_pairs.json

❌ Missing:
- phase5_outputs directory with proper structure
- Merged lego_baskets.json

**After recovery, should have:**
- `/phase5_outputs/agent_01_provisional.json` (through agent_67)
- `/lego_baskets.json` (after merge script runs)
