-- Cast for the Senedd/S4C pod, in the per-track shape phase 8 reads.
--
-- Welsh (target): Aran, human, every speaker — Tom's ruling, "Stephen Fry reads
-- all of Harry Potter in the same voice". The cast gate that wants male/female
-- alternation is deliberately not satisfied here; do not weaken it, and do not
-- "fix" this casting.
--
-- English (known): TTS, not Aran — Tom's correction of 2026-09-03, "the English
-- lines will be TTS, because it is fast and cheap". One voice throughout, for
-- the same reason as the Welsh: this is one man reading a record to one learner,
-- not a drama.
--
-- THE ENGLISH VOICE IS CARTESIA, NOT xAI (Tom's ruling, 2026-09-03 evening).
-- The first render used gfzdpspr5fdp, the estate's standard male English pod
-- clone — which `voices` says is tts_engine='xai', and xAI is being deprecated.
-- "So Steve's pod is not born on a dying provider" this cast names
-- 8fef4d59-0a7e-4ad2-a261-6a3bb50734d2 (display name tom_001), Tom's
-- own Cartesia clone: consent authorised 2026-09-01, and the only Cartesia Tom
-- clone with production clips behind it (91 spa_for_eng known clips). Two other
-- authorised Tom clones exist at Cartesia — Tom_002 and Tom_003, both cloned in
-- the Voice Lab, neither yet used for anything — so if his ear prefers one of
-- those, this is a one-line change plus a re-render.
--
-- THE VOICE ID IS STORED BARE HERE, and that is not cosmetic. The estate's
-- CLIP identity is prefixed (`cartesia_<uuid>`, services/shared/clip-identity
-- .cjs) — but generateCartesia on main passes a cast's voice_id STRAIGHT to the
-- vendor, which only knows the bare uuid. A prefixed id in this column renders
-- fine on this branch, which strips it, and 400s under the production code,
-- which does not. Bare is correct under both, and canonicalises to the same
-- prefixed clip identity either way, so nothing already rendered is orphaned.
--
-- TOM GIFFARD and HEFIN DAVID carry a `known` entry and NO `target` entry, on
-- purpose. They only ever spoke English on this floor, so their rows have an
-- empty target_text and there is no Welsh for Aran to read. Giving them a target
-- voice would be a claim that he owes us a reading he does not.
UPDATE listening_pods SET speakers = jsonb_build_object(
  'Delyth Jewell', jsonb_build_object('gender','m','variants', jsonb_build_array('Delyth Jewell'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','cartesia','locale','en-GB','voice_id','8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')),
  'Rhodri Williams', jsonb_build_object('gender','m','variants', jsonb_build_array('Rhodri Williams'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','cartesia','locale','en-GB','voice_id','8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')),
  'Chris Jones', jsonb_build_object('gender','m','variants', jsonb_build_array('Chris Jones'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','cartesia','locale','en-GB','voice_id','8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')),
  'Alun Davies', jsonb_build_object('gender','m','variants', jsonb_build_array('Alun Davies'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','cartesia','locale','en-GB','voice_id','8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')),
  'Llyr Gruffydd', jsonb_build_object('gender','m','variants', jsonb_build_array('Llyr Gruffydd'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','cartesia','locale','en-GB','voice_id','8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')),
  'Carolyn Thomas', jsonb_build_object('gender','m','variants', jsonb_build_array('Carolyn Thomas'),
      'target', jsonb_build_object('name','Aran','provider','human','voice_id','human_aran_cym_n'),
      'known',  jsonb_build_object('name','Tom','provider','cartesia','locale','en-GB','voice_id','8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')),
  'Tom Giffard', jsonb_build_object('gender','m','variants', jsonb_build_array('Tom Giffard'),
      'known',  jsonb_build_object('name','Tom','provider','cartesia','locale','en-GB','voice_id','8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')),
  'Hefin David', jsonb_build_object('gender','m','variants', jsonb_build_array('Hefin David'),
      'known',  jsonb_build_object('name','Tom','provider','cartesia','locale','en-GB','voice_id','8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'))
) WHERE id = 'cym_n_for_eng:senedd-s4c-steve';
