-- 20260913_live_pod_never_narrowed_trigger.sql
--
-- Extends 20260913_live_pod_never_held_trigger.sql. Tom's rule, 2026-09-13: a
-- live pod is never narrowed, by anyone, ever. Job #605 gave listening_pods a
-- required_role lever and the route refuses to set a role on a live pod, but
-- GPT-6 Astra #608 showed the route's role compare-and-swap could still race a
-- release, and nothing in the database refused the transition for a psql
-- session, a sweep or a second service. This is the guard at the one layer
-- every caller shares (job #611).
--
-- The same function now refuses TWO transitions on one row:
--   live -> held                                           (as before)
--   (visibility='live', required_role IS NULL) -> required_role IS NOT NULL
-- Judged on OLD and NEW together, so a single UPDATE that releases and narrows
-- at once (held/NULL -> live/role) is refused as well: the pod would be live
-- with a role, which is the narrowing. held -> live, clearing a role, and every
-- other column stay untouched. The trigger now fires on both columns.
-- Rollback: 20260913_live_pod_never_narrowed_trigger.ROLLBACK.sql

CREATE OR REPLACE FUNCTION public.refuse_live_pod_hold()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.visibility = 'live' AND NEW.visibility = 'held' THEN
    RAISE EXCEPTION 'listening_pods %: a live pod is never pulled back from learners; it is fixed line by line (Tom, 2026-09-13)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.visibility = 'live' AND OLD.required_role IS NULL AND NEW.required_role IS NOT NULL THEN
    RAISE EXCEPTION 'listening_pods %: a live pod is never narrowed; setting required_role on it would pull it back from learners (Tom, 2026-09-13)', OLD.id
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
  'BEFORE UPDATE guard on listening_pods: live -> held raises; live with required_role NULL -> non-null raises. Tom, 2026-09-13: a live pod is never held back or narrowed, it is fixed line by line.';
