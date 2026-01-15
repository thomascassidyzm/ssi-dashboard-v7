-- =============================================================================
-- DOCUMENTATION CONTENT SCHEMA
-- Migration: 20260112_documentation_content.sql
--
-- Database-driven documentation content for Vue documentation components.
-- Allows updates without code changes.
--
-- Documents:
--   - Pedagogy (methodology explanation)
--   - APML Specification
--   - Process Overview
--   - Terminology Glossary
--   - etc.
-- =============================================================================

-- =============================================================================
-- 1. DOCUMENTATION_CONTENT TABLE
-- =============================================================================
-- Stores structured documentation content with markdown support

CREATE TABLE IF NOT EXISTS documentation_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document identification
  slug TEXT NOT NULL UNIQUE,            -- URL-friendly identifier (e.g., 'pedagogy', 'apml-spec')
  title TEXT NOT NULL,                  -- Display title
  subtitle TEXT,                        -- Optional subtitle/description

  -- Content organization
  category TEXT NOT NULL DEFAULT 'reference'
    CHECK (category IN ('reference', 'course-content', 'architecture', 'tutorial')),
  display_order INTEGER DEFAULT 0,      -- For ordering in navigation

  -- Content (supports both structured JSON and raw markdown)
  content_type TEXT NOT NULL DEFAULT 'structured'
    CHECK (content_type IN ('structured', 'markdown')),
  content JSONB,                        -- Structured content (sections, blocks, etc.)
  markdown_content TEXT,                -- Raw markdown alternative

  -- Metadata
  version TEXT DEFAULT '1.0',           -- Content version
  badge_text TEXT,                      -- Optional badge (e.g., 'v13', 'methodology')
  badge_color TEXT,                     -- Badge color theme (e.g., 'emerald', 'amber')
  icon_name TEXT,                       -- Icon identifier for navigation

  -- Publishing state
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,    -- Show prominently in docs hub

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documentation_content_slug
  ON documentation_content (slug);

CREATE INDEX IF NOT EXISTS idx_documentation_content_category
  ON documentation_content (category);

CREATE INDEX IF NOT EXISTS idx_documentation_content_published
  ON documentation_content (is_published);

CREATE INDEX IF NOT EXISTS idx_documentation_content_display_order
  ON documentation_content (category, display_order);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_documentation_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documentation_content_updated_at_trigger
  BEFORE UPDATE ON documentation_content
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_content_updated_at();

COMMENT ON TABLE documentation_content IS 'Database-driven documentation content for Vue components';
COMMENT ON COLUMN documentation_content.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN documentation_content.content_type IS 'structured (JSON) or markdown (raw text)';
COMMENT ON COLUMN documentation_content.content IS 'Structured JSON content with sections and blocks';
COMMENT ON COLUMN documentation_content.markdown_content IS 'Raw markdown content (when content_type is markdown)';

-- =============================================================================
-- 2. DOCUMENTATION_SECTIONS TABLE
-- =============================================================================
-- For documents with multiple discrete sections that can be reordered/edited independently

