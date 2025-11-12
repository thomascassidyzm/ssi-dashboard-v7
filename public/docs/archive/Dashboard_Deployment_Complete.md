# Dashboard Deployment - Complete Setup

**Date:** October 15, 2025
**Status:** ✅ FULLY OPERATIONAL

---

## Architecture Overview

```
User → Vercel Dashboard → ngrok → Local Automation Server → VFS
                ↓
         (fallback to static files if API down)
```

### Components

1. **Vercel Dashboard** (https://ssi-dashboard-v7-clean.vercel.app)
   - Frontend Vue.js application
   - Includes static VFS files as backup (`/vfs/courses/`)

2. **PM2 Automation Server** (localhost:3456)
   - Runs `automation_server.cjs`
   - Reads/writes VFS at `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses`
   - Handles course generation (Phases 1-7)

3. **ngrok Tunnel** (https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev)
   - Reserved URL pointing to localhost:3456
   - Configured in `.env.production`
   - Automatically started by PM2

---

## How It Works

### Viewing Existing Courses
1. Dashboard calls ngrok API: `GET /api/courses`
2. Returns **all courses** from VFS (including newly generated)
3. If API unavailable, falls back to static files (4 courses)

### Generating New Courses
1. User clicks "Generate Course" in dashboard
2. Dashboard sends: `POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/courses/generate`
3. Automation server generates course in VFS
4. **Immediately visible** in dashboard (via API, no redeploy needed)

### Editing Courses
1. User edits translation in dashboard
2. Dashboard sends: `PUT /api/courses/:code/translations/:uuid`
3. Automation server updates VFS
4. Regenerates LEGO breakdowns automatically
5. Changes visible immediately

---

## PM2 Services

```bash
pm2 list
```

Should show:

| Name | Status | Port | Description |
|------|--------|------|-------------|
| ssi-automation | online | 3456 | Automation server |
| ssi-ngrok | online | - | ngrok tunnel |

### Commands

```bash
# Start services
pm2 start ecosystem.config.cjs

# View logs
pm2 logs ssi-automation
pm2 logs ssi-ngrok

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Monitor
pm2 monit
```

---

## File Locations

### VFS (Source of Truth)
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/
├── spa_for_eng_30seeds/
│   ├── translations.json
│   └── LEGO_BREAKDOWNS_COMPLETE.json
├── fra_for_eng_30seeds/
├── ita_for_eng_30seeds/
└── cmn_for_eng_30seeds/
```

### Static Files (Backup)
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/
└── (same structure, copied during build)
```

---

## API Endpoints

### Core Endpoints
- `GET /api/courses` - List all courses
- `GET /api/courses/:code` - Get course details
- `GET /api/courses/:code/provenance/:seedId` - Trace seed provenance
- `POST /api/courses/generate` - Generate new course

### Quality & Editing
- `PUT /api/courses/:code/translations/:uuid` - Edit translation
- `GET /api/courses/:code/quality` - Quality metrics
- `POST /api/courses/:code/seeds/regenerate` - Regenerate LEGO breakdowns

---

## Deployment Workflow

### When VFS Changes (Manual Sync)
If you want to update static files on Vercel:

```bash
# 1. Copy VFS to public directory
cp -r vfs/courses/* public/vfs/courses/

# 2. Rebuild and deploy
npm run build
npx vercel --prod
```

**Note:** This is optional! The API serves live data, static files are just a backup.

---

## Configuration Files

### `.env.production`
```bash
VITE_API_BASE_URL=https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
```

### `ecosystem.config.cjs`
```javascript
module.exports = {
  apps: [
    {
      name: 'ssi-automation',
      script: 'automation_server.cjs',
      env: { PORT: 3456 }
    },
    {
      name: 'ssi-ngrok',
      script: '/bin/bash',
      args: '-c "ngrok http 3456 --url https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev --log stdout"'
    }
  ]
}
```

### `vercel.json`
```json
{
  "headers": [
    {
      "source": "/vfs/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Content-Type", "value": "application/json" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/((?!vfs).*)", "destination": "/index.html" }
  ]
}
```

---

## Testing

### 1. Check PM2 Services
```bash
pm2 list
# Should show both services as "online"
```

### 2. Test ngrok API
```bash
curl -H "ngrok-skip-browser-warning: true" \
  https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/courses
```

### 3. Test Dashboard
Visit: https://ssi-dashboard-v7-clean.vercel.app
- Should see 4 courses listed
- Click "View & Edit" to see translations + LEGO breakdowns

### 4. Generate Test Course
1. Click "Generate Course"
2. Select: Spanish → English, 5 seeds
3. Wait ~2 minutes
4. Course appears automatically (no page refresh needed)

---

## Troubleshooting

### Dashboard shows "API unavailable"
✅ **This is OK!** Dashboard falls back to static files automatically.

To fix:
```bash
pm2 restart all
pm2 logs
```

### ngrok tunnel not working
Check if another ngrok instance is running:
```bash
pkill ngrok
pm2 restart ssi-ngrok
```

### New courses not showing
1. Check API is running: `pm2 logs ssi-automation`
2. Verify ngrok tunnel: `pm2 logs ssi-ngrok`
3. Check VFS has the files: `ls -la vfs/courses/`

### Static files out of sync
Update static files:
```bash
cp -r vfs/courses/* public/vfs/courses/
npm run build
npx vercel --prod
```

---

## Benefits of This Setup

✅ **Real-time Updates:** New courses appear immediately via API
✅ **Resilient:** Falls back to static files if API down
✅ **No Manual Deploys:** Course generation doesn't require Vercel redeploy
✅ **Persistent:** PM2 keeps services running across Mac restarts
✅ **Fast:** Static files cached by Vercel CDN

---

## Auto-Start on Mac Boot

To have PM2 start automatically when Mac boots:

```bash
pm2 startup
# Run the command it gives you (requires sudo)
pm2 save
```

---

**Last Updated:** October 15, 2025
**Verified Working:** ✅ All 4 courses accessible, API responding, ngrok tunnel active
