# Kai Onboarding - SSi Dashboard v7

**Last Updated**: 2026-01-07
**Purpose**: Get Kai's Claude instance up to speed for Italian course creation

---

## Current Focus: Master the Dashboard First

**Phase 1 of your onboarding: Learn to create courses entirely through the dashboard.**

The dashboard is now mature enough that course creation should be code-free. Your job right now:

1. **Learn the full dashboard workflow** - Phase 0 → Phase 3 → Audio → QA
2. **Create Italian** - First real course using the new pipeline
3. **Train Deborah** - She'll create French-250 next week using what you've learned
4. **Document any gaps** - If something can't be done from dashboard, tell Tom

Once you've mastered the dashboard workflow and trained others, you'll take more ownership of the system. But right now, focus on being a power user, not a developer.

```bash
# Work in your own branch for any local experimentation
git checkout -b kai-workspace
git pull origin main  # Get latest updates from Tom
```

---

## Quick Start Checklist

- [ ] Clone repo and checkout `kai-workspace` branch
- [ ] Copy `.env.example` to `.env` and configure (get keys from Tom)
- [ ] Set up your ngrok tunnel with your domain
- [ ] Run `npm install`
- [ ] Start services with `pm2 start ecosystem.config.cjs`
- [ ] Open dashboard at `http://localhost:5173`
- [ ] **USE THE DASHBOARD** for all course creation

---

## Environment Setup

### 1. Clone the Repo

```bash
git clone https://github.com/thomascassidyzm/ssi-dashboard-v7.git
cd ssi-dashboard-v7
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and update these critical values:

```bash
# Your ngrok domain
NGROK_DOMAIN=kai-lizard-function.ngrok-free.dev

# Shared credentials - GET THESE FROM TOM (not stored in git)
# Tom will share via secure channel (Signal/encrypted)
ANTHROPIC_API_KEY=<get from Tom>
SUPABASE_URL=<get from Tom>
SUPABASE_SERVICE_KEY=<get from Tom>
AWS_ACCESS_KEY_ID=<get from Tom>
AWS_SECRET_ACCESS_KEY=<get from Tom>
AWS_REGION=eu-west-1
S3_BUCKET=ssi-audio-stage
AZURE_SPEECH_KEY=<get from Tom>
AZURE_SPEECH_REGION=ukwest
XAI_API_KEY=<get from Tom>   # known-side/English + explainer voices; without it xAI voice calls 500
```

### 3. Start Services

```bash
# Start all services via PM2
pm2 start ecosystem.config.cjs

# Or start individual services
pm2 start services/orchestration/orchestrator.cjs --name ssi-orchestrator
pm2 start services/phases/phase0-language-brief/server.cjs --name phase0-brief
pm2 start services/phases/phase1-translation/server.cjs --name phase1
pm2 start services/phases/phase2-conflict-resolution/server.cjs --name phase2-conflict
pm2 start services/phases/phase3-basket-generation/server.cjs --name phase3-baskets
pm2 start services/phases/phase8-audio-v13.cjs --name phase8-audio
pm2 start services/production-api.cjs --name production-api

# Save PM2 state
pm2 save
```

### 4. Start ngrok Tunnel

```bash
# First time only: authenticate with Tom's ngrok account
ngrok config add-authtoken <get authtoken from Tom>

