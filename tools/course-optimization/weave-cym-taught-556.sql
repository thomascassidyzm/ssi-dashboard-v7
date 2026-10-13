-- TEMPLATE: weave-cym-taught-556.cjs sql fills the FLIPS, MOVES, HOMES and KNOWN markers and writes weave-cym-taught-556.sql.
-- Job #556 (Aran 2026-10-13): seven repeated sandbox LEGOs (each its seed's only new LEGO) are marked already taught
-- (is_new=false); their practice phrases are MOVED to a home where they play ((a) seed's other new LEGO, (b) original earlier
-- LEGO, (c) another new LEGO closest to the original position), by #555's move; and an empty known slot on the seven seeds
-- takes the live sister course's existing HUMAN take of the identical English. Nothing is rendered.
-- Runs REPEATABLE READ and locks every row it reads: if a flipped LEGO, a moved row, a home's rows or a linked seed changed
-- since the plan, it aborts. Live cym_n/cym_s, master canonical_seeds, every other sandbox LEGO, seed and phrase are
-- asserted unchanged. Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-taught-556-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
CREATE TEMP TABLE flips (course_code text, seed_number int, lego_index int, target_text text, PRIMARY KEY (course_code, seed_number, lego_index));
INSERT INTO flips VALUES
  ('cym_nv2_for_eng', 194, 1, 'gest ti?'),
  ('cym_nv2_for_eng', 195, 1, 'wnest ti wylio?'),
  ('cym_nv2_for_eng', 208, 1, 'ddudest ti'),
  ('cym_nv2_for_eng', 222, 1, 'efo chdi'),
  ('cym_sv2_for_eng', 205, 1, 'be’ ti’n mynd i wneud?'),
  ('cym_sv2_for_eng', 217, 1, 'ddwedest ti'),
  ('cym_sv2_for_eng', 219, 1, 'gofyn i ti');
CREATE TEMP TABLE moves (old_id text PRIMARY KEY, new_id text UNIQUE, course_code text, seed_number int, lego_index int, position int,
  lego_position text, metadata jsonb, target_text text, old_version int, old_updated_at timestamptz, home_type text);
