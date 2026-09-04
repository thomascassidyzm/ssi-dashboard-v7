# Popty for developers — compiled

**Version `f6d60e628056` · generated 2026-09-04. DO NOT EDIT — derived; edit tools/explainer/rulings/dev.md or the code, then recompile.**

### orientation

Popty is the content-creation half of the SSi ecosystem: this repo makes courses, the learning
app serves them, Supabase and S3 sit between. Course content is database rows, never JSON files
— the JSON artifacts you'll find are legacy. The git history and the code are the source of
truth; CLAUDE.md holds only the rails that code can't express.

### constraints

Three constraints shape everything: TTS costs money, so audio generation is approval-gated and
content passes end by queueing a request, never by minting clips. Some courses are
human-voiced only and the TTS chokepoint refuses them outright. And all LLM calls go through
the Claude CLI, never the SDK — a past SDK module silently billed real money daily. The
explainer you are reading follows the same shape: all intelligence at compile time, zero model
calls at runtime.

## Derived truth (from the code, this compile)

- Active workflow (SYSTEM.md): Phase 1 → 3 → 8 → 9
- Phase servers: Orchestrator :3456 · Translation + LEGO Extraction :3457 (phase 1) · Conflict Resolution :3458 (phase 2) · Basket Generation :3459 (phase 3) · Legacy Manifest (deprecated) :3464 · Audio Generator (Supabase) :3465 (phase 8) · Manifest Compiler (Supabase) :3466 (phase 9) · Production API (QA + WebSocket) :3470
- Roles (dashboard_users.role): admin, editor, recorder — persona rendering hangs off exactly these.
- Nav surfaces: Courses / Pedagogy / Admin; admin section: Admin, Labs, Insights, Activity, Maintenance, Users, Recording, Test builds, Stock-take; rulings: Pedagogy; stock-take: Stock-take, Pipeline, Glossary, APML; courses: Library, Seeds, Content, Pods, Script Lab, Metagraph.