# Then start the tunnel with your assigned domain
ngrok http 3463 --domain=kai-lizard-function.ngrok-free.dev
```

Note: Both domains (`kai-lizard-function` and `mirthlessly-nonanesthetized-marilyn`) are on Tom's ngrok account. You use the one assigned to your machine.

### 5. Update Vercel Config (if using Vercel)

In `vercel.json`, update the ngrok domain to yours for the API rewrites.

---

## The Pipeline: Phase 0 → Phase 3

### Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       COURSE CREATION PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Phase 0: Language Brief                                                │
│  ─────────────────────────                                              │
│  Claude Opus 4.5 generates linguistic intelligence for the pair        │
│  • ZUT failures/passes                                                  │
│  • Chunking guidance                                                    │
│  • Conflict patterns                                                    │
│  • Atomicity rules                                                      │
│  User reviews/edits before proceeding                                   │
│                                                                         │
│  Phase 1: Translation + LEGO Extraction                                 │
│  ─────────────────────────────────────                                  │
│  Seeds → Translated pairs + LEGO breakdown                              │
│  Output: draft_lego_pairs.json (may have conflicts)                     │
│                                                                         │
│  Phase 2: Conflict Resolution                                           │
│  ───────────────────────────                                            │
│  Resolves KNOWN→TARGET conflicts via upchunking                         │
│  Output: lego_pairs.json (conflict-free, with new: true/false)          │
│                                                                         │
│  Phase 3: Basket Generation                                             │
│  ─────────────────────────                                              │
│  Creates practice baskets with LEGO Debut cycle                         │
│  Output: lego_baskets.json                                              │
│                                                                         │
│  Phase 8: Audio Generation (later)                                      │
│  Phase 9: Manifest Compilation (later)                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Running from the Dashboard

**IMPORTANT**: All operations should go through the dashboard UI. No CLI commands for course creation.

1. **Navigate to**: Dashboard → Generate New Course
2. **Enter course code**: `ita_for_eng` (Italian for English speakers)
3. **Generate Language Brief**: Click "Generate Brief" - waits 30-60 seconds for Claude Opus 4.5
4. **Review/Edit Brief**: Check ZUT failures, chunking guidance, conflict patterns
5. **Save Brief**: Store in Supabase for Phase 1-3 to use
6. **Select Generation Mode**: Quick Test (10 seeds), MVP (250 seeds), or Full (668 seeds)
7. **Start Generation**: Launches browser agents for Phase 1 → 2 → 3

---

## Key Concepts: A-type vs M-type (Updated Jan 2026)

### The Inferability Framework

**A-type (Atomic)**: Smallest teachable unit that passes ZUT (Zero Uncertainty Test)
- Learner hears known text → produces target with zero ambiguity
- Can be single-word or multi-word

**M-type (Molecular)**: An introducible unit that CANNOT be inferred by the learner

An M-type is needed when:
1. **Missing components** - some pieces aren't learned yet
2. **Glue/filler words** - only some parts are A-types, others are idiomatic glue
3. **Order mismatch** - all A-types known but order differs between languages

### The Inferability Test

> Given what the learner already knows, can they figure this out themselves?

| Answer | Result |
|--------|--------|
| YES - tile known pieces in same order | Not a new LEGO, just combine A-types |
| NO - missing knowledge, glue, or reordering | M-type needed |

### Examples

| Phrase | Result | Why |
|--------|--------|-----|
| "speak Chinese" = "说中文" | Just tile A-types | Both exist, same order |
| "blue thing" = "cosa azul" | M-type needed | Order reversed |
| "tengo ganas de" = "I feel like" | M-type needed | "ganas de" is idiomatic glue |
| "the cat" = "y gath" (Welsh) | M-type needed | Mutation triggered |

---

## What's Been Done Recently (Last 3 Weeks)

### Phase 0: Language Brief System (Jan 7)
- Created Phase 0 service on port 3455
- Uses Claude Opus 4.5 API directly (not browser agents)
- Stores briefs in Supabase `language_pair_briefs` table
- UI in LanguageBriefEditor.vue for review/edit

### A-type/M-type Definition Refinement (Jan 7)
- Updated all prompts with "Inferability Framework"
- Updated Pedagogy.vue, TerminologyGlossary.vue, APMLSpec.vue
- The core test: "Can learner infer this from what they know?"

### QA Workflow Improvements (Jan 3-6)
- Sample flagging moved to `sample_flags` table
- Per-audio-track flags (not phrase-level)
- Regenerate Flagged Audio workflow
- Script Viewer with inline audio playback

### Database-First Architecture (Dec-Jan)
- Phase 1-3 write directly to Supabase (dual-write with JSON)
- Audio registry in `course_audio` table
- Manifest compilation reads from Supabase

### Audio Generation (Dec)
- Phase 8 uses Azure TTS
- Parallel generation (10 concurrent by default)
- Speed/cadence controls per voice role
- Variation parameter for determinism workaround

---

## Known Issues & Challenges

### 1. Browser Agent Spawning
- Dashboard spawns Safari browser agents for Phase 1-3
- Agents need ngrok URL to POST results back
- If agents fail to connect, check ngrok is running

### 2. Phase 0 Timeout
- Claude Opus 4.5 can take 30-60 seconds for brief generation
- UI shows spinner - wait for it
- If timeout, check PM2 logs: `pm2 logs phase0-brief`

### 3. Model Names
- Use exact model IDs: `claude-opus-4-5-20251101`, `claude-sonnet-4-5-20250929`
- Wrong model names return 404 errors

### 4. Port Conflicts
- Phase 0: 3455
- Orchestrator: 3456
- Phase 1: 3457
- Phase 2: 3458
- Phase 3: 3459
- ngrok-proxy: 3463
- Phase 8: 3465
- Production API: 3470

### 5. Supabase Tables
If a table is missing, check `supabase/migrations/` for the SQL to run.

Key tables:
- `language_pair_briefs` - Phase 0 briefs
- `seeds` - Course seeds
- `lego_pairs` - Phase 1-2 output
- `lego_baskets` - Phase 3 output
- `course_audio` - Audio registry
- `sample_flags` - QA flags

---

## Service Ports Reference

| Service | Port | PM2 Name |
|---------|------|----------|
| Orchestrator | 3456 | ssi-orchestrator |
| Phase 0 (Brief) | 3455 | phase0-brief |
| Phase 1 (Translation) | 3457 | phase1 |
| Phase 2 (Conflicts) | 3458 | phase2-conflict |
| Phase 3 (Baskets) | 3459 | phase3-baskets |
| ngrok-proxy | 3463 | ngrok-proxy |
| Phase 8 (Audio) | 3465 | phase8-audio |
| Production API | 3470 | production-api |
| Dashboard (Vite) | 5173 | - |

---

## Useful Commands

```bash
# Check all services
pm2 list

