# Multi-Machine Setup Summary

## ✅ What's Been Done

1. **Created Kai's ngrok domain**: `kai-lizard-function.ngrok-free.dev`
2. **Updated EnvironmentSwitcher.vue**: Added Kai's domain to the frontend switcher
3. **Created ecosystem.config.kai.cjs**: PM2 config file for Kai's machine
4. **Created SETUP_KAI_MACHINE.md**: Complete setup guide for Kai

## 🔧 How It Works

### Architecture

```
┌─────────────────────────────────────────────────────┐
│         Vercel Dashboard (ssi-dashboard-v7)         │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │     Environment Switcher Component          │  │
│  │  [Tom's Machine] [Kai's Machine] [API]     │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
       ┌────────────┴────────────┐
       │                         │
       ▼                         ▼
┌─────────────┐          ┌─────────────┐
│ Tom's ngrok │          │ Kai's ngrok │
│  tunnel     │          │  tunnel     │
└─────────────┘          └─────────────┘
       │                         │
       ▼                         ▼
┌─────────────┐          ┌─────────────┐
│ Tom's Local │          │ Kai's Local │
│ automation  │          │ automation  │
│ server      │          │ server      │
│ (port 3456) │          │ (port 3456) │
└─────────────┘          └─────────────┘
```

### ngrok Domains

- **Tom**: `mirthlessly-nonanesthetized-marilyn.ngrok-free.dev`
- **Kai**: `kai-lizard-function.ngrok-free.dev`

Both point to local port `3456` (automation_server.cjs)

### Environment Switcher

Located in: `src/components/EnvironmentSwitcher.vue`

Users can toggle between:
1. **Tom's Machine** - Uses Tom's ngrok tunnel
2. **Kai's Machine** - Uses Kai's ngrok tunnel
3. **API Server** - Direct localhost (for local dev)

When switching:
- Saves choice to `localStorage`
- Reloads page to reinitialize API connections
- All API calls route to selected machine

## 📋 Setup Checklist for Kai's Machine

### On Tom's Machine (Already Done ✅)

- [x] Created ngrok domain for Kai
- [x] Updated `EnvironmentSwitcher.vue` with Kai's domain
- [x] Created `ecosystem.config.kai.cjs`
- [x] Created setup documentation

### On Kai's Machine (To Do)

- [ ] Clone/copy project to Kai's machine
- [ ] Run `npm install`
- [ ] Create `.env` file with Kai's credentials
- [ ] Install PM2: `npm install -g pm2`
- [ ] Configure ngrok: `ngrok config add-authtoken YOUR_TOKEN`
- [ ] Start services: `pm2 start ecosystem.config.kai.cjs`
- [ ] Verify health: `curl https://kai-lizard-function.ngrok-free.dev/api/health`
- [ ] Save PM2 config: `pm2 save && pm2 startup`

### Deploy Frontend Changes (To Do)

- [ ] Commit changes to git
- [ ] Push to GitHub
- [ ] Vercel will auto-deploy the updated EnvironmentSwitcher

## 🚀 Quick Start Commands

### For Tom's Machine

```bash
cd ~/SSi/ssi-dashboard-v7-clean
pm2 start ecosystem.config.cjs
pm2 logs
```

### For Kai's Machine

```bash
cd ~/SSi/ssi-dashboard-v7-clean
pm2 start ecosystem.config.kai.cjs
pm2 logs
```

## 🧪 Testing

### Test Tom's Machine

```bash
curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-11-13T..."}
```

### Test Kai's Machine

```bash
curl https://kai-lizard-function.ngrok-free.dev/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-11-13T..."}
```

### Test Dashboard Switcher

1. Go to https://ssi-dashboard-v7.vercel.app
2. Open browser DevTools → Console
3. Click "Tom's Machine" in dropdown
4. Check console for API calls to Tom's ngrok URL
5. Click "Kai's Machine" in dropdown
6. Check console for API calls to Kai's ngrok URL

## 📁 Key Files Modified

1. **src/components/EnvironmentSwitcher.vue** (line 47)
   - Added Kai's ngrok domain

2. **ecosystem.config.kai.cjs** (NEW)
   - PM2 config for Kai's machine
   - Uses Kai's ngrok domain

3. **SETUP_KAI_MACHINE.md** (NEW)
   - Complete setup guide for Kai

## 🔐 Environment Variables

Both machines need `.env` file with:

```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-west-2
S3_BUCKET=ssi-course-audio
ANTHROPIC_API_KEY=...
PORT=3456
NODE_ENV=development
```

## 🛠️ Troubleshooting

### Dashboard shows "Connection failed"

- Check PM2 status: `pm2 status`
- Check ngrok logs: `pm2 logs ngrok-tunnel`
- Test health endpoint manually: `curl https://[domain]/api/health`

### Wrong machine is responding

- Check which environment is selected in dropdown
- Clear browser localStorage: `localStorage.clear()`
- Reload dashboard

### ngrok tunnel not starting

- Check ngrok config: `ngrok config check`
- Test ngrok manually: `ngrok http --domain=kai-lizard-function.ngrok-free.dev 3456`
- Verify authtoken is correct

## 📚 Additional Resources

- Full setup guide: `SETUP_KAI_MACHINE.md`
- ngrok Dashboard: https://dashboard.ngrok.com
- PM2 Docs: https://pm2.keymetrics.io/docs
- Project docs: `/public/docs/`
