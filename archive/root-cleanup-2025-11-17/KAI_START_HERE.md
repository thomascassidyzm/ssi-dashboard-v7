# Kai - Complete Setup Guide

## 🎯 What You're Setting Up

You'll run the **entire SSi automation system** on your machine:
- ✅ Automation server (handles all course generation)
- ✅ ngrok tunnel (exposes your server to the internet)
- ✅ Access via the shared Vercel dashboard

## 📋 Prerequisites Checklist

Make sure you have:
- [x] Node.js installed (v18+)
- [x] ngrok installed and account set up
- [x] ngrok domain reserved: `kai-lizard-function.ngrok-free.dev`
- [x] Project files copied to your machine
- [x] AWS credentials (for S3 audio storage)
- [x] Anthropic API key (for Claude automation)

---

## 🚀 Complete Setup Steps

### Step 1: Navigate to Project Directory

```bash
cd ~/SSi/ssi-dashboard-v7-clean
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### Step 4: Configure ngrok

Add your ngrok auth token:

```bash
ngrok config add-authtoken YOUR_NGROK_AUTH_TOKEN
```

Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken

### Step 5: Create Environment File

Create a `.env` file with your credentials:

```bash
# Copy the example
cp .env.example .env

# Then edit .env with your actual credentials:
nano .env
```

Your `.env` should contain:

```bash
# Server
PORT=3456

# AWS S3 Configuration (ask Tom for these)
AWS_ACCESS_KEY_ID=your_aws_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_here
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs

# Anthropic API (ask Tom for this)
ANTHROPIC_API_KEY=your_anthropic_key_here

# ElevenLabs (ask Tom for this)
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

### Step 6: Start All Services

**IMPORTANT:** Use the Kai-specific ecosystem config:

```bash
pm2 start ecosystem.config.kai.cjs
```

This starts:
1. **automation-server** (port 3456)
2. **dashboard-ui** (local dev server, port 5173)
3. **ngrok-tunnel** (connects kai-lizard-function.ngrok-free.dev → localhost:3456)

### Step 7: Verify Everything is Running

Check PM2 status:

```bash
pm2 status
```

You should see:

```
┌────┬─────────────────────┬─────────────┬─────────┐
│ id │ name                │ status      │ cpu     │
├────┼─────────────────────┼─────────────┼─────────┤
│ 0  │ automation-server   │ online      │ 0%      │
│ 1  │ dashboard-ui        │ online      │ 0%      │
│ 2  │ ngrok-tunnel        │ online      │ 0%      │
└────┴─────────────────────┴─────────────┴─────────┘
```

### Step 8: Test Your Setup

**Test the health endpoint:**

```bash
curl https://kai-lizard-function.ngrok-free.dev/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-11-14T..."}
```

**Test the dashboard:**

1. Go to: **https://ssi-dashboard-v7.vercel.app**
2. Click the environment dropdown (top-right navbar)
3. Select **"Kai's Machine"**
4. Look for the green dot next to "Connected"

---

## 🎮 How to Use the System

### Accessing the Dashboard

**Option 1: Shared Vercel Dashboard (RECOMMENDED)**
- Go to: https://ssi-dashboard-v7.vercel.app
- Use the environment switcher to select "Kai's Machine"
- Everything runs on your machine, viewed via the shared UI

**Option 2: Local Development Dashboard**
- Go to: http://localhost:5173
- This is your local Vue dev server
- Useful for testing UI changes

### Starting a Course Generation

1. Go to the Vercel dashboard
2. Select "Kai's Machine" in environment dropdown
3. Click "Course Generation" tab
4. Enter course details (e.g., `spa_for_eng` with seeds 1-10)
5. Click "Start Generation"
6. Claude Code will automatically open on your machine and start working!

### Monitoring Progress

Watch the logs in real-time:

```bash
# All logs
pm2 logs

# Just automation server
pm2 logs automation-server

# Just ngrok tunnel
pm2 logs ngrok-tunnel
```

---

## 🛠️ Common Commands

### Managing Services

