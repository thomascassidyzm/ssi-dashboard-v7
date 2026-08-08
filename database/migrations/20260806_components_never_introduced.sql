-- COMPONENTS ARE NEVER INTRODUCED — Tom's ruling, 2026-08-06:
--
--   "All the components are now being introduced in the new M-LEGO
--    introductions. Components do NOT get introduced."
--
-- Only LEGOs get introductions. An M-LEGO's components are tiling parts of one
-- whole thought; the learner sees the breakdown visualised inside the M-LEGO
-- and never hears a component on its own. Components DO remain allowed
-- vocabulary — a later phrase may use one without its whole M-LEGO (gestalt
-- use) — so this touches audio bindings only, never the rows themselves.
--
-- WHY A TRIGGER AND NOT A CODE GUARD.
-- The rule was already implemented in service code (services/learning-script-
-- generator.cjs, and now every authoring path in phase8-audio-v13.cjs). The
-- 2026-08-06 French seed-1 rows got their narration bindings anyway, because
-- the script that wrote them went straight to the database and under all of it.
-- A code guard cannot stop the next script. This is the one chokepoint every
-- writer passes through.
--
-- WHAT IT DOES: refuses to SET a non-null presentation_audio_id on a
-- phrase_role='component' row.
-- WHAT IT DOES NOT DO: touch the ~56,671 existing bindings. They are inert
-- (the cycles API no longer emits component_intro) and unlinking them is a
-- separate, approval-gated decision. Clearing one to NULL is always allowed,
-- so that cleanup can proceed when approved without dropping this trigger.

CREATE OR REPLACE FUNCTION refuse_component_introduction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only a NEW non-null binding is refused. NULL (unlinking) always passes,
  -- and an UPDATE that leaves an existing value untouched passes too, so
  -- ordinary edits to historic rows are unaffected.
  IF NEW.phrase_role = 'component'
     AND NEW.presentation_audio_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.presentation_audio_id IS DISTINCT FROM OLD.presentation_audio_id)
  THEN
    RAISE EXCEPTION
      'Components are never introduced (Tom, 2026-08-06): refusing to bind presentation audio % to component row %',
      NEW.presentation_audio_id, NEW.id
      USING HINT = 'Only LEGOs get introductions. A component is a tiling part of its M-LEGO, visualised inside it, never narrated alone. It stays allowed vocabulary either way.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS components_never_introduced ON course_practice_phrases;

CREATE TRIGGER components_never_introduced
  BEFORE INSERT OR UPDATE OF presentation_audio_id, phrase_role
  ON course_practice_phrases
  FOR EACH ROW
  EXECUTE FUNCTION refuse_component_introduction();
