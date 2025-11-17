# Important Notes for Kai

## ⚠️ Critical Setup Corrections

### ngrok Command Issue

You mentioned running:
```bash
ngrok http --url=kai-lizard-function.ngrok-free.dev 80
```

**Two issues here:**

1. **Wrong Port**: Should be `3456` (not `80`)
   - The automation server runs on port 3456
   - Port 80 is for web servers

2. **Wrong Flag**: Should be `--domain=` (not `--url=`)
   - For reserved ngrok domains, use `--domain=`
   - The `--url=` flag is for different purposes

### ✅ Correct ngrok Command

```bash
ngrok http --domain=kai-lizard-function.ngrok-free.dev 3456
```

**BUT** - you don't need to run this manually! The PM2 ecosystem config does it for you automatically:

```bash
pm2 start ecosystem.config.kai.cjs
```

This starts the ngrok tunnel with the correct settings.

---

## 🎯 The Correct Flow

### What PM2 Does For You

When you run `pm2 start ecosystem.config.kai.cjs`, it starts **three processes**:

1. **automation-server** → Runs on `http://localhost:3456`
2. **ngrok-tunnel** → Exposes localhost:3456 via `https://kai-lizard-function.ngrok-free.dev`
3. **dashboard-ui** → Local Vue dev server on `http://localhost:5173` (optional)

### The Architecture

```
Your Machine:
  ┌─────────────────────────────────────┐
  │  automation_server.cjs              │
  │  Running on: localhost:3456         │
  └─────────────────────────────────────┘
                    ↕
  ┌─────────────────────────────────────┐
  │  ngrok tunnel                       │
  │  Public: kai-lizard-function...     │
  └─────────────────────────────────────┘
                    ↕
           Internet (HTTPS)
                    ↕
  ┌─────────────────────────────────────┐
  │  Vercel Dashboard                   │
  │  https://ssi-dashboard-v7.vercel... │
  │  [Tom's Machine] [Kai's Machine]    │
  └─────────────────────────────────────┘
                    ↕
        User's Browser
```

---

## 🔍 How to Verify It's Working

### Step 1: Check PM2 is running your services

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

All three should say **"online"**.

### Step 2: Test the health endpoint

```bash
curl https://kai-lizard-function.ngrok-free.dev/api/health
```

Should return:
```json
{"status":"healthy","timestamp":"2025-11-14T..."}
```

### Step 3: Check the dashboard

1. Open: https://ssi-dashboard-v7.vercel.app
2. Click environment dropdown (top-right)
3. Select "Kai's Machine"
4. Look for **green dot** next to "Connected"

---

## 🚫 Common Mistakes

### ❌ WRONG: Manually running ngrok with wrong port

```bash
ngrok http --url=kai-lizard-function.ngrok-free.dev 80  # WRONG!
```

### ✅ RIGHT: Let PM2 handle it

```bash
pm2 start ecosystem.config.kai.cjs  # This handles everything!
```

### ❌ WRONG: Accessing your ngrok URL directly in browser

```bash
# Don't open this in your browser:
https://kai-lizard-function.ngrok-free.dev
```

### ✅ RIGHT: Use the Vercel dashboard with environment switcher

```bash
# Open this in your browser:
https://ssi-dashboard-v7.vercel.app
# Then select "Kai's Machine" from dropdown
```

---

## 📝 Current Status of Your Setup

Based on your message, you have:
- ✅ ngrok installed
- ✅ Domain reserved: `kai-lizard-function.ngrok-free.dev`
- ❓ Need to: Run PM2 with correct config
- ❓ Need to: Create `.env` file with your credentials

---

## 🎯 Your Next Steps

1. **Stop the manual ngrok tunnel** (if running):
   ```bash
   # Press Ctrl+C in the terminal where ngrok is running
   ```

2. **Navigate to project**:
   ```bash
   cd ~/SSi/ssi-dashboard-v7-clean
   ```

3. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.kai.cjs
   ```

4. **Verify**:
   ```bash
   pm2 status
   pm2 logs
   curl https://kai-lizard-function.ngrok-free.dev/api/health
   ```

5. **Test dashboard**:
   - Go to: https://ssi-dashboard-v7.vercel.app
   - Select "Kai's Machine"
   - Look for green "Connected" indicator

---

## 💡 Pro Tip

Once everything is working, save your PM2 configuration so it auto-starts on system reboot:

```bash
pm2 save
pm2 startup
```

This way, if your computer restarts, the automation server will automatically start up again!
