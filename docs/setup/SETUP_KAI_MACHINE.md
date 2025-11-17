# SSi Dashboard Setup - Kai's Machine

This guide explains how to set up the SSi Dashboard automation server on Kai's machine so it can be accessed alongside Tom's machine from the same Vercel dashboard.

## Architecture

- **Dashboard (Frontend)**: Hosted on Vercel at `https://ssi-dashboard-v7.vercel.app`
- **Tom's Machine**: `https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev`
- **Kai's Machine**: `https://kai-lizard-function.ngrok-free.dev` (NEW)

Users can toggle between machines using the **Environment Switcher** dropdown in the dashboard navbar.

---

## Prerequisites

1. **Node.js** (v18 or later)
2. **PM2** (process manager)
3. **ngrok** (tunneling service)
4. **Git** (to clone/copy the project)

---

## Setup Steps for Kai's Machine

### 1. Clone/Copy the Project

```bash
# If using Git
git clone [repository-url] ~/SSi/ssi-dashboard-v7-clean
cd ~/SSi/ssi-dashboard-v7-clean

# OR copy the entire folder from Tom's machine to Kai's machine
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file with Kai's credentials:

```bash
cp .env.example .env
```

Edit `.env` and add:

```bash
# AWS Credentials (for S3 audio storage)
AWS_ACCESS_KEY_ID=your_kai_aws_key
AWS_SECRET_ACCESS_KEY=your_kai_aws_secret
AWS_REGION=eu-west-2
S3_BUCKET=ssi-course-audio

# Anthropic API Key (for Claude Code automation)
ANTHROPIC_API_KEY=your_kai_anthropic_key

# Server Configuration
PORT=3456
NODE_ENV=development
```

### 4. Install PM2 (if not already installed)

```bash
npm install -g pm2
```

### 5. Configure ngrok

Add your ngrok authtoken:

```bash
ngrok config add-authtoken YOUR_NGROK_AUTH_TOKEN
```

You can get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken

### 6. Start the Services

Use the Kai-specific ecosystem config:

```bash
pm2 start ecosystem.config.kai.cjs
```

This will start:
- ✅ **automation-server** (port 3456)
- ✅ **dashboard-ui** (local dev server, optional)
- ✅ **ngrok-tunnel** (exposes port 3456 via `kai-lizard-function.ngrok-free.dev`)

### 7. Verify Everything is Running

```bash
# Check PM2 processes
pm2 status

# Check logs
pm2 logs

# Check ngrok tunnel
curl https://kai-lizard-function.ngrok-free.dev/api/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T..."
}
```

### 8. Save PM2 Configuration (Optional)

To auto-start on system boot:

```bash
pm2 save
pm2 startup
```

---

## Using the Dashboard

1. Go to: https://ssi-dashboard-v7.vercel.app
2. Look for the **Environment Switcher** dropdown (top right)
3. Select **"Kai's Machine"**
4. The dashboard will reload and connect to Kai's automation server
5. All course generation, audio processing, etc. will now run on Kai's machine

---

## Troubleshooting

### ngrok tunnel not working

```bash
# Check ngrok logs
pm2 logs ngrok-tunnel

# Manually test ngrok
ngrok http --domain=kai-lizard-function.ngrok-free.dev 3456
```

### Automation server not responding

```bash
# Check automation server logs
pm2 logs automation-server

# Restart automation server
pm2 restart automation-server
```

### Environment variables not loaded

```bash
# Verify .env file exists and has correct values
cat .env

# Restart PM2 to reload environment
pm2 restart all
```

---

## PM2 Useful Commands

```bash
# View all running processes
pm2 status

# View logs (all processes)
pm2 logs

# View logs (specific process)
pm2 logs automation-server

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all

# Delete all processes (clean slate)
pm2 delete all
```

---

## File Structure

Key files on Kai's machine:

```
~/SSi/ssi-dashboard-v7-clean/
├── automation_server.cjs           # Main backend server
├── ecosystem.config.kai.cjs        # PM2 config for Kai's machine
├── .env                            # Environment variables (Kai's credentials)
├── public/vfs/courses/             # Course data storage
├── logs/                           # PM2 logs
│   ├── automation-server-out.log
│   ├── automation-server-error.log
│   ├── ngrok-out.log
│   └── ngrok-error.log
└── src/                            # Dashboard UI source code
```

---

## Next Steps

Once Kai's machine is running:

1. ✅ Dashboard will show both Tom's and Kai's machines in the environment switcher
2. ✅ Users can toggle between machines to distribute workload
3. ✅ Each machine maintains its own VFS (course data)
4. ✅ Both machines share the same Vercel-hosted dashboard UI

---

## Support

- ngrok Dashboard: https://dashboard.ngrok.com
- PM2 Documentation: https://pm2.keymetrics.io/docs
- Project Documentation: See `/public/docs/` folder