# View logs
pm2 logs ssi-orchestrator
pm2 logs phase0-brief --lines 50

# Restart a service
pm2 restart phase1

# Check what's on a port
lsof -i :3456

# Start dashboard dev server
npm run dev

# Pull latest and restart
git pull && pm2 restart all
```

---

## Creating the Italian Course

1. **Dashboard** → Generate New Course
2. **Course Code**: `ita_for_eng`
3. **Generate Brief**: Wait for Claude Opus 4.5 (~30-60s)
4. **Review Brief**: Check:
   - ZUT failures (articles, prepositions, verb conjugations?)
   - Chunking guidance (gender agreement, adjective placement?)
   - Conflict patterns (per/para, essere/stare, sapere/conoscere?)
5. **Edit if needed**: Fix any incorrect guidance
6. **Save Brief**: Stored in Supabase
7. **Choose Mode**: Start with Quick Test (10 seeds) to verify pipeline
8. **Start Generation**: Watch the Generation Monitor

---

## Troubleshooting

**If something doesn't work, contact Tom.** Don't try to fix code.

### Quick Checks Before Contacting Tom

1. **Services running?** `pm2 list` - all should be "online"
2. **ngrok running?** Check your terminal for the ngrok process
3. **Browser console errors?** Open DevTools (F12) → Console tab
4. **Correct .env?** Double-check credentials from Tom

### Common Issues

| Problem | Quick Check | If Still Broken |
|---------|-------------|-----------------|
| Brief won't generate | Wait 60 seconds, check pm2 logs | Contact Tom |
| Agents not connecting | Is ngrok running? | Contact Tom |
| Dashboard won't load | `npm run dev` running? | Contact Tom |
| Audio fails | Check pm2 logs phase8-audio | Contact Tom |

---

## What to Focus On (For Now)

**Your priority:** Master the dashboard workflow so you can train Deborah.

You don't need to dig into:
- The codebase internals
- How the phases work under the hood
- Database schemas
- API implementations

That understanding will come later. Right now, focus on the user experience.

---

## Feedback & Issues

**Document everything that doesn't work smoothly:**

- Dashboard confusing somewhere? → Note it
- Missing feature? → Note it
- Something broken? → Tell Tom, he'll fix it
- Idea for improvement? → Write it down

You're essentially doing UAT (user acceptance testing) on the new workflow. Your feedback will shape what Deborah and future course creators experience.

---

## The Bigger Picture

```
Kai (this week)     → Italian-250 + learn dashboard
     ↓
Deborah (next week) → French-250 (trained by Kai)
     ↓
Future creators     → Self-service course creation
```

**You're building the training path for everyone who comes after.**

---

**Good luck with Italian! The pipeline is ready.**
