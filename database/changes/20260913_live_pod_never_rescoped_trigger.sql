-- 20260913_live_pod_never_rescoped_trigger.sql
--
-- Completes 20260913_live_pod_never_narrowed_trigger.sql (job #611). GPT-6
-- Astra #612 found the gap: that shape refused (live, role NULL) -> non-null
-- role, but its condition required OLD.required_role IS NULL, so a LIVE pod
-- moving from role A to role B was still permitted at the database while the
-- route (checkRequiredRoleTransition) refused it. Tom's rule, 2026-09-13: a
-- live pod is never narrowed or re-scoped. Job #614.
--
-- The function now refuses, on one row:
--   live -> held
--   NEW.visibility = 'live' AND NEW.required_role IS NOT NULL
--                            AND NEW.required_role IS DISTINCT FROM OLD.required_role
-- i.e. for a pod that will be live, ANY change of required_role other than
-- clearing it to NULL (widening) raises. Clearing to NULL passes; held pods
-- may change role freely; held -> live with the role unchanged passes;
-- held/role -> live/role in one UPDATE is still refused (Astra #608 shape).
-- Rollback: 20260913_live_pod_never_rescoped_trigger.ROLLBACK.sql

CREATE OR REPLACE FUNCTION public.refuse_live_pod_hold()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.visibility = 'live' AND NEW.visibility = 'held' THEN
    RAISE EXCEPTION 'listening_pods %: a live pod is never pulled back from learners; it is fixed line by line (Tom, 2026-09-13)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.visibility = 'live'
     AND NEW.required_role IS NOT NULL
     AND NEW.required_role IS DISTINCT FROM OLD.required_role THEN
    RAISE EXCEPTION 'listening_pods %: a live pod is never narrowed or re-scoped; required_role may only be cleared on it, never set or changed (Tom, 2026-09-13)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listening_pods_live_never_held ON public.listening_pods;
CREATE TRIGGER listening_pods_live_never_held
  BEFORE UPDATE OF visibility, required_role ON public.listening_pods
  FOR EACH ROW
  EXECUTE FUNCTION public.refuse_live_pod_hold();

COMMENT ON FUNCTION public.refuse_live_pod_hold() IS
  'BEFORE UPDATE guard on listening_pods: live -> held raises; a pod that will be live may only have required_role cleared to NULL, never set or changed. Tom, 2026-09-13: a live pod is never held back, narrowed or re-scoped; it is fixed line by line.';
