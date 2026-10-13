-- TEMPLATE: weave-cym-rehome-555.cjs sql fills the MOVES and HOMES markers and writes weave-cym-rehome-555.sql.
-- Job #555 (Aran 2026-10-13): the orphaned practice phrases under the 5 LEGOs #460/#468 marked taught are MOVED to their
-- home LEGO ((a) seed's other new LEGO, (b) original earlier LEGO, (c) another new LEGO). Each move deletes the row and
-- re-inserts it under the home with its texts, role, status, audio ids and created_at kept; id/position/lego_id/lego_position
-- re-filed, decomposition cleared, metadata.moved_from recorded. Runs REPEATABLE READ and locks every row it reads: if a
-- moved row, a home's rows or a home/source LEGO changed since the plan (job #554 is editing these sandboxes), it aborts.
-- Live cym_n/cym_s, master canonical_seeds, sandbox LEGOs and every other sandbox phrase are asserted unchanged.
-- Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-rehome-555-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
CREATE TEMP TABLE moves (old_id text PRIMARY KEY, new_id text UNIQUE, course_code text, seed_number int, lego_index int, position int,
  lego_position text, metadata jsonb, target_text text, old_version int, old_updated_at timestamptz, home_type text);
INSERT INTO moves VALUES
  ('cym_nv2_for_eng:S0188L02B02', 'cym_nv2_for_eng:S0151L02B07', 'cym_nv2_for_eng', 151, 2, 7, 'end', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02B02","lego":"S0188L02","position":2,"home_type":"b"}}'::jsonb, 'bydden ni’n licio gofyn iddyn nhw am help', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0188L02B03', 'cym_nv2_for_eng:S0151L02B08', 'cym_nv2_for_eng', 151, 2, 8, 'middle', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02B03","lego":"S0188L02","position":3,"home_type":"b"}}'::jsonb, 'bydden ni’n licio helpu nhw, ond dan ni ddim yn gwybod beth maen nhw isio', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0188L02B04', 'cym_nv2_for_eng:S0188L01B08', 'cym_nv2_for_eng', 188, 1, 10, 'middle', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02B04","lego":"S0188L02","position":4,"home_type":"a"}}'::jsonb, 'bydden ni’n licio helpu nhw, ond doeddan ni ddim yn gwybod beth i wneud', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'a'),
  ('cym_nv2_for_eng:S0188L02B06', 'cym_nv2_for_eng:S0188L01B09', 'cym_nv2_for_eng', 188, 1, 11, 'start', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02B06","lego":"S0188L02","position":6,"home_type":"a"}}'::jsonb, 'doeddan ni ddim yn gwybod sut i ofyn iddyn nhw am help', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'a'),
  ('cym_nv2_for_eng:S0188L02B07', 'cym_nv2_for_eng:S0151L02B09', 'cym_nv2_for_eng', 151, 2, 9, 'end', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02B07","lego":"S0188L02","position":7,"home_type":"b"}}'::jsonb, 'gofyn iddyn nhw', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0188L02U01', 'cym_nv2_for_eng:S0151L02U01', 'cym_nv2_for_eng', 151, 2, 10, 'middle', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02U01","lego":"S0188L02","position":8,"home_type":"b"}}'::jsonb, 'gofyn iddyn nhw am help', 18, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0188L02U02', 'cym_nv2_for_eng:S0151L02U02', 'cym_nv2_for_eng', 151, 2, 11, 'start', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02U02","lego":"S0188L02","position":9,"home_type":"b"}}'::jsonb, 'oeddan nhw isio gofyn i ni am fwy o help', 18, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0188L02U03', 'cym_nv2_for_eng:S0151L02U03', 'cym_nv2_for_eng', 151, 2, 12, 'start', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02U03","lego":"S0188L02","position":10,"home_type":"b"}}'::jsonb, 'oeddan nhw isio gofyn i ni am help', 18, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0188L02U04', 'cym_nv2_for_eng:S0151L02U04', 'cym_nv2_for_eng', 151, 2, 13, 'middle', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02U04","lego":"S0188L02","position":11,"home_type":"b"}}'::jsonb, 'oeddan ni isio gofyn iddyn nhw be’ oedd yn digwydd', 18, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0188L02U05', 'cym_nv2_for_eng:S0151L02U05', 'cym_nv2_for_eng', 151, 2, 14, 'middle', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0188L02U05","lego":"S0188L02","position":12,"home_type":"b"}}'::jsonb, 'oeddan ni isio gofyn iddyn nhw be’ oedd yn mynd i ddigwydd', 18, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0218L02B01', 'cym_nv2_for_eng:S0057L02B08', 'cym_nv2_for_eng', 57, 2, 21, 'start', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0218L02B01","lego":"S0218L02","position":1,"home_type":"c"}}'::jsonb, 'do’n i ddim yn gwybod bo’ ti isio dechrau', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0218L02B02', 'cym_nv2_for_eng:S0057L02B09', 'cym_nv2_for_eng', 57, 2, 22, 'start', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0218L02B02","lego":"S0218L02","position":2,"home_type":"c"}}'::jsonb, 'do’n i ddim yn gwybod bo’ ti isio mynd', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0218L02B03', 'cym_nv2_for_eng:S0208L01B07', 'cym_nv2_for_eng', 208, 1, 7, 'start', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0218L02B03","lego":"S0218L02","position":3,"home_type":"c"}}'::jsonb, 'pan ddudest ti beth oeddat ti isio', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0218L02B04', 'cym_nv2_for_eng:S0217L02B08', 'cym_nv2_for_eng', 217, 2, 10, 'end', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0218L02B04","lego":"S0218L02","position":4,"home_type":"c"}}'::jsonb, 'pan oeddat ti isio mynd i mewn i’r dref', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0218L02B05', 'cym_nv2_for_eng:S1323L03B05', 'cym_nv2_for_eng', 1323, 3, 15, 'end', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0218L02B05","lego":"S0218L02","position":5,"home_type":"c"}}'::jsonb, 'pan oeddat ti isio mynd i’r ysgol', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0218L02B06', 'cym_nv2_for_eng:S0217L01B06', 'cym_nv2_for_eng', 217, 1, 6, 'middle', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0218L02B06","lego":"S0218L02","position":6,"home_type":"c"}}'::jsonb, 'pan ti’n cerdded', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0218L02B07', 'cym_nv2_for_eng:S0217L02B09', 'cym_nv2_for_eng', 217, 2, 11, 'end', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0218L02B07","lego":"S0218L02","position":7,"home_type":"c"}}'::jsonb, 'pan ti’n cerdded i mewn i’r dref', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0218L02U01', 'cym_nv2_for_eng:S0217L01U01', 'cym_nv2_for_eng', 217, 1, 7, 'middle', '{"job":555,"moved_from":{"id":"cym_nv2_for_eng:S0218L02U01","lego":"S0218L02","position":8,"home_type":"c"}}'::jsonb, 'pan ti’n cerdded i’r ysgol', 18, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0194L02B02', 'cym_sv2_for_eng:S0194L01B08', 'cym_sv2_for_eng', 194, 1, 10, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02B02","lego":"S0194L02","position":2,"home_type":"a"}}'::jsonb, 'do’n ni ddim yn gwybod beth i ofyn iddyn nhw', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'a'),
  ('cym_sv2_for_eng:S0194L02B03', 'cym_sv2_for_eng:S0154L02B06', 'cym_sv2_for_eng', 154, 2, 6, 'end', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02B03","lego":"S0194L02","position":3,"home_type":"b"}}'::jsonb, 'gofyn iddyn nhw', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0194L02B04', 'cym_sv2_for_eng:S0154L02B07', 'cym_sv2_for_eng', 154, 2, 7, 'middle', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02B04","lego":"S0194L02","position":4,"home_type":"b"}}'::jsonb, 'gofyn iddyn nhw am help', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0194L02B06', 'cym_sv2_for_eng:S0194L01B09', 'cym_sv2_for_eng', 194, 1, 11, 'middle', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02B06","lego":"S0194L02","position":6,"home_type":"a"}}'::jsonb, 'hoffen ni helpu nhw, ond do’n ni ddim yn gwybod beth i wneud', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'a'),
  ('cym_sv2_for_eng:S0194L02B07', 'cym_sv2_for_eng:S0154L02B08', 'cym_sv2_for_eng', 154, 2, 8, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02B07","lego":"S0194L02","position":7,"home_type":"b"}}'::jsonb, 'hoffen ni helpu nhw, ond so ni’n gwybod beth maen nhw’n moyn', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0194L02U01', 'cym_sv2_for_eng:S0154L02U01', 'cym_sv2_for_eng', 154, 2, 9, 'end', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02U01","lego":"S0194L02","position":8,"home_type":"b"}}'::jsonb, 'hoffen ni ofyn iddyn nhw am help', 17, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0194L02U02', 'cym_sv2_for_eng:S0154L02U02', 'cym_sv2_for_eng', 154, 2, 10, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02U02","lego":"S0194L02","position":9,"home_type":"b"}}'::jsonb, 'o’n nhw’n moyn gofyn i ni am fwy o help', 17, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0194L02U03', 'cym_sv2_for_eng:S0154L02U03', 'cym_sv2_for_eng', 154, 2, 11, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02U03","lego":"S0194L02","position":10,"home_type":"b"}}'::jsonb, 'o’n nhw’n moyn gofyn i ni am help', 17, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0194L02U04', 'cym_sv2_for_eng:S0154L02U04', 'cym_sv2_for_eng', 154, 2, 12, 'middle', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02U04","lego":"S0194L02","position":11,"home_type":"b"}}'::jsonb, 'o’n ni’n moyn gofyn iddyn nhw be’ oedd yn digwydd', 17, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0194L02U05', 'cym_sv2_for_eng:S0154L02U05', 'cym_sv2_for_eng', 154, 2, 13, 'middle', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0194L02U05","lego":"S0194L02","position":12,"home_type":"b"}}'::jsonb, 'o’n ni’n moyn gofyn iddyn nhw be’ oedd yn mynd i ddigwydd', 17, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0230L02B01', 'cym_sv2_for_eng:S1375L01B05', 'cym_sv2_for_eng', 1375, 1, 11, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0230L02B01","lego":"S0230L02","position":1,"home_type":"c"}}'::jsonb, 'do’n i ddim yn gwybod bo’ ti’n moyn dechrau', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0230L02B02', 'cym_sv2_for_eng:S1375L01B06', 'cym_sv2_for_eng', 1375, 1, 12, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0230L02B02","lego":"S0230L02","position":2,"home_type":"c"}}'::jsonb, 'do’n i ddim yn gwybod bo’ ti’n moyn mynd', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0230L02B03', 'cym_sv2_for_eng:S0217L01B07', 'cym_sv2_for_eng', 217, 1, 7, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0230L02B03","lego":"S0230L02","position":3,"home_type":"c"}}'::jsonb, 'pan ddwedest ti beth o’t ti’n moyn', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0230L02B04', 'cym_sv2_for_eng:S0229L02B08', 'cym_sv2_for_eng', 229, 2, 10, 'end', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0230L02B04","lego":"S0230L02","position":4,"home_type":"c"}}'::jsonb, 'pan o’t ti’n moyn mynd i’r dref', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0230L02B05', 'cym_sv2_for_eng:S1323L03B05', 'cym_sv2_for_eng', 1323, 3, 11, 'end', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0230L02B05","lego":"S0230L02","position":5,"home_type":"c"}}'::jsonb, 'pan o’t ti’n moyn mynd i’r ysgol', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0230L02B06', 'cym_sv2_for_eng:S0229L01B06', 'cym_sv2_for_eng', 229, 1, 6, 'middle', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0230L02B06","lego":"S0230L02","position":6,"home_type":"c"}}'::jsonb, 'pan ti’n cerdded', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0230L02B07', 'cym_sv2_for_eng:S0229L02B09', 'cym_sv2_for_eng', 229, 2, 11, 'end', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0230L02B07","lego":"S0230L02","position":7,"home_type":"c"}}'::jsonb, 'pan ti’n cerdded i’r dref', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0230L02U01', 'cym_sv2_for_eng:S0229L01U01', 'cym_sv2_for_eng', 229, 1, 7, 'middle', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0230L02U01","lego":"S0230L02","position":8,"home_type":"c"}}'::jsonb, 'pan ti’n cerdded i’r ysgol', 17, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0234L02B01', 'cym_sv2_for_eng:S1627L02B05', 'cym_sv2_for_eng', 1627, 2, 11, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0234L02B01","lego":"S0234L02","position":1,"home_type":"c"}}'::jsonb, 'dw i’n barod i fynd gyda ti', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0234L02B02', 'cym_sv2_for_eng:S1627L02B06', 'cym_sv2_for_eng', 1627, 2, 12, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0234L02B02","lego":"S0234L02","position":2,"home_type":"c"}}'::jsonb, 'dw i’n barod i fynd mas gyda ti', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0234L02B03', 'cym_sv2_for_eng:S0098L01B01', 'cym_sv2_for_eng', 98, 1, 1, 'start', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0234L02B03","lego":"S0234L02","position":3,"home_type":"c"}}'::jsonb, 'dw i’n hapus i fynd gyda ti', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0234L02B04', 'cym_sv2_for_eng:S0229L02B10', 'cym_sv2_for_eng', 229, 2, 12, 'end', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0234L02B04","lego":"S0234L02","position":4,"home_type":"c"}}'::jsonb, 'dw i’n hapus i gerdded i’r dref gyda ti', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0234L02B06', 'cym_sv2_for_eng:S0229L02B11', 'cym_sv2_for_eng', 229, 2, 13, 'end', '{"job":555,"moved_from":{"id":"cym_sv2_for_eng:S0234L02B06","lego":"S0234L02","position":6,"home_type":"c"}}'::jsonb, 'ti’n gwybod bo’ fi’n hapus i gerdded i’r dref gyda ti', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c');