```bash
# View status
pm2 status

# View logs (all services)
pm2 logs

# View logs (specific service)
pm2 logs automation-server

# Restart all services
pm2 restart all

# Restart specific service
pm2 restart automation-server

# Stop all services
pm2 stop all

# Start services again
pm2 start ecosystem.config.kai.cjs

# Delete all services (clean slate)
pm2 delete all
```

### Save PM2 Configuration (Optional)

To auto-start services on system reboot:

```bash
pm2 save
pm2 startup
```

Follow the instructions PM2 prints out (you'll need to copy/paste a command with `sudo`).

---

## 🐛 Troubleshooting

### Issue: Green light not showing in dashboard

**Check 1: Is automation server running?**
```bash
pm2 status
# automation-server should say "online"
```

**Check 2: Is ngrok tunnel working?**
```bash
pm2 logs ngrok-tunnel
# Should show "started tunnel" message
```

**Check 3: Test health endpoint**
```bash
curl https://kai-lizard-function.ngrok-free.dev/api/health
```

### Issue: Browser shows 404 errors for course files

**Check 1: Are you using the correct environment?**
- In the Vercel dashboard, verify "Kai's Machine" is selected in the dropdown
- The URL bar should show: `https://ssi-dashboard-v7.vercel.app`
- Do NOT use the ngrok URL directly in your browser

**Check 2: Do the course files exist locally?**
```bash
ls -la public/vfs/courses/
```

### Issue: ngrok tunnel won't start

**Fix 1: Verify your ngrok config**
```bash
ngrok config check
```

**Fix 2: Test ngrok manually**
```bash
ngrok http --domain=kai-lizard-function.ngrok-free.dev 3456
```

If this works manually, the issue is with PM2. Restart PM2:
```bash
pm2 restart ngrok-tunnel
```

### Issue: Port 3456 already in use

**Find what's using the port:**
```bash
lsof -i :3456
```

**Kill the process:**
```bash
kill -9 <PID>
```

Then restart PM2:
```bash
pm2 restart automation-server
```

---

## 📁 Important File Locations

```
~/SSi/ssi-dashboard-v7-clean/
├── automation_server.cjs           # Main backend server
├── ecosystem.config.kai.cjs        # YOUR PM2 config (use this!)
├── .env                            # Your environment variables
├── public/vfs/courses/             # Course data storage
├── logs/                           # PM2 logs
│   ├── automation-server-out.log
│   ├── automation-server-error.log
│   ├── ngrok-out.log
│   └── ngrok-error.log
└── src/                            # Dashboard UI source
```

---

## ✅ Quick Start Checklist

Use this checklist every time you start working:

1. [ ] Navigate to project: `cd ~/SSi/ssi-dashboard-v7-clean`
2. [ ] Start services: `pm2 start ecosystem.config.kai.cjs`
3. [ ] Check status: `pm2 status` (all should be "online")
4. [ ] Test health: `curl https://kai-lizard-function.ngrok-free.dev/api/health`
5. [ ] Open dashboard: https://ssi-dashboard-v7.vercel.app
6. [ ] Select "Kai's Machine" in environment dropdown
7. [ ] Verify green "Connected" indicator

---

## 💡 Tips

- **Always use `ecosystem.config.kai.cjs`** (not the regular one - that's Tom's config)
- **Use the Vercel dashboard** (not your ngrok URL directly in browser)
- **Watch the logs** to see what's happening: `pm2 logs`
- **Ask Tom** if you need any API keys or credentials

---

## 📞 Getting Help

If something's not working:

1. Check the logs: `pm2 logs`
2. Verify services are running: `pm2 status`
3. Test the health endpoint: `curl https://kai-lizard-function.ngrok-free.dev/api/health`
4. Contact Tom with:
   - What you were trying to do
   - Output of `pm2 status`
   - Output of `pm2 logs` (last 20 lines)

---

## 🎉 You're Ready!

Once you see:
- ✅ All PM2 processes "online"
- ✅ Health endpoint responding
- ✅ Green "Connected" indicator in dashboard

You're fully set up and ready to run course generation on your machine! 🚀
