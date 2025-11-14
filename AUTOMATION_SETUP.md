# Automation Server Setup Guide

## Overview

The `automation_server.cjs` is designed to work across multiple developer machines with different local paths and configurations. This guide explains how to set up your local environment.

## Quick Start

1. **Copy the example config:**
   ```bash
   cp .env.automation.example .env.automation
   ```

2. **Edit `.env.automation` with your local paths:**
   ```bash
   # Update VFS_ROOT to point to your SSi_Course_Production directory
   VFS_ROOT=/Users/YOUR_NAME/Path/To/SSi_Course_Production
   ```

3. **Start the automation server:**
   ```bash
   node automation_server.cjs
   ```

4. **Verify configuration:**
   You should see output like:
   ```
   ✅ Loaded .env.automation (local configuration)

   === Automation Server Configuration ===
   VFS_ROOT: /Users/YOUR_NAME/Path/To/SSi_Course_Production
   TRAINING_URL: https://ssi-dashboard-v7.vercel.app
   CHECKPOINT_MODE: manual
   USE_ORCHESTRATOR_V2: true
   GIT_AUTO_MERGE: true
   ======================================
   ```

## Configuration Files

### `.env.automation` (Local, Gitignored)
- **Purpose:** Per-developer settings that vary by machine
- **Location:** Root of dashboard repo
- **Git Status:** Gitignored (never committed)
- **Use For:**
  - `VFS_ROOT` - Path to your local SSi_Course_Production directory
  - `CHECKPOINT_MODE` - Your preferred automation mode
  - `AGENT_SPAWN_DELAY` - Browser tab spawn delay

### `.env` (Shared)
- **Purpose:** Shared configuration and API keys
- **Location:** Root of dashboard repo
- **Git Status:** Gitignored
- **Use For:**
  - API keys (Anthropic, ElevenLabs, AWS)
  - Shared settings

### `.env.automation.example` (Template)
- **Purpose:** Example configuration file
- **Location:** Root of dashboard repo
- **Git Status:** Committed to repo
- **Use For:** Template to copy for new developers

## Key Configuration Options

### VFS_ROOT (REQUIRED)
**What it is:** Path to your local course production directory containing `public/vfs/courses/`

**Why it matters:** Tom and Kai have different paths on their machines
- Tom: `/Users/tomcassidy/SSi/SSi_Course_Production`
- Kai: `/Users/kai/Projects/SSi_Course_Production` (example)

**How to set:**
```bash
# In .env.automation
VFS_ROOT=/Users/YOUR_NAME/Path/To/SSi_Course_Production
```

### CHECKPOINT_MODE
**What it is:** Controls automation behavior between phases

**Options:**
- `manual` - Pause between phases, require user approval (safest)
- `gated` - Auto-run phases but pause if validators fail (recommended)
- `full` - Full automation, no stops (use after validation)

**How to set:**
```bash
# In .env.automation
CHECKPOINT_MODE=manual
```

### USE_ORCHESTRATOR_V2
**What it is:** Enables the v2 orchestrator (7 segments × 10 agents = 70 agents)

**Options:**
- `true` - Use git branch-based orchestrator (recommended)
- `false` - Use legacy file-based system

**How to set:**
```bash
# In .env.automation
USE_ORCHESTRATOR_V2=true
```

### GIT_AUTO_MERGE
**What it is:** Automatically merge Claude agent branches to main

**Options:**
- `true` - Auto-merge `claude/*` branches (default)
- `false` - Manual merge required

**How to set:**
```bash
# In .env.automation
GIT_AUTO_MERGE=true
```

## Common Issues

### Issue: "VFS directory not found"
**Solution:** Check that `VFS_ROOT` in `.env.automation` points to your actual course production directory:
```bash
ls $VFS_ROOT  # Should show your courses
```

### Issue: "Can't find course files"
**Solution:** Make sure your VFS_ROOT points to the directory containing `public/vfs/courses/`, not just `vfs/courses/`

### Issue: "Configuration not loading"
**Solution:** Verify `.env.automation` exists and has correct syntax:
```bash
ls -la .env.automation
cat .env.automation
```

## For Kai: First-Time Setup

1. **Clone the dashboard repo:**
   ```bash
   cd ~/Projects
   git clone https://github.com/thomascassidyzm/ssi-dashboard-v7.git
   cd ssi-dashboard-v7
   ```

2. **Create your local automation config:**
   ```bash
   cp .env.automation.example .env.automation
   ```

3. **Edit with your paths:**
   ```bash
   nano .env.automation
   # Update VFS_ROOT to your SSi_Course_Production path
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Start the automation server:**
   ```bash
   node automation_server.cjs
   ```

6. **Start ngrok (in separate terminal):**
   ```bash
   ngrok http 3456
   ```

7. **Update your environment with ngrok URL:**
   ```bash
   # Copy the ngrok https URL, then:
   node deploy/local-bridge-registrar.js
   ```

## Directory Structure

```
ssi-dashboard-v7/                    # Dashboard repo (this repo)
├── automation_server.cjs            # Automation server (shared code)
├── .env.automation.example          # Template config (committed)
├── .env.automation                  # Your local config (gitignored)
├── .env                             # Shared config (gitignored)
└── public/
    └── vfs/
        └── courses/                 # Default VFS location

SSi_Course_Production/               # Course data repo (separate)
├── public/
│   └── vfs/
│       └── courses/
│           ├── spa_for_eng/
│           ├── cmn_for_eng/
│           └── ...
├── scripts/
└── docs/
```

## Philosophy

- **Same code, different configs:** Everyone uses the same `automation_server.cjs`
- **Local overrides:** Each developer has their own `.env.automation` with paths
- **Git-friendly:** Personal configs are gitignored, templates are committed
- **Explicit logging:** Server logs configuration on startup so you can verify

## Support

If you encounter issues:
1. Check the startup logs for configuration values
2. Verify your VFS_ROOT path exists
3. Ensure `.env.automation` is properly formatted
4. Ask Tom or check the automation server logs
