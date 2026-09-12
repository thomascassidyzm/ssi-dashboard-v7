-- Rollback for 20260912_pod_sentence_jump_in.sql. Drops the marker; every line
-- goes back to playing as a genuine turn. No audio, text or progress is touched.
ALTER TABLE public.listening_pod_sentences DROP COLUMN IF EXISTS jump_in;