INSERT INTO moves VALUES
  ('cym_nv2_for_eng:S0194L01B01', 'cym_nv2_for_eng:S0172L02B08', 'cym_nv2_for_eng', 172, 2, 8, 'middle', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0194L01B01","lego":"S0194L01","position":1,"home_type":"c"}}'::jsonb, 'ddudon nhw wrthon ni bo’ nhw ddim isio gofyn am help', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0194L01B02', 'cym_nv2_for_eng:S0180L01B06', 'cym_nv2_for_eng', 180, 1, 6, 'middle', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0194L01B02","lego":"S0194L01","position":2,"home_type":"c"}}'::jsonb, 'gest ti amser i esbonio be’ oedd yn mynd i ddigwydd?', 20, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0194L01B03', 'cym_nv2_for_eng:S1212L02B05', 'cym_nv2_for_eng', 1212, 2, 15, NULL, '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0194L01B03","lego":"S0194L01","position":3,"home_type":"c"}}'::jsonb, 'gest ti amser i ofyn am help?', 20, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0194L01B04', 'cym_nv2_for_eng:S0094L03B08', 'cym_nv2_for_eng', 94, 3, 13, NULL, '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0194L01B04","lego":"S0194L01","position":4,"home_type":"b"}}'::jsonb, 'gest ti amser i wneud o?', 20, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0194L01B05', 'cym_nv2_for_eng:S0094L03B09', 'cym_nv2_for_eng', 94, 3, 14, NULL, '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0194L01B05","lego":"S0194L01","position":5,"home_type":"b"}}'::jsonb, 'gest ti amser?', 20, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0194L01B06', 'cym_nv2_for_eng:S0193L01B08', 'cym_nv2_for_eng', 193, 1, 10, 'start', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0194L01B06","lego":"S0194L01","position":6,"home_type":"c"}}'::jsonb, 'sut wyt ti’n teimlo am beth maen nhw’n meddwl?', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0194L01B07', 'cym_nv2_for_eng:S0193L01B09', 'cym_nv2_for_eng', 193, 1, 11, 'middle', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0194L01B07","lego":"S0194L01","position":7,"home_type":"c"}}'::jsonb, 'sut wyt ti’n teimlo am weithio adre?', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0194L01U01', 'cym_nv2_for_eng:S0193L01U03', 'cym_nv2_for_eng', 193, 1, 12, 'middle', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0194L01U01","lego":"S0194L01","position":8,"home_type":"c"}}'::jsonb, 'sut wyt ti’n teimlo amdani?', 18, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0195L01B01', 'cym_nv2_for_eng:S0151L02B10', 'cym_nv2_for_eng', 151, 2, 15, 'end', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0195L01B01","lego":"S0195L01","position":1,"home_type":"c"}}'::jsonb, 'gest ti amser i drafod beth maen nhw’n meddwl?', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0195L01B02', 'cym_nv2_for_eng:S0129L02B08', 'cym_nv2_for_eng', 129, 2, 15, 'start', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0195L01B02","lego":"S0195L01","position":2,"home_type":"c"}}'::jsonb, 'gest ti fwy o amser i ddysgu ar y penwythnos?', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0195L01B03', 'cym_nv2_for_eng:S0172L01B08', 'cym_nv2_for_eng', 172, 1, 9, NULL, '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0195L01B03","lego":"S0195L01","position":3,"home_type":"c"}}'::jsonb, 'gest ti lai o amser ddoe?', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0195L01B04', 'cym_nv2_for_eng:S0190L03B08', 'cym_nv2_for_eng', 190, 3, 11, 'end', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0195L01B04","lego":"S0195L01","position":4,"home_type":"c"}}'::jsonb, 'oeddan ni i gyd yn meddwl bod nhw newydd ddechrau ffeindio ffordd well', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0195L01B06', 'cym_nv2_for_eng:S0193L01B10', 'cym_nv2_for_eng', 193, 1, 13, 'middle', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0195L01B06","lego":"S0195L01","position":6,"home_type":"c"}}'::jsonb, 'sut wyt ti’n teimlo amdani rŵan?', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0195L01B07', 'cym_nv2_for_eng:S0109L02B07', 'cym_nv2_for_eng', 109, 2, 7, NULL, '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0195L01B07","lego":"S0195L01","position":7,"home_type":"b"}}'::jsonb, 'wnest ti wylio beth o’n i’n trio gwneud?', 20, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0195L01U01', 'cym_nv2_for_eng:S0109L02U01', 'cym_nv2_for_eng', 109, 2, 8, NULL, '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0195L01U01","lego":"S0195L01","position":8,"home_type":"b"}}'::jsonb, 'wnest ti wylio teledu nos Wener?', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0195L01U02', 'cym_nv2_for_eng:S0109L02U02', 'cym_nv2_for_eng', 109, 2, 9, NULL, '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0195L01U02","lego":"S0195L01","position":9,"home_type":"b"}}'::jsonb, 'wnest ti wylio’r teledu?', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0208L01B01', 'cym_nv2_for_eng:S0039L01B07', 'cym_nv2_for_eng', 39, 1, 7, 'start', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0208L01B01","lego":"S0208L01","position":1,"home_type":"b"}}'::jsonb, 'ddudest ti bo’ ti isio', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'b'),
  ('cym_nv2_for_eng:S0208L01B02', 'cym_nv2_for_eng:S0201L01B06', 'cym_nv2_for_eng', 201, 1, 6, 'end', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0208L01B02","lego":"S0208L01","position":2,"home_type":"c"}}'::jsonb, 'ddudest ti bo’ ti isio aros amdanyn nhw', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0208L01B03', 'cym_nv2_for_eng:S0190L03B09', 'cym_nv2_for_eng', 190, 3, 12, 'end', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0208L01B03","lego":"S0208L01","position":3,"home_type":"c"}}'::jsonb, 'ddudest ti bo’ ti isio ffeindio ffordd well', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0208L01B04', 'cym_nv2_for_eng:S0190L01B08', 'cym_nv2_for_eng', 190, 1, 13, 'end', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0208L01B04","lego":"S0208L01","position":4,"home_type":"c"}}'::jsonb, 'ddudest ti bo’ ti isio gwybod beth oeddan ni i gyd yn meddwl', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0208L01B05', 'cym_nv2_for_eng:S0207L03B08', 'cym_nv2_for_eng', 207, 3, 13, 'end', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0208L01B05","lego":"S0208L01","position":5,"home_type":"c"}}'::jsonb, 'ddudest ti bo’ ti isio llefrith a siwgr efo dy de', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0208L01B06', 'cym_nv2_for_eng:S0206L01B08', 'cym_nv2_for_eng', 206, 1, 8, 'end', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0208L01B06","lego":"S0208L01","position":6,"home_type":"c"}}'::jsonb, 'ddudest ti bo’ ti isio panad o de neu goffi', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0222L01B01', 'cym_nv2_for_eng:S1349L01B05', 'cym_nv2_for_eng', 1349, 1, 14, NULL, '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0222L01B01","lego":"S0222L01","position":1,"home_type":"c"}}'::jsonb, 'dw i’n barod i fynd allan efo chdi', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0222L01B02', 'cym_nv2_for_eng:S0099L03B08', 'cym_nv2_for_eng', 99, 3, 14, NULL, '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0222L01B02","lego":"S0222L01","position":2,"home_type":"c"}}'::jsonb, 'dw i’n barod i fynd efo chdi', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0222L01B03', 'cym_nv2_for_eng:S0100L01B08', 'cym_nv2_for_eng', 100, 1, 8, 'start', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0222L01B03","lego":"S0222L01","position":3,"home_type":"c"}}'::jsonb, 'dw i’n hapus i fynd efo chdi', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0222L01B05', 'cym_nv2_for_eng:S0217L02B10', 'cym_nv2_for_eng', 217, 2, 12, 'end', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0222L01B05","lego":"S0222L01","position":5,"home_type":"c"}}'::jsonb, 'ti’n gwybod bo’ fi’n hapus i gerdded i mewn i’r dref efo chdi', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_nv2_for_eng:S0222L01B06', 'cym_nv2_for_eng:S0221L02B08', 'cym_nv2_for_eng', 221, 2, 13, 'end', '{"job":556,"moved_from":{"id":"cym_nv2_for_eng:S0222L01B06","lego":"S0222L01","position":6,"home_type":"c"}}'::jsonb, 'ti’n gwybod bo’ fi’n hapus i gerdded i’r ysgol efo chdi, os lici di', 19, '2026-10-07T11:39:51.994207+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0205L01B01', 'cym_sv2_for_eng:S0204L01B08', 'cym_sv2_for_eng', 204, 1, 17, NULL, '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0205L01B01","lego":"S0205L01","position":1,"home_type":"c"}}'::jsonb, 'be’ o’t ti’n meddwl am beth maen nhw’n trio cyflawni?', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0205L01B03', 'cym_sv2_for_eng:S1519L02B05', 'cym_sv2_for_eng', 1519, 2, 12, 'middle', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0205L01B03","lego":"S0205L01","position":3,"home_type":"c"}}'::jsonb, 'be’ ti’n mynd i wneud fore dydd Sul?', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0205L01B04', 'cym_sv2_for_eng:S0154L02B09', 'cym_sv2_for_eng', 154, 2, 14, 'end', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0205L01B04","lego":"S0205L01","position":4,"home_type":"c"}}'::jsonb, 'be’ ti’n mynd i wneud gyda nhw?', 19, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0205L01B05', 'cym_sv2_for_eng:S0109L02B08', 'cym_sv2_for_eng', 109, 2, 25, NULL, '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0205L01B05","lego":"S0205L01","position":5,"home_type":"b"}}'::jsonb, 'be’ ti’n mynd i wneud gyda’r llyfr ’na?', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0205L01B06', 'cym_sv2_for_eng:S0109L02B09', 'cym_sv2_for_eng', 109, 2, 26, NULL, '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0205L01B06","lego":"S0205L01","position":6,"home_type":"b"}}'::jsonb, 'be’ ti’n mynd i wneud heno?', 19, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0205L01B07', 'cym_sv2_for_eng:S0198L01B08', 'cym_sv2_for_eng', 198, 1, 15, 'start', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0205L01B07","lego":"S0205L01","position":7,"home_type":"c"}}'::jsonb, 'ŷn ni’n moyn iddyn nhw hala llai o amser yn gweithio', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0217L01B01', 'cym_sv2_for_eng:S0035L01B06', 'cym_sv2_for_eng', 35, 1, 6, 'start', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0217L01B01","lego":"S0217L01","position":1,"home_type":"b"}}'::jsonb, 'ddwedest ti bo’ ti’n moyn', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'b'),
  ('cym_sv2_for_eng:S0217L01B02', 'cym_sv2_for_eng:S0209L01B06', 'cym_sv2_for_eng', 209, 1, 7, 'end', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0217L01B02","lego":"S0217L01","position":2,"home_type":"c"}}'::jsonb, 'ddwedest ti bo’ ti’n moyn aros amdanyn nhw', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0217L01B03', 'cym_sv2_for_eng:S0197L01B08', 'cym_sv2_for_eng', 197, 1, 10, 'end', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0217L01B03","lego":"S0217L01","position":3,"home_type":"c"}}'::jsonb, 'ddwedest ti bo’ ti’n moyn ffeindio ffordd well', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0217L01B04', 'cym_sv2_for_eng:S0196L01B08', 'cym_sv2_for_eng', 196, 1, 14, 'end', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0217L01B04","lego":"S0217L01","position":4,"home_type":"c"}}'::jsonb, 'ddwedest ti bo’ ti’n moyn gwybod beth o’n ni i gyd yn meddwl', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0217L01B05', 'cym_sv2_for_eng:S0216L02B08', 'cym_sv2_for_eng', 216, 2, 13, 'end', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0217L01B05","lego":"S0217L01","position":5,"home_type":"c"}}'::jsonb, 'ddwedest ti bo’ ti’n moyn llaeth a siwgr gyda dy de', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0217L01B07', 'cym_sv2_for_eng:S1152L04B05', 'cym_sv2_for_eng', 1152, 4, 12, 'end', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0217L01B07","lego":"S0217L01","position":7,"home_type":"c"}}'::jsonb, 'pan ddwedest ti beth o’t ti’n moyn', 18, '2026-10-13T12:50:47.780257+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0219L01B01', 'cym_sv2_for_eng:S0154L02B10', 'cym_sv2_for_eng', 154, 2, 15, 'middle', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0219L01B01","lego":"S0219L01","position":1,"home_type":"c"}}'::jsonb, 'beth ŷn nhw’n moyn gwneud?', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0219L01B03', 'cym_sv2_for_eng:S1119L01B05', 'cym_sv2_for_eng', 1119, 1, 11, 'start', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0219L01B03","lego":"S0219L01","position":3,"home_type":"c"}}'::jsonb, 'ga i ofyn i ti be’ ddwedest ti?', 19, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0219L01B02', 'cym_sv2_for_eng:S1152L04B06', 'cym_sv2_for_eng', 1152, 4, 13, 'end', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0219L01B02","lego":"S0219L01","position":2,"home_type":"c"}}'::jsonb, 'ga i ofyn i ti beth o’t ti’n moyn?', 19, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0219L01B04', 'cym_sv2_for_eng:S1488L01B05', 'cym_sv2_for_eng', 1488, 1, 11, 'middle', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0219L01B04","lego":"S0219L01","position":4,"home_type":"c"}}'::jsonb, 'ga i ofyn rhywbeth arall i ti?', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0219L01B05', 'cym_sv2_for_eng:S1119L01B06', 'cym_sv2_for_eng', 1119, 1, 12, 'start', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0219L01B05","lego":"S0219L01","position":5,"home_type":"c"}}'::jsonb, 'ga i ofyn rhywbeth i ti?', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0219L01B06', 'cym_sv2_for_eng:S1488L01B06', 'cym_sv2_for_eng', 1488, 1, 12, 'middle', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0219L01B06","lego":"S0219L01","position":6,"home_type":"c"}}'::jsonb, 'gofyn rhywbeth arall i ti', 19, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c'),
  ('cym_sv2_for_eng:S0219L01B07', 'cym_sv2_for_eng:S0178L02B08', 'cym_sv2_for_eng', 178, 2, 24, 'middle', '{"job":556,"moved_from":{"id":"cym_sv2_for_eng:S0219L01B07","lego":"S0219L01","position":7,"home_type":"c"}}'::jsonb, 'maen nhw’n dweud bo’ nhw’n moyn gwneud yn siŵr bo’ ni’n cwpla popeth mewn pryd', 18, '2026-10-07T15:18:44.619777+00:00'::timestamptz, 'c');
