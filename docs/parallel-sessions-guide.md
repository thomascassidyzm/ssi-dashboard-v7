# Parallel Claude Code Sessions - Automation Guide

This guide explains how to use parallel Claude Code browser sessions to generate segments, then automatically merge and deploy them.

## Overview

```
[Claude Session 1] ──> segment-1.json ──> git push ──> claude/segment-xxx-1 ─┐
[Claude Session 2] ──> segment-2.json ──> git push ──> claude/segment-xxx-2 ─┤
[Claude Session 3] ──> segment-3.json ──> git push ──> claude/segment-xxx-3 ─┼─> [Automation Server]
[Claude Session N] ──> segment-N.json ──> git push ──> claude/segment-xxx-N ─┘         │
                                                                                         ↓
                                                                              Watch branches
                                                                                         ↓
                                                                              Merge segments
                                                                                         ↓
                                                                            Push to main branch
                                                                                         ↓
                                                                            Vercel auto-deploys
                                                                                         ↓
                                                                            Delete claude/* branches
```

## For Claude Code Sessions

Each parallel session should:

1. **Generate its segment** (JSON file)
2. **Push using the script**:

```bash
node scripts/push_segment.cjs path/to/segment.json
```

The script automatically:
- Validates the JSON
- Commits to the current claude/* branch
- Pushes to GitHub with retry logic
- Handles network errors gracefully

### Example Usage in Claude Code

```javascript
// After generating your segment
const segment = {
  id: 'segment-1',
  data: [...your data...]
};

// Write to file
const fs = require('fs');
fs.writeFileSync('staging/segment-1.json', JSON.stringify(segment, null, 2));

// Push to GitHub (run via Bash tool)
// node scripts/push_segment.cjs staging/segment-1.json
```

### Custom Commit Messages

```bash
node scripts/push_segment.cjs segment-5.json "Add segment 5: processed items 100-200"
```

## For Your Automation Server

The automation server runs the watcher script to detect, merge, and deploy.

### One-Time Merge

Merge all waiting segments immediately:

```bash
node scripts/watch_and_merge_branches.cjs \
  --pattern "claude/segment-*" \
  --output "public/vfs/merged_data.json" \
  --auto-delete
```

### Watch Mode (Recommended)

Continuously watch for new segments and merge when ready:

```bash
node scripts/watch_and_merge_branches.cjs \
  --pattern "claude/segment-*" \
  --output "public/vfs/merged_data.json" \
  --interval 30000 \
  --min-branches 5 \
  --auto-delete \
  --watch
```

This will:
- Check every 30 seconds
- Wait until at least 5 branches exist
- Merge all segments
- Push to main (triggers Vercel deploy)
- Delete the claude/* branches

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `--pattern` | Branch pattern to match | `claude/segment-*` |
| `--output` | Output file path | `merged_output.json` |
| `--staging-dir` | Directory for segment files | `staging/` |
| `--interval` | Poll interval (ms) | `10000` |
| `--min-branches` | Minimum branches before merge | `1` |
| `--auto-delete` | Delete branches after merge | `false` |
| `--watch` | Keep watching (vs run once) | `false` |

## Integration with automation_server.cjs

To integrate the watcher into your existing automation server:

### Option 1: Run as Separate Process (Recommended)

Add to your PM2 ecosystem:

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'automation-server',
      script: 'automation_server.cjs',
      // ... existing config
    },
    {
      name: 'segment-watcher',
      script: 'scripts/watch_and_merge_branches.cjs',
      args: '--watch --pattern claude/segment-* --output public/vfs/merged_data.json --auto-delete',
      autorestart: true,
      watch: false
    },
    // ... other apps
  ]
};
```

Then:
```bash
pm2 restart ecosystem.config.cjs
```

### Option 2: Embed in automation_server.cjs

Add to your existing automation server:

```javascript
// automation_server.cjs

const { spawn } = require('child_process');

// Start the watcher as a child process
function startSegmentWatcher() {
  const watcher = spawn('node', [
    'scripts/watch_and_merge_branches.cjs',
    '--watch',
    '--pattern', 'claude/segment-*',
    '--output', 'public/vfs/merged_data.json',
    '--auto-delete'
  ]);

  watcher.stdout.on('data', (data) => {
    console.log(`[Segment Watcher] ${data}`);
  });

  watcher.stderr.on('data', (data) => {
    console.error(`[Segment Watcher Error] ${data}`);
  });

  return watcher;
}

// Call during server startup
const segmentWatcher = startSegmentWatcher();
```

### Option 3: API Endpoint

Trigger merges on-demand via API:

```javascript
// automation_server.cjs

const { execSync } = require('child_process');

app.post('/api/merge-segments', (req, res) => {
  try {
    console.log('Merging segments...');
    const output = execSync(
      'node scripts/watch_and_merge_branches.cjs --pattern claude/segment-* --output public/vfs/merged_data.json --auto-delete',
      { encoding: 'utf-8' }
    );

    res.json({ success: true, output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

Then trigger from your dashboard:
```bash
curl -X POST http://localhost:3456/api/merge-segments
```

## Custom Merge Logic

The default merger does simple object/array merging. For custom merge logic (like your existing phase merge scripts), create a custom merger:

```javascript
// scripts/merge_segments_custom.cjs

const fs = require('fs');
const path = require('path');

function mergeSegments(segmentFiles, outputFile) {
  // Your custom merge logic here
  const merged = {
    version: '1.0.0',
    merged_at: new Date().toISOString(),
    baskets: {}
  };

  segmentFiles.forEach(file => {
    const segment = JSON.parse(fs.readFileSync(file, 'utf-8'));

    // Example: merge baskets (like phase5_merge_baskets.cjs)
    if (segment.baskets) {
      Object.assign(merged.baskets, segment.baskets);
    }
  });

  // Validate merged data
  validateMergedData(merged);

  // Write output
  fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));

  return merged;
}

function validateMergedData(data) {
  // Add your validation logic here
  // Example: check required fields, validate structure, etc.
}

module.exports = { mergeSegments };
```

Then modify `watch_and_merge_branches.cjs` to use your custom merger at line ~180.

## Workflow Example

### Parallel Session Workflow

1. **Start automation server** (if not already running):
   ```bash
   pm2 start ecosystem.config.cjs
   ```

2. **Start segment watcher** (watches for new branches):
   ```bash
   node scripts/watch_and_merge_branches.cjs --watch --min-branches 10 --auto-delete
   ```

3. **Launch parallel Claude Code sessions** (10 browser windows):
   - Each session works on its segment
   - Each generates `segment-N.json`
   - Each runs: `node scripts/push_segment.cjs staging/segment-N.json`

4. **Automation server detects** when all 10 branches exist

5. **Merger runs automatically**:
   - Pulls all segment files
   - Merges into final JSON
   - Pushes to main
   - Vercel deploys
   - Deletes claude/* branches

## Troubleshooting

### Sessions can't push

**Error**: `HTTP 403 on push`

**Solution**: Branch name must start with `claude/` and end with session ID. Claude Code handles this automatically.

### Merger not detecting branches

**Error**: "No branches found"

**Solution**:
- Check pattern matches: `git branch -r | grep segment`
- Ensure sessions have pushed: `git fetch --all`
- Verify pattern in watcher config

### Merge conflicts

**Error**: Conflicts when pushing to main

**Solution**:
- Ensure segments don't overlap
- Use unique keys for each segment
- Pull latest main before merge

### Network timeouts

Both scripts have retry logic with exponential backoff (2s, 4s, 8s, 16s). If timeouts persist:
- Check internet connection
- Verify GitHub is accessible
- Increase retry delays in scripts

## Advanced: Custom Branch Patterns

For different types of parallel work, use different patterns:

```bash
# Basket generation
--pattern "claude/baskets-*"

# LEGO extraction
--pattern "claude/legos-*"

# Introduction text
--pattern "claude/intros-*"

# Generic segments
--pattern "claude/segment-*"
```

Run multiple watchers for different patterns:

```bash
# Terminal 1: Watch basket branches
node scripts/watch_and_merge_branches.cjs --pattern "claude/baskets-*" --output public/vfs/courses/spa_for_eng/lego_baskets.json --watch

# Terminal 2: Watch LEGO branches
node scripts/watch_and_merge_branches.cjs --pattern "claude/legos-*" --output public/vfs/courses/spa_for_eng/lego_pairs.json --watch
```

## Benefits of This Approach

1. **No GitHub API tokens needed** - Uses existing git workflow
2. **Automatic branch management** - Claude Code creates branches, watcher deletes them
3. **Single source of truth** - All data in git, Vercel deploys from main
4. **Parallel processing** - N sessions work simultaneously
5. **Fault tolerant** - Network retry logic, validation before merge
6. **Flexible** - Configure patterns, thresholds, merge logic
7. **No manual steps** - Fully automated from push to deploy

## Next Steps

1. Test with a small batch (2-3 sessions)
2. Verify merge logic produces correct output
3. Scale up to full parallelization (50+ sessions)
4. Monitor via automation server logs
5. Integrate with existing phase workflows
