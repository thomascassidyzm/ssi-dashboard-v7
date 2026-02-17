/**
 * Course Builder API — Thin shell (~100 lines)
 *
 * All business logic lives in course-builder/lib/ and course-builder/routes/.
 * This file: Express app, Supabase client, context creation, router mounting.
 *
 * Architecture (February 2026):
 *   context.cjs        — Shared state (Maps, config constants)
 *   lib/*.cjs          — Business logic (validation, vocab, checkpoint, etc.)
 *   routes/*.cjs       — Express sub-routers (factory functions receiving ctx)
 *   briefs/*.cjs       — Agent brief generation (already separate)
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const createContext = require('./course-builder/context.cjs');
const { startBuildManager } = require('./course-builder/lib/build-manager.cjs');
const { setSupabase } = require('./briefs/shared.cjs');

// ─── Express app setup ────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb', type: ['text/plain', 'text/markdown'] }));

// ─── Supabase + shared context ────────────────────────────────────────

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ctx = createContext(supabase);

// Share supabase client with briefs module
setSupabase(supabase);

// ─── Mount route modules ──────────────────────────────────────────────

app.use('/api', require('./course-builder/routes/seed-complete.cjs')(ctx));
app.use('/api', require('./course-builder/routes/course-data.cjs')(ctx));
app.use('/api', require('./course-builder/routes/build.cjs')(ctx));
app.use('/api', require('./course-builder/routes/qa.cjs')(ctx));
app.use('/api', require('./course-builder/routes/checkpoint.cjs')(ctx));
app.use('/api', require('./course-builder/routes/translation.cjs')(ctx));
app.use('/api', require('./course-builder/routes/golden.cjs')(ctx));
app.use('/api', require('./course-builder/routes/v2.cjs')(ctx));
app.use('/api', require('./course-builder/routes/calibration.cjs')(ctx));
app.use('/api', require('./course-builder/routes/activity.cjs')(ctx));
app.use('/api', require('./course-builder/routes/drafts.cjs')(ctx));

// Mount briefs router
app.use('/api/brief', require('./briefs/index.cjs'));

// ─── Health check ─────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ ok: true }));

// ─── Start server ─────────────────────────────────────────────────────

const PORT = process.env.COURSE_BUILDER_PORT || 3471;

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Course Builder API - Port ${PORT}                            ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Architecture: Thin shell + 11 route modules + 10 lib files ║`);
  console.log(`║  Briefs: /api/brief/:courseCode/stage/:stage                 ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  GOLDEN PATH:                                                ║`);
  console.log(`║  POST /api/seed/complete - Atomic seed+LEGOs+phrases         ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Key Endpoints:                                               ║`);
  console.log(`║  GET  /api/resume/:code    - Resume after compaction          ║`);
  console.log(`║  GET  /api/stats/:code     - Quality metrics + vocab size     ║`);
  console.log(`║  GET  /api/seeds/:code     - Canonical seeds from database    ║`);
  console.log(`║  GET  /api/vocab/:code     - Current vocabulary set           ║`);
  console.log(`║  POST /api/build/start/:c  - Start parallel build             ║`);
  console.log(`║  GET  /api/checkpoint/*    - QA gates at seeds 10,50,150,300  ║`);
  console.log(`║  POST /api/v2/*           - V2 staged pipeline                ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  // Start build manager to monitor running jobs from DB
  startBuildManager(ctx);
  console.log('[BUILD] Build manager started - monitoring running jobs from DB');
});