CREATE TEMP TABLE homes (course_code text, seed_number int, lego_index int, target_text text, ids text, PRIMARY KEY (course_code, seed_number, lego_index));
INSERT INTO homes VALUES
  ('cym_nv2_for_eng', 172, 2, 'ni', 'cym_nv2_for_eng:S0172L02B01,cym_nv2_for_eng:S0172L02B02,cym_nv2_for_eng:S0172L02B03,cym_nv2_for_eng:S0172L02B04,cym_nv2_for_eng:S0172L02B05,cym_nv2_for_eng:S0172L02B06,cym_nv2_for_eng:S0172L02B07'),
  ('cym_nv2_for_eng', 180, 1, 'oedd yn mynd', 'cym_nv2_for_eng:S0180L01B01,cym_nv2_for_eng:S0180L01B02,cym_nv2_for_eng:S0180L01B03,cym_nv2_for_eng:S0180L01B04,cym_nv2_for_eng:S0180L01B05'),
  ('cym_nv2_for_eng', 1212, 2, 'gofyn am help', 'cym_nv2_for_eng:S1212L02B01,cym_nv2_for_eng:S1212L02B02,cym_nv2_for_eng:S1212L02B03,cym_nv2_for_eng:S1212L02B04,cym_nv2_for_eng:S1212L02C01,cym_nv2_for_eng:S1212L02C02,cym_nv2_for_eng:S1212L02U01,cym_nv2_for_eng:S1212L02U02,cym_nv2_for_eng:S1212L02U03,cym_nv2_for_eng:S1212L02U04,cym_nv2_for_eng:S1212L02U05,cym_nv2_for_eng:S1212L02U06,cym_nv2_for_eng:S1212L02U07,cym_nv2_for_eng:S1212L02U08'),
  ('cym_nv2_for_eng', 94, 3, 'gest ti?', 'cym_nv2_for_eng:S0094L03B01,cym_nv2_for_eng:S0094L03B02,cym_nv2_for_eng:S0094L03B03,cym_nv2_for_eng:S0094L03B04,cym_nv2_for_eng:S0094L03B05,cym_nv2_for_eng:S0094L03B06,cym_nv2_for_eng:S0094L03B07,cym_nv2_for_eng:S0094L03U01,cym_nv2_for_eng:S0094L03U02,cym_nv2_for_eng:S0094L03U03,cym_nv2_for_eng:S0094L03U04,cym_nv2_for_eng:S0094L03U05'),
  ('cym_nv2_for_eng', 193, 1, 'ti’n teimlo', 'cym_nv2_for_eng:S0193L01B01,cym_nv2_for_eng:S0193L01B02,cym_nv2_for_eng:S0193L01B03,cym_nv2_for_eng:S0193L01B04,cym_nv2_for_eng:S0193L01B05,cym_nv2_for_eng:S0193L01B06,cym_nv2_for_eng:S0193L01B07,cym_nv2_for_eng:S0193L01U01,cym_nv2_for_eng:S0193L01U02'),
  ('cym_nv2_for_eng', 151, 2, 'nhw', 'cym_nv2_for_eng:S0151L02B01,cym_nv2_for_eng:S0151L02B02,cym_nv2_for_eng:S0151L02B03,cym_nv2_for_eng:S0151L02B04,cym_nv2_for_eng:S0151L02B05,cym_nv2_for_eng:S0151L02B06,cym_nv2_for_eng:S0151L02B07,cym_nv2_for_eng:S0151L02B08,cym_nv2_for_eng:S0151L02B09,cym_nv2_for_eng:S0151L02U01,cym_nv2_for_eng:S0151L02U02,cym_nv2_for_eng:S0151L02U03,cym_nv2_for_eng:S0151L02U04,cym_nv2_for_eng:S0151L02U05'),
  ('cym_nv2_for_eng', 129, 2, 'gest ti', 'cym_nv2_for_eng:S0129L02B01,cym_nv2_for_eng:S0129L02B02,cym_nv2_for_eng:S0129L02B03,cym_nv2_for_eng:S0129L02B04,cym_nv2_for_eng:S0129L02B05,cym_nv2_for_eng:S0129L02B06,cym_nv2_for_eng:S0129L02B07,cym_nv2_for_eng:S0129L02U01,cym_nv2_for_eng:S0129L02U02,cym_nv2_for_eng:S0129L02U03,cym_nv2_for_eng:S0129L02U04,cym_nv2_for_eng:S0129L02U05,cym_nv2_for_eng:S0129L02U06,cym_nv2_for_eng:S0129L02U07'),
  ('cym_nv2_for_eng', 172, 1, 'llai o amser', 'cym_nv2_for_eng:S0172L01B01,cym_nv2_for_eng:S0172L01B02,cym_nv2_for_eng:S0172L01B03,cym_nv2_for_eng:S0172L01B04,cym_nv2_for_eng:S0172L01B05,cym_nv2_for_eng:S0172L01B06,cym_nv2_for_eng:S0172L01B07,cym_nv2_for_eng:S0172L01U01'),
  ('cym_nv2_for_eng', 190, 3, 'ffordd well', 'cym_nv2_for_eng:S0190L03B01,cym_nv2_for_eng:S0190L03B02,cym_nv2_for_eng:S0190L03B03,cym_nv2_for_eng:S0190L03B04,cym_nv2_for_eng:S0190L03B05,cym_nv2_for_eng:S0190L03B06,cym_nv2_for_eng:S0190L03B07,cym_nv2_for_eng:S0190L03U01,cym_nv2_for_eng:S0190L03U02,cym_nv2_for_eng:S0190L03U03'),
  ('cym_nv2_for_eng', 109, 2, 'wnest ti wylio?', 'cym_nv2_for_eng:S0109L02B01,cym_nv2_for_eng:S0109L02B02,cym_nv2_for_eng:S0109L02B03,cym_nv2_for_eng:S0109L02B04,cym_nv2_for_eng:S0109L02B05,cym_nv2_for_eng:S0109L02B06'),
  ('cym_nv2_for_eng', 39, 1, 'ddudest ti', 'cym_nv2_for_eng:S0039L01B01,cym_nv2_for_eng:S0039L01B02,cym_nv2_for_eng:S0039L01B03,cym_nv2_for_eng:S0039L01B04,cym_nv2_for_eng:S0039L01B05,cym_nv2_for_eng:S0039L01B06'),
  ('cym_nv2_for_eng', 201, 1, 'aros amdanyn nhw', 'cym_nv2_for_eng:S0201L01B01,cym_nv2_for_eng:S0201L01B02,cym_nv2_for_eng:S0201L01B03,cym_nv2_for_eng:S0201L01B04,cym_nv2_for_eng:S0201L01B05'),
  ('cym_nv2_for_eng', 190, 1, 'oeddan ni i gyd yn meddwl', 'cym_nv2_for_eng:S0190L01B01,cym_nv2_for_eng:S0190L01B02,cym_nv2_for_eng:S0190L01B03,cym_nv2_for_eng:S0190L01B04,cym_nv2_for_eng:S0190L01B05,cym_nv2_for_eng:S0190L01B06,cym_nv2_for_eng:S0190L01B07,cym_nv2_for_eng:S0190L01U01,cym_nv2_for_eng:S0190L01U02,cym_nv2_for_eng:S0190L01U03,cym_nv2_for_eng:S0190L01U04,cym_nv2_for_eng:S0190L01U05'),
  ('cym_nv2_for_eng', 207, 3, 'a siwgr', 'cym_nv2_for_eng:S0207L03B01,cym_nv2_for_eng:S0207L03B02,cym_nv2_for_eng:S0207L03B03,cym_nv2_for_eng:S0207L03B04,cym_nv2_for_eng:S0207L03B05,cym_nv2_for_eng:S0207L03B06,cym_nv2_for_eng:S0207L03B07,cym_nv2_for_eng:S0207L03U01,cym_nv2_for_eng:S0207L03U02,cym_nv2_for_eng:S0207L03U03,cym_nv2_for_eng:S0207L03U04,cym_nv2_for_eng:S0207L03U05'),
  ('cym_nv2_for_eng', 206, 1, 'neu goffi', 'cym_nv2_for_eng:S0206L01B01,cym_nv2_for_eng:S0206L01B02,cym_nv2_for_eng:S0206L01B03,cym_nv2_for_eng:S0206L01B04,cym_nv2_for_eng:S0206L01B05,cym_nv2_for_eng:S0206L01B06,cym_nv2_for_eng:S0206L01B07'),
  ('cym_nv2_for_eng', 1349, 1, 'mynd allan', 'cym_nv2_for_eng:S1349L01B01,cym_nv2_for_eng:S1349L01B02,cym_nv2_for_eng:S1349L01B03,cym_nv2_for_eng:S1349L01B04,cym_nv2_for_eng:S1349L01C01,cym_nv2_for_eng:S1349L01C02,cym_nv2_for_eng:S1349L01U01,cym_nv2_for_eng:S1349L01U02,cym_nv2_for_eng:S1349L01U03,cym_nv2_for_eng:S1349L01U04,cym_nv2_for_eng:S1349L01U05,cym_nv2_for_eng:S1349L01U06,cym_nv2_for_eng:S1349L01U07'),
  ('cym_nv2_for_eng', 99, 3, 'yn barod', 'cym_nv2_for_eng:S0099L03B01,cym_nv2_for_eng:S0099L03B02,cym_nv2_for_eng:S0099L03B03,cym_nv2_for_eng:S0099L03B04,cym_nv2_for_eng:S0099L03B05,cym_nv2_for_eng:S0099L03B06,cym_nv2_for_eng:S0099L03B07,cym_nv2_for_eng:S0099L03U01,cym_nv2_for_eng:S0099L03U02,cym_nv2_for_eng:S0099L03U03,cym_nv2_for_eng:S0099L03U04,cym_nv2_for_eng:S0099L03U05,cym_nv2_for_eng:S0099L03U06'),
  ('cym_nv2_for_eng', 100, 1, 'dw i’n hapus', 'cym_nv2_for_eng:S0100L01B01,cym_nv2_for_eng:S0100L01B02,cym_nv2_for_eng:S0100L01B03,cym_nv2_for_eng:S0100L01B04,cym_nv2_for_eng:S0100L01B05,cym_nv2_for_eng:S0100L01B06,cym_nv2_for_eng:S0100L01B07'),
  ('cym_nv2_for_eng', 217, 2, 'i mewn i’r dref', 'cym_nv2_for_eng:S0217L02B01,cym_nv2_for_eng:S0217L02B02,cym_nv2_for_eng:S0217L02B03,cym_nv2_for_eng:S0217L02B04,cym_nv2_for_eng:S0217L02B05,cym_nv2_for_eng:S0217L02B06,cym_nv2_for_eng:S0217L02B07,cym_nv2_for_eng:S0217L02B08,cym_nv2_for_eng:S0217L02B09,cym_nv2_for_eng:S0217L02U01,cym_nv2_for_eng:S0217L02U02'),
  ('cym_nv2_for_eng', 221, 2, 'os lici di', 'cym_nv2_for_eng:S0221L02B01,cym_nv2_for_eng:S0221L02B02,cym_nv2_for_eng:S0221L02B03,cym_nv2_for_eng:S0221L02B04,cym_nv2_for_eng:S0221L02B05,cym_nv2_for_eng:S0221L02B06,cym_nv2_for_eng:S0221L02B07,cym_nv2_for_eng:S0221L02U01,cym_nv2_for_eng:S0221L02U02,cym_nv2_for_eng:S0221L02U03,cym_nv2_for_eng:S0221L02U04,cym_nv2_for_eng:S0221L02U05'),
  ('cym_sv2_for_eng', 204, 1, 'be’ o’t ti’n meddwl?', 'cym_sv2_for_eng:S0204L01B01,cym_sv2_for_eng:S0204L01B02,cym_sv2_for_eng:S0204L01B03,cym_sv2_for_eng:S0204L01B04,cym_sv2_for_eng:S0204L01B05,cym_sv2_for_eng:S0204L01B06,cym_sv2_for_eng:S0204L01B07,cym_sv2_for_eng:S0204L01U01,cym_sv2_for_eng:S0204L01U02,cym_sv2_for_eng:S0204L01U03,cym_sv2_for_eng:S0204L01U04,cym_sv2_for_eng:S0204L01U05,cym_sv2_for_eng:S0204L01U06,cym_sv2_for_eng:S0204L01U07,cym_sv2_for_eng:S0204L01U08,cym_sv2_for_eng:S0204L01U09'),
  ('cym_sv2_for_eng', 1519, 2, 'eu', 'cym_sv2_for_eng:S1519L02B01,cym_sv2_for_eng:S1519L02B02,cym_sv2_for_eng:S1519L02B03,cym_sv2_for_eng:S1519L02B04,cym_sv2_for_eng:S1519L02U01,cym_sv2_for_eng:S1519L02U02,cym_sv2_for_eng:S1519L02U03,cym_sv2_for_eng:S1519L02U04,cym_sv2_for_eng:S1519L02U05,cym_sv2_for_eng:S1519L02U06,cym_sv2_for_eng:S1519L02U07'),
  ('cym_sv2_for_eng', 154, 2, 'nhw', 'cym_sv2_for_eng:S0154L02B01,cym_sv2_for_eng:S0154L02B02,cym_sv2_for_eng:S0154L02B03,cym_sv2_for_eng:S0154L02B04,cym_sv2_for_eng:S0154L02B05,cym_sv2_for_eng:S0154L02B06,cym_sv2_for_eng:S0154L02B07,cym_sv2_for_eng:S0154L02B08,cym_sv2_for_eng:S0154L02U01,cym_sv2_for_eng:S0154L02U02,cym_sv2_for_eng:S0154L02U03,cym_sv2_for_eng:S0154L02U04,cym_sv2_for_eng:S0154L02U05'),
  ('cym_sv2_for_eng', 109, 2, 'be’ ti’n mynd i wneud?', 'cym_sv2_for_eng:S0109L02B01,cym_sv2_for_eng:S0109L02B02,cym_sv2_for_eng:S0109L02B03,cym_sv2_for_eng:S0109L02B04,cym_sv2_for_eng:S0109L02B05,cym_sv2_for_eng:S0109L02B06,cym_sv2_for_eng:S0109L02B07,cym_sv2_for_eng:S0109L02U01,cym_sv2_for_eng:S0109L02U02,cym_sv2_for_eng:S0109L02U03,cym_sv2_for_eng:S0109L02U04,cym_sv2_for_eng:S0109L02U05,cym_sv2_for_eng:S0109L02U06,cym_sv2_for_eng:S0109L02U07,cym_sv2_for_eng:S0109L02U08,cym_sv2_for_eng:S0109L02U09,cym_sv2_for_eng:S0109L02U10,cym_sv2_for_eng:S0109L02U11,cym_sv2_for_eng:S0109L02U12,cym_sv2_for_eng:S0109L02U13,cym_sv2_for_eng:S0109L02U14,cym_sv2_for_eng:S0109L02U15,cym_sv2_for_eng:S0109L02U16,cym_sv2_for_eng:S0109L02U17'),
  ('cym_sv2_for_eng', 198, 1, 'ŷn ni’n moyn iddyn nhw hala', 'cym_sv2_for_eng:S0198L01B01,cym_sv2_for_eng:S0198L01B02,cym_sv2_for_eng:S0198L01B03,cym_sv2_for_eng:S0198L01B04,cym_sv2_for_eng:S0198L01B05,cym_sv2_for_eng:S0198L01B06,cym_sv2_for_eng:S0198L01B07,cym_sv2_for_eng:S0198L01U01,cym_sv2_for_eng:S0198L01U02,cym_sv2_for_eng:S0198L01U03,cym_sv2_for_eng:S0198L01U04,cym_sv2_for_eng:S0198L01U05,cym_sv2_for_eng:S0198L01U06,cym_sv2_for_eng:S0198L01U07'),
  ('cym_sv2_for_eng', 35, 1, 'ddwedest ti', 'cym_sv2_for_eng:S0035L01B01,cym_sv2_for_eng:S0035L01B02,cym_sv2_for_eng:S0035L01B03,cym_sv2_for_eng:S0035L01B04,cym_sv2_for_eng:S0035L01B05'),
  ('cym_sv2_for_eng', 209, 1, 'aros amdanyn nhw', 'cym_sv2_for_eng:S0209L01B01,cym_sv2_for_eng:S0209L01B02,cym_sv2_for_eng:S0209L01B03,cym_sv2_for_eng:S0209L01B04,cym_sv2_for_eng:S0209L01B05,cym_sv2_for_eng:S0209L01U01'),
  ('cym_sv2_for_eng', 197, 1, 'ffordd well', 'cym_sv2_for_eng:S0197L01B01,cym_sv2_for_eng:S0197L01B02,cym_sv2_for_eng:S0197L01B03,cym_sv2_for_eng:S0197L01B04,cym_sv2_for_eng:S0197L01B05,cym_sv2_for_eng:S0197L01B06,cym_sv2_for_eng:S0197L01B07,cym_sv2_for_eng:S0197L01U01,cym_sv2_for_eng:S0197L01U02'),
  ('cym_sv2_for_eng', 196, 1, 'o’n ni i gyd yn meddwl', 'cym_sv2_for_eng:S0196L01B01,cym_sv2_for_eng:S0196L01B02,cym_sv2_for_eng:S0196L01B03,cym_sv2_for_eng:S0196L01B04,cym_sv2_for_eng:S0196L01B05,cym_sv2_for_eng:S0196L01B06,cym_sv2_for_eng:S0196L01B07,cym_sv2_for_eng:S0196L01U01,cym_sv2_for_eng:S0196L01U02,cym_sv2_for_eng:S0196L01U03,cym_sv2_for_eng:S0196L01U04,cym_sv2_for_eng:S0196L01U05,cym_sv2_for_eng:S0196L01U06'),
  ('cym_sv2_for_eng', 216, 2, 'a siwgr', 'cym_sv2_for_eng:S0216L02B01,cym_sv2_for_eng:S0216L02B02,cym_sv2_for_eng:S0216L02B03,cym_sv2_for_eng:S0216L02B04,cym_sv2_for_eng:S0216L02B05,cym_sv2_for_eng:S0216L02B06,cym_sv2_for_eng:S0216L02B07,cym_sv2_for_eng:S0216L02U01,cym_sv2_for_eng:S0216L02U02,cym_sv2_for_eng:S0216L02U03,cym_sv2_for_eng:S0216L02U04,cym_sv2_for_eng:S0216L02U05'),
  ('cym_sv2_for_eng', 1152, 4, 'beth o’t ti’n moyn', 'cym_sv2_for_eng:S1152L04B01,cym_sv2_for_eng:S1152L04B02,cym_sv2_for_eng:S1152L04B03,cym_sv2_for_eng:S1152L04B04,cym_sv2_for_eng:S1152L04U01,cym_sv2_for_eng:S1152L04U02,cym_sv2_for_eng:S1152L04U03,cym_sv2_for_eng:S1152L04U04,cym_sv2_for_eng:S1152L04U05,cym_sv2_for_eng:S1152L04U06,cym_sv2_for_eng:S1152L04U07'),
  ('cym_sv2_for_eng', 1119, 1, 'ga i ofyn', 'cym_sv2_for_eng:S1119L01B01,cym_sv2_for_eng:S1119L01B02,cym_sv2_for_eng:S1119L01B03,cym_sv2_for_eng:S1119L01B04,cym_sv2_for_eng:S1119L01U01,cym_sv2_for_eng:S1119L01U02,cym_sv2_for_eng:S1119L01U03,cym_sv2_for_eng:S1119L01U04,cym_sv2_for_eng:S1119L01U05,cym_sv2_for_eng:S1119L01U06'),
  ('cym_sv2_for_eng', 1488, 1, 'ar', 'cym_sv2_for_eng:S1488L01B01,cym_sv2_for_eng:S1488L01B02,cym_sv2_for_eng:S1488L01B03,cym_sv2_for_eng:S1488L01B04,cym_sv2_for_eng:S1488L01U01,cym_sv2_for_eng:S1488L01U02,cym_sv2_for_eng:S1488L01U03,cym_sv2_for_eng:S1488L01U04,cym_sv2_for_eng:S1488L01U05,cym_sv2_for_eng:S1488L01U06'),
  ('cym_sv2_for_eng', 178, 2, 'ni', 'cym_sv2_for_eng:S0178L02B01,cym_sv2_for_eng:S0178L02B02,cym_sv2_for_eng:S0178L02B03,cym_sv2_for_eng:S0178L02B04,cym_sv2_for_eng:S0178L02B05,cym_sv2_for_eng:S0178L02B06,cym_sv2_for_eng:S0178L02B07,cym_sv2_for_eng:S0178L02U01,cym_sv2_for_eng:S0178L02U02,cym_sv2_for_eng:S0178L02U03,cym_sv2_for_eng:S0178L02U04,cym_sv2_for_eng:S0178L02U05,cym_sv2_for_eng:S0178L02U06,cym_sv2_for_eng:S0178L02U07,cym_sv2_for_eng:S0178L02U08,cym_sv2_for_eng:S0178L02U09,cym_sv2_for_eng:S0178L02U10,cym_sv2_for_eng:S0178L02U11,cym_sv2_for_eng:S0178L02U12,cym_sv2_for_eng:S0178L02U13,cym_sv2_for_eng:S0178L02U14,cym_sv2_for_eng:S0178L02U15,cym_sv2_for_eng:S0178L02U16');
