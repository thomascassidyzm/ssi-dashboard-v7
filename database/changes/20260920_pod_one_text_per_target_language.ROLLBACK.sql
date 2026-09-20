-- Undoes 20260920_pod_one_text_per_target_language.sql. Removing this reopens the door
-- Tom shut on 2026-09-20: nothing would then prevent two courses of one target language
-- holding different pod text. The canonical translations themselves are kept — dropping
-- the table would throw away every language's text — so this rollback disarms the guard
-- and leaves the data.
DROP VIEW IF EXISTS public.pod_text_divergence;
DROP TRIGGER IF EXISTS listening_pods_canonical_lang_binding ON public.listening_pods;
DROP FUNCTION IF EXISTS public.refuse_unmatched_canonical_lang_binding();
DROP TRIGGER IF EXISTS listening_pod_sentences_one_text_per_language ON public.listening_pod_sentences;
DROP FUNCTION IF EXISTS public.pod_sentence_one_text_per_language();
UPDATE public.listening_pods SET canonical_lang_text = false WHERE canonical_lang_text;
-- ALTER TABLE public.listening_pods DROP COLUMN canonical_lang_text;   -- deliberate: kept, so a re-apply can rebind
-- DROP TABLE public.canonical_pod_target_text;                          -- deliberate: kept, it holds the translations