CREATE TABLE IF NOT EXISTS documentation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent document
  document_id UUID NOT NULL REFERENCES documentation_content(id) ON DELETE CASCADE,

  -- Section identification
  section_key TEXT NOT NULL,            -- Unique within document (e.g., 'core-philosophy', 'what-is-lego')
  title TEXT NOT NULL,
  anchor TEXT,                          -- For jump links (e.g., '#core-philosophy')

  -- Content
  content JSONB NOT NULL,               -- Section-specific structured content
  content_html TEXT,                    -- Pre-rendered HTML (optional, for performance)

  -- Display
  display_order INTEGER DEFAULT 0,
  is_collapsible BOOLEAN DEFAULT false,
  default_collapsed BOOLEAN DEFAULT false,

  -- Styling hints
  style_variant TEXT DEFAULT 'default'
    CHECK (style_variant IN ('default', 'highlight', 'warning', 'info', 'example')),
  border_color TEXT,                    -- Optional accent color

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique section key per document
  UNIQUE (document_id, section_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documentation_sections_document
  ON documentation_sections (document_id);

CREATE INDEX IF NOT EXISTS idx_documentation_sections_order
  ON documentation_sections (document_id, display_order);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_documentation_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documentation_sections_updated_at_trigger
  BEFORE UPDATE ON documentation_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_sections_updated_at();

COMMENT ON TABLE documentation_sections IS 'Independently editable sections within documents';
COMMENT ON COLUMN documentation_sections.section_key IS 'Unique identifier within parent document';
COMMENT ON COLUMN documentation_sections.content IS 'Section-specific structured content (blocks, lists, etc.)';

-- =============================================================================
-- 3. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE documentation_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_sections ENABLE ROW LEVEL SECURITY;

-- Service role has full access (backend operations)
CREATE POLICY documentation_content_service_policy ON documentation_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY documentation_sections_service_policy ON documentation_sections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read all documents
CREATE POLICY documentation_content_auth_read ON documentation_content
  FOR SELECT TO authenticated USING (true);

CREATE POLICY documentation_sections_auth_read ON documentation_sections
  FOR SELECT TO authenticated USING (true);

-- Anon users can read published documents only
CREATE POLICY documentation_content_anon_read ON documentation_content
  FOR SELECT TO anon USING (is_published = true);

CREATE POLICY documentation_sections_anon_read ON documentation_sections
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM documentation_content dc
      WHERE dc.id = documentation_sections.document_id
      AND dc.is_published = true
    )
  );

-- =============================================================================
-- 4. HELPER FUNCTIONS
-- =============================================================================

-- Get document by slug with all sections
CREATE OR REPLACE FUNCTION get_documentation(p_slug TEXT)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  title TEXT,
  subtitle TEXT,
  category TEXT,
  content_type TEXT,
  content JSONB,
  markdown_content TEXT,
  version TEXT,
  badge_text TEXT,
  badge_color TEXT,
  is_published BOOLEAN,
  updated_at TIMESTAMPTZ,
  sections JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.slug,
    dc.title,
    dc.subtitle,
    dc.category,
    dc.content_type,
    dc.content,
    dc.markdown_content,
    dc.version,
    dc.badge_text,
    dc.badge_color,
    dc.is_published,
    dc.updated_at,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', ds.id,
          'section_key', ds.section_key,
          'title', ds.title,
          'anchor', ds.anchor,
          'content', ds.content,
          'content_html', ds.content_html,
          'display_order', ds.display_order,
          'style_variant', ds.style_variant,
          'border_color', ds.border_color,
          'is_collapsible', ds.is_collapsible,
          'default_collapsed', ds.default_collapsed
        ) ORDER BY ds.display_order
      )
      FROM documentation_sections ds
      WHERE ds.document_id = dc.id),
      '[]'::jsonb
    ) AS sections
  FROM documentation_content dc
  WHERE dc.slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all documents for navigation/listing