CREATE TEMP TABLE known_links (seed_id uuid PRIMARY KEY, course_code text, seed_number int, known_text text, audio_id uuid);
INSERT INTO known_links VALUES
  ('a4ddbb46-adb6-447b-8bc5-04401c289c4f', 'cym_nv2_for_eng', 194, 'did you have a good time last night?', '1f009fcf-161a-434e-8cd0-c1aaf4c06c63'),
  ('fbca8d84-952a-48bd-af84-8f9e99e2d65b', 'cym_nv2_for_eng', 208, 'you said that you wanted milk with your coffee', '64487702-e0a9-4df0-b764-51a89b9f373e'),
  ('5d4f1e81-5afa-46b9-97e9-163d47494828', 'cym_nv2_for_eng', 222, 'I’m happy to walk into town with you', '79f5c5dd-9ad1-4bac-98c8-363b08c28f26'),
  ('2d2e9b40-d1cd-4426-81b2-121141d16663', 'cym_sv2_for_eng', 205, 'what are you going to do tomorrow?', '8c230f2f-c8d0-4588-a13d-c93f595ffec9');
CREATE TEMP TABLE touched AS SELECT course_code, seed_number, lego_index FROM flips UNION SELECT course_code, seed_number, lego_index FROM homes;

-- Lock what we read; under REPEATABLE READ a row changed by another transaction since our snapshot raises here.
SELECT count(*) AS locked_legos FROM (SELECT 1 FROM course_legos l JOIN touched t USING (course_code, seed_number, lego_index) FOR UPDATE OF l) x;
SELECT count(*) AS locked_rows FROM (SELECT 1 FROM course_practice_phrases p JOIN touched t USING (course_code, seed_number, lego_index) FOR UPDATE OF p) x;
SELECT count(*) AS locked_seeds FROM (SELECT 1 FROM course_seeds s JOIN flips f USING (course_code, seed_number) FOR UPDATE OF s) x;

