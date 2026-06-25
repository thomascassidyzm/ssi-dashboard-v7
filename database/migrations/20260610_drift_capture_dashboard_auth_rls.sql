-- ============================================================================
-- DRIFT CAPTURE (no behaviour change) — codify the live RLS state of the
-- Popty-owned auth tables + canonical_pod_scenarios into version control
-- ============================================================================
-- These four tables were configured RLS-ON directly on the live DB and never
-- recorded in any migration (found during the 2026-06 security sweep). This
-- file records the exact live state as of 2026-06-10 so a schema rebuild
-- reproduces it. It is idempotent and applying it to the live DB is a no-op
-- in effect.

-- canonical_pod_scenarios: RLS on, NO policies (anon/authenticated fully
-- blocked despite legacy grants; all access is service-role).
ALTER TABLE public.canonical_pod_scenarios ENABLE ROW LEVEL SECURITY;

-- dashboard_login_codes: service-role only.
ALTER TABLE public.dashboard_login_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dashboard_login_codes FROM anon, authenticated;
DROP POLICY IF EXISTS service_role_all_dashboard_login_codes ON public.dashboard_login_codes;
CREATE POLICY service_role_all_dashboard_login_codes ON public.dashboard_login_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- dashboard_sessions: service-role only.
ALTER TABLE public.dashboard_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dashboard_sessions FROM anon, authenticated;
DROP POLICY IF EXISTS service_role_all_dashboard_sessions ON public.dashboard_sessions;
CREATE POLICY service_role_all_dashboard_sessions ON public.dashboard_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- dashboard_users: service-role all + authenticated may read own row by email.
ALTER TABLE public.dashboard_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dashboard_users FROM anon, authenticated;
DROP POLICY IF EXISTS service_role_all_dashboard_users ON public.dashboard_users;
CREATE POLICY service_role_all_dashboard_users ON public.dashboard_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS authenticated_read_own_dashboard_user ON public.dashboard_users;
CREATE POLICY authenticated_read_own_dashboard_user ON public.dashboard_users
  FOR SELECT TO authenticated USING (email = (auth.jwt() ->> 'email'::text));

NOTIFY pgrst, 'reload schema';
