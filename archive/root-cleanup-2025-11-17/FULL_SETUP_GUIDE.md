# Complete SSi Automation System Setup Guide

## Overview: What's the Same vs. What's Different

### ✅ SAME for Everyone (Shared Code)
- **automation_server.cjs** - Main automation server code
- **ecosystem.config.js** - PM2 process configuration
- **Scripts** (`scripts/`, `services/`) - All automation scripts
- **Phase intelligence** (`public/docs/phase_intelligence/`) - Phase instructions
- **Dashboard code** (`src/`) - Vue.js dashboard frontend
- **Git workflow** - Branch merging, commit patterns
- **Port** - 3456 (automation server)

### ⚙️ DIFFERENT for Each Developer (Personal Config)
- **VFS_ROOT** - Path to your local SSi_Course_Production directory
- **NGROK_DOMAIN** - Your personal ngrok domain
- **Working directory paths** - Different on each Mac
- **PM2 process IDs** - Different PM2 state per machine
- **API keys** - Different credentials (optional)
- **.env.automation** - Your personal config file (gitignored)

---

## Quick Start Checklist

- [ ] 1. Clone dashboard repo
- [ ] 2. Install Node.js and dependencies
- [ ] 3. Create `.env.automation` with your paths
- [ ] 4. Set up ngrok with your domain
- [ ] 5. Start processes with PM2
- [ ] 6. Verify everything is running

---

## Detailed Setup Instructions

### 1. Prerequisites