CREATE FUNCTION pg_temp.fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'live '||x.course_code||' seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, x.seed_number, x.lego_index) NOT IN (SELECT course_code, seed_number, lego_index FROM flips) GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND x.id NOT IN (SELECT seed_id FROM known_links) GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, x.seed_number, x.lego_index) NOT IN (SELECT course_code, seed_number, lego_index FROM touched) GROUP BY x.course_code
$$;
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.fp();
SELECT 'BEFORE' k, * FROM pre ORDER BY t;

DO $$ BEGIN
  IF to_regclass('backup_cym_taught_556') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF (SELECT count(*) FROM flips) <> 7 THEN RAISE EXCEPTION 'expected 7 LEGOs to flip'; END IF;
  IF EXISTS (SELECT 1 FROM flips WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) OR EXISTS (SELECT 1 FROM moves WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng'))
     OR EXISTS (SELECT 1 FROM known_links WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN RAISE EXCEPTION 'a write is outside the sandboxes'; END IF;
  IF EXISTS (SELECT 1 FROM flips WHERE seed_number = 15) OR EXISTS (SELECT 1 FROM moves WHERE seed_number = 15) THEN RAISE EXCEPTION 'seed 15 is not to be touched'; END IF;
  IF (SELECT count(*) FROM flips f JOIN course_legos l USING (course_code, seed_number, lego_index) WHERE l.is_new AND l.target_text = f.target_text) <> 7 THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a LEGO to flip is gone, already not new, or its Welsh changed — re-plan'; END IF;
  IF EXISTS (SELECT 1 FROM flips f JOIN course_legos l USING (course_code, seed_number) WHERE l.is_new AND l.lego_index <> f.lego_index) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a seed of the seven now has another new LEGO — (a) applies, re-plan'; END IF;
  IF (SELECT count(*) FROM moves m JOIN course_practice_phrases p ON p.id = m.old_id JOIN flips f ON (f.course_code, f.seed_number, f.lego_index) = (p.course_code, p.seed_number, p.lego_index)
      WHERE p.course_code = m.course_code AND p.target_text = m.target_text AND p.version = m.old_version AND p.updated_at = m.old_updated_at) <> (SELECT count(*) FROM moves) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a phrase to move is gone, not under a flipped LEGO, or was edited since the plan — re-plan'; END IF;
  IF (SELECT count(*) FROM homes h JOIN course_legos l USING (course_code, seed_number, lego_index) WHERE l.is_new AND l.target_text = h.target_text) <> (SELECT count(*) FROM homes) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a home LEGO is missing, not new, or its Welsh changed — re-plan'; END IF;
  IF EXISTS (SELECT 1 FROM homes h JOIN flips f USING (course_code, seed_number, lego_index)) THEN RAISE EXCEPTION 'a flipped LEGO is a home'; END IF;
  IF EXISTS (SELECT 1 FROM homes h WHERE h.ids IS DISTINCT FROM (SELECT coalesce(string_agg(p.id, ',' ORDER BY p.id COLLATE "C"), '') FROM course_practice_phrases p
      WHERE (p.course_code, p.seed_number, p.lego_index) = (h.course_code, h.seed_number, h.lego_index))) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: the rows under a home LEGO changed since the plan — re-plan'; END IF;
  IF EXISTS (SELECT 1 FROM moves m JOIN course_practice_phrases p ON p.id = m.new_id) THEN RAISE EXCEPTION 'a new id is taken'; END IF;
  IF EXISTS (SELECT 1 FROM moves m JOIN course_practice_phrases p USING (course_code, seed_number, lego_index, position)) THEN RAISE EXCEPTION 'a position is taken'; END IF;
  IF EXISTS (SELECT 1 FROM moves m JOIN course_practice_phrases p USING (course_code, seed_number, lego_index)
      WHERE lower(trim(p.target_text)) = lower(trim(m.target_text))) THEN RAISE EXCEPTION 'a home already holds the same Welsh'; END IF;
  IF (SELECT count(*) FROM known_links k JOIN course_seeds s ON s.id = k.seed_id JOIN flips f ON (f.course_code, f.seed_number) = (s.course_code, s.seed_number)
      WHERE s.course_code = k.course_code AND s.known_audio_id IS NULL AND s.known_text = k.known_text) <> (SELECT count(*) FROM known_links) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a known slot to fill is no longer empty or its English changed — re-plan'; END IF;
  IF (SELECT count(*) FROM known_links k JOIN course_audio a ON a.id = k.audio_id
      WHERE a.role = 'known' AND a.language = 'eng' AND a.origin = 'human' AND a.course_code IN ('cym_n_for_eng','cym_s_for_eng')) <> (SELECT count(*) FROM known_links) THEN
    RAISE EXCEPTION 'a known clip is missing or is not a human English take from a live Welsh course'; END IF;
END $$;

-- The backups: every row under the flipped and home LEGOs, the flipped LEGO rows and the seven seed rows, as they stand now.
CREATE TABLE backup_cym_taught_556 AS SELECT p.* FROM course_practice_phrases p JOIN touched t USING (course_code, seed_number, lego_index);
CREATE TABLE backup_cym_taught_556_legos AS SELECT * FROM touched;
CREATE TABLE backup_cym_taught_556_moves AS SELECT old_id, new_id FROM moves;
CREATE TABLE backup_cym_taught_556_flips AS SELECT l.* FROM course_legos l JOIN flips f USING (course_code, seed_number, lego_index);
CREATE TABLE backup_cym_taught_556_seeds AS SELECT s.* FROM course_seeds s WHERE s.id IN (SELECT seed_id FROM known_links);
REVOKE ALL ON backup_cym_taught_556, backup_cym_taught_556_legos, backup_cym_taught_556_moves, backup_cym_taught_556_flips, backup_cym_taught_556_seeds FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT c, 'sql:job-556 weave-cym-taught', 'weave-taught-and-rehome', 'agent', 'claude-job-556-taught',
       'agent (claude-job-556-taught)', false, 'creator',
       jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number) FROM flips WHERE course_code = c),
                          'moves', (SELECT jsonb_agg(jsonb_build_array(old_id, new_id) ORDER BY old_id) FROM moves WHERE course_code = c),
                          'known_links', (SELECT jsonb_agg(jsonb_build_array(seed_number, audio_id) ORDER BY seed_number) FROM known_links WHERE course_code = c)),
       jsonb_build_object('ruling', 'Aran 2026-10-13 (job #556): seven repeated LEGOs, each its seed''s only new LEGO, are already taught (is_new=false); their seeds play as whole sentences (seed-sentence review). Phrases moved by #555''s method: (a) seed''s other new LEGO, (b) original earlier LEGO, (c) another new LEGO closest to the original position. Empty known slots on those seeds take the live sister course''s human take of the identical English; nothing rendered.',
                          'backup', 'backup_cym_taught_556')
