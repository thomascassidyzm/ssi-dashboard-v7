# Setup Explanation for Kai: Local Automation vs. Shared Dashboard

## The Two Systems (and Why They're Separate)

### 1. **The Dashboard (Shared, Identical for Everyone)**
- **URL**: https://ssi-dashboard-v7.vercel.app
- **Purpose**: View courses, test them, see course data
- **Files served**: From GitHub SSoT (Single Source of Truth)
- **Who uses it**: Tom, Kai, students, anyone with the URL
- **Configuration**: NONE - it's the same for everyone

**Key point**: The dashboard is just a **viewer**. It reads course files from GitHub and displays them. No local configuration needed.

---

### 2. **The Automation Server (Local, Different for Each Developer)**
- **What it does**: Runs the AI agents that **create** course content
- **Where it runs**: On your local Mac (Tom's Mac, Kai's Mac)
- **Port**: 3456 (same for everyone)
- **Purpose**: Generate Phase 3 LEGOs, Phase 5 baskets, etc.

**Key point**: This is the **creator**. It writes course files to your local disk, then pushes them to GitHub.

---

## The Architecture (How They Connect)

```
┌─────────────────────────────────────────────────────────────────┐
│                        GITHUB (SSoT)                            │
│                   thomascassidyzm/SSi_Course_Production         │
│                                                                 │
│  Contains:                                                      │
│  - public/vfs/courses/spa_for_eng/                             │
│    ├── seed_pairs.json                                         │
│    ├── lego_pairs.json                                         │
│    └── lego_baskets.json                                       │
└─────────────────────────────────────────────────────────────────┘
           ▲                                    │
           │ push                               │ fetch
           │                                    ▼
┌──────────────────────┐              ┌──────────────────────┐
│   TOM'S AUTOMATION   │              │   VERCEL DASHBOARD   │
│       SERVER         │              │  (Shared Viewer)     │
│                      │              │                      │
│ Port: 3456           │              │ URL: ssi-dashboard-  │
│ VFS_ROOT:            │              │      v7.vercel.app   │
│ /Users/tomcassidy/   │              │                      │
│ SSi/SSi_Course_      │              │ Reads from:          │
│ Production/          │              │ /vfs/courses/...     │
│                      │              │ (GitHub static files)│
│ Ngrok:               │              │                      │
│ mirthlessly-...      │              │ No local config!     │
│ .ngrok-free.dev      │              │ Same for everyone!   │
└──────────────────────┘              └──────────────────────┘
           ▲                                    ▲
           │                                    │
           │ identical                          │ identical
           │ code                               │ view
           ▼                                    ▼
┌──────────────────────┐              ┌──────────────────────┐
│   KAI'S AUTOMATION   │              │   ANY USER           │
│       SERVER         │              │   (Browser)          │
│                      │              │                      │
│ Port: 3456           │              │ Opens same URL:      │
│ VFS_ROOT:            │              │ ssi-dashboard-v7     │
│ /Users/kai/Projects/ │              │ .vercel.app          │
│ SSi/SSi_Course_      │              │                      │
│ Production/          │              │ Sees same files      │
│                      │              │ from GitHub          │
│ Ngrok:               │              │                      │
│ kai-ssi.ngrok-       │              │ No setup needed!     │
│ free.dev             │              │                      │
└──────────────────────┘              └──────────────────────┘
```

---

## What's SAME vs. What's DIFFERENT

### ✅ SAME (Shared Code)

These files are **identical** for Tom and Kai:

| File | Purpose | Shared? |
|------|---------|---------|
| `automation_server.cjs` | Main automation logic | ✅ Same |
| `ecosystem.config.js` | PM2 process manager config | ✅ Same |
| `scripts/phase3_*.cjs` | Phase 3 processing scripts | ✅ Same |
| `scripts/phase5_*.cjs` | Phase 5 processing scripts | ✅ Same |
| `src/` (dashboard code) | Vue.js dashboard frontend | ✅ Same |
| `public/docs/phase_intelligence/` | Phase instructions for AI | ✅ Same |
| Port number | 3456 for automation server | ✅ Same |

### ⚙️ DIFFERENT (Personal Config)

These are **different** for each developer:

| Setting | Tom's Value | Kai's Value |
|---------|-------------|-------------|
| `VFS_ROOT` | `/Users/tomcassidy/SSi/SSi_Course_Production` | `/Users/kai/Projects/SSi/SSi_Course_Production` |
| `NGROK_DOMAIN` | `mirthlessly-nonanesthetized-marilyn.ngrok-free.dev` | `kai-ssi.ngrok-free.dev` |
| Working directory | `/Users/tomcassidy/SSi/ssi-dashboard-v7` | `/Users/kai/Projects/SSi/ssi-dashboard-v7` |
| PM2 process IDs | Different on each Mac | Different on each Mac |
| `.env.automation` | Tom's personal file (gitignored) | Kai's personal file (gitignored) |

---

## The Workflow (How Files Flow)

### When Tom Creates a Course:

