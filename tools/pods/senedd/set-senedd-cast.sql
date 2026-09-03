-- Cast for the Senedd/S4C pod, in the per-track shape phase 8 reads.
--
-- Welsh (target): Aran, human, every speaker — Tom's ruling, "Stephen Fry reads
-- all of Harry Potter in the same voice". The cast gate that wants male/female
-- alternation is deliberately not satisfied here; do not weaken it, and do not
-- "fix" this casting.
--
-- English (known): TTS, not Aran — Tom's correction of 2026-09-03, "the English
-- lines will be TTS, because it is fast and cheap". gfzdpspr5fdp is the estate's
-- standard male English pod clone (the voice fra_for_eng and 20 other pods use
-- for their known track). One voice throughout, for the same reason as the
-- Welsh: this is one man reading a record to one learner, not a drama.
UPDATE listening_pods SET speakers = jsonb_build_object(
  'Delyth Jewell',   jsonb_build_object('gender','m','variants', jsonb_build_array('Delyth Jewell'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','xai','locale','en','voice_id','gfzdpspr5fdp')),
  'Rhodri Williams', jsonb_build_object('gender','m','variants', jsonb_build_array('Rhodri Williams'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','xai','locale','en','voice_id','gfzdpspr5fdp')),
  'Chris Jones',     jsonb_build_object('gender','m','variants', jsonb_build_array('Chris Jones'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','xai','locale','en','voice_id','gfzdpspr5fdp')),
  'Alun Davies',     jsonb_build_object('gender','m','variants', jsonb_build_array('Alun Davies'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','xai','locale','en','voice_id','gfzdpspr5fdp')),
  'Llyr Gruffydd',   jsonb_build_object('gender','m','variants', jsonb_build_array('Llyr Gruffydd'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','xai','locale','en','voice_id','gfzdpspr5fdp')),
  'Carolyn Thomas',  jsonb_build_object('gender','m','variants', jsonb_build_array('Carolyn Thomas'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','xai','locale','en','voice_id','gfzdpspr5fdp'))
) WHERE id = 'cym_n_for_eng:senedd-s4c-steve';
