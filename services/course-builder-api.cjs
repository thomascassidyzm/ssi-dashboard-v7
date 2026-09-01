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

// ─── Editor identity on save (Tom's ruling, 2026-09-01) ───────────────
// Course Builder has no auth of its own — it sits behind production-api's
// proxy gate. That gate answers "may you touch this course"; it never answered
// "who are you", so an edit landed with no record of who made it. This gate
// resolves an editor identity for every route in
// services/shared/content-write-surfaces.cjs and REFUSES the request when it
// cannot, before any handler reaches the database. Non-content routes are
// untouched. Mounted after express.json so it can read the body for a course
// code, and before every router so no content write can slip in front of it.
const { contentEditGate } = require('./shared/content-edit-gate.cjs');
app.use(contentEditGate({ supabase, service: 'course-builder' }));

// ─── Mount route modules ──────────────────────────────────────────────

// DISABLED: preflight route used Anthropic SDK directly (phrase-scorer.cjs),
// billing per-token instead of using CLI subscription. Agents already score
// their own phrases — this was redundant. See CLAUDE.md "NEVER Use the Anthropic SDK".
// app.use('/api', require('./course-builder/routes/preflight.cjs')(ctx));
app.use('/api', require('./course-builder/routes/seed-complete.cjs')(ctx));
app.use('/api', require('./course-builder/routes/course-data.cjs')(ctx));
app.use('/api', require('./course-builder/routes/build.cjs')(ctx));
app.use('/api', require('./course-builder/routes/orchestrator.cjs')(ctx));
app.use('/api', require('./course-builder/routes/v2.cjs')(ctx));
app.use('/api', require('./course-builder/routes/translation.cjs')(ctx));
app.use('/api', require('./course-builder/routes/edit-cascade.cjs')(ctx));
app.use('/api', require('./course-builder/routes/qa.cjs')(ctx));
app.use('/api', require('./course-builder/routes/components.cjs')(ctx));
app.use('/api', require('./course-builder/routes/drafts.cjs')(ctx));
// v3 phrase generation — the prompt the six-language replication measured, on
// Opus as the single tier (Tom's ruling 2026-08-27). Generates only; submission
// and validation stay on the existing doors.
app.use('/api', require('./course-builder/routes/phrases-v3.cjs')(ctx));

// Mount briefs router
app.use('/api/brief', require('./briefs/index.cjs'));

// ─── Health check ─────────────────────────────────────────────────────

// `build` is the commit this process STARTED from, frozen at require time —
// see services/shared/build-identity.cjs. The staleness watchdog reads it.
const { identity: buildIdentity } = require('./shared/build-identity.cjs');

app.get('/health', (req, res) => res.json({ ok: true, build: buildIdentity() }));

// ─── Start server ─────────────────────────────────────────────────────

const PORT = process.env.COURSE_BUILDER_PORT || 3471;
// Bind loopback-only by default — watson-1 has a public IP, so a bare listen()
// (all interfaces) exposes this service to the internet. Override via BIND_HOST.
const HOST = process.env.BIND_HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Course Builder API - Port ${PORT}                            ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Pipeline: translate → decompose → complete                   ║`);
  console.log(`║  POST /api/seed/complete    - Atomic seed+LEGOs+phrases       ║`);
  console.log(`║  POST /api/build/decompose  - Spawn decompose agent           ║`);
  console.log(`║  POST /api/orchestrator/chat - Agent ↔ human chat             ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  // Start build manager to monitor running jobs from DB.
  // GUARD: a PARALLEL instance (e.g. the gated v2 build lane on another port) must
  // run BUILD_MANAGER=off, or its 30s checkBuilds loop would fight the production
  // instance over the shared build_jobs table (double-respawn / status thrash). With
  // the manager off it's a pure validate+insert API — drive it via direct
  // POST /api/seed/complete. Default (unset) keeps production behaviour unchanged.
  if (process.env.BUILD_MANAGER === 'off') {
    console.log('[BUILD] Build manager DISABLED (BUILD_MANAGER=off) — pure validate+insert API, no job orchestration');
  } else {
    startBuildManager(ctx);
    console.log('[BUILD] Build manager started - monitoring running jobs from DB');
  }
});