CREATE TEMP TABLE homes (course_code text, seed_number int, lego_index int, target_text text, ids text, PRIMARY KEY (course_code, seed_number, lego_index));
INSERT INTO homes VALUES
  ('cym_nv2_for_eng', 151, 2, 'nhw', 'cym_nv2_for_eng:S0151L02B01,cym_nv2_for_eng:S0151L02B02,cym_nv2_for_eng:S0151L02B03,cym_nv2_for_eng:S0151L02B04,cym_nv2_for_eng:S0151L02B05,cym_nv2_for_eng:S0151L02B06'),
  ('cym_nv2_for_eng', 188, 1, 'doeddan ni ddim yn gwybod', 'cym_nv2_for_eng:S0188L01B01,cym_nv2_for_eng:S0188L01B02,cym_nv2_for_eng:S0188L01B03,cym_nv2_for_eng:S0188L01B04,cym_nv2_for_eng:S0188L01B05,cym_nv2_for_eng:S0188L01B06,cym_nv2_for_eng:S0188L01B07,cym_nv2_for_eng:S0188L01U01,cym_nv2_for_eng:S0188L01U02'),
  ('cym_nv2_for_eng', 57, 2, 'do’n i ddim', 'cym_nv2_for_eng:S0057L02B01,cym_nv2_for_eng:S0057L02B02,cym_nv2_for_eng:S0057L02B03,cym_nv2_for_eng:S0057L02B04,cym_nv2_for_eng:S0057L02B05,cym_nv2_for_eng:S0057L02B06,cym_nv2_for_eng:S0057L02B07,cym_nv2_for_eng:S0057L02U01,cym_nv2_for_eng:S0057L02U02,cym_nv2_for_eng:S0057L02U03,cym_nv2_for_eng:S0057L02U04,cym_nv2_for_eng:S0057L02U05,cym_nv2_for_eng:S0057L02U06,cym_nv2_for_eng:S0057L02U07,cym_nv2_for_eng:S0057L02U08,cym_nv2_for_eng:S0057L02U09,cym_nv2_for_eng:S0057L02U10,cym_nv2_for_eng:S0057L02U11,cym_nv2_for_eng:S0057L02U12,cym_nv2_for_eng:S0057L02U13'),
  ('cym_nv2_for_eng', 208, 1, 'ddudest ti', 'cym_nv2_for_eng:S0208L01B01,cym_nv2_for_eng:S0208L01B02,cym_nv2_for_eng:S0208L01B03,cym_nv2_for_eng:S0208L01B04,cym_nv2_for_eng:S0208L01B05,cym_nv2_for_eng:S0208L01B06'),
  ('cym_nv2_for_eng', 217, 2, 'i mewn i’r dref', 'cym_nv2_for_eng:S0217L02B01,cym_nv2_for_eng:S0217L02B02,cym_nv2_for_eng:S0217L02B03,cym_nv2_for_eng:S0217L02B04,cym_nv2_for_eng:S0217L02B05,cym_nv2_for_eng:S0217L02B06,cym_nv2_for_eng:S0217L02B07,cym_nv2_for_eng:S0217L02U01,cym_nv2_for_eng:S0217L02U02'),
  ('cym_nv2_for_eng', 1323, 3, 'i’r ysgol', 'cym_nv2_for_eng:S1323L03B01,cym_nv2_for_eng:S1323L03B02,cym_nv2_for_eng:S1323L03B03,cym_nv2_for_eng:S1323L03B04,cym_nv2_for_eng:S1323L03C01,cym_nv2_for_eng:S1323L03C02,cym_nv2_for_eng:S1323L03U01,cym_nv2_for_eng:S1323L03U02,cym_nv2_for_eng:S1323L03U03,cym_nv2_for_eng:S1323L03U04,cym_nv2_for_eng:S1323L03U05,cym_nv2_for_eng:S1323L03U06,cym_nv2_for_eng:S1323L03U07,cym_nv2_for_eng:S1323L03U08'),
  ('cym_nv2_for_eng', 217, 1, 'ti’n cerdded', 'cym_nv2_for_eng:S0217L01B01,cym_nv2_for_eng:S0217L01B02,cym_nv2_for_eng:S0217L01B03,cym_nv2_for_eng:S0217L01B04,cym_nv2_for_eng:S0217L01B05'),
  ('cym_sv2_for_eng', 194, 1, 'do’n ni ddim yn gwybod', 'cym_sv2_for_eng:S0194L01B01,cym_sv2_for_eng:S0194L01B02,cym_sv2_for_eng:S0194L01B03,cym_sv2_for_eng:S0194L01B04,cym_sv2_for_eng:S0194L01B05,cym_sv2_for_eng:S0194L01B06,cym_sv2_for_eng:S0194L01B07,cym_sv2_for_eng:S0194L01U01,cym_sv2_for_eng:S0194L01U02'),
  ('cym_sv2_for_eng', 154, 2, 'nhw', 'cym_sv2_for_eng:S0154L02B01,cym_sv2_for_eng:S0154L02B02,cym_sv2_for_eng:S0154L02B03,cym_sv2_for_eng:S0154L02B04,cym_sv2_for_eng:S0154L02B05'),
  ('cym_sv2_for_eng', 1375, 1, 'do’n i ddim yn gwybod', 'cym_sv2_for_eng:S1375L01B01,cym_sv2_for_eng:S1375L01B02,cym_sv2_for_eng:S1375L01B03,cym_sv2_for_eng:S1375L01B04,cym_sv2_for_eng:S1375L01U01,cym_sv2_for_eng:S1375L01U02,cym_sv2_for_eng:S1375L01U03,cym_sv2_for_eng:S1375L01U04,cym_sv2_for_eng:S1375L01U05,cym_sv2_for_eng:S1375L01U06'),
  ('cym_sv2_for_eng', 217, 1, 'ddwedest ti', 'cym_sv2_for_eng:S0217L01B01,cym_sv2_for_eng:S0217L01B02,cym_sv2_for_eng:S0217L01B03,cym_sv2_for_eng:S0217L01B04,cym_sv2_for_eng:S0217L01B05,cym_sv2_for_eng:S0217L01B06'),
  ('cym_sv2_for_eng', 229, 2, 'i’r dref', 'cym_sv2_for_eng:S0229L02B01,cym_sv2_for_eng:S0229L02B02,cym_sv2_for_eng:S0229L02B03,cym_sv2_for_eng:S0229L02B04,cym_sv2_for_eng:S0229L02B05,cym_sv2_for_eng:S0229L02B06,cym_sv2_for_eng:S0229L02B07,cym_sv2_for_eng:S0229L02U01,cym_sv2_for_eng:S0229L02U02'),
  ('cym_sv2_for_eng', 1323, 3, 'i’r ysgol', 'cym_sv2_for_eng:S1323L03B01,cym_sv2_for_eng:S1323L03B02,cym_sv2_for_eng:S1323L03B03,cym_sv2_for_eng:S1323L03B04,cym_sv2_for_eng:S1323L03U01,cym_sv2_for_eng:S1323L03U02,cym_sv2_for_eng:S1323L03U03,cym_sv2_for_eng:S1323L03U04,cym_sv2_for_eng:S1323L03U05,cym_sv2_for_eng:S1323L03U06'),
  ('cym_sv2_for_eng', 229, 1, 'ti’n cerdded', 'cym_sv2_for_eng:S0229L01B01,cym_sv2_for_eng:S0229L01B02,cym_sv2_for_eng:S0229L01B03,cym_sv2_for_eng:S0229L01B04,cym_sv2_for_eng:S0229L01B05'),
  ('cym_sv2_for_eng', 1627, 2, '’n barod', 'cym_sv2_for_eng:S1627L02B01,cym_sv2_for_eng:S1627L02B02,cym_sv2_for_eng:S1627L02B03,cym_sv2_for_eng:S1627L02B04,cym_sv2_for_eng:S1627L02U01,cym_sv2_for_eng:S1627L02U02,cym_sv2_for_eng:S1627L02U03,cym_sv2_for_eng:S1627L02U04,cym_sv2_for_eng:S1627L02U05,cym_sv2_for_eng:S1627L02U06'),
  ('cym_sv2_for_eng', 98, 1, 'dw i’n hapus', '');