FROM (VALUES ('cym_nv2_for_eng'), ('cym_sv2_for_eng')) v(c);
CREATE TEMP TABLE ev AS SELECT DISTINCT ON (course_code) course_code, id FROM content_edit_events WHERE detail->>'backup'='backup_cym_taught_556' ORDER BY course_code, occurred_at DESC, id;

UPDATE course_legos l SET is_new = false, last_edit_event_id = ev.id
FROM flips f JOIN ev USING (course_code)
WHERE (l.course_code, l.seed_number, l.lego_index) = (f.course_code, f.seed_number, f.lego_index);

UPDATE course_seeds s SET known_audio_id = k.audio_id, last_edit_event_id = ev.id
FROM known_links k JOIN ev USING (course_code)
WHERE s.id = k.seed_id AND s.known_audio_id IS NULL;

DELETE FROM course_practice_phrases WHERE id IN (SELECT old_id FROM moves);
INSERT INTO course_practice_phrases
SELECT (jsonb_populate_record(b, jsonb_build_object(
  'id', m.new_id, 'seed_number', m.seed_number, 'lego_index', m.lego_index, 'position', m.position,
  'lego_id', 'S'||lpad(m.seed_number::text, 4, '0')||'L'||lpad(m.lego_index::text, 2, '0'),
  'lego_position', m.lego_position, 'metadata', m.metadata, 'decomposition', NULL, 'decomposition_course_version', NULL,
  'last_edit_event_id', ev.id, 'updated_at', now()))).*
