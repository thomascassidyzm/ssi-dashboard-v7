# Quick Start: Course Generation

## ✅ Current Status

Your automation server is **already running** on port 54321!

```bash
$ lsof -i :54321
node    99456    TCP *:54321 (LISTEN)
```

## 🚀 To Generate a Course RIGHT NOW

### 1. Check if ngrok is running

```bash
# Check for ngrok process
ps aux | grep ngrok

# If not running, start it:
ngrok http 54321
```

### 2. Get your ngrok URL

Look for output like:
```
Forwarding  https://abc123-def456.ngrok.io -> http://localhost:54321
```

### 3. Test the connection

```bash
curl https://YOUR-NGROK-URL.ngrok.io/api/health

# Should return: {"status":"ok","version":"7.0"}
```

### 4. Update frontend (if needed)

If frontend doesn't connect, update the API URL:

**Option A - Quick (for testing):**

Edit `src/services/api.js`:
```javascript
const apiClient = axios.create({
  baseURL: 'https://YOUR-NGROK-URL.ngrok.io',
  timeout: 30000
});
```

Then rebuild and push:
```bash
npm run build
git add -A
git commit -m "Update API URL for testing"
git push
```

**Option B - Proper (for production):**

Use environment variable in Vercel:
1. Go to https://vercel.com/zenjin/ssi-dashboard-v7/settings/environment-variables
2. Add: `VITE_API_BASE_URL` = `https://YOUR-NGROK-URL.ngrok.io`
3. Redeploy

### 5. Generate a course!

1. Go to: https://ssi-dashboard-v7.vercel.app/
2. Click **"Generate New Course"**
3. Select languages (e.g., Italian for English Speakers)
4. Choose number of seeds (start with 30 for testing)
5. Click **"Generate Course"**

### 6. Watch it work!

- **Dashboard**: Shows real-time progress
- **Warp Terminal**: Opens new tab showing Claude Code agent
- **Console**: automation_server logs show phase progression
- **VFS**: Watch files appear in `vfs/courses/ita_for_eng_30seeds/`

## 🎯 Expected Timeline

For **30 seeds**:
- Phase 1 (Translations): ~2-3 minutes
- Phase 3 (LEGO Extraction): ~3-5 minutes
- Phase 5 (Baskets): ~10-15 minutes
- Phase 5.5 (Deduplication): ~1 minute
- Phase 6 (Introductions): ~2-3 minutes

**Total: ~20-30 minutes**

For **668 seeds** (full corpus):
- Expect **2-4 hours** for complete generation

## 📊 Monitor Progress

### Watch Automation Server Logs

```bash
# Find the server process
ps aux | grep automation_server

# Or check logs if you started it with pm2
pm2 logs automation_server
```

### Check VFS Files

```bash
watch -n 2 "ls -lh vfs/courses/ita_for_eng_30seeds/"
```

### Poll API Status

```bash
# Replace with your course code
curl http://localhost:54321/api/courses/ita_for_eng_30seeds/status | jq
```

## 🐛 Troubleshooting

### Server not responding?

```bash
# Check if server is running
lsof -i :54321

# If not, start it:
npm run server

# Or with pm2 (recommended):
pm2 start automation_server.cjs --name "automation-server"
pm2 logs automation-server
```

### ngrok tunnel died?

```bash
# Restart ngrok
ngrok http 54321

# Update frontend with new URL
# (ngrok generates new URLs each time it starts)
```

### Warp window not opening?

Check macOS automation permissions:
1. **System Settings** → **Privacy & Security** → **Automation**
2. Find `node` or your terminal app
3. Enable **Warp** access

### CORS errors in browser console?

Check automation_server.cjs has your Vercel URL in CORS_ORIGINS:
```javascript
CORS_ORIGINS: [
  'https://ssi-dashboard-v7.vercel.app',
  /\.vercel\.app$/
]
```

## 💡 Tips

### Test with Small Course First

Always test with **30 seeds** before running full 668-seed generation:

```
Known: eng (English)
Target: ita (Italian)
Seeds: 30

Course Code: ita_for_eng_30seeds
```

### Monitor in Real-Time

Open multiple terminal windows:

**Window 1: Server Logs**
```bash
pm2 logs automation-server
```

**Window 2: VFS Watcher**
```bash
watch -n 2 "ls -lh vfs/courses/ita_for_eng_30seeds/"
```

**Window 3: Warp (Claude Code)**
The orchestrator agent runs here - you can see everything it does!

### Use pm2 for Server Management

```bash
# Install pm2 globally
npm install -g pm2

# Start server with pm2
pm2 start automation_server.cjs --name "automation-server"

# Ensure it restarts on reboot
pm2 startup
pm2 save

# Manage server
pm2 stop automation-server
pm2 restart automation-server
pm2 logs automation-server
pm2 status
```

## 🎉 Success!

When complete, you'll see:

**Dashboard:**
```
✓ Completed!
Course: ita_for_eng_30seeds
```

**VFS Directory:**
```
vfs/courses/ita_for_eng_30seeds/
├── translations.json                 (30 translations)
├── LEGO_BREAKDOWNS_COMPLETE.json    (~100 LEGOs)
├── baskets_deduplicated.json         (~100 baskets)
├── lego_provenance_map.json         (duplicate tracking)
└── introductions.json                (~100 introductions)
```

**Click "View Course Files"** to open the course editor and see all the generated content!

---

For detailed documentation, see [AUTOMATION_SETUP.md](./AUTOMATION_SETUP.md)