1. **Tom runs automation server** on his Mac
   - Reads: `/Users/tomcassidy/SSi/SSi_Course_Production/`
   - Config: `.env.automation` (Tom's paths)

2. **Claude agents generate content**
   - Create LEGOs, baskets, etc.
   - Write to Tom's local VFS directory

3. **Files pushed to GitHub**
   - `git add .` → `git commit` → `git push origin main`
   - Now files are in GitHub SSoT

4. **Dashboard updates automatically**
   - Vercel serves files from `/vfs/courses/` (GitHub)
   - **Everyone** (Tom, Kai, students) sees the new course

### When Kai Views the Course:

1. **Kai opens dashboard URL**
   - https://ssi-dashboard-v7.vercel.app

2. **Dashboard fetches from GitHub**
   - No local files involved
   - No configuration needed
   - Sees Tom's course instantly

### When Kai Creates His Own Course:

1. **Kai runs automation server** on his Mac
   - Reads: `/Users/kai/Projects/SSi/SSi_Course_Production/`
   - Config: `.env.automation` (Kai's paths)

2. **Claude agents generate content**
   - Create LEGOs, baskets, etc.
   - Write to Kai's local VFS directory

3. **Files pushed to GitHub**
   - `git push origin main`
   - Now both Tom and Kai's courses are in GitHub

4. **Dashboard shows both courses**
   - Tom sees Kai's course
   - Kai sees Tom's course
   - Everyone sees the same thing

---

## The Ngrok Tunnel (Why Each Developer Needs One)

### What is Ngrok?

Ngrok creates a **public URL** that tunnels to your **local automation server** (port 3456).

### Why Do We Need It?

The Vercel dashboard (running in the cloud) needs to **communicate** with your local automation server to:
- Start new course generation
- Check job status
- Trigger phases

### Tom's Ngrok Setup:
```bash
# Tom's ngrok domain (from ngrok dashboard)
NGROK_DOMAIN=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev

# This creates a tunnel:
# https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
#   ↓
# http://localhost:3456 (Tom's Mac)
```

### Kai's Ngrok Setup:
```bash
# Kai's ngrok domain (get from: https://dashboard.ngrok.com/domains)
NGROK_DOMAIN=kai-ssi.ngrok-free.dev

# This creates a tunnel:
# https://kai-ssi.ngrok-free.dev
#   ↓
# http://localhost:3456 (Kai's Mac)
```

### Important:
- Ngrok domains are **personal** (each developer gets their own)
- The automation server always runs on **port 3456** (same for everyone)
- The ngrok domain is just a **public wrapper** around your local server

---

## Configuration: The `.env.automation` File

This is your **personal config file** that tells the automation server where YOUR files are.

### Tom's `.env.automation`:
```bash
# VFS Root Path (where MY course files are)
VFS_ROOT=/Users/tomcassidy/SSi/SSi_Course_Production

# Dashboard URL (same for everyone)
TRAINING_URL=https://ssi-dashboard-v7.vercel.app

# My ngrok domain
NGROK_DOMAIN=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev

# Checkpoint mode
CHECKPOINT_MODE=manual

# Orchestrator settings
USE_ORCHESTRATOR_V2=true
AGENT_SPAWN_DELAY=5000
GIT_AUTO_MERGE=true
```

### Kai's `.env.automation`:
```bash
# VFS Root Path (where MY course files are)
VFS_ROOT=/Users/kai/Projects/SSi/SSi_Course_Production

# Dashboard URL (same for everyone)
TRAINING_URL=https://ssi-dashboard-v7.vercel.app

# My ngrok domain
NGROK_DOMAIN=kai-ssi.ngrok-free.dev

# Checkpoint mode
CHECKPOINT_MODE=manual

# Orchestrator settings
USE_ORCHESTRATOR_V2=true
AGENT_SPAWN_DELAY=5000
GIT_AUTO_MERGE=true
```

### Key Points:
- ✅ `.env.automation` is **gitignored** (never pushed to GitHub)
- ✅ Each developer has their own `.env.automation`
- ✅ The automation server reads THIS FILE on startup
- ✅ Everyone uses `.env.automation.example` as a template

---

## What Kai Needs to Set Up

### One-Time Setup:

1. **Clone both repositories**:
   ```bash
   mkdir -p ~/Projects/SSi
   cd ~/Projects/SSi

   # Dashboard + automation server
   git clone https://github.com/thomascassidyzm/ssi-dashboard-v7.git
   cd ssi-dashboard-v7
   npm install

   # Course data
   cd ~/Projects/SSi
   git clone https://github.com/thomascassidyzm/SSi_Course_Production.git
   ```

2. **Create personal config**:
   ```bash
   cd ~/Projects/SSi/ssi-dashboard-v7
   cp .env.automation.example .env.automation
   nano .env.automation
   ```

3. **Update YOUR paths**:
   ```bash
   # In .env.automation, change:
   VFS_ROOT=/Users/kai/Projects/SSi/SSi_Course_Production
   NGROK_DOMAIN=YOUR-DOMAIN.ngrok-free.dev
   ```

4. **Get ngrok domain**:
   - Go to: https://dashboard.ngrok.com/signup
   - Sign up for free account
   - Get your free static domain (e.g., `kai-ssi.ngrok-free.dev`)
   - Put it in `.env.automation`

5. **Start services**:
   ```bash
   # Start automation server with PM2
   pm2 start ecosystem.config.js
   pm2 save

   # Start ngrok tunnel (separate terminal)
   ngrok http --domain=YOUR-DOMAIN.ngrok-free.dev 3456
   ```

### Daily Workflow:

```bash
# Check automation server is running
pm2 list

# View logs
pm2 logs ssi-automation

# Restart if needed
pm2 restart ssi-automation

# Check ngrok is running
curl http://localhost:3456/api/health
```

---

## Dashboard vs. Automation Server: Key Differences

| Aspect | Dashboard | Automation Server |
|--------|-----------|-------------------|
| **Purpose** | View courses | Create courses |
| **Runs where?** | Vercel (cloud) | Your Mac |
| **URL** | ssi-dashboard-v7.vercel.app | localhost:3456 |
| **Public URL** | Built-in | Via ngrok tunnel |
| **Configuration** | None (same for everyone) | `.env.automation` (personal) |
| **Reads files from** | GitHub `/vfs/courses/` | Your local `VFS_ROOT` |
| **Who can access** | Anyone with URL | Only via YOUR ngrok tunnel |
| **Updates when?** | Instant (from GitHub) | When YOU push to GitHub |

---

## Common Confusion Points

### ❓ "Why can't I just use the dashboard to view my local files?"

**Answer**: The dashboard is deployed on Vercel (in the cloud). It **cannot** access your local Mac files. It can only read from GitHub.

**Workflow**:
1. You generate course on **local Mac** → writes to local files
2. You push to **GitHub** → files now in SSoT
3. Dashboard reads from **GitHub** → everyone sees your course

### ❓ "Why does Kai need different ngrok domain than Tom?"

**Answer**: Ngrok domains are **personal**. Each developer gets their own free static domain. The domain points to **your specific Mac's localhost:3456**.

If you used Tom's domain, requests would go to **Tom's Mac**, not yours!

### ❓ "Why is VFS_ROOT different for Tom and Kai?"

**Answer**: Because Tom's files are at:
- `/Users/tomcassidy/SSi/SSi_Course_Production/`

And Kai's files are at:
- `/Users/kai/Projects/SSi/SSi_Course_Production/`

The automation server needs to know **where on YOUR Mac** the course files are.

### ❓ "What if I change automation_server.cjs? Will it affect Tom?"

**Answer**:
- **Before pushing**: Only affects you (your local copy)
- **After pushing to GitHub**: Affects everyone when they `git pull`
- **That's why** we use `.env.automation` for personal settings, not hardcoded values

### ❓ "Can Tom and I both generate courses at the same time?"

**Answer**: Yes!
- You both run automation servers **locally**
- You both write to your **local VFS directories**
- You both push to **GitHub** when done
- Just avoid editing the **same course** simultaneously (git conflicts)

---

## Summary for Kai

### What You Need to Understand:

1. **Dashboard** = Viewer (cloud, same for everyone, no config)
2. **Automation Server** = Creator (local, different paths, personal config)
3. **GitHub** = Single Source of Truth (everyone reads/writes here)
4. **Ngrok** = Public tunnel to YOUR local automation server

### What You Need to Set Up:

1. ✅ Clone both repos
2. ✅ Create `.env.automation` with YOUR paths
3. ✅ Get YOUR ngrok domain
4. ✅ Start PM2 and ngrok
5. ✅ Test: `curl http://localhost:3456/api/health`

### What You DON'T Need to Change:

- ❌ Don't change the dashboard code (it's shared)
- ❌ Don't change port 3456 (it's standard)
- ❌ Don't change `automation_server.cjs` for personal paths (use `.env.automation`)
- ❌ Don't change `TRAINING_URL` (everyone uses same dashboard)

### Files to Create (Personal, Gitignored):

- `.env.automation` (YOUR paths and ngrok domain)

### Files to NEVER Edit for Personal Config:

- `automation_server.cjs` (shared code)
- `ecosystem.config.js` (shared PM2 config)
- `vercel.json` (dashboard deployment config)

---

## Questions?

If you're confused about **why something is different** on your machine vs. Tom's:

1. Check: Is it in `.env.automation`? → **Expected** (personal config)
2. Check: Is it a file path with your username? → **Expected** (Mac-specific)
3. Check: Is it a PM2 process ID? → **Expected** (different per machine)
4. Check: Is it the automation server code? → **Should be identical** (shared)

If you're confused about **why the dashboard looks different**:

- The dashboard should look **identical** for everyone
- If it doesn't, the issue is with **GitHub files**, not your local setup
- Clear browser cache and check GitHub for latest commits