CREATE TEMP TABLE sources AS SELECT DISTINCT p.course_code, p.seed_number, p.lego_index FROM course_practice_phrases p JOIN moves m ON m.old_id = p.id;
CREATE TEMP TABLE touched AS SELECT course_code, seed_number, lego_index FROM sources UNION SELECT course_code, seed_number, lego_index FROM homes;

-- Lock what we read; under REPEATABLE READ a row changed by another transaction since our snapshot raises here.
SELECT count(*) AS locked_legos FROM (SELECT 1 FROM course_legos l JOIN touched t USING (course_code, seed_number, lego_index) FOR UPDATE OF l) x;
SELECT count(*) AS locked_rows FROM (SELECT 1 FROM course_practice_phrases p JOIN touched t USING (course_code, seed_number, lego_index) FOR UPDATE OF p) x;

CREATE FUNCTION pg_temp.fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'live '||x.course_code||' seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, x.seed_number, x.lego_index) NOT IN (SELECT course_code, seed_number, lego_index FROM touched) GROUP BY x.course_code
$$;
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.fp();
SELECT 'BEFORE' k, * FROM pre ORDER BY t;

DO $$ BEGIN
  IF to_regclass('backup_cym_rehome_555') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF EXISTS (SELECT 1 FROM moves WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN RAISE EXCEPTION 'a move is outside the sandboxes'; END IF;
  IF (SELECT count(*) FROM moves m JOIN course_practice_phrases p ON p.id = m.old_id
      WHERE p.course_code = m.course_code AND p.target_text = m.target_text AND p.version = m.old_version AND p.updated_at = m.old_updated_at) <> (SELECT count(*) FROM moves) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a phrase to move is gone or was edited since the plan — re-plan'; END IF;
  IF EXISTS (SELECT 1 FROM sources s JOIN course_legos l USING (course_code, seed_number, lego_index) WHERE l.is_new) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a source LEGO is new again — its phrases play where they are'; END IF;
  IF (SELECT count(*) FROM homes h JOIN course_legos l USING (course_code, seed_number, lego_index) WHERE l.is_new AND l.target_text = h.target_text) <> (SELECT count(*) FROM homes) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a home LEGO is missing, not new, or its Welsh changed — re-plan'; END IF;
  IF EXISTS (SELECT 1 FROM homes h WHERE h.ids IS DISTINCT FROM (SELECT coalesce(string_agg(p.id, ',' ORDER BY p.id COLLATE "C"), '') FROM course_practice_phrases p
      WHERE (p.course_code, p.seed_number, p.lego_index) = (h.course_code, h.seed_number, h.lego_index))) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: the rows under a home LEGO changed since the plan — re-plan'; END IF;
  IF EXISTS (SELECT 1 FROM moves m JOIN course_practice_phrases p ON p.id = m.new_id) THEN RAISE EXCEPTION 'a new id is taken'; END IF;
  IF EXISTS (SELECT 1 FROM moves m JOIN course_practice_phrases p USING (course_code, seed_number, lego_index, position)) THEN RAISE EXCEPTION 'a position is taken'; END IF;
  IF EXISTS (SELECT 1 FROM moves m JOIN course_practice_phrases p USING (course_code, seed_number, lego_index)
      WHERE lower(trim(p.target_text)) = lower(trim(m.target_text))) THEN RAISE EXCEPTION 'a home already holds the same Welsh'; END IF;
  IF EXISTS (SELECT 1 FROM moves WHERE seed_number = 15) THEN RAISE EXCEPTION 'seed 15 is not to be touched'; END IF;
END $$;

-- The backup: every row under the source and home LEGOs as it stands now, and the LEGO list.
CREATE TABLE backup_cym_rehome_555 AS SELECT p.* FROM course_practice_phrases p JOIN touched t USING (course_code, seed_number, lego_index);
CREATE TABLE backup_cym_rehome_555_legos AS SELECT * FROM touched;
CREATE TABLE backup_cym_rehome_555_moves AS SELECT old_id, new_id FROM moves;
REVOKE ALL ON backup_cym_rehome_555, backup_cym_rehome_555_legos, backup_cym_rehome_555_moves FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT c, 'sql:job-555 weave-cym-rehome', 'weave-rehome-orphaned-phrases', 'agent', 'claude-job-555-rehome',
       'agent (claude-job-555-rehome)', false, 'creator',
       jsonb_build_object('moves', (SELECT jsonb_agg(jsonb_build_array(old_id, new_id) ORDER BY old_id) FROM moves WHERE course_code = c)),
       jsonb_build_object('ruling', 'Job #555 (Aran 2026-10-13): phrases orphaned under LEGOs #460/#468 marked taught are moved to a home where they play: (a) seed''s other new LEGO, (b) original earlier LEGO, (c) another new LEGO closest to the original running position. Source list: job #553.',
                          'backup', 'backup_cym_rehome_555')
FROM (SELECT DISTINCT course_code AS c FROM moves) v;
CREATE TEMP TABLE ev AS SELECT DISTINCT ON (course_code) course_code, id FROM content_edit_events WHERE detail->>'backup'='backup_cym_rehome_555' ORDER BY course_code, occurred_at DESC, id;

DELETE FROM course_practice_phrases WHERE id IN (SELECT old_id FROM moves);
INSERT INTO course_practice_phrases
SELECT (jsonb_populate_record(b, jsonb_build_object(
  'id', m.new_id, 'seed_number', m.seed_number, 'lego_index', m.lego_index, 'position', m.position,
  'lego_id', 'S'||lpad(m.seed_number::text, 4, '0')||'L'||lpad(m.lego_index::text, 2, '0'),
  'lego_position', m.lego_position, 'metadata', m.metadata, 'decomposition', NULL, 'decomposition_course_version', NULL,
  'last_edit_event_id', ev.id, 'updated_at', now()))).*
FROM backup_cym_rehome_555 b JOIN moves m ON m.old_id = b.id JOIN ev ON ev.course_code = m.course_code;
SET CONSTRAINTS ALL IMMEDIATE;

CREATE TEMP TABLE post AS SELECT * FROM pg_temp.fp();
SELECT 'AFTER' k, * FROM post ORDER BY t;
DO $$ BEGIN
  IF EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post) OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: live Welsh, master canonical_seeds, sandbox LEGOs or other sandbox phrases changed'; END IF;
  IF (SELECT count(*) FROM course_practice_phrases p JOIN touched t USING (course_code, seed_number, lego_index)) <> (SELECT count(*) FROM backup_cym_rehome_555) THEN
    RAISE EXCEPTION 'CHECK FAILED: row count under the touched LEGOs'; END IF;
  IF EXISTS (SELECT b.id, md5(b::text) FROM backup_cym_rehome_555 b WHERE b.id NOT IN (SELECT old_id FROM moves)
             EXCEPT SELECT p.id, md5(p::text) FROM course_practice_phrases p) THEN RAISE EXCEPTION 'CHECK FAILED: a row that stays changed'; END IF;
  IF EXISTS (SELECT 1 FROM backup_cym_rehome_555 b JOIN moves m ON m.old_id = b.id LEFT JOIN course_practice_phrases p ON p.id = m.new_id
      WHERE p.id IS NULL OR (p.course_code, p.seed_number, p.lego_index, p.known_text, p.target_text, p.phrase_role, p.status, p.known_audio_id, p.target1_audio_id,
        p.target2_audio_id, p.presentation_audio_id, p.created_at, p.word_count, p.lego_count, p.introduce)
        IS DISTINCT FROM (m.course_code, m.seed_number, m.lego_index, b.known_text, b.target_text, b.phrase_role, b.status, b.known_audio_id, b.target1_audio_id,
        b.target2_audio_id, b.presentation_audio_id, b.created_at, b.word_count, b.lego_count, b.introduce)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a moved row lost its text, role, status or audio'; END IF;
  IF (SELECT count(*) FROM ev) <> (SELECT count(DISTINCT course_code) FROM moves) THEN RAISE EXCEPTION 'CHECK FAILED: edit events'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT home_type, count(*) FROM moves GROUP BY 1 ORDER BY 1;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
