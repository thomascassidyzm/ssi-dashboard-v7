-- PHASE C — deliberately public content: make the posture explicit.
-- Unchanged from the draft. Verified pre-apply against the schema snapshot:
-- every table below already grants anon/authenticated SELECT only and the
-- five course_* / shared_audio tables already carry the exact policy set that
-- reproduces current behaviour once RLS is on.
BEGIN;

-- PHASE C — deliberately public content: make the posture explicit.
-- Access unchanged (grants are already SELECT-only for anon/authenticated;
-- writes are service-key and bypass RLS). Clears both advisor warning classes.
------------------------------------------------------------------

-- Already carry the correct policies (anon read / authenticated read / service ALL):
ALTER TABLE public.course_audio            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_legos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_practice_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_seeds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_audio            ENABLE ROW LEVEL SECURITY;

-- Cosmetic: drop duplicate anon SELECT policies.
DROP POLICY IF EXISTS "Public users can view course_legos" ON public.course_legos;
DROP POLICY IF EXISTS "Public users can view course_practice_phrases" ON public.course_practice_phrases;

-- No policies yet — add public read, then enable:
CREATE POLICY canonical_seeds_public_read ON public.canonical_seeds
  FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.canonical_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY canonical_seed_translations_public_read ON public.canonical_seed_translations
  FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.canonical_seed_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY listening_pods_public_read ON public.listening_pods
  FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.listening_pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY listening_pod_sentences_public_read ON public.listening_pod_sentences
  FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.listening_pod_sentences ENABLE ROW LEVEL SECURITY;

COMMIT;