CREATE OR REPLACE FUNCTION get_documentation_list(p_category TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  title TEXT,
  subtitle TEXT,
  category TEXT,
  display_order INTEGER,
  badge_text TEXT,
  badge_color TEXT,
  icon_name TEXT,
  is_featured BOOLEAN,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.slug,
    dc.title,
    dc.subtitle,
    dc.category,
    dc.display_order,
    dc.badge_text,
    dc.badge_color,
    dc.icon_name,
    dc.is_featured,
    dc.updated_at
  FROM documentation_content dc
  WHERE dc.is_published = true
    AND (p_category IS NULL OR dc.category = p_category)
  ORDER BY dc.display_order, dc.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. SEED INITIAL CONTENT (Pedagogy document structure)
-- =============================================================================
-- This provides the structure for Pedagogy.vue content

INSERT INTO documentation_content (
  slug,
  title,
  subtitle,
  category,
  display_order,
  content_type,
  badge_text,
  badge_color,
  icon_name,
  is_featured,
  content,
  version
) VALUES (
  'pedagogy',
  'SSi Pedagogical Model',
  'The "why" behind the SSi teaching system',
  'reference',
  1,
  'structured',
  'methodology',
  'amber',
  'layers',
  true,
  '{
    "header": {
      "version_info": "APML v11.2.0 | Conceptual foundation for language learning through LEGO recombination"
    },
    "core_philosophy": {
      "title": "Core Philosophy",
      "intro": "SSi teaches language as building blocks that recombine infinitely.",
      "points": [
        {"label": "Not memorization", "description": "Pattern recognition through transparent literal meanings"},
        {"label": "Not grammar rules", "description": "Discovery through component-by-component breakdown"},
        {"label": "Not random phrases", "description": "Systematic recombination of known elements"}
      ],
      "tagline": "Like learning to code: Master individual functions, then combine them into infinite programs."
    }
  }'::jsonb,
  '1.0'
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  content = EXCLUDED.content,
  updated_at = now();

-- Insert sections for Pedagogy document
INSERT INTO documentation_sections (
  document_id,
  section_key,
  title,
  anchor,
  display_order,
  style_variant,
  border_color,
  content
) VALUES
-- Section 1: What is a LEGO?
(
  (SELECT id FROM documentation_content WHERE slug = 'pedagogy'),
  'what-is-lego',
  'What is a LEGO?',
  'what-is-lego',
  1,
  'default',
  NULL,
  '{
    "intro": "A LEGO is a pedagogically-sound chunk of language that removes learner uncertainty. When a learner hears the KNOWN phrase, they know EXACTLY what to say in the TARGET language—zero guessing, zero ambiguity.",
    "heuristics": {
      "title": "The Two Heuristics (Extraction Principles)",
      "items": [
        {"label": "1. Remove Learner Uncertainty", "description": "Known phrase → ZERO uncertainty about target"},
        {"label": "2. Maximize Patterns with Minimum Vocab", "description": "Overlapping chunks multiply recombination power"}
      ]
    },
    "types": {
      "atomic": {
        "code": "A-type",
        "name": "ATOMIC LEGO",
        "color": "blue",
        "definition": "Smallest teachable unit that passes ZUT (Zero Uncertainty Test). Can be single-word or multi-word. The learner hears the known text and produces the target with zero ambiguity.",
        "examples": [
          {"known": "I want", "target": "quiero", "note": "Single target word, passes ZUT"},
          {"known": "to speak", "target": "hablar", "note": "Single target word, passes ZUT"},
          {"known": "speak Chinese", "target": "shuo zhongwen", "note": "A-types tile perfectly - no M-type needed!"}
        ],
        "footer": "No component breakdown - the LEGO is the minimum viable unit that passes ZUT."
      },
      "molecular": {
        "code": "M-type",
        "name": "MOLECULAR LEGO",
        "color": "emerald",
        "definition": "An introducible unit that CANNOT be inferred by the learner from what they already know. Requires explicit introduction.",
        "when_needed": [
          "Missing components - some pieces are not learned yet as standalone LEGOs",
          "Glue/filler words - only some parts are A-types, others are idiomatic/grammatical glue",
          "Order mismatch - all A-types known but order differs between languages"
        ],
        "examples": [
          {"known": "blue thing", "target": "cosa azul", "note": "Order reversed - learner cannot infer"},
          {"known": "I feel like", "target": "tengo ganas de", "note": "Contains idiomatic glue - cannot tile from A-types"},
          {"known": "the cat", "target": "y gath (Welsh)", "note": "Mutation triggered - learner cannot infer"}
        ],
        "footer": "The Inferability Test: Can the learner figure this out from what they already know? No = M-type needed."
      }
    },
    "inferability_test": {
      "title": "The Inferability Test",
      "question": "Given what the learner already knows, can they figure this out themselves?",
      "outcomes": [
        {"answer": "Yes", "result": "Not a new LEGO", "action": "Just tile existing A-types", "color": "emerald"},
        {"answer": "No", "result": "M-type needed", "action": "Requires explicit introduction", "color": "amber"}
      ]
    },
    "componentization": {
      "title": "Componentization: The Pedagogical Superpower",
      "intro": "M-type LEGOs use literal translations for each component. This transparency lets learners discover grammar patterns without explicit rules.",
      "example": {
        "phrase": "as often as possible",
        "target": "lo más frecuentemente posible",
        "components": [
          {"target": "lo más", "literal": "the most"},
          {"target": "frecuentemente", "literal": "often"},
          {"target": "posible", "literal": "possible"}
        ],
        "discoveries": [
          "Because they know: \"lo más\" = \"the most\"",
          "And they know: \"posible\" = \"possible\"",
          "They can now create: \"lo más posible\" = \"the most possible\"",
          "They understand: Spanish builds superlatives with \"lo más\" + adjective"
        ],
        "note": "No grammar explanation needed. The pattern emerges from transparent literal meanings."
      },
      "literal_vs_natural": {
        "natural": {"example": "frecuentemente = frequently", "problem": "Learner cannot discover \"often\" = \"frecuentemente\""},
        "literal": {"example": "frecuentemente = often", "benefit": "Transparent! Learner bridges \"often\" ↔ \"frequently\""}
      }
    }
  }'::jsonb
),
-- Section 2: What is a Basket?
(
  (SELECT id FROM documentation_content WHERE slug = 'pedagogy'),
  'what-is-basket',
  'What is a Basket?',
  'what-is-basket',
  2,
  'default',
  NULL,
  '{
    "intro": {
      "not": "A basket is NOT a random collection of practice phrases.",
      "is": "A basket is a demonstration of how THIS LEGO plugs into LEGOs the learner ALREADY knows."
    },
    "metaphor": {
      "title": "The API Documentation Metaphor",
      "items": [
        {"term": "LEGO", "description": "new function you are learning (e.g., filter())"},
        {"term": "Basket", "description": "code examples showing how to use this function"},
        {"term": "Available vocabulary", "description": "variables/functions already defined in previous code"},
        {"term": "Iron Rule", "description": "You cannot use undefined variables in your examples"}
      ]
    },
    "structure": {
      "title": "Approximately 10 Phrases per Basket",
      "intro": "Every basket contains approximately 10 practice phrases in progressive complexity.",
      "phrase_types": {
        "shorter": {
          "label": "Shorter Phrases (Up to 8 Shortest)",
          "badge": "FIRST TIME ONLY",
          "description": "Practiced ONLY during first introduction of this LEGO. Progressive complexity helps learner build confidence.",
          "characteristics": [
            "Simpler, shorter practice phrases",
            "Build gradually from simple to more complex",
            "Help learner gain initial confidence",
            "Discarded after first introduction"
          ],
          "analogy": "Like training wheels—used during initial learning, then removed."
        },
        "longer": {
          "label": "Longer Phrases (Spaced Repetition)",
          "badge": "USED FOREVER",
          "description": "Practiced every time this LEGO is revisited via the app spaced repetition logic. Must be excellent, natural, conversational.",
          "requirements": [
            "Most complex and longest phrases in basket",
            "Natural in BOTH languages",
            "Perfect grammar (errors here = disaster)",
            "Final LEGO in seed → longest phrase = complete seed sentence"
          ],
          "analogy": "Like actual cycling—used forever after you have learned."
        }
      },
      "app_usage": {
        "title": "How the App Uses Baskets",
        "description": "The app uses different phrases from the basket depending on context:",
        "cases": [
          "First time learning? → Practice the shorter phrases (up to 8 shortest)",
          "Spaced repetition? → Practice the longer phrases (revisited forever)",
          "Need easy practice? → Pull shorter phrases",
          "Need hard practice? → Pull longest phrases"
        ]
      }
    },
    "example": {
      "title": "Example: Basket for \"decir algo\" (to say something) - S0004L02",
      "description": "This basket demonstrates the vocabulary constraint: all practice phrases use LEGOs the learner already knows from earlier seeds.",
      "phrases": [
        {"known": "to say something", "target": "decir algo", "type": "shorter", "note": "Bare LEGO"},
        {"known": "I want to say something", "target": "Quiero decir algo", "type": "shorter", "note": "2 LEGOs"},
        {"known": "I want to learn how to say something", "target": "Quiero aprender cómo decir algo", "type": "shorter", "note": "4 LEGOs"},
        {"known": "I am trying to say something", "target": "Estoy intentando decir algo", "type": "shorter", "note": "3 LEGOs"},
        {"known": "I am trying to learn how to say something", "target": "Estoy intentando aprender cómo decir algo", "type": "shorter", "note": "5 LEGOs"},
        {"known": "I want to say something now", "target": "Quiero decir algo ahora", "type": "longer", "note": "Longer phrase (eternal)"},
        {"known": "I want to learn how to say something now", "target": "Quiero aprender cómo decir algo ahora", "type": "longer", "note": "Longest phrase (eternal)"}
      ],
      "notes": [
        "All LEGOs used (\"quiero\", \"aprender\", \"cómo\", \"estoy intentando\", \"ahora\") were learned in earlier seeds",
        "Only \"decir algo\" is new - everything else is already mastered vocabulary",
        "Shorter phrases (1-5) used for first introduction only",
        "Longer phrases (6-7) practiced forever via spaced repetition"
      ]
    }
  }'::jsonb
),
-- Section 3: The Vocabulary Constraint
(
  (SELECT id FROM documentation_content WHERE slug = 'pedagogy'),
  'vocabulary-constraint',
  'The Vocabulary Constraint & Learner Uncertainty Test',
  'vocabulary-constraint',
  3,
  'default',
  NULL,
  '{
    "constraint": {
      "title": "The Vocabulary Constraint",
      "rule": "A basket can ONLY use LEGOs the learner has ALREADY mastered.",
      "detail": "Every practice phrase must contain ZERO unknowns except the LEGO being taught.",
      "style": "warning"
    },
    "zut": {
      "title": "The ZUT (Zero Uncertainty Test)",
      "description": "Also called \"Functional Determinism\" - the ZUT is the guiding principle for LEGO extraction in Phase 1 and basket generation in Phase 3.",
      "test": "When a learner hears the KNOWN phrase, is there ZERO uncertainty about what to say in the TARGET language?",
      "examples": {
        "pass": {"known": "to say something", "target": "decir algo", "note": "no ambiguity"},
        "fail": {"known": "say", "target": "decir? digo? dice?", "note": "learner uncertain which form"}
      }
    },
    "minimum_viable_unit": {
      "title": "Minimum Viable Unit of Consistent Meaning",
      "intro": "We do NOT break seed pairs down to individual words - that would fail the ZUT.",
      "detail": "LEGOs are the minimum viable unit where meaning is consistent and learner uncertainty is ZERO.",
      "example": {
        "seed": "I want you to speak Spanish with me tomorrow",
        "breakdown": {
          "known": ["I want", "you to speak", "Spanish", "with me", "tomorrow"],
          "target": ["quiero", "que hables", "español", "conmigo", "mañana"]
        },
        "why_works": [
          "\"you to speak\" is ATOMIC - breaking it down would fail ZUT",
          "Learner hears \"you to speak\" → knows instantly: \"que hables\"",
          "Breaking to \"you\" | \"to\" | \"speak\" would create uncertainty",
          "\"with me\" = one LEGO \"conmigo\" (not \"con\" + \"mí\")"
        ],
        "what_fails": [
          "Breaking \"you to speak\" → \"you\" | \"to\" | \"speak\" (too much uncertainty)",
          "Breaking \"with me\" → \"with\" | \"me\" (does not map to \"con\" + \"mí\", it is \"conmigo\")",
          "Individual words lose grammatical context needed for correct translation"
        ]
      }
    },
    "why_matters": {
      "title": "Why This Matters",
      "benefits": [
        {"title": "Zero cognitive overload", "description": "Learner focuses 100% on the new LEGO, not distracted by unknown words"},
        {"title": "Immediate comprehension", "description": "Every practice phrase is instantly understandable"},
        {"title": "True spaced repetition", "description": "Earlier LEGOs naturally reappear in later baskets"}
      ]
    },
    "progressive_accumulation": {
      "title": "Progressive Vocabulary Accumulation",
      "description": "How vocabulary grows position-by-position:",
      "positions": [
        {"position": 1, "lego": "A", "available": "[]"},
        {"position": 2, "lego": "B", "available": "[A]"},
        {"position": 3, "lego": "C", "available": "[A, B]"},
        {"position": 4, "lego": "D", "available": "[A, B, C]"},
        {"position": 2965, "lego": "Z", "available": "[A, B, C, ..., Y]"}
      ],
      "note": "LEGO type (ATOMIC vs MOLECULAR) has ZERO effect on availability! ONLY chronological position matters."
    }
  }'::jsonb
),
-- Section 4: Why This System Works
(
  (SELECT id FROM documentation_content WHERE slug = 'pedagogy'),
  'why-it-works',
  'Why This System Works',
  'why-it-works',
  4,
  'default',
  NULL,
  '{
    "principles": [
      {
        "title": "Graduated Cognitive Load",
        "points": [
          "Each LEGO introduces exactly ONE new concept",
          "Practice phrases contain ZERO unknowns except the LEGO being taught",
          "Learner never overwhelmed—always in the \"zone of proximal development\""
        ]
      },
      {
        "title": "Pattern Discovery (Not Rules)",
        "points": [
          "Componentization shows HOW target language builds patterns",
          "Literal translations reveal grammar structure transparently",
          "Learners acquire patterns implicitly through exposure, not memorization"
        ]
      },
      {
        "title": "Cumulative Knowledge Building",
        "points": [
          "Each new LEGO builds on all previous LEGOs",
          "No \"islands\" of knowledge—everything connects",
          "Confidence compounds exponentially over time"
        ]
      },
      {
        "title": "Infinite Recombination Power",
        "points": [
          "2965 LEGOs → millions of possible sentence combinations",
          "Overlapping chunks maximize pattern exposure",
          "Learners can say things they have never been explicitly taught"
        ]
      }
    ],
    "result": {
      "title": "The Result: True Language Acquisition",
      "intro": "Learners do not memorize phrases—they acquire the ability to generate language.",
      "comparison": {
        "traditional": {
          "label": "Traditional Phrasebook Approach",
          "points": [
            "Memorize: \"Where is the bathroom?\"",
            "Can ONLY say that exact phrase",
            "Helpless if situation varies slightly"
          ]
        },
        "ssi": {
          "label": "SSi LEGO Approach",
          "points": [
            "Learn: \"where\", \"is\", \"the\", \"bathroom\"",
            "Can say: \"Where is the train?\"",
            "Can say: \"Where is she?\"",
            "Can say: \"The bathroom is here\"",
            "Infinite recombination"
          ]
        }
      }
    },
    "footer": {
      "line1": "This document explains the \"why\" behind the system.",
      "links": [
        {"text": "Terminology Glossary", "path": "/reference/terminology"},
        {"text": "APML Specification", "path": "/reference/apml"}
      ]
    }
  }'::jsonb
)
ON CONFLICT (document_id, section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  updated_at = now();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Tables created:
--   - documentation_content: Main document records
--   - documentation_sections: Discrete sections within documents
--
-- Functions:
--   - get_documentation(slug): Get document with all sections
--   - get_documentation_list(category): Get navigation list
--
-- Initial data:
--   - 'pedagogy' document with 4 sections (What is LEGO, Basket, Constraint, Why Works)
--
-- Next steps:
--   1. Create API endpoint to fetch documentation
--   2. Update Pedagogy.vue to fetch from database
--   3. Add more documents (APML Spec, Process Overview, etc.)
-- =============================================================================
