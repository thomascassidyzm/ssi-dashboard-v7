-- Undoes 20260913_live_pod_never_held_trigger.sql. Removing this reopens the
-- door the ruling shut: only the API route would then refuse live -> held.
DROP TRIGGER IF EXISTS listening_pods_live_never_held ON public.listening_pods;
DROP FUNCTION IF EXISTS public.refuse_live_pod_hold();
