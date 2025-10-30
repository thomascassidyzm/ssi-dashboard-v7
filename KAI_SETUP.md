# Setup Guide for Kai

## Quick Start - Running the Automation Server

### 1. Clone the Repository
```bash
git clone https://github.com/thomascassidyzm/ssi-dashboard-v7.git
cd ssi-dashboard-v7
git checkout feature/cloud-native-vfs
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create `.env` File
Create a `.env` file in the root directory with:

```bash
# Server
PORT=3456

# AWS S3 Configuration (ask Tom for credentials)
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs

# Anthropic API (for LEGO regeneration)
ANTHROPIC_API_KEY=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
```

### 4. Download Courses from S3
All 16 courses are synced to S3. Download them:

```bash
# Option A: Use the dashboard
# Go to http://localhost:5173/storage and click "Download" for each course

# Option B: Use the API
curl -X POST http://localhost:3456/api/storage/download/spa_for_eng
curl -X POST http://localhost:3456/api/storage/download/ita_for_eng_668seeds
# ... etc for other courses
```

Or download all at once with a script:
```bash
for course in cmn_for_eng fra_for_eng ita_for_eng_668seeds spa_for_eng; do
  curl -X POST http://localhost:3456/api/storage/download/$course
done
```

### 5. Start the Automation Server with PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Enable auto-start on boot
```

Check status:
```bash
pm2 status
pm2 logs automation-server
pm2 logs dashboard-ui
```

### 6. Set Up ngrok Tunnel
Install ngrok:
```bash
brew install ngrok
```

Sign up at https://ngrok.com and get your auth token:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

Start the tunnel:
```bash
ngrok http 3456
```

You'll get a URL like: `https://xyz-abc-123.ngrok-free.dev`

**Send this URL to Tom** so he can add it to the Environment Switcher!

### 7. Access the Dashboard

Local: http://localhost:5173

The dashboard will show an **Environment Switcher** in the top right. Select "Kai's Machine" to connect to your automation server.

## How the Multi-Machine Setup Works

### Architecture
```
┌─────────────────┐         ┌──────────────────┐
│  Tom's Machine  │         │  Kai's Machine   │
│                 │         │                  │
│  automation-    │         │  automation-     │
│  server:3456    │         │  server:3456     │
│      ↓          │         │      ↓           │
│  ngrok tunnel   │         │  ngrok tunnel    │
│  (Tom's URL)    │         │  (Kai's URL)     │
└─────────────────┘         └──────────────────┘
         ↑                           ↑
         │                           │
         └──────────┬────────────────┘
                    │
            ┌───────┴────────┐
            │   Dashboard    │
            │  (Vercel/local)│
            │                │
            │ Switch between │
            │ Tom/Kai/API    │
            └────────────────┘
```

### Storage Flow
```
┌──────────────────┐
│   S3 Cloud       │
│  (Single Source  │
│   of Truth)      │
└────────┬─────────┘
         │
    Sync up/down
         │
    ┌────┴─────┐
    │          │
 Tom's VFS  Kai's VFS
```

### Workflow
1. **Work locally** - Edit courses, regenerate LEGOs
2. **Sync to S3** - Use Storage Management UI
3. **Other person downloads** - Get latest from S3
4. **Continue editing** - Work independently
5. **Sync back** - Upload changes to S3

## Environment Switcher

Top-right dropdown in dashboard:
- **Tom's Machine** - Connects to Tom's ngrok tunnel
- **Kai's Machine** - Connects to Kai's ngrok tunnel
- **API Server** - Future: deployed API

The switcher:
- Saves your choice in browser localStorage
- Shows connection status (green = connected)
- Automatically retries on connection failure

## Useful Commands

### PM2 Management
```bash
pm2 status                    # Check all processes
pm2 restart automation-server # Restart API server
pm2 logs automation-server    # View logs
pm2 stop all                  # Stop everything
```

### Storage Management
```bash
# Test S3 connection
curl http://localhost:3456/api/storage/test-s3

# List all courses with sync status
curl http://localhost:3456/api/storage/courses | jq

# Sync a course to S3
curl -X POST http://localhost:3456/api/storage/sync/spa_for_eng

# Download a course from S3
curl -X POST http://localhost:3456/api/storage/download/ita_for_eng_668seeds
```

### Course Editing
```bash
# Test LEGO auto-regeneration
curl -X PUT http://localhost:3456/api/courses/spa_for_eng/translations/S0007 \
  -H "Content-Type: application/json" \
  -d '{"source":"I want to try hard today","target":"Quiero intentar duro hoy"}'
```

## Troubleshooting

### "Connection failed" in Environment Switcher
1. Check automation server is running: `pm2 status`
2. Check ngrok tunnel is running: `ngrok http 3456`
3. Verify ngrok URL matches what's in EnvironmentSwitcher.vue
4. Check logs: `pm2 logs automation-server`

### S3 Connection Issues
1. Verify AWS credentials in `.env`
2. Test connection: `curl http://localhost:3456/api/storage/test-s3`
3. Check automation server logs for errors

### Courses Not Loading
1. Download from S3: Go to /storage in dashboard
2. Check vfs/courses/ directory exists
3. Verify course files: `ls vfs/courses/spa_for_eng/`

## What Tom Needs from You

1. **Your ngrok URL** - After starting ngrok, send the URL to Tom
2. **Test the setup** - Try editing a seed, syncing to S3
3. **Feedback** - Any issues or improvements?

## Next Steps

After setup:
1. Download a course from S3
2. Open in dashboard: http://localhost:5173
3. Edit a seed translation
4. Watch LEGO auto-regeneration
5. Sync changes back to S3
6. Tom downloads and sees your changes!

---

Questions? Ask Tom or check the main README.md
