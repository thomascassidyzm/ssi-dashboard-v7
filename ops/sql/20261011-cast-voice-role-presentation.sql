-- cast_voice_role v3 (job #271, lane review #269). v2 treated only slot='guide' as gender-agnostic, but
-- voice_language_roles_one_presentation_per_rank is also (language, rank) with NO gender, so casting a female onto a
-- presentation rank held by a male hit it (400). is_guide now covers 'presentation' too; the already-there branch now
-- applies a gender change for those gender-agnostic slots.
CREATE OR REPLACE FUNCTION public.cast_voice_role(
  p_slot text, p_language text, p_gender text, p_rank integer,
  p_voice_id text, p_notes text, p_assigned_by text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur public.voice_language_roles%ROWTYPE; occ public.voice_language_roles%ROWTYPE;
        is_guide boolean := (p_slot IN ('guide','presentation'));
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'cast_voice_role|' || p_slot || '|' || p_language || '|' || CASE WHEN is_guide THEN '' ELSE p_gender END, 0));

  SELECT * INTO cur FROM public.voice_language_roles
   WHERE slot = p_slot AND language = p_language AND (is_guide OR gender = p_gender) AND voice_id = p_voice_id FOR UPDATE;
  SELECT * INTO occ FROM public.voice_language_roles
   WHERE slot = p_slot AND language = p_language AND (is_guide OR gender = p_gender) AND rank = p_rank FOR UPDATE;

  IF occ.voice_id = p_voice_id THEN  -- already there: refresh notes only
    UPDATE public.voice_language_roles SET notes = p_notes, assigned_by = p_assigned_by, updated_at = now(),
           gender = CASE WHEN is_guide THEN p_gender ELSE occ.gender END
     WHERE slot = occ.slot AND language = occ.language AND gender = occ.gender AND rank = occ.rank;
    RETURN jsonb_build_object('swapped', false, 'movedFrom', NULL);
  END IF;

  IF cur.voice_id IS NOT NULL THEN
    DELETE FROM public.voice_language_roles
     WHERE slot = cur.slot AND language = cur.language AND gender = cur.gender AND rank = cur.rank;
  END IF;
  IF occ.voice_id IS NOT NULL THEN
    DELETE FROM public.voice_language_roles
     WHERE slot = occ.slot AND language = occ.language AND gender = occ.gender AND rank = occ.rank;
  END IF;

  INSERT INTO public.voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by, updated_at)
  VALUES (p_slot, p_language, p_gender, p_rank, p_voice_id, p_notes, p_assigned_by, now());

  IF cur.voice_id IS NOT NULL AND occ.voice_id IS NOT NULL THEN  -- swap: displaced voice takes the vacated rank, keeping its own gender
    INSERT INTO public.voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by, updated_at)
    VALUES (p_slot, p_language, occ.gender, cur.rank, occ.voice_id, occ.notes, occ.assigned_by, now());
  END IF;

  RETURN jsonb_build_object('swapped', cur.voice_id IS NOT NULL AND occ.voice_id IS NOT NULL,
                            'movedFrom', cur.rank, 'displaced', occ.voice_id);
END $$;
REVOKE ALL ON FUNCTION public.cast_voice_role(text,text,text,integer,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cast_voice_role(text,text,text,integer,text,text,text) TO service_role;
