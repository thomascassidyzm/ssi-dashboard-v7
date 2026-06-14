-- 20260614_documentation_content_tables.sql
--
-- Version-controls the live-docs schema that the dashboard /docs pages read
-- from. These tables + RPCs were created ad-hoc in Supabase and were never
-- captured in the repo; the helpers in services/supabase-client.cjs
-- (getDocumentation / getDocumentationList + their fallbacks) and the new
-- /api/docs/* endpoints on production-api (port 3470) depend on this shape.
--
-- IDEMPOTENT + RECONCILE-BEFORE-APPLY: every statement is CREATE ... IF NOT
-- EXISTS or CREATE OR REPLACE, so applying this against a database where the
-- objects already exist is a no-op for the tables and a faithful re-definition
-- for the RPCs. The column set matches what supabase-client.cjs reads/writes
-- today — if the live tables differ, reconcile columns before applying.
--
-- Reads go through the service key (RLS bypassed), so no policies are defined
-- here; add an anon read policy in a follow-up if the docs ever need anon reads.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS documentation_content (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT UNIQUE NOT NULL,
  title            TEXT,
  subtitle         TEXT,
  category         TEXT DEFAULT 'reference',   -- reference | course-content | architecture | tutorial
  display_order    INT  DEFAULT 0,
  content_type     TEXT DEFAULT 'structured',  -- structured | markdown
  content          JSONB,                      -- structured page content
  markdown_content TEXT,                        -- raw markdown (content_type='markdown')
  version          TEXT DEFAULT '1.0',
  badge_text       TEXT,
  badge_color      TEXT,
  icon_name        TEXT,
  is_published     BOOLEAN DEFAULT TRUE,
  is_featured      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documentation_sections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES documentation_content(id) ON DELETE CASCADE,
  section_key       TEXT NOT NULL,
  title             TEXT,
  anchor            TEXT,
  content           JSONB,
  content_html      TEXT,
  display_order     INT  DEFAULT 0,
  style_variant     TEXT DEFAULT 'default',
  border_color      TEXT,
  is_collapsible    BOOLEAN DEFAULT FALSE,
  default_collapsed BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (document_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_documentation_sections_document_id
  ON documentation_sections (document_id, display_order);

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- get_documentation: one document by slug, with its sections aggregated into a
-- jsonb array (ordered). Returns a single-row set; the client takes data[0].
CREATE OR REPLACE FUNCTION get_documentation(p_slug TEXT)
RETURNS TABLE (
  id               UUID,
  slug             TEXT,
  title            TEXT,
  subtitle         TEXT,
  category         TEXT,
  display_order    INT,
  content_type     TEXT,
  content          JSONB,
  markdown_content TEXT,
  version          TEXT,
  badge_text       TEXT,
  badge_color      TEXT,
  icon_name        TEXT,
  is_published     BOOLEAN,
  is_featured      BOOLEAN,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  sections         JSONB
)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    d.id, d.slug, d.title, d.subtitle, d.category, d.display_order,
    d.content_type, d.content, d.markdown_content, d.version,
    d.badge_text, d.badge_color, d.icon_name, d.is_published, d.is_featured,
    d.created_at, d.updated_at,
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.display_order)
         FROM documentation_sections s
        WHERE s.document_id = d.id),
      '[]'::jsonb
    ) AS sections
  FROM documentation_content d
  WHERE d.slug = p_slug
    AND d.is_published = TRUE;
$function$;

-- get_documentation_list: published document summaries for nav, optionally
-- filtered by category, ordered by display_order then title.
CREATE OR REPLACE FUNCTION get_documentation_list(p_category TEXT DEFAULT NULL)
RETURNS TABLE (
  id            UUID,
  slug          TEXT,
  title         TEXT,
  subtitle      TEXT,
  category      TEXT,
  display_order INT,
  badge_text    TEXT,
  badge_color   TEXT,
  icon_name     TEXT,
  is_featured   BOOLEAN,
  updated_at    TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    d.id, d.slug, d.title, d.subtitle, d.category, d.display_order,
    d.badge_text, d.badge_color, d.icon_name, d.is_featured, d.updated_at
  FROM documentation_content d
  WHERE d.is_published = TRUE
    AND (p_category IS NULL OR d.category = p_category)
  ORDER BY d.display_order, d.title;
$function$;
