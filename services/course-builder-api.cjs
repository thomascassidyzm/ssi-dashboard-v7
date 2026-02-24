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

app.use('/api', require('./course-builder/routes/preflight.cjs')(ctx));
app.use('/api', require('./course-builder/routes/seed-complete.cjs')(ctx));
app.use('/api', require('./course-builder/routes/course-data.cjs')(ctx));
app.use('/api', require('./course-builder/routes/build.cjs')(ctx));
app.use('/api', require('./course-builder/routes/orchestrator.cjs')(ctx));
app.use('/api', require('./course-builder/routes/v2.cjs')(ctx));
app.use('/api', require('./course-builder/routes/translation.cjs')(ctx));

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
  console.log(`║  Pipeline: translate → decompose → complete                   ║`);
  console.log(`║  POST /api/seed/complete    - Atomic seed+LEGOs+phrases       ║`);
  console.log(`║  POST /api/build/decompose  - Spawn decompose agent           ║`);
  console.log(`║  POST /api/orchestrator/chat - Agent ↔ human chat             ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  // Start build manager to monitor running jobs from DB
  startBuildManager(ctx);
  console.log('[BUILD] Build manager started - monitoring running jobs from DB');
});
