-- Re-record permission: count uses ATOMICALLY (job #231, from lane review #229). The gate used to read the
-- used-count, decide, then insert the 'permitted' log row in separate calls, so two concurrent requests under a
-- max_clips:1 grant could both pass. This locks the permission row, rechecks the count, inserts the use, releases.
-- Returns true = reserved (row inserted), false = the grant is spent/revoked/gone. Additive; rollback drops the function.
CREATE OR REPLACE FUNCTION public.reserve_rerecord_use(p_permission_id bigint, p_entry jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE perm public.tts_rerecord_permissions%ROWTYPE; n integer;
BEGIN
  SELECT * INTO perm FROM public.tts_rerecord_permissions WHERE id = p_permission_id FOR UPDATE;
  IF NOT FOUND OR perm.revoked_at IS NOT NULL OR perm.until <= now() THEN RETURN false; END IF;
  IF perm.max_clips IS NOT NULL THEN
    SELECT count(*) INTO n FROM public.tts_rerecord_log WHERE permission_id = p_permission_id AND kind = 'permitted';
    IF n >= perm.max_clips THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.tts_rerecord_log (kind, permission_id, course_code, role, language, voice_id, text, replaced_audio_ids, origin, job, dry_run, note)
  VALUES ('permitted', p_permission_id, p_entry->>'course_code', p_entry->>'role', p_entry->>'language', p_entry->>'voice_id', p_entry->>'text',
          ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_entry->'replaced_audio_ids', '[]'::jsonb))::uuid),
          p_entry->>'origin', p_entry->>'job', COALESCE((p_entry->>'dry_run')::boolean, false), p_entry->>'note');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_rerecord_use(bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_rerecord_use(bigint, jsonb) TO service_role;
