-- 20261102_language_canonical_bre_cor.sql — NOT YET APPLIED (job #57, 2026-11-02). Needs Tom's go / Watson.
--
-- Breton and Cornish courses store target_lang as the three-letter code ('bre', 'cor').
-- The JavaScript canonicaliser accepts both (services/language-code-service.cjs carries them
-- in its hand-written block), but the DB-side lookup that canonical_language() reads only
-- had the two-letter spellings ('br','bre') and ('kw','cor'), because the generator took its
-- candidates from the CSV's database_code column, which is blank for both languages. So every
-- course_audio write in 'bre' or 'cor' — a Record Room take, a booth take, a render — is
-- refused by trg_course_audio_canonical_identity: "language bre is not in language_canonical".
-- Affected courses: bre_for_eng, bre_for_fra, sbx_for_eng (target bre), cor_for_eng.
-- tools/generate-language-canonical-sql.cjs now includes those codes; these are its only new rows.
--
-- Additive and idempotent: two INSERTs, no existing row touched.
-- Rollback: DELETE FROM language_canonical WHERE (raw, canonical) IN (('bre','bre'), ('cor','cor'));
-- (Only roll back if no course_audio row was written in 'bre'/'cor' after applying — the rows
-- would stay, but a later UPDATE of their language column would raise.)

INSERT INTO language_canonical (raw, canonical) VALUES
  ('bre','bre'),
  ('cor','cor')
ON CONFLICT DO NOTHING;