FROM backup_cym_taught_556 b JOIN moves m ON m.old_id = b.id JOIN ev ON ev.course_code = m.course_code;
SET CONSTRAINTS ALL IMMEDIATE;

CREATE TEMP TABLE post AS SELECT * FROM pg_temp.fp();
SELECT 'AFTER' k, * FROM post ORDER BY t;
DO $$ BEGIN
  IF EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post) OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: live Welsh, master canonical_seeds, or other sandbox LEGOs/seeds/phrases changed'; END IF;
  IF EXISTS (SELECT 1 FROM backup_cym_taught_556_flips b JOIN course_legos l ON l.id = b.id
      WHERE l.is_new OR (to_jsonb(b) - 'version' - 'updated_at' - 'last_edit_event_id' || '{"is_new": false}') <> (to_jsonb(l) - 'version' - 'updated_at' - 'last_edit_event_id')) THEN
    RAISE EXCEPTION 'CHECK FAILED: a flipped LEGO changed beyond is_new'; END IF;
  IF EXISTS (SELECT 1 FROM backup_cym_taught_556_seeds b JOIN course_seeds s ON s.id = b.id JOIN known_links k ON k.seed_id = s.id
      WHERE s.known_audio_id IS DISTINCT FROM k.audio_id OR (to_jsonb(b) - 'version' - 'updated_at' - 'last_edit_event_id' - 'known_audio_id') <> (to_jsonb(s) - 'version' - 'updated_at' - 'last_edit_event_id' - 'known_audio_id')) THEN
    RAISE EXCEPTION 'CHECK FAILED: a linked seed changed beyond its known clip'; END IF;
  IF (SELECT count(*) FROM course_practice_phrases p JOIN touched t USING (course_code, seed_number, lego_index)) <> (SELECT count(*) FROM backup_cym_taught_556) THEN
    RAISE EXCEPTION 'CHECK FAILED: row count under the touched LEGOs'; END IF;
  IF EXISTS (SELECT b.id, md5(b::text) FROM backup_cym_taught_556 b WHERE b.id NOT IN (SELECT old_id FROM moves)
             EXCEPT SELECT p.id, md5(p::text) FROM course_practice_phrases p) THEN RAISE EXCEPTION 'CHECK FAILED: a row that stays changed'; END IF;
  IF EXISTS (SELECT 1 FROM backup_cym_taught_556 b JOIN moves m ON m.old_id = b.id LEFT JOIN course_practice_phrases p ON p.id = m.new_id
      WHERE p.id IS NULL OR (p.course_code, p.seed_number, p.lego_index, p.known_text, p.target_text, p.phrase_role, p.status, p.known_audio_id, p.target1_audio_id,
        p.target2_audio_id, p.presentation_audio_id, p.created_at, p.word_count, p.lego_count, p.introduce)
        IS DISTINCT FROM (m.course_code, m.seed_number, m.lego_index, b.known_text, b.target_text, b.phrase_role, b.status, b.known_audio_id, b.target1_audio_id,
        b.target2_audio_id, b.presentation_audio_id, b.created_at, b.word_count, b.lego_count, b.introduce)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a moved row lost its text, role, status or audio'; END IF;
  IF (SELECT count(*) FROM moves) <> 46 OR (SELECT count(*) FROM known_links) <> 4 THEN RAISE EXCEPTION 'CHECK FAILED: plan sizes'; END IF;
  IF (SELECT count(*) FROM ev) <> 2 THEN RAISE EXCEPTION 'CHECK FAILED: edit events'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT home_type, count(*) FROM moves GROUP BY 1 ORDER BY 1;
SELECT f.course_code, f.seed_number, s.known_audio_id IS NOT NULL k, s.target1_audio_id IS NOT NULL t1, s.target2_audio_id IS NOT NULL t2
  FROM flips f JOIN course_seeds s USING (course_code, seed_number) ORDER BY 1, 2;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
