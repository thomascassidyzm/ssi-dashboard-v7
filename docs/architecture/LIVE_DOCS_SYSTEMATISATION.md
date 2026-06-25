# Live Docs Systematisation — Phase B/C Design

*Status: proposal · Author: agent (session 2026-06-14) · Audience: staff-only for now*

## Why

The `/docs` area is seven hand-written Vue pages. Each is a separate place for
truth to drift, and they have drifted at different rates: the two that read from
a live source (Process Overview's discipline, Canonical Seeds' Supabase fetch)
stayed honest; the hardcoded ones rotted. We want docs that **track the code
automatically**, on the principle Tom set out:

> Code is the source of truth. APML is the human/agent-readable record of
> *intention* (YAML), captured *after* the code. It should live in the database,
> not the repo, and be pulled live — so when the code changes and the APML is
> re-captured, the documentation updates itself.

Audience scope for this round: **internal staff only.** Community-builder and
public-methodology framings are explicitly deferred.

## What already exists (do not rebuild)

- **Tables**: `documentation_content`, `documentation_sections` (schema now
  version-controlled in `database/migrations/20260614_documentation_content_tables.sql`).
- **RPCs**: `get_documentation(slug)`, `get_documentation_list(category)`, with
  manual-query fallbacks in `services/supabase-client.cjs`.
- **Upsert helpers**: `upsertDocumentation()`, `upsertDocumentationSection()`
  (same file) — the write path a capture step will use.
- **Live API (Phase A, done)**: `GET /api/docs/list` and `GET /api/docs/:slug`
  served from production-api (3470), the entry point the frontend actually uses.
- **Consumer pattern**: `Pedagogy.vue` already fetches `getDocumentation('pedagogy')`
  and falls back to hardcoded content on miss. This is the template to generalise.
- **Capture skill**: `.claude/commands/sync-apml.md` already regenerates APML
  from code and commits it to `apml/`. Phase B extends its *destination*.

## Decisions (my recommendation — proceed unless Tom objects)

1. **Content model = markdown, not structured JSONB.** For the five prose pages
   (APML, Pedagogy, Terminology, Process Overview, Phase Intelligence) use
   `content_type='markdown'` + `markdown_content`. Markdown is the cheapest thing
   to author, the easiest for an agent to regenerate from code, and matches the
   repo's existing authoritative prose (`CLAUDE.md`, `ralph-methodology.md`,
   `synonym-choice-architecture.md`, `SYSTEM.md`). Reserve the structured
   `content` JSONB only for the handful of dynamic fields a page already reads
   (e.g. Pedagogy's `content.header.version_info`).

2. **The two data-backed pages stay direct.** Canonical Seeds and Canonical
   Content already read live tables (`canonical_seeds` etc.) and are correct.
   Do **not** force them through the docs table — live data is not documentation.

3. **One renderer, not five bespoke pages.** Introduce a single `<MarkdownDoc>`
   component: takes a slug, calls `getDocumentation`, renders `markdown_content`,
   shows the "loaded from database / fallback" indicator, and accepts a hardcoded
   fallback slot. The five prose pages collapse to thin wrappers over it. This is
   the simpler/cheaper win — five drift surfaces become one renderer + DB rows.

4. **Capture is code → markdown → DB.** Extend `sync-apml` so that, after
   regenerating an APML/markdown record from the code, it also calls
   `upsertDocumentation()` to write `markdown_content` into the DB. That closes
   the auto-update loop: change code → run `/sync-apml` → docs refresh live.

## Plan

**Phase B — capture step (no UI risk)**
1. Add a small writer (script or `sync-apml` step) that upserts a doc's
   `markdown_content` + metadata via the existing `upsertDocumentation()`.
   Idempotent on `slug`. Dry-run by default; `--execute` to write.
2. Seed the five prose docs once from current page content + the repo markdown
   they should mirror. This is the "is Phase C rewrite or data-entry?" answer.

**Phase C — collapse the pages (UI, do with the app running)**
3. Build `<MarkdownDoc>`; convert the five prose pages to wrappers that pass
   their slug + keep current content as the fallback (no regression if DB empty).
4. Make `DocsIndex` render its cards from `getDocumentationList()` instead of
   hardcoded cards/counts — only after the DB is confirmed seeded (else the hub
   renders empty). Kill the hardcoded `668` / "7 documents" / version stats.

## Must run where Supabase credentials exist (can't be done from a sandbox)

- Verify Phase A end-to-end: `curl localhost:3470/api/docs/list` and
  `/api/docs/pedagogy` → confirms whether the tables hold content or are empty.
- Apply the migration (idempotent; safe if objects already exist).
- Run the Phase B seed (`--execute`) and confirm pages light up from the DB.

## Explicitly out of scope this round

- Community/volunteer builder views and gating.
- Public-facing methodology presentation.
- Migrating encouragements/welcomes off their static JSON (separate, needs a
  destination-table decision).