#### Install Required Software

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (via NVM - recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# Install PM2 (process manager)
npm install -g pm2

# Install ngrok
brew install ngrok
```

#### Create ngrok Account
1. Go to https://dashboard.ngrok.com/signup
2. Get your free static domain (e.g., `kai-ssi.ngrok-free.dev`)
3. Save your domain - you'll need it for config

---

### 2. Clone Repositories

```bash
# Create SSi project directory
mkdir -p ~/Projects/SSi
cd ~/Projects/SSi

# Clone dashboard repo (contains automation server)
git clone https://github.com/thomascassidyzm/ssi-dashboard-v7.git
cd ssi-dashboard-v7

# Install dependencies
npm install

# Clone course production repo (contains actual course data)
cd ~/Projects/SSi
git clone https://github.com/thomascassidyzm/SSi_Course_Production.git

# Your directory structure should now be:
# ~/Projects/SSi/
#   ├── ssi-dashboard-v7/          (automation server + dashboard)
#   └── SSi_Course_Production/     (course data + VFS)
```

---

### 3. Create Your Personal Configuration

```bash
cd ~/Projects/SSi/ssi-dashboard-v7

# Copy the example config
cp .env.automation.example .env.automation

# Edit with your personal settings
nano .env.automation
```

#### Your `.env.automation` should look like:

```bash
# =============================================================================
# [YOUR NAME]'s Personal Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# VFS Root Path (REQUIRED - UPDATE THIS!)
# -----------------------------------------------------------------------------
# Point to YOUR local SSi_Course_Production directory
VFS_ROOT=/Users/YOUR_USERNAME/Projects/SSi/SSi_Course_Production/public/vfs/courses

# -----------------------------------------------------------------------------
# Dashboard URL
# -----------------------------------------------------------------------------
TRAINING_URL=https://ssi-dashboard-v7.vercel.app

# -----------------------------------------------------------------------------
# Checkpoint Mode
# -----------------------------------------------------------------------------
CHECKPOINT_MODE=manual

# -----------------------------------------------------------------------------
# Orchestrator Configuration
# -----------------------------------------------------------------------------
USE_ORCHESTRATOR_V2=true
AGENT_SPAWN_DELAY=5000
GIT_AUTO_MERGE=true

# -----------------------------------------------------------------------------
# Ngrok Configuration (UPDATE THIS!)
# -----------------------------------------------------------------------------
# Your personal ngrok domain
NGROK_DOMAIN=YOUR-DOMAIN.ngrok-free.dev

# -----------------------------------------------------------------------------
# API Keys (OPTIONAL - only if you need audio/regeneration features)
# -----------------------------------------------------------------------------
# ANTHROPIC_API_KEY=your_key_here
# ELEVENLABS_API_KEY=your_key_here
# AWS_ACCESS_KEY_ID=your_key_here
# AWS_SECRET_ACCESS_KEY=your_secret_here
# AWS_REGION=eu-west-1
# S3_BUCKET=your-bucket-name
```

**Important values to update:**
- `VFS_ROOT` - Path to your local course data
- `NGROK_DOMAIN` - Your ngrok domain

---

### 4. Set Up PM2 (Process Manager)

PM2 will keep your automation server running continuously.

```bash
cd ~/Projects/SSi/ssi-dashboard-v7

# Start the automation server with PM2
pm2 start ecosystem.config.js

# Save the PM2 process list (so it persists across reboots)
pm2 save

# Enable PM2 startup on boot (run once)
pm2 startup

# Check status
pm2 list
```

**Expected output:**
```
┌────┬──────────────────┬─────────┬─────────┬──────────┬────────┐
│ id │ name             │ mode    │ status  │ cpu      │ memory │
├────┼──────────────────┼─────────┼─────────┼──────────┼────────┤
│ 0  │ ssi-automation   │ fork    │ online  │ 0%       │ 50mb   │
└────┴──────────────────┴─────────┴─────────┴──────────┴────────┘
```

#### Verify Configuration
Check the logs to ensure your config loaded correctly:

```bash
pm2 logs ssi-automation --lines 20
```

You should see:
```
✅ Loaded .env.automation (local configuration)

=== Automation Server Configuration ===
VFS_ROOT: /Users/YOUR_USERNAME/Projects/SSi/SSi_Course_Production/public/vfs/courses
TRAINING_URL: https://ssi-dashboard-v7.vercel.app
CHECKPOINT_MODE: manual
USE_ORCHESTRATOR_V2: true
GIT_AUTO_MERGE: true
======================================
```

---

### 5. Set Up Ngrok Tunnel

Ngrok creates a public URL that points to your local automation server (port 3456).

#### Option A: Run ngrok manually (recommended initially)

```bash
# Start ngrok with your domain
ngrok http --domain=YOUR-DOMAIN.ngrok-free.dev 3456
```

Keep this terminal open. You should see:
```
Session Status    online
Account           Your Name (Plan: Free)
Forwarding        https://YOUR-DOMAIN.ngrok-free.dev -> http://localhost:3456
```

#### Option B: Run ngrok with PM2 (for persistence)

**Create ngrok config file:**
```bash
# Create ~/.ngrok/ngrok.yml if it doesn't exist
mkdir -p ~/.ngrok
nano ~/.ngrok/ngrok.yml
```

**Add:**
```yaml
version: "2"
authtoken: YOUR_NGROK_AUTHTOKEN
tunnels:
  ssi:
    addr: 3456
    proto: http
    domain: YOUR-DOMAIN.ngrok-free.dev
```

**Add ngrok to PM2:**
```bash
pm2 start ngrok -- start --all --config=$HOME/.ngrok/ngrok.yml
pm2 save
```

---

### 6. Test Your Setup

#### Check automation server is running:
```bash
curl http://localhost:3456/api/health
# Should return: {"status":"ok"}
```

#### Check ngrok tunnel:
```bash
curl https://YOUR-DOMAIN.ngrok-free.dev/api/health
# Should return: {"status":"ok"}
```

#### Check VFS access:
```bash
# List courses
curl http://localhost:3456/api/courses | jq
```

---

## Daily Workflow

### Starting Everything

If you use PM2 with startup enabled, everything starts automatically on boot.

**Manual start:**
```bash
# Start automation server
pm2 start ssi-automation

# Start ngrok (if using PM2)
pm2 start ngrok

# OR start ngrok manually in separate terminal
ngrok http --domain=YOUR-DOMAIN.ngrok-free.dev 3456
```

### Checking Status

```bash
# List all PM2 processes
pm2 list

# View logs (live tail)
pm2 logs ssi-automation

# View errors only
pm2 logs ssi-automation --err

# Show detailed process info
pm2 show ssi-automation
```

### Stopping/Restarting

```bash
# Restart automation server (e.g., after pulling code changes)
pm2 restart ssi-automation

# Stop automation server
pm2 stop ssi-automation

# Stop all PM2 processes
pm2 stop all

# Delete process from PM2
pm2 delete ssi-automation
```

---

## Configuration Reference

### Environment Variables Priority

Configuration is loaded in this order (last wins):

1. **Hardcoded defaults** (in automation_server.cjs)
2. **.env** (shared config, gitignored)
3. **.env.automation** (personal config, gitignored) ← **YOUR SETTINGS**

### Key Configuration Options

| Variable | Description | Tom's Value | Kai's Value |
|----------|-------------|-------------|-------------|
| `VFS_ROOT` | Path to course data | `/Users/tomcassidy/SSi/SSi_Course_Production/public/vfs/courses` | `/Users/kai/Projects/SSi/SSi_Course_Production/public/vfs/courses` |
| `NGROK_DOMAIN` | Ngrok tunnel domain | `mirthlessly-nonanesthetized-marilyn.ngrok-free.dev` | `YOUR-DOMAIN.ngrok-free.dev` |
| `PORT` | Automation server port | `3456` | `3456` |
| `TRAINING_URL` | Dashboard URL | `https://ssi-dashboard-v7.vercel.app` | `https://ssi-dashboard-v7.vercel.app` |
| `CHECKPOINT_MODE` | Automation behavior | `manual` | `manual` |
| `USE_ORCHESTRATOR_V2` | v2 orchestrator | `true` | `true` |
| `GIT_AUTO_MERGE` | Auto-merge branches | `true` | `true` |

---

## Troubleshooting

### Issue: "VFS_ROOT directory not found"

**Check your path:**
```bash
# Check what VFS_ROOT is set to
pm2 logs ssi-automation | grep VFS_ROOT

# Verify directory exists
ls -la /path/from/above
```

**Fix:** Update `VFS_ROOT` in `.env.automation` to point to your actual directory.

---

### Issue: "Ngrok tunnel not working"

**Check ngrok is running:**
```bash
# Check if ngrok process exists
ps aux | grep ngrok

# Test local server first
curl http://localhost:3456/api/health
```

**Check ngrok URL:**
```bash
# Visit: http://localhost:4040
# This shows the ngrok web interface with tunnel status
```

---

### Issue: "PM2 process keeps restarting"

**Check logs:**
```bash
pm2 logs ssi-automation --err
```

**Common causes:**
- Missing `.env.automation` file
- Invalid VFS_ROOT path
- Port 3456 already in use
- Missing Node.js modules

**Fix:**
```bash
# Reinstall dependencies
npm install

# Check port availability
lsof -i :3456

# Restart with fresh logs
pm2 delete ssi-automation
pm2 start ecosystem.config.js
pm2 logs ssi-automation
```

---

### Issue: "Changes not showing up"

PM2 watches for file changes and auto-restarts, but you can force a restart:

```bash
pm2 restart ssi-automation --update-env
```

---

## Useful Commands Cheat Sheet

```bash
# PM2 Management
pm2 list                          # List all processes
pm2 start ecosystem.config.js     # Start automation server
pm2 restart ssi-automation        # Restart automation server
pm2 stop ssi-automation           # Stop automation server
pm2 logs ssi-automation           # View logs (live)
pm2 logs ssi-automation --err     # View errors only
pm2 show ssi-automation           # Show detailed info
pm2 save                          # Save current process list
pm2 startup                       # Enable startup on boot

# Ngrok
ngrok http --domain=YOUR-DOMAIN.ngrok-free.dev 3456  # Start tunnel
ngrok config check                # Verify config
curl http://localhost:4040/api/tunnels  # List active tunnels (JSON)

# Testing
curl http://localhost:3456/api/health           # Test local server
curl https://YOUR-DOMAIN.ngrok-free.dev/api/health  # Test public URL
curl http://localhost:3456/api/courses | jq    # List courses (pretty)

# Git
git pull origin main              # Update code
git status                        # Check repo status
git branch -a | grep claude       # List claude agent branches

# VFS
ls public/vfs/courses/            # List local courses (relative to dashboard)
ls $VFS_ROOT                      # List courses (from VFS_ROOT env var)
```

---

## For Kai: Personalized Setup Summary

Here's your specific configuration:

### Step 1: Create `.env.automation`
```bash
cd ~/Projects/SSi/ssi-dashboard-v7
cp .env.automation.example .env.automation
nano .env.automation
```

### Step 2: Update these values
```bash
VFS_ROOT=/Users/kai/Projects/SSi/SSi_Course_Production/public/vfs/courses
NGROK_DOMAIN=YOUR-DOMAIN.ngrok-free.dev  # (get from ngrok dashboard)
```

### Step 3: Start everything
```bash
# Start automation server with PM2
pm2 start ecosystem.config.js
pm2 save

# Start ngrok (separate terminal)
ngrok http --domain=YOUR-DOMAIN.ngrok-free.dev 3456
```

### Step 4: Verify
```bash
pm2 logs ssi-automation  # Should show your VFS_ROOT path
curl http://localhost:3456/api/health  # Should return {"status":"ok"}
```

---

## Support

If you encounter issues:
1. ✅ Check the configuration logs: `pm2 logs ssi-automation`
2. ✅ Verify your `.env.automation` file exists and has correct paths
3. ✅ Test local server first: `curl http://localhost:3456/api/health`
4. ✅ Then test ngrok: `curl https://YOUR-DOMAIN.ngrok-free.dev/api/health`
5. ✅ Ask Tom or check GitHub issues

---

## Updates and Maintenance

### Updating Code
```bash
cd ~/Projects/SSi/ssi-dashboard-v7

# Pull latest changes
git pull origin main

# Reinstall dependencies (if package.json changed)
npm install

# Restart PM2 processes
pm2 restart all
```

### Updating Configuration
```bash
# Edit your personal config
nano .env.automation

# Restart to apply changes
pm2 restart ssi-automation --update-env
```

### Viewing What Changed
```bash
# See recent commits
git log --oneline -10

# See what changed in automation server
git diff HEAD~1 automation_server.cjs
```

---

## Philosophy

- **Same code, different configs** - Everyone uses identical automation_server.cjs
- **Personal overrides via .env.automation** - Your machine-specific settings
- **Git-friendly** - Personal configs are gitignored, only templates committed
- **Explicit logging** - Server logs configuration on startup for transparency
- **PM2 for reliability** - Process management with auto-restart and boot persistence
- **Ngrok for tunneling** - Expose local server to Vercel dashboard
