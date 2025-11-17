# Kai - Quick Reference Card

## 🚀 Start Everything

```bash
cd ~/SSi/ssi-dashboard-v7-clean
pm2 start ecosystem.config.kai.cjs
```

## ✅ Check Status

```bash
pm2 status
```

Expected: 3 processes online (automation-server, dashboard-ui, ngrok-tunnel)

## 🔍 View Logs

```bash
pm2 logs                    # All logs
pm2 logs automation-server  # Just automation server
```

## 🌐 Access Dashboard

**Main URL:** https://ssi-dashboard-v7.vercel.app

**IMPORTANT:** Select **"Kai's Machine"** in the environment dropdown!

## 🧪 Test Health

```bash
curl https://kai-lizard-function.ngrok-free.dev/api/health
```

Should return: `{"status":"healthy",...}`

## 🛑 Stop Everything

```bash
pm2 stop all
```

## 🔄 Restart Everything

```bash
pm2 restart all
```

## 🗑️ Clean Slate (delete all processes)

```bash
pm2 delete all
```

---

## Key URLs

| What | URL |
|------|-----|
| **Shared Dashboard** | https://ssi-dashboard-v7.vercel.app |
| **Your ngrok tunnel** | https://kai-lizard-function.ngrok-free.dev |
| **Local dev dashboard** | http://localhost:5173 |
| **Health check** | https://kai-lizard-function.ngrok-free.dev/api/health |

---

## Important Files

| File | Purpose |
|------|---------|
| `ecosystem.config.kai.cjs` | **YOUR PM2 config** (always use this!) |
| `.env` | Your API keys and credentials |
| `automation_server.cjs` | The backend server |
| `public/vfs/courses/` | Where course data is stored |

---

## Troubleshooting One-Liners

```bash
# Check if port 3456 is in use
lsof -i :3456

# Test ngrok manually
ngrok http --domain=kai-lizard-function.ngrok-free.dev 3456

# View automation server logs only
pm2 logs automation-server --lines 50

# Check PM2 process details
pm2 show automation-server

# Restart just the automation server
pm2 restart automation-server
```

---

## The Golden Rule

**Always use the environment switcher!**

When you go to https://ssi-dashboard-v7.vercel.app:
1. Click the dropdown in the top-right navbar
2. Select **"Kai's Machine"**
3. Look for the green "Connected" indicator

This ensures everything runs on YOUR machine!
