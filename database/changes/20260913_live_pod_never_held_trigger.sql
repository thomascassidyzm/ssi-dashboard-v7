-- 20260913_live_pod_never_held_trigger.sql
--
-- Tom's ruling, 2026-09-13: "you can't unpublished a course, once it's gone
-- live it can only ever be fixed line by line". A LIVE listening pod is never
-- held back from learners.
--
-- Job #579 closed the route (POST /api/admin/pods/:courseCode/:slug/visibility
-- refuses live→held with 409). GPT-6 Astra's cold-check #582 then showed the
-- route's check-then-write could still race a release, and that nothing in
-- the database itself refused the transition — a psql session, a tool sweep or
-- a second service could hold a live pod back with a plain UPDATE. This is the
-- guard at the one layer every caller shares. The route's compare-and-swap
-- (services/pod-visibility.cjs, applyVisibilityChange) closes the race in the
-- API; this closes it for everyone else.
--
-- It refuses ONLY live→held. held→live (release, a human act), and every other
-- column on the row, are untouched. Rollback: 20260913_live_pod_never_held_trigger.ROLLBACK.sql

CREATE OR REPLACE FUNCTION public.refuse_live_pod_hold()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.visibility = 'live' AND NEW.visibility = 'held' THEN
    RAISE EXCEPTION 'listening_pods %: a live pod is never pulled back from learners; it is fixed line by line (Tom, 2026-09-13)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listening_pods_live_never_held ON public.listening_pods;
CREATE TRIGGER listening_pods_live_never_held
  BEFORE UPDATE OF visibility ON public.listening_pods
  FOR EACH ROW
  EXECUTE FUNCTION public.refuse_live_pod_hold();

COMMENT ON FUNCTION public.refuse_live_pod_hold() IS
  'BEFORE UPDATE guard on listening_pods: live -> held raises. Tom, 2026-09-13: a live pod is never held back, it is fixed line by line.';
