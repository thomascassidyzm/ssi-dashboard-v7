# Kai's Machine Setup - Complete Summary

## ✅ What's Already Configured

### On the Vercel Dashboard (Production)

The **EnvironmentSwitcher** component is already deployed with Kai's configuration:

**File:** `src/components/EnvironmentSwitcher.vue`
```javascript
const ENVIRONMENTS = {
  tom: {
    name: "Tom's Machine",
    url: 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev'
  },
  kai: {
    name: "Kai's Machine",
    url: 'https://kai-lizard-function.ngrok-free.dev'  // ✅ CONFIGURED
  },
  api: {
    name: 'API Server',
    url: 'http://localhost:3456'
  }
}
```

**Status:** ✅ **Already deployed to production** (commit `47ad3f70`)

### On Kai's Machine (Files Ready)

**PM2 Ecosystem Config:** `ecosystem.config.kai.cjs`
- ✅ Configured to start automation server on port 3456
- ✅ Configured to start ngrok tunnel with correct domain
- ✅ Configured to start local dashboard UI
- ✅ Ready to use (just needs `.env` file with credentials)

**Documentation Files:**
- ✅ `KAI_START_HERE.md` - Complete setup guide
- ✅ `KAI_QUICK_REFERENCE.md` - Quick command reference
- ✅ `KAI_IMPORTANT_NOTES.md` - Critical corrections to his ngrok command
- ✅ `KAI_TROUBLESHOOTING.md` - Common issues and solutions
- ✅ `SETUP_KAI_MACHINE.md` - Original detailed setup guide

---

## 🎯 What Kai Needs to Do

### Prerequisites (Verify)

1. **Project files on his machine**
   - Location: `~/SSi/ssi-dashboard-v7-clean` (or wherever he has them)
   - All files should be present

2. **Software installed**
   - Node.js (v18+)
   - ngrok (already installed ✅)
   - PM2 (needs to install with `npm install -g pm2`)

3. **Credentials needed**
   - ngrok auth token (already has ✅)
   - AWS credentials (ask you for these)
   - Anthropic API key (ask you for these)
   - ElevenLabs API key (ask you for these)

### Setup Steps (5 minutes)

**1. Navigate to project:**
```bash
cd ~/SSi/ssi-dashboard-v7-clean
```

**2. Install dependencies:**
```bash
npm install
```

**3. Install PM2:**
```bash
npm install -g pm2
```

**4. Configure ngrok:**
```bash
ngrok config add-authtoken HIS_NGROK_AUTH_TOKEN
```

**5. Create `.env` file:**
```bash
cp .env.example .env
nano .env
```

