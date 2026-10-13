-- Job #591 (Aran asked, Tom approved 2026-10-13): link empty seed clip slots in the LIVE Welsh courses to an EXISTING human take of the
-- exact same text (whitespace and apostrophes normalised), by the SAME SPEAKER the live course already uses on that slot. No recording,
-- no synthesis. Plan: link-cym-live-seed-clips-591-plan.sql. Slot speakers found there (majority voice of the slot's filled takes):
--   cym_n known   = cartesia Tom-006 (TTS, 47/72)   -> no human take can be that speaker: NOTHING linked
--   cym_n target1 = legacy_import (19/21)           -> legacy_import cym_n target1 lineage only: no exact-text take exists, NOTHING linked
--   cym_n target2 = human_aran_cym_n (305/305)      -> Aran (+ config aliases): no exact-text take for an empty slot, NOTHING linked
--   cym_s known/target1/target2 = legacy_import     -> only legacy_import takes from cym_s_for_eng with the SAME role are linked
-- So only cym_s_for_eng changes: 95 slots (21 known, 37 target1, 37 target2) on 37 seeds, and its content_version is patch-bumped so
-- the player drops its cached script and audio for the course (useScriptCache.checkContentVersion). cym_n_for_eng is not written.
-- Every linked file was HEAD-checked 200 on S3 (ssi-audio-stage) at plan time and has a duration in course_audio.
-- Fingerprinted before/after and must not change: cym_n seeds/legos/phrases/audio/courses row, cym_s legos/phrases/audio, the other
-- cym_s seeds, the cym_s courses row bar content_version/updated_at/content_stamp, canonical_seeds, and the linked audio rows.
-- Dry run unless  -v finish=COMMIT .  Undo: link-cym-live-seed-clips-591-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
CREATE FUNCTION pg_temp.nz(t text) RETURNS text IMMUTABLE LANGUAGE sql AS $$
  SELECT btrim(regexp_replace(translate(coalesce(t,''), E'’‘ʼ`´′', ''''''''''''), '\s+', ' ', 'g')) $$;
CREATE TEMP TABLE links (seed_id uuid, course_code text, seed_number int, slot text, audio_id uuid, txt text, PRIMARY KEY (seed_id, slot));
INSERT INTO links VALUES
  ('ff5b8155-8d83-4c31-855e-af17bde9855c', 'cym_s_for_eng', 464, 'target1', '80080255-0287-488a-b672-8eedef1e2427', 'ddwedes i rif fy ystafell wrthi unwaith ond wnaeth hi anghofio fe'),
  ('ff5b8155-8d83-4c31-855e-af17bde9855c', 'cym_s_for_eng', 464, 'target2', 'a856b9a0-ebec-420a-9df9-998e48372ce9', 'ddwedes i rif fy ystafell wrthi unwaith ond wnaeth hi anghofio fe'),
  ('70ba1ed9-8d34-4ce9-a61a-f2e569f772e8', 'cym_s_for_eng', 466, 'target1', 'ea97108c-056b-4200-8591-10f1fe713c08', 'gad i fi ei dwlid e dros y wal'),
  ('70ba1ed9-8d34-4ce9-a61a-f2e569f772e8', 'cym_s_for_eng', 466, 'target2', '5d831d85-7534-4ec6-bcd6-7d4d0d8884af', 'gad i fi ei dwlid e dros y wal'),
  ('5776e9e3-0815-4b22-b20c-251450354e26', 'cym_s_for_eng', 470, 'target1', '13564238-9e5c-4878-9d8a-7345cc363edb', 'faint mor uchel wyt ti’n moyn dringo cyn i ni stopo?'),
  ('5776e9e3-0815-4b22-b20c-251450354e26', 'cym_s_for_eng', 470, 'target2', '50fad56b-0103-4a74-bd16-d14aef13d4d0', 'faint mor uchel wyt ti’n moyn dringo cyn i ni stopo?'),
  ('04bfd05e-7829-4aff-96da-2dab0d35caea', 'cym_s_for_eng', 472, 'known', '87b0a512-f61f-4bec-88ff-51c83d0686c2', 'part of the problem is that we don''t know the facts'),
  ('04bfd05e-7829-4aff-96da-2dab0d35caea', 'cym_s_for_eng', 472, 'target1', 'fe1a10f9-a296-43ac-b0b7-8f7b7f12f6cb', 'rhan o’r broblem yw nag ŷn ni’n gwybod y ffeithiau'),
  ('04bfd05e-7829-4aff-96da-2dab0d35caea', 'cym_s_for_eng', 472, 'target2', '99a93260-55b8-42f3-bcb7-e12f5b5c2f0c', 'rhan o’r broblem yw nag ŷn ni’n gwybod y ffeithiau'),
  ('2305218a-db5f-4ee2-800e-126bb52cd88c', 'cym_s_for_eng', 474, 'known', '6db99719-d554-45bc-97e5-26941c8fa715', 'I don''t even want it as a free offer'),
  ('2305218a-db5f-4ee2-800e-126bb52cd88c', 'cym_s_for_eng', 474, 'target1', '3b6c8089-64d6-4e53-97ed-59abf2d65f48', 'sa i hyd yn oed yn moyn e fel cynnig am ddim'),
  ('2305218a-db5f-4ee2-800e-126bb52cd88c', 'cym_s_for_eng', 474, 'target2', '36c24e86-58f0-4b0d-ac75-e57e73203859', 'sa i hyd yn oed yn moyn e fel cynnig am ddim'),
  ('20b8bb56-c070-4e20-9495-ab126edf7ed9', 'cym_s_for_eng', 477, 'known', '54e4e354-2a93-43dd-86d9-a2ae05174963', 'he''s been sick since the second day of the holidays'),
  ('20b8bb56-c070-4e20-9495-ab126edf7ed9', 'cym_s_for_eng', 477, 'target1', '966c3306-bc53-4ab9-90a0-326cb7ac539b', 'ma fe wedi bod yn dost ers ail ddiwrnod y gwyliau'),
  ('20b8bb56-c070-4e20-9495-ab126edf7ed9', 'cym_s_for_eng', 477, 'target2', '22df223b-7bad-4ecc-8179-1ad20ee20767', 'ma fe wedi bod yn dost ers ail ddiwrnod y gwyliau'),
  ('b64aae4a-4829-4a87-aa41-4ac09fc7d081', 'cym_s_for_eng', 480, 'known', '021fc914-9e0e-4c82-9503-4394aeca8ed5', 'whatever he says it''s not far ahead now'),
  ('b64aae4a-4829-4a87-aa41-4ac09fc7d081', 'cym_s_for_eng', 480, 'target1', 'e51bc077-3b2c-466b-81ba-7d9168c5f19e', 'ta beth ma fe’n dweud dyw e ddim yn bell o’n blaenau ni nawr'),
  ('b64aae4a-4829-4a87-aa41-4ac09fc7d081', 'cym_s_for_eng', 480, 'target2', 'ef248e58-46f8-4203-9d0a-44ec236350a3', 'ta beth ma fe’n dweud dyw e ddim yn bell o’n blaenau ni nawr'),
  ('2d503741-947b-4e01-a3e8-b36dd2482a1a', 'cym_s_for_eng', 483, 'known', 'c5d08a92-61cf-4c1f-8eb0-0ef194b0295c', 'life isn''t easy but it''s not meant to be easy'),
  ('2d503741-947b-4e01-a3e8-b36dd2482a1a', 'cym_s_for_eng', 483, 'target1', 'aa6f26f1-72ac-4200-aad0-0f3e1ee3983e', 'so bywyd yn hawdd ond so fe i fod yn hawdd'),
  ('2d503741-947b-4e01-a3e8-b36dd2482a1a', 'cym_s_for_eng', 483, 'target2', '4de93e8b-1ca0-4e8b-ac04-79be824cbe7e', 'so bywyd yn hawdd ond so fe i fod yn hawdd'),
  ('6b34d294-2b72-45cb-aabc-8c43189a7456', 'cym_s_for_eng', 484, 'known', 'b5f90876-130a-47f6-a7d3-f9cc8eeb0fe2', 'it''s meant to be a challenge'),
  ('6b34d294-2b72-45cb-aabc-8c43189a7456', 'cym_s_for_eng', 484, 'target1', 'e0514952-99df-4f8a-b42d-8d954161db81', 'ma hi i fod yn her'),
  ('6b34d294-2b72-45cb-aabc-8c43189a7456', 'cym_s_for_eng', 484, 'target2', 'e029e758-4b9f-4e00-bb6d-292f27bfe49b', 'ma hi i fod yn her'),
  ('b8a141d6-95c5-4c76-9fca-e4025c74fca9', 'cym_s_for_eng', 487, 'known', '1b1c047d-4465-49e2-814f-9c80f0521162', 'it''s under the bridge'),
  ('b8a141d6-95c5-4c76-9fca-e4025c74fca9', 'cym_s_for_eng', 487, 'target1', '9edfba02-8941-48be-90ee-d834c43e7c58', 'ma fe o dan y bont'),
  ('b8a141d6-95c5-4c76-9fca-e4025c74fca9', 'cym_s_for_eng', 487, 'target2', '79e176c0-2ac0-45ea-8c21-c373a777af01', 'ma fe o dan y bont'),
  ('4e605f17-b4ea-461a-a0ee-2392c6ff1b85', 'cym_s_for_eng', 492, 'target1', '10d8791b-65d3-4dfb-839c-2f446fb52c6f', 'pa un o’r llefydd yna wyt ti’n meddwl yw’r mwya diddorol?'),
  ('4e605f17-b4ea-461a-a0ee-2392c6ff1b85', 'cym_s_for_eng', 492, 'target2', '8c6d3c08-cdec-4cb7-bca2-624d5ee71768', 'pa un o’r llefydd yna wyt ti’n meddwl yw’r mwya diddorol?'),
  ('4b2928e1-e21a-4c2b-b7c8-0778ad890674', 'cym_s_for_eng', 493, 'known', 'a11b22bc-1a76-4430-8ab5-28c4c45bceee', 'what''s going to come next?'),
  ('4b2928e1-e21a-4c2b-b7c8-0778ad890674', 'cym_s_for_eng', 493, 'target1', 'b9bc64ec-ab5b-47f8-ab7b-ec66d1e11529', 'beth fydd yn dod nesa?'),
  ('4b2928e1-e21a-4c2b-b7c8-0778ad890674', 'cym_s_for_eng', 493, 'target2', '8c1aad49-9dac-4937-a9df-d5f535049ea4', 'beth fydd yn dod nesa?'),
  ('bb775f7f-74f2-429b-9bef-8f823a82a756', 'cym_s_for_eng', 494, 'target1', '012169d5-11fd-4b30-8a52-59c3a989fb0a', 'beth sy’n digwydd ar ôl rhan gyntaf y sioe?'),
  ('bb775f7f-74f2-429b-9bef-8f823a82a756', 'cym_s_for_eng', 494, 'target2', '4000407e-789e-4d4d-b075-ac868dd228b4', 'beth sy’n digwydd ar ôl rhan gyntaf y sioe?'),
  ('bf55dd8f-aa7c-41b6-afa0-66214788826e', 'cym_s_for_eng', 496, 'target1', '3e3918d8-5f80-45b6-a3b0-d22fa74cb10c', 'dw i ddim yn bwriadu colli pan mae wir ots'),
  ('bf55dd8f-aa7c-41b6-afa0-66214788826e', 'cym_s_for_eng', 496, 'target2', 'bb4194d5-4feb-4a5e-a9b5-efe19189a3ba', 'dw i ddim yn bwriadu colli pan mae wir ots'),
  ('743c581c-7056-4921-8b0f-774f1d6e37a1', 'cym_s_for_eng', 497, 'target1', '93c31316-007e-4796-a33a-ec5ffee3afb3', 'mae hynny’n swno fel bo’ ti angen cael bach o gwsg'),
  ('743c581c-7056-4921-8b0f-774f1d6e37a1', 'cym_s_for_eng', 497, 'target2', 'b8ce7e50-4c6d-41e2-9d11-5576b361e8ce', 'mae hynny’n swno fel bo’ ti angen cael bach o gwsg'),
  ('a5cb6df5-1df8-41b4-b08e-90d8ce02a8c4', 'cym_s_for_eng', 498, 'known', 'e5684484-7d0a-4f58-8979-8c60cbf9342d', 'he''s standing alone over there inside the entrance'),
  ('a5cb6df5-1df8-41b4-b08e-90d8ce02a8c4', 'cym_s_for_eng', 498, 'target1', '71c5008b-70c1-4b06-83bf-ba7bd54ce6c1', 'mae fe’n sefyll ar ei ben ei hunan draw fanco tu fewn i’r fynedfa'),
  ('a5cb6df5-1df8-41b4-b08e-90d8ce02a8c4', 'cym_s_for_eng', 498, 'target2', 'b97e5f93-cbf5-4391-9b44-68c2e903cf75', 'mae fe’n sefyll ar ei ben ei hunan draw fanco tu fewn i’r fynedfa'),
  ('595c39e1-7960-464d-a7f7-8c53664fe443', 'cym_s_for_eng', 500, 'known', 'a0357df5-d8e7-495f-ac34-761a0c08bdd8', 'why don''t you want to sit between the two girls?'),
  ('595c39e1-7960-464d-a7f7-8c53664fe443', 'cym_s_for_eng', 500, 'target1', '15f51976-f342-4fd7-a861-6de198286335', 'pam nag wyt ti’n moyn eistedd rhwng y ddwy ferch?'),
  ('595c39e1-7960-464d-a7f7-8c53664fe443', 'cym_s_for_eng', 500, 'target2', '070d9401-e179-4c22-9b6b-09845fa9e3b6', 'pam nag wyt ti’n moyn eistedd rhwng y ddwy ferch?'),
  ('60bc5907-bbed-42b1-b07a-4209e47a5572', 'cym_s_for_eng', 501, 'target1', '0ba73062-73a8-4297-83df-abd66148ccae', 'tasen i ond yn gallu ymddiried ynoch chi i chwarae gyda’ch gilydd heb ddadlau'),
  ('60bc5907-bbed-42b1-b07a-4209e47a5572', 'cym_s_for_eng', 501, 'target2', 'fccf7dea-52dd-48e9-b681-655b72f07d48', 'tasen i ond yn gallu ymddiried ynoch chi i chwarae gyda’ch gilydd heb ddadlau'),
  ('6647d267-e71a-4c21-83ed-3a363b2731f1', 'cym_s_for_eng', 502, 'target1', 'a4ddd973-673c-48fb-920a-4123eabf2dd9', 'bu bron iddi fynd ar goll achos iddi droi i’r chwith yn lle i’r dde'),
  ('6647d267-e71a-4c21-83ed-3a363b2731f1', 'cym_s_for_eng', 502, 'target2', 'd56dad12-768a-4bb8-9d3f-7865985076e5', 'bu bron iddi fynd ar goll achos iddi droi i’r chwith yn lle i’r dde'),
  ('848f1b89-79f1-47e0-a8cd-1e7b0ffe38ef', 'cym_s_for_eng', 503, 'known', '7e9b4927-8e37-408d-a0dd-069358d4a9a3', 'I hate making trouble but that one''s mine'),
  ('848f1b89-79f1-47e0-a8cd-1e7b0ffe38ef', 'cym_s_for_eng', 503, 'target1', '09fdfa48-98c5-418a-8457-aae728fc87a4', 'mae’n gas ’da fi wneud trwbwl ond fy un i yw hwnna'),
  ('848f1b89-79f1-47e0-a8cd-1e7b0ffe38ef', 'cym_s_for_eng', 503, 'target2', '4bba1ff9-9f6f-4be3-8928-e730e9c0b749', 'mae’n gas ’da fi wneud trwbwl ond fy un i yw hwnna'),
  ('acc5c522-1cb9-4e79-bafa-454cdf2e92a7', 'cym_s_for_eng', 505, 'known', '42c60876-4808-481d-a0f5-da52e795a2f1', 'so that I don''t get left behind'),
  ('acc5c522-1cb9-4e79-bafa-454cdf2e92a7', 'cym_s_for_eng', 505, 'target1', 'efa4a165-0519-4433-b7a8-aaa1a93f9a90', 'i fi beidio cael fy ngadael ar ôl'),
  ('acc5c522-1cb9-4e79-bafa-454cdf2e92a7', 'cym_s_for_eng', 505, 'target2', '7b686862-3c26-4d63-bd54-b0a905b56ca8', 'i fi beidio cael fy ngadael ar ôl'),
  ('78d8e4f2-8884-4e65-baf7-8a00e2b8bfe2', 'cym_s_for_eng', 510, 'target1', '6f2bf1d0-42ab-4d79-b14d-3c144f99ff10', 'mae hi ’di mynd i chwilio am rywle diogel i barco’r car'),
  ('78d8e4f2-8884-4e65-baf7-8a00e2b8bfe2', 'cym_s_for_eng', 510, 'target2', '39eeb1bf-c62f-41f4-8c96-7e9e4cbedec8', 'mae hi ’di mynd i chwilio am rywle diogel i barco’r car'),
  ('ebd3c371-4650-4e8f-928e-e47ad2404967', 'cym_s_for_eng', 511, 'target1', '7e21bffd-1d86-43b6-b106-25ab9a3c3bb5', 'cymrodd y newyddion sawl awr i gyrraedd pawb yn y swyddfa'),
  ('ebd3c371-4650-4e8f-928e-e47ad2404967', 'cym_s_for_eng', 511, 'target2', '5f302044-eb99-4ffd-af62-46defd2c5386', 'cymrodd y newyddion sawl awr i gyrraedd pawb yn y swyddfa'),
  ('98373a0e-c331-416e-8887-6baddfa03f56', 'cym_s_for_eng', 513, 'target1', 'bb45d7ab-69dd-47cd-8430-17bcb612d9c8', 'mae’n brifo mwyaf pan dw i’n symud fy mhen lan a lawr'),
  ('98373a0e-c331-416e-8887-6baddfa03f56', 'cym_s_for_eng', 513, 'target2', 'dbf95446-bc90-47d7-95f7-4d05abdc8b87', 'mae’n brifo mwyaf pan dw i’n symud fy mhen lan a lawr'),
  ('f577ea7d-347c-4441-9a1c-cb6ef9806b03', 'cym_s_for_eng', 516, 'target1', '772ea315-b568-49ff-ad2f-d10091f2fea1', 'daeth y ddau ohonyn nhw ar eu pennau eu hunain'),
  ('f577ea7d-347c-4441-9a1c-cb6ef9806b03', 'cym_s_for_eng', 516, 'target2', '604c3fa7-21e5-4511-8ac1-caf7d2de450c', 'daeth y ddau ohonyn nhw ar eu pennau eu hunain'),
  ('1656dabb-86ce-4661-8549-f08da8da9b57', 'cym_s_for_eng', 518, 'known', '2a33ee67-82a7-4372-9a18-4b41c652bfb9', 'I couldn''t imagine myself having exactly the same problem'),
  ('1656dabb-86ce-4661-8549-f08da8da9b57', 'cym_s_for_eng', 518, 'target1', 'd3ada613-e343-4df9-9ce7-c031f4f0f0e1', 'allen i ddim dychmygu fy hunan yn cael gwmws yr un broblem'),
  ('1656dabb-86ce-4661-8549-f08da8da9b57', 'cym_s_for_eng', 518, 'target2', 'c68b46d3-bc1b-4adf-bc61-3aaea018a171', 'allen i ddim dychmygu fy hunan yn cael gwmws yr un broblem'),
  ('bb7ef9d0-b390-40fd-adfd-e3957da3680e', 'cym_s_for_eng', 519, 'known', 'e2d32b68-5228-4995-ac89-c0d292f9e604', 'I haven''t seen their new baby yet'),
  ('bb7ef9d0-b390-40fd-adfd-e3957da3680e', 'cym_s_for_eng', 519, 'target1', 'b2fb096f-e9aa-4177-bda1-5624f90e67db', 'sa i wedi gweld eu babi newydd eto'),
  ('bb7ef9d0-b390-40fd-adfd-e3957da3680e', 'cym_s_for_eng', 519, 'target2', '87378a3c-9432-4785-9e2f-2412e70e977d', 'sa i wedi gweld eu babi newydd eto'),
  ('8532c196-9339-4b0d-af2b-c7a19ecbc3ed', 'cym_s_for_eng', 521, 'known', 'b72b24e2-0878-417e-8470-db9611512cee', 'I''m afraid that you''ll forget why we needed to stay here'),
  ('8532c196-9339-4b0d-af2b-c7a19ecbc3ed', 'cym_s_for_eng', 521, 'target1', '4d34ae17-cb79-4298-8b4e-8449a0ab63c2', 'dw i’n ofni y byddi di’n anghofio pam o’n ni angen aros yma'),
  ('8532c196-9339-4b0d-af2b-c7a19ecbc3ed', 'cym_s_for_eng', 521, 'target2', '8314ab5c-1774-4d45-81c8-c3ae337110d2', 'dw i’n ofni y byddi di’n anghofio pam o’n ni angen aros yma'),
  ('6d0c4ef9-7cb2-4aa1-9f77-56a6fd386f7a', 'cym_s_for_eng', 523, 'target1', '8f1ea009-c08f-4a1b-b717-a115064229ef', 'yn lle rhoi esgus'),
  ('6d0c4ef9-7cb2-4aa1-9f77-56a6fd386f7a', 'cym_s_for_eng', 523, 'target2', 'e7656b5d-80db-44b5-a23e-be727b3af3c9', 'yn lle rhoi esgus'),
  ('d89d5e7b-1032-4fd1-a1cf-1e7f8deb6676', 'cym_s_for_eng', 528, 'known', '4ef8ded2-e63d-4b74-b0a4-0d9d14b9a1d1', 'I''m probably supposed to keep those things in another room'),
  ('d89d5e7b-1032-4fd1-a1cf-1e7f8deb6676', 'cym_s_for_eng', 528, 'target1', '7e111d83-9420-4915-b060-f9f1b3d052f8', 'mwy na thebyg dw i i fod i gadw’r pethau ’na mewn stafell arall'),
  ('d89d5e7b-1032-4fd1-a1cf-1e7f8deb6676', 'cym_s_for_eng', 528, 'target2', 'ab46c962-78ed-401e-9049-c61f4d4a50b7', 'mwy na thebyg dw i i fod i gadw’r pethau ’na mewn stafell arall'),
  ('32921d3b-da0e-45b3-ac60-81e1878da215', 'cym_s_for_eng', 532, 'known', '628cdb2b-3b5c-4a6b-815d-983f9df5da64', 'unless they''re lucky'),
  ('32921d3b-da0e-45b3-ac60-81e1878da215', 'cym_s_for_eng', 532, 'target1', '843056d2-a385-4938-a3f7-dfe631734361', 'heblaw bo’ nhw’n lwcus'),
  ('32921d3b-da0e-45b3-ac60-81e1878da215', 'cym_s_for_eng', 532, 'target2', 'fe6814c9-5dcf-4549-b6ce-e5ee533c9751', 'heblaw bo’ nhw’n lwcus'),
  ('a3a43f06-737f-4d40-beb9-471eabb44a13', 'cym_s_for_eng', 533, 'known', '8995836d-5e0e-43ce-be38-aed0abd4dee4', 'she won''t listen to every word you say'),
  ('a3a43f06-737f-4d40-beb9-471eabb44a13', 'cym_s_for_eng', 533, 'target1', '71d7bcfa-85cb-479f-b8f9-0767f787096d', 'fydd hi ddim yn gwrando ar bob gair ti’n dweud'),
  ('a3a43f06-737f-4d40-beb9-471eabb44a13', 'cym_s_for_eng', 533, 'target2', '88015322-6694-4476-87e0-608be7ff8241', 'fydd hi ddim yn gwrando ar bob gair ti’n dweud'),
  ('c963f352-4d19-4fbc-bb30-418310fe946b', 'cym_s_for_eng', 535, 'known', 'dd652156-c12e-4047-bb77-4fef8468501a', 'he made a promise that he wouldn''t choose the wrong job'),
  ('c963f352-4d19-4fbc-bb30-418310fe946b', 'cym_s_for_eng', 535, 'target1', '9464f54a-5fd4-414a-a181-bd8d2bd162ab', 'wnaeth e addewid na fyddai fe’n dewis y swydd anghywir'),
  ('c963f352-4d19-4fbc-bb30-418310fe946b', 'cym_s_for_eng', 535, 'target2', 'cd5ebb44-a36b-4ac1-a2d1-9d5871e184a3', 'wnaeth e addewid na fyddai fe’n dewis y swydd anghywir'),
  ('4fe44e00-50b4-4078-a0be-0b02aed1ad46', 'cym_s_for_eng', 540, 'known', '1dd8a56e-6b51-4f09-b62b-6d7e800369b7', 'I don''t mind if you want to leave without the car'),
  ('4fe44e00-50b4-4078-a0be-0b02aed1ad46', 'cym_s_for_eng', 540, 'target1', '8da3d6d4-a53a-40f1-a639-081467945b44', 'sdim ots ’da fi os ti’n moyn gadael heb y car'),
  ('4fe44e00-50b4-4078-a0be-0b02aed1ad46', 'cym_s_for_eng', 540, 'target2', 'e3e2588c-65fd-4f96-93a0-af0018ee1d0f', 'sdim ots ’da fi os ti’n moyn gadael heb y car'),
  ('79e9b6d8-4b04-49f2-b73c-8f86491673e9', 'cym_s_for_eng', 544, 'target1', '4a92b598-0433-441d-be09-31ecf664ab8f', 'oedd ta pwy ddwedodd y byddai hi’n anodd yn gwbl gywir'),
  ('79e9b6d8-4b04-49f2-b73c-8f86491673e9', 'cym_s_for_eng', 544, 'target2', '00fa4a76-ab65-4949-9fe2-08d00c31f666', 'oedd ta pwy ddwedodd y byddai hi’n anodd yn gwbl gywir'),
  ('04c3ce94-d862-417a-b4fa-8a898f7c645f', 'cym_s_for_eng', 545, 'known', 'd8259824-76ce-4500-924a-1d6218950884', 'it''s your turn to take the clean clothes upstairs'),
  ('04c3ce94-d862-417a-b4fa-8a898f7c645f', 'cym_s_for_eng', 545, 'target1', '7432f869-fae6-4d8b-a9de-201e6412e2d1', 'dy dro di yw e i fynd â’r dillad glân lan staer'),
  ('04c3ce94-d862-417a-b4fa-8a898f7c645f', 'cym_s_for_eng', 545, 'target2', 'daf7599c-528c-46e5-b4dd-e11b13a51de6', 'dy dro di yw e i fynd â’r dillad glân lan staer'),
  ('2f03f3b8-990c-4a6b-b5b9-b27864c5849a', 'cym_s_for_eng', 632, 'target1', 'f8dca34d-fc65-44e3-ade8-b82e01b15fc0', 'gwydred o ddŵr'),
  ('2f03f3b8-990c-4a6b-b5b9-b27864c5849a', 'cym_s_for_eng', 632, 'target2', '3e89b03b-e856-46a4-84cd-e30a7b431328', 'gwydred o ddŵr');

SELECT count(*) AS locked_seeds FROM (SELECT 1 FROM course_seeds s WHERE s.id IN (SELECT seed_id FROM links) FOR UPDATE OF s) x;
SELECT count(*) AS locked_courses FROM (SELECT 1 FROM courses c WHERE c.course_code IN ('cym_n_for_eng','cym_s_for_eng') FOR UPDATE OF c) x;

CREATE FUNCTION pg_temp.fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'cym_n_for_eng seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code = 'cym_n_for_eng'
  UNION ALL SELECT x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT x.course_code||' phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT x.course_code||' audio', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_audio x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'cym_s_for_eng other seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x
    WHERE x.course_code = 'cym_s_for_eng' AND x.id NOT IN (SELECT seed_id FROM links)
  UNION ALL SELECT 'cym_n_for_eng courses row', count(*), md5(string_agg(to_jsonb(x)::text, '')) FROM courses x WHERE x.course_code = 'cym_n_for_eng'
  UNION ALL SELECT 'cym_s_for_eng courses row (bar content_version/updated_at/content_stamp)', count(*),
    md5(string_agg((to_jsonb(x) - 'content_version' - 'updated_at' - 'content_stamp')::text, '')) FROM courses x WHERE x.course_code = 'cym_s_for_eng'
  UNION ALL SELECT 'linked audio rows', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_audio x WHERE x.id IN (SELECT audio_id FROM links)
$$;
CREATE FUNCTION pg_temp.replayable() RETURNS TABLE(course_code text, replayable bigint, seeds bigint) LANGUAGE sql AS $$
  SELECT s.course_code, count(*) FILTER (WHERE s.known_audio_id IS NOT NULL AND s.target1_audio_id IS NOT NULL AND s.target2_audio_id IS NOT NULL), count(*)
  FROM course_seeds s WHERE s.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY 1 $$;
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.fp();
SELECT 'BEFORE' k, * FROM pre ORDER BY t;
SELECT 'BEFORE' k, * FROM pg_temp.replayable() ORDER BY 2;
SELECT 'BEFORE' k, course_code, content_version FROM courses WHERE course_code IN ('cym_n_for_eng','cym_s_for_eng') ORDER BY 2;

DO $$ BEGIN
  IF to_regclass('backup_cym_seed_clips_591') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF (SELECT count(*) FROM links) <> 95 THEN RAISE EXCEPTION 'expected 95 links'; END IF;
  IF EXISTS (SELECT 1 FROM links WHERE course_code <> 'cym_s_for_eng') THEN RAISE EXCEPTION 'a write is outside cym_s_for_eng'; END IF;
  -- the slot is still empty and the seed's text is still the text we matched
  IF (SELECT count(*) FROM links k JOIN course_seeds s ON s.id = k.seed_id AND s.course_code = k.course_code AND s.seed_number = k.seed_number
      WHERE CASE k.slot WHEN 'known' THEN s.known_audio_id IS NULL AND s.known_text = k.txt
                        WHEN 'target1' THEN s.target1_audio_id IS NULL AND s.target_text = k.txt
                        WHEN 'target2' THEN s.target2_audio_id IS NULL AND s.target_text = k.txt END) <> (SELECT count(*) FROM links) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a slot is no longer empty or the seed text changed — re-plan'; END IF;
  -- every take: human, alive, same text, same speaker = an unnamed original (legacy_import) of the SAME slot from cym_s_for_eng itself
  IF (SELECT count(*) FROM links k JOIN course_audio a ON a.id = k.audio_id
      WHERE a.origin = 'human' AND coalesce(a.duration_ms, 0) > 0 AND coalesce(a.file_size_bytes, 2000) >= 2000 AND a.veracity_pass IS NOT FALSE
        AND pg_temp.nz(a.text) = pg_temp.nz(k.txt)
        AND a.voice_id = 'legacy_import' AND a.course_code = 'cym_s_for_eng' AND a.role = k.slot
        AND a.language = CASE k.slot WHEN 'known' THEN 'eng' ELSE 'cym' END) <> (SELECT count(*) FROM links) THEN
    RAISE EXCEPTION 'a take is gone, synthetic, dead, a different text, or not the slot speaker (cym_s legacy lineage of that slot)'; END IF;
  -- the slot speaker of every cym_s slot is still legacy_import (majority of its filled takes)
  IF EXISTS (SELECT 1 FROM (SELECT v.slot, a.voice_id, count(*) n, rank() OVER (PARTITION BY v.slot ORDER BY count(*) DESC) r
      FROM course_seeds s CROSS JOIN LATERAL (VALUES ('known', s.known_audio_id), ('target1', s.target1_audio_id), ('target2', s.target2_audio_id)) v(slot, aid)
      JOIN course_audio a ON a.id = v.aid WHERE s.course_code = 'cym_s_for_eng' GROUP BY 1,2) m WHERE m.r = 1 AND m.voice_id <> 'legacy_import') THEN
    RAISE EXCEPTION 'a cym_s slot speaker is no longer legacy_import — re-plan'; END IF;
END $$;

CREATE TABLE backup_cym_seed_clips_591 AS SELECT s.* FROM course_seeds s WHERE s.id IN (SELECT seed_id FROM links);
CREATE TABLE backup_cym_seed_clips_591_links AS SELECT * FROM links;
CREATE TABLE backup_cym_seed_clips_591_course AS SELECT c.course_code, c.content_version FROM courses c WHERE c.course_code = 'cym_s_for_eng';
REVOKE ALL ON backup_cym_seed_clips_591, backup_cym_seed_clips_591_links, backup_cym_seed_clips_591_course FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT 'cym_s_for_eng', 'sql:job-591 link-cym-live-seed-clips', 'link-seed-audio', 'agent', 'claude-job-591-seed-clips',
       'agent (claude-job-591-seed-clips)', false, 'creator',
       jsonb_build_object('links', (SELECT jsonb_agg(jsonb_build_array(seed_number, slot, audio_id) ORDER BY seed_number, slot) FROM links)),
       jsonb_build_object('ruling', 'Aran asked, Tom approved 2026-10-13 (job #591): empty seed clip slots in the LIVE Welsh courses point at an existing human take of the exact same text (whitespace/apostrophes normalised) by the same speaker the course already uses on that slot; unknown-speaker slots (legacy_import) take only legacy_import takes of the same course and role. content_version patch-bumped. Nothing recorded or rendered.',
                          'backup', 'backup_cym_seed_clips_591');
CREATE TEMP TABLE ev AS SELECT id FROM content_edit_events WHERE detail->>'backup' = 'backup_cym_seed_clips_591' ORDER BY occurred_at DESC, id LIMIT 1;

UPDATE course_seeds s SET
  known_audio_id   = coalesce(s.known_audio_id,   (SELECT audio_id FROM links k WHERE k.seed_id = s.id AND k.slot = 'known')),
  target1_audio_id = coalesce(s.target1_audio_id, (SELECT audio_id FROM links k WHERE k.seed_id = s.id AND k.slot = 'target1')),
  target2_audio_id = coalesce(s.target2_audio_id, (SELECT audio_id FROM links k WHERE k.seed_id = s.id AND k.slot = 'target2')),
  last_edit_event_id = (SELECT id FROM ev)
WHERE s.course_code = 'cym_s_for_eng' AND s.id IN (SELECT seed_id FROM links);
-- same patch bump as services/shared/course-version.cjs bumpCourseVersion(…, 'patch')
UPDATE courses SET content_version = (SELECT format('%s.%s.%s', p[1], p[2], p[3]::int + 1) FROM string_to_array(coalesce(content_version, '0.0.0'), '.') p)
WHERE course_code = 'cym_s_for_eng';
SET CONSTRAINTS ALL IMMEDIATE;

CREATE TEMP TABLE post AS SELECT * FROM pg_temp.fp();
SELECT 'AFTER' k, * FROM post ORDER BY t;
DO $$ BEGIN
  IF EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post) OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: something outside the linked slots and cym_s content_version changed'; END IF;
  IF (SELECT count(*) FROM links k JOIN course_seeds s ON s.id = k.seed_id
      WHERE CASE k.slot WHEN 'known' THEN s.known_audio_id WHEN 'target1' THEN s.target1_audio_id ELSE s.target2_audio_id END = k.audio_id) <> (SELECT count(*) FROM links) THEN
    RAISE EXCEPTION 'CHECK FAILED: a slot does not hold its planned take'; END IF;
  IF EXISTS (SELECT 1 FROM backup_cym_seed_clips_591 b JOIN course_seeds s ON s.id = b.id
      WHERE (to_jsonb(b) - 'version' - 'updated_at' - 'last_edit_event_id' - 'known_audio_id' - 'target1_audio_id' - 'target2_audio_id')
         <> (to_jsonb(s) - 'version' - 'updated_at' - 'last_edit_event_id' - 'known_audio_id' - 'target1_audio_id' - 'target2_audio_id')
         OR (b.known_audio_id IS NOT NULL AND b.known_audio_id IS DISTINCT FROM s.known_audio_id)
         OR (b.target1_audio_id IS NOT NULL AND b.target1_audio_id IS DISTINCT FROM s.target1_audio_id)
         OR (b.target2_audio_id IS NOT NULL AND b.target2_audio_id IS DISTINCT FROM s.target2_audio_id)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a linked seed changed beyond filling its empty slots'; END IF;
  RAISE NOTICE 'LINKED: % slots on % seeds', (SELECT count(*) FROM links), (SELECT count(DISTINCT seed_id) FROM links);
END $$;
SELECT k.course_code, k.slot, count(*) linked FROM links k GROUP BY 1,2 ORDER BY 1,2;
SELECT 'AFTER' k, * FROM pg_temp.replayable() ORDER BY 2;
SELECT 'AFTER' k, course_code, content_version FROM courses WHERE course_code IN ('cym_n_for_eng','cym_s_for_eng') ORDER BY 2;
SELECT 'finishing with' k, :'finish' v;
:finish;
