# Kai Quickstart Guide

Quick setup for building courses with Claude Code and the SSi Dashboard.

## Prerequisites

- Node.js 18+
- npm
- ngrok account (free tier works)
- Supabase credentials (ask Tom)

## 1. Clone & Install

```bash
git clone https://github.com/thomascassidyzm/ssi-dashboard-v7.git
cd ssi-dashboard-v7
npm install
```

## 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx
```

## 3. ngrok Setup (one-time)

```bash
# Install
brew install ngrok

# Auth (get token from https://dashboard.ngrok.com)
ngrok config add-authtoken YOUR_TOKEN_HERE
```

## 4. Start Services

```bash
pm2 start ecosystem.config.cjs
```

Check everything is running:
```bash
pm2 list
```

You should see all services "online":
- orchestrator (3456)
- course-builder (3471)
- phase8-audio (3465)
- phase9-manifest (3466)
- ngrok
- etc.

## 5. Get Your ngrok URL

```bash
pm2 logs ngrok --lines 10
```

Look for:
```
Forwarding https://xxxx-xx-xx.ngrok-free.app -> http://localhost:3456
```

This URL is what Claude Code uses to access your local services.

## 6. Verify Setup

```bash
# Check course builder is responding
curl http://localhost:3471/api/stats/ita_for_eng

# Should return:
# {"course_code":"ita_for_eng","seeds":0,"legos":0,"phrases":0,...}
```

## 7. Claude Code Terminal Setup

Claude Code needs permission to use Terminal/iTerm2:
1. System Preferences > Privacy & Security > Accessibility
2. Add Terminal.app and/or iTerm.app
3. Restart Claude Code if needed

## Building a Course

The course builder API is at port 3471. Key endpoint:

```
POST /api/seed/complete
```

### Validation Gates (auto-enforced)

1. **TILING** - Seed must tile from LEGOs
2. **ZUT** - Same known = same target
3. **VOCAB** - Phrases only use known vocabulary
4. **COUNT** - Min 7 phrases per LEGO
5. **ETERNAL** - 4+ phrases with 10+ characters
6. **COMPONENTS** - M-LEGOs must have breakdowns
7. **BALANCE** - 3-strike variety enforcement (soft→soft→hard)

### Methodology Skills

When rejected, the API points to these skills:
- `/ssi-decompose-seed` - LEGO decomposition
- `/ssi-build-phrases` - Phrase requirements
- `/ssi-learner-pattern` - Learner experience
- `/ssi-phrase-variety` - Vocabulary balance

## Useful Commands

```bash
# Restart all services
pm2 restart all

# View logs
pm2 logs course-builder --lines 50

# Check specific course stats
curl http://localhost:3471/api/stats/ita_for_eng

# Wipe a course (start fresh)
curl -X DELETE http://localhost:3471/api/course/ita_for_eng
```

## Troubleshooting

**Services not starting?**
```bash
pm2 delete all
pm2 start ecosystem.config.cjs
```

**ngrok connection issues?**
```bash
pm2 restart ngrok
pm2 logs ngrok
```

**Database connection errors?**
- Check `.env` has correct Supabase credentials
- Verify you can reach Supabase URL in browser

---

Ready to build! Start with `ita_for_eng` seed 1.