Add his credentials (you'll need to provide these):
```bash
PORT=3456
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
```

**6. Start everything:**
```bash
pm2 start ecosystem.config.kai.cjs
```

**7. Verify it's working:**
```bash
pm2 status  # All 3 processes should be "online"
curl https://kai-lizard-function.ngrok-free.dev/api/health
```

**8. Test the dashboard:**
- Go to: https://ssi-dashboard-v7.vercel.app
- Select "Kai's Machine" from dropdown
- Look for green "Connected" indicator

---

## 🔍 Current Issue Analysis

### What Kai Reported

Browser console errors showing:
```
HEAD https://ssi-dashboard-v7.vercel.app/vfs/courses/deu_for_eng_574seeds/... 404
```

### Root Cause

Kai was running ngrok with **wrong parameters**:
```bash
ngrok http --url=kai-lizard-function.ngrok-free.dev 80  # WRONG!
```

Two problems:
1. ❌ Wrong port: `80` (should be `3456`)
2. ❌ Wrong flag: `--url=` (should be `--domain=`)

### The Solution

Don't run ngrok manually! Use PM2:
```bash
pm2 start ecosystem.config.kai.cjs
```

This automatically runs:
```bash
ngrok http --domain=kai-lizard-function.ngrok-free.dev 3456  # CORRECT!
```

---

## 📊 System Architecture

### How It Works

```
┌─────────────────────────────────────────────────────┐
│ Vercel Dashboard (Production)                       │
│ https://ssi-dashboard-v7.vercel.app                 │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Environment Switcher                        │   │
│ │ [Tom's Machine ✓] [Kai's Machine] [API]    │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐
│ Tom's Machine    │             │ Kai's Machine    │
│                  │             │                  │
│ automation_      │             │ automation_      │
│ server.cjs       │             │ server.cjs       │
│ :3456            │             │ :3456            │
│        ↕         │             │        ↕         │
│ ngrok tunnel     │             │ ngrok tunnel     │
│ mirthlessly-...  │             │ kai-lizard-...   │
└──────────────────┘             └──────────────────┘
```

### Key Points

1. **Single Shared Dashboard** (Vercel)
   - One UI for both machines
   - Users select which machine to use via dropdown

2. **Two Independent Machines**
   - Tom's: `mirthlessly-nonanesthetized-marilyn.ngrok-free.dev`
   - Kai's: `kai-lizard-function.ngrok-free.dev`
   - Each has own VFS (course data)

3. **PM2 Manages Everything**
   - Starts automation server
   - Starts ngrok tunnel
   - Keeps everything running

---

## 🧪 Testing Checklist

### For Kai to Verify Setup

- [ ] PM2 shows 3 processes online
- [ ] Health endpoint responds: `curl https://kai-lizard-function.ngrok-free.dev/api/health`
- [ ] Dashboard shows green "Connected" when "Kai's Machine" selected
- [ ] Can start a course generation from dashboard
- [ ] Claude Code opens automatically on his machine
- [ ] Course files appear in `public/vfs/courses/`

### For You to Verify

- [ ] Can switch between "Tom's Machine" and "Kai's Machine" in dashboard
- [ ] Each machine shows different connection status
- [ ] Course generation requests route to correct machine
- [ ] Both machines can work simultaneously

---

## 🎓 User Guide (For Both of You)

### Switching Between Machines

1. Go to: https://ssi-dashboard-v7.vercel.app
2. Click environment dropdown (top-right navbar)
3. Select desired machine:
   - **Tom's Machine** - Work runs on Tom's computer
   - **Kai's Machine** - Work runs on Kai's computer
   - **API Server** - Local development only

4. The page reloads and connects to selected machine
5. All subsequent actions (course generation, file access, etc.) use that machine

### Starting Course Generation

1. Ensure you're on the correct machine (check dropdown)
2. Go to "Course Generation" tab
3. Enter course parameters
4. Click "Start Generation"
5. Claude Code will automatically open on the selected machine

### Monitoring Progress

- **Via Dashboard:** Real-time progress indicators
- **Via Logs:** `pm2 logs automation-server`
- **Via Files:** Check `public/vfs/courses/[course-name]/`

---

## 🔐 Security Notes

### Credentials Kai Needs

You'll need to provide Kai with:

1. **AWS Credentials** (for S3 audio storage)
   ```
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```

2. **Anthropic API Key** (for Claude automation)
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

3. **ElevenLabs API Key** (for audio generation)
   ```
   ELEVENLABS_API_KEY=...
   ```

### Sharing Credentials Securely

**Option 1:** Use a password manager (1Password, LastPass, etc.)
**Option 2:** Send via encrypted message (Signal, WhatsApp, etc.)
**Option 3:** Share via secure file transfer

**Do NOT** share via:
- ❌ Email (plaintext)
- ❌ Slack/Discord (unless in DM and deleted after)
- ❌ Git commits (never commit `.env` files!)

---

## 📝 Next Steps

### Immediate (Today)

1. Send Kai the credentials he needs
2. Walk him through running `pm2 start ecosystem.config.kai.cjs`
3. Verify he sees green "Connected" in dashboard
4. Test a simple course generation (e.g., 5 seeds)

### Short Term (This Week)

1. Monitor both machines for stability
2. Test parallel operation (both running simultaneously)
3. Document any issues or improvements needed
4. Set up PM2 auto-start on both machines

### Long Term

1. Consider adding more machines if needed
2. Implement load balancing / work distribution
3. Set up monitoring/alerting for server health
4. Document best practices for multi-machine operation

---

## 📚 Documentation Files for Kai

Send Kai these files (they're all in the project root):

1. **KAI_START_HERE.md** - Start with this one
2. **KAI_QUICK_REFERENCE.md** - Keep this handy
3. **KAI_IMPORTANT_NOTES.md** - Read this before starting
4. **KAI_TROUBLESHOOTING.md** - For when things go wrong
5. **SETUP_KAI_MACHINE.md** - Detailed reference

All files are committed and ready to share!

---

## ✅ Summary

**Configuration Status:** ✅ Complete (on both Vercel and in codebase)

**Kai's Next Action:** Run the 7-step setup (5 minutes)

**Your Next Action:** Provide Kai with credentials for `.env` file

**Expected Result:** Both machines operational, accessible via shared Vercel dashboard with environment switcher

**Success Criteria:**
- ✅ Kai sees green "Connected" when selecting "Kai's Machine"
- ✅ You can switch between machines and see different connection status
- ✅ Course generation works on both machines independently
- ✅ Both machines can operate simultaneously

The system is ready - Kai just needs to complete the setup on his machine! 🚀
