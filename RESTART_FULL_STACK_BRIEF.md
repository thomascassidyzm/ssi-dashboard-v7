# Brief: Restart Full Stack (Automation Server + ngrok)

**Problem**:
- Automation server (PID 53034) running on port 54321 but unresponsive
- ngrok tunnel (PID 33503) pointing to wrong port (3456 instead of 54321)
- Dashboard on Vercel can't connect to backend

**Solution**: Kill both, restart with correct configuration

---

## Commands to Execute (Sequential)

### Step 1: Kill Existing Processes
```bash
# Kill automation server
kill 53034

# Kill ngrok tunnel
kill 33503

# Verify they're dead
sleep 2
lsof -i :54321 -i :3456 | grep LISTEN
# Should return nothing
```

### Step 2: Restart Automation Server (Port 54321)
```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean

# Start automation server on port 54321
PORT=54321 node automation_server.cjs

# Should see output like:
# [Server] Loaded 8 phase prompts from registry
# [Server] SSi Course Production API running on port 54321
# [Server] VFS Root: /Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses
```

**Keep this terminal open** - let it run

### Step 3: Test Automation Server
Open NEW terminal:
```bash
# Test health (might 404 if endpoint doesn't exist - that's OK)
curl http://localhost:54321/api/health

# Test courses endpoint (should return JSON)
curl http://localhost:54321/api/courses

# Should see array of courses like:
# [{"code":"ita_for_eng_574seeds","targetLanguage":"Italian","knownLanguage":"English",...}]
```

If `/api/courses` returns JSON → ✅ Server working

### Step 4: Start ngrok Tunnel (Port 54321)
Open NEW terminal:
```bash
# Start ngrok pointing to correct port
ngrok http 54321 --url https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev --log stdout

# Should see output like:
# Forwarding  https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev -> http://localhost:54321
```

**Keep this terminal open** - let it run

### Step 5: Test ngrok Tunnel
Open NEW terminal:
```bash
# Test public URL
curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/courses

# Should return same JSON as localhost test
```

If returns JSON → ✅ Tunnel working

### Step 6: Configure Vercel Dashboard
Update dashboard environment variable:

**Option A: Via Vercel UI**
1. Go to https://vercel.com/zenjin/ssi-dashboard-v7-clean/settings/environment-variables
2. Add variable:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev`
3. Redeploy dashboard

**Option B: Via CLI**
```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean

# Set environment variable
vercel env add VITE_API_BASE_URL production
# When prompted, enter: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev

# Redeploy
vercel --prod
```

### Step 7: Test Full Stack
```bash
# Test Vercel dashboard can reach backend
curl https://ssi-dashboard-v7-clean.vercel.app

# Open in browser
open https://ssi-dashboard-v7-clean.vercel.app

# Navigate to /courses - should load real course data (not demo data)
```

---

## Success Criteria

✅ Automation server responds on localhost:54321
✅ ngrok tunnel forwards 54321 correctly
✅ Public ngrok URL returns course data
✅ Vercel dashboard loads course data (not demo)
✅ Can edit translation and trigger regeneration
✅ Can edit Phase 5 prompt and see git commit

---

## Expected Output

**Terminal 1 (Automation Server)**:
```
[Server] SSi Course Production API
[Server] Port: 54321
[Server] VFS Root: /Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses
[Server] Loaded 8 phase prompts from registry

API Endpoints:
  GET    http://localhost:54321/api/courses
  GET    http://localhost:54321/api/courses/:code
  POST   http://localhost:54321/api/courses/generate
  ...

Prompt Management API (Self-Improving DNA):
  GET  http://localhost:54321/api/prompts/:phase
  PUT  http://localhost:54321/api/prompts/:phase
  GET  http://localhost:54321/api/prompts/:phase/history
```

**Terminal 2 (ngrok)**:
```
Session Status   online
Account          [your-account]
Forwarding       https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev -> http://localhost:54321

Connections      ttl     opn     rt1     rt5     p50     p90
                 0       0       0.00    0.00    0.00    0.00
```

---

## Troubleshooting

**If automation server won't start**:
```bash
# Check if port already in use
lsof -i :54321

# Kill anything on that port
lsof -ti :54321 | xargs kill -9

# Try again
PORT=54321 node automation_server.cjs
```

**If ngrok won't start**:
```bash
# Check ngrok auth
ngrok config check

# List all tunnels
ngrok tunnel list

# Kill all ngrok processes
pkill ngrok

# Try again
ngrok http 54321 --url https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
```

**If Vercel dashboard still shows demo data**:
- Clear browser cache
- Hard refresh (Cmd+Shift+R)
- Check browser console for CORS errors
- Verify VITE_API_BASE_URL is set correctly

---

## Alternative: PM2 for Persistent Processes

If you want these to survive terminal restarts:

```bash
# Install PM2
npm install -g pm2

# Start automation server
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
PORT=54321 pm2 start automation_server.cjs --name ssi-automation

# Start ngrok
pm2 start "ngrok http 54321 --url https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev" --name ssi-ngrok

# Save processes
pm2 save

# Setup startup script
pm2 startup

# View logs
pm2 logs ssi-automation
pm2 logs ssi-ngrok

# View status
pm2 status
```

---

## Report Back

Once restarted, test and report:
1. ✅/❌ Automation server responding on :54321
2. ✅/❌ ngrok tunnel forwarding correctly
3. ✅/❌ Public URL accessible
4. ✅/❌ Vercel dashboard loading real data
5. ✅/❌ Edit workflow working end-to-end

Save evidence:
- Screenshot of dashboard showing real course data
- curl output showing API responses
- Terminal output showing servers running
